// site/labs/room/props.js — 3D 랩실 소품 빌더 (three.js 절차 모델). 1 유닛 = 1 m, 각 빌더는 스테이션 중심 기준 로컬 좌표, 바닥 y = 0.
// 스펙 §5.2. 재질은 스테이션마다 makePalette() 로 새로 만든다(호버 emissive 가 다른 스테이션으로 새지 않게).
import * as THREE from '../../shared/vendor/three.module.js';

const GREY = new THREE.Color(0x9aa3ab);
function std(hex, { metalness = 0, roughness = 0.85, muted = false } = {}) {
  const color = new THREE.Color(hex);
  if (muted) color.lerp(GREY, 0.7);
  return new THREE.MeshStandardMaterial({ color, metalness: muted ? 0.1 : metalness, roughness: muted ? 0.9 : roughness });
}

// 팔레트: muted = Coming soon 스테이션용 회색조
export function makePalette({ muted = false } = {}) {
  return {
    steel: std(0xb8bec6, { metalness: 0.35, roughness: 0.55, muted }), // envMap 없는 장면에서 보이는 금속감(UTM 선례)
    dark: std(0x2a2d31, { metalness: 0.2, roughness: 0.7, muted }),
    orange: std(0xe8731a, { roughness: 0.6, muted }),
    wood: std(0xd9b382, { roughness: 0.8, muted }),
    concrete: std(0x9c9c98, { roughness: 0.95, muted }),
    rubber: std(0x2b2b2b, { roughness: 0.95, muted }),
    royal: std(0x0053a5, { roughness: 0.6, muted }),
    white: std(0xf2f2f2, { roughness: 0.7, muted }),
    red: std(0xd7263d, { roughness: 0.7, muted }),
    soil: std(0x8a6a4a, { roughness: 0.95, muted }),
  };
}

function shadowed(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }
export function box(w, h, d, mat, x = 0, y = 0, z = 0, ry = 0) {
  const m = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
  m.position.set(x, y, z); m.rotation.y = ry;
  return m;
}
export function cyl(rTop, rBot, h, mat, x = 0, y = 0, z = 0, seg = 16) {
  const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat));
  m.position.set(x, y, z);
  return m;
}
// 두 점을 잇는 막대(삼각대 다리·선반 봉·줄)
export function rod(a, b, r, mat, seg = 8) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length() || 0.001;
  const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat));
  m.position.copy(a).lerp(b, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

// ── 방 껍데기: 바닥·줄눈·마당·북/서 벽·허리띠·문틀 ────────────────────────
export function buildRoomShell(ROOM, YARD, DOOR) {
  const g = new THREE.Group(); g.name = 'roomShell';
  const W = ROOM.xMax - ROOM.xMin, D = ROOM.zMax - ROOM.zMin;
  const cx = (ROOM.xMin + ROOM.xMax) / 2, cz = (ROOM.zMin + ROOM.zMax) / 2;

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, D), new THREE.MeshStandardMaterial({ color: 0xcfd4da, roughness: 0.95 }));
  floor.position.set(cx, -0.05, cz); floor.receiveShadow = true; floor.name = 'floor'; g.add(floor);

  const pts = []; // 2 m 간격 줄눈 — LineSegments 1개
  for (let x = ROOM.xMin + 2; x < ROOM.xMax; x += 2) pts.push(x, 0.005, ROOM.zMin, x, 0.005, ROOM.zMax);
  for (let z = ROOM.zMin + 2; z < ROOM.zMax; z += 2) pts.push(ROOM.xMin, 0.005, z, ROOM.xMax, 0.005, z);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xb9c0c8 })));

  const yard = new THREE.Mesh(new THREE.BoxGeometry(YARD.xMax - YARD.xMin, 0.1, YARD.zMax - YARD.zMin), new THREE.MeshStandardMaterial({ color: 0xcfc9bb, roughness: 1 }));
  yard.position.set((YARD.xMin + YARD.xMax) / 2, -0.05, (YARD.zMin + YARD.zMax) / 2); yard.receiveShadow = true; yard.name = 'yard'; g.add(yard);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe9f6fc, roughness: 0.9 });
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x003665, roughness: 0.8 });
  const T = 0.2, H = ROOM.wallH;
  const north = new THREE.Mesh(new THREE.BoxGeometry(W + T, H, T), wallMat); north.position.set(cx - T / 2, H / 2, ROOM.zMin - T / 2); north.receiveShadow = true; g.add(north);
  const west = new THREE.Mesh(new THREE.BoxGeometry(T, H, D), wallMat); west.position.set(ROOM.xMin - T / 2, H / 2, cz); west.receiveShadow = true; g.add(west);
  const bandN = new THREE.Mesh(new THREE.BoxGeometry(W, 0.15, 0.02), bandMat); bandN.position.set(cx, 0.975, ROOM.zMin + 0.01); shadowed(bandN); g.add(bandN);
  const bandW = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, D), bandMat); bandW.position.set(ROOM.xMin + 0.01, 0.975, cz); shadowed(bandW); g.add(bandW);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0053a5, roughness: 0.6 }); // 열린 셔터 문틀(기둥 2 + 보)
  for (const z of [DOOR.zMin, DOOR.zMax]) g.add(box(0.25, DOOR.h, 0.25, frameMat, DOOR.x, DOOR.h / 2, z));
  g.add(box(0.25, 0.3, DOOR.zMax - DOOR.zMin + 0.25, frameMat, DOOR.x, DOOR.h + 0.15, (DOOR.zMin + DOOR.zMax) / 2));
  return g;
}

// ── Soil Testing: 작업대 + 체분기 + Proctor 몰드·해머 + 직접전단 시험기 + 시료 통 ─────
export function buildSoilBench(pal) {
  const g = new THREE.Group(); g.name = 'soil';
  g.add(box(2.8, 0.06, 0.9, pal.wood, 0, 0.87, -0.6));                                   // 상판 (윗면 y=0.90)
  for (const [x, z] of [[-1.3, -0.95], [1.3, -0.95], [-1.3, -0.25], [1.3, -0.25]]) g.add(box(0.08, 0.84, 0.08, pal.dark, x, 0.42, z));
  g.add(box(2.6, 0.04, 0.7, pal.dark, 0, 0.25, -0.6));                                    // 하단 선반
  // 체분기: 받침 + 기둥 2 + 체 5장 + 뚜껑
  g.add(box(0.5, 0.05, 0.5, pal.dark, -1.0, 0.925, -0.6));
  g.add(cyl(0.02, 0.02, 0.6, pal.steel, -1.2, 1.25, -0.6, 8)); g.add(cyl(0.02, 0.02, 0.6, pal.steel, -0.8, 1.25, -0.6, 8));
  for (let i = 0; i < 5; i++) g.add(cyl(0.16, 0.16, 0.07, i % 2 ? pal.steel : pal.white, -1.0, 1.0 + i * 0.085, -0.6, 20));
  g.add(cyl(0.17, 0.17, 0.05, pal.dark, -1.0, 1.45, -0.6, 20));
  // Proctor 몰드(실린더 + 칼라) + 다짐 해머
  g.add(cyl(0.08, 0.08, 0.12, pal.steel, 0, 0.96, -0.6, 20)); g.add(cyl(0.085, 0.085, 0.05, pal.dark, 0, 1.045, -0.6, 20));
  g.add(cyl(0.015, 0.015, 0.45, pal.steel, 0.22, 1.125, -0.7, 8)); g.add(cyl(0.035, 0.035, 0.1, pal.dark, 0.22, 0.95, -0.7, 12));
  // 직접전단 시험기: 본체 + 상부 프레임 + 다이얼 + 핸들
  g.add(box(0.5, 0.25, 0.35, pal.royal, 1.0, 1.025, -0.6)); g.add(box(0.36, 0.2, 0.28, pal.steel, 1.0, 1.25, -0.6));
  const dial = cyl(0.06, 0.06, 0.03, pal.white, 1.0, 1.36, -0.45, 20); dial.rotation.x = Math.PI / 2; g.add(dial);
  g.add(cyl(0.02, 0.02, 0.12, pal.steel, 1.3, 1.2, -0.6, 8));
  // 바닥: 흙 시료 통 2개(하나는 흙이 담김)
  g.add(cyl(0.22, 0.18, 0.35, pal.dark, 1.2, 0.175, 0.6, 16)); g.add(cyl(0.2, 0.2, 0.04, pal.soil, 1.2, 0.37, 0.6, 16));
  g.add(cyl(0.22, 0.18, 0.35, pal.dark, 0.7, 0.175, 0.7, 16));
  return g;
}

// ── Steel: 인장 프레임(기둥 2·크로스헤드·그립·철근 시편) + 시편 선반 + 파단 시편 트레이 ──
export function buildTensileFrame(pal) {
  const g = new THREE.Group(); g.name = 'steel';
  const X = -0.6, Z = -0.3;
  g.add(box(1.1, 0.25, 0.7, pal.steel, X, 0.125, Z));                                     // 베이스
  for (const dx of [-0.35, 0.35]) g.add(cyl(0.05, 0.05, 1.9, pal.steel, X + dx, 1.2, Z, 16));  // 기둥 2
  g.add(box(1.0, 0.2, 0.5, pal.steel, X, 2.25, Z));                                       // 크로스헤드
  g.add(box(0.45, 0.12, 0.4, pal.dark, X, 1.35, Z));                                      // 이동 빔
  g.add(box(0.12, 0.2, 0.12, pal.dark, X, 1.19, Z)); g.add(box(0.12, 0.2, 0.12, pal.dark, X, 0.35, Z)); // 상·하 그립
  g.add(cyl(0.014, 0.014, 0.66, pal.dark, X, 0.77, Z, 10));                               // 철근 시편
  for (let i = 0; i < 6; i++) g.add(cyl(0.02, 0.02, 0.012, pal.dark, X, 0.5 + i * 0.1, Z, 10)); // 마디
  g.add(box(0.5, 0.35, 0.3, pal.royal, X, 0.175, Z + 0.5));                               // 유압 유닛(바닥에 놓여 베이스에 붙음)
  g.add(box(0.25, 0.18, 0.08, pal.dark, X, 1.7, Z - 0.3)); g.add(box(0.2, 0.1, 0.02, pal.white, X, 1.7, Z - 0.35)); // 판독기
  const RX = 0.9, RZ = -0.5;                                                              // 시편 선반
  g.add(box(0.7, 0.05, 0.4, pal.dark, RX, 0.5, RZ)); for (const dx of [-0.32, 0.32]) g.add(box(0.05, 0.5, 0.4, pal.dark, RX + dx, 0.25, RZ));
  for (let i = 0; i < 6; i++) g.add(rod(new THREE.Vector3(RX - 0.28 + i * 0.11, 0.53, RZ + 0.15), new THREE.Vector3(RX - 0.2 + i * 0.11, 1.35, RZ - 0.15), 0.014, pal.dark));
  g.add(box(0.7, 0.06, 0.5, pal.steel, RX, 0.03, RZ + 1.0));                              // 파단 시편 트레이
  for (let i = 0; i < 4; i++) { const s = cyl(0.014, 0.014, 0.28, pal.dark, RX - 0.24 + i * 0.16, 0.075, RZ + 1.0, 8); s.rotation.z = Math.PI / 2; g.add(s); }
  return g;
}

// ── Wood Framing: 스터드 벽 패널 + 테이블소 + 2×4 목재 더미 ────────────────────
export function buildFramingStation(pal) {
  const g = new THREE.Group(); g.name = 'wood';
  const PZ = -1.1, L = 2.4, H = 2.4, T = 0.09, D = 0.04;                                 // 패널: x 축과 평행
  g.add(box(L, D, T, pal.wood, 0, D / 2, PZ)); g.add(box(L, D, T, pal.wood, 0, H - D / 2, PZ)); g.add(box(L, D, T, pal.wood, 0, H - D * 1.5, PZ)); // 하부·상부 이중 플레이트
  for (let i = 0; i <= 6; i++) g.add(box(D, H - D * 3, T, pal.wood, -L / 2 + D / 2 + i * 0.393, D + (H - D * 3) / 2, PZ)); // 스터드 16" 간격 (하부 플레이트 위에 얹힘)
  g.add(box(1.0, 0.18, T, pal.wood, 0.4, 1.95, PZ));                                       // 헤더
  g.add(box(1.0, D, T, pal.wood, 0.4, 0.9, PZ));                                           // 창 하부 플레이트
  const SX = -0.9, SZ = 0.6;                                                              // 테이블소
  g.add(box(0.8, 0.05, 0.6, pal.steel, SX, 0.85, SZ));
  for (const [dx, dz] of [[-0.35, -0.25], [0.35, -0.25], [-0.35, 0.25], [0.35, 0.25]]) g.add(box(0.05, 0.83, 0.05, pal.dark, SX + dx, 0.415, SZ + dz));
  const blade = cyl(0.12, 0.12, 0.01, pal.steel, SX, 0.95, SZ, 24); blade.rotation.z = Math.PI / 2; g.add(blade);
  g.add(box(0.06, 0.08, 0.6, pal.orange, SX + 0.25, 0.9, SZ));                             // 펜스
  const LX = 0.9, LZ = 0.55;                                                              // 2×4 더미 (0.09 × 0.04 × 1.8) 4×2
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) g.add(box(0.09, 0.04, 1.8, pal.wood, LX - 0.17 + c * 0.11, 0.02 + r * 0.045, LZ));
  g.add(box(0.5, 0.04, 0.1, pal.dark, LX, 0.11, LZ - 0.6)); g.add(box(0.5, 0.04, 0.1, pal.dark, LX, 0.11, LZ + 0.6)); // 받침목
  return g;
}

// ── Surveying: 삼각대+토탈스테이션, 레벨 로드, 벤치마크 말뚝 2 + 줄 ───────────────
export function buildSurveyStation(pal) {
  const g = new THREE.Group(); g.name = 'survey';
  const TX = -0.6, TZ = 0.3, top = new THREE.Vector3(TX, 1.5, TZ);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; g.add(rod(new THREE.Vector3(TX + Math.cos(a) * 0.55, 0, TZ + Math.sin(a) * 0.55), top, 0.018, pal.orange)); }
  g.add(cyl(0.12, 0.12, 0.04, pal.dark, TX, 1.52, TZ, 16));                               // 헤드
  g.add(box(0.18, 0.06, 0.2, pal.royal, TX, 1.57, TZ));                                    // 트리브랙
  g.add(box(0.16, 0.2, 0.18, pal.white, TX, 1.7, TZ)); g.add(box(0.06, 0.08, 0.26, pal.dark, TX, 1.85, TZ)); // 본체 + 망원경
  const RX = 1.3, RZ = -1.4;                                                              // 레벨 로드: 빨강·흰 띠 10개
  for (let i = 0; i < 10; i++) g.add(box(0.06, 0.2, 0.025, i % 2 ? pal.white : pal.red, RX, 0.1 + i * 0.2, RZ));
  g.add(box(0.12, 0.04, 0.12, pal.dark, RX, 0.02, RZ));
  const A = new THREE.Vector3(-1.2, 0.45, -1.5), B = new THREE.Vector3(1.0, 0.45, 1.6);  // 벤치마크 말뚝 + 줄
  for (const p of [A, B]) { g.add(box(0.06, 0.5, 0.06, pal.wood, p.x, 0.25, p.z)); g.add(box(0.08, 0.05, 0.08, pal.red, p.x, 0.52, p.z)); }
  g.add(rod(A, B, 0.006, pal.white, 6));
  return g;
}

// ── 발자국 테두리(호버·활성 표시): 구멍 뚫린 사각 평면 1개 ─────────────────────
export function buildFloorRing({ w, d }, thickness = 0.06) {
  const shape = new THREE.Shape([new THREE.Vector2(-w / 2, -d / 2), new THREE.Vector2(w / 2, -d / 2), new THREE.Vector2(w / 2, d / 2), new THREE.Vector2(-w / 2, d / 2)]);
  shape.holes.push(new THREE.Path([new THREE.Vector2(-w / 2 + thickness, -d / 2 + thickness), new THREE.Vector2(w / 2 - thickness, -d / 2 + thickness), new THREE.Vector2(w / 2 - thickness, d / 2 - thickness), new THREE.Vector2(-w / 2 + thickness, d / 2 - thickness)]));
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0x0053a5, transparent: true, opacity: 0.55, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.01; mesh.name = 'ring';
  return mesh;
}

// ── 히트박스: 그리지 않지만(colorWrite/depthWrite false) visible 이라 레이캐스트 대상 ────
export function buildHitBox({ w, d }, h, key) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  mesh.position.y = h / 2; mesh.userData.station = key; mesh.name = 'hit';
  return mesh;
}
