# HU178 — Rol sin ámbito: prueba en pantalla y ajustes (frontend)

Continúa `../HU178-decano-sin-facultad/PLAN.md`, que describe el mecanismo (vínculos de `GET /usuarios/perfil`,
`decanoConFacultadGuard`, `coordinadorConProgramaGuard`, `esperarPerfilGuard`, avisos `/app/decano/sin-facultad` y
`/app/coordinador/sin-programa`, aviso en el panel y barra superior con texto neutro). Ese mecanismo ya está en `develop`.
Este work item registra la prueba en pantalla del 2026-11-19 con usuarios reales y los dos ajustes que salieron de ella.

Rama local: `feat/HU074-HU178-asignatura-estado-ambito` (comparte rama con HU074, sin commit).

## Prueba en pantalla (John, 2026-11-19)

Usuarios de prueba creados con autorización de John: un decano sin facultad y un coordinador sin programa.

| Rol | Vista | Resultado |
|---|---|---|
| Decano sin facultad | Mi facultad, Seguimiento, Directorio | Aviso «sin facultad» (`/app/decano/sin-facultad`), sin errores rojos |
| Decano sin facultad | Barra superior | «Sin facultad asignada» |
| Decano sin facultad | Períodos | Muestra el calendario institucional (correcto: no depende de la facultad) |
| Decano sin facultad | Panel principal | Aviso informativo. **Defecto 1:** el encabezado seguía ofreciendo «Gestionar Coordinadores», que lleva al aviso |
| Decano sin facultad | Revisiones de cancelación | **Defecto 2:** lista vacía «Aún no hay revisiones… de tu facultad» |
| Coordinador sin programa | Asistencia, Solicitudes de sesión, Programa, Planes de estudio, Estudiantes | Aviso «sin programa» (`/app/coordinador/sin-programa`) |
| Coordinador sin programa | Barra superior | «Sin programa asignado» |
| Coordinador sin programa | Panel principal | Aviso informativo. **Defecto 1:** el encabezado seguía ofreciendo «Gestionar Docentes» y «Planes de Estudio y Malla», que llevan al aviso |
| Coordinador sin programa | Revisiones de cancelación | **Defecto 2:** lista vacía, igual que el decano |

## Ajuste 1: encabezado del panel sin acciones que solo llevan al aviso

- `OverviewHeroComponent` recibe `sinEntidadAsignada` (por defecto `false`).
- `OverviewComponent.heroSinEntidad` es `true` solo si al **rol activo** le falta su entidad (`decanoSinFacultad` con
  rol DECANO, `coordinadorSinPrograma` con rol COORDINADOR). Un vínculo de otro rol no cubre la entidad del rol activo, y
  si el perfil aún no informa vínculos no se presume la falta (las acciones se muestran, como antes).
- Con `sinEntidadAsignada` el encabezado:
  - oculta «Gestionar Coordinadores» (decano) y «Gestionar Docentes» / «Planes de Estudio y Malla» (coordinador);
  - recorta la frase descriptiva a «Decanatura — Sin facultad asignada.» / «Coordinación Académica — Sin programa
    asignado.» para no prometer gestiones que no puede hacer. La frase es texto del propio template (no está en el
    catálogo de mensajes), así que el ajuste es trivial y no toca el catálogo.
- El aviso informativo de abajo (`app-sin-entidad-asignada`) se queda igual.
- Los enlaces del encabezado llevan `data-testid` (`hero-accion-decano-coordinadores`,
  `hero-accion-coordinador-docentes`, `hero-accion-coordinador-planes`) para las pruebas.

## Ajuste 2: guarda de ámbito en Revisiones de cancelación

- `decano/revisiones-cancelacion`: `canActivate: [roleGuard, decanoConFacultadGuard]`.
- `coordinador/revisiones-cancelacion`: `canActivate: [roleGuard, coordinadorConProgramaGuard]`.
- Motivo: los procedimientos del listado filtran por la facultad del decano o el programa del coordinador; sin ámbito
  responde 200 pero siempre vacío, y la vista decía «Aún no hay revisiones… de tu facultad», que da a entender que sí
  tiene facultad. Con la guarda llega al mismo aviso que el resto de vistas del rol.
- Esto corrige la decisión del 2026-11-16 de no bloquear Revisiones (ver la nota en `../HU178-decano-sin-facultad/PLAN.md`).
- `decano/periodos` **no** lleva guarda: es el calendario institucional y se verificó en pantalla que funciona sin
  facultad.

## Fuera de alcance

- Sin cambios de backend, BD ni contrato (no aplica `CONTRACT.md`).
- El menú lateral no cambia: las entradas siguen visibles y llevan al aviso, que es lo que se validó en pantalla.
