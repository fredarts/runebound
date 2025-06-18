// js/ui/screens/battle/BattleInteractionManager.js

export default class BattleInteractionManager {
    // --- Referências Injetadas ---
    #gameInstance;
    #battleScreenUI;    // Para chamar _updateTurnControls
    #battleRenderer;    // Para solicitar atualizações visuais
    #audioManager;
    #zoomHandler;
    #localPlayerId;

    // --- Elementos da UI (Cache para binding de eventos) ---
    #battleScreenElement;
    #playerHandElement;
    #playerBattlefieldElement;
    #opponentBattlefieldElement;
    #btnEndTurn;
    #btnPassPhase;
    #btnDiscardMana;
    #btnConfirmAttack;
    #btnConfirmBlocks;

    // --- Estado Interno da Interação ---
    #isSelectingDiscardMana = false; // First (and now only) declaration
    #isSelectingTarget = false;
    #actionPendingTarget = null;
    #isDeclaringAttackers = false;
    #selectedAttackerIds = new Set();
    #isAssigningBlockers = false;
    #blockerAssignmentsUI = {};
    #pendingEOTDiscardCount = 0;
    #selectedAttackerForBlocking = null; // ID do atacante inimigo selecionado para bloqueio
    // #isSelectingDiscardMana = false; // <<< DUPLICATE REMOVED

    constructor(game, battleScreenUI, battleRenderer, audioManager, zoomHandler) {
        if (!game || !battleScreenUI || !battleRenderer || !audioManager || !zoomHandler) {
            // Permite que a construção aconteça mesmo se 'game' for null inicialmente,
            // mas lança erro se as outras dependências de UI estiverem faltando.
            if (!battleScreenUI || !battleRenderer || !audioManager || !zoomHandler) {
                throw new Error("BattleInteractionManager: Missing critical UI dependencies (battleScreenUI, battleRenderer, audioManager, or zoomHandler).");
            }
            console.warn("BattleInteractionManager: 'gameInstance' is null during construction. It should be set later via setGameInstance.");
        }
        this.#gameInstance = game; // Pode ser null inicialmente
        this.#battleScreenUI = battleScreenUI;
        this.#battleRenderer = battleRenderer;
        this.#audioManager = audioManager;
        this.#zoomHandler = zoomHandler;

        this._cacheSelectors();
        if (!this.#battleScreenElement || !this.#battleScreenElement.length) {
            console.error("BattleInteractionManager Error: #battle-screen element not found during caching!");
        }
        // Drag-and-drop para jogar
        this.#playerHandElement.on('dragstart', '.card', e => {
            e.originalEvent.dataTransfer.setData('cardId',
                $(e.target).data('card-unique-id'));
        });
        this.#playerBattlefieldElement.on('dragover', e => e.preventDefault());
        this.#playerBattlefieldElement.on('drop', e => {
            const id = e.originalEvent.dataTransfer.getData('cardId');
            if (id) this._playCardFromHand(id);
        });
        console.log("BattleInteractionManager initialized.");
    }

    setLocalPlayerId(id) {
        this.#localPlayerId = id;
    }

    // Métodos para BattleScreenUI gerenciar o estado de descarte obrigatório
    setPendingEOTDiscardCount(count) {
        this.#pendingEOTDiscardCount = Math.max(0, count);
    }
    getPendingEOTDiscardCount() {
        return this.#pendingEOTDiscardCount;
    }

    // --- GETTERS PÚBLICOS PARA ESTADOS DE INTERAÇÃO ---
    isSelectingDiscardMana() { return this.#isSelectingDiscardMana; }
    isSelectingTarget() { return this.#isSelectingTarget; }
    isDeclaringAttackers() { return this.#isDeclaringAttackers; }
    isAssigningBlockers() { return this.#isAssigningBlockers; }
    getSelectedAttackerIds() { return new Set(this.#selectedAttackerIds); }
    getBlockerAssignmentsUI() { return { ...this.#blockerAssignmentsUI }; }


    refreshVisualHighlights() {
        if (!this.#gameInstance || !this.#localPlayerId) return;
        console.log("BattleInteractionManager: Refreshing visual highlights for mode:",
            this.#isDeclaringAttackers ? "Declaring Attackers" :
            this.#isAssigningBlockers ? "Assigning Blockers" :
            this.#isSelectingTarget ? "Selecting Target" :
            this.#isSelectingDiscardMana ? "Selecting Discard Mana" :
            this.#pendingEOTDiscardCount > 0 ? "Pending EOT Discard" : "None"
        );

        // Limpa todos os destaques anteriores para evitar acúmulo
        this.#battleRenderer.clearAllCardHighlights();
        this.#playerBattlefieldElement?.find('.can-attack-visual, .can-block-visual').removeClass('can-attack-visual can-block-visual');
        this.#opponentBattlefieldElement?.find('.targetable-for-block-assignment, .attacker-selected-for-blocking').removeClass('targetable-for-block-assignment attacker-selected-for-blocking');
        this.#playerHandElement?.find('.card').removeClass('targetable'); // Para descarte

        if (this.#isDeclaringAttackers) {
            const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
            localPlayer?.battlefield.getCreatures().forEach(c => {
                if (c.canAttack()) {
                    const cardEl = this.#playerBattlefieldElement.find(`.card[data-card-unique-id="${c.uniqueId}"]`);
                    this.#battleRenderer.highlightTargetableCards(cardEl, true);
                    cardEl.addClass('can-attack-visual');
                    // Reaplicar .selected-attacker se já estava selecionado
                    if (this.#selectedAttackerIds.has(c.uniqueId)) {
                        this.#battleRenderer.highlightAttackerSelection(cardEl, true);
                    }
                }
            });
        } else if (this.#isAssigningBlockers) {
            const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
            localPlayer?.battlefield.getCreatures().forEach(c => {
                if (c.canBlock()) {
                    const cardEl = this.#playerBattlefieldElement.find(`.card[data-card-unique-id="${c.uniqueId}"]`);
                    this.#battleRenderer.highlightTargetableCards(cardEl, true);
                    cardEl.addClass('can-block-visual');
                    // Reaplicar .selected-blocker se já estava bloqueando algo
                    for (const attackerId in this.#blockerAssignmentsUI) {
                        if (this.#blockerAssignmentsUI[attackerId].includes(c.uniqueId)) {
                            // Encontrar o elemento do atacante para passar para highlightBlockerAssignment
                            const attackerEl = this.#opponentBattlefieldElement.find(`.card[data-card-unique-id="${attackerId}"]`);
                            this.#battleRenderer.highlightBlockerAssignment(attackerEl, cardEl, this.#blockerAssignmentsUI);
                            break;
                        }
                    }
                }
            });
            this.#opponentBattlefieldElement?.find('.card.attacking').addClass('targetable-for-block-assignment');
            if (this.#selectedAttackerForBlocking) {
                const $selectedAttackerEl = this.#opponentBattlefieldElement.find(`.card[data-card-unique-id="${this.#selectedAttackerForBlocking}"]`);
                $selectedAttackerEl.addClass('attacker-selected-for-blocking');
            }
        } else if (this.#isSelectingTarget && this.#actionPendingTarget) {
            this.#battleRenderer.setBattlefieldTargetingMode(this.#actionPendingTarget.targetType, true);
        } else if (this.#isSelectingDiscardMana || this.#pendingEOTDiscardCount > 0) {
            this.#battleRenderer.setPlayerHandSelectingMode(true, this.#pendingEOTDiscardCount > 0);
        }
        // Não precisa chamar _updateTurnControls aqui, pois o estado dos botões não deve ter mudado.
    }

    _playCardFromHand(cardId) {
    const player = this.#gameInstance.getPlayer(this.#localPlayerId);
    if (player.playCard(cardId, null, this.#gameInstance)) {
        this.#audioManager.playSFX('playCreature');
    }
    }

    _enterDiscardManaSelectionMode() {
    this.#isSelectingDiscardMana = true;

    // mostra o botão "Cancelar" e liga o click
    $('#btn-cancel-discard').show()
        .off('click')                       // remove handlers antigos
        .on('click', () => this._exitDiscardManaSelectionMode());

    // destaque visual nas cartas da mão etc.
    this.refreshVisualHighlights();
}

    _exitDiscardManaSelectionMode() {
        this.#isSelectingDiscardMana = false;
        $('#btn-cancel-discard').hide();        // esconde o botão

        this.refreshVisualHighlights();
        // opcional: restaurar cursores, tooltips…
    }

    _cacheSelectors() {
        this.#battleScreenElement = $('#battle-screen');
        if (!this.#battleScreenElement.length) return;

        this.#playerHandElement = this.#battleScreenElement.find('#player-hand');
        this.#playerBattlefieldElement = this.#battleScreenElement.find('#player-battlefield');
        this.#opponentBattlefieldElement = this.#battleScreenElement.find('#opponent-battlefield');
        this.#btnEndTurn = this.#battleScreenElement.find('#btn-end-turn');
        this.#btnPassPhase = this.#battleScreenElement.find('#btn-pass-phase');
        this.#btnDiscardMana = this.#battleScreenElement.find('#btn-discard-mana');
        this.#btnConfirmAttack = this.#battleScreenElement.find('#btn-confirm-attack');
        this.#btnConfirmBlocks = this.#battleScreenElement.find('#btn-confirm-blocks');
    }

    bindGameActions() {
        if (!this.#battleScreenElement?.length) {
            console.error("BattleInteractionManager: Cannot bind actions, root element not found.");
            return;
        }
        console.log("BattleInteractionManager: Binding game actions...");
        this._unbindGameActions();

        const addAudio = ($element, sfxClick = 'buttonClick', sfxHover = 'buttonHover') => {
             if (!$element || !$element.length) return;
             $element.off('click.battleinteract_audio mouseenter.battleinteract_audio') // Limpa listeners de áudio anteriores
                     .on('click.battleinteract_audio', () => this.#audioManager?.playSFX(sfxClick))
                     .on('mouseenter.battleinteract_audio', () => this.#audioManager?.playSFX(sfxHover));
        };

        this.#btnEndTurn.on('click.battleinteract', this._handleEndTurnClick.bind(this));
        addAudio(this.#btnEndTurn);
        this.#btnPassPhase.on('click.battleinteract', this._handlePassPhaseClick.bind(this));
        addAudio(this.#btnPassPhase);
        this.#btnDiscardMana.on('click.battleinteract', this._handleDiscardForManaClick.bind(this));
        addAudio(this.#btnDiscardMana);
        this.#btnConfirmAttack.on('click.battleinteract', this._handleConfirmAttackersClick.bind(this));
        addAudio(this.#btnConfirmAttack, 'playCreature');
        this.#btnConfirmBlocks.on('click.battleinteract', this._handleConfirmBlockersClick.bind(this));
        addAudio(this.#btnConfirmBlocks, 'playCreature');

        this.#playerHandElement.on('click.battleinteract', '.card', this._handleHandCardClick.bind(this));
        this.#playerBattlefieldElement.on('click.battleinteract', '.card', this._handleBattlefieldCardClick.bind(this));
        this.#opponentBattlefieldElement.on('click.battleinteract', '.card', this._handleBattlefieldCardClick.bind(this));

        this.#battleScreenElement.on('contextmenu.battleinteract', '.card', (e) => {
            e.preventDefault();
            this.#zoomHandler.handleZoomClick(e, this.#gameInstance);
        });

        this.#playerHandElement.off('mouseenter.battleinteract_cardaudio') // Limpa antes de adicionar
                               .on('mouseenter.battleinteract_cardaudio', '.card', () => this.#audioManager?.playSFX('cardDraw'));
        this.#playerBattlefieldElement.off('mouseenter.battleinteract_cardaudio')
                                    .on('mouseenter.battleinteract_cardaudio', '.card', () => this.#audioManager?.playSFX('buttonHover'));
        this.#opponentBattlefieldElement.off('mouseenter.battleinteract_cardaudio')
                                      .on('mouseenter.battleinteract_cardaudio', '.card', () => this.#audioManager?.playSFX('buttonHover'));
        console.log("BattleInteractionManager: Game actions bound.");
    }

    _unbindGameActions() {
        console.log("BattleInteractionManager: Unbinding game actions...");
        const namespace = '.battleinteract';
        const audioNs = '.battleinteract_audio';
        const cardAudioNs = '.battleinteract_cardaudio';

        this.#btnEndTurn?.off(namespace + audioNs);
        this.#btnPassPhase?.off(namespace + audioNs);
        this.#btnDiscardMana?.off(namespace + audioNs);
        this.#btnConfirmAttack?.off(namespace + audioNs);
        this.#btnConfirmBlocks?.off(namespace + audioNs);

        this.#playerHandElement?.off(namespace + cardAudioNs);
        this.#playerBattlefieldElement?.off(namespace + cardAudioNs);
        this.#opponentBattlefieldElement?.off(namespace + cardAudioNs);
        this.#battleScreenElement?.off(namespace);
    }

    _canInteract(needsActiveTurn = true) {
        if (!this.#gameInstance || !this.#localPlayerId) return false;
        if (this.#gameInstance.state !== 'playing') return false;
        if (needsActiveTurn && this.#gameInstance.getCurrentPlayer()?.id !== this.#localPlayerId) return false;
        if (this.#pendingEOTDiscardCount > 0) return false;
        return true;
    }

    _disableAllGameActions(allowTargetables = false) {
        this.#battleScreenUI._updateTurnControls();
        if (!allowTargetables) {
            this.#battleRenderer.clearAllCardHighlights();
        }
    }

    _onDiscardManaClicked() {
    // Se já estamos escolhendo carta para descartar, não faz nada
    if (this.#isSelectingDiscardMana) return;

    // Entra no modo de seleção (mostra botão “Cancelar” etc.)
    this._enterDiscardManaSelectionMode();
}

    _resetInteractionModes() {
        this.#isSelectingDiscardMana = false;
        this.#isSelectingTarget = false;
        this.#actionPendingTarget = null;
        this.#isDeclaringAttackers = false;
        this.#selectedAttackerIds.clear();
        this.#isAssigningBlockers = false;
        this.#blockerAssignmentsUI = {};
        this.#selectedAttackerForBlocking = null;
        // pendingEOTDiscardCount é controlado por setPendingEOTDiscardCount

        this.#battleRenderer.setPlayerHandSelectingMode(false);
        this.#battleRenderer.clearAllCardHighlights();
        this.#battleRenderer.updateActionFeedback('');
        console.log("BattleInteractionManager: All interaction modes reset.");
        this.#battleScreenUI._updateTurnControls();
    }

    _enterDiscardRequiredMode(count) {
        this.setPendingEOTDiscardCount(count);
        this.#battleRenderer.updateActionFeedback(`Mão cheia! Descarte ${count} carta(s).`);
        this.#battleRenderer.setPlayerHandSelectingMode(true, true); // (isSelecting, isRequired)
        this._disableAllGameActions(true);
        this.#battleScreenUI._updateTurnControls();
    }
    _exitDiscardRequiredMode() {
        this.setPendingEOTDiscardCount(0);
        this.#battleRenderer.updateActionFeedback('');
        this.#battleRenderer.setPlayerHandSelectingMode(false, false);
        this.#battleScreenUI._updateTurnControls();
    }

    _enterDiscardManaSelectionMode() {
        if (this.#isSelectingDiscardMana) return;
        this._exitAllInteractionModes();
        this.#isSelectingDiscardMana = true;
        this.#battleRenderer.updateActionFeedback('Selecione uma carta para descartar por +1 Mana Máx.');
        this.#battleRenderer.setPlayerHandSelectingMode(true);
        this._disableAllGameActions(true);
        this.#battleScreenUI._updateTurnControls();
    }
    _exitDiscardManaSelectionMode() {
        if (!this.#isSelectingDiscardMana) return;
        this.#isSelectingDiscardMana = false;
        this.#battleRenderer.updateActionFeedback('');
        this.#battleRenderer.setPlayerHandSelectingMode(false);
        this.#battleScreenUI._updateTurnControls();
    }

    _enterTargetSelectionMode(actionInfo) {
        if (!actionInfo?.cardUniqueId || !actionInfo?.targetType) return;
        this._exitAllInteractionModes();
        this.#isSelectingTarget = true;
        this.#actionPendingTarget = actionInfo;
        this.#battleRenderer.updateActionFeedback(`Selecione um alvo (${actionInfo.targetType}) para ${actionInfo.cardName}.`);
        // O BattleScreenUI tem o método _checkIfValidTarget, mas o destaque é feito pelo BattleRenderer.
        // Idealmente, BattleRenderer teria um método para destacar baseado no targetType.
        // Por ora, vamos assumir que BattleRenderer._highlightValidTargets (se existir) ou
        // BattleScreenUI._highlightValidTargets é chamado externamente ou o renderer o faz.
        this.#battleRenderer.setBattlefieldTargetingMode(actionInfo.targetType, true);
        this._disableAllGameActions(true);
        this.#battleScreenUI._updateTurnControls();
    }
    _exitTargetSelectionMode() {
        if (!this.#isSelectingTarget) return;
        this.#isSelectingTarget = false;
        this.#actionPendingTarget = null;
        this.#battleRenderer.updateActionFeedback('');
        this.#battleRenderer.setBattlefieldTargetingMode(null, false);
        this.#battleScreenUI._updateTurnControls();
    }

_enterAttackerDeclarationMode() {
    // Se já estamos no modo de declaração, não faz nada
    if (this.#isDeclaringAttackers) return;

    // ─── NOVO: verifica se há criaturas aptas a atacar ────────────────────────
    const localPlayer = this.#gameInstance?.getPlayer(this.#localPlayerId);
    const possibleAttackers = localPlayer?.battlefield
        .getCreatures()
        .filter(c => c.canAttack()) || [];

    if (possibleAttackers.length === 0) {
        console.log("Nenhum atacante disponível – passando fase de ataque automaticamente.");
        this.#gameInstance.passPhase();      // Avança para a próxima fase
        return;                              // Não entra em modo de ataque
    }
    // ──────────────────────────────────────────────────────────────────────────

    this._exitAllInteractionModes();
    this.#isDeclaringAttackers = true;
    this.#selectedAttackerIds.clear();
    this.#battleRenderer.updateActionFeedback(
        'Selecione suas criaturas para atacar e clique em "Confirmar Ataque".'
    );

    // Destaca visualmente quem pode atacar
    possibleAttackers.forEach(c => {
        const cardEl = this.#playerBattlefieldElement
            .find(`.card[data-card-unique-id="${c.uniqueId}"]`);
        this.#battleRenderer.highlightTargetableCards(cardEl, true);
        cardEl.addClass('can-attack-visual');
    });

    this._disableAllGameActions(true);
    this.#battleScreenUI._updateTurnControls();
}
    _exitAttackerDeclarationMode() {
        if (!this.#isDeclaringAttackers) return;
        this.#isDeclaringAttackers = false;
        // this.#selectedAttackerIds.clear(); // Feito ao entrar no modo
        this.#battleRenderer.updateActionFeedback('');
        this.#battleRenderer.clearAllCardHighlights();
        this.#playerBattlefieldElement?.find('.card.can-attack-visual').removeClass('can-attack-visual');
        this.#battleScreenUI._updateTurnControls();
    }

    _enterBlockerAssignmentMode() {
        if (this.#isAssigningBlockers) return;
        this._exitAllInteractionModes();
        this.#isAssigningBlockers = true;
        this.#blockerAssignmentsUI = {};
        this.#selectedAttackerForBlocking = null;
        this.#battleRenderer.updateActionFeedback('Clique em um ATACANTE inimigo, depois em sua CRIATURA para bloquear. Confirme.');
        const localPlayer = this.#gameInstance?.getPlayer(this.#localPlayerId);
        localPlayer?.battlefield.getCreatures().forEach(c => {
            if (c.canBlock()) {
                 const cardEl = this.#playerBattlefieldElement.find(`.card[data-card-unique-id="${c.uniqueId}"]`);
                 this.#battleRenderer.highlightTargetableCards(cardEl, true); // Adiciona .targetable
                 cardEl.addClass('can-block-visual');
            }
        });
        this.#opponentBattlefieldElement?.find('.card.attacking').addClass('targetable-for-block-assignment');
        this._disableAllGameActions(true);
        this.#battleScreenUI._updateTurnControls();
    }
    _exitBlockerAssignmentMode() {
        if (!this.#isAssigningBlockers) return;
        this.#isAssigningBlockers = false;
        // this.#blockerAssignmentsUI = {}; // Limpo ao entrar
        this.#selectedAttackerForBlocking = null;
        this.#battleRenderer.updateActionFeedback('');
        this.#battleRenderer.clearAllCardHighlights();
        this.#playerBattlefieldElement?.find('.card.can-block-visual').removeClass('can-block-visual');
        this.#opponentBattlefieldElement?.find('.card.targetable-for-block-assignment').removeClass('targetable-for-block-assignment');
        this.#opponentBattlefieldElement?.find('.card.attacker-selected-for-blocking').removeClass('attacker-selected-for-blocking');
        this.#battleScreenUI._updateTurnControls();
    }

    _exitAllInteractionModes() {
        this._exitDiscardManaSelectionMode();
        this._exitTargetSelectionMode();
        this._exitAttackerDeclarationMode();
        this._exitBlockerAssignmentMode();
        // Não sair do _exitDiscardRequiredMode aqui
    }

    _handleEndTurnClick() {
        if (this._canInteract(true)) {
            if (this.#isSelectingDiscardMana) {
                this.#battleRenderer.updateActionFeedback("Finalize o descarte por mana ou cancele (ESC).");
                this.#battleRenderer.showCardFeedback(this.#playerHandElement, 'shake');
                return;
            }
            console.log("InteractionManager: Player requested End Turn.");
            this.#gameInstance.endTurn();
        } else {
             this.#battleRenderer.updateActionFeedback("Não é possível finalizar o turno agora.");
        }
    }

    _handlePassPhaseClick() {
        if (this._canInteract(true)) {
             if (this.#isSelectingDiscardMana) {
                this.#battleRenderer.updateActionFeedback("Finalize o descarte por mana ou cancele (ESC).");
                this.#battleRenderer.showCardFeedback(this.#playerHandElement, 'shake');
                return;
            }
            console.log("InteractionManager: Player requested Pass Phase.");
            this.#gameInstance.passPhase();
        } else {
            this.#battleRenderer.updateActionFeedback("Não é possível passar a fase agora.");
        }
    }

    _handleDiscardForManaClick() {
        const player = this.#gameInstance?.getPlayer(this.#localPlayerId);
        if (this._canInteract(true) && player &&
            !player.hasDiscardedForMana &&
            player.maxMana < 10 &&
            player.hand.getSize() > 0 &&
            !this.#isSelectingDiscardMana
            ) {
            this._enterDiscardManaSelectionMode();
        } else {
            if (player?.hasDiscardedForMana) this.#battleRenderer.updateActionFeedback("Você já descartou por mana neste turno.");
            else if (player?.maxMana >= 10) this.#battleRenderer.updateActionFeedback("Mana máxima (10) já atingida.");
            else if (player?.hand.getSize() === 0) this.#battleRenderer.updateActionFeedback("Sua mão está vazia.");
            else this.#battleRenderer.updateActionFeedback("Não é possível descartar por mana agora.");
        }
    }

    _handleHandCardClick(event) {
        const $cardElement = $(event.currentTarget);
        const cardUniqueId = $cardElement.data('card-unique-id');
        if (!cardUniqueId || !this.#gameInstance) return;

        const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
        if (!localPlayer) return;

        if (this.#isSelectingDiscardMana) {
            if (localPlayer.discardCardForMana(cardUniqueId, this.#gameInstance)) {
                this._exitDiscardManaSelectionMode();
            } else {
                this.#battleRenderer.showCardFeedback($cardElement, 'shake');
            }
            return;
        }

        if (this.#pendingEOTDiscardCount > 0) {
             if (!this.#gameInstance.resolvePlayerDiscard(this.#localPlayerId, cardUniqueId)) {
                 this.#battleRenderer.showCardFeedback($cardElement, 'shake');
             }
             return;
        }

        if (this.#isSelectingTarget) {
            this.#battleRenderer.updateActionFeedback("Selecione um alvo válido no campo ou ESC para cancelar.");
            this.#battleRenderer.showCardFeedback($cardElement, 'shake');
            return;
        }
        if (!this._canInteract(true)) return;

        const cardInstance = localPlayer.hand.getCard(cardUniqueId);
        if (!cardInstance) return;

        if (!cardInstance.canPlay(localPlayer, this.#gameInstance)) {
            this.#battleRenderer.updateActionFeedback(`Não é possível jogar ${cardInstance.name} agora.`);
            this.#battleRenderer.showCardFeedback($cardElement, 'shake');
            return;
        }
        if (cardInstance.requiresTarget()) {
            this._enterTargetSelectionMode({
                cardUniqueId: cardInstance.uniqueId,
                targetType: cardInstance.targetType,
                cardName: cardInstance.name
            });
        } else {
            localPlayer.playCard(cardUniqueId, null, this.#gameInstance);
        }
    }

    _handleBattlefieldCardClick(event) {
        const $cardElement = $(event.currentTarget);
        const cardUniqueId = $cardElement.data('card-unique-id');
        if(!this.#gameInstance) return;
        const isOpponentCard = $cardElement.closest('#opponent-battlefield').length > 0;
        const ownerId = isOpponentCard ? this.#gameInstance.getOpponent(this.#localPlayerId)?.id : this.#localPlayerId;

        if (!cardUniqueId || !ownerId) return;
        const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
        if (!localPlayer) return;

        if (this.#isSelectingTarget) {
            if (this.#battleScreenUI._checkIfValidTarget(cardUniqueId, ownerId, this.#actionPendingTarget)) {
                const action = this.#actionPendingTarget;
                localPlayer.playCard(action.cardUniqueId, cardUniqueId, this.#gameInstance);
                this._exitTargetSelectionMode();
            } else {
                this.#battleRenderer.showCardFeedback($cardElement, 'invalid-target');
                this.#battleRenderer.updateActionFeedback("Alvo inválido para esta ação.");
            }
            return;
        }

        if (this.#isDeclaringAttackers) {
            if (ownerId !== this.#localPlayerId) {
                this.#battleRenderer.updateActionFeedback("Selecione SUAS criaturas para atacar.");
                return;
            }
            const creature = localPlayer.battlefield.getCard(cardUniqueId);
            if (creature?.type === 'Creature' && creature.canAttack()) {
                if (this.#selectedAttackerIds.has(cardUniqueId)) {
                    this.#selectedAttackerIds.delete(cardUniqueId);
                    this.#battleRenderer.highlightAttackerSelection($cardElement, false);
                } else {
                    this.#selectedAttackerIds.add(cardUniqueId);
                    this.#battleRenderer.highlightAttackerSelection($cardElement, true);
                }
                this.#battleScreenUI._updateTurnControls(); // <<< ADICIONAR ESTA CHAMADA
            } else {
                this.#battleRenderer.showCardFeedback($cardElement, 'shake');
                this.#battleRenderer.updateActionFeedback("Esta criatura não pode atacar.");
            }
            return;
        }

        if (this.#isAssigningBlockers) {
            const clickedCardIsLocal = ownerId === this.#localPlayerId;
            if (!clickedCardIsLocal) { // Clicou em um ATACANTE inimigo
                this.#opponentBattlefieldElement.find('.card.attacker-selected-for-blocking').removeClass('attacker-selected-for-blocking');
                this.#selectedAttackerForBlocking = cardUniqueId;
                $cardElement.addClass('attacker-selected-for-blocking');
                this.#battleRenderer.updateActionFeedback(`Atacante ${$cardElement.data('card-name') || cardUniqueId} selecionado. Clique em sua criatura para bloquear.`);
            } else { // Clicou em uma de SUAS criaturas (potencial bloqueador)
                if (!this.#selectedAttackerForBlocking) {
                    this.#battleRenderer.updateActionFeedback("Primeiro, clique no atacante inimigo que deseja bloquear.");
                    this.#battleRenderer.showCardFeedback($cardElement, 'shake');
                    return;
                }
                const blockerInstance = localPlayer.battlefield.getCard(cardUniqueId);
                if (blockerInstance?.type === 'Creature' && blockerInstance.canBlock()) {
                    this._assignBlockerToAttack(this.#selectedAttackerForBlocking, cardUniqueId);
                    this.#battleRenderer.highlightBlockerAssignment(
                        this.#opponentBattlefieldElement.find(`.card[data-card-unique-id="${this.#selectedAttackerForBlocking}"]`),
                        null,
                        this.#blockerAssignmentsUI
                    );
                    const attackerCardEl = this.#opponentBattlefieldElement.find(`.card[data-card-unique-id="${this.#selectedAttackerForBlocking}"]`);
                    this.#battleRenderer.updateActionFeedback(`${blockerInstance.name} bloqueará ${attackerCardEl.data('card-name')}.`);
                    attackerCardEl.removeClass('attacker-selected-for-blocking');
                    this.#selectedAttackerForBlocking = null;
                    this.#battleScreenUI._updateTurnControls();
                } else {
                    this.#battleRenderer.showCardFeedback($cardElement, 'shake');
                    this.#battleRenderer.updateActionFeedback("Esta criatura não pode bloquear.");
                }
            }
            return;
        }
        console.log(`InteractionManager: Battlefield card clicked (no active mode): ${cardUniqueId}`);
    }

    _assignBlockerToAttack(attackerId, blockerId) {
        if (!this.#isAssigningBlockers) return;
        this.#blockerAssignmentsUI[attackerId] = [blockerId];
        console.log(`InteractionManager: Assigned blocker ${blockerId} to attacker ${attackerId}`);
    }

    _handleConfirmAttackersClick() {
        if (this.#isDeclaringAttackers) {
            if (this.#selectedAttackerIds.size === 0) {
                this.#battleRenderer.updateActionFeedback("Selecione criaturas para atacar ou passe a fase.");
                return;
        }
        // Guarda os atacantes antes de sair do modo, pois o Game pode precisar deles
            const attackersToConfirm = [...this.#selectedAttackerIds];
            this._exitAttackerDeclarationMode(); // Sai do modo de declaração da UI primeiro

        // Envia a declaração para o jogo
            this.#gameInstance.confirmAttackDeclaration(this.#localPlayerId, attackersToConfirm);

        // IMPORTANTE: Após confirmar o ataque, o jogador humano NÃO deve poder
        // passar a fase ou finalizar o turno imediatamente. A UI deve esperar a IA.
        // _updateTurnControls em BattleScreenUI deve ser chamado pelo evento 'attackersDeclared'
        // para desabilitar os botões do jogador humano enquanto espera a IA.
            this.#battleRenderer.updateActionFeedback("Aguardando oponente declarar bloqueadores...");
        // BattleScreenUI._updateTurnControls() será chamado pelo evento 'attackersDeclared',
        // e ele deve desabilitar os botões do jogador humano.
        }
    }

    _handleConfirmBlockersClick() {
        if (this.#isAssigningBlockers) {
            const finalAssignments = {};
            for (const attackerId in this.#blockerAssignmentsUI) {
                if (this.#blockerAssignmentsUI[attackerId]?.length > 0) {
                    finalAssignments[attackerId] = this.#blockerAssignmentsUI[attackerId];
                }
            }
            console.log("InteractionManager: Sending blocker assignments to game:", finalAssignments);
            this.#gameInstance.confirmBlockDeclaration(this.#localPlayerId, finalAssignments);
            this._exitBlockerAssignmentMode();
        }
    }

    handleEscKey() {
        let modeExited = false;
        if (this.#isSelectingTarget) { this._exitTargetSelectionMode(); modeExited = true; }
        else if (this.#isSelectingDiscardMana) { this._exitDiscardManaSelectionMode(); modeExited = true; }
        else if (this.#pendingEOTDiscardCount > 0) {
            this.#battleRenderer.updateActionFeedback(`Mão cheia! Descarte ${this.#pendingEOTDiscardCount} carta(s).`);
            // Não sai do modo de descarte obrigatório com ESC
        }
        else if (this.#isDeclaringAttackers) { this._exitAttackerDeclarationMode(); modeExited = true; }
        else if (this.#isAssigningBlockers) { this._exitBlockerAssignmentMode(); modeExited = true; }
        else {
            this.#zoomHandler.closeZoom(); // Se nenhum modo ativo, fecha o zoom
        }

        if (modeExited) {
            this.refreshVisualHighlights(); // Reaplicar destaques do modo anterior, se houver um "nível acima"
        }
    }

    handlePhaseChange() {
        this._exitTargetSelectionMode();
        this._exitDiscardManaSelectionMode();
        this._exitAttackerDeclarationMode();
        this._exitBlockerAssignmentMode();
        // O pendingEOTDiscardCount persiste.
        this.#battleScreenUI._updateTurnControls();
    }

    handleTurnChange() {
        this._resetInteractionModes();
        // pendingEOTDiscardCount é resetado no Game ou setado por onDiscardRequired
    }

    onDiscardRequired(count) {
        this._enterDiscardRequiredMode(count);
    }

    onDiscardResolved() {
        // Se o contador em InteractionManager chegou a zero, o modo é saído.
        // Game.resolvePlayerDiscard decrementa o contador. O evento 'discardResolved'
        // sinaliza que a contagem global chegou a zero.
        if (this.#pendingEOTDiscardCount === 0 && this.#gameInstance.state === 'playing') {
             this._exitDiscardRequiredMode();
        }
    }

    onOpponentAttackersDeclared() {
        this._enterBlockerAssignmentMode();
    }
}