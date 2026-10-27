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

import heapq
from typing import Dict, Any, List, Optional, Sequence, Set

import numpy as np

from src.engine.graph_manta import (
    HUB_IDS,
    MANTA_HUBS,
    MANTA_PARISHES,
    NO_HUB,
    PARISH_IDS,
    build_manta_multilayer_network,
)

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
    "beta_day": 0.05,
    "beta_night": 0.07,
    "incubation_days": 2,
    "infectious_days": 5,
    "vaccine_efficacy": 0.85,
    "daily_budget": 400.0,
    "total_budget": 8000.0,
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
# PREPARACIÓN DE LA RED PARA EL MOTOR (aristas en formato plano)
# ============================================================================

STRATEGIES: List[str] = ["none", "random", "shield"]
N_STATES: int = 5

# Probabilidad diaria de que un Zombie sea reportado al COE. Las brigadas y la
# vacunación en anillo solo actúan sobre casos detectados; los Mordidos en
# incubación son invisibles. Sin esto el COE "adivinaría" a los pacientes cero.
DETECTION_PROB: float = 0.35
# Un cortafuegos frena también a los Zombies que nadie ha reportado todavía:
# el COE estima cuántos contagios evita multiplicando lo visible por este factor.
HIDDEN_CASE_FACTOR: float = 2.0
# Peso de la exposición a 2 saltos frente a la de 1 salto en la vacunación en anillo
RING_SECOND_HOP_WEIGHT: float = 0.25
# Candidatos de vacuna evaluados por día (los de mayor ROI); evita colas enormes
VACCINE_SHORTLIST: int = 300


def _prepare_network(net: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convierte las capas CSR de la red en listas planas de aristas dirigidas
    (origen -> destino), que permiten calcular contagios con np.bincount.
    """
    n = net["n_nodes"]
    day_src = np.repeat(np.arange(n, dtype=np.int32), np.diff(net["day_indptr"]))
    night_src = np.repeat(np.arange(n, dtype=np.int32), np.diff(net["night_indptr"]))
    day_degree = np.diff(net["day_indptr"]).astype(np.float64)
    hub_edges = [np.flatnonzero(net["day_edge_hub"] == h) for h in range(len(HUB_IDS))]
    return {
        "net": net,
        "n": n,
        "day_src": day_src,
        "day_dst": net["day_neighbors"],
        "day_w": net["day_weights"].astype(np.float64),
        "day_hub": net["day_edge_hub"],
        "night_src": night_src,
        "night_dst": net["night_neighbors"],
        "night_w": net["night_weights"].astype(np.float64),
        "all_src": np.concatenate([day_src, night_src]),
        "all_dst": np.concatenate([net["day_neighbors"], net["night_neighbors"]]),
        "day_degree": day_degree,
        "hub_edges": hub_edges,
        "mean_day_degree": float(day_degree.mean()),
    }


# ============================================================================
# TAREA 2.0: SIEMBRA DEL PACIENTE CERO
# ============================================================================

#reorganiza los contactos de la red en lsitas planas (a -->"w"). Así numpy calcula los contagios de todos a la vez, en lugar de persona por persona.
def seed_initial_outbreak(
    prep: Dict[str, Any], params: Dict[str, Any], rng: np.random.Generator
) -> np.ndarray:
    """
    Elige los pacientes cero entre los asistentes del start_hub (o toda la
    población si es 'random'), con más probabilidad para quien tiene más
    contactos diurnos: un foco realista en un mercado empieza por quien más se mueve.
    """
    net = prep["net"]
    if params["start_hub"] == "random":
        pool = np.arange(prep["n"])
    else:
        pool = net["hub_members"][params["start_hub"]]
        if len(pool) == 0:
            pool = np.arange(prep["n"])
    k = min(params["initial_infected"], len(pool))
    weights = prep["day_degree"][pool] + 1.0
    return rng.choice(pool, size=k, replace=False, p=weights / weights.sum())


# ============================================================================
# TAREA 5.0: MOTOR DE TRANSMISIÓN DÍA / NOCHE
# ============================================================================

def step_day_and_night_transmission(
    prep: Dict[str, Any],
    params: Dict[str, Any],
    state: np.ndarray,
    firewall: np.ndarray,
    rng: np.random.Generator,
) -> np.ndarray:
    """
    Devuelve los índices de los Sanos mordidos hoy.
    Solo los Zombies activos contagian (los Aislados no). Cada Sano acumula una
    fuerza de infección lambda y se contagia con probabilidad 1 - exp(-lambda).
    """
    n = prep["n"]
    zombie = state == STATE_ZOMBIE

    # 5.1 Fase diurna: aristas Zombie -> Sano; las de un Hub cerrado pierden su fuerza
    src, dst = prep["day_src"], prep["day_dst"]
    active = zombie[src] & (state[dst] == STATE_SANO)
    w = prep["day_w"][active]
    if firewall.any():
        hub = prep["day_hub"][active]
        closed = (hub != NO_HUB) & firewall[np.maximum(hub, 0)]
        w = np.where(closed, w * (1.0 - params["hub_firewall_reduction"]), w)
    lam = np.bincount(dst[active], weights=w * params["beta_day"], minlength=n)
    bitten_day = (lam > 0) & (rng.random(n) < 1.0 - np.exp(-lam))

    # 5.2 Fase nocturna: solo quien sigue Sano tras el día
    still_sano = (state == STATE_SANO) & ~bitten_day
    src, dst = prep["night_src"], prep["night_dst"]
    active = zombie[src] & still_sano[dst]
    lam = np.bincount(dst[active], weights=prep["night_w"][active] * params["beta_night"], minlength=n)
    bitten_night = (lam > 0) & (rng.random(n) < 1.0 - np.exp(-lam))

    return np.flatnonzero(bitten_day | bitten_night)


def _advance_disease(
    state: np.ndarray, days_in_state: np.ndarray, params: Dict[str, Any]
) -> None:
    """
    5.3 Avanza el reloj de los infectados:
    Mordido -> Zombie tras incubation_days; Zombie o Aislado -> Inmune tras infectious_days.
    Un Aislado conserva su reloj de Zombie: el aislamiento corta el contagio, no la enfermedad.
    """
    infected = (state == STATE_MORDIDO) | (state == STATE_ZOMBIE) | (state == STATE_AISLADO)
    days_in_state[infected] += 1

    to_zombie = (state == STATE_MORDIDO) & (days_in_state >= params["incubation_days"])
    state[to_zombie] = STATE_ZOMBIE
    days_in_state[to_zombie] = 0

    to_immune = ((state == STATE_ZOMBIE) | (state == STATE_AISLADO)) & (days_in_state >= params["infectious_days"])
    state[to_immune] = STATE_INMUNE
    days_in_state[to_immune] = 0


# ============================================================================
# TAREA 3.0: DEFENSAS DE ESCUDO MANTA (ROI MARGINAL POR DÓLAR)
# ============================================================================

def _known_zombies(state: np.ndarray, detected: np.ndarray) -> np.ndarray:
    """Zombies activos que el COE conoce. Los no detectados y los Mordidos son invisibles."""
    return (state == STATE_ZOMBIE) & detected


def _hub_expected_infections(
    prep: Dict[str, Any], params: Dict[str, Any], state: np.ndarray, detected: np.ndarray, h: int
) -> float:
    """
    3.1 Contagios diurnos que se evitan hoy al cerrar el Hub h:
    fuerza de sus aristas Zombie conocido -> Sano por la reducción del cortafuegos,
    corregida por los casos ocultos (HIDDEN_CASE_FACTOR).
    (Versión exacta de Zombies_h x k_h x beta x Sanos_h/N_h.)
    """
    edges = prep["hub_edges"][h]
    src, dst = prep["day_src"][edges], prep["day_dst"][edges]
    active = _known_zombies(state, detected)[src] & (state[dst] == STATE_SANO)
    visible = float(prep["day_w"][edges][active].sum()) * params["beta_day"] * params["hub_firewall_reduction"]
    return visible * HIDDEN_CASE_FACTOR


def _brigade_expected_infections(
    prep: Dict[str, Any], params: Dict[str, Any], state: np.ndarray,
    days_in_state: np.ndarray, detected: np.ndarray,
) -> Dict[int, float]:
    """
    3.2 Contagios que se evitan al aislar a cada Zombie conocido durante los días
    que le quedan: fuerza diaria hacia sus vecinos Sanos (día + noche) x días restantes.
    """
    n = prep["n"]
    zombie = _known_zombies(state, detected)
    sano = state == STATE_SANO
    force = np.zeros(n)
    for layer, beta in (("day", params["beta_day"]), ("night", params["beta_night"])):
        src, dst = prep[f"{layer}_src"], prep[f"{layer}_dst"]
        active = zombie[src] & sano[dst]
        force += np.bincount(src[active], weights=prep[f"{layer}_w"][active] * beta, minlength=n)
    zombies = np.flatnonzero(zombie)
    remaining = np.maximum(params["infectious_days"] - days_in_state[zombies], 1)
    return dict(zip(zombies.tolist(), (force[zombies] * remaining).tolist()))


def _vaccine_expected_infections(
    prep: Dict[str, Any], params: Dict[str, Any], state: np.ndarray,
    vaccinated: np.ndarray, detected: np.ndarray,
) -> Dict[int, float]:
    """
    3.3 Valor de vacunar a cada Sano no vacunado (anillo + puente).
    FILTRO OBLIGATORIO: solo se consideran nodos con state == STATE_SANO.
    """
    n = prep["n"]
    candidates = np.flatnonzero((state == STATE_SANO) & ~vaccinated)
    if len(candidates) == 0:
        return {}

    # Exposición en anillo: Zombies conocidos a 1 salto + caminos a 2 saltos.
    # El segundo salto captura a los Mordidos invisibles alrededor de cada caso.
    infected = _known_zombies(state, detected).astype(np.float64)
    src, dst = prep["all_src"], prep["all_dst"]
    ring1 = np.bincount(dst, weights=infected[src], minlength=n)
    ring2 = np.bincount(dst, weights=ring1[src], minlength=n)
    ring = ring1 + RING_SECOND_HOP_WEIGHT * ring2

    bridge = prep["net"]["bridge_score"]
    beta = params["beta_day"]
    value = params["vaccine_efficacy"] * (
        0.65 * ring[candidates] * beta
        + 0.35 * bridge[candidates] * prep["mean_day_degree"] * beta
    )
    if len(candidates) > VACCINE_SHORTLIST:
        top = np.argpartition(-value, VACCINE_SHORTLIST)[:VACCINE_SHORTLIST]
        candidates, value = candidates[top], value[top]
    return dict(zip(candidates.tolist(), value.tolist()))


def apply_daily_interventions_shield(
    prep: Dict[str, Any],
    params: Dict[str, Any],
    state: np.ndarray,
    days_in_state: np.ndarray,
    vaccinated: np.ndarray,
    detected: np.ndarray,
    budget: float,
    rng: np.random.Generator,
) -> Dict[str, Any]:
    """
    3.4 Asignador voraz: compra una a una la acción con mayor
    contagios-evitados-por-dólar hasta agotar el presupuesto disponible.
    Si la vacuna es poco eficaz o el contagio se dispara, su ROI baja solo
    y el dinero se va a brigadas y cortafuegos sin reglas especiales.
    """
    heap: List[tuple] = []
    tie = 0

    def push(roi: float, kind: str, target: int, fresh: bool) -> None:
        nonlocal tie
        if roi > 0:
            heapq.heappush(heap, (-roi, tie, kind, target, fresh))
            tie += 1

    costs = _action_costs(params)
    for h in range(len(HUB_IDS)):
        push(_hub_expected_infections(prep, params, state, detected, h) / costs["hub"], "hub", h, True)
    for z, value in _brigade_expected_infections(prep, params, state, days_in_state, detected).items():
        push(value / costs["brigade"], "brigade", z, True)
    for u, value in _vaccine_expected_infections(prep, params, state, vaccinated, detected).items():
        push(value / costs["vaccine"], "vaccine", u, True)

    log = _empty_action_log()
    while heap and budget >= min(costs.values()):
        _, _, kind, target, fresh = heapq.heappop(heap)
        if costs[kind] > budget:
            continue
        if kind == "hub" and fresh:
            # Las brigadas de hoy pueden haber vaciado el Hub: se reevalúa antes de pagar
            roi = _hub_expected_infections(prep, params, state, detected, target) / costs["hub"]
            if heap and roi < -heap[0][0]:
                push(roi, "hub", target, False)
                continue
        budget -= costs[kind]
        _apply_action(kind, target, params, state, vaccinated, rng, log)
        log["spent"] += costs[kind]
    log["budget_left"] = budget
    return log


def _action_costs(params: Dict[str, Any]) -> Dict[str, float]:
    return {"hub": params["hub_closure_cost"], "brigade": params["brigade_cost"],
            "vaccine": params["vaccine_cost"]}


def _empty_action_log() -> Dict[str, Any]:
    return {"spent": 0.0, "vaccines": 0, "brigades": 0, "wasted": 0,
            "firewall": np.zeros(len(HUB_IDS), dtype=bool), "vaccinated_today": [], "budget_left": 0.0}


def _apply_action(kind, target, params, state, vaccinated, rng, log) -> None:
    if kind == "hub":
        log["firewall"][target] = True
    elif kind == "brigade":
        state[target] = STATE_AISLADO
        log["brigades"] += 1
    else:
        # Auditoría de la Regla de Oro: una dosis a alguien no Sano es desperdicio
        if state[target] != STATE_SANO:
            log["wasted"] += 1
        vaccinated[target] = True
        log["vaccines"] += 1
        log["vaccinated_today"].append(target)
        if rng.random() < params["vaccine_efficacy"]:
            state[target] = STATE_INMUNE


# ============================================================================
# TAREA 4.2: LÍNEA BASE ALEATORIA
# ============================================================================

def apply_daily_interventions_random(
    prep: Dict[str, Any],
    params: Dict[str, Any],
    state: np.ndarray,
    vaccinated: np.ndarray,
    detected: np.ndarray,
    budget: float,
    rng: np.random.Generator,
) -> Dict[str, Any]:
    """
    Mismo presupuesto e información que 'shield', pero cada compra es al azar:
    un tipo de acción cualquiera y un objetivo cualquiera, sin mirar anillos
    ni puentes. También respeta la Regla de Oro: solo vacuna a Sanos.
    """
    costs = _action_costs(params)
    log = _empty_action_log()
    while True:
        options = []
        if budget >= costs["hub"] and not log["firewall"].all():
            options.append("hub")
        zombies = np.flatnonzero(_known_zombies(state, detected))
        if budget >= costs["brigade"] and len(zombies) > 0:
            options.append("brigade")
        sanos = np.flatnonzero((state == STATE_SANO) & ~vaccinated)
        if budget >= costs["vaccine"] and len(sanos) > 0:
            options.append("vaccine")
        if not options:
            break
        kind = options[rng.integers(len(options))]
        if kind == "hub":
            target = int(rng.choice(np.flatnonzero(~log["firewall"])))
        elif kind == "brigade":
            target = int(rng.choice(zombies))
        else:
            target = int(rng.choice(sanos))
        budget -= costs[kind]
        _apply_action(kind, target, params, state, vaccinated, rng, log)
        log["spent"] += costs[kind]
    log["budget_left"] = budget
    return log


# ============================================================================
# UNA CORRIDA COMPLETA (TAREAS 2.0 A 5.0)
# ============================================================================

def run_single_simulation(
    net: Dict[str, Any],
    params: Dict[str, Any],
    strategy: str,
    run_seed: int,
    record_spatial: bool = False,
    prep: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Ejecuta una corrida del modelo epidemiológico SEIR-VQ.
    strategy in {'none', 'random', 'shield'}

    Las tres estrategias con el mismo run_seed comparten el mismo paciente cero
    y la misma secuencia de azar (números aleatorios comunes): así la diferencia
    entre ellas se debe a la estrategia y no a la suerte.

    Las series tienen days + 1 valores: el día 0 (siembra) y los días 1..days.
    """
    if strategy not in STRATEGIES:
        raise ValueError(f"Estrategia desconocida: {strategy}")
    prep = prep or _prepare_network(net)
    n, days = prep["n"], params["days"]

    state = np.full(n, STATE_SANO, dtype=np.int8)
    days_in_state = np.zeros(n, dtype=np.int16)
    vaccinated = np.zeros(n, dtype=bool)
    ever_infected = np.zeros(n, dtype=bool)
    detected = np.zeros(n, dtype=bool)

    # 2.0 Paciente cero con su propio generador, idéntico para las 3 estrategias
    patient_zero = seed_initial_outbreak(prep, params, np.random.default_rng([run_seed, 0]))
    state[patient_zero] = STATE_ZOMBIE
    ever_infected[patient_zero] = True
    rng = np.random.default_rng([run_seed, 1])
    detection_rng = np.random.default_rng([run_seed, 2])

    counts = np.zeros((days + 1, N_STATES), dtype=np.int32)
    ever = np.zeros(days + 1, dtype=np.int32)
    spent = np.zeros(days + 1)
    vaccines = np.zeros(days + 1, dtype=np.int32)
    brigades = np.zeros(days + 1, dtype=np.int32)
    hubs_closed = np.zeros(days + 1, dtype=np.int32)
    wasted = 0
    spatial: List[Dict[str, Any]] = []

    counts[0] = np.bincount(state, minlength=N_STATES)
    ever[0] = ever_infected.sum()
    if record_spatial:
        spatial.append(_spatial_snapshot(net, state, 0, np.zeros(len(HUB_IDS), dtype=bool), []))

    injected = 0.0
    budget = 0.0
    for t in range(1, days + 1):
        # 3.4 Inyección diaria del COE sin pasar el techo total (lo no gastado se acumula)
        if strategy != "none":
            injection = min(params["daily_budget"], params["total_budget"] - injected)
            injected += injection
            budget += injection

        # Vigilancia: cada Zombie aún no reportado puede ser detectado hoy
        detected |= (state == STATE_ZOMBIE) & (detection_rng.random(n) < DETECTION_PROB)

        if strategy == "shield":
            log = apply_daily_interventions_shield(prep, params, state, days_in_state, vaccinated,
                                                   detected, budget, rng)
        elif strategy == "random":
            log = apply_daily_interventions_random(prep, params, state, vaccinated, detected, budget, rng)
        else:
            log = _empty_action_log()
            log["budget_left"] = budget
        budget = log["budget_left"]

        bitten = step_day_and_night_transmission(prep, params, state, log["firewall"], rng)
        _advance_disease(state, days_in_state, params)
        state[bitten] = STATE_MORDIDO
        days_in_state[bitten] = 0
        ever_infected[bitten] = True

        counts[t] = np.bincount(state, minlength=N_STATES)
        ever[t] = ever_infected.sum()
        spent[t] = log["spent"]
        vaccines[t] = log["vaccines"]
        brigades[t] = log["brigades"]
        hubs_closed[t] = int(log["firewall"].sum())
        wasted += log["wasted"]
        if record_spatial:
            spatial.append(_spatial_snapshot(net, state, t, log["firewall"], log["vaccinated_today"]))

    return {
        "strategy": strategy,
        "counts": counts,
        "ever_infected": ever,
        "daily_budget_spent": spent,
        "vaccines_applied": vaccines,
        "brigades_deployed": brigades,
        "hubs_closed": hubs_closed,
        "wasted_vaccines": wasted,
        "spatial": spatial if record_spatial else None,
    }


def _spatial_snapshot(
    net: Dict[str, Any], state: np.ndarray, day: int, firewall: np.ndarray, vaccinated_today: List[int]
) -> Dict[str, Any]:
    """6.3 Foto del día por parroquia y por Hub para el mapa animado."""
    n_parishes = len(PARISH_IDS)
    by_parish = np.bincount(net["node_parish"].astype(np.int64) * N_STATES + state,
                            minlength=n_parishes * N_STATES).reshape(n_parishes, N_STATES)
    active = (state == STATE_MORDIDO) | (state == STATE_ZOMBIE)
    hub = net["primary_hub"]
    active_by_hub = np.bincount(hub[active & (hub != NO_HUB)], minlength=len(HUB_IDS))
    vacc_hub = hub[np.asarray(vaccinated_today, dtype=np.int64)] if vaccinated_today else np.empty(0, dtype=np.int8)
    vacc_by_hub = np.bincount(vacc_hub[vacc_hub != NO_HUB], minlength=len(HUB_IDS))

    parishes = {}
    for p, p_id in enumerate(PARISH_IDS):
        row = by_parish[p]
        total = int(row.sum())
        parishes[p_id] = {
            "parish_id": p_id,
            "parish_name": MANTA_PARISHES[p_id]["name"],
            "sanos": int(row[STATE_SANO]),
            "mordidos": int(row[STATE_MORDIDO]),
            "zombies": int(row[STATE_ZOMBIE]),
            "aislados": int(row[STATE_AISLADO]),
            "inmunes": int(row[STATE_INMUNE]),
            "total_population": total,
            # Porcentaje 0-100 de la parroquia con infección activa (Mordidos + Zombies)
            "prevalence_pct": round(100.0 * (row[STATE_MORDIDO] + row[STATE_ZOMBIE]) / max(total, 1), 2),
        }
    hubs = {}
    for h, h_id in enumerate(HUB_IDS):
        hubs[h_id] = {
            "hub_id": h_id,
            "hub_name": MANTA_HUBS[h_id]["name"],
            "parish_id": MANTA_HUBS[h_id]["parish"],
            "active_cases": int(active_by_hub[h]),
            "firewall_active": bool(firewall[h]),
            "vaccines_in_ring_today": int(vacc_by_hub[h]),
        }
    return {"day": day, "parishes": parishes, "hubs": hubs}


# ============================================================================
# TAREA 6.0: LOTES MONTE CARLO Y AGREGACIÓN
# ============================================================================

def _run_seed(seed: int, run_index: int) -> int:
    return int(seed) * 1000 + int(run_index)


def run_batch_simulations(
    params: Dict[str, Any],
    run_indices: Sequence[int],
    include_spatial: bool = True,
) -> Dict[str, Any]:
    """
    6.1 Ejecuta un lote de réplicas para las 3 estrategias.
    Lo usa run_monte_carlo_ensemble en local y el worker de AWS Lambda
    (cada worker recibe unos pocos run_indices). El resultado es JSON serializable.
    La serie espacial se guarda solo para la réplica 0, si está en el lote.
    """
    params = normalize_simulation_params(params)
    net = build_manta_multilayer_network(params["n_nodes"], params["seed"])
    prep = _prepare_network(net)

    out: Dict[str, Any] = {"run_indices": [int(k) for k in run_indices], "strategies": {}, "spatial": {}}
    for strategy in STRATEGIES:
        runs = []
        for k in run_indices:
            record = include_spatial and int(k) == 0
            res = run_single_simulation(net, params, strategy, _run_seed(params["seed"], k), record, prep)
            if record:
                out["spatial"][strategy] = res["spatial"]
            runs.append({
                "counts": res["counts"].tolist(),
                "ever_infected": res["ever_infected"].tolist(),
                "daily_budget_spent": res["daily_budget_spent"].tolist(),
                "vaccines_applied": res["vaccines_applied"].tolist(),
                "brigades_deployed": res["brigades_deployed"].tolist(),
                "hubs_closed": res["hubs_closed"].tolist(),
                "wasted_vaccines": int(res["wasted_vaccines"]),
            })
        out["strategies"][strategy] = runs
    return out


def _band(matrix: np.ndarray) -> Dict[str, List[float]]:
    """Media y percentiles P10/P50/P90 por día de una matriz [réplicas x días]."""
    return {
        "mean": np.round(matrix.mean(axis=0), 3).tolist(),
        "p10": np.round(np.percentile(matrix, 10, axis=0), 3).tolist(),
        "p50": np.round(np.percentile(matrix, 50, axis=0), 3).tolist(),
        "p90": np.round(np.percentile(matrix, 90, axis=0), 3).tolist(),
    }


def _safe_pct(part: float, whole: float) -> float:
    return round(100.0 * part / whole, 2) if whole > 0 else 0.0


def aggregate_batch_results(params: Dict[str, Any], batch_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    6.2 a 6.4 Une los lotes (en cualquier orden) y produce los bloques
    params, summary_kpis, strategies y spatial_timelines del contrato
    SimulationResponse. El orquestador añade sim_hash, cache_hit, etc.
    """
    params = normalize_simulation_params(params)

    runs: Dict[str, Dict[int, Dict[str, Any]]] = {s: {} for s in STRATEGIES}
    spatial: Dict[str, Any] = {}
    for batch in batch_results:
        for strategy in STRATEGIES:
            for k, run in zip(batch["run_indices"], batch["strategies"][strategy]):
                runs[strategy][int(k)] = run
        spatial.update(batch.get("spatial") or {})

    arrays: Dict[str, Dict[str, np.ndarray]] = {}
    strategies_out: Dict[str, Any] = {}
    for strategy in STRATEGIES:
        ordered = [runs[strategy][k] for k in sorted(runs[strategy])]
        counts = np.array([r["counts"] for r in ordered], dtype=np.float64)  # [runs, days+1, 5]
        a = {
            "counts": counts,
            "ever": np.array([r["ever_infected"] for r in ordered], dtype=np.float64),
            "spent": np.array([r["daily_budget_spent"] for r in ordered], dtype=np.float64),
            "vaccines": np.array([r["vaccines_applied"] for r in ordered], dtype=np.float64),
            "brigades": np.array([r["brigades_deployed"] for r in ordered], dtype=np.float64),
            "hubs": np.array([r["hubs_closed"] for r in ordered], dtype=np.float64),
            "wasted": sum(r["wasted_vaccines"] for r in ordered),
        }
        arrays[strategy] = a
        strategies_out[strategy] = {
            "sano": _band(counts[:, :, STATE_SANO]),
            "mordido": _band(counts[:, :, STATE_MORDIDO]),
            "zombie": _band(counts[:, :, STATE_ZOMBIE]),
            "aislado": _band(counts[:, :, STATE_AISLADO]),
            "inmune": _band(counts[:, :, STATE_INMUNE]),
            "ever_infected": _band(a["ever"]),
            "daily_budget_spent": np.round(a["spent"].mean(axis=0), 2).tolist(),
            "cumulative_budget_spent": np.round(np.cumsum(a["spent"], axis=1).mean(axis=0), 2).tolist(),
            "vaccines_applied": np.round(a["vaccines"].mean(axis=0), 3).tolist(),
            "brigades_deployed": np.round(a["brigades"].mean(axis=0), 3).tolist(),
            "hubs_closed": np.round(a["hubs"].mean(axis=0), 3).tolist(),
        }

    return {
        "params": params,
        "summary_kpis": _summary_kpis(params, arrays),
        "strategies": strategies_out,
        "spatial_timelines": spatial,
    }


def _summary_kpis(params: Dict[str, Any], arrays: Dict[str, Dict[str, np.ndarray]]) -> Dict[str, Any]:
    """6.4 Indicadores clave. Las vidas salvadas se comparan réplica a réplica."""
    final = {s: arrays[s]["ever"][:, -1] for s in STRATEGIES}
    peaks = {s: arrays[s]["counts"][:, :, STATE_ZOMBIE].max(axis=1).mean() for s in STRATEGIES}
    shield = arrays["shield"]
    spent = float(shield["spent"].sum(axis=1).mean())

    kpis: Dict[str, Any] = {"total_population": int(params["n_nodes"])}
    for base in ("none", "random"):
        saved = final[base] - final["shield"]
        mean_saved = float(saved.mean())
        kpis[f"lives_saved_vs_{base}"] = round(mean_saved, 2)
        kpis[f"lives_saved_vs_{base}_pct"] = _safe_pct(mean_saved, float(final[base].mean()))
        kpis[f"lives_saved_vs_{base}_p10"] = round(float(np.percentile(saved, 10)), 2)
        kpis[f"lives_saved_vs_{base}_p90"] = round(float(np.percentile(saved, 90)), 2)
    for s in STRATEGIES:
        kpis[f"total_infected_{s}"] = round(float(final[s].mean()), 2)
    for s in STRATEGIES:
        kpis[f"peak_zombies_{s}"] = round(float(peaks[s]), 2)
    for base in ("none", "random"):
        kpis[f"peak_reduction_vs_{base}_pct"] = _safe_pct(peaks[base] - peaks["shield"], peaks[base])

    kpis["total_budget_spent"] = round(spent, 2)
    kpis["remaining_budget"] = round(params["total_budget"] - spent, 2)
    for base in ("none", "random"):
        saved = kpis[f"lives_saved_vs_{base}"]
        kpis[f"cost_per_life_saved_vs_{base}"] = round(spent / saved, 2) if saved > 0 else 0.0
    kpis["total_vaccines_used"] = round(float(shield["vaccines"].sum(axis=1).mean()), 2)
    kpis["total_brigades_used"] = round(float(shield["brigades"].sum(axis=1).mean()), 2)
    kpis["total_hub_days_closed"] = round(float(shield["hubs"].sum(axis=1).mean()), 2)

    # Auditoría de la Regla de Oro sobre TODAS las corridas de TODAS las estrategias
    wasted = int(sum(arrays[s]["wasted"] for s in STRATEGIES))
    kpis["wasted_vaccines_count"] = wasted
    kpis["zero_wasted_vaccines_verified"] = wasted == 0
    return kpis


def run_monte_carlo_ensemble(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ejecuta M corridas Monte Carlo comparando las 3 estrategias (modo local, un solo lote).
    """
    params = normalize_simulation_params(params)
    batch = run_batch_simulations(params, range(params["monte_carlo_runs"]), include_spatial=True)
    return aggregate_batch_results(params, [batch])
