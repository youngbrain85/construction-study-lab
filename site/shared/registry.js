// site/shared/registry.js — 사이트 레지스트리 (홈·Lab·Study 페이지 공용, 클래식 스크립트)
// 새 랩 = 폴더 1개 + LABS 항목 1줄(`station` 키는 3D 랩실의 스테이션; Coming soon 항목의 `href`·`active:true`를 채우면 스테이션이 켜진다). 새 공부자료 = MATERIALS 항목 1줄.
// href는 각 섹션 페이지(labs/ 또는 study/) 기준 상대경로다.
(function () {
  'use strict';

  const LAB_GROUPS = [
    { id: 'material', name: 'Material Lab', blurb: 'Concrete, aggregates, and the tests that prove them.' },
    { id: 'survey',   name: 'Survey Lab',   blurb: 'Leveling, traversing, and site layout.' },
  ];

  // 3D 랩실(labs/room)의 스테이션 키 — layout.js 의 STATIONS 순서와 같아야 한다(tools/layout.test.mjs)
  const STATION_KEYS = ['mix', 'soil', 'steel', 'wood', 'survey'];

  const LABS = [
    { id: 'mix-design', group: 'material', station: 'mix', name: 'Mix Design Lab', href: 'mix-design/',
      desc: 'Proportion a concrete mix with the ACI tables, then put it through virtual slump and strength tests.',
      meta: '5 missions · ACI PRC-211.1-22', bestKey: 'mixlab-best', active: true },
    { id: 'soil-testing', group: 'material', station: 'soil',   name: 'Soil Testing Lab',  active: false },
    { id: 'steel',        group: 'material', station: 'steel',  name: 'Steel Lab',         active: false },
    { id: 'wood-framing', group: 'material', station: 'wood',   name: 'Wood Framing Lab',  active: false },
    { id: 'surveying',    group: 'survey',   station: 'survey', name: 'Surveying Lab',     active: false },
  ];

  const STUDY_GROUPS = [
    { id: 'materials', name: 'Materials', blurb: 'Concrete, aggregates, soils, and mix design.' },
    { id: 'surveying', name: 'Surveying', blurb: 'Leveling, traversing, and site layout.' },
  ];

  // { id, group, type:'pdf'|'link'|'page', title, desc, href } — 비어 있으면 페이지가 Coming soon 행을 그린다
  const MATERIALS = [
    { id: 'mix-design-1', group: 'materials', type: 'page', title: 'How to design a concrete mix',
      desc: 'Concrete mix design, part 1 — the ten-step ACI workflow, from slump to trial batch, with the tables you need.',
      href: 'mix-design/' },
    { id: 'mix-design-2', group: 'materials', type: 'page', title: 'Worked example: a 3,000 psi beam',
      desc: 'Concrete mix design, part 2 — every step of one mix, from 325 lb of water to a checked 1 yd³ batch.',
      href: 'mix-design/example/' },
    { id: 'slump-test', group: 'materials', type: 'page', title: 'The slump test, step by step',
      desc: 'ASTM C143 in the field — apparatus, sampling and timing, filling and rodding, the lift, and how to read true, shear, or collapse.',
      href: 'slump-test/' },
    { id: 'soil-compaction', group: 'materials', type: 'page', title: 'Compaction control: the Proctor test and field density',
      desc: 'How fill is specified and checked — the Proctor curve, sand cone and nuclear gauge tests, percent compaction, and a calculator to try it.',
      href: 'soil-compaction/' },
  ];

  // 점수 → 등급 (Mix Design Lab 채점 등급과 동일한 경계값)
  function scoreToGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  // localStorage[key] = { missionId: score } 중 최고 점수의 등급. 기록·저장소가 없으면 null.
  function bestGrade(key) {
    try {
      if (typeof localStorage === 'undefined') return null;
      const scores = Object.values(JSON.parse(localStorage.getItem(key) || '{}'));
      if (!scores.length) return null;
      return scoreToGrade(Math.max(...scores));
    } catch (e) { return null; }
  }

  const SITE = { LAB_GROUPS, STATION_KEYS, LABS, STUDY_GROUPS, MATERIALS, scoreToGrade, bestGrade };
  if (typeof window !== 'undefined') window.SITE = SITE;
  if (typeof module !== 'undefined' && module.exports) module.exports = SITE;
})();
