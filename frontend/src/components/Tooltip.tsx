/**
 * Tooltip.tsx — Descripción flotante estilo Minecraft.
 *
 * Referencia oficial de diseño: Rules/Desing_MC.md
 * - §2.3 Paletas por tema: púrpura portal de Realms y fondo casi negro
 * - §5.1 Componentes: cajas de información con borde ortogonal
 * - §7.1 Transiciones y §8 Accesibilidad: etiquetado semántico ARIA (role="tooltip")
 */
import React, { useState, useId } from 'react';
import { PixelIcon } from './PixelIcon';

interface TooltipProps {
  text: string;
  children?: React.ReactNode;
}

export function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex items-center"
      aria-describedby={visible ? id : undefined}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children ?? (
        <span className="cursor-help text-mc-muted hover:text-mc-ink">
          <PixelIcon name="help" size={16} />
        </span>
      )}
      {visible && (
        <span
          id={id}
          role="tooltip"
          className="mc-tooltip pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 w-60 -translate-x-1/2 px-3 py-2"
        >
          {text}
        </span>
      )}
    </span>
  );
}
