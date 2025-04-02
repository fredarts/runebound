// js/ui/UIManager.js

// Importar os módulos de UI específicos e helpers
import ProfileScreenUI from './screens/ProfileScreenUI.js';
import DeckBuilderUI from './screens/DeckBuilderUI.js';
import BattleScreenUI from './screens/BattleScreenUI.js';
import OptionsUI from './screens/OptionsUI.js';
import HomeScreenUI from './screens/HomeScreenUI.js'; // <<<=== Importado
import CardRenderer from './helpers/CardRenderer.js';
import ZoomHandler from './helpers/ZoomHandler.js';

export default class UIManager {
    // --- Core References ---
    #screenManager;
    #accountManager;
    #cardDatabase;
    #gameInstance = null;
    #localPlayerId = null;

    // --- UI Module Instances ---
    #profileUI;
    #deckBuilderUI;
    #battleUI;
    #optionsUI;
    #homeUI; // <<<=== Adicionado
    #cardRenderer;
    #zoomHandler;

    constructor(screenManager, accountManager, cardDatabase) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;

        // Instanciar helpers primeiro se outros dependerem deles
        this.#cardRenderer = new CardRenderer();
        this.#zoomHandler = new ZoomHandler(this.#cardDatabase); // Passa dependência

        // --- Instanciar HomeScreenUI ---
        this.#homeUI = new HomeScreenUI(this.#screenManager, this); // <<<=== Instanciado

        // Instanciar outros módulos de UI específicos
        this.#optionsUI = new OptionsUI();
        this.#profileUI = new ProfileScreenUI(
            this.#screenManager,
            this.#accountManager,
            this.#cardDatabase,
            this.#cardRenderer,
            this.#zoomHandler,
            this // Passa o próprio UIManager se precisar chamar renderDeckBuilderScreen
        );
        this.#deckBuilderUI = new DeckBuilderUI(
            this.#screenManager,
            this.#accountManager,
            this.#cardDatabase,
            this.#cardRenderer,
            this.#zoomHandler
        );
        this.#battleUI = new BattleScreenUI(
             this.#screenManager,
             this.#accountManager, // Passa accountManager para BattleScreenUI
             this.#cardDatabase,
             this.#cardRenderer,
             this.#zoomHandler
         );

        this._bindPermanentUIActions(); // Bind global/top bar actions
        console.log("UIManager (Coordinator) inicializado.");
    }

    // --- Setup ---
    setGameInstance(gameInstance) {
        this.#gameInstance = gameInstance;
        console.log("UI Coordinator: Game instance set.");
        // Passar a instância para os módulos que precisam dela
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
            // TODO: Update top bar avatar if needed based on userData.avatar
            $topBar.addClass('active'); // Make it visible
            console.log("UIManager: Top Bar shown for", userData.username);
        } else {
            console.warn("UIManager: showTopBar called without user data.");
        }
    }
    hideTopBar() {
        $('#top-bar').removeClass('active');
        console.log("UIManager: Top Bar hidden.");
    }


    // --- Delegação de Renderização ---

    /** Renderiza a tela inicial (notícias). É async devido ao carregamento de dados. */
    async renderHomeScreen() { // <<<=== Adicionado método (async)
        console.log("UI Coordinator: Delegating home screen rendering.");
        await this.#homeUI.render(); // Chama o método render do módulo específico (usa await)
    }

    renderProfileScreen() {
        console.log("UI Coordinator: Delegating profile screen rendering.");
        this.#profileUI.render(); // Chama o método render do módulo específico
    }

    renderDeckBuilderScreen(deckIdToEdit = null) {
        console.log("UI Coordinator: Delegating deck builder rendering.");
        this.#deckBuilderUI.render(deckIdToEdit);
    }

    renderOptionsScreen() {
         console.log("UI Coordinator: Delegating options screen rendering.");
         this.#optionsUI.render();
    }

    renderInitialGameState() {
        console.log("UI Coordinator: Delegating initial game state rendering.");
         if (!this.#gameInstance || !this.#localPlayerId) {
             console.error("UI Coordinator: Cannot render game state - game/player not set.");
             return;
         }
        this.#battleUI.renderInitialState(); // BattleUI agora lida com isso
    }

    // --- Bindings Globais/Top Bar ---
    _bindPermanentUIActions() {
        console.log("UI Coordinator: Binding permanent UI actions (Top Bar, global)...");

        // --- Adicionar Binding para o botão Home ---
         $('#top-bar-btn-home').off('click').on('click', async () => { // <<<=== Adicionado (async)
            const currentScreen = this.#screenManager.getActiveScreenId();
            console.log(`Top Bar: Home button clicked. Current screen: ${currentScreen}`);
            if(currentScreen !== 'home-screen'){
                console.log("UI Coordinator: Navigating to Home Screen...");
                // Idealmente, mostrar um indicador de carregamento rápido aqui se o render demorar
                await this.renderHomeScreen(); // Delega renderização (usa await)
                this.#screenManager.showScreen('home-screen');
                console.log("UI Coordinator: Home Screen shown.");
            } else {
                 console.log("UI Coordinator: Already on Home Screen.");
            }
         });
         // --- Fim da adição ---

         $('#top-bar-btn-profile').off('click').on('click', () => {
            const currentScreen = this.#screenManager.getActiveScreenId();
            console.log(`Top Bar: Profile button clicked. Current screen: ${currentScreen}`);
            if(currentScreen !== 'profile-screen'){
                 console.log("UI Coordinator: Navigating to Profile Screen...");
                this.renderProfileScreen(); // Delega renderização
                this.#screenManager.showScreen('profile-screen');
                 console.log("UI Coordinator: Profile Screen shown.");
            } else {
                 console.log("UI Coordinator: Already on Profile Screen.");
            }
         });

         $('#top-bar-btn-connect').off('click').on('click', () => {
            const currentScreen = this.#screenManager.getActiveScreenId();
             console.log(`Top Bar: Connect button clicked. Current screen: ${currentScreen}`);
             if(currentScreen !== 'connect-screen') {
                 console.log("UI Coordinator: Navigating to Connect Screen...");
                 // Renderização da tela Connect é feita pelo template, mas resetamos estado
                 $('#connect-message').text('');
                 $('#server-status-section, #join-game-section').hide();
                 this.#screenManager.showScreen('connect-screen');
                  console.log("UI Coordinator: Connect Screen shown.");
             } else {
                  console.log("UI Coordinator: Already on Connect Screen.");
             }
         });

         $('#top-bar-btn-options').off('click').on('click', () => {
            const currentScreen = this.#screenManager.getActiveScreenId();
             console.log(`Top Bar: Options button clicked. Current screen: ${currentScreen}`);
             if(currentScreen !== 'options-screen') {
                 console.log("UI Coordinator: Navigating to Options Screen...");
                 this.renderOptionsScreen(); // Delega renderização
                 this.#screenManager.showScreen('options-screen');
                 console.log("UI Coordinator: Options Screen shown.");
             } else {
                 console.log("UI Coordinator: Already on Options Screen.");
             }
         });

         $('#top-bar-btn-logout').off('click').on('click', () => {
             console.log("Top Bar: Logout button clicked.");
             this.#accountManager.logout();
             this.hideTopBar();
             $('#screens-container').removeClass('with-top-bar');
             this.#screenManager.showScreen('title-screen'); // Sempre volta para a Title ao deslogar
              console.log("UI Coordinator: Logged out, showing Title Screen.");
         });

         // Listener global de ESC para fechar overlays
         $(document).off('keydown.uimclose').on('keydown.uimclose', (e) => {
             if (e.key === "Escape") {
                 // Fecha o zoom independentemente da tela ativa
                 this.#zoomHandler?.closeZoom();
                 // TODO: Adicionar lógica para fechar outros modais/popups se houver
                 // Ex: if ($('#modal-exemplo').is(':visible')) { /* fecha modal */ }
             }
         });
    }

} // End class UIManager (Coordinator)