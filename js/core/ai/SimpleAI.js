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

    /**
     * Cancela qualquer ação de IA pendente (ex: se o turno mudar abruptamente).
     */
    cancelPendingActions() {
        if (this.#aiActionTimeout) {
            clearTimeout(this.#aiActionTimeout);
            this.#aiActionTimeout = null;
            // console.log(`SimpleAI (${this.#player.name}): Ações pendentes canceladas.`); // Pode ser muito verboso
        }
    }

    /**
     * Executa a lógica de ação da IA.
     * @param {string} actionContext - 'active_turn' ou 'defense_response'
     */
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

        // Re-checa condições após o delay
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
                case 'mana': // IA não descarta mais para mana aqui com a Opção B
                    console.log(`SimpleAI (${this.#player.name}): [active_turn] Fase Mana. Passando.`);
                    await this._delay(300);
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
                    if (cmState === 'none') {
                        this._performAttackDeclaration();
                    } else if (cmState === 'none') { // Combate resolvido ou não houve ataque da IA
                        console.log(`SimpleAI (${this.#player.name}): [active_turn] Fase Ataque, combate já resolvido ou sem ataque. Passando para End.`);
                        await this._delay(300);
                        this.#game.passPhase();
                    } else {
                        console.log(`SimpleAI (${this.#player.name}): [active_turn] Fase Ataque, estado CM: ${cmState}. Aguardando resolução do combate ou ação do oponente.`);
                    }
                    break;
                case 'end':
                    console.log(`SimpleAI (${this.#player.name}): [active_turn] Fase Final. Encerrando turno...`);
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
                await this._performBlockerDeclaration();
            } else {
                 console.warn(`SimpleAI (${this.#player.name}): Chamada para defense_response em fase/estado inesperado: ${currentPhase}/${cmState}`);
            }
        }
    }

    /**
     * Lógica para a IA realizar ações na Fase Principal.
     * Inclui tentativa de descarte por mana e tentativa de jogar uma criatura.
     */
    async _performMainPhaseActions() {
        console.log(`SimpleAI (${this.#player.name}): [active_turn] Fase Principal. Mana: ${this.#player.mana}, MaxMana: ${this.#player.maxMana}`);

        // --- 1. TENTATIVA DE DESCARTAR POR MANA (Opção B) ---
        if (!this.#player.hasDiscardedForMana && this.#player.maxMana < 10 && this.#player.hand.getSize() > 0) {
            let cardToDiscardInstance = this._chooseCardForManaDiscard();
            if (cardToDiscardInstance) {
                console.log(`SimpleAI (${this.#player.name}): Decidiu descartar ${cardToDiscardInstance.name} por +1 Mana Máx. (na Fase Principal).`);
                // Importante: Player.discardCardForMana verifica se é a fase principal E se é o turno do jogador
                if (this.#player.discardCardForMana(cardToDiscardInstance.uniqueId, this.#game)) {
                    this.#game.emitEvent('gameLog', { message: `${this.#player.name} descartou ${cardToDiscardInstance.name} por +1 Mana Máx.` });
                    // Após o descarte, a mana atual NÃO é recarregada imediatamente.
                    // A mana máxima aumenta, e a mana atual será recarregada no próximo Player.prepareForTurn().
                    console.log(`SimpleAI (${this.#player.name}): Mana Máx agora: ${this.#player.maxMana}. Mana atual: ${this.#player.mana}.`);
                    await this._delay(400 + Math.random() * 200); // Pequeno delay após ação de descarte
                } else {
                    console.warn(`SimpleAI (${this.#player.name}): Tentativa de descarte por mana falhou (Player.discardCardForMana retornou false).`);
                }
            } else {
                 console.log(`SimpleAI (${this.#player.name}): Decidiu NÃO descartar por mana nesta fase principal.`);
            }
        } else {
             console.log(`SimpleAI (${this.#player.name}): Condições para descarte por mana na Fase Principal não atendidas (Já descartou: ${this.#player.hasDiscardedForMana}, MaxMana: ${this.#player.maxMana}, Mão: ${this.#player.hand.getSize()}).`);
        }

        // --- 2. TENTATIVA DE JOGAR CRIATURA ---
        // Reavalia a mana disponível, pois ela NÃO muda após o descarte por mana (só maxMana muda)
        console.log(`SimpleAI (${this.#player.name}): Procurando criatura para jogar... Mana ATUAL: ${this.#player.mana}`);
        const playableCreatures = this.#player.hand.getCards()
            .filter(card => card.type === 'Creature' && card.canPlay(this.#player, this.#game)) // canPlay verifica mana atual
            .sort((a, b) => b.cost - a.cost); // Tenta jogar a mais cara que pode pagar

        if (playableCreatures.length > 0) {
            const cardToPlay = playableCreatures[0]; // Pega a criatura de maior custo que pode pagar
            console.log(`SimpleAI (${this.#player.name}): Tentando jogar ${cardToPlay.name}. Mana atual: ${this.#player.mana}, Custo: ${cardToPlay.cost}`);
            if (this.#player.playCard(cardToPlay.uniqueId, null, this.#game)) {
                this.#game.emitEvent('gameLog', { message: `${this.#player.name} jogou ${cardToPlay.name}.` });
                console.log(`SimpleAI (${this.#player.name}): Jogou ${cardToPlay.name}. Mana restante: ${this.#player.mana}.`);
                await this._delay(600 + Math.random() * 400); // Delay após jogar criatura
            } else {
                console.log(`SimpleAI (${this.#player.name}): Falhou ao jogar ${cardToPlay.name} (playCard retornou false).`);
            }
        } else {
            console.log(`SimpleAI (${this.#player.name}): Nenhuma criatura jogável com a mana atual (${this.#player.mana}).`);
        }
        
        // --- 3. PASSAR A FASE ---
        console.log(`SimpleAI (${this.#player.name}): Concluindo ações da Fase Principal e passando.`);
        await this._delay(300);
        this.#game.passPhase();
    }


    /**
     * Escolhe qual carta descartar para ganhar mana.
     * A IA tentará manter cartas que pode jogar se ganhar +1 de mana.
     */
    _chooseCardForManaDiscard() {
        const potentialMaxManaAfterDiscard = this.#player.maxMana + 1;
        const cardsInHand = this.#player.hand.getCards();
        if (cardsInHand.length === 0) return null;

        // Filtra cartas que se tornariam jogáveis com +1 mana MÁXIMA
        // (considera que a mana ATUAL será recarregada para a nova MÁXIMA no próximo turno)
        const playableWithMoreMaxMana = cardsInHand.filter(card => card.cost <= potentialMaxManaAfterDiscard);

        if (playableWithMoreMaxMana.length > 0) {
            // Tenta descartar uma carta que NÃO seja uma dessas e seja de baixo custo.
            let cheapestCardToDiscard = null;
            let minCost = Infinity;
            for (const card of cardsInHand) {
                // Verifica se a carta NÃO está na lista das que seriam jogáveis E tem custo menor
                if (!playableWithMoreMaxMana.find(c => c.uniqueId === card.uniqueId) && card.cost < minCost) {
                    minCost = card.cost;
                    cheapestCardToDiscard = card;
                }
            }
            if (cheapestCardToDiscard) return cheapestCardToDiscard;

            // Se todas as cartas que não são as "desejadas" têm custo alto,
            // ou se só tem as "desejadas" e há mais de uma carta na mão,
            // descarta a de menor custo geral (que não seja uma "desejada" se possível).
            if (cardsInHand.length > 1) {
                 // Prioriza descartar uma não desejada
                 const nonTargetCards = cardsInHand.filter(card => !playableWithMoreMaxMana.find(c => c.uniqueId === card.uniqueId));
                 if (nonTargetCards.length > 0) {
                     return nonTargetCards.sort((a,b) => a.cost - b.cost)[0];
                 }
                 // Se só sobraram "desejadas", descarta a mais barata delas (se tiver mais de uma)
                 return playableWithMoreMaxMana.sort((a,b) => a.cost - b.cost)[0];
            }
            // Não descarta se a única carta na mão é uma que se tornaria jogável
            return null;
        }

        // Se não há uma carta "alvo" para o próximo turno, mas ainda pode aumentar a mana.
        // Descarta a de menor custo se tiver várias cartas (ex: mais de 2 para evitar ficar sem opções).
        if (cardsInHand.length > 2) {
            return cardsInHand.sort((a,b) => a.cost - b.cost)[0];
        }
        return null; // Não descarta
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
            console.log(`SimpleAI (${this.#player.name}): Declarando ataque com: ${attackers.join(', ')}`);
            this.#game.confirmAttackDeclaration(this.#player.id, attackers);
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
            console.log(`SimpleAI (${this.#player.name}): Nenhum atacante declarado contra mim. Confirmando 0 bloqueios.`);
            this.#game.confirmBlockDeclaration(this.#player.id, assignments);
            return;
        }

        let availableBlockers = this.#player.battlefield.getCreatures().filter(c => c.canBlock() && !c.isTapped);
        const sortedAttackers = [...attackingCreatures].sort((a, b) => b.attack - a.attack); // Prioriza bloquear os mais fortes

        for (const attacker of sortedAttackers) {
            if (!attacker || attacker.currentToughness <= 0 || availableBlockers.length === 0) continue;

            let bestBlockerForThisAttacker = null;
            // Lógica de decisão de bloqueio (pode ser aprimorada):
            // 1. Bloqueador que destrói o atacante e sobrevive.
            // 2. Bloqueador que troca (ambos morrem).
            // 3. Bloqueador que sobrevive mas não destrói (se o dano do atacante for alto).
            for (const blocker of availableBlockers) {
                if (!blocker || blocker.currentToughness <= 0) continue;

                const canDestroy = blocker.attack >= attacker.currentToughness;
                const survives = blocker.currentToughness > attacker.attack;

                if (canDestroy && survives) { // Melhor caso: destrói e sobrevive
                    bestBlockerForThisAttacker = blocker;
                    break; // Pega o primeiro que satisfaz
                }
                if (canDestroy && !bestBlockerForThisAttacker) { // Segundo melhor: troca
                    bestBlockerForThisAttacker = blocker;
                }
                // Poderia adicionar lógica para "chump block" se o dano do atacante for muito alto
            }

            if (bestBlockerForThisAttacker) {
                console.log(`SimpleAI (${this.#player.name}): Decide bloquear ${attacker.name} com ${bestBlockerForThisAttacker.name}.`);
                assignments[attacker.uniqueId] = [bestBlockerForThisAttacker.uniqueId];
                // Remove o bloqueador da lista de disponíveis para este turno de combate
                availableBlockers = availableBlockers.filter(b => b.uniqueId !== bestBlockerForThisAttacker.uniqueId);
            } else {
                console.log(`SimpleAI (${this.#player.name}): Decide NÃO bloquear ${attacker.name}.`);
            }
        }
        await this._delay(300 + Math.random() * 300);
        this.#game.confirmBlockDeclaration(this.#player.id, assignments);
    }

    _chooseCardToDiscardFromHandEOT() {
        const hand = this.#player.hand.getCards();
        if (hand.length === 0) return null;
        return hand.sort((a, b) => b.cost - a.cost)[0]; // Descarta a de maior custo
    }

    _delay(ms) {
        return new Promise(resolve => {
            const isMyTurn = this.#game.getCurrentPlayer()?.id === this.#player.id;
            const isDefending = this.#game.getCurrentPhase() === 'attack' && 
                                this.#game.getCombatManager().state === 'declare_blockers' && 
                                !isMyTurn;

            if (!isMyTurn && !isDefending) {
                // console.log(`SimpleAI (${this.#player.name}): Delay interrompido, não é mais minha vez de agir (nem defendendo).`);
                resolve();
            } else {
                this.cancelPendingActions();
                this.#aiActionTimeout = setTimeout(resolve, ms);
            }
        });
    }
}