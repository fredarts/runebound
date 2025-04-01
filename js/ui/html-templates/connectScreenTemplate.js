// js/ui/html-templates/connectScreenTemplate.js

/**
 * Gera a string HTML para a Tela de Conexão/Criação de Partida.
 * Contém lógica simulada para criar/entrar em jogos.
 * @returns {string} HTML da tela de conexão.
 */
export function generateConnectScreenHTML() {
    // A lógica real de rede não está aqui, apenas a estrutura da UI
    return `
        <div id="connect-screen" class="screen connect-layout">
        <img class="connect-logo" src="assets/images/ui/runebound_logo.png" alt="Runebound Clash Logo" class="title-logo">
            <h2>Conectar e Jogar</h2>
            

            <div class="connect-options">
                <!-- Opção 1: Criar um Jogo (Simulado) -->
                <div class="connect-section">
                    <h3>Criar Partida</h3>
                    <img class="connect-host" src="assets/images/ui/host.png" alt="Runebound Clash Logo" class="title-logo">
                    <button id="btn-create-server">Criar Jogo (Host)</button>

                    <div id="server-status-section" style="display: none; margin-top: 15px; padding: 10px; border: 1px solid #ccc;">
                        <p>Status: <strong id="server-ip-code">Aguardando conexão...</strong></p>
                        <p>(Aguardando oponente...)</p>
                        <button id="btn-cancel-hosting">Cancelar Criação</button>
                    </div>
                </div>

                <!-- Opção 2: Entrar em um Jogo (Simulado) -->
                <div class="connect-section">
                    <h3>Entrar em Partida</h3>
                    <img class="connect-join" src="assets/images/ui/join.png" alt="Runebound Clash Logo" class="title-logo">
                    <button id="btn-show-join-options">Procurar Jogo (Join)</button>

                    <div id="join-game-section" style="display: none; margin-top: 15px;" class="form-container">
                         <div class="form-group">
                            <label for="opponent-ip">Código/IP do Host:</label>
                            <input type="text" id="opponent-ip" placeholder="Insira o código">
                        </div>
                         <div class="form-actions">
                            <button id="btn-connect-to-server">Conectar</button>
                            <!-- Poderia ter um botão para cancelar/voltar -->
                        </div>
                    </div>
                </div>
            </div>

            <p id="connect-message" class="message" style="margin-top: 20px;"></p>

            <div class="connect-actions">
                <button id="btn-connect-back-to-main">Voltar ao Perfil</button>
            </div>

            <!-- Futuro: Lista de Jogos Abertos/Amigos Online -->

        </div>
    `;
}