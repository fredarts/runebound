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
     * Define as criaturas que atacam nesta fase de combate.
     * @param {Player} attackingPlayer  – jogador que está atacando
     * @param {string[]} attackerIds    – uniqueIds das criaturas declaradas como atacantes
     * @returns {boolean}               – true se houve pelo menos um atacante válido
     */
    declareAttackers(attackingPlayer, attackerIds) {
        // ─── Validações de estado ──────────────────────────────────────────────
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

        // ─── Monta a lista de atacantes ────────────────────────────────────────
        this.#attackers.clear();
        const declaredAttackersForEvent = [];

        for (const id of attackerIds) {
            const creature = attackingPlayer.battlefield.getCard(id);
            if (creature && creature.type === 'Creature' && creature.canAttack()) {
                this.#attackers.set(id, creature);
                declaredAttackersForEvent.push(creature.getRenderData());
            } else {
                console.warn(`CombatManager: Creature ${id} cannot attack or was not found.`);
                this.#game.emitEvent('gameLog', { message: `Criatura inválida para atacar: ${creature?.name || id}` });
            }
        }

        // ─── Resultado ─────────────────────────────────────────────────────────
        if (this.#attackers.size > 0) {
            // Tapa cada atacante e notifica a UI
            this.#attackers.forEach(attacker => {
                attacker.tap();
                this.#game.emitEvent('creatureUpdate', {
                    cardUniqueId: attacker.uniqueId,
                    updates: { isTapped: true }
                });
            });

            
            this.#combatState = 'declare_blockers';

            
            this.#game.emitEvent('attackersDeclared', {
                attackingPlayerId: attackingPlayer.id,
                attackers: declaredAttackersForEvent
            });

            console.log(`CombatManager: ${this.#attackers.size} attackers declared by ${attackingPlayer.name}. Waiting for blockers.`);
            return true;
        }

        // Nenhum atacante válido
        console.log(`CombatManager: No valid attackers declared by ${attackingPlayer.name}.`);
        this.#game.emitEvent('gameLog', { message: `Nenhum atacante válido declarado.` });
        this.#combatState = 'none';
        return false;
    }


    /**
     * Sets the blocker assignments for the current combat.
     * @param {Player} defendingPlayer - The player declaring blockers.
     * @param {Map<string, string[]>} assignments - Map where key is attacker uniqueId and value is array of blocker uniqueIds.
     * @returns {boolean} True if blockers were successfully declared (pode ser 0 bloqueios).
     */
    declareBlockers(defendingPlayer, assignments) {
        if (this.#combatState !== 'declare_blockers') {
            console.warn(`CombatManager: Cannot declare blockers in state: ${this.#combatState}`);
            return false;
        }

        this.#blockerAssignments.clear();
        const declaredBlockersInfo = []; 
        let allAssignmentsWereValid = true;

        // Se assignments for um objeto vazio (ex: {} quando nenhum bloqueador é declarado pelo humano/IA)
        // A iteração abaixo não acontecerá, resultando em #blockerAssignments permanecendo vazio.
        if (assignments && typeof assignments.forEach === 'function') { // Garante que assignments é iterável (Map)
            assignments.forEach((blockerIds, attackerId) => {
                const attacker = this.#attackers.get(attackerId);
                if (!attacker) {
                    console.warn(`CombatManager: Invalid attacker ID ${attackerId} in blocker assignments.`);
                    allAssignmentsWereValid = false; 
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
                        allAssignmentsWereValid = false;
                    }
                }
                if (validBlockersForThisAttacker.length > 0) {
                    this.#blockerAssignments.set(attackerId, validBlockersForThisAttacker);
                    console.log(`CombatManager: Attacker ${attacker.name} (${attackerId}) blocked by [${validBlockersForThisAttacker.join(', ')}]`);
                }
            });
        } else if (assignments && Object.keys(assignments).length === 0) {
            console.log(`CombatManager: No blockers declared by ${defendingPlayer.name} (assignments object was empty).`);
        } else if (!assignments) {
            console.log(`CombatManager: No blockers declared by ${defendingPlayer.name} (assignments was null/undefined).`);
        }


        console.log(`CombatManager: Blockers declaration processed for ${defendingPlayer.name}. Number of assignments: ${this.#blockerAssignments.size}`);
        this.#combatState = 'resolving'; 

        this.#game.emitEvent('blockersDeclared', {
            defendingPlayerId: defendingPlayer.id,
            blockerAssignments: Object.fromEntries(this.#blockerAssignments), 
            declaredBlockers: declaredBlockersInfo 
        });

        this.resolveCombat(); 
        return true; 
    }


    /** Resolves combat damage based on declared attackers and blockers. */
    resolveCombat() {
        if (this.#combatState !== 'resolving') {
            console.warn(`CombatManager: Cannot resolve combat in state: ${this.#combatState}. Expected 'resolving'.`);
            if (this.#attackers.size === 0) {
                 console.log("CombatManager: No attackers to resolve. Resetting.");
                 this.reset();
            }
            return;
        }

        console.log("CombatManager: Resolving combat...");
        const attackingPlayer = this.#game.getCurrentPlayer(); 
        const defendingPlayer = this.#game.getOpponent(attackingPlayer?.id);

        if (!attackingPlayer || !defendingPlayer) {
            console.error("CombatManager: Could not determine attacking or defending player for damage resolution.");
            this.reset(); 
            return;
        }

        this.#attackers.forEach((attacker, attackerId) => {
            const currentAttackerInstance = attackingPlayer.battlefield.getCard(attackerId);
            if (!currentAttackerInstance || currentAttackerInstance.currentToughness <= 0) {
                console.log(`CombatManager: Attacker ${attacker.name} (ID: ${attackerId}) no longer on battlefield or has no toughness. Skipping damage for this attacker.`);
                return; 
            }

            const blockersIds = this.#blockerAssignments.get(attackerId); 

            if (blockersIds && blockersIds.length > 0) {
                console.log(`CombatManager: Resolving blocked combat for ${currentAttackerInstance.name} (ID: ${attackerId})`);
                let totalBlockerAttack = 0;
                const blockerInstances = []; 

                blockersIds.forEach(blockerId => {
                    const blocker = defendingPlayer.battlefield.getCard(blockerId);
                    if (blocker && blocker.currentToughness > 0) { 
                        blockerInstances.push(blocker);
                        totalBlockerAttack += blocker.attack;
                    } else {
                        console.log(`CombatManager: Blocker ${blockerId} for ${currentAttackerInstance.name} no longer on field or no toughness.`);
                    }
                });

                if (blockerInstances.length > 0) {
                    const firstBlocker = blockerInstances[0];
                    console.log(`CombatManager: ${currentAttackerInstance.name} (Atk: ${currentAttackerInstance.attack}) deals ${currentAttackerInstance.attack} damage to ${firstBlocker.name}`);
                    firstBlocker.takeDamage(currentAttackerInstance.attack, currentAttackerInstance, this.#game);
                }

                if (totalBlockerAttack > 0) {
                    console.log(`CombatManager: Blockers (Total Atk: ${totalBlockerAttack}) deal ${totalBlockerAttack} damage to ${currentAttackerInstance.name}`);
                    const damageSourceForLog = blockerInstances.length > 0 ? blockerInstances[0] : null;
                    currentAttackerInstance.takeDamage(totalBlockerAttack, damageSourceForLog, this.#game);
                }

            } else {
                console.log(`CombatManager: Unblocked attacker ${currentAttackerInstance.name} (Atk: ${currentAttackerInstance.attack}) deals damage to ${defendingPlayer.name} (Life before: ${defendingPlayer.life})`);
                defendingPlayer.takeDamage(currentAttackerInstance.attack, currentAttackerInstance, this.#game);
                console.log(`CombatManager: ${defendingPlayer.name} (Life after: ${defendingPlayer.life})`);
            }
        });

        console.log("CombatManager: Combat damage resolved.");
        this.#game.emitEvent('combatResolved', {});

        this.reset(); 
    }

    get state() { return this.#combatState; }
    getAttackers() { return [...this.#attackers.values()]; } 
    getBlockerAssignments() { return new Map(this.#blockerAssignments); } 
}