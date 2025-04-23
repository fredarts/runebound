// js/ui/html-templates/SetMasteryScreenTemplate.js

// Import LEVELS to generate the reward list structure
import { LEVELS } from '../../core/SetMasteryManager.js';

/**
 * Generates the HTML string for the Set Mastery Rewards screen.
 * Dynamically creates the list items based on the LEVELS constant.
 * @returns {string} HTML da tela de Set Mastery.
 */
export function generateSetMasteryScreenHTML() {

    // Helper function to create reward icons
    function getRewardIconHTML(type) {
        // Ensure the path matches your assets structure
        return `<img class="reward-icon" src="assets/images/ui/rewards/${type}.png" alt="${type}">`;
    }

    // Generate the HTML for each reward row
    const rewardRowsHTML = LEVELS.map((levelData, index) => {
        const reward = levelData.reward;
        let rewardContentHTML = '';

        // Build the HTML string for the reward icons and text
        if (reward.gold) {
             rewardContentHTML += `${getRewardIconHTML('gold')} <span>${reward.gold}</span>`;
        }
        if (reward.gems) {
            rewardContentHTML += `${getRewardIconHTML('gems')} <span>${reward.gems}</span>`;
        }
        if (reward.card) {
            // Consider fetching card name here if desired, or just show ID
            rewardContentHTML += `${getRewardIconHTML('card')} <span>${reward.card}</span>`;
        }
        if (reward.avatar) {
            rewardContentHTML += `${getRewardIconHTML('avatar')} <span>${reward.avatar.replace('.png', '')}</span>`;
        }
        if (reward.booster) {
            // Handle both string and object format for booster reward
            const { code, count } = typeof reward.booster === 'string'
                ? { code: reward.booster, count: 1 }
                : reward.booster;
            rewardContentHTML += `${getRewardIconHTML('booster')} <span>${count}× ${code}</span>`;
        }

        // Return the list item HTML for this level
        return `
            <li class="mastery-row" data-level-row="${index}">
              <div class="level-col">Lv ${index + 1}</div>
              <div class="xp-col">${levelData.xp} XP</div>
              <div class="reward-col">${rewardContentHTML || '---'}</div> 
            </li>`;
    }).join('\n'); // Join all list item strings with newlines

    // Return the complete screen HTML structure
    return `
      <div id="set-mastery-screen" class="screen mastery-layout">
       
        <div class="mastery-header">
          <h2>Set Mastery – Eldraem</h2>
         
          <button id="btn-mastery-back-profile" class="button-back" title="Voltar ao Perfil">← Voltar</button>
        </div>

       
        <div class="progress-bar large">
          
          <div id="mastery-screen-progress" style="width:0%"></div>
          
          <span id="mastery-screen-progress-label">0 / 0 XP</span>
        </div>

       
       
        <ul id="mastery-rewards-list" class="mastery-list scrollable-list">
          ${rewardRowsHTML} 
        </ul>
      </div>`;
}