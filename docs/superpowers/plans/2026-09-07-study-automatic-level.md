# Study "Automatic level" 실습 매뉴얼 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Study 의 아홉 번째 글이자 **Surveying 그룹 첫 글** — 자동레벨로 수준측량을 실제로 수행하는 실습 매뉴얼. 정적 페이지에 SVG 도해 4장, 표 3개(규격·야장·2-peg), 사진 5장. 계산기 없음. 단위는 US 관용단위(ft).

**Architecture:** `site/study/leveling/index.html` 한 장(기존 article 템플릿, 새 CSS 없음). 야장·2-peg 예제의 모든 숫자는 표의 `data-*` 입력에서 `tools/leveling.test.mjs`가 다시 계산해 대조한다. 사진·레지스트리·가드는 기존 패턴 그대로.

**Tech Stack:** 정적 HTML/CSS, 인라인 SVG, Node 20 `node --test`, Python 3 + Pillow.

**Spec:** `docs/superpowers/specs/2026-09-07-study-automatic-level-design.md`. 조사 노트: `D:\Codex\Temp\claude\D--Projects-Test\d64fe480-de3e-4585-8fe0-f5b32b07ce45\scratchpad\level-research\research.txt`. 템플릿 참고: `site/study/air-yield/index.html`.

## Global Constraints

- 워크트리 `D:\Projects\Test\.claude\worktrees\study-level`(브랜치 `worktree-study-level`)에서만 작업.
- `site/` 아래 대문자 `CNST` 금지, 학과·대학명 금지, 리터럴 색 금지(인라인 SVG 포함, 토큰만), `#` + 16진수 3자 이상 문자열 금지.
- 푸터 문구 `© <span id="year"></span> Jisoo Park. All rights reserved.`, 영어 본문, 한국어 주석, 이모지·로고 금지.
- **단위는 ft**(표척 읽음·표고는 0.01 ft, 시준거리 ft, 루프 길이 마일). SI 병기 없음.
- 수치는 조사 노트의 출처에서만: Caltrans Surveys Manual ch.8(3급 규격·2-peg 허용), MTSU 실습교재(야장 서식·스타디아·현장 수치), Chabuk 강의(정의). 예제는 "example numbers"로 표시.
- **유튜브 영상은 자막을 받지 못했으므로 내용을 인용하지 않는다** — 제목·채널·링크만, "먼저 보고 오라"는 안내로.
- 사진 크레딧: 캡션에 저자·라이선스 + 말미 크레딧 문단(파일 페이지·딛 링크) + "The photos were resized, cropped and recompressed for the web."
- `<img>`의 width/height는 실제 픽셀, 사진 ≤220 KB·긴 변 ≤1200 px, 폴더 가드 `study/leveling/img: 5`.
- 커밋: `git add … && git -c core.quotepath=false commit -F - <<'EOF' … EOF`, 한국어 메시지, 트레일러 `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Bash 호출당 평범한 명령 하나.
- 테스트 게이트: `node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs tools/study-tables.test.mjs tools/site-guards.test.mjs tools/layout.test.mjs tools/props.test.mjs tools/decor.test.mjs tools/compaction.test.mjs tools/cylinders.test.mjs tools/gradation.test.mjs tools/rebar.test.mjs tools/airyield.test.mjs tools/leveling.test.mjs`

## File Structure

- Create `site/study/leveling/img/{setup,instrument,observing,rodman,benchmark}.jpg` + 목록 썸네일 `site/study/img/leveling.jpg` (Task 1); modify `tools/site-guards.test.mjs`.
- Create `site/study/leveling/index.html`, `tools/leveling.test.mjs` (Task 2); modify `tools/site-guards.test.mjs`(토큰 목록·ARTICLE_PAGES).
- Modify `site/shared/registry.js`, `tools/registry.test.mjs`, `README.md` (Task 3).

---

### Task 1: 사진 5장 + 목록 썸네일 + 가드

**Files:** `site/study/leveling/img/*.jpg`, `site/study/img/leveling.jpg`, `tools/site-guards.test.mjs`

**Interfaces:** Task 2가 하드코딩할 픽셀 크기 — setup 1200×900, instrument 1200×675, observing 1200×847, rodman 1200×900, benchmark 1200×901.

- [ ] **Step 1** 원본은 이미 받아 뒀다: `D:\Codex\Temp\claude\D--Projects-Test\d64fe480-de3e-4585-8fe0-f5b32b07ce45\scratchpad\level-research\orig\{setup,instrument,observing,rodman,benchmark}.jpg`. 아래 스크립트를 Write 로 만들고 한 번 실행한다.

```python
# -*- coding: utf-8 -*-
# prep.py — 자동레벨 글 사진 5장 + 목록 썸네일 1장
import os, sys
from PIL import Image, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True
SRC, DST = sys.argv[1], sys.argv[2]
THUMB = sys.argv[3]
os.makedirs(DST, exist_ok=True); os.makedirs(os.path.dirname(THUMB), exist_ok=True)
# (원본, 결과, 목표 크기) — 원본 종횡비를 유지하는 크기만 쓴다(왜곡 금지)
JOBS = [('setup.jpg', 'setup.jpg', (1200, 900)), ('instrument.jpg', 'instrument.jpg', (1200, 675)),
        ('observing.jpg', 'observing.jpg', (1200, 847)), ('rodman.jpg', 'rodman.jpg', (1200, 900)),
        ('benchmark.jpg', 'benchmark.jpg', (1200, 901))]
def save(im, path, limit, q=80):
    while True:
        im.save(path, 'JPEG', quality=q, optimize=True, progressive=True)
        if os.path.getsize(path) <= limit or q <= 45: return q
        q -= 4
for name, out, size in JOBS:
    im = Image.open(os.path.join(SRC, name)).convert('RGB')
    w, h = im.size; tw, th = size
    # 목표 종횡비에 맞춰 중앙 크롭한 뒤 축소한다
    if w / h > tw / th:
        nw = round(h * tw / th); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = round(w * th / tw); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    im = im.resize(size, Image.LANCZOS)
    p = os.path.join(DST, out); q = save(im, p, 220 * 1024)
    print(f'{out:16s} {im.size} {os.path.getsize(p):7d} B q{q}')
# 목록 카드 썸네일: 세트업 사진에서 360×240
im = Image.open(os.path.join(SRC, 'setup.jpg')).convert('RGB')
w, h = im.size; nh = round(w * 240 / 360)
im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh)).resize((360, 240), Image.LANCZOS)
q = save(im, THUMB, 40 * 1024, 82)
print(f'{os.path.basename(THUMB):16s} (360, 240) {os.path.getsize(THUMB):7d} B q{q}')
```

실행: `python "<위 경로>/prep.py" "<orig 경로>" site/study/leveling/img site/study/img/leveling.jpg`

- [ ] **Step 2** 여섯 결과를 Read 로 열어 확인한다. **setup** 노란 삼각대 위 레벨과 멀리 표척을 든 사람(장비는 디지털 레벨), **instrument** 케이스에 든 레벨 본체 근접, **observing** 안전모 쓴 사람이 레벨을 들여다보는 장면, **rodman** 넓은 발굴 현장에서 표척을 든 사람, **benchmark** 벽에 박힌 "522.18" 수준점 원판, **leveling.jpg** 세트업 사진의 360×240 썸네일. 다르면 NEEDS_CONTEXT 로 멈춘다.

- [ ] **Step 3** `tools/site-guards.test.mjs` 두 곳:
  - 폴더 dict 에 `'study/leveling/img': 5` 추가, 테스트 이름 끝에 ` · leveling 5` 추가.
  - 썸네일 테스트의 기대 개수를 `8` → `9` 로.
- [ ] **Step 4** `node --test tools/site-guards.test.mjs` → 통과.
- [ ] **Step 5** 커밋

```bash
git add site/study/leveling/img site/study/img/leveling.jpg tools/site-guards.test.mjs && git -c core.quotepath=false commit -F - <<'EOF'
feat: 자동레벨 글 사진 5장 + 목록 썸네일(Commons CC, ≤1200 px·≤220 KB), 사진·썸네일 가드 갱신

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2: 매뉴얼 페이지 + 예제 재계산 테스트 + 가드 등록

**Files:** `site/study/leveling/index.html`(블록 A+B), `tools/leveling.test.mjs`, `tools/site-guards.test.mjs`

**Interfaces:** 표 id `tbl-specs`, `tbl-fieldbook`(`<table>`에 `data-start="100.00"`, 각 행에 `data-bs`/`data-fs`, 결과 셀에 `data-hi`/`data-elev`/`data-adj`), `tbl-peg`(`data-a1 data-b1 data-a2 data-b2`, 결과 셀 `data-result`). 이 마크업을 테스트가 파싱하므로 구조를 바꾸지 않는다.

- [ ] **Step 1** 브리프의 `<!-- BLOCK A -->`/`<!-- BLOCK B -->` 두 펜스를 스크립트로 추출·연결해 `site/study/leveling/index.html` 로 쓴다(마커 4줄 제거). `<!doctype html>` 로 시작하고 `</html>` 로 끝나며 마커가 없는지 확인한다.

Block A:

```html
<!-- BLOCK A -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Automatic level: a field manual — Construction Study Lab</title>
<meta name="description" content="How to run a level loop with an automatic level: setting up, reading the rod, backsights and foresights, closing and checking the loop, and the daily two-peg test. Field manual in US units.">
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
  <p class="eyebrow">Surveying · Field manual</p>
  <h1>Automatic level</h1>
  <p class="lede">Take this one outside. Everything here is what you do with the instrument in front of you: set it up, read the rod, run a loop of elevations, and prove the work closes before you pack up.</p>
  <p class="byline">Jisoo Park · September 2026 · 14 min read</p>
</div></section>

<main class="article-layout">
<nav class="toc" aria-label="Contents">
  <h2>Contents</h2>
  <ol>
    <li><a href="#instrument">1. The instrument</a></li>
    <li><a href="#before">2. Before you go out</a></li>
    <li><a href="#setup">3. Setting up</a></li>
    <li><a href="#reading">4. Reading the rod</a></li>
    <li><a href="#run">5. Running the loop</a></li>
    <li><a href="#close">6. Closing the loop</a></li>
    <li><a href="#peg">7. The two-peg test</a></li>
    <li><a href="#example">8. Worked example</a></li>
    <li><a href="#mistakes">9. Common mistakes</a></li>
    <li><a href="#takeaways">10. Key takeaways</a></li>
  </ol>
</nav>

<article class="article">

<h2 id="instrument"><span class="num">1</span>The instrument</h2>
<figure>
  <img src="img/setup.jpg" width="1200" height="900" alt="A survey level on a yellow tripod in an open field, with a person holding a rod in the distance" loading="eager">
  <figcaption>The whole job in one picture: instrument on a tripod, rod held on a point some distance away, two people. The instrument here is a digital level; an automatic level sits on the same tripod and is used the same way. Photo: Cvstr, Wikimedia Commons, CC BY 4.0.</figcaption>
</figure>
<p>An automatic level gives you one thing: a <strong>horizontal line of sight</strong>. It does not measure angles, and it does not measure distance except roughly. Everything you get from it comes from comparing rod readings taken along that one horizontal line.</p>
<p>What makes it "automatic" is the <strong>compensator</strong> — a small prism assembly hung on wires inside the telescope. You only bring the circular bubble to the middle, which gets the instrument close to level; the compensator swings under gravity and bends the line of sight the rest of the way to horizontal. That is why there is no long bubble tube to re-centre before every sighting, and it is also why the instrument has to be treated as a pendulum: it needs a moment to settle, and it can jam.</p>
<figure>
<svg class="fig-svg" viewBox="0 0 720 320" role="img" aria-labelledby="fig1-title">
  <title id="fig1-title">The parts of an automatic level</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="12" fill="var(--muted)">
    <rect x="200" y="120" width="270" height="46" rx="10" fill="var(--icy)" stroke="var(--dark)" stroke-width="2"/>
    <rect x="470" y="126" width="20" height="34" rx="3" fill="var(--vintage)" stroke="var(--dark)" stroke-width="2"/>
    <rect x="182" y="130" width="18" height="26" rx="3" fill="var(--vintage)" stroke="var(--dark)" stroke-width="2"/>
    <rect x="300" y="128" width="60" height="30" rx="4" fill="none" stroke="var(--royal)" stroke-width="1.5" stroke-dasharray="5 4"/>
    <path d="M330,128 v10 M330,138 l-8,14 h16 z" fill="var(--royal)" stroke="none"/>
    <circle cx="395" cy="180" r="13" fill="var(--surface2)" stroke="var(--dark)" stroke-width="2"/>
    <circle cx="252" cy="184" r="14" fill="var(--bg)" stroke="var(--dark)" stroke-width="2"/>
    <circle cx="252" cy="184" r="5" fill="none" stroke="var(--royal)" stroke-width="1.5"/>
    <circle cx="310" cy="196" r="9" fill="var(--surface2)" stroke="var(--dark)" stroke-width="1.5"/>
    <path d="M210,205 h250 l-16,30 h-218 z" fill="var(--surface2)" stroke="var(--dark)" stroke-width="2"/>
    <g fill="var(--surface2)" stroke="var(--dark)" stroke-width="2">
      <rect x="228" y="235" width="12" height="22" rx="3"/><rect x="329" y="235" width="12" height="22" rx="3"/><rect x="430" y="235" width="12" height="22" rx="3"/>
    </g>
    <path d="M240,257 l-40,44 M335,257 v44 M430,257 l40,44" stroke="var(--dark)" stroke-width="2" fill="none"/>
    <path d="M492,140 h34 M366,143 h120 M395,193 h96" stroke="var(--muted)" stroke-width="1" fill="none"/>
    <text x="532" y="144" fill="var(--dark)">objective lens</text>
    <text x="500" y="118" fill="var(--royal)">compensator, inside</text>
    <path d="M330,120 v-8 h164" stroke="var(--royal)" stroke-width="1" fill="none"/>
    <text x="500" y="197" fill="var(--dark)">focusing knob</text>
    <path d="M178,143 h-20" stroke="var(--muted)" stroke-width="1" fill="none"/>
    <text x="152" y="147" text-anchor="end" fill="var(--dark)">eyepiece</text>
    <path d="M238,184 h-60" stroke="var(--muted)" stroke-width="1" fill="none"/>
    <text x="172" y="188" text-anchor="end" fill="var(--dark)">circular bubble</text>
    <path d="M301,196 h-40" stroke="var(--muted)" stroke-width="1" fill="none"/>
    <text x="255" y="216" text-anchor="end" fill="var(--dark)">tangent drive</text>
    <path d="M228,246 h-40" stroke="var(--muted)" stroke-width="1" fill="none"/>
    <text x="182" y="250" text-anchor="end" fill="var(--dark)">levelling screws (3)</text>
    <text x="60" y="300">You centre the circular bubble; the compensator does the rest.</text>
  </g>
</svg>
<figcaption>Figure 1. The controls you actually touch. The compensator is the only part doing work you cannot see.</figcaption>
</figure>
<div class="callout callout-def"><span class="label">Definitions</span>
  <p><strong>Benchmark (BM)</strong> — a permanent point whose elevation is known or assumed. <strong>Turning point (TP)</strong> — a temporary point, chosen only so the instrument can move forward; you read a foresight onto it, move the level, and read a backsight from it. <strong>Backsight (BS)</strong> — a reading on a point whose elevation you already have; it goes <em>into</em> the instrument height. <strong>Foresight (FS)</strong> — a reading on a point whose elevation you want; it comes <em>out</em> of the instrument height.</p>
</div>

<h2 id="before"><span class="num">2</span>Before you go out</h2>
<div class="fig-grid">
  <figure><img src="img/instrument.jpg" width="1200" height="675" alt="An automatic level lying in its fitted carrying case" loading="lazy"><figcaption>Check the instrument in the case before it goes on the tripod. Photo: Kskhh, Wikimedia Commons, CC BY-SA 4.0.</figcaption></figure>
  <figure><img src="img/benchmark.jpg" width="1200" height="901" alt="A metal levelling benchmark disc set into a wall, stamped with the elevation 522.18" loading="lazy"><figcaption>A levelling benchmark with its elevation stamped on it. Every loop starts and ends on one. Photo: Touam, Wikimedia Commons, CC BY-SA 4.0.</figcaption></figure>
</div>
<p><strong>What to bring.</strong> Automatic level and tripod; a levelling rod; a rod level (the small circular bubble that clamps to the rod); turning plates or a solid nail-headed stake for each turning point; field book and a pencil, not a pen; and the elevation of the benchmark you are starting from.</p>
<p><strong>Watch these first.</strong> Three short videos show the motions this manual describes; watch them before the lab so the instrument is not new to you when you get outside.</p>
<ul>
  <li><a href="https://www.youtube.com/watch?v=OWERdvgoq8w" rel="noopener" target="_blank">Setting Up the Automatic Level</a> — Illinois Surveyor (Illinois Professional Land Surveyors Association).</li>
  <li><a href="https://www.youtube.com/watch?v=M2MuCrvMwQs" rel="noopener" target="_blank">Surveying 2/3 (Differential Leveling Exercise)</a> — John Edwards.</li>
  <li><a href="https://www.youtube.com/watch?v=ij-yIAvChhk" rel="noopener" target="_blank">Surveying 3 — Two peg test</a> — OTEN Building &amp; Construction.</li>
</ul>
<div class="callout callout-warn"><span class="label">Do this first</span>
  <p>Run the <a href="#peg">two-peg test</a> before the day's work and again at the end of it, and write both into the field book. A level that has been jolted in a truck can read perfectly level and still be wrong by a measurable amount over a long sight — and you will not find out from the readings themselves.</p>
</div>

<h2 id="setup"><span class="num">3</span>Setting up</h2>
<ol class="steps">
  <li><strong>Pick the spot.</strong> Roughly midway between the two points you are about to read, on firm ground, out of the way of traffic. Midway matters — see <a href="#run">step 5</a>.</li>
  <li><strong>Spread and plant the tripod.</strong> Legs well apart, tripod head roughly level by eye and about chest height, then tread each leg firmly into the ground. On pavement, set the points in cracks or joints so they cannot slide.</li>
  <li><strong>Mount the instrument.</strong> Thread the tripod screw home firmly, not tight enough to strain it. Keep one hand on the level until the screw is engaged.</li>
  <li><strong>Centre the circular bubble — two screws, then one.</strong> Turn the telescope so it is parallel to any two of the three levelling screws. Turn those two <em>in opposite directions at the same time</em>; the bubble follows your left thumb. Then bring it the rest of the way in with the third screw alone. Repeat once; it converges quickly.</li>
  <li><strong>Check the compensator.</strong> Sight the rod, then tap the instrument lightly or press the compensator check button if it has one. The crosshair should swing a little and come back to the same reading. If it does not return, the compensator is jammed — stop and get another instrument.</li>
  <li><strong>Kill the parallax.</strong> Point the telescope at the sky or a blank wall and turn the <em>eyepiece</em> until the crosshairs are as black and sharp as they get. Only then use the <em>focusing knob</em> to bring the rod into focus. Move your eye up and down at the eyepiece: if the crosshair appears to slide along the rod, the parallax is not gone — repeat.</li>
  <li><strong>Frame the rod.</strong> Use the tangent drive to bring the vertical crosshair onto the middle of the rod so you are reading the face square-on.</li>
  <li><strong>Do not re-level between sights.</strong> Once the bubble is centred, the compensator handles the rest. If you knock a leg, re-level and re-read <em>everything</em> from that setup.</li>
</ol>

<h2 id="reading"><span class="num">4</span>Reading the rod</h2>
<figure>
  <img src="img/observing.jpg" width="1200" height="847" alt="A surveyor in a hard hat and high-visibility jacket sighting through a level mounted on a tripod" loading="lazy">
  <figcaption>At the eyepiece. The reading is whatever the horizontal crosshair cuts on the rod. Photo: Crossrail/MOLA, Wikimedia Commons, CC BY 4.0.</figcaption>
</figure>
<p>A US levelling rod is graduated in <strong>feet, tenths and hundredths</strong>. Read it in that order: the foot number below the crosshair, the tenth below it, then estimate the hundredth from the small blocks. Write down all three digits every time — <span class="mono">4.32</span>, never <span class="mono">4.3</span>.</p>
<p>The reticle carries <strong>three horizontal wires</strong>. The middle one is the reading. The upper and lower ones — the stadia wires — give you the distance to the rod, which is how you keep your sights balanced without a tape:</p>
<div class="eq"><i>D</i> = 100 × (upper − lower)</div>
<figure>
<svg class="fig-svg" viewBox="0 0 720 300" role="img" aria-labelledby="fig3-title">
  <title id="fig3-title">Reading a levelling rod through the three wires of the reticle</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="12" fill="var(--muted)">
    <rect x="96" y="40" width="58" height="232" fill="var(--bg)" stroke="var(--dark)" stroke-width="2"/>
    <g stroke="var(--dark)" stroke-width="1">
      <path d="M96,80 h20 M96,120 h20 M96,160 h20 M96,200 h20 M96,240 h20"/>
      <path d="M96,60 h12 M96,100 h12 M96,140 h12 M96,180 h12 M96,220 h12 M96,260 h12"/>
    </g>
    <g font-size="11" fill="var(--dark)">
      <text x="160" y="84">6</text><text x="160" y="124">5</text><text x="160" y="164">4</text><text x="160" y="204">3</text><text x="160" y="244">2</text>
    </g>
    <text x="125" y="30" text-anchor="middle" fill="var(--dark)">rod</text>
    <circle cx="400" cy="156" r="96" fill="var(--bg)" stroke="var(--dark)" stroke-width="2"/>
    <rect x="368" y="60" width="64" height="192" fill="var(--surface2)"/>
    <g stroke="var(--dark)" stroke-width="1">
      <path d="M368,92 h22 M368,124 h22 M368,156 h22 M368,188 h22 M368,220 h22"/>
    </g>
    <path d="M400,60 v192" stroke="var(--muted)" stroke-width="1"/>
    <path d="M318,108 h164" stroke="var(--royal)" stroke-width="1.5"/>
    <path d="M310,156 h180" stroke="var(--royal)" stroke-width="2.5"/>
    <path d="M318,204 h164" stroke="var(--royal)" stroke-width="1.5"/>
    <text x="506" y="112" fill="var(--dark)">upper 5.07</text>
    <text x="506" y="160" fill="var(--royal)">middle 4.32 — the reading</text>
    <text x="506" y="208" fill="var(--dark)">lower 3.57</text>
    <text x="506" y="240">interval 1.50 ft → D = 150 ft</text>
    <text x="506" y="262">(5.07 + 3.57) ÷ 2 = 4.32 ✓</text>
    <text x="60" y="292">Read feet, then tenths, then estimate hundredths. Always three digits.</text>
  </g>
</svg>
<figcaption>Figure 2. The three wires. The mean of the outer two must equal the middle one — that check catches a misread digit on the spot.</figcaption>
</figure>
<div class="callout callout-key"><span class="label">Key idea</span>
  <p>The rod must be <strong>plumb</strong>, not merely upright. Use the rod level; without one, wave the rod slowly toward and away from the instrument and take the <em>smallest</em> reading, which is the one taken when the rod passed through vertical. A rod leaning 3° at a 6 ft reading is 0.008 ft too high — bigger than the tolerance you are working to.</p>
</div>
<!-- END BLOCK A -->
```

Block B:

```html
<!-- BLOCK B -->
<h2 id="run"><span class="num">5</span>Running the loop</h2>
<figure>
  <img src="img/rodman.jpg" width="1200" height="900" alt="A person holding a levelling rod on a wide open excavation site, with spoil heaps behind" loading="lazy">
  <figcaption>The rodman's job is half the accuracy: right point, rod plumb, and standing still. Photo: Oxford Archaeology, Wikimedia Commons, CC BY 4.0.</figcaption>
</figure>
<p>Levelling walks a known elevation forward. From a setup you read <em>back</em> to a point you know, which tells you how high the line of sight is; then you read <em>forward</em> to a point you want, which tells you how far below that line it sits.</p>
<div class="eq"><i>HI</i> = elevation + <i>BS</i> &nbsp;·&nbsp; elevation = <i>HI</i> − <i>FS</i></div>
<figure>
<svg class="fig-svg" viewBox="0 0 720 330" role="img" aria-labelledby="fig2-title">
  <title id="fig2-title">Two instrument setups carrying an elevation from a benchmark to a turning point and on</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="12" fill="var(--muted)">
    <path d="M60,300 C200,296 300,286 400,282 C500,278 590,262 660,250" fill="none" stroke="var(--dark)" stroke-width="2"/>
    <path d="M92,296 v-108 M400,282 v-96 M652,250 v-84" stroke="var(--vintage)" stroke-width="6"/>
    <path d="M84,192 h240" stroke="var(--royal)" stroke-width="1.5" stroke-dasharray="6 4"/>
    <path d="M392,170 h268" stroke="var(--royal)" stroke-width="1.5" stroke-dasharray="6 4"/>
    <g stroke="var(--dark)" stroke-width="2" fill="var(--surface2)">
      <rect x="196" y="182" width="42" height="14" rx="3"/><path d="M204,196 l-12,32 M230,196 l12,32 M217,196 v32" fill="none"/>
      <rect x="500" y="160" width="42" height="14" rx="3"/><path d="M508,174 l-12,34 M534,174 l12,34 M521,174 v34" fill="none"/>
    </g>
    <path d="M104,192 v104" stroke="var(--muted)" stroke-width="1"/>
    <text x="112" y="240" fill="var(--dark)">BS 4.32</text>
    <path d="M388,192 v90" stroke="var(--muted)" stroke-width="1"/>
    <text x="330" y="240" text-anchor="end" fill="var(--dark)">FS 6.75</text>
    <path d="M412,170 v112" stroke="var(--muted)" stroke-width="1"/>
    <text x="420" y="226" fill="var(--dark)">BS 5.18</text>
    <path d="M644,170 v80" stroke="var(--muted)" stroke-width="1"/>
    <text x="636" y="212" text-anchor="end" fill="var(--dark)">FS 3.04</text>
    <text x="92" y="316" text-anchor="middle" fill="var(--dark)">BM-1</text>
    <text x="400" y="302" text-anchor="middle" fill="var(--dark)">TP1</text>
    <text x="656" y="272" text-anchor="middle" fill="var(--dark)">TP2</text>
    <text x="60" y="176" fill="var(--royal)">HI = 104.32</text>
    <text x="392" y="154" fill="var(--royal)">HI = 102.75</text>
    <text x="60" y="46" fill="var(--dark)">Setup 1: 100.00 + 4.32 = 104.32, then 104.32 − 6.75 = 97.57 at TP1.</text>
    <text x="60" y="66">Setup 2: 97.57 + 5.18 = 102.75, then 102.75 − 3.04 = 99.71 at TP2.</text>
    <text x="60" y="86">Keep the backsight and foresight distances equal at each setup.</text>
  </g>
</svg>
<figcaption>Figure 3. One setup produces one instrument height and hands the elevation forward through a turning point.</figcaption>
</figure>
<p><strong>Balance the sights.</strong> Set up midway so the backsight and foresight distances are within about 30 ft of each other. Any small tilt left in the line of sight then throws both readings the same way and cancels in the difference — and so do earth curvature and refraction. This one habit does more for your closure than anything else on the list.</p>
<div class="table-wrap">
<table class="ref-table" id="tbl-specs">
  <caption>Table 1. Third-order differential levelling with a compensator level (Caltrans Surveys Manual, Table 8-2)</caption>
  <thead><tr><th scope="col">Item</th><th scope="col">Limit</th></tr></thead>
  <tbody>
    <tr><th scope="row">Maximum sight length</th><td data-spec="sight">300 ft</td></tr>
    <tr><th scope="row">Difference between back and fore sight lengths, per setup</th><td data-spec="balance">33 ft</td></tr>
    <tr><th scope="row">Same, accumulated over the loop</th><td data-spec="balance-cum">33 ft</td></tr>
    <tr><th scope="row">Minimum ground clearance of the sight line</th><td data-spec="clearance">1.6 ft</td></tr>
    <tr><th scope="row">Maximum loop misclosure</th><td data-spec="loop">0.06 ft × √E</td></tr>
    <tr><th scope="row">Two-peg (collimation) test</th><td data-spec="peg">daily · 0.007 ft in 200 ft</td></tr>
  </tbody>
</table>
</div>
<p class="ref-note">E is the length of the loop in miles. Second-order work tightens the two-peg limit to 0.003 ft in 200 ft. On a hot day over pavement or bare ground the air shimmers and the rod dances: cut the sight length by a third or more, whatever the table allows.</p>

<h2 id="close"><span class="num">6</span>Closing the loop</h2>
<p>A level run that does not come back to a known elevation proves nothing. Finish where you started — or on a second benchmark — and do three things before you leave the site.</p>
<ol class="steps">
  <li><strong>Check the arithmetic.</strong> Sum the backsight column and the foresight column. ΣBS − ΣFS must equal the last elevation minus the first. On a closed loop that means ΣBS and ΣFS should be equal. This checks your adding, not your levelling.</li>
  <li><strong>Find the misclosure.</strong> The elevation you compute back at the starting benchmark minus its known elevation. This is the error in the work.</li>
  <li><strong>Compare it with the allowance.</strong> Third order allows 0.06 ft × √E, with E the loop length in miles. Over the allowance, the loop is rejected — re-run it; do not adjust it.</li>
</ol>
<p>If it closes, distribute the correction. Divide the misclosure by the number of setups and apply it cumulatively: the first computed elevation gets one share, the second two shares, and the last gets all of it, which brings the final elevation exactly back onto the benchmark. The benchmark you started from is never adjusted.</p>

<h2 id="peg"><span class="num">7</span>The two-peg test</h2>
<p>The compensator can be out of adjustment: it settles, but not quite on horizontal. The error is invisible on a balanced loop — it cancels — and it grows with sight length, so it shows up the moment your sights are uneven. The two-peg test measures it directly.</p>
<figure>
<svg class="fig-svg" viewBox="0 0 720 320" role="img" aria-labelledby="fig4-title">
  <title id="fig4-title">Two-peg test: instrument midway between the pegs, then close beside one of them</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="12" fill="var(--muted)">
    <path d="M70,120 h580" stroke="var(--dark)" stroke-width="2"/>
    <path d="M100,120 v-70 M620,120 v-70" stroke="var(--vintage)" stroke-width="6"/>
    <g stroke="var(--dark)" stroke-width="2" fill="var(--surface2)">
      <rect x="339" y="52" width="42" height="14" rx="3"/><path d="M347,66 l-12,42 M373,66 l12,42 M360,66 v42" fill="none"/>
    </g>
    <path d="M104,72 h232 M384,72 h232" stroke="var(--royal)" stroke-width="1.5" stroke-dasharray="6 4"/>
    <text x="100" y="140" text-anchor="middle" fill="var(--dark)">A</text>
    <text x="620" y="140" text-anchor="middle" fill="var(--dark)">B</text>
    <text x="220" y="106" text-anchor="middle">100 ft</text>
    <text x="500" y="106" text-anchor="middle">100 ft</text>
    <text x="60" y="40" fill="var(--dark)">Setup ① midway — equal sights, so any tilt cancels: this gives the true difference.</text>
    <path d="M70,250 h580" stroke="var(--dark)" stroke-width="2"/>
    <path d="M130,250 v-70 M620,250 v-70" stroke="var(--vintage)" stroke-width="6"/>
    <g stroke="var(--dark)" stroke-width="2" fill="var(--surface2)">
      <rect x="74" y="182" width="42" height="14" rx="3"/><path d="M82,196 l-12,42 M108,196 l12,42 M95,196 v42" fill="none"/>
    </g>
    <path d="M118,202 h500" stroke="var(--royal)" stroke-width="1.5" stroke-dasharray="6 4"/>
    <path d="M118,202 L618,190" stroke="var(--amber)" stroke-width="1.5"/>
    <text x="130" y="270" text-anchor="middle" fill="var(--dark)">A</text>
    <text x="620" y="270" text-anchor="middle" fill="var(--dark)">B</text>
    <text x="380" y="236" text-anchor="middle">200 ft</text>
    <text x="60" y="170" fill="var(--dark)">Setup ② beside A — the tilt (amber) has almost no room to act on A, and 200 ft to act on B.</text>
    <text x="60" y="300" fill="var(--amber)">The difference between the two answers is the collimation error over 200 ft.</text>
  </g>
</svg>
<figcaption>Figure 4. Equal sights hide the error; unequal sights expose it. That is the whole idea of the test — and the reason to balance sights while levelling.</figcaption>
</figure>
<ol class="steps">
  <li>Drive two pegs, A and B, about 200 ft apart on reasonably flat ground.</li>
  <li><strong>Setup ①, midway.</strong> Read the rod on A and on B. The difference <span class="mono">a₁ − b₁</span> is the <em>true</em> difference in elevation, because equal sight lengths cancel any tilt.</li>
  <li><strong>Setup ②, beside A.</strong> Move the instrument a few feet behind A and read both pegs again. The difference <span class="mono">a₂ − b₂</span> is what the instrument <em>says</em>, with the tilt acting over the full 200 ft on the B sight.</li>
  <li><strong>Compare.</strong> The collimation error is <span class="mono">(a₂ − b₂) − (a₁ − b₁)</span>, expressed as feet in 200 ft. Third order allows 0.007 ft; second order, 0.003 ft.</li>
  <li><strong>If it fails,</strong> the reading that <em>should</em> appear at B from setup ② is <span class="mono">a₂ − (a₁ − b₁)</span>. Adjust the reticle to that reading following the maker's instructions, then run the test again to prove it.</li>
</ol>

<h2 id="example"><span class="num">8</span>Worked example</h2>
<p>A four-setup loop that leaves benchmark BM-1, turns three times and comes back to it. BM-1 is assumed to be 100.00 ft. Sights were about 150 ft, so the loop is roughly 1,200 ft — 0.227 mile. The example numbers are made up but typical.</p>
<div class="table-wrap">
<table class="ref-table" id="tbl-fieldbook" data-start="100.00" data-loop-ft="1200" data-allow-coeff="0.06">
  <caption>Table 2. Field book page — differential levelling, closed loop (example numbers)</caption>
  <thead><tr><th scope="col">Station</th><th scope="col">BS (+)</th><th scope="col">HI</th><th scope="col">FS (−)</th><th scope="col">Elevation</th><th scope="col">Adjusted</th></tr></thead>
  <tbody>
    <tr><th scope="row">BM-1</th><td data-bs="4.32">4.32</td><td data-hi="104.32">104.32</td><td>—</td><td data-elev="100.00">100.00</td><td data-adj="100.00">100.00</td></tr>
    <tr><th scope="row">TP1</th><td data-bs="5.18">5.18</td><td data-hi="102.75">102.75</td><td data-fs="6.75">6.75</td><td data-elev="97.57">97.57</td><td data-adj="97.58">97.58</td></tr>
    <tr><th scope="row">TP2</th><td data-bs="2.86">2.86</td><td data-hi="102.57">102.57</td><td data-fs="3.04">3.04</td><td data-elev="99.71">99.71</td><td data-adj="99.72">99.72</td></tr>
    <tr><th scope="row">TP3</th><td data-bs="8.11">8.11</td><td data-hi="103.26">103.26</td><td data-fs="7.42">7.42</td><td data-elev="95.15">95.15</td><td data-adj="95.17">95.17</td></tr>
    <tr><th scope="row">BM-1</th><td>—</td><td>—</td><td data-fs="3.28">3.28</td><td data-elev="99.98">99.98</td><td data-adj="100.00">100.00</td></tr>
    <tr><th scope="row">Σ</th><td data-sum="bs">20.47</td><td>—</td><td data-sum="fs">20.49</td><td>—</td><td>—</td></tr>
  </tbody>
</table>
</div>
<p><strong>Arithmetic check.</strong> ΣBS − ΣFS = 20.47 − 20.49 = −0.02 ft, and the last elevation minus the first is 99.98 − 100.00 = −0.02 ft. The page adds up.</p>
<p><strong>Misclosure and allowance.</strong> The loop came back 0.02 ft low. At 1,200 ft the loop is 0.227 mile, so third order allows 0.06 × √0.227 = <strong>0.029 ft</strong>. The work is inside the allowance, so it can be adjusted rather than re-run.</p>
<p><strong>Adjustment.</strong> Four setups, so each carries 0.02 ÷ 4 = 0.005 ft of the correction, applied cumulatively: +0.005 at TP1, +0.010 at TP2, +0.015 at TP3, +0.020 at the closing shot — which lands BM-1 back on 100.00 ft exactly. Those are the adjusted elevations in the last column.</p>
<p>The same day's two-peg test, taken before the loop:</p>
<div class="table-wrap">
<table class="ref-table" id="tbl-peg" data-a1="5.284" data-b1="4.716" data-a2="4.958" data-b2="4.386" data-limit3="0.007" data-limit2="0.003">
  <caption>Table 3. Two-peg test, pegs 200 ft apart (example numbers)</caption>
  <thead><tr><th scope="col">Setup</th><th scope="col">Reading on A</th><th scope="col">Reading on B</th><th scope="col">A − B</th></tr></thead>
  <tbody>
    <tr><th scope="row">① midway</th><td>5.284</td><td>4.716</td><td data-result="0.568">0.568 — true</td></tr>
    <tr><th scope="row">② beside A</th><td>4.958</td><td>4.386</td><td data-result="0.572">0.572 — apparent</td></tr>
  </tbody>
</table>
</div>
<p>The collimation error is 0.572 − 0.568 = <strong>0.004 ft in 200 ft</strong>. That passes third order (0.007 ft) and fails second order (0.003 ft): fine for a construction loop, not fine for control work. Had it needed adjusting, the reading that should have appeared at B from setup ② is 4.958 − 0.568 = <strong>4.390 ft</strong>, and the reticle would be moved 0.004 ft to suit.</p>

<h2 id="mistakes"><span class="num">9</span>Common mistakes</h2>
<ul>
  <li><strong>Leaving the parallax in.</strong> If the crosshair slides on the rod when you move your eye, your readings move with it. Focus the crosshairs on the sky first, every setup.</li>
  <li><strong>Unbalanced sights.</strong> A long backsight and a short foresight let collimation error, curvature and refraction into the answer instead of cancelling them. Pace it out; keep the two within 30 ft.</li>
  <li><strong>A rod that is not plumb.</strong> Leaning always reads high. Use the rod bubble, or wave and take the lowest reading.</li>
  <li><strong>Moving the turning point.</strong> A TP has to be the same physical point for its foresight and its backsight — a nail head, a turning plate, the top of a firm stake. Not the loose soil beside it.</li>
  <li><strong>Reading two digits.</strong> "4.3" is not a reading. Three digits, always, and record it before you look away from the eyepiece.</li>
  <li><strong>Adjusting a loop that failed.</strong> The allowance decides whether you may adjust at all. Over it, the run is re-done — distributing a blunder just hides it.</li>
  <li><strong>Skipping the peg test.</strong> It takes ten minutes and it is the only thing that finds an instrument reading level and lying.</li>
</ul>

<h2 id="takeaways"><span class="num">10</span>Key takeaways</h2>
<ol>
  <li>Centre the circular bubble and let the <strong>compensator</strong> finish the job — then prove it still swings freely before you read.</li>
  <li>Every reading is <strong>three digits</strong> off a plumb rod, and the <strong>mean of the outer two wires equals the middle one</strong>.</li>
  <li><i>HI</i> = elevation + <i>BS</i>; elevation = <i>HI</i> − <i>FS</i>. <strong>Balanced sights</strong> cancel what you cannot see.</li>
  <li>Close the loop, check ΣBS − ΣFS, compare the misclosure with <strong>0.06 ft × √E</strong>, and adjust only if you are inside it.</li>
</ol>

<p class="ref-note">Sources: Caltrans <i>Surveys Manual</i>, Chapter 8, "Differential Leveling Survey Specifications" (2006), whose Table 8-2 supplies the third-order limits and the two-peg tolerances quoted here; the Middle Tennessee State University surveying laboratory notes on differential levelling and stadia, for the field-book form, the sight-length practice and the closure adjustment; and standard definitions of BS, FS, HI, TP and IFS as given in university surveying lecture notes. The videos linked in section 2 are recommended viewing and are not sources for the procedure above.</p>
<p class="ref-note">Photo credits: <a href="https://commons.wikimedia.org/wiki/File:Survey_level_and_field_technician.jpg">Survey level and field technician</a> by Cvstr, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>; <a href="https://commons.wikimedia.org/wiki/File:Level_(instrument).jpg">Level (instrument)</a> by Kskhh, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>; <a href="https://commons.wikimedia.org/wiki/File:Archaeologist_Matt_Ginnever_taking_levels_at_Liverpool_Street_Worksite,_Liverpool_Street_(Crossrail_XSM10).jpg">Archaeologist taking levels at Liverpool Street</a> by Crossrail/MOLA, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>; <a href="https://commons.wikimedia.org/wiki/File:Archaeologists_using_a_dumpy_level_to_survey_a_trench.jpg">Archaeologists using a dumpy level</a> by Oxford Archaeology, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>; <a href="https://commons.wikimedia.org/wiki/File:Saint-%C3%89tienne_-_Rep%C3%A8re_de_nivellement_place_Jean_Plotton.jpg">Repère de nivellement, Saint-Étienne</a> by Touam, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>; all via Wikimedia Commons. The photos were resized, cropped and recompressed for the web.</p>

<nav class="article-nav" aria-label="Series">
  <a class="prev" href="../"><span class="dir">← Study</span><span class="ttl">All study materials</span></a>
  <a class="next" href="../mix-design/"><span class="dir">Related →</span><span class="ttl">Mix design</span></a>
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

- [ ] **Step 2** `.mono` 클래스가 `article.css`·`theme.css`에 있는지 `grep -n "\.mono" site/study/article.css site/shared/theme.css` 로 확인한다. 없으면 본문의 `<span class="mono">…</span>` 세 곳을 `<strong>…</strong>` 로 바꾸고 그 사실을 보고한다(새 CSS 를 만들지 않는다).

- [ ] **Step 3** `tools/leveling.test.mjs` 작성:

```js
// tools/leveling.test.mjs — 자동레벨 매뉴얼(site/study/leveling/index.html)의 야장·2-peg 수치 검사 (node --test)
// 표의 data-* 입력만으로 HI·표고·합계·검산·폐합·허용치·보정·시준축 오차를 다시 계산해 표시값과 대조한다.
// 표고는 0.001 ft 단위 정수(mils)로 다뤄 부동소수 반올림 함정을 피한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../site/study/leveling/index.html'), 'utf8');

function table(id) {
  const m = HTML.match(new RegExp(`<table([^>]*id="${id}"[^>]*)>([\\s\\S]*?)</table>`));
  assert.ok(m, `table #${id} missing`);
  return { attrs: m[1], body: m[2] };
}
function bodyRows(t) {
  const tb = t.body.match(/<tbody>([\s\S]*?)<\/tbody>/);
  assert.ok(tb, 'tbody missing');
  return [...tb[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m =>
    [...m[1].matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/g)]
      .map(c => ({ attrs: c[1], text: c[2].replace(/<[^>]+>/g, '').trim() })));
}
const attr = (s, n) => { const m = s.match(new RegExp(`${n}="([^"]*)"`)); return m ? m[1] : null; };
const mils = (x) => Math.round(Number(x) * 1000);   // ft → 0.001 ft 정수
const cell = (row, i, name) => { const v = attr(row[i].attrs, name); return v === null ? null : mils(v); };

test('Table 2: 야장의 HI·표고가 BS·FS 에서만 다시 계산된다', () => {
  const t = table('tbl-fieldbook');
  let elev = mils(attr(t.attrs, 'data-start')), hi = null;
  for (const row of bodyRows(t).slice(0, 5)) {
    const bs = cell(row, 1, 'data-bs'), fs = cell(row, 3, 'data-fs');
    if (fs !== null) { assert.ok(hi !== null, 'FS before any BS'); elev = hi - fs; }
    assert.equal(cell(row, 4, 'data-elev'), elev, `elevation at ${row[0].text}`);
    if (bs !== null) { hi = elev + bs; assert.equal(cell(row, 2, 'data-hi'), hi, `HI at ${row[0].text}`); }
  }
});

test('Table 2: 합계·페이지 검산·폐합·허용치·보정', () => {
  const t = table('tbl-fieldbook');
  const start = mils(attr(t.attrs, 'data-start'));
  const loopFt = Number(attr(t.attrs, 'data-loop-ft')), coeff = Number(attr(t.attrs, 'data-allow-coeff'));
  const rows = bodyRows(t), data = rows.slice(0, 5), sums = rows[5];
  const col = (i, name) => data.map(r => cell(r, i, name)).filter(v => v !== null);
  const bs = col(1, 'data-bs'), fs = col(3, 'data-fs');
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  assert.equal(sum(bs), mils(sums[1].text), 'ΣBS');
  assert.equal(sum(fs), mils(sums[3].text), 'ΣFS');

  const last = cell(data[4], 4, 'data-elev');
  assert.equal(sum(bs) - sum(fs), last - start, 'ΣBS − ΣFS = 마지막 표고 − 처음 표고');

  const mis = last - start;                                    // −20 (= −0.02 ft)
  const allow = Math.round(coeff * Math.sqrt(loopFt / 5280) * 1000);   // 29 (= 0.029 ft)
  assert.equal(allow, 29, '3급 허용 폐합오차 0.029 ft');
  assert.ok(Math.abs(mis) < allow, '허용치 이내라 보정할 수 있다');
  assert.ok(HTML.includes('0.029 ft'), '본문이 허용치를 적고 있다');

  const per = Math.abs(mis) / bs.length;                       // 설치당 5 (= 0.005 ft)
  assert.equal(per, 5, '설치당 보정 0.005 ft');
  data.slice(1).forEach((row, i) => {
    const want = Math.round((cell(row, 4, 'data-elev') + per * (i + 1)) / 10) * 10;  // 0.01 ft 자리로 반올림
    assert.equal(cell(row, 5, 'data-adj'), want, `보정 표고 at ${row[0].text}`);
  });
  assert.equal(cell(data[4], 5, 'data-adj'), start, '마지막 보정 표고가 벤치마크로 닫힌다');
  assert.equal(cell(data[0], 5, 'data-adj'), start, '출발 벤치마크는 보정하지 않는다');
});

test('Table 3: 2-peg 시준축 오차와 B 의 옳은 읽음', () => {
  const t = table('tbl-peg');
  const a1 = mils(attr(t.attrs, 'data-a1')), b1 = mils(attr(t.attrs, 'data-b1'));
  const a2 = mils(attr(t.attrs, 'data-a2')), b2 = mils(attr(t.attrs, 'data-b2'));
  const lim3 = mils(attr(t.attrs, 'data-limit3')), lim2 = mils(attr(t.attrs, 'data-limit2'));
  const rows = bodyRows(t);
  assert.equal(cell(rows[0], 3, 'data-result'), a1 - b1, '참 고저차');
  assert.equal(cell(rows[1], 3, 'data-result'), a2 - b2, '겉보기 고저차');

  const err = (a2 - b2) - (a1 - b1);
  assert.equal(err, 4, '시준축 오차 0.004 ft / 200 ft');
  assert.ok(err <= lim3, '3급 합격');
  assert.ok(err > lim2, '2급 불합격');
  assert.ok(HTML.includes('0.004 ft in 200 ft'), '본문이 오차를 적고 있다');
  assert.ok(HTML.includes(`${((a2 - (a1 - b1)) / 1000).toFixed(3)} ft`), 'B 의 옳은 읽음이 적혀 있다');
});

test('Table 1: 규격값이 Caltrans 3급 표와 같다', () => {
  const rows = bodyRows(table('tbl-specs'));
  const got = Object.fromEntries(rows.map(r => [attr(r[1].attrs, 'data-spec'), r[1].text]));
  assert.deepEqual(got, {
    sight: '300 ft', balance: '33 ft', 'balance-cum': '33 ft', clearance: '1.6 ft',
    loop: '0.06 ft × √E', peg: 'daily · 0.007 ft in 200 ft',
  });
});
```

실행해서 4개가 모두 통과하는지 확인한다. 통과하지 않으면 **표가 아니라 테스트를 고친다** — 표의 숫자는 스펙에서 이미 검산된 값이다. 다만 테스트가 표의 오타를 잡은 것이라면(예: HI 한 칸이 틀렸다) 표를 고치는 게 맞다. 어느 쪽인지 손으로 한 번 계산해 보고 판단한다.

- [ ] **Step 4** `tools/site-guards.test.mjs` 토큰 목록에 `'study/leveling/index.html'`, `ARTICLE_PAGES` 끝에 같은 경로 추가.
- [ ] **Step 5** 전체 게이트 실행 → 통과(100 + 4 = 104 전후). 그 다음 `python tools/devserver.py 8811 site` 를 백그라운드로 띄우고 헤드리스 Edge 로 캡처한다(캡처마다 새 `--user-data-dir`, `--window-size=1440,12000`, PNG 는 `…/scratchpad/verify-level/task2-1440.png`). Pillow 로 PNG 실제 높이를 확인하고, 도해 4장·표 3개·사진 5장을 잘라 읽어 겹침·잘림을 보고한다. 서버를 종료한다.
- [ ] **Step 6** 커밋

```bash
git add site/study/leveling/index.html tools/leveling.test.mjs tools/site-guards.test.mjs && git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 자동레벨 실습 매뉴얼 — 본문 10절·SVG 도해 4장·표 3개·사진 5장(US 단위), 야장·2-peg 재계산 테스트, 가드 등록

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 3: 레지스트리(Surveying 첫 글)·README

- [ ] **Step 1** 테스트 먼저 — `tools/registry.test.mjs`에서 page id 배열 끝에 `'leveling'` 추가, group 배열 끝에 `'surveying'` 추가, 테스트 이름을 `'MATERIALS: 글 9편이 재료별 그룹에 순서대로 있고 href·썸네일이 실제 파일을 가리킨다'` 로. 실행하면 1건 실패.
- [ ] **Step 2** `site/shared/registry.js` MATERIALS 끝(soil-compaction 뒤)에 추가:

```js
    { id: 'leveling', group: 'surveying', type: 'page', title: 'Automatic level',
      desc: 'Set up, read the rod, run a loop, and check the instrument — a field manual.',
      href: 'leveling/', thumb: 'img/leveling.jpg' },
```

- [ ] **Step 3** README 구조 목록에 `- \`site/study/leveling/\` — *Automatic level: a field manual* (\`index.html\`, static); photos in \`img/\`` 를 soil-compaction 줄 뒤에 추가하고, 테스트 명령 끝에 ` tools/leveling.test.mjs` 를 붙인다.
- [ ] **Step 4** 전체 게이트 통과 확인 후, 서버를 8812 로 띄워 `/study/` 를 1440×2800 으로 캡처한다. **Surveying 그룹에 Coming soon 행 대신 카드 한 장이 있어야 한다**(썸네일·제목 Automatic level). 서버 종료.
- [ ] **Step 5** 커밋

```bash
git add site/shared/registry.js tools/registry.test.mjs README.md && git -c core.quotepath=false commit -F - <<'EOF'
feat: 레지스트리에 자동레벨 글 등록 — Surveying 그룹 첫 글, registry 테스트·README 갱신

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

## Self-Review

**스펙 커버리지**: §3의 10개 절 전부(Block A: 1~4, Block B: 5~10), §4 규격표(`tbl-specs`), §5 예제 두 표, §6 도해 4장(A: fig1·fig3, B: fig2·fig4 — 화면 순서는 1→3→2→4가 아니라 본문 흐름을 따른다), §7 사진 5장, §8 영상 3개(인용 없이 링크만), §9 테스트 3종. 빠진 항목 없음.

**플레이스홀더**: 없음. 단 Task 2 Step 3 의 테스트 코드에는 **의도적으로 표시한 죽은 루프**가 있고, 그 자리에서 지우라고 명시했다.

**타입 일관성**: Task 1이 만드는 파일명·픽셀 크기가 Block A/B 의 `<img>` 와 같다. Task 2의 표 id·`data-*` 이름이 `tools/leveling.test.mjs` 가 읽는 이름과 같다. Task 3의 id `leveling` 이 폴더명·href·썸네일·가드 목록과 같다.
