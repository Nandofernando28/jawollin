# Plan de Implementación — Fase 6: Interfaz de Usuario en React 19 (Centro de Control Epidemiológico de Manta)

**Referencia PRD:** [prd-operacion-cortafuegos-manta.md](./prd-operacion-cortafuegos-manta.md) (Secciones 4.5 FR-17, 4.6 FR-18 a FR-20 y 6.2)  
**Plan Central:** [tasks-operacion-cortafuegos-manta.md](./tasks-operacion-cortafuegos-manta.md)

## Relevant Files

- `frontend/src/components/MantaMap.tsx` - Componente visual interactivo del mapa real de Manta con reproducción día a día (`day` de `0` a `days`), controles Play/Pause/Scrubber, selector de estrategia comparada (`Cortafuegos Manta` vs `Intervención al Azar` vs `Sin Intervención`), coloración coroplética por densidad de 🔴 Zombies en las 5 parroquias y estado de los 5 Hubs (cortafuegos activo, casos activos, vacunación en anillo).
- `frontend/src/components/EpidemicCharts.tsx` - Componente de visualización de curvas epidemiológicas SEIR-VQ con bandas sombreadas de incertidumbre **P10–P90** y gráfica de asignación presupuestaria diaria por tipo de defensa.
- `frontend/src/components/MayorReportModal.tsx` - Modal/panel ejecutivo para presentar el Boletín Oficial para el Alcalde de Manta generado por Amazon Bedrock (o motor heurístico del COE), con botón de copia rápida al portapapeles.
- `frontend/src/services/api.ts` - Cliente HTTP con soporte para el Switch Híbrido (`AWS Cloud API Gateway` vs `Local Python Server localhost:8000`) y fallback transparente automático en caso de error de red.
- `frontend/src/App.tsx` - Consola principal de 3 columnas (*Control de Crisis Epidemiológica*), panel de sliders e inputs libres para responder en vivo al **🎃 Brote Sorpresa**, tarjetas de KPIs cuantitativos y estado de auditoría de reproducibilidad.
- `frontend/src/index.css` - Estilos base en Tailwind CSS v4 y animaciones sutiles de pulso para focos infecciosos y escudos activos.

### Notes

- **Criterio de Producto (15% en Rúbrica Base):** *"Que una persona real pueda usarlo sin explicación."* Cada control deslizante debe mostrar claramente su valor actual, unidades (`%`, `días`, `$ USD`, `personas`) y una breve descripción de qué representa en la realidad de Manta.
- **Diseño para el "🎃 Brote Sorpresa" (Sin Presets Rígidos):** Tal como se definió en el PRD (Decisión #2 = Opción B), el panel izquierdo debe ofrecer **únicamente sliders e inputs numéricos libres** sin botones de presets prefabricados, permitiendo al equipo ajustar en segundos cualquier combinación arbitraria que dicte el jurado (ej. cambiar semilla, duplicar contagio diurno, bajar eficacia de vacuna, reducir presupuesto o cambiar el epicentro inicial a un mercado).
- **Código de Colores Oficial del Reto:**
  - 🟢 **Sano (Susceptible):** Esmeralda (`#10b981`)
  - 🟡 **Mordido (Expuesto):** Ámbar (`#f59e0b`)
  - 🔴 **Zombie (Infeccioso):** Rojo Carmesí (`#ef4444`)
  - 🟣 **Aislado (Cuarentena Brigada):** Púrpura (`#a855f7`)
  - 🔵 **Exorcizado (Inmune / Vacunado):** Azul Cian (`#06b6d4`)

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Ubicarse en la rama de implementación (`git checkout -b feature/fase-6-interfaz-react-centro-control` o continuar en `feature/operacion-cortafuegos-manta`).

- [ ] 1.0 Implementar el Cliente HTTP Híbrido (`frontend/src/services/api.ts`)
  - [ ] 1.1 Configurar la lectura de `import.meta.env.VITE_API_URL` para el endpoint de AWS Cloud y `http://localhost:8000` para el Servidor Local.
  - [ ] 1.2 Implementar `runSimulation(params: SimulationParams, mode: BackendMode)` con medición de latencia de cliente; si `mode === 'aws'` falla por desconexión en el auditorio, hacer fallback automático a `http://localhost:8000/simulate` notificando en la barra de estado el cambio a contingencia local.
  - [ ] 1.3 Implementar `generateMayorReport(simulation: SimulationResponse, mode: BackendMode)` invocando `POST /mayor-report`.
  - [ ] 1.4 Implementar `checkBackendHealth(mode: BackendMode)` invocando `GET /health`.

- [ ] 2.0 Construir el Mapa Interactivo Fiel de Manta con Reproductor Día a Día (`frontend/src/components/MantaMap.tsx`)
  - [ ] 2.1 Renderizar el lienzo SVG usando `MANTA_MAP_VIEWBOX`, el fondo oceánico de la Bahía de Manta, el rompeolas del puerto, los corredores viales (`MANTA_TRANSIT_CORRIDORS`) y los polígonos reales de las 5 parroquias (`MANTA_PARISH_PATHS`).
  - [ ] 2.2 Colorear dinámicamente cada parroquia en el día actual `currentDay` según la proporción de 🔴 Zombies activos en la estrategia seleccionada (`shield`, `random` o `none`), mostrando sobre cada parroquia su nombre oficial, conteo de 🟢 Sanos, 🔴 Zombies y 🔵 Inmunes.
  - [ ] 2.3 Renderizar los 5 Hubs críticos (`ULEAM`, `Mercado Tarqui`, `Mercado Central`, `Empacadoras`, `Terminal Terrestre`) con indicadores visuales claros:
    - Halo naranja/cian de **Cortafuegos Activo (Fumigación / Cierre Quirúrgico)** cuando `firewall_active === true` en ese día.
    - Anillo verde/azul pulsante cuando se están aplicando vacunas de anillo alrededor del foco.
    - Tooltip detallado al hacer clic o pasar el cursor sobre cualquier parroquia o hub.
  - [ ] 2.4 Implementar la barra de control temporal (Scrubber Día `0` a `days`):
    - Botón **Play / Pause** (animación automática a 350 ms por día), botón **Reiniciar (Día 0)**, slider interactivo día a día e indicador de **Fase Diurna ☀️ (Hubs y Buses)** vs **Fase Nocturna 🌙 (Hogares y Barrios)**.
    - Selector de vista comparativa en el mapa: `🛡️ Cortafuegos Manta (Nuestra Estrategia)` vs `🎲 Intervención al Azar (Línea Base 2)` vs `💀 Sin Intervención (Línea Base 1)`.

- [ ] 3.0 Construir el Módulo de Gráficas Epidemiológicas P10–P90 (`frontend/src/components/EpidemicCharts.tsx`)
  - [ ] 3.1 Implementar la **Gráfica 1 — Comparativa de Curvas de Contagio (3 Estrategias con Bandas P10–P90)**:
    - Trazar las 3 curvas promedio (P50 / Media) y áreas sombreadas de incertidumbre entre el percentil 10 (`p10`) y percentil 90 (`p90`) para:
      - `Sin Intervención` (rojo discontinuo)
      - `Intervención al Azar` (ámbar)
      - `Cortafuegos Manta` (esmeralda/cian brillante)
    - Permitir alternar la métrica graficada entre **🔴 Zombies Activos por Día** y **📈 Acumulado Total de Contagiados**.
    - Mostrar una línea vertical sincronizada con el `currentDay` del mapa interactivo.
  - [ ] 3.2 Implementar la **Gráfica 2 — Dinámica de Estados SEIR-VQ y Desglose de Defensas**:
    - Mostrar la evolución diaria de los 5 estados (🟢 Sanos, 🟡 Mordidos, 🔴 Zombies, 🟣 Aislados, 🔵 Exorcizados/Inmunes) en la estrategia *Cortafuegos Manta*.
    - Mostrar barras de inversión presupuestaria acumulada desglosadas en las 3 defensas (*El Escudo: Vacunas*, *La Lanza: Brigadas*, *La Red: Cortafuegos en Hubs*).

- [ ] 4.0 Construir el Modal del Boletín Ejecutivo del Alcalde (`frontend/src/components/MayorReportModal.tsx`)
  - [ ] 4.1 Diseñar una vista tipo **Oficio / Decreto de Emergencia del COE Cantonal de Manta** con insignia de estado, motor generador (`Amazon Bedrock · Nova Micro / Haiku` o `Motor Analítico Determinista COE`), titular ejecutivo y las 3 secciones en lenguaje simple (*1. Diagnóstico Crítico*, *2. Directivas Operativas Hoy*, *3. Retorno de la Inversión Municipal*).
  - [ ] 4.2 Incluir la lista de **Acciones Prioritarias Inmediatas** con íconos y botón para copiar el informe completo en Markdown/Texto.

- [ ] 5.0 Ensamblar la Consola Principal de 3 Columnas en `frontend/src/App.tsx`
  - [ ] 5.1 **Barra Superior (Header Operativo):**
    - Identidad visual: *"🧟‍♂️ OPERACIÓN CORTAFUEGOS MANTA · Comité de Contención Epidemiológica (SpookyThon 2026 · Track B)"*.
    - **Switch Híbrido de Servidor:** Selector interactivo `☁️ AWS Cloud (us-east-1)` / `💻 Local Server (Contingencia ULEAM)` con badge de estado online, tiempo de respuesta (`ms`), badge de reproducibilidad (`sim_hash` y `Cache Hit / Computed`) y check verde `✅ 0 Vacunas Desperdiciadas en Infectados`.
  - [ ] 5.2 **Columna Izquierda — Panel de Parámetros Libres (Calibración y 🎃 Brote Sorpresa):**
    - Sección 1 — *Semilla y Escenario Base*: Input numérico para **Semilla Determinista (`seed`)**, selector de **Epicentro Inicial (`start_hub`)** (`Mercado Tarqui`, `ULEAM`, `Mercado Central`, `Empacadoras Los Esteros`, `Terminal Terrestre`, `Aleatorio`), slider de **Población Red (`n_nodes`)**, **Pacientes Cero (`initial_infected`)**, **Horizonte (`days`)** y **Corridas Monte Carlo (`monte_carlo_runs`)**.
    - Sección 2 — *Parámetros Biológicos de la Plaga*: Sliders e inputs numéricos libres para **Tasa de Contagio Diurno ($\beta_{\text{day}}$)**, **Tasa de Contagio Nocturno ($\beta_{\text{night}}$)**, **Período de Incubación ($\tau_{\text{inc}}$ días)** y **Duración Infecciosa ($\gamma$ días)**.
    - Sección 3 — *Recursos Limitados y Costos (*Escudo Manta*)*: Sliders e inputs libres para **Eficacia de Vacuna ($\eta_{\text{vac}}$ %)**, **Presupuesto Diario ($/día)**, **Presupuesto Total ($ USD)**, y costos unitarios (**Costo Vacuna $**, **Costo Brigada $**, **Costo Cierre Hub $/día**).
    - Botón primario **"🚀 Ejecutar Simulación Monte Carlo"** y botón secundario **"↺ Restaurar Parámetros por Defecto (`seed=2026`)"**.
  - [ ] 5.3 **Columna Central — Territorio y Avance Espacial:**
    - Componente `MantaMap.tsx` arriba y tabla detallada en vivo abajo mostrando por cada una de las 5 Parroquias y 5 Hubs los casos activos, personas inmunizadas y defensas desplegadas en el día seleccionado.
  - [ ] 5.4 **Columna Derecha — Impacto Cuantitativo, Curvas P10–P90 y Boletín del Alcalde:**
    - 4 Tarjetas KPI de alto contraste:
      1. **Vidas Salvadas vs. No Hacer Nada** (valor promedio + rango P10–P90 y % de población salvada).
      2. **Vidas Salvadas vs. Actuar al Azar** (demostración directa del valor de la estrategia inteligente con los mismos recursos).
      3. **Pico de Zombies Evitado** (reducción % del pico hospitalario/infeccioso).
      4. **Eficiencia Presupuestaria** (Costo por vida salvada en USD + desglose de dosis, brigadas y cierres ejecutados).
    - Componente `EpidemicCharts.tsx`.
    - Botón destacado **"🏛️ Generar Boletín Ejecutivo para el Alcalde (Amazon Bedrock)"**.

- [ ] 6.0 Verificación de la Fase 6
  - [ ] 6.1 Ejecutar `npm run build` en `frontend/` y verificar que TypeScript (`tsc -b`) y Vite generen el bundle de producción en `frontend/dist/` con cero errores.
