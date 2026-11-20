# Manual de imagen UCO, tablas, espaciado y rendimiento de «Mis materias» (2026-11-19)

Rama: `feat/manual-imagen-uco`. Pedidos de John del 2026-11-19, en bloques.

## A. Rendimiento de «Mis materias» del estudiante (PERF-EST-MM)

- `EstudiantePortalCacheService` (nuevo): caché en memoria de materias, resumen y primera página de sesiones por materia y grupo, con revalidación en segundo plano. Nunca usa localStorage ni sessionStorage y se vacía al cambiar de usuario o cerrar sesión (`AuthService`).
- La página guardada de una materia se descarta tras un evento en vivo, una reconexión, un reclamo radicado o retirado, o una asistencia con PIN.
- Un solo suscriptor de reconexión (el padre) para no recargar dos veces las sesiones.
- La parte de BD va en `gestion-asistencia-db`, rama `fix/rendimiento-estudiante-mis-materias` (migración 59).

## B. Nombres en la interfaz

| Antes | Ahora |
|---|---|
| Administrador: «Estructura» | «Organigrama» |
| Docente: «Reclamos» (menú y pestaña del grupo) | «Justificaciones» |
| «Malla» / «Malla curricular» | «Plan de estudio» |
| Estudiante: pestaña «Plan de estudios» | «Materias matriculadas» |
| Marca «Gestió Asistencia» | «Gestión Asistencia» (solo textos visibles y alternativos; el nombre del paquete no cambia) |

## C. Tipo de asignatura Electiva

- El selector de componente del formulario de asignatura sale del catálogo del servidor (HU147). Por eso «electivas» (`ELE`, migración 60 de la BD) aparece sin cambiar el formulario.
- En el frontend, el plan del estudiante acepta `tipoAsignatura = ELECTIVA` y el mock incluye el componente.
- Decisión de John (opción 1): la Electiva se comporta igual que Básica; no cambia ninguna regla de matrícula.

## D. Identidad del Manual de diseño institucional UCO v8.0 (sin logo ni favicon)

- Tokens oficiales en `src/styles/uco-tokens.css`, referenciados desde `@theme` de `src/styles.css`.
- Escalas: primary = verde, accent/warning = amarillo, danger = naranja (sin rojo), info = azul, category = turquesa.
- Fuentes autoalojadas Montserrat y Poppins (`@fontsource`).
- Foco visible de 2px.
- `scripts/check-contraste-wcag.mjs` dentro de `lint:tokens`.
- Detalle en `docs/sistema-diseno-tokens.md`.

## E. Listados en tablas

- Componente compartido `app-tabla-datos` (`src/app/shared/components/tabla-datos`):
  - cabecera fija;
  - altura estable mientras carga;
  - desplazamiento horizontal en pantallas angostas;
  - estado como etiqueta de color;
  - paginación de 15 por defecto, con opciones 15, 30 y 50.
- Se convirtieron unos 40 listados de administrador, decano, coordinador, docente y estudiante. Los `data-testid` siguen en `<tr>` y en los botones.
- Siguen como tarjetas a propósito:
  - la toma de asistencia y su vista móvil;
  - el acordeón de materias matriculadas;
  - el árbol de estructura del decano;
  - «Mis materias» y el panel del estudiante;
  - los conjuntos pequeños o con tope.
- El padrón, las justificaciones del grupo y el consolidado del coordinador también pasan a 15/30/50. El backend acepta hasta 100 por página.

## F. Espaciado compacto

- Contenido principal, secciones, tarjetas, encabezado de página y tarjetas KPI más compactos (tabla en `docs/sistema-diseno-tokens.md`).
- «Asistencia del programa» del coordinador:
  - «Revisiones por resolver» entra en la fila de indicadores (ranura `[kpi-extra]`);
  - «N Grupos» va en la línea de los filtros.

## Correcciones tras la revisión en pantalla

- Pestañas con menos relleno lateral en teléfono, para que «Materias matriculadas» quepa a 390 px.
- Singular y plural en los contadores de Asignaturas y del consolidado.
- Estado vacío de Justificaciones con un solo icono y texto «Cambia el filtro de estado…».

## Fuera de alcance (de otros equipos)

- 403 de `GET /docente/sesiones/solicitudes` (sesiones, José Alejandro).
- 403 de `GET /estudiante/faltas-reclamables`.
- Logo y favicon definitivos.
