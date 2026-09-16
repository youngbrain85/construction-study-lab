# Mix Design Lab — Step 3 물 입력 두 단계화 + OD/SSD 구분 제거 설계 스펙

- 날짜: 2026-09-16 / 상태: 사용자 승인("진행해줘. 바로 구현까지")
- 대상: `site/labs/mix-design/index.html`(위저드 UI), `site/labs/mix-design/engine.js`, `engine.test.mjs`
- 배경 조사: 2026-09-15 세션의 슬럼프 판정 검토(아래 §1)

## 1. 배경 — 왜 "정확히 했는데 too wet" 인가

Slab·Wall 미션의 굵은골재는 **rounded gravel** 이고, 엔진은 그 경우 ACI 수량 표의 앵커를 `SHAPE_FACTOR.rounded = 0.92` 로 낮춘다(1" NMAS: 표 325 → 엔진 299). 학생이 표 값 325 를 그대로 넣으면 엔진은 8.7 % 초과 수량으로 보고 표 위쪽 기울기로 외삽해 9.15 in. → collapse 판정을 낸다.

문제는 학생이 **물을 정하는 화면(Step 3)에 이 미션이 rounded 라는 정보가 없다**는 것이다. 형상은 오른쪽 "Materials Lab Report" 표의 `2.68 SG (SSD) — Well-rounded river gravel` 꼬리표에만 있고, Step 3 카드의 안내("Well-rounded gravel: start with an 8% reduction")는 어느 미션이 해당하는지 말하지 않는다.

같은 검토에서 확인한 사실 둘은 **이 스펙의 범위 밖**이다(§6):
- 엔진의 표 위쪽 기울기(4.6 lb 당 1 in.)가 랩이 인쇄한 경험칙(10 lb 당 1 in.)보다 2.3배 가파르다.
- Column 미션에서 경험칙대로 3–4행 + 10 lb 를 넣으면 정확히 5.00 in. 이 나와 측정 노이즈로 절반은 범위 밖이 된다.

## 2. 범위

A. Step 3 의 물 입력을 **Initial water(표 값) → Adjusted water(형상 보정)** 두 필드로 나누고, 그 사이에 **이 미션의 골재 형상**을 명시한다.
B. 랩에서 **OD/SSD 구분과 흡수율 표시를 없앤다** — 랩에는 함수율 보정 단계가 없어 구분이 허상이다.

Study 글(`site/study/mix-design/`)은 건드리지 않는다. 거기에는 함수율 보정(Step 9)이 있어 SSD 표기가 맞다.

## 3. A — Step 3 새 구성

```
Mix type            [Non-air-entrained] [Air-entrained]                 (그대로)
Initial water       [ 325 ] lb/cu yd
                    Read the row for your slump and the column for your aggregate size.
┌ This mission's coarse aggregate: Well-rounded river gravel — reduce the table value by 8 % (× 0.92). ┐
Adjusted water      [ 299 ] lb/cu yd
                    Suggested: 325 × 0.92 = 299. The batch uses the value in this field.
Target air content  [ 1.5 ] %                                           (그대로)
```

- `design.waterInitial`(신설) — 학생이 표를 읽어 입력.
- 형상 줄 — `game.mission.aggShape` 에 따라 두 문구 중 하나. crushed: `Crushed stone (angular) — use the table value as-is (× 1.00).`
- `design.water`(기존, 엔진·Step 4 시멘트·Step 7 용적·요약이 그대로 사용) — **Adjusted**. Initial 이 확정될 때마다 `shapeAdjustedWater(initial, aggShape)` 로 덮어쓴다. 학생이 Adjusted 를 직접 고친 값은 Initial 을 다시 바꾸기 전까지 유지한다(Step 7 자동 채움과 같은 규칙).
- 자동 채움은 **재렌더 없이** Adjusted 의 `<input>`·힌트 요소만 갱신한다(`numField` 는 포커스 유실 방지를 위해 재렌더를 금지한다). 타이핑 중간값("3", "32")으로 파생값이 튀지 않도록, `input` 이벤트에서는 값이 `[min, max]` 안일 때만, `change` 에서는 항상 갱신한다.
- `ready`: `waterInitial != null && water != null && airPct != null`.
- Step 3 오른쪽 참고 패널(수량 표 2개, 일반 형상 안내 카드)은 그대로 둔다.

## 4. B — OD/SSD 구분 제거 (랩만)

| 위치 | 지금 | 바꾼 뒤 |
|---|---|---|
| 재료 카드 | `Cement specific gravity 3.15` / `Coarse aggregate 2.68 SG (SSD) — Well-rounded…` / `Coarse agg. absorption 0.5%` / `Fine agg. specific gravity (SSD) 2.64` / `Fine agg. absorption 0.7%` / 각주 "All aggregates assumed at SSD condition." | `Cement relative density 3.15` / **`Coarse aggregate  Well-rounded river gravel`(형상이 독립 행)** / `Coarse agg. relative density 2.68` / `Coarse agg. dry-rodded unit weight 100 lb/cu ft` / `Fine agg. relative density 2.64` / `Fine agg. fineness modulus 2.60` — 흡수율 행·각주 삭제 |
| Step 6 공식 카드 | `OD weight = (b/b₀) × 27 cu ft × dry-rodded unit weight` + `SSD weight = OD × (1 + absorption)` | `weight = (b/b₀) × 27 cu ft × dry-rodded unit weight` 한 줄 |
| Step 6 입력 라벨 | `Coarse aggregate (SSD basis)` | `Coarse aggregate` |
| Step 7 입력 라벨 | `Fine aggregate (SSD basis)` | `Fine aggregate` |
| 엔진 `MAT` | `absCA: 0.005, absFA: 0.007`(계산에 미사용, 표시 전용) | 삭제. 테스트가 `undefined` 를 확인 |

"specific gravity" → "relative density" 통일은 Step 7 힌트·Study 글과 용어를 맞추기 위한 것이며, 바꾸는 행 안에서만 한다.

**따라오는 수치 변화**: Step 6 의 자연스러운 정답이 `0.69 × 27 × 100 = 1,863 lb`(지금은 ×1.005 로 1,872)가 되고 Step 7 잔골재는 약 1,302 lb 가 된다. 엔진은 두 값을 그대로 받으므로 채점 차이는 없다(굵은골재 9 lb ≈ 수율 0.002 yd³). Study Part 2 의 1,872 / 1,292(SSD)는 그대로 둔다 — 그 글은 함수율까지 다루는 완전한 절차다.

## 5. 엔진

```js
// 형상 보정 수량: 표 값(각진 쇄석 기준) × 형상 계수, 정수 lb — Step 3 Adjusted water 자동 채움이 쓴다
function shapeAdjustedWater(waterInitial, aggShape) {
  if (!Number.isFinite(waterInitial)) return null;
  return Math.round(waterInitial * (SHAPE_FACTOR[aggShape] ?? 1.0));
}
```
`MixEngine` 에 export. `predictSlump` 와 같은 `SHAPE_FACTOR` 를 쓰므로 0.92 가 한 곳에만 있다. 예: 325 rounded → 299, 340 rounded → 313(312.8 반올림), 340 crushed → 340, 형상 누락 → 그대로, 비수치 → null.

## 6. 범위 제외

- 엔진 슬럼프 기울기·Column 경계값 문제(§1) — 별도 결정.
- Study 글의 SSD·흡수율·함수율 내용.
- 요약(Mix summary)에 Initial water 행 추가 — 불필요.
- 새 CSS — 없음(기존 `.num-field`·`.hint`·`.card` 사용).

## 7. 테스트·검증

- `engine.test.mjs`: DATA 테스트에서 `absCA`/`absFA` 가 `undefined` 임을 확인(기존 `FRESH_WEIGHT_TABLE` 과 같은 방식); `shapeAdjustedWater` 5개 케이스. 게이트(`node --test engine.test.mjs tools/*.test.mjs`) 통과.
- 화면 검증(컨트롤러가 Browser 페인에서 직접): Slab 미션으로 Step 3 까지 진행해 (1) 형상 줄이 "Well-rounded river gravel" 을 말하는지, (2) Initial 325 입력 후 Adjusted 가 299 로 채워지고 힌트에 산식이 보이는지, (3) Adjusted 를 305 로 고친 뒤 Initial 을 330 으로 바꾸면 304 로 다시 채워지는지, (4) 재료 카드에 SSD·absorption 이 없고 형상이 독립 행인지, (5) Step 6 카드가 한 줄 공식·`Coarse aggregate` 라벨인지, (6) Step 7 라벨이 `Fine aggregate` 인지 캡처로 확인. Bridge(crushed) 미션에서 형상 줄이 `× 1.00` 문구인지도 확인.
