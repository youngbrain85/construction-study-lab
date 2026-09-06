// tools/decor.test.mjs — site/labs/room/decor.js 배치 규칙 테스트 (node --test; 스펙 §12)
import { test } from 'node:test';
import assert from 'node:assert/strict';
const THREE = await import('../site/shared/vendor/three.module.js');
const L = await import('../site/labs/room/layout.js');
const D = await import('../site/labs/room/decor.js');

// 그룹 안의 보이는 메쉬마다 월드 바운딩박스
function meshBoxes(group) {
  group.updateMatrixWorld(true);
  const out = [];
  group.traverse((o) => { if (o.isMesh && o.visible) out.push({ name: o.name || o.parent?.name || 'mesh', box: new THREE.Box3().setFromObject(o) }); });
  return out;
}
const footprints = L.STATIONS.map(s => ({ key: s.key, x0: s.center.x - s.size.w / 2, x1: s.center.x + s.size.w / 2, z0: s.center.z - s.size.d / 2, z1: s.center.z + s.size.d / 2 }));
const hitsFootprint = (b) => footprints.find(f => b.min.x < f.x1 && b.max.x > f.x0 && b.min.z < f.z1 && b.max.z > f.z0);

test('bayDoor: 문 위치에 있고 개구부 하단 1.5 m 는 열려 있다', () => {
  const g = D.buildBayDoor(L.DOOR, L.ROOM);
  const boxes = meshBoxes(g);
  assert.ok(boxes.length >= 15 && boxes.length <= 40, `meshes ${boxes.length}`);
  for (const { box: b } of boxes) {
    assert.ok(b.min.x >= L.DOOR.x - 0.6 && b.max.x <= L.DOOR.x + 1.2, `x range ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)}`);
    assert.ok(b.min.z >= L.ROOM.zMin - 0.05 && b.max.z <= L.ROOM.zMax + 0.05, `z range ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)}`);
    const inOpening = b.min.z < L.DOOR.zMax - 0.3 && b.max.z > L.DOOR.zMin + 0.3 && b.min.x < L.DOOR.x + 0.3 && b.max.x > L.DOOR.x - 0.3;
    if (inOpening) assert.ok(b.max.y <= 0.05 || b.min.y >= 1.5, `opening blocked at y ${b.min.y.toFixed(2)}..${b.max.y.toFixed(2)}`);
  }
  const g2 = D.buildBayDoor(L.DOOR, L.ROOM);
  assert.ok(new THREE.Box3().setFromObject(g2).max.y >= L.DOOR.h + 0.4, 'housing above the door height');
});

test('wallDecor: 방 안·벽 높이 이하, 발자국과 겹치면 y ≥ 1.6, 통로의 바닥 비품은 뒷벽에만', () => {
  const g = D.buildWallDecor(L.ROOM);
  const boxes = meshBoxes(g);
  assert.ok(boxes.length >= 60 && boxes.length <= 130, `meshes ${boxes.length}`);
  for (const { name, box: b } of boxes) {
    assert.ok(b.min.x >= L.ROOM.xMin - 0.05 && b.max.x <= L.ROOM.xMax && b.min.z >= L.ROOM.zMin - 0.05 && b.max.z <= L.ROOM.zMax, `${name} outside room ${JSON.stringify(b.min)}..${JSON.stringify(b.max)}`);
    assert.ok(b.max.y <= L.ROOM.wallH && b.min.y >= -0.01, `${name} height ${b.min.y.toFixed(2)}..${b.max.y.toFixed(2)}`);
    const f = hitsFootprint(b);
    if (f) assert.ok(b.min.y >= 1.6, `${name} intrudes station ${f.key} below 1.6 m (y ${b.min.y.toFixed(2)})`);
    const inAisle = b.max.x > L.AISLE.xMin && b.min.x < L.AISLE.xMax;
    if (inAisle && b.max.y > 0.02) assert.ok(b.max.z <= -3.9 || b.min.y >= 1.6, `${name} stands in the aisle (z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)})`);
  }
});

test('yardExtras: 마당 안, 측량 발자국 밖', () => {
  const g = D.buildYardExtras(L.YARD);
  const boxes = meshBoxes(g);
  assert.ok(boxes.length >= 20 && boxes.length <= 60, `meshes ${boxes.length}`);
  const survey = footprints.find(f => f.key === 'survey');
  for (const { name, box: b } of boxes) {
    assert.ok(b.min.x >= L.YARD.xMin - 0.05 && b.max.x <= L.YARD.xMax && b.min.z >= L.YARD.zMin && b.max.z <= L.YARD.zMax, `${name} outside yard ${JSON.stringify(b.min)}..${JSON.stringify(b.max)}`);
    assert.ok(b.min.y >= -0.01 && b.max.y <= 2.0, `${name} height`);
    assert.ok(!(b.min.x < survey.x1 && b.max.x > survey.x0 && b.min.z < survey.z1 && b.max.z > survey.z0), `${name} inside the survey footprint`);
  }
});

test('decorPalette 는 호출마다 새 재질 인스턴스', () => {
  const a = D.decorPalette(), b = D.decorPalette();
  assert.notEqual(a.royal, b.royal);
  assert.ok(a.yellow.color.getHex() === 0xf2c200 || Math.abs(a.yellow.color.r - 0.9) < 0.15, 'yellow safety colour');
});
