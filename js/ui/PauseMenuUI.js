// js/ui/PauseMenuUI.js
// Gerencia o menu de pausa usando uma pilha de modais (ModalStack).
// Requisitos de markup (exemplo):
// <div id="pause-menu-overlay" class="overlay" aria-hidden="true" style="display:none">
//   <div class="pause-menu">
//     <button class="pause-item" data-action="resume">Continuar</button>
//     <button class="pause-item" data-action="options">Opções</button>
//     <button class="pause-item" data-action="concede">Conceder Partida</button>
//     <button class="pause-item" data-action="exit">Sair para o Título</button>
//   </div>
// </div>

import ModalStack from './helpers/ModalStack.js';

export default class PauseMenuUI {
  /**
   * @param {Object} opts
   * @param {string} [opts.overlaySelector='#pause-menu-overlay']
   * @param {string} [opts.itemSelector='.pause-item']
   * @param {string} [opts.activeClass='active']
   * @param {(action:string)=>void} [opts.onAction]  // callback opcional para ações (resume/options/concede/exit)
   * @param {() => boolean} [opts.isBattleActive]    // função opcional para checar se a batalha está ativa
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

    // key handler durante o menu aberto (setado em open)
    this.trapKeys = null;

    // Função opcional para verificar se a batalha está ativa
    this._isBattleActiveExternal = typeof opts.isBattleActive === 'function' ? opts.isBattleActive : null;

    // Inicialização básica
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
    // Delegação de clique para itens do menu
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

  /**
   * Registra um atalho global para ESC:
   * - Se o menu estiver fechado E não houver nenhum modal na pilha -> abre o Pause.
   * - Se o menu estiver aberto -> deixa o ModalStack fechar (não fecha aqui para evitar duplicidade).
   */
  bindGlobalShortcut() {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;

      if (this.opened) {
        // Quem fecha é o ModalStack; aqui não fazemos nada para evitar concorrência.
        return;
      }

      // Só permite abrir o pause se não houver outros modais ativos
      if (!ModalStack.hasActive() && this.isBattleActive()) {
        this.open();
      }
    });
  }

  /**
   * Abre o menu de pausa e registra no ModalStack
   */
  open() {
    if (this.opened) return;
    if (!this.$overlay) return;
    if (!this.isBattleActive()) return;

    // Não abra o pause por cima de outros modais
    if (ModalStack.hasActive()) return;

    this._refreshItems();
    this.index = Math.min(this.index, Math.max(0, this.$items.length - 1));

    this.opened = true;

    // Exibe overlay
    this.$overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      this.$overlay.classList.add(this.activeClass);
      this.$overlay.setAttribute('aria-hidden', 'false');
    });

    // Empilha no ModalStack — ESC e clique no backdrop fecharão o topo
    ModalStack.push(this.$overlay, {
      onClose: () => this.close(),
      esc: true,
      backdrop: true,
      baseZ: 1200, // deixe como quiser; pode remover para usar apenas CSS
    });

    // Foco/seleção inicial
    this.highlight(this.index);
    this._focusSelected();

    // Trava setas/enter enquanto o menu está aberto
    this.trapKeys = (e) => this._onKeyDown(e);
    document.addEventListener('keydown', this.trapKeys, true);

    document.dispatchEvent(new CustomEvent('pause:opened'));
    this._sfx('menuOpen', 'buttonClick');
  }

  /**
   * Fecha o menu de pausa e remove do ModalStack
   */
  close() {
    if (!this.opened) return;
    if (!this.$overlay) return;

    this.opened = false;

    // Visual
    this.$overlay.classList.remove(this.activeClass);
    this.$overlay.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      if (!this.$overlay) return;
      if (!this.$overlay.classList.contains(this.activeClass)) {
        this.$overlay.style.display = 'none';
      }
    }, 200);

    // Remove listeners
    if (this.trapKeys) {
      try {
        document.removeEventListener('keydown', this.trapKeys, true);
      } catch {}
      this.trapKeys = null;
    }

    // Desempilha do ModalStack
    ModalStack.remove(this.$overlay);

    document.dispatchEvent(new CustomEvent('pause:closed'));
    this._sfx('menuBack', 'buttonClick');
  }

  /**
   * Handler de teclado enquanto o pause está aberto
   * - Seta para cima/baixo: navega
   * - Enter/Espaço: executa ação
   * - Tab/Shift+Tab: também navega (opcional)
   */
  _onKeyDown(e) {
    if (!this.opened) return;

    // Não tratamos ESC aqui; o ModalStack já cuida de fechar o topo da pilha.
    const key = e.key;

    // Captura e não deixa vazar para o jogo
    const handledKeys = ['ArrowUp', 'ArrowDown', 'Enter', ' ', 'Tab'];
    if (!handledKeys.includes(key)) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (key === 'ArrowUp') {
      this.index = (this.index - 1 + this.$items.length) % this.$items.length;
      this.highlight(this.index);
      this._focusSelected();
      this._sfx('menuNav');
      return;
    }

    if (key === 'ArrowDown' || key === 'Tab') {
      const delta = key === 'Tab' && e.shiftKey ? -1 : 1;
      this.index = (this.index + delta + this.$items.length) % this.$items.length;
      this.highlight(this.index);
      this._focusSelected();
      this._sfx('menuNav');
      return;
    }

    if (key === 'Enter' || key === ' ') {
      const el = this.$items[this.index];
      const action = el?.getAttribute('data-action') || '';
      this._execute(action);
      return;
    }
  }

  /**
   * Destaca visualmente o item selecionado
   * @param {number} idx
   */
  highlight(idx) {
    this.$items.forEach((btn, i) => {
      if (i === idx) {
        btn.classList.add('selected');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('selected');
        btn.removeAttribute('aria-selected');
      }
    });
  }

  _focusSelected() {
    const el = this.$items[this.index];
    if (el && typeof el.focus === 'function') {
      // Evita scroll indesejado
      el.focus({ preventScroll: true });
    }
  }

  /**
   * Executa a ação do item selecionado
   * @param {string} action
   */
  _execute(action) {
    if (!action) return;

    // Callback externo tem prioridade (se fornecido)
    if (this.onAction) {
      const maybeClose = this.onAction(action);
      // Se o callback não fechar, a gente decide fechar quando apropriado
      if (maybeClose === true) return;
    }

    switch (action) {
      case 'resume':
        this.close();
        break;

      case 'options':
        // Notifica para abrir opções (outro módulo pode ouvir)
        document.dispatchEvent(new CustomEvent('options:open', { detail: { source: 'pause' } }));
        // Mantemos o pause aberto — se quiser fechar, troque para this.close();
        break;

      case 'concede':
        // Pergunta externa pode abrir um modal de confirmação; aqui apenas disparamos o evento.
        document.dispatchEvent(new CustomEvent('battle:concede:request'));
        // Mantém o pause aberto até confirmação
        break;

      case 'exit':
        document.dispatchEvent(new CustomEvent('app:navigate:title', { detail: { from: 'pause' } }));
        // Fechar imediatamente
        this.close();
        break;

      default:
        console.warn('[PauseMenuUI] Ação desconhecida:', action);
        break;
    }

    this._sfx('buttonClick');
  }

  /**
   * Checa se a batalha está ativa para permitir abrir o Pause
   * Pode ser substituída via construtor (opts.isBattleActive)
   */
  isBattleActive() {
    if (this._isBattleActiveExternal) {
      try { return !!this._isBattleActiveExternal(); } catch { /* noop */ }
    }
    // Heurística padrão: existe uma tela de batalha visível?
    const battle = document.getElementById('battle-screen');
    if (!battle) return true; // fallback permissivo
    const style = window.getComputedStyle(battle);
    const visible = style.display !== 'none' && style.visibility !== 'hidden' && battle.offsetParent !== null;
    return visible;
  }

  /**
   * Dispara SFX de forma desacoplada
   * (adapte para seu AudioManager se quiser)
   */
  _sfx(...names) {
    try {
      names.forEach((name) => {
        document.dispatchEvent(new CustomEvent('sfx:play', { detail: { name } }));
      });
    } catch {
      /* noop */
    }
  }
}
