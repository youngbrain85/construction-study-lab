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
  const airFree = E.computeYield(anchor) - 27 * (anchor.airPct / 100);
  assert.ok(Math.abs(airFree - 26.60) < 0.02, `air-free volume ${airFree}`);
  assert.ok(HTML.includes('26.60 cu ft'), 'the page states the air-free volume');
  assert.equal(Number(attr(t.attrs, 'data-cement')), Yd * anchor.cement, 'cement on the ticket');
});

test('산문·수식에만 있는 숫자도 표의 입력에서 나온 값과 같다', () => {
  const t = table('tbl-example');
  const W = Number(attr(t.attrs, 'data-materials')), Yd = Number(attr(t.attrs, 'data-ordered'));
  const Nt = Number(attr(t.attrs, 'data-cement')), designAir = Number(attr(t.attrs, 'data-design-air'));
  const T = W / (Yd * 27 * (1 - designAir / 100));
  const rows = bodyRows(t);
  const dA = Number(attr(rows[0][1].attrs, 'data-density')), dB = Number(attr(rows[0][2].attrs, 'data-density'));
  const Y = W / dB / 27;
  const shown = [
    W.toLocaleString('en-US'),                                   // 배치 재료 합계 32,056 lb
    Nt.toLocaleString('en-US'),                                  // 결합재 4,352 lb
    (Math.round(T * 10) / 10).toFixed(1),                        // 이론밀도 150.7
    (Math.round(Y * 100) / 100).toFixed(2),                      // Load B 수율 8.19
    String(Math.round(Nt / Y)),                                  // 반올림 전 수율로 계산한 532
    String(Math.round(Nt / (Math.round(Y * 100) / 100))),        // 반올림된 8.19 로 나눈 531
  ];
  const PROSE = HTML.replace(/<table[\s\S]*?<\/table>/g, '');   // 표 밖(산문·수식)에만 있는지 본다
  for (const s of shown) assert.ok(PROSE.includes(s), `prose is missing ${s}`);
  // 두 밀도의 차이를 본문이 직접 말한다 — 표와 어긋나면 실패한다
  const diff = (Math.round((dA - dB) * 10) / 10).toFixed(1);
  assert.ok(PROSE.includes(`${diff} lb per cubic foot lighter`), `prose density difference: expected "${diff} lb per cubic foot lighter"`);
});

test('Figure 3: 막대 폭이 표의 입력에서 나온 부피와 축척 16 px/cu ft 로 맞는다', () => {
  const t = table('tbl-example');
  const W = Number(attr(t.attrs, 'data-materials')), Yd = Number(attr(t.attrs, 'data-ordered'));
  const designAir = Number(attr(t.attrs, 'data-design-air'));
  const rows = bodyRows(t);
  const dA = Number(attr(rows[0][1].attrs, 'data-density')), dB = Number(attr(rows[0][2].attrs, 'data-density'));
  const perYd3 = W / Yd, materials = 27 * (1 - designAir / 100), SCALE = 16;
  const svg = HTML.match(/<svg[^>]*aria-labelledby="fig3-title"[\s\S]*?<\/svg>/);
  assert.ok(svg, 'figure 3 svg missing');
  const rects = [...svg[0].matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/g)]
    .map(m => ({ y: Number(m[2]), w: Number(m[3]) }));
  const barA = rects.filter(r => r.y === 62), barB = rects.filter(r => r.y === 140);
  assert.equal(barA.length, 5, 'bar A: four material segments and the air sliver');
  assert.equal(barB.length, 2, 'bar B: one material block and the air sliver');
  const sum = a => a.reduce((s, r) => s + r.w, 0);
  const near = (px, ft3, msg) => assert.ok(Math.abs(px / SCALE - ft3) < 0.02, `${msg}: ${px / SCALE} vs ${ft3}`);
  near(sum(barA), perYd3 / dA, 'bar A total');                                  // 27.00 cu ft
  near(sum(barB), perYd3 / dB, 'bar B total');                                  // 27.63 cu ft
  near(sum(barA) - barA[4].w, materials, 'bar A materials');                    // 공기를 뺀 26.60 cu ft
  near(sum(barB) - barB[1].w, materials, 'bar B materials');                    // 두 막대의 재료 블록은 같다
  assert.ok(barB[1].w > barA[4].w, 'the air sliver is wider in the lighter load');
});
