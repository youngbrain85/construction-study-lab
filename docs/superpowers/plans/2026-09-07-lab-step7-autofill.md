# Mix Design Lab — Step 7 절대용적 자동 채움 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mix Design Lab의 Step 7에서 시멘트·물·굵은골재·공기의 절대용적 네 칸을 앞 단계(3~6) 입력에서 자동 계산해 기본값으로 채우고, 각 칸에 대입식 힌트를 붙인다. 잔골재 무게는 그대로 학생이 계산한다.

**Architecture:** 계산은 `engine.js`의 새 순수 함수 `absoluteVolumes(mix)` 한 곳에만 둔다(node로 테스트 가능). `index.html`의 Step 7 `render()`는 이 함수를 호출해 `game.design`의 네 키를 채우고 힌트 문자열을 만든다. 판정 경로(`designToMix` → `evaluateMix`)는 건드리지 않는다.

**Tech Stack:** 바닐라 JS(브라우저 classic script + node `module.exports` 겸용 IIFE), Node 20 `node --test`, 헤드리스 Edge CDP 검증.

**Spec:** `docs/superpowers/specs/2026-09-07-lab-step7-autofill-design.md`

## Global Constraints

- 워크트리 `D:\Projects\Test\.claude\worktrees\lab-autofill`(브랜치 `worktree-lab-autofill`)에서만 작업한다. `D:\Projects\Test` 원본은 건드리지 않는다.
- 워크시트 상수는 **1,685**(화면과 Study 글에 인쇄된 값). `computeYield`의 `MAT.wUnit`(62.4)은 그대로 둔다.
- 자동 채움 대상은 `vCm`·`vWater`·`vCa`·`vAir` 네 키뿐. `fa`는 채우지 않고 `ready()` 게이트도 그대로 둔다.
- 재방문 정책: Step 7을 렌더할 때마다 네 값을 다시 계산해 덮어쓴다.
- `site/` 아래에 대문자 `CNST` 금지, 학과·대학명 금지, 리터럴 색 금지(토큰만), 푸터 문구 불변, 이모지·로고 추가 금지.
- 주석은 한국어, 화면 문구는 영어.
- 강의 예제 앵커(water 299 / cement 544 / ca 1,872 / fa 1,292 / air 1.5 % / NMAS 1" → 100점 A)는 깨지면 안 된다.
- 커밋: `git add <files> && git -c core.quotepath=false commit -F - <<'EOF' … EOF`, 한국어 메시지, 트레일러 `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- 테스트 게이트(커밋 전마다): `node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs tools/study-tables.test.mjs tools/site-guards.test.mjs tools/layout.test.mjs tools/props.test.mjs tools/decor.test.mjs tools/compaction.test.mjs tools/cylinders.test.mjs tools/gradation.test.mjs tools/rebar.test.mjs`

## File Structure

- Modify `site/labs/mix-design/engine.js` — 순수 함수 `absoluteVolumes` 추가 + export (Task 1).
- Modify `engine.test.mjs` — 앵커·결측·클램프 테스트 2개 (Task 1).
- Modify `tools/study-tables.test.mjs` — 발행된 Part 2 `#tbl-volumes`와의 대조 테스트 1개 (Task 1).
- Modify `site/labs/mix-design/index.html` — Step 7 `render()` 자동 채움·힌트·안내 문구 (Task 2).

---

### Task 1: 엔진에 `absoluteVolumes` 추가 + 테스트

**Files:**
- Modify: `site/labs/mix-design/engine.js` (`computeYield` 바로 아래, 그리고 파일 끝 `MixEngine` export 객체)
- Test: `engine.test.mjs`, `tools/study-tables.test.mjs`

**Interfaces:**
- Produces (Task 2가 사용): `E.absoluteVolumes({ cement, water, ca, airPct })` → `{ vCm, vWater, vCa, vAir }`. 단위 cu yd, 소수 3자리 반올림, 0~1 클램프, 입력이 유한수가 아닌 항목은 `null`. 다른 키가 섞인 객체를 넘겨도 무시한다(`game.design`을 그대로 넘길 수 있다).

- [ ] **Step 1: 실패하는 테스트 먼저 — `engine.test.mjs`**

`test('computeYield: 강의 예제 = 27.00 ft³', …)` 블록 **바로 뒤**에 추가한다(파일 상단의 `TEXTBOOK` 상수를 그대로 쓴다):

```js
test('absoluteVolumes: 강의 예제의 워크시트 부피(인쇄 상수 1,685 · 소수 3자리)', () => {
  const v = E.absoluteVolumes(TEXTBOOK);
  assert.deepEqual(v, { vCm: 0.102, vWater: 0.177, vCa: 0.415, vAir: 0.015 });
  // 표시 정밀도로 반올림한 합이 물리 계산(computeYield, 잔골재 0)과 어긋나지 않는다
  const sumFt3 = (v.vCm + v.vWater + v.vCa + v.vAir) * 27;
  assert.ok(Math.abs(sumFt3 - E.computeYield({ ...TEXTBOOK, fa: 0 })) < 0.05, `sum ${sumFt3} ft³`);
});

test('absoluteVolumes: 결측 입력은 그 항목만 null, 범위 밖은 0–1로 클램프', () => {
  assert.deepEqual(E.absoluteVolumes({ cement: null, water: 299, ca: undefined, airPct: NaN }),
    { vCm: null, vWater: 0.177, vCa: null, vAir: null });
  assert.deepEqual(E.absoluteVolumes({ cement: -50, water: 99999, ca: 0, airPct: 1.5 }),
    { vCm: 0, vWater: 1, vCa: 0, vAir: 0.015 });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `node --test engine.test.mjs`
Expected: 2 fail — `E.absoluteVolumes is not a function`.

- [ ] **Step 3: 엔진에 함수 추가**

`site/labs/mix-design/engine.js`의 `computeYield` 함수가 끝나는 `}` 바로 다음 줄에 삽입한다:

```js
  // ── Step 7 워크시트: 재료별 절대용적 (cu yd) ──────────────────────
  // 화면 공식 카드와 Study 글에 인쇄된 관용값 1,685 lb/yd³(물 1 yd³의 무게)을 그대로 쓴다.
  // computeYield는 물리값 62.4 × 27 = 1,684.8을 쓰지만, 학생이 화면의 식을 계산기에 그대로
  // 넣었을 때 나오는 값과 채워지는 기본값이 어긋나면 안 되므로 워크시트는 인쇄된 값을 따른다
  // (시멘트 부피가 정확히 반올림 경계에 걸린다: 0.1025 vs 0.1024). 수율 차이는 0.02 ft³ 미만.
  const WORKSHEET_LB_PER_YD3 = 1685;
  function absoluteVolumes(mix) {
    const r3 = (x) => clamp(Math.round(x * 1000) / 1000, 0, 1); // 입력칸의 step·min·max와 같은 정밀도·범위
    const byMass = (mass, rd) => (Number.isFinite(mass) ? r3(mass / (rd * WORKSHEET_LB_PER_YD3)) : null);
    return {
      vCm: byMass(mix.cement, MAT.sgCement),
      vWater: byMass(mix.water, 1), // 물은 기준물질이라 상대밀도 1.00
      vCa: byMass(mix.ca, MAT.sgCA),
      vAir: Number.isFinite(mix.airPct) ? r3(mix.airPct / 100) : null,
    };
  }
```

그리고 파일 끝 `MixEngine` 객체의 `computeYield, targetAirFor, scoreMix, quantizeQuarter, evaluateMix,` 줄을 다음으로 바꾼다:

```js
    computeYield, absoluteVolumes, targetAirFor, scoreMix, quantizeQuarter, evaluateMix,
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test engine.test.mjs`
Expected: 전부 PASS(기존 개수 + 2).

- [ ] **Step 5: 발행된 워크 예제와의 대조 테스트 — `tools/study-tables.test.mjs`**

파일 맨 끝에 추가한다(상단의 `HTML`은 Part 1 전용이므로 Part 2를 따로 읽는다):

```js
// Part 2(워크 예제)의 절대용적 표 ↔ 엔진 absoluteVolumes — 랩의 자동 채움값과 발행된 워크시트가 어긋나지 않게 묶는다
const HTML_EXAMPLE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../site/study/mix-design/example/index.html'), 'utf8');
test('#tbl-volumes: 발행된 워크 예제의 절대용적 = 엔진 absoluteVolumes(강의 예제)', () => {
  const m = HTML_EXAMPLE.match(/<table[^>]*id="tbl-volumes"[^>]*>([\s\S]*?)<\/table>/);
  assert.ok(m, 'table #tbl-volumes missing');
  const shown = [...m[1].matchAll(/<tr><td>[^<]*<\/td><td>[^<]*<\/td><td>([\d.]+)<\/td><\/tr>/g)].map(x => parseFloat(x[1]));
  const v = E.absoluteVolumes({ cement: 544, water: 299, ca: 1872, airPct: 1.5 });
  assert.deepEqual(shown, [v.vCm, v.vWater, v.vCa, v.vAir]);
  assert.deepEqual(shown, [0.102, 0.177, 0.415, 0.015]);
});
```

- [ ] **Step 6: 전체 게이트 실행**

Run: Global Constraints의 테스트 게이트 한 줄.
Expected: 전부 PASS(86 → 89).

- [ ] **Step 7: 커밋**

```bash
git add site/labs/mix-design/engine.js engine.test.mjs tools/study-tables.test.mjs && git -c core.quotepath=false commit -F - <<'EOF'
feat: 엔진에 absoluteVolumes 추가 — Step 7 워크시트 절대용적(인쇄 상수 1,685·소수 3자리), 발행된 워크 예제 표와 대조 테스트

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Step 7 자동 채움 + 대입식 힌트

**Files:**
- Modify: `site/labs/mix-design/index.html` (STEP_DEFS의 `id: 'fine'` 항목 `render(box)`)

**Interfaces:**
- Consumes: `E.absoluteVolumes(...)` (Task 1), 기존 `numField({label, key, unit, min, max, step, hint})`, 기존 모듈 변수 `vFineLine`과 `updateVFineLine()`.

- [ ] **Step 1: `render(box)` 교체**

`id: 'fine'` 스텝의 `render(box) { … }` 본문 전체를 아래로 바꾼다. `vFineLine` 생성부터 아래는 기존과 동일하게 유지한다.

```js
    render(box) {
      const d = game.design, M = E.DATA.MAT;
      // 이 단계를 표시할 때마다 앞 단계(3~6) 값으로 네 부피를 다시 계산해 덮어쓴다.
      // 앞 단계를 고치고 돌아와도 기본값이 항상 앞 단계와 일치한다(이 네 값은 판정에 쓰이지 않는다).
      // 단계에 머무는 동안에는 재렌더가 없으므로 학생이 고친 값은 그대로 남는다.
      const V = E.absoluteVolumes(d);
      for (const k of ['vCm', 'vWater', 'vCa', 'vAir']) if (V[k] != null) d[k] = V[k];
      const q = (v) => (v == null ? '—' : v.toLocaleString()); // 힌트에 쓸 앞 단계 값(천 단위 구분)
      box.append(
        h('div', { class: 'card', style: 'background:var(--primary-50);border-color:transparent;box-shadow:none;margin-bottom:4px' },
          h('div', {}, h('strong', {}, 'Formula: '), 'V (cu yd) = mass ÷ (relative density × 1,685)'),
          h('div', {}, 'V_air = air% ÷ 100'),
          h('div', {}, 'V_fine = 1.000 − ΣV'),
          h('div', { class: 'ref-note' },
            'The four volumes below are carried over from steps 3–6. Edit any of them to work the conversion yourself.')),
        numField({ label: 'Cementitious volume', key: 'vCm', unit: 'cu yd', min: 0, max: 1, step: 0.001,
          hint: `${q(d.cement)} ÷ (${M.sgCement} × 1,685)` }),
        numField({ label: 'Water volume', key: 'vWater', unit: 'cu yd', min: 0, max: 1, step: 0.001,
          hint: `${q(d.water)} ÷ (1.00 × 1,685)` }),
        numField({ label: 'Coarse agg. volume', key: 'vCa', unit: 'cu yd', min: 0, max: 1, step: 0.001,
          hint: `${q(d.ca)} ÷ (${M.sgCA} × 1,685)` }),
        numField({ label: 'Air volume', key: 'vAir', unit: 'cu yd', min: 0, max: 1, step: 0.001,
          hint: `${q(d.airPct)}% ÷ 100` }));
      // 라이브 표시줄: 요소는 여기서 한 번만 만들고, 이후 갱신은 updateWizNav() → updateVFineLine()가 담당한다
      vFineLine = h('div', { class: 'card', style: 'background:var(--primary-50);border-color:transparent;box-shadow:none;font-weight:600' }, 'V_fine = —');
      box.append(vFineLine,
        numField({ label: 'Fine aggregate (SSD basis)', key: 'fa', unit: 'lb/cu yd', min: 0, max: 2500, step: 1 }));
      updateVFineLine(); // 스텝을 다시 방문했을 때 기존 입력값을 즉시 반영
    },
```

- [ ] **Step 2: 클래스가 실재하는지 확인**

Run: `grep -n "\.ref-note\|\.hint" site/labs/mix-design/index.html`
Expected: 두 클래스의 CSS 규칙이 이 파일의 `<style>`에 있다(없으면 `ref-note` 대신 `hint`를 쓴다 — 새 CSS를 만들지 않는다).

- [ ] **Step 3: 게이트 실행**

Run: Global Constraints의 테스트 게이트 한 줄.
Expected: 전부 PASS(89). 이 태스크는 판정 경로를 건드리지 않으므로 앵커 테스트도 그대로 통과해야 한다.

- [ ] **Step 4: 브라우저 검증 (필수)**

`python tools/devserver.py 8781 site`를 백그라운드로 띄우고, 아래 단계를 CDP 드라이버로 실행한다.
드라이버: `node "D:/Codex/Temp/claude/D--Projects-Test/d64fe480-de3e-4585-8fe0-f5b32b07ce45/scratchpad/verify/cdp-shot.mjs" <url> <steps.json>` (PNG는 **현재 작업 디렉터리**에 떨어지므로 스크래치 폴더에서 실행하거나 캡처 후 워크트리에서 지운다).

`steps.json`은 위저드를 실제 클릭으로 통과시킨다. 미션 1(Residential Slab), 슬럼프 3.5, NMAS 1", 비공기연행, 물 300, 공기 1.5, w/c 0.57, 시멘트 526, 굵은골재 1,900을 넣는다. 헬퍼:

```js
const setNum = (i, v) => { const el = document.querySelectorAll('.num-field input')[i]; el.value = v;
  el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
const next = () => [...document.querySelectorAll('button')].find(b => /Next|Review/.test(b.textContent)).click();
const choice = (t) => [...document.querySelectorAll('.choice')].find(b => b.textContent.includes(t)).click();
```

Step 7 도달 후 확인할 값(위 입력 기준):

| 칸 | 기대 기본값 | 기대 힌트 |
|---|---|---|
| Cementitious volume | 0.099 | `526 ÷ (3.15 × 1,685)` |
| Water volume | 0.178 | `300 ÷ (1.00 × 1,685)` |
| Coarse agg. volume | 0.421 | `1,900 ÷ (2.68 × 1,685)` |
| Air volume | 0.015 | `1.5% ÷ 100` |

`V_fine` 줄은 `V_fine = 1.000 − 0.713 = 0.287 cu yd`, 잔골재 칸은 비어 있고 `Review mix →` 버튼은 비활성이어야 한다. 스크린샷을 Read로 열어 눈으로 대조한다.

- [ ] **Step 5: 되돌아가기 동작 확인**

같은 세션에서 `← Back`을 두 번 눌러 Step 5로 가서 시멘트를 700으로 바꾸고 다시 Next를 두 번 눌러 Step 7로 돌아온다.
Expected: Cementitious volume이 `0.132`(700 ÷ 5,307.75 = 0.13188)로 갱신되고 힌트가 `700 ÷ (3.15 × 1,685)`로 바뀐다. `V_fine`은 `1.000 − 0.746 = 0.254`. 스크린샷으로 확인한다.

- [ ] **Step 6: 서버 종료 후 커밋**

포트 8781 리스너를 찾아 종료하고, 워크트리 루트에 떨어진 PNG가 있으면 지운 뒤(`git status`로 확인) 커밋한다.

```bash
git add site/labs/mix-design/index.html && git -c core.quotepath=false commit -F - <<'EOF'
feat: Mix Design Lab Step 7 — 절대용적 네 칸을 앞 단계 값으로 자동 채움, 칸마다 대입식 힌트·안내 문구 추가

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Self-Review

**스펙 커버리지**: §2의 자동 채움(Task 2 Step 1), `fa` 제외·`ready()` 유지(Task 2 Step 1에서 `fa` numField·`ready` 미변경), 대입식 힌트(Task 2 Step 1), 카드 안내 문구(동일), `V_fine` 즉시 표시(동일 — 값이 채워지므로 기존 `updateVFineLine()`이 처리), 재방문 정책(Task 2 Step 1 루프 + Step 5 검증), §3 엔진 함수·1,685 상수·클램프·null(Task 1 Step 3), §4 테스트 3종(Task 1 Steps 1·5). 빠진 항목 없음.

**플레이스홀더**: 없음 — 모든 코드 블록은 그대로 붙여 넣을 수 있는 완성본이다.

**타입 일관성**: Task 1이 내보내는 키 `vCm`·`vWater`·`vCa`·`vAir`가 Task 2의 루프 배열·`numField` `key`·`game.design` 초기화(`index.html`의 `newRun`)와 모두 같다. 입력 키 `cement`·`water`·`ca`·`airPct`도 `game.design`의 필드명과 같아 `d`를 그대로 넘길 수 있다.

---

## 코드리뷰 반영 (머지 전 1회)

머지 전 전체 리뷰(opus)의 지적을 반영해 아래를 추가했다. 리뷰 결론은 READY TO MERGE였고, 아래 항목 중 막는 것은 없었으나 모두 이 변경에서 비롯된 것이라 같은 브랜치에서 처리했다.

- **잔골재 값 초기화 (Important)**: 네 부피 중 하나라도 달라지면 `d.fa = null`. 앞 단계를 고치고 돌아왔을 때 `V_fine` 줄과 잔골재 칸이 모순된 채 `Review mix →`가 열려 수율 점수를 조용히 잃던 경로를 막는다. 아무것도 바꾸지 않은 왕복에서는 합이 같아 잔골재 값이 남는다.
- **대조 테스트 강화 (Important)**: `tools/study-tables.test.mjs`가 발행된 표의 값뿐 아니라 **계산식 열**도 읽어 인쇄 상수(1,685)가 들어 있는지 확인한다. 값만 같고 식이 1,684.8로 표류하는 경우를 잡는다.
- **상수 단일화 (Minor)**: `WORKSHEET_LB_PER_YD3`를 `E.DATA`로 내보내고 `index.html`의 공식 카드·힌트 네 곳이 이 값을 참조한다.
- **로캘 고정 (Minor)**: 힌트의 숫자는 `toLocaleString('en-US')`. 식 안에 들어가는 숫자라 브라우저 로캘에 따라 소수점·자릿점이 뒤바뀌면 안 된다.
- **배선 가드 (Minor)**: `tools/site-guards.test.mjs`가 랩 페이지에 `E.absoluteVolumes(d)` 호출·키 목록·`d.fa = null`이 남아 있는지 확인한다(실행이 아닌 존재 확인).
- **대비 가드 (Minor)**: `tools/contrast-check.test.mjs`에 `--faint` × `--primary-50`(공식 카드 안 안내 문구) 쌍 추가 — 실측 5.06:1로 AA 통과.

검증: 게이트 90/90 통과, 헤드리스 브라우저로 세 경우 확인(잔골재 입력 → `Review` 활성 / 변경 없이 왕복 → 값 유지 / 시멘트 526→700 → 부피 갱신·잔골재 초기화·`Review` 비활성).
