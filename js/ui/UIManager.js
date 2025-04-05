// js/ui/UIManager.js - ATUALIZADO (v2.7 - Titlescreen Banner Integration)

// Importar os módulos de UI específicos e helpers
import ProfileScreenUI from './screens/ProfileScreenUI.js';
import DeckBuilderUI from './screens/DeckBuilderUI.js';
import BattleScreenUI from './screens/BattleScreenUI.js';
import OptionsUI from './screens/OptionsUI.js';
import HomeScreenUI from './screens/HomeScreenUI.js';
import DeckManagementScreenUI from './screens/DeckManagementScreenUI.js';
import TitlescreenUi from './screens/titlescreenUi.js'; // <<< NOVO: Importa a UI da tela de título
import CardRenderer from './helpers/CardRenderer.js';
import ZoomHandler from './helpers/ZoomHandler.js';
// AudioManager é injetado, não importado aqui diretamente

export default class UIManager {
    // --- Core References ---
    #screenManager;
    #accountManager;
    #cardDatabase;
    #audioManager;     // Referência para o AudioManager
    #gameInstance = null; // Instância do jogo atual (se houver)
    #localPlayerId = null; // ID do jogador local na partida atual

    // --- UI Module Instances ---
    #profileUI;
    #deckBuilderUI;
    #battleUI;
    #optionsUI;
    #homeUI;
    #deckManagementUI;
    #titlescreenUI; // <<< NOVO: Instância da UI da tela de título
    #cardRenderer;
    #zoomHandler;

    #activeScreenUI = null; // <<< NOVO: Referência para a UI ativa (para destroy)

    constructor(screenManager, accountManager, cardDatabase, audioManager) {
        // Armazena as dependências principais
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;
        this.#audioManager = audioManager; // Armazena a instância do AudioManager

        // Instancia helpers
        this.#cardRenderer = new CardRenderer();
        this.#zoomHandler = new ZoomHandler(this.#cardDatabase); // ZoomHandler precisa do cardDatabase

        // --- Instancia os módulos de UI específicos ---
        // Passa AudioManager para os módulos que precisam dele agora
        this.#titlescreenUI = new TitlescreenUi(this.#screenManager, this, this.#audioManager); // <<< NOVO: Instancia TitlescreenUi
        this.#homeUI = new HomeScreenUI(this.#screenManager, this, this.#audioManager);
        this.#optionsUI = new OptionsUI(this.#audioManager);
        this.#profileUI = new ProfileScreenUI(
            this.#screenManager, this.#accountManager, this.#cardDatabase,
            this.#cardRenderer, this.#zoomHandler, this
        );
        this.#deckManagementUI = new DeckManagementScreenUI(
            this.#screenManager, this.#accountManager, this.#cardDatabase,
            this.#cardRenderer, this.#zoomHandler, this, this.#audioManager
        );
        this.#deckBuilderUI = new DeckBuilderUI(
            this.#screenManager, this.#accountManager, this.#cardDatabase,
            this.#cardRenderer, this.#zoomHandler, this.#audioManager
        );
        this.#battleUI = new BattleScreenUI(
             this.#screenManager, this.#accountManager, this.#cardDatabase,
             this.#cardRenderer, this.#zoomHandler, this.#audioManager
        );

        // Vincula ações permanentes (Top Bar)
        this._bindPermanentUIActions();
        console.log("UIManager (Coordinator) inicializado com AudioManager injetado e TitlescreenUI.");
    }

    // --- Setup para o Jogo ---
    setGameInstance(gameInstance) {
        this.#gameInstance = gameInstance;
        console.log("UI Coordinator: Game instance set.");
        this.#battleUI.setGameInstance(gameInstance); // Informa BattleUI
    }
    setLocalPlayer(playerId) {
        this.#localPlayerId = playerId;
        console.log(`UI Coordinator: Local player set: ${playerId}`);
        this.#battleUI.setLocalPlayer(playerId); // Informa BattleUI
    }

    // --- Controle da Barra Superior (Top Bar) ---
    showTopBar(userData) {
        const $topBar = $('#top-bar');
        if (userData) {
            $topBar.find('#top-bar-username').text(userData.username);
            const avatarFile = userData.avatar || 'default.png';
            const $avatarImg = $topBar.find('.top-bar-avatar img');
            if($avatarImg.length) {
                $avatarImg.attr('src', `assets/images/avatars/${avatarFile}`);
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

    // --- Delegação de Renderização e Inicialização ---
    // Estes métodos agora chamam a limpeza da UI anterior,
    // renderizam/inicializam a nova UI e atualizam a UI ativa.

    async renderTitlescreen() { // <<< NOVO: Método para renderizar/iniciar a tela de título
        const screenId = 'title-screen';
        const $screenElement = $(`#${screenId}`);
        if ($screenElement.length === 0) {
             console.error(`UIManager: Elemento #${screenId} não encontrado.`);
             return;
        }
        this.#cleanupActiveUI(this.#titlescreenUI); // Limpa a UI anterior
        console.log("UI Coordinator: Initializing Titlescreen UI.");
        if (this.#titlescreenUI && typeof this.#titlescreenUI.init === 'function') {
             try {
                 this.#titlescreenUI.init($screenElement[0]); // Chama init da Titlescreen UI
                 this.#activeScreenUI = this.#titlescreenUI; // Define como ativa
             } catch(error) {
                 console.error("UIManager: Erro ao inicializar TitlescreenUI", error);
             }
        } else {
             console.warn("UIManager: TitlescreenUI ou seu método init não encontrado.");
        }
    }

    async renderHomeScreen() {
        const screenId = 'home-screen';
        this.#cleanupActiveUI(this.#homeUI);
        console.log("UI Coordinator: Delegating home screen rendering.");
        try {
            await this.#homeUI.render();
            // Assumindo que homeUI não tem um 'init' separado ou é chamado dentro de render()
            this.#activeScreenUI = this.#homeUI;
        } catch (error) {
            console.error("UIManager: Erro ao renderizar HomeScreenUI", error);
        }
    }
    renderProfileScreen() {
        const screenId = 'profile-screen';
        const $screenElement = $(`#${screenId}`);
         if ($screenElement.length === 0) return;
        this.#cleanupActiveUI(this.#profileUI);
        console.log("UI Coordinator: Delegating profile screen rendering.");
         if (this.#profileUI && typeof this.#profileUI.render === 'function') {
             try {
                 this.#profileUI.render(); // ProfileUI lida com sua própria inicialização dentro de render
                 this.#activeScreenUI = this.#profileUI;
             } catch(error) {
                 console.error("UIManager: Erro ao renderizar ProfileScreenUI", error);
             }
         }
    }
    renderDeckManagementScreen() {
        const screenId = 'deck-management-screen';
        const $screenElement = $(`#${screenId}`);
         if ($screenElement.length === 0) return;
        this.#cleanupActiveUI(this.#deckManagementUI);
        console.log("UI Coordinator: Delegating deck management screen rendering.");
         if (this.#deckManagementUI && typeof this.#deckManagementUI.render === 'function') {
             try {
                 this.#deckManagementUI.render();
                 this.#activeScreenUI = this.#deckManagementUI;
             } catch(error) {
                 console.error("UIManager: Erro ao renderizar DeckManagementScreenUI", error);
             }
         }
    }
    renderDeckBuilderScreen(deckIdToEdit = null) {
         const screenId = 'deck-builder-screen';
         const $screenElement = $(`#${screenId}`);
         if ($screenElement.length === 0) return;
        this.#cleanupActiveUI(this.#deckBuilderUI);
        console.log("UI Coordinator: Delegating deck builder rendering.");
         if (this.#deckBuilderUI && typeof this.#deckBuilderUI.render === 'function') {
             try {
                 this.#deckBuilderUI.render(deckIdToEdit);
                 this.#activeScreenUI = this.#deckBuilderUI;
             } catch(error) {
                 console.error("UIManager: Erro ao renderizar DeckBuilderUI", error);
             }
         }
    }
    renderOptionsScreen() {
        const screenId = 'options-screen';
        const $screenElement = $(`#${screenId}`);
        if ($screenElement.length === 0) return;
       this.#cleanupActiveUI(this.#optionsUI);
       console.log("UI Coordinator: Delegating options screen rendering.");
        if (this.#optionsUI && typeof this.#optionsUI.render === 'function') {
            try {
                this.#optionsUI.render(); // OptionsUI carrega os valores atuais ao renderizar
                this.#activeScreenUI = this.#optionsUI;
            } catch(error) {
                console.error("UIManager: Erro ao renderizar OptionsUI", error);
            }
        }
    }
    renderInitialGameState() {
        const screenId = 'battle-screen';
        this.#cleanupActiveUI(this.#battleUI);
        console.log("UI Coordinator: Delegating initial game state rendering.");
        if (!this.#gameInstance || !this.#localPlayerId) {
           console.error("UI Coordinator: Cannot render game state - game/player not set.");
           this.navigateTo('home-screen'); // Usa navigateTo para fallback seguro
           return;
        }
         if (this.#battleUI && typeof this.#battleUI.renderInitialState === 'function') {
             try {
                 this.#battleUI.renderInitialState();
                 this.#activeScreenUI = this.#battleUI;
             } catch(error) {
                 console.error("UIManager: Erro ao renderizar BattleScreenUI initial state", error);
             }
         }
    }

    // --- Helper para Limpar a UI Ativa ---
    #cleanupActiveUI(newUi = null) {
        if (this.#activeScreenUI && this.#activeScreenUI !== newUi) {
            if (typeof this.#activeScreenUI.destroy === 'function') {
                console.log(`UIManager: Destroying previous UI: ${this.#activeScreenUI.constructor.name}`);
                try {
                    this.#activeScreenUI.destroy();
                } catch (error) {
                    console.error(`UIManager: Error destroying ${this.#activeScreenUI.constructor.name}`, error);
                }
            } else {
                 console.log(`UIManager: Previous UI ${this.#activeScreenUI.constructor.name} has no destroy method.`);
            }
        }
        this.#activeScreenUI = null; // Limpa a referência antiga
    }

      // --- NOVO: Render methods for simple screens (optional, mainly for cleanup) ---
      async renderLoginScreen() {
        this.#cleanupActiveUI(); // Clean up previous UI (e.g., Title Screen UI)
        this.#activeScreenUI = null; // No dedicated UI class instance for this simple screen
        // Reset form state (optional but good practice)
        $('#login-form')[0]?.reset(); // Use optional chaining in case form doesn't exist yet
        $('#login-message').text('');
        console.log("UIManager: Prepared Login Screen state.");
        // No complex rendering logic needed here, HTML is static/generated once
    }

    async renderCreateAccountScreen() {
        this.#cleanupActiveUI(); // Clean up previous UI
        this.#activeScreenUI = null; // No dedicated UI class instance
        // Reset form state
        $('#create-account-form')[0]?.reset();
        $('#create-account-message').text('');
        console.log("UIManager: Prepared Create Account Screen state.");
        // No complex rendering logic needed here
    }


     // --- Método Centralizado de Navegação ---
    /**
     * Navega para uma nova tela, lidando com renderização, exibição e BGM.
     * @param {string} screenId - O ID da tela de destino (ex: 'home-screen').
     * @param {...any} args - Argumentos adicionais para passar ao método de renderização (ex: deckId).
     */
    async navigateTo(screenId, ...args) {
        console.log(`UIManager: Navigating to '${screenId}'...`);

        // Mapeia screenId para o método de renderização correspondente
        let renderPromise = null;
        switch (screenId) {
            case 'title-screen':
                renderPromise = this.renderTitlescreen(...args);
                break;
            // ---> ADICIONADO CASES ABAIXO <---
            case 'login-screen':
                renderPromise = this.renderLoginScreen(...args); // Chama a função de preparação
                break;
            case 'create-account-screen':
                renderPromise = this.renderCreateAccountScreen(...args); // Chama a função de preparação
                break;
             // ---> FIM DAS ADIÇÕES <---
            case 'home-screen':
                renderPromise = this.renderHomeScreen(...args);
                break;
            case 'profile-screen':
                renderPromise = this.renderProfileScreen(...args);
                break;
            case 'deck-management-screen':
                renderPromise = this.renderDeckManagementScreen(...args);
                break;
            case 'deck-builder-screen':
                renderPromise = this.renderDeckBuilderScreen(...args);
                break;
            case 'options-screen':
                renderPromise = this.renderOptionsScreen(...args);
                break;
             case 'connect-screen': // Assumindo que connect-screen não tem UI complexa gerenciada aqui
                 this.#cleanupActiveUI(); // Limpa qualquer UI anterior
                 this.#activeScreenUI = null; // Define nenhuma UI ativa
                 // Resetar estado da tela de conexão diretamente se não houver classe UI
                 $('#connect-message').text('');
                 $('#server-status-section, #join-game-section').hide();
                 $('#opponent-ip').val('');
                 console.log("UIManager: Resetting Connect Screen state.");
                 renderPromise = Promise.resolve(); // Promessa resolvida para consistência
                break;
             case 'battle-screen': // A renderização inicial da batalha é separada
                 console.warn("UIManager: Use 'renderInitialGameState' for battle screen setup, not navigateTo.");
                 // Poderia chamar renderInitialGameState aqui, mas é mais claro separar
                 renderPromise = Promise.resolve(); // Não faz nada aqui, renderInitialGameState cuida
                 break;
            default:
                console.error(`UIManager: Unknown screenId for navigation: ${screenId}`);
                // Se chegar aqui, garante que renderPromise é algo awaitable para evitar erro
                renderPromise = Promise.reject(new Error(`Unknown screenId: ${screenId}`));
                // return; // REMOVIDO return aqui para permitir que o catch funcione
        }

        try {
             // Espera a renderização/inicialização terminar (se for async)
            await renderPromise; // Aguarda a promessa, incluindo as novas

            // Mostra a tela usando o screenManager (SÓ SE A PROMESSA RESOLVEU)
            console.log(`UIManager: Requesting ScreenManager to show '${screenId}'.`);
            this.#screenManager.showScreen(screenId);

            // Toca a música de fundo associada (se houver)
             // O screenId geralmente corresponde ao nome da BGM
             // Toca BGM DEPOIS de mostrar a tela
            this.#audioManager?.playBGM(screenId);

            console.log(`UIManager: Navigation to '${screenId}' complete.`);

        } catch (error) {
             // Captura erros da promessa (incluindo o reject do default case)
             console.error(`UIManager: Failed navigation to '${screenId}':`, error);
             // Talvez navegar para uma tela de erro ou voltar para home?
             // this.navigateTo('home-screen'); // Evita loop infinito se home falhar
        }
    }


    // --- Método para Salvar Opções ---
    saveOptions() {
         // A lógica de salvar opções agora está encapsulada em OptionsUI._saveOptions
         // e é chamada pelo próprio botão de salvar dentro de OptionsUI.
         // Esta função aqui pode ser desnecessária a menos que haja outra forma de salvar.
         console.warn("UIManager: saveOptions() called, but saving should be handled within OptionsUI now.");
         // Se ainda precisar forçar:
         // if (this.#optionsUI && typeof this.#optionsUI._saveOptions === 'function') {
         //     this.#optionsUI._saveOptions();
         // }
    }

    // --- Bindings Globais e da Top Bar ---
    _bindPermanentUIActions() {
        console.log("UI Coordinator: Binding permanent UI actions (Top Bar, global)...");
        const self = this; // Armazena 'this' (UIManager)

        // Helper Function - NOW ONLY ADDS HOVER SOUND
        const addTopBarHoverAudio = ($element, sfxHover = 'buttonHover') => {
            $element.off('mouseenter.tbaudio'); // Clear only hover listener
            $element.on('mouseenter.tbaudio', () => {
                self.#audioManager?.playSFX(sfxHover);
            });
        };

         // --- ATUALIZADO: Usa self.navigateTo para todas as navegações da Top Bar ---

         // Botão Home
         const $btnHome = $('#top-bar-btn-home');
         $btnHome.off('click.uimanager').on('click.uimanager', () => { // Use namespace .uimanager
             self.#audioManager?.playSFX('buttonClick'); // Play sound INSIDE handler
             if (self.#screenManager.getActiveScreenId() !== 'home-screen') {
                 self.navigateTo('home-screen');
             }
         });
         addTopBarHoverAudio($btnHome); // Add hover sound
 
         // Botão Perfil
         const $btnProfile = $('#top-bar-btn-profile');
         $btnProfile.off('click.uimanager').on('click.uimanager', () => {
             self.#audioManager?.playSFX('buttonClick');
             if (self.#screenManager.getActiveScreenId() !== 'profile-screen') {
                 self.navigateTo('profile-screen');
             }
         });
         addTopBarHoverAudio($btnProfile);
 
            const $btnDecks = $('#top-bar-btn-decks');
         $btnDecks.off('click.uimanager').on('click.uimanager', () => {
             console.log("!!! DEBUG: #top-bar-btn-decks CLICKED !!!"); // Add this
             self.#audioManager?.playSFX('buttonClick');
             if (self.#screenManager.getActiveScreenId() !== 'deck-management-screen') {
                 self.navigateTo('deck-management-screen');
             }
         });
         addTopBarHoverAudio($btnDecks);
 
         // Botão Conectar
         const $btnConnect = $('#top-bar-btn-connect');
         $btnConnect.off('click.uimanager').on('click.uimanager', () => {
             self.#audioManager?.playSFX('buttonClick');
             if (self.#screenManager.getActiveScreenId() !== 'connect-screen') {
                 self.navigateTo('connect-screen');
             }
         });
         addTopBarHoverAudio($btnConnect);
 
         // Botão Opções
         const $btnOptions = $('#top-bar-btn-options');
         $btnOptions.off('click.uimanager').on('click.uimanager', () => {
             self.#audioManager?.playSFX('buttonClick');
             if (self.#screenManager.getActiveScreenId() !== 'options-screen') {
                 self.navigateTo('options-screen');
             }
         });
         addTopBarHoverAudio($btnOptions);
 
         // Botão Logout
         const $btnLogout = $('#top-bar-btn-logout');
         $btnLogout.off('click.uimanager').on('click.uimanager', () => {
             console.log("Top Bar: Logout button clicked.");
             self.#audioManager?.playSFX('buttonClick'); // Play click sound
             self.#audioManager?.stopBGM(); // Stop music before navigating
             self.#accountManager.logout();
             self.hideTopBar();
             $('#screens-container').removeClass('with-top-bar');
             self.navigateTo('title-screen');
             console.log("UI Coordinator: Logged out, navigating to Title Screen.");
         });
         addTopBarHoverAudio($btnLogout); // Add hover sound only
 
         // Listener global de ESC (mantido)
         $(document).off('keydown.uimclose').on('keydown.uimclose', (e) => {
             if (e.key === "Escape") {
                 // Deixar ZoomHandler tratar o fechamento do zoom.
             }
         });
     }

} // End class UIManager (Coordinator)