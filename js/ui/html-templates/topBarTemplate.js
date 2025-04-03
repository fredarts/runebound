// js/ui/html-templates/topBarTemplate.js - ATUALIZADO

/**
 * Gera a string HTML para a Barra Superior (Top Bar).
 * Contém logo, nome do jogo, nome do usuário (direita) e botões de navegação.
 * @returns {string} HTML da Top Bar.
 */
export function generateTopBarHTML() {
    // Logo e Nome do Jogo adicionados à esquerda.
    // Nome do Usuário movido para a direita.
    return `
        <div id="top-bar" class=""> <!-- Começa sem a classe 'active' -->
            <div class="top-bar-left">
                <img src="assets/images/ui/logo_small_placeholder.png" alt="Runebound Clash Logo" class="top-bar-logo">
                <span class="top-bar-game-name">Runebound Clash</span>
            </div>
            <div class="top-bar-right">
                <!-- Nome do usuário vem ANTES dos botões na direita -->
                <span id="top-bar-username">Carregando...</span>

                <button id="top-bar-btn-home" title="Início / Notícias">
                     <span role="img" aria-label="Início">🏠</span>
                </button>

                <button id="top-bar-btn-profile" title="Perfil / Coleção">
                    <span role="img" aria-label="Perfil">👤</span>
                </button>
                   <!-- NOVO BOTÃO DE DECKS -->
                <button id="top-bar-btn-decks" title="Decks / Coleção">
                    <span role="img" aria-label="Decks">📚</span>
                </button>
                <!-- FIM NOVO BOTÃO -->
                <button id="top-bar-btn-connect" title="Conectar / Jogar Online">
                     <span role="img" aria-label="Jogar">⚔️</span>
                </button>
                 <button id="top-bar-btn-options" title="Opções do Jogo">
                     <span role="img" aria-label="Opções">⚙️</span>
                 </button>
                 <button id="top-bar-btn-logout" title="Sair da Conta">
                     <span role="img" aria-label="Sair">🚪</span>
                 </button>
            </div>
        </div>
    `;
}