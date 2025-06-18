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
        let gameInstanceForLog = null;
        if (typeof window !== 'undefined' && window.currentGameInstance) {
            gameInstanceForLog = window.currentGameInstance;
        }

        const can = this.location === 'battlefield'
            && !this.#isTapped
            && !this.#summoningSickness
            && this.attack > 0
            && !this.hasStatusEffect('cant_attack')
            && !this.hasStatusEffect('silenced');

        if (gameInstanceForLog) {
            const localPlayer = gameInstanceForLog.getPlayer(gameInstanceForLog.localPlayerId);
            if (this.ownerId === localPlayer?.id) {
                 console.log(`DEBUG ${this.name} (Owner: ${this.ownerId}) canAttack(): ${can}`, {
                    location: this.location,
                    isTapped: this.#isTapped,
                    summoningSickness: this.#summoningSickness,
                    calculatedAttack: this.attack,
                    baseAttack: this.#attack,
                    has_cant_attack: this.hasStatusEffect('cant_attack'),
                    has_silenced: this.hasStatusEffect('silenced')
                });
            }
        }
        return can;
    }
    canBlock() {
        return this.location === 'battlefield'
            && !this.#isTapped
            && !this.hasStatusEffect('cant_block');
    }

    tap() {
        if (!this.#isTapped) {
            this.#isTapped = true;
            console.log(`Creature: ${this.name} tapped.`);
        }
    }
    untap() {
        if (this.#isTapped) {
            this.#isTapped = false;
            console.log(`Creature: ${this.name} untapped.`);
        }
    }

    takeDamage(amount, source, game) {
        if (amount <= 0 || this.location !== 'battlefield') return;
        if (this.hasStatusEffect('shielded') || this.hasStatusEffect('prevent_damage')) {
            console.log(`Creature: ${this.name} damage prevented.`);
            if(this.hasStatusEffect('shielded')) this.removeStatusEffect('shielded');
            if (game && typeof game.emitEvent === 'function') {
                game.emitEvent('damagePrevented', { target: this.getRenderData(), amount, source: source?.getRenderData() });
            }
            return;
        }

        this.#currentToughness -= amount;
        console.log(`Creature: ${this.name} took ${amount} damage. Toughness: ${this.#currentToughness}/${this.toughness}`);
        if (game && typeof game.emitEvent === 'function') {
            game.emitEvent('creatureUpdate', { cardUniqueId: this.uniqueId, updates: { currentToughness: this.#currentToughness } });
            game.emitEvent('creatureTookDamage', { creature: this.getRenderData(), amount, source: source?.getRenderData() });
        }

        if (this.#currentToughness <= 0) {
            this.die(game);
        }
    }

    heal(amount, game) {
        if (amount <= 0 || this.location !== 'battlefield') {
            console.log(`CreatureCard ${this.name}: Heal preconditions not met (amount: ${amount}, location: ${this.location}).`);
            return false; // Retorna false se a cura não pôde ser aplicada
        }
        const maxToughness = this.toughness; // Máxima resistência atual (considerando buffs/debuffs)
        if (this.#currentToughness >= maxToughness) {
            console.log(`CreatureCard ${this.name}: Already at max toughness (${this.#currentToughness}/${maxToughness}). No heal needed for ${amount}.`);
            return false; // Não curou
        }

        const actualHeal = Math.min(amount, maxToughness - this.#currentToughness);
        if (actualHeal <= 0) { // Se por algum motivo actualHeal for 0 (ex: maxToughness mudou e currentToughness já é >=)
             console.log(`CreatureCard ${this.name}: Actual heal amount is ${actualHeal}. No effective heal.`);
             return false;
        }
        
        this.#currentToughness += actualHeal;
        console.log(`CreatureCard ${this.name}: Healed ${actualHeal}. New Toughness: ${this.#currentToughness}/${maxToughness}. Emitting update.`);

        if (game && typeof game.emitEvent === 'function') {
            game.emitEvent('creatureUpdate', { cardUniqueId: this.uniqueId, updates: { currentToughness: this.#currentToughness } });
            game.emitEvent('creatureHealed', { creature: this.getRenderData(), amount: actualHeal });
        } else {
            console.warn(`CreatureCard.heal: 'game' instance or 'emitEvent' is undefined for ${this.name}. Cannot emit events for heal.`);
        }
        return true; // Curou
    }


    die(game) {
        if (this.location !== 'battlefield') return;
        console.log(`Creature: ${this.name} is dying.`);
        if (game && typeof game.moveCardToZone === 'function') {
            const moved = game.moveCardToZone(this.uniqueId, this.ownerId, 'battlefield', 'graveyard');
            if (moved) {
                 this.onDeath(game);
            } else {
                console.error(`Creature: Failed to move ${this.name} to graveyard.`);
            }
        } else {
            console.error(`CreatureCard.die: 'game' instance or 'moveCardToZone' is undefined for ${this.name}. Cannot move to graveyard.`);
        }
    }

    /**
     * Handles end-of-turn cleanup for the creature.
     * - Removes summoning sickness if it's the owner's turn.
     * - Heals 1 toughness if damaged.
     * - Ticks down temporary effects.
     * - Emits a 'creatureUpdate' event with the full render data if any state changed.
     * @param {boolean} isOwnTurn - True if it's the creature owner's turn.
     * @param {Game} game - The game instance.
     */
    endTurnCleanup(isOwnTurn, game) {
        console.log(`CreatureCard ${this.name}: Starting endTurnCleanup. isOwnTurn: ${isOwnTurn}, currentToughness: ${this.#currentToughness}, maxToughness: ${this.toughness}`);
        
        let stateChanged = false;

        if (isOwnTurn && this.#summoningSickness) {
            this.#summoningSickness = false;
            stateChanged = true;
            console.log(`CreatureCard ${this.name}: Summoning sickness removed.`);
        }

        if (this.#currentToughness < this.toughness) {
            console.log(`CreatureCard ${this.name}: Attempting to heal 1 point (current: ${this.#currentToughness}, max: ${this.toughness}).`);
            if (this.heal(1, game)) { // heal() já emite seu próprio evento 'creatureUpdate' para currentToughness
                stateChanged = true; // Marcar que a cura (uma mudança) ocorreu
            }
        } else {
            console.log(`CreatureCard ${this.name}: No heal needed (current: ${this.#currentToughness}, max: ${this.toughness}).`);
        }

        // #tickDownEffects pode modificar currentToughness (clamp), attack, maxToughness (getters), e statusEffects
        // Ele retorna true se QUALQUER efeito temporário (buff/status) mudou de duração ou expirou.
        // Também considera se currentToughness foi clamped.
        if (this.#tickDownEffects(game)) {
            stateChanged = true;
            console.log(`CreatureCard ${this.name}: Temporary effects changed.`);
        }

        // Se qualquer estado da criatura mudou (summoning sickness, cura, ou efeitos temporários),
        // emita um evento com o estado completo atualizado.
        // O evento de heal() já terá atualizado a currentToughness na UI.
        // Este evento garante que outras mudanças (attack, maxToughness dos getters, statusEffects) sejam refletidas.
        if (stateChanged) {
            if (game && typeof game.emitEvent === 'function') {
                console.log(`CreatureCard ${this.name}: State changed during endTurnCleanup. Emitting full creatureUpdate.`);
                game.emitEvent('creatureUpdate', { cardUniqueId: this.uniqueId, updates: this.getRenderData() });
            }
        }
    }


    // --- Status Effects & Boosts ---
    applyStatusEffect(effectName, duration, game) {
        this.#statusEffects.set(effectName, duration);
        console.log(`Creature: ${this.name} gained '${effectName}' (${duration < 0 ? 'Permanent' : duration + ' ticks'})`);
        if (game && typeof game.emitEvent === 'function') {
            game.emitEvent('creatureUpdate', { cardUniqueId: this.uniqueId, updates: this.getRenderData() });
        }
    }
    removeStatusEffect(effectName, game) {
        const existed = this.#statusEffects.delete(effectName);
        if (existed) console.log(`Creature: ${this.name} lost '${effectName}'.`);
        if (existed && game && typeof game.emitEvent === 'function') {
            game.emitEvent('creatureUpdate', { cardUniqueId: this.uniqueId, updates: this.getRenderData() });
        }
        return existed;
    }
    applyTemporaryBoost(boost, duration, game) {
        this.#tempBoosts.push({ boost: { ...boost }, duration });
        if (boost.toughness && boost.toughness > 0) {
             this.#currentToughness += boost.toughness; // Aumenta current toughness também quando um buff de +X/+toughness é aplicado
             console.log(`CreatureCard ${this.name}: Applied toughness boost, currentToughness now ${this.#currentToughness}.`);
        }
        console.log(`Creature: ${this.name} gained boost ${JSON.stringify(boost)} (${duration} ticks)`);
        if (game && typeof game.emitEvent === 'function') {
            game.emitEvent('creatureUpdate', { cardUniqueId: this.uniqueId, updates: this.getRenderData() });
        }
    }

    /**
     * Decrements duration of temporary boosts and status effects.
     * Adjusts currentToughness if max toughness changes due to expiring boosts.
     * @param {Game} game - The game instance.
     * @returns {boolean} True if any effect changed (expired or duration ticked).
     */
    #tickDownEffects(game) {
        let changed = false;
        const previousCalculatedMaxToughness = this.toughness; // Max toughness ANTES de remover buffs

        // Tick down temporary boosts
        this.#tempBoosts = this.#tempBoosts.filter(b => {
            b.duration--;
            if (b.duration <= 0) {
                changed = true;
                console.log(`CreatureCard ${this.name}: Temp boost ${JSON.stringify(b.boost)} expired.`);
                // Se o boost que expirou era de toughness, e currentToughness era maior que
                // a nova toughness (sem esse boost), currentToughness precisa ser ajustada.
                // Esta lógica é movida para DEPOIS que todos os boosts foram processados.
                return false; // Remove o boost
            }
            return true; // Mantém o boost
        });

        const newCalculatedMaxToughness = this.toughness; // Max toughness DEPOIS de remover buffs

        // Se a toughness máxima calculada diminuiu (ex: buff de toughness expirou)
        // e a currentToughness atual é maior que essa nova máxima, ajuste (clamp).
        if (newCalculatedMaxToughness < previousCalculatedMaxToughness) {
            if (this.#currentToughness > newCalculatedMaxToughness) {
                const diff = this.#currentToughness - newCalculatedMaxToughness;
                this.#currentToughness = newCalculatedMaxToughness;
                changed = true; // O estado da currentToughness mudou
                console.log(`CreatureCard ${this.name}: Max toughness reduced due to expiring buff. currentToughness clamped from ${this.#currentToughness + diff} to ${this.#currentToughness}.`);
            }
        }

        // Tick down status effects
        for (const [effect, duration] of this.#statusEffects.entries()) {
            if (duration > 0) { // Apenas decrementa se não for permanente (-1)
                 const newDuration = duration - 1;
                 if (newDuration <= 0) {
                     this.#statusEffects.delete(effect);
                     changed = true;
                     console.log(`CreatureCard ${this.name}: Status effect '${effect}' expired.`);
                 }
                 else {
                     this.#statusEffects.set(effect, newDuration);
                     // Não marca 'changed = true' aqui, pois a simples mudança de duração
                     // pode não precisar de um re-render completo se a UI não mostrar durações.
                     // Mas, se o status em si for removido, 'changed' já será true.
                 }
            }
        }
        return changed;
    }


    // --- Triggered Abilities (Placeholders) ---
    onEnterBattlefield(game, player) {
        if (!game || !player) return;
        if (this.abilities.includes('ETB: Draw a card')) {
            player.drawCards(1, game);
            if (typeof game.emitEvent === 'function') {
                game.emitEvent('gameLog', { message: `${player.name} comprou uma carta com ETB de ${this.name}.` });
            }
        }
    }
    onDeath(game) {
         if (!game) return;
         if (this.abilities.includes('Deathrattle: Deal 1 damage to opponent')) {
             const opp = game.getOpponent(this.ownerId);
             if(opp) opp.takeDamage(1, this, game);
             if (typeof game.emitEvent === 'function') {
                 game.emitEvent('gameLog', { message: `${this.name} causou 1 de dano ao oponente ao morrer.` });
             }
         }
    }

    // --- Rendering ---
    getRenderData() {
        return {
            ...super.getRenderData(),
            baseAttack: this.baseAttack, baseToughness: this.baseToughness,
            attack: this.attack, toughness: this.toughness, // Estes são os getters que calculam com buffs
            currentToughness: this.currentToughness, // Este é o valor atual de vida
            tribe: this.tribe, isTapped: this.isTapped, hasSummoningSickness: this.hasSummoningSickness,
            canAttack: this.canAttack(), canBlock: this.canBlock(),
            statusEffects: Object.fromEntries(this.#statusEffects) // Envia os status para a UI
        };
    }
}