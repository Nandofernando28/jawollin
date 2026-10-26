# Plan de Implementación — Fase 5: Extracción Cartográfica Fiel de Manta (OSM/INEC a GeoJSON/SVG) y Contratos TypeScript

**Referencia PRD:** [prd-operacion-cortafuegos-manta.md](./prd-operacion-cortafuegos-manta.md) (Secciones 4.6 FR-20 y 6.1)  
**Plan Central:** [tasks-operacion-cortafuegos-manta.md](./tasks-operacion-cortafuegos-manta.md)

## Relevant Files

- `scripts/extract_manta_geojson.py` - Script en Python para consultar/procesar las poligonales reales de las 5 parroquias urbanas de Manta (`Tarqui`, `Eloy Alfaro`, `Manta Centro`, `Los Esteros`, `San Mateo`), el perfil costero del Océano Pacífico y las coordenadas reales de los 5 Hubs críticos desde OpenStreetMap / Overpass API y cartografía oficial INEC, convirtiéndolos en trazados SVG (`viewBox="0 0 800 560"`).
- `frontend/src/data/mantaGeo.ts` - Módulo TypeScript con las geometrías vectoriales SVG listas para renderizar sin latencia de red externa, incluyendo polígonos parroquiales, costa, rutas de conexión de buses y ubicación geográfica real de los 5 Hubs.
- `frontend/src/types/simulation.ts` - Definición completa de interfaces TypeScript que tipan la comunicación entre el Frontend React y el Backend (`POST /simulate`, `GET /health`, `POST /mayor-report`).

### Notes

- **Fidelidad Geográfica 100% y Cero Dependencias Externas Frágiles en Vivo:** Al pre-procesar las coordenadas geográficas reales (latitud `[-0.995, -0.925]`, longitud `[-80.785, -80.665]`) a trazados vectoriales SVG en `frontend/src/data/mantaGeo.ts`, el mapa de Manta es 100% fiel a la geografía costera real del cantón y carga en $0\text{ ms}$ incluso si el internet del auditorio falla (sin depender de tiles externos de Mapbox/Leaflet que podrían bloquearse).
- **Coordenadas Reales de Referencia (WGS84):**
  - *Manta Centro:* `-0.9498, -80.7282`
  - *Tarqui:* `-0.9615, -80.7065`
  - *Los Esteros:* `-0.9465, -80.6920`
  - *Eloy Alfaro:* `-0.9760, -80.6985`
  - *San Mateo:* `-0.9880, -80.7680`
  - *Hub 1 — ULEAM:* `-0.9536, -80.7465`
  - *Hub 2 — Mercado de Tarqui:* `-0.9572, -80.7078`
  - *Hub 3 — Mercado Central:* `-0.9482, -80.7225`
  - *Hub 4 — Empacadoras (Los Esteros):* `-0.9410, -80.7010`
  - *Hub 5 — Terminal Terrestre:* `-0.9630, -80.6890`

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Ubicarse en la rama de implementación (`git checkout -b feature/fase-5-cartografia-manta-contratos-ts` o continuar en `feature/operacion-cortafuegos-manta`).

- [ ] 1.0 Construir el procesador cartográfico de Manta (`scripts/extract_manta_geojson.py`)
  - [ ] 1.1 Implementar en `scripts/extract_manta_geojson.py` la función de proyección cartográfica Equirectangular / Mercator local `latlon_to_svg(lat: float, lon: float) -> Tuple[float, float]` calibrada al bounding box costero de Manta (`lon_min=-80.785`, `lon_max=-80.665`, `lat_min=-0.998`, `lat_max=-0.922`) sobre un lienzo `800 x 560`.
  - [ ] 1.2 Incluir en el script la consulta a Overpass API (`relation["boundary"="administrative"]["name"~"Manta|Tarqui|Eloy Alfaro|Los Esteros|San Mateo"]`) junto con las poligonales geodésicas de alta precisión de las 5 parroquias urbanas de Manta (basadas en la División Político-Administrativa del INEC y el perfil real de la Bahía de Manta, el espigón portuario, Playa Murciélago, Playa de Tarqui y cabo San Mateo).
  - [ ] 1.3 Generar y validar los strings `path` SVG (`M x y L ... Z`) sin huecos topológicos entre parroquias colindantes (`San Mateo` al suroeste costero, `Manta Centro` en el puerto y Playa Murciélago, `Tarqui` en el centro-este costero, `Los Esteros` al noreste costero, y `Eloy Alfaro` al sur-este interior).

- [ ] 2.0 Crear el módulo de datos geográficos del Frontend (`frontend/src/data/mantaGeo.ts`)
  - [ ] 2.1 Exportar en `frontend/src/data/mantaGeo.ts` la constante `MANTA_MAP_VIEWBOX = "0 0 800 560"` y el trazado del Océano Pacífico / Bahía de Manta y rompeolas del Puerto de Manta.
  - [ ] 2.2 Exportar `MANTA_PARISH_PATHS`: arreglo tipado con las 5 parroquias (`id`, `name`, `inecWeight`, `populationRef`, `svgPath`, `labelX`, `labelY`, `description`).
  - [ ] 2.3 Exportar `MANTA_HUB_LOCATIONS`: arreglo tipado con los 5 Hubs críticos (`id`, `name`, `shortName`, `parishId`, `lat`, `lon`, `svgX`, `svgY`, `category`, `typicalConcurrency`).
  - [ ] 2.4 Exportar `MANTA_TRANSIT_CORRIDORS`: rutas vectoriales SVG que representan las arterias viales reales que conectan los Hubs (Ruta del Spondylus San Mateo–ULEAM–Centro, Av. 4 de Noviembre, Vía Puerto–Aeropuerto por Tarqui y Los Esteros, y corredor hacia Terminal Terrestre en Eloy Alfaro) para animar el flujo diurno de buses y nodos puente.

- [ ] 3.0 Definir los Contratos e Interfaces TypeScript en `frontend/src/types/simulation.ts`
  - [ ] 3.1 Definir la interfaz `SimulationParams` con todos los parámetros configurables por el usuario y el jurado:
    - `n_nodes: number`
    - `days: number`
    - `beta_day: number`
    - `beta_night: number`
    - `incubation_days: number`
    - `infectious_days: number`
    - `initial_infected: number`
    - `start_hub: string`
    - `vaccine_efficacy: number`
    - `daily_budget: number`
    - `total_budget: number`
    - `vaccine_cost: number`
    - `brigade_cost: number`
    - `hub_closure_cost: number`
    - `monte_carlo_runs: number`
    - `seed: number`
  - [ ] 3.2 Definir las interfaces de resultados estadísticos:
    - `PercentileBand`: `{ mean: number[]; p10: number[]; p50: number[]; p90: number[] }`
    - `StrategyTimeSeries`: series diarias para `sano`, `mordido`, `zombie`, `aislado`, `inmune`, `ever_infected`, `budget_spent`, `vaccines_applied`, `brigades_deployed`, `hubs_closed`.
    - `ParishDaySnapshot` y `HubDaySnapshot` para colorear y animar el mapa de Manta en cada día $t \in [0, \text{days}]$.
    - `SummaryKPIs`: métricas comparativas de vidas salvadas, reducción de pico, presupuesto ejecutado, costo por vida salvada y auditoría `wasted_vaccines_count`.
    - `SimulationResponse`: contrato completo devuelto por `POST /simulate`.
    - `MayorReportResponse`: contrato devuelto por `POST /mayor-report`.
    - `BackendMode`: `'aws' | 'local'`.

- [ ] 4.0 Verificación de Compilación de Tipos de la Fase 5
  - [ ] 4.1 Ejecutar `npx tsc --noEmit` dentro de `frontend/` para comprobar que `mantaGeo.ts` y `simulation.ts` compilan sin ningún error ni advertencia de TypeScript.
