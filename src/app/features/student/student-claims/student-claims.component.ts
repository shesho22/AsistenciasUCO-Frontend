import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, finalize } from 'rxjs';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { EstadoSolicitudRevision, SolicitudRevisionItem } from '../../../core/models/role-management.model';
import { CardComponent } from '../../../shared/components/card/card.component';
import { BadgeComponent, BadgeVariant } from '../../../shared/components/badge/badge.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { getApiErrorMessage, getApiSuccessMessage } from '../../../core/api/errors/api-error.util';
import { etiquetaEstadoReclamo, etiquetaResultadoAprobacion, varianteEstadoReclamo } from '../../../core/utils/reclamo-estado.util';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { LoadErrorState, classifyLoadError } from '../../../core/api/errors/load-error.util';
import { ButtonComponent } from '../../../shared/components/button/button.component';

type EstadoFiltro = 'TODOS' | EstadoSolicitudRevision;

/**
 * "Mis Reclamos" (HU010/HU011, consulta): solicitudes de revisión del estudiante autenticado con su estado, la
 * respuesta del docente y el soporte adjunto. El backend filtra por propietario, estado y página; el soporte se
 * descarga por el endpoint autenticado `GET /archivos/{fileId}` (regla PROPIETARIO de LB-004D).
 */
@Component({
  selector: 'app-student-claims',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, CommonModule, CardComponent, BadgeComponent, PaginationComponent, ButtonComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 class="font-serif text-2xl sm:text-3xl font-bold text-warm-900">Mis Reclamos</h1>
          <p class="text-sm text-warm-600 mt-1">Consulta el estado de tus solicitudes de revisión de asistencia.</p>
        </div>
        <label class="flex flex-col gap-1 text-xs font-semibold text-warm-700">
          Estado
          <select
            class="px-3 py-2 min-h-[44px] bg-white border border-warm-200 rounded-xl text-sm"
            [value]="estadoFiltro()"
            (change)="onEstadoChange($any($event.target).value)"
          >
            <option value="TODOS">Todos</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="APROBADA">Aprobadas</option>
            <option value="RECHAZADA">Rechazadas</option>
          </select>
        </label>
      </div>

      @if (isLoading()) {
        <div class="space-y-4" role="status" aria-live="polite" aria-label="Cargando solicitudes" data-testid="reclamos-cargando">
          @for (n of [1, 2, 3]; track n) {
            <div class="h-32 bg-warm-100 rounded-2xl animate-pulse"></div>
          }
        </div>
      } @else if (errorCarga()) {
        <app-card>
          <div class="py-6 text-center space-y-3" role="alert" data-testid="reclamos-error">
            <p class="text-sm font-bold text-danger-800">{{ errorCarga()!.titulo }}</p>
            <p class="text-xs text-warm-600">{{ errorCarga()!.mensaje }}</p>
            <app-button variant="secondary" size="sm" (clicked)="cargar()">Reintentar</app-button>
          </div>
        </app-card>
      } @else if (reclamos().length === 0) {
        <app-empty-state
          variant="search"
          title="No tienes solicitudes de revisión con este filtro"
          causa="Cambia el filtro de estado o radica una solicitud desde el detalle de tu materia."
        />
      } @else {
        <div class="space-y-4">
          @for (reclamo of reclamos(); track reclamo.id) {
            <app-card>
              <div class="space-y-3">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p class="font-semibold text-warm-900">{{ reclamo.materiaNombre }}</p>
                    <p class="text-xs text-warm-600">
                      {{ reclamo.materiaCodigo }} · {{ reclamo.grupo }} · Sesión {{ reclamo.sesionNumero }}
                      @if (reclamo.fechaSesion) {
                        ({{ reclamo.fechaSesion }})
                      }
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <app-badge [variant]="badgeVariant(reclamo.estadoSolicitud)">{{ etiqueta(reclamo.estadoSolicitud) }}</app-badge>
                    @if (reclamo.estadoSolicitud === 'PENDIENTE') {
                      <button
                        type="button"
                        data-accion="retirar-reclamo"
                        [disabled]="retirando() === reclamo.id"
                        (click)="retirar(reclamo)"
                        class="px-3 py-2 min-h-[44px] text-xs font-medium text-danger-700 bg-danger-50 hover:bg-danger-100 border border-danger-200 rounded-lg disabled:opacity-60"
                        title="Retirar solicitud de revisión pendiente"
                      >
                        Retirar
                      </button>
                    }
                  </div>
                </div>
                @if (textoToma(reclamo); as toma) {
                  <p class="text-xs font-semibold text-warm-800" data-testid="reclamo-toma">{{ toma }}</p>
                }
                @if (textoResultado(reclamo); as resultado) {
                  <p class="text-xs font-bold text-success-800" data-testid="reclamo-resultado">{{ resultado }}</p>
                }
                <p class="text-xs text-warm-500">Radicada el {{ reclamo.fechaSolicitud | date: 'dd/MM/yyyy' }}</p>
                <div>
                  <span class="text-xs font-bold uppercase tracking-wider text-warm-700">Mi justificación</span>
                  <p class="text-sm text-warm-800">{{ reclamo.justificacionSolicitud }}</p>
                </div>
                @if (reclamo.justificacionRespuesta) {
                  <div>
                    <span class="text-xs font-bold uppercase tracking-wider text-warm-700">Respuesta del docente</span>
                    <p class="text-sm text-warm-800">{{ reclamo.justificacionRespuesta }}</p>
                  </div>
                }
                @if (reclamo.soporteAdjunto; as soporte) {
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-semibold text-primary-800 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-xl"
                    [disabled]="descargando()"
                    (click)="descargarSoporte(reclamo)"
                  >
                    Descargar soporte: {{ soporte.nombre }}
                  </button>
                }
              </div>
            </app-card>
          }
        </div>
        <app-pagination
          [totalItems]="total()"
          [pageSize]="tamano()"
          [currentPage]="pagina()"
          [showPageSizeSelector]="true"
          (pageChange)="onPagina($event)"
          (pageSizeChange)="onTamano($event)"
        />
      }
    </div>
  `,
})
export class StudentClaimsComponent implements OnInit, OnDestroy {
  private readonly claimService = inject(AttendanceClaimService);
  private readonly toast = inject(ToastService);
  private readonly zona = inject(SessionTimeZoneService);
  private listaSub?: Subscription;

  readonly reclamos = signal<SolicitudRevisionItem[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(1);
  readonly tamano = signal(10);
  readonly estadoFiltro = signal<EstadoFiltro>('TODOS');
  readonly isLoading = signal(false);
  readonly errorCarga = signal<LoadErrorState | null>(null);
  readonly descargando = signal(false);
  /** id del reclamo que se está retirando (evita el doble envío). */
  readonly retirando = signal<string | null>(null);

  /** "Toma N · HH:mm" cuando el reclamo es de una toma; `null` si es de la sesión. */
  textoToma(reclamo: SolicitudRevisionItem): string | null {
    if (reclamo.numeroToma == null) return null;
    const hora = reclamo.fechaPuntoControlUtc ? this.zona.formatTemporal(reclamo.fechaPuntoControlUtc, 'time') : null;
    return hora ? `Toma ${reclamo.numeroToma} · ${hora}` : `Toma ${reclamo.numeroToma}`;
  }

  /** "Aprobado: estuvo presente" o "Aprobado: ausencia justificada" solo en un reclamo aprobado con resultado. */
  textoResultado(reclamo: SolicitudRevisionItem): string | null {
    return reclamo.estadoSolicitud === 'APROBADA' ? etiquetaResultadoAprobacion(reclamo.resultadoAprobacion) : null;
  }

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.listaSub?.unsubscribe();
  }

  onEstadoChange(estado: string): void {
    this.estadoFiltro.set(estado as EstadoFiltro);
    this.pagina.set(1);
    this.cargar();
  }

  onPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  onTamano(tamano: number): void {
    this.tamano.set(tamano);
    this.pagina.set(1);
    this.cargar();
  }

  cargar(): void {
    this.listaSub?.unsubscribe();
    this.isLoading.set(true);
    this.errorCarga.set(null);
    const estado = this.estadoFiltro();
    this.listaSub = this.claimService
      .getReclamosEstudiante({
        estado: estado === 'TODOS' ? undefined : estado,
        pagina: this.pagina(),
        tamano: this.tamano(),
      })
      .subscribe({
        next: (res) => {
          this.reclamos.set(res.datos);
          this.total.set(res.total ?? res.datos.length);
          this.isLoading.set(false);
        },
        error: (error: unknown) => {
          this.reclamos.set([]);
          this.total.set(0);
          this.errorCarga.set(classifyLoadError(error));
          this.isLoading.set(false);
          this.toast.error(getApiErrorMessage(error));
        },
      });
  }

  descargarSoporte(reclamo: SolicitudRevisionItem): void {
    const soporte = reclamo.soporteAdjunto;
    if (!soporte?.fileId) {
      this.toast.warning('Esta solicitud no tiene un soporte descargable.');
      return;
    }
    if (this.descargando()) return;
    this.descargando.set(true);
    this.claimService
      .descargarSoporte(soporte.fileId)
      .pipe(finalize(() => this.descargando.set(false)))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = soporte.nombre.replace(/[\\/:*?"<>|\r\n]/g, '_');
          anchor.click();
          URL.revokeObjectURL(url);
          this.toast.success(`Soporte "${soporte.nombre}" descargado.`);
        },
        error: (error: unknown) => this.toast.error(getApiErrorMessage(error)),
      });
  }

  badgeVariant(estado: EstadoSolicitudRevision): BadgeVariant {
    return varianteEstadoReclamo(estado);
  }

  etiqueta(estado: EstadoSolicitudRevision): string {
    return etiquetaEstadoReclamo(estado);
  }

  /** A.2-7: retira una solicitud pendiente; el mensaje y los errores son los del backend. */
  retirar(reclamo: SolicitudRevisionItem): void {
    if (this.retirando()) return;
    this.retirando.set(reclamo.id);
    this.claimService
      .eliminarReclamo(reclamo.id)
      .pipe(finalize(() => this.retirando.set(null)))
      .subscribe({
        next: (res) => {
          this.toast.success(getApiSuccessMessage(res, 'Solicitud retirada.'));
          this.cargar();
        },
        error: (error: unknown) => this.toast.error(getApiErrorMessage(error)),
      });
  }
}
