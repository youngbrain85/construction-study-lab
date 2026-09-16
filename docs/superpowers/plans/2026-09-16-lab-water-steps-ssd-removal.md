# Mix Design Lab — Step 3 물 두 단계화 + OD/SSD 제거 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step 3 의 물 입력을 Initial(표 값) → Adjusted(형상 보정) 두 필드로 나누고 그 사이에 이 미션의 골재 형상을 명시한다. 랩의 OD/SSD 구분·흡수율 표시를 없앤다.

**Architecture:** 엔진에 `shapeAdjustedWater` 한 함수를 더해 형상 계수를 한 곳에 두고, UI 는 `numField` 에 `onCommit` 콜백을 추가해 재렌더 없이 파생 필드를 갱신한다. `design.water` 는 계속 엔진이 쓰는 최종값(Adjusted)이다.

**Tech Stack:** 정적 HTML + 인라인 JS, Node 22 `node --test`.

**Spec:** `docs/superpowers/specs/2026-09-16-lab-water-steps-ssd-removal-design.md`

## Global Constraints

- 워크트리 `D:\Projects\Test\.claude\worktrees\lab-water-ssd`(브랜치 `worktree-lab-water-ssd`)에서만 작업. Bash 는 호출당 평범한 명령 하나, `cd` 금지.
- `site/` 아래 대문자 `CNST` 금지, 리터럴 색 금지(토큰만), 이모지 금지(기존 미션 아이콘 제외), 영어 UI 문구·한국어 코드 주석.
- `numField` 는 재렌더를 하지 않는다는 기존 규칙을 지킨다(주석에 이유가 적혀 있다). 파생 필드 갱신은 요소 직접 갱신으로만.
- Study 글(`site/study/`)은 건드리지 않는다.
- 커밋: `git add … && git -c core.quotepath=false commit -F - <<'EOF' … EOF`, 한국어 메시지, 트레일러 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- 게이트: `node --test engine.test.mjs tools/*.test.mjs` (104 → 105 예상).

## File Structure

- Modify `site/labs/mix-design/engine.js` — `MAT` 흡수율 삭제, `shapeAdjustedWater` 추가·export (Task 1)
- Modify `engine.test.mjs` — DATA 테스트 갱신, `shapeAdjustedWater` 테스트 추가 (Task 1)
- Modify `site/labs/mix-design/index.html` — `numField` onCommit, `design` 초기값, Step 3 render/ready, materialsCard, Step 6·7 문구 (Task 2)

---

### Task 1: 엔진 — 흡수율 제거 + `shapeAdjustedWater` (TDD)

**Files:** `engine.test.mjs`, `site/labs/mix-design/engine.js`

**Interfaces:** `E.shapeAdjustedWater(waterInitial, aggShape)` → 정수 lb 또는 `null`. `E.DATA.MAT` 에서 `absCA`·`absFA` 가 사라진다. Task 2 가 UI 에서 이 함수를 호출한다.

- [ ] **Step 1** 실패하는 테스트 먼저. `engine.test.mjs` 의 첫 테스트(`DATA: 새 재료 상수와 형상 계수`)에서 다음 두 줄을

```js
  assert.equal(M.sgCA, 2.68); assert.equal(M.absCA, 0.005);
  assert.equal(M.sgFA, 2.64); assert.equal(M.absFA, 0.007);
```

이렇게 바꾼다:

```js
  assert.equal(M.sgCA, 2.68); assert.equal(M.sgFA, 2.64);
  assert.equal(M.absCA, undefined); assert.equal(M.absFA, undefined); // 흡수율 제거 — 랩에 함수율 보정이 없어 OD/SSD 를 구분하지 않는다
```

그리고 `TEXTBOOK` 상수 정의 바로 뒤(‘predictSlump: 형상 계수 반영 앵커’ 테스트 앞)에 새 테스트를 추가한다:

```js
test('shapeAdjustedWater: rounded 는 ×0.92 정수 반올림, crushed·형상 누락은 그대로, 비수치는 null', () => {
  assert.equal(E.shapeAdjustedWater(325, 'rounded'), 299);   // 강의 예제: 325 × 0.92 = 299
  assert.equal(E.shapeAdjustedWater(340, 'rounded'), 313);   // 312.8 → 313
  assert.equal(E.shapeAdjustedWater(340, 'crushed'), 340);
  assert.equal(E.shapeAdjustedWater(340, undefined), 340);   // 형상 누락 → crushed 취급 (predictSlump 와 동일)
  assert.equal(E.shapeAdjustedWater(null, 'rounded'), null);
  assert.equal(E.shapeAdjustedWater(NaN, 'rounded'), null);
});
```

- [ ] **Step 2** `node --test engine.test.mjs` → DATA 테스트 1건 실패(`absCA` 가 아직 0.005), 새 테스트 1건 실패(`shapeAdjustedWater is not a function`). 두 실패를 확인한다.

- [ ] **Step 3** `site/labs/mix-design/engine.js` 수정.

`MAT` 를 이렇게:

```js
  // 재료 물성 (Materials Lab Report). 랩에는 함수율 보정 단계가 없어 OD/SSD 를 구분하지 않는다 — 흡수율은 두지 않는다.
  const MAT = {
    sgCement: 3.15, sgCA: 2.68, sgFA: 2.64, // 상대밀도
    druwCA: 100,   // 굵은골재 건조봉다짐 단위중량 (lb/ft³)
    fmSand: 2.60,  // 잔골재 조립률
    wUnit: 62.4,   // 물 단위중량 (lb/ft³)
  };
```

`SHAPE_FACTOR` 선언 바로 아래에 추가:

```js
  // 형상 보정 수량: 표 값(각진 쇄석 기준) × 형상 계수, 정수 lb — Step 3 의 Adjusted water 자동 채움이 쓴다.
  // predictSlump 와 같은 SHAPE_FACTOR 를 쓰므로 0.92 는 한 곳에만 있다.
  function shapeAdjustedWater(waterInitial, aggShape) {
    if (!Number.isFinite(waterInitial)) return null;
    return Math.round(waterInitial * (SHAPE_FACTOR[aggShape] ?? 1.0));
  }
```

`MixEngine` 객체의 export 줄에 `shapeAdjustedWater` 를 추가한다(`fcrFor,` 다음 줄에 `predictSlump, classifyBehavior, …` 가 있는 줄 앞에 `shapeAdjustedWater,` 를 넣는다).

- [ ] **Step 4** `node --test engine.test.mjs tools/*.test.mjs` → 전부 통과(105). 출력 끝 9줄을 리포트에 붙인다.
- [ ] **Step 5** 커밋

```bash
git add engine.test.mjs site/labs/mix-design/engine.js && git -c core.quotepath=false commit -F - <<'EOF'
feat(engine): shapeAdjustedWater 추가, MAT 흡수율(absCA/absFA) 제거 — 랩은 OD/SSD 를 구분하지 않는다

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 2: UI — Step 3 두 필드 + 형상 줄, OD/SSD 문구 제거

**Files:** `site/labs/mix-design/index.html`

**Interfaces:** Task 1 의 `E.shapeAdjustedWater`, `E.DATA.SHAPE_FACTOR`, 기존 `AGG_SHAPE_LABEL`. 화면 검증은 **컨트롤러가 Browser 페인에서 직접** 한다 — 구현자는 브라우저 작업을 하지 않는다.

- [ ] **Step 1** `numField` 에 `onCommit` 추가. 시그니처를 `function numField({ label, key, unit, min, max, step, hint, onCommit })` 로 바꾸고, 두 이벤트 핸들러를 이렇게 바꾼다(기존 주석은 그대로 둔다):

```js
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    if (!Number.isNaN(v)) {
      game.design[key] = Math.min(max, Math.max(min, v));
      // 파생 필드(onCommit)는 범위 안의 값이 다 입력됐을 때만 갱신 — "3", "32" 같은 타이핑 중간값으로 튀지 않게
      if (onCommit && v >= min && v <= max) onCommit();
    }
    updateWizNav(); // Next 버튼 상태만 갱신
  });
  // blur(change): 최종값을 클램프해 input.value에 반영. NaN이면 이전 값으로 복원.
  // 여기서도 재렌더는 하지 않는다(포커스 이동 중 DOM 파괴 방지).
  input.addEventListener('change', () => {
    const v = parseFloat(input.value);
    if (Number.isNaN(v)) { input.value = game.design[key] ?? ''; updateWizNav(); return; } // NaN → 이전 값 복원
    const c = Math.min(max, Math.max(min, v));
    game.design[key] = c;
    input.value = c;
    if (onCommit) onCommit();
    updateWizNav(); // Next 버튼 상태만 갱신
  });
```

- [ ] **Step 2** `design` 초기값에 `waterInitial: null,` 을 `water: null,` 바로 앞에 추가.

- [ ] **Step 3** `materialsCard` 를 통째로 교체:

```js
// ── 재료 물성 카드 (상시 표시) ────────────────────────────────────
// 랩에는 함수율 보정 단계가 없으므로 OD/SSD 를 구분하지 않는다 — 상대밀도와 형상만 보여 준다.
// 굵은골재 형상은 독립 행이다: Step 3 에서 물을 정할 때 학생이 바로 찾을 수 있어야 한다.
const AGG_SHAPE_LABEL = { rounded: 'Well-rounded river gravel', crushed: 'Crushed stone (angular)' };
function materialsCard() {
  const M = E.DATA.MAT;
  const shape = game.mission ? AGG_SHAPE_LABEL[game.mission.aggShape] : '—';
  return refTable('Materials Lab Report',
    ['Property', 'Value'],
    [['Cement relative density', M.sgCement],
     ['Coarse aggregate', shape],
     ['Coarse agg. relative density', M.sgCA],
     ['Coarse agg. dry-rodded unit weight', M.druwCA + ' lb/cu ft'],
     ['Fine agg. relative density', M.sgFA],
     ['Fine agg. fineness modulus', M.fmSand.toFixed(2)]]);
}
```

- [ ] **Step 4** Step 3(`id: 'water'`)의 `render` 와 `ready` 를 교체. `refPanels` 는 그대로 둔다.

```js
    render(box) {
      const d = game.design;
      const aeBtn = (on, lbl) => h('button', {
        class: 'choice' + (d.isAE === on ? ' selected' : ''),
        'aria-pressed': d.isAE === on ? 'true' : 'false',
        onclick: () => { d.isAE = on; renderDesign(); } }, lbl);
      // 이 미션의 굵은골재 형상 — 물을 정하는 자리에서 바로 보이도록 두 입력란 사이에 둔다
      const shape = game.mission.aggShape;
      const factor = E.DATA.SHAPE_FACTOR[shape] ?? 1.0;
      const shapeLine = shape === 'rounded'
        ? `${AGG_SHAPE_LABEL.rounded} — reduce the table value by 8 % (× 0.92).`
        : `${AGG_SHAPE_LABEL.crushed} — use the table value as-is (× 1.00).`;
      const adjHint = () => (d.waterInitial == null ? 'Enter the initial water first.'
        : `Suggested: ${d.waterInitial} × ${factor.toFixed(2)} = ${E.shapeAdjustedWater(d.waterInitial, shape)}. The batch uses the value in this field.`);
      const adjField = numField({ label: 'Adjusted water', key: 'water', unit: 'lb/cu yd', min: 100, max: 500, step: 1, hint: adjHint() });
      const adjInput = adjField.querySelector('input'), adjHintEl = adjField.querySelector('.hint');
      // Initial 이 확정될 때마다 Adjusted 를 형상 계수로 다시 채운다. 학생이 Adjusted 를 직접 고친 값은
      // Initial 을 다시 바꾸기 전까지 그대로 둔다(Step 7 자동 채움과 같은 규칙). 재렌더 없이 요소만 갱신한다.
      const syncAdjusted = () => {
        d.water = E.shapeAdjustedWater(d.waterInitial, shape);
        adjInput.value = d.water ?? '';
        adjHintEl.textContent = adjHint();
      };
      box.append(
        h('div', { class: 'num-field' }, h('label', {}, 'Mix type'),
          h('div', { class: 'choice-row' }, aeBtn(false, 'Non-air-entrained'), aeBtn(true, 'Air-entrained'))),
        numField({ label: 'Initial water (from the table)', key: 'waterInitial', unit: 'lb/cu yd', min: 100, max: 500, step: 1,
          hint: 'Read the row for your slump and the column for your aggregate size.', onCommit: syncAdjusted }),
        h('div', { class: 'card', style: 'background:var(--primary-50);border-color:transparent;box-shadow:none;margin:4px 0' },
          h('strong', {}, "This mission's coarse aggregate: "), shapeLine),
        adjField,
        numField({ label: 'Target air content', key: 'airPct', unit: '%', min: 0, max: 10, step: 0.5,
          hint: 'Non-AE mixes still trap some air — see the table.' }));
    },
```

`ready` 는:

```js
    ready: () => game.design.waterInitial != null && game.design.water != null && game.design.airPct != null,
```

- [ ] **Step 5** Step 6(`id: 'coarse'`) 공식 카드와 라벨:

```js
        h('div', { class: 'card', style: 'background:var(--primary-50);border-color:transparent;box-shadow:none;margin-bottom:4px' },
          h('strong', {}, 'Formula: '), 'weight = (b/b₀) × 27 cu ft × dry-rodded unit weight'),
        numField({ label: 'Coarse aggregate', key: 'ca', unit: 'lb/cu yd', min: 0, max: 2500, step: 1 }));
```

- [ ] **Step 6** Step 7 의 잔골재 필드 라벨을 `'Fine aggregate (SSD basis)'` → `'Fine aggregate'` 로.

- [ ] **Step 7** 남은 흔적 확인: `grep -n -i "ssd\|absorption\|\bOD\b\|absCA\|absFA" site/labs/mix-design/index.html` 이 **아무것도 출력하지 않아야** 한다. 그리고 `node -e "…"` 로 문법 검사는 못 하므로(인라인 스크립트) 대신 `python - <<'PY'` 로 `<script>` 블록을 추출해 `new Function` 파싱 대신 `node --check` 에 넘긴다:

```python
# -*- coding: utf-8 -*-
import re, io, subprocess, tempfile, os
s = io.open('site/labs/mix-design/index.html', encoding='utf-8').read()
blocks = re.findall(r'<script(?![^>]*src=)[^>]*>([\s\S]*?)</script>', s)
for i, b in enumerate(blocks):
    p = os.path.join(tempfile.gettempdir(), f'inline{i}.mjs')
    io.open(p, 'w', encoding='utf-8').write(b)
    r = subprocess.run(['node', '--check', p], capture_output=True, text=True)
    print(i, 'OK' if r.returncode == 0 else r.stderr[:400])
```

모든 블록이 `OK` 여야 한다.

- [ ] **Step 8** 게이트 `node --test engine.test.mjs tools/*.test.mjs` → 105 통과.
- [ ] **Step 9** 커밋

```bash
git add site/labs/mix-design/index.html && git -c core.quotepath=false commit -F - <<'EOF'
feat(lab): Step 3 물 입력을 Initial → Adjusted 두 단계로, 미션 골재 형상을 입력란에 명시; OD/SSD·흡수율 표시 제거

- numField 에 onCommit 추가: 파생 필드를 재렌더 없이 갱신(타이핑 중간값은 범위 안일 때만)
- 재료 카드: 형상을 독립 행으로, 상대밀도 용어 통일, 흡수율 행·SSD 각주 삭제
- Step 6 공식 한 줄, Step 6·7 라벨에서 "(SSD basis)" 제거

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

## Self-Review

- **스펙 커버리지**: §3(두 필드·형상 줄·자동 채움 규칙·ready) → Task 2 Step 1·2·4. §4 표의 다섯 행 → Task 2 Step 3·5·6 + Task 1 MAT. §5 엔진 함수 → Task 1. §7 테스트 → Task 1 Step 1, 화면 검증은 컨트롤러 몫으로 명시.
- **플레이스홀더**: 없음.
- **일관성**: Task 1 의 export 이름 `shapeAdjustedWater` 와 Task 2 의 `E.shapeAdjustedWater` 일치. `design.waterInitial` 이 Step 2·4·ready 에서 같은 키. `AGG_SHAPE_LABEL` 은 기존 상수를 그대로 쓴다.
