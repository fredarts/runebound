// js/ui/screens/BattleScreenUI.js
// VERSÃO ATUALIZADA: Usa o GraveyardModal global e possui lógica de fechamento hierárquica para a tecla ESC.

// Importações dos módulos necessários
// import GraveyardModalUI from '../GraveyardModalUI.js'; // >>> [CORREÇÃO] <<< REMOVIDO: Não criamos mais uma instância aqui.
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
    // #graveyardModalUI; // >>> [CORREÇÃO] <<< REMOVIDO: Usaremos a instância global window.GraveyardModal

    // --- Estado do Jogo (Recebido) ---
    #gameInstance = null;
    #localPlayerId = null;

    #permanentEventsBound = false;
    #zoomObserver = null;

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
        
        // >>> [CORREÇÃO] <<< A linha que criava `new GraveyardModalUI()` foi removida.
        
        this._cacheEssentialSelectors();
        if (!this.#battleScreenElement || !this.#battleScreenElement.length) {
            console.error("BattleScreenUI Error: #battle-screen element not found!");
            return;
        }
        console.log("BattleScreenUI (com Graveyard Global e ESC hierárquico) inicializado.");
    }

    _cacheEssentialSelectors() {
        this.#battleScreenElement = $('#battle-screen');
        if (!this.#battleScreenElement.length) return;
        this.#gameOverOverlayElement = this.#battleScreenElement.find('#game-over-overlay');
        this.#btnBackToProfile = this.#battleScreenElement.find('#btn-back-to-profile');
    }

    setGameInstance(gameInstance) {
        this.#gameInstance = gameInstance;
        if (this.#gameInstance) {
            this.#battleInteractionManager = new BattleInteractionManager(
                this.#gameInstance, this, this.#battleRenderer, this.#audioManager, this.#zoomHandler
            );
            if (this.#localPlayerId) {
                 this.#battleInteractionManager.setLocalPlayerId(this.#localPlayerId);
            }
            this._bindGameEventListeners();
        } else {
            this.#battleInteractionManager?._unbindGameActions();
            this.#battleInteractionManager = null;
        }
    }

    setLocalPlayer(playerId) {
        this.#localPlayerId = playerId;
        this.#battleRenderer.setLocalPlayerId(playerId);
        this.#battleInteractionManager?.setLocalPlayerId(playerId);
    }

    renderInitialState() {
        if (!this.#battleScreenElement?.length && !this._cacheEssentialSelectors()) {
             console.error("BattleScreenUI Render Error: Root element not found after re-cache."); return;
        }

        if (!this.#permanentEventsBound) {
            this._bindPermanentEvents();
            this.#permanentEventsBound = true;
        }

        if (!this.#battleInteractionManager) {
            console.error("BattleScreenUI: BattleInteractionManager não foi instanciado. Chame setGameInstance primeiro.");
            if (this.#uiManager) this.#uiManager.navigateTo('home-screen');
            return;
        }
        this.#battleInteractionManager._unbindGameActions();

        $('#top-bar').addClass('battle-only');
        if (!this.#gameInstance || !this.#localPlayerId) {
            console.error('BattleScreenUI: gameInstance ou localPlayerId não definidos – abortando render.');
            this.#uiManager?.navigateTo('home-screen');
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
        this._updateTurnControls();

        this.#battleInteractionManager.bindGameActions();
        console.log('BattleScreenUI: Initial game state render complete.');
    }

    _bindPermanentEvents() {
        if (!this.#btnBackToProfile?.length && this.#battleScreenElement?.length) this._cacheEssentialSelectors();

        const graveyardNamespace = '.battlescreen_graveyard';
        const graveyardSelectors = '.graveyard-zone, #player-graveyard-img, #opponent-graveyard-img';

        this.#battleScreenElement.off(graveyardNamespace);

        // >>> [CORREÇÃO] <<< Lógica de abertura do cemitério usando a instância global
        this.#battleScreenElement.on(`contextmenu${graveyardNamespace} click${graveyardNamespace}`, graveyardSelectors, (e) => {
            if (e.type === 'click' && !e.shiftKey) return;
            e.preventDefault();
            
            const isOpponentGraveyard = $(e.currentTarget).closest('.player-area').hasClass('opponent');
            const targetSelector = isOpponentGraveyard ? 'opponent' : 'current';
            
            if (window.GraveyardModal) {
                console.log(`[BattleScreenUI] Abrindo cemitério para: '${targetSelector}'`);
                window.GraveyardModal.open(targetSelector, {
                    ownerLabel: isOpponentGraveyard ? 'Oponente' : 'Você'
                });
            } else {
                console.warn('[BattleScreenUI] Não foi possível abrir o cemitério: window.GraveyardModal não encontrado.');
            }
        });
        
        // BOTÃO DE FIM DE JOGO
        this.#btnBackToProfile?.off('click.gameoverbtn_ui').on('click.gameoverbtn_ui', () => {
            this.#audioManager?.playSFX('buttonClick');
            this.#battleRenderer.hideGameOver();
            this.#gameInstance = null;
            this.#battleInteractionManager?._unbindGameActions();
            this.#battleInteractionManager = null;
            if (this.#zoomObserver) { this.#zoomObserver.disconnect(); this.#zoomObserver = null; }
            this.#uiManager?.navigateTo('profile-screen');
            $('#top-bar').removeClass('battle-only');
        });

        // LÓGICA HIERÁRQUICA DA TECLA ESC
        $(document).off('keydown.battlescreen_esc_ui').on('keydown.battlescreen_esc_ui', (e) => {
            if (e.key !== "Escape" || !this.#battleScreenElement?.hasClass('active')) {
                return;
            }

            // O `GraveyardController` (em graveyardModalTemplate.js) já usa `ModalStack`
            // e se registrará como o modal do topo. O `ModalStack` cuidará do ESC para ele.
            // Portanto, não precisamos de uma verificação explícita aqui. Se houver um modal
            // na pilha, o `ModalStack` o fechará. Se não, o código abaixo será executado.
            
            if (window.ModalStack && window.ModalStack.hasActive()) {
                // Deixa o ModalStack lidar com isso. Não fazemos nada aqui.
                return;
            }

            // Se nenhum modal estiver aberto (pilha vazia), a tecla ESC cancela ações do jogo.
            this.#battleInteractionManager?.handleEscKey();
        });

        // Observador do Zoom
        const zoomOverlayNode = document.getElementById('battle-image-zoom-overlay');
        if (zoomOverlayNode) {
            const observerCallback = (mutationsList) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const targetElement = $(mutation.target);
                        if (mutation.oldValue?.includes('active') && !targetElement.hasClass('active') && this.#battleScreenElement?.hasClass('active')) {
                            setTimeout(() => this.#battleInteractionManager?.refreshVisualHighlights(), 50);
                        }
                    }
                }
            };
            this.#zoomObserver = new MutationObserver(observerCallback);
            this.#zoomObserver.observe(zoomOverlayNode, { attributes: true, attributeOldValue: true, attributeFilter: ['class'] });
        } else {
            console.warn("BattleScreenUI: Não foi possível encontrar #battle-image-zoom-overlay para o MutationObserver.");
        }
    }
    
    // O resto do arquivo (todos os _handleEvent, _updatePhaseIndicator, etc.) permanece exatamente o mesmo.
    // ... (cole o resto do seu arquivo BattleScreenUI.js aqui, sem alterações) ...
    _bindGameEventListeners() {
         if (!this.#gameInstance) return;
         console.log("BattleScreenUI: Binding game event listeners...");
         const gameEvents = [
            'turnChange', 'phaseChange', 'playerStatsChanged', 'cardDrawn',
            'cardMoved', 'gameLog', 'creatureUpdate', 'damagePrevented',
            'creatureTookDamage', 'creatureHealed', 'gameOver', 'deckEmpty',
            'discardRequired', 'discardResolved', 'attackPhaseStart', 'attackersDeclared',
            'blockersDeclared', 'combatResolved', 'cardPlayed', 'gameStarted', 'noBlockersPossible'
         ];
         gameEvents.forEach(eventName => {
             const handlerName = `_handle${eventName.charAt(0).toUpperCase() + eventName.slice(1)}`;
             if (typeof this[handlerName] === 'function') {
                 const boundHandler = this[handlerName].bind(this);
                 this.#gameInstance.removeEventListener(eventName, boundHandler);
                 this.#gameInstance.addEventListener(eventName, boundHandler);
             } else { console.warn(`BattleScreenUI: No handler found for game event '${eventName}'`); }
         });
    }

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
        //console.log("BattleUI Event: Player Stats Changed", e.detail);
        const player = this.#gameInstance?.getPlayer(e.detail.playerId);
        if (player) this.#battleRenderer.updatePlayerStats(player);
        if (e.detail.updates.maxMana !== undefined || e.detail.updates.mana !== undefined || e.detail.updates.life !== undefined) {
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

    _handleCardPlayed(e) { /* Placeholder para sons ou lógicas futuras */ }

    _handleCardMoved(e) {
        const { cardUniqueId, cardData, fromZone, toZone, ownerId } = e.detail;
        const isLocal = ownerId === this.#localPlayerId;
        const player = this.#gameInstance?.getPlayer(ownerId); if (!player) return;

        const fromContainerSelector = `#${isLocal ? 'player' : 'opponent'}-${fromZone.replace('battlefield', 'battlefield')}`;
        this.#battleScreenElement.find(fromContainerSelector).find(`.card[data-card-unique-id="${cardUniqueId}"]`).remove();

        if (toZone === 'hand' && isLocal) this.#battleRenderer.addCardToHandUI(cardData);
        else if (toZone === 'battlefield') this.#battleRenderer.addCardToBattlefieldUI(cardData, ownerId);

        if (toZone === 'graveyard' && fromZone === 'hand') {
            this.#audioManager?.playSFX('cardDiscard');
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
        const $cardElement = this.#battleScreenElement.find(`.card[data-card-unique-id="${cardUniqueId}"]`);
        if ($cardElement.length) {
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
        this.#battleRenderer.showCardFeedback($card, 'heal-flash');
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

    _handleNoBlockersPossible(e) {
        console.log("BattleScreenUI Event: No Blockers Possible. Updating turn controls.");
        this.#battleRenderer.addLogMessage("Oponente sem bloqueadores. Ataque direto.", "system");
        this._updateTurnControls();
    }

    _handleCombatResolved(e) {
        console.log("BattleScreenUI Event: Combat Resolved", e.detail);
        this.#battleRenderer.clearAllCardHighlights();
        this.#battleInteractionManager?._exitBlockerAssignmentMode();
        this.#battleInteractionManager?._exitAttackerDeclarationMode();
        this.#battleInteractionManager?.refreshVisualHighlights();
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

    _handleGameStarted(e) {
        setTimeout(() => this._updateTurnControls(), 50);
    }

    _handleDiscardRequired(e) {
        const { playerId, count } = e.detail;
        if (playerId === this.#localPlayerId && count > 0) {
            this.#battleInteractionManager?.onDiscardRequired(count);
             this._updateTurnControls();
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
        if (this.#gameInstance?.getCurrentPlayer()?.id === this.#localPlayerId) {
            this.#battleInteractionManager?._enterAttackerDeclarationMode();
        }
        this._updateTurnControls();
    }

    _handleAttackersDeclared(e) {
        const { attackingPlayerId, attackers } = e.detail;
        console.log(`BattleScreenUI: Attackers declared by ${attackingPlayerId}. Local player is ${this.#localPlayerId}`);
        this.#battleRenderer.clearAllCardHighlights();
        attackers.forEach(data => {
            const $card = this.#battleScreenElement.find(`.card[data-card-unique-id="${data.uniqueId}"]`);
            if ($card.length) this.#battleRenderer.setCardAttackingVisual($card, true);
        });

        if (attackingPlayerId !== this.#localPlayerId) {
            console.log("BattleScreenUI: Opponent declared attackers. Entering blocker assignment mode for local player.");
            this.#battleInteractionManager?.onOpponentAttackersDeclared();
        } else {
             console.log("BattleScreenUI: Local player declared attackers. Waiting for opponent.");
        }
        this._updateTurnControls();
    }

    _handleBlockersDeclared(e) {
        const { defendingPlayerId, declaredBlockers } = e.detail;
        console.log(`BattleScreenUI: Blockers declared by ${defendingPlayerId}.`);
        this.#battleRenderer.clearAllCardHighlights();

        declaredBlockers.forEach(info => {
            const $card = this.#battleScreenElement.find(`.card[data-card-unique-id="${info.blockerId}"]`);
            if ($card.length) this.#battleRenderer.setCardBlockingVisual($card, true);
        });
        this.#gameInstance?.getCombatManager().getAttackers().forEach(attacker => {
            const $card = this.#battleScreenElement.find(`.card[data-card-unique-id="${attacker.uniqueId}"]`);
            if ($card.length) this.#battleRenderer.setCardAttackingVisual($card, true);
        });

        if (defendingPlayerId === this.#localPlayerId) {
            this.#battleInteractionManager?._exitBlockerAssignmentMode();
        }
    }

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

    _updateTurnControls() {
        const game = this.#gameInstance;
        if (!game) return;

        const phase        = game.getCurrentPhase();
        const activePlayer = game.getCurrentPlayer();
        if (!activePlayer) return;

        const isMyTurn     = activePlayer.id === this.#localPlayerId;
        const interaction  = this.#battleInteractionManager;
        if (!interaction) return;

        const combatState  = game.getCombatManager()?.state;

        let passPhaseVis = false, passPhaseDis = true;
        let endTurnVis   = false, endTurnDis   = true;
        let confirmAtkVis = false, confirmAtkDis = true;
        let confirmBlkVis = false, confirmBlkDis = true;
        let discardManaVis = false, discardManaDis = true;
        const cancelDiscardVis = (interaction.isSelectingDiscardMana?.() ?? false)
                            || (interaction.isSelectingTarget?.()      ?? false);

        if (isMyTurn) {
            passPhaseVis = true;  passPhaseDis = false;
            endTurnVis   = true;  endTurnDis   = false;

            if (phase === 'main' &&
                !activePlayer.hasDiscardedForMana &&
                activePlayer.maxMana < 10 &&
                activePlayer.hand.getSize() > 0) {
                discardManaVis = true;  discardManaDis = false;
            }

            if (phase === 'attack') {
                const atkMode = interaction.isDeclaringAttackers();
                if (atkMode) {
                    const anySel = interaction.getSelectedAttackerIds().size > 0;
                    confirmAtkVis = anySel;
                    confirmAtkDis = !anySel;
                    passPhaseDis  = anySel;
                    endTurnDis    = anySel;
                } else if (combatState === 'declare_blockers') {
                    passPhaseDis = true;
                    endTurnDis   = true;
                    discardManaVis = false;
                }
            }

            if (cancelDiscardVis || interaction.getPendingEOTDiscardCount() > 0) {
                passPhaseDis   = true;
                endTurnDis     = true;
                discardManaDis = true;
            }
            if (interaction.getPendingEOTDiscardCount() > 0) {
                passPhaseVis = endTurnVis = discardManaVis =
                confirmAtkVis = confirmBlkVis = false;
            }
        } else {
            if (phase === 'attack' && combatState === 'declare_blockers') {
                passPhaseVis = true;
                passPhaseDis = false;

                if (interaction.isAssigningBlockers()) {
                    const assignmentsMade =
                        Object.keys(interaction.getBlockerAssignmentsUI()).length > 0;
                    confirmBlkVis = true;
                    confirmBlkDis = !assignmentsMade;
                } else {
                    confirmBlkVis = false;
                    confirmBlkDis = true;
                }
            }
        }

        const $ = this.#battleScreenElement;
        $.find('#btn-pass-phase')     .toggle(passPhaseVis)  .prop('disabled', passPhaseDis);
        $.find('#btn-end-turn')       .toggle(endTurnVis)    .prop('disabled', endTurnDis);
        $.find('#btn-confirm-attack') .toggle(confirmAtkVis) .prop('disabled', confirmAtkDis);
        $.find('#btn-confirm-blocks') .toggle(confirmBlkVis) .prop('disabled', confirmBlkDis);
        $.find('#btn-discard-mana')   .toggle(discardManaVis).prop('disabled', discardManaDis);
        $.find('#btn-cancel-discard') .toggle(cancelDiscardVis);
    }

    _checkIfValidTarget(targetId, targetOwnerId, actionPendingTarget) {
        if (!actionPendingTarget || !targetId || !this.#gameInstance ) return false;
        const targetCardInstance = this.#gameInstance.findCardInstance(targetId);
        if (!targetCardInstance) return false;
        const requiredTypeFromAction = actionPendingTarget.targetType;
        switch (requiredTypeFromAction) {
            case 'creature':
                return targetCardInstance.type === 'Creature' && targetCardInstance.location === 'battlefield';
            case 'opponent_creature':
                return targetCardInstance.type === 'Creature' && targetCardInstance.location === 'battlefield' && targetCardInstance.ownerId !== this.#localPlayerId;
            case 'own_creature':
                return targetCardInstance.type === 'Creature' && targetCardInstance.location === 'battlefield' && targetCardInstance.ownerId === this.#localPlayerId;
            case 'runebinding':
                 return targetCardInstance.type === 'Runebinding' && targetCardInstance.location === 'battlefield';
            default:
                console.warn(`BattleScreenUI: Unhandled targetType in _checkIfValidTarget: '${requiredTypeFromAction}' from card '${actionPendingTarget.cardName}'`);
                return false;
        }
    }

    destroy() {
        console.log("BattleScreenUI: Destroying...");
        const namespace = '.battlescreen_ui';
        this.#battleScreenElement?.off(namespace);
        $(document).off(`keydown${namespace}_esc_ui`);

        if (this.#zoomObserver) {
            this.#zoomObserver.disconnect();
            this.#zoomObserver = null;
        }

        this.#battleInteractionManager?._unbindGameActions();
        this.#battleInteractionManager = null;
        this.#gameInstance = null;
        
        this.#battleScreenElement = null;
        this.#gameOverOverlayElement = null;
        this.#btnBackToProfile = null;
        
        this.#permanentEventsBound = false;
        console.log("BattleScreenUI: Destroy complete.");
    }
}