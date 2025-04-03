// js/ui/html-templates/deckManagementScreenTemplate.js

/**
 * Gera a string HTML para a Tela de Gerenciamento de Decks e Coleção.
 * @returns {string} HTML da tela.
 */
export function generateDeckManagementScreenHTML() { 

    return `
        <div id="deck-management-screen" class="screen deck-management-layout">
            <h2>Gerenciar Decks e Coleção</h2>

            <div class="deck-management-main-area">

                <!-- Coluna Esquerda: Decks -->
                <div class="deck-management-left-column">
                    <div class="profile-section profile-decks">
                        <h3>Meus Decks</h3>
                         <ul id="deck-management-list" class="scrollable-list deck-list-profile">
                             <li>(Carregando decks...)</li>
                         </ul>
                         <button id="btn-create-new-deck" class="button-primary">Criar Novo Deck</button>
                         <p id="deck-mgmt-message" class="message" style="margin-top: 10px;"></p>
                    </div>
                </div>

                <!-- Coluna Direita: Coleção -->
                <div class="deck-management-right-column">
                     <div class="profile-section profile-collection">
                        <h3>Coleção (<span id="deck-mgmt-collection-count">0</span> cartas)</h3>

                        <!-- Filtros da Coleção -->
                        <div class="filters collection-filters">
                            <input type="text" id="deck-mgmt-filter-name" placeholder="Filtrar por nome...">
                            <select id="deck-mgmt-filter-type">
                                <option value="">Tipo</option>
                                <option value="Creature">Criatura</option>
                                <option value="Runebinding">Runebinding</option>
                                <option value="Instant">Instantânea</option>
                            </select>
                            <select id="deck-mgmt-filter-cost">
                                <option value="">Custo</option>
                                <!-- Opções preenchidas dinamicamente -->
                            </select>
                            <select id="deck-mgmt-filter-tribe">
                                <option value="">Tribo</option>
                                <!-- Opções preenchidas dinamicamente -->
                            </select>
                        </div>

                        <p class="subtle-text">Clique com o botão direito do mouse para ampliar a carta</p>
                        <div id="deck-management-collection" class="card-grid scrollable-list">
                            <p>(Carregando coleção...)</p>
                        </div>
                    </div>
                </div>
            </div>

             <!-- Overlay para Zoom da Imagem -->
             <div id="deck-management-zoom-overlay" class="image-zoom-overlay">
                 <img id="deck-management-zoomed-image" src="" alt="Zoomed Card">
             </div>

        </div>
    `;
}