/**
 * pixelTheme.ts — Constantes visuales para Recharts y Leaflet.
 *
 * Referencia oficial de diseño: Rules/Desing_MC.md
 * - §2.1 Núcleo (Core): grises cálidos (#171615, #262423, #3d3938, #6b6562, #d0c5c0)
 * - §2.2 Verde Vanilla: green-3 #6cc349, green-5 #3c8527
 * - §2.3 Paletas por tema: Marketplace gold-3 #ffc42b, Realms #8d68e0, Legends cian #2fb8c6
 * - §2.4 Semánticos: warning #ca3636, focus #1157be
 * - §3.1 Tipografías: pixel display y retro con respaldo sans-serif
 */

/** Colores de materiales basados en Rules/Desing_MC.md §2 */
export const MATERIAL = {
  grass: '#3c8527',       // Rules/Desing_MC.md §2.2: green-5
  grassLight: '#6cc349',  // Rules/Desing_MC.md §2.2: green-3
  dirt: '#805539',        // Rules/Desing_MC.md §2.3: marrón Vanilla
  wood: '#976746',        // Rules/Desing_MC.md §2.3: marrón tierra
  stone: '#6b6562',       // Rules/Desing_MC.md §2.1: core-grey-4
  redstone: '#ca3636',    // Rules/Desing_MC.md §2.4: default-warning
  gold: '#ffc42b',        // Rules/Desing_MC.md §2.3: marketplace gold-3
  diamond: '#2fb8c6',     // Rules/Desing_MC.md §2.3: cian Dungeons/Legends
  lapis: '#1157be',       // Rules/Desing_MC.md §2.4: default-focus / blue
  amethyst: '#8d68e0',    // Rules/Desing_MC.md §2.3: realms deep blue
  ink: '#171615',         // Rules/Desing_MC.md §2.1: core-off-black
  titleGold: '#fff27a',    // Rules/Desing_MC.md §2.3: gold-1
} as const;

/** Color de cada estrategia en gráficas y leyendas (Rules/Desing_MC.md §2.3 y §2.4) */
export const STRATEGY_COLOR = {
  shield: MATERIAL.diamond,
  random: MATERIAL.gold,
  none: MATERIAL.redstone,
} as const;

/**
 * Color de cada estado SEIR (Rules/Desing_MC.md §2.2, §2.3 y §2.4):
 * verde Sano (green-5), amarillo Mordido (gold-3), rojo Zombie (warning),
 * morado Aislado (realms deep blue) y azul Exorcizado (legends light-blue).
 */
export const STATE_COLOR = {
  sano: MATERIAL.grass,
  mordido: MATERIAL.gold,
  zombie: MATERIAL.redstone,
  aislado: MATERIAL.amethyst,
  inmune: '#39b9eb', // Rules/Desing_MC.md §2.3: Legends light-blue-5
} as const;

/** Nombre completo de cada estado, el mismo en todas las pantallas */
export const STATE_LABEL = {
  sano: 'Sano (susceptible)',
  mordido: 'Mordido (expuesto)',
  zombie: 'Zombie (infeccioso)',
  aislado: 'Aislado (por brigada)',
  inmune: 'Exorcizado (inmune)',
} as const;

/** Tipografías pixel (Rules/Desing_MC.md §3.1) */
export const FONT_PIXEL = '"Press Start 2P", ui-monospace, monospace';
export const FONT_RETRO = '"Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif';

/** Estilo de los ejes de Recharts (Rules/Desing_MC.md §2.1 y §3.1) */
export const AXIS_TICK = { fontFamily: FONT_PIXEL, fontSize: 8, fill: '#d0c5c0' } as const; // core-grey-2
export const AXIS_LINE = { stroke: '#6b6562', strokeWidth: 2 } as const;                    // core-grey-4
export const GRID_STROKE = '#3d3938';                                                        // core-grey-5
