# Study 자료 — "Concrete Mix Design" 2편 시리즈 설계 스펙

- 날짜: 2026-09-05 / 상태: 사용자 승인(브레인스토밍 3개 섹션 "진행")
- 선행: v4 브랜드 사이트 스펙(2026-09-02-isu-brand-site-design.md). Study 섹션의 **첫 자료**이며, 이후 글 페이지의 템플릿이 된다.
- 원본: 사용자의 강의 슬라이드 "Lecture 3-1 Concrete Mix Design.pptx"(26장, 발표자 노트 포함). 슬라이드 본문·노트를 글의 근거로 쓰되 **과목 코드(CNST-111 등)는 어디에도 적지 않는다**.

## 1. 결정 사항

| 항목 | 결정 |
|---|---|
| 형식 | 정적 HTML 글 2장 + 글 전용 스타일시트. 빌드·마크다운 렌더러 없음 |
| 시리즈 | Part 1 "How to design a concrete mix" (방법·10단계), Part 2 "Worked example: a 3,000 psi beam" (예제 완전 풀이) |
| 언어·톤 | 영어. 강의 노트의 말투를 살린 블로그 톤("Here is the trap…")에 교과서 구조(번호 절, 정의·핵심·주의 상자, 표, 도해, 요약) |
| 그림 | 슬라이드 사진 4장은 **그대로 사용**(사용권은 사용자가 확인함). 표 4개는 HTML로, 도해 3개는 사이트 스타일 SVG로 새로 그림. 슬라이드의 ACI 표 이미지·수식 이미지·수분 상태 도해 이미지는 쓰지 않음 |
| 위치 | `/study/mix-design/` (Part 1), `/study/mix-design/example/` (Part 2). 레지스트리 MATERIALS에 `page` 항목 2개 |
| 브랜드 | v4 제약 그대로: ISU 팔레트·서체 토큰만, radius 2px, 로고·잎·[IN]·이모지 없음 |
| 외부 리소스 | Google Fonts만. MathJax 등 수식 라이브러리 없음(수식은 HTML) |
| 숫자 일관성 | Part 1 표의 값은 Mix Design Lab 엔진(`engine.js`의 `WATER_TABLE`·`WC_TABLE`·`CA_VOLUME_TABLE`)과 node 테스트로 대조 |

## 2. 구조와 연결

### 2.1 파일

- `site/study/article.css` — 글 페이지 공용 스타일(§3). theme.css **토큰만** 사용(리터럴 색 금지, 테스트 §7).
- `site/study/article.js` — 목차 활성 표시(IntersectionObserver, 클래식 스크립트 ~20줄) + 푸터 연도.
- `site/study/mix-design/index.html` — Part 1.
- `site/study/mix-design/example/index.html` — Part 2.
- `site/study/mix-design/img/` — `pour.jpg`, `slump-test.jpg`, `graded-aggregate.jpg`, `angular-rounded.jpg` (§5).
- `site/shared/registry.js` — MATERIALS 항목 2개(아래).
- `tools/study-tables.test.mjs`, `tools/site-guards.test.mjs`, `tools/registry.test.mjs` 보강, `README.md`.

### 2.2 레지스트리

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

Study 목록(`study/index.html`)은 바꾸지 않는다 — 두 행이 "Page" 배지로 자동으로 뜬다. 홈·Lab 페이지도 변경 없음.

### 2.3 페이지 간 연결

- 두 페이지 끝 `.article-nav`: Part 1은 "Next → Part 2: Worked example", Part 2는 "← Part 1: How to design a concrete mix". 빈 쪽은 "← All study materials"(`../` 또는 `../../`).
- Part 2 끝 `.cta-lab`: "Try it in the Mix Design Lab" → `../../../labs/mix-design/`.
- 본문 안 교차 링크: Part 1의 각 단계 절 끝에 "See it worked in Part 2 →" 링크, Part 2의 각 단계 절 첫 문단에 "Method: Part 1, step n" 링크. 대응: Part 1 `step-1`·`step-2`·`step-3` → `example/#steps-1-3`, `step-4` → `example/#step-4`, `step-5` → `example/#step-5`, `step-6` → `example/#step-6`, `step-7` → `example/#step-7`, `step-8-10` → `example/#summary`; 역방향은 `../#step-n`(Part 2 `steps-1-3`은 `../#step-1`, `summary`·`moisture`·`trial`은 `../#step-8-10`).
- 앱바: Study 섹션 페이지와 같은 마크업(로고 → `../../` 등 깊이에 맞게, 내비 Lab / Study(활성)).

## 3. 페이지 레이아웃과 컴포넌트 — `site/study/article.css`

### 3.1 마크업 골격(두 페이지 공통)

```html
<body class="section-page article-page">
<header class="appbar">…</header>
<section class="band-royal article-hero"><div class="article-hero-inner">
  <p class="eyebrow">Concrete mix design · Part 1 of 2</p>
  <h1>How to design a concrete mix</h1>
  <p class="lede">Ten decisions, made in order, turn cement, water, and aggregate into a mix you can trust.</p>
  <p class="byline">Jisoo Park · September 2026 · 9 min read</p>
</div></section>
<main class="article-layout">
  <nav class="toc" aria-label="Contents"><h2>Contents</h2><ol><li><a href="#why">…</a></li>…</ol></nav>
  <article class="article">
    <h2 id="why"><span class="num">1</span>Why mix design matters</h2> …
    <nav class="article-nav">…</nav>
  </article>
</main>
<footer class="site-footer">© <span id="year"></span> Jisoo Park. All rights reserved. / ← Home</footer>
<script src="../article.js"></script>
```

- 상대 경로는 깊이에 따른다. Part 1(`/study/mix-design/`): theme `../../shared/theme.css`, `../article.css`, `../article.js`, 홈 `../../`, Study `../`, Lab `../../labs/`. Part 2(`/study/mix-design/example/`): `../../../shared/theme.css`, `../../article.css`, `../../article.js`, 홈 `../../../`, Study `../../`, Lab `../../../labs/`.
- Part 2 히어로: eyebrow "Concrete mix design · Part 2 of 2", `h1` "Worked example: a 3,000 psi beam", lede "One reinforced beam, one cubic yard, 3,000 psi — every number worked by hand, in the same ten steps."
- 읽는 시간 = 본문 단어 수 ÷ 200(분, 반올림). 구현 시 실제 단어 수로 계산해 적는다.

### 3.2 규격

| 요소 | 값 |
|---|---|
| 히어로 | `.band-royal`; 안쪽 max-width 1100px, padding 56px 40px 48px. `h1` Barlow Condensed 800 72px/.92 대문자 흰색 max-width 14ch; `.lede` Hepta Slab 18px/1.55 `--icy` max-width 60ch; `.byline` Red Hat Mono 500 12px 대문자 자간 .06em `--icy` |
| 본문 그리드 | `.article-layout` max-width 1100px, padding 48px 40px 80px, `grid-template-columns: 220px minmax(0, 720px)`, gap 56px, `align-items:start`. `main`의 기본 max-width/padding은 `.article-page main`에서 재정의 |
| 목차 | `.toc` sticky top 88px; 제목 mono 11.5px 대문자 `--muted`; 목록은 왼쪽 2px `--border` 선, 항목 13.5px `--muted`, hover `--dark`, `.is-active`는 `--dark` + 왼쪽 선 `--royal` + 600 |
| 본문 타이포 | `.article` 16.5px/1.7; `h2` 26px 700, 위 여백 56px, 상단 2px `--dark` 선 + `.num`(Barlow Condensed 800 30px `--royal`); `h3` 19px 700; `p` 아래 18px; 링크 `--royal` |
| 상자 | `.callout` padding 18px 22px, margin 24px 0, `.label` mono 11.5px 대문자 자간 .12em. `.callout-key` 배경 `--icy` + 왼쪽 4px `--royal`(라벨 `--royal`) / `.callout-def` 배경 `--bg` + 1px `--border`(라벨 `--muted`) / `.callout-warn` 배경 `--amber-50` + 왼쪽 4px `--amber`(라벨 `--amber`) |
| 그림 | `figure` margin 28px 0; `img` width 100% radius 2px; `figcaption` mono 12.5px `--muted`. `.fig-row`는 2열 grid(gap 16px, ≤700px 1열) — 작은 사진 2장을 나란히(원본 해상도가 낮아 확대 금지: `img { max-width: 원본 폭 }`) |
| SVG 도해 | 인라인 `<svg class="fig-svg" viewBox=…>`; 색은 `currentColor`와 `var(--royal)`·`var(--icy)`·`var(--border)`·`var(--muted)`만; 글자는 사이트 서체(`font-family: var(--font-mono)`) 12–13px |
| 수식 | `.eq`(가운데 정렬 flex, 18px, margin 22px 0) + `.frac`(세로 flex, 분자 아래 1.5px `--text` 선). 변수는 `<i>`, 첨자는 `<sub>` |
| 표 | `.table-wrap { overflow-x:auto }` 안에 theme.css `.ref-table`(caption 위, 홀수행 `--surface`). 셀 `white-space:nowrap`. 표 아래 `.ref-note` 출처 문구 |
| 단계 목록 | `.steps`(counter, 번호 Barlow Condensed 800 30px `--royal` 왼쪽 56px) |
| 이전/다음 | `.article-nav` 2열 grid, 카드(1px `--border`, hover `--royal`), `.dir` mono 11px 대문자, `.ttl` 16px 700, 오른쪽 카드 `text-align:right` |
| 랩 CTA | `.cta-lab` 배경 `--dark`, 흰 제목 + `--icy` 설명 + `.btn.btn-primary` |
| ≤900px | 1열, 목차는 본문 위 일반 블록(2열 목록, sticky 해제), padding 32px 20px 56px; 히어로 `h1` 44px, padding 36px 20px 32px |
| ≤700px | `.fig-row` 1열, `.article-nav` 1열, `.cta-lab` 세로 배치 |

색 조합은 기존 대비 게이트가 검증하는 토큰 쌍만 쓴다(text/muted/faint × bg/surface/surface2, 흰색·icy·neon × dark/royal, amber × amber-50).

### 3.3 `article.js`

- `#year` 채움.
- `IntersectionObserver`(rootMargin `-30% 0px -60% 0px`)로 `.article h2[id]` 중 보이는 첫 항목의 목차 링크에 `.is-active`. 페이지 로드 시 해시가 있으면 그 항목을 활성.
- 실패해도 페이지는 정상(순수 장식).

## 4. 콘텐츠 개요

말투: 2인칭·현재형, 짧은 문장, 노트의 경고문("Do not raise the slump by adding water.")은 `.callout-warn`으로. 각 절은 ①왜 ②무엇을 ③어떻게(표·식) ④흔한 실수 순. 단위는 US customary(lb/yd³, in., psi)를 주로 쓰고 물·공기 표에만 kg/m³·mm 병기. 규격 인용: ACI PRC-211.1-22, ACI 318, ASTM C143, ASTM C39.

### 4.1 Part 1 — How to design a concrete mix (`site/study/mix-design/index.html`, 약 1,800단어)

| # | id | 제목 | 내용·그림 |
|---|---|---|---|
| 1 | `why` | Why mix design matters | 재료를 따로 배운 뒤 "얼마나"를 정하는 단계. 사진 `pour.jpg`(캡션: placing concrete into a reinforced slab) |
| 2 | `what` | What mix design is | `.callout-def` 정의(슬라이드 5), 4가지 재료 C/W/A/Ad 한 줄씩, 골재 ≈ 70 % · 페이스트 ≈ 30 %(노트), 목표 문장 "workability … strength and durability … at minimum cost" `.callout-key` |
| 3 | `objectives` | What a good mix must do | 3묶음 목록(fresh: consistency·cohesiveness·minimal segregation / hardened: f'c·durability·volume stability / cost: local materials·initial vs long-term) |
| 4 | `workflow` | The ten-step workflow | SVG 도해 A(10단계 스테퍼) + `.callout-key` "각 단계는 앞 단계의 답을 쓴다 — 순서를 지켜라" |
| 5 | `step-1` | Step 1 — Select the slump | 슬럼프 정의(consistency index, ASTM C143), 사진 `slump-test.jpg`, 표 `tbl-slump`(Footings and slabs 2–5 / Beams and reinforced walls 3–5 / Building columns 3–5 in.), `.callout-warn` 물 추가 금지(admixture로 펌프성) |
| 6 | `step-2` | Step 2 — Nominal maximum aggregate size | 표면적 논리(큰 골재 → 물·시멘트 절감), 사진 `graded-aggregate.jpg`, ACI 318 한계 3개(1/5 폼 최소치수, 1/3 슬래브 두께, 3/4 철근 순간격) |
| 7 | `step-3` | Step 3 — Estimate water and air | 표 `tbl-water`(§6), 갇힌 공기 vs 공기연행(노출 등급), 형상 보정 표(angular = table / rounded −8 % / other = records / all = trial batch) + 사진 `angular-rounded.jpg`, 예 325 × 0.92 ≈ 299 |
| 8 | `step-4` | Step 4 — Choose the w/cm | f'cr 개념(변동성·통계적 합격) + 표 `tbl-fcr`, 표 `tbl-wcm`, 보간 예(4,200 psi → 0.55), "strength와 durability 중 **낮은** w/cm가 지배" `.callout-key` |
| 9 | `step-5` | Step 5 — Total cementitious materials | 식 CM = water ÷ w/cm(`.eq`), 예 299 ÷ 0.48 = 623, 체크 4개(총 결합재 ≠ 포틀랜드만·최소량은 요구 시만·SCM 대체·페이스트 부피) |
| 10 | `step-6` | Step 6 — Coarse aggregate by bulk volume | b/b₀ 정의, 표 `tbl-bb0`, 식 mass = b/b₀ × 27 × dry-rodded density, 예 0.69 × 27 × 100 = 1,863, `.callout-warn` bulk volume ≠ absolute volume(공극 포함, OD 봉다짐 밀도) |
| 11 | `step-7` | Step 7 — Fine aggregate by absolute volume | 식 V = m ÷ (RD × 1,685), 잔골재 = 1 − Σ, SVG 도해 C(1 yd³ 부피 막대: 물 0.177 · 결합재 0.102 · 굵은골재 0.415 · 공기 0.015 · 잔골재 0.2905), `.callout-def` relative density·OD/SSD 기준 유지 |
| 12 | `step-8-10` | Steps 8–10 — Summarize, adjust for moisture, trial-batch | 설계 기준표 정리(SSD 기준), SVG 도해 B(수분 상태 4단계: oven-dry / air-dry / SSD / wet), free moisture = MC − A, batch water = design water − Σ free water, batch aggregate = SSD × (1 + MC) ÷ (1 + A), 시험배합에서 확인·수정 |
| 13 | `takeaways` | Key takeaways | 4개(슬라이드 26): ACI는 출발값 / 같은 순서 / 낮은 w/cm / 수분 기준 일관 |

### 4.2 Part 2 — Worked example: a 3,000 psi beam (`site/study/mix-design/example/index.html`, 약 1,200단어)

| # | id | 제목 | 내용 |
|---|---|---|---|
| 1 | `problem` | The problem | 조건 표: reinforced beam, f'c 3,000 psi @ 28 d, exposure F0/S0/W0/C0, slump 3–4 in., cement Type I/IL RD 3.15, CA 1-in. well-rounded gravel DRUW 100 lb/ft³ RD 2.68 A 0.5 %, FA natural sand FM 2.60 RD 2.64 A 0.7 %. 과제: 1 yd³ |
| 2 | `steps-1-3` | Steps 1–3 — Slump, size, water and air | 주어짐 3–4 in., 1 in.; 표에서 325 lb/yd³, 공기 1.5 %(0.015 yd³); 둥근 자갈 −8 % → 299 lb/yd³ |
| 3 | `step-4` | Step 4 — Required strength and w/cm | f'cr = 3,000 + 1,200 = 4,200 psi; 보간 0.57 − 0.20 × 0.09 = 0.55; 노출 F0/S0/W0/C0라 강도가 지배 |
| 4 | `step-5` | Step 5 — Cementitious materials | 299 ÷ 0.55 ≈ 544 lb/yd³ |
| 5 | `step-6` | Step 6 — Coarse aggregate | b/b₀ = 0.69(1 in., FM 2.60); 0.69 × 27 × 100 = 1,863 lb OD; × 1.005 ≈ 1,872 lb SSD |
| 6 | `step-7` | Step 7 — Fine aggregate | 절대부피: CM 544 ÷ (3.15 × 1,685) = 0.102 / 물 299 ÷ 1,685 = 0.177 / CA 1,872 ÷ (2.68 × 1,685) = 0.415 / 공기 0.015 → 합 0.7095 → FA 0.2905 yd³ × 2.64 × 1,685 ≈ 1,292 lb SSD. SVG 도해 C(실제 수치) |
| 7 | `summary` | Step 8 — The design-basis mix | 표: CM 544 / water 299 / CA (SSD) 1,872 / FA (SSD) 1,292 / total 4,007 lb·yd³. 검산 3개: 299 ÷ 544 ≈ 0.55 ✓, 부피 1.000 yd³ ✓, 4,007 ÷ 27 = 148.4 lb/ft³ ✓ |
| 8 | `moisture` | Step 9 — Moisture adjustment | CA: MC 2.0 %, A 0.5 % → free water ≈ 28 lb, batch CA ≈ 1,900 lb, water 299 − 28 = 271 lb(CA만 반영). 잔골재도 같은 방식으로 반복(수치는 독자 연습으로 두고 식만) |
| 9 | `trial` | Step 10 — Trial batch | 무엇을 재고(슬럼프, 공기, 단위중량, 28일 강도) 무엇을 조정하는지 |
| 10 | — | Try it in the lab | `.cta-lab` → Mix Design Lab, `.article-nav` ← Part 1 |

Part 2의 모든 수치는 슬라이드 19–25와 동일하다(위 표가 정본).

## 5. 사진 — `site/study/mix-design/img/`

원본: PPT 미디어(`image21.jpeg` 타설, `image23.jpeg` 슬럼프, `image24.jpeg` 골재 등급, `image26.jpeg` 각진/둥근). Pillow로 처리해 커밋한다.

| 파일 | 처리 | 표시 | alt |
|---|---|---|---|
| `pour.jpg` | 1200×630 → 1200 px 폭 유지, JPEG q80, ≤ 180 KB | 본문 폭 | "Worker spreading fresh concrete over a mat of rebar as it comes down a chute" |
| `slump-test.jpg` | 800×600 그대로, q85, ≤ 90 KB | 본문 폭 | "Slump cone lifted beside the slumped concrete, with a tape measuring the drop" |
| `graded-aggregate.jpg` | 350×200 그대로(≤ 25 KB) | `.fig-row`, max-width 350px | "Four aggregate sizes side by side, from fine to coarse" |
| `angular-rounded.jpg` | 320×160 그대로(≤ 12 KB) | `.fig-row`, max-width 320px | "Angular crushed stone next to rounded gravel" |

`loading="lazy"`, `width`/`height` 속성 명시(레이아웃 시프트 방지). 캡션은 `figcaption`.

## 6. 표(Part 1) — 파싱 가능한 마크업

테스트가 읽을 수 있도록 `data-*` 키를 붙인다.

- `#tbl-water`: 열 = NMAS 3/8, 1/2, 3/4, 1, 1½, 2 in.(9.5–50 mm); 행 `<tr data-series="nonAE|ae" data-slump="1.5|3.5|6.5">`(표시 라벨 "1–2 in." 등), 셀 `<td data-nmas="0.375|0.5|0.75|1.0|1.5|2.0">325 <span class="si">(193)</span></td>`; 갇힌 공기 행 `<tr data-row="entrapped">`(3, 2.5, 2, 1.5, 1, 0.5 %); 공기연행 권장 공기량 행 `<tr data-row="air" data-exposure="mild|moderate|severe">`(mild 4.5 4.0 3.5 3.0 2.5 2.0 / moderate 6.0 5.5 5.0 4.5 4.5 4.0 / severe 7.5 7.0 6.0 6.0 5.5 5.0). 2 in. 열 값: nonAE 260/285/300, AE 240/265/280. 슬라이드의 3·4 in. 열은 생략(`.ref-note`에 명시).
- `#tbl-wcm`: 행 `<tr data-fc="2000|3000|4000|5000|6000">`, 셀 `<td data-series="nonAE">`·`<td data-series="ae">`(0.82/0.74, 0.68/0.59, 0.57/0.48, 0.48/0.40, 0.41/0.33). MPa 병기.
- `#tbl-bb0`: 행 `<tr data-nmas="0.375|0.5|0.75|1.0|1.5|2.0">`, 셀 `<td data-fm="2.40|2.60|2.80|3.00">`(슬라이드 15 값; 2 in. 행 0.78 0.76 0.74 0.72).
- `#tbl-fcr`: f'c < 3000 → f'c + 1000 / 3000–5000 → f'c + 1200 / > 5000 → 1.1 f'c + 700 (data 속성 불필요).
- `#tbl-slump`: 부재별 시작 슬럼프 범위(§4.1 5).

## 7. 자동 테스트

1. `tools/registry.test.mjs` 보강: MATERIALS `type:'page'` 항목마다 `site/study/<href>index.html` 파일이 존재한다(href는 `/`로 끝남).
2. `tools/study-tables.test.mjs`: Part 1 HTML을 읽어 `#tbl-water`(nonAE·ae 각 3행 × NMAS 0.375–1.5, entrapped, air 3행)·`#tbl-wcm`(2000–6000 × 2)·`#tbl-bb0`(NMAS 0.375–1.5 × FM 4)의 값이 `MixEngine.DATA`의 `WATER_TABLE`(`nonAE`/`ae`/`entrappedAir`/`targetAir`)·`WC_TABLE`·`CA_VOLUME_TABLE`과 정확히 같다. 파싱은 정규식(`<tr …>…</tr>`, `data-*`, 첫 숫자)으로 하고 HTML 파서 의존성은 추가하지 않는다.
3. `tools/site-guards.test.mjs`: (a) `site/` 아래 `.html/.js/.css`(vendor 제외)에 문자열 `CNST`가 없다 (b) `site/study/article.css`에 `#` 리터럴 색이 없다(`var(--…)`만) (c) Part 1·Part 2 HTML의 내부 링크(`href`가 `http`로 시작하지 않고 `#`만이 아닌 것)가 파일로 존재한다(디렉터리 링크는 `index.html`).
4. 기존 `engine.test.mjs`·`contrast-check.test.mjs` 불변 통과. 실행: `node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs tools/study-tables.test.mjs tools/site-guards.test.mjs`. README의 테스트 명령을 이것으로 갱신.

## 8. 화면 검증(필수)

1. 헤드리스 Edge 캡처(스크래치패드 `verify/`): Part 1·Part 2 각각 데스크톱 1440×900(상단 + `#step-3` 표 구간 + 끝 내비) / 모바일 390×844 iframe 래퍼(상단 + 표 구간 가로 스크롤 + `.fig-row`). Study 목록에 두 행이 "Page" 배지로 보이는지.
2. CDP: `#step-7`로 스크롤 후 목차의 해당 링크에 `.is-active`; 모바일에서 `.table-wrap`의 `scrollWidth > clientWidth`이고 페이지 자체는 가로 스크롤 없음(`document.documentElement.scrollWidth === clientWidth`).
3. 링크: devserver에 대해 두 페이지의 내부 링크·이미지·CSS·JS 요청이 전부 200(§7-3의 정적 검사와 별도로 실제 요청).
4. 배포 후 라이브(cnstlab.org/study/mix-design/, …/example/)에서 1·3 반복.

## 9. 문서

- `README.md`: Structure에 `site/study/article.css`·`article.js`·`site/study/mix-design/` 추가; "Add study material" 절에 "page 유형은 `site/study/<id>/index.html`을 만들고 `article.css`·`article.js`를 쓴다(Part 1을 템플릿으로)" 추가; 테스트 명령 갱신.

## 10. 범위 제외

다른 Study 자료, 검색·태그·댓글, 다크 모드, 인쇄 스타일, PDF 내보내기, 수식 라이브러리, 한국어 번역, Study 목록 페이지 개편, 슬라이드의 3·4 in. NMAS 열.
