# PRD: Operación Cortafuegos Manta (Track B · La Plaga Zombie · SpookyThon 2026)

## 1. Introduction / Overview

### 1.1 Contexto y Problemática
En el marco de la misión **SpookyThon 2026 (Track B)**, una plaga biológica ficticia inspirada en dinámicas virales reales (como dengue y COVID-19) se propaga por el cantón **Manta, Manabí, Ecuador**. El brote inicia con casos aislados y se transmite a través del contacto interpersonal en entornos diurnos (hubs de alta afluencia como la ULEAM, el Mercado de Tarqui, el Mercado Central, empacadoras de atún y buses) y nocturnos (hogares y clústeres barriales).

Las autoridades de salud y el Comité de Operaciones de Emergencia (COE) de Manta enfrentan severas restricciones:
- No existen vacunas suficientes para toda la población.
- Es inviable confinar toda la ciudad sin colapsar la economía local.
- Los recursos (dosis de vacuna, brigadas sanitarias de aislamiento y presupuesto de fumigación) llegan día a día de forma limitada.

### 1.2 Objetivo del Producto
Construir una plataforma web y motor analítico epidemiológico llamado **"Operación Cortafuegos Manta"**. El sistema simula la propagación día a día sobre una **red social multicapa realista de Manta**, optimiza la asignación de recursos limitados mediante un algoritmo voraz de **Retorno Marginal de Inversión (ROI por dólar)** con tres defensas combinadas (*Escudo Manta*), y demuestra cuantitativamente cuántas vidas se salvan frente a dos líneas base obligatorias:
1. **Línea Base 1:** No hacer nada (propagación descontrolada).
2. **Línea Base 2:** Intervención al azar con exactamente el mismo presupuesto y recursos.

El sistema opera en **modo híbrido**: desplegado en **AWS Serverless** (API Gateway, Step Functions Express, Lambda Graviton2, DynamoDB, S3, Bedrock y AWS Budget) con capacidad de conmutación a un **servidor Python local** para garantizar tolerancia absoluta a fallos de conectividad en la defensa en vivo (ULEAM).

---

## 2. Goals (Objetivos Medibles)

1. **Rigor Epidemiológico y Red Realista:** Modelar una red multicapa representativa de Manta con al menos 1,000 a 5,000 nodos calibrados con pesos demográficos del INEC para las 5 parroquias urbanas (Tarqui, Eloy Alfaro, Manta Centro, Los Esteros, San Mateo) y sus 5 hubs principales.
2. **Defensas Combinadas (Nivel Pro):** Implementar la estrategia *"Escudo Manta"* combinando:
   - *El Escudo:* Vacunación inteligente exclusiva para nodos Sanos (priorizando anillo de contacto y nodos puente).
   - *La Lanza:* Brigadas de aislamiento y antídoto para superpropagadores infecciosos activos.
   - *La Red:* Cortafuegos temporal o fumigación en hubs críticos con mayor riesgo de contagio masivo.
3. **Optimización con Restricción de Presupuesto:** Administrar un presupuesto financiero global y una tasa de entrega diaria de recursos, decidiendo en cada día $t$ la combinación de intervenciones que maximice el número de contagios evitados por cada dólar invertido.
4. **Superioridad Demostrada vs. Líneas Base:** Superar en al menos un **35% a 60%** la cantidad de vidas salvadas/no contagiadas frente a la intervención aleatoria en un ensamble de Monte Carlo ($M \ge 30$ corridas).
5. **Capacidad de Respuesta ante Brote Sorpresa:** Permitir al jurado modificar parámetros arbitrarios en vivo (ej. $2\times$ tasa de contagio, $-50\%$ vacunas, brote localizado en Mercado Tarqui, efectividad reducida al 50%) mediante controles libres y recalcular la simulación completa en menos de **5 segundos**.
6. **Reproducibilidad Matemática Estricta:** Asegurar que dada una misma semilla pseudoaleatoria (`seed`) y los mismos parámetros, el resultado sea determinista e idéntico tanto en AWS como en local.
7. **Control Financiero en la Nube:** Operar la solución completa con un costo proyectado menor a **$0.05 USD** durante el hackathon y un costo mensual menor a **$2.00 USD/mes** en producción, protegido con un AWS Budget de **$5.00 USD**.

---

## 3. User Stories

### US-01: Simulación y Comparación de Estrategias (Comité de Emergencia)
- **Como:** Miembro del Comité de Operaciones de Emergencia (COE) de Manta.
- **Quiero:** Ejecutar una simulación epidemiológica definiendo los parámetros de la plaga y el presupuesto disponible.
- **Para:** Comparar gráficamente la curva de contagios día a día de la estrategia *Cortafuegos Manta* contra *No Intervenir* e *Intervención al Azar*, conociendo con certeza cuántas personas se salvaron.

### US-02: Calibración Rápida ante el "Brote Sorpresa" (Jurado Técnico)
- **Como:** Jurado de la misión SpookyThon 2026.
- **Quiero:** Cambiar libremente la semilla, duplicar la tasa de transmisión, reducir las vacunas a la mitad o cambiar el punto de inicio del brote a un hub específico.
- **Para:** Comprobar en menos de 5 minutos si la estrategia sigue siendo robusta, matemáticamente consistente y no se rompe ante variaciones imprevistas.

### US-03: Visualización Espacial del Avance Territorial (Analista de Salud Pública)
- **Como:** Analista de datos de salud pública.
- **Quiero:** Observar un mapa interactivo de Manta fiel a la geografía real, con un control deslizante temporal (día 0 al día 30).
- **Para:** Ver cómo la plaga se expande por las parroquias y cómo las intervenciones (aislamiento de hubs, vacunación de anillos y brigadas) frenan el avance espacial.

### US-04: Boletín Ejecutivo para la Alcaldía (Alcalde de Manta)
- **Como:** Alcalde de Manta.
- **Quiero:** Hacer clic en "Generar Boletín de Emergencia" y recibir un resumen de 3 párrafos en lenguaje no técnico con directivas operativas concretas (ej. "Cerrar Mercado Tarqui los días 4 y 5", "Priorizar vacunación de transportistas en Eloy Alfaro").
- **Para:** Tomar decisiones ejecutivas de política pública sin tener que interpretar matrices epidemiológicas complejas.

### US-05: Resiliencia de Presentación en Vivo (Equipo Expositor)
- **Como:** Expositores en el auditorio de la ULEAM.
- **Quiero:** Disponer de un interruptor en pantalla para alternar entre el API Gateway de AWS y el servidor local en Python.
- **Para:** Garantizar una demostración en vivo fluida, instantánea y sin riesgo de microcortes de Internet.

---

## 4. Functional Requirements

### 4.1 Modelo Epidemiológico y Red Multicapa de Manta
- **FR-01:** El sistema debe implementar un modelo estocástico de estados discretos **SEIR-VQ** adaptado a la plaga zombie:
  - 🟢 **Sano / Susceptible ($S$):** Expuesto al contagio.
  - 🟡 **Mordido / Expuesto ($E$):** En período de incubación (duración $\tau_{inc}$ días; no transmite aún o transmisión reducida).
  - 🔴 **Zombie / Infeccioso ($I$):** Contagia activamente a sus contactos según el peso de las aristas.
  - 🟣 **Aislado / Cuarentena ($Q$):** Contenido por una brigada sanitaria; no transmite ni recibe nuevos contactos.
  - 🔵 **Exorcizado / Inmune ($R$ o $V$):** Inmunizado por vacuna exitosa o antídoto; no susceptible a nuevas mordeduras.
- **FR-02:** El grafo de contactos debe ser **multicapa** con alternancia día/noche:
  - **Capa Diurna ($G_D$):** Nodos conectados a través de 5 Hubs de alta interacción (ULEAM, Mercado Tarqui, Mercado Central, Empacadoras de Atún, Terminal Terrestre) y líneas de transporte interparroquial.
  - **Capa Nocturna ($G_N$):** Conexiones de corto alcance dentro de núcleos familiares y manzanas barriales en las 5 parroquias (Tarqui: 38%, Eloy Alfaro: 24%, Manta Centro: 22%, Los Esteros: 11%, San Mateo: 5%).
- **FR-03:** Los nodos deben contar con atributos explícitos: `id`, `parroquia`, `rol` (estudiante, comerciante, transportista, obrero, residente), `estado_actual`, `dia_infeccion` y `es_hub`.

### 4.2 Defensas Combinadas y Optimización por Presupuesto (*Escudo Manta*)
- **FR-04:** El sistema debe gestionar un modelo de recursos con:
  - **Presupuesto Financiero Total ($B_{total}$)** y tasa de inyección diaria ($B_{dia}$).
  - Costo unitario por acción: Vacuna ($c_v$), Brigada de aislamiento ($c_b$), Cierre/Fumigación de Hub por día ($c_h$).
- **FR-05 (Defensa 1 - El Escudo: Vacunación Anillo + Puente):**
  - **Filtro estricto:** Solo se pueden vacunar nodos en estado 🟢 **Sano**. Prohibido aplicar dosis a nodos 🟡, 🔴, 🟣 o 🔵.
  - Priorización heurística calculada como:
    $$\text{Score}(u) = \alpha \cdot \text{ProximidadBrote}(u) + \beta \cdot \text{CentralidadPuente}(u)$$
  - Cada dosis tiene una efectividad $\eta_{vac} \in [0, 1]$ (en éxito pasa a 🔵 Inmune; si falla permanece 🟢 Sano).
- **FR-06 (Defensa 2 - La Lanza: Brigada de Aislamiento / Antídoto):**
  - Identifica a los nodos 🔴 **Zombies** con mayor grado de vecinos sanos expuestos hoy ($\max \sum_{v \in N(u)} \mathbb{I}(S_v = \text{Sano})$).
  - Al aplicar la brigada, el nodo pasa a 🟣 Aislado (o 🔵 con antídoto), cancelando inmediatamente su capacidad de transmisión.
- **FR-07 (Defensa 3 - La Red: Cortafuegos / Fumigación en Hubs):**
  - Si un Hub supera un umbral de prevalencia o alerta en su área de influencia, se puede aplicar cierre temporal o fumigación.
  - La intervención reduce entre un 80% y 95% el peso de transmisión de todas las aristas diurnas que convergen en dicho Hub durante el día activo.
- **FR-08 (Optimizador de ROI Marginal):**
  - En cada día $t$, con el saldo presupuestario disponible, el algoritmo voraz evalúa el impacto marginal esperado de cada defensa y asigna recursos priorizando la acción con mayor reducción esperada de contagios por dólar invertido.

### 4.3 Líneas Base Obligatorias y Ensamble Monte Carlo
- **FR-09:** Por cada ejecución solicitada, el motor debe computar simultáneamente:
  1. **Estrategia A (Sin Intervención):** Propagación libre con gasto $0.
  2. **Estrategia B (Intervención al Azar):** Mismo presupuesto y llegada de recursos que la estrategia A, pero asignando vacunas a nodos aleatorios (respetando la regla de no vacunar infectados) y cerrando hubs al azar.
  3. **Estrategia C (Cortafuegos Manta):** Optimización inteligente multidefensa.
- **FR-10:** El motor debe ejecutar un ensamble de Monte Carlo con $M$ corridas independientes ($M \ge 30$, parametrizable hasta 100 en la UI) usando semillas derivadas determinísticamente:
  $$\text{run\_seed}_k = \text{hash}(\text{base\_seed}, k)$$
- **FR-11:** El sistema debe consolidar y retornar para cada estrategia y día $t$:
  - Promedio de Sanos, Mordidos, Zombies, Aislados y Recuperados.
  - Bandas de dispersión percentiles: P10, P50 (mediana) y P90.
  - Métricas agregadas de impacto: **Vidas Salvadas netas** ($\text{Infectados}_{\text{Azar}} - \text{Infectados}_{\text{Cortafuegos}}$) y **Costo por Vida Salvada**.

### 4.4 Reproducibilidad y Caché Determinista
- **FR-12:** Dada una combinación idéntica de `(base_seed, n_nodes, beta, gamma, vacunas, presupuesto, start_hub)`, el sistema debe generar una clave hash determinista (`sim_hash`).
- **FR-13:** El backend debe verificar si `sim_hash` existe en **Amazon DynamoDB** (o almacenamiento local en memoria). De existir, debe responder inmediatamente sin recomputar (tiempo $< 100$ ms).

### 4.5 Arquitectura Serverless e Híbrida (AWS + Local)
- **FR-14:** En AWS, el orquestador principal (`POST /simulate`) debe distribuir los lotes de Monte Carlo a través de **AWS Step Functions Express Workflow** invocando en paralelo las funciones **AWS Lambda Workers** (`arm64`, Python 3.12, NumPy, NetworkX).
- **FR-15:** Las series temporales detalladas por nodo/parroquia para la animación deben guardarse en un bucket **Amazon S3** con regla de ciclo de vida de expiración a 14 días.
- **FR-16:** El repositorio debe incluir un servidor local HTTP ligero (`src/local_server.py`) que implemente la misma interfaz REST (`/health`, `/simulate`, `/mayor-report`) para desarrollo y respaldo de contingencia offline.
- **FR-17:** La interfaz web debe contar con un conmutador visible en el header para alternar entre el endpoint en la nube de AWS y el servidor local.

### 4.6 Interfaz de Usuario y Mapa Fiel de Manta
- **FR-18 (Panel de Parámetros Libres):** Controles deslizantes (sliders) e inputs numéricos sin bloqueos para:
  - Tasa de transmisión diurna y nocturna ($\beta$).
  - Período de incubación ($\tau_{inc}$) y duración de fase infecciosa ($\gamma$).
  - Cantidad diaria de vacunas, brigadas y presupuesto disponible.
  - Eficacia de la vacuna ($\eta_{vac} \in [0.1, 1.0]$).
  - Epicentro inicial (selección de Hub o Parroquia específica de inicio).
  - Semilla pseudoaleatoria (`seed`) y número de réplicas Monte Carlo ($M$).
- **FR-19 (Gráficas Epidemiológicas):**
  - Curvas de evolución temporal con área sombreada P10-P90 comparando las tres estrategias.
  - Tarjetas resumen con métricas clave destacadas: "Vidas Salvadas", "Pico Zombie Evitado", "Presupuesto Ejecutado", "Eficacia de Inversión ($/vida)".
- **FR-20 (Mapa Fiel de Manta con Scrubber Temporal):**
  - Mapa vectorial renderizado con las geometrías de las 5 parroquias urbanas de Manta obtenidas de cartografía real (OpenStreetMap / INEC).
  - Ubicación geográfica precisa de los 5 Hubs principales mediante marcadores temáticos.
  - Barra de reproducción temporal (Play, Pausa, Reset, Slider día a día de 0 a 30) que coloree cada parroquia y hub según la densidad de zombies y muestre los anillos de vacunación aplicados.

### 4.7 Boletín Ejecutivo para el Alcalde (Amazon Bedrock)
- **FR-21:** La interfaz debe incluir el botón *"Generar Boletín de Emergencia para el Alcalde"*.
- **FR-22:** El backend (`POST /mayor-report`) debe consumir **Amazon Bedrock** utilizando el modelo `amazon.nova-micro-v1:0` (o Anthropic Claude 3 Haiku) mediante un prompt que transforme los datos numéricos de la simulación en un informe de 3 secciones en lenguaje llano:
  1. *Situación Actual:* Gravedad del brote y vidas en riesgo inmediato.
  2. *Acciones Críticas del Día:* Dónde enviar las vacunas y qué hubs cerrar hoy.
  3. *Balance de Recursos:* Rendimiento del presupuesto ejecutado.
- **FR-23 (Fallback Heurístico Local):** Si Bedrock no está disponible (error 4xx/5xx, timeout o ejecución local sin credenciales AWS), la función debe retornar una plantilla estructurada determinista con los datos inyectados, garantizando que el usuario siempre reciba un boletín válido en pantalla.

---

## 5. Non-Goals (Out of Scope)

1. **Modelado Individual de Micro-Movilidad GPS:** No se rastrearán trayectorias continuas por segundo de cada persona mediante GPS; la interacción se modela a nivel de grafos de contacto discreto día/noche.
2. **Autenticación Multi-Usuario y Roles Complejos:** No se implementará Amazon Cognito ni login con contraseñas para el evento; el acceso al portal es público o protegido mediante API Key unificada.
3. **Persistencia Permanente Indefinida de Simulaciones:** Los resultados en S3 expiran en 14 días y las entradas de DynamoDB cuentan con TTL para mantener el costo en $0.00 USD.
4. **Entrenamiento de Redes Neuronales Pesadas en la Nube:** No se entrenarán modelos pesados con SageMaker ni instancias GPU; la optimización se resuelve analíticamente mediante grafos y heurísticas de centralidad sobre CPU Graviton2 ARM64.

---

## 6. Design Considerations

### 6.1 Extracción de Geometría Fiel de Manta (OpenStreetMap / INEC)
Para garantizar 100% de fidelidad geográfica con el mapa real de Manta solicitado por el usuario:
- **Herramienta de extracción:** Se utilizará la API de **Overpass Turbo** / **OpenStreetMap** consultando la relación administrativa del cantón Manta (`boundary=administrative`, `admin_level=8/9` para parroquias urbanas de Ecuador):
  - *Tarqui* (OSM Way/Relation)
  - *Eloy Alfaro* (OSM Way/Relation)
  - *Manta Centro* (OSM Way/Relation)
  - *Los Esteros* (OSM Way/Relation)
  - *San Mateo* (OSM Way/Relation)
- **Conversión a SVG/GeoJSON liviano:** El GeoJSON obtenido se simplifica mediante **Mapshaper** (tolerancia de simplificación 5% para reducir el payload a $< 80$ KB) y se proyecta a coordenadas SVG estándar (`viewBox="0 0 800 600"`) para que el componente React lo renderice con etiquetas interactivas y hover states.
- **Coordenadas de Hubs Reales:**
  - *ULEAM:* `[-0.9536, -80.7465]`
  - *Mercado Tarqui:* `[-0.9572, -80.7078]`
  - *Mercado Central:* `[-0.9482, -80.7225]`
  - *Empacadoras (Zona Los Esteros):* `[-0.9410, -80.7010]`
  - *Terminal Terrestre (El Palmar):* `[-0.9630, -80.6890]`

### 6.2 Diseño de Interfaz de Usuario (UI/UX)
- **Tema:** Estética moderna *"Control de Crisis Epidemiológica"* con fondo oscuro (`#0b0f19`, slate-950) y acentos contrastantes:
  - 🟢 Verde esmeralda (`#10b981`): Población Sana y Vacunada.
  - 🟡 Ámbar (`#f59e0b`): Expuestos / Mordidos.
  - 🔴 Carmesí / Rojo Zombie (`#ef4444`): Infectados activos.
  - 🟣 Púrpura (`#a855f7`): Aislados / Cuarentena.
  - 🔵 Azul cian (`#06b6d4`): Inmunes / Exorcizados.
- **Disposición en Pantalla (Grid de 3 Columnas):**
  - **Columna Izquierda:** Panel de Parámetros Libres (deslizadores, epicentro inicial, presupuesto y conmutador AWS/Local).
  - **Columna Central:** Visualizador de Manta (Mapa SVG interactivo con scrubber día a día, marcadores de hubs y capas de calor por parroquia).
  - **Columna Derecha:** Dashboard de Resultados (Gráficas de curvas SEIR comparativas P10-P90, métricas de vidas salvadas y botón del Boletín del Alcalde).

---

## 7. Technical Considerations

### 7.1 Estructura del Grafo y Motor en Python (`src/engine/`)
- **Tecnologías:** Python 3.12, NumPy, NetworkX.
- **Representación:** Matrices dispersas CSR o listas de adyacencia vectorizadas para permitir transiciones de estado en menos de 10 ms por iteración diaria.
- **Separación de Capas:**
  ```python
  # Estructura de la red en graph_manta.py
  network = {
      "nodes": [...],           # metadata: id, parish, role, coords
      "day_adj": [...],         # aristas diurnas (hubs, buses)
      "night_adj": [...],       # aristas nocturnas (hogar, barrio)
      "hubs": {                 # subgrafos de hubs para cortafuegos
          "uleam": [...],
          "mercado_tarqui": [...],
          ...
      }
  }
  ```

### 7.2 Infraestructura AWS Serverless (`infra/template.yaml`)
- **API Gateway HTTP API:** Endpoint de ultra-baja latencia con CORS abierto para el frontend.
- **AWS Step Functions (Express Workflow):** Orquestación paralela con estado `Map` (`MaxConcurrency: 40`) que distribuye las $M$ réplicas entre instancias concurrentes de Lambda Worker.
- **Amazon DynamoDB:** Modo `PAY_PER_REQUEST`. Llave primaria `sim_hash` (string SHA256 de parámetros). TTL activado.
- **Amazon Bedrock:** Invocación con `boto3.client('bedrock-runtime')` y fallback a generador local si se produce `ClientError` o falta de permisos en la cuenta.
- **AWS Budgets:** Presupuesto de $5.00 USD con notificación SNS/Email al 50% y 80%.

### 7.3 Modo Híbrido (`src/local_server.py`)
- Servidor ligero basado en `http.server` o `FastAPI/Uvicorn` que importa directamente `src.engine.simulator` y `src.handlers.mayor_report`.
- El frontend React detecta el endpoint configurado mediante variable de entorno `VITE_API_URL` o el selector en la barra de navegación (Header):
  - Opción 1: `AWS Cloud (us-east-1)`
  - Opción 2: `Local Python Server (localhost:8000)`

---

## 8. Success Metrics

1. **Eficacia de Contención:** La estrategia *Cortafuegos Manta* debe salvar entre **35% y 70%** más población que la estrategia aleatoria bajo idénticas restricciones de recursos.
2. **Latencia de Respuesta en Brote Sorpresa:** Tiempo total de ejecución y renderizado $< 5$ segundos para $M = 30$ simulaciones.
3. **Reproducibilidad Exacta:** Correr dos veces la misma semilla debe arrojar una desviación estándar de diferencia exactamente igual a $0.000$.
4. **Cero Violaciones de Reglas de Vacunación:** 0% de vacunas aplicadas a individuos infectados o inmunes en todos los reportes.
5. **Costo Operativo en Hackathon:** Gasto consolidado en AWS $< \$0.10$ USD tras cientos de ejecuciones de prueba.

---

## 9. Open Questions & Decision Log

| # | Pregunta / Aspecto Técnico | Estado | Decisión Acordada |
|---|---|---|---|
| 1 | ¿Qué modelo epidemiológico utilizar? | Resuelto | SEIR-VQ estocástico en red multicapa (Sanos, Mordidos, Zombies, Aislados, Exorcizados/Vacunados). |
| 2 | ¿Cómo responder a la prueba "Brote Sorpresa"? | Resuelto | Controles deslizantes e inputs libres en UI sin presets rígidos para adaptarse a cualquier variable que el jurado proponga. |
| 3 | ¿Cómo mitigar riesgo de red en la ULEAM? | Resuelto | Modo dual: Desplegado en AWS con fallback conmutable al vuelo a `src/local_server.py`. |
| 4 | ¿Cómo garantizar fidelidad del mapa de Manta? | Resuelto | Extracción de límites de las 5 parroquias vía Overpass Turbo (OpenStreetMap) simplificado con Mapshaper a SVG. |
| 5 | ¿Cómo manejar el reporte del Alcalde sin internet o cuota Bedrock? | Resuelto | Endpoint con fallback estructurado que genera el reporte con métricas reales si Bedrock falla. |
