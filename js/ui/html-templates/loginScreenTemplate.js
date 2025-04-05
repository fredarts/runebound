// js/ui/html-templates/loginScreenTemplate.js - CORRIGIDO

/**
 * Gera a string HTML para a Tela de Login.
 * @returns {string} HTML da tela de login.
 */
// ---> ADICIONADO 'export' <---
export function generateLoginScreenHTML() {
    return `
        <div id="login-screen" class="screen">
            <img class="login-logo" src="assets/images/ui/runebound_logo.png" alt="Runebound Clash Logo" class="title-logo">
            <h2>LOGIN</h2>

            <form id="login-form" class="form-container">
                <div class="form-group">
                    <label for="login-username">Nome de Usuário:</label>
                    <input type="text" id="login-username" name="username" required>
                </div>
                <div class="form-group">
                    <label for="login-password">Senha:</label>
                    <input type="password" id="login-password" name="password" required>
                </div>
                <div class="form-actions">
                    <button type="submit">Entrar</button>
                    <button type="button" id="btn-login-back-to-title">Voltar</button>
                </div>
            </form>
            <p id="login-message" class="message"></p>
        </div>
    `;
}