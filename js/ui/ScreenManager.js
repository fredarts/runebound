// js/ui/ScreenManager.js

/**
 * Manages the visibility and transitions of different application screens
 * represented by divs with the '.screen' class.
 */
export default class ScreenManager {
    #activeScreenId = null;
    #previousScreenId = null; // Track the previously active screen
    #isTransitioning = false; // Flag to prevent rapid transitions
    #transitionDuration = 300; // Duration of the fade transition in ms

    constructor(transitionDuration = 300) {
        this.#transitionDuration = transitionDuration;
        // Ensure initial state on load (hide all except potentially pre-marked active one)
        // This might conflict if HTML has 'active' pre-set, adjust as needed.
        // $('.screen').not('.active').hide(); // Alternative initial setup
        console.log("ScreenManager initialized.");
    }

    /**
     * Shows the screen with the specified ID, hiding the previously active one.
     * Includes basic fade transitions.
     * @param {string} screenId The ID of the HTML element (div) for the screen to show.
     * @param {boolean} [force=false] - If true, bypass the 'already active' check.
     */
    showScreen(screenId, force = false) {
        if (!force && screenId === this.#activeScreenId) {
            // console.log(`ScreenManager: Screen '${screenId}' is already active.`);
            return; // Don't transition if already the active screen
        }
        if (this.#isTransitioning) {
             console.warn(`ScreenManager: Transition already in progress. Request for '${screenId}' ignored.`);
             return; // Prevent overlapping transitions
        }

        const $currentScreen = this.#activeScreenId ? $(`#${this.#activeScreenId}`) : null;
        const $nextScreen = $(`#${screenId}`);

        if (!$nextScreen.length) {
            console.error(`ScreenManager Error: Screen with ID '${screenId}' not found!`);
            // Fallback: Maybe show the title screen?
            if (this.#activeScreenId !== 'title-screen') {
                console.warn("ScreenManager Fallback: Showing 'title-screen'.");
                this.showScreen('title-screen', true); // Force show title
            }
            return;
        }

        console.log(`ScreenManager: Transitioning from '${this.#activeScreenId || 'none'}' to '${screenId}'`);
        this.#isTransitioning = true;

        // --- Transition Logic ---

        // 1. Fade out the current screen (if one exists)
        if ($currentScreen && $currentScreen.length) {
            $currentScreen.addClass('screen-fade-out'); // Add fade-out class
            setTimeout(() => {
                $currentScreen.removeClass('active screen-fade-out'); // Hide after fade
            }, this.#transitionDuration);
        }

        // 2. Prepare and fade in the next screen
        // Ensure it's ready but invisible initially for the fade-in effect
        $nextScreen.addClass('active screen-prepare-fade-in');

        // Use a tiny delay before starting fade-in to allow browser to apply initial styles
        setTimeout(() => {
            $nextScreen.removeClass('screen-prepare-fade-in').addClass('screen-fade-in'); // Start fade-in
        }, 20); // Small delay (adjust if needed)


        // 3. Clean up after the transition
        setTimeout(() => {
            $nextScreen.removeClass('screen-fade-in'); // Remove fade-in class after duration
            this.#previousScreenId = this.#activeScreenId; // Update previous screen tracker
            this.#activeScreenId = screenId; // Set the new active screen ID
            this.#isTransitioning = false; // Allow new transitions
            console.log(`ScreenManager: Screen '${screenId}' is now active.`);
        }, this.#transitionDuration + 50); // Add a small buffer after duration
    }

    /**
     * Returns the ID of the currently active screen.
     * @returns {string | null}
     */
    getActiveScreenId() {
        return this.#activeScreenId;
    }

    /**
     * Returns the ID of the previously shown screen.
     * Useful for implementing a generic "Back" button.
     * @returns {string | null}
     */
    getPreviousScreenId() {
        return this.#previousScreenId;
    }

    /**
     * Navigates back to the previously shown screen.
     * Optional: Provide a fallback screen ID if no previous screen is recorded.
     * @param {string} [fallbackScreenId='title-screen'] - Screen to go to if no previous screen exists.
     */
    goBack(fallbackScreenId = 'title-screen') {
        if (this.#previousScreenId && this.#previousScreenId !== this.#activeScreenId) {
            console.log(`ScreenManager: Going back to '${this.#previousScreenId}'`);
            this.showScreen(this.#previousScreenId);
        } else {
            console.log(`ScreenManager: No previous screen or cannot go back, going to fallback '${fallbackScreenId}'`);
            this.showScreen(fallbackScreenId);
        }
    }
}