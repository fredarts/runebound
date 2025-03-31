// js/ui/html-templates/splashScreenTemplate.js - ATUALIZADO

/**
 * Gera a string HTML para a Tela de Splash (Carregamento Inicial).
 * A imagem é definida como background no CSS.
 * A mensagem funciona como barra de progresso.
 * @returns {string} HTML da tela de splash.
 */
export function generateSplashScreenHTML() {
    return `
        <div id="splash-screen" class="screen active"> <!-- Começa ativa -->
            <!-- A imagem de fundo é aplicada via CSS -->
            <div class="splash-content"> <!-- Container para posicionar a mensagem -->
                 <p class="splash-message">Carregando Runebound...</p>
            </div>
        </div>
    `;
}