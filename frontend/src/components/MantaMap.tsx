import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Gauge, Pause, Play, RotateCcw } from 'lucide-react';
import { MANTA_COORDINATES, MANTA_HUBS, MANTA_PARROQUIAS_GEO } from '../data/mantaGeo';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ── Configuración de tiles de CARTO ───────────────────────────────────────────
const CARTO_KEY = (import.meta.env.VITE_CARTO_API_KEY || '').trim();
const CARTO_STYLE = (import.meta.env.VITE_CARTO_STYLE || 'dark_all').trim();
const TILE_URL = CARTO_KEY
  ? `https://{s}.basemaps.cartocdn.com/rastertiles/${CARTO_STYLE}/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`
  : `https://{s}.basemaps.cartocdn.com/rastertiles/${CARTO_STYLE}/{z}/{x}/{y}{r}.png`;

interface MantaMapProps {
  result?: { params: { days: number } };
  currentDay?: number;
  playing?: boolean;
  playbackSpeed?: 1 | 2 | 5;
  intervenedHubs?: string[];
  zombiesPerParroquia?: Record<string, number>;
  onDayChange?: (d: number) => void;
  onTogglePlay?: () => void;
  onResetDay?: () => void;
  onSpeedChange?: (s: 1 | 2 | 5) => void;
}

export const MantaMap: React.FC<MantaMapProps> = ({
  result,
  currentDay = 1,
  playing = false,
  playbackSpeed = 1,
  intervenedHubs = [],
  zombiesPerParroquia = {},
  onDayChange,
  onTogglePlay,
  onResetDay,
  onSpeedChange,
}) => {
  const maxDay = result?.params?.days ?? 30;

  return (
    <div className="relative min-h-[680px] w-full overflow-hidden rounded-lg border border-[#e3e4e8] bg-white shadow-xl">
      <div className="absolute left-4 top-4 z-[500] w-[min(100%,320px)] rounded-lg border border-[#e3e4e8] bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf9f6] text-[#167e6c]">
              <Gauge className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Timeline</p>
              <p className="text-sm font-semibold text-[#111a4a]">Día {currentDay}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] text-[#111a4a]"
              aria-label={playing ? 'Pausar reproducción' : 'Reproducir'}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={onResetDay}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] text-[#111a4a]"
              aria-label="Reiniciar día"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3">
          <input
            type="range"
            min={0}
            max={maxDay}
            step={1}
            value={currentDay}
            onChange={(e) => onDayChange?.(Number(e.target.value))}
            className="w-full accent-[#167e6c]"
            aria-label="Control de días"
          />
          <div className="mt-2 flex items-center justify-between text-[10px] text-[#7c7f88]">
            <span>0</span>
            <span>{maxDay} días</span>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {[1, 2, 5].map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange?.(speed as 1 | 2 | 5)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                playbackSpeed === speed ? 'bg-[#111a4a] text-white' : 'bg-[#f6f6f8] text-[#7c7f88]'
              }`}
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
        className="h-[750px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={TILE_URL}
          subdomains="abcd"
          maxZoom={19}
        />

        <GeoJSON
          key={`geojson-day-${currentDay}`}
          data={MANTA_PARROQUIAS_GEO as any}
          style={(feature: any) => {
            const name = feature?.properties?.name || '';
            const cases = zombiesPerParroquia[name] || 0;
            const color = cases > 100 ? '#ec652b' : cases > 50 ? '#f4a261' : '#44b48b';
            return {
              fillColor: color,
              weight: 1.5,
              opacity: 0.8,
              color: '#167e6c',
              fillOpacity: 0.22,
            };
          }}
        />

        {MANTA_HUBS.map((hub) => {
          const isIntervened = intervenedHubs.includes(hub.id);
          return (
            <React.Fragment key={hub.id}>
              <Circle
                center={hub.coords}
                radius={isIntervened ? 500 : 700}
                pathOptions={{
                  color: isIntervened ? '#167e6c' : '#ec652b',
                  fillColor: isIntervened ? '#94efb7' : '#f9b692',
                  fillOpacity: 0.18,
                }}
              />
              <Marker position={hub.coords}>
                <Popup>
                  <div className="p-1 text-[#111a4a]">
                    <h4 className="text-sm font-semibold">{hub.name}</h4>
                    <p className="mt-1 text-xs text-[#3b3e47]">{hub.description}</p>
                    <div className="mt-2 text-xs font-semibold text-[#167e6c]">
                      {isIntervened ? 'Cortafuegos activo' : 'Foco activo'}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};
