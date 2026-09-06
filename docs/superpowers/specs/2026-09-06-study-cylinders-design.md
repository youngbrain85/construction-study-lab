# Study 자료 — "Concrete cylinders: from the mold to the acceptance decision" 설계 스펙

- 날짜: 2026-09-06 / 상태: 사용자 승인(Material test 시리즈 1편; 계산기 = 강도 + 합격 판정 + 재령 곡선; 공기량·단위중량은 별도 글)
- 선행: Study 글 템플릿 스펙(2026-09-05-study-mix-design-article-design.md), Slump 글(2026-09-05-study-slump-test-design.md), 다짐 관리 글(2026-09-06-study-soil-compaction-design.md — 계산기 구조를 그대로 따른다).
- 조사 자료: `scratchpad/cylinder-research/research.txt`(ASTM C31/C39/C617/C1231/C42, ACI 318-19 §26.12, ACI 209R-92 값, 계산기 기본값, 사진 후보 7장), `scratchpad/cylinder-research/commons-candidates.json`
- 강의 연계: 재료 과목 L03 "Lime, Portland Cement, and Concrete"의 Compression test·Development of Strength·Hydration, Assignment 1(배합설계의 f'c).

## 1. 결정 사항

| 항목 | 결정 |
|---|---|
| 페이지 | `site/study/concrete-cylinders/index.html` 한 장(본문 약 2,000단어, 표·SVG·계산기 제외). MATERIALS에 `page` 항목: `{ id:'concrete-cylinders', group:'materials', type:'page', title:'Concrete cylinders: from the mold to the acceptance decision', desc:'Making and curing test cylinders (ASTM C31), breaking them (ASTM C39), reading the fracture, and deciding acceptance the ACI 318 way — with a calculator for strength tests and the age curve.', href:'concrete-cylinders/' }` (slump-test 뒤, soil-compaction 앞에 넣어 콘크리트 글끼리 이어지게 한다) |
| 본문 절(id) | ① `why` 공시체가 재는 것(f'c의 뜻, 표준양생 대 현장양생, 7일은 지표·28일이 판정, 시험 = 공시체 2개(6×12)/3개(4×8) 평균) ② `making` 만들기(C31: 크기, C172 시료·15분, 층·다짐 표, 몰드 두드리기 10–15회, 마감·덮개) ③ `curing` 양생(초기 48 h 60–80 °F(f'c ≥ 6,000 psi는 68–78 °F)·보습, 4 h 내 운반·30 min 내 표준양생, 73.5 ± 3.5 °F 습윤실/석회수조(C511), 탈형 24 ± 8 h, 현장양생의 용도) ④ `testing` 시험(C39: 지름 0.01 in, 단부 평면 0.002 in·수직 0.5°, 캡핑 C617/패드 C1231(1,500–12,000 psi), 재령 허용오차 표, 재하 35 ± 7 psi/s, f = P/A → 10 psi, L/D 보정표) ⑤ `reading` 파괴형태 6종과 뜻(1–3 정상, 4–6 캡·정렬·패드 문제), 같은 시료 공시체 편차(정성) ⑥ `acceptance` ACI 318 §26.12(빈도: 하루 1회·150 yd³·5,000 ft², 5회 미만 규칙, 50 yd³ 미만 면제; 기준 (a)(b); 불합격 후속: (a) 평균 올리기, (b) 코어 C42 3개 평균 ≥ 0.85 f'c·개별 ≥ 0.75 f'c; f'cr 개념은 Part 1 링크) ⑦ `age` 강도 발현(ACI 209 식·비율표, 온도·수분) ⑧ `calculator` ⑨ `mistakes` ⑩ `takeaways`. 말미 내비: 이전 슬럼프 글, 다음 Study 목록 |
| SVG 도해 | A 공시체 치수·층·다짐(6×12 3층/4×8 2층, 봉 지름) / B 파괴형태 1–6 (C39 Fig. 2 재해석) / C 합격 판정 흐름도(강도시험 → (a)(b) → 후속 조치) |
| 사진(7장, Commons; 캡션 + 말미 크레딧 링크 + "resized, cropped and recompressed") | `img/cylinder-hero.jpg` Concrete Compression Testing(Xb-70, public domain; 4:3 크롭) · `img/broken-cylinder.jpg` Failed Concrete Cylinder(Xb-70, public domain) · `img/break-test.jpg` Concrete cylinder break test(U.S. Navy, public domain; 4:3 크롭) · `img/filling-molds.jpg` US Navy 080108-N-7367K-004(U.S. Navy, public domain; 4:3 크롭) · `img/making-cylinders.jpg` Probetas hormigón 01(Tano4595 assumed, CC BY-SA 2.5) · `img/labeled-molds.jpg` Probetas hormigón 02(Tano4595 assumed, CC BY-SA 2.5) · `img/curing-tank.jpg` Cube Test 2(Fotokannan, CC BY-SA 4.0; 4:3 크롭; 캡션에 큐브임을 명시). Pillow ≤1200 px·EXIF 제거·q80·각 ≤220 KB, `<img width/height>`는 실제 픽셀 |
| 스타일 | `article.css`의 기존 `.calc*` 블록 재사용. 추가: `.calc-table` 열이 많은 시험 표를 위해 `.calc-tests`(가로 스크롤 wrapper) 한 규칙과 `.calc-plots`(플롯 2개 세로 배치) — 토큰만 |
| 테스트 | `tools/cylinders.test.mjs` 신설(순수 모듈); `tools/site-guards.test.mjs` 토큰 목록·`ARTICLE_PAGES`에 페이지+`calc.js` 추가, 사진 폴더 예산 dict에 `study/concrete-cylinders/img: 7` 추가; `tools/registry.test.mjs` id 목록 갱신(순서: mix-design-1, mix-design-2, slump-test, concrete-cylinders, soil-compaction) |
| 검증 | 헤드리스 1440·390(기본값 결과, 하중 수정 → 판정 변화, 4×8 전환, 빈 시험행, 잘못된 입력, 플롯 2개), 링크·이미지 200, Opus 최종 리뷰(사실 검증), 로컬 머지·배포·라이브 반복 |

## 2. 계산기

### 입력
- f'c (psi, 기본 4,000; 허용 2,000–12,000). 공시체 크기 select: `6x12`(기본, 시험당 공시체 2개) / `4x8`(공시체 3개; 열 3개가 보이고 6×12에서는 3번째 열 비활성).
- 시험 6행: 공시체 하중 lbf(6×12: 2개, 4×8: 3개). 기본값(6×12): T1 122,200/124,700 · T2 117,300/115,600 · T3 112,500/114,200 · T4 102,400/104,600 · T5 126,700/128,900 · T6 121,600/119,900. 빈 행은 무시(뒤 행이 앞으로 당겨지지 않도록 행 번호 유지); 유효 시험이 1개 미만이면 오류.
- 재령 곡선: 28일 강도 입력(기본 = T1 평균 4,370 psi가 아니라 사용자가 고칠 수 있는 별도 필드, 기본 4,370), 시멘트/양생 조건 select: Type I moist(기본 a=4.0, b=0.85) / Type III moist(2.3, 0.92).

### 계산 (순수 모듈 `cylinders.js`)
- `AREA = { '6x12': π·6²/4 = 28.274 in², '4x8': π·4²/4 = 12.566 in² }`; `strength(P, size)` = round10(P / A) — C39 보고 단위 10 psi.
- `testAverage(strengths)` = round10(평균); `withinTestRange(strengths)` = (max − min)/avg × 100 (%); 경고 임계 6×12 6.6 %, 4×8 9.0 %(정성 문구 "spread wider than the test method normally gives").
- `evaluateTests(tests, fc)` : 각 시험에 `avg`, `okB`(avg ≥ fc − (fc ≤ 5,000 ? 500 : 0.10·fc)), 3연속 이동평균 `avg3`(i ≥ 2)와 `okA`(avg3 ≥ fc); 전체 `pass` = 모든 okA·okB; `reasons`(예: "Test 4: average of tests 2–4 is 3,930 psi, below f'c" / "Test k below f'c − 500 psi").
- `ageRatio(t, {a, b})` = (t/(a+b·t)) / (28/(a+28·b)) — 28일에서 정확히 1이 되도록 정규화한 ACI 209 식; `ageCurve(f28, coeff, days=[1,3,7,14,28,56,90])`.
- `validate(name, value)`: load 1,000–1,000,000 lbf, fc 2,000–12,000 psi, f28 500–20,000 psi.

### 화면 (`calc.js`)
- 로드 시 기본값 계산. 시험 표: 행마다 공시체 강도 셀·평균 셀·(b) 판정·(a) 3회 평균/판정 배지. 요약: 시험 수, 합격/불합격, 이유 목록, 편차 경고. `aria-live="polite"`, 오류 `aria-live="polite"`.
- 플롯 1(관리도, viewBox 720×300): x = 시험 번호, y = psi; 시험 평균 점·선, 3회 이동평균 점선, f'c 선과 f'c − 500 선(토큰 색), 불합격 점은 amber 마름모. 플롯 2(재령 곡선, viewBox 720×300): x = 일(로그 아님, 0–90), 곡선 40점 + 마커 7개 + 값 라벨; 라벨 클램프·후광 규칙은 다짐 글 `calc.js`와 동일(측정 API try/catch 폴백).
- 오류 시: 요약 "—", 플롯 비움 + aria-label "No result…". JS 없음: `<noscript>`에 기본값 결과(T1–T3 4,170 OK, T2–T4 3,930 FAIL → overall not accepted; 7일 추정 3,060 psi) 표기 — 정확한 값은 계획에서 node로 고정.

## 3. 사실 검증 원칙
- 수치는 ASTM C31·C39·C617·C1231·C42, ACI 318-19 §26.12, ACI 209R-92 값만(research.txt §1–4). CAVEAT 항목(C39 정밀도 %, 8시간 미이동)은 정성 서술.
- 계산기 기본값은 합성 예제이며 본문에 "example numbers"라고 밝힌다. 재령 곡선은 "estimate, never an acceptance basis"라고 명시.
- 과목 코드 없음, 영어, 브랜드 토큰만, 푸터 문구 유지, 사진 크레딧 규칙(링크 + 변경 고지).

## 4. 범위 제외
공기량·단위중량(별도 글), 휨·쪼갬인장(C78/C496), 코어 채취 절차 상세, 성숙도법(C1074), SI 토글.
