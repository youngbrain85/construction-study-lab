# Construction Study Lab — ISU 브랜드 기반 사이트 재설계 스펙 (v4)

- 날짜: 2026-09-02 / 상태: 브레인스토밍 완료(디자인 캔버스에서 사용자 방향 확정), 스펙 검토 대기
- 선행: v2 스펙(2026-08-29-construction-study-lab-design.md), v3 스펙(2026-08-29-three-3d-scenes-design.md). 모듈(Mix Design Lab) 내부 구조·엔진·판정은 그대로.
- 근거: Indiana State University Brand Guidelines (Feb 2026, v01, 58p) — 팔레트·서체·그래픽 언어. 로고는 사용하지 않음.
- 시각 정본: 디자인 캔버스(https://claude.ai/code/artifact/b214507b-d198-4f7b-b307-5b86de6ecf8f, 1페이지) = `docs/design/mockups/*.html` + `home-reference.png` / `sections-reference.png`. **구현은 이 목업의 수치(색·서체·크기·간격)를 그대로 옮긴다.**

## 1. 결정 사항

| 항목 | 결정 |
|---|---|
| 정보 구조 | **홈(한 화면, 스크롤 없음) → Lab 섹션 페이지 / Study 섹션 페이지 → 모듈.** 홈은 큰 제목 하나 + 메뉴 버튼 2개(Lab / Study). Lab 페이지는 Material Lab / Survey Lab 그룹 목록, Study 페이지는 Materials / Surveying 그룹 목록 |
| 경로 | `site/index.html`(홈) · `site/labs/index.html`(Lab) · `site/study/index.html`(Study) · 모듈 `site/labs/mix-design/`(URL 불변) |
| 레지스트리 | `site/shared/registry.js`(클래식 스크립트, `window.SITE`) 하나에 `LAB_GROUPS`·`LABS`·`STUDY_GROUPS`·`MATERIALS`. 새 랩/자료 = 항목 1줄 + 폴더 |
| 브랜드 | ISU 팔레트·서체·40° 각도·각진 모서리 사용. **로고·Sycamore Leaf·`[IN]` 디바이스·투사 효과 사용 안 함.** 대괄호 장식 없음(비평 반영) |
| 홈 배경 | Dark→Royal 세로 그라데이션 + 청사진 격자(48px) + 선화(골조·타워크레인·측량 삼각대, Neon 30% 투명도). 3D 프리뷰 없음(이전 안 폐기) |
| 서체 | Headline `Barlow Condensed` 800 / Body·CTA `Hepta Slab` 400·600·700 / 표·태그·캡션·수치 `Red Hat Mono` 500·600. Google Fonts 링크 1개(display=swap) |
| 과목 표기 | `CNST-111` 전부 제거(사이트·README). 카피는 과목 무관 |
| 저작권 | 모든 페이지 푸터: `© {연도} Thompson Thrift Department of Construction Management, Indiana State University. All rights reserved.` (연도 JS). 홈 상단 바에 부서명 1회 |
| 모듈 | `shared/theme.css` 토큰으로 자동 재스킨 + 보정 5곳(§7). 판정·엔진·타임라인·클래스 무변경 |

## 2. 디자인 토큰 (`site/shared/theme.css` `:root`)

```
--bg:#ffffff;  --surface:#f2f9fe;  --surface2:#d9f3fd;  --border:#b9dff2;
--text:#003665;  --muted:#2b5f8f;  --faint:#3b6894;
--primary:#0053a5;  --primary-600:#003665;  --primary-50:#d9f3fd;
--dark:#003665;  --royal:#0053a5;  --vintage:#66cef6;  --neon:#b8f5ff;  --icy:#d9f3fd;
--green:#0b6b4a; --green-50:#e9f7f1; --amber:#9a4508; --amber-50:#fdf3e3; --red:#b42318; --red-50:#fdecea;
--radius:2px; --radius-sm:2px;  --shadow:none;  --shadow-hover:0 6px 18px rgba(0,54,101,.14);
--font:'Hepta Slab',Georgia,'Times New Roman',serif;
--font-head:'Barlow Condensed','Arial Narrow',Impact,sans-serif;
--font-mono:'Red Hat Mono','Courier New',monospace;
```

색 사용 규칙(대비 게이트 §8-1이 단언):
- 흰/Icy 배경 위 텍스트는 `--text`·`--muted`·`--faint`·`--royal`·의미색만. Vintage·Neon·Icy 텍스트 금지.
- Dark(#003665) 위: white / Icy / Vintage / Neon. Royal(#0053a5) 위: white / Icy / Neon만(Vintage는 14px 미만 AA 미달).
- `--faint`는 12px 텍스트 기준 Icy 위 ≥4.5 필요 — 미달 시 `#2f5f8c`로 조정.
- 의미색은 위 값(한 단계 어둡게 조정)으로 배지 틴트·Icy 위 모두 AA.

## 3. 공통 컴포넌트 (`theme.css`, 클래스명 불변 — 모듈 마크업 계약)

- `html,body`: bg `--surface`, Hepta Slab 15px/1.55, `--text`.
- `.appbar`: 흰색, 하단 2px `--border`, 높이 64px(모바일 56px). `.logo`: Barlow Condensed 800 22px uppercase tracking .02em `--dark`(모바일 18px). **`.logo .mark` 삭제**(⬢ 마크업 제거). 신설 `.logo a { font:600 13px/1 var(--font); text-transform:none; letter-spacing:0; color:var(--muted) }`. 신설 `.appbar-nav`(Hepta Slab 600 13px `--muted`; 현재 섹션 `.is-active`는 `--dark` + 하단 2px Royal 밑줄).
- `h1`: Barlow Condensed 800 uppercase 34px/.95; `h2`: Hepta Slab 700 20px; `h3`: Hepta Slab 700 22px; `.sub`: Hepta Slab 400 `--muted`.
- `.card`: 흰색, 1px `--border`, radius 2px, flat. `a.card { text-decoration:none; color:inherit }`(**기존 결함 수정: 링크 카드 전체 밑줄**).
- `.btn`: radius 2px, Hepta Slab 700 14px; `.btn-primary` Royal→hover Dark, disabled `#9cc3e6`; `.btn-ghost` 유지.
- **포커스**: `.btn:focus-visible, .choice:focus-visible, a:focus-visible { outline:3px solid var(--royal); outline-offset:2px }`; `.num-field .wrap:focus-within { border-color:var(--royal); box-shadow:0 0 0 3px var(--surface2) }`.
- `.badge`: radius 2px, Red Hat Mono 600 11.5px uppercase tracking .04em; blue = Icy bg + Dark text; green/amber/red = 의미색 + -50 틴트.
- `.mission-grid/.mission-card`(모듈 미션 선택 화면 전용으로 남음): flat 카드, hover translateY(-2px)+`--shadow-hover`. clip-path 사용 안 함.
- `.stepper .dot`: 사각(2px), Red Hat Mono; 라벨 Red Hat Mono 11px uppercase.
- `.ref-table`: 셀 Red Hat Mono 12.5px tabular; th Red Hat Mono uppercase `--muted`; caption Hepta Slab 700.
- `.num-field input`, `.unit`: Red Hat Mono. `.choice`: radius 2px; selected = Royal border + Icy bg + Dark text.
- `.canvas-stage`: bg `--surface2` flat, 1px `--border`, radius 2px.
- `.score-bar > div`: Royal; `.grade-badge`: 사각(2px), Hepta Slab 700 44px(Stat 규정), 배경 gradeColor 인라인 유지.
- 신설(섹션 페이지용): `.band-dark`(Dark bg·white), `.band-royal`(Royal bg·white), `.eyebrow`(Red Hat Mono 600 12px uppercase tracking .12em; light 위 `--royal`, dark 위 Neon), `.ledger-row`(§5), `.site-footer`(§4·§5 공통 푸터).

## 4. 홈 `site/index.html` (목업 `home-desktop.html` / `home-mobile.html`)

- 뷰포트 한 화면: `min-height:100vh` flex column(상단 바 64 / 본문 flex-grow / 푸터 48). 스크롤 없음(1440×900 기준). 모바일(<900px)은 본문이 넘치면 자연 스크롤 허용.
- 배경: `background-color:#0053a5; background-image: grid-rows, grid-cols, linear-gradient(180deg,#003665 0%,#0053a5 100%)`(격자선 `rgba(184,245,255,.10)` 1px, 48px 간격; 모바일 40px).
- 선화: 인라인 `<svg aria-hidden="true">`(목업의 path 그대로: 골조 3베이×4층 x 780–1040, 타워크레인 x 1100–1300, 삼각대 x 1360–1400; stroke Neon 2px, 그룹 opacity .32), 절대배치 하단 정렬 1440×620. 모바일은 목업 390×300 버전.
- 상단 바: 좌 `Thompson Thrift Department of Construction Management`, 우 `cnstlab.org`(Red Hat Mono 500 12px uppercase tracking .1em Neon), 하단 1px `rgba(184,245,255,.3)`.
- 본문(좌 정렬, 수직 중앙, 좌우 패딩 48px/모바일 20px): 아이브로 `Interactive labs and study materials`(Red Hat Mono 600 13px Neon) → `h1` `CONSTRUCTION` / `STUDY LAB`(Barlow 800 168px/.88 white; 모바일 62px/.9) → 설명(Hepta Slab 18px Icy, max 44ch) `Build it, test it, prove it — hands-on labs for construction materials and surveying, with notes and reference tables to study alongside.` → **메뉴 버튼 2개**(가로, gap 16; 모바일 세로 gap 12): `LAB` 흰 bg Dark 텍스트 + 부제 `Material · Survey`(Red Hat Mono 11.5px `--muted`) + `→`; `STUDY` `rgba(0,54,101,.55)` bg + 1px Neon 테두리 + 부제 `Notes · Tables · Examples`(Neon) + `→`. 각 min-width 300px, padding 22px 26px, radius 2px, 버튼 제목 Barlow 800 34px. `<a href="labs/">`, `<a href="study/">`. hover: LAB bg Icy / STUDY bg `rgba(0,54,101,.8)`.
- 푸터: 상단 1px `rgba(184,245,255,.3)`, 저작권 1행(Red Hat Mono 500 11.5px Icy).
- 접근성: 배경 SVG `aria-hidden`, 메뉴 버튼은 `<a>`에 `aria-label="Lab — Material and Survey labs"` 등, 포커스 링 §3.
- 로직: 없음(정적). 연도만 JS.

## 5. 섹션 페이지 `site/labs/index.html` · `site/study/index.html` (목업 `labs-*.html` / `study-*.html`)

- 공통 구조: `.appbar`(`.logo` `CONSTRUCTION STUDY LAB` → `../` 링크, `.appbar-nav` `Lab`(labs/) · `Study`(study/), 현재 페이지 `.is-active`) → **헤더 띠**(Lab = `.band-dark`, Study = `.band-royal`; 좌 아이브로 `01 · Interactive labs` / `02 · Notes and references` + Barlow 800 96px 제목 `LAB` / `STUDY`; 우 설명 Hepta Slab 16px Icy max 40ch; 패딩 56/40/48px) → **그룹 목록**(패딩 40px, 그룹 간 48px) → `.site-footer`(Dark, 저작권 + 우측 `← Home`).
- 그룹 블록: 제목 Hepta Slab 700 28px + 우측 blurb(`--muted` 15px, 모바일은 제목 아래) → `.ledger-row` 목록.
- `.ledger-row`: grid `64px 1fr 240px 140px`(Study: `90px 1fr 240px 140px`), gap 24, padding 24px 0, 상단 1px `--border`; 번호 Barlow 800 36px Royal; 제목 Hepta Slab 700 22px; 설명 Hepta Slab 14px `--muted`; 메타 Red Hat Mono 12px; 마지막 열 `.btn btn-primary` `Enter →`. **활성 항목은 흰 카드**(1px `--border`, padding 24). Coming soon 행(`.is-soon`): 번호 `--border` 색, 제목·메타 `--faint`, 마지막 열 `SOON`. 모바일: grid `44px 1fr`, 메타·버튼은 제목 아래.
- Lab 페이지 데이터: `LAB_GROUPS` 순서로 그룹, 각 그룹의 `LABS`(활성 → Coming soon 순). Mix Design Lab 메타 `5 missions · ACI PRC-211.1-22` + `Best grade · {등급}`(localStorage `mixlab-best` 최고 점수 → A–F; 기록 없으면 생략).
- Study 페이지 데이터: `STUDY_GROUPS` 순서로 그룹, 각 그룹의 `MATERIALS`; 비어 있으면 Coming soon 행 1개(`Lecture notes and reference tables will appear here.`). 항목은 `type`(`pdf`/`link`/`page`) 배지 + 제목 + 설명 + `Open →`(외부는 `target=_blank rel=noopener`).
- 렌더: 각 페이지의 인라인 스크립트가 `window.SITE` 레지스트리를 읽어 DOM 생성(`h()` 헬퍼 재사용). `pageshow` persisted 시 재렌더(Best 배지 최신화).

## 6. 레지스트리 `site/shared/registry.js`

```js
// 새 랩 = 폴더 1개 + LABS 항목 1줄. 새 자료 = MATERIALS 항목 1줄.
window.SITE = {
  LAB_GROUPS: [
    { id:'material', name:'Material Lab', blurb:'Concrete, aggregates, and the tests that prove them.' },
    { id:'survey',   name:'Survey Lab',   blurb:'Leveling, traversing, and site layout.' },
  ],
  LABS: [
    { id:'mix-design', group:'material', name:'Mix Design Lab', href:'mix-design/',   // labs/ 기준 상대경로
      desc:'Proportion a concrete mix with the ACI tables, then put it through virtual slump and strength tests.',
      meta:'5 missions · ACI PRC-211.1-22', bestKey:'mixlab-best', active:true },
    { id:'material-soon', group:'material', active:false },
    { id:'survey-soon',   group:'survey',   active:false },
  ],
  STUDY_GROUPS: [
    { id:'materials', name:'Materials', blurb:'Concrete, aggregates, and mix design.' },
    { id:'surveying', name:'Surveying', blurb:'Leveling, traversing, and site layout.' },
  ],
  MATERIALS: [],   // { id, group, type:'pdf'|'link'|'page', title, desc, href }
};
```
`scoreToGrade`(≥90 A / ≥80 B / ≥70 C / ≥60 D / F)는 `registry.js`에 함께 두어 Lab 페이지가 사용.

## 7. 모듈 `labs/mix-design/index.html` + `scene3d.js` 보정

- `<head>`: Inter 링크 → 공통 Google Fonts 링크. `<link rel="stylesheet" href="../../shared/theme.css">` 유지.
- 앱바(35행): `<span class="mark">⬢</span>` 삭제, 워드마크 `MixLab` → `MIX DESIGN LAB`, `← All Labs` 링크는 `href="../"`(Lab 페이지) + 인라인 스타일 제거(`.logo a` 규칙).
- 인라인 `<style>`: `.utm-load-panel .label` `#6b7484` → `#98a1b0`(#12151b 위 7.02); `.utm-done-list` `#12855f` → `var(--green)`; `'Courier New'` → `var(--font-mono)`; `Inter` → `var(--font)`.
- 오버레이 인라인 스타일 6곳(500·592·594·703·704·707행 부근): `Inter,sans-serif` → `var(--font)`, `#5b6472` → `var(--muted)`, `#8b93a3` → `var(--faint)`, `#141c2b` → `var(--text)`; dayNum `800 44px Inter` → `700 44px var(--font)`.
- 그래프 캔버스(736·738·743행 부근): Canvas 2D는 `var()` 불가 → `drawGraph` 진입 시 `getComputedStyle(document.documentElement).getPropertyValue(...)`로 `--border`(축, 기존 #c9cfda)·`--muted`(라벨, 기존 #98a1b0)·`--primary`(곡선, 기존 #1b66f0)·폰트 `500 10px ${--font-mono}` 적용.
- `scene3d.js` createStage 기본 `background` `0xeef1f5` → `0xe6f6fd`(1줄).
- 모듈 푸터/타이틀 등에 `CNST-111` 없음(확인됨). 판정·엔진·타임라인·클래스 무변경. `engine.test.mjs` 19/19 게이트.

## 8. 검증

1. **대비 테스트** `tools/contrast-check.test.mjs`(`node --test` 대상): theme.css `:root` 파싱 → (text·muted·faint·primary·green·amber·red)×(bg·surface·surface2) ≥4.5, 배지 (green·amber·red·primary-600)×(-50 틴트) ≥4.5, (white·icy·neon)×(dark·royal) ≥4.5, vintage×dark ≥4.5, `#12151b`×UTM 패널 색 ≥4.5.
2. **엔진 테스트** 19/19.
3. **헤드리스 스크린샷 대조**(Edge `--headless=new`; 사용자 상시 지시): 홈 1440×900·모바일 390(iframe 래퍼) · Lab/Study 페이지 데스크톱·모바일 · 모듈 HOME·Step1·Step7·리포트·3D 1컷(`--virtual-time-budget`) → `docs/design/mockups/*.png`와 나란히 놓고 눈으로 대조. 확인: 배경 그라데이션·격자·선화 위치, 제목 크기, 버튼 2개, 스크롤 없음(홈 `scrollHeight === clientHeight` at 1440×900), 섹션 페이지 헤더 띠·목록, 푸터 문구, 폰트 3종 적용, 모듈 화면 가독성.
4. **정적 검사**: `site/`·README에 `CNST-111` 0, `Inter` 0, 이모지 0(허브·섹션·모듈 앱바), theme.css 외 하드코딩 회색 hex 0(의미색·UTM 패널·gradeColor·선화 색 예외 목록).
5. **링크**: 홈→labs/→mix-design/→`← All Labs`→labs/→`← Home`→홈, 홈→study/ 왕복 200.
6. 배포(Netlify, site/에서 npx) → https://cnstlab.org 라이브: 홈·labs/·study/·모듈 200, 폰트 CSS 200, 홈 스크린샷 1회.

## 9. 범위 제외

로고/식별 마크, Sycamore Leaf·[IN]·투사, 홈 3D 프리뷰, About·Privacy·Contact, 애널리틱스, 모듈 위저드 레이아웃 변경, Survey Lab·Study 실제 콘텐츠(레지스트리·자리만), 다크 모드, 이전 시안 A/B/C·분할 홈(캔버스 2페이지 참고용).
