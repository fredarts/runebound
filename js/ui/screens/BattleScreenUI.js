// js/ui/screens/BattleScreenUI.js - ATUALIZADO (v2.5 - AudioManager Integration)

// Importar dependências
import CardRenderer from '../helpers/CardRenderer.js';
import ZoomHandler from '../helpers/ZoomHandler.js';
import CreatureCard from '../../core/CreatureCard.js';
import { RunebindingCard } from '../../core/RunebindingCard.js';
import { InstantCard } from '../../core/InstantCard.js'; // Importar InstantCard se for verificar tipo
import { Graveyard } from '../../core/Graveyard.js';
// AudioManager não precisa ser importado aqui, ele é injetado

export default class BattleScreenUI {
    // --- Referências Injetadas ---
    #screenManager;
    #accountManager;
    #cardDatabase;
    #cardRenderer;
    #zoomHandler;
    #audioManager; // <<<=== Adicionado: Referência para AudioManager

    // --- Estado do Jogo (Recebido) ---
    #gameInstance = null;
    #localPlayerId = null;

    // --- Elementos da UI (Cache) ---
    #battleScreenElement;
    #playerHandElement;
    #playerBattlefieldElement;
    #opponentHandElement;
    #opponentBattlefieldElement;
    #playerDeckCountElement;
    #playerGraveyardCountElement;
    #opponentDeckCountElement;
    #opponentGraveyardCountElement;
    #playerLifeElement;
    #playerManaElement;
    #playerMaxManaElement;
    #playerNameElement;
    #playerAvatarElement;
    #opponentLifeElement;
    #opponentManaElement;
    #opponentMaxManaElement;
    #opponentNameElement;
    #opponentAvatarElement;
    #opponentHandCountElement;
    #gameLogElement;
    #gameLogContainerElement;
    #turnNumberElement;
    #phaseIndicatorElement;
    #currentPlayerIndicatorElement;
    #actionFeedbackElement;
    #gameOverOverlayElement;
    #gameOverMessageElement;
    #btnEndTurn;
    #btnPassPhase;
    #btnDiscardMana;
    #btnConfirmAttack;
    #btnConfirmBlocks;
    #btnBackToProfile;
    #playerDeckImgElement;
    #playerGraveyardImgElement;
    #opponentDeckImgElement;
    #opponentGraveyardImgElement;

    // --- Estado Interno da UI da Batalha ---
    #isSelectingDiscard = false;
    #isSelectingTarget = false;
    #actionPendingTarget = null;
    #isDeclaringAttackers = false;
    #selectedAttackerIds = new Set();
    #isAssigningBlockers = false;
    #blockerAssignmentsUI = {};
    #selectedBlockerId = null;
    #pendingDiscardCount = 0;
    #graveyardPlaceholderSrc = 'assets/images/ui/graveyard.png';

    // --- Construtor ---
    constructor(screenManager, accountManager, cardDatabase, cardRenderer, zoomHandler, audioManager) { // <<<=== Parâmetro audioManager adicionado
        this.#screenManager = screenManager;
        this.#accountManager = accountManager;
        this.#cardDatabase = cardDatabase;
        this.#cardRenderer = cardRenderer;
        this.#zoomHandler = zoomHandler;
        this.#audioManager = audioManager; // <<<=== Armazena a instância

        this.#graveyardPlaceholderSrc = 'assets/images/ui/graveyard.png';

        this._cacheSelectors();
        if (!this.#battleScreenElement || !this.#battleScreenElement.length) {
            console.error("BattleScreenUI Error: #battle-screen element not found!");
            return;
        }
        this._bindPermanentEvents();
        console.log("BattleScreenUI initialized with AudioManager.");
    }

    // --- Métodos de Setup ---
    setGameInstance(gameInstance) {
        this.#gameInstance = gameInstance;
        if (this.#gameInstance) {
            this._bindGameEventListeners();
        }
    }
    setLocalPlayer(playerId) {
        this.#localPlayerId = playerId;
    }

    // --- Método Principal de Renderização ---
    renderInitialState() {
        if (!this.#gameInstance || !this.#localPlayerId) {
            console.error("BattleScreenUI Error: Game Instance or Local Player ID not set.");
            this.#screenManager.showScreen('profile-screen'); // Volta pro perfil se der erro
            return;
        }
        console.log("BattleScreenUI: Rendering initial game state...");

        // Limpeza e Reset
        this._clearUI();
        this._resetUIState();

        const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
        const opponent = this.#gameInstance.getOpponent(this.#localPlayerId);
        if (!localPlayer || !opponent) { console.error("BattleScreenUI Error: Players not found."); return; }

        // Render Infos, Mãos, Campos, Zonas
        this._renderPlayerInfo(localPlayer, true);
        this._renderPlayerInfo(opponent, false);
        this._renderPlayerHand(localPlayer);
        this._renderOpponentHand(opponent);
        this._updateDeckDisplay(localPlayer);
        this._updateDeckDisplay(opponent);
        this._updateGraveyardDisplay(localPlayer);
        this._updateGraveyardDisplay(opponent);
        this._renderBattlefield(localPlayer.battlefield, this.#playerBattlefieldElement); // Renderiza campo inicial
        this._renderBattlefield(opponent.battlefield, this.#opponentBattlefieldElement); // Renderiza campo inicial

        // Render Info Turno/Fase
        this.#turnNumberElement.text(this.#gameInstance.turnNumber || 1);
        this._updatePhaseIndicator();
        this._updateCurrentPlayerIndicator();

        // Configurar Botões
        this.#btnConfirmAttack.hide().prop('disabled', true);
        this.#btnConfirmBlocks.hide().prop('disabled', true);
        this._updateTurnControls();

        // Vincular Ações da UI
        this.bindGameActions();

        // Mostra a tela (após tudo renderizado)
        // this.#screenManager.showScreen('battle-screen'); // O main.js faz isso após initializeAndStartGame
        console.log("BattleScreenUI: Initial game state render complete.");
    }

    // --- Bindings de Eventos ---
    _bindPermanentEvents() {
        // Fechar zoom clicando fora
        $('#battle-image-zoom-overlay').off('click.battlezoom').on('click.battlezoom', (event) => {
            if (event.target === event.currentTarget) this.#zoomHandler.closeZoom();
        });
        // Não fechar game over clicando fora
        this.#gameOverOverlayElement.off('click.gameover').on('click.gameover', (event) => {
            if (event.target === event.currentTarget) { /* Não faz nada */ }
        });
        // Fechar seletores/zoom com ESC
        $(document).off('keydown.battlescreen').on('keydown.battlescreen', (e) => {
            if (!this.#battleScreenElement.hasClass('active')) return;
            if (e.key === "Escape") {
                this.#zoomHandler.closeZoom();
                if (this.#isSelectingTarget) this._exitTargetSelectionMode();
                if (this.#isSelectingDiscard) this._exitDiscardSelectionMode();
                if (this.#isDeclaringAttackers) this._exitAttackerDeclarationMode();
                if (this.#isAssigningBlockers) this._exitBlockerAssignmentMode();
            }
        });
    }
    _bindGameEventListeners() {
         if (!this.#gameInstance) return;
         console.log("BattleScreenUI: Binding game event listeners...");
         // Adiciona listeners para eventos do Game
         this.#gameInstance.addEventListener('turnChange', this._handleTurnChange.bind(this));
         this.#gameInstance.addEventListener('phaseChange', this._handlePhaseChange.bind(this));
         this.#gameInstance.addEventListener('playerStatsChanged', this._handlePlayerStatsChanged.bind(this));
         this.#gameInstance.addEventListener('cardDrawn', this._handleCardDrawn.bind(this));
         // 'cardPlayed' é tratado implicitamente por 'cardMoved'
         this.#gameInstance.addEventListener('cardMoved', this._handleCardMoved.bind(this));
         this.#gameInstance.addEventListener('gameLog', this._handleGameLog.bind(this));
         this.#gameInstance.addEventListener('creatureUpdate', this._handleCreatureUpdate.bind(this));
         this.#gameInstance.addEventListener('damagePrevented', this._handleDamagePrevented.bind(this));
         this.#gameInstance.addEventListener('creatureTookDamage', this._handleCreatureTookDamage.bind(this));
         this.#gameInstance.addEventListener('creatureHealed', this._handleCreatureHealed.bind(this));
         this.#gameInstance.addEventListener('gameOver', this._handleGameOver.bind(this));
         this.#gameInstance.addEventListener('deckEmpty', this._handleDeckEmpty.bind(this));
         this.#gameInstance.addEventListener('discardRequired', this._handleDiscardRequired.bind(this));
         this.#gameInstance.addEventListener('attackPhaseStart', this._handleAttackPhaseStart.bind(this));
         this.#gameInstance.addEventListener('attackersDeclared', this._handleAttackersDeclared.bind(this));
         this.#gameInstance.addEventListener('blockersDeclared', this._handleBlockersDeclared.bind(this));
         this.#gameInstance.addEventListener('combatResolved', this._handleCombatResolved.bind(this));
    }
    bindGameActions() {
        console.log("BattleScreenUI: Binding game action interactions...");

        // --- Adicionar áudio aos botões ---
        const addBattleAudio = ($element, sfxClick = 'buttonClick', sfxHover = 'buttonHover') => {
             $element.off('click.battleaudio').on('click.battleaudio', () => this.#audioManager?.playSFX(sfxClick));
             $element.off('mouseenter.battleaudio').on('mouseenter.battleaudio', () => this.#audioManager?.playSFX(sfxHover));
        };

        // Bind Ações Principais + Áudio
        this.#btnEndTurn.off('click').on('click', this._handleEndTurnClick.bind(this));
        addBattleAudio(this.#btnEndTurn);

        this.#btnPassPhase.off('click').on('click', this._handlePassPhaseClick.bind(this));
        addBattleAudio(this.#btnPassPhase);

        this.#btnDiscardMana.off('click').on('click', this._handleDiscardForManaClick.bind(this));
        addBattleAudio(this.#btnDiscardMana);

        // Bind Ações de Combate + Áudio
        this.#btnConfirmAttack.off('click').on('click', this._handleConfirmAttackersClick.bind(this));
        addBattleAudio(this.#btnConfirmAttack);

        this.#btnConfirmBlocks.off('click').on('click', this._handleConfirmBlockersClick.bind(this));
        addBattleAudio(this.#btnConfirmBlocks);

        // Bind Ações nas Cartas (Mão e Campo)
        this.#playerHandElement.off('click', '.card').on('click', '.card', this._handleHandCardClick.bind(this));
        this.#playerBattlefieldElement.off('click', '.card').on('click', '.card', this._handleBattlefieldCardClick.bind(this));
        this.#opponentBattlefieldElement.off('click', '.card').on('click', '.card', this._handleBattlefieldCardClick.bind(this));

        // Bind Zoom (Context Menu)
        this.#playerHandElement.off('contextmenu', '.card').on('contextmenu', '.card', (e) => this.#zoomHandler.handleZoomClick(e, this.#gameInstance));
        this.#playerBattlefieldElement.off('contextmenu', '.card').on('contextmenu', '.card', (e) => this.#zoomHandler.handleZoomClick(e, this.#gameInstance));
        this.#opponentBattlefieldElement.off('contextmenu', '.card').on('contextmenu', '.card', (e) => this.#zoomHandler.handleZoomClick(e, this.#gameInstance));
        this.#battleScreenElement.off('contextmenu', '.card').on('contextmenu', '.card', (e) => e.preventDefault()); // Previne menu default

        // Botão Voltar do Game Over + Áudio
        const $btnGameOverBack = this.#btnBackToProfile; // Renomeado para clareza
        $btnGameOverBack.off('click').on('click', () => {
            this.#gameOverOverlayElement.removeClass('active');
            this.#gameInstance = null; // Desvincula a instância do jogo
            this.#screenManager.showScreen('profile-screen'); // Vai para o perfil
            // A BGM será tocada pelo handler de navegação do UIManager
        });
        addBattleAudio($btnGameOverBack);
    }

    // --- Handlers de Eventos do Jogo (com Áudio) ---
    _handleTurnChange(e) { this._updateCurrentPlayerIndicator(); this._updateTurnControls(); }
    _handlePhaseChange(e) { this._updatePhaseIndicator(); this._updateTurnControls(); this._exitCombatModes(); }
    _handlePlayerStatsChanged(e) { const p = this.#gameInstance?.getPlayer(e.detail.playerId); if (p) this._updatePlayerStats(p); }
    _handleCardDrawn(e) {
        const { playerId, card } = e.detail;
        if (playerId === this.#localPlayerId) {
            this._addCardToHandUI(card);
            this.#audioManager?.playSFX('cardDraw'); // <<<=== Toca SFX
        } else {
            this._updateOpponentHandCount(this.#gameInstance?.getPlayer(playerId));
        }
        const player = this.#gameInstance?.getPlayer(playerId);
        if (player) this._updateDeckDisplay(player);
    }
    _handleCardPlayed(e) { /* Tratado por _handleCardMoved */ }
    _handleCardMoved(e) {
        const { cardUniqueId, cardData, fromZone, toZone, ownerId } = e.detail;
        const isLocal = ownerId === this.#localPlayerId;
        const player = this.#gameInstance?.getPlayer(ownerId); if (!player) return;

        // --- Remover do DOM antigo ---
        if (fromZone === 'hand' && isLocal) this.#playerHandElement.find(`.card[data-card-unique-id="${cardUniqueId}"]`).remove();
        else if (fromZone === 'battlefield') $(`#${isLocal ? 'player' : 'opponent'}-battlefield .card[data-card-unique-id="${cardUniqueId}"]`).remove();
        // Adicionar remoção de outras zonas se necessário

        // --- Adicionar ao DOM novo ---
        if (toZone === 'hand' && isLocal) this._addCardToHandUI(cardData);
        else if (toZone === 'battlefield') this._addCardToBattlefieldUI(cardData, ownerId);
        // Adicionar adição a outras zonas se necessário

        // --- Tocar SFX baseado na Ação ---
        if (toZone === 'graveyard' && fromZone === 'hand' && isLocal) {
            // Descarte da mão (inclui descarte por mana ou por excesso)
            this.#audioManager?.playSFX('cardDiscard');
            // Atualiza contador de descarte obrigatório, se aplicável
            if (this.#pendingDiscardCount > 0) {
                 this.#pendingDiscardCount--;
                 if (this.#pendingDiscardCount <= 0) this._exitDiscardRequiredMode();
                 else this.#actionFeedbackElement.text(`Mão cheia! Descarte ${this.#pendingDiscardCount} carta(s).`);
             }
        } else if ((toZone === 'battlefield' || toZone === 'graveyard') && fromZone === 'hand') {
            // Carta jogada da mão (para campo ou direto pro cemitério como Instant)
            if (cardData?.type === 'Creature') {
                this.#audioManager?.playSFX('playCreature');
            } else if (cardData?.type === 'Instant') {
                this.#audioManager?.playSFX('playInstant');
            } else if (cardData?.type === 'Runebinding') {
                 this.#audioManager?.playSFX('playRunebinding');
            }
        } else if (toZone === 'graveyard' && fromZone === 'battlefield') {
            // Criatura destruída, etc. (Poderia ter um som específico de destruição)
            // this.#audioManager?.playSFX('creatureDestroyed'); // Exemplo
        }

        // --- Atualizar Contagens/Displays ---
        if (['deck'].includes(fromZone) || ['deck'].includes(toZone)) this._updateDeckDisplay(player);
        if (['graveyard'].includes(fromZone) || ['graveyard'].includes(toZone)) this._updateGraveyardDisplay(player);
        if ((fromZone === 'hand' || toZone === 'hand') && !isLocal) this._updateOpponentHandCount(player);

        // NÃO decrementar #pendingDiscardCount aqui novamente, já foi feito acima no if (toZone === 'graveyard')
    }
    _handleGameLog(e) { this._addLogMessage(e.detail.message, e.detail.type || 'system'); }
    _handleCreatureUpdate(e) { /* ... (lógica de update visual inalterada) ... */ }
    _handleDamagePrevented(e) { this._showCardFeedback(this.#battleScreenElement.find(`.card[data-card-unique-id="${e.detail.target.uniqueId}"]`), 'damage-prevented'); /* SFX aqui? */ }
    _handleCreatureTookDamage(e) { this._showCardFeedback(this.#battleScreenElement.find(`.card[data-card-unique-id="${e.detail.creature.uniqueId}"]`), 'damage', e.detail.amount); /* SFX aqui? ('takeDamage') */ }
    _handleCreatureHealed(e) { this._showCardFeedback(this.#battleScreenElement.find(`.card[data-card-unique-id="${e.detail.creature.uniqueId}"]`), 'heal', e.detail.amount); /* SFX aqui? ('healEffect') */ }
    _handleCombatResolved(e) { /* ... (lógica visual inalterada) ... */ }
    _handleGameOver(e) {
        const { winnerId, winnerName, loserName } = e.detail;
        const isWinner = winnerId === this.#localPlayerId;
        const msg = isWinner ? `Vitória! Você derrotou ${loserName || 'o oponente'}!` : `Derrota! ${winnerName || 'O oponente'} venceu!`;
        this.#gameOverMessageElement.text(msg);
        this.#gameOverOverlayElement.addClass('active');
        this._disableAllGameActions();
        this.#audioManager?.playSFX(isWinner ? 'gameOverWin' : 'gameOverLose'); // <<<=== Toca SFX Fim de Jogo
        this.#audioManager?.stopBGM(); // <<<=== Para BGM
    }
    _handleDeckEmpty(e) { /* ... (log inalterado) ... */ }
    _handleDiscardRequired(e) { /* ... (lógica de estado inalterada) ... */ }
    _handleAttackPhaseStart(e) { this._updateTurnControls(); }
    _handleAttackersDeclared(e) { /* ... (lógica visual inalterada) ... */ }
    _handleBlockersDeclared(e) { /* ... (lógica visual inalterada) ... */ }

    // --- Handlers de Ações da UI ---
    // Os handlers de clique nos botões (_handleEndTurnClick, etc.) não precisam
    // tocar áudio aqui, pois já foi adicionado nos listeners em bindGameActions.
    _handleEndTurnClick() { if (this._canInteract(true)) this.#gameInstance?.endTurn(); }
    _handlePassPhaseClick() { if (this._canInteract(true)) this.#gameInstance?.passPhase(); }
    _handleDiscardForManaClick() { if (this._canInteract(true) && !this.#btnDiscardMana.prop('disabled')) this._enterDiscardSelectionMode(); }
    _handleHandCardClick(event) { /* ... (lógica de jogar/descartar/selecionar alvo inalterada) ... */ }
    _handleBattlefieldCardClick(event) { /* ... (lógica de alvo/ataque/bloqueio inalterada) ... */ }
    _handleConfirmAttackersClick() { if (this.#isDeclaringAttackers) { this.#gameInstance?.confirmAttackDeclaration(this.#localPlayerId, [...this.#selectedAttackerIds]); this._exitAttackerDeclarationMode(); } }
    _handleConfirmBlockersClick() { if (this.#isAssigningBlockers) { this.#gameInstance?.confirmBlockDeclaration(this.#localPlayerId, { ...this.#blockerAssignmentsUI }); this._exitBlockerAssignmentMode(); } }

    // --- Métodos de Estado da UI ---
    _resetUIState() { /* ... (inalterado) ... */ }
    _canInteract(needsActiveTurn=true){ /* ... (inalterado) ... */ }
    _enterDiscardRequiredMode(c){ /* ... (inalterado) ... */ }
    _exitDiscardRequiredMode(){ /* ... (inalterado) ... */ }
    _enterDiscardSelectionMode(){ /* ... (inalterado) ... */ }
    _exitDiscardSelectionMode(){ /* ... (inalterado) ... */ }
    _enterTargetSelectionMode(aI){ /* ... (inalterado) ... */ }
    _exitTargetSelectionMode(){ /* ... (inalterado) ... */ }
    _enterAttackerDeclarationMode(){ /* ... (inalterado) ... */ }
    _exitAttackerDeclarationMode(){ /* ... (inalterado) ... */ }
    _enterBlockerAssignmentMode(){ /* ... (inalterado) ... */ }
    _exitBlockerAssignmentMode(){ /* ... (inalterado) ... */ }
    _exitCombatModes(){ /* ... (inalterado) ... */ }
    _clearCombatVisuals(){ /* ... (inalterado) ... */ }
    _assignBlocker(aId,bId){ /* ... (inalterado) ... */ }
    _updateBlockerAssignmentVisuals(){ /* ... (inalterado) ... */ }
    _highlightValidTargets(tT){ /* ... (inalterado) ... */ }
    _checkIfValidTarget(tI, tOId, aI) { /* ... (inalterado) ... */ }
    _showCardFeedback($cE, fT, v = ''){ /* ... (inalterado) ... */ }
    _disableAllGameActions(allowTargetables=false){ /* ... (inalterado) ... */ }
    _closeZoomedImage() { this.#zoomHandler.closeZoom(); }

    // --- Métodos de Renderização da UI ---
    _clearUI() { /* ... (inalterado) ... */ }
    _renderPlayerInfo(player, isLocal) { /* ... (inalterado) ... */ }
    _addCardToHandUI(cD) { /* ... (inalterado) ... */ }
    _renderPlayerHand(p) { /* ... (inalterado) ... */ }
    _renderOpponentHand(o) { /* ... (inalterado) ... */ }
    _updateOpponentHandCount(o) { /* ... (inalterado) ... */ }
    _addCardToBattlefieldUI(cD, oId) { /* ... (inalterado) ... */ }
    _renderBattlefield(battlefield, $container) { // <<<=== NOVO (ou ajustar se já existir)
        $container.empty();
        battlefield.getAllCards().forEach(card => {
            this._addCardToBattlefieldUI(card.getRenderData(), card.ownerId);
        });
    }
    _updatePlayerStats(p) { /* ... (inalterado) ... */ }
    _updatePhaseIndicator() { /* ... (inalterado) ... */ }
    _updateCurrentPlayerIndicator() { /* ... (inalterado) ... */ }
    _updateTurnControls() { /* ... (inalterado) ... */ }
    _addLogMessage(m, t = 'info') { /* ... (inalterado) ... */ }
    _updateDeckDisplay(player) { /* ... (inalterado) ... */ }
    _updateGraveyardDisplay(player) { /* ... (inalterado) ... */ }

    // Cache dos seletores jQuery
    _cacheSelectors() {
        this.#battleScreenElement = $('#battle-screen');
        if (!this.#battleScreenElement.length) { console.error("BattleScreenUI CacheSelectors Error: #battle-screen not found during caching."); return; }
        this.#playerHandElement = this.#battleScreenElement.find('#player-hand');
        this.#playerBattlefieldElement = this.#battleScreenElement.find('#player-battlefield');
        this.#playerDeckCountElement = this.#battleScreenElement.find('#player-deck-count');
        this.#playerGraveyardCountElement = this.#battleScreenElement.find('#player-graveyard-count');
        this.#playerLifeElement = this.#battleScreenElement.find('#player-life');
        this.#playerManaElement = this.#battleScreenElement.find('#player-mana');
        this.#playerMaxManaElement = this.#battleScreenElement.find('#player-max-mana');
        this.#playerNameElement = this.#battleScreenElement.find('#player-name');
        this.#playerAvatarElement = this.#battleScreenElement.find('#player-avatar-img');
        this.#playerDeckImgElement = this.#battleScreenElement.find('#player-deck-img');
        this.#playerGraveyardImgElement = this.#battleScreenElement.find('#player-graveyard-img');

        this.#opponentHandElement = this.#battleScreenElement.find('#opponent-hand');
        this.#opponentBattlefieldElement = this.#battleScreenElement.find('#opponent-battlefield');
        this.#opponentDeckCountElement = this.#battleScreenElement.find('#opponent-deck-count');
        this.#opponentGraveyardCountElement = this.#battleScreenElement.find('#opponent-graveyard-count');
        this.#opponentLifeElement = this.#battleScreenElement.find('#opponent-life');
        this.#opponentManaElement = this.#battleScreenElement.find('#opponent-mana');
        this.#opponentMaxManaElement = this.#battleScreenElement.find('#opponent-max-mana');
        this.#opponentNameElement = this.#battleScreenElement.find('#opponent-name');
        this.#opponentAvatarElement = this.#battleScreenElement.find('#opponent-avatar-img');
        this.#opponentHandCountElement = this.#battleScreenElement.find('#opponent-hand-count');
        this.#opponentDeckImgElement = this.#battleScreenElement.find('#opponent-deck-img');
        this.#opponentGraveyardImgElement = this.#battleScreenElement.find('#opponent-graveyard-img');

        this.#gameLogElement = this.#battleScreenElement.find('#game-log');
        this.#gameLogContainerElement = this.#battleScreenElement.find('.game-log-container');
        this.#turnNumberElement = this.#battleScreenElement.find('#turn-number');
        this.#phaseIndicatorElement = this.#battleScreenElement.find('#phase-indicator');
        this.#currentPlayerIndicatorElement = this.#battleScreenElement.find('#current-player-indicator');
        this.#actionFeedbackElement = this.#battleScreenElement.find('#action-feedback');
        this.#gameOverOverlayElement = this.#battleScreenElement.find('#game-over-overlay');
        this.#gameOverMessageElement = this.#battleScreenElement.find('#game-over-message');
        this.#btnBackToProfile = this.#battleScreenElement.find('#btn-back-to-profile');

        this.#btnEndTurn = this.#battleScreenElement.find('#btn-end-turn');
        this.#btnPassPhase = this.#battleScreenElement.find('#btn-pass-phase');
        this.#btnDiscardMana = this.#battleScreenElement.find('#btn-discard-mana');
        this.#btnConfirmAttack = this.#battleScreenElement.find('#btn-confirm-attack');
        this.#btnConfirmBlocks = this.#battleScreenElement.find('#btn-confirm-blocks');
        console.log("BattleScreenUI: Selectors cached.");
    }

} // End class BattleScreenUI