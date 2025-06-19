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

    /**
     * Atualiza a visibilidade / habilitação dos botões de turno.
     * Chame sempre que algo no estado da partida ou nos modos de interação mudar.
     */
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

        // ─── Flags padrão ─────────────────────────────────────────────────────
        let passPhaseVis = false, passPhaseDis = true;
        let endTurnVis   = false, endTurnDis   = true;
        let confirmAtkVis = false, confirmAtkDis = true;
        let confirmBlkVis = false, confirmBlkDis = true;
        let discardManaVis = false, discardManaDis = true;
        const cancelDiscardVis = (interaction.isSelectingDiscardMana?.() ?? false)
                            || (interaction.isSelectingTarget?.()      ?? false);

        // ─── Meu turno ────────────────────────────────────────────────────────
        if (isMyTurn) {
            passPhaseVis = true;  passPhaseDis = false;
            endTurnVis   = true;  endTurnDis   = false;

            // descartar para mana
            if (phase === 'main' &&
                !activePlayer.hasDiscardedForMana &&
                activePlayer.maxMana < 10 &&
                activePlayer.hand.getSize() > 0) {
                discardManaVis = true;  discardManaDis = false;
            }

            // declarar atacantes
            if (phase === 'attack') {
                const atkMode = interaction.isDeclaringAttackers();
                if (atkMode) {
                    const anySel = interaction.getSelectedAttackerIds().size > 0;
                    confirmAtkVis = anySel; // Botão só aparece se houver ao menos um atacante selecionado
                    confirmAtkDis = !anySel; // E habilitado se houver
                    passPhaseDis  = anySel; // Se atacantes selecionados, jogador deve confirmar ou limpar
                    endTurnDis    = anySel;
                } else if (combatState === 'declare_blockers') {
                    // Oponente (IA) está bloqueando, ou esperando resposta de bloqueio do humano
                    // Se o combate ainda está em declare_blockers, o jogador atacante (humano)
                    // não deveria poder passar a fase aqui, ele espera a resolução.
                    passPhaseDis = true;
                    endTurnDis   = true;
                    discardManaVis = false; // Não pode descartar para mana durante o combate do oponente
                }
            }

            // sobreposição de modos especiais
            if (cancelDiscardVis || interaction.getPendingEOTDiscardCount() > 0) {
                passPhaseDis   = true;
                endTurnDis     = true;
                discardManaDis = true;
            }
            if (interaction.getPendingEOTDiscardCount() > 0) {
                // durante descarte obrigatório escondemos quase tudo
                passPhaseVis = endTurnVis = discardManaVis =
                confirmAtkVis = confirmBlkVis = false;
            }

        // ─── Turno do oponente (eu bloqueio) ──────────────────────────────────
        } else { // Not my turn
            if (phase === 'attack' && combatState === 'declare_blockers') {
                // O jogador local (defensor) PODE passar a fase, o que significa não bloquear
                // ou confirmar os bloqueios parciais que já fez.
                passPhaseVis = true;
                passPhaseDis = false; // "Passar Fase" deve estar HABILITADO

                // Verifica se o modo de interação de designar bloqueadores está ativo
                if (interaction.isAssigningBlockers()) {
                    const assignmentsMade =
                        Object.keys(interaction.getBlockerAssignmentsUI()).length > 0;

                    // O botão "Confirmar Bloqueios" só fica habilitado se houver bloqueios feitos.
                    confirmBlkVis = true; // Botão é visível durante a atribuição de bloqueios
                    confirmBlkDis = !assignmentsMade; // Habilitado apenas se há bloqueios
                } else {
                    // Se não estiver no modo de atribuir bloqueadores (pode ter saído ou ainda não entrado),
                    // o botão "Confirmar Bloqueios" deve estar desabilitado.
                    confirmBlkVis = false; // Ou true se quiser mostrar sempre, mas desabilitado
                    confirmBlkDis = true;
                }
            }
        }

        // ─── Aplica no DOM ────────────────────────────────────────────────────
        const $ = this.#battleScreenElement;
        $.find('#btn-pass-phase')     .toggle(passPhaseVis)  .prop('disabled', passPhaseDis);
        $.find('#btn-end-turn')       .toggle(endTurnVis)    .prop('disabled', endTurnDis);
        $.find('#btn-confirm-attack') .toggle(confirmAtkVis) .prop('disabled', confirmAtkDis);
        $.find('#btn-confirm-blocks') .toggle(confirmBlkVis) .prop('disabled', confirmBlkDis);
        $.find('#btn-discard-mana')   .toggle(discardManaVis).prop('disabled', discardManaDis);
        $.find('#btn-cancel-discard') .toggle(cancelDiscardVis);

        console.log(`_updateTurnControls: phase=${phase}, isMyTurn=${isMyTurn}, cmState=${combatState},`
            + ` passPhaseVis=${passPhaseVis}, passPhaseDis=${passPhaseDis},`
            + ` confirmAtkVis=${confirmAtkVis}, confirmBlkVis=${confirmBlkVis}`);
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