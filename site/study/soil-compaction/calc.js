// site/study/soil-compaction/calc.js — 계산기 화면: 입력 읽기 → compaction.js 계산 → 결과 표시 + SVG 플롯 (ES module)
import { fitProctor, zavDensity, evaluate, validate } from './compaction.js';

const $ = id => document.getElementById(id);
const form = $('calc');
if (form) {
  const SVG = 'http://www.w3.org/2000/svg';
  const num = name => parseFloat(form.elements[name].value);
  const fmt = (v, d = 1) => Number.isFinite(v) ? v.toFixed(d) : '—';

  function readInputs() {
    const errors = [];
    const points = [];
    for (let i = 1; i <= 5; i++) {
      const w = num('w' + i), wet = num('g' + i);
      if (form.elements['w' + i].value === '' && form.elements['g' + i].value === '') continue; // 빈 행은 무시
      const ew = validate('w', w), eg = validate('wet', wet);
      if (ew) errors.push(`Point ${i} water content: ${ew}.`);
      if (eg) errors.push(`Point ${i} wet unit weight: ${eg}.`);
      if (!ew && !eg) points.push({ w, wet });
    }
    const fields = { gs: ['Gs', 'Specific gravity'], gdf: ['gd', 'Field dry unit weight'], wf: ['w', 'Field water content'],
      spec: ['spec', 'Required compaction'], lo: ['window', 'Moisture window (below)'], hi: ['window', 'Moisture window (above)'] };
    const v = {};
    for (const [name, [limit, label]] of Object.entries(fields)) {
      v[name] = num(name);
      const e = validate(limit, v[name]);
      if (e) errors.push(`${label}: ${e}.`);
    }
    if (Number.isFinite(v.lo) && Number.isFinite(v.hi) && v.lo > v.hi) errors.push('Moisture window: the lower limit must not exceed the upper limit.');
    return { points, ...v, errors };
  }

  function el(tag, attrs, text) {
    const n = document.createElementNS(SVG, tag);
    for (const [k, val] of Object.entries(attrs)) n.setAttribute(k, val);
    if (text != null) n.textContent = text;
    return n;
  }

  // 플롯: x = 함수비(%), y = 건조단위중량(pcf). 색은 theme.css 토큰만 쓴다.
  function draw(fit, gs, field) {
    const svg = $('calc-plot');
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const L = 76, R = 700, T = 24, B = 306; // 플롯 영역
    const xMin = fit.wMin - 2, xMax = fit.wMax + 2;
    const dryVals = fit.points.map(p => p.dry).concat(Number.isFinite(field.gd) ? [field.gd] : []);
    const yMin = Math.floor(Math.min(...dryVals) - 4), yMax = Math.ceil(Math.max(...dryVals, fit.gdMax) + 8);
    const X = w => L + (w - xMin) / (xMax - xMin) * (R - L);
    const Y = g => B - (g - yMin) / (yMax - yMin) * (B - T);
    const g = el('g', { 'font-family': 'var(--font-mono)', 'font-size': '12', fill: 'var(--muted)' });
    svg.appendChild(g);
    // 격자·축
    for (let w = Math.ceil(xMin); w <= xMax; w += 2) {
      g.appendChild(el('line', { x1: X(w), y1: T, x2: X(w), y2: B, stroke: 'var(--border)', 'stroke-width': 1 }));
      g.appendChild(el('text', { x: X(w), y: B + 18, 'text-anchor': 'middle' }, String(w)));
    }
    const yStep = (yMax - yMin) > 30 ? 10 : 5;
    for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
      g.appendChild(el('line', { x1: L, y1: Y(y), x2: R, y2: Y(y), stroke: 'var(--border)', 'stroke-width': 1 }));
      g.appendChild(el('text', { x: L - 8, y: Y(y) + 4, 'text-anchor': 'end' }, String(y)));
    }
    g.appendChild(el('line', { x1: L, y1: B, x2: R, y2: B, stroke: 'var(--dark)', 'stroke-width': 1.5 }));
    g.appendChild(el('line', { x1: L, y1: T, x2: L, y2: B, stroke: 'var(--dark)', 'stroke-width': 1.5 }));
    g.appendChild(el('text', { x: (L + R) / 2, y: 344, 'text-anchor': 'middle', fill: 'var(--dark)' }, 'water content, w (%)'));
    g.appendChild(el('text', { x: 18, y: (T + B) / 2, 'text-anchor': 'middle', fill: 'var(--dark)', transform: `rotate(-90 18 ${(T + B) / 2})` }, 'dry unit weight (pcf)'));
    // 영공기간극선(플롯 범위 안만)
    if (Number.isFinite(gs)) {
      const pts = [];
      for (let i = 0; i <= 60; i++) { const w = xMin + (xMax - xMin) * i / 60, z = zavDensity(gs, w); if (z >= yMin && z <= yMax) pts.push(`${X(w).toFixed(1)},${Y(z).toFixed(1)}`); }
      if (pts.length > 1) g.appendChild(el('polyline', { points: pts.join(' '), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2, 'stroke-dasharray': '7 5' }));
      g.appendChild(el('text', { x: R - 4, y: T + 14, 'text-anchor': 'end', fill: 'var(--amber)' }, `zero air voids, Gs = ${fmt(gs, 2)}`));
    }
    // 적합 곡선(시험 범위 안)
    if (!fit.flags.includes('no-peak')) {
      const pts = [];
      for (let i = 0; i <= 40; i++) { const w = fit.wMin + (fit.wMax - fit.wMin) * i / 40; pts.push(`${X(w).toFixed(1)},${Y(fit.a * w * w + fit.b * w + fit.c).toFixed(1)}`); }
      g.appendChild(el('polyline', { points: pts.join(' '), fill: 'none', stroke: 'var(--royal)', 'stroke-width': 3 }));
      g.appendChild(el('line', { x1: X(fit.wOpt), y1: Y(fit.gdMax), x2: X(fit.wOpt), y2: B, stroke: 'var(--royal)', 'stroke-width': 1, 'stroke-dasharray': '4 4' }));
      g.appendChild(el('text', { x: X(fit.wOpt) + 6, y: Y(fit.gdMax) - 8, fill: 'var(--royal)' }, `optimum ${fmt(fit.wOpt)} % · ${fmt(fit.gdMax)} pcf`));
    }
    for (const p of fit.points) g.appendChild(el('circle', { cx: X(p.w), cy: Y(p.dry), r: 5, fill: 'var(--royal)', stroke: 'var(--bg)', 'stroke-width': 1.5 }));
    // 현장 점(마름모)
    if (Number.isFinite(field.gd) && Number.isFinite(field.w)) {
      const x = X(field.w), y = Y(field.gd);
      g.appendChild(el('polygon', { points: `${x},${y - 7} ${x + 7},${y} ${x},${y + 7} ${x - 7},${y}`, fill: field.pass ? 'var(--green)' : 'var(--amber)', stroke: 'var(--dark)', 'stroke-width': 1 }));
      g.appendChild(el('text', { x: x + 10, y: y + 4, fill: 'var(--dark)' }, `field ${fmt(field.gd)} pcf`));
    }
    svg.setAttribute('aria-label', `Compaction curve: optimum ${fmt(fit.wOpt)} percent, maximum dry unit weight ${fmt(fit.gdMax)} pcf; field test ${fmt(field.gd)} pcf at ${fmt(field.w)} percent`);
  }

  function update() {
    const inp = readInputs();
    $('calc-errors').textContent = inp.errors.join(' ');
    const fit = fitProctor(inp.points);
    for (let i = 1; i <= 5; i++) { const p = fit.points[i - 1]; $('dry' + i).textContent = p ? fmt(p.dry) : '—'; }
    if (fit.error || inp.errors.length) {
      for (const id of ['out-wopt', 'out-gdmax', 'out-percent', 'out-verdict']) $(id).textContent = '—';
      $('out-verdict').className = '';
      $('out-notes').textContent = fit.error || 'Fix the highlighted inputs to see a result.';
      return;
    }
    const res = evaluate({ gdField: inp.gdf, wField: inp.wf, gdMax: fit.gdMax, wOpt: fit.wOpt, specPct: inp.spec, lo: inp.lo, hi: inp.hi });
    $('out-wopt').textContent = `${fmt(fit.wOpt)} %`;
    $('out-gdmax').textContent = `${fmt(fit.gdMax)} pcf`;
    $('out-percent').textContent = `${fmt(res.percent)} % of ${fmt(fit.gdMax)} pcf`;
    const verdict = $('out-verdict');
    verdict.textContent = res.pass ? 'PASS' : 'FAIL';
    verdict.className = res.pass ? 'verdict-pass' : 'verdict-fail';
    const notes = [];
    if (res.reasons.length) notes.push(`Reasons: ${res.reasons.join(', ')} (window ${fmt(fit.wOpt + inp.lo)} to ${fmt(fit.wOpt + inp.hi)} %).`);
    if (fit.flags.includes('no-peak')) notes.push('The points do not show a peak; the highest point is used. Add points on the other side of the optimum.');
    if (fit.flags.includes('outside-range')) notes.push('The fitted optimum lies outside the tested water contents; add a point beyond it before trusting the maximum.');
    $('out-notes').textContent = notes.join(' ');
    draw(fit, inp.gs, { gd: inp.gdf, w: inp.wf, pass: res.pass });
  }

  form.addEventListener('input', update);
  form.addEventListener('submit', e => { e.preventDefault(); update(); });
  update();
}
