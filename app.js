// =========================================
// 가계부 앱 — app.js
// =========================================

// =========================================
// 상수 & 초기 데이터
// =========================================

const INCOME_CATS = ['급여', '이자', '배당', '기타'];
const EXPENSE_CATS = ['헌금', '고정지출', '생활비', '데이트비', '투자', '쇼핑'];

const BAR_COLORS = {
  '헌금':    '#378ADD',
  '고정지출': '#7F77DD',
  '생활비':  '#1D9E75',
  '데이트비': '#D4537E',
  '투자':    '#BA7517',
  '쇼핑':    '#D85A30',
};

// 기본 예산 (예산 설정 탭에서 수정 가능)
let budget = {
  '헌금':    220000,
  '고정지출': 620000,
  '생활비':  400000,
  '데이트비': 200000,
  '투자':    300000,
  '쇼핑':    100000,
};

// =========================================
// 상태
// =========================================

let monthData = {};      // { "2026-03": { items: [], budget: {...} }, ... }
let currentType = 'income';
let nextId = 1;

const today = new Date();
let viewKey = toKey(today.getFullYear(), today.getMonth() + 1);

// =========================================
// 유틸 함수
// =========================================

/** 연/월 → "YYYY-MM" 키 */
function toKey(year, month) {
  return year + '-' + String(month).padStart(2, '0');
}

/** "YYYY-MM" → "2026년 3월" */
function keyToLabel(key) {
  const [y, m] = key.split('-');
  return y + '년 ' + parseInt(m) + '월';
}

/** 숫자 → "₩1,234,000" */
function fmt(n) {
  return '₩' + Math.round(n).toLocaleString('ko-KR');
}

/** 오늘 날짜 → "YYYY-MM-DD" */
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** "YYYY-MM-DD" → "3/13" */
function fmtDate(str) {
  if (!str) return '-';
  const [, m, d] = str.split('-');
  return parseInt(m) + '/' + parseInt(d);
}

// =========================================
// 데이터 접근
// =========================================

function getMonthData(key) {
  if (!monthData[key]) {
    monthData[key] = {
      items: [],
      budget: JSON.parse(JSON.stringify(budget)),
    };
  }
  return monthData[key];
}

function currentItems() {
  return getMonthData(viewKey).items;
}

function currentBudget() {
  return getMonthData(viewKey).budget;
}

function isCurrentMonth() {
  const n = new Date();
  return viewKey === toKey(n.getFullYear(), n.getMonth() + 1);
}

// =========================================
// 월 이동 & 새 달 시작
// =========================================

function changeMonth(dir) {
  const [y, m] = viewKey.split('-').map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  const newKey = toKey(d.getFullYear(), d.getMonth() + 1);

  // 미래 달(데이터 없음)은 이동 불가
  if (!monthData[newKey] && dir > 0 && newKey > toKey(today.getFullYear(), today.getMonth() + 1)) return;
  // 과거 달(데이터 없음)도 이동 불가
  if (!monthData[newKey] && dir < 0) return;

  viewKey = newKey;
  renderDashboard();
  renderRecord();
}

function newMonth() {
  const n = new Date();
  const nowKey = toKey(n.getFullYear(), n.getMonth() + 1);
  if (monthData[nowKey]) {
    alert('이미 현재 달 데이터가 있어요!');
    return;
  }
  monthData[nowKey] = {
    items: [],
    budget: JSON.parse(JSON.stringify(budget)),
  };
  viewKey = nowKey;
  saveToStorage();
  renderDashboard();
  renderRecord();
  alert(keyToLabel(nowKey) + ' 새 달이 시작됐어요!');
}

// =========================================
// 탭 전환
// =========================================

function showPage(name, tabEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  tabEl.classList.add('active');

  if (name === 'dashboard') renderDashboard();
  if (name === 'record')    renderRecord();
  if (name === 'history')   renderHistory();
  if (name === 'settings')  renderSettings();
}

// =========================================
// 수입/지출 타입 전환
// =========================================

function setType(type) {
  currentType = type;
  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;

  // 분류 드롭다운 업데이트
  document.getElementById('cat').innerHTML = cats.map(c => `<option>${c}</option>`).join('');

  // 오늘 날짜 자동 입력 (이미 값 있으면 유지)
  const dateEl = document.getElementById('date');
  if (!dateEl.value) {
    dateEl.value = todayStr();
  }

  // 버튼 스타일 — 선택된 버튼에만 색 표시
  document.getElementById('t-income').className  = 'type-btn' + (type === 'income'  ? ' on-income'  : '');
  document.getElementById('t-expense').className = 'type-btn' + (type === 'expense' ? ' on-expense' : '');

  // 추가 버튼 색
  const btn = document.getElementById('add-btn');
  btn.className = 'add-btn ' + type;
  btn.textContent = type === 'income' ? '+ 수입 추가' : '+ 지출 추가';
}

// =========================================
// 항목 추가 / 삭제
// =========================================

function addItem() {
  if (!isCurrentMonth()) {
    alert('현재 달에서만 기입할 수 있어요.');
    return;
  }

  const amount = parseFloat(document.getElementById('amount').value);
  const cat    = document.getElementById('cat').value;
  const date   = document.getElementById('date').value || todayStr();
  const memo   = document.getElementById('memo').value.trim();

  if (!amount || amount <= 0) {
    alert('금액을 입력해주세요.');
    return;
  }

  currentItems().push({ id: nextId++, type: currentType, cat, amount, date, memo });
  document.getElementById('amount').value = '';
  document.getElementById('memo').value   = '';
  document.getElementById('date').value   = todayStr(); // 다음 입력을 위해 오늘로 리셋
  saveToStorage();
  renderRecord();
  renderDashboard();
}

function deleteItem(id) {
  if (!isCurrentMonth()) return;
  getMonthData(viewKey).items = currentItems().filter(i => i.id !== id);
  saveToStorage();
  renderRecord();
  renderDashboard();
}

// =========================================
// 렌더링 — 예산 현황 탭
// =========================================

function renderDashboard() {
  document.getElementById('dash-month-title').textContent = keyToLabel(viewKey);

  const items   = currentItems();
  const bud     = currentBudget();
  const income  = items.filter(i => i.type === 'income').reduce((s, i) => s + i.amount, 0);
  const expense = items.filter(i => i.type === 'expense').reduce((s, i) => s + i.amount, 0);
  const balance = income - expense;

  document.getElementById('s-income').textContent  = fmt(income);
  document.getElementById('s-expense').textContent = fmt(expense);
  const balEl = document.getElementById('s-balance');
  balEl.textContent  = fmt(balance);
  balEl.style.color  = balance >= 0 ? '#1D9E75' : '#D85A30';

  // 카테고리별 지출 집계
  const expBycat = {};
  EXPENSE_CATS.forEach(c => (expBycat[c] = 0));
  items.filter(i => i.type === 'expense').forEach(i => {
    if (expBycat[i.cat] !== undefined) expBycat[i.cat] += i.amount;
  });

  // 잔여 카드
  document.getElementById('remain-grid').innerHTML = EXPENSE_CATS.map(cat => {
    const b      = bud[cat] || 0;
    const spent  = expBycat[cat] || 0;
    const remain = b - spent;
    const pct    = b > 0 ? Math.min(100, Math.round((spent / b) * 100)) : 0;
    const barColor    = pct >= 90 ? '#D85A30' : pct >= 70 ? '#BA7517' : (BAR_COLORS[cat] || '#1D9E75');
    const remainColor = remain < 0 ? '#D85A30' : pct >= 70 ? '#BA7517' : '#1D9E75';

    return `
      <div class="remain-card">
        <div class="rc-top">
          <span class="rc-cat">${cat}</span>
          <span class="rc-pct">${pct}% 사용</span>
        </div>
        <div class="progress-bg">
          <div class="progress-bar" style="width:${pct}%; background:${barColor};"></div>
        </div>
        <div class="rc-nums">
          <span class="rc-spent">지출 ${fmt(spent)}</span>
          <span style="font-weight:600; color:${remainColor};">잔여 ${fmt(remain)}</span>
        </div>
      </div>`;
  }).join('');

  // 막대 그래프
  const maxVal = Math.max(...EXPENSE_CATS.map(c => Math.max(bud[c] || 0, expBycat[c] || 0)), 1);
  document.getElementById('bar-chart').innerHTML = EXPENSE_CATS.map(cat => {
    const b     = bud[cat] || 0;
    const e     = expBycat[cat] || 0;
    const bW    = Math.round((b / maxVal) * 100);
    const eW    = Math.round((e / maxVal) * 100);
    const color = BAR_COLORS[cat] || '#1D9E75';

    return `
      <div class="bar-row">
        <span class="bar-cat-label">${cat}</span>
        <div class="bar-tracks">
          <div class="bar-track"><div class="bar-fill" style="width:${bW}%; background:#ddd;"></div></div>
          <div class="bar-track"><div class="bar-fill" style="width:${eW}%; background:${color};"></div></div>
        </div>
        <div class="bar-values">
          <span class="bar-budget-val">${fmt(b)}</span>
          <span class="bar-expense-val" style="color:${color};">${fmt(e)}</span>
        </div>
      </div>`;
  }).join('');
}

// =========================================
// 렌더링 — 수입/지출 탭
// =========================================

function renderRecord() {
  document.getElementById('rec-month-title').textContent = keyToLabel(viewKey);

  const isCurrent = isCurrentMonth();
  document.getElementById('readonly-notice').style.display = isCurrent ? 'none'  : 'block';
  document.getElementById('input-section').style.display   = isCurrent ? 'block' : 'none';

  const items = currentItems();
  const tbody = document.getElementById('list-body');

  if (items.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">아직 내역이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = [...items].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(item => {
    const isIncome = item.type === 'income';
    const color    = isIncome ? '#1D9E75' : '#D85A30';
    const sign     = isIncome ? '+' : '-';
    const label    = isIncome ? '수입' : '지출';
    const delBtn   = isCurrent ? `<button class="del" onclick="deleteItem(${item.id})">×</button>` : '';

    return `
      <tr>
        <td style="color:#888;">${fmtDate(item.date)}</td>
        <td><span class="dot" style="background:${color};"></span>${label}</td>
        <td>${item.cat}</td>
        <td style="font-weight:600; color:${color};">${sign}${fmt(item.amount)}</td>
        <td style="color:#888;">${item.memo || '-'}</td>
        <td>${delBtn}</td>
      </tr>`;
  }).join('');
}

// =========================================
// 렌더링 — 월별 내역 탭
// =========================================

function renderHistory() {
  const keys = Object.keys(monthData).sort().reverse();
  const el   = document.getElementById('history-content');

  if (keys.length === 0) {
    el.innerHTML = '<p style="color:#aaa; font-size:14px; padding:1rem 0;">아직 저장된 달이 없습니다.</p>';
    return;
  }

  el.innerHTML = keys.map(key => {
    const items   = monthData[key].items;
    const income  = items.filter(i => i.type === 'income').reduce((s, i) => s + i.amount, 0);
    const expense = items.filter(i => i.type === 'expense').reduce((s, i) => s + i.amount, 0);

    const rows = items.length === 0
      ? '<tr class="empty-row"><td colspan="5">내역 없음</td></tr>'
      : [...items].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(item => {
          const isIncome = item.type === 'income';
          const color = isIncome ? '#1D9E75' : '#D85A30';
          return `
            <tr>
              <td style="color:#888;">${fmtDate(item.date)}</td>
              <td><span class="dot" style="background:${color};"></span>${isIncome ? '수입' : '지출'}</td>
              <td>${item.cat}</td>
              <td style="font-weight:600; color:${color};">${isIncome ? '+' : '-'}${fmt(item.amount)}</td>
              <td style="color:#888;">${item.memo || '-'}</td>
            </tr>`;
        }).join('');

    return `
      <div style="margin-bottom:1.25rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div class="history-month-title">${keyToLabel(key)}</div>
          <div style="font-size:12px; color:#888;">
            수입 <span style="color:#1D9E75; font-weight:600;">${fmt(income)}</span> &nbsp;
            지출 <span style="color:#D85A30; font-weight:600;">${fmt(expense)}</span> &nbsp;
            잔액 <span style="font-weight:600;">${fmt(income - expense)}</span>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>날짜</th><th>구분</th><th>분류</th><th>금액</th><th>메모</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }).join('');
}

// =========================================
// 렌더링 — 예산 설정 탭
// =========================================

function renderSettings() {
  document.getElementById('budget-setting').innerHTML = EXPENSE_CATS.map(cat => `
    <div class="bs-card">
      <div class="bs-label">${cat}</div>
      <div class="bs-display" id="display-${cat}" onclick="editBudget('${cat}')">
        <span class="bs-amount">${fmt(budget[cat] || 0)}</span>
        <span class="bs-edit-hint">수정</span>
      </div>
      <div class="bs-row" id="edit-${cat}" style="display:none;">
        <input type="number" id="bs-${cat}" value="${budget[cat] || 0}" min="0"
          onkeydown="if(event.key==='Enter') saveBudget('${cat}')" />
        <button class="bs-save" onclick="saveBudget('${cat}')">저장</button>
      </div>
      <div class="saved-tag" id="saved-${cat}">저장됐어요!</div>
    </div>`).join('');
}

function editBudget(cat) {
  document.getElementById('display-' + cat).style.display = 'none';
  document.getElementById('edit-' + cat).style.display = 'flex';
  document.getElementById('bs-' + cat).focus();
}

function saveBudget(cat) {
  const val = parseFloat(document.getElementById('bs-' + cat).value) || 0;
  budget[cat] = val;
  getMonthData(viewKey).budget[cat] = val;
  renderDashboard();

  // 편집 → 표시 모드로 전환
  document.getElementById('edit-' + cat).style.display = 'none';
  const displayEl = document.getElementById('display-' + cat);
  displayEl.querySelector('.bs-amount').textContent = fmt(val);
  displayEl.style.display = 'flex';

  const tag = document.getElementById('saved-' + cat);
  tag.style.display = 'block';
  setTimeout(() => { tag.style.display = 'none'; }, 1500);
  saveToStorage();
}

// =========================================
// 앱 초기화
// =========================================

loadFromStorage();
getMonthData(viewKey);
setType('income');
renderDashboard();

// =========================================
// localStorage 저장 / 불러오기
// =========================================

const STORAGE_KEY = 'budget-app-data';

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ budget, monthData, nextId }));
  } catch (e) {
    console.warn('저장 실패:', e);
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.budget)    budget    = data.budget;
    if (data.monthData) monthData = data.monthData;
    if (data.nextId)    nextId    = data.nextId;
  } catch (e) {
    console.warn('불러오기 실패:', e);
  }
}