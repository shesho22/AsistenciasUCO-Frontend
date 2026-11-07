import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  EstadoSolicitudIngreso,
  SolicitudIngresoDocente,
  SolicitudIngresoService,
} from '../../../../core/services/solicitud-ingreso.service';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';

type EstadoFiltro = 'TODOS' | EstadoSolicitudIngreso;

const ETIQUETA_ESTADO: Record<EstadoSolicitudIngreso, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
  EN_ESPERA: 'En espera',
  RETIRADA: 'Retirada',
};

const MOTIVO_MAXIMO = 500;

/**
 * HU053-HU055 (docente titular): bandeja de solicitudes de ingreso de un grupo en orden de llegada. Aceptar matricula
 * si hay cupo y, si no, deja la solicitud en lista de espera; el docente puede aceptar a cualquiera de la lista cuando
 * se libere cupo. Rechazar exige motivo. El cupo con bloqueo lo valida el backend.
 */
@Component({
  selector: 'app-teacher-grupo-solicitudes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-b-2xl border-x border-b border-warm-200 shadow-warm-sm p-6 space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-warm-100">
        <div>
          <h3 class="font-serif font-bold text-lg text-warm-900">Solicitudes de ingreso</h3>
          <p class="text-xs text-warm-500">Orden de llegada. Sin cupo, aceptar deja la solicitud en lista de espera.</p>
        </div>
        <div class="flex items-center gap-3">
          @if (cupos(); as c) {
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-success-100 text-success-800 border border-success-200">
              Cupos disponibles: {{ c.disponibles }} de {{ c.capacidad }}
            </span>
          }
          <select
            class="px-3 py-1.5 bg-white border border-warm-200 rounded-xl text-xs"
            [value]="estadoFiltro()"
            (change)="onEstadoChange($any($event.target).value)"
          >
            <option value="TODOS">Todas</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="EN_ESPERA">En espera</option>
            <option value="ACEPTADA">Aceptadas</option>
            <option value="RECHAZADA">Rechazadas</option>
            <option value="RETIRADA">Retiradas</option>
          </select>
        </div>
      </div>

      @if (cargando()) {
        <p class="text-sm text-warm-500">Cargando solicitudes...</p>
      } @else if (solicitudes().length === 0) {
        <p class="text-sm text-warm-500 text-center py-8">No hay solicitudes de ingreso con este filtro.</p>
      } @else {
        <div class="space-y-2">
          @for (s of solicitudes(); track s.id) {
            <div class="p-3.5 rounded-xl bg-warm-50 border border-warm-200 flex flex-wrap items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="font-bold text-xs text-warm-900">{{ s.estudianteNombre }}</p>
                <p class="text-[11px] font-mono text-warm-500">Doc / ID: {{ s.numeroIdentificacion ?? 'N/A' }}</p>
                @if (s.motivoRechazo) {
                  <p class="text-[11px] text-danger-700">Motivo: {{ s.motivoRechazo }}</p>
                }
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-warm-200 text-warm-800">
                  {{ etiqueta(s.estado) }}{{ s.posicionEspera ? ' · #' + s.posicionEspera + ' en espera' : '' }}
                </span>
                @if (esAbierta(s)) {
                  <button
                    type="button"
                    data-accion="aceptar"
                    [disabled]="procesando()"
                    (click)="aceptar(s)"
                    class="px-2 py-1 text-[11px] font-semibold rounded-lg text-primary-800 bg-primary-50 hover:bg-primary-100 border border-primary-200"
                  >
                    Aceptar
                  </button>
                  <button
                    type="button"
                    data-accion="rechazar"
                    [disabled]="procesando()"
                    (click)="iniciarRechazo(s)"
                    class="px-2 py-1 text-[11px] font-semibold rounded-lg text-danger-700 bg-danger-50 hover:bg-danger-100 border border-danger-200"
                  >
                    Rechazar
                  </button>
                }
              </div>
            </div>
            @if (solicitudEnRechazo()?.id === s.id) {
              <div class="p-3 rounded-xl border border-danger-200 bg-danger-50/40 space-y-2">
                <label class="flex flex-col gap-1 text-xs font-semibold text-warm-700">
                  Motivo del rechazo
                  <textarea
                    rows="2"
                    maxlength="500"
                    [ngModel]="motivoRechazo()"
                    (ngModelChange)="motivoRechazo.set($event); errorRechazo.set('')"
                    class="w-full p-2 bg-white border border-warm-200 rounded-lg text-sm"
                  ></textarea>
                </label>
                @if (errorRechazo()) {
                  <p class="text-xs text-danger-700">{{ errorRechazo() }}</p>
                }
                <div class="flex justify-end gap-2">
                  <button type="button" (click)="cancelarRechazo()" class="px-3 py-1 text-xs rounded-lg border border-warm-200">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    data-accion="confirmar-rechazo"
                    [disabled]="procesando()"
                    (click)="confirmarRechazo()"
                    class="px-3 py-1 text-xs font-semibold rounded-lg text-white bg-danger-700 hover:bg-danger-800"
                  >
                    Rechazar solicitud
                  </button>
                </div>
              </div>
            }
          }
        </div>
      }
    </div>
  `,
})
export class TeacherGrupoSolicitudesComponent implements OnInit {
  private readonly service = inject(SolicitudIngresoService);
  private readonly toast = inject(ToastService);

  readonly grupoId = input.required<string>();
  /** Una aceptación con cupo matricula (o reactiva) al estudiante: el padrón del hub debe recargarse. */
  readonly matriculaCambiada = output<void>();

  readonly solicitudes = signal<SolicitudIngresoDocente[]>([]);
  /** Los cupos llegan en cada solicitud; sin solicitudes no se conocen y no se muestra "0 de 0". */
  readonly cupos = signal<{ disponibles: number; capacidad: number } | null>(null);
  readonly estadoFiltro = signal<EstadoFiltro>('TODOS');
  readonly cargando = signal(false);
  readonly procesando = signal(false);
  readonly solicitudEnRechazo = signal<SolicitudIngresoDocente | null>(null);
  readonly motivoRechazo = signal('');
  readonly errorRechazo = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  onEstadoChange(estado: string): void {
    this.estadoFiltro.set(estado as EstadoFiltro);
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    const estado = this.estadoFiltro();
    this.service
      .solicitudesGrupo(this.grupoId(), { estado: estado === 'TODOS' ? undefined : estado, pagina: 1, tamano: 100 })
      .subscribe({
        next: (res) => {
          const datos = res.datos ?? [];
          this.solicitudes.set(datos);
          if (datos.length > 0) {
            this.cupos.set({ disponibles: datos[0].cuposDisponibles, capacidad: datos[0].capacidadGrupo });
          }
          this.cargando.set(false);
        },
        error: (error: unknown) => {
          this.solicitudes.set([]);
          this.cargando.set(false);
          this.toast.error(getApiErrorMessage(error));
        },
      });
  }

  aceptar(solicitud: SolicitudIngresoDocente): void {
    if (this.procesando()) return;
    this.procesando.set(true);
    this.service.resolver(solicitud.id, 'ACEPTAR').subscribe({
      next: (res) => {
        this.procesando.set(false);
        if (res.datos?.estadoResultante === 'EN_ESPERA') {
          this.toast.info(`El grupo no tiene cupo: ${solicitud.estudianteNombre} quedó en lista de espera.`);
        } else {
          this.toast.success(`${solicitud.estudianteNombre} quedó matriculado en el grupo.`);
          this.matriculaCambiada.emit();
        }
        this.cargar();
      },
      error: (error: unknown) => {
        this.procesando.set(false);
        this.toast.error(getApiErrorMessage(error));
      },
    });
  }

  iniciarRechazo(solicitud: SolicitudIngresoDocente): void {
    this.solicitudEnRechazo.set(solicitud);
    this.motivoRechazo.set('');
    this.errorRechazo.set('');
  }

  cancelarRechazo(): void {
    this.solicitudEnRechazo.set(null);
  }

  confirmarRechazo(): void {
    const solicitud = this.solicitudEnRechazo();
    const motivo = this.motivoRechazo().trim();
    if (!solicitud) return;
    if (!motivo || motivo.length > MOTIVO_MAXIMO) {
      this.errorRechazo.set('El motivo del rechazo es obligatorio (máximo 500 caracteres).');
      return;
    }
    this.procesando.set(true);
    this.service.resolver(solicitud.id, 'RECHAZAR', motivo).subscribe({
      next: () => {
        this.procesando.set(false);
        this.solicitudEnRechazo.set(null);
        this.toast.success('Solicitud rechazada.');
        this.cargar();
      },
      error: (error: unknown) => {
        this.procesando.set(false);
        this.errorRechazo.set(getApiErrorMessage(error));
      },
    });
  }

  esAbierta(solicitud: SolicitudIngresoDocente): boolean {
    return solicitud.estado === 'PENDIENTE' || solicitud.estado === 'EN_ESPERA';
  }

  etiqueta(estado: EstadoSolicitudIngreso): string {
    return ETIQUETA_ESTADO[estado] ?? estado;
  }
}
