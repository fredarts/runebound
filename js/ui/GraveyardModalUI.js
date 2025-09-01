// js/ui/GraveyardModalUI.js
// VERSÃO SIMPLIFICADA: Remove toda a lógica de ordenação e renderização de metadados.

export default class GraveyardModalUI {
    #audioManager;
    #cardDatabase;
    #initialized = false;
    
    // Elementos do DOM (cacheados e simplificados)
    #$overlay;
    #$grid;
    #$emptyMessage;
    #$titleOwner;

    constructor(audioManager, cardDatabase) {
        this.#audioManager = audioManager;
        this.#cardDatabase = cardDatabase;
    }

    /**
     * Cacheia os elementos do DOM e liga os eventos internos do modal.
     */
    init() {
        if (this.#initialized) return;

        this.#$overlay = $('#graveyard-overlay');
        if (!this.#$overlay.length) {
            console.error("GraveyardModalUI Error: Overlay element #graveyard-overlay not found!");
            return;
        }

        this.#$grid = this.#$overlay.find('#graveyard-card-list');
        this.#$emptyMessage = this.#$overlay.find('.graveyard-empty');
        this.#$titleOwner = this.#$overlay.find('.gy-owner');

        this._bindInternalEvents();
        this.#initialized = true;
        console.log("GraveyardModalUI Initialized (Simplified Version).");
    }

    /**
     * Liga o evento de fechar o modal.
     */
    _bindInternalEvents() {
        const namespace = '.graveyardModal';
        
        // Fechar ao clicar no fundo do overlay
        this.#$overlay.off(`mousedown${namespace}`).on(`mousedown${namespace}`, (e) => {
            if (e.target === this.#$overlay[0]) {
                this.close();
            }
        });
    }

    /**
     * Abre e popula o modal do cemitério para um jogador específico.
     * @param {Player} playerObject - A instância do jogador cujo cemitério será exibido.
     */
    open(playerObject) {
        if (!this.#initialized) this.init();
        if (!this.#initialized || !playerObject) {
            console.error("GraveyardModalUI: Não é possível abrir. Não inicializado ou jogador inválido.");
            return;
        }

        this.#audioManager?.playSFX('buttonClick');

        const graveyardCards = playerObject.graveyard.getCards();
        const isLocalPlayer = playerObject.name !== 'Opponent_AI';

        // Atualiza o título
        this.#$titleOwner.text(isLocalPlayer ? 'Você' : 'Oponente');

        // Limpa o grid
        this.#$grid.empty();

        if (graveyardCards.length === 0) {
            this.#$emptyMessage.prop('hidden', false);
        } else {
            this.#$emptyMessage.prop('hidden', true);
            
            // Exibe sempre da mais recente para a mais antiga
            const orderedCards = [...graveyardCards].reverse();

            orderedCards.forEach((cardInstance) => {
                const cardData = cardInstance.getRenderData();
                const name = cardData.name || 'Carta Desconhecida';
                const imageSrc = cardData.imageSrc || this.#cardDatabase[cardData.id]?.image_src || 'assets/images/cards/__missing.png';

                // HTML simplificado: apenas o contêiner e a imagem
                const cardHTML = `
                    <div class="gy-card" title="${name}">
                        <img class="gy-thumb" src="${imageSrc}" alt="${name}"
                             onerror="this.onerror=null;this.src='assets/images/cards/__missing.png';">
                    </div>
                `;
                this.#$grid.append(cardHTML);
            });
        }
        
        // Exibe o modal
        this.#$overlay.css('display', 'flex');
        requestAnimationFrame(() => this.#$overlay.addClass('active').attr('aria-hidden', 'false'));
    }

    /**
     * Fecha o modal do cemitério.
     */
    close() {
        if (!this.#initialized) return;
        this.#audioManager?.playSFX('buttonClick');
        this.#$overlay.removeClass('active').attr('aria-hidden', 'true');
        setTimeout(() => {
            if (!this.#$overlay.hasClass('active')) {
                this.#$overlay.css('display', 'none');
            }
        }, 250); // Duração da animação de fade-out
    }

    /**
     * Limpa os eventos para evitar memory leaks.
     */
    destroy() {
        const namespace = '.graveyardModal';
        this.#$overlay?.off(namespace);
        this.#initialized = false;
    }
}