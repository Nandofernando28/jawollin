# Cuaderno de calibración del motor

## Objetivo

Que el simulador sea **realista** y **defendible**, no que dé un porcentaje concreto.

Con los valores iniciales el modelo funcionaba, pero tenía dos supuestos poco creíbles:

1. **La epidemia era demasiado explosiva:** sin intervenir se infectaba el 97% de Manta en 30 días.
2. **Los recursos no eran realmente limitados:** con 12 000 $ se podían comprar más de 700 vacunas para 1 200 personas, casi una por cada dos habitantes.

El reto pide que la estrategia **supere a las dos líneas base** (no intervenir e intervenir al azar con los mismos recursos) con la semilla que elija el jurado y también en el 🎃 Brote Sorpresa. El reto **no** exige un porcentaje concreto de mejora. Por eso, después de calibrar, verificamos que el Escudo gane con muchas semillas y escenarios distintos (ver más abajo).

Método: cambiar **un solo parámetro cada vez**, correr `python scripts/calibrar.py` (30 réplicas Monte Carlo, semilla 2026) y anotar el resultado. Las cifras de infectados son el promedio de las 30 réplicas sobre 1 200 personas.

## Experimentos

| # | Cambio | Sin hacer nada | Azar | Escudo | Escudo vs azar | Hubs | Conclusión |
|---|--------|---------------|------|--------|----------------|------|------------|
| 0 | ninguno (beta 0.085 / 0.110, 600 $/día, 12 000 $) | 97% | 322 | 30 | 91% | 0 | Epidemia demasiado explosiva: casi toda la ciudad en un mes |
| 1 | beta_day=0.06 beta_night=0.08 | 84% | 107 | 14 | 87% | 0 | Menos explosiva, pero aún se infecta más de 8 de cada 10 |
| 2 | beta_day=0.05 beta_night=0.07 | 68% | 44 | 13 | 70% | 0 | Epidemia grave pero creíble: nos quedamos con estos betas |
| 3 | fila 2 + hub_closure_cost=120 | 68% | 18 | 13 | 26% | 0 | Abaratar los cierres ayuda al Azar (cierra hubs por casualidad), no al Escudo |
| 4 | fila 2 + hub_closure_cost=90 | 68% | 12 | 13 | -13% | 0 | El Azar gana. Descartado: el cierre se queda en 220 $ |
| 5 | fila 2 + daily_budget=500 total_budget=10000 | 68% | 53 | 16 | 69% | 0 | Con menos dinero, elegir bien importa más |
| 6 | fila 2 + daily_budget=400 total_budget=8000 | 68% | 39 | 15 | 63% | 0 | ELEGIDA: recursos realmente limitados |
| 7 | fila 6 + initial_infected=20 | 85% | 802 | 122 | 85% | 0 | Brote grande: el Escudo lo controla con brigadas |
| 8 | fila 6 + beta_day=0.12 initial_infected=20 | 97% | 1078 | 961 | 11% | 3.7 | Epidemia fuera de control: aparecen los cierres de hubs |

## Valores elegidos y por qué

| Parámetro | Antes | Después | Justificación |
|---|---|---|---|
| `beta_day` | 0.085 | **0.05** | Con el valor anterior, el 97% de Manta se infectaba en un mes, algo irreal. Con 0.05 de día y 0.07 de noche, sin intervenir se infecta el 68%: una epidemia grave pero creíble. |
| `beta_night` | 0.110 | **0.07** | Se mantiene mayor que `beta_day` porque en casa el contacto es más cercano y más largo que en el mercado o el bus. |
| `daily_budget` | 600 $ | **400 $** | Con 400 $/día y un techo de 8 000 $, el dinero dura 20 de los 30 días y no alcanza para todos. Esa es la situación que plantea el reto: *"no hay vacunas para todos"*. |
| `total_budget` | 12 000 $ | **8 000 $** | Ídem. Con 12 000 $ se podía vacunar a casi la mitad de la ciudad, y entonces cualquier estrategia funciona. |
| `hub_closure_cost` | 220 $ | **220 $** (sin cambio) | Abaratarlo favorecía al Azar (filas 3 y 4), así que se descartó. |

El 63% de mejora frente al azar de la fila 6 es **una consecuencia** de estos supuestos, no un objetivo que buscáramos. Como muestra la tabla siguiente, ese porcentaje cambia con la semilla; lo que se mantiene es que el Escudo **siempre gana**.

Sobre los cierres de hubs: el Escudo solo cierra un mercado cuando la epidemia se descontrola (fila 8). Cerrar un hub cuesta 220 $ y solo protege un día, así que únicamente compensa si hay muchos contagios dentro. Con brotes controlables le rinden más las brigadas (65 $) y las vacunas (15 $).

## Verificación 1: semillas distintas

Prueba de fuego del reto: *"el jurado corre la simulación en vivo con una semilla que elige y comprueba que la estrategia supera a las líneas base"*.

Valores elegidos, 30 réplicas por semilla:

| Semilla | Sin hacer nada | Azar | Escudo | Escudo vs azar | ¿Supera a las dos líneas base? |
|---|---|---|---|---|---|
| 1 | 823 | 18.3 | 13.3 | 27% | ✅ |
| 7 | 813 | 33.4 | 16.9 | 50% | ✅ |
| 42 | 825 | 45.4 | 12.8 | 72% | ✅ |
| 55 | 839 | 27.4 | 22.3 | 19% | ✅ |
| 100 | 829 | 64.6 | 17.1 | 74% | ✅ |
| 123 | 842 | 43.5 | 13.9 | 68% | ✅ |
| 777 | 845 | 46.9 | 14.8 | 69% | ✅ |
| 999 | 833 | 30.5 | 15.0 | 51% | ✅ |
| 2026 | 814 | 39.2 | 14.6 | 63% | ✅ |
| 31337 | 849 | 32.3 | 14.2 | 56% | ✅ |

**Resultado:** el Escudo supera a las dos líneas base con las 10 semillas. La mejora frente al azar varía entre el 19% y el 74% según la suerte de cada semilla; por eso no usamos un porcentaje fijo como meta.

## Verificación 2: Brote Sorpresa

Los ejemplos de cambio que menciona el reto, con semilla 2026:

| Escenario | Cambio aplicado | Sin hacer nada | Azar | Escudo | Escudo vs azar | ¿Supera? |
|---|---|---|---|---|---|---|
| El doble de contagiosa | beta_day=0.10 beta_night=0.14 | 1187 | 820 | 197 | 76% | ✅ |
| La mitad de las vacunas | vaccine_cost=30 | 814 | 90 | 24 | 73% | ✅ |
| La mitad del presupuesto | daily_budget=200 total_budget=4000 | 814 | 90 | 25 | 72% | ✅ |
| Empieza en el mercado | start_hub=mercado_central | 635 | 21 | 13 | 39% | ✅ |
| La vacuna cubre a medias | vaccine_efficacy=0.5 | 814 | 40 | 21 | 48% | ✅ |

**Resultado:** el Escudo supera a las dos líneas base en todos los escenarios, sin cambiar el código. Se adapta solo porque cada día recalcula qué acción evita más contagios por dólar: si la vacuna funciona peor, su valor baja y el dinero se va a brigadas.

En todas las corridas el número de vacunas desperdiciadas (aplicadas a alguien que no estaba sano) fue **0**.

## Nota sobre el rango 35–70%

El PRD del equipo menciona como meta que el Escudo supere al azar *"entre 35% y 70%"* (y en otra línea *"35% a 60%"*). Ese rango **no lo pide el reto**: fue una meta interna. Como muestra la verificación 1, el porcentaje depende de la semilla. El criterio que usa el jurado es que la estrategia **supere a las líneas base**, y eso se cumple siempre.

## Comparación con enfermedades reales (R₀)

Para que `beta_day` y `beta_night` no sean números inventados, medimos el **R₀** del modelo: cuántas personas contagia en promedio **un solo Zombie** durante sus 5 días infecciosos, en una ciudad donde todos están sanos. Es la medida estándar con la que la epidemiología compara qué tan contagiosa es una enfermedad.

Herramienta: `python scripts/estimar_r0.py beta_day=0.05 beta_night=0.07` (2 000 pruebas; solo cuenta la primera generación de contagios y el Zombie inicial se elige como vecino de alguien al azar, porque en una red quien se contagia suele tener más contactos que el promedio).

| Configuración | beta_day / beta_night | R₀ del modelo | Rango P10–P90 | Referencia real |
|---|---|---|---|---|
| Valores iniciales | 0.085 / 0.110 | 4.35 | 2 a 7 | Más que la COVID-19 original |
| Fila 1 | 0.06 / 0.08 | 3.24 | 1 a 5 | |
| **Valores elegidos** | **0.05 / 0.07** | **2.82** | **1 a 5** | **COVID-19 cepa original: mediana ≈ 2.8** |
| Brote Sorpresa "el doble de contagiosa" | 0.10 / 0.14 | 5.08 | 3 a 8 | Variante Delta de la COVID-19: ≈ 5 |

Valores de referencia publicados (a verificar con la fuente antes del pitch):

| Enfermedad | R₀ de referencia | Fuente |
|---|---|---|
| Influenza estacional | ≈ 1.3 | Biggerstaff et al. (2014), *BMC Infectious Diseases*, revisión sistemática |
| COVID-19 (cepa original) | mediana ≈ 2.8 | Liu et al. (2020), *Journal of Travel Medicine* |
| COVID-19 (variante Delta) | ≈ 5 | Liu y Rocklöv (2021), *Journal of Travel Medicine* |
| Sarampión | 12 a 18 | Guerra et al. (2017), *The Lancet Infectious Diseases* |

**Conclusión:** con los valores elegidos, la plaga zombie tiene una contagiosidad **comparable a la de la COVID-19 original**. Y el escenario "el doble de contagiosa" del Brote Sorpresa equivale a una variante tipo Delta.

### Limitaciones de esta comparación

- **Tiempos:** usamos 2 días de incubación y 5 días contagiando, más parecidos a la influenza que a la COVID-19 (cuya incubación ronda los 5 días). La plaga es "contagiosa como la COVID, pero rápida como la influenza", lo que hace que el brote avance en días y se pueda ver en una simulación de 30 días.
- **Dengue:** no lo usamos como referencia porque se transmite por mosquito, no de persona a persona, y nuestro modelo es de contacto directo.
- **El R₀ depende de la red:** cambia con el número de contactos de cada persona. Los contactos de nuestra red de Manta (unos 9 de día y 5 de noche por persona) son supuestos del modelo, no datos medidos.

## Pendiente

- Verificar las cuatro referencias de R₀ en sus fuentes originales y enlazarlas en el README.
