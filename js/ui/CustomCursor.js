// js/ui/CustomCursor.js

export default class CustomCursor {
    #cursorElement = null;
    #spritePath = 'assets/images/ui/cursor/';
    #spriteFiles = ['01.png', '02.png', '03.png', '04.png', '05.png', '06.png', '07.png', '08.png'];
    #frameCount = 8;
    #currentFrame = 0;
    #animationIntervalId = null;
    #animationSpeed = 100; // Velocidade da animação do cursor

    // --- Novas propriedades para o Mouse Trail ---
    #trailContainer = null; // Opcional: um container para as partículas
    #trailParticleCount = 0;
    #maxTrailParticles = 30; // Limite para evitar sobrecarga
    #trailParticleBaseSize = 10; // Tamanho base das partículas em pixels
    #trailParticleSizeVariance = 5; // Variação no tamanho
    #trailAnimationDuration = 800; // ms, deve corresponder à animação CSS 'dissipate'
    // --------------------------------------------

    constructor(animationSpeed = 100) {
        this.#animationSpeed = animationSpeed;
        this._createCursorElement();
        this._createTrailContainer(); // <<< NOVO
        this._bindEvents();
        this.startAnimation();
        console.log("CustomCursor with Trail initialized.");
    }

    _createCursorElement() {
        this.#cursorElement = document.createElement('div');
        this.#cursorElement.id = 'custom-cursor';
        document.body.appendChild(this.#cursorElement);
    }

    // --- NOVO: Criar container para o rastro ---
    _createTrailContainer() {
        this.#trailContainer = document.createElement('div');
        this.#trailContainer.id = 'mouse-trail-container';
        // Estilos para o container (opcional, mas pode ajudar na organização)
        // this.#trailContainer.style.position = 'fixed';
        // this.#trailContainer.style.top = '0';
        // this.#trailContainer.style.left = '0';
        // this.#trailContainer.style.width = '100%';
        // this.#trailContainer.style.height = '100%';
        // this.#trailContainer.style.pointerEvents = 'none';
        // this.#trailContainer.style.zIndex = '99997'; // Abaixo do cursor, acima de tudo
        document.body.appendChild(this.#trailContainer);
    }
    // -----------------------------------------

    _bindEvents() {
        document.addEventListener('mousemove', (e) => {
            const mouseX = e.pageX;
            const mouseY = e.pageY;

            if (this.#cursorElement) {
                this.#cursorElement.style.left = `${mouseX}px`;
                this.#cursorElement.style.top = `${mouseY}px`;
            }
            this._createTrailParticle(mouseX, mouseY); // <<< NOVO: Criar partícula no movimento
        });

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

    // --- NOVO: Lógica para criar partículas do rastro ---
    _createTrailParticle(x, y) {
        if (this.#trailParticleCount >= this.#maxTrailParticles) {
            // Opcional: remover a partícula mais antiga se o limite for atingido
            const oldestParticle = this.#trailContainer.firstChild;
            if (oldestParticle) {
                oldestParticle.remove();
                this.#trailParticleCount--;
            } else {
                return; // Não deveria acontecer se a contagem estiver correta
            }
        }

        const particle = document.createElement('div');
        particle.classList.add('mouse-trail-particle');

        const size = this.#trailParticleBaseSize + Math.random() * this.#trailParticleSizeVariance;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        // Posiciona a partícula. O CSS 'transform: translate(-50%, -50%)' na classe da partícula
        // ajudará a centralizá-la no ponto (x, y).
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;

        // Adiciona ao container do rastro ou diretamente ao body
        // (usar um container pode ser melhor para gerenciamento futuro)
        if (this.#trailContainer) {
            this.#trailContainer.appendChild(particle);
        } else {
            document.body.appendChild(particle); // Fallback se o container não existir
        }

        this.#trailParticleCount++;

        // Remover a partícula do DOM após a animação CSS
        setTimeout(() => {
            particle.remove();
            this.#trailParticleCount--;
        }, this.#trailAnimationDuration); // Deve ser igual ou um pouco maior que a duração da animação CSS
    }
    // ---------------------------------------------------

    startAnimation() {
        if (this.#animationIntervalId) {
            clearInterval(this.#animationIntervalId);
        }
        if (this.#cursorElement && this.#spriteFiles.length > 0) {
             this.#cursorElement.style.backgroundImage = `url('${this.#spritePath}${this.#spriteFiles[0]}')`;
        }
        console.log("CustomCursor: Starting animation with speed", this.#animationSpeed);
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
        this.#trailContainer?.remove(); // <<< NOVO: Remover container do rastro
        this.#cursorElement = null;
        this.#trailContainer = null;
        console.log("CustomCursor with Trail destroyed.");
    }
}