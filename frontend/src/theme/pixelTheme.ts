/**
 * Constantes visuales del tema pixel para Recharts y Leaflet, que necesitan los
 * colores como valores de JavaScript (no pueden leer clases CSS). Son los mismos
 * tonos que la paleta de src/index.css. Solo diseño: no contiene lógica.
 */

/** Colores de materiales usados en los datos */
export const MATERIAL = {
  grass: '#4f8f2f',
  grassLight: '#7cc24a',
  dirt: '#8b5a2b',
  wood: '#9c6b37',
  stone: '#8b8b8b',
  redstone: '#c0281e',
  gold: '#e2b32a',
  diamond: '#2fb8c6',
  lapis: '#2a4ea8',
  amethyst: '#8a4fc3',
  ink: '#2b2b2b',
  titleGold: '#f8f800',
} as const;

/** Color de cada estrategia en gráficas y leyendas */
export const STRATEGY_COLOR = {
  shield: MATERIAL.diamond,
  random: MATERIAL.gold,
  none: MATERIAL.redstone,
} as const;

/**
 * Color de cada estado SEIR, igual en el mapa en vivo, los KPI y las gráficas:
 * verde Sano, amarillo Mordido, rojo Zombie, morado Aislado y azul Exorcizado.
 */
export const STATE_COLOR = {
  sano: MATERIAL.grass,
  mordido: MATERIAL.gold,
  zombie: MATERIAL.redstone,
  aislado: MATERIAL.amethyst,
  inmune: '#4a8fe7', // azul: se lee con 5:1 sobre las casillas oscuras
} as const;

/** Nombre completo de cada estado, el mismo en todas las pantallas */
export const STATE_LABEL = {
  sano: 'Sano (susceptible)',
  mordido: 'Mordido (expuesto)',
  zombie: 'Zombie (infeccioso)',
  aislado: 'Aislado (por brigada)',
  inmune: 'Exorcizado (inmune)',
} as const;

/** Tipografías pixel */
export const FONT_PIXEL = '"Press Start 2P", ui-monospace, monospace';
export const FONT_RETRO = '"VT323", ui-monospace, monospace';

/** Estilo de los ejes de Recharts: texto pixel claro sobre la casilla oscura */
export const AXIS_TICK = { fontFamily: FONT_PIXEL, fontSize: 8, fill: '#d8d8d8' } as const;
export const AXIS_LINE = { stroke: '#8b8b8b', strokeWidth: 2 } as const;
export const GRID_STROKE = '#3a3a3a';
