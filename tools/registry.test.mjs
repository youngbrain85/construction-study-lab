// tools/registry.test.mjs — site/shared/registry.js 계약 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../site/shared/registry.js');

test('그룹 2개 + 랩의 group이 전부 유효', () => {
  assert.deepEqual(S.LAB_GROUPS.map(g => g.id), ['material', 'survey']);
  assert.deepEqual(S.STUDY_GROUPS.map(g => g.id), ['materials', 'surveying']);
  const ids = new Set(S.LAB_GROUPS.map(g => g.id));
  for (const lab of S.LABS) assert.ok(ids.has(lab.group), `${lab.id} group`);
  for (const g of [...S.LAB_GROUPS, ...S.STUDY_GROUPS]) { assert.ok(g.name); assert.ok(g.blurb); }
});

test('Mix Design Lab 항목', () => {
  const mix = S.LABS.find(l => l.id === 'mix-design');
  assert.equal(mix.group, 'material');
  assert.equal(mix.href, 'mix-design/');
  assert.equal(mix.bestKey, 'mixlab-best');
  assert.equal(mix.active, true);
  assert.match(mix.meta, /ACI PRC-211\.1-22/);
});

test('scoreToGrade 경계값', () => {
  assert.equal(S.scoreToGrade(90), 'A'); assert.equal(S.scoreToGrade(89.9), 'B');
  assert.equal(S.scoreToGrade(80), 'B'); assert.equal(S.scoreToGrade(70), 'C');
  assert.equal(S.scoreToGrade(60), 'D'); assert.equal(S.scoreToGrade(59), 'F');
});

test('bestGrade: localStorage 없으면 null, 있으면 최고 점수 등급', () => {
  assert.equal(S.bestGrade('mixlab-best'), null);
  globalThis.localStorage = { getItem: k => (k === 'mixlab-best' ? JSON.stringify({ slab: 72, wall: 91 }) : null) };
  assert.equal(S.bestGrade('mixlab-best'), 'A');
  globalThis.localStorage = { getItem: () => '{}' };
  assert.equal(S.bestGrade('mixlab-best'), null);
  delete globalThis.localStorage;
});
