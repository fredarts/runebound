// js/utils.js

/**
 * Shuffles an array in place using the Fisher-Yates (Durstenfeld variation) algorithm.
 * @param {Array<any>} array The array to shuffle.
 * @returns {Array<any>} The shuffled array (the same instance passed in).
 */
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        // Generate random index from 0 to i (inclusive)
        const j = Math.floor(Math.random() * (i + 1));
        // Swap elements array[i] and array[j]
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/** Simple counter for generating unique IDs within a session. */
let uniqueInstanceCounter = 0;

/**
 * Generates a simple unique ID string. Useful for card instances/players within a game session.
 * Format: type_<timestamp>_<counter>
 * Not guaranteed to be unique across different sessions or globally.
 * @param {string} [prefix='instance'] - Optional prefix for the ID.
 * @returns {string} A unique ID string.
 */
export function generateUniqueId(prefix = 'instance') {
    uniqueInstanceCounter++;
    return `${prefix}_${Date.now()}_${uniqueInstanceCounter}`;
}

/**
 * Loads card definitions.
 * In a real app, this would likely fetch a JSON file.
 * For now, it uses the provided JSON structure.
 * IMPORTANT: Add unique 'id' fields to your card definitions JSON!
 * @returns {object | null} An object mapping card IDs to definitions, or null on error.
 */
export function loadCardDefinitions() {
    // --- PASTE YOUR CARD JSON DATA HERE ---
    // IMPORTANT: Make sure each card object has a unique "id" field (e.g., "CR001", "RB001")
    const cardDataJson = {
        "cards": [
             { "id": "CR001", "name": "Elven Ranger", "type": "Creature", "cost": 2, "attack": 2, "toughness": 2, "tribe": "Elf", "image_src": "assets/images/cards/elf_ranger.png", "description": "Quick and agile, ideal for early pressure.", "set": "ELDRAEM" },
             { "id": "CR002", "name": "Dwarven Guardian", "type": "Creature", "cost": 3, "attack": 1, "toughness": 4, "tribe": "Dwarf", "image_src": "assets/images/cards/dwarf_guardian.png", "description": "A stalwart defender that protects allies.", "set": "ELDRAEM" },
             { "id": "CR003", "name": "Plague Rat", "type": "Creature", "cost": 1, "attack": 1, "toughness": 1, "tribe": "Beast", "image_src": "assets/images/cards/plague_rat.png", "description": "A disposable creature.", "set": "ELDRAEM" },
             { "id": "CR004", "name": "Molten Wyrm", "type": "Creature", "cost": 6, "attack": 5, "toughness": 4, "tribe": "Dragon", "image_src": "assets/images/cards/molten_wyrm.png", "description": "A powerful finisher.", "set": "ELDRAEM" },
             { "id": "CR005", "name": "Soul Revenant", "type": "Creature", "cost": 4, "attack": 3, "toughness": 2, "tribe": "Undead", "image_src": "assets/images/cards/soul_revenant.png", "description": "Hard to kill.", "set": "ELDRAEM" },
             { "id": "CR006", "name": "Storm Elemental", "type": "Creature", "cost": 5, "attack": 4, "toughness": 3, "tribe": "Elemental", "image_src": "assets/images/cards/storm_elemental.png", "description": "An elemental creature.", "set": "ELDRAEM" },
             { "id": "CR007", "name": "Human Duelist", "type": "Creature", "cost": 2, "attack": 3, "toughness": 1, "tribe": "Human", "image_src": "assets/images/cards/human_duelist.png", "description": "Simple, fast, and deadly.", "set": "ELDRAEM" },
             { "id": "CR008", "name": "Crystal Golem", "type": "Creature", "cost": 4, "attack": 2, "toughness": 5, "tribe": "Construct", "image_src": "assets/images/cards/crystal_golem.png", "description": "Solid magical defense unit.", "set": "ELDRAEM" },
             { "id": "CR009", "name": "Feral Bear", "type": "Creature", "cost": 3, "attack": 3, "toughness": 3, "tribe": "Beast", "image_src": "assets/images/cards/feral_bear.png", "description": "Balanced creature.", "set": "ELDRAEM" },
             { "id": "CR010", "name": "Firebrand Zealot", "type": "Creature", "cost": 2, "attack": 2, "toughness": 1, "tribe": "Human", "image_src": "assets/images/cards/firebrand_zealot.png", "description": "Fierce attacker.", "set": "ELDRAEM" },
             { "id": "CR011", "name": "Wisp of Light", "type": "Creature", "cost": 1, "attack": 1, "toughness": 1, "tribe": "Spirit", "image_src": "assets/images/cards/wisp_of_light.png", "description": "Tiny, but helpful.", "set": "ELDRAEM" },
             { "id": "CR012", "name": "Ghoul Devourer", "type": "Creature", "cost": 4, "attack": 4, "toughness": 2, "tribe": "Undead", "image_src": "assets/images/cards/ghoul_devourer.png", "description": "Feeds on the fallen.", "set": "ELDRAEM" },
             { "id": "CR013", "name": "Stonecaller", "type": "Creature", "cost": 5, "attack": 2, "toughness": 6, "tribe": "Dwarf", "image_src": "assets/images/cards/stonecaller.png", "description": "A support tank.", "set": "ELDRAEM" },
             { "id": "CR014", "name": "Shadowblade Assassin", "type": "Creature", "cost": 3, "attack": 3, "toughness": 1, "tribe": "Elf", "image_src": "assets/images/cards/shadowblade_assassin.png", "description": "Strike fast.", "set": "ELDRAEM" },
             { "id": "CR015", "name": "Volcanic Behemoth", "type": "Creature", "cost": 7, "attack": 7, "toughness": 7, "tribe": "Elemental", "image_src": "assets/images/cards/volcanic_behemoth.png", "description": "Massive threat.", "set": "ELDRAEM" },
             { "id": "CR016", "name": "Arcane Familiar", "type": "Creature", "cost": 2, "attack": 1, "toughness": 2, "tribe": "Spirit", "image_src": "assets/images/cards/arcane_familiar.png", "description": "Helpful spirit.", "set": "ELDRAEM" },
             { "id": "RB001", "name": "Destroy", "type": "Runebinding", "cost": 2, "effect": "Destroy target creature", "image_src": "assets/images/cards/destroy.png", "description": "Eliminates a threat.", "set": "ELDRAEM" },
             { "id": "RB_DRAW2", "name": "Draw Rune", "type": "Runebinding", "cost": 2, "effect": "Draw 2 cards", "image_src": "assets/images/cards/draw_rune.png", "description": "Expands your options.", "set": "ELDRAEM" }, // Changed ID slightly
             { "id": "RB_SILENCE", "name": "Silence", "type": "Runebinding", "cost": 1, "effect": "Target creature can't attack next turn", "image_src": "assets/images/cards/silence.png", "description": "Temporarily disables a unit.", "set": "ELDRAEM" }, // Changed ID
             { "id": "RB_POWER", "name": "Power Boost", "type": "Runebinding", "cost": 1, "effect": "Target creature gains +2 attack this turn", "image_src": "assets/images/cards/power_boost.png", "description": "Extra punch.", "set": "ELDRAEM" }, // Changed ID
             { "id": "RB_TOUGH", "name": "Toughness Boost", "type": "Runebinding", "cost": 1, "effect": "Target creature gains +2 toughness this turn", "image_src": "assets/images/cards/toughness_boost.png", "description": "Extra defense.", "set": "ELDRAEM" }, // Changed ID
             { "id": "IS001", "name": "Heal", "type": "Instant", "cost": 2, "effect": "Restore 4 life", "image_src": "assets/images/cards/heal.png", "description": "A burst of recovery.", "set": "ELDRAEM" },
             { "id": "IS002", "name": "Fireball", "type": "Instant", "cost": 2, "effect": "Deal 3 damage to target creature", "image_src": "assets/images/cards/fireball.png", "description": "Burns a creature.", "set": "ELDRAEM" },
             { "id": "IS003", "name": "Draw", "type": "Instant", "cost": 1, "effect": "Draw 2 cards", "image_src": "assets/images/cards/draw.png", "description": "Refill your hand.", "set": "ELDRAEM" },
             { "id": "IS004", "name": "Shield", "type": "Instant", "cost": 1, "effect": "Prevent all damage to a creature this turn", "image_src": "assets/images/cards/shield.png", "description": "Protect a key creature.", "set": "ELDRAEM" },
             { "id": "IS005", "name": "Bounce", "type": "Instant", "cost": 3, "effect": "Return target creature to its owner's hand", "image_src": "assets/images/cards/bounce.png", "description": "Reset an enemy creature.", "set": "ELDRAEM" },
             { "id": "IS006", "name": "Destroy Binding", "type": "Instant", "cost": 2, "effect": "Destroy target Runebinding", "image_src": "assets/images/cards/destroy_binding.png", "description": "Dispel enchantments.", "set": "ELDRAEM" },
             { "id": "IS007", "name": "Weaken", "type": "Instant", "cost": 1, "effect": "Target creature gets -2 attack this turn", "image_src": "assets/images/cards/weaken.png", "description": "Debilitate the enemy.", "set": "ELDRAEM" }
        ]
    };
    // --- END OF CARD JSON DATA ---

    try {
        const cardDatabase = {};
        if (!cardDataJson || !Array.isArray(cardDataJson.cards)) {
            throw new Error("Invalid card data structure.");
        }
        cardDataJson.cards.forEach(cardDef => {
            if (!cardDef.id) {
                console.warn(`Card "${cardDef.name}" is missing a unique 'id' field. Skipping.`);
                return; // Skip cards without an ID
            }
            if (cardDatabase[cardDef.id]) {
                console.warn(`Duplicate card ID "${cardDef.id}" found for card "${cardDef.name}". Overwriting previous entry.`);
            }
            cardDatabase[cardDef.id] = cardDef;
        });

        if (Object.keys(cardDatabase).length === 0) {
             console.warn("Card database loaded, but is empty or all cards lacked IDs.");
        } else {
            console.log(`Card definitions loaded successfully: ${Object.keys(cardDatabase).length} cards.`);
        }
        return cardDatabase;

    } catch (error) {
        console.error("Error loading or parsing card definitions:", error);
        return null; // Return null to indicate failure
    }
}