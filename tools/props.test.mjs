// tools/props.test.mjs — site/labs/room/props.js 스모크 테스트 (node --test; three.js 는 node 에서도 지오메트리 생성 가능)
import { test } from 'node:test';
import assert from 'node:assert/strict';
const THREE = await import('../site/shared/vendor/three.module.js');
const L = await import('../site/labs/room/layout.js');
const P = await import('../site/labs/room/props.js');
// scene3d.js 는 import 시 window.Scene3D 를 세팅한다 — node 에서는 최소 스텁만 있으면 무해하다
globalThis.window = globalThis.window || {};
globalThis.window.devicePixelRatio = 1;
const S3 = await import('../site/labs/mix-design/scene3d.js');

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

// Mix 스테이션은 Mix Design Lab 장면 3종을 축소해 재활용한다 — 축척이 틀어지면 발자국·라벨을 뚫고 나온다.
// 슬럼프 장면은 숨긴 역콘·치수선 메쉬를 품고 있어 보이는 메쉬만 세야 한다(Box3.setFromObject 는 숨김도 센다).
test('Mix 스테이션: 재활용 소품 3종이 축척 후 발자국·라벨 높이 안', () => {
  const visibleBox = (root) => {
    const box = new THREE.Box3().makeEmpty();
    const walk = (o) => { if (!o.visible) return; if (o.isMesh) box.expandByObject(o); for (const c of o.children) walk(c); };
    walk(root);
    return box;
  };
  const rng = L.mulberry32(11);                                    // lab-room.js build() 와 같은 시드·순서
  const g = new THREE.Group();
  const mixer = S3.buildMixerScene({ wc: 0.5, rng });
  mixer.group.position.set(0.4, 0, -0.6); mixer.group.rotation.y = 0.4; mixer.group.scale.setScalar(0.68);
  const slump = S3.buildSlumpScene({ mode: 'true', slump: 3, measuredSlump: 3, rng });
  slump.update('lift', 0, 0);
  slump.group.position.x = -0.5; slump.group.position.z = 0.9; slump.group.scale.setScalar(0.33);
  const utm = S3.buildUtmScene({ failMode: 'cone', rng });
  utm.update(0, 0, 0, true);
  utm.group.position.set(-1.2, 0, -0.9);
  g.add(mixer.group, slump.group, utm.group);
  g.updateMatrixWorld(true);

  const b = visibleBox(g), f = (n) => n.toFixed(3);
  assert.ok(b.min.x >= -1.85 && b.max.x <= 1.85, `mix footprint x[${f(b.min.x)},${f(b.max.x)}] vs ±1.85`);
  assert.ok(b.min.z >= -1.55 && b.max.z <= 1.55, `mix footprint z[${f(b.min.z)},${f(b.max.z)}] vs ±1.55`);
  assert.ok(b.max.y <= 2.15, `mix height ${f(b.max.y)} vs labelY 2.3 − 0.15`);   // 라벨(labelY 2.3) 아래
  assert.ok(b.min.y >= -0.02, `mix below floor ${f(b.min.y)}`);
  const sb = visibleBox(slump.group);
  assert.ok(sb.max.y - sb.min.y <= 0.45, `slump cone height ${f(sb.max.y - sb.min.y)} vs 0.45 m`); // 실물 슬럼프 콘 ≈ 0.30 m
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
