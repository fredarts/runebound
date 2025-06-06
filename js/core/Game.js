// js/core/Game.js
import Player from './Player.js';
import TurnManager from './TurnManager.js';
import CombatManager from './CombatManager.js';
import Card from './Card.js';
import CreatureCard from './CreatureCard.js';
import SimpleAI from './ai/SimpleAI.js';

export default class Game {
    #players = [];
    #currentPlayerIndex = -1;
    #turnManager;
    #combatManager;
    #state = 'setup'; // 'setup', 'starting', 'playing', 'discarding', 'game_over'
    #eventDispatcher;
    #cardDatabase;
    #pendingDiscard = null;
    #aiActionTimeout = null;
    #aiControllers = new Map();

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
    getPendingDiscardInfo() { return this.#pendingDiscard ? { ...this.#pendingDiscard } : null; }
    getPlayersForDebug() { return this.#players.map(p => ({name: p.name, id: p.id, deckSize: p.deck?.getSize() })); }

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
            this.gameOver(null);
            return;
        }
        console.log("Game: Starting match!");
        this.#state = 'playing';
        const initialHandSize = 5;
        this.#players.forEach(player => {
            for (let i = 0; i < initialHandSize; i++) this._drawCard(player);
        });
        this.emitEvent('gameStarted', { startingPlayerId: startingPlayer.id, startingPlayerName: startingPlayer.name });
        this._startTurn(startingPlayer);
    }

    passPhase() {
        const currentAiController = this.#aiControllers.get(this.getCurrentPlayer()?.id);
        currentAiController?.cancelPendingActions(); // Cancela ação pendente da IA se o humano/IA passar
        if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout); // Limpa timeout geral da IA também


        if (!['playing', 'discarding'].includes(this.#state)) {
            console.warn(`Game: Can't pass phase in state ${this.#state}`);
            return;
        }
        if (this.#state === 'discarding' && this.#pendingDiscard?.playerId === this.getCurrentPlayer()?.id) {
             this.emitEvent('gameLog', { message: `Você precisa descartar ${this.#pendingDiscard.count} carta(s) primeiro.` });
             return;
        }

        const player = this.getCurrentPlayer();
        if (!player) return;
        const oldPhase = this.getCurrentPhase();

        if (oldPhase === 'attack') {
            const cmState = this.#combatManager.state;
            if (cmState === 'declare_blockers') {
                // Se o jogador atual é o DEFENSOR (oponente do atacante original)
                const originalAttacker = this.#combatManager.getAttackers()[0]?.ownerId; // Assume que há pelo menos um atacante
                if (originalAttacker && player.id === this.getOpponent(originalAttacker)?.id) {
                    console.log(`Game: Defending player (${player.name}) passed (chose not to block). Resolving combat.`);
                    this.#combatManager.resolveCombat(); // Resolve com 0 bloqueadores (ou os já declarados pela IA)
                } else if (player.id === originalAttacker) {
                     // O atacante (humano) passou a fase após declarar atacantes.
                     // O oponente (IA) deveria ter sido acionado para bloquear.
                     // Se a IA não bloqueou e o humano passa de novo, o combate resolve sem bloqueios.
                     console.log(`Game: Attacking player (${player.name}) passed again while CM in declare_blockers. Resolving combat.`);
                     this.#combatManager.resolveCombat();
                }
            }
        }

        const { newPhase, turnEnded } = this.#turnManager.nextPhase();
        this.emitEvent('phaseChange', { playerId: player.id, oldPhase: oldPhase, newPhase: newPhase });
        if (turnEnded) this.nextTurn();
        else this._onPhaseEnter(newPhase, player);
    }

    _onPhaseEnter(phase, player) {
        console.log(`Game: Entering ${phase} phase for ${player.name}. PlayerID: ${player.id}, CurrentPlayerID: ${this.getCurrentPlayer()?.id}`);
        const currentAiController = this.#aiControllers.get(this.getCurrentPlayer()?.id);
        currentAiController?.cancelPendingActions();
        if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);


        if (phase === 'attack') {
            this.#combatManager.reset();
            this.emitEvent('attackPhaseStart', { playerId: player.id });
        } else if (phase === 'end') {
            player.endTurnCleanup(this);
        } else if (phase === 'draw') {
            this._drawCard(player);
        }

        if (this.#state !== 'discarding') this.#state = 'playing';

        const aiController = this.#aiControllers.get(player.id);
        if (aiController && this.getCurrentPlayer()?.id === player.id &&
            (this.#state === 'playing' || (this.#state === 'discarding' && this.#pendingDiscard?.playerId === player.id))) {
            
            const cmState = this.#combatManager.state;
            // Condição: A IA age se é seu turno ativo e não está numa situação de combate onde o humano tem prioridade de defesa
            // Ou se está no estado 'discarding' e é ela quem deve descartar.
            const isHumanTurnAndAiIsDefending = (phase === 'attack' && cmState === 'declare_blockers' && this.getCurrentPlayer()?.id !== player.id);

            if (!isHumanTurnAndAiIsDefending || (this.#state === 'discarding' && this.#pendingDiscard?.playerId === player.id)) {
                 console.log(`Game: Agendando ação para IA ${player.name} na fase '${phase}' (contexto: active_turn). CM State: ${cmState}, Game State: ${this.#state}`);
                 this.#aiActionTimeout = setTimeout(() => {
                     if (this.getCurrentPlayer()?.id === player.id &&
                         (this.#state === 'playing' || (this.#state === 'discarding' && this.#pendingDiscard?.playerId === player.id))) {
                         aiController.performAction('active_turn');
                     } else {
                         console.log(`Game: Ação da IA ${player.name} cancelada (condições mudaram). CurrPlayer: ${this.getCurrentPlayer()?.id}, State: ${this.#state}`);
                     }
                 }, 300 + Math.random() * 300);
            } else {
                 console.log(`IA (${player.name}): Em _onPhaseEnter, fase '${phase}', mas humano está atacando e IA deve defender (ou estado de jogo inadequado). CM state: ${cmState}, Game State: ${this.#state}. Nenhuma ação agendada.`);
            }
        }
    }

    endTurn() {
        const currentAiController = this.#aiControllers.get(this.getCurrentPlayer()?.id);
        currentAiController?.cancelPendingActions();
        if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);

        const player = this.getCurrentPlayer();
        if (!player) return;

        if (this.#state !== 'playing') {
            console.warn(`Game: Can't end turn in state ${this.#state}`);
            if (this.#state === 'discarding' && this.#pendingDiscard?.playerId === player.id) {
                 this.emitEvent('gameLog', { message: `Você deve descartar ${this.#pendingDiscard.count} carta(s) antes.` });
                 const aiController = this.#aiControllers.get(player.id);
                 if (aiController) this.#aiActionTimeout = setTimeout(() => aiController.performAction('active_turn'), 100);
            }
            return;
        }
        console.log(`Game: ${player.name} ending turn from phase ${this.getCurrentPhase()}.`);

        let safetyCounter = 0;
        while ((this.#state === 'playing' || (this.#state === 'discarding' && this.#pendingDiscard?.playerId !== player.id )) && safetyCounter < 10) {
            const currentPhase = this.getCurrentPhase();
             if (this.#state === 'discarding' && this.#pendingDiscard?.playerId === player.id ) {
                console.log("Game: End turn paused for current player's discard.");
                const aiController = this.#aiControllers.get(player.id);
                if(aiController) this.#aiActionTimeout = setTimeout(() => aiController.performAction('active_turn'), 100);
                return;
            }
            if (currentPhase === 'attack' && this.#combatManager.state !== 'none') {
                if (this.#combatManager.state === 'declare_blockers') this.#combatManager.resolveCombat();
                else this.#combatManager.reset();
            }
            const { newPhase, turnEnded } = this.#turnManager.nextPhase();
            this.emitEvent('phaseChange', { playerId: player.id, oldPhase: currentPhase, newPhase: newPhase });
            if (newPhase === 'end') {
                player.endTurnCleanup(this);
                if (this.#state === 'discarding' && this.#pendingDiscard?.playerId === player.id) {
                    const aiController = this.#aiControllers.get(player.id);
                    if(aiController) this.#aiActionTimeout = setTimeout(() => aiController.performAction('active_turn'), 100);
                    return;
                }
            }
            if (turnEnded) { this.nextTurn(); return; }
            safetyCounter++;
        }
        if (safetyCounter >= 10 && this.getCurrentPlayer()?.id === player.id && this.#state === 'playing') this.nextTurn();
    }

    nextTurn() {
        const currentAiController = this.#aiControllers.get(this.getCurrentPlayer()?.id);
        currentAiController?.cancelPendingActions();
        if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);

        if (!['playing', 'discarding'].includes(this.#state)) {
            console.warn("Game: Cannot start next turn in state", this.#state);
            return;
        }
        if (this.#state === 'discarding') {
            if (this.#pendingDiscard?.count > 0) {
                 this.emitEvent('gameLog', {message: `Atenção: Descarte pendente de ${this.#pendingDiscard.playerId} não resolvido ao mudar de turno.`});
            }
            this.#pendingDiscard = null;
            this.#state = 'playing';
        }
        this.#combatManager.reset();
        const previousPlayer = this.getCurrentPlayer();
        this.#currentPlayerIndex = (this.#currentPlayerIndex + 1) % this.#players.length;
        const newPlayer = this.getCurrentPlayer();
        if (!newPlayer) { this.gameOver(null); return; }

        const newTurnNumber = this.#turnManager.turnNumber + 1;
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
        this.emitEvent('playerStatsChanged', { playerId: player.id, updates: { mana: player.mana, maxMana: player.maxMana }});
        player.battlefield.getAllCards().forEach(card => {
            if (card instanceof CreatureCard && !card.isTapped) {
                this.emitEvent('creatureUpdate', { cardUniqueId: card.uniqueId, updates: { isTapped: false } });
            }
        });
        console.log(`Game: Turn ${this.#turnManager.turnNumber} for ${player.name}. Starting phase: ${startingPhase}`);
        this._onPhaseEnter(startingPhase, player);
    }

    _drawCard(player) {
        if (!player || this.#state !== 'playing') return null;
        const cardInstance = player.drawCard();
        if (cardInstance) {
            this.emitEvent('cardDrawn', { playerId: player.id, card: cardInstance.getRenderData() });
            return cardInstance;
        } else {
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
            this.emitEvent('cardMoved', { cardUniqueId, cardData: cardInstance.getRenderData(), fromZone: fromZoneName, toZone: toZoneName, ownerId: playerId });
            return true;
        }
        return false;
    }

    requestPlayerDiscard(playerId, count) {
        if (this.#state === 'playing') {
            this.#state = 'discarding';
            this.#pendingDiscard = { playerId, count };
            console.log(`Game: State 'discarding' for ${playerId}, count ${count}.`);
            this.emitEvent('discardRequired', { playerId, count });
            this.emitEvent('gameLog', { message: `${this.getPlayer(playerId)?.name || 'Jogador'} precisa descartar ${count} carta(s).` });
            const aiController = this.#aiControllers.get(playerId);
            if (aiController) {
                if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);
                this.#aiActionTimeout = setTimeout(() => aiController.performAction('active_turn'), 100);
            }
        } else {
            console.warn(`Game: Cannot request discard in state ${this.#state}. Pending:`, this.#pendingDiscard);
        }
    }

    resolvePlayerDiscard(playerId, cardUniqueId) {
        if (this.#state !== 'discarding' || !this.#pendingDiscard || this.#pendingDiscard.playerId !== playerId) return false;
        const player = this.getPlayer(playerId);
        if (!player) return false;
        
        // Se cardUniqueId for null (ex: IA não tem cartas para descartar, mas precisa sair do estado)
        if (cardUniqueId === null && player.hand.getSize() === 0 && this.#pendingDiscard.count > 0) {
            console.warn(`Game: Player ${playerId} needs to discard ${this.#pendingDiscard.count} but has no cards. Resolving discard state.`);
            this.#pendingDiscard.count = 0; // Força a resolução
        } else {
            const cardToDiscard = player.hand.getCard(cardUniqueId);
            if (!cardToDiscard) return false;
            const moved = this.moveCardToZone(cardUniqueId, playerId, 'hand', 'graveyard');
            if (!moved) return false;
            this.#pendingDiscard.count--;
            this.emitEvent('gameLog', { message: `${player.name} descartou ${cardToDiscard.name}.` });
        }

        if (this.#pendingDiscard.count <= 0) {
            console.log(`Game: Discard requirement met for ${playerId}.`);
            this.#pendingDiscard = null;
            this.#state = 'playing';
            this.emitEvent('discardResolved', { playerId });
            const aiController = this.#aiControllers.get(player.id);
            if (this.getCurrentPhase() === 'end' && this.getCurrentPlayer()?.id === playerId) {
                 this.endTurn();
            } else if (aiController && this.#state === 'playing' && this.getCurrentPlayer()?.id === playerId) {
                 if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);
                 this.#aiActionTimeout = setTimeout(() => aiController.performAction('active_turn'), 100);
            }
        } else {
            this.emitEvent('discardRequired', { playerId, count: this.#pendingDiscard.count });
            const aiController = this.#aiControllers.get(player.id);
            if (aiController) {
                 if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);
                 this.#aiActionTimeout = setTimeout(() => aiController.performAction('active_turn'), 100);
            }
        }
        return true;
    }

    confirmAttackDeclaration(playerId, attackerIds) {
        const player = this.getPlayer(playerId); // Este é o atacante
        if (!player || this.#state !== 'playing' || this.getCurrentPhase() !== 'attack' || this.getCurrentPlayer()?.id !== playerId) {
            this.emitEvent('gameLog', { message: "Não é possível declarar atacantes agora." });
            return;
        }
        // Se o jogador humano (não IA) está agindo, cancela qualquer ação pendente da IA
        if (player.name !== "Opponent_AI") {
            const opponent = this.getOpponent(playerId);
            this.#aiControllers.get(opponent?.id)?.cancelPendingActions();
             if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);
        }

        this.#combatManager.declareAttackers(player, attackerIds);

        if (this.#combatManager.state === 'declare_blockers') {
            const opponent = this.getOpponent(playerId); // Oponente é o defensor
            this.emitEvent('gameLog', { message: `${opponent?.name || 'Oponente'}, declare seus bloqueadores.` });
            const aiController = this.#aiControllers.get(opponent?.id);
            if (aiController) { // Se o defensor é uma IA
                if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);
                console.log(`Game: Humano atacou. Agendando AI ${opponent.name} para performAction (defense_response)`);
                this.#aiActionTimeout = setTimeout(() => {
                    if (this.#combatManager.state === 'declare_blockers' && this.getCurrentPlayer()?.id === playerId) {
                        aiController.performAction('defense_response');
                    } else {
                         console.log(`Game: AI ${opponent.name} performAction (defense_response) CANCELADO. CM State: ${this.#combatManager.state}, CurrentPlayer: ${this.getCurrentPlayer()?.id}`);
                    }
                }, 1000 + Math.random() * 500);
            }
            // Se o defensor for humano, a UI do humano (BattleInteractionManager) entrará no modo de bloqueio.
        } else if (this.#combatManager.state === 'resolving' || this.#combatManager.state === 'none') {
             this.#state = 'playing';
             this.emitEvent('gameLog', {message: (attackerIds && attackerIds.length > 0 ? 'Nenhum bloqueador declarado. Resolvendo combate.' : 'Nenhum atacante válido. Combate encerrado.')});
             const aiController = this.#aiControllers.get(player.id);
             if (aiController) {
                 if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);
                 this.#aiActionTimeout = setTimeout(() => aiController.performAction('active_turn'), 100);
             }
        }
    }

    confirmBlockDeclaration(playerId, rawAssignments) {
        const defendingPlayer = this.getPlayer(playerId); // Quem está declarando
        if (!defendingPlayer || this.#combatManager.state !== 'declare_blockers' || this.getCurrentPhase() !== 'attack' || this.getCurrentPlayer()?.id === playerId ) {
             // getCurrentPlayer() aqui é o ATACANTE, então se for igual a playerId (defensor), algo está errado no fluxo de prioridade
            this.emitEvent('gameLog', { message: "Não é possível declarar bloqueadores agora." });
            return;
        }
        if (this.#aiActionTimeout && defendingPlayer.name !== "Opponent_AI") clearTimeout(this.#aiActionTimeout);

        const assignmentsMap = new Map(Object.entries(rawAssignments || {}));
        this.#combatManager.declareBlockers(defendingPlayer, assignmentsMap); // Isso resolve o combate e reseta CM
        this.#state = 'playing';
        // O evento 'combatResolved' será emitido pelo CombatManager após a resolução.
        // Não precisamos emitir outro log aqui, a menos que seja específico para 'blockers declared'.
        // this.emitEvent('gameLog', { message: `Bloqueadores declarados por ${defendingPlayer.name}. Resolvendo combate...` });

        const attackerWhoseTurnItIs = this.getCurrentPlayer();
        const aiController = this.#aiControllers.get(attackerWhoseTurnItIs?.id);
        // Se a IA era a atacante, e o combate foi resolvido (CM state agora é 'none'), ela precisa continuar.
        if (aiController && this.getCurrentPhase() === 'attack' && this.#combatManager.state === 'none') {
            console.log(`Game: Combate resolvido (IA era atacante). Agendando IA ${attackerWhoseTurnItIs.name} para continuar (active_turn).`);
            if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);
            this.#aiActionTimeout = setTimeout(() => {
                if(this.getCurrentPlayer()?.id === attackerWhoseTurnItIs.id && this.getCurrentPhase() === 'attack' && this.#combatManager.state === 'none') {
                    aiController.performAction('active_turn');
                }
            }, 100);
        } else if (attackerWhoseTurnItIs && attackerWhoseTurnItIs.name !== "Opponent_AI") {
            this.emitEvent('gameLog', {message: `Combate finalizado. Turno de ${attackerWhoseTurnItIs.name}.`});
        }
    }

    resolveEffect(effectDefinition, caster, primaryTargetId, sourceCard) {
        if (!effectDefinition || !effectDefinition.type || !caster || !sourceCard) return false;
        let actualTarget = null;
        const targetReq = effectDefinition.targetRequirement;
        if (targetReq && targetReq !== 'none' && targetReq !== 'player_self') {
            if (!primaryTargetId) return false;
            actualTarget = this.findCardInstance(primaryTargetId) || this.getPlayer(primaryTargetId);
            if (!actualTarget) return false;
            if (targetReq === 'creature' && !(actualTarget instanceof CreatureCard && actualTarget.location === 'battlefield')) return false;
        } else if (targetReq === 'player_self') actualTarget = caster;

        switch (effectDefinition.type) {
            case 'dealDamage':
                if (!actualTarget || typeof actualTarget.takeDamage !== 'function') return false;
                const damageValue = parseInt(effectDefinition.value, 10) || 0;
                if (damageValue > 0) actualTarget.takeDamage(damageValue, sourceCard, this);
                return true;
            case 'drawCards':
                const numToDraw = parseInt(effectDefinition.value, 10) || 0;
                if (numToDraw > 0) {
                    const targetPlayer = (targetReq === 'player_self' || !actualTarget || !(actualTarget instanceof Player)) ? caster : actualTarget;
                    if (targetPlayer instanceof Player) {
                        targetPlayer.drawCards(numToDraw, this);
                        this.emitEvent('gameLog', { message: `${targetPlayer.name} comprou ${numToDraw} carta(s) com ${sourceCard.name}.` });
                    } else return false;
                }
                return true;
            case 'applyStatusEffect':
                if (!actualTarget || typeof actualTarget.applyStatusEffect !== 'function') {
                    console.warn(`Game.resolveEffect (applyStatusEffect): Target inválido ou não pode receber status.`);
                    this.emitEvent('gameLog', {message: `Efeito de ${sourceCard.name} falhou: alvo inválido para status.`});
                    return false;
                }
                const statusName = effectDefinition.status;
                const duration = parseInt(effectDefinition.duration, 10) || 1; // Default 1 tick
                if (statusName) {
                    actualTarget.applyStatusEffect(statusName, duration); // CreatureCard precisa desse método
                    this.emitEvent('gameLog', { message: `${actualTarget.name} agora tem ${statusName} por ${duration} turno(s) (efeito de ${sourceCard.name}).` });
                    // A UI precisará de um evento para atualizar o visual da criatura com o status
                    this.emitEvent('creatureUpdate', { cardUniqueId: actualTarget.uniqueId, updates: actualTarget.getRenderData() });
                } else {
                    console.warn(`Game.resolveEffect (applyStatusEffect): Nome do status não definido.`);
                    return false;
                }
                return true;
            default: return false;
        }
    }

    gameOver(winner) {
        const currentAiController = this.#aiControllers.get(this.getCurrentPlayer()?.id);
        currentAiController?.cancelPendingActions();
        if (this.#aiActionTimeout) clearTimeout(this.#aiActionTimeout);
        if (this.#state === 'game_over') return;
        this.#state = 'game_over';
        const loser = this.getOpponent(winner?.id);
        console.log(`Game Over! Winner: ${winner?.name || 'N/A'}`);
        this.emitEvent('gameOver', { winnerId: winner?.id, winnerName: winner?.name, loserId: loser?.id, loserName: loser?.name });
    }

    get state() { return this.#state; }
    getCurrentPhase() { return this.#turnManager.currentPhase; }
    addEventListener(eventName, callback) { this.#eventDispatcher.addEventListener(eventName, callback); }
    removeEventListener(eventName, callback) { this.#eventDispatcher.removeEventListener(eventName, callback); }
    emitEvent(eventName, detail) { this.#eventDispatcher.dispatchEvent(new CustomEvent(eventName, { detail })); }
}