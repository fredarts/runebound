// js/ui/html-templates/setMasteryScreenTemplate.js
import { LEVELS } from '../../core/SetMasteryManager.js';

export function generateSetMasteryScreenHTML() {

    function getRewardIconHTML(type) {
        return `<img class="reward-icon" src="assets/images/ui/rewards/${type}.png" alt="${type}">`;
    }

    const column1Levels = LEVELS.slice(0, 10);
    const column2Levels = LEVELS.slice(10, 20);

    const generateColumnHTML = (levels, startIndex = 0) => {
        return levels.map((levelData, index) => {
            const actualLevel = startIndex + index + 1;
            const reward = levelData.reward;
            let rewardContentHTML = '';

            if (reward.gold) {
                rewardContentHTML += `${getRewardIconHTML('gold')} <span>${reward.gold}</span>`;
            }
            if (reward.gems) {
                rewardContentHTML += `${getRewardIconHTML('gems')} <span>${reward.gems}</span>`;
            }
            if (reward.card) {
                rewardContentHTML += `${getRewardIconHTML('card')} <span>${reward.card}</span>`;
            }
            if (reward.avatar) {
                rewardContentHTML += `${getRewardIconHTML('avatar')} <span>${reward.avatar.replace('.png', '')}</span>`;
            }
            if (reward.booster) {
                const { code, count } = typeof reward.booster === 'string'
                    ? { code: reward.booster, count: 1 }
                    : reward.booster;
                rewardContentHTML += `${getRewardIconHTML('booster')} <span>${count}× ${code}</span>`;
            }

            return `
                <li class="mastery-row" data-level-row="${startIndex + index}">
                  <div class="level-col">Lv ${actualLevel}</div>
                  <div class="xp-col">${levelData.xp} XP</div>
                  <div class="reward-col">${rewardContentHTML || '---'}</div>
                </li>`;
        }).join('\n');
    };

    const column1HTML = generateColumnHTML(column1Levels, 0);
    const column2HTML = generateColumnHTML(column2Levels, 10);

    return `
      <div id="set-mastery-screen" class="screen mastery-layout">
        <div class="mastery-header">
          <h2>Set Mastery – Eldraem</h2>
          <button id="btn-mastery-back-profile" class="button-login-secondary" title="Voltar ao Perfil">← Voltar</button>
        </div>

        <div class="progress-bar large">
          <div id="mastery-screen-progress" style="width:0%"></div>
          <span id="mastery-screen-progress-label">0 / 0 XP</span>
        </div>

        <div class="mastery-rewards-columns-container">
            <ul id="mastery-rewards-column-1" class="mastery-list">
              ${column1HTML}
            </ul>
            <ul id="mastery-rewards-column-2" class="mastery-list">
              ${column2HTML}
            </ul>
        </div>
      </div>`;
}