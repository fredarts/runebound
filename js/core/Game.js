// js/core/Game.js
import Player from './Player.js';
import TurnManager from './TurnManager.js';
import CombatManager from './CombatManager.js';
import Card from './Card.js';
import CreatureCard from './CreatureCard.js';
import SimpleAI from './ai/SimpleAI.js'; // Importa o controlador da IA

export default class Game {
    #players = [];
    #currentPlayerIndex = -1;
    #turnManager;
    #combatManager;
    #state = 'setup'; // 'setup', 'starting', 'playing', 'discarding', 'game_over'
    #eventDispatcher;
    #cardDatabase;
    #pendingDiscard = null; // { playerId, count }
    #aiActionTimeout = null; // Para controlar timeouts que disparam a IA
    #aiControllers = new Map(); // playerId -> AIControllerInstance

    constructor(cardDatabase) {
        if (!cardDatabase || Object.keys(cardDatabase).length === 0) {
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

    // --- Player Management ---
    addPlayer(name, deckCardIds) {
        if (this.#players.length >= 2) {
            console.error("Game Error: Cannot add more than 2 players.");
            return null;
        }
        if (!this.#cardDatabase) {
             console.error("Game Error: CardDatabase missing.");
             return null;
        }
        if (!Array.isArray(deckCardIds) || deckCardIds.length < 30 || deckCardIds.length > 40) {
             console.error(`Game Error: Invalid deckCardIds for player ${name}. Length: ${deckCardIds?.length}. Must be array [30-40].`);
             this.emitEvent('gameLog', { message: `Erro: Deck inválido para ${name}.` });
             return null;
        }

        try {
            const player = new Player(name, deckCardIds, this.#cardDatabase);
            this.#players.push(player);
            console.log(`Game: Player ${name} (ID: ${player.id}) added with deck size ${deckCardIds.length}.`);

            if (name === "Opponent_AI") {
                const aiController = new SimpleAI(player, this);
                this.#aiControllers.set(player.id, aiController);
                console.log(`Game: SimpleAI controller created for ${name}.`);
            }
            return player;
        } catch (error) {
             console.error(`Game Error: Error creating Player '${name}' or AI controller:`, error);
             return null;
        }
    }

    getPlayer(playerId) { return this.#players.find(p => p.id === playerId); }
    getOpponent(playerId) { return this.#players.find(p => p.id !== playerId); }
    getCurrentPlayer() { return this.#players[this.#currentPlayerIndex]; }

    findCardInstance(cardUniqueId) {
        if (!cardUniqueId) return null;
        for (const player of this.#players) {
            let card = player.battlefield.getCard(cardUniqueId);
            if (card) return card;
        }
        return null;
    }

    getCombatManager() { return this.#combatManager; }

    getPendingDiscardInfo() {
        return this.#pendingDiscard ? { ...this.#pendingDiscard } : null;
    }

    getPlayersForDebug() { // Adicionado para debug em main.js
        return this.#players.map(p => ({name: p.name, id: p.id, deckSize: p.deck?.getSize() }));
    }


    // --- Game Flow ---
    setupGame() {
        if (this.#players.length !== 2) {
            console.error("Game: Need 2 players to setup.");
            return false;
        }
        this.#state = 'starting';
        console.log("Game: Setting up...");
        this.#players.forEach(player => {
            player.resetStats();
            player.shuffleDeck();
        });
        this.#currentPlayerIndex = Math.floor(Math.random() * 2);
        console.log(`Game: ${this.getCurrentPlayer()?.name} will start.`);
        return true;
    }

    startGame() {
        if (this.#state !== 'starting') {
            console.error("Game: Not ready to start. Current state:", this.#state);
            return;
        }
        const startingPlayer = this.getCurrentPlayer();
        if (!startingPlayer) {
            console.error("Game: Starting player not set correctly.");
            this.gameOver(null); // Não pode iniciar
            return;
        }
        console.log("Game: Starting match!");
        this.#state = 'playing';
        const initialHandSize = 5;
        this.#players.forEach(player => {
            for (let i = 0; i < initialHandSize; i++) {
                this._drawCard(player);
            }
        });
        this.emitEvent('gameStarted', { startingPlayerId: startingPlayer.id, startingPlayerName: startingPlayer.name });
        this._startTurn(startingPlayer); // Inicia o primeiro turno
    }

    passPhase() {
        if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);
        if (!['playing', 'discarding'].includes(this.#state)) {
            console.warn(`Game: Can't pass phase in state ${this.#state}`);
            return;
        }
        if (this.#state === 'discarding') {
             this.emitEvent('gameLog', { message: `Você precisa descartar ${this.#pendingDiscard.count} carta(s) primeiro.` });
             return;
        }

        const player = this.getCurrentPlayer();
        if (!player) {
            console.error("Game.passPhase: No current player.");
            return;
        }
        const oldPhase = this.getCurrentPhase();

        if (oldPhase === 'attack') {
            const cmState = this.#combatManager.state;
            if (cmState === 'declare_blockers' && player.name !== "Opponent_AI") { // Humano (defensor) passou
                console.log("Game: Defending player (human) passed blocker declaration. Resolving combat.");
                this.#combatManager.resolveCombat();
            } else if (cmState === 'declare_attackers' && player.name !== "Opponent_AI") { // Humano (atacante) passou
                console.log("Game: Attacking player (human) passed after declaring. Triggering AI to handle blocking.");
                const opponent = this.getOpponent(player.id);
                const aiController = this.#aiControllers.get(opponent?.id);
                if (aiController && this.#combatManager.state === "declare_blockers") {
                    this.#aiActionTimeout = setTimeout(() => aiController.performAction(), 100);
                }
                return; // Não avança a fase principal do TurnManager ainda.
            }
        }

        const { newPhase, turnEnded } = this.#turnManager.nextPhase();
        this.emitEvent('phaseChange', { playerId: player.id, oldPhase: oldPhase, newPhase: newPhase });

        if (turnEnded) {
            this.nextTurn();
        } else {
            this._onPhaseEnter(newPhase, player);
        }
    }

    _onPhaseEnter(phase, player) {
        console.log(`Game: Entering ${phase} phase for ${player.name}.`);
        if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);

        if (phase === 'attack') {
            this.#combatManager.reset();
            this.emitEvent('attackPhaseStart', { playerId: player.id });
        } else if (phase === 'end') {
            player.endTurnCleanup(this); // Pode mudar o estado para 'discarding'
        } else if (phase === 'draw') {
            this._drawCard(player);
        }

        if (this.#state !== 'discarding') {
            this.#state = 'playing';
        }

        const aiController = this.#aiControllers.get(player.id);
        if (aiController && this.getCurrentPlayer()?.id === player.id &&
            (this.#state === 'playing' || (this.#state === 'discarding' && this.#pendingDiscard?.playerId === player.id))) {

            const cmState = this.#combatManager.state;
            const isAiTurnToBlock = (phase === 'attack' && cmState === 'declare_blockers' && this.getCurrentPlayer()?.id !== player.id);

            // A IA age se:
            // - Não está esperando o humano declarar bloqueadores (o jogador atual é a IA, e o cmState não é 'declare_blockers' ou se for, ela é a defensora)
            // - OU está no estado 'discarding' e é ela quem precisa descartar.
            if (!isAiTurnToBlock || (this.#state === 'discarding' && this.#pendingDiscard?.playerId === player.id)) {
                 console.log(`Game: Agendando ação para IA ${player.name} na fase '${phase}'. (CM State: ${cmState}, Game State: ${this.#state})`);
                 this.#aiActionTimeout = setTimeout(() => {
                     // Re-checar condições no momento da execução do timeout
                     if (this.getCurrentPlayer()?.id === player.id &&
                         (this.#state === 'playing' || (this.#state === 'discarding' && this.#pendingDiscard?.playerId === player.id))) {
                         aiController.performAction();
                     } else {
                         console.log(`Game: Ação da IA ${player.name} cancelada (condições mudaram antes do timeout).`);
                     }
                 }, 100 + Math.random() * 200); // Pequeno delay variado
            } else {
                 console.log(`IA (${player.name}): Na fase '${phase}', mas aguardando ação do humano ou estado de combate/jogo inadequado (CM state: ${cmState}, Game State: ${this.#state}). Nenhuma ação agendada.`);
            }
        }
    }

    endTurn() {
        if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);
        if (this.#state !== 'playing') {
            console.warn(`Game: Can't end turn in state ${this.#state}`);
            // Se estiver 'discarding' e o jogador atual tentar finalizar, forçar o descarte ou avisar.
            if (this.#state === 'discarding' && this.#pendingDiscard?.playerId === this.getCurrentPlayer()?.id) {
                 this.emitEvent('gameLog', { message: `Você deve descartar ${this.#pendingDiscard.count} carta(s) antes de finalizar o turno.` });
                 // Se for a IA, ela deve resolver isso em performAction
                 const aiController = this.#aiControllers.get(this.getCurrentPlayer()?.id);
                 if(aiController) {
                     this.#aiActionTimeout = setTimeout(() => aiController.performAction(), 100);
                 }
            }
            return;
        }
        const player = this.getCurrentPlayer();
        if (!player) return;
        console.log(`Game: ${player.name} ending turn from phase ${this.getCurrentPhase()}.`);

        let safetyCounter = 0;
        while (this.#state === 'playing' && safetyCounter < 10) {
            const currentPhase = this.getCurrentPhase();
            if (currentPhase === 'attack' && this.#combatManager.state !== 'none') {
                if (this.#combatManager.state === 'declare_blockers') this.#combatManager.resolveCombat();
                else this.#combatManager.reset();
            }

            const { newPhase, turnEnded } = this.#turnManager.nextPhase();
            this.emitEvent('phaseChange', { playerId: player.id, oldPhase: currentPhase, newPhase: newPhase });

            if (newPhase === 'end') {
                player.endTurnCleanup(this);
                if (this.#state === 'discarding') {
                    console.log("Game: Turn end paused for discarding.");
                    const aiController = this.#aiControllers.get(player.id); // Se for a IA, ela continua o descarte.
                    if (aiController && this.#pendingDiscard?.playerId === player.id) {
                         this.#aiActionTimeout = setTimeout(() => aiController.performAction(), 100);
                    }
                    return;
                }
            }
            if (turnEnded) {
                this.nextTurn();
                return;
            }
            safetyCounter++;
        }
        if (safetyCounter >= 10) {
            console.error("Game: Potential infinite loop in endTurn!");
            if(this.getCurrentPlayer()?.id === player.id && this.#state === 'playing') this.nextTurn();
        }
    }

    nextTurn() {
        if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);
        if (!['playing', 'discarding'].includes(this.#state)) {
            console.warn("Game: Cannot start next turn in state", this.#state);
            return;
        }
        if (this.#state === 'discarding') {
            if (this.#pendingDiscard && this.#pendingDiscard.count > 0) {
                 console.warn(`Game.nextTurn: Tentando iniciar próximo turno enquanto ${this.#pendingDiscard.playerId} ainda precisa descartar ${this.#pendingDiscard.count} cartas.`);
                 // Poderia forçar a resolução aqui ou emitir um erro.
                 // Por ora, vamos limpar e prosseguir, mas isso pode indicar um bug no fluxo.
                 this.emitEvent('gameLog', {message: `Atenção: Descarte pendente não resolvido ao mudar de turno.`});
            }
            this.#pendingDiscard = null;
            this.#state = 'playing';
        }

        this.#combatManager.reset();
        const previousPlayer = this.getCurrentPlayer();
        this.#currentPlayerIndex = (this.#currentPlayerIndex + 1) % this.#players.length;
        const newPlayer = this.getCurrentPlayer();

        if (!newPlayer) {
            console.error("Game.nextTurn: Failed to determine new current player.");
            this.gameOver(null);
            return;
        }
        const newTurnNumber = this.#turnManager.turnNumber + 1; // O turnManager só incrementa em startNewTurn
        console.log(`Game: Preparing Turn ${newTurnNumber} for ${newPlayer.name}.`);
        this.emitEvent('turnChange', {
            previousPlayerId: previousPlayer?.id,
            currentPlayerId: newPlayer.id,
            playerName: newPlayer.name,
            turnNumber: newTurnNumber
        });
        this._startTurn(newPlayer);
    }

    _startTurn(player) {
        if (!player) return;
        this.#state = 'playing';
        this.#pendingDiscard = null;

        const startingPhase = this.#turnManager.startNewTurn();
        player.prepareForTurn();

        this.emitEvent('playerStatsChanged', {
            playerId: player.id,
            updates: { mana: player.mana, maxMana: player.maxMana }
        });
        player.battlefield.getAllCards().forEach(card => {
            if (card instanceof CreatureCard && !card.isTapped) {
                this.emitEvent('creatureUpdate', { cardUniqueId: card.uniqueId, updates: { isTapped: false } });
            }
        });
        console.log(`Game: Turn ${this.#turnManager.turnNumber} for ${player.name}. Starting phase: ${startingPhase}`);
        this._onPhaseEnter(startingPhase, player); // Isso agendará a ação da IA se for o turno dela
    }

    _drawCard(player) {
        if (!player) return null;
        if (this.#state !== 'playing') {
            console.warn(`Game._drawCard: Cannot draw card for ${player.name} in state ${this.#state}.`);
            return null;
        }
        const cardInstance = player.drawCard();
        if (cardInstance) {
            this.emitEvent('cardDrawn', { playerId: player.id, card: cardInstance.getRenderData() });
            return cardInstance;
        } else {
            console.log(`Game: ${player.name}'s deck is empty!`);
            this.emitEvent('deckEmpty', { playerId: player.id });
            this.gameOver(this.getOpponent(player.id));
            return null;
        }
    }

    moveCardToZone(cardUniqueId, playerId, fromZoneName, toZoneName) {
        const player = this.getPlayer(playerId);
        if (!player) return false;
        const cardInstance = player.moveCardBetweenZones(cardUniqueId, fromZoneName, toZoneName);
        if (cardInstance) {
            this.emitEvent('cardMoved', {
                cardUniqueId, cardData: cardInstance.getRenderData(),
                fromZone: fromZoneName, toZone: toZoneName, ownerId: playerId
            });
            return true;
        }
        return false;
    }

    requestPlayerDiscard(playerId, count) {
        if (this.#state === 'playing') {
            this.#state = 'discarding';
            this.#pendingDiscard = { playerId, count };
            console.log(`Game: State changed to 'discarding' for player ${playerId}, count ${count}.`);
            this.emitEvent('discardRequired', { playerId, count });
            const playerName = this.getPlayer(playerId)?.name || 'Jogador';
            this.emitEvent('gameLog', { message: `${playerName} precisa descartar ${count} carta(s).` });

            const aiController = this.#aiControllers.get(playerId);
            if (aiController) {
                if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);
                this.#aiActionTimeout = setTimeout(() => aiController.performAction(), 100);
            }
        } else {
            console.warn(`Game: Cannot request discard in state ${this.#state}. Pending:`, this.#pendingDiscard);
        }
    }

    resolvePlayerDiscard(playerId, cardUniqueId) {
        if (this.#state !== 'discarding' || !this.#pendingDiscard || this.#pendingDiscard.playerId !== playerId) {
            console.warn(`Game.resolvePlayerDiscard: Invalid state or player for discard resolution.`);
            return false;
        }
        const player = this.getPlayer(playerId);
        if (!player) return false;
        const cardToDiscard = player.hand.getCard(cardUniqueId);
        if (!cardToDiscard) return false;

        const moved = this.moveCardToZone(cardUniqueId, playerId, 'hand', 'graveyard');
        if (moved) {
            this.#pendingDiscard.count--;
            this.emitEvent('gameLog', { message: `${player.name} descartou ${cardToDiscard.name}.` });

            if (this.#pendingDiscard.count <= 0) {
                console.log(`Game: Discard requirement met for ${playerId}.`);
                this.#pendingDiscard = null;
                this.#state = 'playing';
                this.emitEvent('discardResolved', { playerId });

                const aiController = this.#aiControllers.get(player.id);
                if (this.getCurrentPhase() === 'end' && this.getCurrentPlayer()?.id === playerId) {
                     console.log("Discard resolved in end phase. Automatically trying to end turn.");
                     this.endTurn();
                } else if (aiController) {
                     if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);
                     this.#aiActionTimeout = setTimeout(() => aiController.performAction(), 100);
                }
            } else {
                this.emitEvent('discardRequired', { playerId, count: this.#pendingDiscard.count });
                const aiController = this.#aiControllers.get(player.id);
                if (aiController) {
                     if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);
                     this.#aiActionTimeout = setTimeout(() => aiController.performAction(), 100);
                }
            }
            return true;
        }
        return false;
    }

    // --- Combat Actions ---
    confirmAttackDeclaration(playerId, attackerIds) {
        const player = this.getPlayer(playerId);
        if (!player || this.#state !== 'playing' || this.getCurrentPhase() !== 'attack' || this.getCurrentPlayer()?.id !== playerId) {
            this.emitEvent('gameLog', { message: "Não é possível declarar atacantes agora." });
            return;
        }
        if (this.#aiActionTimeout && player.name !== "Opponent_AI") clearTimeout(this.#aiActionTimeout); // Humano agiu, cancela AI

        this.#combatManager.declareAttackers(player, attackerIds);

        if (this.#combatManager.state === 'declare_blockers') {
            const opponent = this.getOpponent(playerId);
            this.emitEvent('gameLog', { message: `${opponent?.name || 'Oponente'}, declare seus bloqueadores.` });
            const aiController = this.#aiControllers.get(opponent?.id);
            if (aiController) {
                if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);
                this.#aiActionTimeout = setTimeout(() => aiController.performAction(), 1000);
            }
        } else if (this.#combatManager.state === 'resolving' || this.#combatManager.state === 'none') { // No attackers valid, or combat resolved immediately
             this.#state = 'playing';
             this.emitEvent('gameLog', {message: (attackerIds.length > 0 ? 'Combate resolvido (sem bloqueadores).' : 'Nenhum atacante válido. Combate encerrado.')});
             const aiController = this.#aiControllers.get(player.id);
             if (aiController) { // Se a IA era a atacante e não houve bloqueadores / combate acabou
                 if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);
                 this.#aiActionTimeout = setTimeout(() => aiController.performAction(), 100); // IA continua seu turno (provavelmente para 'end')
             }
        }
    }

    confirmBlockDeclaration(playerId, rawAssignments) {
        const defendingPlayer = this.getPlayer(playerId);
        if (!defendingPlayer || this.#combatManager.state !== 'declare_blockers' || this.getCurrentPhase() !== 'attack' || this.getCurrentPlayer()?.id === playerId) {
            this.emitEvent('gameLog', { message: "Não é possível declarar bloqueadores agora." });
            return;
        }
        if (this.#aiActionTimeout && defendingPlayer.name !== "Opponent_AI") clearTimeout(this.#aiActionTimeout); // Humano agiu

        const assignmentsMap = new Map(Object.entries(rawAssignments || {}));
        this.#combatManager.declareBlockers(defendingPlayer, assignmentsMap);
        this.#state = 'playing';
        this.emitEvent('gameLog', { message: `Bloqueadores declarados. Resolvendo combate...` }); // combatResolved será emitido pelo CM

        const attackerWhoseTurnItIs = this.getCurrentPlayer();
        const aiController = this.#aiControllers.get(attackerWhoseTurnItIs?.id);
        if (aiController && this.getCurrentPhase() === 'attack' && this.#combatManager.state === 'none') {
            console.log(`Game: Combate resolvido (IA era atacante). Agendando IA ${attackerWhoseTurnItIs.name} para continuar.`);
            if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);
            this.#aiActionTimeout = setTimeout(() => aiController.performAction(), 100);
        } else if (attackerWhoseTurnItIs) {
            this.emitEvent('gameLog', {message: `Combate finalizado. Turno de ${attackerWhoseTurnItIs.name}.`});
        }
    }

    // --- Efeito Resolver ---
    resolveEffect(effectDefinition, caster, primaryTargetId, sourceCard) {
        if (!effectDefinition || !effectDefinition.type || !caster || !sourceCard) {
            console.error("Game.resolveEffect: Parâmetros inválidos.", { effectDefinition, caster, primaryTargetId, sourceCard });
            return false;
        }
        console.log(`Game: Resolving effect type '${effectDefinition.type}' from card '${sourceCard.name}' for player '${caster.name}'. TargetID: ${primaryTargetId}`);
        let actualTarget = null;
        const targetReq = effectDefinition.targetRequirement;

        if (targetReq && targetReq !== 'none' && targetReq !== 'player_self') {
            if (!primaryTargetId) {
                console.warn(`Game.resolveEffect: Effect type '${effectDefinition.type}' requires a target (req: '${targetReq}'), but primaryTargetId is null.`);
                this.emitEvent('gameLog', {message: `Ação de ${sourceCard.name} falhou: alvo necessário não fornecido.`});
                return false;
            }
            actualTarget = this.findCardInstance(primaryTargetId);
            if (!actualTarget && (targetReq === 'player' || targetReq === 'opponent_player')) {
                actualTarget = this.getPlayer(primaryTargetId);
            }
            if (!actualTarget) {
                console.warn(`Game.resolveEffect: Target instance for ID '${primaryTargetId}' not found for effect type '${effectDefinition.type}'.`);
                this.emitEvent('gameLog', {message: `Ação de ${sourceCard.name} falhou: alvo '${primaryTargetId}' não encontrado.`});
                return false;
            }
            if (targetReq === 'creature' && !(actualTarget instanceof CreatureCard && actualTarget.location === 'battlefield')) {
                console.warn(`Game.resolveEffect: Effect type '${effectDefinition.type}' requires a creature on battlefield, but target '${actualTarget.name || primaryTargetId}' is not.`);
                this.emitEvent('gameLog', {message: `Ação de ${sourceCard.name} falhou: alvo inválido (${actualTarget.name || 'Alvo'}).`});
                return false;
            }
        } else if (targetReq === 'player_self') {
            actualTarget = caster;
        }

        switch (effectDefinition.type) {
            case 'dealDamage':
                if (!actualTarget) {
                    console.warn("Game.resolveEffect (dealDamage): No target for damage.");
                    this.emitEvent('gameLog', {message: `Efeito de ${sourceCard.name} falhou: alvo de dano não especificado.`});
                    return false;
                }
                if (typeof actualTarget.takeDamage !== 'function') {
                    console.warn(`Game.resolveEffect (dealDamage): Target '${actualTarget.name || primaryTargetId}' cannot take damage.`);
                    this.emitEvent('gameLog', {message: `Efeito de ${sourceCard.name} falhou: ${actualTarget.name || 'Alvo'} não pode receber dano.`});
                    return false;
                }
                const damageValue = parseInt(effectDefinition.value, 10) || 0;
                if (damageValue > 0) {
                    actualTarget.takeDamage(damageValue, sourceCard, this);
                }
                return true;

            case 'drawCards':
                const numToDraw = parseInt(effectDefinition.value, 10) || 0;
                if (numToDraw > 0) {
                    const targetPlayer = (targetReq === 'player_self' || !actualTarget || !(actualTarget instanceof Player)) ? caster : actualTarget;
                    if (targetPlayer instanceof Player) {
                        console.log(`Game.resolveEffect: ${targetPlayer.name} drawing ${numToDraw} card(s) from effect of '${sourceCard.name}'.`);
                        targetPlayer.drawCards(numToDraw, this);
                        this.emitEvent('gameLog', { message: `${targetPlayer.name} comprou ${numToDraw} carta(s) com ${sourceCard.name}.` });
                    } else {
                        console.warn("Game.resolveEffect (drawCards): Invalid target for drawing cards.");
                        this.emitEvent('gameLog', {message: `Efeito de ${sourceCard.name} falhou: alvo inválido para comprar cartas.`});
                        return false;
                    }
                }
                return true;

            default:
                console.warn(`Game.resolveEffect: Unknown or not implemented effect type: '${effectDefinition.type}'.`);
                return false;
        }
    }

    // --- Game Over / Events ---
    gameOver(winner) {
        if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);
        if (this.#state === 'game_over') return;
        this.#state = 'game_over';
        const loser = this.getOpponent(winner?.id);
        console.log(`Game Over! Winner: ${winner?.name || 'N/A'}`);
        this.emitEvent('gameOver', {
            winnerId: winner?.id,
            winnerName: winner?.name,
            loserId: loser?.id,
            loserName: loser?.name
        });
    }

    get state() { return this.#state; }
    getCurrentPhase() { return this.#turnManager.currentPhase; }

    addEventListener(eventName, callback) { this.#eventDispatcher.addEventListener(eventName, callback); }
    removeEventListener(eventName, callback) { this.#eventDispatcher.removeEventListener(eventName, callback); }
    emitEvent(eventName, detail) {
        this.#eventDispatcher.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
}