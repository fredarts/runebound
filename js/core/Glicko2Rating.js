// js/core/Glicko2Rating.js
// Implementação minimalista do Glicko‑2 (único jogador vs. 1 oponente)
/*
  rating   – μ  (rating médio em pontos – usamos 1500 de base)
  rd       – φ  (rating deviation)
  volatility – σ
  score    – 1, 0.5 ou 0
*/
const SCALE = 173.7178;          // 400/ln(10)

function g(phi) {
  return 1 / Math.sqrt(1 + 3 * phi * phi / (Math.PI * Math.PI));
}

function E(mu, muj, phij) {
  return 1 / (1 + Math.exp(-g(phij) * (mu - muj)));
}

export function updateRating(player, opponent, score, tau = 0.5) {
  // converte p/ escala interna do Glicko‑2
  const mu  = (player.rating  - 1500) / SCALE;
  const phi =  player.rd      / SCALE;
  const sig =  player.volatility ?? 0.06;

  const muj  = (opponent.rating - 1500) / SCALE;
  const phij =  opponent.rd     / SCALE;

  const g_phi = g(phij);
  const E_val = E(mu, muj, phij);

  // passo 3: variance
  const v = 1 / (g_phi * g_phi * E_val * (1 - E_val));

  // passo 4: delta
  const d = v * g_phi * (score - E_val);

  // passo 5: nova volatilidade (simplificado: uma iteração de Newton)
  let a = Math.log(sig * sig);
  const eps = 1e-6;
  let A = a, B;
  const f = x =>
      (Math.exp(x) * (d * d - phi * phi - v - Math.exp(x)) /
      (2 * (phi * phi + v + Math.exp(x)) ** 2)) -
      (x - a) / (tau * tau);

  if (d * d > phi * phi + v) B = Math.log(d * d - phi * phi - v);
  else {
    let k = 1;
    while (f(a - k * tau) < 0) k++;
    B = a - k * tau;
  }

  let fA = f(A), fB = f(B);
  while (Math.abs(B - A) > eps) {
    const C = A + (A - B) * fA / (fB - fA);
    const fC = f(C);
    if (fC * fB < 0) { A = B; fA = fB; }
    else fA = fA / 2;
    B = C; fB = fC;
  }
  const newSig = Math.exp(A / 2);

  // passo 6‑7: novo RD e rating
  const prePhi = Math.sqrt(phi * phi + newSig * newSig);
  const newPhi = 1 / Math.sqrt(1 / (prePhi * prePhi) + 1 / v);
  const newMu  = mu + newPhi * newPhi * g_phi * (score - E_val);

  return {
    rating:     1500 + newMu  * SCALE,
    rd:         newPhi * SCALE,
    volatility: newSig
  };
}
