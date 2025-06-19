// js/main.js - CORRIGIDO PARA FLUXO DE LOGIN E SETUP INICIAL (v-login-flow-fix-v2)

// --- Imports ---
// Core Modules
import Game from './core/Game.js';
import UIManager from './ui/UIManager.js';
import ScreenManager from './ui/ScreenManager.js';
import AccountManager from './account/AccountManager.js';
import AudioManager from './audio/AudioManager.js';
import { loadCardDefinitions } from './utils.js';
import CustomCursor from './ui/CustomCursor.js';

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
import { generateStoreScreenHTML } from './ui/html-templates/storeScreenTemplate.js';
import { generateBoosterOpeningTemplate } from './ui/html-templates/boosterOpeningTemplate.js';
import { generateLoreVideoScreenHTML } from './ui/html-templates/loreVideoScreenTemplate.js';
import { generateInitialDeckChoiceScreenHTML } from './ui/html-templates/initialDeckChoiceScreenTemplate.js';


// --- Document Ready ---
$(document).ready(async () => {
    // LIMPAR SESSÃO PARA TESTES - REMOVA OU COMENTE PARA PRODUÇÃO
    // sessionStorage.removeItem('runebound_clash_current_user');
    // localStorage.removeItem('runebound_clash_accounts'); // CUIDADO: Apaga todas as contas.
    // console.log("MAIN: Cleared session/local storage for testing (if uncommented).");
    // FIM DA LIMPEZA PARA TESTES

    console.log("Runebound Clash - Initializing (Dynamic HTML)...");

    let customCursorInstance = null;
    try {
        customCursorInstance = new CustomCursor(260);
    } catch (cursorError) {
        console.error("Failed to initialize custom cursor:", cursorError);
        $('body').css('cursor', 'url("assets/images/ui/cursor.png"), auto');
    }

    const $screensContainer = $('#screens-container');
    const $body = $('body');

    if (!$screensContainer.length) {
        console.error("CRITICAL ERROR: #screens-container div not found in index.html! Cannot generate UI.");
        document.body.innerHTML = '<div style="color:red; font-weight:bold; text-align:center; padding:20px; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; background-color:#333;"><h1>Erro Crítico</h1><p>A estrutura base do HTML (index.html) parece estar faltando o elemento <code><div id="screens-container"></div></code>. A aplicação não pode iniciar.</p></div>';
        if (customCursorInstance) customCursorInstance.destroy();
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
            .append(generateLoreVideoScreenHTML())
            .append(generateInitialDeckChoiceScreenHTML());
        $body.prepend(generateTopBarHTML());
        console.log("MAIN: HTML Structure dynamically generated.");
    } catch (htmlGenError) {
         console.error("MAIN: Critical error during HTML generation from templates:", htmlGenError);
         // ... (código de erro de geração de HTML como antes) ...
         if (customCursorInstance) customCursorInstance.destroy();
         return;
    }

    console.log("MAIN: Initializing modules and binding events...");
    try {
        const cardDatabase = loadCardDefinitions();
        if (!cardDatabase || Object.keys(cardDatabase).length === 0) {
            // ... (código de erro de cardDatabase como antes) ...
            if (customCursorInstance) customCursorInstance.destroy();
            return;
        }

        const screenManager = new ScreenManager();
        const accountManager = new AccountManager();
        const audioManager = new AudioManager();
        // Passe accountManager para TitlescreenUi através do UIManager se necessário,
        // ou injete accountManager diretamente no TitlescreenUi se preferir.
        // Por agora, UIManager tem acesso a accountManager e pode passar dados.
        const uiManager = new UIManager(screenManager, accountManager, cardDatabase, audioManager);

        console.log("MAIN: Showing splash screen...");
        setTimeout(() => $('#splash-screen').addClass('loading'), 50);

        console.log("MAIN: Setting timeout for screen transition (3000ms)...");
        setTimeout(async () => {
            console.log("MAIN: Splash timeout finished.");
            const $splashScreen = $('#splash-screen');

            if ($splashScreen.hasClass('active')) {
                $splashScreen.removeClass('active loading');
                console.log("MAIN: Splash screen deactivated.");
            }

            // SEMPRE VAI PARA A TELA DE TÍTULO APÓS A SPLASH
            console.log("MAIN (Pós-Splash): Navegando para a Tela de Título.");
            // O UIManager.navigateTo('title-screen') agora deve lidar corretamente com:
            // 1. Esconder a TopBar (porque 'title-screen' está em screensWithoutTopBar)
            // 2. Permitir a navegação mesmo que um usuário esteja logado,
            //    porque a lógica de restrictedWhenLoggedIn foi ajustada em UIManager.
            // 3. O init() de TitlescreenUi (chamado por UIManager) verificará se um
            //    usuário já logado deve ser redirecionado.
            await uiManager.navigateTo('title-screen');

            console.log("MAIN: Initial screen setup complete (title screen targeted after splash).");

        }, 3000);


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

            if (r.success && r.user) {
                $form[0].reset();
                console.log(`MAIN (Login Form): Usuário ${r.user.username} logado. InitialSetupComplete: ${r.user.initialSetupComplete}`);

                // Lógica de navegação PÓS-LOGIN:
                if (r.user.initialSetupComplete === false) {
                    console.log("MAIN (Login Form): Setup inicial INCOMPLETO. Navegando para vídeo de lore.");
                    await uiManager.navigateTo('lore-video-screen');
                } else {
                    console.log("MAIN (Login Form): Setup inicial COMPLETO. Navegando para home.");
                    await uiManager.navigateTo('home-screen');
                }
            } else {
                const $container = $form.closest('.form-container');
                if ($container.length) {
                    $container.addClass('form-shake');
                    setTimeout(() => $container.removeClass('form-shake'), 600);
                }
                audioManager.playSFX('loginError');
            }
        });
         $('#login-form button').each((i, btn) => addAudioListeners($(btn)));

         const $btnOptionsBack = $('#btn-options-back-to-main');
         addAudioListeners($btnOptionsBack);

         const $btnDeckBuilderBack = $('#btn-deck-builder-back');
         $btnDeckBuilderBack.on('click', () => uiManager.navigateTo('deck-management-screen'));
         addAudioListeners($btnDeckBuilderBack);

         const $btnConnectBack = $('#btn-connect-back-to-main');
         $btnConnectBack.on('click', () => uiManager.navigateTo('home-screen'));
         addAudioListeners($btnConnectBack);

         const $btnSaveOptions = $('#btn-save-options');
         $btnSaveOptions.on('mouseenter.uisfx', () => audioManager?.playSFX('buttonHover'));

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
             if (!opponentDeckIds || opponentDeckIds.length < 30 || opponentDeckIds.length > 40) {
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
                 const player1 = gameInstance.addPlayer(currentUser.username, localPlayerDeckIds);
                 const player2_IA = gameInstance.addPlayer(opponentUsername, opponentDeckIds);

                 if (!player1 || !player2_IA) throw new Error("Falha ao adicionar jogadores ao GameInstance.");
                 
                 console.log(`MAIN: Player 1 (Human): ${player1.name}, ID: ${player1.id}`);
                 console.log(`MAIN: Player 2 (AI): ${player2_IA.name}, ID: ${player2_IA.id}`);

                 uiManager.setGameInstance(gameInstance);
                 uiManager.setLocalPlayer(player1.id);
                 console.log(`MAIN: Local player ID set in UIManager: ${player1.id}`);

                 if (gameInstance.setupGame()) {
                     gameInstance.startGame();
                     uiManager.renderInitialGameState(); // Este método no UIManager deve mostrar a battle-screen e tocar BGM
                     console.log("MAIN: Game started successfully!");
                     $('#connect-message').text('');
                 } else {
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

        console.log("Runebound Clash UI Ready (v-login-flow-fix-v2).");

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
         if (customCursorInstance) customCursorInstance.destroy();
    }
});