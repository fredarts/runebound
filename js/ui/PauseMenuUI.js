// js/ui/PauseMenuUI.js
import pauseMenuTemplate from './html-templates/pauseMenuTemplate.js';

export default class PauseMenuUI {
  /**
   * @param {{ audioManager?: any, isBattleActive?: () => boolean }} cfg
   */
  constructor(cfg = {}) {
    this.audioManager = cfg.audioManager || null;
    this.isBattleActive =
      cfg.isBattleActive ||
      (() => !!document.querySelector('.battle-screen.active, [data-screen="battle"].active, #battle-screen.active, #game-battle-screen.active'));

    this.id = '#pause-menu-overlay';
    this.itemsSelector = '.pause-item';
    this.activeClass = 'is-active';
    this.opened = false;
    this.index = 0;

    this.ensureInDOM();
    this.cache();
    this.bindGlobalShortcut();
    this.bindPointer();
  }

  ensureInDOM() {
    if (!document.querySelector(this.id)) {
      document.body.insertAdjacentHTML('beforeend', pauseMenuTemplate());
    }
  }

  cache() {
    this.$overlay = document.querySelector(this.id);
    this.$panel = this.$overlay?.querySelector('.pause-menu-panel');
    this.$items = Array.from(this.$overlay?.querySelectorAll(this.itemsSelector) || []);
  }

  sfx(name, fallback = 'buttonClick') {
    try {
      if (this.audioManager?.playSFX) this.audioManager.playSFX(name);
    } catch (e) {
      try { this.audioManager?.playSFX?.(fallback); } catch {}
    }
  }

  open() {
    if (this.opened) return;
    // só abre se estiver em batalha (ajuste predicate se precisar)
    if (!this.isBattleActive()) return;

    this.opened = true;
    this.index = Math.max(0, this.index) % this.$items.length;

    this.$overlay.style.display = 'flex';
    requestAnimationFrame(() => this.$overlay.classList.add('active'));
    this.$overlay.setAttribute('aria-hidden', 'false');

    this.highlight(this.index);
    this.trapKeys = (e) => this.onKeyDown(e);
    document.addEventListener('keydown', this.trapKeys, true);

    // sinaliza pra engine que pausou (quem ouvir, pausa timers/loops)
    document.dispatchEvent(new CustomEvent('pause:opened'));
    this.sfx('menuOpen', 'buttonClick');
  }

  close() {
    if (!this.opened) return;
    this.opened = false;

    this.$overlay.classList.remove('active');
    this.$overlay.setAttribute('aria-hidden', 'true');
    // atraso mínimo pra permitir transição, mantém simples
    setTimeout(() => { if (!this.opened) this.$overlay.style.display = 'none'; }, 120);

    document.removeEventListener('keydown', this.trapKeys, true);
    document.dispatchEvent(new CustomEvent('pause:resumed'));
    this.sfx('menuBack', 'buttonClick');
  }

  toggle() {
    this.opened ? this.close() : this.open();
  }

  highlight(i) {
    this.$items.forEach((el) => el.classList.remove(this.activeClass));
    const el = this.$items[i];
    if (el) {
      el.classList.add(this.activeClass);
      this.$overlay.querySelector('[role="menu"]').setAttribute('aria-activedescendant', el.id);
      // não usa focus() pra não "puxar" scroll em mobile; visual é suficiente
    }
  }

  activate(i) {
    const el = this.$items[i];
    if (!el) return;
    const action = el.dataset.action;
    this.sfx('menuSelect', 'buttonClick');

    switch (action) {
      case 'resume':
        this.close();
        break;

      case 'options':
        // Dispara evento que o teu OptionsUI já pode ouvir pra abrir sobreposto
        document.dispatchEvent(new CustomEvent('pause:options'));
        break;

      case 'exit':
        // Emite evento p/ sua engine encerrar e voltar pra tela de conexão
        // (fazemos close depois pra não ver "unpause" na transição)
        document.dispatchEvent(new CustomEvent('pause:exit'));
        this.$overlay.classList.remove('active');
        this.$overlay.setAttribute('aria-hidden', 'true');
        this.$overlay.style.display = 'none';
        this.opened = false;
        break;
    }
  }

  onKeyDown(e) {
    // Bloqueia propagação pra UI da batalha enquanto o menu está aberto
    if (!this.opened) return;

    const key = e.key;
    if (['ArrowUp', 'ArrowDown', 'Enter', ' ', 'Escape', 'Tab', 'Home', 'End'].includes(key)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (key === 'ArrowUp') {
      this.index = (this.index - 1 + this.$items.length) % this.$items.length;
      this.highlight(this.index);
      this.sfx('menuMove', 'buttonHover');
    } else if (key === 'ArrowDown' || key === 'Tab') {
      this.index = (this.index + 1) % this.$items.length;
      this.highlight(this.index);
      this.sfx('menuMove', 'buttonHover');
    } else if (key === 'Home') {
      this.index = 0;
      this.highlight(this.index);
      this.sfx('menuMove', 'buttonHover');
    } else if (key === 'End') {
      this.index = this.$items.length - 1;
      this.highlight(this.index);
      this.sfx('menuMove', 'buttonHover');
    } else if (key === 'Enter' || key === ' ') {
      this.activate(this.index);
    } else if (key === 'Escape') {
      this.close();
    }
  }

  bindPointer() {
    // Hover move seleção
    this.$overlay.addEventListener('mousemove', (ev) => {
      if (!this.opened) return;
      const btn = ev.target.closest(this.itemsSelector);
      if (!btn) return;
      const idx = this.$items.indexOf(btn);
      if (idx >= 0 && idx !== this.index) {
        this.index = idx;
        this.highlight(this.index);
      }
    });

    // Click ativa
    this.$overlay.addEventListener('click', (ev) => {
      if (!this.opened) return;
      const btn = ev.target.closest(this.itemsSelector);
      if (btn) {
        this.index = this.$items.indexOf(btn);
        this.activate(this.index);
      }
    });
  }

  bindGlobalShortcut() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Só reage ao ESC global quando estiver em batalha
        if (this.opened || this.isBattleActive()) this.toggle();
      }
    });
  }
}
