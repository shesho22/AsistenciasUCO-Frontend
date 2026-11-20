# Sistema de diseno: tokens de color y tipografia

Fuente unica de verdad: el bloque `@theme` de `src/styles.css`. Este documento describe el uso de cada token **sin copiar sus valores**; para ver o cambiar un valor se edita `styles.css`.

## Reglas

- Los componentes solo usan tokens (`bg-success-50`, `text-danger-700`, `border-border-subtle`...). La paleta por defecto de Tailwind esta anulada (`--color-*: initial`).
- Quedan prohibidos en `src/**` (salvo `styles.css` e `index.html`): clases de la paleta por defecto (`emerald-*`, `red-*`, `gray-*`...), hex, `rgb()`/`hsl()`. Lo verifica `npm run lint:tokens`, que forma parte de `npm run verify`.
- Si una libreria externa necesita un color o fuente como valor JS, se lee con `readDesignToken('--color-primary-700')` (`src/app/shared/utils/design-tokens.ts`).
- Se permiten `white`, `black`, `transparent`, `current` e `inherit`.

## Tokens de color

| Token (escala 50-950 salvo indicacion) | Uso |
| --- | --- |
| `primary-*` | Marca institucional: botones principales, navegacion activa, foco, cabeceras destacadas. |
| `accent-*` | Acento secundario de marca. |
| `warm-*` | Neutros calidos de la UI (fondos, texto, bordes). |
| `success-*` | Estado exitoso, activo, vigente, presente, cupo disponible. Apunta a `primary`. |
| `danger-*` | Error, rechazo, ausente, accion destructiva, cupo agotado. |
| `warning-*` | Advertencia, pendiente, riesgo. Apunta a `accent`. |
| `info-*` | Informacion neutra, ayudas, enlaces informativos. |
| `neutral-*` | Texto secundario y estados inactivos o grises. Apunta a `warm`. |
| `category-*` (50, 100, 200, 700) | Color categorico no semantico (bloques de horario). |
| `surface`, `surface-muted` | Fondo de tarjeta y fondo de pagina. |
| `on-surface`, `on-primary` | Texto sobre superficie y texto sobre `primary`. |
| `border-subtle` | Borde sutil. |
| `attendance-present`, `-absent`, `-excused`, `-risk` (+ variante `-soft`) | Estados de asistencia; apuntan a success, danger, info y warning. |
| `avatar-1` a `avatar-8` | Fondos de los avatares de iniciales (texto blanco). |

Decision de significado: `emerald` se migro a `success` cuando comunica estado y a `primary` cuando es marca (botones, hover, foco, degradados); `red`/`rose` a `danger`; `amber`/`yellow` a `warning`; `sky`/`blue` a `info`; `gray` a `neutral`; `purple` a `category`.

## Contraste minimo WCAG AA (pares de uso)

Texto normal exige 4.5:1; texto grande (18 px negrita o 24 px) y elementos graficos exigen 3:1. Razones calculadas con los valores actuales; si se cambia la identidad hay que recalcularlas.

| Texto / fondo | Razon | Uso permitido |
| --- | --- | --- |
| `on-surface` / `surface` | 17.5 | Texto general. |
| `on-surface` / `surface-muted` | 16.7 | Texto general. |
| `neutral-600` / `surface` | 7.6 | Texto secundario. |
| `neutral-500` / `surface` | 4.8 | Texto secundario minimo. |
| `on-primary` / `primary-700` | 5.5 | Botones principales (minimo `primary-700`). |
| `on-primary` / `primary-600` | 3.8 | Solo texto grande o iconos. |
| `success-800` / `success-100` | 6.8 | Insignias de exito. |
| `success-700` / `success-50` | 5.2 | Texto de exito. |
| `danger-800` / `danger-100` | 6.8 | Insignias de error. |
| `danger-700` / `danger-50` | 5.9 | Texto de error. |
| `warning-800` / `warning-100` | 6.4 | Insignias de advertencia. |
| `warning-700` / `warning-50` | 4.8 | Texto de advertencia. |
| `info-800` / `info-100` | 6.6 | Insignias informativas. |
| `info-700` / `info-50` | 5.6 | Texto informativo. |
| `primary-700` / `surface` | 5.5 | Enlaces y texto de marca. |
| `on-surface` / `attendance-present-soft` | 15.4 | Texto sobre fondos suaves de asistencia. |
| blanco / `avatar-1`..`avatar-8` | 5.0 a 10.3 | Iniciales del avatar. |

Los tokens solidos `attendance-present` (3.8), `-excused` (4.1) y `-risk` (3.2) cumplen 3:1 solo como relleno o indicador grafico sobre `surface`; para texto se usan las escalas `-700`/`-800` sobre su variante `-soft`.

## Tipografia

- `--font-sans`: texto general y UI. `--font-serif`: titulares y cifras destacadas.
- Desde el 2026-11-19 (Manual de diseno institucional UCO v8.0) las fuentes son Montserrat (titulos, `--font-serif` / `--font-titulos`) y Poppins (texto, `--font-sans`), autoalojadas con paquetes `@fontsource` importados al inicio de `src/styles.css` (sin CDN ni Google Fonts). Cambiar de fuente = cambiar esos paquetes e imports; `index.html` no la declara.

## Logo e iconos

`public/logo.svg` y `public/favicon.svg` **no** se derivan de los tokens: al cambiar la identidad se reemplazan a mano.

## Tablas de datos (bloque E, 2026-11-19)

- Componente: `app-tabla-datos` (`src/app/shared/components/tabla-datos/tabla-datos.component.ts`). Se le proyectan `<thead>` y `<tbody>` (y `<colgroup>` si hace falta) y aporta:
  - **Cabecera fija:** el marco tiene altura maxima (`alturaMaxima`, 70vh por defecto) y los `th` son `sticky`.
  - **Tamano estable:** mientras `cargando` dibuja filas de esqueleto y reserva la altura que tenia la tabla, asi la vista no salta al paginar, filtrar o recargar. `fija` activa `table-layout: fixed` para anchos de columna estables.
  - **Pantallas angostas:** `anchoMinimo` (40rem por defecto) hace que la tabla se desplace de lado en vez de encoger el texto.
  - **Vacio:** `vacio` + `mensajeVacio` pintan una fila con el mensaje.
  - **Paginacion:** `paginada` muestra `app-pagination` con 15 por pagina por defecto y opciones 15/30/50 (`TAMANO_PAGINA_TABLA`, `TAMANOS_PAGINA_TABLA`). Para listas en memoria se usa `paginarEnCliente(items, pagina, tamano)` y se vuelve a la pagina 1 al filtrar.
  - **Accesibilidad:** region desplazable con `aria-label`, `tabindex="0"` y `caption` oculto; `aria-busy` mientras carga.
- Utilidades CSS en `src/styles.css`: `tabla-contenedor` (marco con desplazamiento) y `tabla` (cabecera pegajosa en `bg-warm-100`, celdas `px-3 py-2`, fila resaltada al pasar el mouse) para tablas que no usan el componente.
- Reglas: el estado va como etiqueta de color (`app-badge` o el badge de estado del dominio); los `data-testid` de cada elemento van en el `<tr>` y los de las acciones en sus botones; orden mas reciente primero cuando hay fechas.

## Espaciado compacto (bloque F, 2026-11-19)

| Elemento | Antes | Ahora |
|---|---|---|
| Contenido principal (`dashboard-layout`) | `p-4 sm:p-6 lg:p-8` | `p-3 sm:p-4 lg:p-6` |
| Separacion entre secciones | `space-y-6` / `space-y-8` | `space-y-4` / `space-y-5` |
| Tarjeta de seccion | `superficie p-6` / `p-8` | `superficie p-4` / `p-5` |
| Rejillas de tarjetas | `gap-6` | `gap-4` |
| Encabezado de pagina (`app-page-header`) | h1 `text-2xl sm:text-3xl`, `gap-4`, en tarjeta `p-6` | h1 `text-xl sm:text-2xl`, `gap-3`, en tarjeta `p-4` |
| Tarjeta KPI (`app-kpi-card`) | `p-4`, valor `text-2xl` | `px-4 py-3`, valor `text-xl`; ocupa todo el alto de su celda |

Coordinador, «Asistencia del programa»: «Revisiones por resolver» ocupa la primera columna de la fila de indicadores (dos filas de alto en pantallas anchas, ranura `[kpi-extra]` de `app-coordinator-indicators`) y el contador «N Grupos» va en la misma linea que los filtros del consolidado, para que la tabla de grupos se vea sin desplazar a 1366x768.
