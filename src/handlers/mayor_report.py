import os
import json
from typing import Dict, Any

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With",
}


def build_structured_mayor_bulletin(data: Dict[str, Any]) -> str:
    meta = data.get("metadata", {})
    params = meta.get("params", {})
    impact = data.get("impact_summary", {})
    strats = data.get("strategies", {})
    shield = strats.get("shield", {})
    none_s = strats.get("none", {})
    rand_s = strats.get("random", {})

    zone_map = {
        "mercado_tarqui": "el Mercado de Tarqui",
        "uleam": "el Campus de la ULEAM",
        "mercado_central": "el Mercado Central",
        "empacadoras_esteros": "la Zona Industrial / Empacadoras de Los Esteros",
        "terminal_terrestre": "la Terminal Terrestre",
        "tarqui": "la Parroquia Tarqui",
        "eloy_alfaro": "la Parroquia Eloy Alfaro",
    }
    foco_nombre = zone_map.get(params.get("patient_zero_zone", "mercado_tarqui"), "Tarqui")
    saved_manta = impact.get("citizens_saved_manta_scale", 185000)
    red_pct = impact.get("infection_reduction_pct", 82.5)
    eff_pct = int(float(params.get("vaccine_efficacy", 0.85)) * 100)

    return (
        f"🏛️ BOLETÍN OFICIAL DEL COE CANTONAL — ALCALDÍA DE SAN PABLO DE MANTA\n"
        f"• Semilla de Verificación Reproducible: #{meta.get('seed', 2026)} ({meta.get('monte_carlo_runs', 25)} corridas Monte Carlo)\n"
        f"• Foco Inicial Detectado: {foco_nombre}\n\n"
        f"1. IMPACTO EN VIDAS SALVADAS:\n"
        f"Aplicar la estrategia 'Operación Cortafuegos Manta' reduce los contagios totales en un {red_pct}% frente a no intervenir, "
        f"protegiendo el equivalente a {saved_manta:,} ciudadanos de Manta y reduciendo el pico hospitalario diario de "
        f"{none_s.get('peak_zombies_mean', 0)} a solo {shield.get('peak_zombies_mean', 0)} casos simultáneos "
        f"(superando ampliamente a la vacunación al azar que deja {rand_s.get('total_infected_mean', 0)} infectados y desperdicia "
        f"{rand_s.get('wasted_vaccines_mean', 0)} dosis).\n\n"
        f"2. ORDEN DE ACCIÓN INMEDIATA (PRÓXIMAS 72 HORAS):\n"
        f"• LA RED (Cortafuegos en Hubs): Ejecutar cierre quirúrgico y fumigación durante {shield.get('hubs_closed_days_mean', 0)} "
        f"días-hub acumulados priorizando {foco_nombre} y nodos de trasbordo en Tarqui para cortar el 85% de la transmisión diurna.\n"
        f"• LA LANZA (Brigadas de Contención): Aislar de inmediato a los {shield.get('isolated_zombies_mean', 0)} superpropagadores activos "
        f"en rutas de buses inter-parroquiales (Eloy Alfaro ↔ Tarqui ↔ Centro).\n"
        f"• EL ESCUDO (Vacunación Anillo + Puente con {eff_pct}% de eficacia): Administrar las {shield.get('vaccines_used_mean', 0)} dosis "
        f"exclusivamente a ciudadanos SANOS (0% desperdicio) ubicados a 1 y 2 saltos del brote (comerciantes, choferes y estudiantes de la ULEAM)."
    )


def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    http_method = (
        event.get("requestContext", {}).get("http", {}).get("method")
        or event.get("httpMethod")
        or "POST"
    )
    if http_method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    body_str = event.get("body") or "{}"
    body = json.loads(body_str) if isinstance(body_str, str) and body_str.strip() else (body_str if isinstance(body_str, dict) else {})
    sim_data = body.get("simulation_result", body)

    fallback_report = build_structured_mayor_bulletin(sim_data)
    model_id = os.environ.get("BEDROCK_MODEL_ID", "amazon.nova-micro-v1:0")

    # Si estamos desplegados en AWS y Bedrock esta disponible, enriquecer con LLM
    if os.environ.get("AWS_EXECUTION_ENV"):
        try:
            import boto3
            bedrock = boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_REGION", "us-east-1"))
            prompt = (
                "Eres el asesor epidemiológico principal del Alcalde de Manta, Ecuador. "
                "Redacta un informe ejecutivo breve (máximo 180 palabras), claro y accionable en español "
                "basado exactamente en estos datos de simulación Monte Carlo:\n\n"
                f"{fallback_report}"
            )
            if "nova" in model_id:
                resp = bedrock.invoke_model(
                    modelId=model_id,
                    contentType="application/json",
                    accept="application/json",
                    body=json.dumps({
                        "messages": [{"role": "user", "content": [{"text": prompt}]}],
                        "inferenceConfig": {"max_new_tokens": 350, "temperature": 0.2},
                    }),
                )
                resp_json = json.loads(resp["body"].read())
                llm_text = resp_json["output"]["message"]["content"][0]["text"]
                return {
                    "statusCode": 200,
                    "headers": CORS_HEADERS,
                    "body": json.dumps({"report": llm_text, "source": f"Amazon Bedrock ({model_id})"}),
                }
        except Exception:
            pass

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps({
            "report": fallback_report,
            "source": "Motor Ejecutivo COE Manta (Amazon Bedrock Ready)",
        }),
    }
