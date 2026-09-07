// tools/gradation.test.mjs — site/study/aggregate-gradation/gradation.js 계약 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
const G = await import('../site/study/aggregate-gradation/gradation.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const fine = G.analyze(G.DEFAULTS.fine, G.SIEVES.fine);
const coarse = G.analyze(G.DEFAULTS.coarse, G.SIEVES.coarse);

test('SIEVES: fine and coarse nests in decreasing opening, pan last', () => {
  assert.deepEqual(G.SIEVES.fine.map(s => s.label), ['3/8 in', 'No. 4', 'No. 8', 'No. 16', 'No. 30', 'No. 50', 'No. 100', 'No. 200', 'pan']);
  assert.deepEqual(G.SIEVES.coarse.map(s => s.label), ['2 in', '1-1/2 in', '1 in', '3/4 in', '1/2 in', '3/8 in', 'No. 4', 'No. 8', 'No. 16', 'pan']);
  for (const set of Object.values(G.SIEVES)) for (let i = 1; i < set.length; i++) assert.ok(set[i].mm < set[i - 1].mm, 'decreasing');
  assert.equal(G.SIEVES.fine[1].mm, 4.75); assert.equal(G.SIEVES.coarse[1].mm, 37.5);
});

test('analyze: percent retained, cumulative and passing for the fine example (500 g)', () => {
  assert.equal(fine.total, 500);
  assert.deepEqual(fine.rows.map(r => r.passing), [100, 97.6, 84, 62, 36, 15, 4, 1.2, 0]);
  assert.deepEqual(fine.rows.map(r => r.cumRetained), [0, 2.4, 16, 38, 64, 85, 96, 98.8, 100]);
  near(fine.rows[4].pctRetained, 26, 1e-9, 'No. 30 fraction');
  assert.ok(G.analyze([0, 0, 0], G.SIEVES.fine).error, 'all-zero → error');
  assert.ok(G.analyze([], G.SIEVES.fine).error, 'empty → error');
});

test('analyze: cumulative retained and passing always add to 100 after rounding', () => {
  const rows = G.analyze([0, 1, 0, 0, 0, 0, 0, 0, 399], G.SIEVES.fine).rows;
  for (const r of rows) near(r.cumRetained + r.passing, 100, 1e-9, `${r.label} cumRetained+passing`);
  const no4 = rows.find(r => r.label === 'No. 4');
  assert.equal(no4.cumRetained, 0.3); assert.equal(no4.passing, 99.7);
});

test('finenessModulus: 3.01 for the fine example, 7.09 for the coarse example', () => {
  near(G.finenessModulus(fine.rows), 3.01, 0.005, 'fine FM');
  near(G.finenessModulus(coarse.rows), 7.09, 0.005, 'coarse FM'); // No. 30·50·100 은 100 % 잔류로 센다
});

test('checkLimits: the fine example meets every C33 fine-aggregate limit; a No. 50 excess is caught', () => {
  const r = G.checkLimits(fine.rows, G.FINE_LIMITS);
  assert.equal(r.allOk, true);
  assert.deepEqual(r.checks.filter(c => c.ok !== null).map(c => c.label), ['3/8 in', 'No. 4', 'No. 8', 'No. 16', 'No. 30', 'No. 50', 'No. 100']);
  assert.equal(r.checks.find(c => c.label === 'No. 200').ok, null);
  const bad = G.analyze([0, 12, 68, 60, 60, 105, 55, 14, 126], G.SIEVES.fine); // 팬이 25.2 % → No. 100 통과 28 % (0–10 초과)
  const rb = G.checkLimits(bad.rows, G.FINE_LIMITS);
  assert.equal(rb.allOk, false); assert.equal(rb.checks.find(c => c.label === 'No. 100').ok, false);
});

test('maxSingleFraction: 26 % on No. 30 passes the 45 % rule', () => {
  const m = G.maxSingleFraction(fine.rows);
  assert.equal(m.label, 'No. 30'); near(m.pct, 26, 1e-9, 'pct'); assert.equal(m.ok, true);
  assert.equal(G.MAX_SINGLE_FRACTION, 45);
});

test('coarse Size 57 example: limits met, NMAS 1 in., maximum size 1-1/2 in.', () => {
  assert.equal(coarse.total, 10000);
  assert.deepEqual(coarse.rows.map(r => r.passing), [100, 100, 97, 73, 34, 15, 2, 0.5, 0.5, 0]);
  const r = G.checkLimits(coarse.rows, G.COARSE_LIMITS['57']);
  assert.equal(r.allOk, true);
  assert.deepEqual(r.checks.filter(c => c.ok !== null).map(c => c.label), ['1-1/2 in', '1 in', '1/2 in', 'No. 4', 'No. 8']);
  assert.deepEqual(G.nominalMaxSize(coarse.rows), { nmas: '1 in', maxSize: '1-1/2 in' });
  assert.deepEqual(Object.keys(G.COARSE_LIMITS).sort(), ['467', '57', '67', '7', '8'].sort()); // 정수형 키는 JS 가 오름차순으로 재배열하므로 집합으로 비교
  assert.deepEqual(G.COARSE_LIMITS['67']['3/8 in'], [20, 55]);
});

test('massCheck: 0.3 % rule; validate limits', () => {
  assert.deepEqual(G.massCheck(500, 501), { diffPct: 0.2, ok: true });
  assert.deepEqual(G.massCheck(500, 502), { diffPct: 0.4, ok: false });
  assert.equal(G.massCheck(500, NaN), null);
  assert.equal(G.validate('mass', 12), ''); assert.ok(G.validate('mass', -1)); assert.ok(G.validate('mass', NaN)); assert.ok(G.validate('nope', 1));
  assert.deepEqual(G.FM_RANGE, [2.3, 3.1]); assert.equal(G.FINES_LIMIT, 3);
});
