// tools/site-guards.test.mjs — 사이트 전역 가드 (node --test)
// (a) 과목 코드 금지 (b) article.css 는 토큰만 (c) 글 페이지 내부 링크 존재 (d) 사진 용량 예산
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'vendor') continue; // three.js 벤더 파일은 검사 대상이 아니다
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(html|js|css)$/.test(name)) out.push(p);
  }
  return out;
}

test('site/ 어디에도 대문자 과목 코드 CNST 가 없다', () => {
  for (const f of walk(SITE)) assert.ok(!readFileSync(f, 'utf8').includes('CNST'), `course code in ${f}`);
});

test('article.css 는 theme.css 토큰만 쓴다(리터럴 색 없음)', () => {
  const css = readFileSync(join(SITE, 'study/article.css'), 'utf8');
  const literals = css.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  assert.deepEqual(literals, []);
  assert.ok(css.includes('var(--royal)'), 'uses tokens');
});

test('Study 사진 4장이 존재하고 용량 예산 안이다', () => {
  const IMG = join(SITE, 'study/mix-design/img');
  const budget = { 'pour.jpg': 180 * 1024, 'slump-test.jpg': 90 * 1024, 'graded-aggregate.jpg': 25 * 1024, 'angular-rounded.jpg': 12 * 1024 };
  for (const [name, max] of Object.entries(budget)) {
    const p = join(IMG, name);
    assert.ok(existsSync(p), `${name} missing`);
    assert.ok(statSync(p).size <= max, `${name} is ${statSync(p).size} B > ${max} B`);
  }
});
