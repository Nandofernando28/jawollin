/**
 * Estado del virus en un día, en una palabra: Fuerte, Estable, Debilitándose o Controlado.
 *
 * La plaga no muta en el modelo (su contagio β es constante): lo que se mide es la
 * VELOCIDAD de expansión. Se comparan los contagios nuevos de los últimos días con los
 * de los días anteriores, a partir de la curva de contagiados acumulados que ya
 * calculó la simulación. Es solo una lectura descriptiva para la interfaz.
 */

export type VirusLevel = 'outbreak' | 'strong' | 'stable' | 'weakening' | 'controlled';

export interface VirusStatus {
  level: VirusLevel;
  label: string;
  detail: string;
  /** Contagios nuevos en la ventana reciente (media de las simulaciones) */
  recentNew: number;
}

/** Días de cada ventana que se comparan (unos 3 días: algo menos que un ciclo de contagio) */
const WINDOW = 3;
/** Por debajo de esta cifra de contagios nuevos en la ventana, se considera controlado */
const CONTROLLED_BELOW = 1;
/** Cambio relativo a partir del cual se habla de aceleración o de freno */
const CHANGE = 0.15;

const sumNew = (cum: number[], from: number, to: number) => {
  let total = 0;
  for (let t = Math.max(1, from); t <= to; t++) total += Math.max(0, (cum[t] ?? 0) - (cum[t - 1] ?? 0));
  return total;
};

/**
 * @param cumulative contagiados acumulados por día (media de las simulaciones)
 * @param day día que se está mirando
 */
export function virusStatus(cumulative: number[], day: number): VirusStatus {
  const d = Math.min(day, cumulative.length - 1);
  const recent = sumNew(cumulative, d - WINDOW + 1, d);
  const previous = sumNew(cumulative, d - 2 * WINDOW + 1, d - WINDOW);

  if (d < WINDOW) {
    return { level: 'outbreak', label: 'Brote inicial', detail: 'los primeros mordidos aún están incubando', recentNew: recent };
  }
  if (recent < CONTROLLED_BELOW) {
    return { level: 'controlled', label: 'Controlado', detail: 'casi no hay contagios nuevos', recentNew: recent };
  }
  if (previous < CONTROLLED_BELOW || recent > previous * (1 + CHANGE)) {
    return { level: 'strong', label: 'Fuerte', detail: 'se expande con rapidez', recentNew: recent };
  }
  if (recent < previous * (1 - CHANGE)) {
    return { level: 'weakening', label: 'Debilitándose', detail: 'la expansión se frena', recentNew: recent };
  }
  return { level: 'stable', label: 'Estable', detail: 'se expande a ritmo constante', recentNew: recent };
}
