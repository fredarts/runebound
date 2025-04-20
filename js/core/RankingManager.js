// js/core/RankingManager.js
import { updateRating } from './Glicko2Rating.js';

// tiers fixos + cada divisão = 75 pts
const TIERS = [
  { tier:'Bronze', min:   0, max:1399 },
  { tier:'Prata',  min:1400, max:1699 },
  { tier:'Ouro',   min:1700, max:3000 }
];
const DIV_STEP = 75;

export function processMatch(user, opponent, result) {
  const score = result === 'win' ? 1 : result === 'loss' ? 0 : 0.5;

  const { rating, rd, volatility } =
        updateRating(user, opponent, score);

  const tierObj = TIERS.find(t => rating >= t.min && rating <= t.max) ?? TIERS[0];
  const rel     = rating - tierObj.min;
  const division= 4 - Math.floor(rel / DIV_STEP);

  return {
    rating:     Math.max(0, rating),
    rd:         rd,
    volatility: volatility,
    rankTier:   tierObj.tier,
    rankDivision: Math.max(1, Math.min(4, division))
  };
}
