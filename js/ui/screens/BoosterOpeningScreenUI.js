// js/ui/screens/BoosterOpeningScreenUI.js – versão com variáveis CSS
// Substitui o transform inline por variáveis (--offX, --offY, --stackRot)
// para viabilizar o flip sem conflito de especificidade.

export default class BoosterOpeningScreenUI {
    // ──────────── Dependências Injetadas ────────────
    #screenManager;
    #accountManager;
    #audioManager;
    #uiManager;
    #cardRenderer; // Mantido (caso queira usar futuramente para mini‑render)

    // ──────────── Elementos DOM ────────────
    #el;                // Root element da tela
    #cardContainer;     // Div que conterá as cartas
    #btnSkip;           // Botão “Pular Abertura”

    // ──────────── Estado das Cartas ────────────
    #cardElements = [];     // Array de jQuery elements das cartas
    #pack = [];             // IDs das cartas do booster
    #currentTopIndex = -1;  // Índice da carta do topo em #cardElements
    #flippedElement = null; // jQuery element atualmente flipado
    #isAnimating = false;   // Travar ações durante animações

    // ──────────── Estado da UI ────────────
    #initialized = false;
    #isRendering = false;

    // ──────────── Constantes de Animação (CSS ∞ JS) ────────────
    #FLIP_DURATION = 600;    // ms
    #DISMISS_DURATION = 400; // ms

    constructor(screenManager, accountManager, audioManager, uiManager, cardRenderer) {
        this.#screenManager  = screenManager;
        this.#accountManager = accountManager;
        this.#audioManager   = audioManager;
        this.#uiManager      = uiManager;
        this.#cardRenderer   = cardRenderer;
        console.log('BoosterOpeningScreenUI (vars‑CSS) constructed.');
    }

    // ────────────────────────────────────────────────
    //  INIT / CACHE / BIND
    // ────────────────────────────────────────────────
    async init() {
        if (this.#initialized) {              // re‑init (voltar à tela)
            console.log('BoosterOpeningScreenUI: Re‑initializing.');
            if (!this._cacheSelectors()) return false;
            this._bindEvents();
            return true;
        }

        console.log('BoosterOpeningScreenUI: First‑time init…');
        if (!this._cacheSelectors()) return false;
        this._bindEvents();
        this.#initialized = true;
        return true;
    }

    _cacheSelectors() {
        this.#el            = $('#booster-opening-screen');
        this.#cardContainer = this.#el.find('#booster-card-container');
        this.#btnSkip       = this.#el.find('#btn-booster-skip');

        const ok = this.#el.length && this.#cardContainer.length && this.#btnSkip.length;
        if (!ok) console.error('BoosterOpeningScreenUI: Elementos essenciais não encontrados!');
        return ok;
    }

    _bindEvents() {
        const ns = '.boosterui';
        this.#btnSkip.off(ns);
        this.#cardContainer.off(ns);

        // botão pular
        this.#btnSkip.on(`click${ns}`, () => {
            this.#audioManager?.playSFX('buttonClick');
            this.finish(true);
        }).on(`mouseenter${ns}`, () => this.#audioManager?.playSFX('buttonHover'));

        // clique nas cartas (delegação)
        this.#cardContainer.on(`click${ns}`, '.booster-card.interactive', ev => this._onCardClick(ev))
                           .on(`mouseenter${ns}`, '.booster-card.interactive', () => this.#audioManager?.playSFX('buttonHover'));
    }

    // ────────────────────────────────────────────────
    //  RENDER
    // ────────────────────────────────────────────────
    async render({ pack = [] } = {}) {
        if (!this.#initialized && !(await this.init())) return;

        this.#isRendering   = true;
        this.#pack          = pack;
        this._cleanupDOM();

        if (!Array.isArray(this.#pack) || !this.#pack.length) {
            console.warn('BoosterOpeningScreenUI: Pacote vazio ou inválido.');
            this.finish(true);
            return;
        }

        const cardDb = this.#uiManager.getCardDatabase();
        if (!cardDb) { console.error('BoosterOpeningScreenUI: Card DB não disponível.'); this.finish(true); return; }

        // adiciona cartas (ordem inversa → topo por último) ------------------
        for (let i = this.#pack.length - 1; i >= 0; i--) {
            const cardId   = this.#pack[i];
            const cardDef  = cardDb[cardId] || {};
            const faceURL  = cardDef.image_src || 'assets/images/cards/default.png';
            const cardName = cardDef.name      || 'Carta desconhecida';

            const $cardDiv = $(
                `<div class="booster-card" data-card-id="${cardId}" title="${cardName}">
                    <div class="card-back"></div>
                    <div class="card-face" style="background-image:url('${faceURL}')"></div>
                 </div>`);

            // empilhamento via z‑index
            $cardDiv.css('z-index', i + 1);

            // deslocamento na pilha usando variáveis CSS (SEM transform inline)
            const offset = (this.#pack.length - 1 - i) * 2;
            $cardDiv.css({
                '--offX'    : `-${50 + offset * 0.1}%`,
                '--offY'    : `-${50 + offset * 0.1}%`,
                '--stackRot': `${offset * -0.3}deg`
            });

            this.#cardContainer.append($cardDiv);
            this.#cardElements.unshift($cardDiv); // base → topo
        }

        // ativa carta do topo
        this.#currentTopIndex = this.#cardElements.length - 1;
        if (this.#currentTopIndex >= 0) this.#cardElements[this.#currentTopIndex].addClass('interactive');
    }

    // ────────────────────────────────────────────────
    //  INTERAÇÕES (clique / flip / dismiss)
    // ────────────────────────────────────────────────
    _onCardClick(ev) {
        if (this.#isAnimating || this.#currentTopIndex < 0) return;
        const $card = $(ev.currentTarget);
        if (!$card.length) return;

        if (!$card.hasClass('flipped')) this._flipCard($card);
        else                            this._dismissCard($card);
    }

    _flipCard($card) {
        if (this.#isAnimating) return;
        this.#isAnimating   = true;
        this.#flippedElement = $card;
        $card.removeClass('interactive').addClass('flipped');
        this.#audioManager?.playSFX('cardDraw');

        setTimeout(() => {
            if (this.#flippedElement && this.#flippedElement[0] === $card[0]) $card.addClass('interactive');
            this.#isAnimating = false;
        }, this.#FLIP_DURATION);
    }

    _dismissCard($card) {
        if (this.#isAnimating || !$card.hasClass('flipped') || !$card[0] === this.#flippedElement?.[0]) return;
        this.#isAnimating = true;
        $card.removeClass('interactive flipped').addClass('dismissing');
        this.#audioManager?.playSFX('cardDiscard');
    
        setTimeout(() => {
            // remove do array & DOM
            const idx = this.#cardElements.findIndex($el => $el[0] === $card[0]);
            if (idx !== -1) this.#cardElements.splice(idx, 1);
            $card.remove();
    
            this.#currentTopIndex = this.#cardElements.length - 1;
            this.#flippedElement  = null;
            this.#isAnimating     = false;
    
            if (this.#currentTopIndex < 0) this.finish(false);
            else this.#cardElements[this.#currentTopIndex].addClass('interactive');
        }, this.#DISMISS_DURATION);
    }

    // ────────────────────────────────────────────────
    //  FINALIZAÇÃO / LIMPEZA
    // ────────────────────────────────────────────────
    finish(skipped = false) {
        if (!this.#isRendering && !skipped) return;
        this.#isRendering = false;
        this.#isAnimating = false;

        if (Array.isArray(this.#pack) && this.#pack.length > 0) {
            try {
                this.#accountManager.addCardsToCollection([...this.#pack]);
            } catch (e) { console.error('Erro ao adicionar cartas:', e); }
            this.#pack = [];
        }

        setTimeout(() => this.#uiManager?.navigateTo('set-collection-screen'), skipped ? 50 : 450);
    }

    _cleanupDOM() {
        this.#cardContainer.empty();
        this.#cardElements      = [];
        this.#currentTopIndex   = -1;
        this.#flippedElement    = null;
        this.#isAnimating       = false;
    }

    destroy() {
        const ns = '.boosterui';
        this.#btnSkip?.off(ns);
        this.#cardContainer?.off(ns);
        this._cleanupDOM();
        this.#initialized = false;
    }
}
