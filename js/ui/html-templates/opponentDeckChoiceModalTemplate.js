// js/ui/templates/opponentDeckChoiceModalTemplate.js
export default function opponentDeckChoiceModalTemplate() {
  return `
<div id="ai-deck-choice-overlay" class="image-zoom-overlay deck-modal fiery-opt-in" data-screen="opponent-deck-choice" data-zoom-scope="opponent-deck-choice">
  <div class="deck-selection-area" role="dialog" aria-modal="true" aria-labelledby="opponent-deck-choice-title">
    <header class="section-header">
      <h2 id="opponent-deck-choice-title" class="section-title">ESCOLHA O DECK DO OPONENTE</h2>
      <p class="section-subtitle">Clique numa arte para selecionar.</p>
    </header>

    <div class="deck-choice-grid">
      <button class="deck-choice-option" type="button" data-deck-id="ashkar_starter" aria-label="Selecionar Fúria de Ashkar">
        <img class="deck-choice-image" src="assets/images/store/Ashkar_deck.png" alt="Fúria de Ashkar" loading="eager"/>
        <div class="deck-choice-label">Fúria de Ashkar</div>
      </button>

      <button class="deck-choice-option" type="button" data-deck-id="galadreth_starter" aria-label="Selecionar Defesa de Galadreth">
        <img class="deck-choice-image" src="assets/images/store/Galadreth_deck.png" alt="Defesa de Galadreth" loading="eager"/>
        <div class="deck-choice-label">Defesa de Galadreth</div>
      </button>
    </div>

    <div class="actions">
      <button class="btn btn-cancel" type="button" data-action="cancelar">Cancelar</button>
    </div>
  </div>

  <!-- Overlay de zoom para este modal -->
  <div id="opponent-deck-choice-zoom-overlay" class="zoom-overlay hidden" data-zoom-overlay style="display:none" aria-hidden="true">
    <div class="zoom-backdrop" data-zoom-close></div>
    <figure class="zoom-content" role="dialog" aria-modal="true" aria-label="Carta ampliada">
      <img id="opponent-deck-choice-zoomed-image" data-zoom-img alt="Carta ampliada" />
      <button class="zoom-close" type="button" aria-label="Fechar" data-zoom-close>&times;</button>
    </figure>
  </div>
</div>
  `;
}
