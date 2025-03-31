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
    #hasDiscardedForMana = false;
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
    get hasDiscardedForMana() { return this.#hasDiscardedForMana; }


    // --- Methods Called by Game ---
    shuffleDeck() { this.#deck.shuffle(); }
    drawCard() { const c = this.#deck.draw(); if(c) { this.#hand.addCard(c); } return c; }
    drawCards(count, game) { let d=[]; for(let i=0;i<count;i++){const c=game?._drawCard(this); if(c)d.push(c); else break;} return d; } // Game handles events
    prepareForTurn() { this.isActivePlayer = true; this.#mana = this.#maxMana; this.#battlefield.untapAll(); this.#hasDiscardedForMana = false; console.log(`Player ${this.#name}: Prepared. Mana: ${this.#mana}/${this.#maxMana}.`); }
    endTurnCleanup(game) { this.isActivePlayer = false; this.#battlefield.getAllCards().forEach(c => { if (typeof c.tickDown === 'function') c.tickDown(game); if (typeof c.endTurnCleanup === 'function') c.endTurnCleanup(true); }); console.log(`Player ${this.#name}: End cleanup.`); this.checkHandSize(game); }
    moveCardBetweenZones(cardUniqueId, fromZone, toZone) { let c=null, o=this.#getZoneObject(fromZone), d=this.#getZoneObject(toZone); if(!o||!d) return null; c=o.removeCard(cardUniqueId); if(c){d.addCard(c); c.location=toZone; return c;} return null; }
    #getZoneObject(zoneName) { switch(zoneName?.toLowerCase()){ case 'deck': return this.#deck; case 'hand': return this.#hand; case 'battlefield': return this.#battlefield; case 'graveyard': return this.#graveyard; default: console.error(`Player ${this.#name}: Invalid zone: ${zoneName}`); return null; } }

    // --- Player Actions ---
    playCard(cardUniqueId, targetId = null, game) {
        if (!game) { console.error("Player.playCard needs game!"); return false; }
        const card = this.#hand.getCard(cardUniqueId);
        if (!card) { console.warn(`${this.name}: Card ${cardUniqueId} not in hand.`); return false; }

        // Use the card's specific canPlay method
        if (!card.canPlay(this, game)) {
             console.log(`Player ${this.name}: Cannot play ${card.name} now.`);
             game.emitEvent('gameLog', { message: `Não pode jogar ${card.name} agora.` });
             return false;
        }
        // TODO: Validate targetId if provided, BEFORE spending mana
        // if(targetId && card.requiresTarget() && !game.isValidTarget(targetId, card.targetType(), this)) {
        //      game.emitEvent('gameLog', { message: `Alvo inválido para ${card.name}.` });
        //      return false;
        // }


        // Spend Mana FIRST
        if (!this.spendMana(card.cost)) { console.error(`${this.name}: Mana spend failed?`); return false; } // Should not fail if canPlay passed
        game.emitEvent('playerStatsChanged', { playerId: this.id, updates: { mana: this.mana }}); // Notify UI mana changed


        // --- Let the CARD instance handle its play logic ---
        // The card's play method should call game.moveCardToZone and apply effects
        const playSuccess = card.play(this, game, targetId);

        if (!playSuccess) {
            // If card.play itself failed AFTER mana was spent (e.g., target invalid at resolution)
            console.warn(`Player ${this.name}: Card ${card.name}'s play method reported failure.`);
            // Card should have moved itself to graveyard in its play() method on failure.
        } else {
             // Emit base cardPlayed event from Player/Game AFTER card.play tries to resolve
             // Card.play can emit more specific events (e.g., 'creatureEntered', 'spellResolved')
             game.emitEvent('cardPlayed', { player: this.getRenderData(), card: card.getRenderData(), targetId });
        }

        return playSuccess;
    }

    discardCardForMana(cardUniqueId, game) {
        if (!game) { console.error("Player.discardCardForMana needs game!"); return false; }
        if (this.#hasDiscardedForMana) { game.emitEvent('gameLog', { message: `Já descartou por mana.` }); return false; }
        if (this.#maxMana >= 10) { game.emitEvent('gameLog', { message: `Mana máxima (10) atingida.` }); return false; }
        const card = this.#hand.getCard(cardUniqueId); if(!card) return false; // Get name before move
        const moved = game.moveCardToZone(cardUniqueId, this.id, 'hand', 'graveyard'); // Game handles event
        if (moved) { this.#maxMana++; this.#mana++; this.#hasDiscardedForMana = true; game.emitEvent('playerStatsChanged', { playerId: this.id, updates: { mana: this.mana, maxMana: this.maxMana }}); console.log(`${this.name} discarded ${card.name}. Mana: ${this.#mana}/${this.#maxMana}.`); return true; }
        return false;
    }
    checkHandSize(game) { // Called during end phase cleanup
        const excess = this.#hand.getSize() - this.#hand.getMaxSize();
        if (excess > 0) {
             console.log(`Player ${this.name}: Must discard ${excess} cards.`);
             game.requestPlayerDiscard(this.id, excess); // Game changes state and emits event
        }
    }

    spendMana(amount) { if(amount<0)return false; if(amount<=this.#mana){this.#mana-=amount; return true;} return false; }
    gainLife(amount, game) { if(amount<=0)return; this.#life+=amount; game?.emitEvent('playerStatsChanged', { playerId: this.id, updates: { life: this.#life }}); game?.emitEvent('gameLog', { message: `${this.name} ganhou ${amount} vida.` }); }
    takeDamage(amount, source, game) { if(amount<=0)return; this.#life-=amount; game?.emitEvent('playerStatsChanged', { playerId: this.id, updates: { life: this.#life }}); game?.emitEvent('gameLog', { message: `${this.name} levou ${amount} dano.` }); if(this.#life<=0){ game?.gameOver(game.getOpponent(this.id)); } }
    resetStats() { this.#life=20; this.#mana=0; this.#maxMana=0; this.#hasDiscardedForMana=false; this.isActivePlayer=false; }

    // --- Combat Related Helpers ---
    canDeclareAttackers() { return this.battlefield.getCreatures().some(c => c.canAttack()); }
    canDeclareBlockers(attacker) { return this.battlefield.getCreatures().some(c => c.canBlock()); } // Basic check

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
        };
     }
}