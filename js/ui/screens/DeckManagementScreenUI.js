// js/ui/screens/DeckManagementScreenUI.js

import CardRenderer from '../helpers/CardRenderer.js';
import ZoomHandler from '../helpers/ZoomHandler.js';

export default class DeckManagementScreenUI {
    #screenManager;
    #accountManager;
    #cardDatabase;
    #cardRenderer;
    #zoomHandler;
    #uiManager; // Para navegação

    // --- Elementos da UI ---
    #screenElement;
    #deckListElement;
    #collectionElement;
    #collectionCountSpan;
    #messageParagraph;
    #filterNameInput;
    #filterTypeSelect;
    #filterCostSelect;
    #filterTribeSelect;

    constructor(screenManager, accountManager, cardDatabase, cardRenderer, zoomHandler, uiManager) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;
        this.#cardRenderer = cardRenderer;
        this.#zoomHandler = zoomHandler;
        this.#uiManager = uiManager;

        this._cacheSelectors();
        if (!this.#screenElement || !this.#screenElement.length) {
            console.error("DeckManagementScreenUI Error: Element #deck-management-screen not found!");
            return;
        }
        this._bindEvents();
        console.log("DeckManagementScreenUI initialized.");
    }

    _cacheSelectors() {
        this.#screenElement = $('#deck-management-screen');
        this.#deckListElement = this.#screenElement.find('#deck-management-list');
        this.#collectionElement = this.#screenElement.find('#deck-management-collection');
        this.#collectionCountSpan = this.#screenElement.find('#deck-mgmt-collection-count');
        this.#messageParagraph = this.#screenElement.find('#deck-mgmt-message');
        // Filtros
        this.#filterNameInput = this.#screenElement.find('#deck-mgmt-filter-name');
        this.#filterTypeSelect = this.#screenElement.find('#deck-mgmt-filter-type');
        this.#filterCostSelect = this.#screenElement.find('#deck-mgmt-filter-cost');
        this.#filterTribeSelect = this.#screenElement.find('#deck-mgmt-filter-tribe');
    }

    _bindEvents() {
        console.log("DeckManagementScreenUI: Binding events...");

        // Botões na lista de decks (delegação)
        this.#deckListElement.on('click', '.btn-edit-deck', this._handleEditDeck.bind(this));
        this.#deckListElement.on('click', '.btn-delete-deck', this._handleDeleteDeck.bind(this));

        // Botão Criar Novo Deck
        this.#screenElement.on('click', '#btn-create-new-deck', this._handleCreateNewDeck.bind(this));

        // Filtros
        this.#screenElement.on('input', '#deck-mgmt-filter-name', this._handleFilterChange.bind(this));
        this.#screenElement.on('change', '#deck-mgmt-filter-type, #deck-mgmt-filter-cost, #deck-mgmt-filter-tribe', this._handleFilterChange.bind(this));

        // Zoom na Coleção (delegação ao ZoomHandler)
        this.#collectionElement.on('contextmenu', '.mini-card', (event) => {
            this.#zoomHandler.handleZoomClick(event);
        });
        this.#collectionElement.on('contextmenu', '.mini-card', (e) => e.preventDefault()); // Prevenir menu contexto

        // Fechar Zoom Overlay específico (se houver um específico)
        $('#deck-management-zoom-overlay').off('click.deckmgmtzoom').on('click.deckmgmtzoom', (event) => {
            if (event.target === event.currentTarget) {
                this.#zoomHandler.closeZoom();
            }
        });

        // Botão Voltar (se existir um no template)
        // this.#screenElement.on('click', '#btn-deck-mgmt-back', () => {
        //     this.#screenManager.showScreen('home-screen'); // Ou onde quer que ele volte
        // });
    }

    /** Renderiza a tela buscando dados atuais */
    render() {
        console.log("DeckManagementScreenUI: Rendering...");
        this.#messageParagraph.text(''); // Limpa mensagens
        const currentUser = this.#accountManager.getCurrentUser();
        if (!currentUser) {
            console.warn("DeckManagementScreenUI: No user logged in.");
            this.#screenManager.showScreen('login-screen');
            return;
        }

        const collection = currentUser.collection || [];
        const decks = currentUser.decks || {};

        this._populateFilters(collection);
        this._renderDeckList(decks);
        this._renderCollection(collection); // Aplica filtros automaticamente
    }

    // --- Handlers de Eventos ---

    _handleCreateNewDeck() {
        console.log("DeckManagementScreenUI: Create new deck requested.");
        this.#uiManager.renderDeckBuilderScreen(); // Chama UIManager para preparar o DeckBuilder sem ID
        this.#screenManager.showScreen('deck-builder-screen');
    }

    _handleEditDeck(event) {
        const deckId = $(event.currentTarget).closest('li').data('deck-id');
        if (deckId) {
            console.log(`DeckManagementScreenUI: Edit deck requested: ${deckId}`);
            this.#uiManager.renderDeckBuilderScreen(deckId); // Chama UIManager para preparar o DeckBuilder com ID
            this.#screenManager.showScreen('deck-builder-screen');
        }
    }

    _handleDeleteDeck(event) {
        const $li = $(event.currentTarget).closest('li');
        const deckId = $li.data('deck-id');
        const deckName = $li.find('.deck-name').text().replace(/\(\d+\s*cartas?\)$/, '').trim(); // Extrai nome
        if (deckId && confirm(`Tem certeza que deseja excluir o deck "${deckName}"?`)) {
            const result = this.#accountManager.deleteDeck(deckId);
            if (result.success) {
                console.log(`DeckManagementScreenUI: Deck ${deckId} deleted.`);
                this._showMessage(`Deck "${deckName}" excluído.`, 'success');
                this.render(); // Re-renderiza a lista de decks
            } else {
                this._showMessage(`Erro ao excluir deck: ${result.message}`, 'error');
                console.error(`Error deleting deck: ${result.message}`);
            }
        }
    }

     _handleFilterChange() {
        this._renderCollection(this.#accountManager.getCollection() || []);
    }

    // --- Métodos de Renderização ---

    _renderDeckList(decks) {
        this.#deckListElement.empty();
        const deckIds = Object.keys(decks || {});
        if (!deckIds.length) {
            this.#deckListElement.append('<li>(Nenhum deck criado)</li>');
            return;
        }
        deckIds.forEach(id => {
            const deck = decks[id];
            if (deck) {
                 const cardCount = deck.cards?.length || 0;
                 const isValid = cardCount >= 30 && cardCount <= 40;
                 const validityClass = isValid ? 'deck-valid' : 'deck-invalid';
                 const validityText = isValid ? '' : ` (Inválido: ${cardCount})`; // Texto opcional de invalidade

                this.#deckListElement.append(`
                    <li data-deck-id="${id}">
                        <span class="deck-name ${validityClass}">${deck.name} (${cardCount} cartas)${validityText}</span>
                        <span class="deck-buttons">
                            <button class="btn-edit-deck" title="Editar Deck ${deck.name}">✏️</button>
                            <button class="btn-delete-deck" title="Excluir Deck ${deck.name}">🗑️</button>
                        </span>
                    </li>`);
            }
        });
        console.log(`DeckManagementScreenUI: Rendered ${deckIds.length} decks.`);
    }

    _populateFilters(collectionIds) {
        // Reusa a lógica de _populateFilters do DeckBuilderUI (pode ser extraída para um helper)
        this.#filterCostSelect.children('option:not(:first-child)').remove();
        this.#filterTribeSelect.children('option:not(:first-child)').remove();
        const costs = new Set(), tribes = new Set();
        collectionIds.forEach(id => {
             const cd = this.#cardDatabase[id];
             if(cd) {
                 costs.add(cd.cost >= 7 ? '7+' : cd.cost.toString());
                 if (cd.tribe && cd.tribe !== 'None') tribes.add(cd.tribe);
             }
        });
        // Adiciona opção para 'None' se não houver já
        if (!tribes.has('None')) tribes.add('None');

        [...costs].sort((a, b) => (a === '7+' ? Infinity : parseInt(a)) - (b === '7+' ? Infinity : parseInt(b)))
                  .forEach(c => this.#filterCostSelect.append(`<option value="${c}">${c}</option>`));
        [...tribes].sort()
                   .forEach(t => this.#filterTribeSelect.append(`<option value="${t}">${t === 'None' ? 'Sem Tribo' : t}</option>`));
    }

    _renderCollection(collectionIds) {
        this.#collectionElement.empty();
        this.#collectionCountSpan.text(collectionIds?.length || 0);

        if (!Array.isArray(collectionIds) || collectionIds.length === 0) {
            this.#collectionElement.append('<p class="placeholder-message">(Nenhuma carta na coleção)</p>');
            return;
        }

        const filterName = this.#filterNameInput.val().toLowerCase();
        const filterType = this.#filterTypeSelect.val();
        const filterCost = this.#filterCostSelect.val();
        const filterTribe = this.#filterTribeSelect.val();
        let cardsRendered = 0;

        collectionIds.forEach(id => {
            const cardDef = this.#cardDatabase[id];
            if (cardDef) {
                // Aplicar filtros
                if (filterName && !cardDef.name.toLowerCase().includes(filterName)) return;
                if (filterType && cardDef.type !== filterType) return;
                if (filterCost) {
                    if (filterCost === '7+' && cardDef.cost < 7) return;
                    if (filterCost !== '7+' && cardDef.cost.toString() !== filterCost) return;
                }
                 // Ajuste para filtro de Tribo "None"
                 const cardTribe = cardDef.tribe || 'None';
                 if (filterTribe && cardTribe !== filterTribe) return;

                const $miniCard = this.#cardRenderer.renderMiniCard(cardDef, 'collection');
                if ($miniCard) {
                    this.#collectionElement.append($miniCard);
                    cardsRendered++;
                }
            } else {
                console.warn(`DeckManagementScreenUI: Card ID '${id}' in collection not found in database.`);
            }
        });

         if (cardsRendered === 0 && collectionIds.length > 0) {
            this.#collectionElement.append('<p class="placeholder-message">(Nenhuma carta corresponde aos filtros)</p>');
        }

        console.log(`DeckManagementScreenUI: Rendered ${cardsRendered} collection cards.`);
    }

     _showMessage(text, type = 'info', duration = 3000) {
        const colorVar = type === 'success' ? '--success-color' : type === 'error' ? '--error-color' : '--info-color';
        this.#messageParagraph.text(text).css('color', `var(${colorVar}, #ccc)`); // Fallback color
        if (duration > 0) {
            setTimeout(() => {
                if (this.#messageParagraph.text() === text) { // Only clear if message is still the same
                    this.#messageParagraph.text('');
                }
            }, duration);
        }
    }
}