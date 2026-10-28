/**
 * FASE 6 — Servicio API: AWS con respaldo local silencioso
 * ========================================================
 * Siempre se usa AWS (API Gateway en us-east-1, VITE_API_URL). Si AWS no está
 * configurado o no responde, se usa en silencio el servidor local
 * (python src/local_server.py, puerto 8000). Si ninguno responde, la llamada falla
 * y la UI muestra el error en lugar de inventar resultados.
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
// En desarrollo Vite, '/api' se redirige al servidor local (ver vite.config.ts)
const LOCAL_API_URL = import.meta.env.DEV ? '/api' : 'http://localhost:8000';

/** Backends en orden de preferencia: AWS primero (si está configurado) y el local de respaldo. */
const BACKENDS: { mode: BackendMode; url: string }[] = [
  ...(AWS_API_URL ? [{ mode: 'aws' as const, url: AWS_API_URL }] : []),
  { mode: 'local', url: LOCAL_API_URL },
];

const baseUrl = (mode: BackendMode) => BACKENDS.find((b) => b.mode === mode)?.url ?? LOCAL_API_URL;

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

/**
 * Prueba cada backend en orden (AWS y, si falla, el local) y devuelve la primera
 * respuesta válida junto con el backend que respondió.
 */
async function firstAvailable<T>(request: (url: string) => Promise<T>): Promise<{ data: T; mode: BackendMode }> {
  let lastError: unknown = null;
  for (const backend of BACKENDS) {
    try {
      return { data: await request(backend.url), mode: backend.mode };
    } catch (err) {
      console.warn(`[api] Backend '${backend.mode}' no disponible, se prueba el siguiente:`, err);
      lastError = err;
    }
  }
  throw lastError;
}

/** Ejecuta la simulación Monte Carlo (AWS y, si falla, el servidor local). */
export async function runSimulation(params: SimulationParams): Promise<SimulationResponse> {
  try {
    // 35 s: API Gateway corta a los 30 s, así que más espera no sirve
    const { data, mode } = await firstAvailable((url) => postJson<SimulationResponse>(`${url}/simulate`, params, 35000));
    return { ...data, backend_mode: mode };
  } catch (err) {
    throw new Error(`No se pudo conectar con el backend de simulación (${errorMessage(err)}).`);
  }
}

/**
 * Pide el Boletín para el Alcalde al mismo backend que calculó la simulación
 * (así puede encontrarla en su caché por sim_hash).
 */
export async function generateMayorReport(simulationResult: SimulationResponse): Promise<MayorReportResponse> {
  try {
    // El handler del backend lee `simulation` (o `sim_hash` para buscarlo en caché).
    return await postJson<MayorReportResponse>(
      `${baseUrl(simulationResult.backend_mode)}/mayor-report`,
      { simulation: simulationResult, sim_hash: simulationResult.sim_hash },
      30000,
    );
  } catch (err) {
    throw new Error(`No se pudo generar el informe para el alcalde (${errorMessage(err)}).`);
  }
}

/** Estado del backend: AWS y, si no responde, el local. */
export async function checkHealth(): Promise<HealthCheckResponse> {
  try {
    const { data } = await firstAvailable(async (url) => {
      const res = await fetchWithTimeout(`${url}/health`, { method: 'GET' }, 4000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as HealthCheckResponse;
    });
    return data;
  } catch {
    return {
      status: 'degraded',
      backend_mode: BACKENDS[0].mode,
      execution_mode: BACKENDS[0].mode === 'aws' ? 'aws-serverless' : 'local-hybrid',
      dynamodb_connected: false,
      s3_connected: false,
      step_functions_connected: false,
      bedrock_available: false,
      timestamp: new Date().toISOString(),
    };
  }
}
