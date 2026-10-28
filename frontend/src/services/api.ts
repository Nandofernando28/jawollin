/**
 * FASE 6 — Servicio API con Switch Híbrido AWS ↔ Local
 * =====================================================
 * Switch selector:  'aws'   → API Gateway (us-east-1)
 *                   'local' → http://localhost:8000
 *
 * Todos los datos vienen del backend (motor SEIR y boletín del COE). Si el modo
 * AWS no responde se intenta el servidor local; si ninguno responde, la llamada
 * falla y la UI muestra el error en lugar de inventar resultados.
 *
 * SpookyThon 2026 · Track B — Operación Cortafuegos Manta
 */

import type {
  SimulationParams,
  SimulationResponse,
  BackendMode,
  HealthCheckResponse,
  MayorReportResponse,
} from '../types/simulation';

// ============================================================================
// Configuración de endpoints
// ============================================================================

// Acepta VITE_API_URL (documentada en .env.example) y VITE_AWS_API_URL (nombre antiguo).
const AWS_API_URL = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_AWS_API_URL ?? '').replace(/\/$/, '');
const LOCAL_API_URL = 'http://localhost:8000';

function getBaseUrl(mode: BackendMode): string {
  if (mode === 'aws' && AWS_API_URL) return AWS_API_URL;
  // En desarrollo Vite, '/api' se proxy-ea a localhost:8000
  return import.meta.env.DEV ? '/api' : LOCAL_API_URL;
}

/** Texto legible de un error, sin el prefijo "Error:" que añade String(err). */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// ============================================================================
// Cliente HTTP genérico con timeout
// ============================================================================

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 8000,
): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

async function postJson<T>(url: string, body: unknown, timeoutMs: number): Promise<T> {
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

// ============================================================================
// API pública
// ============================================================================

/** Ejecuta la simulación Monte Carlo contra el backend activo (AWS y, si falla, el servidor local). */
export async function runSimulation(
  params: SimulationParams,
  mode: BackendMode,
): Promise<SimulationResponse> {
  const attempts: BackendMode[] = mode === 'aws' ? ['aws', 'local'] : ['local'];
  let lastError: unknown = null;
  for (const attempt of attempts) {
    if (attempt === 'aws' && !AWS_API_URL) continue;
    try {
      const data = await postJson<SimulationResponse>(`${getBaseUrl(attempt)}/simulate`, params, 60000);
      return { ...data, backend_mode: attempt };
    } catch (err) {
      console.warn(`[api] Backend '${attempt}' no disponible:`, err);
      lastError = err;
    }
  }
  throw new Error(`No se pudo conectar con el backend de simulación (${errorMessage(lastError)}).`);
}

/** Pide al backend el Boletín para el Alcalde (heurístico del COE o Amazon Bedrock si está activo). */
export async function generateMayorReport(
  simulationResult: SimulationResponse,
  mode: BackendMode,
): Promise<MayorReportResponse> {
  try {
    // El handler del backend lee `simulation` (o `sim_hash` para buscarlo en caché).
    return await postJson<MayorReportResponse>(
      `${getBaseUrl(simulationResult.backend_mode ?? mode)}/mayor-report`,
      { simulation: simulationResult, sim_hash: simulationResult.sim_hash },
      30000,
    );
  } catch (err) {
    throw new Error(`No se pudo generar el informe para el alcalde (${errorMessage(err)}).`);
  }
}

/** Verifica el estado de salud del backend */
export async function checkHealth(mode: BackendMode): Promise<HealthCheckResponse> {
  const base = getBaseUrl(mode);
  try {
    const res = await fetchWithTimeout(`${base}/health`, { method: 'GET' }, 4000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HealthCheckResponse;
  } catch {
    return {
      status: 'degraded',
      backend_mode: mode,
      dynamodb_connected: false,
      s3_connected: false,
      step_functions_connected: false,
      bedrock_available: false,
      timestamp: new Date().toISOString(),
    };
  }
}
