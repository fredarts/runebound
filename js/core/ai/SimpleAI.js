// js/core/ai/SimpleAI.js

/**
 * Representa um jogador controlado por uma Inteligência Artificial simples.
 * Toma decisões básicas de jogo.
 */
export default class SimpleAI {
    #player; // A instância do Player que esta IA controla
    #game;   // A instância do Game

    constructor(playerInstance, gameInstance) {
        if (!playerInstance || !gameInstance) {
            throw new Error("SimpleAI requires valid player and game instances.");
        }
        this.#player = playerInstance;
        this.#game = gameInstance;
        console.log(`SimpleAI: Controlador inicializado para jogador ${this.#player.name}`);
    }

    /**
     * Executa a lógica de ação da IA para a fase atual.
     * Este método será chamado pelo Game quando for a vez da IA agir em uma fase.
     */
    async performAction() {
        if (this.#game.getCurrentPlayer()?.id !== this.#player.id ||
            (this.#game.state !== 'playing' && this.#game.state !== 'discarding')) {
            console.log(`SimpleAI (${this.#player.name}): Não é meu turno ou estado de jogo inválido (${this.#game.state}). Nenhuma ação.`);
            return;
        }

        const currentPhase = this.#game.getCurrentPhase();
        console.log(`SimpleAI (${this.#player.name}): Tomando ação na fase '${currentPhase}'. Mana: ${this.#player.mana}`);
        this.#game.emitEvent('gameLog', { message: `${this.#player.name} está pensando... (${currentPhase})` });

        // Pequeno delay para simular "pensamento" e permitir que a UI respire
        await this._delay(800 + Math.random() * 700);

        // Checagem de estado após o delay (o jogo pode ter mudado)
        if (this.#game.getCurrentPlayer()?.id !== this.#player.id || (this.#game.state !== 'playing' && this.#game.state !== 'discarding')) {
             console.log(`SimpleAI (${this.#player.name}): Estado mudou durante o 'pensamento'. Ação cancelada para fase ${currentPhase}.`);
             return;
        }

        // --- Lógica de Descarte por Limite da Mão (Prioritária) ---
        if (this.#game.state === 'discarding' && this.#game.getPendingDiscardInfo()?.playerId === this.#player.id) {
            const pendingDiscard = this.#game.getPendingDiscardInfo();
            console.log(`SimpleAI (${this.#player.name}): Precisa descartar ${pendingDiscard.count} carta(s).`);
            let discardedCount = 0;
            while (this.#game.getPendingDiscardInfo() && this.#game.getPendingDiscardInfo().count > 0 && discardedCount < 10) { // Safety break
                if (this.#player.hand.getSize() === 0) {
                    console.warn(`SimpleAI (${this.#player.name}): Precisa descartar, mas a mão está vazia!`);
                    // Game.resolvePlayerDiscard deveria lidar com o reset do pendingDiscard se a mão esvaziar.
                    // Se não, precisamos de uma forma de Game saber que não pode mais descartar.
                    break;
                }
                const cardToDiscard = this._chooseCardToDiscardFromHand(); // IA decide qual descartar
                if (cardToDiscard) {
                    console.log(`SimpleAI (${this.#player.name}): Descartando ${cardToDiscard.name} (limite da mão).`);
                    this.#game.resolvePlayerDiscard(this.#player.id, cardToDiscard.uniqueId);
                    await this._delay(500); // Pequeno delay entre descartes
                } else {
                    console.error(`SimpleAI (${this.#player.name}): Erro ao escolher carta para descarte obrigatório.`);
                    break; // Sai do loop para evitar problemas
                }
                discardedCount++;
            }
            // Ação de descarte foi tratada. Retorna para que o fluxo do jogo continue.
            // O Game.resolvePlayerDiscard, se completar o descarte, mudará o estado para 'playing'
            // e o Game._onPhaseEnter poderá chamar performAction novamente se for o caso.
            return;
        }

        // Se não está descartando, executa ações normais da fase
        if (this.#game.state !== 'playing') return;


        switch (currentPhase) {
            case 'mana':
                    // <<< LÓGICA DE DESCARTE POR MANA >>>
                if (!this.#player.hasDiscardedForMana && this.#player.maxMana < 10 && this.#player.hand.getSize() > 0) {
                    // IA só considera descartar se:
                    // 1. Ainda não descartou por mana neste turno.
                    // 2. Sua mana máxima é menor que 10.
                    // 3. Tem cartas na mão para descartar.

                    // Lógica de decisão: A IA descarta se tiver uma carta na mão
                    // que ela NÃO poderia jogar com a mana máxima atual, mas PODERIA
                    // jogar se aumentasse a mana máxima em 1.
                    let shouldDiscard = false;
                    let cardToDiscardInstance = null; // A carta que a IA efetivamente descartará

                    const potentialMaxManaAfterDiscard = this.#player.maxMana + 1;
                    const cardsInHand = this.#player.hand.getCards();

                    // Existe alguma carta cara que eu poderia jogar se tivesse +1 maxMana?
                    const canPlayExpensiveCardNextTurn = cardsInHand.some(card =>
                        card.cost === potentialMaxManaAfterDiscard // Exatamente o custo da próxima mana máxima
                    );

                    if (canPlayExpensiveCardNextTurn) {
                        // Sim, vale a pena. Agora, qual carta descartar?
                        // Estratégia simples: descartar a de menor custo que não seja a carta cara.
                        // Ou, se só tiver cartas caras, descarta a de menor custo entre elas se não for a ÚNICA carta.
                        let bestCardToDiscard = null;
                        let lowestCostFound = Infinity;

                        for (const card of cardsInHand) {
                            // Não descarta a carta que ela quer jogar no próximo turno se for a única opção
                            if (card.cost === potentialMaxManaAfterDiscard && cardsInHand.length === 1) {
                                continue;
                            }
                            if (card.cost < lowestCostFound) {
                                lowestCostFound = card.cost;
                                bestCardToDiscard = card;
                            }
                        }
                        // Se ainda assim só sobrou a carta cara, e há outras, descarta a segunda mais barata.
                        if (bestCardToDiscard && bestCardToDiscard.cost === potentialMaxManaAfterDiscard && cardsInHand.length > 1) {
                            let secondLowestCost = Infinity;
                            let actualCardToDiscardFromExpensive = null;
                            for (const card of cardsInHand) {
                                if (card.uniqueId === bestCardToDiscard.uniqueId) continue; // Pula a própria carta cara
                                if (card.cost < secondLowestCost) {
                                    secondLowestCost = card.cost;
                                    actualCardToDiscardFromExpensive = card;
                                }
                            }
                            if (actualCardToDiscardFromExpensive) {
                                cardToDiscardInstance = actualCardToDiscardFromExpensive;
                            } else {
                                    cardToDiscardInstance = bestCardToDiscard; //Fallback: descarta a cara se não há outra opção
                            }
                        } else {
                            cardToDiscardInstance = bestCardToDiscard;
                        }


                        if (cardToDiscardInstance) {
                            shouldDiscard = true;
                        }
                    }

                    if (shouldDiscard && cardToDiscardInstance) {
                        console.log(`SimpleAI (${this.#player.name}): Fase Mana. Decidiu descartar ${cardToDiscardInstance.name} por +1 Mana Máx.`);
                        // O método discardCardForMana em Player.js já deve lidar com a lógica e eventos
                        if (this.#player.discardCardForMana(cardToDiscardInstance.uniqueId, this.#game)) {
                            this.#game.emitEvent('gameLog', { message: `${this.#player.name} descartou ${cardToDiscardInstance.name} por +1 Mana Máx.` });
                            // A flag hasDiscardedForMana é setada dentro de Player.js
                        } else {
                            console.warn(`SimpleAI (${this.#player.name}): Tentativa de descarte falhou (inesperado).`);
                        }
                    } else {
                        console.log(`SimpleAI (${this.#player.name}): Fase Mana. Decidiu não descartar por mana.`);
                    }
                } else {
                    console.log(`SimpleAI (${this.#player.name}): Fase Mana. Condições para descarte não atendidas (já descartou, maxMana=10 ou mão vazia).`);
                }
                // Independentemente de ter descartado ou não, a IA passa a fase de mana.
                this.#game.passPhase();
                break;

            case 'draw':
                console.log(`SimpleAI (${this.#player.name}): Fase Draw. (Compra automática). Passando.`);
                this.#game.passPhase(); // A compra já ocorreu
                break;

            case 'main':
                this._performMainPhaseActions();
                // passPhase é chamado dentro de _performMainPhaseActions
                break;

            case 'attack':
                const cmState = this.#game.getCombatManager().state;
                if (cmState === 'none') { // IA é a atacante
                    this._performAttackDeclaration();
                    // Não passa a fase aqui; espera o humano
                } else if (cmState === 'declare_blockers' && this.#game.getCurrentPlayer()?.id !== this.#player.id) {
                    // IA é a defensora (o current player é o atacante humano)
                    this._performBlockerDeclaration();
                    // Não passa a fase aqui; o confirmBlockDeclaration do Game resolverá o combate
                } else {
                    console.log(`SimpleAI (${this.#player.name}): Fase Ataque em estado CM inesperado (${cmState}) ou não é minha vez de defender. Passando.`);
                    this.#game.passPhase();
                }
                break;

            case 'end':
                console.log(`SimpleAI (${this.#player.name}): Fase Final. Encerrando turno...`);
                this.#game.endTurn();
                break;

            default:
                console.warn(`SimpleAI (${this.#player.name}): Fase desconhecida '${currentPhase}'. Tentando encerrar o turno.`);
                this.#game.endTurn();
                break;
        }
    }

    /** Lógica da IA para a Fase Principal */
    async _performMainPhaseActions() {
        console.log(`SimpleAI (${this.#player.name}): Fase Principal. Procurando criatura para jogar...`);
        const playableCreatures = this.#player.hand.getCards()
            .filter(card => card.type === 'Creature' && card.canPlay(this.#player, this.#game))
            .sort((a, b) => b.cost - a.cost); // Tenta jogar a mais cara primeiro

        if (playableCreatures.length > 0) {
            const cardToPlay = playableCreatures[0];
            console.log(`SimpleAI (${this.#player.name}): Tentando jogar ${cardToPlay.name}. Mana: ${this.#player.mana}, Custo: ${cardToPlay.cost}`);
            if (this.#player.playCard(cardToPlay.uniqueId, null, this.#game)) {
                this.#game.emitEvent('gameLog', { message: `${this.#player.name} jogou ${cardToPlay.name}.` });
                await this._delay(800);
            } else {
                console.log(`SimpleAI (${this.#player.name}): Falhou ao jogar ${cardToPlay.name}.`);
            }
        } else {
            console.log(`SimpleAI (${this.#player.name}): Nenhuma criatura jogável ou mana insuficiente.`);
        }
        // IA simples: sempre passa a fase principal após tentar jogar uma criatura.
        console.log(`SimpleAI (${this.#player.name}): Passando da Fase Principal.`);
        this.#game.passPhase();
    }

    /** Lógica da IA para Declarar Atacantes */
    _performAttackDeclaration() {
        console.log(`SimpleAI (${this.#player.name}): Fase de Ataque (Atacante). Declarando atacantes...`);
        const attackers = [];
        this.#player.battlefield.getCreatures().forEach(creature => {
            if (creature.canAttack()) {
                attackers.push(creature.uniqueId);
            }
        });

        if (attackers.length > 0) {
            this.#game.confirmAttackDeclaration(this.#player.id, attackers);
            this.#game.emitEvent('gameLog', { message: `${this.#player.name} declarou ${attackers.length} atacante(s). Sua vez de bloquear.` });
        } else {
            console.log(`SimpleAI (${this.#player.name}): Nenhuma criatura para atacar. Passando fase de ataque.`);
            this.#game.passPhase();
        }
    }

    /** Lógica da IA para Declarar Bloqueadores */
    _performBlockerDeclaration() {
            console.log(`SimpleAI (${this.#player.name}): Fase de Ataque (Defensor). Avaliando bloqueios...`);
            const combatManager = this.#game.getCombatManager();
            const attackingCreatures = combatManager.getAttackers(); // Pega os atacantes do CombatManager
            const assignments = {}; // { attackerUniqueId: [blockerUniqueId] }

            if (!attackingCreatures || attackingCreatures.length === 0) {
                console.log(`SimpleAI (${this.#player.name}): Nenhum atacante declarado contra mim. Estranho.`);
                this.#game.confirmBlockDeclaration(this.#player.id, assignments);
                return;
            }

            const availableBlockers = this.#player.battlefield.getCreatures().filter(c => c.canBlock());

            // Lógica de bloqueio MUITO SIMPLES:
            // Para cada atacante, se a IA tiver um bloqueador que PODE MATAR o atacante E SOBREVIVER, ela bloqueia.
            for (const attacker of attackingCreatures) {
                if (!attacker) continue;

                for (const blocker of availableBlockers) {
                    if (!blocker.isTapped && // Garante que o bloqueador não foi usado para bloquear outro atacante (simplificação)
                        blocker.attack >= attacker.currentToughness && // Bloqueador pode matar o atacante?
                        blocker.currentToughness > attacker.attack) {  // Bloqueador sobrevive ao dano do atacante?

                        console.log(`SimpleAI (${this.#player.name}): Decide bloquear ${attacker.name} (${attacker.attack}/${attacker.currentToughness}) com ${blocker.name} (${blocker.attack}/${blocker.currentToughness}).`);
                        assignments[attacker.uniqueId] = [blocker.uniqueId];
                        blocker.tap(); // Simula que o bloqueador está "usado" para esta avaliação (não é o tap real do jogo)
                                       // Uma IA melhor gerenciaria melhor os bloqueadores disponíveis.
                        // Remove este bloqueador da lista de disponíveis para evitar que bloqueie múltiplos atacantes nesta lógica simples
                        const index = availableBlockers.indexOf(blocker);
                        if (index > -1) availableBlockers.splice(index, 1);
                        break; // Este atacante foi bloqueado, vai para o próximo atacante
                    }
                }
            }

            if (Object.keys(assignments).length > 0) {
                this.#game.emitEvent('gameLog', { message: `${this.#player.name} declarou ${Object.keys(assignments).length} bloqueador(es).` });
            } else {
                this.#game.emitEvent('gameLog', { message: `${this.#player.name} não declarou bloqueadores.` });
            }
            this.#game.confirmBlockDeclaration(this.#player.id, assignments);
    }

    /** Escolhe qual carta descartar (se obrigada pelo limite da mão) */
    _chooseCardToDiscardFromHand() {
        // IA Simples: descarta a primeira carta da mão.
        // Uma IA melhor poderia descartar a de menor custo, ou uma duplicata, etc.
        const hand = this.#player.hand.getCards();
        if (hand.length > 0) {
            return hand[0];
        }
        return null;
    }

    /** Helper para criar um delay usando Promises. */
    _delay(ms) {
        return new Promise(resolve => {
            if (this.#game.getCurrentPlayer()?.id !== this.#player.id || (this.#game.state !== 'playing' && this.#game.state !== 'discarding')) {
                console.log(`SimpleAI (${this.#player.name}): Delay interrompido, não é mais meu turno/estado inválido.`);
                resolve(); // Resolve imediatamente se não for mais o turno da IA ou estado mudou
            } else {
                // Armazenar o timeout para poder limpá-lo se necessário
                const timeoutId = setTimeout(resolve, ms);
                // Se a classe SimpleAI tivesse um #currentActionTimeout, poderíamos armazená-lo aqui.
                // Por enquanto, o Game._delay já tem uma lógica de cancelamento implícita
                // se o Game._aiActionTimeout for limpo por uma ação humana.
            }
        });
    }
}