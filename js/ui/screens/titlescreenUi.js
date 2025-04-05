// js/ui/screens/titlescreenUi.js - COMPLETO E ATUALIZADO

export default class TitlescreenUi {
    // --- Referências ---
    #bannerElement = null; // Elemento DOM que contém o banner
    #uiManager = null; // Referência ao UIManager para navegação
    #audioManager = null; // Referência ao AudioManager para sons

    // --- Configuração do Banner ---
    #imageUrls = [ // <<< CONFIGURE SUAS IMAGENS DE FUNDO AQUI >>>
        'assets/images/backgrounds/bg1.jpg',
        'assets/images/backgrounds/bg2.jpg',
        'assets/images/backgrounds/bg3.jpg',
        'assets/images/backgrounds/bg4.jpg',
        'assets/images/backgrounds/bg5.jpg',
        'assets/images/backgrounds/bg6.jpg',
        // Adicione mais URLs conforme necessário
    ];
    #imageDisplayTime = 7000; // Tempo de exibição de cada imagem (ms) - Ex: 6 segundos
    #kenBurnsClasses = ['kenburns-1', 'kenburns-2', 'kenburns-3', 'kenburns-4']; // Nomes das classes de animação CSS

    // --- Estado Interno ---
    #currentImageIndex = 0; // Índice da imagem atual na lista #imageUrls
    #intervalId = null;    // ID do timer do setInterval para o ciclo de imagens
    #imageElements = [];   // Array para guardar as 2 divs usadas para o crossfade

    /**
     * Construtor da classe TitlescreenUi.
     * @param {object} screenManager - Instância do ScreenManager.
     * @param {object} uiManager - Instância do UIManager.
     * @param {object} audioManager - Instância do AudioManager.
     */
    constructor(screenManager, uiManager, audioManager) {
        this.screenManager = screenManager; // Pode ser útil para referência futura
        this.uiManager = uiManager;
        this.audioManager = audioManager; // Armazena AudioManager
        console.log("TitlescreenUi: Instance created.");
    }

    /**
     * Inicializa o banner e vincula ações da tela de título.
     * Chamado quando a tela de título se torna ativa.
     * @param {HTMLElement} screenElement - O elemento DOM da tela de título (#title-screen).
     */
    init(screenElement) {
        console.log("TitlescreenUi: Initializing...");
        this.#bannerElement = screenElement?.querySelector('#titlescreen-banner'); // Adiciona verificação

        if (!this.#bannerElement) {
            console.error("TitlescreenUi Error: Banner element #titlescreen-banner not found!");
            // Não inicializa o banner se o elemento não for encontrado
        } else if (this.#imageUrls.length === 0) {
            console.warn("TitlescreenUi: No image URLs provided for the banner.");
            this.#bannerElement.style.backgroundColor = '#111'; // Fundo fallback
        } else {
            // Configura os elementos de imagem para crossfade e inicia o ciclo
            this.#setupBannerElements();
            this.#startBannerCycle();
        }

        // Vincula ações específicas desta tela
        if (screenElement) { // Garante que screenElement existe antes de tentar vincular
            this.#bindTitleScreenActions(screenElement);
            console.log("TitlescreenUi: Initialized and actions bound.");
        } else {
            console.error("TitlescreenUi Error: screenElement is null or undefined in init. Cannot bind actions.");
        }
    }

    /**
     * Limpa os recursos do banner (timer, elementos DOM) e desvincula eventos.
     * Chamado quando a tela de título é desativada ou destruída.
     */
    destroy() {
        console.log("TitlescreenUi: Destroying...");
        // Para o ciclo de imagens
        if (this.#intervalId) {
            clearInterval(this.#intervalId);
            this.#intervalId = null;
        }
        // Remove os elementos de imagem criados
        if (this.#bannerElement) {
            this.#imageElements.forEach(div => div.remove()); // Remove do DOM
        }
        // Limpa o array e reseta o índice
        this.#imageElements = [];
        this.#currentImageIndex = 0;

        // Remove listeners específicos desta tela
        // Encontra o elemento da tela antes de tentar remover listeners
        const $screen = $(this.#bannerElement?.closest('#title-screen'));
        if ($screen?.length) {
            $screen.find('.title-menu').off('click.titlescreen');
            $screen.find('.title-menu button').off('mouseenter.titlescreen');
            console.log("TitlescreenUi: Event listeners unbound.");
        }
    }

    /**
     * Configura as duas divs internas do banner usadas para o efeito de crossfade.
     * Define a primeira imagem e aplica o efeito Ken Burns inicial.
     */
    #setupBannerElements() {
        this.#bannerElement.innerHTML = '';
        this.#imageElements = [];

        for (let i = 0; i < 2; i++) {
            const div = document.createElement('div');
            div.classList.add('banner-image');
            this.#bannerElement.appendChild(div);
            this.#imageElements.push(div);
        }

        if (this.#imageUrls.length > 0) {
            // Inicia com uma imagem aleatória para variar
            this.#currentImageIndex = Math.floor(Math.random() * this.#imageUrls.length);
            const firstDiv = this.#imageElements[0];
            firstDiv.style.backgroundImage = `url('${this.#imageUrls[this.#currentImageIndex]}')`;
            this.#applyRandomKenBurns(firstDiv);

            setTimeout(() => {
                // Verifica se o elemento ainda existe antes de adicionar a classe
                if (this.#imageElements[0]) {
                    this.#imageElements[0].classList.add('active');
                }
            }, 50);
        }
    }

    /**
     * Inicia o ciclo de troca de imagens usando setInterval.
     */
    #startBannerCycle() {
        if (this.#intervalId) {
            clearInterval(this.#intervalId);
        }
        if (this.#imageUrls.length > 1) {
            this.#intervalId = setInterval(() => {
                this.#showNextImage();
            }, this.#imageDisplayTime);
            console.log(`TitlescreenUi: Banner cycle started with interval ${this.#imageDisplayTime}ms.`);
        } else {
            console.log("TitlescreenUi: Only one image provided, banner cycle not started.");
        }
    }

    /**
     * Lógica principal para a transição de imagens (crossfade com Ken Burns).
     */
    #showNextImage() {
        // Garante que os elementos ainda existem (importante se destroy for chamado durante a transição)
        if (!this.#bannerElement || this.#imageElements.length < 2) return;

        const activeDiv = this.#imageElements.find(div => div.classList.contains('active'));
        const nextDiv = this.#imageElements.find(div => !div.classList.contains('active'));

        if (!nextDiv) return; // Segurança

        const nextImageIndex = (this.#currentImageIndex + 1) % this.#imageUrls.length;
        nextDiv.style.backgroundImage = `url('${this.#imageUrls[nextImageIndex]}')`;
        this.#applyRandomKenBurns(nextDiv);

        if (activeDiv) {
            activeDiv.classList.remove('active');
            activeDiv.classList.add('exiting');
        }
        nextDiv.classList.add('active');

        // Limpeza da classe 'exiting' após a transição
        setTimeout(() => {
            // Re-seleciona caso o DOM tenha mudado
            const exitedDiv = this.#bannerElement?.querySelector('.banner-image.exiting');
            exitedDiv?.classList.remove('exiting');
        }, 1000); // DEVE CORRESPONDER À DURAÇÃO DA TRANSIÇÃO 'opacity' NO CSS

        this.#currentImageIndex = nextImageIndex;
    }

    /**
     * Aplica uma classe de animação Ken Burns aleatória a um elemento.
     * @param {HTMLElement} element - O elemento div da imagem (.banner-image).
     */
    #applyRandomKenBurns(element) {
        if (!this.#kenBurnsClasses || this.#kenBurnsClasses.length === 0 || !element) return;
        this.#kenBurnsClasses.forEach(kbClass => element.classList.remove(kbClass));
        const randomIndex = Math.floor(Math.random() * this.#kenBurnsClasses.length);
        element.classList.add(this.#kenBurnsClasses[randomIndex]);
    }

    /**
     * Vincula ações aos botões da tela de título usando UIManager para navegação.
     * @param {HTMLElement} screenElement - O elemento DOM da tela de título.
     */
    #bindTitleScreenActions(screenElement) {
        const $screen = $(screenElement);
        const self = this;

        // Limpa listeners antigos para evitar duplicação se init for chamado várias vezes
        $screen.find('.title-menu').off('click.titlescreen');
        $screen.find('.title-menu button').off('mouseenter.titlescreen');

        // Delegação de evento para cliques nos botões dentro de .title-menu
        $screen.find('.title-menu').on('click.titlescreen', 'button', (event) => {
            const action = $(event.currentTarget).data('action');
            self.audioManager?.playSFX('buttonClick'); // Toca som

            console.log(`Titlescreen Action Clicked: ${action}`);

            // Navega usando UIManager
            switch (action) {
                case 'login':
                    self.uiManager?.navigateTo('login-screen');
                    break;
                case 'create-account':
                    self.uiManager?.navigateTo('create-account-screen');
                    break;
                case 'settings':
                    self.uiManager?.navigateTo('options-screen');
                    break;
                default:
                    console.warn(`Titlescreen: Unknown button action '${action}'`);
            }
        });

        // Adiciona som de hover
        $screen.find('.title-menu button').on('mouseenter.titlescreen', () => {
            self.audioManager?.playSFX('buttonHover');
        });

        console.log("TitlescreenUi: Title screen actions bound.");
    }

} // Fim da classe TitlescreenUi