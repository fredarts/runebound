// js/core/ai/SimpleAI.js

/**
 * Representa um jogador controlado por uma Inteligência Artificial simples.
 * Toma decisões básicas de jogo, incluindo descarte por mana na fase principal.
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

    cancelPendingActions() {
        if (this.#aiActionTimeout) {
            clearTimeout(this.#aiActionTimeout);
            this.#aiActionTimeout = null;
        }
    }

    async performAction(actionContext = 'active_turn') {
        this.cancelPendingActions();

        const isMyActualTurn = this.#game.getCurrentPlayer()?.id === this.#player.id;
        const currentPhase = this.#game.getCurrentPhase();
        const cmState = this.#game.getCombatManager().state;
        const gameState = this.#game.state;

        if (actionContext === 'active_turn') {
            if (!isMyActualTurn || (gameState !== 'playing' && !(gameState === 'discarding' && this.#game.getPendingDiscardInfo()?.playerId === this.#player.id))) {
                console.log(`SimpleAI (${this.#player.name}): [active_turn] Ação pulada. Não é meu turno ou estado de jogo inválido (${gameState}). CurrentPlayer: ${this.#game.getCurrentPlayer()?.id}, MyID: ${this.#player.id}`);
                return;
            }
        } else if (actionContext === 'defense_response') {
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
        
        await this._delay(700 + Math.random() * 600);

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

        if (this.#game.state === 'discarding' && this.#game.getPendingDiscardInfo()?.playerId === this.#player.id) {
            console.log(`SimpleAI (${this.#player.name}): Precisa descartar ${this.#game.getPendingDiscardInfo().count} carta(s) por limite da mão.`);
            let discardedInLoop = 0;
            while (this.#game.getPendingDiscardInfo() && this.#game.getPendingDiscardInfo().count > 0 && discardedInLoop < 10) {
                if (this.#player.hand.getSize() === 0) {
                    this.#game.resolvePlayerDiscard(this.#player.id, null);
                    break;
                }
                const cardToDiscard = this._chooseCardToDiscardFromHandEOT();
                if (cardToDiscard) {
                    console.log(`SimpleAI (${this.#player.name}): Descartando ${cardToDiscard.name} (limite da mão).`);
                    this.#game.resolvePlayerDiscard(this.#player.id, cardToDiscard.uniqueId);
                    await this._delay(400 + Math.random() * 200);
                } else {
                    this.#game.resolvePlayerDiscard(this.#player.id, null);
                    break;
                }
                discardedInLoop++;
            }
            return;
        }

        if (this.#game.state !== 'playing') {
            console.log(`SimpleAI (${this.#player.name}): Estado não é 'playing' (${this.#game.state}) após checagem de descarte. Nenhuma ação.`);
            return;
        }

        if (actionContext === 'active_turn') {
            switch (currentPhase) {
                case 'mana':
                    console.log(`SimpleAI (${this.#player.name}): [active_turn] Fase Mana. Passando.`);
                    await this._delay(300);
                    if (this.#game.getCurrentPlayer()?.id === this.#player.id && this.#game.getCurrentPhase() === 'mana') this.#game.passPhase();
                    break;
                case 'draw':
                    console.log(`SimpleAI (${this.#player.name}): [active_turn] Fase Draw. Passando.`);
                    await this._delay(300);
                    if (this.#game.getCurrentPlayer()?.id === this.#player.id && this.#game.getCurrentPhase() === 'draw') this.#game.passPhase();
                    break;
                case 'main':
                    await this._performMainPhaseActions();
                    break;
                case 'attack':
                    if (cmState === 'none') { // Se a IA ainda não declarou atacantes
                        this._performAttackDeclaration();
                    } else if (cmState === 'resolving' || (cmState === 'none' && this.#game.getCombatManager().getAttackers().length > 0) ) {
                        // Se o combate da IA já foi resolvido (CM resetou para 'none' mas houve ataque) OU está resolvendo
                        console.log(`SimpleAI (${this.#player.name}): [active_turn] Fase Ataque, combate da IA resolvido ou em resolução. Passando para End.`);
                        await this._delay(300);
                         if (this.#game.getCurrentPlayer()?.id === this.#player.id && this.#game.getCurrentPhase() === 'attack') this.#game.passPhase();
                    } else {
                        console.log(`SimpleAI (${this.#player.name}): [active_turn] Fase Ataque, estado CM: ${cmState}. Aguardando resolução do combate ou ação do oponente.`);
                        // IA não deve ficar presa aqui se o oponente for humano e estiver demorando
                        // Uma verificação adicional de timeout pode ser necessária no Game.js ou aqui
                    }
                    break;
                case 'end':
                    console.log(`SimpleAI (${this.#player.name}): [active_turn] Fase Final. Encerrando turno...`);
                    await this._delay(500);
                    if (this.#game.getCurrentPlayer()?.id === this.#player.id && this.#game.getCurrentPhase() === 'end') this.#game.endTurn();
                    break;
                default:
                    console.warn(`SimpleAI (${this.#player.name}): [active_turn] Fase desconhecida '${currentPhase}'. Encerrando turno.`);
                    if (this.#game.getCurrentPlayer()?.id === this.#player.id) this.#game.endTurn();
                    break;
            }
        } else if (actionContext === 'defense_response') {
            if (currentPhase === 'attack' && cmState === 'declare_blockers') {
                await this._performBlockerDeclaration();
            } else {
                 console.warn(`SimpleAI (${this.#player.name}): Chamada para defense_response em fase/estado inesperado: ${currentPhase}/${cmState}`);
            }
        }
    }

    async _performMainPhaseActions() {
        console.log(`SimpleAI (${this.#player.name}): [active_turn] Fase Principal. Mana: ${this.#player.mana}, MaxMana: ${this.#player.maxMana}`);

        if (!this.#player.hasDiscardedForMana && this.#player.maxMana < 10 && this.#player.hand.getSize() > 0) {
            let cardToDiscardInstance = this._chooseCardForManaDiscard();
            if (cardToDiscardInstance) {
                console.log(`SimpleAI (${this.#player.name}): Decidiu descartar ${cardToDiscardInstance.name} por +1 Mana Máx. (na Fase Principal).`);
                if (this.#player.discardCardForMana(cardToDiscardInstance.uniqueId, this.#game)) {
                    this.#game.emitEvent('gameLog', { message: `${this.#player.name} descartou ${cardToDiscardInstance.name} por +1 Mana Máx.` });
                    console.log(`SimpleAI (${this.#player.name}): Mana Máx agora: ${this.#player.maxMana}. Mana atual: ${this.#player.mana}.`);
                    await this._delay(400 + Math.random() * 200);
                } else {
                    console.warn(`SimpleAI (${this.#player.name}): Tentativa de descarte por mana falhou (Player.discardCardForMana retornou false).`);
                }
            } else {
                 console.log(`SimpleAI (${this.#player.name}): Decidiu NÃO descartar por mana nesta fase principal.`);
            }
        } else {
             console.log(`SimpleAI (${this.#player.name}): Condições para descarte por mana na Fase Principal não atendidas (Já descartou: ${this.#player.hasDiscardedForMana}, MaxMana: ${this.#player.maxMana}, Mão: ${this.#player.hand.getSize()}).`);
        }
        
        // Re-checa se ainda é a fase principal e turno da IA antes de jogar criaturas
        if (this.#game.getCurrentPlayer()?.id !== this.#player.id || this.#game.getCurrentPhase() !== 'main') {
            console.log(`SimpleAI (${this.#player.name}): Fase mudou ou não é mais meu turno antes de jogar criatura. Saindo da fase principal.`);
            return;
        }

        console.log(`SimpleAI (${this.#player.name}): Procurando criatura para jogar... Mana ATUAL: ${this.#player.mana}`);
        const playableCreatures = this.#player.hand.getCards()
            .filter(card => card.type === 'Creature' && card.canPlay(this.#player, this.#game))
            .sort((a, b) => b.cost - a.cost);

        if (playableCreatures.length > 0) {
            const cardToPlay = playableCreatures[0];
            console.log(`SimpleAI (${this.#player.name}): Tentando jogar ${cardToPlay.name}. Mana atual: ${this.#player.mana}, Custo: ${cardToPlay.cost}`);
            if (this.#player.playCard(cardToPlay.uniqueId, null, this.#game)) {
                this.#game.emitEvent('gameLog', { message: `${this.#player.name} jogou ${cardToPlay.name}.` });
                console.log(`SimpleAI (${this.#player.name}): Jogou ${cardToPlay.name}. Mana restante: ${this.#player.mana}.`);
                await this._delay(600 + Math.random() * 400);
            } else {
                console.log(`SimpleAI (${this.#player.name}): Falhou ao jogar ${cardToPlay.name} (playCard retornou false).`);
            }
        } else {
            console.log(`SimpleAI (${this.#player.name}): Nenhuma criatura jogável com a mana atual (${this.#player.mana}).`);
        }
        
        // Re-checa novamente antes de passar a fase
        if (this.#game.getCurrentPlayer()?.id === this.#player.id && this.#game.getCurrentPhase() === 'main') {
            console.log(`SimpleAI (${this.#player.name}): Concluindo ações da Fase Principal e passando.`);
            await this._delay(300);
            this.#game.passPhase();
        } else {
            console.log(`SimpleAI (${this.#player.name}): Não é mais meu turno/fase principal após tentativas de ação. Não passando a fase.`);
        }
    }


    _chooseCardForManaDiscard() {
        const potentialMaxManaAfterDiscard = this.#player.maxMana + 1;
        const cardsInHand = this.#player.hand.getCards();
        if (cardsInHand.length === 0) return null;

        const playableWithMoreMaxMana = cardsInHand.filter(card => card.cost <= potentialMaxManaAfterDiscard);

        if (playableWithMoreMaxMana.length > 0) {
            let cheapestCardToDiscard = null;
            let minCost = Infinity;
            for (const card of cardsInHand) {
                if (!playableWithMoreMaxMana.find(c => c.uniqueId === card.uniqueId) && card.cost < minCost) {
                    minCost = card.cost;
                    cheapestCardToDiscard = card;
                }
            }
            if (cheapestCardToDiscard) return cheapestCardToDiscard;
            if (cardsInHand.length > 1) {
                 const nonTargetCards = cardsInHand.filter(card => !playableWithMoreMaxMana.find(c => c.uniqueId === card.uniqueId));
                 if (nonTargetCards.length > 0) {
                     return nonTargetCards.sort((a,b) => a.cost - b.cost)[0];
                 }
                 return playableWithMoreMaxMana.sort((a,b) => a.cost - b.cost)[0];
            }
            return null;
        }

        if (cardsInHand.length > 2) {
            return cardsInHand.sort((a,b) => a.cost - b.cost)[0];
        }
        return null;
    }


    _performAttackDeclaration() {
        console.log(`SimpleAI (${this.#player.name}): [active_turn] Fase de Ataque (Atacante). Declarando...`);
        // Adiciona verificação para garantir que ainda é o turno da IA e a fase de ataque
        if (this.#game.getCurrentPlayer()?.id !== this.#player.id || this.#game.getCurrentPhase() !== 'attack') {
            console.log(`SimpleAI (${this.#player.name}): Não é mais meu turno ou fase de ataque. Abortando declaração de ataque.`);
            return;
        }

        const attackers = [];
        this.#player.battlefield.getCreatures().forEach(creature => {
            if (creature.canAttack()) {
                attackers.push(creature.uniqueId);
            }
        });

        if (attackers.length > 0) {
            console.log(`SimpleAI (${this.#player.name}): Declarando ataque com: ${attackers.join(', ')}`);
            this.#game.confirmAttackDeclaration(this.#player.id, attackers);
        } else {
            console.log(`SimpleAI (${this.#player.name}): Nenhuma criatura para atacar. Passando fase de ataque.`);
            // Garante que a IA só passa a fase se ainda for sua vez e na fase de ataque
             if (this.#game.getCurrentPlayer()?.id === this.#player.id && this.#game.getCurrentPhase() === 'attack') {
                this.#game.passPhase();
            }
        }
    }

    async _performBlockerDeclaration() {
        console.log(`SimpleAI (${this.#player.name}): [defense_response] Fase de Ataque (Defensor). Avaliando bloqueios...`);
        const combatManager = this.#game.getCombatManager();
        const attackingCreatures = combatManager.getAttackers(); // Já retorna um array de CreatureCard
        const assignments = {}; // Objeto para enviar para confirmBlockDeclaration

        // Adiciona verificação para garantir que ainda é a fase de ataque e o estado de declarar bloqueadores
        if (this.#game.getCurrentPhase() !== 'attack' || combatManager.state !== 'declare_blockers') {
            console.log(`SimpleAI (${this.#player.name}): Fase/Estado mudou. Abortando declaração de bloqueadores.`);
            return;
        }

        // Se não há atacantes, ou o jogador humano passou a fase, a IA não precisa fazer nada aqui,
        // pois o CombatManager já deve ter resolvido, ou o estado mudado.
        // Esta função é chamada pelo Game.js quando é a vez da IA responder.
        if (!attackingCreatures || attackingCreatures.length === 0) {
            console.log(`SimpleAI (${this.#player.name}): Nenhum atacante válido para bloquear ou estado mudou.`);
            // Se não há atacantes, a IA apenas confirma 0 bloqueios
            this.#game.confirmBlockDeclaration(this.#player.id, {});
            return;
        }

        let availableBlockers = this.#player.battlefield.getCreatures().filter(c => c.canBlock());

        // >>> INÍCIO DA CORREÇÃO/MELHORIA <<<
        if (availableBlockers.length === 0) {
            console.log(`SimpleAI (${this.#player.name}): Nenhum bloqueador disponível. Confirmando 0 bloqueios.`);
            this.#game.confirmBlockDeclaration(this.#player.id, {});
            return;
        }
        // >>> FIM DA CORREÇÃO/MELHORIA <<<

        const sortedAttackers = [...attackingCreatures].sort((a, b) => b.attack - a.attack);

        for (const attacker of sortedAttackers) {
            if (!attacker || attacker.currentToughness <= 0 || availableBlockers.length === 0) continue;

            let bestBlockerForThisAttacker = null;
            for (const blocker of availableBlockers) {
                if (!blocker || blocker.currentToughness <= 0) continue;

                const canDestroy = blocker.attack >= attacker.currentToughness;
                const survives = blocker.currentToughness > attacker.attack;

                if (canDestroy && survives) {
                    bestBlockerForThisAttacker = blocker;
                    break;
                }
                if (canDestroy && !bestBlockerForThisAttacker) {
                    bestBlockerForThisAttacker = blocker;
                }
            }

            if (bestBlockerForThisAttacker) {
                console.log(`SimpleAI (${this.#player.name}): Decide bloquear ${attacker.name} com ${bestBlockerForThisAttacker.name}.`);
                assignments[attacker.uniqueId] = [bestBlockerForThisAttacker.uniqueId];
                availableBlockers = availableBlockers.filter(b => b.uniqueId !== bestBlockerForThisAttacker.uniqueId);
            } else {
                console.log(`SimpleAI (${this.#player.name}): Decide NÃO bloquear ${attacker.name}.`);
            }
        }

        await this._delay(300 + Math.random() * 300);
        // Re-verifica o estado antes de confirmar, pois o jogador humano pode ter passado a fase
        if (this.#game.getCurrentPhase() === 'attack' && this.#game.getCombatManager().state === 'declare_blockers') {
            this.#game.confirmBlockDeclaration(this.#player.id, assignments);
        } else {
            console.log(`SimpleAI (${this.#player.name}): Estado mudou antes de confirmar bloqueadores. Bloqueio cancelado.`);
        }
    }

    _chooseCardToDiscardFromHandEOT() {
        const hand = this.#player.hand.getCards();
        if (hand.length === 0) return null;
        return hand.sort((a, b) => b.cost - a.cost)[0];
    }

    _delay(ms) {
        return new Promise(resolve => {
            this.cancelPendingActions(); // Cancela qualquer timeout anterior da IA
            this.#aiActionTimeout = setTimeout(resolve, ms);
        });
    }
}