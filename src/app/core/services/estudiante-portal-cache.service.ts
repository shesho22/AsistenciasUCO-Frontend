import { Injectable } from '@angular/core';
import { EMPTY, Observable, catchError, concat, of, tap } from 'rxjs';

/**
 * PERF-EST-MM: caché en memoria del portal del estudiante (materias con horarios, resumen y primera página de sesiones por
 * materia y grupo). Se muestra el último dato al instante y se revalida en segundo plano (stale-while-revalidate):
 *  - sin dato guardado, la consulta se comporta igual que sin caché (incluido el error);
 *  - con dato guardado, se emite primero el dato guardado y luego el nuevo; si la revalidación falla, se conserva el dato
 *    guardado y no se propaga el error (la pantalla ya muestra información válida).
 * Vive solo en memoria (nunca en localStorage ni sessionStorage) y pertenece a un usuario: `asegurarPropietario` la vacía
 * cuando cambia el usuario autenticado o se cierra la sesión (lo llama AuthService).
 */
@Injectable({ providedIn: 'root' })
export class EstudiantePortalCacheService {
  static readonly CLAVE_MATERIAS = 'materias';
  static readonly CLAVE_RESUMEN = 'resumen';
  private static readonly PREFIJO_SESIONES = 'sesiones|';

  private readonly entradas = new Map<string, unknown>();
  private propietario: string | null = null;

  /** Clave de la primera página de sesiones de una materia y grupo (con su tamaño de página). */
  static claveSesiones(materiaId: string, grupoId: string | undefined, tamano: number | undefined): string {
    return `${EstudiantePortalCacheService.PREFIJO_SESIONES}${materiaId}|${grupoId ?? ''}|${tamano ?? ''}`;
  }

  /**
   * Emite el dato guardado (si existe) y después el de `consulta$`, que queda guardado. Ver la descripción de la clase para
   * el manejo de errores.
   */
  obtener<T>(clave: string, consulta$: Observable<T>): Observable<T> {
    const guardar = tap<T>((valor) => this.entradas.set(clave, valor));
    if (!this.entradas.has(clave)) {
      return consulta$.pipe(guardar);
    }
    const guardado = this.entradas.get(clave) as T;
    return concat(of(guardado), consulta$.pipe(guardar, catchError(() => EMPTY)));
  }

  tiene(clave: string): boolean {
    return this.entradas.has(clave);
  }

  /** Descarta la primera página guardada de las sesiones de la materia (todos sus grupos y tamaños). */
  invalidarSesiones(materiaId: string): void {
    const prefijo = `${EstudiantePortalCacheService.PREFIJO_SESIONES}${materiaId}|`;
    for (const clave of [...this.entradas.keys()]) {
      if (clave.startsWith(prefijo)) this.entradas.delete(clave);
    }
  }

  /** Descarta materias y resumen (p. ej. tras matricularse en un grupo nuevo). */
  invalidarMaterias(): void {
    this.entradas.delete(EstudiantePortalCacheService.CLAVE_MATERIAS);
    this.entradas.delete(EstudiantePortalCacheService.CLAVE_RESUMEN);
  }

  limpiar(): void {
    this.entradas.clear();
  }

  /** Vacía la caché si el usuario autenticado cambió (o ya no hay usuario). */
  asegurarPropietario(idUsuario: string | null): void {
    if (idUsuario !== this.propietario) {
      this.entradas.clear();
      this.propietario = idUsuario;
    }
  }
}
