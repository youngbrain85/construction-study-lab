// site/study/concrete-cylinders/cylinders.js — 공시체 강도·합격 판정·재령 곡선 계산 (순수 함수, DOM 무관)
// 근거: ASTM C39 (강도 = 하중/단면적, 10 psi 단위 보고), ACI 318-19 §26.12.3 (합격 기준 a·b), ACI 209R-92 식 (2-1)
export const AREA = { '6x12': Math.PI * 36 / 4, '4x8': Math.PI * 16 / 4 }; // in²
export const RANGE_LIMIT = { '6x12': 6.6, '4x8': 9.0 }; // 같은 시료 공시체 간 허용 범위(평균의 %), C39 정밀도 문단(대략값)
export const AGE_COEFF = { typeI: { a: 4.0, b: 0.85 }, typeIII: { a: 2.3, b: 0.92 } }; // ACI 209R-92, 습윤 양생

export function round10(v) { return Math.round(v / 10) * 10; }
export function strength(loadLbf, size) { return round10(loadLbf / AREA[size]); }
export function testAverage(strengths) { return round10(strengths.reduce((s, v) => s + v, 0) / strengths.length); }
export function withinTestRange(strengths) {
  const avg = strengths.reduce((s, v) => s + v, 0) / strengths.length;
  return (Math.max(...strengths) - Math.min(...strengths)) / avg * 100;
}

const fmt = n => n.toLocaleString('en-US');

// tests: [{ id, strengths:[psi…], size? }] (size 는 편차 한계용; 생략 시 '6x12') → 시험별 평균, 기준 (b), 3연속 평균, 기준 (a), 전체 판정
export function evaluateTests(tests, fc, size = '6x12') {
  const valid = tests.filter(t => Array.isArray(t.strengths) && t.strengths.length > 0 && t.strengths.every(Number.isFinite));
  if (!valid.length) return { error: 'Enter at least one strength test.', tests: [], reasons: [] };
  const limitB = fc - (fc <= 5000 ? 500 : Math.round(0.10 * fc)); // 기준 (b): f'c − 500 psi (f'c ≤ 5,000) 또는 0.90 f'c
  const reasons = [];
  const rows = valid.map((t, i) => {
    const avg = testAverage(t.strengths);
    const okB = avg >= limitB;
    if (!okB) reasons.push(`Test ${t.id}: ${fmt(avg)} psi is more than ${fc <= 5000 ? '500 psi' : '10 %'} below f'c (criterion b).`);
    const rangePct = withinTestRange(t.strengths);
    return { id: t.id, avg, okB, avg3: null, okA: null, rangePct, rangeWide: rangePct > RANGE_LIMIT[t.size || size] };
  });
  for (let i = 2; i < rows.length; i++) { // 기준 (a): 임의의 연속 3회 평균 ≥ f'c(10 psi 단위로 보고)
    const ids = [rows[i - 2].id, rows[i - 1].id, rows[i].id];
    rows[i].avg3 = round10((rows[i - 2].avg + rows[i - 1].avg + rows[i].avg) / 3);
    rows[i].okA = rows[i].avg3 >= fc;
    if (!rows[i].okA) {
      // 시험 번호가 연속(id 간격 2)일 때만 en-dash 범위로 쓰고, 중간이 빈 경우(예: 3번 결측)에는 나열한다
      const label = ids[2] - ids[0] === 2 ? `Tests ${ids[0]}–${ids[2]}` : `Tests ${ids.join(', ')}`;
      reasons.push(`${label}: average ${fmt(rows[i].avg3)} psi is below f'c = ${fmt(fc)} psi (criterion a).`);
    }
  }
  return { limitB, tests: rows, pass: reasons.length === 0, reasons };
}

// ACI 209R-92 식 (2-1) f(t) = f28 · t/(a + b·t) 를 28일에서 정확히 1이 되도록 정규화한 비율
export function ageRatio(t, coeff) { return (t / (coeff.a + coeff.b * t)) / (28 / (coeff.a + 28 * coeff.b)); }
export function ageCurve(f28, coeff, days = [1, 3, 7, 14, 28, 56, 90]) { return days.map(t => ({ t, f: round10(f28 * ageRatio(t, coeff)) })); }

// 입력 한계(화면 검증용)
export const LIMITS = { load: [1000, 1000000], fc: [2000, 12000], f28: [500, 20000] };
export function validate(name, value) {
  const lim = LIMITS[name];
  if (!lim) return 'unknown field';
  if (!Number.isFinite(value)) return 'enter a number';
  if (value < lim[0] || value > lim[1]) return `use ${fmt(lim[0])} to ${fmt(lim[1])}`;
  return '';
}
