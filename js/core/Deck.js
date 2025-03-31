// js/core/Deck.js
import Card from './Card.js'; // Default import
import CreatureCard from './CreatureCard.js'; // Default import
import { RunebindingCard } from './RunebindingCard.js'; // Named import
import { InstantCard } from './InstantCard.js'; // Named import
import { shuffleArray } from '../utils.js';

/**
 * Represents a player's deck of cards.
 */
export class Deck { // Using export class
    #cards = [];
    #ownerId;

    constructor(deckCardIds, cardDatabase, ownerId) {
        this.#cards = [];
        this.#ownerId = ownerId;
        if (!Array.isArray(deckCardIds) || !cardDatabase || !ownerId) throw new Error("Deck constructor requires deckCardIds, cardDatabase, and ownerId.");

        console.log(`Deck: Initializing for owner ${ownerId} with ${deckCardIds.length} IDs.`);
        deckCardIds.forEach(cardId => {
            const cardDefinition = cardDatabase[cardId];
            if (cardDefinition) {
                let cardInstance = null;
                try { // Add try-catch for safer instantiation
                    switch (cardDefinition.type) {
                        case 'Creature': cardInstance = new CreatureCard(cardDefinition, this.#ownerId); break;
                        case 'Runebinding': cardInstance = new RunebindingCard(cardDefinition, this.#ownerId); break;
                        case 'Instant': cardInstance = new InstantCard(cardDefinition, this.#ownerId); break;
                        default: console.warn(`Deck: Unknown type "${cardDefinition.type}" for ${cardId}. Using base Card.`); cardInstance = new Card(cardDefinition, this.#ownerId); break;
                    }
                    if (cardInstance) { cardInstance.location = 'deck'; this.#cards.push(cardInstance); }
                } catch (error) {
                     console.error(`Deck: Failed to instantiate card ${cardId} (${cardDefinition.name}):`, error);
                }
            } else { console.warn(`Deck: Card ID "${cardId}" not found in DB.`); }
        });
        console.log(`Deck: Created ${this.#cards.length} instances for ${ownerId}.`);
    }

    shuffle() { shuffleArray(this.#cards); console.log(`Deck (${this.#ownerId}): Shuffled.`); }
    draw() { if (this.isEmpty()) return null; return this.#cards.pop(); }
    addCard(cardInstance, toBottom = false) { if (!cardInstance?.uniqueId) return; cardInstance.location = 'deck'; if (toBottom) this.#cards.unshift(cardInstance); else this.#cards.push(cardInstance); }
    getSize() { return this.#cards.length; }
    isEmpty() { return this.#cards.length === 0; }
    clear() { this.#cards = []; }
    getCardsForDebug() { return [...this.#cards]; }
}