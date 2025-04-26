// js/ui/screens/DeckManagementScreenUI.js - CORREÇÃO: Bind no Render

import CardRenderer from '../helpers/CardRenderer.js';
import ZoomHandler from '../helpers/ZoomHandler.js';

export default class DeckManagementScreenUI {
    // --- Core References ---
    #screenManager;
    #accountManager;
    #cardDatabase;
    #cardRenderer;
    #zoomHandler;
    #uiManager;
    #audioManager;

    // --- Elementos da UI (Cache) ---
    #screenElement;
    #deckListElement;
    #collectionElement;
    #collectionCountSpan;
    #messageParagraph;
    #filterNameInput;
    #filterTypeSelect;
    #filterCostSelect;
    #filterTribeSelect;
    #btnCreateNewDeck;

    _filtersPopulated = false; // Flag para popular filtros apenas uma vez

    constructor(screenManager, accountManager, cardDatabase, cardRenderer, zoomHandler, uiManager, audioManager) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;
        this.#cardRenderer = cardRenderer;
        this.#zoomHandler = zoomHandler;
        this.#uiManager = uiManager;
        this.#audioManager = audioManager;

        // Cache selectors immediately, but check existence in render/bind
        this._cacheSelectors();
        // REMOVED _bindEvents() from constructor
        console.log("DeckManagementScreenUI initialized.");
    }

    _cacheSelectors() {
        this.#screenElement = $('#deck-management-screen');
        if (!this.#screenElement.length) { console.warn("DeckMgmt Cache: Root element missing"); return false; }
        this.#deckListElement = this.#screenElement.find('#deck-management-list');
        this.#collectionElement = this.#screenElement.find('#deck-management-collection');
        this.#collectionCountSpan = this.#screenElement.find('#deck-mgmt-collection-count');
        this.#messageParagraph = this.#screenElement.find('#deck-mgmt-message');
        this.#filterNameInput = this.#screenElement.find('#deck-mgmt-filter-name');
        this.#filterTypeSelect = this.#screenElement.find('#deck-mgmt-filter-type');
        this.#filterCostSelect = this.#screenElement.find('#deck-mgmt-filter-cost');
        this.#filterTribeSelect = this.#screenElement.find('#deck-mgmt-filter-tribe');
        this.#btnCreateNewDeck = this.#screenElement.find('#btn-create-new-deck');
        return true; // Indicate success or failure? Maybe not needed here.
    }

    /** Renderiza a tela buscando dados atuais */
    render() {
        console.log("DeckManagementScreenUI: Rendering...");
        // Ensure selectors are cached (might be needed if view was destroyed/recreated)
        if (!this.#screenElement?.length) this._cacheSelectors();
        if (!this.#screenElement?.length) {
             console.error("DeckManagementScreenUI Render Error: Root element not found.");
             return;
        }

        this.#messageParagraph?.text('');

        const currentUser = this.#accountManager.getCurrentUser();
        if (!currentUser) {
            console.warn("DeckManagementScreenUI: No user logged in.");
            this.#uiManager?.navigateTo('login-screen');
            return;
        }

        const userFullCollection = this.#accountManager.getCollection() || [];
        const uniqueCollectionIds = [...new Set(userFullCollection)];
        const decks = this.#accountManager.loadDecks() || {};

        this._populateFilters(uniqueCollectionIds); // Popula com base nos únicos
        this._renderDeckList(decks);
        this._renderCollection(uniqueCollectionIds, userFullCollection);

        // --- MOVED BINDING HERE ---
        this._bindEvents();
        // --------------------------
    }

    _bindEvents() {
        // Check if root element exists before binding
        if (!this.#screenElement || !this.#screenElement.length) {
            console.warn("DeckManagementScreenUI: Cannot bind events, root element missing.");
            return;
        }
        console.log("DeckManagementScreenUI: Binding events...");
        const self = this;
        const namespace = '.deckmgmt'; // Namespace still useful for targeted unbinding

        // --- Clear old listeners using the namespace ---
        // Clear listeners delegated from the screen element
        this.#screenElement.off(namespace);
        // Clear listeners directly on specific elements if any (ensure these elements exist)
        this.#btnCreateNewDeck?.off(namespace);
        $('#deck-management-zoom-overlay')?.off(namespace); // Use optional chaining

        // Helper for audio
        const addAudio = ($el, click = 'buttonClick', hover = 'buttonHover') => {
            if (!$el || !$el.length) return; // Don't bind if element doesn't exist
            $el.off(`click${namespace} mouseenter${namespace}`); // Clear old audio listeners
            $el.on(`click${namespace}`, () => this.#audioManager?.playSFX(click));
            $el.on(`mouseenter${namespace}`, () => this.#audioManager?.playSFX(hover));
        };

        // --- Bind new ---

        // Buttons in deck list (delegated from screenElement)
        this.#screenElement.on(`click${namespace}`, '.btn-edit-deck', (event) => {
            this._handleEditDeck(event);
        });
        this.#screenElement.on(`click${namespace}`, '.btn-delete-deck', (event) => {
            this._handleDeleteDeck(event);
        });
        this.#screenElement.on(`mouseenter${namespace}`, '.btn-edit-deck, .btn-delete-deck', (event) => {
             this.#audioManager?.playSFX('buttonHover');
        });

        // Create New Deck Button
        addAudio(this.#btnCreateNewDeck); // Bind audio listeners
        this.#btnCreateNewDeck?.on(`click${namespace}`, this._handleCreateNewDeck.bind(this)); // Bind main click listener

        // Filters
        this.#screenElement.on(`input${namespace}`, '#deck-mgmt-filter-name', this._handleFilterChange.bind(this));
        this.#screenElement.on(`change${namespace}`, '#deck-mgmt-filter-type, #deck-mgmt-filter-cost, #deck-mgmt-filter-tribe', (event) => {
            this.#audioManager?.playSFX('buttonClick');
            this._handleFilterChange(event);
        });

        // Zoom (delegated from screenElement)
        this.#screenElement.on(`contextmenu${namespace}`, '#deck-management-collection .mini-card', (event) => {
            event.preventDefault();
            this.#zoomHandler.handleZoomClick(event); // Zoom handler deals with its own logic
        });

        // Close Zoom Overlay
        $('#deck-management-zoom-overlay').on(`click${namespace}`, (event) => {
            if (event.target === event.currentTarget) {
                this.#zoomHandler.closeZoom();
            }
        });
        console.log("DeckManagementScreenUI: Events rebound.");
    }

    // ... (keep _handleCreateNewDeck, _handleEditDeck, _handleDeleteDeck, _handleFilterChange) ...
    _handleCreateNewDeck() {
        console.log("DeckManagementScreenUI: Create new deck requested.");
        this.#uiManager?.navigateTo('deck-builder-screen');
    }

    _handleEditDeck(event) {
        const deckId = $(event.currentTarget).closest('li').data('deck-id');
        if (deckId) {
            console.log(`DeckManagementScreenUI: Edit deck requested: ${deckId}`);
            this.#audioManager?.playSFX('buttonClick');
            this.#uiManager?.navigateTo('deck-builder-screen', { deckIdToEdit: deckId });
        } else {
             console.warn("DeckManagementScreenUI: Edit deck failed, no deckId found.");
        }
    }

    _handleDeleteDeck(event) {
        const $li = $(event.currentTarget).closest('li');
        const deckId = $li.data('deck-id');
        const deckName = $li.find('.deck-name').text().split('(')[0].trim();

        if (deckId && confirm(`Tem certeza que deseja excluir o deck "${deckName}"?`)) {
            this.#audioManager?.playSFX('buttonClick');
            const result = this.#accountManager.deleteDeck(deckId);
            if (result.success) {
                console.log(`DeckManagementScreenUI: Deck ${deckId} deleted.`);
                this._showMessage(`Deck "${deckName}" excluído.`, 'success');
                this.#audioManager?.playSFX('deckSave');
                this.render(); // Re-render the list
            } else {
                this._showMessage(`Erro ao excluir deck: ${result.message}`, 'error');
                console.error(`Error deleting deck: ${result.message}`);
            }
        } else {
            if (!deckId) console.error("DeckManagementScreenUI: Delete failed, no deckId found.");
        }
    }

    _handleFilterChange() {
        const userFullCollection = this.#accountManager.getCollection() || [];
        const uniqueCollectionIds = [...new Set(userFullCollection)];
        this._renderCollection(uniqueCollectionIds, userFullCollection); // Re-render collection only
    }

    // --- Métodos de Renderização (Keep as is from previous version) ---
    _renderDeckList(decks) {
        if (!this.#deckListElement) return;
        this.#deckListElement.empty();
        const deckIds = Object.keys(decks || {});

        if (!deckIds.length) {
            this.#deckListElement.append('<li>(Nenhum deck criado)</li>');
            return;
        }

        deckIds.forEach(id => {
            const deck = decks[id];
            if (deck && deck.cards) {
                 const cardCount = deck.cards.length;
                 const isValid = cardCount >= 30 && cardCount <= 40;
                 const validityClass = isValid ? 'deck-valid' : 'deck-invalid';
                 const validityText = isValid ? '' : ` (Inválido: ${cardCount})`;
                 const deckName = deck.name || `Deck ${id.substring(0, 5)}`;

                this.#deckListElement.append(`
                    <li data-deck-id="${id}">
                        <span class="deck-name ${validityClass}">${deckName} (${cardCount} cartas)${validityText}</span>
                        <span class="deck-buttons">
                            <button class="btn-edit-deck" title="Editar Deck ${deckName}">✏️</button>
                            <button class="btn-delete-deck" title="Excluir Deck ${deckName}">🗑️</button>
                        </span>
                    </li>`);
            } else {
                 console.warn(`DeckManagementScreenUI: Deck data invalid for ID ${id}`, deck);
            }
        });
        // console.log(`DeckManagementScreenUI: Rendered ${deckIds.length} decks.`);
    }

    _populateFilters(uniqueCollectionIds) {
        if (this._filtersPopulated) return; // Populate only once

        if (!this.#filterCostSelect || !this.#filterTribeSelect) {
             console.warn("DeckManagementScreenUI: Filter elements missing, cannot populate.");
             return;
        }

        this.#filterCostSelect.children('option:not(:first-child)').remove();
        this.#filterTribeSelect.children('option:not(:first-child)').remove();

        const costs = new Set();
        const tribes = new Set();

        (uniqueCollectionIds || []).forEach(id => {
             const cd = this.#cardDatabase[id];
             if(cd) {
                 const costVal = cd.cost >= 7 ? '7+' : (cd.cost ?? 0).toString();
                 costs.add(costVal);
                 tribes.add(cd.tribe || 'None');
             }
        });

        [...costs].sort((a, b) => (a === '7+' ? Infinity : parseInt(a)) - (b === '7+' ? Infinity : parseInt(b)))
            .forEach(c => this.#filterCostSelect.append(`<option value="${c}">${c}</option>`));

        [...tribes].sort((a, b) => (a === 'None' ? 1 : b === 'None' ? -1 : a.localeCompare(b)))
            .forEach(t => this.#filterTribeSelect.append(`<option value="${t}">${t === 'None' ? 'Sem Tribo' : t}</option>`));

        this._filtersPopulated = true; // Mark as populated
        console.log("DeckManagementScreenUI: Filters populated.");
    }

    _renderCollection(uniqueCollectionIds, userFullCollection) {
        if (!this.#collectionElement || !this.#collectionCountSpan) return;

        this.#collectionElement.empty();
        const safeUniqueIds = uniqueCollectionIds || [];
        this.#collectionCountSpan.text(safeUniqueIds.length);

        if (safeUniqueIds.length === 0) {
            this.#collectionElement.append('<p class="placeholder-message">(Nenhuma carta na coleção)</p>');
            return;
        }

        const cardQuantities = {};
        (userFullCollection || []).forEach(id => {
            cardQuantities[id] = (cardQuantities[id] || 0) + 1;
        });

        const filterName = this.#filterNameInput?.val().toLowerCase() ?? '';
        const filterType = this.#filterTypeSelect?.val() ?? '';
        const filterCost = this.#filterCostSelect?.val() ?? '';
        const filterTribe = this.#filterTribeSelect?.val() ?? '';
        let cardsRendered = 0;

        safeUniqueIds.forEach(id => {
            const cardDef = this.#cardDatabase[id];
            if (cardDef) {
                if (filterName && !cardDef.name.toLowerCase().includes(filterName)) return;
                if (filterType && cardDef.type !== filterType) return;
                if (filterCost) {
                    const cardCostStr = cardDef.cost >= 7 ? '7+' : (cardDef.cost ?? 0).toString();
                    if (cardCostStr !== filterCost) return;
                }
                const cardTribe = cardDef.tribe || 'None';
                if (filterTribe && cardTribe !== filterTribe) return;

                const quantity = cardQuantities[id] || 0;
                const $miniCard = this.#cardRenderer.renderMiniCard(cardDef, 'collection', quantity);

                if ($miniCard) {
                    this.#collectionElement.append($miniCard);
                    cardsRendered++;
                }
            }
        });

         if (cardsRendered === 0 && safeUniqueIds.length > 0) {
            this.#collectionElement.append('<p class="placeholder-message">(Nenhuma carta corresponde aos filtros)</p>');
        }

        // console.log(`DeckManagementScreenUI: Rendered ${cardsRendered} unique collection cards with quantities.`);
    }

    _showMessage(text, type = 'info', duration = 3000) {
        if (!this.#messageParagraph) return;
        const colorVar = type === 'success' ? '--success-color' : type === 'error' ? '--error-color' : '--info-color';
        this.#messageParagraph.text(text).css('color', `var(${colorVar}, #ccc)`);

        if (duration > 0) {
            setTimeout(() => {
                if (this.#messageParagraph?.text() === text) {
                    this.#messageParagraph.text('');
                }
            }, duration);
        }
        if(type === 'error') {
            this.#audioManager?.playSFX('genericError');
        }
    }

    // Opcional: Método destroy para limpar listeners
    destroy() {
        console.log("DeckManagementScreenUI: Destroying...");
        const namespace = '.deckmgmt';
        this.#screenElement?.off(namespace); // Use optional chaining
        this.#btnCreateNewDeck?.off(namespace);
        $('#deck-management-zoom-overlay')?.off(namespace);
        // Nullify references if needed
        this.#screenElement = null;
        this.#deckListElement = null;
        this.#collectionElement = null;
        // ... nullify other cached elements ...
        console.log("DeckManagementScreenUI: Destroy complete.");
    }
}