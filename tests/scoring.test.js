import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, calculate, detectBust } from '../scoring.js';

test('2 wins / 1 loss adds royalty difference without a scoop', () => {
  const s = freshState(); s.wins = [1, 1, -1]; s.roles[0] = [7, 0, 0]; s.roles[2] = [4, 2, 0];
  assert.deepEqual(calculate(s, 2).totals, [10, -10]);
});
test('all wins scoop; a tied row prevents a scoop', () => {
  const s = freshState(); s.wins = [1, 1, 1];
  assert.deepEqual(calculate(s, 2).totals, [6, -6]);
  s.wins = [1, 1, 0]; assert.deepEqual(calculate(s, 2).totals, [2, -2]);
});
test('bust ignores own royalties, restores them when unchecked, and both bust settle zero', () => {
  const s = freshState(); s.roles[0] = [22, 9, 0]; s.bust[0] = true;
  assert.deepEqual(calculate(s, 2).totals, [-15, 15]);
  s.bust[0] = false; s.roles[1][0] = 2; s.wins = [0, 0, 0]; assert.deepEqual(calculate(s, 2).totals, [15, -15]);
  s.bust = [true, true, false]; assert.deepEqual(calculate(s, 2).totals, [0, 0]);
});
test('3 players settle every pair, including pair-specific scoops', () => {
  const s = freshState(); s.ranks = [[1, 2, 3], [1, 2, 3], [1, 2, 3]];
  assert.deepEqual(calculate(s, 3).totals, [12, 0, -12]);
  s.ranks = [[1, 1, 2], [1, 1, 2], [1, 1, 2]];
  assert.deepEqual(calculate(s, 3).totals, [6, 6, -12]);
});
test('a bust player can settle without rank input; remaining players stay pending', () => {
  const s = freshState(); s.bust[2] = true; s.roles[0] = [7, 2, 22];
  assert.deepEqual(calculate(s, 3).totals, [null, null, -21]);
  s.bust[1] = true; assert.deepEqual(calculate(s, 3).totals, [26, -13, -13]);
});
test('exhaustive three-player ranks and bust combinations always balance to zero', () => {
  for (let code = 0; code < 19683; code++) {
    const s = freshState(); let value = code;
    for (let r = 0; r < 3; r++) for (let p = 0; p < 3; p++) { s.ranks[r][p] = value % 3 + 1; value = Math.floor(value / 3); }
    s.roles = [[7, 9, 10], [4, 8, 12], [2, 6, 10]];
    for (let bust = 0; bust < 8; bust++) {
      s.bust = [0, 1, 2].map(p => Boolean(bust & (1 << p)));
      assert.equal(calculate(s, 3).totals.reduce((a, b) => a + b, 0), 0);
    }
  }
});
test('missing results do not masquerade as a zero score', () => {
  assert.deepEqual(calculate(freshState(), 2).totals, [null, null]);
});
test('royalty amounts are not hand strengths: same categories may tie', () => {
  const s = freshState(); s.roles[1][0] = 8; s.roles[2][0] = 4;
  assert.deepEqual(detectBust(s.roles, 0), []);
  s.roles[0][0] = 22; s.roles[1][0] = 2; s.roles[2][0] = 0;
  assert.deepEqual(detectBust(s.roles, 0), []);
});
test('detects proven upper/middle and middle/bottom reversals', () => {
  const s = freshState(); s.roles[0][0] = 10;
  assert.equal(detectBust(s.roles, 0)[0].upper, 0);
  s.roles[0][0] = 0; s.roles[1][0] = 8; s.roles[2][0] = 2;
  assert.equal(detectBust(s.roles, 0)[0].upper, 1);
  s.roles[1][0] = 4; s.roles[2][0] = 0;
  assert.equal(detectBust(s.roles, 0).length, 1);
});
test('no royalty may include pairs, two pair or bottom trips without a false warning', () => {
  const s = freshState(); s.roles[0][0] = 9;
  assert.deepEqual(detectBust(s.roles, 0), []);
  s.roles[1][0] = 2;
  assert.deepEqual(detectBust(s.roles, 0), []);
});
test('invalid roles suspend related scores until corrected or explicitly marked bust', () => {
  const s = freshState(); s.wins = [1, 1, 1]; s.roles[1][0] = 8; s.roles[2][0] = 2;
  assert.deepEqual(calculate(s, 2).totals, [null, null]);
  s.bust[0] = true;
  assert.deepEqual(calculate(s, 2).totals, [-6, 6]);
  assert.deepEqual(calculate(s, 2).errors[0], []);
  s.bust[0] = false; s.roles[2][0] = 4;
  assert.deepEqual(calculate(s, 2).totals, [18, -18]);
});
test('three-player warnings keep the unaffected pair available', () => {
  const s = freshState(); s.roles[1][2] = 8; s.ranks = [[1, 2, 3], [1, 2, 3], [1, 2, 3]];
  const result = calculate(s, 3);
  assert.equal(result.pairs[0].total, 6);
  assert.equal(result.pairs[1].ready, false);
  assert.equal(result.errors[2].length, 1);
});
