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

const ARTICLE_PAGES = ['study/mix-design/index.html', 'study/mix-design/example/index.html'];
test('글 페이지의 내부 링크·이미지·스타일 경로가 파일로 존재한다', () => {
  for (const rel of ARTICLE_PAGES) {
    const file = join(SITE, rel);
    assert.ok(existsSync(file), `${rel} missing`);
    const html = readFileSync(file, 'utf8');
    const refs = [...html.matchAll(/\b(?:href|src)="([^"#][^"]*)"/g)].map(m => m[1]).filter(u => !/^https?:/.test(u));
    assert.ok(refs.length > 10, `${rel}: too few refs`);
    for (const u of refs) {
      const clean = u.split('#')[0].split('?')[0];
      let p = resolve(dirname(file), clean);
      if (clean.endsWith('/')) p = join(p, 'index.html');
      assert.ok(existsSync(p), `${rel}: broken ref ${u}`);
      // 다른 페이지의 앵커(example/#step-4, ../#tbl-water)는 그 파일에 id 가 있어야 한다
      const hash = u.includes('#') ? u.slice(u.indexOf('#') + 1) : '';
      if (hash) assert.ok(readFileSync(p, 'utf8').includes(`id="${hash}"`), `${rel}: missing anchor ${u}`);
    }
    // 페이지 안 앵커(#id)도 실제 id 가 있어야 한다
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
    for (const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(m[1]), `${rel}: missing anchor #${m[1]}`);
  }
});
