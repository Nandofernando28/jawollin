"""
Pruebas unitarias para el motor epidemiológico y normalización de parámetros.
"""

import json
import unittest

import numpy as np

from src.engine.graph_manta import HUB_IDS, PARISH_IDS, build_manta_multilayer_network
from src.engine.simulator import (
    STATE_SANO,
    STATE_MORDIDO,
    STATE_ZOMBIE,
    STATE_AISLADO,
    STATE_INMUNE,
    STATE_NAMES,
    STRATEGIES,
    DEFAULT_SIMULATION_PARAMS,
    _prepare_network,
    _run_seed,
    _vaccine_expected_infections,
    aggregate_batch_results,
    normalize_simulation_params,
    run_batch_simulations,
    run_monte_carlo_ensemble,
    run_single_simulation,
)

# Escenario pequeño para que las pruebas corran rápido
SMALL = {"n_nodes": 600, "monte_carlo_runs": 10, "days": 20}

# Claves de SummaryKPIs en frontend/src/types/simulation.ts
CONTRACT_KPI_KEYS = {
    "total_population",
    "lives_saved_vs_none", "lives_saved_vs_none_pct", "lives_saved_vs_none_p10", "lives_saved_vs_none_p90",
    "lives_saved_vs_random", "lives_saved_vs_random_pct", "lives_saved_vs_random_p10", "lives_saved_vs_random_p90",
    "total_infected_none", "total_infected_random", "total_infected_shield",
    "peak_zombies_none", "peak_zombies_random", "peak_zombies_shield",
    "peak_reduction_vs_none_pct", "peak_reduction_vs_random_pct",
    "total_budget_spent", "remaining_budget",
    "cost_per_life_saved_vs_none", "cost_per_life_saved_vs_random",
    "total_vaccines_used", "total_brigades_used", "total_hub_days_closed",
    "wasted_vaccines_count", "zero_wasted_vaccines_verified",
}
CONTRACT_DAILY_KEYS = {
    "sano", "mordido", "zombie", "aislado", "inmune", "ever_infected",
    "daily_budget_spent", "cumulative_budget_spent", "vaccines_applied", "brigades_deployed", "hubs_closed",
}


class TestSimulatorConstantsAndNormalization(unittest.TestCase):

    def test_state_constants(self):
        """Verifica los valores numéricos y nombres de los 5 estados SEIR-VQ."""
        self.assertEqual(STATE_SANO, 0)
        self.assertEqual(STATE_MORDIDO, 1)
        self.assertEqual(STATE_ZOMBIE, 2)
        self.assertEqual(STATE_AISLADO, 3)
        self.assertEqual(STATE_INMUNE, 4)

        self.assertEqual(STATE_NAMES[0], "sano")
        self.assertEqual(STATE_NAMES[1], "mordido")
        self.assertEqual(STATE_NAMES[2], "zombie")
        self.assertEqual(STATE_NAMES[3], "aislado")
        self.assertEqual(STATE_NAMES[4], "inmune")

    def test_normalize_default_params(self):
        """Verifica que un diccionario vacío devuelva los parámetros por defecto."""
        normalized = normalize_simulation_params({})
        for key, val in DEFAULT_SIMULATION_PARAMS.items():
            self.assertEqual(normalized[key], val)

    def test_normalize_clamping_and_types(self):
        """Verifica que los valores extremos se acoten a rangos seguros."""
        raw = {
            "n_nodes": "50",            # Por debajo de min 100
            "days": 999,                 # Por encima de max 180
            "beta_day": "1.85",          # Por encima de max 1.0
            "vaccine_efficacy": -0.5,    # Por debajo de min 0.0
            "start_hub": "UNKNOWN_PLACE", # No válido
            "initial_infected": 500,     # Debe acotarse respecto a n_nodes
        }
        normalized = normalize_simulation_params(raw)

        self.assertEqual(normalized["n_nodes"], 100)
        self.assertEqual(normalized["days"], 180)
        self.assertEqual(normalized["beta_day"], 1.0)
        self.assertEqual(normalized["vaccine_efficacy"], 0.0)
        self.assertEqual(normalized["start_hub"], "mercado_tarqui")
        self.assertTrue(normalized["initial_infected"] <= 50)


class TestSingleRun(unittest.TestCase):

    def setUp(self):
        self.params = normalize_simulation_params(SMALL)
        self.net = build_manta_multilayer_network(self.params["n_nodes"], self.params["seed"])

    def test_population_is_conserved_every_day(self):
        for strategy in STRATEGIES:
            res = run_single_simulation(self.net, self.params, strategy, _run_seed(2026, 0))
            np.testing.assert_array_equal(res["counts"].sum(axis=1), self.params["n_nodes"])

    def test_series_have_days_plus_one_values(self):
        res = run_single_simulation(self.net, self.params, "shield", _run_seed(2026, 0), record_spatial=True)
        self.assertEqual(len(res["counts"]), self.params["days"] + 1)
        self.assertEqual(len(res["spatial"]), self.params["days"] + 1)

    def test_none_spends_nothing(self):
        res = run_single_simulation(self.net, self.params, "none", _run_seed(2026, 0))
        self.assertEqual(res["daily_budget_spent"].sum(), 0)
        self.assertEqual(res["vaccines_applied"].sum(), 0)
        self.assertEqual(res["brigades_deployed"].sum(), 0)
        self.assertEqual(res["hubs_closed"].sum(), 0)

    def test_budget_never_exceeds_total(self):
        for strategy in ("random", "shield"):
            res = run_single_simulation(self.net, self.params, strategy, _run_seed(2026, 1))
            self.assertLessEqual(res["daily_budget_spent"].sum(), self.params["total_budget"] + 1e-6)

    def test_same_patient_zero_for_all_strategies(self):
        day0 = [run_single_simulation(self.net, self.params, s, _run_seed(2026, 4))["counts"][0].tolist()
                for s in STRATEGIES]
        self.assertEqual(day0[0], day0[1])
        self.assertEqual(day0[1], day0[2])

    def test_vaccine_candidates_are_only_sanos(self):
        """Regla de Oro: ningún Mordido, Zombie, Aislado o Inmune entra en la lista de vacunación."""
        prep = _prepare_network(self.net)
        n = self.params["n_nodes"]
        rng = np.random.default_rng(0)
        state = rng.integers(0, 5, size=n).astype(np.int8)
        detected = np.ones(n, dtype=bool)
        candidates = _vaccine_expected_infections(prep, self.params, state, np.zeros(n, bool), detected)
        self.assertGreater(len(candidates), 0)
        self.assertTrue(all(state[u] == STATE_SANO for u in candidates))


class TestMonteCarloEnsemble(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.result = run_monte_carlo_ensemble(SMALL)

    def test_deterministic_with_same_seed(self):
        self.assertEqual(run_monte_carlo_ensemble(SMALL), self.result)

    def test_different_seed_changes_result(self):
        other = run_monte_carlo_ensemble({**SMALL, "seed": 9999})
        self.assertNotEqual(other["summary_kpis"], self.result["summary_kpis"])

    def test_zero_wasted_vaccines(self):
        kpis = self.result["summary_kpis"]
        self.assertEqual(kpis["wasted_vaccines_count"], 0)
        self.assertTrue(kpis["zero_wasted_vaccines_verified"])

    def test_matches_typescript_contract(self):
        self.assertEqual(set(self.result), {"params", "summary_kpis", "strategies", "spatial_timelines"})
        self.assertEqual(set(self.result["summary_kpis"]), CONTRACT_KPI_KEYS)
        n_days = SMALL["days"] + 1
        for strategy in STRATEGIES:
            daily = self.result["strategies"][strategy]
            self.assertEqual(set(daily), CONTRACT_DAILY_KEYS)
            for band in ("sano", "zombie", "ever_infected"):
                self.assertEqual(set(daily[band]), {"mean", "p10", "p50", "p90"})
                self.assertEqual(len(daily[band]["mean"]), n_days)

        timeline = self.result["spatial_timelines"]["shield"]
        self.assertEqual(len(timeline), n_days)
        self.assertEqual(set(timeline[0]["parishes"]), set(PARISH_IDS))
        self.assertEqual(set(timeline[0]["hubs"]), set(HUB_IDS))

    def test_json_serializable(self):
        json.dumps(self.result)

    def test_percentile_bands_are_ordered(self):
        band = self.result["strategies"]["none"]["zombie"]
        for p10, p50, p90 in zip(band["p10"], band["p50"], band["p90"]):
            self.assertLessEqual(p10, p50)
            self.assertLessEqual(p50, p90)

    def test_batches_in_any_order_equal_single_ensemble(self):
        """Lo que hará AWS: varios workers con lotes de réplicas que llegan desordenados."""
        params = normalize_simulation_params(SMALL)
        batch_a = run_batch_simulations(params, range(0, 5), include_spatial=True)
        batch_b = run_batch_simulations(params, range(5, 10), include_spatial=True)
        self.assertEqual(aggregate_batch_results(params, [batch_b, batch_a]), self.result)


class TestStrategySuperiority(unittest.TestCase):
    """Con los parámetros oficiales (semilla 2026, 30 réplicas)."""

    @classmethod
    def setUpClass(cls):
        cls.default = run_monte_carlo_ensemble({})
        cls.surprise = run_monte_carlo_ensemble({"vaccine_efficacy": 0.25, "beta_day": 0.18})

    def test_shield_beats_random_beats_none(self):
        k = self.default["summary_kpis"]
        self.assertLess(k["total_infected_shield"], k["total_infected_random"])
        self.assertLess(k["total_infected_random"], k["total_infected_none"])

    def test_surprise_outbreak_shifts_budget_to_brigades(self):
        """Vacuna poco eficaz + contagio alto: el optimizador compra más brigadas y menos vacunas."""
        default, surprise = self.default["summary_kpis"], self.surprise["summary_kpis"]
        self.assertGreater(surprise["total_brigades_used"], default["total_brigades_used"])
        self.assertLess(surprise["total_vaccines_used"], default["total_vaccines_used"])

    def test_surprise_outbreak_still_beats_random(self):
        k = self.surprise["summary_kpis"]
        self.assertLess(k["total_infected_shield"], k["total_infected_random"])
        self.assertEqual(k["wasted_vaccines_count"], 0)


if __name__ == "__main__":
    unittest.main()
