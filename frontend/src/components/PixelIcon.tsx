/**
 * Iconos pixel art ORIGINALES de 8×8 píxeles, dibujados con texto.
 *
 * Cada icono es una lista de 8 filas de 8 caracteres; cada carácter es un color
 * de la tabla PALETTE y "." es transparente. La letra "K" usa `currentColor`, así
 * que los iconos monocromos (play, pausa, cerrar...) toman el color del texto.
 *
 * `PixelIcon` dibuja el icono como SVG en React y `pixelIconHtml` devuelve el mismo
 * SVG como texto, para los marcadores `L.divIcon` de Leaflet.
 */
import React from 'react';

const PALETTE: Record<string, string> = {
  K: 'currentColor', // contorno o color del texto
  k: '#1b1b1b', // negro fijo
  w: '#f4f4f4', // blanco
  i: '#d8d8d8', // hierro
  s: '#8b8b8b', // piedra
  y: '#f8f800', // amarillo
  o: '#f08a24', // naranja
  r: '#c0281e', // rojo redstone
  R: '#e8463a', // rojo claro
  b: '#8b5a2b', // tierra o madera
  B: '#5e3b1a', // madera oscura
  g: '#4f8f2f', // pasto
  G: '#7cc24a', // pasto claro
  z: '#5aa04a', // piel verde
  d: '#3a6e2c', // verde oscuro
  c: '#2fb8c6', // diamante
  C: '#b9f3f8', // brillo de diamante
  D: '#0f6f78', // diamante oscuro
  m: '#2a96a3', // diamante medio
  L: '#2a4ea8', // lapislázuli
  u: '#e2b32a', // oro
  U: '#fff07a', // brillo de oro
  n: '#a5781a', // oro oscuro
  p: '#8a4fc3', // amatista
};

const ICONS = {
  torch: ['...yy...', '..yooy..', '..orro..', '...bb...', '...bb...', '...bb...', '...bB...', '...BB...'],
  diamondBlock: ['DDDDDDDD', 'DCCcccmD', 'DCcccmmD', 'DccCccmD', 'DcCCccmD', 'DcccmcmD', 'DmmmmmmD', 'DDDDDDDD'],
  bed: ['........', '........', 'ww......', 'wwrrrrrr', 'rrRrrrrr', 'bbbbbbbb', 'B......B', '........'],
  shield: ['kkkkkkkk', 'kiiiiiik', 'kiLLLLik', 'kiLLLLik', 'kiLLLLik', '.kiLLik.', '..kiik..', '...kk...'],
  coin: ['..kkkk..', '.kUUuuk.', 'kUUuuunk', 'kUuuuuuk', 'kuuuuuuk', 'kuuuuunk', '.kuunnk.', '..kkkk..'],
  zombie: ['dddddddd', 'zzzzzzzz', 'zdzzzzdz', 'zkkzzkkz', 'zzzzzzzz', 'zzzddzzz', 'zdkkkkdz', 'zzzzzzzz'],
  grassBlock: ['gGgggGgg', 'gggGgggg', 'bgbbgbbb', 'bbbbbbbb', 'bbBbbbbb', 'bbbbbBbb', 'bBbbbbbb', 'bbbbbbbb'],
  dice: ['kkkkkkkk', 'kwwwwwwk', 'kwkwwwwk', 'kwwwwwwk', 'kwwwwwwk', 'kwwwwkwk', 'kwwwwwwk', 'kkkkkkkk'],
  barrier: ['..rrrr..', '.r....r.', 'r....r.r', 'r...r..r', 'r..r...r', 'r.r....r', '.r....r.', '..rrrr..'],
  hourglass: ['BBBBBBBB', '.kyyyyk.', '..kyyk..', '...kk...', '...kk...', '..kyyk..', '.kyyyyk.', 'BBBBBBBB'],
  book: ['.kkkkkk.', 'kbbbbbbk', 'kbuuuubk', 'kbbbbbbk', 'kbbbbbbk', 'kbbbbbbk', 'kwwwwwwk', '.kkkkkk.'],
  heart: ['.rr..rr.', 'rRRrrRRr', 'rRrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..', '...rr...', '........'],
  map: ['kkkkkkkk', 'kwwwwgwk', 'kwgwggwk', 'kwggwwwk', 'kwwwwcck', 'kgwwwcck', 'kwwgwwwk', 'kkkkkkkk'],
  gear: ['...KK...', '.K.KK.K.', '..KKKK..', 'KKK..KKK', 'KKK..KKK', '..KKKK..', '.K.KK.K.', '...KK...'],
  reset: ['..KKKK..', '.K....KK', 'K....KKK', 'K.......', 'K......K', 'K......K', '.K....K.', '..KKKK..'],
  play: ['.K......', '.KK.....', '.KKK....', '.KKKK...', '.KKKK...', '.KKK....', '.KK.....', '.K......'],
  pause: ['.KK..KK.', '.KK..KK.', '.KK..KK.', '.KK..KK.', '.KK..KK.', '.KK..KK.', '.KK..KK.', '.KK..KK.'],
  help: ['..KKKK..', '.KK..KK.', '.....KK.', '....KK..', '...KK...', '...KK...', '........', '...KK...'],
  check: ['........', '.......K', '......KK', 'K....KK.', 'KK..KK..', '.KKKK...', '..KK....', '........'],
  warning: ['...rr...', '...rr...', '...rr...', '...rr...', '...rr...', '........', '...rr...', '...rr...'],
  close: ['KK....KK', '.KK..KK.', '..KKKK..', '...KK...', '..KKKK..', '.KK..KK.', 'KK....KK', '........'],
  download: ['...KK...', '...KK...', '...KK...', '.KKKKKK.', '..KKKK..', '...KK...', 'K......K', 'KKKKKKKK'],
  copy: ['KKKKK...', 'KwwwK...', 'KwKKKKK.', 'KwKwwwK.', 'KKKwwwK.', '..KwwwK.', '..KKKKK.', '........'],
  printer: ['..KKKK..', '..KwwK..', 'KKKKKKKK', 'KssssssK', 'KssssgsK', 'KKKKKKKK', '..KwwK..', '..KKKK..'],
  database: ['.KKKKKK.', 'KccccccK', '.KKKKKK.', 'KccccccK', '.KKKKKK.', 'KccccccK', '.KKKKKK.', '........'],
  pin: ['..kkkk..', '.krRRrk.', '.kRrrrk.', '.krrrrk.', '..krrk..', '..krrk..', '...kk...', '...kk...'],
  pickaxe: ['.ccccc..', 'c....cB.', '....Bc..', '...B..c.', '..B.....', '.B......', 'B.......', '........'],
} as const;

export type PixelIconName = keyof typeof ICONS;

/** Convierte el dibujo en rectángulos SVG de 1×1 (agrupa píxeles seguidos del mismo color) */
function iconRects(name: PixelIconName) {
  const rects: { x: number; y: number; w: number; fill: string }[] = [];
  ICONS[name].forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      rects.push({ x, y, w, fill: PALETTE[ch] ?? 'currentColor' });
      x += w;
    }
  });
  return rects;
}

interface PixelIconProps {
  name: PixelIconName;
  /** Tamaño en px; usar múltiplos de 8 para que los píxeles queden nítidos */
  size?: number;
  /** Texto para lectores de pantalla; sin él, el icono es decorativo */
  title?: string;
  className?: string;
}

export function PixelIcon({ name, size = 16, title, className }: PixelIconProps) {
  return (
    <svg
      viewBox="0 0 8 8"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ flexShrink: 0 }}
    >
      {title && <title>{title}</title>}
      {iconRects(name).map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}

/** El mismo icono como texto SVG, para `L.divIcon({ html })` de Leaflet */
export function pixelIconHtml(name: PixelIconName, size = 16, color = '#1b1b1b'): string {
  const rects = iconRects(name)
    .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1" fill="${r.fill}"/>`)
    .join('');
  return `<svg viewBox="0 0 8 8" width="${size}" height="${size}" shape-rendering="crispEdges" style="color:${color};display:block" aria-hidden="true">${rects}</svg>`;
}
