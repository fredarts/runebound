// js/utils.js

/**
 * Shuffles an array in place using the Fisher-Yates (Durstenfeld variation) algorithm.
 * @param {Array<any>} array The array to shuffle.
 * @returns {Array<any>} The shuffled array (the same instance passed in).
 */
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/** Simple counter for generating unique IDs within a session. */
let uniqueInstanceCounter = 0;

/**
 * Generates a simple unique ID string.
 * @param {string} [prefix='instance'] - Optional prefix for the ID.
 * @returns {string} A unique ID string.
 */
export function generateUniqueId(prefix = 'instance') {
    uniqueInstanceCounter++;
    return `${prefix}_${Date.now()}_${uniqueInstanceCounter}`;
}

/**
 * Normalizes the Portuguese card type string to the English equivalent used by the game engine.
 * @param {string} portugueseType - The card type from the JSON file.
 * @returns {string} The normalized English card type.
 */
function _normalizeCardType(portugueseType) {
    const type = portugueseType.toLowerCase();
    if (type.includes('criatura')) {
        return 'Creature';
    }
    // "Conjuração Ágil" é o equivalente funcional de "Instant"
    if (type.includes('conjuração ágil')) {
        return 'Instant';
    }
     // Agrupa todos os tipos de Trama Rúnica sob o tipo "Runebinding"
    if (type.includes('trama rúnica')) {
        return 'Runebinding';
    }
    console.warn(`Tipo de carta não mapeado: '${portugueseType}'. Usando como está.`);
    return portugueseType; // Retorna o original se não houver mapeamento
}

/**
 * Fetches and merges all card definitions from separate JSON files.
 * Normalizes Portuguese keys and values to English equivalents.
 * @returns {Promise<object>} A promise that resolves to the master card database object.
 */
async function loadAllCardDataFromFiles() {
    const filePaths = [
        'js/data/cards/faccao-ordem-de-galadreth.json',
        'js/data/cards/conjuracao-agil-ordem-de-galadreth.json',
        'js/data/cards/tramas-runicas-ordem-de-galadreth.json',
        'js/data/cards/faccao-circulo-de-ashkar.json',
        'js/data/cards/conjuracao-agil-circulo-de-ashkar.json',
        'js/data/cards/tramas-runicas-circulo-de-ashkar.json'
    ];

    const masterCardDatabase = {};

    try {
        const responses = await Promise.all(filePaths.map(path => fetch(path)));
        const jsonData = await Promise.all(responses.map(res => {
            if (!res.ok) throw new Error(`Falha ao carregar ${res.url}: ${res.statusText}`);
            return res.json();
        }));

        jsonData.forEach((data, index) => {
            const cardArray = data.cartas || data.conjuracoes_ageis || data.tramas_runicas;
            if (!Array.isArray(cardArray)) {
                console.warn(`Nenhum array de cartas válido encontrado no arquivo: ${filePaths[index]}`);
                return;
            }

            cardArray.forEach(card => {
                if (!card.id) {
                    console.warn(`Carta sem ID encontrada em ${filePaths[index]}:`, card);
                    return;
                }
                
                const normalizedCard = {
                    id: card.id,
                    name: card.nome,
                    type: _normalizeCardType(card.tipo),
                    cost: card.custo,
                    rarity: card.raridade,
                    faction: card['Facção'],
                    image_src: card.image_src,
                    attack: card.ataque,
                    toughness: card.resistencia,
                    tribe: card.tribo,
                    // CORREÇÃO: Todas estas cartas pertencem ao set "ELDRAEM".
                    set: 'ELDRAEM'
                };

                // Remove chaves indefinidas para manter o objeto limpo
                Object.keys(normalizedCard).forEach(key => {
                    if (normalizedCard[key] === undefined) {
                        delete normalizedCard[key];
                    }
                });

                masterCardDatabase[card.id] = normalizedCard;
            });
        });

        console.log(`Definições de cartas carregadas com sucesso: ${Object.keys(masterCardDatabase).length} cartas no total.`);
        return masterCardDatabase;

    } catch (error) {
        console.error("Erro CRÍTICO ao carregar ou processar definições de cartas:", error);
        return null; // Retorna nulo para indicar falha
    }
}

/**
 * Expande uma lista de decks no formato {id, quantidade} para um array plano de IDs.
 * @param {Array<{id: string, quantidade: number}>} deckList - A lista de cartas do deck.
 * @returns {Array<string>} Um array plano com todos os IDs de cartas.
 */
function expandDeckList(deckList) {
    if (!Array.isArray(deckList)) {
        console.error("expandDeckList: A entrada não é um array.", deckList);
        return [];
    }
    return deckList.flatMap(item => {
        if (typeof item.id !== 'string' || typeof item.quantidade !== 'number') {
             console.warn("Item de deck inválido ignorado:", item);
             return [];
        }
        return Array(item.quantidade).fill(item.id);
    });
}


/**
 * Carrega os decks iniciais dos arquivos de texto.
 * @returns {Promise<object>} Uma promessa que resolve para um objeto com os dados dos decks.
 */
export async function loadStarterDecks() {
    try {
        const [ashkarRes, galadrethRes] = await Promise.all([
            fetch('js/data/decks/Deck - Ashkar.txt'),
            fetch('js/data/decks/Deck - Galadreth.txt')
        ]);

        if (!ashkarRes.ok || !galadrethRes.ok) throw new Error("Falha ao carregar arquivos de deck.");

        const ashkarData = await ashkarRes.json();
        const galadrethData = await galadrethRes.json();

        return {
            ashkar_starter: {
                id: "ashkar_starter",
                name: "Grimório de Ashkar",
                cards: expandDeckList(ashkarData.deck)
            },
            galadreth_starter: {
                id: "galadreth_starter",
                name: "Pergaminhos de Galadreth",
                cards: expandDeckList(galadrethData.deck)
            }
        };
    } catch (error) {
        console.error("Erro ao carregar decks iniciais:", error);
        return null;
    }
}

/**
 * Ponto de entrada principal para carregar definições de cartas.
 * @returns {Promise<object|null>} O banco de dados de cartas ou nulo em caso de erro.
 */
export async function loadCardDefinitions() {
    return await loadAllCardDataFromFiles();
}