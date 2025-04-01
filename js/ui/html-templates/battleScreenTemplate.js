// js/ui/html-templates/battleScreenTemplate.js

/**
 * Gera a string HTML para a Tela de Batalha principal.
 * @returns {string} HTML da tela de batalha.
 */
export function generateBattleScreenHTML() {
    // --- CAMINHO DAS IMAGENS ---
    const deckCoverImage = 'assets/images/cards/card_cover.png';
    const graveyardPlaceholderImage = 'assets/images/ui/graveyard.png'; // Certifique-se que esta imagem existe no caminho

    return `
        <div id="battle-screen" class="screen battle-screen-layout">

            <!-- Área do Oponente (Topo) -->
            <div class="player-area opponent">
                <div class="player-info">
                    <div class="player-avatar">
                         <img id="opponent-avatar-img" src="assets/images/avatars/default.png" alt="Opponent Avatar">
                    </div>
                    <div class="player-stats">
                        <span id="opponent-name">Oponente</span>
                        <div class="resource life">❤️ <span id="opponent-life">20</span></div>
                        <div class="resource mana">💧 <span id="opponent-mana">0</span>/<span id="opponent-max-mana">0</span></div>
                    </div>
                </div>
                <div class="hand opponent-hand-area">
                    <span>Mão Oponente: <span id="opponent-hand-count">0</span> cartas</span>
                    <div id="opponent-hand" class="card-zone">
                        <!-- Cartas escondidas ou contagem -->
                    </div>
                </div>
                 <div class="player-zones">
                     
                     <div class="deck-zone" title="Deck do Oponente">
                         <img id="opponent-deck-img" src="${deckCoverImage}" alt="Deck Oponente" class="zone-image deck-image"> {/* <-- Imagem do Deck Adicionada */}
                         <div class="deck-count" id="opponent-deck-count">0</div>
                         <span>Deck</span>
                     </div>
                    
                     <div class="graveyard-zone" title="Cemitério do Oponente">
                         <img id="opponent-graveyard-img" src="${graveyardPlaceholderImage}" alt="Cemitério Oponente" class="zone-image graveyard-image"> {/* <-- Imagem do Cemitério Adicionada */}
                         <div class="graveyard-count" id="opponent-graveyard-count">0</div>
                         <span>Cemitério</span>
                     </div>
                 </div>
                <div id="opponent-battlefield" class="battlefield card-zone">
                    <!-- Criaturas e Runebindings do oponente -->
                </div>
            </div>

            <!-- Área Central (Controles, Log) -->
            <div class="center-area">
                <div class="game-log-container scrollable-list">
                    <ul id="game-log" class="game-log">
                        <li>Log da Partida:</li>
                        <!-- Mensagens serão adicionadas aqui -->
                    </ul>
                </div>
                <div class="turn-info">
                    Turno <span id="turn-number">1</span> - Fase: <span id="phase-indicator">Mana</span>
                    (<span id="current-player-indicator">Jogador</span>)
                </div>
                 <div class="turn-controls">
                    <button id="btn-pass-phase">Passar Fase</button>
                    <button id="btn-end-turn">Finalizar Turno</button>
                    <button id="btn-discard-mana" title="Descartar 1 carta para ganhar +1 Mana Máx (1x por turno)">Descartar p/ Mana</button>
                    <!-- Botões de combate serão adicionados/mostrados pelo UIManager -->
                    <button id="btn-confirm-attack" style="display: none;">Confirmar Ataque</button>
                    <button id="btn-confirm-blocks" style="display: none;">Confirmar Bloqueios</button>
                </div>
                <div id="action-feedback" class="action-feedback-area">
                    <!-- Mensagens como "Selecione um alvo", "Descartar X", etc. -->
                </div>
            </div>

            <!-- Área do Jogador (Baixo) -->
            <div class="player-area local-player">
                 <div id="player-battlefield" class="battlefield card-zone">
                    <!-- Criaturas e Runebindings do jogador -->
                </div>
                 <div class="player-zones">
                     
                      <div class="deck-zone" title="Seu Deck">
                          <img id="player-deck-img" src="${deckCoverImage}" alt="Seu Deck" class="zone-image deck-image"> {/* <-- Imagem do Deck Adicionada */}
                          <div class="deck-count" id="player-deck-count">0</div>
                          <span>Deck</span>
                      </div>
                      
                      <div class="graveyard-zone" title="Seu Cemitério">
                           <img id="player-graveyard-img" src="${graveyardPlaceholderImage}" alt="Seu Cemitério" class="zone-image graveyard-image"> {/* <-- Imagem do Cemitério Adicionada */}
                           <div class="graveyard-count" id="player-graveyard-count">0</div>
                           <span>Cemitério</span>
                      </div>
                 </div>
                <div id="player-hand" class="hand card-zone">
                    <!-- Suas cartas na mão -->
                </div>
                 <div class="player-info">
                     <div class="player-avatar">
                         <img id="player-avatar-img" src="assets/images/avatars/default.png" alt="Player Avatar">
                     </div>
                     <div class="player-stats">
                        <span id="player-name">Você</span>
                        <div class="resource life">❤️ <span id="player-life">20</span></div>
                        <div class="resource mana">💧 <span id="player-mana">0</span>/<span id="player-max-mana">0</span></div>
                    </div>
                </div>
            </div>

            <!-- Overlay para Zoom da Imagem de Carta -->
            <div id="battle-image-zoom-overlay" class="image-zoom-overlay">
                 <img id="battle-zoomed-image" src="" alt="Zoomed Card">
             </div>

             <!-- Overlay para Confirmação/Resultado do Jogo -->
             <div id="game-over-overlay" class="game-over-overlay">
                 <div id="game-over-message">Fim de Jogo!</div>
                 <button id="btn-back-to-profile">Voltar ao Perfil</button>
             </div>

        </div>
    `;
}