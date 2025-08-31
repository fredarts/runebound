// js/ui/html-templates/loreVideoScreenTemplate.js
// CÓDIGO CORRIGIDO
export function generateLoreVideoScreenHTML() {
    return `
        <div id="lore-video-screen" class="screen">
            <div class="lore-video-layout">
                <video id="lore-video-player" width="100%" height="100%" autoplay muted playsinline preload="auto">
                    <source src="assets/video/runebound_lore_intro.mp4" type="video/mp4">
                    Seu navegador não suporta o elemento de vídeo.
                </video>
                <button id="btn-skip-lore-video">Pular Vídeo</button>
                <div id="video-loading-message" style="display:none; color:white; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);">
                    Carregando vídeo...
                </div>
            </div>
        </div>
    `;
}