import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import {
  EstadoSolicitudIngreso,
  SolicitudIngresoEstudiante,
  SolicitudIngresoService,
} from '../../../core/services/solicitud-ingreso.service';
import { CardComponent } from '../../../shared/components/card/card.component';
import { BadgeComponent, BadgeVariant } from '../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { isUuid } from '../../../core/utils/uuid.util';

type EstadoFiltro = 'TODOS' | EstadoSolicitudIngreso;

const ETIQUETA_ESTADO: Record<EstadoSolicitudIngreso, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
  EN_ESPERA: 'En espera',
  RETIRADA: 'Retirada',
};

/**
 * HU053-HU055 (estudiante): solicitar el ingreso a un grupo (el docente comparte el enlace `?grupo={id}`), consultar
 * las solicitudes propias con su estado y el motivo de rechazo, y retirar las abiertas (pendiente o en espera).
 */
@Component({
  selector: 'app-student-enrollment-requests',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, CardComponent, BadgeComponent, PaginationComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div>
        <h1 class="font-serif text-2xl sm:text-3xl font-bold text-warm-900">Mis solicitudes de ingreso</h1>
        <p class="text-sm text-warm-600 mt-1">Solicita el ingreso a un grupo y consulta si el docente la aceptó.</p>
      </div>

      <app-card>
        <div class="space-y-3">
          <label class="flex flex-col gap-1 text-xs font-semibold text-warm-700">
            Identificador del grupo (lo comparte tu docente)
            <input
              type="text"
              [ngModel]="grupoId()"
              (ngModelChange)="grupoId.set($event); error.set('')"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              class="px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm font-mono"
            />
          </label>
          @if (error()) {
            <p class="text-xs text-danger-700 bg-danger-50 border border-danger-200 rounded-lg p-2">{{ error() }}</p>
          }
          <button
            type="button"
            data-accion="solicitar"
            [disabled]="enviando()"
            (click)="solicitar()"
            class="px-4 py-2 text-sm font-semibold rounded-xl text-white bg-primary-700 hover:bg-primary-800 disabled:opacity-60"
          >
            {{ enviando() ? 'Enviando...' : 'Solicitar ingreso' }}
          </button>
        </div>
      </app-card>

      <div class="flex justify-end">
        <label class="flex flex-col gap-1 text-xs font-semibold text-warm-700">
          Estado
          <select
            class="px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm"
            [value]="estadoFiltro()"
            (change)="onEstadoChange($any($event.target).value)"
          >
            <option value="TODOS">Todos</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="EN_ESPERA">En espera</option>
            <option value="ACEPTADA">Aceptadas</option>
            <option value="RECHAZADA">Rechazadas</option>
            <option value="RETIRADA">Retiradas</option>
          </select>
        </label>
      </div>

      @if (cargando()) {
        <p class="text-sm text-warm-600">Cargando solicitudes...</p>
      } @else if (solicitudes().length === 0) {
        <app-card>
          <p class="text-sm text-warm-600 text-center py-6">No tienes solicitudes de ingreso con este filtro.</p>
        </app-card>
      } @else {
        <div class="space-y-3">
          @for (s of solicitudes(); track s.id) {
            <app-card>
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-semibold text-warm-900">{{ s.asignaturaNombre }}</p>
                  <p class="text-xs text-warm-600">{{ s.grupoNombre }} · Docente: {{ s.docenteNombre }}</p>
                  @if (s.motivoRechazo) {
                    <p class="text-xs text-danger-700 mt-1">Motivo del rechazo: {{ s.motivoRechazo }}</p>
                  }
                </div>
                <div class="flex flex-col items-end gap-2">
                  <app-badge [variant]="variante(s.estado)">{{ etiqueta(s.estado) }}</app-badge>
                  @if (esAbierta(s)) {
                    <button
                      type="button"
                      data-accion="retirar-solicitud"
                      (click)="retirar(s)"
                      class="px-2 py-1 text-xs font-semibold rounded-lg text-danger-700 bg-danger-50 hover:bg-danger-100 border border-danger-200"
                    >
                      Retirar solicitud
                    </button>
                  }
                </div>
              </div>
            </app-card>
          }
        </div>
        <app-pagination
          [totalItems]="total()"
          [pageSize]="tamano()"
          [currentPage]="pagina()"
          [showPageSizeSelector]="true"
          (pageChange)="pagina.set($event); cargar()"
          (pageSizeChange)="tamano.set($event); pagina.set(1); cargar()"
        />
      }
    </div>
  `,
})
export class StudentEnrollmentRequestsComponent implements OnInit {
  private readonly service = inject(SolicitudIngresoService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly solicitudes = signal<SolicitudIngresoEstudiante[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(1);
  readonly tamano = signal(10);
  readonly estadoFiltro = signal<EstadoFiltro>('TODOS');
  readonly cargando = signal(false);
  readonly grupoId = signal('');
  readonly error = signal('');
  readonly enviando = signal(false);

  ngOnInit(): void {
    this.grupoId.set(this.route.snapshot.queryParamMap.get('grupo') ?? '');
    this.cargar();
  }

  onEstadoChange(estado: string): void {
    this.estadoFiltro.set(estado as EstadoFiltro);
    this.pagina.set(1);
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    const estado = this.estadoFiltro();
    this.service
      .misSolicitudes({ estado: estado === 'TODOS' ? undefined : estado, pagina: this.pagina(), tamano: this.tamano() })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (res) => {
          this.solicitudes.set(res.datos ?? []);
          this.total.set(res.total ?? (res.datos ?? []).length);
        },
        error: (error: unknown) => {
          this.solicitudes.set([]);
          this.total.set(0);
          this.toast.error(getApiErrorMessage(error));
        },
      });
  }

  solicitar(): void {
    const grupoId = this.grupoId().trim();
    if (!isUuid(grupoId)) {
      this.error.set('Ingresa el identificador del grupo que te compartió tu docente.');
      return;
    }
    if (this.enviando()) return;
    this.enviando.set(true);
    this.error.set('');
    this.service
      .solicitar(grupoId)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Solicitud enviada. El docente del grupo la revisará.');
          this.grupoId.set('');
          this.cargar();
        },
        error: (error: unknown) => this.error.set(getApiErrorMessage(error)),
      });
  }

  retirar(solicitud: SolicitudIngresoEstudiante): void {
    this.service.retirar(solicitud.id).subscribe({
      next: () => {
        this.toast.success('Solicitud retirada.');
        this.cargar();
      },
      error: (error: unknown) => this.toast.error(getApiErrorMessage(error)),
    });
  }

  esAbierta(solicitud: SolicitudIngresoEstudiante): boolean {
    return solicitud.estado === 'PENDIENTE' || solicitud.estado === 'EN_ESPERA';
  }

  etiqueta(estado: EstadoSolicitudIngreso): string {
    return ETIQUETA_ESTADO[estado] ?? estado;
  }

  variante(estado: EstadoSolicitudIngreso): BadgeVariant {
    switch (estado) {
      case 'ACEPTADA':
        return 'success';
      case 'RECHAZADA':
        return 'danger';
      case 'EN_ESPERA':
      case 'PENDIENTE':
        return 'warning';
      default:
        return 'neutral';
    }
  }
}
