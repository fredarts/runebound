// js/core/Game.js
import Player from './Player.js';
import TurnManager from './TurnManager.js';
import CombatManager from './CombatManager.js';
// Import Card classes if needed for instanceof checks or specific game logic
import Card from './Card.js';
import CreatureCard from './CreatureCard.js';
import { RunebindingCard } from './RunebindingCard.js';
import { InstantCard } from './InstantCard.js';


export default class Game {
    #players = [];
    #currentPlayerIndex = -1;
    #turnManager;
    #combatManager;
    #state = 'setup'; // 'setup', 'starting', 'playing', 'discarding', 'game_over'
    #eventDispatcher;
    #cardDatabase;
    #pendingDiscard = null; // { playerId, count }

    constructor(cardDatabase) {
        if (!cardDatabase || Object.keys(cardDatabase).length === 0) { // Check if DB is valid
            throw new Error("Game requires a valid, non-empty cardDatabase.");
        }
        this.#players = [];
        this.#turnManager = new TurnManager();
        this.#combatManager = new CombatManager(this);
        this.#state = 'setup';
        this.#eventDispatcher = new EventTarget();
        this.#cardDatabase = cardDatabase;
        console.log("Game: Instance created with CombatManager.");
    }

    // --- Player Management (Added validation in addPlayer) ---

    /**
     * Adds a player to the game. Validates deck IDs.
     * @param {string} name Nome do jogador.
     * @param {string[]} deckCardIds Array de IDs das cartas no deck.
     * @returns {Player | null} The Player instance or null if adding failed.
     */
    addPlayer(name, deckCardIds) {
        if (this.#players.length >= 2) {
            console.error("Game Error: Cannot add more than 2 players.");
            return null;
        }
        if (!this.#cardDatabase) { // Should have been caught in constructor, but safety check
             console.error("Game Error: CardDatabase missing.");
             return null;
        }
        // --- FIX: Validate deckCardIds ---
        if (!Array.isArray(deckCardIds) || deckCardIds.length < 30 || deckCardIds.length > 40) {
             console.error(`Game Error: Invalid deckCardIds for player ${name}. Length: ${deckCardIds?.length}. Must be array [30-40].`);
             this.emitEvent('gameLog', { message: `Erro: Deck inválido para ${name}.` }); // Inform UI potentially
             return null; // Return null if deck IDs are invalid
        }
        // --- End Fix ---

        try {
            // Player constructor might throw if Deck fails (e.g., card ID not in DB)
            const player = new Player(name, deckCardIds, this.#cardDatabase);
            this.#players.push(player);
            console.log(`Game: Player ${name} (ID: ${player.id}) added with deck size ${deckCardIds.length}.`);
            return player;
        } catch (error) {
             console.error(`Game Error: Error creating Player '${name}':`, error);
             // Optionally emit a more specific error event
             return null; // Return null if Player/Deck constructor fails
        }
    }

    getPlayer(playerId) { return this.#players.find(p => p.id === playerId); }
    getOpponent(playerId) { return this.#players.find(p => p.id !== playerId); }
    getCurrentPlayer() { return this.#players[this.#currentPlayerIndex]; }
    /** Finds a card instance by its unique ID across all players and zones */
    findCardInstance(cardUniqueId) { /* ... (previous code) ... */ }
    /** Getter for Combat Manager */
    getCombatManager() { return this.#combatManager; } // <<< Added Getter


    // --- Game Flow ---
    setupGame() {
        if (this.#players.length !== 2) { console.error("Game: Need 2 players to setup."); return false; }
        this.#state = 'starting'; console.log("Game: Setting up...");
        this.#players.forEach(player => { player.resetStats(); player.shuffleDeck(); });
        this.#currentPlayerIndex = Math.floor(Math.random() * 2);
        console.log(`Game: ${this.getCurrentPlayer()?.name} will start.`);
        return true;
    }
    startGame() {
        if (this.#state !== 'starting') { console.error("Game: Not ready to start."); return; }
        if (!this.getCurrentPlayer()) { console.error("Game: Starting player not set."); return; }
        console.log("Game: Starting match!"); this.#state = 'playing';
        const initialHandSize = 5;
        this.#players.forEach(player => { for (let i = 0; i < initialHandSize; i++) this._drawCard(player); });
        this._startTurn(this.getCurrentPlayer()); // Start the first turn
        this.emitEvent('gameStarted', { startingPlayerId: this.getCurrentPlayer().id });
    }

    passPhase() {
        if (!['playing', 'discarding'].includes(this.#state)) { console.warn(`Game: Can't pass phase in state ${this.#state}`); return; }
        // Allow passing phase even if discarding to let the turn proceed if player is stuck? Or force discard first?
        // Let's assume discard must be resolved first.
        if (this.#state === 'discarding') {
             this.emitEvent('gameLog', { message: `Você precisa descartar ${this.#pendingDiscard.count} carta(s) primeiro.` });
             return;
        }

        const player = this.getCurrentPlayer(); if (!player) return;
        const oldPhase = this.getCurrentPhase();

        // Resolve combat if passing priority during specific combat substates
        if (oldPhase === 'attack') {
            if (this.#combatManager.state === 'declare_blockers') {
                 console.log("Game: Defending player passed blocker declaration. Resolving combat.");
                 this.#combatManager.resolveCombat(); // Resolve with no blockers
            } else if (this.#combatManager.state === 'declare_attackers') {
                 console.log("Game: Attacking player passed after declaring. Waiting for blockers.");
                 // Don't resolve yet, just let phase logic proceed (which should be handled by UI/opponent action)
            }
        }

        const { newPhase, turnEnded } = this.#turnManager.nextPhase();
        this.emitEvent('phaseChange', { playerId: player.id, oldPhase: oldPhase, newPhase: newPhase });
        if (turnEnded) { this.nextTurn(); }
        else { this._onPhaseEnter(newPhase, player); }
    }

    _onPhaseEnter(phase, player) {
        console.log(`Game: Entering ${phase} phase for ${player.name}.`);
        // Only reset combat state at the VERY START of the attack phase
        if (phase === 'attack') { this.#combatManager.reset(); this.emitEvent('attackPhaseStart', { playerId: player.id }); }
        else if (phase === 'end') { player.endTurnCleanup(this); } // Cleanup & Hand size check happens here
        else if (phase === 'draw') { this._drawCard(player); }
        // Set state to 'playing' unless a specific state like 'discarding' was triggered
        if (this.#state !== 'discarding') this.#state = 'playing';
    }

    endTurn() {
        if (this.#state !== 'playing') { console.warn(`Game: Can't end turn in state ${this.#state}`); return; }
        const player = this.getCurrentPlayer(); if (!player) return;
        console.log(`Game: ${player.name} ending turn from phase ${this.getCurrentPhase()}.`);
        let safety = 0;
        while(this.#state === 'playing' && safety < 10) { // Only loop if playing
             const currentPhase = this.getCurrentPhase();
             // If in attack phase, ensure combat resolves before proceeding fully
             if (currentPhase === 'attack' && this.#combatManager.state !== 'none') {
                 if (this.#combatManager.state === 'declare_blockers') { this.#combatManager.resolveCombat(); } // Assume no blocks if ending turn here
                 else if (this.#combatManager.state === 'resolving') { /* let it finish if already resolving */ }
                 else { this.#combatManager.reset(); } // Reset if only attackers declared
             }

             const { newPhase, turnEnded } = this.#turnManager.nextPhase();
             this.emitEvent('phaseChange', { playerId: player.id, oldPhase: currentPhase, newPhase: newPhase });
             if (newPhase === 'end') { player.endTurnCleanup(this); if(this.#state === 'discarding') break; } // Stop loop if discard starts
             if (turnEnded) { this.nextTurn(); break; }
             safety++;
        }
         if(safety >= 10) console.error("Game: Potential infinite loop in endTurn!");
         // If loop ended due to 'discarding' state, don't proceed to next turn yet
         if (this.#state === 'discarding') { console.log("Game: Turn end paused for discarding."); }
    }

    nextTurn() {
        if (!['playing', 'discarding'].includes(this.#state)) { console.warn("Game: Cannot start next turn in state", this.#state); return; }
        this.#combatManager.reset(); // Ensure combat is reset
        const previousPlayer = this.getCurrentPlayer();
        this.#currentPlayerIndex = (this.#currentPlayerIndex + 1) % this.#players.length;
        const newPlayer = this.getCurrentPlayer();
        console.log(`Game: Starting Turn ${this.#turnManager.turnNumber + 1} for ${newPlayer.name}.`);
        this.emitEvent('turnChange', { previousPlayerId: previousPlayer?.id, currentPlayerId: newPlayer.id, playerName: newPlayer.name, turnNumber: this.#turnManager.turnNumber + 1 });
        this._startTurn(newPlayer); // Sets state back to playing
    }

    _startTurn(player) {
        if (!player) return;
        this.#state = 'playing'; this.#pendingDiscard = null; // Reset state/discard
        const startingPhase = this.#turnManager.startNewTurn();
        player.prepareForTurn();
        this.emitEvent('playerStatsChanged', { playerId: player.id, updates: { mana: player.mana, maxMana: player.maxMana } });
        player.battlefield.getAllCards().forEach(c => { // Emit untap events
            if (c.type === 'Creature' && !c.isTapped) this.emitEvent('creatureUpdate', { cardUniqueId: c.uniqueId, updates: { isTapped: false } });
        });
        console.log(`Game: Turn ${this.#turnManager.turnNumber} started for ${player.name}.`);
        this._onPhaseEnter(startingPhase, player);
    }

    _drawCard(player) { if(!player||this.#state!=='playing')return null; const c=player.drawCard(); if(c){this.emitEvent('cardDrawn',{playerId:player.id,card:c.getRenderData()});return c;}else{console.log(`Game:${player.name} deck empty!`);this.emitEvent('deckEmpty',{playerId:player.id});this.gameOver(this.getOpponent(player.id));return null;} }
    moveCardToZone(cardUniqueId, playerId, fromZone, toZone) { const p=this.getPlayer(playerId); if(!p){console.error(`Game:P${playerId} not found`);return false;} const c=p.moveCardBetweenZones(cardUniqueId,fromZone,toZone); if(c){this.emitEvent('cardMoved',{cardUniqueId,cardData:c.getRenderData(),fromZone,toZone,ownerId:playerId}); return true;} return false; }
    requestPlayerDiscard(playerId, count) { if(this.#state==='playing'){this.#state='discarding'; this.#pendingDiscard={playerId,count}; console.log(`Game: State->discarding for ${playerId}, count ${count}`); this.emitEvent('discardRequired',{playerId,count}); this.emitEvent('gameLog',{message:`${this.getPlayer(playerId)?.name} precisa descartar ${count} carta(s).`});} }
    resolvePlayerDiscard(playerId, cardUniqueId) { if(this.#state!=='discarding'||!this.#pendingDiscard||this.#pendingDiscard.playerId!==playerId){console.warn(`Game: Invalid resolve discard`);return false;} const p=this.getPlayer(playerId); const c=p?.hand.getCard(cardUniqueId); if(!c){console.warn(`Game: Card ${cardUniqueId} not in hand`);return false;} const m=this.moveCardToZone(cardUniqueId,playerId,'hand','graveyard'); if(m){this.#pendingDiscard.count--; this.emitEvent('gameLog',{message:`${p.name} descartou ${c.name}.`}); if(this.#pendingDiscard.count<=0){console.log(`Game: Discard req met for ${playerId}.`); this.#pendingDiscard=null; this.#state='playing'; this.nextTurn();} else {this.emitEvent('discardRequired',{playerId,count:this.#pendingDiscard.count});}} return m; }

    // --- Combat Actions ---
    confirmAttackDeclaration(playerId, attackerIds) {
        const p=this.getPlayer(playerId); if(!p||this.#state!=='playing'||this.getCurrentPhase()!=='attack'||this.getCurrentPlayer()?.id!==playerId){this.emitEvent('gameLog',{message:"Não pode declarar ataque agora."}); return;}
        const success = this.#combatManager.declareAttackers(p, attackerIds);
        if(this.#combatManager.state==='declare_blockers'){this.emitEvent('gameLog',{message:`${this.getOpponent(playerId)?.name}, declare bloqueadores.`});}
        // State implicitly changes via CombatManager events
    }
    confirmBlockDeclaration(playerId, rawAssignments) {
        const p=this.getPlayer(playerId), ap=this.getCurrentPlayer();
        if(!p||this.#combatManager.state!=='declare_blockers'||this.getCurrentPhase()!=='attack'||ap?.id===playerId){this.emitEvent('gameLog',{message:"Não pode declarar bloqueadores agora."}); return;}
        const assignmentsMap = new Map(Object.entries(rawAssignments));
        const success = this.#combatManager.declareBlockers(p, assignmentsMap); // This now resolves and resets combat state
        this.#state = 'playing'; // Return game state to normal playing after combat resolves
        this.emitEvent('gameLog',{message:`Bloqueadores declarados. Resolvendo...`});
        // combatResolved event signals end
    }

    // --- Game Over / Events ---
    gameOver(winner) { if(this.#state==='game_over')return; this.#state='game_over'; const l=this.getOpponent(winner?.id); console.log(`Game Over! Winner:${winner?.name||'N/A'}`); this.emitEvent('gameOver',{winnerId:winner?.id,winnerName:winner?.name,loserId:l?.id,loserName:l?.name}); }
    get state() { return this.#state; }
    getCurrentPhase() { return this.#turnManager.currentPhase; }
    addEventListener(eventName, callback) { this.#eventDispatcher.addEventListener(eventName, callback); }
    removeEventListener(eventName, callback) { this.#eventDispatcher.removeEventListener(eventName, callback); }
    emitEvent(eventName, detail) { console.log(`Game Event: ${eventName}`, detail); this.#eventDispatcher.dispatchEvent(new CustomEvent(eventName, { detail })); }
}