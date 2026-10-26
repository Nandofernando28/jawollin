export interface SimulationParams {
  seed: number;
  population_nodes: number;
  monte_carlo_runs: number;
  days: number;
  beta_day: number;
  beta_night: number;
  incubation_days: number;
  recovery_days: number;
  vaccine_stock: number;
  vaccine_efficacy: number;
  daily_budget: number;
  daily_supply_mode: boolean;
  patient_zero_zone: string;
  initial_infected: number;
}

export interface ParishDayStats {
  sano: number;
  mordido: number;
  zombie: number;
  inmune: number;
  aislado: number;
}

export interface SpatialTimelineStep {
  day: number;
  parishes: Record<string, ParishDayStats>;
  closed_hubs: string[];
}

export interface StrategySummary {
  active_zombies_mean: number[];
  active_zombies_p10: number[];
  active_zombies_p90: number[];
  cum_infected_mean: number[];
  cum_infected_p10: number[];
  cum_infected_p90: number[];
  peak_zombies_mean: number;
  peak_zombies_range: [number, number];
  total_infected_mean: number;
  total_infected_range: [number, number];
  vaccines_used_mean: number;
  wasted_vaccines_mean: number;
  budget_spent_mean: number;
  sample_spatial_timeline: SpatialTimelineStep[];
  hubs_closed_days_mean: number;
  isolated_zombies_mean: number;
}

export interface SimulationResponse {
  metadata: {
    seed: number;
    sim_hash: string;
    cache_hit: boolean;
    execution_ms: number;
    population_nodes: number;
    manta_real_population_scale: number;
    monte_carlo_runs: number;
    days: number;
    params: SimulationParams;
  };
  strategies: {
    none: StrategySummary;
    random: StrategySummary;
    shield: StrategySummary;
  };
  impact_summary: {
    citizens_saved_nodes: number;
    citizens_saved_manta_scale: number;
    extra_saved_vs_random_nodes: number;
    extra_saved_vs_random_manta_scale: number;
    infection_reduction_pct: number;
    zero_vaccine_waste_guaranteed: boolean;
  };
}
