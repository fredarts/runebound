// js/ui/screens/DeckBuilderUI.js

import CardRenderer from '../helpers/CardRenderer.js';
import ZoomHandler from '../helpers/ZoomHandler.js';
// Assume que SortableJS está disponível globalmente (via CDN) ou importado em index.html

export default class DeckBuilderUI {
    #screenManager;
    #accountManager;
    #cardDatabase;
    #cardRenderer;
    #zoomHandler;
    #uiManager;
    #audioManager;

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

    #dbState = {
        currentDeckId: null,
        currentDeckName: '',
        currentDeckCards: [], // Array de IDs de cartas no deck atual
        isEditing: false,
        MAX_COPIES_PER_CARD: 4, // Regra do jogo
        MIN_DECK_SIZE: 30,      // Regra do jogo
        MAX_DECK_SIZE: 60,       // Regra do jogo
        // NOVO: Para rastrear a quantidade de cada carta possuída pelo usuário
        userCardQuantities: {}
    };

    #collectionSortable = null;
    #deckSortable = null;
    _filtersPopulated = false;

    constructor(screenManager, accountManager, cardDatabase, cardRenderer, zoomHandler, uiManager, audioManager) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;
        this.#cardRenderer = cardRenderer;
        this.#zoomHandler = zoomHandler;
        this.#uiManager = uiManager;
        this.#audioManager = audioManager;

        this._cacheSelectors();
        console.log("DeckBuilderUI initialized.");
    }

    _cacheSelectors() {
        // ... (mesmo _cacheSelectors de antes) ...
        this.#deckBuilderScreenElement = $('#deck-builder-screen');
        if (!this.#deckBuilderScreenElement.length) { console.error("DeckBuilderUI Cache Error: Root element #deck-builder-screen missing"); return false;}

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

        if (!this.#collectionListElement || !this.#deckListElement ||
            !this.#deckNameInput.length || !this.#deckCountDisplay.length || !this.#deckCountTop.length ||
            !this.#deckValiditySpan.length || !this.#saveButton.length || !this.#clearButton.length ||
            !this.#backButton.length || !this.#messageParagraph.length || !this.#titleElement.length ||
            !this.#collectionCountSpan.length || !this.#filterNameInput.length ||
            !this.#filterTypeSelect.length || !this.#filterCostSelect.length || !this.#filterTribeSelect.length) {
            console.error("DeckBuilderUI Cache Error: One or more essential elements not found!");
            return false;
        }
        return true;
    }

    render(deckIdToEdit = null) {
        if (!this.#deckBuilderScreenElement?.length && !this._cacheSelectors()) {
             console.error("DeckBuilderUI cannot render: Root element not found even after re-cache.");
             return;
        }
        console.log(`DeckBuilderUI: Rendering screen. Edit ID: ${deckIdToEdit}`);
        this._resetState(); // Reseta o estado, incluindo userCardQuantities

        const currentUser = this.#accountManager.getCurrentUser();
        const userFullCollection = this.#accountManager.getCollection() || [];

        if (!currentUser) {
            console.error("DeckBuilderUI Error: Cannot render - User not logged in.");
            this.#uiManager.navigateTo('login-screen');
            return;
        }

        // Calcular e armazenar as quantidades que o usuário possui de cada carta
        this.#dbState.userCardQuantities = {};
        userFullCollection.forEach(id => {
            this.#dbState.userCardQuantities[id] = (this.#dbState.userCardQuantities[id] || 0) + 1;
        });

        const uniqueCollectionIds = Object.keys(this.#dbState.userCardQuantities);


        if (deckIdToEdit) {
            this._loadDeckForEditing(deckIdToEdit, uniqueCollectionIds);
        } else {
            this.#titleElement.text('Criar Novo Deck');
            this.#deckNameInput.val('');
            this.#dbState.currentDeckCards = [];
        }

        this._populateFilters(uniqueCollectionIds);
        this._renderCollectionPanel(); // <<< ALTERADO: não precisa mais de userFullCollection
        this._renderDeckPanel();
        this._initializeSortables();

        this._bindEvents();
        console.log("DeckBuilderUI: Render complete.");
    }

    _bindEvents() {
        // ... (mesmo _bindEvents de antes) ...
        if (!this.#deckBuilderScreenElement || !this.#deckBuilderScreenElement.length) {
            console.warn("DeckBuilderUI: Cannot bind events, root element missing.");
            return;
        }
        console.log("DeckBuilderUI: Binding events...");
        const self = this;
        const namespace = '.deckbuilder';

        this.#deckBuilderScreenElement.off(namespace);
        $('#deckbuilder-image-zoom-overlay')?.off(namespace);

        const addAudio = ($el, clickSfx = 'buttonClick', hoverSfx = 'buttonHover') => {
             if (!$el || !$el.length) return;
             $el.off(`click${namespace} mouseenter${namespace}`);
             $el.on(`click${namespace}`, () => self.#audioManager?.playSFX(clickSfx));
             $el.on(`mouseenter${namespace}`, () => self.#audioManager?.playSFX(hoverSfx));
        };

        addAudio(this.#saveButton, 'deckSave');
        this.#saveButton.on(`click${namespace}`, this._handleSaveDeck.bind(this));

        addAudio(this.#clearButton);
        this.#clearButton.on(`click${namespace}`, this._handleClearDeck.bind(this));

        addAudio(this.#backButton);
        this.#backButton.on(`click${namespace}`, this._handleBackButton.bind(this));

        this.#filterNameInput.on(`input${namespace}`, this._handleFilterChange.bind(this));
        this.#filterTypeSelect.add(this.#filterCostSelect).add(this.#filterTribeSelect)
            .on(`change${namespace}`, (event) => {
                 self.#audioManager?.playSFX('buttonClick');
                 self._handleFilterChange(event);
            });

        this.#deckNameInput.on(`input${namespace}`, this._handleDeckNameInput.bind(this));

        this.#deckBuilderScreenElement.on(`contextmenu${namespace}`, '.mini-card', (event) => {
            event.preventDefault();
            self.#zoomHandler.handleZoomClick(event);
        });

        $('#deckbuilder-image-zoom-overlay').on(`click${namespace}`, (event) => {
            if (event.target === event.currentTarget) {
                self.#zoomHandler.closeZoom();
            }
        });
        console.log("DeckBuilderUI: Events rebound.");
    }

    _resetState() {
        this.#dbState = {
            currentDeckId: null, currentDeckName: '', currentDeckCards: [],
            isEditing: false, MAX_COPIES_PER_CARD: 4,
            MIN_DECK_SIZE: 30, MAX_DECK_SIZE: 60,
            userCardQuantities: {} // <<< ADICIONADO: resetar as quantidades do usuário
        };
        this.#messageParagraph?.text('');
        this.#deckNameInput?.val('');
        this.#titleElement?.text('Construtor de Decks');
        this._updateDeckValidity();
        console.log("DeckBuilderUI: State reset.");
    }

    _loadDeckForEditing(deckId, uniqueCollectionIds) {
        // uniqueCollectionIds não é mais usado diretamente aqui, pois #dbState.userCardQuantities já tem essa info
        const decks = this.#accountManager.loadDecks();
        const deckToLoad = decks?.[deckId];
        if (deckToLoad && deckToLoad.cards) {
            this.#dbState.currentDeckId = deckId;
            this.#dbState.currentDeckName = deckToLoad.name;

            // Filtra as cartas do deck salvo para manter apenas as que o usuário ainda possui e respeitando a quantidade
            const validDeckCards = [];
            const tempCounts = {...this.#dbState.userCardQuantities}; // Cópia para decrementar

            deckToLoad.cards.forEach(cardId => {
                if (tempCounts[cardId] && tempCounts[cardId] > 0) {
                    validDeckCards.push(cardId);
                    tempCounts[cardId]--; // Decrementa a quantidade disponível na coleção (temporariamente para esta lógica)
                }
            });

            this.#dbState.currentDeckCards = validDeckCards;

            if (this.#dbState.currentDeckCards.length !== deckToLoad.cards.length) {
                 this._showMessage('Algumas cartas do deck salvo não estão mais na sua coleção (ou excedem a quantidade possuída) e foram removidas.', 'orange');
            }
            this.#dbState.isEditing = true;
            this.#titleElement.text(`Editando: ${deckToLoad.name}`);
            this.#deckNameInput.val(deckToLoad.name);
            console.log(`DeckBuilderUI: Loaded deck '${deckToLoad.name}' for editing with ${this.#dbState.currentDeckCards.length} valid cards.`);
        } else {
            console.warn(`DeckBuilderUI: Deck ID ${deckId} not found or invalid for editing. Starting new deck.`);
            // _resetState() já foi chamado no render, então não precisa aqui se for cair neste else
            this.#titleElement.text('Criar Novo Deck');
        }
    }

    // ======================================================================
    // _addCardToDeck MODIFICADO
    // ======================================================================
    _addCardToDeck(cardId) {
        if (!cardId) return false;
        const cardDef = this.#cardDatabase[cardId];
        if (!cardDef) {
            console.warn(`DeckBuilder: Attempting to add unknown card (ID: ${cardId})`);
            return false;
        }

        const currentCountInDeck = this.#dbState.currentDeckCards.filter(id => id === cardId).length;
        const userOwnsQuantity = this.#dbState.userCardQuantities[cardId] || 0;

        // 1. Verifica se o usuário possui MAIS cópias da carta do que já adicionou ao deck
        if (currentCountInDeck >= userOwnsQuantity) {
            this._showMessage(`Você não possui mais cópias de "${cardDef.name}" para adicionar. Possuídas: ${userOwnsQuantity}.`, 'orange');
            this.#audioManager?.playSFX('genericError');
            return false;
        }

        // 2. Verifica o limite de cópias por carta no deck (ex: 4 por carta)
        if (currentCountInDeck >= this.#dbState.MAX_COPIES_PER_CARD) {
            this._showMessage(`Máximo de ${this.#dbState.MAX_COPIES_PER_CARD} cópias de "${cardDef.name}" permitido no deck.`, 'orange');
            this.#audioManager?.playSFX('genericError');
            return false;
        }

        // 3. Verifica o tamanho máximo do deck
        if (this.#dbState.currentDeckCards.length >= this.#dbState.MAX_DECK_SIZE) {
            this._showMessage(`Máximo de ${this.#dbState.MAX_DECK_SIZE} cartas permitido no deck.`, 'orange');
            this.#audioManager?.playSFX('genericError');
            return false;
        }

        this.#dbState.currentDeckCards.push(cardId);
        this._updateDeckValidity(); // Atualiza os contadores totais e validade
        this._showMessage(''); // Limpa mensagens de erro anteriores
        this.#audioManager?.playSFX('cardDraw');

        // Importante: Re-renderizar o painel da coleção para atualizar a quantidade "disponível"
        this._renderCollectionPanel();

        return true;
    }
    // ======================================================================

    _removeCardFromDeck(cardId) {
        if (!cardId) return false;
        const index = this.#dbState.currentDeckCards.indexOf(cardId);

        if (index > -1) {
            this.#dbState.currentDeckCards.splice(index, 1);
            this._updateDeckValidity();
            this.#audioManager?.playSFX('cardDiscard');
            // Importante: Re-renderizar o painel da coleção para atualizar a quantidade "disponível"
            this._renderCollectionPanel();
            return true;
        }
        console.warn("DeckBuilderUI State: Card ID not found in current deck state, cannot remove:", cardId);
        return false;
    }

    _updateDeckValidity() {
        // ... (mesmo _updateDeckValidity de antes) ...
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
            this.#deckValiditySpan.text('(Tamanho Válido)').css('color', 'var(--valid-color, lightgreen)');
        } else if (count < min && count > 0) {
            this.#deckValiditySpan.text(`(Mín ${min})`).css('color', 'var(--invalid-color, salmon)');
        } else if (count > max) {
            this.#deckValiditySpan.text(`(Máx ${max})`).css('color', 'var(--invalid-color, salmon)');
        } else {
            this.#deckValiditySpan.text('(Inválido)').css('color', 'var(--invalid-color, salmon)');
        }
        this.#saveButton.prop('disabled', !isFullyValid);
    }

    _showMessage(text, type = 'info', duration = 3000) {
        // ... (mesmo _showMessage de antes) ...
         if (!this.#messageParagraph || !this.#messageParagraph.length) return;
         const colorVar = type === 'success' ? '--success-color' :
                          type === 'error' || type === 'orange' ? '--error-color' :
                          '--text-color-secondary';
         this.#messageParagraph.text(text).css('color', `var(${colorVar}, #ccc)`);
         if (duration > 0) {
             setTimeout(() => {
                 if (this.#messageParagraph?.text() === text) {
                     this.#messageParagraph.text('');
                 }
             }, duration);
         }
    }

    _handleSaveDeck() {
        // ... (mesmo _handleSaveDeck de antes) ...
        const deckName = this.#deckNameInput.val().trim();
        if (!deckName) {
            this._showMessage('Por favor, dê um nome ao seu deck.', 'orange');
            this.#audioManager?.playSFX('genericError');
            this.#deckNameInput.focus();
            return;
        }

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
                 this.#saveButton.prop('disabled', false);
            } else {
                 this.#audioManager?.playSFX('genericError');
            }
        } else {
             this._showMessage(`O deck precisa ter entre ${min} e ${max} cartas. Atual: ${count}.`, 'orange');
             this.#audioManager?.playSFX('genericError');
        }
    }

    _handleClearDeck() {
        // ... (mesmo _handleClearDeck de antes) ...
        if (confirm('Tem certeza que deseja limpar o deck atual? Todas as cartas serão removidas.')) {
            this.#audioManager?.playSFX('buttonClick');
            this.#dbState.currentDeckCards = [];
            this._renderDeckPanel();
            this._renderCollectionPanel(); // Re-renderizar coleção para atualizar quantidades disponíveis
            this._showMessage('Deck limpo.', 'info');
        }
    }

    _handleFilterChange() {
        // ... (mesmo _handleFilterChange de antes) ...
        this._renderCollectionPanel();
        this._initializeSortables();
    }

    _handleDeckNameInput() {
        // ... (mesmo _handleDeckNameInput de antes) ...
        this.#dbState.currentDeckName = this.#deckNameInput.val();
        this._updateDeckValidity();
    }

    _handleBackButton() {
        // ... (mesmo _handleBackButton de antes) ...
        this.#uiManager.navigateTo('deck-management-screen');
    }

    _populateFilters(uniqueCollectionIds) {
        // ... (mesmo _populateFilters de antes, mas pode ser chamado com uniqueCollectionIds que são as chaves de this.#dbState.userCardQuantities) ...
         if (this._filtersPopulated && this.#filterCostSelect?.children('option').length > 1) return;

         if (!this.#filterCostSelect?.length || !this.#filterTribeSelect?.length || !this.#filterTypeSelect?.length || !this.#filterNameInput?.length) {
             console.warn("DeckBuilderUI: Cannot populate filters, one or more filter elements missing.");
             return;
         }
        this.#filterCostSelect.children('option:not(:first-child)').remove();
        this.#filterTribeSelect.children('option:not(:first-child)').remove();
        this.#filterTypeSelect.children('option:not(:first-child)').remove();

        if(!this._filtersPopulated) {
            this.#filterTypeSelect.val('');
            this.#filterNameInput.val('');
            this.#filterCostSelect.val('');
            this.#filterTribeSelect.val('');
        }

        const costs = new Set(), tribes = new Set(), types = new Set();
        (uniqueCollectionIds || []).forEach(id => { // Agora uniqueCollectionIds são as chaves de userCardQuantities
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
        console.log("DeckBuilderUI: Filters populated.");
    }

    // ======================================================================
    // _renderCollectionPanel MODIFICADO
    // ======================================================================
    _renderCollectionPanel() {
        if (!this.#collectionListElement || !this.#collectionCountSpan?.length) {
            console.error("DeckBuilderUI: Collection list element or count span not found for rendering.");
            return;
        }
        const $container = $(this.#collectionListElement).empty();
        const uniqueCardIdsInCollection = Object.keys(this.#dbState.userCardQuantities);
        this.#collectionCountSpan.text(uniqueCardIdsInCollection.length);

        if (uniqueCardIdsInCollection.length === 0) {
             $container.append('<p class="placeholder-message">Coleção vazia.</p>');
             return;
        }

        const fN = this.#filterNameInput?.val().toLowerCase() ?? '';
        const fT = this.#filterTypeSelect?.val() ?? '';
        const fC = this.#filterCostSelect?.val() ?? '';
        const fR = this.#filterTribeSelect?.val() ?? '';
        let cardsRendered = 0;

        uniqueCardIdsInCollection.forEach(cardId => {
            const cd = this.#cardDatabase[cardId];
            if (cd) {
                if (fN && !cd.name.toLowerCase().includes(fN)) return;
                if (fT && cd.type !== fT) return;
                if (fC) { const costVal = cd.cost >= 7 ? '7+' : (cd.cost ?? 0).toString(); if (costVal !== fC) return; }
                if (fR && (cd.tribe || 'None') !== fR) return;

                const totalOwned = this.#dbState.userCardQuantities[cardId] || 0;
                const countInDeck = this.#dbState.currentDeckCards.filter(id => id === cardId).length;
                const availableToAdd = totalOwned - countInDeck; // Quantidade que ainda pode ser adicionada

                // Renderiza o card na coleção com a quantidade *disponível para adicionar ao deck*
                // Ou, se preferir mostrar a quantidade total possuída sempre, use 'totalOwned'
                const $mc = this.#cardRenderer.renderMiniCard(cd, 'collection', availableToAdd);

                if ($mc) {
                    // Se availableToAdd for 0, pode adicionar uma classe para indicar visualmente
                    if (availableToAdd <= 0) {
                        $mc.addClass('no-more-copies'); // Adicione estilos CSS para .no-more-copies (ex: opacity)
                    }
                    $container.append($mc);
                    cardsRendered++;
                }
            }
        });

        if (cardsRendered === 0 && uniqueCardIdsInCollection.length > 0) {
            $container.append('<p class="placeholder-message">(Nenhuma carta corresponde aos filtros ou não há mais cópias disponíveis)</p>');
        }
    }
    // ======================================================================

    _renderDeckPanel() {
        // ... (mesmo _renderDeckPanel da sua última versão, ele já usa quantidades) ...
        if (!this.#deckListElement) {
            console.error("DeckBuilderUI: Deck list element not found for rendering.");
            return;
        }
        const $container = $(this.#deckListElement).empty();

        const cardCountsInDeck = {};
        this.#dbState.currentDeckCards.forEach(id => {
            cardCountsInDeck[id] = (cardCountsInDeck[id] || 0) + 1;
        });

        const uniqueCardIdsInDeck = Object.keys(cardCountsInDeck).sort((a, b) => {
            const cardA = this.#cardDatabase[a];
            const cardB = this.#cardDatabase[b];
            if (!cardA || !cardB) return 0;
            if ((cardA.cost ?? 0) !== (cardB.cost ?? 0)) return (cardA.cost ?? 0) - (cardB.cost ?? 0);
            return (cardA.name ?? '').localeCompare(cardB.name ?? '');
        });

        uniqueCardIdsInDeck.forEach(cardId => {
            const cardDef = this.#cardDatabase[cardId];
            const quantity = cardCountsInDeck[cardId];
            if (cardDef && quantity > 0) {
                const $mc = this.#cardRenderer.renderMiniCard(cardDef, 'deck', quantity);
                if ($mc) {
                    $container.append($mc);
                }
            }
        });

        if (uniqueCardIdsInDeck.length === 0) {
             $container.append('<p class="placeholder-message">(Arraste cartas da coleção para cá)</p>');
        }
        this._updateDeckValidity();
    }

    _initializeSortables() {
        // ... (mesmo _initializeSortables da sua última versão) ...
        // A lógica de onAdd e onRemove já interage com _addCardToDeck e _removeCardFromDeck,
        // que por sua vez chamam _renderCollectionPanel para atualizar as quantidades.
        if (this.#collectionSortable) try { this.#collectionSortable.destroy(); } catch(e) { console.warn("Error destroying old collection sortable:", e); }
        if (this.#deckSortable) try { this.#deckSortable.destroy(); } catch(e) { console.warn("Error destroying old deck sortable:", e); }
        this.#collectionSortable = null;
        this.#deckSortable = null;

        if (!this.#collectionListElement || !this.#deckListElement) {
            console.error("DeckBuilderUI Error: Sortable list DOM elements not found during SortableJS initialization.");
            return;
        }
        const self = this;

        const commonSortableOptions = {
            animation: 150,
            filter: '.placeholder-message, .no-more-copies', // Adiciona .no-more-copies ao filtro
            preventOnFilter: false,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
             onStart: function (evt) {
                if (evt.from === self.#deckListElement) {
                     $('body').addClass('dragging-from-deck').removeClass('dragging-from-collection');
                } else {
                     $('body').addClass('dragging-from-collection').removeClass('dragging-from-deck');
                }
             },
             onEnd: function (evt) {
                 $('body').removeClass('dragging-from-deck dragging-from-collection drag-over-body');
                 $(self.#collectionListElement).removeClass('drag-over drag-removal');
                 $(self.#deckListElement).removeClass('drag-over');
                //  A coleção é re-renderizada em _addCardToDeck e _removeCardFromDeck se necessário
                //  self._renderCollectionPanel(); // Pode não ser necessário aqui, mas não deve prejudicar
             },
             onMove: function (evt) {
                 $(self.#collectionListElement).removeClass('drag-over drag-removal');
                 $(self.#deckListElement).removeClass('drag-over');
                 $(evt.to).addClass('drag-over');

                 const isOverDeck = $(evt.to).is(self.#deckListElement);
                 const isOverCollection = $(evt.to).is(self.#collectionListElement);
                 const draggingFromDeck = $(evt.from).is(self.#deckListElement);
                 const isOverBodyOrOutside = !isOverDeck && !isOverCollection;

                 // Adiciona feedback visual de "remoção" se arrastar do deck para a coleção (ou body)
                 const canBeRemovedToCollection = draggingFromDeck && (isOverCollection || isOverBodyOrOutside);
                 $(self.#collectionListElement).toggleClass('drag-removal', canBeRemovedToCollection);
                 $('body').toggleClass('drag-over-body', draggingFromDeck && isOverBodyOrOutside);


                // Impede o drop na coleção se a carta não puder ser adicionada ao deck
                // (Este onMove é para o drag SOBRE o destino, não a ação final)
                if (evt.to === self.#deckListElement && $(evt.dragged).hasClass('no-more-copies')) {
                    return false; // Impede de soltar na lista de deck se não há mais cópias
                }
             },
        };

        this.#collectionSortable = new Sortable(this.#collectionListElement, {
            ...commonSortableOptions,
            group: { name: 'deckBuilderShared', pull: 'clone', put: true },
            sort: false,
            onAdd: function (evt) {
                if (evt.from === self.#deckListElement) {
                    const cardId = $(evt.item).data('card-id');
                    if (self._removeCardFromDeck(cardId)) { // remove do estado e re-renderiza coleção
                        self._renderDeckPanel();
                    }
                }
                $(evt.item).remove();
                $(evt.to).removeClass('drag-over');
            }
        });

        this.#deckSortable = new Sortable(this.#deckListElement, {
            ...commonSortableOptions,
            group: { name: 'deckBuilderShared', pull: true, put: true },
            sort: true,
            onAdd: function (evt) {
                const cardId = $(evt.item).data('card-id');
                // Verifica se o item arrastado da coleção tinha a classe 'no-more-copies'
                const noMoreCopies = $(evt.item).hasClass('no-more-copies');

                if (noMoreCopies) {
                    self._showMessage("Você não possui mais cópias desta carta para adicionar.", "orange");
                    self.#audioManager?.playSFX('genericError');
                    $(evt.item).remove(); // Remove o clone que foi tentado adicionar
                    $(evt.to).removeClass('drag-over');
                    // Re-renderiza a coleção para garantir que o item original ainda esteja lá com a classe correta
                    self._renderCollectionPanel();
                    return; // Interrompe a adição
                }

                if (self._addCardToDeck(cardId)) { // _addCardToDeck já re-renderiza a coleção
                    self._renderDeckPanel();
                }
                $(evt.item).remove();
                $(evt.to).removeClass('drag-over');
            },
            onRemove: function (evt) {
                const cardId = $(evt.item).data('card-id');
                if (evt.to !== self.#collectionListElement) { // Se não foi para a coleção (foi para o "vazio")
                    if (self._removeCardFromDeck(cardId)) { // remove do estado e re-renderiza coleção
                        self._renderDeckPanel();
                    }
                }
                // Se foi para a coleção, o onAdd da coleção já tratou.
                $(evt.from).removeClass('drag-over');
                $('body').removeClass('drag-over-body');
                $(self.#collectionListElement).removeClass('drag-removal');
            },
            onUpdate: function (evt) {
                const newOrderedDeckState = [];
                $(self.#deckListElement).children('.mini-card:not(.sortable-fallback)').each((i, el) => {
                    const cardId = $(el).data('card-id');
                    const quantityText = $(el).find('.mini-card-quantity').text();
                    const quantity = parseInt(quantityText.replace('x', ''), 10) || 1;
                    for (let q = 0; q < quantity; q++) {
                        newOrderedDeckState.push(cardId);
                    }
                });
                self.#dbState.currentDeckCards = newOrderedDeckState;
                self.#audioManager?.playSFX('cardDraw');
                self._updateDeckValidity();
            },
        });
        console.log("DeckBuilderUI: SortableJS instances initialized/re-initialized.");
    }

    destroy() {
        console.log("DeckBuilderUI: Destroying...");
        const namespace = '.deckbuilder';
        // Desvincula eventos
        this.#deckBuilderScreenElement?.off(namespace);
        $('#deckbuilder-image-zoom-overlay')?.off(namespace);

        // Destrói as instâncias do SortableJS
        if (this.#collectionSortable) try { this.#collectionSortable.destroy(); } catch(e) { console.warn("Error destroying collection sortable:", e);}
        if (this.#deckSortable) try { this.#deckSortable.destroy(); } catch(e) { console.warn("Error destroying deck sortable:", e); }
        this.#collectionSortable = null;
        this.#deckSortable = null;
        
        this._filtersPopulated = false;
        console.log("DeckBuilderUI: Destroy complete.");
    }
}