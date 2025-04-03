// js/ui/UIManager.js - ATUALIZADO (v2.6 - Audio Injection Fix)

// Importar os módulos de UI específicos e helpers
import ProfileScreenUI from './screens/ProfileScreenUI.js';
import DeckBuilderUI from './screens/DeckBuilderUI.js';
import BattleScreenUI from './screens/BattleScreenUI.js';
import OptionsUI from './screens/OptionsUI.js';
import HomeScreenUI from './screens/HomeScreenUI.js';
import DeckManagementScreenUI from './screens/DeckManagementScreenUI.js';
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
    #cardRenderer;
    #zoomHandler;

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
        this.#homeUI = new HomeScreenUI(this.#screenManager, this, this.#audioManager); // Passa AudioManager
        this.#optionsUI = new OptionsUI(this.#audioManager); // Passa AudioManager
        this.#profileUI = new ProfileScreenUI(
            this.#screenManager, this.#accountManager, this.#cardDatabase,
            this.#cardRenderer, this.#zoomHandler, this
            // Nota: ProfileUI não usa áudio diretamente por enquanto
        );
        this.#deckManagementUI = new DeckManagementScreenUI( // Passa AudioManager
            this.#screenManager, this.#accountManager, this.#cardDatabase,
            this.#cardRenderer, this.#zoomHandler, this, this.#audioManager
        );
        this.#deckBuilderUI = new DeckBuilderUI( // Passa AudioManager
            this.#screenManager, this.#accountManager, this.#cardDatabase,
            this.#cardRenderer, this.#zoomHandler, this.#audioManager
        );
        this.#battleUI = new BattleScreenUI( // Passa AudioManager
             this.#screenManager, this.#accountManager, this.#cardDatabase,
             this.#cardRenderer, this.#zoomHandler, this.#audioManager
         );

        // Vincula ações permanentes (Top Bar)
        this._bindPermanentUIActions();
        console.log("UIManager (Coordinator) inicializado com AudioManager injetado nos módulos.");
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
            // Tenta encontrar a imagem do avatar na top bar (se existir)
            const $avatarImg = $topBar.find('.top-bar-avatar img'); // Assumindo uma estrutura
            if($avatarImg.length) {
                $avatarImg.attr('src', `assets/images/avatars/${avatarFile}`);
            }
            $topBar.addClass('active');
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

    // --- Delegação de Renderização ---
    // Estes métodos chamam os renderizadores dos módulos de UI específicos.
    // O AudioManager já foi injetado nos construtores, não precisa passar aqui.
    async renderHomeScreen() {
        console.log("UI Coordinator: Delegating home screen rendering.");
        await this.#homeUI.render();
    }
    renderProfileScreen() {
        console.log("UI Coordinator: Delegating profile screen rendering.");
        this.#profileUI.render();
    }
    renderDeckManagementScreen() {
        console.log("UI Coordinator: Delegating deck management screen rendering.");
        this.#deckManagementUI.render();
    }
    renderDeckBuilderScreen(deckIdToEdit = null) {
        console.log("UI Coordinator: Delegating deck builder rendering.");
        this.#deckBuilderUI.render(deckIdToEdit);
    }
    renderOptionsScreen() {
         console.log("UI Coordinator: Delegating options screen rendering.");
         this.#optionsUI.render(); // OptionsUI carrega os valores atuais ao renderizar
    }
    renderInitialGameState() {
        console.log("UI Coordinator: Delegating initial game state rendering.");
         if (!this.#gameInstance || !this.#localPlayerId) {
             console.error("UI Coordinator: Cannot render game state - game/player not set.");
             this.#screenManager.showScreen('home-screen'); // Fallback seguro
             this.#audioManager?.playBGM('home-screen');
             return;
         }
        this.#battleUI.renderInitialState();
    }

    // --- Método para Salvar Opções ---
    // Coordena o salvamento das opções e a atualização do AudioManager.
    saveOptions() {
        // Verifica se a instância de OptionsUI existe e tem o método _saveOptions
        // (Nota: _saveOptions agora é chamado internamente por OptionsUI ao clicar no botão)
        // Esta chamada externa pode não ser mais necessária se o botão salvar em OptionsUI
        // já estiver funcionando corretamente e chamando _saveOptions e audioManager.updateSettings().
        // Mantendo por segurança ou se houver outro gatilho para salvar.
        if (this.#optionsUI && typeof this.#optionsUI._saveOptions === 'function') {
             // Pede para OptionsUI salvar as opções lidas da UI no localStorage
             // e atualizar o AudioManager internamente
             this.#optionsUI._saveOptions(); // Esta função agora também chama audioManager.updateSettings()
             console.log("UIManager: Delegated options save (which should update AudioManager).");
        } else {
            console.warn("UIManager: OptionsUI instance or _saveOptions method not found. Cannot save options.");
        }
    }

    // --- Bindings Globais e da Top Bar ---
    _bindPermanentUIActions() {
        console.log("UI Coordinator: Binding permanent UI actions (Top Bar, global)...");
        const self = this; // Armazena 'this' (UIManager) para usar dentro dos listeners

        // --- Helper para adicionar listeners de áudio aos botões da Top Bar ---
        const addTopBarAudioListeners = ($element, sfxClick = 'buttonClick', sfxHover = 'buttonHover') => {
            // Remove listeners antigos para evitar duplicação
            $element.off('click.tbaudio mouseenter.tbaudio');
            // Adiciona novos listeners
            $element.on('click.tbaudio', () => {
                self.#audioManager?.playSFX(sfxClick);
            });
            $element.on('mouseenter.tbaudio', () => {
                self.#audioManager?.playSFX(sfxHover);
            });
        };

         // Botão Home
         const $btnHome = $('#top-bar-btn-home');
         $btnHome.on('click', async () => { // Ação de clique principal (navegação)
            const currentScreen = self.#screenManager.getActiveScreenId();
            if(currentScreen !== 'home-screen'){
                console.log("UI Coordinator: Navigating to Home Screen...");
                await self.renderHomeScreen(); // Home é async por causa do fetch
                self.#screenManager.showScreen('home-screen');
                self.#audioManager?.playBGM('home-screen'); // Toca BGM da Home
                console.log("UI Coordinator: Home Screen shown.");
            }
         });
         addTopBarAudioListeners($btnHome); // Adiciona sons

         // Botão Perfil (Simplificado - vai para ProfileScreen)
         const $btnProfile = $('#top-bar-btn-profile');
         $btnProfile.on('click', () => {
            const currentScreen = self.#screenManager.getActiveScreenId();
            if(currentScreen !== 'profile-screen'){
                 console.log("UI Coordinator: Navigating to Profile Screen...");
                self.renderProfileScreen(); // ProfileScreen agora é só info/avatar/histórico
                self.#screenManager.showScreen('profile-screen');
                self.#audioManager?.playBGM('profile-screen'); // Toca BGM do Perfil
                 console.log("UI Coordinator: Profile Screen shown.");
            }
         });
         addTopBarAudioListeners($btnProfile);

         // Botão Decks (Agora leva para DeckManagementScreen)
         const $btnDecks = $('#top-bar-btn-decks');
         $btnDecks.on('click', () => {
            const currentScreen = self.#screenManager.getActiveScreenId();
            if (currentScreen !== 'deck-management-screen') {
                 console.log("UI Coordinator: Navigating to Deck Management Screen...");
                 self.renderDeckManagementScreen(); // Renderiza a tela de gerenciamento
                 self.#screenManager.showScreen('deck-management-screen');
                 self.#audioManager?.playBGM('deck-management-screen'); // Toca BGM dos Decks
                 console.log("UI Coordinator: Deck Management Screen shown.");
             }
         });
         addTopBarAudioListeners($btnDecks);

         // Botão Conectar
         const $btnConnect = $('#top-bar-btn-connect');
         $btnConnect.on('click', () => {
            const currentScreen = self.#screenManager.getActiveScreenId();
             if(currentScreen !== 'connect-screen') {
                 console.log("UI Coordinator: Navigating to Connect Screen...");
                 // Resetar estado da tela de conexão
                 $('#connect-message').text('');
                 $('#server-status-section, #join-game-section').hide();
                 $('#opponent-ip').val('');
                 // Mostrar a tela
                 self.#screenManager.showScreen('connect-screen');
                 self.#audioManager?.playBGM('connect-screen'); // Toca BGM de Conectar
                  console.log("UI Coordinator: Connect Screen shown.");
             }
         });
         addTopBarAudioListeners($btnConnect);

         // Botão Opções
         const $btnOptions = $('#top-bar-btn-options');
         $btnOptions.on('click', () => {
            const currentScreen = self.#screenManager.getActiveScreenId();
             if(currentScreen !== 'options-screen') {
                 console.log("UI Coordinator: Navigating to Options Screen...");
                 self.renderOptionsScreen(); // Renderiza opções (carrega valores atuais da UI)
                 self.#screenManager.showScreen('options-screen');
                 self.#audioManager?.playBGM('options-screen'); // Toca BGM de Opções
                 console.log("UI Coordinator: Options Screen shown.");
             }
         });
         addTopBarAudioListeners($btnOptions);

         // Botão Logout
         const $btnLogout = $('#top-bar-btn-logout');
         $btnLogout.on('click', () => { // Ação de clique principal (logout)
             console.log("Top Bar: Logout button clicked.");
             self.#audioManager?.stopBGM(); // Para a música atual antes de deslogar
             self.#accountManager.logout();
             self.hideTopBar();
             $('#screens-container').removeClass('with-top-bar'); // Remove classe do container
             self.#screenManager.showScreen('title-screen');
             self.#audioManager?.playBGM('title-screen'); // Toca BGM da Title após logout
             console.log("UI Coordinator: Logged out, showing Title Screen.");
             // O som de clique já é adicionado por addTopBarAudioListeners
         });
         addTopBarAudioListeners($btnLogout); // Adiciona sons

         // Listener global de ESC para fechar overlays de zoom
         // (ZoomHandler agora lida com isso internamente, mas manter um fallback pode ser útil)
         $(document).off('keydown.uimclose').on('keydown.uimclose', (e) => {
             if (e.key === "Escape") {
                 // O ZoomHandler já tem seu próprio listener de ESC.
                 // Se houver outros modais/overlays gerenciados aqui, feche-os.
                 // self.#zoomHandler?.closeZoom(); // Redundante se ZoomHandler._bindGlobalClose funciona
             }
         });
    }

} // End class UIManager (Coordinator)