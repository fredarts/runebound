// js/audio/AudioManager.js - ATUALIZADO (v2.6 - Volume Sliders Fix)

const DEFAULT_BGM_VOLUME = 0.6;
const DEFAULT_SFX_VOLUME = 0.8;
const FADE_DURATION_MS = 500;
const FADE_INTERVAL_MS = 50;
const SFX_POOL_SIZE = 8;

export default class AudioManager {
    #bgmAudio;
    #sfxPool = [];
    #currentSfxIndex = 0;
    #currentBgmSrc = null;
    #targetBgmVolume = DEFAULT_BGM_VOLUME;
    #sfxVolume = DEFAULT_SFX_VOLUME;
    #isMusicMuted = false;
    #isSfxMuted = false;
    #fadeInterval = null;

    #bgmTracks = { // Definir os caminhos corretos
        'title-screen': 'assets/audio/bgm_title.mp3',
        'home-screen': 'assets/audio/bgm_title.mp3',
        'profile-screen': 'assets/audio/bgm_profile.mp3',
        'deck-management-screen': 'assets/audio/bgm_builder.mp3',
        'deck-builder-screen': 'assets/audio/bgm_builder.mp3',
        'connect-screen': 'assets/audio/bgm_title.mp3',
        'options-screen': 'assets/audio/bgm_title.mp3',
        'battle-screen': 'assets/audio/bgm_battle.mp3',
    };

    #sfxTracks = { // Definir os caminhos corretos
        'buttonHover': 'assets/audio/sfx_hover.mp3',
        'buttonClick': 'assets/audio/sfx_click.mp3',
        'loginError': 'assets/audio/sfx_error.mp3',
        'createAccountError': 'assets/audio/sfx_error.mp3',
        'cardDraw': 'assets/audio/sfx_card_draw.mp3',
        'cardDiscard': 'assets/audio/sfx_card_discard.mp3',
        'playCreature': 'assets/audio/sfx_play_creature.mp3', // Precisa existir esse arquivo
        'playInstant': 'assets/audio/sfx_play_instant.wav', // Precisa existir esse arquivo
        'playRunebinding': 'assets/audio/sfx_play_runebinding.mp3', // Precisa existir esse arquivo
        'gameOverWin': 'assets/audio/sfx_game_over_win.mp3',
        'gameOverLose': 'assets/audio/sfx_game_over_lose.mp3', // Precisa existir esse arquivo
        'genericError': 'assets/audio/sfx_error.mp3',
        'deckSave': 'assets/audio/sfx_deck_save.mp3',
        // Adicione outros SFX conforme necessário
    };

    constructor() {
        console.log("AudioManager: Initializing...");
        this._createAudioElements();
        this._loadSettings(); // Carrega volume E mute state
        this._applySfxVolume(); // Aplica volume SFX inicial (considerando mute)
        this._applyBgmVolume(); // Aplica volume BGM inicial (considerando mute)
        console.log(`AudioManager: Initialized (Target BGM Vol: ${this.#targetBgmVolume}, SFX Vol: ${this.#sfxVolume}, Music Muted: ${this.#isMusicMuted}, SFX Muted: ${this.#isSfxMuted})`);
    }

    _createAudioElements() {
        this.#bgmAudio = new Audio();
        this.#bgmAudio.loop = true;
        for (let i = 0; i < SFX_POOL_SIZE; i++) {
            this.#sfxPool.push(new Audio());
        }
    }

    _loadSettings() {
        try {
            const storedOptions = localStorage.getItem('runebound_clash_options');
            if (storedOptions) {
                const options = JSON.parse(storedOptions);
                // Usa ?? para garantir que pega o valor mesmo se for 0, diferente de ||
                this.#targetBgmVolume = (options.musicVolume ?? DEFAULT_BGM_VOLUME * 100) / 100;
                this.#sfxVolume = (options.sfxVolume ?? DEFAULT_SFX_VOLUME * 100) / 100;
                this.#isMusicMuted = options.isMusicMuted ?? false;
                this.#isSfxMuted = options.isSfxMuted ?? false;
                console.log("AudioManager: Loaded settings from localStorage.");
            } else {
                console.log("AudioManager: No saved settings found, using defaults.");
                this.#targetBgmVolume = DEFAULT_BGM_VOLUME;
                this.#sfxVolume = DEFAULT_SFX_VOLUME;
                this.#isMusicMuted = false;
                this.#isSfxMuted = false;
            }
        } catch (e) {
            console.error("AudioManager: Error loading settings:", e);
            this.#targetBgmVolume = DEFAULT_BGM_VOLUME;
            this.#sfxVolume = DEFAULT_SFX_VOLUME;
            this.#isMusicMuted = false;
            this.#isSfxMuted = false;
        }
        // Garante limites 0.0 a 1.0
        this.#targetBgmVolume = Math.max(0, Math.min(1, this.#targetBgmVolume));
        this.#sfxVolume = Math.max(0, Math.min(1, this.#sfxVolume));
    }

    _applySfxVolume() {
        const effectiveSfxVolume = this.#isSfxMuted ? 0 : this.#sfxVolume;
        this.#sfxPool.forEach(sfx => {
            sfx.volume = effectiveSfxVolume;
        });
         //console.log(`AudioManager: SFX Volume applied: ${effectiveSfxVolume} (Muted: ${this.#isSfxMuted})`);
    }

    _applyBgmVolume() {
        const effectiveBgmVolume = this.#isMusicMuted ? 0 : this.#targetBgmVolume;
        // Aplica diretamente se não estiver em fade, senão o fade controlará
        if (!this.#fadeInterval && !this.#bgmAudio.paused) {
            this.#bgmAudio.volume = effectiveBgmVolume;
        }
         //console.log(`AudioManager: BGM Volume target: ${this.#targetBgmVolume}, effective: ${effectiveBgmVolume} (Muted: ${this.#isMusicMuted})`);

        // Pausa se mutar e estiver tocando
        if(this.#isMusicMuted && !this.#bgmAudio.paused) {
            console.log("AudioManager: Muting BGM, pausing track.");
            this.#bgmAudio.pause();
        }
        // Se desmutar e tinha uma música definida E estava pausada por causa do mute, tenta retomar
        else if (!this.#isMusicMuted && this.#bgmAudio.paused && this.#currentBgmSrc) {
             // Verifica se a pausa foi devido ao mute (pode ser complexo saber com certeza)
             // Tentativa simples: se desmutou e estava pausado com src, tenta tocar
            console.log("AudioManager: Unmuting BGM, attempting to resume track.");
            this._fadeInBGM(this.#currentBgmSrc); // Retoma com fade
        }
    }

    updateSettings() {
        console.log("AudioManager: Updating settings from storage...");
        this._loadSettings(); // Recarrega tudo, incluindo mute states
        this._applySfxVolume(); // Aplica volume SFX (considerando mute)
        this._applyBgmVolume(); // Aplica volume BGM (considerando mute e estado atual)
        console.log(`AudioManager: Settings updated (Target BGM Vol: ${this.#targetBgmVolume}, SFX Vol: ${this.#sfxVolume}, Music Muted: ${this.#isMusicMuted}, SFX Muted: ${this.#isSfxMuted})`);
    }

    playBGM(screenId) {
        const newTrackSrc = this.#bgmTracks[screenId];

        if (!newTrackSrc) {
            console.warn(`AudioManager: No BGM track for screen '${screenId}'. Stopping.`);
            this.stopBGM();
            return;
        }

         // Se mutado, apenas guarda a faixa e para a atual
         if (this.#isMusicMuted) {
              console.log(`AudioManager: Music is muted. Setting desired track to ${newTrackSrc} and stopping current.`);
              this.stopBGM(); // Para a música atual (com fade out)
              this.#currentBgmSrc = newTrackSrc; // Guarda qual deveria tocar
              return;
         }

        // Se não está mutado
        if (this.#currentBgmSrc === newTrackSrc && !this.#bgmAudio.paused) {
            return; // Já está tocando a correta
        }

        console.log(`AudioManager: Changing BGM to track for '${screenId}': ${newTrackSrc}`);
        if (!this.#bgmAudio.paused && this.#currentBgmSrc) {
            this._fadeOutBGM(() => this._fadeInBGM(newTrackSrc));
        } else {
            this._fadeInBGM(newTrackSrc);
        }
    }

    stopBGM() {
        if (!this.#bgmAudio.paused) {
            console.log("AudioManager: Stopping BGM...");
            this._fadeOutBGM(() => {
                this.#currentBgmSrc = null; // Limpa a faixa atual SÓ depois do fade out
                console.log("AudioManager: BGM stopped and track cleared.");
            });
        } else {
            // Se já estiver pausada, apenas limpa a referência
             this.#currentBgmSrc = null;
             console.log("AudioManager: BGM already stopped, clearing track reference.");
        }
    }

    _fadeOutBGM(onCompleteCallback) {
        if (this.#fadeInterval) clearInterval(this.#fadeInterval);
        if (this.#bgmAudio.paused || this.#bgmAudio.volume <= 0.01) {
            this.#bgmAudio.pause();
            this.#bgmAudio.volume = 0;
            if (onCompleteCallback) onCompleteCallback();
            return;
        }
        const startVolume = this.#bgmAudio.volume;
        const steps = FADE_DURATION_MS / FADE_INTERVAL_MS;
        const decrement = startVolume / steps;
        this.#fadeInterval = setInterval(() => {
            let newVolume = this.#bgmAudio.volume - decrement;
            if (newVolume <= 0) {
                newVolume = 0;
                this.#bgmAudio.pause();
                clearInterval(this.#fadeInterval);
                this.#fadeInterval = null;
                console.log("AudioManager: Fade out complete.");
                if (onCompleteCallback) onCompleteCallback();
            }
            this.#bgmAudio.volume = newVolume;
        }, FADE_INTERVAL_MS);
    }

    _fadeInBGM(src) {
        if (this.#fadeInterval) clearInterval(this.#fadeInterval);
        // Não inicia se a música estiver mutada
        if (this.#isMusicMuted) {
            console.log("AudioManager: Music muted, fade in skipped.");
            this.#currentBgmSrc = src; // Guarda a música que deveria tocar
            return;
        }

        this.#bgmAudio.src = src;
        this.#currentBgmSrc = src;
        this.#bgmAudio.volume = 0; // Começa com volume 0

        // Define o volume alvo baseado no estado NÃO mutado
        const targetVol = this.#targetBgmVolume; // Usa o volume alvo (não mutado)
        if (targetVol <= 0) {
            // Se o volume alvo é 0, não faz fade, só define e toca (mas vai ser inaudível)
            this.#bgmAudio.volume = 0;
             this.#bgmAudio.play().catch(e => console.error("AudioManager BGM play failed:", e));
            return;
        }

        this.#bgmAudio.play().then(() => {
            console.log(`AudioManager: BGM playback started for fade in to ${targetVol}.`);
            const steps = FADE_DURATION_MS / FADE_INTERVAL_MS;
            const increment = targetVol / steps;
            this.#fadeInterval = setInterval(() => {
                let newVolume = this.#bgmAudio.volume + increment;
                if (newVolume >= targetVol) {
                    newVolume = targetVol;
                    clearInterval(this.#fadeInterval);
                    this.#fadeInterval = null;
                    console.log("AudioManager: Fade in complete.");
                }
                 // Garante que o volume real aplicado respeite o mute
                 this.#bgmAudio.volume = this.#isMusicMuted ? 0 : newVolume;
            }, FADE_INTERVAL_MS);
        }).catch(error => {
            console.error("AudioManager: BGM play failed:", error);
             // Se falhar ao tocar, limpa a faixa atual para evitar estado inconsistente
            this.#currentBgmSrc = null;
        });
    }

    playSFX(sfxName) {
        if (this.#isSfxMuted) return; // Sai se SFX estiver mutado

        const trackSrc = this.#sfxTracks[sfxName];
        if (!trackSrc) {
            console.warn(`AudioManager: SFX track not found for '${sfxName}'`);
            return;
        }
        try {
            const sfxPlayer = this._getAvailableSfxPlayer();
             // Define o volume ANTES de tocar, baseado no estado não-mutado
            sfxPlayer.volume = this.#sfxVolume;
            sfxPlayer.src = trackSrc;
            sfxPlayer.play().catch(error => {
                 // Erros de play podem acontecer (ex: interação do usuário necessária)
                 // Não loga como erro grave, apenas aviso
                 console.log(`AudioManager: SFX play warning for ${sfxName}: ${error.message}`);
            });
        } catch (error) {
            console.error(`AudioManager: Error preparing SFX '${sfxName}':`, error);
        }
    }

    _getAvailableSfxPlayer() {
        const player = this.#sfxPool[this.#currentSfxIndex];
        this.#currentSfxIndex = (this.#currentSfxIndex + 1) % SFX_POOL_SIZE;
        return player;
    }

    setMusicMuted(muted) {
        if (this.#isMusicMuted === muted) return;
        this.#isMusicMuted = muted;
        console.log(`AudioManager: Music Muted set to ${muted}`);
        this._applyBgmVolume(); // Aplica imediatamente (pausa/retoma BGM se necessário)
    }

    setSfxMuted(muted) {
        if (this.#isSfxMuted === muted) return;
        this.#isSfxMuted = muted;
        console.log(`AudioManager: SFX Muted set to ${muted}`);
        this._applySfxVolume(); // Aplica imediatamente (afeta futuros SFX)
    }

    // --- NOVOS MÉTODOS PARA VOLUME ---
    /**
     * Define o volume alvo da música (0.0 a 1.0) e aplica imediatamente se não mutado.
     * @param {number} volume - Volume entre 0.0 e 1.0.
     */
    setMusicVolume(volume) {
         const clampedVolume = Math.max(0, Math.min(1, volume));
         if (this.#targetBgmVolume === clampedVolume) return; // Sem mudança
         this.#targetBgmVolume = clampedVolume;
         console.log(`AudioManager: Target Music Volume set to ${clampedVolume}`);
         this._applyBgmVolume(); // Aplica o novo volume (se não mutado)
    }

    /**
     * Define o volume dos efeitos sonoros (0.0 a 1.0) e aplica imediatamente.
     * @param {number} volume - Volume entre 0.0 e 1.0.
     */
    setSfxVolume(volume) {
         const clampedVolume = Math.max(0, Math.min(1, volume));
         if (this.#sfxVolume === clampedVolume) return; // Sem mudança
         this.#sfxVolume = clampedVolume;
         console.log(`AudioManager: SFX Volume set to ${clampedVolume}`);
         this._applySfxVolume(); // Aplica aos players SFX (se não mutado)
    }
    // --- FIM DOS NOVOS MÉTODOS ---

} // Fim da classe AudioManager