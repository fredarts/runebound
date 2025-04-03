// js/ui/screens/HomeScreenUI.js - ATUALIZADO (v2.6 Audio Fix + Back Button Debug)

export default class HomeScreenUI {
    #screenManager;
    #uiManager; // Reference to UIManager (optional, for more complex interactions)
    #audioManager; // Reference to AudioManager for sound effects

    // UI Element Caching
    #homeScreenElement;
    #newsFeedContainer;
    #newsDetailContainer;
    #newsDetailTitle;
    #newsDetailImage;
    #newsDetailContent;
    #btnBackToFeed;
    #btnGotoConnect; // Button to navigate to the connect/play screen

    #newsData = []; // Stores loaded news data

    constructor(screenManager, uiManager, audioManager) { // Receives AudioManager
        this.#screenManager = screenManager;
        this.#uiManager = uiManager;
        this.#audioManager = audioManager; // Stores AudioManager reference

        this._cacheSelectors();
        if (!this.#homeScreenElement || !this.#homeScreenElement.length) {
            console.error("HomeScreenUI Error: Element #home-screen not found!");
            return; // Prevent initialization if the screen element is missing
        }

        this._bindEvents(); // Bind event listeners once
        console.log("HomeScreenUI initialized with AudioManager.");
    }

    /** Caches jQuery selectors for UI elements */
    _cacheSelectors() {
        this.#homeScreenElement = $('#home-screen');
        this.#newsFeedContainer = this.#homeScreenElement.find('#news-feed-container');
        this.#newsDetailContainer = this.#homeScreenElement.find('#news-detail-container');
        this.#newsDetailTitle = this.#homeScreenElement.find('#news-detail-title');
        this.#newsDetailImage = this.#homeScreenElement.find('#news-detail-image');
        this.#newsDetailContent = this.#homeScreenElement.find('#news-detail-content');
        this.#btnBackToFeed = this.#homeScreenElement.find('#btn-back-to-news-feed');
        this.#btnGotoConnect = this.#homeScreenElement.find('#btn-goto-connect-from-home');
        console.log("HomeScreenUI: Selectors cached.");
         // Verify selectors
         if (!this.#btnBackToFeed.length) {
             console.warn("HomeScreenUI Cache Warning: #btn-back-to-news-feed not found!");
         }
         if (!this.#newsFeedContainer.length) {
              console.warn("HomeScreenUI Cache Warning: #news-feed-container not found!");
         }
          if (!this.#newsDetailContainer.length) {
              console.warn("HomeScreenUI Cache Warning: #news-detail-container not found!");
          }
    }

    /** Binds event listeners for the home screen */
    _bindEvents() {
        console.log("HomeScreenUI: Binding events...");
        const self = this; // Reference 'this' for use inside handlers

        // Helper function to add audio listeners
        const addAudio = ($el, clickSfx = 'buttonClick', hoverSfx = 'buttonHover') => {
            $el.off('click.hsaudio mouseenter.hsaudio'); // Remove previous listeners
            $el.on('click.hsaudio', () => self.#audioManager?.playSFX(clickSfx));
            $el.on('mouseenter.hsaudio', () => self.#audioManager?.playSFX(hoverSfx));
        };

        // --- Event Bindings ---

        // Clicking on a news item in the feed
        this.#newsFeedContainer.off('click', '.news-item').on('click', '.news-item', (event) => {
            const newsId = $(event.currentTarget).data('news-id');
            // Play click sound BEFORE potentially navigating away or changing view
            self.#audioManager?.playSFX('buttonClick');
            if (newsId) {
                console.log(`HomeScreenUI: News item clicked, ID: ${newsId}`);
                self._showNewsDetail(newsId);
            } else {
                console.warn("HomeScreenUI: Clicked news item missing data-news-id.");
            }
        });

        // Hovering over a news item
        this.#newsFeedContainer.off('mouseenter', '.news-item').on('mouseenter', '.news-item', () => {
            self.#audioManager?.playSFX('buttonHover');
        });

        // Clicking the "Back to Feed" button from the detail view
        this.#btnBackToFeed.off('click').on('click', () => {
            console.log("HomeScreenUI: 'Back to Feed' button clicked."); // Debug log
            // Click sound is handled by addAudio below
            self._showNewsFeed();
        });
        addAudio(this.#btnBackToFeed); // Add click/hover sounds

        // Clicking the "Play" (Go to Connect) button
        this.#btnGotoConnect.off('click').on('click', () => {
            console.log("HomeScreenUI: 'Go to Connect' button clicked.");
            // Click sound is handled by addAudio below
            // Reset connect screen state (optional but good practice)
            $('#connect-message').text('');
            $('#server-status-section, #join-game-section').hide();
            $('#opponent-ip').val('');
            // Navigate using ScreenManager
            self.#screenManager.showScreen('connect-screen');
            // Play BGM for the connect screen (UIManager/main.js might also handle this)
            self.#audioManager?.playBGM('connect-screen');
        });
        addAudio(this.#btnGotoConnect); // Add click/hover sounds

        console.log("HomeScreenUI: Events bound.");
    }

    /**
     * Renders the home screen by loading news data and displaying the feed.
     * This is the main entry point when navigating TO the home screen.
     */
    async render() {
        console.log("HomeScreenUI: Rendering...");
        // Show a loading indicator while fetching data
        this.#newsFeedContainer.html('<p class="placeholder-message">Carregando notícias...</p>');
        this.#newsDetailContainer.hide(); // Ensure detail view is hidden initially
        this.#newsFeedContainer.show();   // Ensure feed container is visible initially

        await this._loadNewsData(); // Load or reload news data
        this._renderNewsFeed();     // Populate the feed container
        // No need to call _showNewsFeed() here as the initial state is set above
        console.log("HomeScreenUI: Render complete.");
    }

    /** Fetches and stores news data from the JSON file */
    async _loadNewsData() {
        try {
            // Using Fetch API to get the JSON data
            const response = await fetch('js/data/news-data.json'); // Path relative to index.html
            if (!response.ok) {
                // Throw an error if the response status is not OK (e.g., 404 Not Found)
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            // Sort news data by date, most recent first
            this.#newsData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
            console.log("HomeScreenUI: News data loaded successfully:", this.#newsData.length, "items");

        } catch (error) {
            console.error("HomeScreenUI: Failed to load or parse news data:", error);
            this.#newsData = []; // Reset data on error
            // Display error message in the feed container
            this.#newsFeedContainer.html('<p class="error-message">Não foi possível carregar as notícias. Verifique a conexão ou o arquivo news-data.json.</p>');
        }
    }

    /** Populates the news feed container with summary items */
    _renderNewsFeed() {
        this.#newsFeedContainer.empty(); // Clear previous items

        if (!this.#newsData || this.#newsData.length === 0) {
            // Display message if no news data is available after loading attempt
            if (this.#newsFeedContainer.find('.error-message').length === 0) { // Avoid overwriting load error
                 this.#newsFeedContainer.html('<p class="placeholder-message">Nenhuma notícia disponível no momento.</p>');
            }
            return;
        }

        // Create and append HTML for each news item
        this.#newsData.forEach(item => {
            const itemHtml = this._createNewsItemSummaryHTML(item);
            this.#newsFeedContainer.append(itemHtml);
        });
        console.log("HomeScreenUI: News feed populated.");
    }

    /** Generates the HTML string for a single news item summary */
    _createNewsItemSummaryHTML(item) {
        // Format the date nicely
        const formattedDate = new Date(item.date).toLocaleDateString('pt-BR', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
        // Conditionally include image and category
        const imageHtml = item.image ? `<img src="${item.image}" alt="" class="news-image-summary">` : '';
        const categoryHtml = item.category ? `<span class="news-category">[${item.category}]</span>` : '';

        // Return the HTML structure for the feed item
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

    /** Displays the detailed view for a specific news item */
    _showNewsDetail(newsId) {
        // Find the news item by its ID
        const item = this.#newsData.find(n => n.id === newsId);
        if (!item) {
            console.error(`HomeScreenUI: News item with ID ${newsId} not found in loaded data.`);
            this._showMessage("Erro: Notícia não encontrada.", "error"); // Show error to user
            return;
        }

        console.log(`HomeScreenUI: Showing detail for news ID ${newsId} - "${item.title}"`);

        // Populate the detail view elements
        this.#newsDetailTitle.text(item.title);
        this.#newsDetailContent.html(item.content); // Use .html() to render potential HTML in content

        // Handle the image display
        if (item.image) {
            this.#newsDetailImage.attr('src', item.image).attr('alt', item.title).show();
        } else {
            this.#newsDetailImage.hide().attr('src',''); // Hide and clear src if no image
        }

        // Switch visibility: hide feed, show detail
        this.#newsFeedContainer.hide();
        this.#newsDetailContainer.show();
        this.#newsDetailContainer.scrollTop(0); // Scroll detail view to top
    }

    /** Hides the detail view and shows the news feed */
    _showNewsFeed() {
        console.log("HomeScreenUI: Switching view to news feed.");
        this.#newsDetailContainer.hide();
        this.#newsFeedContainer.show();
    }

     /** Helper to display temporary messages (optional) */
    _showMessage(text, type = 'info', duration = 3000) {
        // Could add a dedicated message area to the home screen template
        // Or use a more global notification system if available
        console.log(`HomeScreenUI [${type}]: ${text}`);
        // Example: Alert fallback
        // if (type === 'error') {
        //     alert(`Erro: ${text}`);
        // }
    }

} // End class HomeScreenUI