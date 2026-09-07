// tools/contrast-check.test.mjs — theme.css 토큰 대비(WCAG AA) 게이트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../site/shared/theme.css'), 'utf8');
const root = css.match(/:root\s*\{([\s\S]*?)\}/)[1];
const tokens = Object.fromEntries([...root.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));

function lum(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) { const [x, y] = [lum(a), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
const T = name => { assert.ok(tokens[name], `token ${name} missing`); return tokens[name]; };
const AA = (fg, bg, label) => assert.ok(ratio(fg, bg) >= 4.5, `${label}: ${ratio(fg, bg).toFixed(2)} < 4.5`);

test('토큰 존재: ISU 팔레트', () => {
  for (const n of ['--dark', '--royal', '--vintage', '--neon', '--icy', '--font-head', '--font-mono']) T(n);
  assert.equal(T('--dark'), '#003665'); assert.equal(T('--royal'), '#0053a5');
  assert.equal(T('--radius'), '2px');
});

test('텍스트 × 밝은 배경 ≥ 4.5', () => {
  for (const fg of ['--text', '--muted', '--faint', '--primary', '--green', '--amber', '--red'])
    for (const bg of ['--bg', '--surface', '--surface2']) AA(T(fg), T(bg), `${fg} on ${bg}`);
});

test('배지 의미색 × 틴트 ≥ 4.5', () => {
  AA(T('--green'), T('--green-50'), 'green badge');
  AA(T('--amber'), T('--amber-50'), 'amber badge');
  AA(T('--red'), T('--red-50'), 'red badge');
  AA(T('--primary-600'), T('--primary-50'), 'blue badge');
  AA(T('--faint'), T('--primary-50'), 'ref-note on tint'); // 랩 공식 카드(primary-50) 안의 .ref-note 안내 문구
});

test('밝은 텍스트 × Dark/Royal ≥ 4.5', () => {
  for (const fg of ['#ffffff', '--icy', '--neon'])
    for (const bg of ['--dark', '--royal']) AA(fg.startsWith('#') ? fg : T(fg), T(bg), `${fg} on ${bg}`);
  AA(T('--vintage'), T('--dark'), 'vintage on dark');
});

test('UTM 판독 패널(#12151b) 위 텍스트 ≥ 4.5', () => {
  for (const c of ['#7d8797', '#98a1b0', '#5ee88a', '#ffb454']) AA(c, '#12151b', `${c} on utm panel`);
});
