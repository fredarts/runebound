// js/ui/screens/ProfileScreenUI.js

// Assume que CardRenderer e ZoomHandler são importados
import CardRenderer from '../helpers/CardRenderer.js';
import ZoomHandler from '../helpers/ZoomHandler.js';

export default class ProfileScreenUI {
    #screenManager;
    #accountManager;
    #cardDatabase;
    #cardRenderer;
    #zoomHandler;
    #uiManager; // Referência ao UIManager central (para chamar renderDeckBuilder)

    #profileScreenElement; // Cache do elemento da tela

    constructor(screenManager, accountManager, cardDatabase, cardRenderer, zoomHandler, uiManager) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;
        this.#cardRenderer = cardRenderer; // Recebe a instância do renderer
        this.#zoomHandler = zoomHandler;   // Recebe a instância do zoom handler
        this.#uiManager = uiManager;       // Recebe a instância do UIManager

        this.#profileScreenElement = $('#profile-screen'); // Cacheia o seletor da tela
        if (!this.#profileScreenElement.length) {
            console.error("ProfileScreenUI Error: Element #profile-screen not found!");
            return; // Evita erros se o elemento não existir
        }
        this._bindEvents(); // Vincula eventos uma vez na inicialização
        console.log("ProfileScreenUI initialized.");
    }

    /** Renderiza/Atualiza todo o conteúdo da tela de perfil */
    render() {
        console.log("ProfileScreenUI: Rendering...");
        const currentUser = this.#accountManager.getCurrentUser();
        if (!currentUser) {
            console.warn("ProfileScreenUI: Cannot render - user not logged in.");
            this.#screenManager.showScreen('login-screen'); // Redireciona se não logado
            return;
        }

        const collection = currentUser.collection || [];
        const decks = currentUser.decks || {};

        this._renderUserInfo(currentUser);
        this._renderAvatarSection(currentUser.avatar);
        this._renderMatchHistory(currentUser.matchHistory || []);
        this._renderCollection(collection);
        this._renderDeckList(decks);

        console.log("ProfileScreenUI: Render complete.");
    }

    /** Vincula eventos específicos da tela de perfil usando delegação */
    _bindEvents() {
        console.log("ProfileScreenUI: Binding events...");

        // Seleção de Avatar
        this.#profileScreenElement.on('click', '.avatar-choice', (event) => {
            this._handleAvatarClick(event);
        });

        // Zoom na Coleção (delegando ao ZoomHandler)
        this.#profileScreenElement.on('contextmenu', '#profile-unlocked-cards .mini-card', (event) => {
             this.#zoomHandler.handleZoomClick(event); // Passa o evento para o handler
        });
        // Prevenir menu de contexto default nos cards
        this.#profileScreenElement.on('contextmenu', '#profile-unlocked-cards .mini-card', (e) => e.preventDefault());


        // Botões de Deck
        this.#profileScreenElement.on('click', '#profile-deck-list .btn-edit-deck', (event) => {
            this._handleEditDeck(event);
        });
        this.#profileScreenElement.on('click', '#profile-deck-list .btn-delete-deck', (event) => {
            this._handleDeleteDeck(event);
        });
        this.#profileScreenElement.on('click', '#btn-goto-deck-builder-new', () => {
            this._handleManageDecks();
        });

        // Fechar Zoom Overlay específico do Perfil
        // É importante usar .off().on() se _bindEvents puder ser chamado múltiplas vezes
        $('#image-zoom-overlay').off('click.profilezoom').on('click.profilezoom', (event) => {
            if (event.target === event.currentTarget) {
                this.#zoomHandler.closeZoom(); // Usa o método do handler para fechar
            }
        });
    }

    // --- Handlers de Eventos Internos ---

    _handleAvatarClick(event) {
        const avatarFilename = $(event.currentTarget).data('avatar');
        if (avatarFilename && this.#accountManager.saveAvatarChoice(avatarFilename)) {
            $('#profile-avatar-img').attr('src', `assets/images/avatars/${avatarFilename}`);
            this.#profileScreenElement.find('.avatar-choice').removeClass('selected-avatar');
            $(event.currentTarget).addClass('selected-avatar');
            console.log("ProfileScreenUI: Avatar updated.");
            // Atualiza avatar na top bar também, se necessário (via UIManager?)
            // this.#uiManager.updateTopBarAvatar(avatarFilename); // Exemplo
        }
    }

    _handleEditDeck(event) {
        const deckId = $(event.currentTarget).closest('li').data('deck-id');
        if (deckId) {
            console.log(`ProfileScreenUI: Edit deck requested: ${deckId}`);
            // Chama o método do UIManager central para renderizar a tela correta
            this.#uiManager.renderDeckBuilderScreen(deckId);
            this.#screenManager.showScreen('deck-builder-screen');
        }
    }

    _handleDeleteDeck(event) {
        const $li = $(event.currentTarget).closest('li');
        const deckId = $li.data('deck-id');
        const deckName = $li.find('.deck-name').text().replace(/\(\d+\s*cartas?\)$/, '').trim();
        if (deckId && confirm(`Tem certeza que deseja excluir o deck "${deckName}"?`)) {
            const result = this.#accountManager.deleteDeck(deckId);
            if (result.success) {
                console.log(`ProfileScreenUI: Deck ${deckId} deleted.`);
                this.render(); // Re-renderiza a tela de perfil para atualizar a lista
            } else {
                alert(`Erro ao excluir deck: ${result.message}`);
            }
        }
    }

    _handleManageDecks() {
        console.log("ProfileScreenUI: Navigating to new deck creation.");
        // Chama o método do UIManager central para renderizar a tela correta sem ID
        this.#uiManager.renderDeckBuilderScreen();
        this.#screenManager.showScreen('deck-builder-screen');
    }

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
        // O HTML dos choices já é gerado no template, só precisamos marcar o selecionado.
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
             // Adapte a exibição conforme os dados que você salva em matchData
             $list.append(`<li class="${resultClass}">${dateStr} - ${resultText} vs ${match.opponent || 'Oponente'}</li>`);
        });
    }

    _renderCollection(collectionIds) {
        const $container = $('#profile-unlocked-cards').empty();
        $('#profile-card-count').text(collectionIds?.length || 0);
        if (!Array.isArray(collectionIds) || collectionIds.length === 0) {
            $container.append('<p class="placeholder-message">(Nenhuma carta na coleção)</p>');
            return;
        }
        let cardsRendered = 0;
        collectionIds.forEach(id => {
            const cardDef = this.#cardDatabase[id];
            if (cardDef) {
                const $miniCard = this.#cardRenderer.renderMiniCard(cardDef, 'collection'); // Usa o helper
                if ($miniCard) {
                    $container.append($miniCard);
                    cardsRendered++;
                }
            } else {
                console.warn(`ProfileScreenUI: Card ID '${id}' missing from database.`);
            }
        });
        console.log(`ProfileScreenUI: Rendered ${cardsRendered} collection cards.`);
    }

    _renderDeckList(decks) {
        const $list = $('#profile-deck-list').empty();
        const deckIds = Object.keys(decks || {});
        if (!deckIds.length) {
            $list.append('<li>(Nenhum deck criado)</li>');
            return;
        }
        deckIds.forEach(id => {
            const deck = decks[id];
            if (deck) {
                $list.append(`
                    <li data-deck-id="${id}">
                        <span class="deck-name">${deck.name} (${deck.cards?.length || 0} cartas)</span>
                        <span class="deck-buttons">
                            <button class="btn-edit-deck" title="Editar Deck">✏️</button>
                            <button class="btn-delete-deck" title="Excluir Deck">🗑️</button>
                        </span>
                    </li>`);
            }
        });
        console.log(`ProfileScreenUI: Rendered ${deckIds.length} decks.`);
    }
}