"""
Estima el número reproductivo básico R0 del modelo: cuántas personas contagia,
en promedio, un solo Zombie durante todo su periodo infeccioso en una
población completamente sana. Sirve para comparar los betas con enfermedades reales.

Método: se convierte en Zombie a una persona, se simulan sus infectious_days
de contagio día/noche y se cuentan los Mordidos. Los Mordidos no avanzan a
Zombie, así que solo se cuenta la primera generación de contagios.

La persona inicial se elige como "vecino de alguien al azar": en una red real,
quien se contagia suele tener más contactos que el promedio, y eso es lo que
mide R0 en epidemiología de redes.

Uso:  python scripts/estimar_r0.py beta_day=0.05 beta_night=0.07
"""
import sys

import numpy as np

sys.path.insert(0, ".")
from src.engine.graph_manta import build_manta_multilayer_network
from src.engine.simulator import (
    STATE_MORDIDO,
    STATE_SANO,
    STATE_ZOMBIE,
    _prepare_network,
    normalize_simulation_params,
    step_day_and_night_transmission,
)

TRIALS = 2000

cambios = {}
for arg in sys.argv[1:]:
    nombre, valor = arg.split("=")
    cambios[nombre] = float(valor)

params = normalize_simulation_params(cambios)
net = build_manta_multilayer_network(params["n_nodes"], params["seed"])
prep = _prepare_network(net)
rng = np.random.default_rng(params["seed"])
no_firewall = np.zeros(len(net["hub_ids"]), dtype=bool)

secondary = np.empty(TRIALS)
for trial in range(TRIALS):
    index_case = int(prep["all_dst"][rng.integers(len(prep["all_dst"]))])
    state = np.full(prep["n"], STATE_SANO, dtype=np.int8)
    state[index_case] = STATE_ZOMBIE
    for _ in range(params["infectious_days"]):
        bitten = step_day_and_night_transmission(prep, params, state, no_firewall, rng)
        state[bitten] = STATE_MORDIDO
    secondary[trial] = np.count_nonzero(state == STATE_MORDIDO)

print("Cambios probados:", cambios or "ninguno (valores por defecto)")
print(f"beta_day={params['beta_day']}  beta_night={params['beta_night']}  "
      f"dias contagiando={params['infectious_days']}")
print(f"R0 estimado: {secondary.mean():.2f}  (cada Zombie contagia en promedio a esta cantidad de personas)")
print(f"Rango P10-P90: {np.percentile(secondary, 10):.0f} a {np.percentile(secondary, 90):.0f} personas")
