import base64
import hashlib
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.engine.simulator import (
    aggregate_batch_results,
    normalize_simulation_params,
    run_monte_carlo_ensemble,
)

logger = logging.getLogger(__name__)

# ============================================================================
# TAREA 2.1: HASH DETERMINISTA DE LA SIMULACION
# ============================================================================

CACHE_TTL_SECONDS = 14 * 86400
SPATIAL_KEY = "spatial_timelines"

# Cache en memoria del proceso (contenedor Lambda caliente o servidor local).
_MEMORY_CACHE: Dict[str, Dict[str, Any]] = {}

# Clientes boto3 perezosos: se crean solo si hay configuracion AWS.
_DDB_TABLE = None
_S3_CLIENT = None


def compute_sim_hash(normalized_params: Dict[str, Any]) -> str:
    """
    Identificador determinista de una simulacion: mismos parametros normalizados
    (incluida la semilla) producen siempre el mismo hash, ej. "cf-8a4f91bc02e14d3a".
    """
    canonical = json.dumps(normalized_params, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return f"cf-{digest[:16]}"


# ============================================================================
# TAREA 2.2: PERSISTENCIA HIBRIDA (MEMORIA / DYNAMODB / S3)
# ============================================================================


def _json_default(obj: Any) -> Any:
    """Convierte tipos numpy/Decimal a tipos nativos para json.dumps."""
    if hasattr(obj, "tolist"):
        return obj.tolist()
    if hasattr(obj, "item"):
        return obj.item()
    try:
        from decimal import Decimal

        if isinstance(obj, Decimal):
            return float(obj)
    except ImportError:  # pragma: no cover
        pass
    raise TypeError(f"Tipo no serializable: {type(obj)!r}")


def _dumps(obj: Any) -> str:
    return json.dumps(obj, separators=(",", ":"), default=_json_default)


def _aws_cache_enabled() -> bool:
    return bool(os.environ.get("SIMULATIONS_TABLE_NAME"))


def _s3_enabled() -> bool:
    return bool(os.environ.get("RESULTS_BUCKET_NAME"))


def _get_table():
    global _DDB_TABLE
    if _DDB_TABLE is None:
        import boto3

        _DDB_TABLE = boto3.resource("dynamodb").Table(os.environ["SIMULATIONS_TABLE_NAME"])
    return _DDB_TABLE


def _get_s3():
    global _S3_CLIENT
    if _S3_CLIENT is None:
        import boto3

        _S3_CLIENT = boto3.client("s3")
    return _S3_CLIENT


def _s3_key(sim_hash: str) -> str:
    return f"simulations/{sim_hash}.json"


def get_cached_simulation(sim_hash: str) -> Optional[Dict[str, Any]]:
    """
    Busca una simulacion previa: primero en memoria y, si hay tabla DynamoDB
    configurada, en AWS. Devuelve None si no existe o si AWS falla.
    """
    cached = _MEMORY_CACHE.get(sim_hash)
    if cached is not None:
        return cached

    if not _aws_cache_enabled():
        return None

    try:
        item = _get_table().get_item(Key={"sim_hash": sim_hash}).get("Item")
        if not item:
            return None
        # El payload se guarda como string JSON: evita el error de float en DynamoDB.
        payload = json.loads(item["payload"])
        if SPATIAL_KEY not in payload and _s3_enabled():
            try:
                body = _get_s3().get_object(
                    Bucket=os.environ["RESULTS_BUCKET_NAME"], Key=_s3_key(sim_hash)
                )["Body"].read()
                payload[SPATIAL_KEY] = json.loads(body).get(SPATIAL_KEY, {})
            except Exception as exc:
                logger.warning("No se pudo leer la serie espacial de S3 (%s): %s", sim_hash, exc)
        _MEMORY_CACHE[sim_hash] = payload
        return payload
    except Exception as exc:
        logger.warning("Fallo al leer cache DynamoDB (%s): %s", sim_hash, exc)
        return None


def save_simulation_cache(sim_hash: str, payload: Dict[str, Any]) -> None:
    """
    Guarda el resultado completo en memoria. Si AWS esta configurado:
    - S3: JSON completo (con series espaciales) en simulations/{sim_hash}.json.
    - DynamoDB: resumen sin series espaciales (limite 400 KB por item) + ttl de 14 dias.
    Los errores de AWS se registran pero nunca rompen la respuesta al usuario.
    """
    _MEMORY_CACHE[sim_hash] = payload

    if not _aws_cache_enabled():
        return

    try:
        has_s3 = _s3_enabled()
        if has_s3:
            _get_s3().put_object(
                Bucket=os.environ["RESULTS_BUCKET_NAME"],
                Key=_s3_key(sim_hash),
                Body=_dumps(payload).encode("utf-8"),
                ContentType="application/json",
            )

        summary = {k: v for k, v in payload.items() if k != SPATIAL_KEY} if has_s3 else payload
        _get_table().put_item(
            Item={
                "sim_hash": sim_hash,
                "payload": _dumps(summary),
                "created_at": int(time.time()),
                "ttl": int(time.time()) + CACHE_TTL_SECONDS,
            }
        )
    except Exception as exc:
        logger.warning("Fallo al guardar cache en AWS (%s): %s", sim_hash, exc)


# ============================================================================
# TAREA 3.1: ORQUESTACION CON STEP FUNCTIONS EXPRESS + FALLBACK EN PROCESO
# ============================================================================

RUNS_PER_BATCH = 5
_SFN_CLIENT = None


def _get_sfn():
    global _SFN_CLIENT
    if _SFN_CLIENT is None:
        import boto3

        _SFN_CLIENT = boto3.client("stepfunctions")
    return _SFN_CLIENT


def _build_batches(params: Dict[str, Any], sim_hash: Optional[str] = None) -> List[Dict[str, Any]]:
    """Divide las replicas 0..M-1 en lotes de hasta RUNS_PER_BATCH para el estado Map."""
    total = int(params["monte_carlo_runs"])
    batches = []
    for batch_id, start in enumerate(range(0, total, RUNS_PER_BATCH)):
        batches.append(
            {
                "batch_id": batch_id,
                "params": params,
                "run_indices": list(range(start, min(start + RUNS_PER_BATCH, total))),
                "record_spatial": batch_id == 0,
                "sim_hash": sim_hash,
            }
        )
    return batches


def _hydrate_spatial_refs(batch_results: List[Dict[str, Any]]) -> None:
    """
    Los workers suben la serie espacial a S3 para no superar el limite de 256 KB de
    Step Functions y devuelven "spatial_ref". Aqui se descarga y se reincorpora al
    lote para que aggregate_batch_results la trate como si viniera en linea.
    """
    for batch in batch_results:
        ref = batch.get("spatial_ref")
        if not ref:
            continue
        body = _get_s3().get_object(Bucket=ref["bucket"], Key=ref["key"])["Body"].read()
        batch["spatial"] = json.loads(body)


def _run_distributed(
    params: Dict[str, Any], state_machine_arn: str, sim_hash: Optional[str] = None
) -> Dict[str, Any]:
    """Ejecuta los lotes en paralelo via Step Functions y agrega P10/P50/P90."""
    response = _get_sfn().start_sync_execution(
        stateMachineArn=state_machine_arn,
        input=json.dumps({"batches": _build_batches(params, sim_hash)}),
    )
    if response.get("status") != "SUCCEEDED":
        raise RuntimeError(
            f"Step Functions termino en {response.get('status')}: "
            f"{response.get('error', '')} {response.get('cause', '')}".strip()
        )
    batch_results = json.loads(response["output"])["batchResults"]
    _hydrate_spatial_refs(batch_results)
    return aggregate_batch_results(params, batch_results)


def execute_distributed_or_local_ensemble(
    params: Dict[str, Any], sim_hash: Optional[str] = None
) -> Dict[str, Any]:
    """
    Con STATE_MACHINE_ARN: reparte las replicas en Step Functions Express (workers
    Lambda en paralelo). Sin ARN, o si Step Functions falla: ejecuta todo en este
    mismo proceso con run_monte_carlo_ensemble (modo local / contingencia).
    """
    params = normalize_simulation_params(params)
    sim_hash = sim_hash or compute_sim_hash(params)
    state_machine_arn = os.environ.get("STATE_MACHINE_ARN", "").strip()

    if state_machine_arn:
        try:
            return _run_distributed(params, state_machine_arn, sim_hash)
        except Exception as exc:
            logger.warning("Step Functions fallo, se ejecuta en proceso: %s", exc)

    return run_monte_carlo_ensemble(params)


# ============================================================================
# TAREA 4.0: ENDPOINTS HTTP API (API Gateway v1/v2 y servidor local)
# ============================================================================

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With",
}


def _build_http_response(status_code: int, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Respuesta HTTP con cabeceras CORS completas siempre presentes."""
    return {
        "statusCode": status_code,
        "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
        "body": _dumps(body) if body is not None else "",
    }


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _backend_mode() -> str:
    """Valor del contrato TypeScript BackendMode: 'aws' o 'local'."""
    return "aws" if os.environ.get("STATE_MACHINE_ARN", "").strip() else "local"


def _execution_mode() -> str:
    return "aws-serverless" if _backend_mode() == "aws" else "local-hybrid"


def _parse_request(event: Dict[str, Any]):
    """Devuelve (metodo, ruta) tanto para eventos API Gateway v2 como v1."""
    http = (event.get("requestContext") or {}).get("http") or {}
    method = (http.get("method") or event.get("httpMethod") or "").upper()
    path = event.get("rawPath") or event.get("path") or "/"
    return method, path.rstrip("/") or "/"


def _parse_body(event: Dict[str, Any]) -> Dict[str, Any]:
    raw = event.get("body")
    if not raw:
        return {}
    if event.get("isBase64Encoded"):
        raw = base64.b64decode(raw).decode("utf-8")
    if isinstance(raw, (bytes, bytearray)):
        raw = raw.decode("utf-8")
    body = json.loads(raw) if isinstance(raw, str) else raw
    if not isinstance(body, dict):
        raise ValueError("El body debe ser un objeto JSON.")
    return body


def _handle_health() -> Dict[str, Any]:
    dynamodb = _aws_cache_enabled()
    s3 = _s3_enabled()
    sfn = bool(os.environ.get("STATE_MACHINE_ARN", "").strip())
    return _build_http_response(
        200,
        {
            "status": "ok",
            "backend_mode": _backend_mode(),
            "execution_mode": _execution_mode(),
            "region": os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "local",
            "dynamodb_connected": dynamodb,
            "s3_connected": s3,
            "step_functions_connected": sfn,
            "bedrock_available": bool(os.environ.get("BEDROCK_MODEL_ID")),
            "timestamp": _now_iso(),
        },
    )


def _with_request_metadata(payload: Dict[str, Any], cache_hit: bool, started: float) -> Dict[str, Any]:
    """Copia superficial del payload con los campos propios de esta peticion."""
    out = dict(payload)
    out["cache_hit"] = cache_hit
    out["execution_time_ms"] = round((time.perf_counter() - started) * 1000, 2)
    out["backend_mode"] = _backend_mode()
    out["timestamp"] = _now_iso()
    return out


def _handle_simulate(event: Dict[str, Any]) -> Dict[str, Any]:
    started = time.perf_counter()
    try:
        body = _parse_body(event)
    except (ValueError, json.JSONDecodeError) as exc:
        return _build_http_response(400, {"error": "body_invalido", "message": str(exc)})

    force_recompute = bool(body.pop("force_recompute", False))
    params = normalize_simulation_params(body)
    sim_hash = compute_sim_hash(params)

    if not force_recompute:
        cached = get_cached_simulation(sim_hash)
        if cached is not None:
            return _build_http_response(200, _with_request_metadata(cached, True, started))

    result = execute_distributed_or_local_ensemble(params, sim_hash)
    payload = {
        "sim_hash": sim_hash,
        "params": result["params"],
        "summary_kpis": result["summary_kpis"],
        "strategies": result["strategies"],
        SPATIAL_KEY: result.get(SPATIAL_KEY, {}),
    }
    save_simulation_cache(sim_hash, payload)
    return _build_http_response(200, _with_request_metadata(payload, False, started))


def _handle_get_simulation(event: Dict[str, Any], path: str) -> Dict[str, Any]:
    started = time.perf_counter()
    sim_hash = (event.get("pathParameters") or {}).get("simHash") or path.rsplit("/", 1)[-1]
    cached = get_cached_simulation(sim_hash)
    if cached is None:
        return _build_http_response(
            404, {"error": "simulacion_no_encontrada", "sim_hash": sim_hash}
        )
    return _build_http_response(200, _with_request_metadata(cached, True, started))


def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    """
    Lambda principal detras de API Gateway HTTP API (tambien usada por local_server.py).
    OPTIONS /*               -> preflight CORS
    GET  /health             -> estado de infraestructura
    POST /simulate           -> ejecutar o recuperar de cache una simulacion Monte Carlo
    GET  /simulations/{hash} -> recuperar una simulacion previa
    """
    method, path = _parse_request(event)

    if method == "OPTIONS":
        return _build_http_response(200)
    try:
        if method == "GET" and path.endswith("/health"):
            return _handle_health()
        if method == "POST" and path.endswith("/simulate"):
            return _handle_simulate(event)
        if method == "GET" and "/simulations/" in path:
            return _handle_get_simulation(event, path)
    except Exception as exc:
        logger.exception("Error no controlado en %s %s", method, path)
        return _build_http_response(500, {"error": "error_interno", "message": str(exc)})

    return _build_http_response(404, {"error": "ruta_no_encontrada", "method": method, "path": path})
