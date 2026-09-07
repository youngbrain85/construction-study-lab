# Study 목록 개편 — 짧은 제목·재료별 그룹·대표 사진 설계 스펙

- 날짜: 2026-09-07 / 상태: 사용자 승인(그룹 = 콘크리트/골재/철근/토양 + 측량)
- 대상: `site/shared/registry.js`, `site/study/index.html`, `site/shared/theme.css`, 새 폴더 `site/study/img/`
- 요청: "Study 들의 타이틀이 너무 길어. 간략하게. 콘크리트, soil 등으로 그룹을 나누고, 맨 앞 [PAGE] 파란 박스 대신 대표 사진을 올려줘. 사진은 라이선스 이슈 없는 걸로."

## 1. 문제

한 줄에 다 걸려 있습니다. 목록이 `Materials` 한 그룹에 여덟 편을 쌓아두고, 제목은 글 자체의 h1보다 길고("Concrete cylinders: from the mold to the acceptance decision" vs h1 "Concrete cylinders"), 설명문은 두세 줄짜리 문장이며, 왼쪽 첫 칸은 여덟 줄 모두 똑같은 `PAGE` 배지입니다. 목록을 훑어서 원하는 글을 찾기 어렵습니다.

## 2. 제목 — 카드에서 한 줄에 들어가게 30자 이하

여덟 중 넷은 그 글의 h1 을 그대로 쓰고(Air content and unit weight, Concrete cylinders, Sieve analysis, Compaction control), 나머지 넷은 h1 보다도 더 줄입니다(h1 "How to design a concrete mix" → 카드 "Mix design"). 규칙은 h1 일치가 아니라 **길이 상한**이고, `tools/registry.test.mjs`가 제목 30자·설명 90자를 강제합니다.

| id | 지금 | 바꿈 |
|---|---|---|
| mix-design-1 | How to design a concrete mix | **Mix design** |
| mix-design-2 | Worked example: a 3,000 psi beam | **Mix design: worked example** |
| slump-test | The slump test, step by step | **Slump test** |
| air-yield | Air content and unit weight | 그대로 |
| concrete-cylinders | Concrete cylinders: from the mold to the acceptance decision | **Concrete cylinders** |
| aggregate-gradation | Sieve analysis and the fineness modulus | **Sieve analysis** |
| rebar-tension | Testing reinforcing steel: the tension test | **Rebar tension test** |
| soil-compaction | Compaction control: the Proctor test and field density | **Compaction control** |

`desc`도 한 줄로 줄입니다(카드에서 두 줄을 넘지 않게):

| id | desc |
|---|---|
| mix-design-1 | The ten-step ACI 211.1 workflow, from slump to trial batch. |
| mix-design-2 | One 3,000 psi mix worked through to a checked 1 yd³ batch. |
| slump-test | ASTM C143 in the field: filling, rodding, the lift, and reading the result. |
| air-yield | The pressure meter (C231), and what density says about yield (C138). |
| concrete-cylinders | Making, curing and breaking them (C31/C39), and the ACI 318 acceptance rule. |
| aggregate-gradation | Grading by ASTM C136, the fineness modulus, and the C33 band. |
| rebar-tension | What ASTM A615 asks of a bar, and how ASTM A370 measures it. |
| soil-compaction | The Proctor curve, field density tests, and percent compaction. |

글 페이지의 `<title>`·`<h1>`·본문은 건드리지 않습니다. 목록만 바뀝니다.

## 3. 그룹

`STUDY_GROUPS`를 다섯으로 나눕니다(순서대로 렌더).

| id | name | blurb | 글 |
|---|---|---|---|
| `concrete` | Concrete | Mix design, and the tests that judge concrete fresh and hardened. | mix-design-1, mix-design-2, slump-test, air-yield, concrete-cylinders |
| `aggregate` | Aggregates | Grading, fineness modulus, and the limits a concrete aggregate must meet. | aggregate-gradation |
| `steel` | Reinforcing steel | What a bar is bought by, and how it is proven. | rebar-tension |
| `soils` | Soils | Compaction control and earthwork acceptance. | soil-compaction |
| `surveying` | Surveying | Leveling, traversing, and site layout. | (없음 → Coming soon 행) |

콘크리트 그룹 안 순서는 시험 흐름(설계 → 굳지 않은 콘크리트 → 굳은 콘크리트)입니다. 그룹 id는 `registry.js`·`study/index.html`·`registry.test.mjs` 세 곳에서만 쓰이므로 이름을 바꿔도 다른 링크가 깨지지 않습니다(확인함).

## 4. 카드 — 배지 대신 사진

왼쪽 첫 칸의 `PAGE` 배지를 120×80 대표 사진으로 바꿉니다(좁은 화면 84×56). 유형 표시(Page/PDF/External link)는 오른쪽 meta 칸에 이미 있으므로 잃는 정보가 없습니다. `Coming soon` 행은 같은 크기의 점선 자리를 유지해 격자가 어긋나지 않게 합니다.

- 파일: `site/study/img/<id>.jpg`, 360×240(표시 크기의 3배까지 감당), 개당 40 KB 이하, EXIF 제거.
- 레지스트리 항목에 `thumb: 'img/<id>.jpg'`(= `site/study/` 기준 상대경로) 추가.
- `<img alt="">` — 바로 옆 제목이 같은 내용을 말하므로 장식 이미지로 둔다. `loading="lazy"`, `width`/`height` 명시.

## 5. 사진 출처 — 여덟 중 일곱은 이미 사이트에 있다

글 8편이 라이선스 확인된 사진 30장을 이미 싣고 있고 크레딧도 각 글에 있습니다. 썸네일은 그 사진에서 잘라냅니다.

| 썸네일 | 원본 | 크레딧 |
|---|---|---|
| mix-design.jpg | `mix-design/img/pour.jpg` | 사이트 자체(강의 자료) |
| mix-design-example.jpg | **신규 1장** — Commons에서 공용/CC0 우선으로 받는다(콘크리트 보·거푸집·배치플랜트 계열) | 받는 사진의 라이선스에 따름 |
| slump-test.jpg | `slump-test/img/slump-hero.jpg` | Habib M'henni, CC BY 4.0 |
| air-yield.jpg | `air-yield/img/placing.jpg` | FHWA, public domain |
| concrete-cylinders.jpg | `concrete-cylinders/img/cylinder-hero.jpg` | Xb-70, public domain |
| aggregate-gradation.jpg | `aggregate-gradation/img/sieve-stack.jpg` | Habib M'henni, CC BY-SA 3.0 |
| rebar-tension.jpg | `rebar-tension/img/rebar-closeup.jpg` | W.carter, CC BY-SA 4.0 |
| soil-compaction.jpg | `soil-compaction/img/earthwork-hero.jpg` | Nixdorf, CC BY 4.0 |

CC BY·BY-SA 사진은 쓰이는 자리마다 저작자 표시가 필요하므로, **Study 목록 맨 아래에 크레딧 한 문단**을 둡니다 — 저작자·라이선스와 각 글 링크를 함께 적어, 원본 파일 페이지 링크는 해당 글의 크레딧 문단이 이어받게 합니다. 문구는 기존 규칙과 같은 `ref-note` 스타일.

## 6. 테스트

- `tools/registry.test.mjs`: 그룹 id 다섯 개와 순서, MATERIALS의 새 id 순서, 모든 `page` 항목이 `thumb`을 가지며 그 파일이 실제로 존재할 것.
- `tools/site-guards.test.mjs`: `study/img` 폴더에 정확히 8개의 `.jpg`, 각 40 KB 이하, 각 360×240(기존 JPEG SOF 판독기 재사용).
- 렌더 검증: 1440·390 캡처로 다섯 그룹·여덟 카드·썸네일·Coming soon 행을 눈으로 대조.

## 7. 범위 제외

글 페이지의 제목·본문 수정, 홈 화면 카드, Lab 목록, 썸네일 자동 생성 파이프라인(수동 스크립트 1회로 충분), 그룹별 정렬·필터 UI.
