import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MANTA_COORDINATES, MANTA_HUBS, MANTA_PARROQUIAS_GEO } from '../data/mantaGeo';

// Corregir iconos por defecto de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MantaMapProps {
  currentDay?: number;
  intervenedHubs?: string[];
  zombiesPerParroquia?: Record<string, number>;
}

export const MantaMap: React.FC<MantaMapProps> = ({
  currentDay = 1,
  intervenedHubs = [],
  zombiesPerParroquia = {}
}) => {
  return (
    <div className="relative w-full h-[550px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
      <MapContainer
        key="manta-leaflet-map" // <--- ESTA CLAVE EVITA EL ERROR "Map container is already initialized"
        center={MANTA_COORDINATES.center}
        zoom={MANTA_COORDINATES.defaultZoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
<TileLayer
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
  maxZoom={19}
/>
        {/* Polígonos de Parroquias */}
        <GeoJSON
          key={`geojson-day-${currentDay}`}
          data={MANTA_PARROQUIAS_GEO as any}
          style={(feature: any) => {
            const name = feature?.properties?.name || '';
            const cases = zombiesPerParroquia[name] || 0;
            const color = cases > 100 ? '#EF4444' : cases > 50 ? '#F59E0B' : '#10B981';
            return {
              fillColor: color,
              weight: 1.5,
              opacity: 0.8,
              color: '#06B6D4',
              fillOpacity: 0.25
            };
          }}
        />

        {/* Hubs */}
        {MANTA_HUBS.map((hub) => {
          const isIntervened = intervenedHubs.includes(hub.id);
          return (
            <React.Fragment key={hub.id}>
              <Circle
                center={hub.coords}
                radius={isIntervened ? 500 : 700}
                pathOptions={{
                  color: isIntervened ? '#3B82F6' : '#EF4444',
                  fillColor: isIntervened ? '#60A5FA' : '#F87171',
                  fillOpacity: 0.2,
                }}
              />
              <Marker position={hub.coords}>
                <Popup>
                  <div className="p-1 text-slate-900">
                    <h4 className="font-bold text-sm">{hub.name}</h4>
                    <p className="text-xs text-slate-600">{hub.description}</p>
                    <div className="mt-2 text-xs font-semibold">
                      {isIntervened ? '🛡️ Cortafuegos Activo' : '⚠️ Foco Activo'}
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