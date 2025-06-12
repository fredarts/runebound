// js/ui/screens/InitialDeckChoiceScreenUI.js
import CardRenderer from '../helpers/CardRenderer.js'; // Para renderizar mini-cartas

export default class InitialDeckChoiceScreenUI {
    #uiManager;
    #accountManager;
    #audioManager;
    #cardDatabase; // Para obter definições de cartas
    #cardRenderer;  // Para renderizar mini-cartas

    #screenElement;
    #deckSelectionArea;
    #deckDetailsArea;
    #chosenDeckNameElement;
    #chosenDeckCardListElement;
    #btnConfirmChoice;
    #btnBackToSelection;

    #selectedDeckId = null;

    // Definições dos decks iniciais (mantenha isso sincronizado com o que será salvo)
    // As cartas listadas aqui devem ter IDs válidos do seu card-definitions.json
    #starterDecks = {
        ashkar_starter: {
            id: "ashkar_starter",
            name: "Grimório de Ashkar",
            description: "Domine com o poder caótico e elemental do fogo...",
            image: 'assets/images/store/Ashkar_deck.png',
            cards: [ 
                'CR004', 'CR004', 'CR010', 'CR010', 'CR010', 'CR012', 'CR012', 'CR015',
                'CR007', 'CR007', 'CR015', 'IS002', 'IS002', 'IS002', 'IS007', 'IS007',
                'RB_POWER', 'RB_POWER', 'CR003','CR003','CR003','CR003', 'CR003', // 5 Ratos
                'CR008', 'CR008', 'IS005', 'IS005', 'RB_SILENCE', 'RB_SILENCE',
                'CR005', 'CR005', 'CR014', 'CR014', 'CR014', // 3 Assassinos
                'IS007', 'RB_POWER', 'RB001' // Adicionando 37 cartas para Ashkar
            ]
        },
        galadreth_starter: {
            id: "galadreth_starter",
            name: "Pergaminhos de Galadreth",
            description: "Defenda a harmonia com criaturas resilientes e feitiços de cura...",
            image: 'assets/images/store/Galadreth_deck.png',
            cards: [ 
                'CR001', 'CR001', 'CR001', 'CR002', 'CR002', 'CR002', 'CR016', 'CR016', 'CR016', // 3 Familiares
                'CR009', 'CR009', 'CR013', 'CR013', 'IS001', 'IS001', 'IS001', 'IS004', 'IS004',
                'RB_TOUGH', 'RB_TOUGH', 'CR011', 'CR011', 'CR011', 'CR011', 'CR011', // 5 Wisps
                'RB_DRAW2', 'RB_DRAW2', 'IS003', 'IS003', 'IS006', 'IS006',
                'CR008', 'CR008', 'CR005', 'RB001', 'RB_TOUGH' // Adicionando 37 cartas para Galadreth
            ]
        }
    };

    constructor(uiManager, accountManager, audioManager, cardDatabase) {
        this.#uiManager = uiManager;
        this.#accountManager = accountManager;
        this.#audioManager = audioManager;
        this.#cardDatabase = cardDatabase;
        this.#cardRenderer = new CardRenderer();
        console.log("InitialDeckChoiceScreenUI instance created.");
    }

    init(screenElement) {
        this.#screenElement = screenElement;
        // Cacheando com jQuery para consistência com _bindEvents
        this.#deckSelectionArea = $(screenElement).find('.deck-selection-area');
        this.#deckDetailsArea = $(screenElement).find('.deck-details-area');
        this.#chosenDeckNameElement = $(screenElement).find('#chosen-deck-name');
        this.#chosenDeckCardListElement = $(screenElement).find('#chosen-deck-card-list');
        this.#btnConfirmChoice = $(screenElement).find('#btn-confirm-deck-choice');
        this.#btnBackToSelection = $(screenElement).find('#btn-back-to-deck-selection');

        if (!this.#deckSelectionArea.length || !this.#deckDetailsArea.length ||
            !this.#chosenDeckNameElement.length || !this.#chosenDeckCardListElement.length ||
            !this.#btnConfirmChoice.length || !this.#btnBackToSelection.length) {
            console.error("InitialDeckChoiceScreenUI: Elementos essenciais não encontrados no DOM.");
            return;
        }
        this._showSelectionView();
        this._bindEvents();
    }

    _bindEvents() {
        const namespace = '.initialdeckchoice'; // Namespace para os eventos

        // Limpar listeners antigos para evitar duplicação
        this.#deckSelectionArea.off(`click${namespace} mouseenter${namespace}`);
        this.#btnBackToSelection.off(`click${namespace} mouseenter${namespace}`);
        this.#btnConfirmChoice.off(`click${namespace} mouseenter${namespace}`);

        // Adicionar novos listeners
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

        // Hovers
        this.#deckSelectionArea.on(`mouseenter${namespace}`, '.deck-choice-option', () => this.#audioManager?.playSFX('buttonHover'));
        this.#btnBackToSelection.on(`mouseenter${namespace}`, () => this.#audioManager?.playSFX('buttonHover'));
        this.#btnConfirmChoice.on(`mouseenter${namespace}`, () => this.#audioManager?.playSFX('buttonHover'));
    }

    _showSelectionView() {
        this.#selectedDeckId = null;
        this.#deckDetailsArea.hide();
        this.#deckSelectionArea.show();
        // Garante que ambas as opções de deck estejam visíveis
        this.#deckSelectionArea.find('.deck-choice-option').show().css('opacity', 1);
    }

    _showDeckDetails(deckId) {
        this.#selectedDeckId = deckId;
        const deckInfo = this.#starterDecks[deckId];
        if (!deckInfo) {
            console.error(`Deck info não encontrado para ID: ${deckId}`);
            this._showSelectionView(); // Volta para a seleção se o deck for inválido
            return;
        }

        this.#chosenDeckNameElement.text(deckInfo.name);
        this.#chosenDeckCardListElement.empty(); // Limpa a lista de cartas anterior

        // Contagem de cartas
        const cardCounts = {};
        deckInfo.cards.forEach(cardId => {
            cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
        });

        // Ordenar IDs únicos (opcional, para consistência visual)
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
                // Passa a quantidade para o renderMiniCard
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
        this.#deckDetailsArea.scrollTop(0); // Scroll para o topo da área de detalhes
    }

    _confirmDeckChoice() {
        if (!this.#selectedDeckId) {
            // Idealmente, use um sistema de notificação da UI em vez de alert
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

        // Chamar AccountManager para finalizar o setup
        if (this.#accountManager.completeInitialSetup(this.#selectedDeckId, deckData)) {
            console.log(`Deck ${deckData.name} escolhido e salvo para o usuário.`);
            // Navegar para a próxima tela (provavelmente home ou tutorial)
            this.#uiManager.navigateTo('home-screen');
        } else {
            alert("Erro ao salvar sua escolha de deck. Por favor, tente novamente.");
            this.#audioManager?.playSFX('genericError');
        }
    }

    destroy() {
        const namespace = '.initialdeckchoice';
        // Remove todos os listeners namespaced
        this.#deckSelectionArea?.off(namespace);
        this.#btnBackToSelection?.off(namespace);
        this.#btnConfirmChoice?.off(namespace);

        // Limpar referências do DOM (opcional, mas boa prática se a tela for totalmente removida do DOM)
        this.#screenElement = null;
        this.#deckSelectionArea = null;
        this.#deckDetailsArea = null;
        this.#chosenDeckNameElement = null;
        this.#chosenDeckCardListElement = null;
        this.#btnConfirmChoice = null;
        this.#btnBackToSelection = null;

        console.log("InitialDeckChoiceScreenUI: Destroyed and event listeners unbound.");
    }
}