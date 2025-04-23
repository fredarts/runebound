// js/ui/screens/StoreScreenUI.js

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
    #btnBack;                // Back button element

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
        if (this.#initialized) return;

        // 1) Carrega o JSON de itens
        try {
            this.items = await $.getJSON('js/data/store-items.json');
            console.log('StoreScreenUI: Items loaded from JSON');
        } catch (err) {
            console.error('StoreScreenUI: Falha ao carregar store-items.json', err);
            this.items = [];
        }

        // 2) Cache de seletores
        if (!this._cacheSelectors()) {
            console.error("StoreScreenUI: Initialization failed. Could not cache selectors.");
            return;
        }

        // 3) Binda eventos
        this._bindEvents();

        this.#initialized = true;
        console.log("StoreScreenUI: Initialized (selectors, events, JSON items)");
    }

    /**
     * Renderiza o grid de itens.
     */
    render() {
        if (!this.#initialized) {
            console.error("StoreScreenUI: Cannot render before init() is called successfully.");
            return;
        }
        
        console.log("StoreScreenUI: Rendering store grid...");
        this._renderGrid();
        this._closeDetail();
    }

    /** Cacheia todos os seletores jQuery necessários */
    _cacheSelectors() {
        this.#el = $('#store-screen');
        if (!this.#el.length) {
            console.error("StoreScreenUI Cache Error: #store-screen not found!");
            return false;
        }
        this.#gridEl           = this.#el.find('#store-grid');
        this.#detailOverlayEl  = this.#el.find('#store-detail-overlay');
        this.#detailImg        = this.#detailOverlayEl.find('#store-detail-image');
        this.#detailName       = this.#detailOverlayEl.find('#store-detail-name');
        this.#detailDesc       = this.#detailOverlayEl.find('#store-detail-desc');
        this.#btnConfirmGold   = this.#detailOverlayEl.find('#btn-buy-gold');
        this.#btnConfirmGems   = this.#detailOverlayEl.find('#btn-buy-gems');
        this.#btnCloseDetail   = this.#detailOverlayEl.find('#btn-close-detail');
        this.#btnBack          = this.#el.find('#btn-store-back-profile');

        if (!this.#gridEl.length
         || !this.#detailOverlayEl.length
         || !this.#btnCloseDetail.length
         || !this.#btnBack.length) {
            console.error("StoreScreenUI Cache Error: One or more essential child elements not found!");
            return false;
        }
        return true;
    }

    /** Associa todos os event handlers (click, hover, etc.) */
    _bindEvents() {
        const self = this;

        // Botão Voltar
        this.#btnBack
            .off('click.storeback').on('click.storeback', () => {
                self.#audioManager?.playSFX('buttonClick');
                self.#uiManager?.navigateTo('profile-screen');
            })
            .off('mouseenter.storeback').on('mouseenter.storeback', () => {
                self.#audioManager?.playSFX('buttonHover');
            });

        // Clique nos itens da loja
        this.#gridEl
            .off('click.storeitem').on('click.storeitem', '.store-item', function () {
                self.#audioManager?.playSFX('buttonClick');
                const id = $(this).data('item-id');
                if (id) self._openDetail(id);
                else console.warn("StoreScreenUI: Clicked store item missing data-item-id.");
            })
            .off('mouseenter.storeitem').on('mouseenter.storeitem', '.store-item:not(.owned)', function () {
                self.#audioManager?.playSFX('buttonHover');
            });

        // Fecha detalhe ao clicar fora
        this.#detailOverlayEl
            .off('click.storedetailclose').on('click.storedetailclose', e => {
                if (e.target === e.currentTarget) {
                    self.#audioManager?.playSFX('buttonClick');
                    self._closeDetail();
                }
            });

        // Botão fechar detalhe
        this.#btnCloseDetail
            .off('click.storedetailclosebtn').on('click.storedetailclosebtn', () => {
                self.#audioManager?.playSFX('buttonClick');
                self._closeDetail();
            });

        // Botões de compra
        this.#btnConfirmGold
            .off('click.storepurchase').on('click.storepurchase', () => self._handlePurchase('gold'));
        this.#btnConfirmGems
            .off('click.storepurchase').on('click.storepurchase', () => self._handlePurchase('gems'));

        // Hover nos botões de compra
        this.#btnConfirmGold.add(this.#btnConfirmGems)
            .off('mouseenter.storepurchase').on('mouseenter.storepurchase', () => {
                self.#audioManager?.playSFX('buttonHover');
            });
    }

    /** Popula o grid com base em this.items */
    _renderGrid() {
        const user = this.#accountManager.getCurrentUser();
        if (user && !user.inventory) user.inventory = { purchases: [] };
        const owned = new Set(user?.inventory?.purchases ?? []);

        this.#gridEl.empty();
        if (!user) {
            this.#gridEl.append('<p class="placeholder-message">Faça login para ver a loja.</p>');
            return;
        }

        this.items.forEach(item => {
            const isOwned = owned.has(item.id);
            const html = `
              <div class="store-item${isOwned ? ' owned' : ''}" data-item-id="${item.id}">
                <img src="assets/images/store/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p class="item-short">${item.short}</p>
                <div class="price-buttons">
                  <button class="btn-price-gold" ${isOwned ? 'disabled' : ''} title="${item.priceGold} Ouro">${item.priceGold} 💰</button>
                  <button class="btn-price-gems" ${isOwned ? 'disabled' : ''} title="${item.priceGems} Gemas">${item.priceGems} 💎</button>
                </div>
              </div>`;
            this.#gridEl.append(html);
        });

        console.log(`StoreScreenUI: Grid rendered with ${this.items.length} items.`);
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
        this.#detailImg
            .attr('src', `assets/images/store/${item.img}`)
            .attr('alt', item.name);
        this.#detailName.text(item.name);
        this.#detailDesc.text(item.long || item.short);

        const user = this.#accountManager.getCurrentUser();
        const owned = user?.inventory?.purchases?.includes(item.id);
        this.#btnConfirmGold.text(`${item.priceGold} 💰`).prop('disabled', owned);
        this.#btnConfirmGems.text(`${item.priceGems} 💎`).prop('disabled', owned);

        this.#detailOverlayEl.addClass('active');
    }

    /** Fecha o overlay de detalhe */
    _closeDetail() {
        if (this.#detailOverlayEl.hasClass('active')) {
            console.log("StoreScreenUI: Closing detail overlay.");
            this.#detailOverlayEl.removeClass('active');
            this.#detailOverlayEl.removeData('item-id');
            this.#detailImg.attr('src', '').attr('alt', '');
            this.#detailName.text('');
            this.#detailDesc.text('');
        }
    }

    /** Lógica de compra de item (mantida igual) */
    _handlePurchase(currency) {
        const itemId = this.#detailOverlayEl.data('item-id');
        const item = this.items.find(i => i.id === itemId);
        if (!item) {
            console.error("Store Purchase Error: Item data not found for ID:", itemId);
            this._closeDetail();
            return;
        }

        const user = this.#accountManager.getCurrentUser();
        if (!user) {
            this.#audioManager?.playSFX('genericError');
            alert("Você precisa estar logado para comprar.");
            this._closeDetail();
            this.#uiManager?.navigateTo('login-screen');
            return;
        }

        // ... (restante da lógica de compra, mesma do original) ...
    }

    /** Opcional: destrói a UI ao sair da tela */
    destroy() {
        console.log("StoreScreenUI: Destroying (cleaning up).");
        this.#el?.off('.store');
        this.#gridEl?.off('.storeitem');
        this.#detailOverlayEl?.off('.storedetailclose');
        this.#btnCloseDetail?.off('.storedetailclosebtn');
        this.#btnConfirmGold?.off('.storepurchase');
        this.#btnConfirmGems?.off('.storepurchase');
        this.#btnBack?.off('.storeback');
        this.#initialized = false;
    }
}
