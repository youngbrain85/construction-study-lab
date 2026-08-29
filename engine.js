// engine.js — MixLab 순수 계산 엔진 (ACI 211.1 US 관용단위)
// 브라우저: globalThis.MixEngine / node: module.exports
(function () {
  'use strict';

  // ── ACI 211.1 표 데이터 ──────────────────────────────────────────
  const NMAS_LIST = [0.375, 0.5, 0.75, 1.0, 1.5]; // 굵은골재 최대치수 (in.)
  const SLUMP_ANCHORS = [1.5, 3.5, 6.5]; // 수량 표의 슬럼프 구간 중앙값 (1-2 / 3-4 / 6-7 in.)

  // Table 6.3.3 — 소요 단위수량 (lb/yd³) 및 공기량 (%)
  const WATER_TABLE = {
    slumps: SLUMP_ANCHORS,
    nonAE: {
      0.375: [350, 385, 410], 0.5: [335, 365, 385], 0.75: [315, 340, 360],
      1.0: [300, 325, 340], 1.5: [275, 300, 315],
    },
    ae: {
      0.375: [305, 340, 365], 0.5: [295, 325, 345], 0.75: [280, 305, 325],
      1.0: [270, 295, 310], 1.5: [250, 275, 290],
    },
    entrappedAir: { 0.375: 3.0, 0.5: 2.5, 0.75: 2.0, 1.0: 1.5, 1.5: 1.0 }, // 비공기연행 갇힌 공기
    targetAir: { // 공기연행 목표 공기량 [mild, moderate, severe]
      0.375: [4.5, 6.0, 7.5], 0.5: [4.0, 5.5, 7.0], 0.75: [3.5, 5.0, 6.0],
      1.0: [3.0, 4.5, 6.0], 1.5: [2.5, 4.5, 5.5],
    },
  };

  // Table 6.3.4(a) — 28일 압축강도 vs w/c
  const WC_TABLE = {
    strengths: [2000, 3000, 4000, 5000, 6000, 7000],
    nonAE: [0.82, 0.68, 0.57, 0.48, 0.41, 0.33],
    ae: [0.74, 0.59, 0.48, 0.40, 0.32, null], // 7000 psi는 공기연행으로 불가
  };

  // Table 6.3.6 — 건조봉다짐 굵은골재 용적비 (NMAS × 잔골재 FM)
  const CA_VOLUME_TABLE = {
    fm: [2.40, 2.60, 2.80, 3.00],
    0.375: [0.50, 0.48, 0.46, 0.44], 0.5: [0.59, 0.57, 0.55, 0.53],
    0.75: [0.66, 0.64, 0.62, 0.60], 1.0: [0.71, 0.69, 0.67, 0.65],
    1.5: [0.75, 0.73, 0.71, 0.69],
  };

  // Table 6.3.7.1 — 굳지 않은 콘크리트 추정 단위중량 (lb/yd³)
  const FRESH_WEIGHT_TABLE = {
    nonAE: { 0.375: 3840, 0.5: 3890, 0.75: 3960, 1.0: 4010, 1.5: 4070 },
    ae: { 0.375: 3710, 0.5: 3760, 0.75: 3840, 1.0: 3900, 1.5: 3960 },
  };

  // 재료 물성 (Materials Lab Report)
  const MAT = {
    sgCement: 3.15, sgCA: 2.65, sgFA: 2.64, // 비중
    druwCA: 100,   // 굵은골재 건조봉다짐 단위중량 (lb/ft³)
    fmSand: 2.70,  // 잔골재 조립률
    wUnit: 62.4,   // 물 단위중량 (lb/ft³)
  };

  // 미션 5종
  const MISSIONS = [
    { id: 'slab', name: 'Residential Slab', icon: '🏠', fc: 3000, slumpRange: [3, 4],
      exposure: 'none', nmasAllowed: [0.75, 1.0, 1.5],
      desc: 'A 4-in. slab-on-grade for a suburban home. Keep it workable for the finishing crew.' },
    { id: 'bridge', name: 'Bridge Deck', icon: '🌉', fc: 4500, slumpRange: [3, 4],
      exposure: 'severe', nmasAllowed: [0.5, 0.75, 1.0],
      desc: 'Freeze-thaw and deicing salts. Air entrainment is mandatory.' },
    { id: 'column', name: 'High-rise Column', icon: '🏢', fc: 6000, slumpRange: [4, 5],
      exposure: 'none', nmasAllowed: [0.5, 0.75],
      desc: 'Heavily reinforced columns need both strength and flow.' },
    { id: 'pavement', name: 'Sidewalk Pavement', icon: '🛣️', fc: 4000, slumpRange: [1, 3],
      exposure: 'severe', nmasAllowed: [0.75, 1.0, 1.5],
      desc: 'A stiff mix for slip-form paving in a cold climate.' },
    { id: 'wall', name: 'Basement Wall', icon: '🧱', fc: 3500, slumpRange: [3, 6],
      exposure: 'none', nmasAllowed: [0.75, 1.0],
      desc: 'Forgiving slump window, but keep the strength honest.' },
  ];

  // ── 유틸 ─────────────────────────────────────────────────────────
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

  // 잔골재 비율 / 페이스트 용적비
  function faFraction(mix) {
    const tot = mix.fa + mix.ca;
    return tot <= 0 ? 0 : mix.fa / tot;
  }
  function pasteFraction(mix) {
    const v = mix.cement / (MAT.sgCement * MAT.wUnit) + mix.water / MAT.wUnit
      + 27 * (mix.airPct / 100);
    return v / 27;
  }
  function isHarsh(mix) {
    return faFraction(mix) < 0.25 || pasteFraction(mix) < 0.22
      || mix.ca > 0.90 * 27 * MAT.druwCA;
  }

  // ── 슬럼프 예측: ACI 수량 표 역산 (조각별 선형 + 외삽) ─────────────
  function predictSlump(mix) {
    const anchors = WATER_TABLE[mix.isAE ? 'ae' : 'nonAE'][mix.nmas];
    const S = SLUMP_ANCHORS; // [1.5, 3.5, 6.5]
    const [W1, W2, W3] = anchors;
    const slope1 = (S[1] - S[0]) / (W2 - W1); // 아래 구간 기울기 (in. per lb)
    const slope2 = (S[2] - S[1]) / (W3 - W2); // 위 구간 기울기
    let s;
    if (mix.water <= W1) s = S[0] - (W1 - mix.water) * slope1;
    else if (mix.water <= W2) s = S[0] + (mix.water - W1) * slope1;
    else if (mix.water <= W3) s = S[1] + (mix.water - W2) * slope2;
    else s = S[2] + (mix.water - W3) * slope2;
    // 배합 상태 보정: 거친 배합은 덜 처지고, 모래 과다는 뻑뻑해짐
    if (isHarsh(mix)) s -= 1.0;
    if (faFraction(mix) > 0.60) s -= 0.5;
    return clamp(s, 0, 11);
  }

  // ── 거동 분류: zero / true / shear / collapse ─────────────────────
  function classifyBehavior(mix) {
    const slump = predictSlump(mix);
    const harsh = isHarsh(mix);
    let mode;
    if (slump < 0.5) mode = 'zero';
    else if (slump >= 8.5) mode = 'collapse';
    else if (harsh && slump >= 2) mode = 'shear';
    else mode = 'true';
    const segregation = slump >= 7.5 || (harsh && slump >= 5) || mode === 'collapse';
    return { mode, slump, segregation, harsh };
  }

  // ── 결정적 RNG (mulberry32) + 정규분포 (Box-Muller) ───────────────
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rng) {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ── 28일 강도: Abrams 곡선 (ACI Table 6.3.4(a) 캘리브레이션) ──────
  const ABRAMS_A = 18000, ABRAMS_B = 14.6;
  function predictStrength(mix) {
    if (mix.cement <= 0) return 0;
    const wc = mix.water / mix.cement;
    const base = ABRAMS_A / Math.pow(ABRAMS_B, wc);
    const airFactor = Math.pow(0.95, Math.max(0, mix.airPct - 2)); // 갇힌 공기 2% 기본선
    const beh = classifyBehavior(mix);
    let quality = 1;
    if (beh.segregation) quality *= 0.90; // 재료분리 감점
    if (beh.harsh) quality *= 0.88;       // 다짐 불량(honeycomb) 감점
    return base * airFactor * quality;
  }

  // ── 공시체 3본 산포 ──────────────────────────────────────────────
  function cylinderStrengths(f28, segregation, rng) {
    const cv = segregation ? 0.08 : 0.04;
    return [0, 1, 2].map(() => Math.max(0, f28 * (1 + cv * gauss(rng))));
  }

  // ── 수율(절대용적) 검사: 1 yd³ = 27 ft³ ──────────────────────────
  function computeYield(mix) {
    return mix.cement / (MAT.sgCement * MAT.wUnit)
      + mix.water / MAT.wUnit
      + mix.ca / (MAT.sgCA * MAT.wUnit)
      + mix.fa / (MAT.sgFA * MAT.wUnit)
      + 27 * (mix.airPct / 100);
  }

  // AE 미션의 목표 공기량 (노출등급 × NMAS)
  const EXPOSURE_IDX = { mild: 0, moderate: 1, severe: 2 };
  function targetAirFor(mission, nmas) {
    if (mission.exposure === 'none') return null;
    return WATER_TABLE.targetAir[nmas][EXPOSURE_IDX[mission.exposure]];
  }

  // ── 채점 ─────────────────────────────────────────────────────────
  function scoreMix(results, mission) {
    const { measuredSlump, avgStrength, airPct, yieldVol, behavior } = results;
    const [lo, hi] = mission.slumpRange;
    const notes = [];

    // 슬럼프 40점: 범위 밖 1인치당 −12
    let slumpPts;
    if (measuredSlump >= lo && measuredSlump <= hi) slumpPts = 40;
    else {
      const d = measuredSlump < lo ? lo - measuredSlump : measuredSlump - hi;
      slumpPts = clamp(40 - 12 * d, 0, 40);
    }

    // 강도 40점: 미달 비율 ×100 감점
    const ratio = avgStrength / mission.fc;
    const strengthPts = ratio >= 1 ? 40 : clamp(40 - 100 * (1 - ratio), 0, 40);

    // 공기량 10점
    let airPts;
    const target = targetAirFor(mission, results.nmas);
    if (target === null) airPts = airPct <= 3 ? 10 : clamp(10 - 3 * (airPct - 3), 0, 10);
    else {
      const d = Math.abs(airPct - target);
      airPts = d <= 1.5 ? 10 : clamp(10 - 5 * (d - 1.5), 0, 10);
    }

    // 수율 10점
    const e = Math.abs(yieldVol - 27);
    const yieldPts = e <= 0.5 ? 10 : clamp(10 - 8 * (e - 0.5), 0, 10);

    const total = Math.round(slumpPts + strengthPts + airPts + yieldPts);
    const grade = total >= 90 ? 'A' : total >= 80 ? 'B' : total >= 70 ? 'C' : total >= 60 ? 'D' : 'F';
    const stars = Math.round(total / 20);

    // 결과 해설 노트 (영어)
    if (behavior.mode === 'collapse') notes.push('The cone collapsed into a puddle — far too much water for this mix.');
    if (behavior.mode === 'zero') notes.push('Nearly zero slump — the mix is too dry to place.');
    if (behavior.mode === 'shear') notes.push('Shear slump — the mix is harsh and lacks mortar. Check your aggregate proportions.');
    if (behavior.segregation && behavior.mode !== 'collapse') notes.push('Signs of segregation — the mix is too wet to stay uniform.');
    if (strengthPts < 40) notes.push("Compressive strength came in below the required f'c. Lower your w/c ratio.");
    if (yieldPts < 10) notes.push("Your batch doesn't add up to 27 cu ft per cubic yard — check your quantities.");
    if (airPts < 10 && target !== null) notes.push('Air content misses the target for this exposure condition.');
    if (total >= 90) notes.push('Textbook mix. The inspector is impressed.');

    return { slumpPts, strengthPts, airPts, yieldPts, total, grade, stars, notes };
  }

  const MixEngine = {
    DATA: { NMAS_LIST, SLUMP_ANCHORS, WATER_TABLE, WC_TABLE, CA_VOLUME_TABLE, FRESH_WEIGHT_TABLE, MAT },
    MISSIONS,
    predictSlump, classifyBehavior, mulberry32, predictStrength, cylinderStrengths,
    computeYield, targetAirFor, scoreMix,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MixEngine;
  globalThis.MixEngine = MixEngine;
})();
