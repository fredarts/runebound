// js/ui/html-templates/graveyardModalTemplate.js
// VERSÃO SIMPLIFICADA: Remove a barra de ferramentas de ordenação e o subtítulo.

export default function graveyardModalTemplate() {
  return `
<div id="graveyard-overlay"
     class="image-zoom-overlay fiery-opt-in"
     aria-hidden="true"
     style="display:none">
  <div class="graveyard-panel" role="dialog" aria-modal="true" aria-labelledby="graveyard-title">
    <header class="section-header">
      <h2 id="graveyard-title" class="section-title">
        Cemitério — <span class="gy-owner">Você</span>
      </h2>
      <p class="section-subtitle">
        Clique fora para fechar.
      </p>
    </header>

    <div id="graveyard-card-list" class="graveyard-grid" role="list">
        <!-- As imagens das cartas aparecerão aqui -->
    </div>

    <div class="graveyard-empty" hidden>
      <p>O cemitério está vazio.</p>
    </div>
  </div>
</div>
  `;
}