import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { BadgeComponent, BadgeVariant } from '../../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { FechaCortaPipe, RangoHorarioPipe } from '../../../shared/pipes/fecha-hora.pipes';
import { DocenteSolicitudesSesionService } from '../../../core/services/docente-solicitudes-sesion.service';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { SolicitudSesionItem } from '../../../core/models/coordinador-solicitud-sesion.model';
import { EstadoSolicitudSesion } from '../../../core/models/sesion-estado.model';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { LoadErrorState, classifyLoadError } from '../../../core/api/errors/load-error.util';

/**
 * ATA D6: lista de solo lectura de las solicitudes de sesión extraordinaria del docente, con su estado y la observación
 * de quien las resolvió. El docente no aprueba ni rechaza: eso es del coordinador. Los textos los entrega el backend.
 */
@Component({
  selector: 'app-teacher-solicitudes-sesion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [
    BadgeComponent,
    EmptyStateComponent,
    PaginationComponent,
    ErrorCargaComponent,
    PageHeaderComponent,
    FechaCortaPipe,
    RangoHorarioPipe,
  ],
  template: `
    <div class="space-y-5 min-w-0">
      <app-page-header
        titulo="Solicitudes de sesión"
        descripcion="Estado de las sesiones extraordinarias que has pedido a tu coordinación."
      />

      <section class="superficie p-4 sm:p-5 space-y-4" aria-label="Mis solicitudes de sesión" data-testid="solicitudes-docente">
        <label class="inline-flex items-center gap-2 text-sm text-warm-800 min-h-[44px]">
          <input
            type="checkbox"
            data-testid="solo-pendientes"
            [checked]="soloPendientes()"
            (change)="alternarSoloPendientes($any($event.target).checked)"
            class="h-4 w-4 rounded border-warm-300"
          />
          Solo pendientes
        </label>

        @if (error() && !cargando()) {
          <app-error-carga [error]="error()!" (reintentar)="cargar()" />
        } @else if (cargando() && solicitudes().length === 0) {
          <div class="space-y-3" data-testid="solicitudes-cargando">
            @for (n of [1, 2]; track n) {
              <div class="h-14 bg-warm-100 rounded-xl animate-pulse"></div>
            }
          </div>
        } @else if (solicitudes().length === 0) {
          @if (soloPendientes()) {
            <app-empty-state
              variant="info"
              title="No tienes solicitudes pendientes"
              causa="Ninguna de tus solicitudes de sesión extraordinaria espera respuesta."
              accionTexto="Ver todas las solicitudes"
              (accion)="alternarSoloPendientes(false)"
            />
          } @else {
            <app-empty-state
              variant="info"
              title="Aún no has solicitado sesiones"
              causa="Cuando pidas una sesión extraordinaria aparecerá aquí con su estado."
            />
          }
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                  <th scope="col" class="py-2 pr-3">Grupo y asignatura</th>
                  <th scope="col" class="py-2 pr-3">Fecha y horario</th>
                  <th scope="col" class="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (s of solicitudes(); track s.idSesion) {
                  <tr class="border-b border-warm-50" [attr.data-testid]="'solicitud-' + s.idSesion">
                    <td class="py-2 pr-3 text-warm-700">
                      <span class="font-semibold text-warm-900">{{ s.nombreGrupo }} · {{ s.nombreAsignatura }}</span>
                      <span class="block text-xs text-warm-500">{{ s.nombreSesion }}</span>
                      @if (lineaResolutor(s); as linea) {
                        <span class="block text-xs text-warm-600 mt-0.5" data-testid="solicitud-resolutor">{{ linea }}</span>
                      }
                    </td>
                    <td class="py-2 pr-3 text-warm-700 text-xs">
                      {{ s.fechaHoraInicio | fechaCorta: zona() }}
                      <span class="block font-mono">{{ s.fechaHoraInicio | rangoHorario: s.fechaHoraFin : zona() }}</span>
                    </td>
                    <td class="py-2">
                      <app-badge [variant]="variante(s.estadoSolicitud)" size="sm">{{ s.nombreEstadoSolicitud }}</app-badge>
                      @if (s.estadoSolicitud !== 'PENDIENTE' && s.observacion) {
                        <span class="block text-xs text-warm-600 break-words mt-1" data-testid="solicitud-observacion">{{ s.observacion }}</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <app-pagination
          [totalItems]="total()"
          [pageSize]="tamano()"
          [currentPage]="pagina()"
          (pageChange)="onPagina($event)"
          (pageSizeChange)="onTamano($event)"
        />
      </section>
    </div>
  `,
})
export class TeacherSolicitudesSesionComponent implements OnInit {
  private readonly servicio = inject(DocenteSolicitudesSesionService);
  private readonly toast = inject(ToastService);
  private readonly timeZone = inject(SessionTimeZoneService);

  readonly solicitudes = signal<SolicitudSesionItem[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(1);
  readonly tamano = signal(20);
  readonly soloPendientes = signal(true);
  readonly cargando = signal(false);
  readonly error = signal<LoadErrorState | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  zona(): string {
    return this.timeZone.zone();
  }

  /** Quién resuelve la solicitud; solo compone los nombres recibidos. Vacío si el backend no informa ninguno. */
  lineaResolutor(s: SolicitudSesionItem): string {
    const coordinador = s.nombreCoordinadorResolutor?.trim();
    const programa = s.nombreProgramaResponsable?.trim();
    if (coordinador && programa) return `La resuelve: ${coordinador} (Coordinación de ${programa})`;
    if (coordinador) return `La resuelve: ${coordinador}`;
    if (programa) return `La resuelve: Coordinación de ${programa}`;
    return '';
  }

  variante(estado: EstadoSolicitudSesion): BadgeVariant {
    if (estado === 'PENDIENTE') return 'warning';
    if (estado === 'APROBADA') return 'success';
    return 'danger';
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio
      .consultar({ soloPendientes: this.soloPendientes(), pagina: this.pagina(), tamano: this.tamano() })
      .subscribe({
        next: (res) => {
          this.solicitudes.set(res.elementos ?? []);
          this.total.set(Number(res.totalElementos ?? 0));
          this.cargando.set(false);
        },
        error: (e: unknown) => {
          this.solicitudes.set([]);
          this.total.set(0);
          this.cargando.set(false);
          this.error.set(classifyLoadError(e));
          this.toast.error(getApiErrorMessage(e));
        },
      });
  }

  alternarSoloPendientes(valor: boolean): void {
    this.soloPendientes.set(valor);
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
}
