/**
 * Brotes Sorpresa del reto: única definición, usada por la consola y por la pantalla
 * de parámetros. Los valores son los escenarios documentados en docs/calibracion.md
 * ("Verificación 2: Brote Sorpresa"); tests/test_frontend_contract.py comprueba que
 * coincidan. Cada preset se aplica sobre los parámetros actuales, así que se combinan.
 */
import type { SimulationParams } from '../types/simulation';

export type SurprisePreset = 'double_beta' | 'half_vaccines' | 'market_outbreak' | 'weak_vaccine';

export interface SurprisePresetDef {
  id: SurprisePreset;
  icon: string;
  label: string;
  description: string;
  changes: Partial<SimulationParams>;
}

export const SURPRISE_PRESETS: SurprisePresetDef[] = [
  {
    id: 'double_beta',
    icon: '⚡',
    label: 'Contagio ×2',
    description: 'El doble de contagiosa: β día 0,10 y β noche 0,14 (el doble de los valores base)',
    changes: { beta_day: 0.1, beta_night: 0.14 },
  },
  {
    id: 'half_vaccines',
    icon: '💉',
    label: 'Mitad de vacunas',
    description: 'Cada dosis cuesta el doble (30 $): con el mismo dinero alcanza la mitad',
    changes: { vaccine_cost: 30 },
  },
  {
    id: 'market_outbreak',
    icon: '📍',
    label: 'Brote en Mercado Central',
    description: 'El brote empieza en el Mercado Central de Manta',
    changes: { start_hub: 'mercado_central' },
  },
  {
    id: 'weak_vaccine',
    icon: '🧬',
    label: 'Vacuna a medias',
    description: 'Variante que la vacuna cubre a medias: eficacia 50%',
    changes: { vaccine_efficacy: 0.5 },
  },
];

export function surprisePresetChanges(id: SurprisePreset): Partial<SimulationParams> {
  return SURPRISE_PRESETS.find((p) => p.id === id)!.changes;
}
