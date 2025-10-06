// js/ui/PauseMenuUI.js
// Gerencia o menu de pausa usando uma pilha de modais (ModalStack).
// VERSÃO CORRIGIDA: A ação 'exit' chama diretamente a função global de limpeza da partida.

import ModalStack from './helpers/ModalStack.js';

export default class PauseMenuUI {
  /**
   * @param {Object} opts
   * @param {string} [opts.overlaySelector='#pause-menu-overlay']
   * @param {string} [opts.itemSelector='.pause-item']
   * @param {string} [opts.activeClass='active']
   * @param {(action:string)=>void} [opts.onAction]
   * @param {() => boolean} [opts.isBattleActive]
   */
  constructor(opts = {}) {
    this.overlaySelector = opts.overlaySelector || '#pause-menu-overlay';
    this.itemSelector = opts.itemSelector || '.pause-item';
    this.activeClass = opts.activeClass || 'active';
    this.onAction = typeof opts.onAction === 'function' ? opts.onAction : null;

    /** @type {HTMLElement|null} */
    this.$overlay = null;
    /** @type {HTMLElement[]} */
    this.$items = [];
    this.opened = false;
    this.index = 0;

    this.trapKeys = null;
    this._isBattleActiveExternal = typeof opts.isBattleActive === 'function' ? opts.isBattleActive : null;

    this._cacheSelectors();
    this._bindClickHandlers();
  }

  _cacheSelectors() {
    this.$overlay = /** @type {HTMLElement|null} */ (document.querySelector(this.overlaySelector));
    if (!this.$overlay) {
      console.warn(`[PauseMenuUI] Overlay não encontrado por seletor: ${this.overlaySelector}`);
      return;
    }
    this._refreshItems();
  }

  _refreshItems() {
    if (!this.$overlay) return;
    this.$items = Array.from(this.$overlay.querySelectorAll(this.itemSelector));
  }

  _bindClickHandlers() {
    if (!this.$overlay) return;
    this.$overlay.addEventListener('click', (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      if (!target) return;
      const item = target.closest(this.itemSelector);
      if (!item) return;
      e.stopPropagation();
      e.preventDefault();
      const action = item.getAttribute('data-action') || '';
      this._execute(action);
    });
  }

  bindOpenRequest() {
    document.addEventListener('pause:request', () => {
      if (this.opened) return;
      // Adicionado !ModalStack.hasActive() para segurança
      if (!ModalStack.hasActive() && this.isBattleActive()) {
        this.open();
      }
    });
  }

  bindGlobalShortcut() {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (this.opened) return;
      if (!ModalStack.hasActive() && this.isBattleActive()) {
        this.open();
      }
    });
  }

  open() {
    if (this.opened || !this.$overlay || !this.isBattleActive() || ModalStack.hasActive()) {
        return;
    }

    this._refreshItems();
    this.index = Math.min(this.index, Math.max(0, this.$items.length - 1));
    this.opened = true;

    this.$overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      this.$overlay.classList.add(this.activeClass);
      this.$overlay.setAttribute('aria-hidden', 'false');
    });

    ModalStack.push(this.$overlay, {
      onClose: () => this.close(),
      esc: true,
      backdrop: true,
      baseZ: 1200,
    });

    this.highlight(this.index);
    this._focusSelected();

    this.trapKeys = (e) => this._onKeyDown(e);
    document.addEventListener('keydown', this.trapKeys, true);

    document.dispatchEvent(new CustomEvent('pause:opened'));
    this._sfx('buttonClick'); // Som de abrir
  }

  close() {
    if (!this.opened || !this.$overlay) return;

    this.opened = false;
    this.$overlay.classList.remove(this.activeClass);
    this.$overlay.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      if (this.$overlay && !this.$overlay.classList.contains(this.activeClass)) {
        this.$overlay.style.display = 'none';
      }
    }, 200);

    if (this.trapKeys) {
      document.removeEventListener('keydown', this.trapKeys, true);
      this.trapKeys = null;
    }

    ModalStack.remove(this.$overlay);
    document.dispatchEvent(new CustomEvent('pause:closed'));
    // Som de fechar pode ser acionado aqui, mas a ação 'resume' já tem som
  }

  _onKeyDown(e) {
    if (!this.opened) return;
    const key = e.key;
    const handledKeys = ['ArrowUp', 'ArrowDown', 'Enter', ' ', 'Tab'];
    if (!handledKeys.includes(key)) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (key === 'ArrowUp' || (key === 'Tab' && e.shiftKey)) {
      this.index = (this.index - 1 + this.$items.length) % this.$items.length;
    } else if (key === 'ArrowDown' || key === 'Tab') {
      this.index = (this.index + 1) % this.$items.length;
    }

    if (key === 'Enter' || key === ' ') {
      const el = this.$items[this.index];
      const action = el?.getAttribute('data-action') || '';
      this._execute(action);
      return;
    }

    this.highlight(this.index);
    this._focusSelected();
    this._sfx('buttonHover'); // Som de navegação
  }

  highlight(idx) {
    this.$items.forEach((btn, i) => {
      btn.classList.toggle('is-active', i === idx); // Usando a classe do seu CSS
      btn.setAttribute('aria-selected', i === idx ? 'true' : 'false');
    });
  }

  _focusSelected() {
    const el = this.$items[this.index];
    if (el && typeof el.focus === 'function') {
      el.focus({ preventScroll: true });
    }
  }

  // --- [ MÉTODO CORRIGIDO ] ---
  /**
   * Executa a ação do item selecionado.
   * @param {string} action
   */
  _execute(action) {
    if (!action) return;
    this._sfx('buttonClick');

    // Callback externo tem prioridade se existir
    if (this.onAction) {
      this.onAction(action);
      return;
    }

    // Ações padrão
    switch (action) {
      case 'resume':
        this.close();
        break;

      case 'options':
        this.close(); // Fecha o pause ANTES de emitir o evento de navegação
        document.dispatchEvent(new CustomEvent('pause:options'));
        break;

      case 'concede':
        this.close();
        document.dispatchEvent(new CustomEvent('pause:concede'));
        break;
      
      case 'exit':
        this.close(); // Primeiro, fecha o modal visualmente

        if (typeof window.teardownMatch === 'function') {
            console.log("[PauseMenuUI] Ação 'exit': Chamando teardownMatch() globalmente para resetar o jogo.");
            // Navega para a tela de conexão como destino padrão ao sair da partida
            window.teardownMatch('connect-screen'); 
        } else {
            console.error("[PauseMenuUI] Ação 'exit': Função global teardownMatch() não foi encontrada! O estado do jogo pode persistir.");
            // Dispara o evento como um fallback, caso o main.js esteja ouvindo e possa agir
            document.dispatchEvent(new CustomEvent('pause:exit'));
        }
        break;

      default:
        console.warn('[PauseMenuUI] Ação desconhecida:', action);
        break;
    }
  }
  // --- [ FIM DO MÉTODO CORRIGIDO ] ---

  isBattleActive() {
    if (this._isBattleActiveExternal) {
      try { return !!this._isBattleActiveExternal(); } catch { return true; }
    }
    const battle = document.getElementById('battle-screen');
    return battle ? battle.classList.contains('active') : false;
  }

  _sfx(name) {
    try {
      // Usa o AudioManager global se disponível para mais controle
      if (window.audioManager && typeof window.audioManager.playSFX === 'function') {
        window.audioManager.playSFX(name);
      } else {
        // Fallback para evento genérico
        document.dispatchEvent(new CustomEvent('sfx:play', { detail: { name } }));
      }
    } catch {}
  }
}