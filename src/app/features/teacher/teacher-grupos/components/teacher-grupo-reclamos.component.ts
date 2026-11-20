import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { type EstadoCargaReclamos, SolicitudRevisionItem } from '../../../../core/models/role-management.model';
import { etiquetaEstadoReclamo, varianteEstadoReclamo } from '../../../../core/utils/reclamo-estado.util';
import { TablaDatosComponent } from '../../../../shared/components/tabla-datos/tabla-datos.component';

@Component({
    selector: 'app-teacher-grupo-reclamos',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [BadgeComponent, TablaDatosComponent],
    template: `
    <div class="bg-white rounded-b-2xl border-x border-b border-warm-200 shadow-warm-sm p-6 space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-warm-100">
        <div>
          <h3 class="font-serif font-bold text-lg text-warm-900">Solicitudes de Revisión y Justificaciones</h3>
          <p class="text-xs text-warm-500">Inasistencias y retardos reportados por estudiantes para este curso.</p>
        </div>
        <button
          type="button"
          (click)="irAReclamos.emit()"
          class="text-xs font-semibold text-primary-800 hover:text-primary-950 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200 inline-flex items-center gap-1.5 transition-colors"
        >
          Abrir Portal de Justificaciones Completo →
        </button>
      </div>

      @if (estadoCarga() === 'LOADING' || estadoCarga() === 'LOADED') {
        @if (estadoCarga() === 'LOADING') {
          <p role="status" class="text-sm text-warm-600">Cargando justificaciones del grupo…</p>
        }
        <app-tabla-datos
          etiqueta="Justificaciones del grupo"
          [columnas]="7"
          anchoMinimo="60rem"
          [filasEsqueleto]="3"
          [cargando]="estadoCarga() === 'LOADING'"
          [vacio]="reclamos().length === 0"
          mensajeVacio="No hay justificaciones para este grupo ni solicitudes pendientes."
          [paginada]="true"
          [totalItems]="totalReclamos() ?? reclamos().length"
          [pagina]="pagina()"
          [tamanoPagina]="tamano()"
          [mostrarSelectorTamano]="false"
          (paginaChange)="paginaChange.emit($event)"
        >
          <thead>
            <tr>
              <th scope="col">Folio</th>
              <th scope="col">Estudiante</th>
              <th scope="col">Toma</th>
              <th scope="col">Justificación</th>
              <th scope="col">Categoría</th>
              <th scope="col">Fecha</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            @if (estadoCarga() === 'LOADED') {
              @for (rec of reclamos(); track rec.id) {
                <tr data-testid="grupo-reclamo-fila">
                  <td class="whitespace-nowrap">
                    <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-warm-100 text-warm-800">{{ rec.folio }}</span>
                  </td>
                  <td class="font-semibold text-warm-900">{{ rec.estudianteNombre }}</td>
                  <td class="whitespace-nowrap">
                    @if (rec.numeroToma !== null && rec.numeroToma !== undefined) {
                      <span class="text-xs font-semibold text-warm-800" data-testid="grupo-reclamo-toma">Toma {{ rec.numeroToma }}</span>
                    } @else {
                      <span class="text-warm-400">—</span>
                    }
                  </td>
                  <td class="min-w-[16rem] text-xs text-warm-700 italic">"{{ rec.justificacionSolicitud }}"</td>
                  <td class="text-xs text-warm-600">{{ rec.categoria || 'Médico / Salud' }}</td>
                  <td class="text-xs text-warm-600 whitespace-nowrap">{{ rec.fechaSolicitud }}</td>
                  <td class="whitespace-nowrap">
                    <app-badge [variant]="varianteEstado(rec.estadoSolicitud)">
                      {{ etiquetaEstado(rec.estadoSolicitud) }}
                    </app-badge>
                  </td>
                </tr>
              }
            }
          </tbody>
        </app-tabla-datos>
      } @else if (estadoCarga() === 'FORBIDDEN' || estadoCarga() === 'UNAVAILABLE' || estadoCarga() === 'NETWORK_ERROR' || estadoCarga() === 'SERVER_ERROR') {
        <div role="alert" class="p-8 text-center space-y-3">
          @if (estadoCarga() === 'FORBIDDEN') {
            <p class="text-sm text-danger-700">No tienes autorización para consultar las justificaciones de este grupo.</p>
          } @else if (estadoCarga() === 'UNAVAILABLE') {
            <p class="text-sm text-warning-800">El servicio de justificaciones no está disponible (HTTP 501).</p>
          } @else if (estadoCarga() === 'NETWORK_ERROR') {
            <p class="text-sm text-danger-700">No fue posible conectar con el servicio de justificaciones.</p>
          } @else {
            <p class="text-sm text-danger-700">No fue posible cargar las justificaciones del grupo. Intenta nuevamente.</p>
          }
          <button
            type="button"
            data-accion="reintentar"
            (click)="reintentar.emit()"
            class="text-xs font-semibold text-primary-800 hover:text-primary-950 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200"
          >Reintentar consulta</button>
        </div>
      } @else {
        <p class="p-8 text-center text-sm text-warm-500">Selecciona un grupo para consultar sus justificaciones.</p>
      }
    </div>
  `
})
export class TeacherGrupoReclamosComponent {
  reclamos = input<SolicitudRevisionItem[]>([]);
  /** Total del grupo según el servidor (la lista es solo la página vigente); sin él se usa la longitud de la lista. */
  totalReclamos = input<number | null>(null);
  pagina = input<number>(1);
  tamano = input<number>(15);
  /** Valor LOADED conserva el uso anterior del componente standalone; el hub envía el estado HTTP real. */
  estadoCarga = input<EstadoCargaReclamos>('LOADED');
  irAReclamos = output<void>();
  paginaChange = output<number>();
  reintentar = output<void>();

  /** Una solicitud retirada por el estudiante se ve neutra: no es pendiente, rechazada ni resuelta. */
  readonly varianteEstado = varianteEstadoReclamo;
  readonly etiquetaEstado = etiquetaEstadoReclamo;
}
