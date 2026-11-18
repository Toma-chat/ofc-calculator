export const PLAYERS = ['BTN', 'A', 'B'];
export const ROWS = ['上段', '中段', '下段'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const ROYALTIES = [
  [['なし', 0], ...RANKS.slice(4).map((r, i) => [r + r + 'ペア', i + 1]), ...RANKS.map((r, i) => [r + 'スリー', i + 10])],
  [['なし', 0], ['スリーカード', 2], ['ストレート', 4], ['フラッシュ', 8], ['フルハウス', 12], ['フォーカード', 20], ['ストフラ', 30], ['ロイヤル', 50]],
  [['なし', 0], ['ストレート', 2], ['フラッシュ', 4], ['フルハウス', 6], ['フォーカード', 10], ['ストフラ', 15], ['ロイヤル', 25]]
];
export function freshState() {
  return { roles: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], bust: [false, false, false], wins: [null, null, null], ranks: [[null, null, null], [null, null, null], [null, null, null]] };
}
export function calculate(state, count) {
  const bonus = PLAYERS.map((_, p) => state.bust[p] ? 0 : state.roles.reduce((sum, row) => sum + row[p], 0));
  const totals = Array(count).fill(0), pending = Array(count).fill(false), pairs = [];
  for (let a = 0; a < count; a++) {
    for (let b = a + 1; b < count; b++) {
      let base = 0, scoop = 0, royalty = 0, ready = true;
      if (state.bust[a] && state.bust[b]) {
        // Both invalid hands settle at zero, including royalties.
      } else if (state.bust[a] || state.bust[b]) {
        base = state.bust[a] ? -3 : 3;
        scoop = base;
        royalty = bonus[a] - bonus[b];
      } else {
        const wins = ROWS.map((_, r) => count === 2 ? state.wins[r] :
          state.ranks[r][a] === null || state.ranks[r][b] === null ? null : Math.sign(state.ranks[r][b] - state.ranks[r][a]));
        ready = !wins.includes(null);
        if (ready) {
          base = wins.reduce((sum, win) => sum + win, 0);
          scoop = wins.every(win => win === 1) ? 3 : wins.every(win => win === -1) ? -3 : 0;
          royalty = bonus[a] - bonus[b];
        }
      }
      const total = ready ? base + scoop + royalty : null;
      pairs.push({ a, b, ready, base, scoop, royalty, total });
      if (ready) { totals[a] += total; totals[b] -= total; }
      else { pending[a] = pending[b] = true; }
    }
  }
  return { bonus, totals: totals.map((value, p) => pending[p] ? null : value), pairs };
}
