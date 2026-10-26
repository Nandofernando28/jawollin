from typing import Dict, Any


def run_single_simulation(
    net: Dict[str, Any],
    params: Dict[str, Any],
    strategy: str,
    run_seed: int,
    record_spatial: bool = False,
) -> Dict[str, Any]:
    """
    TODO: Ejecutar una corrida del modelo epidemiológico.
    strategy in {'none', 'random', 'shield'}
    """
    raise NotImplementedError


def run_monte_carlo_ensemble(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    TODO: Ejecutar M corridas Monte Carlo comparando las 3 estrategias.
    """
    raise NotImplementedError
