import { signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../core/models/api-response.model';
import { getApiErrorMessage } from '../../core/api/errors/api-error.util';
import { LoadErrorState, classifyLoadError } from '../../core/api/errors/load-error.util';

/**
 * Estado y carga de un listado paginado del servidor (HU112/HU128/HU143/HU157): filas, total, página, tamaño y
 * bandera de carga en Signals. Cada pantalla aporta la consulta (con sus filtros) y cómo mostrar el error; así no se
 * repite en cada componente la misma lógica de suscripción, paginación y limpieza ante un error.
 */
export class ListadoPaginado<T> {
  readonly filas = signal<T[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(1);
  readonly tamano = signal(10);
  readonly cargando = signal(false);
  /** Fallo de la última carga (null si fue bien): permite distinguirlo de una lista vacía y ofrecer reintento. */
  readonly error = signal<LoadErrorState | null>(null);

  constructor(
    private readonly consultar: (pagina: number, tamano: number) => Observable<ApiResponse<T[]>>,
    private readonly alFallar: (mensaje: string) => void
  ) {}

  /** Vuelve a la primera página (cambió un filtro) y consulta. */
  buscar(): void {
    this.pagina.set(1);
    this.cargar();
  }

  irAPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  cambiarTamano(tamano: number): void {
    this.tamano.set(tamano);
    this.buscar();
  }

  /** Repite la carga de la página actual tras un fallo. */
  reintentar(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.consultar(this.pagina(), this.tamano()).subscribe({
      next: (res) => {
        this.filas.set(res.datos ?? []);
        this.total.set(Number(res.total ?? 0));
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        this.filas.set([]);
        this.total.set(0);
        this.cargando.set(false);
        this.error.set(classifyLoadError(error));
        this.alFallar(getApiErrorMessage(error));
      },
    });
  }
}

/** Traduce el selector de estado de las pantallas ('TODOS' | 'ACTIVO' | 'INACTIVO') al filtro booleano del backend. */
export type FiltroEstado = 'TODOS' | 'ACTIVO' | 'INACTIVO';

export function estadoComoFiltro(estado: FiltroEstado): boolean | null {
  return estado === 'TODOS' ? null : estado === 'ACTIVO';
}
