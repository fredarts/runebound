// js/ui/screens/SetMasteryScreenUI.js – Refatorado com template separado

// Import necessary constants and potentially other modules
import { LEVELS } from '../../core/SetMasteryManager.js';
// Removed ScreenManager import as navigation is handled by UIManager
// Import UIManager if not passed via constructor, otherwise assume it's passed

export default class SetMasteryScreenUI {
    // Use private fields for consistency
    #screenManager; // Still needed to potentially show/hide screens if not using UIManager
    #accountManager;
    #uiManager;      // To handle navigation
    #audioManager;    // To handle sounds

    // UI Element Cache
    #el; // Root element #set-mastery-screen
    #progressBar;
    #progressLabel;
    #rewardsList;
    #backButton;

    #initialized = false; // Prevent multiple initializations

    /**
     * @param {ScreenManager} screenManager – gerenciador de telas
     * @param {Object} accountManager       – para obter usuário
     * @param {Object} uiManager            – para navegação
     * @param {Object} audioManager         – para sons
     */
    constructor(screenManager, accountManager, uiManager, audioManager) { // Added uiManager, audioManager
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#uiManager = uiManager; // Store UIManager
        this.#audioManager = audioManager; // Store AudioManager
        console.log("SetMasteryScreenUI instance created.");
        // init() is now called by UIManager after HTML is potentially added
    }

    /**
     * Initializes the UI by caching selectors and binding events.
     * Called by UIManager after the screen's HTML is in the DOM.
     */
    init() {
        if (this.#initialized) return;

        if (!this._cacheSelectors()) {
            console.error("SetMasteryScreenUI: Initialization failed. Could not cache selectors.");
            return;
        }
        this._bindEvents();
        this.#initialized = true;
        console.log("SetMasteryScreenUI: Initialized.");
    }

    /** Caches jQuery selectors */
    _cacheSelectors() {
        this.#el = $('#set-mastery-screen');
        if (!this.#el.length) {
            console.error("SetMasteryScreenUI Cache Error: #set-mastery-screen not found!");
            return false;
        }
        this.#progressBar = this.#el.find('#mastery-screen-progress');
        this.#progressLabel = this.#el.find('#mastery-screen-progress-label');
        this.#rewardsList = this.#el.find('#mastery-rewards-list'); // Ensure template uses this ID
        this.#backButton = this.#el.find('#btn-mastery-back-profile');

        if (!this.#progressBar.length || !this.#progressLabel.length || !this.#rewardsList.length || !this.#backButton.length) {
             console.error("SetMasteryScreenUI Cache Error: One or more essential child elements not found!");
             return false;
        }
        return true;
    }

    /** Binds event listeners */
    _bindEvents() {
        const self = this;

        // Back Button - Use UIManager for navigation
        this.#backButton.off('click.setmastery').on('click.setmastery', () => {
            self.#audioManager?.playSFX('buttonClick');
            // Use UIManager to navigate back to the profile screen
            self.#uiManager?.navigateTo('profile-screen');
        });
         // Add hover sound
         this.#backButton.off('mouseenter.setmastery').on('mouseenter.setmastery', () => {
             self.#audioManager?.playSFX('buttonHover');
         });
    }

    /**
     * Updates the screen's dynamic elements based on current user progress.
     * @param {string} [setCode='ELDRAEM'] - The code for the mastery set to display.
     */
    render(setCode = 'ELDRAEM') {
        if (!this.#initialized) {
            console.error("SetMasteryScreenUI: Cannot render before init() is called.");
            return;
        }
        console.log(`SetMasteryScreenUI: Rendering progress for set ${setCode}...`);

        const user = this.#accountManager.getCurrentUser();
        if (!user) {
            console.warn("SetMasteryScreenUI: Cannot render, no user logged in.");
            // Potentially redirect or show a message
            this.#progressBar.css('width', '0%');
            this.#progressLabel.text('Usuário não encontrado');
            this.#rewardsList.find('.mastery-row').removeClass('reached'); // Clear reached status
            return;
        }

        const progress = user.setMastery?.[setCode] ?? { level: 0, xp: 0 };
        const totalXP = progress.xp;
        const currentLevel = progress.level;

        // Update overall progress bar
        const maxXP = LEVELS.length > 0 ? LEVELS[LEVELS.length - 1].xp : 0; // Handle empty LEVELS array
        const percentage = maxXP > 0 ? Math.min(100, (totalXP / maxXP) * 100) : 0;
        this.#progressBar.css('width', `${percentage.toFixed(1)}%`);
        this.#progressLabel.text(`${totalXP} / ${maxXP} XP`);

        // Update individual level rows (mark as reached)
        this.#rewardsList.find('.mastery-row').each((index, rowElement) => {
            const levelIndex = parseInt($(rowElement).data('level-row'), 10);
            if (!isNaN(levelIndex)) {
                const reached = currentLevel > levelIndex;
                $(rowElement).toggleClass('reached', reached);
            }
        });

        console.log(`SetMasteryScreenUI: Render complete. Level: ${currentLevel}, XP: ${totalXP}`);
    }

    /** Optional: Cleanup method to unbind events */
    destroy() {
        console.log("SetMasteryScreenUI: Destroying (unbinding events)...");
        this.#backButton?.off('.setmastery');
        this.#initialized = false;
        this.#el = null; // Clear cached element
        // Clear other cached elements if needed
        this.#progressBar = null;
        this.#progressLabel = null;
        this.#rewardsList = null;
        this.#backButton = null;
    }

    // Remove the _generateHTML method as it's now in the template file.
}