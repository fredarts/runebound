// js/ui/helpers/ZoomHandler.js

export default class ZoomHandler {
    #cardDatabase;
    #activeOverlayId = null;
    #activeOverlayElement = null; // Guardar referência ao elemento do overlay ativo

    #overlayMap = {
        'deck-builder-screen': { overlay: '#deckbuilder-image-zoom-overlay', image: '#deckbuilder-zoomed-image' },
        'battle-screen': { overlay: '#battle-image-zoom-overlay', image: '#battle-zoomed-image' },
        'deck-management-screen': { overlay: '#deck-management-zoom-overlay', image: '#deck-management-zoomed-image' },
        'set-collection-screen': { overlay: '#set-collection-zoom-overlay', image: '#set-collection-zoomed-image' },
        'initial-deck-choice-screen': { overlay: '#initial-deck-choice-zoom-overlay', image: '#initial-deck-choice-zoomed-image' }
    };

    constructor(cardDatabase) {
        if (!cardDatabase) {
            throw new Error("ZoomHandler requires cardDatabase.");
        }
        this.#cardDatabase = cardDatabase;
        this._bindGlobalEscKey(); // Renomeado para clareza
        console.log("ZoomHandler initialized.");
    }

    handleZoomClick(event, gameInstance = null) {
        event.preventDefault();
        event.stopPropagation();

        const $card = $(event.currentTarget);
        const cardUniqueId = $card.data('card-unique-id');
        const cardBaseId = $card.data('card-id');

        let cardData = null;
        let imageSrc = null;
        let cardName = 'Carta Desconhecida';

        if (cardUniqueId && gameInstance) {
             try {
                 const gameCard = gameInstance.findCardInstance(cardUniqueId);
                 if (gameCard) {
                     cardData = gameCard.getRenderData();
                     imageSrc = cardData.imageSrc;
                     cardName = cardData.name;
                 }
             } catch (e) {
                 console.error("ZoomHandler: Error calling gameInstance.findCardInstance:", e);
             }
        }

        if (!imageSrc && cardBaseId) {
            cardData = this.#cardDatabase[cardBaseId];
            if (cardData) {
                imageSrc = cardData.image_src;
                cardName = cardData.name;
            }
        }

        if (imageSrc) {
            const $screen = $card.closest('.screen');
            if (!$screen.length) {
                console.error("ZoomHandler: Could not find parent .screen for the card.");
                return;
            }
            const screenId = $screen.attr('id');
            const mapping = this.#overlayMap[screenId];

            if (mapping) {
                const $overlay = $(mapping.overlay);
                const $image = $(mapping.image);

                if ($overlay.length && $image.length) {
                    this.closeZoom(); // Fecha qualquer zoom anterior e remove listeners antigos

                    $image.attr('src', imageSrc).attr('alt', cardName);
                    $overlay.addClass('active');

                    this.#activeOverlayId = mapping.overlay;
                    this.#activeOverlayElement = $overlay; // Armazena o elemento jQuery

                    // Adiciona listener de clique AO OVERLAY ATIVO
                    this.#activeOverlayElement.on('click.zoomhandler_overlay', (e) => {
                        if (e.target === this.#activeOverlayElement[0]) { // Verifica se o clique foi no próprio overlay
                            this.closeZoom();
                        }
                    });
                    console.log(`ZoomHandler: Overlay ${this.#activeOverlayId} activated and click listener attached.`);
                } else {
                    console.error(`ZoomHandler Error: Zoom overlay ('${mapping.overlay}') or image ('${mapping.image}') element not found for screen '${screenId}'!`);
                }
            } else {
                console.warn(`ZoomHandler Warning: Zoom mapping not found for screen: ${screenId}.`);
            }
        } else {
            console.log(`ZoomHandler: No image source found for card ${cardUniqueId || cardBaseId}.`);
        }
    }

    closeZoom() {
        if (this.#activeOverlayElement && this.#activeOverlayElement.length) {
            this.#activeOverlayElement.removeClass('active');
            // Limpa a imagem para evitar flash de imagem antiga
            this.#activeOverlayElement.find('img').attr('src', ''); // Acha a img dentro do overlay ativo
            
            // Remove o listener de clique específico deste overlay
            this.#activeOverlayElement.off('click.zoomhandler_overlay');
            
            console.log(`ZoomHandler: Closed zoom overlay: ${this.#activeOverlayId} and unbound its click listener.`);
            
            this.#activeOverlayId = null;
            this.#activeOverlayElement = null;
        }
        // Fallback (mantido por segurança, mas menos provável de ser necessário agora)
        else if ($('.image-zoom-overlay.active').length > 0) {
            console.warn("ZoomHandler: Closing zoom overlay without activeOverlayId set. Closing all active.");
            $('.image-zoom-overlay.active').each(function() {
                const $currentOverlay = $(this);
                $currentOverlay.removeClass('active');
                $currentOverlay.find('img').attr('src', '');
                $currentOverlay.off('click.zoomhandler_overlay'); // Tenta remover se houver algum listener perdido
            });
        }
    }

    _bindGlobalEscKey() {
        $(document).off('keydown.zoomhandler_esc').on('keydown.zoomhandler_esc', (e) => {
            if (e.key === "Escape") {
                this.closeZoom();
            }
        });
    }
}