# Distribución Equitativa del Trabajo para Equipo de 3 Integrantes (33.3% c/u)

**Proyecto:** Operación Cortafuegos Manta (SpookyThon 2026 · Track B)  
**Plan Central:** [tasks-operacion-cortafuegos-manta.md](./tasks-operacion-cortafuegos-manta.md)

---

## Estrategia de División (Paralelismo Total + Cero Conflictos en Git)

Para cumplir con la regla de la competencia (*"Repositorio público con un historial de commits real, no un solo commit final"* y *"El equipo DEBE poder explicar cualquier parte de su código"*), el proyecto se divide en **3 dominios técnicos independientes por carpetas**, logrando un balance exacto de esfuerzo (**~33.3% por integrante**) y permitiendo que los 3 programen en paralelo desde el minuto uno sin bloquearse entre sí:

| Integrante | Rol Principal en el Comité de Contención | Fases Asignadas | Directorios / Archivos Exclusivos | Carga de Trabajo |
| :--- | :--- | :--- | :--- | :---: |
| **Integrante 1** | **Motor Epidemiológico, Grafo Multicapa y Optimización (*Escudo Manta*)** | **Fase 1 + Fase 2** + Calibración en Fase 7 | `src/engine/graph_manta.py`<br>`src/engine/simulator.py`<br>`tests/test_graph_manta.py`<br>`tests/test_simulator.py` | **33.3%** |
| **Integrante 2** | **Arquitectura Cloud AWS Serverless, Amazon Bedrock y Modo Híbrido** | **Fase 3 + Fase 4** + Despliegue AWS en Fase 7 | `src/handlers/worker.py`<br>`src/handlers/orchestrator.py`<br>`src/handlers/mayor_report.py`<br>`src/local_server.py`<br>`tests/test_handlers.py`<br>`infra/template.yaml` | **33.3%** |
| **Integrante 3** | **Interfaz React 19, Cartografía OpenStreetMap de Manta y Gráficas P10–P90** | **Fase 5 + Fase 6** + UX / Pitch en Fase 7 | `scripts/extract_manta_geojson.py`<br>`frontend/src/types/simulation.ts`<br>`frontend/src/data/mantaGeo.ts`<br>`frontend/src/services/api.ts`<br>`frontend/src/components/*`<br>`frontend/src/App.tsx` | **33.3%** |

---

## Detalle de Tareas por Integrante

### 🧠 Integrante 1: Especialista en Modelado Epidemiológico y Algoritmo *Escudo Manta*
**Objetivo:** Construir el corazón matemático del simulador y demostrar que la estrategia combinada supera entre un 35% y 70% a actuar al azar sin desperdiciar una sola vacuna.

- **Rama sugerida:** `feature/engine-seir-manta`
- **Plan Fase 1 ([tasks-fase-1-red-multicapa-manta.md](./tasks-fase-1-red-multicapa-manta.md)):**
  - [ ] **Tarea 1.1 – 1.3:** Configurar en `src/engine/graph_manta.py` las 5 parroquias urbanas según el Censo INEC (`Tarqui 38%`, `Eloy Alfaro 24%`, `Manta Centro 22%`, `Los Esteros 11%`, `San Mateo 5%`), los 5 hubs críticos y los roles sociales (`estudiante`, `comerciante`, `transportista`, `obrero_atunero`, `residente`).
  - [ ] **Tarea 2.1 – 4.3:** Generar hogares familiares deterministas y construir la **Capa Nocturna ($G_N$)** (hogares + barrios) y la **Capa Diurna ($G_D$)** (hubs + rutas de bus interparroquiales).
  - [ ] **Tarea 5.1 – 6.2:** Calcular el vector de **Centralidad Puente (`bridge_score`)**, el caché en memoria `_GRAPH_CACHE` y las pruebas en `tests/test_graph_manta.py`.
- **Plan Fase 2 ([tasks-fase-2-motor-seir-escudo-manta.md](./tasks-fase-2-motor-seir-escudo-manta.md)):**
  - [ ] **Tarea 1.1 – 2.2:** Definir estados SEIR-VQ (`SANO`, `MORDIDO`, `ZOMBIE`, `AISLADO`, `INMUNE`), normalización de parámetros y siembra del paciente cero en el `start_hub`.
  - [ ] **Tarea 3.1 – 3.4:** Programar las 3 defensas de *Escudo Manta* (Cortafuegos en Hubs, Brigadas de Aislamiento y Vacunación Anillo+Puente con filtro estricto `state == STATE_SANO`) y el **Optimizador Voraz de ROI Marginal por Dólar**.
  - [ ] **Tarea 4.1 – 7.2:** Implementar las dos líneas base (`none` y `random`), el ciclo de transmisión día/noche, el agregador Monte Carlo (media y percentiles `P10`, `P50`, `P90`) y las pruebas unitarias en `tests/test_simulator.py`.
- **En Fase 7 ([tasks-fase-7-verificacion-despliegue-entregables.md](./tasks-fase-7-verificacion-despliegue-entregables.md)):**
  - [ ] Validar tiempos y resultados de los 4 escenarios del **🎃 Brote Sorpresa** y documentar el modelo matemático y los supuestos en `README.md`.

---

### ☁️ Integrante 2: Especialista en AWS Serverless, Step Functions, Caché y Amazon Bedrock
**Objetivo:** Exponer el motor a través de una arquitectura 100% Serverless en AWS (`us-east-1`), integrar IA Generativa para el Alcalde y proveer el servidor híbrido local de respaldo.

- **Rama sugerida:** `feature/aws-backend-bedrock`
- **Plan Fase 3 ([tasks-fase-3-backend-serverless-hibrido.md](./tasks-fase-3-backend-serverless-hibrido.md)):**
  - [ ] **Tarea 1.1 – 1.3:** Implementar `src/handlers/worker.py` para procesar lotes de réplicas Monte Carlo invocados por el estado `Map` de AWS Step Functions Express.
  - [ ] **Tarea 2.1 – 2.2:** Implementar en `src/handlers/orchestrator.py` el hash determinista `sim_hash` (SHA-256), la lectura/escritura de caché en **Amazon DynamoDB** y el guardado de series espaciales en **Amazon S3**.
  - [ ] **Tarea 3.1 – 4.2:** Implementar la invocación a Step Functions (`StartSyncExecution`) con fallback directo y el enrutador HTTP (`GET /health`, `POST /simulate`, `GET /simulations/{simHash}`).
  - [ ] **Tarea 5.1 – 5.3:** Implementar el servidor híbrido local multihilo en `src/local_server.py` (`localhost:8000`) con CORS habilitado.
- **Plan Fase 4 ([tasks-fase-4-boletin-alcalde-bedrock.md](./tasks-fase-4-boletin-alcalde-bedrock.md)):**
  - [ ] **Tarea 1.1 – 2.2:** Implementar en `src/handlers/mayor_report.py` el extractor de contexto ejecutivo y la integración con **Amazon Bedrock** (`amazon.nova-micro-v1:0` / Claude 3 Haiku).
  - [ ] **Tarea 3.1 – 5.2:** Implementar el generador heurístico determinista de respaldo (3 secciones oficiales para el Alcalde de Manta) y las pruebas de integración en `tests/test_handlers.py`.
- **En Fase 7 ([tasks-fase-7-verificacion-despliegue-entregables.md](./tasks-fase-7-verificacion-despliegue-entregables.md)):**
  - [ ] Ejecutar el despliegue en AWS (`scripts/deploy-aws.ps1`), configurar el **AWS Budget de $5.00 USD** con su captura para el repositorio y verificar `docs/costos.md`.

---

### 🗺️ Integrante 3: Especialista en Frontend React 19, Mapa Real de Manta (OSM) y Visualización
**Objetivo:** Construir el Centro de Control Epidemiológico interactivo para que cualquier persona o jurado pueda operarlo sin explicación y recalcular el Brote Sorpresa en menos de 5 segundos.

- **Rama sugerida:** `feature/frontend-manta-control`
- **Plan Fase 5 ([tasks-fase-5-cartografia-manta-contratos-ts.md](./tasks-fase-5-cartografia-manta-contratos-ts.md)):**
  - [ ] **Tarea 1.1 – 2.4:** Crear `scripts/extract_manta_geojson.py` y generar `frontend/src/data/mantaGeo.ts` con los polígonos reales de OpenStreetMap/INEC de las 5 parroquias de Manta, el perfil costero de la Bahía, los corredores de buses y las coordenadas de los 5 Hubs.
  - [ ] **Tarea 3.1 – 4.1:** Definir todos los contratos e interfaces TypeScript en `frontend/src/types/simulation.ts`.
- **Plan Fase 6 ([tasks-fase-6-interfaz-react-centro-control.md](./tasks-fase-6-interfaz-react-centro-control.md)):**
  - [ ] **Tarea 1.1 – 1.4:** Implementar `frontend/src/services/api.ts` con el **Switch Híbrido (`AWS Cloud` / `Local Server`)** y fallback automático.
  - [ ] **Tarea 2.1 – 2.4:** Construir el mapa interactivo `frontend/src/components/MantaMap.tsx` con reproductor temporal día a día (Play, Pause, Scrubber 0–30), mapa de calor por parroquia y estado de cortafuegos en Hubs.
  - [ ] **Tarea 3.1 – 4.2:** Construir las gráficas epidemiológicas con bandas P10–P90 (`frontend/src/components/EpidemicCharts.tsx`) y el modal del Boletín del Alcalde (`frontend/src/components/MayorReportModal.tsx`).
  - [ ] **Tarea 5.1 – 6.1:** Ensamblar la consola de 3 columnas en `frontend/src/App.tsx` con todos los sliders e inputs libres para el **🎃 Brote Sorpresa** y tarjetas KPI de vidas salvadas.
- **En Fase 7 ([tasks-fase-7-verificacion-despliegue-entregables.md](./tasks-fase-7-verificacion-despliegue-entregables.md)):**
  - [ ] Validar el build de producción (`npm run build`), conectar con AWS Amplify / API Gateway y liderar la demostración visual del Pitch.

---

## Punto de Sincronización Rápida (Contrato JSON entre los 3 Integrantes)

Para que los 3 integrantes trabajen en paralelo desde el Día 1 sin esperar a que otro termine:
1. **Acuerdo de Contrato Inicial (15 minutos):** Los 3 usan las mismas claves definidas en `frontend/src/types/simulation.ts` y en la Tarea 1.2 de la Fase 2 (`normalize_simulation_params`).
2. **Desarrollo Independiente:**
   - Mientras el **Integrante 1** perfecciona la matemática de `simulator.py`, el **Integrante 2** puede probar los endpoints Lambda y el caché DynamoDB con un diccionario mock o la primera versión del simulador, y el **Integrante 3** construye el mapa de Manta y las gráficas en React usando el tipo `SimulationResponse`.
3. **Unión de Ramas (Merge):** Como cada integrante modifica carpetas distintas (`src/engine/`, `src/handlers/`, `frontend/`), los `git merge` a `main` serán limpios y dejarán un historial de commits real y equitativo de los 3 miembros para la evaluación del jurado.
