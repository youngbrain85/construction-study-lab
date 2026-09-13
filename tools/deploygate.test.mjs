// tools/deploygate.test.mjs — 임시 프로브.
// netlify.toml 의 빌드 명령(테스트 게이트)이 실제로 배포를 막는지 확인하려고 일부러 실패시킨다.
// 확인이 끝나면 이 파일은 바로 지운다. main 에 오래 남아 있으면 안 된다.
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('배포 게이트 프로브: 일부러 실패한다', () => {
  assert.equal('gate', 'open', '이 실패로 Netlify 빌드가 중단되어야 한다');
});
