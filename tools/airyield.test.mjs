// tools/airyield.test.mjs — 공기량·단위중량 글(site/study/air-yield/index.html)의 표 수치 검사 (node --test)
// HTML 파서 없이 정규식으로 표를 읽어, 배치 티켓 입력에서 T·Y·Ry·A·N 을 다시 계산해 표시값과 대조한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const E = require('../site/labs/mix-design/engine.js');
const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../site/study/air-yield/index.html'), 'utf8');

function table(id) {
  const m = HTML.match(new RegExp(`<table([^>]*id="${id}"[^>]*)>([\\s\\S]*?)</table>`));
  assert.ok(m, `table #${id} missing`);
  return { attrs: m[1], body: m[2] };
}
function bodyRows(tbl) {
  const tb = tbl.body.match(/<tbody>([\s\S]*?)<\/tbody>/);
  assert.ok(tb, 'tbody missing');
  return [...tb[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m =>
    [...m[1].matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/g)].map(c => ({ attrs: c[1], text: c[2].replace(/<[^>]+>/g, '').trim() })));
}
const attr = (s, name) => { const m = s.match(new RegExp(`${name}="([^"]*)"`)); return m ? m[1] : null; };

test('Table 1: 용기 용량의 ft³ ↔ m³ 환산이 맞는다', () => {
  const rows = bodyRows(table('tbl-measures'));
  assert.deepEqual(rows.map(r => r[0].text), ['1 in. (25 mm)', '2 in. (50 mm)', '3 in. (76 mm)']);
  for (const r of rows) {
    const ft3 = Number(attr(r[1].attrs, 'data-ft3')), m3 = Number(attr(r[2].attrs, 'data-m3'));
    assert.equal(Number(r[1].text), ft3, 'ft³ text vs attribute');
    assert.equal(Number(r[2].text), m3, 'm³ text vs attribute');
    assert.equal(Math.round(ft3 * 0.0283168 * 1e4) / 1e4, m3, `${ft3} ft³ → ${m3} m³`);
  }
});

test('Table 2: 배치 티켓에서 수율·상대수율·중량법 공기량·시멘트함량을 재계산한 값과 표시값이 같다', () => {
  const t = table('tbl-example');
  const W = Number(attr(t.attrs, 'data-materials')), Yd = Number(attr(t.attrs, 'data-ordered'));
  const Nt = Number(attr(t.attrs, 'data-cement')), designAir = Number(attr(t.attrs, 'data-design-air'));
  const T = W / (Yd * 27 * (1 - designAir / 100));
  assert.equal(Math.round(T * 10) / 10, 150.7, 'theoretical density');
  const rows = bodyRows(t);
  assert.deepEqual(rows.map(r => r[0].text), ['Measured density, lb/cu ft', 'Yield, cu yd', 'Relative yield',
    'Air content (gravimetric), %', 'Cement content, lb/cu yd']);
  for (const col of [1, 2]) {
    const D = Number(attr(rows[0][col].attrs, 'data-density'));
    assert.equal(Number(rows[0][col].text), D, 'density text vs attribute');
    const Y = W / D / 27;
    const shown = [1, 2, 3, 4].map(i => Number(attr(rows[i][col].attrs, 'data-result')));
    assert.deepEqual(shown, [Math.round(Y * 100) / 100, Math.round((Y / Yd) * 100) / 100,
      Math.round(((T - D) / T) * 1000) / 10, Math.round(Nt / Y)], `column ${col}`);
    for (const i of [1, 2, 3, 4]) assert.equal(Number(rows[i][col].text), shown[i - 1], `row ${i} col ${col} text`);
  }
  assert.deepEqual([1, 2].map(c => Number(attr(rows[3][c].attrs, 'data-result'))), [1.5, 3.8]);
  assert.deepEqual([1, 2].map(c => Number(attr(rows[1][c].attrs, 'data-result'))), [8.00, 8.19]);
});

test('예제의 배치 질량이 사이트 앵커 배합·엔진의 무공기 부피와 맞는다', () => {
  const t = table('tbl-example');
  const W = Number(attr(t.attrs, 'data-materials')), Yd = Number(attr(t.attrs, 'data-ordered'));
  const anchor = { water: 299, cement: 544, ca: 1872, fa: 1292, airPct: 1.5 };
  const perYd3 = anchor.water + anchor.cement + anchor.ca + anchor.fa;
  assert.equal(perYd3, 4007, 'anchor mix mass per cu yd');
  assert.equal(W, Yd * perYd3, 'batch mass = ordered × mass per cu yd');
  // 엔진의 수율 계산에서 공기를 뺀 부피가 본문의 26.60 cu ft 와 같아야 한다
  const airFree = E.computeYield({ ...anchor, fa: anchor.fa }) - 27 * (anchor.airPct / 100);
  assert.ok(Math.abs(airFree - 26.60) < 0.02, `air-free volume ${airFree}`);
  assert.ok(HTML.includes('26.60 cu ft'), 'the page states the air-free volume');
  assert.equal(Number(attr(t.attrs, 'data-cement')), Yd * anchor.cement, 'cement on the ticket');
});
