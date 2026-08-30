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

// ── SLUMP 장면: ASTM C143 슬럼프 콘 시험 ────────────────────────────
// 구조: 강철 베이스 플레이트(고정) 위에 시료 위치(x=0)와 뒤집은 콘 측정 위치
// (x=GAP)를 나란히 둔다. 콘크리트 본체(bodyMesh)는 LatheGeometry 단면(profile)을
// 매 프레임 보간해 모양을 바꾸는 방식으로 변형을 표현한다 — fill 중엔 "몰드 내부
// 부분 채움" 단면, lift 중엔 몰드와 동일한 캐스트(cast) 단면(아직 미변형),
// settle 중엔 캐스트 단면→모드별 최종 단면을 진행도 p로 선형 보간한다.
// shear만 축대칭이 아니므로(본체 일부가 옆으로 미끄러짐) 축대칭 본체(bodyMesh)에
// 더해 별도의 쐐기 메시(wedgeMesh)를 두어 옆으로 슬라이드+기울임을 표현한다.
// update(phase, t, p) 계약: phase='fill'|'lift'|'settle'|'measure', t=해당 페이즈
// 시작 후 경과초(호출부가 계산), p=해당 페이즈 진행도 0→1(호출부가 이징 적용해
// 넘겨준다 — lift/settle/measure는 easeOutCubic 권장). fill 페이즈에서는 층/다짐
// 카운터 계산이 이 함수 내부에 있으므로, update()가 오버레이 표시용 정보
// { layerIdx, rodCount, rodding }를 반환한다(레이아웃 텍스트는 호출부 담당).
/**
 * @param {{mode:'zero'|'true'|'shear'|'collapse', slump:number, measuredSlump:number,
 *           segregation:boolean, rng:() => number}} params
 *   mode/segregation: game.result.behavior. slump: behavior.slump(연속값, 형상 산정 전용).
 *   measuredSlump: game.result.measuredSlump(양자화값, 라벨·치수선 전용). rng: MixEngine.mulberry32 시드.
 * @returns {{group:THREE.Group, timing:object, update:(phase:string,t:number,p:number)=>object}}
 */
function buildSlumpScene({ mode = 'true', slump = 3, measuredSlump = 3, segregation = false, rng } = {}) {
  const rand = typeof rng === 'function' ? rng : Math.random; // 안전망(계약상 항상 전달되어야 함)
  const group = new THREE.Group();
  const v = (r, y) => new THREE.Vector2(r, y);

  // ── 치수(ASTM C143 §6.1): 하단 8"⌀ / 상단 4"⌀ / 높이 12" — IN = 1인치의 월드유닛 환산 ──
  const IN = 0.085;
  const BOT_R = 4 * IN, TOP_R = 2 * IN, HGT = 12 * IN;
  const GAP = 20 * IN; // 시료 중심 → 뒤집은 콘(측정용) 중심 간격
  const s = THREE.MathUtils.clamp(slump, 0, 11); // 형상 산정 전용(연속값) — 라벨·치수선은 measuredSlump를 따로 쓴다

  // ── 타이밍(2D 버전과 동일 값 유지 — 길이는 재량이나 검증 기준점을 안정적으로 재현) ──
  const T_LAYERS = 3, T_POUR_T = 0.3, T_ROD_T = 1.3, T_PAUSE_T = 0.2;
  const T_LAYER_T = T_POUR_T + T_ROD_T + T_PAUSE_T; // 1.8
  const T_FILL_DUR = T_LAYERS * T_LAYER_T;          // 5.4
  const LIFT_DUR = 5.0, SETTLE_DUR = 1.2, MEASURE_DUR = 0.6, ROD_TARGET = 25;

  // ── 공용 재질 ──────────────────────────────────────────────────────
  const steelMat = steelMaterial();
  const wcApprox = { zero: 0.34, true: 0.5, shear: 0.42, collapse: 0.7 }[mode] ?? 0.5;
  const concreteMat = concreteMaterial(wcApprox + (segregation ? 0.04 : 0));

  // ── 강철 콘(금속 반사) — 손잡이 2 + 발판 2 + 상하 림, 정상/뒤집은 콘 공용 빌더 ──
  // shellMat: 콘 본체(래스 셸)만 별도 재질 인스턴스로 둔다 — fill 페이즈에서 반투명
  // 컷어웨이로 전환해 몰드 내부 콘크리트 상승·다짐을 보이게 하기 위함(2D 버전의
  // alpha:0.5 컷어웨이와 동등한 효과). 림·손잡이·발판은 공용 steelMat(항상 불투명) 유지.
  function buildConeGroup() {
    const g = new THREE.Group();
    const shellMat = steelMaterial();
    shellMat.transparent = true; // opacity만 매 프레임 바꿀 수 있도록 항상 blend 가능하게 둔다
    const profile = [
      v(0, 0), v(BOT_R, 0), v(BOT_R * 0.995, HGT * 0.33),
      v(THREE.MathUtils.lerp(BOT_R, TOP_R, 0.66), HGT * 0.66),
      v(TOP_R * 1.01, HGT * 0.97), v(TOP_R, HGT),
    ];
    const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile, 28), shellMat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    g.add(mesh);
    const rimTop = new THREE.Mesh(new THREE.TorusGeometry(TOP_R, IN * 0.1, 8, 24), steelMat);
    rimTop.position.y = HGT; rimTop.rotation.x = Math.PI / 2; g.add(rimTop);
    const rimBot = new THREE.Mesh(new THREE.TorusGeometry(BOT_R, IN * 0.13, 8, 28), steelMat);
    rimBot.position.y = 0.01; rimBot.rotation.x = Math.PI / 2; g.add(rimBot);
    for (const ang of [0, Math.PI]) { // 손잡이 2개(상단 측면)
      const handle = new THREE.Mesh(new THREE.TorusGeometry(IN * 1.1, IN * 0.09, 6, 12, Math.PI), steelMat);
      handle.position.set(Math.cos(ang) * (TOP_R + IN * 0.3), HGT - IN * 1.0, Math.sin(ang) * (TOP_R + IN * 0.3));
      handle.rotation.y = ang; handle.rotation.z = Math.PI / 2;
      g.add(handle);
    }
    for (const ang of [Math.PI / 2, -Math.PI / 2]) { // 발판 2개(하단 측면)
      const foot = new THREE.Mesh(new THREE.BoxGeometry(IN * 1.6, IN * 0.3, IN * 0.7), steelMat);
      foot.position.set(Math.cos(ang) * (BOT_R + IN * 0.6), IN * 1.2, Math.sin(ang) * (BOT_R + IN * 0.6));
      foot.rotation.y = ang;
      g.add(foot);
    }
    return { group: g, shellMat };
  }
  const coneBuild = buildConeGroup();
  const coneGroup = coneBuild.group;
  const coneShellMat = coneBuild.shellMat;
  group.add(coneGroup);

  // 뒤집은 콘(측정용): 로컬 X축 180° 회전 + HGT만큼 끌어올려 "제자리에서 뒤집힘"을 만든다
  // (넓은 하단 림이 이제 위로 와서 다짐봉을 얹을 수 있는 평평한 상단 기준면이 된다)
  const invertedBuild = buildConeGroup();
  const invertedInner = invertedBuild.group;
  invertedBuild.shellMat.opacity = 1; // 측정용 뒤집은 콘은 항상 불투명
  invertedInner.rotation.x = Math.PI;
  invertedInner.position.y = HGT;
  const invertedGroup = new THREE.Group();
  invertedGroup.add(invertedInner);
  invertedGroup.position.set(GAP, 0, 0);
  invertedGroup.visible = false;
  group.add(invertedGroup);

  // ── 다짐봉(steel rod) — 채움 중 왕복 다짐 + 측정 중 수평 거치 겸용 ──────
  const ROD_LEN = 24 * IN, ROD_R = 0.3125 * IN; // ASTM 규정: 5/8"⌀ × 24"L
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(ROD_R, ROD_R, ROD_LEN, 12), steelMat);
  rod.castShadow = true;
  rod.visible = false;
  group.add(rod);

  // ── 강철 베이스 플레이트 + 클램프 2 + 발판 2 ───────────────────────
  (function buildBasePlate() {
    const plateW = GAP + BOT_R * 2 + IN * 6;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(plateW, IN * 0.5, BOT_R * 2 + IN * 3), steelMat);
    plate.position.set(GAP / 2, -IN * 0.25, 0);
    plate.receiveShadow = true; plate.castShadow = true;
    group.add(plate);
    for (const ang of [0, Math.PI]) { // 클램프 2개(시료측 콘 밑동 고정 걸쇠)
      const clamp = new THREE.Mesh(new THREE.BoxGeometry(IN * 0.5, IN * 0.9, IN * 0.6), steelMat);
      clamp.position.set(Math.cos(ang) * (BOT_R + IN * 0.5), IN * 0.2, Math.sin(ang) * (BOT_R + IN * 0.5));
      group.add(clamp);
    }
    for (const dz of [-1, 1]) { // 발판 2개(오퍼레이터가 밟아 판을 고정)
      const pedal = new THREE.Mesh(new THREE.BoxGeometry(IN * 3, IN * 0.3, IN * 1.2), steelMat);
      pedal.position.set(GAP * 0.25, 0.02, dz * (BOT_R + IN * 1.3));
      group.add(pedal);
    }
  })();

  // ── 콘크리트 본체: LatheGeometry 단면 보간으로 변형 표현 ─────────────
  const RADIAL_SEG = 28;
  const CAST = [ // 몰드 내부 형상(캐스트 직후, 미변형) — 상하 평면 캡을 위해 반지름 0 지점을 각 끝에 둔다
    v(0, 0), v(BOT_R, 0), v(THREE.MathUtils.lerp(BOT_R, TOP_R, 0.33), HGT * 0.33),
    v(THREE.MathUtils.lerp(BOT_R, TOP_R, 0.66), HGT * 0.66),
    v(THREE.MathUtils.lerp(BOT_R, TOP_R, 0.92), HGT * 0.92),
    v(TOP_R, HGT), v(0, HGT),
  ];
  function endProfileFor(m) {
    if (m === 'zero') { // 거의 원형 유지 — 높이만 살짝 줄고, 거친 표면은 지터로 별도 처리
      const hgtE = HGT - 0.3 * IN;
      return [v(0, 0), v(BOT_R, 0), v(THREE.MathUtils.lerp(BOT_R, TOP_R, 0.33), hgtE * 0.33),
        v(THREE.MathUtils.lerp(BOT_R, TOP_R, 0.66), hgtE * 0.66),
        v(THREE.MathUtils.lerp(BOT_R, TOP_R, 0.92), hgtE * 0.92), v(TOP_R, hgtE), v(0, hgtE)];
    }
    if (m === 'collapse') { // 팬케이크 — 반지름 크게 확산, 높이는 크게 낮아짐
      const rBE = BOT_R + 13 * IN, hgtE = 1.6 * IN;
      return [v(0, 0), v(rBE, 0), v(rBE * 0.95, hgtE * 0.4), v(rBE * 0.75, hgtE * 0.85),
        v(rBE * 0.5, hgtE * 0.97), v(rBE * 0.2, hgtE), v(0, hgtE * 1.05)];
    }
    if (m === 'shear') { // 본체(남은 절반) — 웨지가 분리되어 나간 나머지 축대칭 몸통
      const hgtE = HGT - s * 0.6 * IN, rBE = BOT_R * 0.9, rTE = TOP_R * 1.1;
      return [v(0, 0), v(rBE, 0), v(THREE.MathUtils.lerp(rBE, rTE, 0.33), hgtE * 0.33),
        v(THREE.MathUtils.lerp(rBE, rTE, 0.66), hgtE * 0.66),
        v(THREE.MathUtils.lerp(rBE, rTE, 0.92), hgtE * 0.92), v(rTE, hgtE), v(0, hgtE)];
    }
    // true(기본값): 완만한 돔 — s(연속 슬럼프)가 클수록 낮고 넓게 퍼진다
    const hgtE = Math.max(HGT * 0.2, HGT - s * IN);
    const rBE = BOT_R + 0.45 * s * IN, rTE = TOP_R + 0.35 * s * IN, capE = (0.35 + 0.4 * s) * IN;
    return [v(0, 0), v(rBE, 0), v(THREE.MathUtils.lerp(rBE, rTE, 0.35), hgtE * 0.4),
      v(THREE.MathUtils.lerp(rBE, rTE, 0.7), hgtE * 0.75),
      v(rTE, hgtE), v(rTE * 0.45, hgtE + capE * 0.85), v(0, hgtE + capE)];
  }
  const END = endProfileFor(mode);
  function lerpProfile(a, b, t) {
    const out = [];
    for (let i = 0; i < a.length; i++) out.push(v(THREE.MathUtils.lerp(a[i].x, b[i].x, t), THREE.MathUtils.lerp(a[i].y, b[i].y, t)));
    return out;
  }
  // zero 전용 결정적 지터(매 프레임 재사용) — 거칠고 뻑뻑한 표면 표현(축대칭을 깨는 유일한 예외)
  const ZERO_JITTER = mode === 'zero'
    ? Array.from({ length: CAST.length * (RADIAL_SEG + 1) }, () => rand() - 0.5)
    : null;
  function applyRadialJitter(geometry, jitterArr, amount) {
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), rXZ = Math.hypot(x, z);
      if (rXZ < 1e-6) continue; // 축 위 정점(중심점)은 지터 없음 — 구멍 방지
      const ang = Math.atan2(z, x), nr = Math.max(0.001, rXZ + jitterArr[i % jitterArr.length] * amount);
      pos.setX(i, Math.cos(ang) * nr); pos.setZ(i, Math.sin(ang) * nr);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  const bodyMesh = new THREE.Mesh(new THREE.LatheGeometry(CAST, RADIAL_SEG), concreteMat);
  bodyMesh.castShadow = true; bodyMesh.receiveShadow = true;
  group.add(bodyMesh);
  function rebuildBody(points, radialSegments = RADIAL_SEG) {
    bodyMesh.geometry.dispose();
    bodyMesh.geometry = new THREE.LatheGeometry(points, radialSegments);
  }

  // shear 전용 — 분리된 쐐기(웨지) 2메시 중 하나. ExtrudeGeometry로 단순 쐐기 프리즘을 만들고
  // settle 진행도에 따라 옆으로 슬라이드+기울인다(2D 코드의 wedge 폴리곤을 3D로 단순화).
  const wedgeShape = new THREE.Shape();
  [[-2.2, 0], [-0.6, 3.9], [1.8, 2.1], [2.6, 0]].forEach(([x, y], i) => {
    const px = x * IN, py = y * IN;
    i === 0 ? wedgeShape.moveTo(px, py) : wedgeShape.lineTo(px, py);
  });
  wedgeShape.closePath();
  const wedgeDepth = BOT_R * 1.2;
  const wedgeGeo = new THREE.ExtrudeGeometry(wedgeShape, { depth: wedgeDepth, bevelEnabled: false });
  wedgeGeo.translate(0, 0, -wedgeDepth / 2);
  const wedgeMesh = new THREE.Mesh(wedgeGeo, concreteMat);
  wedgeMesh.castShadow = true; wedgeMesh.receiveShadow = true;
  wedgeMesh.visible = false;
  group.add(wedgeMesh);
  const WEDGE_BASE_X = BOT_R + 0.3 * IN;
  function updateWedge(p) {
    wedgeMesh.position.set(WEDGE_BASE_X + (2.5 + s * 0.5) * IN * p, 0, 0);
    wedgeMesh.rotation.z = -0.5 * p;
  }

  // collapse 전용 — 반사 수막(고광택 얇은 원판, 저 roughness로 스펙큘러 하이라이트를 낸다)
  const filmMat = new THREE.MeshStandardMaterial({ color: 0xcfe3f2, roughness: 0.05, metalness: 0.05, transparent: true, opacity: 0.8 });
  const filmMesh = new THREE.Mesh(new THREE.CircleGeometry(1, 40), filmMat);
  filmMesh.rotation.x = -Math.PI / 2;
  filmMesh.visible = false;
  group.add(filmMesh);
  function updateFilm(p) {
    filmMesh.scale.setScalar(Math.max(0.001, (BOT_R + 13 * IN * p) * 1.05));
    filmMesh.position.y = 1.6 * IN * p + 0.006;
  }

  // ── 골재 필드 — 표면 분포(collapse/재료분리는 가장자리로 쏠리게 edgeBias<1) ──
  const edgeBias = mode === 'collapse' ? 0.4 : (segregation ? 0.7 : 1.0);
  const finalRadius = mode === 'collapse' ? BOT_R + 13 * IN
    : mode === 'true' ? BOT_R + 0.45 * s * IN
      : mode === 'shear' ? BOT_R * 0.9 : BOT_R;
  const finalHeight = mode === 'collapse' ? 1.6 * IN
    : mode === 'true' ? Math.max(HGT * 0.2, HGT - s * IN)
      : mode === 'shear' ? HGT - s * 0.6 * IN : HGT - 0.3 * IN;
  const aggregates = aggregateField(rand, 50, () => {
    let u = rand() * 2 - 1; const sign = u < 0 ? -1 : 1; u = sign * Math.pow(Math.abs(u), edgeBias);
    const rr = Math.abs(u) * finalRadius * 0.92, ang = rand() * Math.PI * 2;
    return {
      pos: { x: Math.cos(ang) * rr, y: finalHeight * (0.15 + 0.8 * rand()), z: Math.sin(ang) * rr },
      scale: 0.018 + rand() * 0.022,
      rot: { x: rand() * Math.PI, y: rand() * Math.PI, z: rand() * Math.PI },
    };
  });
  const aggGroup = new THREE.Group();
  aggGroup.add(aggregates);
  aggGroup.scale.setScalar(0.001);
  group.add(aggGroup);

  // ── 측정 3D 치수선: 봉 아래(y=HGT) → 변위된 원중심(y=HGT-measuredSlump) ──
  const dimMat = new THREE.LineBasicMaterial({ color: 0x2b3040 });
  const dimGroup = new THREE.Group();
  const dispY = HGT - measuredSlump * IN;
  dimGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
    [new THREE.Vector3(0, HGT, 0), new THREE.Vector3(0, dispY, 0)]), dimMat));
  function tickCap(y) {
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(
      [new THREE.Vector3(-IN * 0.5, y, 0), new THREE.Vector3(IN * 0.5, y, 0)]), dimMat);
  }
  dimGroup.add(tickCap(HGT), tickCap(dispY));
  const capMat = new THREE.MeshStandardMaterial({ color: 0x2b3040, roughness: 0.4, metalness: 0.2 });
  const capTop = new THREE.Mesh(new THREE.SphereGeometry(IN * 0.16, 8, 8), capMat);
  capTop.position.set(0, HGT, 0);
  const capBot = capTop.clone();
  capBot.position.y = dispY;
  dimGroup.add(capTop, capBot);
  dimGroup.visible = false;
  group.add(dimGroup);

  // ── update(phase, t, p): 페이즈별 지오메트리·가시성 갱신, fill은 오버레이용 정보 반환 ──
  function update(phase, t, p) {
    if (phase === 'fill') {
      coneGroup.visible = true; coneGroup.position.y = 0;
      coneShellMat.opacity = 0.4; // 반투명 컷어웨이 — 몰드 내부 콘크리트 상승·다짐이 보이게
      invertedGroup.visible = false; dimGroup.visible = false;
      wedgeMesh.visible = false; filmMesh.visible = false; aggGroup.scale.setScalar(0.001);
      bodyMesh.position.x = 0;

      const layerH = HGT / T_LAYERS;
      const layerIdx = Math.min(T_LAYERS - 1, Math.floor(t / T_LAYER_T));
      const tl = t - layerIdx * T_LAYER_T;
      const pourFrac = THREE.MathUtils.clamp(tl / T_POUR_T, 0, 1);
      const rodProg = tl <= T_POUR_T ? 0 : THREE.MathUtils.clamp((tl - T_POUR_T) / T_ROD_T, 0, 1);
      const filledH = Math.max(0.002, layerIdx * layerH + pourFrac * layerH);
      const rFill = (y) => THREE.MathUtils.lerp(BOT_R, TOP_R, y / HGT);
      rebuildBody([v(0, 0), v(BOT_R, 0), v(rFill(filledH * 0.5), filledH * 0.5), v(rFill(filledH), filledH), v(0, filledH)], 24);

      let rodCount = 0, rodding = false;
      if (rodProg > 0) {
        rodding = true;
        const rodPos = rodProg * ROD_TARGET;
        rodCount = Math.min(ROD_TARGET, Math.floor(rodPos));
        const poke = Math.sin(Math.min(1, rodPos - rodCount) * Math.PI);
        const rodX = Math.sin(rodCount * 2.3) * (BOT_R * 0.5);
        const rodTopY = HGT + IN * 1.5, rodTipY = filledH + IN * 0.6 - poke * IN;
        rod.visible = true; rod.rotation.set(0, 0, 0);
        rod.position.set(rodX, (rodTopY + rodTipY) / 2, 0);
        rod.scale.y = Math.max(0.05, (rodTopY - rodTipY) / ROD_LEN);
      } else {
        rod.visible = false; rod.scale.y = 1;
      }
      return { phase, layerIdx, rodCount, rodding };
    }

    if (phase === 'lift') {
      coneGroup.visible = true; coneGroup.position.y = p * HGT * 1.15;
      coneShellMat.opacity = 1; // 인발 중엔 불투명한 금속 콘으로 복귀
      rod.visible = false; invertedGroup.visible = false; dimGroup.visible = false;
      wedgeMesh.visible = false; filmMesh.visible = false; aggGroup.scale.setScalar(0.001);
      bodyMesh.position.x = 0;
      rebuildBody(CAST, RADIAL_SEG);
      return { phase };
    }

    if (phase === 'settle') {
      coneGroup.visible = false; rod.visible = false; invertedGroup.visible = false; dimGroup.visible = false;
      const live = lerpProfile(CAST, END, p);
      rebuildBody(live, RADIAL_SEG);
      if (mode === 'zero') applyRadialJitter(bodyMesh.geometry, ZERO_JITTER, 0.05 * IN * p);
      bodyMesh.position.x = mode === 'shear' ? -0.8 * IN * p : 0;
      wedgeMesh.visible = mode === 'shear'; if (mode === 'shear') updateWedge(p);
      filmMesh.visible = mode === 'collapse'; if (mode === 'collapse') updateFilm(p);
      aggGroup.scale.setScalar(THREE.MathUtils.lerp(0.001, 1, p));
      return { phase };
    }

    // measure: 콘크리트는 settle 최종 형상(p=1)에 고정, 뒤집은 콘+봉+치수선이 함께 자리잡는다
    coneGroup.visible = false;
    const live = lerpProfile(CAST, END, 1);
    rebuildBody(live, RADIAL_SEG);
    if (mode === 'zero') applyRadialJitter(bodyMesh.geometry, ZERO_JITTER, 0.05 * IN);
    bodyMesh.position.x = mode === 'shear' ? -0.8 * IN : 0;
    wedgeMesh.visible = mode === 'shear'; if (mode === 'shear') updateWedge(1);
    filmMesh.visible = mode === 'collapse'; if (mode === 'collapse') updateFilm(1);
    aggGroup.scale.setScalar(1);

    invertedGroup.visible = true;
    invertedGroup.scale.setScalar(THREE.MathUtils.lerp(0.15, 1, p));
    rod.visible = true;
    rod.rotation.set(0, 0, Math.PI / 2);
    rod.scale.y = 1;
    rod.position.set(GAP / 2, HGT, 0);
    dimGroup.visible = p >= 1;
    return { phase };
  }
  update('fill', 0, 0);

  return {
    group,
    timing: {
      POUR_T: T_POUR_T, ROD_T: T_ROD_T, PAUSE_T: T_PAUSE_T, LAYER_T: T_LAYER_T,
      LAYERS: T_LAYERS, ROD_TARGET, FILL_DUR: T_FILL_DUR, LIFT_DUR, SETTLE_DUR, MEASURE_DUR,
    },
    update,
  };
}

// ── COMPRESSION 장면: 2포스트 UTM(ASTM C39, universal testing machine) ──
// 기존 2D 픽셀 레이아웃(구 Scenes.compression, 캔버스 900×470)의 구조·비례를
// 그대로 3D 월드 좌표로 옮긴다. PXU = 1/300(픽셀→월드 변환 계수), 캔버스
// pixelY(Y-down, 원점 상단) → 월드 y(Y-up, 원점 바닥) 변환은 py(pixelY)가
// 담당하며 기준 바닥은 구 bedBot(pixelY=428)이다. 판정·타이밍·픽셀 판독
// (stressAt·타임라인·done 캐치업·피크 고정·AREA·toLocaleString 포맷)은 전부
// index.html 오버레이 쪽 책임이며, 이 팩토리는 기계·공시체·균열 지오메트리만
// 다룬다(스펙 §3.3, 계획 Task 4 계약).
//
// 구조: 프레임(베드+기둥 2(실린더)+상부 크로스헤드+로드셀 컬럼)은 전부 고정.
// 상부 플래튼은 고정, 하부 플래튼은 유압 램(하우징 고정+로드 신장)에 밀려
// squash만큼 상승한다. 공시체(bodyMesh)는 상단이 고정된 채(피벗을 위쪽에 둔
// 지오메트리) squash에 따라 아래쪽이 줄어드는 스케일로 압축을 표현한다.
// 파괴 유형은 failMode(호출 시 1회 고정 — 배합별로 결정되므로 3본 공통)에
// 따라 cone/columnar/crumble 중 하나의 지오메트리만 미리 만들어두고,
// update()가 매 프레임 crackProgress(0→1)로 그 지오메트리를 드러낸다.
// cast 페이즈(양생 전)에는 UTM 뒤편에 몰드 3개가 콘크리트로 차오르는 모습을
// 보여주고(cylinderVisible=false), 재하 시작 후(cylinderVisible=true)에는
// 몰드를 숨기고 공시체+파괴 연출을 보여준다.
/**
 * @param {{failMode:'cone'|'columnar'|'crumble', rng:() => number}} params
 *   failMode: index.html이 game.result로 1회 판정한 값(불변 계약 로직, 이식만).
 *   rng: MixEngine.mulberry32 시드 생성기 — 골재/파편 배치 결정론용.
 * @returns {{group:THREE.Group, update:(t:number,squash:number,crackProgress:number,cylinderVisible:boolean)=>void}}
 */
function buildUtmScene({ failMode = 'cone', rng } = {}) {
  const rand = typeof rng === 'function' ? rng : Math.random; // 안전망(계약상 항상 전달되어야 함)
  const group = new THREE.Group();

  const PXU = 1 / 300;
  const py = (pixelY) => (428 - pixelY) * PXU; // 구 캔버스 pixelY(Y-down) → 월드 y(바닥=0)

  const bedTopY = py(400), bedBotY = 0;
  const headTopY = py(50), headBotY = py(78);
  const cellTopY = py(78), cellBotY = py(128);
  const specTopY = py(140);          // 공시체 상단(고정 — 상부 플래튼 하단에 맞닿음)
  const H0 = 120 * PXU;              // 공시체 공칭 높이(squash=0일 때)
  const specR = 24 * PXU;            // 공시체 반지름(6"⌀ 비율, cw=48px)
  const postHalfGap = (190 / 2) * PXU;
  const postR = (14 / 2) * PXU;
  const beamHalfW = (190 / 2 + 14 / 2 + 20) * PXU;
  const beamDepth = beamHalfW * 0.85;
  const ramHouseTopY = py(360);
  const ramR = (50 / 2) * PXU;
  const plateHalfW = 45 * PXU, plateT = 12 * PXU;
  const capT = Math.min(7 * PXU, H0 * 0.12);

  // steelMaterial()의 기본 metalness(0.85)는 envMap이 없는 이 장면에서 직접
  // 스펙큘러 하이라이트를 받는 면 외에는 대부분 검게 렌더링된다(무-envMap 고금속
  // 재질의 알려진 한계 — 검증 중 renderAt+toDataURL로 실제 발견). 프레임/플래튼/
  // 램처럼 화면 대부분을 차지하는 큰 부재는 가시성 확보를 위해 인스턴스 단위로
  // metalness를 낮춘다(공용 팩토리 steelMaterial() 자체는 그대로 둬 Task 1-3 회귀 방지).
  const steelMat = steelMaterial();
  steelMat.metalness = 0.35; steelMat.roughness = 0.55;
  const darkMat = darkMetalMaterial();
  const orangeMat = orangeMaterial();

  // ── 프레임(전부 고정): 베드 + 기둥 2(실린더) + 상부 크로스헤드 + 로드셀 컬럼 ──
  const bed = new THREE.Mesh(new THREE.BoxGeometry(beamHalfW * 2, bedTopY - bedBotY, beamDepth * 2), steelMat);
  bed.position.y = (bedTopY + bedBotY) / 2;
  bed.castShadow = true; bed.receiveShadow = true;
  group.add(bed);

  function makePost(x) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, headBotY - bedTopY, 16), steelMat);
    m.position.set(x, (headBotY + bedTopY) / 2, 0);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  group.add(makePost(-postHalfGap), makePost(postHalfGap));

  const crosshead = new THREE.Mesh(new THREE.BoxGeometry(beamHalfW * 2, headTopY - headBotY, beamDepth * 2), steelMat);
  crosshead.position.y = (headTopY + headBotY) / 2;
  crosshead.castShadow = true; crosshead.receiveShadow = true;
  group.add(crosshead);

  const loadCell = new THREE.Mesh(new THREE.CylinderGeometry(specR * 0.9, specR * 0.9, cellTopY - cellBotY, 16), darkMat);
  loadCell.position.y = (cellTopY + cellBotY) / 2;
  loadCell.castShadow = true; loadCell.receiveShadow = true;
  group.add(loadCell);

  const platenTop = new THREE.Mesh(new THREE.CylinderGeometry(plateHalfW, plateHalfW, plateT, 20), steelMat); // 상부 플래튼(고정)
  platenTop.position.y = specTopY + plateT / 2;
  platenTop.castShadow = true; platenTop.receiveShadow = true;
  group.add(platenTop);

  // ── 유압 하부 램: 하우징(고정) + 로드(가변 길이 — squash만큼 신장해 플래튼을 밀어올린다) ──
  const ramHousing = new THREE.Mesh(new THREE.CylinderGeometry(ramR, ramR, ramHouseTopY - bedTopY, 16), steelMat);
  ramHousing.position.y = (ramHouseTopY + bedTopY) / 2;
  ramHousing.castShadow = true; ramHousing.receiveShadow = true;
  group.add(ramHousing);
  const ramTrim = new THREE.Mesh(new THREE.CylinderGeometry(ramR * 1.02, ramR * 1.02, plateT * 0.4, 16), orangeMat); // 유압 라인 트림(믹서 장면과 오렌지 포인트 통일)
  ramTrim.position.y = ramHouseTopY - plateT * 0.2;
  group.add(ramTrim);

  const ramRodGeo = new THREE.CylinderGeometry(specR * 0.4, specR * 0.4, 1, 12);
  ramRodGeo.translate(0, 0.5, 0); // 피벗을 로드 하단에 둬 scale.y만으로 신장 표현
  const ramRod = new THREE.Mesh(ramRodGeo, steelMat);
  ramRod.castShadow = true;
  group.add(ramRod);

  const platenBottom = new THREE.Mesh(new THREE.CylinderGeometry(plateHalfW, plateHalfW, plateT, 20), steelMat); // 하부 플래튼(램에 의해 상승)
  platenBottom.castShadow = true; platenBottom.receiveShadow = true;
  group.add(platenBottom);

  // ── 공시체(회색 콘크리트 실린더) + 캡핑(상하 밝은 원판) ──
  // bodyGeo는 피벗을 상단(local y=0)에 두어(translate) 상단이 고정된 채
  // scale.y만으로 압축(하단이 올라오는 압축)을 표현할 수 있게 한다.
  const specimenGroup = new THREE.Group();
  specimenGroup.position.y = specTopY;
  group.add(specimenGroup);

  const bodyGeo = new THREE.CylinderGeometry(specR, specR, H0, 24);
  bodyGeo.translate(0, -H0 / 2, 0);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8d9199, roughness: 0.85, metalness: 0.03 });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true; bodyMesh.receiveShadow = true;
  specimenGroup.add(bodyMesh);

  const capMat = new THREE.MeshStandardMaterial({ color: 0xf1efe8, roughness: 0.5, metalness: 0.05 }); // 캡핑재(유황/네오프렌) — 밝은 띠
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(specR * 1.01, specR * 1.01, capT, 24), capMat);
  capTop.position.y = -capT / 2;
  const capBot = new THREE.Mesh(new THREE.CylinderGeometry(specR * 1.01, specR * 1.01, capT, 24), capMat);
  specimenGroup.add(capTop, capBot);

  // ── 파괴 유형 지오메트리: failMode 1개만 실제로 만든다(3본 공통 — 배합 1회 판정) ──
  let updateFracture; // (cp:number, specBotLocalY:number) => void — specBotLocalY는 specimenGroup 로컬 기준 공시체 하단 y(음수)
  if (failMode === 'columnar') {
    // 수직 쪼개짐 — 균열 평면(슬래브) 3개가 bodyMesh 자식으로 붙어 squash와 함께
    // 스케일되고, crackProgress에 따라 반경 방향으로 벌어지며 불투명해진다.
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.8, transparent: true, opacity: 0 });
    const slabs = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((ang) => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(specR * 0.4, H0 * 0.9, specR * 0.12), slabMat);
      slab.rotation.y = ang;
      slab.userData.angle = ang;
      bodyMesh.add(slab);
      return slab;
    });
    updateFracture = (cp) => {
      slabMat.opacity = 0.9 * cp;
      const rad = specR * 0.7 + specR * 0.5 * cp;
      for (const slab of slabs) {
        slab.position.set(Math.cos(slab.userData.angle) * rad, -H0 * 0.45, Math.sin(slab.userData.angle) * rad);
      }
      bodyMesh.scale.x = bodyMesh.scale.z = 1 + 0.08 * cp; // 쪼개지며 살짝 부푸는 실루엣
    };
  } else if (failMode === 'crumble') {
    // 부스러짐 — 하부 플래튼 위로 낙하해 쌓이는 파편(InstancedMesh, 결정적 시드).
    const FRAG_N = 24;
    const fragGeo = new THREE.IcosahedronGeometry(1, 0);
    const fp = fragGeo.attributes.position;
    const fv = new THREE.Vector3();
    for (let i = 0; i < fp.count; i++) {
      fv.fromBufferAttribute(fp, i);
      fv.multiplyScalar(0.8 + rand() * 0.35);
      fp.setXYZ(i, fv.x, fv.y, fv.z);
    }
    fragGeo.computeVertexNormals();
    const fragMat = new THREE.MeshStandardMaterial({ color: 0x8d8f95, roughness: 0.9, flatShading: true });
    const fragMesh = new THREE.InstancedMesh(fragGeo, fragMat, FRAG_N);
    fragMesh.castShadow = true; fragMesh.receiveShadow = true;
    group.add(fragMesh);
    const fragSeed = Array.from({ length: FRAG_N }, () => ({
      angle: rand() * Math.PI * 2,
      radius: specR * (0.25 + rand() * 0.95),
      size: specR * (0.09 + rand() * 0.09),
      reveal: rand() * 0.7,                       // 등장 임계값(crackProgress) — 단계적 낙하 연출
      spawnDrop: specR * (1.5 + rand() * 1.8),      // 낙하 시작 높이(플래튼 기준 오프셋)
      axis: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(),
    }));
    const fm4 = new THREE.Matrix4(), fq = new THREE.Quaternion(), fs = new THREE.Vector3(), fp3 = new THREE.Vector3();
    updateFracture = (cp, specBotLocalY, restWorldY) => {
      for (let i = 0; i < FRAG_N; i++) {
        const s = fragSeed[i];
        const local = THREE.MathUtils.clamp((cp - s.reveal) / Math.max(0.001, 1 - s.reveal), 0, 1);
        const eased = local * local * (3 - 2 * local); // smoothstep
        const scale = cp <= 0 ? 0.0001 : s.size * (0.35 + 0.65 * eased);
        const y = restWorldY + s.size * 0.5 + (1 - eased) * s.spawnDrop;
        fp3.set(Math.cos(s.angle) * s.radius, y, Math.sin(s.angle) * s.radius);
        fq.setFromAxisAngle(s.axis, eased * Math.PI * 1.4);
        fs.set(scale, scale, scale);
        fm4.compose(fp3, fq, fs);
        fragMesh.setMatrixAt(i, fm4);
      }
      fragMesh.instanceMatrix.needsUpdate = true;
    };
  } else {
    // cone(기본값) — 상하 원추 분리면이 crackProgress에 따라 진해지고 살짝 부푼다(호리병 모양 파괴면).
    const coneMat = new THREE.MeshStandardMaterial({ color: 0x3d414a, roughness: 0.8, transparent: true, opacity: 0, side: THREE.DoubleSide });
    const halfH = H0 * 0.5;
    const topCone = new THREE.Mesh(new THREE.ConeGeometry(specR * 1.05, halfH, 20, 1, true), coneMat);
    topCone.rotation.x = Math.PI; topCone.position.y = -halfH / 2; // 밑면=상단(y=0), 꼭짓점=중앙(y=-H0/2), 아래를 향함
    const botCone = new THREE.Mesh(new THREE.ConeGeometry(specR * 1.05, halfH, 20, 1, true), coneMat);
    botCone.position.y = -H0 + halfH / 2; // 밑면=하단(y=-H0), 꼭짓점=중앙(y=-H0/2), 위를 향함
    bodyMesh.add(topCone, botCone);
    updateFracture = (cp) => {
      coneMat.opacity = 0.85 * cp;
      const bulge = 1 + 0.15 * cp;
      topCone.scale.set(bulge, 1, bulge);
      botCone.scale.set(bulge, 1, bulge);
    };
  }

  // ── cast 페이즈: 몰드 3개(개방형 원통 셸 + 차오르는 콘크리트) — 재하 시작 전에만 보인다 ──
  const MOLD_X = [-140 * PXU, 0, 140 * PXU];
  const MOLD_Z = beamDepth * 2 + specR * 3; // 기계 앞쪽으로 충분히 이격
  const moldsGroup = new THREE.Group();
  group.add(moldsGroup);
  const moldShellMat = new THREE.MeshStandardMaterial({
    color: 0xb9c0c7, roughness: 0.4, metalness: 0.6, transparent: true, opacity: 0.35, side: THREE.DoubleSide,
  });
  const moldFillMat = new THREE.MeshStandardMaterial({ color: 0x83878f, roughness: 0.9 });
  const moldFills = MOLD_X.map((mx) => {
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(specR * 1.08, specR * 1.08, H0 * 1.02, 20, 1, true), moldShellMat);
    shell.position.set(mx, H0 * 0.51, MOLD_Z);
    moldsGroup.add(shell);
    const fillGeo = new THREE.CylinderGeometry(specR, specR, H0, 20);
    fillGeo.translate(0, H0 / 2, 0); // 피벗을 바닥에 둬 scale.y로 차오르는 높이를 표현
    const fill = new THREE.Mesh(fillGeo, moldFillMat);
    fill.position.set(mx, 0, MOLD_Z);
    fill.scale.y = 0.001;
    moldsGroup.add(fill);
    return fill;
  });

  // ── update(t, squash, crackProgress, cylinderVisible) ────────────────
  function update(t = 0, squash = 0, crackProgress = 0, cylinderVisible = false) {
    const squashW = Math.max(0, squash) * PXU;
    const bodyH = Math.max(0.02, H0 - squashW);
    const specBotY = specTopY - bodyH; // 월드 좌표(공시체 하단 — squash에 따라 상승)

    specimenGroup.visible = cylinderVisible;
    bodyMesh.scale.y = bodyH / H0;
    capBot.position.y = -bodyH + capT / 2;

    platenBottom.position.y = specBotY - plateT / 2;
    const rodBotY = ramHouseTopY, rodTopY = specBotY - plateT;
    ramRod.scale.y = Math.max(0.001, rodTopY - rodBotY);
    ramRod.position.y = rodBotY;

    const cp = THREE.MathUtils.clamp(crackProgress, 0, 1);
    if (failMode === 'crumble') updateFracture(cp, -bodyH, specBotY);
    else updateFracture(cp);

    // cast 몰드: 재하가 시작되면(cylinderVisible=true) 완전히 숨기고, 그 전까지는
    // t에 따라 차오르는 높이를 갱신한다(구 2D 로직 fillH = min(1, t/1.2 - i*0.15) 이식).
    moldsGroup.visible = !cylinderVisible;
    if (!cylinderVisible) {
      moldFills.forEach((fill, i) => {
        fill.scale.y = Math.max(0.001, THREE.MathUtils.clamp(t / 1.2 - i * 0.15, 0, 1));
      });
    }
  }
  update(0, 0, 0, false);

  return { group, update };
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
  buildSlumpScene,
  buildUtmScene,
};
