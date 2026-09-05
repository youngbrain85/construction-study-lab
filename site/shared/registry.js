// site/shared/registry.js — 사이트 레지스트리 (홈·Lab·Study 페이지 공용, 클래식 스크립트)
// 새 랩 = 폴더 1개 + LABS 항목 1줄. 새 공부자료 = MATERIALS 항목 1줄.
// href는 각 섹션 페이지(labs/ 또는 study/) 기준 상대경로다.
(function () {
  'use strict';

  const LAB_GROUPS = [
    { id: 'material', name: 'Material Lab', blurb: 'Concrete, aggregates, and the tests that prove them.' },
    { id: 'survey',   name: 'Survey Lab',   blurb: 'Leveling, traversing, and site layout.' },
  ];

  const LABS = [
    { id: 'mix-design', group: 'material', name: 'Mix Design Lab', href: 'mix-design/',
      desc: 'Proportion a concrete mix with the ACI tables, then put it through virtual slump and strength tests.',
      meta: '5 missions · ACI PRC-211.1-22', bestKey: 'mixlab-best', active: true },
    { id: 'material-soon', group: 'material', active: false },
    { id: 'survey-soon',   group: 'survey',   active: false },
  ];

  const STUDY_GROUPS = [
    { id: 'materials', name: 'Materials', blurb: 'Concrete, aggregates, and mix design.' },
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

  const SITE = { LAB_GROUPS, LABS, STUDY_GROUPS, MATERIALS, scoreToGrade, bestGrade };
  if (typeof window !== 'undefined') window.SITE = SITE;
  if (typeof module !== 'undefined' && module.exports) module.exports = SITE;
})();
