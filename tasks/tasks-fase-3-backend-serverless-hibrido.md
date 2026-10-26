# Plan de Implementación — Fase 3: Backend Serverless AWS y Servidor Híbrido Local

**Referencia PRD:** [prd-operacion-cortafuegos-manta.md](./prd-operacion-cortafuegos-manta.md) (Secciones 4.4 FR-12 a FR-13, 4.5 FR-14 a FR-16, 7.2 y 7.3)  
**Plan Central:** [tasks-operacion-cortafuegos-manta.md](./tasks-operacion-cortafuegos-manta.md)

## Relevant Files

- `src/handlers/worker.py` - Handler AWS Lambda (`cortafuegos-manta-worker`) invocado en paralelo por el estado `Map` de AWS Step Functions Express para procesar sub-lotes de réplicas Monte Carlo.
- `src/handlers/orchestrator.py` - Handler AWS Lambda principal (`cortafuegos-manta-orchestrator`) detrás de Amazon API Gateway HTTP API (`GET /health`, `POST /simulate`, `GET /simulations/{simHash}`), encargado de calcular el `sim_hash`, consultar/guardar caché en Amazon DynamoDB, persistir series espaciales en Amazon S3 y coordinar Step Functions (o ejecución directa en modo local).
- `src/local_server.py` - Servidor HTTP multihilo en Python (`localhost:8000`) que emula los contratos de Amazon API Gateway v2 y permite conmutación instantánea en la UI durante la defensa en vivo en la ULEAM.
- `infra/template.yaml` - Definición SAM/CloudFormation de las funciones Lambda, tabla DynamoDB, bucket S3 y Step Functions Express State Machine.
- `infra/statemachine/monte_carlo_express.asl.json` - Definición ASL del flujo paralelo `Map` de Step Functions.
- `tests/test_handlers.py` - Pruebas unitarias de integración para `worker.py` y `orchestrator.py`.

### Notes

- **Caché Determinista (`sim_hash`):** Si el jurado repite la misma semilla y los mismos parámetros, la respuesta debe provenir de DynamoDB (en AWS) o del caché en memoria `_LOCAL_SIM_CACHE` (en local) en $< 50\text{ ms}$, marcando `"cache_hit": true` en el payload JSON.
- **Compatibilidad `Decimal` en DynamoDB:** `boto3` DynamoDB no acepta tipos `float` nativos de Python al hacer `put_item`; se debe serializar el resumen o convertir flotantes a `Decimal` (o almacenar el payload comprimido/JSON string) y reconvertirlos a `float` al leer.
- **Comandos de prueba:** Ejecutar `python -m unittest tests/test_handlers.py -v` y probar el servidor local con `python src/local_server.py`.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Ubicarse en la rama de implementación (`git checkout -b feature/fase-3-backend-serverless-hibrido` o continuar en `feature/operacion-cortafuegos-manta`).
  - [ ] 0.2 Verificar que las funciones de `src/engine/simulator.py` estén listas para ser invocadas desde `src/handlers/`.

- [ ] 1.0 Implementar el Handler AWS Lambda Worker (`src/handlers/worker.py`)
  - [ ] 1.1 Implementar `lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]` en `src/handlers/worker.py`.
  - [ ] 1.2 Extraer del `event` el diccionario normalizado `params`, la lista de índices de réplicas `run_indices` (ej. `[0, 1, 2, 3, 4]`) y el indicador `record_spatial` (verdadero en el primer lote `batch_id == 0`).
  - [ ] 1.3 Ejecutar `run_batch_simulations(params, run_indices, include_spatial=record_spatial)` y devolver un diccionario JSON serializable con las matrices diarias del lote para las 3 estrategias (`none`, `random`, `shield`) y el tiempo de cómputo del worker en milisegundos.

- [ ] 2.0 Implementar Hashing Determinista y Gestión de Caché en `src/handlers/orchestrator.py`
  - [ ] 2.1 Implementar `compute_sim_hash(normalized_params: Dict[str, Any]) -> str`: serializar `normalized_params` con `json.dumps(normalized_params, sort_keys=True, separators=(",", ":"))` y calcular su digestión SHA-256 truncada a 16 caracteres hexadecimales (ej. `"cf-8a4f91bc02e14d3a"`).
  - [ ] 2.2 Implementar las funciones de persistencia con tolerancia a fallos (modo híbrido AWS/Local):
    - `get_cached_simulation(sim_hash: str)`: consulta primero el diccionario en memoria `_MEMORY_CACHE`; si no está y existe la variable de entorno `SIMULATIONS_TABLE_NAME`, consulta la tabla Amazon DynamoDB.
    - `save_simulation_cache(sim_hash: str, payload: Dict[str, Any])`: guarda en `_MEMORY_CACHE`; si `SIMULATIONS_TABLE_NAME` y `RESULTS_BUCKET_NAME` están configurados en AWS, guarda el registro con `ttl = int(time.time()) + 14 * 86400` en DynamoDB y sube el JSON completo de series espaciales a S3 bajo `simulations/{sim_hash}.json`.

- [ ] 3.0 Implementar Orquestación con AWS Step Functions Express (`StartSyncExecution`) y Fallback en Proceso
  - [ ] 3.1 En `src/handlers/orchestrator.py`, implementar `execute_distributed_or_local_ensemble(params: Dict[str, Any]) -> Dict[str, Any]`:
    - Si `STATE_MACHINE_ARN` está presente en las variables de entorno de AWS, dividir `monte_carlo_runs` en lotes (`batches`) de hasta 5 corridas por worker e invocar `sfn_client.start_sync_execution(stateMachineArn=..., input=json.dumps({"batches": batches}))`.
    - Combinar los `batchResults` devueltos por Step Functions para calcular los promedios y percentiles globales P10, P50 y P90.
    - Si `STATE_MACHINE_ARN` está vacío (ejecución local o contingencia), invocar directamente `run_monte_carlo_ensemble(params)` en el mismo proceso.

- [ ] 4.0 Implementar los Endpoints HTTP API en `src/handlers/orchestrator.py`
  - [ ] 4.1 Crear helper `_build_http_response(status_code: int, body: Dict[str, Any])` que incluya siempre cabeceras CORS completas (`Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET,POST,OPTIONS`, `Access-Control-Allow-Headers: Content-Type,Authorization,X-Requested-With`).
  - [ ] 4.2 Soportar las siguientes rutas tanto en formato de evento API Gateway v2 (`rawPath` y `requestContext.http.method`) como v1 (`path` y `httpMethod`):
    - `OPTIONS /*`: responder `200 OK` vacío para preflight CORS.
    - `GET /health`: responder `200 OK` con estado `"ok"`, modo de ejecución (`"aws-serverless"` o `"local-hybrid"`), región, disponibilidad de DynamoDB/S3/StepFunctions y timestamp.
    - `POST /simulate`: parsear el body JSON, normalizar parámetros, calcular `sim_hash`, verificar caché (a menos que `force_recompute == True`), ejecutar simulación, guardar en caché y devolver el resultado completo con `sim_hash`, `cache_hit`, `execution_time_ms`, `params`, `summary_kpis`, `strategies` y `spatial_timeline`.
    - `GET /simulations/{simHash}`: recuperar una simulación previamente calculada por su `sim_hash` o devolver `404 Not Found` si no existe.

- [ ] 5.0 Implementar el Servidor Híbrido Local (`src/local_server.py`)
  - [ ] 5.1 Implementar en `src/local_server.py` una clase `CortafuegosLocalHandler(BaseHTTPRequestHandler)` montada sobre `ThreadingHTTPServer(("0.0.0.0", port), CortafuegosLocalHandler)` con puerto por defecto `8000`.
  - [ ] 5.2 Enrutar las peticiones HTTP entrantes construyendo un diccionario `event` compatible con API Gateway HTTP API v2 y delegando:
    - `GET /health`, `POST /simulate`, `GET /simulations/*` → `handlers.orchestrator.lambda_handler(event)`.
    - `POST /mayor-report` → `handlers.mayor_report.lambda_handler(event)`.
  - [ ] 5.3 Imprimir un banner informativo en consola al iniciar `python src/local_server.py` indicando los endpoints disponibles para conectar desde el Frontend React.

- [ ] 6.0 Verificación de la Fase 3
  - [ ] 6.1 Crear pruebas en `tests/test_handlers.py` que simulen eventos `GET /health`, `POST /simulate` (comprobando `cache_hit == False` en la primera llamada y `cache_hit == True` en la segunda llamada con misma semilla) y `GET /simulations/{simHash}`.
  - [ ] 6.2 Ejecutar `python -m unittest tests/test_handlers.py -v` y verificar que todas las pruebas pasen.
