/**
 * Efectos de sonido de la interfaz con elementos <audio> de HTML5.
 *
 * Los archivos de public/sounds/ son originales, sintetizados por
 * scripts/generar_sonidos.py. Solo es interfaz: no participa en la simulación.
 *
 * Los navegadores bloquean el sonido hasta que la persona interactúa con la
 * página, así que todo se reproduce a partir del primer clic o tecla
 * (`unlocked`). El botón de silencio se recuerda en el navegador.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export type SoundName = 'ambient' | 'thunder' | 'eat' | 'click' | 'chime';

const SOURCES: Record<SoundName, { src: string; volume: number; loop?: boolean }> = {
  ambient: { src: '/sounds/noche_grillos.wav', volume: 0.4, loop: true }, // grillos y viento
  thunder: { src: '/sounds/trueno.wav', volume: 0.9 }, // el rayo de la incursión
  eat: { src: '/sounds/comer_manzana.wav', volume: 0.7 }, // al terminar la carga
  click: { src: '/sounds/clic_madera.wav', volume: 0.55 }, // todos los botones
  chime: { src: '/sounds/brillo.wav', volume: 0.6 }, // lanzar la simulación
};

const MUTE_KEY = 'cortafuegos-sonido-silenciado';

interface SoundContextValue {
  play: (name: SoundName) => void;
  startAmbient: () => void;
  stopAmbient: () => void;
  muted: boolean;
  toggleMuted: () => void;
  /** true después de la primera interacción: ya se puede reproducir sonido */
  unlocked: boolean;
}

const SoundContext = createContext<SoundContextValue | null>(null);

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const refs = useRef<Partial<Record<SoundName, HTMLAudioElement | null>>>({});
  const [muted, setMuted] = useState(readMuted);
  const [unlocked, setUnlocked] = useState(false);
  const ambientWanted = useRef(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const play = useCallback((name: SoundName) => {
    const el = refs.current[name];
    if (!el || mutedRef.current) return;
    el.currentTime = 0;
    el.play().catch(() => undefined); // si el navegador aún lo bloquea, se ignora
  }, []);

  const startAmbient = useCallback(() => {
    ambientWanted.current = true;
    const el = refs.current.ambient;
    if (!el || mutedRef.current) return;
    el.play().catch(() => undefined);
  }, []);

  const stopAmbient = useCallback(() => {
    ambientWanted.current = false;
    refs.current.ambient?.pause();
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      try {
        window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      } catch {
        /* sin almacenamiento: el silencio dura solo esta visita */
      }
      const ambient = refs.current.ambient;
      if (ambient) {
        if (next) ambient.pause();
        else if (ambientWanted.current) ambient.play().catch(() => undefined);
      }
      return next;
    });
  }, []);

  // Primer clic o tecla: desbloquea el audio y arranca el ambiente si se había pedido
  useEffect(() => {
    if (unlocked) return;
    const unlock = () => {
      setUnlocked(true);
      if (ambientWanted.current && !mutedRef.current) refs.current.ambient?.play().catch(() => undefined);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [unlocked]);

  // Clic de madera en TODOS los botones de la interfaz (y los de zoom del mapa), sin
  // tocar cada componente. Un botón con data-sound="custom" pone su propio sonido.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const button = target?.closest<HTMLElement>('button, .leaflet-control-zoom a');
      if (!button || button.dataset.sound) return;
      if (button instanceof HTMLButtonElement && button.disabled) return;
      play('click');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [play]);

  return (
    <SoundContext.Provider value={{ play, startAmbient, stopAmbient, muted, toggleMuted, unlocked }}>
      {children}
      {/* Elementos <audio> de HTML5, uno por efecto */}
      {(Object.keys(SOURCES) as SoundName[]).map((name) => (
        <audio
          key={name}
          ref={(el) => {
            refs.current[name] = el;
            if (el) el.volume = SOURCES[name].volume;
          }}
          src={SOURCES[name].src}
          loop={SOURCES[name].loop}
          preload="auto"
          aria-hidden="true"
        />
      ))}
    </SoundContext.Provider>
  );
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound debe usarse dentro de <SoundProvider>');
  return ctx;
}
