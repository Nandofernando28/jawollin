"""
Pruebas unitarias de la red social multicapa de Manta (Fase 1).
"""

import time
import unittest

import numpy as np

from src.engine import graph_manta
from src.engine.graph_manta import (
    HUB_IDS,
    MANTA_HUBS,
    MANTA_PARISHES,
    NO_HUB,
    PARISH_IDS,
    ROLES_CONFIG,
    build_manta_multilayer_network,
)

LAYERS = ("night", "day")


def _edge_set(net, layer):
    """Conjunto de aristas dirigidas (u, v, peso) de una capa CSR."""
    indptr = net[f"{layer}_indptr"]
    src = np.repeat(np.arange(net["n_nodes"]), np.diff(indptr))
    return src, net[f"{layer}_neighbors"], net[f"{layer}_weights"]


class TestCatalogs(unittest.TestCase):

    def test_parish_weights_sum_to_one(self):
        self.assertEqual(len(MANTA_PARISHES), 5)
        self.assertAlmostEqual(sum(p["weight"] for p in MANTA_PARISHES.values()), 1.0)

    def test_role_probs_sum_to_one(self):
        self.assertAlmostEqual(sum(r["prob"] for r in ROLES_CONFIG.values()), 1.0)

    def test_hubs_point_to_valid_parishes(self):
        self.assertEqual(len(MANTA_HUBS), 5)
        for hub in MANTA_HUBS.values():
            self.assertIn(hub["parish"], MANTA_PARISHES)


class TestBuildNetwork(unittest.TestCase):

    def setUp(self):
        graph_manta._GRAPH_CACHE.clear()

    def test_same_seed_is_identical(self):
        """La misma semilla produce exactamente la misma red (sin usar la caché)."""
        a = build_manta_multilayer_network(1000, seed=2026)
        graph_manta._GRAPH_CACHE.clear()
        b = build_manta_multilayer_network(1000, seed=2026)
        self.assertIsNot(a, b)
        for key in ("node_parish", "household_id", "role", "primary_hub", "bridge_score",
                    "night_indptr", "night_neighbors", "night_weights",
                    "day_indptr", "day_neighbors", "day_weights", "day_edge_hub"):
            np.testing.assert_array_equal(a[key], b[key], err_msg=key)

    def test_different_seed_changes_topology(self):
        a = build_manta_multilayer_network(1000, seed=2026)
        b = build_manta_multilayer_network(1000, seed=9999)
        self.assertFalse(np.array_equal(a["day_neighbors"], b["day_neighbors"]))

    def test_tarqui_proportion(self):
        """Tarqui debe tener entre 33% y 43% de la población (38% INEC)."""
        net = build_manta_multilayer_network(1000, seed=2026)
        share = len(net["parish_members"]["tarqui"]) / net["n_nodes"]
        self.assertGreaterEqual(share, 0.33)
        self.assertLessEqual(share, 0.43)

    def test_all_hubs_have_members(self):
        net = build_manta_multilayer_network(1000, seed=2026)
        self.assertEqual(list(net["hub_members"].keys()), HUB_IDS)
        for hub_id, members in net["hub_members"].items():
            self.assertGreater(len(members), 0, hub_id)
            np.testing.assert_array_equal(net["primary_hub"][members], HUB_IDS.index(hub_id))

    def test_edges_symmetric_positive_no_self_loops(self):
        net = build_manta_multilayer_network(1000, seed=2026)
        for layer in LAYERS:
            src, dst, w = _edge_set(net, layer)
            self.assertTrue(np.all(w > 0), layer)
            self.assertFalse(np.any(src == dst), layer)
            forward = set(zip(src.tolist(), dst.tolist(), w.tolist()))
            backward = set(zip(dst.tolist(), src.tolist(), w.tolist()))
            self.assertEqual(forward, backward, layer)

    def test_households_within_one_parish_and_max_six(self):
        net = build_manta_multilayer_network(1000, seed=2026)
        sizes = np.bincount(net["household_id"])
        self.assertLessEqual(sizes.max(), 6)
        parishes_per_household = {
            h: set(net["node_parish"][net["household_id"] == h].tolist()) for h in range(len(sizes))
        }
        self.assertTrue(all(len(p) == 1 for p in parishes_per_household.values()))

    def test_household_members_are_night_neighbors(self):
        """Clique familiar: cada integrante está conectado de noche con todo su hogar."""
        net = build_manta_multilayer_network(500, seed=7)
        indptr, nbrs = net["night_indptr"], net["night_neighbors"]
        for u in range(0, net["n_nodes"], 25):
            family = set(np.flatnonzero(net["household_id"] == net["household_id"][u]).tolist()) - {u}
            self.assertTrue(family <= set(nbrs[indptr[u]:indptr[u + 1]].tolist()))

    def test_mean_day_degree_in_range(self):
        net = build_manta_multilayer_network(1000, seed=2026)
        mean_degree = np.diff(net["day_indptr"]).mean()
        self.assertGreaterEqual(mean_degree, 6)
        self.assertLessEqual(mean_degree, 12)

    def test_hub_edges_link_members_of_that_hub(self):
        """Cerrar un Hub solo debe tocar aristas entre personas que asisten a ese Hub."""
        net = build_manta_multilayer_network(1000, seed=2026)
        src, dst, _ = _edge_set(net, "day")
        hub = net["day_edge_hub"]
        tagged = hub != NO_HUB
        np.testing.assert_array_equal(net["primary_hub"][src[tagged]], hub[tagged])
        np.testing.assert_array_equal(net["primary_hub"][dst[tagged]], hub[tagged])

    def test_bridge_score_normalized_and_favors_transportistas(self):
        net = build_manta_multilayer_network(1000, seed=2026)
        score = net["bridge_score"]
        self.assertEqual(score.dtype, np.float32)
        self.assertEqual(len(score), net["n_nodes"])
        self.assertGreaterEqual(score.min(), 0.0)
        self.assertAlmostEqual(float(score.max()), 1.0, places=5)
        transportista = net["role"] == net["role_ids"].index("transportista")
        self.assertGreater(score[transportista].mean(), score[~transportista].mean())

    def test_rejects_too_few_nodes(self):
        with self.assertRaises(ValueError):
            build_manta_multilayer_network(50, seed=1)

    def test_arrays_are_read_only(self):
        net = build_manta_multilayer_network(300, seed=1)
        with self.assertRaises(ValueError):
            net["bridge_score"][0] = 0.5


class TestCacheAndPerformance(unittest.TestCase):

    def setUp(self):
        graph_manta._GRAPH_CACHE.clear()

    def test_cache_returns_same_object(self):
        a = build_manta_multilayer_network(800, seed=11)
        b = build_manta_multilayer_network(800, seed=11)
        self.assertIs(a, b)

    def test_cache_keeps_at_most_eight_entries(self):
        for seed in range(12):
            build_manta_multilayer_network(200, seed=seed)
        self.assertEqual(len(graph_manta._GRAPH_CACHE), 8)
        self.assertNotIn((200, 0), graph_manta._GRAPH_CACHE)
        self.assertIn((200, 11), graph_manta._GRAPH_CACHE)

    def test_5000_nodes_builds_fast(self):
        """Margen holgado sobre los 150 ms del plan para no fallar en PCs lentas."""
        build_manta_multilayer_network(300, seed=0)  # calentamiento de numpy
        start = time.perf_counter()
        build_manta_multilayer_network(5000, seed=2026)
        self.assertLess(time.perf_counter() - start, 0.5)


if __name__ == "__main__":
    unittest.main()
