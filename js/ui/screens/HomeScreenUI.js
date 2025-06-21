// js/ui/screens/HomeScreenUI.js

export default class HomeScreenUI {
    #screenManager;
    #uiManager;
    #audioManager;

    #homeScreenElement;
    #newsFeedContainer;
    #newsDetailContainer;
    #newsDetailTitle;
    #newsDetailImage;
    #newsDetailContent;
    #btnBackToFeed;
    #btnGotoConnect; // Já estava declarado e cacheado

    #newsData = [];

    constructor(screenManager, uiManager, audioManager) {
        this.#screenManager = screenManager;
        this.#uiManager = uiManager;
        this.#audioManager = audioManager;

        this._cacheSelectors();
        if (!this.#homeScreenElement || !this.#homeScreenElement.length) {
            console.error("HomeScreenUI Error: Element #home-screen not found!");
            return;
        }
        this._bindEvents();
        console.log("HomeScreenUI initialized with AudioManager.");
    }

    _cacheSelectors() {
        this.#homeScreenElement = $('#home-screen');
        this.#newsFeedContainer = this.#homeScreenElement.find('#news-feed-container');
        this.#newsDetailContainer = this.#homeScreenElement.find('#news-detail-container');
        this.#newsDetailTitle = this.#homeScreenElement.find('#news-detail-title');
        this.#newsDetailImage = this.#homeScreenElement.find('#news-detail-image');
        this.#newsDetailContent = this.#homeScreenElement.find('#news-detail-content');
        this.#btnBackToFeed = this.#homeScreenElement.find('#btn-back-to-news-feed');
        this.#btnGotoConnect = this.#homeScreenElement.find('#btn-goto-connect-from-home'); // Já estava aqui
        
        if (!this.#btnBackToFeed.length) {
             console.warn("HomeScreenUI Cache Warning: #btn-back-to-news-feed not found!");
        }
        if (!this.#newsFeedContainer.length) {
              console.warn("HomeScreenUI Cache Warning: #news-feed-container not found!");
        }
        if (!this.#newsDetailContainer.length) {
              console.warn("HomeScreenUI Cache Warning: #news-detail-container not found!");
        }
        console.log("HomeScreenUI: Selectors cached.");
    }

    _bindEvents() {
        console.log("HomeScreenUI: Binding events...");
        const self = this;
        const namespace = '.homescreenui'; 

        const addAudio = ($el, clickSfx = 'buttonClick', hoverSfx = 'buttonHover') => {
            if (!$el || !$el.length) return;
            $el.off(`click${namespace} mouseenter${namespace}`);
            $el.on(`click${namespace}`, () => self.#audioManager?.playSFX(clickSfx));
            $el.on(`mouseenter${namespace}`, () => self.#audioManager?.playSFX(hoverSfx));
        };

        this.#newsFeedContainer.off(`click${namespace}`, '.news-item').on(`click${namespace}`, '.news-item', (event) => {
            const newsId = $(event.currentTarget).data('news-id');
            self.#audioManager?.playSFX('buttonClick'); 
            if (newsId) {
                console.log(`HomeScreenUI: News item clicked, ID: ${newsId}`);
                self._showNewsDetail(newsId);
            } else {
                console.warn("HomeScreenUI: Clicked news item missing data-news-id.");
            }
        });

        this.#newsFeedContainer.off(`mouseenter${namespace}`, '.news-item').on(`mouseenter${namespace}`, '.news-item', () => {
            self.#audioManager?.playSFX('buttonHover');
        });

        if (this.#btnBackToFeed && this.#btnBackToFeed.length) {
            addAudio(this.#btnBackToFeed);
            this.#btnBackToFeed.off(`click${namespace}.action`).on(`click${namespace}.action`, () => { 
                console.log("HomeScreenUI: 'Back to Feed' button clicked (action).");
                self._showNewsFeed();
            });
        } else {
            console.warn("HomeScreenUI: #btn-back-to-news-feed not found during event binding.");
        }
        
        if (this.#btnGotoConnect && this.#btnGotoConnect.length) {
            addAudio(this.#btnGotoConnect); 
            this.#btnGotoConnect.off(`click${namespace}.action`).on(`click${namespace}.action`, () => { 
                console.log("HomeScreenUI: 'Go to Connect' button clicked (action).");
                $('#connect-message').text('');
                $('#server-status-section, #join-game-section').hide();
                $('#opponent-ip').val('');
                self.#screenManager.showScreen('connect-screen');
                self.#audioManager?.playBGM('connect-screen');
            });
        } else {
            console.warn("HomeScreenUI: #btn-goto-connect-from-home not found during event binding.");
        }
        console.log("HomeScreenUI: Events bound.");
    }

    async render() {
        console.log("HomeScreenUI: Rendering...");
        this.#newsFeedContainer.html('<p class="placeholder-message">Carregando notícias...</p>');
        this.#newsDetailContainer.hide();
        this.#newsFeedContainer.show();
        this.#btnGotoConnect.show(); // --- ALTERAÇÃO: Garante que o botão Jogar esteja visível ao renderizar o feed ---

        await this._loadNewsData();
        this._renderNewsFeed();
        console.log("HomeScreenUI: Render complete.");
    }

    async _loadNewsData() {
        try {
            const response = await fetch('js/data/news-data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            this.#newsData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
            console.log("HomeScreenUI: News data loaded successfully:", this.#newsData.length, "items");
        } catch (error) {
            console.error("HomeScreenUI: Failed to load or parse news data:", error);
            this.#newsData = [];
            this.#newsFeedContainer.html('<p class="error-message">Não foi possível carregar as notícias. Verifique a conexão ou o arquivo news-data.json.</p>');
        }
    }

    _renderNewsFeed() {
        this.#newsFeedContainer.empty();

        if (!this.#newsData || this.#newsData.length === 0) {
            if (this.#newsFeedContainer.find('.error-message').length === 0) {
                 this.#newsFeedContainer.html('<p class="placeholder-message">Nenhuma notícia disponível no momento.</p>');
            }
            return;
        }

        this.#newsData.forEach(item => {
            const itemHtml = this._createNewsItemSummaryHTML(item);
            this.#newsFeedContainer.append(itemHtml);
        });
        console.log("HomeScreenUI: News feed populated.");
    }

    _createNewsItemSummaryHTML(item) {
        const formattedDate = new Date(item.date).toLocaleDateString('pt-BR', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
        const imageHtml = item.image ? `<img src="${item.image}" alt="" class="news-image-summary">` : '';
        const categoryHtml = item.category ? `<span class="news-category">[${item.category}]</span>` : '';

        return `
            <div class="news-item" data-news-id="${item.id}">
                ${imageHtml}
                <div class="news-item-content">
                    <div class="news-item-header">
                        <h4 class="news-title-summary">${item.title || 'Sem Título'}</h4>
                        <span class="news-date">${formattedDate} ${categoryHtml}</span>
                    </div>
                    <p class="news-summary">${item.summary || ''}</p>
                </div>
            </div>
        `;
    }

    _showNewsDetail(newsId) {
        const item = this.#newsData.find(n => n.id === newsId);
        if (!item) {
            console.error(`HomeScreenUI: News item with ID ${newsId} not found in loaded data.`);
            this._showMessage("Erro: Notícia não encontrada.", "error");
            return;
        }

        console.log(`HomeScreenUI: Showing detail for news ID ${newsId} - "${item.title}"`);

        this.#newsDetailTitle.text(item.title);
        this.#newsDetailContent.html(item.content);

        if (item.image) {
            this.#newsDetailImage.attr('src', item.image).attr('alt', item.title).show();
        } else {
            this.#newsDetailImage.hide().attr('src','');
        }

        this.#newsFeedContainer.hide();
        this.#newsDetailContainer.show();
        this.#btnGotoConnect.hide(); // --- ALTERAÇÃO: Esconde o botão Jogar ---
        this.#newsDetailContainer.scrollTop(0);
    }

    _showNewsFeed() {
        console.log("HomeScreenUI: Switching view to news feed.");
        this.#newsDetailContainer.hide();
        this.#newsFeedContainer.show();
        this.#btnGotoConnect.show(); // --- ALTERAÇÃO: Mostra o botão Jogar ---
    }

    _showMessage(text, type = 'info', duration = 3000) {
        console.log(`HomeScreenUI [${type}]: ${text}`);
    }
    
    destroy() {
        console.log("HomeScreenUI: Destroying (unbinding events)...");
        const namespace = '.homescreenui';
        this.#newsFeedContainer?.off(namespace); 
        this.#btnBackToFeed?.off(namespace); 
        this.#btnGotoConnect?.off(namespace);
        
        this.#homeScreenElement = null;
        this.#newsFeedContainer = null;
        this.#newsDetailContainer = null;
        this.#newsDetailTitle = null;
        this.#newsDetailImage = null;
        this.#newsDetailContent = null;
        this.#btnBackToFeed = null; 
        this.#btnGotoConnect = null;
        console.log("HomeScreenUI: Destroy complete.");
    }
}