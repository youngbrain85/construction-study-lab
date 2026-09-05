// site/labs/lab-list.js — Lab 목록(대체 화면) 렌더 + 대체 전환 (클래식 스크립트, window.LabList)
// 3D 랩실(room/lab-room.js)이 못 뜨는 환경(WebGL 없음·모듈 실패·?no3d=1)에서 v4 목록을 그린다.
(function () {
  'use strict';
  const S = window.SITE;

  function activeRow(lab, n) {
    const grade = lab.bestKey ? S.bestGrade(lab.bestKey) : null;
    const meta = grade ? `${lab.meta}\nBest grade · ${grade}` : lab.meta;
    return h('div', { class: 'ledger-row is-active' },
      h('div', { class: 'num' }, n),
      h('div', {}, h('h3', { class: 'title' }, lab.name), h('p', { class: 'desc' }, lab.desc)),
      h('div', { class: 'meta', style: 'white-space:pre-line' }, meta),
      h('a', { class: 'btn btn-primary', href: lab.href }, 'Enter →'));
  }
  function soonRow(n, name) {
    return h('div', { class: 'ledger-row is-soon' },
      h('div', { class: 'num' }, n),
      h('div', {}, h('h3', { class: 'title' }, name || 'New lab coming soon')),
      h('div', { class: 'meta' }, '—'),
      h('div', { class: 'soon' }, 'Soon'));
  }

  // 번호는 그룹을 가로질러 01, 02, 03… 연속. 활성 랩이 먼저.
  function render(root) {
    root.innerHTML = '';
    let n = 0;
    for (const g of S.LAB_GROUPS) {
      const labs = S.LABS.filter(l => l.group === g.id).sort((a, b) => (b.active === true) - (a.active === true));
      const rows = labs.map(lab => { n += 1; const num = String(n).padStart(2, '0'); return lab.active ? activeRow(lab, num) : soonRow(num, lab.name); });
      if (rows.length === 0) rows.push(soonRow(String(++n).padStart(2, '0')));
      root.append(h('section', { class: 'group', id: `lab-${g.id}` },
        h('div', { class: 'group-head' }, h('h2', {}, g.name), h('p', {}, g.blurb)),
        ...rows));
    }
  }

  let shown = false;
  // 멱등: 가드 타이머 해제 → 뷰포트 숨김 → 대체 목록 표시·렌더 → 경고 1회
  function showFallback(reason) {
    if (window.__labRoomGuard) { clearTimeout(window.__labRoomGuard); window.__labRoomGuard = null; }
    const room = document.getElementById('room'), fb = document.getElementById('fallback');
    if (room) room.hidden = true;
    if (fb) { fb.hidden = false; render(fb); }
    if (!shown) console.warn('[LabRoom] fallback:', reason);
    shown = true;
  }

  window.LabList = { render, showFallback };
})();
