// js/ui/screens/ProfileScreenUI.js
import { LEVELS } from '../../core/SetMasteryManager.js';

export default class ProfileScreenUI {
    #screenManager;
    #accountManager;
    #uiManager;
    #audioManager;
    #el; // Este será o jQuery object para #profile-screen
    #avatarChoicesContainer;
    #usernameDisplayElement;

    constructor(sm, am, cardDB, renderer, zoom, uiMgr, audioMgr) {
        this.#screenManager = sm;
        this.#accountManager = am;
        this.#uiManager = uiMgr;
        this.#audioManager = audioMgr;
        // Não chamamos _cacheSelectors ou _bind aqui, faremos em render/init
        console.log("ProfileScreenUI initialized (constructor).");
    }

    _cacheSelectors() {
        this.#el = $('#profile-screen'); // Garante que #el seja sempre o objeto jQuery atual
        if (!this.#el.length) {
            console.error("ProfileScreenUI Cache Error: Root element #profile-screen not found.");
            return false;
        }
        this.#avatarChoicesContainer = this.#el.find('#avatar-choices');
        this.#usernameDisplayElement = this.#el.find('#profile-username-display');
        
        if (!this.#avatarChoicesContainer.length) {
            console.warn("ProfileScreenUI _cacheSelectors: #avatar-choices container not found.");
        }
        if (!this.#usernameDisplayElement.length) {
            console.warn("ProfileScreenUI _cacheSelectors: #profile-username-display element not found.");
        }
        return true; // Indica sucesso
    }

    render() {
        console.log("ProfileScreenUI: Rendering...");

        // 1. (RE)CACHE SELECTORS para garantir que #el e outros elementos estejam corretos
        if (!this._cacheSelectors()) {
            // Se o cache falhar (elemento principal não encontrado), não podemos continuar.
            return;
        }

        // 2. (RE)BIND EVENTS
        this._bind(); // Agora _bind() é chamado toda vez que renderizamos

        const u = this.#accountManager.getCurrentUser();
        if (!u) {
            console.warn("ProfileScreenUI: No user logged in, redirecting to login.");
            this.#uiManager.navigateTo('login-screen');
            return;
        }

        if (this.#usernameDisplayElement && this.#usernameDisplayElement.length) {
            this.#usernameDisplayElement.text(u.username || 'Jogador');
        }
        // Assegura que os seletores abaixo são relativos ao #el recém-cacheado
        this.#el.find('#profile-avatar-img').attr('src', `assets/images/avatars/${u.avatar || 'default.png'}`);
        this.#el.find('#gold-amount').text(u.wallet?.gold ?? 0);
        this.#el.find('#gems-amount').text(u.wallet?.gems ?? 0);

        if (this.#avatarChoicesContainer && this.#avatarChoicesContainer.length) {
            this._renderAvatarChoices(u.avatars || ['default.png'], u.avatar || 'default.png');
        } else {
            // Se o container não foi encontrado mesmo após _cacheSelectors, há um problema no HTML.
            console.warn("ProfileScreenUI Render Warning: Cannot render avatar choices, container still not found after cache.");
        }
        
        const rankTier = u.rankTier || 'Bronze';
        const rankDivision = u.rankDivision || 4;
        this.#el.find('#profile-rank-badge')
            .text(`${rankTier} ${rankDivision}`)
            .attr('class', `rank-badge ${rankTier.toLowerCase()}`); 

        const rankIconFile = {
            Bronze: 'bronze_ranking.png',
            Prata: 'silver_ranking.png', 
            Ouro: 'gold_ranking.png'     
        }[rankTier] || 'bronze_ranking.png';
        this.#el.find('#rank-icon').attr('src', `assets/images/ui/${rankIconFile}`);

        const rating = Math.round(u.rating || 1500);
        const rd = Math.round(u.rd || 350);
        this.#el.find('#profile-rating').text(`(${rating} ±${rd})`);
        
        const tierMinRating = { Bronze: 0, Prata: 1400, Ouro: 1700 }[rankTier] ?? 0;
        const pointsIntoDivision = (rating - tierMinRating) % 75; 
        const rankProgressPercent = Math.max(0, Math.min(100, (pointsIntoDivision / 75) * 100));
        this.#el.find('#rank-progress').css('width', `${rankProgressPercent.toFixed(1)}%`);

        this.#el.find('#profile-wins').text(u.stats?.wins ?? 0);
        this.#el.find('#profile-losses').text(u.stats?.losses ?? 0);

        const masteryProgress = u.setMastery?.ELDRAEM ?? { xp: 0, level: 0 }; 
        const currentLevel = masteryProgress.level;
        const currentXP = masteryProgress.xp;
        const xpForNextLevel = LEVELS[currentLevel]?.xp ?? currentXP; 
        const xpForCurrentLevelStart = currentLevel > 0 ? (LEVELS[currentLevel - 1]?.xp ?? 0) : 0; 
        const xpInCurrentLevel = Math.max(0, currentXP - xpForCurrentLevelStart);
        const xpNeededForLevel = Math.max(1, xpForNextLevel - xpForCurrentLevelStart); 
        const masteryProgressPercent = Math.min(100, (xpInCurrentLevel / xpNeededForLevel) * 100);

        this.#el.find('#mastery-level').text(`Lv ${currentLevel}`);
        this.#el.find('#mastery-progress').css('width', `${masteryProgressPercent.toFixed(1)}%`);

        const TOTAL_CARDS_IN_ELDRAEM = 40; 
        const ownedCount = u.setsOwned?.ELDRAEM?.owned?.length ?? (u.collection?.length ?? 0); 
        this.#el.find('#collection-count').text(`${ownedCount}/${TOTAL_CARDS_IN_ELDRAEM} cartas`);
        const collectionProgressPercent = TOTAL_CARDS_IN_ELDRAEM > 0 ? (ownedCount / TOTAL_CARDS_IN_ELDRAEM) * 100 : 0;
        this.#el.find('#collection-progress').css('width', `${Math.min(100, collectionProgressPercent).toFixed(1)}%`);

        this._renderHistory(u.matchHistory ?? []);

        console.log("ProfileScreenUI: Render complete (events rebound).");
    }

    _renderAvatarChoices(availableAvatars, currentAvatar) {
        // ... (sem alteração, mas agora usa this.#avatarChoicesContainer que foi recacheado) ...
        if (!this.#avatarChoicesContainer || !this.#avatarChoicesContainer.length) {
            console.warn("ProfileScreenUI: Avatar choices container not available in _renderAvatarChoices.");
            return;
        }
        const safeAvailable = Array.isArray(availableAvatars) ? availableAvatars : ['default.png'];
        const safeCurrent = currentAvatar || 'default.png';
        const uniqueAvatars = [...new Set(safeAvailable)]; 
        this.#avatarChoicesContainer.empty(); 
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

    _renderHistory(matchHistoryArray) {
        // ... (sem alteração, mas usa this.#el) ...
        const $ul = this.#el.find('#profile-match-history'); 
        if (!$ul.length) return; 
        $ul.empty();
        const safeHistory = Array.isArray(matchHistoryArray) ? matchHistoryArray : [];
        if (safeHistory.length === 0) {
            $ul.append('<li>(Nenhum histórico de partidas)</li>');
            return;
        }
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
                $ul.append('<li class="history-error">Erro ao carregar partida</li>');
            }
        });
    }

    _bind() {
        // A asserção de this.#el já acontece em _cacheSelectors
        if (!this.#el || !this.#el.length) {
             console.error("ProfileScreenUI: Cannot bind events, root element #profile-screen not found. (Called from _bind)");
             return;
        }
        console.log("ProfileScreenUI: Binding events... (called from _bind)");
        const self = this;
        const namespace = '.profileui'; // Usar namespace para fácil remoção

        // Remove todos os listeners anteriores no namespace para #el e filhos
        this.#el.off(namespace);
        // Se #avatarChoicesContainer é um filho direto e queremos ser explícitos
        if (this.#avatarChoicesContainer && this.#avatarChoicesContainer.length) {
             this.#avatarChoicesContainer.off(namespace);
        }


        this.#el.on(`click${namespace}`, '#btn-edit-avatar', () => {
            if (self.#avatarChoicesContainer && self.#avatarChoicesContainer.length) {
                self.#avatarChoicesContainer.toggleClass('hidden');
                self.#audioManager?.playSFX('buttonClick');
            }
        });
        this.#el.on(`mouseenter${namespace}`, '#btn-edit-avatar', () => {
            self.#audioManager?.playSFX('buttonHover');
        });

        // Certifique-se de que #avatarChoicesContainer foi cacheado e existe
        if (this.#avatarChoicesContainer && this.#avatarChoicesContainer.length) {
            this.#avatarChoicesContainer.on(`click${namespace}`, '.avatar-choice', (e) => {
                const $target = $(e.currentTarget);
                const file = $target.data('avatar');
                self.#audioManager?.playSFX('buttonClick');
                if (file && self.#accountManager.saveAvatarChoice(file)) {
                    self.#el.find('#profile-avatar-img').attr('src', `assets/images/avatars/${file}`); // Use this.#el
                    self.#avatarChoicesContainer.find('.avatar-choice.selected-avatar').removeClass('selected-avatar');
                    $target.addClass('selected-avatar');
                    self.#avatarChoicesContainer.addClass('hidden');
                    const updatedUser = self.#accountManager.getCurrentUser(); 
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

        this.#el.on(`click${namespace}`, '#profile-setmastery-block', () => {
            self.#audioManager?.playSFX('buttonClick');
            self.#uiManager.navigateTo('set-mastery-screen', { setCode: 'ELDRAEM' });
        });
        this.#el.on(`mouseenter${namespace}`, '#profile-setmastery-block', () => {
            self.#audioManager?.playSFX('buttonHover');
        });

        this.#el.on(`click${namespace}`, '#profile-setcollection-block', () => {
            self.#audioManager?.playSFX('buttonClick');
            self.#uiManager.navigateTo('set-collection-screen', { setCode: 'ELDRAEM' });
        });
        this.#el.on(`mouseenter${namespace}`, '#profile-setcollection-block', () => {
            self.#audioManager?.playSFX('buttonHover');
        });
        console.log("ProfileScreenUI: Events (re)bound.");
    }

    destroy() {
        console.log("ProfileScreenUI: Destroying (unbinding events)...");
        this.#el?.off('.profileui'); // Remove listeners do elemento raiz e seus filhos delegados
        // Se #avatarChoicesContainer tinha listeners diretos e não delegados, precisaria de um .off() específico.
        // Mas como usamos delegação a partir de this.#el, o .off() acima deve cobrir.
        this.#el = null; // Importante: permite que _cacheSelectors() o recupere na próxima renderização
        this.#avatarChoicesContainer = null;
        this.#usernameDisplayElement = null;
    }
}