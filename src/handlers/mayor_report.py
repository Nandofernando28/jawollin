"""
Handler AWS Lambda para la generación del Boletín Ejecutivo del Alcalde de Manta.
SpookyThon 2026 · Track B (Operación Cortafuegos Manta).

Fase 4:
- Tarea 1.0: Extracción y síntesis de indicadores estratégicos para el Alcalde.
- Tarea 2.0: Integración opcional con Amazon Bedrock (Converse API / amazon.nova-micro-v1:0).
- Tarea 3.0: Generador Heurístico Estructurado (heuristic-coe-fallback).
- Tarea 4.0: Endpoint POST /mayor-report con manejo resiliente de cuota y CORS.

Regla del boletín: solo dice lo que la simulación hizo. Ningún hub, cifra o
institución aparece si no sale de los resultados del modelo.
"""

import base64
import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from src.engine.graph_manta import HUB_IDS, MANTA_HUBS, MANTA_PARISHES, PARISH_IDS
from src.engine.simulator import DEFAULT_SIMULATION_PARAMS
from src.handlers.orchestrator import get_cached_simulation

logger = logging.getLogger(__name__)

# Mismo factor de escala que usa el frontend (KpiCards): 271 000 / n_nodes
MANTA_POPULATION = 271_000
# Por debajo de esta eficacia la vacuna "cubre a medias" (Brote Sorpresa)
SURPRISE_EFFICACY_THRESHOLD = 0.55
VALID_PRIORITIES = ("CRITICA", "ALTA", "MEDIA")


# ============================================================================
# TAREA 1.0: EXTRACCIÓN Y SÍNTESIS DE INDICADORES ESTRATÉGICOS
# ============================================================================

def _param(params: Dict[str, Any], key: str) -> Any:
    value = params.get(key)
    return DEFAULT_SIMULATION_PARAMS[key] if value is None else value


def _hub_name(hub_id: str) -> str:
    return MANTA_HUBS[hub_id]["name"] if hub_id in MANTA_HUBS else "un punto al azar de la ciudad"


def _most_infected_parish(timeline_none: List[Dict[str, Any]], start_hub: str) -> Tuple[str, int]:
    """
    Parroquia con más personas contagiadas al final del escenario sin intervención
    (población de la parroquia menos los Sanos del último día). Se usa el número de
    personas y no el porcentaje: una parroquia pequeña no debe pasar por la más golpeada.
    """
    if timeline_none:
        last = timeline_none[-1].get("parishes") or {}
        infected = {
            p_id: int(p.get("total_population", 0)) - int(p.get("sanos", 0))
            for p_id, p in last.items() if p_id in MANTA_PARISHES
        }
        if infected:
            best = max(PARISH_IDS, key=lambda p: infected.get(p, -1))
            return best, infected.get(best, 0)
    if start_hub in MANTA_HUBS:
        return MANTA_HUBS[start_hub]["parish"], 0
    return "tarqui", 0


def _busiest_hub(timeline: List[Dict[str, Any]], start_hub: str) -> str:
    """Hub con más casos activos acumulados en la serie; si no hay serie, el del inicio."""
    totals = {h: 0 for h in HUB_IDS}
    for snap in timeline:
        for h_id, h in (snap.get("hubs") or {}).items():
            if h_id in totals:
                totals[h_id] += int(h.get("active_cases", 0))
    if any(totals.values()):
        return max(HUB_IDS, key=lambda h: totals[h])
    return start_hub if start_hub in MANTA_HUBS else "mercado_tarqui"


def _closed_hubs(timeline_shield: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Hubs que el Escudo cerró de verdad en la réplica 0 y en qué días."""
    detail = []
    for h_id in HUB_IDS:
        days = [int(s.get("day", 0)) for s in timeline_shield
                if ((s.get("hubs") or {}).get(h_id) or {}).get("firewall_active")]
        if days:
            detail.append({
                "hub_id": h_id,
                "name": MANTA_HUBS[h_id]["name"],
                "parish_name": MANTA_PARISHES[MANTA_HUBS[h_id]["parish"]]["name"],
                "days_closed": days,
            })
    return detail


def detect_scenario_changes(params: Dict[str, Any]) -> List[str]:
    """
    Describe en lenguaje simple qué condiciones cambiaron frente al escenario base
    (los cambios típicos del Brote Sorpresa). Lista vacía = escenario base.
    """
    d = DEFAULT_SIMULATION_PARAMS
    changes: List[str] = []

    ratio = max(float(_param(params, "beta_day")) / d["beta_day"],
                float(_param(params, "beta_night")) / d["beta_night"])
    if ratio >= 1.2:
        changes.append(f"la plaga contagia {_n(ratio, 1)} veces más que en el escenario base")

    efficacy = float(_param(params, "vaccine_efficacy"))
    if efficacy < SURPRISE_EFFICACY_THRESHOLD:
        changes.append(f"aparece una variante que la vacuna cubre a medias (protege al {efficacy * 100:.0f}% de los vacunados)")
    elif efficacy < d["vaccine_efficacy"] - 0.05:
        changes.append(f"la vacuna protege menos (al {efficacy * 100:.0f}% de los vacunados)")

    vaccine_cost = float(_param(params, "vaccine_cost"))
    if vaccine_cost > d["vaccine_cost"] * 1.1:
        changes.append(f"las vacunas cuestan {vaccine_cost:.0f} $: con el mismo dinero alcanzan para "
                       f"{100 * d['vaccine_cost'] / vaccine_cost:.0f}% de las dosis")

    daily, total = float(_param(params, "daily_budget")), float(_param(params, "total_budget"))
    if daily < d["daily_budget"] * 0.9 or total < d["total_budget"] * 0.9:
        changes.append(f"el presupuesto baja a {_n(daily)} $ por día y {_n(total)} $ en total")

    start_hub = str(_param(params, "start_hub"))
    if start_hub != d["start_hub"]:
        changes.append(f"el brote empieza en {_hub_name(start_hub)}")

    initial = int(_param(params, "initial_infected"))
    if initial > d["initial_infected"]:
        changes.append(f"el brote empieza con {initial} casos en lugar de {d['initial_infected']}")
    return changes


def extract_executive_context(sim_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extrae y sintetiza las métricas clave de la simulación para construir
    el Boletín Ejecutivo del COE Cantonal de Manta.

    Acepta un diccionario de simulación completo (SimulationResponse) o
    un diccionario con parámetros y KPIs agregados.

    Todo lo que devuelve sale de la simulación: parroquia con más contagios,
    hubs realmente cerrados, reparto real del gasto y cambios del escenario.
    """
    params = sim_data.get("params") or {}
    kpis = sim_data.get("summary_kpis") or {}
    spatial_timelines = sim_data.get("spatial_timelines") or sim_data.get("spatial") or {}
    sim_hash = str(sim_data.get("sim_hash") or params.get("sim_hash") or "cf-manta-sim")

    total_pop = int(kpis.get("total_population") or _param(params, "n_nodes"))
    scale = MANTA_POPULATION / max(total_pop, 1)
    start_hub = str(_param(params, "start_hub"))
    timeline_none = spatial_timelines.get("none") or []
    timeline_shield = spatial_timelines.get("shield") or []

    # 1. Contagios evitados y reducción del pico
    lives_saved_none = round(float(kpis.get("lives_saved_vs_none", 0.0)), 2)
    lives_saved_random = round(float(kpis.get("lives_saved_vs_random", 0.0)), 2)
    infected_none = round(float(kpis.get("total_infected_none", 0.0)), 1)

    # 2. Parroquia con más contagios sin intervención
    parish_id, parish_infected = _most_infected_parish(timeline_none, start_hub)
    parish_name = MANTA_PARISHES[parish_id]["name"]

    # 3. Hubs: solo los que el Escudo cerró de verdad
    hubs_detail = _closed_hubs(timeline_shield)
    hub_days_closed = round(float(kpis.get("total_hub_days_closed", 0.0)), 1)
    watch_hub = _busiest_hub(timeline_shield or timeline_none, start_hub)

    # 4. Reparto real del gasto entre las tres defensas
    total_vaccines = round(float(kpis.get("total_vaccines_used", 0.0)), 1)
    total_brigades = round(float(kpis.get("total_brigades_used", 0.0)), 1)
    spend = {
        "vaccine": total_vaccines * float(_param(params, "vaccine_cost")),
        "brigade": total_brigades * float(_param(params, "brigade_cost")),
        "hub": hub_days_closed * float(_param(params, "hub_closure_cost")),
    }
    spend_total = sum(spend.values())
    spend_share = {k: round(100 * v / spend_total, 1) if spend_total > 0 else 0.0 for k, v in spend.items()}

    total_spent = round(float(kpis.get("total_budget_spent", 0.0)), 2)
    cost_per_life = round(float(kpis.get("cost_per_life_saved_vs_random", 0.0)), 2) if lives_saved_random > 0 else 0.0
    efficacy = float(_param(params, "vaccine_efficacy"))
    changes = detect_scenario_changes(params)

    # Contrato exacto para el frontend React (MayorReportResponse.metrics_snapshot)
    metrics_snapshot = {
        "lives_saved_vs_random": lives_saved_random,
        "peak_reduction_pct": round(float(kpis.get("peak_reduction_vs_none_pct", 0.0)), 1),
        "budget_spent_usd": total_spent,
        "cost_per_life_saved_usd": cost_per_life,
        "most_critical_parish": parish_name,
        "critical_hubs_intervened": [h["name"] for h in hubs_detail],
    }

    return {
        "sim_hash": sim_hash,
        "seed": _param(params, "seed"),
        "monte_carlo_runs": _param(params, "monte_carlo_runs"),
        "days": _param(params, "days"),
        "total_population": total_pop,
        "scale_factor": scale,
        "total_infected_none": infected_none,
        "total_infected_none_pct": round(100 * infected_none / max(total_pop, 1), 1),
        "lives_saved_vs_none": lives_saved_none,
        "lives_saved_vs_none_pct": round(float(kpis.get("lives_saved_vs_none_pct", 0.0)), 1),
        "lives_saved_vs_random": lives_saved_random,
        "lives_saved_vs_random_pct": round(float(kpis.get("lives_saved_vs_random_pct", 0.0)), 1),
        "peak_reduction_vs_none_pct": metrics_snapshot["peak_reduction_pct"],
        "most_critical_parish_id": parish_id,
        "most_critical_parish": parish_name,
        "most_critical_parish_infected": parish_infected,
        "critical_hubs_intervened": metrics_snapshot["critical_hubs_intervened"],
        "hubs_detail": hubs_detail,
        "watch_hub_name": MANTA_HUBS[watch_hub]["name"],
        "total_vaccines_used": total_vaccines,
        "wasted_vaccines": int(kpis.get("wasted_vaccines_count", 0)),
        "total_brigades_used": total_brigades,
        "total_hub_days_closed": hub_days_closed,
        "spend_share_pct": spend_share,
        "budget_spent_usd": total_spent,
        "total_budget_usd": float(_param(params, "total_budget")),
        "daily_budget_usd": float(_param(params, "daily_budget")),
        "remaining_budget_usd": round(float(kpis.get("remaining_budget", 0.0)), 2),
        "hub_closure_cost_usd": float(_param(params, "hub_closure_cost")),
        "cost_per_life_saved_usd": cost_per_life,
        "start_hub": start_hub,
        "start_hub_name": _hub_name(start_hub),
        "vaccine_efficacy": efficacy,
        "scenario_changes": changes,
        "is_surprise_outbreak": bool(changes),
        "metrics_snapshot": metrics_snapshot,
    }


# ============================================================================
# TAREA 2.0: INTEGRACIÓN OPCIONAL CON AMAZON BEDROCK (CONVERSE API)
# ============================================================================

DEFAULT_BEDROCK_MODEL_ID = "amazon.nova-micro-v1:0"
_BEDROCK_CLIENT = None


def _get_bedrock_client():
    """
    Cliente con timeouts cortos: si Bedrock tarda, se cae al boletín heurístico
    mucho antes de que la Lambda (25 s) corte la respuesta.
    """
    global _BEDROCK_CLIENT
    if _BEDROCK_CLIENT is None:
        import boto3
        from botocore.config import Config

        region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "us-east-1"
        _BEDROCK_CLIENT = boto3.client(
            "bedrock-runtime",
            region_name=region,
            config=Config(connect_timeout=3, read_timeout=8, retries={"max_attempts": 1}),
        )
    return _BEDROCK_CLIENT


def build_bedrock_prompts(ctx: Dict[str, Any]) -> Tuple[str, str]:
    """
    Construye el prompt de sistema y de usuario en español ejecutivo para el
    Alcalde de Manta y el COE Cantonal, exigiendo exactamente 3 secciones y JSON válido.
    """
    system_prompt = (
        "Eres el asesor epidemiológico del Comité de Operaciones de Emergencia (COE Cantonal) "
        "de Manta, Ecuador. Redactas para el Alcalde una propuesta de decreto en lenguaje simple, "
        "sin tecnicismos (no menciones SEIR, R0 ni grafos).\n"
        "REGLAS ESTRICTAS:\n"
        "- Usa solo los datos que te doy. No inventes cifras, hospitales, instituciones ni números de decreto.\n"
        "- Si los días de cierre de hubs son 0, NO recomiendes cerrar hubs: recomienda vigilarlos.\n"
        "- Las cifras son de una muestra a escala; usa las equivalencias para Manta que te doy.\n"
        "Responde EXCLUSIVAMENTE con un objeto JSON válido con esta estructura:\n"
        "{\n"
        '  "headline": "Titular de la propuesta de decreto",\n'
        '  "situacion_critica": "Qué pasaría sin actuar y dónde golpea más el brote.",\n'
        '  "directivas_operativas": "Qué hacer, dónde y cuándo, en el orden del gasto real.",\n'
        '  "balance_recursos": "Contagios evitados, gasto y comparación con actuar al azar.",\n'
        '  "action_items": [\n'
        '    {"title": "Acción breve", "description": "Detalle operativo", "priority": "CRITICA|ALTA|MEDIA", "parish_or_hub": "Lugar"}\n'
        "  ]\n"
        "}"
    )

    share = ctx["spend_share_pct"]
    closed = ", ".join(
        f"{h['name']} (días {', '.join(map(str, h['days_closed']))})" for h in ctx["hubs_detail"]
    ) or "ninguno"
    changes = "; ".join(ctx["scenario_changes"]) or "ninguno (escenario base)"

    user_prompt = (
        "Datos de la simulación:\n"
        f"- Muestra: {ctx['total_population']:,} personas que representan a los {MANTA_POPULATION:,} habitantes de Manta "
        f"(cada persona de la muestra equivale a {ctx['scale_factor']:.0f} habitantes).\n"
        f"- Sin intervenir se contagiaría el {ctx['total_infected_none_pct']}% de la población.\n"
        f"- Parroquia con más contagios sin intervenir: {ctx['most_critical_parish']}. El brote empieza en {ctx['start_hub_name']}.\n"
        f"- Contagios evitados frente a no hacer nada: {ctx['lives_saved_vs_none']:,.0f} en la muestra "
        f"(unos {ctx['lives_saved_vs_none'] * ctx['scale_factor']:,.0f} habitantes de Manta).\n"
        f"- Contagios evitados frente a gastar lo mismo al azar: {ctx['lives_saved_vs_random']:,.0f} en la muestra "
        f"(unos {ctx['lives_saved_vs_random'] * ctx['scale_factor']:,.0f} habitantes).\n"
        f"- Reducción del pico de casos activos: {ctx['peak_reduction_vs_none_pct']}%.\n"
        f"- Gasto: {ctx['budget_spent_usd']:,.2f} $ de {ctx['total_budget_usd']:,.0f} $ "
        f"({share['vaccine']}% vacunas, {share['brigade']}% brigadas, {share['hub']}% cierres de hubs).\n"
        f"- Vacunas aplicadas: {ctx['total_vaccines_used']:,.0f} (desperdiciadas: {ctx['wasted_vaccines']}).\n"
        f"- Brigadas de aislamiento: {ctx['total_brigades_used']:,.0f}.\n"
        f"- Días de cierre de hubs (promedio): {ctx['total_hub_days_closed']}. Hubs cerrados: {closed}. "
        f"Hub con más casos activos: {ctx['watch_hub_name']}.\n"
        f"- Cambios del escenario (Brote Sorpresa): {changes}.\n\n"
        "Genera ÚNICAMENTE el JSON solicitado sin texto introductorio ni explicaciones adicionales."
    )
    return system_prompt, user_prompt


def _validate_llm_report(report: Any) -> Dict[str, Any]:
    """Comprueba la respuesta del modelo; si no cumple el contrato, se usa el heurístico."""
    if not isinstance(report, dict):
        raise ValueError("La respuesta del modelo no es un objeto JSON")
    for key in ("headline", "situacion_critica", "directivas_operativas", "balance_recursos"):
        if not isinstance(report.get(key), str) or not report[key].strip():
            raise ValueError(f"Falta la sección '{key}' en la respuesta del modelo")
    items = report.get("action_items")
    if not isinstance(items, list) or not items:
        raise ValueError("La respuesta del modelo no trae action_items")
    clean = []
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("action_item con formato inválido")
        priority = str(item.get("priority", "")).upper().replace("Í", "I")
        if priority not in VALID_PRIORITIES or not all(str(item.get(k, "")).strip()
                                                         for k in ("title", "description", "parish_or_hub")):
            raise ValueError("action_item incompleto o con prioridad inválida")
        clean.append({"title": str(item["title"]), "description": str(item["description"]),
                      "priority": priority, "parish_or_hub": str(item["parish_or_hub"])})
    return {**report, "action_items": clean}


def invoke_bedrock_report(
    context_data: Dict[str, Any], model_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Invoca Amazon Bedrock con la Converse API para redactar el Boletín del Alcalde.
    Cualquier error (sin acceso al modelo, cuota, timeout o JSON inválido) se propaga
    para que el handler use el boletín heurístico.
    """
    resolved_model = (
        model_id
        or os.environ.get("BEDROCK_MODEL_ID")
        or DEFAULT_BEDROCK_MODEL_ID
    ).strip()

    system_prompt, user_prompt = build_bedrock_prompts(context_data)
    response = _get_bedrock_client().converse(
        modelId=resolved_model,
        messages=[{"role": "user", "content": [{"text": user_prompt}]}],
        system=[{"text": system_prompt}],
        inferenceConfig={"maxTokens": 700, "temperature": 0.2},
    )
    content_list = response.get("output", {}).get("message", {}).get("content", [])
    raw_text = content_list[0].get("text", "") if content_list else ""
    if not raw_text:
        raise ValueError(f"Respuesta vacía desde Amazon Bedrock ({resolved_model})")

    # Limpiar posibles bloques markdown ```json ... ```
    cleaned = raw_text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
    if match:
        cleaned = match.group(1).strip()
    report_dict = _validate_llm_report(json.loads(cleaned))

    generated_by = (
        "amazon-bedrock-claude-haiku"
        if "haiku" in resolved_model.lower()
        else "amazon-bedrock-nova-micro"
    )
    return {
        "headline": report_dict["headline"],
        "situacion_critica": report_dict["situacion_critica"],
        "directivas_operativas": report_dict["directivas_operativas"],
        "balance_recursos": report_dict["balance_recursos"],
        "action_items": report_dict["action_items"],
        "generated_by": generated_by,
        "model_id": resolved_model,
    }


# ============================================================================
# TAREA 3.0: GENERADOR HEURÍSTICO ESTRUCTURADO
# ============================================================================

def _n(value: float, decimals: int = 0) -> str:
    """Número en formato del README: miles con espacio y decimales con coma (1 200; 70,2)."""
    return f"{value:,.{decimals}f}".replace(",", " ").replace(".", ",")


def _people(sample_count: float, scale: float, noun: str = "personas") -> str:
    """Cifra de la muestra y su equivalente aproximado en habitantes de Manta."""
    return f"**{_n(sample_count)} {noun}** en la muestra (unos **{_n(sample_count * scale)} habitantes** de Manta)"


def build_heuristic_mayor_report(context_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Genera el Boletín del Alcalde de forma determinista a partir de los resultados:
    misma simulación, mismo boletín. Las acciones se ordenan según el dinero que
    el Escudo puso en cada defensa, y los hubs solo se mencionan como cerrados si
    la simulación los cerró.
    """
    ctx = context_data
    scale = ctx["scale_factor"]
    parish = ctx["most_critical_parish"]
    share = ctx["spend_share_pct"]
    changes = ctx["scenario_changes"]
    hub_days = ctx["total_hub_days_closed"]
    closed_names = [h["name"] for h in ctx["hubs_detail"]]
    hub_place = ", ".join(closed_names) if closed_names else ctx["watch_hub_name"]
    # Si la réplica 0 no cerró hubs pero otras sí, se nombra el hub con más casos sin decir que se cerró
    hub_where = f"**{hub_place}**" if closed_names else f"el hub con más casos activos (**{hub_place}**)"

    # 1. Titular
    headline = (
        "PROPUESTA DE DECRETO DEL COE CANTONAL DE MANTA: RESPUESTA AL BROTE SORPRESA"
        if changes else
        "PROPUESTA DE DECRETO DEL COE CANTONAL DE MANTA: OPERACIÓN CORTAFUEGOS"
    )

    # 2. Situación crítica
    situacion_lines = [
        "### 1. Situación del brote",
        f"Sin ninguna intervención, la simulación proyecta que se contagiaría el **{_n(ctx['total_infected_none_pct'], 1)}% "
        f"de la población**: {_people(ctx['total_infected_none'], scale)}. El brote empieza en **{ctx['start_hub_name']}** "
        f"y la parroquia con más contagios sería **{parish}**.",
        f"Con el plan Escudo Manta se evitan {_people(ctx['lives_saved_vs_none'], scale, 'contagios')}.",
    ]
    if changes:
        situacion_lines.append("**Condiciones del Brote Sorpresa:** " + "; ".join(changes) + ".")
    situacion_lines.append(
        f"*Cifras promedio de {ctx['monte_carlo_runs']} simulaciones de {ctx['days']} días con la semilla {ctx['seed']}. "
        f"La muestra de {_n(ctx['total_population'])} personas representa a Manta a escala.*"
    )
    situacion_critica = "\n\n".join(situacion_lines)

    # 3. Directivas: en el orden del gasto real del Escudo
    directives = {
        "vaccine": (
            f"- **Vacunación en anillo y puentes ({_n(share['vaccine'], 1)}% del gasto):** aplicar unas "
            f"**{_n(ctx['total_vaccines_used'])} dosis** a personas sanas que rodean a los casos detectados y a "
            f"quienes conectan barrios (transportistas y comerciantes). Nunca se vacuna a quien ya está contagiado "
            f"o es inmune: **{ctx['wasted_vaccines']} dosis desperdiciadas**."
        ),
        "brigade": (
            f"- **Brigadas de aislamiento ({_n(share['brigade'], 1)}% del gasto):** enviar unas "
            f"**{_n(ctx['total_brigades_used'])} brigadas** a aislar a los casos detectados que más contactos sanos "
            f"tienen, empezando por **{parish}**."
        ),
        "hub": (
            f"- **Cierre o fumigación de hubs ({_n(share['hub'], 1)}% del gasto):** {_n(hub_days, 1)} días de cierre en "
            f"promedio, en {hub_where}."
            if hub_days > 0 else
            f"- **Cierre de hubs: no recomendado por ahora.** Cerrar un hub cuesta "
            f"{_n(ctx['hub_closure_cost_usd'])} $ por día y solo protege ese día; con este brote rinden más las "
            f"vacunas y las brigadas. Mantener vigilancia en **{ctx['watch_hub_name']}**."
        ),
    }
    order = sorted(directives, key=lambda k: -share[k])
    directivas_lines = [
        "### 2. Qué hacer, dónde y cuándo",
        f"El presupuesto llega cada día ({_n(ctx['daily_budget_usd'])} $) y el plan se recalcula cada día con los "
        "casos detectados. Prioridades, de mayor a menor gasto:",
        *[directives[k] for k in order],
    ]
    if changes:
        directivas_lines.append(
            f"**Cómo se adaptó el plan:** con estas condiciones el dinero se reparte en {_n(share['vaccine'], 1)}% vacunas, "
            f"{_n(share['brigade'], 1)}% brigadas y {_n(share['hub'], 1)}% cierres de hubs. El plan no tiene reglas fijas: "
            "cada día compra la acción que más contagios evita por dólar."
        )
    directivas_operativas = "\n\n".join(directivas_lines)

    # 4. Balance de recursos
    balance_lines = [
        "### 3. Balance de recursos",
        f"- **Contagios evitados frente a no hacer nada:** {_people(ctx['lives_saved_vs_none'], scale, 'contagios')} "
        f"({_n(ctx['lives_saved_vs_none_pct'], 1)}% menos).",
        f"- **Contagios evitados frente a gastar lo mismo al azar:** "
        f"{_people(ctx['lives_saved_vs_random'], scale, 'contagios')} ({_n(ctx['lives_saved_vs_random_pct'], 1)}% menos).",
        f"- **Pico de casos activos:** {_n(ctx['peak_reduction_vs_none_pct'], 1)}% más bajo que sin intervención.",
        f"- **Gasto:** {_n(ctx['budget_spent_usd'])} $ de {_n(ctx['total_budget_usd'])} $ disponibles "
        f"({_n(ctx['remaining_budget_usd'])} $ sin usar).",
    ]
    if ctx["lives_saved_vs_random"] > 0:
        balance_lines.append(
            f"- **Costo por contagio evitado frente al azar:** unos {_n(ctx['cost_per_life_saved_usd'])} $ "
            "por cada persona de la muestra."
        )
    else:
        balance_lines.append(
            "- **Atención:** con estas condiciones el plan no mejora a gastar el dinero al azar; "
            "conviene revisar los recursos disponibles."
        )
    balance_recursos = "\n\n".join(balance_lines)

    # 5. Tres acciones inmediatas, priorizadas por el gasto real
    items = {
        "vaccine": {
            "title": "Vacunación en anillo y puentes",
            "description": f"Unas {_n(ctx['total_vaccines_used'])} dosis a contactos sanos de casos detectados y a "
                           "transportistas y comerciantes.",
            "parish_or_hub": parish,
        },
        "brigade": {
            "title": "Brigadas de aislamiento",
            "description": f"Unas {_n(ctx['total_brigades_used'])} brigadas para aislar a los casos detectados "
                           "con más contactos sanos.",
            "parish_or_hub": parish,
        },
        "hub": {
            "title": "Cierre o fumigación de hubs" if hub_days > 0 else "Vigilancia del hub con más casos",
            "description": (f"{_n(hub_days, 1)} días de cierre en promedio." if hub_days > 0
                            else "Sin cierre: vigilar y reportar casos a diario."),
            "parish_or_hub": hub_place,
        },
    }
    action_items = [{**items[k], "priority": VALID_PRIORITIES[i]} for i, k in enumerate(order)]

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


def _bedrock_enabled() -> bool:
    """Bedrock es opcional y está apagado por defecto (cuentas nuevas sin acceso o sin cuota)."""
    return os.environ.get("USE_BEDROCK", "false").strip().lower() in ("true", "1", "yes", "si", "sí")


def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    """
    Handler para POST /mayor-report y OPTIONS /mayor-report.

    Acepta en el body JSON:
    - 'simulation': Diccionario completo con resultados de la simulación.
    - 'sim_hash': Hash SHA-256 para recuperar la simulación desde DynamoDB/memoria.
    - Campos en la raíz ('params', 'summary_kpis', etc.).
    - Opcional 'model_id' para personalizar el modelo de Amazon Bedrock.

    Con USE_BEDROCK=true intenta Bedrock; si falla (sin acceso, cuota, timeout o
    respuesta inválida) o está apagado, responde con el boletín heurístico.
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
    # 'simulation_result' se acepta como alias: fue el nombre usado por el primer cliente frontend.
    sim_data = body.get("simulation") or body.get("simulation_result")
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

    try:
        # 3. Extraer contexto ejecutivo para el Alcalde
        context_data = extract_executive_context(sim_data)
        if sim_hash:
            context_data["sim_hash"] = str(sim_hash)

        # 4. Bedrock opcional; ante cualquier fallo, boletín heurístico
        report = None
        if _bedrock_enabled():
            try:
                report = invoke_bedrock_report(context_data, model_id=body.get("model_id"))
            except Exception as exc:
                logger.warning(
                    "Amazon Bedrock no disponible (%s). Se usa el boletín heurístico del COE.", exc
                )
        if report is None:
            report = build_heuristic_mayor_report(context_data)
    except Exception as exc:
        logger.exception("Datos de simulación no válidos para el boletín")
        return _build_http_response(400, {"error": "simulacion_invalida", "message": str(exc)})

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
