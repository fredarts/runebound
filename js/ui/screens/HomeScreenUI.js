// js/ui/screens/HomeScreenUI.js

export default class HomeScreenUI {
    #screenManager;
    #uiManager; // Para possível comunicação futura, não estritamente necessário aqui

    #homeScreenElement;
    #newsFeedContainer;
    #newsDetailContainer;
    #newsDetailTitle;
    #newsDetailImage;
    #newsDetailContent;
    #btnBackToFeed;
    #btnGotoConnect;

    #newsData = []; // Armazena as notícias carregadas

    constructor(screenManager, uiManager) {
        this.#screenManager = screenManager;
        this.#uiManager = uiManager;

        this._cacheSelectors();
        if (!this.#homeScreenElement || !this.#homeScreenElement.length) {
            console.error("HomeScreenUI Error: Element #home-screen not found!");
            return;
        }

        this._bindEvents();
        console.log("HomeScreenUI initialized.");
    }

    _cacheSelectors() {
        this.#homeScreenElement = $('#home-screen');
        this.#newsFeedContainer = this.#homeScreenElement.find('#news-feed-container');
        this.#newsDetailContainer = this.#homeScreenElement.find('#news-detail-container');
        this.#newsDetailTitle = this.#homeScreenElement.find('#news-detail-title');
        this.#newsDetailImage = this.#homeScreenElement.find('#news-detail-image');
        this.#newsDetailContent = this.#homeScreenElement.find('#news-detail-content');
        this.#btnBackToFeed = this.#homeScreenElement.find('#btn-back-to-news-feed');
        this.#btnGotoConnect = this.#homeScreenElement.find('#btn-goto-connect-from-home');
    }

    _bindEvents() {
        // Clicar num item do feed
        this.#newsFeedContainer.on('click', '.news-item', (event) => {
            const newsId = $(event.currentTarget).data('news-id');
            if (newsId) {
                this._showNewsDetail(newsId);
            }
        });

        // Clicar no botão Voltar do detalhe
        this.#btnBackToFeed.on('click', () => {
            this._showNewsFeed();
        });

        // Clicar no botão Jogar
        this.#btnGotoConnect.on('click', () => {
            // Navega para a tela de conexão (UIManager pode ter método para resetar estado dela)
             $('#connect-message').text(''); // Reset connect screen UI state if needed
             $('#server-status-section, #join-game-section').hide();
            this.#screenManager.showScreen('connect-screen');
        });
    }

    /** Renderiza a tela inicial, buscando e mostrando o feed */
    async render() {
        console.log("HomeScreenUI: Rendering...");
        await this._loadNewsData(); // Carrega os dados antes de mostrar
        this._renderNewsFeed();
        this._showNewsFeed(); // Garante que o feed está visível
    }

    /** Carrega os dados das notícias do JSON */
    async _loadNewsData() {
        // Idealmente, use fetch. Se fetch não for uma opção fácil agora,
        // você pode importar diretamente se transformar o JSON num módulo JS.
        try {
            // Usando Fetch (preferível)
            const response = await fetch('js/data/news-data.json'); // Caminho relativo ao index.html
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.#newsData = await response.json();
            // Ordena por data, mais recente primeiro
            this.#newsData.sort((a, b) => new Date(b.date) - new Date(a.date));
            console.log("HomeScreenUI: News data loaded successfully:", this.#newsData.length, "items");

        } catch (error) {
            console.error("HomeScreenUI: Failed to load news data:", error);
            this.#newsData = []; // Define como vazio em caso de erro
            this.#newsFeedContainer.html('<p class="error-message">Não foi possível carregar as notícias.</p>');
        }
    }

    /** Popula o container do feed com os itens de notícia */
    _renderNewsFeed() {
        this.#newsFeedContainer.empty(); // Limpa antes de adicionar
        if (this.#newsData.length === 0) {
            this.#newsFeedContainer.html('<p class="placeholder-message">Nenhuma notícia disponível no momento.</p>');
            return;
        }

        this.#newsData.forEach(item => {
            const itemHtml = this._renderNewsItemSummaryHTML(item);
            this.#newsFeedContainer.append(itemHtml);
        });
    }

    /** Gera o HTML para um item resumido no feed */
    _renderNewsItemSummaryHTML(item) {
        const formattedDate = new Date(item.date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' });
        const imageHtml = item.image ? `<img src="${item.image}" alt="" class="news-image-summary">` : '';
        const categoryHtml = item.category ? `<span class="news-category">[${item.category}]</span>` : '';

        return `
            <div class="news-item" data-news-id="${item.id}">
                ${imageHtml}
                <div class="news-item-content">
                    <div class="news-item-header">
                        <h4 class="news-title-summary">${item.title}</h4>
                        <span class="news-date">${formattedDate} ${categoryHtml}</span>
                    </div>
                    <p class="news-summary">${item.summary}</p>
                </div>
            </div>
        `;
    }

    /** Mostra a visualização detalhada de uma notícia */
    _showNewsDetail(newsId) {
        const item = this.#newsData.find(n => n.id === newsId);
        if (!item) {
            console.error(`HomeScreenUI: News item with ID ${newsId} not found.`);
            return;
        }

        this.#newsDetailTitle.text(item.title);
        this.#newsDetailContent.html(item.content); // Usa .html() para renderizar o HTML do conteúdo

        if (item.image) {
            this.#newsDetailImage.attr('src', item.image).attr('alt', item.title).show();
        } else {
            this.#newsDetailImage.hide();
        }

        this.#newsFeedContainer.hide();
        this.#newsDetailContainer.show();
        this.#newsDetailContainer.scrollTop(0); // Scroll to top
        console.log(`HomeScreenUI: Showing detail for news ID ${newsId}`);
    }

    /** Mostra o feed de notícias, escondendo o detalhe */
    _showNewsFeed() {
        this.#newsDetailContainer.hide();
        this.#newsFeedContainer.show();
        console.log("HomeScreenUI: Showing news feed.");
    }
}