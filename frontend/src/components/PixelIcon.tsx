/**
 * PixelIcon.tsx — Iconos pixel art vectoriales de 8×8 en SVG puro.
 *
 * Referencia oficial de diseño: Rules/Desing_MC.md
 * - §1 Principios: cero redondeo, estética de bloque ortogonal
 * - §2 Color: tokens exactos de Vanilla Green, Marketplace Gold, grises del núcleo y semánticos
 * - §6 Decoración: glifos sobre cuadrícula pixel con renderizado nítido (shape-rendering="crispEdges")
 */
import React from 'react';

const PALETTE: Record<string, string> = {
  K: 'currentColor', // contorno dinámico
  k: '#171615', // Rules/Desing_MC.md §2.1: --mc-core-off-black
  w: '#ffffff', // Rules/Desing_MC.md §2.1: --mc-core-white
  i: '#d0c5c0', // Rules/Desing_MC.md §2.1: --mc-core-grey-2 (hierro)
  s: '#aba09c', // Rules/Desing_MC.md §2.1: --mc-core-grey-3 (piedra)
  y: '#fff27a', // Rules/Desing_MC.md §2.3: gold-1
  o: '#ffa41f', // Rules/Desing_MC.md §2.3: orange-4
  r: '#ca3636', // Rules/Desing_MC.md §2.4: --mc-default-warning
  R: '#ff605e', // Rules/Desing_MC.md §2.4: --mc-default-warning-2
  b: '#805539', // Rules/Desing_MC.md §2.3: marrón Vanilla
  B: '#492d1f', // Rules/Desing_MC.md §2.3: marrón ultra oscuro
  g: '#3c8527', // Rules/Desing_MC.md §2.2: green-5
  G: '#6cc349', // Rules/Desing_MC.md §2.2: green-3
  z: '#52a535', // Rules/Desing_MC.md §2.2: green-4
  d: '#2a641c', // Rules/Desing_MC.md §2.2: green-6
  c: '#2fb8c6', // Rules/Desing_MC.md §2.3: cian Dungeons/Legends
  C: '#acf2ff', // Rules/Desing_MC.md §2.3: cian claro Legends
  D: '#013565', // Rules/Desing_MC.md §2.3: azul oscuro
  m: '#146f95', // Rules/Desing_MC.md §2.3: azul medio
  L: '#1157be', // Rules/Desing_MC.md §2.4: --mc-default-focus
  u: '#ffc42b', // Rules/Desing_MC.md §2.3: marketplace gold-3
  U: '#fff27a', // Rules/Desing_MC.md §2.3: gold-1
  n: '#db9f21', // Rules/Desing_MC.md §2.3: gold-4
  p: '#8d68e0', // Rules/Desing_MC.md §2.3: realms deep blue
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
  expand: ['KKK..KKK', 'K......K', 'K......K', '........', '........', 'K......K', 'K......K', 'KKK..KKK'],
  compress: ['..K..K..', '..K..K..', 'KKK..KKK', '........', '........', 'KKK..KKK', '..K..K..', '..K..K..'],
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
export function pixelIconHtml(name: PixelIconName, size = 16, color = '#171615'): string {
  const rects = iconRects(name)
    .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1" fill="${r.fill}"/>`)
    .join('');
  return `<svg viewBox="0 0 8 8" width="${size}" height="${size}" shape-rendering="crispEdges" style="color:${color};display:block" aria-hidden="true">${rects}</svg>`;
}
