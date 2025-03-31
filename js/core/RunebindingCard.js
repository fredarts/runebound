// js/core/RunebindingCard.js
import Card from './Card.js'; // Correct: Card uses export default

/**
 * Represents a Runebinding card, which can be an enchantment
 * (permanent or temporary) applied to targets or the field.
 */
export class RunebindingCard extends Card { // Using export class
    #effectText;
    #targetType;
    #isTemporary;
    #durationCounters;
    #appliedTo = null; // uniqueId of target or 'field'/'player'

    constructor(cardDefinition, ownerId) {
        super(cardDefinition, ownerId);
        if (cardDefinition.type !== 'Runebinding') throw new Error(`Definition "${cardDefinition.name}" is not type Runebinding.`);
        this.#effectText = cardDefinition.effect || 'No effect description.';
        this.#targetType = this.#determineTargetType(cardDefinition.effect);
        this.#isTemporary = cardDefinition.isTemporary || this.#effectText.toLowerCase().includes('this turn') || this.#effectText.toLowerCase().includes('next turn');
        this.#durationCounters = this.#isTemporary ? (cardDefinition.duration || 1) : -1;
    }

    // --- Getters ---
    get effectText() { return this.#effectText; }
    get targetType() { return this.#targetType; }
    get isTemporary() { return this.#isTemporary; }
    get durationCounters() { return this.#durationCounters; }
    get appliedTo() { return this.#appliedTo; }

    // --- Card Specific Methods ---
    #determineTargetType(effectText = "") {
        const text = effectText.toLowerCase();
        if (text.includes('target creature')) return 'creature';
        if (text.includes('target player')) return 'player';
        if (text.includes('draw 2 cards')) return 'player_self'; // Specific case for RB_DRAW2
        if (text.includes('destroy target runebinding')) return 'runebinding';
        // Add more rules
        return 'field'; // Default
    }
    requiresTarget() { return this.#targetType !== 'field' && this.#targetType !== 'player_self'; }

    canPlay(player, game) {
        if (!super.canPlay(player, game)) return false;
        if (game.getCurrentPhase() !== 'main') return false; // Usually main phase
        // TODO: Check if valid target exists (requires Game method)
        // if (this.requiresTarget() && !game.hasValidTargets(this.#targetType, player)) return false;
        return true;
    }

    play(player, game, targetId = null) {
        // Called after Player verifies canPlay and spends mana
        console.log(`Runebinding: ${player.name} playing ${this.name} ${targetId ? `on target ${targetId}` : ''}`);
        const success = this.applyEffect(targetId, game, player);

        if (success) {
            // Determine where it goes (battlefield or graveyard)
            const goesToGraveyard = this.#isTemporary && this.#durationCounters <= 0;
            const destination = goesToGraveyard ? 'graveyard' : 'battlefield';
            const moved = game.moveCardToZone(this.uniqueId, this.ownerId, 'hand', destination);

            if (moved && destination === 'battlefield') {
                // Track attachment if it went to field
                if (this.#targetType === 'creature' || this.#targetType === 'player') this.#appliedTo = targetId;
                else if (this.#targetType === 'field') this.#appliedTo = 'field';
                console.log(`Runebinding: ${this.name} now on ${destination} ${this.#appliedTo ? `(applied to ${this.#appliedTo})` : ''}.`);
                // TODO: If attached to creature, update creature state/visuals
            } else if (moved && destination === 'graveyard'){
                console.log(`Runebinding: ${this.name} went directly to graveyard.`);
            } else if (!moved) {
                 console.error(`Runebinding: Failed to move ${this.name} from hand to ${destination}.`);
                 return false; // Movement failed, major issue
            }
        } else {
            // Effect failed (e.g., target invalid), move to graveyard
            console.log(`Runebinding: Effect failed for ${this.name}, moving to graveyard.`);
            game.moveCardToZone(this.uniqueId, this.ownerId, 'hand', 'graveyard');
        }
        return success; // Return success of the effect application
    }

    applyEffect(targetId, game, castingPlayer) {
        console.log(`Runebinding: Applying effect of ${this.name}`);
        try {
            let target = null;
            if (targetId) {
                target = game.getPlayer(targetId) || game.findCardInstance(targetId);
                if (!target) { console.warn(`ApplyEffect: Target ${targetId} not found.`); return false; }
            }

            switch (this.id) {
                case 'RB001': // Destroy
                    if (target && target instanceof CreatureCard) { target.die(game); this.#durationCounters = 0; } else return false; break;
                case 'RB_DRAW2': // Draw Rune
                    castingPlayer.drawCards(2, game); this.#durationCounters = 0; break;
                case 'RB_SILENCE': // Silence
                    if (target && target instanceof CreatureCard) { target.applyStatusEffect('cant_attack', 2); console.log(`${target.name} silenced.`); } else return false; break; // Duration 2 ticks (opponent's turn + your next)
                case 'RB_POWER': // Power Boost
                    if (target && target instanceof CreatureCard) { target.applyTemporaryBoost({ attack: 2 }, 1); console.log(`${target.name} +2 Atk.`); } else return false; break;
                case 'RB_TOUGH': // Toughness Boost
                    if (target && target instanceof CreatureCard) { target.applyTemporaryBoost({ toughness: 2 }, 1); console.log(`${target.name} +2 Tough.`); } else return false; break;
                default: console.warn(`ApplyEffect: No logic for Runebinding ${this.name}`); break;
            }
            return true;
        } catch (error) { console.error(`ApplyEffect Error for ${this.name}:`, error); return false; }
    }

    removeEffect(game) {
        console.log(`Runebinding: Removing effect of ${this.name}`);
        // TODO: Revert specific effects based on this.id if needed
        // e.g., if it was a static +1/+1 aura, find target and remove boost

        // If the card is still marked as on the battlefield, move it to graveyard
        if (this.location === 'battlefield') {
            game.moveCardToZone(this.uniqueId, this.ownerId, 'battlefield', 'graveyard');
        }
        this.#appliedTo = null;
    }

    tickDown(game) {
        if (!this.#isTemporary || this.#durationCounters <= 0) return false;
        this.#durationCounters--;
        console.log(`Runebinding: ${this.name} ticks left: ${this.#durationCounters}`);
        if (this.#durationCounters <= 0) {
            this.removeEffect(game);
            return true; // Expired
        }
        return false; // Still active
    }

    getRenderData() {
        return { ...super.getRenderData(), effectText: this.effectText, isTemporary: this.isTemporary, duration: this.durationCounters, appliedTo: this.appliedTo };
    }
}