// js/ui/screens/initialDeckChoiceScreenUI.js
import CardRenderer from '../helpers/CardRenderer.js';
import { loadStarterDecks } from '../../utils.js'; // Importa a nova função

export default class InitialDeckChoiceScreenUI {
    #uiManager;
    #accountManager;
    #audioManager;
    #cardDatabase;
    #cardRenderer;

    #screenElement;
    #deckSelectionArea;
    #deckDetailsArea;
    #chosenDeckNameElement;
    #chosenDeckCardListElement;
    #btnConfirmChoice;
    #btnBackToSelection;

    #selectedDeckId = null;
    #starterDecks = {}; // Começa vazio, será carregado dinamicamente

    constructor(uiManager, accountManager, audioManager, cardDatabase) {
        this.#uiManager = uiManager;
        this.#accountManager = accountManager;
        this.#audioManager = audioManager;
        this.#cardDatabase = cardDatabase;
        this.#cardRenderer = new CardRenderer();
        console.log("InitialDeckChoiceScreenUI instance created.");
    }

    async init(screenElement) {
        this.#screenElement = screenElement;
        this._cacheSelectors();

        // Carrega os decks dos arquivos
        const loadedDecks = await loadStarterDecks();
        if (loadedDecks) {
            // Combina os dados carregados com os metadados (descrição, imagem)
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
            // Você pode adicionar uma mensagem de erro na tela aqui
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

    // O restante do arquivo (funções _bindEvents, _showSelectionView, _showDeckDetails, _confirmDeckChoice, destroy)
    // pode permanecer exatamente como estava no arquivo original que você forneceu, pois a lógica interna
    // deles já funciona com a estrutura de #starterDecks.
    // Cole o restante do seu arquivo original a partir daqui.

    _bindEvents() {
        const namespace = '.initialdeckchoice';

        this.#deckSelectionArea.off(`click${namespace} mouseenter${namespace}`);
        this.#btnBackToSelection.off(`click${namespace} mouseenter${namespace}`);
        this.#btnConfirmChoice.off(`click${namespace} mouseenter${namespace}`);

        this.#deckSelectionArea.on(`click${namespace}`, '.deck-choice-option', (event) => {
            this.#audioManager?.playSFX('buttonClick');
            const deckId = $(event.currentTarget).data('deck-id');
            this._showDeckDetails(deckId);
        });
        this.#btnBackToSelection.on(`click${namespace}`, () => {
            this.#audioManager?.playSFX('buttonClick');
            this._showSelectionView();
        });
        this.#btnConfirmChoice.on(`click${namespace}`, () => {
            this.#audioManager?.playSFX('deckSave');
            this._confirmDeckChoice();
        });

        this.#deckSelectionArea.on(`mouseenter${namespace}`, '.deck-choice-option', () => this.#audioManager?.playSFX('buttonHover'));
        this.#btnBackToSelection.on(`mouseenter${namespace}`, () => this.#audioManager?.playSFX('buttonHover'));
        this.#btnConfirmChoice.on(`mouseenter${namespace}`, () => this.#audioManager?.playSFX('buttonHover'));
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
                if ($miniCard) {
                    this.#chosenDeckCardListElement.append($miniCard);
                }
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
        this.#screenElement = null;
        this.#deckSelectionArea = null;
        this.#deckDetailsArea = null;
        // ... (resto dos elementos para nulo)
        console.log("InitialDeckChoiceScreenUI: Destroyed.");
    }
}