// js/data/ai/AIData.js

import { loadStarterDecks } from '../../utils.js';

// Usamos um cache para evitar carregar e processar os arquivos de deck repetidamente.
let aiProfileCache = null;

/**
 * Constrói e retorna o perfil completo da IA de forma assíncrona.
 * Carrega os decks iniciais dos arquivos de dados para garantir consistência.
 * @returns {Promise<object|null>} Uma promessa que resolve para o objeto de perfil da IA, ou null em caso de erro.
 */
export async function getAIProfile() {
    // Se o perfil já foi construído, retorna a versão em cache.
    if (aiProfileCache) {
        return aiProfileCache;
    }

    console.log("AIData: Construindo perfil da IA pela primeira vez...");
    const starterDecks = await loadStarterDecks();

    if (!starterDecks || !starterDecks.ashkar_starter || !starterDecks.galadreth_starter) {
        console.error("AIData: Falha ao carregar os decks iniciais para construir o perfil da IA.");
        return null;
    }

    const ashkarDeckCards = starterDecks.ashkar_starter.cards;
    const galadrethDeckCards = starterDecks.galadreth_starter.cards;

    // A coleção da IA conterá todas as cartas de AMBOS os decks.
    const fullAICollection = [...ashkarDeckCards, ...galadrethDeckCards];
    const uniqueAICollection = [...new Set(fullAICollection)];

    const profile = {
        username: "Opponent_AI",
        password: "ai_very_secure_password", // Apenas para consistência estrutural
        wallet: { gold: 99999, gems: 9999 },
        avatars: ['default.png', 'Magus_Valerian_Cinzarrubro.png', 'Lyrandar_Vínculoforte.png'],
        rank: 'Bronze III',
        stats: { wins: 0, losses: 0 },
        matchHistory: [],
        avatar: 'Magus_Valerian_Cinzarrubro.png',
        createdAt: Date.now(),
        rating: 1450, rd: 200, volatility: 0.06,
        rankTier: 'Bronze', rankDivision: 3,
        setMastery: { ELDRAEM: { xp: 0, level: 0 } },
        inventory: { purchases: [], boosters: {} },
        
        // Propriedades dinâmicas baseadas nos decks carregados
        collection: fullAICollection,
        decks: {
            'ashkar_starter': {
                id: 'ashkar_starter',
                name: 'Fúria de Ashkar (IA)',
                cards: ashkarDeckCards
            },
            'galadreth_starter': {
                id: 'galadreth_starter',
                name: 'Defesa de Galadreth (IA)',
                cards: galadrethDeckCards
            }
        },
        setsOwned: { ELDRAEM: { owned: uniqueAICollection, missing: [] } },
        initialSetupComplete: true // IAs sempre têm o setup completo
    };

    aiProfileCache = profile; // Armazena o perfil construído em cache
    console.log("AIData: Perfil da IA construído e armazenado em cache com 2 decks.");
    return profile;
}