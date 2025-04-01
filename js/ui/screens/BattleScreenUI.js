// js/ui/screens/BattleScreenUI.js

// Importar dependências
import CardRenderer from '../helpers/CardRenderer.js';
import ZoomHandler from '../helpers/ZoomHandler.js';
import CreatureCard from '../../core/CreatureCard.js'; // Default import - OK
import { RunebindingCard } from '../../core/RunebindingCard.js'; // Named import - CORRIGIDO
import { Graveyard } from '../../core/Graveyard.js'; // Named import - CORRIGIDO

export default class BattleScreenUI {
    // --- Referências Injetadas ---
    #screenManager;
    #accountManager; // Adicionado para buscar avatar local
    #cardDatabase;
    #cardRenderer;
    #zoomHandler;

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
    #btnBackToProfile; // Botão do overlay de fim de jogo
    #playerDeckImgElement; // NOVO
    #playerGraveyardImgElement; // NOVO
    #opponentDeckImgElement; // NOVO
    #opponentGraveyardImgElement; // NOVO


    // --- Estado Interno da UI da Batalha ---
    #isSelectingDiscard = false;
    #isSelectingTarget = false;
    #actionPendingTarget = null; // { type: 'playCard', cardUniqueId: '...', targetType: '...' }
    #isDeclaringAttackers = false;
    #selectedAttackerIds = new Set();
    #isAssigningBlockers = false;
    #blockerAssignmentsUI = {}; // { attackerId: [blockerId1, ...] }
    #selectedBlockerId = null;
    #pendingDiscardCount = 0; // Para descarte obrigatório
    #graveyardPlaceholderSrc = 'assets/images/ui/graveyard.png'; // Armazena o caminho


    // --- Construtor ---
    constructor(screenManager, accountManager, cardDatabase, cardRenderer, zoomHandler) {
        this.#screenManager = screenManager;
        this.#accountManager = accountManager; // Armazena AccountManager
        this.#cardDatabase = cardDatabase;
        this.#cardRenderer = cardRenderer;
        this.#zoomHandler = zoomHandler;

        // --- CORREÇÃO: Certifique-se que o caminho do placeholder está correto ---
        this.#graveyardPlaceholderSrc = 'assets/images/ui/graveyard.png'; // Confirme este caminho!

        this._cacheSelectors(); // Busca e armazena seletores jQuery
        if (!this.#battleScreenElement || !this.#battleScreenElement.length) {
            console.error("BattleScreenUI Error: #battle-screen element not found!");
            return;
        }
        this._bindPermanentEvents();
        console.log("BattleScreenUI initialized.");
    }

    // --- Métodos de Setup ---
    setGameInstance(gameInstance) {
        this.#gameInstance = gameInstance;
        if (this.#gameInstance) {
            this._bindGameEventListeners(); // Ouve os eventos do jogo
        }
    }
    setLocalPlayer(playerId) {
        this.#localPlayerId = playerId;
    }

    // --- Método Principal de Renderização ---
    renderInitialState() {
        if (!this.#gameInstance || !this.#localPlayerId) {
            console.error("BattleScreenUI Error: Game Instance or Local Player ID not set.");
            this.#screenManager.showScreen('profile-screen'); return;
        }
        console.log("BattleScreenUI: Rendering initial game state...");

        // Limpeza e Reset
        this._clearUI();
        this._resetUIState();

        const localPlayer = this.#gameInstance.getPlayer(this.#localPlayerId);
        const opponent = this.#gameInstance.getOpponent(this.#localPlayerId);
        if (!localPlayer || !opponent) { console.error("BattleScreenUI Error: Players not found."); return; }

        // Render Jogadores
        this._renderPlayerInfo(localPlayer, true); // Renderiza info local (inclui avatar)
        this._renderPlayerInfo(opponent, false); // Renderiza info oponente
        this._renderPlayerHand(localPlayer);
        this._renderOpponentHand(opponent);

        // --- ATUALIZAR RENDERIZAÇÃO INICIAL DE DECK/CEMITÉRIO ---
        this._updateDeckDisplay(localPlayer); // Atualiza deck (imagem já no HTML, só conta)
        this._updateDeckDisplay(opponent);
        this._updateGraveyardDisplay(localPlayer); // Atualiza cemitério (conta E imagem)
        this._updateGraveyardDisplay(opponent);
        // --- FIM DA ATUALIZAÇÃO ---

        // Render Info Turno/Fase
        this.#turnNumberElement.text(this.#gameInstance.turnNumber || 1);
        this._updatePhaseIndicator();
        this._updateCurrentPlayerIndicator();

        // Configurar Botões
        this.#btnConfirmAttack.hide().prop('disabled', true);
        this.#btnConfirmBlocks.hide().prop('disabled', true);
        this._updateTurnControls();

        // Vincular Ações da UI (após elementos existirem)
        this.bindGameActions();

        this.#screenManager.showScreen('battle-screen');
        console.log("BattleScreenUI: Initial game state render complete.");
    }

    // --- Bindings de Eventos ---
    _bindPermanentEvents() {
        $('#battle-image-zoom-overlay').off('click.battlezoom').on('click.battlezoom', (event) => {
            if (event.target === event.currentTarget) this.#zoomHandler.closeZoom();
        });
        this.#gameOverOverlayElement.off('click.gameover').on('click.gameover', (event) => {
            if (event.target === event.currentTarget) { /* Não fecha clicando fora */ }
        });
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
         // Adiciona todos os listeners necessários para eventos do Game
         this.#gameInstance.addEventListener('turnChange', this._handleTurnChange.bind(this));
         this.#gameInstance.addEventListener('phaseChange', this._handlePhaseChange.bind(this));
         this.#gameInstance.addEventListener('playerStatsChanged', this._handlePlayerStatsChanged.bind(this));
         this.#gameInstance.addEventListener('cardDrawn', this._handleCardDrawn.bind(this));
         this.#gameInstance.addEventListener('cardPlayed', this._handleCardPlayed.bind(this));
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
        this.#btnEndTurn.off('click').on('click', this._handleEndTurnClick.bind(this));
        this.#btnPassPhase.off('click').on('click', this._handlePassPhaseClick.bind(this));
        this.#btnDiscardMana.off('click').on('click', this._handleDiscardForManaClick.bind(this));
        this.#btnConfirmAttack.off('click').on('click', this._handleConfirmAttackersClick.bind(this));
        this.#btnConfirmBlocks.off('click').on('click', this._handleConfirmBlockersClick.bind(this));
        this.#playerHandElement.off('click', '.card').on('click', '.card', this._handleHandCardClick.bind(this));
        this.#playerBattlefieldElement.off('click', '.card').on('click', '.card', this._handleBattlefieldCardClick.bind(this));
        this.#opponentBattlefieldElement.off('click', '.card').on('click', '.card', this._handleBattlefieldCardClick.bind(this));
        this.#playerHandElement.off('contextmenu', '.card').on('contextmenu', '.card', (e) => this.#zoomHandler.handleZoomClick(e, this.#gameInstance));
        this.#playerBattlefieldElement.off('contextmenu', '.card').on('contextmenu', '.card', (e) => this.#zoomHandler.handleZoomClick(e, this.#gameInstance));
        this.#opponentBattlefieldElement.off('contextmenu', '.card').on('contextmenu', '.card', (e) => this.#zoomHandler.handleZoomClick(e, this.#gameInstance));
        // Previne menu de contexto default em qualquer carta na tela
        this.#battleScreenElement.off('contextmenu', '.card').on('contextmenu', '.card', (e) => e.preventDefault());
        // Zoom também pode ser aplicado em deck/cemitério (opcional)
        // $('.deck-zone, .graveyard-zone').off('contextmenu').on('contextmenu', this._handleZoneZoom.bind(this));
        this.#btnBackToProfile.off('click').on('click', () => {
            this.#gameOverOverlayElement.removeClass('active');
            this.#gameInstance = null; // Desvincula a instância do jogo
            // Idealmente, UIManager ou main.js lidaria com a renderização da próxima tela
            // this.#uiManager.renderProfileScreen(); // Exemplo se UIManager fosse passado
            this.#screenManager.showScreen('profile-screen');
        });
    }

    // --- Handlers de Eventos do Jogo ---
    _handleTurnChange(e) { this._updateCurrentPlayerIndicator(); this._updateTurnControls(); }
    _handlePhaseChange(e) { this._updatePhaseIndicator(); this._updateTurnControls(); this._exitCombatModes(); /* Sai dos modos de combate ao mudar de fase */ }
    _handlePlayerStatsChanged(e) { const p = this.#gameInstance?.getPlayer(e.detail.playerId); if (p) this._updatePlayerStats(p); }
    _handleCardDrawn(e) { const { playerId, card } = e.detail; if (playerId === this.#localPlayerId) this._addCardToHandUI(card); else this._updateOpponentHandCount(this.#gameInstance?.getPlayer(playerId)); const player = this.#gameInstance?.getPlayer(playerId); if (player) this._updateDeckDisplay(player); /* Atualiza contagem deck */ }
    _handleCardPlayed(e) { /* Tratado por _handleCardMoved */ }
    _handleCardMoved(e) {
        const { cardUniqueId, cardData, fromZone, toZone, ownerId } = e.detail;
        const isLocal = ownerId === this.#localPlayerId;
        const player = this.#gameInstance?.getPlayer(ownerId); if (!player) return;
        // Remove do DOM antigo
        if (fromZone === 'hand' && isLocal) this.#playerHandElement.find(`.card[data-card-unique-id="${cardUniqueId}"]`).remove();
        else if (fromZone === 'battlefield') $(`#${isLocal ? 'player' : 'opponent'}-battlefield .card[data-card-unique-id="${cardUniqueId}"]`).remove();
        // Adiciona ao DOM novo
        if (toZone === 'hand' && isLocal) this._addCardToHandUI(cardData);
        else if (toZone === 'battlefield') this._addCardToBattlefieldUI(cardData, ownerId);

        // Atualiza contagens E DISPLAYS
        if (['deck'].includes(fromZone) || ['deck'].includes(toZone)) {
            this._updateDeckDisplay(player);
        }
        if (['graveyard'].includes(fromZone) || ['graveyard'].includes(toZone)) {
            this._updateGraveyardDisplay(player); // USA A NOVA FUNÇÃO
        }
        // Atualiza contagem da mão do oponente (se aplicável)
        if ((fromZone === 'hand' || toZone === 'hand') && !isLocal) {
            this._updateOpponentHandCount(player);
        }

        // Atualiza feedback de descarte
        if (fromZone === 'hand' && this.#pendingDiscardCount > 0 && ownerId === this.#localPlayerId) {
            this.#pendingDiscardCount--; // Diminui contador aqui
            if (this.#pendingDiscardCount <= 0) this._exitDiscardRequiredMode();
            else this.#actionFeedbackElement.text(`Mão cheia! Descarte ${this.#pendingDiscardCount} carta(s).`);
        }
    }
    _handleGameLog(e) { this._addLogMessage(e.detail.message, e.detail.type || 'system'); }
    _handleCreatureUpdate(e) { const {cardUniqueId,updates}=e.detail, $c=this.#battleScreenElement.find(`.card[data-card-unique-id="${cardUniqueId}"]`); if(!$c.length)return; if(updates.isTapped!==undefined)$c.toggleClass('tapped',updates.isTapped); if(updates.currentToughness!==undefined)$c.find('.card-toughness').text(updates.currentToughness); if(updates.attack!==undefined)$c.find('.card-attack').text(updates.attack); if(updates.hasSummoningSickness!==undefined)$c.toggleClass('has-summoning-sickness',updates.hasSummoningSickness); if(updates.statusEffects){$c.toggleClass('shielded',!!updates.statusEffects['shielded']);$c.toggleClass('silenced',!!updates.statusEffects['silenced']||!!updates.statusEffects['cant_attack']);} if(updates.canAttack!==undefined)$c.toggleClass('cannot-act',!updates.canAttack); }
    _handleDamagePrevented(e) { this._showCardFeedback(this.#battleScreenElement.find(`.card[data-card-unique-id="${e.detail.target.uniqueId}"]`), 'damage-prevented'); }
    _handleCreatureTookDamage(e) { this._showCardFeedback(this.#battleScreenElement.find(`.card[data-card-unique-id="${e.detail.creature.uniqueId}"]`), 'damage', e.detail.amount); }
    _handleCreatureHealed(e) { this._showCardFeedback(this.#battleScreenElement.find(`.card[data-card-unique-id="${e.detail.creature.uniqueId}"]`), 'heal', e.detail.amount); }
    _handleCombatResolved(e) { this._clearCombatVisuals(); this._updateTurnControls(); this._exitCombatModes(); this.#actionFeedbackElement.text('Combate resolvido.'); }
    _handleGameOver(e) { const{winnerId,winnerName,loserName}=e.detail, msg=(winnerId===this.#localPlayerId)?`Vitória! Você derrotou ${loserName||'o oponente'}!`:`Derrota! ${winnerName||'O oponente'} venceu!`; this.#gameOverMessageElement.text(msg); this.#gameOverOverlayElement.addClass('active'); this._disableAllGameActions(); }
    _handleDeckEmpty(e) { this._addLogMessage(`${this.#gameInstance?.getPlayer(e.detail.playerId)?.name||'Jogador'} não pode comprar!`, 'warning'); }
    _handleDiscardRequired(e) { const{playerId,count}=e.detail; this.#pendingDiscardCount=count; if(playerId===this.#localPlayerId)this._enterDiscardRequiredMode(count);else this.#actionFeedbackElement.text(`${this.#gameInstance?.getPlayer(playerId)?.name||'Oponente'} precisa descartar ${count}...`); }
    _handleAttackPhaseStart(e) { this._updateTurnControls(); }
    _handleAttackersDeclared(e) { this._clearCombatVisuals(); e.detail.attackers.forEach(a => this.#battleScreenElement.find(`.card[data-card-unique-id="${a.uniqueId}"]`).addClass('attacking')); const aN=e.detail.attackers.map(a=>a.name).join(', ')||'Ninguém'; if(this.#gameInstance?.getCurrentPlayer()?.id!==this.#localPlayerId){this._enterBlockerAssignmentMode();this.#actionFeedbackElement.text(`Declare bloqueadores contra: ${aN}.`);this._addLogMessage(`Oponente ataca com: ${aN}. Bloqueie.`, 'combat');}else{this.#actionFeedbackElement.text('Aguardando bloqueadores...');this._addLogMessage(`Ataque declarado com ${aN}. Aguardando...`,'info');} this._updateTurnControls(); }
    _handleBlockersDeclared(e) { this._clearCombatVisuals(); const att=this.#gameInstance?.getCombatManager()?.getAttackers()||[]; att.forEach(a => this.#battleScreenElement.find(`.card[data-card-unique-id="${a.uniqueId}"]`).addClass('attacking')); e.detail.declaredBlockers?.forEach(b => this.#battleScreenElement.find(`.card[data-card-unique-id="${b.blockerId}"]`).addClass('blocking')); this.#actionFeedbackElement.text('Bloqueadores declarados. Resolvendo...'); this._addLogMessage('Bloqueadores declarados. Resolvendo...', 'combat'); this._updateTurnControls(); }

    // --- Handlers de Ações da UI ---
    _handleEndTurnClick() { if (this._canInteract(true)) this.#gameInstance?.endTurn(); }
    _handlePassPhaseClick() { if (this._canInteract(true)) this.#gameInstance?.passPhase(); }
    _handleDiscardForManaClick() { if (this._canInteract(true) && !this.#btnDiscardMana.prop('disabled')) this._enterDiscardSelectionMode(); }
    _handleHandCardClick(event) {
        const $card = $(event.currentTarget);
        const cId = $card.data('card-unique-id');
        const p = this.#gameInstance?.getPlayer(this.#localPlayerId);
        const cI = p?.hand.getCard(cId);

        if (!cI) return; // Sai se a carta não for encontrada

        if (this.#isSelectingDiscard) {
            p?.discardCardForMana(cId, this.#gameInstance);
            this._exitDiscardSelectionMode();
        } else if (this.#pendingDiscardCount > 0) {
            // ResolvePlayerDiscard já move a carta e emite evento, que vai decrementar o contador
            this.#gameInstance?.resolvePlayerDiscard(this.#localPlayerId, cId);
            // Não chama exitDiscardRequiredMode aqui, espera o evento cardMoved
        } else if (this.#isSelectingTarget) {
            // Cancelar seleção de alvo clicando na carta novamente
             if (this.#actionPendingTarget && this.#actionPendingTarget.cardUniqueId === cId) {
                 this._showCardFeedback($card, 'cancel');
                 this._exitTargetSelectionMode();
            } else {
                this._addLogMessage('Clique em um alvo válido ou ESC para cancelar.', 'warning');
            }
        } else if (this._canInteract(true)) {
            if (cI.canPlay(p, this.#gameInstance)) { // Verifica se pode jogar *antes* de entrar no modo alvo
                if (cI.requiresTarget()) {
                    this._enterTargetSelectionMode({ type: 'playCard', cardUniqueId: cId, targetType: cI.targetType() });
                } else {
                    p?.playCard(cId, null, this.#gameInstance); // Joga carta sem alvo
                }
            } else {
                this._addLogMessage(`Não pode jogar ${cI.name} agora.`, 'warning');
                // Opcional: Mostrar feedback visual na carta
                this._showCardFeedback($card, 'cannot-act');
            }
        }
    }
    _handleBattlefieldCardClick(event) {
        if (!this.#gameInstance) return;
        const $card = $(event.currentTarget);
        const cId = $card.data('card-unique-id');
        const lP = this.#gameInstance.getPlayer(this.#localPlayerId);
        const oP = this.#gameInstance.getOpponent(this.#localPlayerId);
        const cI = lP?.battlefield.getCard(cId) || oP?.battlefield.getCard(cId);

        if (!cI) return; // Sai se a carta não foi encontrada

        const ownerId = cI.ownerId;

        if (this.#isSelectingTarget) {
            if (this._checkIfValidTarget(cI, ownerId, this.#actionPendingTarget)) {
                if (this.#actionPendingTarget?.type === 'playCard') {
                    lP?.playCard(this.#actionPendingTarget.cardUniqueId, cId, this.#gameInstance);
                }
                // Adicione outras ações que precisam de alvo aqui (e.g., habilidades de criaturas)
                this._exitTargetSelectionMode();
            } else {
                this._showCardFeedback($card, 'invalid-target');
                this._addLogMessage('Alvo inválido.', 'warning');
            }
        } else if (this.#isDeclaringAttackers) {
            if (ownerId === this.#localPlayerId && cI instanceof CreatureCard) {
                if (this.#selectedAttackerIds.has(cId)) {
                    this.#selectedAttackerIds.delete(cId);
                    $card.removeClass('selected-attacker');
                } else if (cI.canAttack()) {
                    this.#selectedAttackerIds.add(cId);
                    $card.addClass('selected-attacker');
                } else {
                    this._showCardFeedback($card, 'cannot-act');
                    this._addLogMessage(`${cI.name} não pode atacar.`, 'info');
                }
                this.#btnConfirmAttack.prop('disabled', this.#selectedAttackerIds.size === 0);
            }
        } else if (this.#isAssigningBlockers) {
            // Clicou numa criatura sua (potencial bloqueador)?
            if (ownerId === this.#localPlayerId && cI instanceof CreatureCard && cI.canBlock()) {
                 this.#battleScreenElement.find('.card.selected-blocker').removeClass('selected-blocker');
                 $card.addClass('selected-blocker');
                 this.#selectedBlockerId = cId;
                 this.#actionFeedbackElement.text(`Selecionado: ${cI.name}. Clique no atacante para bloquear.`);
            }
            // Clicou numa criatura oponente (atacante) E um bloqueador seu já está selecionado?
            else if (ownerId !== this.#localPlayerId && this.#selectedBlockerId && this.#gameInstance.getCombatManager().getAttackers().some(att => att.uniqueId === cId)) {
                 this._assignBlocker(cId, this.#selectedBlockerId);
                 this.#battleScreenElement.find('.card.selected-blocker').removeClass('selected-blocker');
                 this.#selectedBlockerId = null; // Limpa seleção do bloqueador
                 this.#actionFeedbackElement.text('Selecione bloqueador, depois atacante.'); // Volta instrução padrão
            }
             // Clicou numa criatura sua que NÃO pode bloquear?
            else if (ownerId === this.#localPlayerId && cI instanceof CreatureCard && !cI.canBlock()) {
                 this._showCardFeedback($card, 'cannot-act');
                 this._addLogMessage(`${cI.name} não pode bloquear.`, 'info');
            }
            // Clicou em outra coisa? Ignora ou limpa seleção do bloqueador
            else if (ownerId === this.#localPlayerId && !(cI instanceof CreatureCard)) {
                // Clicou numa runebinding sua, não faz nada
            } else {
                // Clicou em algo não relevante, talvez limpar seleção?
                // this.#battleScreenElement.find('.card.selected-blocker').removeClass('selected-blocker');
                // this.#selectedBlockerId = null;
                // this.#actionFeedbackElement.text('Selecione bloqueador, depois atacante.');
            }
        }
        // Adicione outras interações (e.g., clicar para ativar habilidade) aqui se necessário
    }
    _handleConfirmAttackersClick() { if (this.#isDeclaringAttackers) { this.#gameInstance?.confirmAttackDeclaration(this.#localPlayerId, [...this.#selectedAttackerIds]); this._exitAttackerDeclarationMode(); } }
    _handleConfirmBlockersClick() { if (this.#isAssigningBlockers) { this.#gameInstance?.confirmBlockDeclaration(this.#localPlayerId, { ...this.#blockerAssignmentsUI }); this._exitBlockerAssignmentMode(); } }

    // --- Métodos de Estado da UI ---
    _resetUIState() { this.#isSelectingDiscard = false; this.#isSelectingTarget = false; this.#actionPendingTarget = null; this.#isDeclaringAttackers = false; this.#selectedAttackerIds.clear(); this.#isAssigningBlockers = false; this.#blockerAssignmentsUI = {}; this.#selectedBlockerId = null; this.#pendingDiscardCount = 0; this._clearCombatVisuals(); this._closeZoomedImage(); this.#actionFeedbackElement.text(''); this.#btnDiscardMana.removeClass('active-selection'); this.#battleScreenElement.find('.card.targetable, .card.selected-attacker, .card.selected-blocker, .card.is-selecting, .card.cannot-act, .card.disabled-interaction').removeClass('targetable selected-attacker selected-blocker is-selecting cannot-act disabled-interaction'); this.#gameOverOverlayElement.removeClass('active'); }
    _canInteract(needsActiveTurn=true){if(!this.#gameInstance||this.#gameInstance.state==='game_over')return false; /* Permitir interação se declarando/bloqueando mesmo fora do turno? Depende das regras */ if(this.#isDeclaringAttackers || this.#isAssigningBlockers) return true; if(this.#isSelectingTarget||this.#isSelectingDiscard||this.#pendingDiscardCount>0)return true; if(needsActiveTurn&&this.#gameInstance.getCurrentPlayer()?.id!==this.#localPlayerId)return false; return true;}
    _enterDiscardRequiredMode(c){this.#pendingDiscardCount=c;this.#actionFeedbackElement.text(`Mão cheia! Descarte ${c} carta(s). Clique na(s) carta(s) a descartar.`);this._disableAllGameActions(true);this.#playerHandElement.find('.card').addClass('targetable');}
    _exitDiscardRequiredMode(){this.#pendingDiscardCount=0;this.#actionFeedbackElement.text('');this.#playerHandElement.find('.card').removeClass('targetable');this._updateTurnControls();}
    _enterDiscardSelectionMode(){this.#isSelectingDiscard=true;this.#actionFeedbackElement.text('Clique na carta para descartar por Mana.');this.#playerHandElement.find('.card').addClass('targetable');this._disableAllGameActions(true);this.#btnDiscardMana.addClass('active-selection');}
    _exitDiscardSelectionMode(){this.#isSelectingDiscard=false;this.#actionFeedbackElement.text('');this.#playerHandElement.find('.card').removeClass('targetable');this.#btnDiscardMana.removeClass('active-selection');this._updateTurnControls();}
    _enterTargetSelectionMode(aI){this.#isSelectingTarget=true;this.#actionPendingTarget=aI;const sC=this.#gameInstance?.findCardInstance(aI.cardUniqueId),cN=sC?.name||'?';this.#actionFeedbackElement.text(`Selecione alvo para ${cN} (ESC cancela)`);this._highlightValidTargets(aI.targetType);this._disableAllGameActions(true);this.#playerHandElement.find(`.card[data-card-unique-id="${aI.cardUniqueId}"]`).addClass('is-selecting');}
    _exitTargetSelectionMode(){this.#isSelectingTarget=false;this.#actionPendingTarget=null;this.#actionFeedbackElement.text('');this.#battleScreenElement.find('.targetable, .is-selecting').removeClass('targetable is-selecting');this._updateTurnControls();}
    _enterAttackerDeclarationMode(){if(!this._canInteract(true))return;this.#isDeclaringAttackers=true;this.#selectedAttackerIds.clear();this.#actionFeedbackElement.text('Selecione atacantes (ESC cancela)');this.#playerBattlefieldElement.find('.card').each((i,el)=>{const $c=$(el),cI=this.#gameInstance?.getPlayer(this.#localPlayerId)?.battlefield.getCard($c.data('card-unique-id'));if(cI instanceof CreatureCard&&cI.canAttack())$c.addClass('targetable');else $c.addClass('cannot-act');});this.#btnConfirmAttack.text('Confirmar Ataque').off('click').on('click',this._handleConfirmAttackersClick.bind(this)).show().prop('disabled',true);this.#btnPassPhase.prop('disabled',true);this.#btnEndTurn.prop('disabled',true);this.#btnDiscardMana.prop('disabled',true);}
    _exitAttackerDeclarationMode(){this.#isDeclaringAttackers=false;this.#selectedAttackerIds.clear();this.#actionFeedbackElement.text('');this.#battleScreenElement.find('.targetable, .selected-attacker, .cannot-act').removeClass('targetable selected-attacker cannot-act');this.#btnConfirmAttack.hide().prop('disabled',true);this._updateTurnControls();}
    _enterBlockerAssignmentMode(){if(this.#gameInstance?.getCurrentPlayer()?.id===this.#localPlayerId)return;this.#isAssigningBlockers=true;this.#blockerAssignmentsUI={};this.#selectedBlockerId=null;this.#actionFeedbackElement.text('Selecione bloqueador, depois o atacante (ESC cancela)');this.#playerBattlefieldElement.find('.card').each((i,el)=>{const $c=$(el),cI=this.#gameInstance?.getPlayer(this.#localPlayerId)?.battlefield.getCard($c.data('card-unique-id'));if(cI instanceof CreatureCard&&cI.canBlock())$c.addClass('targetable');else $c.addClass('cannot-act');});const att=this.#gameInstance?.getCombatManager()?.getAttackers()||[];att.forEach(a => this.#battleScreenElement.find(`.card[data-card-unique-id="${a.uniqueId}"]`).addClass('targetable-attacker')); /* Highlight attackers */ this.#btnConfirmBlocks.show().prop('disabled',false);this.#btnPassPhase.prop('disabled',true);this.#btnEndTurn.prop('disabled',true);this.#btnDiscardMana.prop('disabled',true);}
    _exitBlockerAssignmentMode(){this.#isAssigningBlockers=false;this.#blockerAssignmentsUI={};this.#selectedBlockerId=null;this.#actionFeedbackElement.text('');this.#battleScreenElement.find('.targetable, .selected-blocker, .blocking, .cannot-act, .targetable-attacker').removeClass('targetable selected-blocker blocking cannot-act targetable-attacker');this.#btnConfirmBlocks.hide().prop('disabled',true);this._updateTurnControls();}
    _exitCombatModes(){if(this.#isDeclaringAttackers)this._exitAttackerDeclarationMode();if(this.#isAssigningBlockers)this._exitBlockerAssignmentMode();}
    _clearCombatVisuals(){this.#battleScreenElement.find('.card.attacking, .card.blocking, .card.selected-attacker, .card.selected-blocker').removeClass('attacking blocking selected-attacker selected-blocker');}
    _assignBlocker(aId,bId){if(!this.#blockerAssignmentsUI[aId])this.#blockerAssignmentsUI[aId]=[];if(!this.#blockerAssignmentsUI[aId].includes(bId)){this.#blockerAssignmentsUI[aId].push(bId);this._updateBlockerAssignmentVisuals();const bN=this.#battleScreenElement.find(`.card[data-card-unique-id="${bId}"]`).data('card-name')||'?';const aN=this.#battleScreenElement.find(`.card[data-card-unique-id="${aId}"]`).data('card-name')||'?';this._addLogMessage(`${bN} bloqueando ${aN}`, 'info');} else { /* Opcional: Desatribuir se clicar novamente? */ }}
    _updateBlockerAssignmentVisuals(){this.#battleScreenElement.find('.card.blocking').removeClass('blocking');for(const aId in this.#blockerAssignmentsUI){this.#blockerAssignmentsUI[aId].forEach(bId=>{this.#battleScreenElement.find(`.card[data-card-unique-id="${bId}"]`).addClass('blocking');});}}
    _highlightValidTargets(tT){this.#battleScreenElement.find('.targetable').removeClass('targetable');if(!this.#gameInstance||!this.#localPlayerId)return;const lP=this.#gameInstance.getPlayer(this.#localPlayerId),oP=this.#gameInstance.getOpponent(this.#localPlayerId);let sel='';switch(tT){case'creature':sel='#player-battlefield .card, #opponent-battlefield .card';break;case'opponent_creature':sel='#opponent-battlefield .card';break;case'own_creature':sel='#player-battlefield .card';break;case'player':this.#playerAvatarElement.closest('.player-info').add(this.#opponentAvatarElement.closest('.player-info')).addClass('targetable');return;case'opponent_player':this.#opponentAvatarElement.closest('.player-info').addClass('targetable');return;case'runebinding':sel='#player-battlefield .card, #opponent-battlefield .card';break; /* Precisa refinar */ default:return;} $(sel).each((i,el)=>{const $c=$(el),cUId=$c.data('card-unique-id'); if (!cUId) return; const cI=lP?.battlefield.getCard(cUId)||oP?.battlefield.getCard(cUId); if (!cI) return; if(tT.includes('creature')&&!(cI instanceof CreatureCard)) return; if(tT.includes('runebinding')&&!(cI instanceof RunebindingCard)) return; /* Adicione mais checks se necessário */ $c.addClass('targetable');});}
    _checkIfValidTarget(tI, tOId, aI) {
        if (!tI || !aI) return false;
        const rT = aI.targetType;
    
        /* Check for Player target */
        if (rT === 'player' || rT === 'opponent_player') {
          const targetInfoDiv = $(event.target).closest('.player-info');
          if (!targetInfoDiv.length) return false;
          const isOpponentTarget = targetInfoDiv.parent().hasClass('opponent');
          if (rT === 'opponent_player' && !isOpponentTarget) return false;
          if (rT === 'player') {
            // Need to determine how to reliably check if 'tI' is NOT a player object.
            // Assuming you have a 'Player' class or a specific property to identify players.
    
            // Example using instanceof (if 'Player' is a class):
            if (tI instanceof Player) {
              // 'tI' is a Player object, which might not be the intended target.
              return true; // Or potentially false based on your game logic.
            }
            // Example using a property (if player objects have a specific property, e.g., 'isPlayer'):
            if (tI && tI.isPlayer) {
              return true; // Or potentially false.
            }
            // If you want to ensure it's *not* a player, you would adjust the condition:
            // if (!(tI instanceof Player)) { ... }
    
            // For now, if 'rT' is 'player' and we reach here, it implies a click in the player area
            // but 'tI' is not explicitly identified as a player object. Depending on your game,
            // you might want to refine this check further.
            return true; // Assume valid for now if player area clicked and 'tI' check is inconclusive.
          }
          return true; // Assume valid for now if player area clicked and is opponent if needed.
        }
    
        /* Check Card types */
        if (rT.includes('creature') && !(tI instanceof CreatureCard)) return false;
        if (rT.includes('runebinding') && !(tI instanceof RunebindingCard)) return false;
    
        /* Check Ownership */
        if (rT === 'opponent_creature' && tOId === this.#localPlayerId) return false;
        if (rT === 'own_creature' && tOId !== this.#localPlayerId) return false;
    
        return true;
      }
    
      _showCardFeedback($cE, fT, v = '') {
        if (!$cE || !$cE.length) return;
        $cE.find('.card-feedback').remove();
        let fC = '',
          cC = '';
        switch (fT) {
          case 'damage':
            fC = `-${v}`;
            cC = 'feedback-damage';
            break;
          case 'heal':
            fC = `+${v}`;
            cC = 'feedback-heal';
            break;
          case 'buff':
            fC = `+${v}`;
            cC = 'feedback-buff';
            break;
          case 'debuff':
            fC = `-${v}`;
            cC = 'feedback-debuff';
            break;
          case 'damage-prevented':
            fC = '🛡️';
            cC = 'feedback-shield';
            break;
          case 'invalid-target':
            fC = '❌';
            cC = 'feedback-invalid';
            break;
          case 'cannot-act':
            fC = '🚫';
            cC = 'feedback-invalid';
            break;
          case 'cancel':
            fC = '↩️';
            cC = 'feedback-cancel';
            break;
          default:
            return;
        }
        const $f = $(`<div class="card-feedback ${cC}">${fC}</div>`);
        $cE.append($f);
        $f.fadeIn(100)
          .delay(800)
          .fadeOut(400, function() {
            $(this).remove();
          });
      }
    _showCardFeedback($cE, fT, v = ''){if(!$cE||!$cE.length)return;$cE.find('.card-feedback').remove();let fC='',cC='';switch(fT){case'damage':fC=`-${v}`;cC='feedback-damage';break;case'heal':fC=`+${v}`;cC='feedback-heal';break;case'buff':fC=`+${v}`;cC='feedback-buff';break;case'debuff':fC=`-${v}`;cC='feedback-debuff';break;case'damage-prevented':fC='🛡️';cC='feedback-shield';break;case'invalid-target':fC='❌';cC='feedback-invalid';break;case'cannot-act':fC='🚫';cC='feedback-invalid';break;case'cancel':fC='↩️';cC='feedback-cancel';break;default:return;}const $f=$(`<div class="card-feedback ${cC}">${fC}</div>`);$cE.append($f);$f.fadeIn(100).delay(800).fadeOut(400,function(){$(this).remove();});}
    _disableAllGameActions(allowTargetables=false){this.#btnEndTurn.add(this.#btnPassPhase).add(this.#btnDiscardMana).add(this.#btnConfirmAttack).add(this.#btnConfirmBlocks).prop('disabled',true); if (!allowTargetables) { this.#battleScreenElement.find('.card').addClass('disabled-interaction'); } else { this.#battleScreenElement.find('.card:not(.targetable)').addClass('disabled-interaction'); this.#battleScreenElement.find('.card.targetable').removeClass('disabled-interaction'); } }
    _closeZoomedImage() { this.#zoomHandler.closeZoom(); }

    // --- Métodos de Renderização da UI ---
    _clearUI() { this.#playerHandElement.empty(); this.#playerBattlefieldElement.empty(); this.#opponentHandElement.empty(); this.#opponentBattlefieldElement.empty(); this.#gameLogElement.empty().append('<li>Partida Iniciada!</li>'); this.#actionFeedbackElement.text(''); this.#gameOverOverlayElement.removeClass('active'); }
    _renderPlayerInfo(player, isLocal) { const prefix = isLocal ? '#player' : '#opponent'; const data = player.getRenderData(); $(`${prefix}-name`).text(data.name); $(`${prefix}-life`).text(data.life); $(`${prefix}-mana`).text(data.mana); $(`${prefix}-max-mana`).text(data.maxMana); const avatarEl = isLocal ? this.#playerAvatarElement : this.#opponentAvatarElement; let avatarFile = 'default.png'; if (isLocal) { avatarFile = this.#accountManager?.getCurrentUser()?.avatar || 'default.png'; } /* else { // TODO: Get opponent avatar from network/game data if available } */ avatarEl.attr('src', `assets/images/avatars/${avatarFile}`); }
    _addCardToHandUI(cD) { const $c = this.#cardRenderer.renderCard(cD, 'hand'); if ($c) { this.#playerHandElement.append($c); $c.addClass('animate-add-hand'); setTimeout(() => $c.removeClass('animate-add-hand'), 500); } }
    _renderPlayerHand(p) { this.#playerHandElement.empty(); p.hand.getCards().forEach(c => { const $c = this.#cardRenderer.renderCard(c.getRenderData(), 'hand'); if ($c) this.#playerHandElement.append($c); }); }
    _renderOpponentHand(o) { const $h = this.#opponentHandElement.empty(), hS = o.hand.getSize(); this.#opponentHandCountElement.text(hS); for (let i = 0; i < hS; i++) $h.append('<div class="card-back"></div>'); }
    _updateOpponentHandCount(o) { this._renderOpponentHand(o); }
    _addCardToBattlefieldUI(cD, oId) { const $c = this.#cardRenderer.renderCard(cD, 'battlefield'); if ($c) { const tF = (oId === this.#localPlayerId) ? this.#playerBattlefieldElement : this.#opponentBattlefieldElement; tF.append($c); $c.addClass('animate-enter-battlefield'); setTimeout(() => $c.removeClass('animate-enter-battlefield'), 500); } }
    _updatePlayerStats(p) { this._renderPlayerInfo(p, p.id === this.#localPlayerId); } // Reusa render info
    _updatePhaseIndicator() { const phase = this.#gameInstance?.getCurrentPhase() || ''; this.#phaseIndicatorElement.text(phase.charAt(0).toUpperCase() + phase.slice(1)); }
    _updateCurrentPlayerIndicator() { const name = this.#gameInstance?.getCurrentPlayer()?.name || '...?'; this.#currentPlayerIndicatorElement.text(name); $('body').toggleClass('player-turn', this.#gameInstance?.getCurrentPlayer()?.id === this.#localPlayerId).toggleClass('opponent-turn', this.#gameInstance?.getCurrentPlayer()?.id !== this.#localPlayerId); }
    _updateTurnControls() {
        if (!this.#gameInstance || this.#gameInstance.state === 'game_over') { this._disableAllGameActions(); this.#btnConfirmAttack.hide(); this.#btnConfirmBlocks.hide(); return; }
        const isMyTurn = this.#gameInstance.getCurrentPlayer()?.id === this.#localPlayerId;
        const currentPhase = this.#gameInstance.getCurrentPhase();
        const player = this.#gameInstance.getPlayer(this.#localPlayerId);
        const canAttackThisTurn = player?.battlefield.getCreatures().some(c => c.canAttack()); // Verifica se HÁ alguma criatura que PODE atacar
        const baseDisabled = !isMyTurn || this.#isSelectingTarget || this.#isSelectingDiscard || this.#pendingDiscardCount > 0 || this.#isDeclaringAttackers || this.#isAssigningBlockers;
        const canDiscard = player && !player.hasDiscardedForMana && currentPhase === 'main' && player.maxMana < 10;

        this.#btnEndTurn.prop('disabled', baseDisabled);
        this.#btnPassPhase.prop('disabled', baseDisabled);
        this.#btnDiscardMana.prop('disabled', baseDisabled || !canDiscard);

        // Reset buttons visibility/state initially
        this.#btnConfirmAttack.hide().prop('disabled', true);
        this.#btnConfirmBlocks.hide().prop('disabled', true);
        this.#btnConfirmAttack.text('Confirmar Ataque'); // Default text

        // Show specific buttons based on state/phase
        if (isMyTurn && currentPhase === 'attack' && !this.#isDeclaringAttackers && !this.#isAssigningBlockers) {
            this.#btnConfirmAttack.text('Declarar Atacantes').off('click').on('click', this._enterAttackerDeclarationMode.bind(this)).show().prop('disabled', !canAttackThisTurn);
        } else if (this.#isDeclaringAttackers) {
             this.#btnConfirmAttack.text('Confirmar Ataque').off('click').on('click', this._handleConfirmAttackersClick.bind(this)).show().prop('disabled', this.#selectedAttackerIds.size === 0);
        } else if (this.#isAssigningBlockers) { // This state is usually for the opponent, but maybe UI shows button for local player too?
             // Assuming the button is for the local player when it's OPPONENT'S attack phase
             if (!isMyTurn && this.#gameInstance.getCombatManager().state === 'declare_blockers') {
                 this.#btnConfirmBlocks.show().prop('disabled', false); // Enable confirm blocks button
             }
        }

        // Re-evaluate card interactability
        if (!this.#isSelectingTarget && !this.#isSelectingDiscard && this.#pendingDiscardCount === 0 && !this.#isDeclaringAttackers && !this.#isAssigningBlockers) {
            this.#battleScreenElement.find('.disabled-interaction').removeClass('disabled-interaction');
        } else {
            // If in a selection mode, disable non-targetable cards
            this.#battleScreenElement.find('.card:not(.targetable, .targetable-attacker)').addClass('disabled-interaction');
            this.#battleScreenElement.find('.targetable, .targetable-attacker').removeClass('disabled-interaction');
        }
    }
    _addLogMessage(m, t = 'info') { if (!m) return; const $l = this.#gameLogElement, $li = $(`<li></li>`).addClass(`log-${t}`).text(m); $l.append($li); if (this.#gameLogContainerElement.length) this.#gameLogContainerElement.scrollTop(this.#gameLogContainerElement[0].scrollHeight); }
    _updateDeckDisplay(player) { if (!player) return; const isLocal = player.id === this.#localPlayerId; const deckSize = player.deck.getSize(); const countElement = isLocal ? this.#playerDeckCountElement : this.#opponentDeckCountElement; const imgElement = isLocal ? this.#playerDeckImgElement : this.#opponentDeckImgElement; countElement.text(deckSize); /* imgElement.toggle(deckSize > 0); // Optional: hide image if 0 */ }
    _updateGraveyardDisplay(player) { if (!player) return; const isLocal = player.id === this.#localPlayerId; const graveyard = player.graveyard; const graveyardSize = graveyard.getSize(); const countElement = isLocal ? this.#playerGraveyardCountElement : this.#opponentGraveyardCountElement; const imgElement = isLocal ? this.#playerGraveyardImgElement : this.#opponentGraveyardImgElement; countElement.text(graveyardSize); if (graveyardSize === 0) { imgElement.attr('src', this.#graveyardPlaceholderSrc).attr('alt', isLocal ? 'Seu Cemitério (Vazio)' : 'Cemitério Oponente (Vazio)').addClass('is-placeholder'); } else { const graveyardCards = graveyard.getCards(); const topCard = graveyardCards[graveyardCards.length - 1]; if (topCard) { const topCardData = topCard.getRenderData(); const imageSrc = topCardData.imageSrc || 'assets/images/cards/default.png'; imgElement.attr('src', imageSrc).attr('alt', `Topo Cemitério: ${topCardData.name}`).removeClass('is-placeholder'); } else { imgElement.attr('src', this.#graveyardPlaceholderSrc).attr('alt', isLocal ? 'Seu Cemitério (Erro)' : 'Cemitério Oponente (Erro)').addClass('is-placeholder'); console.warn(`_updateGraveyardDisplay: Graveyard size ${graveyardSize} but failed to get top card for player ${player.id}`); } } }

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