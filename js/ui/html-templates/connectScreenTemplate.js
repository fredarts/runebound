// js/ui/html-templates/connectScreenTemplate.js

export function generateConnectScreenHTML() {
    return `
        <div id="connect-screen" class="screen connect-layout">
            <img class="connect-logo" src="assets/images/ui/runebound_logo.png" alt="Runebound Clash Logo" class="title-logo">
            <h2>Conectar e Jogar</h2>
            
            <div class="connect-options">
                <!-- Opção 1: Criar um Jogo -->
                <div class="connect-section">
                    <h3>Criar Partida</h3>
                    <img class="connect-host" src="assets/images/ui/host.png" alt="Host Icon">
                    <button id="btn-create-server">Criar Jogo (vs. IA)</button>
                </div>

                <!-- Opção 2: Entrar em um Jogo -->
                <div class="connect-section">
                    <h3>Entrar em Partida</h3>
                    <img class="connect-join" src="assets/images/ui/join.png" alt="Join Icon">
                    <button id="btn-show-join-options">Procurar Jogo (Join)</button>
                    <div id="join-game-section" style="display: none;">
                        <div class="form-group">
                            <label for="opponent-ip">Código/IP do Host:</label>
                            <input type="text" id="opponent-ip" placeholder="Insira o código">
                        </div>
                        <div class="form-actions">
                            <button id="btn-connect-to-server">Conectar</button>
                        </div>
                    </div>
                </div>
            </div>

            <p id="connect-message" class="message"></p>

            <div class="connect-actions">
                <button id="btn-connect-back-to-main">Voltar</button>
            </div>

            <!-- O modal da IA foi removido daqui e agora é carregado globalmente pelo main.js -->

        </div>
    `;
}