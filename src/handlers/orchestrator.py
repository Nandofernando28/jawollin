from typing import Dict, Any


def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    """
    TODO: Lambda principal.
    GET  /health   → estado de infraestructura
    POST /simulate → ejecutar/recuperar simulación Monte Carlo
    """
    raise NotImplementedError
