// js/ui/screens/ProfileScreenUI.js - ATUALIZADO

import CardRenderer from '../helpers/CardRenderer.js';
import ZoomHandler from '../helpers/ZoomHandler.js';

export default class ProfileScreenUI {
    #screenManager;
    #accountManager;
    #cardDatabase; // Ainda pode ser útil para algo no futuro? Mantém por enquanto.
    #cardRenderer; // Não mais necessário aqui
    #zoomHandler;   // Não mais necessário aqui
    #uiManager;     // Mantém para navegação futura, se necessário

    #profileScreenElement; // Cache do elemento da tela

    // --- Selectors Removidos ---
    // #profileCardCount;
    // #profileUnlockedCards;
    // #profileDeckList;

    constructor(screenManager, accountManager, cardDatabase, cardRenderer, zoomHandler, uiManager) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;
        this.#cardRenderer = cardRenderer; // Recebe, mas não usa mais diretamente
        this.#zoomHandler = zoomHandler;   // Recebe, mas não usa mais diretamente
        this.#uiManager = uiManager;

        this.#profileScreenElement = $('#profile-screen');
        if (!this.#profileScreenElement.length) {
            console.error("ProfileScreenUI Error: Element #profile-screen not found!");
            return;
        }
        this._bindEvents();
        console.log("ProfileScreenUI initialized (Simplified).");
    }

    render() {
        console.log("ProfileScreenUI: Rendering (Simplified)...");
        const currentUser = this.#accountManager.getCurrentUser();
        if (!currentUser) {
            console.warn("ProfileScreenUI: Cannot render - user not logged in.");
            this.#screenManager.showScreen('login-screen');
            return;
        }

        this._renderUserInfo(currentUser);
        this._renderAvatarSection(currentUser.avatar);
        this._renderMatchHistory(currentUser.matchHistory || []);
        // Chamadas para _renderCollection e _renderDeckList REMOVIDAS

        console.log("ProfileScreenUI: Render complete (Simplified).");
    }

    _bindEvents() {
        console.log("ProfileScreenUI: Binding events (Simplified)...");

        // Seleção de Avatar
        this.#profileScreenElement.on('click', '.avatar-choice', (event) => {
            this._handleAvatarClick(event);
        });

        // Bindings para zoom, editar/deletar deck REMOVIDOS

        // Zoom overlay binding REMOVIDO (agora na DeckManagementScreenUI ou global)
    }

    // --- Handlers ---
    _handleAvatarClick(event) {
        const avatarFilename = $(event.currentTarget).data('avatar');
        if (avatarFilename && this.#accountManager.saveAvatarChoice(avatarFilename)) {
            $('#profile-avatar-img').attr('src', `assets/images/avatars/${avatarFilename}`);
            this.#profileScreenElement.find('.avatar-choice').removeClass('selected-avatar');
            $(event.currentTarget).addClass('selected-avatar');
            console.log("ProfileScreenUI: Avatar updated.");
            // TODO: Atualizar top bar avatar via UIManager
             // this.#uiManager.updateTopBarAvatar(avatarFilename);
        }
    }
    // Handlers _handleEditDeck, _handleDeleteDeck, _handleManageDecks REMOVIDOS

    // --- Métodos de Renderização Privados ---
    _renderUserInfo(currentUser) {
        $('#profile-username').text(currentUser.username);
        $('#profile-rank').text(currentUser.rank || 'N/A');
        $('#profile-wins').text(currentUser.stats?.wins ?? 0);
        $('#profile-losses').text(currentUser.stats?.losses ?? 0);
    }

    _renderAvatarSection(currentAvatarFilename) {
        const avatarFile = currentAvatarFilename || 'default.png';
        $('#profile-avatar-img').attr('src', `assets/images/avatars/${avatarFile}`).attr('alt', `Avatar: ${avatarFile}`);
        this.#profileScreenElement.find('.avatar-choice').removeClass('selected-avatar');
        this.#profileScreenElement.find(`.avatar-choice[data-avatar="${avatarFile}"]`).addClass('selected-avatar');
    }

    _renderMatchHistory(history) {
        const $list = $('#profile-match-history').empty();
        if (!history || history.length === 0) {
            $list.append('<li>(Nenhum histórico ainda)</li>');
            return;
        }
        history.slice(0, 10).forEach(match => {
             const dateStr = new Date(match.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour:'2-digit', minute: '2-digit'});
             const resultClass = match.result === 'win' ? 'history-win' : match.result === 'loss' ? 'history-loss' : 'history-draw';
             const resultText = match.result === 'win' ? 'Vitória' : match.result === 'loss' ? 'Derrota' : 'Empate';
             $list.append(`<li class="${resultClass}">${dateStr} - ${resultText} vs ${match.opponent || 'Oponente'}</li>`);
        });
    }

    // Métodos _renderCollection, _renderDeckList REMOVIDOS
}