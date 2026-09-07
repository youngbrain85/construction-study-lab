# Study 자료 — "Sieve analysis and the fineness modulus" 설계 스펙

- 날짜: 2026-09-06 / 상태: 사용자 승인(Material test 시리즈 2편; 계산기 = 체가름 + FM + C33 허용대)
- 선행: Study 글 템플릿 스펙, 다짐 관리 글(계산기 구조), 공시체 글(2026-09-06-study-cylinders-design.md). 같은 `article.css`/`article.js`, 같은 `.calc*` 스타일을 쓴다.
- 조사 자료: `scratchpad/sieve-research/research.txt`(ASTM C125·C136·C117·C33 값, 계산기 기본값, 사진 후보), `scratchpad/sieve-research/commons-candidates.json`
- 연계: Part 1(배합설계)의 FM(Step 6 표)·NMAS(Step 2)와 양방향 링크. 잔골재 사진 `../mix-design/img/graded-aggregate.jpg` 재사용.

## 1. 결정 사항

| 항목 | 결정 |
|---|---|
| 페이지 | `site/study/aggregate-gradation/index.html` 한 장(본문 약 1,800단어). MATERIALS `page` 항목: `{ id:'aggregate-gradation', group:'materials', type:'page', title:'Sieve analysis and the fineness modulus', desc:'How aggregate grading is measured (ASTM C136), turned into percent passing and the fineness modulus, and checked against ASTM C33 — with a calculator that plots your sieve results on the grading band.', href:'aggregate-gradation/' }`. 위치: `mix-design-2` 뒤, `slump-test` 앞(배합설계 입력값이라 Part 1·2 바로 뒤) |
| 본문 절(id) | ① `why` 입도가 정하는 것(페이스트 요구량·작업성·분리, Part 1의 FM·NMAS 입력) ② `terms` 용어(표준 체 열 2:1, 통과율/잔류율/누적잔류율, FM 정의와 포함 체, NMAS·최대치수 정의와 실무 규칙) ③ `test` 시험(C136: C702 분취·D75, 110 ± 5 °C 건조, 최소 시료량 표, 체 겹침, 흔들기 충분 조건, 과적 7 kg/m², 칭량, 0.3 % 대조, C117 세척은 언급) ④ `calc` 계산(예제 표: 잔류 g → % → 누적 → 통과, FM 3.01) ⑤ `curve` 곡선 읽기(양입도·간극입도·균등입도, 반대수 축) ⑥ `c33` C33 요건(잔골재 허용대 표, No. 200 3/5 %, 45 % 규칙, FM 2.3–3.1·±0.20; 굵은골재 크기번호 표 467·57·67·7·8; 굵은골재 No. 200 ≤ 1 % 언급) ⑦ `calculator` ⑧ `mistakes` ⑨ `takeaways`. 내비: 이전 Part 2, 다음 Study 목록 |
| SVG 도해 | A 체 겹침(3/8 in → No. 4 … No. 100 → 팬, 눈 크기 mm, 2:1) / B 반대수 입도곡선 세 종류(well/gap/uniform, C33 잔골재 허용대 음영) / C FM = 누적잔류율 막대의 합 ÷ 100(예제값) |
| 사진 | `img/sieve-stack.jpg` Tamis analyse granulometrique(Habib M'henni, CC BY-SA 3.0; 1200 px) · `img/weighing.jpg` Sieve Analysis(Soccer jim2002, CC BY-SA 4.0; 4:3 크롭) · `img/shaker.jpg` Vibrating sieve(Cjp24, CC BY-SA 3.0; 4:3 크롭) · `img/gravel.jpg` Varieties of Gravel 01(Sabina Bajracharya, CC BY-SA 4.0; 4:3 크롭) + 재사용 `../mix-design/img/graded-aggregate.jpg`(사이트 소유 사진). Pillow ≤1200 px·EXIF 제거·≤220 KB; 크레딧 링크 + "resized, cropped and recompressed" |
| 스타일 | 기존 `.calc*` 재사용. 추가: `.calc-sieve` 표(체 이름·mm·잔류 g 입력·% 잔류·누적·통과·판정) 폭 규칙 1개, 플롯 음영용 색은 토큰(`var(--icy)` 밴드, `var(--royal)` 곡선) |
| 테스트 | `tools/gradation.test.mjs` 신설; `tools/site-guards.test.mjs` 토큰 목록·`ARTICLE_PAGES`에 페이지+`calc.js` 추가, 사진 폴더 dict에 `study/aggregate-gradation/img: 4`; `tools/registry.test.mjs` id 순서: mix-design-1, mix-design-2, aggregate-gradation, slump-test, concrete-cylinders, soil-compaction |
| 검증 | 헤드리스 1440·390(잔골재 기본값 결과·허용대 판정, 굵은골재 전환·크기번호 변경, 빈 체·0.3 % 대조 실패, 플롯 밴드), 라이브 반복 |

## 2. 계산기

### 입력
- 모드 select `mode`: `fine`(기본) / `coarse`. 굵은골재일 때 크기번호 select `sizeNo`: 467 / 57(기본) / 67 / 7 / 8.
- 잔골재 체 열(고정): 3/8 in (9.5), No. 4 (4.75), No. 8 (2.36), No. 16 (1.18), No. 30 (0.600), No. 50 (0.300), No. 100 (0.150), No. 200 (0.075), pan. 굵은골재 체 열: 2 in (50), 1 1/2 in (37.5), 1 in (25.0), 3/4 in (19.0), 1/2 in (12.5), 3/8 in (9.5), No. 4 (4.75), No. 8 (2.36), No. 16 (1.18), pan. 각 행 잔류 질량 g(빈 칸 = 0).
- 선택: 원시료 건조 질량 `sampleMass`(g). 입력 시 합계와 비교해 0.3 % 초과 차이면 경고("sieving loss …, C136 rejects the run").
- 기본값: research.txt §5(잔골재 500 g 세트; 굵은골재 No. 57 10,000 g 세트 — 모드 전환 시 각 모드의 기본값이 채워짐; 사용자가 값을 바꾼 뒤 전환하면 그 값을 유지).

### 계산 (`gradation.js`, 순수 모듈)
- `SIEVES`(mm·라벨), `FINE_LIMITS`, `COARSE_LIMITS[sizeNo]`(통과율 [min,max]; 미기재 체는 null), `FM_SIEVES`(FM에 드는 체 라벨).
- `analyze(retained, sieves)` → `{ total, rows:[{ label, mm, retained, pctRetained, cumRetained, passing }] }`(퍼센트는 소수 1자리, 보고값은 화면에서 1 %·No. 200은 0.1 %로 반올림).
- `finenessModulus(rows)` = FM 체의 cumRetained 합 ÷ 100(소수 2자리). 굵은골재도 같은 정의(No. 100 이하 체가 없으면 100 %로 간주 — 표준 정의).
- `checkLimits(rows, limits)` → 체별 `{ label, passing, min, max, ok }`(limits가 null인 체는 `ok: null`), `allOk`.
- `maxSingleFraction(rows)` → 가장 큰 단일 체 잔류율과 45 % 규칙 통과 여부(잔골재).
- `nominalMaxSize(rows)`: 통과율 ≥ 90 %인 가장 작은 체(실무 규칙), `maxSize`: 통과율 100 %인 가장 작은 체.
- `massCheck(total, sampleMass)` → 차이 %와 0.3 % 판정.
- `validate(name, value)`: mass 0–100,000 g.

### 화면 (`calc.js`)
- 표에 행별 결과, 요약(FM 또는 NMAS/최대치수, 허용대 판정 수, 45 % 규칙, 질량 대조, 전체 판정 배지), 반대수 플롯(viewBox 720×360; x = log10(mm) 0.05–100 mm, y = 통과율 0–100; C33 밴드 다각형 `var(--icy)`+`var(--border)` 테두리; 곡선 `var(--royal)`; 허용대 밖 점은 amber 마름모; 체 위치 세로 눈금·라벨). 오류/빈 입력 시 플롯 비움 + aria-label. `<noscript>`에 기본값 결과(FM 3.01, 모두 통과).

## 3. 사실 검증 원칙
- 수치는 ASTM C125·C136·C117·C33만(research.txt §2–4). CAVEAT(정밀도, NMAS 실무 규칙)은 정성·"in practice"로. 예제는 "example numbers".
- 과목 코드 없음, 영어, 토큰만, 푸터 문구, 크레딧 규칙.

## 4. 범위 제외
함수율·흡수율 보정(C127/C128/C566), 혼합 골재 배합 최적화, 세척 체가름 절차 상세, SI 전용 표.
