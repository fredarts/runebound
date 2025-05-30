// js/ui/screens/StoreScreenUI.js - ATUALIZADO E PRONTO



export default class StoreScreenUI {
    #screenManager;
    #accountManager;
    #audioManager;
    #uiManager;

    // UI Element Cache
    #el;                     // Root element #store-screen
    #gridEl;                 // Grid container #store-grid
    #detailOverlayEl;        // Detail overlay #store-detail-overlay
    #detailImg;
    #detailName;
    #detailDesc;
    #btnConfirmGold;
    #btnConfirmGems;
    #btnCloseDetail;
    #btnBack;
    #goldAmountEl;
    #gemsAmountEl;

    #initialized = false;    // Flag interno para init()

    items = [];              // Itens carregados do JSON

    /**
     * @param {ScreenManager} screenManager
     * @param {AccountManager} accountManager
     * @param {AudioManager} audioManager
     * @param {UIManager} uiManager
     */
    constructor(screenManager, accountManager, audioManager, uiManager) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#audioManager = audioManager;
        this.#uiManager = uiManager;
        console.log("StoreScreenUI instance created.");
    }

    /**
     * Carrega JSON e inicializa seletores e eventos.
     * Deve ser chamado antes de qualquer render().
     */
    async init() {
        if (this.#initialized) return true; // Return true if already initialized

        // 1) Carrega o JSON de itens
        try {
            const response = await fetch('js/data/store-items.json');
            if (!response.ok) {
                 throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.items = await response.json();
            console.log('StoreScreenUI: Items loaded from JSON');
        } catch (err) {
            console.error('StoreScreenUI: Falha ao carregar store-items.json', err);
            this.items = []; // Default to empty on error
            this.#initialized = false; // Mark as not initialized on error
            return false; // Indicate failure
        }

        // 2) Cache de seletores
        if (!this._cacheSelectors()) {
            console.error("StoreScreenUI: Initialization failed. Could not cache selectors.");
            this.#initialized = false;
            return false; // Indicate failure
        }

        // 3) Binda eventos
        this._bindEvents();

        this.#initialized = true;
        console.log("StoreScreenUI: Initialized (selectors, events, JSON items)");
        return true; // Indicate success
    }

    /**
     * Renderiza o grid de itens.
     */
    render() {
        if (!this.#initialized) {
            console.error("StoreScreenUI: Cannot render before init() is called successfully.");
            this.init().then(success => {
                if (success) this.render();
                else console.error("StoreScreenUI: Failed to initialize on render call.");
            });
            return;
        }

        console.log("StoreScreenUI: Rendering store grid...");

        const user = this.#accountManager.getCurrentUser();
        const wallet = user?.wallet ?? { gold: 0, gems: 0 };

        // Update currency display
        this.#goldAmountEl.text(wallet.gold);
        this.#gemsAmountEl.text(wallet.gems);

        this._renderGrid(user); // Pass user data
        this._closeDetail(); // Ensure detail is closed
    }

    /** Cacheia todos os seletores jQuery necessários */
    _cacheSelectors() {
        this.#el = $('#store-screen');
        if (!this.#el.length) { console.error("StoreScreenUI Cache Error: #store-screen not found!"); return false; }
        this.#gridEl           = this.#el.find('#store-grid');
        this.#goldAmountEl     = this.#el.find('#store-gold-amount');
        this.#gemsAmountEl     = this.#el.find('#store-gems-amount');
        this.#detailOverlayEl  = this.#el.find('#store-detail-overlay');
        this.#detailImg        = this.#detailOverlayEl.find('#store-detail-image');
        this.#detailName       = this.#detailOverlayEl.find('#store-detail-name');
        this.#detailDesc       = this.#detailOverlayEl.find('#store-detail-desc');
        this.#btnConfirmGold   = this.#detailOverlayEl.find('#btn-buy-gold');
        this.#btnConfirmGems   = this.#detailOverlayEl.find('#btn-buy-gems');
        this.#btnCloseDetail   = this.#detailOverlayEl.find('#btn-close-detail');
        this.#btnBack          = this.#el.find('#btn-store-back-profile');

        if (!this.#gridEl.length || !this.#detailOverlayEl.length || !this.#btnCloseDetail.length || !this.#btnBack.length || !this.#goldAmountEl.length || !this.#gemsAmountEl.length) {
            console.error("StoreScreenUI Cache Error: One or more essential child elements not found!");
            return false;
        }
        return true;
    }

    /** Associa todos os event handlers (click, hover, etc.) */
    _bindEvents() {
        const self = this;
        const namespace = '.storeui';

        // --- Unbind previous listeners ---
        this.#btnBack.off(namespace);
        this.#gridEl.off(namespace);
        this.#detailOverlayEl.off(namespace);
        this.#btnCloseDetail.off(namespace);
        this.#btnConfirmGold.off(namespace);
        this.#btnConfirmGems.off(namespace);

        // --- Bind new listeners ---
        this.#btnBack
            .on(`click${namespace}`, () => {
                self.#audioManager?.playSFX('buttonClick');
                self.#uiManager?.navigateTo('profile-screen');
            })
            .on(`mouseenter${namespace}`, () => self.#audioManager?.playSFX('buttonHover'));

        this.#gridEl
            .on(`click${namespace}`, '.store-item', function () {
                const id = $(this).data('item-id');
                const isVisuallyOwned = $(this).hasClass('owned'); // Check if it's visually marked as owned (avatar/sleeve)
                if (!isVisuallyOwned) { // Open detail only if not visually owned
                    self.#audioManager?.playSFX('buttonClick');
                    if (id) self._openDetail(id);
                    else console.warn("StoreScreenUI: Clicked store item missing data-item-id.");
                } else {
                    self.#audioManager?.playSFX('genericError'); // Sound for clicking owned item
                }
            })
            .on(`mouseenter${namespace}`, '.store-item:not(.owned)', function () {
                self.#audioManager?.playSFX('buttonHover');
            });

        this.#detailOverlayEl
            .on(`click${namespace}`, e => {
                if (e.target === e.currentTarget) {
                    self.#audioManager?.playSFX('buttonClick');
                    self._closeDetail();
                }
            });

        this.#btnCloseDetail
            .on(`click${namespace}`, () => {
                self.#audioManager?.playSFX('buttonClick');
                self._closeDetail();
            });

        this.#btnConfirmGold
            .on(`click${namespace}`, () => self._handlePurchase('gold'));
        this.#btnConfirmGems
            .on(`click${namespace}`, () => self._handlePurchase('gems'));

        this.#btnConfirmGold.add(this.#btnConfirmGems).add(this.#btnCloseDetail)
            .on(`mouseenter${namespace}`, () => self.#audioManager?.playSFX('buttonHover'));
    }

    /** Popula o grid com base em this.items */
    _renderGrid(user) {
        const localUser = user || {};
        // Track all purchases for history, but ownership check depends on item type
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
            // Determine visual ownership ONLY for non-repeatable types
            let isVisuallyOwned = false;
            if (item.type === 'avatar') {
                isVisuallyOwned = localUser.avatars?.includes(item.img) ?? false;
            } else if (item.type === 'sleeve') {
                isVisuallyOwned = ownedPurchases.has(item.id);
            }
            // Repeatable items (booster, card, deck) are NEVER visually owned

            const canAffordGold = (localUser.wallet?.gold ?? 0) >= item.priceGold;
            const canAffordGems = (localUser.wallet?.gems ?? 0) >= item.priceGems;

            const goldButtonClass = !isVisuallyOwned && !canAffordGold ? ' unaffordable' : '';
            const gemsButtonClass = !isVisuallyOwned && !canAffordGems ? ' unaffordable' : '';

            const goldButtonText = isVisuallyOwned ? 'Possuído' : `${item.priceGold} 💰`;
            const gemsButtonText = isVisuallyOwned ? 'Possuído' : `${item.priceGems} 💎`;
            const buttonDisabled = isVisuallyOwned; // Only disable if visually owned

            const html = `
              <div class="store-item${isVisuallyOwned ? ' owned' : ''}" data-item-id="${item.id}" title="${item.name}${isVisuallyOwned ? ' (Já Possuído)' : ''}">
                <div class="store-item-image-container">
                  <img src="assets/images/store/${item.img}" alt="${item.name}">
                </div>
                <h4>${item.name}</h4>
                <p class="item-short">${item.short}</p>
                <div class="price-buttons">
                  <button class="btn-price-gold${goldButtonClass}" ${buttonDisabled ? 'disabled' : ''} title="${item.priceGold} Ouro${!isVisuallyOwned && !canAffordGold ? ' (Insuficiente)' : ''}">
                    ${goldButtonText}
                  </button>
                  <button class="btn-price-gems${gemsButtonClass}" ${buttonDisabled ? 'disabled' : ''} title="${item.priceGems} Gemas${!isVisuallyOwned && !canAffordGems ? ' (Insuficiente)' : ''}">
                    ${gemsButtonText}
                  </button>
                </div>
              </div>`;
            this.#gridEl.append(html);
        });

        console.log(`StoreScreenUI: Grid rendered with ${this.items.length} items (repeatable logic applied).`);
    }

    /** Abre o overlay de detalhe para o item clicado */
    _openDetail(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) {
            console.error(`StoreScreenUI: Item with ID ${itemId} not found.`);
            return;
        }
        console.log(`StoreScreenUI: Opening detail for ${itemId} - ${item.name}`);

        this.#detailOverlayEl.data('item-id', item.id);
        this.#detailImg.attr('src', `assets/images/store/${item.img}`).attr('alt', item.name);
        this.#detailName.text(item.name);
        this.#detailDesc.text(item.long || item.short);

        const user = this.#accountManager.getCurrentUser();
        let isVisuallyOwned = false; // Check ownership ONLY for non-repeatables
        if (item.type === 'avatar') { isVisuallyOwned = user?.avatars?.includes(item.img) ?? false; }
        else if (item.type === 'sleeve') { isVisuallyOwned = user?.inventory?.purchases?.includes(item.id) ?? false; }

        const canAffordGold = (user?.wallet?.gold ?? 0) >= item.priceGold;
        const canAffordGems = (user?.wallet?.gems ?? 0) >= item.priceGems;

        this.#btnConfirmGold
            .text(isVisuallyOwned ? 'Possuído' : `${item.priceGold} 💰`)
            .prop('disabled', isVisuallyOwned || !canAffordGold)
            .toggleClass('unaffordable', !isVisuallyOwned && !canAffordGold);

        this.#btnConfirmGems
            .text(isVisuallyOwned ? 'Possuído' : `${item.priceGems} 💎`)
            .prop('disabled', isVisuallyOwned || !canAffordGems)
            .toggleClass('unaffordable', !isVisuallyOwned && !canAffordGems);

        this.#detailOverlayEl.addClass('active');
    }

    /** Fecha o overlay de detalhe */
    _closeDetail() {
        if (this.#detailOverlayEl && this.#detailOverlayEl.hasClass('active')) {
            console.log("StoreScreenUI: Closing detail overlay.");
            this.#detailOverlayEl.removeClass('active');
            this.#detailOverlayEl.removeData('item-id');
        }
    }

    /** Lógica de compra de item */
    async _handlePurchase(currency) {
        const itemId = this.#detailOverlayEl.data('item-id');
        const item = this.items.find(i => i.id === itemId);
        if (!item) { console.error("StorePurchase Error: Item missing:", itemId); this._closeDetail(); return; }

        const user = this.#accountManager.getCurrentUser();
        if (!user) { /* ... handle not logged in ... */ this._closeDetail(); return; }

        // Check ownership ONLY for non-repeatable items
        let isAlreadyOwnedNonRepeatable = false;
        if (item.type === 'avatar') { isAlreadyOwnedNonRepeatable = user.avatars?.includes(item.img) ?? false; }
        else if (item.type === 'sleeve') { isAlreadyOwnedNonRepeatable = user.inventory?.purchases?.includes(item.id) ?? false; }

        if (isAlreadyOwnedNonRepeatable) {
            this.#audioManager?.playSFX('genericError');
            alert("Você já possui este item (Avatar/Sleeve).");
            this._closeDetail();
            return;
        }

        // Ensure structures exist (safe)
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

        // --- Proceed with Purchase ---
        wallet[currency] -= cost;
        purchases.push(item.id); // Always record purchase ID

        this.#accountManager.saveCurrentUserData(); // Save AFTER changes
        console.log(`StorePurchase: User data saved after debiting ${cost} ${currency} for item ${itemId}.`);

        this.#audioManager?.playSFX('deckSave');
        // Consider a less intrusive success message
        // alert("Compra realizada com sucesso!");

        let navigationTarget = null;
        let navigationArgs = {};
        let navigationAttempted = false;

        try {
            switch (item.type) {
                case 'booster': {
                    const cardDb = this.#uiManager.getCardDatabase();
                    if (!cardDb) throw new Error("Banco de dados de cartas não disponível.");
                    const pool = Object.values(cardDb).filter(c => c.set === item.set);
                    if (pool.length === 0) throw new Error(`Erro: Nenhuma carta encontrada para o booster ${item.name}.`);
                    const pack = Array.from({ length: 15 }, () => pool[Math.floor(Math.random() * pool.length)].id);
                    navigationTarget = 'booster-opening-screen';
                    navigationArgs = { pack: pack };
                    navigationAttempted = true;
                    break;
                }
                case 'deck': {
                    if (!item.deckContents || !Array.isArray(item.deckContents) || item.deckContents.length === 0) {
                         throw new Error(`Erro ao comprar deck ${item.name}: Definição de cartas inválida.`);
                    }
                    this.#accountManager.addCardsToCollection(item.deckContents);
                    this.#accountManager.addDeck(item.id, item.deckContents, item.name);
                    navigationTarget = 'deck-management-screen';
                    navigationAttempted = true;
                    break;
                }
                 case 'card': {
                    const cardDefinitionId = item.cardId;
                    if (!cardDefinitionId) {
                         throw new Error(`Erro ao comprar carta ${item.name}: cardId não definido.`);
                    }
                    this.#accountManager.addCardsToCollection([cardDefinitionId]);
                    navigationTarget = 'deck-management-screen';
                    navigationAttempted = true;
                    break;
                }
                 case 'avatar': {
                    this.#accountManager.addAvatar(item.img);
                    navigationTarget = 'profile-screen';
                    navigationAttempted = true;
                    break;
                }
                 case 'sleeve': {
                     console.log(`StorePurchase: Sleeve ${item.name} purchased (logic pending).`);
                     // No specific navigation needed for sleeves usually
                     break;
                 }
                default:
                    console.warn(`StorePurchase: Unknown item type '${item.type}'.`);
            }

            // --- Navigation and UI Update ---
            this._closeDetail();
            this.#uiManager.updateCurrenciesDisplay(wallet.gold, wallet.gems);

            if (navigationTarget) {
                console.log(`StorePurchase: Navigating to ${navigationTarget}...`);
                await this.#uiManager.navigateTo(navigationTarget, navigationArgs);
            } else {
                // Re-render store if no navigation occurred
                console.log("StorePurchase: No navigation, re-rendering store.");
                 if (!this.#initialized) await this.init();
                 if (this.#initialized) this.render();
            }

        } catch (error) {
            // --- Error Handling & Reversal ---
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
    } // End _handlePurchase

    /** Opcional: destrói a UI ao sair da tela */
    destroy() {
        console.log("StoreScreenUI: Destroying (cleaning up).");
        const namespace = '.storeui';
        this.#el?.off(namespace);
        this.#gridEl?.off(namespace);
        this.#detailOverlayEl?.off(namespace);
        this.#btnCloseDetail?.off(namespace);
        this.#btnConfirmGold?.off(namespace);
        this.#btnConfirmGems?.off(namespace);
        this.#btnBack?.off(namespace);
        this.#initialized = false;
        this.#el = this.#gridEl = this.#detailOverlayEl = this.#detailImg = this.#detailName = this.#detailDesc = this.#btnConfirmGold = this.#btnConfirmGems = this.#btnCloseDetail = this.#btnBack = this.#goldAmountEl = this.#gemsAmountEl = null;
        console.log("StoreScreenUI: Destroy complete.");
    }
}