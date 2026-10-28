/**
 * Contratos de tipos TypeScript para la Operación Cortafuegos Manta
 * SpookyThon 2026 · Track B (La Plaga Zombie)
 */

// ============================================================================
// 1. CONSTANTES Y TIPOS DEL DOMINIO EPIDEMIOLÓGICO
// ============================================================================

export type ParishId =
  | 'tarqui'
  | 'eloy_alfaro'
  | 'manta_centro'
  | 'los_esteros'
  | 'san_mateo';

export type HubId =
  | 'uleam'
  | 'mercado_tarqui'
  | 'mercado_central'
  | 'empacadoras'
  | 'terminal_terrestre';

export type StartHubOption = HubId | 'random';

export type StrategyType = 'none' | 'random' | 'shield';

export type BackendMode = 'aws' | 'local';

export type EpidemiologicalStateCode =
  | 0 // Sano / Susceptible
  | 1 // Mordido / Expuesto en incubación
  | 2 // Zombie / Infeccioso activo
  | 3 // Aislado por brigada sanitaria
  | 4; // Exorcizado / Inmune por vacuna o antídoto

// ============================================================================
// 2. PARÁMETROS DE ENTRADA CONFIGURABLES (SimulationParams)
// ============================================================================

export interface SimulationParams {
  /** Número total de nodos en la red multicapa sintética de Manta (200 - 5000) */
  n_nodes: number;

  /** Semilla determinista pseudoaleatoria para reproducibilidad matemática exacta */
  seed: number;

  /** Hub o punto de inicio del brote en el día 0 */
  start_hub: StartHubOption;

  /** Número de pacientes cero infectados en el día 0 (1 - 50) */
  initial_infected: number;

  /** Duración de la simulación en días (7 - 90) */
  days: number;

  /** Número de réplicas Monte Carlo para calcular medias y percentiles P10-P90 (5 - 100) */
  monte_carlo_runs: number;

  /** Probabilidad base de transmisión en contactos diurnos (hubs laborales, educativos, buses) */
  beta_day: number;

  /** Probabilidad base de transmisión en contactos nocturnos (núcleos familiares y barrios) */
  beta_night: number;

  /** Período de incubación en días (estado Mordido antes de volverse Zombie activo) */
  incubation_days: number;

  /** Duración de la fase infecciosa en días (estado Zombie antes de Exorcizado/Recuperado) */
  infectious_days: number;

  /** Eficacia de la vacuna Anillo+Puente (0.05 a 1.0) */
  vaccine_efficacy: number;

  /** Inyección diaria de presupuesto en USD disponible para el COE de Manta */
  daily_budget: number;

  /** Techo presupuestario financiero total para toda la campaña en USD */
  total_budget: number;

  /** Costo en USD por dosis aplicada de vacuna Anillo+Puente */
  vaccine_cost: number;

  /** Costo en USD por brigada sanitaria de contención desplegada */
  brigade_cost: number;

  /** Costo en USD por día de cierre quirúrgico o fumigación intensiva de un Hub */
  hub_closure_cost: number;

  /** Porcentaje de reducción de transmisión diurna en un Hub con cortafuegos activo (ej. 0.88 = 88%) */
  hub_firewall_reduction?: number;

  /** Si es true, ignora la caché de DynamoDB y recalcula forzosamente */
  force_recompute?: boolean;
}

// ============================================================================
// 3. SERIES TEMPORALES Y BANDAS DE DISPERSIÓN MONTE CARLO (P10 - P50 - P90)
// ============================================================================

export interface PercentileBand {
  mean: number[];
  p10: number[];
  p50: number[];
  p90: number[];
}

export interface StrategyDailyMetrics {
  sano: PercentileBand;
  mordido: PercentileBand;
  zombie: PercentileBand;
  aislado: PercentileBand;
  inmune: PercentileBand;
  ever_infected: PercentileBand;
  daily_budget_spent: number[];
  cumulative_budget_spent: number[];
  vaccines_applied: number[];
  brigades_deployed: number[];
  hubs_closed: number[];
}

// ============================================================================
// 4. SERIES TEMPORALES ESPACIALES PARA EL MAPA ANIMADO DE MANTA
// ============================================================================

export interface ParishDaySnapshot {
  parish_id: ParishId;
  parish_name: string;
  sanos: number;
  mordidos: number;
  zombies: number;
  aislados: number;
  inmunes: number;
  total_population: number;
  prevalence_pct: number;
}

export interface HubDaySnapshot {
  hub_id: HubId;
  hub_name: string;
  parish_id: ParishId;
  active_cases: number;
  firewall_active: boolean;
  vaccines_in_ring_today: number;
}

export interface SpatialDaySnapshot {
  day: number;
  parishes: Record<ParishId, ParishDaySnapshot>;
  hubs: Record<HubId, HubDaySnapshot>;
}

export interface StrategySpatialTimeline {
  strategy: StrategyType;
  timeline: SpatialDaySnapshot[];
}

// ============================================================================
// 5. RESUMEN DE INDICADORES CLAVE (SummaryKPIs)
// ============================================================================

export interface SummaryKPIs {
  total_population: number;

  // Comparativa de Vidas Salvadas (Media y Rangos P10-P90)
  lives_saved_vs_none: number;
  lives_saved_vs_none_pct: number;
  lives_saved_vs_none_p10: number;
  lives_saved_vs_none_p90: number;

  lives_saved_vs_random: number;
  lives_saved_vs_random_pct: number;
  lives_saved_vs_random_p10: number;
  lives_saved_vs_random_p90: number;

  // Infectados Acumulados por Estrategia
  total_infected_none: number;
  total_infected_random: number;
  total_infected_shield: number;
  // Rango P10-P90 entre réplicas
  total_infected_none_p10: number;
  total_infected_none_p90: number;
  total_infected_random_p10: number;
  total_infected_random_p90: number;
  total_infected_shield_p10: number;
  total_infected_shield_p90: number;

  // Pico Máximo de Zombies Activos y Reducción
  peak_zombies_none: number;
  peak_zombies_random: number;
  peak_zombies_shield: number;
  peak_reduction_vs_none_pct: number;
  peak_reduction_vs_random_pct: number;

  // Balance Financiero y Recursos Empleados
  total_budget_spent: number;
  remaining_budget: number;
  cost_per_life_saved_vs_none: number;
  cost_per_life_saved_vs_random: number;

  total_vaccines_used: number;
  total_brigades_used: number;
  total_hub_days_closed: number;

  // Auditoría Crítica de la Rúbrica del Jurado
  wasted_vaccines_count: number; // Debe ser siempre 0
  zero_wasted_vaccines_verified: boolean;
}

// ============================================================================
// 6. CONTRATO DE RESPUESTA DE LA SIMULACIÓN (SimulationResponse)
// ============================================================================

export interface SimulationResponse {
  sim_hash: string;
  cache_hit: boolean;
  execution_time_ms: number;
  backend_mode: BackendMode;
  timestamp: string;

  params: SimulationParams;
  summary_kpis: SummaryKPIs;

  strategies: {
    none: StrategyDailyMetrics;
    random: StrategyDailyMetrics;
    shield: StrategyDailyMetrics;
  };

  spatial_timelines: {
    none?: SpatialDaySnapshot[];
    random?: SpatialDaySnapshot[];
    shield: SpatialDaySnapshot[];
  };
}

// ============================================================================
// 7. CONTRATOS PARA EL BOLETÍN EJECUTIVO DEL ALCALDE (Amazon Bedrock)
// ============================================================================

export interface MayorActionItem {
  title: string;
  description: string;
  priority: 'ALTA' | 'MEDIA' | 'CRITICA';
  parish_or_hub: string;
}

export interface MayorReportResponse {
  sim_hash: string;
  generated_by: 'amazon-bedrock-nova-micro' | 'amazon-bedrock-claude-haiku' | 'heuristic-coe-fallback';
  model_id?: string;
  created_at: string;

  headline: string;
  situacion_critica: string;
  directivas_operativas: string;
  balance_recursos: string;

  action_items: MayorActionItem[];

  metrics_snapshot: {
    lives_saved_vs_random: number;
    peak_reduction_pct: number;
    budget_spent_usd: number;
    cost_per_life_saved_usd: number;
    most_critical_parish: string;
    critical_hubs_intervened: string[];
  };
}

// ============================================================================
// 8. ESTADO DE SALUD DEL BACKEND (HealthCheckResponse)
// ============================================================================

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  backend_mode: BackendMode;
  region?: string;
  dynamodb_connected: boolean;
  s3_connected: boolean;
  step_functions_connected: boolean;
  bedrock_available: boolean;
  timestamp: string;
}

// ============================================================================
// 9. VALORES POR DEFECTO RECOMENDADOS (Semilla Oficial: 2026)
// ============================================================================
// Deben coincidir con DEFAULT_SIMULATION_PARAMS de src/engine/simulator.py
// (valores calibrados, ver docs/calibracion.md). Un test del backend lo comprueba.

export const DEFAULT_SIMULATION_PARAMS: SimulationParams = {
  n_nodes: 1200,
  seed: 2026,
  start_hub: 'mercado_tarqui',
  initial_infected: 4,
  days: 30,
  monte_carlo_runs: 30,
  beta_day: 0.05,
  beta_night: 0.07,
  incubation_days: 2,
  infectious_days: 5,
  vaccine_efficacy: 0.85,
  daily_budget: 400.0,
  total_budget: 8000.0,
  vaccine_cost: 15.0,
  brigade_cost: 65.0,
  hub_closure_cost: 220.0,
  hub_firewall_reduction: 0.88,
  force_recompute: false,
};
