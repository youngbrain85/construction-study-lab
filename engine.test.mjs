// engine.test.mjs — MixEngine 단위테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('./engine.js');

test('DATA: ACI 표 기준점이 정확히 들어있다', () => {
  const D = E.DATA;
  assert.deepEqual(D.NMAS_LIST, [0.375, 0.5, 0.75, 1.0, 1.5]);
  // Table 6.3.3 — 3/4 in. 수량 (슬럼프 1-2 / 3-4 / 6-7 구간)
  assert.deepEqual(D.WATER_TABLE.nonAE[0.75], [315, 340, 360]);
  assert.deepEqual(D.WATER_TABLE.ae[0.75], [280, 305, 325]);
  assert.equal(D.WATER_TABLE.entrappedAir[0.75], 2.0);
  assert.deepEqual(D.WATER_TABLE.targetAir[0.75], [3.5, 5.0, 6.0]); // mild/moderate/severe
  // Table 6.3.4(a) — w/c vs f'c
  assert.deepEqual(D.WC_TABLE.strengths, [2000, 3000, 4000, 5000, 6000, 7000]);
  assert.deepEqual(D.WC_TABLE.nonAE, [0.82, 0.68, 0.57, 0.48, 0.41, 0.33]);
  assert.deepEqual(D.WC_TABLE.ae, [0.74, 0.59, 0.48, 0.40, 0.32, null]);
  // Table 6.3.6 — 3/4 in. 행 (FM 2.40/2.60/2.80/3.00)
  assert.deepEqual(D.CA_VOLUME_TABLE[0.75], [0.66, 0.64, 0.62, 0.60]);
  // Table 6.3.7.1 — 추정 단위중량
  assert.equal(D.FRESH_WEIGHT_TABLE.nonAE[0.75], 3960);
  assert.equal(D.FRESH_WEIGHT_TABLE.ae[0.75], 3840);
  // 재료 물성
  assert.equal(D.MAT.sgCement, 3.15);
  assert.equal(D.MAT.druwCA, 100);
  assert.equal(D.MAT.fmSand, 2.70);
});

test('MISSIONS: 미션 5종과 필드', () => {
  assert.equal(E.MISSIONS.length, 5);
  const bridge = E.MISSIONS.find(m => m.id === 'bridge');
  assert.equal(bridge.fc, 4500);
  assert.equal(bridge.exposure, 'severe');
  for (const m of E.MISSIONS) {
    assert.ok(m.slumpRange[0] < m.slumpRange[1]);
    assert.ok(m.nmasAllowed.every(n => E.DATA.NMAS_LIST.includes(n)));
  }
});
