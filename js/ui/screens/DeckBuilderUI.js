// js/ui/screens/DeckBuilderUI.js - CORREÇÃO: Bind no Render

// Importar dependências
import CardRenderer from '../helpers/CardRenderer.js';
import ZoomHandler from '../helpers/ZoomHandler.js';
// Assume que SortableJS está disponível globalmente (via CDN) ou importado

export default class DeckBuilderUI {
    // --- Referências Injetadas ---
    #screenManager;
    #accountManager;
    #cardDatabase;
    #cardRenderer;
    #zoomHandler;
    #uiManager;
    #audioManager;

    // --- Elementos da UI (Cache) ---
    #deckBuilderScreenElement;
    #collectionListElement;
    #deckListElement;
    #deckNameInput;
    #deckCountDisplay;
    #deckCountTop;
    #deckValiditySpan;
    #saveButton;
    #clearButton;
    #backButton;
    #messageParagraph;
    #titleElement;
    #collectionCountSpan;
    #filterNameInput;
    #filterTypeSelect;
    #filterCostSelect;
    #filterTribeSelect;

    // --- Estado Interno ---
    #dbState = {
        currentDeckId: null, currentDeckName: '', currentDeckCards: [],
        isEditing: false, MAX_COPIES_PER_CARD: 4,
        MIN_DECK_SIZE: 30, MAX_DECK_SIZE: 40
    };

    // --- SortableJS Instances ---
    #collectionSortable = null;
    #deckSortable = null;
    _filtersPopulated = false; // Flag para filtros

    constructor(screenManager, accountManager, cardDatabase, cardRenderer, zoomHandler, uiManager, audioManager) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;
        this.#cardRenderer = cardRenderer;
        this.#zoomHandler = zoomHandler;
        this.#uiManager = uiManager;
        this.#audioManager = audioManager;

        // Cache selectors once
        this._cacheSelectors();
        // REMOVED _bindEvents() from constructor
        console.log("DeckBuilderUI initialized.");
    }

    _cacheSelectors() {
        this.#deckBuilderScreenElement = $('#deck-builder-screen');
        if (!this.#deckBuilderScreenElement.length) { console.error("DeckBuilderUI Cache Error: Root element missing"); return false;}

        this.#collectionListElement = this.#deckBuilderScreenElement.find('#db-available-cards')[0];
        this.#deckListElement = this.#deckBuilderScreenElement.find('#db-current-deck')[0];
        this.#deckNameInput = this.#deckBuilderScreenElement.find('#db-deck-name');
        this.#deckCountDisplay = this.#deckBuilderScreenElement.find('#db-deck-count-display');
        this.#deckCountTop = this.#deckBuilderScreenElement.find('#db-deck-count');
        this.#deckValiditySpan = this.#deckBuilderScreenElement.find('#db-deck-validity');
        this.#saveButton = this.#deckBuilderScreenElement.find('#btn-save-deck');
        this.#clearButton = this.#deckBuilderScreenElement.find('#btn-clear-deck');
        this.#backButton = this.#deckBuilderScreenElement.find('#btn-deck-builder-back');
        this.#messageParagraph = this.#deckBuilderScreenElement.find('#deck-builder-message');
        this.#titleElement = this.#deckBuilderScreenElement.find('#deck-builder-title');
        this.#collectionCountSpan = this.#deckBuilderScreenElement.find('#db-collection-count');
        this.#filterNameInput = this.#deckBuilderScreenElement.find('#db-filter-name');
        this.#filterTypeSelect = this.#deckBuilderScreenElement.find('#db-filter-type');
        this.#filterCostSelect = this.#deckBuilderScreenElement.find('#db-filter-cost');
        this.#filterTribeSelect = this.#deckBuilderScreenElement.find('#db-filter-tribe');

        if (!this.#collectionListElement || !this.#deckListElement || !this.#saveButton.length || !this.#clearButton.length || !this.#backButton.length) {
            console.error("DeckBuilderUI Cache Error: One or more essential elements not found!");
            return false;
        }
        return true;
    }


    render(deckIdToEdit = null) {
        if (!this.#deckBuilderScreenElement?.length) {
             if (!this._cacheSelectors()) { // Try caching again if root exists now
                  console.error("DeckBuilderUI cannot render: Root element not found even after re-cache.");
                  return;
             }
        }
        console.log(`DeckBuilderUI: Rendering screen. Edit ID: ${deckIdToEdit}`);
        this._resetState();

        const currentUser = this.#accountManager.getCurrentUser();
        const userFullCollection = this.#accountManager.getCollection() || [];

        if (!currentUser) {
            console.error("DeckBuilderUI Error: Cannot render - User not logged in.");
            this.#uiManager.navigateTo('login-screen');
            return;
        }

        const uniqueCollectionIds = [...new Set(userFullCollection)];

        if (deckIdToEdit) {
            this._loadDeckForEditing(deckIdToEdit, uniqueCollectionIds);
        } else {
            this.#titleElement.text('Criar Novo Deck');
            this.#deckNameInput.val('');
            this.#dbState.currentDeckCards = [];
        }

        this._populateFilters(uniqueCollectionIds);
        this._renderCollectionPanel(uniqueCollectionIds, userFullCollection);
        this._renderDeckPanel();

        // --- MOVED BINDING HERE ---
        this._bindEvents();
        // --------------------------

        console.log("DeckBuilderUI: Render complete.");
    }

    _bindEvents() {
        if (!this.#deckBuilderScreenElement || !this.#deckBuilderScreenElement.length) {
            console.warn("DeckBuilderUI: Cannot bind events, root element missing.");
            return;
        }
        console.log("DeckBuilderUI: Binding events...");
        const self = this;
        const namespace = '.deckbuilder';

        // --- Clear old listeners ---
        this.#deckBuilderScreenElement.off(namespace);
        $('#deckbuilder-image-zoom-overlay').off(namespace);

        // Helper for audio
        const addAudio = ($el, click = 'buttonClick', hover = 'buttonHover') => {
             if (!$el || !$el.length) return;
             $el.off(`click${namespace} mouseenter${namespace}`);
             $el.on(`click${namespace}`, () => this.#audioManager?.playSFX(click));
             $el.on(`mouseenter${namespace}`, () => this.#audioManager?.playSFX(hover));
        };

        // Bind new listeners
        addAudio(this.#saveButton, 'deckSave');
        this.#deckBuilderScreenElement.on(`click${namespace}`, '#btn-save-deck', this._handleSaveDeck.bind(this));

        addAudio(this.#clearButton);
        this.#deckBuilderScreenElement.on(`click${namespace}`, '#btn-clear-deck', this._handleClearDeck.bind(this));

        addAudio(this.#backButton);
        this.#deckBuilderScreenElement.on(`click${namespace}`, '#btn-deck-builder-back', this._handleBackButton.bind(this));

        this.#deckBuilderScreenElement.on(`input${namespace}`, '#db-filter-name', this._handleFilterChange.bind(this));
        this.#deckBuilderScreenElement.on(`change${namespace}`, '#db-filter-type, #db-filter-cost, #db-filter-tribe', (event) => {
             this.#audioManager?.playSFX('buttonHover');
             this._handleFilterChange(event);
        });

        this.#deckBuilderScreenElement.on(`input${namespace}`, '#db-deck-name', this._handleDeckNameInput.bind(this));

        // Delegated zoom handler for both lists
        this.#deckBuilderScreenElement.on(`contextmenu${namespace}`, '.mini-card', (event) => {
            event.preventDefault();
            this.#zoomHandler.handleZoomClick(event);
        });

        $('#deckbuilder-image-zoom-overlay').on(`click${namespace}`, (event) => {
            if (event.target === event.currentTarget) {
                this.#zoomHandler.closeZoom();
            }
        });
        console.log("DeckBuilderUI: Events rebound.");
    }

    // ... (keep _resetState, _loadDeckForEditing, _addCardToDeck, _removeCardFromDeck, _updateDeckValidity, _showMessage) ...
        _resetState() {
        this.#dbState = {
            currentDeckId: null, currentDeckName: '', currentDeckCards: [],
            isEditing: false, MAX_COPIES_PER_CARD: 4,
            MIN_DECK_SIZE: 30, MAX_DECK_SIZE: 40
        };
        this.#messageParagraph?.text('');
        console.log("DeckBuilderUI: State reset.");
    }

    _loadDeckForEditing(deckId, uniqueCollectionIds) {
        const decks = this.#accountManager.loadDecks();
        const deckToLoad = decks?.[deckId];
        if (deckToLoad && deckToLoad.cards) {
            this.#dbState.currentDeckId = deckId;
            this.#dbState.currentDeckName = deckToLoad.name;
            const ownedSet = new Set(uniqueCollectionIds);
            this.#dbState.currentDeckCards = deckToLoad.cards.filter(cardId => ownedSet.has(cardId));

            if (this.#dbState.currentDeckCards.length !== deckToLoad.cards.length) {
                 this._showMessage('Algumas cartas salvas não estão na sua coleção e foram removidas.', 'orange');
            }
            this.#dbState.isEditing = true;
            this.#titleElement.text(`Editando: ${deckToLoad.name}`);
            this.#deckNameInput.val(deckToLoad.name);
            console.log(`DeckBuilderUI: Loaded deck '${deckToLoad.name}' for editing with ${this.#dbState.currentDeckCards.length} valid cards.`);
        } else {
            console.warn(`DeckBuilderUI: Deck ID ${deckId} not found or invalid for editing.`);
            this.#titleElement.text('Criar Novo Deck');
            this.#deckNameInput.val('');
            this.#dbState.currentDeckCards = [];
        }
        // Validity will be updated when _renderDeckPanel is called after this
    }

    _addCardToDeck(cardId) {
        if (!cardId) return false;
        const currentCountInDeck = this.#dbState.currentDeckCards.filter(id => id === cardId).length;
        const cardName = this.#cardDatabase[cardId]?.name || cardId;

        if (currentCountInDeck >= this.#dbState.MAX_COPIES_PER_CARD) {
            this._showMessage(`Máx ${this.#dbState.MAX_COPIES_PER_CARD} de "${cardName}" no deck.`, 'orange');
            this.#audioManager?.playSFX('genericError');
            return false;
        }
        if (this.#dbState.currentDeckCards.length >= this.#dbState.MAX_DECK_SIZE) {
            this._showMessage(`Máx ${this.#dbState.MAX_DECK_SIZE} cartas no deck.`, 'orange');
            this.#audioManager?.playSFX('genericError');
            return false;
        }

        this.#dbState.currentDeckCards.push(cardId);
        console.log(`DeckBuilderUI State: Added ${cardId}. Deck count: ${this.#dbState.currentDeckCards.length}. Copies of ${cardId}: ${currentCountInDeck + 1}`);
        this._updateDeckValidity();
        this._showMessage('');
        this.#audioManager?.playSFX('cardDraw');
        return true;
    }

    _removeCardFromDeck(cardId) {
        if (!cardId) return false;
        const initialLength = this.#dbState.currentDeckCards.length;
        const index = this.#dbState.currentDeckCards.indexOf(cardId);

        if (index > -1) {
            this.#dbState.currentDeckCards.splice(index, 1);
             if (this.#dbState.currentDeckCards.length < initialLength) {
                  console.log(`DeckBuilderUI State: OK removed one instance of ${cardId}. New count: ${this.#dbState.currentDeckCards.length}`);
                  this._updateDeckValidity();
                  this.#audioManager?.playSFX('cardDiscard');
                  return true;
             } else { console.error(`DeckBuilderUI State: Error splicing ${cardId}?`); return false; }
        }
        console.warn("DeckBuilderUI State: ID not found in current deck state, cannot remove:", cardId);
        return false;
    }

    _updateDeckValidity() {
        if (!this.#deckCountTop || !this.#deckCountDisplay || !this.#deckValiditySpan || !this.#saveButton || !this.#deckNameInput) {
            return;
        }
        const count = this.#dbState.currentDeckCards.length;
        const min = this.#dbState.MIN_DECK_SIZE;
        const max = this.#dbState.MAX_DECK_SIZE;
        const isValidSize = count >= min && count <= max;
        const deckName = this.#deckNameInput.val().trim();
        const isFullyValid = isValidSize && !!deckName;

        const countText = `${count}/${max}`;
        this.#deckCountDisplay.text(count);
        this.#deckCountTop.text(countText);

        if (isValidSize) {
            this.#deckValiditySpan.text('(Tamanho Válido)').css('color', 'var(--valid-color)');
        } else if (count < min) {
            this.#deckValiditySpan.text(`(Mín ${min})`).css('color', 'var(--invalid-color)');
        } else {
            this.#deckValiditySpan.text(`(Máx ${max})`).css('color', 'var(--invalid-color)');
        }
        this.#saveButton.prop('disabled', !isFullyValid);
    }

    _showMessage(text, type = 'info', duration = 3000) {
         if (!this.#messageParagraph) return;
         const colorVar = type === 'success' ? '--success-color' : type === 'error' || type === 'orange' ? '--error-color' : '--info-color';
         this.#messageParagraph.text(text).css('color', `var(${colorVar}, #ccc)`);
         if (duration > 0) {
             setTimeout(() => {
                 if (this.#messageParagraph?.text() === text) {
                     this.#messageParagraph.text('');
                 }
             }, duration);
         }
     }
    // --- Handlers de Eventos ---

    _handleSaveDeck() {
        const deckName = this.#deckNameInput.val().trim();
        if (!deckName) { this._showMessage('Dê um nome ao deck.', 'orange'); this.#audioManager?.playSFX('genericError'); return; }

        const cardIds = this.#dbState.currentDeckCards;
        const count = cardIds.length;
        const min = this.#dbState.MIN_DECK_SIZE;
        const max = this.#dbState.MAX_DECK_SIZE;

        if (count >= min && count <= max) {
            const deckId = this.#dbState.isEditing && this.#dbState.currentDeckId ? this.#dbState.currentDeckId : `deck_${Date.now()}`;
            const result = this.#accountManager.saveDeck(deckId, deckName, cardIds);
            this._showMessage(result.message, result.success ? 'success' : 'error');
            if (result.success) {
                 this.#dbState.isEditing = true;
                 this.#dbState.currentDeckId = deckId;
                 this.#titleElement.text(`Editando: ${deckName}`);
            } else {
                 this.#audioManager?.playSFX('genericError');
            }
        } else {
             this._showMessage('O deck não tem o número de cartas válido (30-40).', 'orange');
             this.#audioManager?.playSFX('genericError');
        }
     }

    _handleClearDeck() {
        if (confirm('Limpar deck atual? Isso removerá todas as cartas.')) {
            this.#dbState.currentDeckCards = [];
            this._renderDeckPanel();
            this._initializeSortables(); // Garante que drag/drop ainda funcione
            this._showMessage('Deck limpo.', 'lightblue');
        }
    }

    _handleFilterChange() {
        const userFullCollection = this.#accountManager.getCollection() || [];
        const uniqueCollectionIds = [...new Set(userFullCollection)];
        this._renderCollectionPanel(uniqueCollectionIds, userFullCollection);
    }

    _handleDeckNameInput() {
        this.#dbState.currentDeckName = this.#deckNameInput.val();
        this._updateDeckValidity();
    }

    _handleBackButton() {
        this.#uiManager.navigateTo('deck-management-screen');
    }

    // --- Métodos de Renderização Privados ---

    _populateFilters(uniqueCollectionIds) {
         if (this._filtersPopulated) return; // Populate only once per instance lifetime

         if (!this.#filterCostSelect || !this.#filterTribeSelect || !this.#filterTypeSelect || !this.#filterNameInput) {
             console.warn("DeckBuilderUI: Cannot populate filters, elements missing.");
             return;
         }
        const $costFilter = this.#filterCostSelect;
        const $tribeFilter = this.#filterTribeSelect;
        $costFilter.children('option:not(:first-child)').remove();
        $tribeFilter.children('option:not(:first-child)').remove();
        // Reset type and name filters visually only if not already populated
        // This avoids resetting user selection if render is called multiple times
        if(!this._filtersPopulated) {
            this.#filterTypeSelect.val('');
            this.#filterNameInput.val('');
        }

        const costs = new Set(), tribes = new Set();
        (uniqueCollectionIds || []).forEach(id => {
             const cd = this.#cardDatabase[id];
             if(cd) {
                 const costVal = cd.cost >= 7 ? '7+' : (cd.cost ?? 0).toString();
                 costs.add(costVal);
                 tribes.add(cd.tribe || 'None');
             }
        });

        [...costs].sort((a, b) => (a === '7+' ? Infinity : parseInt(a)) - (b === '7+' ? Infinity : parseInt(b)))
            .forEach(c => $costFilter.append(`<option value="${c}">${c}</option>`));
        [...tribes].sort((a, b) => (a === 'None' ? 1 : b === 'None' ? -1 : a.localeCompare(b)))
            .forEach(t => $tribeFilter.append(`<option value="${t}">${t === 'None' ? 'Sem Tribo' : t}</option>`));

        this._filtersPopulated = true; // Mark as populated
        console.log("DeckBuilderUI: Filters populated.");
    }

    _renderCollectionPanel(uniqueCollectionIds, userFullCollection) {
        if (!this.#collectionListElement) {
            console.error("DeckBuilderUI: Collection list element not found for rendering.");
            return;
        }
        const $container = $(this.#collectionListElement).empty();
        const safeUniqueIds = uniqueCollectionIds || [];
        this.#collectionCountSpan.text(safeUniqueIds.length);

        if (!Array.isArray(safeUniqueIds)) { $container.append('<p class="placeholder-message">Erro coleção.</p>'); return; }

        const cardQuantities = {};
        (userFullCollection || []).forEach(id => {
            cardQuantities[id] = (cardQuantities[id] || 0) + 1;
        });

        const fN = this.#filterNameInput?.val().toLowerCase() ?? '';
        const fT = this.#filterTypeSelect?.val() ?? '';
        const fC = this.#filterCostSelect?.val() ?? '';
        const fR = this.#filterTribeSelect?.val() ?? '';
        let cardsRendered = 0;

        safeUniqueIds.forEach(id => {
            const cd = this.#cardDatabase[id];
            if (cd) {
                if (fN && !cd.name.toLowerCase().includes(fN)) return;
                if (fT && cd.type !== fT) return;
                if (fC) { const costVal = cd.cost >= 7 ? '7+' : (cd.cost ?? 0).toString(); if (costVal !== fC) return; }
                if (fR && (cd.tribe || 'None') !== fR) return;

                const quantity = cardQuantities[id] || 0;
                const $mc = this.#cardRenderer.renderMiniCard(cd, 'collection', quantity);

                if ($mc) { $container.append($mc); cardsRendered++; }
            }
        });

        if (cardsRendered === 0 && safeUniqueIds.length > 0) $container.append('<p class="placeholder-message">(Nenhuma carta corresponde)</p>');
        else if (safeUniqueIds.length === 0) $container.append('<p class="placeholder-message">(Coleção vazia)</p>');

        this._initializeSortables(); // Re-initialize SortableJS AFTER rendering content
    }

    _renderDeckPanel() {
        if (!this.#deckListElement) {
            console.error("DeckBuilderUI: Deck list element not found for rendering.");
            return;
        }
        const $container = $(this.#deckListElement).empty();

        this.#dbState.currentDeckCards.forEach(id => {
            const cardDef = this.#cardDatabase[id];
            if (cardDef) {
                const $mc = this.#cardRenderer.renderMiniCard(cardDef, 'deck', 0); // Pass 0 for quantity
                if ($mc) $container.append($mc);
            } else {
                console.warn(`DeckBuilderUI: Card ID '${id}' in deck state not found in database.`);
            }
        });

        if (this.#dbState.currentDeckCards.length === 0) {
             $container.append('<p class="placeholder-message">(Arraste cartas da coleção para cá)</p>');
        }
        this._updateDeckValidity(); // Update counts and validity
    }


    _initializeSortables() {
        if (this.#collectionSortable) try { this.#collectionSortable.destroy(); } catch(e) { /* ignore */ }
        if (this.#deckSortable) try { this.#deckSortable.destroy(); } catch(e) { /* ignore */ }
        this.#collectionSortable = null;
        this.#deckSortable = null;

        if (!this.#collectionListElement || !this.#deckListElement) {
            console.error("DeckBuilderUI Error: Sortable list DOM elements not found during initialization.");
            return;
        }
        // console.log("DeckBuilderUI: Initializing/Re-initializing SortableJS...");
        const self = this;

        const commonSortableOptions = {
            animation: 150, filter: '.placeholder-message', preventOnFilter: false,
            ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', dragClass: 'sortable-drag',
             onStart: function (evt) {
                if (evt.from === self.#deckListElement) {
                     $('body').addClass('dragging-from-deck').removeClass('dragging-from-collection');
                } else {
                     $('body').addClass('dragging-from-collection').removeClass('dragging-from-deck');
                }
             },
             onEnd: function (evt) {
                 $('body').removeClass('dragging-from-deck dragging-from-collection drag-over-body');
                 $('.card-list').removeClass('drag-over drag-removal');
             },
             onMove: function (evt) {
                 $('.card-list').removeClass('drag-over');
                 $(evt.to).addClass('drag-over');
                 const isOverDeck = $(evt.related).closest('.card-list').is(self.#deckListElement);
                 const isOverCollection = $(evt.related).closest('.card-list').is(self.#collectionListElement);
                 const draggingFromDeck = $(evt.from).is(self.#deckListElement);

                 $('body').toggleClass('drag-over-body', draggingFromDeck && !isOverDeck && !isOverCollection);
                 $(self.#collectionListElement).toggleClass('drag-removal', draggingFromDeck && !isOverDeck && !isOverCollection);
             },
        };

        this.#collectionSortable = new Sortable(this.#collectionListElement, {
            ...commonSortableOptions,
            group: { name: 'deckBuilderShared', pull: 'clone', put: false },
            sort: false,
        });

        this.#deckSortable = new Sortable(this.#deckListElement, {
            ...commonSortableOptions,
            group: { name: 'deckBuilderShared', pull: true, put: true },
            sort: true,
            onAdd: function (evt) {
                const cardId = $(evt.item).data('card-id');
                const cardElement = evt.item;
                const addedToState = self._addCardToDeck(cardId);
                if (!addedToState) {
                    $(cardElement).remove();
                } else {
                    $(cardElement).removeClass('in-collection').addClass('in-deck');
                     const cardDef = self.#cardDatabase[cardId];
                     if (cardDef) {
                         const $newCardInDeck = self.#cardRenderer.renderMiniCard(cardDef, 'deck', 0);
                         $(cardElement).replaceWith($newCardInDeck);
                     }
                }
                $(evt.to).removeClass('drag-over');
            },
            onRemove: function (evt) {
                const cardId = $(evt.item).data('card-id');
                const removedFromState = self._removeCardFromDeck(cardId);
                if (!removedFromState) console.warn(`Sortable: Failed to remove ${cardId} from state.`);
                $(evt.from).removeClass('drag-over');
                $('body').removeClass('drag-over-body');
                $(self.#collectionListElement).removeClass('drag-removal');
            },
            onUpdate: function (evt) {
                setTimeout(() => {
                    self.#dbState.currentDeckCards = $(self.#deckListElement).children('.mini-card').map((i, el) => $(el).data('card-id')).get();
                    console.log("DeckBuilderUI State: Deck reordered", self.#dbState.currentDeckCards);
                    self.#audioManager?.playSFX('cardDraw');
                    // Re-render might be needed if visual state (like counters) persisted incorrectly
                    // self._renderDeckPanel(); // Usually not needed if onAdd works correctly
                }, 0);
            },
        });
        // console.log("DeckBuilderUI: SortableJS initialized/re-initialized.");
    }

    destroy() {
        console.log("DeckBuilderUI: Destroying...");
        const namespace = '.deckbuilder';
        this.#deckBuilderScreenElement?.off(namespace); // Use optional chaining
        $('#deckbuilder-image-zoom-overlay')?.off(namespace);

        if (this.#collectionSortable) try { this.#collectionSortable.destroy(); } catch(e) { console.warn("Error destroying collection sortable:", e);}
        if (this.#deckSortable) try { this.#deckSortable.destroy(); } catch(e) { console.warn("Error destroying deck sortable:", e); }
        this.#collectionSortable = null;
        this.#deckSortable = null;

        // Nullify jQuery references
        this.#deckBuilderScreenElement = null;
        this.#collectionListElement = null; this.#deckListElement = null; this.#deckNameInput = null;
        this.#deckCountDisplay = null; this.#deckCountTop = null; this.#deckValiditySpan = null;
        this.#saveButton = null; this.#clearButton = null; this.#backButton = null;
        this.#messageParagraph = null; this.#titleElement = null; this.#collectionCountSpan = null;
        this.#filterNameInput = null; this.#filterTypeSelect = null; this.#filterCostSelect = null; this.#filterTribeSelect = null;
        this._filtersPopulated = false; // Reset flag
        console.log("DeckBuilderUI: Destroy complete.");
    }

} // Fim da classe DeckBuilderUI