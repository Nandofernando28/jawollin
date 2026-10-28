/**
 * Hook central de estado — Centro de Control Epidemiológico
 * Gestiona: params, resultado, modo backend, animación del mapa, boletín
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  SimulationParams,
  SimulationResponse,
  MayorReportResponse,
} from '../types/simulation';
import { DEFAULT_SIMULATION_PARAMS } from '../types/simulation';
import { runSimulation, generateMayorReport, checkHealth, errorMessage } from '../services/api';
import { surprisePresetChanges, type SurprisePreset } from '../data/surprisePresets';

export interface UseSimulationReturn {
  // Parámetros
  params: SimulationParams;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  // Backend (AWS con respaldo local silencioso)
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
    checkHealth().then((h) => setBackendHealthy(h.status === 'ok'));
  }, []);

  const execute = useCallback(
    async (override?: SimulationParams) => {
      const p = override ?? params;
      setLoading(true);
      setError(null);
      try {
        const data = await runSimulation(p);
        setResult(data);
        setCurrentDay(0);
        setPlaying(false);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [params],
  );

  // Aplica un Brote Sorpresa (data/surprisePresets.ts) sobre los parámetros actuales y simula.
  const applyPreset = useCallback(
    (preset: SurprisePreset) => {
      const next = { ...params, ...surprisePresetChanges(preset) };
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
      const r = await generateMayorReport(result);
      setReport(r);
      setShowReport(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setReportLoading(false);
    }
  }, [result]);

  const closeReport = useCallback(() => setShowReport(false), []);

  return {
    params, setParams,
    backendHealthy,
    result, loading, error, execute, applyPreset, resetAll,
    currentDay, setCurrentDay,
    playing, playbackSpeed, setPlaybackSpeed, togglePlay, resetDay,
    report, reportLoading, showReport, openReport, closeReport,
  };
}
