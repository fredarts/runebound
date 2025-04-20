// js/ui/screens/ProfileScreenUI.js
import { LEVELS } from '../../core/SetMasteryManager.js';

export default class ProfileScreenUI{
  #screenManager; #accountManager; #uiManager;
  #el;

  constructor(sm, am, cardDB, renderer, zoom, uiMgr){
    this.#screenManager = sm; this.#accountManager=am; this.#uiManager=uiMgr;
    this.#el = $('#profile-screen');
    this._bind();
  }

  render(){
    const u = this.#accountManager.getCurrentUser();
    if(!u){ this.#screenManager.showScreen('login-screen'); return; }
  
    /* cabeçalho */
    $('#profile-username').text(u.username);
    $('#gold-amount').text(u.wallet?.gold ?? 0);
    $('#profile-avatar-img').attr('src',`assets/images/avatars/${u.avatar}`);
  
    /* rank + ícone */
    $('#profile-rank-badge')
      .text(`${u.rankTier} ${u.rankDivision}`)
      .attr('class',`rank-badge ${u.rankTier.toLowerCase()}`);
  
    const rankIcon = {
      Bronze : 'bronze_ranking.png',
      Prata  : 'silver_ranking.png',
      Ouro   : 'gold_ranking.png'
    }[u.rankTier] || 'bronze_ranking.png';
    $('#rank-icon').attr('src',`assets/images/ui/${rankIcon}`);
  
    $('#profile-rating').text(`(${Math.round(u.rating)} ±${Math.round(u.rd)})`);
  
    const tierMin={Bronze:0,Prata:1400,Ouro:1700}[u.rankTier];
    $('#rank-progress').css('width',`${((u.rating-tierMin)%75)/0.75}%`);
  
    /* W / L */
    $('#profile-wins').text(u.stats?.wins ?? 0);
    $('#profile-losses').text(u.stats?.losses ?? 0);
  
    /* mastery */
    const m=u.setMastery.ELDRAEM ?? {xp:0,level:0};
    const next=LEVELS[m.level]?.xp ?? m.xp;
    $('#mastery-level').text(`Lv ${m.level}`);
    $('#mastery-progress').css('width',`${Math.min(1,m.xp/next)*100}%`);
  
    /* coleção */
    const owned=u.setsOwned.ELDRAEM?.owned.length ?? 0;
    $('#collection-count').text(`${owned}/285 cartas`);
    $('#collection-progress').css('width',`${owned/2.85}%`);
  
    /* histórico */
    this._renderHistory(u.matchHistory ?? []);
  }
  

  _renderHistory(arr){
    const $ul=$('#profile-match-history').empty();
    if(!arr.length){$ul.append('<li>(Nenhum histórico ainda)</li>');return;}
    arr.slice(0,10).forEach(m=>{
      const d=new Date(m.date).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
      const cls=m.result==='win'?'history-win':m.result==='loss'?'history-loss':'history-draw';
      const txt=m.result==='win'?'Vitória':m.result==='loss'?'Derrota':'Empate';
      $ul.append(`<li class="${cls}">${d} – ${txt} vs ${m.opponent}</li>`);
    });
  }

  _bind(){
    /* editar avatar */
    this.#el.on('click','#btn-edit-avatar',()=>{
      $('#avatar-choices').toggleClass('hidden');
    });
    /* escolher avatar */
    this.#el.on('click','.avatar-choice',e=>{
      const file=$(e.currentTarget).data('avatar');
      if(this.#accountManager.saveAvatarChoice(file)){
        $('#profile-avatar-img').attr('src',`assets/images/avatars/${file}`);
        $('#avatar-choices').addClass('hidden');
      }
    });
    /* link coleção */
    this.#el.on('click','#link-collection',()=>{
      this.#uiManager.navigateTo('set-collection-screen');
    });
  }
}
