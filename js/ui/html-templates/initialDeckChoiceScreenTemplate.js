// js/ui/html-templates/initialDeckChoiceScreenTemplate.js
export function generateInitialDeckChoiceScreenHTML() {
    const ashkarDeckImg = 'assets/images/ui/Ashkar_deck.png';
    const galadrethDeckImg = 'assets/images/ui/Galadreth_deck.png';

    return `
<section id="initial-deck-choice-screen" class="screen" data-screen="initial-deck-choice-screen" aria-labelledby="initial-deck-choice-title" data-zoom-scope="initial-deck-choice-screen">
  <!-- Área de seleção (modal visual) -->
  <div class="deck-selection-area" role="dialog" aria-modal="true" aria-labelledby="initial-deck-choice-title">
    <header class="section-header">
      <h2 id="initial-deck-choice-title" class="section-title">Escolha seu Deck Inicial</h2>
      <p class="section-subtitle">Selecione um dos decks para visualizar as cartas e confirmar.</p>
    </header>

    <!-- Grid dos dois decks -->
    <div class="deck-choice-grid">
      <!-- ASHKAR -->
      <div class="deck-choice-option" data-deck-id="ashkar_starter" role="button" tabindex="0" aria-label="Escolher deck Ashkar">
        <!-- A imagem É o botão -->
        <img class="deck-choice-image" src="assets/images/store/Ashkar_deck.png" alt="Deck Ashkar — Círculo de Cinzas" loading="eager" />
        <!-- Etiqueta opcional que aparece no hover -->
        <div class="deck-choice-label">Ashkar — Círculo de Cinzas</div>
      </div>

      <!-- GALADRETH -->
      <div class="deck-choice-option" data-deck-id="galadreth_starter" role="button" tabindex="0" aria-label="Escolher deck Galadreth">
        <img class="deck-choice-image" src="assets/images/store/Galadreth_deck.png" alt="Deck Galadreth — Ordem do Verde" loading="eager" />
        <div class="deck-choice-label">Galadreth — Ordem do Verde</div>
      </div>
    </div>
  </div>

  <!-- Detalhes do deck escolhido -->
  <div class="deck-details-area" aria-live="polite" style="display:none">
    <h3 id="chosen-deck-name"></h3>
    <!-- Opcional: se quiser exibir descrição, popula #chosen-deck-description no JS -->
    <p class="deck-description" id="chosen-deck-description"></p>

    <div id="chosen-deck-card-list"></div>

    <div class="actions">
      <button id="btn-back-to-deck-selection" class="btn" type="button" aria-label="Voltar à seleção de decks">Voltar</button>
      <button id="btn-confirm-deck-choice" class="btn" type="button" aria-label="Confirmar escolha do deck">Confirmar</button>
    </div>
  </div>

  <!-- Overlay de ZOOM específico desta tela -->
  <div id="initial-deck-choice-zoom-overlay" class="zoom-overlay hidden" data-zoom-overlay style="display:none" aria-hidden="true">
    <div class="zoom-backdrop" data-zoom-close></div>
    <figure class="zoom-content" role="dialog" aria-modal="true" aria-label="Visualização ampliada da carta">
      <img id="initial-deck-choice-zoomed-image" data-zoom-img alt="Carta ampliada" />
      <button class="zoom-close" type="button" aria-label="Fechar visualização" data-zoom-close>&times;</button>
    </figure>
  </div>
</section>
  `;
}