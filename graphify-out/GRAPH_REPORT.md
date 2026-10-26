# Graph Report - Reto AWS  (2026-10-26)

## Corpus Check
- 27 files · ~14,304 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 2, .backend 1, .frontend 1)

## Summary
- 225 nodes · 224 edges · 22 communities (14 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ba7cd433`
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
- main.tsx
- Rule: Generating a Product Requirements Document (PRD)
- Rule: Generating a Task List from User Requirements
- 4. Functional Requirements
- Tokens — Spacing & Shapes
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
9. `Rule: Generating a Task List from User Requirements` - 7 edges
10. `Tokens — Typography` - 6 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (22 total, 8 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.11
Nodes (23): devDependencies, tailwindcss@^4.1.4, @tailwindcss/vite@^4.1.4, @types/react@^19.1.2, @types/react-dom@^19.1.2, typescript@~5.8.3, vite@^6.3.2, @vitejs/plugin-react@^4.4.1 (+15 more)

### Community 1 - "Column — Style Reference"
Cohesion: 0.08
Nodes (24): Agent Prompt Guide, Column — Style Reference, CSS Custom Properties, Do, Do's and Don'ts, Don't, Elevation, Example Component Prompts (+16 more)

### Community 2 - "typing"
Cohesion: 0.09
Nodes (6): build_manta_multilayer_network(), run_monte_carlo_ensemble(), run_single_simulation(), lambda_handler(), lambda_handler(), lambda_handler()

### Community 3 - "PRD: Operación Cortafuegos Manta (Track B · La Plaga Zombie · SpookyThon 2026)"
Cohesion: 0.09
Nodes (21): 1.1 Contexto y Problemática, 1.2 Objetivo del Producto, 1. Introduction / Overview, 2. Goals (Objetivos Medibles), 3. User Stories, 5. Non-Goals (Out of Scope), 6.1 Extracción de Geometría Fiel de Manta (OpenStreetMap / INEC), 6.2 Diseño de Interfaz de Usuario (UI/UX) (+13 more)

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

### Community 8 - "main.tsx"
Cohesion: 0.22
Nodes (8): dependencies, lucide-react@^1.16.0, react@^19.1.0, react-dom@^19.1.0, App(), lucide-react, react, react-dom

### Community 9 - "Rule: Generating a Product Requirements Document (PRD)"
Cohesion: 0.18
Nodes (10): Clarifying Questions (Guidelines), Example Format, Final instructions, Formatting Requirements, Goal, Output, PRD Structure, Process (+2 more)

### Community 10 - "Rule: Generating a Task List from User Requirements"
Cohesion: 0.25
Nodes (7): Goal, Interaction Model, Output, Output Format, Process, Rule: Generating a Task List from User Requirements, Target Audience

### Community 11 - "4. Functional Requirements"
Cohesion: 0.25
Nodes (8): 4.1 Modelo Epidemiológico y Red Multicapa de Manta, 4.2 Defensas Combinadas y Optimización por Presupuesto (*Escudo Manta*), 4.3 Líneas Base Obligatorias y Ensamble Monte Carlo, 4.4 Reproducibilidad y Caché Determinista, 4.5 Arquitectura Serverless e Híbrida (AWS + Local), 4.6 Interfaz de Usuario y Mapa Fiel de Manta, 4.7 Boletín Ejecutivo para el Alcalde (Amazon Bedrock), 4. Functional Requirements

### Community 12 - "Tokens — Spacing & Shapes"
Cohesion: 0.40
Nodes (5): Border Radius, Layout, Shadows, Spacing Scale, Tokens — Spacing & Shapes

### Community 13 - "Declaración y Desglose de Costos en AWS"
Cohesion: 0.50
Nodes (3): 1. Costo Real Durante el Hackathon (3 Días de Evento), 2. Proyección de Costo Operativo Mensual en Producción (Municipio / COE de Manta), Declaración y Desglose de Costos en AWS

## Knowledge Gaps
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Column — Style Reference` connect `Column — Style Reference` to `Tokens — Spacing & Shapes`, `Components`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Why does `Components` connect `Components` to `Column — Style Reference`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `Column — Style Reference` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Why does `PRD: Operación Cortafuegos Manta (Track B · La Plaga Zombie · SpookyThon 2026)` connect `PRD: Operación Cortafuegos Manta (Track B · La Plaga Zombie · SpookyThon 2026)` to `4. Functional Requirements`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Should `typing` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `PRD: Operación Cortafuegos Manta (Track B · La Plaga Zombie · SpookyThon 2026)` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._