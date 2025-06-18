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
    #btnCancelDiscard;

    // --- Estado Interno da Interação ---
    #isSelectingDiscardMana = false;
    #isSelectingTarget = false;
    #actionPendingTarget = null;
    #isDeclaringAttackers = false;
    #selectedAttackerIds = new Set();
    #isAssigningBlockers = false;
    #blockerAssignmentsUI = {};
    #pendingEOTDiscardCount = 0;
    #selectedAttackerForBlocking = null;


    constructor(game, battleScreenUI, battleRenderer, audioManager, zoomHandler) {
        if (!game || !battleScreenUI || !battleRenderer || !audioManager || !zoomHandler) {
            if (!battleScreenUI || !battleRenderer || !audioManager || !zoomHandler) {
                throw new Error("BattleInteractionManager: Missing critical UI dependencies (battleScreenUI, battleRenderer, audioManager, or zoomHandler).");
            }
            console.warn("BattleInteractionManager: 'gameInstance' is null during construction. It should be set later via setGameInstance.");
        }
        this.#gameInstance = game;
        this.#battleScreenUI = battleScreenUI;
        this.#battleRenderer = battleRenderer;
        this.#audioManager = audioManager;
        this.#zoomHandler = zoomHandler;

        this._cacheSelectors();
        if (!this.#battleScreenElement || !this.#battleScreenElement.length) {
            console.error("BattleInteractionManager Error: #battle-screen element not found during caching!");
        }
        console.log("BattleInteractionManager initialized.");
    }

    setLocalPlayerId(id) {
        this.#localPlayerId = id;
    }

    setPendingEOTDiscardCount(count) {
        this.#pendingEOTDiscardCount = Math.max(0, count);
    }
    getPendingEOTDiscardCount() {
        return this.#pendingEOTDiscardCount;
    }

    isSelectingDiscardMana() { return this.#isSelectingDiscardMana; }
    isSelectingTarget() { return this.#isSelectingTarget; }
    isDeclaringAttackers() { return this.#isDeclaringAttackers; }
    isAssigningBlockers() { return this.#isAssigningBlockers; }
    getSelectedAttackerIds() { return new Set(this.#selectedAttackerIds); }
    getBlockerAssignmentsUI() { return { ...this.#blockerAssignmentsUI }; }
    getSelectedAttackerForBlocking() { return this.#selectedAttackerForBlocking; }


    refreshVisualHighlights() {
        if (!this.#gameInstance || !this.#localPlayerId) return;
        console.log("BattleInteractionManager: Refreshing visual highlights for mode:",
            this.#isDeclaringAttackers ? "Declaring Attackers" :
            this.#isAssigningBlockers ? "Assigning Blockers" :
            this.#isSelectingTarget ? "Selecting Target" :
            this.#isSelectingDiscardMana ? "Selecting Discard Mana" :
            this.#pendingEOTDiscardCount > 0 ? "Pending EOT Discard" : "None"
        );

        this.#battleRenderer.clearAllCardHighlights();
        this.#playerBattlefieldElement?.find('.can-attack-visual, .can-block-visual').removeClass('can-attack-visual can-block-visual');
        this.#opponentBattlefieldElement?.find('.targetable-for-block-assignment, .attacker-selected-for-blocking').removeClass('targetable-for-block-assignment attacker-selected-for-blocking');
        this.#playerHandElement?.find('.card').removeClass('targetable');

        if (this.#isDeclaringAttackers) {
            const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
            localPlayer?.battlefield.getCreatures().forEach(c => {
                if (c.canAttack()) {
                    const cardEl = this.#playerBattlefieldElement.find(`.card[data-card-unique-id="${c.uniqueId}"]`);
                    this.#battleRenderer.highlightTargetableCards(cardEl, true);
                    cardEl.addClass('can-attack-visual');
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
                    for (const attackerId in this.#blockerAssignmentsUI) {
                        if (this.#blockerAssignmentsUI[attackerId].includes(c.uniqueId)) {
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
        this.#btnCancelDiscard = this.#battleScreenElement.find('#btn-cancel-discard');
    }

    bindGameActions() {
        if (!this.#battleScreenElement?.length) {
            console.error("BattleInteractionManager: Cannot bind actions, root element not found.");
            return;
        }
        console.log("BattleInteractionManager: Binding game actions (with drag-and-drop)...");
        this._unbindGameActions();

        const addAudio = ($element, sfxClick = 'buttonClick', sfxHover = 'buttonHover') => {
             if (!$element || !$element.length) return;
             $element.off('click.battleinteract_audio mouseenter.battleinteract_audio')
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
        this.#btnCancelDiscard.on('click.battleinteract', this._handleCancelDiscardClick.bind(this));
        addAudio(this.#btnCancelDiscard);


        this.#playerHandElement.on('click.battleinteract', '.card', this._handleHandCardClick.bind(this));
        this.#playerBattlefieldElement.on('click.battleinteract', '.card', this._handleBattlefieldCardClick.bind(this));
        this.#opponentBattlefieldElement.on('click.battleinteract', '.card', this._handleBattlefieldCardClick.bind(this));

        this.#battleScreenElement.on('contextmenu.battleinteract', '.card', (e) => {
            e.preventDefault();
            this.#zoomHandler.handleZoomClick(e, this.#gameInstance);
        });

        this.#playerHandElement.off('mouseenter.battleinteract_cardaudio')
                               .on('mouseenter.battleinteract_cardaudio', '.card', () => this.#audioManager?.playSFX('cardDraw'));
        this.#playerBattlefieldElement.off('mouseenter.battleinteract_cardaudio')
                                    .on('mouseenter.battleinteract_cardaudio', '.card', () => this.#audioManager?.playSFX('buttonHover'));
        this.#opponentBattlefieldElement.off('mouseenter.battleinteract_cardaudio')
                                      .on('mouseenter.battleinteract_cardaudio', '.card', () => this.#audioManager?.playSFX('buttonHover'));

        this.#playerHandElement.on('dragstart.battleinteract_dnd', '.card', (e) => {
            const cardUniqueId = $(e.currentTarget).data('card-unique-id');
            if (cardUniqueId && this._canInteract(true)) {
                e.originalEvent.dataTransfer.setData('text/plain', cardUniqueId);
                e.originalEvent.dataTransfer.effectAllowed = "move";
                $(e.currentTarget).addClass('dragging-card');
                this.#audioManager?.playSFX('cardDraw');
            } else {
                e.preventDefault();
            }
        });

        this.#playerHandElement.on('dragend.battleinteract_dnd', '.card', (e) => {
            $(e.currentTarget).removeClass('dragging-card');
        });

        this.#playerBattlefieldElement
            .on('dragover.battleinteract_dnd', (e) => {
                if (this._canInteract(true)) {
                    const cardBeingDragged = e.originalEvent.dataTransfer.types.includes('text/plain');
                    if (cardBeingDragged) { 
                        e.preventDefault();
                        e.originalEvent.dataTransfer.dropEffect = "move";
                        this.#playerBattlefieldElement.addClass('drop-target-active');
                    }
                }
            })
            .on('dragleave.battleinteract_dnd', (e) => {
                this.#playerBattlefieldElement.removeClass('drop-target-active');
            })
            .on('drop.battleinteract_dnd', (e) => {
                e.preventDefault();
                this.#playerBattlefieldElement.removeClass('drop-target-active');
                if (this._canInteract(true)) {
                    const cardUniqueId = e.originalEvent.dataTransfer.getData('text/plain');
                    if (cardUniqueId) {
                        this._handleCardDropOnBattlefield(cardUniqueId);
                    }
                }
            });

        console.log("BattleInteractionManager: Game actions bound.");
    }

    _unbindGameActions() {
        console.log("BattleInteractionManager: Unbinding game actions...");
        const namespace = '.battleinteract';
        const audioNs = '.battleinteract_audio';
        const cardAudioNs = '.battleinteract_cardaudio';
        const dndNs = '.battleinteract_dnd';

        this.#btnEndTurn?.off(namespace + audioNs);
        this.#btnPassPhase?.off(namespace + audioNs);
        this.#btnDiscardMana?.off(namespace + audioNs);
        this.#btnConfirmAttack?.off(namespace + audioNs);
        this.#btnConfirmBlocks?.off(namespace + audioNs);
        this.#btnCancelDiscard?.off(namespace + audioNs);

        this.#playerHandElement?.off(namespace + cardAudioNs + dndNs);
        this.#playerBattlefieldElement?.off(namespace + cardAudioNs + dndNs);
        this.#opponentBattlefieldElement?.off(namespace + cardAudioNs);
        this.#battleScreenElement?.off(namespace);
    }

    _handleCardDropOnBattlefield(cardUniqueId) {
        console.log(`BattleInteractionManager: Card ${cardUniqueId} dropped on battlefield.`);
        const player = this.#gameInstance.getPlayer(this.#localPlayerId);
        if (!player) return;

        const cardInstance = player.hand.getCard(cardUniqueId);
        if (!cardInstance) {
            console.warn(`BattleInteractionManager: Dropped card ${cardUniqueId} not found in hand.`);
            return;
        }

        if (!cardInstance.canPlay(player, this.#gameInstance)) {
            this.#battleRenderer.updateActionFeedback(`Não é possível jogar ${cardInstance.name} agora.`);
            this.#battleRenderer.showCardFeedback(this.#playerHandElement.find(`.card[data-card-unique-id="${cardUniqueId}"]`), 'shake');
            this.#audioManager?.playSFX('genericError');
            return;
        }

        if (cardInstance.requiresTarget()) {
            this._enterTargetSelectionMode({
                cardUniqueId: cardInstance.uniqueId,
                targetType: cardInstance.targetType,
                cardName: cardInstance.name
            });
            this.#battleRenderer.updateActionFeedback(`Jogado ${cardInstance.name}. Selecione um alvo.`);
        } else {
            if (player.playCard(cardUniqueId, null, this.#gameInstance)) {
                this.#battleRenderer.updateActionFeedback(`${cardInstance.name} jogado.`);
            } else {
                this.#audioManager?.playSFX('genericError');
            }
        }
        this.#playerBattlefieldElement.removeClass('drop-target-active');
        this.#playerHandElement.find(`.card[data-card-unique-id="${cardUniqueId}"]`).removeClass('dragging-card');
    }

    _canInteract(needsActiveTurn = true, isDefendingAction = false) {
        if (!this.#gameInstance || !this.#localPlayerId) return false;
        if (this.#gameInstance.state !== 'playing') return false;
        
        const isMyTurn = this.#gameInstance.getCurrentPlayer()?.id === this.#localPlayerId;

        if (isDefendingAction) {
            // Permite interação se NÃO for meu turno E estou no modo de bloqueio
            return !isMyTurn && this.#isAssigningBlockers && this.#gameInstance.getCombatManager().state === 'declare_blockers';
        }

        if (needsActiveTurn && !isMyTurn) return false;
        if (this.#pendingEOTDiscardCount > 0 && !this.#isSelectingDiscardMana) return false; // Bloqueia outras ações se EOT discard estiver pendente, a menos que esteja especificamente no modo de descarte de mana.
        return true;
    }

    _disableAllGameActions(allowTargetables = false) {
        this.#battleScreenUI._updateTurnControls();
        if (!allowTargetables) {
            this.#battleRenderer.clearAllCardHighlights();
        }
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

        this.#battleRenderer.setPlayerHandSelectingMode(false);
        this.#battleRenderer.clearAllCardHighlights();
        this.#battleRenderer.updateActionFeedback('');
        console.log("BattleInteractionManager: All interaction modes reset.");
        this.#battleScreenUI._updateTurnControls();
        this.#btnCancelDiscard.hide();
    }

    _enterDiscardRequiredMode(count) {
        this.setPendingEOTDiscardCount(count);
        this.#battleRenderer.updateActionFeedback(`Mão cheia! Descarte ${count} carta(s).`);
        this.#battleRenderer.setPlayerHandSelectingMode(true, true);
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
        this.#btnCancelDiscard.show();
    }
    _exitDiscardManaSelectionMode() {
        if (!this.#isSelectingDiscardMana) return;
        this.#isSelectingDiscardMana = false;
        this.#battleRenderer.updateActionFeedback('');
        this.#battleRenderer.setPlayerHandSelectingMode(false);
        this.#battleScreenUI._updateTurnControls();
        this.#btnCancelDiscard.hide();
    }

    _enterTargetSelectionMode(actionInfo) {
        if (!actionInfo?.cardUniqueId || !actionInfo?.targetType) return;
        this._exitAllInteractionModes();
        this.#isSelectingTarget = true;
        this.#actionPendingTarget = actionInfo;
        this.#battleRenderer.updateActionFeedback(`Selecione um alvo (${actionInfo.targetType}) para ${actionInfo.cardName}.`);
        this.#battleRenderer.setBattlefieldTargetingMode(actionInfo.targetType, true);
        this._disableAllGameActions(true);
        this.#battleScreenUI._updateTurnControls();
        this.#btnCancelDiscard.show();
    }
    _exitTargetSelectionMode() {
        if (!this.#isSelectingTarget) return;
        this.#isSelectingTarget = false;
        this.#actionPendingTarget = null;
        this.#battleRenderer.updateActionFeedback('');
        this.#battleRenderer.setBattlefieldTargetingMode(null, false);
        this.#battleScreenUI._updateTurnControls();
        this.#btnCancelDiscard.hide();
    }

    _enterAttackerDeclarationMode() {
        if (this.#isDeclaringAttackers) return;
        const localPlayer = this.#gameInstance?.getPlayer(this.#localPlayerId);
        const possibleAttackers = localPlayer?.battlefield.getCreatures().filter(c => c.canAttack()) || [];
        if (possibleAttackers.length === 0) {
            console.log("Nenhum atacante disponível – passando fase de ataque automaticamente.");
            this.#gameInstance.passPhase();
            return;
        }
        this._exitAllInteractionModes();
        this.#isDeclaringAttackers = true;
        this.#selectedAttackerIds.clear();
        this.#battleRenderer.updateActionFeedback('Selecione suas criaturas para atacar e clique em "Confirmar Ataque".');
        possibleAttackers.forEach(c => {
            const cardEl = this.#playerBattlefieldElement.find(`.card[data-card-unique-id="${c.uniqueId}"]`);
            this.#battleRenderer.highlightTargetableCards(cardEl, true);
            cardEl.addClass('can-attack-visual');
        });
        this._disableAllGameActions(true);
        this.#battleScreenUI._updateTurnControls();
    }
    _exitAttackerDeclarationMode() {
        if (!this.#isDeclaringAttackers) return;
        this.#isDeclaringAttackers = false;
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
                 this.#battleRenderer.highlightTargetableCards(cardEl, true);
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
    }

    _handleEndTurnClick() {
        if (this._canInteract(true)) {
            if (this.#isSelectingDiscardMana || this.#isSelectingTarget) {
                this.#battleRenderer.updateActionFeedback("Finalize a ação atual ou cancele (ESC).");
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
        const isDefendingMode = this.#isAssigningBlockers &&
                                this.#gameInstance?.getCombatManager().state === 'declare_blockers' &&
                                this.#gameInstance?.getCurrentPlayer()?.id !== this.#localPlayerId;

        if (this._canInteract(true) || (this._canInteract(false, true) && isDefendingMode) ) {
             if (this.#isSelectingDiscardMana || this.#isSelectingTarget) {
                this.#battleRenderer.updateActionFeedback("Finalize a ação atual ou cancele (ESC).");
                this.#battleRenderer.showCardFeedback(this.#playerHandElement, 'shake');
                return;
            }

            if (isDefendingMode) {
                console.log("InteractionManager: Defending player chose to Pass Phase (not block).");
                this.#gameInstance.confirmBlockDeclaration(this.#localPlayerId, {}); 
                this._exitBlockerAssignmentMode(); 
            } else {
                console.log("InteractionManager: Player requested Pass Phase.");
                this.#gameInstance.passPhase();
            }
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

    _handleCancelDiscardClick() {
        if (this.#isSelectingDiscardMana) {
            this._exitDiscardManaSelectionMode();
        } else if (this.#isSelectingTarget) {
            this._exitTargetSelectionMode();
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
       
        if (!this._canInteract(true)) {
            console.log("BattleInteractionManager: Cannot interact (not player's turn or game state invalid).");
            return;
        }

        const cardInstance = localPlayer.hand.getCard(cardUniqueId);
        if (!cardInstance) return;

        // REMOVIDA A LÓGICA DE JOGAR A CARTA COM O CLIQUE
        console.log(`BattleInteractionManager: Card ${cardInstance.name} na mão clicado. O jogador deve arrastar para jogar.`);
        // Opcional: adicionar feedback de "selecionado para arrastar"
        // this.#playerHandElement.find('.card.selected-for-drag').removeClass('selected-for-drag');
        // $cardElement.addClass('selected-for-drag');
        // this.#battleRenderer.updateActionFeedback(`Arraste ${cardInstance.name} para o campo para jogar.`);
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
                if (localPlayer.playCard(action.cardUniqueId, cardUniqueId, this.#gameInstance)) {
                    // Sucesso
                } else {
                    this.#audioManager?.playSFX('genericError');
                }
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
                this.#battleScreenUI._updateTurnControls();
            } else {
                this.#battleRenderer.showCardFeedback($cardElement, 'shake');
                this.#battleRenderer.updateActionFeedback("Esta criatura não pode atacar.");
            }
            return;
        }

        if (this.#isAssigningBlockers) {
            const clickedCardIsLocal = ownerId === this.#localPlayerId;
            if (!clickedCardIsLocal) {
                this.#opponentBattlefieldElement.find('.card.attacker-selected-for-blocking').removeClass('attacker-selected-for-blocking');
                this.#selectedAttackerForBlocking = cardUniqueId;
                $cardElement.addClass('attacker-selected-for-blocking');
                this.#battleRenderer.updateActionFeedback(`Atacante ${$cardElement.data('card-name') || cardUniqueId} selecionado. Clique em sua criatura para bloquear.`);
            } else {
                if (!this.#selectedAttackerForBlocking) {
                    this.#battleRenderer.updateActionFeedback("Primeiro, clique no atacante inimigo que deseja bloquear.");
                    this.#battleRenderer.showCardFeedback($cardElement, 'shake');
                    return;
                }
                const blockerInstance = localPlayer.battlefield.getCard(cardUniqueId);
                if (blockerInstance?.type === 'Creature' && blockerInstance.canBlock()) {
                    this._assignBlockerToAttack(this.#selectedAttackerForBlocking, cardUniqueId);
                    const attackerCardEl = this.#opponentBattlefieldElement.find(`.card[data-card-unique-id="${this.#selectedAttackerForBlocking}"]`);
                    // A chamada a highlightBlockerAssignment foi movida para dentro de _assignBlockerToAttack ou refreshVisualHighlights
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
        if (this.#blockerAssignmentsUI[attackerId] && this.#blockerAssignmentsUI[attackerId].includes(blockerId)) {
            this.#blockerAssignmentsUI[attackerId] = this.#blockerAssignmentsUI[attackerId].filter(id => id !== blockerId);
            if (this.#blockerAssignmentsUI[attackerId].length === 0) {
                delete this.#blockerAssignmentsUI[attackerId];
            }
            console.log(`InteractionManager: Unassigned blocker ${blockerId} from attacker ${attackerId}`);
        } else {
            this.#blockerAssignmentsUI[attackerId] = [blockerId]; 
            console.log(`InteractionManager: Assigned blocker ${blockerId} to attacker ${attackerId}`);
        }
        this.refreshVisualHighlights(); 
        this.#battleScreenUI._updateTurnControls(); 
    }


    _handleConfirmAttackersClick() {
        if (this.#isDeclaringAttackers) {
            if (this.#selectedAttackerIds.size === 0) {
                this.#battleRenderer.updateActionFeedback("Selecione criaturas para atacar ou passe a fase.");
                return;
            }
            const attackersToConfirm = [...this.#selectedAttackerIds];
            this._exitAttackerDeclarationMode();
            this.#gameInstance.confirmAttackDeclaration(this.#localPlayerId, attackersToConfirm);
            // A mensagem "Aguardando oponente..." é agora condicional, baseada no estado do CombatManager
            // após a declaração.
            if (this.#gameInstance.getCombatManager().state === 'declare_blockers') {
                 this.#battleRenderer.updateActionFeedback("Aguardando oponente declarar bloqueadores...");
            } else {
                 this.#battleRenderer.updateActionFeedback("Ataque declarado."); // Ou outra mensagem apropriada
            }
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
        }
        else if (this.#isDeclaringAttackers) { this._exitAttackerDeclarationMode(); modeExited = true; }
        else if (this.#isAssigningBlockers) { this._exitBlockerAssignmentMode(); modeExited = true; }
        else {
            this.#zoomHandler.closeZoom();
        }
        if (modeExited) {
            this.refreshVisualHighlights();
        }
    }

    handlePhaseChange() {
        this._exitTargetSelectionMode();
        this._exitDiscardManaSelectionMode();
        this._exitAttackerDeclarationMode();
        this._exitBlockerAssignmentMode();
        this.#battleScreenUI._updateTurnControls();
    }

    handleTurnChange() {
        this._resetInteractionModes();
    }

    onDiscardRequired(count) {
        this._enterDiscardRequiredMode(count);
    }

    onDiscardResolved() {
        if (this.#pendingEOTDiscardCount === 0 && this.#gameInstance.state === 'playing') {
             this._exitDiscardRequiredMode();
        }
    }

    onOpponentAttackersDeclared() {
        this._enterBlockerAssignmentMode();
    }
}