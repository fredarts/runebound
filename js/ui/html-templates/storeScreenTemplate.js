// js/ui/html-templates/StoreScreenTemplate.js

/**
 * Gera a string HTML para a Tela da Loja.
 * @returns {string} HTML da tela da loja.
 */
export function generateStoreScreenHTML() {
    // Note: The back button (#btn-store-back-profile) is included here,
    // but its event listener should ideally be handled by the UIManager
    // or a global navigation system if it always goes back to the profile.
    // If its behavior is specific to the store context, keep the listener in StoreScreenUI.
    return `
      <div id="store-screen" class="screen store-layout">
        
        <div class="store-header">
          <h2>Loja</h2>
          <button id="btn-store-back-profile" class="button-back" title="Voltar ao Perfil">← Voltar</button>
        </div>

       
        <div id="store-grid" class="store-grid scrollable-list">
          
          <p class="placeholder-message">Carregando itens...</p>
        </div>

        
        <div id="store-detail-overlay" class="store-detail-overlay">
          <div class="detail-card">
            <img id="store-detail-image" src="" alt="Item Detail">
            <h3 id="store-detail-name" class="detail-name">Nome do Item</h3>
            <p id="store-detail-desc" class="detail-desc">Descrição completa do item...</p>
            <div class="detail-actions">
              <button id="btn-buy-gold" class="btn-price-gold" title="Comprar com Ouro">0 💰</button>
              <button id="btn-buy-gems" class="btn-price-gems" title="Comprar com Gemas">0 💎</button>
              
              <button id="btn-close-detail" class="button-back" title="Fechar Detalhes">Fechar</button>
            </div>
          </div>
        </div>
      </div>`;
}