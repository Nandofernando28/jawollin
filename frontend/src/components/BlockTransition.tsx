/**
 * BlockTransition.tsx — Transición visual entre pantallas.
 *
 * Referencia oficial de diseño: Rules/Desing_MC.md
 * - §7.2 Animaciones y shaders de pantalla completa
 * - §7.3 Reglas de movimiento: duraciones controladas y sincronización visual
 * - §8 Accesibilidad: detección y respeto estricto de prefers-reduced-motion: reduce
 *
 * Implementa el efecto Dither (Ordered Dithering WebGL con matriz de Bayer 4x4)
 * de Interlude (Codrops / Crnacura).
 */
export { DitherTransition as BlockTransition } from './DitherTransition';
