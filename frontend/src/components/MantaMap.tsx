import React, { useEffect, useMemo, useRef } from 'react';
import { Circle, GeoJSON, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MANTA_COORDINATES, MANTA_HUBS, MANTA_PARROQUIAS_GEO, type ParishFeatureProps } from '../data/mantaGeo';
import type { Feature, Geometry } from 'geojson';
import type { HubId, ParishId } from '../types/simulation';
import { PixelIcon, pixelIconHtml, type PixelIconName } from './PixelIcon';
import { MATERIAL } from '../theme/pixelTheme';

// ── Configuración de tiles de CARTO con Fallback Infalible ─────────────────────
// Los marcadores son divIcon propios (sin iconos de Leaflet).
// Tema pixel: mosaicos claros ("voyager") a los que index.css aplica un tono de
// pergamino (.mc-paper-map), para que el mapa parezca un mapa de papel.
const DEFAULT_CARTO_KEY = 'cb1_4wbd_1_65f9d0e2dc755e74c2198851';
const CARTO_KEY = (import.meta.env.VITE_CARTO_API_KEY || DEFAULT_CARTO_KEY).trim();
const CARTO_STYLE = (import.meta.env.VITE_CARTO_STYLE || 'voyager').trim();

const TILE_URL = CARTO_KEY
  ? `https://{s}.basemaps.cartocdn.com/rastertiles/${CARTO_STYLE}/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`
  : `https://tile.openstreetmap.org/{z}/{x}/{y}.png`;

interface MantaMapProps {
  result?: { params: { days: number } };
  currentDay?: number;
  playing?: boolean;
  playbackSpeed?: 1 | 2 | 5;
  /** Hubs con cortafuegos (cierre o fumigación) activo en el día mostrado */
  firewallHubs?: HubId[];
  /** Hubs con vacunación en anillo de sus asistentes en el día mostrado */
  ringVaccinationHubs?: HubId[];
  /** Casos activos (Mordidos + Zombies) entre los asistentes de cada hub */
  hubCases?: Partial<Record<HubId, number>>;
  /** % de la parroquia con infección activa (Mordidos + Zombies) */
  prevalenceByParish?: Partial<Record<ParishId, number>>;
  onDayChange?: (d: number) => void;
  onTogglePlay?: () => void;
  onResetDay?: () => void;
  onSpeedChange?: (s: 1 | 2 | 5) => void;
}

// Tramos de color por % de la parroquia con infección activa. Los umbrales son los
// oficiales de la Fase 6; el tema pixel solo cambia los colores por materiales.
const PREVALENCE_LEVELS = [
  { max: 2, color: MATERIAL.grass, label: 'Menos de 2%' },
  { max: 10, color: MATERIAL.gold, label: 'De 2% a 10%' },
  { max: Infinity, color: MATERIAL.redstone, label: 'Más de 10%' },
];

const prevalenceColor = (pct: number) =>
  (PREVALENCE_LEVELS.find((l) => pct < l.max) ?? PREVALENCE_LEVELS[PREVALENCE_LEVELS.length - 1]).color;

type HubStatus = 'firewall' | 'ring' | 'open';

const HUB_STATUS_LABEL: Record<HubStatus, string> = {
  firewall: 'Cortafuegos activo',
  ring: 'Vacunación en anillo hoy',
  open: 'Abierto',
};

// Icono pixel y color de cada estado: antorcha encendida (abierto), escudo
// (cortafuegos) y bloque de diamante (vacunación en anillo)
const HUB_STATUS_ICON: Record<HubStatus, PixelIconName> = {
  firewall: 'shield',
  ring: 'diamondBlock',
  open: 'torch',
};

const HUB_STATUS_COLOR: Record<HubStatus, string> = {
  firewall: MATERIAL.lapis,
  ring: MATERIAL.diamond,
  open: MATERIAL.redstone,
};

// Marcador como una casilla de inventario con el icono pixel dentro
const buildHubIcon = (status: HubStatus) => {
  const color = HUB_STATUS_COLOR[status];
  const html = `
    <span style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:#c6c6c6;border:3px solid;border-color:#ffffff #555555 #555555 #ffffff;box-shadow:0 0 0 2px #000000,0 0 0 4px ${color};">
      ${pixelIconHtml(HUB_STATUS_ICON[status], 24)}
    </span>
  `;

  return L.divIcon({
    className: 'hub-pin',
    html,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  });
};

export const MantaMap: React.FC<MantaMapProps> = ({
  result,
  currentDay = 1,
  playing = false,
  playbackSpeed = 1,
  firewallHubs = [],
  ringVaccinationHubs = [],
  hubCases = {},
  prevalenceByParish = {},
  onDayChange,
  onTogglePlay,
  onResetDay,
  onSpeedChange,
}) => {
  const maxDay = result?.params?.days ?? 30;
  const mapRef = useRef<L.Map | null>(null);
  const dayPercent = (currentDay / maxDay) * 100;

  // Recalcula el tamaño del mapa al montarse y al cambiar de día o de reproducción
  useEffect(() => {
    if (!mapRef.current) return;

    const frame = window.setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 0);

    return () => window.clearTimeout(frame);
  }, [currentDay, playing]);

  const parishStyle = useMemo(
    () => (feature?: Feature<Geometry, ParishFeatureProps>) => ({
      fillColor: prevalenceColor(feature ? prevalenceByParish[feature.properties.parish_id] ?? 0 : 0),
      weight: 3,
      opacity: 1,
      color: '#1b1b1b',
      dashArray: '8 4',
      lineCap: 'square' as const,
      lineJoin: 'miter' as const,
      fillOpacity: 0.38,
    }),
    [prevalenceByParish],
  );

  const hubStatus = (id: HubId): HubStatus =>
    firewallHubs.includes(id) ? 'firewall' : ringVaccinationHubs.includes(id) ? 'ring' : 'open';

  return (
    <div className="mc-frame-wood mc-paper-map relative z-10 isolate h-[650px] w-full overflow-hidden">
      <div className="mc-panel absolute left-3 top-3 z-20 w-[min(calc(100%-24px),300px)] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="mc-slot flex h-10 w-10 items-center justify-center">
              <PixelIcon name="hourglass" size={24} />
            </div>
            <div>
              <p className="mc-label text-mc-muted">Timeline</p>
              <p className="font-pixel mt-1 text-[12px] text-mc-ink">Día {currentDay}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePlay}
              className="mc-button mc-button-icon"
              aria-label={playing ? 'Pausar reproducción' : 'Reproducir'}
            >
              {playing ? <PixelIcon name="pause" size={16} /> : <PixelIcon name="play" size={16} />}
            </button>
            <button
              onClick={onResetDay}
              className="mc-button mc-button-icon"
              aria-label="Reiniciar día"
            >
              <PixelIcon name="reset" size={16} />
            </button>
          </div>
        </div>

        <div className="mt-4">
          <input
            type="range"
            min={0}
            max={maxDay}
            step={1}
            value={currentDay}
            onChange={(e) => onDayChange?.(Number(e.target.value))}
            className="w-full cursor-pointer appearance-none"
            style={{
              background: `linear-gradient(to right, ${MATERIAL.grass} 0%, ${MATERIAL.grass} ${dayPercent}%, #373737 ${dayPercent}%, #373737 100%)`,
            }}
            aria-label="Control de días"
          />
          <div className="mt-2 flex items-center justify-between text-[18px] text-mc-muted">
            <span>0</span>
            <span>{maxDay} días</span>
          </div>
        </div>

        <div className="mt-2 flex gap-2">
          {[1, 2, 5].map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange?.(speed as 1 | 2 | 5)}
              className={`mc-button mc-button-sm ${playbackSpeed === speed ? 'is-active' : ''}`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <MapContainer
        key="manta-leaflet-map"
        center={MANTA_COORDINATES.center}
        zoom={MANTA_COORDINATES.defaultZoom}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
        ref={(instance) => {
          mapRef.current = instance ?? null;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={TILE_URL}
          subdomains="abcd"
          maxZoom={19}
        />

        <GeoJSON key={`geojson-day-${currentDay}`} data={MANTA_PARROQUIAS_GEO} style={parishStyle} />

        {MANTA_HUBS.map((hub) => {
          const status = hubStatus(hub.id);
          const ringColor = HUB_STATUS_COLOR[status];
          return (
            <React.Fragment key={hub.id}>
              <Circle
                center={hub.coords}
                radius={status === 'firewall' ? 500 : 700}
                pathOptions={{ color: ringColor, fillColor: ringColor, fillOpacity: 0.12, weight: 3, dashArray: '6 6', lineCap: 'square' }}
              />
              <Marker position={hub.coords} icon={buildHubIcon(status)}>
                <Popup>
                  <div className="text-mc-ink">
                    <h4 className="mc-heading text-[14px]">{hub.name}</h4>
                    <p className="mt-2 text-[18px] leading-tight text-mc-muted">{hub.description}</p>
                    <p className="mt-2 text-[18px] leading-tight text-mc-ink">
                      Casos activos hoy: <b className="font-pixel text-[10px] text-mc-redstone-dark">{hubCases[hub.id] ?? 0}</b>
                    </p>
                    <div className="mc-chip mt-2 text-white" style={{ background: ringColor }}>
                      {HUB_STATUS_LABEL[status]}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      <div className="mc-panel absolute bottom-8 left-3 z-20 p-3 text-[18px] leading-tight text-mc-ink">
        <p className="mc-label mb-2 text-mc-ink">Parroquias: % con infección activa</p>
        {PREVALENCE_LEVELS.map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 border-2 border-black" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
        <p className="mc-label mb-2 mt-3 text-mc-ink">Hubs</p>
        {(['firewall', 'ring', 'open'] as HubStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <PixelIcon name={HUB_STATUS_ICON[s]} size={16} />
            {HUB_STATUS_LABEL[s]}
          </div>
        ))}
      </div>
    </div>
  );
};
