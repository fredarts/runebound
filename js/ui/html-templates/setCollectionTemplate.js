export function generateSetCollectionHTML(){
    return `
    <div id="set-collection-screen" class="screen collection-layout">
  
      <div class="collection-topbar">
        <h2>Coleção – Eldraem</h2>
        <button id="btn-back-profile">← Voltar</button>
      </div>
  
      <!-- filtros -->
      <div class="filters">
        <select id="filter-cost"><option value="">Custo</option></select>
        <select id="filter-type"><option value="">Tipo</option></select>
        <select id="filter-tribe"><option value="">Tribo</option></select>
        <input  id="search-name" placeholder="Buscar por nome">
      </div>
  
<!-- grid de cartas -->
     <div id="collection-grid" class="card-grid"></div>
     <!-- overlay de zoom (fora do grid) -->
    <div id="set-collection-zoom-overlay" class="image-zoom-overlay">
        <img id="set-collection-zoomed-image" src="" alt="Zoom da Carta">
      </div>

   </div>`;  
  }
  