// js/core/Player.js
import { Deck } from './Deck.js'; // Named import
import { Hand } from './Hand.js'; // Named import
import { Battlefield } from './Battlefield.js'; // Named import
import { Graveyard } from './Graveyard.js'; // Named import
import { generateUniqueId } from '../utils.js'; // Named import
// Card base/subclasses might be needed for instanceof checks later
import Card from './Card.js';
import CreatureCard from './CreatureCard.js';
import { RunebindingCard } from './RunebindingCard.js';
import { InstantCard } from './InstantCard.js';


export default class Player { // Using export default
    #id;
    #name;
    #life = 20;
    #mana = 0;
    #maxMana = 0;
    #deck;
    #hand;
    #battlefield;
    #graveyard;
    #hasDiscardedForMana = false; // Flag to track if mana discard was used this turn
    isActivePlayer = false; // Track if it's currently this player's turn (managed by Game)

    constructor(name, deckCardIds, cardDatabase) {
        this.#id = generateUniqueId('player');
        this.#name = name;
        // Instantiate zones with error handling
        try { this.#deck = new Deck(deckCardIds, cardDatabase, this.#id); } catch (e) { throw new Error(`Player ${name} deck init failed: ${e.message}`); }
        this.#hand = new Hand();
        this.#battlefield = new Battlefield();
        this.#graveyard = new Graveyard();
        this.resetStats();
        console.log(`Player: ${this.#name} (ID: ${this.#id}) created.`);
    }

    // --- Getters ---
    get id() { return this.#id; }
    get name() { return this.#name; }
    get life() { return this.#life; }
    get mana() { return this.#mana; }
    get maxMana() { return this.#maxMana; }
    get deck() { return this.#deck; }
    get hand() { return this.#hand; }
    get battlefield() { return this.#battlefield; }
    get graveyard() { return this.#graveyard; }
    get hasDiscardedForMana() { return this.#hasDiscardedForMana; } // Allow checking the flag


    // --- Methods Called by Game ---
    shuffleDeck() { this.#deck.shuffle(); }
    drawCard() { const c = this.#deck.draw(); if(c) { this.#hand.addCard(c); c.location = 'hand'; } return c; } // Set location on draw
    drawCards(count, game) { let d=[]; for(let i=0;i<count;i++){const c=game?._drawCard(this); if(c)d.push(c); else break;} return d; } // Game handles events

    /** Prepares the player for the start of their turn. */
    prepareForTurn() {
        this.isActivePlayer = true;
        this.#hasDiscardedForMana = false; // <<<--- RESET the flag here at the START of the turn
        this.#mana = this.#maxMana; // Refill current mana based on max mana
        this.#battlefield.untapAll(); // Untap creatures
        // Apply start-of-turn effects from battlefield cards (if any)
        this.#battlefield.getAllCards().forEach(card => {
             if (typeof card.onTurnStart === 'function') card.onTurnStart(game);
        });
        console.log(`Player ${this.#name}: Prepared for turn. Mana: ${this.#mana}/${this.#maxMana}. Discard flag reset.`);
    }

    /** Cleans up effects and checks hand size at the end of the turn. */
    endTurnCleanup(game) {
        this.isActivePlayer = false;
        // Tick down temporary effects on battlefield cards
        this.#battlefield.getAllCards().forEach(c => {
             if (typeof c.tickDown === 'function') c.tickDown(game); // For Runebindings, etc.
             if (typeof c.endTurnCleanup === 'function') c.endTurnCleanup(true); // For Creatures (summoning sickness)
        });
        console.log(`Player ${this.#name}: End of turn cleanup completed.`);
        this.checkHandSize(game); // Check hand size limit AFTER cleanup
    }

    /** Moves a card between zones and updates its location property. Returns the card if successful, null otherwise. */
    moveCardBetweenZones(cardUniqueId, fromZoneName, toZoneName) {
        const fromZone = this.#getZoneObject(fromZoneName);
        const toZone = this.#getZoneObject(toZoneName);
        if (!fromZone || !toZone) {
            console.error(`Player ${this.#name}: Invalid zone(s) in moveCardBetweenZones (${fromZoneName} -> ${toZoneName})`);
            return null;
        }
        const card = fromZone.removeCard(cardUniqueId);
        if (card) {
            if (toZone.addCard(card)) { // Ensure the destination zone successfully adds the card
                 card.location = toZoneName.toLowerCase(); // Update the card's internal location tracker
                 // Reset creature state when moving off battlefield
                 if (fromZoneName === 'battlefield' && card instanceof CreatureCard) {
                    card.resetCombatState?.(); // Add a reset method if needed
                 }
                 return card;
            } else {
                 console.error(`Player ${this.#name}: Failed to add card ${cardUniqueId} to zone ${toZoneName}. Reverting.`);
                 fromZone.addCard(card); // Attempt to put it back
                 return null;
            }
        }
        console.warn(`Player ${this.#name}: Card ${cardUniqueId} not found in zone ${fromZoneName}.`);
        return null;
    }

    /** Gets the zone object based on its name. */
    #getZoneObject(zoneName) {
        switch(zoneName?.toLowerCase()) {
            case 'deck': return this.#deck;
            case 'hand': return this.#hand;
            case 'battlefield': return this.#battlefield;
            case 'graveyard': return this.#graveyard;
            default: console.error(`Player ${this.#name}: Invalid zone name requested: ${zoneName}`); return null;
        }
    }

    /** Checks hand size at end of turn and requests discard if needed. */
    checkHandSize(game) {
        if (this.#hand.isOverLimit()) {
            const discardCount = this.#hand.getSize() - this.#hand.getMaxSize();
            console.log(`Player ${this.#name}: Hand size over limit (${this.#hand.getSize()}/${this.#hand.getMaxSize()}). Requesting discard of ${discardCount}.`);
            game.requestPlayerDiscard(this.id, discardCount);
        }
    }

    // --- Player Actions ---

    /** Attempts to play a card from hand. */
    playCard(cardUniqueId, targetId = null, game) {
        if (!game) { console.error("Player.playCard needs game instance!"); return false; }
        const card = this.#hand.getCard(cardUniqueId);
        if (!card) { console.warn(`${this.name}: Card ${cardUniqueId} not in hand.`); return false; }

        // Use the card's specific canPlay method first (checks cost, phase, etc.)
        if (!card.canPlay(this, game)) {
             console.log(`Player ${this.name}: Cannot play ${card.name} now (checked by card.canPlay).`);
             game.emitEvent('gameLog', { message: `Não pode jogar ${card.name} agora.` });
             return false;
        }

        // Validate target if required BEFORE spending mana
        if (card.requiresTarget()) {
            if (!targetId) {
                 console.warn(`Player ${this.name}: Card ${card.name} requires a target, but none provided.`);
                 game.emitEvent('gameLog', { message: `A carta ${card.name} requer um alvo.` });
                 return false;
            }
            const target = game.findCardInstance(targetId); // Or getPlayer if targetType is player
            if (!target /* || !isValidTargetType(target, card.targetType()) */) { // Add target type validation if needed
                 console.warn(`Player ${this.name}: Invalid or missing target (${targetId}) for ${card.name}.`);
                 game.emitEvent('gameLog', { message: `Alvo inválido para ${card.name}.` });
                 return false;
            }
            // TODO: Implement more robust isValidTargetType check in Game or Player
        }


        // Spend Mana FIRST
        if (!this.spendMana(card.cost)) {
             console.error(`${this.name}: Mana spend failed unexpectedly after canPlay check.`);
             // This case should ideally not happen if canPlay works correctly.
             return false;
        }
        game.emitEvent('playerStatsChanged', { playerId: this.id, updates: { mana: this.mana }}); // Notify UI mana changed


        // --- Let the CARD instance handle its play logic ---
        // The card's play method should call game.moveCardToZone and apply effects
        const playSuccess = card.play(this, game, targetId);

        if (playSuccess) {
             // Emit base cardPlayed event from Game AFTER card.play resolves successfully
             // Card.play can emit more specific events (e.g., 'creatureEntered', 'spellResolved')
             game.emitEvent('cardPlayed', { player: this.getRenderData(), card: card.getRenderData(), targetId });
        } else {
            // If card.play itself failed AFTER mana was spent (e.g., target invalid at resolution)
            console.warn(`Player ${this.name}: Card ${card.name}'s play method reported failure.`);
            // Card's play() method should handle moving to graveyard on failure if necessary.
        }

        return playSuccess;
    }

    /**
     * Discards a card from hand to gain +1 Max Mana (up to 10).
     * Can only be done once per turn.
     * @param {string} cardUniqueId - The unique ID of the card to discard.
     * @param {Game} game - The main game instance.
     * @returns {boolean} True if the discard was successful, false otherwise.
     */
    discardCardForMana(cardUniqueId, game) {
        console.log(`Player ${this.name}: Attempting discardCardForMana for ${cardUniqueId}`);
        if (!game) {
            console.error("Player.discardCardForMana needs game instance!");
            return false;
        }

        // --- Validation Checks ---
        if (this.#hasDiscardedForMana) {
            console.log(`Discard failed - already discarded this turn.`);
            game.emitEvent('gameLog', { message: `Você já descartou por mana neste turno.`, type: 'error' });
            return false;
        }
        if (this.#maxMana >= 10) {
            console.log(`Discard failed - max mana (10) reached.`);
            game.emitEvent('gameLog', { message: `Mana máxima (10) já atingida.`, type: 'feedback' });
            return false;
        }
        const card = this.#hand.getCard(cardUniqueId);
        if (!card) {
             console.warn(`Discard failed - card ${cardUniqueId} not in hand.`);
             // Don't emit log here, UI handles "select a card" feedback
             return false;
        }
        // Optional: Check if it's the player's turn (Game/UI usually enforces this)
        if (!this.isActivePlayer) {
             console.warn(`Discard failed - not ${this.name}'s turn.`);
             game.emitEvent('gameLog', { message: `Não é seu turno para descartar por mana.`, type: 'error' });
             return false;
        }

        console.log(`Attempting to move card ${card.name} (${cardUniqueId}) from hand to graveyard.`);
        // Game's moveCardToZone handles the actual move and emits 'cardMoved'
        const moved = game.moveCardToZone(cardUniqueId, this.id, 'hand', 'graveyard');

        if (moved) {
            // --- Update Player State ---
            this.#maxMana++;
            // Mana only refills at turn start. Do NOT update current mana here.
            this.#hasDiscardedForMana = true; // Set the flag AFTER successful discard

            const logMsg = `${this.name} descartou ${card.name} para ganhar +1 Mana Máx.`;
            console.log(`Discard SUCCESSFUL. ${logMsg} Max Mana now: ${this.#maxMana}.`);

            // --- Emit Events ---
            game.emitEvent('gameLog', { message: logMsg, type: 'action' });
            // Emit stats change AFTER updating maxMana
            // IMPORTANT: Only emit the change for maxMana.
            game.emitEvent('playerStatsChanged', { playerId: this.id, updates: { maxMana: this.#maxMana } });

            return true; // Indicate success
        } else {
            console.error(`Discard FAILED - game.moveCardToZone returned false for ${cardUniqueId}.`);
            game.emitEvent('gameLog', { message: `Erro ao mover ${card.name} para o cemitério.`, type: 'error' });
            return false; // Indicate failure
        }
    }

    /** Spends mana if available. Returns true if successful, false otherwise. */
    spendMana(amount) {
        if (amount < 0) return false;
        if (amount <= this.#mana) {
            this.#mana -= amount;
            console.log(`Player ${this.#name}: Spent ${amount} mana. Remaining: ${this.#mana}`);
            return true;
        }
        console.log(`Player ${this.#name}: Not enough mana to spend ${amount}. Have: ${this.#mana}`);
        return false;
    }

    /** Increases player's life total. */
    gainLife(amount, game) {
        if (amount <= 0) return;
        this.#life += amount;
        console.log(`Player ${this.#name}: Gained ${amount} life. Total: ${this.#life}`);
        game?.emitEvent('playerStatsChanged', { playerId: this.id, updates: { life: this.#life }});
        game?.emitEvent('gameLog', { message: `${this.name} ganhou ${amount} vida.` });
    }

    /** Decreases player's life total. Checks for game over. */
    takeDamage(amount, source, game) {
        if (amount <= 0) return;
        this.#life -= amount;
        console.log(`DEBUG_PLAYER_TAKE_DAMAGE: ${this.#name} took ${amount}. New life: ${this.#life}. Player ID: ${this.id}`);
        game?.emitEvent('playerStatsChanged', { playerId: this.id, updates: { life: this.#life }});
        game?.emitEvent('gameLog', { message: `${this.name} levou ${amount} dano.` });
        if (this.#life <= 0) {
            console.log(`Player ${this.#name} has been defeated.`);
            game?.gameOver(game.getOpponent(this.id));
        }
    }

    /** Resets player stats to initial values (e.g., for game start). */
    resetStats() {
        this.#life = 20;
        this.#mana = 0;
        this.#maxMana = 0; // Start with 0 max mana
        this.#hasDiscardedForMana = false;
        this.isActivePlayer = false;
        console.log(`Player ${this.#name}: Stats reset.`);
    }

    // --- Combat Related Helpers ---
    canDeclareAttackers() { return this.battlefield.getCreatures().some(c => c.canAttack()); }
    canDeclareBlockers(attacker) {
        // Add specific logic if needed (e.g., checking for flying)
        return this.battlefield.getCreatures().some(c => c.canBlock());
    }

     // --- Rendering Helper ---
     getRenderData() {
        // Provides a safe snapshot for UI/Events, excluding sensitive info or complex objects
        return {
            id: this.id,
            name: this.name,
            life: this.life,
            mana: this.mana,
            maxMana: this.maxMana,
            handSize: this.hand.getSize(),
            deckSize: this.deck.getSize(),
            graveyardSize: this.graveyard.getSize()
            // Note: hasDiscardedForMana is internal state, UI usually infers from button state
        };
     }
}