"""
Motor epidemiológico estocástico SEIR-VQ para la Operación Cortafuegos Manta.
SpookyThon 2026 · Track B (La Plaga Zombie).

Incluye:
- Codificación numérica vectorizada de estados (0 a 4).
- Normalización determinista de parámetros y saneamiento de rangos (clamping).
- Motor de simulación estocástica día a día sobre red multicapa.
- Defensas combinadas 'Escudo Manta' (ROI marginal por dólar) vs líneas base ('none', 'random').
- Ensamble de Monte Carlo con percentiles P10, P50, P90.
"""

from typing import Dict, Any, Set

# ============================================================================
# TAREA 1.1: CONSTANTES NUMÉRICAS DE ESTADOS EPIDEMIOLÓGICOS (SEIR-VQ)
# ============================================================================

STATE_SANO: int = 0      # 🟢 Susceptible / Sano
STATE_MORDIDO: int = 1   # 🟡 Expuesto / Incubando (no contagia aún o transmisión reducida)
STATE_ZOMBIE: int = 2    # 🔴 Infeccioso activo (propaga mordeduras)
STATE_AISLADO: int = 3   # 🟣 Contenido por brigada sanitaria (cuarentena activa)
STATE_INMUNE: int = 4    # 🔵 Exorcizado / Inmune por vacuna exitosa o antídoto

STATE_NAMES: Dict[int, str] = {
    STATE_SANO: "sano",
    STATE_MORDIDO: "mordido",
    STATE_ZOMBIE: "zombie",
    STATE_AISLADO: "aislado",
    STATE_INMUNE: "inmune",
}

VALID_START_HUBS: Set[str] = {
    "uleam",
    "mercado_tarqui",
    "mercado_central",
    "empacadoras",
    "terminal_terrestre",
    "random",
}

# ============================================================================
# TAREA 1.2: VALORES POR DEFECTO Y NORMALIZACIÓN CON CLAMPING SEGURO
# ============================================================================

DEFAULT_SIMULATION_PARAMS: Dict[str, Any] = {
    "n_nodes": 1200,
    "seed": 2026,
    "start_hub": "mercado_tarqui",
    "initial_infected": 4,
    "days": 30,
    "monte_carlo_runs": 30,
    "beta_day": 0.085,
    "beta_night": 0.110,
    "incubation_days": 2,
    "infectious_days": 5,
    "vaccine_efficacy": 0.85,
    "daily_budget": 600.0,
    "total_budget": 12000.0,
    "vaccine_cost": 15.0,
    "brigade_cost": 65.0,
    "hub_closure_cost": 220.0,
    "hub_firewall_reduction": 0.88,
    "force_recompute": False,
}


def _clamp(val: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, val))


def normalize_simulation_params(raw_params: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Sanea, castea y acota a rangos seguros (clamping) los parámetros de la simulación.
    Garantiza que cualquier combinación recibida (incluso en el Brote Sorpresa)
    sea matemáticamente válida y segura para ejecución local y en AWS Lambda.
    """
    raw = raw_params or {}

    try:
        n_nodes = int(_clamp(int(raw.get("n_nodes", DEFAULT_SIMULATION_PARAMS["n_nodes"])), 100, 10000))
    except (ValueError, TypeError):
        n_nodes = DEFAULT_SIMULATION_PARAMS["n_nodes"]

    try:
        seed = int(raw.get("seed", DEFAULT_SIMULATION_PARAMS["seed"]))
    except (ValueError, TypeError):
        seed = DEFAULT_SIMULATION_PARAMS["seed"]

    raw_hub = str(raw.get("start_hub", DEFAULT_SIMULATION_PARAMS["start_hub"])).lower().strip()
    start_hub = raw_hub if raw_hub in VALID_START_HUBS else DEFAULT_SIMULATION_PARAMS["start_hub"]

    try:
        initial_infected = int(_clamp(
            int(raw.get("initial_infected", DEFAULT_SIMULATION_PARAMS["initial_infected"])),
            1,
            max(1, n_nodes // 2),
        ))
    except (ValueError, TypeError):
        initial_infected = DEFAULT_SIMULATION_PARAMS["initial_infected"]

    try:
        days = int(_clamp(int(raw.get("days", DEFAULT_SIMULATION_PARAMS["days"])), 5, 180))
    except (ValueError, TypeError):
        days = DEFAULT_SIMULATION_PARAMS["days"]

    try:
        monte_carlo_runs = int(_clamp(
            int(raw.get("monte_carlo_runs", DEFAULT_SIMULATION_PARAMS["monte_carlo_runs"])),
            1,
            200,
        ))
    except (ValueError, TypeError):
        monte_carlo_runs = DEFAULT_SIMULATION_PARAMS["monte_carlo_runs"]

    try:
        beta_day = float(_clamp(float(raw.get("beta_day", DEFAULT_SIMULATION_PARAMS["beta_day"])), 0.0, 1.0))
    except (ValueError, TypeError):
        beta_day = DEFAULT_SIMULATION_PARAMS["beta_day"]

    try:
        beta_night = float(_clamp(float(raw.get("beta_night", DEFAULT_SIMULATION_PARAMS["beta_night"])), 0.0, 1.0))
    except (ValueError, TypeError):
        beta_night = DEFAULT_SIMULATION_PARAMS["beta_night"]

    try:
        incubation_days = int(_clamp(
            int(raw.get("incubation_days", DEFAULT_SIMULATION_PARAMS["incubation_days"])),
            0,
            30,
        ))
    except (ValueError, TypeError):
        incubation_days = DEFAULT_SIMULATION_PARAMS["incubation_days"]

    try:
        infectious_days = int(_clamp(
            int(raw.get("infectious_days", DEFAULT_SIMULATION_PARAMS["infectious_days"])),
            1,
            60,
        ))
    except (ValueError, TypeError):
        infectious_days = DEFAULT_SIMULATION_PARAMS["infectious_days"]

    try:
        vaccine_efficacy = float(_clamp(
            float(raw.get("vaccine_efficacy", DEFAULT_SIMULATION_PARAMS["vaccine_efficacy"])),
            0.0,
            1.0,
        ))
    except (ValueError, TypeError):
        vaccine_efficacy = DEFAULT_SIMULATION_PARAMS["vaccine_efficacy"]

    try:
        daily_budget = float(_clamp(
            float(raw.get("daily_budget", DEFAULT_SIMULATION_PARAMS["daily_budget"])),
            0.0,
            10000000.0,
        ))
    except (ValueError, TypeError):
        daily_budget = DEFAULT_SIMULATION_PARAMS["daily_budget"]

    try:
        total_budget = float(_clamp(
            float(raw.get("total_budget", DEFAULT_SIMULATION_PARAMS["total_budget"])),
            0.0,
            100000000.0,
        ))
    except (ValueError, TypeError):
        total_budget = DEFAULT_SIMULATION_PARAMS["total_budget"]

    try:
        vaccine_cost = float(_clamp(
            float(raw.get("vaccine_cost", DEFAULT_SIMULATION_PARAMS["vaccine_cost"])),
            0.1,
            100000.0,
        ))
    except (ValueError, TypeError):
        vaccine_cost = DEFAULT_SIMULATION_PARAMS["vaccine_cost"]

    try:
        brigade_cost = float(_clamp(
            float(raw.get("brigade_cost", DEFAULT_SIMULATION_PARAMS["brigade_cost"])),
            0.1,
            100000.0,
        ))
    except (ValueError, TypeError):
        brigade_cost = DEFAULT_SIMULATION_PARAMS["brigade_cost"]

    try:
        hub_closure_cost = float(_clamp(
            float(raw.get("hub_closure_cost", DEFAULT_SIMULATION_PARAMS["hub_closure_cost"])),
            0.1,
            100000.0,
        ))
    except (ValueError, TypeError):
        hub_closure_cost = DEFAULT_SIMULATION_PARAMS["hub_closure_cost"]

    try:
        hub_firewall_reduction = float(_clamp(
            float(raw.get("hub_firewall_reduction", DEFAULT_SIMULATION_PARAMS["hub_firewall_reduction"])),
            0.0,
            1.0,
        ))
    except (ValueError, TypeError):
        hub_firewall_reduction = DEFAULT_SIMULATION_PARAMS["hub_firewall_reduction"]

    force_recompute = bool(raw.get("force_recompute", DEFAULT_SIMULATION_PARAMS["force_recompute"]))

    return {
        "n_nodes": n_nodes,
        "seed": seed,
        "start_hub": start_hub,
        "initial_infected": initial_infected,
        "days": days,
        "monte_carlo_runs": monte_carlo_runs,
        "beta_day": beta_day,
        "beta_night": beta_night,
        "incubation_days": incubation_days,
        "infectious_days": infectious_days,
        "vaccine_efficacy": vaccine_efficacy,
        "daily_budget": daily_budget,
        "total_budget": total_budget,
        "vaccine_cost": vaccine_cost,
        "brigade_cost": brigade_cost,
        "hub_closure_cost": hub_closure_cost,
        "hub_firewall_reduction": hub_firewall_reduction,
        "force_recompute": force_recompute,
    }


# ============================================================================
# FUNCIONES DE SIMULACIÓN (A COMPLETAR EN SUBTAREAS 2.0 A 6.0)
# ============================================================================

def run_single_simulation(
    net: Dict[str, Any],
    params: Dict[str, Any],
    strategy: str,
    run_seed: int,
    record_spatial: bool = False,
) -> Dict[str, Any]:
    """
    Ejecuta una corrida del modelo epidemiológico SEIR-VQ.
    strategy in {'none', 'random', 'shield'}
    """
    raise NotImplementedError("run_single_simulation se implementará en las subtareas 3.0-5.0")


def run_monte_carlo_ensemble(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ejecuta M corridas Monte Carlo comparando las 3 estrategias.
    """
    raise NotImplementedError("run_monte_carlo_ensemble se implementará en la subtarea 6.0")
