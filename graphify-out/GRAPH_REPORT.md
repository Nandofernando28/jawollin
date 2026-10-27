# Graph Report - Reto AWS  (2026-10-26)

## Corpus Check
- 36 files · ~26,764 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 2, .backend 1, .frontend 1)

## Summary
- 281 nodes · 302 edges · 21 communities (13 shown, 8 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `000187fd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- Column — Style Reference
- typing
- PRD: Operación Cortafuegos Manta (Track B · La Plaga Zombie · SpookyThon 2026)
- backend
- frontend
- compilerOptions
- Components
- tasks-operacion-cortafuegos-manta.md
- Rule: Generating a Product Requirements Document (PRD)
- Rule: Generating a Task List from User Requirements
- run_monte_carlo_ensemble
- Declaración y Desglose de Costos en AWS
- README.md

## God Nodes (most connected - your core abstractions)
1. `Column — Style Reference` - 17 edges
2. `compilerOptions` - 16 edges
3. `Components` - 15 edges
4. `PRD: Operación Cortafuegos Manta (Track B · La Plaga Zombie · SpookyThon 2026)` - 10 edges
5. `Rule: Generating a Product Requirements Document (PRD)` - 8 edges
6. `4. Functional Requirements` - 8 edges
7. `backend` - 7 edges
8. `frontend` - 7 edges
9. `run_monte_carlo_ensemble()` - 7 edges
10. `Rule: Generating a Task List from User Requirements` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Tasks` --references--> `run_monte_carlo_ensemble()`  [INFERRED]
  tasks/tasks-fase-2-motor-seir-escudo-manta.md → src/engine/simulator.py
- `Relevant Files` --references--> `build_manta_multilayer_network()`  [INFERRED]
  tasks/tasks-fase-1-red-multicapa-manta.md → src/engine/graph_manta.py
- `Tasks` --references--> `build_manta_multilayer_network()`  [INFERRED]
  tasks/tasks-fase-7-verificacion-despliegue-entregables.md → src/engine/graph_manta.py
- `Tasks` --references--> `build_manta_multilayer_network()`  [INFERRED]
  tasks/tasks-operacion-cortafuegos-manta.md → src/engine/graph_manta.py
- `Relevant Files` --references--> `run_single_simulation()`  [INFERRED]
  tasks/tasks-fase-2-motor-seir-escudo-manta.md → src/engine/simulator.py

## Import Cycles
- None detected.

## Communities (21 total, 8 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.08
Nodes (31): dependencies, lucide-react@^1.16.0, react@^19.1.0, react-dom@^19.1.0, devDependencies, tailwindcss@^4.1.4, @tailwindcss/vite@^4.1.4, @types/react@^19.1.2 (+23 more)

### Community 1 - "Column — Style Reference"
Cohesion: 0.07
Nodes (29): Agent Prompt Guide, Border Radius, Column — Style Reference, CSS Custom Properties, Do, Do's and Don'ts, Don't, Elevation (+21 more)

### Community 2 - "typing"
Cohesion: 0.14
Nodes (3): lambda_handler(), lambda_handler(), lambda_handler()

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

### Community 7 - "Components"
Cohesion: 0.13
Nodes (15): Accent Orange Button, Account Balance Card, Bordered Content Card, Code Block, Components, FDIC Badge, Ghost Navigation Pill, Logo Bar Card (+7 more)

### Community 8 - "tasks-operacion-cortafuegos-manta.md"
Cohesion: 0.06
Nodes (34): Detalle de Tareas por Integrante, Distribución Equitativa del Trabajo para Equipo de 3 Integrantes (33.3% c/u), Estrategia de División (Paralelismo Total + Cero Conflictos en Git), 🧠 Integrante 1: Especialista en Modelado Epidemiológico y Algoritmo *Escudo Manta*, ☁️ Integrante 2: Especialista en AWS Serverless, Step Functions, Caché y Amazon Bedrock, 🗺️ Integrante 3: Especialista en Frontend React 19, Mapa Real de Manta (OSM) y Visualización, Punto de Sincronización Rápida (Contrato JSON entre los 3 Integrantes), Instructions for Completing Tasks (+26 more)

### Community 9 - "Rule: Generating a Product Requirements Document (PRD)"
Cohesion: 0.18
Nodes (10): Clarifying Questions (Guidelines), Example Format, Final instructions, Formatting Requirements, Goal, Output, PRD Structure, Process (+2 more)

### Community 10 - "Rule: Generating a Task List from User Requirements"
Cohesion: 0.25
Nodes (7): Goal, Interaction Model, Output, Output Format, Process, Rule: Generating a Task List from User Requirements, Target Audience

### Community 11 - "run_monte_carlo_ensemble"
Cohesion: 0.11
Nodes (16): build_manta_multilayer_network(), run_monte_carlo_ensemble(), run_single_simulation(), Notes, Relevant Files, Instructions for Completing Tasks, Notes, Plan de Implementación — Fase 2: Motor Epidemiológico SEIR-VQ, Estrategia "Escudo Manta" y Ensamble Monte Carlo (+8 more)

### Community 13 - "Declaración y Desglose de Costos en AWS"
Cohesion: 0.50
Nodes (3): 1. Costo Real Durante el Hackathon (3 Días de Evento), 2. Proyección de Costo Operativo Mensual en Producción (Municipio / COE de Manta), Declaración y Desglose de Costos en AWS

## Knowledge Gaps
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PRD: Operación Cortafuegos Manta (Track B · La Plaga Zombie · SpookyThon 2026)` connect `PRD: Operación Cortafuegos Manta (Track B · La Plaga Zombie · SpookyThon 2026)` to `tasks-operacion-cortafuegos-manta.md`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07777777777777778 - nodes in this community are weakly interconnected._
- **Why does `Tasks` connect `run_monte_carlo_ensemble` to `tasks-operacion-cortafuegos-manta.md`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `Column — Style Reference` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Why does `Column — Style Reference` connect `Column — Style Reference` to `Components`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Should `typing` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `PRD: Operación Cortafuegos Manta (Track B · La Plaga Zombie · SpookyThon 2026)` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._