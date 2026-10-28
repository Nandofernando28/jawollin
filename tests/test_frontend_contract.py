"""
Comprueba que los valores por defecto de la interfaz coinciden con los del motor.
Si se desalinean, la UI arranca con un escenario distinto al documentado en el README.
"""

import os
import re
import unittest

from src.engine.simulator import DEFAULT_SIMULATION_PARAMS

TYPES_TS = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "types", "simulation.ts")


def _frontend_defaults():
    with open(TYPES_TS, encoding="utf-8") as f:
        source = f.read()
    block = re.search(r"export const DEFAULT_SIMULATION_PARAMS[^{]*\{(.*?)\n\};", source, re.S).group(1)
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


class TestFrontendDefaults(unittest.TestCase):

    def test_frontend_defaults_match_engine(self):
        frontend = _frontend_defaults()
        self.assertEqual(set(frontend), set(DEFAULT_SIMULATION_PARAMS))
        for key, value in DEFAULT_SIMULATION_PARAMS.items():
            self.assertEqual(frontend[key], value, key)


if __name__ == "__main__":
    unittest.main()
