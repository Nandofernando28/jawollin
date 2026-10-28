/**
 * Hook central de estado — Centro de Control Epidemiológico
 * Gestiona: params, resultado, modo backend, animación del mapa, boletín
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  SimulationParams,
  SimulationResponse,
  MayorReportResponse,
  BackendMode,
} from '../types/simulation';
import { DEFAULT_SIMULATION_PARAMS } from '../types/simulation';
import { runSimulation, generateMayorReport, checkHealth, errorMessage } from '../services/api';

export type SurprisePreset = 'double_beta' | 'half_vaccines' | 'market_outbreak' | 'weak_vaccine';

export interface UseSimulationReturn {
  // Parámetros
  params: SimulationParams;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  // Backend
  backendMode: BackendMode;
  setBackendMode: (m: BackendMode) => void;
  backendHealthy: boolean | null;
  // Simulación
  result: SimulationResponse | null;
  loading: boolean;
  error: string | null;
  execute: (override?: SimulationParams) => Promise<void>;
  applyPreset: (preset: SurprisePreset) => void;
  resetAll: () => void;
  // Mapa temporal
  currentDay: number;
  setCurrentDay: (d: number) => void;
  playing: boolean;
  playbackSpeed: 1 | 2 | 5;
  setPlaybackSpeed: (s: 1 | 2 | 5) => void;
  togglePlay: () => void;
  resetDay: () => void;
  // Boletín del Alcalde
  report: MayorReportResponse | null;
  reportLoading: boolean;
  showReport: boolean;
  openReport: () => Promise<void>;
  closeReport: () => void;
}

export function useSimulation(): UseSimulationReturn {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_SIMULATION_PARAMS);
  const [backendMode, setBackendMode] = useState<BackendMode>('local');
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentDay, setCurrentDay] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);

  const [report, setReport] = useState<MayorReportResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Guard contra re-renders en el intervalo
  const playRef = useRef(playing);
  playRef.current = playing;
  const resultRef = useRef(result);
  resultRef.current = result;

  // Verificar health del backend al arrancar
  useEffect(() => {
    checkHealth(backendMode).then((h) => setBackendHealthy(h.status === 'ok'));
  }, [backendMode]);

  const execute = useCallback(
    async (override?: SimulationParams) => {
      const p = override ?? params;
      setLoading(true);
      setError(null);
      try {
        const data = await runSimulation(p, backendMode);
        setResult(data);
        setCurrentDay(0);
        setPlaying(false);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [params, backendMode],
  );

  // Brotes Sorpresa del reto, iguales a los escenarios documentados en el README y
  // docs/calibracion.md. Se aplican sobre los parámetros actuales, así que se pueden combinar.
  const applyPreset = useCallback(
    (preset: SurprisePreset) => {
      const D = DEFAULT_SIMULATION_PARAMS;
      const changes: Record<SurprisePreset, Partial<SimulationParams>> = {
        double_beta: { beta_day: D.beta_day * 2, beta_night: D.beta_night * 2 },
        half_vaccines: { vaccine_cost: D.vaccine_cost * 2 },
        market_outbreak: { start_hub: 'mercado_central' },
        weak_vaccine: { vaccine_efficacy: 0.5 },
      };
      const next = { ...params, ...changes[preset] };
      setParams(next);
      execute(next);
    },
    [params, execute],
  );

  const resetAll = useCallback(() => {
    setParams(DEFAULT_SIMULATION_PARAMS);
    setCurrentDay(0);
    setPlaying(false);
    execute(DEFAULT_SIMULATION_PARAMS);
  }, [execute]);

  // Animación del mapa
  useEffect(() => {
    if (!playing || !result) return;
    const interval = Math.round(400 / playbackSpeed);
    const timer = setInterval(() => {
      setCurrentDay((d) => {
        const maxDay = resultRef.current?.params.days ?? 30;
        if (d >= maxDay) { setPlaying(false); return d; }
        return d + 1;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [playing, playbackSpeed, result]);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);
  const resetDay = useCallback(() => { setCurrentDay(0); setPlaying(false); }, []);

  const openReport = useCallback(async () => {
    if (!result) return;
    setReportLoading(true);
    try {
      const r = await generateMayorReport(result, backendMode);
      setReport(r);
      setShowReport(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setReportLoading(false);
    }
  }, [result, backendMode]);

  const closeReport = useCallback(() => setShowReport(false), []);

  return {
    params, setParams,
    backendMode, setBackendMode, backendHealthy,
    result, loading, error, execute, applyPreset, resetAll,
    currentDay, setCurrentDay,
    playing, playbackSpeed, setPlaybackSpeed, togglePlay, resetDay,
    report, reportLoading, showReport, openReport, closeReport,
  };
}
