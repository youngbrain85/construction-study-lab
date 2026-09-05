// site/labs/room/layout.js — 3D 랩실 배치·카메라 맞춤 (순수 계산, three.js 의존 없음)
// 좌표계: 1 유닛 = 1 m, +x 오른쪽(동), +z 앞(남, 카메라 쪽), +y 위. 방 중심이 원점.
// 브라우저(ES module import)와 node 테스트(import()) 양쪽에서 쓴다. 스펙 §4.

export const ROOM = { xMin: -6, xMax: 6, zMin: -4.5, zMax: 4.5, wallH: 3.2 };   // 12 m × 9 m
export const YARD = { xMin: 6, xMax: 11, zMin: -4.5, zMax: 4.5 };               // 베이 도어 밖 마당 5 m
export const DOOR = { x: 6, zMin: -2, zMax: 2, h: 2.8 };                        // 동쪽 벽 자리의 열린 셔터 문틀
export const AISLE = { xMin: -1.7, xMax: 1.7 };                                  // 비워 두는 통로
export const BOUNDS = { min: { x: -6.4, y: 0, z: -4.9 }, max: { x: 11.4, y: 3.2, z: 4.9 } }; // 카메라 맞춤 대상

// center = 바닥 발자국 중심, size = 발자국(w: x 방향, d: z 방향), labelY = 라벨 앵커 높이, hitH = 히트박스 높이
export const STATIONS = [
  { key: 'mix',    center: { x: -3.5, z: 2.2 },  size: { w: 3.6, d: 3.0 }, labelY: 2.3, hitH: 2.4 },
  { key: 'soil',   center: { x: -3.5, z: -2.6 }, size: { w: 3.6, d: 2.4 }, labelY: 2.3, hitH: 2.4 },
  { key: 'steel',  center: { x: 3.4,  z: -2.6 }, size: { w: 3.4, d: 2.4 }, labelY: 2.6, hitH: 2.4 },
  { key: 'wood',   center: { x: 3.5,  z: 2.2 },  size: { w: 3.6, d: 3.0 }, labelY: 2.6, hitH: 2.4 },
  { key: 'survey', center: { x: 8.6,  z: 0.2 },  size: { w: 3.6, d: 4.0 }, labelY: 2.3, hitH: 2.0 },
];

export const CAMERA = {
  targetY: 0.8,
  landscape: { yawDeg: 35, pitchDeg: 50, fovDeg: 36, margin: 1.08 }, // aspect ≥ 1: 앞쪽 오른쪽(남동) 위에서
  portrait:  { yawDeg: 80, pitchDeg: 55, fovDeg: 52, margin: 1.04 }, // aspect < 1: 마당 쪽(동) 끝에서, 넓은 fov
};

const UP = { x: 0, y: 1, z: 0 };
const rad = (deg) => (deg * Math.PI) / 180;
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const scale = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const norm = (a) => { const l = Math.hypot(a.x, a.y, a.z) || 1; return scale(a, 1 / l); };

export function orientationFor(aspect) { return aspect < 1 ? 'portrait' : 'landscape'; }

// 타깃 → 카메라 단위벡터 (yaw: +z 축에서 +x 쪽으로 도는 각, pitch: 수평에서 위로)
export function viewDir(yawDeg, pitchDeg) {
  const y = rad(yawDeg), p = rad(pitchDeg);
  return { x: Math.sin(y) * Math.cos(p), y: Math.sin(p), z: Math.cos(y) * Math.cos(p) };
}

// 카메라 기저: f(보는 방향), r(오른쪽), u(위) — three.js lookAt(up = +y)과 같은 규약
export function cameraBasis(dir) {
  const f = norm(scale(dir, -1));
  const r = norm(cross(f, UP));
  const u = cross(r, f);
  return { f, r, u };
}

export function boundsCorners(b = BOUNDS) {
  const out = [];
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) out.push({ x, y, z });
  return out;
}

// BOUNDS 꼭짓점 8개가 모두 시야 안에 들어오는 최소 거리 — 닫힌식, 반복 없음 (스펙 §4)
export function fitCamera(aspect, opts = {}) {
  const o = CAMERA[orientationFor(aspect)];
  const bounds = opts.bounds || BOUNDS;
  const target = { x: (bounds.min.x + bounds.max.x) / 2, y: CAMERA.targetY, z: (bounds.min.z + bounds.max.z) / 2 };
  const dir = viewDir(o.yawDeg, o.pitchDeg);
  const { f, r, u } = cameraBasis(dir);
  const tanV = Math.tan(rad(o.fovDeg) / 2), tanH = tanV * aspect;
  let d = 1;
  for (const c of boundsCorners(bounds)) {
    const v = sub(c, target);
    const lx = dot(v, r), ly = dot(v, u), lz = dot(v, f);
    d = Math.max(d, (Math.abs(lx) * o.margin) / tanH - lz, (Math.abs(ly) * o.margin) / tanV - lz);
  }
  const position = { x: target.x + dir.x * d, y: target.y + dir.y * d, z: target.z + dir.z * d };
  return { position, target, dir, fovDeg: o.fovDeg, distance: d };
}

// 원근 투영 (테스트·검증용. 브라우저는 three.js Vector3.project 를 쓰며 같은 결과여야 한다)
export function projectPoint(fit, aspect, p, w = 2, h = 2) {
  const { f, r, u } = cameraBasis(fit.dir);
  const v = sub(p, fit.position);
  const zc = dot(v, f);
  const tanV = Math.tan(rad(fit.fovDeg) / 2), tanH = tanV * aspect;
  const nx = dot(v, r) / (zc * tanH), ny = dot(v, u) / (zc * tanV);
  return { nx, ny, depth: zc, x: ((nx + 1) / 2) * w, y: ((1 - ny) / 2) * h };
}

// 라벨 상자 겹침 해소: 화면 y 내림차순(가까운 것부터) 고정, 겹치는 먼 쪽 상자를 8px 간격으로 위로 민다.
// boxes = [{ key, x, y, w, h }] (px, 좌상단). 제자리 수정, 밀린 거리는 box.lead 에 기록. 5개라 비용 없음.
export function deoverlapLabels(boxes) {
  const order = [...boxes].sort((a, b) => b.y - a.y);
  const placed = [];
  for (const b of order) {
    b.lead = 0;
    let guard = 0;
    for (let i = 0; i < placed.length && guard < 50; i++, guard++) {
      const p = placed[i];
      const overlapX = b.x < p.x + p.w && p.x < b.x + b.w;
      const overlapY = b.y < p.y + p.h && p.y < b.y + b.h;
      if (overlapX && overlapY) {
        const ny = p.y - b.h - 8;
        b.lead += b.y - ny;
        b.y = ny;
        i = -1; // 위치가 바뀌었으니 처음부터 다시 검사
      }
    }
    placed.push(b);
  }
  return boxes;
}

// 결정적 난수 (표준 mulberry32) — 소품 배치용. Math.random 금지 계약(스펙 §8)
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

if (typeof window !== 'undefined') {
  window.LabLayout = { ROOM, YARD, DOOR, AISLE, BOUNDS, STATIONS, CAMERA, orientationFor, viewDir, cameraBasis, boundsCorners, fitCamera, projectPoint, deoverlapLabels, mulberry32 };
}
