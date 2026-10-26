# Plan de Implementación — Fase 2: Motor Epidemiológico SEIR-VQ, Estrategia "Escudo Manta" y Ensamble Monte Carlo

**Referencia PRD:** [prd-operacion-cortafuegos-manta.md](./prd-operacion-cortafuegos-manta.md) (Secciones 4.1 FR-01, 4.2 FR-04 a FR-08, y 4.3 FR-09 a FR-11)  
**Plan Central:** [tasks-operacion-cortafuegos-manta.md](./tasks-operacion-cortafuegos-manta.md)

## Relevant Files

- `src/engine/simulator.py` - Implementación completa del motor estocástico día a día (`run_single_simulation`), el optimizador voraz de ROI marginal por dólar con las 3 defensas combinadas (*Escudo Manta*), las 2 líneas base obligatorias (`none` y `random`) y el agregador de ensambles Monte Carlo (`run_monte_carlo_ensemble`).
- `src/engine/graph_manta.py` - Proveedor de la topología multicapa de Manta consumida por el simulador.
- `tests/test_simulator.py` - Suite de pruebas unitarias para verificar reproducibilidad exacta por semilla, cumplimiento estricto de no-vacunación de infectados/inmunes y superioridad estadística de la estrategia *Cortafuegos Manta* frente a las dos líneas base.

### Notes

- **Regla de Oro del Jurado (Cero Vacunas Desperdiciadas):** El jurado penaliza severamente si se vacuna a quien ya está infectado (`MORDIDO` o `ZOMBIE`) o ya es inmune (`EXORCIZADO`). El filtro de candidatos para la Defensa 3 debe exigir `state[u] == STATE_SANO` (`0`) antes de aplicar cualquier dosis y registrar un contador de auditoría `wasted_vaccines = 0`.
- **Resistencia al "🎃 Brote Sorpresa":** Si el jurado reduce la eficacia de la vacuna (`vaccine_efficacy = 0.3`) o duplica la tasa de contagio (`beta_day = 0.25`), el optimizador de ROI marginal debe detectarlo automáticamente en su fórmula de utilidad esperada por dólar y redirigir mayor presupuesto hacia **Cortafuegos de Hubs (Defensa 1)** y **Brigadas de Aislamiento (Defensa 2)**, evitando que la estrategia colapse.
- **Comandos de prueba:** Ejecutar `python -m unittest tests/test_simulator.py -v` para validar esta fase.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Ubicarse en la rama de implementación (`git checkout -b feature/fase-2-motor-seir-escudo-manta` o continuar en `feature/operacion-cortafuegos-manta`).
  - [ ] 0.2 Verificar que la Fase 1 (`src/engine/graph_manta.py`) esté lista e importable desde `src/engine/simulator.py`.

- [ ] 1.0 Definir constantes de estados SEIR-VQ y normalizador de parámetros con valores por defecto
  - [ ] 1.1 Declarar en `src/engine/simulator.py` las constantes enteras de estado:
    - `STATE_SANO = 0` (🟢 Susceptible)
    - `STATE_MORDIDO = 1` (🟡 Expuesto / en incubación)
    - `STATE_ZOMBIE = 2` (🔴 Infeccioso activo)
    - `STATE_AISLADO = 3` (🟣 Contenido por brigada sanitaria)
    - `STATE_INMUNE = 4` (🔵 Exorcizado / Recuperado o Vacunado con éxito)
  - [ ] 1.2 Implementar `normalize_simulation_params(raw_params: Dict[str, Any]) -> Dict[str, Any]` con valores por defecto calibrados y acotación de rangos seguros (clamping) para cualquier input libre de la UI:
    - `n_nodes`: default `1200` (rango `200 .. 5000`)
    - `days`: default `30` (rango `7 .. 90`)
    - `beta_day`: default `0.085` (probabilidad base de contagio por contacto diurno)
    - `beta_night`: default `0.110` (probabilidad base de contagio intrafamiliar nocturno)
    - `incubation_days`: default `2` (días en estado 🟡 Mordido antes de pasar a 🔴 Zombie)
    - `infectious_days`: default `5` (días en estado 🔴 Zombie activo antes de pasar a 🔵 Exorcizado)
    - `initial_infected`: default `4` (pacientes cero en $t=0$)
    - `start_hub`: default `"mercado_tarqui"` (opciones: `"uleam"`, `"mercado_tarqui"`, `"mercado_central"`, `"empacadoras"`, `"terminal_terrestre"`, `"random"`)
    - `vaccine_efficacy`: default `0.85` ($\eta_{vac} \in [0.05, 1.0]$)
    - `daily_budget`: default `600.0` (USD inyectados por día)
    - `total_budget`: default `12000.0` (presupuesto máximo acumulado de la campaña)
    - `vaccine_cost`: default `15.0` (USD por dosis de vacuna aplicada)
    - `brigade_cost`: default `65.0` (USD por aislamiento/antídoto directo a un Zombie)
    - `hub_closure_cost`: default `220.0` (USD por día de cierre quirúrgico/fumigación intensiva de un Hub)
    - `hub_firewall_reduction`: default `0.88` (88% de reducción en contagios diurnos dentro del Hub intervenido)
    - `monte_carlo_runs`: default `30` (rango `5 .. 100`)
    - `seed`: default `2026`

- [ ] 2.0 Implementar la siembra del Paciente Cero (`seed_initial_outbreak`)
  - [ ] 2.1 Utilizando `rng = np.random.default_rng(run_seed)`, filtrar los nodos cuyo `primary_hub == start_hub` (o toda la población si `start_hub == "random"`).
  - [ ] 2.2 Seleccionar de forma determinista `initial_infected` nodos iniciales, priorizando nodos con alta conectividad diurna en ese Hub para simular un foco realista, marcándolos en estado `STATE_ZOMBIE` (`2`) en el día $t=0$ con contador `days_in_state = 0`.

- [ ] 3.0 Implementar las 3 Defensas Combinadas y el Optimizador de ROI Marginal por Dólar (*Escudo Manta*)
  - [ ] 3.1 **Defensa 1 (La Red - Cortafuegos/Fumigación en Hubs):**
    - Para cada Hub $h$, contar cuántos asistentes están actualmente en estado `STATE_ZOMBIE` o `STATE_MORDIDO` y cuántos en `STATE_SANO`.
    - Estimar los contagios diurnos esperados hoy en el Hub $h$:
      $$E[\Delta I_h] \approx \text{Zombies}_h \times \overline{k}_h \times \beta_{\text{day}} \times \frac{\text{Sanos}_h}{N_h} \times \text{hub\_firewall\_reduction}$$
    - Calcular el ROI marginal del Hub $h$: $\text{ROI}_{\text{hub}}(h) = \frac{E[\Delta I_h]}{\text{hub\_closure\_cost}}$.
  - [ ] 3.2 **Defensa 2 (La Lanza - Brigadas de Contención / Antídoto a Superpropagadores):**
    - Identificar todos los nodos $z$ en estado `STATE_ZOMBIE`.
    - Para cada Zombie $z$, contar sus vecinos directos (diurnos + nocturnos) que están hoy en estado `STATE_SANO`: $s_z = |\{v \in N(z) : \text{state}[v] == 0\}|$.
    - Estimar los contagios evitados al neutralizar a $z$ durante sus días infecciosos restantes:
      $$E[\Delta I_z] \approx s_z \times (\beta_{\text{day}} + \beta_{\text{night}}) \times \text{dias\_restantes}(z)$$
    - Calcular $\text{ROI}_{\text{brigade}}(z) = \frac{E[\Delta I_z]}{\text{brigade\_cost}}$.
  - [ ] 3.3 **Defensa 3 (El Escudo - Vacunación Anillo + Puente):**
    - **Filtro de Seguridad Obligatorio:** Obtener el conjunto de candidatos estrictamente como `candidates = np.where(state == STATE_SANO)[0]`.
    - Para cada candidato $u \in \text{candidates}$, calcular:
      - `ring_exposure[u]`: número de vecinos a 1 salto y 2 saltos en estado `STATE_ZOMBIE` o `STATE_MORDIDO`.
      - `bridge_score[u]`: centralidad puente precalculada en la Fase 1.
    - Calcular el impacto esperado de vacunar a $u$ ponderado por la eficacia de la vacuna (`vaccine_efficacy`):
      $$E[\Delta I_u] = \eta_{\text{vac}} \times \left(0.65 \cdot \text{ring\_exposure}[u] \cdot \beta_{\text{day}} + 0.35 \cdot \text{bridge\_score}[u] \cdot \overline{k} \cdot \beta_{\text{day}}\right)$$
    - Calcular $\text{ROI}_{\text{vaccine}}(u) = \frac{E[\Delta I_u]}{\text{vaccine\_cost}}$.
  - [ ] 3.4 **Asignador Voraz Diario (`apply_daily_interventions_shield`):**
    - Sumar el presupuesto diario (`available_budget += min(daily_budget, remaining_total_budget)`).
    - Mientras `available_budget` permita adquirir al menos una acción y existan acciones con $\text{ROI} > 0$, ejecutar iterativamente la acción (Hub, Brigada o Lote de Vacunas Top-K) con mayor ROI marginal por dólar, actualizando los estados (`STATE_AISLADO` para brigadas, `STATE_INMUNE` con probabilidad $\eta_{vac}$ para vacunas, y `active_hub_firewalls` para hubs cerrados) y registrando el gasto del día.

- [ ] 4.0 Implementar las Dos Líneas Base Obligatorias (`none` y `random`)
  - [ ] 4.1 **Línea Base 1 (`strategy == "none"`):** No ejecuta ninguna intervención en ningún día ($0 gastado, 0 vacunas, 0 brigadas, 0 cierres).
  - [ ] 4.2 **Línea Base 2 (`strategy == "random"`):** Recibe exactamente el mismo presupuesto diario y total que `'shield'`, pero en cada día reparte el presupuesto al azar entre cerrar un hub aleatorio, enviar brigadas a Zombies elegidos al azar y vacunar nodos **Sanos** elegidos completamente al azar (`rng.choice` sin usar `ring_exposure` ni `bridge_score`).

- [ ] 5.0 Implementar el Motor de Transmisión Día/Noche (`step_day_and_night_transmission`)
  - [ ] 5.1 **Fase Diurna ($G_D$):** Para cada nodo en `STATE_SANO`, acumular la fuerza de infección de sus vecinos diurnos que estén en `STATE_ZOMBIE`. Si la arista pertenece a un Hub con cortafuegos activo hoy, multiplicar el peso por `(1.0 - hub_firewall_reduction)`.
  - [ ] 5.2 **Fase Nocturna ($G_N$):** Para los nodos que siguen en `STATE_SANO`, acumular la fuerza de infección de sus vecinos nocturnos (hogar y barrio) que estén en `STATE_ZOMBIE`.
  - [ ] 5.3 **Transiciones de Estado:**
    - Los nodos `STATE_SANO` expuestos a probabilidad acumulada $p_i = 1 - \exp(-\lambda_i) > 0$ transicionan a `STATE_MORDIDO` si `rng.random() < p_i`.
    - Los nodos en `STATE_MORDIDO` cuyo `days_in_state >= incubation_days` transicionan a `STATE_ZOMBIE`.
    - Los nodos en `STATE_ZOMBIE` cuyo `days_in_state >= infectious_days` transicionan a `STATE_INMUNE` (Exorcizado/Recuperado).

- [ ] 6.0 Implementar el Ensamble Monte Carlo (`run_monte_carlo_ensemble`) y Métricas Espaciales
  - [ ] 6.1 Implementar una función auxiliar `run_batch_simulations(params, run_indices, include_spatial_on_first=True)` que pueda ser llamada tanto localmente como desde `src/handlers/worker.py` en AWS Lambda.
  - [ ] 6.2 Consolidar las $M$ corridas para cada estrategia (`none`, `random`, `shield`) calculando por cada día $t \in [0, \text{days}]$:
    - Media (`mean`) y percentiles `p10`, `p50`, `p90` para `sano`, `mordido`, `zombie`, `aislado`, `inmune`, `ever_infected` y `cumulative_budget_spent`.
  - [ ] 6.3 Generar la serie temporal espacial (`spatial_timeline`) agregada por día para las 5 parroquias y los 5 hubs (conteo de Sanos, Mordidos, Zombies, Aislados, Inmunes y bandera `firewall_active` por hub) para alimentar el mapa interactivo de la Fase 6.
  - [ ] 6.4 Calcular el bloque `summary_kpis`:
    - `total_infected_none`, `total_infected_random`, `total_infected_shield` (media y rango P10–P90).
    - `lives_saved_vs_none` y `lives_saved_vs_random` (números absolutos y porcentaje).
    - `peak_zombies_none`, `peak_zombies_random`, `peak_zombies_shield` y `peak_reduction_vs_none_pct`.
    - `total_vaccines_used`, `total_brigades_used`, `total_hub_days_closed`, `total_budget_spent`, `cost_per_life_saved`.
    - `wasted_vaccines_count` (verificación explícita `== 0`).

- [ ] 7.0 Verificación y Pruebas Unitarias de la Fase 2
  - [ ] 7.1 Crear `tests/test_simulator.py` probando:
    - Reproducibilidad determinista: dos invocaciones a `run_monte_carlo_ensemble` con `seed=2026` producen exactamente los mismos diccionarios numéricos (`assertEqual`).
    - Cero vacunas desperdiciadas: verificar `wasted_vaccines_count == 0` en todas las corridas.
    - Superioridad estratégica: verificar que `total_infected_shield < total_infected_random < total_infected_none`.
    - Resistencia a Brote Sorpresa: probar un escenario con `vaccine_efficacy = 0.25` y `beta_day = 0.18` y verificar que el optimizador incremente el uso de brigadas y cierres de hubs manteniendo superioridad sobre `random`.
  - [ ] 7.2 Ejecutar `python -m unittest tests/test_simulator.py -v` y confirmar que todas las pruebas pasen.
