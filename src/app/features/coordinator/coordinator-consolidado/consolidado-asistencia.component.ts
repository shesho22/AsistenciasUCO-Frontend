import { SemaforoAsistenciaComponent } from '../../../shared/components/semaforo-asistencia/semaforo-asistencia.component';
import { Component, OnInit, inject, signal, effect, ChangeDetectionStrategy, WritableSignal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { CoordinatorIndicatorsService } from '../../../core/services/coordinator-indicators.service';
import { DeanIndicatorsService } from '../../../core/services/dean-indicators.service';
import { UMBRAL_ADVERTENCIA_RESPALDO, UMBRAL_PERDIDA_RESPALDO } from '../../../core/utils/nivel-asistencia';
import { ConsolidadoGrupoItem } from '../../../core/models/consultas-transversales.model';
import { PeriodoAcademicoItem } from '../../../core/models/role-management.model';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { ListadoPaginado } from '../../../shared/utils/listado-paginado';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { DeanSesionesGrupoComponent } from '../../dean/dean-sesiones-grupo/dean-sesiones-grupo.component';
import { CoordinatorSesionesGrupoComponent } from '../coordinator-sesiones-grupo/coordinator-sesiones-grupo.component';

const NUMERO_ES = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

/** Umbrales del semaforo que publican los KPI del coordinador y del decano (PAR-06). */
interface Umbrales {
  umbralAdvertencia: number;
  umbralPerdida: number;
}

interface Opcion {
  id: string;
  nombre: string;
}

/** Agrega a `opciones` los pares id/nombre nuevos de las filas, sin repetir y en orden alfabético. */
export function acumularOpciones(opciones: Opcion[], filas: ConsolidadoGrupoItem[], campo: 'asignatura' | 'docente'): Opcion[] {
  const mapa = new Map(opciones.map((o) => [o.id, o.nombre]));
  for (const fila of filas) {
    const id = campo === 'asignatura' ? fila.idAsignatura : fila.idDocente;
    const nombre = campo === 'asignatura' ? fila.nombreAsignatura : fila.nombreDocente;
    if (id && !mapa.has(id)) mapa.set(id, nombre || id);
  }
  return [...mapa.entries()].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * HU061: consolidado de asistencia por grupo, filtrable por cohorte (período académico), materia y docente. El
 * coordinador ve los grupos de su programa y el decano (ruta con `data.comoDecano`) los de su facultad; el backend
 * fija el ámbito. Solo lectura.
 */
@Component({
  selector: 'app-consolidado-asistencia',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, FormsModule, PaginationComponent, ErrorCargaComponent, DeanSesionesGrupoComponent, CoordinatorSesionesGrupoComponent, SemaforoAsistenciaComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        @if (!embebido()) {
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-900 border border-primary-200">
              {{ comoDecano ? 'Decanatura' : 'Coordinación' }}
            </span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Asistencia</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">Consolidado de Asistencia</h1>
          <p class="text-sm text-warm-600 mt-1">
            {{ comoDecano ? 'Grupos de los programas de tu facultad' : 'Grupos de tu programa' }} por cohorte (período), materia y docente.
            <span data-testid="nota-horas">Calculado por horas dictadas.</span>
          </p>
        </div>
        }
        <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">{{ listado.total() }} Grupos</span>
      </div>

      <section class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select aria-label="Cohorte (período académico)" [ngModel]="idPeriodo()" (ngModelChange)="filtrar(idPeriodo, $event)"
            class="px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800">
            <option value="">Todas las cohortes</option>
            @for (p of periodos(); track p.id) {
              <option [value]="p.id">{{ p.nombre || p.codigo }}</option>
            }
          </select>
          <select aria-label="Materia" [ngModel]="idAsignatura()" (ngModelChange)="filtrar(idAsignatura, $event)"
            class="px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800">
            <option value="">Todas las materias</option>
            @for (a of asignaturas(); track a.id) {
              <option [value]="a.id">{{ a.nombre }}</option>
            }
          </select>
          <select aria-label="Docente" [ngModel]="idDocente()" (ngModelChange)="filtrar(idDocente, $event)"
            class="px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800">
            <option value="">Todos los docentes</option>
            @for (d of docentes(); track d.id) {
              <option [value]="d.id">{{ d.nombre }}</option>
            }
          </select>
        </div>

        @if (listado.error() && !listado.cargando()) {
          <app-error-carga [error]="listado.error()!" (reintentar)="listado.reintentar()" />
        } @else if (listado.filas().length === 0 && !listado.cargando()) {
          <p class="text-sm text-warm-500 text-center py-6">No hay grupos con asistencia para los filtros seleccionados.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                  <th scope="col" class="py-2 pr-1 w-8"><span class="sr-only">Sesiones del grupo</span></th>
                  <th scope="col" class="py-2 pr-3">Cohorte</th>
                  <th scope="col" class="py-2 pr-3">Materia / Grupo</th>
                  <th scope="col" class="py-2 pr-3">Docente</th>
                  <th scope="col" class="py-2 pr-3 text-right">Activos</th>
                  <th scope="col" class="py-2 pr-3 text-right" title="Sesiones ya vencidas con asistencia registrada; las programadas a futuro no cuentan.">Sesiones ejecutadas</th>
                  <th scope="col" class="py-2 pr-3 text-right">% Asistencia</th>
                  <th scope="col" class="py-2 pr-3 text-right">% Inasistencia</th>
                  <th scope="col" class="py-2 pr-3 text-right" title="Horas con excusa aprobada o en trámite sobre las horas dictadas.">% Excusa</th>
                  <th scope="col" class="py-2 pr-3 text-right" title="Horas dictadas sin ningún registro de asistencia.">% Sin registro</th>
                  <th scope="col" class="py-2 pr-3">Distribución</th>
                  <th scope="col" class="py-2 pr-3 text-right">En riesgo</th>
                  <th scope="col" class="py-2 text-right">Pérdida</th>
                </tr>
              </thead>
              <tbody>
                @for (g of listado.filas(); track g.idGrupo) {
                  <tr class="border-b border-warm-50" [class.bg-primary-50]="expandido() === g.idGrupo">
                    <td class="py-2 pr-1">
                      <button
                        type="button"
                        class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-warm-700 hover:bg-warm-100 focus-visible:ring-2 focus-visible:ring-primary-600 outline-none"
                        [attr.data-testid]="'expandir-' + g.idGrupo"
                        [attr.aria-expanded]="expandido() === g.idGrupo"
                        [attr.aria-controls]="'sesiones-grupo-' + g.idGrupo"
                        [attr.aria-label]="(expandido() === g.idGrupo ? 'Ocultar' : 'Ver') + ' las sesiones de ' + (g.nombreAsignatura || 'la asignatura') + ' ' + (g.nombreGrupo || g.codigoGrupo)"
                        (click)="alternar(g.idGrupo)"
                      >{{ expandido() === g.idGrupo ? '▾' : '▸' }}</button>
                    </td>
                    <td class="py-2 pr-3 text-warm-700">{{ g.nombrePeriodoAcademico || '—' }}</td>
                    <td class="py-2 pr-3">
                      <span class="font-semibold text-warm-900 block">{{ g.nombreAsignatura || '—' }}</span>
                      <span class="text-xs text-warm-500">{{ g.nombreGrupo || 'Grupo ' + g.codigoGrupo }}{{ comoDecano && g.nombrePrograma ? ' · ' + g.nombrePrograma : '' }}</span>
                    </td>
                    <td class="py-2 pr-3 text-warm-700">{{ g.nombreDocente || 'Sin docente' }}</td>
                    <td class="py-2 pr-3 text-right text-warm-700">{{ g.estudiantesActivos }}</td>
                    <td class="py-2 pr-3 text-right text-warm-700">{{ g.sesionesEjecutadas }}</td>
                    <td class="py-2 pr-3 text-right font-semibold text-warm-900">{{ g.porcentajeAsistencia | number: '1.0-2' }}%</td>
                    <td class="py-2 pr-3 text-right whitespace-nowrap" data-testid="inasistencia" [class]="g.porcentajeInasistencia >= umbralAdvertencia() ? 'text-danger-700 font-semibold' : 'text-warm-700'">
                      {{ inasistenciaConBase(g) }}
                      <app-semaforo-asistencia [porcentaje]="g.porcentajeInasistencia" [umbralAdvertencia]="umbralAdvertencia()" [umbralPerdida]="umbralPerdida()" [compacto]="true" />
                    </td>
                    <td class="py-2 pr-3 text-right text-warm-700">{{ g.porcentajeExcusa | number: '1.0-2' }}%</td>
                    <td class="py-2 pr-3 text-right text-warm-700">{{ g.porcentajeSinRegistro | number: '1.0-2' }}%</td>
                    <td class="py-2 pr-3 min-w-[8rem]">
                      <div class="flex h-3 w-full overflow-hidden rounded bg-warm-100" role="img" data-testid="barra-distribucion"
                        [attr.aria-label]="'Asistencia ' + g.porcentajeAsistencia + '%, inasistencia ' + g.porcentajeInasistencia + '%, excusa ' + g.porcentajeExcusa + '%, sin registro ' + g.porcentajeSinRegistro + '%'">
                        <span class="h-3 bg-success-600" data-testid="segmento-asistencia" [style.width.%]="g.porcentajeAsistencia"></span>
                        <span class="h-3 bg-danger-500" data-testid="segmento-inasistencia" [style.width.%]="g.porcentajeInasistencia"></span>
                        <span class="h-3 bg-warning-500" data-testid="segmento-excusa" [style.width.%]="g.porcentajeExcusa"></span>
                        <span class="h-3 bg-warm-300" data-testid="segmento-sin-registro" [style.width.%]="g.porcentajeSinRegistro"></span>
                      </div>
                    </td>
                    <td class="py-2 pr-3 text-right" [class]="g.estudiantesRiesgo > 0 ? 'text-warning-700 font-semibold' : 'text-warm-700'">{{ g.estudiantesRiesgo }}</td>
                    <td class="py-2 text-right" [class]="g.estudiantesPerdida > 0 ? 'text-danger-700 font-semibold' : 'text-warm-700'">{{ g.estudiantesPerdida }}</td>
                  </tr>
                  @if (expandido() === g.idGrupo) {
                    <tr [id]="'sesiones-grupo-' + g.idGrupo" [attr.data-testid]="'sesiones-' + g.idGrupo" class="bg-warm-50/60">
                      <td colspan="13" class="p-3">
                        @if (comoDecano) {
                          <app-dean-sesiones-grupo [idGrupo]="g.idGrupo" />
                        } @else {
                          <app-coordinator-sesiones-grupo [grupo]="{ id: g.idGrupo, nombre: g.nombreGrupo || 'Grupo ' + g.codigoGrupo, nombreAsignatura: g.nombreAsignatura || '' }" />
                        }
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
          <ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-warm-600" aria-label="Leyenda de la distribución">
            <li class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-success-600"></span>Asistencia</li>
            <li class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-danger-500"></span>Inasistencia</li>
            <li class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-warning-500"></span>Excusa</li>
            <li class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-warm-300"></span>Sin registro</li>
          </ul>
        }
        <app-pagination
          [totalItems]="listado.total()"
          [totalPages]="listado.totalPaginas()"
          [pageSize]="listado.tamano()"
          [currentPage]="listado.pagina()"
          (pageChange)="expandido.set(null); listado.irAPagina($event)"
          (pageSizeChange)="listado.cambiarTamano($event)"
        ></app-pagination>
      </section>
    </div>
  `,
})
export class ConsolidadoAsistenciaComponent implements OnInit {
  /** CULM-001: dentro de una pestaña, el título lo pone el cascarón. */
  readonly embebido = input(false);
  private readonly service = inject(ConsultasTransversalesService);
  private readonly coordinador = inject(CoordinatorManagementService);
  private readonly indicadoresCoordinador = inject(CoordinatorIndicatorsService);
  private readonly indicadoresDecano = inject(DeanIndicatorsService);
  private readonly toast = inject(ToastService);
  readonly comoDecano = inject(ActivatedRoute).snapshot.data['comoDecano'] === true;

  /** Un solo grupo expandido a la vez: el stream en tiempo real de sesiones es uno por pantalla. */
  readonly expandido = signal<string | null>(null);
  idPeriodo = signal('');
  idAsignatura = signal('');
  idDocente = signal('');
  periodos = signal<PeriodoAcademicoItem[]>([]);
  asignaturas = signal<Opcion[]>([]);
  docentes = signal<Opcion[]>([]);
  /**
   * PAR-06: umbrales del semaforo desde los parametros ASISTENCIA/UMBRAL_ALERTA_ADVERTENCIA y UMBRAL_ALERTA_PERDIDA, que el
   * backend publica en los KPI del coordinador o del decano. 15/20 solo son respaldo si los KPI no responden.
   */
  readonly umbralAdvertencia = signal(UMBRAL_ADVERTENCIA_RESPALDO);
  readonly umbralPerdida = signal(UMBRAL_PERDIDA_RESPALDO);

  readonly listado = new ListadoPaginado<ConsolidadoGrupoItem>(
    (pagina, tamano) => {
      const consulta = this.service.getConsolidadoAsistencia(
        {
          idPeriodoAcademico: this.idPeriodo() || null,
          idAsignatura: this.idAsignatura() || null,
          idDocente: this.idDocente() || null,
          pagina,
          tamano,
        },
        this.comoDecano
      );
      return consulta.pipe(tap((res) => this.recordarOpciones(res.elementos ?? (res as any).datos ?? [])));
    },
    (mensaje) => this.toast.error(mensaje)
  );

  constructor() {
    // Embebido en la pantalla del coordinador, las tarjetas KPI ya piden los indicadores: se reutiliza el estado compartido
    // del servicio en vez de repetir la peticion.
    effect(() => {
      if (!this.embebido()) return;
      const kpis = this.comoDecano ? this.indicadoresDecano.kpis() : this.indicadoresCoordinador.kpis();
      this.aplicarUmbrales(kpis);
    });
  }

  ngOnInit(): void {
    this.listado.cargar();
    if (!this.embebido()) this.cargarUmbrales();
    this.coordinador.getPeriodosAcademicos().subscribe({
      next: (res) => this.periodos.set(res.datos ?? []),
      error: () => this.periodos.set([]),
    });
  }

  private cargarUmbrales(): void {
    const umbrales$: Observable<Umbrales | null | undefined> = this.comoDecano
      ? this.indicadoresDecano.consultarKpis().pipe(map((res) => res?.datos))
      : this.indicadoresCoordinador.consultarKpis().pipe(map((res) => res?.datos));
    umbrales$.subscribe({
      next: (datos) => this.aplicarUmbrales(datos),
      // Sin KPI se conservan los umbrales de respaldo; el consolidado se sigue mostrando.
      error: () => undefined,
    });
  }

  private aplicarUmbrales(datos: Umbrales | null | undefined): void {
    if (datos && Number.isFinite(datos.umbralAdvertencia) && datos.umbralAdvertencia > 0) {
      this.umbralAdvertencia.set(datos.umbralAdvertencia);
    }
    if (datos && Number.isFinite(datos.umbralPerdida) && datos.umbralPerdida > 0) {
      this.umbralPerdida.set(datos.umbralPerdida);
    }
  }

  filtrar(filtro: WritableSignal<string>, valor: string): void {
    filtro.set(valor);
    this.expandido.set(null);
    this.listado.buscar();
  }

  alternar(idGrupo: string): void {
    this.expandido.update((actual) => (actual === idGrupo ? null : idGrupo));
  }

  /**
   * Una sola cifra de inasistencia por grupo: el porcentaje por horas del consolidado con su base entre las horas
   * dictadas (D.8), p. ej. «3,46 % · 2,25 h de 65 h». Las horas de falta son el mismo porcentaje aplicado a las horas
   * dictadas del grupo; no es otra métrica.
   */
  inasistenciaConBase(g: ConsolidadoGrupoItem): string {
    const horasFalta = (g.porcentajeInasistencia * g.horasDictadas) / 100;
    return `${NUMERO_ES.format(g.porcentajeInasistencia)} % · ${NUMERO_ES.format(horasFalta)} h de ${NUMERO_ES.format(g.horasDictadas)} h`;
  }

  /** Las opciones de materia y docente se acumulan con lo que devuelve el backend (no se pierden al filtrar). */
  private recordarOpciones(filas: ConsolidadoGrupoItem[]): void {
    this.asignaturas.update((actuales) => acumularOpciones(actuales, filas, 'asignatura'));
    this.docentes.update((actuales) => acumularOpciones(actuales, filas, 'docente'));
  }
}
