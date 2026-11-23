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
import {
  TablaDatosComponent,
  TAMANO_PAGINA_TABLA,
  TAMANOS_PAGINA_TABLA,
} from '../../../shared/components/tabla-datos/tabla-datos.component';
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

/** Agrupa las filas (una por toma) en una fila de la tabla por sesión; solo presentación, conserva el orden recibido. */
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
    imports: [PageHeaderComponent, EmptyStateComponent, FechaHoraCortaPipe, FormsModule, BadgeComponent, SemaforoAsistenciaComponent, TablaDatosComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="space-y-4 animate-fade-in max-w-4xl mx-auto">
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
          <app-tabla-datos
            etiqueta="Faltas por reclamar"
            [etiquetaVisible]="false"
            [columnas]="4"
            anchoMinimo="48rem"
            [tarjetasEnMovil]="true"
            [paginada]="faltasTotal() > tamanosPagina[0]"
            [totalItems]="faltasTotal()"
            [pagina]="faltasPagina()"
            [tamanoPagina]="tamanoFaltas()"
            [totalPaginas]="faltasTotalPaginas()"
            [tamanosPagina]="tamanosPagina"
            (paginaChange)="cambiarPaginaFaltas($event)"
            (tamanoPaginaChange)="cambiarTamanoFaltas($event)"
          >
            <thead>
              <tr>
                <th scope="col">Materia</th>
                <th scope="col">Sesión</th>
                <th scope="col">Plazo para reclamar</th>
                <th scope="col" class="col-acciones bg-warm-100">Tomas</th>
              </tr>
            </thead>
            <tbody>
              @for (sesion of faltasSesiones(); track sesion.idSesion) {
                <tr class="align-top" [attr.data-testid]="'falta-card-' + sesion.idSesion">
                  <td data-label="Materia">
                    <span class="block text-sm font-bold text-warm-900">{{ sesion.nombreAsignatura }}</span>
                    <span class="block text-xs text-warm-500">{{ sesion.nombreGrupo }}</span>
                  </td>
                  <td class="text-xs text-warm-700" data-label="Sesión" data-testid="falta-horario">
                    Sesión {{ sesion.numeroSesion }} · {{ zona.formatTemporal(sesion.fechaHoraInicioUtc, 'date') }}
                    · {{ zona.formatTemporal(sesion.fechaHoraInicioUtc, 'time') }}–{{ zona.formatTemporal(sesion.fechaHoraFinUtc, 'time') }}
                  </td>
                  <td class="text-xs font-semibold text-warning-800" data-label="Plazo para reclamar" data-testid="falta-limite">
                    Puedes reclamar hasta {{ zona.formatTemporal(sesion.fechaLimiteReclamoUtc) }}
                  </td>
                  <td class="col-acciones bg-white" data-label="Tomas">
                    <ul class="space-y-1">
                      @for (toma of sesion.tomas; track toma.idToma) {
                        <li class="flex flex-wrap items-center justify-between gap-2" [attr.data-testid]="'falta-toma-' + toma.idToma">
                          <span class="text-sm text-warm-800 whitespace-nowrap">
                            Toma {{ toma.numeroToma }} · {{ zona.formatTemporal(toma.fechaPuntoControlUtc, 'time') }}
                          </span>
                          <button
                            type="button"
                            [attr.data-testid]="'btn-reclamar-toma-' + toma.idToma"
                            (click)="reclamar(toma)"
                            class="min-h-[36px] px-3 py-1.5 bg-warm-100 hover:bg-warm-200 text-warm-900 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap"
                          >
                            Reclamar esta toma
                          </button>
                        </li>
                      }
                    </ul>
                  </td>
                </tr>
              }
            </tbody>
          </app-tabla-datos>
        </section>
      }

      @if (!cargando() && alertas().length === 0 && faltasSesiones().length > 0) {
        <p class="text-sm text-warm-600" data-testid="sin-alertas-porcentaje">
          No tienes alertas vigentes por porcentaje de inasistencia.
        </p>
      } @else if (!cargando() && alertas().length === 0) {
        <app-empty-state
          variant="info"
          title="¡Excelente! No tienes alertas vigentes"
          description="Tu asistencia académica se encuentra dentro de los límites institucionales en todas tus asignaturas."
          causa="Las alertas aparecen al superar el umbral de advertencia de inasistencia."
        />
      } @else {
        <app-tabla-datos
          etiqueta="Alertas de asistencia"
          [etiquetaVisible]="false"
          [columnas]="6"
          anchoMinimo="56rem"
          [tarjetasEnMovil]="true"
          [cargando]="cargando()"
          [filasEsqueleto]="3"
          [paginada]="!cargando() && totalElementos() > tamanosPagina[0]"
          [totalItems]="totalElementos()"
          [pagina]="paginaAlertas()"
          [tamanoPagina]="tamanoAlertas()"
          [tamanosPagina]="tamanosPagina"
          (paginaChange)="cambiarPaginaAlertas($event)"
          (tamanoPaginaChange)="cambiarTamanoAlertas($event)"
        >
          <thead>
            <tr>
              <th scope="col">Alerta</th>
              <th scope="col">Materia</th>
              <th scope="col">Inasistencia</th>
              <th scope="col">Detalle</th>
              <th scope="col">Fecha</th>
              <th scope="col" class="col-acciones bg-warm-100"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @if (!cargando()) {
              @for (alerta of alertas(); track alerta.id) {
                <tr class="align-top" [attr.data-testid]="'alerta-card-' + alerta.id">
                  <td data-label="Alerta">
                    <app-badge [variant]="alerta.tipo === 'PERDIDA' ? 'danger' : 'warning'">
                      {{ alerta.nombreTipo || (alerta.tipo === 'PERDIDA' ? 'Pérdida por inasistencia' : 'Riesgo de pérdida') }}
                    </app-badge>
                  </td>
                  <td data-label="Materia">
                    <span class="block text-xs font-bold text-warm-900">
                      {{ alerta.asignatura?.nombre || alerta.nombreAsignatura || 'Asignatura' }}
                    </span>
                    @if (alerta.grupo?.nombre || alerta.nombreGrupo) {
                      <span class="block text-xs text-warm-500">{{ alerta.grupo?.nombre || alerta.nombreGrupo }}</span>
                    }
                  </td>
                  <td class="whitespace-nowrap" data-label="Inasistencia">
                    <div class="text-xs font-bold" [class.text-danger-700]="alerta.tipo === 'PERDIDA'" [class.text-warning-800]="alerta.tipo !== 'PERDIDA'">
                      {{ alerta.porcentajeActual ?? alerta.porcentajeCruce ?? 0 }}%
                      <app-semaforo-asistencia [codigoPermanencia]="alerta.codigoPermanenciaActual" [porcentaje]="alerta.porcentajeActual ?? alerta.porcentajeCruce" />
                    </div>
                  </td>
                  <td class="min-w-[16rem] max-md:min-w-0 text-sm text-warm-800 leading-relaxed" data-label="Detalle">{{ alerta.mensaje }}</td>
                  <td class="whitespace-nowrap text-xs text-warm-500" data-label="Fecha" [attr.title]="alerta.fechaCruceUtc || alerta.fechaGeneracion">
                    {{ alerta.fechaCruceUtc || alerta.fechaGeneracion | fechaHoraCorta }}
                  </td>
                  <td class="col-acciones bg-white text-right">
                    <button
                      type="button"
                      [attr.data-testid]="'btn-ver-materia-' + alerta.id"
                      (click)="verMateria(alerta)"
                      class="min-h-[44px] px-3 py-2 bg-warm-100 hover:bg-warm-200 text-warm-900 font-semibold text-xs rounded-xl transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <span>Ver detalle de la materia</span>
                      <span aria-hidden="true">→</span>
                    </button>
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

  /** Bloque E: tamaños de página de las tablas (15/30/50; el backend admite hasta 100). */
  readonly tamanosPagina = [...TAMANOS_PAGINA_TABLA];
  readonly paginaAlertas = signal(1);
  readonly tamanoAlertas = signal(TAMANO_PAGINA_TABLA);
  /** Tamaño de página de faltas: cuenta tomas (filas del backend), no sesiones. */
  readonly tamanoFaltas = signal(TAMANO_PAGINA_TABLA);
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
      pagina: this.paginaAlertas(),
      tamano: this.tamanoAlertas(),
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
    this.faltaService.consultar({ pagina: this.faltasPagina(), tamano: this.tamanoFaltas() }).subscribe({
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

  cambiarTamanoFaltas(tamano: number): void {
    this.tamanoFaltas.set(tamano);
    this.faltasPagina.set(1);
    this.cargarFaltas();
  }

  cambiarPaginaAlertas(pagina: number): void {
    this.paginaAlertas.set(pagina);
    this.cargar();
  }

  cambiarTamanoAlertas(tamano: number): void {
    this.tamanoAlertas.set(tamano);
    this.paginaAlertas.set(1);
    this.cargar();
  }

  /** Lleva al detalle de la materia, donde ya se radica el reclamo de la toma. */
  reclamar(toma: FaltaReclamable): void {
    void this.router.navigate([RUTA_MIS_MATERIAS], {
      queryParams: { materia: toma.idAsignatura, grupo: toma.idGrupo, sesion: toma.idSesion, toma: toma.idToma },
    });
  }

  filtrarPorGrupo(grupoId: string): void {
    this.grupoFiltro.set(grupoId);
    this.paginaAlertas.set(1);
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
