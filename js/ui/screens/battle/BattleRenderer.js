// js/ui/battle/BattleRenderer.js

import CardRenderer from '../../helpers/CardRenderer.js';

export default class BattleRenderer {
    // --- Referências Injetadas ---
    #cardRenderer;
    #accountManager; // Para buscar avatares, etc.
    #localPlayerId;   // Para saber qual jogador é o local

    // --- Elementos da UI (Cache) ---
    // (Copie todas as propriedades de elementos da UI de BattleScreenUI para cá)
    #battleScreenElement;
    #playerHandElement; #playerBattlefieldElement; #opponentHandElement; #opponentBattlefieldElement;
    #playerDeckCountElement; #playerGraveyardCountElement; #opponentDeckCountElement; #opponentGraveyardCountElement;
    #playerLifeElement; #playerManaElement; #playerMaxManaElement; #playerNameElement; #playerAvatarElement;
    #opponentLifeElement; #opponentManaElement; #opponentMaxManaElement; #opponentNameElement; #opponentAvatarElement;
    #opponentHandCountElement; #gameLogElement; #gameLogContainerElement;
    #turnNumberElement; #phaseIndicatorElement; #currentPlayerIndicatorElement; #actionFeedbackElement;
    #gameOverOverlayElement; #gameOverMessageElement; #btnConfirmAttack; #btnConfirmBlocks; // Botões de combate para show/hide
    #btnPassPhase; #btnEndTurn; #btnDiscardMana; // Botões de turno para enable/disable
    #playerDeckImgElement; #playerGraveyardImgElement; #opponentDeckImgElement; #opponentGraveyardImgElement;
    #graveyardPlaceholderSrc = 'assets/images/ui/graveyard.png';

    constructor(cardRendererInstance, accountManagerInstance) {
        this.#cardRenderer = cardRendererInstance;
        this.#accountManager = accountManagerInstance;
        this._cacheSelectors(); // Cache os seletores no construtor
        if (!this.#battleScreenElement || !this.#battleScreenElement.length) {
            console.error("BattleRenderer Error: #battle-screen element not found during construction!");
        }
    }

    // Método para definir o ID do jogador local (chamado por BattleScreenUI)
    setLocalPlayerId(id) {
        this.#localPlayerId = id;
    }

    _cacheSelectors() {
        this.#battleScreenElement = $('#battle-screen');
        if (!this.#battleScreenElement.length) return false;

        this.#playerHandElement = this.#battleScreenElement.find('#player-hand');
        this.#playerBattlefieldElement = this.#battleScreenElement.find('#player-battlefield');
        this.#opponentHandElement = this.#battleScreenElement.find('#opponent-hand');
        this.#opponentBattlefieldElement = this.#battleScreenElement.find('#opponent-battlefield');
        this.#playerDeckCountElement = this.#battleScreenElement.find('#player-deck-count');
        this.#playerGraveyardCountElement = this.#battleScreenElement.find('#player-graveyard-count');
        this.#opponentDeckCountElement = this.#battleScreenElement.find('#opponent-deck-count');
        this.#opponentGraveyardCountElement = this.#battleScreenElement.find('#opponent-graveyard-count');
        this.#playerLifeElement = this.#battleScreenElement.find('#player-life');
        this.#playerManaElement = this.#battleScreenElement.find('#player-mana');
        this.#playerMaxManaElement = this.#battleScreenElement.find('#player-max-mana');
        this.#playerNameElement = this.#battleScreenElement.find('#player-name');
        this.#playerAvatarElement = this.#battleScreenElement.find('#player-avatar-img');
        this.#opponentLifeElement = this.#battleScreenElement.find('#opponent-life');
        this.#opponentManaElement = this.#battleScreenElement.find('#opponent-mana');
        this.#opponentMaxManaElement = this.#battleScreenElement.find('#opponent-max-mana');
        this.#opponentNameElement = this.#battleScreenElement.find('#opponent-name');
        this.#opponentAvatarElement = this.#battleScreenElement.find('#opponent-avatar-img');
        this.#opponentHandCountElement = this.#battleScreenElement.find('#opponent-hand-count');
        this.#gameLogElement = this.#battleScreenElement.find('#game-log');
        this.#gameLogContainerElement = this.#battleScreenElement.find('.game-log-container');
        this.#turnNumberElement = this.#battleScreenElement.find('#turn-number');
        this.#phaseIndicatorElement = this.#battleScreenElement.find('#phase-indicator');
        this.#currentPlayerIndicatorElement = this.#battleScreenElement.find('#current-player-indicator');
        this.#actionFeedbackElement = this.#battleScreenElement.find('#action-feedback');
        this.#gameOverOverlayElement = this.#battleScreenElement.find('#game-over-overlay');
        this.#gameOverMessageElement = this.#battleScreenElement.find('#game-over-message');
        this.#btnConfirmAttack = this.#battleScreenElement.find('#btn-confirm-attack');
        this.#btnConfirmBlocks = this.#battleScreenElement.find('#btn-confirm-blocks');
        this.#btnPassPhase = this.#battleScreenElement.find('#btn-pass-phase');
        this.#btnEndTurn = this.#battleScreenElement.find('#btn-end-turn');
        this.#btnDiscardMana = this.#battleScreenElement.find('#btn-discard-mana');
        this.#playerDeckImgElement = this.#battleScreenElement.find('#player-deck-img');
        this.#playerGraveyardImgElement = this.#battleScreenElement.find('#player-graveyard-img');
        this.#opponentDeckImgElement = this.#battleScreenElement.find('#opponent-deck-img');
        this.#opponentGraveyardImgElement = this.#battleScreenElement.find('#opponent-graveyard-img');
        return true;
    }

    // --- Métodos de Renderização e Atualização da UI ---
    // (Mova os métodos relevantes de BattleScreenUI para cá, ajustando `this.#localPlayerId`)
    // Ex: _clearUI, _renderPlayerInfo, _addCardToHandUI, _renderPlayerHand, etc.

    clearUI() { // Renomeado de _clearUI para ser público
        if (!this.#playerHandElement) this._cacheSelectors(); // Lazy cache

        this.#playerHandElement?.empty();
        this.#playerBattlefieldElement?.empty();
        this.#opponentHandElement?.empty();
        this.#opponentBattlefieldElement?.empty();
        this.#gameLogElement?.html('<li>Log da Partida:</li>');
        this.#actionFeedbackElement?.text('');
        this.#playerDeckCountElement?.text('...');
        this.#playerGraveyardCountElement?.text('0');
        this.#opponentDeckCountElement?.text('...');
        this.#opponentGraveyardCountElement?.text('0');
        this.#opponentHandCountElement?.text('...');
        this.#playerLifeElement?.text('...'); this.#playerManaElement?.text('...'); this.#playerMaxManaElement?.text('...');
        this.#opponentLifeElement?.text('...'); this.#opponentManaElement?.text('...'); this.#opponentMaxManaElement?.text('...');
        this.#playerNameElement?.text('Jogador');
        this.#opponentNameElement?.text('Oponente');
        this.#playerAvatarElement?.attr('src', 'assets/images/avatars/default.png');
        this.#opponentAvatarElement?.attr('src', 'assets/images/avatars/default.png');
        this.#playerDeckImgElement?.attr('src', 'assets/images/cards/card_cover.png').show();
        this.#opponentDeckImgElement?.attr('src', 'assets/images/cards/card_cover.png').show();
        this.#playerGraveyardImgElement?.attr('src', this.#graveyardPlaceholderSrc).addClass('is-placeholder');
        this.#opponentGraveyardImgElement?.attr('src', this.#graveyardPlaceholderSrc).addClass('is-placeholder');
        this.#gameOverOverlayElement?.removeClass('active'); // Garante que o overlay de game over esteja escondido
        console.log("BattleRenderer: UI cleared.");
    }

    renderPlayerInfo(player, isLocal) {
        if (!player) return;
        const prefix = isLocal ? 'player' : 'opponent';
        const nameEl = isLocal ? this.#playerNameElement : this.#opponentNameElement;
        const avatarEl = isLocal ? this.#playerAvatarElement : this.#opponentAvatarElement;

        nameEl?.text(player.name);
        this.updatePlayerStats(player); // Atualiza vida/mana
        const userData = this.#accountManager?.getUserData(player.name); // Usa o AccountManager injetado
        const avatarSrc = `assets/images/avatars/${userData?.avatar || 'default.png'}`;
        avatarEl?.attr('src', avatarSrc).attr('alt', `${player.name} Avatar`);
    }

    addCardToHandUI(cardData) {
        if (!cardData || !this.#playerHandElement) return;
        const $cardElement = this.#cardRenderer.renderCard(cardData, 'hand');
        if ($cardElement) {
            this.#playerHandElement.append($cardElement);
            $cardElement.addClass('draw-animation');
            setTimeout(() => $cardElement.removeClass('draw-animation'), 400);
        }
    }

    renderPlayerHand(player) {
        if (!this.#playerHandElement) return;
        this.#playerHandElement.empty();
        player.hand.getCards().forEach(card => {
            this.addCardToHandUI(card.getRenderData());
        });
    }

    renderOpponentHand(opponent) {
        if (!this.#opponentHandElement || !this.#opponentHandCountElement) return;
        this.#opponentHandElement.empty();
        const handSize = opponent.hand.getSize();
        this.#opponentHandCountElement.text(handSize);
        for (let i = 0; i < handSize; i++) {
            this.#opponentHandElement.append($('<div class="card card-back"></div>'));
        }
    }

    addCardToBattlefieldUI(cardData, ownerId) {
        if (!cardData) return;
        const isLocal = ownerId === this.#localPlayerId;
        const $container = isLocal ? this.#playerBattlefieldElement : this.#opponentBattlefieldElement;
        if (!$container) return;

        const $cardElement = this.#cardRenderer.renderCard(cardData, 'battlefield');
        if ($cardElement) {
            $container.append($cardElement);
            $cardElement.addClass('play-animation');
            setTimeout(() => $cardElement.removeClass('play-animation'), 300);
        }
    }

    renderBattlefield(battlefield, ownerId) { // Modificado para receber ownerId
        const isLocal = ownerId === this.#localPlayerId;
        const $container = isLocal ? this.#playerBattlefieldElement : this.#opponentBattlefieldElement;
        if (!$container) return;

        $container.empty();
        battlefield.getAllCards().forEach(card => {
            this.addCardToBattlefieldUI(card.getRenderData(), card.ownerId);
        });
    }

    updatePlayerStats(player) {
        if (!player) return;
        const isLocal = player.id === this.#localPlayerId;
        const lifeEl = isLocal ? this.#playerLifeElement : this.#opponentLifeElement;
        const manaEl = isLocal ? this.#playerManaElement : this.#opponentManaElement;
        const maxManaEl = isLocal ? this.#playerMaxManaElement : this.#opponentMaxManaElement;

        lifeEl?.text(player.life);
        manaEl?.text(player.mana);
        maxManaEl?.text(player.maxMana);
    }

    updatePhaseIndicator(currentPhaseText) {
        this.#phaseIndicatorElement?.text(currentPhaseText);
    }

    updateCurrentPlayerIndicator(indicatorText) {
        this.#currentPlayerIndicatorElement?.text(indicatorText);
    }

    updateTurnNumber(turnNumber) {
        this.#turnNumberElement?.text(turnNumber);
    }

    addLogMessage(message, type = 'system') {
        if (!message || !this.#gameLogElement) return;
        const logClass = `log-${type}`;
        const $logEntry = $(`<li class="${logClass}"></li>`).text(message);
        this.#gameLogElement.prepend($logEntry);
        if (this.#gameLogElement.children().length > 50) {
            this.#gameLogElement.children().last().remove();
        }
        this.#gameLogContainerElement?.scrollTop(0);
    }

    updateDeckDisplay(player) {
        if (!player) return;
        const isLocal = player.id === this.#localPlayerId;
        const $countElement = isLocal ? this.#playerDeckCountElement : this.#opponentDeckCountElement;
        const $imgElement = isLocal ? this.#playerDeckImgElement : this.#opponentDeckImgElement;
        const count = player.deck.getSize();
        $countElement?.text(count);
        $imgElement?.toggle(count > 0);
    }

    updateGraveyardDisplay(player) {
        if (!player) return;
        const isLocal = player.id === this.#localPlayerId;
        const $countElement = isLocal ? this.#playerGraveyardCountElement : this.#opponentGraveyardCountElement;
        const $imgElement = isLocal ? this.#playerGraveyardImgElement : this.#opponentGraveyardImgElement;
        const graveyardCards = player.graveyard.getCards();
        const count = graveyardCards.length;
        $countElement?.text(count);
        if (count > 0) {
            const topCardData = graveyardCards[count - 1].getRenderData();
            $imgElement?.attr('src', topCardData.imageSrc || this.#graveyardPlaceholderSrc)
                       .attr('alt', `Cemitério: ${topCardData.name}`)
                       .removeClass('is-placeholder');
        } else {
            $imgElement?.attr('src', this.#graveyardPlaceholderSrc)
                       .attr('alt', 'Cemitério Vazio')
                       .addClass('is-placeholder');
        }
    }

    updateActionFeedback(text) {
        this.#actionFeedbackElement?.text(text);
    }

    showGameOver(message) {
        this.#gameOverMessageElement?.text(message);
        this.#gameOverOverlayElement?.addClass('active');
    }

    hideGameOver() {
        this.#gameOverOverlayElement?.removeClass('active');
    }

    // Métodos para atualizar a aparência dos botões de controle de turno
    updateTurnControlsUI(controlsState) {
        // controlsState = { passPhaseDisabled, endTurnDisabled, discardManaDisabled,
        //                   confirmAttackVisible, confirmAttackDisabled,
        //                   confirmBlocksVisible, confirmBlocksDisabled }
        if (!this.#btnPassPhase) this._cacheSelectors(); // Lazy cache

        this.#btnPassPhase?.prop('disabled', controlsState.passPhaseDisabled);
        this.#btnEndTurn?.prop('disabled', controlsState.endTurnDisabled);
        this.#btnDiscardMana?.prop('disabled', controlsState.discardManaDisabled);

        // Os botões de combate já têm sua própria lógica de toggle (show/hide)
        this.#btnConfirmAttack?.toggle(controlsState.confirmAttackVisible).prop('disabled', controlsState.confirmAttackDisabled);
        this.#btnConfirmBlocks?.toggle(controlsState.confirmBlocksVisible).prop('disabled', controlsState.confirmBlocksDisabled);
    }

    // Métodos para feedback visual em cartas
    highlightTargetableCards(selector, addClass = true) {
        if (!this.#battleScreenElement) return;
        if (addClass) {
            this.#battleScreenElement.find(selector).addClass('targetable');
        } else {
            this.#battleScreenElement.find(selector).removeClass('targetable');
        }
    }

    highlightAttackerSelection(cardElement, isSelected) {
        cardElement?.toggleClass('selected-attacker', isSelected);
    }

    highlightBlockerAssignment(attackerElement, blockerElements, assignments) {
        if (!this.#playerBattlefieldElement || !this.#opponentBattlefieldElement) return;
        // Limpa destaques anteriores
        this.#battleScreenElement.find('.card.targetable-attacker, .card.selected-blocker').removeClass('targetable-attacker selected-blocker');

        attackerElement?.addClass('targetable-attacker'); // Destaca o atacante sendo bloqueado
        Object.values(assignments).flat().forEach(blockerId => {
             this.#playerBattlefieldElement.find(`.card[data-card-unique-id="${blockerId}"]`).addClass('selected-blocker');
        });
    }

    clearAllCardHighlights() {
        this.#battleScreenElement?.find('.card').removeClass('targetable selected-attacker selected-blocker targetable-attacker attacking blocking');
    }
    
    setCardAttackingVisual(cardElement, isAttacking) {
        cardElement?.toggleClass('attacking', isAttacking);
    }

    setCardBlockingVisual(cardElement, isBlocking) {
        cardElement?.toggleClass('blocking', isBlocking);
    }

    showCardFeedback(cardElement, feedbackType, value = '') {
        if (!cardElement || !cardElement.length) return;
        cardElement.removeClass('feedback-shake feedback-invalid-target feedback-damage feedback-heal');
        void cardElement[0].offsetWidth; // Force reflow

        switch(feedbackType) {
            case 'shake': cardElement.addClass('feedback-shake'); break;
            case 'invalid-target': cardElement.addClass('feedback-invalid-target'); break;
            case 'damage-flash':
                cardElement.addClass('feedback-damage');
                const $dmgNum = $(`<span class="feedback-number damage">${value}</span>`);
                cardElement.append($dmgNum);
                setTimeout(() => $dmgNum.remove(), 600);
                break;
            case 'heal-flash':
                cardElement.addClass('feedback-heal');
                const $healNum = $(`<span class="feedback-number heal">${value}</span>`);
                cardElement.append($healNum);
                setTimeout(() => $healNum.remove(), 600);
                break;
        }
    }

    // Gerenciamento de classes para modos de seleção
    setPlayerHandSelectingMode(isSelecting, isRequired = false) {
        this.#playerHandElement?.toggleClass('selecting-discard', isSelecting);
        this.#playerHandElement?.toggleClass('required-discard', isSelecting && isRequired);
        this.#playerHandElement?.find('.card').toggleClass('targetable', isSelecting);
    }

    setBattlefieldTargetingMode(targetType, enable) {
        // Lógica de destacar alvos no campo (pode ser complexa, dependendo do targetType)
        // Por enquanto, apenas um toggle geral
        if (enable) {
            // Exemplo simples: destacar todas as criaturas
            // this.highlightTargetableCards('.card.creature', true); // Deve ser mais específico
        } else {
            this.clearAllCardHighlights(); // Ou apenas .removeClass('targetable')
        }
    }
}