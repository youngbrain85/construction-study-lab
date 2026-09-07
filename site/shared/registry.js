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

  // 재료별 그룹. 글이 늘면 그 재료의 그룹에 한 줄만 더한다.
  const STUDY_GROUPS = [
    { id: 'concrete',  name: 'Concrete',          blurb: 'Mix design, and the tests that judge concrete fresh and hardened.' },
    { id: 'aggregate', name: 'Aggregates',        blurb: 'Grading, fineness modulus, and the limits a concrete aggregate must meet.' },
    { id: 'steel',     name: 'Reinforcing steel', blurb: 'What a bar is bought by, and how it is proven.' },
    { id: 'soils',     name: 'Soils',             blurb: 'Compaction control and earthwork acceptance.' },
    { id: 'surveying', name: 'Surveying',         blurb: 'Leveling, traversing, and site layout.' },
  ];

  // { id, group, type:'pdf'|'link'|'page', title, desc, href, thumb } — 비어 있는 그룹은 페이지가 Coming soon 행을 그린다.
  // 제목은 그 글의 h1 과 같게, desc 는 카드에서 두 줄을 넘지 않게 한 줄로. thumb 는 site/study/ 기준 상대경로.
  const MATERIALS = [
    { id: 'mix-design-1', group: 'concrete', type: 'page', title: 'Mix design',
      desc: 'The ten-step ACI 211.1 workflow, from slump to trial batch.',
      href: 'mix-design/', thumb: 'img/mix-design.jpg' },
    { id: 'mix-design-2', group: 'concrete', type: 'page', title: 'Mix design: worked example',
      desc: 'One 3,000 psi mix worked through to a checked 1 yd³ batch.',
      href: 'mix-design/example/', thumb: 'img/mix-design-example.jpg' },
    { id: 'slump-test', group: 'concrete', type: 'page', title: 'Slump test',
      desc: 'ASTM C143 in the field: filling, rodding, the lift, and reading the result.',
      href: 'slump-test/', thumb: 'img/slump-test.jpg' },
    { id: 'air-yield', group: 'concrete', type: 'page', title: 'Air content and unit weight',
      desc: 'The pressure meter (C231), and what density says about yield (C138).',
      href: 'air-yield/', thumb: 'img/air-yield.jpg' },
    { id: 'concrete-cylinders', group: 'concrete', type: 'page', title: 'Concrete cylinders',
      desc: 'Making, curing and breaking them (C31/C39), and the ACI 318 acceptance rule.',
      href: 'concrete-cylinders/', thumb: 'img/concrete-cylinders.jpg' },
    { id: 'aggregate-gradation', group: 'aggregate', type: 'page', title: 'Sieve analysis',
      desc: 'Grading by ASTM C136, the fineness modulus, and the C33 band.',
      href: 'aggregate-gradation/', thumb: 'img/aggregate-gradation.jpg' },
    { id: 'rebar-tension', group: 'steel', type: 'page', title: 'Rebar tension test',
      desc: 'What ASTM A615 asks of a bar, and how ASTM A370 measures it.',
      href: 'rebar-tension/', thumb: 'img/rebar-tension.jpg' },
    { id: 'soil-compaction', group: 'soils', type: 'page', title: 'Compaction control',
      desc: 'The Proctor curve, field density tests, and percent compaction.',
      href: 'soil-compaction/', thumb: 'img/soil-compaction.jpg' },
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
