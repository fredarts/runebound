// js/main.js - ATUALIZADO com Pop-up de Escolha de Deck e ESC Menu integrado

// --- Imports ---
import Game from './core/Game.js';
import UIManager from './ui/UIManager.js';
import ScreenManager from './ui/ScreenManager.js';
import AccountManager from './account/AccountManager.js';
import AudioManager from './audio/AudioManager.js';
import { loadCardDefinitions } from './utils.js';
import CustomCursor from './ui/CustomCursor.js';
import { getAIProfile } from './data/ai/AIData.js';
import PauseMenuUI from './ui/PauseMenuUI.js';

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
import opponentDeckChoiceModalTemplate from './ui/html-templates/opponentDeckChoiceModalTemplate.js';

// --- Document Ready ---
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

  // --- Geração do HTML das telas ---
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
    console.error("MAIN: Critical error during HTML generation:", htmlGenError);
    if (customCursorInstance) customCursorInstance.destroy();
    return;
  }

  // --- Injeta o modal de escolha do deck da IA e garante overlay correto ---
  $body.append(opponentDeckChoiceModalTemplate());
  $('#ai-deck-choice-overlay').addClass('image-zoom-overlay'); // garante z-index/posicionamento de overlay

  console.log("MAIN: Initializing modules and binding events...");

  try {
    const cardDatabase = await loadCardDefinitions();
    if (!cardDatabase || Object.keys(cardDatabase).length === 0) {
      console.error("MAIN: Card database is empty or failed to load. Aborting initialization.");
      if (customCursorInstance) customCursorInstance.destroy();
      return;
    }

    const screenManager = new ScreenManager();
    const accountManager = new AccountManager();
    const audioManager = new AudioManager();
    const uiManager = new UIManager(screenManager, accountManager, cardDatabase, audioManager);

    setTimeout(() => $('#splash-screen').addClass('loading'), 50);

    setTimeout(async () => {
      $('#splash-screen').removeClass('active loading');
      await uiManager.navigateTo('title-screen');
      console.log("MAIN: Initial screen setup complete.");
    }, 3000);

    const addAudioListeners = ($element, sfxClick = 'buttonClick', sfxHover = 'buttonHover') => {
      $element.off('click.uisfx mouseenter.uisfx')
        .on('click.uisfx', () => audioManager?.playSFX(sfxClick))
        .on('mouseenter.uisfx', () => audioManager?.playSFX(sfxHover));
    };

    // --- Navegações e formulários básicos ---
    const $btnBackToTitle = $('#btn-create-back-to-title, #btn-login-back-to-title');
    $btnBackToTitle.on('click', () => {
      $('#create-account-message, #login-message').text('');
      uiManager.navigateTo('title-screen');
    });
    addAudioListeners($btnBackToTitle);

    $('#create-account-form').on('submit', (event) => {
      event.preventDefault();
      const u = $('#create-username').val().trim();
      const p = $('#create-password').val();
      const r = accountManager.createAccount(u, p);
      $('#create-account-message').text(r.message).css('color', r.success ? 'lightgreen' : 'salmon');
      if (r.success) {
        setTimeout(() => uiManager.navigateTo('login-screen'), 2000);
      }
    });
    addAudioListeners($('#create-account-form button'));

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
    addAudioListeners($('#login-form button'));

    addAudioListeners($('#btn-options-back-to-main'));
    $('#btn-deck-builder-back').on('click', () => uiManager.navigateTo('deck-management-screen'));
    addAudioListeners($('#btn-deck-builder-back'));
    $('#btn-connect-back-to-main').on('click', () => uiManager.navigateTo('home-screen'));
    addAudioListeners($('#btn-connect-back-to-main'));
    addAudioListeners($('#btn-save-options'), 'deckSave');

    // --- Estado de jogo e inicialização de partida vs. IA ---
    let gameInstance = null;

    async function initializeAndStartGame(localPlayerDeckId, opponentUsername = "Opponent_AI", opponentDeckId) {
      console.log("MAIN: Initializing game...");
      const aiProfileData = await getAIProfile();
      if (!aiProfileData) {
        $('#connect-message').text('Erro Crítico: Não foi possível carregar os dados da IA.').css('color', 'salmon');
        return;
      }
      if (!accountManager.getUserData(opponentUsername)) {
        console.log(`MAIN: Perfil da IA para '${opponentUsername}' não encontrado. Criando agora...`);
        accountManager.createOrUpdateAccount(aiProfileData);
      }

      const currentUser = accountManager.getCurrentUser();
      if (!currentUser) {
        $('#connect-message').text('Erro: Usuário não logado.').css('color', 'salmon');
        return;
      }
      const localDeck = (accountManager.loadDecks() || {})[localPlayerDeckId];
      if (!localDeck?.cards || localDeck.cards.length < 30 || localDeck.cards.length > 60) {
        $('#connect-message').text(`Erro: Deck '${localDeck?.name || "selecionado"}' inválido (precisa de 30 a 60 cartas).`).css('color', 'salmon');
        return;
      }
      const opponentDeckIds = accountManager.getUserData(opponentUsername)?.decks?.[opponentDeckId]?.cards;
      if (!opponentDeckIds || opponentDeckIds.length === 0) {
        $('#connect-message').text('Erro Crítico: Não foi possível carregar o deck do oponente.').css('color', 'salmon');
        return;
      }

      console.log(`MAIN: Usando deck do oponente '${opponentDeckId}' (${opponentDeckIds.length} cartas).`);
      console.log(`MAIN: Preparando ${currentUser.username} vs ${opponentUsername}`);

      try {
        gameInstance = new Game(cardDatabase);
        const player1 = gameInstance.addPlayer(currentUser.username, localDeck.cards);
        const player2_IA = gameInstance.addPlayer(opponentUsername, opponentDeckIds);

        if (!player1 || !player2_IA) throw new Error("Falha ao adicionar jogadores.");

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

    // --- Pause Menu (ESC) - Instância ---
    const pauseMenu = new PauseMenuUI({
      audioManager,
      // Checagem de "estou em batalha"
      isBattleActive: () => !!document.querySelector('.battle-screen.active, [data-screen="battle"].active, #battle-screen.active, #game-battle-screen.active')
    });

    // ==== ESC MENU INTEGRAÇÃO CORRIGIDA ====

    // 1) Ir para Opções ao clicar em "Opções"
    document.addEventListener('pause:options', async () => {
      try { pauseMenu?.close(); } catch {}
      await uiManager.navigateTo('options-screen');
      audioManager?.fadeMusic?.(0.6);
    });

    // 2) Sair da partida de verdade (encerrar jogo e voltar pra "Conectar")
    function quitMatchAndReturnToConnect() {
      try { pauseMenu?.close(); } catch {}

      // Para loops/timers se existirem
      try { window.GameLoop?.stop?.(); } catch {}
      try { window.GameLoop?.pause?.(); } catch {}

      // Tenta desmontar/fechar o jogo
      try { gameInstance?.destroy?.(); } catch {}
      try { gameInstance?.endGame?.(); } catch {}
      try { gameInstance = null; } catch {}

      // Remove qualquer marcação de tela de batalha
      $('.battle-screen, [data-screen="battle"], #battle-screen, #game-battle-screen').removeClass('active');

      // Volta para a tela de conectar
      uiManager.navigateTo('connect-screen').then(() => {
        $('#connect-message').text('Partida encerrada.').css('color', 'orange');
      });

      // SFX / música
      audioManager?.playSFX?.('menuBack') || audioManager?.playSFX?.('buttonClick');
      audioManager?.fadeMusic?.(1.0);
    }

    // 3) Handler do "Sair da partida"
    document.addEventListener('pause:exit', () => {
      quitMatchAndReturnToConnect();
    });

    // 4) (Opcional) Abrindo o pause baixa um pouco a música; voltando restaura
    document.addEventListener('pause:opened', () => {
      window.GameLoop?.pause?.();
      audioManager?.fadeMusic?.(0.4);
    });

    document.addEventListener('pause:resumed', () => {
      window.GameLoop?.resume?.();
      audioManager?.fadeMusic?.(1.0);
    });

    // ======================================================================
    // <<< LÓGICA DO POP-UP DE ESCOLHA DE DECK >>> (ATUALIZADO)
    // ======================================================================

    // Abre o modal ao clicar em "Criar Jogo (vs. IA)"
    $(document).on('click', '#btn-create-server', () => {
      audioManager.playSFX('buttonClick');
      const decks = accountManager.loadDecks();
      const firstValidDeckId = decks ? Object.keys(decks).find(id => decks[id]?.cards?.length >= 30 && decks[id]?.cards?.length <= 60) : null;

      if (!firstValidDeckId) {
        $('#connect-message').text('Erro: Nenhum deck válido (30-60 cartas) encontrado. Crie um deck primeiro.').css('color', 'salmon');
        audioManager.playSFX('genericError');
        return;
      }
      $('#ai-deck-choice-overlay').addClass('active');
    });

    // Seleção do deck do oponente dentro do modal
    $(document).on('click', '#ai-deck-choice-overlay .deck-choice-option', function () {
      audioManager.playSFX('buttonClick');
      const chosenOpponentDeckId = $(this).data('deck-id');
      $('#ai-deck-choice-overlay').removeClass('active');

      const decks = accountManager.loadDecks();
      const firstValidDeckId = decks ? Object.keys(decks).find(id => decks[id]?.cards?.length >= 30 && decks[id]?.cards?.length <= 60) : null;

      if (firstValidDeckId && chosenOpponentDeckId) {
        initializeAndStartGame(firstValidDeckId, 'Opponent_AI', chosenOpponentDeckId);
      } else {
        $('#connect-message').text('Erro ao iniciar a partida. Verifique seu deck.').css('color', 'salmon');
      }
    });

    // Botão "Cancelar" do modal
    $(document).on('click', '#ai-deck-choice-overlay [data-action="cancelar"]', () => {
      audioManager.playSFX('buttonClick');
      $('#ai-deck-choice-overlay').removeClass('active');
    });

    // ======================================================================

    // UI de conectar/juntar-se (placeholders)
    $('#btn-show-join-options').on('click', () => {
      $('#server-status-section').hide();
      $('#join-game-section').show();
      $('#connect-message').text('');
    });
    addAudioListeners($('#btn-show-join-options'));

    $('#btn-connect-to-server').on('click', () => {
      $('#connect-message').text('Modo multiplayer ainda não implementado.').css('color', 'orange');
    });
    addAudioListeners($('#btn-connect-to-server'));

    console.log("Runebound Clash UI Ready.");

  } catch (initError) {
    console.error("MAIN: Critical initialization error:", initError);
    $screensContainer.html(`<p style="color:red; font-weight:bold;">Erro Crítico: ${initError.message}. Recarregue.</p>`);
    if (customCursorInstance) customCursorInstance.destroy();
  }
});
