// js/ui/html-templates/titleScreenTemplate.js - ATUALIZADO

/**
 * Gera a string HTML para a Tela de Título.
 * Inclui logo acima dos botões.
 * @returns {string} HTML da tela de título.
 */
export function generateTitleScreenHTML() {
    return `
        <div id="title-screen" class="screen active">
            <!-- Título Principal -->
            

            <!-- Logo Adicionado -->
            <img class="title-logo" src="assets/images/ui/runebound_logo.png" alt="Runebound Clash Logo" class="title-logo">

            <!-- Menu de Botões -->
            <div class="title-menu">
                <button id="btn-goto-login">Login</button>
                <button id="btn-goto-create-account">Criar Conta</button>
                <button id="btn-goto-options-icon" class="icon-button" title="Opções">⚙️</button>
            </div>

            <!-- Você pode adicionar mais elementos aqui, como links para créditos, patch notes, etc. -->
            <div class="title-footer">
                <a href="#">Créditos</a> | <a href="#">Versão 0.1.0</a>
            </div>
        </div>
    `;
}