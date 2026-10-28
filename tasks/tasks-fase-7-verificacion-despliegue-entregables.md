# Plan de Implementación — Fase 7: Verificación Integral, Reproducibilidad, Despliegue AWS y Documentación de Entregables

**Referencia PRD:** [prd-operacion-cortafuegos-manta.md](./prd-operacion-cortafuegos-manta.md) (Secciones 8 y 9 + Reglas y Entregables SpookyThon 2026)  
**Plan Central:** [tasks-operacion-cortafuegos-manta.md](./tasks-operacion-cortafuegos-manta.md)

## Relevant Files

- `README.md` - Documentación oficial en la raíz del repositorio con todos los puntos exigidos por la rúbrica de SpookyThon 2026 (escenario, modelo matemático SEIR-VQ, supuestos y calibración INEC/MSP, semilla y parámetros por defecto para reproducibilidad, estrategia *Escudo Manta*, arquitectura AWS, costos y captura del AWS Budget).
- `docs/costos.md` - Declaración detallada de costos en AWS durante el hackathon y proyección mensual en operación continua para el Municipio de Manta.
- `docs/arquitectura.svg` - Diagrama de arquitectura serverless en AWS (`us-east-1`).
- `docs/flujo_defensas.svg` - Diagrama del algoritmo diario de optimización marginal con las 3 defensas combinadas.
- `docs/mapa_mental.svg` - Mapa conceptual del sistema *Operación Cortafuegos Manta*.
- `docs/budget.svg` - Captura/representación verificable de la configuración del AWS Budget ($5.00 USD) con alertas al 50% y 80%.
- `infra/template.yaml` - Plantilla AWS SAM validada lista para desplegar en `us-east-1`.
- `scripts/deploy-aws.ps1` - Script automatizado de empaquetado y despliegue en AWS.
- `docker-compose.yml` - Orquestación en contenedores locales (Backend Python + Frontend Nginx) para pruebas portables.

### Notes

- **Lista de Verificación del Jurado (Lo que el jurado va a buscar en la Prueba de Fuego):**
  1. *¿Muestran una sola simulación o muchas?* → Mostramos $M=30$ (configurable hasta 100) corridas Monte Carlo con promedios y bandas P10–P90.
  2. *¿Tienen las dos líneas base obligatorias?* → Sí, cada ejecución compara simultáneamente contra `Sin Intervención` e `Intervención al Azar` con exactamente el mismo presupuesto.
  3. *¿De dónde salen los números y parámetros?* → Documentados en el `README.md` con base en proporciones parroquiales del Censo INEC para Manta y tiempos epidemiológicos de arbovirosis/virus respiratorios en Manabí.
  4. *¿Vacunan a quien ya está infectado o es inmune?* → Jamás: el filtro `state == STATE_SANO` garantiza `0` vacunas desperdiciadas, auditado en código y en tests.
  5. *¿Se rompe la estrategia con el 🎃 Brote Sorpresa?* → No: el optimizador de ROI marginal recalcula en cada día qué defensa rinde más por dólar; si la vacuna pierde eficacia o el contagio se duplica, el presupuesto migra automáticamente hacia Cortafuegos de Hubs y Brigadas de Aislamiento.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 *(Rama `feature/fase-7-verificacion-despliegue-entregables`, creada desde `main` en `b2e3c8b`.)* Ubicarse en la rama de implementación (`git checkout -b feature/fase-7-verificacion-despliegue-entregables` o continuar en `feature/operacion-cortafuegos-manta`).

- [x] 1.0 Ejecutar Pruebas Automatizadas de Rigor Matemático y Reproducibilidad
  - [x] 1.1 Ejecutar la suite completa de pruebas unitarias (`python -m unittest discover -s tests -p "test_*.py" -v`) verificando:
    - Determinismo exacto de `build_manta_multilayer_network` y `run_monte_carlo_ensemble` ante la semilla oficial `seed = 2026`.
    - `wasted_vaccines_count == 0` en todas las simulaciones.
    - Superioridad estadística de `shield` (*Cortafuegos Manta*) sobre `random` y `none`.
  - [x] 1.2 Ejecutar pruebas de estrés para los escenarios típicos del **🎃 Brote Sorpresa** (verificando que se completen en $< 3\text{ segundos}$ para $M=30$ réplicas):
    - *Escenario Sorpresa 1 (Doble de contagiosa):* `beta_day = 0.17`, `beta_night = 0.22`.
    - *Escenario Sorpresa 2 (Mitad de presupuesto/vacunas):* `daily_budget = 300`, `total_budget = 6000`.
    - *Escenario Sorpresa 3 (Variante resistente a vacuna):* `vaccine_efficacy = 0.40`.
    - *Escenario Sorpresa 4 (Brote en ULEAM o Terminal Terrestre):* `start_hub = "uleam"` / `"terminal_terrestre"`.

  **Resultados (27/10/2026, semilla 2026, 30 réplicas, 1 200 personas):**

  - **1.1:** `python -m unittest discover -s tests -p "test_*.py" -v` → **103 tests OK**. Cobertura: determinismo de la red (`test_same_seed_is_identical`), del ensamble (`test_deterministic_with_same_seed`, lotes desordenados y AWS = local en `test_handlers.py`); 0 vacunas desperdiciadas (`test_vaccine_candidates_are_only_sanos`, `test_zero_wasted_vaccines` y escenarios sorpresa); superioridad (`test_shield_beats_random_beats_none` con los parámetros oficiales). Además se comprobó a mano que `run_monte_carlo_ensemble({})` con la configuración oficial completa da exactamente el mismo resultado dos veces, recalculando la red.
  - **1.2:** todos los escenarios terminan en **menos de 1,1 s** en un portátil (red construida desde cero), con 0 vacunas desperdiciadas y el Escudo por delante de las dos líneas base:

    | Escenario | Tiempo | Sin intervenir | Azar | Escudo | Escudo vs azar |
    |---|---|---|---|---|---|
    | 1: contagio 0,17 / 0,22 (≈ 3,3 veces el base) | 1,02 s | 1 198 | 991 | 881 | 11% |
    | 2: presupuesto 300 / 6 000 $ | 0,97 s | 842 | 213 | 18 | 91% |
    | 3: eficacia 0,40 | 0,96 s | 842 | 65 | 26 | 59% |
    | 4a: inicio en ULEAM | 0,95 s | 757 | 31 | 13 | 59% |
    | 4b: inicio en Terminal Terrestre | 0,98 s | 905 | 52 | 12 | 77% |
    | Contagio ×2 documentado (0,10 / 0,14) | 0,99 s | 1 188 | 816 | 194 | 76% |
    | Mitad de vacunas (30 $) | 0,93 s | 842 | 85 | 22 | 75% |
    | Brote en Mercado Central | 0,98 s | 675 | 15 | 13 | 10% |
    | Vacuna a medias (0,5) | 0,97 s | 842 | 64 | 21 | 67% |

    *Nota:* los valores del escenario 1 (0,17 / 0,22) se escribieron antes de la calibración; con los betas actuales (0,05 / 0,07) equivalen a unas 3,3 veces el contagio base, no al doble. El "doble de contagiosa" documentado en el README es 0,10 / 0,14. Los márgenes más ajustados son el escenario 1 y el brote en el Mercado Central (10–11%).

- [x] 2.0 Verificar el Servidor Híbrido Local y el Build de Producción del Frontend
  - [x] 2.1 Compilar el frontend con `cd frontend && npm run build` y confirmar 0 errores de TypeScript (`tsc -b`) y generación limpia de assets en `frontend/dist/`.
  - [x] 2.2 Levantar `src/local_server.py` y realizar peticiones de humo a `GET /health`, `POST /simulate` y `POST /mayor-report` comprobando tiempos de respuesta, formato JSON y cabeceras CORS.

  **Resultados (27/10/2026):**

  - **2.1:** `tsc -b` sin errores y `npm run build` genera `dist/index.html`, `dist/assets/index-*.css` (44 KB) e `index-*.js` (931 KB; 280 KB comprimido). Vite avisa de que el JS pasa de 500 KB; no impide nada y dividirlo queda fuera de alcance.
  - **2.2:** 11 peticiones de humo contra `http://localhost:8010`, todas con JSON válido, `Content-Type: application/json` y las tres cabeceras CORS:

    | Petición | HTTP | Tiempo |
    |---|---|---|
    | `GET /health` (`execution_mode: local-hybrid`) | 200 | 20 ms |
    | `OPTIONS /simulate` y `OPTIONS /mayor-report` | 200 | 15 ms |
    | `POST /simulate` (calcula; 0 vacunas desperdiciadas) | 200 | 1,06 s |
    | `POST /simulate` (misma semilla → `cache_hit: true`) | 200 | 20 ms |
    | `GET /simulations/{hash}` | 200 | 3 ms |
    | `POST /mayor-report` con la simulación / solo con `sim_hash` | 200 | 39 / 14 ms |
    | Body inválido / hash inexistente / ruta inexistente | 400 / 404 / 404 | 15 ms |

    *Arreglo encontrado al verificar:* el servidor solo escuchaba en IPv4 (`0.0.0.0`) y en Windows `localhost` se resuelve primero como `::1`, así que cada petición por `localhost` tardaba ~2 s de más (0,2 s con curl). Ahora `src/local_server.py` escucha en IPv6 e IPv4 a la vez (`DualStackServer`) y, si el equipo no tiene IPv6, vuelve a IPv4.

- [x] 3.0 Documentar exhaustivamente el `README.md` según la Rúbrica Oficial de SpookyThon 2026
  - [x] 3.1 *(Sección "Qué hace el proyecto".)* Redactar en `README.md` la sección **1. Resumen Ejecutivo y Propuesta de Valor** explicando cómo *Operación Cortafuegos Manta* resuelve el problema real de asignación de recursos sanitarios limitados en Manta.
  - [x] 3.2 *(Ya cubierta por "Modelo epidemiológico": la plaga, la población y "Cómo se contagia" con las fórmulas λᵢ y pᵢ.)* Redactar la sección **2. Escenario, Población (INEC) y Modelo Matemático SEIR-VQ Multicapa** detallando las ecuaciones de fuerza de infección diurna/nocturna, los 5 estados y las fuentes de calibración demográfica de las 5 parroquias y 5 hubs.
  - [x] 3.3 *(Sección "Estrategia Escudo Manta", con `docs/flujo_defensas.svg` incrustado y enlace a `docs/mapa_mental.svg`. Se corrigieron en los SVG textos que no coincidían con el código: umbral de cierre, 80–95% y 85% en lugar de 88%, antídoto, cierres "al instante".)* Redactar la sección **3. Estrategia "Escudo Manta" (3 Defensas Combinadas + ROI Marginal)** e incrustar `docs/flujo_defensas.svg` y `docs/mapa_mental.svg`, explicando por qué nunca vacuna infectados/inmunes y cómo se adapta dinámicamente al **🎃 Brote Sorpresa**.
  - [x] 3.4 *("Parámetros por defecto y semilla" + tabla comparativa de las 3 estrategias con media, P10–P90, pico, gasto y acciones.)* Redactar la sección **4. Parámetros por Defecto y Semilla Oficial para Reproducibilidad (`seed = 2026`)** con la tabla comparativa de resultados obtenidos por las 3 estrategias (`Sin Intervención`, `Intervención al Azar`, `Cortafuegos Manta`).
  - [x] 3.5 *(Secciones "Arquitectura en AWS" (con `docs/arquitectura.svg` corregido: Leaflet, workers por lotes, Bedrock opcional), seguridad, "Costos" y "AWS Budget". `docs/costos.md` corregido: Lambda daba $0,40 y son $4,80; se añadieron orquestador y escrituras en S3; Bedrock a $0. **Pendiente del equipo:** gasto real de Cost Explorer y captura `docs/budget.png`.)* Redactar la sección **5. Arquitectura Serverless en AWS (`us-east-1`), Seguridad y Declaración de Costos**, enlazando `docs/arquitectura.svg`, `docs/costos.md` y la evidencia del AWS Budget de $5.00 USD.
  - [x] 3.6 *(Secciones "Cómo desplegarlo" (script, SAM, Amplify, Bedrock opcional) y "Cómo probarlo" (tests, calibrar.py, servidor local, Docker y prueba de fuego).)* Redactar la sección **6. Guía Paso a Paso de Pruebas Locales y Despliegue en AWS** (`sam build && sam deploy`, `scripts/deploy-aws.ps1`, `docker-compose up` y ejecución híbrida).

## Despliegue en AWS (27/10/2026)

- **Backend:** stack `spookython-cortafuegos-manta` en `us-east-1` (cuenta `341775378238`, usuario IAM `spookython-dev`), construido con `sam build --use-container`. API: `https://efrokac0z1.execute-api.us-east-1.amazonaws.com/prod`. Las 11 peticiones de humo responden bien (CORS con `Origin`: `access-control-allow-origin: *`); la simulación por defecto da los números del README.
- **Arreglo en AWS real:** la cuenta tiene 10 ejecuciones simultáneas de Lambda y el `Map` permitía 40, así que con 100 réplicas Step Functions fallaba por `TooManyRequestsException` y la petición daba 500. Ahora `MaxConcurrency` es 8 y hay reintentos con espera creciente para el 429: 100 réplicas × 90 días tardan 7 s.
- **Frontend:** primero se publicó con un despliegue manual (app `cortafuegos-manta`); después el equipo creó la app `cortafuegos-manta-web` **conectada a GitHub** (rama `main`, monorepo `frontend`, variable `VITE_API_URL`), que se despliega sola en cada push: https://main.d2rdluo4raik0f.amplifyapp.com. Verificado en el navegador: simulación, mapa y boletín contra AWS.
- **Pendiente manual:** captura del AWS Budget (`docs/budget.png`), gasto real de Cost Explorer en `docs/costos.md`, ampliar la cuota de concurrencia de Lambda (opcional) y borrar la app manual `cortafuegos-manta` (ya no se usa).
