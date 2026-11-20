import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { ApiListResponse } from '../api/models/api-list-response.model';
import { ApiDataResponse } from '../api/models/api-data-response.model';
import {
  HorarioEstudianteApiDto,
  MateriaEstudianteApiDto,
  ResumenMateriasEstudianteApiDto,
} from '../api/models/estudiante-portal-api-dto.model';
import { BYPASS_GLOBAL_ERROR_TOAST } from '../interceptors/error.interceptor';
import { StudentPortalMapper } from '../mappers/student-portal.mapper';
import { HorarioItem, MateriaEstudianteItem, ResumenMateriasEstudiante } from '../models/role-management.model';
import { EstudiantePortalCacheService } from './estudiante-portal-cache.service';

@Injectable({
  providedIn: 'root',
})
export class StudentManagementService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(EstudiantePortalCacheService);


  /** `GET /estudiante/horarios` (`HorarioEstudianteDTO`) adaptado al modelo de UI; las filas invalidas se descartan. */
  getHorarios(): Observable<ApiResponse<HorarioItem[]>> {
    return this.http
      .get<ApiListResponse<HorarioEstudianteApiDto>>(`${environment.apiUrl}/estudiante/horarios`)
      .pipe(
        map((res) => {
          const datos = StudentPortalMapper.toHorarios(res.datos);
          return { exitoso: res.exitoso, datos, total: datos.length };
        })
      );
  }

  /**
   * `GET /estudiante/materias/resumen` (CIERRE-W2B): materias, materias en riesgo, horas de falta y creditos calculados por el
   * backend con las mismas materias que el listado. `datos` es `null` si el cuerpo no trae cifras validas.
   */
  getResumenMaterias(): Observable<ApiResponse<ResumenMateriasEstudiante | null>> {
    const consulta$ = this.http
      .get<ApiDataResponse<ResumenMateriasEstudianteApiDto>>(`${environment.apiUrl}/estudiante/materias/resumen`, {
        // Si falla, las tarjetas muestran "No disponible"; el listado de materias ya informa el error de la pantalla.
        context: new HttpContext().set(BYPASS_GLOBAL_ERROR_TOAST, true),
      })
      .pipe(map((res) => ({ exitoso: res.exitoso, datos: StudentPortalMapper.toResumenMaterias(res.datos) })));
    // PERF-EST-MM: el último resumen se muestra al instante y se revalida en segundo plano.
    return this.cache.obtener(EstudiantePortalCacheService.CLAVE_RESUMEN, consulta$);
  }

  /**
   * `GET /estudiante/materias` (`MateriaEstudianteDTO`) adaptado al modelo de UI; docente y horario se cruzan por
   * `idGrupo` con `GET /estudiante/horarios` (si este falla, las materias se muestran sin ellos).
   * PERF-EST-MM: con caché del último resultado (se emite al instante y luego el revalidado; ver EstudiantePortalCacheService).
   */
  getMaterias(): Observable<ApiResponse<MateriaEstudianteItem[]>> {
    return this.cache.obtener(EstudiantePortalCacheService.CLAVE_MATERIAS, this.consultarMaterias());
  }

  /** Descarta materias y resumen guardados (p. ej. tras matricularse en un grupo). */
  invalidarCacheMaterias(): void {
    this.cache.invalidarMaterias();
  }

  private consultarMaterias(): Observable<ApiResponse<MateriaEstudianteItem[]>> {
    const materias$ = this.http.get<ApiListResponse<MateriaEstudianteApiDto>>(`${environment.apiUrl}/estudiante/materias`);
    const horarios$ = this.http
      .get<ApiListResponse<HorarioEstudianteApiDto>>(`${environment.apiUrl}/estudiante/horarios`)
      .pipe(catchError(() => of(null)));
    return forkJoin([materias$, horarios$]).pipe(
      map(([res, horarios]) => {
        const base = StudentPortalMapper.toMaterias(res.datos);
        const datos = horarios ? StudentPortalMapper.conHorarios(base, StudentPortalMapper.toHorarios(horarios.datos)) : base;
        return { exitoso: res.exitoso, datos, total: datos.length };
      })
    );
  }
}
