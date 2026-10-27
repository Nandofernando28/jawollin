import React, { useMemo } from 'react';
import { Circle, GeoJSON, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Gauge, Pause, Play, RotateCcw, ShieldCheck } from 'lucide-react';
import { MANTA_COORDINATES, MANTA_HUBS, MANTA_PARROQUIAS_GEO } from '../data/mantaGeo';

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

const buildHubIcon = (isIntervened: boolean) => {
  const html = isIntervened
    ? `
      <span style="position:relative;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;border:3px solid #44b48b;background:#1e4199;box-shadow:0 0 0 6px rgba(30,65,153,0.12),0 8px 20px rgba(30,65,153,0.25);">
        <span style="position:absolute;inset:-2px;border-radius:9999px;border:2px solid rgba(30,65,153,0.45);animation:ping 1.6s ease-out infinite;"></span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 12.5 9 16l10-10"/>
        </svg>
      </span>
    `
    : `
      <span style="position:relative;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;border:3px solid white;background:#ec652b;box-shadow:0 0 0 8px rgba(236,101,43,0.18),0 8px 20px rgba(236,101,43,0.28);">
        <span style="position:absolute;inset:-3px;border-radius:9999px;border:2px solid rgba(236,101,43,0.55);animation:ping 1.8s ease-out infinite;"></span>
        <span style="width:8px;height:8px;border-radius:9999px;background:white;display:block;"></span>
      </span>
    `;

  return L.divIcon({
    className: 'hub-pin',
    html,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -16],
  });
};

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
  const maxDay = result?.params.days ?? 30;

  const parishStyle = useMemo(
    () => (feature: any) => {
      const name = feature?.properties?.name || '';
      const cases = zombiesPerParroquia[name] || 0;
      let fillColor = '#10b981';
      if (cases > 50) fillColor = '#ef4444';
      else if (cases > 20) fillColor = '#f59e0b';

      return {
        fillColor,
        weight: 1.5,
        opacity: 0.8,
        color: '#167e6c',
        fillOpacity: 0.28,
      };
    },
    [zombiesPerParroquia],
  );

  return (
    <div className="relative z-10 isolate min-h-[680px] w-full overflow-hidden rounded-lg border border-[#e3e4e8] bg-white shadow-xl">
      <div className="relative z-30 absolute left-4 top-4 w-[min(100%,320px)] rounded-lg border border-[#e3e4e8] bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf9f6] text-[#167e6c]">
              <Gauge className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#7c7f88]">Timeline</p>
              <p className="text-sm font-semibold text-[#111a4a]">Dia {currentDay}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] text-[#111a4a]"
              aria-label={playing ? 'Pausar reproduccion' : 'Reproducir'}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={onResetDay}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] text-[#111a4a]"
              aria-label="Reiniciar dia"
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
            aria-label="Control de dias"
          />
          <div className="mt-2 flex items-center justify-between text-[10px] text-[#7c7f88]">
            <span>0</span>
            <span>{maxDay} dias</span>
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
        className="relative z-10 h-[750px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <GeoJSON key={`geojson-day-${currentDay}`} data={MANTA_PARROQUIAS_GEO as any} style={parishStyle} />

        {MANTA_HUBS.map((hub) => {
          const isIntervened = intervenedHubs.includes(hub.id);
          return (
            <React.Fragment key={hub.id}>
              <Circle
                center={hub.coords}
                radius={isIntervened ? 500 : 700}
                pathOptions={{
                  color: isIntervened ? '#1e4199' : '#ec652b',
                  fillColor: isIntervened ? '#9ad0ff' : '#f9b692',
                  fillOpacity: isIntervened ? 0.2 : 0.22,
                  weight: 1.2,
                }}
              />
              <Marker position={hub.coords} icon={buildHubIcon(isIntervened)}>
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
