// js/account/AccountManager.js - REATORADO (v2.0 - com melhorias)

const ACCOUNTS_STORAGE_KEY = 'runebound_clash_accounts';
const CURRENT_USER_SESSION_KEY = 'runebound_clash_current_user';

import { processMatch } from '../core/RankingManager.js';
import { addXp } from '../core/SetMasteryManager.js';

/**
 * Gerencia contas de usuário, login, logout e dados associados.
 * Não possui conhecimento específico sobre a criação de IAs.
 * Focado em robustez, validação e manutenção de dados.
 */
export default class AccountManager {
    #accounts = {};
    #currentUser = null;

    constructor() {
        this.#loadAccounts();
        this.#loadCurrentUserFromSession();
        console.log("AccountManager (refatorado v2.0) inicializado.");
    }

    // --- Métodos Privados ---

    #loadAccounts() {
        try {
            const storedAccounts = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
            if (storedAccounts) {
                this.#accounts = JSON.parse(storedAccounts);
            }
        } catch (error) {
            console.error("Erro ao carregar/parsear contas do localStorage:", error);
            this.#accounts = {};
        }
    }

    #saveAccounts() {
        try {
            localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(this.#accounts));
        } catch (error) {
            console.error("Erro ao salvar contas no localStorage:", error);
        }
    }

    #loadCurrentUserFromSession() {
        try {
            const currentUsername = sessionStorage.getItem(CURRENT_USER_SESSION_KEY);
            if (currentUsername && this.#accounts[currentUsername]) {
                this.#currentUser = this.#accounts[currentUsername];
                console.log(`Sessão ativa encontrada para: ${currentUsername}`);
            }
        } catch (error) {
            console.error("Erro ao carregar sessão do sessionStorage:", error);
            this.#currentUser = null;
        }
    }

    #setCurrentUser(userData) {
        if (userData?.username && this.#accounts[userData.username]) {
            this.#currentUser = this.#accounts[userData.username];
            sessionStorage.setItem(CURRENT_USER_SESSION_KEY, userData.username);
        } else {
            this.#currentUser = null;
            sessionStorage.removeItem(CURRENT_USER_SESSION_KEY);
        }
    }

    #createDefaultUserData(username, password) {
        return {
            username,
            password, // INSEGURO! Ideal para um backend com hashing.
            wallet: { gold: 100, gems: 10 },
            collection: [],
            decks: {},
            avatars: ['default.png', 'avatar1.png', 'avatar2.png', 'avatar3.png'],
            stats: { wins: 0, losses: 0 },
            matchHistory: [],
            avatar: 'default.png',
            createdAt: Date.now(),
            rating: 1500, rd: 350, volatility: 0.06,
            rankTier: 'Bronze', rankDivision: 4,
            setMastery: { ELDRAEM: { xp: 0, level: 0 } },
            setsOwned: { ELDRAEM: { owned: [], missing: [] } },
            inventory: { purchases: [], boosters: {} },
            initialSetupComplete: false
        };
    }
    
    // --- Métodos Públicos ---
    
    saveCurrentUserData() {
        if (!this.#currentUser) return;
        this.#accounts[this.#currentUser.username] = this.#currentUser;
        this.#saveAccounts();
        console.log(`AccountManager: Dados de ${this.#currentUser.username} salvos.`);
    }

    createOrUpdateAccount(userData) {
        if (!userData?.username) {
            console.error("createOrUpdateAccount: Dados de usuário inválidos fornecidos.");
            return;
        }
        this.#accounts[userData.username] = userData;
        this.#saveAccounts();
        console.log(`Conta para '${userData.username}' foi criada ou atualizada.`);
    }

    createAccount(username, password) {
        if (!username || !password || username.length < 3) {
            return { success: false, message: "Nome de usuário e senha inválidos." };
        }
        if (this.#accounts[username]) {
            return { success: false, message: "Este nome de usuário já está em uso." };
        }
        const newUser = this.#createDefaultUserData(username, password);
        this.createOrUpdateAccount(newUser);
        return { success: true, message: "Conta criada com sucesso!", user: { ...newUser } };
    }

    login(username, password) {
        const userData = this.#accounts[username];
        if (!userData) return { success: false, message: "Usuário não encontrado." };
        if (userData.password !== password) return { success: false, message: "Senha incorreta." };

        this.#setCurrentUser(userData);
        console.log(`Usuário ${username} logado com sucesso.`);
        return { success: true, message: "Login bem-sucedido!", user: this.getCurrentUser() };
    }

    logout() {
        const username = this.#currentUser?.username;
        this.#setCurrentUser(null);
        if (username) console.log(`Usuário ${username} desconectado.`);
    }

    getCurrentUser() {
        if (!this.#currentUser) this.#loadCurrentUserFromSession();
        if (!this.#currentUser) return null;

        let needsSave = false;
        
        // Garante que todas as propriedades essenciais existam no objeto do usuário.
        // Se uma propriedade não existir (ex: de uma conta antiga), ela é adicionada com um valor padrão.
        const defaultData = this.#createDefaultUserData('', '');
        for (const key in defaultData) {
            if (typeof this.#currentUser[key] === 'undefined') {
                this.#currentUser[key] = defaultData[key];
                needsSave = true;
                console.log(`Adicionando propriedade ausente '${key}' à conta de ${this.#currentUser.username}.`);
            }
        }

        if (needsSave) {
            this.saveCurrentUserData();
        }
        
        // Retorna uma cópia para prevenir mutação externa acidental do estado interno.
        return { ...this.#currentUser };
    }

    getUserData(username) {
        return this.#accounts[username] ? { ...this.#accounts[username] } : null;
    }

    saveDeck(deckId, deckName, cardIds) {
        if (!this.#currentUser) return { success: false, message: "Nenhum usuário logado." };
        if (!deckId || !deckName || !Array.isArray(cardIds)) return { success: false, message: "Dados inválidos." };
        if (cardIds.length < 30 || cardIds.length > 60) return { success: false, message: "O deck precisa ter entre 30 e 60 cartas." };
        
        this.#currentUser.decks ??= {};
        this.#currentUser.decks[deckId] = { id: deckId, name: deckName, cards: cardIds, lastUpdated: Date.now() };
        this.saveCurrentUserData();
        return { success: true, message: "Deck salvo!" };
    }
    
    deleteDeck(deckId) {
        if (!this.#currentUser?.decks?.[deckId]) return { success: false, message: "Deck não encontrado." };
        delete this.#currentUser.decks[deckId];
        this.saveCurrentUserData();
        return { success: true, message: "Deck excluído!" };
    }
    
    addCardsToCollection(cardIds) {
        if (!this.#currentUser || !Array.isArray(cardIds)) return;
        this.#currentUser.collection ??= [];
        this.#currentUser.setsOwned ??= { ELDRAEM: { owned: [], missing: [] } };
        this.#currentUser.setsOwned.ELDRAEM ??= { owned: [], missing: [] };
        this.#currentUser.setsOwned.ELDRAEM.owned ??= [];
        this.#currentUser.collection.push(...cardIds);
        const uniqueCards = [...new Set(cardIds)];
        uniqueCards.forEach(id => {
            if (!this.#currentUser.setsOwned.ELDRAEM.owned.includes(id)) {
                this.#currentUser.setsOwned.ELDRAEM.owned.push(id);
            }
        });
        this.saveCurrentUserData();
    }
    
    addDeck(deckId, cards, deckName) {
        if (!this.#currentUser || !deckId || !Array.isArray(cards)) return;
        this.#currentUser.decks ??= {};
        this.#currentUser.decks[deckId] = { id: deckId, cards, name: deckName || `Deck ${deckId.slice(0, 5)}` };
        this.saveCurrentUserData();
    }
    
    addAvatar(avatarFilename) {
        if (!this.#currentUser || !avatarFilename) return;
        this.#currentUser.avatars ??= ['default.png'];
        if (!this.#currentUser.avatars.includes(avatarFilename)) {
            this.#currentUser.avatars.push(avatarFilename);
            this.saveCurrentUserData();
        }
    }
    
    saveAvatarChoice(avatarFilename) {
        if (!this.#currentUser || !avatarFilename) return false;
        this.#currentUser.avatar = avatarFilename;
        this.saveCurrentUserData();
        return true;
    }
    
    addMatchHistory(matchData) {
        if (!this.#currentUser || !matchData?.opponent || !matchData?.result) return { success: false, message: "Dados inválidos." };
        const entry = { ...matchData, date: Date.now() };
        this.#currentUser.matchHistory ??= [];
        this.#currentUser.matchHistory.unshift(entry);
        if (this.#currentUser.matchHistory.length > 50) this.#currentUser.matchHistory.pop();
        this.#currentUser.stats ??= { wins: 0, losses: 0 };
        if (matchData.result === 'win') this.#currentUser.stats.wins++;
        if (matchData.result === 'loss') this.#currentUser.stats.losses++;
        const opponentData = this.getUserData(matchData.opponent) ?? { rating: 1500, rd: 350, volatility: 0.06 };
        const rankUpdate = processMatch(this.#currentUser, opponentData, matchData.result === 'win' ? 1 : 0);
        Object.assign(this.#currentUser, rankUpdate);
        const xpGain = matchData.result === 'win' ? 200 : 50;
        addXp(this.#currentUser, 'ELDRAEM', xpGain);
        this.saveCurrentUserData();
        return { success: true, message: "Histórico atualizado." };
    }
    
    loadDecks() { return this.getCurrentUser()?.decks ?? {}; }
    getCollection() { return this.getCurrentUser()?.collection ?? []; }
    getMatchHistory() { return this.getCurrentUser()?.matchHistory ?? []; }
    getStats() { return this.getCurrentUser()?.stats ?? { wins: 0, losses: 0 }; }
    getRank() { const user = this.getCurrentUser(); return (user?.rankTier && user?.rankDivision) ? `${user.rankTier} ${user.rankDivision}` : 'Bronze IV'; }
    
    completeInitialSetup(chosenDeckId, deckData) {
        if (!this.#currentUser) {
            console.error("AccountManager: Nenhum usuário logado para completar o setup inicial.");
            return false;
        }
        if (!chosenDeckId || !deckData?.name || !Array.isArray(deckData.cards)) {
            console.error("AccountManager: Dados inválidos para completar o setup inicial do deck.");
            return false;
        }

        this.#currentUser.collection ??= [];
        this.#currentUser.collection.push(...deckData.cards);

        this.#currentUser.setsOwned ??= { ELDRAEM: { owned: [], missing: [] } };
        this.#currentUser.setsOwned.ELDRAEM ??= { owned: [], missing: [] };
        const uniqueCardsFromDeck = [...new Set(deckData.cards)];
        uniqueCardsFromDeck.forEach(cardId => {
            if (!this.#currentUser.setsOwned.ELDRAEM.owned.includes(cardId)) {
                this.#currentUser.setsOwned.ELDRAEM.owned.push(cardId);
            }
        });

        this.#currentUser.decks = {
            [chosenDeckId]: {
                id: chosenDeckId,
                name: deckData.name,
                cards: deckData.cards
            }
        };

        this.#currentUser.initialSetupComplete = true;
        this.saveCurrentUserData();
        console.log(`AccountManager: Setup inicial completo para ${this.#currentUser.username}.`);
        return true;
    }
}