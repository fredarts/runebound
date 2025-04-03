// js/ui/screens/OptionsUI.js - ATUALIZADO (v2.6 - Volume Sliders Fix)

export default class OptionsUI {
    #audioManager; // <<<=== Referência para AudioManager

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
    #saveMessageParagraph;

    // --- Estado Interno ---
    #options = { // Default options
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

    constructor(audioManager) { // <<<=== Recebe AudioManager
        this.#audioManager = audioManager; // <<<=== Armazena AudioManager
        this._cacheSelectors();
        if (!this.#optionsScreenElement || !this.#optionsScreenElement.length) {
            console.error("OptionsUI Error: #options-screen element not found!");
            return;
        }
        this._loadOptions(); // Carrega opções salvas
        this._bindEvents();  // Vincula eventos
        console.log("OptionsUI initialized.");
        // Não chama render() aqui, UIManager chama quando a tela é mostrada
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
        this.#saveMessageParagraph = this.#optionsScreenElement.find('#options-save-message');
    }

    render() {
        console.log("OptionsUI: Rendering options screen controls.");
        if (!this.#optionsScreenElement.length) return;

        // Recarrega as opções mais recentes antes de renderizar os controles
        // Isso garante que se o usuário saiu e voltou, os valores corretos são mostrados
        this._loadOptions();

        // Define valores dos controles com base nas opções carregadas/padrão
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

        this._applyVisualOptions(); // Aplica opções que afetam a aparência imediatamente
        this.#saveMessageParagraph.text(''); // Limpa mensagem de salvar
    }

    _bindEvents() {
        console.log("OptionsUI: Binding events...");
        const self = this; // Para usar dentro dos handlers

        // --- Sliders de Volume (ATUALIZADO) ---
        this.#musicVolumeSlider.off('input.options').on('input.options', function() {
            const volumeValue = parseInt($(this).val(), 10);
            self.#musicVolumeValueSpan.text(`${volumeValue}%`);
            // Chama o AudioManager para definir o volume imediatamente (0.0 a 1.0)
            self.#audioManager?.setMusicVolume(volumeValue / 100);
        });
        this.#sfxVolumeSlider.off('input.options').on('input.options', function() {
            const volumeValue = parseInt($(this).val(), 10);
            self.#sfxVolumeValueSpan.text(`${volumeValue}%`);
             // Chama o AudioManager para definir o volume imediatamente (0.0 a 1.0)
            self.#audioManager?.setSfxVolume(volumeValue / 100);
        });
        // --- FIM DA ATUALIZAÇÃO DOS SLIDERS ---

        // Checkboxes de Mute (já estavam corretos, chamando AudioManager imediatamente)
        this.#musicMuteCheckbox.off('change.options').on('change.options', (event) => {
            const isMuted = $(event.currentTarget).is(':checked');
            this.#musicVolumeSlider.prop('disabled', isMuted);
            this.#audioManager?.setMusicMuted(isMuted);
            this.#audioManager?.playSFX('buttonClick');
        });
        this.#sfxMuteCheckbox.off('change.options').on('change.options', (event) => {
            const isMuted = $(event.currentTarget).is(':checked');
            this.#sfxVolumeSlider.prop('disabled', isMuted);
            this.#audioManager?.setSfxMuted(isMuted);
            this.#audioManager?.playSFX('buttonClick');
        });

        // Botão Salvar (continua chamando _saveOptions que salva e chama updateSettings)
        this.#saveButton.off('click.options').on('click.options', this._saveOptions.bind(this));

        // Listeners para aplicar opções visuais imediatamente (exemplo: alto contraste)
        this.#highContrastCheckbox.off('change.options').on('change.options', (event) => {
             $('body').toggleClass('contrast-high', $(event.currentTarget).is(':checked'));
             this.#audioManager?.playSFX('buttonClick'); // Som ao marcar/desmarcar
        });
        this.#textSizeSelect.off('change.options').on('change.options', (event) => {
             const newSize = $(event.currentTarget).val();
             $('body').removeClass('text-small text-normal text-large').addClass(`text-${newSize}`);
             this.#audioManager?.playSFX('buttonClick'); // Som ao mudar seleção
        });
    }

    _loadOptions() {
        try {
            const storedOptions = localStorage.getItem(this.#OPTIONS_STORAGE_KEY);
            if (storedOptions) {
                const loaded = JSON.parse(storedOptions);
                // Mescla para garantir todas as chaves e valores default
                this.#options = { ...this.#options, ...loaded };
                 // Garante booleanos para mute
                this.#options.isMusicMuted = !!this.#options.isMusicMuted;
                this.#options.isSfxMuted = !!this.#options.isSfxMuted;
                console.log("OptionsUI: Options loaded from localStorage:", this.#options);
            } else {
                console.log("OptionsUI: No saved options found, using defaults.");
            }
        } catch (e) {
            console.error("OptionsUI: Error loading options from localStorage:", e);
            // Resetar para defaults em caso de erro de parse
            // this.#options = { ...DEFAULT_OPTIONS }; // Defina DEFAULT_OPTIONS se necessário
        }
        // Aplica estado inicial carregado ao AudioManager (importante!)
        // Não chama updateSettings aqui, pois ele recarregaria do localStorage de novo.
        // Apenas define o estado inicial mutado/desmutado. O volume será setado no render()
        this.#audioManager?.setMusicMuted(this.#options.isMusicMuted);
        this.#audioManager?.setSfxMuted(this.#options.isSfxMuted);
    }

    // Este método é chamado pelo UIManager ou pelo botão Salvar internamente
    _saveOptions() {
        console.log("OptionsUI: Attempting to save options...");
        // Lê os valores atuais dos controles da UI
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
            this._applyVisualOptions(); // Aplica opções visuais salvas

            // Informa o AudioManager para recarregar TODAS as configurações salvas
            // Isso garante que o AudioManager esteja sincronizado com o localStorage
            this.#audioManager?.updateSettings(); // <<<=== Chama updateSettings para garantir sincronia total

            // Toca SFX de salvar (som de clique já foi tocado ao clicar no botão)
            // this.#audioManager?.playSFX('deckSave'); // Opcional, pode ser redundante

        } catch (e) {
            console.error("OptionsUI: Error saving options to localStorage:", e);
            this._showMessage('Erro ao salvar opções.', 'error');
             this.#audioManager?.playSFX('genericError'); // Som de erro
        }
    }

    _applyVisualOptions() {
        // console.log("OptionsUI: Applying visual options...");
        // Aplica tamanho de texto e contraste
        $('body')
            .removeClass('text-small text-normal text-large contrast-high')
            .addClass(`text-${this.#options.textSize || 'normal'}`)
            .toggleClass('contrast-high', this.#options.highContrast);

        // Aplica estado desabilitado aos sliders baseado no mute
        this.#musicVolumeSlider.prop('disabled', this.#options.isMusicMuted);
        this.#sfxVolumeSlider.prop('disabled', this.#options.isSfxMuted);

        // Aplica outras opções visuais
        $('body').toggleClass('disable-card-animations', !this.#options.cardAnimations);
        // TODO: Lógica para qualidade gráfica, etc.
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

} // End class OptionsUI