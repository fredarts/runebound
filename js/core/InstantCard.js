// js/core/InstantCard.js

import Card from './Card.js';

/**
 * Represents an Instant Spell card, which has an immediate effect
 * and then typically goes to the graveyard.
 */
export class InstantCard extends Card {
    #effectText;
    #targetType;

    constructor(cardDefinition, ownerId) {
        super(cardDefinition, ownerId); // Call base class constructor

        if (cardDefinition.type !== 'Instant') {
            throw new Error(`Card definition "${cardDefinition.name}" is not of type Instant.`);
        }

        this.#effectText = cardDefinition.effect || 'No effect description.';
        // Determine target type (similar logic as Runebinding)
        this.#targetType = this.#determineTargetType(cardDefinition.effect);

        // Instants don't usually have duration
    }

    // --- Getters ---
    get effectText() { return this.#effectText; }
    get targetType() { return this.#targetType; }

    // --- Card Specific Methods ---

     /** Basic heuristic for target type */
    #determineTargetType(effectText = "") {
        const text = effectText.toLowerCase();
        if (text.includes('target creature')) return 'creature';
        if (text.includes('target player')) return 'player';
        if (text.includes('target runebinding')) return 'runebinding';
        if (text.includes('draw') && !text.includes('target')) return 'player_self';
        if (text.includes('restore') && !text.includes('target')) return 'player_self'; // Heal self
        // Add more rules
        return 'none'; // No target needed
    }

    /** Checks if this card requires a target. */
    requiresTarget() {
        return this.#targetType !== 'none' && this.#targetType !== 'player_self';
    }

    /**
     * Overrides base canPlay for Instants.
     * Instants might be playable during more phases (e.g., opponent's turn, attack phase).
     * This depends heavily on your game rules - adjust accordingly!
     * @param {Player} player
     * @param {Game} game
     * @returns {boolean}
     */
    canPlay(player, game) {
        // Base checks (mana, hand)
        if (!super.canPlay(player, game)) return false;

        // --- Timing Restrictions (EXAMPLE - NEEDS YOUR RULES) ---
        const currentPhase = game.getCurrentPhase();
        const isActivePlayer = game.getCurrentPlayer()?.id === player.id;

        // Simple rule: Allow anytime if it's your turn, or during opponent's attack phase?
        // if (isActivePlayer) return true; // Allow anytime on your turn
        // if (!isActivePlayer && currentPhase === 'attack') return true; // Allow during opponent's attack

        // More restrictive rule (like Sorcery speed): Only on your main phase
        if (!isActivePlayer || currentPhase !== 'main') {
             console.log(`Instant ${this.name}: Cannot play during phase ${currentPhase}.`);
             // return false; // Uncomment for Sorcery speed
        }
         // For now, let's allow on player's main phase only for simplicity
         if (!isActivePlayer || currentPhase !== 'main') return false;


        // TODO: Check if target is required and available (similar to Runebinding)
        // if (this.requiresTarget() && !game.hasValidTargets(this.#targetType, player)) return false;

        return true;
    }

    /**
     * Overrides base play method for Instants.
     * Resolves the effect and moves the card to the graveyard.
     * @param {Player} player
     * @param {Game} game
     * @param {string | null} targetId - The uniqueId of the target or null.
     */
    play(player, game, targetId = null) {
        if (!super.play(player, game, targetId)) { // Handles cost, base checks
            return false;
        }

        console.log(`Instant: ${player.name} playing ${this.name} ${targetId ? `on target ${targetId}` : ''}`);

        // Resolve the effect immediately
        const success = this.resolveEffect(targetId, game, player);

        // Regardless of success (usually), move Instant to graveyard after resolving/attempting
        console.log(`Instant: ${this.name} moving to graveyard.`);
        game.moveCardToZone(this.uniqueId, this.ownerId, 'hand', 'graveyard');

        // If effect failed, maybe log it, but card is usually still spent
        if (!success) {
            console.warn(`Instant: Effect of ${this.name} may have failed to resolve fully.`);
            // Don't refund mana here, it was spent on the attempt
        }

        return success; // Return success status of the *effect*
    }

    /**
     * Executes the instant spell's effect.
     * Needs specific logic for each Instant card.
     * @param {string | null} targetId
     * @param {Game} game
     * @param {Player} castingPlayer
     * @returns {boolean} True if the effect resolved successfully.
     */
    resolveEffect(targetId, game, castingPlayer) {
        console.log(`Instant: Resolving effect of ${this.name} (Target: ${targetId || 'N/A'})`);

        // --- !!! Requires specific logic for EACH Instant card !!! ---
        try {
            let target = null;
            if (targetId) {
                target = game.getPlayer(targetId) || game.findCardInstance(targetId);
                if (!target) {
                     console.warn(`Instant ResolveEffect: Target ${targetId} not found.`);
                     return false; // Target disappeared
                }
            }

            // Example effects based on provided JSON
            switch (this.id) {
                case 'IS001': // Heal
                    castingPlayer.gainLife(4, game); // Assumes Player has gainLife(amount, game)
                    break;
                case 'IS002': // Fireball
                     if (target && target.type === 'Creature') { // Or target instanceof CreatureCard
                         target.takeDamage(3, this, game); // Assumes CreatureCard has takeDamage(amount, source, game)
                     } else return false; // Invalid target
                     break;
                case 'IS003': // Draw (Assuming ID, effect "Draw 2 cards")
                     castingPlayer.drawCards(2, game);
                     break;
                 case 'IS004': // Shield
                     if (target && target.type === 'Creature') {
                         // TODO: Implement damage prevention effect
                         target.applyStatusEffect('shielded', 1); // Prevent damage for 1 tick (this turn)
                         console.log(`${target.name} is shielded from damage this turn.`);
                     } else return false;
                     break;
                 case 'IS005': // Bounce
                      if (target && target.type === 'Creature') {
                           const owner = game.getPlayer(target.ownerId); // Find the owner
                           if (owner) {
                                game.moveCardToZone(target.uniqueId, target.ownerId, 'battlefield', 'hand');
                                console.log(`${target.name} returned to ${owner.name}'s hand.`);
                           } else return false; // Owner not found?
                      } else return false;
                      break;
                 case 'IS006': // Destroy Binding
                      if (target && target.type === 'Runebinding') { // Check if target is a Runebinding instance
                           // How to destroy? If it's on battlefield, move to graveyard
                           if (target.location === 'battlefield') {
                               target.removeEffect(game); // Let the Runebinding clean itself up
                           } else {
                               // If it's somehow targeted elsewhere? Maybe just log error.
                               console.warn(`Cannot destroy Runebinding ${target.name} not on battlefield.`);
                               return false;
                           }
                      } else return false;
                      break;
                 case 'IS007': // Weaken
                      if (target && target.type === 'Creature') {
                          target.applyTemporaryBoost({ attack: -2 }, 1); // Apply negative boost
                          console.log(`${target.name} gets -2 attack this turn.`);
                      } else return false;
                      break;

                // Add cases for all other Instant cards...

                default:
                    console.warn(`Instant ResolveEffect: No specific effect logic for ${this.name} (ID: ${this.id})`);
                    break;
            }
            return true;
        } catch (error) {
            console.error(`Instant ResolveEffect: Error resolving effect for ${this.name}:`, error);
            return false;
        }
    }

    // Override getRenderData if needed
     getRenderData() {
        return {
            ...super.getRenderData(),
            effectText: this.effectText,
            // Instants usually don't have much other state to show
        };
    }
}

// Ensure Player.js has: gainLife(amount, game), drawCards(count, game)
// Ensure CreatureCard.js has: takeDamage(amount, source, game), applyStatusEffect(name, duration), applyTemporaryBoost(boost, duration)
// Ensure RunebindingCard.js has: removeEffect(game)
// Ensure Game.js has: findCardInstance(uniqueId)