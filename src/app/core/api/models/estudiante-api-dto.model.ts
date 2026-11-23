export interface EstudianteResumenApiDto {
  id: string;
  idUsuario: string;
  tipoIdentificacionId: string;
  numeroIdentificacion: number;

  primerApellido: string;
  segundoApellido: string | null;

  primerNombre: string;
  segundoNombre: string | null;

  nombreCompleto: string;
  correo: string;
  estaActivoUsuario: boolean;
}

/**
 * `GET /coordinador/estudiantes` (fuera del Golden Path): el resumen del estudiante más el programa del vínculo y el
 * semestre actual (nulo = no informado). Tipo propio para no alterar `EstudianteResumen` del contrato congelado.
 */
export interface EstudianteDirectorioCoordinadorApiDto extends EstudianteResumenApiDto {
  idPrograma?: string;
  nombrePrograma?: string;
  semestreActual?: number | null;
}

/** Página del directorio del coordinador: misma forma que `EstudiantePaginaApiDto` con el elemento ampliado. */
export type EstudianteDirectorioPaginaApiDto = Omit<EstudiantePaginaApiDto, 'items'> & {
  items: EstudianteDirectorioCoordinadorApiDto[];
};

export interface EstudiantePaginaApiDto {
  items: EstudianteResumenApiDto[];
  totalItems: number;
  totalPages: number;
  page: number;
  size: number;
}

export type EstudianteDatosPersonalesApiDto = EstudianteResumenApiDto;

export interface EstudianteContextoAcademicoApiDto {
  idInstitucion: string;
  nombreInstitucion: string;
  idFacultad: string;
  nombreFacultad: string;
  idPrograma: string;
  nombrePrograma: string;
  idPlanEstudio: string;
  inpPlanEstudio: string;
  idAsignatura: string;
  nombreAsignatura: string;
  idGrupo: string;
  nombreGrupo: string;
}

export interface EstudianteDetalleApiDto {
  datosPersonales: EstudianteDatosPersonalesApiDto;
  contextosAcademicos: EstudianteContextoAcademicoApiDto[];
}
