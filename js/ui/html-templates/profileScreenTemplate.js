// js/ui/html-templates/profileScreenTemplate.js

/**
 * Gera a string HTML para a Tela de Perfil do Jogador.
 * @returns {string} HTML da tela de perfil.
 */
export function generateProfileScreenHTML() {
    // Inclui placeholders para os avatares baseados na sua estrutura de arquivos
    const avatarPath = 'assets/images/avatars/';
    const availableAvatars = ['default.png', 'avatar1.png', 'avatar2.png', 'avatar3.png']; // Adicione mais se tiver

    let avatarChoicesHTML = availableAvatars.map(filename => `
        <img src="${avatarPath}${filename}"
             class="avatar-choice ${filename === 'default.png' ? 'selected-avatar' : ''}"
             data-avatar="${filename}"
             alt="Avatar ${filename.split('.')[0]}"
             title="Selecionar ${filename.split('.')[0]}">
    `).join('');

    return `
        <div id="profile-screen" class="screen profile-layout">
            <h2>Perfil do Jogador</h2>

            <div class="profile-main-area">
                <div class="profile-left-column">
                    <!-- Informações Básicas -->
                    <div class="profile-section profile-info">
                        <h3>Informações</h3>
                        <p>Nome: <strong id="profile-username">(Carregando...)</strong></p>
                        <p>Rank: <span id="profile-rank">N/A</span></p>
                        <p>Vitórias/Derrotas: <span id="profile-wins">0</span> / <span id="profile-losses">0</span></p>
                    </div>

                    <!-- Seleção de Avatar -->
                    <div class="profile-section profile-avatar-section">
                        <h3>Avatar</h3>
                        <div class="profile-avatar-display">
                            <img id="profile-avatar-img" src="${avatarPath}default.png" alt="Avatar do Jogador">
                        </div>
                        <div id="profile-avatar-choices" class="avatar-choices-container">
                            ${avatarChoicesHTML}
                        </div>
                    </div>

                    <!-- Histórico de Partidas -->
                    <div class="profile-section profile-history">
                         <h3>Histórico de Partidas (Últimas 10)</h3>
                         <ul id="profile-match-history">
                             <li>(Nenhum histórico ainda)</li>
                             <!-- O histórico será preenchido pelo UIManager -->
                         </ul>
                    </div>
                </div>

                <div class="profile-right-column">
                     <!-- Coleção de Cartas -->
                    <div class="profile-section profile-collection">
                        <h3>Coleção (<span id="profile-card-count">0</span> cartas)</h3>
                        <p class="subtle-text">Clique para ampliar</p>
                        <div id="profile-unlocked-cards" class="card-grid scrollable-list">
                            <p>(Carregando coleção...)</p>
                            <!-- Mini-cards são renderizados aqui pelo UIManager -->
                        </div>
                    </div>

                    <!-- Lista de Decks -->
                    <div class="profile-section profile-decks">
                        <h3>Meus Decks</h3>
                         <ul id="profile-deck-list" class="scrollable-list deck-list-profile">
                             <li>(Carregando decks...)</li>
                             <!-- Decks são renderizados aqui pelo UIManager -->
                         </ul>
                         <button id="btn-goto-deck-builder-new" class="button-primary">Gerenciar Decks</button>
                    </div>
                </div>
            </div>

             <!-- Overlay para Zoom da Imagem (pode ser global se preferir) -->
             <div id="image-zoom-overlay" class="image-zoom-overlay">
                 <img id="zoomed-image" src="" alt="Zoomed Card">
             </div>
        </div>
    `;
}