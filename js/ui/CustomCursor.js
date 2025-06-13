// js/ui/CustomCursor.js

export default class CustomCursor {
    #cursorElement = null;
    #spritePath = 'assets/images/ui/cursor/'; // Caminho para seus sprites
    #spriteFiles = ['01.png', '02.png', '03.png', '04.png', '05.png', '06.png', '07.png', '08.png'];
    #frameCount = 8; // Número total de frames na sua animação
    #currentFrame = 0;
    #animationIntervalId = null;
    #animationSpeed = 60; // Milissegundos por frame (ajuste para a velocidade desejada)

    constructor(animationSpeed = 60) {
        this.#animationSpeed = animationSpeed;
        this._createCursorElement();
        this._bindEvents();
        this.startAnimation();
        console.log("CustomCursor initialized.");
    }

    _createCursorElement() {
        this.#cursorElement = document.createElement('div');
        this.#cursorElement.id = 'custom-cursor';
        // A primeira imagem é definida no startAnimation
        document.body.appendChild(this.#cursorElement);
    }

    _bindEvents() {
        // Atualizar a posição do cursor customizado quando o mouse se mover
        document.addEventListener('mousemove', (e) => {
            if (this.#cursorElement) {
                // Ajuste de offsetX e offsetY para o hotspot do cursor.
                // Se você removeu o 'transform: translate(-50%, -50%)' do CSS,
                // e o hotspot do seu cursor é o canto superior esquerdo, use:
                // this.#cursorElement.style.left = `${e.clientX}px`;
                // this.#cursorElement.style.top = `${e.clientY}px`;

                // Se você manteve o transform no CSS para centralizar,
                // ou se o hotspot é o centro do sprite:
                this.#cursorElement.style.left = `${e.pageX}px`; // Usar pageX/pageY para consistência com scroll
                this.#cursorElement.style.top = `${e.pageY}px`;
            }
        });

        // Opcional: Esconder o cursor customizado se o mouse sair da janela
        document.addEventListener('mouseout', (e) => {
            if (this.#cursorElement && !e.relatedTarget && !e.toElement) {
                // this.#cursorElement.style.display = 'none';
            }
        });
        document.addEventListener('mouseover', (e) => {
            if (this.#cursorElement) {
                // this.#cursorElement.style.display = 'block';
            }
        });
    }

    _updateFrame() {
        if (!this.#cursorElement) return;
        this.#currentFrame = (this.#currentFrame + 1) % this.#frameCount;
        const nextImageFile = this.#spriteFiles[this.#currentFrame];
        this.#cursorElement.style.backgroundImage = `url('${this.#spritePath}${nextImageFile}')`;
    }

    startAnimation() {
        if (this.#animationIntervalId) {
            clearInterval(this.#animationIntervalId);
        }
        // Define o frame inicial
        if (this.#cursorElement && this.#spriteFiles.length > 0) {
             this.#cursorElement.style.backgroundImage = `url('${this.#spritePath}${this.#spriteFiles[0]}')`;
        }
        this.#animationIntervalId = setInterval(() => {
            this._updateFrame();
        }, this.#animationSpeed);
    }

    stopAnimation() {
        if (this.#animationIntervalId) {
            clearInterval(this.#animationIntervalId);
            this.#animationIntervalId = null;
        }
    }

    destroy() {
        this.stopAnimation();
        this.#cursorElement?.remove();
        this.#cursorElement = null;
        // Remover event listeners do document se necessário (geralmente não é,
        // pois a instância CustomCursor será destruída junto com a aplicação ou ao trocar de lógica de cursor)
        console.log("CustomCursor destroyed.");
    }
}