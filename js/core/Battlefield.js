// js/core/Battlefield.js
/**
 * Represents the battlefield zone for a player.
 */
export class Battlefield {
    #cards = new Map(); // Map<string, Card> (uniqueId -> CardInstance)
    #ownerId;           // ID do jogador dono deste campo de batalha
    #ownerName;         // Nome do jogador dono (para logs)

    constructor(ownerId, ownerName) { // Adicionado ownerId e ownerName
        if (!ownerId || !ownerName) {
            console.error("Battlefield CONSTRUCTOR_FAIL: ownerId e ownerName são obrigatórios.");
            // Lançar um erro aqui pode ser mais seguro para parar a execução se isso acontecer
            // throw new Error("Battlefield precisa de ownerId e ownerName.");
        }
        this.#ownerId = ownerId;
        this.#ownerName = ownerName;
        this.#cards = new Map();
        // console.log(`Battlefield: Instância criada para Jogador ${this.#ownerName} (ID: ${this.#ownerId})`); // Log opcional
    }

    addCard(cardInstance) {
        if (!cardInstance?.uniqueId) {
            console.error(`BF_ADD_FAIL [${this.#ownerName} - ${this.#ownerId}]: Card instance ou uniqueId é nulo/undefined. Card:`, cardInstance);
            return false;
        }
        if (this.#cards.has(cardInstance.uniqueId)) {
            console.error(`BF_ADD_FAIL [${this.#ownerName} - ${this.#ownerId}]: Card ${cardInstance.name} (${cardInstance.uniqueId}) JÁ ESTÁ no mapa. Não adicionando. Tamanho atual do mapa: ${this.#cards.size}`);
            return false;
        }
        this.#cards.set(cardInstance.uniqueId, cardInstance);
        console.log(`BF_ADD_SUCCESS [${this.#ownerName} - ${this.#ownerId}]: Adicionado ${cardInstance.name} (${cardInstance.uniqueId}). Novo tamanho do mapa: ${this.#cards.size}. Chaves: ${Array.from(this.#cards.keys())}`);
        return true;
    }

    removeCard(cardUniqueId) {
        const card = this.#cards.get(cardUniqueId);
        if (card) {
            this.#cards.delete(cardUniqueId);
            console.log(`BF_REMOVE_SUCCESS [${this.#ownerName} - ${this.#ownerId}]: Removido ${card.name} (${cardUniqueId}). Novo tamanho do mapa: ${this.#cards.size}.`);
            return card;
        }
        console.warn(`BF_REMOVE_WARN [${this.#ownerName} - ${this.#ownerId}]: Carta ${cardUniqueId} não encontrada para remoção.`);
        return null;
    }

    getCard(cardUniqueId) {
        return this.#cards.get(cardUniqueId) || null;
    }

    getAllCards() {
        // Retorna uma cópia do array de valores para evitar mutação externa do Map interno.
        return [...this.#cards.values()];
    }

    getCreatures() {
        // Assume que a classe CreatureCard é importada se for usada para instanceof
        // ou que as cartas têm uma propriedade 'type' confiável.
        return this.getAllCards().filter(card => card.type === 'Creature');
    }

    getSize() {
        return this.#cards.size;
    }

    untapAll() {
        console.log(`BF_UNTAP [${this.#ownerName} - ${this.#ownerId}]: Destapando todas as cartas.`);
        this.#cards.forEach(card => {
            if (typeof card.untap === 'function') {
                card.untap(); // O método untap da carta deve logar individualmente se necessário
            }
        });
    }

    clear() {
        console.log(`BF_CLEAR [${this.#ownerName} - ${this.#ownerId}]: Limpando todas as ${this.#cards.size} cartas do campo de batalha.`);
        this.#cards.clear();
    }
}