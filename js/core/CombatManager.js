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
        const declaredAttackers = [];
        let success = true;

        for (const id of attackerIds) {
            const creature = attackingPlayer.battlefield.getCard(id);
            if (creature && creature.type === 'Creature' && creature.canAttack()) {
                this.#attackers.set(id, creature);
                declaredAttackers.push(creature.getRenderData()); // For event
            } else {
                console.warn(`CombatManager: Creature ${id} cannot attack or was not found.`);
                 this.#game.emitEvent('gameLog', { message: `Criatura inválida para atacar: ${creature?.name || id}` });
                success = false; // Allow declaring valid ones, but report failure if any invalid
            }
        }

        if (this.#attackers.size > 0) {
            console.log(`CombatManager: ${this.#attackers.size} attackers declared by ${attackingPlayer.name}.`);
            this.#combatState = 'declare_blockers'; // Move state forward
            // Tap the attacking creatures
            this.#attackers.forEach(attacker => {
                 attacker.tap(); // Creature method handles isTapped state
                 this.#game.emitEvent('creatureUpdate', { cardUniqueId: attacker.uniqueId, updates: { isTapped: true } });
            });
            // Emit event AFTER setting state and tapping
            this.#game.emitEvent('attackersDeclared', {
                attackingPlayerId: attackingPlayer.id,
                attackers: declaredAttackers // Send data about declared attackers
            });
        } else {
            console.log(`CombatManager: No valid attackers declared by ${attackingPlayer.name}. Skipping to next phase.`);
             this.#game.emitEvent('gameLog', { message: `Nenhum atacante válido declarado.` });
            // If no attackers, combat effectively ends, proceed past blocker declaration
            this.#combatState = 'resolving'; // Or directly call resolveCombat which resets?
            this.resolveCombat(); // Resolve immediately (will do nothing and reset)
        }

        return success; // Indicates if *all* requested attackers were valid
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
        // Add check: Ensure it's the defending player's turn to declare blockers (implicitly handled by game flow)

        this.#blockerAssignments.clear();
        const declaredBlockersInfo = []; // For event
        let allValid = true;

        assignments.forEach((blockerIds, attackerId) => {
            const attacker = this.#attackers.get(attackerId);
            if (!attacker) {
                console.warn(`CombatManager: Invalid attacker ID ${attackerId} in blocker assignments.`);
                allValid = false;
                return; // Skip this assignment
            }

            const validBlockersForThisAttacker = [];
            for (const blockerId of blockerIds) {
                const blocker = defendingPlayer.battlefield.getCard(blockerId);
                // TODO: Add more complex block validation (e.g., Flying)
                if (blocker && blocker.type === 'Creature' && blocker.canBlock()) {
                    validBlockersForThisAttacker.push(blockerId);
                     // Add to event data only if valid
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
        this.#combatState = 'resolving'; // Move state forward

        this.#game.emitEvent('blockersDeclared', {
            defendingPlayerId: defendingPlayer.id,
            blockerAssignments: Object.fromEntries(this.#blockerAssignments), // Convert Map for event
            declaredBlockers: declaredBlockersInfo
        });

        // Immediately proceed to resolve combat after blockers are declared
        this.resolveCombat();

        return allValid; // Indicates if *all* assignments were fully valid
    }


    /** Resolves combat damage based on declared attackers and blockers. */
    resolveCombat() {
        if (this.#combatState !== 'resolving') {
            console.warn(`CombatManager: Cannot resolve combat in state: ${this.#combatState}. Assuming pre-declared or no combat.`);
            this.reset(); // Reset state if called unexpectedly
            return;
        }
        console.log("CombatManager: Resolving combat...");

        const defendingPlayer = this.#game.getOpponent(this.#game.getCurrentPlayer()?.id); // Player whose turn it ISN'T
        if (!defendingPlayer) {
             console.error("CombatManager: Could not determine defending player.");
             this.reset();
             return;
        }

        const damageEvents = []; // Store damage to apply simultaneously later (optional, simpler to apply directly)

        // Iterate through attackers
        this.#attackers.forEach((attacker, attackerId) => {
            const blockers = this.#blockerAssignments.get(attackerId);

            if (blockers && blockers.length > 0) {
                // --- Attacker is Blocked ---
                console.log(`CombatManager: Resolving blocked combat for ${attacker.name}`);
                let totalBlockerAttack = 0;
                const blockerInstances = [];

                blockers.forEach(blockerId => {
                    const blocker = defendingPlayer.battlefield.getCard(blockerId);
                    if (blocker) {
                        blockerInstances.push(blocker);
                        totalBlockerAttack += blocker.attack;
                    }
                });

                // Attacker deals damage to blocker(s)
                // Simple: Attacker deals full damage to first blocker only (adjust for multi-block rules)
                if (blockerInstances.length > 0) {
                    console.log(`CombatManager: ${attacker.name} deals ${attacker.attack} damage to ${blockerInstances[0].name}`);
                    blockerInstances[0].takeDamage(attacker.attack, attacker, this.#game);
                }

                // Blocker(s) deal damage to attacker
                console.log(`CombatManager: Blockers deal ${totalBlockerAttack} damage to ${attacker.name}`);
                attacker.takeDamage(totalBlockerAttack, blockerInstances[0], this.#game); // Source attribution might need work for multi-block

            } else {
                // --- Attacker is Unblocked ---
                console.log(`CombatManager: Unblocked attacker ${attacker.name} deals ${attacker.attack} damage to player ${defendingPlayer.name}`);
                defendingPlayer.takeDamage(attacker.attack, attacker, this.#game);
            }
        });

        console.log("CombatManager: Combat damage resolved.");
        this.#game.emitEvent('combatResolved', {
            // Include details about damage dealt, creatures died etc. if needed
        });

        // Reset state after resolution
        this.reset();
    }

    // --- Getters for state (optional) ---
    get state() { return this.#combatState; }
    getAttackers() { return [...this.#attackers.values()]; } // Return array copy
    getBlockerAssignments() { return new Map(this.#blockerAssignments); } // Return map copy
}