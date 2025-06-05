// js/ui/screens/BattleScreenUI.js - Refatorado (Parte 2 - Final com ajustes para refresh de UI)

import CardRenderer from '../helpers/CardRenderer.js'; // Ainda necessário se BattleRenderer for instanciado aqui
import ZoomHandler from '../helpers/ZoomHandler.js';
import BattleRenderer from './battle/BattleRenderer.js';
import BattleInteractionManager from './battle/BattleInteractionManager.js';
import CreatureCard from '../../core/CreatureCard.js'; // Para _checkIfValidTarget
// import { RunebindingCard } from '../../core/RunebindingCard.js'; // Para _checkIfValidTarget se necessário

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
    #zoomObserver = null; // Para armazenar o MutationObserver

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

        this.#btnBackToProfile?.off('click.gameoverbtn_ui').on('click.gameoverbtn_ui', () => {
            this.#audioManager?.playSFX('buttonClick');
            this.#battleRenderer.hideGameOver();
            this.#gameInstance = null;
            this.#battleInteractionManager?._unbindGameActions();
            this.#battleInteractionManager = null;
            if (this.#zoomObserver) { this.#zoomObserver.disconnect(); this.#zoomObserver = null; } // Desconecta o observer
            this.#uiManager?.navigateTo('profile-screen');
            $('#top-bar').removeClass('battle-only');
        });

        $(document).off('keydown.battlescreen_esc_ui').on('keydown.battlescreen_esc_ui', (e) => {
            if (!this.#battleScreenElement?.hasClass('active')) return;
            if (e.key === "Escape") {
                // O ZoomHandler já tem um listener global de ESC para fechar o zoom.
                // A principal ação do ESC aqui é para o InteractionManager sair de seus modos.
                // Se o zoom estiver aberto, ele será fechado primeiro pelo ZoomHandler.
                // A chamada subsequente ao refreshVisualHighlights (via MutationObserver)
                // deve restaurar os destaques da UI da batalha.
                this.#battleInteractionManager?.handleEscKey();
            }
        });

        // Observer para o overlay de zoom da tela de batalha
        const zoomOverlayNode = document.getElementById('battle-image-zoom-overlay'); // ID do template
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
            'blockersDeclared', 'combatResolved', 'cardPlayed', 'gameStarted'
         ];
         gameEvents.forEach(eventName => {
             const handlerName = `_handle${eventName.charAt(0).toUpperCase() + eventName.slice(1)}`;
             if (typeof this[handlerName] === 'function') {
                 const boundHandler = this[handlerName].bind(this);
                 // Remover e readicionar para evitar múltiplos listeners se _bindGameEventListeners for chamado de novo
                 this.#gameInstance.removeEventListener(eventName, boundHandler);
                 this.#gameInstance.addEventListener(eventName, boundHandler);
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
        console.log("BattleUI Event: Player Stats Changed", e.detail);
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
    _handleCombatResolved(e) {
        console.log("BattleScreenUI: Combat Resolved event received.");
        this.#battleRenderer.clearAllCardHighlights();
        this.#battleInteractionManager?._exitBlockerAssignmentMode();
        this.#battleInteractionManager?._exitAttackerDeclarationMode();
        this.#battleInteractionManager?.refreshVisualHighlights(); // Adicionado para garantir que os destaques do modo atual sejam restaurados
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
    _handleGameStarted(e) { setTimeout(() => this._updateTurnControls(), 50); }

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

        if (attackingPlayerId === this.#localPlayerId) {
            console.log("BattleScreenUI: Local player declared attackers. Waiting for opponent.");
            // _updateTurnControls será chamado, e como cmState será 'declare_blockers', os botões do local devem desabilitar.
        } else {
            console.log("BattleScreenUI: Opponent declared attackers. Entering blocker assignment mode for local player.");
            this.#battleInteractionManager?.onOpponentAttackersDeclared();
        }
        this._updateTurnControls(); // Essencial para atualizar estado dos botões
    }

    _handleBlockersDeclared(e) {
        const { declaredBlockers } = e.detail;
        console.log("BattleScreenUI: Blockers declared event received.");
        this.#battleRenderer.clearAllCardHighlights();
        declaredBlockers.forEach(info => {
            const $card = this.#battleScreenElement.find(`.card[data-card-unique-id="${info.blockerId}"]`);
            if ($card.length) this.#battleRenderer.setCardBlockingVisual($card, true);
        });
        this.#gameInstance?.getCombatManager().getAttackers().forEach(attacker => {
            const $card = this.#battleScreenElement.find(`.card[data-card-unique-id="${attacker.uniqueId}"]`);
            if ($card.length) this.#battleRenderer.setCardAttackingVisual($card, true);
        });
        // Após bloqueadores serem declarados, o combate resolve. O InteractionManager deve sair dos modos.
        this.#battleInteractionManager?._exitBlockerAssignmentMode(); // Garante que saiu do modo de bloqueio
        this._updateTurnControls();
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
        const interactionMgr = this.#battleInteractionManager;
        if (!this.#gameInstance || !this.#battleScreenElement?.hasClass('active') || !interactionMgr) {
            this.#battleRenderer.updateTurnControlsUI({ /* ... desabilita tudo ... */ });
            return;
        }

        const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
        const isLocalTurn = this.#gameInstance.getCurrentPlayer()?.id === this.#localPlayerId;
        const currentPhase = this.#gameInstance.getCurrentPhase();
        const cmState = this.#gameInstance.getCombatManager().state; // 'none', 'declare_attackers', 'declare_blockers', 'resolving'
        const gameState = this.#gameInstance.state;

        let passPhaseDisabled = true;
        let endTurnDisabled = true;
        let discardManaDisabled = true;
        let confirmAttackVisible = false;
        let confirmAttackDisabled = true;
        let confirmBlocksVisible = false;
        let confirmBlocksDisabled = true; // Default para desabilitado

        if (isLocalTurn && gameState === 'playing') {
            // --- Lógica para botões GERAIS de turno (Passar, Finalizar, Descartar por Mana) ---
            // Estes botões só estão ativos se NENHUM modo de interação específico (alvo, ataque, bloqueio) estiver ativo
            // E não houver descarte obrigatório pendente.
            const noSpecificInteractionMode = !interactionMgr.isSelectingTarget() &&
                                           !interactionMgr.isDeclaringAttackers() &&
                                           !interactionMgr.isAssigningBlockers() && // Não deve ser relevante no turno local, mas por segurança
                                           !interactionMgr.isSelectingDiscardMana() && // Se já está selecionando, não pode clicar de novo
                                           interactionMgr.getPendingEOTDiscardCount() === 0;

            if (noSpecificInteractionMode) {
                passPhaseDisabled = false;
                endTurnDisabled = false;
                discardManaDisabled = (localPlayer?.hasDiscardedForMana ?? true) ||
                                      (localPlayer?.maxMana ?? 10) >= 10 ||
                                      (localPlayer?.hand.getSize() ?? 0) === 0;
            } else {
                // Se um modo específico está ativo, desabilita os botões gerais,
                // EXCETO se for o modo de declaração de ataque (tratado abaixo).
                passPhaseDisabled = true;
                endTurnDisabled = true;
                discardManaDisabled = true;
            }

            // --- Lógica para Botão "Confirmar Ataque" ---
            if (currentPhase === 'attack' && cmState === 'none') {
                // Se estamos na fase de ataque e o CombatManager está pronto para receber atacantes (state 'none')
                // o jogador DEVE estar no modo de declaração de atacantes ou ter a opção de entrar nele.
                // _enterAttackerDeclarationMode é chamado em _handleAttackPhaseStart.
                if (interactionMgr.isDeclaringAttackers()) {
                    confirmAttackVisible = true;
                    confirmAttackDisabled = interactionMgr.getSelectedAttackerIds().size === 0;
                    // Enquanto declara atacantes, desabilita Passar Fase e Finalizar Turno
                    // para forçar uma decisão de ataque ou o uso explícito de "Passar Fase" se ele desistir.
                    // NOVO: "Passar Fase" é a saída se não quiser atacar.
                    passPhaseDisabled = false; // PERMITE PASSAR A FASE MESMO ESTANDO NO MODO DE DECLARAR ATACANTES
                    endTurnDisabled = true;    // Finalizar Turno ainda não é permitido diretamente daqui
                }
                // Se não estiver em isDeclaringAttackers, mas for fase de ataque e cmState 'none',
                // significa que o jogador pode iniciar a declaração (o botão de "Declarar Ataque" se existisse, ou o primeiro clique em criatura).
                // Mas como não temos botão "Declarar Ataque", o modo é entrado automaticamente.
                // A visibilidade do botão de confirmação é controlada por isDeclaringAttackers.
            }

            // --- Lógica para Botão "Descartar por Mana" (se já não desabilitado acima) ---
            // Se está no modo de selecionar descarte por mana, o próprio botão de iniciar o descarte fica desabilitado.
            if (interactionMgr.isSelectingDiscardMana()) {
                discardManaDisabled = true;
                passPhaseDisabled = true; // Não pode passar fase enquanto escolhe descarte por mana
                endTurnDisabled = true;   // Nem finalizar turno
            }
            
            // Se estiver selecionando alvo para uma carta.
            if (interactionMgr.isSelectingTarget()){
                passPhaseDisabled = true;
                endTurnDisabled = true;
                discardManaDisabled = true;
            }

            // Se estiver pendente descarte de fim de turno
            if (interactionMgr.getPendingEOTDiscardCount() > 0) {
                passPhaseDisabled = true;
                endTurnDisabled = true;
                discardManaDisabled = true;
            }


        } else if (!isLocalTurn && gameState === 'playing') { // Turno do Oponente
            // --- Lógica para Botão "Confirmar Bloqueios" ---
            if (currentPhase === 'attack' && cmState === 'declare_blockers') {
                // Se é o turno do oponente, ele atacou, e o jogador local está no modo de atribuir bloqueadores
                if (interactionMgr.isAssigningBlockers()) {
                    confirmBlocksVisible = true;
                    confirmBlocksDisabled = false; // Sempre habilitado para poder confirmar 0 bloqueios
                    // Enquanto atribui bloqueadores, outros botões (que não seriam do jogador local de qualquer forma) ficam desabilitados.
                    passPhaseDisabled = true;
                    endTurnDisabled = true;
                    discardManaDisabled = true;
                }
            }
             // Geralmente, todos os botões de ação do jogador local estão desabilitados no turno do oponente.
             // A lógica acima já trata isso com isLocalTurn.
        }


        // Caso especial: Se o jogador local acabou de declarar seus atacantes,
        // o cmState vai para 'declare_blockers', mas AINDA é o turno do jogador local.
        // Neste ponto, ele não deve poder passar fase ou finalizar turno até o oponente responder.
        if (isLocalTurn && currentPhase === 'attack' && cmState === 'declare_blockers') {
            passPhaseDisabled = true;
            endTurnDisabled = true;
            discardManaDisabled = true; // Não faz sentido descartar por mana aqui
            confirmAttackVisible = false; // Já confirmou o ataque
        }


        const controlsState = {
            passPhaseDisabled,
            endTurnDisabled,
            discardManaDisabled,
            confirmAttackVisible,
            confirmAttackDisabled,
            confirmBlocksVisible,
            confirmBlocksDisabled
        };
        this.#battleRenderer.updateTurnControlsUI(controlsState);
    }

    // _checkIfValidTarget é crucial para BattleInteractionManager
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