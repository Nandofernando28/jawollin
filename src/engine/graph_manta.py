from typing import Dict, Any, List
import numpy as np
import networkx as nx

# Parroquias reales de Manta con coordenadas centrales (lat, lng) y peso demografico (INEC)
MANTA_PARISHES: List[Dict[str, Any]] = [
    {
        "id": "tarqui",
        "name": "Tarqui",
        "weight": 0.38,
        "lat": -0.9565,
        "lng": -80.7115,
        "density_factor": 1.35,
    },
    {
        "id": "eloy_alfaro",
        "name": "Eloy Alfaro",
        "weight": 0.24,
        "lat": -0.9710,
        "lng": -80.7030,
        "density_factor": 1.20,
    },
    {
        "id": "manta_centro",
        "name": "Manta Centro",
        "weight": 0.22,
        "lat": -0.9465,
        "lng": -80.7285,
        "density_factor": 1.10,
    },
    {
        "id": "los_esteros",
        "name": "Los Esteros",
        "weight": 0.11,
        "lat": -0.9520,
        "lng": -80.6940,
        "density_factor": 1.25,
    },
    {
        "id": "san_mateo",
        "name": "San Mateo",
        "weight": 0.05,
        "lat": -0.9620,
        "lng": -80.8080,
        "density_factor": 0.75,
    },
]

# Hubs Criticos Diurnos en Manta (Lugares de superpropagacion e intervencion de Defensa 1)
MANTA_HUBS: List[Dict[str, Any]] = [
    {
        "id": "mercado_tarqui",
        "name": "Mercado de Tarqui",
        "parish": "tarqui",
        "lat": -0.9552,
        "lng": -80.7132,
        "capacity_share": 0.26,
        "daily_closure_cost": 1200.0,
        "contact_multiplier": 1.45,
    },
    {
        "id": "uleam",
        "name": "Campus ULEAM",
        "parish": "manta_centro",
        "lat": -0.9528,
        "lng": -80.7455,
        "capacity_share": 0.22,
        "daily_closure_cost": 1000.0,
        "contact_multiplier": 1.35,
    },
    {
        "id": "mercado_central",
        "name": "Mercado Central",
        "parish": "manta_centro",
        "lat": -0.9478,
        "lng": -80.7240,
        "capacity_share": 0.18,
        "daily_closure_cost": 950.0,
        "contact_multiplier": 1.30,
    },
    {
        "id": "empacadoras_esteros",
        "name": "Zona Industrial / Empacadoras",
        "parish": "los_esteros",
        "lat": -0.9495,
        "lng": -80.6915,
        "capacity_share": 0.18,
        "daily_closure_cost": 1300.0,
        "contact_multiplier": 1.40,
    },
    {
        "id": "terminal_terrestre",
        "name": "Terminal Terrestre / Buses",
        "parish": "tarqui",
        "lat": -0.9612,
        "lng": -80.6968,
        "capacity_share": 0.16,
        "daily_closure_cost": 1100.0,
        "contact_multiplier": 1.50,
    },
]


def build_manta_multilayer_network(n_nodes: int, seed: int) -> Dict[str, Any]:
    """
    Construye de forma 100% determinista (usando PCG64(seed)) la Red Multicapa Dia/Noche de Manta.
    Retorna estructuras vectorizadas NumPy para ejecucion ultrarrapida en AWS Lambda.
    """
    rng = np.random.Generator(np.random.PCG64(seed))

    parish_weights = np.array([p["weight"] for p in MANTA_PARISHES], dtype=np.float64)
    parish_weights /= parish_weights.sum()
    node_parish = rng.choice(len(MANTA_PARISHES), size=n_nodes, p=parish_weights)

    hub_weights = np.array([h["capacity_share"] for h in MANTA_HUBS], dtype=np.float64)
    hub_weights /= hub_weights.sum()
    node_hub = rng.choice(len(MANTA_HUBS), size=n_nodes, p=hub_weights)

    # Coordenadas geo-referenciadas alrededor de cada parroquia
    node_lat = np.zeros(n_nodes, dtype=np.float64)
    node_lng = np.zeros(n_nodes, dtype=np.float64)
    for idx, p in enumerate(MANTA_PARISHES):
        mask = node_parish == idx
        count = int(mask.sum())
        if count > 0:
            node_lat[mask] = p["lat"] + rng.normal(0.0, 0.0055, size=count)
            node_lng[mask] = p["lng"] + rng.normal(0.0, 0.0065, size=count)

    # 1. Capa Nocturna (Hogares y Manzanas Barriales): grafo Watts-Strogatz por parroquia
    G_night = nx.Graph()
    G_night.add_nodes_from(range(n_nodes))
    for idx, p in enumerate(MANTA_PARISHES):
        nodes_in_p = np.where(node_parish == idx)[0]
        m_p = len(nodes_in_p)
        if m_p > 6:
            k_deg = min(6, m_p - 1)
            sub_g = nx.watts_strogatz_graph(m_p, k=k_deg, p=0.08, seed=int(seed + idx + 1))
            for u_local, v_local in sub_g.edges():
                G_night.add_edge(int(nodes_in_p[u_local]), int(nodes_in_p[v_local]))

    # 2. Capa Diurna (Hubs Criticos y Rutas de Bus): grafo Barabasi-Albert por Hub + puentes
    G_day = nx.Graph()
    G_day.add_nodes_from(range(n_nodes))
    for h_idx, h in enumerate(MANTA_HUBS):
        nodes_in_h = np.where(node_hub == h_idx)[0]
        m_h = len(nodes_in_h)
        if m_h > 4:
            sub_h = nx.barabasi_albert_graph(m_h, m=3, seed=int(seed + 100 + h_idx))
            for u_local, v_local in sub_h.edges():
                G_day.add_edge(int(nodes_in_h[u_local]), int(nodes_in_h[v_local]), hub_id=h_idx)

    # Nodos puente (Choferes de bus, comerciantes y estudiantes ULEAM que conectan parroquias)
    n_bridges = max(15, n_nodes // 20)
    bridge_nodes = rng.choice(n_nodes, size=n_bridges, replace=False)
    for b_node in bridge_nodes:
        targets = rng.choice(n_nodes, size=4, replace=False)
        for t_node in targets:
            if b_node != t_node:
                G_day.add_edge(int(b_node), int(t_node), hub_id=int(node_hub[b_node]))

    # Precalcular grados y centralidad puente aproximada para el optimizador Escudo Manta
    day_deg = np.array([G_day.degree(i) for i in range(n_nodes)], dtype=np.float64)
    night_deg = np.array([G_night.degree(i) for i in range(n_nodes)], dtype=np.float64)

    bridge_score = day_deg / max(day_deg.max(), 1.0)
    bridge_score[bridge_nodes] = np.minimum(1.0, bridge_score[bridge_nodes] + 0.35)

    # Convertir aristas a arreglos NumPy para simulacion vectorizada rapida
    night_edges = np.array(list(G_night.edges()), dtype=np.int32)
    day_edges_list = []
    day_edge_hubs = []
    for u, v, d in G_day.edges(data=True):
        day_edges_list.append((u, v))
        day_edge_hubs.append(d.get("hub_id", 0))
    day_edges = np.array(day_edges_list, dtype=np.int32)
    day_edge_hub = np.array(day_edge_hubs, dtype=np.int32)

    return {
        "n_nodes": n_nodes,
        "node_parish": node_parish,
        "node_hub": node_hub,
        "node_lat": node_lat,
        "node_lng": node_lng,
        "night_edges": night_edges,
        "day_edges": day_edges,
        "day_edge_hub": day_edge_hub,
        "day_deg": day_deg,
        "night_deg": night_deg,
        "bridge_score": bridge_score,
    }
