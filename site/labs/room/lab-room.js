// site/labs/room/lab-room.js — Lab 페이지 3D 랩실: 조립·상호작용·대체 화면 (ES module 진입점)
// 스펙: docs/superpowers/specs/2026-09-05-lab-room-3d-design.md §5.3. 검증 훅 window.__labRoomDebug 는 마운트 중에만 존재.
'use strict';

const SITE = window.SITE;
const LabList = window.LabList;
const h = window.h;

const viewport = document.getElementById('room');
const labelRoot = document.getElementById('room-labels');
const fade = document.querySelector('.room-fade');
const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const IDLE_MS = 20000, DOLLY_MS = 450, NUDGE_MS = 600, HOVER_EMISSIVE = 0x0053a5, HOVER_INTENSITY = 0.18;

let THREE, L, P, D, S3, stage, renderer, scene, camera;
const camTarget = { x: 0, y: 0, z: 0 };
let dirVec = null;
const stations = [], byKey = {}, hitBoxes = [];
let hovered = null, pendingHover = null, pendingPointer = null, activating = false, dolly = null;
let loopOn = false, lastInput = 0, start = 0, onceQueued = false;
let ray, ndc, projV;

function fallback(reason, err) {
  if (err) console.warn('[LabRoom]', err);
  if (stage) { try { stage.dispose(); } catch (e) { /* 이미 정리됨 */ } stage = null; }
  renderer = scene = camera = null; // 폐기된 renderer 로 프레임을 돌지 않게 끊는다
  LabList.showFallback(reason);
}

async function mount() {
  if (new URLSearchParams(location.search).get('no3d') === '1') return fallback('no3d');
  try {
    [S3, L, P, D] = await Promise.all([import('../mix-design/scene3d.js'), import('./layout.js'), import('./props.js'), import('./decor.js')]);
  } catch (err) { return fallback('import-failed', err); }
  const fb = document.getElementById('fallback');
  if (fb && !fb.hidden) return; // 12 s 가드가 이미 대체 목록을 띄웠다면 3D 를 만들지 않는다
  THREE = S3.THREE;
  stage = S3.createStage(viewport, { background: 0xe6f6fd, groundRadius: 0.01 });
  if (!stage) return fallback('no-webgl');
  try { build(); } catch (err) { return fallback('mount-error', err); }
  document.body.classList.add('room-page--3d');
  if (window.__labRoomGuard) { clearTimeout(window.__labRoomGuard); window.__labRoomGuard = null; }
}

function build() {
  renderer = stage.renderer; scene = stage.scene; camera = stage.camera;
  stage.ground.visible = false; // 원형 바닥판 대신 방 껍데기의 바닥을 쓴다
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'Top-down view of the virtual construction lab');
  const key = stage.lights.key; // 키 라이트를 방 전체를 덮도록 재배치 (스펙 §5.3 3)
  key.position.set(6, 12, 6); key.target.position.set(2.5, 0, 0);
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -12; key.shadow.camera.right = 12; key.shadow.camera.top = 12; key.shadow.camera.bottom = -12; key.shadow.camera.far = 40;
  key.shadow.camera.updateProjectionMatrix();

  scene.add(P.buildRoomShell(L.ROOM, L.YARD, L.DOOR));
  const decorPal = D.decorPalette(); // 장식 재질은 호버 대상이 아니므로 세 그룹이 하나의 팔레트를 공유해도 된다
  scene.add(D.buildBayDoor(L.DOOR, L.ROOM, decorPal), D.buildWallDecor(L.ROOM, decorPal), D.buildYardExtras(L.YARD, decorPal)); // 디테일 패스(스펙 §12)
  const rng = L.mulberry32(11);
  const BUILDERS = { soil: P.buildSoilBench, steel: P.buildTensileFrame, wood: P.buildFramingStation, survey: P.buildSurveyStation };

  for (const st of L.STATIONS) {
    const lab = SITE.LABS.find(l => l.station === st.key) || null;
    const active = !!(lab && lab.active && lab.href);
    const group = new THREE.Group(); group.name = `station-${st.key}`;
    group.position.set(st.center.x, 0, st.center.z);
    let update = null;
    if (st.key === 'mix') {
      const mixer = S3.buildMixerScene({ wc: 0.5, rng });
      mixer.group.position.set(0.4, 0, -0.6); mixer.group.rotation.y = 0.4;
      mixer.group.scale.setScalar(0.68);             // 원본은 화면 가득 채우는 크기 — 실물 믹서(≈1.4 m)로 축소
      const slump = S3.buildSlumpScene({ mode: 'true', slump: 3, measuredSlump: 3, rng });
      slump.update('lift', 0, 0);                    // 불투명 빈 콘 (y 오프셋은 빌더가 정한 값 유지)
      slump.group.position.x = -0.5; slump.group.position.z = 0.9;
      slump.group.scale.setScalar(0.33);             // 실제 슬럼프 콘 높이 ≈ 0.30 m 에 맞춘 축척
      const utm = S3.buildUtmScene({ failMode: 'cone', rng });
      utm.update(0, 0, 0, true);                     // 온전한 공시체 표시, 몰드 숨김
      utm.group.position.set(-1.2, 0, -0.9);
      group.add(mixer.group, slump.group, utm.group);
      mixer.update(3);
      update = (t) => mixer.update(3 + t * 0.35);    // 3 s 이후 구간 = 드럼 공회전만
    } else {
      group.add(BUILDERS[st.key](P.makePalette({ muted: !active })));
    }
    const ring = P.buildFloorRing(st.size); ring.visible = active; group.add(ring);
    const hit = P.buildHitBox(st.size, st.hitH, st.key); group.add(hit); hitBoxes.push(hit);
    scene.add(group);
    const mats = new Map(); // 호버 emissive 원값 (MeshStandardMaterial 만 — LineBasicMaterial 은 emissive 가 없다)
    group.traverse((o) => {
      if (!o.isMesh || o === ring || o === hit || !o.material) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (m.isMeshStandardMaterial && !mats.has(m)) mats.set(m, { hex: m.emissive.getHex(), intensity: m.emissiveIntensity });
      }
    });
    const s = { key: st.key, lab, active, group, ring, hit, update, mats, anchor: new THREE.Vector3(st.center.x, st.labelY, st.center.z), label: null, w: 0, h: 0, nudgeTimer: 0 };
    s.label = makeLabel(st, lab, active);
    stations.push(s); byKey[st.key] = s;
  }
  measureLabels();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measureLabels(); renderOnce(); }); // 웹폰트 로드 후 라벨 크기 재측정

  ray = new THREE.Raycaster(); ndc = new THREE.Vector2(); projV = new THREE.Vector3();
  applyCamera();
  new ResizeObserver(() => resize()).observe(viewport);
  bindEvents();
  renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stopLoop(); fallback('context-lost'); });

  start = performance.now(); lastInput = start;
  if (reducedMotion) renderOnce(); else startLoop();
  window.__labRoomDebug = {
    renderAt: (t) => frame(start + t * 1000, true),
    hover: (k) => { setHover(k); renderOnce(); },
    activate,
    stations: () => stations.map(s => ({ key: s.key, active: s.active })),
    info: () => { let meshes = 0; scene.traverse(o => { if (o.isMesh) meshes++; }); return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, meshes }; },
    renderer, camera,
  };
}

// ── 라벨 (HTML 오버레이, 스펙 §5.4) ───────────────────────────────────────
function makeLabel(st, lab, active) {
  const name = lab ? lab.name : st.key;
  const el = active
    ? h('a', { class: 'station-label is-active', href: lab.href, 'data-station': st.key })
    : h('span', { class: 'station-label is-soon', 'data-station': st.key, tabindex: '0', role: 'button', 'aria-disabled': 'true', 'aria-label': `${name}, coming soon` });
  el.append(h('span', { class: 'name' }, name), h('span', { class: 'status' }, active ? 'Enter →' : 'Coming soon'));
  if (active && lab.bestKey) { const g = SITE.bestGrade(lab.bestKey); if (g) el.append(h('span', { class: 'grade' }, `Best · ${g}`)); }
  el.addEventListener('pointerenter', () => { setHover(st.key); markInput(); });
  el.addEventListener('pointerleave', () => { setHover(null); markInput(); });
  el.addEventListener('focus', () => { setHover(st.key); markInput(); });
  el.addEventListener('blur', () => { setHover(null); markInput(); });
  el.addEventListener('click', (e) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; // 수정키·중클릭은 브라우저 기본(새 탭)
    e.preventDefault(); activate(st.key);
  });
  if (!active) el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(st.key); } });
  labelRoot.append(el);
  return el;
}
function refreshGrades() { // bfcache 복원 시 Best grade 최신화
  for (const s of stations) {
    if (!s.active || !s.lab.bestKey) continue;
    const g = SITE.bestGrade(s.lab.bestKey); const el = s.label.querySelector('.grade');
    if (g && !el) s.label.append(h('span', { class: 'grade' }, `Best · ${g}`));
    else if (g && el) el.textContent = `Best · ${g}`;
    else if (!g && el) el.remove();
  }
  measureLabels();
}
function measureLabels() { for (const s of stations) { s.w = s.label.offsetWidth; s.h = s.label.offsetHeight; } }

// ── 카메라 (스펙 §5.3 6: position → lookAt → fov/aspect → updateProjectionMatrix → updateMatrixWorld) ──
function applyCamera() {
  const w = viewport.clientWidth || 800, hh = viewport.clientHeight || 600;
  const fit = L.fitCamera(w / hh);
  camera.position.set(fit.position.x, fit.position.y, fit.position.z);
  Object.assign(camTarget, fit.target);
  camera.lookAt(camTarget.x, camTarget.y, camTarget.z);
  camera.fov = fit.fovDeg; camera.aspect = w / hh; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  dirVec = new THREE.Vector3(fit.dir.x, fit.dir.y, fit.dir.z);
}
function resize() {
  const w = viewport.clientWidth, hh = viewport.clientHeight;
  if (!w || !hh || !renderer) return;
  renderer.setSize(w, hh, false);
  applyCamera(); measureLabels(); renderOnce();
}

// ── 프레임: 소품 갱신 → 카메라 이동 → 호버 반영 → render → 라벨 배치 (render 뒤에 해야 카메라 행렬이 최신) ──
function frame(now, manual = false) {
  if (!renderer) return; // 이미 폐기된 뒤 남아 도는 rAF 콜백은 무시
  const t = (now - start) / 1000;
  if (!reducedMotion || manual) for (const s of stations) if (s.update) s.update(t);
  if (dolly) stepDolly(now);
  if (pendingPointer) { pendingHover = { key: keyAt(pendingPointer.x, pendingPointer.y) }; pendingPointer = null; } // 레이캐스트는 이벤트마다가 아니라 프레임당 한 번
  if (pendingHover !== null) { setHover(pendingHover.key); pendingHover = null; }
  renderer.render(scene, camera);
  placeLabels();
  if (loopOn && !dolly && now - lastInput > IDLE_MS) stopLoop(); // 유휴 20 s → 정지(마지막 프레임 유지)
}
function startLoop() { if (loopOn || reducedMotion || !stage) return; loopOn = true; stage.setLoop((now) => frame(now)); }
function stopLoop() { if (!loopOn) return; loopOn = false; stage.stop(); }
function renderOnce() { if (loopOn || onceQueued || !renderer) return; onceQueued = true; requestAnimationFrame((now) => { onceQueued = false; frame(now); }); }
function markInput() {
  lastInput = performance.now();
  if (reducedMotion) renderOnce();
  else if (!loopOn && document.visibilityState === 'visible') startLoop();
}

function placeLabels() {
  const w = viewport.clientWidth, hh = viewport.clientHeight;
  const boxes = stations.map((s) => {
    projV.copy(s.anchor).project(camera); // 프레임마다 Vector3 를 새로 만들지 않는다 (build 에서 한 번 생성)
    const x = ((projV.x + 1) / 2) * w, y = ((1 - projV.y) / 2) * hh;
    return { key: s.key, x: x - s.w / 2, y: y - s.h, w: s.w, h: s.h };
  });
  L.deoverlapLabels(boxes);
  for (const b of boxes) {
    const el = byKey[b.key].label;
    el.style.transform = `translate3d(${Math.round(b.x)}px, ${Math.round(b.y)}px, 0)`;
    el.style.setProperty('--lead', `${Math.round(b.lead || 0)}px`);
  }
}

// ── 호버 ─────────────────────────────────────────────────────────────
function keyAt(clientX, clientY) {
  const r = viewport.getBoundingClientRect();
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(hitBoxes, false);
  return hits.length ? hits[0].object.userData.station : null;
}
function setHover(key) {
  if (hovered === key) return;
  if (hovered && byKey[hovered]) applyHover(byKey[hovered], false);
  hovered = key || null;
  if (hovered && byKey[hovered]) applyHover(byKey[hovered], true);
  viewport.style.cursor = hovered && byKey[hovered] && byKey[hovered].active ? 'pointer' : '';
}
function applyHover(s, on) {
  s.label.classList.toggle('is-hover', on);
  if (!s.active) return; // Coming soon: 라벨만 강조
  s.ring.material.opacity = on ? 1 : 0.55;
  for (const [m, orig] of s.mats) {
    if (on) { m.emissive.setHex(HOVER_EMISSIVE); m.emissiveIntensity = HOVER_INTENSITY; }
    else { m.emissive.setHex(orig.hex); m.emissiveIntensity = orig.intensity; }
  }
}

// ── 클릭/탭: 활성 = 카메라 접근 + 페이드 후 이동, Coming soon = 라벨 깜빡임 ────────
function activate(key) {
  const s = byKey[key]; if (!s) return;
  if (!s.active) {
    clearTimeout(s.nudgeTimer); // 연타 시 앞선 타이머가 새 깜빡임을 중간에 끄지 않게
    s.label.classList.remove('is-nudge'); void s.label.offsetWidth; s.label.classList.add('is-nudge');
    s.nudgeTimer = setTimeout(() => s.label.classList.remove('is-nudge'), NUDGE_MS);
    return;
  }
  if (activating) return;
  activating = true;
  const href = s.lab.href;
  if (reducedMotion) { location.assign(href); return; }
  const to = s.anchor.clone().add(dirVec.clone().multiplyScalar(4.5));
  dolly = { from: camera.position.clone(), fromT: new THREE.Vector3(camTarget.x, camTarget.y, camTarget.z), to, toT: s.anchor.clone(), t0: performance.now(), href };
  fade.classList.add('is-on');
  markInput(); startLoop();
}
function stepDolly(now) {
  const p = Math.min(1, (now - dolly.t0) / DOLLY_MS), e = 1 - Math.pow(1 - p, 3); // ease-out-cubic
  camera.position.lerpVectors(dolly.from, dolly.to, e);
  const tgt = new THREE.Vector3().lerpVectors(dolly.fromT, dolly.toT, e);
  camera.lookAt(tgt); camera.updateMatrixWorld();
  if (p >= 1) { const href = dolly.href; dolly = null; location.assign(href); }
}

function bindEvents() {
  let down = null;
  viewport.addEventListener('pointermove', (e) => {
    markInput();
    if (e.pointerType === 'touch') return;
    const lbl = e.target && e.target.closest ? e.target.closest('.station-label') : null; // 라벨 위에서는 레이캐스트 생략
    if (lbl) { pendingHover = { key: lbl.dataset.station }; pendingPointer = null; }
    else pendingPointer = { x: e.clientX, y: e.clientY };          // 레이캐스트는 frame() 에서 한 번만
    if (reducedMotion) renderOnce();
  });
  viewport.addEventListener('pointerleave', () => { pendingHover = { key: null }; pendingPointer = null; markInput(); });
  viewport.addEventListener('pointerdown', (e) => {
    markInput();
    const onLabel = e.target && e.target.closest && e.target.closest('.station-label'); // 라벨은 자기 click 핸들러가 처리
    // 우클릭·수정키 클릭은 브라우저 기본 동작(컨텍스트 메뉴·새 탭)에 맡긴다
    down = (e.button === 0 && !onLabel) ? { x: e.clientX, y: e.clientY } : null;
  });
  viewport.addEventListener('pointerup', (e) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) { down = null; return; }
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
    if (moved >= 8) return;
    const key = keyAt(e.clientX, e.clientY);
    if (key) activate(key);
  });
  document.addEventListener('keydown', () => markInput());
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopLoop(); else markInput(); });
}

function unmount() {
  delete window.__labRoomDebug;
  if (stage) { stage.dispose(); stage = null; }
  renderer = scene = camera = null; // 폐기된 renderer 로 프레임을 돌지 않게 끊는다
}

// bfcache 수명주기는 마운트 성공 여부와 무관하게 항상 듣는다 — 대체 목록 상태(stage 없음)로 복원돼도 목록을 재렌더해야 한다
window.addEventListener('pagehide', (e) => { if (e.persisted) stopLoop(); else unmount(); });
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  if (!stage) { const fb = document.getElementById('fallback'); if (fb && !fb.hidden) LabList.render(fb); return; } // 대체 목록 상태로 복원
  fade.classList.remove('is-on'); activating = false; dolly = null;
  applyCamera(); refreshGrades(); markInput(); renderOnce();
});

mount();
