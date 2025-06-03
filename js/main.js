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
import { generateStoreScreenHTML } from './ui/html-templates/StoreScreenTemplate.js'; // Corrigido: StoreScreenTemplate.js
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
            .append(generateBoosterOpeningTemplate());

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
        if (!cardDatabase || Object.keys(cardDatabase).length === 0) { // Checagem adicionada para cardDatabase vazio
            const $splashError = $('#splash-screen');
             if ($splashError.length && ($splashError.hasClass('active') || $screensContainer.children().length <= 1)) {
                 $splashError.text('Erro Crítico: Falha ao carregar cartas ou banco de dados de cartas vazio. Recarregue.').css('color', 'salmon');
                 $('.screen').not($splashError).removeClass('active');
             } else {
                 console.error("CRITICAL: Failed to load card definitions or card database is empty AND splash screen not found/active!");
                 $screensContainer.html('<p style="color:red; font-weight:bold;">Erro Crítico: Falha ao carregar cartas ou banco de dados de cartas vazio.</p>');
             }
            console.error("CRITICAL: Failed to load card definitions or card database is empty!");
            return;
        }

        const screenManager = new ScreenManager();
        const accountManager = new AccountManager();
        const audioManager = new AudioManager();
        const uiManager = new UIManager(screenManager, accountManager, cardDatabase, audioManager);

        // --- Initial Screen & Splash Transition ---
        console.log("MAIN: Showing splash screen...");
        setTimeout(() => $('#splash-screen').addClass('loading'), 50);

        console.log("MAIN: Setting timeout for screen transition (3000ms)...");
        setTimeout(async () => {
            console.log("MAIN: Timeout finished. Checking login state...");
            const $splashScreen = $('#splash-screen');

            try {
                const currentUser = accountManager.getCurrentUser();

                 if ($splashScreen.hasClass('active')) {
                     $splashScreen.removeClass('active loading');
                     console.log("MAIN: Splash screen deactivated.");
                 }

                if (currentUser) {
                    console.log(`MAIN: User '${currentUser.username}' found. Preparing Home Screen.`);
                    uiManager.showTopBar(currentUser);
                    $('#screens-container').addClass('with-top-bar');
                    await uiManager.navigateTo('home-screen');
                } else {
                    console.log("MAIN: No user found. Preparing Title Screen.");
                    uiManager.hideTopBar();
                    $('#screens-container').removeClass('with-top-bar');
                    uiManager.navigateTo('title-screen');
                }
                console.log("MAIN: Initial screen setup complete via navigateTo.");
            } catch (error) {
                console.error("MAIN: Error inside setTimeout callback:", error);
                console.log("MAIN: Fallback - Showing title-screen due to error.");
                 uiManager.hideTopBar();
                 $('#screens-container').removeClass('with-top-bar');
                 if ($splashScreen.hasClass('active')) {
                    $splashScreen.removeClass('active loading');
                 }
                uiManager.navigateTo('title-screen');
            }
        }, 3000);


        // --- Global UI Bindings ---
        const addAudioListeners = ($element, sfxClick = 'buttonClick', sfxHover = 'buttonHover') => {
            $element.off('click.uisfx mouseenter.uisfx');
            $element.on('click.uisfx', () => audioManager?.playSFX(sfxClick));
            $element.on('mouseenter.uisfx', () => audioManager?.playSFX(sfxHover));
        };

        const $btnBackToTitle = $('#btn-create-back-to-title, #btn-login-back-to-title');
        $btnBackToTitle.on('click', () => {
            $('#create-account-message, #login-message').text('');
            uiManager.navigateTo('title-screen');
        });
        $btnBackToTitle.each((i, btn) => addAudioListeners($(btn)));

        $('#create-account-form').on('submit', (event) => {
            event.preventDefault();
            audioManager.playSFX('buttonClick');
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
                        uiManager.navigateTo('login-screen');
                    }
                 }, 2000);
            } else {
                $form.closest('.form-container')?.addClass('form-shake');
                setTimeout(() => $form.closest('.form-container')?.removeClass('form-shake'), 600);
                audioManager.playSFX('createAccountError');
            }
        });
        $('#create-account-form button').each((i, btn) => addAudioListeners($(btn)));

        $('#login-form').on('submit', async (event) => {
            event.preventDefault();
            audioManager.playSFX('buttonClick');
            const $form = $(event.currentTarget);
            const u = $('#login-username').val().trim();
            const p = $('#login-password').val();
            const $m = $('#login-message');
            const r = accountManager.login(u, p);
            $m.text(r.message).css('color', r.success ? 'lightgreen' : 'salmon');
            if (r.success) {
                $form[0].reset();
                uiManager.showTopBar(r.user);
                $('#screens-container').addClass('with-top-bar');
                await uiManager.navigateTo('home-screen');
            } else {
                $form.closest('.form-container')?.addClass('form-shake');
                setTimeout(() => $form.closest('.form-container')?.removeClass('form-shake'), 600);
                audioManager.playSFX('loginError');
            }
        });
         $('#login-form button').each((i, btn) => addAudioListeners($(btn)));

         const $btnOptionsBack = $('#btn-options-back-to-main');
         $btnOptionsBack.on('click', () => uiManager.navigateTo('home-screen'));
         addAudioListeners($btnOptionsBack);

         const $btnDeckBuilderBack = $('#btn-deck-builder-back');
         $btnDeckBuilderBack.on('click', () => uiManager.navigateTo('deck-management-screen'));
         addAudioListeners($btnDeckBuilderBack);

         const $btnConnectBack = $('#btn-connect-back-to-main');
         $btnConnectBack.on('click', () => uiManager.navigateTo('home-screen'));
         addAudioListeners($btnConnectBack);

         const $btnSaveOptions = $('#btn-save-options');
         $btnSaveOptions.on('click', () => {
             // A lógica de salvar foi movida para OptionsUI._saveOptions
             // UIManager.saveOptions() não é mais usado diretamente para salvar.
             // O evento de clique no botão já está tratado em OptionsUI._bindEvents
             // que chama OptionsUI._saveOptions.
             // Apenas para garantir que o som seja tocado se o botão estiver fora do escopo de OptionsUI:
             audioManager.playSFX('buttonClick');
             // Em um cenário ideal, OptionsUI lidaria com seu próprio som de clique no botão salvar.
             // Mas se UIManager gerencia o botão de salvar DE FORA, este som é ok.
             // Se OptionsUI gerencia o botão, este addAudioListeners pode ser removido.
             // Pelo código de OptionsUI, ele já tem seu próprio bind para o saveButton.
         });
         // addAudioListeners($btnSaveOptions); // Provavelmente não necessário aqui, OptionsUI deve lidar.

        // --- Game Initialization Logic & Connect Screen Bindings ---
        let gameInstance = null;

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
             if (!opponentDeckIds || opponentDeckIds.length < 30 || opponentDeckIds.length > 40) { // <<< ADICIONADO CHECK DE MAX 40 PARA IA TAMBÉM
                 console.warn(`MAIN: Opponent deck '${opponentDeckId}' invalid or not found (length: ${opponentDeckIds?.length}), using fallback.`);
                 const allCardIds = Object.keys(cardDatabase);
                 const requiredDeckSize = 30;

                 if (allCardIds.length > 0) {
                     opponentDeckIds = [];
                     const shuffledUniqueIds = allCardIds.sort(() => 0.5 - Math.random());
                     for (let i = 0; i < requiredDeckSize; i++) {
                         opponentDeckIds.push(shuffledUniqueIds[i % shuffledUniqueIds.length]);
                     }
                     console.log(`MAIN: Using fallback opponent deck with ${requiredDeckSize} cards.`);
                 } else {
                     console.error("MAIN: Cannot create fallback opponent deck! No card definitions loaded.");
                     $('#connect-message').text('Erro Crítico: Nenhuma definição de carta carregada.').css('color', 'salmon');
                     audioManager.playSFX('genericError');
                     return;
                 }
             } else {
                 console.log(`MAIN: Using opponent deck '${opponentDeckId}' (${opponentDeckIds.length} cards).`);
             }
             console.log(`MAIN: Preparing ${currentUser.username} vs ${opponentUsername}`);

             try {
                 gameInstance = new Game(cardDatabase);
                 // Player 1 (Local) é 'currentUser'
                 const player1 = gameInstance.addPlayer(currentUser.username, localPlayerDeckIds);
                 // Player 2 (IA)
                 const player2_IA = gameInstance.addPlayer(opponentUsername, opponentDeckIds); // opponentUsername é "Opponent_AI"

                 // Validação se ambos os jogadores foram adicionados com sucesso
                 if (!player1 || !player2_IA) {
                     console.error("MAIN: Falha ao adicionar um ou ambos os jogadores à instância do jogo.");
                     // Log específico para qual jogador falhou
                     if (!player1) console.error("MAIN: Falha ao adicionar player1 (humano). Deck ou nome inválido?");
                     if (!player2_IA) console.error("MAIN: Falha ao adicionar player2_IA. Deck ou nome inválido?");
                     throw new Error("Falha ao adicionar jogadores ao GameInstance.");
                 }
                 console.log(`MAIN: Player 1 (Human): ${player1.name}, ID: ${player1.id}`);
                 console.log(`MAIN: Player 2 (AI): ${player2_IA.name}, ID: ${player2_IA.id}`);

                 uiManager.setGameInstance(gameInstance);
                 // --- CORREÇÃO CRÍTICA ---
                 // O jogador local para a UI é player1 (o currentUser)
                 uiManager.setLocalPlayer(player1.id);
                 // ------------------------
                 console.log(`MAIN: Local player ID set in UIManager: ${player1.id}`);


                 if (gameInstance.setupGame()) { // setupGame agora deve ter 2 jogadores
                     gameInstance.startGame();
                     uiManager.renderInitialGameState();
                     console.log("MAIN: Game started successfully! Showing Battle Screen.");
                     $('#connect-message').text('');
                     screenManager.showScreen('battle-screen');
                     audioManager.playBGM('battle-screen');
                 } else {
                     // setupGame falhou, provavelmente porque this.#players.length ainda não é 2.
                     // Isso indicaria que o erro está em addPlayer não funcionando como esperado
                     // ou a verificação de !player1 || !player2_IA não capturou o problema.
                     console.error("MAIN: gameInstance.setupGame() returned false. Players in game:", gameInstance.getPlayersForDebug ? gameInstance.getPlayersForDebug() : "N/A");
                     throw new Error("Falha na configuração inicial do jogo (Game.setupGame() falhou).");
                 }
             } catch (error) {
                 console.error("MAIN: Error during game initialization or setup:", error);
                 $('#connect-message').text(`Erro ao iniciar: ${error.message}`).css('color', 'salmon');
                 audioManager.playSFX('genericError');
                 gameInstance = null;
             }
        }

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

        console.log("Runebound Clash UI Ready (v2.7 - UIManager Navigation, Game Init Fix Attempt).");

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