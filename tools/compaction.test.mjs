// tools/compaction.test.mjs — site/study/soil-compaction/compaction.js 계약 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
const C = await import('../site/study/soil-compaction/compaction.js');

const DEFAULTS = [[8, 112.3], [10, 118.5], [12, 122.9], [14, 122.1], [16, 118.0]].map(([w, wet]) => ({ w, wet }));
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test('dryDensity: γd = γwet / (1 + w)', () => {
  near(C.dryDensity(122.9, 12), 109.732, 0.001, 'dry');
  assert.equal(C.dryDensity(100, 0), 100);
});

test('zavDensity: Gs·γw / (1 + w·Gs)', () => {
  near(C.zavDensity(2.70, 12), 127.251, 0.001, 'zav');
  assert.ok(C.zavDensity(2.70, 20) < C.zavDensity(2.70, 10), 'falls with water content');
});

test('quadraticFit recovers an exact parabola', () => {
  const xs = [8, 10, 12, 14, 16], ys = xs.map(x => -0.35 * x * x + 8.4 * x + 59);
  const f = C.quadraticFit(xs, ys);
  near(f.a, -0.35, 1e-9, 'a'); near(f.b, 8.4, 1e-9, 'b'); near(f.c, 59, 1e-9, 'c');
});

test('fitProctor on the example points: peak near 11.7 % / 109.4 pcf', () => {
  const r = C.fitProctor(DEFAULTS);
  assert.equal(r.points.length, 5);
  near(r.points[2].dry, 109.732, 0.001, 'dry of point 3');
  near(r.wOpt, 11.686, 0.01, 'wOpt'); near(r.gdMax, 109.364, 0.01, 'gdMax');
  assert.deepEqual(r.flags, []); assert.equal(r.wMin, 8); assert.equal(r.wMax, 16);
});

test('fitProctor: fewer than three distinct water contents → error', () => {
  assert.ok(C.fitProctor([{ w: 10, wet: 118 }, { w: 10, wet: 119 }, { w: 12, wet: 120 }]).error);
  assert.ok(C.fitProctor([]).error);
});

test('fitProctor: no peak (rising points) → best point + flag', () => {
  const r = C.fitProctor([{ w: 8, wet: 110 }, { w: 10, wet: 114 }, { w: 12, wet: 120 }, { w: 14, wet: 126 }]);
  assert.ok(r.flags.includes('no-peak'));
  near(r.gdMax, 126 / 1.14, 0.001, 'best dry'); assert.equal(r.wOpt, 14);
});

test('fitProctor: optimum outside the tested range is flagged', () => {
  const r = C.fitProctor([{ w: 4, wet: 118 }, { w: 6, wet: 121 }, { w: 8, wet: 123 }]); // 여전히 오르는 중, 미세한 곡률
  assert.ok(r.flags.includes('outside-range') || r.flags.includes('no-peak'));
});

test('evaluate: 106.5 pcf at 11.5 % passes 95 % and the ±2 % window', () => {
  const r = C.evaluate({ gdField: 106.5, wField: 11.5, gdMax: 109.364, wOpt: 11.686, specPct: 95, lo: -2, hi: 2 });
  assert.equal(r.percent, 97.4); assert.ok(r.pass); assert.deepEqual(r.reasons, []);
});

test('evaluate: low density and wet of the window are both reported', () => {
  const r = C.evaluate({ gdField: 100, wField: 15, gdMax: 109.364, wOpt: 11.686, specPct: 95, lo: -2, hi: 2 });
  assert.equal(r.percent, 91.4); assert.ok(!r.pass);
  assert.deepEqual(r.reasons, ['density below spec', 'too wet']);
  const dry = C.evaluate({ gdField: 108, wField: 9, gdMax: 109.364, wOpt: 11.686, specPct: 95, lo: -2, hi: 2 });
  assert.deepEqual(dry.reasons, ['too dry']); assert.ok(!dry.pass && dry.densityOk);
});

test('validate: limits and non-numbers', () => {
  assert.equal(C.validate('w', 12), '');
  assert.ok(C.validate('w', 45)); assert.ok(C.validate('wet', 10)); assert.ok(C.validate('Gs', NaN));
  assert.deepEqual(C.LIMITS.spec, [80, 105]);
});
