// js/core/CreatureCard.js
import Card from './Card.js'; // Correct: Card uses export default

export default class CreatureCard extends Card { // Using export default
    #attack;
    #toughness;
    #currentToughness;
    #tribe;
    #abilities;
    #isTapped = false;
    #summoningSickness = true;
    #damageTakenThisTurn = 0; // Might not be needed

    // Buffs/Debuffs/Status Effects
    #tempBoosts = []; // Array of { boost: { attack?, toughness? }, duration: ticks }
    #statusEffects = new Map(); // Map<string, number> (effectName -> duration)

    constructor(cardDefinition, ownerId) {
        super(cardDefinition, ownerId);
        if (cardDefinition.type !== 'Creature') throw new Error(`Definition "${cardDefinition.name}" is not type Creature.`);
        this.#attack = cardDefinition.attack ?? 0;
        this.#toughness = cardDefinition.toughness ?? 1;
        this.#currentToughness = this.#toughness; // Initialize current = max
        this.#tribe = cardDefinition.tribe || 'None';
        this.#abilities = cardDefinition.abilities || [];
        this.#tempBoosts = [];
        this.#statusEffects = new Map();
    }

    // --- Getters (applying modifiers) ---
    get baseAttack() { return this.#attack; }
    get baseToughness() { return this.#toughness; }

    get attack() { // Calculated attack
        let currentAttack = this.#attack;
        this.#tempBoosts.forEach(b => { currentAttack += (b.boost.attack || 0); });
        // TODO: Add permanent modifiers if any (e.g., from auras)
        return Math.max(0, currentAttack);
    }
    get toughness() { // Calculated max toughness
        let currentMaxToughness = this.#toughness;
         this.#tempBoosts.forEach(b => { currentMaxToughness += (b.boost.toughness || 0); });
         // TODO: Add permanent modifiers
         return Math.max(1, currentMaxToughness);
    }
     get currentToughness() { return this.#currentToughness; }

    get tribe() { return this.#tribe; }
    get abilities() { return [...this.#abilities]; } // Copy
    get isTapped() { return this.#isTapped; }
    get hasSummoningSickness() { return this.#summoningSickness; }
    hasStatusEffect(effectName) { return this.#statusEffects.has(effectName); }

    // --- Play Logic ---
    canPlay(player, game) {
        if (!super.canPlay(player, game)) return false;
        // Creatures usually played in Main Phase
        if (game.getCurrentPhase() !== 'main') return false;
        // TODO: Check battlefield limits
        return true;
    }

    play(player, game, targetId = null) {
        // Called AFTER Player spends mana
        console.log(`Creature: ${player.name} playing ${this.name}.`);
        const moved = game.moveCardToZone(this.uniqueId, this.ownerId, 'hand', 'battlefield');
        if (moved) {
            this.#summoningSickness = true;
            this.#isTapped = false;
            this.onEnterBattlefield(game, player); // Trigger ETB effects
            // Emit full update after entering field
            game.emitEvent('creatureUpdate', { cardUniqueId: this.uniqueId, updates: this.getRenderData() });
            return true;
        } else {
            console.error(`Creature: Failed move to battlefield for ${this.name}.`);
            return false; // Indicate failure
        }
    }

    // --- Combat and State ---
    canAttack() {
        return this.location === 'battlefield'
            && !this.#isTapped
            && !this.#summoningSickness
            && this.attack > 0
            && !this.hasStatusEffect('cant_attack')
            && !this.hasStatusEffect('silenced'); // Added silence check
    }
    canBlock() {
        // TODO: Add check for flying/reach interaction if relevant
        return this.location === 'battlefield'
            && !this.#isTapped
            && !this.hasStatusEffect('cant_block');
    }

    /** Explicitly taps the creature */
    tap() {
        if (!this.#isTapped) {
            this.#isTapped = true;
            console.log(`Creature: ${this.name} tapped.`);
            // Game should emit event AFTER calling this
        }
    }
    /** Explicitly untaps the creature */
    untap() {
        if (this.#isTapped) {
            this.#isTapped = false;
            console.log(`Creature: ${this.name} untapped.`);
            // Game should emit event AFTER calling this
        }
    }

    takeDamage(amount, source, game) {
        if (amount <= 0 || this.location !== 'battlefield') return;
        if (this.hasStatusEffect('shielded') || this.hasStatusEffect('prevent_damage')) {
            console.log(`Creature: ${this.name} damage prevented.`);
            if(this.hasStatusEffect('shielded')) this.removeStatusEffect('shielded'); // Shield is usually one-time
            game.emitEvent('damagePrevented', { target: this.getRenderData(), amount, source: source?.getRenderData() });
            return;
        }

        this.#currentToughness -= amount;
        console.log(`Creature: ${this.name} took ${amount} damage. Toughness: ${this.#currentToughness}/${this.toughness}`);
        // Emit individual update for toughness
        game.emitEvent('creatureUpdate', { cardUniqueId: this.uniqueId, updates: { currentToughness: this.#currentToughness } });
        // Emit specific damage event
        game.emitEvent('creatureTookDamage', { creature: this.getRenderData(), amount, source: source?.getRenderData() });

        if (this.#currentToughness <= 0) {
            this.die(game);
        }
    }

    heal(amount, game) {
        if(amount <= 0 || this.location !== 'battlefield') return;
        const maxToughness = this.toughness; // Use calculated max toughness
        if (this.#currentToughness >= maxToughness) return; // Already full

        const actualHeal = Math.min(amount, maxToughness - this.#currentToughness);
        this.#currentToughness += actualHeal;
        console.log(`Creature: ${this.name} healed ${actualHeal}. Toughness: ${this.#currentToughness}/${maxToughness}`);
        game.emitEvent('creatureUpdate', { cardUniqueId: this.uniqueId, updates: { currentToughness: this.#currentToughness } });
        game.emitEvent('creatureHealed', { creature: this.getRenderData(), amount: actualHeal });
    }

    die(game) {
        if (this.location !== 'battlefield') return; // Already dead/gone
        console.log(`Creature: ${this.name} is dying.`);
        const moved = game.moveCardToZone(this.uniqueId, this.ownerId, 'battlefield', 'graveyard');
        if (moved) {
             this.onDeath(game); // Trigger death effects AFTER moving
        } else {
            console.error(`Creature: Failed to move ${this.name} to graveyard.`);
        }
    }

    endTurnCleanup(isOwnTurn) {
        if (isOwnTurn) {
            this.#summoningSickness = false; // Wears off after controller's turn ends
        }
        const changed = this.#tickDownEffects(); // Tick down effects
        // TODO: If changed is true, trigger a 'creatureUpdate' event from Game?
        // Game's endTurnCleanup loop should probably do this.
    }

    // --- Status Effects & Boosts ---
    applyStatusEffect(effectName, duration) { // duration -1 for permanent
        this.#statusEffects.set(effectName, duration);
        console.log(`Creature: ${this.name} gained '${effectName}' (${duration < 0 ? 'Permanent' : duration + ' ticks'})`);
        // Game should emit update
    }
    removeStatusEffect(effectName) {
        const existed = this.#statusEffects.delete(effectName);
        if (existed) console.log(`Creature: ${this.name} lost '${effectName}'.`);
        // Game should emit update
        return existed;
    }
    applyTemporaryBoost(boost, duration) {
        this.#tempBoosts.push({ boost: { ...boost }, duration });
        if (boost.toughness && boost.toughness > 0) this.#currentToughness += boost.toughness;
        console.log(`Creature: ${this.name} gained boost ${JSON.stringify(boost)} (${duration} ticks)`);
        // Game should emit update
    }

    #tickDownEffects() {
        let changed = false;
        // Boosts
        const previousMaxToughness = this.toughness;
        this.#tempBoosts = this.#tempBoosts.filter(b => {
            b.duration--;
            if (b.duration <= 0) { changed = true; return false; } // Remove expired
            return true;
        });
        // Adjust current toughness if max toughness decreased
        const newMaxToughness = this.toughness;
        if (newMaxToughness < previousMaxToughness) {
            this.#currentToughness = Math.min(this.#currentToughness, newMaxToughness);
        }

        // Status Effects
        for (const [effect, duration] of this.#statusEffects.entries()) {
            if (duration > 0) { // Only tick down timed effects
                 const newDuration = duration - 1;
                 if (newDuration <= 0) { this.#statusEffects.delete(effect); changed = true; }
                 else { this.#statusEffects.set(effect, newDuration); }
            }
        }
        // TODO: Need a way for Game to know 'changed' happened to emit update
        return changed;
    }

    // --- Triggered Abilities (Placeholders) ---
    onEnterBattlefield(game, player) {
        if (this.abilities.includes('ETB: Draw a card')) { player.drawCards(1, game); }
    }
    onDeath(game) {
         if (this.abilities.includes('Deathrattle: Deal 1 damage to opponent')) {
             const opp = game.getOpponent(this.ownerId);
             if(opp) opp.takeDamage(1, this, game);
         }
    }

    // --- Rendering ---
    getRenderData() {
        // Ensure all relevant calculated properties are included
        return {
            ...super.getRenderData(),
            baseAttack: this.baseAttack, baseToughness: this.baseToughness,
            attack: this.attack, toughness: this.toughness, // Calculated max toughness
            currentToughness: this.currentToughness,
            tribe: this.tribe, isTapped: this.isTapped, hasSummoningSickness: this.hasSummoningSickness,
            canAttack: this.canAttack(), canBlock: this.canBlock(),
            statusEffects: Object.fromEntries(this.#statusEffects)
        };
    }
}