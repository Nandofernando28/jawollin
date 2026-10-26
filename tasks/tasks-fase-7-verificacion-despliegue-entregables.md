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

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Ubicarse en la rama de implementación (`git checkout -b feature/fase-7-verificacion-despliegue-entregables` o continuar en `feature/operacion-cortafuegos-manta`).

- [ ] 1.0 Ejecutar Pruebas Automatizadas de Rigor Matemático y Reproducibilidad
  - [ ] 1.1 Ejecutar la suite completa de pruebas unitarias (`python -m unittest discover -s tests -p "test_*.py" -v`) verificando:
    - Determinismo exacto de `build_manta_multilayer_network` y `run_monte_carlo_ensemble` ante la semilla oficial `seed = 2026`.
    - `wasted_vaccines_count == 0` en todas las simulaciones.
    - Superioridad estadística de `shield` (*Cortafuegos Manta*) sobre `random` y `none`.
  - [ ] 1.2 Ejecutar pruebas de estrés para los escenarios típicos del **🎃 Brote Sorpresa** (verificando que se completen en $< 3\text{ segundos}$ para $M=30$ réplicas):
    - *Escenario Sorpresa 1 (Doble de contagiosa):* `beta_day = 0.17`, `beta_night = 0.22`.
    - *Escenario Sorpresa 2 (Mitad de presupuesto/vacunas):* `daily_budget = 300`, `total_budget = 6000`.
    - *Escenario Sorpresa 3 (Variante resistente a vacuna):* `vaccine_efficacy = 0.40`.
    - *Escenario Sorpresa 4 (Brote en ULEAM o Terminal Terrestre):* `start_hub = "uleam"` / `"terminal_terrestre"`.

- [ ] 2.0 Verificar el Servidor Híbrido Local y el Build de Producción del Frontend
  - [ ] 2.1 Compilar el frontend con `cd frontend && npm run build` y confirmar 0 errores de TypeScript (`tsc -b`) y generación limpia de assets en `frontend/dist/`.
  - [ ] 2.2 Levantar `src/local_server.py` y realizar peticiones de humo a `GET /health`, `POST /simulate` y `POST /mayor-report` comprobando tiempos de respuesta, formato JSON y cabeceras CORS.

- [ ] 3.0 Documentar exhaustivamente el `README.md` según la Rúbrica Oficial de SpookyThon 2026
  - [ ] 3.1 Redactar en `README.md` la sección **1. Resumen Ejecutivo y Propuesta de Valor** explicando cómo *Operación Cortafuegos Manta* resuelve el problema real de asignación de recursos sanitarios limitados en Manta.
  - [ ] 3.2 Redactar la sección **2. Escenario, Población (INEC) y Modelo Matemático SEIR-VQ Multicapa** detallando las ecuaciones de fuerza de infección diurna/nocturna, los 5 estados y las fuentes de calibración demográfica de las 5 parroquias y 5 hubs.
  - [ ] 3.3 Redactar la sección **3. Estrategia "Escudo Manta" (3 Defensas Combinadas + ROI Marginal)** e incrustar `docs/flujo_defensas.svg` y `docs/mapa_mental.svg`, explicando por qué nunca vacuna infectados/inmunes y cómo se adapta dinámicamente al **🎃 Brote Sorpresa**.
  - [ ] 3.4 Redactar la sección **4. Parámetros por Defecto y Semilla Oficial para Reproducibilidad (`seed = 2026`)** con la tabla comparativa de resultados obtenidos por las 3 estrategias (`Sin Intervención`, `Intervención al Azar`, `Cortafuegos Manta`).
  - [ ] 3.5 Redactar la sección **5. Arquitectura Serverless en AWS (`us-east-1`), Seguridad y Declaración de Costos**, enlazando `docs/arquitectura.svg`, `docs/costos.md` y la evidencia del AWS Budget de $5.00 USD.
  - [ ] 3.6 Redactar la sección **6. Guía Paso a Paso de Pruebas Locales y Despliegue en AWS** (`sam build && sam deploy`, `scripts/deploy-aws.ps1`, `docker-compose up` y ejecución híbrida).
