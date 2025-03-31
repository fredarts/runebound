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
import { generateProfileScreenHTML } from './ui/html-templates/profileScreenTemplate.js';
import { generateConnectScreenHTML } from './ui/html-templates/connectScreenTemplate.js';
import { generateDeckBuilderScreenHTML } from './ui/html-templates/deckBuilderScreenTemplate.js';
import { generateOptionsScreenHTML } from './ui/html-templates/optionsScreenTemplate.js';
import { generateBattleScreenHTML } from './ui/html-templates/battleScreenTemplate.js';
import { generateTopBarHTML } from './ui/html-templates/topBarTemplate.js';
// Add any other screen templates you create here

// --- Document Ready ---
$(document).ready(() => {
    console.log("Runebound Clash - Initializing (Dynamic HTML)...");

    // --- STEP 1: Build HTML Structure Dynamically ---
    console.log("MAIN: Generating HTML structure...");
    const $screensContainer = $('#screens-container');
    const $body = $('body');

    // CRITICAL CHECK: Ensure the main container exists in index.html
    if (!$screensContainer.length) {
        console.error("CRITICAL ERROR: #screens-container div not found in index.html! Cannot generate UI.");
        // Display a visible error message if the container is missing
        $body.empty().css({ // Clear body and add error
            'background-color': '#333', 'color': 'red', 'display': 'flex',
            'justify-content': 'center', 'align-items': 'center', 'height': '100vh',
            'font-size': '1.5em', 'padding': '20px', 'text-align': 'center'
        }).html('<h1>Erro Crítico</h1><p>A estrutura base do HTML (index.html) parece estar faltando o elemento <code><div id="screens-container"></code>. A aplicação não pode iniciar.</p>');
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
         // Try to show error on splash screen if it exists, otherwise fallback
         const $splash = $('#splash-screen');
         if ($splash.length) {
             $splash.addClass('active').html(`<p style="color:red; font-weight:bold;">Erro Crítico na Geração da UI: ${htmlGenError.message}. Recarregue.</p>`);
             $('.screen').not($splash).removeClass('active'); // Hide others
         } else {
             $screensContainer.html(`<p style="color:red; font-weight:bold;">Erro Crítico na Geração da UI: ${htmlGenError.message}. Recarregue.</p>`);
         }
         return; // Stop further execution
    }
    // --- END STEP 1 ---


    // --- STEP 2: Initialize Modules and Logic (Mostly unchanged from original) ---
    console.log("MAIN: Initializing modules and binding events...");
    try { // Wrap main initialization in a try...catch
        // --- Module Initialization ---
        const cardDatabase = loadCardDefinitions();
        if (!cardDatabase) {
            // Ensure splash exists before trying to modify it
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
        const screenManager = new ScreenManager(); // Uses default transition duration
        const accountManager = new AccountManager();
        const uiManager = new UIManager(screenManager, accountManager, cardDatabase); // UIManager now works with generated HTML

        // --- Initial Screen & Splash Transition ---
        console.log("MAIN: Showing splash screen...");
        // ScreenManager needs the #splash-screen div to exist, which it does now.
        screenManager.showScreen('splash-screen'); // Show splash initially
        // Add 'loading' class shortly after to trigger progress bar animation
        setTimeout(() => $('#splash-screen').addClass('loading'), 50); // Pequeno delay para garantir renderização inicial

        console.log("MAIN: Setting timeout for screen transition (3000ms)...");
        setTimeout(() => {
            console.log("MAIN: Timeout finished. Checking login state...");
            try {
                const currentUser = accountManager.getCurrentUser();
                if (currentUser) {
                    // --- Logged In Flow ---
                    console.log(`MAIN: User '${currentUser.username}' found. Showing Top Bar and Profile.`);
                    uiManager.showTopBar(currentUser); // Show the top bar
                    $('#screens-container').addClass('with-top-bar'); // Add padding for top bar
                    uiManager.renderProfileScreen(); // Render profile content (finds generated elements)
                    screenManager.showScreen('profile-screen'); // Show profile screen initially
                } else {
                    // --- Logged Out Flow ---
                    console.log("MAIN: No user found. Showing title-screen.");
                    uiManager.hideTopBar(); // Ensure top bar is hidden
                    $('#screens-container').removeClass('with-top-bar');
                    screenManager.showScreen('title-screen'); // Go to Title Screen
                }
                console.log("MAIN: Initial screen setup complete.");
            } catch (error) {
                console.error("MAIN: Error inside setTimeout callback:", error);
                console.log("MAIN: Fallback - Showing title-screen due to error.");
                 uiManager.hideTopBar(); // Ensure top bar is hidden on error too
                 $('#screens-container').removeClass('with-top-bar');
                screenManager.showScreen('title-screen');
            }
        }, 3000); // 3-second delay

        // --- Global UI Bindings ---
        // IMPORTANT: These bindings are attached AFTER the HTML is generated,
        // so jQuery can find the elements by their IDs.

        // Title Screen Actions
        $('#btn-goto-login').on('click', () => screenManager.showScreen('login-screen'));
        $('#btn-goto-create-account').on('click', () => screenManager.showScreen('create-account-screen'));
        $('#btn-goto-options-icon').on('click', () => { uiManager.renderOptionsScreen(); screenManager.showScreen('options-screen'); }); // Options from Title

        // Back to Title from Login/Create
        $('#btn-create-back-to-title, #btn-login-back-to-title').on('click', () => { $('#create-account-message, #login-message').text(''); screenManager.showScreen('title-screen'); });

        // Create Account Form Submit
        $('#create-account-form').on('submit', (event) => {
            event.preventDefault();
            const $form = $(event.currentTarget); // Referência ao formulário
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
                // ---> ADICIONAR SHAKE NO ERRO <---
                const $container = $form.closest('.form-container'); // Acha o container
                if ($container.length) {
                    $container.addClass('form-shake'); // Adiciona a classe
                    // Remove a classe após a animação terminar (0.5s + margem)
                    setTimeout(() => {
                        $container.removeClass('form-shake');
                    }, 600); // Duração um pouco maior que a animação CSS
                }
                // ---> FIM SHAKE <---
            }
        });

        // Login Form Submit
        $('#login-form').on('submit', (event) => {
            event.preventDefault();
            const $form = $(event.currentTarget); // Referência ao formulário
            const u = $('#login-username').val().trim(), p = $('#login-password').val(), $m = $('#login-message');
            const r = accountManager.login(u, p);
            $m.text(r.message).css('color', r.success ? 'lightgreen' : 'salmon');

            if (r.success) {
                $form[0].reset();
                // --- Login Success Flow ---
                uiManager.showTopBar(r.user);
                $('#screens-container').addClass('with-top-bar');
                uiManager.renderProfileScreen();
                screenManager.showScreen('profile-screen');
            } else {
                // ---> ADICIONAR SHAKE NO ERRO <---
                const $container = $form.closest('.form-container'); // Acha o container
                if ($container.length) {
                    $container.addClass('form-shake'); // Adiciona a classe
                    // Remove a classe após a animação terminar (0.5s + margem)
                    setTimeout(() => {
                        $container.removeClass('form-shake');
                    }, 600); // Duração um pouco maior que a animação CSS
                }
                 // ---> FIM SHAKE <---
            }
        });


        // --- Top Bar Navigation ---
        $('#top-bar-btn-profile').on('click', () => {
            if(screenManager.getActiveScreenId() !== 'profile-screen'){ uiManager.renderProfileScreen(); screenManager.showScreen('profile-screen'); }
        });
        $('#top-bar-btn-connect').on('click', () => {
             $('#connect-message').text(''); screenManager.showScreen('connect-screen');
             // Reset connect screen UI state if needed
             $('#server-status-section, #join-game-section').hide();
        });
         $('#top-bar-btn-options').on('click', () => { // Options icon in top bar
            uiManager.renderOptionsScreen(); screenManager.showScreen('options-screen');
        });
        $('#top-bar-btn-logout').on('click', () => {
            accountManager.logout();
            uiManager.hideTopBar(); // Hide top bar
            $('#screens-container').removeClass('with-top-bar'); // Remove padding
            screenManager.showScreen('title-screen'); // Go to title
        });

        // --- Other Screen Bindings ---
        // Back Buttons (Use goBack or specific navigation)
         $('#btn-options-back-to-main').on('click', () => screenManager.goBack('profile-screen')); // Go back or to profile
         $('#btn-deck-builder-back').on('click', () => screenManager.showScreen('profile-screen')); // Always back to profile from DB
         $('#btn-connect-back-to-main').on('click', () => screenManager.showScreen('profile-screen')); // Back to profile from connect

        // Profile Actions (UIManager handles internal bindings like avatar/deck clicks)
        // $('#btn-goto-deck-builder-new') click might be handled inside UIManager._bindProfileInteractions

        // Options Save
        $('#btn-save-options').on('click', () => uiManager.saveOptions()); // UIManager handles this

        // --- Game Initialization Logic & Connect Screen Bindings ---
        let gameInstance = null;

        /** Function to set up and start a new game instance (Unchanged) */
        function initializeAndStartGame(localPlayerDeckId, opponentUsername = "Opponent_AI", opponentDeckId = 'default_deck_1') {
             console.log("MAIN: Initializing game...");
             const currentUser = accountManager.getCurrentUser(); if (!currentUser) { console.error("MAIN: No user logged in."); screenManager.showScreen('login-screen'); return; }
             const localDecks = accountManager.loadDecks(); const localDeck = localDecks?.[localPlayerDeckId];
             if (!localDeck?.cards || localDeck.cards.length < 30) { console.error(`MAIN: Local deck '${localDeck?.name || localPlayerDeckId}' invalid.`); $('#connect-message').text(`Erro: Deck '${localDeck?.name || localPlayerDeckId}' inválido.`).css('color', 'salmon'); return; }
             const localPlayerDeckIds = localDeck.cards; console.log(`MAIN: Local Deck '${localDeck.name}' (${localPlayerDeckIds.length} cards) found.`);
             // Opponent Deck Sim/Fallback (Unchanged)
             let defaultOpponentDeckIds = accountManager.getUserData(currentUser.username)?.decks?.[opponentDeckId]?.cards;
             if (!defaultOpponentDeckIds || defaultOpponentDeckIds.length < 30) { console.warn(`MAIN: Opponent deck fallback.`); const allCardIds = Object.keys(cardDatabase); if (allCardIds.length >= 30) { defaultOpponentDeckIds = allCardIds.slice(0, 30); console.log(`MAIN: Using fallback opponent deck.`); } else { console.error("MAIN: Cannot create fallback opponent deck!"); $('#connect-message').text('Erro: Definições insuficientes.').css('color', 'salmon'); return; } } else { console.log(`MAIN: Using opponent deck '${opponentDeckId}'.`); }
             console.log(`MAIN: Preparing ${currentUser.username} vs ${opponentUsername}`);

             try {
                 gameInstance = new Game(cardDatabase);
                 const player1 = gameInstance.addPlayer(currentUser.username, localPlayerDeckIds);
                 const player2 = gameInstance.addPlayer(opponentUsername, defaultOpponentDeckIds);
                 if (!player1 || !player2) throw new Error("Falha ao adicionar jogadores.");

                 uiManager.setGameInstance(gameInstance); // Link game to UI
                 uiManager.setLocalPlayer(player1.id);     // Tell UI who we are

                 if (gameInstance.setupGame()) {
                     gameInstance.startGame();
                     uiManager.renderInitialGameState(); // UI draws the board
                     // uiManager.bindGameActions(); // UIManager should handle its internal game bindings
                     console.log("MAIN: Game started successfully!"); $('#connect-message').text('');
                     screenManager.showScreen('battle-screen'); // Explicitly show battle screen
                 } else {
                     throw new Error("Game setup failed.");
                 }
             } catch (error) {
                 console.error("MAIN: Error during game initialization:", error);
                 $('#connect-message').text(`Erro ao iniciar: ${error.message}`).css('color', 'salmon'); gameInstance = null;
                 setTimeout(() => {
                     // Check if still on connect screen before navigating away
                     if (screenManager.getActiveScreenId() === 'connect-screen') {
                         screenManager.showScreen('profile-screen');
                     }
                  }, 3000); // Back to profile on error
             }
        }


        // Connect Screen Buttons (Simulated Game Start)
        $('#btn-create-server').on('click', () => {
            $('#join-game-section').hide(); $('#server-status-section').show(); $('#server-ip-code').text('SIMULANDO...'); $('#connect-message').text('Simulando... Iniciando Jogo Solo.');
            const decks = accountManager.loadDecks(); const firstDeckId = decks ? Object.keys(decks)[0] : null;
            if (!firstDeckId || !decks[firstDeckId] || decks[firstDeckId].cards?.length < 30) { $('#connect-message').text('Erro: Nenhum deck válido (mín 30). Crie/Edite no Perfil.').css('color', 'salmon'); $('#server-status-section').hide(); return; }
            setTimeout(() => initializeAndStartGame(firstDeckId), 1000); // Pass deck ID
        });
        $('#btn-show-join-options').on('click', () => { $('#server-status-section').hide(); $('#join-game-section').show(); $('#connect-message').text(''); });
        $('#btn-connect-to-server').on('click', () => {
            const code = $('#opponent-ip').val().trim(); $('#connect-message').text(`Simulando conexão com ${code || 'host'}... Iniciando Jogo Solo.`);
            const decks = accountManager.loadDecks(); const firstDeckId = decks ? Object.keys(decks)[0] : null;
            if (!firstDeckId || !decks[firstDeckId] || decks[firstDeckId].cards?.length < 30) { $('#connect-message').text('Erro: Nenhum deck válido (mín 30). Crie/Edite no Perfil.').css('color', 'salmon'); return; }
            setTimeout(() => initializeAndStartGame(firstDeckId), 1000); // Pass deck ID
        });
        $('#btn-cancel-hosting').on('click', () => { $('#server-status-section').hide(); $('#connect-message').text('Criação cancelada.'); });

        // --- Final Log ---
        console.log("Runebound Clash UI Ready (v2.1 - Shake Feedback).");

    } catch (initError) {
        console.error("MAIN: Critical initialization error:", initError);
        // Try to display the error on the splash screen if possible
         const $splashSevereError = $('#splash-screen');
         if ($splashSevereError.length) {
              $splashSevereError.text(`Erro Crítico: ${initError.message}. Recarregue.`).css('color', 'red');
              $('.screen').removeClass('active');
              $splashSevereError.addClass('active');
         } else {
            // Fallback if splash itself wasn't even generated
            $screensContainer.html(`<p style="color:red; font-weight:bold;">Erro Crítico de Inicialização: ${initError.message}. Recarregue.</p>`);
         }
    }
}); // --- END Document Ready ---