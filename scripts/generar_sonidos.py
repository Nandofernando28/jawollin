"""
Genera los efectos de sonido ORIGINALES de la interfaz (tema pixel) por síntesis.

No se usa ningún audio de videojuegos: todo sale de osciladores, ruido y filtros
calculados aquí, así que los archivos son propios y reproducibles.

Uso (desde la raíz del repositorio):
    python scripts/generar_sonidos.py

Escribe en frontend/public/sounds/:
    noche_grillos.wav   noche: grillos y viento en bucle (8 s)
    trueno.wav          rayo que se quiebra y retumba (2 s)
    comer_manzana.wav   tres mordiscos crujientes (0,7 s)
    clic_madera.wav     golpe corto de madera (0,12 s)
    brillo.wav          arpegio brillante (0,9 s)
"""
import wave
from pathlib import Path

import numpy as np

RATE = 22050
OUT = Path(__file__).resolve().parent.parent / "frontend" / "public" / "sounds"
rng = np.random.default_rng(2026)  # semilla fija: los archivos salen siempre iguales


def lowpass(x: np.ndarray, alpha: float) -> np.ndarray:
    """Filtro paso bajo de un polo: alpha pequeño = más grave."""
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += alpha * (v - acc)
        y[i] = acc
    return y


def resonator(x: np.ndarray, freq: float, q: float) -> np.ndarray:
    """Filtro resonante de dos polos (realza una frecuencia, como la caja de madera)."""
    w = 2 * np.pi * freq / RATE
    r = 1 - w / (2 * q)
    a1, a2 = -2 * r * np.cos(w), r * r
    y = np.zeros_like(x)
    for i in range(len(x)):
        y[i] = x[i] - a1 * (y[i - 1] if i > 0 else 0) - a2 * (y[i - 2] if i > 1 else 0)
    return y


def normalize(x: np.ndarray, peak: float = 0.9) -> np.ndarray:
    return x / (np.max(np.abs(x)) + 1e-9) * peak


def save(name: str, x: np.ndarray) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    data = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(OUT / name), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(data.tobytes())
    print(f"{name}: {len(x) / RATE:.2f} s")


def night_ambience(seconds: float = 8.0) -> np.ndarray:
    """Noche: viento suave de fondo y grillos (chirridos agudos en ráfagas)."""
    n = int(seconds * RATE)
    t = np.arange(n) / RATE
    brown = np.cumsum(rng.normal(0, 1, n))
    brown -= lowpass(brown, 0.0005)
    wind = normalize(lowpass(brown, 0.04)) * (0.6 + 0.4 * np.sin(2 * np.pi * t / seconds))
    crickets = np.zeros(n)
    for freq, period, offset in [(4200, 0.9, 0.0), (4700, 1.3, 0.35), (3900, 1.7, 0.8)]:
        # Cada chirrido son 3 pulsos rápidos que se repiten cada `period` segundos
        local = (t + offset) % period
        pulses = ((local < 0.18) & ((local * 1000 // 30) % 2 == 0)).astype(float)
        tone = np.sin(2 * np.pi * freq * t) * (0.7 + 0.3 * np.sin(2 * np.pi * 40 * t))
        crickets += tone * lowpass(pulses, 0.2)
    x = wind * 0.55 + normalize(crickets) * 0.18
    fade = int(0.4 * RATE)
    ramp = np.linspace(0, 1, fade)
    x[:fade] *= ramp
    x[-fade:] *= ramp[::-1]
    return normalize(x, 0.55)


def thunder(seconds: float = 2.0) -> np.ndarray:
    """Rayo: chasquido de ruido muy brillante y un retumbo grave que se apaga."""
    n = int(seconds * RATE)
    t = np.arange(n) / RATE
    noise = rng.normal(0, 1, n)
    crack = (noise - lowpass(noise, 0.3)) * np.exp(-t / 0.05)
    crackle = noise * (rng.random(n) < 0.02) * np.exp(-t / 0.4)
    rumble = lowpass(lowpass(noise, 0.01), 0.01)
    rumble = normalize(rumble) * np.minimum(1, t / 0.08) * np.exp(-t / 0.7)
    return normalize(crack * 0.9 + crackle * 0.5 + rumble * 0.9, 0.9)


def apple_crunch(seconds: float = 0.7) -> np.ndarray:
    """Comer una manzana: tres mordiscos de ruido crujiente filtrado."""
    n = int(seconds * RATE)
    t = np.arange(n) / RATE
    x = np.zeros(n)
    for k, start in enumerate([0.0, 0.22, 0.44]):
        tt = t - start
        on = tt >= 0
        burst = rng.normal(0, 1, n) * np.where(on, np.exp(-np.maximum(tt, 0) / 0.05), 0)
        crunchy = burst * (rng.random(n) < 0.35)
        x += resonator(crunchy, 2400 + 300 * k, 4) * 0.6 + resonator(burst, 900, 3) * 0.3
    return normalize(x, 0.8)


def wood_click(seconds: float = 0.12) -> np.ndarray:
    """Golpe de madera: ráfaga de ruido muy corta en una caja resonante."""
    n = int(seconds * RATE)
    t = np.arange(n) / RATE
    burst = rng.normal(0, 1, n) * np.exp(-t / 0.004)
    body = resonator(burst, 950, 18) + 0.5 * resonator(burst, 1900, 14)
    knock = 0.5 * np.sin(2 * np.pi * 520 * t) * np.exp(-t / 0.02)
    return normalize(body * np.exp(-t / 0.03) + knock, 0.8)


def bright_chime(seconds: float = 0.9) -> np.ndarray:
    """Arpegio brillante (do-mi-sol-do) con onda triangular y caída rápida."""
    n = int(seconds * RATE)
    t = np.arange(n) / RATE
    x = np.zeros(n)
    for k, freq in enumerate([1046.5, 1318.5, 1568.0, 2093.0]):
        start = k * 0.07
        tt = t - start
        on = tt >= 0
        tri = 2 * np.abs(2 * ((freq * tt) % 1) - 1) - 1
        x[on] += tri[on] * np.exp(-tt[on] / 0.25) * (0.8 - 0.1 * k)
    return normalize(x, 0.7)


if __name__ == "__main__":
    save("noche_grillos.wav", night_ambience())
    save("trueno.wav", thunder())
    save("comer_manzana.wav", apple_crunch())
    save("clic_madera.wav", wood_click())
    save("brillo.wav", bright_chime())
