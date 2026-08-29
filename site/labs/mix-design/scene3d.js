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
};
