// js/main.js - ATUALIZADO (v2.5 - AudioManager + Splash Fix)

// --- Imports ---
// Core Modules
import Game from './core/Game.js';
import UIManager from './ui/UIManager.js';
import ScreenManager from './ui/ScreenManager.js';
import AccountManager from './account/AccountManager.js';
import AudioManager from './audio/AudioManager.js'; // <<<=== Importado AudioManager
import { loadCardDefinitions } from './utils.js';

// --- HTML Template Imports ---
import { generateSplashScreenHTML } from './ui/html-templates/splashScreenTemplate.js';
import { generateTitleScreenHTML } from './ui/html-templates/titleScreenTemplate.js';
import { generateLoginScreenHTML } from './ui/html-templates/loginScreenTemplate.js';
import { generateCreateAccountScreenHTML } from './ui/html-templates/createAccountScreenTemplate.js';
import { generateHomeScreenHTML } from './ui/html-templates/homeScreenTemplate.js';
import { generateProfileScreenHTML } from './ui/html-templates/profileScreenTemplate.js';
import { generateDeckManagementScreenHTML } from './ui/html-templates/deckManagementScreenTemplate.js';
import { generateConnectScreenHTML } from './ui/html-templates/connectScreenTemplate.js';
import { generateDeckBuilderScreenHTML } from './ui/html-templates/deckBuilderScreenTemplate.js';
import { generateOptionsScreenHTML } from './ui/html-templates/optionsScreenTemplate.js';
import { generateBattleScreenHTML } from './ui/html-templates/battleScreenTemplate.js';
import { generateTopBarHTML } from './ui/html-templates/topBarTemplate.js';


// --- Document Ready ---
$(document).ready(async () => { // Marcado como async para permitir awaits internos
    console.log("Runebound Clash - Initializing (Dynamic HTML)...");

    // --- STEP 1: Build HTML Structure Dynamically ---
    console.log("MAIN: Generating HTML structure...");
    const $screensContainer = $('#screens-container'); // Container principal das telas
    const $body = $('body');                           // Body para adicionar a Top Bar

    // Verificação crítica: garante que o container existe
    if (!$screensContainer.length) {
        console.error("CRITICAL ERROR: #screens-container div not found in index.html! Cannot generate UI.");
        $body.empty().css({
            'background-color': '#333', 'color': 'red', 'display': 'flex',
            'justify-content': 'center', 'align-items': 'center', 'height': '100vh',
            'font-size': '1.5em', 'padding': '20px', 'text-align': 'center'
        }).html('<h1>Erro Crítico</h1><p>A estrutura base do HTML (index.html) parece estar faltando o elemento <code><div id="screens-container"></div></code>. A aplicação não pode iniciar.</p>');
        return; // Para a execução
    }

    try {
        // Gera e anexa o HTML de cada tela ao container
        $screensContainer.empty() // Limpa qualquer conteúdo estático
            .append(generateSplashScreenHTML())          // Splash Screen PRIMEIRO
            .append(generateTitleScreenHTML())           // Tela de Título
            .append(generateLoginScreenHTML())           // Tela de Login
            .append(generateCreateAccountScreenHTML())   // Tela de Criar Conta
            .append(generateHomeScreenHTML())            // Tela Inicial (Notícias)
            .append(generateProfileScreenHTML())         // Tela de Perfil (Simplificada)
            .append(generateDeckManagementScreenHTML()) // Adiciona Nova Tela de Decks/Coleção
            .append(generateConnectScreenHTML())         // Tela de Conexão
            .append(generateDeckBuilderScreenHTML())     // Tela do Construtor de Decks
            .append(generateOptionsScreenHTML())         // Tela de Opções
            .append(generateBattleScreenHTML());         // Tela de Batalha

        // Adiciona a Top Bar no início do body, fora do container de telas
        $body.prepend(generateTopBarHTML());

        console.log("MAIN: HTML Structure dynamically generated.");

    } catch (htmlGenError) {
         console.error("MAIN: Critical error during HTML generation from templates:", htmlGenError);
         // Tenta mostrar erro na splash screen ou no container principal
         const $splash = $('#splash-screen');
         if ($splash.length && ($splash.hasClass('active') || $screensContainer.children().length <= 1)) {
             $splash.addClass('active').html(`<p style="color:red; font-weight:bold;">Erro Crítico na Geração da UI: ${htmlGenError.message}. Recarregue.</p>`);
             $('.screen').not($splash).removeClass('active');
         } else {
             $screensContainer.html(`<p style="color:red; font-weight:bold;">Erro Crítico na Geração da UI: ${htmlGenError.message}. Recarregue.</p>`);
         }
         return; // Para a execução
    }
    // --- END STEP 1 ---


    // --- STEP 2: Initialize Modules and Logic ---
    console.log("MAIN: Initializing modules and binding events...");
    try { // Envolve a inicialização principal em try...catch
        // --- Module Initialization ---
        const cardDatabase = loadCardDefinitions(); // Carrega definições de cartas
        if (!cardDatabase) {
            // Trata erro crítico se as cartas não puderem ser carregadas
            const $splashError = $('#splash-screen');
             if ($splashError.length && ($splashError.hasClass('active') || $screensContainer.children().length <= 1)) {
                 $splashError.text('Erro Crítico: Falha ao carregar cartas. Recarregue.').css('color', 'salmon');
                 $('.screen').not($splashError).removeClass('active');
             } else {
                 console.error("CRITICAL: Failed to load card definitions AND splash screen not found/active!");
                 $screensContainer.html('<p style="color:red; font-weight:bold;">Erro Crítico: Falha ao carregar cartas.</p>');
             }
            console.error("CRITICAL: Failed to load card definitions!");
            return; // Para a execução
        }

        // Inicializa os gerenciadores APÓS o HTML ser gerado
        const screenManager = new ScreenManager();
        const accountManager = new AccountManager();
        const audioManager = new AudioManager(); // <<<=== Instancia AudioManager
        // UIManager agora recebe AudioManager
        const uiManager = new UIManager(screenManager, accountManager, cardDatabase, audioManager); // <<<=== Passado para UIManager

        // --- Initial Screen & Splash Transition ---
        console.log("MAIN: Showing splash screen...");
        setTimeout(() => $('#splash-screen').addClass('loading'), 50);

        console.log("MAIN: Setting timeout for screen transition (3000ms)...");
        setTimeout(async () => {
            console.log("MAIN: Timeout finished. Checking login state...");
            const $splashScreen = $('#splash-screen');
            let initialScreenId = 'title-screen'; // Tela padrão se não logado

            try {
                const currentUser = accountManager.getCurrentUser();
                if (currentUser) {
                    // --- Logged In Flow ---
                    console.log(`MAIN: User '${currentUser.username}' found. Showing Top Bar and Home Screen.`);
                    uiManager.showTopBar(currentUser);
                    $('#screens-container').addClass('with-top-bar');

                    // Remove 'active' da splash ANTES de mostrar a próxima
                    if ($splashScreen.hasClass('active')) {
                        $splashScreen.removeClass('active loading');
                        console.log("MAIN: Splash screen deactivated for logged-in flow.");
                    }

                    await uiManager.renderHomeScreen();
                    screenManager.showScreen('home-screen');
                    initialScreenId = 'home-screen'; // Atualiza tela inicial para tocar BGM correta

                } else {
                    // --- Logged Out Flow ---
                    console.log("MAIN: No user found. Showing title-screen.");
                    uiManager.hideTopBar();
                    $('#screens-container').removeClass('with-top-bar');

                    // Remove 'active' da splash ANTES de mostrar a próxima
                    if ($splashScreen.hasClass('active')) {
                        $splashScreen.removeClass('active loading');
                        console.log("MAIN: Splash screen deactivated for logged-out flow.");
                    }

                    screenManager.showScreen('title-screen');
                    initialScreenId = 'title-screen'; // Confirma tela inicial para tocar BGM
                }

                // <<<=== Tocar BGM inicial AQUI ===>>>
                console.log(`MAIN: Playing initial BGM for screen: ${initialScreenId}`);
                audioManager.playBGM(initialScreenId);
                // <<<==============================>>>

                console.log("MAIN: Initial screen setup complete.");
            } catch (error) {
                console.error("MAIN: Error inside setTimeout callback:", error);
                // Fallback
                console.log("MAIN: Fallback - Showing title-screen due to error.");
                 uiManager.hideTopBar();
                 $('#screens-container').removeClass('with-top-bar');

                 // Garante que splash saia no fallback também
                 if ($splashScreen.hasClass('active')) {
                    $splashScreen.removeClass('active loading');
                    console.log("MAIN: Splash screen deactivated on error fallback.");
                 }

                screenManager.showScreen('title-screen');
                // Tocar BGM da title screen no fallback
                audioManager.playBGM('title-screen');
            }
        }, 3000); // Delay


        // --- Global UI Bindings ---
        // Adiciona listeners de áudio aos botões da Title Screen
        const addTitleAudioListeners = ($element, sfxClick = 'buttonClick', sfxHover = 'buttonHover') => {
            $element.off('click.titleaudio').on('click.titleaudio', () => audioManager?.playSFX(sfxClick));
            $element.off('mouseenter.titleaudio').on('mouseenter.titleaudio', () => audioManager?.playSFX(sfxHover));
        };

        // Ações da Tela de Título
        const $btnLogin = $('#btn-goto-login');
        $btnLogin.on('click', () => screenManager.showScreen('login-screen'));
        addTitleAudioListeners($btnLogin);

        const $btnCreate = $('#btn-goto-create-account');
        $btnCreate.on('click', () => screenManager.showScreen('create-account-screen'));
        addTitleAudioListeners($btnCreate);

        const $btnOptionsIcon = $('#btn-goto-options-icon');
        $btnOptionsIcon.on('click', () => {
             uiManager.renderOptionsScreen();
             screenManager.showScreen('options-screen');
             audioManager.playBGM('options-screen'); // Toca BGM ao ir para opções
        });
        addTitleAudioListeners($btnOptionsIcon);

        // Botões "Voltar" das telas de Login/Criar Conta
        const $btnBackToTitle = $('#btn-create-back-to-title, #btn-login-back-to-title');
        $btnBackToTitle.on('click', () => {
            $('#create-account-message, #login-message').text('');
            screenManager.showScreen('title-screen');
            audioManager.playBGM('title-screen'); // Toca BGM ao voltar
        });
        $btnBackToTitle.each((i, btn) => addTitleAudioListeners($(btn)));


        // Submissão do Formulário de Criar Conta
        $('#create-account-form').on('submit', (event) => {
            event.preventDefault();
            audioManager.playSFX('buttonClick'); // Som de clique no submit
            const $form = $(event.currentTarget);
            const u = $('#create-username').val().trim();
            const p = $('#create-password').val();
            const $m = $('#create-account-message');
            const r = accountManager.createAccount(u, p);
            $m.text(r.message).css('color', r.success ? 'lightgreen' : 'salmon');

            if (r.success) {
                $form[0].reset();
                setTimeout(() => {
                    if (screenManager.getActiveScreenId() === 'create-account-screen') {
                        screenManager.showScreen('login-screen');
                        $m.text('');
                    }
                 }, 2000);
            } else {
                // Efeito de "shake"
                const $container = $form.closest('.form-container');
                if ($container.length) {
                    $container.addClass('form-shake');
                    setTimeout(() => $container.removeClass('form-shake'), 600);
                }
                audioManager.playSFX('createAccountError'); // <<<=== Toca SFX de erro
            }
        });
        // Adiciona hover aos botões do form
        $('#create-account-form button').each((i, btn) => addTitleAudioListeners($(btn)));


        // Submissão do Formulário de Login
        $('#login-form').on('submit', async (event) => {
            event.preventDefault();
            audioManager.playSFX('buttonClick'); // Som de clique no submit
            const $form = $(event.currentTarget);
            const u = $('#login-username').val().trim();
            const p = $('#login-password').val();
            const $m = $('#login-message');
            const r = accountManager.login(u, p);
            $m.text(r.message).css('color', r.success ? 'lightgreen' : 'salmon');

            if (r.success) {
                $form[0].reset();
                // --- Login Success Flow ---
                uiManager.showTopBar(r.user);
                $('#screens-container').addClass('with-top-bar');
                await uiManager.renderHomeScreen();
                screenManager.showScreen('home-screen');
                audioManager.playBGM('home-screen'); // Toca BGM da Home após login
                // --- Fim Login Success Flow ---
            } else {
                // Efeito de "shake"
                const $container = $form.closest('.form-container');
                if ($container.length) {
                    $container.addClass('form-shake');
                    setTimeout(() => $container.removeClass('form-shake'), 600);
                }
                audioManager.playSFX('loginError'); // <<<=== Toca SFX de erro
            }
        });
         // Adiciona hover aos botões do form
         $('#login-form button').each((i, btn) => addTitleAudioListeners($(btn)));


        // --- Top Bar Navigation ---
        // Tratada em UIManager._bindPermanentUIActions, que agora toca BGM/SFX

        // --- Other Screen Back Buttons ---
         const $btnOptionsBack = $('#btn-options-back-to-main');
         $btnOptionsBack.on('click', () => {
              screenManager.goBack('home-screen');
              // AudioManager tocará a BGM correta baseado na tela que for mostrada
              // É mais seguro deixar o handler de navegação (UIManager) controlar a BGM
         });
         addTitleAudioListeners($btnOptionsBack); // Adiciona sons básicos

         const $btnDeckBuilderBack = $('#btn-deck-builder-back');
         $btnDeckBuilderBack.on('click', () => {
             console.log("MAIN: Deck Builder back button clicked, going to Deck Management.");
             uiManager.renderDeckManagementScreen();
             screenManager.showScreen('deck-management-screen');
             audioManager.playBGM('deck-management-screen'); // Toca BGM dos decks
         });
         addTitleAudioListeners($btnDeckBuilderBack);

         const $btnConnectBack = $('#btn-connect-back-to-main');
         $btnConnectBack.on('click', () => {
              screenManager.showScreen('home-screen');
              audioManager.playBGM('home-screen'); // Toca BGM da Home
         });
         addTitleAudioListeners($btnConnectBack);


        // Botão Salvar Opções
         const $btnSaveOptions = $('#btn-save-options');
         $btnSaveOptions.on('click', () => {
             uiManager.saveOptions(); // UIManager agora chama save e atualiza audioManager
             // O som de clique é adicionado abaixo
         });
         addTitleAudioListeners($btnSaveOptions); // Adiciona som básico


        // --- Game Initialization Logic & Connect Screen Bindings ---
        let gameInstance = null;

        /** Função para inicializar e começar uma nova partida (Simulada/Local) */
        function initializeAndStartGame(localPlayerDeckId, opponentUsername = "Opponent_AI", opponentDeckId = 'default_deck_1') {
             console.log("MAIN: Initializing game...");
             const currentUser = accountManager.getCurrentUser();
             if (!currentUser) { /* ... (erro login) ... */ return; }

             const localDecks = accountManager.loadDecks();
             const localDeck = localDecks?.[localPlayerDeckId];

             // Valida deck local
             if (!localDeck?.cards || localDeck.cards.length < 30 || localDeck.cards.length > 40) {
                 console.error(`MAIN: Local deck '${localDeck?.name || localPlayerDeckId}' is invalid (needs 30-40 cards). Found: ${localDeck?.cards?.length}`);
                 $('#connect-message').text(`Erro: Deck '${localDeck?.name || localPlayerDeckId}' inválido (precisa de 30-40 cartas).`).css('color', 'salmon');
                 audioManager.playSFX('genericError'); // Som de erro genérico
                 return;
             }
             const localPlayerDeckIds = localDeck.cards;
             console.log(`MAIN: Local Deck '${localDeck.name}' (${localPlayerDeckIds.length} cards) found.`);

             // Simulação/Fallback de Deck do Oponente
             let opponentDeckIds = accountManager.getUserData("Opponent_AI")?.decks?.[opponentDeckId]?.cards;
             if (!opponentDeckIds || opponentDeckIds.length < 30) {
                 console.warn(`MAIN: Opponent deck '${opponentDeckId}' invalid or not found, using fallback.`);
                 const allCardIds = Object.keys(cardDatabase);
                 if (allCardIds.length >= 30) {
                     opponentDeckIds = allCardIds.sort(() => 0.5 - Math.random()).slice(0, 30);
                     console.log(`MAIN: Using fallback opponent deck with 30 random cards.`);
                 } else {
                     console.error("MAIN: Cannot create fallback opponent deck! Insufficient card definitions.");
                     $('#connect-message').text('Erro Crítico: Definições de cartas insuficientes para o oponente.').css('color', 'salmon');
                     audioManager.playSFX('genericError');
                     return;
                 }
             } else {
                 console.log(`MAIN: Using opponent deck '${opponentDeckId}'.`);
             }
             console.log(`MAIN: Preparing ${currentUser.username} vs ${opponentUsername}`);

             // Inicia a instância do Jogo
             try {
                 gameInstance = new Game(cardDatabase);
                 const player1 = gameInstance.addPlayer(currentUser.username, localPlayerDeckIds);
                 const player2 = gameInstance.addPlayer(opponentUsername, opponentDeckIds);

                 if (!player1 || !player2) {
                      throw new Error("Falha ao adicionar jogadores. Verifique os decks e logs.");
                 }

                 uiManager.setGameInstance(gameInstance);
                 uiManager.setLocalPlayer(player1.id);

                 if (gameInstance.setupGame()) {
                     gameInstance.startGame();
                     uiManager.renderInitialGameState();
                     console.log("MAIN: Game started successfully!");
                     $('#connect-message').text('');
                     screenManager.showScreen('battle-screen');
                     audioManager.playBGM('battle-screen'); // <<<=== Toca BGM da Batalha
                 } else {
                     throw new Error("Falha na configuração inicial do jogo.");
                 }
             } catch (error) {
                 console.error("MAIN: Error during game initialization:", error);
                 $('#connect-message').text(`Erro ao iniciar: ${error.message}`).css('color', 'salmon');
                 audioManager.playSFX('genericError'); // Som de erro
                 gameInstance = null;
             }
        } // Fim de initializeAndStartGame

        // Botões da Tela Connect (Simulando Início de Jogo)
         const $btnCreateServer = $('#btn-create-server');
         $btnCreateServer.on('click', () => {
            $('#join-game-section').hide(); $('#server-status-section').show(); $('#server-ip-code').text('SIMULANDO...'); $('#connect-message').text('Simulando... Iniciando Jogo Solo.');
            const decks = accountManager.loadDecks();
            const firstValidDeckId = decks ? Object.keys(decks).find(id => decks[id]?.cards?.length >= 30 && decks[id]?.cards?.length <= 40) : null;
            if (!firstValidDeckId) {
                 $('#connect-message').text('Erro: Nenhum deck válido (30-40 cartas). Crie/Edite nos Decks.').css('color', 'salmon');
                 $('#server-status-section').hide();
                 audioManager.playSFX('genericError');
                 return;
            }
            setTimeout(() => initializeAndStartGame(firstValidDeckId), 500);
        });
         addTitleAudioListeners($btnCreateServer); // Adiciona sons básicos

         const $btnShowJoin = $('#btn-show-join-options');
         $btnShowJoin.on('click', () => {
             $('#server-status-section').hide();
             $('#join-game-section').show();
             $('#connect-message').text('');
         });
         addTitleAudioListeners($btnShowJoin);

         const $btnConnectServer = $('#btn-connect-to-server');
         $btnConnectServer.on('click', () => {
            const code = $('#opponent-ip').val().trim();
            $('#connect-message').text(`Simulando conexão com ${code || 'host'}... Iniciando Jogo Solo.`);
            const decks = accountManager.loadDecks();
            const firstValidDeckId = decks ? Object.keys(decks).find(id => decks[id]?.cards?.length >= 30 && decks[id]?.cards?.length <= 40) : null;
             if (!firstValidDeckId) {
                 $('#connect-message').text('Erro: Nenhum deck válido (30-40 cartas). Crie/Edite nos Decks.').css('color', 'salmon');
                 audioManager.playSFX('genericError');
                 return;
             }
            setTimeout(() => initializeAndStartGame(firstValidDeckId), 500);
        });
         addTitleAudioListeners($btnConnectServer);

        const $btnCancelHost = $('#btn-cancel-hosting');
        $btnCancelHost.on('click', () => {
             $('#server-status-section').hide();
             $('#connect-message').text('Criação cancelada.');
         });
         addTitleAudioListeners($btnCancelHost);


        // --- Final Log ---
        console.log("Runebound Clash UI Ready (v2.5 - AudioManager).");

    } catch (initError) {
        console.error("MAIN: Critical initialization error:", initError);
         // Mostra erro crítico na splash screen ou no container
         const $splashSevereError = $('#splash-screen');
         if ($splashSevereError.length && ($splashSevereError.hasClass('active') || $screensContainer.children().length <= 1)) {
              $splashSevereError.text(`Erro Crítico: ${initError.message}. Recarregue.`).css('color', 'red');
              $('.screen').removeClass('active');
              $splashSevereError.addClass('active');
         } else {
            $screensContainer.html(`<p style="color:red; font-weight:bold;">Erro Crítico de Inicialização: ${initError.message}. Recarregue.</p>`);
         }
    }
}); // --- END Document Ready ---