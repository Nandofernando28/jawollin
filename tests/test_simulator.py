"""
Pruebas unitarias para el motor epidemiológico y normalización de parámetros.
"""

import unittest
from src.engine.simulator import (
    STATE_SANO,
    STATE_MORDIDO,
    STATE_ZOMBIE,
    STATE_AISLADO,
    STATE_INMUNE,
    STATE_NAMES,
    DEFAULT_SIMULATION_PARAMS,
    normalize_simulation_params,
)


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


if __name__ == "__main__":
    unittest.main()
