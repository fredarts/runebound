// js/ui/helpers/ZoomHandler.js - ATUALIZADO

export default class ZoomHandler {
    #cardDatabase;
    #activeOverlayId = null; // Controla qual overlay está ativo

    // --- ATUALIZAÇÃO AQUI ---
    // Adicionada a entrada para 'deck-management-screen'
    #overlayMap = {
        // 'profile-screen': { overlay: '#image-zoom-overlay', image: '#zoomed-image' }, // Não é mais necessário no perfil
        'deck-builder-screen': { overlay: '#deckbuilder-image-zoom-overlay', image: '#deckbuilder-zoomed-image' },
        'battle-screen': { overlay: '#battle-image-zoom-overlay', image: '#battle-zoomed-image' },
        'deck-management-screen': { overlay: '#deck-management-zoom-overlay', image: '#deck-management-zoomed-image' } // <<<=== ENTRADA ADICIONADA
    };
    // --- FIM DA ATUALIZAÇÃO ---

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
            // Precisa garantir que gameInstance.findCardInstance existe e funciona
             try {
                 const gameCard = gameInstance.findCardInstance(cardUniqueId);
                 if (gameCard) {
                     cardData = gameCard.getRenderData(); // Pega os dados atuais da instância
                     imageSrc = cardData.imageSrc;
                     cardName = cardData.name;
                     console.log(`ZoomHandler: Found card in game instance: ${cardName} (${cardUniqueId})`);
                 } else {
                      console.log(`ZoomHandler: Card unique ID ${cardUniqueId} not found in game instance.`);
                 }
             } catch (e) {
                 console.error("ZoomHandler: Error calling gameInstance.findCardInstance:", e);
             }
        }

        // 2. Se não encontrou no jogo ou não era carta de jogo, busca na database pelo ID base
        if (!imageSrc && cardBaseId) {
            cardData = this.#cardDatabase[cardBaseId];
            if (cardData) {
                imageSrc = cardData.image_src; // Certifique-se que a prop é image_src no JSON
                cardName = cardData.name;
                console.log(`ZoomHandler: Found card in database: ${cardName} (${cardBaseId})`);
            }
        }

        // 3. Se encontrou uma imagem, determina o overlay e mostra
        if (imageSrc) {
            const $screen = $card.closest('.screen'); // Encontra a tela pai
            if (!$screen.length) {
                console.error("ZoomHandler: Could not find parent .screen for the card.");
                return;
            }
            const screenId = $screen.attr('id');
            const mapping = this.#overlayMap[screenId]; // Pega o mapeamento para essa tela

             console.log(`ZoomHandler: Handling zoom for screen '${screenId}'. Mapping found:`, mapping); // Log para debug

            if (mapping) {
                const $overlay = $(mapping.overlay);
                const $image = $(mapping.image);

                if ($overlay.length && $image.length) {
                    this.closeZoom(); // Fecha qualquer zoom anterior
                    $image.attr('src', imageSrc).attr('alt', cardName);
                    $overlay.addClass('active');
                    this.#activeOverlayId = mapping.overlay; // Guarda qual overlay está ativo
                    console.log(`ZoomHandler: Overlay ${this.#activeOverlayId} activated.`);
                } else {
                    console.error(`ZoomHandler Error: Zoom overlay ('${mapping.overlay}') or image ('${mapping.image}') element not found in the DOM for screen '${screenId}'!`);
                }
            } else {
                console.warn(`ZoomHandler Warning: Zoom mapping not found for screen: ${screenId}. Cannot display zoom.`);
            }
        } else {
            console.log(`ZoomHandler: No image source found for card ${cardUniqueId || cardBaseId}. Cannot display zoom.`);
        }
    }

    /**
     * Fecha o overlay de zoom atualmente ativo.
     * Este é um método PÚBLICO.
     */
    closeZoom() {
        if (this.#activeOverlayId) {
            $(this.#activeOverlayId).removeClass('active');
            // Limpa a imagem para evitar flash de imagem antiga
            $(`${this.#activeOverlayId} img`).attr('src', '');
            console.log(`ZoomHandler: Closed zoom overlay: ${this.#activeOverlayId}`);
            this.#activeOverlayId = null;
        }
        // Fallback para fechar todos, caso o estado se perca (menos provável agora)
        else if ($('.image-zoom-overlay.active').length > 0) {
            console.warn("ZoomHandler: Closing zoom overlay without activeOverlayId set. Closing all.");
            $('.image-zoom-overlay').removeClass('active');
            $('.image-zoom-overlay img').attr('src', '');
        }
    }

    /**
     * Vincula o fechamento global (ESC).
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