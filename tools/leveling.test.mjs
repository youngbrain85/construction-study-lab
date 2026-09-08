// tools/leveling.test.mjs — 자동레벨 매뉴얼(site/study/leveling/index.html)의 야장·2-peg 수치 검사 (node --test)
// 표의 data-* 입력만으로 HI·표고·합계·검산·폐합·허용치·보정·시준축 오차를 다시 계산해 표시값과 대조한다.
// 표고는 0.001 ft 단위 정수(mils)로 다뤄 부동소수 반올림 함정을 피한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../site/study/leveling/index.html'), 'utf8');

function table(id) {
  const m = HTML.match(new RegExp(`<table([^>]*id="${id}"[^>]*)>([\\s\\S]*?)</table>`));
  assert.ok(m, `table #${id} missing`);
  return { attrs: m[1], body: m[2] };
}
function bodyRows(t) {
  const tb = t.body.match(/<tbody>([\s\S]*?)<\/tbody>/);
  assert.ok(tb, 'tbody missing');
  return [...tb[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m =>
    [...m[1].matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/g)]
      .map(c => ({ attrs: c[1], text: c[2].replace(/<[^>]+>/g, '').trim() })));
}
const attr = (s, n) => { const m = s.match(new RegExp(`${n}="([^"]*)"`)); return m ? m[1] : null; };
const mils = (x) => Math.round(Number(x) * 1000);   // ft → 0.001 ft 정수
// data-* 입력과 화면에 보이는 숫자가 어긋나면(한쪽만 고친 경우) 여기서 잡는다
const cell = (row, i, name) => {
  const v = attr(row[i].attrs, name);
  if (v === null) return null;
  const shown = row[i].text.split(/\s/)[0];   // "0.568 — true" 같은 셀은 앞의 숫자만 본다
  assert.equal(mils(shown), mils(v), `${name}: 표시값 ${shown} 이 입력값 ${v} 와 다르다`);
  return mils(v);
};

test('Table 2: 야장의 HI·표고가 BS·FS 에서만 다시 계산된다', () => {
  const t = table('tbl-fieldbook');
  let elev = mils(attr(t.attrs, 'data-start')), hi = null;
  for (const row of bodyRows(t).slice(0, 5)) {
    const bs = cell(row, 1, 'data-bs'), fs = cell(row, 3, 'data-fs');
    if (fs !== null) { assert.ok(hi !== null, 'FS before any BS'); elev = hi - fs; }
    assert.equal(cell(row, 4, 'data-elev'), elev, `elevation at ${row[0].text}`);
    if (bs !== null) { hi = elev + bs; assert.equal(cell(row, 2, 'data-hi'), hi, `HI at ${row[0].text}`); }
  }
});

test('Table 2: 합계·페이지 검산·폐합·허용치·보정', () => {
  const t = table('tbl-fieldbook');
  const start = mils(attr(t.attrs, 'data-start'));
  const loopFt = Number(attr(t.attrs, 'data-loop-ft')), coeff = Number(attr(t.attrs, 'data-allow-coeff'));
  const rows = bodyRows(t), data = rows.slice(0, 5), sums = rows[5];
  const col = (i, name) => data.map(r => cell(r, i, name)).filter(v => v !== null);
  const bs = col(1, 'data-bs'), fs = col(3, 'data-fs');
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  assert.equal(sum(bs), mils(sums[1].text), 'ΣBS');
  assert.equal(sum(fs), mils(sums[3].text), 'ΣFS');

  const last = cell(data[4], 4, 'data-elev');
  assert.equal(sum(bs) - sum(fs), last - start, 'ΣBS − ΣFS = 마지막 표고 − 처음 표고');

  const mis = last - start;                                    // −20 (= −0.02 ft)
  const allow = Math.round(coeff * Math.sqrt(loopFt / 5280) * 1000);   // 29 (= 0.029 ft)
  assert.equal(allow, 29, '3급 허용 폐합오차 0.029 ft');
  assert.ok(Math.abs(mis) < allow, '허용치 이내라 보정할 수 있다');
  assert.ok(HTML.includes('0.029 ft'), '본문이 허용치를 적고 있다');

  const per = Math.abs(mis) / bs.length;                       // 설치당 5 (= 0.005 ft)
  assert.equal(per, 5, '설치당 보정 0.005 ft');
  data.slice(1).forEach((row, i) => {
    const want = Math.round((cell(row, 4, 'data-elev') + per * (i + 1)) / 10) * 10;  // 0.01 ft 자리로 반올림
    assert.equal(cell(row, 5, 'data-adj'), want, `보정 표고 at ${row[0].text}`);
  });
  assert.equal(cell(data[4], 5, 'data-adj'), start, '마지막 보정 표고가 벤치마크로 닫힌다');
  assert.equal(cell(data[0], 5, 'data-adj'), start, '출발 벤치마크는 보정하지 않는다');
});

test('Table 3: 2-peg 시준축 오차와 B 의 옳은 읽음', () => {
  const t = table('tbl-peg');
  const a1 = mils(attr(t.attrs, 'data-a1')), b1 = mils(attr(t.attrs, 'data-b1'));
  const a2 = mils(attr(t.attrs, 'data-a2')), b2 = mils(attr(t.attrs, 'data-b2'));
  const lim3 = mils(attr(t.attrs, 'data-limit3')), lim2 = mils(attr(t.attrs, 'data-limit2'));
  const rows = bodyRows(t);
  assert.equal(cell(rows[0], 3, 'data-result'), a1 - b1, '참 고저차');
  assert.equal(cell(rows[1], 3, 'data-result'), a2 - b2, '겉보기 고저차');

  const err = (a2 - b2) - (a1 - b1);
  assert.equal(err, 4, '시준축 오차 0.004 ft / 200 ft');
  assert.ok(err <= lim3, '3급 합격');
  assert.ok(err > lim2, '2급 불합격');
  assert.ok(HTML.includes('0.004 ft in 200 ft'), '본문이 오차를 적고 있다');
  assert.ok(HTML.includes(`${((a2 - (a1 - b1)) / 1000).toFixed(3)} ft`), 'B 의 옳은 읽음이 적혀 있다');
});

test('Table 1: 규격값이 Caltrans 3급 표와 같다', () => {
  const rows = bodyRows(table('tbl-specs'));
  const got = Object.fromEntries(rows.map(r => [attr(r[1].attrs, 'data-spec'), r[1].text]));
  assert.deepEqual(got, {
    sight: '300 ft', balance: '33 ft', 'balance-cum': '33 ft', clearance: '1.6 ft',
    loop: '0.06 ft × √E', peg: 'daily · 0.007 ft in 200 ft',
  });
});
