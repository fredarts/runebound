// js/core/Card.js
import { generateUniqueId } from '../utils.js';

export default class Card { // Using export default
    #id;
    #uniqueId;
    #name;
    #type;
    #cost;
    #imageSrc;
    #description;
    #ownerId;
    location = 'deck'; // deck, hand, battlefield, graveyard

    constructor(cardDefinition, ownerId) {
        if (!cardDefinition || !cardDefinition.id) throw new Error("Invalid card definition provided to Card constructor.");
        this.#id = cardDefinition.id;
        this.#uniqueId = generateUniqueId(`card_${cardDefinition.id}`); // Prefix with card type/id
        this.#name = cardDefinition.name;
        this.#type = cardDefinition.type;
        this.#cost = cardDefinition.cost;
        this.#imageSrc = cardDefinition.image_src || 'assets/images/cards/default.png';
        this.#description = cardDefinition.description || '';
        this.#ownerId = ownerId;
        this.location = 'deck';
    }

    // --- Getters ---
    get id() { return this.#id; }
    get uniqueId() { return this.#uniqueId; }
    get name() { return this.#name; }
    get type() { return this.#type; }
    get cost() { return this.#cost; }
    get imageSrc() { return this.#imageSrc; }
    get description() { return this.#description; }
    get ownerId() { return this.#ownerId; }

    // --- Basic Methods (to be overridden) ---

    canPlay(player, game) {
        if (!player || !game || !game.getCurrentPlayer) return false; // Basic safety
        const currentPlayer = game.getCurrentPlayer();
        if (!currentPlayer || player.id !== currentPlayer.id) return false; // Not player's turn
        if (player.mana < this.cost) return false; // Not enough mana
        if (this.location !== 'hand') return false; // Must be in hand
        // Add phase checks in subclasses (Instants vs others)
        return true;
    }

    /** Base play method - subclasses must implement actual logic */
    play(player, game, targetId = null) {
        // Basic checks are done before calling this usually by Player.playCard
        // This method *in the base class* just confirms mana cost is paid
        // Subclasses will handle moving the card and applying effects.
        console.log(`Card: Base play method called for ${this.name}. Mana should be spent by caller.`);
        // game.emitEvent('cardPlayed', { card: this.getRenderData(), player: player.getRenderData(), targetId }); // Emit basic event
        return true; // Return true indicating the 'play' sequence started
    }

     /** Placeholder: Does this card require a target? Subclasses override. */
     requiresTarget() {
        return false;
     }

     /** Placeholder: What kind of target? Subclasses override. */
     targetType() {
        return null;
     }

    // --- Rendering ---
    getRenderData() {
        return {
            uniqueId: this.uniqueId, id: this.id, name: this.name,
            cost: this.cost, type: this.type, imageSrc: this.imageSrc,
            description: this.description, location: this.location, ownerId: this.ownerId
        };
    }
}