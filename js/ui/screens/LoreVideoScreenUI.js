// js/ui/screens/LoreVideoScreenUI.js

export default class LoreVideoScreenUI {
    #uiManager;
    #audioManager;
    #screenElement;
    #videoPlayer;
    #skipButton;
    #loadingMessage;

    #eventListenersBound = false;
    #navigationInitiated = false;

    #videoEndedOrSkippedHandler = null;
    #videoErrorHandler = null;
    #videoCanPlayHandler = null;
    #videoPlayingHandler = null; // Novo handler
    #skipButtonHoverHandler = null;

    constructor(uiManager, audioManager) {
        this.#uiManager = uiManager;
        this.#audioManager = audioManager;
        console.log("LoreVideoScreenUI instance created.");
    }

    init(screenElement) {
        this.#screenElement = screenElement;
        this.#videoPlayer = this.#screenElement.querySelector('#lore-video-player');
        this.#skipButton = this.#screenElement.querySelector('#btn-skip-lore-video');
        this.#loadingMessage = this.#screenElement.querySelector('#video-loading-message');
        this.#navigationInitiated = false;

        if (!this.#videoPlayer || !this.#skipButton || !this.#loadingMessage) {
            console.error("LoreVideoScreenUI: Elementos essenciais do vídeo não encontrados no DOM.");
            this._navigateToDeckChoice();
            return;
        }

        console.log("LoreVideoScreenUI: Video player path from HTML:", this.#videoPlayer.currentSrc || this.#videoPlayer.querySelector('source')?.src);


        if (!this.#eventListenersBound) {
            this._defineEventHandlers();
            this._bindEvents();
            this.#eventListenersBound = true;
        }

        this.#audioManager?.stopBGM();
        this.#loadingMessage.textContent = 'Carregando vídeo...';
        this.#loadingMessage.style.display = 'block';
        this.#videoPlayer.style.display = 'block'; // Garante que o elemento vídeo não esteja display:none pelo CSS

        // Verifique se o vídeo tem dimensões visíveis (debug)
        setTimeout(() => {
            if (this.#videoPlayer && (this.#videoPlayer.offsetWidth === 0 || this.#videoPlayer.offsetHeight === 0) && !this.#videoPlayer.error) {
                console.warn("LoreVideoScreenUI DEBUG: Video element has zero dimensions but no error. Check CSS.", 
                             {width: this.#videoPlayer.offsetWidth, height: this.#videoPlayer.offsetHeight});
            }
        }, 100);


        this.#videoPlayer.load(); // Inicia o carregamento do vídeo
    }

    _defineEventHandlers() {
        this.#videoEndedOrSkippedHandler = () => {
            if (this.#navigationInitiated) return;
            this.#navigationInitiated = true;
            console.log("LoreVideoScreenUI: Video ended or skip triggered.");
            this.#videoPlayer?.pause();
            this._removeVideoEventListeners();
            this._navigateToDeckChoice();
        };

        this.#videoErrorHandler = (e) => {
            if (this.#navigationInitiated) return;
            console.error("LoreVideoScreenUI: Erro no elemento VIDEO:", e);
            let errorMsg = "Erro ao carregar vídeo.";
            if (e.target && e.target.error) {
                switch (e.target.error.code) {
                    case e.target.error.MEDIA_ERR_ABORTED: errorMsg = 'Reprodução abortada.'; break;
                    case e.target.error.MEDIA_ERR_NETWORK: errorMsg = 'Erro de rede ao carregar.'; break;
                    case e.target.error.MEDIA_ERR_DECODE: errorMsg = 'Erro ao decodificar (formato inválido?).'; break;
                    case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg = 'Fonte não encontrada ou formato não suportado.'; break;
                    default: errorMsg = `Erro desconhecido (cód: ${e.target.error.code}).`;
                }
            }
            this.#loadingMessage.innerHTML = `${errorMsg} <br>Verifique o console. Clique em 'Pular'.`;
            this.#loadingMessage.style.display = 'block';
            // this.#videoPlayer.style.display = 'none'; // Não esconder, pode ser útil para debug CSS
        };

        this.#videoCanPlayHandler = () => {
            if (this.#navigationInitiated) return;
            console.log("LoreVideoScreenUI: Evento 'canplay'. Vídeo pronto para iniciar. Tentando play...");
            this.#loadingMessage.style.display = 'none'; // Esconde "Carregando"
            
            const playPromise = this.#videoPlayer.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log("LoreVideoScreenUI: Playback iniciado com sucesso (promessa resolvida).");
                    // O evento 'playing' confirmará
                }).catch(error => {
                    if (this.#navigationInitiated) return;
                    console.warn("LoreVideoScreenUI: Autoplay bloqueado ou falhou na promessa:", error.name, error.message);
                    this.#loadingMessage.innerHTML = "Autoplay bloqueado. <br>Clique em 'Pular' ou habilite autoplay no seu navegador.";
                    this.#loadingMessage.style.display = 'block';
                });
            } else { // Para navegadores mais antigos sem promessa de play
                if (this.#videoPlayer.paused && !this.#navigationInitiated) {
                    console.warn("LoreVideoScreenUI: Autoplay parece ter falhado (vídeo pausado, sem promessa).");
                    this.#loadingMessage.innerHTML = "Autoplay falhou. Clique em 'Pular'.";
                    this.#loadingMessage.style.display = 'block';
                }
            }
        };

        this.#videoPlayingHandler = () => { // NOVO HANDLER
            if (this.#navigationInitiated) return;
            console.log("LoreVideoScreenUI: Evento 'playing'. Vídeo está tocando visualmente.");
            this.#loadingMessage.style.display = 'none';
        };

        this.#skipButtonHoverHandler = () => {
            this.#audioManager?.playSFX('buttonHover');
        };
    }

    _bindEvents() {
        this.#videoPlayer.addEventListener('ended', this.#videoEndedOrSkippedHandler);
        this.#videoPlayer.addEventListener('error', this.#videoErrorHandler);
        this.#videoPlayer.addEventListener('canplay', this.#videoCanPlayHandler);
        this.#videoPlayer.addEventListener('playing', this.#videoPlayingHandler); // <<< OUVIR EVENTO 'playing'

        this.#skipButton.addEventListener('click', this.#videoEndedOrSkippedHandler); // Reutiliza o handler
        this.#skipButton.addEventListener('mouseenter', this.#skipButtonHoverHandler);
    }

    _removeVideoEventListeners() {
        if (this.#videoPlayer) {
            this.#videoPlayer.removeEventListener('ended', this.#videoEndedOrSkippedHandler);
            this.#videoPlayer.removeEventListener('error', this.#videoErrorHandler);
            this.#videoPlayer.removeEventListener('canplay', this.#videoCanPlayHandler);
            this.#videoPlayer.removeEventListener('playing', this.#videoPlayingHandler); // <<< REMOVER NOVO HANDLER
        }
    }

    _navigateToDeckChoice() {
        console.log("LoreVideoScreenUI: _navigateToDeckChoice called.");
        this.#uiManager.navigateTo('initial-deck-choice-screen');
    }

    destroy() {
        console.log("LoreVideoScreenUI: Destroying...");
        if (this.#videoPlayer) {
            this.#videoPlayer.pause();
            this.#videoPlayer.removeAttribute('src');
            try { this.#videoPlayer.load(); } catch(e) {} // Tenta limpar o buffer
            this._removeVideoEventListeners();
        }
        if (this.#skipButton && this.#videoEndedOrSkippedHandler && this.#skipButtonHoverHandler) {
            this.#skipButton.removeEventListener('click', this.#videoEndedOrSkippedHandler);
            this.#skipButton.removeEventListener('mouseenter', this.#skipButtonHoverHandler);
        }
        this.#eventListenersBound = false;
        this.#navigationInitiated = false;
        console.log("LoreVideoScreenUI: Destroy complete.");
    }
}