// js/account/AccountManager.js - INCLUINDO CORREÇÕES ANTERIORES

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
        console.warn("ATENÇÃO: Este AccountManager armazena senhas em texto plano no localStorage. NÃO use em produção!");
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
        // (Código inalterado da versão anterior)
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
            wallet: { gold: 10000, gems: 10000 },
            collection: [...startingCollection],
            decks: {
                'default_deck_1': {
                    id: 'default_deck_1',
                    name: 'Deck Inicial Padrão',
                    cards: defaultDeckCards
                }
            },
            avatars: ['default.png', 'avatar1.png', 'avatar2.png', 'avatar3.png'],
            rank: 'Bronze III',
            stats: { wins: 0, losses: 0 },
            matchHistory: [],
            avatar: 'default.png',
            createdAt: Date.now(),
            rating: 1500, rd: 350, volatility: 0.06,
            rankTier: 'Bronze', rankDivision: 4,
            setMastery: { ELDRAEM: { xp: 0, level: 0 } },
            setsOwned: { ELDRAEM: { owned: [...startingCollection], missing: [] } },
            inventory: { purchases: [], boosters: {} }
        };
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

        this.#setCurrentUser(userData); // Define a REFERÊNCIA interna e a sessão
        console.log(`Usuário ${username} logado com sucesso.`);
        return { success: true, message: "Login bem-sucedido!", user: this.getCurrentUser() }; // Retorna CÓPIA
    }

    logout() {
        const username = this.#currentUser?.username;
        this.#setCurrentUser(null);
        if (username) { console.log(`Usuário ${username} desconectado.`); }
    }

    getCurrentUser() {
        if (!this.#currentUser) this.#loadCurrentUserFromSession();
        if (!this.#currentUser) return null;

        // --- Inicialização Defensiva de Estruturas Faltantes ---
        // Garante que o objeto INTERNO #currentUser tenha as propriedades
        let needsSave = false; // Flag para salvar apenas se algo for inicializado
        if (typeof this.#currentUser.rating === 'undefined') { this.#currentUser.rating = 1500; this.#currentUser.rd = 350; this.#currentUser.volatility = 0.06; needsSave = true;}
        if (typeof this.#currentUser.rankTier === 'undefined') { this.#currentUser.rankTier = 'Bronze'; this.#currentUser.rankDivision = 4; needsSave = true;}
        if (typeof this.#currentUser.setMastery === 'undefined') { this.#currentUser.setMastery = { ELDRAEM: { xp: 0, level: 0 } }; needsSave = true;}
        if (typeof this.#currentUser.collection === 'undefined') { this.#currentUser.collection = []; needsSave = true;} // Inicializa se não existir
        if (typeof this.#currentUser.setsOwned === 'undefined') { this.#currentUser.setsOwned = { ELDRAEM: { owned: [...this.#currentUser.collection], missing: [] } }; needsSave = true;} // Usa a coleção atual
        if (typeof this.#currentUser.avatar === 'undefined') { this.#currentUser.avatar = 'default.png'; needsSave = true;}
        if (typeof this.#currentUser.wallet === 'undefined') { this.#currentUser.wallet = { gold: 0, gems: 0 }; needsSave = true;}
        if (typeof this.#currentUser.inventory === 'undefined') { this.#currentUser.inventory = { purchases: [], boosters: {} }; needsSave = true;}
        if (!Array.isArray(this.#currentUser.inventory.purchases)) { this.#currentUser.inventory.purchases = []; needsSave = true;}
        if (typeof this.#currentUser.inventory.boosters !== 'object' || this.#currentUser.inventory.boosters === null) { this.#currentUser.inventory.boosters = {}; needsSave = true;}
        if (typeof this.#currentUser.stats === 'undefined'){ this.#currentUser.stats = { wins: 0, losses: 0 }; needsSave = true;}
        if (!Array.isArray(this.#currentUser.matchHistory)){ this.#currentUser.matchHistory = []; needsSave = true;}
        if (typeof this.#currentUser.decks !== 'object' || this.#currentUser.decks === null){ this.#currentUser.decks = {}; needsSave = true;}
        if (!Array.isArray(this.#currentUser.avatars)){ this.#currentUser.avatars = ['default.png']; needsSave = true;}

        // Salva apenas se alguma inicialização foi feita
        if (needsSave) {
            this.saveCurrentUserData();
        }

        // Retorna uma CÓPIA dos dados atualizados
        return { ...this.#currentUser };
    }

    getUserData(username) {
        if (Object.keys(this.#accounts).length === 0 && localStorage.getItem(ACCOUNTS_STORAGE_KEY)) {
            this.#loadAccounts();
        }
        const userData = this.#accounts[username];
        return userData ? { ...userData } : null; // Retorna cópia
    }

    // --- Métodos que MODIFICAM o estado INTERNO ---

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
        // Garante que as estruturas INTERNAS existam
        this.#currentUser.collection ??= [];
        this.#currentUser.setsOwned ??= { ELDRAEM: { owned: [], missing: [] } };
        this.#currentUser.setsOwned.ELDRAEM ??= { owned: [], missing: [] };
        this.#currentUser.setsOwned.ELDRAEM.owned ??= [];
        // Adiciona ao array INTERNO
        this.#currentUser.collection.push(...cardIds);
        // Adiciona ao rastreamento do set INTERNO (assumindo todas de ELDRAEM por agora)
        this.#currentUser.setsOwned.ELDRAEM.owned.push(...cardIds);
        console.log(`AccMgr: Collection now ${this.#currentUser.collection.length}. setsOwned now ${this.#currentUser.setsOwned.ELDRAEM.owned.length}`);
        this.saveCurrentUserData(); // Salva o estado INTERNO atualizado
    }

    addDeck(deckId, cards /*string[]*/) {
        if (!this.#currentUser) { console.error("AccMgr: No user."); return; }
        if (!deckId || !Array.isArray(cards)) { console.error("AccMgr: Invalid deck data."); return; }
        this.#currentUser.decks ??= {};
        this.#currentUser.decks[deckId] = { id: deckId, cards: cards, name: `Deck ${deckId.substring(0,5)}` };
        console.log(`AccMgr: Added purchased deck ${deckId} for ${this.#currentUser.username}.`);
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
        // Modifica o estado INTERNO
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
        addXp(this.#currentUser, 'ELDRAEM', xpGain); // Modifica #currentUser diretamente
        this.saveCurrentUserData(); // Salva o estado INTERNO atualizado
        return { success:true, message:"Histórico atualizado." };
    }

    // --- Métodos que retornam CÓPIAS do estado atual ---

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
        return user?.rank || null;
    }

} // End of class AccountManager