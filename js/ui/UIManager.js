// js/ui/UIManager.js - ATUALIZADO (v2.8 - Controle de Acesso)

// Importar os módulos de UI específicos e helpers
import ProfileScreenUI from './screens/ProfileScreenUI.js';
import DeckBuilderUI from './screens/DeckBuilderUI.js';
import BattleScreenUI from './screens/BattleScreenUI.js';
import OptionsUI from './screens/OptionsUI.js';
import HomeScreenUI from './screens/HomeScreenUI.js';
import DeckManagementScreenUI from './screens/DeckManagementScreenUI.js';
import TitlescreenUi from './screens/titlescreenUi.js';
import CardRenderer from './helpers/CardRenderer.js';
import ZoomHandler from './helpers/ZoomHandler.js';
import SetCollectionScreenUI from './screens/SetCollectionScreenUI.js';
import SetMasteryScreenUI from './screens/SetMasteryScreenUI.js';


// AudioManager é injetado, não importado aqui diretamente

export default class UIManager {
    // --- Core References ---
    #screenManager;
    #accountManager;
    #cardDatabase;
    #audioManager;
    #gameInstance = null;
    #localPlayerId = null;

    // --- UI Module Instances ---
    #profileUI;
    #deckBuilderUI;
    #battleUI;
    #optionsUI;
    #homeUI;
    #deckManagementUI;
    #titlescreenUI;
    #cardRenderer;
    #zoomHandler;
    #setCollectionUI;
    #setMasteryUI;

    #activeScreenUI = null;

    constructor(screenManager, accountManager, cardDatabase, audioManager) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;
        this.#audioManager = audioManager;

        this.#cardRenderer = new CardRenderer();
        this.#zoomHandler = new ZoomHandler(this.#cardDatabase);
        this.#setCollectionUI = new SetCollectionScreenUI(
            this.#screenManager,
            this.#accountManager,
            this.#cardDatabase,
            this.#zoomHandler       
        );

        // Instancia os módulos de UI específicos
        this.#titlescreenUI = new TitlescreenUi(this.#screenManager, this, this.#audioManager);
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
            this.#cardRenderer, this.#zoomHandler, this.#audioManager // Passa AudioManager se necessário
        );
        this.#battleUI = new BattleScreenUI(
             this.#screenManager, this.#accountManager, this.#cardDatabase,
             this.#cardRenderer, this.#zoomHandler, this.#audioManager, this
        );

        this._bindPermanentUIActions();
        console.log("UIManager (Coordinator) inicializado com AudioManager injetado e TitlescreenUI.");
    }

    // --- Setup para o Jogo ---
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

    // --- Controle da Barra Superior (Top Bar) ---
    showTopBar(userData) {
        const $topBar = $('#top-bar');
        if (userData) {
            // Encontra o span do nome de usuário e define o texto
            $topBar.find('#top-bar-username').text(userData.username);

            // Encontra a imagem DENTRO da div .top-bar-avatar
            const avatarFile = userData.avatar || 'default.png';
            const $avatarImg = $topBar.find('.top-bar-avatar img'); // Seleciona a tag img

            if($avatarImg.length) {
                $avatarImg.attr('src', `assets/images/avatars/${avatarFile}`);
                $avatarImg.attr('alt', `Avatar de ${userData.username}`); // Atualiza o alt text também
            } else {
                 console.warn("UIManager: Avatar img element (.top-bar-avatar img) not found.");
                 // Se o template sempre cria o elemento, isso não deve acontecer.
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
    async renderTitlescreen() {
        const screenId = 'title-screen';
        const $screenElement = $(`#${screenId}`);
        if ($screenElement.length === 0) { console.error(`UIManager: Elemento #${screenId} não encontrado.`); return; }
        this.#cleanupActiveUI(this.#titlescreenUI);
        console.log("UI Coordinator: Initializing Titlescreen UI.");
        if (this.#titlescreenUI && typeof this.#titlescreenUI.init === 'function') {
            try {
                this.#titlescreenUI.init($screenElement[0]);
                this.#activeScreenUI = this.#titlescreenUI;
            } catch(error) { console.error("UIManager: Erro ao inicializar TitlescreenUI", error); }
        } else { console.warn("UIManager: TitlescreenUI ou seu método init não encontrado."); }
    }

    async renderHomeScreen() {
        const screenId = 'home-screen';
        this.#cleanupActiveUI(this.#homeUI);
        console.log("UI Coordinator: Delegating home screen rendering.");
        try {
            await this.#homeUI.render();
            this.#activeScreenUI = this.#homeUI;
        } catch (error) { console.error("UIManager: Erro ao renderizar HomeScreenUI", error); }
    }

    renderProfileScreen() {
        const screenId = 'profile-screen';
        const $screenElement = $(`#${screenId}`);
        if ($screenElement.length === 0) return;
        this.#cleanupActiveUI(this.#profileUI);
        console.log("UI Coordinator: Delegating profile screen rendering.");
        if (this.#profileUI && typeof this.#profileUI.render === 'function') {
            try {
                this.#profileUI.render();
                this.#activeScreenUI = this.#profileUI;
            } catch(error) { console.error("UIManager: Erro ao renderizar ProfileScreenUI", error); }
        }
    }

    renderSetMasteryScreen() {
        if (!this.#setMasteryUI) {            // use # para manter o padrão privado
          this.#setMasteryUI = new SetMasteryScreenUI(
            this.#screenManager,
            this.#accountManager             // <‑‑ campo privado correto
          );
          this.#setMasteryUI.init();
        }
        this.#setMasteryUI.render('ELDRAEM'); // ou outro setCode, se criá‑los depois
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
            } catch(error) { console.error("UIManager: Erro ao renderizar DeckManagementScreenUI", error); }
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
            } catch(error) { console.error("UIManager: Erro ao renderizar DeckBuilderUI", error); }
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
                this.#optionsUI.render();
                this.#activeScreenUI = this.#optionsUI;
            } catch(error) { console.error("UIManager: Erro ao renderizar OptionsUI", error); }
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
            } catch(error) { console.error("UIManager: Erro ao renderizar BattleScreenUI initial state", error); }
        }
    }

    // --- Helper para Limpar a UI Ativa ---
    #cleanupActiveUI(newUi = null) {
        if (this.#activeScreenUI && this.#activeScreenUI !== newUi) {
            if (typeof this.#activeScreenUI.destroy === 'function') {
                console.log(`UIManager: Destroying previous UI: ${this.#activeScreenUI.constructor.name}`);
                try { this.#activeScreenUI.destroy(); }
                catch (error) { console.error(`UIManager: Error destroying ${this.#activeScreenUI.constructor.name}`, error); }
            } else { console.log(`UIManager: Previous UI ${this.#activeScreenUI.constructor.name} has no destroy method.`); }
        }
        this.#activeScreenUI = null;
    }

    // --- Render methods for simple screens (mainly for cleanup and state reset) ---
    async renderLoginScreen() {
        this.#cleanupActiveUI();
        this.#activeScreenUI = null;
        $('#login-form')[0]?.reset();
        $('#login-message').text('');
        console.log("UIManager: Prepared Login Screen state.");
    }
    async renderCreateAccountScreen() {
        this.#cleanupActiveUI();
        this.#activeScreenUI = null;
        $('#create-account-form')[0]?.reset();
        $('#create-account-message').text('');
        console.log("UIManager: Prepared Create Account Screen state.");
    }

    // --- Método Centralizado de Navegação (COM CONTROLE DE ACESSO) ---
    /**
     * Navega para uma nova tela, lidando com renderização, exibição e BGM.
     * Inclui verificação de estado de login para restringir acesso.
     * @param {string} screenId - O ID da tela de destino (ex: 'home-screen').
     * @param {...any} args - Argumentos adicionais para passar ao método de renderização (ex: deckId).
     */
    async navigateTo(screenId, ...args) {
        console.log(`UIManager: Attempting navigation to '${screenId}'...`);

        const currentUser = this.#accountManager.getCurrentUser(); // Pega o status atual do login

        // --- CONTROLE DE ACESSO ---
        const requiresLogin = [
            'home-screen', 'profile-screen', 'deck-management-screen',
            'deck-builder-screen', 'connect-screen', 'battle-screen', 'set-mastery-screen'
            // Note: battle-screen é protegido pelo fluxo de início de jogo também
        ];
        const restrictedWhenLoggedIn = ['login-screen', 'create-account-screen', 'title-screen']; // Telas que um user logado não deveria acessar

        if (!currentUser) { // --- SE NÃO ESTIVER LOGADO ---
            // A tela de opções é uma exceção, pode ser acessada sem login
            if (requiresLogin.includes(screenId) && screenId !== 'options-screen') {
                console.warn(`UIManager: Access Denied - Screen '${screenId}' requires login. Redirecting to title screen.`);
                this.#audioManager?.playSFX('genericError'); // Toca som de erro
                if (this.#screenManager.getActiveScreenId() !== 'title-screen') {
                     await this.navigateTo('title-screen'); // Usa await
                }
                return; // Impede a navegação para a tela solicitada
            }
            // Se não requer login OU é a tela de opções, permite continuar

        } else { // --- SE ESTIVER LOGADO ---
            if (restrictedWhenLoggedIn.includes(screenId)) {
                console.warn(`UIManager: Access Denied - Logged-in user cannot access '${screenId}'. Staying on current screen or redirecting to home.`);
                this.#audioManager?.playSFX('genericError');
                 const currentScreen = this.#screenManager.getActiveScreenId();
                 if (!currentScreen || restrictedWhenLoggedIn.includes(currentScreen)) {
                    console.log("UIManager: Redirecting logged-in user to home screen from restricted area.");
                    await this.navigateTo('home-screen'); // Usa await
                 }
                return; // Impede a navegação para login/create/title
            }
            // Se não é restrita quando logado, permite continuar
        }
        // --- FIM DO CONTROLE DE ACESSO ---

        console.log(`UIManager: Access granted to '${screenId}'. Proceeding with navigation...`);

        let renderPromise = null;
        switch (screenId) {

            /* ───────────────── clássicos ───────────────── */
            case 'title-screen':
                renderPromise = this.renderTitlescreen(...args);
                break;
        
            case 'login-screen':
                renderPromise = this.renderLoginScreen(...args);
                break;
        
            case 'create-account-screen':
                renderPromise = this.renderCreateAccountScreen(...args);
                break;
        
            case 'home-screen':
                renderPromise = this.renderHomeScreen(...args);
                break;
        
            case 'profile-screen':
                renderPromise = this.renderProfileScreen(...args);
                break;
        
            case 'deck-management-screen':
                renderPromise = this.renderDeckManagementScreen(...args);
                break;

            case 'set-mastery-screen': {
                // cria on‑demand se ainda não existir
                if (!this.#setMasteryUI) {
                    this.#setMasteryUI = new SetMasteryScreenUI(this.#screenManager,
                                                                this.#accountManager);
                    this.#setMasteryUI.init();
                }
                renderPromise = Promise.resolve(this.#setMasteryUI.render(...args));
                break;
                }
        
            case 'deck-builder-screen':
                renderPromise = this.renderDeckBuilderScreen(...args);
                break;
        
            /* ─────────────── NOVO : Set Collection ─────────────── */
            case 'set-collection-screen': {
                renderPromise = this.#setCollectionUI.render(...args);
                break;
            }
        
            /* ───────────────── opções / conexões / batalha ───────────────── */
            case 'options-screen':        // acessível logado ou não
                renderPromise = this.renderOptionsScreen(...args);
                break;
        
            case 'connect-screen':
                this.#cleanupActiveUI();
                this.#activeScreenUI = null;
                $('#connect-message').text('');
                $('#server-status-section, #join-game-section').hide();
                $('#opponent-ip').val('');
                console.log('UIManager: Resetting Connect Screen state.');
                renderPromise = Promise.resolve();
                break;
        
            case 'battle-screen':
                console.warn("UIManager: Use 'renderInitialGameState' for battle screen setup, not navigateTo.");
                renderPromise = Promise.resolve();
                break;
        
            /* ───────────────────────── default ───────────────────────── */
            default:
                console.error(`UIManager: Unknown screenId for navigation: ${screenId}`);
                renderPromise = Promise.reject(new Error(`Unknown screenId: ${screenId}`));
        }
        

        try {
            await renderPromise; // Espera a renderização/inicialização terminar (se for async)

            // --- Verificação Final de Estado (Segurança Extra) ---
            const finalCurrentUser = this.#accountManager.getCurrentUser();
            const finalIsStillAllowed = (finalCurrentUser && !restrictedWhenLoggedIn.includes(screenId)) ||
                                      (!finalCurrentUser && (!requiresLogin.includes(screenId) || screenId === 'options-screen'));


            if (finalIsStillAllowed) {
                console.log(`UIManager: Requesting ScreenManager to show '${screenId}'.`);
                this.#screenManager.showScreen(screenId); // Mostra a tela
                this.#audioManager?.playBGM(screenId); // Toca a música de fundo
                console.log(`UIManager: Navigation to '${screenId}' complete.`);
            } else {
                 console.warn(`UIManager: Login state changed during render/await for '${screenId}'. Aborting final screen show.`);
                 // Redireciona novamente se o estado mudou e agora é inválido
                  const fallbackScreen = finalCurrentUser ? 'home-screen' : 'title-screen';
                  if (this.#screenManager.getActiveScreenId() !== fallbackScreen) {
                      await this.navigateTo(fallbackScreen); // Usa await
                  }
            }

        } catch (error) {
            console.error(`UIManager: Failed navigation process to '${screenId}':`, error);
            // Fallback seguro: Redireciona com base no estado de login ATUAL
             const fallbackCurrentUser = this.#accountManager.getCurrentUser();
             const fallbackScreen = fallbackCurrentUser ? 'home-screen' : 'title-screen';
             if (this.#screenManager.getActiveScreenId() !== fallbackScreen) {
                 await this.navigateTo(fallbackScreen); // Usa await
             }
        }
    }

    // --- Método para Salvar Opções ---
    saveOptions() {
        console.warn("UIManager: saveOptions() called, but saving should be handled within OptionsUI now.");
        // A lógica agora está em OptionsUI._saveOptions, chamada pelo botão Salvar lá.
    }

    // --- Bindings Globais e da Top Bar ---
    _bindPermanentUIActions() {
        console.log("UI Coordinator: Binding permanent UI actions (Top Bar, global)...");
        const self = this;

        const addTopBarHoverAudio = ($element, sfxHover = 'buttonHover') => {
            $element.off('mouseenter.tbaudio').on('mouseenter.tbaudio', () => {
                self.#audioManager?.playSFX(sfxHover);
            });
        };

        // Botão Home
        const $btnHome = $('#top-bar-btn-home');
        $btnHome.off('click.uimanager').on('click.uimanager', () => {
            self.#audioManager?.playSFX('buttonClick');
            self.navigateTo('home-screen'); // navigateTo fará a verificação de login
        });
        addTopBarHoverAudio($btnHome);

        // Botão Perfil
        const $btnProfile = $('#top-bar-btn-profile');
        $btnProfile.off('click.uimanager').on('click.uimanager', () => {
            self.#audioManager?.playSFX('buttonClick');
            self.navigateTo('profile-screen');
        });
        addTopBarHoverAudio($btnProfile);

        // Botão Decks
        const $btnDecks = $('#top-bar-btn-decks');
        $btnDecks.off('click.uimanager').on('click.uimanager', () => {
            self.#audioManager?.playSFX('buttonClick');
            self.navigateTo('deck-management-screen');
        });
        addTopBarHoverAudio($btnDecks);

        // Botão Conectar
        const $btnConnect = $('#top-bar-btn-connect');
        $btnConnect.off('click.uimanager').on('click.uimanager', () => {
            self.#audioManager?.playSFX('buttonClick');
            self.navigateTo('connect-screen');
        });
        addTopBarHoverAudio($btnConnect);

        // Botão Opções
        const $btnOptions = $('#top-bar-btn-options');
        $btnOptions.off('click.uimanager').on('click.uimanager', () => {
            self.#audioManager?.playSFX('buttonClick');
            self.navigateTo('options-screen');
        });
        addTopBarHoverAudio($btnOptions);

        // Botão Logout
        const $btnLogout = $('#top-bar-btn-logout');
        $btnLogout.off('click.uimanager').on('click.uimanager', () => {
            console.log("Top Bar: Logout button clicked.");
            self.#audioManager?.playSFX('buttonClick');
            self.#audioManager?.stopBGM();
            self.#accountManager.logout();
            self.hideTopBar();
            $('#screens-container').removeClass('with-top-bar');
            self.navigateTo('title-screen'); // Irá para a tela de título (permitido sem login)
            console.log("UI Coordinator: Logged out, navigating to Title Screen.");
        });
        addTopBarHoverAudio($btnLogout);

        // Listener global de ESC (mantido, principalmente para ZoomHandler)
        $(document).off('keydown.uimclose').on('keydown.uimclose', (e) => {
            if (e.key === "Escape") {
                // Deixar ZoomHandler tratar o fechamento do zoom.
                // Opcionalmente, pode adicionar lógica de fechar menus/popups aqui.
            }
        });
    }

} // End class UIManager (Coordinator)