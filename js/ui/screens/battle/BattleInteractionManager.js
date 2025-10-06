// js/ui/screens/battle/BattleInteractionManager.js

export default class BattleInteractionManager {
    // --- Referências Injetadas ---
    #gameInstance;
    #battleScreenUI;
    #battleRenderer;
    #audioManager;
    #zoomHandler;
    #localPlayerId;

    // --- Elementos da UI (Cache) ---
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
    #blockerAssignmentsUI = {}; // formato: { attackerId: { blockers: [blockerId1, ...], color: 'lime' } }
    #pendingEOTDiscardCount = 0;
    #selectedAttackerForBlocking = null;

    #pairingColors = ['lime', 'cyan', 'magenta', 'gold', 'orange', 'blueviolet'];
    #nextColorIndex = 0;

    constructor(game, battleScreenUI, battleRenderer, audioManager, zoomHandler) {
        // ... (construtor igual ao anterior)
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
        console.log("BattleInteractionManager initialized (v_pass_phase_fix).");
    }

    // ... (setLocalPlayerId, setPendingEOTDiscardCount, getters, _cacheSelectors, bindGameActions, _unbindGameActions, _handleCardDropOnBattlefield permanecem os mesmos) ...
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
        // Permite interação durante 'playing' ou 'discarding' (se for o jogador que precisa descartar)
        const validGameState = this.#gameInstance.state === 'playing' ||
                              (this.#gameInstance.state === 'discarding' &&
                               this.#gameInstance.getPendingDiscardInfo()?.playerId === this.#localPlayerId);
        if (!validGameState) return false;
        
        const isMyTurn = this.#gameInstance.getCurrentPlayer()?.id === this.#localPlayerId;

        if (isDefendingAction) {
            // Permite interação se NÃO for meu turno E estou no modo de bloqueio E o CM está esperando bloqueadores
            return !isMyTurn &&
                   this.#isAssigningBlockers &&
                   this.#gameInstance.getCombatManager().state === 'declare_blockers';
        }

        // Para outras ações, se precisa de turno ativo e não é meu turno, bloqueia.
        if (needsActiveTurn && !isMyTurn) return false;

        // Se um descarte obrigatório de fim de turno estiver pendente para este jogador,
        // SÓ permite interações relacionadas ao descarte.
        if (this.#pendingEOTDiscardCount > 0 && !this.#isSelectingDiscardMana /*&& !this.isCurrentlyDiscardingEOT()*/) {
            // (isCurrentlyDiscardingEOT() seria uma flag para saber se o clique atual é para escolher carta de descarte EOT)
            return false;
        }
        return true;
    }

    _disableAllGameActions(allowTargetables = false) {
        this.#battleScreenUI._updateTurnControls();
        if (!allowTargetables) {
            this.#battleRenderer.clearAllCardHighlights();
        }
    }

    _getNextPairColor() {
        const color = this.#pairingColors[this.#nextColorIndex];
        this.#nextColorIndex = (this.#nextColorIndex + 1) % this.#pairingColors.length;
        return color;
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
        this.#nextColorIndex = 0;

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
        
        // Se não há atacantes possíveis, não entra no modo, mas também não passa a fase automaticamente aqui.
        // O jogador PODE querer passar a fase mesmo sem atacantes.
        // A lógica de _updateTurnControls permitirá que "Passar Fase" seja clicado.
        if (possibleAttackers.length === 0) {
            this.#battleRenderer.updateActionFeedback('Nenhuma criatura pode atacar. Passe a fase ou jogue cartas.');
            // Não entra no modo de declaração se não há quem possa atacar.
            // Os botões serão atualizados por _updateTurnControls para refletir isso.
            this.#battleScreenUI._updateTurnControls();
            return; 
        }

        this._exitAllInteractionModes();
        this.#isDeclaringAttackers = true;
        this.#selectedAttackerIds.clear();
        this.#battleRenderer.updateActionFeedback('Selecione suas criaturas para atacar e clique em "Confirmar Ataque", ou clique em "Passar Fase".');
        
        this.refreshVisualHighlights();
        this._disableAllGameActions(true);
        this.#battleScreenUI._updateTurnControls();
    }
    _exitAttackerDeclarationMode() {
        if (!this.#isDeclaringAttackers) return;
        this.#isDeclaringAttackers = false;
        this.#selectedAttackerIds.clear();
        this.#battleRenderer.updateActionFeedback('');
        this.#battleRenderer.clearAllCardHighlights();
        this.#battleScreenUI._updateTurnControls();
    }

    _enterBlockerAssignmentMode() {
        if (this.#isAssigningBlockers) return;
        this._exitAllInteractionModes();
        this.#isAssigningBlockers = true;
        this.#blockerAssignmentsUI = {};
        this.#selectedAttackerForBlocking = null;
        this.#nextColorIndex = 0;
        this.#battleRenderer.updateActionFeedback('Clique em um ATACANTE inimigo, depois em sua CRIATURA para bloquear. Confirme ou passe a fase.');
        
        this.refreshVisualHighlights();
        this._disableAllGameActions(true);
        this.#battleScreenUI._updateTurnControls();
    }
    _exitBlockerAssignmentMode() {
        if (!this.#isAssigningBlockers) return;
        this.#isAssigningBlockers = false;
        this.#selectedAttackerForBlocking = null;
        this.#blockerAssignmentsUI = {};
        this.#nextColorIndex = 0;
        this.#battleRenderer.updateActionFeedback('');
        this.#battleRenderer.clearAllCardHighlights();
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
            if (this.#isSelectingDiscardMana || this.#isSelectingTarget || this.#isDeclaringAttackers || this.#isAssigningBlockers) {
                this.#battleRenderer.updateActionFeedback("Finalize a ação atual (ou ESC para cancelar alguns modos) antes de encerrar o turno.");
                return;
            }
            console.log("InteractionManager: Player requested End Turn.");
            this.#gameInstance.endTurn();
        } else {
             this.#battleRenderer.updateActionFeedback("Não é possível finalizar o turno agora.");
        }
    }

    _handlePassPhaseClick() {
        const currentPhase = this.#gameInstance.getCurrentPhase();
        const cmState = this.#gameInstance.getCombatManager().state;
        const isMyTurn = this.#gameInstance.getCurrentPlayer()?.id === this.#localPlayerId;

        // Checagens básicas para evitar passar fase em momentos indevidos (ex: seleção de alvo)
        if (this.#isSelectingDiscardMana || this.#isSelectingTarget) {
            this.#battleRenderer.updateActionFeedback("Finalize a ação atual ou cancele (ESC).");
            this.#battleRenderer.showCardFeedback(this.#playerHandElement, 'shake');
            return;
        }

        // Cenário 1: É meu turno, fase de ataque, estou declarando atacantes
        if (isMyTurn && currentPhase === 'attack' && this.#isDeclaringAttackers) {
            console.log("InteractionManager: Passando fase durante declaração de atacantes.");
            // Se nenhum atacante foi selecionado, é como se não quisesse atacar.
            // Se atacantes foram selecionados, confirma-os.
            const attackersToConfirm = [...this.#selectedAttackerIds];
            this._exitAttackerDeclarationMode(); // Limpa o modo de declaração
            this.#gameInstance.confirmAttackDeclaration(this.#localPlayerId, attackersToConfirm);
            // A lógica de `confirmAttackDeclaration` no Game.js e no BIM
            // levará para a declaração de bloqueadores do oponente ou resolverá o combate.
            // A mensagem de feedback será atualizada por esses fluxos.
            return;
        }

        // Cenário 2: Não é meu turno, fase de ataque, estou designando bloqueadores
        if (!isMyTurn && currentPhase === 'attack' && this.#isAssigningBlockers && cmState === 'declare_blockers') {
            console.log("InteractionManager: Passando fase durante designação de bloqueadores.");
            // Envia os bloqueios que já foram feitos. Atacantes não bloqueados causarão dano.
            const finalAssignmentsForGame = {};
            for (const attackerId in this.#blockerAssignmentsUI) {
                const assignmentInfo = this.#blockerAssignmentsUI[attackerId];
                if (assignmentInfo && assignmentInfo.blockers.length > 0) {
                    finalAssignmentsForGame[attackerId] = assignmentInfo.blockers;
                }
            }
            this.#gameInstance.confirmBlockDeclaration(this.#localPlayerId, finalAssignmentsForGame);
            this._exitBlockerAssignmentMode(); // Limpa o modo de bloqueio
            // O `CombatManager` resolverá o combate e o `Game.js` emitirá eventos.
            return;
        }

        // Cenário 3: Outras fases onde passar é permitido
        if (this._canInteract(true) || (!isMyTurn && currentPhase === 'attack' && cmState === 'declare_blockers' && !this.#isAssigningBlockers /* Se já saiu do modo de bloqueio mas ainda é fase de ataque do oponente */)) {
            console.log(`InteractionManager: Player requested Pass Phase (Fase: ${currentPhase}, Meu Turno: ${isMyTurn}).`);
            this.#gameInstance.passPhase();
        } else {
            this.#battleRenderer.updateActionFeedback("Não é possível passar a fase agora.");
            console.warn(`PassPhaseClick: Blocked. Phase: ${currentPhase}, MyTurn: ${isMyTurn}, CMState: ${cmState}, isDeclAtk: ${this.#isDeclaringAttackers}, isAssignBlk: ${this.#isAssigningBlockers}`);

        }
    }

    _handleDiscardForManaClick() {
        // ... (código igual ao anterior)
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
        // ... (código igual ao anterior)
        if (this.#isSelectingDiscardMana) {
            this._exitDiscardManaSelectionMode();
        } else if (this.#isSelectingTarget) {
            this._exitTargetSelectionMode();
        }
        this.refreshVisualHighlights();
    }

    _handleHandCardClick(event) {
        // ... (código igual ao anterior)
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
        console.log(`BattleInteractionManager: Card ${cardUniqueId} na mão clicado. Arraste para jogar.`);
    }

    _handleBattlefieldCardClick(event) {
        // ... (código com a lógica de desmarcar atacante já implementada na versão anterior)
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
            this.refreshVisualHighlights();
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
                } else {
                    this.#selectedAttackerIds.add(cardUniqueId);
                }
                this.refreshVisualHighlights();
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
                if (this.#selectedAttackerForBlocking === cardUniqueId) {
                    this.#selectedAttackerForBlocking = null;
                    this.#battleRenderer.updateActionFeedback('Atacante desmarcado. Selecione outro atacante ou um bloqueador.');
                } else {
                    this.#selectedAttackerForBlocking = cardUniqueId;
                    if (!this.#blockerAssignmentsUI[cardUniqueId]) {
                        this.#blockerAssignmentsUI[cardUniqueId] = {
                            blockers: [],
                            color: this._getNextPairColor()
                        };
                    }
                    const attackerName = $cardElement.data('card-name') || cardUniqueId;
                    this.#battleRenderer.updateActionFeedback(`Atacante ${attackerName} selecionado. Clique em sua criatura para bloquear, ou clique no atacante novamente para desmarcar.`);
                }
            } else { 
                if (!this.#selectedAttackerForBlocking) {
                    this.#battleRenderer.updateActionFeedback("Primeiro, clique no atacante inimigo que deseja bloquear.");
                    this.#battleRenderer.showCardFeedback($cardElement, 'shake');
                    return;
                }
                const blockerInstance = localPlayer.battlefield.getCard(cardUniqueId);
                if (blockerInstance?.type === 'Creature' && blockerInstance.canBlock()) {
                    this._assignBlockerToAttack(this.#selectedAttackerForBlocking, cardUniqueId);
                    
                    const attackerCardName = this.#opponentBattlefieldElement.find(`.card[data-card-unique-id="${this.#selectedAttackerForBlocking}"]`).data('card-name') || this.#selectedAttackerForBlocking;
                    const assignmentsForAttacker = this.#blockerAssignmentsUI[this.#selectedAttackerForBlocking]?.blockers || [];
                    if (assignmentsForAttacker.includes(cardUniqueId)) {
                        this.#battleRenderer.updateActionFeedback(`${blockerInstance.name} bloqueará ${attackerCardName}.`);
                    } else {
                         this.#battleRenderer.updateActionFeedback(`${blockerInstance.name} não bloqueará mais ${attackerCardName}.`);
                    }
                } else {
                    this.#battleRenderer.showCardFeedback($cardElement, 'shake');
                    this.#battleRenderer.updateActionFeedback("Esta criatura não pode bloquear.");
                }
            }
            this.refreshVisualHighlights();
            this.#battleScreenUI._updateTurnControls();
            return;
        }

        console.log(`InteractionManager: Battlefield card clicked (no active mode): ${cardUniqueId}`);
    }

    _assignBlockerToAttack(attackerId, blockerId) {
        // ... (lógica de _assignBlockerToAttack permanece a mesma)
        if (!this.#isAssigningBlockers || !attackerId || !blockerId) return;

        if (!this.#blockerAssignmentsUI[attackerId]) {
            this.#blockerAssignmentsUI[attackerId] = {
                blockers: [],
                color: this._getNextPairColor()
            };
        }

        const assignment = this.#blockerAssignmentsUI[attackerId];
        const blockerIndex = assignment.blockers.indexOf(blockerId);

        if (blockerIndex > -1) {
            assignment.blockers.splice(blockerIndex, 1);
            console.log(`InteractionManager: Unassigned blocker ${blockerId} from attacker ${attackerId}`);
        } else {
            for (const otherAttackerId in this.#blockerAssignmentsUI) {
                if (otherAttackerId !== attackerId) {
                    const otherAssignment = this.#blockerAssignmentsUI[otherAttackerId];
                    const idx = otherAssignment.blockers.indexOf(blockerId);
                    if (idx > -1) {
                        otherAssignment.blockers.splice(idx, 1);
                        console.log(`InteractionManager: Blocker ${blockerId} reassigned from ${otherAttackerId} to ${attackerId}`);
                    }
                }
            }
            assignment.blockers.push(blockerId);
            console.log(`InteractionManager: Assigned blocker ${blockerId} to attacker ${attackerId} with color ${assignment.color}`);
        }
    }

    _handleConfirmAttackersClick() {
        // ... (lógica de _handleConfirmAttackersClick permanece a mesma)
        if (this.#isDeclaringAttackers) {
            // O botão "Confirmar Ataque" só deve estar habilitado se houver atacantes selecionados.
            // A lógica de _updateTurnControls em BattleScreenUI deve cuidar disso.
            // Aqui, apenas pegamos os atacantes selecionados.
            const attackersToConfirm = [...this.#selectedAttackerIds];
            if (attackersToConfirm.length === 0) { // Segurança extra
                this.#battleRenderer.updateActionFeedback("Selecione criaturas para atacar ou passe a fase.");
                return;
            }
            this._exitAttackerDeclarationMode();
            this.#gameInstance.confirmAttackDeclaration(this.#localPlayerId, attackersToConfirm);
            if (this.#gameInstance.getCombatManager().state === 'declare_blockers') {
                 this.#battleRenderer.updateActionFeedback("Aguardando oponente declarar bloqueadores...");
            } else {
                 this.#battleRenderer.updateActionFeedback("Ataque declarado.");
            }
        }
    }

    _handleConfirmBlockersClick() {
        // ... (lógica de _handleConfirmBlockersClick permanece a mesma)
        if (this.#isAssigningBlockers) {
            const finalAssignmentsForGame = {};
            for (const attackerId in this.#blockerAssignmentsUI) {
                const assignmentInfo = this.#blockerAssignmentsUI[attackerId];
                if (assignmentInfo && assignmentInfo.blockers.length > 0) {
                    finalAssignmentsForGame[attackerId] = assignmentInfo.blockers;
                }
            }
            console.log("InteractionManager: Sending blocker assignments to game:", finalAssignmentsForGame);
            this.#gameInstance.confirmBlockDeclaration(this.#localPlayerId, finalAssignmentsForGame);
            this._exitBlockerAssignmentMode();
        }
    }

    refreshVisualHighlights() {
        // ... (lógica de refreshVisualHighlights permanece a mesma)
        if (!this.#gameInstance || !this.#localPlayerId) return;

        this.#battleRenderer.clearAllCardHighlights();

        if (this.#isDeclaringAttackers) {
            const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
            localPlayer?.battlefield.getCreatures().forEach(c => {
                const cardEl = this.#playerBattlefieldElement.find(`.card[data-card-unique-id="${c.uniqueId}"]`);
                if (c.canAttack()) {
                    cardEl.addClass('can-attack-visual');
                    if (this.#selectedAttackerIds.has(c.uniqueId)) {
                        this.#battleRenderer.highlightAttackerSelection(cardEl, true);
                    }
                } else {
                    cardEl.removeClass('can-attack-visual');
                }
            });
        } else if (this.#isAssigningBlockers) {
            const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
            localPlayer?.battlefield.getCreatures().forEach(c => {
                const cardEl = this.#playerBattlefieldElement.find(`.card[data-card-unique-id="${c.uniqueId}"]`);
                if (c.canBlock()) {
                    cardEl.addClass('can-block-visual');
                } else {
                    cardEl.removeClass('can-block-visual');
                }
            });

            this.#opponentBattlefieldElement?.find('.card.attacking').addClass('targetable-for-block-assignment');

            for (const attackerId in this.#blockerAssignmentsUI) {
                const assignmentInfo = this.#blockerAssignmentsUI[attackerId];
                const $attackerEl = this.#opponentBattlefieldElement.find(`.card[data-card-unique-id="${attackerId}"]`);

                if (assignmentInfo.blockers.length > 0) {
                    this.#battleRenderer.applyPairHighlight($attackerEl, assignmentInfo.color, true);
                    $attackerEl.removeClass('attacker-selected-for-blocking');

                    assignmentInfo.blockers.forEach(blockerId => {
                        const $blockerEl = this.#playerBattlefieldElement.find(`.card[data-card-unique-id="${blockerId}"]`);
                        this.#battleRenderer.applyPairHighlight($blockerEl, assignmentInfo.color, false);
                        $blockerEl.addClass('selected-blocker');
                    });
                } else if (attackerId === this.#selectedAttackerForBlocking) {
                    $attackerEl.addClass('attacker-selected-for-blocking');
                    this.#pairingColors.forEach(color => $attackerEl.removeClass(`blocking-pair-${color}`));
                    $attackerEl.removeClass('blocking-pair-border');
                } else {
                     this.#pairingColors.forEach(color => $attackerEl.removeClass(`blocking-pair-${color}`));
                     $attackerEl.removeClass('blocking-pair-border attacker-selected-for-blocking');
                }
            }
            
            if (this.#selectedAttackerForBlocking && 
                (!this.#blockerAssignmentsUI[this.#selectedAttackerForBlocking] || 
                 this.#blockerAssignmentsUI[this.#selectedAttackerForBlocking].blockers.length === 0)) {
                const $selectedAttackerEl = this.#opponentBattlefieldElement.find(`.card[data-card-unique-id="${this.#selectedAttackerForBlocking}"]`);
                $selectedAttackerEl.addClass('attacker-selected-for-blocking');
                this.#pairingColors.forEach(color => $selectedAttackerEl.removeClass(`blocking-pair-${color}`));
                $selectedAttackerEl.removeClass('blocking-pair-border');
            }

        } else if (this.#isSelectingTarget && this.#actionPendingTarget) {
            this.#battleRenderer.setBattlefieldTargetingMode(this.#actionPendingTarget.targetType, true);
        } else if (this.#isSelectingDiscardMana || this.#pendingEOTDiscardCount > 0) {
            this.#battleRenderer.setPlayerHandSelectingMode(true, this.#pendingEOTDiscardCount > 0);
        }
    }

    handleEscKey() {
        let handled = false;

        if (this.#isSelectingTarget) { 
            this._exitTargetSelectionMode(); 
            handled = true; 
        }
        else if (this.#isSelectingDiscardMana) { 
            this._exitDiscardManaSelectionMode(); 
            handled = true; 
        }
        else if (this.#pendingEOTDiscardCount > 0) {
            this.#battleRenderer.updateActionFeedback(`Mão cheia! Descarte ${this.#pendingEOTDiscardCount} carta(s).`);
            handled = true;
        }
        else if (this.#isDeclaringAttackers) { 
            this._exitAttackerDeclarationMode(); 
            handled = true; 
        }
        else if (this.#isAssigningBlockers) {
            if (this.#selectedAttackerForBlocking) {
            this.#selectedAttackerForBlocking = null;
            this.#battleRenderer.updateActionFeedback('Atacante desmarcado. Selecione outro atacante ou um bloqueador.');
            handled = true;
            } else {
            this._exitBlockerAssignmentMode();
            handled = true;
            }
        }
        else if (this.#zoomHandler?.isZoomOpen?.()) {
            this.#zoomHandler.closeZoom();
            handled = true;
        }

        if (handled) {
            this.refreshVisualHighlights();
        }

        return handled;
        }

    handlePhaseChange() {
        // ... (lógica de handlePhaseChange permanece a mesma)
        this._exitTargetSelectionMode();
        this._exitDiscardManaSelectionMode();
        this._exitAttackerDeclarationMode();
        this._exitBlockerAssignmentMode();
        this.#battleScreenUI._updateTurnControls();
        this.refreshVisualHighlights();
    }

    handleTurnChange() {
        // ... (lógica de handleTurnChange permanece a mesma)
        this._resetInteractionModes();
        this.refreshVisualHighlights();
    }

    onDiscardRequired(count) {
        // ... (lógica de onDiscardRequired permanece a mesma)
        this._exitAllInteractionModes();
        this._enterDiscardRequiredMode(count);
        this.refreshVisualHighlights();
    }

    onDiscardResolved() {
        // ... (lógica de onDiscardResolved permanece a mesma)
        if (this.#pendingEOTDiscardCount === 0 && this.#gameInstance.state === 'playing') {
             this._exitDiscardRequiredMode();
             this.refreshVisualHighlights();
        }
    }

    onOpponentAttackersDeclared() {
        // ... (lógica de onOpponentAttackersDeclared permanece a mesma)
        this._exitAllInteractionModes();
        this._enterBlockerAssignmentMode();
        // refreshVisualHighlights é chamado dentro de _enterBlockerAssignmentMode
    }
}