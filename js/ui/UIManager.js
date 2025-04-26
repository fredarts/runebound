// js/ui/UIManager.js

// Import UI Modules
import ProfileScreenUI from './screens/ProfileScreenUI.js';
import DeckBuilderUI from './screens/DeckBuilderUI.js';
import BattleScreenUI from './screens/BattleScreenUI.js';
import OptionsUI from './screens/OptionsUI.js';
import HomeScreenUI from './screens/HomeScreenUI.js';
import DeckManagementScreenUI from './screens/DeckManagementScreenUI.js';
import TitlescreenUi from './screens/titlescreenUi.js';
import SetCollectionScreenUI from './screens/SetCollectionScreenUI.js';
import SetMasteryScreenUI from './screens/SetMasteryScreenUI.js';
import StoreScreenUI from './screens/StoreScreenUI.js';
import BoosterOpeningScreenUI from './screens/BoosterOpeningScreenUI.js';

// Import Helpers
import CardRenderer from './helpers/CardRenderer.js';
import ZoomHandler from './helpers/ZoomHandler.js';

// AudioManager is injected

export default class UIManager {
    // --- Core References ---
    #screenManager;
    #accountManager;
    #cardDatabase;
    #audioManager;
    #gameInstance = null;
    #localPlayerId = null;

    // --- Shared Helpers ---
    #cardRenderer;
    #zoomHandler;

    // --- UI Module Instances ---
    #profileUI;
    #deckBuilderUI;
    #battleUI;
    #optionsUI;
    #homeUI;
    #deckManagementUI;
    #titlescreenUI;
    #setCollectionUI;
    #setMasteryUI;
    #storeUI;
    #boosterOpeningUI;

    #activeScreenUI = null; // Tracks the currently active UI module instance

    constructor(screenManager, accountManager, cardDatabase, audioManager) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;
        this.#audioManager = audioManager;

        // --- Create shared helpers FIRST ---
        this.#cardRenderer = new CardRenderer();
        this.#zoomHandler = new ZoomHandler(this.#cardDatabase);
        // --- End Create Helpers ---

        // --- Instantiate UI Modules and Inject Dependencies ---
        // Pass 'this' (the UIManager instance) where needed for navigation callbacks
        this.#titlescreenUI = new TitlescreenUi(this.#screenManager, this, this.#audioManager);
        this.#homeUI = new HomeScreenUI(this.#screenManager, this, this.#audioManager);
        this.#optionsUI = new OptionsUI(this.#audioManager); // Only needs audio
        this.#profileUI = new ProfileScreenUI(this.#screenManager, this.#accountManager, this.#cardDatabase, this.#cardRenderer, this.#zoomHandler, this, this.#audioManager);
        this.#deckManagementUI = new DeckManagementScreenUI(this.#screenManager, this.#accountManager, this.#cardDatabase, this.#cardRenderer, this.#zoomHandler, this, this.#audioManager);
        this.#deckBuilderUI = new DeckBuilderUI(this.#screenManager, this.#accountManager, this.#cardDatabase, this.#cardRenderer, this.#zoomHandler); // Inject AudioManager if needed later
        this.#battleUI = new BattleScreenUI(this.#screenManager, this.#accountManager, this.#cardDatabase, this.#cardRenderer, this.#zoomHandler, this.#audioManager, this);
        this.#setMasteryUI = new SetMasteryScreenUI(this.#screenManager, this.#accountManager, this, this.#audioManager);
        this.#setCollectionUI = new SetCollectionScreenUI(this.#screenManager, this.#accountManager, this.#cardDatabase, this.#zoomHandler); // Doesn't need audio/ui manager directly
        this.#storeUI = new StoreScreenUI(this.#screenManager, this.#accountManager, this.#audioManager, this);
        this.#boosterOpeningUI = new BoosterOpeningScreenUI(this.#screenManager, this.#accountManager, this.#audioManager, this, this.#cardRenderer); // Inject CardRenderer

        this._bindPermanentUIActions();
        console.log("UIManager (Coordinator) initialized.");
    }

    // --- Setup for the Game ---
    setGameInstance(gameInstance) {
        this.#gameInstance = gameInstance;
        console.log("UI Coordinator: Game instance set.");
        this.#battleUI.setGameInstance(gameInstance);
    }
    setLocalPlayer(playerId) {
        this.#localPlayerId = playerId;
        console.log(`UI Coordinator: Local player set: ${playerId}`);
        this.#battleUI.setLocalPlayer(playerId);
    }

    // --- Top Bar Control ---
    showTopBar(userData) {
        const $topBar = $('#top-bar');
        if (userData) {
            $topBar.find('#top-bar-username').text(userData.username);
            const avatarFile = userData.avatar || 'default.png';
            const $avatarImg = $topBar.find('.top-bar-avatar img');
            if($avatarImg.length) {
                $avatarImg.attr('src', `assets/images/avatars/${avatarFile}`)
                          .attr('alt', `Avatar de ${userData.username}`);
            } else {
                 console.warn("UIManager: Avatar img element (.top-bar-avatar img) not found.");
            }
            $topBar.addClass('active');
            console.log("UIManager: Top Bar shown for", userData.username);
        } else {
            console.warn("UIManager: showTopBar called without user data.");
            $topBar.removeClass('active');
        }
    }
    hideTopBar() {
        $('#top-bar').removeClass('active');
        console.log("UIManager: Top Bar hidden.");
    }

    // --- Render/Initialization Delegation ---
    // (These methods ensure the correct UI module's init/render is called)

    async renderTitlescreen(args) {
        const screenId = 'title-screen';
        const $screenElement = $(`#${screenId}`);
        if ($screenElement.length === 0) { console.error(`UIManager: Elemento #${screenId} não encontrado.`); return; }
        this.#cleanupActiveUI(this.#titlescreenUI);
        console.log("UI Coordinator: Initializing Titlescreen UI.");
        if (this.#titlescreenUI?.init) {
            try {
                this.#titlescreenUI.init($screenElement[0]);
                this.#activeScreenUI = this.#titlescreenUI;
            } catch(error) { console.error("UIManager: Erro ao inicializar TitlescreenUI", error); }
        } else { console.warn("UIManager: TitlescreenUI ou seu método init não encontrado."); }
    }

    async renderHomeScreen(args) {
        this.#cleanupActiveUI(this.#homeUI);
        console.log("UI Coordinator: Delegating home screen rendering.");
        try {
            await this.#homeUI.render(); // HomeScreen handles its own init/render logic
            this.#activeScreenUI = this.#homeUI;
        } catch (error) { console.error("UIManager: Erro ao renderizar HomeScreenUI", error); }
    }

    renderProfileScreen(args) {
        const screenId = 'profile-screen';
        const $screenElement = $(`#${screenId}`);
        if ($screenElement.length === 0) return;
        this.#cleanupActiveUI(this.#profileUI);
        console.log("UI Coordinator: Delegating profile screen rendering.");
        if (this.#profileUI?.render) {
            try {
                this.#profileUI.render(); // Profile screen likely sets up in render
                this.#activeScreenUI = this.#profileUI;
            } catch(error) { console.error("UIManager: Erro ao renderizar ProfileScreenUI", error); }
        }
    }

    async renderSetMasteryScreen(args) { // Expects { setCode: '...' } or defaults
        const screenId = 'set-mastery-screen';
        const $screenElement = $(`#${screenId}`);
        if ($screenElement.length === 0) return;
        this.#cleanupActiveUI(this.#setMasteryUI);
        console.log("UI Coordinator: Delegating Set Mastery rendering.");
        if (this.#setMasteryUI) {
             await this.#setMasteryUI.init(); // Ensure init is called
             this.#setMasteryUI.render(args?.setCode || 'ELDRAEM');
             this.#activeScreenUI = this.#setMasteryUI;
        }
    }

    renderDeckManagementScreen(args) {
        const screenId = 'deck-management-screen';
        const $screenElement = $(`#${screenId}`);
        if ($screenElement.length === 0) return;
        this.#cleanupActiveUI(this.#deckManagementUI);
        console.log("UI Coordinator: Delegating deck management rendering.");
        if (this.#deckManagementUI?.render) {
            try {
                this.#deckManagementUI.render(); // Handles its own setup
                this.#activeScreenUI = this.#deckManagementUI;
            } catch(error) { console.error("UIManager: Erro ao renderizar DeckManagementScreenUI", error); }
        }
    }

    renderDeckBuilderScreen(deckIdToEdit = null) { // Accepts ID directly now
        const screenId = 'deck-builder-screen';
        const $screenElement = $(`#${screenId}`);
        if ($screenElement.length === 0) return;
        this.#cleanupActiveUI(this.#deckBuilderUI);
        console.log("UI Coordinator: Delegating deck builder rendering.");
        if (this.#deckBuilderUI?.render) {
            try {
                this.#deckBuilderUI.render(deckIdToEdit);
                this.#activeScreenUI = this.#deckBuilderUI;
            } catch(error) { console.error("UIManager: Erro ao renderizar DeckBuilderUI", error); }
        }
    }

    renderOptionsScreen(args) {
        const screenId = 'options-screen';
        const $screenElement = $(`#${screenId}`);
        if ($screenElement.length === 0) return;
       this.#cleanupActiveUI(this.#optionsUI);
       console.log("UI Coordinator: Delegating options screen rendering.");
        if (this.#optionsUI?.render) {
            try {
                this.#optionsUI.render(); // Options handles its own setup
                this.#activeScreenUI = this.#optionsUI;
            } catch(error) { console.error("UIManager: Erro ao renderizar OptionsUI", error); }
        }
    }

    async renderStoreScreen(args) {
         const screenId = 'store-screen';
         const $screenElement = $(`#${screenId}`);
         if ($screenElement.length === 0) return;
         this.#cleanupActiveUI(this.#storeUI);
         console.log("UI Coordinator: Delegating store screen rendering.");
         if (this.#storeUI) {
              await this.#storeUI.init(); // Init loads items etc.
              this.#storeUI.render();
              this.#activeScreenUI = this.#storeUI;
         }
    }

    renderInitialGameState() {
        const screenId = 'battle-screen';
        this.#cleanupActiveUI(this.#battleUI);
        console.log("UI Coordinator: Delegating initial game state rendering.");
        if (!this.#gameInstance || !this.#localPlayerId) {
           console.error("UI Coordinator: Cannot render game state - game/player not set.");
           this.navigateTo('home-screen');
           return;
        }
        if (this.#battleUI?.renderInitialState) {
            try {
                this.#battleUI.renderInitialState(); // Battle handles its complex setup
                this.#activeScreenUI = this.#battleUI;
            } catch(error) { console.error("UIManager: Erro ao renderizar BattleScreenUI initial state", error); }
        }
    }

    // --- Helper to Cleanup Active UI ---
    #cleanupActiveUI(newUiInstance = null) {
        if (this.#activeScreenUI && this.#activeScreenUI !== newUiInstance) {
            if (typeof this.#activeScreenUI.destroy === 'function') {
                console.log(`UIManager: Destroying previous UI: ${this.#activeScreenUI.constructor.name}`);
                try { this.#activeScreenUI.destroy(); }
                catch (error) { console.error(`UIManager: Error destroying ${this.#activeScreenUI.constructor.name}`, error); }
            } else {
                console.log(`UIManager: Previous UI ${this.#activeScreenUI.constructor.name} has no destroy method.`);
            }
        }
        this.#activeScreenUI = null; // Clear reference before setting new one
    }

    // --- Simple Screen Preparations ---
    async renderLoginScreen(args) {
        this.#cleanupActiveUI();
        $('#login-form')[0]?.reset();
        $('#login-message').text('');
        console.log("UIManager: Prepared Login Screen state.");
    }
    async renderCreateAccountScreen(args) {
        this.#cleanupActiveUI();
        $('#create-account-form')[0]?.reset();
        $('#create-account-message').text('');
        console.log("UIManager: Prepared Create Account Screen state.");
    }
    async renderConnectScreen(args) { // Added method for connect screen
        this.#cleanupActiveUI();
        $('#connect-message').text('');
        $('#server-status-section, #join-game-section').hide();
        $('#opponent-ip').val('');
        console.log('UIManager: Resetting Connect Screen state.');
    }

    // --- Booster Opening Screen Render ---
    async renderBoosterOpeningScreen(argsObject) { // Expects { pack: [...] }
        const screenId = 'booster-opening-screen';
        const $el = $(`#${screenId}`);
        if ($el.length === 0) {
            console.error(`UIManager: Elemento #${screenId} não encontrado.`);
            return;
        }
        this.#cleanupActiveUI(this.#boosterOpeningUI);
        console.log("UIManager: Rendering Booster Opening with args:", argsObject);

        if (!this.#boosterOpeningUI) {
             console.error("UIManager Error: #boosterOpeningUI instance is missing.");
             return; // Cannot proceed
        }
        if (typeof this.#boosterOpeningUI.init !== 'function') {
            console.error("UIManager Error: BoosterOpeningUI is missing init method.");
            return;
        }

        const initSuccess = await this.#boosterOpeningUI.init(); // Ensure init completes

        if (!initSuccess) {
            console.error("UIManager: BoosterOpeningUI failed to initialize.");
            return; // Stop if init failed
        }

        if (typeof this.#boosterOpeningUI.render === 'function') {
            this.#boosterOpeningUI.render(argsObject); // Pass the arguments object
            this.#activeScreenUI = this.#boosterOpeningUI; // Set as active
        } else {
            console.error("UIManager Error: BoosterOpeningUI is missing render method.");
        }
    }

     // --- Set Collection Screen Render ---
     async renderSetCollectionScreen(args) { // Expects { setCode: '...' } or defaults
        const screenId = 'set-collection-screen';
        const $el = $(`#${screenId}`);
        if ($el.length === 0) return;
        this.#cleanupActiveUI(this.#setCollectionUI);
        console.log("UI Coordinator: Delegating Set Collection rendering.");
        if (this.#setCollectionUI?.render) {
            // SetCollectionScreenUI constructor handles its setup, no separate init needed
            this.#setCollectionUI.render(args?.setCode || 'ELDRAEM');
            this.#activeScreenUI = this.#setCollectionUI;
        } else {
             console.error("UIManager Error: #setCollectionUI or its render method not found.");
        }
    }


    // --- Central Navigation Method ---
    async navigateTo(screenId, args = null) {
        console.log(`UIManager: Attempting navigation to '${screenId}' with args:`, args);

        const currentUser = this.#accountManager.getCurrentUser();

        // Access Control Logic (remains the same)
        const requiresLogin = [ 'home-screen', 'profile-screen', 'deck-management-screen','deck-builder-screen', 'connect-screen', 'battle-screen','set-mastery-screen', 'set-collection-screen','store-screen', 'booster-opening-screen' ];
        const restrictedWhenLoggedIn = ['login-screen', 'create-account-screen', 'title-screen'];

        if (!currentUser) {
            if (requiresLogin.includes(screenId) && screenId !== 'options-screen') {
                console.warn(`UIManager: Access Denied - Screen '${screenId}' requires login. Redirecting to title screen.`);
                this.#audioManager?.playSFX('genericError');
                if (this.#screenManager.getActiveScreenId() !== 'title-screen') {
                    await this.navigateTo('title-screen');
                }
                return;
            }
        } else {
            if (restrictedWhenLoggedIn.includes(screenId)) {
                console.warn(`UIManager: Access Denied - Logged-in user cannot access '${screenId}'. Staying or redirecting to home.`);
                this.#audioManager?.playSFX('genericError');
                const currentScreen = this.#screenManager.getActiveScreenId();
                if (!currentScreen || restrictedWhenLoggedIn.includes(currentScreen) || currentScreen === screenId) {
                    console.log("UIManager: Redirecting logged-in user to home screen from restricted area.");
                    await this.navigateTo('home-screen');
                }
                return;
            }
        }

        console.log(`UIManager: Access granted to '${screenId}'. Proceeding with navigation...`);

        let renderPromise = Promise.resolve(); // Default to resolved promise

        // Select the correct render function based on screenId
        switch (screenId) {
            case 'title-screen':            renderPromise = this.renderTitlescreen(args); break;
            case 'login-screen':            renderPromise = this.renderLoginScreen(args); break;
            case 'create-account-screen':   renderPromise = this.renderCreateAccountScreen(args); break;
            case 'home-screen':             renderPromise = this.renderHomeScreen(args); break;
            case 'profile-screen':          renderPromise = this.renderProfileScreen(args); break;
            case 'deck-management-screen':  renderPromise = this.renderDeckManagementScreen(args); break;
            case 'store-screen':            renderPromise = this.renderStoreScreen(args); break;
            case 'set-mastery-screen':      renderPromise = this.renderSetMasteryScreen(args); break;
            case 'deck-builder-screen':     renderPromise = this.renderDeckBuilderScreen(args?.deckIdToEdit); break;
            case 'booster-opening-screen':  renderPromise = this.renderBoosterOpeningScreen(args); break;
            case 'set-collection-screen':   renderPromise = this.renderSetCollectionScreen(args); break; // <-- ADDED case
            case 'options-screen':          renderPromise = this.renderOptionsScreen(args); break;
            case 'connect-screen':          renderPromise = this.renderConnectScreen(args); break; // Use render method
            case 'battle-screen':
                console.warn("UIManager: Use 'renderInitialGameState' for battle screen setup, not navigateTo.");
                // Don't proceed with normal navigation flow for battle screen
                return; // Exit navigateTo for battle-screen attempts
            default:
                console.error(`UIManager: Unknown screenId for navigation: ${screenId}`);
                renderPromise = Promise.reject(new Error(`Unknown screenId: ${screenId}`));
        }

        try {
            await renderPromise; // Wait for the specific screen's render/init logic

            // Final check before showing screen
            const finalCurrentUser = this.#accountManager.getCurrentUser();
            const finalIsStillAllowed = (finalCurrentUser && !restrictedWhenLoggedIn.includes(screenId)) ||
                                      (!finalCurrentUser && (!requiresLogin.includes(screenId) || screenId === 'options-screen'));

            if (finalIsStillAllowed) {
                console.log(`UIManager: Requesting ScreenManager to show '${screenId}'.`);
                this.#screenManager.showScreen(screenId);
                this.#audioManager?.playBGM(screenId);
                console.log(`UIManager: Navigation to '${screenId}' complete.`);
            } else {
                console.warn(`UIManager: Login state changed during render/await for '${screenId}'. Aborting final screen show.`);
                const fallbackScreen = finalCurrentUser ? 'home-screen' : 'title-screen';
                if (this.#screenManager.getActiveScreenId() !== fallbackScreen) {
                    await this.navigateTo(fallbackScreen);
                }
            }
        } catch (error) {
            console.error(`UIManager: Failed navigation process to '${screenId}':`, error);
            const fallbackCurrentUser = this.#accountManager.getCurrentUser();
            const fallbackScreen = fallbackCurrentUser ? 'home-screen' : 'title-screen';
            if (this.#screenManager.getActiveScreenId() !== fallbackScreen) {
                await this.navigateTo(fallbackScreen);
            }
        }
    } // End navigateTo

    // --- Save Options (Delegated) ---
    saveOptions() {
        console.warn("UIManager: saveOptions() called, but saving should be handled within OptionsUI now.");
        // OptionsUI._saveOptions handles saving and calls audioManager.updateSettings
    }

    // --- Update Currencies Display ---
    updateCurrenciesDisplay(gold, gems) {
        // Use jQuery selectors to update the text, provide default values
        $('#top-bar-gold').text(gold ?? 0);
        $('#top-bar-gems').text(gems ?? 0);
        // Also update store currency display if the store screen is active
        if (this.#screenManager.getActiveScreenId() === 'store-screen') {
             $('#store-gold-amount').text(gold ?? 0);
             $('#store-gems-amount').text(gems ?? 0);
        }
    }

    // --- Bind Permanent UI Actions (Top Bar, Global) ---
    _bindPermanentUIActions() {
        console.log("UI Coordinator: Binding permanent UI actions (Top Bar, global)...");
        const self = this;

        const addTopBarHoverAudio = ($element, sfxHover = 'buttonHover') => {
            $element.off('mouseenter.tbaudio').on('mouseenter.tbaudio', () => {
                self.#audioManager?.playSFX(sfxHover);
            });
        };

        // --- Top Bar Buttons ---
        // (Using navigateTo for screen changes)
        $('#top-bar-btn-home').off('click.uimanager').on('click.uimanager', () => {
            self.#audioManager?.playSFX('buttonClick');
            self.navigateTo('home-screen');
        }).each((i, btn) => addTopBarHoverAudio($(btn)));

        $('#top-bar-btn-profile').off('click.uimanager').on('click.uimanager', () => {
            self.#audioManager?.playSFX('buttonClick');
            self.navigateTo('profile-screen');
        }).each((i, btn) => addTopBarHoverAudio($(btn)));

        $('#top-bar-btn-decks').off('click.uimanager').on('click.uimanager', () => {
            self.#audioManager?.playSFX('buttonClick');
            self.navigateTo('deck-management-screen');
        }).each((i, btn) => addTopBarHoverAudio($(btn)));

        $('#top-bar-btn-connect').off('click.uimanager').on('click.uimanager', () => {
            self.#audioManager?.playSFX('buttonClick');
            self.navigateTo('connect-screen');
        }).each((i, btn) => addTopBarHoverAudio($(btn)));

        $('#top-bar-btn-store').off('click.uimanager').on('click.uimanager', () => {
            self.#audioManager?.playSFX('buttonClick');
            self.navigateTo('store-screen');
        }).each((i, btn) => addTopBarHoverAudio($(btn)));

        $('#top-bar-btn-options').off('click.uimanager').on('click.uimanager', () => {
            self.#audioManager?.playSFX('buttonClick');
            self.navigateTo('options-screen');
        }).each((i, btn) => addTopBarHoverAudio($(btn)));

        $('#top-bar-btn-logout').off('click.uimanager').on('click.uimanager', () => {
            console.log("Top Bar: Logout button clicked.");
            self.#audioManager?.playSFX('buttonClick');
            self.#audioManager?.stopBGM();
            self.#accountManager.logout();
            self.hideTopBar();
            $('#screens-container').removeClass('with-top-bar');
            self.navigateTo('title-screen'); // Go to title (allowed when logged out)
            console.log("UI Coordinator: Logged out, navigating to Title Screen.");
        }).each((i, btn) => addTopBarHoverAudio($(btn)));

        // --- Global ESC Listener ---
        $(document).off('keydown.uimclose').on('keydown.uimclose', (e) => {
            if (e.key === "Escape") {
                 // Primarily for closing zoom overlay, handled by ZoomHandler
                 // Could potentially close other modals/popups here later
            }
        });
        console.log("UI Coordinator: Permanent UI actions bound.");
    }

    // --- Getter for Card Database ---
    getCardDatabase() {
        return this.#cardDatabase;
    }

} // End class UIManager