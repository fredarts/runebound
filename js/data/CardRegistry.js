// js/data/CardRegistry.js
// Indexa definições de cartas e normaliza objetos de carta para um formato padrão (CardEntity).
// Esta versão foi atualizada para corrigir o erro de mistura de operadores '||' e '??'.

class CardRegistry {
  constructor() {
    /** @type {Record<string, any>} */
    this._byId = {};
    this._ready = false;
    this._placeholder = 'assets/images/ui/card_cover.png'; // Caminho para uma imagem de fallback
  }

  /**
   * Define as definições de cartas. Pode ser chamado explicitamente com os dados carregados.
   * @param {Record<string, any> | any[]} defs - Um objeto (dicionário) de id->definição ou um array de definições.
   */
  setDefinitions(defs) {
    if (!defs) return;
    // Converte um array para um objeto/dicionário se necessário
    this._byId = Array.isArray(defs)
      ? defs.reduce((acc, d) => {
          if (d && d.id) acc[d.id] = d;
          return acc;
        }, {})
      : { ...defs };
    this._ready = true;
    console.log(`CardRegistry: Definições carregadas. ${Object.keys(this._byId).length} cartas indexadas.`);
  }

  /**
   * Tenta inicializar a partir de uma variável global comum (ex: window.cardDatabase)
   * se setDefinitions() não foi chamado. Isso oferece compatibilidade com o setup atual.
   */
  _autoInitFromGlobals() {
    if (this._ready) return;
    const globalDb = window.cardDatabase || window.CardDefinitions;
    if (globalDb) {
      this.setDefinitions(globalDb);
    }
  }

  /**
   * Obtém a definição bruta de uma carta pelo seu ID base.
   * @param {string} id - O ID da carta (ex: "CR001").
   * @returns {any | null} A definição da carta ou null se não encontrada.
   */
  getDef(id) {
    this._autoInitFromGlobals();
    return id ? this._byId[id] || null : null;
  }

  /**
   * Resolve o melhor campo de imagem a partir de uma fonte (instância de carta ou definição).
   * Procura por várias propriedades comuns de imagem.
   * @param {any} source - O objeto de onde extrair a imagem.
   * @returns {string | null} A URL da imagem ou null.
   */
  _resolveImageFrom(source) {
    if (!source) return null;
    return (
      source.image_src ||
      source.image ||
      source.img ||
      source.art ||
      source.src ||
      source.imageUrl ||
      source.artUrl ||
      source.cardImage ||
      null
    );
  }

  /**
   * Normaliza qualquer objeto "parecido com uma carta" para uma CardEntity padronizada.
   * Garante que a UI sempre receba um objeto com a mesma estrutura.
   * @param {string | object} cardLike - O ID da carta (string) ou um objeto de carta.
   * @returns {object} Um objeto CardEntity padronizado.
   */
  toEntity(cardLike) {
    this._autoInitFromGlobals();

    // Caso 1: A entrada é uma string (ID da carta).
    if (typeof cardLike === 'string') {
      const def = this.getDef(cardLike);
      const image = this._resolveImageFrom(def) || this._placeholder;
      return {
        uniqueId: null,
        baseId: cardLike,
        name: def?.name || cardLike,
        type: def?.type ?? 'Unknown',
        cost: def?.cost ?? null,
        faction: def?.faction ?? 'Neutral',
        image: image,
        thumb: def?.thumb || image,
        __def: def,
        __raw: cardLike,
      };
    }

    // Caso 2: A entrada é um objeto (instância de carta do jogo, etc.).
    if (cardLike && typeof cardLike === 'object') {
      const baseId = cardLike.id || cardLike.baseId || cardLike.cardId;
      const def = this.getDef(baseId);
      const image = this._resolveImageFrom(cardLike) || this._resolveImageFrom(def) || this._placeholder;
      return {
        uniqueId: cardLike.uniqueId || null,
        baseId: baseId,
        name: cardLike.name || def?.name || 'Unknown Card',
        // >>> [CORREÇÃO] <<< Adicionados parênteses para resolver a ambiguidade
        type: (cardLike.type || def?.type) ?? 'Unknown',
        cost: cardLike.cost ?? def?.cost ?? null, // Esta linha já estava correta (só `??`)
        faction: (cardLike.faction || def?.faction) ?? 'Neutral',
        ownerId: cardLike.ownerId || null,
        location: cardLike.location || null,
        // >>> FIM DA CORREÇÃO <<<
        image: image,
        thumb: cardLike.thumb || image,
        __def: def,
        __raw: cardLike,
      };
    }

    // Caso 3: Fallback para entradas inválidas (null, undefined, etc.).
    return {
      uniqueId: null, baseId: null, name: 'Invalid Card',
      type: 'Unknown', cost: null, faction: 'Neutral', ownerId: null, location: null,
      image: this._placeholder, thumb: this._placeholder,
      __def: null, __raw: cardLike,
    };
  }
}

// Cria e exporta uma única instância (padrão Singleton) para ser usada em toda a aplicação.
const registry = new CardRegistry();

// Tenta inicializar a partir do global `window.cardDatabase` assim que o módulo é carregado.
try {
  registry._autoInitFromGlobals();
} catch (e) {
  console.warn("CardRegistry: Falha na inicialização automática a partir de globais.", e);
}

export default registry;