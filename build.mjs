// build.mjs — engine.js를 index.html에 인라인해 dist/index.html 생성
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const engine = readFileSync('engine.js', 'utf8');
const TAG = '<script src="engine.js"></script>';
if (!html.includes(TAG)) throw new Error('engine.js script 태그를 찾지 못했습니다');
const out = html.replace(TAG, '<script>\n' + engine + '\n</script>');
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', out);
console.log(`dist/index.html 생성 완료 (${(out.length / 1024).toFixed(1)} KB)`);
