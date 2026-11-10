import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListResponse } from '../api/models/api-list-response.model';
import { BYPASS_GLOBAL_ERROR_TOAST } from '../interceptors/error.interceptor';

/** Asignatura de un semestre del plan (`datos[].semestres[].asignaturas[]` de GET /estudiante/plan-estudio). */
export interface AsignaturaPlanEstudiante {
  idAsignatura: string;
  codigo: string | null;
  nombre: string;
  creditos: number | null;
  /** ESPECIFICA (propia del programa), BASICA o INSTITUCIONAL (transversales). */
  tipoAsignatura: string | null;
  codigoCaracter: string | null;
  nombreCaracter: string | null;
  /** El estudiante tiene matrícula inscrita en un grupo de la asignatura. */
  cursando: boolean;
  idGrupoCursando: string | null;
  nombreGrupoCursando: string | null;
}

/** Semestre del plan; un semestre sin asignaturas trae la lista vacía. */
export interface SemestrePlanEstudiante {
  idSemestrePlanEstudio: string;
  numeroSemestre: number;
  totalAsignaturas: number;
  totalCreditos: number;
  asignaturas: AsignaturaPlanEstudiante[];
}

/** Plan de estudios activo de un programa del estudiante. Los totales los calcula el backend. */
export interface PlanEstudioEstudiante {
  idPlanEstudio: string;
  inp: number | null;
  idPrograma: string;
  nombrePrograma: string;
  /** Semestre más alto del plan. */
  totalSemestres: number;
  totalAsignaturas: number;
  totalCreditos: number;
  asignaturasCursando: number;
  creditosCursando: number;
  semestres: SemestrePlanEstudiante[];
}

/**
 * Estructura curricular por semestres de los planes de estudio activos del estudiante autenticado. Los errores HTTP se
 * propagan sin toast global: la pantalla presenta el mensaje del backend.
 */
@Injectable({ providedIn: 'root' })
export class PlanEstudioEstudianteService {
  private readonly http = inject(HttpClient);

  consultar(): Observable<ApiListResponse<PlanEstudioEstudiante>> {
    return this.http.get<ApiListResponse<PlanEstudioEstudiante>>(`${environment.apiUrl}/estudiante/plan-estudio`, {
      context: new HttpContext().set(BYPASS_GLOBAL_ERROR_TOAST, true),
    });
  }
}
