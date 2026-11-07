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
- La carga de las fuentes (`@import url(...)` de Google Fonts) esta al inicio de `src/styles.css`, junto a las variables. Cambiar de fuente = editar ese archivo; `index.html` no la declara.

## Logo e iconos

`public/logo.svg` y `public/favicon.svg` **no** se derivan de los tokens: al cambiar la identidad se reemplazan a mano.
