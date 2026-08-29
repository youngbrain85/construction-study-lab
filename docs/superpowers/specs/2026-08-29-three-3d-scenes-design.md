# Three.js 3D 장면 전환 설계 스펙 (v3)

- 날짜: 2026-08-29 / 상태: 사용자 승인("알아서 해봐" — 재량 3건 포함 위임)
- 선행: v2 스펙(2026-08-29-construction-study-lab-design.md). 이 문서는 시각 레이어 전환만 다룸.

## 1. 결정 사항

| 항목 | 결정 |
|---|---|
| 범위 | MIX·SLUMP·COMPRESSION 세 장면 전부 Three.js WebGL 3D로 재작성. **게임플레이·엔진·판정·버튼 흐름·타임라인·배지 계약 완전 불변** |
| 도입 | three.js **self-host**: `site/shared/vendor/three.module.js` (단일 ES module, 버전 고정, CDN 요청 없음) |
| 제약 개정 | "프레임워크 금지" → "UI 프레임워크 금지. 3D 렌더 라이브러리(three.js self-host)는 허용". 외부 리소스는 여전히 Google Fonts만 |
| 텍스트/판독 | **HTML 오버레이**(캔버스 위 absolute DOM): Rodding 카운터, Lifting 타이머, 슬럼프 치수, psi/lbf 판독, 캡션 — 3D 내 텍스트 스프라이트 금지 |
| 폴백 | WebGL 생성 실패 시 기존 `canvasFallback`(수치 요약+진행 버튼). **기존 2D 캔버스 드로잉 코드는 삭제** |
| 검증 훅 | 각 장면이 `window.__scene3dDebug = { renderAt(t), renderer }`를 마운트 중에만 노출 — 히든 페인에서 수동 렌더+픽셀 검증용. renderer는 `preserveDrawingBuffer:true` |

## 2. 공통 모듈 `site/labs/mix-design/scene3d.js` (ES module)

- `import * as THREE from '../../shared/vendor/three.module.js'`
- `window.Scene3D`로 노출 (모듈 로드는 `<script type="module" src="scene3d.js">`, 앱 스크립트는 기존 클래식 유지 — 장면 진입 시 `window.Scene3D` 존재 확인, 없으면 폴백)
- 제공: `createStage(container, {w,h,camera})` → {renderer(DPR≤2, 그림자 PCFSoft, ACES 톤매핑, preserveDrawingBuffer), scene, camera(3/4 뷰), lights(키+필+림), ground(그림자 수신), dispose()} / `concreteMaterial(wc)`(회갈색, w/c로 광택·명도) / `aggregateField(seedFn, count, region)`(InstancedMesh 자갈) / `steelMaterial`, `orangeMaterial` 등 공용 재질 / `disposeDeep(obj)`
- 시드는 엔진 `MixEngine.mulberry32`만 사용(Math.random 금지 — three 내부는 예외)

## 3. 장면별 요구 (필수 요소)

### 3.1 MIX — 실사진 기반 틸팅 드럼 믹서 (레퍼런스 `.superpowers/sdd/hotfix/mixer-ref.jpg`)
LatheGeometry 드럼(허브→벨리→목→밝은 림, ~42° 틸트, 축 회전) / **핸드휠은 트러니언 축에 직결**(크래들 측면 — v2 지적 반영) / 검정 A-프레임+바퀴 2+고정 발 / 모터 하우징+케이블 / 내부 반죽(회전 시 쓸림)+골재 인스턴스 / 버킷 투입(시멘트→물→골재 캡션 순서 유지) / 카메라 미세 orbit. 4초 후 Continue·Skip 계약 유지.

### 3.2 SLUMP — ASTM C143
강철 base plate·금속 콘(금속 반사, 손잡이·발판)·다짐봉 / 3층 채움+로드 왕복(카운터 오버레이 25회) / 5초 인발(타이머 오버레이) / **콘크리트 변형 = lathe 프로파일 모핑**: true 돔 / shear 절반 웨지 분리 / collapse 팬케이크+반사 수막(광택 평면)+가장자리 골재 / zero 원형 유지 / 측정: 뒤집은 콘+수평 봉+3D 치수선, 수치는 오버레이 `Slump: X.XX in.` / 거동 배지 4종 문구·클래스 불변.

### 3.3 COMPRESSION — ASTM C39
2포스트 UTM(크로스헤드·로드셀·베드)·유압 하부 램 상승 / 캡핑 공시체 / 파괴 3유형(cone: 원추 분리면, columnar: 수직 쪼개짐 균열, crumble: 파편 낙하 — 지오메트리로) / 판독(7-seg풍)·그래프·Day 카운터·공시체 n/3은 **HTML 오버레이**(그래프는 오버레이 내 2D 캔버스 허용) / stressAt·타임라인·failMode·피크 고정·done 캐치업 로직 값 그대로 이식.

## 4. 수명주기·성능

- mount: 스테이지 생성+`renderer.setAnimationLoop` / unmount: 루프 정지+`disposeDeep`+`renderer.dispose()`+`__scene3dDebug` 제거
- 종료 상태(측정 완료·3본 완료) 도달 후 루프 정지(마지막 프레임 유지) — v2 finished 패턴 이식
- 픽셀 예산: 장면당 draw call < 100, 골재 인스턴스 ≤ 400

## 5. 검증

엔진 테스트 19/19 불변(엔진 무변경). E2E 3종(강의 예제 A/100·+100 collapse·−100 zero)을 3D 장면 경유로 재실행. 장면별 픽셀 증거(`renderAt(t)` + readPixels/toDataURL). WebGL 폴백 경로 확인. 배포 후 라이브 검증.

## 6. 범위 제외

허브·위저드·리포트 화면(2D DOM 유지), 엔진 변경, 텍스처 이미지 파일(절차 재질만 — three.js 파일 자체는 예외), 모바일 최적화 심화, OrbitControls 등 부가 조작.
