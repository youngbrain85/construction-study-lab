# Study 목록 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Study 목록의 제목을 각 글의 h1로 줄이고, 한 덩어리였던 `Materials`를 콘크리트·골재·철근·토양 네 그룹으로 나누고, 왼쪽 `PAGE` 배지를 대표 사진 썸네일로 바꾼다.

**Architecture:** 데이터는 전부 `site/shared/registry.js`(그룹 5개 + 항목별 `thumb`), 렌더는 `site/study/index.html`의 인라인 스크립트, 모양은 `site/shared/theme.css`. 썸네일은 이미 사이트에 있는(라이선스 확인·크레딧 완료) 사진에서 잘라내고, 배합설계 Part 2만 Commons의 CC0 사진 한 장을 새로 받는다.

**Tech Stack:** 바닐라 JS, Python 3 + Pillow, Node 20 `node --test`, 헤드리스 Edge.

**Spec:** `docs/superpowers/specs/2026-09-07-study-index-cards-design.md`

## Global Constraints

- 워크트리 `D:\Projects\Test\.claude\worktrees\study-index`(브랜치 `worktree-study-index`)에서만 작업.
- `site/` 아래 대문자 `CNST` 금지, 리터럴 색 금지(토큰만), 푸터 문구 불변, 이모지·로고 금지. 주석 한국어, 화면 문구 영어.
- 썸네일: `site/study/img/<id>.jpg`, 정확히 360×240, 개당 40 KB 이하, EXIF 제거.
- CC BY·BY-SA 사진을 쓰는 자리에는 저작자 표시가 필요하다 — 목록 맨 아래 `ref-note` 크레딧 문단 한 개.
- 커밋: `git add … && git -c core.quotepath=false commit -F - <<'EOF' … EOF`, 한국어 메시지, 트레일러 `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- 테스트 게이트: `node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs tools/study-tables.test.mjs tools/site-guards.test.mjs tools/layout.test.mjs tools/props.test.mjs tools/decor.test.mjs tools/compaction.test.mjs tools/cylinders.test.mjs tools/gradation.test.mjs tools/rebar.test.mjs tools/airyield.test.mjs`

## File Structure

- Create `site/study/img/{mix-design,mix-design-example,slump-test,air-yield,concrete-cylinders,aggregate-gradation,rebar-tension,soil-compaction}.jpg` (Task 1); modify `tools/site-guards.test.mjs` (Task 1).
- Modify `site/shared/registry.js`, `tools/registry.test.mjs` (Task 2).
- Modify `site/study/index.html`, `site/shared/theme.css` (Task 3).

---

### Task 1: 썸네일 8장

원본 7장은 이미 저장소에 있고, Part 2용 1장만 Commons에서 받는다(CC0: `A 4-Bin Inline Blending Concrete Batch Plant.jpg`, MichaelM314 — 저작자 표시 불필요).

- [ ] **Step 1** 스크래치에 원본 받기: `Special:FilePath/A%204-Bin%20Inline%20Blending%20Concrete%20Batch%20Plant.jpg?width=1600` (curl, 서술형 UA).
- [ ] **Step 2** `prep-thumbs.py`로 8장 생성 — 각 원본을 3:2로 중앙(또는 지정) 크롭 후 360×240, 품질 82에서 시작해 40 KB 이하가 될 때까지 4씩 낮춘다.

| 결과 | 원본 | 크롭 |
|---|---|---|
| mix-design.jpg | `site/study/mix-design/img/pour.jpg` | 중앙 3:2 |
| mix-design-example.jpg | 스크래치의 배치플랜트 | 왼쪽 위(빈·사일로) — 주차된 차량이 아래에 몰려 있으므로 위쪽을 잡는다 |
| slump-test.jpg | `slump-test/img/slump-hero.jpg` | 중앙 3:2 |
| air-yield.jpg | `air-yield/img/placing.jpg` | 중앙 3:2 |
| concrete-cylinders.jpg | `concrete-cylinders/img/cylinder-hero.jpg` | 중앙 3:2 |
| aggregate-gradation.jpg | `aggregate-gradation/img/sieve-stack.jpg` | 중앙 3:2 |
| rebar-tension.jpg | `rebar-tension/img/rebar-closeup.jpg` | 중앙 3:2 |
| soil-compaction.jpg | `soil-compaction/img/earthwork-hero.jpg` | 중앙 3:2 |

- [ ] **Step 3** 8장 모두 Read 로 열어 무엇이 보이는지 확인(썸네일 크기에서 알아볼 수 있는지).
- [ ] **Step 4** `tools/site-guards.test.mjs`에 새 테스트: `study/img`에 정확히 8개의 `.jpg`, 각 40 KB 이하, 각 360×240(기존 `jpegSize` 재사용).
- [ ] **Step 5** 게이트 → 커밋.

### Task 2: 레지스트리

- [ ] **Step 1** 테스트 먼저 — `tools/registry.test.mjs`의 그룹 id를 `['concrete','aggregate','steel','soils','surveying']`로, page id 순서를 `['mix-design-1','mix-design-2','slump-test','air-yield','concrete-cylinders','aggregate-gradation','rebar-tension','soil-compaction']`로 바꾸고, 모든 page 항목이 `thumb`을 가지며 그 파일이 존재하는지 검사한다. 그룹별 소속도 확인.
- [ ] **Step 2** 실패 확인 → `site/shared/registry.js` 수정(그룹 5개, 항목의 title·desc·group·thumb, 순서는 스펙 §3 표).
- [ ] **Step 3** 게이트 → 커밋.

### Task 3: 목록 화면

- [ ] **Step 1** `site/study/index.html`: `itemRow`의 첫 칸을 `h('img', { class:'thumb', src:m.thumb, alt:'', width:360, height:240, loading:'lazy' })`로 교체(`TYPE_LABEL`은 meta 칸에서 계속 쓰인다). `soonRow`는 같은 자리에 `h('div', { class:'thumb thumb-soon' })`를 둔다. 렌더 끝에 크레딧 문단(`ref-note`) 추가 — 저작자·라이선스와 해당 글 링크.
- [ ] **Step 2** `site/shared/theme.css`: `.ledger-row .thumb { width:120px; height:80px; object-fit:cover; border-radius:var(--radius); display:block; }`, `.thumb-soon`은 점선 테두리 빈 상자. `.ledger-row` 그리드 첫 열을 `120px`로(좁은 화면 `84px`, 썸네일 84×56).
- [ ] **Step 3** 게이트 → 1440·390 캡처로 다섯 그룹·여덟 썸네일·Coming soon 행·크레딧 확인 → 커밋.
