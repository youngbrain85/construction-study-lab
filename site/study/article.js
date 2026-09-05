// site/study/article.js — Study 글 페이지 공용 (클래식 스크립트)
// 1) 푸터 연도  2) 목차 활성 표시: 뷰포트 상단 35 % 선을 지난 마지막 h2[id] 를 활성으로
(function () {
  'use strict';
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const links = Array.from(document.querySelectorAll('.toc a[href^="#"]'));
  const heads = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  if (!links.length || !heads.length) return;

  function activate(id) {
    links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
  }
  function update() {
    const line = window.innerHeight * 0.35;
    let current = heads[0];
    for (const h of heads) {
      if (h.getBoundingClientRect().top <= line) current = h; else break; // 문서 순서대로 정렬돼 있다
    }
    activate(current.id);
  }
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  }, { passive: true });
  window.addEventListener('resize', update);
  window.addEventListener('hashchange', update);
  update();
})();
