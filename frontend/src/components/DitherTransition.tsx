/**
 * DitherTransition.tsx — Transición de pantalla completa con Ordered Dithering (WebGL).
 *
 * Recreación fiel de la animación "dither" de Interlude (Codrops / Manoela Ilic - crnacura):
 * https://interlude.crnacura.workers.dev/ y github.com/codrops/interlude
 *
 * Algoritmo:
 * 1. Matriz de Bayer 4×4 calculada aritméticamente ((fine * 4 + coarse + 0.5) / 16).
 * 2. 3 escalas anidadas de cuadrados (1/8, 1/16, 1/32 de la altura de la pantalla).
 * 3. Fase 1 (Cubrir): Los puntos se densifican en bloques hasta cubrir el 100% de la pantalla.
 * 4. Punto medio: Se ejecuta `onCovered()` con la pantalla opaca.
 * 5. Fase 2 (Revelar): Se disuelve el mosaico con nueva semilla hasta dejar la nueva vista limpia.
 * 6. Accesibilidad: Respeta `prefers-reduced-motion: reduce` según Rules/Desing_MC.md §8.
 */
import React, { useEffect, useRef } from 'react';

const COVER_DURATION_MS = 520;
const REVEAL_DURATION_MS = 520;

interface DitherTransitionProps {
  onCovered: () => void;
  onDone: () => void;
  /** Color de los píxeles dither en hex (por defecto #171615 de Rules/Desing_MC.md §2.1) */
  color?: string;
}

const VERTEX_SHADER_SRC = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
    v_uv = (a_position + 1.0) * 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SRC = `
precision highp float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_progress;
uniform float u_reveal;
uniform vec3 u_color;

float hash(float p) {
    return fract(sin(p) * 43758.5453123);
}

float two(float a, float b) {
    return mod(a * 2.0 + b * 3.0, 4.0);
}

float bayer(float x, float y) {
    float fine = two(mod(x, 2.0), mod(y, 2.0));
    float coarse = two(mod(floor(x / 2.0), 2.0), mod(floor(y / 2.0), 2.0));
    return (fine * 4.0 + coarse + 0.5) / 16.0;
}

void main() {
    float aspect = u_resolution.x / u_resolution.y;
    vec2 position = vec2(v_uv.x * aspect, 1.0 - v_uv.y);

    float DOTS = 32.0 * 8.0;
    float STAGGER = 0.16;
    float FILL = 0.20;
    float span = 1.0 - STAGGER * 2.0 - FILL;

    float density = 0.0;

    // Nivel 0 (cuadrados grandes: size 1/8, share 40%)
    {
        float size = 0.125;
        float share = 0.4;
        float level = 0.0;
        vec2 cell = floor(position / size);
        float id = cell.x + cell.y * 997.0 + level * 7919.0 + u_reveal * 104729.0;
        float takesPart = step(hash(id), share);
        float moment = hash(id + 50021.0) * span + level * STAGGER;
        float filled = clamp((u_progress - moment) / FILL, 0.0, 1.0);
        density = max(density, takesPart * filled);
    }

    // Nivel 1 (cuadrados medianos: size 1/16, share 50%)
    {
        float size = 0.0625;
        float share = 0.5;
        float level = 1.0;
        vec2 cell = floor(position / size);
        float id = cell.x + cell.y * 997.0 + level * 7919.0 + u_reveal * 104729.0;
        float takesPart = step(hash(id), share);
        float moment = hash(id + 50021.0) * span + level * STAGGER;
        float filled = clamp((u_progress - moment) / FILL, 0.0, 1.0);
        density = max(density, takesPart * filled);
    }

    // Nivel 2 (cuadrados pequeños: size 1/32, share 100%)
    {
        float size = 0.03125;
        float level = 2.0;
        vec2 cell = floor(position / size);
        float id = cell.x + cell.y * 997.0 + level * 7919.0 + u_reveal * 104729.0;
        float moment = hash(id + 50021.0) * span + level * STAGGER;
        float filled = clamp((u_progress - moment) / FILL, 0.0, 1.0);
        density = max(density, filled);
    }

    vec2 dot = floor(position * DOTS);
    float threshold = bayer(dot.x, dot.y);
    float isVisible = step(threshold, density);

    if (isVisible < 0.5) {
        discard;
    }

    gl_FragColor = vec4(u_color, 1.0);
}
`;

function hexToRgbNormalized(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  return [(num >> 16 & 255) / 255, (num >> 8 & 255) / 255, (num & 255) / 255];
}

export function DitherTransition({
  onCovered,
  onDone,
  color = '#171615',
}: DitherTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Rules/Desing_MC.md §8: Si el usuario tiene activo "reducir movimiento", paso inmediato
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      onCovered();
      onDone();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: true, antialias: false });
    if (!gl) {
      // Fallback si el dispositivo no soporta WebGL
      const timerCover = window.setTimeout(onCovered, COVER_DURATION_MS);
      const timerDone = window.setTimeout(onDone, COVER_DURATION_MS + REVEAL_DURATION_MS);
      return () => {
        window.clearTimeout(timerCover);
        window.clearTimeout(timerDone);
      };
    }

    // Compilación de shaders
    const createShader = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fragShader = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Fullscreen Quad
    const quadVertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uProgress = gl.getUniformLocation(program, 'u_progress');
    const uReveal = gl.getUniformLocation(program, 'u_reveal');
    const uColor = gl.getUniformLocation(program, 'u_color');

    const rgb = hexToRgbNormalized(color);
    gl.uniform3f(uColor, rgb[0], rgb[1], rgb[2]);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(window.innerWidth * dpr);
      const h = Math.round(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uResolution, w, h);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // Animación en dos fases (Leave -> Swap -> Enter)
    let animationFrameId: number;
    let startTime: number | null = null;
    let hasCalledCovered = false;

    const render = (time: number) => {
      if (startTime === null) startTime = time;
      const elapsed = time - startTime;

      if (elapsed <= COVER_DURATION_MS) {
        // Fase 1: Cubriendo (0 -> 1)
        const p = Math.min(1, elapsed / COVER_DURATION_MS);
        gl.uniform1f(uProgress, p);
        gl.uniform1f(uReveal, 0.0);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        animationFrameId = requestAnimationFrame(render);
      } else if (!hasCalledCovered) {
        // Pantalla completamente cubierta (100% sólida)
        hasCalledCovered = true;
        gl.uniform1f(uProgress, 1.0);
        gl.uniform1f(uReveal, 0.0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        onCovered();
        animationFrameId = requestAnimationFrame(render);
      } else if (elapsed <= COVER_DURATION_MS + REVEAL_DURATION_MS) {
        // Fase 2: Revelando (1 -> 0 con nueva semilla de revelación)
        const revealElapsed = elapsed - COVER_DURATION_MS;
        const p = Math.max(0, 1.0 - revealElapsed / REVEAL_DURATION_MS);
        gl.uniform1f(uProgress, p);
        gl.uniform1f(uReveal, 1.0);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        animationFrameId = requestAnimationFrame(render);
      } else {
        // Fin de la transición
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        onDone();
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertShader);
      gl.deleteShader(fragShader);
    };
  }, [onCovered, onDone, color]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[100] h-full w-full"
      style={{ imageRendering: 'pixelated' }}
      aria-hidden="true"
    />
  );
}
