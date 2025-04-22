// js/ui/html-templates/profileScreenTemplate.js
export function generateProfileScreenHTML () {
    return `
    <div id="profile-screen" class="screen profile-layout">
    <h2>PROFILE</h2>
    
      <!-- ─────────── CABEÇALHO ─────────── -->
      <section class="profile-header" id="profile-header-block">
        <h2 id="profile-username">abc</h2>
  
        
         <!-- HEADER – avatar + nome -->
        <div class="profile-header">
          <div class="avatar-wrapper">
            <img id="profile-avatar-img"
                src="assets/images/avatars/default.png"
                alt="Avatar">
                
      
      <button id="btn-edit-avatar" title="Editar Avatar">✏️</button></div>

      <div class="gold-wrapper">
          <span id="gold-amount">0</span>
          <img class="icon-gold" src="assets/images/ui/coin.png" alt="Gold">
        </div>
      
      
       <!-- ─────────── MENU DE AVATARS ─────────── -->
      <section class="avatar-choices hidden" id="avatar-choices">
        <img class="avatar-choice" data-avatar="avatar1.png" src="assets/images/avatars/avatar1.png">
        <img class="avatar-choice" data-avatar="avatar2.png" src="assets/images/avatars/avatar2.png">
        <img class="avatar-choice" data-avatar="avatar3.png" src="assets/images/avatars/avatar3.png">
        <img class="avatar-choice" data-avatar="default.png" src="assets/images/avatars/default.png">
      </section>
    </div>

    
  
      </section>
  
      <!-- ─────────── INFO PRINCIPAL ─────────── -->
      <section class="profile-info card-panel" id="profile-info-block">

 
  

  <!-- GRID 3 colunas -->
  <div class="profile-grid">

    <!-- BLOCO 1: ranking -->
    <div class="profile-block" id="profile-rank-block">
      <img id="rank-icon"
           class="icon-rank"
           src="assets/images/ui/bronze_ranking.png"
           alt="">
      <span id="profile-rank-badge" class="rank-badge bronze">Bronze&nbsp;4</span>
      <small id="profile-rating" class="subtle-text">(1500 ±350)</small>

      <div class="progress-bar">
        <div id="rank-progress" style="width:0%"></div>
      </div>

      <p class="wins-losses">
        Vitórias&nbsp;/&nbsp;Derrotas:
        <span id="profile-wins">0</span> /
        <span id="profile-losses">0</span>
      </p>
    </div>

    <!-- BLOCO 2: mastery -->
    <div class="profile-block" id="profile-setmastery-block">
      <img class="inline-icon"
           src="assets/images/ui/set_mastery.png"
           alt="">
      <h4 id="link-mastery" class="link">Set Mastery – Eldraem</h4>

      <div class="progress-bar">
        <div id="mastery-progress" style="width:0%"></div>
      </div>
      <small id="mastery-level" class="subtle-text">Lv 0</small>
    </div>

    <!-- BLOCO 3: coleção -->
    <div class="profile-block" id="profile-setcollection-block">
      <img class="inline-icon"
           src="assets/images/ui/set_colletion.png"
           alt="">
      <h4 id="link-collection" class="link">Coleção – Eldraem</h4>

      <div class="progress-bar">
        <div id="collection-progress" style="width:5.6%"></div>
      </div>
      <small id="collection-count" class="subtle-text">16/285 cartas</small>
    </div>

  </div>
</section>

  
     
  
      <!-- ─────────── HISTÓRICO ─────────── -->
      <section class="profile-history card-panel">
        <h3>Histórico de Partidas (últimas 10)</h3>
        <ul id="profile-match-history"></ul>
      </section>
  
    </div>`;
  }
  