# Study "Concrete cylinders: from the mold to the acceptance decision" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fifth Study article — concrete test cylinders (ASTM C31 making/curing, ASTM C39 testing, ACI 318 acceptance, strength development) — with three SVG diagrams, seven CC/public-domain photos and an interactive calculator (cylinder strengths, acceptance criteria, age curve), on the existing article template.

**Architecture:** One static page `site/study/concrete-cylinders/index.html` on the Study article template. The calculator follows the soil-compaction pattern exactly: a pure ES module `cylinders.js` (math only, tested with `node --test`) and a DOM/SVG module `calc.js` (`type="module"`). Photos recompressed with Pillow into `img/`. Registry and guard tests extended the same way as the previous two articles.

**Tech Stack:** Static HTML/CSS/vanilla JS (ES modules), inline SVG, Node 20 `node --test`, Python 3 + Pillow, curl.

**Spec:** `docs/superpowers/specs/2026-09-06-study-cylinders-design.md`. Research notes with every number: `D:\Codex\Temp\claude\D--Projects-Test\d64fe480-de3e-4585-8fe0-f5b32b07ce45\scratchpad\cylinder-research\research.txt`. Reference implementation of the calculator pattern: `site/study/soil-compaction/compaction.js`, `calc.js`, and the `.calc*` block in `site/study/article.css`.

## Global Constraints

- Work in the worktree `D:\Projects\Test\.claude\worktrees\study-cylinders` (branch `worktree-study-cylinders`). Never touch `D:\Projects\Test` directly.
- No course code: the uppercase string `CNST` must not appear anywhere under `site/`. No department or university name.
- Tokens only — no literal colours (`#rgb`, `#rrggbb`) in `site/study/article.css`, the new page (including inline SVG), or `calc.js` (SVG attributes use `var(--token)`).
- Footer text exactly `© <span id="year"></span> Jisoo Park. All rights reserved.` (year filled by `article.js`).
- English article; Korean code comments. Brand tokens only; no logos, no emoji.
- Numbers in the article come only from ASTM C31 / C39 / C617 / C1231 / C42, ACI 318-19 §26.12 and ACI 209R-92 as recorded in research.txt §1–4; CAVEAT items are stated qualitatively; calculator defaults are labelled "example numbers"; the age curve is labelled an estimate, never an acceptance basis.
- Photo credits: caption with author + licence, plus a credits paragraph linking each Commons file page and each licence deed, and the sentence "The photos were resized, cropped and recompressed for the web."
- Every `<img>` carries `width`/`height` equal to the real pixel size (the guard reads the JPEG SOF); every photo ≤ 220 KB; the per-folder photo guard expects exactly 7 files in `study/concrete-cylinders/img`.
- Commit format: `git add <files> && git -c core.quotepath=false commit -F - <<'EOF' … EOF`, Korean message, trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. One plain command or one heredoc per Bash call (the worktree guard refuses long `&&` chains and brace groups). Create files with the Write tool (UTF-8).
- Test gate (all must pass before every commit): `node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs tools/study-tables.test.mjs tools/site-guards.test.mjs tools/layout.test.mjs tools/props.test.mjs tools/decor.test.mjs tools/compaction.test.mjs tools/cylinders.test.mjs`

## File Structure

- Create `site/study/concrete-cylinders/cylinders.js` — pure math: `AREA`, `round10`, `strength`, `testAverage`, `withinTestRange`, `RANGE_LIMIT`, `evaluateTests`, `AGE_COEFF`, `ageRatio`, `ageCurve`, `LIMITS`, `validate`.
- Create `tools/cylinders.test.mjs` — node tests for the module.
- Create `site/study/concrete-cylinders/img/*.jpg` — seven photos (Task 2).
- Create `site/study/concrete-cylinders/index.html` — the article (Task 3).
- Create `site/study/concrete-cylinders/calc.js` — DOM wiring + two SVG plots (Task 3).
- Modify `site/study/article.css` — two small rules (`.calc-tests`, `.calc-plots`) (Task 3).
- Modify `tools/site-guards.test.mjs` (Tasks 2, 3), `site/shared/registry.js`, `tools/registry.test.mjs`, `README.md` (Task 4).

---

### Task 1: Pure calculation module + tests

**Files:**
- Create: `site/study/concrete-cylinders/cylinders.js`
- Test: `tools/cylinders.test.mjs`

**Interfaces:**
- Produces (used by Task 3): `AREA = { '6x12': 28.274…, '4x8': 12.566… }`; `round10(v)`; `strength(loadLbf, size)` → psi rounded to 10; `testAverage(strengths)` → psi rounded to 10; `withinTestRange(strengths)` → percent spread; `RANGE_LIMIT = { '6x12': 6.6, '4x8': 9.0 }`; `evaluateTests(tests, fc)` where `tests = [{ id, strengths:[...] }]` → `{ limitB, tests:[{ id, avg, okB, avg3, okA, rangePct, rangeWide }], pass, reasons:[] }`; `AGE_COEFF = { typeI: { a:4.0, b:0.85 }, typeIII: { a:2.3, b:0.92 } }`; `ageRatio(t, coeff)`; `ageCurve(f28, coeff, days)` → `[{ t, f }]`; `LIMITS`; `validate(name, value)` → `''` or message.

- [ ] **Step 1: Write the failing tests**

Create `tools/cylinders.test.mjs`:

```js
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
  assert.deepEqual(r.tests.map(t => t.avg3), [null, null, 4167, 3930, 4063, 4150]);
  assert.deepEqual(r.tests.map(t => t.okA), [null, null, true, false, true, true]);
  assert.equal(r.pass, false);
  assert.deepEqual(r.reasons, ['Tests 2–4: average 3,930 psi is below f\'c = 4,000 psi (criterion a).']);
  assert.ok(r.tests.every(t => !t.rangeWide));
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tools/cylinders.test.mjs`
Expected: FAIL — cannot find module `cylinders.js`.

- [ ] **Step 3: Write the module**

Create `site/study/concrete-cylinders/cylinders.js`:

```js
// site/study/concrete-cylinders/cylinders.js — 공시체 강도·합격 판정·재령 곡선 계산 (순수 함수, DOM 무관)
// 근거: ASTM C39 (강도 = 하중/단면적, 10 psi 단위 보고), ACI 318-19 §26.12.3 (합격 기준 a·b), ACI 209R-92 식 (2-1)
export const AREA = { '6x12': Math.PI * 36 / 4, '4x8': Math.PI * 16 / 4 }; // in²
export const RANGE_LIMIT = { '6x12': 6.6, '4x8': 9.0 }; // 같은 시료 공시체 간 허용 범위(평균의 %), C39 정밀도 문단(대략값)
export const AGE_COEFF = { typeI: { a: 4.0, b: 0.85 }, typeIII: { a: 2.3, b: 0.92 } }; // ACI 209R-92, 습윤 양생

export function round10(v) { return Math.round(v / 10) * 10; }
export function strength(loadLbf, size) { return round10(loadLbf / AREA[size]); }
export function testAverage(strengths) { return round10(strengths.reduce((s, v) => s + v, 0) / strengths.length); }
export function withinTestRange(strengths) {
  const avg = strengths.reduce((s, v) => s + v, 0) / strengths.length;
  return (Math.max(...strengths) - Math.min(...strengths)) / avg * 100;
}

const fmt = n => n.toLocaleString('en-US');

// tests: [{ id, strengths:[psi…], size? }] (size 는 편차 한계용; 생략 시 '6x12') → 시험별 평균, 기준 (b), 3연속 평균, 기준 (a), 전체 판정
export function evaluateTests(tests, fc, size = '6x12') {
  const valid = tests.filter(t => Array.isArray(t.strengths) && t.strengths.length > 0 && t.strengths.every(Number.isFinite));
  if (!valid.length) return { error: 'Enter at least one strength test.', tests: [], reasons: [] };
  const limitB = fc - (fc <= 5000 ? 500 : Math.round(0.10 * fc)); // 기준 (b): f'c − 500 psi (f'c ≤ 5,000) 또는 0.90 f'c
  const reasons = [];
  const rows = valid.map((t, i) => {
    const avg = testAverage(t.strengths);
    const okB = avg >= limitB;
    if (!okB) reasons.push(`Test ${t.id}: ${fmt(avg)} psi is more than ${fc <= 5000 ? '500 psi' : '10 %'} below f'c (criterion b).`);
    const rangePct = withinTestRange(t.strengths);
    return { id: t.id, avg, okB, avg3: null, okA: null, rangePct, rangeWide: rangePct > RANGE_LIMIT[t.size || size] };
  });
  for (let i = 2; i < rows.length; i++) { // 기준 (a): 임의의 연속 3회 평균 ≥ f'c
    rows[i].avg3 = Math.round((rows[i - 2].avg + rows[i - 1].avg + rows[i].avg) / 3);
    rows[i].okA = rows[i].avg3 >= fc;
    if (!rows[i].okA) reasons.push(`Tests ${rows[i - 2].id}–${rows[i].id}: average ${fmt(rows[i].avg3)} psi is below f'c = ${fmt(fc)} psi (criterion a).`);
  }
  return { limitB, tests: rows, pass: reasons.length === 0, reasons };
}

// ACI 209R-92 식 (2-1) f(t) = f28 · t/(a + b·t) 를 28일에서 정확히 1이 되도록 정규화한 비율
export function ageRatio(t, coeff) { return (t / (coeff.a + coeff.b * t)) / (28 / (coeff.a + 28 * coeff.b)); }
export function ageCurve(f28, coeff, days = [1, 3, 7, 14, 28, 56, 90]) { return days.map(t => ({ t, f: round10(f28 * ageRatio(t, coeff)) })); }

// 입력 한계(화면 검증용)
export const LIMITS = { load: [1000, 1000000], fc: [2000, 12000], f28: [500, 20000] };
export function validate(name, value) {
  const lim = LIMITS[name];
  if (!lim) return 'unknown field';
  if (!Number.isFinite(value)) return 'enter a number';
  if (value < lim[0] || value > lim[1]) return `use ${fmt(lim[0])} to ${fmt(lim[1])}`;
  return '';
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tools/cylinders.test.mjs`
Expected: 8 tests, all pass, pristine output.

- [ ] **Step 5: Commit**

```bash
git add site/study/concrete-cylinders/cylinders.js tools/cylinders.test.mjs && git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 공시체 글 — 순수 계산 모듈(cylinders.js: 강도·시험 평균·ACI 318 합격 판정·ACI 209 재령 곡선) + 테스트

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---
### Task 2: Photos (download, crop, recompress) + photo-budget guard entry

**Files:**
- Create: `site/study/concrete-cylinders/img/{cylinder-hero,broken-cylinder,break-test,filling-molds,making-cylinders,labeled-molds,curing-tank}.jpg`
- Modify: `tools/site-guards.test.mjs` (add the new folder to the per-folder photo test)
- Scratch: `D:\Codex\Temp\claude\D--Projects-Test\d64fe480-de3e-4585-8fe0-f5b32b07ce45\scratchpad\cylinder-photos\` (originals; not committed)

**Interfaces:**
- Produces (exact pixel sizes used by Task 3's `<img>` tags): cylinder-hero 1200×900, broken-cylinder 1200×695, break-test 900×1355, filling-molds 900×1534, making-cylinders 1024×768, labeled-molds 1024×768, curing-tank 1200×900.

- [ ] **Step 1: Download the seven originals (Wikimedia Commons; user-authorized)**

One `curl` per Bash call (the worktree guard refuses chains); a descriptive User-Agent is required by Wikimedia. Run each from the scratch directory (`mkdir -p` it first):

```bash
UA="ConstructionStudyLab/1.0 (https://cnstlab.org; study article photo fetch)"
curl -sSL -A "$UA" -o hero.src.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/Concrete_Compression_Testing.jpg"
curl -sSL -A "$UA" -o broken.src.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/Failed_Concrete_Cylinder.jpg"
curl -sSL -A "$UA" -o break.src.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/Concrete_cylinder_break_test_090219-N-KE792-469.jpg"
curl -sSL -A "$UA" -o filling.src.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/US_Navy_080108-N-7367K-004_Engineering_Aide_2nd_Class_Robert_Wetzel,_assigned_to_Naval_Mobile_Construction_Battalion_(NMCB)_1,_Task_Force_Sierra,_fills_cylinders_with_concrete_in_preparation_for_a_compression_test.jpg"
curl -sSL -A "$UA" -o making.src.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/Probetas_hormig%C3%B3n_01.jpg"
curl -sSL -A "$UA" -o labeled.src.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/Probetas_hormig%C3%B3n_02.jpg"
curl -sSL -A "$UA" -o curing.src.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/Cube_Test_2.jpg"
```

Expected originals (approx.): hero 838 KB 1680×2036; broken 1.3 MB 2604×1509; break 771 KB 1424×2144; filling 346 KB 1232×2100; making 309 KB 1024×768; labeled 375 KB 1024×768; curing 2.0 MB 3000×4000. Open each with the Read tool and confirm: hero = cylinder under load in a compression machine with gauges; broken = shattered cylinder; break = technician at a compression machine; filling = technician filling cylinder molds outdoors; making = technician making many cylinders on site; labeled = filled, labeled molds; curing = concrete cubes under water in buckets. If any download is not a JPEG or shows something else, stop and report NEEDS_CONTEXT.

- [ ] **Step 2: Crop / resize / recompress**

```bash
python - <<'EOF'
from PIL import Image, ImageOps
import os
SRC = "D:/Codex/Temp/claude/D--Projects-Test/d64fe480-de3e-4585-8fe0-f5b32b07ce45/scratchpad/cylinder-photos"
OUT = "site/study/concrete-cylinders/img"; os.makedirs(OUT, exist_ok=True)
# (원본, 출력, 최대 가로, 4:3 중앙 크롭 여부)
jobs = [('hero.src.jpg', 'cylinder-hero.jpg', 1200, True), ('broken.src.jpg', 'broken-cylinder.jpg', 1200, False),
        ('break.src.jpg', 'break-test.jpg', 900, False), ('filling.src.jpg', 'filling-molds.jpg', 900, False),
        ('making.src.jpg', 'making-cylinders.jpg', 1024, False), ('labeled.src.jpg', 'labeled-molds.jpg', 1024, False),
        ('curing.src.jpg', 'curing-tank.jpg', 1200, True)]
for src, name, maxw, crop in jobs:
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, src))).convert('RGB')
    if crop:  # 세로 사진을 4:3 으로 중앙 크롭
        w, h = im.size; th = round(w * 3 / 4); top = (h - th) // 2; im = im.crop((0, top, w, top + th))
    if im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    q = 82
    while True:  # EXIF 제거, 220 KB 이하가 될 때까지 품질을 낮춘다
        p = os.path.join(OUT, name); im.save(p, 'JPEG', quality=q, optimize=True, progressive=True)
        if os.path.getsize(p) <= 220 * 1024 or q <= 60: break
        q -= 4
    print(f"{name}: {im.size} q{q} {os.path.getsize(p) // 1024} KB")
EOF
```

Expected: cylinder-hero (1200, 900); broken-cylinder (1200, 695); break-test (900, 1355); filling-molds (900, 1534); making-cylinders (1024, 768); labeled-molds (1024, 768); curing-tank (1200, 900); each ≤ 220 KB. Open all seven outputs with the Read tool: the hero crop must still show the whole cylinder between the platens, and the curing-tank crop must show the buckets with cubes. If the hero crop cuts the cylinder, use `top = (h - th) // 2 - 80` (shift up) and say so in the report.

- [ ] **Step 3: Extend the per-folder photo guard**

In `tools/site-guards.test.mjs`, in the test named `'Study 글 사진 폴더(slump 7장 · soil 6장)의 모든 파일이 .jpg 이고 각 220 KB 이하다'`, change the dictionary to `{ 'study/slump-test/img': 7, 'study/soil-compaction/img': 6, 'study/concrete-cylinders/img': 7 }` and rename the test to `'Study 글 사진 폴더(slump 7 · soil 6 · cylinders 7)의 모든 파일이 .jpg 이고 각 220 KB 이하다'`. Nothing else changes.

- [ ] **Step 4: Run the guards**

Run: `node --test tools/site-guards.test.mjs` → all pass.

- [ ] **Step 5: Commit**

```bash
git add site/study/concrete-cylinders/img tools/site-guards.test.mjs && git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 공시체 글 — Commons/공공저작물 사진 7장(≤1200 px·4:3 크롭 2장·EXIF 제거·≤220 KB), 사진 예산 가드에 폴더 추가

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---
### Task 3: The article page, calculator UI and styles

**Files:**
- Create: `site/study/concrete-cylinders/index.html` (block A + block B below, concatenated in order, marker comments removed)
- Create: `site/study/concrete-cylinders/calc.js`
- Modify: `site/study/article.css` (two rules appended to the `.calc*` block, before `@media (max-width:900px)`)
- Modify: `tools/site-guards.test.mjs` (tokens-only list + `ARTICLE_PAGES`)

**Interfaces:**
- Consumes: `cylinders.js` exports from Task 1; photo pixel sizes from Task 2.
- Produces: page at `study/concrete-cylinders/` (Task 4 registers it). DOM contract used by `calc.js`: form `#calc`; inputs `fc`, `size` (select: `6x12` | `4x8`), loads `l1a`,`l1b`,`l1c` … `l6a`,`l6b`,`l6c`; `f28`, `cement` (select: `typeI` | `typeIII`); outputs `#str-1..#str-6`, `#avg-1..#avg-6`, `#critb-1..#critb-6`, `#avg3-1..#avg3-6`, `#out-limit`, `#out-verdict`, `#out-reasons`, `#out-notes`, `#calc-errors`, `#age-table` (tbody), SVGs `#calc-control`, `#calc-age`.

- [ ] **Step 1: Write the page (block A, then block B appended)**

Extract the two fenced `html` blocks marked `<!-- BLOCK A -->` / `<!-- BLOCK B -->` from the brief with a script (same approach as the soil-compaction article), remove the two marker lines, write `site/study/concrete-cylinders/index.html`, and confirm it starts with `<!doctype html>` and ends with `</html>`.

Block A:

```html
<!-- BLOCK A -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Concrete cylinders: from the mold to the acceptance decision — Construction Study Lab</title>
<meta name="description" content="Making and curing concrete test cylinders (ASTM C31), breaking them (ASTM C39), reading the fracture, deciding acceptance the ACI 318 way, and how strength grows with age — with a calculator for strength tests and the age curve.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&family=Hepta+Slab:wght@400;600;700&family=Red+Hat+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../shared/theme.css">
<link rel="stylesheet" href="../article.css">
</head>
<body class="section-page article-page">
<header class="appbar"><div class="appbar-inner appbar-inner--wide">
  <a class="logo" href="../../">Construction Study Lab</a>
  <nav class="appbar-nav" aria-label="Sections">
    <a href="../../labs/">Lab</a>
    <a href="../" class="is-active" aria-current="true">Study</a>
  </nav>
</div></header>

<section class="band-royal article-hero"><div class="article-hero-inner">
  <p class="eyebrow">Materials · Hardened concrete</p>
  <h1>Concrete cylinders</h1>
  <p class="lede">From the mold on the truck's tailgate to the acceptance decision: how test cylinders are made, cured, broken, read, and judged — with a calculator for the strength tests and the age curve.</p>
  <p class="byline">Jisoo Park · September 2026 · 12 min read</p>
</div></section>

<main class="article-layout">
<nav class="toc" aria-label="Contents">
  <h2>Contents</h2>
  <ol>
    <li><a href="#why">1. What a cylinder measures</a></li>
    <li><a href="#making">2. Making the specimens</a></li>
    <li><a href="#curing">3. Curing</a></li>
    <li><a href="#testing">4. Breaking the cylinder</a></li>
    <li><a href="#reading">5. Reading the break</a></li>
    <li><a href="#acceptance">6. The acceptance decision</a></li>
    <li><a href="#age">7. Strength and age</a></li>
    <li><a href="#calculator">8. Try it: the calculator</a></li>
    <li><a href="#mistakes">9. Common mistakes</a></li>
    <li><a href="#takeaways">10. Key takeaways</a></li>
  </ol>
</nav>

<article class="article">

<h2 id="why"><span class="num">1</span>What a cylinder measures — and what it does not</h2>
<figure>
  <img src="img/cylinder-hero.jpg" width="1200" height="900" alt="A concrete test cylinder with strain gauges clamped to it, standing between the platens of a compression testing machine" loading="eager">
  <figcaption>A cylinder between the platens, seconds before the break. Photo: Xb-70, Wikimedia Commons, public domain.</figcaption>
</figure>
<p>Every structural drawing carries one number for the concrete: <i>f</i>′<sub>c</sub>, the specified compressive strength — 3,000, 4,000, 5,000 psi. Nobody can measure it in the beam. So the trade agreed on a proxy: a cylinder of the same concrete, made at the point of delivery, cured under standard conditions, and crushed at 28 days. That cylinder does not tell you the strength of the column it came from; it tells you whether the concrete <em>delivered</em> had the potential the mix design promised. That is the acceptance question, and it is the one this article is about.</p>
<div class="callout callout-def"><span class="label">Definition</span>
  <p>A <em>strength test</em> is not one cylinder. Under ACI 318 it is the average of at least two 6 × 12 in. cylinders, or at least three 4 × 8 in. cylinders, made from the same sample of concrete and tested at the same age — normally 28 days.</p>
</div>
<p>Two other kinds of cylinder exist, and mixing them up causes real trouble. <em>Field-cured</em> cylinders are kept with the structure, in its temperature and moisture, and answer a different question: is the slab strong enough to strip the forms, to stress the tendons, to load it? <em>Seven-day</em> cylinders are broken early as an indicator of where the 28-day result is heading; they are never the basis for acceptance. When a set of cylinders "fails", the first thing to check is which of the three kinds it was — and how it was treated in its first two days.</p>
<div class="callout callout-key"><span class="label">Key idea</span>
  <p>Standard-cured cylinders judge the <em>concrete</em>; field-cured cylinders judge the <em>structure</em>. Most "low breaks" trace back to how cylinders were handled, not to what was in the truck.</p>
</div>

<h2 id="making"><span class="num">2</span>Making the specimens (ASTM C31)</h2>
<div class="fig-grid">
  <figure><img src="img/making-cylinders.jpg" width="1024" height="768" alt="A technician filling a row of cylinder molds from a wheelbarrow on a construction site" loading="lazy"><figcaption>A set of molds being filled on site. Photo: Tano4595, Wikimedia Commons, CC BY-SA 2.5.</figcaption></figure>
  <figure><img src="img/labeled-molds.jpg" width="1024" height="768" alt="Filled cylinder and beam molds with identification labels, sitting on the ground" loading="lazy"><figcaption>Filled and labeled, waiting for their first 48 hours. Photo: Tano4595, Wikimedia Commons, CC BY-SA 2.5.</figcaption></figure>
</div>
<p>The sample is the same composite sample the slump test uses (ASTM C172), and the same clock runs: molding starts within 15 minutes of taking it. Two sizes are standard, and the mold must be twice as tall as it is wide: 6 × 12 in. (150 × 300 mm) or 4 × 8 in. (100 × 200 mm). The smaller mold weighs a third as much, cures faster, and fits more in a curing box; the larger one has a longer track record. The choice belongs to the specification, not to the technician, because the two are not interchangeable in the acceptance rule.</p>
<figure>
<svg class="fig-svg" viewBox="0 0 720 330" role="img" aria-labelledby="fig1-title">
  <title id="fig1-title">Cylinder molds: sizes, layers and rodding</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="12" fill="var(--muted)">
    <rect x="120" y="40" width="120" height="240" fill="var(--icy)" stroke="var(--dark)" stroke-width="2"/>
    <line x1="120" y1="120" x2="240" y2="120" stroke="var(--dark)" stroke-width="1.5" stroke-dasharray="6 4"/>
    <line x1="120" y1="200" x2="240" y2="200" stroke="var(--dark)" stroke-width="1.5" stroke-dasharray="6 4"/>
    <text x="180" y="86" text-anchor="middle" fill="var(--dark)">layer 3</text>
    <text x="180" y="166" text-anchor="middle" fill="var(--dark)">layer 2</text>
    <text x="180" y="246" text-anchor="middle" fill="var(--dark)">layer 1</text>
    <line x1="120" y1="300" x2="240" y2="300" stroke="var(--royal)" stroke-width="1.5"/><line x1="120" y1="294" x2="120" y2="306" stroke="var(--royal)" stroke-width="1.5"/><line x1="240" y1="294" x2="240" y2="306" stroke="var(--royal)" stroke-width="1.5"/>
    <text x="180" y="322" text-anchor="middle" fill="var(--royal)">6 in. (150 mm)</text>
    <line x1="90" y1="40" x2="90" y2="280" stroke="var(--royal)" stroke-width="1.5"/><line x1="84" y1="40" x2="96" y2="40" stroke="var(--royal)" stroke-width="1.5"/><line x1="84" y1="280" x2="96" y2="280" stroke="var(--royal)" stroke-width="1.5"/>
    <text x="78" y="164" text-anchor="end" fill="var(--royal)">12 in.</text>
    <text x="180" y="28" text-anchor="middle" fill="var(--dark)" font-weight="600">6 × 12 · 3 layers · 25 strokes each · 5/8 in. rod</text>
    <rect x="440" y="120" width="80" height="160" fill="var(--icy)" stroke="var(--dark)" stroke-width="2"/>
    <line x1="440" y1="200" x2="520" y2="200" stroke="var(--dark)" stroke-width="1.5" stroke-dasharray="6 4"/>
    <text x="480" y="166" text-anchor="middle" fill="var(--dark)">layer 2</text>
    <text x="480" y="246" text-anchor="middle" fill="var(--dark)">layer 1</text>
    <line x1="440" y1="300" x2="520" y2="300" stroke="var(--royal)" stroke-width="1.5"/><line x1="440" y1="294" x2="440" y2="306" stroke="var(--royal)" stroke-width="1.5"/><line x1="520" y1="294" x2="520" y2="306" stroke="var(--royal)" stroke-width="1.5"/>
    <text x="480" y="322" text-anchor="middle" fill="var(--royal)">4 in. (100 mm)</text>
    <line x1="410" y1="120" x2="410" y2="280" stroke="var(--royal)" stroke-width="1.5"/><line x1="404" y1="120" x2="416" y2="120" stroke="var(--royal)" stroke-width="1.5"/><line x1="404" y1="280" x2="416" y2="280" stroke="var(--royal)" stroke-width="1.5"/>
    <text x="398" y="204" text-anchor="end" fill="var(--royal)">8 in.</text>
    <text x="480" y="108" text-anchor="middle" fill="var(--dark)" font-weight="600">4 × 8 · 2 layers · 25 strokes each · 3/8 in. rod</text>
    <rect x="600" y="60" width="8" height="220" rx="4" fill="var(--dark)"/>
    <rect x="640" y="100" width="5" height="180" rx="2.5" fill="var(--dark)"/>
    <text x="604" y="48" text-anchor="middle" fill="var(--muted)" font-size="11">5/8 in.</text>
    <text x="643" y="90" text-anchor="middle" fill="var(--muted)" font-size="11">3/8 in.</text>
    <text x="624" y="300" text-anchor="middle" fill="var(--muted)" font-size="11">rounded tips</text>
  </g>
</svg>
<figcaption>Figure 1. Layers of equal depth, 25 strokes per layer, rod matched to the mold. The upper layers are rodded about 1 in. into the layer below.</figcaption>
</figure>
<ol class="steps">
  <li><strong>Fill in layers.</strong> Three layers for a 6 × 12, two for a 4 × 8, each about a third (or half) of the mold depth, placed with a scoop and moved around the rim so the coarse aggregate is spread, not piled.</li>
  <li><strong>Rod each layer 25 times.</strong> The rounded end of the rod, strokes spread evenly over the cross-section; the bottom layer through its full depth without hammering the base, the upper layers about 1 in. (25 mm) into the layer below. The 6 × 12 takes the 5/8 in. (16 mm) rod, the 4 × 8 the 3/8 in. (10 mm) rod.</li>
  <li><strong>Tap the mold.</strong> After rodding each layer, tap the outside of the mold 10 to 15 times with the mallet — or the open hand on a light plastic mold — to close the holes the rod left and release trapped air.</li>
  <li><strong>Strike off and cover.</strong> Strike the top flush with the rim, put the lid on or wrap the top, and write the identification on the mold, not on a scrap of paper that blows away.</li>
</ol>
<div class="callout callout-warn"><span class="label">Watch out</span>
  <p>A cylinder rodded 15 times, or a 4 × 8 filled in three layers with the big rod, is a cylinder of a different concrete. Consolidation errors do not average out; they only lower the result and start an argument that the concrete supplier will win.</p>
</div>

<h2 id="curing"><span class="num">3</span>Curing: the first 48 hours, then the tank</h2>
<p>Everything that goes wrong with cylinders tends to go wrong in the first two days. ASTM C31 asks for <em>initial curing</em> — up to 48 hours at 60 to 80 °F (16 to 27 °C), or 68 to 78 °F (20 to 26 °C) when the specified strength is 6,000 psi (40 MPa) or more — in a place that prevents moisture loss, out of direct sun, and away from vibration. In practice that is an insulated curing box with a max–min thermometer, sometimes with ice or a light bulb inside, never the bed of a pickup truck.</p>
<figure>
  <img src="img/curing-tank.jpg" width="1200" height="900" alt="Concrete test cubes submerged in two buckets of water on a construction site" loading="lazy">
  <figcaption>Specimens under water on site — cubes here, as used in Europe and India; the US standard cures cylinders the same way, in lime-saturated water or a moist room. Photo: Fotokannan, Wikimedia Commons, CC BY-SA 4.0.</figcaption>
</figure>
<p>Then the specimens go to the laboratory: cushioned against jarring, protected from freezing and from drying, in a transport that takes no more than 4 hours, and into <em>standard curing</em> within 30 minutes of arriving. Standard curing is 73.5 ± 3.5 °F (23 ± 2 °C) with free water on every surface, in a moist room or a lime-saturated water tank (ASTM C511), from the day they are demolded — 24 ± 8 hours after casting — to the day they are tested. Field-cured cylinders skip all of this on purpose: they stay next to the structure, under the same blankets and in the same weather, because their job is to report on that structure.</p>
<div class="callout callout-key"><span class="label">Key idea</span>
  <p>Cold, heat, and drying in the first 48 hours cannot be undone by perfect curing afterwards. A cylinder that spent a January night on the tailgate will break low, and the concrete in the wall — which was blanketed and heated — is probably fine.</p>
</div>

<h2 id="testing"><span class="num">4</span>Breaking the cylinder (ASTM C39)</h2>
<div class="fig-grid">
  <figure><img src="img/break-test.jpg" width="900" height="1355" alt="A technician in a hard hat operating a compression testing machine with a cylinder inside it" loading="lazy"><figcaption>At the machine: the load rises at a fixed rate until the cylinder gives. Photo: U.S. Navy, public domain.</figcaption></figure>
  <figure><img src="img/filling-molds.jpg" width="900" height="1534" alt="A technician outdoors rodding concrete in a cylinder mold, with more molds beside it" loading="lazy"><figcaption>Where the result was really decided: filling and rodding the molds in the field. Photo: U.S. Navy, public domain.</figcaption></figure>
</div>
<p>A compression test is simple to describe and easy to spoil. The machine presses the cylinder between two platens until it breaks; the strength is the maximum load divided by the cross-sectional area. The details that make one laboratory's 4,000 psi the same as another's are these.</p>
<ul>
  <li><strong>The ends must be flat and square.</strong> Plane within 0.002 in. (0.05 mm) and perpendicular to the axis within 0.5°. Almost no cast cylinder meets that, so the ends are either capped with sulfur mortar or high-strength gypsum (ASTM C617) or tested between unbonded neoprene pads in steel retainers (ASTM C1231), which is permitted for strengths between 1,500 and 12,000 psi (10 and 80 MPa).</li>
  <li><strong>The diameter is measured, not assumed.</strong> Two diameters at right angles at mid-height, to the nearest 0.01 in. (0.25 mm), averaged. The area comes from that, because a "6 in." mold is rarely exactly 6.00 in.</li>
  <li><strong>The age is on time.</strong> The standard allows 24 h ± 0.5 h, 3 d ± 2 h, 7 d ± 6 h, 28 d ± 20 h, and 90 d ± 2 d. A "28-day" cylinder broken on day 30 is a 30-day cylinder.</li>
  <li><strong>The load rises at a fixed rate.</strong> 35 ± 7 psi/s (0.25 ± 0.05 MPa/s), applied continuously and without shock, right through to failure; the rate is not adjusted as the cylinder starts to yield. Load faster and the number goes up.</li>
  <li><strong>The specimen is still moist.</strong> Cylinders come out of the tank and are broken while damp; a dried-out cylinder reads differently.</li>
</ul>
<div class="eq"><i>f</i><sub>c</sub> = <i>P</i><sub>max</sub> / <i>A</i> = 4 <i>P</i><sub>max</sub> / (π <i>d</i>²), reported to the nearest 10 psi (0.1 MPa)</div>
<p>A 6 × 12 cylinder has an area of 28.27 in.²; a maximum load of 122,200 lbf is 4,322 psi, reported as 4,320 psi. A 4 × 8 has 12.57 in.², so the same concrete breaks at less than half the load. When a specimen is shorter than it should be — a core, or a cylinder cut down — a length-to-diameter correction applies:</p>
<div class="table-wrap">
<table class="ref-table" id="tbl-ld">
  <caption>Table 1. Strength correction for short specimens (ASTM C39)</caption>
  <thead><tr><th scope="col">L/D</th><th scope="col">2.00</th><th scope="col">1.75</th><th scope="col">1.50</th><th scope="col">1.25</th><th scope="col">1.00</th></tr></thead>
  <tbody><tr><td>Factor</td><td>1.00</td><td>0.98</td><td>0.96</td><td>0.93</td><td>0.87</td></tr></tbody>
</table>
</div>
<p class="ref-note">Interpolate between the tabulated ratios; no correction is needed above L/D = 1.75. A standard cylinder has L/D = 2.</p>

<h2 id="reading"><span class="num">5</span>Reading the break</h2>
<figure>
  <img src="img/broken-cylinder.jpg" width="1200" height="695" alt="A concrete cylinder shattered along its length after failing in compression, lying on its side" loading="lazy">
  <figcaption>After the break. The shape of the fracture says whether the number can be trusted. Photo: Xb-70, Wikimedia Commons, public domain.</figcaption>
</figure>
<p>C39 asks the operator to sketch the fracture against six standard patterns, and the sketch matters as much as the load. Types 1 to 3 are what sound concrete does under a well-aligned load; types 4 to 6 point at the caps, the pads, or the platens, and a low number with one of those shapes is a suspect test, not a suspect batch.</p>
<figure>
<svg class="fig-svg" viewBox="0 0 720 240" role="img" aria-labelledby="fig2-title">
  <title id="fig2-title">The six fracture types of ASTM C39</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="11" fill="var(--muted)" stroke-linejoin="round">
    <rect x="30" y="40" width="70" height="140" rx="4" fill="var(--icy)" stroke="var(--dark)" stroke-width="1.5"/>
    <path d="M30 40 L65 110 L100 40 M30 180 L65 110 L100 180" fill="none" stroke="var(--dark)" stroke-width="1.5"/>
    <text x="65" y="205" text-anchor="middle" fill="var(--dark)" font-weight="600">1 · cones both ends</text>
    <rect x="145" y="40" width="70" height="140" rx="4" fill="var(--icy)" stroke="var(--dark)" stroke-width="1.5"/>
    <path d="M145 40 L180 105 L215 40 M165 105 L162 180 M195 105 L198 180" fill="none" stroke="var(--dark)" stroke-width="1.5"/>
    <text x="180" y="205" text-anchor="middle" fill="var(--dark)" font-weight="600">2 · cone + vertical</text>
    <rect x="260" y="40" width="70" height="140" rx="4" fill="var(--icy)" stroke="var(--dark)" stroke-width="1.5"/>
    <path d="M278 40 L276 180 M295 40 L297 180 M312 40 L310 180" fill="none" stroke="var(--dark)" stroke-width="1.5"/>
    <text x="295" y="205" text-anchor="middle" fill="var(--dark)" font-weight="600">3 · columnar</text>
    <rect x="375" y="40" width="70" height="140" rx="4" fill="var(--icy)" stroke="var(--dark)" stroke-width="1.5"/>
    <path d="M378 60 L442 160" fill="none" stroke="var(--amber)" stroke-width="2"/>
    <text x="410" y="205" text-anchor="middle" fill="var(--amber)" font-weight="600">4 · diagonal</text>
    <rect x="490" y="40" width="70" height="140" rx="4" fill="var(--icy)" stroke="var(--dark)" stroke-width="1.5"/>
    <path d="M490 60 L512 40 M538 40 L560 60 M490 160 L512 180" fill="none" stroke="var(--amber)" stroke-width="2"/>
    <text x="525" y="205" text-anchor="middle" fill="var(--amber)" font-weight="600">5 · side fractures</text>
    <rect x="605" y="40" width="70" height="140" rx="4" fill="var(--icy)" stroke="var(--dark)" stroke-width="1.5"/>
    <path d="M605 40 L640 90 L675 40 M612 40 L640 78 M668 40 L640 78" fill="none" stroke="var(--amber)" stroke-width="2"/>
    <text x="640" y="205" text-anchor="middle" fill="var(--amber)" font-weight="600">6 · pointed end</text>
    <text x="360" y="232" text-anchor="middle" fill="var(--muted)">types 1–3: normal · types 4–6: check caps, pads, alignment</text>
  </g>
</svg>
<figcaption>Figure 2. Fracture types after ASTM C39, Figure 2. A type 4 that looks like a type 1 is told apart by tapping the halves with a hammer.</figcaption>
</figure>
<p>The two or three cylinders of one test should also agree with each other. The test method's own precision statement puts the normal spread of a pair of 6 × 12 cylinders from the same sample at a few percent of their average; a spread wider than about 7 % (about 9 % for three 4 × 8 cylinders) means one cylinder was made, cured, capped, or broken differently, and the technician should say which before the average is used.</p>
```
Block B:

```html
<!-- BLOCK B -->
<h2 id="acceptance"><span class="num">6</span>The acceptance decision (ACI 318)</h2>
<p>Cylinders are made on a schedule the code sets, not when someone remembers. For each concrete mixture ACI 318 asks for at least one strength test a day, at least one for every 150 yd³ (110 m³) placed, and at least one for every 5,000 ft² (460 m²) of slab or wall surface. If the whole job would produce fewer than five tests, tests are taken from at least five randomly chosen batches — or from every batch, if there are fewer than five — and for placements under 50 yd³ (40 m³) the tests can be waived when other evidence of strength is accepted.</p>
<p>Then the rule itself, which every technician, inspector and contractor should be able to recite. The strength of a concrete mixture is acceptable when <em>both</em> of these hold:</p>
<div class="callout callout-def"><span class="label">ACI 318-19, §26.12.3</span>
  <p><strong>(a)</strong> Every arithmetic average of any three consecutive strength tests equals or exceeds <i>f</i>′<sub>c</sub>; and<br>
  <strong>(b)</strong> No strength test falls below <i>f</i>′<sub>c</sub> by more than 500 psi (3.5 MPa) when <i>f</i>′<sub>c</sub> is 5,000 psi (35 MPa) or less, or by more than 10 % of <i>f</i>′<sub>c</sub> when it is higher.</p>
</div>
<figure>
<svg class="fig-svg" viewBox="0 0 720 300" role="img" aria-labelledby="fig3-title">
  <title id="fig3-title">Acceptance flow for strength tests</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="11.5" fill="var(--dark)">
    <rect x="190" y="14" width="340" height="44" rx="3" fill="var(--icy)" stroke="var(--dark)" stroke-width="1.5"/>
    <text x="360" y="32" text-anchor="middle">strength test = average of 2 (6 × 12) or 3 (4 × 8)</text>
    <text x="360" y="48" text-anchor="middle">cylinders, standard-cured, tested at 28 days</text>
    <line x1="360" y1="58" x2="360" y2="86" stroke="var(--dark)" stroke-width="1.5"/>
    <rect x="40" y="86" width="300" height="52" rx="3" fill="var(--bg)" stroke="var(--dark)" stroke-width="1.5"/>
    <text x="190" y="108" text-anchor="middle">(a) every average of any three</text>
    <text x="190" y="124" text-anchor="middle">consecutive tests ≥ f′c ?</text>
    <rect x="380" y="86" width="300" height="52" rx="3" fill="var(--bg)" stroke="var(--dark)" stroke-width="1.5"/>
    <text x="530" y="108" text-anchor="middle">(b) no single test below f′c − 500 psi</text>
    <text x="530" y="124" text-anchor="middle">(or below 0.90 f′c above 5,000 psi) ?</text>
    <line x1="190" y1="138" x2="190" y2="170" stroke="var(--dark)" stroke-width="1.5"/>
    <line x1="530" y1="138" x2="530" y2="170" stroke="var(--dark)" stroke-width="1.5"/>
    <rect x="40" y="170" width="300" height="52" rx="3" fill="var(--amber-50)" stroke="var(--amber)" stroke-width="1.5"/>
    <text x="190" y="192" text-anchor="middle" fill="var(--amber)">no → raise the average of the next tests</text>
    <text x="190" y="208" text-anchor="middle" fill="var(--amber)">(adjust the mixture; review curing and testing)</text>
    <rect x="380" y="170" width="300" height="52" rx="3" fill="var(--amber-50)" stroke="var(--amber)" stroke-width="1.5"/>
    <text x="530" y="192" text-anchor="middle" fill="var(--amber)">no → investigate the in-place strength:</text>
    <text x="530" y="208" text-anchor="middle" fill="var(--amber)">3 cores (ASTM C42) per failing test</text>
    <line x1="340" y1="112" x2="380" y2="112" stroke="var(--dark)" stroke-width="1.5"/>
    <line x1="190" y1="222" x2="190" y2="250" stroke="var(--dark)" stroke-width="1.5"/><line x1="530" y1="222" x2="530" y2="250" stroke="var(--dark)" stroke-width="1.5"/>
    <rect x="40" y="250" width="300" height="36" rx="3" fill="var(--green-50)" stroke="var(--green)" stroke-width="1.5"/>
    <text x="190" y="273" text-anchor="middle" fill="var(--green)">both yes → the mixture is accepted</text>
    <rect x="380" y="250" width="300" height="36" rx="3" fill="var(--bg)" stroke="var(--dark)" stroke-width="1.5"/>
    <text x="530" y="273" text-anchor="middle">cores OK if avg ≥ 0.85 f′c and none &lt; 0.75 f′c</text>
  </g>
</svg>
<figcaption>Figure 3. The two criteria are checked separately and lead to different follow-ups: a low running average is a mixture problem; a single low test is a possible structure problem.</figcaption>
</figure>
<p>The two criteria fail in different ways and call for different responses. When the running average slips below <i>f</i>′<sub>c</sub>, the mixture is drifting — the supplier adjusts the proportions so later tests come up — and nobody cores a wall. When a single test lands more than 500 psi low, the concern is that one batch may be weak in place, and ACI 318 calls for an investigation: three cores from the area represented by the failing test, tested per ASTM C42, and the concrete is structurally adequate when the average of the three is at least 0.85 <i>f</i>′<sub>c</sub> and no single core is below 0.75 <i>f</i>′<sub>c</sub>. Before anyone drills, though, the cylinders' history is checked, because a set that froze in a truck fails criterion (b) just as convincingly as bad concrete does.</p>
<div class="callout callout-key"><span class="label">Key idea</span>
  <p>The criteria assume scatter: a mix that averages exactly <i>f</i>′<sub>c</sub> fails half the time. That is why the mixture is designed for a higher <em>required average strength</em>, <i>f</i>′<sub>cr</sub> — the margin worked out in <a href="../mix-design/">Part 1 of the mix design series</a>.</p>
</div>

<h2 id="age"><span class="num">7</span>How strength grows with age</h2>
<p>Concrete gains strength as cement hydrates, quickly at first and then for years, as long as it stays moist and warm enough. The 28-day age is a convention — long enough for most of the strength, short enough to be useful — and everything else is measured against it. ACI 209 gives a serviceable estimate of the fraction of the 28-day strength reached at an age <i>t</i> in days:</p>
<div class="eq"><i>f</i>(<i>t</i>) / <i>f</i><sub>28</sub> ≈ <i>t</i> / (<i>a</i> + <i>b</i> <i>t</i>), with <i>a</i> = 4.0 and <i>b</i> = 0.85 for Type I cement, moist-cured</div>
<div class="table-wrap">
<table class="ref-table" id="tbl-age">
  <caption>Table 2. Typical strength as a fraction of the 28-day strength (ACI 209, Type I cement, moist curing)</caption>
  <thead><tr><th scope="col">Age, days</th><th scope="col">1</th><th scope="col">3</th><th scope="col">7</th><th scope="col">14</th><th scope="col">28</th><th scope="col">56</th><th scope="col">90</th></tr></thead>
  <tbody><tr><td>Fraction</td><td>0.20</td><td>0.45</td><td>0.70</td><td>0.87</td><td>1.00</td><td>1.08</td><td>1.11</td></tr></tbody>
</table>
</div>
<p class="ref-note">Fractions normalized so that 28 days reads exactly 1.00. Type III (high-early) cement runs ahead of this — about 0.80 at 7 days — and every mixture has its own curve; the numbers are an estimate for planning, never a basis for acceptance.</p>
<p>The practical use is the other way round: a 7-day cylinder at 3,050 psi suggests a 28-day result near 4,350 psi, so the job can carry on with some confidence — or, if the 7-day number is far below the expected 70 %, the supplier can start looking for the cause three weeks before the acceptance test fails. Temperature bends the curve in both directions: hydration slows dramatically as the concrete approaches freezing, and a slab that dries out stops gaining strength altogether, which is what curing compounds, wet burlap and blankets are for.</p>

<h2 id="calculator"><span class="num">8</span>Try it: strength tests, the acceptance rule, and the age curve</h2>
<p>The numbers below are example numbers, not a real job. Enter the maximum load of each cylinder and the calculator reports each strength to the nearest 10 psi, averages the cylinders of each test, checks both ACI 318 criteria, and draws the tests as a control chart. The second plot turns one 28-day strength into an estimated age curve.</p>
<form id="calc" class="calc" novalidate>
  <div class="calc-grid">
    <div class="num-field"><label for="fc">Specified strength, <i>f</i>′<sub>c</sub></label><div class="wrap"><input id="fc" name="fc" type="number" step="100" value="4000"><span class="unit">psi</span></div></div>
    <div class="num-field"><label for="size">Cylinder size</label><div class="wrap"><select id="size" name="size"><option value="6x12" selected>6 × 12 in. (2 cylinders per test)</option><option value="4x8">4 × 8 in. (3 cylinders per test)</option></select></div><p class="hint">Area 28.27 in.² or 12.57 in.²; a 4 × 8 breaks at less than half the load.</p></div>
  </div>
  <fieldset class="calc-points">
    <legend>Strength tests — maximum load of each cylinder, lbf</legend>
    <div class="calc-tests">
    <table class="calc-table">
      <thead><tr><th scope="col">Test</th><th scope="col">Cyl. A</th><th scope="col">Cyl. B</th><th scope="col" class="col-c">Cyl. C</th><th scope="col">Strengths, psi</th><th scope="col">Test avg</th><th scope="col">(b)</th><th scope="col">3-test avg · (a)</th></tr></thead>
      <tbody>
        <tr><th scope="row">1</th><td><input type="number" step="100" name="l1a" value="122200" aria-label="Test 1 cylinder A load, lbf"></td><td><input type="number" step="100" name="l1b" value="124700" aria-label="Test 1 cylinder B load, lbf"></td><td class="col-c"><input type="number" step="100" name="l1c" value="" aria-label="Test 1 cylinder C load, lbf"></td><td class="out" id="str-1">—</td><td class="out" id="avg-1">—</td><td class="out" id="critb-1">—</td><td class="out" id="avg3-1">—</td></tr>
        <tr><th scope="row">2</th><td><input type="number" step="100" name="l2a" value="117300" aria-label="Test 2 cylinder A load, lbf"></td><td><input type="number" step="100" name="l2b" value="115600" aria-label="Test 2 cylinder B load, lbf"></td><td class="col-c"><input type="number" step="100" name="l2c" value="" aria-label="Test 2 cylinder C load, lbf"></td><td class="out" id="str-2">—</td><td class="out" id="avg-2">—</td><td class="out" id="critb-2">—</td><td class="out" id="avg3-2">—</td></tr>
        <tr><th scope="row">3</th><td><input type="number" step="100" name="l3a" value="112500" aria-label="Test 3 cylinder A load, lbf"></td><td><input type="number" step="100" name="l3b" value="114200" aria-label="Test 3 cylinder B load, lbf"></td><td class="col-c"><input type="number" step="100" name="l3c" value="" aria-label="Test 3 cylinder C load, lbf"></td><td class="out" id="str-3">—</td><td class="out" id="avg-3">—</td><td class="out" id="critb-3">—</td><td class="out" id="avg3-3">—</td></tr>
        <tr><th scope="row">4</th><td><input type="number" step="100" name="l4a" value="102400" aria-label="Test 4 cylinder A load, lbf"></td><td><input type="number" step="100" name="l4b" value="104600" aria-label="Test 4 cylinder B load, lbf"></td><td class="col-c"><input type="number" step="100" name="l4c" value="" aria-label="Test 4 cylinder C load, lbf"></td><td class="out" id="str-4">—</td><td class="out" id="avg-4">—</td><td class="out" id="critb-4">—</td><td class="out" id="avg3-4">—</td></tr>
        <tr><th scope="row">5</th><td><input type="number" step="100" name="l5a" value="126700" aria-label="Test 5 cylinder A load, lbf"></td><td><input type="number" step="100" name="l5b" value="128900" aria-label="Test 5 cylinder B load, lbf"></td><td class="col-c"><input type="number" step="100" name="l5c" value="" aria-label="Test 5 cylinder C load, lbf"></td><td class="out" id="str-5">—</td><td class="out" id="avg-5">—</td><td class="out" id="critb-5">—</td><td class="out" id="avg3-5">—</td></tr>
        <tr><th scope="row">6</th><td><input type="number" step="100" name="l6a" value="121600" aria-label="Test 6 cylinder A load, lbf"></td><td><input type="number" step="100" name="l6b" value="119900" aria-label="Test 6 cylinder B load, lbf"></td><td class="col-c"><input type="number" step="100" name="l6c" value="" aria-label="Test 6 cylinder C load, lbf"></td><td class="out" id="str-6">—</td><td class="out" id="avg-6">—</td><td class="out" id="critb-6">—</td><td class="out" id="avg3-6">—</td></tr>
      </tbody>
    </table>
    </div>
  </fieldset>
  <div class="calc-grid">
    <div class="num-field"><label for="f28">28-day strength for the age curve</label><div class="wrap"><input id="f28" name="f28" type="number" step="10" value="4370"><span class="unit">psi</span></div><p class="hint">Any 28-day result; the default is test 1's average.</p></div>
    <div class="num-field"><label for="cement">Cement and curing</label><div class="wrap"><select id="cement" name="cement"><option value="typeI" selected>Type I, moist-cured</option><option value="typeIII">Type III (high-early), moist-cured</option></select></div></div>
  </div>
  <p class="calc-error" id="calc-errors" aria-live="polite"></p>
</form>
<div class="calc-result" aria-live="polite">
  <dl class="calc-summary">
    <div><dt>Criterion (b) limit</dt><dd id="out-limit">—</dd></div>
    <div><dt>Tests entered</dt><dd id="out-count">—</dd></div>
    <div><dt>Verdict</dt><dd id="out-verdict">—</dd></div>
    <div><dt>7-day estimate</dt><dd id="out-f7">—</dd></div>
  </dl>
  <p id="out-reasons" class="calc-notes"></p>
  <p id="out-notes" class="calc-notes"></p>
</div>
<div class="calc-plots">
  <figure class="calc-plot-wrap">
    <svg id="calc-control" class="fig-svg calc-svg" viewBox="0 0 720 300" role="img" aria-label="Strength test control chart"></svg>
    <figcaption>Figure 4. Strength tests in order, with the running three-test average, the specified strength, and the criterion (b) limit.</figcaption>
  </figure>
  <figure class="calc-plot-wrap">
    <svg id="calc-age" class="fig-svg calc-svg" viewBox="0 0 720 300" role="img" aria-label="Estimated strength versus age"></svg>
    <figcaption>Figure 5. Estimated strength against age from the 28-day value (ACI 209). An estimate for planning, not for acceptance.</figcaption>
  </figure>
</div>
<div class="table-wrap">
<table class="ref-table" id="tbl-age-calc">
  <caption>Table 3. Age curve from the 28-day strength entered above</caption>
  <thead><tr><th scope="col">Age, days</th><th scope="col">1</th><th scope="col">3</th><th scope="col">7</th><th scope="col">14</th><th scope="col">28</th><th scope="col">56</th><th scope="col">90</th></tr></thead>
  <tbody id="age-table"><tr><td>Strength, psi</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr></tbody>
</table>
</div>
<noscript><p class="ref-note">The calculator needs JavaScript. With the example loads and f′c = 4,000 psi, the six test averages are 4,370, 4,120, 4,010, 3,660, 4,520 and 4,270 psi; every test clears the 3,500 psi limit of criterion (b), but the average of tests 2 to 4 is 3,930 psi, below f′c, so the mixture is not accepted under criterion (a). From a 28-day strength of 4,370 psi the Type I age curve estimates about 3,050 psi at 7 days.</p></noscript>
<p class="ref-note">Units: lbf and psi throughout (1,000 psi = 6.895 MPa). Strengths are rounded to 10 psi before averaging, as a laboratory report would show them.</p>

<h2 id="mistakes"><span class="num">9</span>Common mistakes</h2>
<ul>
  <li><strong>Treating one cylinder as a test.</strong> A strength test is the average of two 6 × 12 or three 4 × 8 cylinders. One low cylinder in a pair is a question about that cylinder first.</li>
  <li><strong>Cylinders in the truck.</strong> Left in a hot cab or a freezing bed for the first night, they read low, and the wall is blamed for the technician's evening. Use a curing box and log its thermometer.</li>
  <li><strong>Judging acceptance on 7-day breaks.</strong> Seven-day cylinders are an indicator. The acceptance test is at 28 days (or the age the specification names).</li>
  <li><strong>Mixing up the two criteria.</strong> A low three-test average means adjust the mix; a single test more than 500 psi low means check the cylinders' history and, if that is clean, investigate the structure with cores.</li>
  <li><strong>Assuming the diameter.</strong> A 5.95 in. cylinder called 6.00 in. under-reports the strength by almost 2 %; measure it.</li>
  <li><strong>Loading too fast, or easing off near the peak.</strong> Both change the number. The rate is 35 ± 7 psi/s from start to break.</li>
  <li><strong>Ignoring the fracture sketch.</strong> A type 5 or 6 break with a low number is a capping or pad problem until proven otherwise.</li>
</ul>

<h2 id="takeaways"><span class="num">10</span>Key takeaways</h2>
<ol>
  <li>A cylinder judges the concrete <strong>delivered</strong>, not the structure; standard curing (73.5 ± 3.5 °F, moist) and the first 48 hours (60 to 80 °F, no drying) decide whether the number means anything.</li>
  <li>Make them right: molding within 15 minutes, <strong>25 strokes per layer</strong> with the matching rod, tap the mold, cover the top.</li>
  <li>Break them right: ends capped or padded, diameter measured, age on time, <strong>35 ± 7 psi/s</strong>, strength = <i>P</i>/<i>A</i> to the nearest 10 psi, fracture type recorded.</li>
  <li>Accept them by the rule: every <strong>three-test average ≥ f′c</strong> and <strong>no test more than 500 psi below f′c</strong> (10 % above 5,000 psi) — and follow the failure to the right fix.</li>
</ol>

<p class="ref-note">Sources: ASTM C31/C31M (making and curing field specimens); ASTM C39/C39M (compressive strength); ASTM C617 and C1231 (capping and unbonded caps); ASTM C42 (cores); ASTM C172 and C511; ACI 318-19 §26.12 (evaluation and acceptance); ACI 209R-92 (strength–age relation). Precision figures are stated approximately.</p>
<p class="ref-note">Photo credits: <a href="https://commons.wikimedia.org/wiki/File:Concrete_Compression_Testing.jpg">Concrete Compression Testing</a> and <a href="https://commons.wikimedia.org/wiki/File:Failed_Concrete_Cylinder.jpg">Failed Concrete Cylinder</a> by Xb-70, public domain; <a href="https://commons.wikimedia.org/wiki/File:Concrete_cylinder_break_test_090219-N-KE792-469.jpg">Concrete cylinder break test</a> and <a href="https://commons.wikimedia.org/wiki/File:US_Navy_080108-N-7367K-004_Engineering_Aide_2nd_Class_Robert_Wetzel,_assigned_to_Naval_Mobile_Construction_Battalion_(NMCB)_1,_Task_Force_Sierra,_fills_cylinders_with_concrete_in_preparation_for_a_compression_test.jpg">filling cylinders for a compression test</a>, U.S. Navy photos, public domain; <a href="https://commons.wikimedia.org/wiki/File:Probetas_hormig%C3%B3n_01.jpg">Probetas hormigón 01</a> and <a href="https://commons.wikimedia.org/wiki/File:Probetas_hormig%C3%B3n_02.jpg">02</a> by Tano4595, <a href="https://creativecommons.org/licenses/by-sa/2.5/">CC BY-SA 2.5</a>; <a href="https://commons.wikimedia.org/wiki/File:Cube_Test_2.jpg">Cube Test 2</a> by Fotokannan, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>; all via Wikimedia Commons. The photos were resized, cropped and recompressed for the web.</p>

<nav class="article-nav" aria-label="Series">
  <a class="prev" href="../slump-test/"><span class="dir">← Related</span><span class="ttl">The slump test, step by step</span></a>
  <a class="next" href="../"><span class="dir">Study →</span><span class="ttl">All study materials</span></a>
</nav>

</article>
</main>

<footer class="site-footer">
  <span>© <span id="year"></span> Jisoo Park. All rights reserved.</span>
  <a href="../../">← Home</a>
</footer>
<script src="../article.js"></script>
<script type="module" src="calc.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `calc.js` (DOM + two SVG plots; all math from `cylinders.js`)**

Create `site/study/concrete-cylinders/calc.js`:

```js
// site/study/concrete-cylinders/calc.js — 공시체 계산기 화면 (ES module): 입력 읽기 → cylinders.js 계산 → 표·요약·플롯 2개
import { strength, evaluateTests, ageCurve, ageRatio, AGE_COEFF, RANGE_LIMIT, validate } from './cylinders.js';

const $ = id => document.getElementById(id);
const form = $('calc');
if (form) {
  const SVG = 'http://www.w3.org/2000/svg';
  const N = 6, COLS = ['a', 'b', 'c'], DAYS = [1, 3, 7, 14, 28, 56, 90];
  const fmt = n => Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—';
  const num = name => parseFloat(form.elements[name].value);

  function el(tag, attrs, text) {
    const n = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text != null) n.textContent = text;
    return n;
  }
  function measure(node) { // 렌더 전에는 getBBox 가 실패할 수 있다 → null
    try { const b = node.getBBox(); if (b && b.width > 0) return b; } catch (e) { /* 측정 불가 */ }
    return null;
  }
  function textWidth(node) {
    try { const w = node.getComputedTextLength(); if (w > 0) return w; } catch (e) { /* 측정 불가 */ }
    return node.textContent.length * 7.2; // 12 단위 모노 글꼴의 대략적 폭
  }
  // 라벨을 플롯 상자 안에 넣고(anchor 반전) 배경색 후광을 깐다
  function placeLabel(g, x, y, text, fill, L, R) {
    const label = el('text', { x, y, fill }, text);
    g.appendChild(label);
    const w = textWidth(label);
    if (x + w > R) { label.setAttribute('x', Math.max(L, x - w)); }
    const box = measure(label);
    if (box) g.insertBefore(el('rect', { x: box.x - 3, y: box.y - 2, width: box.width + 6, height: box.height + 4, fill: 'var(--surface)' }), label);
    return label;
  }
  function clearSvg(svg, aria) { while (svg.firstChild) svg.removeChild(svg.firstChild); svg.setAttribute('aria-label', aria); }

  function readInputs() {
    const errors = [];
    const size = form.elements.size.value, need = size === '4x8' ? 3 : 2;
    const fc = num('fc'); const efc = validate('fc', fc); if (efc) errors.push(`Specified strength: ${efc}.`);
    const f28 = num('f28'); const e28 = validate('f28', f28); if (e28) errors.push(`28-day strength: ${e28}.`);
    const tests = [], short = [];
    for (let i = 1; i <= N; i++) {
      const loads = [];
      for (const c of COLS.slice(0, need)) {
        const raw = form.elements['l' + i + c].value;
        if (raw === '') continue;
        const v = parseFloat(raw), e = validate('load', v);
        if (e) errors.push(`Test ${i} cylinder ${c.toUpperCase()}: ${e}.`); else loads.push(v);
      }
      if (!loads.length) continue; // 빈 행은 건너뛴다(행 번호는 유지)
      if (loads.length < need) short.push(i);
      tests.push({ id: i, strengths: loads.map(P => strength(P, size)), size });
    }
    return { size, need, fc, f28, cement: form.elements.cement.value, tests, short, errors };
  }

  function resetRows() {
    for (let i = 1; i <= N; i++) for (const p of ['str-', 'avg-', 'critb-', 'avg3-']) { const c = $(p + i); c.textContent = '—'; c.className = 'out'; }
  }
  function showNothing(message) {
    resetRows();
    for (const id of ['out-limit', 'out-count', 'out-verdict', 'out-f7']) $(id).textContent = '—';
    $('out-verdict').className = '';
    $('out-reasons').textContent = ''; $('out-notes').textContent = message;
    for (const td of $('age-table').querySelectorAll('td')) if (!td.matches(':first-child')) td.textContent = '—';
    clearSvg($('calc-control'), 'No result — fix the inputs to see the control chart');
    clearSvg($('calc-age'), 'No result — fix the inputs to see the age curve');
  }

  // 플롯 1: 시험별 강도 관리도
  function drawControl(res, fc, inp) {
    const svg = $('calc-control'); clearSvg(svg, '');
    const L = 80, R = 700, T = 24, B = 250;
    const vals = res.tests.map(t => t.avg).concat([fc, res.limitB]);
    const yMin = Math.floor((Math.min(...vals) - 300) / 100) * 100, yMax = Math.ceil((Math.max(...vals) + 300) / 100) * 100;
    const X = i => L + (i - 0.5) / N * (R - L), Y = v => B - (v - yMin) / (yMax - yMin) * (B - T);
    const g = el('g', { 'font-family': 'var(--font-mono)', 'font-size': '12', fill: 'var(--muted)' }); svg.appendChild(g);
    const step = (yMax - yMin) > 2000 ? 500 : 250;
    for (let v = yMin; v <= yMax; v += step) {
      g.appendChild(el('line', { x1: L, y1: Y(v), x2: R, y2: Y(v), stroke: 'var(--border)', 'stroke-width': 1 }));
      g.appendChild(el('text', { x: L - 8, y: Y(v) + 4, 'text-anchor': 'end' }, fmt(v)));
    }
    for (let i = 1; i <= N; i++) g.appendChild(el('text', { x: X(i), y: B + 18, 'text-anchor': 'middle' }, `T${i}`));
    g.appendChild(el('line', { x1: L, y1: B, x2: R, y2: B, stroke: 'var(--dark)', 'stroke-width': 1.5 }));
    g.appendChild(el('line', { x1: L, y1: T, x2: L, y2: B, stroke: 'var(--dark)', 'stroke-width': 1.5 }));
    g.appendChild(el('text', { x: (L + R) / 2, y: 288, 'text-anchor': 'middle', fill: 'var(--dark)' }, 'strength test (in order)'));
    g.appendChild(el('text', { x: 18, y: (T + B) / 2, 'text-anchor': 'middle', fill: 'var(--dark)', transform: `rotate(-90 18 ${(T + B) / 2})` }, 'psi'));
    g.appendChild(el('line', { x1: L, y1: Y(fc), x2: R, y2: Y(fc), stroke: 'var(--royal)', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }));
    placeLabel(g, L + 6, Y(fc) - 6, `f'c ${fmt(fc)} psi`, 'var(--royal)', L, R);
    g.appendChild(el('line', { x1: L, y1: Y(res.limitB), x2: R, y2: Y(res.limitB), stroke: 'var(--amber)', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }));
    placeLabel(g, L + 6, Y(res.limitB) + 16, `criterion (b) limit ${fmt(res.limitB)} psi`, 'var(--amber)', L, R);
    // 3회 이동평균(점선 + 사각형)
    const a3 = res.tests.filter(t => t.avg3 != null);
    if (a3.length > 1) g.appendChild(el('polyline', { points: a3.map(t => `${X(t.id).toFixed(1)},${Y(t.avg3).toFixed(1)}`).join(' '), fill: 'none', stroke: 'var(--dark)', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }));
    for (const t of a3) g.appendChild(el('rect', { x: X(t.id) - 4, y: Y(t.avg3) - 4, width: 8, height: 8, fill: t.okA ? 'var(--dark)' : 'var(--amber)' }));
    // 시험 평균(실선 + 원/마름모)
    if (res.tests.length > 1) g.appendChild(el('polyline', { points: res.tests.map(t => `${X(t.id).toFixed(1)},${Y(t.avg).toFixed(1)}`).join(' '), fill: 'none', stroke: 'var(--royal)', 'stroke-width': 2.5 }));
    for (const t of res.tests) {
      const x = X(t.id), y = Y(t.avg);
      if (t.okB) g.appendChild(el('circle', { cx: x, cy: y, r: 5, fill: 'var(--royal)', stroke: 'var(--bg)', 'stroke-width': 1.5 }));
      else g.appendChild(el('polygon', { points: `${x},${y - 7} ${x + 7},${y} ${x},${y + 7} ${x - 7},${y}`, fill: 'var(--amber)', stroke: 'var(--dark)', 'stroke-width': 1 }));
      g.appendChild(el('text', { x, y: y - 10, 'text-anchor': 'middle', fill: 'var(--dark)' }, fmt(t.avg)));
    }
    g.appendChild(el('text', { x: R - 4, y: T + 12, 'text-anchor': 'end' }, 'circles: test averages · squares: 3-test averages'));
    svg.setAttribute('aria-label', `Control chart: ${res.tests.length} strength tests, specified strength ${fmt(fc)} psi, ${res.pass ? 'all criteria met' : 'criteria not met'}`);
  }

  // 플롯 2: 재령 곡선
  function drawAge(f28, coeff, curve) {
    const svg = $('calc-age'); clearSvg(svg, '');
    const L = 80, R = 700, T = 24, B = 250;
    const yMax = Math.ceil((Math.max(...curve.map(p => p.f)) + 500) / 500) * 500;
    const X = t => L + t / 90 * (R - L), Y = v => B - v / yMax * (B - T);
    const g = el('g', { 'font-family': 'var(--font-mono)', 'font-size': '12', fill: 'var(--muted)' }); svg.appendChild(g);
    const step = yMax > 6000 ? 2000 : 1000;
    for (let v = 0; v <= yMax; v += step) {
      g.appendChild(el('line', { x1: L, y1: Y(v), x2: R, y2: Y(v), stroke: 'var(--border)', 'stroke-width': 1 }));
      g.appendChild(el('text', { x: L - 8, y: Y(v) + 4, 'text-anchor': 'end' }, fmt(v)));
    }
    for (const d of [0, 14, 28, 42, 56, 70, 84]) g.appendChild(el('text', { x: X(d), y: B + 18, 'text-anchor': 'middle' }, String(d)));
    g.appendChild(el('line', { x1: L, y1: B, x2: R, y2: B, stroke: 'var(--dark)', 'stroke-width': 1.5 }));
    g.appendChild(el('line', { x1: L, y1: T, x2: L, y2: B, stroke: 'var(--dark)', 'stroke-width': 1.5 }));
    g.appendChild(el('text', { x: (L + R) / 2, y: 288, 'text-anchor': 'middle', fill: 'var(--dark)' }, 'age, days'));
    g.appendChild(el('text', { x: 18, y: (T + B) / 2, 'text-anchor': 'middle', fill: 'var(--dark)', transform: `rotate(-90 18 ${(T + B) / 2})` }, 'psi'));
    g.appendChild(el('line', { x1: L, y1: Y(f28), x2: R, y2: Y(f28), stroke: 'var(--royal)', 'stroke-width': 1, 'stroke-dasharray': '4 4' }));
    placeLabel(g, R - 4 - 120, Y(f28) - 6, `28-day ${fmt(f28)} psi`, 'var(--royal)', L, R);
    const pts = [];
    for (let i = 0; i <= 60; i++) { const t = 0.5 + (90 - 0.5) * i / 60; pts.push(`${X(t).toFixed(1)},${Y(f28 * ageRatio(t, coeff)).toFixed(1)}`); }
    g.appendChild(el('polyline', { points: pts.join(' '), fill: 'none', stroke: 'var(--royal)', 'stroke-width': 3 }));
    for (const p of curve) {
      g.appendChild(el('circle', { cx: X(p.t), cy: Y(p.f), r: 4.5, fill: 'var(--dark)', stroke: 'var(--bg)', 'stroke-width': 1.5 }));
      if (p.t !== 28) placeLabel(g, X(p.t) + 6, Y(p.f) + (p.t < 28 ? 16 : -8), `${p.t} d · ${fmt(p.f)}`, 'var(--dark)', L, R);
    }
    svg.setAttribute('aria-label', `Estimated strength versus age from ${fmt(f28)} psi at 28 days: ${curve.map(p => `${p.t} days ${fmt(p.f)} psi`).join(', ')}`);
  }

  function update() {
    const inp = readInputs();
    for (const cell of document.querySelectorAll('.col-c')) cell.hidden = inp.size !== '4x8'; // 4 × 8 만 세 번째 공시체 열
    $('calc-errors').textContent = inp.errors.join(' ');
    if (inp.errors.length) { showNothing('Fix the inputs listed above to see a result.'); return; }
    const res = evaluateTests(inp.tests, inp.fc, inp.size);
    if (res.error) { showNothing(res.error); return; }
    resetRows();
    for (const t of res.tests) {
      const src = inp.tests.find(x => x.id === t.id);
      $('str-' + t.id).textContent = src.strengths.map(fmt).join(' / ');
      $('avg-' + t.id).textContent = fmt(t.avg) + (t.rangeWide ? ' !' : '');
      const b = $('critb-' + t.id); b.textContent = t.okB ? 'OK' : 'low'; b.className = 'out ' + (t.okB ? 'ok' : 'bad');
      const a = $('avg3-' + t.id);
      if (t.avg3 != null) { a.textContent = `${fmt(t.avg3)} · ${t.okA ? 'OK' : 'low'}`; a.className = 'out ' + (t.okA ? 'ok' : 'bad'); }
    }
    $('out-limit').textContent = `${fmt(res.limitB)} psi`;
    $('out-count').textContent = `${res.tests.length} of ${N}`;
    const verdict = $('out-verdict');
    verdict.textContent = res.pass ? 'ACCEPTED' : 'NOT ACCEPTED';
    verdict.className = res.pass ? 'verdict-pass' : 'verdict-fail';
    $('out-reasons').textContent = res.reasons.join(' ');
    const notes = [];
    for (const t of res.tests) if (t.rangeWide) notes.push(`Test ${t.id}: the cylinders differ by ${t.rangePct.toFixed(1)} % of their average — wider than the method's usual spread (about ${RANGE_LIMIT[inp.size]} %); check that test before using it.`);
    for (const i of inp.short) notes.push(`Test ${i} has fewer cylinders than a ${inp.size === '4x8' ? '4 × 8 test needs (three)' : '6 × 12 test needs (two)'}.`);
    if (res.tests.length < 3) notes.push('Criterion (a) needs at least three consecutive tests.');
    $('out-notes').textContent = notes.join(' ');
    const coeff = AGE_COEFF[inp.cement], curve = ageCurve(inp.f28, coeff, DAYS);
    $('out-f7').textContent = `${fmt(curve[2].f)} psi`;
    const cells = [...$('age-table').querySelectorAll('td')].slice(1);
    curve.forEach((p, i) => { cells[i].textContent = fmt(p.f); });
    drawControl(res, inp.fc, inp);
    drawAge(inp.f28, coeff, curve);
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', e => { e.preventDefault(); update(); });
  update();
}
```

- [ ] **Step 3: Styles (tokens only)**

In `site/study/article.css`, directly after the line `.article .calc-plot-wrap { margin-top:20px; }` add:

```css
.calc-tests { overflow-x:auto; }                                     /* 열이 8개인 시험 표: 좁은 화면에서 가로 스크롤 */
.calc-tests .calc-table { max-width:none; min-width:640px; }
.calc-table .out.ok { color:var(--green); }
.calc-table .out.bad { color:var(--amber); }
.calc .num-field .wrap select { border:0; outline:0; padding:10px 12px; width:100%; background:var(--bg); color:var(--text);
  font:500 14px/1.2 var(--font); }
.calc-plots { display:grid; gap:8px; }
```

- [ ] **Step 4: Register the page with the guards**

In `tools/site-guards.test.mjs`: add `'study/concrete-cylinders/index.html'` and `'study/concrete-cylinders/calc.js'` to the `files` array of the tokens-only test, and `'study/concrete-cylinders/index.html'` to `ARTICLE_PAGES`.

- [ ] **Step 5: Run the gate and check the page in a browser**

Run the full gate (Global Constraints) → all pass (registry tests still pass; Task 4 adds the entry).

Start `python tools/devserver.py 8768 site` in the background and capture with the CDP driver `D:\Codex\Temp\claude\D--Projects-Test\d64fe480-de3e-4585-8fe0-f5b32b07ce45\scratchpad\verify\cdp-shot.mjs <url> <steps.json>` (1440×900; steps `{eval, wait, shot}`; eval = async body with `return`) and the 390 px variant `…\scratchpad\verify-room\cdp-shot-390.mjs`; put files in `…\scratchpad\verify-cyl\`. Steps, each with a screenshot:
1. Load → `#avg-1..#avg-6` = 4,370 / 4,120 / 4,010 / 3,660 / 4,520 / 4,270; `#critb-4` = OK; `#avg3-4` starts with "3,930" and says low; `#out-limit` = 3,500 psi; `#out-verdict` = NOT ACCEPTED; `#out-reasons` mentions "Tests 2–4"; `#out-f7` = 3,050 psi; both SVGs have child nodes; age table cells 890 / 1,990 / 3,050 / 3,820 / 4,370 / 4,710 / 4,850; `.col-c` cells hidden.
2. Set `l4a` = 118000, `l4b` = 120000 (dispatch `input`) → verdict ACCEPTED, reasons empty.
3. Set `size` = 4x8 (dispatch `change`) → `.col-c` visible; notes say tests have fewer cylinders than a 4 × 8 test needs.
4. Reset (`form.reset()` + input event), blank test 6 (`l6a`, `l6b` = '') → `#out-count` = "5 of 6", `#avg-6` = '—', the chart shows five points.
5. Set `l1a` = 100 → `#calc-errors` mentions "Test 1 cylinder A"; outputs '—'; both SVGs empty with "No result" aria-labels. Reset again → NOT ACCEPTED (defaults).
6. Set `f28` = 5000 and `cement` = typeIII → `#out-f7` = 4,010 psi (5,000 × 0.8026 = 4,013 → 4,010).
7. 390 px: top of the calculator (table scrolls inside `.calc-tests`, `document.documentElement.scrollWidth === 390`), the results panel, both plots.
Read every screenshot: no overlapping labels, no clipped text, the two dashed reference lines labelled, the age curve rising through the markers. Fix only genuine defects and record them.

- [ ] **Step 6: Commit**

```bash
git add site/study/concrete-cylinders/index.html site/study/concrete-cylinders/calc.js site/study/article.css tools/site-guards.test.mjs && git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 공시체 글 — 본문 10절·SVG 도해 3장·사진 7장·계산기(강도·ACI 318 합격 판정·재령 곡선, calc.js) + 스타일, 가드 목록 갱신

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 4: Registry entry, README, and Study index verification

**Files:**
- Modify: `site/shared/registry.js` (MATERIALS entry between `slump-test` and `soil-compaction`)
- Modify: `tools/registry.test.mjs` (page id list)
- Modify: `README.md` (structure + test command)

- [ ] **Step 1: Update the registry test first (it must fail)**

In `tools/registry.test.mjs` change the expected page ids to `['mix-design-1', 'mix-design-2', 'slump-test', 'concrete-cylinders', 'soil-compaction']` and the test name to `'MATERIALS: 믹스 디자인 2편·슬럼프·공시체·다짐 글이 등록돼 있고 page href 가 실제 파일을 가리킨다'`. Run `node --test tools/registry.test.mjs` → expect 1 failure.

- [ ] **Step 2: Add the entry**

In `site/shared/registry.js`, between the `slump-test` entry and the `soil-compaction` entry insert:

```js
    { id: 'concrete-cylinders', group: 'materials', type: 'page', title: 'Concrete cylinders: from the mold to the acceptance decision',
      desc: 'Making and curing test cylinders (ASTM C31), breaking them (ASTM C39), reading the fracture, and deciding acceptance the ACI 318 way — with a calculator for strength tests and the age curve.',
      href: 'concrete-cylinders/' },
```

Run `node --test tools/registry.test.mjs` → all pass.

- [ ] **Step 3: README**

Add `` - `site/study/concrete-cylinders/` — *Concrete cylinders: from the mold to the acceptance decision* (`index.html` + `cylinders.js` + `calc.js`); photos in `img/` `` between the slump-test and soil-compaction lines of the structure list, and append `tools/cylinders.test.mjs` to the test command line.

- [ ] **Step 4: Full gate + Study index capture**

Run the full gate → all pass (expect 65 + 8 = 73 tests). Capture `http://localhost:8768/study/` at 1440 px: five Materials cards in the order Part 1, Part 2, slump test, concrete cylinders, compaction control; the new card links to `concrete-cylinders/`.

- [ ] **Step 5: Commit**

```bash
git add site/shared/registry.js tools/registry.test.mjs README.md && git -c core.quotepath=false commit -F - <<'EOF'
feat: 레지스트리에 공시체 글 등록(콘크리트 글 순서로 배치), registry 테스트·README 갱신

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

## Self-review notes

- Spec coverage: sections ①–⑩, diagrams A–C, seven photos, calculator inputs/outputs/plots, styles, registry order, guards, verification → Tasks 1–4 above plus the final review and finishing flow.
- Names: `calc.js` imports exactly `strength, evaluateTests, ageCurve, ageRatio, AGE_COEFF, RANGE_LIMIT, validate` — all exported by Task 1; DOM ids in block B match `calc.js`; photo pixel sizes in blocks A/B match Task 2.
- Numbers pinned with node: test averages 4,370 / 4,120 / 4,010 / 3,660 / 4,520 / 4,270; 3-test averages 4,167 / 3,930 / 4,063 / 4,150; Type I normalized ratios 0.2047 / 0.4547 / 0.6985 / 0.8742 / 1 / 1.0775 / 1.1100 → 890 / 1,990 / 3,050 / 3,820 / 4,370 / 4,710 / 4,850 psi from 4,370; Type III 7-day 0.8026.
- Read time: recompute after Task 3 (strip tables, SVG, captions, forms) and fix the byline if not 12 min.
