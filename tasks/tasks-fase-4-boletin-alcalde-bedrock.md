# Plan de Implementación — Fase 4: Generador de Boletín Ejecutivo para el Alcalde (Amazon Bedrock + Fallback Heurístico)

**Referencia PRD:** [prd-operacion-cortafuegos-manta.md](./prd-operacion-cortafuegos-manta.md) (Sección 4.7 FR-21 a FR-23 y 7.2)  
**Plan Central:** [tasks-operacion-cortafuegos-manta.md](./tasks-operacion-cortafuegos-manta.md)

## Relevant Files

- `src/handlers/mayor_report.py` - Handler AWS Lambda (`cortafuegos-manta-mayor-report`) expuesto en `POST /mayor-report` que transforma los resultados cuantitativos de la simulación en un Boletín Ejecutivo Oficial en lenguaje simple para el Alcalde de Manta, utilizando Amazon Bedrock (`amazon.nova-micro-v1:0` o Claude 3 Haiku) y un motor heurístico determinista de respaldo.
- `src/handlers/orchestrator.py` - Provee acceso al caché de simulaciones (`get_cached_simulation`) para cuando el frontend envía únicamente el `sim_hash` o el bloque de métricas de la simulación actual.
- `tests/test_handlers.py` - Pruebas unitarias para validar tanto el flujo con mock de Bedrock como el fallback heurístico estructurado.

### Notes

- **Criterio de Producto (15%) y Claridad para Decidir (20% en Prueba de Fuego):** El jurado valora que una autoridad municipal pueda leer qué hacer, dónde y cuándo sin jerga matemática. Por ello, el boletín siempre debe responder con nombres propios de Manta (ej. *"Parroquia Tarqui"*, *"Mercado Central de Tarqui"*, *"ULEAM"*) y números concretos de vidas salvadas y dólares ejecutados.
- **Resiliencia Total (Cero Errores 500):** En cuentas sandbox de hackathon es frecuente que algún modelo de Amazon Bedrock requiera activación manual o tenga cuota restringida. Si `bedrock-runtime` lanza `ClientError`, `AccessDeniedException`, `EndpointConnectionError` o no existen credenciales AWS en local, el handler debe capturar la excepción silenciosamente y devolver el boletín heurístico estructurado con HTTP `200 OK` indicando `"engine": "heuristic-coe-fallback"`.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Ubicarse en la rama de implementación (`git checkout -b feature/fase-4-boletin-alcalde-bedrock` o continuar en `feature/operacion-cortafuegos-manta`).

- [ ] 1.0 Extraer y sintetizar los indicadores estratégicos de la simulación para el Alcalde
  - [ ] 1.1 Implementar en `src/handlers/mayor_report.py` la función `extract_executive_context(sim_data: Dict[str, Any]) -> Dict[str, Any]` que identifique a partir de los resultados de la simulación:
    - La **parroquia más afectada** (mayor número de infecciones evitadas o mayor presión infecciosa, ej. `Tarqui` o `Eloy Alfaro`).
    - Los **Hubs críticos intervenidos** por el cortafuegos y en qué días pico se recomienda su cierre/fumigación.
    - El **total de vidas salvadas** frente a no hacer nada (`lives_saved_vs_none`) y frente a actuar al azar (`lives_saved_vs_random`).
    - La **reducción porcentual del pico de zombies activos** (`peak_reduction_vs_none_pct`).
    - El **desglose de recursos aplicados**: cuántas dosis de vacuna Anillo+Puente se aplicaron (con 0 desperdicio), cuántas brigadas de contención aislaron superpropagadores, cuántos días-hub se cerraron y cuál fue el **costo por vida salvada** en USD.

- [ ] 2.0 Implementar la integración con Amazon Bedrock (`amazon.nova-micro-v1:0` / Claude 3 Haiku)
  - [ ] 2.1 Construir el prompt de sistema y de usuario en español ejecutivo dirigido a la **Alcaldía de Manta y al Comité de Operaciones de Emergencia (COE Cantonal)** exigiendo exactamente 3 secciones sin tecnicismos:
    1. `situacion_critica`: Diagnóstico inmediato del brote en Manta y cuántas vidas están en juego.
    2. `directivas_operativas`: Qué hacer hoy mismo en los hubs (Mercados, ULEAM, Empacadoras, Terminal), a quién vacunar primero (anillos de contacto y transportistas/comerciantes sanos) y dónde desplegar las brigadas.
    3. `balance_recursos`: Eficiencia del presupuesto municipal invertido frente a actuar al azar.
  - [ ] 2.2 Implementar `invoke_bedrock_report(context_data: Dict[str, Any], model_id: str)` utilizando `boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_REGION", "us-east-1"))` y la API unificada `converse` (con fallback a `invoke_model`), configurando `maxTokens=700` y `temperature=0.2`.

- [ ] 3.0 Implementar el Generador Heurístico Estructurado de Respaldo (`build_heuristic_mayor_report`)
  - [ ] 3.1 Implementar `build_heuristic_mayor_report(context_data: Dict[str, Any]) -> Dict[str, Any]` que redacte de forma determinista y rica en datos las 3 secciones ejecutivas (`situacion_critica`, `directivas_operativas`, `balance_recursos`), una lista de **3 Acciones Inmediatas con Prioridad Alta** (`action_items`) y el titular del boletín (`headline`).
  - [ ] 3.2 Incluir lógica adaptativa según el escenario detectado (por ejemplo, si la eficacia de la vacuna es baja $< 55\%$ o la tasa de contagio es muy alta como en el "🎃 Brote Sorpresa", destacar explícitamente en el boletín que el sistema redirigió recursos hacia el **Cierre Quirúrgico de Hubs** y **Brigadas de Contención Directa** para compensar la pérdida de eficacia vacunal).

- [ ] 4.0 Implementar el Endpoint `POST /mayor-report` en `src/handlers/mayor_report.py`
  - [ ] 4.1 Implementar `lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]` aceptando en el body JSON ya sea el objeto `simulation` completo o un `sim_hash` para buscarlo en el caché de DynamoDB/memoria.
  - [ ] 4.2 Intentar primero la generación vía Amazon Bedrock cuando `USE_BEDROCK` esté habilitado y existan credenciales; si ocurre cualquier excepción o se está en modo local sin credenciales AWS, retornar inmediatamente el reporte de `build_heuristic_mayor_report` con código HTTP `200 OK` y cabeceras CORS completas.

- [ ] 5.0 Verificación y Pruebas Unitarias de la Fase 4
  - [ ] 5.1 Añadir en `tests/test_handlers.py` pruebas para `POST /mayor-report` verificando que devuelva código `200`, contenga las claves `headline`, `situacion_critica`, `directivas_operativas`, `balance_recursos`, `action_items`, `metrics_summary` y `generated_by`, e incluya menciones reales a las parroquias y hubs de Manta.
  - [ ] 5.2 Ejecutar `python -m unittest tests/test_handlers.py -v` y confirmar que todas las pruebas pasen.
