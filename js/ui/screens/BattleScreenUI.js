// js/ui/screens/BattleScreenUI.js

import CardRenderer from '../helpers/CardRenderer.js';
import ZoomHandler from '../helpers/ZoomHandler.js';
import BattleRenderer from './battle/BattleRenderer.js';
import BattleInteractionManager from './battle/BattleInteractionManager.js';
import CreatureCard from '../../core/CreatureCard.js';

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
        
        this._cacheEssentialSelectors();
        if (!this.#battleScreenElement || !this.#battleScreenElement.length) {
            console.error("BattleScreenUI Error: #battle-screen element not found!");
            return;
        }
        console.log("BattleScreenUI refatorado inicializado.");
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
        if (!this.#battleScreenElement?.length) this._cacheEssentialSelectors();
        if (!this.#battleScreenElement?.length) {
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
        this.#battleInteractionManager._unbindGameActions(); // Garante que os listeners antigos sejam removidos

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
        this._updateTurnControls(); // Chama para configurar os botões iniciais

        this.#battleInteractionManager.bindGameActions(); // Liga os listeners de interação
        console.log('BattleScreenUI: Initial game state render complete.');
    }

    _bindPermanentEvents() {
        if (!this.#btnBackToProfile?.length && this.#battleScreenElement?.length) this._cacheEssentialSelectors();

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

        $(document).off('keydown.battlescreen_esc_ui').on('keydown.battlescreen_esc_ui', (e) => {
            if (!this.#battleScreenElement?.hasClass('active')) return;
            if (e.key === "Escape") {
                this.#battleInteractionManager?.handleEscKey();
            }
        });

        const zoomOverlayNode = document.getElementById('battle-image-zoom-overlay'); 
        if (zoomOverlayNode) {
            const observerCallback = (mutationsList, observer) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const targetElement = $(mutation.target);
                        const wasActive = mutation.oldValue?.includes('active');
                        const isNowInactive = !targetElement.hasClass('active');

                        if (wasActive && isNowInactive && this.#battleScreenElement?.hasClass('active')) {
                            console.log("BattleScreenUI: Zoom overlay ('battle-image-zoom-overlay') foi fechado. Refrescando destaques.");
                            setTimeout(() => {
                                 this.#battleInteractionManager?.refreshVisualHighlights();
                            }, 50);
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

    _bindGameEventListeners() {
         if (!this.#gameInstance) return;
         console.log("BattleScreenUI: Binding game event listeners...");
         const gameEvents = [
            'turnChange', 'phaseChange', 'playerStatsChanged', 'cardDrawn',
            'cardMoved', 'gameLog', 'creatureUpdate', 'damagePrevented',
            'creatureTookDamage', 'creatureHealed', 'gameOver', 'deckEmpty',
            'discardRequired', 'discardResolved', 'attackPhaseStart', 'attackersDeclared',
            'blockersDeclared', 'combatResolved', 'cardPlayed', 'gameStarted', 'noBlockersPossible' // Adicionado noBlockersPossible
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

    // --- Handlers de Eventos do Jogo ---
    _handleTurnChange(e) {
        console.log("BattleScreenUI Event: Turn Change", e.detail);
        this._updateCurrentPlayerIndicator();
        this.#battleInteractionManager?.handleTurnChange(); // Reseta modos de interação
        this._updateTurnControls(); // Atualiza botões para o novo jogador ativo
        this.#battleRenderer.clearAllCardHighlights();
    }

    _handlePhaseChange(e) {
        console.log("BattleScreenUI Event: Phase Change", e.detail);
        this._updatePhaseIndicator();
        this.#battleInteractionManager?.handlePhaseChange(); // Reseta modos de interação
        this._updateTurnControls(); // Atualiza botões para a nova fase
    }

    _handlePlayerStatsChanged(e) {
        console.log("BattleUI Event: Player Stats Changed", e.detail);
        const player = this.#gameInstance?.getPlayer(e.detail.playerId);
        if (player) this.#battleRenderer.updatePlayerStats(player);
        // Se mana ou vida mudou, pode afetar a disponibilidade de botões/ações
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
        this._updateTurnControls(); // Mão pode afetar descarte por mana
    }

    _handleCardPlayed(e) { /* Somente logs ou SFX globais */ }

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
             if (isLocal) this._updateTurnControls(); // Atualiza botões se a mão do jogador local mudou
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
        // Este evento é emitido pelo CombatManager quando o defensor não tem como bloquear.
        // O combate já foi resolvido pelo CombatManager. A UI só precisa atualizar os controles.
        console.log("BattleScreenUI Event: No Blockers Possible. Updating turn controls.");
        this.#battleRenderer.addLogMessage("Oponente sem bloqueadores. Ataque direto.", "system");
        this._updateTurnControls(); // Garante que os botões do atacante sejam reabilitados
    }

    _handleCombatResolved(e) {
        console.log("BattleScreenUI Event: Combat Resolved", e.detail);
        this.#battleRenderer.clearAllCardHighlights();
        this.#battleInteractionManager?._exitBlockerAssignmentMode();
        this.#battleInteractionManager?._exitAttackerDeclarationMode();
        this.#battleInteractionManager?.refreshVisualHighlights(); 
        this._updateTurnControls(); // Atualiza botões após o combate
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
        // A primeira chamada a _updateTurnControls acontece em renderInitialState
        // Mas pode ser útil chamar aqui também se houver alguma lógica de estado que muda no gameStarted
        setTimeout(() => this._updateTurnControls(), 50); 
    }

    _handleDiscardRequired(e) {
        const { playerId, count } = e.detail;
        if (playerId === this.#localPlayerId && count > 0) {
            this.#battleInteractionManager?.onDiscardRequired(count); // BIM gerencia o modo de descarte
             this._updateTurnControls(); // Atualiza os botões, pois o descarte pode bloquear outras ações
        }
    }
    _handleDiscardResolved(e) {
        const { playerId } = e.detail;
        if (playerId === this.#localPlayerId) {
            this.#battleInteractionManager?.onDiscardResolved(); // BIM sai do modo de descarte
            this._updateTurnControls(); // Reabilita botões
        }
    }
    _handleAttackPhaseStart(e) {
        this.#battleRenderer.clearAllCardHighlights();
        if (this.#gameInstance?.getCurrentPlayer()?.id === this.#localPlayerId) {
            this.#battleInteractionManager?._enterAttackerDeclarationMode();
        }
        this._updateTurnControls(); // Atualiza botões para a fase de ataque
    }
    _handleAttackersDeclared(e) {
        const { attackingPlayerId, attackers } = e.detail;
        console.log(`BattleScreenUI: Attackers declared by ${attackingPlayerId}. Local player is ${this.#localPlayerId}`);
        this.#battleRenderer.clearAllCardHighlights();
        attackers.forEach(data => {
            const $card = this.#battleScreenElement.find(`.card[data-card-unique-id="${data.uniqueId}"]`);
            if ($card.length) this.#battleRenderer.setCardAttackingVisual($card, true);
        });

        if (attackingPlayerId !== this.#localPlayerId) { // Se o oponente declarou atacantes
            console.log("BattleScreenUI: Opponent declared attackers. Entering blocker assignment mode for local player.");
            this.#battleInteractionManager?.onOpponentAttackersDeclared(); // BIM entra no modo de bloqueio
        } else {
             console.log("BattleScreenUI: Local player declared attackers. Waiting for opponent.");
        }
        this._updateTurnControls(); // Atualiza botões para refletir o novo estado do combate
    }

    _handleBlockersDeclared(e) {
        const { defendingPlayerId, declaredBlockers } = e.detail; // defendingPlayerId é quem declarou
        console.log(`BattleScreenUI: Blockers declared by ${defendingPlayerId}.`);
        this.#battleRenderer.clearAllCardHighlights();
        
        // Visualizar os bloqueadores
        declaredBlockers.forEach(info => {
            const $card = this.#battleScreenElement.find(`.card[data-card-unique-id="${info.blockerId}"]`);
            if ($card.length) this.#battleRenderer.setCardBlockingVisual($card, true);
        });
        // Manter visual dos atacantes
        this.#gameInstance?.getCombatManager().getAttackers().forEach(attacker => {
            const $card = this.#battleScreenElement.find(`.card[data-card-unique-id="${attacker.uniqueId}"]`);
            if ($card.length) this.#battleRenderer.setCardAttackingVisual($card, true);
        });

        // Se foi o jogador local quem declarou os bloqueios, ele sai do modo.
        if (defendingPlayerId === this.#localPlayerId) {
            this.#battleInteractionManager?._exitBlockerAssignmentMode(); 
        }
        // O combate será resolvido pelo CombatManager, que emitirá 'combatResolved'.
        // _updateTurnControls será chamado por 'combatResolved'.
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
        const phase = game.getCurrentPhase();
        const activePlayer = game.getCurrentPlayer();
        if (!activePlayer) return;
        const isMyTurn = activePlayer.id === this.#localPlayerId;

        const interactionMgr = this.#battleInteractionManager;
        if (!interactionMgr) return;

        // Não precisamos mais de 'blockMode' diretamente para a visibilidade do 'Passar Fase' do defensor
        // const blockMode = interactionMgr.isAssigningBlockers();
        const atkMode = interactionMgr.isDeclaringAttackers();
        const discardManaMode = interactionMgr.isSelectingDiscardMana?.() ?? false;
        const isSelectingTarget = interactionMgr.isSelectingTarget?.() ?? false;
        const combatMgrState = game.getCombatManager()?.state;

        // --- Flags Padrão ---
        let passPhaseVisible = false;
        let passPhaseDisabled = true;
        let endTurnVisible = false;
        let endTurnDisabled = true;
        let confirmAttackVisible = false;
        let confirmAttackDisabled = true;
        let confirmBlocksVisible = false;
        let confirmBlocksDisabled = true;
        let discardManaVisible = false;
        let discardManaDisabled = true;
        let cancelDiscardVisible = discardManaMode || isSelectingTarget;

        // --- Lógica de Visibilidade e Habilitação ---
        if (isMyTurn) {
            // ... (lógica para o turno do jogador local - mantém como estava) ...
            passPhaseVisible = true;
            passPhaseDisabled = false;
            endTurnVisible = true;
            endTurnDisabled = false;

            if (phase === 'main' && !activePlayer.hasDiscardedForMana && activePlayer.maxMana < 10 && activePlayer.hand.getSize() > 0) {
                discardManaVisible = true;
                discardManaDisabled = false;
            }

            if (phase === 'attack') {
                if (atkMode) {
                    const hasSelection = interactionMgr.getSelectedAttackerIds().size > 0;
                    confirmAttackVisible  = true;
                    confirmAttackDisabled = !hasSelection;
                    passPhaseDisabled = hasSelection;
                    endTurnDisabled   = hasSelection;
                } else if (combatMgrState === 'none' || combatMgrState === 'resolving') {
                    // Combate resolvido ou sem ataque, pode passar/finalizar.
                } else if (combatMgrState === 'declare_blockers') {
                    // Oponente (IA) está declarando bloqueadores, jogador local espera.
                    passPhaseDisabled = true;
                    endTurnDisabled = true;
                    discardManaVisible = false;
                }
            }

            if (discardManaMode || isSelectingTarget || interactionMgr.getPendingEOTDiscardCount() > 0) {
                passPhaseDisabled = true;
                endTurnDisabled = true;
                discardManaDisabled = true;
            }
            if (interactionMgr.getPendingEOTDiscardCount() > 0) {
                 passPhaseVisible = false;
                 endTurnVisible = false;
                 discardManaVisible = false;
                 cancelDiscardVisible = false;
                 confirmAttackVisible = false;
                 confirmBlocksVisible = false;
            }

        } else { // É o turno do oponente
            // Verifica se o jogador local está no modo de DEFENDER um ataque
            // AGORA, O BOTÃO PASSAR FASE APARECE ASSIM QUE O OPONENTE ATACA (cmState === 'declare_blockers')
            if (phase === 'attack' && combatMgrState === 'declare_blockers') {
                passPhaseVisible = true;
                passPhaseDisabled = false;

                // Botão "Confirmar Bloqueios" ainda pode aparecer se o jogador decidir interagir
                // A variável blockMode (interactionMgr.isAssigningBlockers()) ainda é útil aqui.
                const blockMode = interactionMgr.isAssigningBlockers();
                if (blockMode) { // Ou seja, o jogador já clicou em algo para iniciar o bloqueio
                    confirmBlocksVisible  = true;
                    const assignmentsMade = Object.keys(interactionMgr.getBlockerAssignmentsUI()).length > 0;
                    // Poderia deixar confirmBlocksDisabled = false sempre, para permitir confirmar 0 bloqueios após entrar no modo
                    // Ou manter a lógica que exige uma seleção/atribuição
                    const attackerSelectedForBlocking = interactionMgr.getSelectedAttackerForBlocking() !== null;
                    confirmBlocksDisabled = !assignmentsMade && !attackerSelectedForBlocking; // Habilita se houver atribuições OU um atacante selecionado para bloquear
                } else {
                    // Se o jogador ainda não interagiu para bloquear, o botão Confirmar Bloqueios pode ficar oculto
                    // ou visível mas desabilitado. Por agora, oculto.
                    confirmBlocksVisible = false;
                    confirmBlocksDisabled = true;
                }

                endTurnVisible = false;
                discardManaVisible = false;
                confirmAttackVisible = false;
                cancelDiscardVisible = false;
            } else {
                // Turno do oponente, mas não estamos no cenário de declarar bloqueadores.
                passPhaseVisible = false;
                endTurnVisible = false;
                discardManaVisible = false;
                confirmAttackVisible = false;
                confirmBlocksVisible = false;
                cancelDiscardVisible = false;
            }
        }

        const $btnPassPhase      = this.#battleScreenElement.find('#btn-pass-phase');
        const $btnEndTurn        = this.#battleScreenElement.find('#btn-end-turn');
        const $btnConfirmAttack  = this.#battleScreenElement.find('#btn-confirm-attack');
        const $btnConfirmBlocks  = this.#battleScreenElement.find('#btn-confirm-blocks');
        const $btnDiscardMana    = this.#battleScreenElement.find('#btn-discard-mana');
        const $btnCancelDiscard  = this.#battleScreenElement.find('#btn-cancel-discard');

        console.log(`_updateTurnControls: isMyTurn=${isMyTurn}, phase=${phase}, cmState=${combatMgrState}, isAssigningBlockers=${interactionMgr.isAssigningBlockers()}, passVisible=${passPhaseVisible}, passDisabled=${passPhaseDisabled}, confirmBlocksVisible=${confirmBlocksVisible}, confirmBlocksDisabled=${confirmBlocksDisabled}`);

        $btnPassPhase.toggle(passPhaseVisible).prop('disabled', passPhaseDisabled);
        $btnEndTurn.toggle(endTurnVisible).prop('disabled', endTurnDisabled);
        $btnConfirmAttack.toggle(confirmAttackVisible).prop('disabled', confirmAttackDisabled);
        $btnConfirmBlocks.toggle(confirmBlocksVisible).prop('disabled', confirmBlocksDisabled);
        $btnDiscardMana.toggle(discardManaVisible).prop('disabled', discardManaDisabled);
        $btnCancelDiscard.toggle(cancelDiscardVisible);
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
}