// tools/props.test.mjs — site/labs/room/props.js 스모크 테스트 (node --test; three.js 는 node 에서도 지오메트리 생성 가능)
import { test } from 'node:test';
import assert from 'node:assert/strict';
const THREE = await import('../site/shared/vendor/three.module.js');
const L = await import('../site/labs/room/layout.js');
const P = await import('../site/labs/room/props.js');

const BUILDERS = { soil: P.buildSoilBench, steel: P.buildTensileFrame, wood: P.buildFramingStation, survey: P.buildSurveyStation };

test('소품 4종: 발자국·높이 안, 바닥 아래로 안 내려감, 메쉬 ≤ 60', () => {
  for (const st of L.STATIONS) {
    if (!BUILDERS[st.key]) continue;
    const g = BUILDERS[st.key](P.makePalette());
    g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(g);
    let meshes = 0; g.traverse(o => { if (o.isMesh) meshes++; });
    assert.ok(meshes >= 8 && meshes <= 60, `${st.key} meshes ${meshes}`);
    const hw = st.size.w / 2 + 0.05, hd = st.size.d / 2 + 0.05;
    assert.ok(b.min.x >= -hw && b.max.x <= hw && b.min.z >= -hd && b.max.z <= hd,
      `${st.key} footprint x[${b.min.x.toFixed(2)},${b.max.x.toFixed(2)}] z[${b.min.z.toFixed(2)},${b.max.z.toFixed(2)}] vs ±${hw}/±${hd}`);
    assert.ok(b.max.y <= st.labelY - 0.15, `${st.key} height ${b.max.y.toFixed(2)} vs labelY ${st.labelY}`);
    assert.ok(b.min.y >= -0.01, `${st.key} below floor ${b.min.y}`);
  }
});

test('makePalette({muted}) 는 회색조·저금속·고거칠기', () => {
  const p = P.makePalette({ muted: true });
  for (const m of Object.values(p)) { assert.ok(m.metalness <= 0.1); assert.ok(m.roughness >= 0.9); }
  const c = p.orange.color;
  assert.ok(Math.abs(c.r - c.g) < 0.25 && Math.abs(c.g - c.b) < 0.25, `orange not greyed: ${c.r.toFixed(2)},${c.g.toFixed(2)},${c.b.toFixed(2)}`);
  const full = P.makePalette();
  assert.notEqual(full.steel, p.steel, 'palettes are separate instances');
});

test('방 껍데기·링·히트박스', () => {
  const shell = P.buildRoomShell(L.ROOM, L.YARD, L.DOOR);
  assert.ok(shell.children.length >= 8, `shell parts ${shell.children.length}`);
  const b = new THREE.Box3().setFromObject(shell);
  assert.ok(b.min.x <= L.ROOM.xMin && b.max.x >= L.YARD.xMax && b.max.y >= L.ROOM.wallH, 'shell spans room+yard and wall height');
  const ring = P.buildFloorRing({ w: 3, d: 2 });
  assert.ok(ring.isMesh && ring.material.transparent && ring.material.opacity === 0.55);
  const hit = P.buildHitBox({ w: 3, d: 2 }, 2.4, 'mix');
  assert.equal(hit.userData.station, 'mix');
  assert.equal(hit.material.colorWrite, false); assert.equal(hit.material.depthWrite, false);
  assert.ok(Math.abs(hit.position.y - 1.2) < 1e-9);
});
