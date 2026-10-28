# Directivas para agentes: Operación Cortafuegos Manta

Proyecto del **SpookyThon 2026, Track B (La Plaga Zombie)**: simulador SEIR sobre una red de contactos sintética de Manta, con una estrategia de intervención ("Escudo") comparada contra no intervenir y contra intervenir al azar. Corre en AWS y tiene una interfaz React.

Estas reglas se aplican siempre, sin que el usuario tenga que pedirlas. Responde en español.

---

## 1. Mapa del proyecto

| Ruta | Contenido |
|---|---|
| `src/engine/graph_manta.py` | Red multicapa de Manta (parroquias INEC, hogares, Hubs, capas día/noche en CSR, `bridge_score`, caché LRU). |
| `src/engine/simulator.py` | Motor SEIR, estrategias, Monte Carlo y `normalize_simulation_params`. |
| `src/handlers/` | Lambdas: `orchestrator.py`, `worker.py`, `mayor_report.py` (Bedrock). |
| `infra/` | AWS SAM (`template.yaml`, `samconfig.toml`, `statemachine/`). Python 3.12, región `us-east-1`. |
| `frontend/` | React 19 + Vite + TypeScript + Tailwind 4 + Leaflet + Recharts. |
| `tests/` | `unittest`: `test_graph_manta.py`, `test_simulator.py`, `test_handlers.py`. |
| `scripts/` | `calibrar.py` (resultado de referencia) y `estimar_r0.py`. |
| `tasks/` | PRD y planes por fase (`tasks-fase-N-*.md`). |
| `docs/` | Arquitectura, calibración y costos. |
| `Rules/Reto.md` | Bases oficiales del reto: rúbrica, entregables y prueba de fuego. |
| `graphify-out/` | Grafo del código (`GRAPH_REPORT.md`). Úsalo para ubicar archivos antes de buscar a ciegas; puede estar desactualizado (compara el commit). |

## 2. Comandos

Se ejecutan desde la raíz del repositorio:

```bash
python -m unittest discover -s tests -t .
python -m unittest tests/test_graph_manta.py -v
python scripts/calibrar.py
python scripts/estimar_r0.py
```

- Frontend: `npm run dev` y `npm run build` dentro de `frontend/`.
- Despliegue: `sam build` y `sam deploy` dentro de `infra/`. **Solo con autorización del usuario.**
- Los scripts sueltos que importen `src.*` necesitan la raíz en `PYTHONPATH`.

## 3. Flujo de trabajo con las tareas

- Los planes están en `tasks/tasks-fase-N-*.md`. Al completar una subtarea, márcala `- [x]` en el archivo.
- Para verificar una fase: compara el código contra cada subtarea, corre sus tests y mide lo que los tests no cubren (tiempos, rangos, proporciones).
- Si el código se aparta de la especificación por una buena razón, deja una nota breve en la tarea en lugar de forzar el código.

## 4. Reglas propias del reto (afectan la nota)

- **Reproducibilidad (DEBE):** misma configuración y semilla, mismo resultado. Usa un `rng = np.random.default_rng(seed)` local; nunca el estado global de `random` ni de `np.random`.
- **Los números del README deben coincidir con el código.** Si cambias la red, el simulador o los parámetros por defecto, vuelve a correr `scripts/calibrar.py` y `scripts/estimar_r0.py` y actualiza el README y `docs/calibracion.md`.
- **Cada parámetro debe estar justificado** en el README (de dónde sale el número). El jurado penaliza los parámetros inventados sin explicar.
- **Líneas base siempre presentes** (no intervenir y azar con los mismos recursos), con promedios y rangos de muchas réplicas.
- No vacunar a quien ya está infectado o es inmune.
- **Brote Sorpresa:** los cambios de condiciones (doble de contagio, mitad de vacunas, brote en el mercado, vacuna parcial) deben poder hacerse desde parámetros, sin tocar código.
- **Simplicidad explicable:** el equipo debe poder explicar cualquier parte del código. Prefiere lo claro a lo ingenioso.
- **Entrega:** miércoles 28 de octubre de 2026, 10:00 (hora de Ecuador). Ante la duda, prioriza lo que la rúbrica evalúa.

## 5. AWS

- Prefiere el AWS MCP Server si está disponible; si no, usa la AWS CLI.
- Antes de una tarea de AWS, revisa si hay una skill de AWS relevante y sigue su guía.
- Si no estás seguro de un detalle de AWS (parámetros de API, permisos, límites, códigos de error), verifícalo en la documentación. Si no puedes confirmarlo, dilo.
- Infraestructura como código (SAM en `infra/template.yaml`) en lugar de comandos sueltos de CLI.
- Sigue el AWS Well-Architected Framework, con **mínimo privilegio en IAM** (lo evalúa la rúbrica).
- No uses rayas largas (em dash) en nombres ni descripciones de recursos de AWS. Usa guiones.
- Cuida el costo: se trabaja con créditos y un AWS Budget. Cualquier recurso nuevo debe reflejarse en `docs/costos.md`.

### Secretos

- Para cualquier tarea con secretos, credenciales, API keys, tokens o contraseñas, carga primero la skill `aws-secrets-manager`.
- No llames a `secretsmanager get-secret-value` ni a `batch-get-secret-value`, ni al daemon del Secrets Manager Agent.
- Usa `{{resolve:secretsmanager:secret-id:SecretString:json-key}}` con `asm-exec`, para que el secreto se resuelva en tiempo de ejecución sin entrar al contexto.
- Nunca pongas llaves en el código ni en el repositorio: el repositorio es público.

## 6. Documentación de librerías

- No asumas versiones de API ni uses sintaxis obsoleta. Antes de usar una API que no conozcas con certeza, comprueba su firma y sus opciones en la documentación oficial (Context7 si está disponible, o la documentación web).
- Ten en cuenta las versiones mayores del frontend: React 19, Tailwind 4 (plugin de Vite, sin `tailwind.config.js` clásico), Recharts 3 y react-leaflet 4.

## 7. Interfaz (frontend)

- La interfaz la usará el jurado en vivo: debe entenderse sin explicación (Producto, 15 %).
- Diseño cuidado, sin "estética genérica de IA": jerarquía visual clara, buen contraste, espaciado consistente y tipografía moderna.
- Transiciones sutiles (150 a 300 ms) y sin saltos de layout.
- Mantén la coherencia con el estilo actual de la consola de mando.
- Si existen las skills de diseño (`impeccable`, `design-taste-frontend`, `high-end-visual-design`, `emil-design-eng`), úsalas.

## 8. Verificación en navegador

- Para comprobar cambios de UI, abre la app (`npm run dev`) en el navegador integrado y revisa la consola, la red y una captura.
- Para flujos completos o regresiones, usa Playwright si está disponible.
- Revisa la accesibilidad básica: etiquetas, contraste y navegación por teclado.

## 9. Git y GitHub

- Rama de trabajo por funcionalidad; nunca hagas commit directo en `main`.
- Haz commit solo cuando el usuario lo pida. El reto exige un historial de commits real, así que conviene hacer commits pequeños y descriptivos.
- Para ramas, PRs e issues usa `gh` o el MCP de GitHub si está disponible.

## 10. Código completo

- Nada de código truncado (`// ... resto sin cambios`, `TODO: implementar`) en archivos creados o reemplazados.
- Implementaciones completas, con tests cuando cambie la lógica del motor.

## 11. Entorno Windows

- Windows 11. La shell principal es PowerShell 5.1 (sin `&&`; usa `; if ($?) { ... }`). Git Bash también está disponible.
- Usa rutas absolutas o relativas válidas, y entre comillas: la ruta del proyecto tiene espacios (`Reto AWS`).
