// engine.test.mjs — MixEngine 단위테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('./site/labs/mix-design/engine.js');

test('DATA: 새 재료 상수와 형상 계수', () => {
  const M = E.DATA.MAT;
  assert.equal(M.sgCA, 2.68); assert.equal(M.absCA, 0.005);
  assert.equal(M.sgFA, 2.64); assert.equal(M.absFA, 0.007);
  assert.equal(M.fmSand, 2.60); assert.equal(M.sgCement, 3.15);
  assert.deepEqual(E.DATA.SHAPE_FACTOR, { rounded: 0.92, crushed: 1.0 });
  assert.equal(E.DATA.FRESH_WEIGHT_TABLE, undefined); // 중량법 표 제거
  const shapes = Object.fromEntries(E.MISSIONS.map(m => [m.id, m.aggShape]));
  assert.deepEqual(shapes, { slab: 'rounded', wall: 'rounded',
    bridge: 'crushed', column: 'crushed', pavement: 'crushed' });
});

test('MISSIONS: 미션 5종과 필드', () => {
  assert.equal(E.MISSIONS.length, 5);
  const bridge = E.MISSIONS.find(m => m.id === 'bridge');
  assert.equal(bridge.fc, 4500);
  assert.equal(bridge.exposure, 'severe');
  for (const m of E.MISSIONS) {
    assert.ok(m.slumpRange[0] < m.slumpRange[1]);
    assert.ok(m.nmasAllowed.every(n => E.DATA.NMAS_LIST.includes(n)));
  }
});

// ── 슬럼프 예측 ────────────────────────────────────────────────
// 기준 배합(강의 예제): 1" NMAS, 비공기연행, well-rounded gravel
const TEXTBOOK = { water: 299, cement: 544, ca: 1872, fa: 1292, airPct: 1.5,
  nmas: 1.0, isAE: false, aggShape: 'rounded' };

test('predictSlump: 형상 계수 반영 앵커 (1" 비AE rounded = 276/299/312.8)', () => {
  assert.ok(Math.abs(E.predictSlump({ ...TEXTBOOK, water: 276 }) - 1.5) < 1e-9);
  assert.ok(Math.abs(E.predictSlump({ ...TEXTBOOK, water: 299 }) - 3.5) < 1e-9);
  assert.ok(Math.abs(E.predictSlump({ ...TEXTBOOK, water: 312.8 }) - 6.5) < 1e-9);
  // crushed는 표 그대로 (0.75" 앵커 315/340/360)
  const crushed = { ...TEXTBOOK, aggShape: 'crushed', nmas: 0.75 };
  assert.equal(E.predictSlump({ ...crushed, water: 340 }), 3.5);
  // aggShape 누락 시 crushed 취급
  const noShape = { ...TEXTBOOK }; delete noShape.aggShape;
  assert.equal(E.predictSlump({ ...noShape, nmas: 0.75, water: 340 }), 3.5);
});

test('predictSlump: 단조 증가 + 외삽 + 클램프', () => {
  const testMix = { ...TEXTBOOK, aggShape: 'crushed', nmas: 0.75 };
  let prev = -1;
  for (let w = 150; w <= 500; w += 10) {
    const s = E.predictSlump({ ...testMix, water: w });
    assert.ok(s >= prev, `water=${w}에서 단조성 위반`);
    assert.ok(s >= 0 && s <= 11);
    prev = s;
  }
  // 물 과다 → 상한 클램프 (440 lb: 6.5 + 80×0.15 = 18.5 → 11)
  assert.equal(E.predictSlump({ ...testMix, water: 440 }), 11);
  // 물 과소 → 0 (240 lb: 1.5 − 75×0.08 = −4.5 → 0)
  assert.equal(E.predictSlump({ ...testMix, water: 240 }), 0);
});

test('classifyBehavior: 4가지 거동 모드', () => {
  // 정상 배합 → true slump
  const ok = E.classifyBehavior(TEXTBOOK);
  assert.equal(ok.mode, 'true');
  assert.equal(ok.harsh, false);
  assert.equal(ok.segregation, false);
  // 물 +100 → collapse + segregation
  const wet = E.classifyBehavior({ ...TEXTBOOK, water: 399 });
  assert.equal(wet.mode, 'collapse');
  assert.equal(wet.segregation, true);
  // 물 −100 → zero
  const dry = E.classifyBehavior({ ...TEXTBOOK, water: 199 });
  assert.equal(dry.mode, 'zero');
  // 굵은골재 과다(rocky) → harsh → shear (3/4" 기준 배합에서 앵커 340 물 사용)
  const rocky = E.classifyBehavior({ water: 340, cement: 616, ca: 2500, fa: 500, airPct: 2,
    nmas: 0.75, isAE: false, aggShape: 'crushed' });
  assert.equal(rocky.harsh, true);
  assert.equal(rocky.mode, 'shear');
});

// ── 강도 모델 ───────────────────────────────────────────────────
test('predictStrength: Abrams 곡선이 ACI 표 기준점을 ±5%로 재현', () => {
  // 순수 w/c 효과만 보기 위해 정상 배합에서 cement만 조정
  const base = { ...TEXTBOOK, aggShape: 'crushed', nmas: 0.75, airPct: 2 };
  const at = (wc) => E.predictStrength({ ...base, cement: base.water / wc });
  const anchors = [[0.82, 2000], [0.68, 3000], [0.57, 4000], [0.48, 5000], [0.41, 6000]];
  for (const [wc, fc] of anchors) {
    const got = at(wc);
    assert.ok(Math.abs(got - fc) / fc <= 0.05, `w/c=${wc}: ${got} vs ${fc}`);
  }
});

test('predictStrength: 공기량 보정 — AE 열과 일치', () => {
  // w/c 0.48 + 공기 6% → 4000 psi 부근 (ACI AE 열)
  // AE 배합 3/4" 기준수량 305 lb 사용해서 segregation 없이 순수 효과 측정
  const got = E.predictStrength({ ...TEXTBOOK, isAE: true, airPct: 6, water: 305, cement: 305 / 0.48,
    aggShape: 'crushed', nmas: 0.75 });
  assert.ok(Math.abs(got - 4000) / 4000 <= 0.06, `got=${got}`);
});

test('predictStrength: 교과서 배합 / 과수 배합은 미달', () => {
  // 기준 배합 (새 TEXTBOOK 기반, normal 상태)
  const ok = E.predictStrength(TEXTBOOK);
  assert.ok(ok > 3500 && ok < 4500, `got=${ok}`);
  // 물 많은 배합 → 약화
  const wet = E.predictStrength({ ...TEXTBOOK, water: 399 });
  assert.ok(wet > 2000, `got=${wet}`);
  // 영세멘트 = 0
  assert.equal(E.predictStrength({ ...TEXTBOOK, cement: 0 }), 0);
});

test('mulberry32 + cylinderStrengths: 결정적이고 산포가 합리적', () => {
  const a = E.mulberry32(42), b = E.mulberry32(42);
  assert.equal(a(), b()); // 같은 시드 → 같은 수열
  const cyl = E.cylinderStrengths(4000, false, E.mulberry32(7));
  assert.equal(cyl.length, 3);
  for (const s of cyl) {
    assert.ok(s > 3400 && s < 4600, `cv 4%에서 ±15% 밖: ${s}`); // 3.75σ 여유
  }
  // 같은 시드로 재현 가능
  assert.deepEqual(cyl, E.cylinderStrengths(4000, false, E.mulberry32(7)));
});

// ── fcr 규칙 및 수율 + 채점 ────────────────────────────────────────────
test('fcrFor: 3단계 규칙', () => {
  assert.equal(E.fcrFor(2500), 3500);
  assert.equal(E.fcrFor(3000), 4200);
  assert.equal(E.fcrFor(5000), 6200);
  assert.equal(E.fcrFor(6000), 7300);
});

test('computeYield: 강의 예제 = 27.00 ft³', () => {
  const v = E.computeYield(TEXTBOOK);
  assert.ok(Math.abs(v - 27.0) < 0.05, `got=${v}`);
});

test('targetAirFor: 노출등급 → 목표 공기량', () => {
  const bridge = E.MISSIONS.find(m => m.id === 'bridge');
  assert.equal(E.targetAirFor(bridge, 0.75), 6.0); // severe @ 3/4"
  const slab = E.MISSIONS.find(m => m.id === 'slab');
  assert.equal(E.targetAirFor(slab, 0.75), null);
});

test('scoreMix: 만점 시나리오와 감점 수식', () => {
  const slab = E.MISSIONS.find(m => m.id === 'slab');
  const beh = { mode: 'true', segregation: false, harsh: false };
  const perfect = E.scoreMix(
    { measuredSlump: 3.5, avgStrength: 4100, airPct: 2, yieldVol: 27.32, behavior: beh }, slab);
  assert.equal(perfect.total, 100);
  assert.equal(perfect.grade, 'A');
  assert.equal(perfect.stars, 5);
  assert.ok(perfect.notes.includes('Textbook mix. The inspector is impressed.'));
  // 슬럼프 5.5 in (범위 [3,4]에서 1.5 초과) → 40 − 18 = 22
  const s = E.scoreMix(
    { measuredSlump: 5.5, avgStrength: 4100, airPct: 2, yieldVol: 27, behavior: beh }, slab);
  assert.equal(s.slumpPts, 22);
  // 강도 90% → 40 − 10 = 30
  const st = E.scoreMix(
    { measuredSlump: 3.5, avgStrength: 2700, airPct: 2, yieldVol: 27, behavior: beh }, slab);
  assert.equal(st.strengthPts, 30);
  assert.ok(st.notes.some(n => n.startsWith('Compressive strength')));
});

test('scoreMix: collapse 배합은 슬럼프 0점 + 노트', () => {
  const slab = E.MISSIONS.find(m => m.id === 'slab');
  const r = E.scoreMix(
    { measuredSlump: 10.75, avgStrength: 2400, airPct: 2, yieldVol: 28.9,
      behavior: { mode: 'collapse', segregation: true, harsh: false } }, slab);
  assert.equal(r.slumpPts, 0); // d = 6.75 → 40 − 81 → 0
  assert.equal(r.grade, 'F');
  assert.ok(r.notes.some(n => n.includes('collapsed into a puddle')));
});

test('scoreMix: AE 미션 공기량 채점', () => {
  const bridge = E.MISSIONS.find(m => m.id === 'bridge');
  const beh = { mode: 'true', segregation: false, harsh: false };
  const hit = E.scoreMix(
    { measuredSlump: 3.5, avgStrength: 5000, airPct: 6, yieldVol: 27, behavior: beh, nmas: 0.75 }, bridge);
  assert.equal(hit.airPts, 10);
  // 목표 6.0에서 3.5%p 이탈 (air 2.5) → d−1.5 = 2 → 10 − 10 = 0
  const miss = E.scoreMix(
    { measuredSlump: 3.5, avgStrength: 5000, airPct: 2.5, yieldVol: 27, behavior: beh, nmas: 0.75 }, bridge);
  assert.equal(miss.airPts, 0);
});

// ── 통합 평가 ───────────────────────────────────────────────────
test('evaluateMix: 강의 예제 배합은 만점 A', () => {
  const slab = E.MISSIONS.find(m => m.id === 'slab');
  const r = E.evaluateMix(TEXTBOOK, slab, 42);
  assert.equal(r.behavior.mode, 'true');
  assert.ok(r.measuredSlump >= 3.25 && r.measuredSlump <= 3.75);
  assert.ok(r.f28 > 3950 && r.f28 < 4300); // ≈4,124
  assert.equal(r.score.total, 100);
  assert.equal(r.score.grade, 'A');
});

test('evaluateMix: 물 +100 → collapse / 물 −100 → zero (새 기준)', () => {
  const slab = E.MISSIONS.find(m => m.id === 'slab');
  const wet = E.evaluateMix({ ...TEXTBOOK, water: 399 }, slab, 42);
  assert.equal(wet.behavior.mode, 'collapse');
  assert.ok(wet.avgStrength < 3000); // wc 0.734 ×0.9 ≈ 2,267
  const dry = E.evaluateMix({ ...TEXTBOOK, water: 199 }, slab, 42);
  assert.equal(dry.behavior.mode, 'zero');
});

test('scoreMix: shear 배합은 슬럼프 점수 반감 → A등급 불가', () => {
  const slab = E.MISSIONS.find(m => m.id === 'slab');
  // 3/4" 기준 배합에서 shear 테스트 (v1 기대값 유지)
  const r = E.evaluateMix({ water: 340, cement: 616, ca: 2500, fa: 500, airPct: 2,
    nmas: 0.75, isAE: false, aggShape: 'crushed' }, slab, 42);
  assert.equal(r.behavior.mode, 'shear');
  assert.ok(r.score.slumpPts <= 20, `slumpPts=${r.score.slumpPts}`);
  assert.ok(r.score.grade !== 'A', `grade=${r.score.grade}`);
});
