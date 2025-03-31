// js/core/TurnManager.js
const TURN_PHASES = ['mana', 'draw', 'main', 'attack', 'end'];

export default class TurnManager { // Using export default
    #currentPhaseIndex = 0;
    #turnNumber = 0;

    constructor() { this.#currentPhaseIndex = 0; this.#turnNumber = 0; }
    get currentPhase() { return TURN_PHASES[this.#currentPhaseIndex]; }
    get turnNumber() { return this.#turnNumber; }

    nextPhase() {
        this.#currentPhaseIndex++;
        if (this.#currentPhaseIndex >= TURN_PHASES.length) {
            this.#currentPhaseIndex = 0;
            return { newPhase: this.currentPhase, turnEnded: true };
        }
        return { newPhase: this.currentPhase, turnEnded: false };
    }
    startNewTurn() {
        this.#turnNumber++;
        this.#currentPhaseIndex = 0; // Start at Mana phase
        return this.currentPhase;
    }
    setPhase(phaseName) { const i = TURN_PHASES.indexOf(phaseName); if (i !== -1) this.#currentPhaseIndex = i; }
}