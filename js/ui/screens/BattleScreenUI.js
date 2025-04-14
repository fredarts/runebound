// js/ui/screens/BattleScreenUI.js - ATUALIZADO (v2.5 - AudioManager + Button Debug Logs)

// Importar dependências
import CardRenderer from '../helpers/CardRenderer.js';
import ZoomHandler from '../helpers/ZoomHandler.js';
import CreatureCard from '../../core/CreatureCard.js';
import { RunebindingCard } from '../../core/RunebindingCard.js';
import { InstantCard } from '../../core/InstantCard.js';
import { Graveyard } from '../../core/Graveyard.js';

export default class BattleScreenUI {
    // --- Referências Injetadas ---
    #screenManager;
    #accountManager;
    #cardDatabase;
    #cardRenderer;
    #zoomHandler;
    #audioManager;

    // --- Estado do Jogo (Recebido) ---
    #gameInstance = null;
    #localPlayerId = null;

    // --- Elementos da UI (Cache) ---
    #battleScreenElement;
    #playerHandElement;
    #playerBattlefieldElement;
    #opponentHandElement;
    #opponentBattlefieldElement;
    #playerDeckCountElement;
    #playerGraveyardCountElement;
    #opponentDeckCountElement;
    #opponentGraveyardCountElement;
    #playerLifeElement;
    #playerManaElement;
    #playerMaxManaElement;
    #playerNameElement;
    #playerAvatarElement;
    #opponentLifeElement;
    #opponentManaElement;
    #opponentMaxManaElement;
    #opponentNameElement;
    #opponentAvatarElement;
    #opponentHandCountElement;
    #gameLogElement;
    #gameLogContainerElement;
    #turnNumberElement;
    #phaseIndicatorElement;
    #currentPlayerIndicatorElement;
    #actionFeedbackElement;
    #gameOverOverlayElement;
    #gameOverMessageElement;
    #btnEndTurn;
    #btnPassPhase;
    #btnDiscardMana;
    #btnConfirmAttack;
    #btnConfirmBlocks;
    #btnBackToProfile;
    #playerDeckImgElement;
    #playerGraveyardImgElement;
    #opponentDeckImgElement;
    #opponentGraveyardImgElement;

    // --- Estado Interno da UI da Batalha ---
    #isSelectingDiscard = false;
    #isSelectingTarget = false;
    #actionPendingTarget = null;
    #isDeclaringAttackers = false;
    #selectedAttackerIds = new Set();
    #isAssigningBlockers = false;
    #blockerAssignmentsUI = {};
    #selectedBlockerId = null;
    #pendingDiscardCount = 0;
    #graveyardPlaceholderSrc = 'assets/images/ui/graveyard.png';

    // --- Construtor ---
    constructor(screenManager, accountManager, cardDatabase, cardRenderer, zoomHandler, audioManager) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;
        this.#cardRenderer = cardRenderer;
        this.#zoomHandler = zoomHandler;
        this.#audioManager = audioManager;

        this.#graveyardPlaceholderSrc = 'assets/images/ui/graveyard.png';

        this._cacheSelectors();
        if (!this.#battleScreenElement || !this.#battleScreenElement.length) {
            console.error("BattleScreenUI Error: #battle-screen element not found!");
            return;
        }
        this._bindPermanentEvents();
        console.log("BattleScreenUI initialized with AudioManager.");
    }

    // --- Métodos de Setup ---
    setGameInstance(gameInstance) {
        this.#gameInstance = gameInstance;
        if (this.#gameInstance) {
            this._bindGameEventListeners();
        }
    }
    setLocalPlayer(playerId) {
        this.#localPlayerId = playerId;
    }

    // --- Método Principal de Renderização ---
    renderInitialState() {
        if (!this.#gameInstance || !this.#localPlayerId) {
            console.error("BattleScreenUI Error: Game Instance or Local Player ID not set.");
            this.#screenManager.showScreen('profile-screen');
            return;
        }
        console.log("BattleScreenUI: Rendering initial game state...");
        this._clearUI();
        this._resetUIState();
        const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
        const opponent = this.#gameInstance.getOpponent(this.#localPlayerId);
        if (!localPlayer || !opponent) { console.error("BattleScreenUI Error: Players not found."); return; }
        console.log(`DEBUG: Initial Render - Local Hand Size: ${localPlayer.hand.getSize()}, Deck Size: ${localPlayer.deck.getSize()}`);
        console.log(`DEBUG: Initial Render - Opponent Hand Size: ${opponent.hand.getSize()}, Deck Size: ${opponent.deck.getSize()}`);
        this._renderPlayerInfo(localPlayer, true);
        this._renderPlayerInfo(opponent, false);
        this._renderPlayerHand(localPlayer);
        this._renderOpponentHand(opponent);
        this._updateDeckDisplay(localPlayer);
        this._updateDeckDisplay(opponent);
        this._updateGraveyardDisplay(localPlayer);
        this._updateGraveyardDisplay(opponent);
        this._renderBattlefield(localPlayer.battlefield, this.#playerBattlefieldElement);
        this._renderBattlefield(opponent.battlefield, this.#opponentBattlefieldElement);
        this.#turnNumberElement.text(this.#gameInstance.turnNumber || 1);
        this._updatePhaseIndicator();
        this._updateCurrentPlayerIndicator();
        this.#btnConfirmAttack.hide().prop('disabled', true);
        this.#btnConfirmBlocks.hide().prop('disabled', true);
        this._updateTurnControls();
        this.bindGameActions(); // Rebind actions AFTER initial render might be safer
        console.log("BattleScreenUI: Initial game state render complete.");
    }

    // --- Bindings de Eventos ---
    _bindPermanentEvents() {
        $('#battle-image-zoom-overlay').off('click.battlezoom').on('click.battlezoom', (event) => {
            if (event.target === event.currentTarget) this.#zoomHandler.closeZoom();
        });
        this.#gameOverOverlayElement.off('click.gameover').on('click.gameover', (event) => {
            if (event.target === event.currentTarget) { /* No action */ }
        });
        $(document).off('keydown.battlescreen').on('keydown.battlescreen', (e) => {
            if (!this.#battleScreenElement.hasClass('active')) return;
            if (e.key === "Escape") {
                this.#zoomHandler.closeZoom();
                if (this.#isSelectingTarget) this._exitTargetSelectionMode();
                if (this.#isSelectingDiscard) this._exitDiscardSelectionMode();
                if (this.#isDeclaringAttackers) this._exitAttackerDeclarationMode();
                if (this.#isAssigningBlockers) this._exitBlockerAssignmentMode();
            }
        });
    }
    _bindGameEventListeners() {
         if (!this.#gameInstance) return;
         console.log("BattleScreenUI: Binding game event listeners...");
         this.#gameInstance.addEventListener('turnChange', this._handleTurnChange.bind(this));
         this.#gameInstance.addEventListener('phaseChange', this._handlePhaseChange.bind(this));
         this.#gameInstance.addEventListener('playerStatsChanged', this._handlePlayerStatsChanged.bind(this));
         this.#gameInstance.addEventListener('cardDrawn', this._handleCardDrawn.bind(this));
         this.#gameInstance.addEventListener('cardMoved', this._handleCardMoved.bind(this));
         this.#gameInstance.addEventListener('gameLog', this._handleGameLog.bind(this));
         this.#gameInstance.addEventListener('creatureUpdate', this._handleCreatureUpdate.bind(this));
         this.#gameInstance.addEventListener('damagePrevented', this._handleDamagePrevented.bind(this));
         this.#gameInstance.addEventListener('creatureTookDamage', this._handleCreatureTookDamage.bind(this));
         this.#gameInstance.addEventListener('creatureHealed', this._handleCreatureHealed.bind(this));
         this.#gameInstance.addEventListener('gameOver', this._handleGameOver.bind(this));
         this.#gameInstance.addEventListener('deckEmpty', this._handleDeckEmpty.bind(this));
         this.#gameInstance.addEventListener('discardRequired', this._handleDiscardRequired.bind(this));
         this.#gameInstance.addEventListener('attackPhaseStart', this._handleAttackPhaseStart.bind(this));
         this.#gameInstance.addEventListener('attackersDeclared', this._handleAttackersDeclared.bind(this));
         this.#gameInstance.addEventListener('blockersDeclared', this._handleBlockersDeclared.bind(this));
         this.#gameInstance.addEventListener('combatResolved', this._handleCombatResolved.bind(this));
    }
    bindGameActions() {
        console.log("BattleScreenUI: Binding game action interactions...");

        const addBattleAudio = ($element, sfxClick = 'buttonClick', sfxHover = 'buttonHover') => {
             $element.off('click.battleaudio mouseenter.battleaudio');
             $element.on('click.battleaudio', () => this.#audioManager?.playSFX(sfxClick));
             $element.on('mouseenter.battleaudio', () => this.#audioManager?.playSFX(sfxHover));
        };

        // --- CHECK IF BUTTONS ARE CACHED CORRECTLY ---
        if (!this.#btnEndTurn || !this.#btnEndTurn.length) console.error("DEBUG: #btnEndTurn not cached!");
        if (!this.#btnPassPhase || !this.#btnPassPhase.length) console.error("DEBUG: #btnPassPhase not cached!");
        if (!this.#btnDiscardMana || !this.#btnDiscardMana.length) console.error("DEBUG: #btnDiscardMana not cached!");
        // --- END CHECK ---

        this.#btnEndTurn.off('click.battlescreen').on('click.battlescreen', this._handleEndTurnClick.bind(this));
        addBattleAudio(this.#btnEndTurn);
        this.#btnPassPhase.off('click.battlescreen').on('click.battlescreen', this._handlePassPhaseClick.bind(this));
        addBattleAudio(this.#btnPassPhase);
        this.#btnDiscardMana.off('click.battlescreen').on('click.battlescreen', this._handleDiscardForManaClick.bind(this));
        addBattleAudio(this.#btnDiscardMana);
        this.#btnConfirmAttack.off('click.battlescreen').on('click.battlescreen', this._handleConfirmAttackersClick.bind(this));
        addBattleAudio(this.#btnConfirmAttack);
        this.#btnConfirmBlocks.off('click.battlescreen').on('click.battlescreen', this._handleConfirmBlockersClick.bind(this));
        addBattleAudio(this.#btnConfirmBlocks);
        this.#playerHandElement.off('click.battlescreen', '.card').on('click.battlescreen', '.card', this._handleHandCardClick.bind(this));
        this.#playerBattlefieldElement.off('click.battlescreen', '.card').on('click.battlescreen', '.card', this._handleBattlefieldCardClick.bind(this));
        this.#opponentBattlefieldElement.off('click.battlescreen', '.card').on('click.battlescreen', '.card', this._handleBattlefieldCardClick.bind(this));
        this.#playerHandElement.off('contextmenu.battlescreen', '.card').on('contextmenu.battlescreen', '.card', (e) => this.#zoomHandler.handleZoomClick(e, this.#gameInstance));
        this.#playerBattlefieldElement.off('contextmenu.battlescreen', '.card').on('contextmenu.battlescreen', '.card', (e) => this.#zoomHandler.handleZoomClick(e, this.#gameInstance));
        this.#opponentBattlefieldElement.off('contextmenu.battlescreen', '.card').on('contextmenu.battlescreen', '.card', (e) => this.#zoomHandler.handleZoomClick(e, this.#gameInstance));
        this.#battleScreenElement.off('contextmenu.battlescreen', '.card').on('contextmenu.battlescreen', '.card', (e) => e.preventDefault());
        const $btnGameOverBack = this.#btnBackToProfile;
        $btnGameOverBack.off('click.battlescreen').on('click.battlescreen', () => {
            this.#gameOverOverlayElement.removeClass('active');
            this.#gameInstance = null;
            this.#screenManager.showScreen('profile-screen');
        });
        addBattleAudio($btnGameOverBack);
        console.log("BattleScreenUI: Game action bindings presumably complete.");
    }

    // --- Handlers de Eventos do Jogo ---
    _handleTurnChange(e) { this._updateCurrentPlayerIndicator(); this._updateTurnControls(); }
    _handlePhaseChange(e) { this._updatePhaseIndicator(); this._updateTurnControls(); this._exitCombatModes(); }
    _handlePlayerStatsChanged(e) { const p = this.#gameInstance?.getPlayer(e.detail.playerId); if (p) this._updatePlayerStats(p); }
    _handleCardDrawn(e) {
        const { playerId, card } = e.detail;
        // console.log(`DEBUG: _handleCardDrawn - Player ID: ${playerId}, Card: ${card?.name}`); // Kept for reference
        if (playerId === this.#localPlayerId) {
            this._addCardToHandUI(card);
            this.#audioManager?.playSFX('cardDraw');
        } else {
            this._updateOpponentHandCount(this.#gameInstance?.getPlayer(playerId));
        }
        const player = this.#gameInstance?.getPlayer(playerId);
        if (player) this._updateDeckDisplay(player);
    }
    _handleCardPlayed(e) { /* Handled by _handleCardMoved */ }
    _handleCardMoved(e) {
        const { cardUniqueId, cardData, fromZone, toZone, ownerId } = e.detail;
        const isLocal = ownerId === this.#localPlayerId;
        const player = this.#gameInstance?.getPlayer(ownerId); if (!player) return;

        if (fromZone === 'hand' && isLocal) this.#playerHandElement.find(`.card[data-card-unique-id="${cardUniqueId}"]`).remove();
        else if (fromZone === 'battlefield') $(`#${isLocal ? 'player' : 'opponent'}-battlefield .card[data-card-unique-id="${cardUniqueId}"]`).remove();

        if (toZone === 'hand' && isLocal) this._addCardToHandUI(cardData);
        else if (toZone === 'battlefield') this._addCardToBattlefieldUI(cardData, ownerId);

        if (toZone === 'graveyard' && fromZone === 'hand' && isLocal) {
            this.#audioManager?.playSFX('cardDiscard');
            if (this.#pendingDiscardCount > 0) {
                 this.#pendingDiscardCount--;
                 if (this.#pendingDiscardCount <= 0) this._exitDiscardRequiredMode();
                 else this.#actionFeedbackElement.text(`Mão cheia! Descarte ${this.#pendingDiscardCount} carta(s).`);
             }
        } else if ((toZone === 'battlefield' || toZone === 'graveyard') && fromZone === 'hand') {
            if (cardData?.type === 'Creature') this.#audioManager?.playSFX('playCreature');
            else if (cardData?.type === 'Instant') this.#audioManager?.playSFX('playInstant');
            else if (cardData?.type === 'Runebinding') this.#audioManager?.playSFX('playRunebinding');
        }

        if (['deck'].includes(fromZone) || ['deck'].includes(toZone)) this._updateDeckDisplay(player);
        if (['graveyard'].includes(fromZone) || ['graveyard'].includes(toZone)) this._updateGraveyardDisplay(player);
        if ((fromZone === 'hand' || toZone === 'hand') && !isLocal) this._updateOpponentHandCount(player);
    }
    _handleGameLog(e) { this._addLogMessage(e.detail.message, e.detail.type || 'system'); }
    _handleCreatureUpdate(e) { /* ... */ }
    _handleDamagePrevented(e) { /* ... */ }
    _handleCreatureTookDamage(e) { /* ... */ }
    _handleCreatureHealed(e) { /* ... */ }
    _handleCombatResolved(e) { /* ... */ }
    _handleGameOver(e) {
        const { winnerId, winnerName, loserName } = e.detail;
        const isWinner = winnerId === this.#localPlayerId;
        const msg = isWinner ? `Vitória! Você derrotou ${loserName || 'o oponente'}!` : `Derrota! ${winnerName || 'O oponente'} venceu!`;
        this.#gameOverMessageElement.text(msg);
        this.#gameOverOverlayElement.addClass('active');
        this._disableAllGameActions();
        this.#audioManager?.playSFX(isWinner ? 'gameOverWin' : 'gameOverLose');
        this.#audioManager?.stopBGM();
    }
    _handleDeckEmpty(e) { /* ... */ }
    _handleDiscardRequired(e) { /* ... */ }
    _handleAttackPhaseStart(e) { this._updateTurnControls(); }
    _handleAttackersDeclared(e) { /* ... */ }
    _handleBlockersDeclared(e) { /* ... */ }

    // --- Handlers de Ações da UI (with DEBUG LOGS) ---
    _handleEndTurnClick() {
        // === DEBUG LOG ===
        console.log("DEBUG: _handleEndTurnClick called.");
        console.log("DEBUG: _canInteract(true) =", this._canInteract(true));
        console.log("DEBUG: gameInstance =", this.#gameInstance);
        // === END DEBUG LOG ===
        if (this._canInteract(true)) {
            console.log("DEBUG: Calling gameInstance.endTurn()");
            this.#gameInstance?.endTurn();
        }
    }
    _handlePassPhaseClick() {
        // === DEBUG LOG ===
        console.log("DEBUG: _handlePassPhaseClick called.");
        console.log("DEBUG: _canInteract(true) =", this._canInteract(true));
        console.log("DEBUG: gameInstance =", this.#gameInstance);
        // === END DEBUG LOG ===
        if (this._canInteract(true)) {
            console.log("DEBUG: Calling gameInstance.passPhase()");
            this.#gameInstance?.passPhase();
        }
    }
    _handleDiscardForManaClick() {
        // === DEBUG LOG ===
        console.log("DEBUG: _handleDiscardForManaClick called.");
        console.log("DEBUG: _canInteract(true) =", this._canInteract(true));
        console.log("DEBUG: Button disabled =", this.#btnDiscardMana.prop('disabled'));
        // === END DEBUG LOG ===
        if (this._canInteract(true) && !this.#btnDiscardMana.prop('disabled')) {
            console.log("DEBUG: Entering discard selection mode for mana.");
            this._enterDiscardSelectionMode();
        }
    }
    _handleHandCardClick(event) {
        console.log("DEBUG: _handleHandCardClick called.");
        const $cardElement = $(event.currentTarget);
        const cardUniqueId = $cardElement.data('card-unique-id');
        if (!cardUniqueId) return;

        // === FIX: PRIORITIZE DISCARD CHECK ===
        if (this.#isSelectingDiscard) {
            console.log(`DEBUG: Attempting to discard card ${cardUniqueId} for mana...`);
            // Directly call the player's discard function
            if (this.#gameInstance?.getPlayer(this.#localPlayerId)?.discardCardForMana(cardUniqueId, this.#gameInstance)) {
                // Success! Exit discard mode.
                this._exitDiscardSelectionMode();
            } else {
                // Discard failed (e.g., already discarded this turn) - Game core should emit log
                // No need to exit discard mode here, let the player try another card.
                console.warn(`DEBUG: discardCardForMana returned false for ${cardUniqueId}`);
            }
            return; // <<< IMPORTANT: Stop further processing in this handler
        }

          if (this.#isSelectingTarget) {
              console.warn("DEBUG: Cannot click hand card while selecting target.");
              this._addLogMessage("Selecione um alvo válido ou pressione ESC para cancelar.", "feedback");
              return;
          }

          if (!this._canInteract(true)) return; // Check if player can act

          const card = this.#gameInstance?.getPlayer(this.#localPlayerId)?.hand.getCard(cardUniqueId);
          if (!card) { console.warn(`Card not found in hand: ${cardUniqueId}`); return; }

          if (card.requiresTarget()) {
              this._enterTargetSelectionMode({ cardUniqueId: cardUniqueId, targetType: card.targetType() });
          } else {
              console.log(`DEBUG: Playing card ${cardUniqueId} without target...`);
              this.#gameInstance?.getPlayer(this.#localPlayerId)?.playCard(cardUniqueId, null, this.#gameInstance);
          }
     }
    _handleBattlefieldCardClick(event) {
         console.log("DEBUG: _handleBattlefieldCardClick called."); // <<< LOG ADDED
         /* ... (rest of the existing logic) ... */
           const $cardElement = $(event.currentTarget);
           const cardUniqueId = $cardElement.data('card-unique-id');
           const ownerId = $cardElement.closest('.player-area').attr('id')?.includes('opponent')
                         ? this.#gameInstance?.getOpponent(this.#localPlayerId)?.id
                         : this.#localPlayerId;

           if (!cardUniqueId) return;

           // --- TARGET SELECTION LOGIC ---
           if (this.#isSelectingTarget) {
               if (this._checkIfValidTarget(cardUniqueId, ownerId, this.#actionPendingTarget)) {
                   const actionCardId = this.#actionPendingTarget.cardUniqueId;
                   console.log(`DEBUG: Playing card ${actionCardId} targeting ${cardUniqueId}...`);
                   this.#gameInstance?.getPlayer(this.#localPlayerId)?.playCard(actionCardId, cardUniqueId, this.#gameInstance);
                   this._exitTargetSelectionMode();
               } else {
                   this._showCardFeedback($cardElement, 'invalid-target');
                   this._addLogMessage("Alvo inválido para esta ação.", "error");
               }
               return; // Exit after handling target click
           }

           // --- ATTACKER DECLARATION LOGIC ---
           if (this.#isDeclaringAttackers && ownerId === this.#localPlayerId) {
                const creature = this.#gameInstance?.getPlayer(this.#localPlayerId)?.battlefield.getCard(cardUniqueId);
                if (creature?.canAttack()) {
                     if (this.#selectedAttackerIds.has(cardUniqueId)) {
                         this.#selectedAttackerIds.delete(cardUniqueId);
                         $cardElement.removeClass('selected-attacker');
                     } else {
                         this.#selectedAttackerIds.add(cardUniqueId);
                         $cardElement.addClass('selected-attacker');
                     }
                      this.#btnConfirmAttack.prop('disabled', this.#selectedAttackerIds.size === 0);
                 } else {
                      this._showCardFeedback($cardElement, 'shake');
                      this._addLogMessage("Esta criatura não pode atacar.", "feedback");
                 }
                 return; // Exit after handling attacker selection
           }

           // --- BLOCKER ASSIGNMENT LOGIC ---
           if(this.#isAssigningBlockers) {
               const isOpponentCard = ownerId !== this.#localPlayerId;
               const isLocalCard = ownerId === this.#localPlayerId;

               if (isOpponentCard && this.#selectedAttackerIds.has(cardUniqueId)) {
                   // Clicked on an ATTACKER (to assign blockers TO it)
                   this.#selectedBlockerId = null; // Clear selected blocker
                   $('.card.selected-blocker').removeClass('selected-blocker');
                   $('.card.targetable-attacker').removeClass('targetable-attacker');
                   $cardElement.addClass('targetable-attacker'); // Highlight the attacker being assigned to
                   this._addLogMessage("Selecione uma criatura sua para bloquear este atacante.", "feedback");

               } else if (isLocalCard) {
                   // Clicked on one of YOUR creatures (potential blocker)
                   const blocker = this.#gameInstance?.getPlayer(this.#localPlayerId)?.battlefield.getCard(cardUniqueId);
                   const targetAttackerId = $('.card.targetable-attacker').data('card-unique-id');

                   if (blocker?.canBlock() && targetAttackerId) {
                        // Assign this blocker to the highlighted attacker
                        this._assignBlocker(targetAttackerId, cardUniqueId);
                        $('.card.targetable-attacker').removeClass('targetable-attacker'); // Clear attacker highlight
                        this._addLogMessage("Bloqueador designado. Selecione outro atacante ou confirme.", "feedback");
                   } else if (!targetAttackerId) {
                        this._addLogMessage("Selecione um atacante inimigo primeiro.", "feedback");
                   } else {
                       this._showCardFeedback($cardElement, 'shake');
                       this._addLogMessage("Esta criatura não pode bloquear.", "feedback");
                   }
               }
               return; // Exit after handling blocker assignment click
           }

            // Default action if no specific mode is active (e.g., activate ability - future)
            console.log(`DEBUG: Battlefield card clicked (no active mode): ${cardUniqueId}`);
     }

    _handleConfirmAttackersClick() { if (this.#isDeclaringAttackers) { this.#gameInstance?.confirmAttackDeclaration(this.#localPlayerId, [...this.#selectedAttackerIds]); this._exitAttackerDeclarationMode(); } }
    _handleConfirmBlockersClick() { if (this.#isAssigningBlockers) { this.#gameInstance?.confirmBlockDeclaration(this.#localPlayerId, { ...this.#blockerAssignmentsUI }); this._exitBlockerAssignmentMode(); } }

    // --- Métodos de Estado da UI ---
    _resetUIState() { /* ... */ }
    _canInteract(needsActiveTurn = true) {
        if (this.#gameInstance?.state !== 'playing') return false;
        if (needsActiveTurn && this.#gameInstance?.getCurrentPlayer()?.id !== this.#localPlayerId) return false;
        if (this.#isSelectingDiscard || this.#isSelectingTarget || this.#isDeclaringAttackers || this.#isAssigningBlockers) return false; // Can't do general actions during specific selections
        return true;
    }
    _enterDiscardRequiredMode(count) { /* ... */ }
    _exitDiscardRequiredMode() { /* ... */ }
    _enterDiscardSelectionMode() { /* ... */ }
    _exitDiscardSelectionMode() {
        if (!this.#isSelectingDiscard) return;
        console.log("DEBUG: Exiting discard selection mode.");
        this.#isSelectingDiscard = false;
        this.#actionFeedbackElement.text(''); // Clear feedback message
        this.#playerHandElement.removeClass('selecting-discard');
        this.#playerHandElement.find('.card').removeClass('targetable'); // Remove highlight
    }
    _enterTargetSelectionMode(actionInfo) { /* ... */ }
    _exitTargetSelectionMode() { /* ... */ }
    _enterAttackerDeclarationMode() { /* ... */ }
    _exitAttackerDeclarationMode() { /* ... */ }
    _enterBlockerAssignmentMode() { /* ... */ }
    _exitBlockerAssignmentMode() { /* ... */ }
    _exitCombatModes() { /* ... */ }
    _clearCombatVisuals() { /* ... */ }
    _assignBlocker(attackerId, blockerId) { /* ... */ }
    _updateBlockerAssignmentVisuals() { /* ... */ }
    _highlightValidTargets(targetType) { /* ... */ }
    _checkIfValidTarget(targetId, targetOwnerId, actionInfo) { /* ... */ }
    _showCardFeedback($cardElement, feedbackType, value = '') { /* ... */ }
    _disableAllGameActions(allowTargetables=false) { /* ... */ }
    _closeZoomedImage() { this.#zoomHandler.closeZoom(); }

    // --- Métodos de Renderização da UI ---
    _clearUI() {
        this.#playerHandElement.empty();
        this.#playerBattlefieldElement.empty();
        this.#opponentHandElement.empty();
        this.#opponentBattlefieldElement.empty();
        this.#gameLogElement.html('<li>Log da Partida:</li>');
        this.#actionFeedbackElement.text('');
        this.#playerDeckCountElement.text('?');
        this.#playerGraveyardCountElement.text('0');
        this.#opponentDeckCountElement.text('?');
        this.#opponentGraveyardCountElement.text('0');
        this.#opponentHandCountElement.text('?');
        console.log("DEBUG: _clearUI called.");
    }
    _renderPlayerInfo(player, isLocal) {
        const prefix = isLocal ? 'player' : 'opponent';
        $(`#${prefix}-name`).text(player.name);
        $(`#${prefix}-life`).text(player.life);
        $(`#${prefix}-mana`).text(player.mana);
        $(`#${prefix}-max-mana`).text(player.maxMana);
        // console.log(`DEBUG: Rendering player info for ${player.name} (isLocal: ${isLocal}) - Life: ${player.life}, Mana: ${player.mana}/${player.maxMana}`);
        const userData = this.#accountManager?.getUserData(player.name);
        const avatarSrc = `assets/images/avatars/${userData?.avatar || 'default.png'}`;
        $(`#${prefix}-avatar-img`).attr('src', avatarSrc).attr('alt', `${player.name} Avatar`);
    }
    _addCardToHandUI(cardData) {
        if (!cardData) return;
        // console.log(`DEBUG: _addCardToHandUI - Attempting to render card: ${cardData.name} (ID: ${cardData.uniqueId})`);
        const $cardElement = this.#cardRenderer.renderCard(cardData, 'hand');
        if ($cardElement) {
            // console.log(`DEBUG: _addCardToHandUI - Appending card element to player hand:`, $cardElement[0]);
            this.#playerHandElement.append($cardElement);
        } else {
            console.warn("DEBUG: _addCardToHandUI - Failed to render card element for", cardData.name);
        }
    }
    _renderPlayerHand(player) {
        this.#playerHandElement.empty();
        const handCards = player.hand.getCards();
        // console.log(`DEBUG: _renderPlayerHand - Rendering ${handCards.length} cards for ${player.name}`);
        handCards.forEach(card => {
            this._addCardToHandUI(card.getRenderData());
        });
    }
    _renderOpponentHand(opponent) {
        this.#opponentHandElement.empty();
        const handSize = opponent.hand.getSize();
        // console.log(`DEBUG: _renderOpponentHand - Rendering ${handSize} card backs for ${opponent.name}`);
        this.#opponentHandCountElement.text(handSize);
        for (let i = 0; i < handSize; i++) {
            const $cardBack = $('<div class="card card-back"></div>');
            this.#opponentHandElement.append($cardBack);
        }
    }
    _updateOpponentHandCount(opponent) {
        if (!opponent) return;
        const count = opponent.hand.getSize();
        // console.log(`DEBUG: _updateOpponentHandCount - Setting count to ${count} for ${opponent.name}`);
        this.#opponentHandCountElement.text(count);
        this._renderOpponentHand(opponent); // Re-render backs to match count
    }
    _addCardToBattlefieldUI(cardData, ownerId) {
        if (!cardData) return;
        const $container = ownerId === this.#localPlayerId ? this.#playerBattlefieldElement : this.#opponentBattlefieldElement;
        const $cardElement = this.#cardRenderer.renderCard(cardData, 'battlefield');
        if ($cardElement) {
            // console.log(`DEBUG: Appending card ${cardData.name} to battlefield for owner ${ownerId}`);
            $container.append($cardElement);
        } else {
            console.warn("DEBUG: Failed to render battlefield card for", cardData.name);
        }
    }
    _renderBattlefield(battlefield, $container) {
        $container.empty();
        const cards = battlefield.getAllCards();
        // console.log(`DEBUG: _renderBattlefield - Rendering ${cards.length} cards into container`, $container[0]);
        cards.forEach(card => {
            this._addCardToBattlefieldUI(card.getRenderData(), card.ownerId);
        });
    }
    _updatePlayerStats(player) {
        if (!player) return;
        const isLocal = player.id === this.#localPlayerId;
        const prefix = isLocal ? 'player' : 'opponent';
        // console.log(`DEBUG: _updatePlayerStats for ${player.name} - Life: ${player.life}, Mana: ${player.mana}/${player.maxMana}`);
        $(`#${prefix}-life`).text(player.life);
        $(`#${prefix}-mana`).text(player.mana);
        $(`#${prefix}-max-mana`).text(player.maxMana);
    }
    _updatePhaseIndicator() {
        if (!this.#gameInstance || !this.#phaseIndicatorElement || !this.#phaseIndicatorElement.length) {
            console.warn("DEBUG: _updatePhaseIndicator - Cannot update, gameInstance or element missing.");
            return;
        }
        const currentPhase = this.#gameInstance.getCurrentPhase();

        // Optional: Map internal phase names to user-friendly names
        const phaseMap = {
            'mana': 'Mana',
            'draw': 'Compra',
            'main': 'Principal',
            'attack': 'Ataque',
            'end': 'Final'
        };
        const displayPhase = phaseMap[currentPhase] || currentPhase; // Use mapped name or raw name as fallback

        // === DEBUG LOG ===
        console.log(`DEBUG: _updatePhaseIndicator - Setting phase text to: ${displayPhase} (raw: ${currentPhase})`);
        // === END DEBUG LOG ===
        this.#phaseIndicatorElement.text(displayPhase);
    }

    // Make sure _handlePhaseChange calls it:
    _handlePhaseChange(e) {
        // === DEBUG LOG ===
        // console.log("DEBUG: _handlePhaseChange received:", e.detail);
        // === END DEBUG LOG ===
        this._updatePhaseIndicator();
        this._updateTurnControls(); // Already likely here
        this._exitCombatModes();    // Already likely here
    }
    _updateCurrentPlayerIndicator() { /* ... */ }
    _updateTurnControls() { /* ... */ }
    _addLogMessage(message, type = 'system') {
        if (!message || !this.#gameLogElement || !this.#gameLogElement.length) {
            console.warn("DEBUG: _addLogMessage - Cannot add log, element missing or message empty.");
            return;
        }
        // === DEBUG LOG ===
        console.log(`DEBUG: _addLogMessage - Adding log (type: ${type}): "${message}"`);
        // === END DEBUG LOG ===

        const logClass = `log-${type}`; // Apply class based on type for styling
        const $logEntry = $(`<li class="${logClass}"></li>`).text(message);

        this.#gameLogElement.prepend($logEntry); // Add to the top (most recent first)

        // Keep log trimmed (optional, e.g., keep last 50 entries)
        const maxLogEntries = 50;
        if (this.#gameLogElement.children().length > maxLogEntries) {
            this.#gameLogElement.children().last().remove();
        }

        // Auto-scroll the container to the top
        if (this.#gameLogContainerElement && this.#gameLogContainerElement.length) {
            this.#gameLogContainerElement.scrollTop(0);
             // === DEBUG LOG ===
            // console.log("DEBUG: _addLogMessage - Scrolled log container to top.");
             // === END DEBUG LOG ===
        } else {
             console.warn("DEBUG: _addLogMessage - Log container element not found for scrolling.");
        }
    }

    // Make sure the _handleGameLog method exists and calls _addLogMessage:
    _handleGameLog(e) {
        // === DEBUG LOG ===
        // console.log("DEBUG: _handleGameLog received:", e.detail);
        // === END DEBUG LOG ===
        this._addLogMessage(e.detail.message, e.detail.type || 'system');
    }
    _updateDeckDisplay(player) {
        if (!player) return;
        const isLocal = player.id === this.#localPlayerId;
        const $countElement = isLocal ? this.#playerDeckCountElement : this.#opponentDeckCountElement;
        const $imgElement = isLocal ? this.#playerDeckImgElement : this.#opponentDeckImgElement;
        const count = player.deck.getSize();
        // console.log(`DEBUG: _updateDeckDisplay for ${player.name} (isLocal: ${isLocal}) - Setting count to ${count}`);
        $countElement.text(count);
        $imgElement.toggle(count > 0);
    }
    _updateGraveyardDisplay(player) {
        if (!player) return;
        const isLocal = player.id === this.#localPlayerId;
        const $countElement = isLocal ? this.#playerGraveyardCountElement : this.#opponentGraveyardCountElement;
        const $imgElement = isLocal ? this.#playerGraveyardImgElement : this.#opponentGraveyardImgElement;
        const graveyardCards = player.graveyard.getCards();
        const count = graveyardCards.length;
        // console.log(`DEBUG: _updateGraveyardDisplay for ${player.name} (isLocal: ${isLocal}) - Setting count to ${count}`);
        $countElement.text(count);
        if (count > 0) {
            const topCard = graveyardCards[count - 1];
            const topCardData = topCard.getRenderData();
            $imgElement.attr('src', topCardData.imageSrc).attr('alt', `Top Card: ${topCardData.name}`).removeClass('is-placeholder');
        } else {
            $imgElement.attr('src', this.#graveyardPlaceholderSrc).attr('alt', 'Cemitério Vazio').addClass('is-placeholder');
        }
    }

    // Cache dos seletores jQuery
    _cacheSelectors() {
        this.#battleScreenElement = $('#battle-screen');
        if (!this.#battleScreenElement.length) { console.error("BattleScreenUI CacheSelectors Error: #battle-screen not found during caching."); return; }
        this.#playerHandElement = this.#battleScreenElement.find('#player-hand');
        this.#playerBattlefieldElement = this.#battleScreenElement.find('#player-battlefield');
        this.#playerDeckCountElement = this.#battleScreenElement.find('#player-deck-count');
        this.#playerGraveyardCountElement = this.#battleScreenElement.find('#player-graveyard-count');
        this.#playerLifeElement = this.#battleScreenElement.find('#player-life');
        this.#playerManaElement = this.#battleScreenElement.find('#player-mana');
        this.#playerMaxManaElement = this.#battleScreenElement.find('#player-max-mana');
        this.#playerNameElement = this.#battleScreenElement.find('#player-name');
        this.#playerAvatarElement = this.#battleScreenElement.find('#player-avatar-img');
        this.#playerDeckImgElement = this.#battleScreenElement.find('#player-deck-img');
        this.#playerGraveyardImgElement = this.#battleScreenElement.find('#player-graveyard-img');

        this.#opponentHandElement = this.#battleScreenElement.find('#opponent-hand');
        this.#opponentBattlefieldElement = this.#battleScreenElement.find('#opponent-battlefield');
        this.#opponentDeckCountElement = this.#battleScreenElement.find('#opponent-deck-count');
        this.#opponentGraveyardCountElement = this.#battleScreenElement.find('#opponent-graveyard-count');
        this.#opponentLifeElement = this.#battleScreenElement.find('#opponent-life');
        this.#opponentManaElement = this.#battleScreenElement.find('#opponent-mana');
        this.#opponentMaxManaElement = this.#battleScreenElement.find('#opponent-max-mana');
        this.#opponentNameElement = this.#battleScreenElement.find('#opponent-name');
        this.#opponentAvatarElement = this.#battleScreenElement.find('#opponent-avatar-img');
        this.#opponentHandCountElement = this.#battleScreenElement.find('#opponent-hand-count');
        this.#opponentDeckImgElement = this.#battleScreenElement.find('#opponent-deck-img');
        this.#opponentGraveyardImgElement = this.#battleScreenElement.find('#opponent-graveyard-img');

        this.#gameLogElement = this.#battleScreenElement.find('#game-log');
        this.#gameLogContainerElement = this.#battleScreenElement.find('.game-log-container');
        this.#turnNumberElement = this.#battleScreenElement.find('#turn-number');
        this.#phaseIndicatorElement = this.#battleScreenElement.find('#phase-indicator');
        this.#currentPlayerIndicatorElement = this.#battleScreenElement.find('#current-player-indicator');
        this.#actionFeedbackElement = this.#battleScreenElement.find('#action-feedback');
        this.#gameOverOverlayElement = this.#battleScreenElement.find('#game-over-overlay');
        this.#gameOverMessageElement = this.#battleScreenElement.find('#game-over-message');
        this.#btnBackToProfile = this.#battleScreenElement.find('#btn-back-to-profile');

        this.#btnEndTurn = this.#battleScreenElement.find('#btn-end-turn');
        this.#btnPassPhase = this.#battleScreenElement.find('#btn-pass-phase');
        this.#btnDiscardMana = this.#battleScreenElement.find('#btn-discard-mana');
        this.#btnConfirmAttack = this.#battleScreenElement.find('#btn-confirm-attack');
        this.#btnConfirmBlocks = this.#battleScreenElement.find('#btn-confirm-blocks');
        console.log("BattleScreenUI: Selectors cached.");
    }

} // End class BattleScreenUI