// js/ui/html-templates/boosterOpeningTemplate.js

export function generateBoosterOpeningTemplate() {
  return `
    <div id="booster-opening-screen" class="screen booster-opening-layout">
      <h2>Abrindo Booster</h2>
      <!-- Container for the Card Elements -->
      <div id="booster-card-container"> 
         
      </div>
      <div class="booster-instructions">
          <p>Clique na carta para revelar.</p>
          <p>Clique novamente para dispensar.</p>
      </div>
      <button id="btn-booster-skip" class="btn-skip">Pular Abertura</button>
    </div>
  `;
}