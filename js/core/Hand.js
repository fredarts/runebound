// js/core/Hand.js
/**
 * Represents the player's hand of cards.
 */
export class Hand { // Using export class
    #cards = new Map(); // Map<string, Card> (uniqueId -> CardInstance)
    #maxSize = 7; // As per GDD End Phase rule

    constructor(maxSize = 7) {
        this.#cards = new Map();
        this.#maxSize = maxSize;
    }

    addCard(cardInstance) {
        if (!cardInstance?.uniqueId) return false;
        if (this.#cards.has(cardInstance.uniqueId)) return false; // Avoid duplicates
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

    getCards() {
        return [...this.#cards.values()];
    }

    getSize() {
        return this.#cards.size;
    }

    getMaxSize() {
        return this.#maxSize;
    }

    isOverLimit() {
        return this.getSize() > this.#maxSize;
    }

    clear() {
        this.#cards.clear();
    }
}