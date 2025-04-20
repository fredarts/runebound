// js/ui/html-templates/profileScreenTemplate.js
export function generateProfileScreenHTML () {
    return `
    <div id="profile-screen" class="screen profile-layout">
  
      <!-- ─────────── CABEÇALHO ─────────── -->
      <section class="profile-header">
        <h2>PROFILE</h2>
  
        <div class="gold-wrapper">
          <span id="gold-amount">0</span>
          <img class="icon-gold" src="assets/images/ui/coin.png" alt="Gold">
        </div>
      </section>
  
      <!-- ─────────── INFO PRINCIPAL ─────────── -->
      <section class="profile-info card-panel">

      <div class="avatar-wrapper">
          <img id="profile-avatar-img"
               src="assets/images/avatars/default.png" alt="Avatar">
          <button id="btn-edit-avatar" title="Editar Avatar">
            ✏️
          </button>
        </div>
  
        <h2 id="profile-username">Jogador</h2>
  
        <p class="rank-line">
          <img id="rank-icon" class="icon-rank" src="assets/images/ui/bronze_ranking.png" alt="">
          <span id="profile-rank-badge" class="rank-badge bronze">Bronze 4</span>
          <small id="profile-rating" class="subtle-text">(1500 ±350)</small>
        </p>
  
        <div class="rank-bar"><div id="rank-progress"></div></div>
  
        <p>Vitórias / Derrotas:
          <span id="profile-wins">0</span> /
          <span id="profile-losses">0</span>
        </p>
  
        <h4 class="link master-link" id="link-mastery">
          <img class="inline-icon" src="assets/images/ui/set_mastery.png" alt="">
          Set Mastery – Eldraem
        </h4>
        <div class="mastery-bar"><div id="mastery-progress"></div><span id="mastery-level"></span></div>
  
        <h4 class="link collection-link" id="link-collection">
          <img class="inline-icon" src="assets/images/ui/set_colletion.png" alt="">
          Coleção – Eldraem
        </h4>
        <div class="collection-bar"><div id="collection-progress"></div></div>
        <small id="collection-count" class="subtle-text">0/285 cartas</small>
      </section>
  
      <!-- ─────────── MENU DE AVATARS ─────────── -->
      <section class="avatar-choices hidden" id="avatar-choices">
        <img class="avatar-choice" data-avatar="avatar1.png" src="assets/images/avatars/avatar1.png">
        <img class="avatar-choice" data-avatar="avatar2.png" src="assets/images/avatars/avatar2.png">
        <img class="avatar-choice" data-avatar="avatar3.png" src="assets/images/avatars/avatar3.png">
        <img class="avatar-choice" data-avatar="default.png" src="assets/images/avatars/default.png">
      </section>
  
      <!-- ─────────── HISTÓRICO ─────────── -->
      <section class="profile-history card-panel">
        <h3>Histórico de Partidas (últimas 10)</h3>
        <ul id="profile-match-history"></ul>
      </section>
  
    </div>`;
  }
  