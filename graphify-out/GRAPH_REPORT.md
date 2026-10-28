# Graph Report - Reto AWS  (2026-10-27)

## Corpus Check
- 59 files · ~61,169 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 2, .backend 1, .frontend 1)

## Summary
- 784 nodes · 1423 edges · 37 communities (32 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2501375c`
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
- App.tsx
- tasks-fase-1-red-multicapa-manta.md
- Rule: Generating a Product Requirements Document (PRD)
- Rule: Generating a Task List from User Requirements
- simulator.py
- normalize_simulation_params
- Cuaderno de calibración del motor
- simulation.ts
- mayor_report.py
- test_handlers.py
- build_manta_multilayer_network
- extract_manta_geojson.py
- test_frontend_contract.py
- MantaMap.tsx
- Directivas para agentes: Operación Cortafuegos Manta
- useSimulation.ts
- SimulationResponse
- tasks-correccion-fases-5-6-mapa-interfaz.md
- plan-equipo-3-integrantes.md
- tasks-fase-3-backend-serverless-hibrido.md
- tasks-fase-6-interfaz-react-centro-control.md
- tasks-fase-7-verificacion-despliegue-entregables.md
- tasks-fase-4-boletin-alcalde-bedrock.md
- tasks-fase-5-cartografia-manta-contratos-ts.md
- tasks-operacion-cortafuegos-manta.md

## God Nodes (most connected - your core abstractions)
1. `build_manta_multilayer_network()` - 37 edges
2. `normalize_simulation_params()` - 35 edges
3. `run_monte_carlo_ensemble()` - 23 edges
4. `MayorReportTests` - 23 edges
5. `lambda_handler()` - 21 edges
6. `_v2()` - 21 edges
7. `run_single_simulation()` - 20 edges
8. `get_cached_simulation()` - 19 edges
9. `lambda_handler()` - 17 edges
10. `Column — Style Reference` - 17 edges

## Surprising Connections (you probably didn't know these)
- `1. Mapa del proyecto` --references--> `normalize_simulation_params()`  [INFERRED]
  AGENTS.md → src/engine/simulator.py
- `Tasks` --references--> `build_heuristic_mayor_report()`  [INFERRED]
  tasks/tasks-fase-4-boletin-alcalde-bedrock.md → src/handlers/mayor_report.py
- `Tasks` --references--> `KpiCards()`  [INFERRED]
  tasks/tasks-correccion-fases-5-6-mapa-interfaz.md → frontend/src/components/KpiCards.tsx
- `Tasks` --references--> `MantaMap()`  [INFERRED]
  tasks/tasks-correccion-fases-5-6-mapa-interfaz.md → frontend/src/components/MantaMap.tsx
- `Tasks` --references--> `ParishId`  [INFERRED]
  tasks/tasks-correccion-fases-5-6-mapa-interfaz.md → frontend/src/types/simulation.ts

## Import Cycles
- None detected.

## Communities (37 total, 5 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.07
Nodes (40): dependencies, leaflet@^1.9.4, lucide-react@^1.16.0, react@^19.1.0, react-dom@^19.1.0, react-is@^19.1.0, react-leaflet@^4.2.1, react-markdown@^9.0.3 (+32 more)

### Community 1 - "Column — Style Reference"
Cohesion: 0.04
Nodes (44): Accent Orange Button, Account Balance Card, Agent Prompt Guide, Border Radius, Bordered Content Card, Code Block, Column — Style Reference, Components (+36 more)

### Community 2 - "orchestrator.py"
Cohesion: 0.09
Nodes (28): _aws_cache_enabled(), _backend_mode(), _build_batches(), _build_http_response(), compute_sim_hash(), _dumps(), _execution_mode(), get_cached_simulation() (+20 more)

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

### Community 7 - "App.tsx"
Cohesion: 0.21
Nodes (13): App(), Header(), KpiCards(), MayorReportModal(), sumUpTo(), TerritoryPanel(), TerritoryPanelProps, Tooltip() (+5 more)

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
Cohesion: 0.07
Nodes (31): _action_costs(), _advance_disease(), aggregate_batch_results(), _apply_action(), apply_daily_interventions_random(), apply_daily_interventions_shield(), _band(), _brigade_expected_infections() (+23 more)

### Community 12 - "normalize_simulation_params"
Cohesion: 0.06
Nodes (7): normalize_simulation_params(), run_monte_carlo_ensemble(), execute_distributed_or_local_ensemble(), DistributedExecutionTests, TestMonteCarloEnsemble, TestSimulatorConstantsAndNormalization, TestStrategySuperiority

### Community 13 - "Cuaderno de calibración del motor"
Cohesion: 0.06
Nodes (31): Comparación con enfermedades reales (R₀), Cuaderno de calibración del motor, Experimentos, Limitaciones de esta comparación, Nota sobre el rango 35–70%, Objetivo, Pendiente, Valores elegidos y por qué (+23 more)

### Community 14 - "simulation.ts"
Cohesion: 0.12
Nodes (26): HeaderProps, MayorReportModalProps, Field(), FieldProps, Section(), SetupScreen(), SetupScreenProps, START_HUBS (+18 more)

### Community 15 - "mayor_report.py"
Cohesion: 0.05
Nodes (24): _bedrock_enabled(), build_bedrock_prompts(), build_heuristic_mayor_report(), _build_http_response(), _busiest_hub(), _closed_hubs(), detect_scenario_changes(), extract_executive_context() (+16 more)

### Community 16 - "test_handlers.py"
Cohesion: 0.11
Nodes (3): CortafuegosLocalHandler, main(), _print_banner()

### Community 20 - "build_manta_multilayer_network"
Cohesion: 0.06
Nodes (11): build_manta_multilayer_network(), _compute_bridge_score(), _edge_block(), _household_sizes(), _nearest_market(), _small_world(), _to_csr(), _edge_set() (+3 more)

### Community 21 - "extract_manta_geojson.py"
Cohesion: 0.09
Nodes (9): build_coastline_geojson(), build_hubs_geojson(), build_parish_geojson_from_fallback(), main(), query_overpass(), lambda_handler(), _offload_batch_to_s3(), start_sync_execution() (+1 more)

### Community 22 - "test_frontend_contract.py"
Cohesion: 0.15
Nodes (7): _frontend_defaults(), _inside(), _map_hubs(), _map_parishes(), _read(), TestFrontendDefaults, TestMapGeography

### Community 23 - "MantaMap.tsx"
Cohesion: 0.17
Nodes (17): buildHubIcon(), CARTO_KEY, CARTO_STYLE, HUB_STATUS_LABEL, HubStatus, MantaMap(), MantaMapProps, PREVALENCE_LEVELS (+9 more)

### Community 25 - "Directivas para agentes: Operación Cortafuegos Manta"
Cohesion: 0.14
Nodes (13): 10. Código completo, 11. Entorno Windows, 1. Mapa del proyecto, 2. Comandos, 3. Flujo de trabajo con las tareas, 4. Reglas propias del reto (afectan la nota), 5. AWS, 6. Documentación de librerías (+5 more)

### Community 27 - "useSimulation.ts"
Cohesion: 0.39
Nodes (10): SurprisePreset, useSimulation(), AWS_API_URL, checkHealth(), errorMessage(), fetchWithTimeout(), generateMayorReport(), getBaseUrl() (+2 more)

### Community 28 - "SimulationResponse"
Cohesion: 0.28
Nodes (8): recharts@^3.0.2, ChartTooltip(), EpidemicCharts(), EpidemicChartsProps, TCPayload, KpiCardsProps, SimulationResponse, recharts

### Community 29 - "tasks-correccion-fases-5-6-mapa-interfaz.md"
Cohesion: 0.40
Nodes (4): Instructions for Completing Tasks, Notes, Plan de Corrección — Fases 5 y 6: Mapa de Manta e Interfaz del Centro de Control, Relevant Files

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
Cohesion: 0.33
Nodes (5): Instructions for Completing Tasks, Notes, Plan de Implementación — Fase 4: Generador de Boletín Ejecutivo para el Alcalde (Amazon Bedrock + Fallback Heurístico), Relevant Files, Tasks

### Community 38 - "tasks-fase-5-cartografia-manta-contratos-ts.md"
Cohesion: 0.29
Nodes (4): Instructions for Completing Tasks, Notes, Plan de Implementación — Fase 5: Extracción Cartográfica Fiel de Manta (OSM/INEC a GeoJSON/SVG) y Contratos TypeScript, Relevant Files

### Community 39 - "tasks-operacion-cortafuegos-manta.md"
Cohesion: 0.40
Nodes (4): Documentos de Plan de Implementación por Fase, Instructions for Completing Tasks, Notes, Relevant Files

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Tasks` connect `simulation.ts` to `tasks-operacion-cortafuegos-manta.md`, `simulator.py`, `normalize_simulation_params`, `build_manta_multilayer_network`, `SimulationResponse`?**
  _High betweenness centrality (0.267) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `build_manta_multilayer_network()` (e.g. with `Relevant Files` and `Tasks`) actually correct?**
  _`build_manta_multilayer_network()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06620209059233449 - nodes in this community are weakly interconnected._
- **Why does `normalize_simulation_params()` connect `normalize_simulation_params` to `plan-equipo-3-integrantes.md`, `orchestrator.py`, `simulator.py`, `simulation.ts`, `mayor_report.py`, `build_manta_multilayer_network`, `extract_manta_geojson.py`, `Directivas para agentes: Operación Cortafuegos Manta`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `normalize_simulation_params()` (e.g. with `1. Mapa del proyecto` and `Punto de Sincronización Rápida (Contrato JSON entre los 3 Integrantes)`) actually correct?**
  _`normalize_simulation_params()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `Column — Style Reference` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Why does `build_manta_multilayer_network()` connect `build_manta_multilayer_network` to `tasks-fase-7-verificacion-despliegue-entregables.md`, `tasks-fase-1-red-multicapa-manta.md`, `simulator.py`, `normalize_simulation_params`, `simulation.ts`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._