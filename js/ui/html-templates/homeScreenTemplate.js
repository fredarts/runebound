// js/ui/html-templates/homeScreenTemplate.js

/**
 * Gera a string HTML para a Tela Inicial (Mural de Notícias).
 * @returns {string} HTML da tela inicial.
 */
export function generateHomeScreenHTML() {
    return `
        <div id="home-screen" class="screen home-layout">
            <h2>Notícias e Novidades</h2>

            <!-- Área Principal: Feed ou Detalhe -->
            <div class="home-content-area">

                <!-- Feed de Notícias (inicialmente visível) -->
                <div id="news-feed-container" class="scrollable-list news-feed">
                    <p class="placeholder-message">Carregando notícias...</p>
                    <!-- Notícias serão inseridas aqui pelo JS -->
                </div>

                <!-- Detalhe da Notícia (inicialmente escondido) -->
                <div id="news-detail-container" class="news-detail-view" style="display: none;">
                    <button id="btn-back-to-news-feed" class="button-back">Voltar</button>
                    
                    <img id="news-detail-image" src="" alt="Imagem da Notícia" style="display: none;" class="news-image-detail"/>
                    <h3 id="news-detail-title">Título da Notícia</h3>
                    <div id="news-detail-content" class="news-content-detail scrollable-list">
                        <p>Conteúdo completo da notícia...</p>
                    </div>
                </div>

            </div>

            <!-- Botão Jogar -->
            <button id="btn-goto-connect-from-home" class="button-play" title="Encontrar Partida">
                 <span role="img" aria-label="Jogar">⚔️</span> Jogar
            </button>
        </div>
    `;
}