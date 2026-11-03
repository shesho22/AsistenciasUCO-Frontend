import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { PerfilService, PerfilUsuario } from '../../core/services/perfil.service';
import { getApiErrorCode, getApiErrorMessage } from '../../core/api/errors/api-error.util';

export type EstadoPerfilInstitucional =
  | { tipo: 'INACTIVO' }
  | { tipo: 'CARGANDO' }
  | { tipo: 'CARGADO'; perfil: PerfilUsuario }
  /** 2xx sin `datos`: el servidor respondio, pero no entrego el perfil. */
  | { tipo: 'SIN_DATOS' }
  | { tipo: 'ERROR'; codigo: string; mensaje: string };

export const TEXTO_SIN_REGISTRAR = 'Sin registrar';
export const TEXTO_NO_DISPONIBLE = 'No disponible';
export const TEXTO_CONSULTANDO = 'Consultando…';

/** Identificacion lista para mostrar; `documento` es "<codigo> <numero>" tal como lo entrega el contrato. */
export interface IdentificacionVisible {
  documento: string;
  tipo: string;
  numero: string;
}

/**
 * APP-06: estado del perfil institucional (GET /usuarios/perfil) compartido por las secciones de "Mi perfil".
 * Se provee en `ProfileComponent`, de modo que vive solo en memoria mientras la pantalla esta abierta y se descarta
 * al destruirla (navegacion o cierre de sesion). Una sola consulta por pantalla; un reintento explicito tras error
 * vuelve a consultar. El documento sale solo de la API: nunca del token ni de valores por defecto.
 */
@Injectable()
export class PerfilInstitucionalStore {
  private readonly perfilService = inject(PerfilService);
  private readonly estadoSignal = signal<EstadoPerfilInstitucional>({ tipo: 'INACTIVO' });
  private suscripcion: Subscription | null = null;

  readonly estado = this.estadoSignal.asReadonly();
  readonly cargando = computed(() => this.estado().tipo === 'CARGANDO');
  readonly perfil = computed(() => {
    const estado = this.estado();
    return estado.tipo === 'CARGADO' ? estado.perfil : null;
  });
  readonly error = computed(() => {
    const estado = this.estado();
    return estado.tipo === 'ERROR' ? estado.mensaje : null;
  });

  readonly identificacion = computed<IdentificacionVisible>(() => {
    const estado = this.estado();
    if (estado.tipo !== 'CARGADO') {
      const texto = estado.tipo === 'CARGANDO' || estado.tipo === 'INACTIVO' ? TEXTO_CONSULTANDO : TEXTO_NO_DISPONIBLE;
      return { documento: texto, tipo: texto, numero: texto };
    }
    const { codigoTipoIdentificacion: codigo, nombreTipoIdentificacion: nombre, numeroIdentificacion } = estado.perfil;
    const numero = numeroIdentificacion === null || numeroIdentificacion === undefined ? null : String(numeroIdentificacion);
    const tipo = nombre && codigo ? `${nombre} (${codigo})` : nombre || codigo || null;
    return {
      documento: numero ? [codigo, numero].filter(Boolean).join(' ') : TEXTO_SIN_REGISTRAR,
      tipo: tipo ?? TEXTO_SIN_REGISTRAR,
      numero: numero ?? TEXTO_SIN_REGISTRAR,
    };
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.limpiar());
  }

  /** Consulta el perfil propio salvo que ya este en curso o cargado (evita GET duplicados). */
  cargar(): void {
    const tipo = this.estadoSignal().tipo;
    if (tipo === 'CARGANDO' || tipo === 'CARGADO') {
      return;
    }
    this.estadoSignal.set({ tipo: 'CARGANDO' });
    this.suscripcion = this.perfilService.consultar().subscribe({
      next: (res) => {
        this.estadoSignal.set(res?.datos ? { tipo: 'CARGADO', perfil: res.datos } : { tipo: 'SIN_DATOS' });
      },
      error: (error: unknown) => {
        this.estadoSignal.set({ tipo: 'ERROR', codigo: getApiErrorCode(error), mensaje: getApiErrorMessage(error) });
      },
    });
  }

  /** Cancela la consulta activa y descarta el perfil de memoria. */
  limpiar(): void {
    this.suscripcion?.unsubscribe();
    this.suscripcion = null;
    this.estadoSignal.set({ tipo: 'INACTIVO' });
  }
}
