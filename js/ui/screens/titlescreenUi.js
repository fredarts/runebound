// js/ui/screens/titlescreenUi.js - CORRIGIDO (REMOVIDO REDIRECIONAMENTO AUTOMÁTICO)

export default class TitlescreenUi {
    #bannerElement = null;
    #uiManager = null;
    #audioManager = null;
    // #accountManager = null; // Não é mais estritamente necessário aqui para redirecionamento

    #imageUrls = [
        'assets/images/backgrounds/bg1.jpg', 'assets/images/backgrounds/bg2.jpg',
        'assets/images/backgrounds/bg3.jpg', 'assets/images/backgrounds/bg4.jpg',
        'assets/images/backgrounds/bg5.jpg', 'assets/images/backgrounds/bg6.jpg',
        'assets/images/backgrounds/bg7.jpg', 'assets/images/backgrounds/bg8.jpg',
        'assets/images/backgrounds/bg9.jpg', 'assets/images/backgrounds/bg10.jpg',
        'assets/images/backgrounds/bg11.jpg', 'assets/images/backgrounds/bg12.jpg',
    ];
    #imageDisplayTime = 7000;
    #kenBurnsClasses = ['kenburns-1', 'kenburns-2', 'kenburns-3', 'kenburns-4'];
    #currentImageIndex = 0;
    #intervalId = null;
    #imageElements = [];

    constructor(screenManager, uiManager, audioManager /*, accountManager // Removido se não usado para mais nada */) {
        this.screenManager = screenManager;
        this.uiManager = uiManager;
        this.audioManager = audioManager;
        // this.#accountManager = accountManager;
        console.log("TitlescreenUi: Instance created.");
    }

    init(screenElement) {
        console.log("TitlescreenUi: Initializing...");

        // LÓGICA DE REDIRECIONAMENTO AUTOMÁTICO REMOVIDA DAQUI
        // O fluxo de login/setup é gerenciado após o clique nos botões de Login/Criar Conta (em main.js)

        this.#bannerElement = screenElement?.querySelector('#titlescreen-banner');

        if (!this.#bannerElement) {
            console.error("TitlescreenUi Error: Banner element #titlescreen-banner not found!");
        } else if (this.#imageUrls.length === 0) {
            console.warn("TitlescreenUi: No image URLs provided for the banner.");
            this.#bannerElement.style.backgroundColor = '#111';
        } else {
            this.#setupBannerElements(); // <<< ESTA LINHA AGORA SERÁ EXECUTADA
            this.#startBannerCycle();    // <<< ESTA LINHA AGORA SERÁ EXECUTADA
        }

        if (screenElement) {
            this.#bindTitleScreenActions(screenElement); // <<< ESTA LINHA AGORA SERÁ EXECUTADA
            console.log("TitlescreenUi: Initialized, banner started, and actions bound.");
        } else {
            console.error("TitlescreenUi Error: screenElement is null or undefined in init. Cannot bind actions.");
        }
    }

    // ... (métodos destroy, #setupBannerElements, #startBannerCycle, #showNextImage, #applyRandomKenBurns, #bindTitleScreenActions
    //      permanecem os mesmos da sua última versão)

    destroy() {
        console.log("TitlescreenUi: Destroying...");
        if (this.#intervalId) {
            clearInterval(this.#intervalId);
            this.#intervalId = null;
        }
        if (this.#bannerElement) {
            this.#imageElements.forEach(div => div.remove());
        }
        this.#imageElements = [];
        this.#currentImageIndex = 0;
        const $screen = $(this.#bannerElement?.closest('#title-screen'));
        if ($screen?.length) {
            $screen.find('.title-menu').off('click.titlescreen');
            $screen.find('.title-menu button').off('mouseenter.titlescreen');
        }
        this.#bannerElement = null;
    }

    #setupBannerElements() {
        if (!this.#bannerElement) return;
        this.#bannerElement.innerHTML = '';
        this.#imageElements = [];
        for (let i = 0; i < 2; i++) {
            const div = document.createElement('div');
            div.classList.add('banner-image');
            this.#bannerElement.appendChild(div);
            this.#imageElements.push(div);
        }
        if (this.#imageUrls.length > 0) {
            this.#currentImageIndex = Math.floor(Math.random() * this.#imageUrls.length);
            const firstDiv = this.#imageElements[0];
            if (firstDiv) {
                firstDiv.style.backgroundImage = `url('${this.#imageUrls[this.#currentImageIndex]}')`;
                this.#applyRandomKenBurns(firstDiv);
                setTimeout(() => {
                    if (this.#imageElements[0]) {
                        this.#imageElements[0].classList.add('active');
                    }
                }, 50);
            }
        }
    }

    #startBannerCycle() {
        if (this.#intervalId) clearInterval(this.#intervalId);
        if (this.#imageUrls.length > 1) {
            this.#intervalId = setInterval(() => this.#showNextImage(), this.#imageDisplayTime);
        }
    }

    #showNextImage() {
        if (!this.#bannerElement || this.#imageElements.length < 2) return;
        const activeDiv = this.#imageElements.find(div => div.classList.contains('active'));
        const nextDiv = this.#imageElements.find(div => !div.classList.contains('active'));
        if (!nextDiv) return;
        const nextImageIndex = (this.#currentImageIndex + 1) % this.#imageUrls.length;
        nextDiv.style.backgroundImage = `url('${this.#imageUrls[nextImageIndex]}')`;
        this.#applyRandomKenBurns(nextDiv);
        activeDiv?.classList.remove('active');
        activeDiv?.classList.add('exiting');
        nextDiv.classList.add('active');
        setTimeout(() => {
            const exitedDiv = this.#bannerElement?.querySelector('.banner-image.exiting');
            exitedDiv?.classList.remove('exiting');
        }, 1000);
        this.#currentImageIndex = nextImageIndex;
    }

    #applyRandomKenBurns(element) {
        if (!this.#kenBurnsClasses || this.#kenBurnsClasses.length === 0 || !element) return;
        this.#kenBurnsClasses.forEach(kbClass => element.classList.remove(kbClass));
        const randomIndex = Math.floor(Math.random() * this.#kenBurnsClasses.length);
        element.classList.add(this.#kenBurnsClasses[randomIndex]);
    }

    #bindTitleScreenActions(screenElement) {
        const $screen = $(screenElement);
        const self = this;
        $screen.find('.title-menu').off('click.titlescreen');
        $screen.find('.title-menu button').off('mouseenter.titlescreen');
        $screen.find('.title-menu').on('click.titlescreen', 'button', (event) => {
            const action = $(event.currentTarget).data('action');
            self.audioManager?.playSFX('buttonClick');
            switch (action) {
                case 'login': self.uiManager?.navigateTo('login-screen'); break;
                case 'create-account': self.uiManager?.navigateTo('create-account-screen'); break;
                case 'settings': self.uiManager?.navigateTo('options-screen'); break;
                default: console.warn(`Titlescreen: Unknown button action '${action}'`);
            }
        });
        $screen.find('.title-menu button').on('mouseenter.titlescreen', () => {
            self.audioManager?.playSFX('buttonHover');
        });
    }
}