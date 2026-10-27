"""
Herramienta de calibración: corre el simulador y muestra los resultados clave.
Uso:  python scripts/calibrar.py beta_day=0.06 hub_closure_cost=120
"""
import sys
import time

sys.path.insert(0, ".")
from src.engine.simulator import run_monte_carlo_ensemble

# Lee los cambios escritos como nombre=valor
cambios = {}
for arg in sys.argv[1:]:
    nombre, valor = arg.split("=")
    cambios[nombre] = float(valor)

inicio = time.perf_counter()
r = run_monte_carlo_ensemble(cambios)
segundos = time.perf_counter() - inicio
k = r["summary_kpis"]
poblacion = k["total_population"]

print("Cambios probados:", cambios or "ninguno (valores por defecto)")
print(f"Tiempo: {segundos:.1f} s")
print(f"Infectados SIN hacer nada: {k['total_infected_none']:.0f} ({100 * k['total_infected_none'] / poblacion:.0f}% de Manta)")
print(f"Infectados AZAR:           {k['total_infected_random']:.0f}")
print(f"Infectados ESCUDO:         {k['total_infected_shield']:.0f}")
print(f"Escudo mejor que azar:     {k['lives_saved_vs_random_pct']}%    <- debe ser mayor que 0")
print(f"Dias de hubs cerrados:     {k['total_hub_days_closed']} ")
print(f"Vacunas: {k['total_vaccines_used']}  Brigadas: {k['total_brigades_used']}  Desperdicio: {k['wasted_vaccines_count']}")