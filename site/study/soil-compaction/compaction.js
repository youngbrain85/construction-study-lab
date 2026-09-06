// site/study/soil-compaction/compaction.js — 다짐 관리 계산 (순수 함수, DOM 무관; tools/compaction.test.mjs 가 검사)
// 단위: 단위중량 pcf, 함수비 %.  근거: ASTM D698 (건조단위중량 = 습윤/(1+w)), 영공기간극선 γd = Gs·γw/(1+w·Gs)
export const GAMMA_W = 62.4; // 물의 단위중량, pcf

export function dryDensity(wet, wPct) { return wet / (1 + wPct / 100); }

export function zavDensity(Gs, wPct) { return Gs * GAMMA_W / (1 + (wPct / 100) * Gs); }

// 2차 최소제곱 y = a·x² + b·x + c — 정규방정식을 부분 피벗 가우스 소거로 푼다. 특이하면 null.
export function quadraticFit(xs, ys) {
  const s = [0, 0, 0, 0, 0], t = [0, 0, 0];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i], y = ys[i];
    s[0] += 1; s[1] += x; s[2] += x * x; s[3] += x * x * x; s[4] += x * x * x * x;
    t[0] += y; t[1] += x * y; t[2] += x * x * y;
  }
  const M = [[s[4], s[3], s[2], t[2]], [s[3], s[2], s[1], t[1]], [s[2], s[1], s[0], t[0]]];
  for (let col = 0; col < 3; col++) {
    let p = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(M[r][col]) > Math.abs(M[p][col])) p = r;
    [M[col], M[p]] = [M[p], M[col]];
    if (Math.abs(M[col][col]) < 1e-12) return null;
    for (let r = col + 1; r < 3; r++) {
      const f = M[r][col] / M[col][col];
      for (let k = col; k < 4; k++) M[r][k] -= f * M[col][k];
    }
  }
  const x = [0, 0, 0];
  for (let r = 2; r >= 0; r--) {
    let acc = M[r][3];
    for (let k = r + 1; k < 3; k++) acc -= M[r][k] * x[k];
    x[r] = acc / M[r][r];
  }
  return { a: x[0], b: x[1], c: x[2] };
}

// points: [{ w, wet }] → 건조단위중량을 붙이고 2차 곡선의 봉우리(최적함수비·최대건조단위중량)를 찾는다
export function fitProctor(points) {
  const pts = points
    .filter(p => Number.isFinite(p.w) && Number.isFinite(p.wet))
    .map(p => ({ w: p.w, wet: p.wet, dry: dryDensity(p.wet, p.w) }));
  if (new Set(pts.map(p => p.w)).size < 3) return { points: pts, error: 'Enter at least three points with different water contents.' };
  const fit = quadraticFit(pts.map(p => p.w), pts.map(p => p.dry));
  const wMin = Math.min(...pts.map(p => p.w)), wMax = Math.max(...pts.map(p => p.w));
  const flags = [];
  let wOpt, gdMax;
  if (!fit || fit.a >= 0) { // 봉우리가 없다(점이 계속 오르거나 내린다) → 가장 무거운 점을 쓰고 알린다
    const best = pts.reduce((m, p) => (p.dry > m.dry ? p : m), pts[0]);
    wOpt = best.w; gdMax = best.dry; flags.push('no-peak');
  } else {
    wOpt = -fit.b / (2 * fit.a);
    gdMax = fit.c - (fit.b * fit.b) / (4 * fit.a);
    if (wOpt < wMin || wOpt > wMax) flags.push('outside-range');
  }
  return { points: pts, a: fit ? fit.a : NaN, b: fit ? fit.b : NaN, c: fit ? fit.c : NaN, wOpt, gdMax, wMin, wMax, flags };
}

// 다짐도(%)와 함수비 창 판정. percent 는 소수 1자리로 반올림한 값으로 비교한다(현장 보고서와 같은 방식)
export function evaluate({ gdField, wField, gdMax, wOpt, specPct = 95, lo = -2, hi = 2 }) {
  const percent = Math.round((gdField / gdMax) * 1000) / 10;
  const densityOk = percent >= specPct;
  const tooDry = wField < wOpt + lo, tooWet = wField > wOpt + hi;
  const reasons = [];
  if (!densityOk) reasons.push('density below spec');
  if (tooDry) reasons.push('too dry');
  if (tooWet) reasons.push('too wet');
  return { percent, densityOk, moistureOk: !tooDry && !tooWet, pass: densityOk && !tooDry && !tooWet, reasons };
}

// 입력 한계(화면 검증용). 이름: w(함수비 %), wet(습윤 pcf), gd(현장 건조 pcf), Gs, spec(다짐도 %), window(함수비 창 %)
export const LIMITS = { w: [0, 40], wet: [60, 160], gd: [60, 160], Gs: [2.4, 3.0], spec: [80, 105], window: [-10, 10] };
export function validate(name, value) {
  const [lo, hi] = LIMITS[name];
  if (!Number.isFinite(value)) return 'enter a number';
  if (value < lo || value > hi) return `use ${lo} to ${hi}`;
  return '';
}
