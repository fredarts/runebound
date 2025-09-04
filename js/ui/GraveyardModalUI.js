// js/ui/GraveyardModalUI.js
// Modal do Cemitério, robusto e modular.
// - Seletores resilientes (#graveyard-card-list OU .graveyard-cards-grid)
// - Renderiza a partir do player (player.graveyard OU player.getZone('graveyard') OU player.zones.graveyard)
// - Integra ModalStack + ZoomHandler
// - Usa CardRegistry para normalizar cartas e resolver imagens

import ModalStack from './helpers/ModalStack.js';
import ZoomHandler from './helpers/ZoomHandler.js';
import CardRegistry from '../data/CardRegistry.js';

export default class GraveyardModalUI {
  /**
   * @param {Object} opts
   * @param {string} [opts.overlaySelector='#graveyard-overlay']
   * @param {string[]} [opts.gridSelectors=['#graveyard-card-list','.graveyard-cards-grid']]
   * @param {ZoomHandler} [opts.zoomHandler]
   */
  constructor(opts = {}) {
    this.overlaySelector = opts.overlaySelector || '#graveyard-overlay';
    this.gridSelectors =
      opts.gridSelectors || ['#graveyard-card-list', '.graveyard-cards-grid'];

    /** @type {HTMLElement|null} */
    this.$overlay = null;
    /** @type {HTMLElement|null} */
    this.$grid = null;

    this._isOpen = false;
    this._playerRef = null;

    this.zoom =
      opts.zoomHandler ||
      new ZoomHandler({
        overlaySelector: '#battle-image-zoom-overlay',
        baseZ: 1300,
        autoCreate: true,
      });

    this._cacheSelectors();
    this._bindCloseButtons();
  }

  _cacheSelectors() {
    this.$overlay = document.querySelector(this.overlaySelector);
    if (!this.$overlay) {
      console.warn('[GraveyardModalUI] Overlay não encontrado:', this.overlaySelector);
      return;
    }

    // tenta o primeiro que existir
    for (const sel of this.gridSelectors) {
      const g = this.$overlay.querySelector(sel);
      if (g) {
        this.$grid = g;
        break;
      }
    }
    if (!this.$grid) {
      console.warn(
        '[GraveyardModalUI] Grid do cemitério não encontrado. Tentados:',
        this.gridSelectors.join(', ')
      );
    }
  }

  _bindCloseButtons() {
    if (!this.$overlay) return;

    // qualquer botão com data-action="close-graveyard"
    this.$overlay.addEventListener('click', (e) => {
      const t = /** @type {HTMLElement} */ (e.target);
      const btn = t.closest?.('[data-action="close-graveyard"]');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    });
  }

  /** API para telas: abre o modal para um jogador */
  open(playerObject) {
    if (!this.$overlay) {
      this._cacheSelectors();
      if (!this.$overlay) return;
    }

    this._playerRef = playerObject || this._playerRef;

    // Mostra overlay
    this.$overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      this.$overlay.classList.add('active');
      this.$overlay.setAttribute('aria-hidden', 'false');
      this._isOpen = true;

      // Empilha: ESC/backdrop fecham apenas o topo
      ModalStack.push(this.$overlay, {
        onClose: () => this.close(),
        esc: true,
        backdrop: true,
        baseZ: 1200,
      });

      // Renderiza as cartas agora que o overlay está visível
      this._renderCards();
    });
  }

  close() {
    if (!this._isOpen || !this.$overlay) return;

    // Se o zoom estiver aberto, fecha o zoom antes (mantém o cemitério)
    if (this.zoom?.isZoomOpen && this.zoom.isZoomOpen()) {
      this.zoom.closeZoom();
      return;
    }

    // Saída visual
    this.$overlay.classList.remove('active');
    this.$overlay.setAttribute('aria-hidden', 'true');

    setTimeout(() => {
      if (!this.$overlay?.classList.contains('active')) {
        this.$overlay.style.display = 'none';
      }
    }, 200);

    this._isOpen = false;
    this._playerRef = null;

    // Desempilha
    ModalStack.remove(this.$overlay);
  }

  /** Atualiza a lista (pode ser chamado após entradas saírem/entrarem no GY) */
  refresh() {
    if (!this._isOpen) return;
    this._renderCards();
  }

  /** Busca a zona graveyard em diferentes formatos */
  _readGraveyardFrom(player) {
    if (!player) return [];
    // preferências:
    if (Array.isArray(player.graveyard)) return player.graveyard;
    if (typeof player.getZone === 'function') {
      const z = player.getZone('graveyard');
      if (Array.isArray(z)) return z;
    }
    if (player.zones && Array.isArray(player.zones.graveyard)) {
      return player.zones.graveyard;
    }
    // fallback: algumas implementações guardam em map { zoneName: [...] }
    if (player.zones && player.zones.graveyard && typeof player.zones.graveyard.toArray === 'function') {
      try { return player.zones.graveyard.toArray(); } catch {}
    }
    return [];
  }

  _clearGrid() {
    if (!this.$grid) return;
    this.$grid.innerHTML = '';
  }

  _renderCards() {
    if (!this.$grid) {
      this._cacheSelectors();
      if (!this.$grid) return;
    }
    this._clearGrid();

    const gy = this._readGraveyardFrom(this._playerRef);
    if (!Array.isArray(gy) || gy.length === 0) {
      this.$grid.innerHTML =
        '<div class="gy-empty">Nenhuma carta no cemitério.</div>';
      return;
    }

    const frag = document.createDocumentFragment();

    gy.forEach((raw) => {
      const c = CardRegistry.toEntity(raw);

      // item
      const item = document.createElement('div');
      // usa tua classe preferida; se quiser compat com as duas:
      item.className = 'gy-card'; // ou 'graveyard-card'
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', `Ampliar ${c.name}`);
      item.dataset.fullSrc = c.image || c.thumb;
      item.dataset.cardId = c.baseId || '';
      if (c.uniqueId) item.dataset.uniqueId = c.uniqueId;

      // thumb (usa <img> pra acessibilidade e melhor extração de src)
      const img = document.createElement('img');
      img.className = 'gy-thumb';
      img.alt = c.name;
      img.decoding = 'async';
      img.loading = 'lazy';
      img.src = c.thumb || c.image;

      // título opcional
      const title = document.createElement('div');
      title.className = 'gy-title';
      title.textContent = c.name;

      item.appendChild(img);
      item.appendChild(title);
      frag.appendChild(item);

      // Bind zoom (não deixa clique vazar pro backdrop)
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const url =
          item.dataset.fullSrc ||
          img.getAttribute('data-full-src') ||
          img.src;
        this.zoom.handleZoomClick(e, url);
      });

      // Enter também abre
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          const url =
            item.dataset.fullSrc ||
            img.getAttribute('data-full-src') ||
            img.src;
          this.zoom.handleZoomClick(e, url);
        }
      });
    });

    this.$grid.appendChild(frag);
  }
}
