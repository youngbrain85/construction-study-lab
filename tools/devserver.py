#!/usr/bin/env python3
"""로컬 프리뷰 전용 정적 서버 (Construction Study Lab).

배경: 일부 Windows 환경은 레지스트리의 잘못된 확장자 매핑 때문에 파이썬
표준 `python -m http.server`가 `.js` 파일을 `text/plain`으로 응답한다.
브라우저는 `<script type="module">`에 대해 MIME 타입을 엄격히 검사하므로,
이 상태에서는 ES module 스크립트(scene3d.js, three.module.js 등)가
"Strict MIME type checking" 오류로 로드되지 않는다.

이 스크립트는 `.js`/`.mjs`의 Content-Type을 명시적으로 `text/javascript`로
고정한 SimpleHTTPRequestHandler를 사용해 그 문제만 해결한다.
로컬 개발 미리보기 전용이며, 실제 배포(Netlify)의 Content-Type 처리에는
전혀 관여하지 않는다 — Netlify는 정적 자산의 MIME 타입을 별도로 올바르게
서빙한다.

사용법: python tools/devserver.py [port] [directory]
  기본값: port=8123, directory=site
"""
import functools
import http.server
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
    }


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    directory = sys.argv[2] if len(sys.argv) > 2 else 'site'
    handler = functools.partial(Handler, directory=directory)
    with http.server.ThreadingHTTPServer(('', port), handler) as httpd:
        print(f'Serving {directory!r} on http://localhost:{port} (.js MIME type fixed for ES modules)')
        httpd.serve_forever()


if __name__ == '__main__':
    main()
