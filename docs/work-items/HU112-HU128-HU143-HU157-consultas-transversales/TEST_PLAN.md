# TEST_PLAN — HU112-HU128-HU143-HU157-consultas-transversales

| Spec | Cobertura |
|---|---|
| `consultas-transversales.service.spec.ts` | Rutas del decano y del administrador; paginación; filtros vacíos omitidos; `false` sí se envía. |
| `listado-paginado.spec.ts` | Carga, página, tamaño y búsqueda (vuelve a la página 1); respuesta vacía; error que limpia la lista y avisa; traducción del selector de estado. |
| `historial-estudiante.component.spec.ts` | Sin ficha, sin matrículas, matrículas con grupo y sin grupo, asistencia, programas distintos y color de la permanencia. |
| `dean-docentes.component.spec.ts` | Listado, programas del selector, filtros por programa/estado/texto (página 1), sin resultados, error y estructura no disponible. |
| `dean-asignaturas.component.spec.ts` | Decano: sin selector de facultad, búsqueda, estado, sin resultados y error. Administrador: ruta `/admin/asignaturas`, selector de facultad y su error. |
| `admin-estudiantes.component.spec.ts` | Listado, filtros por facultad, estado y texto; ficha con matrícula sin grupo, cerrar, error de la ficha y facultades no disponibles. |
| `dean-programas-creditos.component.spec.ts` | Totales, programa sin plan, filtro por programa/tipo/INP, paginación en el navegador y error. |
| `dean-programas.component.spec.ts` | Una sola consulta de créditos (`tamano=100`) y ninguna malla por plan; totales de las tarjetas desde la tabla; error ⇒ «—»; varias páginas acumuladas. |
| `dean-estudiantes.component.spec.ts` | La ficha muestra el historial; si el historial falla, la ficha sigue visible y se avisa el error; al cerrar se limpia. |
| `mock-consultas-transversales.spec.ts` | Simulación de las 6 consultas con búsqueda; el historial usa el id pedido; las demás rutas y métodos no se simulan. |
