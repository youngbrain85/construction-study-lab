// engine.test.mjs — MixEngine 단위테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('./engine.js');

test('DATA: ACI 표 기준점이 정확히 들어있다', () => {
  const D = E.DATA;
  assert.deepEqual(D.NMAS_LIST, [0.375, 0.5, 0.75, 1.0, 1.5]);
  // Table 6.3.3 — 3/4 in. 수량 (슬럼프 1-2 / 3-4 / 6-7 구간)
  assert.deepEqual(D.WATER_TABLE.nonAE[0.75], [315, 340, 360]);
  assert.deepEqual(D.WATER_TABLE.ae[0.75], [280, 305, 325]);
  assert.equal(D.WATER_TABLE.entrappedAir[0.75], 2.0);
  assert.deepEqual(D.WATER_TABLE.targetAir[0.75], [3.5, 5.0, 6.0]); // mild/moderate/severe
  // Table 6.3.4(a) — w/c vs f'c
  assert.deepEqual(D.WC_TABLE.strengths, [2000, 3000, 4000, 5000, 6000, 7000]);
  assert.deepEqual(D.WC_TABLE.nonAE, [0.82, 0.68, 0.57, 0.48, 0.41, 0.33]);
  assert.deepEqual(D.WC_TABLE.ae, [0.74, 0.59, 0.48, 0.40, 0.32, null]);
  // Table 6.3.6 — 3/4 in. 행 (FM 2.40/2.60/2.80/3.00)
  assert.deepEqual(D.CA_VOLUME_TABLE[0.75], [0.66, 0.64, 0.62, 0.60]);
  // Table 6.3.7.1 — 추정 단위중량
  assert.equal(D.FRESH_WEIGHT_TABLE.nonAE[0.75], 3960);
  assert.equal(D.FRESH_WEIGHT_TABLE.ae[0.75], 3840);
  // 재료 물성
  assert.equal(D.MAT.sgCement, 3.15);
  assert.equal(D.MAT.druwCA, 100);
  assert.equal(D.MAT.fmSand, 2.70);
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
// 기준 배합(미션1 교과서 정답): 3/4" 비공기연행
const TEXTBOOK = { water: 340, cement: 616, ca: 1701, fa: 1303, airPct: 2, nmas: 0.75, isAE: false };

test('predictSlump: 표 앵커점을 정확히 재현한다', () => {
  assert.equal(E.predictSlump({ ...TEXTBOOK, water: 315 }), 1.5);
  assert.equal(E.predictSlump({ ...TEXTBOOK, water: 340 }), 3.5);
  assert.equal(E.predictSlump({ ...TEXTBOOK, water: 360 }), 6.5);
  // AE 앵커 (3/4"): 280/305/325
  const aeMix = { ...TEXTBOOK, isAE: true, airPct: 6, water: 305 };
  assert.equal(E.predictSlump(aeMix), 3.5);
});

test('predictSlump: 단조 증가 + 외삽 + 클램프', () => {
  let prev = -1;
  for (let w = 150; w <= 500; w += 10) {
    const s = E.predictSlump({ ...TEXTBOOK, water: w });
    assert.ok(s >= prev, `water=${w}에서 단조성 위반`);
    assert.ok(s >= 0 && s <= 11);
    prev = s;
  }
  // 물 과다 → 상한 클램프 (440 lb: 6.5 + 80×0.15 = 18.5 → 11)
  assert.equal(E.predictSlump({ ...TEXTBOOK, water: 440 }), 11);
  // 물 과소 → 0 (240 lb: 1.5 − 75×0.08 = −4.5 → 0)
  assert.equal(E.predictSlump({ ...TEXTBOOK, water: 240 }), 0);
});

test('classifyBehavior: 4가지 거동 모드', () => {
  // 정상 배합 → true slump
  const ok = E.classifyBehavior(TEXTBOOK);
  assert.equal(ok.mode, 'true');
  assert.equal(ok.harsh, false);
  assert.equal(ok.segregation, false);
  // 물 +100 → collapse + segregation
  const wet = E.classifyBehavior({ ...TEXTBOOK, water: 440 });
  assert.equal(wet.mode, 'collapse');
  assert.equal(wet.segregation, true);
  // 물 −100 → zero
  const dry = E.classifyBehavior({ ...TEXTBOOK, water: 240 });
  assert.equal(dry.mode, 'zero');
  // 굵은골재 과다(rocky) → harsh → shear (기본 3.5 − 1.0 = 2.5 ≥ 2)
  const rocky = E.classifyBehavior({ ...TEXTBOOK, ca: 2500, fa: 500 });
  assert.equal(rocky.harsh, true);
  assert.equal(rocky.mode, 'shear');
});

// ── 강도 모델 ───────────────────────────────────────────────────
test('predictStrength: Abrams 곡선이 ACI 표 기준점을 ±5%로 재현', () => {
  // 순수 w/c 효과만 보기 위해 정상 배합에서 cement만 조정
  const at = (wc) => E.predictStrength({ ...TEXTBOOK, airPct: 2, cement: TEXTBOOK.water / wc });
  const anchors = [[0.82, 2000], [0.68, 3000], [0.57, 4000], [0.48, 5000], [0.41, 6000]];
  for (const [wc, fc] of anchors) {
    const got = at(wc);
    assert.ok(Math.abs(got - fc) / fc <= 0.05, `w/c=${wc}: ${got} vs ${fc}`);
  }
});

test('predictStrength: 공기량 보정 — AE 열과 일치', () => {
  // w/c 0.48 + 공기 6% → 4000 psi 부근 (ACI AE 열)
  // AE 배합 3/4" 기준수량 305 lb 사용해서 segregation 없이 순수 효과 측정
  const got = E.predictStrength({ ...TEXTBOOK, isAE: true, airPct: 6, water: 305, cement: 305 / 0.48 });
  assert.ok(Math.abs(got - 4000) / 4000 <= 0.06, `got=${got}`);
});

test('predictStrength: 교과서 배합 ≈ 4,100 psi / 과수 배합은 미달', () => {
  const ok = E.predictStrength(TEXTBOOK); // w/c=0.552 → ≈4098
  assert.ok(ok > 3900 && ok < 4300, `got=${ok}`);
  const wet = E.predictStrength({ ...TEXTBOOK, water: 440 }); // w/c=0.714, seg ×0.90 → ≈2387
  assert.ok(wet > 2200 && wet < 2600, `got=${wet}`);
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

// ── 수율 + 채점 ────────────────────────────────────────────────
test('computeYield: 교과서 배합 ≈ 27.3 ft³', () => {
  const v = E.computeYield(TEXTBOOK);
  // 3.134 + 5.449 + 10.287 + 7.909 + 0.54 = 27.32
  assert.ok(Math.abs(v - 27.32) < 0.05, `got=${v}`);
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
test('evaluateMix: 교과서 배합은 만점 A', () => {
  const slab = E.MISSIONS.find(m => m.id === 'slab');
  const r = E.evaluateMix(TEXTBOOK, slab, 42);
  assert.equal(r.behavior.mode, 'true');
  assert.ok(r.measuredSlump >= 3.25 && r.measuredSlump <= 3.75); // 3.5 ± 0.25
  assert.ok(r.avgStrength > 3000);
  assert.equal(r.score.total, 100);
  assert.equal(r.score.grade, 'A');
  // 같은 시드 → 완전 재현
  assert.deepEqual(r, E.evaluateMix(TEXTBOOK, slab, 42));
});

test('evaluateMix: 물 +100 → collapse·F / 물 −100 → zero slump', () => {
  const slab = E.MISSIONS.find(m => m.id === 'slab');
  const wet = E.evaluateMix({ ...TEXTBOOK, water: 440 }, slab, 42);
  assert.equal(wet.behavior.mode, 'collapse');
  assert.equal(wet.score.slumpPts, 0);
  assert.ok(wet.avgStrength < 3000);
  const dry = E.evaluateMix({ ...TEXTBOOK, water: 240 }, slab, 42);
  assert.equal(dry.behavior.mode, 'zero');
  assert.ok(dry.measuredSlump <= 0.5);
});

test('scoreMix: shear 배합은 슬럼프 점수 반감 → A등급 불가', () => {
  const slab = E.MISSIONS.find(m => m.id === 'slab');
  const r = E.evaluateMix({ ...TEXTBOOK, ca: 2500, fa: 500 }, slab, 42);
  assert.equal(r.behavior.mode, 'shear');
  assert.ok(r.score.slumpPts <= 20, `slumpPts=${r.score.slumpPts}`);
  assert.ok(r.score.grade !== 'A', `grade=${r.score.grade}`);
});
