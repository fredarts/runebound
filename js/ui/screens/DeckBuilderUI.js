// js/ui/screens/DeckBuilderUI.js

// Importar dependências (presumindo que CardRenderer e ZoomHandler estão em ../helpers/)
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

    // --- Elementos da UI (Cache) ---
    #deckBuilderScreenElement;
    #collectionListElement;
    #deckListElement;
    #deckNameInput;
    #deckCountDisplay; // Para o contador no painel direito
    #deckCountTop;     // Para o contador na barra superior
    #deckValiditySpan;
    #saveButton;
    #messageParagraph;
    #titleElement;
    #collectionCountSpan;

    // --- Estado Interno ---
    #dbState = {
        currentDeckId: null,
        currentDeckName: '',
        currentDeckCards: [],
        isEditing: false,
        MAX_COPIES_PER_CARD: 4
    };

    // --- SortableJS Instances ---
    #collectionSortable = null;
    #deckSortable = null;

    constructor(screenManager, accountManager, cardDatabase, cardRenderer, zoomHandler) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;
        this.#cardRenderer = cardRenderer;
        this.#zoomHandler = zoomHandler;

        // Cache dos seletores principais
        this.#deckBuilderScreenElement = $('#deck-builder-screen');
        if (!this.#deckBuilderScreenElement.length) {
            console.error("DeckBuilderUI Error: Element #deck-builder-screen not found!");
            return;
        }
        this.#collectionListElement = this.#deckBuilderScreenElement.find('#db-available-cards')[0]; // Precisa do elemento DOM para Sortable
        this.#deckListElement = this.#deckBuilderScreenElement.find('#db-current-deck')[0];     // Precisa do elemento DOM para Sortable
        this.#deckNameInput = this.#deckBuilderScreenElement.find('#db-deck-name');
        this.#deckCountDisplay = this.#deckBuilderScreenElement.find('#db-deck-count-display'); // No painel direito
        this.#deckCountTop = this.#deckBuilderScreenElement.find('#db-deck-count'); // Na barra superior
        this.#deckValiditySpan = this.#deckBuilderScreenElement.find('#db-deck-validity');
        this.#saveButton = this.#deckBuilderScreenElement.find('#btn-save-deck');
        this.#messageParagraph = this.#deckBuilderScreenElement.find('#deck-builder-message');
        this.#titleElement = this.#deckBuilderScreenElement.find('#deck-builder-title');
        this.#collectionCountSpan = this.#deckBuilderScreenElement.find('#db-collection-count');


        this._bindEvents(); // Vincula eventos da tela uma vez
        console.log("DeckBuilderUI initialized.");
    }

    /**
     * Renderiza a tela do Deck Builder, carregando um deck existente ou preparando para um novo.
     * @param {string | null} [deckIdToEdit=null] - O ID do deck a ser editado, ou null para criar um novo.
     */
    render(deckIdToEdit = null) {
        console.log(`DeckBuilderUI: Rendering screen. Edit ID: ${deckIdToEdit}`);
        this._resetState(); // Limpa o estado anterior

        const currentUser = this.#accountManager.getCurrentUser();
        const collection = this.#accountManager.getCollection();

        if (!currentUser || !Array.isArray(collection)) {
            console.error("DeckBuilderUI Error: Cannot render - User/collection invalid.");
            this.#screenManager.showScreen('profile-screen');
            alert("Erro ao carregar coleção do usuário para o Deck Builder.");
            return;
        }

        if (deckIdToEdit) {
            this._loadDeckForEditing(deckIdToEdit, collection);
        } else {
            this.#titleElement.text('Criar Novo Deck');
            this.#deckNameInput.val('');
        }

        this._populateFilters(collection);
        this._renderCollectionPanel(collection); // Renderiza coleção e inicializa Sortable
        this._renderDeckPanel();                 // Renderiza o painel do deck (vazio ou carregado)
        this._updateDeckValidity();              // Atualiza a validade inicial

        console.log("DeckBuilderUI: Render complete.");
    }

    /** Vincula eventos específicos da tela do Deck Builder */
    _bindEvents() {
        console.log("DeckBuilderUI: Binding events...");

        // Botões
        this.#deckBuilderScreenElement.on('click', '#btn-save-deck', this._handleSaveDeck.bind(this));
        this.#deckBuilderScreenElement.on('click', '#btn-clear-deck', this._handleClearDeck.bind(this));
        this.#deckBuilderScreenElement.on('click', '#btn-deck-builder-back', this._handleBackButton.bind(this));

        // Filtros
        this.#deckBuilderScreenElement.on('input', '#db-filter-name', this._handleFilterChange.bind(this));
        this.#deckBuilderScreenElement.on('change', '#db-filter-type, #db-filter-cost, #db-filter-tribe', this._handleFilterChange.bind(this));

        // Input Nome do Deck
        this.#deckBuilderScreenElement.on('input', '#db-deck-name', this._handleDeckNameInput.bind(this));

        // Zoom de Cartas (usando o ZoomHandler injetado)
        this.#deckBuilderScreenElement.on('contextmenu', '#db-available-cards .mini-card', (event) => {
            this.#zoomHandler.handleZoomClick(event); // Delega ao handler
        });
         this.#deckBuilderScreenElement.on('contextmenu', '#db-current-deck .mini-card', (event) => {
            this.#zoomHandler.handleZoomClick(event); // Delega ao handler
        });
        // Prevenir menu contexto default
        this.#deckBuilderScreenElement.on('contextmenu', '.mini-card', (e) => e.preventDefault());

        // Fechar overlay de zoom específico do Deck Builder
        $('#deckbuilder-image-zoom-overlay').off('click.dbzoom').on('click.dbzoom', (event) => {
            if (event.target === event.currentTarget) {
                this.#zoomHandler.closeZoom(); // Delega ao handler
            }
        });
    }

    // --- Métodos de Lógica e Estado Interno ---

    _resetState() {
        this.#dbState = {
            currentDeckId: null,
            currentDeckName: '',
            currentDeckCards: [],
            isEditing: false,
            MAX_COPIES_PER_CARD: 4
        };
        this.#messageParagraph.text(''); // Limpa mensagens
        console.log("DeckBuilderUI: State reset.");
    }

    _loadDeckForEditing(deckId, collection) {
        const decks = this.#accountManager.loadDecks();
        const deckToLoad = decks?.[deckId];
        if (deckToLoad) {
            this.#dbState.currentDeckId = deckId;
            this.#dbState.currentDeckName = deckToLoad.name;
            this.#dbState.currentDeckCards = deckToLoad.cards.filter(cardId => collection.includes(cardId));
            if (this.#dbState.currentDeckCards.length !== deckToLoad.cards.length) {
                 this.#messageParagraph.text('Algumas cartas salvas não estão na sua coleção e foram removidas.').css('color', 'orange');
            }
            this.#dbState.isEditing = true;
            this.#titleElement.text(`Editando: ${deckToLoad.name}`);
            this.#deckNameInput.val(deckToLoad.name);
            console.log(`DeckBuilderUI: Loaded deck '${deckToLoad.name}' for editing.`);
        } else {
            console.warn(`DeckBuilderUI: Deck ID ${deckId} not found for editing.`);
            this.#titleElement.text('Criar Novo Deck');
            this.#deckNameInput.val('');
        }
    }

    _addCardToDeck(cardId) {
        if (!cardId) return false;
        const currentCountInDeck = this.#dbState.currentDeckCards.filter(id => id === cardId).length;
        const cardName = this.#cardDatabase[cardId]?.name || cardId;

        if (currentCountInDeck >= this.#dbState.MAX_COPIES_PER_CARD) {
            this._showMessage(`Máx ${this.#dbState.MAX_COPIES_PER_CARD} de "${cardName}".`, 'orange');
            return false;
        }
        if (this.#dbState.currentDeckCards.length >= 40) {
            this._showMessage('Máx 40 cartas.', 'orange');
            return false;
        }

        this.#dbState.currentDeckCards.push(cardId);
        console.log(`DeckBuilderUI State: Added ${cardId}. New count: ${this.#dbState.currentDeckCards.length}`);
        this._updateDeckValidity();
        this._showMessage(''); // Clear message
        return true;
    }

    _removeCardFromDeck(cardId) {
        if (!cardId) return false;
        const initialLength = this.#dbState.currentDeckCards.length;
        const index = this.#dbState.currentDeckCards.indexOf(cardId);
        console.log(`_removeCardFromDeck: Trying to remove ${cardId}. Index: ${index}`);
    
        if (index > -1) {
            this.#dbState.currentDeckCards.splice(index, 1);
             if (this.#dbState.currentDeckCards.length < initialLength) {
                  console.log(`DeckBuilderUI State: OK removed ${cardId}. New count: ${this.#dbState.currentDeckCards.length}`);
                  this._updateDeckValidity(); // Atualiza a UI após remover do estado
                  return true;
             } else { console.error(`DeckBuilderUI State: Error splicing ${cardId}?`); return false; }
        }
        console.warn("DeckBuilderUI State: ID not found, cannot remove:", cardId);
        return false;
    }
    
    _updateDeckValidity() {
        const count = this.#dbState.currentDeckCards.length;
        const min = 30; const max = 40;
        const isValid = count >= min && count <= max;
        const deckName = this.#deckNameInput.val().trim();

        // Atualiza ambos os contadores
        this.#deckCountDisplay.text(count);
        this.#deckCountTop.text(count);

        if (isValid) {
            this.#deckValiditySpan.text('(Válido)').css('color', 'var(--valid-color)');
        } else if (count < min) {
            this.#deckValiditySpan.text(`(Mín ${min})`).css('color', 'var(--invalid-color)');
        } else {
            this.#deckValiditySpan.text(`(Máx ${max})`).css('color', 'var(--invalid-color)');
        }
        this.#saveButton.prop('disabled', !isValid || !deckName);
    }

    _showMessage(text, color = 'lightblue', duration = 3000) {
         this.#messageParagraph.text(text).css('color', `var(--${color}-color, ${color})`); // Usa variável CSS ou cor direta
         if (duration > 0) {
             setTimeout(() => {
                 if (this.#messageParagraph.text() === text) { // Só limpa se a mensagem ainda for a mesma
                     this.#messageParagraph.text('');
                 }
             }, duration);
         }
     }

    // --- Handlers de Eventos ---

    _handleSaveDeck() {
        const deckName = this.#deckNameInput.val().trim();
        if (!deckName) { this._showMessage('Dê um nome ao deck.', 'orange'); return; }
        const cardIds = this.#dbState.currentDeckCards;
        if (!this.#saveButton.prop('disabled')) { // Verifica se o botão está habilitado (indica validade)
            const deckId = this.#dbState.isEditing && this.#dbState.currentDeckId ? this.#dbState.currentDeckId : `deck_${Date.now()}`;
            const result = this.#accountManager.saveDeck(deckId, deckName, cardIds);
            this._showMessage(result.message, result.success ? 'success' : 'error');
            if (result.success) {
                 this.#dbState.isEditing = true; this.#dbState.currentDeckId = deckId;
                 this.#titleElement.text(`Editando: ${deckName}`);
                 // Não volta automaticamente, permite continuar editando
            }
        } else {
             this._showMessage('Deck inválido ou sem nome.', 'orange');
        }
     }

    _handleClearDeck() {
        if (confirm('Limpar deck atual? Isso removerá todas as cartas.')) {
            this.#dbState.currentDeckCards = [];
            this._renderDeckPanel(); // Re-renderiza o painel do deck (vazio)
            this._initializeSortables(); // Re-inicializa para garantir que o alvo de drop funcione
            this._showMessage('Deck limpo.', 'lightblue');
        }
    }

    _handleFilterChange() {
        this._renderCollectionPanel(this.#accountManager.getCollection() || []);
        // Sortable é re-inicializado dentro de _renderCollectionPanel
    }

    _handleDeckNameInput() {
        this.#dbState.currentDeckName = this.#deckNameInput.val();
        this._updateDeckValidity(); // Valida se o botão save deve ser habilitado
    }

    _handleBackButton() {
         this.#screenManager.showScreen('profile-screen');
         // O ProfileScreenUI.render() será chamado pelo UIManager ou main.js ao navegar para lá
    }

    // --- Métodos de Renderização Privados ---

    _populateFilters(collectionIds) {
        const $costFilter = this.#deckBuilderScreenElement.find('#db-filter-cost');
        const $tribeFilter = this.#deckBuilderScreenElement.find('#db-filter-tribe');
        $costFilter.children('option:not(:first-child)').remove();
        $tribeFilter.children('option:not(:first-child)').remove();
        const costs = new Set(), tribes = new Set();
        collectionIds.forEach(id => { const cd = this.#cardDatabase[id]; if(cd) { costs.add(cd.cost >= 7 ? '7+' : cd.cost.toString()); if (cd.tribe && cd.tribe !== 'None') tribes.add(cd.tribe); }});
        [...costs].sort((a, b) => (a === '7+' ? Infinity : parseInt(a)) - (b === '7+' ? Infinity : parseInt(b))).forEach(c => $costFilter.append(`<option value="${c}">${c}</option>`));
        [...tribes].sort().forEach(t => $tribeFilter.append(`<option value="${t}">${t}</option>`));
    }

    _renderCollectionPanel(collectionIds) {
        const $container = $(this.#collectionListElement).empty(); // Usa o elemento DOM cacheado
        this.#collectionCountSpan.text(collectionIds?.length || 0);

        if (!Array.isArray(collectionIds)) { $container.append('<p class="placeholder-message">Erro coleção.</p>'); return; }

        const fN = this.#deckBuilderScreenElement.find('#db-filter-name').val().toLowerCase();
        const fT = this.#deckBuilderScreenElement.find('#db-filter-type').val();
        const fC = this.#deckBuilderScreenElement.find('#db-filter-cost').val();
        const fR = this.#deckBuilderScreenElement.find('#db-filter-tribe').val();
        let cardsRendered = 0;

        collectionIds.forEach(id => {
            const cd = this.#cardDatabase[id];
            if (cd) {
                if (fN && !cd.name.toLowerCase().includes(fN)) return;
                if (fT && cd.type !== fT) return;
                if (fC) { if (fC === '7+' && cd.cost < 7) return; if (fC !== '7+' && cd.cost != fC) return; }
                if (fR && (cd.tribe || 'None') !== fR) return;
                const $mc = this.#cardRenderer.renderMiniCard(cd, 'collection'); // Usa o helper
                if ($mc) { $container.append($mc); cardsRendered++; }
            }
        });

        if (cardsRendered === 0 && collectionIds.length > 0) $container.append('<p class="placeholder-message">(Nenhuma carta corresponde)</p>');
        else if (collectionIds.length === 0) $container.append('<p class="placeholder-message">(Coleção vazia)</p>');

        console.log(`DeckBuilderUI: Rendered ${cardsRendered} collection cards.`);
        this._initializeSortables(); // Re-inicializa após renderizar
    }

    _renderDeckPanel() {
        const $container = $(this.#deckListElement).empty(); // Usa o elemento DOM cacheado
        console.log("DeckBuilderUI: Rendering Deck Panel. Current cards:", this.#dbState.currentDeckCards);

        this.#dbState.currentDeckCards.forEach(id => {
            if (this.#cardDatabase[id]) {
                const $mc = this.#cardRenderer.renderMiniCard(this.#cardDatabase[id], 'deck'); // Usa o helper
                if ($mc) $container.append($mc);
            } else {
                console.warn(`DeckBuilderUI: Card ID '${id}' in deck state not found in database.`);
            }
        });

        if (this.#dbState.currentDeckCards.length === 0) {
             $container.append('<p class="placeholder-message">(Arraste cartas da coleção para cá)</p>');
        }
        // Não chama _updateDeckValidity aqui, é chamado por quem chama _renderDeckPanel
        // Não chama _initializeSortables aqui, é chamado por _renderCollectionPanel
    }


    // --- SortableJS Initialization & Re-initialization ---
    _initializeSortables() {
        if (this.#collectionSortable) this.#collectionSortable.destroy();
        if (this.#deckSortable) this.#deckSortable.destroy();
    
        if (!this.#collectionListElement || !this.#deckListElement) {
            console.error("DeckBuilderUI Error: Sortable list DOM elements not found.");
            return;
        }
        console.log("DeckBuilderUI: Initializing/Re-initializing SortableJS...");
        const self = this;
    
        const commonSortableOptions = {
            animation: 150,
            filter: '.placeholder-message',
            preventOnFilter: false,
            onMove: function (evt) {
                $(evt.to).addClass('drag-over');
                const $relatedList = $(evt.related).closest('.card-list');
                if ($relatedList.is(self.#collectionListElement)) {
                    $relatedList.addClass('drag-over');
                }
                if (!$relatedList.length) { $('body').addClass('drag-over-body'); }
                else { $('body').removeClass('drag-over-body'); }
            },
            onUnchoose: function(evt) {
                $('.card-list').removeClass('drag-over');
                $('body').removeClass('drag-over-body');
            }
        };
    
        this.#collectionSortable = new Sortable(this.#collectionListElement, {
            ...commonSortableOptions,
            group: { name: 'deckBuilderShared', pull: 'clone', put: true }, // Adicionado put:true para permitir que cards sejam colocados de volta
            sort: false,
            onStart: () => { $('body').removeClass('dragging-from-deck'); }
        });
    
        this.#deckSortable = new Sortable(this.#deckListElement, {
            ...commonSortableOptions,
            group: { name: 'deckBuilderShared', pull: true, put: true },
            sort: true,
            onAdd: function (evt) {
                const cardId = $(evt.item).data('card-id');
                const added = self._addCardToDeck(cardId);
                if (!added) $(evt.item).remove();
                $(evt.to).removeClass('drag-over');
            },
            onRemove: function (evt) {
                const cardId = $(evt.item).data('card-id');
                console.log(`Removing card from deck: ${cardId}`); // Debug log
                const removed = self._removeCardFromDeck(cardId);
                if (!removed) console.warn(`Failed to remove ${cardId} from state.`);
                
                // Adiciona sinalização vermelha no container da coleção
                $(self.#collectionListElement).addClass('drag-removal');
                
                // Remove a classe após 500ms para limpar o efeito
                setTimeout(() => {
                    $(self.#collectionListElement).removeClass('drag-removal');
                }, 500);
                
                $('body').removeClass('drag-over-body');
                $(evt.from).removeClass('drag-over');
            },
            onUpdate: function (evt) {
                setTimeout(() => {
                    self.#dbState.currentDeckCards = $(self.#deckListElement).children('.mini-card').map((i, el) => $(el).data('card-id')).get();
                    self._updateDeckValidity();
                    console.log("DeckBuilderUI State: Deck reordered", self.#dbState.currentDeckCards);
                }, 0);
            },
            onStart: () => { $('body').addClass('dragging-from-deck'); },
            onEnd: () => { $('body').removeClass('dragging-from-deck'); }
        });
        console.log("DeckBuilderUI: SortableJS initialized/re-initialized.");
    }
}

