# Lab 페이지 3D 랩실 설계 스펙 (v5)

- 날짜: 2026-09-05 / 상태: 사용자 승인(브레인스토밍 5개 섹션 모두 "진행")
- 선행: v4 브랜드 사이트 스펙(2026-09-02-isu-brand-site-design.md), three.js 3D 장면 스펙(2026-08-29-three-3d-scenes-design.md). 이 문서는 `/labs/` 페이지 한 장만 다룬다.

## 1. 결정 사항

| 항목 | 결정 |
|---|---|
| 목표 | `/labs/`에 들어가면 **가상 Construction Lab실이 3D로** 보인다. 방 안 스테이션을 클릭하면 개별 랩 페이지로 이동한다 |
| 이번 범위 | **3D 방만.** 실제 랩으로 연결되는 스테이션은 Mix Design 하나. Soil Testing·Steel·Wood Framing·Surveying은 장비 모형 + "Coming soon" 라벨만(각 랩은 이후 별도 프로젝트) |
| 페이지 구성 | **3D 방 한 화면(스크롤 없음).** 지금의 텍스트 목록은 화면에서 제거하고, WebGL이 안 되거나 3D 모듈 로드가 실패할 때만 대체 화면으로 그린다 |
| 시점·조작 | **고정 카메라(위에서 내려다보는 3/4 뷰) + 호버 강조 + 클릭.** 회전·줌·OrbitControls 없음. 세로 화면은 카메라 방위만 바꿔 자동 프레이밍 |
| 구현 방식 | **절차적 로우폴리 3D(three.js r170 self-host).** 외부 3D 파일(glTF 등)·텍스처 이미지 없음. Mix Design 모듈의 믹서·슬럼프·UTM 빌더를 소품으로 재활용 |
| 데이터 | 레지스트리(`site/shared/registry.js`)의 `LABS` 항목이 `station` 키로 방의 스테이션에 매핑된다. 새 랩 = 항목의 `href` 추가 + `active:true` — 그것만으로 스테이션이 켜진다 |
| 브랜드 | v4 제약 그대로: 로고·잎·[IN]·이모지 없음, ISU 팔레트·서체, radius 2px, 3D 안에 글자 없음(라벨은 HTML 오버레이) |
| 외부 리소스 | Google Fonts만. three.js는 기존 `site/shared/vendor/three.module.js`(r170) 재사용, CDN 요청 없음 |

## 2. 페이지 구조 — `site/labs/index.html`

### 2.1 DOM

```html
<body class="section-page room-page">
<header class="appbar">…v4와 동일(로고 → ../, 내비 Lab(활성)·Study)…</header>
<main class="room-main">
  <h1 class="visually-hidden">Lab</h1>
  <div class="room-viewport" id="room" role="region" aria-label="Virtual construction lab">
    <div class="room-caption">
      <p class="eyebrow">01 · Interactive labs</p>
      <p class="room-hint">Pick a station</p>
    </div>
    <div class="room-labels" id="room-labels"></div>
    <div class="room-fade" aria-hidden="true"></div>
  </div>
  <div id="fallback" class="section-main" hidden></div>
</main>
<footer class="site-footer">© <span id="year"></span> Jisoo Park. All rights reserved. / ← Home</footer>
<script src="../shared/registry.js"></script>
<script src="../shared/dom.js"></script>
<script src="lab-list.js"></script>
<script>
  document.getElementById('year').textContent = new Date().getFullYear(); // 경로와 무관하게 항상
  // 3D 모듈이 12 s 안에 body.room-page--3d 를 붙이지 못하면(404·구문 오류 등) 대체 목록을 띄운다
  window.__labRoomGuard = setTimeout(() => {
    if (!document.body.classList.contains('room-page--3d')) LabList.showFallback('module-timeout');
  }, 12000);
</script>
<script nomodule>LabList.showFallback('nomodule');</script>
<script type="module" src="room/lab-room.js" onerror="LabList.showFallback('module-error')"></script>
```

`<head>`에는 `<link rel="modulepreload" href="../shared/vendor/three.module.js">`와 `<link rel="modulepreload" href="mix-design/scene3d.js">`를 둔다(lab-room → scene3d → three 직렬 import 체인의 대기 제거).

- 지금의 `.band-dark .section-head`(큰 "LAB" 제목 띠)와 `main#groups`는 **삭제**한다. 눈썹 문구 "01 · Interactive labs"는 뷰포트 왼쪽 위 캡션으로 옮긴다. 페이지 헤딩 구조는 시각적으로 숨긴 `<h1>Lab</h1>`로 유지한다(`.visually-hidden` 유틸을 theme.css에 추가). `<h1>`은 `#room` 밖, `main`의 첫 자식에 둔다 — 대체 화면에서 `#room`이 숨겨져도 헤딩이 남아야 한다.
- 3D 모듈이 아예 실행되지 못해도(404·구문 오류·`nomodule` 브라우저·12 s 타임아웃) 인라인 클래식 스크립트가 `LabList.showFallback`으로 목록을 그린다 — v4처럼 클래식 스크립트만으로도 Mix Design Lab 링크가 항상 존재한다. `lab-room.js`는 마운트 성공 시 `clearTimeout(window.__labRoomGuard)`를 호출하고, 가드가 먼저 대체 목록을 띄웠으면(`#fallback` 표시 중) 3D를 만들지 않는다(경합 방지).
- 푸터 연도는 인라인 스크립트가 항상 채운다(3D·대체 경로 무관).
- 렌더러 캔버스는 `#room` 안에 삽입되며 `role="img"`, `aria-label="Top-down view of the virtual construction lab"`를 갖는다. 3D 안의 정보는 전부 라벨(§5.4)로 DOM에 중복 노출되므로 캔버스 자체는 장식이다.

### 2.2 레이아웃 CSS (`theme.css`에 `.room-*` 블록 추가)

- `body.room-page { min-height:0; height:100vh; height:100dvh; overflow:hidden; }` — `.section-page { min-height:100vh }`를 `min-height:0`으로 눌러야 한다. 안 그러면 iOS 주소창 표시 상태에서 100vh > 100dvh라 body가 화면보다 길어지고 푸터가 잘린다. 페이지 전체는 스크롤하지 않는다(뷰포트 높이 ≥ 641px 기준).
- `@media (max-height:640px) { body.room-page { height:auto; min-height:100dvh; overflow:auto; } .room-viewport { flex:none; height:420px; } }` — 가로로 눕힌 폰(844×390)·낮은 창에서는 방을 420px 고정 높이로 두고 페이지가 자연 스크롤한다. "한 화면·스크롤 없음"은 1440×900과 390×844 기준 목표이지 불변 조건이 아니다.
- `.room-main > [hidden] { display:none !important; }` — `.section-main { display:flex }`가 UA의 `[hidden]`을 이기므로 명시한다(안 그러면 빈 `#fallback`이 `flex-grow:1`로 뷰포트 높이의 절반을 차지한다).
- `.visually-hidden { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }`
- `.room-main { flex:1; min-height:0; display:flex; flex-direction:column; max-width:none; margin:0; padding:0; overflow:auto; }` — 대체 목록이 보일 때는 `main` 안에서만 스크롤한다.
- `.room-viewport { position:relative; flex:1; min-height:0; background:var(--icy); overflow:hidden; }` — 3D 첫 프레임 전에도 Icy 배경과 캡션이 먼저 보인다.
- `.room-caption { position:absolute; left:40px; top:28px; z-index:2; pointer-events:none; }` / `.room-hint { font:400 15px/1.4 var(--font); color:var(--muted); margin:4px 0 0; }`
- `.room-labels { position:absolute; inset:0; z-index:3; pointer-events:none; }` — 자식 라벨만 `pointer-events:auto`.
- `.room-fade { position:absolute; inset:0; z-index:4; background:var(--dark); opacity:0; pointer-events:none; transition:opacity .45s ease-out; }` / `.room-fade.is-on { opacity:1; }`
- `#fallback { padding:40px 40px 64px; }` — `hidden` 해제 시 v4 목록 스타일(`.group`, `.ledger-row`) 그대로.
- ≤700px: `.room-caption { left:20px; top:18px; }`, `#fallback { padding:28px 20px 40px; }`.

### 2.3 상태

| 상태 | 화면 |
|---|---|
| 로딩(모듈 다운로드 중) | Icy 배경 + 캡션만. 스피너 없음 |
| 3D 정상 | 방 + 라벨. `body`에 `room-page--3d` 클래스 추가 |
| 대체(`?no3d=1`, WebGL 실패, import 실패, 마운트 중 예외) | `LabList.showFallback(reason)`: `.room-viewport`에 `hidden`, `#fallback`에 v4 목록 렌더, `console.warn('[LabRoom] fallback:', reason)` |
| 모듈 자체 실행 불가(404·구문 오류·`nomodule`·12 s 타임아웃) | 인라인 가드(§2.1)가 같은 `LabList.showFallback`을 호출 |
| WebGL 컨텍스트 손실(`webglcontextlost`) | 루프 정지 후 `LabList.showFallback('context-lost')` |
| bfcache 복원(뒤로 가기, `pageshow.persisted`) | 페이드 제거·카메라 재적용·루프 재개·Best grade 재계산(§5.3). 대체 목록이 떠 있었다면 목록 재렌더 |
| 탭 백그라운드 | 렌더 루프 정지, 복귀 시 재개 |
| 유휴 20 s(포인터·키 입력 없음) | 루프 정지(마지막 프레임 유지), 입력이 오면 재개 |

`?no3d=1` 쿼리는 검증용 강제 대체 스위치다(문서화만, UI 노출 없음).

## 3. 레지스트리 변경 — `site/shared/registry.js`

```js
const STATION_KEYS = ['mix', 'soil', 'steel', 'wood', 'survey'];

const LABS = [
  { id: 'mix-design', group: 'material', station: 'mix', name: 'Mix Design Lab', href: 'mix-design/',
    desc: 'Proportion a concrete mix with the ACI tables, then put it through virtual slump and strength tests.',
    meta: '5 missions · ACI PRC-211.1-22', bestKey: 'mixlab-best', active: true },
  { id: 'soil-testing',  group: 'material', station: 'soil',   name: 'Soil Testing Lab',  active: false },
  { id: 'steel',         group: 'material', station: 'steel',  name: 'Steel Lab',         active: false },
  { id: 'wood-framing',  group: 'material', station: 'wood',   name: 'Wood Framing Lab',  active: false },
  { id: 'surveying',     group: 'survey',   station: 'survey', name: 'Surveying Lab',     active: false },
];
```

- `SITE`에 `STATION_KEYS`를 추가 노출한다. 이름 없는 `material-soon`/`survey-soon` 항목은 **삭제**한다.
- 계약: 모든 `LABS` 항목은 `station ∈ STATION_KEYS`를 갖고, 한 스테이션에 랩은 최대 1개. `active:true`면 `href`·`desc`·`meta`가 있어야 한다. (`tools/registry.test.mjs`에 테스트 추가)
- 대체 목록(§6)의 Coming soon 행은 이제 실제 이름을 쓴다: 제목 `lab.name`, 메타 `—`, 태그 `Soon`. 그룹에 항목이 하나도 없을 때의 "New lab coming soon" 행은 그대로 둔다.
- 홈·Study 페이지는 바뀌지 않는다.

## 4. 방 레이아웃 — `site/labs/room/layout.js` (순수 데이터·계산, three.js 의존 없음)

좌표계: 1 유닛 = 1 m, +x 오른쪽(동), +z 앞(남, 카메라 쪽), +y 위. 방 중심이 원점.

```js
const ROOM   = { xMin: -6, xMax: 6, zMin: -4.5, zMax: 4.5, wallH: 3.2 };           // 12 m × 9 m
const YARD   = { xMin: 6, xMax: 11, zMin: -4.5, zMax: 4.5 };                       // 베이 도어 밖 마당 5 m
const DOOR   = { x: 6, zMin: -2, zMax: 2, h: 2.8 };                                // 동쪽 벽 자리의 열린 셔터 문틀
const BOUNDS = { min: { x: -6.4, y: 0, z: -4.9 }, max: { x: 11.4, y: 3.2, z: 4.9 } }; // 카메라 맞춤 대상

const STATIONS = [ // center = 바닥 발자국 중심, size = 발자국(w: x 방향, d: z 방향), labelY = 라벨 앵커 높이
  { key: 'mix',    center: { x: -3.5, z: 2.2 },  size: { w: 3.6, d: 3.0 }, labelY: 2.3 },
  { key: 'soil',   center: { x: -3.5, z: -2.6 }, size: { w: 3.6, d: 2.4 }, labelY: 2.3 },
  { key: 'steel',  center: { x: 3.4,  z: -2.6 }, size: { w: 3.4, d: 2.4 }, labelY: 2.6 },
  { key: 'wood',   center: { x: 3.5,  z: 2.2 },  size: { w: 3.6, d: 3.0 }, labelY: 2.6 },
  { key: 'survey', center: { x: 8.6,  z: 0.2 },  size: { w: 3.6, d: 4.0 }, labelY: 2.3 },
];

const CAMERA = {
  targetY: 0.8,
  landscape: { yawDeg: 35, pitchDeg: 46, fovDeg: 36, margin: 1.08 }, // aspect ≥ 1: 앞쪽 오른쪽(남동) 위에서. yaw 를 키우면 긴 축이 깊이로 돌아가 방이 작아진다(최종 리뷰 측정)
  portrait:  { yawDeg: 80, pitchDeg: 55, fovDeg: 52, margin: 1.04 }, // aspect < 1: 마당 쪽(동) 끝에서 방의 긴 축이 화면 위아래로. 넓은 fov로 카메라를 가까이(fov 36°면 거리 ≈ 48 m라 믹서가 40px)
};
```

- 벽: 북쪽(z = zMin)과 서쪽(x = xMin)만 세운다. 남쪽·동쪽은 열어 둔다. 동쪽 벽 자리에는 `DOOR` 위치에 기둥 2개 + 상부 보(셔터 문틀)만 세운다.
- 통로: x ∈ [-1.7, 1.7] 구간은 비워 둔다(스테이션 발자국이 침범하지 않는다).
- 카메라 방향(타깃 → 카메라 단위벡터): `dir = (sin(yaw)·cos(pitch), sin(pitch), cos(yaw)·cos(pitch))`. 타깃 = `BOUNDS` 중심의 x·z와 `targetY`.
- `fitCamera(aspect)` → `{ position:{x,y,z}, target:{x,y,z}, dir, fovDeg, distance }`: `BOUNDS`의 꼭짓점 8개가 모두 시야 안에 들어오는 **최소 거리**를 닫힌식으로 구한다. 카메라 기저(forward = -dir, right = normalize(cross(forward, up)), up' = cross(right, forward))에서 꼭짓점의 로컬 좌표 (lx, ly, lz)를 구하고, 거리 d는 모든 꼭짓점에 대해 `|lx| ≤ (lz + d)·tan(hfov/2)/margin`, `|ly| ≤ (lz + d)·tan(vfov/2)/margin`을 만족하는 최소값(`tan(hfov/2) = tan(vfov/2)·aspect`). 그다음 **재중심 맞춤**: 투영된 꼭짓점 상자의 NDC 중심 (cx, cy)만큼 타깃을 right·up 방향으로 `cx·tanH·d`, `cy·tanV·d` 옮기고 d를 다시 구하는 과정을 3회 반복한다(3/4 뷰에서는 BOUNDS 중심을 겨냥하면 상자가 화면 한쪽으로 치우쳐 채움이 손해 — 재중심으로 1440×785 채움 60→70 % 폭 / 85→93 % 높이, 390×730 83→96 % 폭). 여백 불변식은 그대로 유지된다.
- `deoverlapLabels(boxes)` → 같은 배열(제자리 수정). `boxes = [{ key, x, y, w, h }]`(화면 px, x·y는 라벨 상자의 좌상단). 화면 y 내림차순(가까운 것부터)으로 자리를 고정해 가며, 이미 놓인 상자와 겹치는 **더 먼(y가 작은) 상자**를 놓인 상자 위로 8px 간격을 두고 밀어 올린다(밀린 거리는 `lead`). 밀린 거리를 `lead`로 돌려준다(라벨의 리더선 길이). 한 프레임에 한 번, 5개라 비용 없음.
- `mulberry32(seed)`: 소품 배치용 결정적 난수(엔진과 동일 알고리즘, 5줄). Mix Design의 `engine.js`는 이 페이지에 로드하지 않는다.
- 노출: ES module `export`와 `if (typeof window !== 'undefined') window.LabLayout = …` 둘 다(브라우저·node 테스트 공용). node 테스트는 `createRequire`가 아니라 `import()`로 읽는다.
- 테스트(`tools/layout.test.mjs`): (1) `STATIONS` 키 = `registry.STATION_KEYS`(순서 포함) (2) 발자국이 방(또는 survey는 마당) 안에 있고, 통로를 침범하지 않으며, 서로 겹치지 않는다 (3) aspect 0.46·0.6·0.9·1.0·1.3·1.6·2.2 각각에 대해 `fitCamera` 결과로 원근 투영했을 때 `BOUNDS` 꼭짓점 8개가 모두 NDC [-1, 1] 안에 있다 (4) 거리 단조성은 **같은 방위 안에서만**: landscape {1.0, 1.3, 1.6, 2.2}와 portrait {0.46, 0.6, 0.9} 각각에서 aspect가 커질수록 거리가 줄거나 같다(방위가 바뀌는 0.9↔1.0 경계는 (3)으로만 검증) (5) `deoverlapLabels`: aspect 0.46·0.53·0.69(390×844, 390×743, 390×564)에서 라벨 앵커 5개를 투영하고 상자 140×56px을 붙였을 때, 처리 후 어떤 두 상자도 겹치지 않고 각 상자의 이동량 ≤ 120px.

## 5. 3D 모듈

### 5.1 `site/labs/mix-design/scene3d.js` — export 추가(동작 불변)

파일 끝에 `export { THREE, createStage, concreteMaterial, aggregateField, steelMaterial, orangeMaterial, darkMetalMaterial, disposeDeep, buildMixerScene, buildSlumpScene, buildUtmScene };`를 덧붙인다. `window.Scene3D` 노출과 Mix Design 페이지 동작은 그대로다.

### 5.2 `site/labs/room/props.js` — 소품 빌더 (three.js)

- `makePalette({ muted })` → `{ steel, dark, orange, wood, concrete, rubber, royal }` 재질 묶음. **스테이션마다 새로 만든다**(호버 강조가 다른 스테이션으로 새지 않도록 재질 공유 금지). `muted:true`면 각 색을 `0x9aa3ab` 쪽으로 70% 섞고 `metalness 0.1 / roughness 0.9`로 바꾼다 — Coming soon 스테이션용 회색조.
- 방 껍데기 `buildRoomShell(THREE, ROOM, YARD, DOOR)` → Group: 바닥판(12×9, 색 `0xcfd4da`, 그림자 수신) + 2 m 간격 줄눈(얇은 박스, `0xb9c0c8`) + 북·서 벽(두께 0.2, 색 `0xe9f6fc`)과 허리띠(y 0.9~1.05, `0x003665`) + 문틀(기둥 0.25각 × 2, 보 0.25×0.3, 색 `0x0053a5`) + 마당 바닥(5×9, `0xcfc9bb`).
- 스테이션 소품(각 → Group, 바닥 y=0 기준, 발자국 안에 배치):
  - `buildSoilBench(THREE, pal)`: 작업대(2.8×0.9×0.9) 위 체분기(원판 5장 스택 + 기둥 2), Proctor 몰드(실린더 + 칼라) + 해머(막대), 직접전단 시험기(박스 + 상부 프레임 + 다이얼 원판)
  - `buildTensileFrame(THREE, pal)`: 베이스 + 기둥 2(높이 2.2) + 크로스헤드 + 상·하 그립 + 그립 사이 철근 시편(요철은 얇은 링 6개), 옆에 시편 선반(막대 6개 비스듬히) + 파단 시편 트레이
  - `buildFramingStation(THREE, pal)`: 스터드 벽 패널(길이 2.4, 높이 2.4, 스터드 16" ≈ 0.4 m 간격, 상·하 플레이트, 헤더 1개) — x축과 평행하게 세워 카메라에 비스듬히 보이게, 테이블소(테이블 + 다리 4 + 날 원판), 목재 더미(2×4 박스 8개 격자 적층)
  - `buildSurveyStation(THREE, pal)`: 삼각대(다리 3 + 헤드) 위 토탈스테이션(박스 + 망원경 실린더), 레벨 로드(높이 2.0, 빨강·흰 띠 10개 교대 `0xd7263d`/`0xffffff`), 벤치마크 말뚝 2개 + 그 사이 얇은 줄
  - Mix 스테이션은 `props.js`에 없다 — `lab-room.js`가 `buildMixerScene({wc:0.5, rng})`, `buildSlumpScene({mode:'true', slump:3, measuredSlump:3, rng})`, `buildUtmScene({failMode:'cone', rng})`를 그대로 불러 배치한다. 빌더의 생성 직후 상태는 게임의 첫 프레임(반투명 컷어웨이 콘, 공시체 대신 빈 몰드 3개)이므로 **배치 직후 한 번** `slump.update('lift', 0, 0)`(불투명 빈 콘, 봉·뒤집은 콘·치수선 숨김)과 `utm.update(0, 0, 0, true)`(온전한 공시체 표시, 몰드 숨김)를 호출해 정지 상태를 만든다. 믹서만 루프에서 `update(3 + t·0.35)`로 돈다. 두 빌더는 랩 화면용 확대 축척이라 **믹서 0.68배(≈1.4 m), 슬럼프 장면 0.33배(콘 ≈0.34 m)**로 줄여 놓고, 믹서는 로컬 (0.4, 0, −0.6)에 두어 발자국 안에 들어오게 한다.
- `buildFloorRing(THREE, size)`: 발자국 테두리(폭 0.06, y=0.01, `MeshBasicMaterial` `0x0053a5`, `transparent`) — 호버·활성 표시용.
- `buildHitBox(THREE, size, h)`: 발자국 × 높이 h의 투명 박스. `material.colorWrite=false, depthWrite=false`(그리지 않지만 `visible:true`라 레이캐스트 대상). `userData.station = key`.
- 모든 메쉬 `castShadow/receiveShadow = true`(줄눈·링·히트박스 제외). 스테이션당 메쉬 ≤ 60개.

### 5.3 `site/labs/room/lab-room.js` — 조립·상호작용 (ES module 진입점)

```
mount():
  1. `?no3d=1` 쿼리면 fallback. (window.SITE·window.LabList는 §2.1의 스크립트 순서가 보장한다 — 조건 검사 없음)
  2. import('../mix-design/scene3d.js'), import('./layout.js'), import('./props.js')  (실패 → fallback)
  3. createStage(#room, { background:0xe6f6fd, groundRadius:0.01 }) → null이면 fallback; stage.ground.visible=false (fov·위치는 6에서 applyCamera가 정한다)
     키 라이트 재배치: position (6,12,6), shadow.camera ±12, mapSize 2048, far 40
  4. buildRoomShell → scene
  5. for station of STATIONS: lab = LABS.find(l => l.station === key)
       props = active ? Mix 빌더 3개 : props.js 빌더 (palette muted = !active)
       ring(활성: opacity .55 상시 / soon: 숨김), hitBox, label(§5.4)
  6. applyCamera(fitCamera(aspect)) — position.set → lookAt(target) → fov·aspect 설정 → updateProjectionMatrix() → updateMatrixWorld()를 한 묶음으로.
     ResizeObserver(#room) → setSize(w,h,false) + applyCamera + 즉시 한 프레임 렌더
  7. 루프 한 프레임 = mixer.update(3 + t·0.35)(3 s 이후는 버킷·투입 스트림이 숨겨진 구간이라 드럼만 돈다) → renderer.render → 라벨 위치 갱신(§5.4; render 뒤에 해야 카메라 행렬이 최신).
     기본: setLoop(프레임). 20 s 무입력이면 stop, 입력 시 재개. document.hidden이면 stop, 복귀 시 재개.
     prefers-reduced-motion: reduce — 루프 없음. mixer.update(3) 한 번, 이후 호버·포커스·리사이즈·activate·pageshow 때만 한 프레임 렌더
  8. body.room-page--3d 추가, clearTimeout(window.__labRoomGuard)
  9. window.__labRoomDebug = { renderAt(t), hover(key|null), activate(key), stations(), info(), renderer, camera }
     info() = { calls: renderer.info.render.calls, triangles, meshes }
```

- **호버**: `pointermove`(pointerType ≠ 'touch')마다 다음 프레임에 레이캐스트(히트박스만 대상). 이벤트 대상이 `.station-label` 안이면 레이캐스트를 건너뛰고 `dataset.station`을 키로 쓴다(라벨은 히트박스 위 공중에 떠 있어 레이는 빗나간다). 라벨 자체에도 `pointerenter → setHover(key)`, `pointerleave → setHover(null)`을 건다. 결과가 바뀌면 `setHover(key|null)`:
  - 활성 스테이션: 소품 재질 중 `mat.isMeshStandardMaterial`인 것만 `emissive = 0x0053a5, emissiveIntensity = 0.18`(원값을 `Map<material, {hex, intensity}>`에 저장·복원 — 슬럼프 치수선의 `LineBasicMaterial`은 emissive가 없어 건너뛴다), 링 opacity 1.0, 라벨 `.is-hover`, 커서 `pointer`
  - Coming soon: 라벨 `.is-hover`만, 소품·링 변화 없음, 커서 기본
- **클릭/탭**: 뷰포트에서는 주 버튼·수정키 없는 `pointerdown` 위치를 기억 → `pointerup`에서 이동 < 8px이면 레이캐스트로 키를 얻어 `activate(key)`(우클릭·Ctrl/Cmd/Shift/Alt 클릭은 브라우저 기본 동작에 맡긴다). 라벨에서는 `click` 핸들러가 담당: 주 버튼이고 Ctrl/Cmd/Shift/Alt가 없으면 `preventDefault()` 후 `activate(key)`(수정키·중클릭은 브라우저 기본 새 탭 허용). Coming soon 라벨의 `click`도 같은 핸들러로 nudge. 터치는 호버 없이 바로 이 경로.
- **`activate(key)`**:
  - 활성: 이미 진행 중이면 무시(`activating` 플래그). `prefers-reduced-motion: reduce`면 즉시 `location.assign(lab.href)`. 아니면 450 ms 동안 카메라 위치를 `현재 → 라벨 앵커 + dir·4.5 m`로, 카메라 타깃을 `방 타깃 → 라벨 앵커`로 함께 ease-out-cubic 보간(매 프레임 `applyCamera`)하고 `.room-fade.is-on`, 완료 시 `location.assign(lab.href)`.
  - Coming soon: 라벨에 `.is-nudge`를 600 ms 붙인다(상태 글자가 두 번 깜빡이는 CSS 애니메이션. `prefers-reduced-motion: reduce`에서는 애니메이션 없이 테두리만 `var(--royal)`로 600 ms). 이동 없음.
- **키보드**: 라벨 요소 자체가 포커스 대상. `focus` → `setHover(key)`, `blur` → `setHover(null)`. 활성 라벨은 `<a href>`라 Enter가 `click`을 일으키고 위 `click` 핸들러가 `activate`를 돈다.
- **pagehide**: `e.persisted`(bfcache에 들어감)면 루프만 정지. 아니면 `disposeDeep`, `renderer.dispose`, `__labRoomDebug` 제거.
- **pageshow**(`e.persisted`, 뒤로 가기 복원): `.room-fade.is-on` 제거, `activating` 리셋, `applyCamera(fitCamera(aspect))`, 루프 재개(reduced-motion이면 한 프레임), 라벨 Best grade 재계산. 대체 목록이 떠 있었다면 `LabList.render` 재호출. 캔버스가 이미 dispose된 상태(비-bfcache 경로)는 새 로드라 `mount()`가 처음부터 돈다.
- **webglcontextlost**: 루프 정지 후 `LabList.showFallback('context-lost')`.

### 5.4 라벨 (HTML 오버레이)

- 스테이션마다 `#room-labels` 안에 하나. 활성: `<a class="station-label is-active" href="mix-design/" data-station="mix">`, Coming soon: `<span class="station-label is-soon" data-station="soil" tabindex="0" role="button" aria-disabled="true" aria-label="Soil Testing Lab, coming soon">`(포커스·Enter/Space 가 nudge 를 일으키므로 note 가 아니라 비활성 버튼으로 읽힌다).
- 내용: `<span class="name">Mix Design Lab</span><span class="status">Enter →</span>` (+ Best grade가 있으면 `<span class="grade">Best · A</span>`). Coming soon의 status는 `Coming soon`.
- 매 프레임 앵커 `(center.x, labelY, center.z)`를 `project(camera)`로 화면 좌표로 바꿔 `transform: translate3d(px, py, 0) translate(-50%, -100%)`로 놓는다. 라벨은 캔버스 위에 항상 떠 있고 3D 물체에 가려지지 않는다.
- 스타일: 흰 배경, `border:1px solid var(--border)`, radius 2px, padding 6px 10px, `box-shadow:0 2px 8px rgba(0,54,101,.18)`. `.name` = Hepta Slab 600 13px `var(--text)`, `.status` = Red Hat Mono 500 11px 대문자 자간 .08em `var(--muted)`, `.grade` = 같은 모노 11px `var(--royal)`.
  - `.is-soon`: 배경 `var(--surface2)`, `border:1px dashed var(--faint)`, 글자 `var(--faint)`.
  - `.is-hover`, `:focus-visible`: 배경 `var(--royal)`, 글자·테두리 `#fff`.
  - 색 조합은 모두 기존 대비 게이트가 검증하는 토큰 쌍만 쓴다(text/muted/faint × bg/surface2, #fff × royal).
- ≤700px: `.name` 12px, `.status` 10.5px, padding 5px 8px, `.grade` 숨김.
- 투영 후 상자끼리 겹치면 `deoverlapLabels`(§4)로 먼 쪽 라벨을 위로 밀어 5개가 항상 전부 보이고 클릭 가능하다. 밀린 라벨은 `--lead`(px) 변수로 앵커까지 1px 세로 리더선(`::after`, `var(--faint)`)을 그린다.
- 라벨 위 포인터·클릭 이벤트는 라벨이 직접 처리한다(§5.3) — 뷰포트 레이캐스트로 넘기지 않는다.

## 6. 대체 목록 — `site/labs/lab-list.js` (클래식 스크립트)

지금 `labs/index.html` 인라인에 있는 `activeRow/soonRow/render`를 이 파일로 옮기고 `window.LabList = { render(root), showFallback(reason) }`로 노출한다. 동작은 v4와 같되 Coming soon 행이 `lab.name`을 제목으로 쓴다(§3). 연도(`#year`)는 여기서 다루지 않는다(인라인 스크립트가 항상 채움, §2.1).

`showFallback(reason)`은 멱등이다: `clearTimeout(window.__labRoomGuard)`, `#room`에 `hidden`, `#fallback`의 `hidden` 해제, `render(#fallback)`, `console.warn('[LabRoom] fallback:', reason)`. `lab-room.js`의 모든 대체 경로와 §2.1의 인라인 가드가 이 함수 하나를 부른다.

## 7. 시각 스타일

| 요소 | 값 |
|---|---|
| 배경(방 바깥) | `0xe6f6fd` (기존 3D 장면과 동일, Icy 계열) |
| 바닥 | `0xcfd4da`, roughness .95 / 줄눈 `0xb9c0c8` 2 m 간격 / 마당 `0xcfc9bb` |
| 벽 | `0xe9f6fc` + 허리띠 `0x003665`(Dark) / 문틀 `0x0053a5`(Royal) |
| 장비 | 기존 `steelMaterial`(metalness .35·roughness .55로 완화 — UTM 선례), `orangeMaterial`, `darkMetalMaterial`, 목재 `0xd9b382`, 고무 `0x2b2b2b` |
| Coming soon | `makePalette({muted:true})` 회색조 + 링 숨김 |
| 활성 | 제 색 + 링 Royal opacity .55 상시, 호버 시 1.0 + emissive |
| 조명 | `createStage` 기본(키·필·림) + 키 라이트 위치/그림자 범위 재설정(§5.3) |
| 카메라 | 가로 yaw 35°/pitch 46°/fov 36°/여백 8%, 세로 yaw 80°/pitch 55°/fov 52°/여백 4% — 둘 다 재중심 맞춤(§4) |

## 8. 성능·오류 처리

- 예산: draw call ≤ 400(`__labRoomDebug.info()`로 검증), 메쉬 총 ≤ 400, DPR ≤ 2, 그림자는 키 라이트 하나(2048).
- 다운로드: 새 JS 4개(≤ 60 KB)에 더해 **이 페이지에서 처음 받는** `three.module.js`(1.37 MB raw, 압축 후 약 330 KB)와 `scene3d.js`(68 KB). `<head>`의 `modulepreload` 2개(§2.1)로 직렬 대기를 없앤다. Mix Design Lab을 다녀온 방문자는 캐시로 받는다.
- 첫 프레임 목표: 데스크톱 캐시 없음 ≤ 1.5 s, 모바일 390×844에서 Fast 3G 에뮬레이션(CDP `Network.emulateNetworkConditions`) ≤ 6 s, 캐시 있음 ≤ 2 s.
- 오류 처리: 대체 경로 §2.3. 마운트 전체가 `try/catch`로 감싸이며, 실패 시 부분적으로 만들어진 스테이지는 `dispose`한다.
- 창 크기 변경: `ResizeObserver` → `renderer.setSize(w,h,false)` → `applyCamera(fitCamera(aspect))`(§5.3 6) → 즉시 한 프레임 렌더.
- 유휴·모션 감소: §5.3 7(20 s 무입력 정지, reduced-motion이면 필요할 때만 렌더).
- Math.random 금지(three 내부 제외) — 배치 난수는 `mulberry32(11)` 고정 시드.

## 9. 검증

1. 자동: `node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs tools/layout.test.mjs` 전부 통과(기존 29 + 신규).
2. 헤드리스 Edge 캡처(스크래치패드 `verify/`에 저장): 데스크톱 1440×900, 모바일 390×844(iframe 래퍼), 가로 폰 844×390 — 방 전체·라벨 5개·캡션·푸터가 보이고 **라벨 5개가 서로 겹치지 않는지** 대조. 데스크톱에서 `#room` 높이 = `.room-main` 높이(빈 `#fallback`이 공간을 차지하지 않음). 390×844에서 `document.documentElement.scrollHeight === clientHeight`. CDP `Emulation.setDeviceMetricsOverride`로 주소창 표시 상태(390×664)를 재현해 푸터가 보이는지 확인.
3. CDP 워크: `__labRoomDebug.hover('mix')` → `renderAt` → 캡처(강조·링·라벨 색), `hover('soil')`(라벨만 강조), 라벨 중심으로 `pointermove`를 보내도 `.is-hover` 유지, Coming soon 라벨 클릭 → `.is-nudge`, `activate('mix')` 후 URL이 `mix-design/`로 바뀜, 이어서 `history.back()` → `.room-fade` opacity 0·캔버스 존재·`activate('mix')` 재동작, `activate('soil')`은 URL 불변, `info().calls ≤ 400`, `?no3d=1`에서 대체 목록 캡처, 모듈 경로를 404로 바꾼 사본에서 8 s 뒤 대체 목록이 뜨는지.
4. 키보드: Tab으로 라벨 5개 순회, Enter로 Mix 진입(CDP `Input.dispatchKeyEvent`).
5. 배포 후 라이브(cnstlab.org/labs/)에서 2·3 반복, Mix Design Lab 진입·리포트 완료 회귀 확인.

## 10. 문서·기타

- `README.md`: 구조에 `site/labs/room/`(3D 방)·`site/labs/lab-list.js`(대체 목록) 추가, "Add a lab" 절에 `station` 키 설명 추가.
- `docs/design/mockups/labs-*.html`은 v4 기록으로 두고, 이 스펙의 §4 좌표표를 배치도 원본으로 삼는다.

## 11. 범위 제외

Soil/Steel/Wood/Survey 실제 랩 모듈, 카메라 회전·줌·자유 이동, glTF·텍스처 이미지, 3D 내 텍스트, 사운드, 믹서 드럼 외 소품 애니메이션, 스테이션 배치 편집 UI, Study 페이지·홈 변경.
