// js/ui/battle/BattleInteractionManager.js

// Importações necessárias (podemos ajustar depois, se precisarmos de tipos específicos)
// import CreatureCard from '../../core/CreatureCard.js';
// import { RunebindingCard } from '../../core/RunebindingCard.js';

export default class BattleInteractionManager {
    // --- Referências Injetadas ---
    #gameInstance;      // Para interagir com a lógica do jogo
    #battleScreenUI;    // Para chamar métodos de feedback/atualização na UI principal (se necessário)
    #battleRenderer;    // Para solicitar atualizações visuais (ex: destacar alvos)
    #audioManager;      // Para tocar sons de UI
    #zoomHandler;       // Para o zoom de cartas
    #localPlayerId;     // ID do jogador local

    // --- Elementos da UI (Cache para binding de eventos) ---
    // Estes são os elementos onde os eventos de interação acontecem.
    #battleScreenElement; // Para contextmenu global e ESC
    #playerHandElement;
    #playerBattlefieldElement;
    #opponentBattlefieldElement;
    #btnEndTurn;
    #btnPassPhase;
    #btnDiscardMana;
    #btnConfirmAttack;
    #btnConfirmBlocks;
    // #actionFeedbackElement; // BattleRenderer já tem uma referência, podemos usar a dele

    // --- Estado Interno da Interação ---
    #isSelectingDiscardMana = false; // Flag for MANA discard selection mode
    #isSelectingTarget = false;
    #actionPendingTarget = null;     // { cardUniqueId, targetType, cardName }
    #isDeclaringAttackers = false;
    #selectedAttackerIds = new Set();
    #isAssigningBlockers = false;
    #blockerAssignmentsUI = {};     // { attackerId: [blockerId1, blockerId2] }
    #pendingEOTDiscardCount = 0; // For END OF TURN discard requirement

    constructor(game, battleScreenUI, battleRenderer, audioManager, zoomHandler) {
        if (!game || !battleScreenUI || !battleRenderer || !audioManager || !zoomHandler) {
            throw new Error("BattleInteractionManager: Missing required dependencies.");
        }
        this.#gameInstance = game;
        this.#battleScreenUI = battleScreenUI; // Pode ser usado para chamar _updateTurnControls em BattleScreenUI
        this.#battleRenderer = battleRenderer;
        this.#audioManager = audioManager;
        this.#zoomHandler = zoomHandler;

        this._cacheSelectors();
        if (!this.#battleScreenElement || !this.#battleScreenElement.length) {
            console.error("BattleInteractionManager Error: #battle-screen element not found!");
        }
        console.log("BattleInteractionManager initialized.");
    }

    // Chamado por BattleScreenUI para informar o ID do jogador local
    setLocalPlayerId(id) {
        this.#localPlayerId = id;
    }

    // Chamado por BattleScreenUI para informar a contagem de descarte obrigatório
    setPendingEOTDiscardCount(count) {
        this.#pendingEOTDiscardCount = count;
    }
    getPendingEOTDiscardCount() {
        return this.#pendingEOTDiscardCount;
    }

     // --- GETTERS PÚBLICOS PARA ESTADOS DE INTERAÇÃO ---
    isSelectingDiscardMana() {
        return this.#isSelectingDiscardMana;
    }

    isSelectingTarget() {
        return this.#isSelectingTarget;
    }

    isDeclaringAttackers() {
        return this.#isDeclaringAttackers;
    }

    isAssigningBlockers() {
        return this.#isAssigningBlockers;
    }

    getPendingEOTDiscardCount() { // Você já tinha este, mas confirmando
        return this.#pendingEOTDiscardCount;
    }

    getSelectedAttackerIds() { // Para o botão de confirmar ataque
        return new Set(this.#selectedAttackerIds); // Retorna uma cópia para evitar modificação externa
    }

    getBlockerAssignmentsUI() { // Para o botão de confirmar bloqueios
        return { ...this.#blockerAssignmentsUI }; // Retorna uma cópia
    }


    _cacheSelectors() {
        this.#battleScreenElement = $('#battle-screen'); // Root para ESC e contextmenu
        if (!this.#battleScreenElement.length) return;

        // Zonas clicáveis
        this.#playerHandElement = this.#battleScreenElement.find('#player-hand');
        this.#playerBattlefieldElement = this.#battleScreenElement.find('#player-battlefield');
        this.#opponentBattlefieldElement = this.#battleScreenElement.find('#opponent-battlefield');

        // Botões de ação
        this.#btnEndTurn = this.#battleScreenElement.find('#btn-end-turn');
        this.#btnPassPhase = this.#battleScreenElement.find('#btn-pass-phase');
        this.#btnDiscardMana = this.#battleScreenElement.find('#btn-discard-mana');
        this.#btnConfirmAttack = this.#battleScreenElement.find('#btn-confirm-attack');
        this.#btnConfirmBlocks = this.#battleScreenElement.find('#btn-confirm-blocks');
        // this.#actionFeedbackElement = this.#battleScreenElement.find('#action-feedback'); // Renderer já tem
    }

    /**
     * Vincula todos os eventos de interação do usuário (cliques em cartas, botões).
     * Chamado por BattleScreenUI quando a tela de batalha é ativada/renderizada.
     */
    bindGameActions() {
        if (!this.#battleScreenElement?.length) {
            console.error("BattleInteractionManager: Cannot bind actions, root element not found.");
            return;
        }
        console.log("BattleInteractionManager: Binding game actions...");
        this._unbindGameActions(); // Garante que não haja bindings duplicados

        const addAudio = ($element, sfxClick = 'buttonClick', sfxHover = 'buttonHover') => {
             if (!$element || !$element.length) return;
             $element.on('click.battleinteract_audio', () => this.#audioManager?.playSFX(sfxClick));
             $element.on('mouseenter.battleinteract_audio', () => this.#audioManager?.playSFX(sfxHover));
        };

        // Botões de Turno
        this.#btnEndTurn.on('click.battleinteract', this._handleEndTurnClick.bind(this));
        addAudio(this.#btnEndTurn);
        this.#btnPassPhase.on('click.battleinteract', this._handlePassPhaseClick.bind(this));
        addAudio(this.#btnPassPhase);
        this.#btnDiscardMana.on('click.battleinteract', this._handleDiscardForManaClick.bind(this));
        addAudio(this.#btnDiscardMana);

        // Botões de Combate
        this.#btnConfirmAttack.on('click.battleinteract', this._handleConfirmAttackersClick.bind(this));
        addAudio(this.#btnConfirmAttack, 'playCreature');
        this.#btnConfirmBlocks.on('click.battleinteract', this._handleConfirmBlockersClick.bind(this));
        addAudio(this.#btnConfirmBlocks, 'playCreature');

        // Cliques em Cartas (Mão e Campo)
        this.#playerHandElement.on('click.battleinteract', '.card', this._handleHandCardClick.bind(this));
        this.#playerBattlefieldElement.on('click.battleinteract', '.card', this._handleBattlefieldCardClick.bind(this));
        this.#opponentBattlefieldElement.on('click.battleinteract', '.card', this._handleBattlefieldCardClick.bind(this));

        // Context Menu (Zoom) - Delegado para todas as cartas na tela de batalha
        this.#battleScreenElement.on('contextmenu.battleinteract', '.card', (e) => {
            e.preventDefault();
            this.#zoomHandler.handleZoomClick(e, this.#gameInstance);
        });

        // Hover em cartas (para som) - opcional, pode ser gerenciado pelo renderer se preferir
        this.#playerHandElement.on('mouseenter.battleinteract_cardaudio', '.card', () => this.#audioManager?.playSFX('cardDraw'));
        this.#playerBattlefieldElement.on('mouseenter.battleinteract_cardaudio', '.card', () => this.#audioManager?.playSFX('buttonHover'));
        this.#opponentBattlefieldElement.on('mouseenter.battleinteract_cardaudio', '.card', () => this.#audioManager?.playSFX('buttonHover'));

        console.log("BattleInteractionManager: Game actions bound.");
    }

    /**
     * Remove todos os event listeners vinculados por esta classe.
     * Chamado por BattleScreenUI antes de re-vincular ou ao destruir a tela.
     */
    _unbindGameActions() {
        console.log("BattleInteractionManager: Unbinding game actions...");
        const namespace = '.battleinteract';
        const audioNamespace = '.battleinteract_audio';
        const cardAudioNamespace = '.battleinteract_cardaudio';

        this.#btnEndTurn?.off(namespace + audioNamespace);
        this.#btnPassPhase?.off(namespace + audioNamespace);
        this.#btnDiscardMana?.off(namespace + audioNamespace);
        this.#btnConfirmAttack?.off(namespace + audioNamespace);
        this.#btnConfirmBlocks?.off(namespace + audioNamespace);

        this.#playerHandElement?.off(namespace + cardAudioNamespace);
        this.#playerBattlefieldElement?.off(namespace + cardAudioNamespace);
        this.#opponentBattlefieldElement?.off(namespace + cardAudioNamespace);

        this.#battleScreenElement?.off(namespace); // Remove todos os .battleinteract do root
    }

    // --- Lógica de Controle de Interação (Modos) ---

    _canInteract(needsActiveTurn = true) {
        if (!this.#gameInstance || !this.#localPlayerId) return false;
        if (this.#gameInstance.state !== 'playing') {
            // console.log("InteractionManager: Cannot interact, game not in 'playing' state.");
            return false;
        }
        if (needsActiveTurn && this.#gameInstance.getCurrentPlayer()?.id !== this.#localPlayerId) {
            // console.log("InteractionManager: Cannot interact, not local player's turn.");
            return false;
        }
        if (this.#pendingEOTDiscardCount > 0) {
            // console.log("InteractionManager: Cannot interact, pending end-of-turn discard.");
            return false;
        }
        return true;
    }

    _disableAllGameActions(allowTargetables = false) {
        // Solicita ao BattleScreenUI que atualize os botões
        // BattleScreenUI tem a lógica de _updateTurnControls que consulta o estado do InteractionManager
        this.#battleScreenUI._updateTurnControls(); // Notifica a UI principal para atualizar os botões

        if (!allowTargetables) {
            this.#battleRenderer.clearAllCardHighlights();
            // Adicionar classes .disabled-zone se necessário (gerenciado pelo renderer)
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
        // this.#pendingEOTDiscardCount já é gerenciado por setPendingEOTDiscardCount

        this.#battleRenderer.setPlayerHandSelectingMode(false);
        this.#battleRenderer.clearAllCardHighlights();
        this.#battleRenderer.updateActionFeedback('');
        console.log("BattleInteractionManager: All interaction modes reset.");
        this.#battleScreenUI._updateTurnControls(); // Atualiza o estado dos botões
    }

    // --- Gerenciamento de Modos Específicos ---
    // (Copie os métodos _enter...Mode, _exit...Mode de BattleScreenUI para cá)
    // Ajuste para usar this.#battleRenderer para feedback visual e this.#battleScreenUI._updateTurnControls()

    _enterDiscardRequiredMode(count) {
        this.setPendingEOTDiscardCount(count); // Atualiza a contagem interna
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
        this._exitAllInteractionModes(); // Garante que outros modos sejam desativados
        this.#isSelectingDiscardMana = true;
        this.#battleRenderer.updateActionFeedback('Selecione uma carta para descartar por +1 Mana Máx.');
        this.#battleRenderer.setPlayerHandSelectingMode(true); // Mão fica selecionável
        this._disableAllGameActions(true); // Permite cliques na mão
        this.#battleScreenUI._updateTurnControls(); // Atualiza botões (ex: desabilita o próprio botão de descarte)
    }
    _exitDiscardManaSelectionMode() {
        if (!this.#isSelectingDiscardMana) return;
        this.#isSelectingDiscardMana = false;
        this.#battleRenderer.updateActionFeedback('');
        this.#battleRenderer.setPlayerHandSelectingMode(false);
        this.#battleScreenUI._updateTurnControls();
    }

    _enterTargetSelectionMode(actionInfo) { // actionInfo = { cardUniqueId, targetType, cardName }
        if (!actionInfo?.cardUniqueId || !actionInfo?.targetType) return;
        this._exitAllInteractionModes();
        this.#isSelectingTarget = true;
        this.#actionPendingTarget = actionInfo;
        this.#battleRenderer.updateActionFeedback(`Selecione um alvo (${actionInfo.targetType}) para ${actionInfo.cardName}.`);
        this.#battleRenderer.setBattlefieldTargetingMode(actionInfo.targetType, true); // Pede ao renderer para destacar
        this._disableAllGameActions(true); // Permite cliques em alvos
        this.#battleScreenUI._updateTurnControls();
    }
    _exitTargetSelectionMode() {
        if (!this.#isSelectingTarget) return;
        this.#isSelectingTarget = false;
        this.#actionPendingTarget = null;
        this.#battleRenderer.updateActionFeedback('');
        this.#battleRenderer.setBattlefieldTargetingMode(null, false); // Limpa destaques
        this.#battleScreenUI._updateTurnControls();
    }

    _enterAttackerDeclarationMode() {
        if (this.#isDeclaringAttackers) return;
        this._exitAllInteractionModes();
        this.#isDeclaringAttackers = true;
        this.#selectedAttackerIds.clear();
        this.#battleRenderer.updateActionFeedback('Selecione criaturas para atacar e confirme.');
        // Renderer deve destacar criaturas que podem atacar
        const localPlayer = this.#gameInstance?.getPlayer(this.#localPlayerId);
        localPlayer?.battlefield.getCreatures().forEach(c => {
            if (c.canAttack()) {
                const cardEl = this.#playerBattlefieldElement.find(`.card[data-card-unique-id="${c.uniqueId}"]`);
                this.#battleRenderer.highlightTargetableCards(cardEl, true);
            }
        });
        this._disableAllGameActions(true);
        this.#battleScreenUI._updateTurnControls(); // Mostra e ajusta o botão de confirmar ataque
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
        this.#battleRenderer.updateActionFeedback('Selecione um atacante inimigo e depois uma criatura sua para bloquear.');
        // Renderer destaca criaturas que podem bloquear e talvez os atacantes
        const localPlayer = this.#gameInstance?.getPlayer(this.#localPlayerId);
        localPlayer?.battlefield.getCreatures().forEach(c => {
            if (c.canBlock()) {
                 const cardEl = this.#playerBattlefieldElement.find(`.card[data-card-unique-id="${c.uniqueId}"]`);
                 this.#battleRenderer.highlightTargetableCards(cardEl, true);
            }
        });
        // Destacar atacantes como selecionáveis para atribuição
        this.#opponentBattlefieldElement.find('.card.attacking').addClass('targetable-for-block-assignment'); // Exemplo de classe

        this._disableAllGameActions(true);
        this.#battleScreenUI._updateTurnControls(); // Mostra e ajusta o botão de confirmar bloqueios
    }
    _exitBlockerAssignmentMode() {
        if (!this.#isAssigningBlockers) return;
        this.#isAssigningBlockers = false;
        this.#blockerAssignmentsUI = {};
        this.#battleRenderer.updateActionFeedback('');
        this.#battleRenderer.clearAllCardHighlights();
        this.#opponentBattlefieldElement.find('.card.targetable-for-block-assignment').removeClass('targetable-for-block-assignment');
        this.#battleScreenUI._updateTurnControls();
    }

    _exitAllInteractionModes() {
        this._exitDiscardManaSelectionMode();
        this._exitTargetSelectionMode();
        this._exitAttackerDeclarationMode();
        this._exitBlockerAssignmentMode();
        // Não sair do _exitDiscardRequiredMode aqui, pois é um estado imposto pelo jogo
    }

    // --- Handlers de Clique (Lógica de Interação Principal) ---
    // (Mova os métodos _handle...Click de BattleScreenUI para cá)
    // Ajuste para usar this.#gameInstance, this.#battleRenderer, this.#localPlayerId

    _handleEndTurnClick() {
        if (this._canInteract(true)) {
            if (this.#isSelectingDiscardMana) { // Checa modo de descarte por mana
                this.#battleRenderer.updateActionFeedback("Finalize o descarte por mana ou cancele (ESC).");
                this.#battleRenderer.showCardFeedback(this.#playerHandElement, 'shake');
                return;
            }
            // this.#pendingEOTDiscardCount é checado em _canInteract
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
        // A validação de _canInteract e o estado dos botões em _updateTurnControls já devem
        // prevenir que este handler seja chamado indevidamente.
        // Mas uma checagem extra aqui não faz mal.
        if (this._canInteract(true) && player &&
            !player.hasDiscardedForMana &&
            player.maxMana < 10 &&
            player.hand.getSize() > 0 &&
            !this.#isSelectingDiscardMana // Não entrar no modo se já estiver nele
            ) {
            this._enterDiscardManaSelectionMode();
        } else {
            // Fornecer feedback específico se o botão foi clicado quando não deveria
            if (player?.hasDiscardedForMana) this.#battleRenderer.updateActionFeedback("Você já descartou por mana neste turno.");
            else if (player?.maxMana >= 10) this.#battleRenderer.updateActionFeedback("Mana máxima (10) já atingida.");
            else if (player?.hand.getSize() === 0) this.#battleRenderer.updateActionFeedback("Sua mão está vazia.");
            else this.#battleRenderer.updateActionFeedback("Não é possível descartar por mana agora.");
        }
    }

    _handleHandCardClick(event) {
        const $cardElement = $(event.currentTarget);
        const cardUniqueId = $cardElement.data('card-unique-id');
        if (!cardUniqueId) return;

        const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
        if (!localPlayer) return;

        if (this.#isSelectingDiscardMana) { // Selecionando carta para DESCARTE POR MANA
            console.log(`InteractionManager: Card ${cardUniqueId} selected for mana discard.`);
            if (localPlayer.discardCardForMana(cardUniqueId, this.#gameInstance)) {
                this._exitDiscardManaSelectionMode();
            } else {
                this.#battleRenderer.showCardFeedback($cardElement, 'shake');
                this.#battleRenderer.updateActionFeedback("Não foi possível descartar esta carta por mana.");
            }
            return;
        }

        if (this.#pendingEOTDiscardCount > 0) { // Selecionando carta para DESCARTE OBRIGATÓRIO (fim de turno)
            console.log(`InteractionManager: Card ${cardUniqueId} selected for end-of-turn discard.`);
            if (this.#gameInstance.resolvePlayerDiscard(this.#localPlayerId, cardUniqueId)) {
                // Se o descarte foi resolvido e a contagem zerou, o modo é saído por eventos do jogo
            } else {
                this.#battleRenderer.showCardFeedback($cardElement, 'shake');
            }
            return;
        }

        if (this.#isSelectingTarget) { // Tentando jogar carta da mão enquanto seleciona alvo para OUTRA carta
            this.#battleRenderer.updateActionFeedback("Selecione um alvo válido no campo ou pressione ESC para cancelar o feitiço/habilidade atual.");
            this.#battleRenderer.showCardFeedback($cardElement, 'shake');
            return;
        }

        // Ação padrão: TENTAR JOGAR A CARTA
        if (!this._canInteract(true)) {
            this.#battleRenderer.updateActionFeedback("Não é possível jogar cartas agora.");
            return;
        }

        const cardInstance = localPlayer.hand.getCard(cardUniqueId);
        if (!cardInstance) {
            console.warn(`InteractionManager: Card instance ${cardUniqueId} not found in local player's hand.`);
            return;
        }

        if (!cardInstance.canPlay(localPlayer, this.#gameInstance)) {
            this.#battleRenderer.updateActionFeedback(`Não é possível jogar ${cardInstance.name} agora.`);
            this.#battleRenderer.showCardFeedback($cardElement, 'shake');
            return;
        }

        if (cardInstance.requiresTarget()) {
            this._enterTargetSelectionMode({
                cardUniqueId: cardInstance.uniqueId,
                targetType: cardInstance.targetType, // Usa o getter de Card
                cardName: cardInstance.name
            });
        } else {
            console.log(`InteractionManager: Playing card ${cardUniqueId} (no target).`);
            localPlayer.playCard(cardUniqueId, null, this.#gameInstance);
        }
    }

    _handleBattlefieldCardClick(event) {
        const $cardElement = $(event.currentTarget);
        const cardUniqueId = $cardElement.data('card-unique-id');
        const isOpponentCard = $cardElement.closest('#opponent-battlefield').length > 0;
        const ownerId = isOpponentCard ? this.#gameInstance.getOpponent(this.#localPlayerId)?.id : this.#localPlayerId;

        if (!cardUniqueId || !ownerId) return;

        const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
        if (!localPlayer) return;

        if (this.#isSelectingTarget) { // Selecionando um ALVO para uma carta/habilidade pendente
            // A validação do alvo (_checkIfValidTarget) ainda pode estar em BattleScreenUI ou ser movida para cá.
            // Assumindo que BattleScreenUI._checkIfValidTarget foi adaptado ou movido:
            if (this.#battleScreenUI._checkIfValidTarget(cardUniqueId, ownerId, this.#actionPendingTarget)) {
                const action = this.#actionPendingTarget;
                console.log(`InteractionManager: Playing card ${action.cardName} targeting ${cardUniqueId}.`);
                localPlayer.playCard(action.cardUniqueId, cardUniqueId, this.#gameInstance);
                this._exitTargetSelectionMode();
            } else {
                this.#battleRenderer.showCardFeedback($cardElement, 'invalid-target');
                this.#battleRenderer.updateActionFeedback("Alvo inválido para esta ação.");
            }
            return;
        }

        if (this.#isDeclaringAttackers) { // Selecionando ATACANTES
            if (ownerId !== this.#localPlayerId) {
                this.#battleRenderer.updateActionFeedback("Selecione suas criaturas para atacar.");
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
                this.#battleScreenUI._updateTurnControls(); // Atualiza estado do botão confirmar
            } else {
                this.#battleRenderer.showCardFeedback($cardElement, 'shake');
                this.#battleRenderer.updateActionFeedback("Esta criatura não pode atacar.");
            }
            return;
        }

        if (this.#isAssigningBlockers) { // Atribuindo BLOQUEADORES
            const clickedCardIsLocal = ownerId === this.#localPlayerId;

            if (!clickedCardIsLocal) { // Clicou em um ATACANTE inimigo
                this.#battleRenderer.highlightBlockerAssignment($cardElement, null, this.#blockerAssignmentsUI); // Apenas destaca o atacante
                this.#battleRenderer.updateActionFeedback(`Selecione uma criatura sua para bloquear ${$cardElement.data('card-name') || 'este atacante'}.`);
            } else { // Clicou em uma de SUAS criaturas (potencial bloqueador)
                const blocker = localPlayer.battlefield.getCard(cardUniqueId);
                const $targetAttackerElement = this.#battleScreenElement.find('.card.targetable-attacker'); // A classe 'targetable-attacker' seria aplicada pelo renderer
                const targetAttackerId = $targetAttackerElement.data('card-unique-id');

                if (!$targetAttackerElement.length || !targetAttackerId) {
                    this.#battleRenderer.updateActionFeedback("Selecione um atacante inimigo primeiro.");
                } else if (blocker?.type === 'Creature' && blocker.canBlock()) {
                    this._assignBlockerToAttack(targetAttackerId, cardUniqueId); // Novo método helper
                    this.#battleRenderer.highlightBlockerAssignment($targetAttackerElement, null, this.#blockerAssignmentsUI); // Atualiza destaques
                    this.#battleScreenUI._updateTurnControls(); // Atualiza botão confirmar
                    this.#battleRenderer.updateActionFeedback(`${blocker.name} bloqueará ${$targetAttackerElement.data('card-name')}.`);
                } else {
                    this.#battleRenderer.showCardFeedback($cardElement, 'shake');
                    this.#battleRenderer.updateActionFeedback("Esta criatura não pode bloquear.");
                }
            }
            return;
        }

        // Lógica para ativar habilidades de cartas no campo (futuro)
        console.log(`InteractionManager: Battlefield card clicked (no active mode): ${cardUniqueId}`);
    }

    _assignBlockerToAttack(attackerId, blockerId) { // Helper para atribuição de bloqueio
        if (!this.#isAssigningBlockers) return;
        // Lógica simples: um bloqueador por atacante.
        // Se quiser mudar o bloqueador para um atacante já bloqueado:
        // assignments[attackerId] = [blockerId];
        // Se quiser adicionar múltiplos bloqueadores a um atacante (se as regras permitirem):
        // if (!this.#blockerAssignmentsUI[attackerId]) this.#blockerAssignmentsUI[attackerId] = [];
        // if (!this.#blockerAssignmentsUI[attackerId].includes(blockerId)) {
        //    this.#blockerAssignmentsUI[attackerId].push(blockerId);
        // } else { // Des-selecionar bloqueador
        //    this.#blockerAssignmentsUI[attackerId] = this.#blockerAssignmentsUI[attackerId].filter(id => id !== blockerId);
        //    if(this.#blockerAssignmentsUI[attackerId].length === 0) delete this.#blockerAssignmentsUI[attackerId];
        // }

        // Para um único bloqueador por atacante (substitui anterior)
        this.#blockerAssignmentsUI[attackerId] = [blockerId];
        console.log(`InteractionManager: Assigned blocker ${blockerId} to attacker ${attackerId}`);
    }


    _handleConfirmAttackersClick() {
        if (this.#isDeclaringAttackers) {
            if (this.#selectedAttackerIds.size === 0) {
                 this.#battleRenderer.updateActionFeedback("Selecione criaturas para atacar ou passe a fase.");
                 return;
            }
            this.#gameInstance.confirmAttackDeclaration(this.#localPlayerId, [...this.#selectedAttackerIds]);
            this._exitAttackerDeclarationMode();
        }
    }

    _handleConfirmBlockersClick() {
        if (this.#isAssigningBlockers) {
            // Garante que apenas atacantes realmente bloqueados sejam enviados
            const finalAssignments = {};
            for (const attackerId in this.#blockerAssignmentsUI) {
                if (this.#blockerAssignmentsUI[attackerId] && this.#blockerAssignmentsUI[attackerId].length > 0) {
                    finalAssignments[attackerId] = this.#blockerAssignmentsUI[attackerId];
                }
            }
            console.log("InteractionManager: Sending blocker assignments to game:", finalAssignments);
            this.#gameInstance.confirmBlockDeclaration(this.#localPlayerId, finalAssignments);
            this._exitBlockerAssignmentMode();
        }
    }

    // --- Public Methods para BattleScreenUI chamar ---
    /** Chamado por BattleScreenUI quando a tela é ativada/desativada ou ESC é pressionado */
    handleEscKey() {
        if (this.#isSelectingTarget) this._exitTargetSelectionMode();
        else if (this.#isSelectingDiscardMana) this._exitDiscardManaSelectionMode();
        else if (this.#pendingEOTDiscardCount > 0) this._exitDiscardRequiredMode(); // Não deveria ser cancelável por ESC? Talvez só feedback.
        else if (this.#isDeclaringAttackers) this._exitAttackerDeclarationMode();
        else if (this.#isAssigningBlockers) this._exitBlockerAssignmentMode();
        else this.#zoomHandler.closeZoom(); // Se nenhum modo ativo, fecha o zoom
    }

    /** Chamado por BattleScreenUI quando a fase muda para resetar modos de interação */
    handlePhaseChange() {
        // Sair de modos que não persistem entre fases
        this._exitTargetSelectionMode();
        this._exitDiscardManaSelectionMode(); // Descarte por mana é só na fase de mana
        this._exitAttackerDeclarationMode();
        this._exitBlockerAssignmentMode();
        // O descarte obrigatório de fim de turno (pendingEOTDiscardCount) DEVE persistir.
        this.#battleScreenUI._updateTurnControls(); // Garante que os botões reflitam o novo estado
    }

    /** Chamado por BattleScreenUI quando o turno muda */
    handleTurnChange() {
        this._resetInteractionModes(); // Reseta todos os modos
        // pendingEOTDiscardCount é resetado pelo Game ou setado no final do turno do jogador
    }

    /** Chamado por BattleScreenUI quando um evento de descarte obrigatório é recebido */
    onDiscardRequired(count) {
        this._enterDiscardRequiredMode(count);
    }

    /** Chamado por BattleScreenUI quando o descarte obrigatório é resolvido */
    onDiscardResolved() {
        if (this.#pendingEOTDiscardCount > 0) { // Só sai se estava neste modo
            this._exitDiscardRequiredMode();
        }
    }
     /** Chamado por BattleScreenUI quando oponentes declaram atacantes */
    onOpponentAttackersDeclared() {
        this._enterBlockerAssignmentMode();
    }
}