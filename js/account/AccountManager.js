// js/account/AccountManager.js - ATUALIZADO E COMPLETO

// Chaves usadas para armazenar os dados no localStorage/sessionStorage
const ACCOUNTS_STORAGE_KEY = 'runebound_clash_accounts';
const CURRENT_USER_SESSION_KEY = 'runebound_clash_current_user';

import { processMatch } from '../core/RankingManager.js';
import { addXp }        from '../core/SetMasteryManager.js';

/**
 * Gerencia contas de usuário, login, logout e dados associados (decks, histórico, avatar).
 * Utiliza localStorage para persistência entre sessões e sessionStorage para o login atual.
 * IMPORTANTE: Este exemplo armazena senhas em texto plano no localStorage,
 * o que NÃO É SEGURO para produção. Em uma aplicação real, use hashing de senhas no servidor.
 */
export default class AccountManager {
    #accounts = {}; // Objeto para armazenar todos os dados das contas carregadas
    #currentUser = null; // Objeto do usuário atualmente logado (REFERÊNCIA INTERNA)

    constructor() {
        this.#loadAccounts();
        this.#loadCurrentUserFromSession();
        console.log("AccountManager inicializado.");
        this._ensureAiAccountExists(); // Chamada para um novo método privado
        console.log("AccountManager inicializado e conta da IA verificada.");
    }

    // --- Métodos Privados ---

    #loadAccounts() {
        const storedAccounts = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
        if (storedAccounts) {
            try {
                this.#accounts = JSON.parse(storedAccounts);
                 console.log(`Contas carregadas do localStorage: ${Object.keys(this.#accounts).length}`);
            } catch (error) {
                console.error("Erro ao carregar/parsear contas do localStorage:", error);
                this.#accounts = {};
                localStorage.removeItem(ACCOUNTS_STORAGE_KEY);
            }
        } else {
            this.#accounts = {};
             console.log("Nenhuma conta encontrada no localStorage.");
        }
    }

    #saveAccounts() {
        try {
            localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(this.#accounts));
             // Reduzido log para evitar spam, focar no saveCurrentUserData
             // console.log("Contas salvas no localStorage.");
        } catch (error) {
            console.error("Erro ao salvar contas no localStorage:", error);
        }
    }

    /** Salva os dados do usuário atual (que está em memória) na estrutura #accounts e persiste */
    saveCurrentUserData() {
        if (!this.#currentUser) {
            // console.warn("AccountManager: Tentativa de salvar dados sem usuário logado."); // Pode ser muito verboso
            return;
        }
        // Atualiza a entrada no objeto #accounts com a referência INTERNA #currentUser
        this.#accounts[this.#currentUser.username] = this.#currentUser;
        this.#saveAccounts(); // Salva todo o objeto #accounts no localStorage
        console.log("AccountManager: Dados do usuário atualizados e salvos."); // Log importante
    }

    #loadCurrentUserFromSession() {
        const currentUsername = sessionStorage.getItem(CURRENT_USER_SESSION_KEY);
        if (currentUsername && this.#accounts[currentUsername]) {
            // Armazena a REFERÊNCIA ao objeto que está em #accounts
            this.#currentUser = this.#accounts[currentUsername];
            console.log(`Sessão ativa encontrada para: ${currentUsername}`);
        } else {
            this.#currentUser = null;
            if (sessionStorage.getItem(CURRENT_USER_SESSION_KEY)){
                console.log("Sessão encontrada, mas usuário não existe mais nas contas. Limpando sessão.");
                sessionStorage.removeItem(CURRENT_USER_SESSION_KEY);
            } else {
                 // console.log("Nenhuma sessão ativa encontrada."); // Menos verboso
            }
        }
     }

    #setCurrentUser(userData) {
        if(userData && userData.username && this.#accounts[userData.username]) {
            // Armazena a REFERÊNCIA ao objeto do usuário que está dentro de #accounts
            this.#currentUser = this.#accounts[userData.username];
            try {
                sessionStorage.setItem(CURRENT_USER_SESSION_KEY, userData.username);
                 console.log(`Sessão definida para: ${userData.username}`);
            } catch(e) {
                console.error("Erro ao salvar sessão no sessionStorage:", e);
            }
        } else {
            this.#currentUser = null;
             try {
                sessionStorage.removeItem(CURRENT_USER_SESSION_KEY);
                // console.log("Sessão removida."); // Menos verboso
             } catch(e) {
                 console.error("Erro ao remover sessão do sessionStorage:", e);
             }
        }
     }

    #createDefaultUserData(username, password) {
         return {
            username: username,
            password: password, // INSECURE!
            wallet: { gold: 10000, gems: 10000 }, // Valores iniciais de teste
            collection: [], // Coleção começa vazia, será populada no setup inicial
            decks: {},
            avatars: ['default.png', 'avatar1.png', 'avatar2.png', 'avatar3.png'],
            rank: 'Bronze IV', // Ajustado para corresponder ao sistema numérico
            stats: { wins: 0, losses: 0 },
            matchHistory: [],
            avatar: 'default.png',
            createdAt: Date.now(),
            rating: 1500, rd: 350, volatility: 0.06,
            rankTier: 'Bronze', rankDivision: 4,
            setMastery: { ELDRAEM: { xp: 0, level: 0 } },
            setsOwned: { ELDRAEM: { owned: [], missing: [] } },
            inventory: { purchases: [], boosters: {} },
            initialSetupComplete: false // Novo jogador começa com setup incompleto
        };
     }

    _ensureAiAccountExists() {
        const AI_USERNAME = "Opponent_AI";
        const AI_DEFAULT_DECK_ID = 'default_deck_1';

        if (!this.#accounts[AI_USERNAME] || !this.#accounts[AI_USERNAME].decks?.[AI_DEFAULT_DECK_ID]) {
            console.log(`AccountManager: Conta da IA (${AI_USERNAME}) ou deck padrão não encontrado. Criando/Atualizando...`);

            const aiDeckCards = [ // Deck padrão da IA
                'CR001', 'CR001', 'CR001', 'CR002', 'CR002', 'CR003', 'CR003', 'CR003',
                'CR007', 'CR007', 'CR009', 'CR009', 'CR010', 'CR010', 'CR011', 'CR011',
                'CR016', 'CR016', 'IS001', 'IS001', 'IS002', 'IS002', 'IS003', 'IS003',
                'IS004', 'IS004', 'RB001', 'RB_POWER', 'RB_TOUGH', 'RB_DRAW2' // 30 cartas
            ];

            if (!this.#accounts[AI_USERNAME]) {
                this.#accounts[AI_USERNAME] = {
                    username: AI_USERNAME,
                    password: "ai_very_secure_password",
                    wallet: { gold: 9999, gems: 999 },
                    avatars: ['default.png', 'Magus_Valerian_Cinzarrubro.png'],
                    rank: 'Bronze III',
                    stats: { wins: 0, losses: 0 },
                    matchHistory: [],
                    avatar: 'Magus_Valerian_Cinzarrubro.png',
                    createdAt: Date.now(),
                    rating: 1400, rd: 200, volatility: 0.06,
                    rankTier: 'Bronze', rankDivision: 3,
                    setMastery: { ELDRAEM: { xp: 0, level: 0 } },
                    inventory: { purchases: [], boosters: {} },
                    collection: [],
                    decks: {},
                    initialSetupComplete: true // IA já vem com setup completo
                };
            }

            this.#accounts[AI_USERNAME].collection = this.#accounts[AI_USERNAME].collection || [];
            this.#accounts[AI_USERNAME].decks = this.#accounts[AI_USERNAME].decks || {};
            this.#accounts[AI_USERNAME].setsOwned = this.#accounts[AI_USERNAME].setsOwned || { ELDRAEM: { owned: [], missing: [] } };
            this.#accounts[AI_USERNAME].setsOwned.ELDRAEM = this.#accounts[AI_USERNAME].setsOwned.ELDRAEM || { owned: [], missing: [] };

            this.#accounts[AI_USERNAME].decks[AI_DEFAULT_DECK_ID] = {
                id: AI_DEFAULT_DECK_ID,
                name: 'Deck Padrão da IA',
                cards: [...aiDeckCards]
            };

            // Adiciona TODAS as cartas do deck (incluindo duplicatas) à coleção da IA
            this.#accounts[AI_USERNAME].collection.push(...aiDeckCards);

            // Para setsOwned (que rastreia únicos), garante que as cartas únicas do deck estejam lá
            const aiUniqueDeckCards = [...new Set(aiDeckCards)];
            const aiSetsOwnedSet = new Set(this.#accounts[AI_USERNAME].setsOwned.ELDRAEM.owned);
            aiUniqueDeckCards.forEach(cardId => aiSetsOwnedSet.add(cardId));
            this.#accounts[AI_USERNAME].setsOwned.ELDRAEM.owned = [...aiSetsOwnedSet];

            this.#saveAccounts();
            console.log(`AccountManager: Conta/Deck da IA (${AI_USERNAME}) assegurada no localStorage.`);
        } else {
            // console.log(`AccountManager: Conta e deck padrão da IA (${AI_USERNAME}) já existem e são válidos.`);
        }
    }

    completeInitialSetup(chosenDeckId, deckData) {
        if (!this.#currentUser) {
            console.error("AccountManager: Nenhum usuário logado para completar o setup inicial.");
            return false;
        }
        if (!chosenDeckId || !deckData || !deckData.name || !Array.isArray(deckData.cards)) {
            console.error("AccountManager: Dados inválidos para completar o setup inicial do deck.");
            return false;
        }

        // Adiciona TODAS as cartas do deckData.cards (incluindo duplicatas) à coleção.
        this.#currentUser.collection = this.#currentUser.collection || [];
        this.#currentUser.collection.push(...deckData.cards);

        // Atualiza setsOwned (que geralmente rastreia cartas únicas para % de completude)
        this.#currentUser.setsOwned = this.#currentUser.setsOwned || {};
        this.#currentUser.setsOwned.ELDRAEM = this.#currentUser.setsOwned.ELDRAEM || { owned: [], missing: [] };
        const uniqueCardsFromDeck = [...new Set(deckData.cards)];
        uniqueCardsFromDeck.forEach(cardId => {
            if (!this.#currentUser.setsOwned.ELDRAEM.owned.includes(cardId)) {
                this.#currentUser.setsOwned.ELDRAEM.owned.push(cardId);
            }
        });

        this.#currentUser.decks = {};
        this.#currentUser.decks[chosenDeckId] = {
            id: chosenDeckId,
            name: deckData.name,
            cards: deckData.cards
        };

        this.#currentUser.initialSetupComplete = true;
        this.saveCurrentUserData();
        console.log(`AccountManager: Setup inicial completo para ${this.#currentUser.username}. Deck escolhido: ${deckData.name}. Coleção agora tem ${this.#currentUser.collection.length} cartas (incluindo duplicatas).`);
        return true;
    }


    // --- Métodos Públicos ---

    createAccount(username, password) {
        if (!username || !password) { return { success: false, message: "Nome de usuário e senha são obrigatórios." }; }
        if (username.length < 3) { return { success: false, message: "Nome de usuário deve ter pelo menos 3 caracteres." }; }
        if (Object.keys(this.#accounts).length === 0 && localStorage.getItem(ACCOUNTS_STORAGE_KEY)) {
            this.#loadAccounts();
        }
        if (this.#accounts[username]) { return { success: false, message: "Este nome de usuário já está em uso." }; }

        const newUser = this.#createDefaultUserData(username, password);
        this.#accounts[username] = newUser;
        this.#saveAccounts();
        console.log(`Conta criada com sucesso para: ${username}`);
        return { success: true, message: "Conta criada com sucesso!", user: { ...newUser } };
    }

    login(username, password) {
        if (!username || !password) { return { success: false, message: "Nome de usuário e senha obrigatórios." }; }
        if (Object.keys(this.#accounts).length === 0 && localStorage.getItem(ACCOUNTS_STORAGE_KEY)) {
            this.#loadAccounts();
        }
        const userData = this.#accounts[username];
        if (!userData) { return { success: false, message: "Usuário não encontrado." }; }
        if (userData.password !== password) { return { success: false, message: "Senha incorreta." }; } // INSECURE!

        this.#setCurrentUser(userData);
        console.log(`Usuário ${username} logado com sucesso.`);
        return { success: true, message: "Login bem-sucedido!", user: this.getCurrentUser() };
    }

    logout() {
        const username = this.#currentUser?.username;
        this.#setCurrentUser(null);
        if (username) { console.log(`Usuário ${username} desconectado.`); }
    }

    getCurrentUser() {
        if (!this.#currentUser) this.#loadCurrentUserFromSession();
        if (!this.#currentUser) return null;

        let needsSave = false;
        if (typeof this.#currentUser.rating === 'undefined') { this.#currentUser.rating = 1500; this.#currentUser.rd = 350; this.#currentUser.volatility = 0.06; needsSave = true;}
        if (typeof this.#currentUser.rankTier === 'undefined') { this.#currentUser.rankTier = 'Bronze'; this.#currentUser.rankDivision = 4; needsSave = true;}
        if (typeof this.#currentUser.setMastery === 'undefined') { this.#currentUser.setMastery = { ELDRAEM: { xp: 0, level: 0 } }; needsSave = true;}
        if (!Array.isArray(this.#currentUser.collection)) { this.#currentUser.collection = []; needsSave = true;}
        if (typeof this.#currentUser.setsOwned === 'undefined') { this.#currentUser.setsOwned = { ELDRAEM: { owned: [...new Set(this.#currentUser.collection)], missing: [] } }; needsSave = true;}
        if (typeof this.#currentUser.avatar === 'undefined') { this.#currentUser.avatar = 'default.png'; needsSave = true;}
        if (typeof this.#currentUser.wallet === 'undefined') { this.#currentUser.wallet = { gold: 0, gems: 0 }; needsSave = true;}
        if (typeof this.#currentUser.inventory === 'undefined') { this.#currentUser.inventory = { purchases: [], boosters: {} }; needsSave = true;}
        if (!Array.isArray(this.#currentUser.inventory.purchases)) { this.#currentUser.inventory.purchases = []; needsSave = true;}
        if (typeof this.#currentUser.inventory.boosters !== 'object' || this.#currentUser.inventory.boosters === null) { this.#currentUser.inventory.boosters = {}; needsSave = true;}
        if (typeof this.#currentUser.stats === 'undefined'){ this.#currentUser.stats = { wins: 0, losses: 0 }; needsSave = true;}
        if (!Array.isArray(this.#currentUser.matchHistory)){ this.#currentUser.matchHistory = []; needsSave = true;}
        if (typeof this.#currentUser.decks !== 'object' || this.#currentUser.decks === null){ this.#currentUser.decks = {}; needsSave = true;}
        if (!Array.isArray(this.#currentUser.avatars)){ this.#currentUser.avatars = ['default.png']; needsSave = true;}
        if (typeof this.#currentUser.initialSetupComplete === 'undefined') { this.#currentUser.initialSetupComplete = false; needsSave = true;}


        if (needsSave) {
            this.saveCurrentUserData();
        }
        return { ...this.#currentUser };
    }

    getUserData(username) {
        if (Object.keys(this.#accounts).length === 0 && localStorage.getItem(ACCOUNTS_STORAGE_KEY)) {
            this.#loadAccounts();
        }
        const userData = this.#accounts[username];
        return userData ? { ...userData } : null;
    }

    saveDeck(deckId, deckName, cardIds) {
        if (!this.#currentUser) { return { success: false, message: "Nenhum usuário logado." }; }
        if (!deckId || !deckName || !Array.isArray(cardIds)) { return { success: false, message: "Dados inválidos." }; }
        if (cardIds.length < 30 || cardIds.length > 40) { return { success: false, message: "Deck precisa de 30-40 cartas." }; }
        this.#currentUser.decks ??= {};
        this.#currentUser.decks[deckId] = { id: deckId, name: deckName, cards: cardIds, lastUpdated: Date.now() };
        this.saveCurrentUserData();
        console.log(`Deck '${deckName}' (ID: ${deckId}) salvo para ${this.#currentUser.username}.`);
        return { success: true, message: "Deck salvo!" };
    }

    deleteDeck(deckId) {
        if (!this.#currentUser) { return { success: false, message: "Nenhum usuário logado." }; }
        if (!this.#currentUser.decks?.[deckId]) { return { success: false, message: "Deck não encontrado." }; }
        delete this.#currentUser.decks[deckId];
        this.saveCurrentUserData();
        console.log(`Deck ID '${deckId}' excluído para ${this.#currentUser.username}.`);
        return { success: true, message: "Deck excluído!" };
    }

    addCardsToCollection(cardIds) {
        if (!this.#currentUser) { console.error("AccMgr: No user."); return; }
        if (!Array.isArray(cardIds) || cardIds.length === 0) { console.warn("AccMgr: Invalid cards array."); return; }
        console.log(`AccMgr: Adding ${cardIds.length} cards to collection for ${this.#currentUser.username}.`);

        this.#currentUser.collection ??= [];
        this.#currentUser.setsOwned ??= { ELDRAEM: { owned: [], missing: [] } };
        this.#currentUser.setsOwned.ELDRAEM ??= { owned: [], missing: [] };
        this.#currentUser.setsOwned.ELDRAEM.owned ??= [];

        this.#currentUser.collection.push(...cardIds); // Adiciona com duplicatas

        const uniqueCardsToAdd = [...new Set(cardIds)];
        uniqueCardsToAdd.forEach(cardId => {
            if (!this.#currentUser.setsOwned.ELDRAEM.owned.includes(cardId)) {
                this.#currentUser.setsOwned.ELDRAEM.owned.push(cardId);
            }
        });
        console.log(`AccMgr: Collection now ${this.#currentUser.collection.length}. setsOwned.ELDRAEM.owned now ${this.#currentUser.setsOwned.ELDRAEM.owned.length}`);
        this.saveCurrentUserData();
    }

    addDeck(deckId, cards, deckName) {
        if (!this.#currentUser) { console.error("AccMgr: No user."); return; }
        if (!deckId || !Array.isArray(cards)) { console.error("AccMgr: Invalid deck data."); return; }
        this.#currentUser.decks ??= {};
        const finalDeckName = deckName || `Deck ${deckId.substring(0, 5)}`;
        this.#currentUser.decks[deckId] = { id: deckId, cards: cards, name: finalDeckName };
        console.log(`AccMgr: Added purchased deck '${finalDeckName}' (ID: ${deckId}) for ${this.#currentUser.username}.`);
        this.saveCurrentUserData();
    }

    addAvatar(avatarFilename) {
        if (!this.#currentUser) { console.error("AccMgr: No user."); return; }
        if (!avatarFilename || typeof avatarFilename !== 'string') { console.error("AccMgr: Invalid avatar filename."); return; }
        this.#currentUser.avatars ??= ['default.png'];
        if (!this.#currentUser.avatars.includes(avatarFilename)) {
            this.#currentUser.avatars.push(avatarFilename);
            console.log(`AccMgr: Added avatar ${avatarFilename} for ${this.#currentUser.username}.`);
            this.saveCurrentUserData();
        } else {
             console.log(`AccMgr: Avatar ${avatarFilename} already owned.`);
        }
    }

    saveAvatarChoice(avatarFilename) {
         if (!this.#currentUser) { console.warn("AccMgr: No user."); return false; }
         if (typeof avatarFilename !== 'string' || !avatarFilename) { console.warn("AccMgr: Invalid avatar filename."); return false; }
         this.#currentUser.avatar = avatarFilename;
         this.saveCurrentUserData();
         console.log(`AccMgr: Avatar choice saved: ${avatarFilename}`);
         return true;
     }

    addMatchHistory(matchData) {
        if (!this.#currentUser) { return { success:false, message:"Nenhum usuário logado." }; }
        if (!matchData?.opponent || !matchData?.result) { return { success:false, message:"Dados inválidos." }; }

        const entry = { ...matchData, date: Date.now() };
        this.#currentUser.matchHistory ??= [];
        this.#currentUser.matchHistory.unshift(entry);
        if (this.#currentUser.matchHistory.length > 50) this.#currentUser.matchHistory.pop();

        this.#currentUser.stats ??= { wins:0, losses:0 };
        if (matchData.result === 'win') this.#currentUser.stats.wins++;
        if (matchData.result === 'loss') this.#currentUser.stats.losses++;

        const opponentData = this.getUserData(matchData.opponent) ?? { rating:1500, rd:350, volatility:0.06 };
        const rankUpdate = processMatch(this.#currentUser, opponentData, matchData.result === 'win' ? 1 : matchData.result === 'loss' ? 0 : 0.5);
        Object.assign(this.#currentUser, rankUpdate);

        const xpGain = matchData.result === 'win' ? 200 : matchData.result === 'loss' ? 50 : 100;
        addXp(this.#currentUser, 'ELDRAEM', xpGain);
        this.saveCurrentUserData();
        return { success:true, message:"Histórico atualizado." };
    }

    loadDecks() {
        const user = this.getCurrentUser();
        return user?.decks ? { ...user.decks } : {};
    }

    getCollection() {
        const user = this.getCurrentUser();
        return user?.collection ? [...user.collection] : [];
    }

    getMatchHistory() {
        const user = this.getCurrentUser();
        return user?.matchHistory ? [...user.matchHistory] : [];
    }

    getStats() {
        const user = this.getCurrentUser();
        return user?.stats ? { ...user.stats } : { wins: 0, losses: 0 };
    }

    getRank() {
        const user = this.getCurrentUser();
        // Retorna o rank completo para que a ProfileScreenUI possa formatar
        if (user && user.rankTier && user.rankDivision !== undefined) {
            return `${user.rankTier} ${user.rankDivision}`;
        }
        return user?.rank || 'Bronze IV'; // Fallback se rankTier/rankDivision não estiverem definidos
    }
}