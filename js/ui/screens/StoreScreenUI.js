// js/ui/screens/StoreScreenUI.js - CORRIGIDO SEM BOTÃO FECHAR NO DETALHE

export default class StoreScreenUI {
    #screenManager;
    #accountManager;
    #audioManager;
    #uiManager;

    // UI Element Cache
    #el;
    #gridEl;
    #detailOverlayEl;
    #detailImg;
    #detailName;
    #detailDesc;
    #btnConfirmGold;
    #btnConfirmGems;
    // #btnCloseDetail; // REMOVIDO
    #goldAmountEl;
    #gemsAmountEl;

    #initialized = false;
    items = [];

    constructor(screenManager, accountManager, audioManager, uiManager) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#audioManager = audioManager;
        this.#uiManager = uiManager;
        console.log("StoreScreenUI instance created (v-fix no back button, no close detail button).");
    }

    async init() {
        if (this.#initialized) return true;

        try {
            const response = await fetch('js/data/store-items.json');
            if (!response.ok) {
                 throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.items = await response.json();
            console.log('StoreScreenUI: Items loaded from JSON');
        } catch (err) {
            console.error('StoreScreenUI: Falha ao carregar store-items.json', err);
            this.items = [];
            this.#initialized = false;
            return false;
        }

        if (!this._cacheSelectors()) {
            console.error("StoreScreenUI: Initialization failed. Could not cache selectors.");
            this.#initialized = false;
            return false;
        }

        this._bindEvents();

        this.#initialized = true;
        console.log("StoreScreenUI: Initialized (selectors, events, JSON items)");
        return true;
    }

    render() {
        if (!this.#initialized) {
            // ... (lógica de inicialização se não inicializado)
            console.error("StoreScreenUI: Cannot render before init() is called successfully.");
            this.init().then(success => {
                if (success) this.render();
                else console.error("StoreScreenUI: Failed to initialize on render call.");
            });
            return;
        }
        // ... (resto do render)
        console.log("StoreScreenUI: Rendering store grid...");

        const user = this.#accountManager.getCurrentUser();
        const wallet = user?.wallet ?? { gold: 0, gems: 0 };

        this.#goldAmountEl.text(wallet.gold);
        this.#gemsAmountEl.text(wallet.gems);

        this._renderGrid(user);
        this._closeDetail(); // Garante que o overlay de detalhes esteja fechado ao renderizar a loja
    }

    _cacheSelectors() {
        this.#el = $('#store-screen');
        if (!this.#el.length) { console.error("StoreScreenUI Cache Error: #store-screen not found!"); return false; }

        this.#gridEl           = this.#el.find('#store-grid');
        this.#goldAmountEl     = this.#el.find('#store-gold-amount'); // No cabeçalho da loja
        this.#gemsAmountEl     = this.#el.find('#store-gems-amount');   // No cabeçalho da loja
        this.#detailOverlayEl  = this.#el.find('#store-detail-overlay');
        this.#detailImg        = this.#detailOverlayEl.find('#store-detail-image');
        this.#detailName       = this.#detailOverlayEl.find('#store-detail-name');
        this.#detailDesc       = this.#detailOverlayEl.find('#store-detail-desc');
        this.#btnConfirmGold   = this.#detailOverlayEl.find('#btn-buy-gold');
        this.#btnConfirmGems   = this.#detailOverlayEl.find('#btn-buy-gems');
        // LINHA REMOVIDA: this.#btnCloseDetail   = this.#detailOverlayEl.find('#btn-close-detail');

        // Ajuste na verificação para remover #btnCloseDetail
        if (!this.#gridEl.length || !this.#detailOverlayEl.length || 
            /*!this.#btnCloseDetail.length ||*/ // REMOVIDA A VERIFICAÇÃO
            !this.#goldAmountEl.length || !this.#gemsAmountEl.length ||
            !this.#detailImg.length || !this.#detailName.length || !this.#detailDesc.length ||
            !this.#btnConfirmGold.length || !this.#btnConfirmGems.length) {
            console.error("StoreScreenUI Cache Error: One or more essential child elements not found!");
            return false;
        }
        return true;
    }

    _bindEvents() {
        const self = this;
        const namespace = '.storeui';

        this.#gridEl.off(namespace);
        this.#detailOverlayEl.off(namespace);
        // this.#btnCloseDetail?.off(namespace); // REMOVIDO O UNBIND, POIS O BOTÃO NÃO EXISTE MAIS
        this.#btnConfirmGold.off(namespace);
        this.#btnConfirmGems.off(namespace);

        this.#gridEl
            .on(`click${namespace}`, '.store-item', function () {
                // ... (lógica do clique no item)
                const id = $(this).data('item-id');
                const isVisuallyOwned = $(this).hasClass('owned');
                if (!isVisuallyOwned) {
                    self.#audioManager?.playSFX('buttonClick');
                    if (id) self._openDetail(id);
                    else console.warn("StoreScreenUI: Clicked store item missing data-item-id.");
                } else {
                    self.#audioManager?.playSFX('genericError');
                }
            })
            .on(`mouseenter${namespace}`, '.store-item:not(.owned)', function () {
                self.#audioManager?.playSFX('buttonHover');
            });

        // O clique no overlay (fora do .detail-card) ainda fecha o detalhe
        this.#detailOverlayEl
            .on(`click${namespace}`, e => {
                if (e.target === e.currentTarget) {
                    self.#audioManager?.playSFX('buttonClick'); // Ou um som de "cancelar"
                    self._closeDetail();
                }
            });

        // Evento para o botão #btnCloseDetail REMOVIDO
        // this.#btnCloseDetail
        //     .on(`click${namespace}`, () => {
        //         self.#audioManager?.playSFX('buttonClick');
        //         self._closeDetail();
        //     });

        this.#btnConfirmGold
            .on(`click${namespace}`, () => self._handlePurchase('gold'));
        this.#btnConfirmGems
            .on(`click${namespace}`, () => self._handlePurchase('gems'));

        // Ajustado o seletor para o hover, removendo #btnCloseDetail
        this.#btnConfirmGold.add(this.#btnConfirmGems) // REMOVIDO: .add(this.#btnCloseDetail)
            .on(`mouseenter${namespace}`, () => self.#audioManager?.playSFX('buttonHover'));
    }

    // O método _renderGrid permanece o mesmo
    _renderGrid(user) {
        const localUser = user || {};
        const ownedPurchases = new Set(localUser.inventory?.purchases ?? []);
        this.#gridEl.empty();

        if (!user) {
            this.#gridEl.append('<p class="placeholder-message">Faça login para ver a loja.</p>');
            return;
        }
        if (this.items.length === 0) {
            this.#gridEl.append('<p class="placeholder-message">Nenhum item disponível na loja no momento.</p>');
            return;
        }

        this.items.forEach(item => {
            let isVisuallyOwned = false;
            if (item.type === 'avatar') {
                isVisuallyOwned = localUser.avatars?.includes(item.img) ?? false;
            } else if (item.type === 'sleeve') {
                isVisuallyOwned = ownedPurchases.has(item.id);
            }

            const canAffordGold = (localUser.wallet?.gold ?? 0) >= item.priceGold;
            const canAffordGems = (localUser.wallet?.gems ?? 0) >= item.priceGems;

            const goldButtonClass = !isVisuallyOwned && !canAffordGold ? ' unaffordable' : '';
            const gemsButtonClass = !isVisuallyOwned && !canAffordGems ? ' unaffordable' : '';
            
            const goldBaseClass = 'game-button';
            const gemsBaseClass = 'game-button-blue';

            const goldButtonText = isVisuallyOwned ? 'Possuído' : `${item.priceGold} 💰`;
            const gemsButtonText = isVisuallyOwned ? 'Possuído' : `${item.priceGems} 💎`;
            const buttonDisabled = isVisuallyOwned;

            const html = `
              <div class="store-item${isVisuallyOwned ? ' owned' : ''}" data-item-id="${item.id}" title="${item.name}${isVisuallyOwned ? ' (Já Possuído)' : ''}">
                <div class="store-item-image-container">
                  <img src="assets/images/store/${item.img}" alt="${item.name}">
                </div>
                <h4>${item.name}</h4>
                <p class="item-short">${item.short}</p>
                <div class="price-buttons">
                  <button class="${goldBaseClass} btn-price-gold${goldButtonClass}" ${buttonDisabled ? 'disabled' : ''} title="${item.priceGold} Ouro${!isVisuallyOwned && !canAffordGold ? ' (Insuficiente)' : ''}">
                    ${goldButtonText}
                  </button>
                  <button class="${gemsBaseClass} btn-price-gems${gemsButtonClass}" ${buttonDisabled ? 'disabled' : ''} title="${item.priceGems} Gemas${!isVisuallyOwned && !canAffordGems ? ' (Insuficiente)' : ''}">
                    ${gemsButtonText}
                  </button>
                </div>
              </div>`;
            this.#gridEl.append(html);
        });
        // console.log(`StoreScreenUI: Grid rendered with ${this.items.length} items.`); // Log já existente
    }
    
    // O método _openDetail permanece o mesmo (ele não usa #btnCloseDetail diretamente)
    _openDetail(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) {
            console.error(`StoreScreenUI: Item with ID ${itemId} not found.`);
            return;
        }
        // console.log(`StoreScreenUI: Opening detail for ${itemId} - ${item.name}`);

        this.#detailOverlayEl.data('item-id', item.id);
        this.#detailImg.attr('src', `assets/images/store/${item.img}`).attr('alt', item.name);
        this.#detailName.text(item.name);
        this.#detailDesc.text(item.long || item.short);

        const user = this.#accountManager.getCurrentUser();
        let isVisuallyOwned = false;
        if (item.type === 'avatar') { isVisuallyOwned = user?.avatars?.includes(item.img) ?? false; }
        else if (item.type === 'sleeve') { isVisuallyOwned = user?.inventory?.purchases?.includes(item.id) ?? false; }

        const canAffordGold = (user?.wallet?.gold ?? 0) >= item.priceGold;
        const canAffordGems = (user?.wallet?.gems ?? 0) >= item.priceGems;

        this.#btnConfirmGold
            .removeClass('game-button-blue') 
            .addClass('game-button')         
            .text(isVisuallyOwned ? 'Possuído' : `${item.priceGold} 💰`)
            .prop('disabled', isVisuallyOwned || !canAffordGold)
            .toggleClass('unaffordable', !isVisuallyOwned && !canAffordGold);

        this.#btnConfirmGems
            .removeClass('game-button')      
            .addClass('game-button-blue')    
            .text(isVisuallyOwned ? 'Possuído' : `${item.priceGems} 💎`)
            .prop('disabled', isVisuallyOwned || !canAffordGems)
            .toggleClass('unaffordable', !isVisuallyOwned && !canAffordGems);

        this.#detailOverlayEl.addClass('active');
    }

    // O método _closeDetail permanece o mesmo
    _closeDetail() {
        if (this.#detailOverlayEl && this.#detailOverlayEl.hasClass('active')) {
            // console.log("StoreScreenUI: Closing detail overlay.");
            this.#detailOverlayEl.removeClass('active');
            this.#detailOverlayEl.removeData('item-id');
        }
    }

    // O método _handlePurchase permanece o mesmo
    async _handlePurchase(currency) {
        const itemId = this.#detailOverlayEl.data('item-id');
        const item = this.items.find(i => i.id === itemId);
        if (!item) { console.error("StorePurchase Error: Item missing:", itemId); this._closeDetail(); return; }

        const user = this.#accountManager.getCurrentUser();
        if (!user) { this._closeDetail(); return; }

        let isAlreadyOwnedNonRepeatable = false;
        if (item.type === 'avatar') { isAlreadyOwnedNonRepeatable = user.avatars?.includes(item.img) ?? false; }
        else if (item.type === 'sleeve') { isAlreadyOwnedNonRepeatable = user.inventory?.purchases?.includes(item.id) ?? false; }

        if (isAlreadyOwnedNonRepeatable) {
            this.#audioManager?.playSFX('genericError');
            alert("Você já possui este item (Avatar/Sleeve)."); 
            this._closeDetail();
            return;
        }

        user.wallet ??= { gold: 0, gems: 0 };
        user.inventory ??= { purchases: [], boosters: {} };
        user.inventory.purchases ??= [];
        user.inventory.boosters ??= {};

        const wallet = user.wallet;
        const purchases = user.inventory.purchases;
        const cost = currency === 'gold' ? item.priceGold : item.priceGems;

        if (wallet[currency] < cost) {
            this.#audioManager?.playSFX('genericError');
            alert(`Saldo insuficiente de ${currency}.`); 
            return;
        }

        wallet[currency] -= cost;
        if (!purchases.includes(item.id)) {
             purchases.push(item.id);
        }
        
        this.#accountManager.saveCurrentUserData();
        // console.log(`StorePurchase: User data saved after debiting ${cost} ${currency} for item ${itemId}.`);
        this.#audioManager?.playSFX('purchase_success'); 

        let navigationTarget = null;
        let navigationArgs = {};

        try {
            switch (item.type) {
                case 'booster': {
                    const cardDb = this.#uiManager.getCardDatabase();
                    if (!cardDb) throw new Error("Banco de dados de cartas não disponível.");
                    const pool = Object.values(cardDb).filter(c => c.set === item.set);
                    if (pool.length === 0) throw new Error(`Erro: Nenhuma carta encontrada para o booster ${item.name}.`);
                    const pack = Array.from({ length: 10 }, () => pool[Math.floor(Math.random() * pool.length)].id); 
                    navigationTarget = 'booster-opening-screen';
                    navigationArgs = { pack: pack };
                    break;
                }
                case 'deck': {
                    if (!item.deckContents || !Array.isArray(item.deckContents) || item.deckContents.length === 0) {
                         throw new Error(`Erro ao comprar deck ${item.name}: Definição de cartas inválida.`);
                    }
                    this.#accountManager.addCardsToCollection(item.deckContents);
                    this.#accountManager.addDeck(item.id, item.deckContents, item.name); 
                    navigationTarget = 'deck-management-screen';
                    break;
                }
                 case 'card': {
                    const cardDefinitionId = item.cardId;
                    if (!cardDefinitionId) {
                         throw new Error(`Erro ao comprar carta ${item.name}: cardId não definido.`);
                    }
                    this.#accountManager.addCardsToCollection([cardDefinitionId]);
                    navigationTarget = 'deck-management-screen'; 
                    break;
                }
                 case 'avatar': {
                    this.#accountManager.addAvatar(item.img); 
                    navigationTarget = 'profile-screen'; 
                    break;
                }
                 case 'sleeve': {
                     console.log(`StorePurchase: Sleeve ${item.name} purchased (implementar lógica de equipar/visualizar).`);
                     break;
                 }
                default:
                    console.warn(`StorePurchase: Unknown item type '${item.type}'.`);
            }

            this._closeDetail();
            this.#uiManager.updateCurrenciesDisplay(wallet.gold, wallet.gems); 

            if (navigationTarget) {
                // console.log(`StorePurchase: Navigating to ${navigationTarget}...`);
                await this.#uiManager.navigateTo(navigationTarget, navigationArgs);
            } else {
                // console.log("StorePurchase: No navigation, re-rendering store.");
                 if (!this.#initialized) await this.init();
                 if (this.#initialized) this.render();
            }

        } catch (error) {
            console.error("StorePurchase Error during item processing or navigation:", error);
            alert(`Erro durante a compra: ${error.message}`); 
            console.warn(`StorePurchase: Reverting purchase for item ${itemId} due to error.`);
            wallet[currency] += cost; 
            const purchaseIndex = purchases.lastIndexOf(item.id);
            if (purchaseIndex > -1) purchases.splice(purchaseIndex, 1); 
            this.#accountManager.saveCurrentUserData();
            this.#uiManager.updateCurrenciesDisplay(wallet.gold, wallet.gems);
            this._closeDetail();
            if (!this.#initialized) await this.init(); 
            if (this.#initialized) this.render(); 
        }
    }

    // O método destroy precisa remover a referência a #btnCloseDetail
    destroy() {
        console.log("StoreScreenUI: Destroying (cleaning up).");
        const namespace = '.storeui';
        this.#el?.off(namespace);
        this.#gridEl?.off(namespace);
        this.#detailOverlayEl?.off(namespace);
        // this.#btnCloseDetail?.off(namespace); // REMOVIDO
        this.#btnConfirmGold?.off(namespace);
        this.#btnConfirmGems?.off(namespace);

        this.#initialized = false;
        this.#el = this.#gridEl = this.#detailOverlayEl = this.#detailImg = this.#detailName = this.#detailDesc = this.#btnConfirmGold = this.#btnConfirmGems /*= this.#btnCloseDetail*/ = this.#goldAmountEl = this.#gemsAmountEl = null;
        console.log("StoreScreenUI: Destroy complete.");
    }
}