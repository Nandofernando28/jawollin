# Operación Cortafuegos Manta

> SpookyThon 2026 · Track B · La Plaga Zombie 🧟‍♀️

## Qué hace el proyecto

_Pendiente (todo el equipo)._

## Modelo epidemiológico

### La plaga

Una plaga zombie ficticia, de contagio directo entre personas. Su contagiosidad está calibrada para parecerse a la **COVID-19 (cepa original)**: cada zombie contagia en promedio a **2,8 personas** (R₀ ≈ 2,8). Sus tiempos son cortos, como los de la influenza, para que el brote se desarrolle dentro de una simulación de 30 días. La plaga no mata: convierte.

Cada persona está siempre en uno de estos 5 estados:

| Código | Estado | Qué significa | Cuánto dura |
|---|---|---|---|
| 0 | 🟢 Sano | Puede contagiarse | Hasta que lo muerden o lo vacunan |
| 1 | 🟡 Mordido | Infectado en incubación: todavía no contagia y nadie sabe que está infectado | 2 días (`incubation_days`) |
| 2 | 🔴 Zombie | Contagia a sus contactos | 5 días (`infectious_days`) |
| 3 | 🟣 Aislado | Zombie retirado por una brigada: ya no contagia | Hasta completar sus 5 días |
| 4 | 🔵 Exorcizado / Inmune | Recuperado, o vacunado con éxito. No vuelve a contagiarse | Permanente |

Caminos posibles:

- 🟢 Sano → 🟡 Mordido → 🔴 Zombie → 🔵 Inmune
- 🔴 Zombie → 🟣 Aislado (brigada) → 🔵 Inmune
- 🟢 Sano → 🔵 Inmune (vacuna, funciona en el 85% de los casos)


### La población: red de contactos de Manta
La organización no entrega datos, así que generamos una **población sintética de Manta** (por defecto, 1 200 personas) como una red de contactos. Cada persona es un punto y cada contacto es una línea con un **peso** entre 0 y 1,45: cuanto más alto, más cercano es el contacto y más fácil el contagio. Código: [`src/engine/graph_manta.py`](src/engine/graph_manta.py).

**Parroquias urbanas.** Cada persona vive en una de las 5 parroquias, repartidas según su peso de población:

| Parroquia | Población |
|---|---|
| Tarqui | 38% |
| Eloy Alfaro | 24% |
| Manta Centro | 22% |
| Los Esteros | 11% |
| San Mateo | 5% |

**Hogares.** Las personas de una misma parroquia se agrupan en familias de 3 a 6 integrantes.

**Roles y hubs.** Cada persona tiene un rol, que decide a qué lugar de alta afluencia (hub) va durante el día:

| Rol | % de la población | Adónde va de día |
|---|---|---|
| Estudiante | 22% | ULEAM (70%) o un colegio de su barrio (30%) |
| Comerciante | 18% | El mercado más cercano a su parroquia |
| Transportista | 10% | Terminal Terrestre, y además conduce buses |
| Obrero atunero | 20% | Zona industrial / Empacadoras de Los Esteros |
| Residente | 30% | El mercado más cercano (60%) o se queda en su barrio (40%) |

Los 5 hubs y qué tan contagioso es cada uno (multiplicador del peso de sus contactos):

| Hub | Parroquia | Multiplicador |
|---|---|---|
| Mercado de Tarqui | Tarqui | 1,45 |
| Terminal Terrestre | Eloy Alfaro | 1,40 |
| Empacadoras | Los Esteros | 1,35 |
| ULEAM | Manta Centro | 1,30 |
| Mercado Central | Manta Centro | 1,25 |

**Dos capas de contactos:**

- **Noche (casa y barrio):** cada familia está conectada todos con todos (peso 0,85 a 1,0), y cada hogar tiene de 2 a 4 contactos con hogares vecinos de su parroquia (peso 0,25 a 0,45).
- **Día (hubs, barrio y buses):** dentro de cada hub, cada persona tiene contactos fijos (compañeros de aula, de puesto o de línea de producción) y algunos al azar (red de "mundo pequeño"). Quien no va a ningún hub tiene contactos de día en su barrio. Cada transportista lleva de 6 a 10 pasajeros de cualquier parroquia (peso 0,30 a 0,60): son los **puentes** por donde la plaga salta de un barrio a otro.

En promedio, cada persona tiene unos **9 contactos de día y 5 de noche**.

**Centralidad puente (`bridge_score`).** A cada persona se le da una nota de 0 a 1 que mide cuánto conecta parroquias distintas: 40% por la cantidad de contacto diario, 40% por cuántas parroquias distintas toca y 20% de bono por rol (transportistas y comerciantes). La estrategia la usa para vacunar a los puentes.

La red es **determinista**: con la misma semilla se genera siempre exactamente la misma ciudad.

### Cómo se contagia
La simulación avanza **día a día** (por defecto, 30 días). Código: [`src/engine/simulator.py`](src/engine/simulator.py).

**Día 0.** Se eligen los pacientes cero (por defecto 4) entre las personas que van al hub de inicio (por defecto, el Mercado de Tarqui). Se prefiere a quien tiene más contactos, porque un brote real suele empezar por quien más se mueve.

**Cada día, en este orden:**

1. **Llega el presupuesto** del COE (400 $/día, sin pasar el techo total de 8 000 $). Lo que no se gasta se guarda para el día siguiente.
2. **Vigilancia:** cada Zombie que todavía no ha sido reportado tiene un **35% de probabilidad** de ser detectado ese día. El COE solo conoce a los Zombies detectados; los Mordidos en incubación son invisibles.
3. **El COE decide** qué hacer con el dinero, según la estrategia (ver *Estrategia Escudo Manta*).
4. **Contagio de día** (hubs, barrio y buses).
5. **Contagio de noche** (casa y barrio), solo para quienes siguieron sanos durante el día.
6. **Avanza la enfermedad:** los Mordidos pasan a Zombie tras 2 días; los Zombies y los Aislados pasan a Inmunes tras 5 días.

**Fórmula del contagio.** Para cada persona sana se suma el riesgo de todos sus contactos que son Zombies:

$$\lambda_i = \sum_{j \in \text{contactos Zombie}} \beta \cdot w_{ij}$$

y su probabilidad de ser mordida ese día es:

$$p_i = 1 - e^{-\lambda_i}$$

donde:

- $\beta$ es la probabilidad base de contagio por contacto: **`beta_day` = 0,05** de día y **`beta_night` = 0,07** de noche. La de noche es mayor porque en casa el contacto es más cercano y largo.
- $w_{ij}$ es el peso del contacto (de 0,25 a 1,45, según la tabla de la población).
- Si el contacto ocurre en un **hub cerrado** ese día, su peso se reduce un **88%** (`hub_firewall_reduction`).

Con esta fórmula, un Sano con muchos contactos Zombie casi seguro se contagia, y uno con un solo contacto lejano tiene poca probabilidad. Ni los Mordidos ni los Aislados contagian: solo los Zombies activos.

### Estrategia Escudo Manta
**Idea central:** cada día, el COE compra **una a una** las acciones que **evitan más contagios por cada dólar**, hasta quedarse sin presupuesto. Es un algoritmo voraz de retorno marginal por dólar (ROI).

$$\text{ROI}(\text{acción}) = \frac{\text{contagios que se espera evitar}}{\text{costo de la acción}}$$

El COE solo usa la información que tendría en la realidad: los **Zombies detectados**. No sabe quién está Mordido.

**Las 3 defensas:**

| Defensa | Costo | Qué hace | Contagios que se espera evitar |
|---|---|---|---|
| 🔥 **Cortafuegos en un hub** | 220 $ por día | Cierra o fumiga un hub ese día: sus contactos contagian un 88% menos | Riesgo de hoy entre los Zombies detectados del hub y sus contactos Sanos, × 0,88, × 2 (por los Zombies que aún nadie ha reportado) |
| 🚑 **Brigada de aislamiento** | 65 $ | Aísla a un Zombie detectado: deja de contagiar | Riesgo diario de ese Zombie hacia sus contactos Sanos (día + noche) × los días de contagio que le quedan |
| 💉 **Vacuna anillo + puente** | 15 $ | Vacuna a una persona Sana; funciona en el 85% de los casos y la vuelve Inmune | 0,85 × (65% por su cercanía a Zombies detectados + 35% por su centralidad puente) × β |

**Vacunación anillo + puente.** Para cada persona Sana se combinan dos cosas:

- **Anillo:** cuántos Zombies detectados tiene a 1 salto, más una parte (25%) de los que tiene a 2 saltos. El segundo salto sirve para alcanzar a los Mordidos invisibles que suele haber alrededor de cada caso.
- **Puente:** su `bridge_score`. Vacunar a quien conecta parroquias (por ejemplo, un transportista) corta los caminos por donde la plaga salta de barrio.

**Regla de oro: nunca se vacuna a un infectado o inmune.** La lista de candidatos a vacuna se arma **solo con personas en estado Sano** que no hayan sido vacunadas antes. Además, cada dosis se audita: si alguna se aplicara a alguien que no está Sano, se contaría como desperdicio. El contador `wasted_vaccines_count` ha sido **0 en todas las simulaciones**.

**Se adapta sola al 🎃 Brote Sorpresa.** No tiene reglas fijas del tipo "primero vacunar". Si el jurado baja la eficacia de la vacuna, el valor de vacunar baja automáticamente y el dinero se va a brigadas; si la plaga se vuelve mucho más contagiosa, cerrar hubs empieza a compensar. Por ejemplo, con una vacuna al 25% y el contagio de día al 0,18, el Escudo pasa de 10,6 a 62,8 brigadas y de 487 a 233 vacunas, sin cambiar el código.

**Cuándo usa cada defensa.** Con brotes controlables, le rinden más las brigadas (65 $) y las vacunas (15 $). Cerrar un hub cuesta 220 $ y solo protege un día, así que solo lo hace cuando la epidemia se descontrola y hay muchos contagios dentro de un mismo lugar (ver [docs/calibracion.md](docs/calibracion.md), fila 8).

### Líneas base y Monte Carlo
**Dos líneas base**, como pide el reto. Las tres estrategias se simulan con exactamente las mismas condiciones:

| Estrategia | Qué hace |
|---|---|
| 🙅 **Sin intervención** (`none`) | No gasta nada. Muestra qué pasa si nadie actúa. |
| 🎲 **Intervención al azar** (`random`) | Recibe **el mismo presupuesto** cada día y **la misma información** (los mismos Zombies detectados) que el Escudo. Cada compra es al azar: elige un tipo de acción cualquiera (hub, brigada o vacuna) y un objetivo cualquiera, sin mirar anillos ni puentes. También respeta la regla de oro: solo vacuna a personas Sanas. |
| 🛡️ **Escudo Manta** (`shield`) | La estrategia descrita arriba. |

Si el Escudo supera al azar, es porque **elige mejor**, no porque tenga más recursos.

**Monte Carlo: muchas repeticiones, no una sola.** Una sola simulación puede salir bien por suerte. Por eso cada estrategia se repite **30 veces** por defecto (`monte_carlo_runs`) y se reporta:

- La **media** de cada día.
- El rango **P10–P90**: P10 es un escenario favorable (solo el 10% de las repeticiones salió mejor), P50 el típico y P90 un escenario desfavorable.

**Comparación justa: números aleatorios comunes.** En la repetición número *k*, las tres estrategias usan la misma semilla derivada (`seed × 1000 + k`). Así comparten **el mismo paciente cero** y **la misma suerte en la detección de casos**. La diferencia entre ellas se debe a la estrategia, no al azar. Las vidas salvadas se calculan **repetición por repetición** (infectados del azar − infectados del Escudo) y luego se promedian.

**Reproducible.** Con la misma configuración y la misma semilla, el resultado es **exactamente el mismo**, en local o en AWS. Está verificado con pruebas automáticas (`tests/test_simulator.py`).

**En AWS**, las repeticiones se reparten en lotes que corren en paralelo en varias funciones Lambda (`run_batch_simulations`) y luego se juntan (`aggregate_batch_results`). El resultado es idéntico al de correrlas todas juntas en local.

### Parámetros por defecto y semilla
**Semilla oficial: `2026`.** Todos los valores están en `DEFAULT_SIMULATION_PARAMS` de [`src/engine/simulator.py`](src/engine/simulator.py).

**La simulación**

| Parámetro | Valor | Por qué |
|---|---|---|
| `seed` | 2026 | Año del evento. Cualquier semilla sirve: el Escudo supera a las líneas base con todas las que probamos. |
| `n_nodes` | 1 200 personas | Muestra a escala de Manta (271 145 hab.) con estructura suficiente de hogares, hubs y buses, y que corre en ~1 s, dentro de los 5 min del Brote Sorpresa. |
| `days` | 30 | Un mes: el tiempo en que la plaga se desarrolla y el presupuesto se agota (día 20). |
| `monte_carlo_runs` | 30 | Repeticiones por estrategia: suficiente para medias y rangos P10–P90 estables, en ~1 s. |
| `start_hub` | Mercado de Tarqui | El hub más concurrido (multiplicador 1,45) de la parroquia más poblada. |
| `initial_infected` | 4 | Un brote pequeño, como los que detecta un sistema de salud al inicio. |

**La plaga**

| Parámetro | Valor | Por qué |
|---|---|---|
| `beta_day` | 0,05 | Junto con `beta_night`, da un R₀ ≈ 2,8, comparable a la COVID-19 original (ver *Calibración*). |
| `beta_night` | 0,07 | Mayor que de día: en casa el contacto es más cercano y largo. |
| `incubation_days` | 2 | Tiempos cortos, del orden de los de la influenza, para que el brote se desarrolle en 30 días. |
| `infectious_days` | 5 | Ídem. |

**Recursos y costos** (escenario ficticio; lo importante es la proporción entre costos)

| Parámetro | Valor | Por qué |
|---|---|---|
| `daily_budget` | 400 $/día | El dinero llega por días, como en una emergencia real. |
| `total_budget` | 8 000 $ | Dura 20 de los 30 días y no alcanza para todos: recursos realmente limitados. |
| `vaccine_cost` | 15 $ | La acción más barata e individual. |
| `brigade_cost` | 65 $ | Equipo de personas varios días aislando a un caso: ≈ 4 vacunas. |
| `hub_closure_cost` | 220 $ por día | Cerrar o fumigar un lugar con cientos de personas: la acción más cara. Abaratarlo favorecía al azar (ver *Calibración*). |
| `vaccine_efficacy` | 0,85 | Supuesto: una vacuna buena pero no perfecta. |
| `hub_firewall_reduction` | 0,88 | Un cierre no elimina todo el contacto (personal, abastecimiento): reduce el contagio un 88%. |

**Constantes internas del modelo** (en `simulator.py`)

| Constante | Valor | Qué significa |
|---|---|---|
| `DETECTION_PROB` | 0,35 | Probabilidad diaria de que un Zombie sea reportado: tarda en promedio 2–3 días. |
| `HIDDEN_CASE_FACTOR` | 2,0 | Al valorar un cierre de hub, por cada Zombie detectado se estima otro oculto. |
| `RING_SECOND_HOP_WEIGHT` | 0,25 | Peso de los contactos a 2 saltos en la vacunación en anillo. |

**Cómo reproducir los resultados**

```bash
python scripts/calibrar.py
```

Con los valores por defecto y la semilla 2026, el resultado debe ser exactamente:

| Sin intervención | Al azar | Escudo Manta | Escudo vs azar | Vacunas desperdiciadas |
|---|---|---|---|---|
| 814 infectados (68%) | 39,2 | 14,6 | 62,67% menos contagios | 0 |

Para probar otra configuración, se escriben los cambios como `nombre=valor`, por ejemplo: `python scripts/calibrar.py seed=42 vaccine_efficacy=0.5`.


### Calibración y verificación

El detalle completo de cada experimento está en [docs/calibracion.md](docs/calibracion.md).

**Qué ajustamos y por qué.** Con los valores iniciales, el modelo tenía dos supuestos poco creíbles: sin intervenir se infectaba el 97% de Manta en un mes, y con 12 000 $ se podían comprar vacunas para casi la mitad de la ciudad. Cambiamos un parámetro cada vez y anotamos el resultado:

- Bajamos el contagio (`beta_day` 0,085 → 0,05 y `beta_night` 0,110 → 0,07): sin intervenir se infecta el 68%, una epidemia grave pero creíble.
- Probamos abaratar el cierre de hubs, pero eso favorecía al azar (que cierra hubs por casualidad), así que lo descartamos.
- Bajamos el presupuesto (600 → 400 $/día y 12 000 → 8 000 $): los recursos pasan a ser realmente limitados.

**Comparación con una enfermedad real.** Con los valores elegidos, cada Zombie contagia en promedio a **2,8 personas** (R₀ ≈ 2,8), comparable a la **COVID-19 original**. El escenario "el doble de contagiosa" equivale a R₀ ≈ 5, como la **variante Delta**. Lo medimos con `python scripts/estimar_r0.py`.

**Verificación 1: el jurado elige la semilla.** Probamos 10 semillas distintas (1, 7, 42, 55, 100, 123, 777, 999, 2026 y 31337). El Escudo supera a las dos líneas base **con las 10**. La mejora frente al azar varía entre el 19% y el 74% según la semilla, por eso no fijamos un porcentaje como meta: lo que se mantiene es que **siempre gana**.

**Verificación 2: Brote Sorpresa.** Probamos los cambios que el reto pone de ejemplo, con la semilla 2026:

| Escenario | Sin intervención | Al azar | Escudo Manta |
|---|---|---|---|
| El doble de contagiosa | 1 187 | 820 | **197** |
| La mitad de las vacunas | 814 | 90 | **24** |
| El brote empieza en el Mercado Central (por defecto empieza en el de Tarqui) | 635 | 21 | **13** |
| La vacuna cubre a medias | 814 | 40 | **21** |

En todos los casos el Escudo supera a las dos líneas base sin cambiar el código, y con **0 vacunas desperdiciadas**.

### Limitaciones del modelo
Todo modelo simplifica la realidad. Estas son las simplificaciones conocidas del nuestro:

**Población**

- Es una **población sintética** de 1 200 personas que representa a escala a Manta (271 145 habitantes), no personas reales.
- Los **pesos de las parroquias** (38/24/22/11/5%) son una aproximación del equipo: no encontramos la población oficial por parroquia urbana del Censo 2022. Sí está confirmado que Tarqui es la más poblada.
- Usa 5 parroquias urbanas. Manta aprobó recientemente una sexta (Urbimanta), que el modelo no incluye.
- Los porcentajes de cada rol, los multiplicadores de los hubs y la cantidad de contactos por persona son **supuestos del modelo**, no datos medidos.
- La red es la misma todos los días: no hay fines de semana, feriados ni cambios de rutina.

**La plaga**

- No mata: todos los infectados terminan inmunes.
- La inmunidad es permanente: nadie se vuelve a contagiar.
- Los Mordidos no contagian durante la incubación y no hay casos asintomáticos.
- La incubación (2 días) y el periodo de contagio (5 días) duran exactamente lo mismo para todas las personas.
- La gente no cambia su comportamiento por miedo a la plaga: solo las acciones del COE reducen el contacto.

**Intervenciones**

- Los costos en dólares son ficticios; lo que importa es la proporción entre ellos.
- La detección de casos (35% diario) y el factor de casos ocultos (×2) son supuestos fijos.
- La vacuna protege desde el mismo día en que se aplica.
- El Escudo es un algoritmo **voraz**: decide lo mejor de cada día, sin planear a largo plazo. Es rápido y fácil de explicar, pero no garantiza la mejor estrategia posible.

**Resultados**

- La comparación con la COVID-19 se basa en el R₀, que depende de cuántos contactos tiene cada persona en nuestra red. Es una referencia de orden de magnitud, no una calibración exacta.
- No modelamos el dengue, aunque es frecuente en Manabí, porque se transmite por mosquito y nuestro modelo es de contacto directo entre personas.
- El mapa animado muestra una sola repetición (la primera), no el promedio de todas. Las gráficas y los indicadores sí usan las 30 repeticiones.
- Con muchas personas y repeticiones el cálculo local se vuelve lento (5 000 personas, 100 repeticiones y 60 días tardan unos 20 s en un portátil). En AWS se reparte en paralelo.

## Arquitectura en AWS

_Pendiente (Integrante 2)._

## Interfaz

_Pendiente (Integrante 3)._

## Cómo desplegarlo

_Pendiente._

## Cómo probarlo

_Pendiente._

## Costos

_Pendiente. Ver [docs/costos.md](docs/costos.md)._

## AWS Budget

_Pendiente: captura del AWS Budget con alerta._
