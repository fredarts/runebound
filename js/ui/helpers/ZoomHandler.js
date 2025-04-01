// js/ui/helpers/ZoomHandler.js

export default class ZoomHandler {
    #cardDatabase;
    #activeOverlayId = null; // Controla qual overlay está ativo

    // Mapeamento dos overlays e suas imagens correspondentes
    #overlayMap = {
        'profile-screen': { overlay: '#image-zoom-overlay', image: '#zoomed-image' },
        'deck-builder-screen': { overlay: '#deckbuilder-image-zoom-overlay', image: '#deckbuilder-zoomed-image' },
        'battle-screen': { overlay: '#battle-image-zoom-overlay', image: '#battle-zoomed-image' }
        // Adicione mais mapeamentos se criar overlays para outras telas
    };

    constructor(cardDatabase) {
        if (!cardDatabase) {
            throw new Error("ZoomHandler requires cardDatabase.");
        }
        this.#cardDatabase = cardDatabase;
        this._bindGlobalClose(); // Bind ESC key globally
        console.log("ZoomHandler initialized.");
    }

    /**
     * Manipula o evento de clique (ou contextmenu) para exibir o zoom.
     * Determina o contexto (tela) e mostra o overlay correto.
     * @param {Event} event - O evento de clique/contextmenu.
     * @param {Game | null} [gameInstance=null] - Instância do jogo (opcional, para buscar dados de cartas em jogo).
     */
    handleZoomClick(event, gameInstance = null) {
        event.preventDefault(); // Previne menu de contexto padrão
        event.stopPropagation(); // Impede propagação

        const $card = $(event.currentTarget);
        const cardUniqueId = $card.data('card-unique-id'); // Para cartas em jogo
        const cardBaseId = $card.data('card-id');       // Para cartas na coleção/DB

        let cardData = null;
        let imageSrc = null;
        let cardName = 'Carta Desconhecida';

        // 1. Tenta obter dados da instância do jogo (se houver e for carta em jogo)
        if (cardUniqueId && gameInstance) {
            const gameCard = gameInstance.findCardInstance(cardUniqueId);
            if (gameCard) {
                cardData = gameCard.getRenderData(); // Pega os dados atuais da instância
                imageSrc = cardData.imageSrc;
                cardName = cardData.name;
            }
        }

        // 2. Se não encontrou no jogo ou não era carta de jogo, busca na database pelo ID base
        if (!imageSrc && cardBaseId) {
            cardData = this.#cardDatabase[cardBaseId];
            if (cardData) {
                imageSrc = cardData.image_src;
                cardName = cardData.name;
            }
        }

        // 3. Se encontrou uma imagem, determina o overlay e mostra
        if (imageSrc) {
            console.log(`Zooming card: ${cardName}`);
            const $screen = $card.closest('.screen'); // Encontra a tela pai
            const screenId = $screen.attr('id');
            const mapping = this.#overlayMap[screenId]; // Pega o mapeamento para essa tela

            if (mapping) {
                const $overlay = $(mapping.overlay);
                const $image = $(mapping.image);

                if ($overlay.length && $image.length) {
                    // --- CORREÇÃO APLICADA AQUI ---
                    this.closeZoom(); // Fecha qualquer zoom anterior (chama método público)
                    // -------------------------------
                    $image.attr('src', imageSrc).attr('alt', cardName);
                    $overlay.addClass('active');
                    this.#activeOverlayId = mapping.overlay; // Guarda qual overlay está ativo
                } else {
                    console.error(`Zoom overlay ('${mapping.overlay}') or image ('${mapping.image}') not found!`);
                }
            } else {
                console.warn(`Zoom mapping not found for screen: ${screenId}`);
            }
        } else {
            console.log(`No image source found for card ${cardUniqueId || cardBaseId}`);
        }
    }

    /**
     * Fecha o overlay de zoom atualmente ativo.
     * Este é um método PÚBLICO.
     */
    closeZoom() {
        if (this.#activeOverlayId) {
            $(this.#activeOverlayId).removeClass('active');
            // Limpa a imagem para evitar flash
            $(`${this.#activeOverlayId} img`).attr('src', '');
            console.log(`Closed zoom overlay: ${this.#activeOverlayId}`);
            this.#activeOverlayId = null;
        }
        // Fallback para fechar todos, caso o estado se perca
        else if ($('.image-zoom-overlay.active').length > 0) {
            console.warn("Closing zoom overlay without activeOverlayId set. Closing all.");
            $('.image-zoom-overlay').removeClass('active');
            $('.image-zoom-overlay img').attr('src', '');
        }
    }

    /**
     * Vincula o fechamento global (ESC).
     * O fechamento por clique fora é melhor vinculado no módulo que usa o handler.
     */
    _bindGlobalClose() {
        // Fechar com ESC
        $(document).off('keydown.zoomhandler').on('keydown.zoomhandler', (e) => {
            if (e.key === "Escape") {
                this.closeZoom(); // Chama o método público
            }
        });
    }
}