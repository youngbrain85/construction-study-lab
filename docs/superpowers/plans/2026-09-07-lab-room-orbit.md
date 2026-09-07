# 3D 랩실 마우스 시점 조작 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/labs/`의 3D 랩실에서 드래그로 시점을 돌리고, 휠로 줌하고, 더블클릭·Esc로 기본 시점으로 돌아올 수 있게 한다. 스테이션 클릭·호버·라벨·유휴 정지·저모션 경로는 그대로 둔다.

**Architecture:** 각도·줌은 순수 함수 `fitCamera(aspect, opts)`가 받아 클램프까지 처리한다(node 테스트 대상). `lab-room.js`는 포인터·휠 이벤트를 각도로 바꿔 넣고 기존 `applyCamera()`를 다시 부를 뿐이다. three.js `OrbitControls` 벤더 파일은 쓰지 않는다.

**Tech Stack:** 바닐라 ES 모듈, three.js(자체 호스팅), Node 20 `node --test`, 헤드리스 Edge CDP 검증.

**Spec:** `docs/superpowers/specs/2026-09-07-lab-room-orbit-design.md`

## Global Constraints

- 워크트리 `D:\Projects\Test\.claude\worktrees\lab-orbit`(브랜치 `worktree-lab-orbit`)에서만 작업한다.
- `site/` 아래 대문자 `CNST` 금지, 리터럴 색 금지(토큰만), 푸터 문구 불변, 이모지·로고 금지. 주석은 한국어, 화면 문구는 영어.
- `fitCamera(aspect)`를 인자 없이 부른 결과는 **지금과 완전히 같아야 한다**(기존 구도·검증 캡처 불변).
- 허용 범위: yaw 0–90°, pitch 15–80°, zoom 0.85–2.2 — 세 값 모두 순수 함수 안에서 클램프한다.
- 커밋: `git add <files> && git -c core.quotepath=false commit -F - <<'EOF' … EOF`, 한국어 메시지, 트레일러 `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- 테스트 게이트: `node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs tools/study-tables.test.mjs tools/site-guards.test.mjs tools/layout.test.mjs tools/props.test.mjs tools/decor.test.mjs tools/compaction.test.mjs tools/cylinders.test.mjs tools/gradation.test.mjs tools/rebar.test.mjs tools/airyield.test.mjs`

## File Structure

- Modify `site/labs/room/layout.js` — `CAMERA.orbit` 추가, `fitCamera`가 yaw·pitch·zoom을 받는다 (Task 1).
- Modify `tools/layout.test.mjs` — 클램프·줌·회전 범위 테스트 (Task 1).
- Modify `site/labs/room/lab-room.js` — 드래그·휠·리셋 (Task 2).
- Modify `site/shared/theme.css`, `site/labs/index.html` — `touch-action`, 안내 문구 (Task 2).

---

### Task 1: 순수 함수에 회전·줌 넣기

- [ ] **Step 1: 실패하는 테스트 먼저** — `tools/layout.test.mjs`의 `fitCamera` 테스트 뒤에 네 개를 추가한다(코드는 구현 시 그대로 사용).
- [ ] **Step 2: 실패 확인** — `node --test tools/layout.test.mjs` → 새 테스트 실패(`CAMERA.orbit` 없음).
- [ ] **Step 3: `layout.js` 수정**
  - `CAMERA`에 `orbit: { yaw: [0, 90], pitch: [15, 80], zoom: [0.85, 2.2] }` 추가.
  - 모듈 상단 헬퍼에 `const clampTo = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));` 추가.
  - `fitCamera`에서 `o` 를 읽은 직후 yaw·pitch·zoom을 `opts`에서 받아 클램프하고, `viewDir(yawDeg, pitchDeg)`를 쓴다.
  - 재중심 루프가 끝난 뒤 `d /= zoom;` 한 줄로 거리를 줄인다(타깃은 건드리지 않는다).
  - 반환 객체에 `yawDeg, pitchDeg, zoom` 추가.
- [ ] **Step 4: 통과 확인** — `node --test tools/layout.test.mjs`.
- [ ] **Step 5: 전체 게이트 → 커밋**

### Task 2: 화면 조작 붙이기

- [ ] **Step 1: `lab-room.js`**
  - 모듈 상태 `let orbit = null;`(= 프리셋 그대로).
  - `applyCamera()`가 `L.fitCamera(w / hh, orbit || {})`를 부르고, 반환된 `yawDeg·pitchDeg·zoom`을 `orbit`이 있을 때만 되돌려 저장한다(클램프 결과 반영).
  - `bindEvents()`에 추가: `pointerdown`에서 드래그 시작점을 기록(라벨 위·오른쪽 버튼·수정키는 제외 — 기존 `down` 로직 재사용), `pointermove`에서 버튼이 눌린 채 8 px를 넘으면 회전 모드로 들어가 yaw/pitch를 갱신하고 `applyCamera()` + `renderOnce()`, `pointerup`에서 종료. 회전한 프레임에서는 레이캐스트를 예약하지 않는다.
  - `wheel`(passive: false)에서 `preventDefault()` 후 줌 배율 갱신.
  - `dblclick`과 `Escape` 키에서 `orbit = null` → `applyCamera()` + `renderOnce()`.
  - 돌리(`dolly`) 진행 중에는 회전·줌 입력을 무시한다.
  - 모든 입력 경로에서 `markInput()`을 부른다.
- [ ] **Step 2: `theme.css`** — `.room-viewport`에 `touch-action:none;` 추가.
- [ ] **Step 3: `site/labs/index.html`** — `room-hint` 문구를 `Pick a station · drag to look around` 로 바꾼다.
- [ ] **Step 4: 게이트 + 브라우저 검증** — 드래그로 yaw·pitch가 바뀌고 라벨이 따라오는지, 휠 줌, 더블클릭 리셋, 스테이션 클릭이 여전히 되는지, 8 px 미만 클릭이 회전으로 오인되지 않는지 확인하고 캡처한다.
- [ ] **Step 5: 커밋**
