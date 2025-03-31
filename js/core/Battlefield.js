// js/core/Battlefield.js
/**
 * Represents the battlefield zone for a player.
 */
export class Battlefield { // Using export class
    #cards = new Map(); // Map<string, Card> (uniqueId -> CardInstance)

    addCard(cardInstance) {
        if (!cardInstance?.uniqueId) return false;
        if (this.#cards.has(cardInstance.uniqueId)) return false;
        this.#cards.set(cardInstance.uniqueId, cardInstance);
        return true;
    }

    removeCard(cardUniqueId) {
        const card = this.#cards.get(cardUniqueId);
        if (card) {
            this.#cards.delete(cardUniqueId);
            return card;
        }
        return null;
    }

    getCard(cardUniqueId) {
        return this.#cards.get(cardUniqueId) || null;
    }

    getAllCards() {
        return [...this.#cards.values()];
    }

    getCreatures() {
        // Assuming CreatureCard is imported if needed for instanceof
        return this.getAllCards().filter(card => card.type === 'Creature');
    }

    getSize() {
        return this.#cards.size;
    }

    untapAll() {
        this.#cards.forEach(card => {
            if (typeof card.untap === 'function') card.untap();
        });
    }

    clear() {
        this.#cards.clear();
    }
}