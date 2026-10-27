# Graph Report - Reto AWS  (2026-10-27)

## Corpus Check
- 56 files · ~54,227 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 2, .backend 1, .frontend 1)

## Summary
- 682 nodes · 1219 edges · 42 communities (29 shown, 13 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0dccd3bd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- Column — Style Reference
- orchestrator.py
- PRD: Operación Cortafuegos Manta (Track B · La Plaga Zombie · SpookyThon 2026)
- backend
- frontend
- compilerOptions
- MantaMap.tsx
- tasks-fase-1-red-multicapa-manta.md
- Rule: Generating a Product Requirements Document (PRD)
- Rule: Generating a Task List from User Requirements
- simulator.py
- TestMonteCarloEnsemble
- Cuaderno de calibración del motor
- simulation.ts
- mayor_report.py
- test_handlers.py
- build_manta_multilayer_network
- extract_manta_geojson.py
- TestStrategySuperiority
- normalize_simulation_params
- CortafuegosLocalHandler
- AWS Guidance
- lambda_handler
- _v2
- test_simulator.py
- lambda_handler
- run_batch_simulations
- _run_seed
- plan-equipo-3-integrantes.md
- tasks-fase-3-backend-serverless-hibrido.md
- tasks-fase-6-interfaz-react-centro-control.md
- tasks-fase-7-verificacion-despliegue-entregables.md
- tasks-fase-4-boletin-alcalde-bedrock.md
- tasks-fase-5-cartografia-manta-contratos-ts.md
- tasks-operacion-cortafuegos-manta.md
- prd-operacion-cortafuegos-manta.md
- HandlersTestBase

## God Nodes (most connected - your core abstractions)
1. `build_manta_multilayer_network()` - 33 edges
2. `normalize_simulation_params()` - 27 edges
3. `run_monte_carlo_ensemble()` - 21 edges
4. `run_single_simulation()` - 20 edges
5. `lambda_handler()` - 17 edges
6. `_v2()` - 17 edges
7. `Column — Style Reference` - 17 edges
8. `compilerOptions` - 16 edges
9. `get_cached_simulation()` - 16 edges
10. `Components` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Tasks` --references--> `BackendMode`  [INFERRED]
  tasks/tasks-operacion-cortafuegos-manta.md → frontend/src/types/simulation.ts
- `Tasks` --references--> `SimulationParams`  [INFERRED]
  tasks/tasks-operacion-cortafuegos-manta.md → frontend/src/types/simulation.ts
- `Tasks` --references--> `PercentileBand`  [INFERRED]
  tasks/tasks-fase-5-cartografia-manta-contratos-ts.md → frontend/src/types/simulation.ts
- `Tasks` --references--> `ParishDaySnapshot`  [INFERRED]
  tasks/tasks-fase-5-cartografia-manta-contratos-ts.md → frontend/src/types/simulation.ts
- `Tasks` --references--> `HubDaySnapshot`  [INFERRED]
  tasks/tasks-fase-5-cartografia-manta-contratos-ts.md → frontend/src/types/simulation.ts

## Import Cycles
- None detected.

## Communities (42 total, 13 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.06
Nodes (42): dependencies, leaflet@^1.9.4, lucide-react@^1.16.0, react@^19.1.0, react-dom@^19.1.0, react-is@^19.1.0, react-leaflet@^4.2.1, react-markdown@^9.0.3 (+34 more)

### Community 1 - "Column — Style Reference"
Cohesion: 0.04
Nodes (44): Accent Orange Button, Account Balance Card, Agent Prompt Guide, Border Radius, Bordered Content Card, Code Block, Column — Style Reference, Components (+36 more)

### Community 2 - "orchestrator.py"
Cohesion: 0.10
Nodes (27): _aws_cache_enabled(), _backend_mode(), _build_batches(), _build_http_response(), compute_sim_hash(), _dumps(), execute_distributed_or_local_ensemble(), _execution_mode() (+19 more)

### Community 3 - "PRD: Operación Cortafuegos Manta (Track B · La Plaga Zombie · SpookyThon 2026)"
Cohesion: 0.07
Nodes (29): 1.1 Contexto y Problemática, 1.2 Objetivo del Producto, 1. Introduction / Overview, 2. Goals (Objetivos Medibles), 3. User Stories, 4.1 Modelo Epidemiológico y Red Multicapa de Manta, 4.2 Defensas Combinadas y Optimización por Presupuesto (*Escudo Manta*), 4.3 Líneas Base Obligatorias y Ensamble Monte Carlo (+21 more)

### Community 4 - "backend"
Cohesion: 0.10
Nodes (20): build, container_name, environment, networks, ports, restart, context, dockerfile (+12 more)

### Community 5 - "frontend"
Cohesion: 0.11
Nodes (17): applications, appRoot, frontend, baseDirectory, files, commands, paths, headers (+9 more)

### Community 6 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+9 more)

### Community 7 - "MantaMap.tsx"
Cohesion: 0.12
Nodes (24): C, getHubFirewall(), getParishColor(), HUB_ID_MAP, LEGEND, MANTA_CENTER, MantaMap(), MapResizer() (+16 more)

### Community 8 - "tasks-fase-1-red-multicapa-manta.md"
Cohesion: 0.33
Nodes (5): Instructions for Completing Tasks, Notes, Plan de Implementación — Fase 1: Construcción de la Red Social Multicapa de Manta, Relevant Files, Tasks

### Community 9 - "Rule: Generating a Product Requirements Document (PRD)"
Cohesion: 0.18
Nodes (10): Clarifying Questions (Guidelines), Example Format, Final instructions, Formatting Requirements, Goal, Output, PRD Structure, Process (+2 more)

### Community 10 - "Rule: Generating a Task List from User Requirements"
Cohesion: 0.25
Nodes (7): Goal, Interaction Model, Output, Output Format, Process, Rule: Generating a Task List from User Requirements, Target Audience

### Community 11 - "simulator.py"
Cohesion: 0.13
Nodes (17): _action_costs(), _advance_disease(), _apply_action(), apply_daily_interventions_random(), apply_daily_interventions_shield(), _brigade_expected_infections(), _clamp(), _empty_action_log() (+9 more)

### Community 12 - "TestMonteCarloEnsemble"
Cohesion: 0.18
Nodes (5): run_monte_carlo_ensemble(), Notes, Relevant Files, Tasks, TestMonteCarloEnsemble

### Community 13 - "Cuaderno de calibración del motor"
Cohesion: 0.06
Nodes (29): Comparación con enfermedades reales (R₀), Cuaderno de calibración del motor, Experimentos, Limitaciones de esta comparación, Nota sobre el rango 35–70%, Objetivo, Pendiente, Valores elegidos y por qué (+21 more)

### Community 14 - "simulation.ts"
Cohesion: 0.07
Nodes (58): App(), ControlPanel(), ControlPanelProps, PRESETS, SliderProps, SliderRow(), START_HUB_OPTIONS, ChartTooltip() (+50 more)

### Community 15 - "mayor_report.py"
Cohesion: 0.14
Nodes (8): build_bedrock_prompts(), build_heuristic_mayor_report(), _build_http_response(), extract_executive_context(), _get_bedrock_client(), invoke_bedrock_report(), _parse_body(), Tasks

### Community 20 - "build_manta_multilayer_network"
Cohesion: 0.07
Nodes (10): build_manta_multilayer_network(), _compute_bridge_score(), _edge_block(), _nearest_market(), _small_world(), _to_csr(), _edge_set(), TestBuildNetwork (+2 more)

### Community 21 - "extract_manta_geojson.py"
Cohesion: 0.18
Nodes (5): build_coastline_geojson(), build_hubs_geojson(), build_parish_geojson_from_fallback(), main(), query_overpass()

### Community 23 - "normalize_simulation_params"
Cohesion: 0.17
Nodes (4): normalize_simulation_params(), DistributedExecutionTests, start_sync_execution(), TestSimulatorConstantsAndNormalization

### Community 27 - "lambda_handler"
Cohesion: 0.27
Nodes (3): lambda_handler(), _offload_spatial_to_s3(), WorkerTests

### Community 28 - "_v2"
Cohesion: 0.44
Nodes (3): _call(), EndpointTests, _v2()

### Community 31 - "run_batch_simulations"
Cohesion: 0.25
Nodes (4): Líneas base y Monte Carlo, aggregate_batch_results(), _band(), run_batch_simulations()

### Community 33 - "plan-equipo-3-integrantes.md"
Cohesion: 0.25
Nodes (7): Detalle de Tareas por Integrante, Distribución Equitativa del Trabajo para Equipo de 3 Integrantes (33.3% c/u), Estrategia de División (Paralelismo Total + Cero Conflictos en Git), 🧠 Integrante 1: Especialista en Modelado Epidemiológico y Algoritmo *Escudo Manta*, ☁️ Integrante 2: Especialista en AWS Serverless, Step Functions, Caché y Amazon Bedrock, 🗺️ Integrante 3: Especialista en Frontend React 19, Mapa Real de Manta (OSM) y Visualización, Punto de Sincronización Rápida (Contrato JSON entre los 3 Integrantes)

### Community 34 - "tasks-fase-3-backend-serverless-hibrido.md"
Cohesion: 0.33
Nodes (5): Instructions for Completing Tasks, Notes, Plan de Implementación — Fase 3: Backend Serverless AWS y Servidor Híbrido Local, Relevant Files, Tasks

### Community 35 - "tasks-fase-6-interfaz-react-centro-control.md"
Cohesion: 0.33
Nodes (5): Instructions for Completing Tasks, Notes, Plan de Implementación — Fase 6: Interfaz de Usuario en React 19 (Centro de Control Epidemiológico de Manta), Relevant Files, Tasks

### Community 36 - "tasks-fase-7-verificacion-despliegue-entregables.md"
Cohesion: 0.33
Nodes (5): Instructions for Completing Tasks, Notes, Plan de Implementación — Fase 7: Verificación Integral, Reproducibilidad, Despliegue AWS y Documentación de Entregables, Relevant Files, Tasks

### Community 37 - "tasks-fase-4-boletin-alcalde-bedrock.md"
Cohesion: 0.40
Nodes (4): Instructions for Completing Tasks, Notes, Plan de Implementación — Fase 4: Generador de Boletín Ejecutivo para el Alcalde (Amazon Bedrock + Fallback Heurístico), Relevant Files

### Community 38 - "tasks-fase-5-cartografia-manta-contratos-ts.md"
Cohesion: 0.40
Nodes (4): Instructions for Completing Tasks, Notes, Plan de Implementación — Fase 5: Extracción Cartográfica Fiel de Manta (OSM/INEC a GeoJSON/SVG) y Contratos TypeScript, Relevant Files

### Community 39 - "tasks-operacion-cortafuegos-manta.md"
Cohesion: 0.40
Nodes (4): Documentos de Plan de Implementación por Fase, Instructions for Completing Tasks, Notes, Relevant Files

## Knowledge Gaps
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Tasks` connect `TestMonteCarloEnsemble` to `tasks-operacion-cortafuegos-manta.md`, `simulator.py`, `simulation.ts`, `build_manta_multilayer_network`, `normalize_simulation_params`?**
  _High betweenness centrality (0.284) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `build_manta_multilayer_network()` (e.g. with `Relevant Files` and `Tasks`) actually correct?**
  _`build_manta_multilayer_network()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06342494714587738 - nodes in this community are weakly interconnected._
- **Why does `normalize_simulation_params()` connect `normalize_simulation_params` to `_run_seed`, `plan-equipo-3-integrantes.md`, `orchestrator.py`, `simulator.py`, `TestMonteCarloEnsemble`, `test_handlers.py`, `lambda_handler`, `test_simulator.py`, `run_batch_simulations`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `normalize_simulation_params()` (e.g. with `Punto de Sincronización Rápida (Contrato JSON entre los 3 Integrantes)` and `Tasks`) actually correct?**
  _`normalize_simulation_params()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Column — Style Reference` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Why does `SimulationResponse` connect `simulation.ts` to `plan-equipo-3-integrantes.md`, `TestMonteCarloEnsemble`, `MantaMap.tsx`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._