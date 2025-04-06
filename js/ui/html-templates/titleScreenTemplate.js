// titleScreenTemplate.js
// Template para a tela de título, retornando a estrutura HTML completa da tela.

class TitlescreenTemplate {
    static getHtml() {
        // Conteúdo específico da tela de título (logo, botões, etc.)
        const titleScreenContent = `
            <div class="title-logo">
                <img src="assets/images/ui/runebound_logo.png" alt="Logo do Jogo">
            </div>
            <nav class="title-menu">
                <button class="game-button" data-action="login">Logar</button>
                <button class="game-button-blue"data-action="create-account">Criar Conta</button>
                <button class="no-background" data-action="settings">⚙️</button>
            </nav>
        `;
        
        // Estrutura completa da tela de título com um wrapper que possui o ID "title-screen" e a classe "screen"
        return `
            <div id="title-screen" class="screen">
                <div id="titlescreen-banner"></div>
                <div class="titlescreen-content">
                    ${titleScreenContent}
                </div>
            </div>
        `;
    }
}

// Exporta uma função que gera o HTML da tela de título para manter a consistência com os demais templates
export function generateTitleScreenHTML() {
    return TitlescreenTemplate.getHtml();
}
