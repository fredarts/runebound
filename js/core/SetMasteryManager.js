// js/core/SetMasteryManager.js
export const LEVELS = [
    { xp:  500, reward:{ booster:'ELDRAEM' }},
    { xp: 1000, reward:{ gold:500 }},
    { xp: 2000, reward:{ gems:200 }},
    { xp: 3500, reward:{ card:'IS006' }},
    { xp: 5000, reward:{ avatar:'avatar2.png' } }
  ];
  
  export function addXp(user, setCode, amount){
    const prog = user.setMastery[setCode] ??= { xp:0, level:0 };
    prog.xp += amount;
  
    while (prog.level < LEVELS.length &&
           prog.xp >= LEVELS[prog.level].xp) {
      prog.level++;
      // Aplique recompensas aqui (ouro, booster…)
      console.log(`Set Mastery ↑ ${setCode} → nível ${prog.level}`);
    }
  }
  