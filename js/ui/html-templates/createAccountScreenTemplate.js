// js/ui/html-templates/createAccountScreenTemplate.js

/**
 * Gera a string HTML para a Tela de Criação de Conta.
 * @returns {string} HTML da tela de criação de conta.
 */
export function generateCreateAccountScreenHTML() {
    return `
        <div id="create-account-screen" class="screen">
        <img class="create-account-logo" src="assets/images/ui/runebound_logo.png" alt="Runebound Clash Logo" class="title-logo">
            <h2>CRIAR CONTA NOVA</h2>
            <form id="create-account-form" class="form-container">
                <div class="form-group">
                    <label for="create-username">Nome de Usuário (min 3):</label>
                    <input type="text" id="create-username" name="username" required minlength="3">
                </div>
                <div class="form-group">
                    <label for="create-password">Senha:</label>
                    <input type="password" id="create-password" name="password" required>
                    <!-- Poderia adicionar confirmação de senha se desejado -->
                    <!--
                    <label for="create-confirm-password">Confirmar Senha:</label>
                    <input type="password" id="create-confirm-password" name="confirm_password" required>
                    -->
                </div>
                <div class="form-actions">
                    <button type="submit">Criar Conta</button>
                    <button type="button" id="btn-create-back-to-title">Voltar</button>
                </div>
            </form>
            <p id="create-account-message" class="message"></p>
            
        </div>
    `;
}