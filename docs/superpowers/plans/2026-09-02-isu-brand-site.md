# ISU 브랜드 사이트 재설계(v4) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construction Study Lab을 "홈(제목 + Lab/Study 메뉴) → labs/ · study/ 섹션 페이지 → 모듈" 구조로 재편하고, ISU 브랜드 토큰(팔레트·서체)으로 허브·섹션·모듈을 통일한다.

**Architecture:** 정적 멀티페이지. `site/shared/theme.css`가 토큰·공통 컴포넌트를 담고 모든 페이지가 로드한다. `site/shared/registry.js`(클래식 스크립트, `window.SITE`)가 그룹·랩·자료 데이터를 담고 Lab/Study 페이지가 DOM을 렌더한다. 홈은 정적 HTML. Mix Design Lab 모듈은 토큰으로 자동 재스킨되고 하드코딩 색·서체 6곳만 보정한다.

**Tech Stack:** 바닐라 HTML/CSS/JS, Google Fonts(Barlow Condensed · Hepta Slab · Red Hat Mono), node:test, 헤드리스 Edge/브라우저 페인 스크린샷, Netlify.

**Spec:** `docs/superpowers/specs/2026-09-02-isu-brand-site-design.md` (필수 참조). **시각 정본:** `docs/design/mockups/*.html` + `home-reference.png` / `sections-reference.png` — 구현 수치는 목업에서 그대로 옮긴다.

## Global Constraints

- 토큰 값은 스펙 §2 그대로(아래 Task 1 코드에 전부 포함). 흰/Icy 배경 위 텍스트는 `--text`·`--muted`·`--faint`·`--royal`·의미색만. Royal 배경 위 Vintage 텍스트 금지.
- Google Fonts 링크(모든 페이지 동일, 이 한 줄만):
  `<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&family=Hepta+Slab:wght@400;600;700&family=Red+Hat+Mono:wght@500;600&display=swap" rel="stylesheet">`
- 저작권 문구(모든 페이지 푸터, 연도는 JS `new Date().getFullYear()`): `© {연도} Thompson Thrift Department of Construction Management, Indiana State University. All rights reserved.`
- `CNST-111` 문자열은 `site/`·`README.md` 어디에도 남기지 않는다. 로고·Sycamore Leaf·`[IN]`·투사 효과·대괄호 장식·이모지(허브·섹션·모듈 앱바) 사용 금지.
- theme.css의 **기존 클래스명·토큰명은 삭제하지 않는다**(모듈 마크업 계약). 삭제 허용: `.logo .mark` 규칙 1개.
- 엔진·판정·타임라인 무변경. 모든 태스크의 게이트: `node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs` 전부 PASS(파일이 아직 없으면 있는 것만).
- 검증은 실제 렌더 캡처로 한다(사용자 상시 지시). 1순위: 데스크톱 앱 브라우저 페인(`preview_start {name:"mixlab"}` → 스크린샷). 대체: 헤드리스 Edge — 데스크톱 `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --hide-scrollbars --window-size=1440,900 --virtual-time-budget=6000 --screenshot=<png> <url>`; 모바일은 창 최소폭 492px 클램프 때문에 **iframe 래퍼**(아래 Task 3 Step 6)로 찍는다. 캡처는 `.superpowers/shots/`에 저장하고 Read로 열어 목업 PNG와 대조한다.
- 커밋: conventional commits, 본문 끝에 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- dev 서버: `python tools/devserver.py 8123 site` (또는 launch.json `mixlab`). `http://localhost:8123/`.

## 파일 구조

```
site/shared/theme.css            # 전면 재작성 — 토큰 + 공통 컴포넌트 + 섹션 페이지 컴포넌트 (Task 1)
tools/contrast-check.test.mjs    # 신규 — theme.css 토큰 대비 게이트 (Task 1)
site/shared/registry.js          # 신규 — window.SITE 레지스트리 + scoreToGrade/bestGrade (Task 2)
tools/registry.test.mjs          # 신규 (Task 2)
site/index.html                  # 전면 재작성 — 홈 (Task 3)
site/labs/index.html             # 신규 — Lab 섹션 페이지 (Task 4)
site/study/index.html            # 신규 — Study 섹션 페이지 (Task 5)
site/labs/mix-design/index.html  # 보정 6곳 (Task 6)
site/labs/mix-design/scene3d.js  # 1줄 (Task 6)
README.md                        # 갱신 (Task 7)
```

---

### Task 1: 디자인 토큰 + 공통 컴포넌트(theme.css) + 대비 게이트

**Files:**
- Create: `tools/contrast-check.test.mjs`
- Modify: `site/shared/theme.css` (전면 재작성)

**Interfaces:**
- Produces: CSS 토큰 `--bg --surface --surface2 --border --text --muted --faint --primary --primary-600 --primary-50 --dark --royal --vintage --neon --icy --green --green-50 --amber --amber-50 --red --red-50 --radius --radius-sm --shadow --shadow-hover --font --font-head --font-mono`; 클래스 `.appbar .appbar-inner .appbar-inner--wide .logo .logo a .appbar-nav .band-dark .band-royal .section-head .section-main .group .group-head .eyebrow .ledger-row(.is-active .is-soon) .site-footer .section-page` + 기존 클래스 전부.

- [ ] **Step 1: 대비 테스트 작성(실패 확인용)**

`tools/contrast-check.test.mjs`:

```js
// tools/contrast-check.test.mjs — theme.css 토큰 대비(WCAG AA) 게이트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../site/shared/theme.css'), 'utf8');
const root = css.match(/:root\s*\{([\s\S]*?)\}/)[1];
const tokens = Object.fromEntries([...root.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));

function lum(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) { const [x, y] = [lum(a), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
const T = name => { assert.ok(tokens[name], `token ${name} missing`); return tokens[name]; };
const AA = (fg, bg, label) => assert.ok(ratio(fg, bg) >= 4.5, `${label}: ${ratio(fg, bg).toFixed(2)} < 4.5`);

test('토큰 존재: ISU 팔레트', () => {
  for (const n of ['--dark', '--royal', '--vintage', '--neon', '--icy', '--font-head', '--font-mono']) T(n);
  assert.equal(T('--dark'), '#003665'); assert.equal(T('--royal'), '#0053a5');
  assert.equal(T('--radius'), '2px');
});

test('텍스트 × 밝은 배경 ≥ 4.5', () => {
  for (const fg of ['--text', '--muted', '--faint', '--primary', '--green', '--amber', '--red'])
    for (const bg of ['--bg', '--surface', '--surface2']) AA(T(fg), T(bg), `${fg} on ${bg}`);
});

test('배지 의미색 × 틴트 ≥ 4.5', () => {
  AA(T('--green'), T('--green-50'), 'green badge');
  AA(T('--amber'), T('--amber-50'), 'amber badge');
  AA(T('--red'), T('--red-50'), 'red badge');
  AA(T('--primary-600'), T('--primary-50'), 'blue badge');
});

test('밝은 텍스트 × Dark/Royal ≥ 4.5', () => {
  for (const fg of ['#ffffff', '--icy', '--neon'])
    for (const bg of ['--dark', '--royal']) AA(fg.startsWith('#') ? fg : T(fg), T(bg), `${fg} on ${bg}`);
  AA(T('--vintage'), T('--dark'), 'vintage on dark');
});

test('UTM 판독 패널(#12151b) 위 텍스트 ≥ 4.5', () => {
  for (const c of ['#7d8797', '#98a1b0', '#5ee88a', '#ffb454']) AA(c, '#12151b', `${c} on utm panel`);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tools/contrast-check.test.mjs`
Expected: FAIL — `token --dark missing` (구 토큰에는 ISU 팔레트가 없음).

- [ ] **Step 3: theme.css 전면 재작성**

`site/shared/theme.css` 전체를 다음으로 교체:

```css
/* ============================================================
   Construction Study Lab — 공유 디자인 시스템 (theme.css) v4
   근거: ISU Brand Guidelines (Feb 2026) 팔레트·서체. 로고·잎·[IN] 미사용.
   원칙: 기존 클래스명·토큰명은 유지한다(모듈 마크업 계약). 홈·섹션 페이지·
   모든 랩 모듈이 <link rel="stylesheet" href=".../shared/theme.css"> 로 공유한다.
   ============================================================ */

*, *::before, *::after { box-sizing: border-box; }
:root {
  --bg:#ffffff; --surface:#f2f9fe; --surface2:#d9f3fd; --border:#b9dff2;
  --text:#003665; --muted:#2b5f8f; --faint:#3b6894;
  --primary:#0053a5; --primary-600:#003665; --primary-50:#d9f3fd;
  --dark:#003665; --royal:#0053a5; --vintage:#66cef6; --neon:#b8f5ff; --icy:#d9f3fd;
  --green:#0b6b4a; --green-50:#e9f7f1; --amber:#9a4508; --amber-50:#fdf3e3;
  --red:#b42318; --red-50:#fdecea;
  --radius:2px; --radius-sm:2px;
  --shadow:none; --shadow-hover:0 6px 18px rgba(0,54,101,.14);
  --font:'Hepta Slab',Georgia,'Times New Roman',serif;
  --font-head:'Barlow Condensed','Arial Narrow',Impact,sans-serif;
  --font-mono:'Red Hat Mono','Courier New',monospace;
}
html, body { margin:0; padding:0; background:var(--surface); color:var(--text);
  font-family:var(--font); font-size:15px; line-height:1.55; }
button { font-family:var(--font); }
a { color:var(--primary); }
:focus-visible { outline:3px solid var(--royal); outline-offset:2px; }

/* 앱바 */
.appbar { position:sticky; top:0; z-index:20; background:var(--bg);
  border-bottom:2px solid var(--border); }
.appbar-inner { max-width:1100px; margin:0 auto; height:64px; padding:0 24px;
  display:flex; align-items:center; justify-content:space-between; }
.appbar-inner--wide { max-width:none; padding:0 40px; }
.logo { font-family:var(--font-head); font-weight:800; font-size:22px; letter-spacing:.02em;
  text-transform:uppercase; color:var(--dark); display:flex; gap:14px; align-items:center; }
.logo a { font:600 13px/1 var(--font); text-transform:none; letter-spacing:0;
  color:var(--muted); text-decoration:none; }
.logo a:hover { color:var(--dark); }
.appbar-nav { display:flex; gap:28px; }
.appbar-nav a { font:600 13px/1 var(--font); color:var(--muted); text-decoration:none;
  padding-bottom:4px; border-bottom:2px solid transparent; }
.appbar-nav a:hover { color:var(--dark); }
.appbar-nav a.is-active { color:var(--dark); border-bottom-color:var(--royal); }

/* 레이아웃 */
main { max-width:1100px; margin:0 auto; padding:32px 24px 80px; }
.card { background:var(--bg); border:1px solid var(--border); border-radius:var(--radius);
  box-shadow:var(--shadow); padding:24px; }
a.card { text-decoration:none; color:inherit; }
h1 { font-family:var(--font-head); font-size:34px; font-weight:800; line-height:.95;
  letter-spacing:.01em; text-transform:uppercase; margin:0 0 8px; }
h2 { font-size:20px; font-weight:700; letter-spacing:0; margin:0 0 4px; }
h3 { font-size:22px; font-weight:700; margin:0; }
.sub { color:var(--muted); margin:0 0 20px; }

/* 버튼 */
.btn { border:1px solid var(--border); background:var(--bg); color:var(--text);
  border-radius:var(--radius-sm); padding:10px 18px; font-size:14px; font-weight:700;
  font-family:var(--font); cursor:pointer; transition:background .15s, border-color .15s; }
.btn:hover { background:var(--surface); }
.btn-primary { background:var(--primary); border-color:var(--primary); color:#fff; }
.btn-primary:hover { background:var(--primary-600); border-color:var(--primary-600); }
.btn-primary:disabled { background:#9cc3e6; border-color:#9cc3e6; cursor:not-allowed; }
.btn-ghost { border-color:transparent; background:transparent; color:var(--muted); }

/* 배지 */
.badge { display:inline-flex; align-items:center; gap:5px; border-radius:var(--radius-sm);
  font:600 11.5px/1 var(--font-mono); letter-spacing:.04em; text-transform:uppercase; padding:5px 8px; }
.badge-blue { background:var(--primary-50); color:var(--primary-600); }
.badge-green { background:var(--green-50); color:var(--green); }
.badge-amber { background:var(--amber-50); color:var(--amber); }
.badge-red { background:var(--red-50); color:var(--red); }

/* 미션 카드 그리드 (모듈 미션 선택 화면) */
.mission-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(300px,1fr)); gap:16px; }
.mission-card { display:flex; flex-direction:column; gap:10px; cursor:pointer;
  transition:transform .15s, box-shadow .15s; }
.mission-card:hover { transform:translateY(-2px); box-shadow:var(--shadow-hover); }
.mission-card .icon { font-size:30px; }
.mission-card .meta { display:flex; flex-wrap:wrap; gap:6px; }
.mission-card .desc { color:var(--muted); font-size:13.5px; flex:1; }

/* 스텝퍼 */
.stepper { display:flex; align-items:flex-start; margin:26px 0 22px; }
.step { flex:1; text-align:center; position:relative; }
.step .dot { width:26px; height:26px; border-radius:var(--radius-sm); margin:0 auto 6px;
  display:flex; align-items:center; justify-content:center; font:700 12px/1 var(--font-mono);
  background:var(--surface2); color:var(--faint); border:2px solid var(--border); }
.step.done .dot { background:var(--primary); border-color:var(--primary); color:#fff; }
.step.current .dot { background:var(--bg); border-color:var(--primary); color:var(--primary); }
.step .lbl { font:600 11px/1.3 var(--font-mono); text-transform:uppercase; letter-spacing:.03em;
  color:var(--faint); overflow-wrap:anywhere; padding:0 2px; }
.step.current .lbl { color:var(--primary); }
.step.done .lbl { color:var(--muted); }
.step:not(:first-child)::before { content:''; position:absolute; top:12px; right:50%;
  left:-50%; height:2px; background:var(--border); z-index:-1; }
.step.done:not(:first-child)::before, .step.current:not(:first-child)::before { background:var(--primary); }

/* 위저드 2컬럼 */
.wizard-grid { display:grid; grid-template-columns:1fr 380px; gap:20px; align-items:start; }
.ref-panel { position:sticky; top:80px; display:flex; flex-direction:column; gap:14px; }
@media (max-width:900px){ .wizard-grid { grid-template-columns:1fr; } .ref-panel { position:static; } }

/* 위저드 하단 내비 */
.wiz-nav { display:flex; justify-content:space-between; margin-top:22px; }

/* 참고표 */
.ref-table { width:100%; border-collapse:collapse; font:500 12.5px/1.4 var(--font-mono); }
.ref-table caption { caption-side:top; text-align:left; font:700 12px/1.4 var(--font);
  color:var(--muted); text-transform:uppercase; letter-spacing:.04em; padding-bottom:8px; }
.ref-table th { font-size:11px; text-transform:uppercase; letter-spacing:.03em;
  color:var(--muted); font-weight:600; text-align:right; padding:6px 8px;
  border-bottom:1px solid var(--border); }
.ref-table th:first-child, .ref-table td:first-child { text-align:left; }
.ref-table td { padding:6px 8px; text-align:right; font-variant-numeric:tabular-nums;
  border-bottom:1px solid var(--surface2); }
.ref-table tbody tr:nth-child(odd) { background:var(--surface); }
.ref-table tbody tr:hover { background:var(--primary-50); }
.ref-note { font-size:12px; color:var(--faint); margin-top:8px; }

/* 숫자 입력 */
.num-field { margin:14px 0; }
.num-field label { display:block; font-size:13px; font-weight:600; margin-bottom:6px; }
.num-field .wrap { display:flex; align-items:center; border:1px solid var(--border);
  border-radius:var(--radius-sm); overflow:hidden; background:var(--bg); max-width:240px; }
.num-field .wrap:focus-within { border-color:var(--royal); box-shadow:0 0 0 3px var(--surface2); }
.num-field input { border:0; outline:0; padding:10px 12px; font-size:15px; width:100%;
  text-align:right; font-variant-numeric:tabular-nums; font-family:var(--font-mono); }
.num-field .unit { padding:0 12px; color:var(--faint); font:500 12px/1 var(--font-mono); white-space:nowrap;
  background:var(--surface); align-self:stretch; display:flex; align-items:center;
  border-left:1px solid var(--border); }
.num-field .hint { font-size:12.5px; color:var(--faint); margin-top:6px; }

/* 선택 카드 (NMAS 등) */
.choice-row { display:flex; gap:10px; flex-wrap:wrap; }
.choice { border:1.5px solid var(--border); border-radius:var(--radius-sm); background:var(--bg);
  padding:12px 18px; font-weight:600; font-size:14px; font-family:var(--font); cursor:pointer; }
.choice.selected { border-color:var(--royal); background:var(--primary-50); color:var(--dark); }

/* 캔버스 무대 */
.canvas-stage { background:var(--surface2); border:1px solid var(--border); border-radius:var(--radius);
  box-shadow:var(--shadow); display:block; width:100%; height:auto; }
.stage-actions { display:flex; justify-content:center; gap:12px; margin-top:18px; }

/* 결과 */
.score-row { display:grid; grid-template-columns:150px 1fr 90px; gap:14px; align-items:center;
  padding:12px 0; border-bottom:1px solid var(--surface2); }
.score-bar { height:8px; border-radius:var(--radius-sm); background:var(--surface2); overflow:hidden; }
.score-bar > div { height:100%; background:var(--primary); }
.grade-badge { width:92px; height:92px; border-radius:var(--radius-sm); display:flex; align-items:center;
  justify-content:center; font:700 44px/1 var(--font); color:#fff; }

/* ── 섹션 페이지(labs/·study/) 컴포넌트 ─────────────────────────── */
.section-page { min-height:100vh; display:flex; flex-direction:column; }
.band-dark { background:var(--dark); color:#fff; }
.band-royal { background:var(--royal); color:#fff; }
.eyebrow { font:600 12px/1 var(--font-mono); letter-spacing:.12em; text-transform:uppercase; color:var(--royal); }
.band-dark .eyebrow, .band-royal .eyebrow { color:var(--neon); }
.section-head { padding:56px 40px 48px; display:flex; align-items:flex-end;
  justify-content:space-between; gap:40px; }
.section-head h1 { font:800 96px/.9 var(--font-head); text-transform:uppercase; color:#fff; margin:10px 0 0; }
.section-head p { font:400 16px/1.55 var(--font); color:var(--icy); max-width:40ch; margin:0; }
.section-main { padding:40px 40px 64px; display:flex; flex-direction:column; gap:48px; flex-grow:1; }
.group-head { display:flex; align-items:baseline; justify-content:space-between; gap:24px; padding-bottom:14px; }
.group-head h2 { font:700 28px/1.1 var(--font); margin:0; }
.group-head p { font:400 15px/1.5 var(--font); color:var(--muted); margin:0; }
.ledger-row { --ledger-cols:64px 1fr 240px 140px;
  display:grid; grid-template-columns:var(--ledger-cols); gap:24px; align-items:center;
  padding:24px 0; border-top:1px solid var(--border); }
.ledger-row:last-child { border-bottom:1px solid var(--border); }
.ledger-row .num { font:800 36px/1 var(--font-head); color:var(--royal); }
.ledger-row .title { font:700 22px/1.2 var(--font); margin:0; }
.ledger-row .desc { font:400 14px/1.5 var(--font); color:var(--muted); margin:6px 0 0; }
.ledger-row .meta { font:500 12px/1.5 var(--font-mono); color:var(--muted); }
.ledger-row .type { font:600 11.5px/1 var(--font-mono); letter-spacing:.06em; text-transform:uppercase;
  color:var(--dark); background:var(--icy); padding:6px 8px; border-radius:var(--radius-sm); text-align:center; }
.ledger-row .btn { text-align:center; text-decoration:none; display:block; }
.ledger-row.is-active { background:var(--bg); border:1px solid var(--border); border-radius:var(--radius); padding:24px; }
.ledger-row.is-soon .num { color:var(--border); }
.ledger-row.is-soon .title, .ledger-row.is-soon .meta, .ledger-row.is-soon .desc { color:var(--faint); }
.ledger-row.is-soon .type { color:var(--faint); background:transparent; border:1px dashed var(--faint); }
.ledger-row .soon { font:500 12px/1 var(--font-mono); letter-spacing:.08em; text-transform:uppercase;
  color:var(--faint); text-align:center; }
.site-footer { background:var(--dark); color:var(--icy); font:500 11.5px/1.5 var(--font-mono);
  padding:16px 40px; display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.site-footer a { color:var(--icy); text-decoration:none; letter-spacing:.08em; text-transform:uppercase; }
.site-footer a:hover { color:#fff; }

@media (max-width:700px) {
  .appbar-inner, .appbar-inner--wide { height:56px; padding:0 20px; }
  .logo { font-size:18px; gap:10px; }
  .appbar-nav { gap:16px; }
  .section-head { padding:32px 20px 28px; flex-direction:column; align-items:flex-start; gap:10px; }
  .section-head h1 { font-size:72px; }
  .section-head p { font-size:14.5px; max-width:none; }
  .section-main { padding:28px 20px 40px; gap:32px; }
  .group-head { flex-direction:column; align-items:flex-start; gap:4px; padding-bottom:10px; }
  .group-head h2 { font-size:22px; }
  .group-head p { font-size:13.5px; }
  .ledger-row { --ledger-cols:44px 1fr; gap:14px; padding:18px 0; }
  .ledger-row .num { font-size:30px; }
  .ledger-row .title { font-size:18px; }
  .ledger-row .desc { font-size:13.5px; }
  .ledger-row .meta, .ledger-row .btn, .ledger-row .soon { grid-column:2; text-align:left; }
  .ledger-row .btn { text-align:center; }
  .ledger-row.is-active { padding:18px; }
  .site-footer { padding:14px 20px; font-size:10.5px; }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test engine.test.mjs tools/contrast-check.test.mjs`
Expected: 엔진 19 pass + contrast 5 pass, fail 0. (`--faint` on `--surface2`가 4.5 미만이면 `--faint:#2f5f8c`로 바꾸고 재실행.)

- [ ] **Step 5: 커밋**

```bash
git add site/shared/theme.css tools/contrast-check.test.mjs
git commit -m "feat(theme): ISU 브랜드 토큰·컴포넌트 재정의 + 대비 게이트 테스트

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: 사이트 레지스트리 `site/shared/registry.js`

**Files:**
- Create: `site/shared/registry.js`, `tools/registry.test.mjs`

**Interfaces:**
- Produces: `window.SITE = { LAB_GROUPS, LABS, STUDY_GROUPS, MATERIALS, scoreToGrade(score), bestGrade(key) }` (CJS `module.exports`도 동일 객체). `LABS[i]`: `{ id, group, name, href, desc, meta, bestKey, active }`(비활성은 `{ id, group, active:false }`). `MATERIALS[i]`: `{ id, group, type:'pdf'|'link'|'page', title, desc, href }`.

- [ ] **Step 1: 테스트 작성**

`tools/registry.test.mjs`:

```js
// tools/registry.test.mjs — site/shared/registry.js 계약 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../site/shared/registry.js');

test('그룹 2개 + 랩의 group이 전부 유효', () => {
  assert.deepEqual(S.LAB_GROUPS.map(g => g.id), ['material', 'survey']);
  assert.deepEqual(S.STUDY_GROUPS.map(g => g.id), ['materials', 'surveying']);
  const ids = new Set(S.LAB_GROUPS.map(g => g.id));
  for (const lab of S.LABS) assert.ok(ids.has(lab.group), `${lab.id} group`);
  for (const g of [...S.LAB_GROUPS, ...S.STUDY_GROUPS]) { assert.ok(g.name); assert.ok(g.blurb); }
});

test('Mix Design Lab 항목', () => {
  const mix = S.LABS.find(l => l.id === 'mix-design');
  assert.equal(mix.group, 'material');
  assert.equal(mix.href, 'mix-design/');
  assert.equal(mix.bestKey, 'mixlab-best');
  assert.equal(mix.active, true);
  assert.match(mix.meta, /ACI PRC-211\.1-22/);
});

test('scoreToGrade 경계값', () => {
  assert.equal(S.scoreToGrade(90), 'A'); assert.equal(S.scoreToGrade(89.9), 'B');
  assert.equal(S.scoreToGrade(80), 'B'); assert.equal(S.scoreToGrade(70), 'C');
  assert.equal(S.scoreToGrade(60), 'D'); assert.equal(S.scoreToGrade(59), 'F');
});

test('bestGrade: localStorage 없으면 null, 있으면 최고 점수 등급', () => {
  assert.equal(S.bestGrade('mixlab-best'), null);
  globalThis.localStorage = { getItem: k => (k === 'mixlab-best' ? JSON.stringify({ slab: 72, wall: 91 }) : null) };
  assert.equal(S.bestGrade('mixlab-best'), 'A');
  globalThis.localStorage = { getItem: () => '{}' };
  assert.equal(S.bestGrade('mixlab-best'), null);
  delete globalThis.localStorage;
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tools/registry.test.mjs`
Expected: FAIL — `Cannot find module '../site/shared/registry.js'`

- [ ] **Step 3: 구현**

`site/shared/registry.js`:

```js
// site/shared/registry.js — 사이트 레지스트리 (홈·Lab·Study 페이지 공용, 클래식 스크립트)
// 새 랩 = 폴더 1개 + LABS 항목 1줄. 새 공부자료 = MATERIALS 항목 1줄.
// href는 각 섹션 페이지(labs/ 또는 study/) 기준 상대경로다.
(function () {
  'use strict';

  const LAB_GROUPS = [
    { id: 'material', name: 'Material Lab', blurb: 'Concrete, aggregates, and the tests that prove them.' },
    { id: 'survey',   name: 'Survey Lab',   blurb: 'Leveling, traversing, and site layout.' },
  ];

  const LABS = [
    { id: 'mix-design', group: 'material', name: 'Mix Design Lab', href: 'mix-design/',
      desc: 'Proportion a concrete mix with the ACI tables, then put it through virtual slump and strength tests.',
      meta: '5 missions · ACI PRC-211.1-22', bestKey: 'mixlab-best', active: true },
    { id: 'material-soon', group: 'material', active: false },
    { id: 'survey-soon',   group: 'survey',   active: false },
  ];

  const STUDY_GROUPS = [
    { id: 'materials', name: 'Materials', blurb: 'Concrete, aggregates, and mix design.' },
    { id: 'surveying', name: 'Surveying', blurb: 'Leveling, traversing, and site layout.' },
  ];

  // { id, group, type:'pdf'|'link'|'page', title, desc, href } — 비어 있으면 페이지가 Coming soon 행을 그린다
  const MATERIALS = [];

  // 점수 → 등급 (Mix Design Lab 채점 등급과 동일한 경계값)
  function scoreToGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  // localStorage[key] = { missionId: score } 중 최고 점수의 등급. 기록·저장소가 없으면 null.
  function bestGrade(key) {
    try {
      if (typeof localStorage === 'undefined') return null;
      const scores = Object.values(JSON.parse(localStorage.getItem(key) || '{}'));
      if (!scores.length) return null;
      return scoreToGrade(Math.max(...scores));
    } catch (e) { return null; }
  }

  const SITE = { LAB_GROUPS, LABS, STUDY_GROUPS, MATERIALS, scoreToGrade, bestGrade };
  if (typeof window !== 'undefined') window.SITE = SITE;
  if (typeof module !== 'undefined' && module.exports) module.exports = SITE;
})();
```

- [ ] **Step 4: 통과 확인**

Run: `node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs`
Expected: 전부 pass, fail 0.

- [ ] **Step 5: 커밋**

```bash
git add site/shared/registry.js tools/registry.test.mjs
git commit -m "feat: 사이트 레지스트리(LAB_GROUPS/LABS/STUDY_GROUPS/MATERIALS) + 테스트

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: 홈 `site/index.html` (한 화면, 제목 + Lab/Study 메뉴)

**Files:**
- Modify: `site/index.html` (전면 재작성)
- Reference: `docs/design/mockups/home-desktop.html`, `home-mobile.html`, `home-reference.png`

**Interfaces:**
- Consumes: theme.css 토큰(Task 1). 레지스트리는 사용하지 않음(정적).
- Produces: 링크 `labs/`, `study/`.

- [ ] **Step 1: 홈 작성**

`site/index.html` 전체를 다음으로 교체(선화 path는 목업 `home-desktop.html`과 동일):

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Construction Study Lab</title>
<meta name="description" content="Hands-on labs for construction materials and surveying, with notes and reference tables to study alongside.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&family=Hepta+Slab:wght@400;600;700&family=Red+Hat+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="shared/theme.css">
<style>
/* ── 홈 전용: 한 화면, 청사진 격자 + 선화 배경 (목업 home-desktop.html 수치) ── */
html, body { background:var(--royal); }
.home { position:relative; min-height:100vh; min-height:100dvh; overflow:hidden; color:#fff;
  display:flex; flex-direction:column;
  background-color:var(--royal);
  background-image:
    linear-gradient(rgba(184,245,255,.10) 1px, transparent 1px),
    linear-gradient(90deg, rgba(184,245,255,.10) 1px, transparent 1px),
    linear-gradient(180deg, #003665 0%, #0053a5 100%);
  background-size:48px 48px, 48px 48px, 100% 100%; }
.home-art { position:absolute; left:0; right:0; bottom:0; width:100%; height:auto; max-height:70%;
  opacity:.32; pointer-events:none; }
.home-art--mobile { display:none; }
.home-top, .home-foot { position:relative; z-index:2; display:flex; align-items:center;
  justify-content:space-between; gap:16px; padding:0 48px; flex-shrink:0;
  font:500 12px/1 var(--font-mono); letter-spacing:.1em; text-transform:uppercase; color:var(--neon); }
.home-top { height:64px; border-bottom:1px solid rgba(184,245,255,.3); }
.home-foot { height:48px; border-top:1px solid rgba(184,245,255,.3); color:var(--icy);
  letter-spacing:0; text-transform:none; font-size:11.5px; }
.home-body { position:relative; z-index:2; flex-grow:1; display:flex; flex-direction:column;
  justify-content:center; gap:36px; padding:24px 48px 40px; }
.home-eyebrow { font:600 13px/1 var(--font-mono); letter-spacing:.14em; text-transform:uppercase; color:var(--neon); }
.home-title { font:800 clamp(72px, 11.6vw, 168px)/.88 var(--font-head); text-transform:uppercase;
  letter-spacing:-.01em; color:#fff; margin:16px 0; }
.home-sub { font:400 18px/1.55 var(--font); color:var(--icy); max-width:44ch; margin:0; }
.home-menu { display:flex; gap:16px; align-items:stretch; flex-wrap:wrap; }
.menu-btn { display:flex; align-items:center; justify-content:space-between; gap:40px; min-width:300px;
  padding:22px 26px; border-radius:var(--radius); text-decoration:none; border:1px solid transparent;
  transition:background .15s; }
.menu-btn strong { display:block; font:800 34px/1 var(--font-head); text-transform:uppercase; letter-spacing:.02em; }
.menu-btn small { display:block; margin-top:6px; font:500 11.5px/1 var(--font-mono); letter-spacing:.08em; text-transform:uppercase; }
.menu-btn .arrow { font:800 34px/1 var(--font-head); }
.menu-btn--lab { background:#fff; color:var(--dark); }
.menu-btn--lab small { color:var(--muted); }
.menu-btn--lab:hover { background:var(--icy); }
.menu-btn--study { background:rgba(0,54,101,.55); color:#fff; border-color:var(--neon); }
.menu-btn--study small, .menu-btn--study .arrow { color:var(--neon); }
.menu-btn--study:hover { background:rgba(0,54,101,.8); }
@media (max-width:700px) {
  .home { background-size:40px 40px, 40px 40px, 100% 100%; }
  .home-art--desktop { display:none; } .home-art--mobile { display:block; max-height:40%; opacity:.3; }
  .home-top { height:52px; padding:0 20px; font-size:10.5px; letter-spacing:.08em; }
  .home-top .domain { display:none; }
  .home-body { padding:16px 20px 24px; gap:28px; }
  .home-eyebrow { font-size:11px; }
  .home-title { font-size:62px; line-height:.9; margin:12px 0; }
  .home-sub { font-size:15px; }
  .home-menu { flex-direction:column; gap:12px; }
  .menu-btn { min-width:0; padding:18px 22px; }
  .menu-btn strong, .menu-btn .arrow { font-size:30px; }
  .home-foot { height:auto; padding:12px 20px 14px; font-size:10px; line-height:1.5; }
}
</style>
</head>
<body>
<div class="home">
  <svg class="home-art home-art--desktop" viewBox="0 0 1440 620" fill="none" stroke="#b8f5ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M0 600 H1440"></path>
    <path d="M780 600 V230 M900 600 V230 M1020 600 V230"></path>
    <path d="M780 230 H1020 M780 322 H1020 M780 414 H1020 M780 506 H1020"></path>
    <path d="M780 322 L900 230 M900 600 L1020 506" stroke-dasharray="6 6"></path>
    <path d="M760 230 H1040" stroke-width="3"></path>
    <path d="M760 600 H1040" stroke-width="4"></path>
    <path d="M1100 600 V90" stroke-width="3"></path>
    <path d="M1140 600 V90" stroke-width="3"></path>
    <path d="M1100 560 L1140 520 M1140 560 L1100 520 M1100 480 L1140 440 M1140 480 L1100 440 M1100 400 L1140 360 M1140 400 L1100 360 M1100 320 L1140 280 M1140 320 L1100 280 M1100 240 L1140 200 M1140 240 L1100 200 M1100 160 L1140 120 M1140 160 L1100 120"></path>
    <path d="M1100 90 H1140 M1080 90 H1160 V60 H1080 Z"></path>
    <path d="M760 90 H1080" stroke-width="3"></path>
    <path d="M760 110 H1080"></path>
    <path d="M780 110 L800 90 M820 110 L840 90 M860 110 L880 90 M900 110 L920 90 M940 110 L960 90 M980 110 L1000 90 M1020 110 L1040 90"></path>
    <path d="M1160 90 H1300 M1160 110 H1300 M1300 90 V125 H1250 V110"></path>
    <path d="M1120 60 V10 M1120 10 L800 90 M1120 10 L1290 90"></path>
    <path d="M870 110 V150 M856 150 H884 M870 150 V172"></path>
    <path d="M870 172 c-14 0 -14 22 0 22 c8 0 12 -6 12 -10"></path>
    <path d="M830 206 H910 V226 H830 Z"></path>
    <path d="M1360 600 L1380 470 L1400 600 M1380 470 L1370 600 M1380 470 V450 M1366 452 H1394"></path>
  </svg>
  <svg class="home-art home-art--mobile" viewBox="0 0 390 300" fill="none" stroke="#b8f5ff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M0 290 H390"></path>
    <path d="M30 290 V110 M90 290 V110 M150 290 V110 M210 290 V110"></path>
    <path d="M30 110 H210 M30 170 H210 M30 230 H210"></path>
    <path d="M30 170 L90 110 M150 290 L210 230" stroke-dasharray="4 4"></path>
    <path d="M300 290 V60 M318 290 V60" stroke-width="2"></path>
    <path d="M300 260 L318 240 M318 260 L300 240 M300 210 L318 190 M318 210 L300 190 M300 160 L318 140 M318 160 L300 140 M300 110 L318 90 M318 110 L300 90"></path>
    <path d="M200 60 H290 M200 72 H290 M330 60 H380 M330 72 H380 M309 60 V30 M309 30 L215 60 M309 30 L375 60"></path>
    <path d="M230 72 V150 M222 150 H238"></path>
  </svg>

  <header class="home-top">
    <span>Thompson Thrift Department of Construction Management</span>
    <span class="domain">cnstlab.org</span>
  </header>

  <main class="home-body">
    <div>
      <p class="home-eyebrow">Interactive labs and study materials</p>
      <h1 class="home-title">Construction<br>Study Lab</h1>
      <p class="home-sub">Build it, test it, prove it — hands-on labs for construction materials and surveying, with notes and reference tables to study alongside.</p>
    </div>
    <nav class="home-menu" aria-label="Sections">
      <a class="menu-btn menu-btn--lab" href="labs/" aria-label="Lab — Material and Survey labs">
        <span><strong>Lab</strong><small>Material · Survey</small></span>
        <span class="arrow" aria-hidden="true">→</span>
      </a>
      <a class="menu-btn menu-btn--study" href="study/" aria-label="Study — notes, tables, and worked examples">
        <span><strong>Study</strong><small>Notes · Tables · Examples</small></span>
        <span class="arrow" aria-hidden="true">→</span>
      </a>
    </nav>
  </main>

  <footer class="home-foot">
    <span>© <span id="year"></span> Thompson Thrift Department of Construction Management, Indiana State University. All rights reserved.</span>
  </footer>
</div>
<script>document.getElementById('year').textContent = new Date().getFullYear();</script>
</body>
</html>
```

- [ ] **Step 2: 정적 검사**

Run: `grep -n -E "CNST-111|Inter|⬢|🔒|🧪|mixlab-best|LABS" site/index.html; echo "exit=$?"`
Expected: 매치 없음(`exit=1`). `grep -c "labs/\|study/" site/index.html` → 2 이상.

- [ ] **Step 3: 데스크톱 캡처(1440×900) — 스크롤 없음 확인**

브라우저 페인: `preview_start {name:"mixlab"}` → `navigate http://localhost:8123/` → `resize_window {width:1440,height:900}` → `javascript_tool`: `({sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight})` → **sh === ch**(스크롤 없음) → `computer screenshot` 저장.
대체(헤드리스): `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --hide-scrollbars --window-size=1440,900 --virtual-time-budget=6000 --screenshot="<abs>\.superpowers\shots\home-1440.png" http://localhost:8123/` 후 `--dump-dom`으로 `document.documentElement.scrollHeight`를 `<title>`에 써넣는 임시 스크립트 없이도, 캡처에 푸터가 하단에 보이면 통과.
Expected: `docs/design/mockups/home-reference.png` 좌측과 동일 구성 — 그라데이션, 격자, 크레인·골조 선화(우측), 제목 2행, 버튼 2개, 푸터 저작권.

- [ ] **Step 4: 모바일 캡처(390)**

브라우저 페인: `resize_window {preset:"mobile"}` → reload → screenshot.
대체(헤드리스, iframe 래퍼): `.superpowers/shots/mobile-frame.html`을 만들고 캡처:

```html
<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888">
<iframe src="http://localhost:8123/" width="390" height="844" style="border:0"></iframe></body>
```

`msedge --headless=new --hide-scrollbars --window-size=390,844 --virtual-time-budget=6000 --screenshot="<abs>\.superpowers\shots\home-390.png" "file:///<abs>/.superpowers/shots/mobile-frame.html"`
Expected: `home-reference.png` 우측과 동일 — 제목 62px 2행이 잘리지 않음, 버튼 세로 2개, 선화 하단.

- [ ] **Step 5: 링크·콘솔**

`read_console_messages` 오류 0. `labs/`·`study/`는 Task 4·5 전이라 404여도 됨(Task 5 끝에서 재확인).

- [ ] **Step 6: 커밋**

```bash
git add site/index.html
git commit -m "feat(home): 한 화면 홈 — 제목 + Lab/Study 메뉴, 청사진 배경

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Lab 섹션 페이지 `site/labs/index.html`

**Files:**
- Create: `site/labs/index.html`
- Reference: `docs/design/mockups/labs-desktop.html`, `labs-mobile.html`, `sections-reference.png`(2행)

**Interfaces:**
- Consumes: `window.SITE.LAB_GROUPS/LABS/bestGrade`(Task 2), theme.css 섹션 컴포넌트(Task 1).
- Produces: 링크 `mix-design/`(모듈), `../`(홈), `../study/`.

- [ ] **Step 1: 페이지 작성**

`site/labs/index.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lab — Construction Study Lab</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&family=Hepta+Slab:wght@400;600;700&family=Red+Hat+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../shared/theme.css">
</head>
<body class="section-page">
<header class="appbar"><div class="appbar-inner appbar-inner--wide">
  <a class="logo" href="../" style="text-decoration:none">Construction Study Lab</a>
  <nav class="appbar-nav" aria-label="Sections">
    <a href="./" class="is-active" aria-current="page">Lab</a>
    <a href="../study/">Study</a>
  </nav>
</div></header>

<section class="band-dark section-head">
  <div>
    <p class="eyebrow" style="margin:0">01 · Interactive labs</p>
    <h1>Lab</h1>
  </div>
  <p>Pick a lab. Each one runs in the browser and grades your work at the end.</p>
</section>

<main id="groups" class="section-main"></main>

<footer class="site-footer">
  <span>© <span id="year"></span> Thompson Thrift Department of Construction Management, Indiana State University. All rights reserved.</span>
  <a href="../">← Home</a>
</footer>

<script src="../shared/registry.js"></script>
<script>
'use strict';
const S = window.SITE;

// ── DOM 빌더 ──────────────────────────────────────────────────────
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(9)) {
    if (c == null) continue;
    el.append(c.nodeType ? c : document.createTextNode(c));
  }
  return el;
}

// ── 행 렌더 ───────────────────────────────────────────────────────
function activeRow(lab, n) {
  const grade = lab.bestKey ? S.bestGrade(lab.bestKey) : null;
  const meta = grade ? `${lab.meta}\nBest grade · ${grade}` : lab.meta;
  return h('div', { class: 'ledger-row is-active' },
    h('div', { class: 'num' }, n),
    h('div', {}, h('h3', { class: 'title' }, lab.name), h('p', { class: 'desc' }, lab.desc)),
    h('div', { class: 'meta', style: 'white-space:pre-line' }, meta),
    h('a', { class: 'btn btn-primary', href: lab.href }, 'Enter →'));
}
function soonRow(n) {
  return h('div', { class: 'ledger-row is-soon' },
    h('div', { class: 'num' }, n),
    h('div', {}, h('h3', { class: 'title' }, 'New lab coming soon')),
    h('div', { class: 'meta' }, '—'),
    h('div', { class: 'soon' }, 'Soon'));
}

// ── 그룹 렌더 (번호는 그룹을 가로질러 01, 02, 03… 연속) ───────────────
function render() {
  const root = document.getElementById('groups');
  root.innerHTML = '';
  let n = 0;
  for (const g of S.LAB_GROUPS) {
    const labs = S.LABS.filter(l => l.group === g.id).sort((a, b) => (b.active === true) - (a.active === true));
    const rows = labs.map(lab => { n += 1; const num = String(n).padStart(2, '0'); return lab.active ? activeRow(lab, num) : soonRow(num); });
    root.append(h('section', { class: 'group', id: `lab-${g.id}` },
      h('div', { class: 'group-head' }, h('h2', {}, g.name), h('p', {}, g.blurb)),
      ...rows));
  }
  document.getElementById('year').textContent = new Date().getFullYear();
}
render();
// bfcache 복원 시 Best grade 배지가 stale 상태로 남지 않도록 재렌더
window.addEventListener('pageshow', (e) => { if (e.persisted) render(); });
</script>
</body>
</html>
```

- [ ] **Step 2: 캡처 대조(데스크톱·모바일)**

`http://localhost:8123/labs/` — Task 3 Step 3·4와 같은 방법으로 1440×900·390 캡처(`labs-1440.png`, `labs-390.png`).
Expected: `sections-reference.png` 2행과 동일 — Dark 헤더 띠 `01 · INTERACTIVE LABS` + `LAB`, Material Lab 그룹(01 Mix Design Lab 흰 카드 + `Enter →`, 02 soon), Survey Lab 그룹(03 soon), 푸터. `read_console_messages` 오류 0.

- [ ] **Step 3: Best grade 배지 동작 확인**

`javascript_tool`: `localStorage.setItem('mixlab-best', JSON.stringify({slab: 95})); location.reload()` → `read_page`에서 `Best grade · A` 텍스트 존재 확인 → `localStorage.removeItem('mixlab-best')`.

- [ ] **Step 4: 링크 확인**

`Enter →` 클릭 → `http://localhost:8123/labs/mix-design/` 200(모듈 화면). 브라우저 back → Lab 페이지.

- [ ] **Step 5: 커밋**

```bash
git add site/labs/index.html
git commit -m "feat(labs): Lab 섹션 페이지 — 그룹별 번호 목록, Best grade 배지

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Study 섹션 페이지 `site/study/index.html`

**Files:**
- Create: `site/study/index.html`
- Reference: `docs/design/mockups/study-desktop.html`, `study-mobile.html`, `sections-reference.png`(3행)

**Interfaces:**
- Consumes: `window.SITE.STUDY_GROUPS/MATERIALS`(Task 2), theme.css(Task 1).

- [ ] **Step 1: 페이지 작성**

`site/study/index.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Study — Construction Study Lab</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&family=Hepta+Slab:wght@400;600;700&family=Red+Hat+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../shared/theme.css">
<style>
/* Study 원장은 첫 열이 유형 배지라 조금 넓다 (목업 study-desktop.html) */
.ledger-row { --ledger-cols:90px 1fr 240px 140px; }
@media (max-width:700px) { .ledger-row { --ledger-cols:60px 1fr; } }
</style>
</head>
<body class="section-page">
<header class="appbar"><div class="appbar-inner appbar-inner--wide">
  <a class="logo" href="../" style="text-decoration:none">Construction Study Lab</a>
  <nav class="appbar-nav" aria-label="Sections">
    <a href="../labs/">Lab</a>
    <a href="./" class="is-active" aria-current="page">Study</a>
  </nav>
</div></header>

<section class="band-royal section-head">
  <div>
    <p class="eyebrow" style="margin:0">02 · Notes and references</p>
    <h1>Study</h1>
  </div>
  <p>Lecture notes, reference tables, and worked examples to read alongside the labs.</p>
</section>

<main id="groups" class="section-main"></main>

<footer class="site-footer">
  <span>© <span id="year"></span> Thompson Thrift Department of Construction Management, Indiana State University. All rights reserved.</span>
  <a href="../">← Home</a>
</footer>

<script src="../shared/registry.js"></script>
<script>
'use strict';
const S = window.SITE;

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(9)) {
    if (c == null) continue;
    el.append(c.nodeType ? c : document.createTextNode(c));
  }
  return el;
}

const TYPE_LABEL = { pdf: 'PDF', link: 'Link', page: 'Page' };

function itemRow(m) {
  const external = m.type === 'link';
  return h('div', { class: 'ledger-row is-active' },
    h('div', { class: 'type' }, TYPE_LABEL[m.type] || m.type),
    h('div', {}, h('h3', { class: 'title' }, m.title), h('p', { class: 'desc' }, m.desc)),
    h('div', { class: 'meta' }, m.type === 'pdf' ? 'PDF' : m.type === 'link' ? 'External link' : 'Page'),
    h('a', Object.assign({ class: 'btn btn-primary', href: m.href }, external ? { target: '_blank', rel: 'noopener' } : {}), 'Open →'));
}
function soonRow() {
  return h('div', { class: 'ledger-row is-soon' },
    h('div', { class: 'type' }, 'Soon'),
    h('div', {}, h('h3', { class: 'title' }, 'Lecture notes and reference tables will appear here.')),
    h('div', { class: 'meta' }, '—'),
    h('div', { class: 'soon' }, 'Soon'));
}

function render() {
  const root = document.getElementById('groups');
  root.innerHTML = '';
  for (const g of S.STUDY_GROUPS) {
    const items = S.MATERIALS.filter(m => m.group === g.id);
    root.append(h('section', { class: 'group', id: `study-${g.id}` },
      h('div', { class: 'group-head' }, h('h2', {}, g.name), h('p', {}, g.blurb)),
      ...(items.length ? items.map(itemRow) : [soonRow()])));
  }
  document.getElementById('year').textContent = new Date().getFullYear();
}
render();
</script>
</body>
</html>
```

- [ ] **Step 2: 캡처 대조**

`http://localhost:8123/study/` 1440×900·390 캡처(`study-1440.png`, `study-390.png`).
Expected: `sections-reference.png` 3행과 동일 — Royal 헤더 띠 `02 · NOTES AND REFERENCES` + `STUDY`, Materials/Surveying 그룹 각 `SOON` 행 1개, 푸터. 콘솔 오류 0.

- [ ] **Step 3: 항목이 있을 때의 렌더 확인(임시)**

`javascript_tool`: `SITE.MATERIALS.push({id:'t', group:'materials', type:'pdf', title:'Test note', desc:'temp', href:'#'}); render(); document.querySelector('#study-materials .ledger-row.is-active .type').textContent` → `"PDF"`. reload로 원복.

- [ ] **Step 4: 사이트 링크 왕복**

홈 `/` → `Lab` → `Enter →`(모듈) → 모듈 `← All Labs`(Task 6 전에는 `../../`로 홈에 감 — Task 6에서 `../`로 바뀜) / 홈 → `Study` → `← Home`. 전부 200, 콘솔 오류 0.

- [ ] **Step 5: 커밋**

```bash
git add site/study/index.html
git commit -m "feat(study): Study 섹션 페이지 — 그룹별 자료 목록(레지스트리 비면 Coming soon)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Mix Design Lab 모듈 재스킨 보정

**Files:**
- Modify: `site/labs/mix-design/index.html` (9행 폰트 링크, 18–30행 인라인 스타일, 35행 앱바, 500·592·594·703·704·707행 인라인 style 문자열, 736·738·743행 그래프 캔버스)
- Modify: `site/labs/mix-design/scene3d.js:68`

**Interfaces:**
- Consumes: theme.css 토큰(Task 1). `.logo a` 규칙.
- 판정·엔진·타임라인·클래스 무변경. `engine.test.mjs` 19/19.

- [ ] **Step 1: `<head>` 폰트 링크 교체 (9행)**

```html
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&family=Hepta+Slab:wght@400;600;700&family=Red+Hat+Mono:wght@500;600&display=swap" rel="stylesheet">
```

- [ ] **Step 2: 인라인 `<style>` 보정 (18–30행)**

교체 후 블록:

```css
/* COMPRESSION 장면 전용: 디지털 로드 인디케이터(7-seg풍 어두운 패널, 스펙 §3.3) */
.utm-load-panel { position:absolute; right:16px; top:16px; width:190px;
  background:#12151b; border:2px solid #3d414a; border-radius:var(--radius); padding:10px 12px;
  font-family:var(--font-mono); pointer-events:none; }
.utm-load-panel .title { color:#7d8797; font:700 11px/1.4 var(--font); letter-spacing:.04em; }
.utm-load-panel .readout { font-size:26px; font-weight:700; letter-spacing:.06em; margin-top:4px;
  text-shadow:0 0 6px currentColor; }
.utm-load-panel .readout.psi { color:#5ee88a; }
.utm-load-panel .readout.lbf { color:#ffb454; font-size:19px; margin-top:8px; }
.utm-load-panel .label { color:#98a1b0; font:500 12px var(--font); margin-top:2px; }
.utm-graph-wrap { position:absolute; right:16px; top:172px; }
.utm-done-list { position:absolute; right:16px; bottom:14px; text-align:right;
  font:600 14px var(--font); color:var(--green); pointer-events:none; }
.utm-done-list .avg { color:var(--text); font-weight:700; margin-top:2px; }
```

- [ ] **Step 3: 앱바 (35행) 교체**

```html
  <div class="logo"><a href="../">← All Labs</a> Mix Design Lab</div>
```

(`.logo`가 uppercase라 `MIX DESIGN LAB`으로 표시된다. ⬢ span 삭제. `../` = Lab 페이지.)

- [ ] **Step 4: 오버레이 인라인 style 문자열 6곳**

각 행에서 다음 치환(문자열 정확히):

| 행 | 기존 | 변경 |
|---|---|---|
| 500 | `'font:600 14px Inter,sans-serif;color:#5b6472;pointer-events:none'` | `'font:600 14px var(--font);color:var(--muted);pointer-events:none'` |
| 592 | (500과 동일 문자열) | (동일 치환) |
| 594 | `'font:500 12px Inter,sans-serif;color:#8b93a3;pointer-events:none'` | `'font:500 12px var(--font-mono);color:var(--faint);pointer-events:none'` |
| 703 | (500과 동일 문자열) | (동일 치환) |
| 704 | `'font:800 44px Inter,sans-serif;color:#141c2b'` | `'font:700 44px var(--font);color:var(--text)'` |
| 707 | `'font:500 13px Inter,sans-serif;color:#5b6472;margin-top:4px'` | `'font:500 13px var(--font-mono);color:var(--muted);margin-top:4px'` |

- [ ] **Step 5: 그래프 캔버스 (drawGraph, 736·738·743행)**

`function drawGraph(fp, epsNow) {` 바로 아래 `if (!graphCtx) return;` 다음 줄에 추가:

```js
        const cs = getComputedStyle(document.documentElement);
        const tok = v => cs.getPropertyValue(v).trim();   // Canvas 2D는 var()를 못 읽는다 — 토큰을 문자열로 전달
```

그리고 세 줄 치환:

```js
        graphCtx.strokeStyle = tok('--border'); graphCtx.lineWidth = 1.5;
```
```js
        graphCtx.fillStyle = tok('--muted'); graphCtx.font = `500 10px ${tok('--font-mono')}`; graphCtx.textAlign = 'center';
```
```js
        graphCtx.strokeStyle = tok('--primary'); graphCtx.lineWidth = 2; graphCtx.beginPath();
```

- [ ] **Step 6: scene3d.js 68행**

```js
  scene.background = new THREE.Color(opts.background ?? 0xe6f6fd); // 사이트 Icy 계열(--surface2)과 조화
```

- [ ] **Step 7: 정적 검사 + 테스트**

Run: `grep -n -E "Inter|⬢|#5b6472|#8b93a3|#141c2b|#98a1b0|#c9cfda|#1b66f0|#6b7484|Courier" site/labs/mix-design/index.html`
Expected: `#98a1b0`는 `.utm-load-panel .label` 1곳만(다크 패널용, 허용). 그 외 매치 없음.
Run: `node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs` → 전부 pass.

- [ ] **Step 8: 화면 대조(브라우저 페인)**

`http://localhost:8123/labs/mix-design/` 1440 캡처: HOME(미션 카드 — 사각 배지·Hepta Slab·앱바 `← All Labs  MIX DESIGN LAB`), Residential Slab 진입 → Step 1(스텝퍼 사각 점·Red Hat Mono 표·입력) 캡처, 강의 예제 값(water 299 / CM 544 / CA 1872 / FA 1292, air 1.5, NMAS 1", w/c 0.55)으로 완주해 MIX 3D(배경 Icy 계열)·SLUMP·COMPRESSION(판독 패널 라벨 가독, 그래프 축·곡선 Royal, dayNum Hepta Slab 700)·리포트(등급 A 사각 배지 Hepta Slab 700) 캡처. 콘솔 오류 0. 리포트 점수 **100 / A**(판정 불변 확인).

- [ ] **Step 9: 커밋**

```bash
git add site/labs/mix-design/index.html site/labs/mix-design/scene3d.js
git commit -m "feat(mix-design): 브랜드 토큰 재스킨 보정 — 앱바·오버레이·그래프·UTM 라벨·무대 배경

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: README·정적 게이트·문서

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README 갱신**

`README.md` 전체:

```markdown
# Construction Study Lab

Interactive labs and study materials for construction education, maintained by the Thompson Thrift Department of Construction Management at Indiana State University.

First lab: **Mix Design Lab** — proportion a concrete mix with the ACI PRC-211.1-22 tables, then run virtual slump (ASTM C143) and compression (ASTM C39) tests. The three test scenes render in real-time 3D via a self-hosted three.js (`site/shared/vendor/`).

## Site

https://cnstlab.org

- `/` — home: one screen with two doors, **Lab** and **Study**
- `/labs/` — Lab section: Material Lab (Mix Design Lab, …) and Survey Lab
- `/study/` — Study section: notes, reference tables, worked examples (Materials, Surveying)
- `/labs/mix-design/` — Mix Design Lab module

## Structure

- `site/index.html` — home
- `site/labs/index.html`, `site/study/index.html` — section pages, rendered from the registry
- `site/shared/registry.js` — `window.SITE`: `LAB_GROUPS`, `LABS`, `STUDY_GROUPS`, `MATERIALS`
- `site/shared/theme.css` — design tokens and shared components (ISU brand palette and type)
- `site/labs/mix-design/` — Mix Design Lab module (`engine.js` scoring, `scene3d.js` three.js scenes)
- `docs/design/mockups/` — the approved mockups the pages are built from

**Add a lab:** create `site/labs/<id>/`, then add one entry to `LABS` in `site/shared/registry.js` (`group` = `material` or `survey`).
**Add study material:** add one entry to `MATERIALS` (`type` = `pdf` | `link` | `page`, `group` = `materials` or `surveying`).

## Dev

```sh
python tools/devserver.py 8123 site
```

Then open http://localhost:8123 (the custom server serves `.js` with the right MIME type and disables caching).

## Test

```sh
node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs
```
```

- [ ] **Step 2: 사이트 전체 정적 게이트**

Run:
```bash
grep -rn "CNST-111" site README.md; echo "cnst exit=$?"
grep -rn -E "Inter[,' ]" site/index.html site/labs/index.html site/study/index.html site/labs/mix-design/index.html site/shared/theme.css; echo "inter exit=$?"
grep -n -E "⬢|🔒|🧪" site/index.html site/labs/index.html site/study/index.html site/shared/theme.css; echo "emoji exit=$?"
node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs
```
Expected: 세 grep 모두 `exit=1`(매치 없음), 테스트 전부 pass.

- [ ] **Step 3: 커밋**

```bash
git add README.md
git commit -m "docs: README — Lab/Study 구조·레지스트리 안내, 과목명 제거

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: 배포 + 라이브 검증 (컨트롤러 직접 실행)

**Files:** 없음(배포·검증만). 서브에이전트는 Netlify 배포가 정책 차단이므로 **컨트롤러가 실행**한다.

- [ ] **Step 1: 배포**

Netlify MCP `netlify-deploy-services-updater`(operation `deploy-site`, siteId `f9c6c718-daac-4aed-898a-bacba6740af1`)로 발급된 `npx -y @netlify/mcp@latest --site-id … --proxy-path …` 명령을 **`site/` 디렉터리에서** 실행. 토큰은 매번 재발급.

- [ ] **Step 2: 라이브 확인**

```bash
for p in / /labs/ /study/ /labs/mix-design/ /shared/theme.css /shared/registry.js; do printf '%-28s ' "$p"; curl -sS -o /dev/null -m 30 -w 'code=%{http_code} type=%{content_type}\n' "https://cnstlab.org$p"; done
curl -sS https://cnstlab.org/ | grep -c "labs/"     # ≥ 1
curl -sS https://cnstlab.org/ | grep -c "CNST-111"   # 0
```
Expected: 전부 200, 정적 게이트 유지.

- [ ] **Step 3: 라이브 캡처**

브라우저 페인 `navigate https://cnstlab.org/` 1440×900 스크린샷 + `/labs/` + `/labs/mix-design/` 각 1장 → 로컬 캡처와 동일한지 확인. 결과를 사용자에게 보고(캡처 첨부).

- [ ] **Step 4: 메모리 갱신 (컨트롤러)**

`C:\Users\parkj\.claude\projects\D--Projects-Test\memory\mixlab-project.md`: "CNST-111" 표현 제거, 구조를 홈/labs/·study/·registry.js로 갱신, 스펙·목업 경로 추가.

---

## 계획 자체 검토

- **스펙 커버리지**: §1 결정(구조·경로·레지스트리·브랜드·배경·서체·과목 제거·저작권·모듈) → T2·T3·T4·T5·T6·T7. §2 토큰 → T1(대비 게이트 포함). §3 컴포넌트 → T1. §4 홈 → T3. §5 섹션 페이지 → T4·T5. §6 레지스트리 → T2. §7 모듈 보정 → T6. §8 검증 1~6 → T1(1)·각 태스크(2·3)·T7(4)·T5 Step 4(5)·T8(6). §9 제외 항목은 어느 태스크에도 없음. 누락 없음.
- **자리표시자**: 없음(모든 코드 블록 완결, 캡처 명령 명시).
- **타입/이름 일관성**: `window.SITE.{LAB_GROUPS,LABS,STUDY_GROUPS,MATERIALS,scoreToGrade,bestGrade}`(T2) ↔ T4·T5 사용 동일. 클래스 `.section-page .section-head .section-main .group-head .ledger-row .is-active .is-soon .num .title .desc .meta .type .soon .site-footer .appbar-nav .is-active .appbar-inner--wide .band-dark .band-royal .eyebrow`(T1) ↔ T4·T5 마크업 동일. `.logo a`(T1) ↔ T6 앱바. 폰트 링크 문자열 4개 페이지 동일.
