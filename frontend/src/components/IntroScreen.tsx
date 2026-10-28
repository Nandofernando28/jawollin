/**
 * IntroScreen.tsx — Presentación cinematográfica "El Ataque Nocturno".
 *
 * Referencia oficial de diseño: Rules/Desing_MC.md
 * - §6 Imagen y decoración: cielo nocturno en franjas, luna cuadrada pixel y suelo de hierba
 * - §7 Animación y movimiento: eventos escalonados (rayo, letrero flotante, barra por pasos)
 * - §8 Accesibilidad: detección de teclas (Esc / cualquier tecla), etiquetas ARIA de progreso
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSound } from '../audio/SoundProvider';

type Phase = 'gate' | 'night' | 'attack' | 'loading' | 'done';

const NIGHT_MS = 1800; // grillos antes del rayo
const SIGN_MS = 900; // el letrero se ve antes de que empiece la carga
const LOAD_STEP_MS = 140; // cada paso de la barra
const LOAD_STEP = 4; // % por paso: 25 pasos ≈ 3,5 s
const AFTER_EAT_MS = 800; // pausa tras el mordisco antes de entrar

interface IntroScreenProps {
  onStart: () => void;
}

export function IntroScreen({ onStart }: IntroScreenProps) {
  const { play, startAmbient, stopAmbient, muted, toggleMuted } = useSound();
  const [phase, setPhase] = useState<Phase>('gate');
  const [progress, setProgress] = useState(0);
  const left = useRef(false);

  const leave = () => {
    if (left.current) return;
    left.current = true;
    stopAmbient();
    onStart();
  };

  // Estrellas en posiciones fijas deterministas
  const stars = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => {
        const rand = (n: number) => {
          const x = Math.sin(n * 12.9898) * 43758.5453;
          return x - Math.floor(x);
        };
        return {
          left: rand(i + 1) * 100,
          top: rand(i + 101) * 62,
          size: rand(i + 201) > 0.85 ? 4 : 2,
        };
      }),
    [],
  );

  const enter = () => {
    if (phase !== 'gate') return;
    startAmbient();
    setPhase('night');
  };

  const skip = leave;

  // 2 → 3: tras unos segundos de grillos, cae el rayo
  useEffect(() => {
    if (phase !== 'night') return;
    const t = window.setTimeout(() => {
      play('thunder');
      setPhase('attack');
    }, NIGHT_MS);
    return () => window.clearTimeout(t);
  }, [phase, play]);

  // 3 → 4: el letrero se lee un momento y empieza la carga
  useEffect(() => {
    if (phase !== 'attack') return;
    const t = window.setTimeout(() => setPhase('loading'), SIGN_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  // 4: la barra avanza por pasos hasta el 100 %
  useEffect(() => {
    if (phase !== 'loading') return;
    const t = window.setInterval(() => {
      setProgress((p) => Math.min(100, p + LOAD_STEP));
    }, LOAD_STEP_MS);
    return () => window.clearInterval(t);
  }, [phase]);

  // 5: al llegar al 100 %, mordisco de manzana y entrada automática
  useEffect(() => {
    if (phase !== 'loading' || progress < 100) return;
    play('eat');
    setPhase('done');
  }, [phase, progress, play]);

  useEffect(() => {
    if (phase !== 'done') return;
    const t = window.setTimeout(leave, AFTER_EAT_MS);
    return () => window.clearTimeout(t);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => undefined);
  keyHandler.current = (e: KeyboardEvent) => {
    if (e.key === 'Escape') skip();
    else if (phase === 'gate') enter();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const showSign = phase === 'attack' || phase === 'loading' || phase === 'done';

  return (
    <div
      className="mc-night fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-4 text-center"
      onClick={enter}
    >
      {/* Cielo: estrellas y luna cuadrada */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {stars.map((s, i) => (
          <span
            key={i}
            className="absolute bg-[#ffffff]"
            style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, opacity: s.size === 4 ? 0.9 : 0.55 }}
          />
        ))}
        <span className="mc-moon absolute right-[12%] top-[10%]" />
        {/* Suelo de bloques de hierba en sombra */}
        <span className="mc-night-ground absolute bottom-0 left-0 right-0 h-24" />
      </div>

      {/* Destello del rayo */}
      {phase === 'attack' && <div className="mc-lightning pointer-events-none absolute inset-0" aria-hidden="true" />}

      {phase === 'gate' && (
        <button type="button" onClick={enter} className="mc-blink-soft relative font-display text-[16px] text-[#ede5e2] sm:text-[28px]">
          Haz clic o pulsa una tecla para entrar al mundo
        </button>
      )}

      {showSign && (
        <div className="relative flex w-full max-w-xl flex-col items-center">
          {/* Letrero de madera flotante */}
          <div className="mc-float flex flex-col items-center">
            <div className="mc-sign px-6 py-5 sm:px-10">
              <p role="alert" className="mc-blink-soft font-display text-[14px] leading-snug text-[#2b1d0c] sm:text-[16px]">
                La noche ha caído sobre Manta. Los aldeanos han sido mordidos
              </p>
            </div>
            <span className="mc-sign-post" aria-hidden="true" />
          </div>

          {/* Barra de carga del mundo */}
          {phase !== 'attack' && (
            <div className="mt-10 w-full max-w-md">
              <p className="mb-3 font-pixel text-[11px] text-white" aria-live="polite">
                Generando terreno... {progress}%
              </p>
              <div
                className="h-5 border-2 border-white bg-[#171615] p-[2px]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                aria-label="Generando terreno"
              >
                <div
                  className="h-full bg-mc-grass-light"
                  style={{
                    width: `${progress}%`,
                    backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.3) 2px, transparent 2px)',
                    backgroundSize: '10px 100%',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controles discretos */}
      <div className="absolute bottom-4 right-4 z-10 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={toggleMuted} className="mc-button mc-button-sm" aria-pressed={!muted}>
          {muted ? 'Sonido: no' : 'Sonido: sí'}
        </button>
        <button type="button" onClick={skip} className="mc-button mc-button-sm">
          Saltar (Esc)
        </button>
      </div>
    </div>
  );
}
