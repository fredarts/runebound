// js/main.js - VERSÃO COMPLETA E CORRIGIDA
// - Teardown canônico (uma única função)
// - Pause Menu com eventos alinhados e fechamento antes de navegar
// - Overlay de zoom global garantido e único
// - Integração correta com GraveyardModal (ESM default) + template nomeado

// --- Imports Core ---
import Game from './core/Game.js';
import UIManager from './ui/UIManager.js';
import ScreenManager from './ui/ScreenManager.js';
import AccountManager from './account/AccountManager.js';
import AudioManager from './audio/AudioManager.js';
import { loadCardDefinitions } from './utils.js';
import CustomCursor from './ui/CustomCursor.js';
import { getAIProfile } from './data/ai/AIData.js';
import PauseMenuUI from './ui/PauseMenuUI.js';

// --- Imports de Templates HTML (screens/globais) ---
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

// >>> Graveyard (agora ESM com export default) + HTML template nomeado
import GraveyardModal, { generateGraveyardModalHTML } from './ui/html-templates/graveyardModalTemplate.js';

// Outros modais globais
import pauseMenuTemplate from './ui/html-templates/pauseMenuTemplate.js';

// >>> Overlay de zoom global (garantido)
const globalZoomOverlayTemplate = () => `
<div id="battle-image-zoom-overlay" class="image-zoom-overlay" aria-hidden="true" style="display:none">
  <img id="battle-zoomed-image" src="" alt="Zoomed Card">
</div>
`;

// ---------- Funções utilitárias globais (declaradas como function para hoisting) ----------
function ensureZoomOverlay() {
  let ov = document.getElementById('battle-image-zoom-overlay');
  if (!ov) {
    const wrap = document.createElement('div');
    wrap.innerHTML = globalZoomOverlayTemplate();
    ov = wrap.firstElementChild;
    document.body.appendChild(ov);
  }
  return ov;
}

// >>> INÍCIO DA CORREÇÃO: Função de Limpeza Canônica <<<
/**
 * Destrói completamente o estado de uma partida ativa.
 * É seguro chamar esta função mesmo que não haja partida em andamento.
 * @param {string | null} nextScreen - A tela para a qual navegar após a limpeza. Se for `null`, não navega.
 */
function teardownMatch(nextScreen = 'connect-screen') {
  console.log(`[TEARDOWN] Iniciando limpeza completa. Próxima tela: ${nextScreen}`);
  try {
    // 1. Fecha modais abertos (Pausa, Cemitério, etc.)
    window.ModalStack?.clearAll?.();
    
    // 2. Reseta o estado do modal de Cemitério
    GraveyardModal?.reset?.();
    
    // 3. Destrói a UI específica da batalha (desvincula listeners, etc.)
    // O ideal é que BattleScreenUI tenha um método para isso.
    if (window.uiManager) {
        const battleUI = window.uiManager._battleUI; // Acessando via UIManager
        if (battleUI && typeof battleUI.destroyMatch === 'function') {
            battleUI.destroyMatch();
            console.log("[TEARDOWN] BattleScreenUI.destroyMatch() chamado.");
        }
    }

    // 4. Limpa o DOM das zonas de batalha para garantir que não sobrem cartas visíveis.
    const zoneIds = [
      'player-hand', 'opponent-hand',
      'player-battlefield', 'opponent-battlefield',
      'game-log'
    ];
    zoneIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = ''; // Limpa o conteúdo
    });
    $('#game-log').html('<li>Log da Partida:</li>'); // Reseta o log com o cabeçalho
    console.log("[TEARDOWN] Zonas do DOM limpas.");

    // 5. Destrói a instância lógica do jogo e zera a referência global
    window.gameInstance?.destroy?.();
    window.gameInstance = null;
    console.log("[TEARDOWN] Instância do jogo destruída.");

    // 6. Para a música de batalha e outros sons contínuos
    window.audioManager?.stopBGM?.();
    console.log("[TEARDOWN] Áudio da partida interrompido.");

    // 7. Navega para a próxima tela, se especificado
    if (nextScreen && window.uiManager) {
      window.uiManager.navigateTo(nextScreen);
    }
  } catch (e) {
    console.error('[TEARDOWN] Erro durante a limpeza da partida:', e);
    // Em caso de erro, tenta uma navegação de fallback para evitar que o usuário fique preso
    if (nextScreen && window.uiManager) {
      window.uiManager.navigateTo('home-screen');
    }
  }
}
// Exporta a função para o escopo global para que outros módulos possam acessá-la.
window.teardownMatch = teardownMatch;



// -------------------------------------------------------------------------------------------------

$(document).ready(async () => {
  console.log('Runebound Clash - Initializing (Dynamic HTML).');

  // Cursor customizado com fallback
  let customCursorInstance = null;
  try {
    customCursorInstance = new CustomCursor(260);
  } catch (cursorError) {
    console.error('Failed to initialize custom cursor:', cursorError);
    $('body').css('cursor', 'url("assets/images/ui/cursor.png"), auto');
  }

  const $screensContainer = $('#screens-container');
  const $body = $('body');

  if (!$screensContainer.length) {
    console.error('CRITICAL ERROR: #screens-container not found!');
    return;
  }

  // ---------- 1) Render de TEMPLATES ----------
  try {
    $screensContainer
      .empty()
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

    // Elementos globais no <body>
    $body.prepend(generateTopBarHTML());
    $body.append(opponentDeckChoiceModalTemplate());

    // Cemitério: injeta o HTML (idempotente). O controller também cria se faltar,
    // mas manter o template aqui ajuda o SSR/manual debug.
    if (!document.getElementById('graveyard-overlay')) {
      $body.append(generateGraveyardModalHTML());
    }

    // Pause menu
    $body.append(pauseMenuTemplate());

    // Overlay global de zoom – só adiciona se não existir
    if (!document.getElementById('battle-image-zoom-overlay')) {
      $body.append(globalZoomOverlayTemplate());
    }

    console.log('MAIN: HTML Structure dynamically generated.');
  } catch (htmlGenError) {
    console.error('MAIN: Critical error during HTML generation:', htmlGenError);
    if (customCursorInstance) customCursorInstance.destroy();
    return;
  }

  // ---------- 2) Inicialização de módulos ----------
  console.log('MAIN: Initializing modules and binding events...');
  try {
    const cardDatabase = await loadCardDefinitions();
    if (!cardDatabase || Object.keys(cardDatabase).length === 0) {
      console.error('MAIN: Card database is empty or failed to load. Aborting initialization.');
      if (customCursorInstance) customCursorInstance.destroy();
      return;
    }

    // helpers globais
    window.cardDatabase = cardDatabase;
    window.lookupCard = function (id) {
      if (!id) return null;
      return window.cardDatabase[String(id).trim().toUpperCase()] || null;
    };

    const screenManager = new ScreenManager();
    const accountManager = new AccountManager();
    const audioManager = new AudioManager();
    const uiManager = new UIManager(screenManager, accountManager, cardDatabase, audioManager);

    // Torna acessível para teardown e debugging (onde necessário)
    window.uiManager = uiManager;
    window.audioManager = audioManager;

    // Splash -> Title
    setTimeout(() => $('#splash-screen').addClass('loading'), 50);
    setTimeout(async () => {
      $('#splash-screen').removeClass('active loading');
      await uiManager.navigateTo('title-screen');
      console.log('MAIN: Initial screen setup complete.');
    }, 3000);

    // ---------- 3) Utilidades de UI ----------
    const addAudioListeners = ($element, sfxClick = 'buttonClick', sfxHover = 'buttonHover') => {
      $element
        .off('click.uisfx mouseenter.uisfx')
        .on('click.uisfx', () => audioManager?.playSFX?.(sfxClick))
        .on('mouseenter.uisfx', () => audioManager?.playSFX?.(sfxHover));
    };

    // Navegação básica
    $('#btn-create-back-to-title, #btn-login-back-to-title').on('click', () => {
      $('#create-account-message, #login-message').text('');
      uiManager.navigateTo('title-screen');
    });

    // Formulários
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

    // Garante overlays globais
    ensureZoomOverlay();
    // Força o controller do cemitério a existir e ficar limpo
    try { GraveyardModal.reset(); } catch {}

    // ---------- 4) Partida vs IA ----------
    let gameInstance = null;
    window.gameInstance = window.gameInstance || null; // referência global (para teardown seguro)

    async function initializeAndStartGame(localPlayerDeckId, opponentUsername = 'Opponent_AI', opponentDeckId) {
      console.log('MAIN: Initializing game...');
      try { teardownMatch(null); } catch {}

      const aiProfileData = await getAIProfile();
      if (!aiProfileData) {
        $('#connect-message').text('Erro Crítico: Não foi possível carregar os dados da IA.').css('color', 'salmon');
        return;
      }
      if (!accountManager.getUserData(opponentUsername)) {
        accountManager.createOrUpdateAccount(aiProfileData);
      }

      const currentUser = accountManager.getCurrentUser();
      const allDecks = accountManager.loadDecks() || {};
      const localDeck = allDecks[localPlayerDeckId];
      const opponentDeckIds = accountManager.getUserData(opponentUsername)?.decks?.[opponentDeckId]?.cards;

      if (!localDeck || !localDeck.cards || localDeck.cards.length < 30 || localDeck.cards.length > 60) {
        $('#connect-message').text('Erro: Seu deck é inválido.').css('color', 'salmon');
        return;
      }
      if (!opponentDeckIds || opponentDeckIds.length === 0) {
        $('#connect-message').text('Erro Crítico: Não foi possível carregar o deck do oponente.').css('color', 'salmon');
        return;
      }

      try {
        gameInstance = new Game(cardDatabase);

        // Útil para debug
        window.__lastGame = gameInstance;

        // Cria jogadores e registra no UI
        const player1 = gameInstance.addPlayer(currentUser.username, localDeck.cards);
        const player2_IA = gameInstance.addPlayer(opponentUsername, opponentDeckIds);

        uiManager.setGameInstance(gameInstance);
        uiManager.setLocalPlayer(player1.id);

        // >>> Integra o cemitério com o jogo ATUAL (antes de startGame)
        try {
          GraveyardModal.reset(); // estado limpo de partida anterior
          GraveyardModal.registerGame(gameInstance);
          GraveyardModal.registerPlayerResolver((ownerIdOrName) => {
            const list = Array.isArray(gameInstance.players) ? gameInstance.players : [];
            return list.find(p => p?.id === ownerIdOrName || p?.name === ownerIdOrName) || null;
          });
          console.log('[main.js] Instância do jogo registrada com sucesso no GraveyardModal.');
        } catch (e) {
          console.warn('[main.js] Falha ao registrar jogo no GraveyardModal:', e);
        }

        if (gameInstance.setupGame()) {
          gameInstance.startGame();
          uiManager.renderInitialGameState();
          console.log('MAIN: Game started successfully!');
          $('#connect-message').text('');
        }
      } catch (error) {
        $('#connect-message').text(`Erro ao iniciar: ${error.message}`).css('color', 'salmon');
        gameInstance = null;
      }
    }

    // ---------- 5) Pause Menu ----------
    const pauseMenu = new PauseMenuUI({
      isBattleActive: () => $('#battle-screen').hasClass('active')
    });
    pauseMenu.bindGlobalShortcut();
    if (typeof pauseMenu.bindOpenRequest === 'function') {
      pauseMenu.bindOpenRequest();
    }

    // Eventos do Pause (padronizados)
    document.addEventListener('pause:options', () => {
      try { pauseMenu.close(); } catch {}
      uiManager.navigateTo('options-screen');
    });

    document.addEventListener('pause:exit', () => {
      teardownMatch('connect-screen');
    });

    document.addEventListener('pause:concede', () => {
      teardownMatch('connect-screen');
    });

    // Compatibilidade com emissões antigas (se ainda existirem)
    document.addEventListener('app:navigate:title', () => {
      teardownMatch('connect-screen');
    });
    document.addEventListener('battle:concede:request', () => {
      teardownMatch('connect-screen');
    });
    document.addEventListener('options:open', () => {
      try { pauseMenu.close(); } catch {}
      uiManager.navigateTo('options-screen');
    });

    // ---------- 6) Modal de escolha de Deck (vs IA) ----------
    $(document).on('click', '#btn-create-server', () => {
      const decks = accountManager.loadDecks();
      const firstValidDeckId = decks
        ? Object.keys(decks).find(id => decks[id]?.cards?.length >= 30 && decks[id]?.cards?.length <= 60)
        : null;

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
      const firstValidDeckId = decks
        ? Object.keys(decks).find(id => decks[id]?.cards?.length >= 30 && decks[id]?.cards?.length <= 60)
        : null;

      if (firstValidDeckId && chosenOpponentDeckId) {
        initializeAndStartGame(firstValidDeckId, 'Opponent_AI', chosenOpponentDeckId);
      }
    });

    $(document).on('click', '#ai-deck-choice-overlay [data-action="cancelar"]', () => {
      $('#ai-deck-choice-overlay').removeClass('active');
    });

    // Placeholders de multiplayer
    $('#btn-show-join-options').on('click', () => {
      $('#join-game-section').show();
      $('#connect-message').text('');
    });
    $('#btn-connect-to-server').on('click', () => {
      $('#connect-message').text('Modo multiplayer ainda não implementado.').css('color', 'orange');
    });

    console.log('Runebound Clash UI Ready.');

  } catch (initError) {
    console.error('MAIN: Critical initialization error:', initError);
    $('#screens-container').html(
      `<p style="color:red; font-weight:bold;">Erro Crítico: ${initError.message}</p>`
    );
  }
});
