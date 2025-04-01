// js/ui/UIManager.js - Refatorado (Esqueleto)

// Importar os novos módulos
import ProfileScreenUI from './screens/ProfileScreenUI.js'; // CORRIGIDO
import DeckBuilderUI from './screens/DeckBuilderUI.js';   // CORRIGIDO
import BattleScreenUI from './screens/BattleScreenUI.js'; // CORRIGIDO
import OptionsUI from './screens/OptionsUI.js';         // CORRIGIDO
import CardRenderer from './helpers/CardRenderer.js'; // OK
import ZoomHandler from './helpers/ZoomHandler.js';   // OK

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
    #cardRenderer;
    #zoomHandler;

    constructor(screenManager, accountManager, cardDatabase) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;

        // Instanciar helpers primeiro se outros dependerem deles
        this.#cardRenderer = new CardRenderer();
        this.#zoomHandler = new ZoomHandler(this.#cardDatabase); // Passa dependência

        // Instanciar módulos de UI específicos, injetando dependências
        // (Certifique-se de que as classes que você está instanciando
        // são as importadas corretamente acima)
        this.#optionsUI = new OptionsUI(); // Pode não precisar de nada
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
             this.#accountManager, // <--- Adicionei accountManager aqui, pois BattleScreenUI o usa
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

    // --- Top Bar Control --- (Pode permanecer aqui)
    showTopBar(userData) {
        const $topBar = $('#top-bar');
        if (userData) {
            $topBar.find('#top-bar-username').text(userData.username);
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
    renderProfileScreen() {
        console.log("UI Coordinator: Delegating profile screen rendering.");
        this.#profileUI.render(); // Chama o método render do módulo específico
        // ProfileUI.bindEvents() deve ser chamado dentro do seu próprio render ou construtor
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
        // Os bindings de jogo e UI são feitos dentro do BattleScreenUI
    }

    // --- Bindings Globais/Top Bar ---
    _bindPermanentUIActions() {
        // Vincula apenas ações que são realmente globais ou da Top Bar
        // Exemplo: Botões da Top Bar que NAVEGAM entre telas principais
         $('#top-bar-btn-profile').off('click').on('click', () => {
            if(this.#screenManager.getActiveScreenId() !== 'profile-screen'){
                this.renderProfileScreen(); // Delega renderização
                this.#screenManager.showScreen('profile-screen');
            }
         });
         $('#top-bar-btn-connect').off('click').on('click', () => {
              // Renderização da tela Connect é feita pelo template
              $('#connect-message').text(''); // Resetar estado se necessário
              this.#screenManager.showScreen('connect-screen');
         });
         $('#top-bar-btn-options').off('click').on('click', () => {
              this.renderOptionsScreen(); // Delega renderização
              this.#screenManager.showScreen('options-screen');
         });
         $('#top-bar-btn-logout').off('click').on('click', () => {
             this.#accountManager.logout();
             this.hideTopBar();
             $('#screens-container').removeClass('with-top-bar');
             this.#screenManager.showScreen('title-screen');
         });

         // Talvez o listener global de ESC para fechar overlays fique aqui
         $(document).off('keydown.uimclose').on('keydown.uimclose', (e) => {
             if (e.key === "Escape") {
                 this.#zoomHandler?.closeZoom(); // Delega ao zoom handler
                 // Fechar outros modais/popups se houver
             }
         });
    }

    // Métodos específicos de cada tela foram MOVIDOS para seus respectivos módulos

} // End class UIManager (Coordinator)