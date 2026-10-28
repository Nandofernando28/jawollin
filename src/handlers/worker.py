import json
import logging
import os
import time
from typing import Dict, Any

logger = logging.getLogger(__name__)

_S3_CLIENT = None

from src.engine.simulator import normalize_simulation_params, run_batch_simulations


def _offload_batch_to_s3(sim_hash: str, batch_id: int, result: Dict[str, Any]) -> Dict[str, str]:
    """
    Sube el lote completo (series de las 3 estrategias y serie espacial) a S3 y
    devuelve la referencia {"bucket", "key"}. Step Functions limita a 256 KiB la
    salida de cada estado: con 100 replicas o 90 dias el lote en linea no cabe.
    """
    global _S3_CLIENT
    if _S3_CLIENT is None:
        import boto3

        _S3_CLIENT = boto3.client("s3")
    bucket = os.environ["RESULTS_BUCKET_NAME"]
    key = f"batches/{sim_hash}/{batch_id}.json"
    _S3_CLIENT.put_object(
        Bucket=bucket,
        Key=key,
        Body=json.dumps(result, separators=(",", ":")).encode("utf-8"),
        ContentType="application/json",
    )
    return {"bucket": bucket, "key": key}


def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    """
    Lambda Worker invocado por el Map State de Step Functions.
    Recibe un lote de indices de replicas Monte Carlo y ejecuta las 3
    estrategias (none, random, shield) para cada una.

    Evento esperado:
        {
          "batch_id": 0,
          "params": {...},                 # parametros (se re-normalizan por seguridad)
          "run_indices": [0, 1, 2, 3, 4],
          "record_spatial": true,          # opcional; por defecto batch_id == 0
          "sim_hash": "cf-..."             # opcional; habilita subir el lote a S3
        }

    Con sim_hash y RESULTS_BUCKET_NAME, el lote completo se sube a S3 y el resultado
    solo lleva {"batch_id", "run_indices", "result_ref", "worker_time_ms"}. Si no
    (modo local) o si S3 falla, el lote viaja en linea.
    """
    started = time.perf_counter()

    params = normalize_simulation_params(event.get("params") or {})
    run_indices = [int(k) for k in (event.get("run_indices") or [])]
    if not run_indices:
        raise ValueError("El evento debe incluir 'run_indices' con al menos una replica.")

    batch_id = int(event.get("batch_id", 0))
    record_spatial = bool(event.get("record_spatial", batch_id == 0))

    result = run_batch_simulations(params, run_indices, include_spatial=record_spatial)
    result["batch_id"] = batch_id

    sim_hash = event.get("sim_hash")
    if sim_hash and os.environ.get("RESULTS_BUCKET_NAME"):
        try:
            ref = _offload_batch_to_s3(str(sim_hash), batch_id, result)
            result = {"batch_id": batch_id, "run_indices": result["run_indices"], "result_ref": ref}
        except Exception as exc:
            logger.warning("No se pudo subir el lote a S3, se devuelve en linea: %s", exc)
    result["worker_time_ms"] = round((time.perf_counter() - started) * 1000, 2)
    return result
