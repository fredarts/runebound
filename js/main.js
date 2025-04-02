// js/main.js

// --- Imports ---
// Core Modules
import Game from './core/Game.js';
import UIManager from './ui/UIManager.js';
import ScreenManager from './ui/ScreenManager.js';
import AccountManager from './account/AccountManager.js';
import { loadCardDefinitions } from './utils.js';

// --- HTML Template Imports ---
import { generateSplashScreenHTML } from './ui/html-templates/splashScreenTemplate.js';
import { generateTitleScreenHTML } from './ui/html-templates/titleScreenTemplate.js';
import { generateLoginScreenHTML } from './ui/html-templates/loginScreenTemplate.js';
import { generateCreateAccountScreenHTML } from './ui/html-templates/createAccountScreenTemplate.js';
import { generateHomeScreenHTML } from './ui/html-templates/homeScreenTemplate.js'; // <<<=== Importado
import { generateProfileScreenHTML } from './ui/html-templates/profileScreenTemplate.js';
import { generateConnectScreenHTML } from './ui/html-templates/connectScreenTemplate.js';
import { generateDeckBuilderScreenHTML } from './ui/html-templates/deckBuilderScreenTemplate.js';
import { generateOptionsScreenHTML } from './ui/html-templates/optionsScreenTemplate.js';
import { generateBattleScreenHTML } from './ui/html-templates/battleScreenTemplate.js';
import { generateTopBarHTML } from './ui/html-templates/topBarTemplate.js';
// Add any other screen templates you create here

// --- Document Ready ---
$(document).ready(async () => { // <<<=== MARCADO COMO ASYNC
    console.log("Runebound Clash - Initializing (Dynamic HTML)...");

    // --- STEP 1: Build HTML Structure Dynamically ---
    console.log("MAIN: Generating HTML structure...");
    const $screensContainer = $('#screens-container');
    const $body = $('body');

    // CRITICAL CHECK: Ensure the main container exists in index.html
    if (!$screensContainer.length) {
        console.error("CRITICAL ERROR: #screens-container div not found in index.html! Cannot generate UI.");
        $body.empty().css({
            'background-color': '#333', 'color': 'red', 'display': 'flex',
            'justify-content': 'center', 'align-items': 'center', 'height': '100vh',
            'font-size': '1.5em', 'padding': '20px', 'text-align': 'center'
        }).html('<h1>Erro Crítico</h1><p>A estrutura base do HTML (index.html) parece estar faltando o elemento <code><div id="screens-container"></div></code>. A aplicação não pode iniciar.</p>');
        return; // Stop execution
    }

    try {
        // Generate and Append/Prepend HTML content
        // Clear any static placeholder content first
        $screensContainer.empty()
            .append(generateSplashScreenHTML())          // Splash Screen FIRST
            .append(generateTitleScreenHTML())
            .append(generateLoginScreenHTML())
            .append(generateCreateAccountScreenHTML())
            .append(generateHomeScreenHTML())           // <<<=== Adicionado Home Screen
            .append(generateProfileScreenHTML())
            .append(generateConnectScreenHTML())
            .append(generateDeckBuilderScreenHTML())
            .append(generateOptionsScreenHTML())
            .append(generateBattleScreenHTML());
            // .append(generateOtherScreenHTML()); // Add other screens as needed

        // Prepend Top Bar (it sits above the screen container)
        $body.prepend(generateTopBarHTML());

        console.log("MAIN: HTML Structure dynamically generated.");

    } catch (htmlGenError) {
         console.error("MAIN: Critical error during HTML generation from templates:", htmlGenError);
         const $splash = $('#splash-screen');
         if ($splash.length) {
             $splash.addClass('active').html(`<p style="color:red; font-weight:bold;">Erro Crítico na Geração da UI: ${htmlGenError.message}. Recarregue.</p>`);
             $('.screen').not($splash).removeClass('active');
         } else {
             $screensContainer.html(`<p style="color:red; font-weight:bold;">Erro Crítico na Geração da UI: ${htmlGenError.message}. Recarregue.</p>`);
         }
         return; // Stop further execution
    }
    // --- END STEP 1 ---


    // --- STEP 2: Initialize Modules and Logic ---
    console.log("MAIN: Initializing modules and binding events...");
    try { // Wrap main initialization in a try...catch
        // --- Module Initialization ---
        const cardDatabase = loadCardDefinitions();
        if (!cardDatabase) {
            const $splashError = $('#splash-screen');
             if ($splashError.length) {
                 $splashError.text('Erro Crítico: Falha ao carregar cartas. Recarregue.').css('color', 'salmon');
                 $('.screen').removeClass('active'); $splashError.addClass('active');
             } else {
                 console.error("CRITICAL: Failed to load card definitions AND splash screen not found!");
                 $screensContainer.html('<p style="color:red; font-weight:bold;">Erro Crítico: Falha ao carregar cartas.</p>');
             }
            console.error("CRITICAL: Failed to load card definitions!");
            return; // Stop further execution
        }

        // Initialize managers AFTER HTML is generated
        const screenManager = new ScreenManager();
        const accountManager = new AccountManager();
        const uiManager = new UIManager(screenManager, accountManager, cardDatabase);

        // --- Initial Screen & Splash Transition ---
        console.log("MAIN: Showing splash screen...");
        screenManager.showScreen('splash-screen');
        setTimeout(() => $('#splash-screen').addClass('loading'), 50);

        console.log("MAIN: Setting timeout for screen transition (3000ms)...");
        setTimeout(async () => { // <<<=== MARCADO COMO ASYNC
            console.log("MAIN: Timeout finished. Checking login state...");
            try {
                const currentUser = accountManager.getCurrentUser();
                if (currentUser) {
                    // --- Logged In Flow --- <<<=== ALTERADO AQUI
                    console.log(`MAIN: User '${currentUser.username}' found. Showing Top Bar and Home Screen.`);
                    uiManager.showTopBar(currentUser);
                    $('#screens-container').addClass('with-top-bar');
                    await uiManager.renderHomeScreen(); // Renderiza Home (usa await)
                    screenManager.showScreen('home-screen'); // Mostra Home
                    // --- Fim da alteração ---
                } else {
                    // --- Logged Out Flow ---
                    console.log("MAIN: No user found. Showing title-screen.");
                    uiManager.hideTopBar();
                    $('#screens-container').removeClass('with-top-bar');
                    screenManager.showScreen('title-screen');
                }
                console.log("MAIN: Initial screen setup complete.");
            } catch (error) {
                console.error("MAIN: Error inside setTimeout callback:", error);
                console.log("MAIN: Fallback - Showing title-screen due to error.");
                 uiManager.hideTopBar();
                 $('#screens-container').removeClass('with-top-bar');
                screenManager.showScreen('title-screen');
            }
        }, 3000); // 3-second delay

        // --- Global UI Bindings ---
        // IMPORTANT: These bindings are attached AFTER the HTML is generated

        // Title Screen Actions
        $('#btn-goto-login').on('click', () => screenManager.showScreen('login-screen'));
        $('#btn-goto-create-account').on('click', () => screenManager.showScreen('create-account-screen'));
        $('#btn-goto-options-icon').on('click', () => { uiManager.renderOptionsScreen(); screenManager.showScreen('options-screen'); });

        // Back to Title from Login/Create
        $('#btn-create-back-to-title, #btn-login-back-to-title').on('click', () => { $('#create-account-message, #login-message').text(''); screenManager.showScreen('title-screen'); });

        // Create Account Form Submit
        $('#create-account-form').on('submit', (event) => {
            event.preventDefault();
            const $form = $(event.currentTarget);
            const u = $('#create-username').val().trim(), p = $('#create-password').val(), $m = $('#create-account-message');
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
                const $container = $form.closest('.form-container');
                if ($container.length) {
                    $container.addClass('form-shake');
                    setTimeout(() => $container.removeClass('form-shake'), 600);
                }
            }
        });

        // Login Form Submit - <<<=== ALTERADO AQUI
        $('#login-form').on('submit', async (event) => { // <<<=== MARCADO COMO ASYNC
            event.preventDefault();
            const $form = $(event.currentTarget);
            const u = $('#login-username').val().trim(), p = $('#login-password').val(), $m = $('#login-message');
            const r = accountManager.login(u, p);
            $m.text(r.message).css('color', r.success ? 'lightgreen' : 'salmon');

            if (r.success) {
                $form[0].reset();
                // --- Login Success Flow ---
                uiManager.showTopBar(r.user);
                $('#screens-container').addClass('with-top-bar');
                await uiManager.renderHomeScreen(); // Renderiza Home (usa await)
                screenManager.showScreen('home-screen'); // Mostra Home
                // --- Fim da alteração ---
            } else {
                const $container = $form.closest('.form-container');
                if ($container.length) {
                    $container.addClass('form-shake');
                    setTimeout(() => $container.removeClass('form-shake'), 600);
                }
            }
        });
        // --- Fim da alteração ---


        // --- Top Bar Navigation ---
        // Navigation is now handled inside UIManager._bindPermanentUIActions

        // --- Other Screen Bindings ---
        // Back Buttons
         $('#btn-options-back-to-main').on('click', () => screenManager.goBack('home-screen')); // <<<=== Fallback para home
         $('#btn-deck-builder-back').on('click', () => screenManager.showScreen('profile-screen')); // Mantém volta ao profile
         $('#btn-connect-back-to-main').on('click', () => screenManager.showScreen('home-screen')); // <<<=== Volta para home

        // Profile Actions (UIManager/ProfileScreenUI handles internal bindings)

        // Options Save
        $('#btn-save-options').on('click', () => uiManager.saveOptions()); // OptionsUI handles this via UIManager delegation (ou diretamente se refatorado)

        // --- Game Initialization Logic & Connect Screen Bindings ---
        let gameInstance = null;

        /** Function to set up and start a new game instance (Unchanged, but check deck logic) */
        function initializeAndStartGame(localPlayerDeckId, opponentUsername = "Opponent_AI", opponentDeckId = 'default_deck_1') {
             console.log("MAIN: Initializing game...");
             const currentUser = accountManager.getCurrentUser();
             if (!currentUser) {
                 console.error("MAIN: No user logged in. Redirecting to login.");
                 screenManager.showScreen('login-screen');
                 return;
             }
             const localDecks = accountManager.loadDecks();
             const localDeck = localDecks?.[localPlayerDeckId];

             // Validar deck local
             if (!localDeck?.cards || localDeck.cards.length < 30) {
                 console.error(`MAIN: Local deck '${localDeck?.name || localPlayerDeckId}' is invalid (needs 30-40 cards). Found: ${localDeck?.cards?.length}`);
                 $('#connect-message').text(`Erro: Deck '${localDeck?.name || localPlayerDeckId}' inválido (precisa de 30-40 cartas).`).css('color', 'salmon');
                 // Opcional: impedir a continuação ou redirecionar
                 // screenManager.showScreen('profile-screen'); // Exemplo: Volta pro perfil
                 return;
             }
             const localPlayerDeckIds = localDeck.cards;
             console.log(`MAIN: Local Deck '${localDeck.name}' (${localPlayerDeckIds.length} cards) found.`);

             // Opponent Deck Sim/Fallback (Assume opponent has a valid default or uses fallback)
             let defaultOpponentDeckIds = accountManager.getUserData(currentUser.username)?.decks?.[opponentDeckId]?.cards;
             if (!defaultOpponentDeckIds || defaultOpponentDeckIds.length < 30) {
                 console.warn(`MAIN: Opponent deck '${opponentDeckId}' invalid or not found, using fallback.`);
                 const allCardIds = Object.keys(cardDatabase);
                 if (allCardIds.length >= 30) {
                     defaultOpponentDeckIds = allCardIds.sort(() => 0.5 - Math.random()).slice(0, 30); // Random 30
                     console.log(`MAIN: Using fallback opponent deck with 30 random cards.`);
                 } else {
                     console.error("MAIN: Cannot create fallback opponent deck! Insufficient card definitions.");
                     $('#connect-message').text('Erro Crítico: Definições de cartas insuficientes para o oponente.').css('color', 'salmon');
                     return;
                 }
             } else {
                 console.log(`MAIN: Using opponent deck '${opponentDeckId}'.`);
             }
             console.log(`MAIN: Preparing ${currentUser.username} vs ${opponentUsername}`);

             try {
                 gameInstance = new Game(cardDatabase);
                 const player1 = gameInstance.addPlayer(currentUser.username, localPlayerDeckIds);
                 const player2 = gameInstance.addPlayer(opponentUsername, defaultOpponentDeckIds);

                 if (!player1 || !player2) { // Check if players were added successfully
                      throw new Error("Falha ao adicionar jogadores. Verifique os decks.");
                 }

                 uiManager.setGameInstance(gameInstance);
                 uiManager.setLocalPlayer(player1.id);

                 if (gameInstance.setupGame()) {
                     gameInstance.startGame();
                     uiManager.renderInitialGameState(); // UI draws the board
                     console.log("MAIN: Game started successfully!");
                     $('#connect-message').text('');
                     screenManager.showScreen('battle-screen'); // Go to battle screen
                 } else {
                     throw new Error("Falha na configuração inicial do jogo.");
                 }
             } catch (error) {
                 console.error("MAIN: Error during game initialization:", error);
                 $('#connect-message').text(`Erro ao iniciar: ${error.message}`).css('color', 'salmon');
                 gameInstance = null;
                 // Mantém na tela de conexão para ver o erro
                 // setTimeout(() => {
                 //     if (screenManager.getActiveScreenId() === 'connect-screen') {
                 //         screenManager.showScreen('home-screen'); // Volta para home em erro
                 //     }
                 //  }, 3000);
             }
        }


        // Connect Screen Buttons (Simulated Game Start)
        $('#btn-create-server').on('click', () => {
            $('#join-game-section').hide(); $('#server-status-section').show(); $('#server-ip-code').text('SIMULANDO...'); $('#connect-message').text('Simulando... Iniciando Jogo Solo.');
            const decks = accountManager.loadDecks();
            const firstValidDeckId = decks ? Object.keys(decks).find(id => decks[id]?.cards?.length >= 30) : null; // Encontra primeiro deck válido
            if (!firstValidDeckId) {
                 $('#connect-message').text('Erro: Nenhum deck válido (mín 30 cartas). Crie/Edite no Perfil.').css('color', 'salmon');
                 $('#server-status-section').hide();
                 return;
            }
            setTimeout(() => initializeAndStartGame(firstValidDeckId), 500); // Passa ID do deck válido
        });
        $('#btn-show-join-options').on('click', () => { $('#server-status-section').hide(); $('#join-game-section').show(); $('#connect-message').text(''); });
        $('#btn-connect-to-server').on('click', () => {
            const code = $('#opponent-ip').val().trim();
            $('#connect-message').text(`Simulando conexão com ${code || 'host'}... Iniciando Jogo Solo.`);
            const decks = accountManager.loadDecks();
            const firstValidDeckId = decks ? Object.keys(decks).find(id => decks[id]?.cards?.length >= 30) : null; // Encontra primeiro deck válido
             if (!firstValidDeckId) {
                 $('#connect-message').text('Erro: Nenhum deck válido (mín 30 cartas). Crie/Edite no Perfil.').css('color', 'salmon');
                 return;
             }
            setTimeout(() => initializeAndStartGame(firstValidDeckId), 500); // Passa ID do deck válido
        });
        $('#btn-cancel-hosting').on('click', () => { $('#server-status-section').hide(); $('#connect-message').text('Criação cancelada.'); });

        // --- Final Log ---
        console.log("Runebound Clash UI Ready (v2.2 - Home Screen).");

    } catch (initError) {
        console.error("MAIN: Critical initialization error:", initError);
         const $splashSevereError = $('#splash-screen');
         if ($splashSevereError.length) {
              $splashSevereError.text(`Erro Crítico: ${initError.message}. Recarregue.`).css('color', 'red');
              $('.screen').removeClass('active');
              $splashSevereError.addClass('active');
         } else {
            $screensContainer.html(`<p style="color:red; font-weight:bold;">Erro Crítico de Inicialização: ${initError.message}. Recarregue.</p>`);
         }
    }
}); // --- END Document Ready ---