// js/ui/screens/OptionsUI.js - ATUALIZADO (v2.7 - Retorno Inteligente da Batalha)

export default class OptionsUI {
    #audioManager;
    #screenManager; // Adicionado para obter a tela anterior
    #uiManager;     // Adicionado para navegação

    // --- Elementos da UI (Cache) ---
    #optionsScreenElement;
    #musicVolumeSlider;
    #musicVolumeValueSpan;
    #musicMuteCheckbox;
    #sfxVolumeSlider;
    #sfxVolumeValueSpan;
    #sfxMuteCheckbox;
    #graphicsQualitySelect;
    #cardAnimationsCheckbox;
    #languageSelect;
    #textSizeSelect;
    #highContrastCheckbox;
    #saveButton;
    #backButton; // Adicionado para cache explícito
    #saveMessageParagraph;

    // --- Estado Interno ---
    #options = {
        musicVolume: 60,
        sfxVolume: 80,
        isMusicMuted: false,
        isSfxMuted: false,
        graphicsQuality: 'medium',
        cardAnimations: true,
        language: 'pt-BR',
        textSize: 'normal',
        highContrast: false
    };
    #OPTIONS_STORAGE_KEY = 'runebound_clash_options';

    constructor(audioManager, screenManager, uiManager) { // <<<=== Parâmetros do construtor atualizados
        this.#audioManager = audioManager;
        this.#screenManager = screenManager; // <<<=== Armazena ScreenManager
        this.#uiManager = uiManager;         // <<<=== Armazena UIManager

        this._cacheSelectors();
        if (!this.#optionsScreenElement || !this.#optionsScreenElement.length) {
            console.error("OptionsUI Error: #options-screen element not found!");
            return;
        }
        this._loadOptions();
        this._bindEvents();
        console.log("OptionsUI initialized (v2.7 - Retorno Inteligente da Batalha).");
    }

    _cacheSelectors() {
        this.#optionsScreenElement = $('#options-screen');
        this.#musicVolumeSlider = this.#optionsScreenElement.find('#opt-music-volume');
        this.#musicVolumeValueSpan = this.#musicVolumeSlider.siblings('.volume-value');
        this.#musicMuteCheckbox = this.#optionsScreenElement.find('#opt-mute-music');
        this.#sfxVolumeSlider = this.#optionsScreenElement.find('#opt-sfx-volume');
        this.#sfxVolumeValueSpan = this.#sfxVolumeSlider.siblings('.volume-value');
        this.#sfxMuteCheckbox = this.#optionsScreenElement.find('#opt-mute-sfx');
        this.#graphicsQualitySelect = this.#optionsScreenElement.find('#opt-graphics-quality');
        this.#cardAnimationsCheckbox = this.#optionsScreenElement.find('#opt-card-animations');
        this.#languageSelect = this.#optionsScreenElement.find('#opt-language');
        this.#textSizeSelect = this.#optionsScreenElement.find('#opt-text-size');
        this.#highContrastCheckbox = this.#optionsScreenElement.find('#opt-high-contrast');
        this.#saveButton = this.#optionsScreenElement.find('#btn-save-options');
        this.#backButton = this.#optionsScreenElement.find('#btn-options-back-to-main'); // Cache do botão voltar
        this.#saveMessageParagraph = this.#optionsScreenElement.find('#options-save-message');
    }

    render() {
        console.log("OptionsUI: Rendering options screen controls.");
        if (!this.#optionsScreenElement.length) return;

        this._loadOptions();

        this.#musicVolumeSlider.val(this.#options.musicVolume);
        this.#musicVolumeValueSpan.text(`${this.#options.musicVolume}%`);
        this.#musicMuteCheckbox.prop('checked', this.#options.isMusicMuted);
        this.#musicVolumeSlider.prop('disabled', this.#options.isMusicMuted);

        this.#sfxVolumeSlider.val(this.#options.sfxVolume);
        this.#sfxVolumeValueSpan.text(`${this.#options.sfxVolume}%`);
        this.#sfxMuteCheckbox.prop('checked', this.#options.isSfxMuted);
        this.#sfxVolumeSlider.prop('disabled', this.#options.isSfxMuted);

        this.#graphicsQualitySelect.val(this.#options.graphicsQuality);
        this.#cardAnimationsCheckbox.prop('checked', this.#options.cardAnimations);
        this.#languageSelect.val(this.#options.language);
        this.#textSizeSelect.val(this.#options.textSize);
        this.#highContrastCheckbox.prop('checked', this.#options.highContrast);

        this._applyVisualOptions();
        this.#saveMessageParagraph.text('');
    }

    _bindEvents() {
        console.log("OptionsUI: Binding events...");
        const self = this;
        const namespace = '.options_ui'; // Namespace para os eventos

        this.#optionsScreenElement.off(namespace); // Limpa listeners antigos no elemento raiz para evitar duplicação geral

        // Sliders de Volume
        this.#musicVolumeSlider.off(`input${namespace}`).on(`input${namespace}`, function() {
            const volumeValue = parseInt($(this).val(), 10);
            self.#musicVolumeValueSpan.text(`${volumeValue}%`);
            self.#audioManager?.setMusicVolume(volumeValue / 100);
        });
        this.#sfxVolumeSlider.off(`input${namespace}`).on(`input${namespace}`, function() {
            const volumeValue = parseInt($(this).val(), 10);
            self.#sfxVolumeValueSpan.text(`${volumeValue}%`);
            self.#audioManager?.setSfxVolume(volumeValue / 100);
        });

        // Checkboxes de Mute
        this.#musicMuteCheckbox.off(`change${namespace}`).on(`change${namespace}`, (event) => {
            const isMuted = $(event.currentTarget).is(':checked');
            this.#musicVolumeSlider.prop('disabled', isMuted);
            this.#audioManager?.setMusicMuted(isMuted);
            this.#audioManager?.playSFX('buttonClick');
        });
        this.#sfxMuteCheckbox.off(`change${namespace}`).on(`change${namespace}`, (event) => {
            const isMuted = $(event.currentTarget).is(':checked');
            this.#sfxVolumeSlider.prop('disabled', isMuted);
            this.#audioManager?.setSfxMuted(isMuted);
            this.#audioManager?.playSFX('buttonClick');
        });

        // Botão Salvar
        this.#saveButton.off(`click${namespace}`).on(`click${namespace}`, () => {
            self.#audioManager?.playSFX('deckSave'); // Som de salvar
            self._saveOptions();
            // Após salvar, decide para onde voltar
            const prevScreen = self.#screenManager.getPreviousScreenId();
            if (prevScreen === 'battle-screen') {
                self.#uiManager.navigateTo('battle-screen', { isReturning: true });
            } else {
                self.#uiManager.navigateTo(prevScreen || 'home-screen'); // Ou tela principal como fallback
            }
        });
        this.#saveButton.off(`mouseenter${namespace}`).on(`mouseenter${namespace}`, () => self.#audioManager?.playSFX('buttonHover'));


        // Botão Voltar (MODIFICADO PARA NAVEGAÇÃO INTELIGENTE)
        this.#backButton.off(`click${namespace}`).on(`click${namespace}`, () => {
            self.#audioManager?.playSFX('buttonClick');
            const prevScreen = self.#screenManager.getPreviousScreenId();
            console.log("OptionsUI: Botão Voltar clicado. Tela anterior:", prevScreen);
            if (prevScreen === 'battle-screen') {
                self.#uiManager.navigateTo('battle-screen', { isReturning: true });
            } else {
                // Se a tela anterior não for a de batalha, ou não houver tela anterior, volta para home.
                self.#uiManager.navigateTo(prevScreen || 'home-screen');
            }
        });
        this.#backButton.off(`mouseenter${namespace}`).on(`mouseenter${namespace}`, () => self.#audioManager?.playSFX('buttonHover'));


        // Listeners para aplicar opções visuais imediatamente
        this.#highContrastCheckbox.off(`change${namespace}`).on(`change${namespace}`, (event) => {
             $('body').toggleClass('contrast-high', $(event.currentTarget).is(':checked'));
             this.#audioManager?.playSFX('buttonClick');
        });
        this.#textSizeSelect.off(`change${namespace}`).on(`change${namespace}`, (event) => {
             const newSize = $(event.currentTarget).val();
             $('body').removeClass('text-small text-normal text-large').addClass(`text-${newSize}`);
             this.#audioManager?.playSFX('buttonClick');
        });
    }

    _loadOptions() {
        try {
            const storedOptions = localStorage.getItem(this.#OPTIONS_STORAGE_KEY);
            if (storedOptions) {
                const loaded = JSON.parse(storedOptions);
                this.#options = { ...this.#options, ...loaded };
                this.#options.isMusicMuted = !!this.#options.isMusicMuted;
                this.#options.isSfxMuted = !!this.#options.isSfxMuted;
                console.log("OptionsUI: Options loaded from localStorage:", this.#options);
            } else {
                console.log("OptionsUI: No saved options found, using defaults.");
            }
        } catch (e) {
            console.error("OptionsUI: Error loading options from localStorage:", e);
        }
        this.#audioManager?.setMusicMuted(this.#options.isMusicMuted);
        this.#audioManager?.setSfxMuted(this.#options.isSfxMuted);
    }

    _saveOptions() {
        console.log("OptionsUI: Attempting to save options...");
        this.#options.musicVolume = parseInt(this.#musicVolumeSlider.val(), 10);
        this.#options.sfxVolume = parseInt(this.#sfxVolumeSlider.val(), 10);
        this.#options.isMusicMuted = this.#musicMuteCheckbox.is(':checked');
        this.#options.isSfxMuted = this.#sfxMuteCheckbox.is(':checked');
        this.#options.graphicsQuality = this.#graphicsQualitySelect.val();
        this.#options.cardAnimations = this.#cardAnimationsCheckbox.is(':checked');
        this.#options.language = this.#languageSelect.val();
        this.#options.textSize = this.#textSizeSelect.val();
        this.#options.highContrast = this.#highContrastCheckbox.is(':checked');

        try {
            localStorage.setItem(this.#OPTIONS_STORAGE_KEY, JSON.stringify(this.#options));
            console.log("OptionsUI: Options saved to localStorage:", this.#options);
            this._showMessage('Opções salvas com sucesso!', 'success');
            this._applyVisualOptions();
            this.#audioManager?.updateSettings();
        } catch (e) {
            console.error("OptionsUI: Error saving options to localStorage:", e);
            this._showMessage('Erro ao salvar opções.', 'error');
             this.#audioManager?.playSFX('genericError');
        }
    }

    _applyVisualOptions() {
        $('body')
            .removeClass('text-small text-normal text-large contrast-high')
            .addClass(`text-${this.#options.textSize || 'normal'}`)
            .toggleClass('contrast-high', this.#options.highContrast);
        this.#musicVolumeSlider.prop('disabled', this.#options.isMusicMuted);
        this.#sfxVolumeSlider.prop('disabled', this.#options.isSfxMuted);
        $('body').toggleClass('disable-card-animations', !this.#options.cardAnimations);
    }

    _showMessage(text, type = 'info', duration = 3000) {
        const colorVar = type === 'success' ? '--success-color' : type === 'error' ? '--error-color' : '--info-color';
        this.#saveMessageParagraph.text(text).css('color', `var(${colorVar}, #ccc)`);
        if (duration > 0) {
            setTimeout(() => {
                if (this.#saveMessageParagraph.text() === text) {
                    this.#saveMessageParagraph.text('');
                }
            }, duration);
        }
    }

    destroy() {
        console.log("OptionsUI: Destroying...");
        const namespace = '.options_ui';
        this.#optionsScreenElement?.off(namespace); // Limpa todos os listeners no elemento raiz
        // Os listeners específicos dos botões também são cobertos se eles forem filhos de #optionsScreenElement.
        // Caso contrário, precisaria de this.#saveButton?.off(namespace), etc.
        this.#saveMessageParagraph?.text('');
    }
}