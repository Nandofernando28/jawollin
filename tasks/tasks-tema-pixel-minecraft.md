# Plan de Implementación — Tema visual pixel art inspirado en Minecraft

**Objetivo:** que la consola de Operación Cortafuegos Manta destaque en la hackathon con una estética retro pixel art inspirada en los menús, el inventario, los mapas y las pantallas de estadísticas de Minecraft.

**Regla principal: SOLO CAMBIA EL DISEÑO.** No se modifica la lógica: hooks (`useSimulation`), servicios (`api.ts`), tipos (`simulation.ts`), utilidades de cálculo (`format.ts`), datos (`mantaGeo.ts`, `surprisePresets.ts`), el backend ni el motor. Solo clases, estilos, colores, tipografía, iconos y propiedades visuales de Leaflet y Recharts. Ningún texto, cifra, umbral, `dataKey`, manejador de eventos ni `aria-label` cambia.

**Requisitos de diseño (resumen):**

- Tipografía pixel (`Press Start 2P` de Google Fonts) y `border-radius: 0` en todo.
- Paleta: fondo de cueva o piedra `#1b1b1b`, paneles de inventario `#c6c6c6` con bisel 3D (borde superior e izquierdo claro, inferior y derecho oscuro) y títulos en amarillo `#f8f800`.
- Mapa con aspecto de mapa de papel visto desde arriba, marco grueso de piedra o madera, cuadrícula de bloques y marcadores pixel (antorcha, bloque de diamante, cama) en lugar de pines modernos.
- Gráficas con líneas en escalón, barras como pilares de bloques apilados, colores de materiales (pasto, redstone, diamante, oro) y ejes y leyendas en paneles de inventario.
- Sin sombras difuminadas, `blur` ni `glow`: todo recto y definido. Las únicas sombras permitidas son "duras" (desplazadas y sin difuminado), como la sombra del texto de los títulos.

## Relevant Files

- `frontend/src/index.css` - Base del tema: fuentes, variables de color (`:root` y `@theme` de Tailwind 4), bisel 3D, texturas, utilidades `.mc-*`, estilos de Leaflet (marco, mosaicos, cuadrícula, popups, zoom), slider, scrollbar y foco visible.
- `frontend/src/theme/pixelTheme.ts` - **Nuevo.** Colores de materiales y estilo de ejes en JavaScript, porque Recharts y Leaflet necesitan los valores en el código y no pueden leer clases CSS. Solo constantes visuales.
- `frontend/src/components/PixelIcon.tsx` - **Nuevo.** Iconos pixel art originales en SVG (antorcha, bloque de diamante, cama, escudo, moneda, calavera zombie propia, reloj de arena) y una función que devuelve su HTML para los `divIcon` de Leaflet.
- `frontend/index.html` - `preconnect` a Google Fonts y color de la barra del navegador (`theme-color`).
- `frontend/src/App.tsx` - Solo clases: fondo, paneles de cada sección, selector de estrategia y botones de Brote Sorpresa.
- `frontend/src/components/Header.tsx` - Cabecera como barra de menú: título pixel, botones con bisel e indicador de conexión.
- `frontend/src/components/KpiCards.tsx` - Tarjetas KPI como casillas de inventario con el color de material de cada indicador.
- `frontend/src/components/SetupScreen.tsx` - Pantalla de parámetros como menú de opciones: casillas, sliders pixel, `select` y botones.
- `frontend/src/components/TerritoryPanel.tsx` - Tabla de hubs y parroquias como cuadrícula de inventario.
- `frontend/src/components/Tooltip.tsx` - Ayuda emergente con estilo de tooltip pixel.
- `frontend/src/components/MantaMap.tsx` - Marco del mapa, mosaicos con aspecto de papel, estilo de las parroquias, iconos pixel de los hubs, popups, reproductor y leyenda.
- `frontend/src/components/EpidemicCharts.tsx` - Líneas y áreas en escalón, barras como pilares de bloques, ejes, leyendas, tooltips y tarjetas.
- `frontend/src/components/MayorReportModal.tsx` - Ventana del decreto con aspecto de libro o pergamino.
- `frontend/src/components/DecreePdf.tsx` - PDF del decreto con los colores del tema (sin fuente pixel, ver notas).
- `tests/test_frontend_contract.py` - **No se modifica.** Debe seguir pasando: comprueba que el contrato y los datos del frontend no cambian.
- `README.md` - Sección "Interfaz": una línea sobre el tema visual.

**Archivos que NO se tocan:** `frontend/src/hooks/useSimulation.ts`, `frontend/src/services/api.ts`, `frontend/src/types/simulation.ts`, `frontend/src/utils/format.ts`, `frontend/src/data/*`, todo `src/` (Python), `infra/` y `tests/`.

### Notes

- El proyecto no tiene Jest. Las comprobaciones son:
  - `npm run build` dentro de `frontend/` (compila TypeScript con `tsc -b` y luego Vite).
  - `python -m unittest discover -s tests -t .` desde la raíz (incluye el contrato del frontend).
  - Revisión visual con `npm run dev` en el navegador.
- **Tailwind 4:** no hay `tailwind.config.js`. Los colores nuevos se declaran en `index.css` dentro de `@theme { --color-mc-stone: #1b1b1b; ... }` y Tailwind genera solo las clases `bg-mc-stone`, `text-mc-gold`, etc.
- **Recharts 3 (no Chart.js):** líneas y áreas en escalón con `type="stepAfter"`; esquinas rectas con `radius={0}`; sin animación suave con `isAnimationActive={false}`; los bloques de las barras se dibujan con un `<pattern>` SVG o con la propiedad `shape`. Comprobar las firmas en la documentación de Recharts 3 antes de usarlas.
- **react-leaflet 4 y Leaflet 1.9:** los iconos de los hubs se crean con `L.divIcon({ html })`. Los círculos y polígonos son SVG: `border-radius` no les afecta, se estilizan con `pathOptions`.
- **Propiedad intelectual:** el tema es una *inspiración*. Todos los iconos, texturas y patrones deben ser originales (CSS, SVG o pixel art propio). No se usan texturas, logos, fuentes ni capturas de Minecraft o Mojang, ni la palabra "Minecraft" en la interfaz.
- **Legibilidad:** `Press Start 2P` cuesta leerla por debajo de 10 px. Se usa para títulos, cifras grandes y botones; el texto corrido usa una fuente pixel más legible (`VT323`, a 18 px o más). El amarillo `#f8f800` solo va sobre fondos oscuros: sobre `#c6c6c6` no tiene contraste suficiente.
- **Licencia de mapas:** la atribución de OpenStreetMap y CARTO debe seguir visible en el mapa.
- **Rama propia:** el rediseño toca casi toda la interfaz. Se hace en su rama y solo se une a `main` si queda impecable, para no arriesgar la versión que se presenta.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Actualizar `main` (`git switch main`, `git pull`) y crear la rama `feature/tema-pixel-minecraft` (`git switch -c feature/tema-pixel-minecraft`).
  - [x] 0.2 Instalar las dependencias del frontend si faltan (`npm ci` dentro de `frontend/`) y comprobar que `npm run build` y los tests pasan **antes** de cambiar nada, para tener una línea base.
  - [x] 0.3 Tomar capturas del estado actual (pantalla de parámetros, consola, mapa, gráficas y decreto) para comparar al final.

- [x] 1.0 Crear la base del tema: paleta como variables, tipografía pixel, bisel 3D, texturas de bloques y utilidades CSS reutilizables
  - [x] 1.1 En `index.css`, cambiar el `@import` de Google Fonts por `Press Start 2P` y `VT323` *(se añadió `Silkscreen` para títulos y etiquetas: Press Start 2P dibuja reducidas las mayúsculas con tilde y no tiene Ñ)* (con `display=swap`) y añadir `preconnect` a `fonts.googleapis.com` y `fonts.gstatic.com` en `frontend/index.html`.
  - [x] 1.2 Declarar la paleta en `@theme` de Tailwind 4: piedra `#1b1b1b`, piedra media `#373737`, panel `#c6c6c6`, luz del bisel `#ffffff`, sombra del bisel `#555555`, borde `#000000`, título `#f8f800`, y los materiales pasto `#5d9b3a`, tierra `#8b5a2b`, madera `#a0773f`, redstone `#c0281e`, oro `#f2c84b`, diamante `#3fc8d6`, lapislázuli `#2a4ea8` y amatista `#8a4fc3`. Ajustar los tonos de los materiales si el contraste lo exige (tarea 6.4). *Nota: el pasto de los fondos con texto blanco quedó en `#3f7a26` y se añadió `--color-mc-redstone-dark` (`#8f1a12`) para texto rojo sobre fondos claros.*
  - [x] 1.3 Crear `frontend/src/theme/pixelTheme.ts` con las mismas constantes en JavaScript (materiales, color de cada estrategia y de cada estado SEIR, fuente y tamaño de los ejes) para Recharts y Leaflet.
  - [x] 1.4 Regla global `border-radius: 0 !important` para todos los elementos y pseudoelementos, `image-rendering: pixelated` para imágenes, canvas y mosaicos, y desactivar el suavizado de fuentes en los textos pixel.
  - [x] 1.5 Crear las utilidades de bisel 3D: `.mc-panel` (panel gris, borde claro arriba e izquierda y oscuro abajo y derecha, con un contorno negro exterior), `.mc-slot` (bisel invertido, como una casilla hundida del inventario), `.mc-panel-dark` (versión piedra oscura) y `.mc-frame-wood` / `.mc-frame-stone` (marcos gruesos de 8 px para el mapa y las gráficas).
  - [x] 1.6 Crear `.mc-button` con sus estados: normal (bisel hacia fuera), `:hover` (más claro y borde blanco), `:active` (bisel invertido, que parezca hundido), `:disabled` (gris apagado) y una variante `.mc-button-primary` (verde pasto) para "Simular".
  - [x] 1.7 Crear `.mc-title` (Press Start 2P, amarillo `#f8f800`, sombra dura de 2 px sin difuminado) y `.mc-text` (VT323 para el texto corrido).
  - [x] 1.8 Crear las texturas originales solo con CSS: fondo de piedra para el `body` (patrón de bloques de 16 px con dos o tres grises) y `.mc-block-grid` (cuadrícula fina para el mapa y las gráficas).
  - [x] 1.9 Rehacer en estilo pixel el slider (`input[type='range']`: pista recta y tirador cuadrado con bisel), la barra de desplazamiento y el estilo de impresión ya existente, sin cambiar sus selectores.
  - [x] 1.10 Foco visible para teclado: `:focus-visible` con contorno amarillo de 2 px y desplazamiento de 2 px en botones, enlaces, inputs y `select`.
  - [x] 1.11 Crear `frontend/src/components/PixelIcon.tsx` con iconos SVG originales de 16×16 dibujados con `<rect>` (antorcha, bloque de diamante, cama, escudo, moneda, calavera zombie propia y reloj de arena). Cada icono acepta `size` y `title` (para lectores de pantalla) y hay una función `pixelIconHtml(nombre)` que devuelve el SVG como texto para Leaflet.
  - [x] 1.12 Animaciones retro y accesibles: sustituir los `ping` suaves por un parpadeo con `steps(2)` y desactivarlo con `@media (prefers-reduced-motion: reduce)`.

- [x] 2.0 Aplicar el estilo de inventario a la estructura y a los controles: cabecera, paneles, botones, sliders, tarjetas KPI, pantalla de configuración, panel territorial y tooltips
  - [x] 2.1 `App.tsx`: aplicar el fondo de piedra y cambiar las clases de cada sección (`rounded-*`, `shadow-*`, `bg-white`, `border-[#...]`) por `.mc-panel`. Sin tocar la estructura JSX, los hooks ni los manejadores.
  - [x] 2.2 `App.tsx`: convertir el selector de estrategia (Cortafuegos Manta, Al Azar, Sin Intervención) en una "barra rápida" de casillas: la seleccionada con borde amarillo y bisel hundido. Los botones de Brote Sorpresa pasan a `.mc-button` con su icono pixel.
  - [x] 2.3 `Header.tsx`: barra de menú oscura, título en `.mc-title`, botones (Parámetros, Restaurar, Boletín COE, Simular) con `.mc-button`, "Simular" con `.mc-button-primary` e indicador "Conectado" como una luz pixel verde (roja si hay error), sin cambiar el texto.
  - [x] 2.4 `KpiCards.tsx`: cada tarjeta como casilla de inventario. La cifra principal en Press Start 2P y el color de material de cada indicador: contagios evitados en pasto, frente al azar en diamante, pico de zombies en redstone y gasto en oro. El icono de lucide se sustituye por su icono pixel. Los textos y las fórmulas no cambian.
  - [x] 2.5 `SetupScreen.tsx`: pantalla como menú de opciones. Grupos en `.mc-panel`, inputs numéricos y `select` como `.mc-slot`, sliders con el estilo de la tarea 1.9, y botones con `.mc-button`.
  - [x] 2.6 `TerritoryPanel.tsx`: tabla como cuadrícula de inventario, con encabezado en Press Start 2P, filas alternas en dos grises y celdas de estado con el color del material correspondiente.
  - [x] 2.7 `Tooltip.tsx`: ayuda emergente con fondo casi negro, borde morado de 2 px y texto blanco en VT323 (estilo tooltip pixel), sin sombra difuminada.
  - [x] 2.8 Revisar en todos estos componentes que no queden `shadow-*` difuminados, `backdrop-blur`, degradados suaves ni esquinas redondeadas.

- [x] 3.0 Convertir el mapa de Leaflet en un mapa de papel pixelado: marco de piedra o madera, cuadrícula de bloques, iconos pixel para los hubs, y leyenda y reproductor en paneles de inventario
  - [x] 3.1 Envolver el mapa en `.mc-frame-wood` (marco grueso de madera con bisel) en lugar de `rounded-lg border shadow-sm`.
  - [x] 3.2 Mosaicos con aspecto de mapa de papel: cambiar el estilo por defecto de CARTO de `dark_all` a uno claro (por ejemplo `voyager_nolabels` o `light_all`) y aplicar en `index.css` un filtro a `.leaflet-tile-pane` (`sepia`, `saturate`, `contrast`, **sin `blur`**) para el tono pergamino. Fondo del contenedor en color papel para las zonas sin mosaicos.
  - [x] 3.3 Cuadrícula de bloques sobre el mapa: una capa CSS (`::after` del contenedor o un `div` con `pointer-events: none`) con `.mc-block-grid`, por encima de los mosaicos y por debajo de polígonos y marcadores.
  - [x] 3.4 Estilo de las parroquias en `parishStyle`: bordes rectos de 3 px y relleno con los colores de material para los tres tramos de prevalencia (pasto por debajo de 2 %, oro de 2 % a 10 % y redstone por encima de 10 %). **Los umbrales no cambian**, solo los colores. Actualizar a la vez los colores de la leyenda.
  - [x] 3.5 Rehacer `buildHubIcon` con `pixelIconHtml`: abierto = antorcha, cortafuegos activo = escudo o bloque de piedra, vacunación en anillo = bloque de diamante. Mantener `iconSize` y `iconAnchor` coherentes con el nuevo tamaño, y conservar las mismas condiciones de estado.
  - [x] 3.6 Círculos de los hubs: trazo recto de 2 px, `dashArray` en bloques y relleno muy suave del color del estado, sin halos.
  - [x] 3.7 Popups y control de zoom de Leaflet en `index.css`: popups como `.mc-panel` con título en Press Start 2P, y botones de zoom como `.mc-button`.
  - [x] 3.8 Reproductor de días (Timeline) y leyenda como `.mc-panel`: play, pausa y reinicio con `.mc-button`, velocidades 1x, 2x y 5x como barra rápida, slider pixel y muestras de la leyenda con los mismos iconos pixel que los hubs.
  - [x] 3.9 Comprobar que la atribución de OpenStreetMap y CARTO sigue visible y legible.

- [x] 4.0 Rediseñar las gráficas de Recharts: líneas y áreas en escalón, barras como pilares de bloques, colores de materiales, y ejes, leyendas y tooltips pixelados
  - [x] 4.1 Componente `Card` de `EpidemicCharts.tsx`: marco de cofre o inventario (`.mc-panel` con franja de título oscura y `.mc-title`), y la gráfica dentro de un `.mc-slot` con la cuadrícula de bloques de fondo.
  - [x] 4.2 Gráfica de curvas (`ComposedChart`): `type="stepAfter"` en `Line` y en las `Area` de las bandas P10–P90, `strokeWidth={3}`, `strokeLinecap="square"`, `dot={false}` y punto activo cuadrado. Colores: Escudo en diamante, Al azar en oro y Sin intervención en redstone. Los `dataKey` y los datos no cambian.
  - [x] 4.3 Gráfica de estados (`AreaChart`): `type="stepAfter"` y colores de material por estado (Sano pasto, Mordido oro, Zombie redstone, Aislado amatista, Inmune diamante), usando los mismos colores que el mapa y los KPI.
  - [x] 4.4 Gráfica de gasto (`BarChart`): cada barra como pilar de bloques apilados, con un `<pattern>` SVG en `<defs>` (bloque con bisel y contorno de 1 px) o la propiedad `shape`. Un material por tipo de gasto (por ejemplo, vacunas diamante, brigadas tierra y cierres de hubs piedra), `radius={0}` y borde sólido de 2 px.
  - [x] 4.5 Ejes y cuadrícula: `tick` con Press Start 2P de 8 px (o VT323 de 14 px si no se lee), líneas de eje de 2 px y `CartesianGrid` sólido (sin `strokeDasharray`) en un gris suave.
  - [x] 4.6 Línea del día (`ReferenceLine`): sólida de 2 px en amarillo, con la etiqueta en Press Start 2P.
  - [x] 4.7 Leyendas: la leyenda propia de las curvas y los `Legend` con muestras cuadradas y texto pixel, dentro de un `.mc-slot`.
  - [x] 4.8 Tooltips (`CurveTooltip`, `SimpleTooltip`) con el mismo estilo que la tarea 2.7, y el `cursor` de Recharts como franja sólida sin transparencia difuminada.
  - [x] 4.9 `isAnimationActive={false}` en todas las series, para que las gráficas cambien "de golpe", como en un juego retro.
  - [x] 4.10 Botones "Zombies activos" y "Acumulado" como pestañas de inventario (`.mc-button`, la activa hundida).

- [x] 5.0 Adaptar el Decreto del COE (modal y PDF) al tema, como un libro o pergamino de inventario
  - [x] 5.1 `MayorReportModal.tsx`: fondo de la ventana como capa oscura sólida (sin `backdropFilter: blur`) y panel con marco de madera e interior color pergamino. Cabecera con título en `.mc-title` sobre una franja oscura.
  - [x] 5.2 Las cuatro métricas del decreto como casillas de inventario con su icono pixel y el color de material de cada una.
  - [x] 5.3 Títulos de sección en Press Start 2P y texto de las secciones (Markdown) en VT323 a 18 px o más. Las insignias de prioridad (ALTA, MEDIA, BAJA) como bloques de color sólidos.
  - [x] 5.4 Acciones prioritarias como casillas numeradas y botones (Copiar, Descargar, Imprimir, Cerrar) con `.mc-button`.
  - [x] 5.5 `DecreePdf.tsx`: solo los colores y bordes rectos del tema. **Mantener Helvetica en el PDF**: es un documento oficial para el alcalde, y `@react-pdf/renderer` necesitaría registrar un archivo de fuente propio para usar una fuente pixel. Ningún texto cambia.

- [ ] 6.0 Verificar: build y tests sin cambios de lógica, revisión visual en el navegador, contraste y accesibilidad, vista móvil y app publicada
  - [x] 6.1 Revisar `git diff --stat` y el diff de cada componente: solo deben cambiar clases, estilos, colores, iconos y propiedades visuales. No debe aparecer ningún cambio en `hooks/`, `services/`, `types/`, `utils/`, `data/`, `src/` (Python), `infra/` ni `tests/`.
  - [x] 6.2 `npm run build` dentro de `frontend/` sin errores y `python -m unittest discover -s tests -t .` con todos los tests pasando.
  - [x] 6.3 Revisión en el navegador con `npm run dev`: pantalla de parámetros, consola, las tres estrategias, los cuatro Brotes Sorpresa, reproducción del mapa a 1x, 2x y 5x, popups de los hubs, las tres gráficas, el decreto y la descarga del PDF. Consola del navegador sin errores. *Nota (28/10/2026): revisados consola, mapa, gráficas, decreto, cierre con Escape, pantalla de parámetros y vista móvil. La descarga del PDF no se probó en el navegador; solo cambian colores y bordes, y el build compila.*
  - [x] 6.4 Contraste y legibilidad: texto normal con contraste de al menos 4,5:1 y títulos grandes de al menos 3:1; ningún texto en Press Start 2P por debajo de 8 px ni en VT323 por debajo de 16 px. Revisar sobre todo el amarillo sobre gris y los textos dentro del mapa.
  - [x] 6.5 Accesibilidad básica: navegar toda la consola solo con teclado (foco visible en todo), los `aria-label` intactos y los iconos pixel con `title` o `aria-hidden`.
  - [x] 6.6 Vista móvil (375 px de ancho): sin desplazamiento horizontal, botones que se pueden pulsar y textos pixel que no se salen de sus paneles.
  - [x] 6.7 Comparar con las capturas de la tarea 0.3 y confirmar que se ven las mismas cifras, textos y controles.
  - [x] 6.8 Añadir en la sección "Interfaz" del `README.md` una línea sobre el tema pixel art, aclarando que los iconos y las texturas son originales.
  - [ ] 6.9 Commit en la rama y Pull Request a `main`. Unir solo con la aprobación del equipo y, después, comprobar que la app publicada en Amplify muestra el nuevo diseño.
