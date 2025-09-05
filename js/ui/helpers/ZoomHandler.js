// js/ui/helpers/ZoomHandler.js
// Zoom de cartas com integração à pilha de modais (ModalStack).
// Compatível com chamadas antigas: handleZoomClick(event, imageUrlOpcional)
// e novos helpers: openImage(url), openFromElement(el).

import ModalStack from './ModalStack.js';

export default class ZoomHandler {
  /**
   * @param {Object} opts
   * @param {string}  [opts.overlaySelector='#battle-image-zoom-overlay']  // prioriza o id usado na batalha
   * @param {number}  [opts.baseZ=1300]
   * @param {boolean} [opts.autoCreate=true]  // cria overlay se não existir
   */
  constructor(opts = {}) {
    this.overlaySelector = opts.overlaySelector || '#battle-image-zoom-overlay';
    this.baseZ = Number.isFinite(opts.baseZ) ? opts.baseZ : 1300;
    this.autoCreate = opts.autoCreate !== false;

    /** @type {HTMLElement|null} */
    this._overlayEl = null;
    /** @type {HTMLImageElement|null} */
    this._imgEl = null;

    this._isOpen = false;

    this._ensureOverlay();
  }

  /** Garante que existe um overlay válido e cacheia referências */
  _ensureOverlay() {
    let el = document.querySelector(this.overlaySelector);

    // Fallbacks comuns antes de criar
    if (!el) {
      const fallbacks = ['#battle-image-zoom-overlay', '#image-zoom-overlay'];
      for (const sel of fallbacks) {
        if (sel !== this.overlaySelector) {
          el = document.querySelector(sel);
          if (el) {
            this.overlaySelector = sel;
            break;
          }
        }
      }
    }

    if (!el && this.autoCreate) {
      el = document.createElement('div');
      const id = this.overlaySelector.startsWith('#')
        ? this.overlaySelector.slice(1)
        : 'image-zoom-overlay';
      el.id = id;
      el.className = 'image-zoom-overlay';
      el.setAttribute('aria-hidden', 'true');
      el.style.display = 'none';

      const img = document.createElement('img');
      if (!img.id) img.id = 'battle-zoomed-image';
        // opcionalmente uma classe comum para depurar/estilizar:
        img.classList.add('zoomed-image');
      img.alt = 'Zoomed Card';
      el.appendChild(img);

      document.body.appendChild(el);
    }

    this._overlayEl = el || null;
    this._imgEl = this._overlayEl ? this._overlayEl.querySelector('img') : null;

    if (!this._overlayEl || !this._imgEl) {
      console.warn('[ZoomHandler] Overlay não encontrado/criado. Seletor:', this.overlaySelector);
    }
  }

  /** Retorna true se o zoom está aberto */
  isZoomOpen() {
    return !!this._isOpen;
  }

  /**
   * Handler compatível com chamadas antigas.
   * Aceita: (event, urlOpcional) | (urlDireta) | ({src, alt})
   */
  handleZoomClick(arg1, arg2) {
    let event = null;
    let src = null;
    let alt = '';

    if (typeof arg1 === 'string') {
      // handleZoomClick(urlDireta)
      src = arg1;
    } else if (arg1 && typeof arg1 === 'object' && arg1.target) {
      // handleZoomClick(event, urlOpcional)
      event = arg1;
      if (typeof arg2 === 'string') src = arg2;
    } else if (arg1 && typeof arg1 === 'object' && ('src' in arg1)) {
      // handleZoomClick({src, alt})
      src = arg1.src;
      alt = arg1.alt || '';
    }

    if (event) {
      // Evita que cliques dentro de outros modais “vazem” e fechem camadas abaixo
      event.preventDefault?.();
      event.stopPropagation?.();
    }

    if (!src && event) {
      const t = /** @type {HTMLElement} */ (event.currentTarget || event.target);
      if (t) {
        src =
          // data-* primeiro
          t.getAttribute?.('data-full-src') ||
          t.getAttribute?.('data-src') ||
          // <img> direto
          (t.tagName === 'IMG' ? /** @type {HTMLImageElement} */ (t).src : null) ||
          // procura <img> descendente
          this._inferImageFromDescendants(t) ||
          // NOVO: tenta extrair de background-image inline/computed
          this._extractBgUrlFromElement(t);

        alt =
          t.getAttribute?.('data-alt') ||
          t.getAttribute?.('aria-label') ||
          t.getAttribute?.('title') ||
          alt;
      }
    }

    if (!src) {
      console.warn('[ZoomHandler] handleZoomClick: não foi possível determinar o src da imagem.');
      return;
    }

    this.openZoom({ src, alt });
  }

  /** Procura um <img> dentro do alvo e retorna seu .src */
  _inferImageFromDescendants(root) {
    try {
      const img = root.querySelector?.('img');
      return img?.src || null;
    } catch {
      return null;
    }
  }

  /** Extrai URL de um background-image (inline ou computed style) */
  _extractBgUrlFromElement(el) {
    try {
      // inline primeiro
      let bg = el.style?.backgroundImage;
      if (!bg || bg === 'none') {
        // computed depois
        const cs = window.getComputedStyle?.(el);
        bg = cs?.backgroundImage;
      }
      if (!bg || bg === 'none') return null;

      // pega a primeira url("...") encontrada
      const m = bg.match(/url\((['"]?)(.*?)\1\)/i);
      if (m && m[2]) return m[2];
      return null;
    } catch {
      return null;
    }
  }

  /** Abre zoom a partir de um elemento (tenta data-attrs, <img> ou background) */
  openFromElement(el) {
    if (!el) return;
    const src =
      el.getAttribute?.('data-full-src') ||
      el.getAttribute?.('data-src') ||
      (el.tagName === 'IMG' ? el.src : null) ||
      this._inferImageFromDescendants(el) ||
      this._extractBgUrlFromElement(el);
    const alt =
      el.getAttribute?.('data-alt') ||
      el.getAttribute?.('aria-label') ||
      el.getAttribute?.('title') ||
      '';
    if (src) this.openZoom({ src, alt });
  }

  /** Abre zoom diretamente com uma URL */
  openImage(src, alt = '') {
    if (src) this.openZoom({ src, alt });
  }

  /**
   * Abre o zoom programaticamente.
   * @param {{src:string, alt?:string}} payload
   */
  openZoom({ src, alt = '' }) {
    if (!this._overlayEl || !this._imgEl) {
      this._ensureOverlay();
      if (!this._overlayEl || !this._imgEl) return;
    }

    this._imgEl.src = src;
    if (alt) this._imgEl.alt = alt;

    // Exibe overlay
    this._overlayEl.style.display = 'flex';
    requestAnimationFrame(() => {
      this._overlayEl.classList.add('active');
      this._overlayEl.setAttribute('aria-hidden', 'false');

      // Empilha no ModalStack — ESC/Backdrop fecham apenas o topo
      ModalStack.push(this._overlayEl, {
        onClose: () => this.closeZoom(),
        esc: true,
        backdrop: true,
        baseZ: this.baseZ,
      });

      this._isOpen = true;
    });
  }

  /** Fecha o zoom programaticamente */
  closeZoom() {
    if (!this._overlayEl) return;

    // Remove do stack primeiro para evitar duplo onClose
    ModalStack.remove(this._overlayEl);

    this._overlayEl.classList.remove('active');
    this._overlayEl.setAttribute('aria-hidden', 'true');

    // Esconde após a transição
    window.setTimeout(() => {
      if (!this._overlayEl?.classList.contains('active')) {
        this._overlayEl.style.display = 'none';
        if (this._imgEl) this._imgEl.src = '';
      }
    }, 200);

    this._isOpen = false;
  }
}
