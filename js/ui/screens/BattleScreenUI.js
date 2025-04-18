// js/ui/screens/BattleScreenUI.js

// Importar dependências
import CardRenderer from '../helpers/CardRenderer.js';
import ZoomHandler from '../helpers/ZoomHandler.js';
import CreatureCard from '../../core/CreatureCard.js'; // Needed for instanceof checks if doing advanced targeting
import { RunebindingCard } from '../../core/RunebindingCard.js';
import { InstantCard } from '../../core/InstantCard.js';
// Graveyard class itself isn't typically needed directly in UI, but can be useful for context
// import { Graveyard } from '../../core/Graveyard.js';

export default class BattleScreenUI {
    // --- Referências Injetadas ---
    #screenManager;
    #accountManager;
    #cardDatabase;
    #cardRenderer;
    #zoomHandler;
    #audioManager;
    #uiManager; // Reference to the main UI coordinator

    // --- Estado do Jogo (Recebido) ---
    #gameInstance = null;
    #localPlayerId = null;

     // --- Flag interna ---
     #permanentEventsBound = false;   //  <<< ADICIONE ESTA LINHA

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
    #isSelectingDiscard = false; // Flag for MANA discard selection mode
    #isSelectingTarget = false;
    #actionPendingTarget = null;
    #isDeclaringAttackers = false;
    #selectedAttackerIds = new Set();
    #isAssigningBlockers = false;
    #blockerAssignmentsUI = {}; // Stores { attackerId: [blockerId1, blockerId2] } for UI state
    #selectedBlockerId = null; // Deprecated? May not be needed if assigning directly
    #pendingDiscardCount = 0; // For END OF TURN discard requirement
    #graveyardPlaceholderSrc = 'assets/images/ui/graveyard.png';

    // --- Construtor ---
    constructor(screenManager, accountManager, cardDatabase, cardRenderer, zoomHandler, audioManager, uiManager) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;
        this.#cardRenderer = cardRenderer;
        this.#zoomHandler = zoomHandler;
        this.#audioManager = audioManager;
        this.#uiManager = uiManager; // Now correctly receives and assigns uiManager

        this.#graveyardPlaceholderSrc = 'assets/images/ui/graveyard.png';

        this._cacheSelectors();
        if (!this.#battleScreenElement || !this.#battleScreenElement.length) {
            console.error("BattleScreenUI Error: #battle-screen element not found!");
            return;
        }
        this._bindPermanentEvents();
        console.log("BattleScreenUI initialized with AudioManager and UIManager reference.");
    }

    // --- Métodos de Setup ---
    setGameInstance(gameInstance) {
        this.#gameInstance = gameInstance;
        if (this.#gameInstance) {
            this._bindGameEventListeners();
        } else {
            console.warn("BattleScreenUI: Game instance unset or set to null.");
            // Consider unbinding listeners if necessary
        }
    }
    setLocalPlayer(playerId) {
        this.#localPlayerId = playerId;
    }

    // --- Método Principal de Renderização ---
    renderInitialState() {

        /* ------------------------------------------------------------------
         * 1)  Agora que o <div id="battle‑screen"> JÁ ESTÁ no DOM,
         *     fazemos o cache real dos seletores e – somente na 1ª vez –
         *     registramos os eventos permanentes.
         * ------------------------------------------------------------------ */
        this._cacheSelectors();                          //   <<< cache REAL
    
        if (!this.#permanentEventsBound) {               //   <<< garante 1× só
            this._bindPermanentEvents();
            this.#permanentEventsBound = true;
        }
    
        /* ------------------------------------------------------------------
         * 2)  Caso este método seja chamado mais de uma vez (re‑matchmaking,
         *     conceder replay, etc.), removemos listeners dinâmicos antigos
         *     antes de recriá‑los – assim evitamos cliques “fantasmas”.
         * ------------------------------------------------------------------ */
        if (typeof this._unbindGameActions === 'function') {
            this._unbindGameActions();
        }
    
        /* ------------------------------------------------------------------
         * 3)  Sanidade mínima: precisamos ter um gameInstance válido e o
         *     ID do jogador local antes de continuar.
         * ------------------------------------------------------------------ */
        if (!this.#gameInstance || !this.#localPlayerId) {
            console.error(
                'BattleScreenUI: gameInstance ou localPlayerId não definidos – abortando render.'
            );
            this.#uiManager?.navigateTo('profile-screen');
            return;
        }
    
        /* === A PARTIR DAQUI é o mesmo fluxo que você já tinha ============= */
    
        console.log('BattleScreenUI: Rendering initial game state…');
    
        this._clearUI();
        this._resetUIState();
    
        const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
        const opponent    = this.#gameInstance.getOpponent(this.#localPlayerId);
    
        if (!localPlayer || !opponent) {
            console.error('BattleScreenUI: jogadores não encontrados – abort.');
            this.#uiManager?.navigateTo('profile-screen');
            return;
        }
    
        // ---- Renderizações iniciais --------------------------------------
        this._renderPlayerInfo(localPlayer, true);
        this._renderPlayerInfo(opponent,   false);
    
        this._renderPlayerHand(localPlayer);
        this._renderOpponentHand(opponent);
    
        this._updateDeckDisplay(localPlayer);
        this._updateDeckDisplay(opponent);
        this._updateGraveyardDisplay(localPlayer);
        this._updateGraveyardDisplay(opponent);
    
        this._renderBattlefield(localPlayer.battlefield,  this.#playerBattlefieldElement);
        this._renderBattlefield(opponent.battlefield,     this.#opponentBattlefieldElement);
    
        // ---- Infos de turno/fase -----------------------------------------
        this.#turnNumberElement.text(this.#gameInstance.turnNumber || 1);
        this._updatePhaseIndicator();
        this._updateCurrentPlayerIndicator();
    
        // ---- Controles ----------------------------------------------------
        this.#btnConfirmAttack.hide().prop('disabled', true);
        this.#btnConfirmBlocks.hide().prop('disabled', true);
        this._updateTurnControls();
    
        // ---- Listeners dinâmicos (após todos os elementos existirem) -----
        this.bindGameActions();
    
        console.log('BattleScreenUI: Initial game state render complete.');
    }

    // --- Bindings de Eventos ---
    _bindPermanentEvents() {
        // Zoom overlay closing
        $('#battle-image-zoom-overlay').off('click.battlezoom').on('click.battlezoom', (event) => {
            if (event.target === event.currentTarget) this.#zoomHandler.closeZoom();
        });
        // Game over overlay (no action on background click)
        this.#gameOverOverlayElement.off('click.gameover').on('click.gameover', (event) => {
            if (event.target === event.currentTarget) { /* Optional: Prevent closing? */ }
        });
        // ESC key listener
        $(document).off('keydown.battlescreen').on('keydown.battlescreen', (e) => {
            if (!this.#battleScreenElement.hasClass('active')) return;
            if (e.key === "Escape") {
                this.#zoomHandler.closeZoom();
                if (this.#isSelectingTarget) this._exitTargetSelectionMode();
                if (this.#isSelectingDiscard) this._exitDiscardSelectionMode(); // <<< Mana discard
                if (this.#pendingDiscardCount > 0) this._exitDiscardRequiredMode(); // <<< Hand limit discard
                if (this.#isDeclaringAttackers) this._exitAttackerDeclarationMode();
                if (this.#isAssigningBlockers) this._exitBlockerAssignmentMode();
            }
        });
    }
    _bindGameEventListeners() {
         if (!this.#gameInstance) return;
         console.log("BattleScreenUI: Binding game event listeners...");
         // Remove potential old listeners before adding new ones (safety measure)
         // This might be overly cautious if gameInstance changes are rare
         // this.#gameInstance.removeEventListener(...) for all events first?

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
         this.#gameInstance.addEventListener('discardRequired', this._handleDiscardRequired.bind(this)); // For hand limit
         this.#gameInstance.addEventListener('attackPhaseStart', this._handleAttackPhaseStart.bind(this));
         this.#gameInstance.addEventListener('attackersDeclared', this._handleAttackersDeclared.bind(this));
         this.#gameInstance.addEventListener('blockersDeclared', this._handleBlockersDeclared.bind(this));
         this.#gameInstance.addEventListener('combatResolved', this._handleCombatResolved.bind(this));
         // Add listeners for cardPlayed, spellResolved, effectApplied etc. if needed
         this.#gameInstance.addEventListener('cardPlayed', this._handleCardPlayed.bind(this)); // Example
         this.#gameInstance.addEventListener('gameStarted',     this._handleGameStarted.bind(this));
         

    }
    bindGameActions() {
        // ***** ADD THIS LOG (Step 1 Debug) *****
        console.log("DEBUG Bind: Entering bindGameActions...");
        // ***** END ADDED LOG *****
        this._unbindGameActions(); // Unbind first to prevent duplicates

        const addBattleAudio = ($element, sfxClick = 'buttonClick', sfxHover = 'buttonHover') => {
             $element.on('click.battleaudio', () => this.#audioManager?.playSFX(sfxClick));
             $element.on('mouseenter.battleaudio', () => this.#audioManager?.playSFX(sfxHover));
        };

        // --- Main Buttons ---
        // ***** ADD LOG BEFORE BINDING *****
        console.log("DEBUG Bind: Attaching listener to #btnEndTurn...");
        this.#btnEndTurn.on('click.battlescreen', this._handleEndTurnClick.bind(this));
        addBattleAudio(this.#btnEndTurn);

        console.log("DEBUG Bind: Attaching listener to #btnPassPhase...");
        this.#btnPassPhase.on('click.battlescreen', this._handlePassPhaseClick.bind(this));
        addBattleAudio(this.#btnPassPhase);

        console.log("DEBUG Bind: Attaching listener to #btnDiscardMana...");
        this.#btnDiscardMana.on('click.battlescreen', this._handleDiscardForManaClick.bind(this));
        addBattleAudio(this.#btnDiscardMana);
        // ***** END ADDED LOGS *****

        // --- Combat Buttons ---
        this.#btnConfirmAttack.on('click.battlescreen', this._handleConfirmAttackersClick.bind(this));
        addBattleAudio(this.#btnConfirmAttack, 'playCreature'); // Example different sound
        this.#btnConfirmBlocks.on('click.battlescreen', this._handleConfirmBlockersClick.bind(this));
        addBattleAudio(this.#btnConfirmBlocks, 'playCreature'); // Example different sound

        // --- Card Interactions ---
        // Player Hand
        this.#playerHandElement.on('click.battlescreen', '.card', this._handleHandCardClick.bind(this));
        this.#playerHandElement.on('contextmenu.battlescreen', '.card', (e) => this.#zoomHandler.handleZoomClick(e, this.#gameInstance));
        this.#playerHandElement.on('mouseenter.battlecards', '.card', () => this.#audioManager?.playSFX('cardDraw')); // Example hover sound

        // Player Battlefield
        this.#playerBattlefieldElement.on('click.battlescreen', '.card', this._handleBattlefieldCardClick.bind(this));
        this.#playerBattlefieldElement.on('contextmenu.battlescreen', '.card', (e) => this.#zoomHandler.handleZoomClick(e, this.#gameInstance));
        this.#playerBattlefieldElement.on('mouseenter.battlecards', '.card', () => this.#audioManager?.playSFX('buttonHover'));

        // Opponent Battlefield
        this.#opponentBattlefieldElement.on('click.battlescreen', '.card', this._handleBattlefieldCardClick.bind(this));
        this.#opponentBattlefieldElement.on('contextmenu.battlescreen', '.card', (e) => this.#zoomHandler.handleZoomClick(e, this.#gameInstance));
        this.#opponentBattlefieldElement.on('mouseenter.battlecards', '.card', () => this.#audioManager?.playSFX('buttonHover'));

        // Prevent default context menu on all cards within battle screen
        this.#battleScreenElement.on('contextmenu.battlescreen', '.card', (e) => e.preventDefault());

        // --- Game Over Button ---
        const $btnGameOverBack = this.#btnBackToProfile;
        $btnGameOverBack.on('click.battlescreen', () => {
            this.#gameOverOverlayElement.removeClass('active');
            this.#gameInstance = null; // Clean up game instance reference
             this.#uiManager?.navigateTo('profile-screen'); // Use UIManager to navigate back
            // Stop BGM handled by gameOver handler
        });
        addBattleAudio($btnGameOverBack);

        console.log("BattleScreenUI: Dynamic game action bindings complete.");
    }
     /** Unbinds dynamic listeners to prevent duplicates when re-rendering or re-binding */
     _unbindGameActions() {
         console.log("BattleScreenUI: Unbinding dynamic game actions...");
         // Use specific namespaces used during binding
         this.#btnEndTurn.off('.battlescreen.battleaudio');
         this.#btnPassPhase.off('.battlescreen.battleaudio');
         this.#btnDiscardMana.off('.battlescreen.battleaudio');
         this.#btnConfirmAttack.off('.battlescreen.battleaudio');
         this.#btnConfirmBlocks.off('.battlescreen.battleaudio');
         this.#playerHandElement.off('.battlescreen.battlecards'); // Check if these namespaces match binding
         this.#playerBattlefieldElement.off('.battlescreen.battlecards');
         this.#opponentBattlefieldElement.off('.battlescreen.battlecards');
         this.#battleScreenElement.off('contextmenu.battlescreen', '.card');
         this.#btnBackToProfile.off('.battlescreen.battleaudio');
     }

    // --- Handlers de Eventos do Jogo ---
    _handleTurnChange(e) {
        console.log("BattleUI Event: Turn Change", e.detail);
        this._updateCurrentPlayerIndicator();
        this._updateTurnControls(); // ENSURE this is called
        this._clearCombatVisuals(); // Clear attacking/blocking visuals
    }
    _handlePhaseChange(e) {
        console.log("BattleUI Event: Phase Change", e.detail);
        this._updatePhaseIndicator();
        this._updateTurnControls(); // ENSURE this is called
        // Exit UI modes if phase changes unexpectedly (e.g., forced end turn)
        this._exitCombatModes();
        this._exitDiscardSelectionMode();
        this._exitTargetSelectionMode();
        // Don't exit end-of-turn discard here, it persists until resolved
    }
    _handlePlayerStatsChanged(e) {
        console.log("BattleUI Event: Player Stats Changed", e.detail);
        const player = this.#gameInstance?.getPlayer(e.detail.playerId);
        if (player) this._updatePlayerStats(player);
        // If maxMana changed, re-evaluate discard button state
        if (e.detail.updates.maxMana !== undefined) {
             this._updateTurnControls(); // ENSURE this is called
        }
    }
    _handleCardDrawn(e) {
        const { playerId, card } = e.detail;
        console.log(`BattleUI Event: Card Drawn - Player: ${playerId}, Card: ${card?.name}`);
        if (playerId === this.#localPlayerId) {
            this._addCardToHandUI(card);
            this.#audioManager?.playSFX('cardDraw');
        } else {
            this._updateOpponentHandCount(this.#gameInstance?.getPlayer(playerId));
        }
        const player = this.#gameInstance?.getPlayer(playerId);
        if (player) this._updateDeckDisplay(player);
    }
    _handleCardPlayed(e) {
        // Log card played, potentially trigger sounds or visual effects
        console.log("BattleUI Event: Card Played", e.detail);
        // Sounds are handled in _handleCardMoved based on card type
    }
    _handleCardMoved(e) {
        const { cardUniqueId, cardData, fromZone, toZone, ownerId } = e.detail;
        console.log(`BattleUI Event: Card Moved - ${cardData?.name} (${cardUniqueId}) from ${fromZone} to ${toZone} (Owner: ${ownerId})`);

        const isLocal = ownerId === this.#localPlayerId;
        const player = this.#gameInstance?.getPlayer(ownerId); if (!player) return;

        // --- Remove card from original zone UI ---
        if (fromZone === 'hand' && isLocal) {
            this.#playerHandElement.find(`.card[data-card-unique-id="${cardUniqueId}"]`).remove();
        } else if (fromZone === 'battlefield') {
            const $battlefield = isLocal ? this.#playerBattlefieldElement : this.#opponentBattlefieldElement;
            $battlefield.find(`.card[data-card-unique-id="${cardUniqueId}"]`).remove();
        } // Add other zones if needed

        // --- Add card to new zone UI ---
        if (toZone === 'hand' && isLocal) {
            this._addCardToHandUI(cardData);
        } else if (toZone === 'battlefield') {
            this._addCardToBattlefieldUI(cardData, ownerId);
        }

        // --- Update Counts & Sound Effects ---
        if (toZone === 'graveyard') {
            if (fromZone === 'hand') { // Check if it came specifically from hand
                this.#audioManager?.playSFX('cardDiscard');
            }
            // Handle UI update for END OF TURN discard requirement
            if (this.#pendingDiscardCount > 0 && fromZone === 'hand' && isLocal) {
                 this.#pendingDiscardCount--;
                 if (this.#pendingDiscardCount <= 0) this._exitDiscardRequiredMode();
                 else this.#actionFeedbackElement.text(`Mão cheia! Descarte ${this.#pendingDiscardCount} carta(s).`);
            }
        } else if (toZone === 'battlefield' && fromZone === 'hand') {
            // Play sound for card type played
            if (cardData?.type === 'Creature') this.#audioManager?.playSFX('playCreature');
            else if (cardData?.type === 'Instant') this.#audioManager?.playSFX('playInstant');
            else if (cardData?.type === 'Runebinding') this.#audioManager?.playSFX('playRunebinding');
        }

        // Update counts for relevant zones
        // Use Set to avoid duplicate updates if from/to are same type (e.g., graveyard->graveyard)
        const zonesToUpdate = new Set([fromZone, toZone]);
        if (zonesToUpdate.has('deck')) this._updateDeckDisplay(player);
        if (zonesToUpdate.has('graveyard')) this._updateGraveyardDisplay(player);
        if (zonesToUpdate.has('hand')) {
             if (isLocal) this._updateTurnControls(); // Hand size changed, re-check discard button state
             else this._updateOpponentHandCount(player);
        }
    }
    _handleGameLog(e) {
        // console.log("BattleUI Event: Game Log", e.detail);
        this._addLogMessage(e.detail.message, e.detail.type || 'system');
    }
    _handleCreatureUpdate(e) {
        const { cardUniqueId, updates } = e.detail;
        console.log(`BattleUI Event: Creature Update - ID: ${cardUniqueId}`, updates);
        const $cardElement = this.#battleScreenElement.find(`.card[data-card-unique-id="${cardUniqueId}"]`);
        if ($cardElement.length) {
            // Update specific parts based on `updates` object
            if (updates.currentToughness !== undefined) {
                $cardElement.find('.card-toughness').text(updates.currentToughness);
            }
            if (updates.attack !== undefined) {
                $cardElement.find('.card-attack').text(updates.attack);
            }
             if (updates.isTapped !== undefined) {
                $cardElement.toggleClass('tapped', updates.isTapped);
            }
             if (updates.hasSummoningSickness !== undefined) {
                $cardElement.toggleClass('has-summoning-sickness', updates.hasSummoningSickness);
            }
            if (updates.statusEffects !== undefined) {
                $cardElement.toggleClass('shielded', !!updates.statusEffects['shielded']);
                $cardElement.toggleClass('silenced', !!updates.statusEffects['silenced'] || !!updates.statusEffects['cant_attack']);
                // Add more status effect class toggles here
            }
            // Re-render tooltip if major stats changed? (might be overkill)
            // this._updateCardTooltip($cardElement, updates);
        }
    }
    _handleDamagePrevented(e) {
        console.log("BattleUI Event: Damage Prevented", e.detail);
        const $targetCard = this.#battleScreenElement.find(`.card[data-card-unique-id="${e.detail.target?.uniqueId}"]`);
        if ($targetCard.length) {
            this._showCardFeedback($targetCard, 'heal-flash'); // Use heal flash for prevention visual? Or specific effect?
        }
        this._addLogMessage(`${e.detail.target?.name} preveniu ${e.detail.amount} dano.`, 'feedback');
    }
    _handleCreatureTookDamage(e) {
        console.log("BattleUI Event: Creature Took Damage", e.detail);
        const $targetCard = this.#battleScreenElement.find(`.card[data-card-unique-id="${e.detail.creature?.uniqueId}"]`);
        if ($targetCard.length) {
             this._showCardFeedback($targetCard, 'damage-flash', e.detail.amount); // Show damage amount
        }
        // Log message is handled by the game event itself
    }
    _handleCreatureHealed(e) {
        console.log("BattleUI Event: Creature Healed", e.detail);
        const $targetCard = this.#battleScreenElement.find(`.card[data-card-unique-id="${e.detail.creature?.uniqueId}"]`);
        if ($targetCard.length) {
             this._showCardFeedback($targetCard, 'heal-flash', e.detail.amount); // Show heal amount
        }
         // Log message is handled by the game event itself
    }
    _handleCombatResolved(e) {
        console.log("BattleUI Event: Combat Resolved", e.detail);
        this._clearCombatVisuals(); // Clear attack/block highlights
        this._updateTurnControls(); // Ensure controls are correct after combat
        this._addLogMessage("Combate resolvido.", "system");
    }
    _handleGameOver(e) {
        console.log("BattleUI Event: Game Over", e.detail);
        const { winnerId, winnerName, loserName } = e.detail;
        const isLocalWinner = winnerId === this.#localPlayerId;
        const msg = isLocalWinner ? `Vitória! Você derrotou ${loserName || 'o oponente'}!` : `Derrota! ${winnerName || 'O oponente'} venceu!`;

        this.#gameOverMessageElement.text(msg);
        this.#gameOverOverlayElement.addClass('active');
        this._disableAllGameActions();
        this.#audioManager?.playSFX(isLocalWinner ? 'gameOverWin' : 'gameOverLose');
        this.#audioManager?.stopBGM(); // Stop battle music
    }
    _handleDeckEmpty(e) {
        console.log("BattleUI Event: Deck Empty", e.detail);
        const playerName = this.#gameInstance?.getPlayer(e.detail.playerId)?.name || 'Jogador';
        this._addLogMessage(`${playerName} não pode comprar cartas!`, 'error');
        // Game over logic is handled in Player.drawCard/Game._drawCard
    }

    _handleGameStarted(e) {
        console.log("BattleUI Event: Game Started", e?.detail);
        // Espera um tick do event‑loop – a tela já estará ativa.
        setTimeout(() => this._updateTurnControls(), 0);
    }
    
    _handleDiscardRequired(e) { // Handler for END OF TURN discard
        console.log("BattleUI Event: Discard Required", e.detail);
        const { playerId, count } = e.detail;
        if (playerId === this.#localPlayerId && count > 0) {
            this._enterDiscardRequiredMode(count); // Enter the UI MODE for hand size limit discard
        }
    }
    _handleAttackPhaseStart(e) {
        console.log("BattleUI Event: Attack Phase Start", e.detail);
        this._clearCombatVisuals(); // Ensure visuals are clean at phase start
        this._updateTurnControls(); // Enable attack declaration button if applicable
    }
    _handleAttackersDeclared(e) {
        console.log("BattleUI Event: Attackers Declared", e.detail);
        const { attackingPlayerId, attackers } = e.detail;
        const isLocalAttacker = attackingPlayerId === this.#localPlayerId;
        this._clearCombatVisuals(); // Clear previous highlights

        attackers.forEach(attackerData => {
             const $card = this.#battleScreenElement.find(`.card[data-card-unique-id="${attackerData.uniqueId}"]`);
             if ($card.length) {
                 $card.addClass('attacking'); // Add visual indication
                 // Tapped visual is handled by creatureUpdate event
             }
        });

        if (!isLocalAttacker) { // If opponent declared attackers
            this._enterBlockerAssignmentMode(); // Enter mode for local player to block
        }
         this._updateTurnControls(); // Update button states (hide attack, show block if needed)
    }
    _handleBlockersDeclared(e) {
        console.log("BattleUI Event: Blockers Declared", e.detail);
        const { defendingPlayerId, blockerAssignments, declaredBlockers } = e.detail;
         this._clearCombatVisuals(); // Clear selection highlights

        // Add 'blocking' class to blockers
        declaredBlockers.forEach(blockerInfo => {
             const $card = this.#battleScreenElement.find(`.card[data-card-unique-id="${blockerInfo.blockerId}"]`);
             if ($card.length) {
                 $card.addClass('blocking');
             }
        });

        // Add 'attacking' class to attackers that were declared (might already be there)
        this.#gameInstance?.getCombatManager().getAttackers().forEach(attacker => {
            const $card = this.#battleScreenElement.find(`.card[data-card-unique-id="${attacker.uniqueId}"]`);
             if ($card.length) {
                 $card.addClass('attacking');
             }
        });

         this._updateTurnControls(); // Ensure buttons are hidden/disabled as combat resolves
    }

    // --- Handlers de Ações da UI ---
    _handleEndTurnClick() {
        // ***** DEBUG LOG ADDED *****
        console.log("DEBUG: _handleEndTurnClick handler triggered.");
        const canInteractResult = this._canInteract(true);
        console.log("DEBUG: _canInteract(true) returned:", canInteractResult);

        if (canInteractResult) {
             // Check specific blocking conditions
            if (this.#isSelectingDiscard) {
                console.log("DEBUG: End Turn blocked by #isSelectingDiscard."); // ***** DEBUG LOG *****
                this._addLogMessage("Selecione uma carta para descartar por mana ou cancele (ESC).", "feedback");
                this._showCardFeedback(this.#playerHandElement, 'shake');
                return;
            }
            if (this.#pendingDiscardCount > 0) {
                console.log("DEBUG: End Turn blocked by #pendingDiscardCount."); // ***** DEBUG LOG *****
                this._addLogMessage(`Você deve descartar ${this.#pendingDiscardCount} carta(s) devido ao limite da mão.`, "feedback");
                this._showCardFeedback(this.#playerHandElement, 'shake');
                return;
            }
            console.log("BattleScreenUI: Handling End Turn click - Action proceeding.");
            this.#gameInstance?.endTurn();
        } else {
            console.log("BattleScreenUI: End Turn blocked by _canInteract.");
        }
    }
    _handlePassPhaseClick() {
        // ***** DEBUG LOG ADDED *****
        console.log("DEBUG: _handlePassPhaseClick handler triggered.");
        const canInteractResult = this._canInteract(true);
        console.log("DEBUG: _canInteract(true) returned:", canInteractResult);

        if (canInteractResult) {
            // Check specific blocking conditions
            if (this.#isSelectingDiscard) {
                console.log("DEBUG: Pass Phase blocked by #isSelectingDiscard."); // ***** DEBUG LOG *****
                this._addLogMessage("Selecione uma carta para descartar por mana ou cancele (ESC).", "feedback");
                this._showCardFeedback(this.#playerHandElement, 'shake');
                return;
            }
            if (this.#pendingDiscardCount > 0) {
                console.log("DEBUG: Pass Phase blocked by #pendingDiscardCount."); // ***** DEBUG LOG *****
                this._addLogMessage(`Você deve descartar ${this.#pendingDiscardCount} carta(s) devido ao limite da mão.`, "feedback");
                this._showCardFeedback(this.#playerHandElement, 'shake');
                return;
            }
            console.log("BattleScreenUI: Handling Pass Phase click - Action proceeding.");
            this.#gameInstance?.passPhase();
        } else {
            console.log("BattleScreenUI: Pass Phase blocked by _canInteract.");
        }
    }
    _handleDiscardForManaClick() {
        // ***** DEBUG LOG ADDED *****
        console.log("DEBUG: _handleDiscardForManaClick handler triggered.");
        const canInteractResult = this._canInteract(true);
        const isButtonDisabled = this.#btnDiscardMana.prop('disabled');
        console.log("DEBUG: _canInteract(true) returned:", canInteractResult);
        console.log("DEBUG: Discard Button Disabled:", isButtonDisabled);

        // Check the interaction *and* that the button thinks it should be enabled
        if (canInteractResult && !isButtonDisabled) {
            console.log("BattleScreenUI: Handling Discard for Mana click - Entering selection mode.");
            this._enterDiscardSelectionMode(); // Enters UI mode
        } else {
             console.log("BattleScreenUI: Cannot initiate discard for mana now.");
             // Provide feedback based on why the button might be disabled
             const player = this.#gameInstance?.getPlayer(this.#localPlayerId);
             if (!canInteractResult) this._addLogMessage("Não é possível realizar esta ação agora.", "feedback");
             else if (player?.hasDiscardedForMana) this._addLogMessage("Você já descartou por mana neste turno.", "feedback");
             else if (player?.maxMana >= 10) this._addLogMessage("Mana máxima (10) já atingida.", "feedback");
             else if (player?.hand.getSize() === 0) this._addLogMessage("Sua mão está vazia.", "feedback");
             else if (isButtonDisabled) this._addLogMessage("Ação indisponível no momento.", "feedback"); // Generic if disabled for other reasons
        }
    }
    _handleHandCardClick(event) {
        console.log("BattleScreenUI: Handling Hand Card click.");
        const $cardElement = $(event.currentTarget);
        const cardUniqueId = $cardElement.data('card-unique-id');
        if (!cardUniqueId) { console.warn("Hand click: No card unique ID found."); return; }

        // --- MANA DISCARD Selection ---
        if (this.#isSelectingDiscard) {
            console.log(`BattleScreenUI: Card ${cardUniqueId} selected for mana discard.`);
            if (this.#gameInstance?.getPlayer(this.#localPlayerId)?.discardCardForMana(cardUniqueId, this.#gameInstance)) {
                this._exitDiscardSelectionMode(); // Exit UI mode on success
            } else {
                this._showCardFeedback($cardElement, 'shake'); // Shake on failure
            }
            return; // Processed click for discard mode
        }

        // --- END OF TURN DISCARD Selection ---
        if (this.#pendingDiscardCount > 0) {
             console.log(`BattleScreenUI: Card ${cardUniqueId} selected for end-of-turn discard.`);
             if (this.#gameInstance?.resolvePlayerDiscard(this.#localPlayerId, cardUniqueId)) {
                 // UI update handled by _handleCardMoved and _handleDiscardRequired decrementing count
             } else {
                 this._showCardFeedback($cardElement, 'shake');
             }
             return; // Processed click for required discard mode
        }

        // --- TARGET Selection (Invalid action) ---
        if (this.#isSelectingTarget) {
            console.warn("BattleScreenUI: Cannot click hand card while selecting target.");
            this._addLogMessage("Selecione um alvo válido no campo de batalha ou pressione ESC para cancelar.", "feedback");
            this._showCardFeedback($cardElement, 'shake'); // Indicate invalid action
            return;
        }

        // --- Default Action: PLAY CARD ---
        if (!this._canInteract(true)) { // Check if player can play cards (turn, phase, etc.)
             console.log("BattleScreenUI: Cannot play card now (interaction restricted).");
             return;
        }

        const card = this.#gameInstance?.getPlayer(this.#localPlayerId)?.hand.getCard(cardUniqueId);
        if (!card) { console.warn(`Card instance not found in hand state: ${cardUniqueId}`); return; }

        // --- Check if Card Can Be Played (Core Logic) ---
        // Use the card's own method, which checks mana, phase, etc.
        if (!card.canPlay(this.#gameInstance.getPlayer(this.#localPlayerId), this.#gameInstance)) {
            console.log(`Card ${card.name} cannot be played now (checked by card.canPlay).`);
            this._addLogMessage(`Não é possível jogar ${card.name} agora.`, "feedback");
            this._showCardFeedback($cardElement, 'shake');
            return;
        }

        // --- Proceed to Play or Target Selection ---
        if (card.requiresTarget()) {
            this._enterTargetSelectionMode({ cardUniqueId: cardUniqueId, targetType: card.targetType(), cardName: card.name });
        } else {
            console.log(`BattleScreenUI: Playing card ${cardUniqueId} (no target).`);
            this.#gameInstance?.getPlayer(this.#localPlayerId)?.playCard(cardUniqueId, null, this.#gameInstance);
        }
    }
    _handleBattlefieldCardClick(event) {
         console.log("BattleScreenUI: Handling Battlefield Card click.");
         const $cardElement = $(event.currentTarget);
         const cardUniqueId = $cardElement.data('card-unique-id');
         // Determine owner based on parent container
         const isOpponentCard = $cardElement.closest('#opponent-battlefield').length > 0;
         const ownerId = isOpponentCard ? this.#gameInstance?.getOpponent(this.#localPlayerId)?.id : this.#localPlayerId;

         if (!cardUniqueId || !ownerId) { console.warn("Battlefield click: Card unique ID or owner ID missing."); return; }

         // --- TARGET SELECTION LOGIC ---
         if (this.#isSelectingTarget) {
             if (this._checkIfValidTarget(cardUniqueId, ownerId, this.#actionPendingTarget)) {
                 const actionCardId = this.#actionPendingTarget.cardUniqueId;
                 const actionCardName = this.#actionPendingTarget.cardName;
                 const targetName = $cardElement.data('card-name') || 'alvo';
                 console.log(`BattleScreenUI: Playing card ${actionCardId} (${actionCardName}) targeting ${cardUniqueId} (${targetName})...`);
                 this.#gameInstance?.getPlayer(this.#localPlayerId)?.playCard(actionCardId, cardUniqueId, this.#gameInstance);
                 this._exitTargetSelectionMode();
             } else {
                 this._showCardFeedback($cardElement, 'invalid-target');
                 this._addLogMessage("Alvo inválido para esta ação.", "error");
             }
             return; // Exit after handling target click
         }

         // --- ATTACKER DECLARATION LOGIC ---
         if (this.#isDeclaringAttackers) {
              if (ownerId !== this.#localPlayerId) { // Cannot select opponent's creatures to attack
                  this._addLogMessage("Selecione suas criaturas para atacar.", "feedback");
                  return;
              }
              const creature = this.#gameInstance?.getPlayer(this.#localPlayerId)?.battlefield.getCard(cardUniqueId);
              if (creature?.type === 'Creature' && creature.canAttack()) {
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
             const isLocalCard = ownerId === this.#localPlayerId;

             if (!isLocalCard) { // Clicked on an ATTACKER
                  // Highlight the attacker to show which one is being assigned blockers
                  $('.card.targetable-attacker').removeClass('targetable-attacker');
                  $cardElement.addClass('targetable-attacker');
                  this._addLogMessage(`Selecione uma criatura sua para bloquear ${$cardElement.data('card-name') || 'este atacante'}.`, "feedback");

             } else { // Clicked on one of YOUR creatures (potential blocker)
                 const blocker = this.#gameInstance?.getPlayer(this.#localPlayerId)?.battlefield.getCard(cardUniqueId);
                 const $targetAttackerElement = $('.card.targetable-attacker');
                 const targetAttackerId = $targetAttackerElement.data('card-unique-id');

                 if (!targetAttackerId) {
                      this._addLogMessage("Selecione um atacante inimigo primeiro.", "feedback");
                 } else if (blocker?.type === 'Creature' && blocker.canBlock()) {
                      // Assign this blocker to the highlighted attacker
                      this._assignBlocker(targetAttackerId, cardUniqueId);
                      $targetAttackerElement.removeClass('targetable-attacker'); // Clear attacker highlight
                      this.#btnConfirmBlocks.prop('disabled', false); // Enable confirm button once a block is assigned
                      this._addLogMessage(`${blocker.name} bloqueará ${$targetAttackerElement.data('card-name')}. Selecione outro atacante ou confirme.`, "feedback");
                 } else {
                     this._showCardFeedback($cardElement, 'shake');
                     this._addLogMessage("Esta criatura não pode bloquear.", "feedback");
                 }
             }
             return; // Exit after handling blocker assignment click
         }

          // Default action if no specific mode is active (e.g., activate ability - future)
          console.log(`BattleScreenUI: Battlefield card clicked (no active mode): ${cardUniqueId}`);
          // Check if it's a local creature with an activatable ability?
          // const cardInstance = this.#gameInstance?.getPlayer(ownerId)?.battlefield.getCard(cardUniqueId);
          // if (cardInstance?.canActivateAbility?.(this.#gameInstance)) { this._handleAbilityActivation(cardInstance); }
   }
    _handleConfirmAttackersClick() {
        console.log("BattleScreenUI: Confirm Attackers clicked.");
        if (this.#isDeclaringAttackers) {
            if (this.#selectedAttackerIds.size === 0) {
                 this._addLogMessage("Selecione pelo menos uma criatura para atacar ou passe a fase.", "feedback");
                 return;
            }
            this.#gameInstance?.confirmAttackDeclaration(this.#localPlayerId, [...this.#selectedAttackerIds]);
            this._exitAttackerDeclarationMode();
        }
    }
    _handleConfirmBlockersClick() {
        console.log("BattleScreenUI: Confirm Blockers clicked.");
        if (this.#isAssigningBlockers) {
            // Convert map to plain object for game instance if needed
            const assignmentsForGame = {};
            Object.entries(this.#blockerAssignmentsUI).forEach(([attackerId, blockerIds]) => {
                 if (blockerIds.length > 0) assignmentsForGame[attackerId] = blockerIds;
            });
            console.log("Sending blocker assignments:", assignmentsForGame);
            this.#gameInstance?.confirmBlockDeclaration(this.#localPlayerId, assignmentsForGame); // Pass the processed assignments
            this._exitBlockerAssignmentMode();
        }
    }

    // --- Métodos de Estado da UI ---
    _resetUIState() {
        this.#isSelectingDiscard = false;
        this.#isSelectingTarget = false;
        this.#actionPendingTarget = null;
        this.#isDeclaringAttackers = false;
        this.#selectedAttackerIds.clear();
        this.#isAssigningBlockers = false;
        this.#blockerAssignmentsUI = {};
        this.#selectedBlockerId = null; // Reset this too
        this.#pendingDiscardCount = 0;
        this.#playerHandElement.removeClass('selecting-discard');
        this.#battleScreenElement.find('.card').removeClass('targetable selected targetable-attacker selected-attacker selected-blocker attacking blocking feedback-shake feedback-invalid-target feedback-damage feedback-heal'); // Clear all visual state classes
        this.#actionFeedbackElement.text('');
        console.log("BattleScreenUI: UI state reset.");
    }

    // ***** REFINED _canInteract *****
    _canInteract(needsActiveTurn = true) {
        // ***** DEBUG LOG ADDED *****
        console.log("--- _canInteract Check ---");

        if (this.#gameInstance?.state !== 'playing') {
            console.log("_canInteract: FALSE - Game state is not 'playing' (State:", this.#gameInstance?.state, ")");
            return false;
        }
        if (needsActiveTurn && this.#gameInstance?.getCurrentPlayer()?.id !== this.#localPlayerId) {
             console.log("_canInteract: FALSE - Not local player's turn (Current:", this.#gameInstance?.getCurrentPlayer()?.id, "Local:", this.#localPlayerId, ")");
             return false;
         }
        // Cannot take actions if forced to discard due to hand limit
        if (this.#pendingDiscardCount > 0) {
            console.log("_canInteract: FALSE - Pending EOT discard (Count:", this.#pendingDiscardCount, ")");
            return false;
        }

        // Interaction is generally allowed if basic conditions met.
        // Specific *buttons* will be disabled by _updateTurnControls based on UI modes.
        console.log("_canInteract: TRUE (Basic checks passed)");
        return true;
    }
    // ***** END REFINED _canInteract *****


    _enterDiscardRequiredMode(count) { // For End of Turn discard
        this.#pendingDiscardCount = count;
        this.#actionFeedbackElement.text(`Mão cheia! Descarte ${count} carta(s).`);
        this.#playerHandElement.addClass('selecting-discard required-discard'); // Add specific class maybe
        this.#playerHandElement.find('.card').addClass('targetable');
        this._disableAllGameActions(true); // Disable most actions, but allow clicking hand
    }
    _exitDiscardRequiredMode() { // For End of Turn discard
        this.#pendingDiscardCount = 0;
        this.#actionFeedbackElement.text('');
        this.#playerHandElement.removeClass('selecting-discard required-discard');
        this.#playerHandElement.find('.card').removeClass('targetable');
        this._updateTurnControls(); // Re-enable actions
    }
    _enterDiscardSelectionMode() { // For MANA discard
        if (this.#isSelectingDiscard) return; // Already selecting
        console.log("BattleScreenUI: Entering discard selection mode (for mana).");
        this._exitCombatModes(); // Exit other modes first
        this._exitTargetSelectionMode();
        this.#isSelectingDiscard = true;
        this.#actionFeedbackElement.text('Selecione uma carta para descartar por +1 Mana Máx.');
        this.#playerHandElement.addClass('selecting-discard');
        this.#playerHandElement.find('.card').addClass('targetable');
        this._disableAllGameActions(true); // Disable most actions, allow hand clicks
        this.#btnDiscardMana.prop('disabled', true); // Keep discard button disabled while selecting
    }
    _exitDiscardSelectionMode() { // For MANA discard
        if (!this.#isSelectingDiscard) return;
        console.log("BattleScreenUI: Exiting discard selection mode (for mana).");
        this.#isSelectingDiscard = false;
        this.#actionFeedbackElement.text('');
        this.#playerHandElement.removeClass('selecting-discard');
        this.#playerHandElement.find('.card').removeClass('targetable');
        this._updateTurnControls(); // Re-evaluate button states
    }
    _enterTargetSelectionMode(actionInfo) {
        if (!actionInfo?.cardUniqueId || !actionInfo?.targetType) return;
        console.log(`BattleScreenUI: Entering target selection for ${actionInfo.cardName || actionInfo.cardUniqueId}. Target type: ${actionInfo.targetType}`);
        this._exitCombatModes(); // Can't target during combat declaration/assignment
        this._exitDiscardSelectionMode(); // Can't target while choosing discard
        this.#isSelectingTarget = true;
        this.#actionPendingTarget = actionInfo;
        this.#actionFeedbackElement.text(`Selecione um alvo (${actionInfo.targetType}) para ${actionInfo.cardName || 'a carta'}.`);
        this._highlightValidTargets(actionInfo.targetType);
        this._disableAllGameActions(true); // Disable normal actions, allow clicking targets
    }
    _exitTargetSelectionMode() {
        if (!this.#isSelectingTarget) return;
        console.log("BattleScreenUI: Exiting target selection mode.");
        this.#isSelectingTarget = false;
        this.#actionPendingTarget = null;
        this.#actionFeedbackElement.text('');
        this.#battleScreenElement.find('.card.targetable').removeClass('targetable');
        this._updateTurnControls(); // Re-evaluate buttons
    }
    _enterAttackerDeclarationMode() {
        if (this.#isDeclaringAttackers) return;
        console.log("BattleScreenUI: Entering attacker declaration mode.");
        this._exitDiscardSelectionMode();
        this._exitTargetSelectionMode();
        this.#isDeclaringAttackers = true;
        this.#selectedAttackerIds.clear();
        this.#actionFeedbackElement.text('Selecione as criaturas que deseja atacar e confirme.');
        // Highlight potential attackers
        const localPlayer = this.#gameInstance?.getPlayer(this.#localPlayerId);
        localPlayer?.battlefield.getCreatures().forEach(c => {
             if (c.canAttack()) {
                  this.#playerBattlefieldElement.find(`.card[data-card-unique-id="${c.uniqueId}"]`).addClass('targetable can-attack');
             }
        });
        this.#btnConfirmAttack.show().prop('disabled', true); // Show button, disable initially
        this._disableAllGameActions(true); // Disable other buttons, allow battlefield clicks
    }
    _exitAttackerDeclarationMode() {
        if (!this.#isDeclaringAttackers) return;
        console.log("BattleScreenUI: Exiting attacker declaration mode.");
        this.#isDeclaringAttackers = false;
        this.#actionFeedbackElement.text('');
        this.#playerBattlefieldElement.find('.card.targetable.can-attack').removeClass('targetable can-attack');
        this.#playerBattlefieldElement.find('.card.selected-attacker').removeClass('selected-attacker');
        this.#btnConfirmAttack.hide().prop('disabled', true);
        this._updateTurnControls(); // Re-enable normal buttons
    }
    _enterBlockerAssignmentMode() {
        if (this.#isAssigningBlockers) return;
        console.log("BattleScreenUI: Entering blocker assignment mode.");
        this._exitDiscardSelectionMode();
        this._exitTargetSelectionMode();
        this.#isAssigningBlockers = true;
        this.#blockerAssignmentsUI = {}; // Reset assignments
        this.#actionFeedbackElement.text('Selecione um atacante e depois uma criatura sua para bloquear.');
        // Highlight potential blockers
        const localPlayer = this.#gameInstance?.getPlayer(this.#localPlayerId);
        localPlayer?.battlefield.getCreatures().forEach(c => {
             if (c.canBlock()) {
                  this.#playerBattlefieldElement.find(`.card[data-card-unique-id="${c.uniqueId}"]`).addClass('targetable can-block');
             }
        });
        this.#btnConfirmBlocks.show().prop('disabled', false); // Show and enable (can confirm with 0 blocks)
        this._disableAllGameActions(true); // Allow battlefield clicks
    }
    _exitBlockerAssignmentMode() {
        if (!this.#isAssigningBlockers) return;
        console.log("BattleScreenUI: Exiting blocker assignment mode.");
        this.#isAssigningBlockers = false;
        this.#blockerAssignmentsUI = {};
        this.#actionFeedbackElement.text('');
        this.#battleScreenElement.find('.card.targetable.can-block').removeClass('targetable can-block');
        this.#battleScreenElement.find('.card.selected-blocker').removeClass('selected-blocker');
        this.#battleScreenElement.find('.card.targetable-attacker').removeClass('targetable-attacker');
        this.#btnConfirmBlocks.hide().prop('disabled', true);
        this._updateTurnControls();
    }
    /** Exits any active combat UI mode */
    _exitCombatModes() {
        this._exitAttackerDeclarationMode();
        this._exitBlockerAssignmentMode();
    }
    _clearCombatVisuals() {
        this.#battleScreenElement.find('.card.attacking').removeClass('attacking');
        this.#battleScreenElement.find('.card.blocking').removeClass('blocking');
        this.#battleScreenElement.find('.card.selected-attacker').removeClass('selected-attacker');
        this.#battleScreenElement.find('.card.selected-blocker').removeClass('selected-blocker');
        this.#battleScreenElement.find('.card.targetable-attacker').removeClass('targetable-attacker');
    }
    _assignBlocker(attackerId, blockerId) {
        if (!this.#isAssigningBlockers) return;
        if (!this.#blockerAssignmentsUI[attackerId]) {
            this.#blockerAssignmentsUI[attackerId] = [];
        }
        // Simple assignment: one blocker per attacker for now? Or allow multiple?
        // Assuming one blocker per attacker assignment click for simplicity. Replace if needed.
        // Remove blocker from other assignments first if allowing multi-block change
        // Object.keys(this.#blockerAssignmentsUI).forEach(attId => {
        //     const index = this.#blockerAssignmentsUI[attId].indexOf(blockerId);
        //     if (index > -1) this.#blockerAssignmentsUI[attId].splice(index, 1);
        // });

        // For single blocker per attacker:
        this.#blockerAssignmentsUI[attackerId] = [blockerId];

        console.log(`Assigned blocker ${blockerId} to attacker ${attackerId}`);
        this._updateBlockerAssignmentVisuals(); // Update highlights
    }
    _updateBlockerAssignmentVisuals() {
        // Clear previous blocker highlights
        this.#playerBattlefieldElement.find('.card.selected-blocker').removeClass('selected-blocker');
        // Apply new highlights
        Object.values(this.#blockerAssignmentsUI).flat().forEach(blockerId => {
            this.#playerBattlefieldElement.find(`.card[data-card-unique-id="${blockerId}"]`).addClass('selected-blocker');
        });
    }
    _highlightValidTargets(targetType) {
        this.#battleScreenElement.find('.card.targetable').removeClass('targetable'); // Clear previous
        let $potentialTargets = $();
        const localPlayer = this.#gameInstance?.getPlayer(this.#localPlayerId);
        const opponent = this.#gameInstance?.getOpponent(this.#localPlayerId);

        switch (targetType) {
            case 'creature':
                $potentialTargets = this.#playerBattlefieldElement.find('.card.creature')
                                     .add(this.#opponentBattlefieldElement.find('.card.creature'));
                break;
            case 'opponent_creature':
                $potentialTargets = this.#opponentBattlefieldElement.find('.card.creature');
                break;
            case 'own_creature':
                $potentialTargets = this.#playerBattlefieldElement.find('.card.creature');
                break;
            case 'player': // Target either player (potentially via avatar/info area?)
                 // This needs UI elements to represent players as targets
                 console.warn("Targeting players directly not fully implemented in UI highlighting.");
                break;
             case 'opponent_player':
                  console.warn("Targeting opponent player directly not fully implemented in UI highlighting.");
                  break;
             case 'runebinding': // Target runebindings on the field
                 $potentialTargets = this.#battleScreenElement.find('.card.runebinding'); // Find all runebindings
                 break;
            // Add more target types ('any', 'own_card', 'opponent_card', etc.)
        }

        $potentialTargets.addClass('targetable');
        if ($potentialTargets.length === 0) {
            this._addLogMessage(`Nenhum alvo válido (${targetType}) encontrado.`, 'feedback');
            // Optionally auto-cancel if no targets?
            // this._exitTargetSelectionMode();
        }
    }
    _checkIfValidTarget(targetId, targetOwnerId, actionInfo) {
        if (!actionInfo || !targetId) return false;

        const targetCard = this.#gameInstance?.findCardInstance(targetId);
        // const targetPlayer = this.#gameInstance?.getPlayer(targetId); // If targeting players

        if (!targetCard /* && !targetPlayer */) return false; // Target doesn't exist

        const targetType = actionInfo.targetType;

        switch (targetType) {
            case 'creature':
                return targetCard instanceof CreatureCard && targetCard.location === 'battlefield';
            case 'opponent_creature':
                return targetCard instanceof CreatureCard && targetCard.location === 'battlefield' && targetOwnerId !== this.#localPlayerId;
            case 'own_creature':
                return targetCard instanceof CreatureCard && targetCard.location === 'battlefield' && targetOwnerId === this.#localPlayerId;
            case 'runebinding':
                 return targetCard instanceof RunebindingCard && targetCard.location === 'battlefield';
             // Add more cases based on targetType strings used
            default: return false; // Unknown or untargetable type
        }
    }
    _showCardFeedback($cardElement, feedbackType, value = '') {
        if (!$cardElement || !$cardElement.length) return;

        // Remove previous feedback animations immediately
        $cardElement.removeClass('feedback-shake feedback-invalid-target feedback-damage feedback-heal');
        // Force reflow to restart animation if the same class is added again
        void $cardElement[0].offsetWidth;

        switch(feedbackType) {
            case 'shake':
                $cardElement.addClass('feedback-shake');
                break;
            case 'invalid-target':
                 $cardElement.addClass('feedback-invalid-target');
                 break;
             case 'damage-flash':
                 $cardElement.addClass('feedback-damage');
                 // Optionally display damage number temporarily
                 const $dmgNum = $(`<span class="feedback-number damage">${value}</span>`);
                 $cardElement.append($dmgNum);
                 setTimeout(() => $dmgNum.remove(), 600); // Remove after animation
                 break;
             case 'heal-flash':
                 $cardElement.addClass('feedback-heal');
                  // Optionally display heal number temporarily
                 const $healNum = $(`<span class="feedback-number heal">${value}</span>`);
                 $cardElement.append($healNum);
                 setTimeout(() => $healNum.remove(), 600);
                 break;
        }

        // Remove animation class after duration (match CSS animation duration)
        // Note: It's often better to let CSS handle removal via `animation-fill-mode: forwards`
        // and only remove the class if needed for re-triggering.
        // setTimeout(() => {
        //     $cardElement.removeClass(`feedback-${feedbackType}`);
        // }, 600); // Adjust duration based on CSS
    }
    _disableAllGameActions(allowTargetables=false) {
        // Disable core turn progression buttons
        this.#btnEndTurn.prop('disabled', true);
        this.#btnPassPhase.prop('disabled', true);
        this.#btnDiscardMana.prop('disabled', true); // Disable even if conditions were met before entering mode

        // Hide combat confirmation buttons
        this.#btnConfirmAttack.hide();
        this.#btnConfirmBlocks.hide();

        // Optionally disable interactions with zones if `allowTargetables` is false
        if (!allowTargetables) {
            this.#playerHandElement.addClass('disabled-zone'); // Use CSS to block pointer events maybe
            this.#playerBattlefieldElement.addClass('disabled-zone');
            this.#opponentBattlefieldElement.addClass('disabled-zone');
            // Remove 'targetable' class from everything
            this.#battleScreenElement.find('.card.targetable').removeClass('targetable');
        } else {
             // Ensure zones are not disabled if targeting is allowed
             this.#playerHandElement.removeClass('disabled-zone');
             this.#playerBattlefieldElement.removeClass('disabled-zone');
             this.#opponentBattlefieldElement.removeClass('disabled-zone');
        }
    }
    _closeZoomedImage() { this.#zoomHandler.closeZoom(); } // Delegate to zoom handler

    // --- Métodos de Renderização da UI ---
    _clearUI() {
        // Clear dynamic content areas
        this.#playerHandElement.empty();
        this.#playerBattlefieldElement.empty();
        this.#opponentHandElement.empty();
        this.#opponentBattlefieldElement.empty();
        this.#gameLogElement.html('<li>Log da Partida:</li>'); // Reset log
        this.#actionFeedbackElement.text('');

        // Reset counts (show placeholders maybe?)
        this.#playerDeckCountElement.text('...');
        this.#playerGraveyardCountElement.text('0');
        this.#opponentDeckCountElement.text('...');
        this.#opponentGraveyardCountElement.text('0');
        this.#opponentHandCountElement.text('...');

        // Reset player info placeholders
        this.#playerLifeElement.text('...'); this.#playerManaElement.text('...'); this.#playerMaxManaElement.text('...');
        this.#opponentLifeElement.text('...'); this.#opponentManaElement.text('...'); this.#opponentMaxManaElement.text('...');
        this.#playerNameElement.text('Jogador');
        this.#opponentNameElement.text('Oponente');
        this.#playerAvatarElement.attr('src', 'assets/images/avatars/default.png');
        this.#opponentAvatarElement.attr('src', 'assets/images/avatars/default.png');

        // Reset zone images
         this.#playerDeckImgElement.attr('src', 'assets/images/cards/card_cover.png').show();
         this.#opponentDeckImgElement.attr('src', 'assets/images/cards/card_cover.png').show();
         this.#playerGraveyardImgElement.attr('src', this.#graveyardPlaceholderSrc).addClass('is-placeholder');
         this.#opponentGraveyardImgElement.attr('src', this.#graveyardPlaceholderSrc).addClass('is-placeholder');

        console.log("BattleScreenUI: UI cleared for initial render or reset.");
    }
    _renderPlayerInfo(player, isLocal) {
        if (!player) return;
        const prefix = isLocal ? 'player' : 'opponent';
        $(`#${prefix}-name`).text(player.name);
        // Update stats immediately
        this._updatePlayerStats(player);
        // Load avatar (consider caching user data?)
        const userData = this.#accountManager?.getUserData(player.name);
        const avatarSrc = `assets/images/avatars/${userData?.avatar || 'default.png'}`;
        $(`#${prefix}-avatar-img`).attr('src', avatarSrc).attr('alt', `${player.name} Avatar`);
    }
    _addCardToHandUI(cardData) {
        if (!cardData) return;
        const $cardElement = this.#cardRenderer.renderCard(cardData, 'hand');
        if ($cardElement) {
            // Add hover/click listeners specific to hand cards if needed here
            this.#playerHandElement.append($cardElement);
            // Add entrance animation class
            $cardElement.addClass('draw-animation');
            // Remove animation class after it finishes
            setTimeout(() => $cardElement.removeClass('draw-animation'), 400); // Match CSS animation duration
        } else {
            console.warn("BattleScreenUI: Failed to render hand card element for", cardData.name);
        }
    }
    _renderPlayerHand(player) {
        this.#playerHandElement.empty();
        const handCards = player.hand.getCards();
        handCards.forEach(card => {
            // Pass the card's render data
            this._addCardToHandUI(card.getRenderData());
        });
        this._updateTurnControls(); // Re-check discard button state after hand render
    }
    _renderOpponentHand(opponent) {
        this.#opponentHandElement.empty();
        const handSize = opponent.hand.getSize();
        this.#opponentHandCountElement.text(handSize);
        // Create card backs, potentially with slight overlap/fan effect in CSS
        for (let i = 0; i < handSize; i++) {
            const $cardBack = $('<div class="card card-back"></div>');
            // Add slight offset for visual stacking if desired via CSS/inline style
            // $cardBack.css('margin-left', i > 0 ? '-50px' : '0'); // Example overlap
            this.#opponentHandElement.append($cardBack);
        }
    }
    _updateOpponentHandCount(opponent) {
        if (!opponent) return;
        this._renderOpponentHand(opponent); // Just re-render the backs based on current hand size
    }
    _addCardToBattlefieldUI(cardData, ownerId) {
        if (!cardData) return;
        const $container = ownerId === this.#localPlayerId ? this.#playerBattlefieldElement : this.#opponentBattlefieldElement;
        const $cardElement = this.#cardRenderer.renderCard(cardData, 'battlefield');
        if ($cardElement) {
            $container.append($cardElement);
            // Add entrance animation
            $cardElement.addClass('play-animation');
            setTimeout(() => $cardElement.removeClass('play-animation'), 300);
        } else {
            console.warn("BattleScreenUI: Failed to render battlefield card for", cardData.name);
        }
    }
    _renderBattlefield(battlefield, $container) {
        $container.empty();
        const cards = battlefield.getAllCards();
        cards.forEach(card => {
            this._addCardToBattlefieldUI(card.getRenderData(), card.ownerId);
        });
    }
    _updatePlayerStats(player) {
        if (!player) return;
        const isLocal = player.id === this.#localPlayerId;
        const prefix = isLocal ? 'player' : 'opponent';
        $(`#${prefix}-life`).text(player.life);
        $(`#${prefix}-mana`).text(player.mana);
        $(`#${prefix}-max-mana`).text(player.maxMana);
    }
    _updatePhaseIndicator() {
        if (!this.#gameInstance || !this.#phaseIndicatorElement || !this.#phaseIndicatorElement.length) {
            // console.warn("DEBUG: _updatePhaseIndicator - Cannot update, gameInstance or element missing.");
            return;
        }
        const currentPhase = this.#gameInstance.getCurrentPhase();
        const phaseMap = { 'mana': 'Mana', 'draw': 'Compra', 'main': 'Principal', 'attack': 'Ataque', 'end': 'Final' };
        const displayPhase = phaseMap[currentPhase] || currentPhase;
        this.#phaseIndicatorElement.text(displayPhase);
    }
    _updateCurrentPlayerIndicator() {
        if (!this.#gameInstance || !this.#currentPlayerIndicatorElement || !this.#currentPlayerIndicatorElement.length) return;
        const currentPlayer = this.#gameInstance.getCurrentPlayer();
        const indicatorText = currentPlayer?.id === this.#localPlayerId ? "Seu Turno" : "Turno Oponente";
        this.#currentPlayerIndicatorElement.text(indicatorText);
    }

    // ***** REFINED _updateTurnControls WITH DEBUG LOGS *****
    _updateTurnControls() {
        console.log("BattleScreenUI: Updating turn controls...");
        // Default to disabled, enable based on conditions
        this.#btnPassPhase.prop('disabled', true);
        this.#btnEndTurn.prop('disabled', true);
        this.#btnDiscardMana.prop('disabled', true);
        this.#btnConfirmAttack.hide().prop('disabled', true);
        this.#btnConfirmBlocks.hide().prop('disabled', true);

        if (!this.#gameInstance || !this.#battleScreenElement.hasClass('active') || this.#gameInstance.state !== 'playing') {
            console.log("Updating controls: Game not active/playing or instance missing. Leaving all disabled.");
            return; // Exit early if game not playable
        }

        const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
        const currentPlayer = this.#gameInstance.getCurrentPlayer();
        const isLocalTurn = currentPlayer?.id === this.#localPlayerId;
        const currentPhase = this.#gameInstance.getCurrentPhase();
        const combatManager = this.#gameInstance.getCombatManager();
        const gameState = this.#gameInstance.state; // Already checked game is playing

        // --- Determine if any blocking UI mode is active ---
        const isActionModeActive = this.#isSelectingDiscard ||
                                   this.#isSelectingTarget ||
                                   this.#isDeclaringAttackers ||
                                   this.#isAssigningBlockers ||
                                   this.#pendingDiscardCount > 0; // Hand limit discard also blocks

        console.log(`DEBUG Controls: isActionModeActive = ${isActionModeActive} (isSelectingDiscard:${this.#isSelectingDiscard}, isSelectingTarget:${this.#isSelectingTarget}, isDeclaringAttackers:${this.#isDeclaringAttackers}, isAssigningBlockers:${this.#isAssigningBlockers}, pendingDiscardCount:${this.#pendingDiscardCount})`);

        // --- Basic Turn Progression ---
        const canProgressTurn = isLocalTurn && !isActionModeActive; // Can only pass/end if NO other action mode is active
        console.log(`DEBUG Controls: canProgressTurn = ${canProgressTurn}`);
        this.#btnPassPhase.prop('disabled', !canProgressTurn);
        this.#btnEndTurn.prop('disabled', !canProgressTurn);

        // --- Discard for Mana Button Logic ---
        const canDiscardForMana = isLocalTurn &&
                                 localPlayer &&
                                 !localPlayer.hasDiscardedForMana && // Check game state flag
                                 localPlayer.maxMana < 10 &&         // Check max mana limit
                                 localPlayer.hand.getSize() > 0 &&   // Check if hand has cards
                                 !isActionModeActive;                // Cannot initiate if another mode is active
        console.log(`DEBUG Controls: canDiscardForMana = ${canDiscardForMana} (isLocalTurn:${isLocalTurn}, hasDiscarded:${localPlayer?.hasDiscardedForMana}, maxMana:${localPlayer?.maxMana}, handSize:${localPlayer?.hand.getSize()}, !isActionModeActive:${!isActionModeActive})`);
        this.#btnDiscardMana.prop('disabled', !canDiscardForMana);

        // --- Combat Button Logic ---
        // Show Attack Confirm only at the start of the local player's attack phase when no other action is pending
        const showAttackConfirm = isLocalTurn && currentPhase === 'attack' && combatManager.state === 'none' && !isActionModeActive;
        console.log(`DEBUG Controls: showAttackConfirm = ${showAttackConfirm}`);
        this.#btnConfirmAttack.toggle(showAttackConfirm);
        if(showAttackConfirm) {
            // Disable confirm attack if no attackers are selected *yet*
            const disableAttackConfirm = this.#selectedAttackerIds.size === 0;
            console.log(`DEBUG Controls: btnConfirmAttack disabled = ${disableAttackConfirm}`);
            this.#btnConfirmAttack.prop('disabled', disableAttackConfirm);
        }

        // Show Block Confirm only when opponent is attacking (combat state is 'declare_blockers')
        const showBlockConfirm = !isLocalTurn && currentPhase === 'attack' && combatManager.state === 'declare_blockers';
        console.log(`DEBUG Controls: showBlockConfirm = ${showBlockConfirm}`);
        this.#btnConfirmBlocks.toggle(showBlockConfirm);
        if(showBlockConfirm) {
            this.#btnConfirmBlocks.prop('disabled', false); // Always enabled when shown
             console.log(`DEBUG Controls: btnConfirmBlocks enabled = true`);
        }

        console.log(`==> Final Controls State: Pass:${!this.#btnPassPhase.prop('disabled')}, End:${!this.#btnEndTurn.prop('disabled')}, Discard:${!this.#btnDiscardMana.prop('disabled')}, ConfirmAtk:${!this.#btnConfirmAttack.prop('disabled')}/${this.#btnConfirmAttack.is(':visible')}, ConfirmBlk:${!this.#btnConfirmBlocks.prop('disabled')}/${this.#btnConfirmBlocks.is(':visible')}`);
    }
    // ***** END REFINED _updateTurnControls *****

    _addLogMessage(message, type = 'system') {
        if (!message || !this.#gameLogElement || !this.#gameLogElement.length) {
            // console.warn("DEBUG: _addLogMessage - Cannot add log, element missing or message empty.");
            return;
        }
        const logClass = `log-${type}`;
        // Sanitize message before adding? Basic text node is safer.
        const $logEntry = $(`<li class="${logClass}"></li>`).text(message);
        this.#gameLogElement.prepend($logEntry);
        const maxLogEntries = 50;
        if (this.#gameLogElement.children().length > maxLogEntries) {
            this.#gameLogElement.children().last().remove();
        }
        if (this.#gameLogContainerElement && this.#gameLogContainerElement.length) {
            this.#gameLogContainerElement.scrollTop(0);
        }
    }
    _updateDeckDisplay(player) {
        if (!player) return;
        const isLocal = player.id === this.#localPlayerId;
        const $countElement = isLocal ? this.#playerDeckCountElement : this.#opponentDeckCountElement;
        const $imgElement = isLocal ? this.#playerDeckImgElement : this.#opponentDeckImgElement;
        const count = player.deck.getSize();
        $countElement.text(count);
        $imgElement.toggle(count > 0); // Hide image if deck is empty
    }
    _updateGraveyardDisplay(player) {
        if (!player) return;
        const isLocal = player.id === this.#localPlayerId;
        const $countElement = isLocal ? this.#playerGraveyardCountElement : this.#opponentGraveyardCountElement;
        const $imgElement = isLocal ? this.#playerGraveyardImgElement : this.#opponentGraveyardImgElement;
        const graveyardCards = player.graveyard.getCards();
        const count = graveyardCards.length;
        $countElement.text(count);
        if (count > 0) {
            const topCard = graveyardCards[count - 1]; // Get the last card added
            const topCardData = topCard.getRenderData();
            $imgElement.attr('src', topCardData.imageSrc || this.#graveyardPlaceholderSrc) // Use placeholder if src is missing
                       .attr('alt', `Cemitério: ${topCardData.name}`)
                       .removeClass('is-placeholder');
        } else {
            $imgElement.attr('src', this.#graveyardPlaceholderSrc)
                       .attr('alt', 'Cemitério Vazio')
                       .addClass('is-placeholder');
        }
    }

    // Cache dos seletores jQuery
    _cacheSelectors() {
        this.#battleScreenElement = $('#battle-screen');
        if (!this.#battleScreenElement.length) { console.error("BattleScreenUI CacheSelectors Error: #battle-screen not found during caching."); return; }
        // Player elements
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
        // Opponent elements
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
        // General elements
        this.#gameLogElement = this.#battleScreenElement.find('#game-log');
        this.#gameLogContainerElement = this.#battleScreenElement.find('.game-log-container');
        this.#turnNumberElement = this.#battleScreenElement.find('#turn-number');
        this.#phaseIndicatorElement = this.#battleScreenElement.find('#phase-indicator');
        this.#currentPlayerIndicatorElement = this.#battleScreenElement.find('#current-player-indicator');
        this.#actionFeedbackElement = this.#battleScreenElement.find('#action-feedback');
        this.#gameOverOverlayElement = this.#battleScreenElement.find('#game-over-overlay');
        this.#gameOverMessageElement = this.#battleScreenElement.find('#game-over-message');
        this.#btnBackToProfile = this.#battleScreenElement.find('#btn-back-to-profile');
        // Buttons
        this.#btnEndTurn = this.#battleScreenElement.find('#btn-end-turn');
        this.#btnPassPhase = this.#battleScreenElement.find('#btn-pass-phase');
        this.#btnDiscardMana = this.#battleScreenElement.find('#btn-discard-mana');
        this.#btnConfirmAttack = this.#battleScreenElement.find('#btn-confirm-attack');
        this.#btnConfirmBlocks = this.#battleScreenElement.find('#btn-confirm-blocks');

        // ***** ADD THESE LOGS (Step 1 Debug) *****
        console.log("DEBUG Cache: #btnEndTurn found:", this.#btnEndTurn.length, this.#btnEndTurn);
        console.log("DEBUG Cache: #btnPassPhase found:", this.#btnPassPhase.length, this.#btnPassPhase);
        console.log("DEBUG Cache: #btnDiscardMana found:", this.#btnDiscardMana.length, this.#btnDiscardMana);
        // ***** END ADDED LOGS *****

        console.log("BattleScreenUI: Selectors cached.");

         // Basic check after caching (keep this)
         if (!this.#btnDiscardMana?.length) {
             console.error("CRITICAL CACHE FAILURE: #btn-discard-mana not found!");
         }
         if (!this.#btnPassPhase?.length) {
            console.error("CRITICAL CACHE FAILURE: #btn-pass-phase not found!");
        }
        if (!this.#btnEndTurn?.length) {
            console.error("CRITICAL CACHE FAILURE: #btn-end-turn not found!");
        }
    }

} // End class BattleScreenUI