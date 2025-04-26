// js/ui/helpers/CardRenderer.js - CORRECTED

export default class CardRenderer {

    /**
     * Gera o HTML para uma carta no tamanho de batalha.
     * @param {object} cardData - Os dados da carta (resultado de getRenderData() ou definição).
     * @param {string} [location='hand'] - A localização atual (afeta classes/atributos).
     * @returns {jQuery|null} Objeto jQuery representando a carta ou null.
     */
    renderCard(cardData, location = 'hand') {
        if (!cardData) return null;
        const cardClass = 'card';
        const uniqueIdAttr = cardData.uniqueId ? `data-card-unique-id="${cardData.uniqueId}"` : '';
        const baseIdAttr = cardData.id ? `data-card-id="${cardData.id}"` : ''; // Check if id exists
        const cardName = cardData.name || 'Unknown Card';
        const imageSrc = cardData.imageSrc || cardData.image_src || 'assets/images/cards/default.png';

        // Tooltip
        const tooltipParts = [
            `${cardName} [${cardData.cost ?? '?'}]`,
            `${cardData.type}${cardData.tribe ? ` - ${cardData.tribe}` : ''}`,
        ];
        if (cardData.attack !== undefined) {
             const baseAttack = cardData.baseAttack ?? cardData.attack ?? '?';
             const baseToughness = cardData.baseToughness ?? cardData.toughness ?? '?';
             tooltipParts.push(` ${baseAttack}/${baseToughness}`);
        }
        tooltipParts.push(cardData.description || cardData.effectText || '');
        const tooltip = tooltipParts.join('\n').replace(/"/g, '"');

        // Estrutura HTML
        let cardHtml = `<div class="${cardClass} ${cardData.type?.toLowerCase() || ''}"
                           ${uniqueIdAttr} ${baseIdAttr}
                           title="${tooltip}"
                           style="background-image: url('${imageSrc}')">`;

        // Overlays
        cardHtml += `<div class="card-overlay card-cost">${cardData.cost ?? '?'}</div>`;
        cardHtml += `<div class="card-overlay card-name">${cardName}</div>`;
        if (cardData.type === 'Creature') {
            const displayAttack = cardData.attack ?? '?';
            const displayToughness = cardData.currentToughness ?? cardData.toughness ?? '?';
            cardHtml += `<div class="card-overlay card-stats">
                            <span class="card-attack">${displayAttack}</span>/<span class="card-toughness">${displayToughness}</span>
                         </div>`;
        }
        cardHtml += `</div>`;
        const $card = $(cardHtml);
        $card.data('card-name', cardName);

        // Apply visual state classes
        $card.toggleClass('tapped', !!cardData.isTapped);
        $card.toggleClass('has-summoning-sickness', !!cardData.hasSummoningSickness);
        $card.toggleClass('cannot-act', !(cardData.canAttack ?? true));
        if(cardData.statusEffects) {
            $card.toggleClass('shielded', !!cardData.statusEffects['shielded']);
            $card.toggleClass('silenced', !!cardData.statusEffects['silenced'] || !!cardData.statusEffects['cant_attack']);
        }

        return $card;
    }

    /**
     * Gera o HTML para uma mini-carta (Coleção, Deck Builder).
     * CORRIGIDO: Garante que 'quantity' seja sempre um número.
     * @param {object} cardDefinition - A definição da carta do cardDatabase.
     * @param {string} [location='collection'] - 'collection' ou 'deck'.
     * @param {number} [quantityParam=0] - Quantidade desta carta possuída.
     * @returns {jQuery|null} Objeto jQuery representando a mini-carta ou null.
     */
    renderMiniCard(cardDefinition, location = 'collection', quantityParam = 0) {
        // --- CORREÇÃO: Garantir que quantity seja numérico ---
        const quantity = Number(quantityParam) || 0;
        // ----------------------------------------------------

        if (!cardDefinition || !cardDefinition.id) {
             console.warn("CardRenderer: Invalid cardDefinition passed to renderMiniCard", cardDefinition);
             return null;
        }

        const cardClass = 'mini-card';
        const locationClass = location === 'deck' ? 'in-deck' : 'in-collection';
        const baseIdAttr = `data-card-id="${cardDefinition.id}"`;
        const cardName = cardDefinition.name || 'Unknown Card';
        const imageSrc = cardDefinition.image_src || 'assets/images/cards/default.png';

        // Tooltip
        const tooltipParts = [
            `${cardName} [${cardDefinition.cost ?? '?'}]`,
            `${cardDefinition.type}${cardDefinition.tribe ? ` - ${cardDefinition.tribe}` : ''}`,
        ];
        if (cardDefinition.attack !== undefined) {
            tooltipParts.push(` ${cardDefinition.attack}/${cardDefinition.toughness}`);
        }
        tooltipParts.push(cardDefinition.description || cardDefinition.effect || '');
        const tooltip = tooltipParts.join('\n').replace(/"/g, '"');

        // Usa a variável 'quantity' corrigida
        const quantityCounterHTML = quantity > 0
            ? `<div class="mini-card-quantity">x${quantity}</div>`
            : '';

        const $card = $(`
            <div class="${cardClass} ${locationClass}"
                 ${baseIdAttr}
                 title="${tooltip}"
                 style="background-image: url('${imageSrc}')">
                 <div class="card-name-overlay">${cardName}</div>
                 ${quantityCounterHTML}
             </div>`);

        $card.data('card-name', cardName);
        if (quantity > 0) {
            $card.data('card-quantity', quantity);
        }
        return $card;
    }
}