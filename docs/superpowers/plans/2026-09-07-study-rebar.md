# Study "Testing reinforcing steel: the tension test" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a seventh Study article — how reinforcing bars are specified (ASTM A615 grades, sizes, markings), how the tension test and the bend test of ASTM A370 / A615 measure yield, tensile strength, elongation and ductility, a worked example for a #5 Grade 60 bar, and how mill certificates and retests work — as a static page with four SVG diagrams, four data tables and six CC/PD photos. No calculator.

**Architecture:** One static page `site/study/rebar-tension/index.html` on the existing article template (`article.css` + `article.js`, no new CSS). The numbers in the page's tables are guarded by a new node test that re-derives them (bar geometry, A615 minimums, pin multiples, the worked example) from the HTML. Same photo pipeline, guards and registry pattern as the previous articles.

**Tech Stack:** Static HTML/CSS, inline SVG, Node 20 `node --test`, Python 3 + Pillow.

**Spec:** `docs/superpowers/specs/2026-09-07-study-rebar-design.md`. Research notes: `D:\Codex\Temp\claude\D--Projects-Test\d64fe480-de3e-4585-8fe0-f5b32b07ce45\scratchpad\steel-research\research.txt`. Reference page for the template: `site/study/concrete-cylinders/index.html`.

## Global Constraints

- Work in the worktree `D:\Projects\Test\.claude\worktrees\study-rebar` (branch `worktree-study-rebar`). Never touch `D:\Projects\Test` directly.
- No course code: the uppercase string `CNST` must not appear anywhere under `site/`. No department or university name.
- Tokens only — no literal colours (`#rgb`, `#rrggbb`) in the new page (inline SVG included; SVG attributes use `var(--token)`). Never write a bar size as `#100` or any `#` followed by three or more hex-looking characters (the guard regex `#[0-9a-fA-F]{3,8}\b` would trip); bar sizes go up to `#18`, and Grade 100 is written "Grade 100".
- Footer text exactly `© <span id="year"></span> Jisoo Park. All rights reserved.`; English article; Korean code comments; no logos/emoji.
- Numbers in the article come only from ASTM A615 (Table 1 sizes, grade minimums, elongation, bend pins, markings), A370 (full-size specimen, nominal area, 8 in. gauge length), A706 Grade 60 (60–78 ksi, ≥ 80 ksi and ≥ 1.25 × measured yield, 14 % for the small sizes) and ACI 318-19 (§20.2.1.2 two yield methods, E = 29,000,000 psi), as recorded in research.txt §1–2. CAVEAT items (strain-rate limit, old extension-under-load percentages, retest margins, test-frequency clause numbers, typical mill values, A706 pin sizes) stay qualitative. The worked example is labelled "example numbers".
- Photo credits: caption with author + licence, plus a credits paragraph linking each Commons file page and each licence deed, and the sentence "The photos were resized, cropped and recompressed for the web."
- Every `<img>` carries `width`/`height` equal to the real pixel size; every photo ≤ 220 KB and ≤ 1200 px on the long side; the per-folder photo guard expects exactly 6 files in `study/rebar-tension/img`.
- Commit format: `git add <files> && git -c core.quotepath=false commit -F - <<'EOF' … EOF`, Korean message, trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. One plain command or one heredoc per Bash call; no `cd` outside the worktree, no `&&` chains longer than `git add … && git commit …`. Create files with the Write tool (UTF-8).
- Test gate (all must pass before every commit): `node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs tools/study-tables.test.mjs tools/site-guards.test.mjs tools/layout.test.mjs tools/props.test.mjs tools/decor.test.mjs tools/compaction.test.mjs tools/cylinders.test.mjs tools/gradation.test.mjs tools/rebar.test.mjs` (`tools/rebar.test.mjs` exists from Task 2 on; before that, run the gate without it).

## File Structure

- Create `site/study/rebar-tension/img/{rebar-closeup,rebar-bundles,tying-rebar,testing-machine,fracture,rebar-bender}.jpg` (Task 1); modify `tools/site-guards.test.mjs` photo dictionary (Task 1).
- Create `site/study/rebar-tension/index.html` and `tools/rebar.test.mjs` (Task 2); modify `tools/site-guards.test.mjs` tokens-only list + `ARTICLE_PAGES` (Task 2).
- Modify `site/shared/registry.js`, `tools/registry.test.mjs`, `README.md` (Task 3).

---

### Task 1: Photos (crop, resize, recompress) + photo-budget guard entry

**Files:**
- Create: `site/study/rebar-tension/img/rebar-closeup.jpg`, `rebar-bundles.jpg`, `tying-rebar.jpg`, `testing-machine.jpg`, `fracture.jpg`, `rebar-bender.jpg`
- Modify: `tools/site-guards.test.mjs` (per-folder photo test dictionary and its name)
- Inputs (already downloaded from Wikimedia Commons, user-authorized; not committed): `D:\Codex\Temp\claude\D--Projects-Test\d64fe480-de3e-4585-8fe0-f5b32b07ce45\scratchpad\steel-research\orig\` and the verified script `D:\Codex\Temp\claude\D--Projects-Test\d64fe480-de3e-4585-8fe0-f5b32b07ce45\scratchpad\steel-research\prep.py`

**Interfaces:**
- Produces (exact pixel sizes used by Task 2): rebar-closeup 1200×739, rebar-bundles 1200×900, tying-rebar 1200×798, testing-machine 900×1200, fracture 900×1200, rebar-bender 824×618.

- [ ] **Step 1: Run the prepared script** (one Bash call, from the worktree root):

```bash
python "D:/Codex/Temp/claude/D--Projects-Test/d64fe480-de3e-4585-8fe0-f5b32b07ce45/scratchpad/steel-research/prep.py" "D:/Codex/Temp/claude/D--Projects-Test/d64fe480-de3e-4585-8fe0-f5b32b07ce45/scratchpad/steel-research/orig" site/study/rebar-tension/img
```

Expected output (byte counts may differ by a few hundred):

```
rebar-closeup.jpg (1200, 739) 211599 bytes q 80
rebar-bundles.jpg (1200, 900) 220657 bytes q 60
tying-rebar.jpg (1200, 798) 220661 bytes q 80
testing-machine.jpg (900, 1200) 147372 bytes q 80
fracture.jpg (900, 1200) 88805 bytes q 80
rebar-bender.jpg (824, 618) 85985 bytes q 85
```

The script crops with fixed boxes (testing machine to 3:4, fracture coupon to 3:4, bender to 4:3), resizes with LANCZOS, drops EXIF by re-encoding an RGB copy, and lowers JPEG quality in steps of 4 until the file is ≤ 220 KB. Open all six outputs with the Read tool and confirm: a stack of rusty deformed bars; bundles of bars seen from above; gloved hands tying bars on a slab; a technician beside a tall testing machine; the torn end of a flat steel coupon; the jaws of a hand bender gripping a bar. Stop with NEEDS_CONTEXT if any file is missing or shows something else.

- [ ] **Step 2: Extend the per-folder photo guard**

In `tools/site-guards.test.mjs`, the per-folder test's dictionary becomes `{ 'study/slump-test/img': 7, 'study/soil-compaction/img': 6, 'study/concrete-cylinders/img': 7, 'study/aggregate-gradation/img': 4, 'study/rebar-tension/img': 6 }` and the test name becomes `'Study 글 사진 폴더(slump 7 · soil 6 · cylinders 7 · gradation 4 · rebar 6)의 모든 파일이 .jpg 이고 각 220 KB 이하다'`. Nothing else changes.

- [ ] **Step 3: Run the guards** — `node --test tools/site-guards.test.mjs` → all pass (the dictionary test now covers five folders).

- [ ] **Step 4: Commit**

```bash
git add site/study/rebar-tension/img tools/site-guards.test.mjs && git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 철근 인장시험 글 — Commons 사진 6장(≤1200 px·3:4/4:3 크롭·EXIF 제거·≤220 KB), 사진 예산 가드에 폴더 추가

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 2: The article page + table-integrity test + guard registration

**Files:**
- Create: `site/study/rebar-tension/index.html` (block A + block B below, concatenated, marker comments removed)
- Create: `tools/rebar.test.mjs`
- Modify: `tools/site-guards.test.mjs` (tokens-only `files` list and `ARTICLE_PAGES`)
- Modify: `site/study/article.css` (one rule after `.ref-table--text`)

**Interfaces:**
- Consumes: the six photo sizes from Task 1.
- Produces: table ids `tbl-sizes`, `tbl-example` (with `data-area`, `data-diameter`, `data-yield-load`, `data-max-load`, `data-gauge`, `data-final`, `data-pin-mult` on the `<table>` and `data-result` on each result cell), `tbl-a615`, `tbl-bend` (with `data-mult` on pin cells) — the exact markup below is what `tools/rebar.test.mjs` parses; do not restructure the rows.

- [ ] **Step 1: Write the page (block A, then block B)**

Extract the two fenced `html` blocks marked `<!-- BLOCK A -->` / `<!-- BLOCK B -->` from the brief with a script (as for the previous articles), remove the marker lines, write `site/study/rebar-tension/index.html`, confirm it starts with `<!doctype html>` and ends with `</html>`.

Block A:

```html
<!-- BLOCK A -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Testing reinforcing steel: the tension test — Construction Study Lab</title>
<meta name="description" content="What ASTM A615 asks of a reinforcing bar — grade, tensile strength, elongation and the bend — how the tension test (ASTM A370) measures each, and how to read the result and the mill certificate.">
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
  <p class="eyebrow">Materials · Reinforcing steel</p>
  <h1>Testing reinforcing steel</h1>
  <p class="lede">A reinforcing bar is bought by its grade and proven by a pull. What ASTM A615 asks of the bar, how the tension and bend tests of ASTM A370 measure it, and how to read the numbers on a mill certificate.</p>
  <p class="byline">Jisoo Park · September 2026 · 12 min read</p>
</div></section>

<main class="article-layout">
<nav class="toc" aria-label="Contents">
  <h2>Contents</h2>
  <ol>
    <li><a href="#why">1. What the bar has to do</a></li>
    <li><a href="#bar">2. Reading the bar</a></li>
    <li><a href="#test">3. The tension test, step by step</a></li>
    <li><a href="#example">4. Worked example</a></li>
    <li><a href="#bend">5. The bend test</a></li>
    <li><a href="#certs">6. Certificates, sampling and retests</a></li>
    <li><a href="#mistakes">7. Common mistakes</a></li>
    <li><a href="#takeaways">8. Key takeaways</a></li>
  </ol>
</nav>

<article class="article">

<h2 id="why"><span class="num">1</span>What the bar has to do</h2>
<figure>
  <img src="img/rebar-closeup.jpg" width="1200" height="739" alt="Close view of a stack of rusty deformed reinforcing bars, their transverse ribs catching the light" loading="eager">
  <figcaption>Deformed bars stacked at a quarry site. The ribs are for bond with the concrete; the steel inside them is what the tension test measures. Photo: W.carter, Wikimedia Commons, CC BY-SA 4.0.</figcaption>
</figure>
<p>Concrete carries compression well and tension badly, so every beam, slab and column has steel inside it to take the tension. The drawings call for that steel by one number: the grade. A Grade 60 bar is a bar whose <em>specified yield strength</em>, <i>f</i><sub>y</sub>, is 60,000 psi (60 ksi). ASTM A615, the specification for deformed carbon-steel bars, defines Grades 40, 60, 75 and 80 (and, in its latest editions, Grade 100). Grade 60 is the everyday bar of North American construction; Grade 40 survives mainly in the small sizes.</p>
<div class="callout callout-def"><span class="label">Definitions</span>
  <p><strong>Yield strength</strong> is the stress at which the bar stops behaving elastically and begins to stretch permanently — the number the design is built on. <strong>Tensile strength</strong> is the highest stress the bar carries before it breaks. <strong>Elongation</strong> is how much a marked 8 in. length has stretched when the bar is fitted back together after the break, as a percentage. The <strong>bend test</strong> wraps a bar 180° around a pin and looks for cracks.</p>
</div>
<p>Why four requirements and not one? Because the design uses only the first. A beam is proportioned so that its steel reaches <i>f</i><sub>y</sub> before the concrete crushes; everything the bar can carry above <i>f</i><sub>y</sub> is reserve. But the reserve is worth nothing unless the bar can stretch far enough to reach it. A bar that snapped at one percent strain would fail a beam without a crack or a sag to warn anyone. The elongation minimum and the bend test are there to guarantee the ductility the design assumes: the bar must be able to stretch several percent — many times its elastic strain — and still hang on.</p>
<div class="callout callout-key"><span class="label">Key idea</span>
  <p>The grade is a <em>minimum</em>, not a target. A Grade 60 bar that yields at 68 ksi is normal and accepted; one that yields at 59 ksi is rejected. The design counts on the minimum and treats the rest as reserve.</p>
</div>
<p>In one situation the reserve itself has to be bounded. Seismic design deliberately lets chosen bars yield and asks the rest of the structure to stay stronger than them; a bar much stronger than its grade defeats that plan by pushing the failure into the concrete or the joint. So ASTM A706, the low-alloy bar for welding and seismic detailing, sets a ceiling as well as a floor: Grade 60 yield between 60 and 78 ksi, tensile strength at least 80 ksi <em>and</em> at least 1.25 times the measured yield, and more elongation (14 % for the small sizes). ACI 318 requires A706 bars — or A615 bars that meet the same extra limits — in special seismic systems.</p>

<h2 id="bar"><span class="num">2</span>Reading the bar</h2>
<figure>
  <img src="img/rebar-bundles.jpg" width="1200" height="900" alt="Bundles of straight and bent reinforcing bars laid out on the ground at a construction site, seen from above" loading="lazy">
  <figcaption>Bars arrive bundled by size and shape; the marks rolled into them say what each one is. Photo: Vsolymossy, Wikimedia Commons, CC BY 3.0.</figcaption>
</figure>
<p>Bar sizes are numbers, and the number is the nominal diameter in eighths of an inch: a #5 bar is 5/8 in. across, a #8 bar is 1 in. That holds exactly up to #8. The five larger sizes are the round bars that replaced the old square ones — #9, #10, #11, #14 and #18 have the areas of 1, 1 1/8, 1 1/4, 1 1/2 and 2 in. square bars — which is why a #9 bar is 1.128 in. across rather than 1.125. Every size also has a <em>nominal area</em> and a <em>nominal weight</em>: those of a plain round bar of the nominal diameter, deformations not counted. The nominal area is what stress is figured on, in the laboratory and in the design office alike. The metric name is simply the diameter in millimetres.</p>
<div class="table-wrap">
<table class="ref-table" id="tbl-sizes">
  <caption>Table 1. Standard bar sizes (ASTM A615, Table 1)</caption>
  <thead><tr><th scope="col">Bar</th><th scope="col">Metric name</th><th scope="col">Nominal diameter, in.</th><th scope="col">Nominal area, in.²</th><th scope="col">Nominal weight, lb/ft</th></tr></thead>
  <tbody>
    <tr><th scope="row">#3</th><td>#10</td><td>0.375</td><td>0.11</td><td>0.376</td></tr>
    <tr><th scope="row">#4</th><td>#13</td><td>0.500</td><td>0.20</td><td>0.668</td></tr>
    <tr><th scope="row">#5</th><td>#16</td><td>0.625</td><td>0.31</td><td>1.043</td></tr>
    <tr><th scope="row">#6</th><td>#19</td><td>0.750</td><td>0.44</td><td>1.502</td></tr>
    <tr><th scope="row">#7</th><td>#22</td><td>0.875</td><td>0.60</td><td>2.044</td></tr>
    <tr><th scope="row">#8</th><td>#25</td><td>1.000</td><td>0.79</td><td>2.670</td></tr>
    <tr><th scope="row">#9</th><td>#29</td><td>1.128</td><td>1.00</td><td>3.400</td></tr>
    <tr><th scope="row">#10</th><td>#32</td><td>1.270</td><td>1.27</td><td>4.303</td></tr>
    <tr><th scope="row">#11</th><td>#36</td><td>1.410</td><td>1.56</td><td>5.313</td></tr>
    <tr><th scope="row">#14</th><td>#43</td><td>1.693</td><td>2.25</td><td>7.65</td></tr>
    <tr><th scope="row">#18</th><td>#57</td><td>2.257</td><td>4.00</td><td>13.60</td></tr>
  </tbody>
</table>
</div>
<p class="ref-note">Grade 40 bars are made in sizes #3 to #6 only. The two largest sizes, #14 and #18, are column bars; in the bend test they are bent 90° rather than 180°.</p>
<p>Every bar carries its identity rolled into one face, read in order along the bar: the producer's mill mark, the size number, a letter for the kind of steel — <strong>S</strong> for A615 carbon steel, <strong>W</strong> for A706 low-alloy steel, both letters for a bar certified to both — and the grade. Grade 60 is shown as a "60" or as one continuous longitudinal line running through at least five deformation spaces; Grade 75 as "75" or two lines, Grade 80 as "80" or three. A Grade 40 bar has no grade mark at all.</p>
<figure>
<svg class="fig-svg" viewBox="0 0 720 264" role="img" aria-labelledby="fig1-title">
  <title id="fig1-title">Bar markings: mill mark, size, steel type and grade, and the grade-line alternative</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="12" fill="var(--muted)">
    <rect x="60" y="60" width="600" height="80" rx="6" fill="var(--icy)" stroke="var(--dark)" stroke-width="2"/>
    <path d="M84,62 l8,76 M108,62 l8,76 M204,62 l8,76 M228,62 l8,76 M324,62 l8,76 M348,62 l8,76 M444,62 l8,76 M468,62 l8,76 M492,62 l8,76 M516,62 l8,76 M588,62 l8,76 M612,62 l8,76 M636,62 l8,76" stroke="var(--dark)" stroke-width="2" fill="none"/>
    <g font-family="var(--font-head)" font-weight="800" font-size="34" fill="var(--dark)" text-anchor="middle">
      <text x="160" y="112">H</text><text x="280" y="112">5</text><text x="400" y="112">S</text><text x="560" y="112">60</text>
    </g>
    <path d="M160,52 v22 M280,52 v22 M400,52 v22 M560,52 v22" stroke="var(--muted)" stroke-width="1.5" fill="none"/>
    <g text-anchor="middle" fill="var(--dark)">
      <text x="160" y="30">mill mark</text><text x="280" y="30">bar size</text><text x="400" y="30">steel type</text><text x="560" y="30">grade</text>
    </g>
    <g text-anchor="middle">
      <text x="160" y="46">producer's symbol</text><text x="280" y="46">#5</text><text x="400" y="46">S = A615 · W = A706</text><text x="560" y="46">60 ksi minimum yield</text>
    </g>
    <rect x="60" y="180" width="600" height="42" rx="5" fill="var(--icy)" stroke="var(--dark)" stroke-width="2"/>
    <g font-family="var(--font-head)" font-weight="800" font-size="22" fill="var(--dark)" text-anchor="middle">
      <text x="120" y="209">H</text><text x="180" y="209">5</text><text x="240" y="209">S</text>
    </g>
    <path d="M276,182 l4,38 M300,182 l4,38 M324,182 l4,38 M348,182 l4,38 M372,182 l4,38 M396,182 l4,38 M420,182 l4,38 M444,182 l4,38 M468,182 l4,38 M492,182 l4,38 M516,182 l4,38 M540,182 l4,38 M564,182 l4,38 M588,182 l4,38 M612,182 l4,38 M636,182 l4,38" stroke="var(--dark)" stroke-width="2" fill="none"/>
    <line x1="300" y1="201" x2="650" y2="201" stroke="var(--dark)" stroke-width="4"/>
    <text x="60" y="241" fill="var(--dark)">or the grade as a continuous line through at least five rib spaces:</text>
    <text x="60" y="256">one line = Grade 60 · two = 75 · three = 80 · Grade 40 has no grade mark</text>
  </g>
</svg>
<figcaption>Figure 1. The marks on a #5 Grade 60 bar, read along the bar, and the grade-line alternative. A grade line is continuous; a short mark, or the ordinary longitudinal rib, is not one.</figcaption>
</figure>

<h2 id="test"><span class="num">3</span>The tension test, step by step (ASTM A370)</h2>
<div class="fig-grid">
  <figure><img src="img/testing-machine.jpg" width="900" height="1200" alt="A technician standing beside a tall universal testing machine in a materials laboratory, pointing at its crosshead" loading="lazy"><figcaption>A universal testing machine at the Oregon DOT materials laboratory: the crosshead pulls, the load cell reads. Photo: Oregon Department of Transportation, Wikimedia Commons, CC BY 2.0.</figcaption></figure>
  <figure><img src="img/fracture.jpg" width="900" height="1200" alt="The broken end of a flat steel tension coupon, showing the torn, cup-shaped fracture surface" loading="lazy"><figcaption>A flat steel coupon after the pull — not a bar, but the same story: the section thinned into a neck, then tore. Photo: Betienne, Wikimedia Commons, CC BY-SA 3.0.</figcaption></figure>
</div>
<p>ASTM A370 is the general method for the mechanical testing of steel products; the rules particular to reinforcing bars sit in A615 itself. Two of them shape everything that follows. The bar is tested <strong>full size</strong>, ribs and all — it is never machined into a smooth coupon, because the bar in the beam is not smooth either. And stress is figured on the <strong>nominal area</strong> from Table 1, not on anything measured with a caliper. The machine has to be big enough to break the bar: a #11 Grade 60 bar reaches its 90 ksi minimum at about 140,000 lbf.</p>
<ol class="steps">
  <li><strong>Cut and mark.</strong> Cut a length long enough to fill both grips and leave a free length between them; in the middle of the free length, punch or scribe two gauge marks 8.00 in. apart. Eight inches is the gauge length for reinforcing bars — every elongation figure in A615 is "in 8 in."</li>
  <li><strong>Grip it straight.</strong> The bar goes into wedge grips with its axis on the line of pull. A bar seated crooked is bent as well as pulled, and reads low.</li>
  <li><strong>Pull slowly through yield.</strong> The standard caps the rate of straining through the yield region; a bar rushed through it shows a higher yield than it has. On a bar with a sharp-kneed curve the load stops rising — the pointer halts, or the beam drops — while the bar keeps stretching. That load is the yield point by the <em>halt-of-force</em> method: yield strength = yield load ÷ nominal area.</li>
  <li><strong>Or construct the offset.</strong> Higher grades usually have no plateau. With an extensometer on the bar the machine plots stress against strain; a line parallel to the elastic slope, offset by 0.2 % strain, is drawn, and where it meets the curve is the yield strength by the <em>0.2 % offset</em> method. ACI 318-19 accepts either method — the offset for any bar, the halt of force only where the knee is sharp. Older editions of ACI 318 read the yield as the stress at a fixed extension under load instead; ASTM A370 still describes that method, so check which one the specification in force names.</li>
  <li><strong>Pull to fracture.</strong> Past yield the machine may run faster. The load climbs again through strain hardening to a maximum, then falls as one spot thins into a neck, and the bar breaks there. Tensile strength = maximum load ÷ nominal area.</li>
  <li><strong>Measure the elongation.</strong> Fit the two pieces together along their axis and measure between the gauge marks. Elongation = (final length − 8.00) ÷ 8.00 × 100, reported to the nearest 0.5 %. If the break lands outside the middle third of the gauge length — A615's retest rule; A370's general rule draws the line at the middle half — and the elongation falls short, the result is discarded and another bar is tested.</li>
</ol>
<figure>
<svg class="fig-svg" viewBox="0 0 720 360" role="img" aria-labelledby="fig2-title">
  <title id="fig2-title">Stress–strain curve of a Grade 60 reinforcing bar to fracture</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="12" fill="var(--muted)">
    <line x1="70" y1="300" x2="690" y2="300" stroke="var(--dark)" stroke-width="1.5"/>
    <line x1="70" y1="30" x2="70" y2="300" stroke="var(--dark)" stroke-width="1.5"/>
    <g text-anchor="middle"><text x="70" y="320">0</text><text x="225" y="320">4</text><text x="380" y="320">8</text><text x="535" y="320">12</text><text x="690" y="320">16</text></g>
    <text x="380" y="342" text-anchor="middle">strain, %</text>
    <g text-anchor="end"><text x="60" y="304">0</text><text x="60" y="236">30</text><text x="60" y="169">60</text><text x="60" y="101">90</text><text x="60" y="34">120</text></g>
    <text x="76" y="22" fill="var(--dark)">stress, ksi</text>
    <line x1="70" y1="165" x2="690" y2="165" stroke="var(--muted)" stroke-width="1" stroke-dasharray="6 4"/>
    <text x="685" y="160" text-anchor="end">Grade 60 minimum yield, 60 ksi</text>
    <line x1="70" y1="97.5" x2="690" y2="97.5" stroke="var(--muted)" stroke-width="1" stroke-dasharray="6 4"/>
    <text x="285" y="110">minimum tensile strength, 90 ksi</text>
    <path d="M70,300 L79.1,147 L128.1,147 C200,90 330,75 457.5,75 C510,75 560,84 585.4,97.5" fill="none" stroke="var(--royal)" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="79.1" cy="147" r="4" fill="var(--royal)"/>
    <circle cx="457.5" cy="75" r="4" fill="var(--royal)"/>
    <path d="M579,91 l13,13 M592,91 l-13,13" stroke="var(--amber)" stroke-width="2.5"/>
    <line x1="77" y1="228" x2="135" y2="222" stroke="var(--muted)" stroke-width="1"/>
    <text x="140" y="226" fill="var(--dark)">elastic, E = 29,000 ksi</text>
    <line x1="104" y1="150" x2="140" y2="180" stroke="var(--muted)" stroke-width="1"/>
    <text x="144" y="185" fill="var(--dark)">yield point 68 ksi, then the plateau</text>
    <text x="250" y="66" text-anchor="middle" fill="var(--dark)">strain hardening</text>
    <text x="457.5" y="58" text-anchor="middle" fill="var(--dark)">tensile strength 100 ksi (maximum load)</text>
    <text x="545" y="122" text-anchor="middle" fill="var(--dark)">necking</text>
    <text x="598" y="118" fill="var(--dark)">fracture</text>
    <path d="M70,288 v-6 M573.8,288 v-6 M70,285 H573.8" stroke="var(--dark)" stroke-width="1"/>
    <text x="322" y="276" text-anchor="middle" fill="var(--dark)">permanent elongation after fracture ≈ 13 % of the gauge length</text>
  </g>
</svg>
<figcaption>Figure 2. Stress–strain curve of a Grade 60 bar (example numbers): elastic to the yield point at 68 ksi, a plateau, strain hardening to the tensile strength of 100 ksi at maximum load, necking and fracture. The elastic strain is a sliver — about 0.23 % — against 13 % of permanent stretch.</figcaption>
</figure>
<figure>
<svg class="fig-svg" viewBox="0 0 720 340" role="img" aria-labelledby="fig3-title">
  <title id="fig3-title">The first one percent of strain: yield point by the halt of the force, and yield strength by the 0.2 percent offset</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="12" fill="var(--muted)">
    <line x1="70" y1="300" x2="690" y2="300" stroke="var(--dark)" stroke-width="1.5"/>
    <line x1="70" y1="30" x2="70" y2="300" stroke="var(--dark)" stroke-width="1.5"/>
    <g text-anchor="middle"><text x="70" y="320">0</text><text x="194" y="320">0.2</text><text x="318" y="320">0.4</text><text x="442" y="320">0.6</text><text x="566" y="320">0.8</text><text x="690" y="320">1.0</text></g>
    <text x="380" y="338" text-anchor="middle">strain, %</text>
    <g text-anchor="end"><text x="60" y="304">0</text><text x="60" y="214">30</text><text x="60" y="124">60</text><text x="60" y="34">90</text></g>
    <text x="76" y="22" fill="var(--dark)">stress, ksi</text>
    <line x1="70" y1="120" x2="690" y2="120" stroke="var(--muted)" stroke-width="1" stroke-dasharray="6 4"/>
    <text x="685" y="134" text-anchor="end">Grade 60 minimum, 60 ksi</text>
    <path d="M70,300 L194,126 C240,80 330,52 450,45 C550,40 620,38 690,36" fill="none" stroke="var(--amber)" stroke-width="3"/>
    <path d="M70,300 L215.7,96 L690,96" fill="none" stroke="var(--royal)" stroke-width="3" stroke-linejoin="round"/>
    <line x1="194" y1="300" x2="382.6" y2="36" stroke="var(--dark)" stroke-width="1.5" stroke-dasharray="5 4"/>
    <circle cx="215.7" cy="96" r="5" fill="var(--royal)"/>
    <circle cx="339.7" cy="96" r="4" fill="var(--bg)" stroke="var(--dark)" stroke-width="1.5"/>
    <circle cx="370.2" cy="53.4" r="5" fill="var(--amber)"/>
    <line x1="215.7" y1="90" x2="215.7" y2="56" stroke="var(--muted)" stroke-width="1"/>
    <text x="100" y="50" fill="var(--dark)">yield point (halt of force), 68 ksi</text>
    <text x="384" y="75" fill="var(--dark)">0.2 % offset yield, 82 ksi (no plateau)</text>
    <text x="352" y="114" fill="var(--dark)">the offset meets the plateau at the same 68 ksi</text>
    <text x="230" y="262" fill="var(--dark)">0.2 % offset line, parallel to the elastic slope</text>
    <text x="86" y="104" fill="var(--dark)">E = 29,000 ksi</text>
  </g>
</svg>
<figcaption>Figure 3. The first 1 % of strain. Blue: a bar with a sharp knee — the yield point is where the force halts, 68 ksi, and the 0.2 % offset line meets its plateau at the same value. Amber: a bar without a plateau, typical of the higher grades — only the offset construction gives it a yield strength, here 82 ksi. Both bars share the same elastic slope.</figcaption>
</figure>
<div class="callout callout-key"><span class="label">Key idea</span>
  <p>Same slope, different knee. The modulus of elasticity is about 29,000 ksi for every grade of reinforcing steel — ACI 318 uses 29,000,000 psi for all of them. A Grade 80 bar is not stiffer than a Grade 40 bar; it simply yields later. A higher grade buys strength, not stiffness: deflections and crack widths do not shrink with it.</p>
</div>
<!-- END BLOCK A -->
```

Block B:

```html
<!-- BLOCK B -->
<h2 id="example"><span class="num">4</span>Worked example: a #5 Grade 60 bar</h2>
<p>A #5 bar from a heat marked Grade 60 is pulled in the laboratory. Its nominal area is 0.31 in.² (Table 1). The example numbers are made up but typical; each result is compared with the A615 minimum for a #5 Grade 60 bar.</p>
<div class="table-wrap">
<table class="ref-table ref-table--text" id="tbl-example" data-diameter="0.625" data-area="0.31" data-yield-load="21100" data-max-load="31000" data-gauge="8.00" data-final="9.04" data-pin-mult="3.5">
  <caption>Table 2. Tension and bend results for the example bar</caption>
  <thead><tr><th scope="col">Quantity</th><th scope="col">Measured</th><th scope="col">Result</th><th scope="col">A615 minimum (#5, Grade 60)</th><th scope="col">Verdict</th></tr></thead>
  <tbody>
    <tr><th scope="row">Yield strength</th><td>Load halted at 21,100 lbf</td><td data-result="68.1">21,100 ÷ 0.31 = 68,065 psi → 68.1 ksi</td><td>60 ksi</td><td>meets</td></tr>
    <tr><th scope="row">Tensile strength</th><td>Maximum load 31,000 lbf</td><td data-result="100.0">31,000 ÷ 0.31 = 100,000 psi → 100.0 ksi</td><td>90 ksi</td><td>meets</td></tr>
    <tr><th scope="row">Elongation in 8 in.</th><td>Gauge marks 9.04 in. apart after fracture</td><td data-result="13.0">(9.04 − 8.00) ÷ 8.00 = 13.0 %</td><td>9 %</td><td>meets</td></tr>
    <tr><th scope="row">Bend</th><td>180° around a 2.19 in. pin (3½ × 0.625 in.)</td><td data-result="2.19">No cracks on the outside of the bend</td><td>pin 3½ d, no cracks</td><td>meets</td></tr>
  </tbody>
</table>
</div>
<div class="eq"><i>f</i><sub>y</sub> = <span class="frac"><span><i>P</i><sub>yield</sub></span><span><i>A</i><sub>nominal</sub></span></span> = <span class="frac"><span>21,100 lbf</span><span>0.31 in.²</span></span> = 68,065 psi ≈ 68.1 ksi</div>
<p>The bar yields eight ksi above its grade, breaks at a stress a tenth above the tensile minimum, and stretches well past the required 9 %: an ordinary, accepted Grade 60 bar. Mills run comfortably above the minimums, and they must — a heat that yielded at 59 ksi would be rejected as Grade 60, whatever its tensile strength.</p>
<div class="table-wrap">
<table class="ref-table" id="tbl-a615">
  <caption>Table 3. ASTM A615 tensile requirements by grade (minimums)</caption>
  <thead><tr><th scope="col" rowspan="2">Grade</th><th scope="col" rowspan="2">Yield strength, ksi</th><th scope="col" rowspan="2">Tensile strength, ksi</th><th scope="col" colspan="5">Elongation in 8 in., %</th></tr>
  <tr><th scope="col">#3</th><th scope="col">#4–#6</th><th scope="col">#7, #8</th><th scope="col">#9–#11</th><th scope="col">#14, #18</th></tr></thead>
  <tbody>
    <tr><th scope="row">Grade 40</th><td>40</td><td>60</td><td>11</td><td>12</td><td>—</td><td>—</td><td>—</td></tr>
    <tr><th scope="row">Grade 60</th><td>60</td><td>90</td><td>9</td><td>9</td><td>8</td><td>7</td><td>7</td></tr>
    <tr><th scope="row">Grade 75</th><td>75</td><td>100</td><td>7</td><td>7</td><td>7</td><td>6</td><td>6</td></tr>
    <tr><th scope="row">Grade 80</th><td>80</td><td>105</td><td>7</td><td>7</td><td>7</td><td>6</td><td>6</td></tr>
  </tbody>
</table>
</div>
<p class="ref-note">Grade 40 is made in sizes #3 to #6 only. The elongation minimum eases with grade — the price of a stronger bar is a little less stretch — and, from Grade 60 up, with bar size; Grade 40 is the exception, asking 11 % of a #3 bar and 12 % of #4 to #6.</p>

<h2 id="bend"><span class="num">5</span>The bend test</h2>
<figure>
  <img src="img/rebar-bender.jpg" width="824" height="618" alt="The jaws of a hand-operated rebar bender gripping a bar on the ground" loading="lazy">
  <figcaption>A hand bender on site. The laboratory test is the same motion around a pin of specified diameter, followed by a close look at the outside of the bend. Photo: Wikimedia Commons, CC0.</figcaption>
</figure>
<p>The tension test measures ductility along the bar; the bend test measures it where bars are actually asked for it — in hooks, stirrups and ties. A specimen is bent 180° (90° for #14 and #18) around a pin whose diameter is a set multiple of the bar diameter, and passes if the outside of the bend shows no cracks. The pin is not generous: around a 3½ d pin the outer surface of the bar is stretched by roughly d ÷ (D + d), about 22 % — more than the tension test asks of the whole bar. A brittle heat, or a bar with a seam or a rolling defect, shows itself here.</p>
<figure>
<svg class="fig-svg" viewBox="0 0 720 308" role="img" aria-labelledby="fig4-title">
  <title id="fig4-title">The bend test: a bar wrapped 180 degrees around a pin</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="12" fill="var(--muted)">
    <path d="M223,30 L223,170 A77,77 0 0 0 377,170 L377,30" fill="none" stroke="var(--royal)" stroke-width="34"/>
    <circle cx="300" cy="170" r="60" fill="var(--surface2)" stroke="var(--dark)" stroke-width="2"/>
    <text x="300" y="166" text-anchor="middle" fill="var(--dark)">pin</text>
    <text x="300" y="182" text-anchor="middle" fill="var(--dark)">D = 3½ d</text>
    <path d="M240,140 H360 M240,135 v10 M360,135 v10" stroke="var(--dark)" stroke-width="1"/>
    <text x="300" y="132" text-anchor="middle" fill="var(--dark)">D</text>
    <path d="M206,52 H240 M206,47 v10 M240,47 v10" stroke="var(--dark)" stroke-width="1"/>
    <text x="198" y="56" text-anchor="end" fill="var(--dark)">bar, d</text>
    <text x="300" y="100" text-anchor="middle" fill="var(--dark)">180°</text>
    <path d="M300,264 v22" stroke="var(--muted)" stroke-width="1"/>
    <text x="300" y="298" text-anchor="middle" fill="var(--dark)">outside of the bend: look for cracks</text>
    <text x="450" y="70" fill="var(--dark)">Grade 60 pins (Table 4)</text>
    <text x="450" y="92">#5</text><text x="490" y="92">d = 0.625 in.</text><text x="605" y="92">D = 2.19 in.</text>
    <text x="450" y="112">#8</text><text x="490" y="112">d = 1.000 in.</text><text x="605" y="112">D = 5.00 in.</text>
    <text x="450" y="132">#11</text><text x="490" y="132">d = 1.410 in.</text><text x="605" y="132">D = 9.87 in.</text>
    <text x="450" y="162" fill="var(--dark)">outer surface strain ≈ d ÷ (D + d)</text>
    <text x="450" y="182" fill="var(--dark)">≈ 1 ÷ 4.5 ≈ 22 % for a 3½ d pin</text>
  </g>
</svg>
<figcaption>Figure 4. The bend test: 180° around a pin of diameter D — 3½ d for a #5 Grade 60 bar — then the outside of the bend is inspected. The pin is what makes one laboratory's bend comparable with another's.</figcaption>
</figure>
<div class="table-wrap">
<table class="ref-table" id="tbl-bend">
  <caption>Table 4. Bend-test pin diameter, as a multiple of the nominal bar diameter d (ASTM A615)</caption>
  <thead><tr><th scope="col">Bar size</th><th scope="col">Grade 40</th><th scope="col">Grade 60</th><th scope="col">Grade 75</th><th scope="col">Grade 80</th></tr></thead>
  <tbody>
    <tr><th scope="row">#3, #4, #5</th><td data-mult="3.5">3½ d</td><td data-mult="3.5">3½ d</td><td data-mult="5">5 d</td><td data-mult="5">5 d</td></tr>
    <tr><th scope="row">#6</th><td data-mult="5">5 d</td><td data-mult="5">5 d</td><td data-mult="5">5 d</td><td data-mult="5">5 d</td></tr>
    <tr><th scope="row">#7, #8</th><td>—</td><td data-mult="5">5 d</td><td data-mult="5">5 d</td><td data-mult="5">5 d</td></tr>
    <tr><th scope="row">#9, #10, #11</th><td>—</td><td data-mult="7">7 d</td><td data-mult="7">7 d</td><td data-mult="7">7 d</td></tr>
    <tr><th scope="row">#14, #18 (90° bend)</th><td>—</td><td data-mult="9">9 d</td><td data-mult="9">9 d</td><td data-mult="9">9 d</td></tr>
  </tbody>
</table>
</div>
<p class="ref-note">A615 pins. A706 bars are bent around smaller pins, because more ductility is asked of them.</p>

<h2 id="certs"><span class="num">6</span>Certificates, sampling and retests</h2>
<figure>
  <img src="img/tying-rebar.jpg" width="1200" height="798" alt="A worker in gloves tying reinforcing bars together with a pair of pliers on a slab" loading="lazy">
  <figcaption>Tying a slab mat. The bars' heat was tested at the mill weeks before; the tag on the bundle is what connects them to that test. Photo: Bill Dowell, U.S. Army, public domain.</figcaption>
</figure>
<p>Nobody pulls the bar that goes into the beam. What arrives with a delivery is a <strong>mill test report</strong> (the "cert"): for each heat of steel, the chemical analysis and the mechanical results — yield, tensile, elongation and the bend — for each bar size rolled from it. The mill tests every size from every heat, at least one tension test and one bend test, and the heat number on the report has to match the heat number on the bundle tag. A report without a matching tag certifies nothing about the bars in front of you.</p>
<p>When the specification calls for it — public work usually does — bars are also sampled on site or at the fabricator and sent to an independent laboratory: a length long enough for the grips and the 8 in. gauge, with spare for a retest, from each heat and size. The independent test is the check on the mill, not a replacement for the cert.</p>
<p>A615 does not treat one poor result as the last word. If a tension result misses a minimum by a small margin — the standard says how small — two more bars are taken from the same lot and both must pass. If the break landed outside the middle portion of the gauge length and only the elongation failed, the test is simply repeated. A failed bend likewise earns two more specimens, and again both must pass. What the standard does not allow is picking the best of several results, or testing bars until one passes.</p>
<div class="callout callout-warn"><span class="label">Watch out</span>
  <p>A cert is a claim about a heat, not about the bar in your hand. Match the heat number on the tag to the report, and match the size and grade marks on the bar to both. Mixed heats in one bundle are a common way for an untested bar to reach the forms.</p>
</div>

<h2 id="mistakes"><span class="num">7</span>Common mistakes</h2>
<ul>
  <li><strong>Measuring the diameter.</strong> A caliper across the ribs gives a larger area than the nominal one, and dividing by it under-reports the strength. Stress on reinforcing bars is always figured on the nominal area of Table 1.</li>
  <li><strong>Rushing through yield.</strong> The strain rate through the yield region is capped for a reason: a fast pull raises the apparent yield point, and a bar can be passed that would fail at the proper rate.</li>
  <li><strong>Measuring elongation on one piece.</strong> The two halves must be fitted together and the distance between the original marks measured. A rule laid along one half, or marks that were never punched, produce a number that means nothing.</li>
  <li><strong>Ignoring where it broke.</strong> A break close to a gauge mark with a low elongation is not a failed bar; it is a discarded test. A break close to a gauge mark with a passing elongation counts.</li>
  <li><strong>Reading the grade from a rib.</strong> The grade line is a continuous longitudinal line through at least five deformation spaces. A single short mark, or the ordinary longitudinal rib, is not one. If in doubt, look for the number.</li>
  <li><strong>Testing in the field with a pipe.</strong> Bending a bar around nothing, with a length of pipe over the end, is a far sharper bend than the test's pin; a crack there proves nothing about the heat, and a partly embedded bar bent that way may be damaged for good.</li>
  <li><strong>Accepting a cert that does not match.</strong> A report for one heat says nothing about a bundle tagged with another, however good the numbers.</li>
</ul>

<h2 id="takeaways"><span class="num">8</span>Key takeaways</h2>
<ol>
  <li>The grade is the <strong>minimum yield strength in ksi</strong>; design counts on it and treats everything above it as reserve, and A706 caps that reserve where seismic design needs it.</li>
  <li>The bar is tested full size and stress is figured on the <strong>nominal area</strong>: yield load and maximum load over the area from Table 1, elongation in <strong>8 in.</strong> with the pieces fitted together.</li>
  <li>Yield is read by the <strong>halt of the force</strong> on a sharp-kneed bar or by the <strong>0.2 % offset</strong> on any bar; the elastic slope is the same 29,000 ksi for every grade.</li>
  <li>The <strong>bend test</strong> around a 3½ d to 9 d pin and the <strong>elongation</strong> minimum are the ductility guarantee; the <strong>mill cert</strong> is the evidence — and only if its heat number matches the tag.</li>
</ol>

<p class="ref-note">Sources: ASTM A615/A615M (deformed and plain carbon-steel bars: bar sizes, tensile and bend requirements, markings, retests); ASTM A370 (mechanical testing of steel products); ASTM A706/A706M (low-alloy steel bars); ACI 318-19 §20.2.1.2 (yield strength determination) and §20.2.2.2 (modulus of elasticity). Rate limits, retest margins and test-frequency clauses are described qualitatively; consult the current edition for the numbers.</p>
<p class="ref-note">Photo credits: <a href="https://commons.wikimedia.org/wiki/File:A_bunch_of_rebar_up_close.jpg">A bunch of rebar up close</a> by W.carter, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>; <a href="https://commons.wikimedia.org/wiki/File:Rebar_01.JPG">Rebar 01</a> by Vsolymossy, <a href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a>; <a href="https://commons.wikimedia.org/wiki/File:A_worker_ties_together_reinforcing_bar,_or_rebar,_to_strengthen_concrete_floors_for_a_facility_that_will_house_372_students_as_part_of_the_Herat_University_Women%27s_Dormitory_Project_in_Herat_province_140311-A-DT641-242.jpg">A worker ties together reinforcing bar</a> by Bill Dowell, U.S. Army, public domain; <a href="https://commons.wikimedia.org/wiki/File:Universal_testing_machine_(20364859449).jpg">Universal testing machine</a> by the Oregon Department of Transportation, <a href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a>; <a href="https://commons.wikimedia.org/wiki/File:Rupture-traction-acier.jpg">Rupture-traction-acier</a> by Betienne, <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>; <a href="https://commons.wikimedia.org/wiki/File:Rebar_bender.jpg">Rebar bender</a>, <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>; all via Wikimedia Commons. The photos were resized, cropped and recompressed for the web.</p>

<nav class="article-nav" aria-label="Series">
  <a class="prev" href="../concrete-cylinders/"><span class="dir">← Related</span><span class="ttl">Concrete cylinders: from the mold to the acceptance decision</span></a>
  <a class="next" href="../"><span class="dir">Study →</span><span class="ttl">All study materials</span></a>
</nav>

</article>
</main>

<footer class="site-footer">
  <span>© <span id="year"></span> Jisoo Park. All rights reserved.</span>
  <a href="../../">← Home</a>
</footer>
<script src="../article.js"></script>
</body>
</html>
<!-- END BLOCK B -->
```

- [ ] **Step 2: Write the failing table-integrity test**

Create `tools/rebar.test.mjs`:

```js
// tools/rebar.test.mjs — 철근 인장시험 글(site/study/rebar-tension/index.html)의 표 수치 검사 (node --test)
// HTML 파서 없이 정규식으로 <table id> 의 <tbody> 행을 읽는다. 표의 숫자가 A615 Table 1 의 기하·조사 노트의 요구값과 맞는지 대조한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../site/study/rebar-tension/index.html'), 'utf8');

function table(id) {
  const m = HTML.match(new RegExp(`<table([^>]*id="${id}"[^>]*)>([\\s\\S]*?)</table>`));
  assert.ok(m, `table #${id} missing`);
  return { attrs: m[1], body: m[2] };
}
// <tbody> 의 각 행을 셀 배열 [{ attrs, text }] 로 (태그 제거·공백 정리)
function bodyRows(tbl) {
  const tb = tbl.body.match(/<tbody>([\s\S]*?)<\/tbody>/);
  assert.ok(tb, 'tbody missing');
  return [...tb[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m =>
    [...m[1].matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/g)].map(c => ({ attrs: c[1], text: c[2].replace(/<[^>]+>/g, '').trim() })));
}
const num = s => (s === '—' ? null : parseFloat(s.replace(/,/g, '')));
const attr = (s, name) => { const m = s.match(new RegExp(`${name}="([^"]*)"`)); return m ? m[1] : null; };

test('Table 1: 크기 번호·미터법 이름·지름·단면·단위중량이 A615 Table 1 의 기하와 맞는다', () => {
  const rows = bodyRows(table('tbl-sizes'));
  assert.deepEqual(rows.map(r => r[0].text), ['#3', '#4', '#5', '#6', '#7', '#8', '#9', '#10', '#11', '#14', '#18']);
  assert.deepEqual(rows.map(r => r[1].text), ['#10', '#13', '#16', '#19', '#22', '#25', '#29', '#32', '#36', '#43', '#57']);
  const square = { 9: 1, 10: 1.125, 11: 1.25, 14: 1.5, 18: 2 };   // #9–#18 은 옛 정사각형 바(변 in)와 같은 단면의 원형 바
  for (const r of rows) {
    const n = Number(r[0].text.slice(1)), d = num(r[2].text), a = num(r[3].text), w = num(r[4].text);
    const exact = Math.PI * d * d / 4;
    assert.equal(a, Math.round(exact * 100) / 100, `#${n}: area ${a} vs π d²/4 = ${exact.toFixed(4)}`);
    assert.ok(Math.abs(w - 3.4028 * exact) / w <= 0.003, `#${n}: weight ${w} vs 3.4028 × area = ${(3.4028 * exact).toFixed(3)}`);   // 490 lb/ft³ ÷ 144 = 3.4028 lb/ft per in²
    if (n <= 8) assert.equal(d, n / 8, `#${n}: diameter is n/8 in.`);
    else assert.equal(a, Math.round(square[n] ** 2 * 100) / 100, `#${n}: area of the ${square[n]} in. square bar`);
    assert.equal(Math.round(d * 25.4), Number(r[1].text.slice(1)), `#${n}: metric name = diameter in mm`);
  }
});

test('Table 3: A615 등급별 최소 항복·인장·8 in 신장률', () => {
  const rows = bodyRows(table('tbl-a615'));
  const expected = { 'Grade 40': [40, 60, 11, 12, null, null, null], 'Grade 60': [60, 90, 9, 9, 8, 7, 7], 'Grade 75': [75, 100, 7, 7, 7, 6, 6], 'Grade 80': [80, 105, 7, 7, 7, 6, 6] };
  assert.deepEqual(rows.map(r => r[0].text), Object.keys(expected));
  for (const r of rows) {
    const v = r.slice(1).map(c => num(c.text));
    assert.deepEqual(v, expected[r[0].text], r[0].text);
    assert.equal(v[0], Number(r[0].text.slice(6)), 'grade number = minimum yield');
    assert.ok(v[1] > v[0], 'tensile above yield');
  }
});

test('Table 4: 굽힘 핀 지름 배수(3½·5·7·9 d)', () => {
  const rows = bodyRows(table('tbl-bend'));
  const expected = { '#3, #4, #5': [3.5, 3.5, 5, 5], '#6': [5, 5, 5, 5], '#7, #8': [null, 5, 5, 5], '#9, #10, #11': [null, 7, 7, 7], '#14, #18 (90° bend)': [null, 9, 9, 9] };
  assert.deepEqual(rows.map(r => r[0].text), Object.keys(expected));
  for (const r of rows) {
    const v = r.slice(1).map(c => (c.text === '—' ? null : Number(attr(c.attrs, 'data-mult'))));
    assert.deepEqual(v, expected[r[0].text], r[0].text);
    for (const c of r.slice(1)) if (c.text !== '—') {
      assert.match(c.text, /^(3½|5|7|9) d$/, `pin text ${c.text}`);
      assert.equal(c.text === '3½ d' ? 3.5 : Number(c.text.split(' ')[0]), Number(attr(c.attrs, 'data-mult')), `pin text vs data-mult: ${c.text}`);   // 글자와 속성이 같은 배수를 말해야 한다
    }
  }
});

test('Table 2: 예제의 표시값이 data-* 입력에서 재계산한 값과 같다(속성값과 본문 글자 모두)', () => {
  const t = table('tbl-example');
  const a = Number(attr(t.attrs, 'data-area')), d = Number(attr(t.attrs, 'data-diameter'));
  const py = Number(attr(t.attrs, 'data-yield-load')), pm = Number(attr(t.attrs, 'data-max-load'));
  const g = Number(attr(t.attrs, 'data-gauge')), f = Number(attr(t.attrs, 'data-final')), mult = Number(attr(t.attrs, 'data-pin-mult'));
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
  const rows = bodyRows(t);
  const shown = rows.map(r => Number(attr(r[2].attrs, 'data-result')));
  assert.deepEqual(shown, [r1(py / a / 1000), r1(pm / a / 1000), r1((f - g) / g * 100), r2(mult * d)]);
  assert.deepEqual(shown, [68.1, 100, 13, 2.19]);
  // 독자가 읽는 글자도 같은 값을 말해야 한다(속성만 맞고 본문이 오타인 경우를 잡는다)
  const grab = (s, re) => { const m = s.match(re); assert.ok(m, `no number in "${s}"`); return Number(m[1]); };
  assert.equal(grab(rows[0][2].text, /→\s*([\d.]+)\s*ksi/), shown[0]);
  assert.equal(grab(rows[1][2].text, /→\s*([\d.]+)\s*ksi/), shown[1]);
  assert.equal(grab(rows[2][2].text, /=\s*([\d.]+)\s*%/), shown[2]);
  assert.equal(grab(rows[3][1].text, /([\d.]+) in\. pin/), shown[3]);
  assert.ok(rows[0][1].text.includes(py.toLocaleString('en-US')) && rows[1][1].text.includes(pm.toLocaleString('en-US')) && rows[2][1].text.includes(String(f)), 'measured cells quote the inputs');
  assert.equal(Math.round(Math.PI * d * d / 4 * 100) / 100, a, 'nominal area of the #5 bar');
  assert.ok(shown[0] >= 60 && shown[1] >= 90 && shown[2] >= 9, 'meets the Grade 60 minimums for a #5 bar');
});
```

Run: `node --test tools/rebar.test.mjs` before Step 1 is complete → FAIL (file missing); after Step 1 → 4 pass. (If you wrote the page first, simply confirm the 4 tests pass and note it.)

- [ ] **Step 3: Register with the guards** — in `tools/site-guards.test.mjs` add `'study/rebar-tension/index.html'` to the tokens-only `files` list (after `'study/aggregate-gradation/calc.js'`) and to `ARTICLE_PAGES` (last).

- [ ] **Step 3b: Let text tables wrap inside the scroll wrapper** — in `site/study/article.css`, replace the line `.ref-table--text td, .ref-table--text th { white-space:normal; text-align:left; }` with `.ref-table--text td, .ref-table--text th, .table-wrap .ref-table--text td, .table-wrap .ref-table--text th { white-space:normal; text-align:left; }` plus a Korean comment (the `.table-wrap` nowrap rule has specificity 0,2,1 and silently overrode the text-table rule; the added selectors tie it and win on source order, so Table 2 — and the text tables of the soil-compaction and mix-design example pages — wrap instead of scrolling).

- [ ] **Step 4: Gate + browser check**

Run the full gate (Global Constraints) → all pass (82 + 4 = 86). Then start a dev server on a free port and capture the page headlessly:

```bash
python tools/devserver.py 8771 site
```

(run in the background), then

```bash
"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --window-size=1440,9000 --screenshot="D:/Codex/Temp/claude/D--Projects-Test/d64fe480-de3e-4585-8fe0-f5b32b07ce45/scratchpad/verify-rebar/task2-1440.png" "http://localhost:8771/study/rebar-tension/"
```

(`mkdir -p` the folder first; if Edge is not at that path, use `where msedge` / the `HKLM` App Paths entry. The page is long; if the bottom of the PNG is cut off, take a second capture with `--window-size=1440,12000`.) Open the PNG with the Read tool and check: the hero, Table 1, Figure 1 (two bars with marks), Figures 2–3 (curves with labels, nothing overlapping), Figure 4 (bar around the pin), the two-photo grid, the credits. Report anything overlapping or clipped instead of fixing it silently. Stop the server afterwards (find the listener on 8771 and kill it).

- [ ] **Step 5: Commit**

```bash
git add site/study/rebar-tension/index.html tools/rebar.test.mjs tools/site-guards.test.mjs && git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 철근 인장시험 글 — 본문 8절·SVG 도해 4장·표 4개·사진 6장(정적), 표 수치 검사 rebar.test, 가드 목록 갱신

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 3: Registry entry, README, and Study index verification

**Files:** `site/shared/registry.js`, `tools/registry.test.mjs`, `README.md`

- [ ] **Step 1: Test first.** In `tools/registry.test.mjs` set the expected page ids to `['mix-design-1', 'mix-design-2', 'aggregate-gradation', 'slump-test', 'concrete-cylinders', 'rebar-tension', 'soil-compaction']` and rename the test to `'MATERIALS: 믹스 디자인 2편·골재 입도·슬럼프·공시체·철근 인장·다짐 글이 등록돼 있고 page href 가 실제 파일을 가리킨다'`. `node --test tools/registry.test.mjs` → 1 failure.

- [ ] **Step 2: Entry.** In `site/shared/registry.js`, between the `concrete-cylinders` entry and the `soil-compaction` entry insert:

```js
    { id: 'rebar-tension', group: 'materials', type: 'page', title: 'Testing reinforcing steel: the tension test',
      desc: 'What ASTM A615 asks of a reinforcing bar — grade, tensile strength, elongation and the bend — how the tension test (ASTM A370) measures each, and how to read the result and the mill certificate.',
      href: 'rebar-tension/' },
```

and change the `materials` STUDY_GROUPS blurb from `'Concrete, aggregates, soils, and mix design.'` to `'Concrete, aggregates, reinforcing steel, soils, and mix design.'`.

- [ ] **Step 3: README.** Add `` - `site/study/rebar-tension/` — *Testing reinforcing steel: the tension test* (`index.html`, static); photos in `img/` `` between the concrete-cylinders and soil-compaction lines of the structure list; append ` tools/rebar.test.mjs` to the test command.

- [ ] **Step 4: Full gate** → all pass (86). Start `python tools/devserver.py 8772 site` in the background and capture `http://localhost:8772/study/` at 1440 the same way as in Task 2 (file `task3-study-index.png` in the same scratch folder): seven Materials cards in the order Part 1, Part 2, sieve analysis, slump test, concrete cylinders, reinforcing steel, compaction control, and the Materials blurb mentioning reinforcing steel. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add site/shared/registry.js tools/registry.test.mjs README.md && git -c core.quotepath=false commit -F - <<'EOF'
feat: 레지스트리에 철근 인장시험 글 등록(공시체 글 뒤), Materials 소개문·registry 테스트·README 갱신

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```
