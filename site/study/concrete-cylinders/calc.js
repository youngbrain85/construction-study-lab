// site/study/concrete-cylinders/calc.js — 공시체 계산기 화면 (ES module): 입력 읽기 → cylinders.js 계산 → 표·요약·플롯 2개
import { strength, evaluateTests, ageCurve, ageRatio, AGE_COEFF, RANGE_LIMIT, AREA, validate } from './cylinders.js';

const $ = id => document.getElementById(id);
const form = $('calc');
if (form) {
  const SVG = 'http://www.w3.org/2000/svg';
  const N = 6, COLS = ['a', 'b', 'c'], DAYS = [1, 3, 7, 14, 28, 56, 90];
  const fmt = n => Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—';
  const num = name => parseFloat(form.elements[name].value);

  function el(tag, attrs, text) {
    const n = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text != null) n.textContent = text;
    return n;
  }
  function measure(node) { // 렌더 전에는 getBBox 가 실패할 수 있다 → null
    try { const b = node.getBBox(); if (b && b.width > 0) return b; } catch (e) { /* 측정 불가 */ }
    return null;
  }
  function textWidth(node) {
    try { const w = node.getComputedTextLength(); if (w > 0) return w; } catch (e) { /* 측정 불가 */ }
    return node.textContent.length * 7.2; // 12 단위 모노 글꼴의 대략적 폭
  }
  // 라벨 뒤에 배경색 후광 사각형을 까는 공용 헬퍼(placeLabel 과 시험 평균 라벨이 함께 쓴다)
  function addHalo(g, label) {
    const box = measure(label);
    if (box) g.insertBefore(el('rect', { x: box.x - 3, y: box.y - 2, width: box.width + 6, height: box.height + 4, fill: 'var(--surface)' }), label);
  }
  // 라벨을 플롯 상자 안에 넣고(anchor 반전) 배경색 후광을 깐다
  function placeLabel(g, x, y, text, fill, L, R) {
    const label = el('text', { x, y, fill }, text);
    g.appendChild(label);
    const w = textWidth(label);
    if (x + w > R) { label.setAttribute('x', Math.max(L, x - w)); }
    addHalo(g, label);
    return label;
  }
  function clearSvg(svg, aria) { while (svg.firstChild) svg.removeChild(svg.firstChild); svg.setAttribute('aria-label', aria); }

  function readInputs() {
    const errors = [];
    const size = form.elements.size.value, need = size === '4x8' ? 3 : 2;
    const fc = num('fc'); const efc = validate('fc', fc); if (efc) errors.push(`Specified strength: ${efc}.`);
    const f28 = num('f28'); const e28 = validate('f28', f28); if (e28) errors.push(`28-day strength: ${e28}.`);
    const tests = [], short = [];
    for (let i = 1; i <= N; i++) {
      const loads = [];
      for (const c of COLS.slice(0, need)) {
        const raw = form.elements['l' + i + c].value;
        if (raw === '') continue;
        const v = parseFloat(raw), e = validate('load', v);
        if (e) errors.push(`Test ${i} cylinder ${c.toUpperCase()}: ${e}.`); else loads.push(v);
      }
      if (!loads.length) continue; // 빈 행은 건너뛴다(행 번호는 유지)
      if (loads.length < need) short.push(i);
      tests.push({ id: i, strengths: loads.map(P => strength(P, size)), size });
    }
    return { size, need, fc, f28, cement: form.elements.cement.value, tests, short, errors };
  }

  function resetRows() {
    for (let i = 1; i <= N; i++) for (const p of ['str-', 'avg-', 'critb-', 'avg3-']) { const c = $(p + i); c.textContent = '—'; c.className = 'out'; }
  }
  function showNothing(message) {
    resetRows();
    for (const id of ['out-limit', 'out-count', 'out-verdict', 'out-f7']) $(id).textContent = '—';
    $('out-verdict').className = '';
    $('out-reasons').textContent = ''; $('out-notes').textContent = message;
    for (const td of $('age-table').querySelectorAll('td')) if (!td.matches(':first-child')) td.textContent = '—';
    clearSvg($('calc-control'), 'No result — fix the inputs to see the control chart');
    clearSvg($('calc-age'), 'No result — fix the inputs to see the age curve');
  }

  // 플롯 1: 시험별 강도 관리도
  function drawControl(res, fc) {
    const svg = $('calc-control'); clearSvg(svg, '');
    const L = 80, R = 700, T = 24, B = 250;
    const vals = res.tests.map(t => t.avg).concat([fc, res.limitB]);
    const min = Math.min(...vals), max = Math.max(...vals);
    // 눈금 간격을 원래 값 범위에서 먼저 정하고, 그 간격의 배수로 축의 min/max 를 잡는다 — 그래야 눈금이 항상 간격의 배수에 놓인다
    const span = max - min + 600, step = span > 2000 ? 500 : 250;
    const yMin = Math.floor((min - 300) / step) * step, yMax = Math.ceil((max + 300) / step) * step;
    const X = i => L + (i - 0.5) / N * (R - L), Y = v => B - (v - yMin) / (yMax - yMin) * (B - T);
    const g = el('g', { 'font-family': 'var(--font-mono)', 'font-size': '12', fill: 'var(--muted)' }); svg.appendChild(g);
    for (let v = yMin; v <= yMax; v += step) {
      g.appendChild(el('line', { x1: L, y1: Y(v), x2: R, y2: Y(v), stroke: 'var(--border)', 'stroke-width': 1 }));
      g.appendChild(el('text', { x: L - 8, y: Y(v) + 4, 'text-anchor': 'end' }, fmt(v)));
    }
    for (let i = 1; i <= N; i++) g.appendChild(el('text', { x: X(i), y: B + 18, 'text-anchor': 'middle' }, `T${i}`));
    g.appendChild(el('line', { x1: L, y1: B, x2: R, y2: B, stroke: 'var(--dark)', 'stroke-width': 1.5 }));
    g.appendChild(el('line', { x1: L, y1: T, x2: L, y2: B, stroke: 'var(--dark)', 'stroke-width': 1.5 }));
    g.appendChild(el('text', { x: (L + R) / 2, y: 288, 'text-anchor': 'middle', fill: 'var(--dark)' }, 'strength test (in order)'));
    g.appendChild(el('text', { x: 18, y: (T + B) / 2, 'text-anchor': 'middle', fill: 'var(--dark)', transform: `rotate(-90 18 ${(T + B) / 2})` }, 'psi'));
    g.appendChild(el('line', { x1: L, y1: Y(fc), x2: R, y2: Y(fc), stroke: 'var(--royal)', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }));
    placeLabel(g, L + 6, Y(fc) - 6, `f'c ${fmt(fc)} psi`, 'var(--royal)', L, R);
    g.appendChild(el('line', { x1: L, y1: Y(res.limitB), x2: R, y2: Y(res.limitB), stroke: 'var(--amber)', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }));
    placeLabel(g, L + 6, Y(res.limitB) + 16, `criterion (b) limit ${fmt(res.limitB)} psi`, 'var(--amber)', L, R);
    // 시험 평균을 먼저 그린다(실선 + 원/마름모 + 후광 라벨) — 3회 이동평균을 나중에 겹쳐 그려 후광이 사각형을 가리지 않게 한다(검증 스크린샷에서 발견)
    if (res.tests.length > 1) g.appendChild(el('polyline', { points: res.tests.map(t => `${X(t.id).toFixed(1)},${Y(t.avg).toFixed(1)}`).join(' '), fill: 'none', stroke: 'var(--royal)', 'stroke-width': 2.5 }));
    for (const t of res.tests) {
      const x = X(t.id), y = Y(t.avg);
      if (t.okB) g.appendChild(el('circle', { cx: x, cy: y, r: 5, fill: 'var(--royal)', stroke: 'var(--bg)', 'stroke-width': 1.5 }));
      else g.appendChild(el('polygon', { points: `${x},${y - 7} ${x + 7},${y} ${x},${y + 7} ${x - 7},${y}`, fill: 'var(--amber)', stroke: 'var(--dark)', 'stroke-width': 1 }));
      const avgLabel = el('text', { x, y: y - 10, 'text-anchor': 'middle', fill: 'var(--dark)' }, fmt(t.avg));
      g.appendChild(avgLabel);
      addHalo(g, avgLabel);
    }
    // 3회 이동평균(점선 + 사각형)을 위에 겹쳐 그린다
    const a3 = res.tests.filter(t => t.avg3 != null);
    if (a3.length > 1) g.appendChild(el('polyline', { points: a3.map(t => `${X(t.id).toFixed(1)},${Y(t.avg3).toFixed(1)}`).join(' '), fill: 'none', stroke: 'var(--dark)', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }));
    for (const t of a3) g.appendChild(el('rect', { x: X(t.id) - 4, y: Y(t.avg3) - 4, width: 8, height: 8, fill: t.okA ? 'var(--dark)' : 'var(--amber)' }));
    g.appendChild(el('text', { x: R - 4, y: T + 12, 'text-anchor': 'end' }, 'circles: test averages · squares: 3-test averages'));
    svg.setAttribute('aria-label', `Control chart: ${res.tests.length} strength tests, specified strength ${fmt(fc)} psi, ${res.pass ? 'all criteria met' : 'criteria not met'}`);
  }

  // 플롯 2: 재령 곡선
  function drawAge(f28, coeff, curve) {
    const svg = $('calc-age'); clearSvg(svg, '');
    const L = 80, R = 700, T = 24, B = 250;
    const yMax = Math.ceil((Math.max(...curve.map(p => p.f)) + 500) / 500) * 500;
    const X = t => L + t / 90 * (R - L), Y = v => B - v / yMax * (B - T);
    const g = el('g', { 'font-family': 'var(--font-mono)', 'font-size': '12', fill: 'var(--muted)' }); svg.appendChild(g);
    const step = yMax > 6000 ? 2000 : 1000;
    for (let v = 0; v <= yMax; v += step) {
      g.appendChild(el('line', { x1: L, y1: Y(v), x2: R, y2: Y(v), stroke: 'var(--border)', 'stroke-width': 1 }));
      g.appendChild(el('text', { x: L - 8, y: Y(v) + 4, 'text-anchor': 'end' }, fmt(v)));
    }
    for (const d of [0, 14, 28, 42, 56, 70, 84]) g.appendChild(el('text', { x: X(d), y: B + 18, 'text-anchor': 'middle' }, String(d)));
    g.appendChild(el('line', { x1: L, y1: B, x2: R, y2: B, stroke: 'var(--dark)', 'stroke-width': 1.5 }));
    g.appendChild(el('line', { x1: L, y1: T, x2: L, y2: B, stroke: 'var(--dark)', 'stroke-width': 1.5 }));
    g.appendChild(el('text', { x: (L + R) / 2, y: 288, 'text-anchor': 'middle', fill: 'var(--dark)' }, 'age, days'));
    g.appendChild(el('text', { x: 18, y: (T + B) / 2, 'text-anchor': 'middle', fill: 'var(--dark)', transform: `rotate(-90 18 ${(T + B) / 2})` }, 'psi'));
    g.appendChild(el('line', { x1: L, y1: Y(f28), x2: R, y2: Y(f28), stroke: 'var(--royal)', 'stroke-width': 1, 'stroke-dasharray': '4 4' }));
    placeLabel(g, R - 4 - 120, Y(f28) - 6, `28-day ${fmt(f28)} psi`, 'var(--royal)', L, R);
    const pts = [];
    for (let i = 0; i <= 60; i++) { const t = 0.5 + (90 - 0.5) * i / 60; pts.push(`${X(t).toFixed(1)},${Y(f28 * ageRatio(t, coeff)).toFixed(1)}`); }
    g.appendChild(el('polyline', { points: pts.join(' '), fill: 'none', stroke: 'var(--royal)', 'stroke-width': 3 }));
    for (const p of curve) {
      g.appendChild(el('circle', { cx: X(p.t), cy: Y(p.f), r: 4.5, fill: 'var(--dark)', stroke: 'var(--bg)', 'stroke-width': 1.5 }));
      if (p.t !== 28) placeLabel(g, X(p.t) + 6, Y(p.f) + (p.t < 28 ? 16 : -8), `${p.t} d · ${fmt(p.f)}`, 'var(--dark)', L, R);
    }
    svg.setAttribute('aria-label', `Estimated strength versus age from ${fmt(f28)} psi at 28 days: ${curve.map(p => `${p.t} days ${fmt(p.f)} psi`).join(', ')}`);
  }

  function update() {
    const inp = readInputs();
    for (const cell of document.querySelectorAll('.col-c')) cell.hidden = inp.size !== '4x8'; // 4 × 8 만 세 번째 공시체 열
    $('calc-errors').textContent = inp.errors.join(' ');
    if (inp.errors.length) { showNothing('Fix the inputs listed above to see a result.'); return; }
    const res = evaluateTests(inp.tests, inp.fc, inp.size);
    if (res.error) { showNothing(res.error); return; }
    resetRows();
    for (const t of res.tests) {
      const src = inp.tests.find(x => x.id === t.id);
      $('str-' + t.id).textContent = src.strengths.map(fmt).join(' / ');
      $('avg-' + t.id).textContent = fmt(t.avg) + (t.rangeWide ? ' !' : '');
      const b = $('critb-' + t.id); b.textContent = t.okB ? 'OK' : 'low'; b.className = 'out ' + (t.okB ? 'ok' : 'bad');
      const a = $('avg3-' + t.id);
      if (t.avg3 != null) { a.textContent = `${fmt(t.avg3)} · ${t.okA ? 'OK' : 'low'}`; a.className = 'out ' + (t.okA ? 'ok' : 'bad'); }
    }
    $('out-limit').textContent = `${fmt(res.limitB)} psi`;
    $('out-count').textContent = `${res.tests.length} of ${N}`;
    const verdict = $('out-verdict');
    if (res.tests.length < 3) { // 3회 미만이면 기준 (a)를 아직 판정할 수 없다 — ACCEPTED 를 참칭하지 않는다
      const bMet = res.tests.every(t => t.okB);
      verdict.textContent = bMet ? '(b) met · (a) pending' : '(b) not met · (a) pending';
      verdict.className = 'verdict-fail';
    } else {
      verdict.textContent = res.pass ? 'ACCEPTED' : 'NOT ACCEPTED';
      verdict.className = res.pass ? 'verdict-pass' : 'verdict-fail';
    }
    $('out-reasons').textContent = res.reasons.join(' ');
    const notes = [];
    for (const t of res.tests) if (t.rangeWide) notes.push(`Test ${t.id}: the cylinders differ by ${t.rangePct.toFixed(1)} % of their average — wider than the method's usual spread (about ${RANGE_LIMIT[inp.size]} %); check that test before using it.`);
    for (const i of inp.short) notes.push(`Test ${i} has fewer cylinders than a ${inp.size === '4x8' ? '4 × 8 test needs (three)' : '6 × 12 test needs (two)'}.`);
    if (res.tests.length < 3) notes.push('Criterion (a) needs at least three consecutive tests.');
    $('out-notes').textContent = notes.join(' ');
    const coeff = AGE_COEFF[inp.cement], curve = ageCurve(inp.f28, coeff, DAYS);
    $('out-f7').textContent = `${fmt(curve.find(p => p.t === 7).f)} psi`;
    const cells = [...$('age-table').querySelectorAll('td')].slice(1);
    curve.forEach((p, i) => { cells[i].textContent = fmt(p.f); });
    drawControl(res, inp.fc);
    drawAge(inp.f28, coeff, curve);
  }

  // 크기를 바꾸면 하중을 새 단면적 비율로 환산한다 — 그러면 강도(하중/면적)는 그대로고, 4 x 8 이 훨씬 작은 하중에서
  // 깨진다는 것이 화면에서 바로 드러난다. change 리스너는 select 자신에게 달아서 form 의 위임 change(→ update)보다
  // 먼저 실행되게 한다(타깃 단계가 버블 단계보다 항상 먼저 끝난다).
  let prevSize = form.elements.size.value;
  $('size').addEventListener('change', () => {
    const newSize = form.elements.size.value;
    if (newSize === prevSize) return;
    const factor = AREA[newSize] / AREA[prevSize];
    for (let i = 1; i <= N; i++) for (const c of COLS) {
      const field = form.elements['l' + i + c];
      if (!field || field.value === '') continue;
      const v = parseFloat(field.value);
      if (Number.isFinite(v)) field.value = String(Math.round(v * factor / 100) * 100);
    }
    prevSize = newSize;
  });

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', e => { e.preventDefault(); update(); });
  update();
}
