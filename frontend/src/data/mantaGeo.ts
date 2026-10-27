// ==========================================
// 1. COORDENADAS Y LÍMITES
// ==========================================
export const MANTA_COORDINATES = {
  center: [-0.9538, -80.7189] as [number, number],
  bounds: {
    north: -0.9200,
    south: -1.0200,
    west: -80.8200,
    east: -80.6500,
  },
  defaultZoom: 13,
  minZoom: 12,
  maxZoom: 17,
};

export const MANTA_CENTER: [number, number] = [-0.9538, -80.7189];

// ==========================================
// 2. HUBS CRÍTICOS (SUPER-SPREADERS)
// ==========================================
export interface HubPoint {
  id: string;
  name: string;
  parroquia: string;
  coords: [number, number];
  description: string;
}

export const MANTA_HUBS: HubPoint[] = [
  {
    id: 'tarqui',
    name: 'Mercado de Tarqui',
    parroquia: 'Tarqui',
    coords: [-0.9572, -80.7045],
    description: 'Epicentro comercial minorista y principal nodo de trasbordo de buses',
  },
  {
    id: 'uleam',
    name: 'Universidad ULEAM',
    parroquia: 'Manta Centro',
    coords: [-0.9542, -80.7461],
    description: 'Campus universitario central con alta movilidad estudiantil',
  },
  {
    id: 'terminal',
    name: 'Terminal Terrestre Luis Valdivieso',
    parroquia: 'Tarqui',
    coords: [-0.9701, -80.6865],
    description: 'Punto neurálgico de conexión intercantonal e interprovincial',
  },
  {
    id: 'mercado_central',
    name: 'Mercado Central de Manta',
    parroquia: 'Manta Centro',
    coords: [-0.9485, -80.7258],
    description: 'Centro de abastecimiento con alta densidad peatonal en calles aledañas',
  },
  {
    id: 'empacadoras',
    name: 'Zona Industrial Atunera / Empacadoras',
    parroquia: 'Los Esteros',
    coords: [-0.9620, -80.6890],
    description: 'Plantas industriales de procesamiento pesquero con cuadrillas cerradas',
  },
];

// ==========================================
// 3. POLÍGONOS GEOJSON DE PARROQUIAS
// ==========================================
export const MANTA_PARROQUIAS_GEO = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "tarqui",
        name: "Tarqui",
        weight: 0.38,
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-80.7150, -0.9480],
          [-80.6900, -0.9550],
          [-80.6850, -0.9800],
          [-80.7100, -0.9750],
          [-80.7150, -0.9480],
        ]],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "manta_centro",
        name: "Manta Centro",
        weight: 0.22,
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-80.7400, -0.9350],
          [-80.7150, -0.9480],
          [-80.7200, -0.9700],
          [-80.7450, -0.9550],
          [-80.7400, -0.9350],
        ]],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "los_esteros",
        name: "Los Esteros",
        weight: 0.11,
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-80.6900, -0.9550],
          [-80.6650, -0.9600],
          [-80.6700, -0.9850],
          [-80.6850, -0.9800],
          [-80.6900, -0.9550],
        ]],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "eloy_alfaro",
        name: "Eloy Alfaro",
        weight: 0.24,
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-80.7200, -0.9700],
          [-80.6850, -0.9800],
          [-80.6950, -1.0100],
          [-80.7300, -0.9950],
          [-80.7200, -0.9700],
        ]],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "san_mateo",
        name: "San Mateo / Sur",
        weight: 0.05,
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-80.7900, -0.9500],
          [-80.7450, -0.9550],
          [-80.7500, -1.0100],
          [-80.8000, -0.9900],
          [-80.7900, -0.9500],
        ]],
      },
    },
  ],
};