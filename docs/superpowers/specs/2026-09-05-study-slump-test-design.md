# Study 자료 — "The slump test, step by step" 설계 스펙

- 날짜: 2026-09-05 / 상태: 사용자 요청("Study에 Slump test 방법을 조사해서 넣고, 사진 자료는 인터넷에서 — 저작권 무관 자료 우선")
- 선행: Study 글 템플릿 스펙(2026-09-05-study-mix-design-article-design.md). 같은 `article.css`/`article.js`를 쓴다.
- 조사 자료: `scratchpad/slump-research/research.txt`(ASTM C143/C143M·C172, AASHTO T 119, ACI 211.1, EN 12350-2, Iowa DOT IM 317, FHWA-HIF-20-061, Wikipedia 등 ~30개 출처; Wikimedia Commons 사진 후보 12개)

## 1. 결정 사항

| 항목 | 결정 |
|---|---|
| 페이지 | `site/study/slump-test/index.html` 한 장(약 1,700단어). MATERIALS에 `page` 항목 1개(`href: 'slump-test/'`, group `materials`) |
| 내용 | ① 슬럼프가 재는 것/못 재는 것 ② 장비(콘 4·8·12 in, 봉 5/8 × 24 in, 밑판, 스쿱, 자) ③ 시료 채취·시간 규칙(C172; 5분 내 시작, 2½분 내 완료) ④ 절차(적시기·밟기·3층 등부피 2⅝/6⅛ in·25회·1 in 관입·상단 쌓고 깎기·주변 정리·5±2 s 수직 인발·뒤집은 콘+봉으로 ¼ in 단위 측정) ⑤ 결과 읽기(true/shear/collapse, 재시험 규칙) ⑥ 수치의 의미(ACI 211.1 권장 슬럼프 표, EN 206/12350-2 S1–S5, SCC는 slump flow) ⑦ 흔한 실수와 슬럼프 손실 ⑧ 정밀도(정성적, 검증 주석) ⑨ 핵심 정리 + Mix Design Lab의 가상 슬럼프 시험 CTA |
| 도해(SVG, 새로 그림) | A 콘·봉 치수 도해 / B 3층 채움 높이·다짐 도해 / C true·shear·collapse + 측정법 도해 |
| 사진(다운로드는 사용자 승인 후) | Wikimedia Commons "Cono de Abrams 01–05"(Tano4595, CC BY-SA 2.5, 1024×768, 각 ≈300 KB): 장비·채움·다짐·인발·측정 5단계 연속 사진. 히어로 후보 "Essais sur béton DSC 2166"(Habib M'henni, CC BY 4.0, 4644×3084, 1.6 MB — 내용 확인 후 채택). 캡션에 저자·라이선스 표기, 글 끝 "Photo credits" 문단. Pillow로 1200px 이하·JPEG q80 재압축(각 ≤ 220 KB) |
| 스타일 추가 | `article.css`에 `.fig-grid`(2열 그림 격자, ≤700px 1열) — 토큰만 |
| 테스트 | `tools/site-guards.test.mjs`의 `ARTICLE_PAGES`·토큰 가드 목록에 새 페이지 추가, 사진 용량 가드 추가(≤ 220 KB); 기존 MATERIALS `page` href 존재 테스트가 새 항목을 자동 검사 |
| 검증 | 헤드리스 캡처(1440·390), 링크·이미지 요청 200, 배포 후 라이브 반복 |

## 2. 사실 검증 원칙
- 수치는 ASTM C143/C172·ACI 211.1·EN 206 값만 쓰고, 2차 출처만 있는 값(정밀도 SD, 30분 슬럼프 손실)은 정성적으로 쓰거나 "대략"으로 표기한다.
- Part 1(Mix Design)의 시작 슬럼프 표(2–5 / 3–5 in, 혼화제 전제)와 ACI 211.1의 진동 다짐 기준 표(1–3 / 1–4 in)는 전제가 다름을 본문에 밝힌다.
- 과목 코드 없음, 영어, 브랜드 토큰만.

## 3. 범위 제외
슬럼프 플로우(C1611)·Vebe·flow table의 상세 절차, 동영상, 한국어 번역.
