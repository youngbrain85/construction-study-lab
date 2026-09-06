// site/labs/room/decor.js — 3D 랩실 디테일 소품: 베이 도어·벽 장식·바닥 비품·마당 장비 (three.js 절차 모델, 월드 좌표)
// 스펙 §12. 호버 대상이 아니라 히트박스와 무관하고, 재질은 이 모듈이 자체 팔레트로 만든다(스테이션 emissive 강조와 분리).
import * as THREE from '../../shared/vendor/three.module.js';
import { box, cyl, rod } from './props.js';

function mat(hex, o = {}) {
  return new THREE.MeshStandardMaterial({ color: hex, metalness: o.metalness ?? 0, roughness: o.roughness ?? 0.85 });
}
function shadowed(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }

// 팔레트(호출마다 새 인스턴스) — 안전색 노랑 0xf2c200, 캐비닛 0xe6ebef, 골판지 0xc8a878, 모래 0xd8c49a, 보드 0xd9dde2
export function decorPalette() {
  return {
    steel: mat(0xb8bec6, { metalness: 0.35, roughness: 0.55 }),
    darkSteel: mat(0x3a3f45, { metalness: 0.3, roughness: 0.6 }),
    dark: mat(0x2a2d31, { metalness: 0.2, roughness: 0.7 }),
    royal: mat(0x0053a5, { roughness: 0.6 }),
    navy: mat(0x003665, { roughness: 0.7 }),
    white: mat(0xf4f4f4, { roughness: 0.7 }),
    cabinet: mat(0xe6ebef, { roughness: 0.75 }),
    yellow: mat(0xf2c200, { roughness: 0.6 }),
    orange: mat(0xe8731a, { roughness: 0.6 }),
    red: mat(0xd7263d, { roughness: 0.6 }),
    wood: mat(0xc9a27a, { roughness: 0.85 }),
    cardboard: mat(0xc8a878, { roughness: 0.95 }),
    rubber: mat(0x2b2b2b, { roughness: 0.95 }),
    sand: mat(0xd8c49a, { roughness: 1 }),
    board: mat(0xd9dde2, { roughness: 0.9 }),
    wall: mat(0xe9f6fc, { roughness: 0.9 }),
  };
}

// 반구(안전모·모래 더미)
function dome(r, m, x, y, z, seg = 24) {
  const g = shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.6), 0, Math.PI * 2, 0, Math.PI / 2), m));
  g.position.set(x, y, z);
  return g;
}

// ── 베이 도어: 반벽 + 문설주/레일 + 롤업 하우징·드럼 + 슬랫 커튼 + 문턱·해저드 스트라이프 ────
export function buildBayDoor(DOOR, ROOM, pal = decorPalette()) {
  const g = new THREE.Group(); g.name = 'bayDoor';
  const x = DOOR.x, W = DOOR.zMax - DOOR.zMin, zc = (DOOR.zMin + DOOR.zMax) / 2;
  const HW = 1.1, T = 0.2; // 반벽: 높은 벽은 뒤쪽 스테이션을 가리므로 1.1 m
  for (const [z0, z1] of [[ROOM.zMin, DOOR.zMin - 0.35], [DOOR.zMax + 0.35, ROOM.zMax]]) {
    const len = z1 - z0, zm = (z0 + z1) / 2;
    g.add(box(T, HW, len, pal.wall, x, HW / 2, zm));
    g.add(box(T + 0.06, 0.06, len, pal.navy, x, HW + 0.03, zm)); // 갓돌(허리띠와 같은 Dark)
  }
  for (const s of [-1, 1]) { // 문설주 + 가이드 레일
    g.add(box(0.35, DOOR.h + 0.2, 0.35, pal.darkSteel, x, (DOOR.h + 0.2) / 2, zc + s * (W / 2 + 0.175)));
    g.add(box(0.12, DOOR.h, 0.08, pal.steel, x, DOOR.h / 2, zc + s * (W / 2 - 0.04)));
  }
  g.add(box(0.55, 0.4, W + 0.7, pal.royal, x, DOOR.h + 0.2, zc));            // 롤업 하우징(윗면 = 벽 높이 3.2 m, BOUNDS 안)
  g.add(box(0.57, 0.08, W + 0.72, pal.navy, x, DOOR.h + 0.06, zc));           // 하우징 하단 립
  const drum = cyl(0.2, 0.2, W - 0.1, pal.steel, x, DOOR.h - 0.05, zc, 24); drum.rotation.x = Math.PI / 2; g.add(drum);
  for (let i = 0; i < 5; i++) {                                                // 절반 내려온 슬랫 커튼(하단 ≥ 1.5 m 열림)
    const slat = box(0.06, 0.17, W - 0.12, i % 2 ? pal.steel : pal.cabinet, x, DOOR.h - 0.35 - i * 0.19, zc); slat.name = 'slat'; g.add(slat);
  }
  g.add(box(0.5, 0.02, W, pal.darkSteel, x, 0.01, zc));                       // 문턱 판
  const n = 10, sw = W / n;                                                    // 마당 쪽 해저드 스트라이프
  for (let i = 0; i < n; i++) g.add(box(0.5, 0.012, sw, i % 2 ? pal.yellow : pal.dark, x + 0.6, 0.006, DOOR.zMin + sw * (i + 0.5)));
  return g;
}

// ── 벽 장식·바닥 비품 ────────────────────────────────────────────────
export function buildWallDecor(ROOM, pal = decorPalette()) {
  const g = new THREE.Group(); g.name = 'wallDecor';
  const zN = ROOM.zMin, xW = ROOM.xMin;

  // 월캐비닛(0.75 × 0.7 × 0.35, y 1.7–2.4): 북벽 4칸(흙 시험대 위), 서벽 2칸
  const cabinet = (cx, cz, alongX) => {
    const w = 0.75, hgt = 0.7, d = 0.35, y = 2.05;
    if (alongX) {
      g.add(box(w, hgt, d, pal.cabinet, cx, y, cz + d / 2));
      g.add(box(0.012, hgt - 0.1, 0.01, pal.dark, cx, y, cz + d + 0.005));          // 문 홈
      g.add(box(0.03, 0.12, 0.03, pal.darkSteel, cx + 0.08, y - 0.1, cz + d + 0.02)); // 손잡이
    } else {
      g.add(box(d, hgt, w, pal.cabinet, cx + d / 2, y, cz));
      g.add(box(0.01, hgt - 0.1, 0.012, pal.dark, cx + d + 0.005, y, cz));
      g.add(box(0.03, 0.12, 0.03, pal.darkSteel, cx + d + 0.02, y - 0.1, cz + 0.08));
    }
  };
  for (const cx of [-5.0, -4.2, -3.4, -2.6]) cabinet(cx, zN, true);
  for (const cz of [1.8, 2.6]) cabinet(xW, cz, false);

  // 벽시계(북벽, 통로 위)
  const rim = cyl(0.19, 0.19, 0.04, pal.dark, -0.6, 2.6, zN + 0.02, 32); rim.rotation.x = Math.PI / 2; g.add(rim);
  const face = cyl(0.16, 0.16, 0.05, pal.white, -0.6, 2.6, zN + 0.025, 32); face.rotation.x = Math.PI / 2; g.add(face);
  g.add(box(0.015, 0.11, 0.01, pal.dark, -0.6, 2.655, zN + 0.055));   // 분침
  g.add(box(0.08, 0.015, 0.01, pal.dark, -0.56, 2.6, zN + 0.055));    // 시침

  // 안전 표지판(흰 판 + 빨간 테두리 + 글줄)
  g.add(box(0.9, 0.6, 0.03, pal.white, 1.4, 2.2, zN + 0.015));
  for (const [w, hh, dx, dy] of [[0.9, 0.05, 0, 0.275], [0.9, 0.05, 0, -0.275], [0.05, 0.6, -0.425, 0], [0.05, 0.6, 0.425, 0]]) g.add(box(w, hh, 0.032, pal.red, 1.4 + dx, 2.2 + dy, zN + 0.016));
  for (let i = 0; i < 3; i++) g.add(box(0.55 - i * 0.12, 0.035, 0.034, pal.dark, 1.4, 2.32 - i * 0.11, zN + 0.017));

  // 후크 레일(문 옆): 안전조끼 2 + 안전모 4
  g.add(box(2.5, 0.05, 0.05, pal.darkSteel, 4.4, 2.0, zN + 0.03));
  for (const vx of [3.35, 3.85]) {
    g.add(box(0.03, 0.06, 0.03, pal.darkSteel, vx, 1.95, zN + 0.05));
    g.add(box(0.4, 0.6, 0.05, pal.orange, vx, 1.6, zN + 0.03));
    for (const dy of [0.12, -0.05]) g.add(box(0.4, 0.05, 0.052, pal.white, vx, 1.6 + dy, zN + 0.031)); // 반사띠
  }
  [pal.yellow, pal.white, pal.orange, pal.royal].forEach((m, i) => {
    const hx = 4.35 + i * 0.37, hy = 1.8, hz = zN + 0.17;
    g.add(box(0.03, 0.06, 0.03, pal.darkSteel, hx, 1.95, zN + 0.05));
    g.add(dome(0.14, m, hx, hy, hz, 24));
    g.add(cyl(0.19, 0.19, 0.02, m, hx, hy, hz, 24)); // 챙
  });

  // 소화기 + 표지(북동 모서리, 문 옆)
  g.add(cyl(0.085, 0.085, 0.5, pal.red, 5.6, 0.55, zN + 0.2, 24));
  g.add(cyl(0.04, 0.04, 0.08, pal.dark, 5.6, 0.84, zN + 0.2, 16));
  g.add(box(0.03, 0.12, 0.03, pal.dark, 5.6, 0.86, zN + 0.16));
  g.add(box(0.25, 0.25, 0.02, pal.red, 5.6, 1.35, zN + 0.01)); g.add(box(0.15, 0.15, 0.022, pal.white, 5.6, 1.35, zN + 0.011));

  // 서벽: 페그보드 + 공구
  g.add(box(0.04, 1.0, 1.6, pal.board, xW + 0.02, 1.75, -1.8));
  const tx = xW + 0.07;
  g.add(box(0.05, 0.06, 0.9, pal.yellow, tx, 2.1, -1.85));                       // 수평기
  g.add(box(0.052, 0.04, 0.05, pal.dark, tx, 2.1, -1.85));                       // 기포창
  g.add(box(0.03, 0.3, 0.03, pal.wood, tx, 1.5, -2.35)); g.add(box(0.06, 0.06, 0.12, pal.darkSteel, tx, 1.68, -2.35)); // 망치
  const tape = cyl(0.06, 0.06, 0.05, pal.yellow, tx, 1.55, -1.65, 24); tape.rotation.z = Math.PI / 2; g.add(tape);   // 줄자
  for (const tz of [-1.35, -1.2]) { g.add(box(0.02, 0.28, 0.03, pal.steel, tx, 1.55, tz)); g.add(box(0.02, 0.05, 0.07, pal.steel, tx, 1.71, tz)); } // 렌치 2
  // 삽(보드 옆에 걸림)
  g.add(rod(new THREE.Vector3(tx, 0.75, -0.7), new THREE.Vector3(tx, 1.95, -0.7), 0.018, pal.wood, 12));
  g.add(box(0.03, 0.32, 0.22, pal.darkSteel, tx, 0.58, -0.7));
  g.add(box(0.03, 0.06, 0.12, pal.darkSteel, tx, 1.96, -0.7));
  // 화이트보드(서벽, 통로 맞은편)
  g.add(box(0.03, 0.9, 1.4, pal.white, xW + 0.015, 1.75, 0.4));
  for (const [hh, w, dy, dz] of [[0.04, 1.4, 0.43, 0], [0.04, 1.4, -0.43, 0], [0.9, 0.04, 0, -0.68], [0.9, 0.04, 0, 0.68]]) g.add(box(0.032, hh, w, pal.dark, xW + 0.016, 1.75 + dy, 0.4 + dz));
  g.add(box(0.06, 0.03, 1.2, pal.darkSteel, xW + 0.03, 1.28, 0.4));            // 마커 받침
  for (let i = 0; i < 3; i++) g.add(box(0.034, 0.03, 0.6 - i * 0.15, pal.royal, xW + 0.017, 2.05 - i * 0.14, 0.15 + i * 0.1)); // 글줄
  // 선반 랙(서벽 뒷모서리, z 축 방향 1.2 m)
  const rx = xW + 0.3, rz = -3.7;
  for (const [dx, dz] of [[-0.2, -0.55], [0.2, -0.55], [-0.2, 0.55], [0.2, 0.55]]) g.add(box(0.05, 2.0, 0.05, pal.darkSteel, rx + dx, 1.0, rz + dz));
  for (const sy of [0.25, 0.85, 1.45]) g.add(box(0.5, 0.04, 1.2, pal.steel, rx, sy, rz));
  g.add(box(0.4, 0.3, 0.4, pal.cardboard, rx, 0.42, rz - 0.3)); g.add(box(0.35, 0.25, 0.35, pal.cardboard, rx, 0.4, rz + 0.25));
  g.add(cyl(0.14, 0.12, 0.3, pal.white, rx, 1.02, rz - 0.35, 20)); g.add(cyl(0.14, 0.12, 0.3, pal.white, rx, 1.02, rz - 0.05, 20));
  g.add(box(0.3, 0.22, 0.35, pal.cardboard, rx, 0.98, rz + 0.32));
  g.add(box(0.35, 0.2, 0.5, pal.royal, rx, 1.57, rz - 0.25)); g.add(cyl(0.12, 0.12, 0.25, pal.orange, rx, 1.6, rz + 0.3, 20));
  // 툴체스트(빨강 서랍 캐비닛, 뒷벽 통로 끝)
  const cx0 = 0.9, cz0 = zN + 0.28;
  g.add(box(0.7, 0.85, 0.5, pal.red, cx0, 0.55, cz0));
  for (let i = 0; i < 4; i++) g.add(box(0.6, 0.02, 0.01, pal.dark, cx0, 0.25 + i * 0.19, cz0 + 0.255));   // 서랍 홈
  for (let i = 0; i < 4; i++) g.add(box(0.2, 0.025, 0.02, pal.steel, cx0, 0.33 + i * 0.19, cz0 + 0.26)); // 손잡이
  for (const [dx, dz] of [[-0.28, -0.18], [0.28, -0.18], [-0.28, 0.18], [0.28, 0.18]]) { const c = cyl(0.05, 0.05, 0.04, pal.rubber, cx0 + dx, 0.05, cz0 + dz, 16); c.rotation.z = Math.PI / 2; g.add(c); }
  g.add(box(0.72, 0.03, 0.52, pal.dark, cx0, 0.99, cz0));                       // 상판
  // 통로 양쪽 노란 안전선
  for (const lx of [-1.6, 1.6]) g.add(box(0.06, 0.006, ROOM.zMax - ROOM.zMin - 0.6, pal.yellow, lx, 0.003, 0));
  return g;
}

// ── 마당 장비: 안전 콘·손수레·팔레트+포대·모래 더미·배럴 ──────────────────────
export function buildYardExtras(YARD, pal = decorPalette()) {
  const g = new THREE.Group(); g.name = 'yardExtras';
  const cone = (x, z) => {
    g.add(box(0.36, 0.04, 0.36, pal.dark, x, 0.02, z));
    const c = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.17, 0.6, 24), pal.orange)); c.position.set(x, 0.34, z); g.add(c);
    g.add(cyl(0.105, 0.125, 0.09, pal.white, x, 0.4, z, 24)); // 흰 띠
  };
  cone(7.0, 3.7); cone(7.6, 3.15); cone(10.4, 3.5);
  // 외바퀴 손수레
  const wb = new THREE.Group(); wb.position.set(8.4, 0, 3.5); wb.rotation.y = 0.5;
  wb.add(box(0.62, 0.34, 0.95, pal.dark, 0, 0.5, 0)); wb.add(box(0.52, 0.3, 0.85, pal.steel, 0, 0.53, 0)); // 통(겉/속 — 윗면이 트인 느낌)
  const wheel = cyl(0.2, 0.2, 0.07, pal.rubber, 0, 0.2, 0.62, 24); wheel.rotation.z = Math.PI / 2; wb.add(wheel);
  const hub = cyl(0.05, 0.05, 0.09, pal.steel, 0, 0.2, 0.62, 12); hub.rotation.z = Math.PI / 2; wb.add(hub);
  for (const s of [-1, 1]) {
    wb.add(rod(new THREE.Vector3(s * 0.28, 0.33, -0.4), new THREE.Vector3(s * 0.3, 0.55, -1.15), 0.02, pal.steel, 10)); // 손잡이
    wb.add(box(0.05, 0.33, 0.05, pal.steel, s * 0.25, 0.17, -0.35));                                                   // 다리
  }
  g.add(wb);
  // 팔레트 + 시멘트 포대 5개
  const px = 6.9, pz = -3.5;
  for (const dz of [-0.45, 0, 0.45]) g.add(box(1.0, 0.1, 0.1, pal.wood, px, 0.05, pz + dz));
  for (const dx of [-0.4, -0.13, 0.13, 0.4]) g.add(box(0.14, 0.03, 1.1, pal.wood, px + dx, 0.115, pz));
  const bag = (x, y, z, ry = 0) => { g.add(box(0.44, 0.14, 0.7, pal.white, x, y, z, ry)); g.add(box(0.45, 0.05, 0.3, pal.royal, x, y, z, ry)); };
  bag(px - 0.24, 0.2, pz); bag(px + 0.24, 0.2, pz); bag(px - 0.24, 0.34, pz, 0.05); bag(px + 0.24, 0.34, pz, -0.05); bag(px, 0.48, pz, 0.1);
  // 모래 더미(납작한 반구)
  const sand = dome(0.8, pal.sand, 9.3, 0, -3.65, 28); sand.scale.y = 0.55; g.add(sand); // 측량 로드와 화면상 겹쳐 보이지 않게 뒤로
  // Royal 배럴 2개(문 옆)
  for (const bz of [2.9, 3.55]) {
    g.add(cyl(0.29, 0.29, 0.88, pal.royal, 6.55, 0.44, bz, 28));
    for (const ry of [0.3, 0.6]) g.add(cyl(0.3, 0.3, 0.03, pal.steel, 6.55, ry, bz, 28));
    g.add(cyl(0.29, 0.29, 0.02, pal.steel, 6.55, 0.89, bz, 28));
  }
  return g;
}
