import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { EventoAuditoriaItem } from '../../../core/models/consultas-transversales.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { ListadoPaginado } from '../../../shared/utils/listado-paginado';

/** Rango por defecto (últimos 7 días, contando hoy) y máximo permitido por el backend. */
export const DIAS_AUDITORIA_POR_DEFECTO = 7;
export const DIAS_AUDITORIA_MAXIMO = 90;
const MS_DIA = 24 * 60 * 60 * 1000;

/** Fecha local (yyyy-MM-dd) desplazada `dias` respecto a `base`. */
export function fechaLocal(base: Date, dias = 0): string {
  const fecha = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dias);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * Convierte el rango de días locales [desde, hasta] en el rango UTC [desde 00:00, día siguiente a hasta 00:00) que
 * espera el backend; `null` si falta una fecha, el orden es inválido o supera el máximo de días.
 */
export function rangoUtc(desde: string, hasta: string): { desde: string; hasta: string } | null {
  if (!desde || !hasta) return null;
  const inicio = new Date(`${desde}T00:00:00`);
  const finInclusivo = new Date(`${hasta}T00:00:00`);
  const fin = new Date(finInclusivo.getFullYear(), finInclusivo.getMonth(), finInclusivo.getDate() + 1);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio) return null;
  if (Math.round((fin.getTime() - inicio.getTime()) / MS_DIA) > DIAS_AUDITORIA_MAXIMO) return null;
  return { desde: inicio.toISOString(), hasta: fin.toISOString() };
}

/**
 * HU172: rastro de auditoría del administrador (solo lectura). Por defecto muestra todas las acciones de los
 * últimos 7 días; el rango máximo es de 90 días y la consulta es paginada en el servidor.
 */
@Component({
  selector: 'app-admin-auditoria',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, BadgeComponent, PaginationComponent, ErrorCargaComponent],
  template: `
    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
        <label class="text-xs font-semibold text-warm-600">
          Desde
          <input type="date" aria-label="Desde" [ngModel]="desde()" (ngModelChange)="desde.set($event)"
            class="mt-1 w-full min-h-[44px] px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-600" />
        </label>
        <label class="text-xs font-semibold text-warm-600">
          Hasta
          <input type="date" aria-label="Hasta" [ngModel]="hasta()" (ngModelChange)="hasta.set($event)"
            class="mt-1 w-full min-h-[44px] px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-600" />
        </label>
        <label class="text-xs font-semibold text-warm-600">
          Acción
          <input type="text" aria-label="Acción" [ngModel]="accion()" (ngModelChange)="accion.set($event)"
            placeholder="Ej. CREAR_SESION"
            class="mt-1 w-full min-h-[44px] px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-600" />
        </label>
        <label class="text-xs font-semibold text-warm-600">
          ID de Correlación
          <input type="text" aria-label="ID de Correlación" [ngModel]="idCorrelacion()" (ngModelChange)="idCorrelacion.set($event)"
            placeholder="Buscar por correlación..."
            class="mt-1 w-full min-h-[44px] px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-600" />
        </label>
        <label class="text-xs font-semibold text-warm-600">
          Resultado
          <select aria-label="Resultado" [ngModel]="resultado()" (ngModelChange)="resultado.set($event)"
            class="mt-1 w-full min-h-[44px] px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-600">
            <option value="">Todos</option>
            <option value="SUCCESS">Exitoso</option>
            <option value="FAILURE">Fallido</option>
          </select>
        </label>

        <!-- Filtros de Ámbito Excluyentes -->
        <div class="flex flex-col justify-end gap-2">
          <div class="flex flex-col gap-1 text-[11px] font-semibold text-warm-700">
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" aria-label="Solo acciones de asistencia"
                [checked]="soloAsistencia()"
                (change)="onToggleAsistencia($any($event.target).checked)" />
              <span>Solo asistencia</span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" aria-label="Solo acciones administrativas"
                [checked]="soloAdministracion()"
                (change)="onToggleAdministracion($any($event.target).checked)" />
              <span>Solo administración</span>
            </label>
          </div>
          <button type="button" (click)="buscar()"
            class="min-h-[44px] px-4 py-2 rounded-xl bg-primary-700 text-white text-xs font-bold hover:bg-primary-800 transition-colors shadow-sm">
            Consultar
          </button>
        </div>
      </div>

      @if (errorRango()) {
        <p role="alert" class="text-sm text-danger-700">{{ errorRango() }}</p>
      }

      <section class="bg-white border border-warm-200 rounded-2xl overflow-hidden shadow-warm-sm">
        @if (listado.error() && !listado.cargando()) {
          <app-error-carga [error]="listado.error()!" (reintentar)="listado.reintentar()" />
        } @else if (listado.cargando()) {
          <p role="status" class="text-sm text-warm-500 text-center py-6">Cargando eventos de auditoría…</p>
        } @else if (listado.filas().length === 0) {
          <p class="text-sm text-warm-500 text-center py-6">No hay eventos de auditoría en el rango y filtros seleccionados.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-warm-50 border-b border-warm-200 text-xs font-bold text-warm-600 uppercase tracking-wider">
                <tr>
                  <th scope="col" class="px-4 py-3">Fecha</th>
                  <th scope="col" class="px-4 py-3">Usuario</th>
                  <th scope="col" class="px-4 py-3">Acción</th>
                  <th scope="col" class="px-4 py-3">Recurso</th>
                  <th scope="col" class="px-4 py-3">Petición</th>
                  <th scope="col" class="px-4 py-3">ID de correlación</th>
                  <th scope="col" class="px-4 py-3 text-center">Resultado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-warm-100">
                @for (e of listado.filas(); track e.id) {
                  <tr class="hover:bg-warm-50/70 transition-colors">
                    <td class="px-4 py-3 font-mono text-xs text-warm-600 whitespace-nowrap">{{ e.ocurridoEn | date: 'yyyy-MM-dd HH:mm:ss' }}</td>
                    <td class="px-4 py-3">
                      <span class="font-semibold text-warm-900 text-xs block">{{ e.nombreActor || e.idActor || 'Sistema' }}</span>
                      <span class="text-[10px] text-warm-500 uppercase">{{ e.tipoActor }}</span>
                    </td>
                    <td class="px-4 py-3 font-mono text-xs text-warm-800">
                      <span>{{ e.accion }}</span>
                      @if (e.metadata || e.metadatos) {
                        <button
                          type="button"
                          data-testid="btn-ver-metadata"
                          (click)="verMetadata(e.metadata || e.metadatos)"
                          class="text-[10px] font-bold text-primary-700 hover:text-primary-800 underline block mt-0.5"
                          aria-label="Ver metadatos de la acción"
                        >
                          Ver metadatos
                        </button>
                      }
                    </td>
                    <td class="px-4 py-3 text-xs text-warm-700">{{ e.tipoRecurso }} {{ e.idRecurso || '' }}</td>
                    <td class="px-4 py-3 font-mono text-[11px] text-warm-500">{{ e.metodoHttp }} {{ e.ruta }} · {{ e.estadoHttp }}</td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-1.5">
                        <span class="font-mono text-[11px] text-warm-600 break-all" [attr.data-testid]="'correlacion-' + e.id">
                          {{ e.idCorrelacion || e.idTraza || '—' }}
                        </span>
                        @if (e.idCorrelacion || e.idTraza) {
                          <button
                            type="button"
                            data-testid="btn-copiar-correlacion"
                            (click)="copiarCorrelacion(e.idCorrelacion || e.idTraza || '')"
                            class="min-h-[32px] min-w-[32px] p-1.5 rounded-lg text-warm-400 hover:text-primary-700 hover:bg-warm-100 transition-colors shrink-0"
                            title="Copiar correlación"
                            aria-label="Copiar ID de correlación"
                          >
                            <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        }
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <app-badge [variant]="e.resultado === 'SUCCESS' ? 'success' : 'danger'">
                        {{ e.resultado === 'SUCCESS' ? 'Exitoso' : 'Fallido' }}
                      </app-badge>
                      @if (e.codigoError) {
                        <span class="block text-[10px] text-danger-700 font-mono mt-0.5">{{ e.codigoError }}</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <app-pagination
          [totalItems]="listado.total()"
          [totalPages]="listado.totalPaginas()"
          [pageSize]="listado.tamano()"
          [currentPage]="listado.pagina()"
          (pageChange)="listado.irAPagina($event)"
          (pageSizeChange)="listado.cambiarTamano($event)"
        ></app-pagination>
      </section>

      <!-- Modal de Visualización de Metadatos -->
      @if (metadataVisualizada()) {
        <div
          class="fixed inset-0 z-50 overflow-y-auto bg-warm-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-metadata-title"
        >
          <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-warm-xl border border-warm-200">
            <div class="flex items-center justify-between mb-4 pb-2 border-b border-warm-100">
              <h3 id="modal-metadata-title" class="text-sm font-bold text-warm-900">Metadatos de la Operación</h3>
              <button
                type="button"
                (click)="metadataVisualizada.set(null)"
                aria-label="Cerrar visor de metadatos"
                class="min-h-[44px] min-w-[44px] flex items-center justify-center text-warm-400 hover:text-warm-700 transition-colors"
              >
                <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <pre class="bg-warm-50 p-4 rounded-xl text-xs font-mono text-warm-800 overflow-x-auto max-h-80 border border-warm-200 whitespace-pre-wrap">{{ formatJson(metadataVisualizada()) }}</pre>
            <div class="mt-4 flex justify-end">
              <button
                type="button"
                (click)="metadataVisualizada.set(null)"
                class="min-h-[44px] px-4 py-2 bg-warm-100 text-warm-800 rounded-xl text-xs font-bold hover:bg-warm-200 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminAuditoriaComponent implements OnInit {
  private readonly service = inject(ConsultasTransversalesService);
  private readonly toast = inject(ToastService);

  desde = signal(fechaLocal(new Date(), -(DIAS_AUDITORIA_POR_DEFECTO - 1)));
  hasta = signal(fechaLocal(new Date()));
  accion = signal('');
  resultado = signal('');
  idCorrelacion = signal('');
  soloAdministracion = signal(false);
  soloAsistencia = signal(false);
  errorRango = signal<string | null>(null);
  metadataVisualizada = signal<string | null>(null);

  readonly listado = new ListadoPaginado<EventoAuditoriaItem>(
    (pagina, tamano) => {
      const rango = rangoUtc(this.desde(), this.hasta());
      return this.service.getAuditoria({
        desde: rango?.desde ?? null,
        hasta: rango?.hasta ?? null,
        accion: this.accion().trim().toUpperCase() || null,
        resultado: this.resultado() || null,
        idCorrelacion: this.idCorrelacion().trim() || null,
        soloAdministracion: this.soloAdministracion(),
        soloAsistencia: this.soloAsistencia(),
        pagina,
        tamano,
      });
    },
    (mensaje) => this.toast.error(mensaje)
  );

  ngOnInit(): void {
    this.listado.cargar();
  }

  activarFiltroAdministracion(): void {
    this.soloAdministracion.set(true);
    this.soloAsistencia.set(false);
  }

  activarFiltroAsistencia(): void {
    this.soloAsistencia.set(true);
    this.soloAdministracion.set(false);
  }

  onToggleAsistencia(marcado: boolean): void {
    this.soloAsistencia.set(marcado);
    if (marcado) {
      this.soloAdministracion.set(false);
    }
  }

  onToggleAdministracion(marcado: boolean): void {
    this.soloAdministracion.set(marcado);
    if (marcado) {
      this.soloAsistencia.set(false);
    }
  }

  async copiarCorrelacion(id: string): Promise<void> {
    if (!id || id === '—') return;
    try {
      await navigator.clipboard.writeText(id);
      this.toast.success('ID de correlación copiado al portapapeles.');
    } catch {
      // fallback
    }
  }

  verMetadata(meta: string | null | undefined): void {
    if (meta) {
      this.metadataVisualizada.set(meta);
    }
  }

  formatJson(raw: string | null): string {
    if (!raw) return 'Sin metadatos registrados';
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  }

  buscar(): void {
    if (!rangoUtc(this.desde(), this.hasta())) {
      this.errorRango.set(
        `Selecciona un rango válido: la fecha inicial no puede ser posterior a la final y el máximo es de ${DIAS_AUDITORIA_MAXIMO} días.`
      );
      return;
    }
    this.errorRango.set(null);
    this.listado.buscar();
  }
}
