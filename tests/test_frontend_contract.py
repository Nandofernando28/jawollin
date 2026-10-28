"""
Comprueba que los datos del frontend coinciden con los del motor:
- Los valores por defecto de la interfaz (si se desalinean, la UI arranca con un
  escenario distinto al documentado en el README).
- Los hubs y parroquias del mapa (frontend/src/data/mantaGeo.ts): mismos
  identificadores y nombres, cada hub dentro de su parroquia y sin solapes.
- Los Brotes Sorpresa (frontend/src/data/surprisePresets.ts): mismos cambios que los
  escenarios documentados en docs/calibracion.md.
- Los contratos de frontend/src/types/simulation.ts: mismos campos que las respuestas
  reales de /simulate, /health y /mayor-report.
"""

import json
import os
import re
import unittest

from src.engine.graph_manta import HUB_IDS, MANTA_HUBS, MANTA_PARISHES, PARISH_IDS
from src.engine.simulator import DEFAULT_SIMULATION_PARAMS

FRONTEND_SRC = os.path.join(os.path.dirname(__file__), "..", "frontend", "src")
TYPES_TS = os.path.join(FRONTEND_SRC, "types", "simulation.ts")
GEO_TS = os.path.join(FRONTEND_SRC, "data", "mantaGeo.ts")
PRESETS_TS = os.path.join(FRONTEND_SRC, "data", "surprisePresets.ts")
CALIBRACION_MD = os.path.join(os.path.dirname(__file__), "..", "docs", "calibracion.md")


def _read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def _frontend_defaults():
    block = re.search(r"export const DEFAULT_SIMULATION_PARAMS[^{]*\{(.*?)\n\};", _read(TYPES_TS), re.S).group(1)
    values = {}
    for key, raw in re.findall(r"^\s*(\w+):\s*([^,\n]+),", block, re.M):
        raw = raw.strip()
        if raw in ("true", "false"):
            values[key] = raw == "true"
        elif raw.startswith("'"):
            values[key] = raw.strip("'")
        else:
            values[key] = float(raw)
    return values


def _map_hubs():
    """{hub_id: (nombre, parish_id, (lat, lon))} de MANTA_HUBS en mantaGeo.ts."""
    block = re.search(r"export const MANTA_HUBS[^=]*=\s*\[(.*?)\n\];", _read(GEO_TS), re.S).group(1)
    hubs = {}
    for entry in re.findall(r"\{(.*?)\n  \}", block, re.S):
        hub_id = re.search(r"id: '(\w+)'", entry).group(1)
        name = re.search(r"name: '([^']+)'", entry).group(1)
        parish = re.search(r"parishId: '(\w+)'", entry).group(1)
        lat, lon = map(float, re.search(r"coords: \[([-\d.]+), ([-\d.]+)\]", entry).groups())
        hubs[hub_id] = (name, parish, (lat, lon))
    return hubs


def _map_parishes():
    """{parish_id: (nombre, [(lon, lat), ...])} de MANTA_PARROQUIAS_GEO en mantaGeo.ts."""
    parishes = {}
    for pid, name, coords in re.findall(
        r"parish_id: '(\w+)', name: '([^']+)'.*?coordinates: \[\[(.*?)\]\]", _read(GEO_TS), re.S
    ):
        ring = [tuple(map(float, p)) for p in re.findall(r"\[([-\d.]+), ([-\d.]+)\]", coords)]
        parishes[pid] = (name, ring)
    return parishes


def _parse_value(raw):
    raw = raw.strip().strip("'")
    try:
        return float(raw)
    except ValueError:
        return raw


def _presets():
    """{preset_id: {param: valor}} de SURPRISE_PRESETS en surprisePresets.ts."""
    presets = {}
    for pid, changes in re.findall(r"id: '(\w+)',.*?changes: \{([^}]*)\}", _read(PRESETS_TS), re.S):
        presets[pid] = {k: _parse_value(v) for k, v in re.findall(r"(\w+): ([^,]+)", changes)}
    return presets


def _documented_surprise_changes():
    """Columna "Cambio aplicado" de la tabla "Verificación 2: Brote Sorpresa"."""
    section = _read(CALIBRACION_MD).split("## Verificación 2")[1].split("\n## ")[0]
    changes = []
    for row in re.findall(r"^\|[^|]+\| ([a-z_]+=[^|]+) \|", section, re.M):
        changes.append({k: _parse_value(v) for k, v in (item.split("=") for item in row.split())})
    return changes


def _ts_interface_keys(name):
    """Campos de primer nivel de una interfaz de simulation.ts (sin comentarios)."""
    body = re.search(r"export interface %s[^{]*\{(.*?)\n\}" % name, _read(TYPES_TS), re.S).group(1)
    keys, depth = set(), 0
    without_comments = re.sub(r"//[^\n]*", "", re.sub(r"/\*.*?\*/", "", body, flags=re.S))
    for line in without_comments.split("\n"):
        match = re.match(r"\s*(\w+)\??:", line)
        if match and depth == 0:
            keys.add(match.group(1))
        depth += line.count("{") - line.count("}")
    return keys


def _inside(lon, lat, ring):
    """Punto en polígono (ray casting)."""
    inside = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


class TestFrontendDefaults(unittest.TestCase):

    def test_frontend_defaults_match_engine(self):
        frontend = _frontend_defaults()
        self.assertEqual(set(frontend), set(DEFAULT_SIMULATION_PARAMS))
        for key, value in DEFAULT_SIMULATION_PARAMS.items():
            self.assertEqual(frontend[key], value, key)


class TestMapGeography(unittest.TestCase):

    def setUp(self):
        self.hubs = _map_hubs()
        self.parishes = _map_parishes()

    def test_hub_ids_names_and_parishes_match_engine(self):
        self.assertEqual(set(self.hubs), set(HUB_IDS))
        for hub_id, (name, parish, _) in self.hubs.items():
            self.assertEqual(name, MANTA_HUBS[hub_id]["name"], hub_id)
            self.assertEqual(parish, MANTA_HUBS[hub_id]["parish"], hub_id)

    def test_parish_ids_and_names_match_engine(self):
        self.assertEqual(set(self.parishes), set(PARISH_IDS))
        for pid, (name, _) in self.parishes.items():
            self.assertEqual(name, MANTA_PARISHES[pid]["name"], pid)

    def test_polygons_are_closed(self):
        for pid, (_, ring) in self.parishes.items():
            self.assertEqual(ring[0], ring[-1], pid)

    def test_each_hub_lies_inside_its_parish(self):
        for hub_id, (_, parish, (lat, lon)) in self.hubs.items():
            containing = [pid for pid, (_, ring) in self.parishes.items() if _inside(lon, lat, ring)]
            self.assertEqual(containing, [parish], hub_id)

    def test_parishes_do_not_overlap(self):
        rings = [ring for _, ring in self.parishes.values()]
        lons = [x for r in rings for x, _ in r]
        lats = [y for r in rings for _, y in r]
        steps = 150
        for i in range(steps):
            for j in range(steps):
                lon = min(lons) + (max(lons) - min(lons)) * (i + 0.5) / steps
                lat = min(lats) + (max(lats) - min(lats)) * (j + 0.5) / steps
                self.assertLessEqual(sum(_inside(lon, lat, r) for r in rings), 1, (lon, lat))


class TestSurprisePresets(unittest.TestCase):

    def test_four_presets_with_valid_parameters(self):
        presets = _presets()
        self.assertEqual(set(presets), {"double_beta", "half_vaccines", "market_outbreak", "weak_vaccine"})
        for pid, changes in presets.items():
            self.assertTrue(changes, pid)
            self.assertTrue(set(changes) <= set(DEFAULT_SIMULATION_PARAMS), pid)

    def test_presets_match_documented_scenarios(self):
        documented = _documented_surprise_changes()
        self.assertGreaterEqual(len(documented), 4)
        for pid, changes in _presets().items():
            self.assertIn(changes, documented, pid)

    def test_double_contagion_is_twice_the_default(self):
        changes = _presets()["double_beta"]
        self.assertAlmostEqual(changes["beta_day"], 2 * DEFAULT_SIMULATION_PARAMS["beta_day"])
        self.assertAlmostEqual(changes["beta_night"], 2 * DEFAULT_SIMULATION_PARAMS["beta_night"])


class TestApiContracts(unittest.TestCase):
    """Las interfaces TypeScript tienen exactamente los campos que envía el backend."""

    @classmethod
    def setUpClass(cls):
        from src.handlers import mayor_report, orchestrator

        def call(handler, method, path, body=None):
            event = {"rawPath": path, "requestContext": {"http": {"method": method}}}
            if body is not None:
                event["body"] = json.dumps(body)
            return json.loads(handler.lambda_handler(event)["body"])

        cls.sim = call(orchestrator, "POST", "/simulate", {"n_nodes": 300, "monte_carlo_runs": 5, "days": 10})
        cls.health = call(orchestrator, "GET", "/health")
        cls.report = call(mayor_report, "POST", "/mayor-report", {"simulation": cls.sim})

    def assertContract(self, interface, payload):
        self.assertEqual(_ts_interface_keys(interface), set(payload), interface)

    def test_simulation_contracts(self):
        self.assertContract("SimulationResponse", self.sim)
        self.assertContract("SimulationParams", self.sim["params"])
        self.assertContract("SummaryKPIs", self.sim["summary_kpis"])
        self.assertContract("StrategyDailyMetrics", self.sim["strategies"]["shield"])
        snap = self.sim["spatial_timelines"]["shield"][0]
        self.assertContract("ParishDaySnapshot", next(iter(snap["parishes"].values())))
        self.assertContract("HubDaySnapshot", next(iter(snap["hubs"].values())))

    def test_health_contract(self):
        self.assertContract("HealthCheckResponse", self.health)

    def test_mayor_report_contracts(self):
        self.assertContract("MayorReportResponse", self.report)
        self.assertContract("MayorMetricsSnapshot", self.report["metrics_snapshot"])
        self.assertContract("MayorActionItem", self.report["action_items"][0])


if __name__ == "__main__":
    unittest.main()
