# Study "Air content and unit weight" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the eighth Study article — the air content of fresh concrete by the pressure method (ASTM C231) and the density, yield and gravimetric air content of the same sample (ASTM C138) — as a short static page with three SVG diagrams, two data tables and three CC/PD photos. No calculator.

**Architecture:** One static page `site/study/air-yield/index.html` on the existing article template (`article.css` + `article.js`, no new CSS). A new node test re-derives the worked example's numbers from the HTML table's `data-*` inputs and cross-checks them against the site's anchor mix and the lab engine. Same photo pipeline, guards and registry pattern as the previous articles.

**Tech Stack:** Static HTML/CSS, inline SVG, Node 20 `node --test`, Python 3 + Pillow.

**Spec:** `docs/superpowers/specs/2026-09-07-study-air-yield-design.md`. Research notes: `D:\Codex\Temp\claude\D--Projects-Test\d64fe480-de3e-4585-8fe0-f5b32b07ce45\scratchpad\air-research\research.txt`. Reference page for the template: `site/study/rebar-tension/index.html` (the previous static article).

## Global Constraints

- Work in the worktree `D:\Projects\Test\.claude\worktrees\study-air` (branch `worktree-study-air`). Never touch `D:\Projects\Test` directly.
- No course code: the uppercase string `CNST` must not appear anywhere under `site/`. No department or university name.
- Tokens only — no literal colours (`#rgb`, `#rrggbb`) in the new page (inline SVG included; SVG attributes use `var(--token)`). Never write `#` followed by three or more hex-looking characters.
- Footer text exactly `© <span id="year"></span> Jisoo Park. All rights reserved.`; English article; Korean code comments; no logos/emoji.
- Numbers come only from the research notes: WSDOT Materials Manual M 46-01.48 (Jan 2026) FOP for AASHTO T 121 (= ASTM C138) and T 152 (= ASTM C231), the WAQTC/Idaho FOP for T 121, and NRMCA CIP 8. Items marked CAVEAT there (the strength cost per percent of air, ASTM clause numbers, typical aggregate correction factors, the Type B maximum aggregate size) stay qualitative. The worked example is labelled "example numbers".
- Photo credits: caption with author + licence, plus a credits paragraph linking each Commons file page and each licence deed, and the sentence "The photos were resized, cropped and recompressed for the web."
- Every `<img>` carries `width`/`height` equal to the real pixel size; every photo ≤ 220 KB and ≤ 1200 px on the long side; the per-folder photo guard expects exactly 3 files in `study/air-yield/img`.
- Commit format: `git add <files> && git -c core.quotepath=false commit -F - <<'EOF' … EOF`, Korean message, trailer `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. One plain command or one heredoc per Bash call; no `cd`, no long `&&` chains. Create files with the Write tool (UTF-8).
- Test gate (all must pass before every commit): `node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs tools/study-tables.test.mjs tools/site-guards.test.mjs tools/layout.test.mjs tools/props.test.mjs tools/decor.test.mjs tools/compaction.test.mjs tools/cylinders.test.mjs tools/gradation.test.mjs tools/rebar.test.mjs tools/airyield.test.mjs` (`tools/airyield.test.mjs` exists from Task 2 on; before that, run the gate without it).

## File Structure

- Create `site/study/air-yield/img/{placing,tools,filling}.jpg` (Task 1); modify `tools/site-guards.test.mjs` photo dictionary (Task 1).
- Create `site/study/air-yield/index.html` and `tools/airyield.test.mjs` (Task 2); modify `tools/site-guards.test.mjs` tokens-only list + `ARTICLE_PAGES` (Task 2).
- Modify `site/shared/registry.js`, `tools/registry.test.mjs`, `README.md` (Task 3).

---

### Task 1: Photos (crop, resize, recompress) + photo-budget guard entry

**Files:**
- Create: `site/study/air-yield/img/placing.jpg`, `tools.jpg`, `filling.jpg`
- Modify: `tools/site-guards.test.mjs` (per-folder photo test dictionary and its name)
- Inputs (already downloaded from Wikimedia Commons, user-authorized; not committed): `D:\Codex\Temp\claude\D--Projects-Test\d64fe480-de3e-4585-8fe0-f5b32b07ce45\scratchpad\air-research\orig\`

**Interfaces:**
- Produces (exact pixel sizes used by Task 2): placing 1200×900, tools 1200×797, filling 1200×797.

- [ ] **Step 1: Write and run the prep script**

Create `D:\Codex\Temp\claude\D--Projects-Test\d64fe480-de3e-4585-8fe0-f5b32b07ce45\scratchpad\air-research\prep.py` with the Write tool:

```python
# -*- coding: utf-8 -*-
# prep.py — 공기량·단위중량 글 사진 3장: 축소(긴 변 ≤ 1200)·EXIF 제거·JPEG 재압축(≤ 220 KB)
import os, sys
from PIL import Image, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True
SRC, DST = sys.argv[1], sys.argv[2]
os.makedirs(DST, exist_ok=True)
JOBS = [('placing.jpg', 'placing.jpg', (1200, 900), 80),
        ('tools.jpg', 'tools.jpg', (1200, 797), 80),
        ('filling.jpg', 'filling.jpg', (1200, 797), 80)]
LIMIT = 220 * 1024
for name, out, size, q in JOBS:
    im = Image.open(os.path.join(SRC, name)).convert('RGB').resize(size, Image.LANCZOS)
    path = os.path.join(DST, out)
    while True:   # 220 KB 예산을 넘으면 품질을 4씩 낮춰 다시 저장한다
        im.save(path, 'JPEG', quality=q, optimize=True, progressive=True)
        if os.path.getsize(path) <= LIMIT or q <= 40: break
        q -= 4
    print(out, im.size, os.path.getsize(path), 'bytes', 'q', q)
```

Run (one Bash call, from the worktree root):

```bash
python "D:/Codex/Temp/claude/D--Projects-Test/d64fe480-de3e-4585-8fe0-f5b32b07ce45/scratchpad/air-research/prep.py" "D:/Codex/Temp/claude/D--Projects-Test/d64fe480-de3e-4585-8fe0-f5b32b07ce45/scratchpad/air-research/orig" site/study/air-yield/img
```

Open all three outputs with the Read tool and confirm: **placing** — a night bridge-deck placement, a yellow paving bridge over green epoxy-coated reinforcing bars, a pump boom and a floodlight; **tools** — a slump cone with a funnel on a base plate, a strike-off plate, a tamping rod, a trowel and a red brush on a concrete floor; **filling** — a cylindrical steel mould clamped to a base plate being filled with a trowel from a pile of fresh concrete, a slump cone and a shovel beside it. Stop with NEEDS_CONTEXT if any file is missing or shows something else. Report the final quality and byte size of each.

- [ ] **Step 2: Extend the per-folder photo guard**

In `tools/site-guards.test.mjs`, the per-folder test's dictionary becomes `{ 'study/slump-test/img': 7, 'study/soil-compaction/img': 6, 'study/concrete-cylinders/img': 7, 'study/aggregate-gradation/img': 4, 'study/rebar-tension/img': 6, 'study/air-yield/img': 3 }` and the test name becomes `'Study 글 사진 폴더(slump 7 · soil 6 · cylinders 7 · gradation 4 · rebar 6 · air 3)의 모든 파일이 .jpg 이고 각 220 KB 이하다'`. Nothing else changes.

- [ ] **Step 3: Run the guards** — `node --test tools/site-guards.test.mjs` → all pass.

- [ ] **Step 4: Commit**

```bash
git add site/study/air-yield/img tools/site-guards.test.mjs && git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 공기량·단위중량 글 — Commons 사진 3장(≤1200 px·EXIF 제거·≤220 KB), 사진 예산 가드에 폴더 추가

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2: The article page + example-integrity test + guard registration

**Files:**
- Create: `site/study/air-yield/index.html` (blocks A + B below, concatenated, marker comments removed)
- Create: `tools/airyield.test.mjs`
- Modify: `tools/site-guards.test.mjs` (tokens-only `files` list and `ARTICLE_PAGES`)

**Interfaces:**
- Consumes: the three photo sizes from Task 1.
- Produces: table ids `tbl-measures` (cells carry `data-ft3` and `data-m3`) and `tbl-example` (the `<table>` carries `data-materials`, `data-ordered`, `data-cement`, `data-design-air`; each result cell carries `data-result`) — the exact markup below is what `tools/airyield.test.mjs` parses; do not restructure the rows.

- [ ] **Step 1: Write the page (block A, then block B)**

Extract the two fenced `html` blocks marked `<!-- BLOCK A -->` / `<!-- BLOCK B -->` from the brief with a script (write a small Python extractor to the scratch directory and run it with one `python <path>` call), remove the four marker lines, write `site/study/air-yield/index.html`, and confirm it starts with `<!doctype html>`, ends with `</html>` and contains no marker text.

Block A:

```html
<!-- BLOCK A -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Air content and unit weight — Construction Study Lab</title>
<meta name="description" content="Two measurements from one bucket of fresh concrete: how much air the pressure meter finds (ASTM C231), and what the density says about how much concrete the batch really made (ASTM C138).">
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
  <p class="eyebrow">Materials · Fresh concrete</p>
  <h1>Air content and unit weight</h1>
  <p class="lede">Two numbers come out of the same bucket of fresh concrete: how much air is in it, and how much concrete the batch actually made. One protects the slab from winter; the other tells you whether you were shorted.</p>
  <p class="byline">Jisoo Park · September 2026 · 8 min read</p>
</div></section>

<main class="article-layout">
<nav class="toc" aria-label="Contents">
  <h2>Contents</h2>
  <ol>
    <li><a href="#why">1. Why air is measured</a></li>
    <li><a href="#pressure">2. The pressure meter</a></li>
    <li><a href="#density">3. Density and yield</a></li>
    <li><a href="#yield">4. Reading the yield</a></li>
    <li><a href="#example">5. Worked example</a></li>
    <li><a href="#mistakes">6. Common mistakes</a></li>
    <li><a href="#takeaways">7. Key takeaways</a></li>
  </ol>
</nav>

<article class="article">

<h2 id="why"><span class="num">1</span>Why air is measured</h2>
<figure>
  <img src="img/placing.jpg" width="1200" height="900" alt="A bridge deck being placed at night: a yellow paving bridge spans green epoxy-coated reinforcing bars under a floodlight, with a concrete pump boom feeding it" loading="eager">
  <figcaption>A bridge deck going down at night. Every load that reached this deck was sampled at the chute and judged on two numbers before it was allowed in. Photo: Federal Highway Administration, public domain.</figcaption>
</figure>
<p>Concrete that will freeze needs air in it — not the accidental voids left by careless rodding, but a deliberate population of tiny bubbles spread evenly through the paste. Water expands when it freezes, and in a saturated paste with nowhere to go that expansion tears the concrete apart from the inside, a scale or two of surface at a time. Entrained air bubbles are the escape space. Water pushed ahead of the ice front reaches a bubble, the pressure releases, and the paste survives the cycle.</p>
<div class="callout callout-def"><span class="label">Definitions</span>
  <p><strong>Entrained air</strong> is added on purpose with an admixture: small bubbles, closely spaced, stable through mixing and placing. <strong>Entrapped air</strong> is what consolidation is supposed to remove: larger, irregular voids left between the aggregate. Both count in the air content the meter reads, which is why a badly consolidated sample can pass the air test and still be poor concrete.</p>
</div>
<p>Air is not free. Every percent of it is a percent of the concrete's volume that carries no load, and strength falls by a few percent for each percent of air. That is the trade: enough air to survive the winters the structure will see, and not one point more. How much is enough is set by the exposure and the aggregate size, from the same ACI table the mix design uses — <a href="../mix-design/#step-3">the target air content in Part 1, step 3</a>.</p>
<figure>
<svg class="fig-svg" viewBox="0 0 720 308" role="img" aria-labelledby="fig1-title">
  <title id="fig1-title">Entrained air compared with entrapped air, and how a bubble relieves freezing pressure</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="12" fill="var(--muted)">
    <rect x="60" y="46" width="260" height="150" rx="4" fill="var(--surface2)" stroke="var(--dark)" stroke-width="1.5"/>
    <g fill="var(--bg)" stroke="var(--dark)" stroke-width="1">
      <circle cx="92" cy="78" r="6"/><circle cx="134" cy="66" r="5"/><circle cx="176" cy="82" r="6"/><circle cx="218" cy="68" r="5"/><circle cx="262" cy="80" r="6"/><circle cx="296" cy="70" r="5"/>
      <circle cx="80" cy="120" r="5"/><circle cx="120" cy="132" r="6"/><circle cx="162" cy="118" r="5"/><circle cx="204" cy="130" r="6"/><circle cx="248" cy="120" r="5"/><circle cx="292" cy="132" r="6"/>
      <circle cx="98" cy="168" r="6"/><circle cx="140" cy="176" r="5"/><circle cx="184" cy="164" r="6"/><circle cx="226" cy="176" r="5"/><circle cx="268" cy="166" r="6"/>
    </g>
    <text x="190" y="34" text-anchor="middle" fill="var(--dark)">entrained — made on purpose</text>
    <text x="190" y="216" text-anchor="middle">small, closely spaced</text>
    <text x="190" y="232" text-anchor="middle">everywhere in the paste</text>
    <rect x="400" y="46" width="260" height="150" rx="4" fill="var(--surface2)" stroke="var(--dark)" stroke-width="1.5"/>
    <path d="M470,150 C455,120 470,92 500,84 C534,75 566,92 570,118 C574,146 548,168 516,166 C494,165 478,160 470,150 Z" fill="var(--bg)" stroke="var(--amber)" stroke-width="2"/>
    <path d="M600,168 C592,152 604,138 620,140 C634,142 638,156 630,166 C622,175 606,177 600,168 Z" fill="var(--bg)" stroke="var(--amber)" stroke-width="2"/>
    <text x="530" y="34" text-anchor="middle" fill="var(--dark)">entrapped — left behind</text>
    <text x="530" y="216" text-anchor="middle">large, irregular, few</text>
    <text x="530" y="232" text-anchor="middle">a weak spot, not protection</text>
    <line x1="60" y1="262" x2="110" y2="262" stroke="var(--royal)" stroke-width="2"/>
    <path d="M110,262 l-7,-4 v8 z" fill="var(--royal)"/>
    <circle cx="128" cy="262" r="13" fill="var(--bg)" stroke="var(--dark)" stroke-width="1.5"/>
    <text x="150" y="266" fill="var(--dark)">freezing water finds the nearest bubble — the pressure lets go</text>
    <text x="60" y="294">Both kinds are counted by the meter. Only the small, close ones do the protecting.</text>
  </g>
</svg>
<figcaption>Figure 1. The two kinds of air. The meter reports their total, so a sample that was rodded badly can read the right number for the wrong reason.</figcaption>
</figure>

<h2 id="pressure"><span class="num">2</span>The pressure meter (ASTM C231)</h2>
<p>The pressure method does not see the bubbles. It squeezes them. A known volume of air, held in a chamber at a known pressure, is released into a sealed bowl of concrete. The only compressible thing in the bowl is the air inside the concrete, so the pressure that settles out depends on how much of it there is — and the gauge face is printed in percent air rather than in pressure units, so the technician reads the answer directly.</p>
<figure>
<svg class="fig-svg" viewBox="0 0 720 330" role="img" aria-labelledby="fig2-title">
  <title id="fig2-title">Type B pressure meter: the air chamber, the main air valve, the bowl of concrete and the gauge</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="12" fill="var(--muted)">
    <path d="M96,150 h188 v128 a8,8 0 0 1 -8,8 h-172 a8,8 0 0 1 -8,-8 z" fill="var(--surface2)" stroke="var(--dark)" stroke-width="2"/>
    <g fill="var(--bg)" stroke="var(--dark)" stroke-width="1">
      <circle cx="130" cy="190" r="5"/><circle cx="176" cy="212" r="5"/><circle cx="228" cy="186" r="5"/><circle cx="262" cy="226" r="5"/><circle cx="150" cy="250" r="5"/><circle cx="212" cy="256" r="5"/>
    </g>
    <rect x="88" y="132" width="204" height="18" rx="3" fill="var(--vintage)" stroke="var(--dark)" stroke-width="2"/>
    <text x="190" y="145" text-anchor="middle" fill="var(--dark)">water above the concrete</text>
    <path d="M84,150 h-10 v-16 h10 M296,150 h10 v-16 h-10" fill="none" stroke="var(--dark)" stroke-width="2"/>
    <text x="190" y="306" text-anchor="middle" fill="var(--dark)">bowl of concrete — rodded, struck off, clamped</text>
    <path d="M266,230 L300,252" stroke="var(--muted)" stroke-width="1" fill="none"/>
    <text x="304" y="256">air voids in the concrete</text>
    <rect x="392" y="96" width="132" height="86" rx="4" fill="var(--neon)" stroke="var(--dark)" stroke-width="2"/>
    <text x="458" y="130" text-anchor="middle" fill="var(--dark)">air chamber</text>
    <text x="458" y="148" text-anchor="middle">pumped to the</text>
    <text x="458" y="164" text-anchor="middle">initial pressure</text>
    <path d="M392,140 H330 v40 h-38" fill="none" stroke="var(--dark)" stroke-width="2"/>
    <circle cx="330" cy="160" r="9" fill="var(--bg)" stroke="var(--royal)" stroke-width="2"/>
    <text x="330" y="122" text-anchor="middle" fill="var(--royal)">main air valve</text>
    <circle cx="612" cy="152" r="58" fill="var(--bg)" stroke="var(--dark)" stroke-width="2"/>
    <path d="M612,152 L578,116" stroke="var(--amber)" stroke-width="3"/>
    <circle cx="612" cy="152" r="5" fill="var(--dark)"/>
    <g font-size="10" text-anchor="middle" fill="var(--muted)">
      <text x="566" y="108">0</text><text x="612" y="100">2</text><text x="658" y="112">4</text><text x="672" y="152">6</text><text x="656" y="192">8</text>
    </g>
    <text x="612" y="228" text-anchor="middle" fill="var(--dark)">gauge, read to 0.1 % air</text>
    <text x="60" y="60" fill="var(--dark)">Open the valve and the chamber's air pushes into the bowl.</text>
    <text x="60" y="78">The more air the concrete holds, the further the needle falls.</text>
  </g>
</svg>
<figcaption>Figure 2. A Type B meter. Water fills the space between the concrete and the lid so that the only compressible volume left in the bowl is the air in the concrete itself.</figcaption>
</figure>
<ol class="steps">
  <li><strong>Fill and consolidate.</strong> Three layers, twenty-five strokes of the tamping rod each, the second and third penetrating about an inch into the layer below; after each layer, tap the sides smartly ten to fifteen times with the mallet to close the holes the rod left.</li>
  <li><strong>Strike off and clean the rim.</strong> Leave the measure just level full, then wipe the flange — a smear of mortar there is a leak, and a leak reads as air.</li>
  <li><strong>Clamp and flood.</strong> Moisten the underside of the cover, open both petcocks, close the main air valve, clamp the cover down. Inject water through one petcock until it runs out of the other, and jar the meter gently until no more air comes with it.</li>
  <li><strong>Set the initial pressure.</strong> Close the bleeder valve and pump past the initial pressure line; wait a few seconds for the compressed air to cool, then tap the gauge and bleed slowly back until the needle sits exactly on the line.</li>
  <li><strong>Equalize and read.</strong> Close both petcocks, open the main air valve, tap the side of the measure with the mallet and tap the gauge to settle the needle. Read the air content to the nearest 0.1 %.</li>
  <li><strong>Subtract the aggregate.</strong> The aggregate carries a little air of its own. The aggregate correction factor for the mix is subtracted from the gauge reading to get the air in the concrete.</li>
</ol>
<div class="callout callout-warn"><span class="label">Watch out</span>
  <p>The pressure method assumes the aggregate is dense. With lightweight aggregate, air-cooled slag or any porous stone the correction factor cannot be pinned down, and the volumetric method (ASTM C173) is used instead. The gauge itself is not permanent either: it is standardized against a known volume of water at least every three months, and the result is logged with the meter.</p>
</div>

<h2 id="density"><span class="num">3</span>Density and yield (ASTM C138)</h2>
<div class="fig-grid">
  <figure><img src="img/tools.jpg" width="1200" height="797" alt="A slump cone with a filling funnel standing on a base plate, with a strike-off plate, a tamping rod, a trowel and a red brush on the concrete floor around it" loading="lazy"><figcaption>The bench a fresh-concrete test runs from. The rod and the strike-off plate here are the same ones the density measure and the air meter use. Photo: Habib M'henni, Wikimedia Commons, CC BY 4.0.</figcaption></figure>
  <figure><img src="img/filling.jpg" width="1200" height="797" alt="A cylindrical steel mould clamped to a base plate being filled with a trowel from a pile of fresh concrete" loading="lazy"><figcaption>Filling a cylindrical steel mould from the sample pile. A density measure is filled the same way and struck off with the plate lying beside it. Photo: Habib M'henni, Wikimedia Commons, CC BY 4.0.</figcaption></figure>
</div>
<p>The second test weighs a known volume of the same concrete. That single number — the density, still universally called the unit weight — is worth more than it looks, because everything else on the batch ticket can be checked against it.</p>
<p>The measure is a stiff cylindrical container whose volume is known, not assumed. Bigger aggregate needs a bigger measure, and the bowl of the air meter can serve as the measure if it is the right size.</p>
<div class="table-wrap">
<table class="ref-table" id="tbl-measures">
  <caption>Table 1. Measure capacity by nominal maximum size of aggregate</caption>
  <thead><tr><th scope="col">Nominal maximum size of aggregate</th><th scope="col">Capacity, ft³</th><th scope="col">Capacity, m³</th></tr></thead>
  <tbody>
    <tr><th scope="row">1 in. (25 mm)</th><td data-ft3="0.25">0.25</td><td data-m3="0.0071">0.0071</td></tr>
    <tr><th scope="row">2 in. (50 mm)</th><td data-ft3="0.5">0.5</td><td data-m3="0.0142">0.0142</td></tr>
    <tr><th scope="row">3 in. (76 mm)</th><td data-ft3="1.0">1.0</td><td data-m3="0.0283">0.0283</td></tr>
  </tbody>
</table>
</div>
<p class="ref-note">The volume is established by weighing the measure full of water at a known temperature and dividing that mass by the density of water at that temperature — not by trusting the nameplate. A 1/4 ft³ measure that holds 15.53 lb of water at 23 °C has a volume of 15.53 ÷ 62.274 = 0.2494 ft³, and that is the number the density is figured on.</p>
<p>How the concrete is consolidated depends on how wet it is: rodding above a 3 in. slump, rodding or internal vibration between 1 and 3 in., internal vibration below 1 in. Rodding follows the same rhythm as the air test — three layers, twenty-five strokes, ten to fifteen mallet taps — and the last layer is left about an eighth of an inch proud so the strike-off plate has something to take off. Then the outside is wiped clean and the whole thing is weighed.</p>
<div class="eq"><i>ρ</i> = <span class="frac"><span>mass of concrete</span><span><i>V</i><sub>m</sub></span></span> &nbsp;·&nbsp; <i>Y</i> = <span class="frac"><span><i>W</i></span><span><i>ρ</i></span></span> &nbsp;·&nbsp; <i>N</i> = <span class="frac"><span><i>N</i><sub>t</sub></span><span><i>Y</i></span></span></div>
<p><i>ρ</i> is the density, <i>V</i><sub>m</sub> the volume of the measure, <i>W</i> the total mass of everything batched, <i>Y</i> the yield — the volume of concrete that batch produced — and <i>N</i> the cementitious content actually delivered per unit volume, from <i>N</i><sub>t</sub>, the mass of cementitious material in the batch. Divide the cubic feet by 27 for cubic yards. Density is reported to 0.1 lb/ft³, yield to 0.01 yd³, cement content to 1 lb/yd³ and the water-cement ratio to 0.01.</p>
<div class="callout callout-key"><span class="label">Key idea</span>
  <p>Both tests come from one sample and one clock. When the same sample serves both, the work begins within five minutes of taking it, and the density test goes first — the air meter's bowl is often the density measure, so it has to be weighed before it is clamped shut.</p>
</div>
<!-- END BLOCK A -->
```

Block B:

```html
<!-- BLOCK B -->
<h2 id="yield"><span class="num">4</span>Reading the yield</h2>
<p>Ready-mixed concrete is sold by volume and batched by weight, so the volume is never measured directly — it is computed from the density. That makes the density test the only check a purchaser has on whether eight cubic yards ordered were eight cubic yards delivered.</p>
<div class="eq"><i>R</i><sub>y</sub> = <span class="frac"><span><i>Y</i></span><span><i>Y</i><sub>d</sub></span></span></div>
<p>Relative yield is the volume obtained over the volume the batch was designed for. At 1.00 the load is what it claimed to be. Below 1.00 it is short, and the forms will run out of concrete before they run out of form. Above 1.00 the batch made more than it should have, which sounds like a gift and is usually a symptom: too much air, too much water, or aggregate batched heavy. A single load proves nothing either way — ASTM C94 asks for the average of three determinations, each from a different truck, before yield is called into question.</p>
<div class="callout callout-warn"><span class="label">Watch out</span>
  <p>Most "short load" complaints are not short loads. A slab 4 in. thick placed an eighth of an inch deep costs about three percent more concrete than the estimate — a whole cubic yard on a thirty-two yard order. Deflecting forms, an irregular subgrade and spillage all take their cut, which is why the practical advice is to order four to ten percent over the plan dimensions and to measure the forms before blaming the truck.</p>
</div>
<p>One more subtraction is honest to make: hardened concrete occupies about two percent less space than the fresh concrete it came from, as air is lost, the mix settles and bleeds, and the paste shrinks on drying. The yield test measures what came out of the truck, not what will still be there next month.</p>

<h2 id="example"><span class="num">5</span>Worked example</h2>
<p>An eight-cubic-yard load is batched to the mixture used throughout this site — 299 lb of water, 544 lb of cement, 1,872 lb of coarse aggregate and 1,292 lb of fine aggregate for every cubic yard, with 1.5 % air designed in. That is 4,007 lb of material per cubic yard, so the ticket totals 32,056 lb of material and 4,352 lb of cement. The example numbers are made up but typical.</p>
<p>The materials themselves, with no air at all, take up 27.00 × (1 − 0.015) = 26.60 cu ft per cubic yard, or 212.76 cu ft for the load. Dividing the batch mass by that air-free volume gives the <strong>theoretical density</strong> — what this concrete would weigh per cubic foot if it contained no air at all:</p>
<div class="eq"><i>T</i> = <span class="frac"><span>32,056 lb</span><span>212.76 cu ft</span></span> = 150.7 lb/cu ft</div>
<p>Now the density measure comes out. Two loads from the same ticket are weighed, and they do not agree.</p>
<div class="table-wrap">
<table class="ref-table" id="tbl-example" data-materials="32056" data-ordered="8" data-cement="4352" data-design-air="1.5">
  <caption>Table 2. The same batch ticket read through two densities (example numbers)</caption>
  <thead><tr><th scope="col">Quantity</th><th scope="col">Load A</th><th scope="col">Load B</th></tr></thead>
  <tbody>
    <tr><th scope="row">Measured density, lb/cu ft</th><td data-density="148.4">148.4</td><td data-density="145.0">145.0</td></tr>
    <tr><th scope="row">Yield, cu yd</th><td data-result="8.00">8.00</td><td data-result="8.19">8.19</td></tr>
    <tr><th scope="row">Relative yield</th><td data-result="1.00">1.00</td><td data-result="1.02">1.02</td></tr>
    <tr><th scope="row">Air content (gravimetric), %</th><td data-result="1.5">1.5</td><td data-result="3.8">3.8</td></tr>
    <tr><th scope="row">Cement content, lb/cu yd</th><td data-result="544">544</td><td data-result="532">532</td></tr>
  </tbody>
</table>
</div>
<div class="eq"><i>A</i> = <span class="frac"><span><i>T</i> − <i>D</i></span><span><i>T</i></span></span> × 100 = <span class="frac"><span>150.7 − 145.0</span><span>150.7</span></span> × 100 = 3.8 %</div>
<p>Load A is the mixture the designer drew: eight cubic yards of concrete, air on target, the full 544 lb of cement in every yard of it. Load B is three and a half pounds per cubic foot lighter, and every one of those pounds has to be somewhere. It is air — 3.8 % of it against the 1.5 % designed, better than two extra points. The batch swelled to 8.19 cubic yards, which is why nobody on site complained, and the cement that was supposed to be spread through eight yards is now spread through eight and a fifth: about 532 lb per cubic yard instead of 544. The load looks generous and is weaker than the drawing asked for.</p>
<p class="ref-note">The cement content is figured on the unrounded yield; dividing by the reported 8.19 gives 531 rather than 532. Gravimetric air agrees with a pressure-meter reading on the same concrete only as well as the batch weights and the aggregate relative densities do — the pressure meter measures the sample in front of it, while this arithmetic trusts the ticket.</p>
<figure>
<svg class="fig-svg" viewBox="0 0 720 280" role="img" aria-labelledby="fig3-title">
  <title id="fig3-title">The same materials with 1.5 percent and 3.8 percent air, and the densities that result</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="12" fill="var(--muted)">
    <text x="60" y="30" fill="var(--dark)">One cubic yard of materials, air-free: 26.60 cu ft. The air rides on top.</text>
    <rect x="90" y="62" width="44.3" height="34" fill="var(--royal)" stroke="var(--bg)" stroke-width="1"/>
    <rect x="134.3" y="62" width="76.7" height="34" fill="var(--vintage)" stroke="var(--bg)" stroke-width="1"/>
    <rect x="211" y="62" width="179.1" height="34" fill="var(--dark)" stroke="var(--bg)" stroke-width="1"/>
    <rect x="390.1" y="62" width="125.4" height="34" fill="var(--icy)" stroke="var(--bg)" stroke-width="1"/>
    <rect x="515.5" y="62" width="6.5" height="34" fill="var(--amber)" stroke="var(--dark)" stroke-width="1"/>
    <text x="52" y="84" text-anchor="end" fill="var(--dark)">Load A</text>
    <g font-size="10" fill="var(--bg)" text-anchor="middle">
      <text x="112" y="84">cem</text><text x="300" y="84">coarse aggregate</text>
    </g>
    <g font-size="10" fill="var(--dark)" text-anchor="middle">
      <text x="172" y="84">water</text><text x="453" y="84">fine aggregate</text>
    </g>
    <text x="545" y="70" fill="var(--dark)">27.00 cu ft</text>
    <text x="545" y="86" fill="var(--dark)">148.4 lb/cu ft</text>
    <text x="545" y="102" fill="var(--amber)">air 1.5 %</text>
    <rect x="90" y="140" width="425.5" height="34" fill="var(--surface2)" stroke="var(--dark)" stroke-width="1"/>
    <rect x="515.5" y="140" width="16.6" height="34" fill="var(--amber)" stroke="var(--dark)" stroke-width="1"/>
    <text x="52" y="162" text-anchor="end" fill="var(--dark)">Load B</text>
    <text x="302" y="162" text-anchor="middle" fill="var(--dark)">the same 26.60 cu ft of materials</text>
    <text x="545" y="148" fill="var(--dark)">27.63 cu ft</text>
    <text x="545" y="164" fill="var(--dark)">145.0 lb/cu ft</text>
    <text x="545" y="180" fill="var(--amber)">air 3.8 %</text>
    <line x1="90" y1="212" x2="630" y2="212" stroke="var(--border)" stroke-width="1"/>
    <text x="60" y="238" fill="var(--dark)">Same mass, more volume: density falls, yield rises, cement is spread thinner.</text>
    <text x="60" y="262">The amber sliver is all that changed. It moves every number on the ticket.</text>
  </g>
</svg>
<figcaption>Figure 3. Air is the only thing that changed. It is a sliver of the volume and it moves every number on the ticket.</figcaption>
</figure>

<h2 id="mistakes"><span class="num">6</span>Common mistakes</h2>
<ul>
  <li><strong>Forgetting the aggregate correction factor.</strong> The gauge reading is not the air content until the aggregate's own air is subtracted. Skipping it reports air the concrete does not have.</li>
  <li><strong>A dirty flange.</strong> Mortar on the sealing surface leaks, and a leak always reads as more air. Wipe the rim before the cover goes on.</li>
  <li><strong>Over-vibrating the sample.</strong> Vibration long past consolidation drives out the entrained air the admixture was bought for — and the sample no longer represents the concrete in the forms.</li>
  <li><strong>Trusting the nameplate volume.</strong> Measures get dented and worn. The volume is the mass of water it holds divided by the density of water at that temperature, checked on a schedule.</li>
  <li><strong>Calling a load short from one test.</strong> Yield is judged on three determinations from three trucks. One low density is a question, not a verdict.</li>
  <li><strong>Blaming the truck before measuring the forms.</strong> An eighth of an inch of extra slab thickness costs about three percent of the order — more than most real yield discrepancies.</li>
</ul>

<h2 id="takeaways"><span class="num">7</span>Key takeaways</h2>
<ol>
  <li>Air is bought for <strong>freeze-thaw survival</strong> and paid for in strength; the meter reports entrained and entrapped air together, so consolidation has to be right before the reading means anything.</li>
  <li>The pressure method (C231) works by <strong>equalizing a known air volume</strong> into the sealed bowl, read to 0.1 % and corrected for the aggregate — and it is only valid for dense aggregate.</li>
  <li>Density (C138) is <strong>mass ÷ the measured volume of the measure</strong>, and from it come the yield <i>W</i>/<i>ρ</i>, the relative yield, and the cement actually delivered per cubic yard.</li>
  <li>Comparing the measured density with the <strong>theoretical density</strong> gives the air content a second way — and explains where a light load's missing pounds went.</li>
</ol>

<p class="ref-note">Sources: ASTM C231/C231M (air content by the pressure method) and ASTM C138/C138M (density, yield and gravimetric air content), as published in the WSDOT Materials Manual M 46-01.48 (January 2026) field operating procedures for AASHTO T 152 and T 121, which mirror them; the WAQTC field procedure for T 121; NRMCA CIP 8, <i>Discrepancies in Yield</i>; ASTM C94 for the three-truck yield rule; ASTM C173 for the volumetric method. Clause numbers, aggregate correction factors and the strength cost of air are described qualitatively; consult the current edition for the numbers.</p>
<p class="ref-note">Photo credits: <a href="https://commons.wikimedia.org/wiki/File:High_Performance_Concrete_WI_(8447067151).jpg">High Performance Concrete WI</a> by the Federal Highway Administration, public domain; <a href="https://commons.wikimedia.org/wiki/File:Essais_sur_b%C3%A9ton_DSC_2155.jpeg">Essais sur béton DSC 2155</a> and <a href="https://commons.wikimedia.org/wiki/File:Essais_sur_b%C3%A9ton_DSC_2171.jpeg">DSC 2171</a> by Habib M'henni, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>; all via Wikimedia Commons. The photos were resized, cropped and recompressed for the web.</p>

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
</body>
</html>
<!-- END BLOCK B -->
```

- [ ] **Step 2: Check the cross-page anchor exists**

Run `grep -n 'id="step-3"' site/study/mix-design/index.html`. The page links to `../mix-design/#step-3`; the guard test checks cross-page anchors, so this must print a line. If the id is different, use the id that actually marks the mixing-water / air-content step in Part 1 and say which one you used.

- [ ] **Step 3: Write the example-integrity test**

Create `tools/airyield.test.mjs`:

```js
// tools/airyield.test.mjs — 공기량·단위중량 글(site/study/air-yield/index.html)의 표 수치 검사 (node --test)
// HTML 파서 없이 정규식으로 표를 읽어, 배치 티켓 입력에서 T·Y·Ry·A·N 을 다시 계산해 표시값과 대조한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const E = require('../site/labs/mix-design/engine.js');
const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../site/study/air-yield/index.html'), 'utf8');

function table(id) {
  const m = HTML.match(new RegExp(`<table([^>]*id="${id}"[^>]*)>([\\s\\S]*?)</table>`));
  assert.ok(m, `table #${id} missing`);
  return { attrs: m[1], body: m[2] };
}
function bodyRows(tbl) {
  const tb = tbl.body.match(/<tbody>([\s\S]*?)<\/tbody>/);
  assert.ok(tb, 'tbody missing');
  return [...tb[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m =>
    [...m[1].matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/g)].map(c => ({ attrs: c[1], text: c[2].replace(/<[^>]+>/g, '').trim() })));
}
const attr = (s, name) => { const m = s.match(new RegExp(`${name}="([^"]*)"`)); return m ? m[1] : null; };

test('Table 1: 용기 용량의 ft³ ↔ m³ 환산이 맞는다', () => {
  const rows = bodyRows(table('tbl-measures'));
  assert.deepEqual(rows.map(r => r[0].text), ['1 in. (25 mm)', '2 in. (50 mm)', '3 in. (76 mm)']);
  for (const r of rows) {
    const ft3 = Number(attr(r[1].attrs, 'data-ft3')), m3 = Number(attr(r[2].attrs, 'data-m3'));
    assert.equal(Number(r[1].text), ft3, 'ft³ text vs attribute');
    assert.equal(Number(r[2].text), m3, 'm³ text vs attribute');
    assert.equal(Math.round(ft3 * 0.0283168 * 1e4) / 1e4, m3, `${ft3} ft³ → ${m3} m³`);
  }
});

test('Table 2: 배치 티켓에서 수율·상대수율·중량법 공기량·시멘트함량을 재계산한 값과 표시값이 같다', () => {
  const t = table('tbl-example');
  const W = Number(attr(t.attrs, 'data-materials')), Yd = Number(attr(t.attrs, 'data-ordered'));
  const Nt = Number(attr(t.attrs, 'data-cement')), designAir = Number(attr(t.attrs, 'data-design-air'));
  const T = W / (Yd * 27 * (1 - designAir / 100));
  assert.equal(Math.round(T * 10) / 10, 150.7, 'theoretical density');
  const rows = bodyRows(t);
  assert.deepEqual(rows.map(r => r[0].text), ['Measured density, lb/cu ft', 'Yield, cu yd', 'Relative yield',
    'Air content (gravimetric), %', 'Cement content, lb/cu yd']);
  for (const col of [1, 2]) {
    const D = Number(attr(rows[0][col].attrs, 'data-density'));
    assert.equal(Number(rows[0][col].text), D, 'density text vs attribute');
    const Y = W / D / 27;
    const shown = [1, 2, 3, 4].map(i => Number(attr(rows[i][col].attrs, 'data-result')));
    assert.deepEqual(shown, [Math.round(Y * 100) / 100, Math.round((Y / Yd) * 100) / 100,
      Math.round(((T - D) / T) * 1000) / 10, Math.round(Nt / Y)], `column ${col}`);
    for (const i of [1, 2, 3, 4]) assert.equal(Number(rows[i][col].text), shown[i - 1], `row ${i} col ${col} text`);
  }
  assert.deepEqual([1, 2].map(c => Number(attr(rows[3][c].attrs, 'data-result'))), [1.5, 3.8]);
  assert.deepEqual([1, 2].map(c => Number(attr(rows[1][c].attrs, 'data-result'))), [8.00, 8.19]);
});

test('예제의 배치 질량이 사이트 앵커 배합·엔진의 무공기 부피와 맞는다', () => {
  const t = table('tbl-example');
  const W = Number(attr(t.attrs, 'data-materials')), Yd = Number(attr(t.attrs, 'data-ordered'));
  const anchor = { water: 299, cement: 544, ca: 1872, fa: 1292, airPct: 1.5 };
  const perYd3 = anchor.water + anchor.cement + anchor.ca + anchor.fa;
  assert.equal(perYd3, 4007, 'anchor mix mass per cu yd');
  assert.equal(W, Yd * perYd3, 'batch mass = ordered × mass per cu yd');
  // 엔진의 수율 계산에서 공기를 뺀 부피가 본문의 26.60 cu ft 와 같아야 한다
  const airFree = E.computeYield({ ...anchor, fa: anchor.fa }) - 27 * (anchor.airPct / 100);
  assert.ok(Math.abs(airFree - 26.60) < 0.02, `air-free volume ${airFree}`);
  assert.ok(HTML.includes('26.60 cu ft'), 'the page states the air-free volume');
  assert.equal(Number(attr(t.attrs, 'data-cement')), Yd * anchor.cement, 'cement on the ticket');
});
```

Run `node --test tools/airyield.test.mjs` → 3 pass (the page from Step 1 must already exist).

- [ ] **Step 4: Register with the guards** — in `tools/site-guards.test.mjs` add `'study/air-yield/index.html'` to the tokens-only `files` list (after `'study/rebar-tension/index.html'`) and to `ARTICLE_PAGES` (last).

- [ ] **Step 5: Gate + browser check**

Run the full gate (Global Constraints) → all pass (90 + 3 = 93). Then start a dev server in the background (`python tools/devserver.py 8795 site`) and capture the page headlessly:

```bash
"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --user-data-dir="D:/Codex/Temp/claude/D--Projects-Test/d64fe480-de3e-4585-8fe0-f5b32b07ce45/scratchpad/verify-air/profile1" --window-size=1440,11000 --screenshot="D:/Codex/Temp/claude/D--Projects-Test/d64fe480-de3e-4585-8fe0-f5b32b07ce45/scratchpad/verify-air/task2-1440.png" "http://localhost:8795/study/air-yield/"
```

(`mkdir -p` the folder first. Pass a **distinct `--user-data-dir` for every capture** — Edge otherwise reuses a persisted window size and silently ignores `--window-size`. If no PNG appears, run the same command once more. Verify the PNG's real pixel height with Pillow before trusting it.) Open the PNG with the Read tool and check: the hero; Figure 1 (two panels of bubbles, nothing overlapping); Figure 2 (bowl, chamber, valve, gauge — labels clear of the artwork); Table 1; the two-photo grid; Table 2; Figure 3 (two bars, the amber air slivers and their leader labels legible); the credits. Report anything overlapping or clipped instead of fixing it silently. Stop the server afterwards.

- [ ] **Step 6: Commit**

```bash
git add site/study/air-yield/index.html tools/airyield.test.mjs tools/site-guards.test.mjs && git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 공기량·단위중량 글 — 본문 7절·SVG 도해 3장·표 2개·사진 3장(정적), 예제 재계산 검사 airyield.test, 가드 목록 갱신

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Registry entry, README, and Study index verification

**Files:** `site/shared/registry.js`, `tools/registry.test.mjs`, `README.md`

- [ ] **Step 1: Test first.** In `tools/registry.test.mjs` set the expected page ids to `['mix-design-1', 'mix-design-2', 'aggregate-gradation', 'slump-test', 'concrete-cylinders', 'rebar-tension', 'air-yield', 'soil-compaction']` and rename the test to `'MATERIALS: 믹스 디자인 2편·골재 입도·슬럼프·공시체·철근 인장·공기량 글이 등록돼 있고 page href 가 실제 파일을 가리킨다'`. `node --test tools/registry.test.mjs` → 1 failure.

- [ ] **Step 2: Entry.** In `site/shared/registry.js`, between the `rebar-tension` entry and the `soil-compaction` entry insert:

```js
    { id: 'air-yield', group: 'materials', type: 'page', title: 'Air content and unit weight',
      desc: 'Two measurements from one bucket of fresh concrete — how much air the pressure meter finds (ASTM C231), and what the density says about how much concrete the batch really made (ASTM C138).',
      href: 'air-yield/' },
```

- [ ] **Step 3: README.** Add `` - `site/study/air-yield/` — *Air content and unit weight* (`index.html`, static); photos in `img/` `` between the rebar-tension and soil-compaction lines of the structure list; append ` tools/airyield.test.mjs` to the test command.

- [ ] **Step 4: Full gate** → all pass (93). Start `python tools/devserver.py 8796 site` in the background and capture `http://localhost:8796/study/` at 1440×2600 the same way as in Task 2 (distinct `--user-data-dir`, file `task3-study-index.png`): eight Materials cards in the order Part 1, Part 2, sieve analysis, slump test, concrete cylinders, reinforcing steel, air content, compaction control. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add site/shared/registry.js tools/registry.test.mjs README.md && git -c core.quotepath=false commit -F - <<'EOF'
feat: 레지스트리에 공기량·단위중량 글 등록(철근 인장 글 뒤), registry 테스트·README 갱신

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

## Self-Review

**스펙 커버리지**: §1 표의 7개 절 전부(Task 2 Block A/B), 도해 3장(A: Figure 1·2, B: Figure 3), 표 2개(A: `tbl-measures`, B: `tbl-example`), 사진 3장(Task 1 + A/B의 `<img>`), 테스트 3종(Task 2 Step 3)과 가드·레지스트리(Task 2 Step 4, Task 3). §3 워크 예제의 여섯 값이 Block B의 표와 본문에 그대로 들어가 있고 테스트가 재계산한다. 빠진 항목 없음.

**플레이스홀더**: 없음 — 페이지·테스트·prep 스크립트 모두 그대로 붙여 넣을 수 있는 완성본이다.

**타입 일관성**: Task 1이 만드는 파일명·픽셀 크기(placing 1200×900, tools/filling 1200×797)가 Block A의 `<img width/height>`와 같다. Task 2가 만드는 표 id·`data-*` 속성명이 `tools/airyield.test.mjs`가 읽는 이름과 같다. Task 3의 id `air-yield` 가 폴더명·href·가드 목록과 같다.
