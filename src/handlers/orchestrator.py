import os
import json
import time
import hashlib
from decimal import Decimal
from typing import Dict, Any
from engine.simulator import run_monte_carlo_ensemble

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With",
}


def compute_simulation_hash(params: Dict[str, Any]) -> str:
    canonical = json.dumps(params, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:24]


def _float_to_decimal(obj: Any) -> Any:
    if isinstance(obj, float):
        return Decimal(str(round(obj, 4)))
    if isinstance(obj, dict):
        return {k: _float_to_decimal(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_float_to_decimal(v) for v in obj]
    return obj


def _decimal_to_float(obj: Any) -> Any:
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, dict):
        return {k: _decimal_to_float(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_decimal_to_float(v) for v in obj]
    return obj


def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    """
    AWS Lambda Orquestador Principal:
    - GET /health -> Estado de la infraestructura AWS
    - POST /simulate -> Ejecuta/recupera simulacion Monte Carlo reproducible por semilla
    """
    http_method = (
        event.get("requestContext", {}).get("http", {}).get("method")
        or event.get("httpMethod")
        or "POST"
    )
    raw_path = event.get("rawPath") or event.get("path") or "/simulate"

    if http_method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    if raw_path.endswith("/health") and http_method == "GET":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "status": "healthy",
                "service": "cortafuegos-manta-orchestrator",
                "region": os.environ.get("AWS_REGION", "us-east-1"),
                "dynamodb_table": os.environ.get("SIMULATIONS_TABLE_NAME", "local-memory"),
                "s3_bucket": os.environ.get("RESULTS_BUCKET_NAME", "local-storage"),
                "step_functions_configured": bool(os.environ.get("STATE_MACHINE_ARN")),
            }),
        }

    start_ts = time.time()
    body_str = event.get("body") or "{}"
    if isinstance(body_str, str):
        body = json.loads(body_str) if body_str.strip() else {}
    else:
        body = body_str

    params = {
        "seed": int(body.get("seed", 2026)),
        "population_nodes": int(body.get("population_nodes", 600)),
        "monte_carlo_runs": int(body.get("monte_carlo_runs", 25)),
        "days": int(body.get("days", 45)),
        "beta_day": float(body.get("beta_day", 0.085)),
        "beta_night": float(body.get("beta_night", 0.14)),
        "incubation_days": float(body.get("incubation_days", 2.5)),
        "recovery_days": float(body.get("recovery_days", 8.0)),
        "vaccine_stock": int(body.get("vaccine_stock", 110)),
        "vaccine_efficacy": float(body.get("vaccine_efficacy", 0.85)),
        "daily_budget": float(body.get("daily_budget", 2500.0)),
        "daily_supply_mode": bool(body.get("daily_supply_mode", True)),
        "patient_zero_zone": str(body.get("patient_zero_zone", "mercado_tarqui")),
        "initial_infected": int(body.get("initial_infected", 4)),
    }

    sim_hash = compute_simulation_hash(params)
    table_name = os.environ.get("SIMULATIONS_TABLE_NAME")
    bucket_name = os.environ.get("RESULTS_BUCKET_NAME")

    # 1. Intentar leer de cache determinista en Amazon DynamoDB si estamos en AWS
    if table_name and not body.get("force_recompute", False):
        try:
            import boto3
            ddb = boto3.resource("dynamodb")
            table = ddb.Table(table_name)
            cached = table.get_item(Key={"sim_hash": sim_hash}).get("Item")
            if cached and "result_payload" in cached:
                payload = _decimal_to_float(cached["result_payload"])
                payload["metadata"]["sim_hash"] = sim_hash
                payload["metadata"]["cache_hit"] = True
                payload["metadata"]["execution_ms"] = round((time.time() - start_ts) * 1000, 1)
                return {
                    "statusCode": 200,
                    "headers": CORS_HEADERS,
                    "body": json.dumps(payload),
                }
        except Exception:
            pass

    # 2. Ejecutar el motor Monte Carlo SEIR-VQ
    result = run_monte_carlo_ensemble(params)
    result["metadata"]["sim_hash"] = sim_hash
    result["metadata"]["cache_hit"] = False
    result["metadata"]["execution_ms"] = round((time.time() - start_ts) * 1000, 1)

    # 3. Guardar en Amazon S3 (JSON detallado para animacion del mapa) y Amazon DynamoDB
    if bucket_name:
        try:
            import boto3
            s3 = boto3.client("s3")
            s3_key = f"simulations/{sim_hash}.json"
            s3.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=json.dumps(result).encode("utf-8"),
                ContentType="application/json",
            )
            result["metadata"]["s3_artifact_key"] = s3_key
        except Exception:
            pass

    if table_name:
        try:
            import boto3
            ddb = boto3.resource("dynamodb")
            table = ddb.Table(table_name)
            table.put_item(
                Item={
                    "sim_hash": sim_hash,
                    "created_at": int(time.time()),
                    "ttl": int(time.time()) + 86400 * 14,
                    "seed": params["seed"],
                    "result_payload": _float_to_decimal(result),
                }
            )
        except Exception:
            pass

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps(result),
    }
