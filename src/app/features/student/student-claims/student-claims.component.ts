import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, finalize } from 'rxjs';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { EstadoSolicitudRevision, SolicitudRevisionItem, SoporteAdjuntoItem } from '../../../core/models/role-management.model';
import { CardComponent } from '../../../shared/components/card/card.component';
import { BadgeComponent, BadgeVariant } from '../../../shared/components/badge/badge.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import {
  TablaDatosComponent,
  TAMANO_PAGINA_TABLA,
  TAMANOS_PAGINA_TABLA,
} from '../../../shared/components/tabla-datos/tabla-datos.component';
import { getApiErrorMessage, getApiSuccessMessage } from '../../../core/api/errors/api-error.util';
import { etiquetaEstadoReclamo, etiquetaResultadoAprobacion, varianteEstadoReclamo } from '../../../core/utils/reclamo-estado.util';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { LoadErrorState, classifyLoadError } from '../../../core/api/errors/load-error.util';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

type EstadoFiltro = 'TODOS' | EstadoSolicitudRevision;

/**
 * "Mis Reclamos" (HU010/HU011, consulta): solicitudes de revisión del estudiante autenticado con su estado, la
 * respuesta del docente y sus soportes adjuntos (HU015: todos, no solo el primero). El backend filtra por propietario, estado y página; el soporte se
 * descarga por el endpoint autenticado `GET /archivos/{fileId}` (regla PROPIETARIO de LB-004D).
 */
@Component({
    selector: 'app-student-claims',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PageHeaderComponent, EmptyStateComponent, CommonModule, CardComponent, BadgeComponent, TablaDatosComponent, ButtonComponent],
    template: `
    <div class="space-y-4 animate-fade-in">
      <app-page-header
        alineacion="final"
        titulo="Mis Reclamos"
        descripcion="Consulta el estado de tus solicitudes de revisión de asistencia."
      >
        <label cabecera-acciones class="flex flex-col gap-1 text-xs font-semibold text-warm-700">
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
      </app-page-header>

      @if (errorCarga() && !isLoading()) {
        <app-card>
          <div class="py-6 text-center space-y-3" role="alert" data-testid="reclamos-error">
            <p class="text-sm font-bold text-danger-800">{{ errorCarga()!.titulo }}</p>
            <p class="text-xs text-warm-600">{{ errorCarga()!.mensaje }}</p>
            <app-button variant="secondary" size="sm" (clicked)="cargar()">Reintentar</app-button>
          </div>
        </app-card>
      } @else if (!isLoading() && reclamos().length === 0) {
        <app-empty-state
          variant="search"
          title="No tienes solicitudes de revisión con este filtro"
          causa="Cambia el filtro de estado o radica una solicitud desde el detalle de tu materia."
        />
      } @else {
        @if (isLoading()) {
          <p class="sr-only" role="status" aria-live="polite" data-testid="reclamos-cargando">Cargando solicitudes</p>
        }
        <app-tabla-datos
          etiqueta="Mis solicitudes de revisión"
          [etiquetaVisible]="false"
          [columnas]="6"
          anchoMinimo="64rem"
          [tarjetasEnMovil]="true"
          [cargando]="isLoading()"
          [paginada]="!isLoading()"
          [totalItems]="total()"
          [pagina]="pagina()"
          [tamanoPagina]="tamano()"
          [tamanosPagina]="tamanosPagina"
          (paginaChange)="onPagina($event)"
          (tamanoPaginaChange)="onTamano($event)"
        >
          <thead>
            <tr>
              <th scope="col">Materia</th>
              <th scope="col">Sesión</th>
              <th scope="col">Estado</th>
              <th scope="col">Justificación y respuesta</th>
              <th scope="col">Soportes</th>
              <th scope="col" class="col-acciones bg-warm-50"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @if (!isLoading()) {
              @for (reclamo of reclamos(); track reclamo.id) {
                <tr class="align-top" [attr.data-testid]="'reclamo-fila-' + reclamo.id">
                  <td class="md:min-w-[11rem]" data-label="Materia">
                    <span class="block font-semibold text-warm-900">{{ reclamo.materiaNombre }}</span>
                    <span class="block text-xs text-warm-600">{{ reclamo.materiaCodigo }} · {{ reclamo.grupo }}</span>
                  </td>
                  <td class="text-xs text-warm-600 md:whitespace-nowrap" data-label="Sesión">
                    <span class="block text-warm-800">
                      Sesión {{ reclamo.sesionNumero }}
                      @if (reclamo.fechaSesion) {
                        ({{ reclamo.fechaSesion }})
                      }
                    </span>
                    @if (textoToma(reclamo); as toma) {
                      <span class="block font-semibold text-warm-800" data-testid="reclamo-toma">{{ toma }}</span>
                    }
                    <span class="block text-warm-500">Radicada el {{ reclamo.fechaSolicitud | date: 'dd/MM/yyyy' }}</span>
                  </td>
                  <td data-label="Estado">
                    <app-badge [variant]="badgeVariant(reclamo.estadoSolicitud)">{{ etiqueta(reclamo.estadoSolicitud) }}</app-badge>
                    @if (textoResultado(reclamo); as resultado) {
                      <p class="mt-1 text-xs font-bold text-success-800" data-testid="reclamo-resultado">{{ resultado }}</p>
                    }
                  </td>
                  <td class="md:min-w-[16rem] space-y-1.5" data-label="Justificación y respuesta">
                    <div>
                      <span class="block text-xs font-bold uppercase tracking-wider text-warm-700">Mi justificación</span>
                      <p class="text-sm text-warm-800">{{ reclamo.justificacionSolicitud }}</p>
                    </div>
                    @if (reclamo.justificacionRespuesta) {
                      <div>
                        <span class="block text-xs font-bold uppercase tracking-wider text-warm-700">Respuesta del docente</span>
                        <p class="text-sm text-warm-800">{{ reclamo.justificacionRespuesta }}</p>
                      </div>
                    }
                  </td>
                  <td class="md:min-w-[12rem]" data-label="Soportes">
                    @if (soportesDe(reclamo); as soportes) {
                      @if (soportes.length > 0) {
                        <div class="flex flex-col items-start gap-1.5" data-testid="reclamo-soportes">
                          @for (soporte of soportes; track soporte.fileId || $index) {
                            <button
                              type="button"
                              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] text-xs font-semibold text-primary-800 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg text-left"
                              [attr.data-testid]="'btn-descargar-soporte-' + (soporte.fileId || $index)"
                              [disabled]="descargando()"
                              (click)="descargarSoporte(reclamo, soporte)"
                            >
                              Descargar soporte: {{ soporte.nombre }}
                            </button>
                          }
                        </div>
                      } @else {
                        <span class="text-xs text-warm-400">Sin soportes</span>
                      }
                    }
                  </td>
                  <td class="col-acciones bg-white text-right">
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
                  </td>
                </tr>
              }
            }
          </tbody>
        </app-tabla-datos>
      }
    </div>
  `
})
export class StudentClaimsComponent implements OnInit, OnDestroy {
  private readonly claimService = inject(AttendanceClaimService);
  private readonly toast = inject(ToastService);
  private readonly zona = inject(SessionTimeZoneService);
  private listaSub?: Subscription;

  readonly reclamos = signal<SolicitudRevisionItem[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(1);
  readonly tamano = signal(TAMANO_PAGINA_TABLA);
  /** Bloque E: 15/30/50 por página (el backend admite hasta 100). */
  readonly tamanosPagina = [...TAMANOS_PAGINA_TABLA];
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

  /** HU015: todos los soportes del reclamo; en reclamos sin la lista `soportes`, el único `soporteAdjunto`. */
  soportesDe(reclamo: SolicitudRevisionItem): SoporteAdjuntoItem[] {
    if (reclamo.soportes && reclamo.soportes.length > 0) return reclamo.soportes;
    return reclamo.soporteAdjunto ? [reclamo.soporteAdjunto] : [];
  }

  /** Descarga un soporte del reclamo; sin `soporte` descarga el principal (`soporteAdjunto`). */
  descargarSoporte(reclamo: SolicitudRevisionItem, soporte: SoporteAdjuntoItem | undefined = reclamo.soporteAdjunto): void {
    if (!soporte?.fileId) {
      this.toast.warning(mensajeUi('UI_STUDENT_CLAIMS_001'));
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
          this.toast.success(mensajeUi('UI_SOPORTE_DESCARGADO', { nombre: soporte.nombre }));
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
          this.toast.success(getApiSuccessMessage(res, mensajeUi('UI_STUDENT_CLAIMS_002')));
          this.cargar();
        },
        error: (error: unknown) => this.toast.error(getApiErrorMessage(error)),
      });
  }
}
