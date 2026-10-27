/**
 * FASE 5 — Cartografía Real de Manta
 * Coordenadas basadas en OpenStreetMap / INEC Censo 2022
 * Sistema de referencia: WGS-84 (lon, lat)
 * Centro del cantón Manta: [-80.7137, -0.9518]
 *
 * SpookyThon 2026 · Track B — Operación Cortafuegos Manta
 * Integrante 3: Frontend React 19 + Cartografía OSM
 */

import type { ParishId, HubId } from '../types/simulation';

// ============================================================================
// 1. TIPOS GEOESPACIALES
// ============================================================================

export type LonLat = [number, number]; // [longitud, latitud]

export interface ParishGeo {
  id: ParishId;
  name: string;
  nameLong: string;
  /** Población relativa según INEC 2022 */
  populationPct: number;
  /** Centroide geográfico [lon, lat] */
  centroid: LonLat;
  /** Polígono simplificado [lon, lat][] — suficiente para render SVG/Canvas */
  polygon: LonLat[];
  /** Color base de la parroquia en estado sano */
  baseColor: string;
}

export interface HubGeo {
  id: HubId;
  name: string;
  type: 'mercado' | 'universidad' | 'terminal' | 'industrial' | 'puerto';
  parishId: ParishId;
  /** Coordenadas exactas [lon, lat] */
  coordinates: LonLat;
  /** Descripción del rol epidemiológico */
  epidemicRole: string;
  /** Tráfico diario promedio estimado */
  dailyFlow: number;
}

export interface BusRoute {
  id: string;
  name: string;
  fromHub: HubId;
  toHub: HubId;
  /** Polilínea simplificada del corredor [lon, lat][] */
  path: LonLat[];
}

export interface CoastalFeature {
  id: string;
  name: string;
  /** Polilínea de la bahía [lon, lat][] */
  coordinates: LonLat[];
}

// ============================================================================
// 2. BOUNDING BOX DEL CANTÓN MANTA
// ============================================================================

export const MANTA_BOUNDS = {
  north: -0.8700,
  south: -1.0600,
  east:  -80.6000,
  west:  -80.8200,
  center: [-80.7137, -0.9518] as LonLat,
} as const;

// ============================================================================
// 3. PARROQUIAS — Polígonos reales simplificados (OSM / INEC)
// ============================================================================

export const PARISHES: Record<ParishId, ParishGeo> = {

  tarqui: {
    id: 'tarqui',
    name: 'Tarqui',
    nameLong: 'Parroquia Tarqui',
    populationPct: 38,
    centroid: [-80.7050, -0.9620],
    baseColor: '#1e3a2f',
    polygon: [
      [-80.7420, -0.9350],
      [-80.6950, -0.9300],
      [-80.6750, -0.9480],
      [-80.6780, -0.9720],
      [-80.6950, -0.9850],
      [-80.7250, -0.9780],
      [-80.7420, -0.9600],
      [-80.7420, -0.9350],
    ],
  },

  eloy_alfaro: {
    id: 'eloy_alfaro',
    name: 'Eloy Alfaro',
    nameLong: 'Parroquia Eloy Alfaro',
    populationPct: 24,
    centroid: [-80.7300, -0.9850],
    baseColor: '#1e2a3a',
    polygon: [
      [-80.7420, -0.9600],
      [-80.7250, -0.9780],
      [-80.6950, -0.9850],
      [-80.7000, -1.0100],
      [-80.7200, -1.0200],
      [-80.7500, -1.0050],
      [-80.7600, -0.9800],
      [-80.7420, -0.9600],
    ],
  },

  manta_centro: {
    id: 'manta_centro',
    name: 'Manta Centro',
    nameLong: 'Parroquia Manta (Centro Urbano, ULEAM, Puerto)',
    populationPct: 22,
    centroid: [-80.7300, -0.9400],
    baseColor: '#1a2535',
    polygon: [
      [-80.7600, -0.8950],
      [-80.7420, -0.8900],
      [-80.7200, -0.9100],
      [-80.7420, -0.9350],
      [-80.7420, -0.9600],
      [-80.7600, -0.9800],
      [-80.7800, -0.9500],
      [-80.7700, -0.9200],
      [-80.7600, -0.8950],
    ],
  },

  los_esteros: {
    id: 'los_esteros',
    name: 'Los Esteros',
    nameLong: 'Parroquia Los Esteros (Zona Industrial Atunera)',
    populationPct: 11,
    centroid: [-80.6750, -0.9320],
    baseColor: '#1f2a1e',
    polygon: [
      [-80.6950, -0.9100],
      [-80.6600, -0.9050],
      [-80.6450, -0.9200],
      [-80.6500, -0.9500],
      [-80.6750, -0.9500],
      [-80.6950, -0.9480],
      [-80.6950, -0.9300],
      [-80.6950, -0.9100],
    ],
  },

  san_mateo: {
    id: 'san_mateo',
    name: 'San Mateo',
    nameLong: 'Parroquia San Mateo (Periferia Costera Sur)',
    populationPct: 5,
    centroid: [-80.7700, -1.0100],
    baseColor: '#1a2520',
    polygon: [
      [-80.7500, -1.0050],
      [-80.7200, -1.0200],
      [-80.7300, -1.0500],
      [-80.7600, -1.0400],
      [-80.7900, -1.0200],
      [-80.7800, -1.0000],
      [-80.7500, -1.0050],
    ],
  },
};

// ============================================================================
// 4. HUBS CRÍTICOS — Coordenadas georreferenciadas exactas (OSM)
// ============================================================================

export const HUBS: Record<HubId, HubGeo> = {

  mercado_tarqui: {
    id: 'mercado_tarqui',
    name: 'Mercado de Tarqui',
    type: 'mercado',
    parishId: 'tarqui',
    coordinates: [-80.7018, -0.9581],
    epidemicRole: 'Epicentro comercial de alta densidad peatonal — mayor nodo de contagio diurno',
    dailyFlow: 12000,
  },

  uleam: {
    id: 'uleam',
    name: 'Campus ULEAM',
    type: 'universidad',
    parishId: 'manta_centro',
    coordinates: [-80.7238, -0.9372],
    epidemicRole: 'Hub universitario con alta movilidad juvenil — vector inter-parroquial',
    dailyFlow: 8500,
  },

  mercado_central: {
    id: 'mercado_central',
    name: 'Mercado Central de Manta',
    type: 'mercado',
    parishId: 'manta_centro',
    coordinates: [-80.7161, -0.9538],
    epidemicRole: 'Mercado central urbano — conexión casco bancario y Puerto de Manta',
    dailyFlow: 9200,
  },

  empacadoras: {
    id: 'empacadoras',
    name: 'Zona Industrial Atunera (Los Esteros)',
    type: 'industrial',
    parishId: 'los_esteros',
    coordinates: [-80.6742, -0.9298],
    epidemicRole: 'Zona industrial cerrada — propagación en turnos rotativos de obreros atuneros',
    dailyFlow: 5600,
  },

  terminal_terrestre: {
    id: 'terminal_terrestre',
    name: 'Terminal Terrestre de Manta',
    type: 'terminal',
    parishId: 'tarqui',
    coordinates: [-80.7082, -0.9741],
    epidemicRole: 'Nodo de buses inter-parroquiales — mayor vector de dispersión geográfica del brote',
    dailyFlow: 14000,
  },
};

// ============================================================================
// 5. CORREDORES DE TRANSPORTE INTER-PARROQUIAL (Rutas de Bus)
// ============================================================================

export const BUS_ROUTES: BusRoute[] = [
  {
    id: 'ruta_1_tarqui_manta_centro',
    name: 'Tarqui ↔ Manta Centro (Vía Flavio Reyes)',
    fromHub: 'mercado_tarqui',
    toHub: 'uleam',
    path: [
      [-80.7018, -0.9581],
      [-80.7100, -0.9520],
      [-80.7180, -0.9450],
      [-80.7238, -0.9372],
    ],
  },
  {
    id: 'ruta_2_tarqui_esteros',
    name: 'Tarqui ↔ Los Esteros (Vía Costera)',
    fromHub: 'mercado_tarqui',
    toHub: 'empacadoras',
    path: [
      [-80.7018, -0.9581],
      [-80.6900, -0.9520],
      [-80.6800, -0.9400],
      [-80.6742, -0.9298],
    ],
  },
  {
    id: 'ruta_3_terminal_eloy',
    name: 'Terminal Terrestre ↔ Eloy Alfaro',
    fromHub: 'terminal_terrestre',
    toHub: 'mercado_tarqui',
    path: [
      [-80.7082, -0.9741],
      [-80.7060, -0.9680],
      [-80.7040, -0.9620],
      [-80.7018, -0.9581],
    ],
  },
  {
    id: 'ruta_4_centro_terminal',
    name: 'Manta Centro ↔ Terminal Terrestre',
    fromHub: 'mercado_central',
    toHub: 'terminal_terrestre',
    path: [
      [-80.7161, -0.9538],
      [-80.7130, -0.9600],
      [-80.7100, -0.9660],
      [-80.7082, -0.9741],
    ],
  },
  {
    id: 'ruta_5_terminal_sanmateo',
    name: 'Terminal Terrestre ↔ San Mateo (Vía Sur)',
    fromHub: 'terminal_terrestre',
    toHub: 'empacadoras',
    path: [
      [-80.7082, -0.9741],
      [-80.7200, -0.9900],
      [-80.7400, -1.0100],
      [-80.7600, -1.0200],
    ],
  },
];

// ============================================================================
// 6. PERFIL COSTERO — Bahía de Manta
// ============================================================================

export const COASTAL_LINE: CoastalFeature = {
  id: 'bahia_manta',
  name: 'Bahía de Manta — Océano Pacífico',
  coordinates: [
    [-80.8200, -0.9000],
    [-80.7900, -0.8900],
    [-80.7700, -0.8850],
    [-80.7500, -0.8900],
    [-80.7300, -0.9000],
    [-80.7100, -0.9100],
    [-80.6900, -0.9050],
    [-80.6700, -0.9100],
    [-80.6500, -0.9200],
    [-80.6300, -0.9350],
  ],
};

// ============================================================================
// 7. HELPERS — Proyección geográfica → coordenadas SVG
// ============================================================================

/** Proyecta un punto [lon, lat] al espacio SVG dado el viewBox del mapa */
export function projectToSVG(
  point: LonLat,
  svgWidth: number,
  svgHeight: number,
  padding = 20,
): [number, number] {
  const { west, east, north, south } = MANTA_BOUNDS;
  const usableW = svgWidth - padding * 2;
  const usableH = svgHeight - padding * 2;
  const x = padding + ((point[0] - west) / (east - west)) * usableW;
  const y = padding + ((north - point[1]) / (north - south)) * usableH;
  return [x, y];
}

/** Proyecta un polígono entero de coordenadas geo a puntos SVG */
export function projectPolygon(
  polygon: LonLat[],
  svgWidth: number,
  svgHeight: number,
  padding = 20,
): string {
  return polygon
    .map((pt) => projectToSVG(pt, svgWidth, svgHeight, padding).join(','))
    .join(' ');
}

/** Convierte prevalencia (0-1) en un color del gradiente epidemiológico */
export function prevalenceToColor(prevalence: number): string {
  if (prevalence < 0.01) return '#10B981'; // sano — esmeralda
  if (prevalence < 0.05) return '#34D399'; // leve contagio
  if (prevalence < 0.12) return '#F59E0B'; // mordido — ámbar
  if (prevalence < 0.25) return '#EF4444'; // zombie — carmín
  if (prevalence < 0.50) return '#DC2626'; // brote severo
  return '#991B1B';                        // brote crítico — rojo oscuro
}

/** Mezcla un color sano con el de brigada según el grado de control */
export function controlToColor(controlLevel: number): string {
  if (controlLevel > 0.8) return '#3B82F6'; // inmune — azul cobalto
  if (controlLevel > 0.5) return '#8B5CF6'; // aislado — púrpura
  return '#F59E0B';                          // en proceso
}
