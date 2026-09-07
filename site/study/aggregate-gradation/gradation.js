// site/study/aggregate-gradation/gradation.js — 체가름 계산·C33 허용대 (순수 함수, DOM 무관)
// 근거: ASTM C136(계산·0.3 % 질량 대조), C125(FM·NMAS 정의), C33 §6·Table 3(허용대), C117(No. 200 통과분)
export const SIEVES = {
  fine: [{ label: '3/8 in', mm: 9.5 }, { label: 'No. 4', mm: 4.75 }, { label: 'No. 8', mm: 2.36 }, { label: 'No. 16', mm: 1.18 }, { label: 'No. 30', mm: 0.6 },
    { label: 'No. 50', mm: 0.3 }, { label: 'No. 100', mm: 0.15 }, { label: 'No. 200', mm: 0.075 }, { label: 'pan', mm: 0 }],
  coarse: [{ label: '2 in', mm: 50 }, { label: '1-1/2 in', mm: 37.5 }, { label: '1 in', mm: 25 }, { label: '3/4 in', mm: 19 }, { label: '1/2 in', mm: 12.5 },
    { label: '3/8 in', mm: 9.5 }, { label: 'No. 4', mm: 4.75 }, { label: 'No. 8', mm: 2.36 }, { label: 'No. 16', mm: 1.18 }, { label: 'pan', mm: 0 }],
};
// 예제 잔류 질량(g) — 본문에 "example numbers"로 밝힌다
export const DEFAULTS = { fine: [0, 12, 68, 110, 130, 105, 55, 14, 6], coarse: [0, 0, 300, 2400, 3900, 1900, 1300, 150, 0, 50] };
// FM 에 드는 표준 체(눈 크기 2:1)와 눈 크기 mm
export const FM_SIEVES = { '3 in': 75, '1-1/2 in': 37.5, '3/4 in': 19, '3/8 in': 9.5, 'No. 4': 4.75, 'No. 8': 2.36, 'No. 16': 1.18, 'No. 30': 0.6, 'No. 50': 0.3, 'No. 100': 0.15 };
// ASTM C33 §6.1 잔골재 통과율 허용대(%)
export const FINE_LIMITS = { '3/8 in': [100, 100], 'No. 4': [95, 100], 'No. 8': [80, 100], 'No. 16': [50, 85], 'No. 30': [25, 60], 'No. 50': [5, 30], 'No. 100': [0, 10] };
export const FINES_LIMIT = 3;            // No. 200 통과분 최대 %(마모에 노출되는 콘크리트; 그 밖은 5 %)
export const MAX_SINGLE_FRACTION = 45;   // 한 체를 통과하고 다음 체에 남는 양의 최대 %
export const FM_RANGE = [2.3, 3.1];
// ASTM C33 Table 3 굵은골재 크기번호별 통과율 허용대(%); 표에 없는 체는 제한 없음
export const COARSE_LIMITS = {
  '467': { '2 in': [100, 100], '1-1/2 in': [95, 100], '3/4 in': [35, 70], '3/8 in': [10, 30], 'No. 4': [0, 5] },
  '57': { '1-1/2 in': [100, 100], '1 in': [95, 100], '1/2 in': [25, 60], 'No. 4': [0, 10], 'No. 8': [0, 5] },
  '67': { '1 in': [100, 100], '3/4 in': [90, 100], '3/8 in': [20, 55], 'No. 4': [0, 10], 'No. 8': [0, 5] },
  '7': { '3/4 in': [100, 100], '1/2 in': [90, 100], '3/8 in': [40, 70], 'No. 4': [0, 15], 'No. 8': [0, 5] },
  '8': { '1/2 in': [100, 100], '3/8 in': [85, 100], 'No. 4': [10, 30], 'No. 8': [0, 10], 'No. 16': [0, 5] },
};

export const pct1 = v => Math.round(v * 10) / 10;

// retained: 체 순서와 같은 길이의 잔류 질량 배열(빈 칸은 0) → 잔류율·누적잔류율·통과율(소수 1자리)
export function analyze(retained, sieves) {
  const masses = sieves.map((s, i) => (Number.isFinite(retained[i]) && retained[i] > 0 ? retained[i] : 0));
  const total = masses.reduce((s, v) => s + v, 0);
  if (retained.length !== sieves.length || total <= 0) return { error: 'Enter the mass retained on at least one sieve.' };
  let cum = 0;
  const rows = sieves.map((s, i) => {
    cum += masses[i];
    const cumR = pct1(cum / total * 100); // 반올림한 누적잔류율 — 통과율을 이 값 기준으로 계산해 두 값의 합이 항상 100 이 되게 한다
    return { label: s.label, mm: s.mm, retained: masses[i], pctRetained: pct1(masses[i] / total * 100), cumRetained: cumR, passing: pct1(100 - cumR) };
  });
  return { total, rows };
}

// FM = 표준 체의 누적잔류율 합 ÷ 100. 시험에 없는 체는: 가장 굵은 체보다 크면 0 %, 가장 가는 체보다 작으면 100 % 잔류로 센다
export function finenessModulus(rows) {
  const present = new Map(rows.filter(r => r.label !== 'pan').map(r => [r.label, r]));
  const mms = [...present.values()].map(r => r.mm);
  const coarsest = Math.max(...mms), finest = Math.min(...mms);
  let sum = 0;
  for (const [label, mm] of Object.entries(FM_SIEVES)) {
    if (present.has(label)) sum += present.get(label).cumRetained;
    else if (mm > coarsest) sum += 0;
    else if (mm < finest) sum += 100;
    else sum += interpolateCum(rows, mm); // 시험에 빠진 중간 체(드묾): 이웃 체 사이를 보간
  }
  return Math.round(sum) / 100;
}
function interpolateCum(rows, mm) {
  const r = rows.filter(x => x.label !== 'pan');
  for (let i = 1; i < r.length; i++) {
    if (r[i - 1].mm > mm && r[i].mm < mm) {
      const t = (Math.log(r[i - 1].mm) - Math.log(mm)) / (Math.log(r[i - 1].mm) - Math.log(r[i].mm));
      return r[i - 1].cumRetained + t * (r[i].cumRetained - r[i - 1].cumRetained);
    }
  }
  return 0;
}

// 체별 통과율을 허용대와 비교. limits 에 없는 체는 ok: null (제한 없음)
export function checkLimits(rows, limits) {
  const checks = rows.filter(r => r.label !== 'pan').map(r => {
    const lim = limits[r.label];
    return lim ? { label: r.label, passing: r.passing, min: lim[0], max: lim[1], ok: r.passing >= lim[0] && r.passing <= lim[1] }
      : { label: r.label, passing: r.passing, min: null, max: null, ok: null };
  });
  return { checks, allOk: checks.every(c => c.ok !== false) };
}

// 한 체를 통과해 다음 체에 남는 최대 비율(45 % 규칙). 맨 위 체와 팬은 제외
export function maxSingleFraction(rows) {
  const inner = rows.slice(1).filter(r => r.label !== 'pan');
  const best = inner.reduce((m, r) => (r.pctRetained > m.pctRetained ? r : m), inner[0]);
  return { label: best.label, pct: best.pctRetained, ok: best.pctRetained <= MAX_SINGLE_FRACTION };
}

// 실무 규칙: NMAS = 통과율 90 % 이상인 가장 작은 체, 최대치수 = 통과율 100 % 인 가장 작은 체
export function nominalMaxSize(rows) {
  const r = rows.filter(x => x.label !== 'pan');
  const nmas = [...r].reverse().find(x => x.passing >= 90);
  const maxSize = [...r].reverse().find(x => x.passing >= 99.95);
  return { nmas: nmas ? nmas.label : null, maxSize: maxSize ? maxSize.label : null };
}

// C136: 체가름 후 질량 합이 원시료 질량과 0.3 % 이내로 맞아야 한다
export function massCheck(total, sampleMass) {
  if (!Number.isFinite(sampleMass) || sampleMass <= 0) return null;
  const diffPct = pct1(Math.abs(sampleMass - total) / sampleMass * 100);
  return { diffPct, ok: diffPct <= 0.3 };
}

export const LIMITS = { mass: [0, 100000] };
export function validate(name, value) {
  const lim = LIMITS[name];
  if (!lim) return 'unknown field';
  if (!Number.isFinite(value)) return 'enter a number';
  if (value < lim[0] || value > lim[1]) return `use ${lim[0]} to ${lim[1].toLocaleString('en-US')}`;
  return '';
}
