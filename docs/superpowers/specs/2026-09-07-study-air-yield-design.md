# Study 자료 — "Air content and unit weight" 설계 스펙

- 날짜: 2026-09-07 / 상태: 사용자 승인(Material test 시리즈 4편이자 마지막; **짧은 정적 글, 계산기 없음**)
- 선행: Study 글 템플릿(2026-09-05), 철근 인장 글(2026-09-07-study-rebar-design.md)과 같은 정적 글 구조. 같은 `article.css`/`article.js`, 새 CSS 없음.
- 조사 자료: `scratchpad/air-research/research.txt`(WSDOT 재료매뉴얼 2026-01 FOP T 121·T 152 = ASTM C138·C231, WAQTC/Idaho FOP T 121, NRMCA CIP 8), `scratchpad/air-research/picked.json`(사진 3장 출처), 원본 `scratchpad/air-research/orig/`.
- 연계: 배합설계 Part 1(목표 공기량 표·Step 7 절대용적)과 양방향 링크, 슬럼프 글(같은 시료·같은 5분 규칙), 공시체 글(같은 시료에서 이어지는 시험).

## 1. 결정 사항

| 항목 | 결정 |
|---|---|
| 페이지 | `site/study/air-yield/index.html` 한 장(본문 약 1,500단어, 8 min read). MATERIALS `page` 항목: `{ id:'air-yield', group:'materials', type:'page', title:'Air content and unit weight', desc:'Two measurements from one bucket of fresh concrete — how much air the pressure meter finds (ASTM C231), and what the density says about how much concrete the batch really made (ASTM C138).', href:'air-yield/' }`. 위치: `soil-compaction` 앞(굳지 않은 콘크리트 시험끼리 모이도록 `rebar-tension` 뒤) |
| 본문 절(id) | ① `why` 왜 공기를 재는가(연행 vs 갇힌 공기, 동결융해 보호, 강도 대가는 정성, 목표 공기량은 배합설계 글 표로 링크) ② `pressure` 압력법(C231 Type B: 평형 원리, 절차, 0.1 % 판독, 골재보정계수, 3개월 표준화, 경량골재는 C173) ③ `density` 밀도와 수율(C138: 용기 표 + 물 질량법 표준화, 슬럼프로 정하는 다짐, 3층·25회·맬릿 10~15회, ρ·Y·N 식, 보고 자릿수, 두 시험을 같은 시료로 할 때 5분·순서) ④ `yield` 수율 읽기(Ry, 짧은 배치·과수율, C94 3대 평균, 굳으면 약 2 % 감소, 거푸집 4~10 % 여유) ⑤ `example` 워크 예제 ⑥ `mistakes` 흔한 실수 ⑦ `takeaways` 요점(시리즈 공통 마무리) |
| SVG 도해 3장 | Figure 1 Type B 압력계 단면 — 공기실(초기압력)과 보울을 밸브로 잇고, 콘크리트 속 공기가 압축된 만큼 바늘이 내려가 그 눈금이 공기량이 되는 구조 / Figure 2 연행공기 vs 갇힌 공기 — 크기·간격·개수를 같은 축척으로 비교하고, 얼어붙는 물이 기포로 밀려나 압력이 풀리는 그림 / Figure 3 1 yd³ 부피 막대 — 시멘트·물·골재의 절대용적 위에 공기가 얹히는 구조, 이론밀도(공기 없음) vs 실측밀도(공기 포함), 그 차이가 중량법 공기량 |
| 표 | `tbl-measures`(굵은골재 최대치수 1/2/3 in. ↔ 용기 0.25/0.5/1.0 ft³, 공기량계 보울 겸용 각주) · `tbl-example`(배치 티켓 입력을 `data-*`로 싣고, 실측 밀도 148.4와 145.0 두 경우의 수율·상대수율·공기량·시멘트함량을 각 셀 `data-result`로) |
| 사진 3장 | `img/placing.jpg` 야간 교량 상판 타설(FHWA, public domain; 1600×1200 → 1200×900, hero) · `img/tools.jpg` 신선콘크리트 시험대 도구 일습(Habib M'henni, CC BY 4.0; 4644×3084 → 1200×797) · `img/filling.jpg` 원통 몰드를 층으로 채우는 장면(같은 저자·라이선스; 1200×797). Commons에 압력식 공기량계·단위중량 용기 사진이 없어(5개 언어 검색 0건) 도해 중심으로 간다. 캡션은 사진에 실제로 보이는 것만 말한다 |
| 스타일 | 추가 CSS 없음(기존 `.table-wrap`·`.ref-table`·`.steps`·`.callout-*`·`.fig-grid`·`.fig-svg`·`.eq`) |
| 테스트 | `tools/airyield.test.mjs` 신설: `tbl-example`의 `data-*` 입력에서 T·Y·Ry·A·N을 재계산해 표시값과 대조하고, 사이트 앵커 배합(물 299+시멘트 544+굵은골재 1,872+잔골재 1,292 = 4,007 lb/yd³, 공기 1.5 %)과 엔진 `computeYield`의 무공기 부피(26.6 ft³)가 서로 맞는지 확인. `tbl-measures`의 ft³↔m³ 환산도 검사. `tools/site-guards.test.mjs` 토큰 목록·`ARTICLE_PAGES`·사진 폴더 dict(`study/air-yield/img: 3`); `tools/registry.test.mjs` id 순서 갱신 |
| 검증 | 헤드리스 1440·390 캡처(히어로·표 2개·도해 3장·사진·크레딧), 라이브 반복 |

## 2. 사실 검증 원칙
- 절차·산식·자릿수는 출처 A(WSDOT FOP T 121·T 152)와 C(NRMCA CIP 8)에 있는 것만. 기호는 출처 A 그대로(ρ, Vm, W, Y, Nt, N).
- CAVEAT: 공기 1 %당 강도 약 5 % 감소(2차 출처)는 숫자 없이 "a few percent of strength for each percent of air"로. ASTM 조항 번호, 골재보정계수의 전형값, Type B 최대 골재치수(2 in.)도 정성 서술하거나 출처를 밝혀 서술.
- 워크 예제는 사이트 앵커 배합에서 이 스펙이 직접 계산한 값이므로 "example numbers"로 표시하고, 출처의 예제가 아님을 분명히 한다.
- 과목 코드 없음, 영어 본문, 한국어 주석, 토큰만, 푸터 문구, 사진 크레딧 규칙(캡션 저자·라이선스 + 말미 크레딧 문단 + 리사이즈 고지).

## 3. 워크 예제(검산 완료)
8 yd³ 주문, 배치 재료 합계 32,056 lb(= 8 × 4,007), 결합재 4,352 lb, 설계 공기량 1.5 %.
- 무공기 절대용적 = 8 × 27 × (1 − 0.015) = 212.76 ft³ → **이론밀도 T = 32,056 ÷ 212.76 = 150.7 lb/ft³**
- 실측 D = 148.4 → Y = 32,056 ÷ 148.4 ÷ 27 = **8.00 yd³**, Ry = **1.00**, A = (150.7 − 148.4)/150.7 = **1.5 %**, N = 4,352 ÷ 8.00 = **544 lb/yd³**
- 실측 D = 145.0 → Y = **8.19 yd³**, Ry = **1.02**, A = **3.8 %**, N = 4,352 ÷ 8.188 = **532 lb/yd³**
같은 티켓·같은 재료인데 밀도 3.4 lb/ft³ 차이가 "0.19 yd³ 더 나옴 + 공기 2.3 %p 초과 + 결합재 12 lb/yd³ 손실"로 읽힌다. 시멘트 함량은 반올림 전 수율로 계산한다(표시된 8.19로 다시 나누면 531이 되어 1 lb 어긋난다 — 본문 각주로 밝힌다).

## 4. 범위 제외
계산기·인터랙션, C173 용적법 절차 상세, 경화 콘크리트의 공기 공극 계수(C457), 공기연행제 화학, 온도·기압 보정, SI 전용 표.
