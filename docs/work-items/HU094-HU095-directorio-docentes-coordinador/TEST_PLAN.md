# TEST_PLAN — HU094-HU095-directorio-docentes-coordinador

**Specs:**
- `coordinator-docente-ficha-modal.component.spec.ts` (nuevo);
- los casos HU094/HU095 de `coordinator-docentes.component.spec.ts`;
- `coordinator-management.service.spec.ts`;
- `mock-backend.interceptor.spec.ts`.

| ID | Escenario | Esperado |
|---|---|---|
| FM-01 | Abrir la ficha | `getFichaDocente('doc-1', {pagina: 1, tamano: 5})`; deja de cargar; total 12 |
| FM-02 | Contenido | nombre, "VINCULACIÓN INACTIVA", resumen (12 y 25), 3 grupos con Vigente, Finalizado y Próximo, "3 cancelaron" |
| FM-03 | Paginar | `cambiarPagina(2)` vuelve a consultar con la página 2 |
| FM-04 | Sin grupos | mensaje "no tiene grupos registrados" |
| FM-05 | Error 404 del backend | alerta visible, historial vacío y sin indicador de carga |
| FM-06 | Cerrar y etiquetas | emite `cerrar`; un estado desconocido usa la variante neutral |
| DIR-094 | Abrir y cerrar la ficha desde el directorio | no consulta al cargar la pantalla; al abrir consulta con página 1 y tamaño 5 y muestra el modal; al cerrar desaparece |
| DIR-095-01 | Consolidado | `getResumenDocentes` una vez; contadores 3/2/1; chip "Cátedra: 3" |
| DIR-095-02 | Chip de tipo | filtra con `idTipoVinculacion` y vuelve a la página 1; un segundo clic quita el filtro |
| DIR-095-03 | Selector de tipo | filtra y vuelve a la página 1 |
| DIR-095-04 | Cambio de estado | el consolidado se relee; un error no borra el último consolidado |
| SRV-094 / SRV-095 | Servicio | `/ficha` con página y tamaño, y período opcional; `/resumen` por GET |
| MOCK | Simulación | el mock responde el consolidado y la ficha (2 grupos, 1 vigente) |

## RED_SNAPSHOT

| Campo | Valor |
|---|---|
| Base commit | `f010db3` |
| Fallo esperado | `CoordinatorDocenteFichaModalComponent`, `getFichaDocente`, `getResumenDocentes`, `filtroTipo` y `alternarTipoVinculacion` inexistentes |
| Comando | `npm run test:ci` |
