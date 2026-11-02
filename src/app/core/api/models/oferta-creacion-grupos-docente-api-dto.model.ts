/** F3: asignatura que el docente puede abrir como grupo (programas con los que tiene vínculo activo). */
export interface AsignaturaOfertaDocenteApiDto {
  idAsignatura: string;
  codigoAsignatura: string;
  nombreAsignatura: string;
  idPrograma: string;
  nombrePrograma: string;
}

/** F3: respuesta de GET /docente/oferta-creacion-grupos: el idDocente del token y sus asignaturas. */
export interface OfertaCreacionGruposDocenteApiDto {
  idDocente: string;
  asignaturas: AsignaturaOfertaDocenteApiDto[];
}
