// js/ui/screens/ProfileScreenUI.js
import { LEVELS } from '../../core/SetMasteryManager.js';

export default class ProfileScreenUI {
    // --- Declare ALL private fields here ---
    #screenManager;
    #accountManager;
    #uiManager;
    #audioManager; // Make sure this is declared if used in _bind
    #el;
    #avatarChoicesContainer; // <-- Declaration was missing

    // Cache other elements if needed

    // --- Constructor ---
    constructor(sm, am, cardDB, renderer, zoom, uiMgr, audioMgr) { // Assuming audioMgr is passed
        this.#screenManager = sm;
        this.#accountManager = am;
        this.#uiManager = uiMgr;
        this.#audioManager = audioMgr; // Store AudioManager
        this.#el = $('#profile-screen');

        // --- Cache avatar choices container ---
        // Ensure #el is valid before finding children
        if (this.#el.length) {
            this.#avatarChoicesContainer = this.#el.find('#avatar-choices');
            if (!this.#avatarChoicesContainer.length) {
                console.warn("ProfileScreenUI Constructor Warning: #avatar-choices container not found during caching.");
            }
        } else {
            console.error("ProfileScreenUI Constructor Error: Root element #profile-screen not found.");
            return; // Stop initialization if root is missing
        }

        this._bind(); // Call binding method
        console.log("ProfileScreenUI initialized.");
    }

    // --- Render Method ---
    render() {
        console.log("ProfileScreenUI: Rendering...");
        const u = this.#accountManager.getCurrentUser();
        if (!u) {
            console.warn("ProfileScreenUI: No user logged in, redirecting to login.");
            this.#uiManager.navigateTo('login-screen'); // Use UIManager for navigation
            return;
        }

        /* ------------------- Header Info ------------------- */
        $('#profile-username').text(u.username || 'Jogador');
        $('#gold-amount').text(u.wallet?.gold ?? 0); // Use nullish coalescing for safety
        $('#gems-amount').text(u.wallet?.gems ?? 0); // Use nullish coalescing for safety
        $('#profile-avatar-img').attr('src', `assets/images/avatars/${u.avatar || 'default.png'}`);

        // --- Dynamically Render Avatar Choices ---
        // Check if the container exists before rendering into it
        if (this.#avatarChoicesContainer && this.#avatarChoicesContainer.length) {
            this._renderAvatarChoices(u.avatars || ['default.png'], u.avatar || 'default.png');
        } else {
            console.warn("ProfileScreenUI Render Warning: Cannot render avatar choices, container not found.");
        }


        /* ------------------- Rank Block ------------------- */
        const rankTier = u.rankTier || 'Bronze';
        const rankDivision = u.rankDivision || 4;
        $('#profile-rank-badge')
            .text(`${rankTier} ${rankDivision}`)
            .attr('class', `rank-badge ${rankTier.toLowerCase()}`); // Update class for styling

        const rankIconFile = {
            Bronze: 'bronze_ranking.png',
            Prata: 'silver_ranking.png', // Assuming 'Prata' maps to silver
            Ouro: 'gold_ranking.png'     // Assuming 'Ouro' maps to gold
        }[rankTier] || 'bronze_ranking.png';
        $('#rank-icon').attr('src', `assets/images/ui/${rankIconFile}`);

        const rating = Math.round(u.rating || 1500);
        const rd = Math.round(u.rd || 350);
        $('#profile-rating').text(`(${rating} ±${rd})`);

        // Calculate rank progress within the current tier/division
        const tierMinRating = { Bronze: 0, Prata: 1400, Ouro: 1700 }[rankTier] ?? 0;
        const pointsIntoDivision = (rating - tierMinRating) % 75; // Points needed per division
        const rankProgressPercent = Math.max(0, Math.min(100, (pointsIntoDivision / 75) * 100));
        $('#rank-progress').css('width', `${rankProgressPercent.toFixed(1)}%`);

        /* ------------------- Wins / Losses ------------------- */
        $('#profile-wins').text(u.stats?.wins ?? 0);
        $('#profile-losses').text(u.stats?.losses ?? 0);

        /* ------------------- Mastery Block ------------------- */
        const masteryProgress = u.setMastery?.ELDRAEM ?? { xp: 0, level: 0 }; // Default if missing
        const currentLevel = masteryProgress.level;
        const currentXP = masteryProgress.xp;
        const xpForNextLevel = LEVELS[currentLevel]?.xp ?? currentXP; // XP needed for *next* level, or current XP if max level
        const xpForCurrentLevelStart = currentLevel > 0 ? (LEVELS[currentLevel - 1]?.xp ?? 0) : 0; // XP needed to *reach* current level
        const xpInCurrentLevel = Math.max(0, currentXP - xpForCurrentLevelStart);
        const xpNeededForLevel = Math.max(1, xpForNextLevel - xpForCurrentLevelStart); // Avoid division by zero
        const masteryProgressPercent = Math.min(100, (xpInCurrentLevel / xpNeededForLevel) * 100);

        $('#mastery-level').text(`Lv ${currentLevel}`);
        $('#mastery-progress').css('width', `${masteryProgressPercent.toFixed(1)}%`);

        /* ------------------- Collection Block ------------------- */
        // **NOTE:** Total card count for the set 'ELDRAEM' needs to be accurate.
        // Hardcoding 40 here as an example based on previous info, but ideally,
        // this should come from cardDatabase or a config file.
        const TOTAL_CARDS_IN_ELDRAEM = 40; // <<< ADJUST THIS IF NEEDED
        const ownedCount = u.setsOwned?.ELDRAEM?.owned?.length ?? (u.collection?.length ?? 0); // Best guess if setsOwned isn't populated yet
        $('#collection-count').text(`${ownedCount}/${TOTAL_CARDS_IN_ELDRAEM} cartas`);
        const collectionProgressPercent = TOTAL_CARDS_IN_ELDRAEM > 0 ? (ownedCount / TOTAL_CARDS_IN_ELDRAEM) * 100 : 0;
        $('#collection-progress').css('width', `${Math.min(100, collectionProgressPercent).toFixed(1)}%`);

        /* ------------------- Match History ------------------- */
        this._renderHistory(u.matchHistory ?? []);

        console.log("ProfileScreenUI: Render complete.");
    }

    // --- Render Avatar Choices Helper ---
    _renderAvatarChoices(availableAvatars, currentAvatar) {
        // Check if the container element is valid before proceeding
        if (!this.#avatarChoicesContainer || !this.#avatarChoicesContainer.length) {
            console.warn("ProfileScreenUI: Avatar choices container not available in _renderAvatarChoices.");
            return;
        }

        const safeAvailable = Array.isArray(availableAvatars) ? availableAvatars : ['default.png'];
        const safeCurrent = currentAvatar || 'default.png';
        const uniqueAvatars = [...new Set(safeAvailable)]; // Remove duplicates

        this.#avatarChoicesContainer.empty(); // Clear previous choices

        if (uniqueAvatars.length === 0) {
            uniqueAvatars.push('default.png');
        }

        uniqueAvatars.forEach(avatarFile => {
            const isSelected = avatarFile === safeCurrent;
            const $img = $(`
                <img class="avatar-choice ${isSelected ? 'selected-avatar' : ''}"
                     data-avatar="${avatarFile}"
                     src="assets/images/avatars/${avatarFile}"
                     alt="Avatar Option ${avatarFile.replace('.png', '')}">
            `);
            this.#avatarChoicesContainer.append($img);
        });

        // Ensure the default is always present if not already included
        if (!uniqueAvatars.includes('default.png')) {
            const isDefaultSelected = 'default.png' === safeCurrent;
            const $defaultImg = $(`
                <img class="avatar-choice ${isDefaultSelected ? 'selected-avatar' : ''}"
                     data-avatar="default.png"
                     src="assets/images/avatars/default.png"
                     alt="Avatar Option Default">
            `);
            this.#avatarChoicesContainer.append($defaultImg);
        }
    }

    // --- Render Match History Helper ---
    _renderHistory(matchHistoryArray) {
        const $ul = $('#profile-match-history'); // Assume this element exists
        if (!$ul.length) return; // Exit if element not found
        $ul.empty();

        const safeHistory = Array.isArray(matchHistoryArray) ? matchHistoryArray : [];

        if (safeHistory.length === 0) {
            $ul.append('<li>(Nenhum histórico de partidas)</li>');
            return;
        }

        // Display the latest 10 matches (assuming newest are first)
        safeHistory.slice(0, 10).forEach(match => {
            try {
                const date = new Date(match.date).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                });
                const resultClass = match.result === 'win' ? 'history-win'
                                  : match.result === 'loss' ? 'history-loss'
                                  : 'history-draw';
                const resultText = match.result === 'win' ? 'Vitória'
                                 : match.result === 'loss' ? 'Derrota'
                                 : 'Empate';
                const opponentName = match.opponent || 'Oponente Desconhecido';

                $ul.append(`<li class="${resultClass}">${date} – ${resultText} vs ${opponentName}</li>`);
            } catch (e) {
                console.error("Error rendering match history entry:", match, e);
                // Append an error entry to indicate a problem
                $ul.append('<li class="history-error">Erro ao carregar partida</li>');
            }
        });
    }

    // --- Bind Events Method ---
    _bind() {
        // Check if root element exists before binding
        if (!this.#el || !this.#el.length) {
             console.error("ProfileScreenUI: Cannot bind events, root element #profile-screen not found.");
             return;
        }
        console.log("ProfileScreenUI: Binding events...");
        const self = this;
        const namespace = '.profileui';

        // --- Unbind previous listeners ---
        this.#el.off(namespace);
        // Check if avatar container exists before unbinding
        if (this.#avatarChoicesContainer && this.#avatarChoicesContainer.length) {
             this.#avatarChoicesContainer.off(namespace);
        }

        // --- Bind New Listeners ---

        // Edit Avatar Button
        this.#el.on(`click${namespace}`, '#btn-edit-avatar', () => {
            // Check container again before toggling
            if (self.#avatarChoicesContainer && self.#avatarChoicesContainer.length) {
                self.#avatarChoicesContainer.toggleClass('hidden');
                self.#audioManager?.playSFX('buttonClick');
            }
        });
        this.#el.on(`mouseenter${namespace}`, '#btn-edit-avatar', () => {
            self.#audioManager?.playSFX('buttonHover');
        });

        // Avatar Choice Click (Delegated - requires container to exist)
        if (this.#avatarChoicesContainer && this.#avatarChoicesContainer.length) {
            this.#avatarChoicesContainer.on(`click${namespace}`, '.avatar-choice', (e) => {
                const $target = $(e.currentTarget);
                const file = $target.data('avatar');

                self.#audioManager?.playSFX('buttonClick');

                if (file && self.#accountManager.saveAvatarChoice(file)) {
                    $('#profile-avatar-img').attr('src', `assets/images/avatars/${file}`);
                    self.#avatarChoicesContainer.find('.avatar-choice.selected-avatar').removeClass('selected-avatar');
                    $target.addClass('selected-avatar');
                    self.#avatarChoicesContainer.addClass('hidden');
                    const updatedUser = self.#accountManager.getCurrentUser(); // Get fresh user data
                    if (updatedUser) {
                        self.#uiManager.showTopBar(updatedUser);
                    }
                    console.log(`ProfileScreenUI: Avatar changed to ${file}`);
                } else {
                    console.error("ProfileScreenUI: Failed to save avatar choice or file is invalid:", file);
                    self.#audioManager?.playSFX('genericError');
                }
            });
            this.#avatarChoicesContainer.on(`mouseenter${namespace}`, '.avatar-choice', () => {
                self.#audioManager?.playSFX('buttonHover');
            });
        }

        // Set Mastery Block Click
        this.#el.on(`click${namespace}`, '#profile-setmastery-block', () => {
            self.#audioManager?.playSFX('buttonClick');
            // Use UIManager to navigate, passing the set code
            self.#uiManager.navigateTo('set-mastery-screen', 'ELDRAEM');
        });
        this.#el.on(`mouseenter${namespace}`, '#profile-setmastery-block', () => {
            self.#audioManager?.playSFX('buttonHover');
        });

        // Set Collection Block Click
        this.#el.on(`click${namespace}`, '#profile-setcollection-block', () => {
            self.#audioManager?.playSFX('buttonClick');
            // Use UIManager to navigate, passing the set code
            self.#uiManager.navigateTo('set-collection-screen', 'ELDRAEM');
        });
        this.#el.on(`mouseenter${namespace}`, '#profile-setcollection-block', () => {
            self.#audioManager?.playSFX('buttonHover');
        });

        console.log("ProfileScreenUI: Events bound.");
    }

    // Optional: Add a destroy method if needed
    // destroy() {
    //     console.log("ProfileScreenUI: Destroying (unbinding events)...");
    //     this.#el?.off('.profileui');
    //     if (this.#avatarChoicesContainer && this.#avatarChoicesContainer.length) {
    //          this.#avatarChoicesContainer.off('.profileui');
    //     }
    //     // Nullify references if necessary
    //     this.#el = null;
    //     this.#avatarChoicesContainer = null;
    // }

} // End of class ProfileScreenUI