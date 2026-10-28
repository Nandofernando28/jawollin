import type { FeatureCollection, Polygon } from 'geojson';
import type { HubId, ParishId } from '../types/simulation';

// Identificadores y nombres iguales a los de src/engine/graph_manta.py (fuente de verdad).
// tests/test_frontend_contract.py comprueba que coincidan, que cada hub caiga dentro de
// su parroquia y que las parroquias no se solapen.

// ==========================================
// 1. COORDENADAS Y LÍMITES
// ==========================================
export const MANTA_COORDINATES = {
  center: [-0.9538, -80.7189] as [number, number],
  defaultZoom: 13,
};

// ==========================================
// 2. HUBS CRÍTICOS (SUPER-SPREADERS)
// ==========================================
export interface HubPoint {
  id: HubId;
  name: string;
  parishId: ParishId;
  /** [lat, lon] WGS84, coordenadas de referencia del plan de la Fase 5 */
  coords: [number, number];
  description: string;
}

export const MANTA_HUBS: HubPoint[] = [
  {
    id: 'uleam',
    name: 'ULEAM (Ciudadela Universitaria)',
    parishId: 'manta_centro',
    // Ubicación de la universidad en OpenStreetMap (Calle 12, Abdón Calderón)
    coords: [-0.9526, -80.7454],
    description: 'Campus universitario: estudiantes de todas las parroquias.',
  },
  {
    id: 'mercado_tarqui',
    name: 'Mercado Central de Tarqui',
    parishId: 'tarqui',
    // Sin ubicación confirmada en OpenStreetMap: punto aproximado en el centro comercial de Tarqui
    coords: [-0.9572, -80.7078],
    description: 'Mercado popular de alta densidad comercial.',
  },
  {
    id: 'mercado_central',
    name: 'Mercado Central de Manta',
    parishId: 'manta_centro',
    // Mercado Central Municipal (Avenida 15) en OpenStreetMap
    coords: [-0.9494, -80.7261],
    description: 'Mercado del centro de la ciudad.',
  },
  {
    id: 'empacadoras',
    name: 'Zona Industrial / Empacadoras Los Esteros',
    parishId: 'los_esteros',
    // Junto a la Vía Puerto–Aeropuerto (La Florita), donde OpenStreetMap ubica a la atunera
    // Seafman. El valor del plan (-0.9410, -80.7010) caía unos 800 m dentro de la bahía.
    coords: [-0.9493, -80.6990],
    description: 'Plantas atuneras con turnos laborales cerrados.',
  },
  {
    id: 'terminal_terrestre',
    name: 'Terminal Terrestre Luis Valdivieso Morán',
    parishId: 'eloy_alfaro',
    // Terminal Terrestre en OpenStreetMap (Vía al Palmar, Los Almendros)
    coords: [-0.9597, -80.6902],
    description: 'Terminal de buses: conecta parroquias y cantones.',
  },
];

// ==========================================
// 3. POLÍGONOS GEOJSON DE PARROQUIAS
// ==========================================
// Límites APROXIMADOS (no son los oficiales del INEC): conservan la disposición real
// (San Mateo al oeste costero, Manta Centro en el puerto, Tarqui en el centro-este
// costero, Los Esteros al noreste y Eloy Alfaro al sur) y comparten bordes sin solaparse.
// Coordenadas GeoJSON en orden [lon, lat].

export interface ParishFeatureProps {
  parish_id: ParishId;
  name: string;
  weight: number;
}

export const MANTA_PARROQUIAS_GEO: FeatureCollection<Polygon, ParishFeatureProps> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { parish_id: 'san_mateo', name: 'San Mateo', weight: 0.05 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-80.8000, -0.9350],
          [-80.7600, -0.9320],
          [-80.7600, -0.9750],
          [-80.7600, -0.9950],
          [-80.8000, -0.9850],
          [-80.8000, -0.9350],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { parish_id: 'manta_centro', name: 'Manta Centro', weight: 0.22 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-80.7600, -0.9320],
          [-80.7150, -0.9280],
          [-80.7150, -0.9750],
          [-80.7600, -0.9750],
          [-80.7600, -0.9320],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { parish_id: 'tarqui', name: 'Tarqui', weight: 0.38 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-80.7150, -0.9280],
          [-80.7050, -0.9290],
          [-80.7050, -0.9500],
          [-80.6950, -0.9500],
          [-80.6950, -0.9750],
          [-80.7150, -0.9750],
          [-80.7150, -0.9280],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { parish_id: 'los_esteros', name: 'Los Esteros', weight: 0.11 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-80.7050, -0.9290],
          [-80.6700, -0.9310],
          [-80.6700, -0.9500],
          [-80.6950, -0.9500],
          [-80.7050, -0.9500],
          [-80.7050, -0.9290],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { parish_id: 'eloy_alfaro', name: 'Eloy Alfaro', weight: 0.24 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-80.7600, -0.9750],
          [-80.7150, -0.9750],
          [-80.6950, -0.9750],
          [-80.6950, -0.9500],
          [-80.6700, -0.9500],
          [-80.6650, -0.9900],
          [-80.7000, -1.0000],
          [-80.7600, -0.9950],
          [-80.7600, -0.9750],
        ]],
      },
    },
  ],
};
