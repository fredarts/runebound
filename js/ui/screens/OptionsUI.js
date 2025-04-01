// js/ui/screens/OptionsUI.js

export default class OptionsUI {
    // --- Elementos da UI (Cache) ---
    #optionsScreenElement;
    #musicVolumeSlider;
    #musicVolumeValueSpan;
    #sfxVolumeSlider;
    #sfxVolumeValueSpan;
    #graphicsQualitySelect;
    #cardAnimationsCheckbox;
    #languageSelect;
    #textSizeSelect;
    #highContrastCheckbox;
    #saveButton;
    #saveMessageParagraph;
    // Adicione seletores para outros botões (ex: Voltar) se forem gerenciados aqui

    // --- Estado Interno ---
    #options = { // Default options
        musicVolume: 80,
        sfxVolume: 100,
        graphicsQuality: 'medium',
        cardAnimations: true,
        language: 'pt-BR',
        textSize: 'normal',
        highContrast: false
    };
    #OPTIONS_STORAGE_KEY = 'runebound_clash_options'; // Chave do localStorage

    constructor() {
        this._cacheSelectors(); // Busca e armazena seletores jQuery
        if (!this.#optionsScreenElement || !this.#optionsScreenElement.length) {
            console.error("OptionsUI Error: #options-screen element not found!");
            return; // Impede erros se a tela não existir
        }
        this._loadOptions();      // Carrega opções salvas ao inicializar
        this._bindEvents();       // Vincula eventos aos controles
        console.log("OptionsUI initialized.");
    }

    /** Cacheia seletores jQuery para elementos da UI de opções */
    _cacheSelectors() {
        this.#optionsScreenElement = $('#options-screen');
        this.#musicVolumeSlider = this.#optionsScreenElement.find('#opt-music-volume');
        this.#musicVolumeValueSpan = this.#musicVolumeSlider.siblings('.volume-value');
        this.#sfxVolumeSlider = this.#optionsScreenElement.find('#opt-sfx-volume');
        this.#sfxVolumeValueSpan = this.#sfxVolumeSlider.siblings('.volume-value');
        this.#graphicsQualitySelect = this.#optionsScreenElement.find('#opt-graphics-quality');
        this.#cardAnimationsCheckbox = this.#optionsScreenElement.find('#opt-card-animations');
        this.#languageSelect = this.#optionsScreenElement.find('#opt-language');
        this.#textSizeSelect = this.#optionsScreenElement.find('#opt-text-size');
        this.#highContrastCheckbox = this.#optionsScreenElement.find('#opt-high-contrast');
        this.#saveButton = this.#optionsScreenElement.find('#btn-save-options');
        this.#saveMessageParagraph = this.#optionsScreenElement.find('#options-save-message');
    }

    /** Renderiza/Atualiza os controles da UI com os valores atuais das opções */
    render() {
        console.log("OptionsUI: Rendering options screen controls.");
        if (!this.#optionsScreenElement.length) return; // Sai se a tela não foi encontrada

        // Define os valores dos controles com base nas opções carregadas/padrão
        this.#musicVolumeSlider.val(this.#options.musicVolume);
        this.#musicVolumeValueSpan.text(`${this.#options.musicVolume}%`);
        this.#sfxVolumeSlider.val(this.#options.sfxVolume);
        this.#sfxVolumeValueSpan.text(`${this.#options.sfxVolume}%`);
        this.#graphicsQualitySelect.val(this.#options.graphicsQuality);
        this.#cardAnimationsCheckbox.prop('checked', this.#options.cardAnimations);
        this.#languageSelect.val(this.#options.language);
        this.#textSizeSelect.val(this.#options.textSize);
        this.#highContrastCheckbox.prop('checked', this.#options.highContrast);

        this._applyVisualOptions(); // Aplica opções que afetam a aparência geral
        this.#saveMessageParagraph.text(''); // Limpa mensagens anteriores
    }

    /** Vincula eventos aos controles da tela de opções */
    _bindEvents() {
        console.log("OptionsUI: Binding events...");

        // Sliders de Volume (atualiza o span de valor)
        this.#musicVolumeSlider.on('input', () => {
            this.#musicVolumeValueSpan.text(`${this.#musicVolumeSlider.val()}%`);
        });
        this.#sfxVolumeSlider.on('input', () => {
            this.#sfxVolumeValueSpan.text(`${this.#sfxVolumeSlider.val()}%`);
        });

        // Botão Salvar
        this.#saveButton.on('click', this._saveOptions.bind(this));

        // Checkbox Alto Contraste (pode aplicar imediatamente ou apenas ao salvar)
        this.#highContrastCheckbox.on('change', () => {
            // Opcional: Aplicar imediatamente para feedback visual
            // $('body').toggleClass('contrast-high', this.#highContrastCheckbox.is(':checked'));
        });

        // Select Tamanho do Texto (pode aplicar imediatamente ou apenas ao salvar)
        this.#textSizeSelect.on('change', () => {
             // Opcional: Aplicar imediatamente
             // const newSize = this.#textSizeSelect.val();
             // $('body').removeClass('text-small text-large text-normal').addClass(`text-${newSize}`);
        });

        // Botão Voltar (já vinculado no main.js, mas pode ser movido para cá se preferir)
        // this.#optionsScreenElement.find('#btn-options-back-to-main').on('click', () => {
        //     // Precisa da instância do ScreenManager se for fazer aqui
        //     // this.#screenManager.goBack('profile-screen');
        // });
    }

    // --- Métodos Internos ---

    /** Carrega as opções do localStorage para o estado interno */
    _loadOptions() {
        try {
            const storedOptions = localStorage.getItem(this.#OPTIONS_STORAGE_KEY);
            if (storedOptions) {
                const loaded = JSON.parse(storedOptions);
                // Mescla com defaults para garantir que todas as chaves existam
                this.#options = { ...this.#options, ...loaded };
                console.log("OptionsUI: Options loaded from localStorage:", this.#options);
            } else {
                console.log("OptionsUI: No saved options found, using defaults.");
                // Salva os defaults na primeira vez? Opcional.
                // localStorage.setItem(this.#OPTIONS_STORAGE_KEY, JSON.stringify(this.#options));
            }
        } catch (e) {
            console.error("OptionsUI: Error loading options from localStorage:", e);
            // Usa os defaults se o carregamento falhar
        }
        // Aplica imediatamente após carregar (ou usa defaults)
        // this._applyVisualOptions(); // render() já chama isso
    }

    /** Salva as opções atuais (lidas da UI) no localStorage */
    _saveOptions() {
        // Lê os valores atuais dos controles da UI
        this.#options.musicVolume = parseInt(this.#musicVolumeSlider.val(), 10);
        this.#options.sfxVolume = parseInt(this.#sfxVolumeSlider.val(), 10);
        this.#options.graphicsQuality = this.#graphicsQualitySelect.val();
        this.#options.cardAnimations = this.#cardAnimationsCheckbox.is(':checked');
        this.#options.language = this.#languageSelect.val();
        this.#options.textSize = this.#textSizeSelect.val();
        this.#options.highContrast = this.#highContrastCheckbox.is(':checked');

        try {
            localStorage.setItem(this.#OPTIONS_STORAGE_KEY, JSON.stringify(this.#options));
            console.log("OptionsUI: Options saved to localStorage:", this.#options);
            this._showMessage('Opções salvas com sucesso!', 'success');
            this._applyVisualOptions(); // Aplica as opções salvas imediatamente
        } catch (e) {
            console.error("OptionsUI: Error saving options to localStorage:", e);
            this._showMessage('Erro ao salvar opções.', 'error');
        }
    }

    /** Aplica opções que têm efeito visual imediato (tamanho texto, contraste) */
    _applyVisualOptions() {
        console.log("OptionsUI: Applying visual options...");
        $('body')
            .removeClass('text-small text-normal text-large contrast-high') // Limpa classes anteriores
            .addClass(`text-${this.#options.textSize || 'normal'}`) // Adiciona classe de tamanho
            .toggleClass('contrast-high', this.#options.highContrast); // Adiciona/remove classe de contraste

        // TODO: Implementar lógica para aplicar volume (requer interação com player de áudio)
        // TODO: Implementar lógica para qualidade gráfica (pode setar classes CSS, ou parâmetros em engine 3D)
        // TODO: Implementar lógica para animações (pode setar classe CSS para desabilitar transitions/animations)
        $('body').toggleClass('disable-card-animations', !this.#options.cardAnimations); // Exemplo
    }

    /** Exibe uma mensagem de feedback na tela de opções */
    _showMessage(text, type = 'info', duration = 3000) {
        const colorVar = type === 'success' ? '--success-color' : type === 'error' ? '--error-color' : '--text-color';
        this.#saveMessageParagraph.text(text).css('color', `var(${colorVar})`);
        if (duration > 0) {
            setTimeout(() => {
                // Só limpa se a mensagem ainda for a mesma
                if (this.#saveMessageParagraph.text() === text) {
                    this.#saveMessageParagraph.text('');
                }
            }, duration);
        }
    }

} // End class OptionsUI