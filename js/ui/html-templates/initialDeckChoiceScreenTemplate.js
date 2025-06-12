// js/ui/html-templates/initialDeckChoiceScreenTemplate.js
export function generateInitialDeckChoiceScreenHTML() {
    // Caminhos para as imagens dos decks. Ajuste se necessário.
    const ashkarDeckImg = 'assets/images/ui/Ashkar_deck.png';
    const galadrethDeckImg = 'assets/images/ui/Galadreth_deck.png';

    return `
        <div id="initial-deck-choice-screen" class="screen initial-deck-choice-layout">
            <h2>Qual caminho irá trilhar?</h2>
            <div class="deck-selection-area">
                <!-- Deck Esquerdo -->
                <div class="deck-choice-option" data-deck-id="ashkar_starter">
                    <h3>🔥 Círculo de Ashkar</h3>
                    <img src="${ashkarDeckImg}" alt="Deck Círculo de Ashkar">
                    
                    <p>Domine o caos. Controle as chamas do destino.
Desperte o poder primordial do fogo com o Círculo de Ashkar. Este deck invoca criaturas ardentes e feitiços devastadores para destruir tudo em seu caminho. Ideal para jogadores que preferem uma abordagem ofensiva, com ataques rápidos, explosivos e controle do campo por pura intimidação mágica.
Assuma o papel de um mestre do caos e molde o campo de batalha com pura destruição. A ofensiva é sua melhor defesa.</p>
                </div>

                <!-- Deck Direito -->
                <div class="deck-choice-option" data-deck-id="galadreth_starter">
                    <h3>🌿 Ordem de Galadreth</h3>
                    <img src="${galadrethDeckImg}" alt="Deck Ordem de Galadreth">
                    
                    <p>Proteja a vida. Cresça com sabedoria. Vença com equilíbrio.
Mergulhe na harmonia da natureza com a Ordem de Galadreth. Este deck oferece uma combinação estratégica de criaturas resilientes, magias de cura e feitiços de proteção. Perfeito para quem aprecia o jogo tático e o crescimento constante no campo, vencendo não pela pressa, mas pela perseverança e sinergia entre as forças naturais.
Erga-se como guardião da vida e triunfe com elegância e determinação. O equilíbrio é sua maior arma.</p>
                </div>
            </div>

            <div class="deck-details-area" style="display: none;">
                <h3 id="chosen-deck-name"></h3>
                <div id="chosen-deck-card-list" class="card-grid-mini scrollable-list">
                    <!-- Mini-cards do deck escolhido aqui -->
                </div>
                <div class="deck-choice-actions">
                    <button id="btn-confirm-deck-choice">Escolher Este Deck</button>
                    <button id="btn-back-to-deck-selection">Voltar à Seleção</button>
                </div>
            </div>
        </div>
    `;
}