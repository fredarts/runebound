// js/core/InstantCard.js

import Card from './Card.js';
import CreatureCard from './CreatureCard.js'; // Importado para instanceof (embora Game.resolveEffect lide com isso)

/**
 * Represents an Instant Spell card, which has an immediate effect
 * and then typically goes to the graveyard.
 */
export class InstantCard extends Card {
    #effectText; // Descrição textual para UI
    #cardEffects; // Array com as definições dos efeitos lógicos

    constructor(cardDefinition, ownerId) {
        super(cardDefinition, ownerId); // Call base class constructor

        if (cardDefinition.type !== 'Instant') {
            throw new Error(`Card definition "${cardDefinition.name}" is not of type Instant.`);
        }

        this.#effectText = cardDefinition.effect || 'No effect description.';
        // Armazena a definição dos efeitos da carta (o array de objetos)
        this.#cardEffects = cardDefinition.effects || []; // Default para array vazio se 'effects' não estiver definido no JSON
    }

    // --- Getters ---
    get effectText() { return this.#effectText; }
    get cardEffects() { return this.#cardEffects; } // Getter para os efeitos lógicos

    // --- Métodos para determinar tipo de alvo e se requer alvo ---

    // Método legado para manter compatibilidade com a lógica de UI de alvo existente por enquanto
    // Idealmente, a UI também leria dos #cardEffects para determinar os requisitos de alvo.
    #determineTargetTypeFromEffectText(effectText = "") {
        const text = effectText.toLowerCase();
        if (text.includes('target creature')) return 'creature';
        if (text.includes('target player')) return 'player'; // Se você tiver alvos de jogador diretos
        if (text.includes('target runebinding')) return 'runebinding'; // Se você tiver alvos de runebinding
        // Casos onde o alvo é implícito ou não há alvo explícito na string
        if (text.includes('draw') && !text.includes('target')) return 'player_self';
        if (text.includes('restore') && !text.includes('target')) return 'player_self'; // Heal self
        return 'none'; // Default se nenhum padrão de alvo explícito for encontrado
    }

    // Deriva o tipo de alvo principal da carta com base nos seus #cardEffects
    // Isso é uma simplificação; uma carta poderia ter múltiplos efeitos com diferentes alvos.
    // Por ora, pegamos o requisito do primeiro efeito que o define.
    #determinePrimaryTargetRequirement() {
        if (!this.#cardEffects || this.#cardEffects.length === 0) {
            return null; // Nenhum efeito definido
        }
        for (const effect of this.#cardEffects) {
            if (effect.targetRequirement && effect.targetRequirement !== 'none' && effect.targetRequirement !== 'player_self') {
                return effect.targetRequirement; // Retorna o primeiro requisito de alvo encontrado
            }
        }
        return null; // Nenhum efeito requer um alvo externo explícito
    }

    /**
     * Verifica se esta carta requer um alvo explícito para ser jogada.
     * Baseia-se no primeiro efeito que declara um `targetRequirement` diferente de 'none' ou 'player_self'.
     * Se nenhum efeito no array `effects` do JSON declarar um alvo explícito,
     * ele fará um fallback para a análise do `effectText` legado.
     */
    requiresTarget() {
        const primaryRequirement = this.#determinePrimaryTargetRequirement();
        if (primaryRequirement) {
            return true; // Se algum efeito definir um targetRequirement explícito
        }
        // Fallback para a lógica antiga baseada no texto, se nenhum efeito no JSON definir
        const targetTypeFromText = this.#determineTargetTypeFromEffectText(this.#effectText);
        return targetTypeFromText !== 'none' && targetTypeFromText !== 'player_self';
    }

    /**
     * Retorna o tipo de alvo principal esperado pela carta.
     * Usado pela UI para filtrar alvos válidos.
     * Deriva do `targetRequirement` do primeiro efeito que o define, ou faz fallback para o `effectText`.
     */
    get targetType() {
        const primaryRequirement = this.#determinePrimaryTargetRequirement();
        if (primaryRequirement) {
            // Mapeia o targetRequirement para os valores que a UI espera
            // (Se forem diferentes, senão pode retornar primaryRequirement diretamente)
            switch (primaryRequirement) {
                case 'creature': return 'creature';
                case 'player': return 'player';
                case 'runebinding': return 'runebinding';
                // Adicione outros mapeamentos se os valores de targetRequirement forem diferentes dos de targetType
                default: return 'none'; // Ou um valor padrão
            }
        }
        // Fallback para a lógica antiga baseada no texto
        return this.#determineTargetTypeFromEffectText(this.#effectText);
    }


    /**
     * Overrides base canPlay para Instants.
     * @param {Player} player
     * @param {Game} game
     * @returns {boolean}
     */
    canPlay(player, game) {
        if (!super.canPlay(player, game)) return false; // Checks de mana, mão, etc.

        const currentPhase = game.getCurrentPhase();
        const isActivePlayer = game.getCurrentPlayer()?.id === player.id;

        // Por enquanto, regra simples: Instants podem ser jogados na fase principal do jogador ativo.
        // No futuro, você pode expandir isso para permitir reações no turno do oponente, etc.
        if (!isActivePlayer || currentPhase !== 'main') {
            // console.log(`Instant ${this.name}: Cannot play during phase ${currentPhase} or not active player.`);
            // game.emitEvent('gameLog', { message: `Não pode jogar ${this.name} fora da sua fase principal.` });
            return false;
        }

        // Se a carta requer um alvo, verifica se há alvos válidos disponíveis (simplificado)
        // A UI é quem realmente vai mostrar os alvos e permitir a seleção.
        // Esta verificação é mais para o caso de a lógica do jogo tentar jogar a carta sem interação da UI.
        if (this.requiresTarget()) {
            const hasValidTargets = game.findCardInstance(null) !== undefined; // Placeholder - precisa de game.hasValidTargets(this.targetType)
            // if (!game.hasValidTargets(this.targetType, player)) {
            //     game.emitEvent('gameLog', { message: `Nenhum alvo válido para ${this.name}.` });
            //     return false;
            // }
        }
        return true;
    }

    /**
     * Overrides base play method para Instants.
     * Delega a resolução dos efeitos para `game.resolveEffect` e move a carta para o cemitério.
     * @param {Player} player
     * @param {Game} game
     * @param {string | null} targetId - The uniqueId do alvo principal selecionado para a carta.
     */
    play(player, game, targetId = null) {
        if (!super.play(player, game, targetId)) { // Validações base como custo de mana já foram feitas pelo Player.playCard
            return false;
        }

        console.log(`Instant: ${player.name} jogando ${this.name} ${targetId ? `no alvo ${targetId}` : ''}`);

        // Resolve os efeitos definidos no JSON da carta
        const effectResolutionSuccess = this.resolveEffect(targetId, game, player);

        // Sempre move o Instant para o cemitério após a tentativa de resolução.
        console.log(`Instant: ${this.name} movendo para o cemitério.`);
        game.moveCardToZone(this.uniqueId, this.ownerId, 'hand', 'graveyard');

        if (!effectResolutionSuccess) {
            console.warn(`Instant: Efeito de ${this.name} pode ter falhado ao resolver completamente.`);
            // A mana já foi gasta; não há reembolso aqui.
        }

        return effectResolutionSuccess; // Retorna o sucesso da RESOLUÇÃO DO EFEITO
    }

    /**
     * Itera pelos efeitos definidos da carta e pede ao Game para resolvê-los.
     * @param {string | null} targetId - O ID do alvo principal selecionado para a carta.
     * @param {Game} game - A instância do jogo.
     * @param {Player} castingPlayer - O jogador que está conjurando a carta.
     * @returns {boolean} True se todos os efeitos foram resolvidos com sucesso (ou não houve falhas críticas).
     */
    resolveEffect(targetId, game, castingPlayer) {
        // Log já feito no método 'play' ou no 'resolveEffect' do Game.
        let allEffectsSucceeded = true;

        if (!this.#cardEffects || this.#cardEffects.length === 0) {
            console.warn(`Instant ResolveEffect: Sem efeitos definidos para ${this.name} (ID: ${this.id}) no array 'effects'. Usando 'effectText' legado como fallback se necessário, ou nenhum efeito.`);
            // Poderia ter um fallback aqui para a lógica antiga do switch(this.id) se quisesse manter
            // mas a ideia é mover tudo para o Game.resolveEffect.
            // Por enquanto, se não houver 'effects', consideramos que não há efeito lógico a ser processado aqui.
            return true;
        }

        for (const effectDefinition of this.#cardEffects) {
            // Passa a definição do efeito individual, o conjurador, o alvo principal da carta, e a própria carta como fonte.
            const effectSuccess = game.resolveEffect(effectDefinition, castingPlayer, targetId, this);
            if (!effectSuccess) {
                allEffectsSucceeded = false;
                console.warn(`Instant ResolveEffect: Sub-efeito do tipo '${effectDefinition.type}' falhou para ${this.name}.`);
                // Você pode decidir parar de processar outros efeitos se um falhar:
                // break;
            }
        }
        return allEffectsSucceeded;
    }

    // Override getRenderData se Instants precisarem de dados adicionais para a UI
     getRenderData() {
        return {
            ...super.getRenderData(),
            effectText: this.effectText, // A UI ainda pode usar o effectText para display
            // Se houver outros estados específicos de Instant para renderizar, adicione aqui
        };
    }
}