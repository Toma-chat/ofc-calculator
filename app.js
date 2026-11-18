import { PLAYERS, ROWS, ROYALTIES, freshState, calculate } from './scoring.js';

const app = document.querySelector('.app');
let count = 2;
const states = { 2: freshState(), 3: freshState() };
const signed = value => (value > 0 ? '+' : value < 0 ? '−' : '') + Math.abs(value);
const names = () => PLAYERS.slice(0, count);
const rules = document.querySelector('.rules');
const pairDialog = document.querySelector('.pair-dialog');
const rolePicker = document.querySelector('.role-picker');
let editingRole = null;

function renderRolePicker() {
  const { row, player, type } = editingRole;
  const selected = states[count].roles[row][player];
  rolePicker.querySelector('#role-picker-title').textContent = `${PLAYERS[player]} · ${ROWS[row]}`;
  const types = rolePicker.querySelector('.picker-types');
  types.hidden = row !== 0;
  types.innerHTML = row === 0 ? [['none', 'なし'], ['pair', 'ペア'], ['three', 'スリー']].map(([value, label]) => `<button type="button" data-type="${value}" aria-pressed="${type === value}">${label}</button>`).join('') : '';
  let options = ROYALTIES[row];
  if (row === 0) options = type === 'three' ? options.filter(([, v]) => v >= 10) : options.filter(([, v]) => v > 0 && v < 10);
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  rolePicker.querySelector('.picker-options').classList.toggle('rank-options', row === 0);
  rolePicker.querySelector('.picker-options').innerHTML = options.map(([label, points]) => {
    const name = row === 0 ? ranks[type === 'three' ? points - 10 : points + 3] : label;
    return `<button class="picker-option" type="button" data-points="${points}" aria-pressed="${selected === points}" aria-label="${row === 0 ? name + (type === 'three' ? 'スリー' : 'ペア') : name} ${points}点"><span class="option-name">${name}</span><span class="option-points">${points}点</span></button>`;
  }).join('');
}

function positionRolePicker() {
  if (!rolePicker.open) return;
  rolePicker.style.removeProperty('left');
  rolePicker.style.removeProperty('top');
  if (window.matchMedia('(min-width:768px)').matches) {
    const button = app.querySelector(`[data-role="${editingRole.row}"][data-player="${editingRole.player}"]`);
    const anchor = button.getBoundingClientRect(), bounds = rolePicker.getBoundingClientRect();
    rolePicker.style.left = `${Math.max(16, Math.min(anchor.left, window.innerWidth - bounds.width - 16))}px`;
    rolePicker.style.top = `${Math.max(16, Math.min(anchor.bottom + 8, window.innerHeight - bounds.height - 16))}px`;
  }
}

function openRolePicker(button) {
  const row = Number(button.dataset.role), player = Number(button.dataset.player);
  const selected = states[count].roles[row][player];
  editingRole = { row, player, type: selected >= 10 ? 'three' : 'pair' };
  renderRolePicker();
  rolePicker.showModal();
  positionRolePicker();
}
window.addEventListener('resize', positionRolePicker);

rolePicker.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || !editingRole) return;
  if (button.classList.contains('close-picker')) { rolePicker.close(); return; }
  if (button.dataset.type && button.dataset.type !== 'none') {
    editingRole.type = button.dataset.type;
    renderRolePicker();
    positionRolePicker();
    rolePicker.querySelector(`[data-type="${editingRole.type}"]`).focus();
    return;
  }
  if (button.dataset.type === 'none' || button.dataset.points !== undefined) {
    states[count].roles[editingRole.row][editingRole.player] = Number(button.dataset.points ?? 0);
    render();
    rolePicker.close();
  }
});
rolePicker.addEventListener('close', () => {
  editingRole = null;
  rolePicker.style.removeProperty('left');
  rolePicker.style.removeProperty('top');
});

function build() {
  app.style.setProperty('--players', count);
  app.dataset.count = count;
  app.querySelectorAll('[data-players]').forEach(button => button.setAttribute('aria-pressed', Number(button.dataset.players) === count));
  app.querySelector('.matrix').innerHTML = `<span></span>${names().map(name => `<strong class="person">${name}</strong>`).join('')}
    <span></span>${names().map((_, p) => `<label class="bust"><input type="checkbox" data-bust="${p}">バスト</label>`).join('')}
    ${ROWS.map((row, r) => `<span class="row-label">${row}</span>${names().map((name, p) => `<div class="role-field"><button type="button" class="role-trigger" data-role="${r}" data-player="${p}" aria-label="${name}の${row}の役" aria-haspopup="dialog" aria-controls="role-picker"><span class="role-display" aria-hidden="true"><span class="role-name">なし</span><span class="role-bottom"><span class="role-points">0点</span><span class="role-chevron">⌄</span></span></span></button></div>`).join('')}`).join('')}
    <span></span>${names().map((_, p) => `<div class="bonus" data-bonus="${p}"></div>`).join('')}`;
  app.querySelector('.outcomes h2').textContent = count === 2 ? '各段の勝者' : '各段の順位';
  app.querySelector('.wins').innerHTML = count === 2 ? ROWS.map((row, r) => `<div class="win-row"><span>${row}</span><div class="segments" role="group" aria-label="${row}の勝者">${['BTN', '分け', 'A'].map((name, i) => `<button type="button" data-win="${r}" data-value="${1 - i}" aria-pressed="false">${name}</button>`).join('')}</div></div>`).join('') :
    `<div class="rank-grid"><span></span>${names().map(name => `<span class="rank-person">${name}</span>`).join('')}${ROWS.map((row, r) => `<span>${row}</span>${names().map((name, p) => `<select data-rank="${r}" data-player="${p}" aria-label="${name}の${row}の順位"><option value="">選択</option><option value="1">1位</option><option value="2">2位</option><option value="3">3位</option></select>`).join('')}`).join('')}</div><p class="hint">同順位＝引き分け · バストの順位は入力不要</p>`;
  render();
}

function render() {
  const state = states[count], result = calculate(state, count);
  const alive = state.bust.slice(0, count).filter(value => !value).length;
  app.querySelectorAll('[data-role]').forEach(select => {
    const p = Number(select.dataset.player);
    const value = state.roles[Number(select.dataset.role)][p];
    select.disabled = state.bust[p];
    const field = select.closest('.role-field');
    const [name, points] = ROYALTIES[Number(select.dataset.role)].find(([, points]) => points === value);
    select.setAttribute('aria-label', `${PLAYERS[p]}の${ROWS[Number(select.dataset.role)]}の役：${name} ${state.bust[p] ? '無効' : points + '点'}`);
    field.dataset.active = points > 0;
    field.dataset.disabled = state.bust[p];
    field.querySelector('.role-name').textContent = name;
    field.querySelector('.role-points').textContent = state.bust[p] ? '無効' : `${points}点`;
  });
  app.querySelectorAll('[data-bust]').forEach(input => { input.checked = state.bust[Number(input.dataset.bust)]; });
  app.querySelectorAll('[data-bonus]').forEach(el => {
    const p = Number(el.dataset.bonus);
    el.textContent = state.bust[p] ? '役は無効' : `合計 ${result.bonus[p]}点`;
  });
  app.querySelectorAll('[data-win]').forEach(button => {
    button.disabled = alive < 2;
    const value = state.bust[0] && state.bust[1] ? null : state.bust[0] ? -1 : state.bust[1] ? 1 : state.wins[Number(button.dataset.win)];
    button.setAttribute('aria-pressed', value === Number(button.dataset.value));
  });
  app.querySelectorAll('[data-rank]').forEach(select => {
    select.disabled = state.bust[Number(select.dataset.player)] || alive < 2;
    select.value = state.ranks[Number(select.dataset.rank)][Number(select.dataset.player)] ?? '';
  });
  app.querySelector('.result').innerHTML = `<div class="result-heading">この対戦の収支</div><div class="totals">${names().map((name, p) => `<div><span class="result-name">${name}</span><div class="number">${result.totals[p] === null ? '—' : signed(result.totals[p]) + '<span class="unit">点</span>'}</div></div>`).join('')}</div><div class="result-status">${result.totals.includes(null) ? '役と勝敗を選ぶと自動計算' : count === 3 ? '3組の精算を合算 · 合計0点' : '勝敗・スクープ・役の差を含む'}</div>`;
  app.querySelector('.pairs').innerHTML = result.pairs.map(pair => `<button class="pair" type="button" data-pair="${pair.a}-${pair.b}" ${pair.ready ? '' : 'disabled'} aria-label="${PLAYERS[pair.a]}対${PLAYERS[pair.b]}の内訳"><span>${PLAYERS[pair.a]} <span class="versus">対</span> ${PLAYERS[pair.b]}</span><strong>${pair.ready ? signed(pair.total) + '点' : '未入力'}</strong><span class="pair-detail">${pair.ready ? `勝敗 ${signed(pair.base)} / スクープ ${signed(pair.scoop)} / 役 ${signed(pair.royalty)}` : '勝敗・順位を選択'}</span></button>`).join('');
}

app.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.players) { count = Number(button.dataset.players); build(); }
  else if (button.dataset.role !== undefined) openRolePicker(button);
  else if (button.dataset.win !== undefined) { states[count].wins[Number(button.dataset.win)] = Number(button.dataset.value); render(); }
  else if (button.classList.contains('clear')) { states[count] = freshState(); build(); }
  else if (button.classList.contains('help')) rules.showModal();
  else if (button.dataset.pair) {
    const [a, b] = button.dataset.pair.split('-').map(Number);
    const pair = calculate(states[count], count).pairs.find(pair => pair.a === a && pair.b === b);
    document.querySelector('#pair-title').textContent = `${PLAYERS[a]} 対 ${PLAYERS[b]}`;
    document.querySelector('.pair-content').innerHTML = `<p>${PLAYERS[a]}から見た点数</p><dl><div><dt>各段の勝敗</dt><dd>${signed(pair.base)}点</dd></div><div><dt>スクープ</dt><dd>${signed(pair.scoop)}点</dd></div><div><dt>役のボーナス差</dt><dd>${signed(pair.royalty)}点</dd></div><div><dt>合計</dt><dd>${signed(pair.total)}点</dd></div></dl>`;
    pairDialog.showModal();
  }
});
app.addEventListener('change', event => {
  const el = event.target, state = states[count];
  if (el.dataset.bust !== undefined) state.bust[Number(el.dataset.bust)] = el.checked;
  if (el.dataset.rank !== undefined) state.ranks[Number(el.dataset.rank)][Number(el.dataset.player)] = el.value === '' ? null : Number(el.value);
  render();
});
document.querySelector('.close-rules').addEventListener('click', () => rules.close());
document.querySelector('.close-pair').addEventListener('click', () => pairDialog.close());
for (const dialog of [rules, pairDialog, rolePicker]) dialog.addEventListener('click', event => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); } });
document.querySelector('.royalty-table').innerHTML = `<h3>役のボーナス</h3><table><thead><tr><th>役</th><th>中段</th><th>下段</th></tr></thead><tbody>${[['スリーカード',2,0],['ストレート',4,2],['フラッシュ',8,4],['フルハウス',12,6],['フォーカード',20,10],['ストフラ',30,15],['ロイヤル',50,25]].map(row => `<tr>${row.map((v,i) => `<${i ? 'td' : 'th'}>${v}</${i ? 'td' : 'th'}>`).join('')}</tr>`).join('')}</tbody></table><p>上段：66ペア＝1点〜AAペア＝9点。222＝10点〜AAA＝22点。</p>`;
build();
