# Study 자료 — "Compaction control: the Proctor test and field density" 설계 스펙

- 날짜: 2026-09-06 / 상태: 사용자 승인(주제 "다짐 관리: Proctor + 현장 밀도", 도해 + 미니 계산기(축소 범위), 정적 글 + 인터랙티브 계산기)
- 선행: Study 글 템플릿 스펙(2026-09-05-study-mix-design-article-design.md), Slump 글 스펙(2026-09-05-study-slump-test-design.md). 같은 `article.css`/`article.js`를 쓴다.
- 조사 자료: `scratchpad/soil-research/research.txt`(ASTM D698·D1557·D1556·D6938·D2216·D4718 값, 시방 관행, 계산기 기본값, 사진 후보 6장), `scratchpad/soil-research/commons-candidates.json`
- 강의 연계: 재료 과목 L02 "Soils and Excavations"(OSHA 분류·굴착 보호)와는 별개 주제. 이 글은 시공 QC의 다짐 관리(실내 Proctor → 현장 밀도 → 다짐도 판정)를 다룬다.

## 1. 결정 사항

| 항목 | 결정 |
|---|---|
| 페이지 | `site/study/soil-compaction/index.html` 한 장(본문 약 2,000단어, 표·SVG·계산기 제외). MATERIALS에 `page` 항목 1개: `{ id:'soil-compaction', group:'materials', type:'page', title:'Compaction control: the Proctor test and field density', desc:'How fill is specified and checked — the Proctor curve, sand cone and nuclear gauge tests, percent compaction, and a calculator to try it.', href:'soil-compaction/' }`. STUDY_GROUPS materials blurb를 `'Concrete, aggregates, soils, and mix design.'`로 갱신 |
| 본문 절(id) | ① `why` 왜 다짐하는가(밀도↔강도·침하·투수, 층(lift)과 롤러: 패드풋=점성토, 진동 평활드럼=사질토, 플레이트/래머=트렌치) ② `proctor` Proctor 시험(D698 대 D1557 비교표: 램머 5.5/10 lbf, 낙하 12/18 in, 3/5층, 25(4 in 몰드)·56(6 in 몰드)회, 12,400/56,000 ft·lbf/ft³; Method A/B/C 체·몰드; 절차 5단계; 4~5점, 약 2 % 간격, 최적 양쪽 2점) ③ `curve` 다짐곡선 읽기(γd = γwet/(1+w), 최적함수비·최대건조밀도, ZAV: γd = Gs·γw/(1+w·Gs), 에너지 효과) ④ `field` 현장 밀도(샌드콘 D1556 절차·계산·모래 조건 Cu<2·14일 검정; 핵밀도계 D6938 직접투과(≤12 in)/후방산란(상부 ~3 in)·Cs-137 밀도·Am-241:Be 수분·표준계수·면허/안전; 함수비 D2216 오븐 110±5 °C, D4643) ⑤ `spec` 다짐도와 시방(다짐도 = 현장 γd/실내 γd,max×100; "typical" 95 %/90 %, 함수비 창 ±2 %; 시험 빈도; 불합격 시 조치; D4718 굵은입자 보정) ⑥ `calculator` 미니 계산기 ⑦ `mistakes` 흔한 실수 ⑧ `takeaways` 핵심 정리. 말미: 관련 글(슬럼프·Part 1) 내비, Soil Testing Lab은 준비 중이므로 CTA 없이 Study 목록으로 |
| SVG 도해(새로 그림, 토큰 색만) | A Proctor 몰드·램머 치수(4 in 몰드, 4.584 in 높이, 칼라, 램머 5.5 lbf·12 in 낙하) / B 다짐곡선 + ZAV + 표준·수정 두 곡선 / C 샌드콘 단면(병·콘·밑판·시험구멍·모래) / D 핵밀도계 직접투과 대 후방산란(선원봉 깊이·검출기) |
| 사진(Commons, 캡션 + 말미 크레딧 링크 + 변경 고지) | `img/earthwork-hero.jpg` Landscape shaping at Brunnshög(Nixdorf, CC BY 4.0) · `img/proctor-compactor.jpg` Proctor device1(Zaher.Kadour, CC BY-SA 3.0) · `img/nuclear-gauge.jpg` Moisture Density Guage(U.S. NRC, CC BY 2.0) · `img/padfoot-roller.jpg` Seabees compactor roller(U.S. Air Force, public domain) · `img/vibratory-roller.jpg` Caterpillar CS 663E(Spielvogel, CC0) · `img/lift-test.jpg` Testing compaction of soil sediment(USAID, public domain). Pillow ≤1200 px·EXIF 제거·JPEG q80·각 ≤220 KB, `<img width/height>`는 실제 픽셀. 샌드콘 사진은 없음 → 도해 C로 대체 |
| 스타일 추가 | `article.css`에 계산기 블록(`.calc`, `.calc-grid`, `.calc-result`, `.calc-svg`, 합격/불합격 배지 `.verdict-pass`(green 토큰)/`.verdict-fail`(amber 토큰), 오류문 `.calc-error`) — 토큰만. 숫자 입력은 theme.css의 `.num-field` 재사용 |
| 테스트 | `tools/compaction.test.mjs`(순수 모듈) 신설; `tools/site-guards.test.mjs`의 토큰 가드 목록·`ARTICLE_PAGES`에 새 페이지 추가, 사진 예산 테스트를 `study/*/img` 디렉터리 전수(각 ≤220 KB, .jpg만)로 일반화; `tools/registry.test.mjs` page id 목록에 `soil-compaction` 추가 |
| 검증 | 헤드리스 캡처 1440·390(계산기 조작: 값 변경 → 결과 갱신, 잘못된 입력 → 오류문, 곡선 SVG 렌더), 링크·이미지 200, Opus 리뷰(공학 사실 검증 포함), 로컬 머지·배포·라이브 반복 검증(계산기 조작 포함) |

## 2. 미니 계산기 (축소 범위)

### 입력
- Proctor 점 5개(행마다 함수비 w % · 습윤단위중량 γwet pcf). 기본값: (8.0, 112.3) (10.0, 118.5) (12.0, 122.9) (14.0, 122.1) (16.0, 118.0). 빈 행은 무시, 유효한 점이 3개 미만이면 오류.
- Gs(고체 비중, ZAV용) 기본 2.70, 허용 2.40–3.00.
- 현장 시험: 현장 건조단위중량 γd,field pcf(기본 106.5), 현장 함수비 % (기본 11.5). *샌드콘 원자료·핵밀도계 습윤밀도 입력은 범위에서 제외(사용자 결정).*
- 시방: 요구 다짐도 % (기본 95, 허용 80–105), 함수비 창 하한/상한 % (기본 −2 / +2).

### 계산 (순수 모듈 `compaction.js`, ES module, DOM 무관)
- `dryDensity(wet, wPct)` = wet / (1 + wPct/100).
- `fitProctor(points)` : points = [{w, wet}] → 각 점 dry 계산 → 2차 최소제곱 γd = a·w² + b·w + c (정규방정식, 서로 다른 w가 3개 이상). a < 0이면 `wOpt = −b/(2a)`, `gdMax = c − b²/(4a)`; a ≥ 0(봉우리 없음)이면 최대 dry 점을 쓰고 `flags: ['no-peak']`; wOpt가 시험 범위 [min w, max w] 밖이면 `flags: ['outside-range']`(값은 그대로 보고). 반환 `{ points:[{w,wet,dry}], a,b,c, wOpt, gdMax, flags }`.
- `zavDensity(Gs, wPct)` = Gs·62.4 / (1 + (wPct/100)·Gs) (pcf).
- `evaluate({ gdField, wField, gdMax, wOpt, specPct, lo, hi })` → `{ percent, densityOk, moistureOk, pass, reasons[] }`; percent는 소수 1자리로 반올림해 판정(≥ spec), 함수비는 [wOpt+lo, wOpt+hi] 포함 범위. reasons: `'density below spec'`, `'too dry'`, `'too wet'`.
- 입력 검증 `validate()` : w 0–40, γwet 60–160 pcf, γd,field 60–160, wField 0–40; 위반 시 필드별 메시지.

### 화면 (`calc.js`, ES module — DOM·SVG만 담당)
- 페이지 로드 시 기본값으로 즉시 계산·그리기. `input` 이벤트마다 재계산(디바운스 불필요).
- 결과 패널: 각 점의 건조밀도 표, w_opt(소수 1자리)·γd,max(소수 1자리), 현장 다짐도 %(소수 1자리), 판정 배지 PASS/FAIL + 이유 문장, 경고(no-peak/outside-range). `aria-live="polite"`.
- SVG 플롯(viewBox 720×360, 토큰 색): x = 함수비(min w −2 … max w +2), y = 건조밀도(자동 범위: min dry −4 … max(dry, ZAV(min w)) 상단 여유); 눈금·축 라벨; ZAV 곡선(점선), 적합 곡선(40점 폴리라인, 시험 범위 안만), 시험점(원), 최적점(세로 점선 + 라벨), 현장 점(마름모 + 라벨). `role="img"` + `aria-label`을 계산값으로 갱신.
- JS 없음: `<noscript>` 안내와 기본값 표시(입력 마크업은 정적 HTML). 외부 라이브러리 없음.

### 단위
pcf·% 고정. 본문 각주로 1 pcf = 0.157 kN/m³ 환산을 한 줄 안내.

## 3. 사실 검증 원칙
- 수치는 ASTM D698·D1557·D1556·D6938·D2216·D4718 값만 쓴다(research.txt §1–3). 시방 수치(95 %/90 %, ±2 %, 층 두께, 시험 빈도)는 "typical"로만 쓴다(§4). 조사 파일에서 근거가 약한 값은 숫자 없이 정성 서술.
- 계산기 기본값(§5)은 합성 예제이며 본문에 "example numbers"라고 밝힌다.
- 과목 코드 없음, 영어, 브랜드 토큰만, 푸터 저작권 문구 유지.
- 사진 크레딧: 캡션 저자·라이선스 + 말미 원본 링크·CC 딛 링크 + "resized and recompressed for the web".

## 4. 범위 제외
샌드콘 원자료 계산, 핵밀도계 습윤밀도 입력, SI 토글, D4718 굵은입자 보정 계산, OSHA 흙 분류/굴착 보호(별도 글 후보), Soil Testing Lab 3D.
