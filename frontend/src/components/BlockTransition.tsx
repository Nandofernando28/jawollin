/**
 * Transición de bloques: la pantalla se cubre de bloques de piedra que aparecen
 * en orden pseudoaleatorio (siempre el mismo) y, cuando está cubierta, se llama a
 * `onCovered` para cambiar de pantalla; después los bloques desaparecen.
 * Con "reducir movimiento" activado, el cambio es inmediato.
 */
import React, { useEffect, useMemo } from 'react';

const COLS = 12;
const ROWS = 8;
const COVER_MS = 520;

interface BlockTransitionProps {
  onCovered: () => void;
  onDone: () => void;
}

export function BlockTransition({ onCovered, onDone }: BlockTransitionProps) {
  // Retraso de cada bloque: patrón fijo para que la animación sea siempre igual
  const delays = useMemo(
    () => Array.from({ length: COLS * ROWS }, (_, i) => ((i * 37) % (COLS * ROWS)) / (COLS * ROWS)),
    [],
  );

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      onCovered();
      onDone();
      return;
    }
    const covered = window.setTimeout(onCovered, COVER_MS);
    const done = window.setTimeout(onDone, COVER_MS * 2 + 80);
    return () => {
      window.clearTimeout(covered);
      window.clearTimeout(done);
    };
  }, [onCovered, onDone]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100] grid"
      style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}
      aria-hidden="true"
    >
      {delays.map((d, i) => (
        <span
          key={i}
          className="mc-transition-block"
          style={{ animationDelay: `${Math.round(d * (COVER_MS - 160))}ms, ${COVER_MS + Math.round(d * (COVER_MS - 160))}ms` }}
        />
      ))}
    </div>
  );
}
