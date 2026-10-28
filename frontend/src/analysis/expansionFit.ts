/**
 * Detector del modelo de expansión.
 *
 * IMPORTANTE: la simulación NO usa estas fórmulas. El motor es un modelo SEIR sobre
 * una red de contactos (src/engine/simulator.py). Aquí solo se ajustan tres
 * funciones clásicas a la curva de contagios acumulados que produjo la simulación,
 * para describir con una fórmula simple qué forma tiene la expansión:
 *
 *   Exponencial:  C(t) = a · e^(b·t)                     crece sin freno
 *   Logística:    C(t) = K / (1 + e^(−r·(t − t0)))       curva en S con techo K
 *   Logarítmica:  C(t) = a + b · ln(t + 1)               crece rápido y se frena pronto
 *
 * Se elige la que mejor explica los datos según el R² ajustado (penaliza a la
 * logística por tener un parámetro más). Todo es cálculo descriptivo en el navegador.
 */

export type ModelKind = 'exponential' | 'logistic' | 'logarithmic';

export interface FitResult {
  kind: ModelKind;
  /** Parámetros del ajuste (los que use cada modelo) */
  params: Record<string, number>;
  /** Valor de la curva ajustada en el día t */
  predict: (t: number) => number;
  /** Coeficiente de determinación: 1 = ajuste perfecto */
  r2: number;
  /** R² ajustado por el número de parámetros (para comparar modelos) */
  adjR2: number;
}

export interface ExpansionAnalysis {
  /** Hay muy pocos días o casi no hubo contagios nuevos: no tiene sentido ajustar */
  flat: boolean;
  fits: FitResult[];
  best: FitResult | null;
}

const MIN_POINTS = 4;

/** Regresión lineal y = m·x + c por mínimos cuadrados */
function linearRegression(xs: number[], ys: number[]) {
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  const m = sxx === 0 ? 0 : sxy / sxx;
  return { m, c: my - m * mx };
}

/** R² y R² ajustado de una predicción frente a los datos reales */
function goodness(ts: number[], ys: number[], predict: (t: number) => number, nParams: number) {
  const n = ys.length;
  const mean = ys.reduce((s, v) => s + v, 0) / n;
  let sse = 0;
  let sst = 0;
  for (let i = 0; i < n; i++) {
    sse += (ys[i] - predict(ts[i])) ** 2;
    sst += (ys[i] - mean) ** 2;
  }
  const r2 = sst === 0 ? 0 : 1 - sse / sst;
  const adjR2 = n - nParams - 1 > 0 ? 1 - ((1 - r2) * (n - 1)) / (n - nParams - 1) : r2;
  return { r2, adjR2, sse };
}

/** Exponencial: se linealiza con ln(C) = ln(a) + b·t (solo días con C > 0) */
function fitExponential(ts: number[], ys: number[]): FitResult | null {
  const pts = ts.map((t, i) => [t, ys[i]] as const).filter(([, y]) => y > 0);
  if (pts.length < MIN_POINTS) return null;
  const { m, c } = linearRegression(pts.map(([t]) => t), pts.map(([, y]) => Math.log(y)));
  const a = Math.exp(c);
  const predict = (t: number) => a * Math.exp(m * t);
  return { kind: 'exponential', params: { a, b: m }, predict, ...goodness(ts, ys, predict, 2) };
}

/** Logarítmica: regresión lineal de C frente a ln(t + 1) */
function fitLogarithmic(ts: number[], ys: number[]): FitResult | null {
  if (ts.length < MIN_POINTS) return null;
  const { m, c } = linearRegression(ts.map((t) => Math.log(t + 1)), ys);
  const predict = (t: number) => c + m * Math.log(t + 1);
  return { kind: 'logarithmic', params: { a: c, b: m }, predict, ...goodness(ts, ys, predict, 2) };
}

/**
 * Logística: para cada techo K candidato se linealiza ln(K/C − 1) = −r·t + r·t0 y se
 * queda el K con menor error. K va desde un poco más que el máximo observado hasta
 * `maxK` (la población: nadie puede contagiarse dos veces).
 */
function fitLogistic(ts: number[], ys: number[], maxK: number): FitResult | null {
  const yMax = Math.max(...ys);
  if (ts.length < MIN_POINTS || yMax <= 0) return null;
  const lowK = yMax * 1.001;
  const highK = Math.max(lowK * 1.01, maxK);
  let best: FitResult | null = null;
  const STEPS = 120;
  for (let s = 0; s <= STEPS; s++) {
    // Más candidatos cerca del máximo observado, donde suele estar el techo
    const K = lowK + (highK - lowK) * (s / STEPS) ** 2;
    const pts = ts.map((t, i) => [t, ys[i]] as const).filter(([, y]) => y > 0 && y < K);
    if (pts.length < MIN_POINTS) continue;
    const { m, c } = linearRegression(pts.map(([t]) => t), pts.map(([, y]) => Math.log(K / y - 1)));
    const r = -m;
    if (r <= 0) continue;
    const t0 = c / r;
    const predict = (t: number) => K / (1 + Math.exp(-r * (t - t0)));
    const g = goodness(ts, ys, predict, 3);
    if (!best || g.r2 > best.r2) best = { kind: 'logistic', params: { K, r, t0 }, predict, ...g };
  }
  return best;
}

/**
 * Analiza la curva de contagios acumulados de los días 0..upToDay.
 * @param series contagiados acumulados por día (media de las simulaciones)
 * @param upToDay último día que se usa (para la detección en vivo)
 * @param population tamaño de la población (techo máximo de la logística)
 */
export function analyzeExpansion(series: number[], upToDay: number, population: number): ExpansionAnalysis {
  const last = Math.min(upToDay, series.length - 1);
  const ts = Array.from({ length: last + 1 }, (_, t) => t);
  const ys = ts.map((t) => series[t] ?? 0);
  const growth = Math.max(...ys) - Math.min(...ys);

  // Con menos de 4 días, o si los contagios casi no crecieron (menos de 2 personas), no se ajusta
  if (ts.length < MIN_POINTS || growth < 2) {
    return { flat: true, fits: [], best: null };
  }

  const fits = [fitExponential(ts, ys), fitLogistic(ts, ys, population), fitLogarithmic(ts, ys)].filter(
    (f): f is FitResult => f !== null,
  );
  return { flat: false, fits, best: pickBest(fits) };
}

/** Diferencia de R² ajustado por debajo de la cual dos modelos se consideran empatados */
const TIE_MARGIN = 0.01;

/**
 * Elige el mejor modelo. Si la logística apenas mejora a un modelo de 2 parámetros
 * (menos de TIE_MARGIN), se prefiere el más simple: su techo y su punto de inflexión
 * serían una extrapolación que los datos todavía no muestran.
 */
function pickBest(fits: FitResult[]): FitResult | null {
  if (fits.length === 0) return null;
  const top = fits.reduce((b, f) => (f.adjR2 > b.adjR2 ? f : b));
  if (top.kind !== 'logistic') return top;
  const simpler = fits
    .filter((f) => f.kind !== 'logistic' && top.adjR2 - f.adjR2 < TIE_MARGIN)
    .reduce<FitResult | null>((b, f) => (!b || f.adjR2 > b.adjR2 ? f : b), null);
  return simpler ?? top;
}

/** Días que tarda en duplicarse una curva exponencial (solo si crece) */
export function doublingTime(b: number): number | null {
  return b > 0 ? Math.log(2) / b : null;
}
