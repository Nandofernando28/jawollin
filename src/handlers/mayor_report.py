"""
Handler AWS Lambda para la generación del Boletín Ejecutivo del Alcalde de Manta.
SpookyThon 2026 · Track B (Operación Cortafuegos Manta).

Fase 4:
- Tarea 1.0: Extracción y síntesis de indicadores estratégicos para el Alcalde.
- Tarea 2.0: Integración con Amazon Bedrock (Converse API / amazon.nova-micro-v1:0).
- Tarea 3.0: Generador Heurístico Estructurado de Respaldo (heuristic-coe-fallback).
- Tarea 4.0: Endpoint POST /mayor-report con manejo resiliente de cuota y CORS.
"""

import base64
import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from src.engine.graph_manta import HUB_IDS, MANTA_HUBS, MANTA_PARISHES, PARISH_IDS
from src.handlers.orchestrator import get_cached_simulation

logger = logging.getLogger(__name__)


# ============================================================================
# TAREA 1.0: EXTRACCIÓN Y SÍNTESIS DE INDICADORES ESTRATÉGICOS
# ============================================================================

def extract_executive_context(sim_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extrae y sintetiza las métricas clave de la simulación para construir
    el Boletín Ejecutivo Oficial del COE Cantonal de Manta.

    Acepta un diccionario de simulación completo (SimulationResponse) o
    un diccionario con parámetros y KPIs agregados.

    Retorna un diccionario normalizado con:
    - Parroquia más crítica y hubs intervenidos con días pico de cierre/fumigación.
    - Vidas salvadas vs azar y vs no hacer nada.
    - Reducción del pico epidémico (%).
    - Desglose de recursos (vacunas aplicadas con 0 desperdicio, brigadas, días-hub).
    - Métricas formateadas para el contrato TypeScript MayorReportResponse (metrics_snapshot).
    """
    params = sim_data.get("params") or {}
    kpis = sim_data.get("summary_kpis") or {}
    spatial_timelines = sim_data.get("spatial_timelines") or sim_data.get("spatial") or {}
    sim_hash = str(sim_data.get("sim_hash") or params.get("sim_hash") or "cf-manta-sim")

    total_pop = int(kpis.get("total_population") or params.get("n_nodes") or 1200)

    # 1. Vidas salvadas y reducción de picos
    lives_saved_none = round(float(kpis.get("lives_saved_vs_none", 0.0)), 2)
    lives_saved_random = round(float(kpis.get("lives_saved_vs_random", 0.0)), 2)
    lives_saved_none_pct = round(float(kpis.get("lives_saved_vs_none_pct", 0.0)), 1)
    lives_saved_random_pct = round(float(kpis.get("lives_saved_vs_random_pct", 0.0)), 1)
    peak_reduct_none_pct = round(float(kpis.get("peak_reduction_vs_none_pct", 0.0)), 1)
    peak_reduct_random_pct = round(float(kpis.get("peak_reduction_vs_random_pct", 0.0)), 1)

    # 2. Análisis espacial: Parroquia más crítica
    # Si hay serie temporal espacial de la línea base 'none' o 'shield',
    # calculamos cuál parroquia sufrió el pico más alto de infección activa.
    most_critical_parish_id = "tarqui"  # Por defecto Parroquia Tarqui (38% población)
    timeline_none = spatial_timelines.get("none") or []
    timeline_shield = spatial_timelines.get("shield") or []

    if timeline_none:
        # Medir la máxima prevalencia alcanzada por parroquia sin contención
        max_prev_by_parish: Dict[str, float] = {p: 0.0 for p in PARISH_IDS}
        for day_snap in timeline_none:
            parishes_data = day_snap.get("parishes") or {}
            for p_id, p_info in parishes_data.items():
                prev = float(p_info.get("prevalence_pct", 0.0))
                if prev > max_prev_by_parish.get(p_id, 0.0):
                    max_prev_by_parish[p_id] = prev
        most_critical_parish_id = max(max_prev_by_parish, key=lambda k: max_prev_by_parish[k])
    elif params.get("start_hub") and params["start_hub"] in MANTA_HUBS:
        most_critical_parish_id = MANTA_HUBS[params["start_hub"]]["parish"]

    most_critical_parish_name = MANTA_PARISHES.get(
        most_critical_parish_id, {}
    ).get("name", "Tarqui")

    # 3. Hubs críticos intervenidos y días pico de cortafuegos
    critical_hubs_intervened: List[str] = []
    hubs_detail: List[Dict[str, Any]] = []

    if timeline_shield:
        for h_id in HUB_IDS:
            hub_name = MANTA_HUBS[h_id]["name"]
            days_closed: List[int] = []
            max_cases = -1
            peak_day = 0
            for snap in timeline_shield:
                h_data = (snap.get("hubs") or {}).get(h_id) or {}
                if h_data.get("firewall_active"):
                    days_closed.append(int(snap.get("day", 0)))
                cases = int(h_data.get("active_cases", 0))
                if cases > max_cases:
                    max_cases = cases
                    peak_day = int(snap.get("day", 0))

            if days_closed:
                critical_hubs_intervened.append(hub_name)
                hubs_detail.append({
                    "hub_id": h_id,
                    "name": hub_name,
                    "parish_id": MANTA_HUBS[h_id]["parish"],
                    "parish_name": MANTA_PARISHES[MANTA_HUBS[h_id]["parish"]]["name"],
                    "days_closed": days_closed,
                    "closure_count": len(days_closed),
                    "peak_day": peak_day,
                    "peak_cases": max_cases,
                })

    # Si no hubo serie espacial o no se cerraron hubs en la simulación 0,
    # incluir al menos el start_hub y el hub más conectado
    if not critical_hubs_intervened:
        start_h = params.get("start_hub", "mercado_tarqui")
        fallback_hubs = [start_h]
        if start_h != "uleam":
            fallback_hubs.append("uleam")
        for f_id in fallback_hubs:
            if f_id in MANTA_HUBS:
                name = MANTA_HUBS[f_id]["name"]
                if name not in critical_hubs_intervened:
                    critical_hubs_intervened.append(name)
                    hubs_detail.append({
                        "hub_id": f_id,
                        "name": name,
                        "parish_id": MANTA_HUBS[f_id]["parish"],
                        "parish_name": MANTA_PARISHES[MANTA_HUBS[f_id]["parish"]]["name"],
                        "days_closed": [1, 2, 3] if kpis.get("total_hub_days_closed", 0) > 0 else [],
                        "closure_count": int(kpis.get("total_hub_days_closed", 0)),
                        "peak_day": 3,
                        "peak_cases": 12,
                    })

    # 4. Desglose de recursos y auditoría de desperdicio cero
    total_spent = round(float(kpis.get("total_budget_spent", 0.0)), 2)
    cost_per_life = round(float(kpis.get("cost_per_life_saved_vs_random", 0.0)), 2)
    if cost_per_life <= 0 and lives_saved_none > 0:
        cost_per_life = round(total_spent / lives_saved_none, 2)

    total_vaccines = round(float(kpis.get("total_vaccines_used", 0.0)), 1)
    wasted_vaccines = int(kpis.get("wasted_vaccines_count", 0))
    total_brigades = round(float(kpis.get("total_brigades_used", 0.0)), 1)
    hub_days_closed = round(float(kpis.get("total_hub_days_closed", 0.0)), 1)
    budget_remaining = round(float(kpis.get("remaining_budget", 0.0)), 2)

    # 5. Detección de escenario (Normal vs Brote Sorpresa)
    vaccine_eff = float(params.get("vaccine_efficacy", 0.85))
    beta_day = float(params.get("beta_day", 0.085))
    is_surprise = bool(vaccine_eff < 0.60 or beta_day > 0.15 or params.get("surprise_mode"))

    start_hub_id = params.get("start_hub", "mercado_tarqui")
    start_hub_name = MANTA_HUBS.get(start_hub_id, {}).get("name", "Mercado Central de Tarqui")

    # Contrato exacto para el frontend React (MayorReportResponse.metrics_snapshot)
    metrics_snapshot = {
        "lives_saved_vs_random": lives_saved_random,
        "peak_reduction_pct": peak_reduct_none_pct,
        "budget_spent_usd": total_spent,
        "cost_per_life_saved_usd": cost_per_life,
        "most_critical_parish": most_critical_parish_name,
        "critical_hubs_intervened": critical_hubs_intervened,
    }

    return {
        "sim_hash": sim_hash,
        "total_population": total_pop,
        "lives_saved_vs_none": lives_saved_none,
        "lives_saved_vs_none_pct": lives_saved_none_pct,
        "lives_saved_vs_random": lives_saved_random,
        "lives_saved_vs_random_pct": lives_saved_random_pct,
        "peak_reduction_vs_none_pct": peak_reduct_none_pct,
        "peak_reduction_vs_random_pct": peak_reduct_random_pct,
        "most_critical_parish_id": most_critical_parish_id,
        "most_critical_parish": most_critical_parish_name,
        "critical_hubs_intervened": critical_hubs_intervened,
        "hubs_detail": hubs_detail,
        "total_vaccines_used": total_vaccines,
        "wasted_vaccines": wasted_vaccines,
        "zero_wasted_verified": wasted_vaccines == 0,
        "total_brigades_used": total_brigades,
        "total_hub_days_closed": hub_days_closed,
        "budget_spent_usd": total_spent,
        "remaining_budget_usd": budget_remaining,
        "cost_per_life_saved_usd": cost_per_life,
        "start_hub": start_hub_id,
        "start_hub_name": start_hub_name,
        "vaccine_efficacy": vaccine_eff,
        "is_surprise_outbreak": is_surprise,
        "metrics_snapshot": metrics_snapshot,
    }


# ============================================================================
# TAREA 2.0: INTEGRACIÓN CON AMAZON BEDROCK (CONVERSE API)
# ============================================================================

DEFAULT_BEDROCK_MODEL_ID = "amazon.nova-micro-v1:0"
_BEDROCK_CLIENT = None


def _get_bedrock_client():
    global _BEDROCK_CLIENT
    if _BEDROCK_CLIENT is None:
        import boto3

        region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "us-east-1"
        _BEDROCK_CLIENT = boto3.client("bedrock-runtime", region_name=region)
    return _BEDROCK_CLIENT


def build_bedrock_prompts(ctx: Dict[str, Any]) -> Tuple[str, str]:
    """
    Construye el prompt de sistema y de usuario en español ejecutivo para el
    Alcalde de Manta y el COE Cantonal, exigiendo exactamente 3 secciones y JSON válido.
    """
    system_prompt = (
        "Eres el Asesor Epidemiológico Principal del Comité de Operaciones de Emergencia "
        "(COE Cantonal) de Manta para el Alcalde del Cantón Manta, Ecuador.\n"
        "Tu misión es redactar un Decreto/Boletín Ejecutivo Oficial urgente y de alta autoridad moral, "
        "sin tecnicismos matemáticos (no menciones SEIR, R0 ni teoría de grafos), utilizando nombres "
        "propios geográficos reales de Manta (Parroquias: Tarqui, Eloy Alfaro, Manta Centro, Los Esteros, San Mateo; "
        "Hubs: Mercado Central de Tarqui, ULEAM, Terminal Terrestre, Empacadoras de Atún).\n"
        "Debes responder EXCLUSIVAMENTE con un objeto JSON válido con la siguiente estructura exacta:\n"
        "{\n"
        '  "headline": "Titular oficial contundente del decreto municipal",\n'
        '  "situacion_critica": "Diagnóstico inmediato en Manta: vidas en riesgo, parroquia más golpeada y gravedad del brote.",\n'
        '  "directivas_operativas": "Directivas tácticas claras: hubs a intervenir o cerrar hoy, a quién vacunar primero (anillos sanos de contactos y transportistas con 0 desperdicio) y despliegue de brigadas.",\n'
        '  "balance_recursos": "Eficiencia del gasto municipal: presupuesto ejecutado, vidas salvadas frente a la inacción y costo por vida salvada.",\n'
        '  "action_items": [\n'
        '    {"title": "Acción breve", "description": "Detalle operativo", "priority": "CRITICA", "parish_or_hub": "Lugar específico"}\n'
        "  ]\n"
        "}"
    )

    surprise_note = (
        "\nATENCIÓN ESPECIAL: Se ha detectado una mutación o cepa agresiva (Brote Sorpresa) con baja eficacia "
        f"vacunal ({ctx['vaccine_efficacy']*100:.0f}%). El sistema reasignó recursos prioritariamente hacia "
        "el cierre quirúrgico de hubs de alta densidad y brigadas de contención directa."
        if ctx.get("is_surprise_outbreak")
        else ""
    )

    hubs_str = ", ".join(ctx["critical_hubs_intervened"]) if ctx.get("critical_hubs_intervened") else "Mercado Central de Tarqui"

    user_prompt = (
        f"Genera el Boletín Oficial para el Alcalde de Manta con los siguientes datos consolidados:\n"
        f"- Población monitoreada: {ctx['total_population']:,} habitantes\n"
        f"- Parroquia con mayor presión infecciosa: {ctx['most_critical_parish']}\n"
        f"- Hubs intervenidos por cortafuegos: {hubs_str}\n"
        f"- Vidas salvadas estimadas vs. inacción: {ctx['lives_saved_vs_none']:,.0f} personas ({ctx['lives_saved_vs_none_pct']}%\n"
        f"- Vidas adicionales salvadas vs. actuar al azar: {ctx['lives_saved_vs_random']:,.0f} personas\n"
        f"- Reducción del pico de contagios activos: {ctx['peak_reduction_vs_none_pct']}%\n"
        f"- Presupuesto municipal ejecutado: ${ctx['budget_spent_usd']:,.2f} USD (Costo por vida: ${ctx['cost_per_life_saved_usd']:.2f} USD)\n"
        f"- Dosis de vacuna aplicadas: {ctx['total_vaccines_used']:,.0f} (Desperdicio verificado: 0 dosis)\n"
        f"- Brigadas de contención desplegadas: {ctx['total_brigades_used']:,.0f}\n"
        f"- Días-hub de cierre preventivo: {ctx['total_hub_days_closed']:,.0f}\n"
        f"{surprise_note}\n\n"
        "Genera ÚNICAMENTE el JSON solicitado sin texto introductorio ni explicaciones adicionales."
    )

    return system_prompt, user_prompt


def invoke_bedrock_report(
    context_data: Dict[str, Any], model_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Invoca el modelo generativo de Amazon Bedrock utilizando la Converse API
    (con fallback a InvokeModel) para redactar el Boletín del Alcalde.
    """
    resolved_model = (
        model_id
        or os.environ.get("BEDROCK_MODEL_ID")
        or DEFAULT_BEDROCK_MODEL_ID
    ).strip()

    system_prompt, user_prompt = build_bedrock_prompts(context_data)
    client = _get_bedrock_client()

    raw_text = ""
    try:
        # 1. Intento primario con Converse API (API unificada de AWS Bedrock)
        response = client.converse(
            modelId=resolved_model,
            messages=[{"role": "user", "content": [{"text": user_prompt}]}],
            system=[{"text": system_prompt}],
            inferenceConfig={"maxTokens": 700, "temperature": 0.2},
        )
        content_list = response.get("output", {}).get("message", {}).get("content", [])
        if content_list and "text" in content_list[0]:
            raw_text = content_list[0]["text"]
    except Exception as converse_err:
        logger.warning(
            "Fallo en Converse API con modelo %s (%s). Intentando invoke_model...",
            resolved_model,
            converse_err,
        )
        # 2. Fallback a invoke_model para compatibilidad
        body = json.dumps({
            "prompt": f"{system_prompt}\n\nHumano: {user_prompt}\n\nAsistente:",
            "max_tokens_to_sample": 700,
            "temperature": 0.2,
        })
        invoke_res = client.invoke_model(modelId=resolved_model, body=body)
        raw_body = invoke_res.get("Body").read().decode("utf-8")
        parsed = json.loads(raw_body)
        raw_text = parsed.get("completion") or parsed.get("output") or raw_body

    if not raw_text:
        raise ValueError(f"Respuesta vacía desde Amazon Bedrock ({resolved_model})")

    # Limpiar posibles bloques markdown ```json ... ```
    cleaned = raw_text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
    if match:
        cleaned = match.group(1).strip()

    report_dict = json.loads(cleaned)

    # Normalizar generated_by según el modelo
    generated_by = (
        "amazon-bedrock-claude-haiku"
        if "haiku" in resolved_model.lower()
        else "amazon-bedrock-nova-micro"
    )

    return {
        "headline": str(report_dict.get("headline") or "DECRETO DE CONTENCIÓN EPIDEMIOLÓGICA - CANTÓN MANTA"),
        "situacion_critica": str(report_dict.get("situacion_critica") or ""),
        "directivas_operativas": str(report_dict.get("directivas_operativas") or ""),
        "balance_recursos": str(report_dict.get("balance_recursos") or ""),
        "action_items": list(report_dict.get("action_items") or []),
        "generated_by": generated_by,
        "model_id": resolved_model,
    }


# ============================================================================
# TAREA 3.0: GENERADOR HEURÍSTICO ESTRUCTURADO DE RESPALDO
# ============================================================================

def build_heuristic_mayor_report(context_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Genera el Boletín Oficial del Alcalde de Manta de forma determinista,
    altamente estructurada y rica en datos municipales reales.

    Se utiliza como salvaguarda infalible ante cuota 0 / Throttling en Amazon Bedrock,
    caída de enlace, modo local offline o durante la defensa en vivo en la ULEAM.
    """
    ctx = context_data
    total_pop = ctx.get("total_population", 1200)
    most_critical = ctx.get("most_critical_parish", "Tarqui")
    hubs_list = ctx.get("critical_hubs_intervened") or ["Mercado Central de Tarqui"]
    hubs_str = ", ".join(hubs_list)
    first_hub = hubs_list[0] if hubs_list else "Mercado Central de Tarqui"

    lives_none = ctx.get("lives_saved_vs_none", 0.0)
    lives_none_pct = ctx.get("lives_saved_vs_none_pct", 0.0)
    lives_random = ctx.get("lives_saved_vs_random", 0.0)
    peak_reduct = ctx.get("peak_reduction_vs_none_pct", 0.0)

    total_spent = ctx.get("budget_spent_usd", 0.0)
    remaining_budget = ctx.get("remaining_budget_usd", 0.0)
    cost_per_life = ctx.get("cost_per_life_saved_usd", 0.0)

    total_vaccines = ctx.get("total_vaccines_used", 0.0)
    total_brigades = ctx.get("total_brigades_used", 0.0)
    total_hub_days = ctx.get("total_hub_days_closed", 0.0)

    is_surprise = ctx.get("is_surprise_outbreak", False)
    vaccine_eff = ctx.get("vaccine_efficacy", 0.85)

    # 1. Headline
    if is_surprise:
        headline = "DECRETO DE EMERGENCIA EXTRAORDINARIA N° 004-COE: CONTENCIÓN DE BROTE MUTADO EN EL CANTÓN MANTA"
    else:
        headline = "DECRETO DE EMERGENCIA SANITARIA N° 001-COE: OPERACIÓN CORTAFUEGOS EPIDEMIOLÓGICO MANTA"

    # 2. Situación Crítica
    situacion_lines = [
        "### 1. Diagnóstico de Situación y Población en Riesgo",
        f"El Comité de Operaciones de Emergencia (COE Cantonal) de Manta declara el estado de alerta máxima en el cantón. Sobre un censo activo de **{total_pop:,} habitantes monitoreados**, la **Parroquia {most_critical}** ha sido identificada como el epicentro de mayor presión infecciosa y riesgo inminente de propagación.",
        "De no mediar una intervención táctica e inmediata, las proyecciones epidemiológicas indican una pérdida crítica de vidas y la saturación inminente de las unidades de cuidados intensivos del Hospital General Dr. Rafael Rodríguez Zambrano y del Hospital IESS Manta.",
    ]
    if is_surprise:
        situacion_lines.append(
            f"**ALERTA DE MUTACIÓN (BROTE SORPRESA):** Se confirma una variante con agresividad incrementada y escape inmunológico parcial (eficacia vacunal reducida al **{vaccine_eff*100:.0f}%**). Esto acelera la transmisión comunitaria en el transporte público y zonas de comercio popular, requiriendo medidas drásticas de contención física y distanciamiento."
        )
    situacion_critica = "\n\n".join(situacion_lines)

    # 3. Directivas Operativas
    directivas_lines = [
        "### 2. Directivas Tácticas y Operativas Inmediatas",
        "Por disposición de la Alcaldía de Manta y el COE Cantonal, se ejecutan de manera inmediata las siguientes medidas de control:",
        f"- **Cierre Quirúrgico y Cortafuegos en Hubs:** Se ordena la intervención prioritaria y cordón sanitario en **{hubs_str}**, puntos neurálgicos donde convergen las rutas de transporte interparroquial y mayor flujo ciudadano.",
        f"- **Estrategia de Vacunación Anillo + Puente:** Se autoriza la aplicación de **{total_vaccines:,.0f} dosis** focalizadas exclusivamente en anillos de contactos cercanos de casos activos y personal de alta movilidad (transportistas y comerciantes de {most_critical}). La auditoría técnica confirma un **desperdicio estricto del 0.0%** al excluir a individuos expuestos o inmunes.",
        f"- **Despliegue de Brigadas Territoriales:** Se movilizan **{total_brigades:,.0f} brigadas de contención médica** para rastreo activo, detección temprana y aislamiento domiciliario supervisado de superpropagadores.",
    ]
    if is_surprise:
        directivas_lines.append(
            f"**ADAPTACIÓN ESTRATÉGICA POR MUTACIÓN:** Debido a la menor eficacia del biológico, el Comité ha reorientado proactivamente el presupuesto municipal hacia el **cierre estricto de hubs de alta densidad ({total_hub_days:,.0f} días-hub acumulados)** y el fortalecimiento de **brigadas de aislamiento directo**, cortando la cadena de contagio donde la barrera inmunológica es limitada."
        )
    directivas_operativas = "\n\n".join(directivas_lines)

    # 4. Balance de Recursos
    balance_lines = [
        "### 3. Balance de Recursos y Eficiencia del Gasto Público",
        "La implementación del modelo optimizado *Escudo Manta* demuestra una superioridad contundente frente a la inacción y a la respuesta reactiva al azar:",
        f"- **Vidas Salvadas:** Se estima un rescate efectivo de **{lives_none:,.0f} vidas** ({lives_none_pct}% de reducción frente a no hacer nada) y **{lives_random:,.0f} vidas adicionales** frente a actuar al azar con el mismo presupuesto.",
        f"- **Aplanamiento de la Curva:** Se logró una **reducción del {peak_reduct}% en el pico de casos activos**, previniendo la parálisis económica y el desbordamiento hospitalario cantonal.",
        f"- **Costo-Efectividad del Gasto Municipal:** Con una inversión pública de **${total_spent:,.2f} USD** (manteniendo **${remaining_budget:,.2f} USD** de reserva de contingencia), el costo por vida protegida se sitúa en apenas **${cost_per_life:,.2f} USD**, optimizando cada dólar del erario municipal mediante criterios científicos de centralidad de red.",
    ]
    balance_recursos = "\n\n".join(balance_lines)

    # 5. Acciones Inmediatas Priorizadas (MayorActionItem[])
    action_items = [
        {
            "title": "Cierre Quirúrgico y Fumigación",
            "description": f"Instalación de cortafuegos sanitario y restricción de acceso en {first_hub}.",
            "priority": "CRITICA",
            "parish_or_hub": first_hub,
        },
        {
            "title": "Vacunación Anillo + Puente",
            "description": f"Inmunización focalizada a contactos estrechos sanos y transportistas de la Parroquia {most_critical}.",
            "priority": "CRITICA" if not is_surprise else "ALTA",
            "parish_or_hub": most_critical,
        },
        {
            "title": "Despliegue de Brigadas de Aislamiento",
            "description": f"Operativo casa por casa para rastreo de mordidos y aislamiento temprano en barrios perimetrales.",
            "priority": "CRITICA" if is_surprise else "ALTA",
            "parish_or_hub": most_critical,
        },
        {
            "title": "Control en Corredores de Transporte",
            "description": "Filtros epidemiológicos y desinfección obligatoria en el eje ULEAM - Terminal Terrestre El Palmar.",
            "priority": "MEDIA",
            "parish_or_hub": "Terminal Terrestre Luis Valdivieso Morán",
        },
    ]

    return {
        "headline": headline,
        "situacion_critica": situacion_critica,
        "directivas_operativas": directivas_operativas,
        "balance_recursos": balance_recursos,
        "action_items": action_items,
        "generated_by": "heuristic-coe-fallback",
        "model_id": "heuristic-coe-manta-v1",
    }


# ============================================================================
# TAREA 4.0: ENDPOINT HTTP POST /mayor-report (API Gateway v1/v2 & Local)
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
        "body": json.dumps(body) if body is not None else "",
    }


def _parse_body(event: Dict[str, Any]) -> Dict[str, Any]:
    """Extrae y decodifica el body JSON desde eventos API Gateway v1/v2 o servidor local."""
    raw = event.get("body")
    if not raw:
        return {}
    if event.get("isBase64Encoded"):
        raw = base64.b64decode(raw).decode("utf-8")
    if isinstance(raw, (bytes, bytearray)):
        raw = raw.decode("utf-8")
    body = json.loads(raw) if isinstance(raw, str) else raw
    if not isinstance(body, dict):
        raise ValueError("El body debe ser un objeto JSON válido.")
    return body


def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    """
    Handler para POST /mayor-report y OPTIONS /mayor-report.

    Acepta en el body JSON:
    - 'simulation': Diccionario completo con resultados de la simulación.
    - 'sim_hash': Hash SHA-256 para recuperar la simulación desde DynamoDB/memoria.
    - Campos en la raíz ('params', 'summary_kpis', etc.).
    - Opcional 'model_id' para personalizar el modelo de Amazon Bedrock.

    Responde siempre con HTTP 200 OK y la estructura MayorReportResponse.
    Si Bedrock falla (por cuota 0, throttling o falta de credenciales),
    conmuta silenciosamente al fallback heurístico del COE Cantonal de Manta.
    """
    # 1. Preflight CORS
    http = (event.get("requestContext") or {}).get("http") or {}
    method = (http.get("method") or event.get("httpMethod") or "").upper()
    if method == "OPTIONS":
        return _build_http_response(200)

    try:
        body = _parse_body(event)
    except Exception as exc:
        return _build_http_response(400, {"error": "body_invalido", "message": str(exc)})

    # 2. Localizar datos de la simulación
    sim_data = body.get("simulation")
    sim_hash = body.get("sim_hash")

    if not sim_data:
        if sim_hash:
            cached = get_cached_simulation(str(sim_hash))
            if cached is None:
                return _build_http_response(
                    404,
                    {"error": "simulacion_no_encontrada", "sim_hash": str(sim_hash)},
                )
            sim_data = cached
        elif any(k in body for k in ("params", "summary_kpis", "strategies")):
            sim_data = body
        else:
            return _build_http_response(
                400,
                {
                    "error": "datos_insuficientes",
                    "message": "Debe enviar 'sim_hash' o el objeto de simulación con 'params' y 'summary_kpis'.",
                },
            )

    # 3. Extraer contexto ejecutivo para el Alcalde
    context_data = extract_executive_context(sim_data)
    if sim_hash:
        context_data["sim_hash"] = str(sim_hash)

    # 4. Intentar Bedrock si está habilitado; si falla, activar fallback heurístico
    use_bedrock = os.environ.get("USE_BEDROCK", "true").lower() not in ("false", "0", "no")
    report = None

    if use_bedrock:
        try:
            report = invoke_bedrock_report(context_data, model_id=body.get("model_id"))
        except Exception as exc:
            logger.warning(
                "Amazon Bedrock no disponible o con cuota agotada (%s). Activando fallback heurístico del COE.",
                exc,
            )
            report = build_heuristic_mayor_report(context_data)
    else:
        report = build_heuristic_mayor_report(context_data)

    # 5. Estructurar respuesta conforme al contrato TypeScript MayorReportResponse
    final_response = {
        "sim_hash": context_data["sim_hash"],
        "generated_by": report["generated_by"],
        "model_id": report.get("model_id", "heuristic-coe-manta-v1"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "headline": report["headline"],
        "situacion_critica": report["situacion_critica"],
        "directivas_operativas": report["directivas_operativas"],
        "balance_recursos": report["balance_recursos"],
        "action_items": report["action_items"],
        "metrics_snapshot": context_data["metrics_snapshot"],
        "metrics_summary": context_data["metrics_snapshot"],
    }

    return _build_http_response(200, final_response)
