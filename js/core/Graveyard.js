// js/core/Graveyard.js
/**
 * Represents the player's graveyard (discard pile).
 * Stores cards in an array, maintaining order might be relevant.
 */
export class Graveyard { // Using export class
    #cards = []; // Array<Card> - Order might matter

    addCard(cardInstance) {
        if (!cardInstance?.uniqueId) return false;
        // Optional: Check if already in graveyard? Unlikely needed.
        this.#cards.push(cardInstance);
        return true;
    }

    // Remove is less common, but could be needed for "return from graveyard" effects
    removeCard(cardUniqueId) {
        const index = this.#cards.findIndex(card => card.uniqueId === cardUniqueId);
        if (index !== -1) {
            const [removedCard] = this.#cards.splice(index, 1);
            return removedCard;
        }
        return null;
    }

    getCard(cardUniqueId) {
        return this.#cards.find(card => card.uniqueId === cardUniqueId) || null;
    }

    getCards() {
        return [...this.#cards]; // Return copy
    }

    getSize() {
        return this.#cards.length;
    }

    clear() {
        this.#cards = [];
    }
}