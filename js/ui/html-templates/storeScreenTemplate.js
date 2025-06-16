// js/ui/html-templates/storeScreenTemplate.js

export function generateStoreScreenHTML() {
  return `
    <div id="store-screen" class="screen store-layout">
      
      <div class="store-header">
        <h2>Loja</h2>

        <!-- Currencies (lado direito) -->
        <div class="currency-wrapper store-currency">
          <div class="gold-wrapper">
            <span id="store-gold-amount">0</span>
            <img class="icon-gold" src="assets/images/ui/coin.png" alt="Gold">
          </div>
          <div class="gems-wrapper">
            <span id="store-gems-amount">0</span>
            <img class="icon-gems" src="assets/images/ui/gem.png" alt="Gemas">
          </div>
        </div>
      </div>

      <div id="store-grid" class="store-grid scrollable-list">
        <p class="placeholder-message">Carregando itens...</p>
       
      </div>

      <!-- Overlay para Detalhes do Item -->
      <div id="store-detail-overlay" class="store-detail-overlay">
        <div class="detail-card">
          <img id="store-detail-image" src="" alt="Item Detail">
          <h3 id="store-detail-name" class="detail-name">Nome do Item</h3>
          <p id="store-detail-desc" class="detail-desc">Descrição completa do item...</p>
          <div class="detail-actions">
            <button id="btn-buy-gold" class="btn-price-gold" title="Comprar com Ouro">0 💰</button>
            <button id="btn-buy-gems" class="btn-price-gems" title="Comprar com Gemas">0 💎</button>
            
          </div>
        </div>
      </div>
    </div>`;
}