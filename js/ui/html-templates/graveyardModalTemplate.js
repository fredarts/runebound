// js/ui/html-templates/graveyardModalTemplate.js
// Template + Controller com autodetecção e possibilidade de registrar game/resolver externamente.
// Mantém compatibilidade com o seu template e adiciona:
//  - GraveyardModal.registerGame(game)
//  - GraveyardModal.registerPlayerResolver(fn)
//  - Eventos: ui:register:game, ui:register:player-resolver, ui:graveyard:open
//  - Fallbacks robustos para localizar a zona "cemitério" e transformar raw->card entity.

import ModalStack from '../helpers/ModalStack.js';
import ZoomHandler from '../helpers/ZoomHandler.js';
import CardRegistry from '../../data/CardRegistry.js';

// ---------------- TEMPLATE (default export — inalterado) ----------------
export default function graveyardModalTemplate() {
  return `
<div id="graveyard-overlay"
     class="image-zoom-overlay fiery-opt-in"
     aria-hidden="true"
     style="display:none">
  <div class="graveyard-panel" role="dialog" aria-modal="true" aria-labelledby="graveyard-title">
    <header class="section-header">
      <h2 id="graveyard-title" class="section-title">
        Cemitério — <span class="gy-owner">Você</span>
      </h2>
      <p class="section-subtitle">Clique fora para fechar.</p>
    </header>

    <div id="graveyard-card-list" class="graveyard-grid" role="list"></div>

    <div class="graveyard-empty" hidden>
      <p>O cemitério está vazio.</p>
    </div>
  </div>
</div>
  `;
}

// ---------------- CONTROLLER ----------------
class GraveyardController {
  constructor() {
    /** @type {HTMLElement|null} */ this.$overlay = null;
    /** @type {HTMLElement|null} */ this.$grid = null;
    /** @type {HTMLElement|null} */ this.$empty = null;
    /** @type {HTMLElement|null} */ this.$owner = null;

    /** @type {any} */ this._playerRef = null;
    /** @type {any} */ this._gameRef = null;
    /** @type {function|null} */ this._playerResolver = null;
    this._isOpen = false;
    this.DEBUG = false;

    // Zoom compartilhado (usa overlay do zoom de batalha se já existir)
    this.zoom = new ZoomHandler({
      overlaySelector: '#battle-image-zoom-overlay',
      baseZ: 1300,
      autoCreate: false,
    });

    this._ensureMounted();
    this._bindBackdropClose();
    this._bindCloseButton();
    this._bindGlobalEvent();
    this._registerExternalRefsBridge();
  }

  // --------------- Logging helpers ---------------
  _log(...a){ if(this.DEBUG) console.log('[GraveyardModal]', ...a); }
  _warn(...a){ console.warn('[GraveyardModal]', ...a); }

  // --------------- Montagem/Binding ---------------
  _ensureMounted() {
    let overlay = document.getElementById('graveyard-overlay');
    if (!overlay) {
      const tpl = graveyardModalTemplate();
      const div = document.createElement('div');
      div.innerHTML = tpl.trim();
      document.body.appendChild(div.firstElementChild);
      overlay = document.getElementById('graveyard-overlay');
      this._log('Template injetado no DOM.');
    }
    this.$overlay = overlay;
    this.$grid = overlay.querySelector('#graveyard-card-list') || overlay.querySelector('.graveyard-grid');
    this.$empty = overlay.querySelector('.graveyard-empty');
    this.$owner = overlay.querySelector('.gy-owner');

    if (!this.$grid) this._warn('Grid não encontrado (#graveyard-card-list ou .graveyard-grid).');
  }

  _bindBackdropClose() {
    if (!this.$overlay) return;
    this.$overlay.addEventListener('click', (e) => {
      if (e.target === this.$overlay && this._isOpen && ModalStack.top()?.el === this.$overlay) {
        e.preventDefault(); e.stopPropagation();
        this.close();
      }
    });
  }

  _bindCloseButton() {
    if (!this.$overlay) return;
    this.$overlay.addEventListener('click', (e) => {
      const t = /** @type {HTMLElement} */ (e.target);
      const btn = t.closest?.('[data-action="close-graveyard"]');
      if (btn) { e.preventDefault(); e.stopPropagation(); this.close(); }
    });
  }

  _bindGlobalEvent() {
    document.addEventListener('ui:graveyard:open', (e) => {
      const detail = e.detail || {};
      this.open(detail.player ?? detail.selector ?? 'current', { ownerLabel: detail.ownerLabel });
    });
  }

  _registerExternalRefsBridge() {
    document.addEventListener('ui:register:game', (e) => {
      const g = e?.detail?.game;
      if (g) {
        this._gameRef = g;
        this._log('Game registrado via evento:', !!this._gameRef);
      }
    });

    document.addEventListener('ui:register:player-resolver', (e) => {
      const fn = e?.detail?.resolver;
      if (typeof fn === 'function') {
        this._playerResolver = fn;
        this._log('Player resolver registrado (evento).');
      }
    });
  }

  // --------------- API de registro explícito ---------------
  registerGame(game) {
    this._gameRef = game || null;
    this._log('Game registrado via API:', !!this._gameRef);
  }
  registerPlayerResolver(fn) {
    if (typeof fn === 'function') {
      this._playerResolver = fn;
      this._log('Player resolver registrado via API.');
    }
  }

  // --------------- Autodetecção de game/player ---------------
  _autodetectGame() {
    if (this._gameRef) return this._gameRef;

    const w = window;
    const candidates = [
      w.game, w.__game, w.__CURRENT_GAME, w.__lastGame, w.RBC?.game,
      w.UIManager?.game, w.UIManager?.currentGame, w.UIManager?._game,
      w.UI?.game, w.__RBC?.game, w.ScreenManager?.game
    ].filter(Boolean);

    const best = candidates.find(g => g && typeof g.getPlayer === 'function' && g.getCurrentPlayer);
    return best || candidates[0] || null;
  }

  _autodetectPlayer(selector = 'current') {
    if (this._playerResolver) {
      try {
        const p = this._playerResolver(selector);
        if (p) return p;
      } catch {}
    }

    const game = this._autodetectGame();
    if (!game) return null;

    if (selector === 'current') return game.getCurrentPlayer ? game.getCurrentPlayer() : null;
    if (selector === 'opponent') return game.getOpponent ? game.getOpponent(game.getCurrentPlayer()?.id) : null;
    if (typeof selector === 'string' && selector.startsWith('player_')) return game.getPlayer ? game.getPlayer(selector) : null;
    if (selector && typeof selector === 'object' && selector.id) return selector;

    return null;
  }

  // --------------- API PÚBLICA ---------------
  open(playerOrSelector, { ownerLabel } = {}) {
    let player = playerOrSelector;
    if (!player || typeof player === 'string') {
      player = this._autodetectPlayer(player || 'current') || null;
    }

    this._playerRef = player || this._playerRef;
    if (!this._playerRef) {
      document.dispatchEvent(new CustomEvent('ui:graveyard:needs-game'));
      this._warn('Nenhum player disponível em .open(). Registre o game: GraveyardModal.registerGame(game)');
      return;
    }

    if (this.$owner && ownerLabel) this.$owner.textContent = ownerLabel;

    this.$overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      this.$overlay.classList.add('active');
      this.$overlay.setAttribute('aria-hidden', 'false');
      this._isOpen = true;
      ModalStack.push(this.$overlay, { onClose: () => this.close(), esc: true, backdrop: true, baseZ: 1200 });
      this._renderCards();
    });
  }

  close() {
    if (!this._isOpen || !this.$overlay) return;
    if (this.zoom?.isZoomOpen && this.zoom.isZoomOpen()) { this.zoom.closeZoom(); return; }
    this.$overlay.classList.remove('active');
    this.$overlay.setAttribute('aria-hidden', 'true');
    setTimeout(() => { if (!this.$overlay?.classList.contains('active')) this.$overlay.style.display = 'none'; }, 200);
    this._isOpen = false;
    ModalStack.remove(this.$overlay);
  }

  refresh() { if (this._isOpen) this._renderCards(); }

  // --------------- Lógica de Leitura e Renderização ---------------
  
  _readGraveyardFrom(player) {
    const { arr } = this._detectGraveyardArray(player, this.DEBUG);
    return arr || [];
  }
  
  // AQUI ESTÁ A CORREÇÃO PRINCIPAL
  _detectGraveyardArray(player, verbose = false) {
    if (!player) return { arr: [], path: '', reason: 'sem player' };

    // >>> [CORREÇÃO APLICADA] <<<
    // Tenta primeiro o padrão do seu projeto: player.graveyard.getCards()
    if (player.graveyard && typeof player.graveyard.getCards === 'function') {
        try {
            const cards = player.graveyard.getCards();
            if (Array.isArray(cards)) {
                if (verbose) this._log("Zona encontrada via 'player.graveyard.getCards()'");
                return { arr: cards, path: 'player.graveyard.getCards()', reason: 'método getCards()' };
            }
        } catch (e) {
            this._warn('Erro ao chamar player.graveyard.getCards()', e);
        }
    }
    // >>> FIM DA CORREÇÃO <<<

    // Fallbacks (mantidos por robustez)
    if (Array.isArray(player.graveyard)) return { arr: player.graveyard, path: 'player.graveyard', reason: 'propriedade direta' };
    if (typeof player.getZone === 'function') {
      try {
        const z = player.getZone('graveyard');
        if (Array.isArray(z)) return { arr: z, path: "player.getZone('graveyard')", reason: 'getter' };
      } catch {}
    }
    if (player.zones && Array.isArray(player.zones.graveyard)) {
      return { arr: player.zones.graveyard, path: 'player.zones.graveyard', reason: 'zones.graveyard' };
    }
    // ... outros fallbacks ...
    return { arr: [], path: '', reason: 'não encontrado' };
  }

  _toEntity(raw) {
    try {
      if (CardRegistry && typeof CardRegistry.toEntity === 'function') {
        return CardRegistry.toEntity(raw);
      }
    } catch {}
    const id = raw.id || raw.cardId || raw.baseId || '';
    const name = raw.name || id || 'Carta';
    const image = raw.image_src || raw.image || raw.art || '';
    return { id, name, image, thumb: image, uniqueId: raw.uniqueId || id };
  }

  _renderCards() {
    if (!this.$grid) { this._ensureMounted(); if (!this.$grid) return; }
    const gy = this._readGraveyardFrom(this._playerRef);
    this.$grid.innerHTML = '';

    if (!Array.isArray(gy) || gy.length === 0) {
      if (this.$empty) this.$empty.hidden = false;
      return;
    }
    if (this.$empty) this.$empty.hidden = true;

    const frag = document.createDocumentFragment();
    gy.forEach((raw) => {
      const c = this._toEntity(raw);
      const item = document.createElement('div');
      item.className = 'gy-card';
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', `Ampliar ${c.name}`);
      item.dataset.fullSrc = c.image || c.thumb || '';

      const img = document.createElement('img');
      img.className = 'gy-thumb';
      img.alt = c.name;
      img.decoding = 'async';
      img.loading = 'lazy';
      img.src = c.thumb || c.image || '';

      const title = document.createElement('div');
      title.className = 'gy-title';
      title.textContent = c.name;

      item.appendChild(img);
      item.appendChild(title);
      frag.appendChild(item);

      const openZoom = (e) => {
        e.preventDefault(); e.stopPropagation();
        const url = item.dataset.fullSrc || img.src;
        if (url) this.zoom.handleZoomClick(e, url);
      };
      item.addEventListener('click', openZoom);
      item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openZoom(e); });
    });
    this.$grid.appendChild(frag);
  }
}

// ---------------- Bootstrap/Exposição Global ----------------
(function bootstrapGraveyard() {
  if (typeof window === 'undefined') return;
  const controller = new GraveyardController();
  window.GraveyardModal = {
    open: (...a) => controller.open(...a),
    close: () => controller.close(),
    refresh: () => controller.refresh(),
    registerGame: (g) => controller.registerGame(g),
    registerPlayerResolver: (fn) => controller.registerPlayerResolver(fn),
    get DEBUG() { return controller.DEBUG; },
    set DEBUG(v) { controller.DEBUG = !!v; },
  };
})();