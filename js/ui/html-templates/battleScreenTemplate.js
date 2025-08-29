// js/ui/html-templates/battleScreenTemplate.js

export function generateBattleScreenHTML() {
    const deckCoverImage = 'assets/images/ui/card_cover.png'; // Corrigido o caminho que estava errado no log
    const graveyardPlaceholderImg = 'assets/images/ui/graveyard.png';

    return `
        <div id="battle-screen" class="screen battle-screen-layout">
            <!-- ===== ÁREA DO OPONENTE (ESTRUTURA ATUALIZADA) ===== -->
            <div class="player-area opponent">
                <div class="player-info">
                    <div class="player-main-details">
                        <div class="player-avatar">
                            <img id="opponent-avatar-img" src="assets/images/avatars/default.png" alt="Opponent Avatar">
                        </div>
                        <div class="player-identity">
                            <span id="opponent-name">Oponente</span>
                            <div class="player-resources">
                                <div class="resource life">
                                    ❤️ <span id="opponent-life">20</span>
                                </div>
                                <div class="resource mana">💎<span id="opponent-mana">0</span>/<span id="opponent-max-mana">0</span></div>
                            </div>
                        </div>
                    </div>
                    <div class="player-zones">
                        <div class="deck-zone" title="Deck do Oponente">
                            <img id="opponent-deck-img" src="${deckCoverImage}" alt="Deck Oponente" class="zone-image deck-image">
                            <div class="deck-count" id="opponent-deck-count">0</div>
                            <span>Deck</span>
                        </div>
                        <div class="graveyard-zone" title="Cemitério do Oponente">
                            <img id="opponent-graveyard-img" src="${graveyardPlaceholderImg}" alt="Cemitério Oponente" class="zone-image graveyard-image is-placeholder">
                            <div class="graveyard-count" id="opponent-graveyard-count">0</div>
                            <span>Cemitério</span>
                        </div>
                    </div>
                </div>
                <div class="hand opponent-hand-area">
                    <span>Mão Oponente: <span id="opponent-hand-count">0</span> cartas</span>
                    <div id="opponent-hand" class="card-zone"></div>
                </div>
                <div id="opponent-battlefield" class="battlefield card-zone"></div>
            </div>

            <!-- ===== ÁREA CENTRAL (SEM MUDANÇAS) ===== -->
            <div class="center-area"> 
                <ul id="game-log" class="game-log-container scrollable-list">
                    <li>Log da Partida:</li>
                </ul>
                <div class="center-column-content"> 
                    <div id="turn-info" class="turn-info turn-info-banner-styled">
                        Turno <span id="turn-number">1</span> – Fase:
                        <span id="phase-indicator">Mana</span>
                        (<span id="current-player-indicator">Turno Oponente</span>)
                    </div>
                    <div class="turn-controls">
                        <button id="btn-pass-phase" class="button-battle-base button-battle-proceed-phase">Passar Fase</button>
                        <button id="btn-end-turn" class="button-battle-base button-battle-end-turn">Finalizar Turno</button>
                        <button id="btn-discard-mana" class="button-battle-base button-battle-resource-gain">Descartar p/ Mana</button>
                        <button id="btn-cancel-discard" class="button-battle-base button-battle-cancel-action" style="display:none">Cancelar</button>
                        <button id="btn-confirm-attack" class="button-battle-base button-battle-confirm-action" style="display: none;">Confirmar Ataque</button>
                        <button id="btn-confirm-blocks" class="button-battle-base button-battle-confirm-defense" style="display: none;">Confirmar Bloqueios</button>
                    </div>
                    <div id="action-feedback" class="action-feedback-area"></div>
                </div> 
            </div>
            
            <!-- ===== ÁREA DO JOGADOR LOCAL (ESTRUTURA ATUALIZADA) ===== -->
            <div class="player-area local-player">
                <div id="player-battlefield" class="battlefield card-zone"></div>
                <div id="player-hand" class="hand card-zone"></div>
                <div class="player-info">
                     <div class="player-main-details">
                        <div class="player-avatar">
                            <img id="player-avatar-img" src="assets/images/avatars/default.png" alt="Player Avatar">
                        </div>
                        <div class="player-identity">
                            <span id="player-name">Você</span>
                            <div class="player-resources">
                                <div class="resource life">
                                    ❤️ <span id="player-life">20</span>
                                </div>
                                <div class="resource mana">💎<span id="player-mana">0</span>/<span id="player-max-mana">0</span></div>
                            </div>
                        </div>
                    </div>
                    <div class="player-zones">
                        <div class="deck-zone" title="Seu Deck">
                            <img id="player-deck-img" src="${deckCoverImage}" alt="Seu Deck" class="zone-image deck-image">
                            <div class="deck-count" id="player-deck-count">0</div>
                            <span>Deck</span>
                        </div>
                        <div class="graveyard-zone" title="Seu Cemitério">
                            <img id="player-graveyard-img" src="${graveyardPlaceholderImg}" alt="Seu Cemitério" class="zone-image graveyard-image is-placeholder">
                            <div class="graveyard-count" id="player-graveyard-count">0</div>
                            <span>Cemitério</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="battle-image-zoom-overlay" class="image-zoom-overlay">
                <img id="battle-zoomed-image" src="" alt="Zoomed Card">
            </div>
            <div id="game-over-overlay" class="game-over-overlay">
                <div> 
                    <div id="game-over-message">Fim de Jogo!</div>
                    <button id="btn-back-to-profile" class="button-battle-base button-battle-neutral">Voltar ao Perfil</button>
                </div>
            </div>
        </div>
    `;
}