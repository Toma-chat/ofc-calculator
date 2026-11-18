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
// Zero means no royalty, not necessarily a high card: middle may be two pair,
// and bottom may be three of a kind. Only flag reversals proven by these inputs.
export function detectBust(roles, player) {
  const categories = [
    value => value >= 10 ? [3, 3] : value > 0 ? [1, 1] : [0, 1],
    value => value === 0 ? [0, 2] : [({ 2: 3, 4: 4, 8: 5, 12: 6, 20: 7, 30: 8, 50: 9 })[value]],
    value => value === 0 ? [0, 3] : [({ 2: 4, 4: 5, 6: 6, 10: 7, 15: 8, 25: 9 })[value]]
  ];
  return [0, 1].flatMap(row => {
    const upper = categories[row](roles[row][player]);
    const lower = categories[row + 1](roles[row + 1][player]);
    return upper[0] > (lower[1] ?? lower[0]) ? [{ upper: row, lower: row + 1, message: `${ROWS[row]}が${ROWS[row + 1]}より強い役です` }] : [];
  });
}
export function calculate(state, count) {
  const errors = PLAYERS.slice(0, count).map((_, p) => state.bust[p] ? [] : detectBust(state.roles, p));
  const bonus = PLAYERS.map((_, p) => state.bust[p] ? 0 : state.roles.reduce((sum, row) => sum + row[p], 0));
  const totals = Array(count).fill(0), pending = Array(count).fill(false), pairs = [];
  for (let a = 0; a < count; a++) {
    for (let b = a + 1; b < count; b++) {
      let base = 0, scoop = 0, royalty = 0, ready = true;
      if (errors[a].length || errors[b].length) {
        ready = false;
      } else if (state.bust[a] && state.bust[b]) {
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
  return { bonus, errors, totals: totals.map((value, p) => pending[p] ? null : value), pairs };
}
