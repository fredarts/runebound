// js/ui/battle/BattleRenderer.js

import CardRenderer from '../../helpers/CardRenderer.js';

export default class BattleRenderer {
    // --- Referências Injetadas ---
    #cardRenderer;
    #accountManager;
    #localPlayerId;

    // --- Elementos da UI (Cache) ---
    #battleScreenElement;
    #playerHandElement; #playerBattlefieldElement; #opponentHandElement; #opponentBattlefieldElement;
    #playerDeckCountElement; #playerGraveyardCountElement; #opponentDeckCountElement; #opponentGraveyardCountElement;
    #playerLifeElement; #playerManaElement; #playerMaxManaElement; #playerNameElement; #playerAvatarElement;
    #opponentLifeElement; #opponentManaElement; #opponentMaxManaElement; #opponentNameElement; #opponentAvatarElement;
    #opponentHandCountElement; #gameLogElement; #gameLogContainerElement;
    #actionFeedbackElement;
    #gameOverOverlayElement; #gameOverMessageElement; #btnConfirmAttack; #btnConfirmBlocks;
    #btnPassPhase; #btnEndTurn; #btnDiscardMana;
    #playerDeckImgElement; #playerGraveyardImgElement; #opponentDeckImgElement; #opponentGraveyardImgElement;
    #graveyardPlaceholderSrc = 'assets/images/ui/graveyard.png';

    // --- Elementos para o Turn Info Banner ---
    #turnInfoElement;
    #turnNumberElement;
    #phaseIndicatorElement;
    #currentPlayerIndicatorElement;

    constructor(cardRendererInstance, accountManagerInstance) {
        this.#cardRenderer = cardRendererInstance;
        this.#accountManager = accountManagerInstance;
        this._cacheSelectors();
        if (!this.#battleScreenElement || !this.#battleScreenElement.length) {
            console.error("BattleRenderer Error: #battle-screen element not found during construction!");
        } else {
            this.#turnInfoElement?.addClass('turn-info-banner-styled');
        }
    }

    setLocalPlayerId(id) {
        this.#localPlayerId = id;
    }

    _cacheSelectors() {
        this.#battleScreenElement = $('#battle-screen');
        if (!this.#battleScreenElement.length) {
            return false;
        }

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
        
        this.#turnInfoElement = this.#battleScreenElement.find('#turn-info');
        if (this.#turnInfoElement.length) {
            this.#turnNumberElement = this.#turnInfoElement.find('#turn-number');
            this.#phaseIndicatorElement = this.#turnInfoElement.find('#phase-indicator');
            this.#currentPlayerIndicatorElement = this.#turnInfoElement.find('#current-player-indicator');
        } else {
            console.warn("BattleRenderer _cacheSelectors: #turn-info element not found.");
        }
        
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

    clearUI() {
        if (!this.#battleScreenElement?.length && !this._cacheSelectors()) {
            console.error("BattleRenderer: clearUI - Cannot clear, elements not cached and #battle-screen not found.");
            return;
        }

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
        this.#gameOverOverlayElement?.removeClass('active');

        this.#turnInfoElement?.removeClass('show');
        this.#turnNumberElement?.text('...');
        this.#phaseIndicatorElement?.text('...');
        this.#currentPlayerIndicatorElement?.text('...');

        console.log("BattleRenderer: UI cleared.");
    }

    renderPlayerInfo(player, isLocal) {
        if (!player) return;
        const nameEl = isLocal ? this.#playerNameElement : this.#opponentNameElement;
        const avatarEl = isLocal ? this.#playerAvatarElement : this.#opponentAvatarElement;

        nameEl?.text(player.name);
        this.updatePlayerStats(player);
        const userData = this.#accountManager?.getUserData(player.name);
        const avatarSrc = `assets/images/avatars/${userData?.avatar || 'default.png'}`;
        avatarEl?.attr('src', avatarSrc).attr('alt', `${player.name} Avatar`);
    }

    addCardToHandUI(cardData) {
        if (!cardData || !this.#playerHandElement) return;
        const $cardElement = this.#cardRenderer.renderCard(cardData, 'hand');
        if ($cardElement) {
            // >>> ADICIONADO draggable="true" <<<
            $cardElement.attr('draggable', true);
            // >>> FIM DA ADIÇÃO <<<
            this.#playerHandElement.append($cardElement);
            $cardElement.addClass('draw-animation');
            setTimeout(() => $cardElement.removeClass('draw-animation'), 400);
        }
    }

    renderPlayerHand(player) {
        if (!this.#playerHandElement) return;
        this.#playerHandElement.empty();
        player.hand.getCards().forEach(card => {
            this.addCardToHandUI(card.getRenderData()); // addCardToHandUI já adiciona draggable
        });
    }

    renderOpponentHand(opponent) {
        if (!this.#opponentHandElement || !this.#opponentHandCountElement) return;
        this.#opponentHandElement.empty();
        const handSize = opponent.hand.getSize();
        this.#opponentHandCountElement.text(handSize);
        for (let i = 0; i < handSize; i++) {
            // Cartas do oponente não são draggable pelo jogador local
            this.#opponentHandElement.append($('<div class="card card-back"></div>'));
        }
    }

    addCardToBattlefieldUI(cardData, ownerId) {
        if (!cardData) return;
        const isLocal = ownerId === this.#localPlayerId;
        const $container = isLocal ? this.#playerBattlefieldElement : this.#opponentBattlefieldElement;
        if (!$container?.length) return;

        const $cardElement = this.#cardRenderer.renderCard(cardData, 'battlefield');
        if ($cardElement) {
            // Cartas no campo de batalha geralmente não são draggable para jogar,
            // mas podem ser para outros propósitos (ex: selecionar para efeito).
            // Para jogar da mão, o draggable é na mão.
            $container.append($cardElement);
            $cardElement.addClass('play-animation');
            setTimeout(() => $cardElement.removeClass('play-animation'), 300);
        }
    }

    renderBattlefield(battlefield, ownerId) {
        const isLocal = ownerId === this.#localPlayerId;
        const $container = isLocal ? this.#playerBattlefieldElement : this.#opponentBattlefieldElement;
        if (!$container?.length) return;

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

    _animateTurnInfoUpdate(updateTextCallback) {
        if (!this.#turnInfoElement || !this.#turnInfoElement.length) {
            if (typeof updateTextCallback === 'function') updateTextCallback();
            return;
        }
        
        this.#turnInfoElement.addClass('turn-info-banner-styled');
        this.#turnInfoElement.removeClass('show');

        setTimeout(() => {
            if (typeof updateTextCallback === 'function') {
                updateTextCallback();
            }
            if (this.#turnInfoElement && this.#turnInfoElement.closest('body').length) {
                void this.#turnInfoElement[0].offsetWidth;
                this.#turnInfoElement.addClass('show');
            }
        }, 300);
    }

    updatePhaseIndicator(currentPhaseText) {
        this._animateTurnInfoUpdate(() => {
            this.#phaseIndicatorElement?.text(currentPhaseText);
        });
    }

    updateCurrentPlayerIndicator(indicatorText) {
        this._animateTurnInfoUpdate(() => {
            this.#currentPlayerIndicatorElement?.text(indicatorText);
        });
    }

    updateTurnNumber(turnNumber) {
        this._animateTurnInfoUpdate(() => {
            this.#turnNumberElement?.text(turnNumber);
        });
    }

    addLogMessage(message, type = 'system') {
        if (!message || !this.#gameLogElement?.length) return;
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

    updateTurnControlsUI(controlsState) {
        if (!this.#battleScreenElement?.length && !this._cacheSelectors()) {
             console.error("BattleRenderer: updateTurnControlsUI - Elementos não cacheados.");
             return;
        }

        this.#btnPassPhase?.prop('disabled', controlsState.passPhaseDisabled).toggle(controlsState.passPhaseVisible);
        this.#btnEndTurn?.prop('disabled', controlsState.endTurnDisabled).toggle(controlsState.endTurnVisible);
        this.#btnDiscardMana?.prop('disabled', controlsState.discardManaDisabled).toggle(controlsState.discardManaVisible);
        this.#btnConfirmAttack?.toggle(controlsState.confirmAttackVisible).prop('disabled', controlsState.confirmAttackDisabled);
        this.#btnConfirmBlocks?.toggle(controlsState.confirmBlocksVisible).prop('disabled', controlsState.confirmBlocksDisabled);
    }

    highlightTargetableCards(selectorOrElement, addClass = true) {
        const $elements = (selectorOrElement instanceof jQuery) ? selectorOrElement : this.#battleScreenElement?.find(selectorOrElement);
        if (!$elements?.length) return;
        if (addClass) $elements.addClass('targetable');
        else $elements.removeClass('targetable');
    }

    highlightAttackerSelection(cardElement, isSelected) {
        cardElement?.toggleClass('selected-attacker', isSelected);
    }

    highlightBlockerAssignment(attackerElement, /* blockerElements - não usado diretamente aqui */ assignments) {
        if (!this.#battleScreenElement) return;
        this.#battleScreenElement.find('.card.attacker-selected-for-blocking, .card.selected-blocker').removeClass('attacker-selected-for-blocking selected-blocker');
        attackerElement?.addClass('attacker-selected-for-blocking');
        Object.values(assignments || {}).flat().forEach(blockerId => {
             this.#playerBattlefieldElement?.find(`.card[data-card-unique-id="${blockerId}"]`).addClass('selected-blocker');
        });
    }

    clearAllCardHighlights() {
        this.#battleScreenElement?.find('.card').removeClass(
            'targetable selected-attacker selected-blocker targetable-attacker attacking blocking can-attack-visual can-block-visual attacker-selected-for-blocking targetable-for-block-assignment'
        );
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
        void cardElement[0].offsetWidth;
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

    setPlayerHandSelectingMode(isSelecting, isRequired = false) {
        this.#playerHandElement?.toggleClass('selecting-discard', isSelecting);
        this.#playerHandElement?.toggleClass('required-discard', isSelecting && isRequired);
        // APENAS ADICIONA targetable ÀS CARTAS NA MÃO DO JOGADOR LOCAL
        if (isSelecting) {
            this.#playerHandElement?.find('.card').addClass('targetable');
        } else {
            this.#playerHandElement?.find('.card').removeClass('targetable');
        }
    }

    setBattlefieldTargetingMode(targetType, enable) {
        if (!this.#battleScreenElement) return;
        if (enable && targetType) {
            let selector = '';
            switch (targetType) {
                case 'creature': selector = '.card[data-card-id^="CR"], .card[data-card-id^="card_CR"]'; break;
                case 'opponent_creature': selector = '#opponent-battlefield .card[data-card-id^="CR"], #opponent-battlefield .card[data-card-id^="card_CR"]'; break;
                case 'own_creature': selector = '#player-battlefield .card[data-card-id^="CR"], #player-battlefield .card[data-card-id^="card_CR"]'; break;
                case 'runebinding': selector = '.card[data-card-id^="RB"], .card[data-card-id^="card_RB"]'; break;
            }
            if (selector) this.#battleScreenElement.find(selector).addClass('targetable');
            else console.warn(`BattleRenderer: setBattlefieldTargetingMode - targetType '${targetType}' não tem seletor definido.`);
        } else {
            this.clearAllCardHighlights(); // Limpa todos se não for para habilitar ou targetType for nulo
        }
    }
}