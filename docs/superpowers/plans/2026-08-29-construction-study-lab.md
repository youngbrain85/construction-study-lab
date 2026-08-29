# Construction Study Lab 개편 구현 계획 (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v1 MixLab을 Construction Study Lab 허브의 첫 모듈로 개편 — ACI PRC-211.1-22 정합(절대용적법·f'cr 표·형상 보정·OD/SSD), ASTM C143 리얼리즘 재디자인, 확장 가능한 site/ 구조, Netlify 재배포.

**Architecture:** `site/` 정적 멀티파일(허브 index.html + `labs/mix-design/` 모듈 + `shared/theme.css` 공통 디자인 시스템). 엔진은 순수 함수 유지, node --test. Canvas 절차 렌더 유지.

**Tech Stack:** 바닐라 JS(ES2020), Canvas 2D, CSS custom properties, Inter, node --test, Netlify

**Spec:** `docs/superpowers/specs/2026-08-29-construction-study-lab-design.md` (필요 수치·연출 정의는 스펙이 원본)

## Global Constraints

- 프레임워크·npm 의존성 금지, 외부 리소스는 Google Fonts(Inter)만. UI 영어, 주석 한국어.
- 엔진 순수 함수, `node --test engine.test.mjs` (루트에서) 통과가 모든 엔진 태스크의 게이트.
- **판정 앵커(스펙 §3.4)**: 강의 예제 배합 water 299 / CM 544 / CA 1,872 / FA 1,292 / air 1.5% / NMAS 1" / rounded → slump 3.5 in · 강도 ≈4,124 psi · 수율 27.00 ft³ · **100점 A**. 이 수치가 재현되지 않으면 태스크 실패.
- `SHAPE_FACTOR = { rounded: 0.92, crushed: 1.0 }`, `MAT = { sgCement:3.15, sgCA:2.68, absCA:0.005, druwCA:100, sgFA:2.64, absFA:0.007, fmSand:2.60, wUnit:62.4 }`
- `fcrFor(fc)`: `<3000 → fc+1000`, `3000–5000 → fc+1200`, `>5000 → 1.1·fc+700`
- localStorage 키 `mixlab-best` 유지. shear 슬럼프점수 반감 규칙 유지.
- Canvas 장면: 이미지 에셋 금지(절차 렌더), 시드 고정, unmount에서 cancelAnimationFrame, `if (!ctx)` 텍스트 폴백 유지.
- 시각 세부 수치(좌표·색 미세값)는 구현 재량 — 단 스펙 §5의 연출 요소(다짐 카운터, 5초 인발 타이머, 뒤집은 콘+봉 측정, base plate, 디지털 로드 패널 등)는 필수.
- 커밋: conventional commits + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- dev 서버: `python -m http.server 8123 --directory site` (Task 1에서 launch.json 갱신). 브라우저 검증은 javascript_tool/read_page 방식(스크린샷·computer 도구 불가, rAF 수동 드라이버 페이지 패치 허용·프로덕션 무수정).

## 파일 구조 (최종)

```
site/
├── index.html                     # 허브
├── shared/theme.css               # 공통 디자인 시스템
└── labs/mix-design/
    ├── index.html                 # 모듈
    └── engine.js
engine.test.mjs                    # 루트, ./site/labs/mix-design/engine.js 로드
.claude/launch.json                # --directory site
README.md                          # 갱신
(삭제: build.mjs, dist/)
```

---

### Task 1: site/ 구조 이관

**Files:**
- Move: `index.html` → `site/labs/mix-design/index.html`, `engine.js` → `site/labs/mix-design/engine.js` (git mv)
- Modify: `engine.test.mjs`(require 경로), `.claude/launch.json`
- Delete: `build.mjs`, `dist/`

**Interfaces:**
- Produces: 이후 모든 태스크의 경로 기준. dev 서버 루트 = `site/` → 모듈 URL `http://localhost:8123/labs/mix-design/`

- [ ] **Step 1:** `git mv index.html site/labs/mix-design/index.html && git mv engine.js site/labs/mix-design/engine.js`, `git rm build.mjs`, `rm -rf dist`
- [ ] **Step 2:** `engine.test.mjs`의 require를 `require('./site/labs/mix-design/engine.js')`로 수정
- [ ] **Step 3:** `.claude/launch.json` runtimeArgs를 `["-m", "http.server", "8123", "--directory", "site"]`로 수정
- [ ] **Step 4:** 검증 — `node --test engine.test.mjs` 17/17, dev 서버에서 `/labs/mix-design/` 접속 시 모듈 로드(콘솔 에러 0). 허브(`/`)는 아직 디렉터리 리스팅이어도 무방(Task 3에서 생성)
- [ ] **Step 5:** 커밋 `chore: site/ 멀티파일 구조로 이관 (단일파일 빌드 폐지)`

---

### Task 2: 엔진 — 재료·형상·f'cr·중량법 제거 (TDD)

**Files:**
- Modify: `site/labs/mix-design/engine.js`, `engine.test.mjs`

**Interfaces:**
- Consumes: v1 엔진 전체
- Produces:
  - `MixEngine.DATA.MAT` — Global Constraints의 새 상수 (fmSand 2.60, sgCA 2.68, absCA/absFA 추가)
  - `MixEngine.DATA.SHAPE_FACTOR = { rounded: 0.92, crushed: 1.0 }`
  - `Mix.aggShape: 'rounded'|'crushed'` — `predictSlump`가 앵커에 `SHAPE_FACTOR[aggShape]`를 곱함 (aggShape 누락 시 'crushed' 취급)
  - `MixEngine.fcrFor(fc) -> number`
  - `MixEngine.MISSIONS[*].aggShape` — slab·wall='rounded', bridge·column·pavement='crushed'
  - **삭제:** `DATA.FRESH_WEIGHT_TABLE` (및 관련 테스트·주석)

- [ ] **Step 1: 테스트 전면 갱신 (RED)** — `engine.test.mjs`의 `TEXTBOOK`과 관련 시나리오를 교체:

```js
// 새 기준 배합 = 강의 예제 (미션1: 1" NMAS, 비공기연행, well-rounded gravel)
const TEXTBOOK = { water: 299, cement: 544, ca: 1872, fa: 1292, airPct: 1.5,
  nmas: 1.0, isAE: false, aggShape: 'rounded' };
```

갱신·추가 테스트 (기존 테스트의 수치를 다음으로 교체, FRESH_WEIGHT 관련 assert 삭제):

```js
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

test('fcrFor: 3단계 규칙', () => {
  assert.equal(E.fcrFor(2500), 3500);
  assert.equal(E.fcrFor(3000), 4200);
  assert.equal(E.fcrFor(5000), 6200);
  assert.equal(E.fcrFor(6000), 7300);
});

test('computeYield: 강의 예제 = 27.00 ft³', () => {
  assert.ok(Math.abs(E.computeYield(TEXTBOOK) - 27.0) < 0.05);
});

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
```

기존 shear 테스트(`ca:2500, fa:500`)·Abrams 앵커 테스트·AE 보정 테스트·mulberry32 테스트·scoreMix 수식 테스트는 유지하되, mix 객체에 `aggShape` 명시(shear·Abrams·scoreMix 계열은 `aggShape:'crushed', nmas:0.75` 기준으로 v1 수치 유지 — 앵커 315/340/360 불변이므로 기대값 변화 없음). AE 테스트도 `aggShape:'crushed'` 명시.

- [ ] **Step 2:** `node --test engine.test.mjs` → FAIL 확인 (새 상수·fcrFor 부재)
- [ ] **Step 3: 구현** — `MAT` 교체, `SHAPE_FACTOR` 추가, `predictSlump` 앵커에 `(SHAPE_FACTOR[mix.aggShape] ?? 1.0)` 곱, `fcrFor` 추가·등록, `FRESH_WEIGHT_TABLE` 삭제, MISSIONS에 `aggShape`. 주석 한국어.
- [ ] **Step 4:** 전체 통과 확인 (기존 유지 테스트 포함)
- [ ] **Step 5:** 커밋 `feat: ACI PRC-211.1-22 정합 — 강의 재료·형상 계수·fcr 규칙, 중량법 제거`

**주의:** 이 시점에 모듈 UI(Step 7 중량법 표 참조)가 `FRESH_WEIGHT_TABLE` 부재로 깨진다 — Task 4–5가 고치기 전까지 브라우저 검증은 엔진 테스트로 대체. 커밋 메시지에 명시.

---

### Task 3: shared/theme.css + 허브 페이지

**Files:**
- Create: `site/index.html`(허브), `site/shared/theme.css`
- Modify: `site/labs/mix-design/index.html` — 인라인 CSS 중 공통 부분을 theme.css로 이동, `<link rel="stylesheet" href="../../shared/theme.css">` 로드, 모듈 전용 스타일만 인라인 유지. `<title>Mix Design Lab — Construction Study Lab</title>`. 앱바 로고 왼쪽에 `← All Labs` 링크(`../../`) 추가

**Interfaces:**
- Produces:
  - `theme.css` — v1 디자인 토큰·공통 컴포넌트(`:root` 토큰, appbar, .card .btn* .badge* .ref-table .num-field .choice* .stepper .wizard-grid .canvas-stage .stage-actions .score-* .grade-badge, 미션/모듈 카드 그리드) + 폴리시(hover 트랜지션 `transform .15s, box-shadow .15s`, 섀도 정돈). **클래스명은 v1 그대로 유지** (모듈 마크업 무수정 원칙)
  - 허브 `LABS` 레지스트리:

```js
const LABS = [
  { id: 'mix-design', name: 'Mix Design Lab', icon: '🧪', href: 'labs/mix-design/',
    desc: 'Proportion a concrete mix with the ACI tables, then put it through virtual slump and strength tests.',
    meta: '5 missions · ACI PRC-211.1-22', active: true },
  { id: 'soon-1', active: false }, { id: 'soon-2', active: false },
];
```

- [ ] **Step 1:** theme.css 추출·정제 (모듈 렌더 결과가 시각적으로 동일해야 함 — 클래스 계약 불변)
- [ ] **Step 2:** 허브 작성 — 앱바(⬢ Construction Study Lab) / 히어로(H1 + "Interactive labs for construction materials — CNST-111") / 모듈 카드 그리드(활성 카드: 아이콘·설명·meta 배지·localStorage `mixlab-best`에서 최고 등급 배지·"Enter Lab →" / 비활성 카드 2: 🔒 + "New lab coming soon", cursor:default) / 푸터. `<title>Construction Study Lab</title>`
- [ ] **Step 3:** 브라우저 검증 — `/` 허브 렌더·카드 hover·Enter Lab → 모듈 이동·← All Labs 복귀, 모듈 화면 v1과 동일 렌더(theme 분리 회귀 없음), 콘솔 에러 0
- [ ] **Step 4:** 커밋 `feat: Construction Study Lab 허브 + shared 디자인 시스템 분리`

---

### Task 4: 위저드 개편 — 스텝 1·2·3·4·6 + 재료 카드

**Files:**
- Modify: `site/labs/mix-design/index.html`

**Interfaces:**
- Consumes: `E.DATA.MAT`(absCA·absFA·fmSand), `E.fcrFor`, `game.mission.aggShape`
- Produces: 스펙 §4 표의 스텝 1·2·3·4·6 동작. `designToMix()`가 `aggShape: game.mission.aggShape` 포함하도록 수정 (**엔진 판정에 필수**)

세부 (스펙 §4 준수):
- Step 1 참고표 → `[['Footings and slabs', 2, 5], ['Beams and reinforced walls', 3, 5], ['Building columns', 3, 5]]` (Member/Placement, Starting slump range min–max in.) — 강의 Slide 8 표
- Step 2 참고 노트에 `≤ 1/3 of slab depth` 추가
- Step 3: materials 카드가 미션의 `aggShape`를 표기("Well-rounded river gravel" / "Crushed stone (angular)") + 참고 노트 카드: `Angular/crushed: use the table value as-is. Well-rounded gravel: start with an 8% reduction.` (강의 Slide 11)
- Step 4: refPanels에 f'cr 표 추가 —

```js
refTable("Required average strength f'cr (no strength record)",
  ["Specified f'c (psi)", "Required f'cr (psi)"],
  [["f'c < 3,000", "f'c + 1,000"], ["3,000 ≤ f'c ≤ 5,000", "f'c + 1,200"], ["f'c > 5,000", "1.1 × f'c + 700"]])
```

  힌트 텍스트를 `Assume no acceptable strength record. Read the f'cr table first, then pick w/cm.`로 교체(자동 계산 제거)
- Step 6: 공식 카드를 2줄로 — `OD weight = (b/b₀) × 27 cu ft × dry-rodded unit weight` / `SSD weight = OD × (1 + absorption)`. 입력 라벨 `Coarse aggregate (SSD basis)`. materials 카드에 흡수율 2행 추가(CA 0.5% / FA 0.7%)
- Materials 카드 값 갱신: CA specific gravity (SSD) 2.68, FA FM 2.60 (E.DATA.MAT에서 생성이므로 자동 — 표기 라벨만 확인)

- [ ] **Step 1:** 구현 (스텝 5·7·Summary는 이 태스크에서 무변경 — 단 `designToMix`의 aggShape 추가는 여기서)
- [ ] **Step 2:** 브라우저 검증 — 미션별 재료 카드 형상 표기, f'cr 표 렌더, 스텝 6 공식 2줄, `designToMix()` 반환에 aggShape 포함(JS로 확인), 콘솔 에러 0 (스텝 7은 아직 깨져 있어도 무방 — Task 5 범위)
- [ ] **Step 3:** 커밋 `feat: 위저드 강의 정합 — 슬럼프표·형상보정·fcr표·OD/SSD`

---

### Task 5: Step 7 절대용적법 워크시트 + Summary

**Files:**
- Modify: `site/labs/mix-design/index.html`

**Interfaces:**
- Consumes: `numField`, `refTable`, `game.design`, `renderDesign`/`updateWizNav`
- Produces: `game.design`에 `vCm, vWater, vCa, vAir` 필드(워크시트용, 판정 불사용). Step 7 정의 교체. Summary에 절대용적 합 행

세부 (스펙 §4):
- 공식 카드: `V (cu yd) = mass ÷ (relative density × 1,685)` + `V_air = air% ÷ 100` + `V_fine = 1.000 − ΣV`
- 입력: `numField` 4개 — Cementitious volume / Water volume / Coarse agg. volume / Air volume (단위 `cu yd`, min 0, max 1, step 0.001) → 그 아래 라이브 표시줄: `V_fine = 1.000 − (vCm + vWater + vCa + vAir) = 0.291 cu yd` (입력값 반영, 미입력 시 '—') → `Fine aggregate (SSD basis)` 무게 입력(lb/cu yd, 0–2500)
- 라이브 표시줄 갱신: numField의 input 이벤트가 `updateWizNav()`를 부르므로, Step 7 render가 표시줄 요소를 만들고 `updateWizNav`에서 갱신하거나 각 input 리스너에서 직접 갱신 — 재렌더 금지 원칙 유지
- `ready()`: 5개 필드(vCm, vWater, vCa, vAir, fa) 모두 입력 시
- 참고 패널: refTable 없음 — materials 카드만 (RD 값이 거기 있음)
- Summary: `Actual w/c` 행 아래 `Absolute volume check` 행 추가 — `E.computeYield(designToMix())/27`을 `X.XXX cu yd`로 표시
- 중량법 잔재(FRESH_WEIGHT 참조·표) 완전 제거 확인 (`grep -c FRESH_WEIGHT site/labs/mix-design/index.html` → 0)

- [ ] **Step 1:** 구현
- [ ] **Step 2:** 브라우저 검증 — 강의 예제 값(0.102/0.177/0.415/0.015)을 입력하면 `V_fine = 0.291` 표시, FA 1292 입력 → Summary에서 Absolute volume check ≈ 1.000 cu yd, 위저드 1→7 완주·Batch & Mix 정상, 콘솔 에러 0
- [ ] **Step 3:** `node --test engine.test.mjs` 전체 통과 재확인 → 커밋 `feat: 잔골재 절대용적법 워크시트 + 배합 요약 용적 검증`

---

### Task 6: 슬럼프 장면 리얼리즘 재디자인

**Files:**
- Modify: `site/labs/mix-design/index.html` (`Scenes.slump` 전면 재작성 허용)

**Interfaces:**
- Consumes: `game.result`(불변 계약: behavior.mode/slump/segregation, measuredSlump), `canvasStage`/`sceneShell`/`easeOutCubic`, 거동 배지 문구·클래스(v1 유지)
- Produces: `Scenes.slump` — 버튼 흐름(`go('compression')`)·폴백·unmount 계약 불변

**필수 연출 (스펙 §5.1 — 누락 시 스펙 위반):**
1. 강철 base plate(콘보다 넓은 판 + 클램프/발판 표현) 위에서 시험
2. 금속 콘: 광택 수직 그라데이션 + 상·하 림(두께 표현) + 좌우 손잡이 + 발판 2, 비율 8"/4"/12"
3. 콘크리트 재질: 회갈색 수직 그라데이션 + **불규칙 다각형 굵은골재**(시드 고정, 갈색·회색 2톤, 형상별 클리핑) + 잔골재 노이즈 점 + 상부 광택 하이라이트
4. 채움 단계: 3층 + **다짐봉 스프라이트가 왕복하며 `Rodding… 17 / 25` 카운터** (층당 25, 실제 25프레임일 필요는 없음 — 카운터 수치가 25까지 오르면 됨)
5. 인발 단계: 콘 상승 중 **`Lifting: 3.2 s` 타이머 표시** (5±2초 규정 명시 캡션)
6. 측정 단계: **뒤집은 콘을 시료 옆에 세우고 다짐봉을 그 위에 수평으로 얹은 뒤, 봉 아래에서 변위된 원중심까지 수직 치수선 + `Slump: X.XX in.`** (v1 빨간 점선·화살표 삭제)
7. 거동별 형상: true=완만한 돔 / shear=절반 웨지 미끄러짐 / collapse=팬케이크+가장자리 굵은골재 몰림+블리딩 수막(밝은 반사 띠) / zero=원형 유지·거친 윤곽
8. 광원 상부 좌측 가정: 콘·콘크리트 하이라이트 방향 통일 + 접지 그림자 타원
- 타임라인은 v1 구조(fill→lift→settle→measure) 유지하되 길이 조정 재량. zero-slump 라벨 겹침 방지(v1 fix) 동등 유지.

- [ ] **Step 1:** 구현
- [ ] **Step 2:** 브라우저 검증 — 4거동 각각 콘솔 주입(새 TEXTBOOK 기준: true=299 / collapse=399 / zero=199 / shear=ca 2500·fa 500) 후 rAF 수동 드라이버로 각 페이즈 예외 0, 픽셀 검증: base plate 색 존재·수막 픽셀(collapse)·골재 다각형 색 2톤 존재·측정 치수선, nextBtn·배지 문구 v1 계약 유지
- [ ] **Step 3:** 커밋 `feat: 슬럼프 장면 ASTM C143 리얼리즘 재디자인`

---

### Task 7: 믹싱 장면 재디자인

**Files:**
- Modify: `site/labs/mix-design/index.html` (`Scenes.mix` 재작성 허용)

**필수 연출 (스펙 §5.2):** 경사식 포터블 드럼 믹서 — 주황 프레임·바퀴 2·모터 하우징, 기울어진 드럼(개구부 타원으로 내부 반죽 보임), 버킷/스쿱 투입 연출(시멘트→물→골재 순 캡션 유지), 내부 반죽 질감(골재 점+w/c 광택 반영 유지), 회전 표현. 흐름 계약(4초 후 Continue, Skip, 폴백, unmount) 불변.

- [ ] **Step 1:** 구현 → **Step 2:** 브라우저 검증(픽셀: 주황 프레임·드럼 개구부·반죽, 흐름 계약) → **Step 3:** 커밋 `feat: 믹싱 장면 드럼 믹서 사실화`

---

### Task 8: 압축 장면 재디자인

**Files:**
- Modify: `site/labs/mix-design/index.html` (`Scenes.compression` 재작성 허용)

**필수 연출 (스펙 §5.3):** 2포스트 UTM 프레임 + 유압 하부 램(상승 표현) + **별도 디지털 로드 인디케이터 패널**(어두운 박스에 7-seg풍 psi·lbf 판독) + 공시체 캡핑(상하 밝은 띠) + 파괴 유형 정밀화(Type 1 원추 / 기둥형 / 부스러짐). 유지 계약: Hognestad `stressAt`, 타임라인(cast→cure→3본 재하), 피크 고정 판독(v1 fix), catch-up 루프(v1 fix), 그래프, done/Average/nextBtn 흐름, 폴백.

- [ ] **Step 1:** 구현 → **Step 2:** 브라우저 검증(3배합 파괴 모드 cone/crumble/columnar 유지, 패널 픽셀, 예외 0) → **Step 3:** 커밋 `feat: 압축 장면 UTM 사실화`

---

### Task 9: E2E 플레이 검증 + 시각 QA (검증 전용)

- [ ] **Step 1:** 시나리오 ⓐ 강의 예제 — 허브 → Enter Lab → 미션1 → 위저드 완주(slump 3.5 / NMAS 1" / Non-AE / water 299 / air 1.5 / w/c 0.55 / CM 544 / SSD CA 1872 / 워크시트 0.102·0.177·0.415·0.015 / FA 1292) → true slump 3.25–3.75 → 평균 3,950–4,300 psi → **A / 100** + "Textbook mix" 노트
- [ ] **Step 2:** ⓑ water 399 → collapse·강도 미달·F / ⓒ water 199 → zero slump
- [ ] **Step 3:** 시각 QA — 허브·믹서·슬럼프 4거동·UTM·리포트: 픽셀 RGBA 증거 기록(innerText 덤프 + 필수 연출 요소별 픽셀 좌표 확인). 결함 발견 시 systematic-debugging으로 수정·회귀 확인·커밋
- [ ] **Step 4:** `node --test engine.test.mjs` 최종 확인

---

### Task 10: 배포 + README + 도메인 준비

- [ ] **Step 1:** README.md 갱신 — 타이틀 Construction Study Lab, 구조 설명, Play URL, dev 명령(`python -m http.server 8123 --directory site`), test 명령. 커밋 `docs: README — Construction Study Lab 구조·안내 갱신`
- [ ] **Step 2:** Netlify 재배포 — **컨트롤러가 직접 수행** (서브에이전트 정책 차단): `netlify-deploy-services-updater`(siteId f9c6c718-daac-4aed-898a-bacba6740af1)로 새 proxy 명령 발급 → **site/ 디렉터리에서** 실행
- [ ] **Step 3:** 배포 검증 — URL 200, `<title>Construction Study Lab</title>`, `/labs/mix-design/` 200 + MixEngine 존재
- [ ] **Step 4:** 도메인 준비 보고 — 사용자에게 도메인 구매 후 알려달라는 안내(연결·DNS는 후속)

---

## 계획 자체 검토

- **스펙 커버리지:** §1→T1·T10, §2→T1·T3, §3→T2, §4→T4·T5, §5→T6·T7·T8, §6→T3, §7→T10, §8→각 태스크 검증+T9. 누락 없음.
- **자리표시자:** 없음 — 캔버스 태스크는 스펙이 부여한 재량 범위 내 필수 요소 열거 방식.
- **타입 일관성:** `Mix.aggShape` 전파 경로(T2 엔진 → T4 designToMix → T9 검증) 명시. `game.design.vCm…` T5에서만 생성·사용. 클래스 계약은 T3에서 "불변" 고정.
