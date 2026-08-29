# Three.js 3D 장면 전환 구현 계획 (v3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mix Design Lab의 세 시험 장면(MIX·SLUMP·COMPRESSION)을 Three.js 실제 3D로 재작성 — 게임플레이·판정 완전 불변.

**Architecture:** three.module.js self-host + ES module `scene3d.js`(공통 스테이지·재질·dispose, `window.Scene3D` 노출) + 기존 클래식 앱 스크립트의 `Scenes.*`가 Scene3D를 소비. 텍스트·판독은 HTML 오버레이. WebGL 실패 시 기존 canvasFallback.

**Spec:** `docs/superpowers/specs/2026-08-29-three-3d-scenes-design.md` (필수 요소·계약의 원본)

## Global Constraints

- **판정·게임플레이 불변**: game.result만 소비, 엔진(engine.js) 무변경, `node --test engine.test.mjs` 19/19 유지가 모든 태스크의 게이트
- 계약 유지: 버튼 흐름(Continue/Skip/next→go(...)), 4초 게이트(MIX), 타임라인(SLUMP fill→lift 5s→settle→measure / COMPRESSION cast→cure→3본), 배지 4종 문구·클래스, 캡션 순서, 피크 고정·done 캐치업 값 로직, aria-label, 종료 후 루프 정지, unmount 완전 정리(dispose)
- three.js는 `site/shared/vendor/three.module.js`에서만 import(CDN 금지). 시드는 `MixEngine.mulberry32`만
- 검증 훅: 마운트 중 `window.__scene3dDebug = { renderAt(t), renderer }` 노출, unmount 시 제거. renderer `preserveDrawingBuffer: true`
- 텍스트는 HTML 오버레이(3D 스프라이트 텍스트 금지). 오버레이 컨테이너는 캔버스 부모에 `position:relative` + 오버레이 `position:absolute`
- UI 영어, 주석 한국어. 커밋: conventional commits + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- 브라우저 검증: javascript_tool + `__scene3dDebug.renderAt(t)` 수동 렌더 + `renderer.domElement.toDataURL()`/readPixels 픽셀 검증 (스크린샷 도구 불가). 시각 세부(정확한 좌표·색값)는 재량, 스펙 §3의 필수 요소는 의무

## 파일 구조

```
site/shared/vendor/three.module.js     # 신규 (버전 고정, self-host)
site/labs/mix-design/scene3d.js        # 신규 ES module — 공통 3D 헬퍼 + 장면 팩토리
site/labs/mix-design/index.html        # Scenes.mix/slump/compression을 3D 소비형으로 교체(2D 드로잉 삭제), <script type="module"> 추가, 오버레이 CSS
docs/superpowers/specs/2026-08-29-construction-study-lab-design.md  # 제약 개정 1줄 (Task 1)
```

---

### Task 1: three.js 벤더링 + scene3d.js 공통 모듈

**Files:** Create `site/shared/vendor/three.module.js`(다운로드), `site/labs/mix-design/scene3d.js`(공통부만). Modify `site/labs/mix-design/index.html`(`<script type="module" src="scene3d.js"></script>` 추가만), v2 스펙 문서 제약 1줄 개정.

**Interfaces (Task 2–4가 소비):**
- `window.Scene3D = { ready: true, createStage, concreteMaterial, aggregateField, steelMaterial(), orangeMaterial(), darkMetalMaterial(), disposeDeep, THREE }`
- `createStage(container, opts?) -> { renderer, scene, camera, lights, ground, setLoop(fn), stop(), dispose() }` — 스펙 §2 사양(DPR≤2, PCFSoft, ACES, preserveDrawingBuffer, 3/4 카메라, 키+필+림 조명, 그림자 ground)
- `concreteMaterial(wc) -> THREE.Material`, `aggregateField(rng, count, placeFn) -> THREE.InstancedMesh`

- [ ] **Step 1:** three.module.js 다운로드 — `curl -sL https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.module.js -o site/shared/vendor/three.module.js` (해당 버전 실패 시 jsdelivr에서 존재하는 최신 0.17x+ 버전으로 대체하고 커밋 메시지에 버전 명시). 파일 크기 > 500KB 확인
- [ ] **Step 2:** scene3d.js 작성 (공통부 + `window.Scene3D` 노출 + 스모크: 콘솔 로그 없이 로드). index.html에 module 태그 추가
- [ ] **Step 3:** 검증 — 브라우저에서 `window.Scene3D?.ready === true`, `Scene3D.THREE.REVISION` 출력, 임시 스테이지 생성→1프레임 렌더→toDataURL 길이>1000→dispose 에러 0. 기존 2D 장면·위저드 회귀 없음(콘솔 0)
- [ ] **Step 4:** `node --test engine.test.mjs` 19/19 → 커밋 `feat: three.js self-host + Scene3D 공통 모듈`

### Task 2: MIX 3D 장면

**Files:** Modify `scene3d.js`(+`Scene3D.buildMixerScene(params)`), `index.html`(`Scenes.mix` 교체 — 2D 드로잉 삭제, 오버레이 캡션)

스펙 §3.1 필수 요소 전부(레퍼런스 사진 Read 필수: `D:\Projects\Test\.superpowers\sdd\hotfix\mixer-ref.jpg`). `buildMixerScene({ wc, rng }) -> { group, update(t) }` 패턴 — index.html 쪽은 스테이지 생성+오버레이+버튼 계약만. 검증: renderAt(t=0.5/1.2/2.0/3.0/5.0) 픽셀 증거(주황 드럼·검정 프레임·트러니언 핸드휠 위치가 드럼 축 높이·개구부 내부 반죽·버킷 스트림), 4초 Continue·Skip·unmount dispose(렌더러 컨텍스트 해제 확인), 폴백 경로. 커밋.

### Task 3: SLUMP 3D 장면

**Files:** Modify `scene3d.js`(+`Scene3D.buildSlumpScene({ mode, slump, measuredSlump, segregation, rng })`), `index.html`(`Scenes.slump` 교체)

스펙 §3.2 필수 요소 전부. 변형은 lathe 프로파일 보간(모드별), shear는 본체+웨지 2메시, collapse는 수막 반사 평면+가장자리 골재. 오버레이: Rodding n/25, Lifting X.X s, Slump: X.XX in., 배지. 검증: 4거동 각각 renderAt 페이즈별 예외 0+형상 구분 픽셀 증거(collapse 수막 반사·zero 높이 vs collapse 높이 차), 측정 오버레이 수치 = `game.result.measuredSlump.toFixed(2)`, 종료 후 루프 정지, unmount dispose. 커밋.

### Task 4: COMPRESSION 3D 장면

**Files:** Modify `scene3d.js`(+`Scene3D.buildUtmScene({ failMode, rng })` + `update(t, squash, crackProgress)`), `index.html`(`Scenes.compression` 교체 — stressAt·타임라인·done 캐치업·피크 고정 로직은 index.html 쪽에 그대로 이식, 3D는 기계·공시체·균열만)

스펙 §3.3 필수 요소 전부. 판독·그래프·카운터는 HTML 오버레이(그래프는 오버레이 내 2D `<canvas>` 재사용 가능 — 기존 drawGraph 로직 이식). 검증: 3배합(정상/segregation/고강도) failMode cone/crumble/columnar 지오메트리 구분 픽셀 증거, 램 상승, 판독 피크 고정, done 캐치업(프레임 점프), Average+nextBtn, unmount dispose. 커밋.

### Task 5: E2E + 시각 QA (검증 전용)

시나리오 ⓐⓑⓒ(강의 예제 A/100 / +100 collapse F / −100 zero)를 허브→위저드→3D 장면 3개→리포트 실경로로 완주. WebGL 폴백 경로 1회(Scene3D 강제 무효화로 canvasFallback 노출 확인). 장면별 필수 요소 픽셀 증거를 `.superpowers/sdd/<ws>/shots/`에 기록. 결함 발견 시 수정→19/19→재검증→커밋.

### Task 6: 배포 + 정리

README에 3D 명시 1줄(Tech 섹션), 커밋. 배포는 **컨트롤러가 site/에서 npx 명령 직접 실행**(서브에이전트 정책 차단). 라이브 검증: three.module.js 200 + 모듈 페이지 200 + 콘솔 0.

---

## 계획 자체 검토

- 스펙 커버리지: §1→T1·T6, §2→T1, §3.1→T2, §3.2→T3, §3.3→T4, §4(수명주기)→각 태스크 검증 항목, §5→T5·T6. 누락 없음.
- 자리표시자 없음(캔버스류는 스펙 필수 요소 열거 + 재량 위임 방식 — v2와 동일 패턴).
- 타입 일관성: `Scene3D.*` 시그니처를 Task 1 Interfaces에 고정, T2–4는 build*Scene 팩토리 계약으로 분리.
