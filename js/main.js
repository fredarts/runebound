// js/main.js - VERSÃO COMPLETA E ATUALIZADA
// Inclui a correção para o overlay de zoom global, mantendo todas as funcionalidades.

// --- Imports de Módulos Core ---
import Game from './core/Game.js';
import UIManager from './ui/UIManager.js';
import ScreenManager from './ui/ScreenManager.js';
import AccountManager from './account/AccountManager.js';
import AudioManager from './audio/AudioManager.js';
import { loadCardDefinitions } from './utils.js';
import CustomCursor from './ui/CustomCursor.js';
import { getAIProfile } from './data/ai/AIData.js';
import PauseMenuUI from './ui/PauseMenuUI.js';

// --- Imports de Templates HTML ---
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
import opponentDeckChoiceModalTemplate from './ui/html-templates/opponentDeckChoiceModalTemplate.js';
import graveyardModalTemplate from './ui/html-templates/graveyardModalTemplate.js';
import pauseMenuTemplate from './ui/html-templates/pauseMenuTemplate.js';

// >>> [NOVO E CORRIGIDO] <<< Template para o overlay de zoom global
const globalZoomOverlayTemplate = () => `
<div id="battle-image-zoom-overlay" class="image-zoom-overlay">
    <img id="battle-zoomed-image" src="" alt="Zoomed Card">
</div>
`;


$(document).ready(async () => {
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
    console.error("CRITICAL ERROR: #screens-container not found!");
    return;
  }

  try {
    // Renderiza todas as telas no container principal
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
    
    // Adiciona elementos globais (Top Bar e Modais) diretamente ao <body>
    $body.prepend(generateTopBarHTML());
    $body.append(opponentDeckChoiceModalTemplate());
    $body.append(graveyardModalTemplate());
    $body.append(pauseMenuTemplate());
    // >>> [NOVO E CORRIGIDO] <<< Adiciona o zoom overlay globalmente
    if (!document.getElementById('battle-image-zoom-overlay')) {
      $body.append(globalZoomOverlayTemplate()); // mantém o <img id="battle-zoomed-image">
}

    console.log("MAIN: HTML Structure dynamically generated.");
  } catch (htmlGenError) {
    console.error("MAIN: Critical error during HTML generation:", htmlGenError);
    if (customCursorInstance) customCursorInstance.destroy();
    return;
  }

  console.log("MAIN: Initializing modules and binding events...");
  try {
    const cardDatabase = await loadCardDefinitions();
    if (!cardDatabase || Object.keys(cardDatabase).length === 0) {
      console.error("MAIN: Card database is empty or failed to load. Aborting initialization.");
      if (customCursorInstance) customCursorInstance.destroy();
      return;
    }
    
    window.cardDatabase = cardDatabase;
    window.lookupCard = function(id) {
        if (!id) return null;
        return window.cardDatabase[String(id).trim().toUpperCase()] || null;
    };

    const screenManager = new ScreenManager();
    const accountManager = new AccountManager();
    const audioManager = new AudioManager();
    const uiManager = new UIManager(screenManager, accountManager, cardDatabase, audioManager);

    // Lógica da Splash Screen
    setTimeout(() => $('#splash-screen').addClass('loading'), 50);
    setTimeout(async () => {
      $('#splash-screen').removeClass('active loading');
      await uiManager.navigateTo('title-screen');
      console.log("MAIN: Initial screen setup complete.");
    }, 3000);

    // Navegações e formulários
    const addAudioListeners = ($element, sfxClick = 'buttonClick', sfxHover = 'buttonHover') => {
      $element.off('click.uisfx mouseenter.uisfx')
        .on('click.uisfx', () => audioManager?.playSFX(sfxClick))
        .on('mouseenter.uisfx', () => audioManager?.playSFX(sfxHover));
    };

    $('#btn-create-back-to-title, #btn-login-back-to-title').on('click', () => {
      $('#create-account-message, #login-message').text('');
      uiManager.navigateTo('title-screen');
    });

    $('#create-account-form').on('submit', (event) => {
      event.preventDefault();
      const u = $('#create-username').val().trim();
      const p = $('#create-password').val();
      const r = accountManager.createAccount(u, p);
      $('#create-account-message').text(r.message).css('color', r.success ? 'lightgreen' : 'salmon');
      if (r.success) setTimeout(() => uiManager.navigateTo('login-screen'), 2000);
    });

    $('#login-form').on('submit', async (event) => {
      event.preventDefault();
      const u = $('#login-username').val().trim();
      const p = $('#login-password').val();
      const r = accountManager.login(u, p);
      $('#login-message').text(r.message).css('color', r.success ? 'lightgreen' : 'salmon');
      if (r.success && r.user) {
        const nextScreen = r.user.initialSetupComplete === false ? 'lore-video-screen' : 'home-screen';
        await uiManager.navigateTo(nextScreen);
      }
    });

    $('#btn-deck-builder-back').on('click', () => uiManager.navigateTo('deck-management-screen'));
    $('#btn-connect-back-to-main').on('click', () => uiManager.navigateTo('home-screen'));

    // ===== Partida vs IA =====
    let gameInstance = null;

    async function initializeAndStartGame(localPlayerDeckId, opponentUsername = "Opponent_AI", opponentDeckId) {
      console.log("MAIN: Initializing game...");
      const aiProfileData = await getAIProfile();
      if (!aiProfileData) {
        $('#connect-message').text('Erro Crítico: Não foi possível carregar os dados da IA.').css('color', 'salmon');
        return;
      }
      if (!accountManager.getUserData(opponentUsername)) {
        accountManager.createOrUpdateAccount(aiProfileData);
      }

      const currentUser = accountManager.getCurrentUser();
      const localDeck = (accountManager.loadDecks() || {})[localPlayerDeckId];
      const opponentDeckIds = accountManager.getUserData(opponentUsername)?.decks?.[opponentDeckId]?.cards;
      
      if (!localDeck || !localDeck.cards || localDeck.cards.length < 30 || localDeck.cards.length > 60) {
        $('#connect-message').text(`Erro: Seu deck é inválido.`).css('color', 'salmon');
        return;
      }
      if (!opponentDeckIds || opponentDeckIds.length === 0) {
        $('#connect-message').text('Erro Crítico: Não foi possível carregar o deck do oponente.').css('color', 'salmon');
        return;
      }
      
      try {
        gameInstance = new Game(cardDatabase);

        // Registra a instância do jogo no modal do cemitério
        if (window.GraveyardModal && typeof window.GraveyardModal.registerGame === 'function') {
            window.GraveyardModal.registerGame(gameInstance);
            console.log("[main.js] Instância do jogo registrada com sucesso no GraveyardModal.");
        }
        // (Opcional, mas útil para depuração no console)
        window.__lastGame = gameInstance;

        const player1 = gameInstance.addPlayer(currentUser.username, localDeck.cards);
        const player2_IA = gameInstance.addPlayer(opponentUsername, opponentDeckIds);

        uiManager.setGameInstance(gameInstance);
        uiManager.setLocalPlayer(player1.id);

        if (gameInstance.setupGame()) {
          gameInstance.startGame();
          uiManager.renderInitialGameState();
          console.log("MAIN: Game started successfully!");
          $('#connect-message').text('');
        }
      } catch (error) {
        $('#connect-message').text(`Erro ao iniciar: ${error.message}`).css('color', 'salmon');
        gameInstance = null;
      }
    }

    // ===== Pause Menu (ESC) =====
    const pauseMenu = new PauseMenuUI({
      isBattleActive: () => $('#battle-screen').hasClass('active')
    });
    pauseMenu.bindGlobalShortcut();

    document.addEventListener('pause:exit', () => {
      gameInstance = null;
      uiManager.navigateTo('connect-screen');
    });
    document.addEventListener('pause:options', () => uiManager.navigateTo('options-screen'));


    // ===== Modal de Escolha de Deck (vs IA) =====
    $(document).on('click', '#btn-create-server', () => {
      const decks = accountManager.loadDecks();
      const firstValidDeckId = decks ? Object.keys(decks).find(id => decks[id]?.cards?.length >= 30 && decks[id]?.cards?.length <= 60) : null;
      if (!firstValidDeckId) {
        $('#connect-message').text('Erro: Nenhum deck válido (30-60 cartas) encontrado.').css('color', 'salmon');
        return;
      }
      $('#ai-deck-choice-overlay').addClass('active');
    });

    $(document).on('click', '#ai-deck-choice-overlay .deck-choice-option', function () {
      const chosenOpponentDeckId = $(this).data('deck-id');
      $('#ai-deck-choice-overlay').removeClass('active');
      const decks = accountManager.loadDecks();
      const firstValidDeckId = decks ? Object.keys(decks).find(id => decks[id]?.cards?.length >= 30 && decks[id]?.cards?.length <= 60) : null;
      if (firstValidDeckId && chosenOpponentDeckId) {
        initializeAndStartGame(firstValidDeckId, 'Opponent_AI', chosenOpponentDeckId);
      }
    });

    $(document).on('click', '#ai-deck-choice-overlay [data-action="cancelar"]', () => {
      $('#ai-deck-choice-overlay').removeClass('active');
    });
    
    // Outras ações (placeholders multiplayer etc.)
    $('#btn-show-join-options').on('click', () => {
      $('#join-game-section').show();
      $('#connect-message').text('');
    });
    $('#btn-connect-to-server').on('click', () => {
      $('#connect-message').text('Modo multiplayer ainda não implementado.').css('color', 'orange');
    });

    console.log("Runebound Clash UI Ready.");

  } catch (initError) {
    console.error("MAIN: Critical initialization error:", initError);
    $screensContainer.html(`<p style="color:red; font-weight:bold;">Erro Crítico: ${initError.message}. Recarregue.</p>`);
    if (customCursorInstance) customCursorInstance.destroy();
  }
});