/*  js/ui/screens/SetCollectionScreenUI.js
    Tela “Coleção – Eldraem” completa, já com cálculo dinâmico
    de cartas possuídas / faltantes e filtros básicos          */

    import CardRenderer from '../helpers/CardRenderer.js';

    export default class SetCollectionScreenUI {
    
      #screenManager; #accountManager; #cardDB;
      #renderer; #el; #zoomHandler;
    
      constructor(screenManager, accountManager, cardDatabase, zoomHandler){
        this.#screenManager  = screenManager;
        this.#accountManager = accountManager;
        this.#cardDB         = cardDatabase;
        this.#zoomHandler    = zoomHandler;
        this.#renderer       = new CardRenderer();
        this.#el = $('#set-collection-screen');
    
        this._bind();
      }
    
      /* ────────────────────────────── PUBLIC ────────────────────────────── */
      render(){
        const user = this.#accountManager.getCurrentUser();
        if (!user) return;                     // sem jogador → nada a fazer
    
        /* -------- calcula dinamicamente owned / missing -------- */
        const ownedSet  = new Set(user.collection);           // coleção real
        const allCards  = Object.values(this.#cardDB)
                           .filter(c => c.set === 'ELDRAEM');  // só o set alvo
        const ownedArr   = [];
        const missingArr = [];
    
        allCards.forEach(c => (ownedSet.has(c.id) ? ownedArr : missingArr).push(c.id));
    
        // guarda p/ o perfil exibir depois
        user.setsOwned ??= {};
        user.setsOwned.ELDRAEM = { owned: ownedArr, missing: missingArr };
    
        /* -------- popula filtros (apenas 1ª vez) -------- */
        this.#populateFiltersOnce(allCards);
    
        /* -------- aplica filtros atuais -------- */
        const filteredCards = this.#applyFilters(allCards);
    
        /* -------- renderiza grade -------- */
        const $grid = $('#collection-grid').empty();
    
        filteredCards.forEach(card => {
          const $mini = $(this.#renderer.renderMiniCard(card));
          if (!ownedSet.has(card.id)){
            $mini.addClass('locked').css('filter','grayscale(1) opacity(.35)')
                 .append('<span class="locked-label">?</span>');
          }
          $grid.append($mini);
        });
      }
    
      /* ────────────────────────────── PRIVATE ───────────────────────────── */
      _bind(){
    
        /* botão voltar */
        this.#el.on('click','#btn-back-profile', ()=>{
          this.#screenManager.showScreen('profile-screen');
        });
    
        /* change nos selects ou pesquisa → re‑render */
        this.#el.on('change','#filter-cost,#filter-type,#filter-tribe',
          ()=> this.render());
        this.#el.on('input','#search-name',
          ()=> this.render());

          this.#el.on('contextmenu', '.mini-card', ev => {
            ev.preventDefault();
            this.#zoomHandler.handleZoomClick(ev);
        });
        
        $('#set-collection-zoom-overlay').on('click', ev => {
            if (ev.target === ev.currentTarget) this.#zoomHandler.closeZoom();
        });
      
      
      }
    
      #populateFiltersOnce(allCards){
        if (this._filtersReady) return;      // só uma vez
        this._filtersReady = true;
    
        /* custo */
        const costs = [...new Set(allCards.map(c=>c.cost))].sort((a,b)=>a-b);
        costs.forEach(c=>{
          $('#filter-cost').append(`<option value="${c}">${c}</option>`);
        });
    
        /* tipo */
        const types = [...new Set(allCards.map(c=>c.type))].sort();
        types.forEach(t=>{
          $('#filter-type').append(`<option value="${t}">${t}</option>`);
        });
    
        /* tribo (assumindo campo tribe opcional) */
        const tribes = [...new Set(allCards.map(c=>c.tribe).filter(Boolean))].sort();
        tribes.forEach(t=>{
          $('#filter-tribe').append(`<option value="${t}">${t}</option>`);
        });
      }
    
      #applyFilters(cards){
        const costVal   = $('#filter-cost').val();
        const typeVal   = $('#filter-type').val();
        const tribeVal  = $('#filter-tribe').val();
        const searchTxt = $('#search-name').val()?.toLowerCase() ?? '';
    
        return cards.filter(c=>{
          if (costVal && String(c.cost) !== costVal) return false;
          if (typeVal && c.type !== typeVal)         return false;
          if (tribeVal && c.tribe !== tribeVal)      return false;
          if (searchTxt && !c.name.toLowerCase().includes(searchTxt)) return false;
          return true;
        });
      }
    }
    