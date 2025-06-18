// js/core/CombatManager.js

/**
 * Manages the combat phase, including declaring attackers, blockers,
 * and resolving damage.
 */
export default class CombatManager {
    #game; // Reference to the main Game instance
    #attackers = new Map(); // Map<string, CreatureCard> - Attacking creatures by uniqueId
    #blockerAssignments = new Map(); // Map<string, string[]> - Attacker uniqueId -> [Array of blocker uniqueIds]
    #combatState = 'none'; // 'none', 'declare_attackers', 'declare_blockers', 'resolving'

    /**
     * Creates a CombatManager instance.
     * @param {Game} gameInstance - The main game instance.
     */
    constructor(gameInstance) {
        if (!gameInstance) {
            throw new Error("CombatManager requires a valid Game instance.");
        }
        this.#game = gameInstance;
        this.#combatState = 'none';
        console.log("CombatManager: Instance created.");
    }

    /** Resets the combat state for a new combat phase or turn. */
    reset() {
        this.#attackers.clear();
        this.#blockerAssignments.clear();
        this.#combatState = 'none';
        console.log("CombatManager: State reset.");
    }

    /**
     * Sets the attacking creatures for the current combat phase.
     * @param {Player} attackingPlayer - The player declaring attackers.
     * @param {string[]} attackerIds - Array of uniqueIds of the creatures declared as attackers.
     * @returns {boolean} True if attackers were successfully declared, false otherwise.
     */
    declareAttackers(attackingPlayer, attackerIds) {
        if (this.#combatState !== 'none' && this.#combatState !== 'declare_attackers') {
            console.warn(`CombatManager: Cannot declare attackers in state: ${this.#combatState}`);
            return false;
        }
        if (this.#game.getCurrentPhase() !== 'attack') {
            console.warn(`CombatManager: Cannot declare attackers outside of attack phase.`);
            this.#game.emitEvent('gameLog', { message: `Ataque só pode ser declarado na Fase de Ataque.` });
            return false;
        }
        if (this.#game.getCurrentPlayer()?.id !== attackingPlayer.id) {
            console.warn(`CombatManager: Only the current player can declare attackers.`);
            this.#game.emitEvent('gameLog', { message: `Apenas o jogador ativo pode atacar.` });
            return false;
        }

        this.#attackers.clear(); // Clear previous attackers for this combat
        const declaredAttackersForEvent = [];
        let success = true;

        for (const id of attackerIds) {
            const creature = attackingPlayer.battlefield.getCard(id);
            if (creature && creature.type === 'Creature' && creature.canAttack()) {
                this.#attackers.set(id, creature);
                declaredAttackersForEvent.push(creature.getRenderData());
            } else {
                console.warn(`CombatManager: Creature ${id} cannot attack or was not found.`);
                this.#game.emitEvent('gameLog', { message: `Criatura inválida para atacar: ${creature?.name || id}` });
                success = false;
            }
        }

        if (this.#attackers.size > 0) {
            this.#attackers.forEach(attacker => {
                attacker.tap();
                this.#game.emitEvent('creatureUpdate', { cardUniqueId: attacker.uniqueId, updates: { isTapped: true } });
            });

            const defender = this.#game.getOpponent(attackingPlayer.id);
            // Verifica se o defensor tem criaturas que podem bloquear
            const defenderHasPossibleBlockers = defender?.battlefield.getCreatures().some(c => c.canBlock());

            if (!defenderHasPossibleBlockers) {
                console.log(`CombatManager: ${attackingPlayer.name} atacou com ${this.#attackers.size} criatura(s). Oponente (${defender?.name}) não tem bloqueadores possíveis.`);
                // Emitir evento de atacantes declarados ANTES de tentar resolver
                this.#game.emitEvent('attackersDeclared', { attackingPlayerId: attackingPlayer.id, attackers: declaredAttackersForEvent });
                this.#game.emitEvent('noBlockersPossible', { attackingPlayerId: attackingPlayer.id });

                // <<<< CORREÇÃO PRINCIPAL AQUI >>>>
                // Define o estado para 'resolving' ANTES de chamar resolveCombat
                this.#combatState = 'resolving';
                this.resolveCombat(); // Agora resolveCombat() não vai mais reclamar do estado 'none'
                                      // e irá prosseguir com o dano e resetar.
            } else {
                console.log(`CombatManager: ${this.#attackers.size} attackers declared by ${attackingPlayer.name}. Waiting for blockers.`);
                this.#combatState = 'declare_blockers'; // Mover estado para aguardar bloqueadores
                this.#game.emitEvent('attackersDeclared', {
                    attackingPlayerId: attackingPlayer.id,
                    attackers: declaredAttackersForEvent
                });
            }
        } else {
            console.log(`CombatManager: No valid attackers declared by ${attackingPlayer.name}.`);
            this.#game.emitEvent('gameLog', { message: `Nenhum atacante válido declarado.` });
            this.#combatState = 'none'; // Reset explícito se não houver atacantes
            // this.reset(); // Opcional, mas se nada aconteceu, o reset é seguro.
                           // Se o Game.passPhase() for chamado pela IA/jogador, ele pode chamar reset.
            // Se for o turno da IA e ela não declara atacantes, SimpleAI._performAttackDeclaration deve chamar game.passPhase()
            // Se for o turno do jogador e ele clica em "Confirmar Ataque" sem selecionar,
            // BattleInteractionManager._handleConfirmAttackersClick deve informar o jogador ou passar a fase.
            // Se for um "Passar Fase" direto, CombatManager.reset() é chamado no Game.passPhase().
            if (this.#game.getCurrentPlayer()?.id === attackingPlayer.id && this.#game.getCurrentPhase() === 'attack') {
                // Se nenhum atacante foi válido, o jogador (humano ou IA) deve decidir passar a fase
                // ou a lógica do jogo deve avançar automaticamente.
                // Adicionar this.#game.passPhase() aqui pode ser muito agressivo.
                // É melhor a entidade que chamou declareAttackers (Game ou SimpleAI)
                // lidar com o "passar a fase" se nenhum atacante for declarado.
            }
        }
        return success;
    }


    /**
     * Sets the blocker assignments for the current combat.
     * @param {Player} defendingPlayer - The player declaring blockers.
     * @param {Map<string, string[]>} assignments - Map where key is attacker uniqueId and value is array of blocker uniqueIds.
     * @returns {boolean} True if blockers were successfully declared.
     */
    declareBlockers(defendingPlayer, assignments) {
        if (this.#combatState !== 'declare_blockers') {
            console.warn(`CombatManager: Cannot declare blockers in state: ${this.#combatState}`);
            return false;
        }

        this.#blockerAssignments.clear();
        const declaredBlockersInfo = [];
        let allValid = true;

        assignments.forEach((blockerIds, attackerId) => {
            const attacker = this.#attackers.get(attackerId);
            if (!attacker) {
                console.warn(`CombatManager: Invalid attacker ID ${attackerId} in blocker assignments.`);
                allValid = false;
                return;
            }

            const validBlockersForThisAttacker = [];
            for (const blockerId of blockerIds) {
                const blocker = defendingPlayer.battlefield.getCard(blockerId);
                if (blocker && blocker.type === 'Creature' && blocker.canBlock()) {
                    validBlockersForThisAttacker.push(blockerId);
                     if (!declaredBlockersInfo.find(b => b.blockerId === blockerId)) {
                         declaredBlockersInfo.push({ blockerId: blockerId, blockerData: blocker.getRenderData() });
                     }
                } else {
                    console.warn(`CombatManager: Creature ${blockerId} cannot block ${attackerId} or not found.`);
                    this.#game.emitEvent('gameLog', { message: `Bloqueador inválido: ${blocker?.name || blockerId}` });
                    allValid = false;
                }
            }
            if (validBlockersForThisAttacker.length > 0) {
                this.#blockerAssignments.set(attackerId, validBlockersForThisAttacker);
                console.log(`CombatManager: Attacker ${attacker.name} (${attackerId}) blocked by [${validBlockersForThisAttacker.join(', ')}]`);
            }
        });

        console.log(`CombatManager: Blockers declared by ${defendingPlayer.name}.`);
        this.#combatState = 'resolving';

        this.#game.emitEvent('blockersDeclared', {
            defendingPlayerId: defendingPlayer.id,
            blockerAssignments: Object.fromEntries(this.#blockerAssignments),
            declaredBlockers: declaredBlockersInfo
        });

        this.resolveCombat();
        return allValid;
    }


    /** Resolves combat damage based on declared attackers and blockers. */
    resolveCombat() {
        // <<<< CORREÇÃO DA CONDIÇÃO >>>>
        // Permite resolver se o estado é 'resolving'
        // OU se o estado é 'none' MAS HÁ ATACANTES (caso de !defenderHasPossibleBlockers em declareAttackers)
        //    E NÃO HÁ BLOCOS (porque se houvesse, o estado seria 'declare_blockers')
        // Esta segunda parte da condição (`this.#combatState === 'none' && this.#attackers.size > 0 && this.#blockerAssignments.size === 0`)
        // é redundante se `declareAttackers` já setou o estado para `resolving` no caso de não haver bloqueadores.
        // Simplificando:
        if (this.#combatState !== 'resolving') {
            console.warn(`CombatManager: Cannot resolve combat in state: ${this.#combatState}. Expected 'resolving'. Assuming pre-declared or no combat and resetting.`);
            this.reset();
            return;
        }
        // <<<< FIM DA CORREÇÃO DA CONDIÇÃO >>>>

        console.log("CombatManager: Resolving combat...");

        // Determina quem é o defensor ATUALMENTE. No momento de resolver o combate,
        // o jogador atual (this.#game.getCurrentPlayer()) é o ATACANTE ORIGINAL.
        const attackingPlayer = this.#game.getCurrentPlayer();
        const defendingPlayer = this.#game.getOpponent(attackingPlayer?.id);

        if (!attackingPlayer || !defendingPlayer) {
            console.error("CombatManager: Could not determine attacking or defending player for damage resolution.");
            this.reset();
            return;
        }

        // Itera através dos atacantes que foram declarados e ainda estão no map #attackers
        this.#attackers.forEach((attacker, attackerId) => {
            // Verifica se o atacante ainda está no campo do attackingPlayer (poderia ter sido removido por um efeito "antes do combate")
            const currentAttackerInstance = attackingPlayer.battlefield.getCard(attackerId);
            if (!currentAttackerInstance || currentAttackerInstance.currentToughness <= 0) {
                console.log(`CombatManager: Attacker ${attacker.name} no longer on battlefield or has no toughness. Skipping damage.`);
                return; // Pula para o próximo atacante
            }

            const blockers = this.#blockerAssignments.get(attackerId);

            if (blockers && blockers.length > 0) {
                // --- Attacker is Blocked ---
                console.log(`CombatManager: Resolving blocked combat for ${currentAttackerInstance.name}`);
                let totalBlockerAttack = 0;
                const blockerInstances = [];

                blockers.forEach(blockerId => {
                    const blocker = defendingPlayer.battlefield.getCard(blockerId);
                    if (blocker && blocker.currentToughness > 0) { // Verifica se o bloqueador ainda está vivo
                        blockerInstances.push(blocker);
                        totalBlockerAttack += blocker.attack;
                    } else {
                        console.log(`CombatManager: Blocker ${blockerId} for ${currentAttackerInstance.name} no longer on field or no toughness.`)
                    }
                });

                // Attacker deals damage to blocker(s)
                if (blockerInstances.length > 0) {
                    // Simplificado: dano ao primeiro bloqueador. Para regras complexas (distribuir dano), isso precisaria mudar.
                    console.log(`CombatManager: ${currentAttackerInstance.name} (Atk: ${currentAttackerInstance.attack}) deals ${currentAttackerInstance.attack} damage to ${blockerInstances[0].name}`);
                    blockerInstances[0].takeDamage(currentAttackerInstance.attack, currentAttackerInstance, this.#game);
                }

                // Blocker(s) deal damage to attacker
                if (totalBlockerAttack > 0) {
                    console.log(`CombatManager: Blockers (Total Atk: ${totalBlockerAttack}) deal ${totalBlockerAttack} damage to ${currentAttackerInstance.name}`);
                    currentAttackerInstance.takeDamage(totalBlockerAttack, blockerInstances.length > 0 ? blockerInstances[0] : null, this.#game); // Atribui ao primeiro bloqueador como fonte
                }

            } else {
                // --- Attacker is Unblocked ---
                console.log(`DEBUG_COMBAT: Unblocked: ${currentAttackerInstance.name} (Atk: ${currentAttackerInstance.attack}) vs ${defendingPlayer.name} (Life before: ${defendingPlayer.life})`);
                defendingPlayer.takeDamage(currentAttackerInstance.attack, currentAttackerInstance, this.#game);
                console.log(`DEBUG_COMBAT: ${defendingPlayer.name} (Life after: ${defendingPlayer.life})`);
            }
        });

        console.log("CombatManager: Combat damage resolved.");
        this.#game.emitEvent('combatResolved', {});

        this.reset(); // ESSENCIAL: Reseta o estado do CombatManager após a resolução
    }

    // --- Getters for state (optional) ---
    get state() { return this.#combatState; }
    getAttackers() { return [...this.#attackers.values()]; }
    getBlockerAssignments() { return new Map(this.#blockerAssignments); }
}