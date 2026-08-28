# MixLab — Concrete Mix Design Challenge 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ACI 211.1 배합설계 7단계 위저드 + 가상 슬럼프/압축강도 시험 + 미션 채점을 갖춘 단일 HTML 웹 게임을 만들고 Netlify에 배포한다.

**Architecture:** 순수 계산 엔진(`engine.js`, node 테스트 가능)과 UI/장면(`index.html`, 바닐라 JS + Canvas 2D 상태머신)을 분리 개발하고, `build.mjs`로 엔진을 인라인해 `dist/index.html` 단일 파일을 생성한다. 참고표 UI는 엔진의 DATA에서 생성해 데이터 중복을 없앤다.

**Tech Stack:** 바닐라 JS(ES2020), Canvas 2D, CSS custom properties, Inter(Google Fonts), node --test (엔진 테스트), Netlify (정적 배포)

**Spec:** `docs/superpowers/specs/2026-08-28-mixlab-concrete-game-design.md`

## Global Constraints

- 프레임워크·빌드도구·npm 의존성 **금지**. 외부 리소스는 Google Fonts(Inter)만.
- UI 언어 **영어**, 단위 **US 관용단위**(lb/yd³, in., psi). 코드 주석은 **한국어**.
- 엔진 함수는 전부 **순수 함수**(DOM 접근 금지), `node --test`로 실행 가능해야 함.
- 입력 클램프: water 100–500, cement 200–1200, CA 0–2500, FA 0–2500, air 0–10 %, w/c 0.25–1.00. NaN 입력 → 이전 값 복원.
- 단계별 정답 검증 **없음** — 표는 참고용, 판정은 엔진의 물리 모델만.
- 참고표에 자동입력/클릭 채움 **없음** (hover 하이라이트만).
- localStorage 키: `mixlab-best` (미션 id → 최고 점수 맵). 그 외 저장 없음.
- 커밋 메시지는 conventional commits (`feat:`, `test:`, `chore:` …), 끝에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- dev 서버: `python -m http.server 8123` (Task 6에서 `.claude/launch.json` 구성). `dist/index.html`은 file:// 로도 동작해야 함.

## 파일 구조 (최종)

```
D:\Projects\Test\
├── index.html          # UI 전체: 디자인 시스템 CSS, 장면 상태머신, 위저드, Canvas 장면들
├── engine.js           # ACI 데이터 테이블 + 순수 계산 함수 (globalThis.MixEngine, CJS 겸용)
├── engine.test.mjs     # node --test 단위테스트 (createRequire로 engine.js 로드)
├── build.mjs           # engine.js를 index.html에 인라인 → dist/index.html
├── .claude/launch.json # dev 서버 설정
├── .gitignore          # dist/
└── dist/index.html     # 배포 산출물 (빌드 생성, 커밋 안 함)
```

---

### Task 1: 스캐폴드 + 엔진 ACI 데이터 테이블

**Files:**
- Create: `engine.js`
- Create: `engine.test.mjs`
- Create: `.gitignore`

**Interfaces:**
- Produces: `globalThis.MixEngine` 객체 (CJS 환경에서는 `module.exports`). 이 태스크에서는 데이터만:
  - `MixEngine.DATA.NMAS_LIST: number[]` — `[0.375, 0.5, 0.75, 1.0, 1.5]` (in.)
  - `MixEngine.DATA.SLUMP_ANCHORS: number[]` — `[1.5, 3.5, 6.5]`
  - `MixEngine.DATA.WATER_TABLE` — nonAE/ae 수량, entrappedAir, targetAir (아래 코드가 원본)
  - `MixEngine.DATA.WC_TABLE` — 강도→w/c (nonAE/ae)
  - `MixEngine.DATA.CA_VOLUME_TABLE` — NMAS×FM 건조봉다짐 용적비
  - `MixEngine.DATA.FRESH_WEIGHT_TABLE` — 굳지 않은 콘크리트 추정 단위중량
  - `MixEngine.DATA.MAT` — 재료 물성 상수
  - `MixEngine.MISSIONS: Mission[]` — 미션 5종
  - `Mission = { id, name, icon, fc, slumpRange:[lo,hi], exposure:'none'|'mild'|'moderate'|'severe', nmasAllowed:number[], desc }`

- [ ] **Step 1: .gitignore 작성**

```gitignore
dist/
```

- [ ] **Step 2: 실패하는 테스트 작성** — `engine.test.mjs`

```js
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
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `node --test engine.test.mjs`
Expected: FAIL — `Cannot find module './engine.js'`

- [ ] **Step 4: engine.js 데이터 부분 구현**

```js
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

  const MixEngine = {
    DATA: { NMAS_LIST, SLUMP_ANCHORS, WATER_TABLE, WC_TABLE, CA_VOLUME_TABLE, FRESH_WEIGHT_TABLE, MAT },
    MISSIONS,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MixEngine;
  globalThis.MixEngine = MixEngine;
})();
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `node --test engine.test.mjs`
Expected: PASS (2 tests)

- [ ] **Step 6: 커밋**

```bash
git add .gitignore engine.js engine.test.mjs
git commit -m "feat: 엔진 스캐폴드 + ACI 211.1 표 데이터·미션 데이터"
```

---

### Task 2: 엔진 — 슬럼프 예측 + 거동 분류

**Files:**
- Modify: `engine.js` (MixEngine 객체에 함수 추가)
- Test: `engine.test.mjs` (테스트 추가)

**Interfaces:**
- Consumes: `MixEngine.DATA` (Task 1)
- Produces:
  - `Mix = { water, cement, ca, fa, airPct, nmas, isAE }` — 이후 모든 태스크가 쓰는 배합 객체 (단위: lb/yd³, %, in., bool)
  - `MixEngine.predictSlump(mix) -> number` — 예측 슬럼프 (in., 0–11 클램프)
  - `MixEngine.classifyBehavior(mix) -> { mode:'zero'|'true'|'shear'|'collapse', slump:number, segregation:boolean, harsh:boolean }`

**모델 정의 (구현 규칙 — 코드와 테스트가 이를 따라야 함):**
- 수량→슬럼프: `WATER_TABLE[isAE?'ae':'nonAE'][nmas]`의 3개 앵커점 `(W1,1.5)(W2,3.5)(W3,6.5)`을 지나는 조각별 선형 곡선. 첫 구간 기울기로 아래쪽 외삽, 둘째 구간 기울기로 위쪽 외삽. 결과를 `[0, 11]`로 클램프.
- 보정(클램프 전에 적용): harsh면 −1.0 in, oversanded(`fa/(fa+ca) > 0.60`)면 −0.5 in.
- `harsh` 판정 (하나라도 참): `fa/(fa+ca) < 0.25` · `pasteFrac < 0.22` · `ca > 0.90 × 27 × MAT.druwCA`(= 2,430 lb 초과).
  - `pasteFrac = (cement/(sgCement·62.4) + water/62.4 + 27·airPct/100) / 27`
- `mode` 결정 순서: `slump < 0.5 → 'zero'` → `slump ≥ 8.5 → 'collapse'` → `harsh && slump ≥ 2 → 'shear'` → 그 외 `'true'`
- `segregation = (slump ≥ 7.5) || (harsh && slump ≥ 5) || mode === 'collapse'`

- [ ] **Step 1: 실패하는 테스트 추가** — `engine.test.mjs`에 append

```js
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test engine.test.mjs`
Expected: FAIL — `E.predictSlump is not a function`

- [ ] **Step 3: 구현** — `engine.js`의 `const MixEngine = {...}` 직전에 함수 추가, MixEngine 객체에 등록

```js
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
```

MixEngine 객체를 다음으로 교체:

```js
  const MixEngine = {
    DATA: { NMAS_LIST, SLUMP_ANCHORS, WATER_TABLE, WC_TABLE, CA_VOLUME_TABLE, FRESH_WEIGHT_TABLE, MAT },
    MISSIONS,
    predictSlump, classifyBehavior,
  };
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test engine.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add engine.js engine.test.mjs
git commit -m "feat: 슬럼프 예측(표 역산)·거동 분류 엔진"
```

---

### Task 3: 엔진 — 강도 모델 + RNG + 공시체 산포

**Files:**
- Modify: `engine.js`
- Test: `engine.test.mjs`

**Interfaces:**
- Consumes: `Mix`, `classifyBehavior` (Task 2)
- Produces:
  - `MixEngine.mulberry32(seed:number) -> () => number` — 결정적 RNG (0~1)
  - `MixEngine.predictStrength(mix) -> number` — 28일 평균 강도 (psi)
  - `MixEngine.cylinderStrengths(f28:number, segregation:boolean, rng:()=>number) -> [number,number,number]`

**모델 정의:**
- Abrams 곡선: `base = 18000 / 14.6^(w/c)`, `w/c = water/cement` (cement ≤ 0이면 강도 0).
  - 캘리브레이션 근거: ACI Table 6.3.4(a) 기준점 재현 오차 ±5% 이내 — 0.82→1,997 / 0.68→2,907 / 0.57→3,905 / 0.48→4,970 / 0.41→5,996 psi.
- 공기 보정: `airFactor = 0.95^max(0, airPct − 2)` (비공기연행 갇힌 공기 2%가 기본선).
  - 근거: AE 열 자체 검증 — `f(0.48)·0.95⁴ = 4,048 ≈ 4000` (AE 열의 4000 psi 행과 일치).
- 품질 감점: `segregation`이면 ×0.90, `harsh`면 ×0.88 (중첩 곱).
- `predictStrength`는 내부에서 `classifyBehavior(mix)`를 호출해 감점 플래그를 얻는다.
- 공시체 3본: `f_i = f28 · (1 + cv·gauss(rng))`, `cv = segregation ? 0.08 : 0.04`, 각각 0 이상으로 클램프. gauss는 Box-Muller.

- [ ] **Step 1: 실패하는 테스트 추가**

```js
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
  const got = E.predictStrength({ ...TEXTBOOK, isAE: true, airPct: 6, cement: TEXTBOOK.water / 0.48 });
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test engine.test.mjs`
Expected: FAIL — `E.predictStrength is not a function`

- [ ] **Step 3: 구현** — `classifyBehavior` 아래에 추가, MixEngine에 등록

```js
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
```

MixEngine 등록에 `mulberry32, predictStrength, cylinderStrengths` 추가.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test engine.test.mjs`
Expected: PASS (9 tests)

- [ ] **Step 5: 커밋**

```bash
git add engine.js engine.test.mjs
git commit -m "feat: Abrams 강도 모델·공기 보정·공시체 산포·결정적 RNG"
```

---

### Task 4: 엔진 — 수율 + 채점 + 등급

**Files:**
- Modify: `engine.js`
- Test: `engine.test.mjs`

**Interfaces:**
- Consumes: `Mix`, `Mission` (Task 1–2)
- Produces:
  - `MixEngine.computeYield(mix) -> number` — 절대용적 합 (ft³)
  - `MixEngine.targetAirFor(mission, nmas) -> number|null` — AE 미션의 목표 공기량 (%). `exposure==='none'`이면 null
  - `MixEngine.scoreMix(results, mission) -> Score`
    - `results = { measuredSlump:number, avgStrength:number, airPct:number, yieldVol:number, behavior:{mode,segregation,harsh} }`
    - `Score = { slumpPts, strengthPts, airPts, yieldPts, total, grade:'A'|'B'|'C'|'D'|'F', stars:0-5, notes:string[] }`

**채점 규칙 (정확한 수식):**
- slumpPts (40): 범위 내 40. 밖이면 가까운 경계까지 거리 d(in.)에 대해 `40 − 12d` (0 클램프).
- strengthPts (40): `ratio = avg/fc`. ratio ≥ 1 → 40. 아니면 `40 − 100·(1−ratio)` (0 클램프).
- airPts (10): AE 미션 — `d = |airPct − target|`, d ≤ 1.5 → 10, 아니면 `10 − 5·(d−1.5)` (0 클램프). 비AE 미션 — airPct ≤ 3 → 10, 아니면 `10 − 3·(airPct−3)` (0 클램프).
- yieldPts (10): `e = |yieldVol − 27|`, e ≤ 0.5 → 10, 아니면 `10 − 8·(e−0.5)` (0 클램프).
- total = 합계 반올림. grade: ≥90 A / ≥80 B / ≥70 C / ≥60 D / 그 외 F. stars = round(total/20).
- notes (영어, 해당 시 추가 — 이 문자열 그대로 사용):
  - collapse → `"The cone collapsed into a puddle — far too much water for this mix."`
  - zero → `"Nearly zero slump — the mix is too dry to place."`
  - shear → `"Shear slump — the mix is harsh and lacks mortar. Check your aggregate proportions."`
  - segregation(collapse 아님) → `"Signs of segregation — the mix is too wet to stay uniform."`
  - strengthPts < 40 → `"Compressive strength came in below the required f'c. Lower your w/c ratio."`
  - yieldPts < 10 → `"Your batch doesn't add up to 27 cu ft per cubic yard — check your quantities."`
  - airPts < 10 (AE 미션) → `"Air content misses the target for this exposure condition."`
  - total ≥ 90 → `"Textbook mix. The inspector is impressed."`

- [ ] **Step 1: 실패하는 테스트 추가**

```js
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
```

**주의:** `scoreMix`의 AE 공기 목표는 NMAS에 의존하므로 `results.nmas`를 받는다 (테스트의 `_nmasForAir` 줄은 삭제하고 `results.nmas`만 사용).

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test engine.test.mjs`
Expected: FAIL — `E.computeYield is not a function`

- [ ] **Step 3: 구현**

```js
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
```

MixEngine 등록에 `computeYield, targetAirFor, scoreMix` 추가.

- [ ] **Step 4: 테스트 수정(주의사항 반영) 후 통과 확인**

Run: `node --test engine.test.mjs`
Expected: PASS (14 tests)

- [ ] **Step 5: 커밋**

```bash
git add engine.js engine.test.mjs
git commit -m "feat: 수율 계산·미션 채점·등급 산정"
```

---

### Task 5: 엔진 — evaluateMix 통합

**Files:**
- Modify: `engine.js`
- Test: `engine.test.mjs`

**Interfaces:**
- Consumes: Task 2–4의 모든 함수
- Produces:
  - `MixEngine.quantizeQuarter(x) -> number` — 1/4 in. 반올림
  - `MixEngine.evaluateMix(mix, mission, seed=42) -> Evaluation`
    - `Evaluation = { behavior:{mode,slump,segregation,harsh}, measuredSlump:number, f28:number, cylinders:[n,n,n], avgStrength:number, yieldVol:number, score:Score }`
  - UI(Task 9–12)는 이 `Evaluation` 객체 하나만 소비한다.

**정의:** `measuredSlump = quantizeQuarter(clamp(behavior.slump + (rng()·0.5 − 0.25), 0, 11))`. 이후 `cylinderStrengths(f28, behavior.segregation, rng)` → 평균 → `scoreMix({ ..., nmas: mix.nmas }, mission)`.

- [ ] **Step 1: 실패하는 테스트 추가**

```js
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test engine.test.mjs`
Expected: FAIL — `E.evaluateMix is not a function`

- [ ] **Step 3: 구현**

```js
  // ── 통합 평가: 배합 → 시험 결과 일체 ─────────────────────────────
  const quantizeQuarter = (x) => Math.round(x * 4) / 4;

  function evaluateMix(mix, mission, seed = 42) {
    const rng = mulberry32(seed);
    const behavior = classifyBehavior(mix);
    const measuredSlump = quantizeQuarter(clamp(behavior.slump + (rng() * 0.5 - 0.25), 0, 11));
    const f28 = predictStrength(mix);
    const cylinders = cylinderStrengths(f28, behavior.segregation, rng);
    const avgStrength = (cylinders[0] + cylinders[1] + cylinders[2]) / 3;
    const yieldVol = computeYield(mix);
    const score = scoreMix(
      { measuredSlump, avgStrength, airPct: mix.airPct, yieldVol, behavior, nmas: mix.nmas },
      mission);
    return { behavior, measuredSlump, f28, cylinders, avgStrength, yieldVol, score };
  }
```

MixEngine 등록에 `quantizeQuarter, evaluateMix` 추가.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test engine.test.mjs`
Expected: PASS (16 tests)

- [ ] **Step 5: 커밋**

```bash
git add engine.js engine.test.mjs
git commit -m "feat: evaluateMix 통합 평가 (시드 기반 결정적)"
```

---

### Task 6: index.html 셸 — 디자인 시스템 + 상태머신 + HOME 장면

**Files:**
- Create: `index.html`
- Create: `.claude/launch.json`

**Interfaces:**
- Consumes: `MixEngine.MISSIONS`, `MixEngine.targetAirFor` (Task 1, 4)
- Produces (이후 모든 UI 태스크가 사용):
  - `h(tag, attrs, ...children) -> HTMLElement` — DOM 빌더
  - `const Stage`, `const Scenes = {}`, `go(name)` — 장면 상태머신
  - `const game = { mission, design, result, seed, newRun(mission) }`
  - `setAppbar()` — 앱바 우측에 미션 칩 갱신
  - `fmtNmas(n) -> string` — 0.75 → `'3/4"'` 표기
  - CSS 클래스 계약: `.card .btn .btn-primary .btn-ghost .badge .badge-blue .badge-green .badge-amber .ref-table .stepper .wizard-grid .canvas-stage .mission-card .num-field` (아래 CSS가 원본)

- [ ] **Step 1: launch.json 작성** — `.claude/launch.json`

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "mixlab", "runtimeExecutable": "python", "runtimeArgs": ["-m", "http.server", "8123"], "port": 8123 }
  ]
}
```

- [ ] **Step 2: index.html 작성** — 전체 구조 + 디자인 시스템 CSS + 상태머신 + HOME

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MixLab — Concrete Mix Design Challenge</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
/* ── MixLab 디자인 시스템 (라이트 SaaS — Zillow/Remote 레퍼런스) ── */
*, *::before, *::after { box-sizing: border-box; }
:root {
  --bg:#ffffff; --surface:#f7f8fa; --surface2:#eef1f5; --border:#e4e7ec;
  --text:#141c2b; --muted:#5b6472; --faint:#98a1b0;
  --primary:#1b66f0; --primary-600:#1252cc; --primary-50:#eef4ff;
  --green:#12855f; --green-50:#e9f7f1; --amber:#b45309; --amber-50:#fdf3e3;
  --red:#d92d20; --red-50:#fdecea;
  --radius:12px; --radius-sm:8px;
  --shadow:0 1px 2px rgba(16,24,40,.05), 0 2px 8px rgba(16,24,40,.06);
  --font:'Inter',-apple-system,'Segoe UI',sans-serif;
}
html, body { margin:0; padding:0; background:var(--surface); color:var(--text);
  font-family:var(--font); font-size:15px; line-height:1.5; }
button { font-family:var(--font); }

/* 앱바 */
.appbar { position:sticky; top:0; z-index:20; background:var(--bg);
  border-bottom:1px solid var(--border); }
.appbar-inner { max-width:1100px; margin:0 auto; height:60px; padding:0 24px;
  display:flex; align-items:center; justify-content:space-between; }
.logo { font-weight:800; font-size:17px; letter-spacing:-.02em; display:flex; gap:8px; align-items:center; }
.logo .mark { color:var(--primary); font-size:20px; }

/* 레이아웃 */
main { max-width:1100px; margin:0 auto; padding:32px 24px 80px; }
.card { background:var(--bg); border:1px solid var(--border); border-radius:var(--radius);
  box-shadow:var(--shadow); padding:24px; }
h1 { font-size:26px; font-weight:800; letter-spacing:-.02em; margin:0 0 6px; }
h2 { font-size:18px; font-weight:700; letter-spacing:-.01em; margin:0 0 4px; }
.sub { color:var(--muted); margin:0 0 20px; }

/* 버튼 */
.btn { border:1px solid var(--border); background:var(--bg); color:var(--text);
  border-radius:var(--radius-sm); padding:10px 18px; font-size:14px; font-weight:600;
  cursor:pointer; transition:background .15s, border-color .15s; }
.btn:hover { background:var(--surface); }
.btn-primary { background:var(--primary); border-color:var(--primary); color:#fff; }
.btn-primary:hover { background:var(--primary-600); }
.btn-primary:disabled { background:#a8c4f5; border-color:#a8c4f5; cursor:not-allowed; }
.btn-ghost { border-color:transparent; background:transparent; color:var(--muted); }

/* 배지 */
.badge { display:inline-flex; align-items:center; gap:5px; border-radius:999px;
  font-size:12px; font-weight:600; padding:3px 10px; }
.badge-blue { background:var(--primary-50); color:var(--primary-600); }
.badge-green { background:var(--green-50); color:var(--green); }
.badge-amber { background:var(--amber-50); color:var(--amber); }
.badge-red { background:var(--red-50); color:var(--red); }

/* 미션 그리드 */
.mission-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(300px,1fr)); gap:16px; }
.mission-card { display:flex; flex-direction:column; gap:10px; cursor:pointer;
  transition:transform .12s, box-shadow .12s; }
.mission-card:hover { transform:translateY(-2px);
  box-shadow:0 4px 14px rgba(16,24,40,.10); }
.mission-card .icon { font-size:30px; }
.mission-card .meta { display:flex; flex-wrap:wrap; gap:6px; }
.mission-card .desc { color:var(--muted); font-size:13.5px; flex:1; }

/* 스텝퍼 (Zillow식) */
.stepper { display:flex; align-items:flex-start; margin:26px 0 22px; }
.step { flex:1; text-align:center; position:relative; }
.step .dot { width:26px; height:26px; border-radius:50%; margin:0 auto 6px;
  display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700;
  background:var(--surface2); color:var(--faint); border:2px solid var(--border); }
.step.done .dot { background:var(--primary); border-color:var(--primary); color:#fff; }
.step.current .dot { background:var(--bg); border-color:var(--primary); color:var(--primary); }
.step .lbl { font-size:11.5px; font-weight:600; color:var(--faint); }
.step.current .lbl { color:var(--primary); }
.step.done .lbl { color:var(--muted); }
.step:not(:first-child)::before { content:''; position:absolute; top:12px; right:50%;
  left:-50%; height:2px; background:var(--border); z-index:-1; }
.step.done:not(:first-child)::before, .step.current:not(:first-child)::before { background:var(--primary); }

/* 위저드 2컬럼 */
.wizard-grid { display:grid; grid-template-columns:1fr 380px; gap:20px; align-items:start; }
.ref-panel { position:sticky; top:80px; display:flex; flex-direction:column; gap:14px; }
@media (max-width:900px){ .wizard-grid { grid-template-columns:1fr; } .ref-panel { position:static; } }

/* 참고표 */
.ref-table { width:100%; border-collapse:collapse; font-size:12.5px; }
.ref-table caption { caption-side:top; text-align:left; font-size:12px; font-weight:700;
  color:var(--muted); text-transform:uppercase; letter-spacing:.04em; padding-bottom:8px; }
.ref-table th { font-size:11px; text-transform:uppercase; letter-spacing:.03em;
  color:var(--faint); font-weight:600; text-align:right; padding:6px 8px;
  border-bottom:1px solid var(--border); }
.ref-table th:first-child, .ref-table td:first-child { text-align:left; }
.ref-table td { padding:6px 8px; text-align:right; font-variant-numeric:tabular-nums;
  border-bottom:1px solid var(--surface2); }
.ref-table tbody tr:nth-child(odd) { background:var(--surface); }
.ref-table tbody tr:hover { background:var(--primary-50); }
.ref-note { font-size:12px; color:var(--faint); margin-top:8px; }

/* 숫자 입력 */
.num-field { margin:14px 0; }
.num-field label { display:block; font-size:13px; font-weight:600; margin-bottom:6px; }
.num-field .wrap { display:flex; align-items:center; border:1px solid var(--border);
  border-radius:var(--radius-sm); overflow:hidden; background:var(--bg); max-width:240px; }
.num-field .wrap:focus-within { border-color:var(--primary); box-shadow:0 0 0 3px var(--primary-50); }
.num-field input { border:0; outline:0; padding:10px 12px; font-size:15px; width:100%;
  text-align:right; font-variant-numeric:tabular-nums; font-family:var(--font); }
.num-field .unit { padding:0 12px; color:var(--faint); font-size:13px; white-space:nowrap;
  background:var(--surface); align-self:stretch; display:flex; align-items:center;
  border-left:1px solid var(--border); }
.num-field .hint { font-size:12.5px; color:var(--faint); margin-top:6px; }

/* 선택 카드 (NMAS 등) */
.choice-row { display:flex; gap:10px; flex-wrap:wrap; }
.choice { border:1.5px solid var(--border); border-radius:var(--radius-sm); background:var(--bg);
  padding:12px 18px; font-weight:600; font-size:14px; cursor:pointer; }
.choice.selected { border-color:var(--primary); background:var(--primary-50); color:var(--primary-600); }

/* 위저드 하단 내비 */
.wiz-nav { display:flex; justify-content:space-between; margin-top:22px; }

/* 캔버스 무대 */
.canvas-stage { background:linear-gradient(180deg,#f4f7fb,#e8edf4);
  border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--shadow);
  display:block; width:100%; height:auto; }
.stage-actions { display:flex; justify-content:center; gap:12px; margin-top:18px; }

/* 결과 */
.score-row { display:grid; grid-template-columns:150px 1fr 90px; gap:14px; align-items:center;
  padding:12px 0; border-bottom:1px solid var(--surface2); }
.score-bar { height:8px; border-radius:4px; background:var(--surface2); overflow:hidden; }
.score-bar > div { height:100%; border-radius:4px; background:var(--primary); }
.grade-badge { width:92px; height:92px; border-radius:50%; display:flex; align-items:center;
  justify-content:center; font-size:42px; font-weight:800; color:#fff; }
</style>
</head>
<body>
<header class="appbar"><div class="appbar-inner">
  <div class="logo"><span class="mark">⬢</span> MixLab</div>
  <div id="appbar-info"></div>
</div></header>
<main id="stage"></main>
<script src="engine.js"></script>
<script>
'use strict';
const E = MixEngine;

// ── DOM 빌더 ──────────────────────────────────────────────────────
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(9)) {
    if (c == null) continue;
    el.append(c.nodeType ? c : document.createTextNode(c));
  }
  return el;
}
const fmtNmas = (n) => ({ 0.375: '3/8"', 0.5: '1/2"', 0.75: '3/4"', 1: '1"', 1.5: '1-1/2"' })[n];

// ── 게임 상태 ─────────────────────────────────────────────────────
const game = {
  mission: null, design: null, result: null, seed: 1,
  newRun(mission) {
    this.mission = mission;
    this.design = { slumpTarget: null, nmas: null, isAE: false, water: null,
      airPct: null, wc: null, cement: null, ca: null, fa: null };
    this.result = null;
    this.seed = Math.floor(Math.random() * 1e6);
  },
};
function designToMix() {
  const d = game.design;
  return { water: d.water, cement: d.cement, ca: d.ca, fa: d.fa,
    airPct: d.airPct, nmas: d.nmas, isAE: d.isAE };
}
function bestScores() {
  try { return JSON.parse(localStorage.getItem('mixlab-best') || '{}'); }
  catch (e) { return {}; }
}

// ── 장면 상태머신 ─────────────────────────────────────────────────
const Stage = document.getElementById('stage');
const Scenes = {};
let currentScene = null;
function go(name) {
  if (currentScene && currentScene.unmount) currentScene.unmount();
  Stage.innerHTML = '';
  window.scrollTo(0, 0);
  setAppbar();
  currentScene = Scenes[name]();
  currentScene.mount(Stage);
}
function setAppbar() {
  const info = document.getElementById('appbar-info');
  info.innerHTML = '';
  if (game.mission) {
    const m = game.mission;
    info.append(h('span', { class: 'badge badge-blue' },
      `${m.icon} ${m.name} · f'c ${m.fc.toLocaleString()} psi`));
  }
}

// ── HOME: 미션 선택 ───────────────────────────────────────────────
Scenes.home = () => ({
  mount(root) {
    const best = bestScores();
    root.append(
      h('h1', {}, 'Concrete Mix Design Challenge'),
      h('p', { class: 'sub' },
        'Pick a project, proportion your mix with the ACI 211.1 tables, then put it to the test.'),
      h('div', { class: 'mission-grid' },
        E.MISSIONS.map(m => h('div', { class: 'card mission-card', onclick: () => { game.newRun(m); go('design'); } },
          h('div', { class: 'icon' }, m.icon),
          h('h2', {}, m.name),
          h('div', { class: 'meta' },
            h('span', { class: 'badge badge-blue' }, `f'c ${m.fc.toLocaleString()} psi`),
            h('span', { class: 'badge badge-blue' }, `Slump ${m.slumpRange[0]}–${m.slumpRange[1]} in.`),
            m.exposure !== 'none' ? h('span', { class: 'badge badge-amber' }, '❄ Air-entrained') : null,
            best[m.id] != null ? h('span', { class: 'badge badge-green' }, `Best ${best[m.id]}`) : null),
          h('div', { class: 'desc' }, m.desc),
          h('button', { class: 'btn btn-primary' }, 'Start Mission →')))));
  },
});

go('home');
</script>
</body>
</html>
```

- [ ] **Step 3: dev 서버로 브라우저 확인**

Run: 브라우저 페인에서 `preview_start` (name: "mixlab") → http://localhost:8123 열기
Expected: 앱바 + 미션 카드 5장 그리드. 콘솔 에러 0건. 스크린샷 저장.

- [ ] **Step 4: 커밋**

```bash
git add index.html .claude/launch.json
git commit -m "feat: index.html 셸 — 디자인 시스템·상태머신·미션 선택 화면"
```

---

### Task 7: DESIGN 위저드 프레임 + 참고표 렌더러 + 스텝 1–2

**Files:**
- Modify: `index.html` (`Scenes.home` 아래, `go('home')` 위에 추가)

**Interfaces:**
- Consumes: `h`, `game`, `go`, `E.DATA`, `fmtNmas` (Task 6)
- Produces:
  - `refTable(caption, head:string[], rows:(string|number)[][], note?) -> HTMLElement`
  - `numField({label, key, unit, min, max, step, hint}) -> HTMLElement` — `game.design[key]`에 클램프 저장, NaN → 이전 값 복원
  - `STEP_DEFS: Array<{id, title, sub, render(box), refPanels():HTMLElement[], ready():boolean}>` — 7개 (이 태스크에서 1–2번, Task 8에서 3–7번)
  - `Scenes.design` — 스텝퍼 + 좌 입력카드 + 우 참고패널 + Back/Next (마지막 스텝 다음은 Summary)
  - `materialsCard() -> HTMLElement` — 재료 물성 카드 (모든 스텝의 참고패널 하단에 상시 표시)

- [ ] **Step 1: 참고표 렌더러 + 입력 컴포넌트 + 위저드 프레임 구현**

```js
// ── 참고표 렌더러 ─────────────────────────────────────────────────
function refTable(caption, head, rows, note) {
  return h('div', { class: 'card' },
    h('table', { class: 'ref-table' },
      h('caption', {}, caption),
      h('thead', {}, h('tr', {}, head.map(c => h('th', {}, c)))),
      h('tbody', {}, rows.map(r => h('tr', {}, r.map(c => h('td', {}, String(c))))))),
    note ? h('div', { class: 'ref-note' }, note) : null);
}

// ── 숫자 입력 (클램프 + NaN 복원) ─────────────────────────────────
function numField({ label, key, unit, min, max, step, hint }) {
  const input = h('input', { type: 'number', min, max, step: step || 'any',
    value: game.design[key] ?? '' });
  input.addEventListener('change', () => {
    const v = parseFloat(input.value);
    if (Number.isNaN(v)) { input.value = game.design[key] ?? ''; return; } // NaN → 복원
    const c = Math.min(max, Math.max(min, v));
    game.design[key] = c;
    input.value = c;
    renderDesign(); // Next 활성화 갱신
  });
  return h('div', { class: 'num-field' },
    h('label', {}, label),
    h('div', { class: 'wrap' }, input, h('span', { class: 'unit' }, unit)),
    hint ? h('div', { class: 'hint' }, hint) : null);
}

// ── 재료 물성 카드 (상시 표시) ────────────────────────────────────
function materialsCard() {
  const M = E.DATA.MAT;
  return refTable('Materials Lab Report',
    ['Property', 'Value'],
    [['Cement specific gravity', M.sgCement],
     ['Coarse agg. specific gravity (SSD)', M.sgCA],
     ['Coarse agg. dry-rodded unit weight', M.druwCA + ' lb/cu ft'],
     ['Fine agg. specific gravity (SSD)', M.sgFA],
     ['Fine agg. fineness modulus', M.fmSand.toFixed(2)]],
    'All aggregates assumed at SSD condition.');
}

// ── 스텝 정의 (1–2) ───────────────────────────────────────────────
const SLUMP_RECOMMEND = [
  ['Reinforced foundation walls and footings', 1, 3],
  ['Plain footings, caissons, substructure walls', 1, 3],
  ['Beams and reinforced walls', 1, 4],
  ['Building columns', 1, 4],
  ['Pavements and slabs', 1, 3],
  ['Mass concrete', 1, 2],
];
const STEP_DEFS = [
  {
    id: 'slump', title: 'Step 1 — Choose the target slump', sub:
      'Consult the table and pick a slump consistent with your project. The mission spec is the governing requirement.',
    render(box) {
      box.append(numField({ label: 'Design slump', key: 'slumpTarget', unit: 'in.',
        min: 0.5, max: 8, step: 0.25,
        hint: `Mission requires ${game.mission.slumpRange[0]}–${game.mission.slumpRange[1]} in.` }));
    },
    refPanels: () => [refTable('Recommended slumps for various types of construction',
      ['Types of construction', 'Max (in.)', 'Min (in.)'],
      SLUMP_RECOMMEND.map(r => [r[0], r[2], r[1]]),
      'Maximum slump may be increased 1 in. when consolidation is not by vibration.')],
    ready: () => game.design.slumpTarget != null,
  },
  {
    id: 'nmas', title: 'Step 2 — Maximum aggregate size', sub:
      'Choose the largest nominal maximum size available for this project.',
    render(box) {
      box.append(h('div', { class: 'choice-row' },
        game.mission.nmasAllowed.map(n =>
          h('button', {
            class: 'choice' + (game.design.nmas === n ? ' selected' : ''),
            onclick: () => { game.design.nmas = n; renderDesign(); },
          }, fmtNmas(n)))));
    },
    refPanels: () => [refTable('Nominal maximum sizes available at the plant',
      ['Size', 'Note'],
      game.mission.nmasAllowed.map(n => [fmtNmas(n), 'in stock']),
      'Rule of thumb: NMAS ≤ 1/5 of the narrowest form dimension, ≤ 3/4 of clear rebar spacing.')],
    ready: () => game.design.nmas != null,
  },
  // Task 8에서 스텝 3–7 추가
];

// ── DESIGN 장면 ───────────────────────────────────────────────────
let designStep = 0;
let designRoot = null;
function renderDesign() {
  if (!designRoot) return;
  designRoot.innerHTML = '';
  const total = STEP_DEFS.length; // summary는 별도 장면
  const def = STEP_DEFS[designStep];
  // 스텝퍼
  designRoot.append(h('div', { class: 'stepper' },
    STEP_DEFS.map((s, i) => h('div', {
      class: 'step' + (i < designStep ? ' done' : i === designStep ? ' current' : '') },
      h('div', { class: 'dot' }, i < designStep ? '✓' : String(i + 1)),
      h('div', { class: 'lbl' }, s.id.toUpperCase())))));
  // 본문 2컬럼
  const box = h('div', { class: 'card' }, h('h2', {}, def.title), h('p', { class: 'sub' }, def.sub));
  def.render(box);
  box.append(h('div', { class: 'wiz-nav' },
    h('button', { class: 'btn', onclick: () => { designStep === 0 ? go('home') : (designStep--, renderDesign()); } },
      '← Back'),
    h('button', {
      class: 'btn btn-primary', disabled: def.ready() ? undefined : '',
      onclick: () => { designStep + 1 < total ? (designStep++, renderDesign()) : go('summary'); },
    }, designStep + 1 < total ? 'Next →' : 'Review mix →')));
  designRoot.append(h('div', { class: 'wizard-grid' }, box,
    h('div', { class: 'ref-panel' }, def.refPanels(), materialsCard())));
}
Scenes.design = () => ({
  mount(root) { designStep = 0; designRoot = root; renderDesign(); },
  unmount() { designRoot = null; },
});
```

**주의:** `disabled` 처리 — `h()`는 `disabled: ''`이면 속성 설정, `undefined`면 `Object.entries` 순회에 포함되므로 `def.ready()`가 참일 때 속성 자체를 생략하려면 render 후 `btn.disabled = !def.ready()`로 직접 설정하는 방식으로 구현해도 된다 (동작 동일하면 어느 쪽이든 무방).

- [ ] **Step 2: 브라우저 확인**

미션 카드 클릭 → 스텝 1 (슬럼프 표 + 입력), Next → 스텝 2 (NMAS 선택지). Back 동작. 값 미입력 시 Next 비활성. 콘솔 에러 0건. 스크린샷 저장.
(주의: 이 시점에는 STEP_DEFS가 2개뿐이라 스텝 2의 버튼이 "Review mix →"로 보이고 `Scenes.summary`가 아직 없어 클릭하면 에러 — Task 8에서 해소되므로 여기서는 클릭하지 않는다.)

- [ ] **Step 3: 커밋**

```bash
git add index.html
git commit -m "feat: 배합설계 위저드 프레임 + 스텝 1-2 (슬럼프·NMAS)"
```

---

### Task 8: DESIGN 스텝 3–7 + Summary 장면

**Files:**
- Modify: `index.html` (`STEP_DEFS` 배열에 스텝 3–7 push, `Scenes.summary` 추가)

**Interfaces:**
- Consumes: `refTable`, `numField`, `STEP_DEFS`, `renderDesign`, `designToMix`, `E.DATA` (Task 7)
- Produces: `Scenes.summary` — 배합 요약 + "Batch & Mix" 버튼 (여기서 `game.result = E.evaluateMix(designToMix(), game.mission, game.seed)` 계산 후 `go('mix')`)

- [ ] **Step 1: 스텝 3–7 정의 추가** — `STEP_DEFS` 배열 마지막에 이어서

```js
  {
    id: 'water', title: 'Step 3 — Mixing water and air content', sub:
      'Read the water requirement for your slump and aggregate size. Decide whether this mix needs air entrainment.',
    render(box) {
      const d = game.design;
      const aeBtn = (on, lbl) => h('button', {
        class: 'choice' + (d.isAE === on ? ' selected' : ''),
        onclick: () => { d.isAE = on; renderDesign(); } }, lbl);
      box.append(
        h('div', { class: 'num-field' }, h('label', {}, 'Mix type'),
          h('div', { class: 'choice-row' }, aeBtn(false, 'Non-air-entrained'), aeBtn(true, 'Air-entrained'))),
        numField({ label: 'Mixing water', key: 'water', unit: 'lb/cu yd', min: 100, max: 500, step: 1 }),
        numField({ label: 'Target air content', key: 'airPct', unit: '%', min: 0, max: 10, step: 0.5,
          hint: 'Non-AE mixes still trap some air — see the table.' }));
    },
    refPanels: () => {
      const W = E.DATA.WATER_TABLE, nmasCols = E.DATA.NMAS_LIST;
      const head = ['Slump (in.)', ...nmasCols.map(fmtNmas)];
      const slumpRows = ['1 to 2', '3 to 4', '6 to 7'];
      const body = (kind) => slumpRows.map((lbl, i) => [lbl, ...nmasCols.map(n => W[kind][n][i])]);
      return [
        refTable('Approximate mixing water (lb/cu yd) — non-air-entrained', head,
          [...body('nonAE'), ['Entrapped air (%)', ...nmasCols.map(n => W.entrappedAir[n])]]),
        refTable('Approximate mixing water (lb/cu yd) — air-entrained', head,
          [...body('ae'),
           ['Target air, mild exposure (%)', ...nmasCols.map(n => W.targetAir[n][0])],
           ['Target air, moderate (%)', ...nmasCols.map(n => W.targetAir[n][1])],
           ['Target air, severe (%)', ...nmasCols.map(n => W.targetAir[n][2])]]),
      ];
    },
    ready: () => game.design.water != null && game.design.airPct != null,
  },
  {
    id: 'wc', title: 'Step 4 — Water-cement ratio', sub:
      "Pick the w/c that delivers the required average strength. Interpolate between rows if needed.",
    render(box) {
      box.append(numField({ label: 'Water-cement ratio', key: 'wc', unit: 'by weight',
        min: 0.25, max: 1.0, step: 0.01,
        hint: `Assume required average strength f'cr = f'c + 1,200 psi = ${(game.mission.fc + 1200).toLocaleString()} psi.` }));
    },
    refPanels: () => {
      const T = E.DATA.WC_TABLE;
      return [refTable('Relationship between w/c and compressive strength',
        ["28-day f'c (psi)", 'Non-AE', 'Air-entrained'],
        T.strengths.map((fc, i) => [fc.toLocaleString(), T.nonAE[i].toFixed(2), T.ae[i] == null ? '—' : T.ae[i].toFixed(2)]),
        'Strengths are for concrete containing no more air than the table amounts.')];
    },
    ready: () => game.design.wc != null,
  },
  {
    id: 'cement', title: 'Step 5 — Cement content', sub:
      'Compute the cement content from your water content and w/c ratio, then enter it.',
    render(box) {
      box.append(
        h('div', { class: 'card', style: 'background:var(--primary-50);border-color:transparent;box-shadow:none;margin-bottom:4px' },
          h('strong', {}, 'Formula: '), 'cement = water ÷ (w/c)'),
        numField({ label: 'Cement content', key: 'cement', unit: 'lb/cu yd', min: 200, max: 1200, step: 1 }));
    },
    refPanels: () => [],
    ready: () => game.design.cement != null,
  },
  {
    id: 'coarse', title: 'Step 6 — Coarse aggregate', sub:
      'Read the dry-rodded bulk volume fraction for your aggregate size and sand fineness modulus, then convert to weight.',
    render(box) {
      box.append(
        h('div', { class: 'card', style: 'background:var(--primary-50);border-color:transparent;box-shadow:none;margin-bottom:4px' },
          h('strong', {}, 'Formula: '), 'CA weight = fraction × 27 cu ft × dry-rodded unit weight'),
        numField({ label: 'Coarse aggregate (dry-rodded basis)', key: 'ca', unit: 'lb/cu yd', min: 0, max: 2500, step: 1 }));
    },
    refPanels: () => {
      const T = E.DATA.CA_VOLUME_TABLE;
      return [refTable('Volume of dry-rodded coarse aggregate per unit volume of concrete',
        ['NMAS', ...T.fm.map(f => 'FM ' + f.toFixed(2))],
        E.DATA.NMAS_LIST.map(n => [fmtNmas(n), ...T[n].map(v => v.toFixed(2))]),
        'Interpolate for fineness modulus values between columns.')];
    },
    ready: () => game.design.ca != null,
  },
  {
    id: 'fine', title: 'Step 7 — Fine aggregate (weight method)', sub:
      'Estimate the fresh concrete unit weight from the table, then back out the sand.',
    render(box) {
      box.append(
        h('div', { class: 'card', style: 'background:var(--primary-50);border-color:transparent;box-shadow:none;margin-bottom:4px' },
          h('strong', {}, 'Formula: '), 'FA = estimated fresh weight − water − cement − CA'),
        numField({ label: 'Fine aggregate', key: 'fa', unit: 'lb/cu yd', min: 0, max: 2500, step: 1 }));
    },
    refPanels: () => {
      const T = E.DATA.FRESH_WEIGHT_TABLE;
      return [refTable('First estimate of fresh concrete weight (lb/cu yd)',
        ['NMAS', 'Non-AE', 'Air-entrained'],
        E.DATA.NMAS_LIST.map(n => [fmtNmas(n), T.nonAE[n].toLocaleString(), T.ae[n].toLocaleString()]))];
    },
    ready: () => game.design.fa != null,
  },
```

- [ ] **Step 2: Summary 장면 추가**

```js
// ── 배합 요약 ─────────────────────────────────────────────────────
Scenes.summary = () => ({
  mount(root) {
    const d = game.design, m = game.mission;
    const rows = [
      ['Water', d.water, 'lb/cu yd'], ['Cement', d.cement, 'lb/cu yd'],
      ['Coarse aggregate', d.ca, 'lb/cu yd'], ['Fine aggregate', d.fa, 'lb/cu yd'],
      ['Design air content', d.airPct, '%'],
      ['Max aggregate size', fmtNmas(d.nmas), ''],
      ['Mix type', d.isAE ? 'Air-entrained' : 'Non-air-entrained', ''],
      ['Design w/c (intent)', d.wc, ''],
      ['Actual w/c (water ÷ cement)', (d.water / d.cement).toFixed(3), ''],
      ['Total batch weight', (d.water + d.cement + d.ca + d.fa).toLocaleString(), 'lb/cu yd'],
    ];
    root.append(
      h('h1', {}, 'Mix summary'),
      h('p', { class: 'sub' }, `${m.icon} ${m.name} — one cubic yard batch. Ready when you are.`),
      h('div', { class: 'wizard-grid' },
        h('div', { class: 'card' },
          h('table', { class: 'ref-table' }, h('tbody', {},
            rows.map(r => h('tr', {}, h('td', {}, r[0]),
              h('td', { style: 'font-weight:600' }, String(r[1]) + (r[2] ? ' ' + r[2] : '')))))),
          h('div', { class: 'wiz-nav' },
            h('button', { class: 'btn', onclick: () => { go('design'); } }, '← Edit design'),
            h('button', { class: 'btn btn-primary', onclick: () => {
              game.result = E.evaluateMix(designToMix(), m, game.seed); // 판정은 여기서 1회 확정
              go('mix');
            } }, 'Batch & Mix 🥽'))),
        h('div', { class: 'ref-panel' }, materialsCard())));
  },
});
```

**주의:** `go('design')`으로 돌아가면 `designStep = 0`부터 시작한다. 입력값은 `game.design`에 남아 있으므로 Next로 빠르게 통과 가능 — 허용 동작.

- [ ] **Step 3: 브라우저 확인**

스텝 3~7 각각: 참고표 렌더 확인(수량 표 2종, w/c 표, CA 용적 표, 추정 중량 표 — 값이 엔진 DATA와 일치하는지 육안 대조), 입력 클램프 동작(입력 600 → 500), Summary의 actual w/c 계산 표시. 스크린샷 저장.

- [ ] **Step 4: 커밋**

```bash
git add index.html
git commit -m "feat: 위저드 스텝 3-7 (수량·w/c·시멘트·골재) + 배합 요약"
```

---

### Task 9: 캔버스 공통 헬퍼 + MIX 믹싱 장면

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `h`, `game`, `go`, `designToMix`, `E.mulberry32` (Task 5–8)
- Produces (Task 10–11이 재사용):
  - `canvasStage(w, h) -> { canvas:HTMLCanvasElement, ctx }` — DPR 스케일 적용된 캔버스 (CSS 크기 w×h, 클래스 `canvas-stage`)
  - `easeOutCubic(t) -> number`
  - `sceneShell(root, title, sub, canvas, actions:HTMLElement[])` — 제목 + 캔버스 + 하단 버튼 배치
  - `Scenes.mix` — 4초 믹싱 애니메이션, Skip / Continue → `go('slump')`

- [ ] **Step 1: 공통 헬퍼 + MIX 장면 구현**

```js
// ── 캔버스 공통 ───────────────────────────────────────────────────
function canvasStage(w, hgt) {
  const dpr = window.devicePixelRatio || 1;
  const canvas = h('canvas', { class: 'canvas-stage', width: w * dpr, height: hgt * dpr,
    style: `max-width:${w}px` });
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { canvas, ctx };
}
const easeOutCubic = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
function sceneShell(root, title, sub, canvas, actions) {
  root.append(h('h1', {}, title), h('p', { class: 'sub' }, sub), canvas,
    h('div', { class: 'stage-actions' }, actions));
}

// ── MIX: 드럼 믹서 ────────────────────────────────────────────────
Scenes.mix = () => {
  let raf = 0, start = 0;
  const W = 900, H = 420;
  const mix = designToMix();
  const wc = mix.cement > 0 ? mix.water / mix.cement : 1.2;
  return {
    mount(root) {
      const { canvas, ctx } = canvasStage(W, H);
      const nextBtn = h('button', { class: 'btn btn-primary', onclick: () => go('slump') },
        'Continue to Slump Test →');
      nextBtn.disabled = true;
      sceneShell(root, 'Batching & mixing', 'One cubic yard, coming up.', canvas,
        [h('button', { class: 'btn btn-ghost', onclick: () => go('slump') }, 'Skip'), nextBtn]);
      const draw = (now) => {
        if (!start) start = now;
        const t = (now - start) / 1000;
        ctx.clearRect(0, 0, W, H);
        const cx = W / 2, cy = H / 2 + 30;
        ctx.save(); ctx.translate(cx, cy);
        // 드럼 몸통
        ctx.fillStyle = '#c8cdd6'; ctx.strokeStyle = '#9aa2b1'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, 160, 115, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // 내부 클리핑
        ctx.save();
        ctx.beginPath(); ctx.ellipse(0, 0, 152, 108, 0, 0, Math.PI * 2); ctx.clip();
        // 콘크리트 차오름 — w/c에 따라 명도/광택
        const fill = Math.min(1, t / 2.6);
        const light = 58 - Math.min(18, Math.max(0, (wc - 0.4) * 40)); // 젖을수록 어둡게
        ctx.fillStyle = `hsl(220 6% ${light}%)`;
        ctx.fillRect(-152, 108 - 190 * fill, 304, 190 * fill);
        // 골재 점 (시드 고정)
        const rng = E.mulberry32(7);
        for (let i = 0; i < 80; i++) {
          const x = (rng() * 2 - 1) * 140, y = 108 - rng() * 180 * fill;
          if (y < 106) {
            ctx.fillStyle = i % 3 ? '#7b7f88' : '#a9adb5';
            ctx.beginPath(); ctx.arc(x, y, 2 + rng() * 4, 0, 7); ctx.fill();
          }
        }
        if (wc > 0.62) { // 과수 배합 광택
          ctx.fillStyle = 'rgba(160,200,255,.25)';
          ctx.beginPath(); ctx.ellipse(0, 55, 120, 24, 0, 0, Math.PI * 2); ctx.fill();
        }
        // 회전 블레이드
        ctx.rotate(t * 1.6);
        for (let i = 0; i < 3; i++) {
          ctx.rotate((Math.PI * 2) / 3);
          ctx.fillStyle = 'rgba(120,128,142,.45)'; ctx.fillRect(-8, -104, 16, 92);
        }
        ctx.restore(); ctx.restore();
        // 투입 스트림: 시멘트 → 물 → 골재
        if (t < 2.4) {
          ctx.fillStyle = t < 0.9 ? '#8f949c' : t < 1.6 ? '#4f8ef0' : '#b7a98d';
          ctx.fillRect(cx - 6, 44, 12, cy - 115 - 44);
        }
        // 캡션
        ctx.fillStyle = '#5b6472'; ctx.font = '600 14px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(t < 0.9 ? 'Adding cement…' : t < 1.6 ? 'Adding water…' :
          t < 2.6 ? 'Adding aggregates…' : 'Mixing…', cx, 32);
        if (t >= 4 && nextBtn.disabled) nextBtn.disabled = false;
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    },
    unmount() { cancelAnimationFrame(raf); },
  };
};
```

- [ ] **Step 2: 브라우저 확인**

Summary → Batch & Mix → 믹싱 애니메이션 4초 재생, 이후 Continue 활성화. w/c 큰 배합(예: water 440)에서 광택 표현 확인. 스크린샷 저장.

- [ ] **Step 3: 커밋**

```bash
git add index.html
git commit -m "feat: 캔버스 공통 헬퍼 + 드럼 믹서 장면"
```

---

### Task 10: SLUMP 슬럼프 시험 장면 (핵심 연출)

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `canvasStage`, `easeOutCubic`, `sceneShell`, `game.result` (Task 5, 9 — `game.result.behavior.mode/slump/segregation`, `game.result.measuredSlump`)
- Produces: `Scenes.slump` — 채움→인발→변형→측정 4페이즈. "Proceed to Strength Test →" → `go('compression')`

**연출 타임라인:** fill 0–2.2s (3층 채움 + 다짐봉) → lift 2.2–4.2s (콘 상승) → settle 4.2–5.4s (easeOutCubic로 변형 p:0→1) → measure (자·화살표·측정값 + 거동 배지 + 버튼 표시)

- [ ] **Step 1: SLUMP 장면 구현**

```js
// ── SLUMP: 슬럼프 시험 ────────────────────────────────────────────
Scenes.slump = () => {
  let raf = 0, start = 0;
  const W = 900, H = 470, PX = 15; // 1 in. = 15 px
  const groundY = H - 60, baseX = W / 2 - 120;
  const r = game.result; // { behavior:{mode,slump}, measuredSlump }
  return {
    mount(root) {
      const { canvas, ctx } = canvasStage(W, H);
      const modeBadge = { zero: ['badge-amber', 'Zero slump — too dry'],
        true: ['badge-green', 'True slump'],
        shear: ['badge-amber', 'Shear slump — harsh mix'],
        collapse: ['badge-red', 'Collapse — too wet'] }[r.behavior.mode];
      const info = h('div', { class: 'stage-actions', style: 'min-height:34px' });
      const nextBtn = h('button', { class: 'btn btn-primary', onclick: () => go('compression') },
        'Proceed to Strength Test →');
      nextBtn.style.display = 'none';
      sceneShell(root, 'Slump test (ASTM C143)',
        'Fill in three lifts, rod each 25 times, lift the cone — and watch.', canvas, [nextBtn]);
      root.insertBefore(info, root.querySelector('.stage-actions'));

      // 콘(금속 프러스텀) 그리기 — liftY: 인발 높이(px)
      function drawCone(liftY) {
        const topW = 2 * PX, botW = 4 * PX, hgt = 12 * PX;
        const y0 = groundY - liftY;
        ctx.strokeStyle = '#7d8797'; ctx.lineWidth = 4; ctx.fillStyle = 'rgba(190,198,210,.35)';
        ctx.beginPath();
        ctx.moveTo(baseX - botW, y0); ctx.lineTo(baseX - topW, y0 - hgt);
        ctx.lineTo(baseX + topW, y0 - hgt); ctx.lineTo(baseX + botW, y0);
        ctx.fill(); ctx.stroke();
        // 손잡이
        ctx.strokeStyle = '#9aa2b1'; ctx.lineWidth = 3;
        ctx.strokeRect(baseX - botW - 14, y0 - hgt * 0.55, 14, 5);
        ctx.strokeRect(baseX + botW, y0 - hgt * 0.55, 14, 5);
      }
      // 콘크리트 프로파일 — p: 변형 진행도 0→1
      function drawConcrete(p) {
        const s = r.behavior.slump, mode = r.behavior.mode;
        ctx.fillStyle = '#83878f'; ctx.strokeStyle = '#666b74'; ctx.lineWidth = 1.5;
        const frustum = (rB, rT, hgt, dx) => { // 사다리꼴 단면 (인치 단위)
          ctx.beginPath();
          ctx.moveTo(baseX + dx - rB * PX, groundY);
          ctx.lineTo(baseX + dx - rT * PX, groundY - hgt * PX);
          ctx.lineTo(baseX + dx + rT * PX, groundY - hgt * PX);
          ctx.lineTo(baseX + dx + rB * PX, groundY);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        };
        if (mode === 'zero') {
          frustum(4, 2, 12 - 0.3 * p, 0); // 거의 원형 유지
        } else if (mode === 'true') {
          const hgt = 12 - s * p;
          const rB = 4 + s * 0.45 * p, rT = 2 + s * 0.35 * p;
          // 둥근 마운드: 프러스텀 + 상단 타원
          frustum(rB, rT, hgt, 0);
          ctx.beginPath();
          ctx.ellipse(baseX, groundY - hgt * PX, rT * PX, 0.35 * PX + s * 0.4 * p, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (mode === 'shear') {
          const hgt = 12 - s * 0.6 * p;
          frustum(3.4, 1.8, hgt, -0.8 * PX * p);            // 남은 몸통 (살짝 좌측, dx는 px)
          // 전단면으로 미끄러진 반쪽
          ctx.save();
          ctx.translate(baseX + (2.5 + s * 0.5) * PX * p, groundY);
          ctx.rotate(0.5 * p);
          ctx.beginPath();
          ctx.moveTo(-2.2 * PX, 0); ctx.lineTo(-0.6 * PX, -(hgt * 0.55) * PX / 1.4);
          ctx.lineTo(1.8 * PX, -(hgt * 0.3) * PX / 1.4); ctx.lineTo(2.6 * PX, 0);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.restore();
        } else { // collapse
          const hgt = 1.6 + (12 - 1.6) * (1 - p);
          const rB = 4 + 13 * p;
          // 블리딩 수막 링
          ctx.save(); ctx.fillStyle = 'rgba(140,185,235,.30)';
          ctx.beginPath(); ctx.ellipse(baseX, groundY, (rB + 2.5) * PX, 7, 0, 0, Math.PI * 2);
          ctx.fill(); ctx.restore();
          // 퍼진 웅덩이 (불규칙 가장자리)
          ctx.beginPath();
          const rng = E.mulberry32(11);
          ctx.moveTo(baseX - rB * PX, groundY);
          ctx.quadraticCurveTo(baseX - rB * PX * 0.7, groundY - hgt * PX * (1 + rng() * 0.3),
            baseX - rB * PX * 0.25, groundY - hgt * PX);
          ctx.quadraticCurveTo(baseX, groundY - hgt * PX * (1.15 + rng() * 0.2),
            baseX + rB * PX * 0.3, groundY - hgt * PX * 0.95);
          ctx.quadraticCurveTo(baseX + rB * PX * 0.75, groundY - hgt * PX * (0.8 + rng() * 0.3),
            baseX + rB * PX, groundY);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        // 골재 점 (시드 고정, 형상 내부 근사)
        const rng2 = E.mulberry32(23);
        ctx.fillStyle = 'rgba(60,64,70,.5)';
        const spread = mode === 'collapse' ? 4 + 13 * p : 4.5;
        for (let i = 0; i < 40; i++) {
          const x = baseX + (rng2() * 2 - 1) * spread * PX * 0.8;
          const y = groundY - rng2() * Math.max(1, (12 - (mode === 'true' ? s * p : mode === 'collapse' ? 10 * p : 0))) * PX * 0.7;
          if (y < groundY - 2) { ctx.beginPath(); ctx.arc(x, y, 1.5 + rng2() * 2, 0, 7); ctx.fill(); }
        }
      }
      // 측정 오버레이: 원 높이선, 콘(뒤집힘) + 자 + 측정값
      function drawMeasure() {
        const topY = groundY - (12 - r.measuredSlump) * PX;
        ctx.strokeStyle = '#d92d20'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(baseX - 90, groundY - 12 * PX);
        ctx.lineTo(baseX + 220, groundY - 12 * PX); ctx.stroke(); // 원래 콘 높이
        ctx.setLineDash([]);
        // 슬럼프 화살표
        ctx.strokeStyle = '#1b66f0'; ctx.lineWidth = 2.5;
        const ax = baseX + 180;
        ctx.beginPath(); ctx.moveTo(ax, groundY - 12 * PX); ctx.lineTo(ax, topY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax - 5, topY - 7); ctx.lineTo(ax, topY);
        ctx.lineTo(ax + 5, topY - 7); ctx.stroke();
        ctx.fillStyle = '#1b66f0'; ctx.font = '700 16px Inter, sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(`Slump: ${r.measuredSlump.toFixed(2)} in.`, ax + 14, (groundY - 12 * PX + topY) / 2);
      }

      const draw = (now) => {
        if (!start) start = now;
        const t = (now - start) / 1000;
        ctx.clearRect(0, 0, W, H);
        // 지면
        ctx.fillStyle = '#d7dde6'; ctx.fillRect(0, groundY, W, H - groundY);
        if (t < 2.2) { // 채움: 3층
          drawCone(0);
          const lifts = Math.min(3, Math.floor(t / 0.7) + 1);
          const fillH = Math.min(12, (t / 2.2) * 12);
          ctx.fillStyle = '#83878f';
          ctx.fillRect(baseX - 3.5 * PX, groundY - fillH * PX, 7 * PX, fillH * PX);
          ctx.fillStyle = '#5b6472'; ctx.font = '600 13px Inter, sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(`Lift ${lifts} of 3 — rod 25 times`, W / 2, 36);
        } else if (t < 4.2) { // 인발
          const lift = easeOutCubic((t - 2.2) / 2) * 16 * PX;
          drawConcrete(0); drawCone(lift);
          ctx.fillStyle = '#5b6472'; ctx.font = '600 13px Inter, sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('Lifting the cone slowly…', W / 2, 36);
        } else { // 변형 + 측정
          const p = easeOutCubic((t - 4.2) / 1.2);
          drawConcrete(p); drawCone(16 * PX);
          if (p >= 1) {
            drawMeasure();
            if (nextBtn.style.display === 'none') {
              nextBtn.style.display = '';
              info.append(h('span', { class: 'badge ' + modeBadge[0] }, modeBadge[1]));
            }
          }
        }
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    },
    unmount() { cancelAnimationFrame(raf); },
  };
};
```

- [ ] **Step 2: 브라우저에서 4가지 거동 확인**

콘솔에서 강제 주입해 4개 모드 각각 스크린샷:
```js
// 브라우저 콘솔에서 (미션 진입 후)
game.result = MixEngine.evaluateMix({water:340,cement:616,ca:1701,fa:1303,airPct:2,nmas:0.75,isAE:false}, MixEngine.MISSIONS[0], 42); go('slump');   // true
game.result = MixEngine.evaluateMix({water:440,cement:616,ca:1701,fa:1303,airPct:2,nmas:0.75,isAE:false}, MixEngine.MISSIONS[0], 42); go('slump');   // collapse
game.result = MixEngine.evaluateMix({water:240,cement:616,ca:1701,fa:1303,airPct:2,nmas:0.75,isAE:false}, MixEngine.MISSIONS[0], 42); go('slump');   // zero
game.result = MixEngine.evaluateMix({water:340,cement:616,ca:2500,fa:500,airPct:2,nmas:0.75,isAE:false}, MixEngine.MISSIONS[0], 42); go('slump');    // shear
```
Expected: 각 모드의 형상이 구분되어 보임(정상 주저앉음 / 웅덩이+수막 / 원형 유지 / 반쪽 미끄러짐), 측정 화살표·수치 표시. 스크린샷 4장 저장.

- [ ] **Step 3: 커밋**

```bash
git add index.html
git commit -m "feat: 슬럼프 시험 장면 — 4가지 거동 연출 + 측정 오버레이"
```

---

### Task 11: COMPRESSION 압축강도 시험 장면

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `canvasStage`, `easeOutCubic`, `sceneShell`, `game.result` (`f28`, `cylinders`, `avgStrength`, `behavior.segregation`) (Task 5, 9)
- Produces: `Scenes.compression` — cast → cure → 공시체 3본 순차 재하 → 결과 표. "See Final Report →" → `go('results')`

**연출:** cast 0–1.5s (몰드 3개 채움) → cure 1.5–3.5s (Day 1→28 카운터 + 안개) → 이후 공시체당 2.6s 재하: 응력 카운터 + 응력-변형률 곡선 실시간 드로잉, 피크에서 균열 (segregation → 부스러짐 crumble / f28 ≥ 5000 → 기둥형 columnar / 그 외 원추형 cone) → 3본 완료 후 표.

**역학 모델 (Hognestad 근사):**
```js
function stressAt(fp, eps) {
  const e0 = 0.002, x = eps / e0;
  if (x <= 1) return fp * (2 * x - x * x);       // 상승부 포물선
  return Math.max(0, fp * (1 - 0.35 * (eps - e0) / 0.0018)); // 하강부 선형
}
```

- [ ] **Step 1: COMPRESSION 장면 구현**

```js
// ── COMPRESSION: 압축강도 시험 ────────────────────────────────────
Scenes.compression = () => {
  let raf = 0, start = 0;
  const W = 900, H = 470;
  const r = game.result;
  const AREA = 28.27; // 6" 지름 공시체 단면적 (in²)
  function stressAt(fp, eps) {
    const e0 = 0.002, x = eps / e0;
    if (x <= 1) return fp * (2 * x - x * x);
    return Math.max(0, fp * (1 - 0.35 * (eps - e0) / 0.0018));
  }
  return {
    mount(root) {
      const { canvas, ctx } = canvasStage(W, H);
      const nextBtn = h('button', { class: 'btn btn-primary', onclick: () => go('results') },
        'See Final Report →');
      nextBtn.style.display = 'none';
      sceneShell(root, 'Compression test (ASTM C39)',
        'Three 6×12 cylinders, 28 days moist-cured, loaded to failure.', canvas, [nextBtn]);

      const CYL_T = 2.6; // 공시체당 재하 시간(초)
      const testStart = 3.5;
      const done = [];   // 파괴 완료된 공시체 강도

      function drawUTM(cx, fp, prog, mode) {
        // prog: 0→1 재하 진행. eps = prog * 0.0038
        const eps = prog * 0.0038;
        const sigma = stressAt(fp, eps);
        const peaked = eps > 0.002;
        const cw = 3 * 16, ch = 12 * 10; // 공시체 48×120 px
        const top = 130, squash = Math.min(10, prog * 12);
        // 프레임
        ctx.fillStyle = '#aab2c0';
        ctx.fillRect(cx - 70, 60, 140, 26);               // 상부 크로스헤드
        ctx.fillRect(cx - 70, top + ch + 14, 140, 26);    // 하부 베드
        ctx.fillRect(cx - 66, 60, 14, ch + 80); ctx.fillRect(cx + 52, 60, 14, ch + 80); // 기둥
        // 플래튼
        ctx.fillStyle = '#7d8797';
        ctx.fillRect(cx - 40, top - 12 + squash, 80, 10);
        ctx.fillRect(cx - 40, top + ch + 2, 80, 10);
        // 공시체
        ctx.fillStyle = '#8d9199'; ctx.strokeStyle = '#6a6e76'; ctx.lineWidth = 1.5;
        ctx.fillRect(cx - cw / 2, top + squash, cw, ch - squash);
        ctx.strokeRect(cx - cw / 2, top + squash, cw, ch - squash);
        // 균열 (피크 이후)
        if (peaked) {
          ctx.strokeStyle = '#3d414a'; ctx.lineWidth = 2;
          const cp = Math.min(1, (eps - 0.002) / 0.0016);
          ctx.save(); ctx.beginPath(); ctx.rect(cx - cw / 2, top + squash, cw, ch - squash); ctx.clip();
          if (mode === 'columnar') {          // 수직 쪼개짐 (고강도)
            for (const dx of [-14, 0, 15]) {
              ctx.beginPath(); ctx.moveTo(cx + dx, top + squash);
              ctx.lineTo(cx + dx + 4, top + squash + (ch - squash) * cp); ctx.stroke();
            }
          } else if (mode === 'crumble') {    // 부스러짐 (재료분리)
            const rng = E.mulberry32(31);
            for (let i = 0; i < 8; i++) {
              const x0 = cx - cw / 2 + rng() * cw, y0 = top + squash + rng() * (ch - squash);
              ctx.beginPath(); ctx.moveTo(x0, y0);
              ctx.lineTo(x0 + (rng() - 0.5) * 30 * cp, y0 + rng() * 26 * cp); ctx.stroke();
            }
          } else {                            // 원추형 (표준)
            ctx.beginPath(); ctx.moveTo(cx - cw / 2, top + squash + 8);
            ctx.lineTo(cx, top + (ch + squash) / 2 + 20);
            ctx.lineTo(cx + cw / 2, top + squash + 8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - cw / 2, top + ch - 8);
            ctx.lineTo(cx, top + (ch + squash) / 2 - 10);
            ctx.lineTo(cx + cw / 2, top + ch - 8); ctx.stroke();
          }
          ctx.restore();
        }
        // 판독기
        ctx.fillStyle = '#141c2b'; ctx.font = '700 22px Inter, sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(`${Math.round(sigma).toLocaleString()} psi`, cx + 110, 150);
        ctx.font = '500 13px Inter, sans-serif'; ctx.fillStyle = '#5b6472';
        ctx.fillText(`${Math.round(sigma * AREA).toLocaleString()} lbf`, cx + 110, 172);
        return { eps, sigma };
      }
      function drawGraph(fp, epsNow) {
        // 우측 응력-변형률 미니 그래프
        const gx = 610, gy = 110, gw = 250, gh = 220;
        ctx.strokeStyle = '#c9cfda'; ctx.lineWidth = 1.5;
        ctx.strokeRect(gx, gy, gw, gh);
        ctx.fillStyle = '#98a1b0'; ctx.font = '500 11px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('strain', gx + gw / 2, gy + gh + 16);
        ctx.save(); ctx.translate(gx - 8, gy + gh / 2); ctx.rotate(-Math.PI / 2);
        ctx.fillText('stress (psi)', 0, 0); ctx.restore();
        ctx.strokeStyle = '#1b66f0'; ctx.lineWidth = 2.5; ctx.beginPath();
        const yMax = r.f28 * 1.15 || 1000;
        for (let e = 0; e <= epsNow; e += 0.00004) {
          const px2 = gx + (e / 0.0038) * gw;
          const py = gy + gh - (stressAt(fp, e) / yMax) * gh;
          e === 0 ? ctx.moveTo(px2, py) : ctx.lineTo(px2, py);
        }
        ctx.stroke();
      }
      const failMode = r.behavior.segregation ? 'crumble' : (r.f28 >= 5000 ? 'columnar' : 'cone');

      const draw = (now) => {
        if (!start) start = now;
        const t = (now - start) / 1000;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#5b6472'; ctx.font = '600 13px Inter, sans-serif'; ctx.textAlign = 'center';
        if (t < 1.5) { // cast
          ctx.fillText('Casting cylinders…', W / 2, 36);
          for (let i = 0; i < 3; i++) {
            const cx = W / 2 - 140 + i * 140, fillH = Math.min(1, t / 1.2 - i * 0.15) * 110;
            ctx.strokeStyle = '#7d8797'; ctx.lineWidth = 2; ctx.strokeRect(cx - 24, 200, 48, 120);
            if (fillH > 0) { ctx.fillStyle = '#83878f'; ctx.fillRect(cx - 22, 320 - Math.max(0, fillH), 44, Math.max(0, fillH)); }
          }
        } else if (t < testStart) { // cure
          const day = Math.min(28, Math.max(1, Math.round(((t - 1.5) / 2) * 28)));
          ctx.fillText('Moist curing…', W / 2, 36);
          ctx.font = '800 46px Inter, sans-serif'; ctx.fillStyle = '#141c2b';
          ctx.fillText(`Day ${day}`, W / 2, H / 2 - 10);
          ctx.font = '500 14px Inter, sans-serif'; ctx.fillStyle = '#5b6472';
          ctx.fillText('73 °F · 100% RH', W / 2, H / 2 + 18);
        } else { // 3본 순차 재하
          const idx = Math.min(2, Math.floor((t - testStart) / CYL_T));
          const prog = Math.min(1, ((t - testStart) - idx * CYL_T) / (CYL_T * 0.92));
          ctx.fillText(`Cylinder ${idx + 1} of 3`, W / 2, 36);
          const { eps } = drawUTM(280, r.cylinders[idx], prog, failMode);
          drawGraph(r.cylinders[idx], eps);
          if (prog >= 1 && done.length === idx) done.push(r.cylinders[idx]);
          // 완료 목록
          ctx.textAlign = 'left'; ctx.font = '600 14px Inter, sans-serif';
          done.forEach((s, i) => {
            ctx.fillStyle = '#12855f';
            ctx.fillText(`#${i + 1}: ${Math.round(s).toLocaleString()} psi`, 610, 370 + i * 22);
          });
          if (done.length === 3 && nextBtn.style.display === 'none') {
            ctx.fillStyle = '#141c2b'; ctx.font = '700 15px Inter, sans-serif';
            ctx.fillText(`Average: ${Math.round(r.avgStrength).toLocaleString()} psi`, 610, 440);
            nextBtn.style.display = '';
          } else if (done.length === 3) {
            ctx.fillStyle = '#141c2b'; ctx.font = '700 15px Inter, sans-serif';
            ctx.fillText(`Average: ${Math.round(r.avgStrength).toLocaleString()} psi`, 610, 440);
          }
        }
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    },
    unmount() { cancelAnimationFrame(raf); },
  };
};
```

- [ ] **Step 2: 브라우저 확인**

정상 배합: 캐스팅 → Day 카운터 → 3본 재하(카운터 상승, 곡선 드로잉, 원추형 균열) → 평균 표시 + 버튼. 저품질 배합(water 440)에서 crumble 균열, 고강도 배합(column 미션 w/c 0.41)에서 columnar 확인. 스크린샷 저장.

- [ ] **Step 3: 커밋**

```bash
git add index.html
git commit -m "feat: 압축강도 시험 장면 — UTM 재하·응력-변형률 곡선·파괴 모드"
```

---

### Task 12: RESULTS 결과 리포트 + 최고 기록

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `game.result.score` (`Score` — Task 4), `game.mission`, `bestScores` (Task 6)
- Produces: `Scenes.results` — 등급 배지·별·브레이크다운 바·노트·Retry/New Mission. localStorage `mixlab-best` 갱신

- [ ] **Step 1: RESULTS 장면 구현**

```js
// ── RESULTS: 결과 리포트 ──────────────────────────────────────────
Scenes.results = () => ({
  mount(root) {
    const r = game.result, m = game.mission, sc = r.score;
    // 최고 기록 갱신
    try {
      const best = bestScores();
      if (!best[m.id] || best[m.id] < sc.total) {
        best[m.id] = sc.total;
        localStorage.setItem('mixlab-best', JSON.stringify(best));
      }
    } catch (e) { /* 저장 불가 환경 무시 */ }

    const gradeColor = { A: 'var(--green)', B: 'var(--primary)', C: 'var(--amber)',
      D: 'var(--amber)', F: 'var(--red)' }[sc.grade];
    const row = (label, detail, pts, max) => h('div', { class: 'score-row' },
      h('div', { style: 'font-weight:600' }, label),
      h('div', {},
        h('div', { style: 'font-size:13px;color:var(--muted);margin-bottom:5px' }, detail),
        h('div', { class: 'score-bar' },
          h('div', { style: `width:${(pts / max) * 100}%;background:${pts === max ? 'var(--green)' : pts > 0 ? 'var(--amber)' : 'var(--red)'}` }))),
      h('div', { style: 'text-align:right;font-weight:700;font-variant-numeric:tabular-nums' },
        `${Math.round(pts)} / ${max}`));

    const target = E.targetAirFor(m, designToMix().nmas);
    root.append(
      h('h1', {}, 'Inspection report'),
      h('p', { class: 'sub' }, `${m.icon} ${m.name} — final verdict from the testing lab.`),
      h('div', { class: 'wizard-grid' },
        h('div', { class: 'card' },
          h('div', { style: 'display:flex;gap:22px;align-items:center;margin-bottom:14px' },
            h('div', { class: 'grade-badge', style: `background:${gradeColor}` }, sc.grade),
            h('div', {},
              h('div', { style: 'font-size:30px;font-weight:800' }, `${sc.total} / 100`),
              h('div', { style: 'font-size:20px;letter-spacing:2px;color:var(--amber)' },
                '★'.repeat(sc.stars) + '☆'.repeat(5 - sc.stars)))),
          row('Slump', `Measured ${r.measuredSlump.toFixed(2)} in. · required ${m.slumpRange[0]}–${m.slumpRange[1]} in.`,
            sc.slumpPts, 40),
          row('Strength', `Average ${Math.round(r.avgStrength).toLocaleString()} psi · required f'c ${m.fc.toLocaleString()} psi`,
            sc.strengthPts, 40),
          row('Air content', `Batched ${designToMix().airPct}%` + (target ? ` · target ${target}%` : ' · non-AE mix'),
            sc.airPts, 10),
          row('Yield', `Absolute volume ${r.yieldVol.toFixed(2)} cu ft · target 27.0 cu ft`,
            sc.yieldPts, 10),
          h('div', { class: 'wiz-nav' },
            h('button', { class: 'btn', onclick: () => { game.result = null; game.seed = Math.floor(Math.random() * 1e6); go('design'); } },
              '↻ Retry mission'),
            h('button', { class: 'btn btn-primary', onclick: () => { game.mission = null; go('home'); } },
              'New mission →'))),
        h('div', { class: 'ref-panel' },
          h('div', { class: 'card' },
            h('h2', {}, "Inspector's notes"),
            h('ul', { style: 'margin:8px 0 0;padding-left:18px;color:var(--muted)' },
              sc.notes.map(n => h('li', { style: 'margin-bottom:8px' }, n)))))));
  },
});
```

- [ ] **Step 2: 브라우저 확인**

정상 플레이(만점) → A 배지·별 5·초록 바·"Textbook mix" 노트. 붕괴 배합 → F·빨간 바·collapse 노트. Retry → 위저드(값 유지), New Mission → 홈(Best 배지 갱신). 스크린샷 저장.

- [ ] **Step 3: 커밋**

```bash
git add index.html
git commit -m "feat: 결과 리포트 장면 — 등급·브레이크다운·노트·최고기록"
```

---

### Task 13: build.mjs — 단일 파일 빌드

**Files:**
- Create: `build.mjs`

**Interfaces:**
- Consumes: `index.html`의 `<script src="engine.js"></script>` 태그 (Task 6)
- Produces: `dist/index.html` — 완전 단일 파일 (외부 참조는 Google Fonts만)

- [ ] **Step 1: build.mjs 작성**

```js
// build.mjs — engine.js를 index.html에 인라인해 dist/index.html 생성
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const engine = readFileSync('engine.js', 'utf8');
const TAG = '<script src="engine.js"></script>';
if (!html.includes(TAG)) throw new Error('engine.js script 태그를 찾지 못했습니다');
const out = html.replace(TAG, '<script>\n' + engine + '\n</script>');
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', out);
console.log(`dist/index.html 생성 완료 (${(out.length / 1024).toFixed(1)} KB)`);
```

- [ ] **Step 2: 빌드 실행 + 산출물 검증**

Run: `node build.mjs`
Expected: `dist/index.html 생성 완료 (… KB)`

Run: `grep -c 'src="engine.js"' dist/index.html` → `0` (인라인 완료), `grep -c 'MixEngine' dist/index.html` → 1 이상

- [ ] **Step 3: file:// 스모크 테스트**

브라우저 페인에서 `file:///D:/Projects/Test/dist/index.html` 열기 → 홈 렌더 + 미션 진입 + 콘솔 에러 0건 확인. 스크린샷 저장.

- [ ] **Step 4: 커밋**

```bash
git add build.mjs
git commit -m "feat: 단일 파일 빌드 스크립트 (dist/index.html)"
```

---

### Task 14: 플레이 검증 3종 (E2E, 화면 캡처 대조)

**Files:** 없음 (검증 전용 태스크 — 코드 결함 발견 시 수정 커밋 허용)

**Interfaces:**
- Consumes: 완성된 앱 전체 (Task 1–13)

스펙 §7.2의 검증 시나리오. **미션 1 (Residential Slab, 3/4" NMAS, 비공기연행)** 기준. 각 시나리오는 UI를 통해 처음부터 끝까지 실제 플레이하고, 각 장면 스크린샷을 캡처해 기대 결과와 대조한다.

- [ ] **Step 1: 시나리오 ⓐ — 교과서 정답 배합**

입력값: slump 3.5 / NMAS 3/4" / Non-AE, water **340**, air **2** / w/c **0.55** / cement **616** / CA **1701** / FA **1303**
Expected: 슬럼프 장면 **true slump**, 측정 3.25–3.75 in. → 압축 3본 평균 ≈ 3,900–4,300 psi → 결과 **A / 100** 부근, "Textbook mix" 노트.
캡처: 위저드 스텝 3(수량 표), 슬럼프 결과, 압축 평균, 최종 리포트 — 4장.

- [ ] **Step 2: 시나리오 ⓑ — 물 과다 (+100 lb)**

입력값: ⓐ와 동일하되 water **440**.
Expected: 슬럼프 **collapse**(웅덩이 + 블리딩 수막), 측정 ≥ 9 in. → 강도 미달(≈2,400 psi) → **F**, collapse 노트 + 강도 노트.
캡처: 슬럼프 붕괴 장면, 최종 리포트 — 2장.

- [ ] **Step 3: 시나리오 ⓒ — 물 과소 (−100 lb)**

입력값: ⓐ와 동일하되 water **240**.
Expected: 슬럼프 **zero**(형상 유지), 측정 ≤ 0.5 in. → 슬럼프 감점 커서 등급 하락. "too dry" 노트.
캡처: 슬럼프 제로 장면, 최종 리포트 — 2장.

- [ ] **Step 4: 발견된 결함 수정 + 회귀 확인**

발견된 UI/엔진 결함은 superpowers:systematic-debugging으로 수정하고, `node --test engine.test.mjs` 전체 통과 재확인.

- [ ] **Step 5: 커밋 (수정이 있었던 경우)**

```bash
git add -A
git commit -m "fix: 플레이 검증에서 발견된 결함 수정"
```

---

### Task 15: Netlify 배포 + 배포 검증

**Files:** 없음 (배포 전용)

**Interfaces:**
- Consumes: `dist/index.html` (Task 13)

- [ ] **Step 1: 최신 빌드 생성**

Run: `node build.mjs`

- [ ] **Step 2: Netlify MCP로 배포**

1. ToolSearch로 Netlify MCP 도구 로드 (`get-netlify-coding-context`, `netlify-deploy-services-updater`, `netlify-project-services-updater` 등)
2. `get-netlify-coding-context` 먼저 호출 (서버 규약)
3. 신규 사이트 생성(사이트명 예: `mixlab-concrete-game`) 후 `dist/` 디렉터리 배포
4. MCP가 미인증/실패 상태면: 사용자에게 배포 URL 없이 보고하고, claude.ai 커넥터 설정 또는 대화형 세션 `/mcp` 인증 후 재시도 안내. (Netlify Drop에 dist/index.html을 수동 업로드하는 대안도 안내)

- [ ] **Step 3: 배포 URL 검증**

브라우저 페인에서 배포 URL 열기 → 홈 렌더, 미션 1 빠른 플레이 1회(슬럼프 장면까지), 콘솔 에러 0건. 스크린샷 저장.

- [ ] **Step 4: README 간단 작성 + 최종 커밋**

```markdown
# MixLab — Concrete Mix Design Challenge

An educational web game: proportion a concrete mix with the ACI 211.1 tables,
then put it through a virtual slump test and compression test.

- Play: <배포 URL>
- Dev: `python -m http.server 8123` → http://localhost:8123
- Test: `node --test engine.test.mjs`
- Build: `node build.mjs` → `dist/index.html` (single file)
```

```bash
git add README.md
git commit -m "docs: README — 플레이 URL·개발·빌드 안내"
```

---

## 계획 자체 검토 결과

- **스펙 커버리지:** 스펙 §2(요구사항 표) → Global Constraints·Task 1/6/13/15. §3.1→Task 6, §3.2→Task 7–8, §3.3→Task 9, §3.4→Task 10, §3.5→Task 11, §3.6→Task 12, §4(엔진)→Task 2–5, §5(디자인)→Task 6 CSS, §6(구조)→Task 1/13, §7(테스트·검증)→각 태스크 Step + Task 14, 배포→Task 15. 누락 없음.
- **자리표시자:** 없음 — 모든 코드 스텝에 실제 코드 포함.
- **타입 일관성:** `Mix`/`Mission`/`Score`/`Evaluation` 형태와 함수 시그니처를 Interfaces 블록에 명시했고 태스크 간 동일 명칭 사용 확인 (`predictSlump`, `classifyBehavior`, `evaluateMix`, `scoreMix`, `targetAirFor`, `designToMix`, `canvasStage`, `sceneShell`).
