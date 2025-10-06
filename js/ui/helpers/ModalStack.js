// js/ui/helpers/ModalStack.js
// Gerencia a pilha de modais/overlays (topo fecha com ESC ou backdrop).
// Uso básico:
//   ModalStack.push('#graveyard-overlay', { onClose: () => graveyard.close(), esc: true, backdrop: true, baseZ: 1200 });
//   ModalStack.remove('#graveyard-overlay');

class ModalStack {
  constructor() {
    /** @type {{el: HTMLElement, id: string, onClose: Function, esc: boolean, backdrop: boolean, origZ: string|null}[]} */
    this.stack = [];
    this._onKeyDownCapture = this._onKeyDownCapture.bind(this);
    this._ensureGlobalCapture();
  }

  _ensureGlobalCapture() {
    // Captura ESC antes de outros handlers e bloqueia propagação quando houver modal ativo.
    window.addEventListener('keydown', this._onKeyDownCapture, true);
  }

  _onKeyDownCapture(e) {
    if (e.key !== 'Escape') return;
    if (this.stack.length === 0) return;
    // Só o topo reage.
    e.preventDefault();
    e.stopImmediatePropagation();
    this.closeTop();
  }

  _isTop(el) {
    if (this.stack.length === 0) return false;
    return this.stack[this.stack.length - 1].el === el;
  }

  hasActive() {
    return this.stack.length > 0;
  }

  top() {
    return this.stack[this.stack.length - 1] || null;
  }

  /**
   * @param {string|HTMLElement|jQuery} elRef
   * @param {{onClose?: Function, esc?: boolean, backdrop?: boolean, baseZ?: number}} opts
   */
  push(elRef, opts = {}) {
    const el = elRef instanceof HTMLElement
      ? elRef
      : (window.jQuery && elRef instanceof window.jQuery)
        ? elRef[0]
        : document.querySelector(elRef);

    if (!el) {
      console.error('ModalStack.push: elemento não encontrado', elRef);
      return;
    }

    // >>> bloqueia duplicatas do mesmo elemento
    if (this.stack.some(entry => entry.el === el)) {
      // opcional: leve o item ao topo antes de sair
      // this.remove(el); // e depois cai no fluxo normal para repush
      return;
    }

    const entry = {
      el,
      id: el.id || '',
      onClose: typeof opts.onClose === 'function' ? opts.onClose : () => this._defaultClose(el),
      esc: opts.esc !== false,
      backdrop: opts.backdrop !== false,
      origZ: el.style.zIndex || null,
    };

    const base = Number.isFinite(opts.baseZ) ? opts.baseZ : 1200;
    el.style.zIndex = String(base + this.stack.length * 10);

    if (entry.backdrop) {
      el.__modalstack_click_handler__ = (ev) => {
        if (ev.target === el && this._isTop(el)) {
          this.closeTop();
        }
      };
      el.addEventListener('click', entry.__modalstack_click_handler__);
    }

    this.stack.push(entry);
  }

  closeTop() {
    if (this.stack.length === 0) return;
    const top = this.stack[this.stack.length - 1];
    try {
      top.onClose?.();
    } catch (err) {
      console.error('ModalStack.closeTop onClose erro:', err);
      this.remove(top.el);
    }
  }

  /**
   * Remove um modal específico da pilha (chame no final do close())
   * @param {string|HTMLElement|jQuery} elRef
   */
  remove(elRef) {
    const el = elRef instanceof HTMLElement
      ? elRef
      : (window.jQuery && elRef instanceof window.jQuery)
        ? elRef[0]
        : document.querySelector(elRef);

    if (!el) return;

    const idx = this.stack.findIndex(e => e.el === el);
    if (idx === -1) return;

    const entry = this.stack[idx];

    // Remove listener de backdrop
    if (entry.__modalstack_click_handler__) {
      el.removeEventListener('click', entry.__modalstack_click_handler__);
      delete entry.__modalstack_click_handler__;
    }

    // Restaura z-index original se havia
    if (entry.origZ !== null) el.style.zIndex = entry.origZ;

    this.stack.splice(idx, 1);
  }

  clearAll() {
  try {
    while (this.stack?.length) {
      const entry = this.stack.pop();
      const el = entry.el;
      // remove listener de backdrop, se houver
      if (entry.__modalstack_click_handler__) {
        el.removeEventListener('click', entry.__modalstack_click_handler__);
      }
      // restaura z-index original
      if (entry.origZ == null) el.style.removeProperty('z-index');
      else el.style.zIndex = entry.origZ;

      // fecha visualmente
      el.classList.remove('active');
      el.setAttribute('aria-hidden', 'true');
      el.style.display = 'none';
    }
  } catch (e) {
    console.warn('[ModalStack] clearAll error:', e);
  }
}

  // Fechamento padrão caso o chamador não passe onClose
  _defaultClose(el) {
    el.classList.remove('active');
    el.setAttribute('aria-hidden', 'true');
    // Se o elemento controla display:
    const cleanup = () => {
      if (!el.classList.contains('active')) el.style.display = 'none';
    };
    setTimeout(cleanup, 250);
    this.remove(el);
  }
}

const singleton = new ModalStack();
export default singleton;
