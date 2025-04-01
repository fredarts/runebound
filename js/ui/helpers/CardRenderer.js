// js/ui/helpers/CardRenderer.js

/**
 * Módulo Helper para renderizar o HTML das cartas.
 */
export default class CardRenderer {

    /**
     * Gera o HTML para uma carta no tamanho de batalha.
     * @param {object} cardData - Os dados da carta (resultado de getRenderData() ou definição).
     * @param {string} [location='hand'] - A localização atual (afeta classes/atributos).
     * @returns {jQuery|null} Objeto jQuery representando a carta ou null.
     */
    renderCard(cardData, location = 'hand') {
        if (!cardData) return null;
        const cardClass = 'card'; // Sempre .card para batalha
        const uniqueIdAttr = `data-card-unique-id="${cardData.uniqueId}"`; // Sempre adicionar uniqueId para instâncias de jogo
        const baseIdAttr = `data-card-id="${cardData.id}"`;
        const cardName = cardData.name || 'Unknown Card';
        const imageSrc = cardData.imageSrc || 'assets/images/cards/default.png';

        // Tooltip (mais detalhado para batalha)
        const tooltipParts = [
            `${cardName} [${cardData.cost ?? '?'}]`,
            `${cardData.type}${cardData.tribe ? ` - ${cardData.tribe}` : ''}`,
        ];
        if (cardData.attack !== undefined) { // Base Attack/Toughness da Definição para tooltip
             const baseAttack = cardData.baseAttack ?? cardData.attack ?? '?';
             const baseToughness = cardData.baseToughness ?? cardData.toughness ?? '?';
             tooltipParts.push(` ${baseAttack}/${baseToughness}`);
        }
        tooltipParts.push(cardData.description || cardData.effectText || '');
        const tooltip = tooltipParts.join('\n');

        // Estrutura HTML
        let cardHtml = `<div class="${cardClass} ${cardData.type?.toLowerCase() || ''}"
                           ${uniqueIdAttr} ${baseIdAttr}
                           title="${tooltip}"
                           style="background-image: url('${imageSrc}')">`;

        // Overlays (Cost, Name, Stats)
        cardHtml += `<div class="card-overlay card-cost">${cardData.cost ?? '?'}</div>`;
        cardHtml += `<div class="card-overlay card-name">${cardName}</div>`;
        if (cardData.type === 'Creature') {
            // Mostra stats ATUAIS (calculados) vindos de cardData.getRenderData()
            const displayAttack = cardData.attack ?? '?';
            const displayToughness = cardData.currentToughness ?? cardData.toughness ?? '?'; // Prefere currentToughness
            cardHtml += `<div class="card-overlay card-stats">
                            <span class="card-attack">${displayAttack}</span>/<span class="card-toughness">${displayToughness}</span>
                         </div>`;
        }
        // Adicionar indicadores visuais para status (tapped, sickness, etc.)
        // if (cardData.isTapped) cardHtml += `<div class="card-status-icon tapped-icon">↷</div>`;
        // if (cardData.hasSummoningSickness) cardHtml += `<div class="card-status-icon sickness-icon">🌀</div>`;

        cardHtml += `</div>`; // Fecha card div
        const $card = $(cardHtml);
        $card.data('card-name', cardName); // Armazena nome para fácil acesso
        // Aplicar classes de estado visual baseadas nos dados recebidos
        $card.toggleClass('tapped', !!cardData.isTapped);
        $card.toggleClass('has-summoning-sickness', !!cardData.hasSummoningSickness);
        $card.toggleClass('cannot-act', !(cardData.canAttack ?? true)); // Exemplo
        if(cardData.statusEffects) { $card.toggleClass('shielded', !!cardData.statusEffects['shielded']); $card.toggleClass('silenced', !!cardData.statusEffects['silenced'] || !!cardData.statusEffects['cant_attack']); }

        return $card;
    }

    /**
     * Gera o HTML para uma mini-carta (Coleção, Deck Builder).
     * @param {object} cardDefinition - A definição da carta do cardDatabase.
     * @param {string} [location='collection'] - 'collection' ou 'deck'.
     * @returns {jQuery|null} Objeto jQuery representando a mini-carta ou null.
     */
    renderMiniCard(cardDefinition, location = 'collection') {
        if (!cardDefinition) return null;
        const cardClass = 'mini-card';
        const locationClass = location === 'deck' ? 'in-deck' : 'in-collection';
        const baseIdAttr = `data-card-id="${cardDefinition.id}"`; // Mini cards só precisam do ID base
        const cardName = cardDefinition.name || 'Unknown Card';
        const imageSrc = cardDefinition.image_src || 'assets/images/cards/default.png';

        // Tooltip (pode ser igual ao renderCard ou simplificado)
        const tooltipParts = [
            `${cardName} [${cardDefinition.cost ?? '?'}]`,
            `${cardDefinition.type}${cardDefinition.tribe ? ` - ${cardDefinition.tribe}` : ''}`,
        ];
        if (cardDefinition.attack !== undefined) {
            tooltipParts.push(` ${cardDefinition.attack}/${cardDefinition.toughness}`);
        }
        tooltipParts.push(cardDefinition.description || cardDefinition.effect || '');
        const tooltip = tooltipParts.join('\n');

        // Estrutura HTML (background na div principal)
        const $card = $(`
            <div class="${cardClass} ${locationClass}"
                 ${baseIdAttr}
                 title="${tooltip}"
                 style="background-image: url('${imageSrc}')">
                 <div class="card-name-overlay">${cardName}</div>
                 <!-- Mini-cards geralmente não mostram stats diretamente -->
             </div>`);

        $card.data('card-name', cardName);
        return $card;
    }
}