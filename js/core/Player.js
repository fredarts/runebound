// js/core/Player.js
import { Deck } from './Deck.js';
import { Hand } from './Hand.js';
import { Battlefield } from './Battlefield.js'; // Certifique-se que está importado
import { Graveyard } from './Graveyard.js';
import { generateUniqueId } from '../utils.js';
import Card from './Card.js';
import CreatureCard from './CreatureCard.js';
import { RunebindingCard } from './RunebindingCard.js';
import { InstantCard } from './InstantCard.js';

export default class Player {
    #id;
    #name;
    #life = 20;
    #mana = 0;
    #maxMana = 0;
    #deck;
    #hand;
    #battlefield;
    #graveyard;
    #hasDiscardedForMana = false;
    isActivePlayer = false;

    constructor(name, deckCardIds, cardDatabase) {
        this.#id = generateUniqueId('player');
        this.#name = name;

        try {
            this.#deck = new Deck(deckCardIds, cardDatabase, this.#id);
        } catch (e) {
            throw new Error(`Player ${name} deck init failed: ${e.message}`);
        }
        this.#hand = new Hand();
        this.#battlefield = new Battlefield(this.#id, this.#name); // Passa o ID e nome do jogador
        this.#graveyard = new Graveyard();
        this.resetStats();
        console.log(`Player: ${this.#name} (ID: ${this.#id}) created.`);
    }

    // --- Getters ---
    get id() { return this.#id; }
    get name() { return this.#name; }
    get life() { return this.#life; }
    get mana() { return this.#mana; }
    get maxMana() { return this.#maxMana; }
    get deck() { return this.#deck; }
    get hand() { return this.#hand; }
    get battlefield() { return this.#battlefield; }
    get graveyard() { return this.#graveyard; }
    get hasDiscardedForMana() { return this.#hasDiscardedForMana; }


    // --- Methods Called by Game ---
    shuffleDeck() { this.#deck.shuffle(); }

    drawCard() { // Este método é chamado internamente ou pela IA. O Game tem _drawCard para jogadores.
        const cardInstance = this.#deck.draw();
        if (cardInstance) {
            this.#hand.addCard(cardInstance);
            cardInstance.location = 'hand'; // Atualiza a localização da carta
        }
        return cardInstance;
    }

    drawCards(count, game) { // Chamado por efeitos de carta, etc.
        let drawnCards = [];
        for (let i = 0; i < count; i++) {
            // Usa o método _drawCard do Game para garantir que os eventos sejam emitidos
            const cardInstance = game?._drawCard(this);
            if (cardInstance) {
                drawnCards.push(cardInstance);
            } else {
                // Se game._drawCard retorna null, significa que o deck está vazio ou houve um problema.
                // O próprio game._drawCard já deve ter lidado com gameOver se o deck esvaziou.
                break;
            }
        }
        return drawnCards;
    }

    prepareForTurn() {
        this.isActivePlayer = true;
        this.#hasDiscardedForMana = false;
        this.#mana = this.#maxMana; // Refil de mana
        this.#battlefield.untapAll(); // Destapa todas as criaturas no campo
        // Aplicar quaisquer efeitos de "no início do seu turno" das cartas em campo
        this.#battlefield.getAllCards().forEach(card => {
            if (typeof card.onTurnStart === 'function') {
                // Precisa da instância do jogo para onTurnStart interagir com outras partes
                // Se o jogo não for passado como parâmetro aqui, onTurnStart precisará ser adaptado
                // ou essa lógica movida para Game.js onde a instância do jogo está disponível.
                // Por ora, assumimos que 'game' pode não estar disponível aqui.
                // card.onTurnStart(game); // Descomente se 'game' for passado ou acessível
            }
        });
        console.log(`Player ${this.#name}: Prepared for turn. Mana: ${this.#mana}/${this.#maxMana}. Discard flag reset.`);
    }

    endTurnCleanup(game) { // game instance é crucial aqui
        console.error(`DEBUG: Player ${this.#name} está começando endTurnCleanup AGORA!`);
        this.isActivePlayer = false;
        const battlefieldCards = this.#battlefield.getAllCards(); // Pega a lista UMA VEZ para evitar problemas com modificação durante a iteração

        console.log(`PLAYER_ETC_START [${this.#name}]: Iniciando endTurnCleanup. Campo de batalha tem ${battlefieldCards.length} cartas. IDs: ${battlefieldCards.map(c => c.uniqueId).join(', ')}`);

        battlefieldCards.forEach(cardInstance => {
            console.log(`PLAYER_ETC_PROCESSING [${this.#name}]: Processando carta ${cardInstance.name} (${cardInstance.uniqueId}) para endTurnCleanup.`);
            // Chama o método de limpeza de fim de turno da própria carta (se existir)
            // Passa 'true' indicando que é o turno do dono da carta (para summoning sickness)
            // e a instância do jogo para que a carta possa emitir eventos ou interagir.
            if (typeof cardInstance.endTurnCleanup === 'function') {
                cardInstance.endTurnCleanup(true, game);
            }
        });
        console.log(`Player ${this.#name}: End of turn cleanup completed on battlefield cards.`);
        this.checkHandSize(game); // Verifica o limite de cartas na mão
    }

    moveCardBetweenZones(cardUniqueId, fromZoneName, toZoneName) {
        const fromZone = this.#getZoneObject(fromZoneName);
        const toZone = this.#getZoneObject(toZoneName);

        if (!fromZone || !toZone) {
            console.error(`PLAYER_MOVE_FAIL [${this.name}]: Zona(s) inválida(s) em moveCardBetweenZones ('${fromZoneName}' -> '${toZoneName}')`);
            return null;
        }

        const card = fromZone.removeCard(cardUniqueId);
        console.log(`PLAYER_MOVE_ATTEMPT [${this.name}]: Removido ${card?.name || 'N/A'} (${cardUniqueId}) de ${fromZoneName}. Instância da carta:`, card ? {...card.getRenderData()} : null);

        if (card) {
            console.log(`PLAYER_MOVE_ATTEMPT [${this.name}]: Tentando adicionar ${card.name} (${card.uniqueId}) para ${toZoneName}.`);
            const addedToDestination = toZone.addCard(card);

            if (addedToDestination) {
                card.location = toZoneName.toLowerCase(); // Atualiza a localização na carta
                console.log(`PLAYER_MOVE_SUCCESS [${this.name}]: ${card.name} (${card.uniqueId}) adicionado com sucesso para ${toZoneName}. Localização atualizada para ${card.location}.`);
                // Resetar estado de combate da criatura se ela saiu do campo
                if (fromZoneName === 'battlefield' && card instanceof CreatureCard) {
                    // Adicione um método para resetar estados como 'isTapped', 'attacking', etc.
                    // card.resetCombatState?.(); // Exemplo, se tal método existir
                }
                return card;
            } else {
                console.error(`PLAYER_MOVE_FAIL [${this.name}]: Falha ao adicionar ${card.name} (${card.uniqueId}) para ${toZoneName}. Tentando reverter para ${fromZoneName}.`);
                // Tenta readicionar à zona de origem para evitar perda da carta
                if (!fromZone.addCard(card)) { // Adiciona de volta à zona de origem
                    console.error(`PLAYER_MOVE_CRITICAL_FAIL [${this.name}]: FALHA CRÍTICA ao readicionar ${card.name} para ${fromZoneName} após falha de destino.`);
                }
                return null;
            }
        }
        console.warn(`PLAYER_MOVE_WARN [${this.name}]: Carta ${cardUniqueId} não encontrada em ${fromZoneName} para iniciar a movimentação.`);
        return null;
    }

    #getZoneObject(zoneName) {
        switch(zoneName?.toLowerCase()) {
            case 'deck': return this.#deck;
            case 'hand': return this.#hand;
            case 'battlefield': return this.#battlefield;
            case 'graveyard': return this.#graveyard;
            default:
                console.error(`Player ${this.#name}: Zona inválida solicitada: ${zoneName}`);
                return null;
        }
    }

    checkHandSize(game) { // game instance é necessária para requestPlayerDiscard
        if (this.#hand.isOverLimit()) {
            const discardCount = this.#hand.getSize() - this.#hand.getMaxSize();
            console.log(`Player ${this.#name}: Mão acima do limite (${this.#hand.getSize()}/${this.#hand.getMaxSize()}). Solicitando descarte de ${discardCount}.`);
            game.requestPlayerDiscard(this.id, discardCount);
        }
    }

    playCard(cardUniqueId, targetId = null, game) {
        if (!game) {
            console.error("Player.playCard ERRO: Instância do jogo (game) não fornecida!");
            return false;
        }
        const card = this.#hand.getCard(cardUniqueId);
        if (!card) {
            console.warn(`Player ${this.name}: Carta ${cardUniqueId} não encontrada na mão.`);
            return false;
        }

        // A própria carta verifica se pode ser jogada (custo, fase, etc.)
        if (!card.canPlay(this, game)) {
             console.log(`Player ${this.name}: Não pode jogar ${card.name} agora (verificado por card.canPlay).`);
             game.emitEvent('gameLog', { message: `Não pode jogar ${card.name} agora.` });
             return false;
        }

        // Se a carta requer um alvo, mas nenhum foi fornecido (ou é inválido)
        if (card.requiresTarget()) {
            if (!targetId) {
                 console.warn(`Player ${this.name}: Carta ${card.name} requer um alvo, mas nenhum foi fornecido.`);
                 game.emitEvent('gameLog', { message: `A carta ${card.name} requer um alvo.` });
                 return false;
            }
            // A validação do tipo de alvo e existência é feita pelo Game.resolveEffect ou pela própria carta.
            // Aqui, apenas passamos o targetId para a carta.
        }

        // Gasta mana PRIMEIRO
        if (!this.spendMana(card.cost)) {
             // Este caso não deveria acontecer se card.canPlay() foi bem sucedido,
             // mas é uma verificação de segurança.
             console.error(`Player ${this.name}: Falha ao gastar mana para ${card.name} após canPlay ter sido verdadeiro.`);
             return false;
        }
        game.emitEvent('playerStatsChanged', { playerId: this.id, updates: { mana: this.mana }}); // Notifica UI

        // Deixa a CARTA lidar com sua lógica de "play"
        // O método play da carta deve chamar game.moveCardToZone e aplicar seus efeitos (via game.resolveEffect)
        const playSuccess = card.play(this, game, targetId);

        if (playSuccess) {
            // Game emite um evento genérico de carta jogada. A carta específica pode ter emitido outros.
             game.emitEvent('cardPlayed', { player: this.getRenderData(), card: card.getRenderData(), targetId });
        } else {
            // Se card.play() falhou APÓS a mana ser gasta (ex: alvo se tornou inválido no último instante)
            console.warn(`Player ${this.name}: Método play da carta ${card.name} reportou falha.`);
            // A carta deveria ter se movido para o cemitério se o efeito falhou (lógica em InstantCard.play, por ex.)
        }

        return playSuccess;
    }

    discardCardForMana(cardUniqueId, game) {
        console.log(`Player ${this.name}: Tentando descartar por mana a carta ${cardUniqueId}`);
        if (!game) {
            console.error("Player.discardCardForMana ERRO: Instância do jogo (game) não fornecida!");
            return false;
        }

        if (this.#hasDiscardedForMana) {
            console.log(`Player ${this.name}: Descarte por mana falhou - já descartou neste turno.`);
            game.emitEvent('gameLog', { message: `Você já descartou por mana neste turno.`, type: 'error' });
            return false;
        }
        if (this.#maxMana >= 10) {
            console.log(`Player ${this.name}: Descarte por mana falhou - mana máxima (10) atingida.`);
            game.emitEvent('gameLog', { message: `Mana máxima (10) já atingida.`, type: 'feedback' });
            return false;
        }
        const card = this.#hand.getCard(cardUniqueId);
        if (!card) {
             console.warn(`Player ${this.name}: Descarte por mana falhou - carta ${cardUniqueId} não está na mão.`);
             return false;
        }
        if (!this.isActivePlayer) { // Verifica se é o turno ativo do jogador
             console.warn(`Player ${this.name}: Descarte por mana falhou - não é o turno de ${this.name}.`);
             game.emitEvent('gameLog', { message: `Não é seu turno para descartar por mana.`, type: 'error' });
             return false;
        }

        console.log(`Player ${this.name}: Tentando mover ${card.name} (${cardUniqueId}) da mão para o cemitério para ganhar mana.`);
        const moved = game.moveCardToZone(cardUniqueId, this.id, 'hand', 'graveyard');

        if (moved) {
            this.#maxMana++;
            // A mana ATUAL NÃO é aumentada aqui, apenas a MÁXIMA. A mana atual é preenchida no início do turno.
            this.#hasDiscardedForMana = true; // Define a flag APÓS o descarte bem-sucedido

            const logMsg = `${this.name} descartou ${card.name} para ganhar +1 Mana Máx.`;
            console.log(`Player ${this.name}: SUCESSO no descarte por mana. ${logMsg} Mana Máx agora: ${this.#maxMana}.`);

            game.emitEvent('gameLog', { message: logMsg, type: 'action' });
            // Emite a mudança de stats APÓS maxMana ser atualizado
            game.emitEvent('playerStatsChanged', { playerId: this.id, updates: { maxMana: this.#maxMana } });

            return true;
        } else {
            console.error(`Player ${this.name}: FALHA no descarte por mana - game.moveCardToZone retornou false para ${cardUniqueId}.`);
            game.emitEvent('gameLog', { message: `Erro ao mover ${card.name} para o cemitério.`, type: 'error' });
            return false;
        }
    }

    spendMana(amount) {
        if (amount < 0) return false;
        if (this.#mana >= amount) {
            this.#mana -= amount;
            console.log(`Player ${this.#name}: Gastou ${amount} mana. Restante: ${this.#mana}`);
            return true;
        }
        console.log(`Player ${this.#name}: Mana insuficiente para gastar ${amount}. Possui: ${this.#mana}`);
        return false;
    }

    gainLife(amount, game) {
        if (amount <= 0) return;
        this.#life += amount;
        console.log(`Player ${this.#name}: Ganhou ${amount} vida. Total: ${this.#life}`);
        game?.emitEvent('playerStatsChanged', { playerId: this.id, updates: { life: this.#life }});
        game?.emitEvent('gameLog', { message: `${this.name} ganhou ${amount} de vida.` });
    }

    takeDamage(amount, source, game) {
        if (amount <= 0) return;
        this.#life -= amount;
        console.log(`DEBUG_PLAYER_TAKE_DAMAGE: ${this.#name} levou ${amount} de dano. Nova vida: ${this.#life}. Player ID: ${this.id}`);
        game?.emitEvent('playerStatsChanged', { playerId: this.id, updates: { life: this.#life }});
        game?.emitEvent('gameLog', { message: `${this.name} levou ${amount} de dano.` });

        if (this.#life <= 0) {
            console.log(`Player ${this.#name} foi derrotado.`);
            game?.gameOver(game.getOpponent(this.id)); // Notifica o jogo que este jogador perdeu
        }
    }

    resetStats() {
        this.#life = 20;
        this.#mana = 0;
        this.#maxMana = 0; // Começa com 0 de mana máxima
        this.#hasDiscardedForMana = false;
        this.isActivePlayer = false;
        console.log(`Player ${this.#name}: Stats resetados.`);
    }

    canDeclareAttackers() {
        return this.#battlefield.getCreatures().some(c => c.canAttack());
    }

    canDeclareBlockers(attacker) { // O parâmetro 'attacker' pode ser usado para lógicas mais complexas (ex: flying)
        return this.#battlefield.getCreatures().some(c => c.canBlock());
    }

    getRenderData() {
        return {
            id: this.id,
            name: this.name,
            life: this.life,
            mana: this.mana,
            maxMana: this.maxMana,
            handSize: this.hand.getSize(),
            deckSize: this.deck.getSize(),
            graveyardSize: this.graveyard.getSize()
            // hasDiscardedForMana não é enviado, pois a UI geralmente deduz isso
            // pela habilitação/desabilitação do botão de descarte.
        };
    }
}