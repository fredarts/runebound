// js/ui/screens/DeckManagementScreenUI.js - ATUALIZADO (v2.6 Audio Fix)

import CardRenderer from '../helpers/CardRenderer.js';
import ZoomHandler from '../helpers/ZoomHandler.js';

export default class DeckManagementScreenUI {
    // --- Core References ---
    #screenManager;
    #accountManager;
    #cardDatabase;
    #cardRenderer;
    #zoomHandler;
    #uiManager; // Para navegação
    #audioManager; // Para tocar sons

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
    #btnCreateNewDeck; // Cache do botão

    constructor(screenManager, accountManager, cardDatabase, cardRenderer, zoomHandler, uiManager, audioManager) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;
        this.#cardRenderer = cardRenderer;
        this.#zoomHandler = zoomHandler;
        this.#uiManager = uiManager;
        this.#audioManager = audioManager; // Armazena AudioManager

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
        // Botão
        this.#btnCreateNewDeck = this.#screenElement.find('#btn-create-new-deck');
    }

    _bindEvents() {
        console.log("DeckManagementScreenUI: Binding events...");
        const self = this; // Para usar em callbacks

        // Helper para áudio (opcional, mas limpo)
        const addAudio = ($el, click = 'buttonClick', hover = 'buttonHover') => {
            $el.off('click.dmsaudio mouseenter.dmsaudio'); // Limpa listeners antigos
            $el.on('click.dmsaudio', () => this.#audioManager?.playSFX(click));
            $el.on('mouseenter.dmsaudio', () => this.#audioManager?.playSFX(hover));
        };

        // Hover para os itens da lista de deck (com botões)
        this.#deckListElement.off('mouseenter', 'li').on('mouseenter', 'li', (event) => {
            if($(event.currentTarget).find('button').length > 0) {
                this.#audioManager?.playSFX('buttonHover');
            }
        });

        // Botões na lista de decks (delegação de eventos)
        this.#deckListElement.off('click', '.btn-edit-deck').on('click', '.btn-edit-deck', (event) => {
            this.#audioManager?.playSFX('buttonClick'); // Som de clique
            this._handleEditDeck(event);
        });
        this.#deckListElement.off('click', '.btn-delete-deck').on('click', '.btn-delete-deck', (event) => {
            this.#audioManager?.playSFX('buttonClick'); // Som de clique
            this._handleDeleteDeck(event);
        });

        // Botão Criar Novo Deck
        this.#btnCreateNewDeck.off('click').on('click', this._handleCreateNewDeck.bind(this));
        addAudio(this.#btnCreateNewDeck); // Adiciona sons de clique/hover

        // Filtros da Coleção
        this.#screenElement.off('input.dmsfilter change.dmsfilter')
            .on('input.dmsfilter', '#deck-mgmt-filter-name', this._handleFilterChange.bind(this))
            .on('change.dmsfilter', '#deck-mgmt-filter-type, #deck-mgmt-filter-cost, #deck-mgmt-filter-tribe', this._handleFilterChange.bind(this));
        // Opcional: Adicionar som sutil ao filtro mudar (pode ser irritante)
        // this.#screenElement.find('#deck-mgmt-filter-type, #deck-mgmt-filter-cost, #deck-mgmt-filter-tribe')
        //     .on('change.dmsfilter', () => this.#audioManager?.playSFX('filterChangeSound')); // Precisa definir 'filterChangeSound'

        // Zoom na Coleção (usando o ZoomHandler)
        this.#collectionElement.off('contextmenu', '.mini-card').on('contextmenu', '.mini-card', (event) => {
            event.preventDefault(); // Prevenir menu de contexto padrão
            // Som para zoom? Talvez não seja necessário ou usar um som específico
            // self.#audioManager?.playSFX('zoomCard');
            this.#zoomHandler.handleZoomClick(event); // Delega ao ZoomHandler
        });

        // Fechar Zoom Overlay Específico
        $('#deck-management-zoom-overlay').off('click.deckmgmtzoom').on('click.deckmgmtzoom', (event) => {
            if (event.target === event.currentTarget) { // Só fecha se clicar no fundo escuro
                this.#zoomHandler.closeZoom();
            }
        });

        // Botão Voltar (se houver um específico para esta tela, adicione aqui)
        // Exemplo: $('#btn-deck-mgmt-back').on('click', () => this.#screenManager.showScreen('home-screen'));
    }

    /** Renderiza a tela buscando dados atuais */
    render() {
        console.log("DeckManagementScreenUI: Rendering...");
        this.#messageParagraph.text(''); // Limpa mensagens anteriores
        const currentUser = this.#accountManager.getCurrentUser();
        if (!currentUser) {
            console.warn("DeckManagementScreenUI: No user logged in.");
            this.#screenManager.showScreen('login-screen'); // Redireciona para login
            return;
        }

        const collection = this.#accountManager.getCollection() || []; // Garante que é um array
        const decks = this.#accountManager.loadDecks() || {}; // Garante que é um objeto

        this._populateFilters(collection);
        this._renderDeckList(decks);
        this._renderCollection(collection); // Renderiza coleção aplicando filtros
    }

    // --- Handlers de Eventos ---

    _handleCreateNewDeck() {
        console.log("DeckManagementScreenUI: Create new deck requested.");
        // O som de clique já é tocado pelo listener do botão

        this.#uiManager.renderDeckBuilderScreen(); // Chama UIManager para preparar o DeckBuilder (sem ID)
        this.#screenManager.showScreen('deck-builder-screen'); // Mostra a tela do builder
        this.#audioManager?.playBGM('deck-builder-screen'); // Toca BGM do builder
    }

    _handleEditDeck(event) {
        const deckId = $(event.currentTarget).closest('li').data('deck-id');
        if (deckId) {
            console.log(`DeckManagementScreenUI: Edit deck requested: ${deckId}`);
             // O som de clique já é tocado pelo listener do botão

            this.#uiManager.renderDeckBuilderScreen(deckId); // Chama UIManager para preparar o DeckBuilder com ID
            this.#screenManager.showScreen('deck-builder-screen'); // Mostra a tela do builder
            this.#audioManager?.playBGM('deck-builder-screen'); // Toca BGM do builder
        }
    }

    _handleDeleteDeck(event) {
        const $li = $(event.currentTarget).closest('li');
        const deckId = $li.data('deck-id');
        const deckName = $li.find('.deck-name').text().split('(')[0].trim(); // Extrai nome

        if (deckId && confirm(`Tem certeza que deseja excluir o deck "${deckName}"?`)) {
             // O som de clique já é tocado pelo listener do botão

            const result = this.#accountManager.deleteDeck(deckId);
            if (result.success) {
                console.log(`DeckManagementScreenUI: Deck ${deckId} deleted.`);
                this._showMessage(`Deck "${deckName}" excluído.`, 'success');
                // Opcional: Tocar som de sucesso
                // this.#audioManager?.playSFX('actionSuccess');
                this.render(); // Re-renderiza a lista de decks e coleção
            } else {
                this._showMessage(`Erro ao excluir deck: ${result.message}`, 'error');
                console.error(`Error deleting deck: ${result.message}`);
                // Som de erro já é tocado por _showMessage
            }
        } else {
             // Toca som de cancelamento/erro se não confirmar
             if (!deckId) console.error("DeckManagementScreenUI: Delete failed, no deckId found.");
             // this.#audioManager?.playSFX('actionCancel'); // Opcional
        }
    }

    _handleFilterChange() {
        // O som de mudança de filtro é opcional, pode ser adicionado no bindEvents
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
        // Limpa opções existentes (exceto a primeira "Todos")
        this.#filterCostSelect.children('option:not(:first-child)').remove();
        this.#filterTribeSelect.children('option:not(:first-child)').remove();

        const costs = new Set();
        const tribes = new Set();

        (collectionIds || []).forEach(id => {
             const cd = this.#cardDatabase[id];
             if(cd) {
                 const costVal = cd.cost >= 7 ? '7+' : (cd.cost ?? 0).toString();
                 costs.add(costVal);
                 tribes.add(cd.tribe || 'None'); // Inclui 'None' para cartas sem tribo
             }
        });

        // Ordena e adiciona custos
        [...costs].sort((a, b) => {
            const valA = a === '7+' ? Infinity : parseInt(a);
            const valB = b === '7+' ? Infinity : parseInt(b);
            return valA - valB;
        }).forEach(c => this.#filterCostSelect.append(`<option value="${c}">${c}</option>`));

        // Ordena e adiciona tribos
        [...tribes].sort((a, b) => {
             // Coloca 'None' no final ou começo, se desejado
             if (a === 'None') return 1;
             if (b === 'None') return -1;
             return a.localeCompare(b);
        }).forEach(t => this.#filterTribeSelect.append(`<option value="${t}">${t === 'None' ? 'Sem Tribo' : t}</option>`));
    }

    _renderCollection(collectionIds) {
        this.#collectionElement.empty();
        const safeCollectionIds = collectionIds || []; // Garante que é um array
        this.#collectionCountSpan.text(safeCollectionIds.length);

        if (safeCollectionIds.length === 0) {
            this.#collectionElement.append('<p class="placeholder-message">(Nenhuma carta na coleção)</p>');
            return;
        }

        // Pega valores dos filtros
        const filterName = this.#filterNameInput.val().toLowerCase();
        const filterType = this.#filterTypeSelect.val();
        const filterCost = this.#filterCostSelect.val();
        const filterTribe = this.#filterTribeSelect.val();
        let cardsRendered = 0;

        safeCollectionIds.forEach(id => {
            const cardDef = this.#cardDatabase[id];
            if (cardDef) {
                // Aplica filtros
                if (filterName && !cardDef.name.toLowerCase().includes(filterName)) return;
                if (filterType && cardDef.type !== filterType) return;
                if (filterCost) {
                    const cardCostStr = cardDef.cost >= 7 ? '7+' : (cardDef.cost ?? 0).toString();
                    if (cardCostStr !== filterCost) return;
                }
                const cardTribe = cardDef.tribe || 'None'; // Considera 'None' se não tiver tribo
                if (filterTribe && cardTribe !== filterTribe) return;

                // Renderiza a carta se passou pelos filtros
                const $miniCard = this.#cardRenderer.renderMiniCard(cardDef, 'collection');
                if ($miniCard) {
                    this.#collectionElement.append($miniCard);
                    cardsRendered++;
                }
            } else {
                console.warn(`DeckManagementScreenUI: Card ID '${id}' in collection not found in database.`);
            }
        });

         // Mensagem se nenhum card correspondeu aos filtros
         if (cardsRendered === 0 && safeCollectionIds.length > 0) {
            this.#collectionElement.append('<p class="placeholder-message">(Nenhuma carta corresponde aos filtros)</p>');
        }

        console.log(`DeckManagementScreenUI: Rendered ${cardsRendered} collection cards.`);
    }

    _showMessage(text, type = 'info', duration = 3000) {
        const colorVar = type === 'success' ? '--success-color' : type === 'error' ? '--error-color' : '--info-color';
        this.#messageParagraph.text(text).css('color', `var(${colorVar}, #ccc)`); // Fallback color

        if (duration > 0) {
            // Limpa a mensagem após a duração
            setTimeout(() => {
                // Verifica se a mensagem ainda é a mesma antes de limpar
                if (this.#messageParagraph.text() === text) {
                    this.#messageParagraph.text('');
                }
            }, duration);
        }

        // Toca som de erro, se for uma mensagem de erro
        if(type === 'error') {
            this.#audioManager?.playSFX('genericError');
        }
    }
}