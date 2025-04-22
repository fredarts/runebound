// js/core/SetMasteryManager.js – atualizado para 20 níveis de Set Mastery
// Cada nível confere uma recompensa única e progressivamente melhor.
// Caso queira alterar o escalonamento, modifique apenas a constante LEVELS.

export const LEVELS = [
  { xp: 500,   reward: { booster: { code: 'ELDRAEM', count: 1 } } },
  { xp: 1000,  reward: { gold: 500 } },
  { xp: 2000,  reward: { gems: 200 } },
  { xp: 3500,  reward: { card: 'IS006' } },
  { xp: 5000,  reward: { avatar: 'avatar2.png' } },

  { xp: 7000,  reward: { booster: { code: 'ELDRAEM', count: 2 } } },
  { xp: 9500,  reward: { gold: 1000 } },
  { xp: 12500, reward: { gems: 400 } },
  { xp: 16000, reward: { card: 'IS014' } },
  { xp: 20000, reward: { avatar: 'avatar3.png' } },

  { xp: 24500, reward: { booster: { code: 'ELDRAEM', count: 3 } } },
  { xp: 29500, reward: { gold: 1500 } },
  { xp: 35000, reward: { gems: 600 } },
  { xp: 41000, reward: { card: 'IS021' } },
  { xp: 47500, reward: { avatar: 'avatar4.png' } },

  { xp: 54500, reward: { booster: { code: 'ELDRAEM', count: 4 } } },
  { xp: 62000, reward: { gold: 2000 } },
  { xp: 70000, reward: { gems: 800 } },
  { xp: 78500, reward: { card: 'IS037' } },
  { xp: 87500, reward: { avatar: 'avatar5.png' } },
];

/**
 * Concede XP de Set Mastery a um usuário e aplica as recompensas
 * correspondentes conforme ele sobe de nível.
 * @param {Object} user – objeto do jogador
 * @param {string} setCode – código do set
 * @param {number} amount – quantidade de XP a adicionar
 */
export function addXp(user, setCode, amount) {
  const prog = (user.setMastery[setCode] ??= { xp: 0, level: 0 });
  prog.xp += amount;

  while (prog.level < LEVELS.length && prog.xp >= LEVELS[prog.level].xp) {
    const reward = LEVELS[prog.level].reward;
    grantSetMasteryReward(user, reward);
    prog.level++;
    console.log(`Set Mastery ↑ ${setCode} → nível ${prog.level}`);
  }
}

/**
 * Aplica a recompensa do nível atual ao jogador.
 * Separado para simplificar manutenção e testes.
 * @param {Object} user
 * @param {Object} reward – objeto na forma de LEVELS[i].reward
 */
function grantSetMasteryReward(user, reward) {
  if (reward.gold) {
    user.gold = (user.gold ?? 0) + reward.gold;
  }

  if (reward.gems) {
    user.gems = (user.gems ?? 0) + reward.gems;
  }

  if (reward.booster) {
    const { code, count } = typeof reward.booster === 'string'
      ? { code: reward.booster, count: 1 }
      : reward.booster;
    const boosters = (user.inventory = user.inventory || {}).boosters = user.inventory.boosters || {};
    boosters[code] = (boosters[code] ?? 0) + count;
  }

  if (reward.card) {
    (user.collection = user.collection || []).push(reward.card);
  }

  if (reward.avatar) {
    (user.avatars = user.avatars || []).push(reward.avatar);
  }
}
