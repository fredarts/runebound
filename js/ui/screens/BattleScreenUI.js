// js/ui/screens/BattleScreenUI.js - Refatorado (Parte 2 - Final)

import CardRenderer from '../helpers/CardRenderer.js';
import ZoomHandler from '../helpers/ZoomHandler.js';
import BattleRenderer from './battle/BattleRenderer.js';
import BattleInteractionManager from './battle/BattleInteractionManager.js';

export default class BattleScreenUI {
    // --- Referências Injetadas ---
    #screenManager;
    #accountManager;
    #cardDatabase;
    #zoomHandler;
    #audioManager;
    #uiManager;

    // --- Componentes de UI da Batalha ---
    #battleRenderer;
    #battleInteractionManager = null;

    // --- Estado do Jogo (Recebido) ---
    #gameInstance = null;
    #localPlayerId = null;

    #permanentEventsBound = false;

    // --- Elementos da UI (Apenas os que BattleScreenUI gerencia diretamente) ---
    #battleScreenElement;
    #gameOverOverlayElement;
    #btnBackToProfile;

    constructor(screenManager, accountManager, cardDatabase, cardRendererMaster, zoomHandler, audioManager, uiManager) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;
        this.#zoomHandler = zoomHandler;
        this.#audioManager = audioManager;
        this.#uiManager = uiManager;

        this.#battleRenderer = new BattleRenderer(cardRendererMaster, this.#accountManager);
        // BattleInteractionManager será instanciado em setGameInstance

        this._cacheEssentialSelectors();
        if (!this.#battleScreenElement || !this.#battleScreenElement.length) {
            console.error("BattleScreenUI Error: #battle-screen element not found!");
            return;
        }
        console.log("BattleScreenUI refatorado (Parte 2) inicializado.");
    }

    _cacheEssentialSelectors() {
        this.#battleScreenElement = $('#battle-screen');
        if (!this.#battleScreenElement.length) {
            console.warn("BattleScreenUI: _cacheEssentialSelectors called but #battle-screen not found yet.");
            return;
        }
        this.#gameOverOverlayElement = this.#battleScreenElement.find('#game-over-overlay');
        this.#btnBackToProfile = this.#battleScreenElement.find('#btn-back-to-profile');
    }

    setGameInstance(gameInstance) {
        this.#gameInstance = gameInstance;
        if (this.#gameInstance) {
            // Instancia BattleInteractionManager AQUI, pois gameInstance está disponível
            this.#battleInteractionManager = new BattleInteractionManager(
                this.#gameInstance,
                this, // Passa a instância de BattleScreenUI para callback (ex: _updateTurnControls)
                this.#battleRenderer,
                this.#audioManager,
                this.#zoomHandler
            );
            if (this.#localPlayerId) { // Se localPlayerId já foi setado
                this.#battleInteractionManager.setLocalPlayerId(this.#localPlayerId);
            }
            this._bindGameEventListeners();
        } else {
            this.#battleInteractionManager?._unbindGameActions(); // Chama unbind se existir
            this.#battleInteractionManager = null;
        }
    }

    setLocalPlayer(playerId) {
        this.#localPlayerId = playerId;
        this.#battleRenderer.setLocalPlayerId(playerId);
        this.#battleInteractionManager?.setLocalPlayerId(playerId);
    }

    renderInitialState() {
        if (!this.#battleScreenElement?.length) this._cacheEssentialSelectors();
        if (!this.#battleScreenElement?.length) {
             console.error("BattleScreenUI Render Error: Root element not found after re-cache."); return;
        }

        if (!this.#permanentEventsBound) {
            this._bindPermanentEvents();
            this.#permanentEventsBound = true;
        }

        if (!this.#battleInteractionManager) {
            console.error("BattleScreenUI: BattleInteractionManager não foi instanciado. O jogo foi configurado corretamente com setGameInstance?");
            if (this.#uiManager) this.#uiManager.navigateTo('home-screen');
            return;
        }
        this.#battleInteractionManager._unbindGameActions();

        $('#top-bar').addClass('battle-only');
        if (!this.#gameInstance || !this.#localPlayerId) {
            console.error('BattleScreenUI: gameInstance ou localPlayerId não definidos – abortando render.');
            this.#uiManager?.navigateTo('home-screen'); // Ou tela de erro/profile
            return;
        }
        console.log('BattleScreenUI: Rendering initial game state via BattleRenderer…');

        this.#battleRenderer.clearUI();
        this.#battleInteractionManager._resetInteractionModes();

        const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
        const opponent    = this.#gameInstance.getOpponent(this.#localPlayerId);

        if (!localPlayer || !opponent) {
            console.error('BattleScreenUI: jogadores não encontrados – abort.');
            this.#uiManager?.navigateTo('home-screen');
            return;
        }

        this.#battleRenderer.renderPlayerInfo(localPlayer, true);
        this.#battleRenderer.renderPlayerInfo(opponent,   false);
        this.#battleRenderer.renderPlayerHand(localPlayer);
        this.#battleRenderer.renderOpponentHand(opponent);
        this.#battleRenderer.updateDeckDisplay(localPlayer);
        this.#battleRenderer.updateDeckDisplay(opponent);
        this.#battleRenderer.updateGraveyardDisplay(localPlayer);
        this.#battleRenderer.updateGraveyardDisplay(opponent);
        this.#battleRenderer.renderBattlefield(localPlayer.battlefield, localPlayer.id);
        this.#battleRenderer.renderBattlefield(opponent.battlefield, opponent.id);

        this.#battleRenderer.updateTurnNumber(this.#gameInstance.turnNumber || 1);
        this._updatePhaseIndicator();
        this._updateCurrentPlayerIndicator();
        this._updateTurnControls(); // Este método agora depende de BattleInteractionManager

        this.#battleInteractionManager.bindGameActions();
        console.log('BattleScreenUI: Initial game state render complete.');
    }

    _bindPermanentEvents() {
        if (!this.#btnBackToProfile?.length) this._cacheEssentialSelectors(); // Lazy cache

        this.#btnBackToProfile?.off('click.gameoverbtn_ui').on('click.gameoverbtn_ui', () => {
            this.#audioManager?.playSFX('buttonClick');
            this.#battleRenderer.hideGameOver();
            this.#gameInstance = null; // Limpa referência ao jogo
            // Limpa o InteractionManager também, pois depende do gameInstance
            this.#battleInteractionManager?._unbindGameActions();
            this.#battleInteractionManager = null;
            this.#uiManager?.navigateTo('profile-screen');
            $('#top-bar').removeClass('battle-only');
        });

        $(document).off('keydown.battlescreen_esc_ui').on('keydown.battlescreen_esc_ui', (e) => {
            if (!this.#battleScreenElement?.hasClass('active')) return;
            if (e.key === "Escape") {
                this.#battleInteractionManager?.handleEscKey(); // Delega para InteractionManager
            }
        });
    }

    _bindGameEventListeners() {
         if (!this.#gameInstance) return;
         console.log("BattleScreenUI: Binding game event listeners...");
         const gameEvents = [
            'turnChange', 'phaseChange', 'playerStatsChanged', 'cardDrawn',
            'cardMoved', 'gameLog', 'creatureUpdate', 'damagePrevented',
            'creatureTookDamage', 'creatureHealed', 'gameOver', 'deckEmpty',
            'discardRequired', 'discardResolved', 'attackPhaseStart', 'attackersDeclared',
            'blockersDeclared', 'combatResolved', 'cardPlayed', 'gameStarted'
         ];
         gameEvents.forEach(eventName => {
             const handlerName = `_handle${eventName.charAt(0).toUpperCase() + eventName.slice(1)}`;
             if (typeof this[handlerName] === 'function') {
                 this.#gameInstance.removeEventListener(eventName, this[handlerName].bind(this));
                 this.#gameInstance.addEventListener(eventName, this[handlerName].bind(this));
             } else { console.warn(`BattleScreenUI: No handler found for game event '${eventName}'`); }
         });
    }

    // --- Handlers de Eventos do Jogo ---
    _handleTurnChange(e) {
        console.log("BattleScreenUI Event: Turn Change", e.detail);
        this._updateCurrentPlayerIndicator();
        this.#battleInteractionManager?.handleTurnChange();
        this._updateTurnControls();
        this.#battleRenderer.clearAllCardHighlights();
    }

    _handlePhaseChange(e) {
        console.log("BattleScreenUI Event: Phase Change", e.detail);
        this._updatePhaseIndicator();
        this.#battleInteractionManager?.handlePhaseChange();
        this._updateTurnControls();
    }

    _handlePlayerStatsChanged(e) {
        const player = this.#gameInstance?.getPlayer(e.detail.playerId);
        if (player) this.#battleRenderer.updatePlayerStats(player);
        if (e.detail.updates.maxMana !== undefined || e.detail.updates.mana !== undefined) {
            this._updateTurnControls();
        }
    }

    _handleCardDrawn(e) {
        const { playerId, card } = e.detail;
        if (playerId === this.#localPlayerId) {
            this.#battleRenderer.addCardToHandUI(card);
            this.#audioManager?.playSFX('cardDraw');
        } else {
            const opponent = this.#gameInstance?.getPlayer(playerId);
            if (opponent) this.#battleRenderer.renderOpponentHand(opponent);
        }
        const player = this.#gameInstance?.getPlayer(playerId);
        if (player) this.#battleRenderer.updateDeckDisplay(player);
        this._updateTurnControls();
    }

    _handleCardPlayed(e) { /* Apenas log ou SFX global, se necessário */ }

    _handleCardMoved(e) {
        const { cardUniqueId, cardData, fromZone, toZone, ownerId } = e.detail;
        const isLocal = ownerId === this.#localPlayerId;
        const player = this.#gameInstance?.getPlayer(ownerId); if (!player) return;

        // Remoção visual da zona de origem (simplificado, o renderer pode ser mais robusto)
        const fromContainerSelector = `#${isLocal ? 'player' : 'opponent'}-${fromZone.replace('battlefield', 'battlefield')}`; // Adapta nome da zona para ID do container
        this.#battleScreenElement.find(fromContainerSelector).find(`.card[data-card-unique-id="${cardUniqueId}"]`).remove();

        if (toZone === 'hand' && isLocal) this.#battleRenderer.addCardToHandUI(cardData);
        else if (toZone === 'battlefield') this.#battleRenderer.addCardToBattlefieldUI(cardData, ownerId);

        if (toZone === 'graveyard' && fromZone === 'hand') {
            this.#audioManager?.playSFX('cardDiscard');
            if (isLocal && this.#battleInteractionManager?.getPendingEOTDiscardCount() > 0) {
                // A lógica de decrementar o contador está agora implícita na resolução do descarte
                // o evento 'discardResolved' vai sinalizar para o InteractionManager.
            }
        } else if (toZone === 'battlefield' && fromZone === 'hand') {
            if (cardData?.type === 'Creature') this.#audioManager?.playSFX('playCreature');
            else if (cardData?.type === 'Instant') this.#audioManager?.playSFX('playInstant');
            else if (cardData?.type === 'Runebinding') this.#audioManager?.playSFX('playRunebinding');
        }

        const zonesToUpdate = new Set([fromZone, toZone]);
        if (zonesToUpdate.has('deck')) this.#battleRenderer.updateDeckDisplay(player);
        if (zonesToUpdate.has('graveyard')) this.#battleRenderer.updateGraveyardDisplay(player);
        if (zonesToUpdate.has('hand')) {
             if (isLocal) this._updateTurnControls();
             else if (player) this.#battleRenderer.renderOpponentHand(player);
        }
    }

    _handleGameLog(e) { this.#battleRenderer.addLogMessage(e.detail.message, e.detail.type || 'system'); }

    _handleCreatureUpdate(e) {
        const { cardUniqueId, updates } = e.detail;
        // Encontra o elemento da carta no DOM para passar ao renderer
        const $cardElement = this.#battleScreenElement.find(`.card[data-card-unique-id="${cardUniqueId}"]`);
        if ($cardElement.length) {
            // Delega a atualização visual para o renderer, mas pode precisar ser mais granular
            // O renderer poderia ter um método updateCardElement($cardElement, updates)
            // Por enquanto, fazendo aqui como antes, mas idealmente o renderer faria isso.
            if (updates.currentToughness !== undefined) $cardElement.find('.card-toughness').text(updates.currentToughness);
            if (updates.attack !== undefined) $cardElement.find('.card-attack').text(updates.attack);
            if (updates.isTapped !== undefined) $cardElement.toggleClass('tapped', updates.isTapped);
            if (updates.hasSummoningSickness !== undefined) $cardElement.toggleClass('has-summoning-sickness', updates.hasSummoningSickness);
            if (updates.statusEffects !== undefined) {
                $cardElement.toggleClass('shielded', !!updates.statusEffects['shielded']);
                $cardElement.toggleClass('silenced', !!updates.statusEffects['silenced'] || !!updates.statusEffects['cant_attack']);
            }
        }
    }
    _handleDamagePrevented(e) {
        const $card = this.#battleScreenElement.find(`.card[data-card-unique-id="${e.detail.target?.uniqueId}"]`);
        this.#battleRenderer.showCardFeedback($card, 'heal-flash'); // Ou um feedback específico de prevenção
        this.#battleRenderer.addLogMessage(`${e.detail.target?.name} preveniu ${e.detail.amount} dano.`, 'feedback');
    }
    _handleCreatureTookDamage(e) {
        const $card = this.#battleScreenElement.find(`.card[data-card-unique-id="${e.detail.creature?.uniqueId}"]`);
        this.#battleRenderer.showCardFeedback($card, 'damage-flash', e.detail.amount);
    }
    _handleCreatureHealed(e) {
        const $card = this.#battleScreenElement.find(`.card[data-card-unique-id="${e.detail.creature?.uniqueId}"]`);
        this.#battleRenderer.showCardFeedback($card, 'heal-flash', e.detail.amount);
    }
    _handleCombatResolved(e) {
        this.#battleRenderer.clearAllCardHighlights();
        this.#battleInteractionManager?._exitBlockerAssignmentMode();
        this.#battleInteractionManager?._exitAttackerDeclarationMode();
        this._updateTurnControls();
        this.#battleRenderer.addLogMessage("Combate resolvido.", "system");
    }
    _handleGameOver(e) {
        const { winnerId, winnerName, loserName } = e.detail;
        const isLocalWinner = winnerId === this.#localPlayerId;
        const msg = isLocalWinner ? `Vitória! Você derrotou ${loserName || 'o oponente'}!` : `Derrota! ${winnerName || 'O oponente'} venceu!`;
        this.#battleRenderer.showGameOver(msg);
        this.#battleInteractionManager?._disableAllGameActions();
        this.#audioManager?.playSFX(isLocalWinner ? 'gameOverWin' : 'gameOverLose');
        this.#audioManager?.stopBGM();
    }
    _handleDeckEmpty(e) {
        const name = this.#gameInstance?.getPlayer(e.detail.playerId)?.name || 'Jogador';
        this.#battleRenderer.addLogMessage(`${name} não pode comprar cartas!`, 'error');
    }
    _handleGameStarted(e) { setTimeout(() => this._updateTurnControls(), 0); }

    _handleDiscardRequired(e) {
        const { playerId, count } = e.detail;
        if (playerId === this.#localPlayerId && count > 0) {
            this.#battleInteractionManager?.onDiscardRequired(count);
        }
    }
    _handleDiscardResolved(e) {
        const { playerId } = e.detail;
        if (playerId === this.#localPlayerId) {
            this.#battleInteractionManager?.onDiscardResolved();
            this._updateTurnControls();
        }
    }
    _handleAttackPhaseStart(e) {
        this.#battleRenderer.clearAllCardHighlights();
        this.#battleInteractionManager?._exitBlockerAssignmentMode();
        this.#battleInteractionManager?._exitAttackerDeclarationMode();
        this._updateTurnControls();
    }
    _handleAttackersDeclared(e) {
        const { attackingPlayerId, attackers } = e.detail;
        this.#battleRenderer.clearAllCardHighlights();
        attackers.forEach(data => {
            const $card = this.#battleScreenElement.find(`.card[data-card-unique-id="${data.uniqueId}"]`);
            this.#battleRenderer.setCardAttackingVisual($card, true);
        });
        if (attackingPlayerId !== this.#localPlayerId) {
            this.#battleInteractionManager?.onOpponentAttackersDeclared();
        }
        this._updateTurnControls();
    }
    _handleBlockersDeclared(e) {
        const { declaredBlockers } = e.detail;
        this.#battleRenderer.clearAllCardHighlights();
        declaredBlockers.forEach(info => {
            const $card = this.#battleScreenElement.find(`.card[data-card-unique-id="${info.blockerId}"]`);
            this.#battleRenderer.setCardBlockingVisual($card, true);
        });
        this.#gameInstance?.getCombatManager().getAttackers().forEach(attacker => { // Marcar atacantes também
            const $card = this.#battleScreenElement.find(`.card[data-card-unique-id="${attacker.uniqueId}"]`);
            this.#battleRenderer.setCardAttackingVisual($card, true);
        });
        this._updateTurnControls();
    }

    // --- Métodos de Atualização da UI ---
    _updatePhaseIndicator() {
        if (!this.#gameInstance) return;
        const phase = this.#gameInstance.getCurrentPhase();
        const map = { 'mana': 'Mana', 'draw': 'Compra', 'main': 'Principal', 'attack': 'Ataque', 'end': 'Final' };
        this.#battleRenderer.updatePhaseIndicator(map[phase] || phase);
    }

    _updateCurrentPlayerIndicator() {
        if (!this.#gameInstance) return;
        const current = this.#gameInstance.getCurrentPlayer();
        const text = current?.id === this.#localPlayerId ? "Seu Turno" : "Turno Oponente";
        this.#battleRenderer.updateCurrentPlayerIndicator(text);
    }

    /**
     * Atualiza o estado visual dos botões de controle de turno.
     * Consulta o BattleInteractionManager para o estado dos modos de interação.
     */
    _updateTurnControls() {
        const interactionMgr = this.#battleInteractionManager; // Mantenha esta referência local

        // Adicione uma verificação para garantir que interactionMgr não é null ou undefined
        if (!this.#gameInstance || !this.#battleScreenElement?.hasClass('active') || !interactionMgr) {
            this.#battleRenderer.updateTurnControlsUI({
                passPhaseDisabled: true, endTurnDisabled: true, discardManaDisabled: true,
                confirmAttackVisible: false, confirmAttackDisabled: true,
                confirmBlocksVisible: false, confirmBlocksDisabled: true
            });
            return;
        }

        const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
        const isLocalTurn = this.#gameInstance.getCurrentPlayer()?.id === this.#localPlayerId;
        const currentPhase = this.#gameInstance.getCurrentPhase();
        const cmState = this.#gameInstance.getCombatManager().state;
        const gameState = this.#gameInstance.state;

        // >>> CORREÇÃO AQUI <<<
        const isUIActionModeActive = interactionMgr.isSelectingDiscardMana() || // Use o getter
                                     interactionMgr.isSelectingTarget() ||     // Use o getter
                                     interactionMgr.isDeclaringAttackers() ||  // Use o getter
                                     interactionMgr.isAssigningBlockers() ||   // Use o getter
                                     interactionMgr.getPendingEOTDiscardCount() > 0; // Use o getter

        const controlsState = {
            passPhaseDisabled: !isLocalTurn || isUIActionModeActive || gameState !== 'playing',
            endTurnDisabled: !isLocalTurn || isUIActionModeActive || gameState !== 'playing',
            discardManaDisabled: !isLocalTurn || isUIActionModeActive || gameState !== 'playing' ||
                                 (localPlayer?.hasDiscardedForMana ?? true) ||
                                 (localPlayer?.maxMana ?? 10) >= 10 ||
                                 (localPlayer?.hand.getSize() ?? 0) === 0 ||
                                 interactionMgr.isSelectingDiscardMana(), // Use o getter
            confirmAttackVisible: isLocalTurn && currentPhase === 'attack' && cmState === 'none' && !isUIActionModeActive,
            confirmAttackDisabled: interactionMgr.getSelectedAttackerIds().size === 0, // Use o getter
            confirmBlocksVisible: !isLocalTurn && currentPhase === 'attack' && cmState === 'declare_blockers' && !isUIActionModeActive,
            // Ajuste na lógica de confirmBlocksDisabled para refletir se há bloqueios ou se está simplesmente habilitado
            confirmBlocksDisabled: !(!isLocalTurn && currentPhase === 'attack' && cmState === 'declare_blockers' && !isUIActionModeActive)
                                    // Se o botão está visível, geralmente está habilitado,
                                    // a menos que você queira desabilitá-lo se nenhum bloqueio foi feito (Object.keys(interactionMgr.getBlockerAssignmentsUI()).length === 0)
                                    // Vamos manter como estava por enquanto: habilitado se visível.
        };
        this.#battleRenderer.updateTurnControlsUI(controlsState);
    }

    // _checkIfValidTarget é um método que BattleInteractionManager pode precisar.
    // Se ele só usa gameInstance e localPlayerId, pode ser passado ou BattleScreenUI pode expô-lo.
    // Por enquanto, o InteractionManager pode chamar este método em BattleScreenUI.
    _checkIfValidTarget(targetId, targetOwnerId, actionPendingTarget) {
        if (!actionPendingTarget || !targetId || !this.#gameInstance || !this.#cardDatabase) return false;
        const targetCardInstance = this.#gameInstance.findCardInstance(targetId);
        if (!targetCardInstance) return false;

        // O 'actionPendingTarget.targetType' vem da propriedade 'targetType' da CARTA que está sendo jogada.
        // Esta propriedade 'targetType' na carta (ex: em InstantCard) deve retornar uma string como 'creature', 'opponent_creature'.
        const requiredTypeFromCard = actionPendingTarget.targetType;

        switch (requiredTypeFromCard) {
            case 'creature': // Alveja qualquer criatura no campo
                return targetCardInstance.type === 'Creature' && targetCardInstance.location === 'battlefield';
            case 'opponent_creature':
                return targetCardInstance.type === 'Creature' && targetCardInstance.location === 'battlefield' && targetCardInstance.ownerId !== this.#localPlayerId;
            case 'own_creature':
                return targetCardInstance.type === 'Creature' && targetCardInstance.location === 'battlefield' && targetCardInstance.ownerId === this.#localPlayerId;
            case 'runebinding': // Alveja qualquer runebinding no campo
                 return targetCardInstance.type === 'Runebinding' && targetCardInstance.location === 'battlefield';
            // Adicione mais casos conforme os targetTypes definidos em suas cartas
            // case 'player': return targetId === this.#localPlayerId || targetId === this.#gameInstance.getOpponent(this.#localPlayerId)?.id;
            // case 'opponent_player': return targetId === this.#gameInstance.getOpponent(this.#localPlayerId)?.id;
            default:
                console.warn(`BattleScreenUI: Unhandled targetType in _checkIfValidTarget: '${requiredTypeFromCard}' from card '${actionPendingTarget.cardName}'`);
                return false;
        }
    }
}