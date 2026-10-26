from typing import Dict, Any, List
import numpy as np
from .graph_manta import MANTA_PARISHES, MANTA_HUBS, build_manta_multilayer_network

# Codificacion de Estados Epidemiologicos SEIR-VQ:
# 0 = 🟢 Sano (Susceptible)
# 1 = 🟡 Mordido (Expuesto / Incubando)
# 2 = 🔴 Zombie (Infeccioso Activo)
# 3 = 🔵 Exorcizado (Inmune / Vacunado / Recuperado)
# 4 = 🟣 Aislado (Contenido por Brigada)
STATE_SANO = 0
STATE_MORDIDO = 1
STATE_ZOMBIE = 2
STATE_INMUNE = 3
STATE_AISLADO = 4


def run_single_simulation(
    net: Dict[str, Any],
    params: Dict[str, Any],
    strategy: str,
    run_seed: int,
    record_spatial: bool = False,
) -> Dict[str, Any]:
    """
    Ejecuta una corrida dia a dia (t = 0 .. days) de forma 100% reproducible con PCG64(run_seed).
    strategy in {'none', 'random', 'shield'}
    """
    rng = np.random.Generator(np.random.PCG64(run_seed))
    n = net["n_nodes"]
    days = int(params.get("days", 45))
    beta_day = float(params.get("beta_day", 0.085))
    beta_night = float(params.get("beta_night", 0.14))
    incubation_days = max(1.0, float(params.get("incubation_days", 2.5)))
    recovery_days = max(2.0, float(params.get("recovery_days", 8.0)))
    sigma = 1.0 / incubation_days
    gamma = 1.0 / recovery_days

    vaccine_stock_total = int(params.get("vaccine_stock", int(n * 0.18)))
    vaccine_efficacy = float(params.get("vaccine_efficacy", 0.85))
    daily_budget = float(params.get("daily_budget", 2500.0))
    vaccine_cost = float(params.get("vaccine_cost", 20.0))
    isolation_cost = float(params.get("isolation_cost", 120.0))
    daily_supply_mode = bool(params.get("daily_supply_mode", True))
    patient_zero_zone = str(params.get("patient_zero_zone", "mercado_tarqui"))
    initial_infected = max(1, int(params.get("initial_infected", 4)))

    states = np.zeros(n, dtype=np.int8)

    # Seleccionar Paciente(s) Cero segun el Hub o Parroquia elegida
    hub_ids = [h["id"] for h in MANTA_HUBS]
    parish_ids = [p["id"] for p in MANTA_PARISHES]
    if patient_zero_zone in hub_ids:
        h_idx = hub_ids.index(patient_zero_zone)
        candidates = np.where(net["node_hub"] == h_idx)[0]
    elif patient_zero_zone in parish_ids:
        p_idx = parish_ids.index(patient_zero_zone)
        candidates = np.where(net["node_parish"] == p_idx)[0]
    else:
        candidates = np.arange(n)

    if len(candidates) < initial_infected:
        candidates = np.arange(n)
    p0_nodes = rng.choice(candidates, size=initial_infected, replace=False)
    states[p0_nodes] = STATE_ZOMBIE

    day_edges = net["day_edges"]
    day_edge_hub = net["day_edge_hub"]
    night_edges = net["night_edges"]
    day_deg = net["day_deg"]
    bridge_score = net["bridge_score"]

    # Construir lista de adyacencia rapida para calculo de anillo (1-2 saltos)
    adj_list: List[List[int]] = [[] for _ in range(n)]
    for u, v in day_edges:
        adj_list[u].append(v)
        adj_list[v].append(u)
    for u, v in night_edges:
        adj_list[u].append(v)
        adj_list[v].append(u)

    remaining_vaccines = vaccine_stock_total
    daily_vaccine_cap = max(5, vaccine_stock_total // max(1, (days // 3))) if daily_supply_mode else vaccine_stock_total

    s_curve = np.zeros(days + 1, dtype=np.int32)
    e_curve = np.zeros(days + 1, dtype=np.int32)
    i_curve = np.zeros(days + 1, dtype=np.int32)
    r_curve = np.zeros(days + 1, dtype=np.int32)
    q_curve = np.zeros(days + 1, dtype=np.int32)
    cum_infected = np.zeros(days + 1, dtype=np.int32)

    vaccines_used = 0
    wasted_vaccines = 0
    hubs_closed_days = 0
    isolated_zombies_total = 0
    budget_spent = 0.0
    action_log: List[Dict[str, Any]] = []
    parish_timeline: List[Dict[str, Any]] = []

    def record_day(d: int, closed_hubs_today: List[str]) -> None:
        s_curve[d] = int((states == STATE_SANO).sum())
        e_curve[d] = int((states == STATE_MORDIDO).sum())
        i_curve[d] = int((states == STATE_ZOMBIE).sum())
        r_curve[d] = int((states == STATE_INMUNE).sum())
        q_curve[d] = int((states == STATE_AISLADO).sum())
        cum_infected[d] = int(n - s_curve[d] - (vaccines_used - wasted_vaccines))
        cum_infected[d] = max(initial_infected, int((states != STATE_SANO).sum() - int(vaccines_used * vaccine_efficacy)))

        if record_spatial:
            parish_stats = {}
            for p_idx, p_info in enumerate(MANTA_PARISHES):
                mask = net["node_parish"] == p_idx
                parish_stats[p_info["id"]] = {
                    "sano": int((states[mask] == STATE_SANO).sum()),
                    "mordido": int((states[mask] == STATE_MORDIDO).sum()),
                    "zombie": int((states[mask] == STATE_ZOMBIE).sum()),
                    "inmune": int((states[mask] == STATE_INMUNE).sum()),
                    "aislado": int((states[mask] == STATE_AISLADO).sum()),
                }
            parish_timeline.append({
                "day": d,
                "parishes": parish_stats,
                "closed_hubs": closed_hubs_today,
            })

    record_day(0, [])
    ever_infected = np.zeros(n, dtype=bool)
    ever_infected[p0_nodes] = True
    cum_infected[0] = int(ever_infected.sum())

    for d in range(1, days + 1):
        closed_hub_indices: List[int] = []
        closed_hub_names: List[str] = []
        avail_budget = daily_budget

        # ====================================================================
        # APLICAR INTERVENCIONES DEL DIA d SEGUN LA ESTRATEGIA
        # ====================================================================
        if strategy == "random" and remaining_vaccines > 0 and avail_budget >= vaccine_cost:
            # Linea Base 2: Intervenir al azar con los mismos recursos
            k_today = min(remaining_vaccines, daily_vaccine_cap, int(avail_budget // vaccine_cost))
            if k_today > 0:
                chosen = rng.choice(n, size=k_today, replace=False)
                for node_id in chosen:
                    avail_budget -= vaccine_cost
                    budget_spent += vaccine_cost
                    remaining_vaccines -= 1
                    vaccines_used += 1
                    if states[node_id] == STATE_SANO:
                        if rng.random() < vaccine_efficacy:
                            states[node_id] = STATE_INMUNE
                    else:
                        # Vacuna desperdiciada en alguien ya infectado o inmune
                        wasted_vaccines += 1

        elif strategy == "shield":
            # ESTRATEGIA: OPERACION CORTAFUEGOS MANTA (3 Defensas por ROI Marginal)
            active_zombies = np.where(states == STATE_ZOMBIE)[0]

            # 1) DEFENSA 1 (LA RED): Cortafuegos / Fumigacion en Hubs Criticos
            if len(active_zombies) > 0:
                for h_idx, h_info in enumerate(MANTA_HUBS):
                    h_cost = h_info["daily_closure_cost"]
                    if avail_budget >= h_cost:
                        hub_mask = net["node_hub"] == h_idx
                        z_in_hub = int((states[hub_mask] == STATE_ZOMBIE).sum())
                        s_in_hub = int((states[hub_mask] == STATE_SANO).sum())
                        expected_hub_infections = beta_day * z_in_hub * (s_in_hub / max(1, int(hub_mask.sum()))) * 8.0
                        roi_hub = (0.85 * expected_hub_infections) / max(1.0, h_cost)
                        roi_vac_ref = vaccine_efficacy / max(1.0, vaccine_cost)

                        # Activar cortafuegos si hay brote fuerte en el Hub o escasean vacunas/eficacia
                        if z_in_hub >= 3 and (roi_hub >= roi_vac_ref * 0.28 or remaining_vaccines == 0 or vaccine_efficacy < 0.55):
                            closed_hub_indices.append(h_idx)
                            closed_hub_names.append(h_info["name"])
                            avail_budget -= h_cost
                            budget_spent += h_cost
                            hubs_closed_days += 1

            # 2) DEFENSA 2 (LA LANZA): Brigada de Contencion / Antidoto a Superpropagadores
            if len(active_zombies) > 0 and avail_budget >= isolation_cost:
                # Ordenar Zombies activos por cantidad de vecinos Sanos expuestos hoy
                zombie_scores = []
                for z_node in active_zombies:
                    s_neighbors = sum(1 for nb in adj_list[z_node] if states[nb] == STATE_SANO)
                    zombie_scores.append((s_neighbors + 0.5 * day_deg[z_node], z_node))
                zombie_scores.sort(reverse=True)

                max_isolations = 4 if vaccine_efficacy >= 0.6 else 8
                iso_count = 0
                for score_val, z_node in zombie_scores:
                    if iso_count >= max_isolations or avail_budget < isolation_cost:
                        break
                    if score_val >= 3.0:
                        states[z_node] = STATE_AISLADO
                        avail_budget -= isolation_cost
                        budget_spent += isolation_cost
                        isolated_zombies_total += 1
                        iso_count += 1

            # 3) DEFENSA 3 (EL ESCUDO): Vacunacion Anillo + Puente (SOLO Nodos 🟢 Sanos)
            sano_nodes = np.where(states == STATE_SANO)[0]
            if len(sano_nodes) > 0 and remaining_vaccines > 0 and avail_budget >= vaccine_cost:
                k_today = min(
                    len(sano_nodes),
                    remaining_vaccines,
                    daily_vaccine_cap,
                    int(avail_budget // vaccine_cost),
                )
                if k_today > 0:
                    # Calcular cercania al brote (Anillo a 1 y 2 saltos de Zombies activos)
                    ring_proximity = np.full(n, 0.15, dtype=np.float64)
                    active_zombies_now = np.where(states == STATE_ZOMBIE)[0]
                    for z_node in active_zombies_now:
                        for nb1 in adj_list[z_node]:
                            if ring_proximity[nb1] < 1.0:
                                ring_proximity[nb1] = 1.0  # Salto 1 (Contacto directo)
                            for nb2 in adj_list[nb1]:
                                if ring_proximity[nb2] < 0.45:
                                    ring_proximity[nb2] = 0.45  # Salto 2 (Anillo secundario)

                    # Ecuacion del Score(i) = Cercania Anillo * (0.6*Puente + 0.4*Grado)
                    norm_deg = day_deg / max(1.0, day_deg.max())
                    scores = ring_proximity[sano_nodes] * (0.6 * bridge_score[sano_nodes] + 0.4 * norm_deg[sano_nodes])
                    top_idx = np.argsort(scores)[::-1][:k_today]
                    selected_sanos = sano_nodes[top_idx]

                    for node_id in selected_sanos:
                        avail_budget -= vaccine_cost
                        budget_spent += vaccine_cost
                        remaining_vaccines -= 1
                        vaccines_used += 1
                        # 0% desperdicio: solo vacunamos nodos estrictamente Sanos
                        if rng.random() < vaccine_efficacy:
                            states[node_id] = STATE_INMUNE

            if record_spatial and (closed_hub_names or vaccines_used > 0 or isolated_zombies_total > 0) and d <= 15:
                action_log.append({
                    "day": d,
                    "closed_hubs": closed_hub_names,
                    "active_zombies": int(len(active_zombies)),
                    "remaining_vaccines": int(remaining_vaccines),
                })

        # ====================================================================
        # DINAMICA DE PROPAGACION: FASE DIURNA (HUBS + BUSES) Y NOCTURNA (HOGAR)
        # ====================================================================
        infection_prob = np.zeros(n, dtype=np.float64)

        # Fase Diurna
        u_day = day_edges[:, 0]
        v_day = day_edges[:, 1]
        closed_set = set(closed_hub_indices)

        for idx_e in range(len(day_edges)):
            u_node = u_day[idx_e]
            v_node = v_day[idx_e]
            su = states[u_node]
            sv = states[v_node]
            if (su == STATE_ZOMBIE and sv == STATE_SANO) or (sv == STATE_ZOMBIE and su == STATE_SANO):
                h_id = int(day_edge_hub[idx_e])
                # Si el Hub tiene Cortafuegos activo (Defensa 1), el contagio diurno baja 85%
                weight_d = 0.15 if h_id in closed_set else 1.0
                p_trans = beta_day * weight_d
                target = v_node if su == STATE_ZOMBIE else u_node
                infection_prob[target] = 1.0 - (1.0 - infection_prob[target]) * (1.0 - p_trans)

        # Fase Nocturna (Hogar y Barrio)
        u_night = night_edges[:, 0]
        v_night = night_edges[:, 1]
        for idx_e in range(len(night_edges)):
            u_node = u_night[idx_e]
            v_node = v_night[idx_e]
            su = states[u_node]
            sv = states[v_node]
            if (su == STATE_ZOMBIE and sv == STATE_SANO) or (sv == STATE_ZOMBIE and su == STATE_SANO):
                target = v_node if su == STATE_ZOMBIE else u_node
                infection_prob[target] = 1.0 - (1.0 - infection_prob[target]) * (1.0 - beta_night)

        # Transiciones estocasticas con semilla fija
        new_states = states.copy()

        # 1) Sano -> Mordido
        sano_mask = states == STATE_SANO
        sano_indices = np.where(sano_mask)[0]
        if len(sano_indices) > 0:
            rolls = rng.random(len(sano_indices))
            bitten = sano_indices[rolls < infection_prob[sano_indices]]
            new_states[bitten] = STATE_MORDIDO
            ever_infected[bitten] = True

        # 2) Mordido -> Zombie (Fin de incubacion)
        mordido_indices = np.where(states == STATE_MORDIDO)[0]
        if len(mordido_indices) > 0:
            rolls = rng.random(len(mordido_indices))
            turned = mordido_indices[rolls < sigma]
            new_states[turned] = STATE_ZOMBIE

        # 3) Zombie / Aislado -> Exorcizado (Recuperacion / Alta)
        zombie_indices = np.where((states == STATE_ZOMBIE) | (states == STATE_AISLADO))[0]
        if len(zombie_indices) > 0:
            rolls = rng.random(len(zombie_indices))
            recovered = zombie_indices[rolls < gamma]
            new_states[recovered] = STATE_INMUNE

        states = new_states
        record_day(d, closed_hub_names)
        cum_infected[d] = int(ever_infected.sum())

    return {
        "strategy": strategy,
        "s_curve": s_curve.tolist(),
        "e_curve": e_curve.tolist(),
        "i_curve": i_curve.tolist(),
        "r_curve": r_curve.tolist(),
        "q_curve": q_curve.tolist(),
        "cum_infected": cum_infected.tolist(),
        "peak_zombies": int(i_curve.max()),
        "peak_day": int(np.argmax(i_curve)),
        "total_infected": int(cum_infected[-1]),
        "vaccines_used": int(vaccines_used),
        "wasted_vaccines": int(wasted_vaccines),
        "hubs_closed_days": int(hubs_closed_days),
        "isolated_zombies": int(isolated_zombies_total),
        "budget_spent": round(float(budget_spent), 2),
        "parish_timeline": parish_timeline if record_spatial else [],
        "action_log": action_log if record_spatial else [],
    }


def run_monte_carlo_ensemble(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ejecuta M simulaciones de Monte Carlo comparando:
    1) Sin Intervencion ('none')
    2) Intervencion al Azar ('random')
    3) Operacion Cortafuegos Manta ('shield')
    Reporta promedios, percentiles P10-P90 y metricas de ciudadanos salvados.
    """
    base_seed = int(params.get("seed", 2026))
    n_nodes = min(2000, max(200, int(params.get("population_nodes", 600))))
    mc_runs = min(200, max(5, int(params.get("monte_carlo_runs", 30))))
    days = min(90, max(15, int(params.get("days", 45))))
    params["days"] = days

    net = build_manta_multilayer_network(n_nodes=n_nodes, seed=base_seed)

    results_by_strat: Dict[str, List[Dict[str, Any]]] = {
        "none": [],
        "random": [],
        "shield": [],
    }

    for run_idx in range(mc_runs):
        run_seed = base_seed + run_idx * 17
        for strat in ("none", "random", "shield"):
            res = run_single_simulation(
                net=net,
                params=params,
                strategy=strat,
                run_seed=run_seed,
                record_spatial=(run_idx == 0),
            )
            results_by_strat[strat].append(res)

    def summarize(runs: List[Dict[str, Any]]) -> Dict[str, Any]:
        i_mat = np.array([r["i_curve"] for r in runs], dtype=np.float64)
        cum_mat = np.array([r["cum_infected"] for r in runs], dtype=np.float64)
        peaks = np.array([r["peak_zombies"] for r in runs], dtype=np.float64)
        totals = np.array([r["total_infected"] for r in runs], dtype=np.float64)
        wasted = np.array([r["wasted_vaccines"] for r in runs], dtype=np.float64)
        used = np.array([r["vaccines_used"] for r in runs], dtype=np.float64)
        spent = np.array([r["budget_spent"] for r in runs], dtype=np.float64)

        return {
            "active_zombies_mean": np.round(i_mat.mean(axis=0), 1).tolist(),
            "active_zombies_p10": np.round(np.percentile(i_mat, 10, axis=0), 1).tolist(),
            "active_zombies_p90": np.round(np.percentile(i_mat, 90, axis=0), 1).tolist(),
            "cum_infected_mean": np.round(cum_mat.mean(axis=0), 1).tolist(),
            "cum_infected_p10": np.round(np.percentile(cum_mat, 10, axis=0), 1).tolist(),
            "cum_infected_p90": np.round(np.percentile(cum_mat, 90, axis=0), 1).tolist(),
            "peak_zombies_mean": round(float(peaks.mean()), 1),
            "peak_zombies_range": [round(float(np.percentile(peaks, 10)), 1), round(float(np.percentile(peaks, 90)), 1)],
            "total_infected_mean": round(float(totals.mean()), 1),
            "total_infected_range": [round(float(np.percentile(totals, 10)), 1), round(float(np.percentile(totals, 90)), 1)],
            "vaccines_used_mean": round(float(used.mean()), 1),
            "wasted_vaccines_mean": round(float(wasted.mean()), 1),
            "budget_spent_mean": round(float(spent.mean()), 2),
            "sample_spatial_timeline": runs[0]["parish_timeline"],
            "sample_action_log": runs[0]["action_log"],
            "hubs_closed_days_mean": round(float(np.mean([r["hubs_closed_days"] for r in runs])), 1),
            "isolated_zombies_mean": round(float(np.mean([r["isolated_zombies"] for r in runs])), 1),
        }

    sum_none = summarize(results_by_strat["none"])
    sum_rand = summarize(results_by_strat["random"])
    sum_shield = summarize(results_by_strat["shield"])

    saved_vs_none = max(0.0, sum_none["total_infected_mean"] - sum_shield["total_infected_mean"])
    saved_vs_rand = max(0.0, sum_rand["total_infected_mean"] - sum_shield["total_infected_mean"])
    pct_reduction_vs_none = round(100.0 * saved_vs_none / max(1.0, sum_none["total_infected_mean"]), 1)

    return {
        "metadata": {
            "seed": base_seed,
            "population_nodes": n_nodes,
            "manta_real_population_scale": 271000,
            "monte_carlo_runs": mc_runs,
            "days": days,
            "params": params,
        },
        "parishes_info": MANTA_PARISHES,
        "hubs_info": MANTA_HUBS,
        "strategies": {
            "none": sum_none,
            "random": sum_rand,
            "shield": sum_shield,
        },
        "impact_summary": {
            "citizens_saved_nodes": round(saved_vs_none, 1),
            "citizens_saved_manta_scale": int(round(saved_vs_none * (271000.0 / n_nodes))),
            "extra_saved_vs_random_nodes": round(saved_vs_rand, 1),
            "extra_saved_vs_random_manta_scale": int(round(saved_vs_rand * (271000.0 / n_nodes))),
            "infection_reduction_pct": pct_reduction_vs_none,
            "zero_vaccine_waste_guaranteed": True,
        },
    }
