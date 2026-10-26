# Plan de Implementación — Fase 1: Construcción de la Red Social Multicapa de Manta

**Referencia PRD:** [prd-operacion-cortafuegos-manta.md](./prd-operacion-cortafuegos-manta.md) (Secciones 4.1 FR-02, FR-03 y 7.1)  
**Plan Central:** [tasks-operacion-cortafuegos-manta.md](./tasks-operacion-cortafuegos-manta.md)

## Relevant Files

- `src/engine/graph_manta.py` - Módulo principal que construye la red social multicapa determinista de Manta (`build_manta_multilayer_network`), definiendo las 5 parroquias urbanas con pesos INEC, los 5 hubs de superpropagación, las listas de adyacencia diurna ($G_D$) y nocturna ($G_N$), y el puntaje de centralidad puente (`bridge_score`).
- `src/engine/__init__.py` - Exportación limpia de constructores y constantes del motor epidemiológico.
- `tests/test_graph_manta.py` - Suite de pruebas unitarias para validar determinismo por semilla, proporciones demográficas INEC, grados medios diurno/nocturno y estructura de datos del grafo.

### Notes

- **Determinismo estricto:** Todas las decisiones estocásticas al construir el grafo (asignación de parroquia, hogar, rol, hub diurno y conexiones vecinales) deben utilizar una única instancia local `rng = np.random.default_rng(seed)` sin tocar el estado global de `random` ni `np.random`.
- **Rendimiento en AWS Lambda:** Para $N = 1,500$ a $5,000$ nodos, la construcción de la red debe tardar $< 150\text{ ms}$ en CPU ARM64 y cachearse en memoria RAM del proceso Lambda mediante un diccionario `_NETWORK_CACHE[(n_nodes, seed)]` para que las $M$ corridas de Monte Carlo reutilicen la topología base instantáneamente.
- **Comandos de prueba:** Ejecutar `python -m unittest tests/test_graph_manta.py -v` para validar esta fase.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Crear y cambiarse a la rama de la Fase 1 (`git checkout -b feature/fase-1-red-multicapa-manta` o trabajar sobre la rama principal de feature `feature/operacion-cortafuegos-manta`).
  - [ ] 0.2 Asegurar que exista el directorio `tests/` con un archivo `tests/__init__.py` vacío.

- [ ] 1.0 Definir el catálogo demográfico de las 5 parroquias urbanas de Manta (INEC) y los 5 Hubs críticos
  - [ ] 1.1 Declarar en `src/engine/graph_manta.py` el diccionario constante `MANTA_PARISHES` con las 5 parroquias urbanas, sus códigos identificadores, nombres oficiales, peso demográfico según el Censo INEC (suma exacta $= 1.0$) y coordenadas relativas $(x, y) \in [0, 1]^2$:
    - `tarqui`: nombre `"Tarqui"`, peso `0.38`, centroide base `(0.54, 0.52)`.
    - `eloy_alfaro`: nombre `"Eloy Alfaro"`, peso `0.24`, centroide base `(0.62, 0.72)`.
    - `manta_centro`: nombre `"Manta Centro"`, peso `0.22`, centroide base `(0.36, 0.44)`.
    - `los_esteros`: nombre `"Los Esteros"`, peso `0.11`, centroide base `(0.68, 0.36)`.
    - `san_mateo`: nombre `"San Mateo"`, peso `0.05`, centroide base `(0.16, 0.78)`.
  - [ ] 1.2 Declarar en `src/engine/graph_manta.py` el diccionario constante `MANTA_HUBS` con los 5 concentradores de contagio diurno:
    - `uleam`: `"ULEAM (Ciudadela Universitaria)"`, parroquia `"manta_centro"`, radio de atracción interparroquial alto, peso de contacto base `1.30`.
    - `mercado_tarqui`: `"Mercado Central de Tarqui"`, parroquia `"tarqui"`, alta densidad comercial, peso de contacto base `1.45`.
    - `mercado_central`: `"Mercado Central de Manta"`, parroquia `"manta_centro"`, peso de contacto base `1.25`.
    - `empacadoras`: `"Zona Industrial / Empacadoras Los Esteros"`, parroquia `"los_esteros"`, turnos laborales cerrados, peso de contacto base `1.35`.
    - `terminal_terrestre`: `"Terminal Terrestre Luis Valdivieso Morán"`, parroquia `"eloy_alfaro"`, nodo de tránsito interparroquial, peso de contacto base `1.40`.
  - [ ] 1.3 Definir el catálogo de roles poblacionales (`ROLES_CONFIG`) con sus probabilidades y factor de movilidad entre parroquias:
    - `estudiante` (22%): concurre principalmente a `uleam` o colegios barriales.
    - `comerciante` (18%): alta presencia en `mercado_tarqui` y `mercado_central`.
    - `transportista` (10%): choferes de buses urbanos y taxis; conectan múltiples hubs y parroquias durante el día (nodos puente por excelencia).
    - `obrero_atunero` (20%): concentrados en `empacadoras` y puerto.
    - `residente` (30%): movilidad local dentro de su parroquia y mercado cercano.

- [ ] 2.0 Generar la población sintética de agentes y agruparlos en hogares (Clústeres Familiares)
  - [ ] 2.1 En `build_manta_multilayer_network(n_nodes: int = 1200, seed: int = 2026)`, inicializar `rng = np.random.default_rng(seed)` y validar que `n_nodes >= 100`.
  - [ ] 2.2 Asignar a cada nodo $i \in \{0, \dots, n_nodes-1\}$ su parroquia de residencia muestreando con `rng.choice` según los pesos de `MANTA_PARISHES`.
  - [ ] 2.3 Agrupar los nodos de una misma parroquia en hogares (`household_id`) de tamaño aleatorio entre 3 y 6 personas (`rng.integers(3, 7)`), reflejando la estructura familiar de Manabí.
  - [ ] 2.4 Asignar a cada nodo su rol social (`role`), sus coordenadas espaciales individuales $(x_i, y_i)$ añadiendo jitter gaussiano alrededor del centroide de su parroquia, y el Hub primario (`primary_hub`) al que asiste durante el día según su rol y cercanía parroquial.

- [ ] 3.0 Construir la Capa Nocturna ($G_N$): Hogares y Vecindarios Barriales
  - [ ] 3.1 Inicializar las estructuras de adyacencia nocturna para que el simulador pueda iterar vectorialmente o por listas rápidas: `night_neighbors` (lista de arrays de vecinos por nodo) y `night_weights` (lista de arrays `float32` con el peso de transmisión $w_{ij}^{(N)}$).
  - [ ] 3.2 Conectar en **clique completo (todos con todos)** a los integrantes de un mismo `household_id` con peso nocturno estrecho $w_{ij}^{(N)} \in [0.85, 1.0]$.
  - [ ] 3.3 Añadir entre 2 y 4 aristas vecinales nocturnas por hogar hacia hogares cercanos de la **misma parroquia** (simulando convivencia barrial en la calle/tienda de barrio al anochecer) con peso moderado $w_{ij}^{(N)} \in [0.25, 0.45]$.

- [ ] 4.0 Construir la Capa Diurna ($G_D$): Hubs Laborales/Educativos, Mercados y Rutas de Bus
  - [ ] 4.1 Inicializar las estructuras de adyacencia diurna: `day_neighbors`, `day_weights` y `day_edge_hub` (identificador del Hub asociado a cada arista diurna, necesario para que cuando la Defensa 1 cierre o fumigue un Hub se reduzca un 85%–90% el peso de transmisión únicamente en las aristas de ese Hub).
  - [ ] 4.2 Para cada uno de los 5 Hubs en `MANTA_HUBS`, tomar el subconjunto de nodos que asisten a dicho Hub y generar una red de contacto de mundo pequeño (tipo Watts-Strogatz / grupos de trabajo y aulas + contactos aleatorios de pasillo/mercado) con grado diurno medio entre 6 y 12 contactos y peso modulado por el multiplicador del Hub.
  - [ ] 4.3 Modelar la red de transporte público (buses urbanos de Manta): conectar a los nodos con rol `transportista` con pasajeros de distintas parroquias que viajan hacia `uleam`, `mercado_tarqui`, `empacadoras` y `terminal_terrestre`, formando los puentes interparroquiales rápidos.

- [ ] 5.0 Calcular métricas estructurales de grafo y Centralidad Puente (`bridge_score`)
  - [ ] 5.1 Para cada nodo $u$, calcular su **grado ponderado diurno**, el **número de parroquias distintas** a las que están conectados sus vecinos diurnos (diversidad interparroquial) y un bono por rol estratégico (`transportista` y `comerciante`).
  - [ ] 5.2 Combinar estas métricas en un vector `bridge_score` de longitud `n_nodes` (`np.ndarray` de tipo `float32` normalizado en $[0.0, 1.0]$), de forma que el cálculo sea $O(N + E)$ instantáneo sin bloquear la Lambda con un `nx.betweenness_centrality` cúbico.
  - [ ] 5.3 Implementar un caché en memoria a nivel de módulo (`_GRAPH_CACHE`) indexado por `(int(n_nodes), int(seed))` con límite de 8 entradas (LRU simple) para que las llamadas sucesivas con la misma semilla retornen en $< 1\text{ ms}$.

- [ ] 6.0 Verificación y Pruebas Unitarias de la Fase 1
  - [ ] 6.1 Crear `tests/test_graph_manta.py` con casos de prueba para:
    - Igualdad exacta de todas las listas de adyacencia y `bridge_score` al invocar dos veces `build_manta_multilayer_network(1000, seed=2026)`.
    - Diferencia topológica verificable al cambiar la semilla (`seed=2026` vs `seed=9999`).
    - Proporción de nodos en `tarqui` entre 33% y 43% (alrededor del 38% oficial INEC).
    - Presencia de los 5 hubs y verificación de que todas las aristas sean simétricas y con pesos positivos.
  - [ ] 6.2 Ejecutar `python -m unittest tests/test_graph_manta.py -v` y confirmar que todas las pruebas pasen sin errores.
