export function generateProfileScreenHTML () {
  return `
    <div id="profile-screen" class="screen profile-layout">
      
      <div class="profile-main-header">
        <h2>PROFILE</h2>
        <div class="currency-wrapper">
          <div class="gold-wrapper">
            <span id="gold-amount">0</span>
            <img class="icon-gold" src="assets/images/ui/coin.png" alt="Gold">
          </div>
          <div class="gems-wrapper">
            <span id="gems-amount">5</span>
            <img class="icon-gems" src="assets/images/ui/gem.png" alt="Gemas">
          </div>
        </div>
      </div>

      <div class="profile-content-area scrollable-list"> 
        <section class="profile-header card-panel" id="profile-header-block">
          <div class="avatar-wrapper">
            <img id="profile-avatar-img" src="assets/images/avatars/default.png" alt="Avatar">
            <button id="btn-edit-avatar" title="Editar Avatar">✏️</button>
          </div>
          <div class="profile-user-details">
            <h3 id="profile-username-display">Jogador</h3>
            <section class="avatar-choices hidden" id="avatar-choices">
              <img class="avatar-choice" data-avatar="avatar1.png" src="assets/images/avatars/avatar1.png">
              <img class="avatar-choice" data-avatar="avatar2.png" src="assets/images/avatars/avatar2.png">
              <img class="avatar-choice" data-avatar="avatar3.png" src="assets/images/avatars/avatar3.png">
              <img class="avatar-choice" data-avatar="default.png"  src="assets/images/avatars/default.png">
            </section>
          </div>
        </section>

        <section class="profile-info card-panel" id="profile-info-block">
          <div class="profile-grid">
            <div class="profile-block" id="profile-rank-block">
              <img id="rank-icon" class="icon-rank" src="assets/images/ui/bronze_ranking.png" alt="">
              <span id="profile-rank-badge" class="rank-badge bronze">Bronze 4</span>
              
              <div class="progress-bar"><div id="rank-progress" style="width:0%"></div></div>
              <small id="profile-rating" class="subtle-text">(1500 ±350)</small>
              <p class="wins-losses">Vitórias / Derrotas: <span id="profile-wins">0</span> / <span id="profile-losses">0</span></p>
            </div>

            <button class="profile-block link-block card-panel" id="profile-setmastery-block" type="button">
              <img class="inline-icon" src="assets/images/ui/set_mastery.png" alt="">
              <h4>Set Mastery – Eldraem</h4>
              <div class="progress-bar"><div id="mastery-progress" style="width:0%"></div></div>
              <small id="mastery-level" class="subtle-text">Lv 0</small>
            </button>

            <button class="profile-block link-block card-panel" id="profile-setcollection-block" type="button">
              <img class="inline-icon" src="assets/images/ui/set_colletion.png" alt="">
              <h4>Coleção – Eldraem</h4>
              <div class="progress-bar"><div id="collection-progress" style="width:0%"></div></div>
              <small id="collection-count" class="subtle-text">0/40 cartas</small>
            </button>
          </div>
        </section>

        <section class="profile-history card-panel">
          <h3>Histórico de Partidas (últimas 10)</h3>
          <ul id="profile-match-history"></ul>
        </section>
      </div>
    </div>`;
}