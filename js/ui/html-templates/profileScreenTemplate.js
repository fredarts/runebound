// js/ui/html-templates/profileScreenTemplate.js

/**
 * Gera a string HTML para a Tela de Perfil do Jogador.
 * ATUALIZADO: Removeu seção de decks e coleção.
 * @returns {string} HTML da tela de perfil.
 */
export function generateProfileScreenHTML() {
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
        <div id="profile-screen" class="screen profile-layout-single-column"> <!-- Ajuste o layout CSS -->
            <h2>Perfil do Jogador</h2>

            <div class="profile-main-area">
                <!-- Conteúdo fica em uma única coluna agora -->
                <div class="profile-section profile-info">
                    <h3>Informações</h3>
                    <p>Nome: <strong id="profile-username">(Carregando...)</strong></p>
                    <p>Rank: <span id="profile-rank">N/A</span></p>
                    <p>Vitórias/Derrotas: <span id="profile-wins">0</span> / <span id="profile-losses">0</span></p>
                </div>

                <div class="profile-section profile-avatar-section">
                    <h3>Avatar</h3>
                    <div class="profile-avatar-display">
                        <img id="profile-avatar-img" src="${avatarPath}default.png" alt="Avatar do Jogador">
                    </div>
                    <div id="profile-avatar-choices" class="avatar-choices-container">
                        ${avatarChoicesHTML}
                    </div>
                </div>

                <div class="profile-section profile-history">
                     <h3>Histórico de Partidas (Últimas 10)</h3>
                     <ul id="profile-match-history" class="scrollable-list">
                         <li>(Nenhum histórico ainda)</li>
                         <!-- O histórico será preenchido -->
                     </ul>
                </div>
                <!-- Seção de Decks e Coleção REMOVIDA -->

            </div>

             <!-- Overlay de Zoom não é mais necessário aqui se a coleção foi movida -->
             <!-- <div id="image-zoom-overlay" class="image-zoom-overlay"> ... </div> -->
        </div>
    `;
}