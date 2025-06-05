// js/core/ai/SimpleAI.js

/**
 * Representa um jogador controlado por uma Inteligência Artificial simples.
 * Toma decisões básicas de jogo.
 */
export default class SimpleAI {
    #player; // A instância do Player que esta IA controla
    #game;   // A instância do Game
    #aiActionTimeout = null; // Timeout para as ações da IA

    constructor(playerInstance, gameInstance) {
        if (!playerInstance || !gameInstance) {
            throw new Error("SimpleAI requires valid player and game instances.");
        }
        this.#player = playerInstance;
        this.#game = gameInstance;
        console.log(`SimpleAI: Controlador inicializado para jogador ${this.#player.name}`);
    }

    /**
     * Cancela qualquer ação de IA pendente (ex: se o turno mudar abruptamente).
     */
    cancelPendingActions() {
        if (this.#aiActionTimeout) {
            clearTimeout(this.#aiActionTimeout);
            this.#aiActionTimeout = null;
            console.log(`SimpleAI (${this.#player.name}): Ações pendentes canceladas.`);
        }
    }

    /**
     * Executa a lógica de ação da IA.
     * @param {string} actionContext - 'active_turn' ou 'defense_response'
     */
    async performAction(actionContext = 'active_turn') {
        this.cancelPendingActions(); // Cancela qualquer timeout anterior

        const isMyActualTurn = this.#game.getCurrentPlayer()?.id === this.#player.id;
        const currentPhase = this.#game.getCurrentPhase();
        const cmState = this.#game.getCombatManager().state;
        const gameState = this.#game.state;

        // Condição de guarda principal
        if (actionContext === 'active_turn') {
            if (!isMyActualTurn || (gameState !== 'playing' && !(gameState === 'discarding' && this.#game.getPendingDiscardInfo()?.playerId === this.#player.id))) {
                console.log(`SimpleAI (${this.#player.name}): [active_turn] Ação pulada. Não é meu turno ou estado de jogo inválido (${gameState}). CurrentPlayer: ${this.#game.getCurrentPlayer()?.id}, MyID: ${this.#player.id}`);
                return;
            }
        } else if (actionContext === 'defense_response') {
            // Para defesa, NÃO deve ser o turno da IA. O jogador atual é o atacante humano.
            // A IA (this.#player) é o oponente do jogador atual.
            if (isMyActualTurn || currentPhase !== 'attack' || cmState !== 'declare_blockers') {
                console.log(`SimpleAI (${this.#player.name}): [defense_response] Ação pulada. Condições de defesa não atendidas. isMyActualTurn: ${isMyActualTurn}, Phase: ${currentPhase}, CM State: ${cmState}`);
                return;
            }
        } else {
            console.warn(`SimpleAI (${this.#player.name}): Contexto de ação desconhecido: ${actionContext}`);
            return;
        }

        console.log(`SimpleAI (${this.#player.name}): Contexto '${actionContext}', Fase '${currentPhase}', Mana: ${this.#player.mana}, CM: ${cmState}, Game: ${gameState}`);
        this.#game.emitEvent('gameLog', { message: `${this.#player.name} está pensando... (${currentPhase})` });
        
        // Usar o _delay interno da IA agora
        await this._delay(700 + Math.random() * 600);

        // Re-checa condições após o delay, pois o estado do jogo pode ter mudado por uma ação humana rápida.
        if (actionContext === 'active_turn') {
            if (this.#game.getCurrentPlayer()?.id !== this.#player.id || (this.#game.state !== 'playing' && !(this.#game.state === 'discarding' && this.#game.getPendingDiscardInfo()?.playerId === this.#player.id))) {
                console.log(`SimpleAI (${this.#player.name}): [active_turn] Estado mudou durante o delay. Ação cancelada para fase ${currentPhase}.`);
                return;
            }
        } else if (actionContext === 'defense_response') {
            if (this.#game.getCurrentPlayer()?.id === this.#player.id || this.#game.getCurrentPhase() !== 'attack' || this.#game.getCombatManager().state !== 'declare_blockers') {
                console.log(`SimpleAI (${this.#player.name}): [defense_response] Estado de combate mudou durante o delay. Ação cancelada.`);
                return;
            }
        }


        // --- Lógica de Descarte por Limite da Mão (Prioritária) ---
        if (this.#game.state === 'discarding' && this.#game.getPendingDiscardInfo()?.playerId === this.#player.id) {
            console.log(`SimpleAI (${this.#player.name}): Precisa descartar ${this.#game.getPendingDiscardInfo().count} carta(s) por limite da mão.`);
            let discardedInLoop = 0;
            while (this.#game.getPendingDiscardInfo() && this.#game.getPendingDiscardInfo().count > 0 && discardedInLoop < 10) {
                if (this.#player.hand.getSize() === 0) {
                    console.warn(`SimpleAI (${this.#player.name}): Precisa descartar, mas a mão está vazia! Algo errado com Game.requestPlayerDiscard ou Player.checkHandSize.`);
                    this.#game.resolvePlayerDiscard(this.#player.id, null); // Tenta resolver o estado de descarte, mesmo sem carta
                    break;
                }
                const cardToDiscard = this._chooseCardToDiscardFromHandEOT();
                if (cardToDiscard) {
                    console.log(`SimpleAI (${this.#player.name}): Descartando ${cardToDiscard.name} (limite da mão).`);
                    this.#game.resolvePlayerDiscard(this.#player.id, cardToDiscard.uniqueId);
                    await this._delay(400 + Math.random() * 200);
                } else {
                    console.error(`SimpleAI (${this.#player.name}): Não conseguiu escolher carta para descarte obrigatório, embora a mão não esteja vazia.`);
                    // Para evitar loop infinito, tentamos forçar a resolução do estado de descarte
                    this.#game.resolvePlayerDiscard(this.#player.id, null); 
                    break;
                }
                discardedInLoop++;
                // O loop continua se pendingDiscard.count > 0 após resolvePlayerDiscard
            }
            // Após o loop de descarte, a IA não toma mais ações nesta chamada de performAction.
            // Se o estado do jogo voltou para 'playing', o _onPhaseEnter do Game.js (se aplicável)
            // ou o próximo turno irá acionar a IA novamente.
            return;
        }

        // Se não estava descartando, continua com ações normais da fase
        if (this.#game.state !== 'playing') {
            console.log(`SimpleAI (${this.#player.name}): Estado não é 'playing' (${this.#game.state}) após checagem de descarte. Nenhuma ação.`);
            return;
        }

        // Ações baseadas no contexto e fase
        if (actionContext === 'active_turn') {
            switch (currentPhase) {
                case 'mana':
                    this._performManaPhaseActions();
                    await this._delay(300); // Pequeno delay antes de passar
                    this.#game.passPhase();
                    break;
                case 'draw':
                    console.log(`SimpleAI (${this.#player.name}): [active_turn] Fase Draw. Passando.`);
                    await this._delay(300);
                    this.#game.passPhase();
                    break;
                case 'main':
                    await this._performMainPhaseActions(); // passPhase é chamado dentro dele
                    break;
                case 'attack':
                    if (cmState === 'none') { // IA é a atacante, início da fase de ataque
                        this._performAttackDeclaration();
                        // NÃO PASSA A FASE, espera o humano responder/bloquear
                    } else if (cmState === 'none') { // Combate resolvido ou não houve ataque da IA
                        console.log(`SimpleAI (${this.#player.name}): [active_turn] Fase Ataque, combate já resolvido ou sem ataque. Passando para End.`);
                        await this._delay(300);
                        this.#game.passPhase();
                    } else {
                        // Se cmState é 'declare_blockers', a IA atacou e está esperando o resultado do combate.
                        // Ela não deve agir aqui até que o combate seja resolvido e a fase mude para 'end' (ou 'attack' novamente se o combate foi rápido).
                        console.log(`SimpleAI (${this.#player.name}): [active_turn] Fase Ataque, estado CM: ${cmState}. Aguardando resolução do combate ou ação do oponente.`);
                    }
                    break;
                case 'end':
                    console.log(`SimpleAI (${this.#player.name}): [active_turn] Fase Final. Encerrando turno...`);
                    // endTurnCleanup é chamado pelo Game em _onPhaseEnter.
                    await this._delay(500);
                    this.#game.endTurn();
                    break;
                default:
                    console.warn(`SimpleAI (${this.#player.name}): [active_turn] Fase desconhecida '${currentPhase}'. Encerrando turno.`);
                    this.#game.endTurn();
                    break;
            }
        } else if (actionContext === 'defense_response') {
            if (currentPhase === 'attack' && cmState === 'declare_blockers') {
                await this._performBlockerDeclaration(); // Tornar async para o delay
            } else {
                 console.warn(`SimpleAI (${this.#player.name}): Chamada para defense_response em fase/estado inesperado: ${currentPhase}/${cmState}`);
                 // Se a IA foi chamada para defender mas as condições não batem, ela não faz nada. O jogo pode travar.
                 // O ideal é que o Game.js só chame a IA para defender nas condições corretas.
            }
        }
    }

    _performManaPhaseActions() {
        console.log(`SimpleAI (${this.#player.name}): [active_turn] Avaliando descarte por mana.`);
        if (!this.#player.hasDiscardedForMana && this.#player.maxMana < 10 && this.#player.hand.getSize() > 0) {
            let cardToDiscardInstance = this._chooseCardForManaDiscard();
            if (cardToDiscardInstance) {
                console.log(`SimpleAI (${this.#player.name}): Decidiu descartar ${cardToDiscardInstance.name} por +1 Mana Máx.`);
                if (this.#player.discardCardForMana(cardToDiscardInstance.uniqueId, this.#game)) {
                    this.#game.emitEvent('gameLog', { message: `${this.#player.name} descartou ${cardToDiscardInstance.name} por +1 Mana Máx.` });
                } else {
                    console.warn(`SimpleAI (${this.#player.name}): Tentativa de descarte por mana falhou (Player.discardCardForMana retornou false).`);
                }
            } else {
                console.log(`SimpleAI (${this.#player.name}): Decidiu não descartar por mana desta vez.`);
            }
        } else {
             console.log(`SimpleAI (${this.#player.name}): Condições para descarte por mana não atendidas.`);
        }
        // Passar a fase é feito no switch principal de performAction
    }

    _chooseCardForManaDiscard() {
        const potentialMaxManaAfterDiscard = this.#player.maxMana + 1;
        const cardsInHand = this.#player.hand.getCards();
        if (cardsInHand.length === 0) return null;

        // Prioridade 1: Existe alguma carta que eu poderia jogar no próximo turno se tivesse +1 mana?
        const playableWithMoreMana = cardsInHand.filter(card => card.cost === potentialMaxManaAfterDiscard);

        if (playableWithMoreMana.length > 0) {
            // Se sim, tentar descartar uma carta de baixo custo que NÃO seja uma dessas.
            let cheapestCardToDiscard = null;
            let minCost = Infinity;
            for (const card of cardsInHand) {
                if (card.cost !== potentialMaxManaAfterDiscard && card.cost < minCost) {
                    minCost = card.cost;
                    cheapestCardToDiscard = card;
                }
            }
            if (cheapestCardToDiscard) return cheapestCardToDiscard;

            // Se todas as cartas que não são as "desejadas" têm custo maior, ou se só tem as desejadas
            // e há mais de uma carta na mão, descarta a de menor custo geral.
            if (cardsInHand.length > 1) { // Evita descartar a única carta se for a que se quer jogar
                 return cardsInHand.sort((a,b) => a.cost - b.cost)[0];
            }
            return null; // Não descarta se a única carta é a que quer jogar
        }
        // Prioridade 2: Se não há uma carta "alvo" para o próximo turno, mas ainda pode aumentar a mana.
        // Descarta a de menor custo se tiver várias cartas.
        if (cardsInHand.length > 2) { // Ex: só descarta se tiver 3+ cartas
            return cardsInHand.sort((a,b) => a.cost - b.cost)[0];
        }
        return null; // Não descarta
    }

    async _performMainPhaseActions() {
        console.log(`SimpleAI (${this.#player.name}): [active_turn] Fase Principal. Procurando criatura para jogar...`);
        const playableCreatures = this.#player.hand.getCards()
            .filter(card => card.type === 'Creature' && card.canPlay(this.#player, this.#game))
            .sort((a, b) => b.cost - a.cost); // Tenta jogar a mais cara primeiro

        if (playableCreatures.length > 0) {
            const cardToPlay = playableCreatures[0];
            console.log(`SimpleAI (${this.#player.name}): Tentando jogar ${cardToPlay.name}. Mana: ${this.#player.mana}, Custo: ${cardToPlay.cost}`);
            if (this.#player.playCard(cardToPlay.uniqueId, null, this.#game)) {
                this.#game.emitEvent('gameLog', { message: `${this.#player.name} jogou ${cardToPlay.name}.` });
                await this._delay(600 + Math.random() * 400);
            } else {
                console.log(`SimpleAI (${this.#player.name}): Falhou ao jogar ${cardToPlay.name}.`);
            }
        } else {
            console.log(`SimpleAI (${this.#player.name}): Nenhuma criatura jogável ou mana insuficiente.`);
        }
        console.log(`SimpleAI (${this.#player.name}): Passando da Fase Principal.`);
        await this._delay(300);
        this.#game.passPhase();
    }

    _performAttackDeclaration() {
        console.log(`SimpleAI (${this.#player.name}): [active_turn] Fase de Ataque (Atacante). Declarando...`);
        const attackers = [];
        this.#player.battlefield.getCreatures().forEach(creature => {
            if (creature.canAttack()) {
                attackers.push(creature.uniqueId);
            }
        });

        if (attackers.length > 0) {
            this.#game.confirmAttackDeclaration(this.#player.id, attackers);
            // Log é emitido por Game.confirmAttackDeclaration
        } else {
            console.log(`SimpleAI (${this.#player.name}): Nenhuma criatura para atacar. Passando fase de ataque.`);
            this.#game.passPhase();
        }
    }

    async _performBlockerDeclaration() {
        console.log(`SimpleAI (${this.#player.name}): [defense_response] Fase de Ataque (Defensor). Avaliando bloqueios...`);
        const combatManager = this.#game.getCombatManager();
        const attackingCreatures = combatManager.getAttackers();
        const assignments = {};

        if (!attackingCreatures || attackingCreatures.length === 0) {
            console.log(`SimpleAI (${this.#player.name}): Nenhum atacante declarado contra mim (estranho, mas ok).`);
            this.#game.confirmBlockDeclaration(this.#player.id, assignments);
            return;
        }

        let availableBlockers = this.#player.battlefield.getCreatures().filter(c => c.canBlock() && !c.isTapped);
        const sortedAttackers = [...attackingCreatures].sort((a, b) => b.attack - a.attack);

        for (const attacker of sortedAttackers) {
            if (!attacker || attacker.currentToughness <= 0) continue;
            let bestBlockerForThisAttacker = null;
            let bestBlockOutcome = 'unblocked';

            for (const blocker of availableBlockers) {
                if (!blocker || blocker.currentToughness <= 0) continue;
                const canBlockerDestroyAttacker = blocker.attack >= attacker.currentToughness;
                const doesBlockerSurvive = blocker.currentToughness > attacker.attack;

                if (canBlockerDestroyAttacker && doesBlockerSurvive) {
                    if (bestBlockOutcome !== 'destroys_and_survives' || (blocker.cost < (bestBlockerForThisAttacker?.cost ?? Infinity))) {
                        bestBlockerForThisAttacker = blocker;
                        bestBlockOutcome = 'destroys_and_survives';
                    }
                } else if (canBlockerDestroyAttacker && !doesBlockerSurvive) {
                    if (bestBlockOutcome !== 'destroys_and_survives' && (bestBlockOutcome !== 'trades' || blocker.cost < (bestBlockerForThisAttacker?.cost ?? Infinity))) {
                        bestBlockerForThisAttacker = blocker;
                        bestBlockOutcome = 'trades';
                    }
                } else if (!canBlockerDestroyAttacker && doesBlockerSurvive) {
                    if (bestBlockOutcome === 'unblocked' && attacker.attack >= Math.max(1, this.#player.life / 4)) { // Tenta bloquear se o dano for significativo
                        bestBlockerForThisAttacker = blocker;
                        bestBlockOutcome = 'survives_but_does_not_destroy';
                    }
                }
            }

            if (bestBlockerForThisAttacker) {
                console.log(`SimpleAI (${this.#player.name}): Decide bloquear ${attacker.name} com ${bestBlockerForThisAttacker.name}. Outcome: ${bestBlockOutcome}`);
                assignments[attacker.uniqueId] = [bestBlockerForThisAttacker.uniqueId];
                availableBlockers = availableBlockers.filter(b => b.uniqueId !== bestBlockerForThisAttacker.uniqueId);
            } else {
                console.log(`SimpleAI (${this.#player.name}): Decide NÃO bloquear ${attacker.name}.`);
            }
        }
        await this._delay(300 + Math.random() * 300); // Pequeno delay antes de confirmar
        this.#game.confirmBlockDeclaration(this.#player.id, assignments);
    }

    _chooseCardToDiscardFromHandEOT() {
        const hand = this.#player.hand.getCards();
        if (hand.length === 0) return null;
        // IA Simples: descarta a de maior custo primeiro, ou a primeira se os custos forem iguais.
        return hand.sort((a, b) => b.cost - a.cost)[0];
    }

    _delay(ms) {
        return new Promise(resolve => {
            // Se o jogo não estiver mais no turno da IA ou o estado mudou E NÃO ESTIVER DEFENDENDO
            // (durante a defesa, o turno não é dela, mas ela precisa completar a ação)
            const isMyTurn = this.#game.getCurrentPlayer()?.id === this.#player.id;
            const isDefending = this.#game.getCurrentPhase() === 'attack' && this.#game.getCombatManager().state === 'declare_blockers' && !isMyTurn;

            if (!isMyTurn && !isDefending) {
                console.log(`SimpleAI (${this.#player.name}): Delay interrompido, não é mais minha vez de agir (nem defendendo).`);
                resolve();
            } else {
                this.cancelPendingActions(); // Cancela timeout anterior se houver
                this.#aiActionTimeout = setTimeout(resolve, ms);
            }
        });
    }
}