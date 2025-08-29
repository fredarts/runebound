// js/ui/screens/DeckManagementScreenUI.js

import CardRenderer from '../helpers/CardRenderer.js';
import ZoomHandler from '../helpers/ZoomHandler.js';

export default class DeckManagementScreenUI {
    #screenManager;
    #accountManager;
    #cardDatabase;
    #cardRenderer;
    #zoomHandler;
    #uiManager;
    #audioManager;

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

    _filtersPopulated = false;

    // Adicionar caminhos para as imagens dos decks iniciais
    #starterDeckThumbnails = {
        'ashkar_starter': 'assets/images/store/Ashkar_deck.png', // Mesmo caminho usado na loja/escolha inicial
        'galadreth_starter': 'assets/images/store/Galadreth_deck.png' // Mesmo caminho
    };
    #defaultDeckThumbnail = 'assets/images/ui/card_back_placeholder.png'; // Para decks criados pelo jogador

    constructor(screenManager, accountManager, cardDatabase, cardRenderer, zoomHandler, uiManager, audioManager) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;
        this.#cardRenderer = cardRenderer;
        this.#zoomHandler = zoomHandler;
        this.#uiManager = uiManager;
        this.#audioManager = audioManager;

        this._cacheSelectors();
        console.log("DeckManagementScreenUI initialized.");
    }

    _cacheSelectors() {
        this.#screenElement = $('#deck-management-screen');
        if (!this.#screenElement.length) {
            console.warn("DeckMgmt Cache Warning: Root element #deck-management-screen not found.");
            return false;
        }
        this.#deckListElement = this.#screenElement.find('#deck-management-list');
        this.#collectionElement = this.#screenElement.find('#deck-management-collection');
        this.#collectionCountSpan = this.#screenElement.find('#deck-mgmt-collection-count');
        this.#messageParagraph = this.#screenElement.find('#deck-mgmt-message');
        this.#filterNameInput = this.#screenElement.find('#deck-mgmt-filter-name');
        this.#filterTypeSelect = this.#screenElement.find('#deck-mgmt-filter-type');
        this.#filterCostSelect = this.#screenElement.find('#deck-mgmt-filter-cost');
        this.#filterTribeSelect = this.#screenElement.find('#deck-mgmt-filter-tribe');
        this.#btnCreateNewDeck = this.#screenElement.find('#btn-create-new-deck');

        if (!this.#deckListElement.length || !this.#collectionElement.length ||
            !this.#collectionCountSpan.length || !this.#btnCreateNewDeck.length) {
            console.error("DeckManagementScreenUI Cache Error: One or more essential elements not found!");
            return false;
        }
        return true;
    }

    render() {
        console.log("DeckManagementScreenUI: Rendering...");
        if (!this.#screenElement?.length && !this._cacheSelectors()) {
             console.error("DeckManagementScreenUI Render Error: Root element not found even after re-cache.");
             return;
        }

        this.#messageParagraph?.text('');

        const currentUser = this.#accountManager.getCurrentUser();
        if (!currentUser) {
            console.warn("DeckManagementScreenUI: No user logged in. Redirecting to login.");
            this.#uiManager?.navigateTo('login-screen');
            return;
        }

        const userFullCollection = this.#accountManager.getCollection() || [];
        const uniqueCollectionIds = [...new Set(userFullCollection)];
        const decks = this.#accountManager.loadDecks() || {};

        this._populateFilters(uniqueCollectionIds);
        this._renderDeckList(decks); // A modificação principal será aqui
        this._renderCollection(uniqueCollectionIds, userFullCollection);

        this._bindEvents();
    }

    _bindEvents() {
        if (!this.#screenElement || !this.#screenElement.length) {
            console.warn("DeckManagementScreenUI: Cannot bind events, root element missing.");
            return;
        }
        console.log("DeckManagementScreenUI: Binding events...");
        const self = this;
        const namespace = '.deckmgmt';

        this.#screenElement.off(namespace);
        this.#btnCreateNewDeck?.off(namespace);
        $('#deck-management-zoom-overlay')?.off(namespace);

        const addAudio = ($el, clickSfx = 'buttonClick', hoverSfx = 'buttonHover') => {
            if (!$el || !$el.length) return;
            $el.off(`click${namespace} mouseenter${namespace}`);
            $el.on(`click${namespace}`, () => self.#audioManager?.playSFX(clickSfx));
            $el.on(`mouseenter${namespace}`, () => self.#audioManager?.playSFX(hoverSfx));
        };

        this.#screenElement.on(`click${namespace}`, '.btn-edit-deck', (event) => {
            self._handleEditDeck(event);
        });
        this.#screenElement.on(`click${namespace}`, '.btn-delete-deck', (event) => {
            self._handleDeleteDeck(event);
        });
        this.#screenElement.on(`mouseenter${namespace}`, '.btn-edit-deck, .btn-delete-deck', () => {
            self.#audioManager?.playSFX('buttonHover');
        });

        if (this.#btnCreateNewDeck && this.#btnCreateNewDeck.length) {
            addAudio(this.#btnCreateNewDeck);
            this.#btnCreateNewDeck.on(`click${namespace}`, this._handleCreateNewDeck.bind(this));
        }

        if (this.#filterNameInput && this.#filterNameInput.length) {
            this.#filterNameInput.on(`input${namespace}`, this._handleFilterChange.bind(this));
        }
        if (this.#filterTypeSelect && this.#filterCostSelect && this.#filterTribeSelect) {
            this.#filterTypeSelect.add(this.#filterCostSelect).add(this.#filterTribeSelect)
                .on(`change${namespace}`, (event) => {
                    self.#audioManager?.playSFX('buttonClick');
                    self._handleFilterChange(event);
                });
        }

        this.#screenElement.on(`contextmenu${namespace}`, '#deck-management-collection .mini-card', (event) => {
            event.preventDefault();
            self.#zoomHandler.handleZoomClick(event);
        });

        const $zoomOverlay = $('#deck-management-zoom-overlay');
        if ($zoomOverlay.length) {
            $zoomOverlay.on(`click${namespace}`, (event) => {
                if (event.target === event.currentTarget) {
                    self.#zoomHandler.closeZoom();
                }
            });
        }
        console.log("DeckManagementScreenUI: Events rebound.");
    }

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
                this.render();
            } else {
                this._showMessage(`Erro ao excluir deck: ${result.message}`, 'error');
                console.error(`Error deleting deck: ${result.message}`);
                 this.#audioManager?.playSFX('genericError');
            }
        } else {
            if (!deckId) console.error("DeckManagementScreenUI: Delete failed, no deckId found.");
        }
    }

    _handleFilterChange() {
        const userFullCollection = this.#accountManager.getCollection() || [];
        const uniqueCollectionIds = [...new Set(userFullCollection)];
        this._renderCollection(uniqueCollectionIds, userFullCollection);
    }

    // --- MÉTODO MODIFICADO ---
    _renderDeckList(decks) {
        if (!this.#deckListElement || !this.#deckListElement.length) return;
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
                 const isValid = cardCount >= 30 && cardCount <= 60;
                 const validityClass = isValid ? 'deck-valid' : 'deck-invalid';
                 const validityText = isValid ? '' : ` (Inválido: ${cardCount})`;
                 const deckName = deck.name || `Deck ${id.substring(0, 5)}`;

                // --- LÓGICA DA THUMBNAIL ---
                let thumbnailSrc = this.#defaultDeckThumbnail; // Imagem padrão
                if (this.#starterDeckThumbnails[id]) { // Verifica se o ID do deck é de um starter deck
                    thumbnailSrc = this.#starterDeckThumbnails[id];
                } else if (deck.thumbnail) { // Se o deck tiver uma propriedade thumbnail customizada
                    thumbnailSrc = deck.thumbnail;
                }
                // --- FIM DA LÓGICA DA THUMBNAIL ---

                const thumbnailHTML = `<img src="${thumbnailSrc}" alt="Deck ${deckName}" class="deck-list-thumbnail">`;

                this.#deckListElement.append(`
                    <li data-deck-id="${id}">
                        ${thumbnailHTML}
                        <div class="deck-info-container">
                           <span class="deck-name ${validityClass}">${deckName}${validityText}</span>
                           <span class="deck-buttons">
                               <button class="btn-edit-deck" title="Editar Deck ${deckName}">✏️</button>
                               <button class="btn-delete-deck" title="Excluir Deck ${deckName}">🗑️</button>
                           </span>
                        </div>
                    </li>`);
            } else {
                 console.warn(`DeckManagementScreenUI: Deck data invalid for ID ${id}`, deck);
            }
        });
    }
    // --- FIM DO MÉTODO MODIFICADO ---

    _populateFilters(uniqueCollectionIds) {
        if (this._filtersPopulated && this.#filterCostSelect?.children('option').length > 1) {
            return;
        }

        if (!this.#filterCostSelect?.length || !this.#filterTribeSelect?.length || !this.#filterTypeSelect?.length) {
             console.warn("DeckManagementScreenUI: Filter elements missing, cannot populate.");
             return;
        }

        this.#filterCostSelect.children('option:not(:first-child)').remove();
        this.#filterTribeSelect.children('option:not(:first-child)').remove();
        this.#filterTypeSelect.children('option:not(:first-child)').remove();

        const costs = new Set();
        const tribes = new Set();
        const types = new Set();

        (uniqueCollectionIds || []).forEach(id => {
             const cd = this.#cardDatabase[id];
             if(cd) {
                 const costVal = cd.cost >= 7 ? '7+' : (cd.cost ?? 0).toString();
                 costs.add(costVal);
                 tribes.add(cd.tribe || 'None');
                 types.add(cd.type || 'Unknown');
             }
        });

        [...costs].sort((a, b) => (a === '7+' ? Infinity : parseInt(a)) - (b === '7+' ? Infinity : parseInt(b)))
            .forEach(c => this.#filterCostSelect.append(`<option value="${c}">${c}</option>`));

        [...tribes].sort((a, b) => (a === 'None' ? 1 : b === 'None' ? -1 : a.localeCompare(b)))
            .forEach(t => this.#filterTribeSelect.append(`<option value="${t}">${t === 'None' ? 'Sem Tribo' : t}</option>`));

        [...types].sort().forEach(t => this.#filterTypeSelect.append(`<option value="${t}">${t}</option>`));

        this._filtersPopulated = true;
        console.log("DeckManagementScreenUI: Filters populated.");
    }

    _renderCollection(uniqueCollectionIds, userFullCollection) {
        if (!this.#collectionElement?.length || !this.#collectionCountSpan?.length) return;

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

        const filterName = this.#filterNameInput?.val()?.toLowerCase() ?? '';
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
    }

    _showMessage(text, type = 'info', duration = 3000) {
        if (!this.#messageParagraph || !this.#messageParagraph.length) return;
        const colorVar = type === 'success' ? '--success-color' : type === 'error' ? '--error-color' : '--info-color';
        this.#messageParagraph.text(text).css('color', `var(${colorVar}, #ccc)`);

        if (duration > 0) {
            setTimeout(() => {
                if (this.#messageParagraph?.text() === text) {
                    this.#messageParagraph.text('');
                }
            }, duration);
        }
    }

    destroy() {
        console.log("DeckManagementScreenUI: Destroying...");
        const namespace = '.deckmgmt';
        this.#screenElement?.off(namespace);
        this.#btnCreateNewDeck?.off(namespace);
        $('#deck-management-zoom-overlay')?.off(namespace);

        this.#screenElement = null;
        this.#deckListElement = null;
        this.#collectionElement = null;
        this.#collectionCountSpan = null;
        this.#messageParagraph = null;
        this.#filterNameInput = null;
        this.#filterTypeSelect = null;
        this.#filterCostSelect = null;
        this.#filterTribeSelect = null;
        this.#btnCreateNewDeck = null;
        console.log("DeckManagementScreenUI: Destroy complete.");
    }
}