// js/ui/html-templates/titleScreenTemplate.js

class TitlescreenTemplate {
    static getHtml() {
        const titleScreenContent = `
            <div class="title-logo">
                <img src="assets/images/ui/runebound_logo.png" alt="Logo do Jogo">
            </div>
            <nav class="title-menu">
                <button class="button-login-base button-login-primary" data-action="login">Logar</button>
                <button class="button-login-base button-login-secondary" data-action="create-account">Criar Conta</button>
                <button class="no-background" data-action="settings">⚙️</button>
            </nav>
        `;
        
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

export function generateTitleScreenHTML() {
    return TitlescreenTemplate.getHtml();
}