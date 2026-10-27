"""
Red social multicapa sintética de Manta para la Operación Cortafuegos Manta.
SpookyThon 2026 · Track B (La Plaga Zombie).

Incluye:
- Catálogo de las 5 parroquias urbanas (pesos del Censo INEC) y los 5 Hubs críticos.
- Población sintética con hogares, roles sociales, coordenadas y Hub primario.
- Capa Nocturna (G_N): hogares en clique + vecindario barrial.
- Capa Diurna (G_D): Hubs (mundo pequeño), contactos barriales y rutas de bus.
- Centralidad Puente (bridge_score) en O(N + E) y caché LRU en memoria.

Todas las decisiones aleatorias usan un único rng = np.random.default_rng(seed),
por lo que la misma (n_nodes, seed) produce siempre exactamente la misma red.

Formato de las capas (CSR, compressed sparse row):
los vecinos del nodo u en la capa diurna son
    day_neighbors[day_indptr[u]:day_indptr[u + 1]]
con sus pesos en day_weights y su Hub en day_edge_hub (mismo rango).
Cada arista no dirigida aparece en ambos sentidos (u -> v y v -> u).
"""

from collections import OrderedDict
from typing import Dict, Any, List, Tuple

import numpy as np

# ============================================================================
# TAREA 1.1: PARROQUIAS URBANAS DE MANTA (CENSO INEC)
# ============================================================================

MANTA_PARISHES: Dict[str, Dict[str, Any]] = {
    "tarqui":       {"name": "Tarqui",       "weight": 0.38, "centroid": (0.54, 0.52)},
    "eloy_alfaro":  {"name": "Eloy Alfaro",  "weight": 0.24, "centroid": (0.62, 0.72)},
    "manta_centro": {"name": "Manta Centro", "weight": 0.22, "centroid": (0.36, 0.44)},
    "los_esteros":  {"name": "Los Esteros",  "weight": 0.11, "centroid": (0.68, 0.36)},
    "san_mateo":    {"name": "San Mateo",    "weight": 0.05, "centroid": (0.16, 0.78)},
}

PARISH_IDS: List[str] = list(MANTA_PARISHES.keys())

# ============================================================================
# TAREA 1.2: HUBS CRÍTICOS DE CONTAGIO DIURNO
# ============================================================================
# contact_weight: multiplicador de transmisión en las aristas del Hub.
# ring_k: contactos fijos por persona (aula, puesto, línea de producción).
# rewire_p: probabilidad de contacto aleatorio de pasillo/mercado.

MANTA_HUBS: Dict[str, Dict[str, Any]] = {
    "uleam": {
        "name": "ULEAM (Ciudadela Universitaria)",
        "parish": "manta_centro", "contact_weight": 1.30, "ring_k": 8, "rewire_p": 0.15,
    },
    "mercado_tarqui": {
        "name": "Mercado Central de Tarqui",
        "parish": "tarqui", "contact_weight": 1.45, "ring_k": 10, "rewire_p": 0.25,
    },
    "mercado_central": {
        "name": "Mercado Central de Manta",
        "parish": "manta_centro", "contact_weight": 1.25, "ring_k": 10, "rewire_p": 0.25,
    },
    "empacadoras": {
        "name": "Zona Industrial / Empacadoras Los Esteros",
        "parish": "los_esteros", "contact_weight": 1.35, "ring_k": 8, "rewire_p": 0.05,
    },
    "terminal_terrestre": {
        "name": "Terminal Terrestre Luis Valdivieso Morán",
        "parish": "eloy_alfaro", "contact_weight": 1.40, "ring_k": 6, "rewire_p": 0.30,
    },
}

HUB_IDS: List[str] = list(MANTA_HUBS.keys())

# Índice usado en primary_hub y day_edge_hub cuando no hay Hub
# (contacto barrial, ruta de bus). Cerrar un Hub nunca afecta a estas aristas.
NO_HUB: int = -1

# ============================================================================
# TAREA 1.3: ROLES SOCIALES DE LA POBLACIÓN
# ============================================================================
# hub_probs: probabilidad de asistir a cada Hub durante el día.
# "nearest_market" se resuelve con el mercado más cercano a la parroquia.
# Lo que falta para llegar a 1.0 es la probabilidad de no ir a ningún Hub
# (colegio barrial, movilidad dentro de la propia parroquia).

ROLES_CONFIG: Dict[str, Dict[str, Any]] = {
    "estudiante":     {"prob": 0.22, "hub_probs": {"uleam": 0.70}},
    "comerciante":    {"prob": 0.18, "hub_probs": {"nearest_market": 1.00}},
    "transportista":  {"prob": 0.10, "hub_probs": {"terminal_terrestre": 1.00}},
    "obrero_atunero": {"prob": 0.20, "hub_probs": {"empacadoras": 1.00}},
    "residente":      {"prob": 0.30, "hub_probs": {"nearest_market": 0.60}},
}

ROLE_IDS: List[str] = list(ROLES_CONFIG.keys())

# Bono de Centralidad Puente por rol estratégico (Tarea 5.1)
ROLE_BRIDGE_BONUS: Dict[str, float] = {"transportista": 1.0, "comerciante": 0.5}

# Hubs servidos por las rutas de bus interparroquiales (Tarea 4.3)
BUS_HUBS: List[str] = ["uleam", "mercado_tarqui", "empacadoras", "terminal_terrestre"]

MIN_NODES: int = 100
_GRAPH_CACHE_MAX: int = 8
_GRAPH_CACHE: "OrderedDict[Tuple[int, int], Dict[str, Any]]" = OrderedDict()

# Un bloque de aristas: (origen, destino, peso, hub)
EdgeBlock = Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]


def _nearest_market(parish_id: str) -> str:
    """Mercado (Tarqui o Central) más cercano al centroide de la parroquia."""
    px, py = MANTA_PARISHES[parish_id]["centroid"]
    best, best_dist = "mercado_tarqui", float("inf")
    for market in ("mercado_tarqui", "mercado_central"):
        mx, my = MANTA_PARISHES[MANTA_HUBS[market]["parish"]]["centroid"]
        dist = (px - mx) ** 2 + (py - my) ** 2
        if dist < best_dist:
            best, best_dist = market, dist
    return best


def _edge_block(u: np.ndarray, v: np.ndarray, w: np.ndarray, hub: int) -> EdgeBlock:
    return (u.astype(np.int32), v.astype(np.int32), w.astype(np.float32),
            np.full(len(u), hub, dtype=np.int8))


def _small_world(
    members: np.ndarray,
    k: int,
    rewire_p: float,
    w_low: float,
    w_high: float,
    hub: int,
    rng: np.random.Generator,
) -> EdgeBlock:
    """
    Red de mundo pequeño tipo Watts-Strogatz sobre un grupo de personas:
    anillo de k vecinos fijos y, con probabilidad rewire_p, un contacto al azar.
    """
    m = len(members)
    if m < 2:
        return _edge_block(np.empty(0), np.empty(0), np.empty(0), hub)
    order = members[rng.permutation(m)]
    half = max(1, min(k, m - 1) // 2)

    pos = np.repeat(np.arange(m), half)
    step = np.tile(np.arange(1, half + 1), m)
    target = (pos + step) % m
    rewire = rng.random(len(pos)) < rewire_p
    target[rewire] = rng.integers(0, m, size=int(rewire.sum()))

    w = rng.uniform(w_low, w_high, size=len(pos))
    return _edge_block(order[pos], order[target], w, hub)


def _to_csr(n_nodes: int, blocks: List[EdgeBlock]) -> Dict[str, Any]:
    """
    Une los bloques en una capa simétrica CSR.
    Elimina lazos y aristas repetidas (se conserva la de mayor peso).
    """
    u = np.concatenate([b[0] for b in blocks])
    v = np.concatenate([b[1] for b in blocks])
    w = np.concatenate([b[2] for b in blocks])
    h = np.concatenate([b[3] for b in blocks])

    keep = u != v
    u, v, w, h = u[keep], v[keep], w[keep], h[keep]
    lo, hi = np.minimum(u, v), np.maximum(u, v)

    # Ordenar por par (lo, hi) y peso descendente; la primera aparición es la de mayor peso
    order = np.lexsort((-w, hi, lo))
    lo, hi, w, h = lo[order], hi[order], w[order], h[order]
    first = np.ones(len(lo), dtype=bool)
    first[1:] = (lo[1:] != lo[:-1]) | (hi[1:] != hi[:-1])
    lo, hi, w, h = lo[first], hi[first], w[first], h[first]

    src = np.concatenate([lo, hi])
    dst = np.concatenate([hi, lo])
    order = np.lexsort((dst, src))
    src, dst = src[order], dst[order]
    w2, h2 = np.concatenate([w, w])[order], np.concatenate([h, h])[order]

    indptr = np.zeros(n_nodes + 1, dtype=np.int32)
    np.cumsum(np.bincount(src, minlength=n_nodes), out=indptr[1:])
    return {"indptr": indptr, "neighbors": dst, "weights": w2, "edge_hub": h2,
            "src": src, "n_edges": len(lo)}


def _compute_bridge_score(
    n_nodes: int,
    node_parish: np.ndarray,
    role: np.ndarray,
    day_src: np.ndarray,
    day_dst: np.ndarray,
    day_weights: np.ndarray,
) -> np.ndarray:
    """
    Tareas 5.1 y 5.2: Centralidad Puente en O(N + E).
    Combina grado ponderado diurno, diversidad de parroquias vecinas y bono por rol.
    """
    n_parishes = len(PARISH_IDS)
    weighted_degree = np.bincount(day_src, weights=day_weights, minlength=n_nodes)

    # Pares únicos (nodo, parroquia del vecino) -> cuántas parroquias distintas toca cada nodo
    pairs = np.unique(day_src.astype(np.int64) * n_parishes + node_parish[day_dst])
    diversity = np.bincount(pairs // n_parishes, minlength=n_nodes)

    bonus = np.zeros(n_nodes)
    for role_id, value in ROLE_BRIDGE_BONUS.items():
        bonus[role == ROLE_IDS.index(role_id)] = value

    deg_norm = weighted_degree / max(float(weighted_degree.max()), 1e-9)
    div_norm = diversity / n_parishes
    score = 0.40 * deg_norm + 0.40 * div_norm + 0.20 * bonus
    return (score / max(float(score.max()), 1e-9)).astype(np.float32)


# ============================================================================
# CONSTRUCTOR PRINCIPAL (TAREAS 2.0 A 5.3)
# ============================================================================

def build_manta_multilayer_network(n_nodes: int = 1200, seed: int = 2026) -> Dict[str, Any]:
    """
    Construye (o devuelve desde caché) la red social multicapa de Manta.

    Los arrays del resultado son de solo lectura: el simulador debe copiar
    lo que necesite modificar, porque la misma red se reutiliza entre réplicas.
    """
    n_nodes, seed = int(n_nodes), int(seed)
    if n_nodes < MIN_NODES:
        raise ValueError(f"n_nodes debe ser >= {MIN_NODES}, recibido {n_nodes}")

    cache_key = (n_nodes, seed)
    if cache_key in _GRAPH_CACHE:
        _GRAPH_CACHE.move_to_end(cache_key)
        return _GRAPH_CACHE[cache_key]

    rng = np.random.default_rng(seed)
    n_parishes = len(PARISH_IDS)

    # ------------------------------------------------------------------
    # 2.2 Parroquia de residencia según los pesos INEC
    # ------------------------------------------------------------------
    parish_weights = np.array([MANTA_PARISHES[p]["weight"] for p in PARISH_IDS])
    node_parish = rng.choice(n_parishes, size=n_nodes, p=parish_weights).astype(np.int8)

    # ------------------------------------------------------------------
    # 2.3 Hogares de 3 a 6 personas dentro de cada parroquia.
    #     Se ordena a la población por parroquia y se corta en trozos;
    #     un corte nunca cruza de una parroquia a otra.
    # ------------------------------------------------------------------
    by_parish = np.concatenate([
        rng.permutation(np.flatnonzero(node_parish == p)) for p in range(n_parishes)
    ])
    parish_sizes = np.bincount(node_parish, minlength=n_parishes)
    parish_ends = np.cumsum(parish_sizes)

    sizes = rng.integers(3, 7, size=n_nodes // 3 + n_parishes + 1)
    cuts = np.unique(np.concatenate([np.cumsum(sizes), parish_ends]))
    cuts = cuts[cuts < n_nodes]
    hh_start = np.concatenate([[0], cuts]).astype(np.int32)
    hh_size = np.diff(np.concatenate([hh_start, [n_nodes]])).astype(np.int32)
    n_households = len(hh_start)

    household_id = np.empty(n_nodes, dtype=np.int32)
    household_id[by_parish] = np.repeat(np.arange(n_households, dtype=np.int32), hh_size)
    hh_parish = node_parish[by_parish[hh_start]]

    # 2.4 Coordenadas: centro del hogar alrededor del centroide parroquial + jitter individual
    centroids = np.array([MANTA_PARISHES[p]["centroid"] for p in PARISH_IDS])
    hh_center = np.clip(centroids[hh_parish] + rng.normal(0.0, 0.04, (n_households, 2)), 0.0, 1.0)
    xy = np.clip(hh_center[household_id] + rng.normal(0.0, 0.004, (n_nodes, 2)), 0.0, 1.0)
    x = xy[:, 0].astype(np.float32)
    y = xy[:, 1].astype(np.float32)

    # ------------------------------------------------------------------
    # 2.4 Rol social y Hub primario según rol y cercanía parroquial
    # ------------------------------------------------------------------
    role_probs = np.array([ROLES_CONFIG[r]["prob"] for r in ROLE_IDS])
    role = rng.choice(len(ROLE_IDS), size=n_nodes, p=role_probs).astype(np.int8)
    nearest_market = np.array([HUB_IDS.index(_nearest_market(p)) for p in PARISH_IDS], dtype=np.int8)

    primary_hub = np.full(n_nodes, NO_HUB, dtype=np.int8)
    draws = rng.random(n_nodes)
    for r_idx, r_id in enumerate(ROLE_IDS):
        cumulative = np.zeros(n_nodes)
        for hub_key, prob in ROLES_CONFIG[r_id]["hub_probs"].items():
            chosen = (role == r_idx) & (primary_hub == NO_HUB) & (draws >= cumulative) & (draws < cumulative + prob)
            if hub_key == "nearest_market":
                primary_hub[chosen] = nearest_market[node_parish[chosen]]
            else:
                primary_hub[chosen] = HUB_IDS.index(hub_key)
            cumulative = cumulative + prob

    # ------------------------------------------------------------------
    # 3.0 Capa Nocturna (G_N)
    # ------------------------------------------------------------------
    night_blocks: List[EdgeBlock] = []

    # 3.2 Clique familiar: todos con todos dentro del hogar
    for size in range(2, 7):
        starts = hh_start[hh_size == size]
        if len(starts) == 0:
            continue
        a, b = np.triu_indices(size, k=1)
        u = by_parish[(starts[:, None] + a).ravel()]
        v = by_parish[(starts[:, None] + b).ravel()]
        night_blocks.append(_edge_block(u, v, rng.uniform(0.85, 1.0, size=len(u)), NO_HUB))

    # 3.3 Vecindario barrial: 2 a 4 aristas hacia hogares cercanos de la misma parroquia.
    #     Los hogares se ordenan por posición; los "cercanos" están a pocos puestos.
    for p in range(n_parishes):
        hh = np.flatnonzero(hh_parish == p)
        if len(hh) < 2:
            continue
        hh = hh[np.lexsort((hh_center[hh, 1], hh_center[hh, 0]))]
        n_links = rng.integers(2, 5, size=len(hh))
        pos = np.repeat(np.arange(len(hh)), n_links)
        offset = rng.integers(1, 6, size=len(pos)) * rng.choice([-1, 1], size=len(pos))
        h_from, h_to = hh[pos], hh[(pos + offset) % len(hh)]
        # Un integrante al azar de cada hogar
        u = by_parish[hh_start[h_from] + (rng.random(len(pos)) * hh_size[h_from]).astype(np.int32)]
        v = by_parish[hh_start[h_to] + (rng.random(len(pos)) * hh_size[h_to]).astype(np.int32)]
        night_blocks.append(_edge_block(u, v, rng.uniform(0.25, 0.45, size=len(u)), NO_HUB))

    # ------------------------------------------------------------------
    # 4.0 Capa Diurna (G_D)
    # ------------------------------------------------------------------
    day_blocks: List[EdgeBlock] = []

    # 4.2 Mundo pequeño dentro de cada Hub, con peso modulado por el Hub
    hub_members: Dict[str, np.ndarray] = {}
    for h_idx, h_id in enumerate(HUB_IDS):
        cfg = MANTA_HUBS[h_id]
        members = np.flatnonzero(primary_hub == h_idx)
        hub_members[h_id] = members
        mult = cfg["contact_weight"]
        day_blocks.append(_small_world(members, cfg["ring_k"], cfg["rewire_p"],
                                       0.45 * mult, 0.70 * mult, h_idx, rng))

    # Quien no va a ningún Hub (colegio barrial, residente en casa) tiene
    # contactos diurnos locales dentro de su propia parroquia
    for p in range(n_parishes):
        locals_ = np.flatnonzero((primary_hub == NO_HUB) & (node_parish == p))
        day_blocks.append(_small_world(locals_, 4, 0.10, 0.35, 0.60, NO_HUB, rng))

    # 4.3 Rutas de bus: cada transportista lleva de 6 a 10 pasajeros
    #     que viajan a los Hubs principales desde cualquier parroquia
    passengers = np.flatnonzero(np.isin(primary_hub, [HUB_IDS.index(h) for h in BUS_HUBS]))
    drivers = np.flatnonzero(role == ROLE_IDS.index("transportista"))
    if len(passengers) > 0 and len(drivers) > 0:
        n_pass = rng.integers(6, 11, size=len(drivers))
        u = np.repeat(drivers, n_pass)
        v = passengers[rng.integers(0, len(passengers), size=len(u))]
        day_blocks.append(_edge_block(u, v, rng.uniform(0.30, 0.60, size=len(u)), NO_HUB))

    # 3.1 / 4.1 Capas en formato CSR
    night = _to_csr(n_nodes, night_blocks)
    day = _to_csr(n_nodes, day_blocks)

    # ------------------------------------------------------------------
    # 5.0 Centralidad Puente
    # ------------------------------------------------------------------
    bridge_score = _compute_bridge_score(n_nodes, node_parish, role,
                                         day["src"], day["neighbors"], day["weights"])

    net: Dict[str, Any] = {
        "n_nodes": n_nodes,
        "seed": seed,
        "parish_ids": PARISH_IDS,
        "hub_ids": HUB_IDS,
        "role_ids": ROLE_IDS,
        "node_parish": node_parish,
        "household_id": household_id,
        "role": role,
        "primary_hub": primary_hub,
        "x": x,
        "y": y,
        "night_indptr": night["indptr"],
        "night_neighbors": night["neighbors"],
        "night_weights": night["weights"],
        "day_indptr": day["indptr"],
        "day_neighbors": day["neighbors"],
        "day_weights": day["weights"],
        "day_edge_hub": day["edge_hub"],
        "bridge_score": bridge_score,
        "hub_members": hub_members,
        "parish_members": {p_id: np.flatnonzero(node_parish == p) for p, p_id in enumerate(PARISH_IDS)},
        "n_night_edges": night["n_edges"],
        "n_day_edges": day["n_edges"],
    }

    # Solo lectura: la red se comparte entre todas las réplicas Monte Carlo
    for value in net.values():
        for arr in (value.values() if isinstance(value, dict) else [value]):
            if isinstance(arr, np.ndarray):
                arr.flags.writeable = False

    # 5.3 Caché LRU de 8 entradas
    _GRAPH_CACHE[cache_key] = net
    if len(_GRAPH_CACHE) > _GRAPH_CACHE_MAX:
        _GRAPH_CACHE.popitem(last=False)
    return net
