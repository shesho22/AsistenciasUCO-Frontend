import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { EventoAuditoriaItem } from '../../../core/models/consultas-transversales.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
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
 * HU172: rastro de auditoría del administrador (solo lectura). Por defecto muestra las acciones de asistencia de los
 * últimos 7 días; el rango máximo es de 90 días y la consulta es paginada en el servidor.
 */
@Component({
  selector: 'app-admin-auditoria',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, BadgeComponent, PaginationComponent],
  template: `
    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
        <label class="text-xs font-semibold text-warm-600">
          Desde
          <input type="date" aria-label="Desde" [ngModel]="desde()" (ngModelChange)="desde.set($event)"
            class="mt-1 w-full px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm text-warm-900" />
        </label>
        <label class="text-xs font-semibold text-warm-600">
          Hasta
          <input type="date" aria-label="Hasta" [ngModel]="hasta()" (ngModelChange)="hasta.set($event)"
            class="mt-1 w-full px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm text-warm-900" />
        </label>
        <label class="text-xs font-semibold text-warm-600">
          Acción
          <input type="text" aria-label="Acción" [ngModel]="accion()" (ngModelChange)="accion.set($event)"
            placeholder="Ej. CREAR_SESION"
            class="mt-1 w-full px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm text-warm-900" />
        </label>
        <label class="text-xs font-semibold text-warm-600">
          Resultado
          <select aria-label="Resultado" [ngModel]="resultado()" (ngModelChange)="resultado.set($event)"
            class="mt-1 w-full px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm text-warm-800">
            <option value="">Todos</option>
            <option value="SUCCESS">Exitoso</option>
            <option value="FAILURE">Fallido</option>
          </select>
        </label>
        <div class="flex flex-col justify-end gap-2">
          <label class="flex items-center gap-2 text-xs font-semibold text-warm-700">
            <input type="checkbox" aria-label="Solo acciones de asistencia" [ngModel]="soloAsistencia()"
              (ngModelChange)="soloAsistencia.set($event)" />
            Solo acciones de asistencia
          </label>
          <button type="button" (click)="buscar()"
            class="px-4 py-2 rounded-xl bg-primary-700 text-white text-sm font-semibold hover:bg-primary-800">
            Consultar
          </button>
        </div>
      </div>

      @if (errorRango()) {
        <p role="alert" class="text-sm text-red-700">{{ errorRango() }}</p>
      }

      <section class="bg-white border border-warm-200 rounded-2xl overflow-hidden shadow-warm-sm">
        @if (listado.filas().length === 0 && !listado.cargando()) {
          <p class="text-sm text-warm-500 text-center py-6">No hay eventos de auditoría en el rango y filtros seleccionados.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-warm-50 border-b border-warm-200 text-xs font-bold text-warm-600 uppercase tracking-wider">
                <tr>
                  <th class="px-4 py-3">Fecha</th>
                  <th class="px-4 py-3">Usuario</th>
                  <th class="px-4 py-3">Acción</th>
                  <th class="px-4 py-3">Recurso</th>
                  <th class="px-4 py-3">Petición</th>
                  <th class="px-4 py-3 text-center">Resultado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-warm-100">
                @for (e of listado.filas(); track e.id) {
                  <tr class="hover:bg-warm-50/70">
                    <td class="px-4 py-3 font-mono text-xs text-warm-600 whitespace-nowrap">{{ e.ocurridoEn | date: 'yyyy-MM-dd HH:mm:ss' }}</td>
                    <td class="px-4 py-3">
                      <span class="font-semibold text-warm-900 text-xs block">{{ e.nombreActor || e.idActor || 'Sistema' }}</span>
                      <span class="text-[10px] text-warm-500 uppercase">{{ e.tipoActor }}</span>
                    </td>
                    <td class="px-4 py-3 font-mono text-xs text-warm-800">{{ e.accion }}</td>
                    <td class="px-4 py-3 text-xs text-warm-700">{{ e.tipoRecurso }} {{ e.idRecurso || '' }}</td>
                    <td class="px-4 py-3 font-mono text-[11px] text-warm-500">{{ e.metodoHttp }} {{ e.ruta }} · {{ e.estadoHttp }}</td>
                    <td class="px-4 py-3 text-center">
                      <app-badge [variant]="e.resultado === 'SUCCESS' ? 'success' : 'danger'">
                        {{ e.resultado === 'SUCCESS' ? 'Exitoso' : 'Fallido' }}
                      </app-badge>
                      @if (e.codigoError) {
                        <span class="block text-[10px] text-red-700 font-mono mt-0.5">{{ e.codigoError }}</span>
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
          [pageSize]="listado.tamano()"
          [currentPage]="listado.pagina()"
          (pageChange)="listado.irAPagina($event)"
          (pageSizeChange)="listado.cambiarTamano($event)"
        ></app-pagination>
      </section>
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
  soloAsistencia = signal(true);
  errorRango = signal<string | null>(null);

  readonly listado = new ListadoPaginado<EventoAuditoriaItem>(
    (pagina, tamano) => {
      const rango = rangoUtc(this.desde(), this.hasta());
      return this.service.getAuditoria({
        desde: rango?.desde ?? null,
        hasta: rango?.hasta ?? null,
        accion: this.accion().trim().toUpperCase() || null,
        resultado: this.resultado() || null,
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

  /** Valida el rango en el cliente (mismas reglas del backend) antes de consultar. */
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
