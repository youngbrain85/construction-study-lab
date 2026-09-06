# Study "Compaction control: the Proctor test and field density" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth Study article — soil compaction control (Proctor test → field density → percent compaction) — with four SVG diagrams, six CC/public-domain photos and a small interactive calculator, on the existing article template.

**Architecture:** One static page `site/study/soil-compaction/index.html` on the Study article template (`article.css` + `article.js`). The calculator is split into a pure ES module `compaction.js` (math only, tested under `node --test`) and a DOM/SVG module `calc.js` loaded with `type="module"`. Photos are recompressed with Pillow into `img/`. Registry + guard tests are extended the same way as the slump article.

**Tech Stack:** Static HTML/CSS/vanilla JS (ES modules), inline SVG, Node 20 `node --test`, Python 3 + Pillow (photo prep), curl (photo download).

**Spec:** `docs/superpowers/specs/2026-09-06-study-soil-compaction-design.md`. Research notes with every number used: `D:\Codex\Temp\claude\D--Projects-Test\d64fe480-de3e-4585-8fe0-f5b32b07ce45\scratchpad\soil-research\research.txt`.

## Global Constraints

- Work in the worktree `D:\Projects\Test\.claude\worktrees\study-soil-compaction` (branch `worktree-study-soil-compaction`). Never touch `D:\Projects\Test` directly.
- No course code: the uppercase string `CNST` must not appear anywhere under `site/`. No department or university name.
- Article CSS and article HTML use `theme.css` tokens only — no literal colours (`#rgb`, `#rrggbb`) in `site/study/article.css`, in the new page, or in `calc.js` (SVG attributes use `var(--token)`).
- Footer text exactly `© <span id="year"></span> Jisoo Park. All rights reserved.` (year filled by `article.js`).
- Language: English article; Korean code comments. Brand tokens only; no logos, no emoji.
- Numbers in the article come only from ASTM D698 / D1557 / D1556 / D6938 / D2216 / D4718 as recorded in research.txt §1–3. Spec values (95 %, 90 %, ±2 %, lift thickness, test frequency) are always labelled "typical". Calculator defaults are labelled "example numbers".
- Photo credits: caption with author + licence, plus a credits paragraph with links to each Commons file page and to the licence deed, and the sentence "The photos were resized and recompressed for the web."
- Every `<img>` carries `width`/`height` equal to the real pixel size (the guard checks JPEG SOF); every photo ≤ 220 KB.
- Commit format: `git add <files> && git -c core.quotepath=false commit -F - <<'EOF' … EOF`, message in Korean, trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Create files with the Write tool (UTF-8). Do not chain long `&&` commands (the worktree Bash guard refuses them).
- Test gate (all must pass before every commit): `node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs tools/study-tables.test.mjs tools/site-guards.test.mjs tools/layout.test.mjs tools/props.test.mjs tools/decor.test.mjs tools/compaction.test.mjs`

## File Structure

- Create `site/study/soil-compaction/compaction.js` — pure math: `dryDensity`, `zavDensity`, `quadraticFit`, `fitProctor`, `evaluate`, `LIMITS`, `validate`.
- Create `tools/compaction.test.mjs` — node tests for the module.
- Create `site/study/soil-compaction/img/*.jpg` — six photos (Task 2).
- Create `site/study/soil-compaction/index.html` — the article (Task 3).
- Create `site/study/soil-compaction/calc.js` — DOM wiring + SVG plot (Task 4).
- Modify `site/study/article.css` — calculator styles (Task 4).
- Modify `site/shared/registry.js` — MATERIALS entry + materials blurb (Task 5).
- Modify `tools/registry.test.mjs`, `tools/site-guards.test.mjs`, `README.md` (Tasks 2, 5).

---

### Task 1: Pure calculation module + tests

**Files:**
- Create: `site/study/soil-compaction/compaction.js`
- Test: `tools/compaction.test.mjs`

**Interfaces:**
- Produces (used by Task 4): `dryDensity(wet, wPct)`, `zavDensity(Gs, wPct)`, `fitProctor(points)` → `{ points:[{w,wet,dry}], a,b,c, wOpt, gdMax, wMin, wMax, flags:[] }` or `{ points, error }`, `evaluate({ gdField, wField, gdMax, wOpt, specPct, lo, hi })` → `{ percent, densityOk, moistureOk, pass, reasons:[] }`, `LIMITS`, `validate(name, value)` → `''` or message.

- [ ] **Step 1: Write the failing tests**

Create `tools/compaction.test.mjs`:

```js
// tools/compaction.test.mjs — site/study/soil-compaction/compaction.js 계약 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
const C = await import('../site/study/soil-compaction/compaction.js');

const DEFAULTS = [[8, 112.3], [10, 118.5], [12, 122.9], [14, 122.1], [16, 118.0]].map(([w, wet]) => ({ w, wet }));
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test('dryDensity: γd = γwet / (1 + w)', () => {
  near(C.dryDensity(122.9, 12), 109.732, 0.001, 'dry');
  assert.equal(C.dryDensity(100, 0), 100);
});

test('zavDensity: Gs·γw / (1 + w·Gs)', () => {
  near(C.zavDensity(2.70, 12), 127.251, 0.001, 'zav');
  assert.ok(C.zavDensity(2.70, 20) < C.zavDensity(2.70, 10), 'falls with water content');
});

test('quadraticFit recovers an exact parabola', () => {
  const xs = [8, 10, 12, 14, 16], ys = xs.map(x => -0.35 * x * x + 8.4 * x + 59);
  const f = C.quadraticFit(xs, ys);
  near(f.a, -0.35, 1e-9, 'a'); near(f.b, 8.4, 1e-9, 'b'); near(f.c, 59, 1e-9, 'c');
});

test('fitProctor on the example points: peak near 11.7 % / 109.4 pcf', () => {
  const r = C.fitProctor(DEFAULTS);
  assert.equal(r.points.length, 5);
  near(r.points[2].dry, 109.732, 0.001, 'dry of point 3');
  near(r.wOpt, 11.686, 0.01, 'wOpt'); near(r.gdMax, 109.364, 0.01, 'gdMax');
  assert.deepEqual(r.flags, []); assert.equal(r.wMin, 8); assert.equal(r.wMax, 16);
});

test('fitProctor: fewer than three distinct water contents → error', () => {
  assert.ok(C.fitProctor([{ w: 10, wet: 118 }, { w: 10, wet: 119 }, { w: 12, wet: 120 }]).error);
  assert.ok(C.fitProctor([]).error);
});

test('fitProctor: no peak (rising points) → best point + flag', () => {
  const r = C.fitProctor([{ w: 8, wet: 110 }, { w: 10, wet: 114 }, { w: 12, wet: 120 }, { w: 14, wet: 126 }]);
  assert.ok(r.flags.includes('no-peak'));
  near(r.gdMax, 126 / 1.14, 0.001, 'best dry'); assert.equal(r.wOpt, 14);
});

test('fitProctor: optimum outside the tested range is flagged', () => {
  const r = C.fitProctor([{ w: 4, wet: 118 }, { w: 6, wet: 121 }, { w: 8, wet: 123 }]); // 여전히 오르는 중, 미세한 곡률
  assert.ok(r.flags.includes('outside-range') || r.flags.includes('no-peak'));
});

test('evaluate: 106.5 pcf at 11.5 % passes 95 % and the ±2 % window', () => {
  const r = C.evaluate({ gdField: 106.5, wField: 11.5, gdMax: 109.364, wOpt: 11.686, specPct: 95, lo: -2, hi: 2 });
  assert.equal(r.percent, 97.4); assert.ok(r.pass); assert.deepEqual(r.reasons, []);
});

test('evaluate: low density and wet of the window are both reported', () => {
  const r = C.evaluate({ gdField: 100, wField: 15, gdMax: 109.364, wOpt: 11.686, specPct: 95, lo: -2, hi: 2 });
  assert.equal(r.percent, 91.4); assert.ok(!r.pass);
  assert.deepEqual(r.reasons, ['density below spec', 'too wet']);
  const dry = C.evaluate({ gdField: 108, wField: 9, gdMax: 109.364, wOpt: 11.686, specPct: 95, lo: -2, hi: 2 });
  assert.deepEqual(dry.reasons, ['too dry']); assert.ok(!dry.pass && dry.densityOk);
});

test('validate: limits and non-numbers', () => {
  assert.equal(C.validate('w', 12), '');
  assert.ok(C.validate('w', 45)); assert.ok(C.validate('wet', 10)); assert.ok(C.validate('Gs', NaN));
  assert.deepEqual(C.LIMITS.spec, [80, 105]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tools/compaction.test.mjs`
Expected: FAIL — cannot find module `compaction.js`.

- [ ] **Step 3: Write the module**

Create `site/study/soil-compaction/compaction.js`:

```js
// site/study/soil-compaction/compaction.js — 다짐 관리 계산 (순수 함수, DOM 무관; tools/compaction.test.mjs 가 검사)
// 단위: 단위중량 pcf, 함수비 %.  근거: ASTM D698 (건조단위중량 = 습윤/(1+w)), 영공기간극선 γd = Gs·γw/(1+w·Gs)
export const GAMMA_W = 62.4; // 물의 단위중량, pcf

export function dryDensity(wet, wPct) { return wet / (1 + wPct / 100); }

export function zavDensity(Gs, wPct) { return Gs * GAMMA_W / (1 + (wPct / 100) * Gs); }

// 2차 최소제곱 y = a·x² + b·x + c — 정규방정식을 부분 피벗 가우스 소거로 푼다. 특이하면 null.
export function quadraticFit(xs, ys) {
  const s = [0, 0, 0, 0, 0], t = [0, 0, 0];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i], y = ys[i];
    s[0] += 1; s[1] += x; s[2] += x * x; s[3] += x * x * x; s[4] += x * x * x * x;
    t[0] += y; t[1] += x * y; t[2] += x * x * y;
  }
  const M = [[s[4], s[3], s[2], t[2]], [s[3], s[2], s[1], t[1]], [s[2], s[1], s[0], t[0]]];
  for (let col = 0; col < 3; col++) {
    let p = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(M[r][col]) > Math.abs(M[p][col])) p = r;
    [M[col], M[p]] = [M[p], M[col]];
    if (Math.abs(M[col][col]) < 1e-12) return null;
    for (let r = col + 1; r < 3; r++) {
      const f = M[r][col] / M[col][col];
      for (let k = col; k < 4; k++) M[r][k] -= f * M[col][k];
    }
  }
  const x = [0, 0, 0];
  for (let r = 2; r >= 0; r--) {
    let acc = M[r][3];
    for (let k = r + 1; k < 3; k++) acc -= M[r][k] * x[k];
    x[r] = acc / M[r][r];
  }
  return { a: x[0], b: x[1], c: x[2] };
}

// points: [{ w, wet }] → 건조단위중량을 붙이고 2차 곡선의 봉우리(최적함수비·최대건조단위중량)를 찾는다
export function fitProctor(points) {
  const pts = points
    .filter(p => Number.isFinite(p.w) && Number.isFinite(p.wet))
    .map(p => ({ w: p.w, wet: p.wet, dry: dryDensity(p.wet, p.w) }));
  if (new Set(pts.map(p => p.w)).size < 3) return { points: pts, error: 'Enter at least three points with different water contents.' };
  const fit = quadraticFit(pts.map(p => p.w), pts.map(p => p.dry));
  const wMin = Math.min(...pts.map(p => p.w)), wMax = Math.max(...pts.map(p => p.w));
  const flags = [];
  let wOpt, gdMax;
  if (!fit || fit.a >= 0) { // 봉우리가 없다(점이 계속 오르거나 내린다) → 가장 무거운 점을 쓰고 알린다
    const best = pts.reduce((m, p) => (p.dry > m.dry ? p : m), pts[0]);
    wOpt = best.w; gdMax = best.dry; flags.push('no-peak');
  } else {
    wOpt = -fit.b / (2 * fit.a);
    gdMax = fit.c - (fit.b * fit.b) / (4 * fit.a);
    if (wOpt < wMin || wOpt > wMax) flags.push('outside-range');
  }
  return { points: pts, a: fit ? fit.a : NaN, b: fit ? fit.b : NaN, c: fit ? fit.c : NaN, wOpt, gdMax, wMin, wMax, flags };
}

// 다짐도(%)와 함수비 창 판정. percent 는 소수 1자리로 반올림한 값으로 비교한다(현장 보고서와 같은 방식)
export function evaluate({ gdField, wField, gdMax, wOpt, specPct = 95, lo = -2, hi = 2 }) {
  const percent = Math.round((gdField / gdMax) * 1000) / 10;
  const densityOk = percent >= specPct;
  const tooDry = wField < wOpt + lo, tooWet = wField > wOpt + hi;
  const reasons = [];
  if (!densityOk) reasons.push('density below spec');
  if (tooDry) reasons.push('too dry');
  if (tooWet) reasons.push('too wet');
  return { percent, densityOk, moistureOk: !tooDry && !tooWet, pass: densityOk && !tooDry && !tooWet, reasons };
}

// 입력 한계(화면 검증용). 이름: w(함수비 %), wet(습윤 pcf), gd(현장 건조 pcf), Gs, spec(다짐도 %), window(함수비 창 %)
export const LIMITS = { w: [0, 40], wet: [60, 160], gd: [60, 160], Gs: [2.4, 3.0], spec: [80, 105], window: [-10, 10] };
export function validate(name, value) {
  const [lo, hi] = LIMITS[name];
  if (!Number.isFinite(value)) return 'enter a number';
  if (value < lo || value > hi) return `use ${lo} to ${hi}`;
  return '';
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tools/compaction.test.mjs`
Expected: 10 tests, all pass.

- [ ] **Step 5: Commit**

```bash
git add site/study/soil-compaction/compaction.js tools/compaction.test.mjs && git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 다짐 관리 — 순수 계산 모듈(compaction.js: 건조밀도·ZAV·2차 최소제곱 Proctor 적합·다짐도 판정) + 테스트

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---
### Task 2: Photos (download, recompress) + generic photo-budget guard

**Files:**
- Create: `site/study/soil-compaction/img/{earthwork-hero,proctor-compactor,nuclear-gauge,padfoot-roller,vibratory-roller,lift-test}.jpg`
- Modify: `tools/site-guards.test.mjs` (replace the slump-only photo test with a generic per-directory test)
- Scratch: `D:\Codex\Temp\claude\D--Projects-Test\d64fe480-de3e-4585-8fe0-f5b32b07ce45\scratchpad\soil-photos\` (originals; not committed)

**Interfaces:**
- Produces (used by Task 3 `<img>` tags — exact pixel sizes): earthwork-hero 1200×900, proctor-compactor 1200×900, nuclear-gauge 1200×900, padfoot-roller 1200×857, vibratory-roller 1200×845, lift-test 1200×900.

- [ ] **Step 1: Download the six originals (Wikimedia Commons, user-authorized)**

Run from the scratch directory (one command per file is fine; a descriptive User-Agent is required by Wikimedia):

```bash
mkdir -p "D:/Codex/Temp/claude/D--Projects-Test/d64fe480-de3e-4585-8fe0-f5b32b07ce45/scratchpad/soil-photos" && cd "$_" && UA="ConstructionStudyLab/1.0 (https://cnstlab.org; study article photo fetch)" && \
curl -sSL -A "$UA" -o hero.src.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/Landscape_shaping_at_Brunnsh%C3%B6g,_Lund,_Sweden.jpg" && \
curl -sSL -A "$UA" -o proctor.src.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/Proctor_device1.JPG" && \
curl -sSL -A "$UA" -o gauge.src.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/Moisture_Density_Guage_(7845749948).jpg" && \
curl -sSL -A "$UA" -o padfoot.src.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/Seabees_compactor_roller.jpg" && \
curl -sSL -A "$UA" -o vibratory.src.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/Caterpillar_CS_663E_Vibratory_soil_compacter._Spielvogel_1.jpg" && \
curl -sSL -A "$UA" -o lift.src.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/Testing_compaction_of_soil_sediment_placed_in_the_thermal_treatment._(26203673263).jpg" && ls -l
```

Expected sizes (approx.): hero 263 KB (1260×945), proctor 298 KB (2048×1536), gauge 2.7 MB (2816×2112), padfoot 657 KB (2100×1500), vibratory 8.2 MB (5449×3837), lift 3.1 MB (2592×1944). If the worktree Bash guard refuses the chained command, run the six `curl` lines one per call.

- [ ] **Step 2: Recompress into the article folder**

```bash
python - <<'EOF'
from PIL import Image, ImageOps
import os
SRC = "D:/Codex/Temp/claude/D--Projects-Test/d64fe480-de3e-4585-8fe0-f5b32b07ce45/scratchpad/soil-photos"
OUT = "site/study/soil-compaction/img"; os.makedirs(OUT, exist_ok=True)
jobs = [('hero.src.jpg', 'earthwork-hero.jpg'), ('proctor.src.jpg', 'proctor-compactor.jpg'), ('gauge.src.jpg', 'nuclear-gauge.jpg'),
        ('padfoot.src.jpg', 'padfoot-roller.jpg'), ('vibratory.src.jpg', 'vibratory-roller.jpg'), ('lift.src.jpg', 'lift-test.jpg')]
for src, name in jobs:
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, src))).convert('RGB')
    if im.width > 1200: im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
    q = 82
    while True:  # EXIF 제거, 220 KB 이하가 될 때까지 품질을 낮춘다
        p = os.path.join(OUT, name); im.save(p, 'JPEG', quality=q, optimize=True, progressive=True)
        if os.path.getsize(p) <= 220 * 1024 or q <= 60: break
        q -= 4
    print(f"{name}: {im.size} q{q} {os.path.getsize(p) // 1024} KB")
EOF
```

Expected: six files, widths 1200, heights 900 / 900 / 900 / 857 / 845 / 900, each ≤ 220 KB. Open the six outputs (Read tool) and confirm each shows what its caption will claim (earthwork with rollers; automatic Proctor compactor with mold; nuclear gauge with source rod down; padfoot roller; smooth-drum vibratory roller; technician on a rolled lift).

- [ ] **Step 3: Generalize the photo-budget guard**

In `tools/site-guards.test.mjs`, replace the whole test that starts with `test('Slump 글 사진 7장이 존재하고 img/ 의 모든 파일이 각 220 KB 이하다'` (keep the `jpegSize` helper that follows it) with:

```js
test('Study 글 사진 폴더(slump 7장 · soil 6장)의 모든 파일이 .jpg 이고 각 220 KB 이하다', () => {
  const dirs = { 'study/slump-test/img': 7, 'study/soil-compaction/img': 6 };
  for (const [rel, count] of Object.entries(dirs)) {
    const files = readdirSync(join(SITE, rel));
    assert.equal(files.length, count, `${rel}: expected ${count} photos, found ${files.join(', ')}`);
    for (const name of files) { // 목록을 디렉터리에서 얻어, 나중에 추가된 사진도 예산을 벗어나지 못하게 한다
      assert.ok(/\.jpg$/.test(name), `${rel}/${name}: only .jpg`);
      const size = statSync(join(SITE, rel, name)).size;
      assert.ok(size <= 220 * 1024, `${rel}/${name} is ${size} B > 220 KB`);
    }
  }
});
```

- [ ] **Step 4: Run the guards**

Run: `node --test tools/site-guards.test.mjs`
Expected: all pass (the new test counts 7 + 6 files).

- [ ] **Step 5: Commit**

```bash
git add site/study/soil-compaction/img tools/site-guards.test.mjs && git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 다짐 관리 — Commons/공공저작물 사진 6장(≤1200 px·EXIF 제거·≤220 KB), 사진 예산 가드를 폴더별 일반화

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---
### Task 3: The article page, calculator UI and styles

**Files:**
- Create: `site/study/soil-compaction/index.html` (block A + block B below, concatenated in order)
- Create: `site/study/soil-compaction/calc.js`
- Modify: `site/study/article.css` (append the calculator block before the `@media (max-width:900px)` rule)
- Modify: `tools/site-guards.test.mjs` (tokens-only list + `ARTICLE_PAGES`)

**Interfaces:**
- Consumes: `compaction.js` exports from Task 1; photo pixel sizes from Task 2.
- Produces: page at `study/soil-compaction/` (Task 4 registers it); DOM ids used by `calc.js`: form `#calc`, inputs `w1..w5`, `g1..g5`, `gs`, `gdf`, `wf`, `spec`, `lo`, `hi`; outputs `#dry1..#dry5`, `#out-wopt`, `#out-gdmax`, `#out-percent`, `#out-verdict`, `#out-notes`, `#calc-errors`, SVG `#calc-plot`.

- [ ] **Step 1: Write the page (block A, then block B appended)**

Extract the two fenced `html` blocks of this task in order into `site/study/soil-compaction/index.html` with a script (do not retype), e.g. `python - <<'EOF' … EOF` reading this plan file, collecting the fenced blocks whose first line is `<!-- BLOCK A -->` / `<!-- BLOCK B -->`, and writing them joined by a newline. Then Read the result once to confirm it starts with `<!doctype html>` and ends with `</html>`.

Block A:

```html
<!-- BLOCK A -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Compaction control: the Proctor test and field density — Construction Study Lab</title>
<meta name="description" content="How compacted fill is specified and checked: the Proctor test (ASTM D698 / D1557), reading the compaction curve, sand cone and nuclear gauge field density tests, percent compaction, and a calculator to try the numbers.">
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
  <p class="eyebrow">Materials · Earthwork QC</p>
  <h1>Compaction control</h1>
  <p class="lede">From the Proctor curve to the density test on the lift: how fill is specified, checked, and accepted — with a calculator to try the numbers yourself.</p>
  <p class="byline">Jisoo Park · September 2026 · 11 min read</p>
</div></section>

<main class="article-layout">
<nav class="toc" aria-label="Contents">
  <h2>Contents</h2>
  <ol>
    <li><a href="#why">1. Why we compact</a></li>
    <li><a href="#proctor">2. The Proctor test</a></li>
    <li><a href="#curve">3. Reading the curve</a></li>
    <li><a href="#field">4. Density in the field</a></li>
    <li><a href="#spec">5. Percent compaction and the spec</a></li>
    <li><a href="#calculator">6. Try it: the calculator</a></li>
    <li><a href="#mistakes">7. Common mistakes</a></li>
    <li><a href="#takeaways">8. Key takeaways</a></li>
  </ol>
</nav>

<article class="article">

<h2 id="why"><span class="num">1</span>Why we compact — and how much is enough</h2>
<figure>
  <img src="img/earthwork-hero.jpg" width="1200" height="900" alt="A bulldozer spreading fill while a padfoot roller compacts the lift behind it on a large earthwork site" loading="eager">
  <figcaption>Spreading and compacting fill, one lift at a time. Photo: Nixdorf, Wikimedia Commons, CC BY 4.0.</figcaption>
</figure>
<p>Fill that is simply dumped and spread is a loose pile of particles and air. Load it and it settles; wet it and it softens. Compaction is the mechanical work of driving the air out so the particles lock together at a higher <em>dry density</em> — and dry density is the number that everything else follows. Denser fill is stiffer and stronger, settles less, lets less water through, and holds up the slab, pavement, or footing that will sit on it for decades.</p>
<div class="callout callout-def"><span class="label">Definition</span>
  <p>Compaction is densification of soil by mechanical energy that expels <em>air</em> from the voids, at essentially constant water content. Consolidation is different: that is water squeezed out of a saturated soil by a sustained load, slowly, over months or years.</p>
</div>
<p>Compaction happens in <em>lifts</em>, thin layers placed loose and rolled before the next one goes down. The roller has to match the soil. Padfoot (sheepsfoot) rollers knead cohesive soils with their protruding feet and "walk out" of a lift as it densifies; smooth-drum vibratory rollers shake granular soils into a tighter packing; plate compactors and rammers do the same job in trenches and against walls. As typical practice, cohesive soils go down in loose lifts of about 6 to 8 in. and granular soils in lifts up to about 12 in., because a roller only works to a certain depth and a lift thicker than that stays loose at the bottom, no matter how many passes it gets.</p>
<div class="fig-grid">
  <figure><img src="img/padfoot-roller.jpg" width="1200" height="857" alt="A padfoot roller with rows of protruding feet on its drum compacting a lift of clayey fill" loading="lazy"><figcaption>Padfoot roller on cohesive fill. Photo: U.S. Air Force, public domain.</figcaption></figure>
  <figure><img src="img/vibratory-roller.jpg" width="1200" height="845" alt="A smooth-drum vibratory soil compactor parked next to an articulated dump truck" loading="lazy"><figcaption>Smooth-drum vibratory roller for granular fill. Photo: Spielvogel, Wikimedia Commons, CC0.</figcaption></figure>
</div>
<p>So the question on every earthwork job is the same: <em>is this lift dense enough?</em> Answering it takes two measurements. In the laboratory, the Proctor test tells you the densest this soil can get with a standard amount of effort, and at what water content. In the field, a density test tells you what the roller actually achieved. The ratio of the two is the number the specification is written around.</p>
<div class="callout callout-key"><span class="label">Key idea</span>
  <p>The laboratory gives you the target; the field test gives you the score. Both are reported as <em>dry</em> unit weight, because water in the voids adds weight without adding strength.</p>
</div>

<h2 id="proctor"><span class="num">2</span>The Proctor test (ASTM D698 and D1557)</h2>
<p>In 1933 R. R. Proctor, working on earth dams for the City of Los Angeles, showed that for a fixed compactive effort the dry density of a soil rises with water content up to a peak and then falls. The test that carries his name reproduces that experiment in a mold: you compact the same soil at several water contents with the same energy and find the peak. ASTM D698 does it with <em>standard effort</em>; ASTM D1557 does it with <em>modified effort</em>, about four and a half times more, introduced when heavier aircraft and heavier rollers demanded denser fills.</p>
<figure>
<svg class="fig-svg" viewBox="0 0 720 320" role="img" aria-labelledby="fig1-title">
  <title id="fig1-title">Proctor mold and rammer dimensions</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="12" fill="var(--muted)">
    <rect x="150" y="248" width="220" height="14" fill="var(--border)" stroke="var(--dark)" stroke-width="1.5"/>
    <rect x="200" y="110" width="120" height="138" fill="var(--icy)" stroke="var(--dark)" stroke-width="2"/>
    <rect x="200" y="60" width="120" height="50" fill="none" stroke="var(--dark)" stroke-width="2" stroke-dasharray="6 4"/>
    <text x="330" y="88" fill="var(--muted)">collar (removed before strike-off)</text>
    <line x1="200" y1="284" x2="320" y2="284" stroke="var(--royal)" stroke-width="1.5"/><line x1="200" y1="278" x2="200" y2="290" stroke="var(--royal)" stroke-width="1.5"/><line x1="320" y1="278" x2="320" y2="290" stroke="var(--royal)" stroke-width="1.5"/>
    <text x="260" y="306" text-anchor="middle" fill="var(--royal)">4.0 in. (101.6 mm) inside</text>
    <line x1="170" y1="110" x2="170" y2="248" stroke="var(--royal)" stroke-width="1.5"/><line x1="164" y1="110" x2="176" y2="110" stroke="var(--royal)" stroke-width="1.5"/><line x1="164" y1="248" x2="176" y2="248" stroke="var(--royal)" stroke-width="1.5"/>
    <text x="40" y="170" fill="var(--royal)">4.584 in.</text><text x="40" y="186" fill="var(--royal)">(116.4 mm)</text>
    <text x="40" y="220" fill="var(--muted)" font-size="11">1/30 ft³ (944 cm³)</text>
    <text x="150" y="276" fill="var(--muted)" font-size="11">base plate</text>
    <rect x="520" y="40" width="8" height="150" fill="var(--dark)"/>
    <rect x="500" y="190" width="48" height="44" rx="3" fill="var(--dark)"/>
    <line x1="580" y1="40" x2="580" y2="234" stroke="var(--royal)" stroke-width="1.5"/><line x1="574" y1="40" x2="586" y2="40" stroke="var(--royal)" stroke-width="1.5"/><line x1="574" y1="234" x2="586" y2="234" stroke="var(--royal)" stroke-width="1.5"/>
    <text x="590" y="120" fill="var(--royal)">free drop</text>
    <text x="590" y="136" fill="var(--royal)">12 in. standard</text>
    <text x="590" y="152" fill="var(--royal)">18 in. modified</text>
    <text x="524" y="262" text-anchor="middle" fill="var(--muted)">rammer 5.5 lbf standard</text>
    <text x="524" y="278" text-anchor="middle" fill="var(--muted)">10 lbf modified · 2 in. face</text>
    <text x="524" y="28" text-anchor="middle" fill="var(--muted)">guide sleeve</text>
  </g>
</svg>
<figcaption>Figure 1. The 4 in. compaction mold with its collar and base plate, and the rammer. Both standards also use a 6 in. mold (1/13.33 ft³, 2,124 cm³) for coarser soils.</figcaption>
</figure>
<div class="table-wrap">
<table class="ref-table" id="tbl-effort">
  <caption>Table 1. Standard and modified effort</caption>
  <thead><tr><th scope="col"></th><th scope="col">ASTM D698 (standard)</th><th scope="col">ASTM D1557 (modified)</th></tr></thead>
  <tbody>
    <tr><td>Compactive effort</td><td>12,400 ft·lbf/ft³ (600 kN·m/m³)</td><td>56,000 ft·lbf/ft³ (2,700 kN·m/m³)</td></tr>
    <tr><td>Rammer</td><td>5.5 lbf (24.5 N)</td><td>10 lbf (44.5 N)</td></tr>
    <tr><td>Drop</td><td>12 in. (305 mm)</td><td>18 in. (457 mm)</td></tr>
    <tr><td>Layers</td><td>3</td><td>5</td></tr>
    <tr><td>Blows per layer, 4 in. mold</td><td>25</td><td>25</td></tr>
    <tr><td>Blows per layer, 6 in. mold</td><td>56</td><td>56</td></tr>
  </tbody>
</table>
</div>
<p class="ref-note">Methods A, B and C differ only in the sieve the soil is prepared through and the mold: A uses the 4 in. mold with soil passing the No. 4 (4.75 mm) sieve when 25 % or less is retained on it; B uses the 4 in. mold with soil passing the 3/8 in. (9.5 mm) sieve; C uses the 6 in. mold with soil passing the 3/4 in. (19.0 mm) sieve when 30 % or less is retained on it.</p>
<figure>
  <img src="img/proctor-compactor.jpg" width="1200" height="900" alt="An automatic mechanical compactor in a soils laboratory with a compaction mold clamped under its rammer" loading="lazy">
  <figcaption>An automatic compactor delivers the rammer blows with the same energy every time. Photo: Zaher.Kadour, Wikimedia Commons, CC BY-SA 3.0.</figcaption>
</figure>
<h3>The procedure in five moves</h3>
<ol class="steps">
  <li><strong>Prepare four or five specimens.</strong> Take enough soil for one mold per point, add water so the points sit about 2 % apart and bracket the expected optimum — at least two dry of it and two wet of it — and let each batch cure so the water spreads evenly through the soil.</li>
  <li><strong>Compact in layers.</strong> Weigh the empty mold. Place the soil in three layers (five for modified) and give each the prescribed blows with the rammer, spread evenly over the surface, with the collar on so the last layer finishes above the mold.</li>
  <li><strong>Strike off and weigh.</strong> Remove the collar, trim the soil flush with the top of the mold with a straightedge, and weigh mold plus soil. Wet unit weight is the soil mass divided by the mold volume.</li>
  <li><strong>Take the water content.</strong> Extrude the specimen, take a representative sample from its full height, and dry it to constant mass in a 110 ± 5 °C oven (ASTM D2216). Water content is the mass of water divided by the mass of dry soil.</li>
  <li><strong>Plot and read.</strong> Convert each wet unit weight to dry, plot dry unit weight against water content, draw a smooth curve through the points, and read the peak: the <em>maximum dry unit weight</em> and the <em>optimum water content</em>.</li>
</ol>
<div class="callout callout-warn"><span class="label">Watch out</span>
  <p>The mold only holds what passes the method's sieve. If the fill in the field carries more oversize rock than the laboratory specimen did, the laboratory maximum is too low for that material. ASTM D4718 corrects the maximum dry unit weight and optimum water content for the oversize fraction before you compare them with a field test.</p>
</div>

<h2 id="curve"><span class="num">3</span>Reading the compaction curve</h2>
<p>Each point on the curve is a dry unit weight. You never weigh dry soil in the mold; you weigh it wet and take the water back out arithmetically:</p>
<div class="eq"><i>γ</i><sub>d</sub> = <i>γ</i><sub>wet</sub> / (1 + <i>w</i>)</div>
<p>where <i>w</i> is the water content as a decimal. A mold that holds 122.9 pcf of wet soil at 12 % water holds 122.9 / 1.12 = 109.7 pcf of dry soil.</p>
<figure>
<svg class="fig-svg" viewBox="0 0 720 360" role="img" aria-labelledby="fig2-title">
  <title id="fig2-title">Compaction curves for standard and modified effort with the zero-air-voids line</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="12" fill="var(--muted)">
    <line x1="80" y1="300" x2="680" y2="300" stroke="var(--dark)" stroke-width="1.5"/>
    <line x1="80" y1="30" x2="80" y2="300" stroke="var(--dark)" stroke-width="1.5"/>
    <text x="380" y="340" text-anchor="middle" fill="var(--dark)">water content, w (%)  →</text>
    <text x="24" y="170" transform="rotate(-90 24 170)" text-anchor="middle" fill="var(--dark)">dry unit weight, γd (pcf)  →</text>
    <path d="M110 250 C 200 180, 260 110, 330 100 S 470 150, 600 240" fill="none" stroke="var(--royal)" stroke-width="3"/>
    <path d="M110 200 C 180 120, 220 60, 270 56 S 400 100, 520 190" fill="none" stroke="var(--dark)" stroke-width="2.5"/>
    <path d="M300 20 C 400 70, 520 170, 680 250" fill="none" stroke="var(--amber)" stroke-width="2" stroke-dasharray="7 5"/>
    <line x1="330" y1="100" x2="330" y2="300" stroke="var(--royal)" stroke-width="1" stroke-dasharray="4 4"/>
    <line x1="80" y1="100" x2="330" y2="100" stroke="var(--royal)" stroke-width="1" stroke-dasharray="4 4"/>
    <circle cx="330" cy="100" r="5" fill="var(--royal)"/>
    <circle cx="270" cy="56" r="5" fill="var(--dark)"/>
    <text x="336" y="318" fill="var(--royal)">w opt</text>
    <text x="86" y="96" fill="var(--royal)">γd,max</text>
    <text x="560" y="222" fill="var(--royal)">standard effort (D698)</text>
    <text x="440" y="70" fill="var(--dark)">modified effort (D1557)</text>
    <text x="520" y="122" fill="var(--amber)">zero air voids (S = 100 %)</text>
    <text x="150" y="290" fill="var(--muted)">dry side: stiff, brittle</text>
    <text x="470" y="290" fill="var(--muted)">wet side: soft, low permeability</text>
  </g>
</svg>
<figcaption>Figure 2. More effort raises the peak and moves it to the left. No curve can cross the zero-air-voids line, because that line is the density at which every void is full of water.</figcaption>
</figure>
<p>Dry of optimum the soil is stiff and the rammer cannot rearrange the particles; the water is a lubricant, and adding some lets the same energy pack them closer. Past the optimum the voids are nearly full of water, and water cannot be compacted, so extra water only takes up space that solids could have occupied. The curve therefore bends over, and it can never cross the <em>zero-air-voids</em> line:</p>
<div class="eq"><i>γ</i><sub>d,zav</sub> = <i>G</i><sub>s</sub> <i>γ</i><sub>w</sub> / (1 + <i>w</i> <i>G</i><sub>s</sub>)</div>
<p>with <i>G</i><sub>s</sub> the specific gravity of the soil solids (about 2.65 to 2.75 for most soils) and <i>γ</i><sub>w</sub> = 62.4 pcf. Points plotting on the wrong side of that line are arithmetic errors, not soil. Two more things the curve tells you. First, more compactive effort raises the maximum and lowers the optimum, which is why a fill specified against D1557 is a stiffer, drier fill than one specified against D698. Second, a clay compacted wet of optimum is less permeable but weaker than the same clay compacted dry of optimum at the same density; the spec's moisture window is there for a reason.</p>
<div class="callout callout-key"><span class="label">Key idea</span>
  <p>A compaction curve belongs to one soil and one effort. Change the borrow pit, the sieve fraction, or the standard, and you need a new curve.</p>
</div>

<h2 id="field"><span class="num">4</span>Measuring density in the field</h2>
<p>The field test has one job: find the dry unit weight of the lift as compacted. Two methods do it — one by digging, one by radiation — and both end with the same pair of numbers, wet density and water content.</p>
<h3>The sand cone (ASTM D1556)</h3>
<figure>
<svg class="fig-svg" viewBox="0 0 720 300" role="img" aria-labelledby="fig3-title">
  <title id="fig3-title">Sand cone apparatus seated over a test hole</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="12" fill="var(--muted)">
    <rect x="40" y="200" width="640" height="90" fill="var(--surface2)"/>
    <path d="M40 200 H300 Q300 200 300 214 L318 282 Q360 292 402 282 L420 214 Q420 200 420 200 H680" fill="none" stroke="var(--dark)" stroke-width="1.5"/>
    <path d="M300 214 L318 282 Q360 292 402 282 L420 214 Z" fill="var(--border)"/>
    <rect x="230" y="192" width="260" height="8" fill="var(--dark)"/>
    <polygon points="300,192 420,192 372,120 348,120" fill="var(--border)" stroke="var(--dark)" stroke-width="1.5"/>
    <rect x="352" y="104" width="16" height="16" fill="var(--dark)"/>
    <path d="M320 104 H400 V40 Q400 26 386 26 H334 Q320 26 320 40 Z" fill="var(--icy)" stroke="var(--dark)" stroke-width="1.5"/>
    <text x="410" y="60" fill="var(--muted)">jar of calibrated sand</text>
    <text x="410" y="116" fill="var(--muted)">valve</text>
    <text x="430" y="160" fill="var(--muted)">cone (funnel)</text>
    <text x="500" y="188" fill="var(--muted)">base plate</text>
    <text x="60" y="250" fill="var(--muted)">compacted lift</text>
    <text x="300" y="275" fill="var(--dark)" font-size="11">test hole</text>
    <text x="440" y="250" fill="var(--muted)" font-size="11">hole fills with sand;</text>
    <text x="440" y="266" fill="var(--muted)" font-size="11">sand mass ÷ sand density = hole volume</text>
  </g>
</svg>
<figcaption>Figure 3. The sand cone measures the volume of a hole by filling it with sand of known density; the soil dug from the hole is weighed and dried.</figcaption>
</figure>
<ol class="steps">
  <li><strong>Seat the plate.</strong> Level a spot on the lift, set the base plate, and dig a hole through its opening — roughly the width of a hand and about the depth of the lift — keeping <em>every</em> crumb of soil in a sealed container.</li>
  <li><strong>Weigh the soil.</strong> Weigh the wet soil from the hole and take a sample for water content.</li>
  <li><strong>Fill the hole with sand.</strong> Weigh the jar, invert it on the plate, open the valve, and let sand run until it stops; close the valve and weigh the jar again.</li>
  <li><strong>Find the hole volume.</strong> Sand used, minus the calibrated mass that fills the cone and plate, divided by the sand's bulk density, is the volume of the hole.</li>
  <li><strong>Compute.</strong> Wet soil mass over hole volume is the wet unit weight; divide by (1 + <i>w</i>) for the dry unit weight.</li>
</ol>
<p>The sand is the instrument. D1556 wants it clean, dry, free-flowing and uniformly graded — a coefficient of uniformity below 2, nothing coarser than 2.0 mm, and less than 3 % passing the No. 60 (250 µm) sieve — and it wants its bulk density re-calibrated at least every 14 days, after any large change in humidity, and for every new batch. A damp jar of sand bulks up, reads a smaller hole, and turns a passing lift into a failing one. The sand cone is slow, but it is a direct physical measurement with nothing to license, which is why it is the referee method when a nuclear gauge result is disputed.</p>
<h3>The nuclear gauge (ASTM D6938)</h3>
<figure>
  <img src="img/nuclear-gauge.jpg" width="1200" height="900" alt="A technician's boot on a yellow nuclear moisture-density gauge with its source rod lowered into the ground" loading="lazy">
  <figcaption>Direct transmission: the source rod is lowered into a pre-drilled hole and the gauge reads density and moisture in about a minute. Photo: U.S. Nuclear Regulatory Commission, CC BY 2.0.</figcaption>
</figure>
<figure>
<svg class="fig-svg" viewBox="0 0 720 260" role="img" aria-labelledby="fig4-title">
  <title id="fig4-title">Nuclear gauge in direct transmission and in backscatter</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="12" fill="var(--muted)">
    <rect x="40" y="150" width="300" height="90" fill="var(--surface2)"/>
    <rect x="380" y="150" width="300" height="90" fill="var(--surface2)"/>
    <rect x="90" y="110" width="200" height="40" rx="4" fill="var(--dark)"/>
    <rect x="430" y="110" width="200" height="40" rx="4" fill="var(--dark)"/>
    <rect x="120" y="150" width="8" height="70" fill="var(--royal)"/>
    <circle cx="124" cy="222" r="6" fill="var(--amber)"/>
    <circle cx="470" cy="152" r="6" fill="var(--amber)"/>
    <rect x="240" y="142" width="30" height="8" fill="var(--royal)"/>
    <rect x="580" y="142" width="30" height="8" fill="var(--royal)"/>
    <path d="M130 222 Q190 190 240 150" fill="none" stroke="var(--amber)" stroke-width="1.5" stroke-dasharray="4 3"/>
    <path d="M130 222 Q170 200 236 152" fill="none" stroke="var(--amber)" stroke-width="1" stroke-dasharray="4 3"/>
    <path d="M476 156 Q520 210 580 150" fill="none" stroke="var(--amber)" stroke-width="1.5" stroke-dasharray="4 3"/>
    <path d="M476 156 Q530 190 584 148" fill="none" stroke="var(--amber)" stroke-width="1" stroke-dasharray="4 3"/>
    <text x="190" y="30" text-anchor="middle" fill="var(--dark)" font-weight="600">Direct transmission</text>
    <text x="190" y="50" text-anchor="middle" fill="var(--muted)">source rod in the soil, up to 12 in. (300 mm)</text>
    <text x="190" y="66" text-anchor="middle" fill="var(--muted)">detector at the surface — the mode for soil lifts</text>
    <text x="530" y="30" text-anchor="middle" fill="var(--dark)" font-weight="600">Backscatter</text>
    <text x="530" y="50" text-anchor="middle" fill="var(--muted)">source and detector both at the surface</text>
    <text x="530" y="66" text-anchor="middle" fill="var(--muted)">reads the top 3 in. (75 mm) or so — asphalt, thin layers</text>
    <text x="60" y="180" fill="var(--muted)" font-size="11">source</text><line x1="88" y1="184" x2="118" y2="218" stroke="var(--faint)" stroke-width="0.8" stroke-dasharray="3 3"/>
    <text x="250" y="132" fill="var(--muted)" font-size="11">detector</text>
    <text x="590" y="132" fill="var(--muted)" font-size="11">detector</text>
    <text x="440" y="180" fill="var(--muted)" font-size="11">source</text>
  </g>
</svg>
<figcaption>Figure 4. Gamma photons that reach the detector are counted; the denser the soil, the fewer get through. Direct transmission measures the full lift; backscatter only its skin.</figcaption>
</figure>
<p>The gauge holds two sealed sources. Gamma photons from cesium-137 are scattered and absorbed in proportion to the density of what they pass through, so the count that reaches the detectors gives the wet density. Fast neutrons from an americium-241:beryllium source are slowed by hydrogen, and a helium-3 detector counts the slow ones, so that count gives the water content — with the caveat that <em>any</em> hydrogen counts, including chemically bound water in gypsum or the hydrogen in organics, which is why unusual soils get an oven check. The gauge then reports wet density, water content, dry density, and, if you have entered the laboratory maximum, percent compaction.</p>
<ol class="steps">
  <li><strong>Standardize.</strong> Take a standard count on the reference block at the start of each day of use, and after rough handling, so the gauge tracks source decay and drift.</li>
  <li><strong>Prepare the surface.</strong> Smooth and level a spot, fill surface voids with native fines, set the guide plate, drive the drill rod to the test depth, and remove it.</li>
  <li><strong>Seat and read.</strong> Set the gauge over the hole, lower the source rod to the depth notch, pull the gauge gently so the rod bears against the hole wall toward the detector, and take a one-minute count (four minutes when the result matters).</li>
  <li><strong>Record.</strong> Note wet density, water content, dry density and percent compaction, the test depth, and the location on the lift.</li>
</ol>
<div class="callout callout-warn"><span class="label">Watch out</span>
  <p>The sources are radioactive. The gauge is licensed by the Nuclear Regulatory Commission or an Agreement State, its operator is trained and wears a dosimeter, it travels in a locked shielded case, and the source rod goes back to the shielded position between readings. Keep bystanders back. None of this is optional, and none of it makes the gauge dangerous when the rules are followed.</p>
</div>
<figure>
  <img src="img/lift-test.jpg" width="1200" height="900" alt="A technician kneeling on a freshly rolled lift of fill holding a test identification board" loading="lazy">
  <figcaption>A density test on a freshly rolled lift; the roller pattern is still visible. Photo: USAID Vietnam / CDM Smith, public domain.</figcaption>
</figure>
<p>Whichever method you use, the water content is worth an independent check now and then: an oven sample per ASTM D2216 (110 ± 5 °C to constant mass, usually overnight) or the faster microwave method of ASTM D4643 when the crew cannot wait.</p>
```
Block B:

```html
<!-- BLOCK B -->
<h2 id="spec"><span class="num">5</span>Percent compaction and the spec</h2>
<p>The specification does not ask for a density in pounds. It asks for a fraction of what the soil can do, so that the same clause works for a silty clay and a crushed stone:</p>
<div class="eq">percent compaction = <i>γ</i><sub>d,field</sub> / <i>γ</i><sub>d,max</sub> × 100</div>
<p>Typical project language calls for 95 % of the ASTM D698 maximum dry unit weight under slabs, pavements and structural fill, and 90 % for landscaped or non-structural fill; some specifications are written against D1557 instead, usually with 90 to 95 %, which is a much stiffer requirement. Most also fix a water content window — commonly within 2 % of optimum either way — because a lift that hits the density wet of optimum will not behave like one that hit it dry. Read the clause carefully: <em>which standard</em>, <em>what percentage</em>, and <em>what moisture window</em> are three separate numbers, and "95 %" alone is not a specification.</p>
<div class="table-wrap">
<table class="ref-table ref-table--text" id="tbl-fail">
  <caption>Table 2. When a lift fails</caption>
  <thead><tr><th scope="col">Result</th><th scope="col">What it usually means</th><th scope="col">Fix, then retest</th></tr></thead>
  <tbody>
    <tr><td>Low density, dry of the window</td><td>Not enough water to lubricate the particles</td><td>Add water, mix it in, re-roll</td></tr>
    <tr><td>Low density, wet of the window</td><td>Voids full of water; rolling only pumps it</td><td>Scarify and let it dry back, then re-roll</td></tr>
    <tr><td>Low density, moisture in the window</td><td>Too few passes, or the lift is thicker than the roller reaches</td><td>More passes; thinner lifts; heavier roller</td></tr>
    <tr><td>Density fine, moisture outside the window</td><td>Right number, wrong soil structure</td><td>Rework to the window; the spec calls for both</td></tr>
  </tbody>
</table>
</div>
<p>Testing frequency is set by the spec too — typically a test per lift for every so many square feet of area or cubic yards placed, with at least one test per lift — and a test that fails means the lift is reworked and <em>retested</em>, not averaged with its neighbours. Keep the laboratory curve, the field readings, the depth and location of each test, and the moisture check together; the day someone asks why a slab cracked, that record is the answer.</p>
<div class="callout callout-key"><span class="label">Key idea</span>
  <p>Percent compaction is a ratio of two dry unit weights measured on the same soil against the same standard. A different borrow source, a different sieve fraction, or a switch from D698 to D1557 changes the denominator — and the number.</p>
</div>

<h2 id="calculator"><span class="num">6</span>Try it: from the Proctor points to a pass or fail</h2>
<p>The numbers below are example numbers, not a real test. Change any of them and the curve, the peak, and the verdict update. Wet unit weights are what you weigh in the mold; the calculator takes the water back out, fits a parabola through the dry unit weights, and compares the field test with the peak.</p>
<form id="calc" class="calc" novalidate>
  <fieldset class="calc-points">
    <legend>Proctor points — water content and wet unit weight in the mold</legend>
    <table class="calc-table">
      <thead><tr><th scope="col">Point</th><th scope="col"><i>w</i>, %</th><th scope="col"><i>γ</i><sub>wet</sub>, pcf</th><th scope="col"><i>γ</i><sub>d</sub>, pcf</th></tr></thead>
      <tbody>
        <tr><th scope="row">1</th><td><input type="number" step="0.1" name="w1" value="8.0" aria-label="Point 1 water content, percent"></td><td><input type="number" step="0.1" name="g1" value="112.3" aria-label="Point 1 wet unit weight, pcf"></td><td class="out" id="dry1">—</td></tr>
        <tr><th scope="row">2</th><td><input type="number" step="0.1" name="w2" value="10.0" aria-label="Point 2 water content, percent"></td><td><input type="number" step="0.1" name="g2" value="118.5" aria-label="Point 2 wet unit weight, pcf"></td><td class="out" id="dry2">—</td></tr>
        <tr><th scope="row">3</th><td><input type="number" step="0.1" name="w3" value="12.0" aria-label="Point 3 water content, percent"></td><td><input type="number" step="0.1" name="g3" value="122.9" aria-label="Point 3 wet unit weight, pcf"></td><td class="out" id="dry3">—</td></tr>
        <tr><th scope="row">4</th><td><input type="number" step="0.1" name="w4" value="14.0" aria-label="Point 4 water content, percent"></td><td><input type="number" step="0.1" name="g4" value="122.1" aria-label="Point 4 wet unit weight, pcf"></td><td class="out" id="dry4">—</td></tr>
        <tr><th scope="row">5</th><td><input type="number" step="0.1" name="w5" value="16.0" aria-label="Point 5 water content, percent"></td><td><input type="number" step="0.1" name="g5" value="118.0" aria-label="Point 5 wet unit weight, pcf"></td><td class="out" id="dry5">—</td></tr>
      </tbody>
    </table>
  </fieldset>
  <div class="calc-grid">
    <div class="num-field"><label for="gs">Specific gravity of solids, <i>G</i><sub>s</sub></label><div class="wrap"><input id="gs" name="gs" type="number" step="0.01" value="2.70"><span class="unit">—</span></div><p class="hint">Only for the zero-air-voids line. 2.65 to 2.75 for most soils.</p></div>
    <div class="num-field"><label for="gdf">Field dry unit weight</label><div class="wrap"><input id="gdf" name="gdf" type="number" step="0.1" value="106.5"><span class="unit">pcf</span></div><p class="hint">From the sand cone or the gauge, after removing water.</p></div>
    <div class="num-field"><label for="wf">Field water content</label><div class="wrap"><input id="wf" name="wf" type="number" step="0.1" value="11.5"><span class="unit">%</span></div></div>
    <div class="num-field"><label for="spec">Required percent compaction</label><div class="wrap"><input id="spec" name="spec" type="number" step="1" value="95"><span class="unit">%</span></div></div>
    <div class="num-field"><label for="lo">Moisture window, below optimum</label><div class="wrap"><input id="lo" name="lo" type="number" step="0.5" value="-2"><span class="unit">%</span></div></div>
    <div class="num-field"><label for="hi">Moisture window, above optimum</label><div class="wrap"><input id="hi" name="hi" type="number" step="0.5" value="2"><span class="unit">%</span></div></div>
  </div>
  <p class="calc-error" id="calc-errors" role="alert"></p>
</form>
<div class="calc-result" aria-live="polite">
  <dl class="calc-summary">
    <div><dt>Optimum water content</dt><dd id="out-wopt">—</dd></div>
    <div><dt>Maximum dry unit weight</dt><dd id="out-gdmax">—</dd></div>
    <div><dt>Percent compaction</dt><dd id="out-percent">—</dd></div>
    <div><dt>Verdict</dt><dd id="out-verdict">—</dd></div>
  </dl>
  <p id="out-notes" class="calc-notes"></p>
</div>
<figure class="calc-plot-wrap">
  <svg id="calc-plot" class="fig-svg calc-svg" viewBox="0 0 720 360" role="img" aria-label="Compaction curve plot"></svg>
  <figcaption>Figure 5. Dry unit weight against water content: the five points, the fitted curve, the zero-air-voids line, the optimum, and the field test.</figcaption>
</figure>
<noscript><p class="ref-note">The calculator needs JavaScript. With the example numbers it finds an optimum of about 11.7 % and a maximum dry unit weight of about 109.4 pcf; the field test at 106.5 pcf and 11.5 % is 97.4 % compaction and passes a 95 % specification.</p></noscript>
<p class="ref-note">Units: pcf throughout (1 pcf = 0.157 kN/m³). The curve is a least-squares parabola through the dry unit weights, which is what a hand-drawn smooth curve approximates; with points far from the peak it will warn you.</p>

<h2 id="mistakes"><span class="num">7</span>Common mistakes</h2>
<ul>
  <li><strong>Comparing against the wrong curve.</strong> A field test judged against a D1557 maximum when the spec says D698 fails a good lift; the reverse passes a bad one. Write the standard on the report.</li>
  <li><strong>Judging by wet density.</strong> A wet lift weighs more. Only the dry unit weight tells you how much soil is in the hole.</li>
  <li><strong>Forgetting the oversize.</strong> Rock that never fit in the mold makes the field material denser than the laboratory curve predicts. Apply the D4718 correction, or the fill "passes" at 102 % and nobody trusts the numbers.</li>
  <li><strong>Skipping the standard count, or testing on a rough surface.</strong> Both shift the gauge reading. Voids under the gauge read low; a missed standard count hides drift.</li>
  <li><strong>Damp sand in the cone.</strong> Sand that has picked up humidity bulks, the hole volume reads small, and the density reads high. Recalibrate.</li>
  <li><strong>Lifts thicker than the roller reaches.</strong> The top passes; the bottom stays loose, and the settlement shows up under the slab a year later. Test at the depth of the lift, not its skin.</li>
  <li><strong>Passing on density alone.</strong> A lift at 96 % but four points wet of optimum is outside the spec. Both numbers count.</li>
</ul>

<h2 id="takeaways"><span class="num">8</span>Key takeaways</h2>
<ol>
  <li>Compaction drives out <strong>air</strong>, and the number that matters is <strong>dry unit weight</strong>: <i>γ</i><sub>d</sub> = <i>γ</i><sub>wet</sub> / (1 + <i>w</i>).</li>
  <li>The <strong>Proctor test</strong> (D698 standard, D1557 modified) gives one soil's maximum dry unit weight and optimum water content for one effort — 12,400 or 56,000 ft·lbf/ft³.</li>
  <li>The <strong>field test</strong> — sand cone or nuclear gauge — gives the dry unit weight of the lift; <strong>percent compaction</strong> is the ratio, typically specified at 95 % with a moisture window.</li>
  <li>A failed test is reworked and <strong>retested</strong>; the fix depends on whether the lift was dry, wet, or simply under-rolled.</li>
</ol>

<p class="ref-note">Sources: ASTM D698 and D1557 (laboratory compaction, standard and modified effort); ASTM D1556/D1556M (sand cone); ASTM D6938 (nuclear methods, shallow depth); ASTM D2216 and D4643 (water content); ASTM D4718 (oversize correction). Specification values are typical project language, not ASTM requirements.</p>
<p class="ref-note">Photo credits: <a href="https://commons.wikimedia.org/wiki/File:Landscape_shaping_at_Brunnsh%C3%B6g,_Lund,_Sweden.jpg">Landscape shaping at Brunnshög</a> by Nixdorf, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>; <a href="https://commons.wikimedia.org/wiki/File:Proctor_device1.JPG">Proctor device 1</a> by Zaher.Kadour, <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>; <a href="https://commons.wikimedia.org/wiki/File:Moisture_Density_Guage_(7845749948).jpg">Moisture density gauge</a> by the U.S. Nuclear Regulatory Commission, <a href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a>; <a href="https://commons.wikimedia.org/wiki/File:Seabees_compactor_roller.jpg">Seabees compactor roller</a>, U.S. Air Force photo, public domain; <a href="https://commons.wikimedia.org/wiki/File:Caterpillar_CS_663E_Vibratory_soil_compacter._Spielvogel_1.jpg">Caterpillar CS 663E vibratory soil compactor</a> by Spielvogel, <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>; <a href="https://commons.wikimedia.org/wiki/File:Testing_compaction_of_soil_sediment_placed_in_the_thermal_treatment._(26203673263).jpg">Testing compaction of soil sediment</a>, USAID Vietnam / CDM Smith, public domain; all via Wikimedia Commons. The photos were resized and recompressed for the web.</p>

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

- [ ] **Step 2: Write `calc.js` (DOM + SVG only; all math comes from `compaction.js`)**

Create `site/study/soil-compaction/calc.js`:

```js
// site/study/soil-compaction/calc.js — 계산기 화면: 입력 읽기 → compaction.js 계산 → 결과 표시 + SVG 플롯 (ES module)
import { fitProctor, zavDensity, evaluate, validate } from './compaction.js';

const $ = id => document.getElementById(id);
const form = $('calc');
if (form) {
  const SVG = 'http://www.w3.org/2000/svg';
  const num = name => parseFloat(form.elements[name].value);
  const fmt = (v, d = 1) => Number.isFinite(v) ? v.toFixed(d) : '—';

  function readInputs() {
    const errors = [];
    const points = [];
    for (let i = 1; i <= 5; i++) {
      const w = num('w' + i), wet = num('g' + i);
      if (form.elements['w' + i].value === '' && form.elements['g' + i].value === '') continue; // 빈 행은 무시
      const ew = validate('w', w), eg = validate('wet', wet);
      if (ew) errors.push(`Point ${i} water content: ${ew}.`);
      if (eg) errors.push(`Point ${i} wet unit weight: ${eg}.`);
      if (!ew && !eg) points.push({ w, wet });
    }
    const fields = { gs: ['Gs', 'Specific gravity'], gdf: ['gd', 'Field dry unit weight'], wf: ['w', 'Field water content'],
      spec: ['spec', 'Required compaction'], lo: ['window', 'Moisture window (below)'], hi: ['window', 'Moisture window (above)'] };
    const v = {};
    for (const [name, [limit, label]] of Object.entries(fields)) {
      v[name] = num(name);
      const e = validate(limit, v[name]);
      if (e) errors.push(`${label}: ${e}.`);
    }
    if (Number.isFinite(v.lo) && Number.isFinite(v.hi) && v.lo > v.hi) errors.push('Moisture window: the lower limit must not exceed the upper limit.');
    return { points, ...v, errors };
  }

  function el(tag, attrs, text) {
    const n = document.createElementNS(SVG, tag);
    for (const [k, val] of Object.entries(attrs)) n.setAttribute(k, val);
    if (text != null) n.textContent = text;
    return n;
  }

  // 플롯: x = 함수비(%), y = 건조단위중량(pcf). 색은 theme.css 토큰만 쓴다.
  function draw(fit, gs, field) {
    const svg = $('calc-plot');
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const L = 76, R = 700, T = 24, B = 306; // 플롯 영역
    const xMin = fit.wMin - 2, xMax = fit.wMax + 2;
    const dryVals = fit.points.map(p => p.dry).concat(Number.isFinite(field.gd) ? [field.gd] : []);
    const yMin = Math.floor(Math.min(...dryVals) - 4), yMax = Math.ceil(Math.max(...dryVals, fit.gdMax) + 8);
    const X = w => L + (w - xMin) / (xMax - xMin) * (R - L);
    const Y = g => B - (g - yMin) / (yMax - yMin) * (B - T);
    const g = el('g', { 'font-family': 'var(--font-mono)', 'font-size': '12', fill: 'var(--muted)' });
    svg.appendChild(g);
    // 격자·축
    for (let w = Math.ceil(xMin); w <= xMax; w += 2) {
      g.appendChild(el('line', { x1: X(w), y1: T, x2: X(w), y2: B, stroke: 'var(--border)', 'stroke-width': 1 }));
      g.appendChild(el('text', { x: X(w), y: B + 18, 'text-anchor': 'middle' }, String(w)));
    }
    const yStep = (yMax - yMin) > 30 ? 10 : 5;
    for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
      g.appendChild(el('line', { x1: L, y1: Y(y), x2: R, y2: Y(y), stroke: 'var(--border)', 'stroke-width': 1 }));
      g.appendChild(el('text', { x: L - 8, y: Y(y) + 4, 'text-anchor': 'end' }, String(y)));
    }
    g.appendChild(el('line', { x1: L, y1: B, x2: R, y2: B, stroke: 'var(--dark)', 'stroke-width': 1.5 }));
    g.appendChild(el('line', { x1: L, y1: T, x2: L, y2: B, stroke: 'var(--dark)', 'stroke-width': 1.5 }));
    g.appendChild(el('text', { x: (L + R) / 2, y: 344, 'text-anchor': 'middle', fill: 'var(--dark)' }, 'water content, w (%)'));
    g.appendChild(el('text', { x: 18, y: (T + B) / 2, 'text-anchor': 'middle', fill: 'var(--dark)', transform: `rotate(-90 18 ${(T + B) / 2})` }, 'dry unit weight (pcf)'));
    // 영공기간극선(플롯 범위 안만)
    if (Number.isFinite(gs)) {
      const pts = [];
      for (let i = 0; i <= 60; i++) { const w = xMin + (xMax - xMin) * i / 60, z = zavDensity(gs, w); if (z >= yMin && z <= yMax) pts.push(`${X(w).toFixed(1)},${Y(z).toFixed(1)}`); }
      if (pts.length > 1) g.appendChild(el('polyline', { points: pts.join(' '), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2, 'stroke-dasharray': '7 5' }));
      g.appendChild(el('text', { x: R - 4, y: T + 14, 'text-anchor': 'end', fill: 'var(--amber)' }, `zero air voids, Gs = ${fmt(gs, 2)}`));
    }
    // 적합 곡선(시험 범위 안)
    if (!fit.flags.includes('no-peak')) {
      const pts = [];
      for (let i = 0; i <= 40; i++) { const w = fit.wMin + (fit.wMax - fit.wMin) * i / 40; pts.push(`${X(w).toFixed(1)},${Y(fit.a * w * w + fit.b * w + fit.c).toFixed(1)}`); }
      g.appendChild(el('polyline', { points: pts.join(' '), fill: 'none', stroke: 'var(--royal)', 'stroke-width': 3 }));
      g.appendChild(el('line', { x1: X(fit.wOpt), y1: Y(fit.gdMax), x2: X(fit.wOpt), y2: B, stroke: 'var(--royal)', 'stroke-width': 1, 'stroke-dasharray': '4 4' }));
      g.appendChild(el('text', { x: X(fit.wOpt) + 6, y: Y(fit.gdMax) - 8, fill: 'var(--royal)' }, `optimum ${fmt(fit.wOpt)} % · ${fmt(fit.gdMax)} pcf`));
    }
    for (const p of fit.points) g.appendChild(el('circle', { cx: X(p.w), cy: Y(p.dry), r: 5, fill: 'var(--royal)', stroke: 'var(--bg)', 'stroke-width': 1.5 }));
    // 현장 점(마름모)
    if (Number.isFinite(field.gd) && Number.isFinite(field.w)) {
      const x = X(field.w), y = Y(field.gd);
      g.appendChild(el('polygon', { points: `${x},${y - 7} ${x + 7},${y} ${x},${y + 7} ${x - 7},${y}`, fill: field.pass ? 'var(--green)' : 'var(--amber)', stroke: 'var(--dark)', 'stroke-width': 1 }));
      g.appendChild(el('text', { x: x + 10, y: y + 4, fill: 'var(--dark)' }, `field ${fmt(field.gd)} pcf`));
    }
    svg.setAttribute('aria-label', `Compaction curve: optimum ${fmt(fit.wOpt)} percent, maximum dry unit weight ${fmt(fit.gdMax)} pcf; field test ${fmt(field.gd)} pcf at ${fmt(field.w)} percent`);
  }

  function update() {
    const inp = readInputs();
    $('calc-errors').textContent = inp.errors.join(' ');
    const fit = fitProctor(inp.points);
    for (let i = 1; i <= 5; i++) { const p = fit.points[i - 1]; $('dry' + i).textContent = p ? fmt(p.dry) : '—'; }
    if (fit.error || inp.errors.length) {
      for (const id of ['out-wopt', 'out-gdmax', 'out-percent', 'out-verdict']) $(id).textContent = '—';
      $('out-verdict').className = '';
      $('out-notes').textContent = fit.error || 'Fix the highlighted inputs to see a result.';
      return;
    }
    const res = evaluate({ gdField: inp.gdf, wField: inp.wf, gdMax: fit.gdMax, wOpt: fit.wOpt, specPct: inp.spec, lo: inp.lo, hi: inp.hi });
    $('out-wopt').textContent = `${fmt(fit.wOpt)} %`;
    $('out-gdmax').textContent = `${fmt(fit.gdMax)} pcf`;
    $('out-percent').textContent = `${fmt(res.percent)} % of ${fmt(fit.gdMax)} pcf`;
    const verdict = $('out-verdict');
    verdict.textContent = res.pass ? 'PASS' : 'FAIL';
    verdict.className = res.pass ? 'verdict-pass' : 'verdict-fail';
    const notes = [];
    if (res.reasons.length) notes.push(`Reasons: ${res.reasons.join(', ')} (window ${fmt(fit.wOpt + inp.lo)} to ${fmt(fit.wOpt + inp.hi)} %).`);
    if (fit.flags.includes('no-peak')) notes.push('The points do not show a peak; the highest point is used. Add points on the other side of the optimum.');
    if (fit.flags.includes('outside-range')) notes.push('The fitted optimum lies outside the tested water contents; add a point beyond it before trusting the maximum.');
    $('out-notes').textContent = notes.join(' ');
    draw(fit, inp.gs, { gd: inp.gdf, w: inp.wf, pass: res.pass });
  }

  form.addEventListener('input', update);
  form.addEventListener('submit', e => { e.preventDefault(); update(); });
  update();
}
```

- [ ] **Step 3: Calculator styles (tokens only)**

In `site/study/article.css`, insert before the line `@media (max-width:900px) {`:

```css
/* 계산기(다짐 관리 글): 입력 격자·결과·플롯 — 토큰만 */
.calc { margin:24px 0 8px; padding:20px 22px; background:var(--bg); border:1px solid var(--border); border-radius:var(--radius); }
.calc fieldset { border:0; padding:0; margin:0 0 8px; min-width:0; }
.calc legend { font:600 11.5px/1 var(--font-mono); letter-spacing:.12em; text-transform:uppercase; color:var(--muted); margin-bottom:10px; }
.calc-table { border-collapse:collapse; width:100%; max-width:440px; }
.calc-table th, .calc-table td { padding:4px 6px; text-align:right; font:500 13px/1.4 var(--font-mono); color:var(--muted); }
.calc-table th[scope="col"] { font-size:11px; letter-spacing:.06em; text-transform:uppercase; border-bottom:1px solid var(--border); }
.calc-table input { width:6.5em; padding:6px 8px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg);
  color:var(--text); font:500 14px/1.2 var(--font-mono); text-align:right; }
.calc-table input:focus { outline:0; border-color:var(--royal); box-shadow:0 0 0 3px var(--surface2); }
.calc-table .out { color:var(--dark); font-weight:600; }
.calc-grid { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:4px 20px; }
.calc .num-field { margin:10px 0 0; }
.calc .num-field .wrap { max-width:none; }
.calc-error { min-height:1.4em; margin:12px 0 0; font:500 13px/1.4 var(--font-mono); color:var(--amber); }
.calc-result { margin:16px 0 0; padding:18px 22px; background:var(--icy); border-left:4px solid var(--royal); border-radius:var(--radius); }
.calc-summary { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:12px; margin:0; }
.calc-summary dt { font:600 11px/1 var(--font-mono); letter-spacing:.1em; text-transform:uppercase; color:var(--muted); margin-bottom:6px; }
.calc-summary dd { margin:0; font:700 18px/1.3 var(--font); color:var(--dark); }
.verdict-pass, .verdict-fail { display:inline-block; padding:2px 10px; border-radius:var(--radius-sm); font:800 16px/1.5 var(--font-head); letter-spacing:.04em; }
.verdict-pass { background:var(--green-50); color:var(--green); }
.verdict-fail { background:var(--amber-50); color:var(--amber); }
.calc-notes { margin:12px 0 0; font-size:14px; color:var(--muted); }
.calc-notes:empty { display:none; }
.calc-plot-wrap { margin-top:20px; }
```

And inside the existing `@media (max-width:700px)` block add:

```css
  .calc-grid, .calc-summary { grid-template-columns:1fr 1fr; }
  .calc { padding:16px; }
```

- [ ] **Step 4: Register the page with the guards**

In `tools/site-guards.test.mjs`: add `'study/soil-compaction/index.html'` to the `files` array of the tokens-only test and to `ARTICLE_PAGES`. Also add `'study/soil-compaction/calc.js'` to the tokens-only list (the regex applies to JS text just as well — `var(--x)` contains no `#`).

- [ ] **Step 5: Run the gate and look at the page**

Run: `node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs tools/study-tables.test.mjs tools/site-guards.test.mjs tools/layout.test.mjs tools/props.test.mjs tools/decor.test.mjs tools/compaction.test.mjs`
Expected: all pass (registry tests still pass because the page is not yet in MATERIALS — Task 4 adds it).

Start a dev server on a free port (`python tools/devserver.py 8766 site`, background) and capture with the CDP driver `D:\Codex\Temp\claude\D--Projects-Test\d64fe480-de3e-4585-8fe0-f5b32b07ce45\scratchpad\verify\cdp-shot.mjs <url> <steps.json>` (1440×900; steps `{eval, wait, shot}`; eval is an async body with `return`). Steps to include, each with a screenshot:
1. On load: `return {wopt: document.getElementById('out-wopt').textContent, gdmax: document.getElementById('out-gdmax').textContent, pct: document.getElementById('out-percent').textContent, verdict: document.getElementById('out-verdict').textContent, plotNodes: document.getElementById('calc-plot').childNodes.length, imgs:[...document.images].map(i=>i.complete&&i.naturalWidth>0)}` → expect `11.7 %`, `109.4 pcf`, `97.4 % of 109.4 pcf`, `PASS`, plotNodes > 0.
2. Set `gdf` to 100 and dispatch `input` → verdict `FAIL`, notes contain `density below spec`.
3. Set `wf` to 15 → notes contain `too wet`.
4. Set `w2` to 45 → `#calc-errors` non-empty, outputs `—`.
5. Restore defaults (`form.reset()` + dispatch input) → PASS again.
Then a 390 px run with `verify-room/cdp-shot-390.mjs`: `document.documentElement.scrollWidth === 390`, the calculator grid shows two columns, the plot is visible. Read every screenshot and fix anything wrong (overlapping labels, clipped text, unreadable inputs) before committing.

- [ ] **Step 6: Commit**

```bash
git add site/study/soil-compaction/index.html site/study/soil-compaction/calc.js site/study/article.css tools/site-guards.test.mjs && git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 다짐 관리 글 — 본문 8절·SVG 도해 4장·사진 6장·미니 계산기(calc.js) + 계산기 스타일, 가드 목록 갱신

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 4: Registry entry, README, and whole-page verification

**Files:**
- Modify: `site/shared/registry.js` (MATERIALS entry after `slump-test`; STUDY_GROUPS materials blurb)
- Modify: `tools/registry.test.mjs` (page id list)
- Modify: `README.md` (structure + test command)

- [ ] **Step 1: Update the registry test first (it must fail)**

In `tools/registry.test.mjs` change the expected page ids to `['mix-design-1', 'mix-design-2', 'slump-test', 'soil-compaction']` and the test name to `'MATERIALS: 믹스 디자인 2편·슬럼프·다짐 글이 등록돼 있고 page href 가 실제 파일을 가리킨다'`. Run `node --test tools/registry.test.mjs` → expect 1 failure.

- [ ] **Step 2: Add the entry and the blurb**

In `site/shared/registry.js`, after the `slump-test` entry add:

```js
    { id: 'soil-compaction', group: 'materials', type: 'page', title: 'Compaction control: the Proctor test and field density',
      desc: 'How fill is specified and checked — the Proctor curve, sand cone and nuclear gauge tests, percent compaction, and a calculator to try it.',
      href: 'soil-compaction/' },
```

and change the materials STUDY_GROUPS blurb to `'Concrete, aggregates, soils, and mix design.'`. Run `node --test tools/registry.test.mjs` → all pass.

- [ ] **Step 3: README**

In `README.md`: add `site/study/soil-compaction/` (index.html + compaction.js + calc.js + img/) to the structure list next to the other Study pages, and add `tools/compaction.test.mjs` to the test command.

- [ ] **Step 4: Full gate + Study index capture**

Run the full test command (Global Constraints) → all pass (expect 55 + 10 = 65 tests). Capture `http://localhost:8766/study/` at 1440 px and confirm a fourth Materials card "Compaction control: the Proctor test and field density" with an "Open →" button linking to `soil-compaction/`, and that the blurb reads "Concrete, aggregates, soils, and mix design."

- [ ] **Step 5: Commit**

```bash
git add site/shared/registry.js tools/registry.test.mjs README.md && git -c core.quotepath=false commit -F - <<'EOF'
feat: 레지스트리에 다짐 관리 글 등록(Materials 설명에 soils 추가), registry 테스트·README 갱신

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

## Self-review notes

- Spec coverage: §1 page/sections/diagrams/photos → Task 3 (block A/B) + Task 2; calculator §2 → Tasks 1 and 3; CSS → Task 3; registry/blurb → Task 4; tests/guards → Tasks 1, 2, 3, 4; verification → Task 3 step 5, Task 4 step 4, then the final review and finishing flow (merge locally, deploy, live check with calculator interaction).
- Names used across tasks: `fitProctor`, `zavDensity`, `evaluate`, `validate` (Task 1) are the only imports in `calc.js` (Task 3); DOM ids in block B match `calc.js`; photo pixel sizes in block A/B match Task 2 outputs.
- Read time: recompute after Task 3 with the word-count script (strip tables, SVG, captions, form) and correct the byline if it is not 11 min.
