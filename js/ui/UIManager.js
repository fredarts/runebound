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
import LoreVideoScreenUI from './screens/LoreVideoScreenUI.js';
import InitialDeckChoiceScreenUI from './screens/InitialDeckChoiceScreenUI.js';

// Import Helpers
import CardRenderer from './helpers/CardRenderer.js';
import ZoomHandler from './helpers/ZoomHandler.js';

// AudioManager is injected

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

        this.#titlescreenUI = new TitlescreenUi(this.#screenManager, this, this.#audioManager);
        this.#homeUI = new HomeScreenUI(this.#screenManager, this, this.#audioManager);
        this.#optionsUI = new OptionsUI(this.#audioManager);
        this.#profileUI = new ProfileScreenUI(this.#screenManager, this.#accountManager, this.#cardDatabase, this.#cardRenderer, this.#zoomHandler, this, this.#audioManager);
        this.#deckManagementUI = new DeckManagementScreenUI(this.#screenManager, this.#accountManager, this.#cardDatabase, this.#cardRenderer, this.#zoomHandler, this, this.#audioManager);
        this.#deckBuilderUI = new DeckBuilderUI(this.#screenManager, this.#accountManager, this.#cardDatabase, this.#cardRenderer, this.#zoomHandler, this, this.#audioManager); // Passando UIManager e AudioManager
        this.#battleUI = new BattleScreenUI(this.#screenManager, this.#accountManager, this.#cardDatabase, this.#cardRenderer, this.#zoomHandler, this.#audioManager, this);
        this.#setMasteryUI = new SetMasteryScreenUI(this.#screenManager, this.#accountManager, this, this.#audioManager);
        this.#setCollectionUI = new SetCollectionScreenUI(this.#screenManager, this.#accountManager, this.#cardDatabase, this.#zoomHandler, this, this.#audioManager); // Passando UIManager e AudioManager
        this.#storeUI = new StoreScreenUI(this.#screenManager, this.#accountManager, this.#audioManager, this);
        this.#boosterOpeningUI = new BoosterOpeningScreenUI(this.#screenManager, this.#accountManager, this.#audioManager, this, this.#cardRenderer);
        this.#loreVideoUI = new LoreVideoScreenUI(this, this.#audioManager);
        this.#initialDeckChoiceUI = new InitialDeckChoiceScreenUI(this, this.#accountManager, this.#audioManager, this.#cardDatabase);

        this._bindPermanentUIActions();
        console.log("UIManager (Coordinator) initialized.");
    }

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
            $topBar.addClass('active'); // Mostra a top bar
             // Atualiza as moedas aqui também
            this.updateCurrenciesDisplay(userData.wallet?.gold, userData.wallet?.gems);
            console.log("UIManager: Top Bar shown for", userData.username);
        } else {
            console.warn("UIManager: showTopBar called without user data.");
            $topBar.removeClass('active'); // Esconde se não houver dados
        }
    }
    hideTopBar() {
        $('#top-bar').removeClass('active');
        console.log("UIManager: Top Bar hidden.");
    }

    #cleanupActiveUI(newUiInstance = null) {
        if (this.#activeScreenUI && this.#activeScreenUI !== newUiInstance) {
            if (typeof this.#activeScreenUI.destroy === 'function') {
                console.log(`UIManager: Destroying previous UI: ${this.#activeScreenUI.constructor.name}`);
                try { this.#activeScreenUI.destroy(); }
                catch (error) { console.error(`UIManager: Error destroying ${this.#activeScreenUI.constructor.name}`, error); }
            } else {
                // console.log(`UIManager: Previous UI ${this.#activeScreenUI.constructor.name} has no destroy method.`);
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
                this.#titlescreenUI.init($screenElement[0]);
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
            } catch(error) { console.error("UIManager: Erro ao renderizar BattleScreenUI initial state", error); }
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

        const currentUser = this.#accountManager.getCurrentUser();
        const requiresLogin = [
            'home-screen', 'profile-screen', 'deck-management-screen', 'deck-builder-screen',
            'connect-screen', 'battle-screen', 'set-mastery-screen', 'set-collection-screen',
            'store-screen', 'booster-opening-screen'
            // 'options-screen' é acessível mesmo deslogado, se o usuário chegar lá (ex: da tela de título)
            // 'lore-video-screen' e 'initial-deck-choice-screen' são parte do fluxo de login/setup, não requerem login *prévio* estrito
        ];
        const restrictedWhenLoggedIn = ['login-screen', 'create-account-screen', 'title-screen'];

        if (!currentUser) {
            if (requiresLogin.includes(screenId) && screenId !== 'options-screen' && screenId !== 'lore-video-screen' && screenId !== 'initial-deck-choice-screen') {
                console.warn(`UIManager: Access Denied - Screen '${screenId}' requires login. Redirecting to title screen.`);
                this.#audioManager?.playSFX('genericError');
                if (this.#screenManager.getActiveScreenId() !== 'title-screen') {
                    await this.navigateTo('title-screen'); // Chama recursivamente, mas para uma tela permitida
                }
                return;
            }
        } else { // Usuário está logado
            if (restrictedWhenLoggedIn.includes(screenId)) {
                console.warn(`UIManager: Access Denied - Logged-in user cannot access '${screenId}'. Staying or redirecting to home.`);
                this.#audioManager?.playSFX('genericError');
                const currentActiveScreen = this.#screenManager.getActiveScreenId();
                if (!currentActiveScreen || restrictedWhenLoggedIn.includes(currentActiveScreen) || currentActiveScreen === screenId) {
                    console.log("UIManager: Redirecting logged-in user to home screen from restricted area.");
                    await this.navigateTo('home-screen'); // Chama recursivamente
                }
                return;
            }
        }

        console.log(`UIManager: Access granted to '${screenId}'. Proceeding with navigation...`);

        // --- LÓGICA DE CLASSE DA TOP BAR ---
        if (screenId === 'initial-deck-choice-screen' || screenId === 'lore-video-screen') {
            $topBar.addClass('simplified-mode').removeClass('battle-only');
        } else if (screenId === 'battle-screen') {
            $topBar.addClass('battle-only').removeClass('simplified-mode');
        } else {
            $topBar.removeClass('simplified-mode battle-only');
        }
        // --- FIM DA LÓGICA DE CLASSE DA TOP BAR ---

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
                console.warn("UIManager: Use 'renderInitialGameState' for battle screen setup, not navigateTo.");
                return;
            default:
                console.error(`UIManager: Unknown screenId for navigation: ${screenId}`);
                renderPromise = Promise.reject(new Error(`Unknown screenId: ${screenId}`));
        }

        try {
            await renderPromise;

            const finalCurrentUser = this.#accountManager.getCurrentUser();
            let finalIsStillAllowed = false;
            if (!finalCurrentUser) { // Se deslogado
                 finalIsStillAllowed = !requiresLogin.includes(screenId) || screenId === 'options-screen' || screenId === 'lore-video-screen' || screenId === 'initial-deck-choice-screen';
            } else { // Se logado
                 finalIsStillAllowed = !restrictedWhenLoggedIn.includes(screenId);
            }


            if (finalIsStillAllowed) {
                console.log(`UIManager: Requesting ScreenManager to show '${screenId}'.`);
                this.#screenManager.showScreen(screenId);
                // BGM deve ser tocado aqui para garantir que só toque para a tela final
                this.#audioManager?.playBGM(screenId);
                console.log(`UIManager: Navigation to '${screenId}' complete.`);
            } else {
                console.warn(`UIManager: Login state changed or access rule violation during render/await for '${screenId}'. Aborting final screen show.`);
                const fallbackScreen = finalCurrentUser ? 'home-screen' : 'title-screen';
                if (this.#screenManager.getActiveScreenId() !== fallbackScreen) {
                    // Não chama navigateTo diretamente aqui para evitar loop infinito se o fallback também falhar.
                    // Apenas mostra a tela de fallback diretamente.
                    this.#screenManager.showScreen(fallbackScreen);
                    this.#audioManager?.playBGM(fallbackScreen);
                }
            }
        } catch (error) {
            console.error(`UIManager: Failed navigation process to '${screenId}':`, error);
            const fallbackCurrentUser = this.#accountManager.getCurrentUser();
            const fallbackScreen = fallbackCurrentUser ? 'home-screen' : 'title-screen';
            if (this.#screenManager.getActiveScreenId() !== fallbackScreen) {
                 this.#screenManager.showScreen(fallbackScreen); // Mostrar diretamente
                 this.#audioManager?.playBGM(fallbackScreen);
            }
        }
    }

    saveOptions() {
        // OptionsUI agora lida com o salvamento e chama audioManager.updateSettings()
        // UIManager não precisa mais de um método saveOptions.
        console.warn("UIManager.saveOptions() é obsoleto. OptionsUI lida com isso.");
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
        console.log("UI Coordinator: Binding permanent UI actions (Top Bar, global)...");
        const self = this;
        const namespace = '.uimanagerglobal'; // Namespace para listeners globais da UIManager

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
            self.hideTopBar();
            $('#screens-container').removeClass('with-top-bar'); // Remove classe que ajusta margin-top
            $('#top-bar').removeClass('simplified-mode battle-only'); // Garante que top bar volte ao normal
            self.navigateTo('title-screen');
        }).each((i, btn) => addTopBarHoverAudio($(btn)));

        $(document).off(`keydown${namespace}`).on(`keydown${namespace}`, (e) => {
            if (e.key === "Escape") {
                 // O ZoomHandler já lida com o fechamento do zoom em ESC.
                 // Se outras modais/popups forem adicionadas, podem ser tratadas aqui.
            }
        });
        console.log("UI Coordinator: Permanent UI actions bound.");
    }

    getCardDatabase() {
        return this.#cardDatabase;
    }
}