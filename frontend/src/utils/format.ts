/**
 * Número en el formato del README y del boletín: miles con espacio y decimales con coma
 * (1 200; 98,3). Se usa un espacio fino (U+202F) para que en la fuente monoespaciada no
 * parezca un hueco.
 */
export function fmt(value: number, decimals = 0): string {
  return value
    .toFixed(decimals)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
