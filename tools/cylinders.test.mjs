// tools/cylinders.test.mjs — site/study/concrete-cylinders/cylinders.js 계약 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
const C = await import('../site/study/concrete-cylinders/cylinders.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
// 예제 하중(lbf): 6 x 12 공시체 2개씩 6회
const LOADS = [[122200, 124700], [117300, 115600], [112500, 114200], [102400, 104600], [126700, 128900], [121600, 119900]];
const TESTS = LOADS.map((ls, i) => ({ id: i + 1, strengths: ls.map(P => C.strength(P, '6x12')) }));

test('AREA: 6 x 12 → 28.27 in², 4 x 8 → 12.57 in²', () => {
  near(C.AREA['6x12'], 28.274, 0.001, '6x12'); near(C.AREA['4x8'], 12.566, 0.001, '4x8');
});

test('strength: load / area, reported to the nearest 10 psi', () => {
  assert.equal(C.strength(122200, '6x12'), 4320); assert.equal(C.strength(124700, '6x12'), 4410);
  assert.equal(C.strength(51000, '4x8'), 4060); assert.equal(C.round10(4365), 4370); assert.equal(C.round10(4364), 4360);
});

test('testAverage and withinTestRange', () => {
  assert.equal(C.testAverage([4320, 4410]), 4370);
  near(C.withinTestRange([4320, 4410]), 2.06, 0.01, 'range %');
  assert.equal(C.testAverage([4060, 4190, 3990]), 4080);
  assert.deepEqual(C.RANGE_LIMIT, { '6x12': 6.6, '4x8': 9.0 });
});

test('evaluateTests on the example: test 4 passes (b) but the average of tests 2–4 fails (a)', () => {
  const r = C.evaluateTests(TESTS, 4000);
  assert.equal(r.limitB, 3500);
  assert.deepEqual(r.tests.map(t => t.avg), [4370, 4120, 4010, 3660, 4520, 4270]);
  assert.deepEqual(r.tests.map(t => t.okB), [true, true, true, true, true, true]);
  assert.deepEqual(r.tests.map(t => t.avg3), [null, null, 4170, 3930, 4060, 4150]);
  assert.deepEqual(r.tests.map(t => t.okA), [null, null, true, false, true, true]);
  assert.equal(r.pass, false);
  assert.deepEqual(r.reasons, ['Tests 2–4: average 3,930 psi is below f\'c = 4,000 psi (criterion a).']);
  assert.ok(r.tests.every(t => !t.rangeWide));
});

test('evaluateTests: a missing test id (test 3 blank) makes the (a) reason list the ids instead of an en dash', () => {
  const r = C.evaluateTests([{ id: 2, strengths: [3800] }, { id: 4, strengths: [3800] }, { id: 5, strengths: [3800] }], 4000);
  assert.equal(r.tests[2].avg3, 3800); assert.equal(r.tests[2].okA, false);
  assert.deepEqual(r.reasons, ['Tests 2, 4, 5: average 3,800 psi is below f\'c = 4,000 psi (criterion a).']);
});

test('evaluateTests: a single low test breaks criterion (b); limit is 0.10 f\'c above 5,000 psi', () => {
  const r = C.evaluateTests([{ id: 1, strengths: [3400, 3560] }], 4000);
  assert.equal(r.tests[0].avg, 3480); assert.equal(r.tests[0].okB, false); assert.equal(r.pass, false);
  assert.deepEqual(r.reasons, ['Test 1: 3,480 psi is more than 500 psi below f\'c (criterion b).']);
  assert.equal(C.evaluateTests([{ id: 1, strengths: [6000, 6000] }], 6000).limitB, 5400);
  assert.equal(C.evaluateTests([{ id: 1, strengths: [5300, 5450] }], 6000).tests[0].okB, false); // 평균 5,380 < 5,400
  assert.equal(C.evaluateTests([{ id: 1, strengths: [5350, 5450] }], 6000).tests[0].okB, true);  // 평균 5,400 = 한계 → 통과
});

test('evaluateTests: fewer than three tests → no (a) verdict yet, pass if (b) holds; wide spread is flagged', () => {
  const r = C.evaluateTests([{ id: 1, strengths: [4000, 4400] }, { id: 2, strengths: [4100, 4100] }], 4000);
  assert.deepEqual(r.tests.map(t => t.avg3), [null, null]); assert.equal(r.pass, true);
  assert.equal(r.tests[0].rangeWide, true); near(r.tests[0].rangePct, 9.52, 0.01, 'range');
  assert.equal(r.tests[1].rangeWide, false);
  assert.ok(C.evaluateTests([], 4000).error);
});

test('ageRatio is normalized to 1 at 28 days; Type I moist 7-day ≈ 0.70', () => {
  near(C.ageRatio(28, C.AGE_COEFF.typeI), 1, 1e-12, '28 d');
  near(C.ageRatio(7, C.AGE_COEFF.typeI), 0.6985, 0.0005, '7 d'); near(C.ageRatio(3, C.AGE_COEFF.typeI), 0.4547, 0.0005, '3 d');
  near(C.ageRatio(7, C.AGE_COEFF.typeIII), 0.8026, 0.0005, 'type III 7 d');
  const curve = C.ageCurve(4370, C.AGE_COEFF.typeI, [1, 3, 7, 14, 28, 56, 90]);
  assert.deepEqual(curve.map(p => p.f), [890, 1990, 3050, 3820, 4370, 4710, 4850]);
});

test('validate: limits and non-numbers', () => {
  assert.equal(C.validate('load', 120000), ''); assert.ok(C.validate('load', 100)); assert.ok(C.validate('fc', 1000));
  assert.ok(C.validate('f28', NaN)); assert.ok(C.validate('nope', 1));
  assert.deepEqual(C.LIMITS.fc, [2000, 12000]);
});
