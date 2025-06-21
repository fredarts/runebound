export function generateHomeScreenHTML() {
    return `
        <div id="home-screen" class="screen home-layout">
            <h2>Notícias e Novidades</h2>

            <div class="home-content-area">

                <div id="news-feed-container" class="scrollable-list news-feed">
                    <p class="placeholder-message">Carregando notícias...</p>
                </div>

                <div id="news-detail-container" class="news-detail-view" style="display: none;">
                    <button id="btn-back-to-news-feed" class="button-back button-login-base button-login-secondary">Voltar à Lista</button>
                    
                    <img id="news-detail-image" src="" alt="Imagem da Notícia" style="display: none;" class="news-image-detail"/>
                    <h3 id="news-detail-title">Título da Notícia</h3>
                    <div id="news-detail-content" class="news-content-detail scrollable-list">
                        <p>Conteúdo completo da notícia...</p>
                    </div>
                </div>

                <button id="btn-goto-connect-from-home" class="button-login-base button-login-primary" title="Encontrar Partida">
                     <span role="img" aria-label="Jogar">⚔️</span> Jogar
                </button>
            </div>

        </div>
    `;
}