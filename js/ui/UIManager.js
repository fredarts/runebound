// js/ui/UIManager.js - CORRIGIDO PARA FLUXO PÓS-SPLASH E LOGIN (v-lore-fix)

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
import LoreVideoScreenUI from './screens/LoreVideoScreenUI.js';
import InitialDeckChoiceScreenUI from './screens/InitialDeckChoiceScreenUI.js';

// Import Helpers
import CardRenderer from './helpers/CardRenderer.js';
import ZoomHandler from './helpers/ZoomHandler.js';

export default class UIManager {
    #screenManager;
    #accountManager;
    #cardDatabase;
    #audioManager;
    #gameInstance = null;
    #localPlayerId = null;

    #cardRenderer;
    #zoomHandler;

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
    #loreVideoUI;
    #initialDeckChoiceUI;

    #activeScreenUI = null;

    constructor(screenManager, accountManager, cardDatabase, audioManager) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;
        this.#audioManager = audioManager;

        this.#cardRenderer = new CardRenderer();
        this.#zoomHandler = new ZoomHandler(this.#cardDatabase);

        this.#titlescreenUI = new TitlescreenUi(this.#screenManager, this, this.#audioManager, this.#accountManager);
        this.#homeUI = new HomeScreenUI(this.#screenManager, this, this.#audioManager);
        this.#optionsUI = new OptionsUI(this.#audioManager);
        this.#profileUI = new ProfileScreenUI(this.#screenManager, this.#accountManager, this.#cardDatabase, this.#cardRenderer, this.#zoomHandler, this, this.#audioManager);
        this.#deckManagementUI = new DeckManagementScreenUI(this.#screenManager, this.#accountManager, this.#cardDatabase, this.#cardRenderer, this.#zoomHandler, this, this.#audioManager);
        this.#deckBuilderUI = new DeckBuilderUI(this.#screenManager, this.#accountManager, this.#cardDatabase, this.#cardRenderer, this.#zoomHandler, this, this.#audioManager);
        this.#battleUI = new BattleScreenUI(this.#screenManager, this.#accountManager, this.#cardDatabase, this.#cardRenderer, this.#zoomHandler, this.#audioManager, this);
        this.#setMasteryUI = new SetMasteryScreenUI(this.#screenManager, this.#accountManager, this, this.#audioManager);
        this.#setCollectionUI = new SetCollectionScreenUI(this.#screenManager, this.#accountManager, this.#cardDatabase, this.#zoomHandler, this, this.#audioManager);
        this.#storeUI = new StoreScreenUI(this.#screenManager, this.#accountManager, this.#audioManager, this);
        this.#boosterOpeningUI = new BoosterOpeningScreenUI(this.#screenManager, this.#accountManager, this.#audioManager, this, this.#cardRenderer);
        this.#loreVideoUI = new LoreVideoScreenUI(this, this.#audioManager);
        this.#initialDeckChoiceUI = new InitialDeckChoiceScreenUI(this, this.#accountManager, this.#audioManager, this.#cardDatabase);

        this._bindPermanentUIActions();
        console.log("UIManager (Coordinator) initialized (v-lore-fix).");
    }

    setGameInstance(gameInstance) {
        this.#gameInstance = gameInstance;
        this.#battleUI.setGameInstance(gameInstance);
    }
    setLocalPlayer(playerId) {
        this.#localPlayerId = playerId;
        this.#battleUI.setLocalPlayer(playerId);
    }

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
            this.updateCurrenciesDisplay(userData.wallet?.gold, userData.wallet?.gems);
            $topBar.addClass('active');
        } else {
            console.warn("UIManager: showTopBar called without user data. Hiding top bar.");
            $topBar.removeClass('active');
        }
    }

    hideTopBar() {
        $('#top-bar').removeClass('active simplified-mode battle-only');
    }

    #cleanupActiveUI(newUiInstance = null) {
        if (this.#activeScreenUI && this.#activeScreenUI !== newUiInstance) {
            if (typeof this.#activeScreenUI.destroy === 'function') {
                try { this.#activeScreenUI.destroy(); }
                catch (error) { console.error(`UIManager: Error destroying ${this.#activeScreenUI.constructor.name}`, error); }
            }
        }
        this.#activeScreenUI = null;
    }

    async renderTitlescreen(args) {
        const screenId = 'title-screen';
        const $screenElement = $(`#${screenId}`);
        if ($screenElement.length === 0) { console.error(`UIManager: Elemento #${screenId} não encontrado.`); return; }
        this.#cleanupActiveUI(this.#titlescreenUI);
        if (this.#titlescreenUI?.init) {
            try {
                this.#titlescreenUI.init($screenElement[0], this.#accountManager);
                this.#activeScreenUI = this.#titlescreenUI;
            } catch(error) { console.error("UIManager: Erro ao inicializar TitlescreenUI", error); }
        }
    }

    async renderHomeScreen(args) {
        this.#cleanupActiveUI(this.#homeUI);
        if(this.#homeUI) {
            try {
                await this.#homeUI.render();
                this.#activeScreenUI = this.#homeUI;
            } catch (error) { console.error("UIManager: Erro ao renderizar HomeScreenUI", error); }
        }
    }

    renderProfileScreen(args) {
        this.#cleanupActiveUI(this.#profileUI);
        if (this.#profileUI?.render) {
            try {
                this.#profileUI.render();
                this.#activeScreenUI = this.#profileUI;
            } catch(error) { console.error("UIManager: Erro ao renderizar ProfileScreenUI", error); }
        }
    }

    async renderSetMasteryScreen(args) {
        this.#cleanupActiveUI(this.#setMasteryUI);
        if (this.#setMasteryUI) {
             if (typeof this.#setMasteryUI.init === 'function') await this.#setMasteryUI.init();
             this.#setMasteryUI.render(args?.setCode || 'ELDRAEM');
             this.#activeScreenUI = this.#setMasteryUI;
        }
    }

    async renderLoreVideoScreen(args) {
        const screenId = 'lore-video-screen';
        const $screenElement = $(`#${screenId}`);
        if ($screenElement.length === 0) { console.error(`UIManager: Elemento #${screenId} não encontrado.`); return; }
        this.#cleanupActiveUI(this.#loreVideoUI);
        if (this.#loreVideoUI?.init) {
            try {
                this.#loreVideoUI.init($screenElement[0]);
                this.#activeScreenUI = this.#loreVideoUI;
            } catch(error) { console.error("UIManager: Erro ao inicializar LoreVideoScreenUI", error); }
        }
    }

    renderDeckManagementScreen(args) {
        this.#cleanupActiveUI(this.#deckManagementUI);
        if (this.#deckManagementUI?.render) {
            try {
                this.#deckManagementUI.render();
                this.#activeScreenUI = this.#deckManagementUI;
            } catch(error) { console.error("UIManager: Erro ao renderizar DeckManagementScreenUI", error); }
        }
    }

    renderDeckBuilderScreen(deckIdToEdit = null) {
        this.#cleanupActiveUI(this.#deckBuilderUI);
        if (this.#deckBuilderUI?.render) {
            try {
                this.#deckBuilderUI.render(deckIdToEdit);
                this.#activeScreenUI = this.#deckBuilderUI;
            } catch(error) { console.error("UIManager: Erro ao renderizar DeckBuilderUI", error); }
        }
    }

    renderOptionsScreen(args) {
       this.#cleanupActiveUI(this.#optionsUI);
        if (this.#optionsUI?.render) {
            try {
                this.#optionsUI.render();
                this.#activeScreenUI = this.#optionsUI;
            } catch(error) { console.error("UIManager: Erro ao renderizar OptionsUI", error); }
        }
    }

    async renderStoreScreen(args) {
         this.#cleanupActiveUI(this.#storeUI);
         if (this.#storeUI) {
              if (typeof this.#storeUI.init === 'function') await this.#storeUI.init();
              this.#storeUI.render();
              this.#activeScreenUI = this.#storeUI;
         }
    }

    renderInitialGameState() {
        this.#cleanupActiveUI(this.#battleUI);
        if (!this.#gameInstance || !this.#localPlayerId) {
           console.error("UI Coordinator: Cannot render game state - game/player not set.");
           this.navigateTo('home-screen');
           return;
        }
        if (this.#battleUI?.renderInitialState) {
            try {
                this.#battleUI.renderInitialState();
                this.#activeScreenUI = this.#battleUI;
                console.log("UIManager: Requesting ScreenManager to show 'battle-screen' after initial game state render.");
                this.#screenManager.showScreen('battle-screen');
                this.#audioManager?.playBGM('battle-screen');
            } catch(error) {
                console.error("UIManager: Erro ao renderizar BattleScreenUI initial state", error);
                this.navigateTo('home-screen');
            }
        } else {
            console.error("UIManager: BattleScreenUI ou seu método renderInitialState não encontrado.");
            this.navigateTo('home-screen');
        }
    }

    async renderLoginScreen(args) {
        this.#cleanupActiveUI();
        $('#login-form')[0]?.reset();
        $('#login-message').text('');
    }
    async renderCreateAccountScreen(args) {
        this.#cleanupActiveUI();
        $('#create-account-form')[0]?.reset();
        $('#create-account-message').text('');
    }
    async renderConnectScreen(args) {
        this.#cleanupActiveUI();
        $('#connect-message').text('');
        $('#server-status-section, #join-game-section').hide();
        $('#opponent-ip').val('');
    }

    async renderBoosterOpeningScreen(argsObject) {
        const screenId = 'booster-opening-screen';
        const $el = $(`#${screenId}`);
        if ($el.length === 0) return;
        this.#cleanupActiveUI(this.#boosterOpeningUI);

        if (!this.#boosterOpeningUI || typeof this.#boosterOpeningUI.init !== 'function') {
             console.error("UIManager Error: #boosterOpeningUI instance or init method is missing."); return;
        }
        const initSuccess = await this.#boosterOpeningUI.init();
        if (!initSuccess) { console.error("UIManager: BoosterOpeningUI failed to initialize."); return; }

        if (typeof this.#boosterOpeningUI.render === 'function') {
            this.#boosterOpeningUI.render(argsObject);
            this.#activeScreenUI = this.#boosterOpeningUI;
        } else { console.error("UIManager Error: BoosterOpeningUI is missing render method."); }
    }

     async renderSetCollectionScreen(args) {
        this.#cleanupActiveUI(this.#setCollectionUI);
        if (this.#setCollectionUI?.render) {
            this.#setCollectionUI.render(args?.setCode || 'ELDRAEM');
            this.#activeScreenUI = this.#setCollectionUI;
        } else {
             console.error("UIManager Error: #setCollectionUI or its render method not found.");
        }
    }

    async renderInitialDeckChoiceScreen(args) {
        const screenId = 'initial-deck-choice-screen';
        const $screenElement = $(`#${screenId}`);
        if ($screenElement.length === 0) { console.error(`UIManager: Elemento #${screenId} não encontrado.`); return; }
        this.#cleanupActiveUI(this.#initialDeckChoiceUI);
        if (this.#initialDeckChoiceUI?.init) {
            try {
                this.#initialDeckChoiceUI.init($screenElement[0]);
                this.#activeScreenUI = this.#initialDeckChoiceUI;
            } catch(error) { console.error("UIManager: Erro ao inicializar InitialDeckChoiceScreenUI", error); }
        }
    }

    async navigateTo(screenId, args = null) {
        console.log(`UIManager: Attempting navigation to '${screenId}' with args:`, args);
        const $topBar = $('#top-bar');
        const $screensContainer = $('#screens-container');
        const currentUser = this.#accountManager.getCurrentUser();

        const screensWithoutTopBar = [
            'splash-screen', 'title-screen', 'login-screen',
            'create-account-screen',
            'lore-video-screen', // Assegura que a TopBar não aparece aqui
            'initial-deck-choice-screen'
        ];
        const requiresLogin = [
            'home-screen', 'profile-screen', 'deck-management-screen', 'deck-builder-screen',
            'connect-screen', 'battle-screen', 'set-mastery-screen', 'set-collection-screen',
            'store-screen', 'booster-opening-screen'
            // 'lore-video-screen' e 'initial-deck-choice-screen' são parte do fluxo pós-login.
        ];
        const restrictedWhenLoggedIn = ['login-screen', 'create-account-screen'];

        // --- GERENCIAMENTO DA TOP BAR E LAYOUT DO CONTAINER ---
        if (screensWithoutTopBar.includes(screenId)) {
            this.hideTopBar();
            $screensContainer.removeClass('with-top-bar');
        } else if (currentUser) {
            this.showTopBar(currentUser);
            $screensContainer.addClass('with-top-bar');
            if (screenId === 'battle-screen') {
                $topBar.addClass('battle-only').removeClass('simplified-mode');
            } else {
                $topBar.removeClass('simplified-mode battle-only');
            }
        } else {
            this.hideTopBar();
            $screensContainer.removeClass('with-top-bar');
        }
        // --- FIM DO GERENCIAMENTO DA TOP BAR ---

        // --- VALIDAÇÃO DE ACESSO ---
        if (!currentUser) { // Usuário NÃO está logado
            if (requiresLogin.includes(screenId)) {
                console.warn(`UIManager: Access Denied (not logged in) - Screen '${screenId}'. Redirecting to title.`);
                this.#audioManager?.playSFX('genericError');
                if (this.#screenManager.getActiveScreenId() !== 'title-screen' && screenId !== 'title-screen') {
                    await this.navigateTo('title-screen');
                }
                return;
            }
        } else { // Usuário ESTÁ logado
            // Se logado e tentando ir para login/create (que são restrictedWhenLoggedIn)...
            if (restrictedWhenLoggedIn.includes(screenId)) {
                console.warn(`UIManager: Access Denied (already logged in) - Screen '${screenId}'. Redirecting based on setup state.`);
                this.#audioManager?.playSFX('genericError');
                // Se está logado, não deve ver login/create. Redireciona com base no setup.
                const nextScreen = currentUser.initialSetupComplete === false ? 'lore-video-screen' : 'home-screen';
                if (this.#screenManager.getActiveScreenId() !== nextScreen) {
                    await this.navigateTo(nextScreen);
                }
                return;
            }

            // Se logado e setup INCOMPLETO...
            if (currentUser.initialSetupComplete === false) {
                // E o destino NÃO É uma das telas permitidas durante o setup incompleto...
                const allowedDuringIncompleteSetup = [
                    'lore-video-screen',
                    'initial-deck-choice-screen',
                    'options-screen', // Permitir acesso às opções
                    'title-screen',   // Permitir voltar para o título (ex: para logout)
                    'login-screen',   // Permitir ir para tela de login (embora já logado, o usuário pode ter chegado aqui de forma estranha)
                    'create-account-screen' // Similar ao login
                ];

                if (!allowedDuringIncompleteSetup.includes(screenId)) {
                    console.warn(`UIManager: User ${currentUser.username} has not completed initial setup. Target: ${screenId}. Redirecting to lore video.`);
                    // Evita loop se já estiver tentando ir para 'lore-video-screen'
                    if (this.#screenManager.getActiveScreenId() !== 'lore-video-screen' && screenId !== 'lore-video-screen') {
                        await this.navigateTo('lore-video-screen');
                    }
                    return;
                }
            }
        }
        // --- FIM DA VALIDAÇÃO DE ACESSO ---

        console.log(`UIManager: Access granted to '${screenId}'. Proceeding with render/show...`);
        let renderPromise = Promise.resolve();

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
            case 'set-collection-screen':   renderPromise = this.renderSetCollectionScreen(args); break;
            case 'options-screen':          renderPromise = this.renderOptionsScreen(args); break;
            case 'lore-video-screen':       renderPromise = this.renderLoreVideoScreen(args); break;
            case 'initial-deck-choice-screen': renderPromise = this.renderInitialDeckChoiceScreen(args); break;
            case 'connect-screen':          renderPromise = this.renderConnectScreen(args); break;
            case 'battle-screen':
                console.warn("UIManager: 'battle-screen' should be shown via renderInitialGameState(), not navigateTo() directly from external calls.");
                return;
            default:
                console.error(`UIManager: Unknown screenId for render mapping: ${screenId}`);
                renderPromise = Promise.reject(new Error(`Unknown screenId: ${screenId}`));
        }

        try {
            await renderPromise;

            // Revalidação final antes de mostrar a tela.
            const finalCurrentUser = this.#accountManager.getCurrentUser();
            let finalIsStillAllowed = false;

            const alwaysAllowedScreens = [ // Telas que podem ser acessadas logado ou não, e independente do setup
                'splash-screen', 'title-screen', 'login-screen', 'create-account-screen', 'options-screen'
            ];
            const setupFlowScreens = ['lore-video-screen', 'initial-deck-choice-screen'];

            if (alwaysAllowedScreens.includes(screenId)) {
                finalIsStillAllowed = true;
            } else if (!finalCurrentUser) { // Usuário deslogou durante o render
                // Se a tela requer login ou é parte do fluxo de setup, não é permitida
                finalIsStillAllowed = !requiresLogin.includes(screenId) && !setupFlowScreens.includes(screenId);
            } else { // Usuário ainda logado
                if (restrictedWhenLoggedIn.includes(screenId)) { // Tentando ir para login/create estando logado
                    finalIsStillAllowed = false; // Não deveria acontecer devido à validação anterior, mas é uma segurança
                } else if (finalCurrentUser.initialSetupComplete === false) { // Setup incompleto
                    // Permite telas de setup ou options, caso contrário não
                    finalIsStillAllowed = setupFlowScreens.includes(screenId) || screenId === 'options-screen';
                } else { // Setup completo
                    finalIsStillAllowed = true; // Permite qualquer outra tela que não seja 'restrictedWhenLoggedIn'
                }
            }

            if (finalIsStillAllowed) {
                this.#screenManager.showScreen(screenId);
                this.#audioManager?.playBGM(screenId);
                console.log(`UIManager: Navigation to '${screenId}' complete.`);
            } else {
                console.warn(`UIManager: Access to '${screenId}' became invalid post-render or during re-check. User: ${finalCurrentUser?.username}, SetupComplete: ${finalCurrentUser?.initialSetupComplete}. Redirecting.`);
                const fallbackScreen = finalCurrentUser ? (finalCurrentUser.initialSetupComplete ? 'home-screen' : 'lore-video-screen') : 'title-screen';
                if (this.#screenManager.getActiveScreenId() !== fallbackScreen && screenId !== fallbackScreen) {
                    await this.navigateTo(fallbackScreen);
                }
            }
        } catch (error) {
            console.error(`UIManager: Error during render/navigation to '${screenId}':`, error);
            const fallbackCurrentUser = this.#accountManager.getCurrentUser();
            const fallbackScreenOnError = fallbackCurrentUser ? (fallbackCurrentUser.initialSetupComplete ? 'home-screen' : 'lore-video-screen') : 'title-screen';
            if (this.#screenManager.getActiveScreenId() !== fallbackScreenOnError && screenId !== fallbackScreenOnError) {
                 await this.navigateTo(fallbackScreenOnError);
            }
        }
    }

    updateCurrenciesDisplay(gold, gems) {
        $('#top-bar-gold').text(gold ?? 0);
        $('#top-bar-gems').text(gems ?? 0);
        if (this.#screenManager.getActiveScreenId() === 'store-screen') {
             $('#store-gold-amount').text(gold ?? 0);
             $('#store-gems-amount').text(gems ?? 0);
        }
         if (this.#screenManager.getActiveScreenId() === 'profile-screen') {
             $('#gold-amount').text(gold ?? 0);
             $('#gems-amount').text(gems ?? 0);
         }
    }

    _bindPermanentUIActions() {
        const self = this;
        const namespace = '.uimanagerglobal';

        const addTopBarHoverAudio = ($element, sfxHover = 'buttonHover') => {
            $element.off(`mouseenter${namespace}`).on(`mouseenter${namespace}`, () => {
                self.#audioManager?.playSFX(sfxHover);
            });
        };

        $('#top-bar-btn-home').off(`click${namespace}`).on(`click${namespace}`, () => {
            self.#audioManager?.playSFX('buttonClick');
            self.navigateTo('home-screen');
        }).each((i, btn) => addTopBarHoverAudio($(btn)));

        $('#top-bar-btn-profile').off(`click${namespace}`).on(`click${namespace}`, () => {
            self.#audioManager?.playSFX('buttonClick');
            self.navigateTo('profile-screen');
        }).each((i, btn) => addTopBarHoverAudio($(btn)));

        $('#top-bar-btn-decks').off(`click${namespace}`).on(`click${namespace}`, () => {
            self.#audioManager?.playSFX('buttonClick');
            self.navigateTo('deck-management-screen');
        }).each((i, btn) => addTopBarHoverAudio($(btn)));

        $('#top-bar-btn-connect').off(`click${namespace}`).on(`click${namespace}`, () => {
            self.#audioManager?.playSFX('buttonClick');
            self.navigateTo('connect-screen');
        }).each((i, btn) => addTopBarHoverAudio($(btn)));

        $('#top-bar-btn-store').off(`click${namespace}`).on(`click${namespace}`, () => {
            self.#audioManager?.playSFX('buttonClick');
            self.navigateTo('store-screen');
        }).each((i, btn) => addTopBarHoverAudio($(btn)));

        $('#top-bar-btn-options').off(`click${namespace}`).on(`click${namespace}`, () => {
            self.#audioManager?.playSFX('buttonClick');
            self.navigateTo('options-screen');
        }).each((i, btn) => addTopBarHoverAudio($(btn)));

        $('#top-bar-btn-logout').off(`click${namespace}`).on(`click${namespace}`, () => {
            self.#audioManager?.playSFX('buttonClick');
            self.#audioManager?.stopBGM();
            self.#accountManager.logout();
            self.navigateTo('title-screen');
        }).each((i, btn) => addTopBarHoverAudio($(btn)));

        $(document).off(`keydown${namespace}`).on(`keydown${namespace}`, (e) => {
            if (e.key === "Escape") {
                // O ZoomHandler lida com o fechamento do zoom
            }
        });
    }

    getCardDatabase() {
        return this.#cardDatabase;
    }

    getAccountManager() {
        return this.#accountManager;
    }
}