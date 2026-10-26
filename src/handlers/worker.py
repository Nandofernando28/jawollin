from typing import Dict, Any
from engine.graph_manta import build_manta_multilayer_network
from engine.simulator import run_single_simulation


def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    """
    AWS Lambda Worker invocado en paralelo por el estado Map de AWS Step Functions (Express Workflow).
    Recibe un lote de semillas (run_seeds) y ejecuta las 3 estrategias sobre la red de Manta.
    """
    params = event.get("params", {})
    base_seed = int(params.get("seed", 2026))
    n_nodes = int(params.get("population_nodes", 600))
    run_seeds = event.get("run_seeds", [base_seed])

    net = build_manta_multilayer_network(n_nodes=n_nodes, seed=base_seed)

    batch_out = {"none": [], "random": [], "shield": []}
    for idx, r_seed in enumerate(run_seeds):
        rec_spatial = bool(event.get("is_first_batch", False) and idx == 0)
        for strat in ("none", "random", "shield"):
            res = run_single_simulation(
                net=net,
                params=params,
                strategy=strat,
                run_seed=int(r_seed),
                record_spatial=rec_spatial,
            )
            batch_out[strat].append(res)

    return batch_out
