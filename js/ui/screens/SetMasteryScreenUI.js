// js/ui/screens/SetMasteryScreenUI.js — nova tela “Set Mastery Rewards”
// Mostra os 20 níveis definidos em core/SetMasteryManager.js e as
// recompensas correspondentes. Inspirado no layout do MTG Arena, mas
// alinhado ao estilo visual existente (Runebound CSS variables + componentes).

import { LEVELS }            from '../../core/SetMasteryManager.js';
import ScreenManager         from '../../ui/ScreenManager.js'; // já existe no projeto

export default class SetMasteryScreenUI {
  /**
   * @param {ScreenManager} screenManager – gerenciador de telas
   * @param {Object} accountManager       – para obter usuário/logar recompensas futuramente
   */
  constructor(screenManager, accountManager){
    this._sm  = screenManager;
    this._am  = accountManager;
    this._el  = null; // cache do elemento da tela após inserção no DOM
  }

  /* ╔════════════════════════════════════════════════════════════╗
     ║               INITIALISATION & RENDERING                   ║
     ╚════════════════════════════════════════════════════════════╝ */

  /** Chame uma vez após criar ScreenManager.showScreen('set-mastery-screen') */
  init(){
    // Gera o HTML e injeta no container, se ainda não existir
    if (!$('#set-mastery-screen').length){
      $('#screens-container').append(this._generateHTML());
    }
    this._el = $('#set-mastery-screen');
    this._bind();
  }

  /** Atualiza a barra de progresso e marca níveis já alcançados */
  render(setCode='ELDRAEM'){
    const user = this._am.getCurrentUser();
    if (!user) return;

    const progress = user.setMastery?.[setCode] ?? { level: 0, xp: 0 };
    const totalXP  = progress.xp;

    // Atualiza barra de progresso geral
    const maxXP = LEVELS[LEVELS.length-1].xp;
    const pct   = Math.min(100, (totalXP / maxXP) * 100).toFixed(1);
    $('#mastery-screen-progress').css('width', pct+'%');
    $('#mastery-screen-progress-label').text(`${totalXP} / ${maxXP} XP`);

    // Marca níveis completados
    LEVELS.forEach((lvl, idx)=>{
      const reached = progress.level > idx;
      const $row    = this._el.find(`[data-level-row="${idx}"]`);
      $row.toggleClass('reached', reached);
    });
  }

  /* ╔════════════════════════════════════════════════════════════╗
     ║                           UI                              ║
     ╚════════════════════════════════════════════════════════════╝ */

  _bind(){
    // Voltar para perfil
    this._el.on('click', '#btn-mastery-back-profile', ()=>{
      this._sm.showScreen('profile-screen');
    });
  }

  /** Constrói a string HTML completa da tela (template inline) */
  _generateHTML(){
    const rows = LEVELS.map((lvl, idx)=>{
      const rwd = lvl.reward;
      function icon(type){
        return `<img class="reward-icon" src="assets/images/ui/rewards/${type}.png" alt="${type}">`;
      }
      let rewardHTML = '';
      if (rwd.gold)   rewardHTML += `${icon('gold')} <span>${rwd.gold}</span>`;
      if (rwd.gems)   rewardHTML += `${icon('gems')} <span>${rwd.gems}</span>`;
      if (rwd.card)   rewardHTML += `${icon('card')} <span>${rwd.card}</span>`;
      if (rwd.avatar) rewardHTML += `${icon('avatar')} <span>${rwd.avatar.replace('.png','')}</span>`;
      if (rwd.booster){
        const { code, count } = typeof rwd.booster === 'string' ? { code: rwd.booster, count: 1 } : rwd.booster;
        rewardHTML += `${icon('booster')} <span>${count}× ${code}</span>`;
      }
      return `
        <li class="mastery-row" data-level-row="${idx}">
          <div class="level-col">Lv ${idx+1}</div>
          <div class="xp-col">${lvl.xp} XP</div>
          <div class="reward-col">${rewardHTML}</div>
        </li>`;
    }).join('\n');

    return `
      <div id="set-mastery-screen" class="screen mastery-layout">
        <div class="mastery-header">
          <h2>Set Mastery – Eldraem</h2>
          <button id="btn-mastery-back-profile" class="button-back">← Voltar</button>
        </div>

        <div class="progress-bar large">
          <div id="mastery-screen-progress" style="width:0%"></div>
          <span id="mastery-screen-progress-label">0 / 0 XP</span>
        </div>

        <ul class="mastery-list scrollable-list">
          ${rows}
        </ul>
      </div>`;
  }
}

