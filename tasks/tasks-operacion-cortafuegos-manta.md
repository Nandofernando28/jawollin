## Documentos de Plan de Implementación por Fase

> **Distribución para Equipo de 3 Personas:** Consulta [**plan-equipo-3-integrantes.md**](./plan-equipo-3-integrantes.md) para ver la asignación equitativa (**33.3% de esfuerzo cada uno** y cero conflictos de Git) dividida por carpetas y fases.

Cada fase del plan central cuenta con su propio documento de implementación detallado bajo la estructura de `Rules/generate-tasks.md`:

1. [**Fase 1: Construcción de la Red Social Multicapa de Manta**](./tasks-fase-1-red-multicapa-manta.md)
2. [**Fase 2: Motor Epidemiológico SEIR-VQ, Estrategia "Escudo Manta" y Ensamble Monte Carlo**](./tasks-fase-2-motor-seir-escudo-manta.md)
3. [**Fase 3: Backend Serverless AWS y Servidor Híbrido Local**](./tasks-fase-3-backend-serverless-hibrido.md)
4. [**Fase 4: Generador de Boletín Ejecutivo para el Alcalde (Amazon Bedrock + Fallback)**](./tasks-fase-4-boletin-alcalde-bedrock.md)
5. [**Fase 5: Extracción Cartográfica Fiel de Manta (OSM/INEC a GeoJSON/SVG) y Contratos TypeScript**](./tasks-fase-5-cartografia-manta-contratos-ts.md)
6. [**Fase 6: Interfaz de Usuario en React 19 (Centro de Control Epidemiológico)**](./tasks-fase-6-interfaz-react-centro-control.md)
7. [**Fase 7: Pruebas de Verificación, Reproducibilidad, Despliegue AWS y Entregables**](./tasks-fase-7-verificacion-despliegue-entregables.md)

## Relevant Files

- `src/engine/graph_manta.py` - Construcción determinista de la red social multicapa de Manta (capas diurna y nocturna, distribución poblacional por las 5 parroquias según INEC, roles sociales, pertenencia a los 5 hubs críticos y pre-cálculo de métricas de centralidad puente).
- `tests/test_graph_manta.py` - Pruebas unitarias para validar determinismo por semilla, proporciones demográficas de las 5 parroquias y conectividad de las capas diurna y nocturna.
- `src/engine/simulator.py` - Motor epidemiológico estocástico SEIR-VQ, optimizador de ROI marginal por dólar (*Escudo Manta* con las 3 defensas combinadas: vacunas anillo+puente solo para Sanos, brigadas de aislamiento para superpropagadores zombies, y cortafuegos/fumigación en hubs), comparación contra las 2 líneas base (*Sin Intervención* e *Intervención al Azar*) y agregación estadística Monte Carlo (promedios y percentiles P10, P50, P90).
- `tests/test_simulator.py` - Pruebas unitarias de reproducibilidad exacta (`std == 0.0` con misma semilla), validación de filtro estricto de vacunación (0% de dosis en infectados/inmunes) y superioridad estadística de *Cortafuegos Manta* sobre la línea base aleatoria.
- `src/handlers/worker.py` - Handler AWS Lambda Worker que ejecuta un lote de réplicas Monte Carlo en paralelo invocadas desde el estado `Map` de AWS Step Functions Express.
- `src/handlers/orchestrator.py` - Handler AWS Lambda Orquestador para la API HTTP (`GET /health`, `POST /simulate`, `GET /simulations/{simHash}`) con cálculo de `sim_hash` SHA-256, caché determinista en Amazon DynamoDB, guardado de series espaciales en Amazon S3 y disparo de Step Functions (con fallback directo en proceso si no existe ARN).
- `src/handlers/mayor_report.py` - Handler AWS Lambda (`POST /mayor-report`) que invoca Amazon Bedrock (`amazon.nova-micro-v1:0` o Claude 3 Haiku) para redactar el Boletín Ejecutivo para el Alcalde en 3 secciones y provee un generador heurístico determinista local como respaldo.
- `tests/test_handlers.py` - Pruebas unitarias e integración para los handlers Lambda (`orchestrator`, `worker`, `mayor_report`) y validación de contrato JSON.
- `src/local_server.py` - Servidor HTTP local en Python (`localhost:8000`) con soporte CORS completo que expone `/health`, `/simulate`, `/simulations/{simHash}` y `/mayor-report` para desarrollo local y modo híbrido en la defensa en vivo en la ULEAM.
- `scripts/extract_manta_geojson.py` - Script utilitario para extraer los límites reales de las 5 parroquias urbanas de Manta desde OpenStreetMap / Overpass API (o poligonales oficiales INEC) y proyectarlos a coordenadas SVG optimizadas (`viewBox="0 0 800 600"`).
- `frontend/src/types/simulation.ts` - Contratos e interfaces TypeScript para parámetros de simulación, resultados de las 3 estrategias, bandas P10-P90, series espaciales por parroquia/hub y respuesta del Boletín del Alcalde.
- `frontend/src/data/mantaGeo.ts` - Datos cartográficos vectoriales (`SVG path` reales) de las 5 parroquias de Manta (Tarqui, Eloy Alfaro, Manta Centro, Los Esteros, San Mateo), línea costera del Pacífico y coordenadas proyectadas de los 5 hubs críticos (ULEAM, Mercado Tarqui, Mercado Central, Empacadoras, Terminal Terrestre).
- `frontend/src/components/MantaMap.tsx` - Componente de mapa interactivo SVG con reproducción día a día (Play, Pausa, Reset, Scrubber 0–30 días), coloración coroplética por densidad de zombies en parroquias, estado de hubs (abierto vs. cortafuegos activo) y visualización de anillos de vacunación.
- `frontend/src/components/EpidemicCharts.tsx` - Componente de gráficas epidemiológicas SVG comparando las curvas SEIR-VQ de las 3 estrategias con bandas de incertidumbre P10-P90 y desglose de uso de presupuesto diario.
- `frontend/src/components/MayorReportModal.tsx` - Componente de tarjeta/modal ejecutivo para mostrar el Boletín de Emergencia del Alcalde generado por Amazon Bedrock (o motor heurístico local).
- `frontend/src/App.tsx` - Aplicación principal con estética de Centro de Control Epidemiológico (3 columnas), switch de conexión híbrida (`AWS Cloud` vs. `Local Server`), panel de sliders e inputs libres para responder en < 5 segundos al "Brote Sorpresa", tarjetas KPI de vidas salvadas y vista integrada.
- `infra/template.yaml` - Plantilla AWS SAM / CloudFormation con API Gateway HTTP API, Step Functions Express Workflow, Lambdas Python 3.12 ARM64, DynamoDB On-Demand, S3 con expiración a 14 días y AWS Budget de $5.00 USD.
- `docs/costos.md` - Desglose detallado del costo real durante el evento (~$0.02 USD) y proyección mensual en producción para el COE de Manta (~$2.00 USD/mes).
- `README.md` - Documentación raíz con descripción del escenario, modelo matemático SEIR-VQ, supuestos y fuentes (INEC/MSP), semilla y parámetros por defecto para reproducibilidad, diagrama de arquitectura, captura del AWS Budget y guía de despliegue.

### Notes

- **Reproducibilidad estricta:** Nunca utilizar el módulo global `random` de Python sin semilla aislada; instanciar siempre `rng = np.random.default_rng(run_seed)` dentro de cada corrida individual para garantizar que la misma semilla produzca idéntico resultado en Windows local y en AWS Lambda Linux ARM64.
- **Ejecución de pruebas Backend:** Ejecutar `python -m unittest discover -s tests -p "test_*.py" -v` desde la raíz del proyecto.
- **Ejecución de compilación Frontend:** Ejecutar `npm run build` dentro del directorio `frontend/` para verificar tipado estricto TypeScript (`tsc -b`) y empaquetado de Vite.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Verificar el estado del repositorio Git local (`git status`) y crear o posicionarse en la rama de implementación del proyecto (`git checkout -b feature/operacion-cortafuegos-manta`).
  - [ ] 0.2 Crear el directorio `tests/` en la raíz del proyecto con su archivo `tests/__init__.py` para alojar las pruebas unitarias del motor y los handlers.

- [ ] 1.0 Fase 1: Construcción de la Red Social Multicapa de Manta (Día/Noche, Parroquias INEC y Hubs Críticos)
  - [ ] 1.1 Definir en `src/engine/graph_manta.py` el catálogo constante `MANTA_PARISHES` con las 5 parroquias urbanas, sus pesos poblacionales reales según INEC (Tarqui: `0.38`, Eloy Alfaro: `0.24`, Manta Centro: `0.22`, Los Esteros: `0.11`, San Mateo: `0.05`) y coordenadas base para distribución espacial.
  - [ ] 1.2 Definir en `src/engine/graph_manta.py` el catálogo `MANTA_HUBS` para los 5 nodos concentradores críticos (`uleam`, `mercado_tarqui`, `mercado_central`, `empacadoras`, `terminal_terrestre`), especificando su parroquia anfitriona, capacidad relativa de afluencia y multiplicador de riesgo diurno.
  - [ ] 1.3 Implementar la asignación determinista de atributos por nodo (`0 .. n_nodes - 1`) usando `np.random.default_rng(seed)`: parroquia de residencia, núcleo familiar (`household_id` de 3 a 5 miembros), rol social (`estudiante`, `comerciante`, `transportista`, `obrero_atunero`, `residente`), hub principal de actividad diurna y movilidad interparroquial.
  - [ ] 1.4 Construir la **Capa Nocturna ($G_N$)** mediante listas de adyacencia y pesos de arista $w_{ij}^{(N)}$: conectar en clique completo a los miembros del mismo hogar (peso alto) y añadir conexiones vecinales de corto alcance dentro de la misma parroquia (clúster barrial).
  - [ ] 1.5 Construir la **Capa Diurna ($G_D$)** mediante listas de adyacencia y pesos de arista $w_{ij}^{(D)}$: conectar personas que concurren al mismo Hub durante el día y agregar aristas puente generadas por `transportistas` y `comerciantes` que enlazan distintas parroquias, guardando qué aristas pertenecen a cada Hub para poder atenuarlas cuando se active un cortafuegos.
  - [ ] 1.6 Pre-calcular y almacenar en el diccionario de retorno de `build_manta_multilayer_network(n_nodes, seed)` el vector de **Centralidad Puente (`bridge_score`)** normalizado en $[0, 1]$ para cada nodo (combinando grado diurno, rol de movilidad y conexión interparroquial) junto con un caché en memoria por `(n_nodes, seed)` para acelerar corridas repetidas.
  - [ ] 1.7 Crear `tests/test_graph_manta.py` para verificar que `build_manta_multilayer_network` es 100% determinista ante la misma semilla, respeta las proporciones poblacionales por parroquia y genera todos los diccionarios requeridos (`nodes`, `day_adj`, `night_adj`, `hubs`, `bridge_score`).

- [ ] 2.0 Fase 2: Motor Epidemiológico SEIR-VQ, Estrategia "Escudo Manta" (3 Defensas + ROI Marginal) y Ensamble Monte Carlo
  - [/] 2.1 Definir en `src/engine/simulator.py` la codificación numérica vectorizada de los 5 estados epidemiológicos: `0 = SANO (🟢)`, `1 = MORDIDO / EXPUESTO (🟡)`, `2 = ZOMBIE / INFECCIOSO (🔴)`, `3 = AISLADO / CUARENTENA (🟣)`, `4 = EXORCIZADO / INMUNE (🔵)` y el esquema de parámetros por defecto documentados y función `normalize_simulation_params` con clamping (Parcialmente completada).
  - [ ] 2.2 Implementar la selección determinista de los pacientes cero (`initial_infected`) en el día $t=0$ concentrados en el `start_hub` o parroquia elegida por el usuario (permitiendo simular por ejemplo un brote que inicia en el Mercado de Tarqui o en la ULEAM).
  - [ ] 2.3 Implementar en `src/engine/simulator.py` la **Defensa 1 (La Red - Cortafuegos/Fumigación en Hubs)**: evaluar en cada día $t$ los hubs cuya proporción de casos activos (🟡 + 🔴) supere el umbral de alerta y calcular el retorno marginal esperado de cerrar/fumigar el hub (reduciendo entre 85% y 90% el peso de transmisión diurna $w_{ij}^{(D)}$ de dicho hub durante ese día a cambio de `hub_closure_cost`).
  - [ ] 2.4 Implementar la **Defensa 2 (La Lanza - Brigadas de Contención / Antídoto)**: identificar a los nodos actualmente en estado 🔴 Zombie ($I$) ordenados de mayor a menor por el número de vecinos 🟢 Sanos expuestos hoy, y aislarlos al estado 🟣 Aislado ($Q$) (o 🔵 Inmune) consumiendo `brigade_cost` por brigada.
  - [ ] 2.5 Implementar la **Defensa 3 (El Escudo - Vacunación Anillo + Puente)**: aplicar un filtro estricto que seleccione **únicamente nodos en estado 🟢 Sano ($S == 0$)** (prohibiendo terminantemente vacunar 🟡 Mordidos, 🔴 Zombies, 🟣 Aislados o 🔵 Inmunes), calcular su puntaje $\text{Score}(u) = \alpha \cdot \text{VecinosInfecciososA1y2Saltos}(u) + \beta \cdot \text{CentralidadPuente}(u)$, y vacunar a los Top-$K$ candidatos pasando a 🔵 Inmune con probabilidad $\eta_{vac}$ (`vaccine_efficacy`) a cambio de `vaccine_cost`.
  - [ ] 2.6 Implementar el **Optimizador Voraz de ROI Marginal por Dólar** para la estrategia `'shield'` (*Cortafuegos Manta*) que recibe la inyección presupuestaria diaria (`daily_budget` hasta el tope `total_budget`) y distribuye dinámicamente el presupuesto disponible entre Cortafuegos de Hubs, Brigadas de Aislamiento y Vacunación Anillo+Puente según cuál acción evita más infecciones esperadas por cada dólar gastado.
  - [ ] 2.7 Implementar las dos líneas base obligatorias en `run_single_simulation`:
    - `'none'` (*Sin Intervención*): gasto $0, sin vacunas, brigadas ni cierres de hubs.
    - `'random'` (*Intervención al Azar*): recibe exactamente el mismo presupuesto y topes de recursos diarios que `'shield'`, pero selecciona nodos 🟢 Sanos al azar para vacunar, nodos 🔴 Zombies al azar para aislar y hubs al azar, garantizando comparación justa a igualdad de recursos.
  - [ ] 2.8 Implementar el ciclo de transmisión estocástica diaria (Fase Diurna en $G_D$ con atenuación de hubs cerrados + Fase Nocturna en $G_N$ en hogares/barrios) y las transiciones temporales de estado: $\text{Sano} \to \text{Mordido}$ según probabilidad acumulada $1 - \prod (1 - \beta w_{ij})$, $\text{Mordido} \to \text{Zombie}$ tras `incubation_days`, y $\text{Zombie} \to \text{Exorcizado}$ tras `infectious_days`.
  - [ ] 2.9 Implementar `run_monte_carlo_ensemble(params)` para ejecutar $M$ réplicas deterministas ($\text{run\_seed}_k = \text{base\_seed} + k \times 1009$) sobre las 3 estrategias (`none`, `random`, `shield`), calculando curvas diarias promedio y percentiles `p10`, `p50`, `p90` para cada estado, desglose espacial día a día por parroquia y hub para el mapa animado, y KPIs de impacto (`lives_saved_vs_none`, `lives_saved_vs_random`, `peak_reduction_pct`, `budget_spent`, `cost_per_life_saved`, `zero_wasted_vaccines_check`).
  - [ ] 2.10 Crear `tests/test_simulator.py` para verificar reproducibilidad exacta con semilla fija, cumplimiento del filtro 0% vacunas desperdiciadas en infectados/inmunes, y que `'shield'` supera significativamente a `'random'` y `'none'`.

- [ ] 3.0 Fase 3: Backend Serverless AWS (Handlers Lambda, Caché DynamoDB, S3, Step Functions) y Servidor Híbrido Local
  - [ ] 3.1 Implementar `src/handlers/worker.py` (`lambda_handler`) para recibir un lote (`batch`) de índices de réplicas Monte Carlo desde AWS Step Functions, ejecutar las simulaciones correspondientes para las 3 estrategias y retornar los tensores compactos de resultados del lote.
  - [ ] 3.2 Implementar en `src/handlers/orchestrator.py` la normalización canónica de parámetros y generación determinista de `sim_hash` (SHA-256 de los parámetros y semilla) junto con la función de agregación que combina lotes provenientes de Step Functions o de la ejecución directa.
  - [ ] 3.3 Implementar en `src/handlers/orchestrator.py` la integración con **Amazon DynamoDB** (`SIMULATIONS_TABLE_NAME`) para leer/escribir el resultado por `sim_hash` con TTL de 14 días, y con **Amazon S3** (`RESULTS_BUCKET_NAME`) para almacenar la serie temporal geográfica bajo `simulations/{sim_hash}.json` (con fallback transparente a caché en memoria cuando se corre en local sin credenciales AWS).
  - [ ] 3.4 Implementar en `src/handlers/orchestrator.py` el enrutamiento de eventos HTTP API v2 de API Gateway (`GET /health`, `POST /simulate`, `GET /simulations/{simHash}`, `OPTIONS` preflight CORS), invocando `states:StartSyncExecution` cuando `STATE_MACHINE_ARN` está configurado en AWS o ejecutando `run_monte_carlo_ensemble` directamente.
  - [ ] 3.5 Implementar `src/local_server.py` usando `http.server.ThreadingHTTPServer` en el puerto `8000` (configurable por variable `PORT`), enrutando `GET /health`, `POST /simulate`, `GET /simulations/{simHash}` y `POST /mayor-report` hacia los handlers de `src/handlers/`, con cabeceras CORS habilitadas para que el frontend pueda alternar en vivo entre AWS y Local sin fricción.

- [ ] 4.0 Fase 4: Generador de Boletín Ejecutivo para el Alcalde con Amazon Bedrock y Fallback Heurístico
  - [ ] 4.1 Implementar en `src/handlers/mayor_report.py` el constructor de prompt estructurado para el Alcalde de Manta, inyectando las métricas reales de la simulación (parroquia más afectada, hub crítico intervenido, vidas salvadas frente al azar, pico de zombies evitado, presupuesto invertido y costo por vida salvada).
  - [ ] 4.2 Implementar la invocación a **Amazon Bedrock Runtime** (`boto3.client("bedrock-runtime")`) soportando tanto la API `converse` / `invoke_model` para `amazon.nova-micro-v1:0` como modelos Claude Haiku, con timeout acotado para responder rápidamente en vivo.
  - [ ] 4.3 Implementar el generador heurístico determinista de respaldo en `src/handlers/mayor_report.py` que produce el **Boletín Oficial del COE Cantonal Manta** en 3 secciones claras (*1. Diagnóstico Crítico del Brote*, *2. Directivas Operativas por Parroquia y Hub*, *3. Retorno de Inversión Sanitaria*) utilizando los números exactos de la simulación cuando Bedrock no esté disponible o se opere en modo local.
  - [ ] 4.4 Crear `tests/test_handlers.py` para probar los endpoints `/health`, `/simulate` y `/mayor-report` verificando códigos de estado HTTP 200, cabeceras CORS y estructura del payload JSON.

- [ ] 5.0 Fase 5: Extracción Cartográfica Fiel de Manta (OSM/INEC a GeoJSON/SVG) y Contratos TypeScript del Frontend
  - [ ] 5.1 Crear y ejecutar un script o utilidad de extracción cartográfica (`scripts/extract_manta_geojson.py`) que consulte los polígonos reales de las 5 parroquias de Manta (`Tarqui`, `Eloy Alfaro`, `Manta Centro`, `Los Esteros`, `San Mateo`) y el perfil costero de la Bahía de Manta desde OpenStreetMap / Overpass API (con geometría de respaldo de alta precisión basada en coordenadas oficiales INEC/IGM) y los proyecte a un `viewBox="0 0 800 600"`.
  - [ ] 5.2 Crear `frontend/src/data/mantaGeo.ts` exportando los trazados SVG (`d="..."`) reales de cada una de las 5 parroquias, centroides para etiquetas, línea costera del Océano Pacífico, vías troncales principales (Av. 4 de Noviembre, Vía Puerto-Aeropuerto, Ruta del Spondylus) y las coordenadas proyectadas exactas de los 5 Hubs críticos (`ULEAM`, `Mercado de Tarqui`, `Mercado Central`, `Empacadoras Los Esteros`, `Terminal Terrestre`).
  - [x] 5.3 Definir en `frontend/src/types/simulation.ts` todas las interfaces TypeScript del dominio: `SimulationParams`, `DailySeries`, `StrategyResult`, `ParishDailyState`, `HubDailyState`, `SimulationResponse`, `MayorReportResponse` y `BackendMode` (`'aws' | 'local'`).

- [ ] 6.0 Fase 6: Interfaz de Usuario en React 19 (Panel de Parámetros Libres para Brote Sorpresa, Mapa Animado, Curvas SEIR P10-P90 y Switch Híbrido)
  - [ ] 6.1 Crear el componente `frontend/src/components/MantaMap.tsx` que renderice el mapa SVG real de Manta con:
    - Coloración dinámica por parroquia según prevalencia de 🔴 Zombies y 🔵 Vacunados en el día seleccionado $t \in [0, T]$.
    - Marcadores interactivos de los 5 Hubs mostrando si tienen un **Cortafuegos Activo** (escudo naranja/cian) o foco infeccioso.
    - Controles de reproducción temporal: botón Play/Pause, botón Reiniciar, selector de velocidad, selector de estrategia visualizada (`Cortafuegos Manta` vs. `Intervención al Azar` vs. `Sin Intervención`) y barra deslizante (scrubber) día a día.
  - [ ] 6.2 Crear el componente `frontend/src/components/EpidemicCharts.tsx` con gráficas vectoriales responsivas:
    - Gráfica comparativa principal de **Curva de Contagios Activos (🔴 Zombies)** y **Acumulado de Infectados** para las 3 estrategias con banda sombreada de incertidumbre **P10–P90**.
    - Gráfica de evolución de estados SEIR-VQ (🟢 Sanos, 🟡 Mordidos, 🔴 Zombies, 🟣 Aislados, 🔵 Inmunes) y barra de ejecución del presupuesto por tipo de defensa (Vacunas vs. Brigadas vs. Cierre de Hubs).
  - [ ] 6.3 Crear el componente `frontend/src/components/MayorReportModal.tsx` para presentar el **Boletín Ejecutivo para el Alcalde de Manta**, indicando el origen del reporte (`Amazon Bedrock AI` o `Motor Analítico COE`), las 3 secciones en lenguaje simple y opción de copiar/descargar directiva.
  - [ ] 6.4 Implementar `frontend/src/App.tsx` integrando la consola completa en 3 columnas con estética oscura de Centro de Operaciones de Emergencia:
    - **Header:** Título del proyecto, indicador de latencia y caché (`sim_hash`), estado de verificación `0% vacunas desperdiciadas` y **Switch Híbrido (`AWS Cloud` / `Servidor Local`)** con fallback automático si la petición de red falla.
    - **Columna Izquierda (Panel de Parámetros Libres para el Brote Sorpresa):** Inputs y sliders libres para Semilla (`seed`), Población (`n_nodes`), Réplicas Monte Carlo (`monte_carlo_runs`), Epicentro Inicial (`start_hub`), Pacientes Cero (`initial_infected`), Tasa de Contagio Diurno (`beta_day`) y Nocturno (`beta_night`), Días de Incubación (`incubation_days`), Días Infecciosos (`infectious_days`), Eficacia de Vacuna (`vaccine_efficacy`), Presupuesto Diario (`daily_budget`), Presupuesto Total (`total_budget`) y costos unitarios.
    - **Columna Central:** Mapa interactivo de Manta (`MantaMap.tsx`) + tabla comparativa por parroquia y hub en el día $t$.
    - **Columna Derecha:** Tarjetas KPI de alto impacto (**Vidas Salvadas vs. No Hacer Nada**, **Vidas Salvadas vs. Azar**, **Reducción del Pico Zombie %**, **Costo por Vida Salvada $**), gráficas (`EpidemicCharts.tsx`) y botón de acción para **Generar Boletín para el Alcalde**.

- [ ] 7.0 Fase 7: Pruebas de Verificación, Reproducibilidad por Semilla, Despliegue AWS y Documentación de Entregables (README, Costos, Budget)
  - [ ] 7.1 Ejecutar la suite completa de pruebas unitarias de Python (`python -m unittest discover -s tests -v`) y validar que todas las pruebas de grafo, simulador, no-vacunación de infectados, determinismo por semilla y handlers pasen al 100%.
  - [ ] 7.2 Compilar el frontend de producción (`cd frontend && npm run build`) verificando que no existan errores de TypeScript ni de estilos en Tailwind v4.
  - [ ] 7.3 Probar la integración extremo a extremo levantando `src/local_server.py` y verificando tiempos de respuesta $< 2$ segundos para 30 corridas Monte Carlo ante cambios de parámetros tipo "Brote Sorpresa" (doble de contagio, mitad de presupuesto, inicio en Mercado Tarqui, eficacia de vacuna al 50%).
  - [ ] 7.4 Completar el archivo `README.md` en la raíz del repositorio incluyendo todos los requisitos de la rúbrica de SpookyThon 2026:
    - Descripción del escenario en Manta y formulación matemática del modelo SEIR-VQ sobre red multicapa Día/Noche.
    - Tabla de supuestos, parámetros por defecto y semilla oficial (`seed = 2026`) para reproducir exactamente los resultados.
    - Explicación de la estrategia *Escudo Manta* (3 defensas + ROI marginal por dólar) y cómo responde al Brote Sorpresa.
    - Enlace e incrustación de los diagramas de arquitectura (`docs/arquitectura.svg`, `docs/flujo_defensas.svg`, `docs/mapa_mental.svg`), declaración de costos (`docs/costos.md`) y sección para la captura del AWS Budget ($5.00 USD).
    - Instrucciones paso a paso para ejecutar localmente (`docker-compose` o Python + Vite) y desplegar en AWS (`scripts/deploy-aws.ps1`).
