// js/ui/screens/InitialDeckChoiceScreenUI.js
import CardRenderer from '../helpers/CardRenderer.js';
import { loadStarterDecks } from '/js/utils.js'; // mantém como está no seu projeto

export default class InitialDeckChoiceScreenUI {
    #uiManager;
    #accountManager;
    #audioManager;
    #cardDatabase;
    #cardRenderer;
    #zoomHandler;
    #screenElement;
    #deckSelectionArea;
    #deckDetailsArea;
    #chosenDeckNameElement;
    #chosenDeckCardListElement;
    #btnConfirmChoice;
    #btnBackToSelection;

    #selectedDeckId = null;
    #starterDecks = {}; // carregado dinamicamente

    // ✅ Agora aceitando o 5º parâmetro: zoomHandler
    constructor(uiManager, accountManager, audioManager, cardDatabase, zoomHandler) {
        this.#uiManager = uiManager;
        this.#accountManager = accountManager;
        this.#audioManager = audioManager;
        this.#cardDatabase = cardDatabase;
        this.#cardRenderer = new CardRenderer();
        this.#zoomHandler = zoomHandler; // ✅ fixa o bug
        if (!this.#zoomHandler) {
            console.warn('InitialDeckChoiceScreenUI: zoomHandler não fornecido — zoom ficará desativado nesta tela.');
        }
        console.log("InitialDeckChoiceScreenUI instance created.");
    }

    async init(screenElement) {
        this.#screenElement = screenElement;
        this._cacheSelectors();

        // Carrega os decks dos arquivos (mantém sua lógica)
        const loadedDecks = await loadStarterDecks();
        if (loadedDecks) {
            this.#starterDecks = {
                ashkar_starter: {
                    ...loadedDecks.ashkar_starter,
                    description: "Domine o caos e o poder elemental do fogo. Um deck ofensivo focado em ataques rápidos e destruição.",
                    image: 'assets/images/store/Ashkar_deck.png'
                },
                galadreth_starter: {
                    ...loadedDecks.galadreth_starter,
                    description: "Defenda a harmonia com criaturas resilientes e feitiços de cura. Um deck tático focado em perseverança.",
                    image: 'assets/images/store/Galadreth_deck.png'
                }
            };
        } else {
            console.error("Falha CRÍTICA ao carregar decks iniciais. A seleção de deck não funcionará.");
        }

        if (!this.#deckSelectionArea.length) {
            console.error("InitialDeckChoiceScreenUI: Elementos essenciais não encontrados.");
            return;
        }

        this._showSelectionView();
        this._bindEvents();
    }

    _cacheSelectors() {
        this.#deckSelectionArea = $(this.#screenElement).find('.deck-selection-area');
        this.#deckDetailsArea = $(this.#screenElement).find('.deck-details-area');
        this.#chosenDeckNameElement = $(this.#screenElement).find('#chosen-deck-name');
        this.#chosenDeckCardListElement = $(this.#screenElement).find('#chosen-deck-card-list');
        this.#btnConfirmChoice = $(this.#screenElement).find('#btn-confirm-deck-choice');
        this.#btnBackToSelection = $(this.#screenElement).find('#btn-back-to-deck-selection');
    }

    _bindEvents() {
        const namespace = '.initialdeckchoice';

        // limpa binds antigos
        this.#deckSelectionArea.off(`click${namespace} mouseenter${namespace}`);
        this.#btnBackToSelection.off(`click${namespace} mouseenter${namespace}`);
        this.#btnConfirmChoice.off(`click${namespace} mouseenter${namespace}`);
        this.#deckDetailsArea.off(`${namespace}`); // garante reset

        // clicar no card grande da escolha (Ashkar/Galadreth)
        this.#deckSelectionArea.on(`click${namespace}`, '.deck-choice-option', (event) => {
            this.#audioManager?.playSFX('buttonClick');
            const deckId = $(event.currentTarget).data('deck-id');
            this._showDeckDetails(deckId);
        });

        // voltar
        this.#btnBackToSelection.on(`click${namespace}`, () => {
            this.#audioManager?.playSFX('buttonClick');
            this._showSelectionView();
        });

        // confirmar
        this.#btnConfirmChoice.on(`click${namespace}`, () => {
            this.#audioManager?.playSFX('deckSave');
            this._confirmDeckChoice();
        });

        // hovers
        this.#deckSelectionArea.on(`mouseenter${namespace}`, '.deck-choice-option', () => this.#audioManager?.playSFX('buttonHover'));
        this.#btnBackToSelection.on(`mouseenter${namespace}`, () => this.#audioManager?.playSFX('buttonHover'));
        this.#btnConfirmChoice.on(`mouseenter${namespace}`, () => this.#audioManager?.playSFX('buttonHover'));

        // ✅ Zoom nas mini-cartas do detalhe do deck:
        // - mantém o botão direito (contextmenu)
        // - adiciona clique normal (melhor UX e mobile)
        this.#deckDetailsArea.on(`contextmenu${namespace} click${namespace}`, '.mini-card', (event) => {
            if (event.type === 'contextmenu') event.preventDefault();
            if (!this.#zoomHandler) return; // guard
            this.#zoomHandler.handleZoomClick(event);
        });
    }

    _showSelectionView() {
        this.#selectedDeckId = null;
        this.#deckDetailsArea.hide();
        this.#deckSelectionArea.show();
        this.#deckSelectionArea.find('.deck-choice-option').show().css('opacity', 1);
    }

    _showDeckDetails(deckId) {
        this.#selectedDeckId = deckId;
        const deckInfo = this.#starterDecks[deckId];
        if (!deckInfo) {
            console.error(`Deck info não encontrado para ID: ${deckId}`);
            this._showSelectionView();
            return;
        }

        this.#chosenDeckNameElement.text(deckInfo.name);
        this.#chosenDeckCardListElement.empty();

        // conta e ordena cartas (custo, depois nome)
        const cardCounts = {};
        deckInfo.cards.forEach(cardId => {
            cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
        });

        const uniqueCardIds = Object.keys(cardCounts).sort((a, b) => {
            const cardA = this.#cardDatabase[a];
            const cardB = this.#cardDatabase[b];
            if (!cardA || !cardB) return 0;
            if ((cardA.cost || 0) !== (cardB.cost || 0)) {
                return (cardA.cost || 0) - (cardB.cost || 0);
            }
            return (cardA.name || '').localeCompare(cardB.name || '');
        });

        uniqueCardIds.forEach(cardId => {
            const cardDef = this.#cardDatabase[cardId];
            const quantity = cardCounts[cardId];
            if (cardDef) {
                const $miniCard = this.#cardRenderer.renderMiniCard(cardDef, 'collection', quantity);
                if ($miniCard) this.#chosenDeckCardListElement.append($miniCard);
            } else {
                console.warn(`InitialDeckChoice: Definição não encontrada para card ID: ${cardId} no deck ${deckInfo.name}`);
            }
        });

        this.#deckSelectionArea.hide();
        this.#deckDetailsArea.show();
        this.#deckDetailsArea.scrollTop(0);
    }

    _confirmDeckChoice() {
        if (!this.#selectedDeckId) {
            alert("Por favor, selecione um deck.");
            this.#audioManager?.playSFX('genericError');
            return;
        }
        const deckData = this.#starterDecks[this.#selectedDeckId];
        if (!deckData) {
            alert("Erro: Deck selecionado é inválido.");
            this.#audioManager?.playSFX('genericError');
            return;
        }

        if (this.#accountManager.completeInitialSetup(this.#selectedDeckId, deckData)) {
            console.log(`Deck ${deckData.name} escolhido e salvo para o usuário.`);
            this.#uiManager.navigateTo('home-screen');
        } else {
            alert("Erro ao salvar sua escolha de deck. Por favor, tente novamente.");
            this.#audioManager?.playSFX('genericError');
        }
    }

    destroy() {
        const namespace = '.initialdeckchoice';
        this.#deckSelectionArea?.off(namespace);
        this.#btnBackToSelection?.off(namespace);
        this.#btnConfirmChoice?.off(namespace);
        this.#deckDetailsArea?.off(namespace);
        this.#screenElement = null;
        this.#deckSelectionArea = null;
        this.#deckDetailsArea = null;
        this.#chosenDeckNameElement = null;
        this.#chosenDeckCardListElement = null;
        this.#btnConfirmChoice = null;
        this.#btnBackToSelection = null;
        console.log("InitialDeckChoiceScreenUI: Destroyed.");
    }
}
