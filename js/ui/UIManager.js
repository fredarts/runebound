// js/ui/UIManager.js

import CreatureCard from '../core/CreatureCard.js'; // Needed for instanceof checks
import { RunebindingCard } from '../core/RunebindingCard.js'; // Needed for instanceof checks
// Import SortableJS library if you haven't already via CDN/NPM
// Assuming Sortable is globally available via CDN in this example

export default class UIManager {
    // --- Core References ---
    #screenManager;
    #accountManager;
    #cardDatabase;
    #gameInstance = null;
    #localPlayerId = null;

    // --- Deck Builder State ---
    #dbState = {
        currentDeckId: null,
        currentDeckName: '',
        currentDeckCards: [],
        isEditing: false,
        MAX_COPIES_PER_CARD: 4 // Max copies set to 4
    };

    // --- Options ---
    #options = { musicVolume: 80, sfxVolume: 100, graphicsQuality: 'medium', cardAnimations: true, language: 'pt-BR', textSize: 'normal', highContrast: false };
    #OPTIONS_STORAGE_KEY = 'runebound_clash_options';

    // --- Battle UI State ---
    #isSelectingDiscard = false;
    #isSelectingTarget = false;
    #actionPendingTarget = null;
    #isDeclaringAttackers = false;
    #selectedAttackerIds = new Set();
    #isAssigningBlockers = false;
    #blockerAssignmentsUI = {};
    #selectedBlockerId = null;
    #pendingDiscardCount = 0;

    // --- SortableJS Instances ---
    #collectionSortable = null;
    #deckSortable = null;

    constructor(screenManager, accountManager, cardDatabase) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;
        this._loadOptions();
        this._bindPermanentUIActions();
        this._bindProfileInteractions(); // Binds profile specific elements
        this._bindDeckBuilderInteractions(); // Binds deck builder specific elements
        // Game action bindings happen when game starts (_bindGameEventListeners, bindGameActions)
        console.log("UIManager inicializado (v1.9 - D&D Remove Fix)."); // Updated version note
    }

    // --- Setup ---
    setGameInstance(gameInstance) {
        this.#gameInstance = gameInstance;
        console.log("UI: Game instance set.");
        this._bindGameEventListeners(); // Listen to game events
        this.bindGameActions(); // Bind UI elements for game actions (buttons, card clicks etc)
    }
    setLocalPlayer(playerId) { this.#localPlayerId = playerId; console.log(`UI: Local player set: ${playerId}`); }

    // --- Top Bar Control ---
    showTopBar(userData) {
        if (userData && userData.username) {
            $('#top-bar-username').text(userData.username);
            $('#top-bar').addClass('active');
        } else {
            console.warn("UI: Tried to show top bar without user data.");
        }
    }
    hideTopBar() {
        $('#top-bar').removeClass('active');
    }

    // --- Render Methods ---
    updateMainMenu(userData) {
        if ($('#top-bar').hasClass('active') && userData) {
             $('#top-bar-username').text(userData.username);
        }
        // Adjust if you have a specific main menu screen
        // $('#main-menu-screen p:first-child').text(`Bem-vindo ao Runebound Clash, ${userData?.username || 'Jogador'}!`);
    }
    renderProfileScreen() {
        const currentUser = this.#accountManager.getCurrentUser();
        console.log("UI: Rendering Profile Screen for User:", currentUser);
        if (!currentUser) { console.warn("UI: User not logged in for profile."); this.#screenManager.showScreen('login-screen'); return; }
        const collection = currentUser.collection || []; const decks = currentUser.decks || {};
        console.log(`UI: User data - Collection: ${collection.length}, Decks: ${Object.keys(decks).length}`);
        $('#profile-username').text(currentUser.username); $('#profile-rank').text(currentUser.rank || 'N/A'); $('#profile-wins').text(currentUser.stats?.wins ?? 0); $('#profile-losses').text(currentUser.stats?.losses ?? 0);
        const avatarFilename = currentUser.avatar || 'default.png'; $('#profile-avatar-img').attr('src', `assets/images/avatars/${avatarFilename}`).attr('alt', `Avatar: ${avatarFilename}`); $('.avatar-choice').removeClass('selected-avatar'); $(`.avatar-choice[data-avatar="${avatarFilename}"]`).addClass('selected-avatar');
        this._renderMatchHistory(currentUser.matchHistory || []);
        this._renderProfileCollection(collection); // Renders collection cards
        this._renderDeckList(decks); // Renders deck list
        console.log("UI: Finished rendering profile sections.");
    }
    renderOptionsScreen() {
         $('#opt-music-volume').val(this.#options.musicVolume).trigger('input');
         $('#opt-sfx-volume').val(this.#options.sfxVolume).trigger('input');
         $('#opt-graphics-quality').val(this.#options.graphicsQuality);
         $('#opt-card-animations').prop('checked', this.#options.cardAnimations);
         $('#opt-language').val(this.#options.language);
         $('#opt-text-size').val(this.#options.textSize);
         $('#opt-high-contrast').prop('checked', this.#options.highContrast);
         this._applyVisualOptions();
         $('#options-save-message').text(''); // Clear save message
    }
    renderDeckBuilderScreen(deckIdToEdit = null) {
        console.log("UI: Rendering Deck Builder. Edit ID:", deckIdToEdit);
        const currentUser = this.#accountManager.getCurrentUser();
        const collection = this.#accountManager.getCollection(); // Use method to get current collection

        if (!currentUser || !Array.isArray(collection)) {
            console.error("UI Error: Cannot open DB - User/collection invalid.");
            this.#screenManager.showScreen('profile-screen'); // Go back to profile on error
            alert("Erro ao carregar coleção do usuário.");
            return;
        }
        console.log(`UI: User collection has ${collection.length} cards.`);

        // Reset Deck Builder state
        this.#dbState = { ...this.#dbState, currentDeckId: null, currentDeckName: '', currentDeckCards: [], isEditing: false };
        $('#deck-builder-message').text(''); // Clear messages

        // Load deck if editing
        if (deckIdToEdit) {
            const decks = this.#accountManager.loadDecks();
            const deckToLoad = decks?.[deckIdToEdit];
            if (deckToLoad) {
                this.#dbState.currentDeckId = deckIdToEdit;
                this.#dbState.currentDeckName = deckToLoad.name;
                // Filter deck cards to ensure they exist in the current collection
                this.#dbState.currentDeckCards = deckToLoad.cards.filter(cardId => collection.includes(cardId));
                if (this.#dbState.currentDeckCards.length !== deckToLoad.cards.length) {
                    console.warn("UI: Some cards in the saved deck are no longer in the user's collection and were removed.");
                    // Optionally inform the user
                    $('#deck-builder-message').text('Algumas cartas do deck não estão na coleção e foram removidas.').css('color', 'orange');
                }
                this.#dbState.isEditing = true;
                $('#deck-builder-title').text(`Editando: ${deckToLoad.name}`);
                $('#db-deck-name').val(deckToLoad.name);
            } else {
                console.warn(`UI: Deck ID ${deckIdToEdit} not found for editing.`);
                $('#deck-builder-title').text('Criar Novo Deck');
                $('#db-deck-name').val('');
            }
        } else {
            $('#deck-builder-title').text('Criar Novo Deck');
            $('#db-deck-name').val('');
        }

        this._populateDeckBuilderFilters(collection); // Setup filter options
        this._renderDeckBuilderCollectionPanel(); // Renders collection (this will call _initializeSortables)
        this._renderDeckBuilderDeckPanel(); // Renders current deck panel
        this._updateDeckValidity(); // Check if deck is valid
        // Sortables are now initialized within _renderDeckBuilderCollectionPanel

        console.log("UI: Deck Builder rendered.");
    }
    renderInitialGameState() {
         if (!this.#gameInstance || !this.#localPlayerId) { console.error("UI: Jogo/Jogador local não definidos."); return; }
         console.log("UI: Renderizando estado inicial do jogo...");

         // Clear previous game elements
         $('#player-hand, #player-battlefield, #opponent-hand, #opponent-battlefield').empty();
         $('#player-deck-count, #player-graveyard-count, #opponent-deck-count, #opponent-graveyard-count').text('0');
         $('#game-log').empty().append('<li>Partida Iniciada!</li>');
         $('#action-feedback').text('');
         $('#game-over-overlay').removeClass('active'); // Hide game over overlay

         // Reset UI states related to combat/actions
         this._exitCombatModes();
         this._clearCombatVisuals();
         this.#pendingDiscardCount = 0;
         this.#isSelectingDiscard = false;
         this.#isSelectingTarget = false;
         this.#actionPendingTarget = null;
         this._closeZoomedImage(); // Close any open zoom

         const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
         const opponent = this.#gameInstance.getOpponent(this.#localPlayerId);
         if (!localPlayer || !opponent) { console.error("UI: Jogadores não encontrados na instância do jogo."); return; }

         // Render initial player states
         this._updatePlayerStats(localPlayer);
         this._renderPlayerHand(localPlayer); // Renders cards in hand
         this._updateDeckCount(localPlayer);
         this._updateGraveyardCount(localPlayer);
         $('#player-name').text(localPlayer.name); // Set name
         // Set Avatar based on AccountManager data
         const currentUserData = this.#accountManager.getCurrentUser();
         const playerAvatar = currentUserData?.avatar || 'default.png';
         $('#player-avatar-img').attr('src', `assets/images/avatars/${playerAvatar}`).attr('alt', `Avatar ${localPlayer.name}`);


         this._updatePlayerStats(opponent);
         this._renderOpponentHand(opponent); // Renders card backs
         this._updateDeckCount(opponent);
         this._updateGraveyardCount(opponent);
         $('#opponent-name').text(opponent.name); // Set name
          // TODO: Set opponent avatar (requires getting opponent account data or default)
         $('#opponent-avatar-img').attr('src', `assets/images/avatars/default.png`).attr('alt', `Avatar ${opponent.name}`); // Placeholder

         // Setup combat buttons (ensure they exist from template)
         $('#btn-confirm-attack, #btn-confirm-blocks').hide().prop('disabled', true);

         this._updateTurnControls(); // Update buttons based on current turn/phase
         this.#screenManager.showScreen('battle-screen'); // Make sure battle screen is visible
         console.log("UI: Estado inicial do jogo renderizado.");
    }

    // --- Action/Persistence ---
    saveOptions() {
        // Ler valores dos inputs/selects/checkboxes
        this.#options.musicVolume = parseInt($('#opt-music-volume').val(), 10);
        this.#options.sfxVolume = parseInt($('#opt-sfx-volume').val(), 10);
        this.#options.graphicsQuality = $('#opt-graphics-quality').val();
        this.#options.cardAnimations = $('#opt-card-animations').is(':checked');
        this.#options.language = $('#opt-language').val();
        this.#options.textSize = $('#opt-text-size').val();
        this.#options.highContrast = $('#opt-high-contrast').is(':checked');

        try {
            localStorage.setItem(this.#OPTIONS_STORAGE_KEY, JSON.stringify(this.#options));
            console.log("UI: Opções salvas:", this.#options);
            $('#options-save-message').text('Opções salvas com sucesso!').css('color', 'lightgreen');
            this._applyVisualOptions(); // Reaplica opções visuais imediatamente
        } catch (e) {
            console.error("UI: Erro ao salvar opções no localStorage:", e);
            $('#options-save-message').text('Erro ao salvar opções.').css('color', 'salmon');
        }
        // Limpa a mensagem após um tempo
        setTimeout(() => $('#options-save-message').text(''), 3000);
     }

    // --- Event Bindings ---
    _bindPermanentUIActions() {
        // Options sliders update value display
        $('#opt-music-volume, #opt-sfx-volume').on('input', function() {
            $(this).siblings('.volume-value').text(`${$(this).val()}%`);
        });
         // Global overlay close (clicking outside the zoomed image)
         // Moved specific overlay bindings to their respective screen bindings
    }
    _bindProfileInteractions() {
        // Use event delegation for elements within profile screen
        const $profileScreen = $('#profile-screen');

        $profileScreen.on('click', '.avatar-choice', (event) => {
            const avatarFilename = $(event.currentTarget).data('avatar');
            if (avatarFilename && this.#accountManager.saveAvatarChoice(avatarFilename)) {
                $('#profile-avatar-img').attr('src', `assets/images/avatars/${avatarFilename}`);
                $profileScreen.find('.avatar-choice').removeClass('selected-avatar');
                $(event.currentTarget).addClass('selected-avatar');
            }
        });

        $profileScreen.on('click', '#profile-unlocked-cards .mini-card', this._handleImageZoomClick.bind(this));
        $profileScreen.on('click', '#profile-deck-list .btn-edit-deck', this._handleEditDeckClick.bind(this));
        $profileScreen.on('click', '#profile-deck-list .btn-delete-deck', this._handleDeleteDeckClick.bind(this));
        $profileScreen.on('click', '#btn-goto-deck-builder-new', () => { // Button to open Deck Builder
            this.renderDeckBuilderScreen(); // Render new deck
            this.#screenManager.showScreen('deck-builder-screen');
        });

        // Bind close for profile zoom overlay specifically
        $('#image-zoom-overlay').off('click').on('click', (event) => { // Use .off first to prevent multiple bindings
            if (event.target === event.currentTarget) {
                this._closeZoomedImage('image-zoom-overlay'); // Pass specific ID
            }
        });
    }
    _bindDeckBuilderInteractions() {
        const $deckBuilderScreen = $('#deck-builder-screen'); // Cache screen selector

        $deckBuilderScreen.on('click', '#btn-save-deck', this._handleSaveDeck.bind(this));
        $deckBuilderScreen.on('click', '#btn-clear-deck', this._handleClearDeck.bind(this));
        $deckBuilderScreen.on('input', '#db-filter-name', this._handleFilterChange.bind(this)); // Use input for instant filtering
        $deckBuilderScreen.on('change', '#db-filter-type, #db-filter-cost, #db-filter-tribe', this._handleFilterChange.bind(this));
        $deckBuilderScreen.on('input', '#db-deck-name', this._handleDeckNameInput.bind(this));

        // Bind zoom for both collection and deck panels within deck builder
        $deckBuilderScreen.on('click', '#db-available-cards .mini-card', this._handleImageZoomClick.bind(this));
        $deckBuilderScreen.on('click', '#db-current-deck .mini-card', this._handleImageZoomClick.bind(this));

        // Bind close for deck builder zoom overlay specifically
        $('#deckbuilder-image-zoom-overlay').off('click').on('click', (event) => { // Use .off first
            if (event.target === event.currentTarget) {
                this._closeZoomedImage('deckbuilder-image-zoom-overlay'); // Pass specific ID
            }
        });

        // Note: Drag/Drop listeners are handled by _initializeSortables
    }
    // Removed _bindDeckBuilderDragDrop as it's part of SortableJS init

    _bindGameEventListeners() {
        if (!this.#gameInstance) return;
        console.log("UI: Binding game event listeners...");
        // Remove previous listeners if any? Maybe not necessary if UIManager is recreated with Game
        // Example events (add all relevant events from Game.js)
        this.#gameInstance.addEventListener('turnChange', this._handleTurnChange.bind(this));
        this.#gameInstance.addEventListener('phaseChange', this._handlePhaseChange.bind(this));
        this.#gameInstance.addEventListener('playerStatsChanged', this._handlePlayerStatsChanged.bind(this));
        this.#gameInstance.addEventListener('cardDrawn', this._handleCardDrawn.bind(this));
        this.#gameInstance.addEventListener('cardPlayed', this._handleCardPlayed.bind(this)); // Generic card played
        this.#gameInstance.addEventListener('cardMoved', this._handleCardMoved.bind(this));
        this.#gameInstance.addEventListener('gameLog', this._handleGameLog.bind(this));
        this.#gameInstance.addEventListener('creatureUpdate', this._handleCreatureUpdate.bind(this)); // For taps, damage, buffs etc.
        this.#gameInstance.addEventListener('damagePrevented', this._handleDamagePrevented.bind(this));
        this.#gameInstance.addEventListener('creatureTookDamage', this._handleCreatureTookDamage.bind(this));
        this.#gameInstance.addEventListener('creatureHealed', this._handleCreatureHealed.bind(this));
        this.#gameInstance.addEventListener('gameOver', this._handleGameOver.bind(this));
        this.#gameInstance.addEventListener('deckEmpty', this._handleDeckEmpty.bind(this));
        this.#gameInstance.addEventListener('discardRequired', this._handleDiscardRequired.bind(this));
        // Combat specific events
        this.#gameInstance.addEventListener('attackPhaseStart', this._handleAttackPhaseStart.bind(this));
        this.#gameInstance.addEventListener('attackersDeclared', this._handleAttackersDeclared.bind(this));
        this.#gameInstance.addEventListener('blockersDeclared', this._handleBlockersDeclared.bind(this));
        this.#gameInstance.addEventListener('combatResolved', this._handleCombatResolved.bind(this));
        // Add listeners for Runebinding apply/remove, Instant resolve etc. if needed
    }
    bindGameActions() {
        console.log("UI: Binding game action buttons and card clicks...");
        // Turn Controls
        $('#btn-end-turn').off('click').on('click', this._handleEndTurnClick.bind(this));
        $('#btn-pass-phase').off('click').on('click', this._handlePassPhaseClick.bind(this));
        $('#btn-discard-mana').off('click').on('click', this._handleDiscardForManaClick.bind(this));

        // Combat Controls
        $('#btn-confirm-attack').off('click').on('click', this._handleConfirmAttackersClick.bind(this));
        $('#btn-confirm-blocks').off('click').on('click', this._handleConfirmBlockersClick.bind(this));

        // Card Interactions (using event delegation on parent elements)
        $('#player-hand').off('click', '.card').on('click', '.card', this._handleHandCardClick.bind(this));
        $('#player-battlefield').off('click', '.card').on('click', '.card', this._handleBattlefieldCardClick.bind(this));
        // Allow targeting opponent creatures
        $('#opponent-battlefield').off('click', '.card').on('click', '.card', this._handleBattlefieldCardClick.bind(this));

        // --- ZOOM BINDINGS FOR BATTLE ---
        $('#player-hand').off('contextmenu', '.card').on('contextmenu', '.card', this._handleImageZoomClick.bind(this)); // Right-click zoom
        $('#player-battlefield').off('contextmenu', '.card').on('contextmenu', '.card', this._handleImageZoomClick.bind(this));
        $('#opponent-battlefield').off('contextmenu', '.card').on('contextmenu', '.card', this._handleImageZoomClick.bind(this));
        // Prevent default right-click menu
        $('#battle-screen').off('contextmenu', '.card').on('contextmenu', '.card', (e) => e.preventDefault());

        // Bind close for battle zoom overlay
        $('#battle-image-zoom-overlay').off('click').on('click', (event) => {
            if (event.target === event.currentTarget) {
                this._closeZoomedImage('battle-image-zoom-overlay'); // Pass specific ID
            }
        });
        // Allow closing zoom with Escape key
         $(document).off('keydown.zoomclose').on('keydown.zoomclose', (e) => {
             if (e.key === "Escape") {
                 this._closeZoomedImage(); // Close any active zoom overlay
             }
         });
         // --- END ZOOM BINDINGS ---

         // Game Over button
         $('#btn-back-to-profile').off('click').on('click', () => {
             $('#game-over-overlay').removeClass('active');
             this.#gameInstance = null; // Clear game instance
             this.renderProfileScreen(); // Re-render profile (might show updated stats)
             this.#screenManager.showScreen('profile-screen');
         });
    }

    // --- UI Event Handlers ---
    _handleEditDeckClick(event){
        const deckId = $(event.currentTarget).closest('li').data('deck-id');
        if(deckId){
            this.renderDeckBuilderScreen(deckId); // Pass ID to edit
            this.#screenManager.showScreen('deck-builder-screen');
        }
    }
    _handleDeleteDeckClick(event){
        const $li = $(event.currentTarget).closest('li');
        const deckId = $li.data('deck-id');
        const deckName = $li.contents().filter(function() { return this.nodeType === 3; }).text().trim().replace(/\(\d+\)$/, '').trim(); // Extract name
        if(deckId && confirm(`Tem certeza que deseja excluir o deck "${deckName}"?`)){
            const result = this.#accountManager.deleteDeck(deckId);
            if(result.success) {
                this.renderProfileScreen(); // Refresh profile to show updated deck list
            } else {
                alert(`Erro ao excluir deck: ${result.message}`);
            }
        }
    }
    // _handleCollectionCardClick/DeckCardClick removed (replaced by drag/drop and zoom)

    _handleSaveDeck() {
        const deckName = $('#db-deck-name').val().trim();
        if (!deckName) {
            $('#deck-builder-message').text('Por favor, dê um nome ao deck.').css('color', 'orange');
            return;
        }
        const cardIds = this.#dbState.currentDeckCards;
        const count = cardIds.length;
        if (count < 30 || count > 40) {
             $('#deck-builder-message').text('Deck inválido (deve ter 30-40 cartas).').css('color', 'salmon');
             return;
        }

        // Generate new ID if creating, use existing if editing
        const deckId = this.#dbState.isEditing && this.#dbState.currentDeckId ? this.#dbState.currentDeckId : `deck_${Date.now()}`;

        const result = this.#accountManager.saveDeck(deckId, deckName, cardIds);
        $('#deck-builder-message').text(result.message).css('color', result.success ? 'lightgreen' : 'salmon');

        if(result.success) {
             this.#dbState.isEditing = true; // Now it's an existing deck
             this.#dbState.currentDeckId = deckId;
             $('#deck-builder-title').text(`Editando: ${deckName}`);
             // Optionally, go back to profile after saving
             setTimeout(() => {
                 $('#deck-builder-message').text('');
                 // this.#screenManager.showScreen('profile-screen');
                 // this.renderProfileScreen(); // Refresh profile list
             }, 1500);
        }
     }
    _handleClearDeck() {
        if (confirm('Limpar deck atual?')) {
            console.log("UI: Clearing current deck.");
            this.#dbState.currentDeckCards = [];
            this._renderDeckBuilderDeckPanel(); // Renderiza o painel do deck vazio
            // Re-initialize sortables to ensure the empty deck panel is a valid drop target
            this._initializeSortables();
            $('#deck-builder-message').text('Deck limpo.').css('color', 'lightblue');
            setTimeout(() => $('#deck-builder-message').text(''), 3000);
        }
    }
    _handleFilterChange() {
        console.log("UI: Filter changed, re-rendering collection panel.");
        this._renderDeckBuilderCollectionPanel();
        // Sortable re-initialization now happens INSIDE _renderDeckBuilderCollectionPanel
    }
    _handleDeckNameInput() {
        this.#dbState.currentDeckName = $('#db-deck-name').val();
        // Maybe enable save button only if name is present? (Add logic to _updateDeckValidity if needed)
         this._updateDeckValidity(); // Update validity to check name presence
    }
    _handleEndTurnClick() {
        if (this._canInteract()) {
            console.log("UI: End Turn button clicked.");
            this.#gameInstance?.endTurn();
        } else { console.log("UI: Cannot End Turn now."); }
    }
    _handlePassPhaseClick() {
        if (this._canInteract()) {
             console.log("UI: Pass Phase button clicked.");
             this.#gameInstance?.passPhase();
        } else { console.log("UI: Cannot Pass Phase now."); }
    }
    _handleDiscardForManaClick() {
        if (this._canInteract() && !$('#btn-discard-mana').prop('disabled')) {
             console.log("UI: Discard for Mana button clicked.");
             this._enterDiscardSelectionMode();
        } else { console.log("UI: Cannot Discard for Mana now."); }
    }
    _handleHandCardClick(event) {
        if (!this._canInteract() && !this.#isSelectingDiscard && this.#pendingDiscardCount === 0) return; // Allow discard clicks
        const $card = $(event.currentTarget);
        const cardUniqueId = $card.data('card-unique-id');
        const cardInstance = this.#gameInstance?.getPlayer(this.#localPlayerId)?.hand.getCard(cardUniqueId);

        if (!cardInstance) { console.warn("Clicked card not found in hand:", cardUniqueId); return; }

        console.log(`UI: Clicked hand card: ${cardInstance.name} (${cardUniqueId})`);

        if (this.#isSelectingDiscard) { // --- Discarding for Mana ---
            console.log(`UI: Attempting to discard ${cardInstance.name} for mana.`);
            const success = this.#gameInstance.getPlayer(this.#localPlayerId)?.discardCardForMana(cardUniqueId, this.#gameInstance);
            this._exitDiscardSelectionMode(); // Exit mode regardless of success/failure
        } else if (this.#pendingDiscardCount > 0) { // --- Discarding due to Hand Size ---
             console.log(`UI: Attempting to discard ${cardInstance.name} for hand size.`);
             const success = this.#gameInstance.resolvePlayerDiscard(this.#localPlayerId, cardUniqueId);
             // If discard was successful, the game should emit 'discardRequired' again if more are needed, or change state
             if (success && this.#pendingDiscardCount <= 0) { // Check state just in case event is delayed
                 this._exitDiscardRequiredMode();
             } else if (!success) {
                 this._addLogMessage(`Falha ao descartar ${cardInstance.name}.`, 'error');
             }
        } else if (this.#isSelectingTarget) { // --- Cancelling Target Selection ---
             console.log("UI: Clicked hand card while selecting target - cancelling selection.");
             this._showCardFeedback($card, 'cancel');
             this._exitTargetSelectionMode();
        } else { // --- Attempting to Play Card ---
            if (!this._canInteract()) return; // Final check if interaction allowed
            if (cardInstance.requiresTarget()) {
                console.log(`UI: Card ${cardInstance.name} requires target. Entering target selection.`);
                this._enterTargetSelectionMode({ type: 'playCard', cardUniqueId: cardUniqueId, targetType: cardInstance.targetType() });
            } else {
                 console.log(`UI: Attempting to play card ${cardInstance.name} (no target).`);
                 this.#gameInstance.getPlayer(this.#localPlayerId)?.playCard(cardUniqueId, null, this.#gameInstance);
            }
        }
    }
    _handleBattlefieldCardClick(event) {
        if (!this.#gameInstance) return;
        const $card = $(event.currentTarget);
        const cardUniqueId = $card.data('card-unique-id');
        // Find the card instance (could be on player's or opponent's battlefield)
        const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
        const opponent = this.#gameInstance.getOpponent(this.#localPlayerId);
        const cardInstance = localPlayer?.battlefield.getCard(cardUniqueId) || opponent?.battlefield.getCard(cardUniqueId);

        if (!cardInstance) { console.warn("Clicked card not found on battlefield:", cardUniqueId); return; }

        console.log(`UI: Clicked battlefield card: ${cardInstance.name} (${cardUniqueId}), Owner: ${cardInstance.ownerId}`);

        if (this.#isSelectingTarget) { // --- Selecting a Target ---
            console.log(`UI: Target selected: ${cardInstance.name}`);
            if (this._checkIfValidTarget(cardInstance, cardInstance.ownerId, this.#actionPendingTarget)) {
                 // Perform the action with the target
                 if (this.#actionPendingTarget?.type === 'playCard') {
                     console.log(`UI: Playing card ${this.#actionPendingTarget.cardUniqueId} targeting ${cardUniqueId}`);
                     localPlayer?.playCard(this.#actionPendingTarget.cardUniqueId, cardUniqueId, this.#gameInstance);
                 } else {
                      console.warn("Unknown action type for target selection:", this.#actionPendingTarget?.type);
                 }
                 this._exitTargetSelectionMode();
            } else {
                 console.log("UI: Invalid target selected.");
                 this._showCardFeedback($card, 'invalid-target');
                 // Optionally exit target mode on invalid click, or let user try again
                 // this._exitTargetSelectionMode();
            }
        } else if (this.#isDeclaringAttackers) { // --- Declaring Attackers ---
             if (cardInstance.ownerId === this.#localPlayerId && cardInstance instanceof CreatureCard) {
                 if (this.#selectedAttackerIds.has(cardUniqueId)) {
                     this.#selectedAttackerIds.delete(cardUniqueId);
                     $card.removeClass('selected-attacker');
                     console.log(`UI: Deselected attacker ${cardInstance.name}`);
                 } else {
                     if (cardInstance.canAttack()) {
                         this.#selectedAttackerIds.add(cardUniqueId);
                         $card.addClass('selected-attacker');
                         console.log(`UI: Selected attacker ${cardInstance.name}`);
                     } else {
                         console.log(`UI: Creature ${cardInstance.name} cannot attack.`);
                         this._showCardFeedback($card, 'cannot-act');
                     }
                 }
                 $('#btn-confirm-attack').prop('disabled', this.#selectedAttackerIds.size === 0);
             } else {
                 console.log("UI: Cannot select opponent's creature or non-creature as attacker.");
             }
        } else if (this.#isAssigningBlockers) { // --- Assigning Blockers ---
             const ownerId = cardInstance.ownerId;
             // If clicked card is ours and can block -> select it as the CURRENT blocker to assign
             if (ownerId === this.#localPlayerId && cardInstance instanceof CreatureCard && cardInstance.canBlock()) {
                  console.log(`UI: Selected potential blocker: ${cardInstance.name}`);
                  $('.card.selected-blocker').removeClass('selected-blocker'); // Deselect previous
                  $card.addClass('selected-blocker');
                  this.#selectedBlockerId = cardUniqueId;
             }
             // If clicked card is opponent's attacking creature AND we have a blocker selected -> assign block
             else if (ownerId !== this.#localPlayerId && this.#selectedBlockerId && this.#gameInstance.getCombatManager().getAttackers().some(att => att.uniqueId === cardUniqueId)) {
                 console.log(`UI: Assigning blocker ${this.#selectedBlockerId} to attacker ${cardUniqueId}`);
                 this._assignBlocker(cardUniqueId, this.#selectedBlockerId);
                 // Deselect blocker after assignment
                 $('.card.selected-blocker').removeClass('selected-blocker');
                 this.#selectedBlockerId = null;
             } else if (ownerId !== this.#localPlayerId && this.#selectedBlockerId) {
                 console.log("UI: Clicked non-attacking opponent creature while assigning blocker.");
             } else if (ownerId === this.#localPlayerId && !cardInstance.canBlock()) {
                  console.log(`UI: Creature ${cardInstance.name} cannot block.`);
                  this._showCardFeedback($card, 'cannot-act');
             }
             else {
                 console.log("UI: Clicked battlefield card during blocker assignment - no action taken.");
             }
        } else {
            // Default click on battlefield - maybe show details or trigger abilities?
            console.log("UI: Clicked battlefield card - default action (none for now).");
            // Could add logic for activated abilities here
        }
    }
    _handleConfirmAttackersClick() {
        if (this.#isDeclaringAttackers && this.#gameInstance && this.#localPlayerId) {
             console.log("UI: Confirming attackers:", [...this.#selectedAttackerIds]);
             this.#gameInstance.confirmAttackDeclaration(this.#localPlayerId, [...this.#selectedAttackerIds]);
             this._exitAttackerDeclarationMode(); // Mode handled by Game/CombatManager events now
             // UI feedback like "Waiting for opponent to block..." will come from game events
        }
    }
    _handleConfirmBlockersClick() {
         if (this.#isAssigningBlockers && this.#gameInstance && this.#localPlayerId) {
             console.log("UI: Confirming blockers:", this.#blockerAssignmentsUI);
             // Convert UI assignments map { attackerId: [blockerId1, blockerId2] } to format expected by game
             // (Already in the correct format in this implementation)
             const assignmentsToSend = { ...this.#blockerAssignmentsUI };
             // Pass opponent ID as the one declaring blockers
             this.#gameInstance.confirmBlockDeclaration(this.#localPlayerId, assignmentsToSend);
             this._exitBlockerAssignmentMode(); // Mode handled by Game/CombatManager events now
         }
    }
    _handleImageZoomClick(event) {
        event.preventDefault(); // Prevent context menu if using right-click
        event.stopPropagation();
        const $card = $(event.currentTarget);
        const cardUniqueId = $card.data('card-unique-id') || $card.data('card-id'); // Handle both battlefield and collection/db
        const cardData = this.#cardDatabase[cardUniqueId] || this.#cardDatabase[$card.data('card-id')]; // Try both unique and base ID

        let imageSrc = null;
        let cardName = 'Card';

        if (cardData) { // Found definition in database
             imageSrc = cardData.image_src;
             cardName = cardData.name;
        } else { // Maybe it's an instance from the game?
            const gameCard = this.#gameInstance?.findCardInstance(cardUniqueId);
            if (gameCard) {
                imageSrc = gameCard.imageSrc;
                cardName = gameCard.name;
            }
        }


        if (imageSrc) {
            console.log(`Zooming card: ${cardName}`);
            let overlayId, imageId;

            // Determine context
            if ($card.closest('#profile-screen').length) {
                overlayId = 'image-zoom-overlay'; imageId = 'zoomed-image';
            } else if ($card.closest('#deck-builder-screen').length) {
                overlayId = 'deckbuilder-image-zoom-overlay'; imageId = 'deckbuilder-zoomed-image';
            } else if ($card.closest('#battle-screen').length) {
                overlayId = 'battle-image-zoom-overlay'; imageId = 'battle-zoomed-image';
            } else {
                console.warn("Zoom click outside known screen context."); return;
            }

            const $overlay = $(`#${overlayId}`);
            const $image = $(`#${imageId}`);

            if ($overlay.length && $image.length) {
                $image.attr('src', imageSrc).attr('alt', cardName);
                $overlay.addClass('active');
            } else { console.error(`Zoom overlay ('#${overlayId}') or image ('#${imageId}') not found!`); }
        } else { console.log(`No image source found for card ${cardUniqueId || $card.data('card-id')}`); }
    }


    // --- Game Event Handlers --- (Reduced logging slightly for brevity)
    _handleTurnChange(event) {
         const { currentPlayerId, playerName, turnNumber } = event.detail;
         $('#turn-number').text(turnNumber);
         $('#current-player-indicator').text(playerName);
         if (currentPlayerId === this.#localPlayerId) {
             $('body').removeClass('opponent-turn').addClass('player-turn');
         } else {
             $('body').removeClass('player-turn').addClass('opponent-turn');
         }
         this._updateTurnControls();
    }
    _handlePhaseChange(event) {
         const { newPhase } = event.detail;
         $('#phase-indicator').text(newPhase.charAt(0).toUpperCase() + newPhase.slice(1));
         this._updateTurnControls();
    }
    _handlePlayerStatsChanged(event) {
        const { playerId, updates } = event.detail;
        const isLocalPlayer = playerId === this.#localPlayerId;
        const prefix = isLocalPlayer ? '#player' : '#opponent';
        if (updates.life !== undefined) $(`${prefix}-life`).text(updates.life);
        if (updates.mana !== undefined) $(`${prefix}-mana`).text(updates.mana);
        if (updates.maxMana !== undefined) $(`${prefix}-max-mana`).text(updates.maxMana);
    }
    _handleCardDrawn(event) {
        const { playerId, card } = event.detail;
        if (playerId === this.#localPlayerId) this._addCardToHandUI(card);
        else this._updateOpponentHandCount(this.#gameInstance.getPlayer(playerId));
    }
    _handleCardPlayed(event) { /* Generic, handled by _handleCardMoved */ }
    _handleCardMoved(event) {
        const { cardUniqueId, cardData, fromZone, toZone, ownerId } = event.detail;
        const isLocal = ownerId === this.#localPlayerId;
        const player = this.#gameInstance.getPlayer(ownerId); if (!player) return;

        // Remove from old zone UI
        if (fromZone === 'hand') {
            if (isLocal) $(`#player-hand .card[data-card-unique-id="${cardUniqueId}"]`).remove();
            else this._updateOpponentHandCount(player);
        } else if (fromZone === 'battlefield') {
             $(`.battlefield .card[data-card-unique-id="${cardUniqueId}"]`).remove();
        }

        // Add to new zone UI
        if (toZone === 'hand') {
            if (isLocal) this._addCardToHandUI(cardData);
            else this._updateOpponentHandCount(player);
        } else if (toZone === 'battlefield') {
             this._addCardToBattlefieldUI(cardData, ownerId);
        }

        // Update counts
         if (['deck', 'graveyard'].includes(fromZone)) this[`_update${fromZone.charAt(0).toUpperCase() + fromZone.slice(1)}Count`](player);
         if (['deck', 'graveyard'].includes(toZone)) this[`_update${toZone.charAt(0).toUpperCase() + toZone.slice(1)}Count`](player);
         // Hand counts updated implicitly by add/remove UI functions

         // If card moved FROM hand during discard required, update required count UI
         if (fromZone === 'hand' && this.#pendingDiscardCount > 0 && ownerId === this.#localPlayerId) {
             if (this.#pendingDiscardCount <= 0) { // Should be updated by game logic by now
                 this._exitDiscardRequiredMode();
             } else {
                 $('#action-feedback').text(`Mão cheia! Descarte ${this.#pendingDiscardCount} carta(s).`);
             }
         }
    }
    _handleGameLog(event) { this._addLogMessage(event.detail.message, event.detail.type || 'system'); }
    _handleCreatureUpdate(event) {
        const { cardUniqueId, updates } = event.detail;
        const $card = $(`.card[data-card-unique-id="${cardUniqueId}"]`); if (!$card.length) return;
        if (updates.isTapped !== undefined) $card.toggleClass('tapped', updates.isTapped);
        if (updates.currentToughness !== undefined) $card.find('.card-toughness').text(updates.currentToughness);
        if (updates.attack !== undefined) $card.find('.card-attack').text(updates.attack);
        if (updates.hasSummoningSickness !== undefined) $card.toggleClass('has-summoning-sickness', updates.hasSummoningSickness);
        if(updates.statusEffects) { $card.toggleClass('shielded', !!updates.statusEffects['shielded']); $card.toggleClass('silenced', !!updates.statusEffects['silenced'] || !!updates.statusEffects['cant_attack']); }
        if (updates.canAttack !== undefined) $card.toggleClass('cannot-act', !updates.canAttack);
    }
    _handleDamagePrevented(event) {
        const $card = $(`.card[data-card-unique-id="${event.detail.target.uniqueId}"]`);
        this._showCardFeedback($card, 'damage-prevented');
    }
    _handleCreatureTookDamage(event) {
        const $card = $(`.card[data-card-unique-id="${event.detail.creature.uniqueId}"]`);
        this._showCardFeedback($card, 'damage', event.detail.amount);
    }
    _handleCreatureHealed(event) {
        const $card = $(`.card[data-card-unique-id="${event.detail.creature.uniqueId}"]`);
        this._showCardFeedback($card, 'heal', event.detail.amount);
    }
    _handleCombatResolved(event) { this._clearCombatVisuals(); this._updateTurnControls(); }
    _handleGameOver(event) {
        const { winnerId, winnerName, loserName } = event.detail;
        const message = (winnerId === this.#localPlayerId) ? `Vitória! Você derrotou ${loserName || 'o oponente'}!` : `Derrota! ${winnerName || 'O oponente'} venceu!`;
        $('#game-over-message').text(message);
        $('#game-over-overlay').addClass('active');
        this._disableAllGameActions();
    }
    _handleDeckEmpty(event) {
        const playerName = this.#gameInstance.getPlayer(event.detail.playerId)?.name || 'Jogador';
        this._addLogMessage(`${playerName} não pode comprar cartas!`, 'warning');
    }
    _handleDiscardRequired(event) {
         const { playerId, count } = event.detail;
         this.#pendingDiscardCount = count; // Update internal count
         if (playerId === this.#localPlayerId) {
             this._enterDiscardRequiredMode(count); // Update UI prompt
         } else {
              const playerName = this.#gameInstance.getPlayer(playerId)?.name || 'Oponente';
              $('#action-feedback').text(`${playerName} precisa descartar ${count} carta(s)...`);
         }
    }
    _handleAttackPhaseStart(event) { this._updateTurnControls(); }
    _handleAttackersDeclared(event) {
        this._clearCombatVisuals(); // Clear previous combat visuals
        event.detail.attackers.forEach(attackerData => {
             $(`.card[data-card-unique-id="${attackerData.uniqueId}"]`).addClass('attacking');
        });
        const attackerNames = event.detail.attackers.map(a => a.name).join(', ') || 'Ninguém';

        if (this.#gameInstance?.getCurrentPlayer()?.id !== this.#localPlayerId) { // If opponent declared
            this._enterBlockerAssignmentMode();
            $('#action-feedback').text(`Declare bloqueadores contra: ${attackerNames}.`);
            this._addLogMessage(`Oponente declarou ataque com: ${attackerNames}. Declare bloqueadores.`, 'combat');
        } else { // If local player declared
             $('#action-feedback').text('Aguardando bloqueadores do oponente...');
             this._addLogMessage(`Ataque declarado com ${attackerNames}. Aguardando bloqueadores...`, 'info');
        }
        this._updateTurnControls();
    }
    _handleBlockersDeclared(event) {
        this._clearCombatVisuals(); // Clear just attacker highlights maybe? Or all and re-add
        // Re-add attacker highlights
        const attackers = this.#gameInstance?.getCombatManager()?.getAttackers() || [];
        attackers.forEach(att => $(`.card[data-card-unique-id="${att.uniqueId}"]`).addClass('attacking'));
        // Add blocker highlights
        event.detail.declaredBlockers?.forEach(blockerInfo => {
            $(`.card[data-card-unique-id="${blockerInfo.blockerId}"]`).addClass('blocking');
        });
        $('#action-feedback').text('Bloqueadores declarados. Resolvendo combate...');
        this._addLogMessage('Bloqueadores declarados. Resolvendo...', 'combat');
        this._updateTurnControls();
    }

    // --- Private UI State/Helpers --- (No changes needed in these functions from previous versions)
    _canInteract(needsActiveTurn = true) {
        if (!this.#gameInstance || this.#gameInstance.state === 'game_over') return false;
        // Allow interaction if selecting discard, target, or needing discard
        if (this.#isSelectingTarget || this.#isSelectingDiscard || this.#pendingDiscardCount > 0) return true; // Allow specific interactions
        // Otherwise, check for active turn if required
        if (needsActiveTurn && this.#gameInstance.getCurrentPlayer()?.id !== this.#localPlayerId) return false;
        return true;
    }
    _enterDiscardRequiredMode(count) {
         console.log(`UI: Entering Discard Required mode (Count: ${count})`);
         this.#pendingDiscardCount = count;
         $('#action-feedback').text(`Mão cheia! Descarte ${count} carta(s). Clique na(s) carta(s) para descartar.`);
         this._disableAllGameActions(true); // Disable all except hand card clicks for discard
         $('#player-hand .card').addClass('targetable'); // Highlight hand for discard
    }
    _exitDiscardRequiredMode() {
         console.log("UI: Exiting Discard Required mode.");
         this.#pendingDiscardCount = 0;
         $('#action-feedback').text('');
         $('#player-hand .card').removeClass('targetable');
         this._updateTurnControls(); // Re-enable controls
    }
    _enterDiscardSelectionMode() {
         console.log("UI: Entering Discard for Mana mode.");
         this.#isSelectingDiscard = true;
         $('#action-feedback').text('Clique em uma carta na sua mão para descartar por +1 Mana Máx.');
         $('#player-hand .card').addClass('targetable'); // Highlight hand
         this._disableAllGameActions(true); // Disable others
         $('#btn-discard-mana').addClass('active-selection'); // Visual feedback on button
    }
    _exitDiscardSelectionMode() {
         console.log("UI: Exiting Discard for Mana mode.");
         this.#isSelectingDiscard = false;
         $('#action-feedback').text('');
         $('#player-hand .card').removeClass('targetable');
         $('#btn-discard-mana').removeClass('active-selection');
         this._updateTurnControls(); // Re-enable controls
    }
    _enterTargetSelectionMode(actionInfo) {
        console.log("UI: Entering Target Selection mode:", actionInfo);
        this.#isSelectingTarget = true;
        this.#actionPendingTarget = actionInfo;
        const sourceCard = this.#gameInstance?.findCardInstance(actionInfo.cardUniqueId);
        const cardName = sourceCard?.name || 'Carta';
        $('#action-feedback').text(`Selecione um alvo para ${cardName}... (Clique no alvo)`);
        this._highlightValidTargets(actionInfo.targetType);
        this._disableAllGameActions(true); // Disable non-target actions
        $(`#player-hand .card[data-card-unique-id="${actionInfo.cardUniqueId}"]`).addClass('is-selecting'); // Highlight source card
    }
    _exitTargetSelectionMode() {
         console.log("UI: Exiting Target Selection mode.");
         this.#isSelectingTarget = false;
         this.#actionPendingTarget = null;
         $('#action-feedback').text('');
         $('.targetable').removeClass('targetable'); // Clear highlights
         $('.is-selecting').removeClass('is-selecting');
         this._updateTurnControls(); // Re-enable controls
    }
    _enterAttackerDeclarationMode() {
        if (!this._canInteract(true)) return; // Ensure it's player's turn
        console.log("UI: Entering Attacker Declaration mode.");
        this.#isDeclaringAttackers = true;
        this.#selectedAttackerIds.clear();
        $('#action-feedback').text('Selecione as criaturas para atacar e clique em Confirmar Ataque.');
        $('#player-battlefield .card').each((i, el) => {
            const $card = $(el);
            const cardInstance = this.#gameInstance.getPlayer(this.#localPlayerId)?.battlefield.getCard($card.data('card-unique-id'));
            if (cardInstance instanceof CreatureCard && cardInstance.canAttack()) {
                 $card.addClass('targetable');
            } else { $card.addClass('cannot-act'); }
        });
        $('#btn-confirm-attack').text('Confirmar Ataque').off('click').on('click', this._handleConfirmAttackersClick.bind(this)).show().prop('disabled', true);
        $('#btn-pass-phase, #btn-end-turn, #btn-discard-mana').prop('disabled', true);
    }
    _exitAttackerDeclarationMode() {
         console.log("UI: Exiting Attacker Declaration mode.");
         this.#isDeclaringAttackers = false;
         this.#selectedAttackerIds.clear();
         $('#action-feedback').text('');
         $('.targetable, .selected-attacker, .cannot-act').removeClass('targetable selected-attacker cannot-act');
         $('#btn-confirm-attack').hide().prop('disabled', true);
         this._updateTurnControls();
    }
    _enterBlockerAssignmentMode() {
         if (this.#gameInstance?.getCurrentPlayer()?.id === this.#localPlayerId) return;
         console.log("UI: Entering Blocker Assignment mode.");
         this.#isAssigningBlockers = true;
         this.#blockerAssignmentsUI = {}; this.#selectedBlockerId = null;
         $('#action-feedback').text('Selecione seu bloqueador, depois clique no atacante inimigo para bloquear.');
          $('#player-battlefield .card').each((i, el) => {
             const $card = $(el);
             const cardInstance = this.#gameInstance.getPlayer(this.#localPlayerId)?.battlefield.getCard($card.data('card-unique-id'));
             if (cardInstance instanceof CreatureCard && cardInstance.canBlock()) { $card.addClass('targetable'); }
             else { $card.addClass('cannot-act'); }
         });
          const attackers = this.#gameInstance?.getCombatManager()?.getAttackers() || [];
          attackers.forEach(att => $(`.card[data-card-unique-id="${att.uniqueId}"]`).addClass('attacking'));
         $('#btn-confirm-blocks').show().prop('disabled', false);
         $('#btn-pass-phase, #btn-end-turn, #btn-discard-mana').prop('disabled', true);
    }
    _exitBlockerAssignmentMode() {
         console.log("UI: Exiting Blocker Assignment mode.");
         this.#isAssigningBlockers = false;
         this.#blockerAssignmentsUI = {}; this.#selectedBlockerId = null;
         $('#action-feedback').text('');
         $('.targetable, .selected-blocker, .blocking, .cannot-act').removeClass('targetable selected-blocker blocking cannot-act');
         $('#btn-confirm-blocks').hide().prop('disabled', true);
         this._updateTurnControls();
    }
    _exitCombatModes() {
        if (this.#isDeclaringAttackers) this._exitAttackerDeclarationMode();
        if (this.#isAssigningBlockers) this._exitBlockerAssignmentMode();
    }
    _clearCombatVisuals() { $('.card.attacking, .card.blocking, .card.selected-attacker, .card.selected-blocker').removeClass('attacking blocking selected-attacker selected-blocker'); }
    _assignBlocker(attackerId, blockerId) {
        if (!this.#blockerAssignmentsUI[attackerId]) this.#blockerAssignmentsUI[attackerId] = [];
        if (!this.#blockerAssignmentsUI[attackerId].includes(blockerId)) {
             this.#blockerAssignmentsUI[attackerId].push(blockerId);
             this._updateBlockerAssignmentVisuals();
             this._addLogMessage(`${$(`.card[data-card-unique-id="${blockerId}"]`).data('card-name') || 'Bloqueador'} -> ${$(`.card[data-card-unique-id="${attackerId}"]`).data('card-name') || 'Atacante'}`, 'info');
         } else { console.log("UI: Blocker already assigned to this attacker."); }
    }
    _updateBlockerAssignmentVisuals() {
        $('.card.blocking').removeClass('blocking'); // Clear previous
        for (const attackerId in this.#blockerAssignmentsUI) {
             this.#blockerAssignmentsUI[attackerId].forEach(blockerId => {
                 $(`.card[data-card-unique-id="${blockerId}"]`).addClass('blocking');
             });
        }
    }
    _highlightValidTargets(targetType) {
        $('.targetable').removeClass('targetable');
        if (!this.#gameInstance || !this.#localPlayerId) return;
        const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
        const opponent = this.#gameInstance.getOpponent(this.#localPlayerId);
        let selector = '';
        switch (targetType) {
            case 'creature': selector = '#player-battlefield .card, #opponent-battlefield .card'; break;
            case 'opponent_creature': selector = '#opponent-battlefield .card'; break;
            case 'own_creature': selector = '#player-battlefield .card'; break;
            case 'player': $('#player-info, #opponent-info').addClass('targetable'); return;
            case 'opponent_player': $('#opponent-info').addClass('targetable'); return;
            default: console.warn("Highlighting: Unknown target type:", targetType); return;
        }
        $(selector).each((i, el) => {
             const $card = $(el); const cardUniqueId = $card.data('card-unique-id');
             const cardInstance = localPlayer?.battlefield.getCard(cardUniqueId) || opponent?.battlefield.getCard(cardUniqueId);
             if (cardInstance && targetType.includes('creature') && !(cardInstance instanceof CreatureCard)) return;
             // Add more filtering here if needed
             $card.addClass('targetable');
        });
    }
    _checkIfValidTarget(targetInstance, targetOwnerId, actionInfo) {
        if (!targetInstance || !actionInfo) return false;
        const requiredType = actionInfo.targetType;
        if (requiredType.includes('creature') && !(targetInstance instanceof CreatureCard)) return false;
        if (requiredType.includes('player') && !(targetInstance instanceof Player)) return false;
        if (requiredType.includes('runebinding') && !(targetInstance instanceof RunebindingCard)) return false;
        if (requiredType === 'opponent_creature' && targetOwnerId === this.#localPlayerId) return false;
        if (requiredType === 'own_creature' && targetOwnerId !== this.#localPlayerId) return false;
        if (requiredType === 'opponent_player' && targetInstance.id === this.#localPlayerId) return false;
        // Add hexproof etc. checks here
        return true;
    }
    _showCardFeedback($cardElement, feedbackType, value = '') {
        if (!$cardElement || !$cardElement.length) return;
        $cardElement.find('.card-feedback').remove(); // Remove old one
        let feedbackContent = '', cssClass = '';
        switch (feedbackType) {
            case 'damage': feedbackContent = `-${value}`; cssClass = 'feedback-damage'; break;
            case 'heal': feedbackContent = `+${value}`; cssClass = 'feedback-heal'; break;
            case 'buff': feedbackContent = `+${value}`; cssClass = 'feedback-buff'; break;
            case 'debuff': feedbackContent = `-${value}`; cssClass = 'feedback-debuff'; break;
            case 'damage-prevented': feedbackContent = '🛡️'; cssClass = 'feedback-shield'; break;
            case 'invalid-target': feedbackContent = '❌'; cssClass = 'feedback-invalid'; break;
            case 'cannot-act': feedbackContent = '🚫'; cssClass = 'feedback-invalid'; break;
            case 'cancel': feedbackContent = '↩️'; cssClass = 'feedback-cancel'; break;
            default: return;
        }
        const $feedback = $(`<div class="card-feedback ${cssClass}">${feedbackContent}</div>`);
        $cardElement.append($feedback);
        $feedback.fadeIn(100).delay(800).fadeOut(400, function() { $(this).remove(); });
    }
    _disableAllGameActions(allowTargetingOrDiscard = false) {
        console.log("UI: Disabling most game actions. Allow specific:", allowTargetingOrDiscard);
        $('#btn-end-turn, #btn-pass-phase, #btn-discard-mana, #btn-confirm-attack, #btn-confirm-blocks').prop('disabled', true);
        if (!allowTargetingOrDiscard) {
             $('#player-hand .card, #player-battlefield .card').addClass('disabled-interaction');
        } else {
             // Still disable cards that are NOT currently targetable
             $('#player-hand .card:not(.targetable), #player-battlefield .card:not(.targetable)').addClass('disabled-interaction');
             // Allow clicks on targetable elements
             $('.targetable').removeClass('disabled-interaction');
        }
    }
    _closeZoomedImage(overlayId = null) {
        if (overlayId) $(`#${overlayId}`).removeClass('active');
        else $('.image-zoom-overlay').removeClass('active');
        $('.image-zoom-overlay img').attr('src', ''); // Clear src
    }

    // --- Private Rendering Helpers --- (Incorporated _renderCard fix)
    _renderCard(cardData, location = 'hand') {
        if (!cardData) return null;
        const isMini = location === 'collection' || location === 'deck';
        const cardClass = isMini ? 'mini-card' : 'card';
        const uniqueIdAttr = !isMini ? `data-card-unique-id="${cardData.uniqueId}"` : '';
        const baseIdAttr = `data-card-id="${cardData.id}"`;
        const cardName = cardData.name || 'Unknown Card';
        const imageSrc = cardData.imageSrc || 'assets/images/cards/default.png';

        // Tooltip
        const tooltipParts = [`${cardName} [${cardData.cost ?? '?'}]`, `${cardData.type}${cardData.tribe ? ` - ${cardData.tribe}` : ''}`];
        if (cardData.attack !== undefined) tooltipParts.push(` ${cardData.attack}/${cardData.toughness}`);
        tooltipParts.push(cardData.description || cardData.effectText || '');
        const tooltip = tooltipParts.join('\n');

        // Structure (background on main div)
        let cardHtml = `<div class="${cardClass} ${cardData.type?.toLowerCase() || ''}"
                           ${uniqueIdAttr} ${baseIdAttr}
                           title="${tooltip}"
                           style="background-image: url('${imageSrc}')">`;

        // Overlays (Cost, Name, Stats for battle cards)
        if (!isMini) { // Only show detailed overlays for battle cards
             cardHtml += `<div class="card-overlay card-cost">${cardData.cost ?? '?'}</div>`;
             cardHtml += `<div class="card-overlay card-name">${cardName}</div>`;
             if (cardData.type === 'Creature') {
                 const displayAttack = cardData.attack ?? (cardData.baseAttack ?? '?'); // Show current attack if available
                 const displayToughness = cardData.currentToughness ?? (cardData.toughness ?? (cardData.baseToughness ?? '?')); // Show current toughness
                 cardHtml += `<div class="card-overlay card-stats"><span class="card-attack">${displayAttack}</span>/<span class="card-toughness">${displayToughness}</span></div>`;
             }
        } else { // Mini card only gets name overlay
             cardHtml += `<div class="card-name-overlay">${cardName}</div>`;
        }

        cardHtml += `</div>`; // Close card div
        const $card = $(cardHtml);
        $card.data('card-name', cardName);
        return $card;
     }
     _addCardToHandUI(cardData) {
        const $card = this._renderCard(cardData, 'hand');
        if ($card) {
            $('#player-hand').append($card);
            $card.addClass('animate-add-hand'); // Needs CSS animation defined
            setTimeout(() => $card.removeClass('animate-add-hand'), 500);
        }
    }
    _renderPlayerHand(player) {
        const $hand = $('#player-hand').empty();
        player.hand.getCards().forEach(card => {
             const $cardUI = this._renderCard(card.getRenderData(), 'hand');
             if ($cardUI) $hand.append($cardUI);
        });
    }
    _renderOpponentHand(opponent) {
         const $hand = $('#opponent-hand').empty();
         const handSize = opponent.hand.getSize();
         $('#opponent-hand-count').text(handSize);
         for (let i = 0; i < handSize; i++) $hand.append('<div class="card-back"></div>');
    }
    _updateOpponentHandCount(opponent) { this._renderOpponentHand(opponent); } // Simplify
    _addCardToBattlefieldUI(cardData, ownerId) {
        const $card = this._renderCard(cardData, 'battlefield');
        if ($card) {
             const targetField = (ownerId === this.#localPlayerId) ? '#player-battlefield' : '#opponent-battlefield';
             $(targetField).append($card);
             $card.addClass('animate-enter-battlefield'); // Needs CSS animation
             setTimeout(() => $card.removeClass('animate-enter-battlefield'), 500);
        }
    }
    _updatePlayerStats(player) {
        const isLocal = player.id === this.#localPlayerId;
        const prefix = isLocal ? '#player' : '#opponent';
        const data = player.getRenderData();
        $(`${prefix}-life`).text(data.life);
        $(`${prefix}-mana`).text(data.mana);
        $(`${prefix}-max-mana`).text(data.maxMana);
        $(`${prefix}-name`).text(data.name);
    }
    _updateDeckCount(player) {
        const isLocal = player.id === this.#localPlayerId; const prefix = isLocal ? '#player' : '#opponent';
        $(`${prefix}-deck-count`).text(player.deck.getSize());
    }
    _updateGraveyardCount(player) {
        const isLocal = player.id === this.#localPlayerId; const prefix = isLocal ? '#player' : '#opponent';
        $(`${prefix}-graveyard-count`).text(player.graveyard.getSize());
    }
    _updateTurnControls() {
        if (!this.#gameInstance || this.#gameInstance.state === 'game_over') {
             this._disableAllGameActions();
             $('#btn-confirm-attack, #btn-confirm-blocks').hide(); return;
        }
        const isMyTurn = this.#gameInstance.getCurrentPlayer()?.id === this.#localPlayerId;
        const currentPhase = this.#gameInstance.getCurrentPhase();
        const player = this.#gameInstance.getPlayer(this.#localPlayerId);
        const canAttack = player?.canDeclareAttackers();

        // Base Actions
        const baseActionsDisabled = !isMyTurn || this.#isSelectingTarget || this.#isSelectingDiscard || this.#pendingDiscardCount > 0;
        $('#btn-end-turn').prop('disabled', baseActionsDisabled);
        $('#btn-pass-phase').prop('disabled', baseActionsDisabled);
        $('#btn-discard-mana').prop('disabled', baseActionsDisabled || player?.hasDiscardedForMana || currentPhase !== 'main');

        // Combat Buttons Logic
        $('#btn-confirm-attack, #btn-confirm-blocks').hide().prop('disabled', true); // Hide by default

        if (isMyTurn && currentPhase === 'attack' && !this.#isDeclaringAttackers && !this.#isAssigningBlockers) {
            // Show "Declare Attackers" button if possible
             $('#btn-confirm-attack').text('Declarar Atacantes').off('click').on('click', this._enterAttackerDeclarationMode.bind(this)).show().prop('disabled', !canAttack);
        } else if (this.#isDeclaringAttackers) {
            // Show "Confirm Attack" button
             $('#btn-confirm-attack').text('Confirmar Ataque').off('click').on('click', this._handleConfirmAttackersClick.bind(this)).show().prop('disabled', this.#selectedAttackerIds.size === 0);
        } else if (this.#isAssigningBlockers) {
             // Show "Confirm Blocks" button (controlled by its enter/exit modes)
             $('#btn-confirm-blocks').show().prop('disabled', false); // Always allow confirming 0 blocks
        }

        // Re-enable interactions if not in a special state
         if (!this.#isSelectingTarget && !this.#isSelectingDiscard && this.#pendingDiscardCount === 0) {
             $('.disabled-interaction').removeClass('disabled-interaction');
         } else {
            // Ensure non-targetable cards are disabled during targeting
            $('#player-hand .card:not(.targetable), #player-battlefield .card:not(.targetable)').addClass('disabled-interaction');
         }
    }
    _addLogMessage(message, type = 'info') {
        if (!message) return; const $log = $('#game-log'), $li = $(`<li></li>`).addClass(`log-${type}`).text(message); $log.append($li);
        const logContainer = $log.parent('.game-log-container'); if (logContainer.length) logContainer.scrollTop(logContainer[0].scrollHeight);
    }

    // --- Private Profile/Options/DB Helpers ---
    _loadOptions() {
        try { const stored = localStorage.getItem(this.#OPTIONS_STORAGE_KEY); if (stored) this.#options = JSON.parse(stored); }
        catch (e) { console.error("UI: Erro ao carregar opções:", e); } this._applyVisualOptions();
    }
    _applyVisualOptions() {
        $('body').removeClass('text-small text-large contrast-high').addClass(`text-${this.#options.textSize || 'normal'}`);
        if (this.#options.highContrast) $('body').addClass('contrast-high');
        // Apply other visual options
    }
    _renderMatchHistory(history) {
        const $list = $('#profile-match-history').empty(); if (!history || history.length === 0) { $list.append('<li>(Nenhum histórico ainda)</li>'); return; }
        history.slice(0, 10).forEach(m => { const d = new Date(m.date).toLocaleDateString('pt-BR'), rC = m.result === 'win' ? 'h-win' : m.result === 'loss' ? 'h-loss' : '', rT = m.result === 'win' ? 'Vitória' : m.result === 'loss' ? 'Derrota' : 'Empate'; $list.append(`<li class="${rC}">${d} - ${rT} vs ${m.opponent}</li>`); });
    }
    _renderProfileCollection(ids) {
        const $container = $('#profile-unlocked-cards').empty(); $('#profile-card-count').text(ids?.length || 0); if (!Array.isArray(ids) || ids.length === 0) { $container.append('<p class="placeholder-message">(Nenhuma carta)</p>'); return; }
        ids.forEach(id => { if (this.#cardDatabase[id]) { const $mc = this._renderMiniCard(this.#cardDatabase[id], 'collection'); if ($mc) $container.append($mc); } });
    }
    _renderDeckList(decks) {
        const $list = $('#profile-deck-list').empty(); const ids = Object.keys(decks || {}); if (!ids.length) { $list.append('<li>(Nenhum deck)</li>'); return; }
        ids.forEach(id => { const d = decks[id]; if (d) $list.append(`<li data-deck-id="${id}"><span class="deck-name">${d.name} (${d.cards?.length || 0})</span><span class="deck-buttons"><button class="btn-edit-deck" title="Editar">✏️</button><button class="btn-delete-deck" title="Excluir">🗑️</button></span></li>`); });
    }
    _populateDeckBuilderFilters(collectionIds) {
        const $costFilter = $('#db-filter-cost'), $tribeFilter = $('#db-filter-tribe');
        $costFilter.children('option:not(:first-child)').remove(); $tribeFilter.children('option:not(:first-child)').remove();
        const costs = new Set(), tribes = new Set();
        collectionIds.forEach(id => { const cd = this.#cardDatabase[id]; if(cd) { costs.add(cd.cost >= 7 ? '7+' : cd.cost.toString()); if (cd.tribe && cd.tribe !== 'None') tribes.add(cd.tribe); }});
        [...costs].sort((a, b) => (a === '7+' ? Infinity : parseInt(a)) - (b === '7+' ? Infinity : parseInt(b))).forEach(c => $costFilter.append(`<option value="${c}">${c}</option>`));
        [...tribes].sort().forEach(t => $tribeFilter.append(`<option value="${t}">${t}</option>`));
    }
    _renderDeckBuilderCollectionPanel() {
        const ids = this.#accountManager.getCollection() || [], $container = $('#db-available-cards').empty(); $('#db-collection-count').text(ids.length);
        if (!Array.isArray(ids)) { $container.append('<p class="placeholder-message">Erro coleção.</p>'); return; }
        const fN = $('#db-filter-name').val().toLowerCase(), fT = $('#db-filter-type').val(), fC = $('#db-filter-cost').val(), fR = $('#db-filter-tribe').val(); let cardsRendered = 0;
        ids.forEach(id => { const cd = this.#cardDatabase[id]; if (cd) { if (fN && !cd.name.toLowerCase().includes(fN)) return; if (fT && cd.type !== fT) return; if (fC) { if (fC === '7+' && cd.cost < 7) return; if (fC !== '7+' && cd.cost != fC) return; } if (fR && (cd.tribe || 'None') !== fR) return; const $mc = this._renderMiniCard(cd, 'collection'); if ($mc) { $container.append($mc); cardsRendered++; } } });
        if (cardsRendered === 0 && ids.length > 0) $container.append('<p class="placeholder-message">(Nenhuma carta corresponde)</p>'); else if (ids.length === 0) $container.append('<p class="placeholder-message">(Coleção vazia)</p>');
        this._initializeSortables(); // Re-init after rendering
    }
    _renderDeckBuilderDeckPanel() {
        const $container = $('#db-current-deck').empty();
        this.#dbState.currentDeckCards.forEach(id => { if (this.#cardDatabase[id]) { const $mc = this._renderMiniCard(this.#cardDatabase[id], 'deck'); if ($mc) $container.append($mc); } });
        if (this.#dbState.currentDeckCards.length === 0) $container.append('<p class="placeholder-message">(Arraste cartas aqui)</p>');
        this._updateDeckValidity();
    }
    _renderMiniCard(cardData, location = 'collection') { // Updated version
        if (!cardData) return null; const cardClass = 'mini-card', locationClass = location === 'deck' ? 'in-deck' : 'in-collection', baseIdAttr = `data-card-id="${cardData.id}"`, cardName = cardData.name || '?', imageSrc = cardData.image_src || 'assets/images/cards/default.png';
        const tooltipParts = [`${cardName} [${cardData.cost ?? '?'}]`, `${cardData.type}${cardData.tribe ? ` - ${cardData.tribe}` : ''}`]; if (cardData.attack !== undefined) tooltipParts.push(` ${cardData.attack}/${cardData.toughness}`); tooltipParts.push(cardData.description || cardData.effect || ''); const tooltip = tooltipParts.join('\n');
        const $card = $(`<div class="${cardClass} ${locationClass}" ${baseIdAttr} title="${tooltip}" style="background-image: url('${imageSrc}')"><div class="card-name-overlay">${cardName}</div></div>`); $card.data('card-name', cardName); return $card;
    }
    _updateDeckValidity() {
        const count = this.#dbState.currentDeckCards.length, min = 30, max = 40, isValid = count >= min && count <= max, deckName = $('#db-deck-name').val().trim();
        $('#db-deck-count, #db-deck-count-display').text(count);
        if (isValid) $('#db-deck-validity').text('(Válido)').css('color', 'var(--valid-color)'); else if (count < min) $('#db-deck-validity').text(`(Mín ${min})`).css('color', 'var(--invalid-color)'); else $('#db-deck-validity').text(`(Máx ${max})`).css('color', 'var(--invalid-color)');
        $('#btn-save-deck').prop('disabled', !isValid || !deckName);
    }
    _addCardToDeck(cardId) {
        if (!cardId) return false; const $message = $('#deck-builder-message'), currentCount = this.#dbState.currentDeckCards.filter(id => id === cardId).length, cardName = this.#cardDatabase[cardId]?.name || cardId;
        if (currentCount >= this.#dbState.MAX_COPIES_PER_CARD) { $message.text(`Máx ${this.#dbState.MAX_COPIES_PER_CARD} de "${cardName}".`).css('color', 'orange'); setTimeout(()=>$message.text(''), 3000); return false; }
        if (this.#dbState.currentDeckCards.length >= 40) { $message.text('Máx 40 cartas.').css('color', 'orange'); setTimeout(()=>$message.text(''), 3000); return false; }
        this.#dbState.currentDeckCards.push(cardId); this._updateDeckValidity(); $message.text(''); return true;
    }
    _removeCardFromDeck(cardId) { // Updated version with logging
         if (!cardId) return false; const initialLength = this.#dbState.currentDeckCards.length, index = this.#dbState.currentDeckCards.indexOf(cardId);
         console.log(`_removeCardFromDeck: Trying to remove ${cardId}. Index: ${index}`); console.log(`_removeCardFromDeck: Before: ${JSON.stringify(this.#dbState.currentDeckCards)}`);
         if (index > -1) { this.#dbState.currentDeckCards.splice(index, 1); console.log(`_removeCardFromDeck: After: ${JSON.stringify(this.#dbState.currentDeckCards)}`); if (this.#dbState.currentDeckCards.length < initialLength) { console.log(`UI State: OK removed ${cardId}. New count: ${this.#dbState.currentDeckCards.length}`); return true; } else { console.error(`UI State: Error splicing ${cardId}?`); return false; } }
         console.warn("UI State: ID not found, cannot remove:", cardId); return false;
    }

    // --- SortableJS Initialization & Re-initialization --- (Updated onRemove)
    _initializeSortables() {
        if (this.#collectionSortable) this.#collectionSortable.destroy(); if (this.#deckSortable) this.#deckSortable.destroy();
        const collectionListEl = document.getElementById('db-available-cards'), deckListEl = document.getElementById('db-current-deck'), self = this;
        if (!collectionListEl || !deckListEl) { console.error("UI Error: Sortable elements not found."); return; }
        console.log("UI: Initializing/Re-initializing SortableJS...");
        const commonSortableOptions = { animation: 150, filter: '.placeholder-message', preventOnFilter: false, onMove: function (evt) { $(evt.to).addClass('drag-over'); if (!$(evt.related).closest('.card-list').length) $('body').addClass('drag-over-body'); else $('body').removeClass('drag-over-body'); }, onUnchoose: function(evt) { $('.card-list').removeClass('drag-over'); $('body').removeClass('drag-over-body'); } };
        this.#collectionSortable = new Sortable(collectionListEl, { ...commonSortableOptions, group: { name: 'deckBuilderShared', pull: 'clone', put: false }, sort: false, onStart: ()=>{ $('body').removeClass('dragging-from-deck'); } });
        this.#deckSortable = new Sortable(deckListEl, { ...commonSortableOptions, group: { name: 'deckBuilderShared', pull: true, put: true }, sort: true,
            onAdd: function (evt) { const cardId=$(evt.item).data('card-id'); console.log(`Sortable Deck: onAdd ${cardId}`); const added=self._addCardToDeck(cardId); if(!added){$(evt.item).remove();} $(evt.to).removeClass('drag-over'); /* Update called in _addCardToDeck */ },
            onRemove: function (evt) { const cardId=$(evt.item).data('card-id'); console.log(`Sortable Deck: onRemove triggered for ${cardId}`); const removedFromState = self._removeCardFromDeck(cardId); if (removedFromState) { console.log(`OK removed ${cardId} from state.`); self._updateDeckValidity(); } else { console.warn(`Failed to remove ${cardId} from state.`); } $('body').removeClass('drag-over-body'); $(evt.from).removeClass('drag-over'); }, // Simplified onRemove
            onUpdate: function (evt) { console.log("Sortable Deck: onUpdate"); setTimeout(()=>{self.#dbState.currentDeckCards = $(deckListEl).children('.mini-card').map((i,el)=>$(el).data('card-id')).get(); self._updateDeckValidity(); console.log("UI State: Deck reordered", self.#dbState.currentDeckCards);}, 0); },
             onStart: ()=>{ $('body').addClass('dragging-from-deck'); }, onEnd: ()=>{ $('body').removeClass('dragging-from-deck'); }
        });
        console.log("UI: SortableJS initialized/re-initialized.");
    }
    _reinitializeCollectionSortable() { this._initializeSortables(); }
    _reinitializeDeckSortable() { this._initializeSortables(); }

} // End class UIManager