// js/ui/html-templates/battleScreenTemplate.js
// 18‑abr‑2025 – deck & cemitério agora ficam junto do avatar/vida/mana

/**
 * Gera a string HTML para a Tela de Batalha.
 * Deck + Cemitério foram movidos para dentro de .player‑info
 * (abaixo dos stats) para ficarem “grudados” ao avatar.
 */
export function generateBattleScreenHTML() {
    const deckCoverImage          = 'assets/images/cards/card_cover.png';
    const graveyardPlaceholderImg = 'assets/images/ui/graveyard.png';

    return `
        <div id="battle-screen" class="screen battle-screen-layout">

            <!-- =================== OPONENTE (TOPO) =================== -->
            <div class="player-area opponent">
                <div class="player-info">
                    <!-- Avatar -->
                    <div class="player-avatar">
                        <img id="opponent-avatar-img"
                             src="assets/images/avatars/default.png"
                             alt="Opponent Avatar">
                    </div>

                    <!-- Vida / Mana / Nome -->
                    <div class="player-stats">
                        <span id="opponent-name">Oponente</span>
                        <div class="resource life">
                            ❤️ <span id="opponent-life">20</span>
                        </div>
                        <div class="resource mana">
                            💧 <span id="opponent-mana">0</span>/<span id="opponent-max-mana">0</span>
                        </div>
                    </div>

                    <!-- Deck & Cemitério (agora internos) -->
                    <div class="player-zones">
                        <div class="deck-zone" title="Deck do Oponente">
                            <img id="opponent-deck-img"
                                 src="${deckCoverImage}"
                                 alt="Deck Oponente"
                                 class="zone-image deck-image">
                            <div class="deck-count" id="opponent-deck-count">30</div>
                            <span>Deck</span>
                        </div>

                        <div class="graveyard-zone" title="Cemitério do Oponente">
                            <img id="opponent-graveyard-img"
                                 src="${graveyardPlaceholderImg}"
                                 alt="Cemitério Oponente"
                                 class="zone-image graveyard-image is-placeholder">
                            <div class="graveyard-count" id="opponent-graveyard-count">0</div>
                            <span>Cemitério</span>
                        </div>
                    </div>
                </div>

                <!-- Mão do oponente -->
                <div class="hand opponent-hand-area">
                    <span>Mão Oponente: <span id="opponent-hand-count">0</span> cartas</span>
                    <div id="opponent-hand" class="card-zone"></div>
                </div>

                <!-- Campo do oponente -->
                <div id="opponent-battlefield" class="battlefield"></div>
            </div>

            <!-- =================== ÁREA CENTRAL =================== -->
            <div class="center-area">
                <ul id="game-log"        class="game-log-container       scrollable-list"></ul>
                <div id="turn-info"      class="turn-info">
                    Turno <span id="turn-number">1</span> – Fase:
                    <span id="phase-indicator">Mana</span>
                    (<span id="current-player-indicator">Turno Oponente</span>)
                </div>

                <!-- Controles -->
                <div class="turn-controls">
                    <button id="btn-pass-phase">Passar Fase</button>
                    <button id="btn-end-turn">Finalizar Turno</button>
                    <button id="btn-discard-mana">Descartar p/ Mana</button>
                    <button id="btn-confirm-attack">Confirmar Ataque</button>
                    <button id="btn-confirm-blocks">Confirmar Bloqueios</button>
                </div>

                <div id="action-feedback" class="action-feedback-area"></div>
            </div>

            <!-- =================== JOGADOR LOCAL (BASE) =================== -->
            <div class="player-area local-player">
                <!-- Campo do jogador -->
                <div id="player-battlefield" class="battlefield"></div>

                <!-- Mão do jogador -->
                <div id="player-hand" class="hand card-zone"></div>

                <!-- Avatar + Stats + Deck/Cemitério -->
                <div class="player-info">
                    <div class="player-avatar">
                        <img id="player-avatar-img"
                             src="assets/images/avatars/default.png"
                             alt="Player Avatar">
                    </div>

                    <div class="player-stats">
                        <span id="player-name">Você</span>
                        <div class="resource life">
                            ❤️ <span id="player-life">20</span>
                        </div>
                        <div class="resource mana">
                            💧 <span id="player-mana">0</span>/<span id="player-max-mana">0</span>
                        </div>
                    </div>

                    <div class="player-zones">
                        <div class="deck-zone" title="Seu Deck">
                            <img id="player-deck-img"
                                 src="${deckCoverImage}"
                                 alt="Seu Deck"
                                 class="zone-image deck-image">
                            <div class="deck-count" id="player-deck-count">30</div>
                            <span>Deck</span>
                        </div>

                        <div class="graveyard-zone" title="Seu Cemitério">
                            <img id="player-graveyard-img"
                                 src="${graveyardPlaceholderImg}"
                                 alt="Seu Cemitério"
                                 class="zone-image graveyard-image is-placeholder">
                            <div class="graveyard-count" id="player-graveyard-count">0</div>
                            <span>Cemitério</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ============ OVERLAYS ============ -->
            <div id="battle-image-zoom-overlay" class="image-zoom-overlay">
                <img id="battle-zoomed-image" src="" alt="Zoomed Card">
            </div>

            <div id="game-over-overlay" class="game-over-overlay">
                <div id="game-over-message">Fim de Jogo!</div>
                <button id="btn-back-to-profile">Voltar ao Perfil</button>
            </div>
        </div>
    `;
}
