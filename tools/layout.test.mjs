// tools/layout.test.mjs — site/labs/room/layout.js 계약 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../site/shared/registry.js');
const L = await import('../site/labs/room/layout.js');

test('STATIONS 키 = registry.STATION_KEYS (순서 포함)', () => {
  assert.deepEqual(L.STATIONS.map(s => s.key), S.STATION_KEYS);
});

test('발자국은 방(survey는 마당) 안, 통로 밖, 서로 겹치지 않는다', () => {
  const rect = s => ({ x0: s.center.x - s.size.w / 2, x1: s.center.x + s.size.w / 2, z0: s.center.z - s.size.d / 2, z1: s.center.z + s.size.d / 2 });
  for (const s of L.STATIONS) {
    const r = rect(s), area = s.key === 'survey' ? L.YARD : L.ROOM;
    assert.ok(r.x0 >= area.xMin && r.x1 <= area.xMax && r.z0 >= area.zMin && r.z1 <= area.zMax, `${s.key} inside`);
    if (s.key !== 'survey') assert.ok(r.x1 <= L.AISLE.xMin || r.x0 >= L.AISLE.xMax, `${s.key} clear of aisle`);
  }
  for (let i = 0; i < L.STATIONS.length; i++) for (let j = i + 1; j < L.STATIONS.length; j++) {
    const a = rect(L.STATIONS[i]), b = rect(L.STATIONS[j]);
    assert.ok(a.x1 <= b.x0 || b.x1 <= a.x0 || a.z1 <= b.z0 || b.z1 <= a.z0, `${L.STATIONS[i].key} vs ${L.STATIONS[j].key}`);
  }
});

test('fitCamera: 모든 aspect 에서 BOUNDS 꼭짓점 8개가 NDC [-1,1] 안', () => {
  for (const aspect of [0.46, 0.6, 0.9, 1.0, 1.3, 1.6, 2.2]) {
    const fit = L.fitCamera(aspect);
    for (const c of L.boundsCorners()) {
      const p = L.projectPoint(fit, aspect, c);
      assert.ok(p.depth > 0 && Math.abs(p.nx) <= 1 && Math.abs(p.ny) <= 1,
        `aspect ${aspect} corner ${JSON.stringify(c)} → ${p.nx.toFixed(3)}, ${p.ny.toFixed(3)}`);
    }
  }
});

test('거리 단조성: 같은 방위 안에서 aspect 가 커질수록 가까워진다', () => {
  for (const group of [[1.0, 1.3, 1.6, 2.2], [0.46, 0.6, 0.9]]) {
    const d = group.map(a => L.fitCamera(a).distance);
    for (let i = 1; i < d.length; i++) assert.ok(d[i] <= d[i - 1] + 1e-9, `group ${group} at ${group[i]}: ${d[i]} > ${d[i - 1]}`);
  }
});

test('deoverlapLabels: 세로 화면 3종에서 라벨 5개가 겹치지 않고 이동 ≤ 120px', () => {
  for (const [w, h] of [[390, 844], [390, 743], [390, 564]]) {
    const aspect = w / h, fit = L.fitCamera(aspect);
    const boxes = L.STATIONS.map(s => {
      const p = L.projectPoint(fit, aspect, { x: s.center.x, y: s.labelY, z: s.center.z }, w, h);
      return { key: s.key, x: p.x - 70, y: p.y - 56, w: 140, h: 56 };
    });
    L.deoverlapLabels(boxes);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const hit = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      assert.ok(!hit, `${w}x${h}: ${a.key} overlaps ${b.key}`);
    }
    for (const b of boxes) assert.ok(b.lead <= 120, `${w}x${h}: ${b.key} moved ${b.lead}px`);
  }
});

test('deoverlapLabels: 겹치면 먼 쪽(y 작은 쪽)이 8px 간격으로 위로 밀린다', () => {
  const boxes = [{ key: 'near', x: 0, y: 100, w: 100, h: 40 }, { key: 'far', x: 20, y: 80, w: 100, h: 40 }];
  L.deoverlapLabels(boxes);
  const near = boxes.find(b => b.key === 'near'), far = boxes.find(b => b.key === 'far');
  assert.equal(near.y, 100); assert.equal(near.lead, 0);
  assert.equal(far.y, 100 - 40 - 8); assert.equal(far.lead, 28);
});

test('mulberry32: 결정적, [0,1)', () => {
  const a = L.mulberry32(11), b = L.mulberry32(11);
  const xs = Array.from({ length: 5 }, () => a());
  assert.deepEqual(xs, Array.from({ length: 5 }, () => b()));
  for (const x of xs) assert.ok(x >= 0 && x < 1);
});
