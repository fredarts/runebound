// js/ui/html-templates/graveyardModalTemplate.js
// -----------------------------------------------------------------------------
// VERSÃO FINAL COMPLETA E CORRIGIDA
// - Renderiza o HTML das cartas com as classes CSS corretas (.gy-card, .gy-thumb).
// - Utiliza o CardRegistry para normalizar os dados da carta e encontrar a URL da imagem.
// - Integra-se com o ZoomHandler global da UI da batalha para ampliar as cartas.
// - Mantém a estrutura modular com uma façade singleton para fácil uso.
// -----------------------------------------------------------------------------

// Adicionado import para o CardRegistry, que é essencial.
import CardRegistry from '../../data/CardRegistry.js';

"use strict";

const GY_OVERLAY_ID = "graveyard-overlay";
const GY_GRID_SELECTOR = "#graveyard-card-list, .graveyard-grid";
const GY_OVERLAY_CLASS = "graveyard-overlay";

/**
 * Gera o HTML do overlay do Cemitério.
 */
export function generateGraveyardModalHTML() {
  return `
<div id="${GY_OVERLAY_ID}" class="${GY_OVERLAY_CLASS} fiery-opt-in" aria-hidden="true" style="display:none; z-index:1200;">
  <div class="graveyard-panel" role="dialog" aria-modal="true" aria-labelledby="graveyard-title">
    <header class="section-header">
      <h2 id="graveyard-title" class="section-title">
        Cemitério — <span class="gy-owner"></span> (<span class="gy-count"></span>)
      </h2>
      <p class="section-subtitle">Clique com o botão direito para ampliar. Clique fora para fechar.</p>
    </header>
    <div id="graveyard-card-list" class="graveyard-grid" role="list">
      <!-- As cartas serão renderizadas aqui pelo JavaScript -->
    </div>
    <div class="graveyard-empty" style="display: none;">
      <p>O cemitério está vazio.</p>
    </div>
  </div>
</div>
`.trim();
}

/**
 * Controller principal do Cemitério.
 */
export class GraveyardController {
  constructor() {
    this.$overlay = null;
    this.$grid = null;
    this.$empty = null;
    this.$owner = null;
    this.$count = null;

    this._isOpen = false;
    this._game = null;
    this._playerRef = null;

    this.DEBUG = false;
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onOutsideClick = this._onOutsideClick.bind(this);

    this._ensureOverlay();
    this._cacheSelectors();
    this._bindEventsSafe();
  }

  _ensureOverlay() {
    let ov = document.getElementById(GY_OVERLAY_ID);
    if (!ov) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = generateGraveyardModalHTML();
      ov = wrapper.firstElementChild;
      document.body.appendChild(ov);
    }
    this.$overlay = ov;
  }

  _cacheSelectors(force = false) {
    if (!this.$overlay) this._ensureOverlay();
    if (force || !this.$grid) this.$grid = this.$overlay.querySelector(GY_GRID_SELECTOR);
    if (force || !this.$empty) this.$empty = this.$overlay.querySelector(".graveyard-empty");
    if (force || !this.$owner) this.$owner = this.$overlay.querySelector(".gy-owner");
    if (force || !this.$count) this.$count = this.$overlay.querySelector(".gy-count");
  }

  _bindEventsSafe() {
    if (!this.$overlay) return;
    this.$overlay.addEventListener("mousedown", this._onOutsideClick, { passive: true });
    this.$overlay.addEventListener("touchstart", this._onOutsideClick, { passive: true });
    const panel = this.$overlay.querySelector(".graveyard-panel");
    if (panel) {
      panel.addEventListener("mousedown", (e) => e.stopPropagation(), { passive: true });
      panel.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true });
    }
  }

  _bindEsc() {
    document.addEventListener("keydown", this._onKeyDown);
  }

  _unbindEsc() {
    document.removeEventListener("keydown", this._onKeyDown);
  }

  _onKeyDown(ev) {
    if (ev.key === "Escape" && this._isOpen) {
      this.close();
    }
  }

  _onOutsideClick(e) {
    if (e.target === this.$overlay && this._isOpen) {
      this.close();
    }
  }

  registerGame(game) {
    this._game = game || null;
    this._playerRef = null;
    this._cacheSelectors(true);
  }

  registerPlayerResolver(fn) {
    this._playerResolver = typeof fn === "function" ? fn : null;
  }

  open(playerObject) {
    if (this._isOpen) return;
    this._ensureOverlay();
    this._cacheSelectors();
    this._playerRef = playerObject;

    this.refresh();

    this.$overlay.style.display = "flex";
    this.$overlay.classList.add("active");
    this.$overlay.setAttribute("aria-hidden", "false");
    this._isOpen = true;
    this._bindEsc();

    if (this.DEBUG) console.info("[Graveyard] Aberto para:", this._playerRef?.name);
  }

  close() {
    if (!this.$overlay || !this._isOpen) return;
    this.$overlay.classList.remove("active");
    this.$overlay.setAttribute("aria-hidden", "true");
    setTimeout(() => {
      if (!this.$overlay?.classList.contains('active')) {
        this.$overlay.style.display = 'none';
      }
    }, 200);
    this._isOpen = false;
    this._unbindEsc();
    if (this.DEBUG) console.info("[Graveyard] Fechado.");
  }

  reset() {
    this.close();
    this._ensureOverlay();
    this._cacheSelectors(true);
    if (this.$grid) this.$grid.replaceChildren();
    if (this.$empty) this.$empty.style.display = 'block';
    if (this.$owner) this.$owner.textContent = "";
    if (this.$count) this.$count.textContent = "0";
    this._isOpen = false;
    this._playerRef = null;
    if (this.DEBUG) console.info("[Graveyard] Reset concluído.");
  }

  refresh() {
    if (!this._isOpen) return;
    this._cacheSelectors();
    this._renderCards();
  }

  _getLiveCards() {
    const p = this._playerRef;
    if (!p) return [];
    if (p.graveyard && typeof p.graveyard.getCards === 'function') {
      return p.graveyard.getCards();
    }
    return [];
  }

  /**
   * [CORRIGIDO] Renderiza as cartas usando a estrutura HTML esperada pelo CSS
   * e integra com o ZoomHandler global.
   */
  _renderCards() {
    if (!this.$grid) {
      this._cacheSelectors();
      if (!this.$grid) return;
    }
    this.$grid.replaceChildren();

    const graveyardCards = this._getLiveCards();
    const hasCards = graveyardCards.length > 0;

    this.$empty.style.display = hasCards ? 'none' : 'block';
    if (this.$owner) this.$owner.textContent = this._playerRef?.name || "";
    if (this.$count) this.$count.textContent = String(graveyardCards.length);

    if (!hasCards) return;

    const frag = document.createDocumentFragment();

    graveyardCards.forEach((cardInstance) => {
      const cardEntity = CardRegistry.toEntity(cardInstance.getRenderData());

      const cardElement = document.createElement('div');
      cardElement.className = 'gy-card';
      cardElement.setAttribute('role', 'button');
      cardElement.setAttribute('tabindex', '0');
      cardElement.setAttribute('aria-label', `Ampliar ${cardEntity.name}`);
      cardElement.dataset.fullSrc = cardEntity.image;
      cardElement.dataset.cardId = cardEntity.baseId;

      const thumbElement = document.createElement('img');
      thumbElement.className = 'gy-thumb';
      thumbElement.src = cardEntity.image;
      thumbElement.alt = cardEntity.name;
      thumbElement.loading = 'lazy';

      const titleElement = document.createElement('div');
      titleElement.className = 'gy-title';
      titleElement.textContent = cardEntity.name;

      cardElement.appendChild(thumbElement);
      cardElement.appendChild(titleElement);
      
      cardElement.addEventListener('click', this._handleZoomClick);
      cardElement.addEventListener('contextmenu', this._handleZoomClick);

      frag.appendChild(cardElement);
    });

    this.$grid.appendChild(frag);
  }

  _handleZoomClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const zoomHandler = window.uiManager?._battleUI?._zoomHandler;
    if (zoomHandler && typeof zoomHandler.handleZoomClick === 'function') {
      zoomHandler.handleZoomClick(e);
    } else {
      console.warn("ZoomHandler global não encontrado. Zoom não funcionará.");
    }
  }
}

// -----------------------------------------------------------------------------
// Façade Singleton (sem alterações)
// -----------------------------------------------------------------------------
let _controllerSingleton = null;

function getController() {
  if (!_controllerSingleton) {
    _controllerSingleton = new GraveyardController();
  }
  return _controllerSingleton;
}

const GraveyardModal = {
  open: (...a) => getController().open(...a),
  close: () => getController().close(),
  refresh: () => getController().refresh(),
  reset: () => getController().reset(),
  registerGame: (g) => getController().registerGame(g),
  registerPlayerResolver: (fn) => getController().registerPlayerResolver(fn),
};

try {
  if (typeof window !== "undefined") {
    if (!window.GraveyardModal) window.GraveyardModal = GraveyardModal;
    if (!window.GraveyardController) window.GraveyardController = GraveyardController;
  }
} catch {}

export default GraveyardModal;