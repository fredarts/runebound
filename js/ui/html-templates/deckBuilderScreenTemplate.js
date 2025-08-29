// js/ui/html-templates/deckBuilderScreenTemplate.js - ATUALIZADO

/**
 * Gera a string HTML para a Tela do Construtor de Decks.
 * ATUALIZADO: Texto do botão Voltar para refletir a navegação para a tela de gerenciamento.
 * Requer a biblioteca SortableJS para a funcionalidade de arrastar e soltar.
 * @returns {string} HTML da tela do construtor de decks.
 */
export function generateDeckBuilderScreenHTML() { // <<<--- Certifique-se que 'export' está aqui
    return `
        <div id="deck-builder-screen" class="screen deck-builder-layout">
            <h2 id="deck-builder-title">Construtor de Decks</h2>

            <!-- Área Superior: Nome do Deck e Controles Principais -->
            <div class="deck-builder-top-bar">
                <div class="form-group">
                    <label for="db-deck-name">Nome do Deck:</label>
                    <input type="text" id="db-deck-name" placeholder="Meu Novo Deck" maxlength="30">
                </div>
                <div class="deck-info">
                     <span id="db-deck-count">0</span>/60 cartas <!-- Contador principal na barra -->
                     <span id="db-deck-validity">(Inválido)</span> <!-- Status de validade -->
                </div>
                <div class="deck-actions">
                    <button id="btn-save-deck" disabled>Salvar Deck</button>
                    <button id="btn-clear-deck">Limpar Deck</button>
                    <!-- Texto do botão atualizado para refletir o destino -->
                    <button id="btn-deck-builder-back">Voltar aos Decks</button> <!-- ID permanece o mesmo, texto mudou -->
                </div>
            </div>
            <p id="deck-builder-message" class="message"></p> <!-- Mensagens de feedback -->

            <!-- Área Principal: Coleção e Deck Atual -->
            <div class="deck-builder-main-area">

                <!-- Painel Esquerdo: Coleção Disponível e Filtros -->
                <div class="deck-builder-panel collection-panel">
                    <h3>Coleção Disponível (<span id="db-collection-count">0</span>)</h3>
                    <div class="filters">
                        <input type="text" id="db-filter-name" placeholder="Filtrar por nome...">
                        <select id="db-filter-type">
                            <option value="">Tipo</option>
                            <option value="Creature">Criatura</option>
                            <option value="Runebinding">Runebinding</option>
                            <option value="Instant">Instantânea</option>
                        </select>
                        <select id="db-filter-cost">
                            <option value="">Custo</option>
                            <!-- Opções de custo preenchidas dinamicamente ou ter valores fixos -->
                            <option value="0">0</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                            <option value="6">6</option>
                            <option value="7">7+</option>
                        </select>
                        <select id="db-filter-tribe">
                            <option value="">Tribo</option>
                            <!-- Opções de tribo preenchidas dinamicamente ou ter valores fixos -->
                            <option value="Elf">Elfo</option>
                            <option value="Dwarf">Anão</option>
                            <option value="Beast">Besta</option>
                            <option value="Dragon">Dragão</option>
                            <option value="Undead">Morto-vivo</option>
                            <option value="Elemental">Elemental</option>
                            <option value="Human">Humano</option>
                            <option value="Construct">Construto</option>
                            <option value="Spirit">Espírito</option>
                            <option value="None">Nenhuma</option>
                        </select>
                    </div>
                    <div id="db-available-cards" class="card-list scrollable-list">
                        <!-- Mini-cards da coleção filtrada são renderizados aqui -->
                        <p class="placeholder-message">(Carregando coleção...)</p>
                    </div>
                </div>

                <!-- Painel Direito: Deck Atual Sendo Construído -->
                <div class="deck-builder-panel deck-panel">
                     <!-- Contador secundário dentro do painel -->
                    <h3>Deck Atual (<span id="db-deck-count-display">0</span>/60)</h3>
                    <p class="subtle-text">Arraste cartas aqui ou para fora.</p>
                     <div id="db-current-deck" class="card-list scrollable-list">
                        <!-- Mini-cards no deck atual são renderizados aqui -->
                         <p class="placeholder-message">(Arraste cartas da coleção para cá)</p>
                    </div>
                </div>

            </div>
             <!-- Overlay para Zoom da Imagem (específico ou global) -->
             <div id="deckbuilder-image-zoom-overlay" class="image-zoom-overlay">
                 <img id="deckbuilder-zoomed-image" src="" alt="Zoomed Card">
             </div>
        </div>
    `;
}