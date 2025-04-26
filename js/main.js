// js/main.js - ATUALIZADO (v2.7 - UIManager Navigation Integration)

// --- Imports ---
// Core Modules
import Game from './core/Game.js';
import UIManager from './ui/UIManager.js';
import ScreenManager from './ui/ScreenManager.js';
import AccountManager from './account/AccountManager.js';
import AudioManager from './audio/AudioManager.js';
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
import { generateSetCollectionHTML } from './ui/html-templates/setCollectionTemplate.js';
import { generateSetMasteryScreenHTML } from './ui/html-templates/setMasteryScreenTemplate.js';
import { generateStoreScreenHTML } from './ui/html-templates/StoreScreenTemplate.js';
import { generateBoosterOpeningTemplate } from './ui/html-templates/boosterOpeningTemplate.js';


// --- Document Ready ---
$(document).ready(async () => { // Marcado como async para permitir awaits internos
    console.log("Runebound Clash - Initializing (Dynamic HTML)...");

    // --- STEP 1: Build HTML Structure Dynamically ---
    console.log("MAIN: Generating HTML structure...");
    const $screensContainer = $('#screens-container'); // Container principal das telas
    const $body = $('body');                           // Body para adicionar a Top Bar

    if (!$screensContainer.length) {
        console.error("CRITICAL ERROR: #screens-container div not found in index.html! Cannot generate UI.");
        $body.empty().css({
            'background-color': '#333', 'color': 'red', 'display': 'flex',
            'justify-content': 'center', 'align-items': 'center', 'height': '100vh',
            'font-size': '1.5em', 'padding': '20px', 'text-align': 'center'
        }).html('<h1>Erro Crítico</h1><p>A estrutura base do HTML (index.html) parece estar faltando o elemento <code><div id="screens-container"></div></code>. A aplicação não pode iniciar.</p>');
        return;
    }

    try {
        $screensContainer.empty()
            .append(generateSplashScreenHTML())
            .append(generateTitleScreenHTML())
            .append(generateLoginScreenHTML())
            .append(generateCreateAccountScreenHTML())
            .append(generateHomeScreenHTML())
            .append(generateProfileScreenHTML())
            .append(generateDeckManagementScreenHTML())
            .append(generateConnectScreenHTML())
            .append(generateDeckBuilderScreenHTML())
            .append(generateOptionsScreenHTML())
            .append(generateBattleScreenHTML())
            .append(generateSetCollectionHTML())
            .append(generateSetMasteryScreenHTML())
            .append(generateStoreScreenHTML())
            .append(generateBoosterOpeningTemplate())

        $body.prepend(generateTopBarHTML());

        console.log("MAIN: HTML Structure dynamically generated.");

    } catch (htmlGenError) {
         console.error("MAIN: Critical error during HTML generation from templates:", htmlGenError);
         const $splash = $('#splash-screen');
         if ($splash.length && ($splash.hasClass('active') || $screensContainer.children().length <= 1)) {
             $splash.addClass('active').html(`<p style="color:red; font-weight:bold;">Erro Crítico na Geração da UI: ${htmlGenError.message}. Recarregue.</p>`);
             $('.screen').not($splash).removeClass('active');
         } else {
             $screensContainer.html(`<p style="color:red; font-weight:bold;">Erro Crítico na Geração da UI: ${htmlGenError.message}. Recarregue.</p>`);
         }
         return;
    }
    // --- END STEP 1 ---


    // --- STEP 2: Initialize Modules and Logic ---
    console.log("MAIN: Initializing modules and binding events...");
    try {
        // --- Module Initialization ---
        const cardDatabase = loadCardDefinitions();
        if (!cardDatabase) {
            const $splashError = $('#splash-screen');
             if ($splashError.length && ($splashError.hasClass('active') || $screensContainer.children().length <= 1)) {
                 $splashError.text('Erro Crítico: Falha ao carregar cartas. Recarregue.').css('color', 'salmon');
                 $('.screen').not($splashError).removeClass('active');
             } else {
                 console.error("CRITICAL: Failed to load card definitions AND splash screen not found/active!");
                 $screensContainer.html('<p style="color:red; font-weight:bold;">Erro Crítico: Falha ao carregar cartas.</p>');
             }
            console.error("CRITICAL: Failed to load card definitions!");
            return;
        }

        const screenManager = new ScreenManager(); // ScreenManager ainda é usado pelo UIManager
        const accountManager = new AccountManager();
        const audioManager = new AudioManager();
        // UIManager agora recebe AudioManager e gerencia a navegação principal
        const uiManager = new UIManager(screenManager, accountManager, cardDatabase, audioManager);

        // --- Initial Screen & Splash Transition ---
        console.log("MAIN: Showing splash screen...");
        // Mostra Splash imediatamente (assumindo que CSS a torna visível por padrão ou com classe 'active')
        // $('#splash-screen').addClass('active'); // Garante que está ativa
        setTimeout(() => $('#splash-screen').addClass('loading'), 50); // Inicia animação de loading

        console.log("MAIN: Setting timeout for screen transition (3000ms)...");
        setTimeout(async () => {
            console.log("MAIN: Timeout finished. Checking login state...");
            const $splashScreen = $('#splash-screen');

            try {
                const currentUser = accountManager.getCurrentUser();

                // Desativa splash ANTES de navegar para a próxima tela
                 if ($splashScreen.hasClass('active')) {
                     $splashScreen.removeClass('active loading');
                     console.log("MAIN: Splash screen deactivated.");
                 }

                if (currentUser) {
                    // --- Logged In Flow ---
                    console.log(`MAIN: User '${currentUser.username}' found. Preparing Home Screen.`);
                    uiManager.showTopBar(currentUser); // Mostra a barra superior
                    $('#screens-container').addClass('with-top-bar'); // Ajusta layout
                    await uiManager.navigateTo('home-screen'); // <<< USA NAVIGATE TO
                    // navigateTo agora lida com render, showScreen e playBGM internamente

                } else {
                    // --- Logged Out Flow ---
                    console.log("MAIN: No user found. Preparing Title Screen.");
                    uiManager.hideTopBar(); // Esconde a barra superior
                    $('#screens-container').removeClass('with-top-bar'); // Ajusta layout
                    uiManager.navigateTo('title-screen'); // <<< USA NAVIGATE TO
                     // navigateTo agora lida com render/init, showScreen e playBGM
                }

                console.log("MAIN: Initial screen setup complete via navigateTo.");
            } catch (error) {
                console.error("MAIN: Error inside setTimeout callback:", error);
                // Fallback
                console.log("MAIN: Fallback - Showing title-screen due to error.");
                 uiManager.hideTopBar();
                 $('#screens-container').removeClass('with-top-bar');

                 if ($splashScreen.hasClass('active')) {
                    $splashScreen.removeClass('active loading');
                    console.log("MAIN: Splash screen deactivated on error fallback.");
                 }
                // Usa navigateTo para garantir consistência no fallback também
                uiManager.navigateTo('title-screen');
            }
        }, 3000); // Delay


        // --- Global UI Bindings ---
        // Helper para adicionar sons de UI (mantido para botões que não navegam via UIManager ou precisam de hover)
        const addAudioListeners = ($element, sfxClick = 'buttonClick', sfxHover = 'buttonHover') => {
            $element.off('click.uisfx mouseenter.uisfx'); // Usa namespace para evitar conflito
            $element.on('click.uisfx', () => audioManager?.playSFX(sfxClick));
            $element.on('mouseenter.uisfx', () => audioManager?.playSFX(sfxHover));
        };

       


        // --- Botões "Voltar" das telas de Login/Criar Conta ---
        // ATUALIZADO: Usa uiManager.navigateTo
        const $btnBackToTitle = $('#btn-create-back-to-title, #btn-login-back-to-title');
        $btnBackToTitle.on('click', () => {
            $('#create-account-message, #login-message').text(''); // Limpa mensagens
            uiManager.navigateTo('title-screen');
        });
        $btnBackToTitle.each((i, btn) => addAudioListeners($(btn))); // Mantém sons de UI


        // --- Submissão do Formulário de Criar Conta ---
        $('#create-account-form').on('submit', (event) => {
            event.preventDefault();
            audioManager.playSFX('buttonClick'); // Som explícito no submit
            const $form = $(event.currentTarget);
            const u = $('#create-username').val().trim();
            const p = $('#create-password').val();
            const $m = $('#create-account-message');
            const r = accountManager.createAccount(u, p);
            $m.text(r.message).css('color', r.success ? 'lightgreen' : 'salmon');

            if (r.success) {
                $form[0].reset();
                setTimeout(() => {
                    // Verifica se ainda está na tela antes de navegar
                    if (screenManager.getActiveScreenId() === 'create-account-screen') {
                        uiManager.navigateTo('login-screen'); // <<< USA NAVIGATE TO
                    }
                 }, 2000);
            } else {
                const $container = $form.closest('.form-container');
                if ($container.length) {
                    $container.addClass('form-shake');
                    setTimeout(() => $container.removeClass('form-shake'), 600);
                }
                audioManager.playSFX('createAccountError');
            }
        });
        $('#create-account-form button').each((i, btn) => addAudioListeners($(btn))); // Adiciona sons


        // --- Submissão do Formulário de Login ---
        $('#login-form').on('submit', async (event) => { // Login é async por causa do navigateTo
            event.preventDefault();
            audioManager.playSFX('buttonClick'); // Som explícito no submit
            const $form = $(event.currentTarget);
            const u = $('#login-username').val().trim();
            const p = $('#login-password').val();
            const $m = $('#login-message');
            const r = accountManager.login(u, p);
            $m.text(r.message).css('color', r.success ? 'lightgreen' : 'salmon');

            if (r.success) {
                $form[0].reset();
                // --- Login Success Flow ---
                uiManager.showTopBar(r.user); // Configura Top Bar
                $('#screens-container').addClass('with-top-bar'); // Ajusta Layout
                await uiManager.navigateTo('home-screen'); // <<< USA NAVIGATE TO
                // --- Fim Login Success Flow ---
            } else {
                const $container = $form.closest('.form-container');
                if ($container.length) {
                    $container.addClass('form-shake');
                    setTimeout(() => $container.removeClass('form-shake'), 600);
                }
                audioManager.playSFX('loginError');
            }
        });
         $('#login-form button').each((i, btn) => addAudioListeners($(btn))); // Adiciona sons


        // --- Top Bar Navigation ---
        // É tratada em UIManager._bindPermanentUIActions, que agora usa navigateTo.

        // --- Other Screen Back Buttons ---
        // ATUALIZADO: Usa uiManager.navigateTo
         const $btnOptionsBack = $('#btn-options-back-to-main');
         $btnOptionsBack.on('click', () => {
              uiManager.navigateTo('home-screen'); // Volta para Home (ajuste se necessário)
         });
         addAudioListeners($btnOptionsBack); // Adiciona sons

         const $btnDeckBuilderBack = $('#btn-deck-builder-back');
         $btnDeckBuilderBack.on('click', () => {
             console.log("MAIN: Deck Builder back button clicked.");
             uiManager.navigateTo('deck-management-screen'); // Volta para Gerenciamento
         });
         addAudioListeners($btnDeckBuilderBack); // Adiciona sons

         const $btnConnectBack = $('#btn-connect-back-to-main');
         $btnConnectBack.on('click', () => {
              uiManager.navigateTo('home-screen'); // Volta para Home
         });
         addAudioListeners($btnConnectBack); // Adiciona sons


        // --- Botão Salvar Opções ---
         const $btnSaveOptions = $('#btn-save-options');
         $btnSaveOptions.on('click', () => {
             uiManager.saveOptions(); // Delega para UIManager (que chama OptionsUI)
         });
         addAudioListeners($btnSaveOptions); // Adiciona som básico


        // --- Game Initialization Logic & Connect Screen Bindings ---
        let gameInstance = null;

        // Função mantida como estava, pois a inicialização do jogo é complexa
        function initializeAndStartGame(localPlayerDeckId, opponentUsername = "Opponent_AI", opponentDeckId = 'default_deck_1') {
             console.log("MAIN: Initializing game...");
             const currentUser = accountManager.getCurrentUser();
             if (!currentUser) {
                 $('#connect-message').text('Erro: Usuário não logado.').css('color', 'salmon');
                 audioManager.playSFX('genericError');
                 return;
             }

             const localDecks = accountManager.loadDecks();
             const localDeck = localDecks?.[localPlayerDeckId];

             if (!localDeck?.cards || localDeck.cards.length < 30 || localDeck.cards.length > 40) {
                 console.error(`MAIN: Local deck '${localDeck?.name || localPlayerDeckId}' is invalid (needs 30-40 cards). Found: ${localDeck?.cards?.length}`);
                 $('#connect-message').text(`Erro: Deck '${localDeck?.name || localPlayerDeckId}' inválido (precisa de 30-40 cartas).`).css('color', 'salmon');
                 audioManager.playSFX('genericError');
                 return;
             }
             const localPlayerDeckIds = localDeck.cards;
             console.log(`MAIN: Local Deck '${localDeck.name}' (${localPlayerDeckIds.length} cards) found.`);

             let opponentDeckIds = accountManager.getUserData("Opponent_AI")?.decks?.[opponentDeckId]?.cards;
             if (!opponentDeckIds || opponentDeckIds.length < 30) {
                 console.warn(`MAIN: Opponent deck '${opponentDeckId}' invalid or not found, using fallback.`);
                 const allCardIds = Object.keys(cardDatabase);
             const requiredDeckSize = 30; // Define the target size

             if (allCardIds.length > 0) { // Check if there are *any* cards
                 opponentDeckIds = [];
                 // Shuffle the available unique IDs
                 const shuffledUniqueIds = allCardIds.sort(() => 0.5 - Math.random());
                 // Add cards, cycling through unique IDs until the deck is full
                 for (let i = 0; i < requiredDeckSize; i++) {
                     opponentDeckIds.push(shuffledUniqueIds[i % shuffledUniqueIds.length]); // Use modulo to loop
                 }
                 console.log(`MAIN: Using fallback opponent deck with ${requiredDeckSize} cards (allowing duplicates).`);
             } else {
                 // This case should ideally not happen if card loading worked at all
                 console.error("MAIN: Cannot create fallback opponent deck! No card definitions loaded.");
                 $('#connect-message').text('Erro Crítico: Nenhuma definição de carta carregada.').css('color', 'salmon');
                 audioManager.playSFX('genericError');
                 return;
             }
             } else {
                 console.log(`MAIN: Using opponent deck '${opponentDeckId}'.`);
             }
             console.log(`MAIN: Preparing ${currentUser.username} vs ${opponentUsername}`);

             try {
                 gameInstance = new Game(cardDatabase);
                 const player1 = gameInstance.addPlayer(currentUser.username, localPlayerDeckIds);
                 const player2 = gameInstance.addPlayer(opponentUsername, opponentDeckIds);

                 if (!player1 || !player2) { throw new Error("Falha ao adicionar jogadores."); }

                 uiManager.setGameInstance(gameInstance);
                 uiManager.setLocalPlayer(player1.id);

                 if (gameInstance.setupGame()) {
                     gameInstance.startGame();
                     // --- ATENÇÃO: Transição para Battle Screen ---
                     // Mantendo a lógica original aqui, pois UIManager.navigateTo('battle-screen')
                     // foi desencorajado para a configuração inicial do jogo.
                     uiManager.renderInitialGameState(); // Renderiza o estado inicial da UI de batalha
                     console.log("MAIN: Game started successfully! Showing Battle Screen.");
                     $('#connect-message').text(''); // Limpa mensagens da tela de conexão
                     screenManager.showScreen('battle-screen'); // Mostra a tela de batalha
                     audioManager.playBGM('battle-screen'); // Toca a BGM da batalha
                     // --- Fim da Transição ---
                 } else {
                     throw new Error("Falha na configuração inicial do jogo.");
                 }
             } catch (error) {
                 console.error("MAIN: Error during game initialization:", error);
                 $('#connect-message').text(`Erro ao iniciar: ${error.message}`).css('color', 'salmon');
                 audioManager.playSFX('genericError');
                 gameInstance = null;
             }
        } // Fim de initializeAndStartGame

        // --- Botões da Tela Connect ---
        // Mantidos como estavam, chamando initializeAndStartGame
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
         addAudioListeners($btnCreateServer);

         const $btnShowJoin = $('#btn-show-join-options');
         $btnShowJoin.on('click', () => {
             $('#server-status-section').hide();
             $('#join-game-section').show();
             $('#connect-message').text('');
         });
         addAudioListeners($btnShowJoin);

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
         addAudioListeners($btnConnectServer);

        const $btnCancelHost = $('#btn-cancel-hosting');
        $btnCancelHost.on('click', () => {
             $('#server-status-section').hide();
             $('#connect-message').text('Criação cancelada.');
         });
         addAudioListeners($btnCancelHost);


        // --- Final Log ---
        console.log("Runebound Clash UI Ready (v2.7 - UIManager Navigation).");

    } catch (initError) {
        console.error("MAIN: Critical initialization error:", initError);
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