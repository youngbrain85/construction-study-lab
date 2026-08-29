// scene3d.js — Mix Design Lab 3D 공통 모듈 (ES module)
// three.js self-host 벤더 파일을 불러와 window.Scene3D 로 노출한다.
// 이 모듈은 "공통 기반"만 제공한다 — 실제 MIX/SLUMP/COMPRESSION 장면 교체는
// 이후 태스크(Task 2~4)에서 이 모듈을 소비해 구현한다.
//
// 설계 원칙(스펙 §1~2 참조):
// - CDN 요청 없음. site/shared/vendor/three.module.js 를 상대 경로로만 import.
// - 시드가 필요한 곳(자갈 배치 등)은 호출자가 MixEngine.mulberry32 기반 rng를
//   넘겨준다. 이 모듈 내부에서 Math.random 을 게임 로직에 사용하지 않는다
//   (three.js 내부 구현이 쓰는 것은 예외).
// - WebGL 컨텍스트 생성 실패는 예외를 던지지 않고 createStage 가 null 을
//   반환하는 것으로 알린다 — 호출자가 canvasFallback 으로 전환한다.

import * as THREE from '../../shared/vendor/three.module.js';

// ── 스테이지(렌더러+씬+카메라+조명+바닥) 생성 ───────────────────────────
/**
 * @param {HTMLElement} container - 렌더러 canvas를 붙일 DOM 컨테이너
 * @param {object} [opts]
 * @param {number} [opts.w] - 렌더 폭(px). 생략 시 container.clientWidth
 * @param {number} [opts.h] - 렌더 높이(px). 생략 시 container.clientHeight
 * @param {object} [opts.cameraPos] - {x,y,z} 카메라 위치 (기본: 3/4 뷰)
 * @param {object} [opts.target] - {x,y,z} 카메라가 바라보는 지점
 * @param {number} [opts.fov] - 카메라 시야각(도)
 * @param {number} [opts.background] - 씬 배경색(hex)
 * @param {number} [opts.groundRadius] - 바닥 원형 플레이트 반지름
 * @param {boolean} [opts.alpha] - 렌더러 캔버스 투명 배경 여부
 * @returns {{renderer:THREE.WebGLRenderer, scene:THREE.Scene, camera:THREE.PerspectiveCamera,
 *            lights:{key:THREE.DirectionalLight, fill:THREE.HemisphereLight, rim:THREE.DirectionalLight},
 *            ground:THREE.Mesh, setLoop:(fn:Function)=>void, stop:()=>void, dispose:()=>void}|null}
 */
function createStage(container, opts = {}) {
  const w = opts.w || container.clientWidth || 800;
  const h = opts.h || container.clientHeight || 600;

  // WebGL 컨텍스트 생성은 환경에 따라 실패할 수 있다(구형 브라우저, 컨텍스트
  // 고갈 등). 여기서 실패하면 throw 하지 않고 null 을 반환해 호출자가
  // canvasFallback 으로 전환하게 한다.
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true, // 검증 훅(renderAt+toDataURL/readPixels)이 필요로 함
      alpha: !!opts.alpha,
    });
  } catch (err) {
    console.warn('[Scene3D] WebGL 렌더러 생성 실패:', err);
    return null;
  }
  if (!renderer || !renderer.getContext || !renderer.getContext()) {
    console.warn('[Scene3D] WebGL 컨텍스트를 얻지 못했습니다.');
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(opts.background ?? 0xeef1f5); // 사이트 라이트 테마(--surface2)와 조화

  // 3/4 뷰 고정 카메라 — orbit 없음(스펙 §6 범위 제외: 부가 조작)
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 38, w / h, opts.near ?? 0.1, opts.far ?? 100);
  const cp = opts.cameraPos ?? { x: 4.2, y: 3.4, z: 5.2 };
  camera.position.set(cp.x, cp.y, cp.z);
  const tgt = opts.target ?? { x: 0, y: 0.6, z: 0 };
  camera.lookAt(tgt.x, tgt.y, tgt.z);

  // ── 조명: 키(그림자 캐스팅) + 필(부드러운 보조광) + 림(윤곽 강조) ──────
  const key = new THREE.DirectionalLight(0xfff4e0, 2.4);
  key.position.set(4, 6, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0025;
  scene.add(key, key.target);

  const fill = new THREE.HemisphereLight(0xcfe8ff, 0x30281f, 0.55);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0x8fb4ff, 0.9);
  rim.position.set(-4, 3, -4);
  scene.add(rim);

  const lights = { key, fill, rim };

  // ── 바닥: 그림자를 받는 저채도 원형 플레이트 ──────────────────────────
  const groundGeo = new THREE.CircleGeometry(opts.groundRadius ?? 6, 48);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.95, metalness: 0.0 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  function setLoop(fn) {
    renderer.setAnimationLoop(fn);
  }
  function stop() {
    renderer.setAnimationLoop(null);
  }
  function dispose() {
    stop();
    disposeDeep(scene);
    renderer.dispose();
    try { renderer.forceContextLoss(); } catch (err) { /* 일부 환경 미지원 — 무시 */ }
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  return { renderer, scene, camera, lights, ground, setLoop, stop, dispose };
}

// ── 콘크리트 재질: w/c 비율에 따라 명도·광택 변화 ──────────────────────
/**
 * @param {number} [wc] - 물-시멘트비 (대략 0.3~0.75 범위를 가정)
 * @returns {THREE.MeshStandardMaterial}
 */
function concreteMaterial(wc = 0.5) {
  const w = THREE.MathUtils.clamp(wc, 0.3, 0.75);
  const t = (w - 0.3) / (0.75 - 0.3); // 0=되비빔(건조) → 1=묽은비빔(습윤)
  const dry = new THREE.Color(0x9c8a72); // 밝은 회갈색
  const wet = new THREE.Color(0x4a4038); // 어두운 회갈색
  const color = dry.clone().lerp(wet, t);
  return new THREE.MeshStandardMaterial({
    color,
    roughness: THREE.MathUtils.lerp(0.92, 0.35, t), // w/c ↑ → 광택 ↑(roughness ↓)
    metalness: 0.02,
  });
}

// ── 골재 필드: 저폴리 자갈 InstancedMesh ───────────────────────────────
/**
 * @param {() => number} rng - MixEngine.mulberry32(seed) 등 결정적 난수 생성기
 * @param {number} count - 인스턴스 개수(성능 예산: ≤ 400)
 * @param {(i:number) => {pos:{x,y,z}, scale:number|{x,y,z}, rot?:{x,y,z}|THREE.Quaternion}} placeFn
 *   각 인스턴스의 배치를 결정하는 콜백
 * @returns {THREE.InstancedMesh}
 */
function aggregateField(rng, count, placeFn) {
  const geo = new THREE.IcosahedronGeometry(1, 0);
  // 정이십면체 정점을 결정적으로 미세 변형해 자갈처럼 울퉁불퉁하게 만든다.
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const jitter = 0.82 + rng() * 0.36;
    v.multiplyScalar(jitter);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x8d8579, roughness: 0.9, metalness: 0.03, flatShading: true,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const placed = placeFn(i) || {};
    const pp = placed.pos ?? { x: 0, y: 0, z: 0 };
    p.set(pp.x, pp.y, pp.z);

    const sc = placed.scale ?? 1;
    if (typeof sc === 'number') s.set(sc, sc, sc);
    else s.set(sc.x, sc.y, sc.z);

    const rot = placed.rot;
    if (rot && rot.isQuaternion) q.copy(rot);
    else if (rot) { e.set(rot.x || 0, rot.y || 0, rot.z || 0); q.setFromEuler(e); }
    else q.identity();

    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

// ── 공용 재질 팩토리 ────────────────────────────────────────────────
/** 강철(회색 금속, 고반사) — 다짐봉, 로드셀, UTM 프레임 등 */
function steelMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0xb9c0c7, roughness: 0.32, metalness: 0.85 });
}
/** 안전 오렌지(장비 도장) — 믹서 프레임 강조색 등 */
function orangeMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0xe0621f, roughness: 0.45, metalness: 0.15 });
}
/** 짙은 금속(검정에 가까운 하우징/A-프레임) */
function darkMetalMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0x24262b, roughness: 0.5, metalness: 0.6 });
}

// ── MIX 장면: 틸팅 드럼 믹서(레퍼런스 실사진 §hotfix/mixer-ref.jpg 구조 기반) ──
// 구조: 검정 A-프레임(고정, 바닥) 위에 드럼 피벗(고정 42° 틸트)이 얹히고, 그
// 피벗 아래 두 자식이 각각 독립적으로 애니메이션한다 —
//   drumShell: 로컬 Y축(드럼 자체 축)으로 계속 회전(스핀) → 리벳 링이 돌아
//              "축 회전"을 가시화한다. 셸 자체는 회전대칭이라 개구부 방향은
//              스핀과 무관하게 항상 고정된 것처럼 보인다.
//   mixGroup:  스핀에 따라 좌우/앞뒤로 미세하게 기우는 반죽(파도처럼 출렁임).
//              드럼과 함께 스핀하지 않는다(액체가 드럼과 한 몸으로 돌면
//              믹싱처럼 보이지 않기 때문).
// 핸드휠은 프레임에 브래킷으로 연결하지 않는다(v2 지적 사항) — 크래들 링에서
// 곧장 뻗어나온 트러니언 축(로컬 X) 끝에 달아, 드럼 틸트 축과 동축이 되게 한다.
/**
 * @param {{wc:number, rng:() => number}} params - wc: 물-시멘트비, rng: MixEngine.mulberry32 시드 생성기
 * @returns {{group:THREE.Group, update:(t:number)=>void, stageBreaks:number[]}}
 */
function buildMixerScene({ wc = 0.5, rng } = {}) {
  const rand = typeof rng === 'function' ? rng : Math.random; // 안전망(계약상 항상 전달되어야 함)
  const group = new THREE.Group();
  const TILT = THREE.MathUtils.degToRad(42); // 레퍼런스 사진 기준 개구부 틸트각

  // ── 검정 A-프레임(강관 실린더) + 바퀴 2 + 고정 발 2 ───────────────────
  const frameMat = darkMetalMaterial();
  const wheelAxle = { L: new THREE.Vector3(-0.62, 0.20, -0.30), R: new THREE.Vector3(-0.62, 0.20, 0.30) };
  const apex = { L: new THREE.Vector3(-0.08, 0.92, -0.28), R: new THREE.Vector3(-0.08, 0.92, 0.28) };
  const foot = { L: new THREE.Vector3(0.58, 0.0, -0.30), R: new THREE.Vector3(0.58, 0.0, 0.30) };

  function tubeBetween(a, b, radius = 0.035) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length() || 0.001;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 10), frameMat);
    mesh.position.copy(a).lerp(b, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }
  const frameGroup = new THREE.Group();
  frameGroup.name = 'frameGroup';
  frameGroup.add(
    tubeBetween(wheelAxle.L, apex.L), tubeBetween(foot.L, apex.L),
    tubeBetween(wheelAxle.R, apex.R), tubeBetween(foot.R, apex.R),
    tubeBetween(apex.L, apex.R, 0.045), // 상부 크로스바(드럼 크래들 받침)
    tubeBetween(wheelAxle.L, wheelAxle.R, 0.04), // 차축
  );
  group.add(frameGroup);

  function makeWheel() {
    const g = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.07, 20), frameMat);
    tire.rotation.z = Math.PI / 2; tire.castShadow = true; tire.receiveShadow = true;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12), steelMaterial());
    hub.rotation.z = Math.PI / 2;
    g.add(tire, hub);
    return g;
  }
  const wheelL = makeWheel(); wheelL.position.copy(wheelAxle.L);
  const wheelR = makeWheel(); wheelR.position.copy(wheelAxle.R);
  group.add(wheelL, wheelR);

  function makeFootPad(p) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.16), frameMat);
    pad.position.set(p.x, 0.02, p.z);
    pad.castShadow = true; pad.receiveShadow = true;
    return pad;
  }
  group.add(makeFootPad(foot.L), makeFootPad(foot.R));

  // ── 드럼 피벗(고정 42° 틸트) ───────────────────────────────────────
  const drumPivot = new THREE.Group();
  drumPivot.name = 'drumPivot';
  drumPivot.position.set(-0.15, 0.92, 0); // 상부 크로스바 근처
  drumPivot.rotation.z = -TILT;
  group.add(drumPivot);

  // 로컬 Y축(허브→벨리→목→개구부) 프로파일 치수
  const R_HUB = 0.20, R_BELLY = 0.55, R_NECK = 0.42, R_RIM = 0.50;
  const Y_HUB = 0.18, Y_BELLY = 0.50, Y_NECK = 0.86, Y_RIM = 1.00;
  const CRADLE_LY = Y_BELLY + 0.05; // 프레임 크로스바가 드럼을 지지하는 지점(트러니언 높이)

  // 피벗의 고정 회전을 적용해 로컬 좌표를 group 좌표로 환산(트러니언/케이블 앵커용)
  function pivotPoint(lx, ly, lz = 0) {
    return new THREE.Vector3(lx, ly, lz).applyEuler(drumPivot.rotation).add(drumPivot.position);
  }

  // 드럼 셸(스핀 그룹) — LatheGeometry, 개구부는 마지막 점 반지름>0 이라 자연히 뚫려 있다
  const drumShell = new THREE.Group();
  drumShell.name = 'drumShell';
  drumPivot.add(drumShell);
  const profile = [
    new THREE.Vector2(0, 0),                           // 후단 캡(모터 쪽 마감)
    new THREE.Vector2(R_HUB * 0.55, Y_HUB * 0.35),
    new THREE.Vector2(R_HUB, Y_HUB),                    // 허브
    new THREE.Vector2(R_BELLY, Y_BELLY),                // 벨리(최대폭)
    new THREE.Vector2(R_NECK, Y_NECK),                  // 좁아지는 목
    new THREE.Vector2(R_NECK * 0.98, Y_RIM - 0.02),
    new THREE.Vector2(R_RIM, Y_RIM),                    // 밝은 림(개구부)
  ];
  const latheGeo = new THREE.LatheGeometry(profile, 40);
  const uv = latheGeo.attributes.uv;
  const colors = new Float32Array(uv.count * 3);
  const cDark = new THREE.Color(0x8f3d06), cBase = new THREE.Color(0xe0621f), cRim = new THREE.Color(0xffc98a);
  const cTmp = new THREE.Color();
  for (let i = 0; i < uv.count; i++) {
    const v = uv.getY(i); // 프로파일 진행도(0=후단 → 1=림) — 허브→벨리/목→밝은 림 그라데이션
    if (v < 0.5) cTmp.copy(cDark).lerp(cBase, v / 0.5);
    else cTmp.copy(cBase).lerp(cRim, (v - 0.5) / 0.5);
    colors[i * 3] = cTmp.r; colors[i * 3 + 1] = cTmp.g; colors[i * 3 + 2] = cTmp.b;
  }
  latheGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const drumMesh = new THREE.Mesh(latheGeo, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.4, metalness: 0.25, side: THREE.DoubleSide,
  }));
  drumMesh.name = 'drumMesh';
  drumMesh.castShadow = true; drumMesh.receiveShadow = true;
  drumShell.add(drumMesh);

  const rimRing = new THREE.Mesh( // 개구부 밝은 림 강조(칼라 립)
    new THREE.TorusGeometry(R_RIM, 0.02, 8, 32),
    new THREE.MeshStandardMaterial({ color: 0xffd9a8, roughness: 0.25, metalness: 0.3, emissive: 0x3a1a00, emissiveIntensity: 0.4 }),
  );
  rimRing.position.y = Y_RIM;
  rimRing.rotation.x = Math.PI / 2; // 토러스 구멍축(기본 Z) → 드럼 축(Y)과 나란히
  drumShell.add(rimRing);

  function rivetRing(y, radius, count) { // 리벳 링 — drumShell 스핀에 함께 돌아 "축 회전"을 가시화
    const mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.014, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a2c05, roughness: 0.6, metalness: 0.2 }),
      count,
    );
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      m.makeTranslation(Math.cos(a) * radius, y, Math.sin(a) * radius);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }
  drumShell.add(rivetRing(Y_BELLY, R_BELLY * 0.97, 14));
  drumShell.add(rivetRing(Y_NECK, R_NECK * 0.97, 12));

  // ── 모터 하우징(드럼 후단) — 드럼과 함께 틸트되지만 스핀은 하지 않는다 ──
  const motorHousing = new THREE.Group();
  const housingBody = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.20, 0.20), darkMetalMaterial());
  housingBody.castShadow = true; housingBody.receiveShadow = true;
  const pulley = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16), steelMaterial());
  pulley.rotation.z = Math.PI / 2; pulley.position.x = 0.15;
  motorHousing.add(housingBody, pulley);
  motorHousing.position.set(0, -0.08, 0); // 후단 캡(y=0) 바로 뒤
  drumPivot.add(motorHousing);

  // 전원 케이블(TubeGeometry + CatmullRom, 하우징 하단 → 바닥으로 늘어짐)
  const cableStart = pivotPoint(0.10, -0.16, 0.09);
  const cableEnd = new THREE.Vector3(-0.85, 0.02, -0.05);
  const cableMid = cableStart.clone().lerp(cableEnd, 0.5); cableMid.y -= 0.28;
  const cableCurve = new THREE.CatmullRomCurve3([cableStart, cableMid, cableEnd]);
  const cableMesh = new THREE.Mesh(
    new THREE.TubeGeometry(cableCurve, 24, 0.012, 6, false),
    new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.7, metalness: 0.1 }),
  );
  cableMesh.castShadow = true;
  group.add(cableMesh);

  // ── 크래들 링 + 트러니언 축 + 핸드휠 — 프레임 브래킷 경유 없이 직결 ────
  const cradleRing = new THREE.Mesh(
    new THREE.TorusGeometry(R_BELLY * 0.78, 0.03, 8, 28), darkMetalMaterial(),
  );
  cradleRing.name = 'cradleRing';
  cradleRing.position.y = CRADLE_LY;
  cradleRing.rotation.x = Math.PI / 2;
  drumPivot.add(cradleRing);

  // 트러니언 방향은 반드시 drumPivot의 회전축(로컬 Z)과 같아야 한다 — drumPivot이
  // 로컬 Z를 축으로 42° 틸트되므로, Z축만이 틸트 각도와 무관하게 불변(invariant)이다.
  // (로컬 X를 썼다면 42° 틸트에 의해 섞여버려 핸드휠 높이가 크래들과 어긋난다 — 검증 중 발견/수정.)
  const TRUNNION_LEN = 0.22;
  const trunnionShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, TRUNNION_LEN, 12), steelMaterial(),
  );
  trunnionShaft.name = 'trunnionShaft';
  trunnionShaft.position.set(0, CRADLE_LY, R_BELLY * 0.78 + TRUNNION_LEN / 2);
  trunnionShaft.rotation.x = Math.PI / 2; // 실린더 기본축(Y) → 트러니언(로컬 Z)에 눕힘
  drumPivot.add(trunnionShaft);

  const handwheelGroup = new THREE.Group(); // 트러니언 축 끝 — 크래들 측면, 드럼 틸트 축과 동축(콜리니어)
  handwheelGroup.name = 'handwheelGroup';
  handwheelGroup.position.set(0, CRADLE_LY, R_BELLY * 0.78 + TRUNNION_LEN);
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 8, 24), darkMetalMaterial());
  wheelRim.name = 'wheelRim'; // 토러스 구멍축(기본 Z)이 이미 트러니언(로컬 Z)과 나란히 — 추가 회전 불필요
  handwheelGroup.add(wheelRim);
  for (let i = 0; i < 4; i++) { // 스포크 4개 — 트러니언(로컬 Z) 둘레(XY 평면)로 배치
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.32, 6), darkMetalMaterial());
    spoke.rotation.z = (i / 4) * Math.PI * 2;
    handwheelGroup.add(spoke);
  }
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.11, 8), darkMetalMaterial());
  grip.position.set(0.14, 0.10, 0.02);
  grip.rotation.z = Math.PI / 2.6;
  handwheelGroup.add(grip);
  drumPivot.add(handwheelGroup);

  // ── 내부 반죽(개구부로 보이는) + 골재 — 스핀에 동조하지 않고 출렁인다 ──
  const mixGroup = new THREE.Group();
  mixGroup.name = 'mixGroup';
  mixGroup.position.set(0, Y_RIM - 0.14, 0);
  drumPivot.add(mixGroup);

  const cavity = new THREE.Mesh( // 어두운 빈 드럼 내부 배경(개구부 뒤편)
    new THREE.CircleGeometry(R_RIM * 0.95, 24),
    new THREE.MeshStandardMaterial({ color: 0x232630, roughness: 1, metalness: 0 }),
  );
  cavity.position.y = -0.10;
  cavity.rotation.x = -Math.PI / 2;
  mixGroup.add(cavity);

  const paste = new THREE.Mesh(new THREE.SphereGeometry(R_RIM * 0.82, 20, 12), concreteMaterial(wc));
  paste.name = 'paste';
  paste.receiveShadow = true;
  mixGroup.add(paste);

  const aggregates = aggregateField(rand, 60, () => {
    const a = rand() * Math.PI * 2, rr = rand() * R_RIM * 0.7;
    return {
      pos: { x: Math.cos(a) * rr, y: -0.01 + rand() * 0.04, z: Math.sin(a) * rr },
      scale: 0.02 + rand() * 0.025,
      rot: { x: rand() * Math.PI, y: rand() * Math.PI, z: rand() * Math.PI },
    };
  });
  mixGroup.add(aggregates);

  // ── 버킷 투입 연출 — 시멘트→물→골재 순(캡션과 동일 경계) ──────────────
  const STAGE_BOUNDS = [0.9, 1.6, 2.6];
  const STAGE_COLOR = [0x8f949c, 0x4f8ef0, 0xb7a98d]; // 시멘트(회) / 물(청) / 골재(황갈)
  function stageIndex(t) { return t < STAGE_BOUNDS[0] ? 0 : t < STAGE_BOUNDS[1] ? 1 : 2; }

  const openingPoint = pivotPoint(0, Y_RIM, 0); // 개구부 중심(고정 틸트 기준 — 피벗 자체는 애니메이션하지 않음)
  const bucketRestPos = openingPoint.clone().add(new THREE.Vector3(0.42, 0.32, 0));

  const bucketGroup = new THREE.Group();
  bucketGroup.name = 'bucketGroup';
  bucketGroup.position.copy(bucketRestPos);
  const bucketBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.07, 0.16, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }),
  );
  bucketBody.castShadow = true;
  const bucketHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.10, 0.006, 6, 16, Math.PI), darkMetalMaterial(),
  );
  bucketHandle.position.y = 0.09; bucketHandle.rotation.x = Math.PI / 2;
  const contentsMat = new THREE.MeshStandardMaterial({ color: STAGE_COLOR[0], roughness: 0.9 });
  const contents = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.065, 0.02, 16), contentsMat);
  contents.position.y = 0.06;
  bucketGroup.add(bucketBody, bucketHandle, contents);
  group.add(bucketGroup);

  const streamMat = new THREE.MeshStandardMaterial({ color: STAGE_COLOR[0], roughness: 0.8 });
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 8), streamMat);
  stream.name = 'stream';
  stream.visible = false;
  group.add(stream);

  // ── update(t): 매 프레임(또는 renderAt 수동 호출)에서 상태를 계산 ────
  const UP = new THREE.Vector3(0, 1, 0);
  function update(t) {
    const spin = t * 1.6; // 드럼 스핀 각속도

    drumShell.rotation.y = spin; // 리벳 링 회전으로 "축 회전" 가시화(셸 자체는 회전대칭)

    const fill = Math.min(1, t / STAGE_BOUNDS[2]);
    paste.scale.y = 0.16 + fill * 0.34;
    paste.position.y = -0.12 + fill * 0.06;
    const tiltAmp = THREE.MathUtils.degToRad(9) * Math.min(1, fill + 0.15);
    mixGroup.rotation.x = -TILT * 0 + Math.sin(spin) * tiltAmp; // 스핀에 동조하지 않는 출렁임
    mixGroup.rotation.z = Math.cos(spin * 0.7) * tiltAmp * 0.6;

    if (t < STAGE_BOUNDS[2]) {
      bucketGroup.visible = true;
      const idx = stageIndex(t);
      const segStart = idx === 0 ? 0 : STAGE_BOUNDS[idx - 1];
      const segEnd = STAGE_BOUNDS[idx];
      const lp = THREE.MathUtils.clamp((t - segStart) / (segEnd - segStart), 0, 1);
      const tiltAngle = -1.15 * Math.sin(lp * Math.PI); // 기울였다 되돌아오는 왕복(라디안)
      bucketGroup.rotation.z = tiltAngle;
      contentsMat.color.setHex(STAGE_COLOR[idx]);

      if (Math.abs(tiltAngle) > 0.55) {
        stream.visible = true;
        streamMat.color.setHex(STAGE_COLOR[idx]);
        const lipLocal = new THREE.Vector3(-0.09, 0.07, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), tiltAngle);
        const from = bucketRestPos.clone().add(lipLocal);
        const to = openingPoint;
        const dir = new THREE.Vector3().subVectors(to, from);
        const len = Math.max(dir.length(), 0.001);
        stream.position.copy(from).lerp(to, 0.5);
        stream.scale.y = len;
        stream.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
      } else {
        stream.visible = false;
      }
    } else {
      bucketGroup.visible = false;
      stream.visible = false;
    }
  }
  update(0);

  return { group, update, stageBreaks: STAGE_BOUNDS.slice() };
}

// ── GPU 리소스 재귀 해제 ────────────────────────────────────────────
const TEXTURE_KEYS = [
  'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap',
  'emissiveMap', 'envMap', 'alphaMap', 'bumpMap', 'displacementMap',
];
/**
 * @param {THREE.Object3D} obj - geometry/material을 재귀적으로 해제할 루트
 */
function disposeDeep(obj) {
  if (!obj) return;
  const visit = (node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const mat of materials) {
        for (const key of TEXTURE_KEYS) {
          if (mat[key] && typeof mat[key].dispose === 'function') mat[key].dispose();
        }
        mat.dispose();
      }
    }
    if (node.children) node.children.forEach(visit);
  };
  visit(obj);
}

// ── 전역 노출 ──────────────────────────────────────────────────────
window.Scene3D = {
  ready: true,
  THREE,
  createStage,
  concreteMaterial,
  aggregateField,
  steelMaterial,
  orangeMaterial,
  darkMetalMaterial,
  disposeDeep,
  buildMixerScene,
};
