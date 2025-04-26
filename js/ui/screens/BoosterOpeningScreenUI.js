// BoosterOpeningScreenUI.js – versão com correções de verso espelhado e cores
// -----------------------------------------------------------------------------
// Alterações principais:
//  • Carta agora é um THREE.Group contendo dois meshes (face + verso)
//  • Espaço de cor sRGB ativado no renderer e em todas as texturas
//  • Luzes mais suaves
//  • Flip troca visibilidade em vez de trocar material
//  • Código escrito para r152+ (usa .colorSpace / .outputColorSpace)
// -----------------------------------------------------------------------------

import * as THREE from 'three';
// import TWEEN from '@tweenjs/tween.js'; // Mantido como global UMD

const USE_BASIC_MATERIAL_DEBUG = true; // true = MeshBasicMaterial para debug

export default class BoosterOpeningScreenUI {
    // Dependências externas
    #screenManager;
    #accountManager;
    #audioManager;
    #uiManager;
    #cardRenderer;

    // Elementos DOM
    #el;
    #canvasContainer;
    #btnSkip;

    // THREE.js
    #scene;
    #camera;
    #renderer;
    #raycaster;
    #mouseVector;
    #textureLoader;
    #animationFrameId = null;

    // Cartas
    #cardGroups = [];           // array de THREE.Group (antes eram meshes)
    #pack = [];
    #currentTopIndex = -1;
    #flippedGroup = null;
    #isFlipping = false;
    #isDismissing = false;

    #cardBackTexture = null;
    #cardFaceTextures = {};     // cache por id

    // Constantes geométricas
    #CARD_ASPECT_RATIO = 1 / 1.4;
    #CARD_WIDTH  = 10;
    #CARD_HEIGHT = this.#CARD_WIDTH / this.#CARD_ASPECT_RATIO;
    #STACK_OFFSET = 0.03;

    #initialized = false;
    #isRendering = false;

    constructor(screenManager, accountManager, audioManager, uiManager, cardRenderer) {
        this.#screenManager  = screenManager;
        this.#accountManager = accountManager;
        this.#audioManager   = audioManager;
        this.#uiManager      = uiManager;
        this.#cardRenderer   = cardRenderer;

        if (!this.#cardRenderer) {
            console.error('BoosterOpeningScreenUI Critical Error: CardRenderer dependency was not injected!');
        }

        // THREE core
        this.#scene         = new THREE.Scene();
        this.#raycaster     = new THREE.Raycaster();
        this.#mouseVector   = new THREE.Vector2();
        this.#textureLoader = new THREE.TextureLoader();

        console.log('BoosterOpeningScreenUI created with Three.js setup.');
    }

    async init() {
        if (this.#initialized) return true;
        console.log('BoosterOpeningScreenUI: Initializing...');

        // --- pega elementos DOM ------------------------------------------------
        this.#el              = $('#booster-opening-screen');
        this.#canvasContainer = this.#el.find('#booster-canvas-container');
        this.#btnSkip         = this.#el.find('#btn-booster-skip');

        if (!this.#el.length || !this.#canvasContainer.length || !this.#btnSkip.length) {
            console.error('BoosterOpeningScreenUI Init Error: Required elements not found!');
            return false;
        }

        try {
            const container = this.#canvasContainer[0];
            let width  = container.offsetWidth  || container.clientWidth  || 300;
            let height = container.offsetHeight || container.clientHeight || 650;

            // Câmera e renderer --------------------------------------------------
            this.#camera = new THREE.PerspectiveCamera(200, width / height, 0.1, 100);
            this.#camera.position.z = 2;

            this.#renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.#renderer.setSize(width, height);
            this.#renderer.setPixelRatio(window.devicePixelRatio);
            this.#renderer.outputColorSpace = THREE.SRGBColorSpace; // r152+

            container.innerHTML = '';
            container.appendChild(this.#renderer.domElement);

            // --- Luzes ---------------------------------------------------------
            const ambient = new THREE.AmbientLight(0xffffff, 0.35);
            this.#scene.add(ambient);
            const sun = new THREE.DirectionalLight(0xffffff, 0.55);
            sun.position.set(2, 4, 5);
            this.#scene.add(sun);

            // Carrega textura do verso primeiro
            await this._loadCardBackTexture();

            // Eventos -----------------------------------------------------------
            this._bindEvents();
            this.#initialized = true;

            // garante resize inicial
            requestAnimationFrame(() => this._onWindowResize());

            console.log('BoosterOpeningScreenUI initialized successfully.');
            return true;
        } catch (err) {
            console.error('BoosterOpeningScreenUI: Error during Three.js setup:', err);
            return false;
        }
    }

    // ---------- Carregamento de texturas --------------------------------------
    async _loadCardBackTexture() {
        return new Promise((resolve, reject) => {
            const path = 'assets/images/ui/card_back_placeholder.png';
            console.log('Loading back texture:', path);
            this.#textureLoader.load(
                path,
                (tex) => {
                    tex.colorSpace = THREE.SRGBColorSpace; // r152+
                    tex.flipY = false;                     // não inverta
                    this.#cardBackTexture = tex;
                    resolve();
                },
                undefined,
                (e) => {
                    console.error('Erro carregando verso da carta:', e);
                    reject(e);
                }
            );
        });
    }

    async _loadCardFaceTexture(cardId) {
        if (this.#cardFaceTextures[cardId]) return this.#cardFaceTextures[cardId];

        const cardDef   = this.#uiManager.getCardDatabase()?.[cardId];
        const imagePath = cardDef?.image_src || 'assets/images/cards/default.png';

        return new Promise((resolve, reject) => {
            this.#textureLoader.load(
                imagePath,
                (tex) => {
                    tex.colorSpace = THREE.SRGBColorSpace;
                    tex.flipY = false;
                    this.#cardFaceTextures[cardId] = tex;
                    resolve(tex);
                },
                undefined,
                (err) => {
                    console.error(`Erro carregando face ${cardId}:`, err);
                    // tenta default
                    this.#textureLoader.load('assets/images/cards/default.png', (dTex) => {
                        dTex.colorSpace = THREE.SRGBColorSpace;
                        dTex.flipY = false;
                        this.#cardFaceTextures[cardId] = dTex;
                        resolve(dTex);
                    }, undefined, (dErr) => reject(dErr));
                }
            );
        });
    }

    // ---------- Eventos -------------------------------------------------------
    _bindEvents() {
        this.#btnSkip.off('click.booster').on('click.booster', () => {
            this.#audioManager?.playSFX('buttonClick');
            this.finish(true);
        });
        this.#btnSkip.off('mouseenter.booster').on('mouseenter.booster', () => {
            this.#audioManager?.playSFX('buttonHover');
        });

        if (this.#renderer?.domElement) {
            this.#renderer.domElement.addEventListener('click', this._onCanvasClick.bind(this), false);
        }
        window.addEventListener('resize', this._onWindowResize.bind(this), false);
    }

    _onWindowResize() {
        if (!this.#initialized) return;
        const container = this.#canvasContainer[0];
        const w = container.offsetWidth  || container.clientWidth;
        const h = container.offsetHeight || container.clientHeight;
        if (!w || !h) return;

        if (this.#camera.aspect !== w / h) {
            this.#camera.aspect = w / h;
            this.#camera.updateProjectionMatrix();
        }
        const size = this.#renderer.getSize(new THREE.Vector2());
        if (size.x !== w || size.y !== h) this.#renderer.setSize(w, h);
    }

    // ---------- Render --------------------------------------------------------
    async render({ pack = [] } = {}) {
        if (!this.#initialized && !(await this.init())) {
            console.error('Não inicializado – abortando render.');
            return;
        }
        this.#isRendering = true;
        this.#pack        = pack;

        if (!Array.isArray(this.#pack) || !this.#pack.length) {
            console.warn('Pacote vazio – saindo.');
            this.finish(true);
            return;
        }

        this._cleanupThreeScene();
        this.#cardGroups   = [];
        this.#flippedGroup = null;
        this.#isFlipping   = false;
        this.#isDismissing = false;

        const geometry = new THREE.PlaneGeometry(this.#CARD_WIDTH, this.#CARD_HEIGHT);
        const Material  = USE_BASIC_MATERIAL_DEBUG ? THREE.MeshBasicMaterial : THREE.MeshStandardMaterial;
        if (USE_BASIC_MATERIAL_DEBUG) console.warn('USANDO MeshBasicMaterial para DEBUG');

        const backMaterialBase = new Material({
            map: this.#cardBackTexture,
            side: THREE.DoubleSide,
            transparent: false,
            color: 0xffffff
        });

        // Carrega faces em paralelo
        const faceTextures = await Promise.all(this.#pack.map(id => this._loadCardFaceTexture(id)));

        // Cria grupos de cartas
        this.#pack.forEach((cardId, idx) => {
            const faceTex = faceTextures[idx];
            const faceMat = new Material({ map: faceTex, side: THREE.DoubleSide, transparent: false, color: 0xffffff });
            const backMat = backMaterialBase.clone();

            // Verso
            const backMesh = new THREE.Mesh(geometry, backMat);
            backMesh.rotation.y = Math.PI; // 180°

            // Frente
            const frontMesh = new THREE.Mesh(geometry, faceMat);
            frontMesh.visible = false;

            // Grupo
            const group = new THREE.Group();
            group.add(backMesh);
            group.add(frontMesh);
            group.position.set(0, 0, idx * this.#STACK_OFFSET);

            group.userData = {
                cardId,
                isFlipped: false,
                isTopCard: idx === this.#pack.length - 1,
                backMesh,
                frontMesh,
                isInteractive: idx === this.#pack.length - 1
            };
            group.name = `card-${cardId}-${idx}`;

            this.#scene.add(group);
            this.#cardGroups.push(group);
        });

        this.#currentTopIndex = this.#cardGroups.length - 1;
        this._startAnimationLoop();
    }

    // ---------- Animation loop -----------------------------------------------
    _startAnimationLoop() {
        if (this.#animationFrameId) return;
        const animate = () => {
            if (!this.#isRendering) return;
            this.#animationFrameId = requestAnimationFrame(animate);
            try {
                TWEEN.update();
                this.#renderer.render(this.#scene, this.#camera);
            } catch (err) {
                console.error('Erro no render loop:', err);
                this._stopAnimationLoop();
            }
        };
        animate();
    }

    _stopAnimationLoop() {
        if (this.#animationFrameId) cancelAnimationFrame(this.#animationFrameId);
        this.#animationFrameId = null;
    }

    // ---------- Interação -----------------------------------------------------
    _onCanvasClick(ev) {
        if (!this.#isRendering || this.#isFlipping || this.#isDismissing || this.#currentTopIndex < 0) return;

        const rect = this.#renderer.domElement.getBoundingClientRect();
        this.#mouseVector.x = ((ev.clientX - rect.left) / rect.width)  * 2 - 1;
        this.#mouseVector.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

        this.#raycaster.setFromCamera(this.#mouseVector, this.#camera);
        const intersects = this.#raycaster.intersectObjects(this.#cardGroups, true);
        if (!intersects.length) return;

        const clickedGroup = intersects[0].object.parent; // mesh -> group
        const topGroup     = this.#cardGroups[this.#currentTopIndex];

        if (clickedGroup !== topGroup || !clickedGroup.userData.isInteractive) return;

        if (!clickedGroup.userData.isFlipped) this._flipCard(clickedGroup);
        else this._dismissCard(clickedGroup);
    }

    _flipCard(group) {
        if (this.#isFlipping || this.#isDismissing) return;
        this.#isFlipping = true;
        group.userData.isInteractive = false;
        this.#flippedGroup = group;
        this.#audioManager?.playSFX('cardDraw');

        const DUR = 600;
        const back = group.userData.backMesh;
        const front = group.userData.frontMesh;

        new TWEEN.Tween(group.rotation)
            .to({ y: group.rotation.y + Math.PI }, DUR)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                const localRot = group.rotation.y % Math.PI;
                if (localRot >= Math.PI / 2) {
                    back.visible = false;
                    front.visible = true;
                }
            })
            .onComplete(() => {
                group.userData.isFlipped     = true;
                group.userData.isInteractive = true;
                this.#isFlipping = false;
            })
            .start();
    }

    _dismissCard(group) {
        if (this.#isFlipping || this.#isDismissing || group !== this.#flippedGroup) return;
        this.#isDismissing = true;
        group.userData.isInteractive = false;
        this.#audioManager?.playSFX('cardDiscard');

        const DUR = 400;
        const materials = [group.userData.backMesh.material, group.userData.frontMesh.material];
        materials.forEach(m => { m.transparent = true; m.needsUpdate = true; });

        new TWEEN.Tween(group.scale)
            .to({ x: 0.1, y: 0.1, z: 0.1 }, DUR)
            .easing(TWEEN.Easing.Quadratic.In)
            .onComplete(() => {
                this.#scene.remove(group);
                group.traverse(obj => {
                    if (obj.isMesh) {
                        obj.geometry.dispose();
                        obj.material.dispose();
                    }
                });

                const idx = this.#cardGroups.indexOf(group);
                if (idx > -1) this.#cardGroups.splice(idx, 1);

                this.#currentTopIndex = this.#cardGroups.length - 1;
                this.#flippedGroup    = null;
                this.#isDismissing   = false;

                if (this.#currentTopIndex < 0) this.finish(false);
                else this.#cardGroups[this.#currentTopIndex].userData.isInteractive = true;
            })
            .start();
    }

    // ---------- Finalização / limpeza ----------------------------------------
    finish(skipped = false) {
        if (!this.#isRendering) return;
        this.#isRendering = false;
        this._stopAnimationLoop();
        TWEEN.removeAll();

        if (this.#pack.length) {
            try { this.#accountManager.addCardsToCollection([...this.#pack]); }
            catch (e) { console.error('Erro ao adicionar cartas', e); }
        }

        setTimeout(() => {
            this._cleanupThreeScene();
            this.#uiManager?.navigateTo('set-collection-screen');
        }, skipped ? 100 : 600);
    }

    _cleanupThreeScene() {
        this._stopAnimationLoop();
        while (this.#scene.children.length) {
            const obj = this.#scene.children[0];
            this.#scene.remove(obj);
            if (obj.isMesh) {
                obj.geometry.dispose();
                obj.material.dispose();
            }
        }
        this.#cardGroups   = [];
        this.#currentTopIndex = -1;
        this.#flippedGroup = null;
    }

    destroy() {
        console.log('BoosterOpeningScreenUI: Destroying...');
        this.#isRendering = false;
        this._stopAnimationLoop();
        TWEEN.removeAll();
        this.#btnSkip?.off('.booster');
        window.removeEventListener('resize', this._onWindowResize);
        if (this.#renderer?.domElement) this.#renderer.domElement.removeEventListener('click', this._onCanvasClick);
        this._cleanupThreeScene();
        if (this.#renderer) {
            this.#renderer.dispose();
            this.#renderer = null;
        }
        this.#scene = this.#camera = this.#raycaster = this.#mouseVector = null;
        this.#initialized = false;
    }
}
