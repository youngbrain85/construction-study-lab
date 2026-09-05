# Study "Concrete Mix Design" 2편 시리즈 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Study 섹션의 첫 자료로, 콘크리트 배합설계(ACI 10단계)를 다루는 영어 글 2편(방법 / 예제 풀이)을 정적 HTML로 만들고 레지스트리에 연결한다.

**Architecture:** 글 전용 스타일시트 `site/study/article.css`(theme.css 토큰만 사용)와 목차 스크립트 `site/study/article.js`를 두고, Part 1(`site/study/mix-design/index.html`)·Part 2(`site/study/mix-design/example/index.html`)가 이를 공유한다. 사진 4장은 강의 슬라이드에서 Pillow로 압축해 `img/`에 커밋하고, 도해 3개는 인라인 SVG, 표는 HTML이다. Part 1 표의 숫자는 Mix Design Lab 엔진 표와 node 테스트로 대조한다.

**Tech Stack:** 정적 HTML/CSS/JS(빌드 없음), Google Fonts, Node `node --test`, Python 3.9 + Pillow 11(사진 처리 1회), 헤드리스 Edge(검증).

**Spec:** `docs/superpowers/specs/2026-09-05-study-mix-design-article-design.md`

## Global Constraints

- 언어: 글은 영어. 코드 주석·커밋 메시지는 한국어.
- **과목 코드 금지**: `site/` 아래 어떤 파일에도 대문자 `CNST`가 들어가면 안 된다(가드 테스트). 도메인 `cnstlab.org`(소문자)는 허용.
- 브랜드: theme.css 토큰만 사용(`article.css`에 `#` 리터럴 색 금지 — 가드 테스트). radius 2px. 로고·잎·[IN]·이모지 없음. 서체는 theme.css의 `--font`(Hepta Slab)·`--font-head`(Barlow Condensed)·`--font-mono`(Red Hat Mono).
- 외부 리소스는 Google Fonts뿐. 수식 라이브러리·CDN 스크립트 금지.
- 상대 경로: Part 1(`/study/mix-design/`) → theme `../../shared/theme.css`, `../article.css`, `../article.js`, 홈 `../../`, Study `../`, Lab `../../labs/`. Part 2(`/study/mix-design/example/`) → `../../../shared/theme.css`, `../../article.css`, `../../article.js`, 홈 `../../../`, Study `../../`, Lab `../../../labs/`.
- 표 숫자(Part 1 `#tbl-water`·`#tbl-wcm`·`#tbl-bb0`)는 `site/labs/mix-design/engine.js`의 `DATA.WATER_TABLE`·`WC_TABLE`·`CA_VOLUME_TABLE`과 정확히 같아야 한다(테스트).
- Part 2의 수치는 스펙 §4.2 표가 정본이다(325 → 299 lb 물, f′cr 4,200 psi, w/cm 0.55, CM 544 lb, CA 1,863 OD → 1,872 SSD, 절대부피 합 0.7095 → FA 0.2905 yd³ → 1,292 lb, 총 4,007 lb, 148.4 lb/ft³, 수분 보정 28 lb·1,900 lb·271 lb).
- 테스트 명령(최종): `node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs tools/study-tables.test.mjs tools/site-guards.test.mjs` — 모두 통과해야 한다.
- 커밋 트레일러: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. 한글 커밋 메시지는 `git -c core.quotepath=false commit -F -` 히어독으로.
- 이 워크트리(`D:\Projects\Test\.claude\worktrees\study-mix-design`, 브랜치 `worktree-study-mix-design`)에서만 작업한다. Bash 가드가 복합 명령을 거부하면 단순 명령으로 나누거나 PowerShell 도구를 쓴다.

---

## File Structure

| 파일 | 역할 |
|---|---|
| `site/study/article.css` | 글 페이지 공용 스타일(히어로·목차·본문·상자·수식·표·내비·CTA) — 새 파일 |
| `site/study/article.js` | 푸터 연도 + 목차 활성 표시(스크롤/rAF) — 새 파일 |
| `tools/prep-study-images.py` | 슬라이드 사진 → `img/` 압축 스크립트(Pillow) — 새 파일 |
| `site/study/mix-design/img/*.jpg` | 사진 4장 — 새 파일 |
| `site/study/mix-design/index.html` | Part 1 — 새 파일 |
| `site/study/mix-design/example/index.html` | Part 2 — 새 파일 |
| `site/shared/registry.js` | `MATERIALS` 항목 2개 — 수정 |
| `tools/site-guards.test.mjs` | CNST 금지·article.css 토큰만·사진 크기·내부 링크 존재 — 새 파일 |
| `tools/study-tables.test.mjs` | Part 1 표 ↔ 엔진 표 대조 — 새 파일 |
| `tools/registry.test.mjs` | `page` 항목 href 파일 존재 테스트 추가 — 수정 |
| `README.md` | 구조·추가 방법·테스트 명령 — 수정 |

---

### Task 1: 글 공용 스타일시트와 목차 스크립트

**Files:**
- Create: `site/study/article.css`
- Create: `site/study/article.js`
- Create: `tools/site-guards.test.mjs`

**Interfaces:**
- Consumes: theme.css 토큰(`--dark --royal --icy --neon --border --bg --surface --surface2 --text --muted --faint --amber --amber-50 --radius --font --font-head --font-mono`), theme.css 클래스 `.band-royal .eyebrow .ref-table .ref-note .btn .btn-primary .site-footer .appbar`.
- Produces: 클래스 계약(뒤 태스크의 HTML이 그대로 쓴다): `body.article-page`, `.article-hero > .article-hero-inner > (.eyebrow, h1, .lede, .byline)`, `main.article-layout > (nav.toc > h2 + ol, article.article)`, `.article h2 > span.num`, `.callout.callout-key|callout-def|callout-warn > span.label`, `figure`, `figure.fig-small`, `svg.fig-svg`, `.eq`, `.frac > span + span`, `.table-wrap > table.ref-table`, `table.ref-table--text`, `ol.steps`, `p.see-also`, `p.method`, `nav.article-nav > a.prev|a.next > (span.dir, span.ttl)`, `.cta-lab > (div > h3 + p, a.btn.btn-primary)`. `article.js`는 `#year`를 채우고 `.toc a[href^="#"]`에 `.is-active`를 토글한다.

- [ ] **Step 1: 가드 테스트 작성(실패 확인용)**

`tools/site-guards.test.mjs`:

```js
// tools/site-guards.test.mjs — 사이트 전역 가드 (node --test)
// (a) 과목 코드 금지 (b) article.css 는 토큰만 (c) 글 페이지 내부 링크 존재 (d) 사진 용량 예산
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'vendor') continue; // three.js 벤더 파일은 검사 대상이 아니다
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(html|js|css)$/.test(name)) out.push(p);
  }
  return out;
}

test('site/ 어디에도 대문자 과목 코드 CNST 가 없다', () => {
  for (const f of walk(SITE)) assert.ok(!readFileSync(f, 'utf8').includes('CNST'), `course code in ${f}`);
});

test('article.css 는 theme.css 토큰만 쓴다(리터럴 색 없음)', () => {
  const css = readFileSync(join(SITE, 'study/article.css'), 'utf8');
  const literals = css.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  assert.deepEqual(literals, []);
  assert.ok(css.includes('var(--royal)'), 'uses tokens');
});
```

- [ ] **Step 2: 테스트 실행 — article.css 가 없어 실패하는지 확인**

Run: `node --test tools/site-guards.test.mjs`
Expected: `article.css` 테스트 FAIL(`ENOENT`), CNST 테스트 PASS.

- [ ] **Step 3: `site/study/article.css` 작성**

```css
/* ============================================================
   Construction Study Lab — Study 글 페이지 공용 스타일 (article.css)
   theme.css 토큰만 사용한다(리터럴 색 금지 — tools/site-guards.test.mjs).
   마크업 계약: 스펙 §3.1 (body.article-page > .article-hero + main.article-layout)
   ============================================================ */

/* 히어로 */
.article-hero { padding:56px 40px 48px; }
.article-hero-inner { max-width:1100px; margin:0 auto; }
.article-hero .eyebrow { margin:0; color:var(--neon); }
.article-hero h1 { font:800 72px/.92 var(--font-head); text-transform:uppercase; letter-spacing:.01em;
  color:var(--bg); margin:12px 0 16px; max-width:14ch; } /* --bg = 흰색: theme.css 에 흰색 토큰이 없어 배경 토큰을 흰 글자색으로 쓴다 */
.article-hero .lede { font:400 18px/1.55 var(--font); color:var(--icy); max-width:60ch; margin:0 0 20px; }
.article-hero .byline { font:500 12px/1.6 var(--font-mono); letter-spacing:.06em; text-transform:uppercase;
  color:var(--icy); margin:0; }

/* 본문 그리드: 목차 220px + 본문 720px — theme.css 의 `main` 규칙(0,0,1)보다 높은 특이성(0,1,1)으로 덮는다 */
main.article-layout { max-width:1100px; margin:0 auto; padding:48px 40px 80px; display:grid;
  grid-template-columns:220px minmax(0, 720px); gap:56px; align-items:start; }

/* 목차 */
.toc { position:sticky; top:88px; }
.toc h2 { font:600 11.5px/1 var(--font-mono); letter-spacing:.12em; text-transform:uppercase;
  color:var(--muted); margin:0 0 12px; }
.toc ol { list-style:none; margin:0; padding:0; border-left:2px solid var(--border); }
.toc a { display:block; padding:6px 0 6px 14px; margin-left:-2px; border-left:2px solid transparent;
  font:400 13.5px/1.35 var(--font); color:var(--muted); text-decoration:none; }
.toc a:hover { color:var(--dark); }
.toc a.is-active { color:var(--dark); border-left-color:var(--royal); font-weight:600; }

/* 본문 타이포 */
.article { font-size:16.5px; line-height:1.7; }
.article h2 { font:700 26px/1.2 var(--font); margin:56px 0 16px; padding-top:10px; border-top:2px solid var(--dark);
  letter-spacing:0; text-transform:none; }
.article h2:first-child { margin-top:0; }
.article h2 .num { font:800 30px/1 var(--font-head); color:var(--royal); margin-right:12px; }
.article h3 { font:700 19px/1.3 var(--font); margin:32px 0 10px; }
.article p { margin:0 0 18px; }
.article ul, .article ol { padding-left:24px; margin:0 0 18px; }
.article li { margin-bottom:6px; }
.article a { color:var(--royal); }
.article strong { font-weight:700; }
.article .see-also { font:600 13.5px/1.4 var(--font); margin:-6px 0 18px; }
.article .see-also a { text-decoration:none; }
.article .see-also a:hover { text-decoration:underline; }
.article .method { font:500 12.5px/1.5 var(--font-mono); color:var(--muted); margin:-6px 0 16px; }

/* 상자: 핵심(Icy + Royal 선) / 정의(흰 바탕 + 테두리) / 주의(Amber 틴트) */
.callout { border-radius:var(--radius); padding:18px 22px; margin:24px 0; }
.callout .label { display:block; font:600 11.5px/1 var(--font-mono); letter-spacing:.12em; text-transform:uppercase;
  margin-bottom:8px; }
.callout p:last-child { margin-bottom:0; }
.callout-key { background:var(--icy); border-left:4px solid var(--royal); }
.callout-key .label { color:var(--royal); }
.callout-def { background:var(--bg); border:1px solid var(--border); }
.callout-def .label { color:var(--muted); }
.callout-warn { background:var(--amber-50); border-left:4px solid var(--amber); }
.callout-warn .label { color:var(--amber); }

/* 그림 */
.article figure { margin:28px 0; }
.article figure img { width:100%; height:auto; border-radius:var(--radius); display:block; }
.article figure.fig-small img { width:auto; max-width:100%; }
.article figcaption { font:500 12.5px/1.5 var(--font-mono); color:var(--muted); margin-top:10px; }
.fig-svg { width:100%; height:auto; display:block; }

/* 수식: 가운데 정렬, 분수는 세로 flex */
.eq { display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:10px; margin:22px 0;
  font:400 18px/1.4 var(--font); color:var(--text); }
.eq i { font-style:italic; }
.frac { display:inline-flex; flex-direction:column; align-items:center; vertical-align:middle; line-height:1.3; }
.frac > span { padding:0 8px; }
.frac > span:first-child { border-bottom:1.5px solid var(--text); }

/* 표 */
.table-wrap { overflow-x:auto; margin:22px 0 8px; }
.table-wrap .ref-table th, .table-wrap .ref-table td { white-space:nowrap; }
.table-wrap .ref-table .si { font-size:11px; color:var(--faint); }
.table-wrap .ref-table tr.group th { text-align:left; font-size:11.5px; color:var(--dark); background:var(--surface2);
  text-transform:uppercase; letter-spacing:.04em; padding:8px; }
.ref-table--text td, .ref-table--text th { white-space:normal; text-align:left; }
.article .ref-note { margin:0 0 22px; }

/* 단계 목록: 큰 번호 */
.steps { counter-reset:step; list-style:none; padding:0; margin:0 0 18px; }
.steps li { position:relative; padding-left:56px; margin-bottom:14px; min-height:34px; }
.steps li::before { counter-increment:step; content:counter(step, decimal-leading-zero); position:absolute; left:0; top:-2px;
  font:800 30px/1 var(--font-head); color:var(--royal); }

/* 이전/다음 */
.article-nav { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:64px; border-top:1px solid var(--border);
  padding-top:24px; }
.article-nav a { display:block; padding:18px 20px; border:1px solid var(--border); border-radius:var(--radius);
  text-decoration:none; color:var(--text); background:var(--bg); }
.article-nav a:hover { border-color:var(--royal); }
.article-nav .dir { display:block; font:600 11px/1 var(--font-mono); letter-spacing:.12em; text-transform:uppercase;
  color:var(--muted); margin-bottom:8px; }
.article-nav .ttl { font:700 16px/1.3 var(--font); }
.article-nav a.next { text-align:right; }

/* 랩 CTA */
.cta-lab { display:flex; align-items:center; justify-content:space-between; gap:24px; background:var(--dark); color:var(--bg);
  padding:28px 32px; border-radius:var(--radius); margin:48px 0 0; }
.cta-lab h3 { color:var(--bg); margin:0 0 6px; }
.cta-lab p { color:var(--icy); margin:0; }
.cta-lab .btn-primary { flex:none; text-decoration:none; }
.cta-lab :focus-visible { outline-color:var(--neon); }

@media (max-width:900px) {
  .article-hero { padding:36px 20px 32px; }
  .article-hero h1 { font-size:44px; }
  .article-hero .lede { font-size:16px; }
  main.article-layout { grid-template-columns:1fr; gap:24px; padding:32px 20px 56px; }
  .toc { position:static; }
  .toc ol { columns:2; column-gap:24px; }
  .toc li { break-inside:avoid; }
  .article h2 { font-size:23px; margin-top:44px; }
  .eq { font-size:16.5px; }
}
@media (max-width:700px) {
  .toc ol { columns:1; }
  .article-nav { grid-template-columns:1fr; }
  .article-nav a.next { text-align:left; }
  .cta-lab { flex-direction:column; align-items:flex-start; padding:22px; }
}
```

- [ ] **Step 4: `site/study/article.js` 작성**

```js
// site/study/article.js — Study 글 페이지 공용 (클래식 스크립트)
// 1) 푸터 연도  2) 목차 활성 표시: 뷰포트 상단 35 % 선을 지난 마지막 h2[id] 를 활성으로
(function () {
  'use strict';
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const links = Array.from(document.querySelectorAll('.toc a[href^="#"]'));
  const heads = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  if (!links.length || !heads.length) return;

  function activate(id) {
    links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
  }
  function update() {
    const line = window.innerHeight * 0.35;
    let current = heads[0];
    for (const h of heads) {
      if (h.getBoundingClientRect().top <= line) current = h; else break; // 문서 순서대로 정렬돼 있다
    }
    activate(current.id);
  }
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  }, { passive: true });
  window.addEventListener('resize', update);
  window.addEventListener('hashchange', update);
  update();
})();
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

Run: `node --test tools/site-guards.test.mjs`
Expected: 2 tests PASS.

- [ ] **Step 6: 커밋**

```bash
git add site/study/article.css site/study/article.js tools/site-guards.test.mjs
git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 글 페이지 공용 스타일(article.css)·목차 스크립트 + 사이트 가드 테스트

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 2: 사진 처리 스크립트와 사진 4장

**Files:**
- Create: `tools/prep-study-images.py`
- Create: `site/study/mix-design/img/pour.jpg`, `slump-test.jpg`, `graded-aggregate.jpg`, `angular-rounded.jpg`
- Modify: `tools/site-guards.test.mjs` (사진 용량 테스트 추가)

**Interfaces:**
- Consumes: 슬라이드 미디어 원본 디렉터리(디스패치에서 절대 경로로 전달; 파일 `image21.jpeg` 1200×628, `image23.jpeg` 800×600, `image24.jpeg` 350×200, `image26.jpeg` 331×152).
- Produces: `img/pour.jpg`(1200×628), `img/slump-test.jpg`(800×600), `img/graded-aggregate.jpg`(350×200), `img/angular-rounded.jpg`(331×152). Task 3의 `<img width height>`가 이 치수를 쓴다.

- [ ] **Step 1: 용량 테스트 추가(실패 확인용)** — `tools/site-guards.test.mjs` 끝에 추가:

```js
test('Study 사진 4장이 존재하고 용량 예산 안이다', () => {
  const IMG = join(SITE, 'study/mix-design/img');
  const budget = { 'pour.jpg': 180 * 1024, 'slump-test.jpg': 90 * 1024, 'graded-aggregate.jpg': 25 * 1024, 'angular-rounded.jpg': 12 * 1024 };
  for (const [name, max] of Object.entries(budget)) {
    const p = join(IMG, name);
    assert.ok(existsSync(p), `${name} missing`);
    assert.ok(statSync(p).size <= max, `${name} is ${statSync(p).size} B > ${max} B`);
  }
});
```

- [ ] **Step 2: 테스트 실행 — 사진이 없어 실패**

Run: `node --test tools/site-guards.test.mjs`
Expected: 사진 테스트 FAIL(`pour.jpg missing`).

- [ ] **Step 3: `tools/prep-study-images.py` 작성**

```python
# -*- coding: utf-8 -*-
# tools/prep-study-images.py — 강의 슬라이드 사진을 site/study/mix-design/img/ 로 압축 저장 (Pillow)
# 사용: python tools/prep-study-images.py <슬라이드 미디어 디렉터리>
#   디렉터리에는 image21.jpeg(타설) image23.jpeg(슬럼프) image24.jpeg(골재 등급) image26.jpeg(각진/둥근)이 있어야 한다.
import os
import sys
from PIL import Image

if len(sys.argv) != 2:
    sys.exit("usage: prep-study-images.py <media-dir>")
SRC = sys.argv[1]
DST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "study", "mix-design", "img")
os.makedirs(DST, exist_ok=True)

# (원본, 결과 파일, 최대 폭 px, JPEG 품질)
JOBS = [
    ("image21.jpeg", "pour.jpg", 1200, 80),
    ("image23.jpeg", "slump-test.jpg", 800, 85),
    ("image24.jpeg", "graded-aggregate.jpg", 350, 88),
    ("image26.jpeg", "angular-rounded.jpg", 331, 88),
]
for name, out, width, quality in JOBS:
    im = Image.open(os.path.join(SRC, name)).convert("RGB")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    path = os.path.join(DST, out)
    im.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    print(out, im.size, os.path.getsize(path), "bytes")
```

- [ ] **Step 4: 스크립트 실행**

Run (PowerShell): `$env:PYTHONUTF8='1'; python tools/prep-study-images.py "<디스패치에 적힌 미디어 디렉터리>"`
Expected: 4줄 출력. 예) `pour.jpg (1200, 628) 1xxxxx bytes`(≤ 184,320), `slump-test.jpg (800, 600) …`(≤ 92,160), `graded-aggregate.jpg (350, 200) …`(≤ 25,600), `angular-rounded.jpg (331, 152) …`(≤ 12,288). 예산을 넘으면 해당 항목의 품질을 5씩 낮춰 다시 실행한다.

- [ ] **Step 5: 테스트 실행 — 통과 확인**

Run: `node --test tools/site-guards.test.mjs`
Expected: 3 tests PASS.

- [ ] **Step 6: 커밋**

```bash
git add tools/prep-study-images.py site/study/mix-design/img tools/site-guards.test.mjs
git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 믹스 디자인 글 사진 4장(슬라이드 원본 압축) + 처리 스크립트·용량 가드

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 3: Part 1 — How to design a concrete mix

**Files:**
- Create: `site/study/mix-design/index.html`
- Create: `tools/study-tables.test.mjs`

**Interfaces:**
- Consumes: Task 1의 클래스 계약, Task 2의 사진 치수. 엔진 `site/labs/mix-design/engine.js`(`module.exports = MixEngine`, `DATA.NMAS_LIST/WATER_TABLE/WC_TABLE/CA_VOLUME_TABLE`).
- Produces: 절 id `why what objectives workflow step-1 step-2 step-3 step-4 step-5 step-6 step-7 step-8-10 takeaways`, 표 id `tbl-slump tbl-water tbl-shape tbl-fcr tbl-wcm tbl-bb0`(Part 2가 `../#tbl-water` 등으로 링크). Part 2 링크 대상 `example/`, `example/#steps-1-3` 등은 Task 4에서 생긴다(이 태스크의 테스트는 링크 존재를 검사하지 않는다).

- [ ] **Step 1: 표 대조 테스트 작성(실패 확인용)** — `tools/study-tables.test.mjs`:

```js
// tools/study-tables.test.mjs — Part 1 글의 ACI 표 ↔ Mix Design Lab 엔진 표 대조 (node --test)
// 정규식으로 <tr data-…> / <td data-…> 를 읽는다(HTML 파서 의존성 없음).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const E = require('../site/labs/mix-design/engine.js');
const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../site/study/mix-design/index.html'), 'utf8');

function table(id) {
  const m = HTML.match(new RegExp(`<table[^>]*id="${id}"[^>]*>([\\s\\S]*?)</table>`));
  assert.ok(m, `table #${id} missing`);
  return m[1];
}
function rows(tbl) { return [...tbl.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/g)].map(m => ({ attrs: m[1], body: m[2] })); }
function attr(s, name) { const m = s.match(new RegExp(`${name}="([^"]*)"`)); return m ? m[1] : null; }
// <td data-KEY="k">숫자 … → { 'k(정규화)': 숫자 }
function cells(body, key) {
  return Object.fromEntries([...body.matchAll(new RegExp(`<td[^>]*${key}="([^"]*)"[^>]*>\\s*([\\d.]+)`, 'g'))]
    .map(m => [String(parseFloat(m[1])), parseFloat(m[2])]));
}
const k = v => String(parseFloat(v));

test('#tbl-water: 단위수량·갇힌 공기·목표 공기량 = 엔진 WATER_TABLE', () => {
  const W = E.DATA.WATER_TABLE;
  let checked = 0;
  for (const r of rows(table('tbl-water'))) {
    const series = attr(r.attrs, 'data-series'), slump = attr(r.attrs, 'data-slump'), row = attr(r.attrs, 'data-row');
    if (series && slump) {
      const i = W.slumps.indexOf(parseFloat(slump));
      assert.ok(i >= 0, `slump anchor ${slump}`);
      const c = cells(r.body, 'data-nmas');
      for (const nmas of E.DATA.NMAS_LIST) { assert.equal(c[k(nmas)], W[series][nmas][i], `${series} slump ${slump} nmas ${nmas}`); checked++; }
    } else if (row === 'entrapped') {
      const c = cells(r.body, 'data-nmas');
      for (const nmas of E.DATA.NMAS_LIST) { assert.equal(c[k(nmas)], W.entrappedAir[nmas], `entrapped nmas ${nmas}`); checked++; }
    } else if (row === 'air') {
      const idx = { mild: 0, moderate: 1, severe: 2 }[attr(r.attrs, 'data-exposure')];
      const c = cells(r.body, 'data-nmas');
      for (const nmas of E.DATA.NMAS_LIST) { assert.equal(c[k(nmas)], W.targetAir[nmas][idx], `air ${attr(r.attrs, 'data-exposure')} nmas ${nmas}`); checked++; }
    }
  }
  assert.equal(checked, 6 * 5 + 5 + 3 * 5); // 2계열×3슬럼프×5 + 갇힌공기 5 + 노출 3×5
});

test('#tbl-wcm: 28일 강도별 w/cm = 엔진 WC_TABLE', () => {
  const T = E.DATA.WC_TABLE;
  let checked = 0;
  for (const r of rows(table('tbl-wcm'))) {
    const fc = attr(r.attrs, 'data-fc');
    if (!fc) continue;
    const i = T.strengths.indexOf(parseInt(fc, 10));
    assert.ok(i >= 0, `strength ${fc}`);
    // data-series 값은 문자열 키라 cells() 대신 직접 읽는다
    const nonAE = r.body.match(/<td[^>]*data-series="nonAE"[^>]*>\s*([\d.]+)/), ae = r.body.match(/<td[^>]*data-series="ae"[^>]*>\s*([\d.]+)/);
    assert.ok(nonAE && ae, `cells ${fc}`);
    assert.equal(parseFloat(nonAE[1]), T.nonAE[i], `nonAE ${fc}`);
    assert.equal(parseFloat(ae[1]), T.ae[i], `ae ${fc}`);
    checked++;
  }
  assert.equal(checked, 5); // 2000–6000
});

test('#tbl-bb0: 굵은골재 용적비 = 엔진 CA_VOLUME_TABLE', () => {
  const T = E.DATA.CA_VOLUME_TABLE;
  let checked = 0;
  for (const r of rows(table('tbl-bb0'))) {
    const nmas = attr(r.attrs, 'data-nmas');
    if (!nmas || !E.DATA.NMAS_LIST.includes(parseFloat(nmas))) continue;
    const c = cells(r.body, 'data-fm');
    T.fm.forEach((fm, i) => { assert.equal(c[k(fm)], T[parseFloat(nmas)][i], `nmas ${nmas} fm ${fm}`); checked++; });
  }
  assert.equal(checked, 5 * 4);
});
```

- [ ] **Step 2: 테스트 실행 — HTML 이 없어 실패**

Run: `node --test tools/study-tables.test.mjs`
Expected: FAIL — 파일을 읽는 최상위 `readFileSync`가 `ENOENT … index.html`를 던져 파일 수준 실패 1건(테스트 등록 전이라 개별 3건으로 세지지 않는다).

- [ ] **Step 3: `site/study/mix-design/index.html` 작성** — 아래 전문을 그대로 쓴다. (`byline`의 읽는 시간은 Step 4에서 계산해 고친다.)

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>How to design a concrete mix — Construction Study Lab</title>
<meta name="description" content="Concrete mix design, part 1: the ten-step ACI workflow from slump to trial batch, with the tables you need and the traps to avoid.">
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
    <a href="../" class="is-active">Study</a>
  </nav>
</div></header>

<section class="band-royal article-hero"><div class="article-hero-inner">
  <p class="eyebrow">Concrete mix design · Part 1 of 2</p>
  <h1>How to design a concrete mix</h1>
  <p class="lede">Ten decisions, made in order, turn cement, water, and aggregate into a mix you can trust.</p>
  <p class="byline">Jisoo Park · September 2026 · 9 min read</p>
</div></section>

<main class="article-layout">
<nav class="toc" aria-label="Contents">
  <h2>Contents</h2>
  <ol>
    <li><a href="#why">1. Why mix design matters</a></li>
    <li><a href="#what">2. What mix design is</a></li>
    <li><a href="#objectives">3. What a good mix must do</a></li>
    <li><a href="#workflow">4. The ten-step workflow</a></li>
    <li><a href="#step-1">5. Step 1 — Slump</a></li>
    <li><a href="#step-2">6. Step 2 — Maximum aggregate size</a></li>
    <li><a href="#step-3">7. Step 3 — Water and air</a></li>
    <li><a href="#step-4">8. Step 4 — The w/cm ratio</a></li>
    <li><a href="#step-5">9. Step 5 — Cementitious materials</a></li>
    <li><a href="#step-6">10. Step 6 — Coarse aggregate</a></li>
    <li><a href="#step-7">11. Step 7 — Fine aggregate</a></li>
    <li><a href="#step-8-10">12. Steps 8–10 — Summarize, adjust, trial-batch</a></li>
    <li><a href="#takeaways">13. Key takeaways</a></li>
  </ol>
</nav>

<article class="article">

<h2 id="why"><span class="num">1</span>Why mix design matters</h2>
<figure>
  <img src="img/pour.jpg" width="1200" height="628" alt="Worker spreading fresh concrete over a mat of rebar as it comes down a chute" loading="eager">
  <figcaption>Fresh concrete coming down the chute onto a mat of rebar. Every number in this mix was decided long before the truck arrived.</figcaption>
</figure>
<p>By the time a mixer truck backs up to the forms, every question about the concrete has already been answered. How wet should it be? How strong? How much rock, how much sand, how much cement, how much water? Mix design is where those answers come from.</p>
<p>If you have studied the ingredients one at a time — cement, water, aggregates, admixtures — this is where the pieces come together. The question changes from <em>what is this material</em> to <em>how much of it do we need</em>. And the answer is not a formula. It is a sequence of decisions, and each decision uses the answer from the step before it. Miss one step, and every number after it is wrong.</p>
<p>That is the whole point of this guide: the same ten steps, in the same order, every time. Part 1 builds the road map. <a href="example/">Part 2</a> works one complete mix by hand — no software, just the ACI tables and a calculator.</p>
<div class="callout callout-key"><span class="label">Key idea</span>
  <p>Cement plus water makes the glue that holds everything together. More water means more space between the cement grains, and more space means weaker concrete. Keep that in mind: it is the reason the whole process exists.</p>
</div>

<h2 id="what"><span class="num">2</span>What mix design is</h2>
<div class="callout callout-def"><span class="label">Definition</span>
  <p>Concrete mix design is the process of selecting suitable ingredients for concrete and determining their relative proportions, to produce concrete with the required characteristics.</p>
</div>
<p>Two questions, then: <strong>which materials</strong>, and <strong>how much of each</strong>. The materials fall into four groups.</p>
<ul>
  <li><strong>Cementitious materials (C).</strong> Portland cement, plus any supplementary cementitious materials such as fly ash or slag. With water, they form the paste — the glue.</li>
  <li><strong>Water (W).</strong> Reacts with the cement (hydration) and, more than anything else, sets how easily the fresh concrete moves.</li>
  <li><strong>Aggregates (A).</strong> Coarse and fine. The filler — about 70 percent of the volume. The paste is only about 30.</li>
  <li><strong>Admixtures (Ad).</strong> The fine tuning: air entrainers, water reducers, retarders, accelerators.</li>
</ul>
<div class="callout callout-key"><span class="label">The goal</span>
  <p>Achieve the desired workability in fresh concrete and the required strength and durability in hardened concrete — at minimum cost.</p>
</div>
<p>All three at the same time. That is the hard part. If cost did not matter, mix design would be easy: just add more cement. But cement is the most expensive ingredient, so we use only as much as the job needs, and not a bag more.</p>

<h2 id="objectives"><span class="num">3</span>What a good mix must do</h2>
<p>Break the goal into three groups of objectives, and keep all three in your head while you work.</p>
<h3>Fresh concrete</h3>
<ul>
  <li><strong>Consistency and workability</strong> — so the crew can place and finish it.</li>
  <li><strong>Cohesiveness</strong> — so it holds together instead of bleeding.</li>
  <li><strong>Minimal segregation</strong> — the rocks must not sink to the bottom.</li>
</ul>
<h3>Hardened concrete</h3>
<ul>
  <li><strong>Compressive strength</strong> (f′<sub>c</sub>) at the specified age, usually 28 days.</li>
  <li><strong>Durability</strong> against whatever the structure will face: freezing and thawing, sulfates, chlorides, water.</li>
  <li><strong>Volume stability</strong> — low shrinkage, and therefore less cracking.</li>
</ul>
<h3>Economy</h3>
<ul>
  <li>Use locally available materials when you can. Hauling aggregate a hundred miles is expensive.</li>
  <li>Balance the first cost against the life-cycle cost. A cheap mix that fails early is not a cheap solution.</li>
</ul>

<h2 id="workflow"><span class="num">4</span>The ten-step workflow</h2>
<p>Here is the road map for everything that follows. Take a picture of it; we come back to it again and again.</p>
<figure>
<svg class="fig-svg" viewBox="0 0 720 250" role="img" aria-labelledby="fig1-title">
  <title id="fig1-title">The ten-step mix design workflow</title>
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1 L9 5 L1 9" fill="none" stroke="var(--muted)" stroke-width="1.5"/></marker></defs>
  <g fill="none" stroke="var(--border)" stroke-width="2">
    <path d="M92 48 H626" marker-end="url(#arrow)"/>
    <path d="M648 68 V138" marker-end="url(#arrow)"/>
    <path d="M628 160 H94" marker-end="url(#arrow)"/>
  </g>
  <g font-family="var(--font-head)" font-weight="800" font-size="18" text-anchor="middle">
    <circle cx="72" cy="48" r="18" fill="var(--icy)" stroke="var(--dark)" stroke-width="2"/><text x="72" y="54" fill="var(--dark)">1</text>
    <circle cx="216" cy="48" r="18" fill="var(--icy)" stroke="var(--dark)" stroke-width="2"/><text x="216" y="54" fill="var(--dark)">2</text>
    <circle cx="360" cy="48" r="18" fill="var(--royal)"/><text x="360" y="54" fill="#fff">3</text>
    <circle cx="504" cy="48" r="18" fill="var(--royal)"/><text x="504" y="54" fill="#fff">4</text>
    <circle cx="648" cy="48" r="18" fill="var(--royal)"/><text x="648" y="54" fill="#fff">5</text>
    <circle cx="648" cy="160" r="18" fill="var(--royal)"/><text x="648" y="166" fill="#fff">6</text>
    <circle cx="504" cy="160" r="18" fill="var(--royal)"/><text x="504" y="166" fill="#fff">7</text>
    <circle cx="360" cy="160" r="18" fill="var(--royal)"/><text x="360" y="166" fill="#fff">8</text>
    <circle cx="216" cy="160" r="18" fill="var(--dark)"/><text x="216" y="166" fill="#fff">9</text>
    <circle cx="72" cy="160" r="18" fill="var(--dark)"/><text x="72" y="166" fill="#fff">10</text>
  </g>
  <g font-family="var(--font-mono)" font-weight="500" font-size="11.5" fill="var(--muted)" text-anchor="middle">
    <text x="72" y="88">Slump</text>
    <text x="216" y="88">Max. aggregate</text><text x="216" y="102">size (NMAS)</text>
    <text x="360" y="88">Water and air</text>
    <text x="504" y="88">w/cm ratio</text>
    <text x="648" y="88">Cementitious</text><text x="648" y="102">materials</text>
    <text x="648" y="200">Coarse</text><text x="648" y="214">aggregate</text>
    <text x="504" y="200">Fine</text><text x="504" y="214">aggregate</text>
    <text x="360" y="200">Summarize</text><text x="360" y="214">the weights</text>
    <text x="216" y="200">Moisture and</text><text x="216" y="214">trial batch</text>
    <text x="72" y="200">Test and</text><text x="72" y="214">refine</text>
  </g>
  <g font-family="var(--font-mono)" font-weight="500" font-size="11" fill="var(--muted)">
    <circle cx="180" cy="240" r="6" fill="var(--icy)" stroke="var(--dark)" stroke-width="1.5"/><text x="192" y="244">Given by the job</text>
    <circle cx="330" cy="240" r="6" fill="var(--royal)"/><text x="342" y="244">Arithmetic</text>
    <circle cx="440" cy="240" r="6" fill="var(--dark)"/><text x="452" y="244">In the real world</text>
  </g>
</svg>
<figcaption>Figure 1. The ten-step workflow. Steps 1–2 are given by the job, 3–8 are arithmetic, and 9–10 happen in the real world.</figcaption>
</figure>
<ol class="steps">
  <li><strong>Select the slump.</strong></li>
  <li><strong>Select the nominal maximum aggregate size</strong> (NMAS).</li>
  <li><strong>Estimate the mixing water and air content</strong>, then apply any justified adjustments.</li>
  <li><strong>Select the water–cementitious materials ratio</strong> (w/cm) from the strength and durability requirements.</li>
  <li><strong>Calculate the total cementitious materials.</strong></li>
  <li><strong>Estimate the coarse aggregate.</strong></li>
  <li><strong>Calculate the fine aggregate</strong> by absolute volume.</li>
  <li><strong>Summarize the design-basis weights.</strong></li>
  <li><strong>Adjust for aggregate moisture and make a trial batch.</strong></li>
  <li><strong>Test the trial mixture and refine it.</strong></li>
</ol>
<div class="callout callout-key"><span class="label">Key idea</span>
  <p>The order matters. You cannot find the cement before you know the water, and you cannot find the sand before you know everything else. Each step consumes the answer from the one before it.</p>
</div>

<h2 id="step-1"><span class="num">5</span>Step 1 — Select the slump</h2>
<p>Slump is a simple field test: fill a cone with fresh concrete, lift the cone, and measure how far the concrete drops (ASTM C143). It is an index of <em>consistency</em> — how wet the mix behaves — not a complete measure of workability. A higher slump means a more flowable concrete that is easier to place.</p>
<figure>
  <img src="img/slump-test.jpg" width="800" height="600" alt="Slump cone lifted beside the slumped concrete, with a tape measuring the drop" loading="lazy">
  <figcaption>The slump test. The cone on the left was just lifted; the tape measures how far the concrete on the right settled.</figcaption>
</figure>
<p>The job usually tells you the slump. Thin walls and columns, and anything pumped, need more; mass concrete and pavements need less. Use the ranges below as a starting point.</p>
<div class="table-wrap">
<table class="ref-table" id="tbl-slump">
  <caption>Table 1. Starting slump ranges by member</caption>
  <thead><tr><th>Member or placement</th><th>Starting slump</th></tr></thead>
  <tbody>
    <tr><td>Footings and slabs</td><td>2–5 in.</td></tr>
    <tr><td>Beams and reinforced walls</td><td>3–5 in.</td></tr>
    <tr><td>Building columns</td><td>3–5 in.</td></tr>
  </tbody>
</table>
</div>
<p class="ref-note">Ranges before a water-reducing admixture is added; a superplasticizer can raise them without changing the w/cm.</p>
<div class="callout callout-warn"><span class="label">Watch out</span>
  <p>Here is the trap. Do not raise the slump by adding water. Extra water raises the water–cementitious materials ratio, and you lose strength. If you need more flow — for pumping, say — use a water reducer or a superplasticizer and keep the specified w/cm.</p>
</div>
<p class="see-also"><a href="example/#steps-1-3">See it worked in Part 2 →</a></p>

<h2 id="step-2"><span class="num">6</span>Step 2 — Select the nominal maximum aggregate size</h2>
<p>Why does aggregate size matter? Think about surface area. For the same volume, big rocks have far less surface area than small rocks. Less surface area means less paste to coat the particles, and less paste means less water and less cement. So, up to a point, bigger aggregate is cheaper. That is the whole idea.</p>
<figure class="fig-small">
  <img src="img/graded-aggregate.jpg" width="350" height="200" alt="Four aggregate sizes side by side, from fine to coarse" loading="lazy">
  <figcaption>Graded aggregate, from fine sand to coarse stone. The largest size that fits the member sets the NMAS.</figcaption>
</figure>
<p>But you cannot just use huge rocks. The rock has to fit through the forms and between the bars, or it gets stuck and you get honeycombing. ACI 318 sets three limits. The nominal maximum aggregate size may not exceed:</p>
<ul>
  <li><strong>1/5</strong> of the narrowest dimension between the sides of the forms;</li>
  <li><strong>1/3</strong> of the depth of a slab;</li>
  <li><strong>3/4</strong> of the minimum clear spacing between reinforcing bars.</li>
</ul>
<p>Take the largest size that satisfies all three rules and still gives good workability.</p>
<p class="see-also"><a href="example/#steps-1-3">See it worked in Part 2 →</a></p>

<h2 id="step-3"><span class="num">7</span>Step 3 — Estimate the mixing water and air</h2>
<p>Now open the ACI table (ACI PRC-211.1-22). You need two numbers to enter it: the slump and the NMAS — exactly the two things you picked in steps 1 and 2. See how the steps connect? The table gives the mixing water in lb/yd³ (kg/m³ in parentheses), and it gives the air content.</p>
<div class="table-wrap">
<table class="ref-table" id="tbl-water">
  <caption>Table 2. Approximate mixing water, lb/yd³ (kg/m³), and air content for the listed slumps and nominal maximum aggregate sizes</caption>
  <thead>
    <tr><th>Slump</th><th>3/8 in.<br><span class="si">9.5 mm</span></th><th>1/2 in.<br><span class="si">12.5 mm</span></th><th>3/4 in.<br><span class="si">19 mm</span></th><th>1 in.<br><span class="si">25 mm</span></th><th>1½ in.<br><span class="si">37.5 mm</span></th><th>2 in.<br><span class="si">50 mm</span></th></tr>
  </thead>
  <tbody>
    <tr class="group"><th colspan="7">Non-air-entrained concrete</th></tr>
    <tr data-series="nonAE" data-slump="1.5"><td>1–2 in.</td><td data-nmas="0.375">350 <span class="si">(207)</span></td><td data-nmas="0.5">335 <span class="si">(199)</span></td><td data-nmas="0.75">315 <span class="si">(190)</span></td><td data-nmas="1.0">300 <span class="si">(179)</span></td><td data-nmas="1.5">275 <span class="si">(166)</span></td><td data-nmas="2.0">260 <span class="si">(154)</span></td></tr>
    <tr data-series="nonAE" data-slump="3.5"><td>3–4 in.</td><td data-nmas="0.375">385 <span class="si">(228)</span></td><td data-nmas="0.5">365 <span class="si">(216)</span></td><td data-nmas="0.75">340 <span class="si">(205)</span></td><td data-nmas="1.0">325 <span class="si">(193)</span></td><td data-nmas="1.5">300 <span class="si">(181)</span></td><td data-nmas="2.0">285 <span class="si">(169)</span></td></tr>
    <tr data-series="nonAE" data-slump="6.5"><td>6–7 in.</td><td data-nmas="0.375">410 <span class="si">(243)</span></td><td data-nmas="0.5">385 <span class="si">(228)</span></td><td data-nmas="0.75">360 <span class="si">(216)</span></td><td data-nmas="1.0">340 <span class="si">(202)</span></td><td data-nmas="1.5">315 <span class="si">(190)</span></td><td data-nmas="2.0">300 <span class="si">(178)</span></td></tr>
    <tr data-row="entrapped"><td>Typical entrapped air, %</td><td data-nmas="0.375">3</td><td data-nmas="0.5">2.5</td><td data-nmas="0.75">2</td><td data-nmas="1.0">1.5</td><td data-nmas="1.5">1</td><td data-nmas="2.0">0.5</td></tr>
    <tr class="group"><th colspan="7">Air-entrained concrete</th></tr>
    <tr data-series="ae" data-slump="1.5"><td>1–2 in.</td><td data-nmas="0.375">305 <span class="si">(181)</span></td><td data-nmas="0.5">295 <span class="si">(175)</span></td><td data-nmas="0.75">280 <span class="si">(168)</span></td><td data-nmas="1.0">270 <span class="si">(160)</span></td><td data-nmas="1.5">250 <span class="si">(148)</span></td><td data-nmas="2.0">240 <span class="si">(142)</span></td></tr>
    <tr data-series="ae" data-slump="3.5"><td>3–4 in.</td><td data-nmas="0.375">340 <span class="si">(202)</span></td><td data-nmas="0.5">325 <span class="si">(193)</span></td><td data-nmas="0.75">305 <span class="si">(184)</span></td><td data-nmas="1.0">295 <span class="si">(175)</span></td><td data-nmas="1.5">275 <span class="si">(165)</span></td><td data-nmas="2.0">265 <span class="si">(157)</span></td></tr>
    <tr data-series="ae" data-slump="6.5"><td>6–7 in.</td><td data-nmas="0.375">365 <span class="si">(216)</span></td><td data-nmas="0.5">345 <span class="si">(205)</span></td><td data-nmas="0.75">325 <span class="si">(197)</span></td><td data-nmas="1.0">310 <span class="si">(184)</span></td><td data-nmas="1.5">290 <span class="si">(174)</span></td><td data-nmas="2.0">280 <span class="si">(166)</span></td></tr>
    <tr class="group"><th colspan="7">Recommended total air content, % (air-entrained)</th></tr>
    <tr data-row="air" data-exposure="mild"><td>Mild exposure</td><td data-nmas="0.375">4.5</td><td data-nmas="0.5">4.0</td><td data-nmas="0.75">3.5</td><td data-nmas="1.0">3.0</td><td data-nmas="1.5">2.5</td><td data-nmas="2.0">2.0</td></tr>
    <tr data-row="air" data-exposure="moderate"><td>Moderate exposure</td><td data-nmas="0.375">6.0</td><td data-nmas="0.5">5.5</td><td data-nmas="0.75">5.0</td><td data-nmas="1.0">4.5</td><td data-nmas="1.5">4.5</td><td data-nmas="2.0">4.0</td></tr>
    <tr data-row="air" data-exposure="severe"><td>Severe exposure</td><td data-nmas="0.375">7.5</td><td data-nmas="0.5">7.0</td><td data-nmas="0.75">6.0</td><td data-nmas="1.0">6.0</td><td data-nmas="1.5">5.5</td><td data-nmas="2.0">5.0</td></tr>
  </tbody>
</table>
</div>
<p class="ref-note">Starting values from ACI PRC-211.1-22 for angular, crushed-stone coarse aggregate. Columns for 3 in. and 4 in. NMAS are omitted.</p>
<p>Two kinds of air appear in the table. Concrete that is <em>not</em> air-entrained still traps a little air, and the amount depends on the aggregate size — about 1.5 percent for a 1 in. NMAS. Concrete exposed to freezing and thawing gets air <em>on purpose</em>, with an air-entraining admixture, and the target depends on the exposure and the NMAS.</p>
<h3>Adjust the water for particle shape</h3>
<p>The table assumes typical aggregate — angular, crushed stone. Yours may be different, and the adjustment factor is particle shape. Crushed stone is angular: sharp edges, rough faces, lots of surface area, so it needs more water. River gravel is rounded and smooth; it rolls easily and needs less.</p>
<figure class="fig-small">
  <img src="img/angular-rounded.jpg" width="331" height="152" alt="Angular crushed stone next to rounded gravel" loading="lazy">
  <figcaption>Angular crushed stone (left) and rounded gravel (right). Same size, very different water demand.</figcaption>
</figure>
<div class="table-wrap">
<table class="ref-table" id="tbl-shape">
  <caption>Table 3. Mixing-water adjustment for aggregate shape</caption>
  <thead><tr><th>Aggregate condition</th><th>Initial estimate</th></tr></thead>
  <tbody>
    <tr><td>Angular, crushed stone</td><td>ACI table value</td></tr>
    <tr><td>Rounded gravel</td><td>Start at −8%</td></tr>
    <tr><td>Other shapes or blends</td><td>Use plant records</td></tr>
    <tr><td>All mixtures</td><td>Confirm by trial batch</td></tr>
  </tbody>
</table>
</div>
<p>For example: the table says 325 lb/yd³, and the coarse aggregate is well-rounded gravel. Start with an 8 percent reduction: 325 × 0.92 ≈ <strong>299 lb/yd³</strong>. Remember that number; Part 2 uses it. And remember why it matters: less water at the same w/cm means less cement, and less cement means lower cost.</p>
<p class="see-also"><a href="example/#steps-1-3">See it worked in Part 2 →</a></p>

<h2 id="step-4"><span class="num">8</span>Step 4 — Choose the water–cementitious materials ratio</h2>
<h3>First, an input: the required average strength</h3>
<p>The drawings specify a compressive strength, f′<sub>c</sub>. You do not design the mix for f′<sub>c</sub>. You design it for a higher number, the <strong>required average strength</strong> f′<sub>cr</sub> — r for required.</p>
<p>Why overdesign? Because concrete is not perfect. Same plant, same materials, same day — and the cylinders still come out a little different every time. If you design exactly at 3,000 psi, about half of your tests will fall below 3,000 psi, and the concrete fails its statistical acceptance criteria. So we aim higher on purpose. How much higher depends on whether the plant has a strength record with low variability. With no acceptable record, ACI gives a fixed margin:</p>
<div class="table-wrap">
<table class="ref-table" id="tbl-fcr">
  <caption>Table 4. Required average strength when no acceptable strength record is available</caption>
  <thead><tr><th>Specified strength f′<sub>c</sub>, psi</th><th>Required average strength f′<sub>cr</sub>, psi</th></tr></thead>
  <tbody>
    <tr><td>less than 3,000</td><td>f′<sub>c</sub> + 1,000</td></tr>
    <tr><td>3,000 to 5,000</td><td>f′<sub>c</sub> + 1,200</td></tr>
    <tr><td>over 5,000</td><td>1.10 f′<sub>c</sub> + 700</td></tr>
  </tbody>
</table>
</div>
<div class="callout callout-def"><span class="label">Definition</span>
  <p>The specified compressive strength f′<sub>c</sub> is the design value at the stated age. Acceptance is statistical — it is not a minimum for every single cylinder. One low cylinder does not automatically mean the concrete failed.</p>
</div>
<h3>Then, the ratio</h3>
<p>This is the most important number in the whole mix design. Everything about strength and durability comes back to the water–cementitious materials ratio, w/cm, by weight. A lower ratio leaves less space between the cement grains: higher strength and lower permeability.</p>
<p>There are two ways to pick it. <strong>Strength</strong> gives you one value, from the table below, entered with f′<sub>cr</sub>. <strong>Durability</strong> gives you another, from the exposure class — ACI 318 sets maximum w/cm values for freezing and thawing, sulfates, and other exposures.</p>
<div class="table-wrap">
<table class="ref-table" id="tbl-wcm">
  <caption>Table 5. Water–cementitious materials ratio for a required 28-day compressive strength</caption>
  <thead><tr><th>Required strength, psi <span class="si">(MPa)</span></th><th>Non-air-entrained</th><th>Air-entrained</th></tr></thead>
  <tbody>
    <tr data-fc="6000"><td>6,000 <span class="si">(41.4)</span></td><td data-series="nonAE">0.41</td><td data-series="ae">0.32</td></tr>
    <tr data-fc="5000"><td>5,000 <span class="si">(34.5)</span></td><td data-series="nonAE">0.48</td><td data-series="ae">0.40</td></tr>
    <tr data-fc="4000"><td>4,000 <span class="si">(27.6)</span></td><td data-series="nonAE">0.57</td><td data-series="ae">0.48</td></tr>
    <tr data-fc="3000"><td>3,000 <span class="si">(20.7)</span></td><td data-series="nonAE">0.68</td><td data-series="ae">0.59</td></tr>
    <tr data-fc="2000"><td>2,000 <span class="si">(13.8)</span></td><td data-series="nonAE">0.82</td><td data-series="ae">0.74</td></tr>
  </tbody>
</table>
</div>
<p class="ref-note">Starting values from ACI PRC-211.1-22, ratio by weight. Interpolate between rows.</p>
<div class="callout callout-key"><span class="label">Key idea</span>
  <p>Take the lower of the two ratios. The lower w/cm always governs.</p>
</div>
<p>Interpolation is part of the job. Suppose f′<sub>cr</sub> = 4,200 psi for non-air-entrained concrete. The table gives 0.57 at 4,000 psi and 0.48 at 5,000 psi. 4,200 is 20 percent of the way from 4,000 to 5,000, so: 0.57 − 0.20 × (0.57 − 0.48) = 0.57 − 0.018 ≈ <strong>0.55</strong>. Make sure you can do that on a calculator; Part 2 does it again.</p>
<p class="see-also"><a href="example/#step-4">See it worked in Part 2 →</a></p>

<h2 id="step-5"><span class="num">9</span>Step 5 — Calculate the total cementitious materials</h2>
<p>This step is simple algebra. You know the water; you know the ratio. So:</p>
<div class="eq"><i>CM</i> = <span class="frac"><span>mixing water</span><span>w/cm</span></span></div>
<p>Say the adjusted water is 299 lb/yd³ and the ratio came out at 0.48. Then 299 ÷ 0.48 ≈ 623 lb/yd³ of cementitious materials. (In Part 2 the ratio is 0.55, and the answer is 544.)</p>
<p>A few checks before you move on:</p>
<ul>
  <li>This is <strong>total cementitious material</strong>, not only portland cement. Fly ash, slag, and silica fume — the supplementary cementitious materials, SCMs — can replace part of the cement.</li>
  <li>Use a <strong>minimum cement content</strong> only when the project actually requires one.</li>
  <li>Watch the <strong>paste volume</strong>. Too much paste means more shrinkage, more heat, and more money.</li>
  <li>Confirm everything with a <strong>trial batch</strong>. Paper is not proof.</li>
</ul>
<p class="see-also"><a href="example/#step-5">See it worked in Part 2 →</a></p>

<h2 id="step-6"><span class="num">10</span>Step 6 — Estimate the coarse aggregate by bulk volume</h2>
<p>The coarse aggregate is estimated by the <strong>bulk volume method</strong>. ACI gives a ratio, b/b<sub>0</sub>, where b is the bulk volume of coarse aggregate and b<sub>0</sub> is the bulk volume of the concrete — one cubic yard. The ratio depends on two things: the NMAS, and the fineness modulus (FM) of the sand. Coarser sand can carry more coarse aggregate; finer sand needs less.</p>
<div class="table-wrap">
<table class="ref-table" id="tbl-bb0">
  <caption>Table 6. Bulk volume of oven-dry-rodded coarse aggregate per unit volume of concrete, b/b<sub>0</sub></caption>
  <thead><tr><th>NMAS</th><th>FM 2.40</th><th>FM 2.60</th><th>FM 2.80</th><th>FM 3.00</th></tr></thead>
  <tbody>
    <tr data-nmas="0.375"><td>3/8 in. <span class="si">(9.5 mm)</span></td><td data-fm="2.40">0.50</td><td data-fm="2.60">0.48</td><td data-fm="2.80">0.46</td><td data-fm="3.00">0.44</td></tr>
    <tr data-nmas="0.5"><td>1/2 in. <span class="si">(12.5 mm)</span></td><td data-fm="2.40">0.59</td><td data-fm="2.60">0.57</td><td data-fm="2.80">0.55</td><td data-fm="3.00">0.53</td></tr>
    <tr data-nmas="0.75"><td>3/4 in. <span class="si">(19 mm)</span></td><td data-fm="2.40">0.66</td><td data-fm="2.60">0.64</td><td data-fm="2.80">0.62</td><td data-fm="3.00">0.60</td></tr>
    <tr data-nmas="1.0"><td>1 in. <span class="si">(25 mm)</span></td><td data-fm="2.40">0.71</td><td data-fm="2.60">0.69</td><td data-fm="2.80">0.67</td><td data-fm="3.00">0.65</td></tr>
    <tr data-nmas="1.5"><td>1½ in. <span class="si">(37.5 mm)</span></td><td data-fm="2.40">0.75</td><td data-fm="2.60">0.73</td><td data-fm="2.80">0.71</td><td data-fm="3.00">0.69</td></tr>
    <tr data-nmas="2.0"><td>2 in. <span class="si">(50 mm)</span></td><td data-fm="2.40">0.78</td><td data-fm="2.60">0.76</td><td data-fm="2.80">0.74</td><td data-fm="3.00">0.72</td></tr>
  </tbody>
</table>
</div>
<p class="ref-note">ACI PRC-211.1-22. Enter with the NMAS and the fineness modulus of the fine aggregate.</p>
<p>Then convert the ratio into a weight:</p>
<div class="eq"><i>m</i><sub>CA</sub> = <span class="frac"><span><i>b</i></span><span><i>b</i><sub>0</sub></span></span> × 27 ft³/yd³ × dry-rodded bulk density</div>
<p>For a 1 in. NMAS and FM = 2.60 the table gives 0.69. With a dry-rodded density of 100 lb/ft³: 0.69 × 27 × 100 = <strong>1,863 lb/yd³</strong>, oven-dry. When the next step needs the mass on an SSD basis, multiply by (1 + absorption): 1,863 × 1.005 ≈ 1,872 lb/yd³.</p>
<div class="callout callout-warn"><span class="label">Watch out</span>
  <p>b/b<sub>0</sub> uses the oven-dry-rodded bulk density, and a bulk volume includes the voids between the stones. Bulk volume is not absolute volume. That is fine here — the sand and the paste will fill those voids in the next step — but do not mix the two ideas.</p>
</div>
<p class="see-also"><a href="example/#step-6">See it worked in Part 2 →</a></p>

<h2 id="step-7"><span class="num">11</span>Step 7 — Calculate the fine aggregate by absolute volume</h2>
<p>The fine aggregate is whatever is left. One cubic yard of concrete is one cubic yard of solid material plus air, so we compute the absolute volume of every other ingredient and subtract from 1 yd³. To convert a mass in pounds directly into cubic yards, divide by its relative density times 1,685 lb/yd³ — the weight of a cubic yard of water.</p>
<div class="eq"><i>V</i> (yd³) = <span class="frac"><span><i>m</i> (lb)</span><span><i>RD</i> × 1,685 lb/yd³</span></span></div>
<div class="eq"><i>V</i><sub>FA</sub> = 1 yd³ − Σ <i>V</i><sub>other</sub></div>
<div class="eq"><i>m</i><sub>FA</sub> = <i>V</i><sub>FA</sub> × <i>RD</i><sub>FA</sub> × 1,685 lb/yd³</div>
<div class="callout callout-def"><span class="label">Definition</span>
  <p>Relative density (specific gravity) compares a material's density with that of water, so water itself has a relative density of 1. Keep every mass and every relative density on the same moisture basis — oven-dry or SSD — and never mix them.</p>
</div>
<p>With the example numbers so far (544 lb of cementitious materials at RD 3.15, 299 lb of water, 1,872 lb SSD of coarse aggregate at RD 2.68, and 1.5 percent air):</p>
<ul>
  <li>Cementitious materials: 544 ÷ (3.15 × 1,685) = 0.102 yd³</li>
  <li>Water: 299 ÷ 1,685 = 0.177 yd³</li>
  <li>Coarse aggregate (SSD): 1,872 ÷ (2.68 × 1,685) = 0.415 yd³</li>
  <li>Air: 0.015 × 1 yd³ = 0.015 yd³</li>
</ul>
<p>The sum is 0.7095 yd³, so the sand takes the remaining 0.2905 yd³. At RD 2.64: 0.2905 × 2.64 × 1,685 ≈ <strong>1,292 lb SSD</strong> of fine aggregate.</p>
<figure>
<svg class="fig-svg" viewBox="0 0 720 132" role="img" aria-labelledby="fig2-title">
  <title id="fig2-title">Absolute volumes of the five ingredients in one cubic yard</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="11" fill="var(--muted)" text-anchor="middle">
    <text x="97" y="34">Water 0.177</text>
    <text x="186" y="34">CM 0.102</text>
    <text x="351" y="34">Coarse aggregate (SSD) 0.415</text>
    <text x="587" y="34">Fine aggregate (SSD) 0.2905</text>
  </g>
  <rect x="40" y="44" width="113.3" height="40" fill="var(--icy)" stroke="var(--dark)" stroke-width="1"/>
  <rect x="153.3" y="44" width="65.3" height="40" fill="var(--royal)"/>
  <rect x="218.6" y="44" width="265.6" height="40" fill="var(--dark)"/>
  <rect x="484.2" y="44" width="9.6" height="40" fill="var(--bg)" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 2"/>
  <rect x="493.8" y="44" width="185.9" height="40" fill="var(--border)"/>
  <rect x="40" y="44" width="639.7" height="40" fill="none" stroke="var(--dark)" stroke-width="1.5"/>
  <path d="M489 86 V100" fill="none" stroke="var(--muted)" stroke-width="1"/>
  <g font-family="var(--font-mono)" font-weight="500" font-size="11" fill="var(--muted)" text-anchor="middle">
    <text x="489" y="112">Air 0.015</text>
    <text x="360" y="128">Total = 1.000 yd³</text>
  </g>
</svg>
<figcaption>Figure 2. Absolute volumes in one cubic yard for the example. All five pieces add up to exactly 1.000 yd³ — that is your check.</figcaption>
</figure>
<p class="see-also"><a href="example/#step-7">See it worked in Part 2 →</a></p>

<h2 id="step-8-10"><span class="num">12</span>Steps 8–10 — Summarize, adjust for moisture, and trial-batch</h2>
<h3>Step 8 — Summarize the design-basis weights</h3>
<p>Write the mix on one line, per cubic yard, with the moisture basis stated: cementitious materials, water, coarse aggregate (SSD), fine aggregate (SSD), and the air content. Then check three things: the w/cm you get back from water ÷ cementitious materials, the volumes summing to 1.000 yd³, and a theoretical density in the normal-weight range, roughly 140 to 150 lb/ft³.</p>
<h3>Step 9 — Adjust for moisture and make a trial batch</h3>
<p>The design weights assume SSD aggregate — saturated, surface-dry. Stockpiles are rarely at SSD. If the aggregate is wet, the free moisture on its surface adds water to the mix; if it is dry, it absorbs water from the mix.</p>
<figure>
<svg class="fig-svg" viewBox="0 0 720 190" role="img" aria-labelledby="fig3-title">
  <title id="fig3-title">The four moisture states of aggregate</title>
  <g font-family="var(--font-mono)" font-weight="600" font-size="12" fill="var(--dark)" text-anchor="middle">
    <text x="150" y="24">Oven-dry</text>
    <text x="300" y="24">Air-dry</text>
    <text x="450" y="24">Saturated, surface-dry</text>
    <text x="600" y="24">Wet</text>
  </g>
  <circle cx="150" cy="88" r="34" fill="var(--bg)" stroke="var(--dark)" stroke-width="2.5"/>
  <circle cx="300" cy="88" r="34" fill="var(--bg)" stroke="var(--dark)" stroke-width="2.5"/>
  <circle cx="296" cy="91" r="19" fill="var(--icy)"/>
  <circle cx="450" cy="88" r="34" fill="var(--icy)" stroke="var(--dark)" stroke-width="2.5"/>
  <circle cx="600" cy="88" r="46" fill="var(--icy)"/>
  <circle cx="600" cy="88" r="34" fill="var(--icy)" stroke="var(--dark)" stroke-width="2.5"/>
  <g font-family="var(--font-mono)" font-weight="500" font-size="11" fill="var(--muted)">
    <text x="10" y="150">Total moisture</text>
    <text x="10" y="172">Free water</text>
  </g>
  <g font-family="var(--font-mono)" font-weight="500" font-size="11" fill="var(--muted)" text-anchor="middle">
    <text x="150" y="150">None</text>
    <text x="300" y="150">Less than absorption</text>
    <text x="450" y="150">Equal to absorption</text>
    <text x="600" y="150">More than absorption</text>
    <text x="150" y="172">Negative (takes water)</text>
    <text x="300" y="172">Negative (takes water)</text>
    <text x="450" y="172">Zero</text>
    <text x="600" y="172">Positive (adds water)</text>
  </g>
</svg>
<figcaption>Figure 3. Aggregate moisture states. Only at SSD does the aggregate neither add water to the mix nor take it away.</figcaption>
</figure>
<p>The correction uses the total moisture content MC and the absorption A of each aggregate, both as fractions of the oven-dry mass:</p>
<div class="eq">free moisture = <i>MC</i> − <i>A</i></div>
<p>A positive value means the aggregate adds water to the mix; a negative value means it takes water away. Adjust both the water and the aggregate weights:</p>
<div class="eq">batch water = design water − Σ free water</div>
<div class="eq">batch aggregate = SSD mass × <span class="frac"><span>1 + <i>MC</i></span><span>1 + <i>A</i></span></span></div>
<p>For example, coarse aggregate at 1,872 lb SSD with MC = 2.0 percent and A = 0.5 percent carries about 28 lb of free water. So the coarse aggregate is batched at about 1,900 lb and the water drops from 299 to 271 lb — and then you repeat the same correction for the sand.</p>
<h3>Step 10 — Test and refine</h3>
<p>Batch it, then measure what you assumed: slump, air content, unit weight, and cylinders for strength at the specified age (ASTM C39). Adjust the water, the admixture dose, or the sand-to-aggregate proportion, and batch again. The ACI values are starting estimates. The trial batch is the answer.</p>
<p class="see-also"><a href="example/#summary">See it worked in Part 2 →</a></p>

<h2 id="takeaways"><span class="num">13</span>Key takeaways</h2>
<ol>
  <li>ACI PRC-211.1-22 gives <strong>starting estimates</strong>, not final answers.</li>
  <li>Use a <strong>consistent workflow</strong>: the same ten steps, in the same order, every time. Then trial-batch and adjust.</li>
  <li>Use the <strong>lower w/cm</strong> required by strength and durability. The lower one always governs.</li>
  <li>Keep the <strong>moisture basis consistent</strong> — oven-dry or SSD, never mixed. Then test and refine.</li>
</ol>
<p>Mix design is not memorizing numbers. It is understanding the sequence. Part 2 runs the whole sequence on one real problem.</p>

<nav class="article-nav">
  <a class="prev" href="../"><span class="dir">← Study</span><span class="ttl">All study materials</span></a>
  <a class="next" href="example/"><span class="dir">Next →</span><span class="ttl">Part 2: Worked example — a 3,000 psi beam</span></a>
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
```

- [ ] **Step 4: 읽는 시간 계산·기입**

Run (PowerShell — 표와 SVG 도해의 숫자·라벨은 읽는 시간에서 뺀다): `$html = Get-Content site/study/mix-design/index.html -Raw; $body = [regex]::Match($html, '(?s)<article class="article">(.*)</article>').Groups[1].Value; $body = [regex]::Replace($body, '(?s)<table.*?</table>', ' '); $body = [regex]::Replace($body, '(?s)<svg.*?</svg>', ' '); $text = [regex]::Replace($body, '<[^>]+>', ' '); $words = ($text -split '\s+' | Where-Object { $_ -ne '' }).Count; "$words words, $([math]::Round($words/200)) min"`
Expected: 약 2,000 words → `10 min` 안팎. 출력된 분 수로 `.byline`의 "9 min read"를 고친다(같으면 그대로).

- [ ] **Step 5: 테스트 실행 — 표 대조 통과 확인**

Run: `node --test tools/study-tables.test.mjs tools/site-guards.test.mjs`
Expected: 모두 PASS(`tests 6`, `fail 0`).

- [ ] **Step 6: 커밋**

```bash
git add site/study/mix-design/index.html tools/study-tables.test.mjs
git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 글 Part 1 — How to design a concrete mix (10단계·표 6·도해 3) + 엔진 표 대조 테스트

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 4: Part 2 — Worked example: a 3,000 psi beam

**Files:**
- Create: `site/study/mix-design/example/index.html`
- Modify: `tools/site-guards.test.mjs` (내부 링크 존재 테스트 추가)

**Interfaces:**
- Consumes: Task 1 클래스 계약, Task 3의 절 id·표 id(`../#step-1` … `../#tbl-water`).
- Produces: 절 id `problem steps-1-3 step-4 step-5 step-6 step-7 summary moisture trial`(Part 1이 `example/#…`로 링크).

- [ ] **Step 1: 내부 링크 테스트 추가(실패 확인용)** — `tools/site-guards.test.mjs` 끝에 추가:

```js
const ARTICLE_PAGES = ['study/mix-design/index.html', 'study/mix-design/example/index.html'];
test('글 페이지의 내부 링크·이미지·스타일 경로가 파일로 존재한다', () => {
  for (const rel of ARTICLE_PAGES) {
    const file = join(SITE, rel);
    assert.ok(existsSync(file), `${rel} missing`);
    const html = readFileSync(file, 'utf8');
    const refs = [...html.matchAll(/\b(?:href|src)="([^"#][^"]*)"/g)].map(m => m[1]).filter(u => !/^https?:/.test(u));
    assert.ok(refs.length > 10, `${rel}: too few refs`);
    for (const u of refs) {
      const clean = u.split('#')[0].split('?')[0];
      let p = resolve(dirname(file), clean);
      if (clean.endsWith('/')) p = join(p, 'index.html');
      assert.ok(existsSync(p), `${rel}: broken ref ${u}`);
    }
    // 페이지 안 앵커(#id)도 실제 id 가 있어야 한다
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
    for (const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(m[1]), `${rel}: missing anchor #${m[1]}`);
  }
});
```

- [ ] **Step 2: 테스트 실행 — Part 2 가 없어 실패**

Run: `node --test tools/site-guards.test.mjs`
Expected: 링크 테스트 FAIL(`study/mix-design/example/index.html missing`).

- [ ] **Step 3: `site/study/mix-design/example/index.html` 작성** — 아래 전문.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Worked example: a 3,000 psi beam — Construction Study Lab</title>
<meta name="description" content="Concrete mix design, part 2: one reinforced beam, one cubic yard, 3,000 psi — every step worked by hand from the ACI tables to a checked batch.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&family=Hepta+Slab:wght@400;600;700&family=Red+Hat+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../../shared/theme.css">
<link rel="stylesheet" href="../../article.css">
</head>
<body class="section-page article-page">
<header class="appbar"><div class="appbar-inner appbar-inner--wide">
  <a class="logo" href="../../../">Construction Study Lab</a>
  <nav class="appbar-nav" aria-label="Sections">
    <a href="../../../labs/">Lab</a>
    <a href="../../" class="is-active">Study</a>
  </nav>
</div></header>

<section class="band-royal article-hero"><div class="article-hero-inner">
  <p class="eyebrow">Concrete mix design · Part 2 of 2</p>
  <h1>Worked example: a 3,000 psi beam</h1>
  <p class="lede">One reinforced beam, one cubic yard, 3,000 psi — every number worked by hand, in the same ten steps.</p>
  <p class="byline">Jisoo Park · September 2026 · 6 min read</p>
</div></section>

<main class="article-layout">
<nav class="toc" aria-label="Contents">
  <h2>Contents</h2>
  <ol>
    <li><a href="#problem">1. The problem</a></li>
    <li><a href="#steps-1-3">2. Steps 1–3 — Slump, size, water and air</a></li>
    <li><a href="#step-4">3. Step 4 — Required strength and w/cm</a></li>
    <li><a href="#step-5">4. Step 5 — Cementitious materials</a></li>
    <li><a href="#step-6">5. Step 6 — Coarse aggregate</a></li>
    <li><a href="#step-7">6. Step 7 — Fine aggregate</a></li>
    <li><a href="#summary">7. Step 8 — The design-basis mix</a></li>
    <li><a href="#moisture">8. Step 9 — Moisture adjustment</a></li>
    <li><a href="#trial">9. Step 10 — Trial batch</a></li>
  </ol>
</nav>

<article class="article">

<h2 id="problem"><span class="num">1</span>The problem</h2>
<p>Put your calculator on the desk. This is one complete mix design, from the problem statement to a checked batch, in the same ten steps as <a href="../">Part 1</a>. Nothing is skipped, and nothing comes from software.</p>
<div class="table-wrap">
<table class="ref-table ref-table--text" id="tbl-givens">
  <caption>Design requirements and material properties</caption>
  <thead><tr><th>Item</th><th>Given</th></tr></thead>
  <tbody>
    <tr><td>Application</td><td>Reinforced concrete beam</td></tr>
    <tr><td>Specified strength f′<sub>c</sub></td><td>3,000 psi at 28 days</td></tr>
    <tr><td>Exposure classes</td><td>F0 / S0 / W0 / C0 — indoor, protected</td></tr>
    <tr><td>Target slump</td><td>3–4 in.</td></tr>
    <tr><td>Cementitious system</td><td>Type I/IL cement, relative density 3.15</td></tr>
    <tr><td>Coarse aggregate</td><td>1 in. NMAS, well-rounded gravel; dry-rodded density 100 lb/ft³; SSD relative density 2.68; absorption 0.5%</td></tr>
    <tr><td>Fine aggregate</td><td>Natural sand; fineness modulus 2.60; SSD relative density 2.64; absorption 0.7%</td></tr>
    <tr><td>Task</td><td>Proportions for 1 yd³ of concrete, using ACI PRC-211.1-22 starting estimates</td></tr>
  </tbody>
</table>
</div>
<p>Read it carefully before touching the calculator. Two things matter more than the rest. <em>Well-rounded</em> gravel: that is the 8 percent water reduction from Part 1. And exposure <em>F0/S0/W0/C0</em>: indoor and protected, so durability will not control the w/cm — strength will.</p>

<h2 id="steps-1-3"><span class="num">2</span>Steps 1–3 — Slump, size, water and air</h2>
<p class="method">Method: <a href="../#step-1">Part 1, steps 1–3</a></p>
<h3>Steps 1 and 2 — given</h3>
<p>The slump is given: 3–4 in. The NMAS is given: 1 in. In a homework problem these may not be given, and then you choose them yourself with the rules in Part 1.</p>
<h3>Step 3 — water and air from the table</h3>
<p>Enter <a href="../#tbl-water">Table 2</a> with a 3–4 in. slump and a 1 in. NMAS, in the non-air-entrained block — this is indoor concrete, so no entrained air is needed:</p>
<ul>
  <li>Initial water estimate: <strong>325 lb/yd³</strong></li>
  <li>Entrapped air: about <strong>1.5%</strong>, which is 0.015 yd³ of our cubic yard. We need that volume in step 7.</li>
</ul>
<h3>Step 3, continued — adjust for particle shape</h3>
<p>The gravel is well rounded, so start with an 8 percent reduction:</p>
<div class="eq">325 × 0.92 ≈ <strong>299 lb/yd³</strong></div>
<div class="callout callout-key"><span class="label">Write it down</span>
  <p>Design water: 299 lb/yd³. Everything from here on depends on it.</p>
</div>

<h2 id="step-4"><span class="num">3</span>Step 4 — Required strength and the w/cm ratio</h2>
<p class="method">Method: <a href="../#step-4">Part 1, step 4</a></p>
<h3>Required average strength</h3>
<p>The specified strength is 3,000 psi, and the plant has no acceptable strength record, so we use the ACI margin for the 3,000 to 5,000 psi range:</p>
<div class="eq"><i>f′</i><sub>cr</sub> = 3,000 + 1,200 = <strong>4,200 psi</strong></div>
<p>Notice: we design for 4,200 psi, but the drawing still says 3,000. The extra strength is the safety margin against batch-to-batch variation.</p>
<h3>Water–cementitious materials ratio</h3>
<p>From <a href="../#tbl-wcm">Table 5</a>, non-air-entrained: 4,000 psi → 0.57 and 5,000 psi → 0.48. Our 4,200 psi sits between them, 200 psi into a 1,000 psi interval — 20 percent of the way:</p>
<div class="eq">w/cm = 0.57 − 0.20 × (0.57 − 0.48) = 0.57 − 0.018 ≈ <strong>0.55</strong></div>
<p>Now check durability. Exposure F0/S0/W0/C0 sets no maximum w/cm, so there is nothing lower to compare against. <strong>0.55 governs.</strong> Strength controls this design.</p>

<h2 id="step-5"><span class="num">4</span>Step 5 — Total cementitious materials</h2>
<p class="method">Method: <a href="../#step-5">Part 1, step 5</a></p>
<p>Water divided by the ratio:</p>
<div class="eq"><i>CM</i> = <span class="frac"><span>299 lb/yd³</span><span>0.55</span></span> ≈ <strong>544 lb/yd³</strong></div>
<div class="callout callout-key"><span class="label">Write it down</span>
  <p>Cementitious materials: 544 lb/yd³. We need it for the volume calculation in step 7.</p>
</div>

<h2 id="step-6"><span class="num">5</span>Step 6 — Coarse aggregate</h2>
<p class="method">Method: <a href="../#step-6">Part 1, step 6</a></p>
<p>Enter <a href="../#tbl-bb0">Table 6</a> with a 1 in. NMAS and a sand fineness modulus of 2.60. Read across, read down: <strong>b/b<sub>0</sub> = 0.69</strong>.</p>
<div class="eq">bulk volume = 0.69 × 27 ft³/yd³ ≈ 18.6 ft³</div>
<div class="eq"><i>m</i><sub>CA, OD</sub> = 0.69 × 27 × 100 lb/ft³ = <strong>1,863 lb/yd³</strong></div>
<p>The volume formula in the next step wants the SSD mass, not oven-dry. Absorption is 0.5 percent, so:</p>
<div class="eq"><i>m</i><sub>CA, SSD</sub> = 1,863 × 1.005 ≈ <strong>1,872 lb/yd³</strong></div>
<div class="callout callout-warn"><span class="label">Watch out</span>
  <p>b/b<sub>0</sub> uses the dry-rodded bulk density, which includes the voids between the stones. That is fine — the sand and the paste fill those voids in step 7 — but it is why you must not treat this bulk volume as an absolute volume.</p>
</div>

<h2 id="step-7"><span class="num">6</span>Step 7 — Fine aggregate</h2>
<p class="method">Method: <a href="../#step-7">Part 1, step 7</a></p>
<p>Let's fill the box. Volume equals mass divided by relative density times 1,685 lb/yd³:</p>
<div class="table-wrap">
<table class="ref-table" id="tbl-volumes">
  <caption>Absolute volumes of everything except the sand</caption>
  <thead><tr><th>Ingredient</th><th>Calculation</th><th>Volume, yd³</th></tr></thead>
  <tbody>
    <tr><td>Cementitious materials</td><td>544 ÷ (3.15 × 1,685)</td><td>0.102</td></tr>
    <tr><td>Water</td><td>299 ÷ (1.00 × 1,685)</td><td>0.177</td></tr>
    <tr><td>Coarse aggregate (SSD)</td><td>1,872 ÷ (2.68 × 1,685)</td><td>0.415</td></tr>
    <tr><td>Air</td><td>1.5% × 1.0 yd³</td><td>0.015</td></tr>
    <tr><th>Sum</th><td></td><th>0.7095</th></tr>
  </tbody>
</table>
</div>
<p>Water has no relative density term because water is the reference: its relative density is 1. The sand takes what is left:</p>
<div class="eq"><i>V</i><sub>FA</sub> = 1 − 0.7095 = <strong>0.2905 yd³</strong></div>
<div class="eq"><i>m</i><sub>FA, SSD</sub> = 0.2905 × 2.64 × 1,685 ≈ <strong>1,292 lb/yd³</strong></div>
<figure>
<svg class="fig-svg" viewBox="0 0 720 132" role="img" aria-labelledby="fig1-title">
  <title id="fig1-title">Absolute volumes of the five ingredients in one cubic yard</title>
  <g font-family="var(--font-mono)" font-weight="500" font-size="11" fill="var(--muted)" text-anchor="middle">
    <text x="97" y="34">Water 0.177</text>
    <text x="186" y="34">CM 0.102</text>
    <text x="351" y="34">Coarse aggregate (SSD) 0.415</text>
    <text x="587" y="34">Fine aggregate (SSD) 0.2905</text>
  </g>
  <rect x="40" y="44" width="113.3" height="40" fill="var(--icy)" stroke="var(--dark)" stroke-width="1"/>
  <rect x="153.3" y="44" width="65.3" height="40" fill="var(--royal)"/>
  <rect x="218.6" y="44" width="265.6" height="40" fill="var(--dark)"/>
  <rect x="484.2" y="44" width="9.6" height="40" fill="var(--bg)" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 2"/>
  <rect x="493.8" y="44" width="185.9" height="40" fill="var(--border)"/>
  <rect x="40" y="44" width="639.7" height="40" fill="none" stroke="var(--dark)" stroke-width="1.5"/>
  <path d="M489 86 V100" fill="none" stroke="var(--muted)" stroke-width="1"/>
  <g font-family="var(--font-mono)" font-weight="500" font-size="11" fill="var(--muted)" text-anchor="middle">
    <text x="489" y="112">Air 0.015</text>
    <text x="360" y="128">Total = 1.000 yd³</text>
  </g>
</svg>
<figcaption>Figure 1. The five absolute volumes add up to exactly 1.000 yd³. If they do not, there is an arithmetic error somewhere.</figcaption>
</figure>

<h2 id="summary"><span class="num">7</span>Step 8 — The design-basis mix</h2>
<p class="method">Method: <a href="../#step-8-10">Part 1, steps 8–10</a></p>
<div class="table-wrap">
<table class="ref-table" id="tbl-summary">
  <caption>Design-basis mix proportions per cubic yard, SSD basis</caption>
  <thead><tr><th>Ingredient</th><th>Mass, lb/yd³</th></tr></thead>
  <tbody>
    <tr><td>Total cementitious materials</td><td>544</td></tr>
    <tr><td>Water</td><td>299</td></tr>
    <tr><td>Coarse aggregate (SSD)</td><td>1,872</td></tr>
    <tr><td>Fine aggregate (SSD)</td><td>1,292</td></tr>
    <tr><th>Total</th><th>4,007</th></tr>
  </tbody>
</table>
</div>
<p>Three quick checks:</p>
<ol>
  <li><strong>The ratio.</strong> 299 ÷ 544 ≈ 0.55 — matches the design.</li>
  <li><strong>The volume.</strong> 0.102 + 0.177 + 0.415 + 0.015 + 0.2905 = 1.000 yd³.</li>
  <li><strong>The density.</strong> 4,007 lb ÷ 27 ft³ ≈ 148.4 lb/ft³. Normal-weight concrete runs about 140 to 150 lb/ft³, so the answer is reasonable.</li>
</ol>
<div class="table-wrap">
<table class="ref-table ref-table--text" id="tbl-design-summary">
  <caption>Design summary</caption>
  <tbody>
    <tr><td>Specified strength f′<sub>c</sub></td><td>3,000 psi</td></tr>
    <tr><td>Required average strength f′<sub>cr</sub></td><td>4,200 psi</td></tr>
    <tr><td>Slump</td><td>3–4 in.</td></tr>
    <tr><td>NMAS</td><td>1 in.</td></tr>
    <tr><td>Air content</td><td>1.5%, entrapped</td></tr>
    <tr><td>w/cm</td><td>0.55</td></tr>
  </tbody>
</table>
</div>
<div class="callout callout-warn"><span class="label">Watch out</span>
  <p>These proportions are on an SSD basis. Before anyone batches in the field, apply the real moisture corrections — that is step 9.</p>
</div>

<h2 id="moisture"><span class="num">8</span>Step 9 — Moisture adjustment</h2>
<p class="method">Method: <a href="../#step-8-10">Part 1, step 9</a></p>
<p>Say the coarse-aggregate stockpile is wet: total moisture content MC = 2.0 percent, against an absorption A = 0.5 percent. The free moisture is the difference:</p>
<div class="eq">free moisture = 2.0% − 0.5% = 1.5%</div>
<p>On 1,872 lb SSD (about 1,863 lb oven-dry), that is roughly 28 lb of free water riding in on the stones. Two corrections follow:</p>
<div class="eq">batch coarse aggregate = 1,872 × <span class="frac"><span>1 + 0.020</span><span>1 + 0.005</span></span> ≈ <strong>1,900 lb</strong></div>
<div class="eq">batch water = 299 − 28 = <strong>271 lb</strong> (coarse aggregate only)</div>
<p>Then repeat the same two lines for the sand with its own moisture content and its 0.7 percent absorption, and subtract its free water too. Try it: if the sand is at MC = 5.0 percent, how much water is left to add at the mixer?</p>
<p class="ref-note">Answer: about 55 lb of free water from the sand, so about 216 lb of batch water and about 1,347 lb of wet sand.</p>

<h2 id="trial"><span class="num">9</span>Step 10 — Trial batch</h2>
<p class="method">Method: <a href="../#step-8-10">Part 1, step 10</a></p>
<p>Batch the corrected weights and measure what the paper assumed:</p>
<ul>
  <li><strong>Slump</strong> (ASTM C143) — is it 3–4 in.? If not, adjust the water or the water-reducer dose, not the w/cm.</li>
  <li><strong>Air content</strong> — near 1.5 percent for this non-air-entrained mix.</li>
  <li><strong>Unit weight</strong> — close to the theoretical 148 lb/ft³. A big gap means the volumes or the moisture corrections are off.</li>
  <li><strong>Strength</strong> — cylinders at 28 days (ASTM C39), expecting an average near 4,200 psi.</li>
</ul>
<p>Refine, batch again, and only then call the mix done. Paper is a starting point, not the final mix.</p>

<div class="cta-lab">
  <div>
    <h3>Try it in the Mix Design Lab</h3>
    <p>Proportion a mix with the same tables, then put it through virtual slump and strength tests.</p>
  </div>
  <a class="btn btn-primary" href="../../../labs/mix-design/">Open the lab →</a>
</div>

<nav class="article-nav">
  <a class="prev" href="../"><span class="dir">← Previous</span><span class="ttl">Part 1: How to design a concrete mix</span></a>
  <a class="next" href="../../"><span class="dir">Study →</span><span class="ttl">All study materials</span></a>
</nav>

</article>
</main>

<footer class="site-footer">
  <span>© <span id="year"></span> Jisoo Park. All rights reserved.</span>
  <a href="../../../">← Home</a>
</footer>
<script src="../../article.js"></script>
</body>
</html>
```

- [ ] **Step 4: 읽는 시간 계산·기입** — Task 3 Step 4의 PowerShell 명령에서 파일 경로만 `site/study/mix-design/example/index.html`로 바꿔 실행하고, `.byline`의 "6 min read"를 결과에 맞춘다.

- [ ] **Step 5: 테스트 실행**

Run: `node --test tools/site-guards.test.mjs tools/study-tables.test.mjs`
Expected: 모두 PASS(`tests 7`, `fail 0`).

- [ ] **Step 6: 커밋**

```bash
git add site/study/mix-design/example/index.html tools/site-guards.test.mjs
git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 글 Part 2 — Worked example: a 3,000 psi beam + 내부 링크 가드

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 5: 레지스트리 연결·README

**Files:**
- Modify: `site/shared/registry.js` (`const MATERIALS = [];` 교체)
- Modify: `tools/registry.test.mjs` (page href 존재 테스트)
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 3·4의 페이지 파일.
- Produces: `SITE.MATERIALS` 항목 2개 — Study 목록이 자동으로 두 행을 그린다(`study/index.html` 무변경).

- [ ] **Step 1: 레지스트리 테스트 추가(실패 확인용)** — `tools/registry.test.mjs`의 import 아래에 다음을 추가:

```js
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const STUDY_DIR = join(dirname(fileURLToPath(import.meta.url)), '../site/study');
```

파일 끝에 추가:

```js
test('MATERIALS: 믹스 디자인 2편이 등록돼 있고 page href 가 실제 파일을 가리킨다', () => {
  const pages = S.MATERIALS.filter(m => m.type === 'page');
  assert.deepEqual(pages.map(m => m.id), ['mix-design-1', 'mix-design-2']);
  for (const m of pages) {
    assert.equal(m.group, 'materials');
    assert.ok(m.href.endsWith('/'), `${m.id} href ends with /`);
    assert.ok(existsSync(join(STUDY_DIR, m.href, 'index.html')), `${m.id} → ${m.href}index.html`);
  }
});
```

- [ ] **Step 2: 테스트 실행 — MATERIALS 가 비어 실패**

Run: `node --test tools/registry.test.mjs`
Expected: 새 테스트 FAIL(`deepEqual [] ≠ ['mix-design-1', 'mix-design-2']`), 기존 5개 PASS.

- [ ] **Step 3: `site/shared/registry.js` 수정** — `const MATERIALS = [];` 줄을 다음으로 교체(주석 줄은 유지):

```js
  const MATERIALS = [
    { id: 'mix-design-1', group: 'materials', type: 'page', title: 'How to design a concrete mix',
      desc: 'Concrete mix design, part 1 — the ten-step ACI workflow, from slump to trial batch, with the tables you need.',
      href: 'mix-design/' },
    { id: 'mix-design-2', group: 'materials', type: 'page', title: 'Worked example: a 3,000 psi beam',
      desc: 'Concrete mix design, part 2 — every step of one mix, from 325 lb of water to a checked 1 yd³ batch.',
      href: 'mix-design/example/' },
  ];
```

- [ ] **Step 4: 전체 테스트 실행**

Run: `node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs tools/study-tables.test.mjs tools/site-guards.test.mjs`
Expected: `fail 0` (기존 29 + 신규 1 + 3 + 4 = 37).

- [ ] **Step 5: README 수정**

"## Structure" 목록에서 `site/shared/theme.css` 줄 다음에 추가:

```markdown
- `site/study/article.css`, `site/study/article.js` — shared layout for study articles (hero, sticky contents, callouts, equations, tables)
- `site/study/mix-design/` — *Concrete mix design*, part 1 (method) and part 2 (worked example); photos in `img/`, prepared by `tools/prep-study-images.py`
```

"**Add study material:**" 줄을 다음으로 교체:

```markdown
**Add study material:** add one entry to `MATERIALS` (`type` = `pdf` | `link` | `page`, `group` = `materials` or `surveying`). For a `page`, create `site/study/<id>/index.html` from `site/study/mix-design/index.html` as the template (link `article.css` and `article.js`, keep the contents `<nav class="toc">` in sync with the `h2` ids) and set `href` to `<id>/`.
```

"## Test" 블록의 명령을 다음으로 교체:

```sh
node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs tools/study-tables.test.mjs tools/site-guards.test.mjs
```

- [ ] **Step 6: 커밋**

```bash
git add site/shared/registry.js tools/registry.test.mjs README.md
git -c core.quotepath=false commit -F - <<'EOF'
feat: Study 레지스트리에 믹스 디자인 2편 등록 + README(글 템플릿·테스트 명령)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 6: 화면 검증(캡처·링크·목차)

**Files:**
- Create (스크래치패드, 커밋 안 함): `<scratch>/verify-study/mobile.html`, `<scratch>/verify-study/links.mjs`, `<scratch>/verify-study/toc-steps.json`, 캡처 PNG들
- 사용: 기존 `<scratch>/verify/cdp-shot.mjs`(헤드리스 Edge CDP 드라이버: `node cdp-shot.mjs <url> <steps.json>`, steps = `[{eval, wait, shot}]`, 1440×900)

`<scratch>` = `D:\Codex\Temp\claude\D--Projects-Test\d64fe480-de3e-4585-8fe0-f5b32b07ce45\scratchpad` (디스패치에서 다시 전달).

**Interfaces:**
- Consumes: Task 1–5 결과 전체. devserver `python tools/devserver.py <port> site`.
- Produces: 검증 보고(캡처 파일 목록 + 링크 검사 결과 + 목차 활성 결과). 코드 변경이 필요하면 고치고 커밋한다.

- [ ] **Step 1: devserver 기동(백그라운드, 포트 8127)**

Run (PowerShell): `Start-Process -FilePath python -ArgumentList 'tools/devserver.py','8127','site' -WorkingDirectory (Get-Location) -WindowStyle Hidden; Start-Sleep 2; (Invoke-WebRequest http://localhost:8127/study/mix-design/ -UseBasicParsing).StatusCode`
Expected: `200`.

- [ ] **Step 2: 링크·리소스 요청 검사** — `<scratch>/verify-study/links.mjs`:

```js
// links.mjs — 두 글 페이지의 내부 href/src 를 devserver 에 실제 요청해 전부 200 인지 확인
const BASE = 'http://localhost:8127';
const PAGES = ['/study/mix-design/', '/study/mix-design/example/', '/study/'];
let bad = 0, n = 0;
for (const page of PAGES) {
  const html = await (await fetch(BASE + page)).text();
  const refs = [...html.matchAll(/\b(?:href|src)="([^"#][^"]*)"/g)].map(m => m[1]).filter(u => !/^https?:/.test(u));
  for (const u of new Set(refs)) {
    const url = new URL(u.split('#')[0], BASE + page).href;
    const r = await fetch(url, { method: 'GET' });
    n++;
    if (r.status !== 200) { bad++; console.log('BROKEN', r.status, page, '→', u); }
  }
}
console.log(`${n} refs checked, ${bad} broken`);
process.exit(bad ? 1 : 0);
```

Run: `node <scratch>/verify-study/links.mjs`
Expected: `… refs checked, 0 broken`.

- [ ] **Step 3: 데스크톱 캡처(1440×900 + 긴 페이지)**

Run (PowerShell, 각각 별도 실행):
`& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless=new --hide-scrollbars --window-size=1440,900 --screenshot="<scratch>\verify-study\p1-1440-top.png" http://localhost:8127/study/mix-design/`
`& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless=new --hide-scrollbars --window-size=1440,5200 --screenshot="<scratch>\verify-study\p1-1440-full.png" http://localhost:8127/study/mix-design/`
`… --window-size=1440,900 --screenshot="…\p2-1440-top.png" http://localhost:8127/study/mix-design/example/`
`… --window-size=1440,4200 --screenshot="…\p2-1440-full.png" http://localhost:8127/study/mix-design/example/`
`… --window-size=1440,900 --screenshot="…\study-1440.png" http://localhost:8127/study/`
Expected: PNG 5개. Read 도구로 열어 확인: 히어로(Royal 띠·제목·바이라인), 목차가 왼쪽에, 본문 720px, 사진·SVG·표·상자가 스펙 §3.2대로 보이고 글자가 잘리지 않음. Study 목록에 "Page" 배지 행 2개(제목 "How to design a concrete mix", "Worked example: a 3,000 psi beam").

- [ ] **Step 4: 모바일 캡처(390px iframe 래퍼)** — `<scratch>/verify-study/mobile.html`:

```html
<!doctype html><meta charset="utf-8">
<body style="margin:0;background:#888">
<iframe src="http://localhost:8127/study/mix-design/" style="width:390px;height:3800px;border:0;display:block"></iframe>
</body>
```

Run: `& '<edge>' --headless=new --hide-scrollbars --window-size=390,3800 --screenshot="<scratch>\verify-study\p1-390.png" file:///<scratch 경로를 슬래시로>/verify-study/mobile.html`
그리고 `src`를 `/study/mix-design/example/`로 바꾼 사본 `mobile2.html`로 `p2-390.png`.
Expected: 1열 레이아웃, 목차가 본문 위, 표가 `.table-wrap` 안에서 잘림(가로 스크롤 영역), 페이지 자체는 390px을 넘지 않음(회색 여백이 안 보임), 히어로 제목 44px.

- [ ] **Step 5: CDP — 목차 활성·가로 스크롤 없음·표 스크롤** — `<scratch>/verify-study/toc-steps.json`:

```json
[
  { "eval": "document.getElementById('step-7').scrollIntoView(); await new Promise(r=>setTimeout(r,300)); return document.querySelector('.toc a.is-active').getAttribute('href');", "wait": 200, "shot": "<scratch>/verify-study/p1-toc-step7.png" },
  { "eval": "document.getElementById('why').scrollIntoView(); window.scrollBy(0,-200); await new Promise(r=>setTimeout(r,300)); return document.querySelector('.toc a.is-active').getAttribute('href');" },
  { "eval": "return [document.documentElement.scrollWidth, document.documentElement.clientWidth];" }
]
```

Run: `node <scratch>/verify/cdp-shot.mjs http://localhost:8127/study/mix-design/ <scratch>/verify-study/toc-steps.json`
Expected: 첫 eval `"#step-7"`, 둘째 `"#why"`, 셋째 두 값이 같음(가로 스크롤 없음). 캡처에서 목차의 "11. Step 7 — Fine aggregate"가 Dark + Royal 선으로 강조.

모바일 표 스크롤: `mobile.html`에 대해 steps `[{ "eval": "const f=document.querySelector('iframe').contentDocument; const w=f.querySelector('#tbl-water').closest('.table-wrap'); return [w.scrollWidth>w.clientWidth, f.documentElement.scrollWidth===f.documentElement.clientWidth];" }]`
Run: `node <scratch>/verify/cdp-shot.mjs file:///<scratch>/verify-study/mobile.html <scratch>/verify-study/mobile-steps.json`
Expected: `[true, true]`.

- [ ] **Step 6: devserver 종료·보고**

Run (PowerShell): `Get-Process python | Where-Object { $_.CommandLine -like '*devserver.py 8127*' } | Stop-Process` (또는 `Get-CimInstance Win32_Process -Filter "name='python.exe'" | Where-Object CommandLine -like '*8127*' | ForEach-Object { Stop-Process -Id $_.ProcessId }`)
보고서(`<scratch>/verify-study/report.md`)에 캡처 파일 목록, 링크 검사 출력, CDP eval 결과, 발견한 문제와 수정 커밋을 적는다. 문제를 고쳤다면 Task 5의 전체 테스트 명령을 다시 돌려 `fail 0`을 확인하고 커밋한다.

---

## Self-review

- 스펙 커버리지: §2.1 파일 전부(Task 1–5), §2.2 레지스트리(Task 5), §2.3 연결(Task 3·4 마크업 + 가드 테스트), §3 스타일(Task 1), §4 내용(Task 3·4 전문), §5 사진(Task 2), §6 표 마크업(Task 3), §7 테스트(Task 1·2·3·4·5), §8 검증(Task 6), §9 README(Task 5).
- 자리표시자 없음: 모든 코드·HTML 전문 수록. 읽는 시간만 실행 결과로 채운다(명령 제시).
- 이름 일관성: 클래스(`.article-hero .toc .article .callout-* .fig-small .fig-svg .eq .frac .table-wrap .ref-table--text .steps .see-also .method .article-nav .cta-lab`)와 id(`why … takeaways`, `problem … trial`, `tbl-*`)가 CSS·HTML·테스트·링크에서 동일. 테스트 파일명·명령이 README와 동일.
