# Study 자료 — "Testing reinforcing steel: the tension test" 설계 스펙

- 날짜: 2026-09-07 / 상태: 사용자 승인(Material test 시리즈 3편; **정적 글, 계산기 없음**)
- 선행: Study 글 템플릿 스펙(2026-09-05), 공시체 글(2026-09-06-study-cylinders-design.md), 골재 입도 글(2026-09-06-study-sieve-design.md). 같은 `article.css`/`article.js`를 쓰고 새 스타일 규칙은 없다.
- 조사 자료: `scratchpad/steel-research/research.txt`(A615 등급·신장률·굽힘 핀 표, A370 절차, 예제 수치, CAVEAT 목록), `scratchpad/steel-research/picked.json`(사진 6장의 출처·라이선스), 원본 `scratchpad/steel-research/orig/`, 자르기 상자가 검증된 `scratchpad/steel-research/prep.py`.
- 연계: 공시체 글이 "이전 글"(article-nav), Study 목록이 "다음". 레지스트리 Materials 그룹 소개문에 reinforcing steel 추가.

## 1. 결정 사항

| 항목 | 결정 |
|---|---|
| 페이지 | `site/study/rebar-tension/index.html` 한 장(본문 약 2,000단어, 12 min read). MATERIALS `page` 항목: `{ id:'rebar-tension', group:'materials', type:'page', title:'Testing reinforcing steel: the tension test', desc:'What ASTM A615 asks of a reinforcing bar — grade, tensile strength, elongation and the bend — how the tension test (ASTM A370) measures each, and how to read the result and the mill certificate.', href:'rebar-tension/' }`. 위치: `concrete-cylinders` 뒤, `soil-compaction` 앞. STUDY_GROUPS materials blurb → `'Concrete, aggregates, reinforcing steel, soils, and mix design.'` |
| 본문 절(id) | ① `why` What the bar has to do(등급 = 최소 항복강도 40/60/75/80, 최신판의 100은 언급만; 설계는 fy = 지정 항복강도에 기대고 경화 구간은 여유; 연성(신장률·굽힘)이 경고 없는 파괴를 막는 이유; A706의 항복 상한·인장/항복비 ≥ 1.25·내진 요구) ② `bar` Reading the bar(#3–#18 표: 번호 = 지름의 1/8 in, 미터법 이름, 지름·공칭단면·단위중량, #9–#18은 옛 정사각형 바와 같은 단면; 압연 마킹 도해) ③ `test` The tension test, step by step(전단면 시편, 공칭단면으로 응력 계산, 8 in 게이지 마크, 시험기 용량, 항복 구간 저속, 항복 결정 두 방법, 최대하중, 파단·맞대기·신장률, 파단 위치 규칙) + 응력–변형률 도해 2장 ④ `example` Worked example(#5 Grade 60 판정 4단계) + A615 요구값 표 ⑤ `bend` The bend test(핀 지름 표, 180°/#14·#18 90°, 합격 = 바깥면 균열 없음) + 도해 ⑥ `certs` Mill certificates, sampling and retests(MTR 항목, heat·size별 시험, 현장 샘플 시험, 재시험 규정) ⑦ `mistakes` ⑧ `takeaways`. 내비: 이전 `../concrete-cylinders/`, 다음 `../` |
| SVG 도해 | Figure 1 압연 마킹(밀 기호 → 크기 번호 → 강종 문자 S/W → 등급 숫자 또는 연속선 1/2/3) · Figure 2 Grade 60 바의 전체 응력–변형률 곡선(탄성 E = 29,000 ksi, 항복 68 ksi, 평탄부, 경화, 인장강도 100 ksi, 네킹, 파단 13.3 %; 60·90 ksi 최소값 점선; 파단 후 신장 13 % 괄호) · Figure 3 첫 1 % 변형률 확대(뾰족한 항복점 곡선의 하중 정지법 68 ksi vs 둥근 곡선의 0.2 % 오프셋 82 ksi) · Figure 4 굽힘 시험(핀 D = 3½ d, 바 d, 180°, 바깥면 검사). 좌표는 플랜에 고정(`scratchpad/steel-research/geom.py`로 계산) |
| 표 | `tbl-sizes`(#3–#18: 미터법 이름, 지름 in, 단면 in², 단위중량 lb/ft) · `tbl-a615`(Grade 40/60/75/80: 최소 항복·인장 ksi, 8 in 신장률 % — #3 / #4–#6 / #7–#8 / #9–#11 / #14–#18) · `tbl-bend`(핀 지름 배수: #3–#5, #6, #7–#8, #9–#11, #14–#18 × Grade 40/60/75/80) · `tbl-example`(예제 4행, `data-*` 속성에 입력값). 모든 표는 `.table-wrap` 안, 정규식으로 읽을 수 있는 고정 마크업 |
| 사진 6장 | `img/rebar-closeup.jpg`(A bunch of rebar up close, W.carter, CC BY-SA 4.0; 1200×739, hero) · `img/rebar-bundles.jpg`(Rebar 01, Vsolymossy, CC BY 3.0; 1200×900) · `img/tying-rebar.jpg`(A worker ties together reinforcing bar…, Bill Dowell, U.S. Army, public domain; 1200×798) · `img/testing-machine.jpg`(Universal testing machine, Oregon Department of Transportation, CC BY 2.0; 3:4 크롭 900×1200) · `img/fracture.jpg`(Rupture-traction-acier, Betienne, CC BY-SA 3.0; 3:4 크롭 900×1200) · `img/rebar-bender.jpg`(Rebar bender, CC0; 4:3 크롭 824×618). Pillow ≤1200 px·EXIF 제거·≤220 KB(품질 자동 하향); 캡션 저자·라이선스 + 말미 크레딧 문단(파일 페이지·라이선스 딛 링크) + "The photos were resized, cropped and recompressed for the web." |
| 스타일 | 추가 규칙 없음(기존 `.table-wrap`, `.ref-table`, `.steps`, `.callout-*`, `.fig-grid`, `.fig-svg`, `.eq`) |
| 테스트 | `tools/rebar.test.mjs` 신설: HTML 표를 정규식으로 읽어 (a) `tbl-sizes` 각 행 단면 = round(πd²/4, 2), 단위중량 = 3.4028 × πd²/4 ±0.3 %, #3–#8 지름 = 번호/8, #9·#10·#11·#14·#18 단면 = 1², 1.125², 1.25², 1.5², 2² (b) `tbl-a615` 등급 숫자 = 최소 항복, 항복 < 인장, 신장률이 크기 열을 따라 비증가 (c) `tbl-bend` 핀 배수 3.5/5/7/9만 있고 등급 열을 따라 비감소 (d) `tbl-example`의 `data-*` 입력으로 68.1 ksi·100.0 ksi·13.0 %·2.19 in 재계산 = 표시값. `tools/site-guards.test.mjs` 토큰 목록·`ARTICLE_PAGES`에 페이지 추가, 사진 폴더 dict에 `study/rebar-tension/img: 6`; `tools/registry.test.mjs` id 순서: mix-design-1, mix-design-2, aggregate-gradation, slump-test, concrete-cylinders, rebar-tension, soil-compaction |
| 검증 | 헤드리스 1440·390 캡처(hero·표·도해 4장·사진 격자·크레딧), 라이브 반복 |

## 2. 사실 검증 원칙
- 수치는 ASTM A615(Table 1 치수, 등급별 항복·인장·신장률, 굽힘 핀), A370(전단면·공칭단면·8 in 게이지·파단 위치), A706 Grade 60(60–78 ksi, ≥ 80 ksi & ≥ 1.25 × 실측 항복, 14/12/10 %), ACI 318-19(§20.2.1.2 항복 결정 두 방법, Es = 29,000,000 psi)만 — research.txt §1–2.
- CAVEAT 항목(항복 구간 변형률 속도 상한, 옛 EUL 방법의 %값, 재시험 허용 근접 범위, 시험 빈도 조항 번호, 전형적 Grade 60 실측값)은 숫자 없이 정성 서술("the standard caps the rate", "if the miss is small — the standard says how small", "typically comfortably above").
- 예제 수치는 "example numbers"로 표시. 과목 코드 없음, 영어 본문, 한국어 주석, 토큰만, 푸터 문구, 크레딧 규칙.

## 3. 범위 제외
계산기·인터랙션, 용접성(탄소당량), 에폭시 코팅·스테인리스 바(A775/A955), 프리스트레스 강선(A416), 화학 성분 표, SI 전용 표, 3D 랩 Steel 스테이션 활성화.
