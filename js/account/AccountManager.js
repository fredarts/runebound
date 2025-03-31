// js/account/AccountManager.js

// Chaves usadas para armazenar os dados no localStorage/sessionStorage
const ACCOUNTS_STORAGE_KEY = 'runebound_clash_accounts';
const CURRENT_USER_SESSION_KEY = 'runebound_clash_current_user';

/**
 * Gerencia contas de usuário, login, logout e dados associados (decks, histórico, avatar).
 * Utiliza localStorage para persistência entre sessões e sessionStorage para o login atual.
 * IMPORTANTE: Este exemplo armazena senhas em texto plano no localStorage,
 * o que NÃO É SEGURO para produção. Em uma aplicação real, use hashing de senhas no servidor.
 */
export default class AccountManager {
    #accounts = {}; // Objeto para armazenar todos os dados das contas carregadas
    #currentUser = null; // Objeto do usuário atualmente logado

    constructor() {
        this.#loadAccounts();
        this.#loadCurrentUserFromSession();
        console.log("AccountManager inicializado.");
        // Alerta de segurança sobre senhas em texto plano
        console.warn("ATENÇÃO: Este AccountManager armazena senhas em texto plano no localStorage. NÃO use em produção!");
    }

    // --- Métodos Privados ---

    /** Carrega as contas do localStorage para a memória. */
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

    /** Salva o estado atual das contas de volta no localStorage. */
    #saveAccounts() {
        try {
            localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(this.#accounts));
             console.log("Contas salvas no localStorage.");
        } catch (error) {
            console.error("Erro ao salvar contas no localStorage:", error);
        }
    }

     /** Tenta carregar o usuário logado da sessionStorage. */
     #loadCurrentUserFromSession() {
        const currentUsername = sessionStorage.getItem(CURRENT_USER_SESSION_KEY);
        if (currentUsername && this.#accounts[currentUsername]) {
            this.#currentUser = this.#accounts[currentUsername]; // Load from already parsed accounts
            console.log(`Sessão ativa encontrada para: ${currentUsername}`);
        } else {
            this.#currentUser = null;
            if (sessionStorage.getItem(CURRENT_USER_SESSION_KEY)){
                console.log("Sessão encontrada, mas usuário não existe mais nas contas. Limpando sessão.");
                sessionStorage.removeItem(CURRENT_USER_SESSION_KEY);
            } else {
                 console.log("Nenhuma sessão ativa encontrada.");
            }
        }
    }

     /** Define o usuário atual na memória e na sessionStorage. */
     #setCurrentUser(userData) {
        if(userData && userData.username) {
            this.#currentUser = userData;
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
                console.log("Sessão removida.");
             } catch(e) {
                 console.error("Erro ao remover sessão do sessionStorage:", e);
             }
        }
     }

     /** Cria a estrutura de dados padrão para um novo usuário. */
     #createDefaultUserData(username, password) {
        console.log(`Criando dados padrão para novo usuário: ${username}`);
        const startingCollection = [
            'CR001', 'CR002', 'CR003', 'CR007', 'CR009', 'CR010', 'CR011', 'CR016', // Creatures
            'RB001', 'RB_DRAW2', 'RB_POWER', 'RB_TOUGH',                          // Runebindings
            'IS001', 'IS002', 'IS003', 'IS004'                                   // Instants
        ];
        console.log("Coleção inicial definida com:", startingCollection);

        const defaultDeckCards = [
            'CR001', 'CR001', 'CR001', 'CR001', 'CR003', 'CR003', 'CR003', 'CR003',
            'CR007', 'CR007', 'CR007', 'CR011', 'CR011', 'CR011', 'CR009', 'CR009',
            'CR016', 'CR016', 'CR010', 'CR010', 'CR002', 'IS002', 'IS002', 'IS002',
            'IS002', 'IS003', 'IS003', 'IS003', 'RB_POWER','RB_POWER', 'RB_TOUGH',
            'RB_TOUGH', 'IS004', 'IS004', 'IS001', 'RB001', 'RB_DRAW2' // Total: 37 cards
        ];
         console.log("Deck inicial definido com:", defaultDeckCards.length, "cartas");

        return {
            username: username,
            password: password, // INSECURE!
            rank: 'Bronze III',
            stats: { wins: 0, losses: 0 },
            matchHistory: [],
            collection: startingCollection,
            decks: {
                'default_deck_1': {
                    id: 'default_deck_1',
                    name: 'Deck Inicial Padrão',
                    cards: defaultDeckCards
                }
            },
            // --- ADD AVATAR FIELD ---
            avatar: 'default.png', // Default avatar filename
            // -----------------------
            createdAt: Date.now()
        };
     }


    // --- Métodos Públicos ---

    createAccount(username, password) {
        if (!username || !password) { return { success: false, message: "Nome de usuário e senha são obrigatórios." }; }
        if (username.length < 3) { return { success: false, message: "Nome de usuário deve ter pelo menos 3 caracteres." }; }
        if (Object.keys(this.#accounts).length === 0) this.#loadAccounts();
        if (this.#accounts[username]) { return { success: false, message: "Este nome de usuário já está em uso." }; }
        const newUser = this.#createDefaultUserData(username, password);
        this.#accounts[username] = newUser;
        this.#saveAccounts();
        console.log(`Conta criada com sucesso para: ${username}`);
        return { success: true, message: "Conta criada com sucesso!", user: newUser };
    }

    login(username, password) {
        if (!username || !password) { return { success: false, message: "Nome de usuário e senha obrigatórios." }; }
        if (Object.keys(this.#accounts).length === 0) this.#loadAccounts();
        const userData = this.#accounts[username];
        if (!userData) { return { success: false, message: "Usuário não encontrado." }; }
        if (userData.password !== password) { return { success: false, message: "Senha incorreta." }; } // INSECURE!
        this.#setCurrentUser(userData);
        console.log(`Usuário ${username} logado com sucesso.`);
        return { success: true, message: "Login bem-sucedido!", user: this.#currentUser };
    }

    logout() {
        const username = this.#currentUser?.username;
        this.#setCurrentUser(null);
        if (username) { console.log(`Usuário ${username} desconectado.`); }
    }

    getCurrentUser() {
        if (!this.#currentUser) { this.#loadCurrentUserFromSession(); }
        // Ensure avatar exists even if loaded from old data
        if (this.#currentUser && typeof this.#currentUser.avatar === 'undefined') {
             this.#currentUser.avatar = 'default.png'; // Add default avatar if missing
             if (this.#accounts[this.#currentUser.username]) { // Ensure it exists in main map too
                this.#accounts[this.#currentUser.username] = this.#currentUser;
                this.#saveAccounts(); // Save the added default avatar
             }
        }
        return this.#currentUser ? { ...this.#currentUser } : null;
    }

    getUserData(username) {
        if (Object.keys(this.#accounts).length === 0) this.#loadAccounts();
         // Ensure avatar exists (similar to getCurrentUser) - might be overkill if only used internally
        const userData = this.#accounts[username];
         if (userData && typeof userData.avatar === 'undefined') {
             userData.avatar = 'default.png';
             this.#saveAccounts(); // Save if modified
         }
        return userData ? { ...userData } : null;
    }

    // --- Deck & Data Management ---

    saveDeck(deckId, deckName, cardIds) {
        if (!this.#currentUser) { return { success: false, message: "Nenhum usuário logado." }; }
        if (!deckId || !deckName || !Array.isArray(cardIds)) { return { success: false, message: "Dados inválidos para salvar o deck." }; }
        if (cardIds.length < 30 || cardIds.length > 40) { return { success: false, message: "O deck deve ter entre 30 e 40 cartas." }; }
        if (!this.#currentUser.decks) { this.#currentUser.decks = {}; }
        this.#currentUser.decks[deckId] = { id: deckId, name: deckName, cards: cardIds, lastUpdated: Date.now() };
        this.#accounts[this.#currentUser.username] = this.#currentUser;
        this.#saveAccounts();
        console.log(`Deck '${deckName}' (ID: ${deckId}) salvo para ${this.#currentUser.username}.`);
        return { success: true, message: "Deck salvo com sucesso!" };
    }

     deleteDeck(deckId) {
        if (!this.#currentUser) { return { success: false, message: "Nenhum usuário logado." }; }
        if (!this.#currentUser.decks || !this.#currentUser.decks[deckId]) { return { success: false, message: "Deck não encontrado." }; }
        if (Object.keys(this.#currentUser.decks).length <= 1) { /* Optional: return { success: false, message: "Não pode excluir último deck." }; */ }
        delete this.#currentUser.decks[deckId];
        this.#accounts[this.#currentUser.username] = this.#currentUser;
        this.#saveAccounts();
        console.log(`Deck ID '${deckId}' excluído para ${this.#currentUser.username}.`);
        return { success: true, message: "Deck excluído com sucesso!" };
     }

    loadDecks() {
        const user = this.getCurrentUser(); return user?.decks ? { ...user.decks } : null;
    }
     getCollection() {
        const user = this.getCurrentUser(); return user?.collection ? [...user.collection] : null;
     }

     /** Saves the user's chosen avatar preference */
     saveAvatarChoice(avatarFilename) {
         if (!this.#currentUser) { console.warn("Cannot save avatar choice, no user logged in."); return false; }
         if (typeof avatarFilename !== 'string') { console.warn("Invalid avatar filename provided."); return false; }
         this.#currentUser.avatar = avatarFilename;
         this.#accounts[this.#currentUser.username] = this.#currentUser;
         this.#saveAccounts();
         console.log(`Avatar choice saved for ${this.#currentUser.username}: ${avatarFilename}`);
         return true;
     }

     addMatchHistory(matchData) {
        if (!this.#currentUser) { return { success: false, message: "Nenhum usuário logado." }; }
        if (!matchData?.opponent || !matchData?.result) { return { success: false, message: "Dados inválidos da partida." }; }
        const historyEntry = { ...matchData, date: Date.now() };
        if (!this.#currentUser.matchHistory) this.#currentUser.matchHistory = [];
        if (!this.#currentUser.stats) this.#currentUser.stats = { wins: 0, losses: 0 };
        this.#currentUser.matchHistory.unshift(historyEntry);
        if (this.#currentUser.matchHistory.length > 50) this.#currentUser.matchHistory.pop();
        if (matchData.result === 'win') this.#currentUser.stats.wins++;
        else if (matchData.result === 'loss') this.#currentUser.stats.losses++;
        this.#accounts[this.#currentUser.username] = this.#currentUser;
        this.#saveAccounts();
        console.log(`Histórico de partida adicionado para ${this.#currentUser.username}.`);
        return { success: true, message: "Histórico salvo." };
     }

     getMatchHistory() { const user = this.getCurrentUser(); return user?.matchHistory ? [...user.matchHistory] : null; }
     getStats() { const user = this.getCurrentUser(); return user?.stats ? { ...user.stats } : null; }
     getRank() { const user = this.getCurrentUser(); return user?.rank || null; }

} // End of class AccountManager