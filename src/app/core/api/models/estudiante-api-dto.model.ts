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

  /** `GET /coordinador/estudiantes`: programa del vínculo y semestre (nulo = no informado). */
  idPrograma?: string;
  nombrePrograma?: string;
  semestreActual?: number | null;
}

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
