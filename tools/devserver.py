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

추가 수정(리뷰 후속): 모든 응답에 `Cache-Control: no-store`를 강제한다.
이 헤더가 없으면 브라우저가 과거(수정 전) 서버가 보낸 잘못된 응답을
휴리스틱 캐시로 계속 재사용해, 서버를 고친 뒤에도 새 탭/재실행에서
module 로드가 계속 실패하는 문제가 있었다. 로컬 전용 서버이므로
캐시를 완전히 끄는 편이 안전하다.

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

    def end_headers(self):
        # 모든 응답에 대해 브라우저/중간 캐시가 과거의(잘못된) 응답을
        # 재사용하지 못하도록 캐시를 금지한다. 로컬 프리뷰 전용이며
        # 배포(Netlify)의 캐시 정책과는 무관하다.
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    directory = sys.argv[2] if len(sys.argv) > 2 else 'site'
    handler = functools.partial(Handler, directory=directory)
    with http.server.ThreadingHTTPServer(('', port), handler) as httpd:
        print(f'Serving {directory!r} on http://localhost:{port} (.js MIME type fixed, caching disabled)')
        httpd.serve_forever()


if __name__ == '__main__':
    main()
