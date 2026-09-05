// tools/study-tables.test.mjs — Part 1 글의 ACI 표 ↔ Mix Design Lab 엔진 표 대조 (node --test)
// 정규식으로 <tr data-…> / <td data-…> 를 읽는다(HTML 파서 의존성 없음).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const E = require('../site/labs/mix-design/engine.js');
const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../site/study/mix-design/index.html'), 'utf8');

function table(id) {
  const m = HTML.match(new RegExp(`<table[^>]*id="${id}"[^>]*>([\\s\\S]*?)</table>`));
  assert.ok(m, `table #${id} missing`);
  return m[1];
}
function rows(tbl) { return [...tbl.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/g)].map(m => ({ attrs: m[1], body: m[2] })); }
function attr(s, name) { const m = s.match(new RegExp(`${name}="([^"]*)"`)); return m ? m[1] : null; }
// <td data-KEY="k">숫자 … → { 'k(정규화)': 숫자 }
function cells(body, key) {
  return Object.fromEntries([...body.matchAll(new RegExp(`<td[^>]*${key}="([^"]*)"[^>]*>\\s*([\\d.]+)`, 'g'))]
    .map(m => [String(parseFloat(m[1])), parseFloat(m[2])]));
}
const k = v => String(parseFloat(v));

test('#tbl-water: 단위수량·갇힌 공기·목표 공기량 = 엔진 WATER_TABLE', () => {
  const W = E.DATA.WATER_TABLE;
  let checked = 0;
  for (const r of rows(table('tbl-water'))) {
    const series = attr(r.attrs, 'data-series'), slump = attr(r.attrs, 'data-slump'), row = attr(r.attrs, 'data-row');
    if (series && slump) {
      const i = W.slumps.indexOf(parseFloat(slump));
      assert.ok(i >= 0, `slump anchor ${slump}`);
      const c = cells(r.body, 'data-nmas');
      for (const nmas of E.DATA.NMAS_LIST) { assert.equal(c[k(nmas)], W[series][nmas][i], `${series} slump ${slump} nmas ${nmas}`); checked++; }
    } else if (row === 'entrapped') {
      const c = cells(r.body, 'data-nmas');
      for (const nmas of E.DATA.NMAS_LIST) { assert.equal(c[k(nmas)], W.entrappedAir[nmas], `entrapped nmas ${nmas}`); checked++; }
    } else if (row === 'air') {
      const idx = { mild: 0, moderate: 1, severe: 2 }[attr(r.attrs, 'data-exposure')];
      const c = cells(r.body, 'data-nmas');
      for (const nmas of E.DATA.NMAS_LIST) { assert.equal(c[k(nmas)], W.targetAir[nmas][idx], `air ${attr(r.attrs, 'data-exposure')} nmas ${nmas}`); checked++; }
    }
  }
  assert.equal(checked, 6 * 5 + 5 + 3 * 5); // 2계열×3슬럼프×5 + 갇힌공기 5 + 노출 3×5
});

test('#tbl-wcm: 28일 강도별 w/cm = 엔진 WC_TABLE', () => {
  const T = E.DATA.WC_TABLE;
  let checked = 0;
  for (const r of rows(table('tbl-wcm'))) {
    const fc = attr(r.attrs, 'data-fc');
    if (!fc) continue;
    const i = T.strengths.indexOf(parseInt(fc, 10));
    assert.ok(i >= 0, `strength ${fc}`);
    // data-series 값은 문자열 키라 cells() 대신 직접 읽는다
    const nonAE = r.body.match(/<td[^>]*data-series="nonAE"[^>]*>\s*([\d.]+)/), ae = r.body.match(/<td[^>]*data-series="ae"[^>]*>\s*([\d.]+)/);
    assert.ok(nonAE && ae, `cells ${fc}`);
    assert.equal(parseFloat(nonAE[1]), T.nonAE[i], `nonAE ${fc}`);
    assert.equal(parseFloat(ae[1]), T.ae[i], `ae ${fc}`);
    checked++;
  }
  assert.equal(checked, 5); // 2000–6000
});

test('#tbl-bb0: 굵은골재 용적비 = 엔진 CA_VOLUME_TABLE', () => {
  const T = E.DATA.CA_VOLUME_TABLE;
  let checked = 0;
  for (const r of rows(table('tbl-bb0'))) {
    const nmas = attr(r.attrs, 'data-nmas');
    if (!nmas || !E.DATA.NMAS_LIST.includes(parseFloat(nmas))) continue;
    const c = cells(r.body, 'data-fm');
    T.fm.forEach((fm, i) => { assert.equal(c[k(fm)], T[parseFloat(nmas)][i], `nmas ${nmas} fm ${fm}`); checked++; });
  }
  assert.equal(checked, 5 * 4);
});
