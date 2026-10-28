# Plan de Corrección — Fases 5 y 6: Mapa de Manta e Interfaz del Centro de Control

**Origen:** revisión de [tasks-fase-5-cartografia-manta-contratos-ts.md](./tasks-fase-5-cartografia-manta-contratos-ts.md) y [tasks-fase-6-interfaz-react-centro-control.md](./tasks-fase-6-interfaz-react-centro-control.md) del 27/10/2026.
**Plan Central:** [tasks-operacion-cortafuegos-manta.md](./tasks-operacion-cortafuegos-manta.md)

Objetivo: que el mapa y la consola muestren solo lo que calcula el backend, sin datos inventados ni contradicciones con el README, y que el jurado pueda cambiar parámetros en vivo durante el Brote Sorpresa sin tropiezos.

## Relevant Files

- `frontend/src/data/mantaGeo.ts` - Coordenadas de los 5 hubs y polígonos GeoJSON de las 5 parroquias que dibuja el mapa.
- `frontend/src/components/MantaMap.tsx` - Mapa Leaflet: tiles, coloreado de parroquias y marcadores de hubs.
- `frontend/src/App.tsx` - Consola principal: calcula los datos del día para el mapa (`zombiesPerParroquia`, `intervenedHubs`) y contiene la barra de Brotes Sorpresa.
- `frontend/src/components/EpidemicCharts.tsx` - Curvas con bandas P10–P90 y gráficas de estados y gasto.
- `frontend/src/components/KpiCards.tsx` - Las 4 tarjetas de indicadores.
- `frontend/src/components/SetupScreen.tsx` - Pantalla de parámetros libres (sliders e inputs numéricos).
- `frontend/src/components/Header.tsx` - Cabecera con estado del backend y selector AWS/Local.
- `frontend/src/components/MayorReportModal.tsx` - Modal del boletín para el alcalde.
- `frontend/src/hooks/useSimulation.ts` - Estado central; contiene `applyPreset` (Brotes Sorpresa).
- `frontend/src/data/surprisePresets.ts` - **Nuevo.** Única definición de los 4 Brotes Sorpresa, compartida por la consola y la pantalla de parámetros.
- `frontend/src/types/simulation.ts` - Contratos TypeScript con el backend.
- `scripts/extract_manta_geojson.py` - Script cartográfico de relleno (IDs de OSM falsos, nunca consulta Overpass). **Se elimina.**
- `tests/test_frontend_contract.py` - Test que ya compara los valores por defecto del frontend con los del motor; se amplía para comprobar `mantaGeo.ts` (identificadores, hubs dentro de su parroquia, sin solapes) y los presets.
- `README.md` - Sección de interfaz y limitaciones (límites de parroquias aproximados).
- `tasks/tasks-fase-5-cartografia-manta-contratos-ts.md` y `tasks/tasks-fase-6-interfaz-react-centro-control.md` - Se marcan las tareas y se anotan las desviaciones respecto de la spec original.

### Notes

- **Fuente de verdad: el backend.** Los identificadores de hubs (`mercado_tarqui`, `uleam`, `mercado_central`, `empacadoras`, `terminal_terrestre`) y de parroquias (`tarqui`, `eloy_alfaro`, `manta_centro`, `los_esteros`, `san_mateo`) son los de `src/engine/graph_manta.py`. El frontend nunca inventa otros.
- **Desviación aceptada de la spec original:** el mapa usa Leaflet con GeoJSON en coordenadas reales, no trazados SVG. Se documenta en lugar de reescribirlo.
- **Coordenadas de hubs:** usar las de las Notas de la Fase 5 (Hub 1 ULEAM `-0.9536, -80.7465`, etc.) y ajustar los polígonos para que cada hub caiga en la parroquia que le asigna el backend. Los límites de parroquia son **aproximados**; no se presentan como oficiales del INEC.
- **Lenguaje:** la plaga no mata, así que se habla de "contagios evitados", no de "vidas salvadas". Las cifras escaladas a Manta usan el factor `271 000 / n_nodes`, el mismo que el boletín del backend.
- **Comandos de verificación:**
  - `npx tsc -b` y `npm run build` dentro de `frontend/` (no hay test runner de frontend).
  - `python -m unittest discover -s tests -t .` desde la raíz.
  - Prueba manual en el navegador con un backend propio: `python src/local_server.py 8010` y, en `frontend/`, `BACKEND_URL=http://localhost:8010 npx vite --port 5180`. El puerto 8000 lo usa un contenedor Docker del equipo; no tocarlo.
- **Fuera de alcance** (cosméticos, la entrega es el 28/10/2026 a las 10:00): indicador de fase día/noche, tema claro del modal y división del bundle de 916 KB.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [x] 0.0 Create feature branch *(omitida a pedido del equipo: se trabaja en la rama de fixes existente)*
  - [x] 0.1 Continuar en la rama `feature/frontend-integracion-backend` (comprobar con `git branch --show-current`); no crear otra rama para no dispersar el trabajo antes de la entrega.

- [x] 1.0 Corregir la cartografía y el mapa de Manta (Fase 5): hubs con los identificadores del backend, cada hub dentro de su parroquia, color por porcentaje de contagio y "intervenido" solo con cierre real
  - [x] 1.1 En `mantaGeo.ts`, cambiar los `id` de `MANTA_HUBS` por los del backend (`tarqui` → `mercado_tarqui`, `terminal` → `terminal_terrestre`) y tiparlos como `HubId` (importado de `types/simulation.ts`).
  - [x] 1.2 Reemplazar el campo `parroquia` (texto) por `parishId: ParishId` con la parroquia del backend: el Terminal Terrestre es `eloy_alfaro`, no Tarqui.
  - [x] 1.3 Poner las coordenadas de los hubs de las Notas de la Fase 5 y usar los nombres oficiales del backend (`MANTA_HUBS[...]["name"]` en `graph_manta.py`).
  - [x] 1.4 Ajustar los polígonos de `MANTA_PARROQUIAS_GEO` para que cada hub quede dentro de su parroquia y las parroquias no se solapen. Mantener la disposición: San Mateo al oeste costero, Manta Centro en el puerto, Tarqui en el centro-este costero, Los Esteros al noreste y Eloy Alfaro al sur.
  - [x] 1.5 En cada feature, renombrar la propiedad `id` a `parish_id` (tipo `ParishId`) y corregir el nombre "San Mateo / Sur" a "San Mateo".
  - [x] 1.6 En `App.tsx`, cambiar `zombiesPerParroquia` por un mapa `parish_id → prevalence_pct` (porcentaje de Mordidos + Zombies que ya envía el backend), sin indexar por nombre.
  - [x] 1.7 En `MantaMap.tsx`, colorear cada parroquia por `prevalence_pct` con 3 tramos (por ejemplo, menos de 2%, de 2% a 10% y más de 10%) y añadir una leyenda pequeña con esos tramos.
  - [x] 1.8 En `App.tsx`, separar los hubs con cierre (`firewall_active`) de los hubs con vacunas en anillo hoy (`vaccines_in_ring_today > 0`). Pasar las dos listas a `MantaMap` y mostrar "Cortafuegos activo" solo en el primer caso; para el segundo, un anillo distinto con el texto "Vacunación en anillo hoy".
  - [x] 1.9 En el popup de cada hub, mostrar los casos activos del día que envía el backend (`active_cases`) en lugar de la descripción fija "Foco activo".
  - [x] 1.10 Ampliar `tests/test_frontend_contract.py`: leer `mantaGeo.ts` y comprobar que los identificadores de hubs y parroquias coinciden con `HUB_IDS` y `PARISH_IDS`, que cada hub está dentro del polígono de su parroquia (prueba punto-en-polígono) y que ningún punto de una rejilla cae en dos parroquias.

- [x] 2.0 Corregir las gráficas epidemiológicas (Fase 6): bandas P10–P90 bien dibujadas para las 3 estrategias, alternar activos/acumulado, línea del día del mapa y gráfica de estados y gasto por defensa
  - [x] 2.1 En `EpidemicCharts.tsx`, dibujar cada banda P10–P90 como un `Area` apilado: la base (`p10`, sin relleno) y el grosor (`p90 − p10`) con el **mismo** `stackId`. Hacerlo para `none`, `random` y `shield`, cada una con su propio `stackId` y su color.
  - [x] 2.2 Añadir un selector de dos botones: "Zombies activos por día" (series `zombie`) y "Contagiados acumulados" (series `ever_infected`). Las curvas y las bandas cambian con la selección.
  - [x] 2.3 Recibir `currentDay` como prop (pasarlo desde `App.tsx`) y dibujar una `ReferenceLine` vertical en ese día, sincronizada con el mapa.
  - [x] 2.4 Sustituir el gráfico de barras de totales por la **gráfica 2**: áreas apiladas de los 5 estados de la estrategia `shield` (`sano`, `mordido`, `zombie`, `aislado`, `inmune`, usando `mean`) con los colores oficiales de las Notas de la Fase 6.
  - [x] 2.5 Añadir debajo una gráfica de barras apiladas por día del gasto de `shield` en cada defensa: vacunas (`vaccines_applied × vaccine_cost`), brigadas (`brigades_deployed × brigade_cost`) y cierres (`hubs_closed × hub_closure_cost`).
  - [x] 2.6 Ocultar en el tooltip las series internas (base y grosor de las bandas) y mostrar las tres medias con su rango P10–P90 del día.
  - [x] 2.7 Eliminar la tarjeta "Vacunas desperdiciadas" de este componente (ya está en `KpiCards`) junto con su frase falsa "Línea azar: ~24% en infectados".

- [x] 3.0 Corregir el panel de parámetros y los Brotes Sorpresa: campos numéricos que dejan escribir y un solo juego de botones con los escenarios documentados
  - [x] 3.1 En `SetupScreen.tsx`, cambiar el input numérico de `Field` para que guarde un borrador de texto local mientras se escribe y aplique el valor (ajustado al rango `min`–`max`) solo al salir del campo (`onBlur`) o al pulsar Enter. Comprobar que se puede escribir "2500" en Población y que el campo vacío no salta a 200.
  - [x] 3.2 Crear `frontend/src/data/surprisePresets.ts` con la lista única de los 4 Brotes Sorpresa: `id`, etiqueta, descripción y una función que devuelve los cambios a partir de `DEFAULT_SIMULATION_PARAMS`. Usar exactamente los valores que hoy tiene `applyPreset` (contagio 0,10/0,14; vacuna a 30 $; inicio en `mercado_central`; eficacia 0,5).
  - [x] 3.3 Usar esa lista en `useSimulation.ts` (`applyPreset`), en la barra de `App.tsx` y en `SetupScreen.tsx`, eliminando los botones propios de `SetupScreen` ("contagio ×2" acumulativo y "vacuna 40%"). En `SetupScreen`, los botones solo cambian los parámetros (sin ejecutar), para poder combinarlos antes de lanzar.
  - [x] 3.4 Mantener el botón "Escenario base (semilla 2026)" de `SetupScreen` y comprobar que deja los parámetros iguales a `DEFAULT_SIMULATION_PARAMS`.
  - [x] 3.5 Ampliar `tests/test_frontend_contract.py` para leer `surprisePresets.ts` y comprobar que sus valores coinciden con los escenarios del Brote Sorpresa documentados en `docs/calibracion.md`.

- [x] 4.0 Hacer honestos los textos de KPIs, cabecera y boletín: contagios evitados con rango P10–P90, costos en una sola escala, sin frases falsas y con nombres legibles
  - [x] 4.1 En `KpiCards.tsx`, reorganizar las 4 tarjetas como pide la tarea 5.4 de la Fase 6: (1) contagios evitados frente a no hacer nada, (2) contagios evitados frente al azar, (3) reducción del pico, (4) gasto y costo por contagio evitado.
  - [x] 4.2 En las tarjetas 1 y 2, mostrar la cifra escalada a Manta (`× 271 000 / n_nodes`), la cifra de la muestra y el rango P10–P90 (`lives_saved_vs_*_p10` / `_p90`, también escalado). Cambiar "Vidas salvadas" por "Contagios evitados" y quitar el signo "−" delante del porcentaje.
  - [x] 4.3 En la tarjeta 3, mostrar `peak_reduction_vs_none_pct` y los picos de las tres estrategias en "personas" (no "nodos"), sin mencionar capacidad hospitalaria (el modelo no tiene hospitales).
  - [x] 4.4 En la tarjeta 4, mostrar `total_budget_spent`, el desglose de dosis, brigadas y días-hub, y un único costo por contagio evitado frente al azar **expresado en la misma escala que la cifra principal** (dividir el gasto entre los contagios evitados escalados). Explicarlo en el tooltip. *Cambio al implementar: el presupuesto es el de la muestra, así que dividirlo entre contagios escalados a Manta daba centavos sin sentido (0,96 $). Se muestra el costo en la escala de la muestra (`cost_per_life_saved_vs_random`, unos 217 $), igual que el boletín, y se aclara "(en la muestra)".*
  - [x] 4.5 Quitar la tarjeta "Eficiencia vacunas" con la fórmula errónea `100 − dosis desperdiciadas` y, en su lugar, añadir a la tarjeta 4 un indicador "0 dosis desperdiciadas" con el valor real de `wasted_vaccines_count`.
  - [x] 4.6 En `Header.tsx`, mostrar "Sin conexión" (en lugar de "Modo local") cuando el backend no responde, y añadir junto al `sim_hash` de `App.tsx` una etiqueta "Desde caché" o "Calculado" según `cache_hit`.
  - [x] 4.7 Revisar que el selector AWS/Local de la cabecera no se corte a 800 px de ancho (por ejemplo, ocultar el texto de estado por debajo de `lg`).
  - [x] 4.8 En `MayorReportModal.tsx`, cambiar el título a "PROPUESTA DE DECRETO DEL COE", mostrar "Motor analítico del COE" o "Amazon Bedrock" en lugar del código interno de `generated_by`, y cambiar "nodos" por "contagios" en la tabla de indicadores. *La tabla se cambió por una lista: `react-markdown` sin `remark-gfm` no dibuja tablas y se veía como texto con barras.*

- [x] 5.0 Limpiar seguridad y código basura: quitar la clave de CARTO, el script cartográfico de relleno y el código muerto, y completar los contratos TypeScript
  - [x] 5.1 En `MantaMap.tsx`, eliminar `DEFAULT_CARTO_KEY` y el parámetro `?key=` de la URL de tiles (el servidor de CARTO responde sin clave). Dejar `VITE_CARTO_STYLE` como única variable. Quitar `VITE_CARTO_API_KEY` de `frontend/.env.example`. *Revertido a pedido del equipo (27/10/2026): la clave vuelve a `MantaMap.tsx` como valor por defecto y `VITE_CARTO_API_KEY` vuelve a `.env.example`.*
  - [x] 5.2 Avisar al equipo de que la clave quedó en el historial público desde el commit `f0269e9` y debe desactivarse en la cuenta de CARTO (acción manual fuera del código).
  - [x] 5.3 Eliminar `scripts/extract_manta_geojson.py` (IDs de OSM de relleno, nunca consulta Overpass y sus datos contradicen `mantaGeo.ts`).
  - [x] 5.4 En `MantaMap.tsx`, eliminar la configuración de iconos por defecto de Leaflet con imágenes de la versión 1.7.1 (los marcadores son `divIcon` propios) y unificar los dos `useEffect` idénticos de `invalidateSize`.
  - [x] 5.5 En `mantaGeo.ts`, eliminar las exportaciones que no se usan (por ejemplo, `MANTA_CENTER` si nadie la importa; comprobarlo con `grep`).
  - [x] 5.6 En `types/simulation.ts`, añadir `execution_mode` a `HealthCheckResponse` y `metrics_summary` a `MayorReportResponse`, y tipar `generated_by` con los valores reales del backend. *Además, `tests/test_frontend_contract.py` compara los campos de estas interfaces con las respuestas reales de `/simulate`, `/health` y `/mayor-report`.*

- [x] 6.0 Actualizar la documentación y verificar: documentos de las Fases 5 y 6, limitaciones del README, build, tests y prueba en el navegador
  - [x] 6.1 En `tasks-fase-5-cartografia-manta-contratos-ts.md`, marcar lo hecho y anotar la desviación: Leaflet + GeoJSON en coordenadas reales en lugar de SVG, sin script de extracción y con polígonos aproximados.
  - [x] 6.2 En `tasks-fase-6-interfaz-react-centro-control.md`, marcar lo hecho y anotar las desviaciones: Brotes Sorpresa como botones además de los sliders (los pide el reto), sin indicador día/noche, y fallback AWS → local sin mock.
  - [x] 6.3 En `README.md`, completar la sección "Interfaz" con lo que muestra cada zona de la consola y cómo usar los Brotes Sorpresa, y añadir en "Limitaciones" que los límites de las parroquias en el mapa son aproximados.
  - [x] 6.4 Ejecutar `npx tsc -b` y `npm run build` en `frontend/` sin errores.
  - [x] 6.5 Ejecutar `python -m unittest discover -s tests -t .` y comprobar que pasan todos los tests, incluidos los nuevos de `test_frontend_contract.py`.
  - [x] 6.6 Probar en el navegador con un backend propio (ver Notas): el mapa colorea las 5 parroquias, los 5 hubs se marcan con cierre o vacunación según el día, las bandas rodean a sus curvas, la línea del día se mueve con el mapa, los campos numéricos dejan escribir y los 4 Brotes Sorpresa dan los números del README.
  - [x] 6.7 Apagar los servidores de prueba al terminar.
