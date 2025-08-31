// js/ui/templates/pauseMenuTemplate.js
export default function pauseMenuTemplate() {
  return `
<div id="pause-menu-overlay"
     class="image-zoom-overlay deck-modal fiery-opt-in"
     data-screen="pause-menu"
     aria-hidden="true"
     style="display:none">
  <div class="pause-menu-panel" role="dialog" aria-modal="true" aria-labelledby="pause-menu-title">
    <header class="section-header">
      <h2 id="pause-menu-title" class="section-title">Jogo Pausado</h2>
      <p class="section-subtitle">Use ↑/↓ e Enter, ou clique com o mouse.</p>
    </header>

    <nav class="pause-menu" role="menu" aria-activedescendant="pause-item-continue">
      <button id="pause-item-continue"
              class="pause-item is-active"
              role="menuitem"
              data-action="resume"
              type="button"
              aria-label="Continuar partida">
        Continuar
      </button>

      <button id="pause-item-options"
              class="pause-item"
              role="menuitem"
              data-action="options"
              type="button"
              aria-label="Abrir opções">
        Opções
      </button>

      <button id="pause-item-exit"
              class="pause-item"
              role="menuitem"
              data-action="exit"
              type="button"
              aria-label="Sair da partida">
        Sair da partida
      </button>
    </nav>
  </div>

  <!-- backdrop fecha com ESC, mas clique fora não fecha pra evitar misclicks -->
</div>
  `;
}
