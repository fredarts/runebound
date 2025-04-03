// js/ui/UIManager.js - ATUALIZADO

// Importar os módulos de UI específicos e helpers
import ProfileScreenUI from './screens/ProfileScreenUI.js';       // Tela de Perfil (Simplificada)
import DeckBuilderUI from './screens/DeckBuilderUI.js';         // Construtor de Decks
import BattleScreenUI from './screens/BattleScreenUI.js';        // Tela de Batalha
import OptionsUI from './screens/OptionsUI.js';             // Tela de Opções
import HomeScreenUI from './screens/HomeScreenUI.js';          // Tela Inicial (Notícias)
import DeckManagementScreenUI from './screens/DeckManagementScreenUI.js'; // <<<=== Importado (Nova Tela)
import CardRenderer from './helpers/CardRenderer.js';       // Helper para renderizar cartas
import ZoomHandler from './helpers/ZoomHandler.js';        // Helper para zoom de cartas

export default class UIManager {
    // --- Core References ---
    #screenManager;
    #accountManager;
    #cardDatabase;
    #gameInstance = null; // Instância do jogo atual (se houver)
    #localPlayerId = null; // ID do jogador local na partida atual

    // --- UI Module Instances ---
    #profileUI;
    #deckBuilderUI;
    #battleUI;
    #optionsUI;
    #homeUI;
    #deckManagementUI; // <<<=== Adicionado: Instância da UI de Gerenciamento de Decks
    #cardRenderer;
    #zoomHandler;

    constructor(screenManager, accountManager, cardDatabase) {
        // Armazena as dependências principais
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;

        // Instancia helpers que podem ser usados por outras UIs
        this.#cardRenderer = new CardRenderer();
        this.#zoomHandler = new ZoomHandler(this.#cardDatabase); // Passa a base de dados para o zoom

        // --- Instancia os módulos de UI específicos ---
        // Cada módulo recebe as dependências de que precisa

        this.#homeUI = new HomeScreenUI(this.#screenManager, this); // 'this' passa o próprio UIManager

        this.#optionsUI = new OptionsUI(); // OptionsUI gerencia suas próprias dependências internas ou localStorage

        // ProfileUI agora é simplificado (sem decks/coleção)
        this.#profileUI = new ProfileScreenUI(
            this.#screenManager, this.#accountManager, this.#cardDatabase,
            this.#cardRenderer, this.#zoomHandler, this // Passa refs e UIManager
        );

        // --- Instancia a nova DeckManagementScreenUI --- <<<=== Adicionado
        this.#deckManagementUI = new DeckManagementScreenUI(
            this.#screenManager, this.#accountManager, this.#cardDatabase,
            this.#cardRenderer, this.#zoomHandler, this // Passa refs e UIManager
        );
        // ----------------------------------------------

        // DeckBuilderUI permanece, mas agora é acessado a partir da DeckManagementScreen
        this.#deckBuilderUI = new DeckBuilderUI(
            this.#screenManager, this.#accountManager, this.#cardDatabase,
            this.#cardRenderer, this.#zoomHandler // Não precisa do UIManager aqui
        );

        // BattleScreenUI
        this.#battleUI = new BattleScreenUI(
             this.#screenManager, this.#accountManager, // Passa accountManager (ex: para avatar)
             this.#cardDatabase, this.#cardRenderer, this.#zoomHandler
         );
        // ----------------------------------------------

        // Vincula ações permanentes (como botões da Top Bar)
        this._bindPermanentUIActions();
        console.log("UIManager (Coordinator) inicializado.");
    }

    // --- Setup para o Jogo ---
    setGameInstance(gameInstance) {
        this.#gameInstance = gameInstance;
        console.log("UI Coordinator: Game instance set.");
        // Informa a UI de Batalha sobre a instância do jogo
        this.#battleUI.setGameInstance(gameInstance);
    }
    setLocalPlayer(playerId) {
        this.#localPlayerId = playerId;
        console.log(`UI Coordinator: Local player set: ${playerId}`);
        // Informa a UI de Batalha quem é o jogador local
        this.#battleUI.setLocalPlayer(playerId);
    }

    // --- Controle da Barra Superior (Top Bar) ---
    showTopBar(userData) {
        const $topBar = $('#top-bar');
        if (userData) {
            $topBar.find('#top-bar-username').text(userData.username);
            // TODO: Atualizar o avatar na top bar usando userData.avatar
            // Ex: $topBar.find('#top-bar-avatar-img').attr('src', `assets/images/avatars/${userData.avatar}`);
            $topBar.addClass('active'); // Torna a barra visível
            console.log("UIManager: Top Bar shown for", userData.username);
        } else {
            console.warn("UIManager: showTopBar called without user data.");
        }
    }
    hideTopBar() {
        $('#top-bar').removeClass('active'); // Esconde a barra
        console.log("UIManager: Top Bar hidden.");
    }


    // --- Delegação de Renderização para Módulos Específicos ---

    /** Renderiza a tela inicial (notícias). É async devido ao carregamento de dados. */
    async renderHomeScreen() {
        console.log("UI Coordinator: Delegating home screen rendering.");
        await this.#homeUI.render(); // Chama o método render do módulo específico (usa await)
    }

    /** Renderiza a tela de perfil (agora simplificada). */
    renderProfileScreen() {
        console.log("UI Coordinator: Delegating profile screen rendering.");
        this.#profileUI.render(); // Chama o método render do ProfileScreenUI simplificado
    }

    /** Renderiza a nova tela de gerenciamento de decks e coleção. */
    renderDeckManagementScreen() { // <<<=== NOVO MÉTODO
        console.log("UI Coordinator: Delegating deck management screen rendering.");
        this.#deckManagementUI.render(); // Chama o método render do novo módulo DeckManagementScreenUI
    }

    /** Prepara e renderiza a tela do construtor de decks (para criar ou editar). */
    renderDeckBuilderScreen(deckIdToEdit = null) {
        console.log("UI Coordinator: Delegating deck builder rendering.");
        this.#deckBuilderUI.render(deckIdToEdit); // Chama o método render do DeckBuilderUI
    }

    /** Renderiza a tela de opções. */
    renderOptionsScreen() {
         console.log("UI Coordinator: Delegating options screen rendering.");
         this.#optionsUI.render(); // Chama o método render do OptionsUI
    }

    /** Renderiza o estado inicial do tabuleiro de batalha. */
    renderInitialGameState() {
        console.log("UI Coordinator: Delegating initial game state rendering.");
         if (!this.#gameInstance || !this.#localPlayerId) {
             console.error("UI Coordinator: Cannot render game state - game/player not set.");
             // Talvez redirecionar para uma tela segura?
             // this.#screenManager.showScreen('home-screen');
             return;
         }
        // Delega para BattleScreenUI renderizar o tabuleiro inicial
        this.#battleUI.renderInitialState();
    }

    // --- Bindings Globais e da Top Bar ---
    _bindPermanentUIActions() {
        console.log("UI Coordinator: Binding permanent UI actions (Top Bar, global)...");

         // Botão Home
         $('#top-bar-btn-home').off('click').on('click', async () => {
            const currentScreen = this.#screenManager.getActiveScreenId();
            console.log(`Top Bar: Home button clicked. Current screen: ${currentScreen}`);
            if(currentScreen !== 'home-screen'){
                console.log("UI Coordinator: Navigating to Home Screen...");
                await this.renderHomeScreen(); // Delega renderização (usa await)
                this.#screenManager.showScreen('home-screen');
                console.log("UI Coordinator: Home Screen shown.");
            } else {
                 console.log("UI Coordinator: Already on Home Screen.");
            }
         });

         // Botão Perfil
         $('#top-bar-btn-profile').off('click').on('click', () => {
            const currentScreen = this.#screenManager.getActiveScreenId();
            console.log(`Top Bar: Profile button clicked. Current screen: ${currentScreen}`);
            if(currentScreen !== 'profile-screen'){
                 console.log("UI Coordinator: Navigating to Profile Screen...");
                this.renderProfileScreen(); // Delega renderização (tela simplificada)
                this.#screenManager.showScreen('profile-screen');
                 console.log("UI Coordinator: Profile Screen shown.");
            } else {
                 console.log("UI Coordinator: Already on Profile Screen.");
            }
         });

         // --- Binding para o botão Decks --- <<<=== ATUALIZADO
         $('#top-bar-btn-decks').off('click').on('click', () => {
            const currentScreen = this.#screenManager.getActiveScreenId();
            console.log(`Top Bar: Decks button clicked. Current screen: ${currentScreen}`);
            if (currentScreen !== 'deck-management-screen') { // Verifica se já está na tela
                 console.log("UI Coordinator: Navigating to Deck Management Screen...");
                 this.renderDeckManagementScreen(); // Delega renderização da nova tela
                 this.#screenManager.showScreen('deck-management-screen'); // Mostra a nova tela
                 console.log("UI Coordinator: Deck Management Screen shown.");
             } else {
                  console.log("UI Coordinator: Already on Deck Management Screen.");
             }
         });
         // --------------------------------

         // Botão Conectar
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

         // Botão Opções
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

         // Botão Logout
         $('#top-bar-btn-logout').off('click').on('click', () => {
             console.log("Top Bar: Logout button clicked.");
             this.#accountManager.logout();
             this.hideTopBar();
             $('#screens-container').removeClass('with-top-bar'); // Remove padding/margin se houver
             this.#screenManager.showScreen('title-screen'); // Sempre volta para a Title ao deslogar
              console.log("UI Coordinator: Logged out, showing Title Screen.");
         });

         // Listener global de ESC para fechar overlays (principalmente o zoom)
         $(document).off('keydown.uimclose').on('keydown.uimclose', (e) => {
             if (e.key === "Escape") {
                 // Fecha o zoom independentemente da tela ativa
                 this.#zoomHandler?.closeZoom();
                 // Adicionar lógica para fechar outros modais/popups se houver
             }
         });
    }

    // --- Métodos Públicos Adicionais (Exemplo) ---
    // (Poderia ter métodos para mostrar notificações globais, etc.)
    // updateTopBarAvatar(avatarFilename) {
    //     $('#top-bar-avatar-img').attr('src', `assets/images/avatars/${avatarFilename}`);
    // }

} // End class UIManager (Coordinator)