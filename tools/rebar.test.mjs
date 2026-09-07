// tools/rebar.test.mjs — 철근 인장시험 글(site/study/rebar-tension/index.html)의 표 수치 검사 (node --test)
// HTML 파서 없이 정규식으로 <table id> 의 <tbody> 행을 읽는다. 표의 숫자가 A615 Table 1 의 기하·조사 노트의 요구값과 맞는지 대조한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../site/study/rebar-tension/index.html'), 'utf8');

function table(id) {
  const m = HTML.match(new RegExp(`<table([^>]*id="${id}"[^>]*)>([\\s\\S]*?)</table>`));
  assert.ok(m, `table #${id} missing`);
  return { attrs: m[1], body: m[2] };
}
// <tbody> 의 각 행을 셀 배열 [{ attrs, text }] 로 (태그 제거·공백 정리)
function bodyRows(tbl) {
  const tb = tbl.body.match(/<tbody>([\s\S]*?)<\/tbody>/);
  assert.ok(tb, 'tbody missing');
  return [...tb[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m =>
    [...m[1].matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/g)].map(c => ({ attrs: c[1], text: c[2].replace(/<[^>]+>/g, '').trim() })));
}
const num = s => (s === '—' ? null : parseFloat(s.replace(/,/g, '')));
const attr = (s, name) => { const m = s.match(new RegExp(`${name}="([^"]*)"`)); return m ? m[1] : null; };

test('Table 1: 크기 번호·미터법 이름·지름·단면·단위중량이 A615 Table 1 의 기하와 맞는다', () => {
  const rows = bodyRows(table('tbl-sizes'));
  assert.deepEqual(rows.map(r => r[0].text), ['#3', '#4', '#5', '#6', '#7', '#8', '#9', '#10', '#11', '#14', '#18']);
  assert.deepEqual(rows.map(r => r[1].text), ['#10', '#13', '#16', '#19', '#22', '#25', '#29', '#32', '#36', '#43', '#57']);
  const square = { 9: 1, 10: 1.125, 11: 1.25, 14: 1.5, 18: 2 };   // #9–#18 은 옛 정사각형 바(변 in)와 같은 단면의 원형 바
  for (const r of rows) {
    const n = Number(r[0].text.slice(1)), d = num(r[2].text), a = num(r[3].text), w = num(r[4].text);
    const exact = Math.PI * d * d / 4;
    assert.equal(a, Math.round(exact * 100) / 100, `#${n}: area ${a} vs π d²/4 = ${exact.toFixed(4)}`);
    assert.ok(Math.abs(w - 3.4028 * exact) / w <= 0.003, `#${n}: weight ${w} vs 3.4028 × area = ${(3.4028 * exact).toFixed(3)}`);   // 490 lb/ft³ ÷ 144 = 3.4028 lb/ft per in²
    if (n <= 8) assert.equal(d, n / 8, `#${n}: diameter is n/8 in.`);
    else assert.equal(a, Math.round(square[n] ** 2 * 100) / 100, `#${n}: area of the ${square[n]} in. square bar`);
    assert.equal(Math.round(d * 25.4), Number(r[1].text.slice(1)), `#${n}: metric name = diameter in mm`);
  }
});

test('Table 3: A615 등급별 최소 항복·인장·8 in 신장률', () => {
  const rows = bodyRows(table('tbl-a615'));
  const expected = { 'Grade 40': [40, 60, 11, 12, null, null, null], 'Grade 60': [60, 90, 9, 9, 8, 7, 7], 'Grade 75': [75, 100, 7, 7, 7, 6, 6], 'Grade 80': [80, 105, 7, 7, 7, 6, 6] };
  assert.deepEqual(rows.map(r => r[0].text), Object.keys(expected));
  for (const r of rows) {
    const v = r.slice(1).map(c => num(c.text));
    assert.deepEqual(v, expected[r[0].text], r[0].text);
    assert.equal(v[0], Number(r[0].text.slice(6)), 'grade number = minimum yield');
    assert.ok(v[1] > v[0], 'tensile above yield');
  }
});

test('Table 4: 굽힘 핀 지름 배수(3½·5·7·9 d)', () => {
  const rows = bodyRows(table('tbl-bend'));
  const expected = { '#3, #4, #5': [3.5, 3.5, 5, 5], '#6': [5, 5, 5, 5], '#7, #8': [null, 5, 5, 5], '#9, #10, #11': [null, 7, 7, 7], '#14, #18 (90° bend)': [null, 9, 9, 9] };
  assert.deepEqual(rows.map(r => r[0].text), Object.keys(expected));
  for (const r of rows) {
    const v = r.slice(1).map(c => (c.text === '—' ? null : Number(attr(c.attrs, 'data-mult'))));
    assert.deepEqual(v, expected[r[0].text], r[0].text);
    for (const c of r.slice(1)) if (c.text !== '—') {
      assert.match(c.text, /^(3½|5|7|9) d$/, `pin text ${c.text}`);
      assert.equal(c.text === '3½ d' ? 3.5 : Number(c.text.split(' ')[0]), Number(attr(c.attrs, 'data-mult')), `pin text vs data-mult: ${c.text}`);   // 글자와 속성이 같은 배수를 말해야 한다
    }
  }
});

test('Table 2: 예제의 표시값이 data-* 입력에서 재계산한 값과 같다(속성값과 본문 글자 모두)', () => {
  const t = table('tbl-example');
  const a = Number(attr(t.attrs, 'data-area')), d = Number(attr(t.attrs, 'data-diameter'));
  const py = Number(attr(t.attrs, 'data-yield-load')), pm = Number(attr(t.attrs, 'data-max-load'));
  const g = Number(attr(t.attrs, 'data-gauge')), f = Number(attr(t.attrs, 'data-final')), mult = Number(attr(t.attrs, 'data-pin-mult'));
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
  const rows = bodyRows(t);
  const shown = rows.map(r => Number(attr(r[2].attrs, 'data-result')));
  assert.deepEqual(shown, [r1(py / a / 1000), r1(pm / a / 1000), r1((f - g) / g * 100), r2(mult * d)]);
  assert.deepEqual(shown, [68.1, 100, 13, 2.19]);
  // 독자가 읽는 글자도 같은 값을 말해야 한다(속성만 맞고 본문이 오타인 경우를 잡는다)
  const grab = (s, re) => { const m = s.match(re); assert.ok(m, `no number in "${s}"`); return Number(m[1]); };
  assert.equal(grab(rows[0][2].text, /→\s*([\d.]+)\s*ksi/), shown[0]);
  assert.equal(grab(rows[1][2].text, /→\s*([\d.]+)\s*ksi/), shown[1]);
  assert.equal(grab(rows[2][2].text, /=\s*([\d.]+)\s*%/), shown[2]);
  assert.equal(grab(rows[3][1].text, /([\d.]+) in\. pin/), shown[3]);
  assert.ok(rows[0][1].text.includes(py.toLocaleString('en-US')) && rows[1][1].text.includes(pm.toLocaleString('en-US')) && rows[2][1].text.includes(String(f)), 'measured cells quote the inputs');
  assert.equal(Math.round(Math.PI * d * d / 4 * 100) / 100, a, 'nominal area of the #5 bar');
  assert.ok(shown[0] >= 60 && shown[1] >= 90 && shown[2] >= 9, 'meets the Grade 60 minimums for a #5 bar');
});
