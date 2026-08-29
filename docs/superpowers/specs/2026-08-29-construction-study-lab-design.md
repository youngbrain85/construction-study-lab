# Construction Study Lab — 개편 설계 스펙 (v2)

- 날짜: 2026-08-29
- 상태: 사용자 승인된 설계 (브레인스토밍 완료)
- 선행: `2026-08-28-mixlab-concrete-game-design.md` (v1, 완료·배포됨)
- 목적: v1 MixLab을 **Construction Study Lab** 허브의 첫 모듈 "Mix Design Lab"으로 개편.
  강의(CNST-111, "Lecture 3-1 Concrete Mix Design", ACI PRC-211.1-22 기반)와 절차·수치 정합,
  시험 연출 리얼리즘 강화, 확장 가능한 모듈 구조, 커스텀 도메인 준비.

## 1. 확정 결정 사항

| 항목 | 결정 |
|---|---|
| 사이트 타이틀 | **Construction Study Lab** (허브), 모듈은 "Mix Design Lab" |
| 구조 | 정적 멀티파일: `site/` 배포 루트 + 모듈 폴더. **단일 HTML 파일 요건 폐지**, `build.mjs` 삭제 |
| 확장성 | 허브의 `LABS` 배열 = 모듈 레지스트리. 새 모듈 = 폴더 + 배열 항목 1줄 |
| ACI 기준 | 강의가 따르는 **ACI PRC-211.1-22** — Step 7 절대용적법, f'cr 3단계 표, 수량 형상 보정, OD→SSD |
| 재료 | 강의 예제(Slide 19)와 완전 일치 (아래 §3) |
| 연출 | ASTM C143 절차 리얼리즘 (다짐 연출, 5초 인발, 뒤집은 콘+봉 측정), 드럼 믹서·UTM 사실화 |
| 도메인 | 사용자가 직접 구매. 구매 후 Netlify 연결·DNS는 이 프로젝트가 수행(스펙 범위: 연결 준비만) |
| 프레임워크 | 계속 금지. 바닐라 JS + Canvas, 외부 리소스는 Google Fonts(Inter)만 |

재량 판단(승인됨): ① 단일파일 폐지 ② 미션별 골재 형상: slab·wall=rounded / bridge·column·pavement=crushed ③ 허브 Coming soon 잠금 카드 2개(이름 없는 placeholder).

## 2. 파일 구조

```
site/                              ← Netlify 배포 루트 (dev 서버도 이 폴더 서빙)
├── index.html                     # 허브 (LABS 레지스트리 + 모듈 카드)
├── shared/theme.css               # 공통 디자인 토큰·컴포넌트 CSS
└── labs/mix-design/
    ├── index.html                 # 모듈 (v1 index.html 이관 + 개편, ../../shared/theme.css 로드)
    └── engine.js                  # 엔진 (v1 이관 + §3 변경)
engine.test.mjs                    # 루트 유지, ./site/labs/mix-design/engine.js 로드
.claude/launch.json                # python -m http.server 8123 --directory site
```

- 허브 카드 → `labs/mix-design/` 링크. 모듈 앱바에 "← All Labs" 브레드크럼(`../../`).
- `<title>`: 허브 `Construction Study Lab`, 모듈 `Mix Design Lab — Construction Study Lab`.
- README 갱신 (새 구조·타이틀·URL).

## 3. 엔진 변경 (ACI PRC-211.1-22 정합)

### 3.1 재료 상수 (강의 Slide 19와 일치)

```
MAT = { sgCement: 3.15,
        sgCA: 2.68,  absCA: 0.005,  druwCA: 100,   // well-graded gravel, SSD RD·흡수율·건조봉다짐밀도
        sgFA: 2.64,  absFA: 0.007,  fmSand: 2.60,  // natural sand
        wUnit: 62.4 }
```

FM 2.60은 b/b₀ 표의 정확한 열(보간 불필요). CA_VOLUME_TABLE·WATER_TABLE·WC_TABLE·targetAir는 v1 그대로.
**FRESH_WEIGHT_TABLE(중량법 표)은 삭제** — 데이터·테스트·UI 모두.

### 3.2 골재 형상과 수량 보정

- `Mix.aggShape: 'rounded' | 'crushed'` 추가. `SHAPE_FACTOR = { rounded: 0.92, crushed: 1.0 }`
- `predictSlump`: 수량 앵커(W1,W2,W3)에 SHAPE_FACTOR를 곱한 뒤 기존 조각별 선형 역산.
  (rounded는 같은 슬럼프에 8% 적은 수량 — 강의 Slide 11의 −8% 규칙의 역방향 일관 구현)
- MISSIONS에 `aggShape` 추가: slab·wall = 'rounded', bridge·column·pavement = 'crushed'.

### 3.3 f'cr 3단계 규칙 (강의 Slide 12)

```
fcrFor(fc) = fc < 3000     → fc + 1000
             3000 ≤ fc ≤ 5000 → fc + 1200
             fc > 5000     → 1.1·fc + 700
```
`MixEngine.fcrFor` 로 노출(테스트·표시용). 판정에는 불사용(w/c는 여전히 자유 입력).

### 3.4 판정 앵커 — 새 교과서 배합 = 강의 예제 (Slide 20–25)

미션 1(Residential Slab, fc 3000, 슬럼프 3–4, NMAS 1", 비공기연행, rounded):
water **299** / CM **544** / CA(SSD) **1,872** / FA(SSD) **1,292** / air **1.5%**

사전 검산(엔진 수식 기준):
- 슬럼프: 1" 비AE 앵커 [300,325,340]×0.92 = [276, 299, 312.8] → water 299 → **3.5 in** (true slump)
- 강도: w/c = 299/544 = 0.5496 → Abrams 18000/14.6^0.5496 ≈ **4,124 psi** ≥ 3,000 ✓
- 수율: 2.7676 + 4.7917 + 11.1940 + 7.8428 + 0.405 = **27.00 ft³** (오차 < 0.01) ✓
- 채점: 40+40+10+10 = **100 / A** — 엔진 테스트의 기준 시나리오

`computeYield`·`classifyBehavior`·강도 모델·채점 수식은 v1 유지(§3.1 상수 변경만 반영).
shear 반감 규칙(v1 final fix) 유지.

## 4. 위저드 변경 (모듈 UI)

| 스텝 | 변경 |
|---|---|
| 1 Slump | 참고표를 강의 표로 교체: Footings and Slabs 2–5 / Beams and reinforced walls 3–5 / Building columns 3–5 (in.) |
| 2 NMAS | 참고 노트에 "≤ 1/3 of slab depth" 추가 (ACI 318 3규칙 완성) |
| 3 Water·Air | Materials 카드에 골재 형상 명시("well-rounded river gravel" 등) + 참고 노트: 형상 보정 표(crushed = table value / rounded = start at −8%). 학생이 보정한 수량을 입력 |
| 4 w/cm | 참고 패널에 **f'cr 3단계 표** 추가. 자동 계산 힌트 제거 → "Assume no strength record. Read the f'cr table first." |
| 5 CM | 변경 없음 |
| 6 CA | 공식 카드 2단: OD = (b/b₀)×27×DRUW → **SSD = OD×(1+A)**. 입력 = SSD weight |
| 7 FA | **절대용적법 워크시트로 교체**: 공식 `V (yd³) = mass ÷ (RD × 1,685)`. 입력 5칸 — V_cm, V_water, V_ca, V_air(yd³, 학생 계산) + 워크시트가 `V_fa = 1.000 − Σ` 자동 표시 → FA weight(SSD) 입력. 용적 4칸은 학습용(판정 불사용), ready()는 5칸 모두 입력 시 |

- `game.design`에 워크시트 필드 추가: `vCm, vWater, vCa, vAir` (판정 미사용).
- Summary에 절대용적 합(yd³) 행 추가. 중량법 잔재(추정 단위중량 표) 완전 제거.

## 5. 시험 연출 리얼리즘 (Canvas 재디자인, ASTM C143 근거)

### 5.1 슬럼프 장면
- 무대: 강철 base plate(클램프·발판), 금속 콘 — 광택 그라데이션 + 상·하 림 + 손잡이 2 + 발판 2, 비율 8"/4"/12" 정확, 상부 좌측 광원 + 접지 그림자
- 콘크리트 재질: 회갈색 그라데이션(#6f6e6a→#8a8884 계열) + 불규칙 다각형 굵은골재(갈색·회색 톤, 시드 고정) + 잔골재 노이즈 + 상부 젖은 광택
- 절차 연출: 3층 채움(스쿱) → **층당 25회 다짐봉 왕복 + 카운터** → **인발 타이머 5초 표시** → 변형 →
  **뒤집은 콘을 옆에 세우고 다짐봉을 그 위에 수평으로 걸친 뒤, 봉 아래에서 변위된 원중심까지 수직 측정** (v1 점선·화살표 연출 대체)
- 거동: true = 완만한 돔 / shear = 절반 웨지 미끄러짐 / collapse = 팬케이크 + 가장자리 골재 분리 + 블리딩 수막(반사 하이라이트) / zero = 원형 유지·거친 표면

### 5.2 믹싱 장면
경사식 포터블 드럼 믹서: 주황 프레임 + 바퀴 + 모터 하우징, 기울어진 드럼 개구부로 내부 반죽 보임, 버킷 투입 연출, 반죽 질감(골재+광택, w/c 반영 유지)

### 5.3 압축 장면
실제 UTM 룩: 2포스트 프레임 + 유압 하부 램 + **디지털 로드 인디케이터 패널**(별도 박스에 psi·lbf 표시), 공시체 캡핑 표현, 파괴 유형은 ACI 도식(Type 1 원추 / 기둥형 쪼개짐 / 부스러짐) 유지·정밀화

전부 Canvas 절차 렌더(이미지 에셋 금지), 시드 고정. 기존 rAF 수명주기·폴백·타임라인 구조 유지.

## 6. 허브 + 디자인 시스템

- **허브**: 앱바(⬢ Construction Study Lab) → 히어로(타이틀 + "Interactive labs for construction materials — CNST-111") → 모듈 카드 그리드:
  - Mix Design Lab 카드(활성): 아이콘/일러스트, 한 줄 설명, 미션 수 배지, localStorage 최고 등급 표시, "Enter Lab →"
  - Coming soon 카드 ×2: 잠금 아이콘 + "New lab coming soon" (이름 없음)
  - 푸터(코스명·크레딧)
- **`shared/theme.css`**: v1 디자인 시스템을 추출·정제(토큰, 앱바, 카드, 버튼, 배지, 표, 입력, 스텝퍼, 캔버스 무대) — 허브·모듈 공용. 폴리시: hover 트랜지션, 섀도·라운드 정돈, Inter 유지
- localStorage 키 `mixlab-best` 유지(하위 호환)

## 7. 배포 / 도메인

- Netlify 기존 사이트(f9c6c718…, mixlab-concrete-game.netlify.app)에 **site/ 디렉터리 배포**
- 커스텀 도메인: 사용자가 구매(결제는 사용자 직접). 구매 후 도메인명 수령 → Netlify 도메인 연결 + DNS 레코드 안내·적용은 후속 작업(이 스펙 범위 밖, 준비만)

## 8. 테스트·검증

1. 엔진 테스트 전면 갱신: 새 MAT 상수, SHAPE_FACTOR 반영 앵커(276/299/312.8), `fcrFor` 3규칙,
   **강의 예제 재현 테스트**(§3.4 수치 → total 100·grade A·yield 27.00±0.05), FRESH_WEIGHT 테스트 삭제, 기존 collapse/zero/shear 시나리오를 새 재료 기준으로 재캘리브레이션
2. 플레이 검증 3종(교과서 299 / 과수 +100 / 과소 −100) E2E 재실행
3. 시각 QA: 허브·믹서·슬럼프 4거동·UTM — 브라우저 페인 표시 시 스크린샷 대조, 불가 시 픽셀 RGBA 검증
4. 배포 검증: Netlify URL에서 허브 → 모듈 진입 → 플레이 1회

## 9. 범위 제외 (YAGNI)

두 번째 모듈 콘텐츠, 도메인 구매·연결 실행, 계정/서버 저장, 사운드, 한국어 토글, 골재 함수보정(Slide 17 — v1 결정 유지), 혼화제.
