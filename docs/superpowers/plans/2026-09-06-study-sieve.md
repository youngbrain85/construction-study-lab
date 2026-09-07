# Study "Sieve analysis and the fineness modulus" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sixth Study article — aggregate gradation by sieve analysis (ASTM C136), the fineness modulus, nominal maximum size, and the ASTM C33 grading requirements — with three SVG diagrams, four CC photos (plus one photo reused from Part 1) and an interactive calculator that turns sieve masses into percent passing, FM / NMAS, C33 checks and a semi-log grading curve on the C33 band.

**Architecture:** One static page `site/study/aggregate-gradation/index.html` on the article template. Calculator = pure ES module `gradation.js` (tested with `node --test`) + DOM/SVG module `calc.js` (`type="module"`) that builds the sieve table for the chosen mode. Same photo pipeline, guards and registry pattern as the previous articles.

**Tech Stack:** Static HTML/CSS/vanilla JS (ES modules), inline SVG, Node 20 `node --test`, Python 3 + Pillow, curl.

**Spec:** `docs/superpowers/specs/2026-09-06-study-sieve-design.md`. Research notes: `D:\Codex\Temp\claude\D--Projects-Test\d64fe480-de3e-4585-8fe0-f5b32b07ce45\scratchpad\sieve-research\research.txt`. Reference implementation of the calculator pattern: `site/study/concrete-cylinders/` (`cylinders.js`, `calc.js`) and the `.calc*` block at the end of `site/study/article.css`.

## Global Constraints

- Work in the worktree `D:\Projects\Test\.claude\worktrees\study-sieve` (branch `worktree-study-sieve`). Never touch `D:\Projects\Test` directly.
- No course code: the uppercase string `CNST` must not appear anywhere under `site/`. No department or university name.
- Tokens only — no literal colours (`#rgb`, `#rrggbb`) in `site/study/article.css`, the new page (inline SVG included) or `calc.js` (SVG attributes use `var(--token)`).
- Footer text exactly `© <span id="year"></span> Jisoo Park. All rights reserved.`; English article; Korean code comments; no logos/emoji.
- Numbers in the article come only from ASTM C125 / C136 / C117 / C33 as recorded in research.txt §2–4; CAVEAT items (precision, the NMAS working rule) are qualitative or labelled "in practice"; calculator defaults are labelled "example numbers".
- Photo credits: caption with author + licence, plus a credits paragraph linking each Commons file page and each licence deed, and the sentence "The photos were resized, cropped and recompressed for the web." The reused Part 1 photo needs no credit line (site's own).
- Every `<img>` carries `width`/`height` equal to the real pixel size; every photo ≤ 220 KB and ≤ 1200 px on the long side; the per-folder photo guard expects exactly 4 files in `study/aggregate-gradation/img`.
- Commit format: `git add <files> && git -c core.quotepath=false commit -F - <<'EOF' … EOF`, Korean message, trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. One plain command or one heredoc per Bash call. Create files with the Write tool (UTF-8).
- Test gate (all must pass before every commit): `node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs tools/study-tables.test.mjs tools/site-guards.test.mjs tools/layout.test.mjs tools/props.test.mjs tools/decor.test.mjs tools/compaction.test.mjs tools/cylinders.test.mjs tools/gradation.test.mjs`

## File Structure

- Create `site/study/aggregate-gradation/gradation.js` — pure math and C33 tables.
- Create `tools/gradation.test.mjs` — node tests.
- Create `site/study/aggregate-gradation/img/{sieve-stack,weighing,shaker,gravel}.jpg` (Task 2).
- Create `site/study/aggregate-gradation/index.html`, `calc.js` (Task 3); modify `site/study/article.css` (one rule), `tools/site-guards.test.mjs` (Tasks 2, 3).
- Modify `site/shared/registry.js`, `tools/registry.test.mjs`, `README.md` (Task 4).

---

### Task 1: Pure module + tests

**Files:**
- Create: `site/study/aggregate-gradation/gradation.js`
- Test: `tools/gradation.test.mjs`

**Interfaces:**
- Produces (used by Task 3): `SIEVES = { fine:[{label, mm}…], coarse:[…] }`, `DEFAULTS = { fine:[g…], coarse:[g…] }`, `FM_SIEVES` (label→mm), `FINE_LIMITS`, `FINES_LIMIT`, `MAX_SINGLE_FRACTION`, `COARSE_LIMITS`, `FM_RANGE`, `analyze(retained, sieves)` → `{ total, rows:[{label, mm, retained, pctRetained, cumRetained, passing}] }` or `{ error }`, `finenessModulus(rows)`, `checkLimits(rows, limits)` → `{ checks:[{label, passing, min, max, ok}], allOk }`, `maxSingleFraction(rows)` → `{ label, pct, ok }`, `nominalMaxSize(rows)` → `{ nmas, maxSize }`, `massCheck(total, sampleMass)` → `{ diffPct, ok }` or `null`, `pct1(v)`, `validate(name, value)`.

- [ ] **Step 1: Write the failing tests**

Create `tools/gradation.test.mjs`:

```js
// tools/gradation.test.mjs — site/study/aggregate-gradation/gradation.js 계약 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
const G = await import('../site/study/aggregate-gradation/gradation.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const fine = G.analyze(G.DEFAULTS.fine, G.SIEVES.fine);
const coarse = G.analyze(G.DEFAULTS.coarse, G.SIEVES.coarse);

test('SIEVES: fine and coarse nests in decreasing opening, pan last', () => {
  assert.deepEqual(G.SIEVES.fine.map(s => s.label), ['3/8 in', 'No. 4', 'No. 8', 'No. 16', 'No. 30', 'No. 50', 'No. 100', 'No. 200', 'pan']);
  assert.deepEqual(G.SIEVES.coarse.map(s => s.label), ['2 in', '1-1/2 in', '1 in', '3/4 in', '1/2 in', '3/8 in', 'No. 4', 'No. 8', 'No. 16', 'pan']);
  for (const set of Object.values(G.SIEVES)) for (let i = 1; i < set.length; i++) assert.ok(set[i].mm < set[i - 1].mm, 'decreasing');
  assert.equal(G.SIEVES.fine[1].mm, 4.75); assert.equal(G.SIEVES.coarse[1].mm, 37.5);
});

test('analyze: percent retained, cumulative and passing for the fine example (500 g)', () => {
  assert.equal(fine.total, 500);
  assert.deepEqual(fine.rows.map(r => r.passing), [100, 97.6, 84, 62, 36, 15, 4, 1.2, 0]);
  assert.deepEqual(fine.rows.map(r => r.cumRetained), [0, 2.4, 16, 38, 64, 85, 96, 98.8, 100]);
  near(fine.rows[4].pctRetained, 26, 1e-9, 'No. 30 fraction');
  assert.ok(G.analyze([0, 0, 0], G.SIEVES.fine).error, 'all-zero → error');
  assert.ok(G.analyze([], G.SIEVES.fine).error, 'empty → error');
});

test('finenessModulus: 3.01 for the fine example, 7.09 for the coarse example', () => {
  near(G.finenessModulus(fine.rows), 3.01, 0.005, 'fine FM');
  near(G.finenessModulus(coarse.rows), 7.09, 0.005, 'coarse FM'); // No. 30·50·100 은 100 % 잔류로 센다
});

test('checkLimits: the fine example meets every C33 fine-aggregate limit; a No. 50 excess is caught', () => {
  const r = G.checkLimits(fine.rows, G.FINE_LIMITS);
  assert.equal(r.allOk, true);
  assert.deepEqual(r.checks.filter(c => c.ok !== null).map(c => c.label), ['3/8 in', 'No. 4', 'No. 8', 'No. 16', 'No. 30', 'No. 50', 'No. 100']);
  assert.equal(r.checks.find(c => c.label === 'No. 200').ok, null);
  const bad = G.analyze([0, 12, 68, 60, 60, 105, 55, 14, 126], G.SIEVES.fine); // 팬이 25.2 % → No. 100 통과 28 % (0–10 초과)
  const rb = G.checkLimits(bad.rows, G.FINE_LIMITS);
  assert.equal(rb.allOk, false); assert.equal(rb.checks.find(c => c.label === 'No. 100').ok, false);
});

test('maxSingleFraction: 26 % on No. 30 passes the 45 % rule', () => {
  const m = G.maxSingleFraction(fine.rows);
  assert.equal(m.label, 'No. 30'); near(m.pct, 26, 1e-9, 'pct'); assert.equal(m.ok, true);
  assert.equal(G.MAX_SINGLE_FRACTION, 45);
});

test('coarse Size 57 example: limits met, NMAS 1 in., maximum size 1-1/2 in.', () => {
  assert.equal(coarse.total, 10000);
  assert.deepEqual(coarse.rows.map(r => r.passing), [100, 100, 97, 73, 34, 15, 2, 0.5, 0.5, 0]);
  const r = G.checkLimits(coarse.rows, G.COARSE_LIMITS['57']);
  assert.equal(r.allOk, true);
  assert.deepEqual(r.checks.filter(c => c.ok !== null).map(c => c.label), ['1-1/2 in', '1 in', '1/2 in', 'No. 4', 'No. 8']);
  assert.deepEqual(G.nominalMaxSize(coarse.rows), { nmas: '1 in', maxSize: '1-1/2 in' });
  assert.deepEqual(Object.keys(G.COARSE_LIMITS).sort(), ['467', '57', '67', '7', '8'].sort()); // 정수형 키는 JS 가 오름차순으로 재배열하므로 집합으로 비교
  assert.deepEqual(G.COARSE_LIMITS['67']['3/8 in'], [20, 55]);
});

test('massCheck: 0.3 % rule; validate limits', () => {
  assert.deepEqual(G.massCheck(500, 501), { diffPct: 0.2, ok: true });
  assert.deepEqual(G.massCheck(500, 502), { diffPct: 0.4, ok: false });
  assert.equal(G.massCheck(500, NaN), null);
  assert.equal(G.validate('mass', 12), ''); assert.ok(G.validate('mass', -1)); assert.ok(G.validate('mass', NaN)); assert.ok(G.validate('nope', 1));
  assert.deepEqual(G.FM_RANGE, [2.3, 3.1]); assert.equal(G.FINES_LIMIT, 3);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tools/gradation.test.mjs` → FAIL, module missing.

- [ ] **Step 3: Write the module**

Create `site/study/aggregate-gradation/gradation.js`:

```js
// site/study/aggregate-gradation/gradation.js — 체가름 계산·C33 허용대 (순수 함수, DOM 무관)
// 근거: ASTM C136(계산·0.3 % 질량 대조), C125(FM·NMAS 정의), C33 §6·Table 3(허용대), C117(No. 200 통과분)
export const SIEVES = {
  fine: [{ label: '3/8 in', mm: 9.5 }, { label: 'No. 4', mm: 4.75 }, { label: 'No. 8', mm: 2.36 }, { label: 'No. 16', mm: 1.18 }, { label: 'No. 30', mm: 0.6 },
    { label: 'No. 50', mm: 0.3 }, { label: 'No. 100', mm: 0.15 }, { label: 'No. 200', mm: 0.075 }, { label: 'pan', mm: 0 }],
  coarse: [{ label: '2 in', mm: 50 }, { label: '1-1/2 in', mm: 37.5 }, { label: '1 in', mm: 25 }, { label: '3/4 in', mm: 19 }, { label: '1/2 in', mm: 12.5 },
    { label: '3/8 in', mm: 9.5 }, { label: 'No. 4', mm: 4.75 }, { label: 'No. 8', mm: 2.36 }, { label: 'No. 16', mm: 1.18 }, { label: 'pan', mm: 0 }],
};
// 예제 잔류 질량(g) — 본문에 "example numbers"로 밝힌다
export const DEFAULTS = { fine: [0, 12, 68, 110, 130, 105, 55, 14, 6], coarse: [0, 0, 300, 2400, 3900, 1900, 1300, 150, 0, 50] };
// FM 에 드는 표준 체(눈 크기 2:1)와 눈 크기 mm
export const FM_SIEVES = { '3 in': 75, '1-1/2 in': 37.5, '3/4 in': 19, '3/8 in': 9.5, 'No. 4': 4.75, 'No. 8': 2.36, 'No. 16': 1.18, 'No. 30': 0.6, 'No. 50': 0.3, 'No. 100': 0.15 };
// ASTM C33 §6.1 잔골재 통과율 허용대(%)
export const FINE_LIMITS = { '3/8 in': [100, 100], 'No. 4': [95, 100], 'No. 8': [80, 100], 'No. 16': [50, 85], 'No. 30': [25, 60], 'No. 50': [5, 30], 'No. 100': [0, 10] };
export const FINES_LIMIT = 3;            // No. 200 통과분 최대 %(마모에 노출되는 콘크리트; 그 밖은 5 %)
export const MAX_SINGLE_FRACTION = 45;   // 한 체를 통과하고 다음 체에 남는 양의 최대 %
export const FM_RANGE = [2.3, 3.1];
// ASTM C33 Table 3 굵은골재 크기번호별 통과율 허용대(%); 표에 없는 체는 제한 없음
export const COARSE_LIMITS = {
  '467': { '2 in': [100, 100], '1-1/2 in': [95, 100], '3/4 in': [35, 70], '3/8 in': [10, 30], 'No. 4': [0, 5] },
  '57': { '1-1/2 in': [100, 100], '1 in': [95, 100], '1/2 in': [25, 60], 'No. 4': [0, 10], 'No. 8': [0, 5] },
  '67': { '1 in': [100, 100], '3/4 in': [90, 100], '3/8 in': [20, 55], 'No. 4': [0, 10], 'No. 8': [0, 5] },
  '7': { '3/4 in': [100, 100], '1/2 in': [90, 100], '3/8 in': [40, 70], 'No. 4': [0, 15], 'No. 8': [0, 5] },
  '8': { '1/2 in': [100, 100], '3/8 in': [85, 100], 'No. 4': [10, 30], 'No. 8': [0, 10], 'No. 16': [0, 5] },
};

export const pct1 = v => Math.round(v * 10) / 10;

// retained: 체 순서와 같은 길이의 잔류 질량 배열(빈 칸은 0) → 잔류율·누적잔류율·통과율(소수 1자리)
export function analyze(retained, sieves) {
  const masses = sieves.map((s, i) => (Number.isFinite(retained[i]) && retained[i] > 0 ? retained[i] : 0));
  const total = masses.reduce((s, v) => s + v, 0);
  if (retained.length !== sieves.length || total <= 0) return { error: 'Enter the mass retained on at least one sieve.' };
  let cum = 0;
  const rows = sieves.map((s, i) => {
    cum += masses[i];
    return { label: s.label, mm: s.mm, retained: masses[i], pctRetained: pct1(masses[i] / total * 100), cumRetained: pct1(cum / total * 100), passing: pct1(100 - cum / total * 100) };
  });
  return { total, rows };
}

// FM = 표준 체의 누적잔류율 합 ÷ 100. 시험에 없는 체는: 가장 굵은 체보다 크면 0 %, 가장 가는 체보다 작으면 100 % 잔류로 센다
export function finenessModulus(rows) {
  const present = new Map(rows.filter(r => r.label !== 'pan').map(r => [r.label, r]));
  const mms = [...present.values()].map(r => r.mm);
  const coarsest = Math.max(...mms), finest = Math.min(...mms);
  let sum = 0;
  for (const [label, mm] of Object.entries(FM_SIEVES)) {
    if (present.has(label)) sum += present.get(label).cumRetained;
    else if (mm > coarsest) sum += 0;
    else if (mm < finest) sum += 100;
    else sum += interpolateCum(rows, mm); // 시험에 빠진 중간 체(드묾): 이웃 체 사이를 보간
  }
  return Math.round(sum) / 100;
}
function interpolateCum(rows, mm) {
  const r = rows.filter(x => x.label !== 'pan');
  for (let i = 1; i < r.length; i++) {
    if (r[i - 1].mm > mm && r[i].mm < mm) {
      const t = (Math.log(r[i - 1].mm) - Math.log(mm)) / (Math.log(r[i - 1].mm) - Math.log(r[i].mm));
      return r[i - 1].cumRetained + t * (r[i].cumRetained - r[i - 1].cumRetained);
    }
  }
  return 0;
}

// 체별 통과율을 허용대와 비교. limits 에 없는 체는 ok: null (제한 없음)
export function checkLimits(rows, limits) {
  const checks = rows.filter(r => r.label !== 'pan').map(r => {
    const lim = limits[r.label];
    return lim ? { label: r.label, passing: r.passing, min: lim[0], max: lim[1], ok: r.passing >= lim[0] && r.passing <= lim[1] }
      : { label: r.label, passing: r.passing, min: null, max: null, ok: null };
  });
  return { checks, allOk: checks.every(c => c.ok !== false) };
}

// 한 체를 통과해 다음 체에 남는 최대 비율(45 % 규칙). 맨 위 체와 팬은 제외
export function maxSingleFraction(rows) {
  const inner = rows.slice(1).filter(r => r.label !== 'pan');
  const best = inner.reduce((m, r) => (r.pctRetained > m.pctRetained ? r : m), inner[0]);
  return { label: best.label, pct: best.pctRetained, ok: best.pctRetained <= MAX_SINGLE_FRACTION };
}

// 실무 규칙: NMAS = 통과율 90 % 이상인 가장 작은 체, 최대치수 = 통과율 100 % 인 가장 작은 체
export function nominalMaxSize(rows) {
  const r = rows.filter(x => x.label !== 'pan');
  const nmas = [...r].reverse().find(x => x.passing >= 90);
  const maxSize = [...r].reverse().find(x => x.passing >= 99.95);
  return { nmas: nmas ? nmas.label : null, maxSize: maxSize ? maxSize.label : null };
}

// C136: 체가름 후 질량 합이 원시료 질량과 0.3 % 이내로 맞아야 한다
export function massCheck(total, sampleMass) {
  if (!Number.isFinite(sampleMass) || sampleMass <= 0) return null;
  const diffPct = pct1(Math.abs(sampleMass - total) / sampleMass * 100);
  return { diffPct, ok: diffPct <= 0.3 };
}

export const LIMITS = { mass: [0, 100000] };
export function validate(name, value) {
  const lim = LIMITS[name];
  if (!lim) return 'unknown field';
  if (!Number.isFinite(value)) return 'enter a number';
  if (value < lim[0] || value > lim[1]) return `use ${lim[0]} to ${lim[1].toLocaleString('en-US')}`;
  return '';
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tools/gradation.test.mjs` → 7 tests pass, pristine.

- [ ] **Step 5: Commit**

```bash
git add site/study/aggregate-gradation/gradation.js tools/gradation.test.mjs && git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 골재 입도 글 — 순수 계산 모듈(gradation.js: 체가름 계산·FM·C33 허용대·45 % 규칙·NMAS·질량 대조) + 테스트

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---
### Task 2: Photos (download, crop, recompress) + photo-budget guard entry

**Files:**
- Create: `site/study/aggregate-gradation/img/{sieve-stack,weighing,shaker,gravel}.jpg`
- Modify: `tools/site-guards.test.mjs` (per-folder photo test dictionary)
- Scratch: `D:\Codex\Temp\claude\D--Projects-Test\d64fe480-de3e-4585-8fe0-f5b32b07ce45\scratchpad\sieve-photos\` (originals; not committed)

**Interfaces:**
- Produces (exact pixel sizes for Task 3): sieve-stack 1200×800, weighing 1200×900, shaker 1200×900, gravel 1200×900.

- [ ] **Step 1: Download the four originals (Wikimedia Commons; user-authorized)** — one `curl` per Bash call from the scratch directory (`mkdir -p` first):

```bash
UA="ConstructionStudyLab/1.0 (https://cnstlab.org; study article photo fetch)"
curl -sSL -A "$UA" -o stack.src.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/Tamis_analyse_granulometrique.JPG"
curl -sSL -A "$UA" -o weighing.src.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/Sieve_Analysis.jpg"
curl -sSL -A "$UA" -o shaker.src.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/Vibrating_sieve.jpg"
curl -sSL -A "$UA" -o gravel.src.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/Varieties_of_Gravel_in_different_shapes_and_size._01.jpg"
```

Expected originals: stack 3.7 MB 3456×2304 (stacks of stainless test sieves on a lab floor); weighing 3.2 MB 3024×4032 (hands holding a brass sieve over a balance); shaker 207 KB 1277×1944 (a laboratory vibrating sieve machine); gravel 8.9 MB 3456×4608 (close-up of mixed sand and gravel). Open each with the Read tool and confirm. Stop with NEEDS_CONTEXT if a file is not a JPEG or shows something else.

- [ ] **Step 2: Crop / resize / recompress**

```bash
python - <<'EOF'
from PIL import Image, ImageOps
import os
SRC = "D:/Codex/Temp/claude/D--Projects-Test/d64fe480-de3e-4585-8fe0-f5b32b07ce45/scratchpad/sieve-photos"
OUT = "site/study/aggregate-gradation/img"; os.makedirs(OUT, exist_ok=True)
jobs = [('stack.src.jpg', 'sieve-stack.jpg', 1200, False), ('weighing.src.jpg', 'weighing.jpg', 1200, True),
        ('shaker.src.jpg', 'shaker.jpg', 1200, True), ('gravel.src.jpg', 'gravel.jpg', 1200, True)]
for src, name, maxw, crop in jobs:
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, src))).convert('RGB')
    if crop:  # 세로 사진을 4:3 으로 중앙 크롭
        w, h = im.size; th = round(w * 3 / 4); top = (h - th) // 2; im = im.crop((0, top, w, top + th))
    if im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    q = 82
    while True:
        p = os.path.join(OUT, name); im.save(p, 'JPEG', quality=q, optimize=True, progressive=True)
        if os.path.getsize(p) <= 220 * 1024 or q <= 60: break
        q -= 4
    print(f"{name}: {im.size} q{q} {os.path.getsize(p) // 1024} KB")
EOF
```

Expected: sieve-stack (1200, 800); weighing (1200, 900); shaker (1200, 900); gravel (1200, 900); each ≤ 220 KB. Open all four outputs with the Read tool. The weighing crop must keep the sieve in the hands and the balance; if the centre crop loses the balance, shift the window down (`top = (h - th) // 2 + 300`) and say so. The gravel photo is highly detailed — if q drops below 66 to reach the budget, that is acceptable; report the final q.

- [ ] **Step 3: Extend the per-folder photo guard**

In `tools/site-guards.test.mjs`, the per-folder test's dictionary becomes `{ 'study/slump-test/img': 7, 'study/soil-compaction/img': 6, 'study/concrete-cylinders/img': 7, 'study/aggregate-gradation/img': 4 }` and the test name becomes `'Study 글 사진 폴더(slump 7 · soil 6 · cylinders 7 · gradation 4)의 모든 파일이 .jpg 이고 각 220 KB 이하다'`. Nothing else changes.

- [ ] **Step 4: Run the guards** — `node --test tools/site-guards.test.mjs` → all pass.

- [ ] **Step 5: Commit**

```bash
git add site/study/aggregate-gradation/img tools/site-guards.test.mjs && git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 골재 입도 글 — Commons 사진 4장(≤1200 px·4:3 크롭 3장·EXIF 제거·≤220 KB), 사진 예산 가드에 폴더 추가

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---
### Task 3: The article page, calculator UI and styles

**Files:**
- Create: `site/study/aggregate-gradation/index.html` (block A + block B, concatenated, marker comments removed)
- Create: `site/study/aggregate-gradation/calc.js`
- Modify: `site/study/article.css` (one rule appended after `.calc-plots { display:grid; gap:8px; }`)
- Modify: `tools/site-guards.test.mjs` (tokens-only list + `ARTICLE_PAGES`)

**Interfaces:**
- Consumes: `gradation.js` exports (Task 1); photo sizes (Task 2); `../mix-design/img/graded-aggregate.jpg` (existing, 1200×628 — check with the guard's SOF reader; if its real size differs, use the real size).
- Produces DOM contract for `calc.js`: form `#calc`; selects `mode` (`fine` | `coarse`) and `sizeNo` (467/57/67/7/8, wrapper `#size-field`); input `sampleMass`; sieve rows built by `calc.js` inside `tbody#sieve-rows` (inputs named `m0…m9`, cells `#pr-i`, `#cr-i`, `#pp-i`, `#ok-i`); outputs `#out-total`, `#out-fm`, `#out-nmas`, `#out-limits`, `#out-verdict`, `#out-notes`, `#calc-errors`; SVG `#calc-plot`.

- [ ] **Step 1: Write the page (block A, then block B)**

Extract the two fenced `html` blocks marked `<!-- BLOCK A -->` / `<!-- BLOCK B -->` from the brief with a script (as for the previous articles), remove the marker lines, write `site/study/aggregate-gradation/index.html`, confirm it starts with `<!doctype html>` and ends with `</html>`.

Block A:

```html
<!-- BLOCK A -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sieve analysis and the fineness modulus — Construction Study Lab</title>
<meta name="description" content="How aggregate grading is measured by sieve analysis (ASTM C136), turned into percent passing, the fineness modulus and the nominal maximum size, and checked against the ASTM C33 grading bands — with a calculator that plots your sieve results.">
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
  <p class="eyebrow">Materials · Aggregates</p>
  <h1>Sieve analysis</h1>
  <p class="lede">A stack of sieves, a balance, and twenty minutes of shaking tell you how an aggregate is graded — the number that sets how much paste a concrete needs. Here is the test, the arithmetic behind the fineness modulus, and the ASTM C33 bands, with a calculator that plots your own results.</p>
  <p class="byline">Jisoo Park · September 2026 · 11 min read</p>
</div></section>

<main class="article-layout">
<nav class="toc" aria-label="Contents">
  <h2>Contents</h2>
  <ol>
    <li><a href="#why">1. Why grading matters</a></li>
    <li><a href="#terms">2. Sieves, percent passing, FM</a></li>
    <li><a href="#test">3. The test</a></li>
    <li><a href="#arithmetic">4. The arithmetic</a></li>
    <li><a href="#curve">5. Reading the curve</a></li>
    <li><a href="#c33">6. What ASTM C33 requires</a></li>
    <li><a href="#calculator">7. Try it: the calculator</a></li>
    <li><a href="#mistakes">8. Common mistakes</a></li>
    <li><a href="#takeaways">9. Key takeaways</a></li>
  </ol>
</nav>

<article class="article">

<h2 id="why"><span class="num">1</span>Why grading matters</h2>
<figure>
  <img src="img/sieve-stack.jpg" width="1200" height="800" alt="Stacks of stainless-steel test sieves of many sizes standing on a laboratory floor" loading="eager">
  <figcaption>Nests of standard sieves waiting for the next sample. Photo: Habib M'henni, Wikimedia Commons, CC BY-SA 3.0.</figcaption>
</figure>
<p>Aggregate is two-thirds to three-quarters of a concrete by volume, and it is the cheap part. The paste — cement and water — is the expensive part, and it has to fill every void between the aggregate particles and coat every surface. How much paste that takes depends on how the particle sizes are distributed: a <em>well-graded</em> aggregate, with a range of sizes that pack into one another, leaves few voids; a <em>uniformly graded</em> one, with all particles about the same size, leaves many; a <em>gap-graded</em> one, missing a size range, packs poorly and tends to segregate. Grading therefore sets the water and cement a mix needs, how it flows and finishes, and whether it stays together on the way from the chute to the form.</p>
<p>That is why the mix design in <a href="../mix-design/">Part 1</a> asks for two numbers before anything else can be chosen: the <em>nominal maximum size</em> of the coarse aggregate, which sets the water and air content, and the <em>fineness modulus</em> of the sand, which sets the volume of coarse aggregate. Both come from one test, the sieve analysis, and this article is about running it and reading it.</p>
<figure class="fig-small">
  <img src="../mix-design/img/graded-aggregate.jpg" width="350" height="200" alt="Two samples of aggregate side by side, one well graded with a range of particle sizes and one poorly graded" loading="lazy">
  <figcaption>Well-graded and poorly graded aggregate. The well-graded sample packs tighter and needs less paste.</figcaption>
</figure>
<div class="callout callout-key"><span class="label">Key idea</span>
  <p>Grading does not change the strength of the stone; it changes how much paste the concrete needs to be workable, and paste is where the cost, the shrinkage and the heat are.</p>
</div>

<h2 id="terms"><span class="num">2</span>Sieves, percent passing, and the fineness modulus</h2>
<p>A sieve analysis shakes a dried sample through a nest of sieves with square openings, largest on top, and weighs what stays on each one. The standard sieves are named by opening (3 in., 1 1/2 in., 3/4 in., 3/8 in.) down to about 5 mm, and by mesh number below that: No. 4 (4.75 mm), No. 8 (2.36 mm), No. 16 (1.18 mm), No. 30 (0.600 mm), No. 50 (0.300 mm), No. 100 (0.150 mm), No. 200 (0.075 mm). The ones used for the fineness modulus double in opening from one to the next.</p>
<figure>
<svg class="fig-svg" viewBox="0 0 720 330" role="img" aria-labelledby="fig1-title">
  <title id="fig1-title">A nest of standard sieves for fine aggregate, largest opening on top</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="12" fill="var(--muted)">
    <rect x="200" y="20" width="200" height="28" rx="3" fill="var(--icy)" stroke="var(--dark)" stroke-width="1.5"/><text x="300" y="39" text-anchor="middle" fill="var(--dark)">3/8 in. · 9.5 mm</text>
    <rect x="200" y="54" width="200" height="28" rx="3" fill="var(--icy)" stroke="var(--dark)" stroke-width="1.5"/><text x="300" y="73" text-anchor="middle" fill="var(--dark)">No. 4 · 4.75 mm</text>
    <rect x="200" y="88" width="200" height="28" rx="3" fill="var(--icy)" stroke="var(--dark)" stroke-width="1.5"/><text x="300" y="107" text-anchor="middle" fill="var(--dark)">No. 8 · 2.36 mm</text>
    <rect x="200" y="122" width="200" height="28" rx="3" fill="var(--icy)" stroke="var(--dark)" stroke-width="1.5"/><text x="300" y="141" text-anchor="middle" fill="var(--dark)">No. 16 · 1.18 mm</text>
    <rect x="200" y="156" width="200" height="28" rx="3" fill="var(--icy)" stroke="var(--dark)" stroke-width="1.5"/><text x="300" y="175" text-anchor="middle" fill="var(--dark)">No. 30 · 0.600 mm</text>
    <rect x="200" y="190" width="200" height="28" rx="3" fill="var(--icy)" stroke="var(--dark)" stroke-width="1.5"/><text x="300" y="209" text-anchor="middle" fill="var(--dark)">No. 50 · 0.300 mm</text>
    <rect x="200" y="224" width="200" height="28" rx="3" fill="var(--icy)" stroke="var(--dark)" stroke-width="1.5"/><text x="300" y="243" text-anchor="middle" fill="var(--dark)">No. 100 · 0.150 mm</text>
    <rect x="200" y="258" width="200" height="28" rx="3" fill="var(--bg)" stroke="var(--dark)" stroke-width="1.5"/><text x="300" y="277" text-anchor="middle" fill="var(--dark)">No. 200 · 0.075 mm</text>
    <rect x="200" y="292" width="200" height="28" rx="3" fill="var(--border)" stroke="var(--dark)" stroke-width="1.5"/><text x="300" y="311" text-anchor="middle" fill="var(--dark)">pan</text>
    <path d="M420 34 L470 34 L470 257 L420 257" fill="none" stroke="var(--royal)" stroke-width="1.5"/>
    <text x="480" y="130" fill="var(--royal)">the seven FM sieves:</text>
    <text x="480" y="148" fill="var(--royal)">each opening is twice</text>
    <text x="480" y="166" fill="var(--royal)">the one below it</text>
    <text x="180" y="277" text-anchor="end" fill="var(--muted)">not in the FM</text>
    <text x="180" y="311" text-anchor="end" fill="var(--muted)">not in the FM</text>
    <path d="M300 4 L294 12 L306 12 Z" fill="var(--dark)"/><text x="316" y="12" fill="var(--muted)" font-size="11">sample goes in here</text>
  </g>
</svg>
<figcaption>Figure 1. The nest for a fine aggregate. The No. 200 sieve and the pan are weighed like the others but do not enter the fineness modulus.</figcaption>
</figure>
<div class="callout callout-def"><span class="label">Definitions</span>
  <p><strong>Percent retained</strong> on a sieve is the mass it holds divided by the whole sample. <strong>Cumulative percent retained</strong> is the running total from the top sieve down. <strong>Percent passing</strong> is 100 minus the cumulative retained — the fraction finer than that sieve, and the number the grading bands are written in.</p>
  <p><strong>Fineness modulus (FM)</strong> is the sum of the cumulative percentages retained on the standard sieves — 3 in., 1 1/2 in., 3/4 in., 3/8 in., No. 4, 8, 16, 30, 50 and 100 — divided by 100. For a sand only the last seven contribute. A higher FM means a coarser sand.</p>
  <p><strong>Nominal maximum size (NMAS)</strong> is the smallest sieve opening through which the specification allows the whole aggregate to pass, a small amount retained being permitted; the <strong>maximum size</strong> is the smallest opening through which all of it must pass. In practice the NMAS of a sample is read as the smallest sieve retaining no more than 10 %.</p>
</div>

<h2 id="test"><span class="num">3</span>The test (ASTM C136)</h2>
<div class="fig-grid">
  <figure><img src="img/weighing.jpg" width="1200" height="900" alt="Hands lifting a brass test sieve over a laboratory balance to weigh the material retained on it" loading="lazy"><figcaption>Weighing what stayed on a sieve. Photo: Soccer jim2002, Wikimedia Commons, CC BY-SA 4.0.</figcaption></figure>
  <figure><img src="img/shaker.jpg" width="1200" height="900" alt="A laboratory vibrating sieve shaker with a sieve mounted on top" loading="lazy"><figcaption>A mechanical shaker does the shaking; the standard still defines when it is enough. Photo: Cjp24, Wikimedia Commons, CC BY-SA 3.0.</figcaption></figure>
</div>
<ol class="steps">
  <li><strong>Get a fair sample and dry it.</strong> Reduce the field sample by splitting or quartering (ASTM C702) and dry it to constant mass at 110 ± 5 °C. The test sample must be big enough for the sizes in it: at least 300 g for a sand, and for a coarse aggregate about 1 kg for 3/8 in. nominal maximum size, 2 kg for 1/2 in., 5 kg for 3/4 in., 10 kg for 1 in., 15 kg for 1 1/2 in., 20 kg for 2 in.</li>
  <li><strong>Nest the sieves and shake.</strong> Largest opening on top, pan on the bottom, lid on. Shake by hand or in a machine until the sieving is <em>adequate</em>: when not more than 1 % by mass of what is on any sieve passes it during one more minute of hand sieving. Do not overload: a sieve finer than No. 4 should carry no more than about 7 kg per square metre of screen, roughly 200 g on an 8 in. sieve, so split a large sample into more than one run.</li>
  <li><strong>Weigh every fraction.</strong> The mass on each sieve and in the pan, to 0.1 % of the sample mass. Brush the sieves out; what clings to the mesh belongs to that sieve.</li>
  <li><strong>Check the total.</strong> The fractions must add up to the original dried mass within 0.3 %. If they do not, something was lost or a sieve was not emptied, and the run is not acceptable — start again.</li>
</ol>
<p class="ref-note">Dry sieving under-reads the dust: fines cling to the larger particles. When the amount finer than No. 200 matters — and for concrete sand it does — the sample is first washed over a No. 200 sieve (ASTM C117) and the washed-out mass is added to the pan.</p>
<div class="callout callout-warn"><span class="label">Watch out</span>
  <p>Ten seconds on the shaker is not a test. The 1 %-in-one-minute rule is what makes one laboratory's percent passing comparable with another's; an under-shaken sample reads coarser than it is, and its fineness modulus comes out high.</p>
</div>
```
Block B:

```html
<!-- BLOCK B -->
<h2 id="arithmetic"><span class="num">4</span>The arithmetic</h2>
<p>Here is a 500 g sand, sieved and weighed. The example numbers are made up but typical. Each row's percent retained is its mass over the total; the cumulative column adds them from the top; percent passing is 100 minus the cumulative. Report the passing values to the nearest 1 % (the No. 200 fraction to 0.1 %).</p>
<div class="table-wrap">
<table class="ref-table" id="tbl-example">
  <caption>Table 1. Sieve analysis of a 500 g fine aggregate (example numbers)</caption>
  <thead><tr><th scope="col">Sieve</th><th scope="col">Retained, g</th><th scope="col">Retained, %</th><th scope="col">Cumulative retained, %</th><th scope="col">Passing, %</th></tr></thead>
  <tbody>
    <tr><td>3/8 in.</td><td>0</td><td>0.0</td><td>0.0</td><td>100</td></tr>
    <tr><td>No. 4</td><td>12</td><td>2.4</td><td>2.4</td><td>98</td></tr>
    <tr><td>No. 8</td><td>68</td><td>13.6</td><td>16.0</td><td>84</td></tr>
    <tr><td>No. 16</td><td>110</td><td>22.0</td><td>38.0</td><td>62</td></tr>
    <tr><td>No. 30</td><td>130</td><td>26.0</td><td>64.0</td><td>36</td></tr>
    <tr><td>No. 50</td><td>105</td><td>21.0</td><td>85.0</td><td>15</td></tr>
    <tr><td>No. 100</td><td>55</td><td>11.0</td><td>96.0</td><td>4</td></tr>
    <tr><td>No. 200</td><td>14</td><td>2.8</td><td>98.8</td><td>1.2</td></tr>
    <tr><td>pan</td><td>6</td><td>1.2</td><td>100.0</td><td>0</td></tr>
  </tbody>
</table>
</div>
<p>The fineness modulus adds the cumulative percentages retained on the seven FM sieves — 0 + 2.4 + 16.0 + 38.0 + 64.0 + 85.0 + 96.0 = 301.4 — and divides by 100:</p>
<div class="eq">FM = Σ (cumulative % retained on 3/8 in., No. 4, 8, 16, 30, 50, 100) / 100 = 301.4 / 100 = 3.01</div>
<figure>
<svg class="fig-svg" viewBox="0 0 720 260" role="img" aria-labelledby="fig2-title">
  <title id="fig2-title">The fineness modulus as the sum of cumulative percent retained bars</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="12" fill="var(--muted)">
    <line x1="70" y1="210" x2="700" y2="210" stroke="var(--dark)" stroke-width="1.5"/>
    <line x1="70" y1="20" x2="70" y2="210" stroke="var(--dark)" stroke-width="1.5"/>
    <text x="40" y="214" text-anchor="end">0</text><text x="40" y="119" text-anchor="end">50</text><text x="40" y="24" text-anchor="end">100</text>
    <line x1="70" y1="115" x2="700" y2="115" stroke="var(--border)" stroke-width="1"/>
    <rect x="100" y="210" width="60" height="0" fill="var(--royal)"/><text x="130" y="232" text-anchor="middle">3/8 in.</text><text x="130" y="204" text-anchor="middle" fill="var(--dark)">0</text>
    <rect x="185" y="205.4" width="60" height="4.6" fill="var(--royal)"/><text x="215" y="232" text-anchor="middle">No. 4</text><text x="215" y="199" text-anchor="middle" fill="var(--dark)">2.4</text>
    <rect x="270" y="179.6" width="60" height="30.4" fill="var(--royal)"/><text x="300" y="232" text-anchor="middle">No. 8</text><text x="300" y="173" text-anchor="middle" fill="var(--dark)">16.0</text>
    <rect x="355" y="137.8" width="60" height="72.2" fill="var(--royal)"/><text x="385" y="232" text-anchor="middle">No. 16</text><text x="385" y="131" text-anchor="middle" fill="var(--dark)">38.0</text>
    <rect x="440" y="88.4" width="60" height="121.6" fill="var(--royal)"/><text x="470" y="232" text-anchor="middle">No. 30</text><text x="470" y="82" text-anchor="middle" fill="var(--dark)">64.0</text>
    <rect x="525" y="48.5" width="60" height="161.5" fill="var(--royal)"/><text x="555" y="232" text-anchor="middle">No. 50</text><text x="555" y="42" text-anchor="middle" fill="var(--dark)">85.0</text>
    <rect x="610" y="27.6" width="60" height="182.4" fill="var(--royal)"/><text x="640" y="232" text-anchor="middle">No. 100</text><text x="640" y="21" text-anchor="middle" fill="var(--dark)">96.0</text>
    <text x="385" y="254" text-anchor="middle" fill="var(--dark)">cumulative % retained on the seven FM sieves · sum 301.4 → FM 3.01</text>
  </g>
</svg>
<figcaption>Figure 2. The fineness modulus is the total height of these bars divided by 100. A coarser sand fills the bars sooner and its FM is higher.</figcaption>
</figure>
<p>An FM of 3.01 is a coarse sand — near the top of the range C33 allows. In Part 1's Step 6 table a higher FM means less coarse aggregate per cubic yard, because a coarse sand already does some of the coarse aggregate's work.</p>

<h2 id="curve"><span class="num">5</span>Reading the grading curve</h2>
<p>Percent passing plotted against sieve opening is the grading curve. Openings are plotted on a logarithmic scale because the sieves double in size from one to the next, which turns the standard series into evenly spaced marks.</p>
<figure>
<svg class="fig-svg" viewBox="0 0 720 340" role="img" aria-labelledby="fig3-title">
  <title id="fig3-title">Three grading curves on the ASTM C33 fine-aggregate band: well graded, gap graded, uniformly graded</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="11" fill="var(--muted)">
    <polygon points="92,20 176,20 260,20 344,60.5 428,128 512,209 596,263 596,290 512,276.5 428,222.5 344,155 260,74 176,33.5 92,20" fill="var(--icy)" stroke="var(--border)" stroke-width="1"/>
    <line x1="80" y1="290" x2="680" y2="290" stroke="var(--dark)" stroke-width="1.5"/>
    <line x1="80" y1="20" x2="80" y2="290" stroke="var(--dark)" stroke-width="1.5"/>
    <text x="70" y="294" text-anchor="end">0</text><text x="70" y="159" text-anchor="end">50</text><text x="70" y="24" text-anchor="end">100</text>
    <line x1="80" y1="155" x2="680" y2="155" stroke="var(--border)" stroke-width="1"/>
    <text x="596" y="312" text-anchor="middle">No. 100</text><text x="512" y="312" text-anchor="middle">No. 50</text><text x="428" y="312" text-anchor="middle">No. 30</text><text x="344" y="312" text-anchor="middle">No. 16</text><text x="260" y="312" text-anchor="middle">No. 8</text><text x="176" y="312" text-anchor="middle">No. 4</text><text x="92" y="312" text-anchor="middle">3/8 in.</text>
    <text x="380" y="332" text-anchor="middle" fill="var(--dark)">sieve opening (log scale, coarse on the left)</text>
    <text x="24" y="155" transform="rotate(-90 24 155)" text-anchor="middle" fill="var(--dark)">% passing</text>
    <polyline points="92,20 176,26 260,63 344,123 428,193 512,250 596,279" fill="none" stroke="var(--royal)" stroke-width="3"/>
    <polyline points="92,20 176,22 260,38 344,44 428,50 512,222 596,279" fill="none" stroke="var(--amber)" stroke-width="2.5" stroke-dasharray="7 4"/>
    <polyline points="92,20 176,20 260,25 344,36 428,239 512,282 596,288" fill="none" stroke="var(--dark)" stroke-width="2" stroke-dasharray="3 3"/>
    <text x="640" y="60" fill="var(--royal)" font-weight="600">well graded</text>
    <text x="640" y="80" fill="var(--amber)" font-weight="600">gap graded</text>
    <text x="640" y="100" fill="var(--dark)" font-weight="600">uniform</text>
    <text x="300" y="98" fill="var(--muted)">C33 fine-aggregate band</text>
  </g>
</svg>
<figcaption>Figure 3. Three sands on the ASTM C33 band. The well-graded curve runs smoothly through the band; the gap-graded one is missing the No. 16 to No. 30 sizes and drops in a step; the uniform one is nearly all one size.</figcaption>
</figure>
<p>A smooth S-shaped curve inside the band is what you want. A flat stretch followed by a steep drop means a size range is missing — the classic gap-graded sand that bleeds and segregates. A curve that is nearly vertical means one size — a uniform sand that is harsh to finish and needs a lot of paste. Two aggregates with the same fineness modulus can have quite different curves, which is why the specification limits both the FM and every sieve.</p>
<div class="callout callout-key"><span class="label">Key idea</span>
  <p>The FM is one number; the curve is the whole story. Check both, because a gap-graded and a well-graded sand can share an FM and behave nothing alike.</p>
</div>

<h2 id="c33"><span class="num">6</span>What ASTM C33 requires</h2>
<p>ASTM C33 is the specification most US concrete aggregate is bought against. For fine aggregate it sets a band of percent passing on each sieve, a cap on dust, a rule against lumps of one size, and a range for the fineness modulus.</p>
<div class="table-wrap">
<table class="ref-table" id="tbl-fine">
  <caption>Table 2. ASTM C33 grading limits for fine aggregate, percent passing</caption>
  <thead><tr><th scope="col">Sieve</th><th scope="col">3/8 in.</th><th scope="col">No. 4</th><th scope="col">No. 8</th><th scope="col">No. 16</th><th scope="col">No. 30</th><th scope="col">No. 50</th><th scope="col">No. 100</th></tr></thead>
  <tbody><tr><td>Passing, %</td><td>100</td><td>95–100</td><td>80–100</td><td>50–85</td><td>25–60</td><td>5–30</td><td>0–10</td></tr></tbody>
</table>
</div>
<ul>
  <li><strong>Dust.</strong> Material finer than No. 200 (by washing, ASTM C117) at most 3 % for concrete subject to abrasion and 5 % for other concrete; manufactured sands are allowed a little more.</li>
  <li><strong>No lumps of one size.</strong> Not more than 45 % of the sand may pass one sieve and be retained on the next.</li>
  <li><strong>Fineness modulus</strong> between 2.3 and 3.1, and once a mix is designed around a sand, later shipments may not drift more than 0.20 from that base FM — the mix would have to be re-proportioned.</li>
</ul>
<p>Coarse aggregate is specified by <em>size number</em>, each a band of its own. The common ones for structural concrete are these; sieves not listed for a size carry no limit.</p>
<div class="table-wrap">
<table class="ref-table" id="tbl-coarse">
  <caption>Table 3. ASTM C33 grading limits for common coarse-aggregate sizes, percent passing</caption>
  <thead><tr><th scope="col">Size</th><th scope="col">2 in.</th><th scope="col">1 1/2 in.</th><th scope="col">1 in.</th><th scope="col">3/4 in.</th><th scope="col">1/2 in.</th><th scope="col">3/8 in.</th><th scope="col">No. 4</th><th scope="col">No. 8</th><th scope="col">No. 16</th></tr></thead>
  <tbody>
    <tr><td>467 (1 1/2 in. to No. 4)</td><td>100</td><td>95–100</td><td>—</td><td>35–70</td><td>—</td><td>10–30</td><td>0–5</td><td>—</td><td>—</td></tr>
    <tr><td>57 (1 in. to No. 4)</td><td>—</td><td>100</td><td>95–100</td><td>—</td><td>25–60</td><td>—</td><td>0–10</td><td>0–5</td><td>—</td></tr>
    <tr><td>67 (3/4 in. to No. 4)</td><td>—</td><td>—</td><td>100</td><td>90–100</td><td>—</td><td>20–55</td><td>0–10</td><td>0–5</td><td>—</td></tr>
    <tr><td>7 (1/2 in. to No. 4)</td><td>—</td><td>—</td><td>—</td><td>100</td><td>90–100</td><td>40–70</td><td>0–15</td><td>0–5</td><td>—</td></tr>
    <tr><td>8 (3/8 in. to No. 8)</td><td>—</td><td>—</td><td>—</td><td>—</td><td>100</td><td>85–100</td><td>10–30</td><td>0–10</td><td>0–5</td></tr>
  </tbody>
</table>
</div>
<p class="ref-note">The size number's first sieve — 1 in. for No. 57 — is the nominal maximum size the mix design uses; the sieve that must pass 100 % is the maximum size. Coarse aggregate dust is capped at 1 % (1.5 % for crushed-stone dust of fracture).</p>

<h2 id="calculator"><span class="num">7</span>Try it: from sieve masses to the C33 band</h2>
<p>The numbers below are example numbers. Enter the mass retained on each sieve and the calculator computes the percentages, the fineness modulus, the nominal maximum size, checks every sieve against the ASTM C33 band you choose, and plots the curve on that band. Enter the dried mass you started with and it also checks the 0.3 % rule.</p>
<form id="calc" class="calc" novalidate>
  <div class="calc-grid">
    <div class="num-field"><label for="mode">Aggregate</label><div class="wrap"><select id="mode" name="mode"><option value="fine" selected>Fine aggregate (sand)</option><option value="coarse">Coarse aggregate</option></select></div><p class="hint">Switching loads that mode's example numbers.</p></div>
    <div class="num-field" id="size-field" hidden><label for="sizeNo">C33 size number</label><div class="wrap"><select id="sizeNo" name="sizeNo"><option value="467">467 — 1 1/2 in. to No. 4</option><option value="57" selected>57 — 1 in. to No. 4</option><option value="67">67 — 3/4 in. to No. 4</option><option value="7">7 — 1/2 in. to No. 4</option><option value="8">8 — 3/8 in. to No. 8</option></select></div></div>
    <div class="num-field"><label for="sampleMass">Dried sample mass before sieving</label><div class="wrap"><input id="sampleMass" name="sampleMass" type="number" step="0.1" value=""><span class="unit">g</span></div><p class="hint">Optional — checks the 0.3 % mass rule.</p></div>
  </div>
  <fieldset class="calc-points">
    <legend>Mass retained on each sieve, g</legend>
    <div class="calc-tests">
    <table class="calc-table calc-sieve">
      <thead><tr><th scope="col">Sieve</th><th scope="col">Opening, mm</th><th scope="col">Retained, g</th><th scope="col">Retained, %</th><th scope="col">Cumulative, %</th><th scope="col">Passing, %</th><th scope="col">C33</th></tr></thead>
      <tbody id="sieve-rows"></tbody>
    </table>
    </div>
  </fieldset>
  <p class="calc-error" id="calc-errors" aria-live="polite"></p>
</form>
<div class="calc-result" aria-live="polite">
  <dl class="calc-summary">
    <div><dt>Total sieved</dt><dd id="out-total">—</dd></div>
    <div><dt id="lbl-fm">Fineness modulus</dt><dd id="out-fm">—</dd></div>
    <div><dt>Nominal max. size</dt><dd id="out-nmas">—</dd></div>
    <div><dt>Verdict</dt><dd id="out-verdict">—</dd></div>
  </dl>
  <p id="out-limits" class="calc-notes"></p>
  <p id="out-notes" class="calc-notes"></p>
</div>
<figure class="calc-plot-wrap">
  <svg id="calc-plot" class="fig-svg calc-svg" viewBox="0 0 720 360" role="img" aria-label="Grading curve on the ASTM C33 band"></svg>
  <figcaption>Figure 4. Your sieve results on the ASTM C33 band: percent passing against sieve opening on a log scale. Points outside the band turn amber.</figcaption>
</figure>
<noscript><p class="ref-note">The calculator needs JavaScript. With the example numbers the 500 g sand gives 98, 84, 62, 36, 15 and 4 % passing the No. 4 to No. 100 sieves, a fineness modulus of 3.01, and meets every C33 fine-aggregate limit; the 10 kg coarse example meets the Size 57 limits with a nominal maximum size of 1 in.</p></noscript>
<p class="ref-note">Percentages are shown to 0.1 % in the table so the arithmetic can be followed; a report would round percent passing to 1 %. The fineness modulus of a coarse aggregate is computed the same way, counting the sieves finer than the finest one used as fully retained.</p>

<h2 id="mistakes"><span class="num">8</span>Common mistakes</h2>
<ul>
  <li><strong>Not shaking long enough.</strong> The sample reads coarser than it is. Apply the 1 %-in-one-minute check on at least one sieve before you believe a result.</li>
  <li><strong>Overloading the fine sieves.</strong> Particles cannot reach the openings through a thick bed; split the sample instead.</li>
  <li><strong>Losing mass and carrying on.</strong> If the fractions do not add to the start mass within 0.3 %, the run is void. Brush the sieves; wear a dust mask, not a fan.</li>
  <li><strong>Including the pan or the No. 200 in the FM.</strong> Only the seven standard sieves count for a sand. Adding the No. 200 line inflates the FM.</li>
  <li><strong>Judging a sand by its FM alone.</strong> The band and the 45 % rule catch gap grading that the FM hides.</li>
  <li><strong>Dry-sieving for the dust content.</strong> Fines cling to the coarse particles; wash over the No. 200 first (ASTM C117) when the dust limit matters.</li>
  <li><strong>Reading the maximum size as the nominal maximum size.</strong> For a No. 57 stone the sieve that passes 100 % is 1 1/2 in.; the mix design wants 1 in.</li>
</ul>

<h2 id="takeaways"><span class="num">9</span>Key takeaways</h2>
<ol>
  <li>Grading sets the <strong>paste demand</strong>, workability and cohesion of a concrete; the sieve analysis is how it is measured.</li>
  <li>Percent passing is 100 minus the cumulative percent retained; the <strong>fineness modulus</strong> is the sum of the cumulative percent retained on the seven (or ten) standard sieves divided by 100.</li>
  <li>A valid run needs a big enough dried sample, <strong>adequate shaking</strong> (≤ 1 % in one more minute), unloaded sieves, and fractions that add up within <strong>0.3 %</strong>.</li>
  <li>ASTM C33 limits every sieve, the dust (3 or 5 %), lumps of one size (45 %), and the FM (<strong>2.3 to 3.1</strong>, ± 0.20 from the base); coarse aggregate is bought by size number, whose first sieve is the nominal maximum size.</li>
</ol>

<p class="ref-note">Sources: ASTM C136/C136M (sieve analysis), C117 (material finer than No. 200 by washing), C125 (terminology: fineness modulus, nominal maximum size), C702 (sample reduction), C33/C33M (grading requirements). Precision is stated qualitatively.</p>
<p class="ref-note">Photo credits: <a href="https://commons.wikimedia.org/wiki/File:Tamis_analyse_granulometrique.JPG">Tamis analyse granulométrique</a> by Habib M'henni, <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>; <a href="https://commons.wikimedia.org/wiki/File:Sieve_Analysis.jpg">Sieve Analysis</a> by Soccer jim2002, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>; <a href="https://commons.wikimedia.org/wiki/File:Vibrating_sieve.jpg">Vibrating sieve</a> by Cjp24, <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>; <a href="https://commons.wikimedia.org/wiki/File:Varieties_of_Gravel_in_different_shapes_and_size._01.jpg">Varieties of Gravel</a> by Sabina Bajracharya, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>; all via Wikimedia Commons. The photos were resized, cropped and recompressed for the web.</p>

<nav class="article-nav" aria-label="Series">
  <a class="prev" href="../mix-design/example/"><span class="dir">← Related</span><span class="ttl">Worked example: a 3,000 psi beam</span></a>
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

- [ ] **Step 2: Write `calc.js` (builds the sieve table, reads it, draws the semi-log plot; all math from `gradation.js`)**

Create `site/study/aggregate-gradation/calc.js`:

```js
// site/study/aggregate-gradation/calc.js — 체가름 계산기 화면 (ES module): 체 표 생성 → gradation.js 계산 → 표·요약·반대수 플롯
import { SIEVES, DEFAULTS, FINE_LIMITS, COARSE_LIMITS, FINES_LIMIT, FM_RANGE, MAX_SINGLE_FRACTION, analyze, finenessModulus, checkLimits, maxSingleFraction, nominalMaxSize, massCheck, validate } from './gradation.js';

const $ = id => document.getElementById(id);
const form = $('calc');
if (form) {
  const SVG = 'http://www.w3.org/2000/svg';
  const fmt1 = v => Number.isFinite(v) ? v.toFixed(1) : '—';
  const fmtG = v => Number.isFinite(v) ? Math.round(v).toLocaleString('en-US') : '—';
  let mode = form.elements.mode.value;

  function el(tag, attrs, text) {
    const n = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text != null) n.textContent = text;
    return n;
  }
  function measure(node) { try { const b = node.getBBox(); if (b && b.width > 0) return b; } catch (e) { /* 렌더 전 */ } return null; }
  function addHalo(g, label) { const b = measure(label); if (b) g.insertBefore(el('rect', { x: b.x - 3, y: b.y - 2, width: b.width + 6, height: b.height + 4, fill: 'var(--surface)' }), label); }

  // 모드에 맞는 체 행을 만든다 (입력 이름 m0…, 출력 셀 pr-/cr-/pp-/ok-)
  function buildRows() {
    const tbody = $('sieve-rows');
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
    SIEVES[mode].forEach((s, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<th scope="row">${s.label}</th><td>${s.mm ? s.mm : '—'}</td>` +
        `<td><input type="number" step="0.1" min="0" name="m${i}" value="${DEFAULTS[mode][i] || ''}" aria-label="${s.label} mass retained, grams"></td>` +
        `<td class="out" id="pr-${i}">—</td><td class="out" id="cr-${i}">—</td><td class="out" id="pp-${i}">—</td><td class="out" id="ok-${i}">—</td>`;
      tbody.appendChild(tr);
    });
  }

  function readInputs() {
    const errors = [], retained = [];
    SIEVES[mode].forEach((s, i) => {
      const raw = form.elements['m' + i].value;
      if (raw === '') { retained.push(0); return; }
      const v = parseFloat(raw), e = validate('mass', v);
      if (e) errors.push(`${s.label}: ${e}.`);
      retained.push(e ? 0 : v);
    });
    const smRaw = form.elements.sampleMass.value;
    let sampleMass = NaN;
    if (smRaw !== '') { sampleMass = parseFloat(smRaw); const e = validate('mass', sampleMass); if (e) errors.push(`Sample mass: ${e}.`); }
    return { retained, sampleMass, sizeNo: form.elements.sizeNo.value, errors };
  }

  function clearSvg(aria) { const svg = $('calc-plot'); while (svg.firstChild) svg.removeChild(svg.firstChild); svg.setAttribute('aria-label', aria); }
  function showNothing(message) {
    SIEVES[mode].forEach((s, i) => { for (const p of ['pr-', 'cr-', 'pp-', 'ok-']) { const c = $(p + i); c.textContent = '—'; c.className = 'out'; } });
    for (const id of ['out-total', 'out-fm', 'out-nmas', 'out-verdict']) $(id).textContent = '—';
    $('out-verdict').className = ''; $('out-limits').textContent = ''; $('out-notes').textContent = message;
    clearSvg('No result — fix the inputs to see the grading curve');
  }

  // 반대수 플롯: x = log10(mm) 0.05–100 mm, y = 통과율
  function draw(rows, limits, checks) {
    clearSvg(''); const svg = $('calc-plot');
    const L = 80, R = 700, T = 24, B = 300, lo = Math.log10(0.05), hi = Math.log10(100);
    const X = mm => L + (Math.log10(mm) - lo) / (hi - lo) * (R - L), Y = p => B - p / 100 * (B - T);
    const g = el('g', { 'font-family': 'var(--font-mono)', 'font-size': '11', fill: 'var(--muted)' }); svg.appendChild(g);
    // 허용대 다각형 (제한이 있는 체만, 굵은 체 → 가는 체 순)
    const band = rows.filter(r => r.mm > 0 && limits[r.label]);
    if (band.length > 1) {
      const top = band.map(r => `${X(r.mm).toFixed(1)},${Y(limits[r.label][1]).toFixed(1)}`);
      const bottom = [...band].reverse().map(r => `${X(r.mm).toFixed(1)},${Y(limits[r.label][0]).toFixed(1)}`);
      g.appendChild(el('polygon', { points: top.concat(bottom).join(' '), fill: 'var(--icy)', stroke: 'var(--border)', 'stroke-width': 1 }));
    }
    for (let p = 0; p <= 100; p += 20) {
      g.appendChild(el('line', { x1: L, y1: Y(p), x2: R, y2: Y(p), stroke: 'var(--border)', 'stroke-width': 1 }));
      g.appendChild(el('text', { x: L - 8, y: Y(p) + 4, 'text-anchor': 'end' }, String(p)));
    }
    rows.filter(r => r.mm > 0).forEach((r, i) => {
      g.appendChild(el('line', { x1: X(r.mm), y1: T, x2: X(r.mm), y2: B, stroke: 'var(--border)', 'stroke-width': 1, 'stroke-dasharray': '2 4' }));
      g.appendChild(el('text', { x: X(r.mm), y: B + 16 + (i % 2) * 14, 'text-anchor': 'middle' }, r.label));
    });
    g.appendChild(el('line', { x1: L, y1: B, x2: R, y2: B, stroke: 'var(--dark)', 'stroke-width': 1.5 }));
    g.appendChild(el('line', { x1: L, y1: T, x2: L, y2: B, stroke: 'var(--dark)', 'stroke-width': 1.5 }));
    g.appendChild(el('text', { x: (L + R) / 2, y: 350, 'text-anchor': 'middle', fill: 'var(--dark)' }, 'sieve opening, mm (log scale; coarse on the right)'));
    g.appendChild(el('text', { x: 18, y: (T + B) / 2, 'text-anchor': 'middle', fill: 'var(--dark)', transform: `rotate(-90 18 ${(T + B) / 2})` }, '% passing'));
    const pts = rows.filter(r => r.mm > 0);
    if (pts.length > 1) g.appendChild(el('polyline', { points: pts.map(r => `${X(r.mm).toFixed(1)},${Y(r.passing).toFixed(1)}`).join(' '), fill: 'none', stroke: 'var(--royal)', 'stroke-width': 3 }));
    for (const r of pts) {
      const c = checks.find(k => k.label === r.label), x = X(r.mm), y = Y(r.passing);
      if (c && c.ok === false) g.appendChild(el('polygon', { points: `${x},${y - 7} ${x + 7},${y} ${x},${y + 7} ${x - 7},${y}`, fill: 'var(--amber)', stroke: 'var(--dark)', 'stroke-width': 1 }));
      else g.appendChild(el('circle', { cx: x, cy: y, r: 5, fill: 'var(--royal)', stroke: 'var(--bg)', 'stroke-width': 1.5 }));
    }
    const legend = el('text', { x: L + 8, y: T + 14, fill: 'var(--muted)' }, band.length > 1 ? 'shaded: ASTM C33 band · amber: outside the band' : 'no C33 band for this selection');
    g.appendChild(legend); addHalo(g, legend);
    const bad = checks.filter(k => k.ok === false).map(k => k.label);
    svg.setAttribute('aria-label', `Grading curve: ${pts.map(r => `${r.label} ${fmt1(r.passing)} % passing`).join(', ')}; ${bad.length ? bad.join(', ') + ' outside the C33 band' : 'all sieves within the C33 band'}`);
  }

  function update() {
    const fine = mode === 'fine';
    $('size-field').hidden = fine;
    $('lbl-fm').textContent = fine ? 'Fineness modulus' : 'Fineness modulus (coarse)';
    const inp = readInputs();
    $('calc-errors').textContent = inp.errors.join(' ');
    if (inp.errors.length) { showNothing('Fix the inputs listed above to see a result.'); return; }
    const res = analyze(inp.retained, SIEVES[mode]);
    if (res.error) { showNothing(res.error); return; }
    const limits = fine ? FINE_LIMITS : COARSE_LIMITS[inp.sizeNo];
    const lim = checkLimits(res.rows, limits);
    res.rows.forEach((r, i) => {
      $('pr-' + i).textContent = fmt1(r.pctRetained); $('cr-' + i).textContent = fmt1(r.cumRetained); $('pp-' + i).textContent = fmt1(r.passing);
      const c = lim.checks.find(k => k.label === r.label), cell = $('ok-' + i);
      if (!c || c.ok === null) { cell.textContent = r.label === 'pan' ? '' : '—'; cell.className = 'out'; }
      else { cell.textContent = c.ok ? `${c.min}–${c.max} OK` : `${c.min}–${c.max} out`; cell.className = 'out ' + (c.ok ? 'ok' : 'bad'); }
    });
    const fm = finenessModulus(res.rows), size = nominalMaxSize(res.rows), single = maxSingleFraction(res.rows);
    const fines = res.rows[res.rows.length - 1].pctRetained; // 팬 = No. 200 통과분(건식)
    const mc = massCheck(res.total, inp.sampleMass);
    $('out-total').textContent = `${fmtG(res.total)} g`;
    $('out-fm').textContent = fm.toFixed(2);
    $('out-nmas').textContent = size.nmas ? `${size.nmas} (max ${size.maxSize || '—'})` : '—';
    const problems = [];
    if (!lim.allOk) problems.push(`outside the band on ${lim.checks.filter(k => k.ok === false).map(k => k.label).join(', ')}`);
    if (fine && (fm < FM_RANGE[0] || fm > FM_RANGE[1])) problems.push(`FM ${fm.toFixed(2)} outside ${FM_RANGE[0]}–${FM_RANGE[1]}`);
    if (fine && !single.ok) problems.push(`${fmt1(single.pct)} % on ${single.label} exceeds the ${MAX_SINGLE_FRACTION} % single-sieve limit`);
    if (fine && fines > FINES_LIMIT) problems.push(`${fmt1(fines)} % finer than No. 200 exceeds ${FINES_LIMIT} % (abrasion service)`);
    if (mc && !mc.ok) problems.push(`sieved mass differs from the sample mass by ${fmt1(mc.diffPct)} % (limit 0.3 %) — the run is not acceptable`);
    const verdict = $('out-verdict');
    verdict.textContent = problems.length ? 'CHECK' : 'MEETS C33';
    verdict.className = problems.length ? 'verdict-fail' : 'verdict-pass';
    const n = lim.checks.filter(k => k.ok !== null).length, okN = lim.checks.filter(k => k.ok === true).length;
    $('out-limits').textContent = `${okN} of ${n} limited sieves within the ${fine ? 'C33 fine-aggregate band' : 'C33 Size ' + inp.sizeNo + ' band'}. ${problems.length ? 'Issues: ' + problems.join('; ') + '.' : ''}`;
    const notes = [];
    if (fine) notes.push(`Largest single-sieve fraction ${fmt1(single.pct)} % on ${single.label} (limit ${MAX_SINGLE_FRACTION} %). Finer than No. 200 (dry): ${fmt1(fines)} %.`);
    if (mc) notes.push(`Mass check: ${fmt1(mc.diffPct)} % difference (${mc.ok ? 'within' : 'over'} 0.3 %).`); else notes.push('Enter the dried sample mass to check the 0.3 % rule.');
    $('out-notes').textContent = notes.join(' ');
    draw(res.rows, limits, lim.checks);
  }

  buildRows();
  form.addEventListener('input', update);
  $('mode').addEventListener('change', () => { mode = form.elements.mode.value; buildRows(); update(); });
  $('sizeNo').addEventListener('change', update);
  form.addEventListener('submit', e => { e.preventDefault(); update(); });
  update();
}
```

- [ ] **Step 3: Style (tokens only)** — in `site/study/article.css`, directly after `.calc-plots { display:grid; gap:8px; }` add:

```css
.calc-sieve th[scope="row"] { text-align:left; color:var(--dark); white-space:nowrap; }   /* 체가름 표: 체 이름 열 */
.calc-sieve input { width:6em; }
```

- [ ] **Step 4: Register with the guards** — in `tools/site-guards.test.mjs` add `'study/aggregate-gradation/index.html'` and `'study/aggregate-gradation/calc.js'` to the tokens-only `files` list and `'study/aggregate-gradation/index.html'` to `ARTICLE_PAGES`.

- [ ] **Step 5: Gate + browser checks**

Run the full gate (Global Constraints) → all pass. Start `python tools/devserver.py 8770 site` in the background (8771 if busy). Capture with `D:\Codex\Temp\claude\D--Projects-Test\d64fe480-de3e-4585-8fe0-f5b32b07ce45\scratchpad\verify\cdp-shot.mjs` (1440) and `…\scratchpad\verify-room\cdp-shot-390.mjs` (390), files under `…\scratchpad\verify-sieve\`. Steps, each with a screenshot: (1) load → `#pp-1` = 97.6, `#pp-6` = 4.0, `#out-total` = 500 g, `#out-fm` = 3.01, `#out-nmas` starts with "3/8 in", `#out-verdict` = MEETS C33, `#ok-4` reads "25–60 OK", plot has nodes and the band legend text; (2) set `m8` (pan) to 126 and `m3` = 60, `m4` = 60 → `#ok-6` shows "0–10 out", verdict CHECK, an amber diamond in the plot; (3) reset (`form.reset()` + input) then `sampleMass` = 502 → notes say 0.4 % over; 501 → within; (4) switch `mode` to coarse (dispatch `change`) → rows rebuilt (10 rows), `#size-field` visible, `#out-total` 10,000 g, `#out-nmas` starts with "1 in", `#out-fm` 7.09, verdict MEETS C33; switch `sizeNo` to 67 → verdict CHECK with 3/4 in. outside; (5) set all masses blank → error message from `analyze`, plot empty with the "No result" aria-label; (6) mode back to fine → defaults restored, MEETS C33; (7) 390 px: the table scrolls inside `.calc-tests` (documentElement.scrollWidth = 390), the plot labels readable. Read every screenshot; fix genuine defects only and record them. Recompute the byline read time (strip tables/SVG/captions/form; 200 wpm) and correct "11 min read" if needed.

- [ ] **Step 6: Commit**

```bash
git add site/study/aggregate-gradation/index.html site/study/aggregate-gradation/calc.js site/study/article.css tools/site-guards.test.mjs && git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 골재 입도 글 — 본문 9절·SVG 도해 3장·사진 4장(+Part 1 사진 재사용)·계산기(체가름·FM·NMAS·C33 허용대·반대수 플롯, calc.js), 가드 목록 갱신

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 4: Registry entry, README, and Study index verification

**Files:** `site/shared/registry.js`, `tools/registry.test.mjs`, `README.md`

- [ ] **Step 1: Test first.** In `tools/registry.test.mjs` set the expected page ids to `['mix-design-1', 'mix-design-2', 'aggregate-gradation', 'slump-test', 'concrete-cylinders', 'soil-compaction']` and rename the test to `'MATERIALS: 믹스 디자인 2편·골재 입도·슬럼프·공시체·다짐 글이 등록돼 있고 page href 가 실제 파일을 가리킨다'`. `node --test tools/registry.test.mjs` → 1 failure.
- [ ] **Step 2: Entry.** In `site/shared/registry.js`, between the `mix-design-2` entry and the `slump-test` entry insert:

```js
    { id: 'aggregate-gradation', group: 'materials', type: 'page', title: 'Sieve analysis and the fineness modulus',
      desc: 'How aggregate grading is measured (ASTM C136), turned into percent passing and the fineness modulus, and checked against ASTM C33 — with a calculator that plots your sieve results on the grading band.',
      href: 'aggregate-gradation/' },
```

`node --test tools/registry.test.mjs` → all pass.
- [ ] **Step 3: README.** Add `` - `site/study/aggregate-gradation/` — *Sieve analysis and the fineness modulus* (`index.html` + `gradation.js` + `calc.js`); photos in `img/` `` between the mix-design and slump-test lines of the structure list; append `tools/gradation.test.mjs` to the test command.
- [ ] **Step 4: Full gate** → all pass (74 + 7 = 81). Capture `http://localhost:8770/study/` at 1440: six Materials cards in the order Part 1, Part 2, sieve analysis, slump test, concrete cylinders, compaction control.
- [ ] **Step 5: Commit**

```bash
git add site/shared/registry.js tools/registry.test.mjs README.md && git -c core.quotepath=false commit -F - <<'EOF'
feat: 레지스트리에 골재 입도 글 등록(배합설계 글 뒤에 배치), registry 테스트·README 갱신

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

## Self-review notes

- Spec coverage: sections ①–⑨, diagrams A–C, four photos + reused Part 1 photo, calculator inputs/outputs/plot, styles, registry order, guards, verification → Tasks 1–4 and the final review/finishing flow.
- Names: `calc.js` imports exactly `SIEVES, DEFAULTS, FINE_LIMITS, COARSE_LIMITS, FINES_LIMIT, FM_RANGE, MAX_SINGLE_FRACTION, analyze, finenessModulus, checkLimits, maxSingleFraction, nominalMaxSize, massCheck, validate` — all exported by Task 1; DOM ids in block B match `calc.js` (rows are built by `calc.js` into `tbody#sieve-rows`).
- Numbers pinned with node: fine example passing 100 / 97.6 / 84 / 62 / 36 / 15 / 4 / 1.2 / 0, FM 3.01, largest fraction 26 % (No. 30); coarse Size 57 passing 100 / 100 / 97 / 73 / 34 / 15 / 2 / 0.5 / 0.5 / 0, FM 7.09, NMAS 1 in., maximum size 1-1/2 in.; mass check 501 → 0.2 %, 502 → 0.4 %.
