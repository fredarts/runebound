// js/main.js - ATUALIZADO (v2.4 - Splash Fix)

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
import { generateHomeScreenHTML } from './ui/html-templates/homeScreenTemplate.js';
import { generateProfileScreenHTML } from './ui/html-templates/profileScreenTemplate.js';       // Importa o template do perfil (simplificado)
import { generateDeckManagementScreenHTML } from './ui/html-templates/deckManagementScreenTemplate.js'; // Importa template da nova Tela de Decks
import { generateConnectScreenHTML } from './ui/html-templates/connectScreenTemplate.js';
import { generateDeckBuilderScreenHTML } from './ui/html-templates/deckBuilderScreenTemplate.js'; // Importa o template do construtor (com botão Voltar atualizado)
import { generateOptionsScreenHTML } from './ui/html-templates/optionsScreenTemplate.js';
import { generateBattleScreenHTML } from './ui/html-templates/battleScreenTemplate.js';
import { generateTopBarHTML } from './ui/html-templates/topBarTemplate.js';                   // Importa a top bar (com novo botão)


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
         // Verifica se a splash existe E está ativa (ou se é a única coisa na tela)
         if ($splash.length && ($splash.hasClass('active') || $screensContainer.children().length <= 1)) {
             $splash.addClass('active').html(`<p style="color:red; font-weight:bold;">Erro Crítico na Geração da UI: ${htmlGenError.message}. Recarregue.</p>`);
             $('.screen').not($splash).removeClass('active'); // Garante que só a splash (com erro) esteja ativa
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
            // Verifica se a splash existe E está ativa (ou se é a única coisa na tela)
             if ($splashError.length && ($splashError.hasClass('active') || $screensContainer.children().length <= 1)) {
                 $splashError.text('Erro Crítico: Falha ao carregar cartas. Recarregue.').css('color', 'salmon');
                 $('.screen').not($splashError).removeClass('active'); // Garante que só a splash (com erro) esteja ativa
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
        // UIManager agora instancia todas as sub-UIs (Home, Profile, DeckManagement, DeckBuilder, Options, Battle)
        const uiManager = new UIManager(screenManager, accountManager, cardDatabase);

        // --- Initial Screen & Splash Transition ---
        console.log("MAIN: Showing splash screen...");
        // A splash screen já começa com 'active' no template
        setTimeout(() => $('#splash-screen').addClass('loading'), 50); // Adiciona classe para efeito visual se houver

        console.log("MAIN: Setting timeout for screen transition (3000ms)...");
        // --- CORREÇÃO SPLASH SCREEN APLICADA AQUI ---
        setTimeout(async () => { // Callback após o delay (async para renderHomeScreen)
            console.log("MAIN: Timeout finished. Checking login state...");
            const $splashScreen = $('#splash-screen'); // Cache splash screen selector

            try {
                const currentUser = accountManager.getCurrentUser(); // Verifica se há usuário logado
                if (currentUser) {
                    // --- Logged In Flow ---
                    console.log(`MAIN: User '${currentUser.username}' found. Showing Top Bar and Home Screen.`);
                    uiManager.showTopBar(currentUser);          // Mostra a Top Bar com dados do usuário
                    $('#screens-container').addClass('with-top-bar'); // Adiciona classe para ajustar layout

                    // Remova 'active' da splash ANTES de mostrar a próxima
                    if ($splashScreen.hasClass('active')) {
                        $splashScreen.removeClass('active loading'); // Remove active e loading
                        console.log("MAIN: Splash screen deactivated for logged-in flow.");
                    }

                    await uiManager.renderHomeScreen();         // Renderiza a Home Screen (async)
                    screenManager.showScreen('home-screen');    // Mostra a Home Screen

                } else {
                    // --- Logged Out Flow ---
                    console.log("MAIN: No user found. Showing title-screen.");
                    uiManager.hideTopBar();                     // Esconde a Top Bar
                    $('#screens-container').removeClass('with-top-bar'); // Remove classe de ajuste

                    // Remova 'active' da splash ANTES de mostrar a próxima
                    if ($splashScreen.hasClass('active')) {
                        $splashScreen.removeClass('active loading'); // Remove active e loading
                        console.log("MAIN: Splash screen deactivated for logged-out flow.");
                    }

                    screenManager.showScreen('title-screen');   // Mostra a Tela de Título
                }
                console.log("MAIN: Initial screen setup complete.");
            } catch (error) {
                console.error("MAIN: Error inside setTimeout callback:", error);
                // Fallback em caso de erro na verificação/renderização inicial
                console.log("MAIN: Fallback - Showing title-screen due to error.");
                 uiManager.hideTopBar();
                 $('#screens-container').removeClass('with-top-bar');

                 // Garante que splash saia no fallback também
                 if ($splashScreen.hasClass('active')) {
                    $splashScreen.removeClass('active loading');
                    console.log("MAIN: Splash screen deactivated on error fallback.");
                 }

                screenManager.showScreen('title-screen');
            }
        }, 3000); // Delay de 3 segundos para a splash screen
        // --- FIM DA CORREÇÃO SPLASH SCREEN ---


        // --- Global UI Bindings ---
        // Ações da Tela de Título
        $('#btn-goto-login').on('click', () => screenManager.showScreen('login-screen'));
        $('#btn-goto-create-account').on('click', () => screenManager.showScreen('create-account-screen'));
        // Ícone de Opções na Title Screen (leva para Options e renderiza)
        $('#btn-goto-options-icon').on('click', () => {
             uiManager.renderOptionsScreen();
             screenManager.showScreen('options-screen');
        });

        // Botões "Voltar" das telas de Login/Criar Conta
        $('#btn-create-back-to-title, #btn-login-back-to-title').on('click', () => {
            $('#create-account-message, #login-message').text(''); // Limpa mensagens de erro/sucesso
            screenManager.showScreen('title-screen');
        });

        // Submissão do Formulário de Criar Conta
        $('#create-account-form').on('submit', (event) => {
            event.preventDefault();
            const $form = $(event.currentTarget);
            const u = $('#create-username').val().trim();
            const p = $('#create-password').val();
            const $m = $('#create-account-message');
            const r = accountManager.createAccount(u, p); // Chama AccountManager
            $m.text(r.message).css('color', r.success ? 'lightgreen' : 'salmon');

            if (r.success) {
                $form[0].reset(); // Limpa o formulário
                setTimeout(() => { // Pequeno delay antes de ir para Login
                    if (screenManager.getActiveScreenId() === 'create-account-screen') {
                        screenManager.showScreen('login-screen'); // Vai para Login após sucesso
                        $m.text(''); // Limpa mensagem de sucesso
                    }
                 }, 2000);
            } else {
                // Efeito de "shake" no formulário em caso de erro
                const $container = $form.closest('.form-container');
                if ($container.length) {
                    $container.addClass('form-shake');
                    setTimeout(() => $container.removeClass('form-shake'), 600);
                }
            }
        });

        // Submissão do Formulário de Login
        $('#login-form').on('submit', async (event) => { // async para renderHomeScreen
            event.preventDefault();
            const $form = $(event.currentTarget);
            const u = $('#login-username').val().trim();
            const p = $('#login-password').val();
            const $m = $('#login-message');
            const r = accountManager.login(u, p); // Chama AccountManager
            $m.text(r.message).css('color', r.success ? 'lightgreen' : 'salmon');

            if (r.success) {
                $form[0].reset(); // Limpa o formulário
                // --- Login Success Flow ---
                uiManager.showTopBar(r.user);                  // Mostra Top Bar
                $('#screens-container').addClass('with-top-bar'); // Ajusta layout
                await uiManager.renderHomeScreen();             // Renderiza Home (async)
                screenManager.showScreen('home-screen');        // Mostra Home
                // --- Fim Login Success Flow ---
            } else {
                // Efeito de "shake" no formulário em caso de erro
                const $container = $form.closest('.form-container');
                if ($container.length) {
                    $container.addClass('form-shake');
                    setTimeout(() => $container.removeClass('form-shake'), 600);
                }
            }
        });

        // --- Top Bar Navigation ---
        // A navegação principal (Home, Perfil, Decks, Conectar, Opções, Logout)
        // é agora tratada dentro de UIManager._bindPermanentUIActions()

        // --- Other Screen Back Buttons ---
         // Botão Voltar da tela de Opções (volta para a tela anterior, com fallback Home)
         $('#btn-options-back-to-main').on('click', () => screenManager.goBack('home-screen'));

         // --- ATUALIZADO: Botão Voltar do Deck Builder ---
         // Agora leva para a Tela de Gerenciamento de Decks
         $('#btn-deck-builder-back').on('click', () => {
             console.log("MAIN: Deck Builder back button clicked, going to Deck Management.");
             // A UI de Deck Management deve ser renderizada pelo UIManager ao navegar para ela
             uiManager.renderDeckManagementScreen(); // Garante que está atualizada
             screenManager.showScreen('deck-management-screen');
         });
         // -------------------------------------------

         // Botão Voltar da tela Connect (leva para Home)
         $('#btn-connect-back-to-main').on('click', () => screenManager.showScreen('home-screen'));

        // Ações do Perfil (Seleção de Avatar) são tratadas internamente por ProfileScreenUI.
        // Ações do Gerenciamento de Decks (Editar, Deletar, Criar) são tratadas por DeckManagementScreenUI.
        // Ações do Construtor de Decks (Salvar, Limpar) são tratadas por DeckBuilderUI.

        // Botão Salvar Opções (delegado para OptionsUI via UIManager)
        $('#btn-save-options').on('click', () => uiManager.saveOptions()); // Assumindo que UIManager tem um método saveOptions que chama OptionsUI

        // --- Game Initialization Logic & Connect Screen Bindings ---
        let gameInstance = null; // Armazena a instância do jogo atual

        /** Função para inicializar e começar uma nova partida (Simulada/Local) */
        function initializeAndStartGame(localPlayerDeckId, opponentUsername = "Opponent_AI", opponentDeckId = 'default_deck_1') {
             console.log("MAIN: Initializing game...");
             const currentUser = accountManager.getCurrentUser();
             if (!currentUser) {
                 console.error("MAIN: No user logged in. Redirecting to login.");
                 screenManager.showScreen('login-screen');
                 return;
             }

             const localDecks = accountManager.loadDecks(); // Carrega decks do usuário logado
             const localDeck = localDecks?.[localPlayerDeckId]; // Pega o deck selecionado

             // Valida o deck local
             if (!localDeck?.cards || localDeck.cards.length < 30 || localDeck.cards.length > 40) { // Verifica tamanho do deck
                 console.error(`MAIN: Local deck '${localDeck?.name || localPlayerDeckId}' is invalid (needs 30-40 cards). Found: ${localDeck?.cards?.length}`);
                 $('#connect-message').text(`Erro: Deck '${localDeck?.name || localPlayerDeckId}' inválido (precisa de 30-40 cartas).`).css('color', 'salmon');
                 return; // Impede início do jogo
             }
             const localPlayerDeckIds = localDeck.cards;
             console.log(`MAIN: Local Deck '${localDeck.name}' (${localPlayerDeckIds.length} cards) found.`);

             // Simulação/Fallback de Deck do Oponente
             let opponentDeckIds = accountManager.getUserData("Opponent_AI")?.decks?.[opponentDeckId]?.cards; // Tenta carregar um deck AI (se existisse)
             if (!opponentDeckIds || opponentDeckIds.length < 30) { // Valida deck oponente (mínimo 30)
                 console.warn(`MAIN: Opponent deck '${opponentDeckId}' invalid or not found, using fallback.`);
                 const allCardIds = Object.keys(cardDatabase);
                 if (allCardIds.length >= 30) {
                     opponentDeckIds = allCardIds.sort(() => 0.5 - Math.random()).slice(0, 30); // Pega 30 cartas aleatórias
                     console.log(`MAIN: Using fallback opponent deck with 30 random cards.`);
                 } else {
                     console.error("MAIN: Cannot create fallback opponent deck! Insufficient card definitions.");
                     $('#connect-message').text('Erro Crítico: Definições de cartas insuficientes para o oponente.').css('color', 'salmon');
                     return; // Impede início
                 }
             } else {
                 console.log(`MAIN: Using opponent deck '${opponentDeckId}'.`);
             }
             console.log(`MAIN: Preparing ${currentUser.username} vs ${opponentUsername}`);

             // Inicia a instância do Jogo
             try {
                 gameInstance = new Game(cardDatabase); // Cria nova instância
                 const player1 = gameInstance.addPlayer(currentUser.username, localPlayerDeckIds); // Adiciona jogador local
                 const player2 = gameInstance.addPlayer(opponentUsername, opponentDeckIds);      // Adiciona oponente (AI)

                 if (!player1 || !player2) { // Verifica se os jogadores foram adicionados com sucesso
                      throw new Error("Falha ao adicionar jogadores. Verifique os decks e logs.");
                 }

                 uiManager.setGameInstance(gameInstance); // Informa UIManager sobre o jogo
                 uiManager.setLocalPlayer(player1.id);     // Informa UIManager quem é o jogador local

                 if (gameInstance.setupGame()) {        // Prepara o jogo (embaralhar, etc.)
                     gameInstance.startGame();           // Inicia o jogo (compra mãos, começa turno)
                     uiManager.renderInitialGameState(); // UIManager manda renderizar o tabuleiro
                     console.log("MAIN: Game started successfully!");
                     $('#connect-message').text('');     // Limpa mensagens da tela Connect
                     screenManager.showScreen('battle-screen'); // Vai para a tela de Batalha
                 } else {
                     throw new Error("Falha na configuração inicial do jogo.");
                 }
             } catch (error) {
                 console.error("MAIN: Error during game initialization:", error);
                 $('#connect-message').text(`Erro ao iniciar: ${error.message}`).css('color', 'salmon');
                 gameInstance = null; // Limpa instância em caso de erro
                 // Mantém na tela de conexão para ver o erro
             }
        } // Fim de initializeAndStartGame

        // Botões da Tela Connect (Simulando Início de Jogo)
        $('#btn-create-server').on('click', () => {
            $('#join-game-section').hide(); $('#server-status-section').show(); $('#server-ip-code').text('SIMULANDO...'); $('#connect-message').text('Simulando... Iniciando Jogo Solo.');
            const decks = accountManager.loadDecks();
            // Encontra o primeiro deck válido do usuário (30-40 cartas)
            const firstValidDeckId = decks ? Object.keys(decks).find(id => decks[id]?.cards?.length >= 30 && decks[id]?.cards?.length <= 40) : null;
            if (!firstValidDeckId) {
                 $('#connect-message').text('Erro: Nenhum deck válido (30-40 cartas). Crie/Edite nos Decks.').css('color', 'salmon');
                 $('#server-status-section').hide();
                 return;
            }
            setTimeout(() => initializeAndStartGame(firstValidDeckId), 500); // Inicia com o deck válido
        });
        $('#btn-show-join-options').on('click', () => {
             $('#server-status-section').hide();
             $('#join-game-section').show();
             $('#connect-message').text('');
        });
        $('#btn-connect-to-server').on('click', () => {
            const code = $('#opponent-ip').val().trim();
            $('#connect-message').text(`Simulando conexão com ${code || 'host'}... Iniciando Jogo Solo.`);
            const decks = accountManager.loadDecks();
            // Encontra o primeiro deck válido do usuário (30-40 cartas)
            const firstValidDeckId = decks ? Object.keys(decks).find(id => decks[id]?.cards?.length >= 30 && decks[id]?.cards?.length <= 40) : null;
             if (!firstValidDeckId) {
                 $('#connect-message').text('Erro: Nenhum deck válido (30-40 cartas). Crie/Edite nos Decks.').css('color', 'salmon');
                 return;
             }
            setTimeout(() => initializeAndStartGame(firstValidDeckId), 500); // Inicia com o deck válido
        });
        $('#btn-cancel-hosting').on('click', () => {
             $('#server-status-section').hide();
             $('#connect-message').text('Criação cancelada.');
        });

        // --- Final Log ---
        console.log("Runebound Clash UI Ready (v2.4 - Splash Fix).");

    } catch (initError) {
        console.error("MAIN: Critical initialization error:", initError);
         // Mostra erro crítico na splash screen ou no container
         const $splashSevereError = $('#splash-screen');
         // Verifica se a splash existe E está ativa (ou se é a única coisa na tela)
         if ($splashSevereError.length && ($splashSevereError.hasClass('active') || $screensContainer.children().length <= 1)) {
              $splashSevereError.text(`Erro Crítico: ${initError.message}. Recarregue.`).css('color', 'red');
              $('.screen').removeClass('active');
              $splashSevereError.addClass('active');
         } else {
            $screensContainer.html(`<p style="color:red; font-weight:bold;">Erro Crítico de Inicialização: ${initError.message}. Recarregue.</p>`);
         }
    }
}); // --- END Document Ready ---