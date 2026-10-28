# Design_MC: reglas de diseño de minecraft.net

Sistema de diseño extraído de las hojas de estilo reales del sitio (`mc-components.min.css`, `clientlib-site.min.css` y `helpmain.css` del Help Center), que comparten las siete páginas pedidas:

- https://www.minecraft.net/es-es
- https://www.minecraft.net/es-es/about-minecraft
- https://www.minecraft.net/es-es/marketplace/category/skin-packs
- https://www.minecraft.net/es-es/article
- https://www.minecraft.net/es-es/minecraft-tips-for-beginners
- https://help.minecraft.net/hc/en-us
- https://www.minecraft.net/es-es/choose-your-game

Los valores son los tokens CSS (`--mc-*`) y las reglas que el sitio declara, medidos el 2026-10-28. Todas las páginas usan la misma biblioteca de componentes (prefijo `MC_`); lo que cambia entre páginas es el **tema** (`MC_Theme_*`), no las reglas.

---

## 1. Principios generales

1. **Pixel art con carácter, pero lectura limpia.** Los títulos y botones usan fuentes pixeladas; el cuerpo de texto usa una sans-serif neutra (Noto Sans) para legibilidad.
2. **Cero redondeo.** `border-radius: 0` es la regla (57 usos, más 7 con `!important`). Solo es circular (`50%`) algún elemento puntual como indicadores. Todo es de esquinas rectas, como un bloque.
3. **Profundidad por "biselado", no por sombras difusas.** Los botones y paneles simulan bloques con sombras internas duras (`inset`) de 2 a 6 px, sin desenfoque.
4. **Escala de 6 tonos por color.** Cada color tiene variantes `-1` (más claro) a `-6` (más oscuro), usadas para fondo, borde, bisel y sombra del mismo elemento.
5. **Un tema por juego.** Cada producto (Vanilla, Dungeons, Legends, Realms, Marketplace, Education) trae su propia paleta y su fuente, pero comparten estructura, espaciado y componentes.
6. **Accesibilidad explícita.** Hay estilos para `forced-colors: active` (más de 190 reglas), `prefers-reduced-motion: reduce` y anillos de foco visibles.
7. **Mayúsculas y tracking en las acciones.** Los botones principales van en MAYÚSCULAS, peso 800 y `letter-spacing: .03em`.

---

## 2. Color

### 2.1 Núcleo (Core)

| Token | Valor | Uso |
|---|---|---|
| `--mc-core-rich-black` | `#000000` | Texto sobre claro, bordes de bisel |
| `--mc-core-off-black` | `#171615` | Bordes de botón, fondos muy oscuros |
| `--mc-core-white` | `#ffffff` | Texto sobre oscuro (`--mc-page-default-color`), bordes de foco |
| `--mc-core-off-white` | `#fcf5f1` | Fondo claro cálido (`--background-color`) |
| `--mc-core-grey-1` | `#ede5e2` | Gris más claro |
| `--mc-core-grey-2` | `#d0c5c0` | Color secundario del tema (`--mc-theme-secondary-color`), bordes de botón fantasma |
| `--mc-core-grey-3` | `#aba09c` | Bisel inferior de botones claros |
| `--mc-core-grey-4` | `#6b6562` | Texto atenuado, bordes de imagen |
| `--mc-core-grey-5` | `#3d3938` | Fondo de leyendas, borde de bisel (luz) |
| `--mc-core-grey-6` | `#262423` | Fondo oscuro principal, texto sobre claro |

Los grises son **cálidos** (tinte marrón-rosado), nunca grises azulados puros.

Gradientes del núcleo:

```css
--mc-core-gradient-dark-grey:  linear-gradient(180deg, #3d3938, #262423 50%, #171615);
--mc-core-gradient-light-grey: linear-gradient(180deg, #fcf5f1, #ede5e2 50%, #d0c5c0);
--mc-core-gradient-green:      linear-gradient(180deg, #6cc349, #52a535 50%, #3c8527);
--mc-marketplace-gradient-gold: linear-gradient(270deg, #fff27a, #ffc42b);
```

### 2.2 Verde Vanilla (color de marca y acción principal)

| Paso | Hex |
|---|---|
| green-1 | `#a0e081` |
| green-2 | `#86d562` |
| green-3 | `#6cc349` (enlaces, `--mc-vanilla-green-link-color`) |
| green-4 | `#52a535` |
| green-5 | `#3c8527` |
| green-6 | `#2a641c` (texto verde sobre claro en el Help Center) |

Enlace al pasar el cursor: blanco (`--mc-vanilla-green-link-hover-color`).

### 2.3 Paletas por tema

**Marketplace (oro)** `gold-1 #fff27a`, `gold-2 #ffd953`, `gold-3 #ffc42b`, `gold-4 #db9f21`, `gold-5 #b87918`, `gold-6 #94540e`. Más grises equivalentes al núcleo (`marketplace-grey-1..6`).

**Dungeons (naranja y rojo)**
- Naranja: `#fff27a`, `#ffd953`, `#ffc42b`, `#ffa41f`, `#ff791a`, `#de5b0d`. Enlace `orange-4 #ffa41f`, hover blanco.
- Rojo: `#ff925b`, `#ff6d3a`, `#ff481b`, `#da3a16`, `#b42d10`, `#8f1f0b`.
- Mulberry (fondos): `#7b0d3a`, `#6c0e37`, `#530f33`, `#4f1030`, `#32122a`, `#190d19`.

**Dungeons 2 (azul y cian)**
- Azul: `#298aa5`, `#146f95`, `#005483`, `#013565`, `#011d47`, `#010d29`. Rich blue `#002da5`.
- Cian: `#d9fcff`, `#a3f7ff`, `#6cefff`, `#36e6ff`, `#03dafa`, `#03bde1`.
- Naranja claro `#fdfdc2`; rojos `#ff481b` a `#210d0d`.

**Legends**
- Azul claro: `#acf2ff`, `#95e8ff`, `#70dfff`, `#4ad5ff`, `#39b9eb`, `#339cd7`. Enlace `light-blue-4 #4ad5ff`.
- Azul oscuro: `#007ff2`, `#005dcf`, `#003bab`, `#00337d`, `#00215c`, `#001236`.
- Naranja claro: `#fddf93`, `#fad36f`, `#f6c25a`, `#f1ad42`, `#e89133`, `#de7523`.
- Ultra oscuros: azul `#071927`, naranja `#271505`.

**Realms (púrpura y rosa)**
- Deep blue (púrpura): `#bca4ec`, `#8d68e0`, `#643acb`, `#401cac`, `#210a80`, `#0c0248`, `#050029`.
- Rosa: `#fb95e2`, `#f460d2`, `#e833c2`, `#d812b4`, `#a40094`, `#7f007a`. Enlace `pink-3 #e833c2`.

**Vanilla extra**
- Azul: `#5b9ffb`, `#3a87f4`, `#1e6eea`, `#0855db`, `#0040c8`, `#002fae`.
- Marrón (tierra): `#c28e64`, `#ad7a54`, `#976746`, `#805539`, `#66412c`, `#492d1f`.
- Gris frío: `#8089a2`, `#6c748c`, `#5d647a`, `#4d5466`, `#3d4250`, `#2c2f3a`.

### 2.4 Estados y semánticos

| Token | Valor | Uso |
|---|---|---|
| `--mc-default-focus` | `#1157be` | Anillo de foco (azul) |
| `--mc-default-caution` | `#e2b923` | Advertencia |
| `--mc-default-warning` | `#ca3636` | Error |
| `--mc-default-warning-2` | `#ff605e` | Error sobre oscuro |
| `--mc-text-highlight-color` | `#c736ff` | Resaltado de texto (magenta) |

Help Center (fondo claro): texto `#262423`, texto secundario `#58585a`, `#1e1e1f` y `#6b6562`, verde `#2a641c`, enlace/foco `#1157be`, error `#c02d2d`, blanco sobre secciones oscuras.

### 2.5 Reglas de uso del color

- Fondos oscuros: `grey-6 #262423` o `off-black #171615`, texto blanco.
- Fondos claros: `off-white #fcf5f1`, texto `grey-6` o negro.
- En una pieza se combina un color con **sus propios pasos**: fondo `-3`, bisel claro `-2`, bisel oscuro `-4` (ver botones).
- Enlaces sobre oscuro: color del tema (verde-3, naranja-4, azul-4, rosa-3) y **blanco al pasar el cursor**.
- Hay variantes de alto contraste (`_HC`) de varios sprites y estilos para `forced-colors`.

---

## 3. Tipografía

### 3.1 Familias

| Rol | Fuente | Pila de respaldo |
|---|---|---|
| Cuerpo / UI por defecto | **Noto Sans** | `"Noto Sans","Helvetica Neue","Helvetica","Arial",sans-serif` |
| Títulos Vanilla y Realms | **Minecraft Ten v2** (`MinecraftTenv2`) | + pila Noto Sans |
| Títulos Legends | **Minecraft Seven v2** (`MinecraftSeven-v2`) | + pila Noto Sans |
| Dungeons | **Minecraft Five v2** (`Minecraft-Fivev2`) | + pila Noto Sans |
| Dungeons 2 | **Minecraft Sixteen** (`MinecraftSixteen`) | + pila Noto Sans |
| Gellix (marketing puntual) | **Gellix** | + pila Noto Sans |
| Código / resaltado | `SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace` | |

Regla: **fuente pixel para títulos, botones y etiquetas cortas; Noto Sans para párrafos, listas y formularios.** El Help Center usa 33 veces Noto Sans, 15 Minecraft Seven v2 y 11 Minecraft Ten v2.

### 3.2 Escala de tamaños (la más usada primero)

`0.875rem` (14px, 146 usos, tamaño base de UI), `1rem` (16), `1.25rem` (20), `1.5rem` (24), `1.125rem` (18), `3.5rem` (56), `2rem` (32), `0.75rem` (12), `3rem` (48), `2.25rem` (36), `4.5rem` (72), `1.375rem` (22), `1.875rem` (30).

### 3.3 Encabezados (tema Vanilla, escritorio)

| Nivel | Tamaño | Interlineado | Tracking |
|---|---|---|---|
| H1 | 4.5rem (72px); 5rem en variantes grandes | igual al tamaño (1:1) | `-0.015em` |
| H2 | 3.5rem (56px) | 3.5rem | `-0.015em` |
| H3 | 1.5rem a 2.5rem | 2.5rem en la variante grande | `.04em` |
| H4 | 1.25rem a 1.5rem | 1.25rem a 1.75rem | normal |
| H5 | 1.125rem, sans (Noto Sans) | 1.5rem | `-0.015em` |

En Dungeons los H1/H2 bajan a 3.5rem / 2.5rem. En móvil los tamaños se reducen con las mismas proporciones.

### 3.4 Reglas de texto

- Interlineado de cuerpo: `20px` o `24px` (también `1.25rem`); los títulos pixel usan interlineado 1:1.
- `text-transform: uppercase` en 122 reglas (botones, etiquetas, navegación); `capitalize` en 13.
- Tracking típico: `.03em` en botones, `.04em` en H3, `-.015em` en títulos grandes, `1.12px` y `.56px` en etiquetas pequeñas en mayúsculas.
- Pesos: 600 en botones rellenos, **800** en botones fantasma y de oro; negrita en títulos.
- Texto blanco sobre fondos oscuros, negro o `grey-6` sobre claros. El texto de insignias sobre fondo oscuro usa `off-black`.

---

## 4. Espaciado y layout

### 4.1 Escala de espacio

Base de **4 px / 8 px**. Valores de `gap` por frecuencia: `8px` (123), `16px` (118), `24px` (81), `12px` (39), `6px` (31), `4px` (22), `32px` (19).

Padding frecuente: `16px`, `8px`, `24px`, `0 16px`, `0 24px`, `6px`. Gutter de columnas de tarjetas: `24px` (`--column-gap-size`). Padding interno de tarjeta: `.875rem` (`--card-padding`).

Unidad de bloque del fondo ("block-unit"): **45px / 90px**, la cuadrícula con la que se componen los paisajes (`--blockSize`, `--blocksHigh` 24 o 28).

### 4.2 Contenedor y rejilla

- Ancho máximo del contenido configurable por sección con `--grid-size`: `1200px` (lectura/artículos), `1280`, `1440`, `1800` y `1920px` (secciones hero/anchas); tope absoluto del layout `1920px`; hay secciones hasta `2560px` para pantallas ultra anchas.
- Medios y cuerpo de texto con anchos propios: cuerpo de bloque de medios `580px`, contenedor de medios `888px`.
- Cabecera global fija de **80px** (`--mc-globalHeaderHeight`).
- Rejillas de tarjetas por `--col-count`: 1 columna en móvil, 2 en tablet, 3 a 5 en escritorio (`repeat(n, minmax(auto, 1fr))`).

### 4.3 Puntos de quiebre

| Rango | Comportamiento |
|---|---|
| `max-width: 576px` | Móvil pequeño |
| `max-width: 767.98px` | Móvil (99 reglas) |
| `min-width: 768px` | Tablet y escritorio (78 reglas) |
| `max-width: 1000px` | Tablet ancha |
| `max-width: 1199.98px` / `min-width: 1200px` | Escritorio grande (55 reglas) |

Enfoque: reglas base de escritorio con ajustes a 768 y 576; el menú móvil se desliza (`mobileNavSlideIn/Out`).

---

## 5. Componentes

### 5.1 Botones

Base `MC_Button`: borde de **2px**, `display: inline-flex`, `min-width: 90px`, `font-size: 1rem`, `line-height: 1rem`, padding `.75rem .8125rem` (primario) / `.6875rem .8125rem` (secundario), sin subrayado, `outline: 1px solid transparent` (para modo de alto contraste). El botón principal de héroe sube a `1.25rem` y `min-width: 100%` en móvil. Puede ocupar todo el ancho (`MC_Button_Style_FullWidth`).

**Bisel** (la firma visual): fondo del color `-3` o claro, más una sombra interna inferior de 6px (o 2px en oro) del paso oscuro del mismo color.

| Estilo | Fondo | Bisel | Texto |
|---|---|---|---|
| Light Blue | `#acf2ff` | `inset 0 -6px 0 #339cd7` | `#071927`, peso 600 |
| Off White | `#fcf5f1` | `inset 0 -6px 0 #aba09c` | `#3d3938`, peso 600 |
| Light Orange | `#fddf93` | `inset 0 -6px 0 #de7523` | `#071927`, peso 600 |
| Orange 4 | `#ffa41f` | `inset 0 -6px 0 #ff791a` | `#262423`, peso 600 |
| Gold (Marketplace) | `#ffc42b` | `inset 0 -2px 0 #db9f21, inset 0 2px 0 #ffd953` | `#071927`, peso 800, MAYÚSCULAS |
| Green (principal) | gradiente verde `#6cc349 > #52a535 > #3c8527` | sombra `drop-shadow(0 4px 0 rgba(0,0,0,.25))` | blanco |

**Fantasma (contorno):** fondo transparente, borde 2px y texto del mismo color (grey-2, off-white, light-orange-1, cyan-3, gold-3), peso 800, `letter-spacing: .03em`, MAYÚSCULAS. El botón transparente blanco usa borde `2px solid #fff`.

**Insignia (`MC_Button_Badge`):** fondo transparente, borde 2px, alto mínimo `32px`, padding `4px 10px`, texto blanco; versión solo icono con padding `4px`.

**Panel biselado de 4 lados** (barras, tarjetas, casillas):
```css
box-shadow: inset 0 -4px 0 0 #000,  inset -4px 0 0 0 #3d3938,
            inset 4px 0 0 0 #000,   inset 0 4px 0 0 #3d3938;
/* variante clara */
box-shadow: inset 2px 2px 0 0 hsla(0,0%,100%,.6), inset -2px -2px 0 0 hsla(0,0%,100%,.4);
```

**Estados**
- *Hover:* gradiente de hover propio (`--hero-hover-background-gradient`), enlaces a blanco; transición `.3s ease`.
- *Foco visible:* `box-shadow: 0 0 0 2px #1157be` o `0 0 0 3px #fff` más `outline: 3px solid` del color de foco; nunca se quita el contorno.
- *Activo/seleccionado:* borde del color `-3` del tema (`--activeBorderColor`), resplandor cian en Dungeons 2 (`0 0 10px rgba(150,245,255,.7), 0 0 22px rgba(80,200,230,.4)`).

### 5.2 Enlaces

Texto con glifo de flecha cuadrada de 7×7px al final (`MC_Glyph_Link_A`, `margin-left: 12px`), color del tema y blanco al pasar el cursor. Foco: `outline: 2px solid #1157be` más `box-shadow: 0 0 0 1px #fff`.

### 5.3 Tarjetas (Card, imageGrid, mediaBlock)

- Esquinas rectas, borde de imagen en `grey-4 #6b6562`, padding `.875rem`, separación `24px`.
- Imagen arriba o al fondo, texto debajo, etiqueta pequeña en MAYÚSCULAS y botón de acción.
- Las tarjetas pueden tener un personaje "asomándose" (`cardCharacterPeek`, `cardSoulPeek`) al pasar el cursor.
- Sombras: casi todo es `box-shadow: none`; el relieve viene del bisel, no de sombras suaves.

### 5.4 Cabecera, navegación y pie

- Cabecera de 80px, logotipo alineado a la izquierda (`--align-logo: start`), enlaces en MAYÚSCULAS, menú móvil con deslizamiento.
- Menú de opciones (`optionsMenu`) con 1 a 5 columnas según ancho.
- Pie con enlaces sobre fondo `off-black`.

### 5.5 Formularios, controles y Help Center

- Deslizador de rango con pulgar cuadrado, foco `0 0 0 2px #fff` y contorno de 3px.
- Help Center: fondo claro, texto `#262423`, títulos en Minecraft Seven/Ten, buscador con foco azul `#1157be`, enlaces verdes oscuros `#2a641c`, errores `#c02d2d`; ancho máximo con `--grid-size`.
- Insignias de cinta (`badgeA`) con fondo de color del tema (verde-2, oro-2) y texto `off-black`.

---

## 6. Imagen y decoración

- **Hero con paralaje de paisaje**: capas de fondo en bloques de 45/90px con criaturas (murciélago, cerdo, zombi, esqueleto, creeper, abeja, gallina, Steve) y partículas (pétalos de cerezo, destellos).
- Sprites animados por hojas de sprites PNG (`--bg-asset: url(...)` con `steps()`), variantes de día y de noche, y versiones `_HC` de alto contraste.
- Imágenes sin esquinas redondeadas; mantener `image-rendering` nítido para pixel art.
- Fondos de partículas (`background_particles.png`) en bloques de medios.
- Degradados solo verticales (180deg) de 3 paradas para dar volumen a un bloque; el degradado dorado es horizontal (270deg).
- Iconos cuadrados con `clip-path` (glifos recortados en cuadrícula de píxeles), no iconos redondeados.
- Los temas aplican paisajes distintos: Overworld (verde/azul), Nether/Dungeons (naranja/rojo), Realms (púrpura/rosa), Legends (azul/naranja).

---

## 7. Animación y movimiento

### 7.1 Transiciones

| Valor | Uso |
|---|---|
| `.3s ease` | Hover/foco generales (el más común) |
| `.2s ease-in-out` | Cambios rápidos de color y estado |
| `transform .1s ease-out` | Respuesta de pulsación inmediata |
| `.7s ease-out` (left/right/width) | Barras, paneles, indicadores que se deslizan |
| `opacity .5s linear` | Desvanecimientos |
| `transform .8s` | Movimientos amplios |
| `top 3s ease` | Desplazamientos ambientales lentos |

Easing: lineal para opacidad y ambiente, `ease`/`ease-out` para UI; una curva propia `cubic-bezier(.34, .13, .21, 1)` en la animación de sacudida.

### 7.2 Animaciones (`@keyframes`, 21)

| Nombre | Efecto |
|---|---|
| `mcAnimateFadeIn` / `FadeOut` | Aparece/desaparece, `.25s ease-in forwards` |
| `mcAnimateFadeInUp` / `FadeOutDown` | De `opacity 0` y `translate3d(0,100%,0)` a su sitio |
| `mcAnimateGlyphDown` | Entrada del glifo de flecha |
| `mobileNavSlideIn` / `SlideOut` | Menú móvil deslizante |
| `rollingClouds` | Nubes, `180s linear infinite` |
| `youShookMeAllNightLong` | Sacudida de 1s con curva propia |
| `MCHeroParallax*` | Murciélagos, cerdo, zombi, esqueletos y parpadeo de la ventana del héroe |
| `loadingIconA_*` | Cargador de 2s, `linear infinite` |
| `MCAnimations` | Reproducción de hojas de sprites |

### 7.3 Reglas de movimiento

- Duraciones de UI entre **100 ms y 300 ms**; lo ambiental (nubes, criaturas) es lento y continuo.
- Entradas de contenido: fade con ligero desplazamiento hacia arriba.
- **Respeto de `prefers-reduced-motion: reduce`**: se desactivan animaciones (`animation: none !important`) y transiciones (`transition: none`).
- El movimiento decorativo nunca bloquea la lectura; los textos no animan su posición al cargar.

---

## 8. Accesibilidad

- Foco siempre visible: azul `#1157be` (claro) o blanco (oscuro), con anillo doble (`box-shadow` + `outline`).
- `forced-colors: active` y variantes por esquema de color (`prefers-color-scheme` claro/oscuro) para casi todos los componentes.
- Contraste: texto blanco sobre `#262423`/`#171615`; texto oscuro (`#071927`, `#262423`) sobre botones claros o dorados.
- Bordes transparentes de 1px en botones para que sigan visibles en modo de alto contraste.
- Sprites con versión de alto contraste (`_HC`).

---

## 9. Resumen para aplicar el estilo en un proyecto propio

```css
:root {
  /* color */
  --bg-dark: #262423;  --bg-darker: #171615;  --bg-light: #fcf5f1;
  --text-on-dark: #ffffff;  --text-on-light: #262423;
  --accent: #6cc349;  --accent-dark: #3c8527;  --accent-light: #a0e081;
  --gold: #ffc42b;  --focus: #1157be;  --danger: #ca3636;  --caution: #e2b923;
  /* tipografía */
  --font-ui: "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-pixel: "Minecraft Ten v2", "Noto Sans", sans-serif;
  /* espacio (base 4/8) */
  --s-1: 4px; --s-2: 8px; --s-3: 16px; --s-4: 24px; --s-5: 32px;
  /* forma y movimiento */
  --radius: 0;
  --t-fast: .1s ease-out; --t-base: .3s ease;
}
.btn {
  border: 2px solid var(--bg-darker); border-radius: 0;
  padding: .75rem .8125rem; font: 600 1rem/1 var(--font-ui);
  letter-spacing: .03em; text-transform: uppercase;
  background: var(--accent); color: #fff;
  box-shadow: inset 0 -6px 0 var(--accent-dark);
  transition: filter var(--t-base);
}
.btn:focus-visible { outline: 3px solid var(--focus); box-shadow: 0 0 0 2px #fff; }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
```

Checklist rápido:

1. Esquinas rectas, bordes de 2px, relieve con `inset` duro, sin sombras difusas.
2. Fondos oscuros cálidos (`#262423`), texto blanco, verde `#6cc349` como acción principal.
3. Títulos en fuente pixel con interlineado 1:1; párrafos en Noto Sans 14 a 16px.
4. Botones en MAYÚSCULAS con `letter-spacing: .03em`.
5. Espaciado en múltiplos de 4/8 (gap 8, 16, 24); contenedor 1200 a 1920px; quiebres en 576, 768 y 1200.
6. Transiciones de 100 a 300 ms; respetar `prefers-reduced-motion`; foco visible siempre.

---

### Notas de método y límites

- Extraído de CSS publicado, no de capturas: los valores son exactos, pero algunas reglas dependen del tema de cada página (p. ej. `/choose-your-game` mezcla Vanilla, Dungeons, Legends y Realms; el Help Center usa el tema claro).
- Los tamaños de H1 a H5 y los tracking se leen de `MC_Heading_*` y varían por tema; aquí se da el valor de Vanilla en escritorio.
- Las fuentes Minecraft son propiedad de Mojang/Microsoft y no se pueden reutilizar libremente; para un proyecto propio usa una fuente pixel con licencia abierta (por ejemplo, Press Start 2P, Silkscreen o Pixelify Sans) y conserva el resto de las reglas.
- Los activos gráficos (sprites, paisajes, logotipos) son marcas y arte con derechos; este documento solo recoge las reglas de diseño.
