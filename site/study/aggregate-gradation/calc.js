// site/study/aggregate-gradation/calc.js — 체가름 계산기 화면 (ES module): 체 표 생성 → gradation.js 계산 → 표·요약·반대수 플롯
import { SIEVES, DEFAULTS, FINE_LIMITS, COARSE_LIMITS, FINES_LIMIT, FM_RANGE, MAX_SINGLE_FRACTION, analyze, finenessModulus, checkLimits, maxSingleFraction, nominalMaxSize, massCheck, validate } from './gradation.js';

const $ = id => document.getElementById(id);
const form = $('calc');
if (form) {
  const SVG = 'http://www.w3.org/2000/svg';
  const fmt1 = v => Number.isFinite(v) ? v.toFixed(1) : '—';
  const fmtG = v => Number.isFinite(v) ? Math.round(v).toLocaleString('en-US') : '—';
  let mode = form.elements.mode.value;

  function el(tag, attrs, text) {
    const n = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text != null) n.textContent = text;
    return n;
  }
  function measure(node) { try { const b = node.getBBox(); if (b && b.width > 0) return b; } catch (e) { /* 렌더 전 */ } return null; }
  function addHalo(g, label) { const b = measure(label); if (b) g.insertBefore(el('rect', { x: b.x - 3, y: b.y - 2, width: b.width + 6, height: b.height + 4, fill: 'var(--surface)' }), label); }

  // 모드에 맞는 체 행을 만든다 (입력 이름 m0…, 출력 셀 pr-/cr-/pp-/ok-)
  function buildRows() {
    const tbody = $('sieve-rows');
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
    SIEVES[mode].forEach((s, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<th scope="row">${s.label}</th><td>${s.mm ? s.mm : '—'}</td>` +
        `<td><input type="number" step="0.1" min="0" name="m${i}" value="${DEFAULTS[mode][i] || ''}" aria-label="${s.label} mass retained, grams"></td>` +
        `<td class="out" id="pr-${i}">—</td><td class="out" id="cr-${i}">—</td><td class="out" id="pp-${i}">—</td><td class="out" id="ok-${i}">—</td>`;
      tbody.appendChild(tr);
    });
  }

  function readInputs() {
    const errors = [], retained = [];
    SIEVES[mode].forEach((s, i) => {
      const raw = form.elements['m' + i].value;
      if (raw === '') { retained.push(0); return; }
      const v = parseFloat(raw), e = validate('mass', v);
      if (e) errors.push(`${s.label}: ${e}.`);
      retained.push(e ? 0 : v);
    });
    const smRaw = form.elements.sampleMass.value;
    let sampleMass = NaN;
    if (smRaw !== '') { sampleMass = parseFloat(smRaw); const e = validate('mass', sampleMass); if (e) errors.push(`Sample mass: ${e}.`); }
    return { retained, sampleMass, sizeNo: form.elements.sizeNo.value, errors };
  }

  function clearSvg(aria) { const svg = $('calc-plot'); while (svg.firstChild) svg.removeChild(svg.firstChild); svg.setAttribute('aria-label', aria); }
  function showNothing(message) {
    SIEVES[mode].forEach((s, i) => { for (const p of ['pr-', 'cr-', 'pp-', 'ok-']) { const c = $(p + i); c.textContent = '—'; c.className = 'out'; } });
    for (const id of ['out-total', 'out-fm', 'out-nmas', 'out-verdict']) $(id).textContent = '—';
    $('out-verdict').className = ''; $('out-limits').textContent = ''; $('out-notes').textContent = message;
    clearSvg('No result — fix the inputs to see the grading curve');
  }

  // 반대수 플롯: x = log10(mm) 0.05–100 mm, y = 통과율
  function draw(rows, limits, checks) {
    clearSvg(''); const svg = $('calc-plot');
    const L = 80, R = 700, T = 24, B = 300, lo = Math.log10(0.05), hi = Math.log10(100);
    const X = mm => L + (Math.log10(mm) - lo) / (hi - lo) * (R - L), Y = p => B - p / 100 * (B - T);
    const g = el('g', { 'font-family': 'var(--font-mono)', 'font-size': '11', fill: 'var(--muted)' }); svg.appendChild(g);
    // 허용대 다각형 (제한이 있는 체만, 굵은 체 → 가는 체 순)
    const band = rows.filter(r => r.mm > 0 && limits[r.label]);
    if (band.length > 1) {
      const top = band.map(r => `${X(r.mm).toFixed(1)},${Y(limits[r.label][1]).toFixed(1)}`);
      const bottom = [...band].reverse().map(r => `${X(r.mm).toFixed(1)},${Y(limits[r.label][0]).toFixed(1)}`);
      g.appendChild(el('polygon', { points: top.concat(bottom).join(' '), fill: 'var(--icy)', stroke: 'var(--border)', 'stroke-width': 1 }));
    }
    for (let p = 0; p <= 100; p += 20) {
      g.appendChild(el('line', { x1: L, y1: Y(p), x2: R, y2: Y(p), stroke: 'var(--border)', 'stroke-width': 1 }));
      g.appendChild(el('text', { x: L - 8, y: Y(p) + 4, 'text-anchor': 'end' }, String(p)));
    }
    rows.filter(r => r.mm > 0).forEach((r, i) => {
      g.appendChild(el('line', { x1: X(r.mm), y1: T, x2: X(r.mm), y2: B, stroke: 'var(--border)', 'stroke-width': 1, 'stroke-dasharray': '2 4' }));
      g.appendChild(el('text', { x: X(r.mm), y: B + 16 + (i % 2) * 14, 'text-anchor': 'middle' }, r.label));
    });
    g.appendChild(el('line', { x1: L, y1: B, x2: R, y2: B, stroke: 'var(--dark)', 'stroke-width': 1.5 }));
    g.appendChild(el('line', { x1: L, y1: T, x2: L, y2: B, stroke: 'var(--dark)', 'stroke-width': 1.5 }));
    g.appendChild(el('text', { x: (L + R) / 2, y: 350, 'text-anchor': 'middle', fill: 'var(--dark)' }, 'sieve opening, mm (log scale; coarse on the right)'));
    g.appendChild(el('text', { x: 18, y: (T + B) / 2, 'text-anchor': 'middle', fill: 'var(--dark)', transform: `rotate(-90 18 ${(T + B) / 2})` }, '% passing'));
    const pts = rows.filter(r => r.mm > 0);
    if (pts.length > 1) g.appendChild(el('polyline', { points: pts.map(r => `${X(r.mm).toFixed(1)},${Y(r.passing).toFixed(1)}`).join(' '), fill: 'none', stroke: 'var(--royal)', 'stroke-width': 3 }));
    for (const r of pts) {
      const c = checks.find(k => k.label === r.label), x = X(r.mm), y = Y(r.passing);
      if (c && c.ok === false) g.appendChild(el('polygon', { points: `${x},${y - 7} ${x + 7},${y} ${x},${y + 7} ${x - 7},${y}`, fill: 'var(--amber)', stroke: 'var(--dark)', 'stroke-width': 1 }));
      else g.appendChild(el('circle', { cx: x, cy: y, r: 5, fill: 'var(--royal)', stroke: 'var(--bg)', 'stroke-width': 1.5 }));
    }
    const legend = el('text', { x: L + 8, y: T + 14, fill: 'var(--muted)' }, band.length > 1 ? 'shaded: ASTM C33 band · amber: outside the band' : 'no C33 band for this selection');
    g.appendChild(legend); addHalo(g, legend);
    const bad = checks.filter(k => k.ok === false).map(k => k.label);
    svg.setAttribute('aria-label', `Grading curve: ${pts.map(r => `${r.label} ${fmt1(r.passing)} % passing`).join(', ')}; ${bad.length ? bad.join(', ') + ' outside the C33 band' : 'all sieves within the C33 band'}`);
  }

  function update() {
    const fine = mode === 'fine';
    $('size-field').hidden = fine;
    $('lbl-fm').textContent = fine ? 'Fineness modulus' : 'Fineness modulus (coarse)';
    const inp = readInputs();
    $('calc-errors').textContent = inp.errors.join(' ');
    if (inp.errors.length) { showNothing('Fix the inputs listed above to see a result.'); return; }
    const res = analyze(inp.retained, SIEVES[mode]);
    if (res.error) { showNothing(res.error); return; }
    const limits = fine ? FINE_LIMITS : COARSE_LIMITS[inp.sizeNo];
    const lim = checkLimits(res.rows, limits);
    res.rows.forEach((r, i) => {
      $('pr-' + i).textContent = fmt1(r.pctRetained); $('cr-' + i).textContent = fmt1(r.cumRetained); $('pp-' + i).textContent = fmt1(r.passing);
      const c = lim.checks.find(k => k.label === r.label), cell = $('ok-' + i);
      if (!c || c.ok === null) { cell.textContent = r.label === 'pan' ? '' : '—'; cell.className = 'out'; }
      else { cell.textContent = c.ok ? `${c.min}–${c.max} OK` : `${c.min}–${c.max} out`; cell.className = 'out ' + (c.ok ? 'ok' : 'bad'); }
    });
    const fm = finenessModulus(res.rows), size = nominalMaxSize(res.rows), single = maxSingleFraction(res.rows);
    const fines = res.rows[res.rows.length - 1].pctRetained; // 팬 = No. 200 통과분(건식)
    const mc = massCheck(res.total, inp.sampleMass);
    $('out-total').textContent = `${fmtG(res.total)} g`;
    $('out-fm').textContent = fm.toFixed(2);
    $('out-nmas').textContent = size.nmas ? `${size.nmas} (max ${size.maxSize || '—'})` : '—';
    const problems = [];
    if (!lim.allOk) problems.push(`outside the band on ${lim.checks.filter(k => k.ok === false).map(k => k.label).join(', ')}`);
    if (fine && (fm < FM_RANGE[0] || fm > FM_RANGE[1])) problems.push(`FM ${fm.toFixed(2)} outside ${FM_RANGE[0]}–${FM_RANGE[1]}`);
    if (fine && !single.ok) problems.push(`${fmt1(single.pct)} % on ${single.label} exceeds the ${MAX_SINGLE_FRACTION} % single-sieve limit`);
    if (fine && fines > FINES_LIMIT) problems.push(`${fmt1(fines)} % finer than No. 200 exceeds ${FINES_LIMIT} % (abrasion service)`);
    if (mc && !mc.ok) problems.push(`sieved mass differs from the sample mass by ${fmt1(mc.diffPct)} % (limit 0.3 %) — the run is not acceptable`);
    const verdict = $('out-verdict');
    verdict.textContent = problems.length ? 'CHECK' : 'MEETS C33';
    verdict.className = problems.length ? 'verdict-fail' : 'verdict-pass';
    const n = lim.checks.filter(k => k.ok !== null).length, okN = lim.checks.filter(k => k.ok === true).length;
    $('out-limits').textContent = `${okN} of ${n} limited sieves within the ${fine ? 'C33 fine-aggregate band' : 'C33 Size ' + inp.sizeNo + ' band'}. ${problems.length ? 'Issues: ' + problems.join('; ') + '.' : ''}`;
    const notes = [];
    if (fine) notes.push(`Largest single-sieve fraction ${fmt1(single.pct)} % on ${single.label} (limit ${MAX_SINGLE_FRACTION} %). Finer than No. 200 (dry): ${fmt1(fines)} %.`);
    if (mc) notes.push(`Mass check: ${fmt1(mc.diffPct)} % difference (${mc.ok ? 'within' : 'over'} 0.3 %).`); else notes.push('Enter the dried sample mass to check the 0.3 % rule.');
    $('out-notes').textContent = notes.join(' ');
    draw(res.rows, limits, lim.checks);
  }

  buildRows();
  form.addEventListener('input', update);
  $('mode').addEventListener('change', () => { mode = form.elements.mode.value; buildRows(); update(); });
  $('sizeNo').addEventListener('change', update);
  form.addEventListener('submit', e => { e.preventDefault(); update(); });
  update();
}
