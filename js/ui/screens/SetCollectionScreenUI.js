/*  js/ui/screens/SetCollectionScreenUI.js
    Tela “Coleção – Eldraem” completa, já com cálculo dinâmico
    de cartas possuídas / faltantes e filtros básicos, e contador de quantidade */

    import CardRenderer from '../helpers/CardRenderer.js';

    export default class SetCollectionScreenUI {
    
        #screenManager;
        #accountManager;
        #cardDB;
        #renderer;
        #el;
        #zoomHandler;
        #uiManager;
        #audioManager;
    
        _filtersPopulated = false; // Flag para popular filtros apenas uma vez
    
        constructor(screenManager, accountManager, cardDatabase, zoomHandler, uiManager, audioManager) {
            this.#screenManager  = screenManager;
            this.#accountManager = accountManager;
            this.#cardDB         = cardDatabase;
            this.#zoomHandler    = zoomHandler;
            this.#uiManager      = uiManager;
            this.#audioManager   = audioManager;
            this.#renderer       = new CardRenderer();
            this.#el = $('#set-collection-screen');
    
            // REMOVED _bindEvents() from constructor
            console.log("SetCollectionScreenUI initialized.");
        }
    
        render(setCode = 'ELDRAEM'){
            // Ensure element is cached
            if (!this.#el?.length) this.#el = $('#set-collection-screen');
            if (!this.#el?.length) {
                 console.error("SetCollectionScreenUI Render Error: Root element not found.");
                 return;
            }
    
            const user = this.#accountManager.getCurrentUser();
            const $grid = this.#el.find('#collection-grid'); // Find grid within the cached root
            $grid.empty();
    
            if (!user) {
                console.warn("SetCollectionScreenUI: No user logged in.");
                $grid.append('<p class="placeholder-message">Faça login para ver a coleção.</p>');
                return;
            }
    
            const cardQuantities = {};
            const userActualCollection = user.collection || [];
            userActualCollection.forEach(id => {
                cardQuantities[id] = (cardQuantities[id] || 0) + 1;
            });
    
            const allCardsInSet = Object.values(this.#cardDB)
                               .filter(c => c.set === setCode);
    
            this._populateFiltersOnce(allCardsInSet); // Still populate only once
    
            const filteredCards = this._applyFilters(allCardsInSet);
    
            if (filteredCards.length === 0) {
                 $grid.append('<p class="placeholder-message">(Nenhuma carta encontrada ou corresponde aos filtros)</p>');
            } else {
                filteredCards.forEach(cardDef => {
                    const quantity = cardQuantities[cardDef.id] || 0;
                    const $mini = this.#renderer.renderMiniCard(cardDef, 'collection', quantity);
    
                    if (!$mini) {
                        console.warn(`SetCollectionScreenUI: Failed to render card ${cardDef.id}`);
                        return;
                    }
    
                    if (!quantity || quantity === 0){
                      $mini.addClass('locked').css('filter','grayscale(1) opacity(.35)')
                           .append('<span class="locked-label">?</span>');
                    }
                    $grid.append($mini);
                });
            }
            console.log(`SetCollectionScreenUI: Rendered ${filteredCards.length} cards for set ${setCode} with quantities.`);
    
            // --- MOVED BINDING HERE ---
            this._bindEvents();
            // --------------------------
        }
    
        _bindEvents(){
            if (!this.#el || !this.#el.length) {
                console.warn("SetCollectionScreenUI: Cannot bind events, root element missing.");
                return;
            }
            console.log("SetCollectionScreenUI: Binding events...");
            const self = this;
            const namespace = '.setcollection';
    
            // --- Clear old listeners ---
            this.#el.off(namespace);
            $('#set-collection-zoom-overlay')?.off(namespace); // Use optional chaining
    
            /* Back button */
            this.#el.on(`click${namespace}`, '#btn-back-profile', () => {
                self.#audioManager?.playSFX('buttonClick');
                self.#uiManager?.navigateTo('profile-screen');
            });
             this.#el.on(`mouseenter${namespace}`, '#btn-back-profile', () => {
                 self.#audioManager?.playSFX('buttonHover');
             });
    
            /* Filters */
            this.#el.on(`change${namespace}`, '#filter-cost, #filter-type, #filter-tribe', () => {
                 self.#audioManager?.playSFX('buttonClick');
                 self.render(); // Re-render on filter change
            });
            this.#el.on(`input${namespace}`, '#search-name', () => {
                self.render(); // Re-render on search input
            });
    
            /* Card Zoom (Delegated) */
            this.#el.on(`contextmenu${namespace}`, '.mini-card', ev => {
                ev.preventDefault();
                self.#zoomHandler.handleZoomClick(ev);
            });
    
            /* Close Zoom Overlay */
            $('#set-collection-zoom-overlay').on(`click${namespace}`, ev => {
                if (ev.target === ev.currentTarget) {
                    self.#zoomHandler.closeZoom();
                }
            });
            console.log("SetCollectionScreenUI: Events rebound.");
        }
    
        _populateFiltersOnce(allCardsInSet){
            if (this._filtersPopulated || !this.#el?.length) return;
            const $costFilter = this.#el.find('#filter-cost');
            const $typeFilter = this.#el.find('#filter-type');
            const $tribeFilter = this.#el.find('#filter-tribe');
    
            if (!$costFilter.length || !$typeFilter.length || !$tribeFilter.length) {
                console.error("SetCollectionScreenUI: Filter select elements not found during population.");
                return;
            }
    
            $costFilter.children('option:not(:first-child)').remove();
            $typeFilter.children('option:not(:first-child)').remove();
            $tribeFilter.children('option:not(:first-child)').remove();
    
            const costs = [...new Set(allCardsInSet.map(c => c.cost))].sort((a,b) => a - b);
            costs.forEach(c => $costFilter.append(`<option value="${c}">${c}</option>`));
    
            const types = [...new Set(allCardsInSet.map(c => c.type))].sort();
            types.forEach(t => $typeFilter.append(`<option value="${t}">${t}</option>`));
    
            const tribes = [...new Set(allCardsInSet.map(c => c.tribe).filter(Boolean))].sort();
            tribes.forEach(t => $tribeFilter.append(`<option value="${t}">${t}</option>`));
    
            this._filtersPopulated = true; // Mark as populated
            console.log("SetCollectionScreenUI: Filters populated.");
        }
    
        _applyFilters(cards){
            if (!this.#el?.length) return cards;
    
            const costVal   = this.#el.find('#filter-cost').val();
            const typeVal   = this.#el.find('#filter-type').val();
            const tribeVal  = this.#el.find('#filter-tribe').val();
            const searchTxt = this.#el.find('#search-name').val()?.toLowerCase() ?? '';
    
            return cards.filter(c => {
                if (!c) return false;
                if (costVal && String(c.cost ?? '') !== costVal) return false;
                if (typeVal && c.type !== typeVal) return false;
                if (tribeVal && (c.tribe || '') !== tribeVal) return false;
                if (searchTxt && !(c.name || '').toLowerCase().includes(searchTxt)) return false;
                return true;
            });
        }
    
        destroy() {
            console.log("SetCollectionScreenUI: Destroying...");
            const namespace = '.setcollection';
            this.#el?.off(namespace); // Use optional chaining
            $('#set-collection-zoom-overlay')?.off(namespace);
            // Reset flags if necessary, e.g., if filters should be repopulated on next view
            // this._filtersPopulated = false;
            this.#el = null;
            console.log("SetCollectionScreenUI: Destroy complete.");
        }
    }