/**
 * Indicador muy breve del estado del virus en un día:
 * "Estado del virus: Fuerte · se expande con rapidez".
 * Se calcula con los contagios nuevos recientes (ver src/analysis/virusStatus.ts).
 */
import React from 'react';
import { virusStatus, type VirusLevel } from '../analysis/virusStatus';
import { PixelIcon, type PixelIconName } from './PixelIcon';

const LEVEL_STYLE: Record<VirusLevel, { color: string; icon: PixelIconName }> = {
  outbreak: { color: '#d8d8d8', icon: 'hourglass' },
  strong: { color: '#ff6b5f', icon: 'zombie' },
  stable: { color: '#e2b32a', icon: 'warning' },
  weakening: { color: '#4a8fe7', icon: 'shield' },
  controlled: { color: '#7cc24a', icon: 'check' },
};

interface VirusStatusBadgeProps {
  /** Contagiados acumulados por día de la estrategia mostrada */
  cumulative: number[];
  day: number;
}

export function VirusStatusBadge({ cumulative, day }: VirusStatusBadgeProps) {
  const status = virusStatus(cumulative, day);
  const style = LEVEL_STYLE[status.level];
  return (
    <div
      className="mc-slot-dark inline-flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2"
      role="status"
      aria-live="polite"
      title="La plaga no muta: esto compara los contagios nuevos de los últimos 3 días con los 3 días anteriores."
    >
      <span style={{ color: style.color }}>
        <PixelIcon name={style.icon} size={16} />
      </span>
      <span className="mc-label text-[#d8d8d8]">Estado del virus:</span>
      <span className="font-pixel text-[13px]" style={{ color: style.color, textShadow: '2px 2px 0 #000' }}>
        {status.label}
      </span>
      <span className="text-[18px] text-white">· {status.detail}</span>
    </div>
  );
}
