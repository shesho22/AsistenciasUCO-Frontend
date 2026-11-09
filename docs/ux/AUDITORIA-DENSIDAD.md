# Auditoria de densidad de acciones (CULM-001, rama feat/ux-pulido-densidad)

Metodo: recorrido de las pantallas del docente en la app corriendo (conteo de botones y enlaces de accion visibles con `main button, main a`),
mas lectura de plantillas para las de coordinador, decano y administrador (por sesion de pruebas solo el docente se pudo recorrer en vivo; el
resto se contó en el codigo). "Acciones visibles" = botones de accion sin contar pestanas, paginacion ni filas repetidas de una lista.

Patrones aplicados (componentes compartidos en `src/app/shared/components/`):

- `action-menu` ("Mas acciones"): una accion primaria visible y el resto en un menu accesible (`role="menu"`, flechas/Home/End, Escape, Tab, clic fuera, `aria-label`).
- `filtros-plegables`: busqueda siempre visible, el resto tras "Filtros" con insignia del numero de filtros activos.
- `empty-state` (ya existia, ahora con spec): estado vacio uniforme con accion opcional.
- Panel plegable "Detalles" (`<details>`) dentro de la proyeccion de QR para estado de la ventana y avisos secundarios.

## Pantallas auditadas y resultado

| # | Pantalla | Acciones visibles antes | Propuesta | Despues | Estado |
|---|----------|-------------------------|-----------|---------|--------|
| 1 | Proyeccion de QR de asistencia (`qr-proyeccion` via `toma-qr-proyeccion`) | 4 botones (Ampliar, Regenerar, Dejar de proyectar, Cerrar toma) + 2 chips + nota Wi-Fi | Solo QR, PIN, contador, programa; Ampliar/Reducir + Dejar de proyectar; resto en menu; estado y Wi-Fi en "Detalles" | 3 (Ampliar, Dejar de proyectar, Mas) con 2 en el menu | Hecho |
| 2 | Proyeccion de QR de matricula (`teacher-matricula-modal`) | 6 botones (Copiar PIN, Copiar enlace, Generar nuevo, Cerrar matricula, Ampliar, Ocultar) + 3 parrafos | Igual que el anterior; copiar, regenerar y cerrar en el menu | 3 (Ampliar, Ocultar, Mas) con 4 en el menu | Hecho |
| 3 | Toma de asistencia (`toma-asistencias`: cabecera + barra fija + filtros) | 7 acciones (Proyectar, Cerrar toma, Marcar presentes, Marcar faltantes, Guardar x2) + 6 chips de filtro | Barra: Guardar, Marcar todos presentes, menu, contador e indicador; filtros plegados; un solo Guardar | 3 en la barra (Marcar presentes, Mas, Guardar); cabecera sin botones; filtros tras "Filtros" | Hecho |
| 4 | Historial del grupo (`attendance-control` overview) | 8 (+ Sesion, Tomar lista ahora, QR/PIN, Matricular, Info, Padron, Reclamos, + Nueva Sesion) y 3 CTAs repetidas si no hay sesiones | Una primaria (+ Nueva Sesion) y menu con QR/PIN, matricular, info, padron, reclamos (con contador); sin duplicados | 3 (Tomar lista ahora, + Nueva Sesion, Mas) | Hecho |
| 5 | Detalle de sesion (cabecera de `attendance-control`) | 3 (Todos Presentes, Todos Ausentes, Proyectar QR) | Primaria + menu | 2 (Todos Presentes, Mas) | Hecho |
| 6 | Hub del grupo del docente (`teacher-grupo-hub`) | 3 (QR/PIN Matricula, Proyectar Auto-Registro, Tomar Asistencia Hoy) + codigo y chip "Grupo Activo" repetidos | Primaria + menu; sin repeticion en la barra superior | 2 (Tomar Asistencia Hoy, Mas) | Hecho |
| 7 | Admin > Facultades (tarjeta) | 4 por tarjeta (Cambiar decano, Ver programas, Editar, estado) | Primaria "Ver Programas y Planes" + menu | 2 por tarjeta | Hecho |
| 8 | Admin > Decanos y Decano > Coordinadores (cabecera) | 3 (Nombrar existente, Carga masiva CSV, Registrar nuevo) | Primaria + menu | 2 (Nombrar, Mas) | Hecho |
| 9 | Coordinador > Planes de estudio (tarjeta) | 3 por tarjeta (Editar, Activar/Inactivar, Malla y Asignaturas) | Primaria + menu | 2 por tarjeta | Hecho |
| 10 | Admin > Estudiantes (filtros) | 4 controles de filtro (busqueda, Buscar, Facultad, Estado) + cabecera con boton y chips | Busqueda y Buscar visibles; Facultad y Estado plegados | 2 visibles + "Filtros" (insignia con el conteo) | Hecho |

## Revisadas sin cambio necesario

- Hub de grupos del docente (`teacher-grupos`, lista de tarjetas): 2 acciones en la cabecera (Nuevo grupo, Toma de Asistencia) y la tarjeta es un solo objetivo de clic; ya cumple el patron.
- Decano > Estructura (`dean-estructura`): acordeon por programa, un boton por fila.
- Admin > Sistema (`admin-system`): 1 accion de cabecera; las pestanas son navegacion, no acciones.
- Coordinador > Estudiantes: 1 accion de cabecera (Materias) y un enlace por fila.

## Pendientes (fuera de esta entrega)

- Fila de sesiones del historial: un "Tomar Asistencia" por fila (11 con el grupo de prueba). La fila ya es clicable; falta decidir si se deja solo en la sesion de hoy.
- Coordinador > Docentes (2 en cabecera + 2 por fila + chips de vinculacion), Coordinador > Asignaturas y Coordinador > Grupos (4 botones).
- Decano > Programas (gestion de 4 botones) y Decano > Docentes.
- Malla curricular (`study-plan-mesh`, 7 botones) y Periodos academicos (6).
- Admin > Gestion de correos (1218 lineas, varias cabeceras) y Admin > Festivos.
- Cabeceras compactas (titulo + subtitulo + maximo 3 chips + panel "Detalles") en las cabeceras de listados: solo se aplico el panel "Detalles" a la proyeccion de QR; falta un componente de cabecera comun.
- Filtros plegables en los demas listados largos (coordinador y decano).
- Verificacion visual en vivo de coordinador, decano y administrador: el servidor de desarrollo de `:4200` sirve otro arbol de trabajo y el cliente OIDC solo admite ese origen, de modo que esta rama se reviso en modo mock en otro puerto (solo docente) y con specs.

## Comprobacion en navegador

- Escritorio y 375 px (modo mock, rama en `:4201`): historial del grupo con "+ Nueva Sesion" y "Mas" (5 opciones: QR / PIN de matricula, Matricular estudiante, Info y alumnos, Padron y retiros, Reclamos); el menu queda dentro del viewport (23 a 231 px de 375) y sin desplazamiento horizontal (`scrollWidth` 375).
- La proyeccion de QR, la toma y el hub requieren backend con datos de sesion; se validaron con specs de componente (botones visibles, menu, Escape, Detalles).
