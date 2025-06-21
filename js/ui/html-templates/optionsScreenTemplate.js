// js/ui/html-templates/optionsScreenTemplate.js - ATUALIZADO

/**
 * Gera a string HTML para a Tela de Opções.
 * ATUALIZADO: Adicionados checkboxes para Mute.
 * @returns {string} HTML da tela de opções.
 */
export function generateOptionsScreenHTML() {
    return `
        <div id="options-screen" class="screen options-layout">

            

            <div class="options-container scrollable-list">
                <h2>Opções do Jogo</h2>

                <fieldset class="options-group">
                    <legend>Áudio</legend>
                    <div class="option-item">
                        <label for="opt-music-volume">Volume da Música:</label>
                        <input type="range" id="opt-music-volume" min="0" max="100" step="1" value="80">
                        <span class="volume-value">80%</span>
                        </div>
                   
                    <div class="option-item">
                        <label for="opt-mute-music">Silenciar Música:</label>
                        <input type="checkbox" id="opt-mute-music">
                        </div>
                   
                    <div class="option-item">
                        <label for="opt-sfx-volume">Volume dos Efeitos:</label>
                        <input type="range" id="opt-sfx-volume" min="0" max="100" step="1" value="100">
                        <span class="volume-value">100%</span>
                        </div>
                   
                     <div class="option-item">
                         <label for="opt-mute-sfx">Silenciar Efeitos:</label>
                         <input type="checkbox" id="opt-mute-sfx">
                         </div>
                   
                </fieldset>

                <fieldset class="options-group">
                    <legend>Gráficos</legend>
                    
                     <div class="option-item">
                        <label for="opt-graphics-quality">Qualidade Gráfica:</label>
                        <select id="opt-graphics-quality">
                            <option value="low">Baixa</option>
                            <option value="medium" selected>Média</option>
                            <option value="high">Alta</option>
                        </select>
                    </div>
                    <div class="option-item">
                        <label for="opt-card-animations">Animações das Cartas:</label>
                        <input type="checkbox" id="opt-card-animations" checked>
                    </div>
                </fieldset>

                <fieldset class="options-group">
                    <legend>Interface</legend>
                   
                     <div class="option-item">
                        <label for="opt-language">Idioma:</label>
                        <select id="opt-language">
                            <option value="pt-BR" selected>Português (BR)</option>
                            <option value="en-US">English (US)</option>
                        </select>
                    </div>
                     <div class="option-item">
                        <label for="opt-text-size">Tamanho do Texto:</label>
                        <select id="opt-text-size">
                            <option value="small">Pequeno</option>
                            <option value="normal" selected>Normal</option>
                            <option value="large">Grande</option>
                        </select>
                    </div>
                     <div class="option-item">
                        <label for="opt-high-contrast">Alto Contraste:</label>
                        <input type="checkbox" id="opt-high-contrast">
                    </div>
                </fieldset>

            </div>

            <div class="options-actions form-actions">
                <button id="btn-save-options">Salvar Opções</button>
                <button id="btn-options-back-to-main">Voltar</button>
            </div>
             <p id="options-save-message" class="message" style="text-align: center; margin-top: 10px;"></p>
        </div>
    `;
}