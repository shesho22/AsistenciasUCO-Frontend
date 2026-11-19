import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { FechaHoraCortaPipe } from '../../../shared/pipes/fecha-hora.pipes';
import { SemaforoAsistenciaComponent } from '../../../shared/components/semaforo-asistencia/semaforo-asistencia.component';
import { Component, OnInit, ChangeDetectionStrategy, DestroyRef, computed, signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertaInasistenciaService } from '../../../core/services/alerta-inasistencia.service';
import { AlertaInasistencia } from '../../../core/models/alerta-inasistencia.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { FaltaReclamableService } from '../../../core/services/falta-reclamable.service';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { FaltaReclamable, FaltasReclamablesSesion } from '../../../core/models/falta-reclamable.model';
import { REALTIME_EVENT_TYPE } from '../../../core/realtime/model/realtime-event.model';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

/** Pestaña "Materias" de "Mis materias": ahí vive el detalle de cada materia. */
const RUTA_MIS_MATERIAS = '/app/estudiante/mis-materias/materias';

/** ATA D10: eventos que cambian la lista de faltas por reclamar (se recarga por SSE, sin polling). */
const EVENTOS_QUE_RECARGAN_FALTAS: readonly string[] = [
  REALTIME_EVENT_TYPE.FALTA_SESION_AVISADA,
  REALTIME_EVENT_TYPE.ASISTENCIAS_TOMA_ACTUALIZADAS,
];

const TAMANO_FALTAS = 20;

/** Agrupa las filas (una por toma) en una tarjeta por sesión; solo presentación, conserva el orden recibido. */
export function agruparFaltasPorSesion(filas: readonly FaltaReclamable[]): FaltasReclamablesSesion[] {
  const porSesion = new Map<string, FaltasReclamablesSesion>();
  for (const fila of filas) {
    let sesion = porSesion.get(fila.idSesion);
    if (!sesion) {
      sesion = {
        idSesion: fila.idSesion,
        idGrupo: fila.idGrupo,
        nombreGrupo: fila.nombreGrupo,
        idAsignatura: fila.idAsignatura,
        nombreAsignatura: fila.nombreAsignatura,
        numeroSesion: fila.numeroSesion,
        fechaHoraInicioUtc: fila.fechaHoraInicioUtc,
        fechaHoraFinUtc: fila.fechaHoraFinUtc,
        fechaLimiteReclamoUtc: fila.fechaLimiteReclamoUtc,
        tomas: [],
      };
      porSesion.set(fila.idSesion, sesion);
    }
    sesion.tomas.push(fila);
  }
  return [...porSesion.values()];
}

@Component({
    selector: 'app-student-alerts',
    imports: [PageHeaderComponent, EmptyStateComponent, FechaHoraCortaPipe, FormsModule, BadgeComponent, SemaforoAsistenciaComponent, PaginationComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <app-page-header
        [enTarjeta]="true"
        etiqueta="Portal Estudiante"
        contexto="Seguimiento de Asistencia"
        titulo="Mis Alertas de Asistencia"
        descripcion="Avisos institucionales sobre el porcentaje de inasistencias acumulado en tus asignaturas."
      >
        <div cabecera-acciones class="flex items-center gap-2">
          <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">
            {{ totalElementos() }} {{ totalElementos() === 1 ? 'alerta' : 'alertas' }}
          </span>
        </div>
      </app-page-header>

      @if (faltasSesiones().length > 0) {
        <section class="space-y-4" data-testid="faltas-reclamables" aria-labelledby="titulo-faltas-reclamables">
          <div class="space-y-1">
            <h2 id="titulo-faltas-reclamables" class="text-base font-bold text-warm-900">Faltas por reclamar</h2>
            <p class="text-xs text-warm-600">
              Tomas en las que quedaste ausente y aún puedes reclamar si tu asistencia es correcta.
            </p>
          </div>
          @for (sesion of faltasSesiones(); track sesion.idSesion) {
            <article
              [attr.data-testid]="'falta-card-' + sesion.idSesion"
              class="bg-white rounded-2xl border border-warning-300 p-5 sm:p-6 shadow-warm-sm space-y-4"
            >
              <div class="flex flex-col gap-1 border-b border-warm-100 pb-3">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-bold text-warm-900">{{ sesion.nombreAsignatura }}</span>
                  <span class="text-xs text-warm-500">• {{ sesion.nombreGrupo }}</span>
                </div>
                <p class="text-xs text-warm-700" data-testid="falta-horario">
                  Sesión {{ sesion.numeroSesion }} · {{ zona.formatTemporal(sesion.fechaHoraInicioUtc, 'date') }}
                  · {{ zona.formatTemporal(sesion.fechaHoraInicioUtc, 'time') }}–{{ zona.formatTemporal(sesion.fechaHoraFinUtc, 'time') }}
                </p>
                <p class="text-xs font-semibold text-warning-800" data-testid="falta-limite">
                  Puedes reclamar hasta {{ zona.formatTemporal(sesion.fechaLimiteReclamoUtc) }}
                </p>
              </div>
              <ul class="space-y-2">
                @for (toma of sesion.tomas; track toma.idToma) {
                  <li class="flex flex-col sm:flex-row sm:items-center justify-between gap-2" [attr.data-testid]="'falta-toma-' + toma.idToma">
                    <span class="text-sm text-warm-800">
                      Toma {{ toma.numeroToma }} · {{ zona.formatTemporal(toma.fechaPuntoControlUtc, 'time') }}
                    </span>
                    <button
                      type="button"
                      [attr.data-testid]="'btn-reclamar-toma-' + toma.idToma"
                      (click)="reclamar(toma)"
                      class="min-h-[44px] px-4 py-2.5 bg-warm-100 hover:bg-warm-200 text-warm-900 font-semibold text-xs rounded-xl transition-colors"
                    >
                      Reclamar esta toma
                    </button>
                  </li>
                }
              </ul>
            </article>
          }
          @if (faltasTotalPaginas() > 1) {
            <app-pagination
              [totalItems]="faltasTotal()"
              [pageSize]="tamanoFaltas"
              [currentPage]="faltasPagina()"
              [showPageSizeSelector]="false"
              (pageChange)="cambiarPaginaFaltas($event)"
            />
          }
        </section>
      }

      @if (cargando()) {
        <div class="bg-white p-12 rounded-2xl border border-warm-200 text-center text-sm text-warm-500">
          Cargando alertas…
        </div>
      } @else if (alertas().length === 0 && faltasSesiones().length > 0) {
        <p class="text-sm text-warm-600" data-testid="sin-alertas-porcentaje">
          No tienes alertas vigentes por porcentaje de inasistencia.
        </p>
      } @else if (alertas().length === 0) {
        <app-empty-state
          variant="info"
          title="¡Excelente! No tienes alertas vigentes"
          description="Tu asistencia académica se encuentra dentro de los límites institucionales en todas tus asignaturas."
          causa="Las alertas aparecen al superar el umbral de advertencia de inasistencia."
        />
      } @else {
        <div class="space-y-4">
          @for (alerta of alertas(); track alerta.id) {
            <article
              [attr.data-testid]="'alerta-card-' + alerta.id"
              class="bg-white rounded-2xl border p-5 sm:p-6 shadow-warm-sm space-y-4 transition-all"
              [class.border-warning-300]="alerta.tipo === 'ADVERTENCIA' || alerta.tipo === 'RIESGO'"
              [class.border-danger-300]="alerta.tipo === 'PERDIDA'"
              [class.border-warm-200]="!alerta.tipo || (alerta.tipo !== 'ADVERTENCIA' && alerta.tipo !== 'RIESGO' && alerta.tipo !== 'PERDIDA')"
            >
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-warm-100 pb-3">
                <div class="flex items-center gap-2 flex-wrap">
                  <app-badge [variant]="alerta.tipo === 'PERDIDA' ? 'danger' : 'warning'">
                    {{ alerta.nombreTipo || (alerta.tipo === 'PERDIDA' ? 'Pérdida por inasistencia' : 'Riesgo de pérdida') }}
                  </app-badge>
                  <span class="text-xs font-bold text-warm-900">
                    {{ alerta.asignatura?.nombre || alerta.nombreAsignatura || 'Asignatura' }}
                  </span>
                  @if (alerta.grupo?.nombre || alerta.nombreGrupo) {
                    <span class="text-xs text-warm-500">
                      • {{ alerta.grupo?.nombre || alerta.nombreGrupo }}
                    </span>
                  }
                </div>

                <div class="text-xs font-bold" [class.text-danger-700]="alerta.tipo === 'PERDIDA'" [class.text-warning-800]="alerta.tipo !== 'PERDIDA'">
                  Inasistencia acumulada: {{ alerta.porcentajeActual ?? alerta.porcentajeCruce ?? 0 }}%
                  <app-semaforo-asistencia [codigoPermanencia]="alerta.codigoPermanenciaActual" [porcentaje]="alerta.porcentajeActual ?? alerta.porcentajeCruce" />
                </div>
              </div>

              <p class="text-sm text-warm-800 leading-relaxed">
                {{ alerta.mensaje }}
              </p>

              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <span class="text-xs text-warm-400" [attr.title]="alerta.fechaCruceUtc || alerta.fechaGeneracion">
                  {{ alerta.fechaCruceUtc || alerta.fechaGeneracion | fechaHoraCorta }}
                </span>

                <button
                  type="button"
                  [attr.data-testid]="'btn-ver-materia-' + alerta.id"
                  (click)="verMateria(alerta)"
                  class="min-h-[44px] px-4 py-2.5 bg-warm-100 hover:bg-warm-200 text-warm-900 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <span>Ver detalle de la materia</span>
                  <span>→</span>
                </button>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `
})
export class StudentAlertsComponent implements OnInit {
  private readonly alertaService = inject(AlertaInasistenciaService);
  private readonly faltaService = inject(FaltaReclamableService);
  private readonly realtime = inject(RealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  readonly zona = inject(SessionTimeZoneService);

  alertas = signal<AlertaInasistencia[]>([]);
  cargando = signal<boolean>(false);
  grupoFiltro = signal<string>('');
  totalElementos = signal<number>(0);

  readonly tamanoFaltas = TAMANO_FALTAS;
  readonly faltas = signal<FaltaReclamable[]>([]);
  readonly faltasPagina = signal(1);
  readonly faltasTotal = signal(0);
  readonly faltasTotalPaginas = signal(1);
  readonly faltasSesiones = computed(() => agruparFaltasPorSesion(this.faltas()));

  ngOnInit(): void {
    this.cargar();
    this.cargarFaltas();
    // ATA D10: la sección se recarga cuando el servidor avisa; no hay sondeo.
    this.realtime
      .events()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evento) => {
        if (EVENTOS_QUE_RECARGAN_FALTAS.includes(evento?.type)) this.cargarFaltas();
      });
  }

  cargar(): void {
    this.cargando.set(true);
    const filtro: { soloVigentes: boolean; grupoId?: string; pagina: number; tamano: number } = {
      soloVigentes: true,
      pagina: 1,
      tamano: 20,
    };
    if (this.grupoFiltro()) {
      filtro.grupoId = this.grupoFiltro();
    }

    this.alertaService.consultar(filtro).subscribe({
      next: (res) => {
        this.alertas.set(res.elementos ?? []);
        this.totalElementos.set(Number(res.totalElementos ?? 0));
        this.cargando.set(false);
      },
      error: () => {
        this.alertas.set([]);
        this.totalElementos.set(0);
        this.cargando.set(false);
      },
    });
  }

  cargarFaltas(): void {
    this.faltaService.consultar({ pagina: this.faltasPagina(), tamano: TAMANO_FALTAS }).subscribe({
      next: (res) => {
        this.faltas.set(res.elementos ?? []);
        this.faltasTotal.set(Number(res.totalElementos ?? 0));
        this.faltasTotalPaginas.set(Number(res.totalPaginas ?? 1));
      },
      error: () => {
        this.faltas.set([]);
        this.faltasTotal.set(0);
        this.faltasTotalPaginas.set(1);
      },
    });
  }

  cambiarPaginaFaltas(pagina: number): void {
    this.faltasPagina.set(pagina);
    this.cargarFaltas();
  }

  /** Lleva al detalle de la materia, donde ya se radica el reclamo de la toma. */
  reclamar(toma: FaltaReclamable): void {
    void this.router.navigate([RUTA_MIS_MATERIAS], { queryParams: { materia: toma.idAsignatura, grupo: toma.idGrupo } });
  }

  filtrarPorGrupo(grupoId: string): void {
    this.grupoFiltro.set(grupoId);
    this.cargar();
  }

  /**
   * Abre el detalle de la materia de la alerta. El detalle vive dentro de la pestaña "Materias" de "Mis materias", que lo
   * abre al recibir `materia` (y `grupo`, si la alerta lo trae). CERT-CULM001: antes se navegaba a
   * `/app/estudiante/materias/{id}`, una ruta que no existe y terminaba en 404.
   */
  verMateria(alerta: AlertaInasistencia): void {
    const idAsig = alerta.asignatura?.id || alerta.idAsignatura;
    const idGrp = alerta.grupo?.id || alerta.idGrupo;
    if (idAsig) {
      const queryParams = idGrp ? { materia: idAsig, grupo: idGrp } : { materia: idAsig };
      void this.router.navigate([RUTA_MIS_MATERIAS], { queryParams });
    } else {
      void this.router.navigate([RUTA_MIS_MATERIAS]);
    }
  }
}
