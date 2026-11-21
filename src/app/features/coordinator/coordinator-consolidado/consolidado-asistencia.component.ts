import { TAMANO_PAGINA_TABLA, TAMANOS_PAGINA_TABLA } from '../../../shared/components/tabla-datos/tabla-datos.component';
import { formatearHorasMinutos } from '../../../shared/pipes/horas-minutos.util';
import { SemaforoAsistenciaComponent } from '../../../shared/components/semaforo-asistencia/semaforo-asistencia.component';
import { Component, OnInit, inject, signal, ChangeDetectionStrategy, WritableSignal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { nivelDesdeCodigo } from '../../../core/utils/nivel-asistencia';
import { ConsolidadoGrupoItem, OpcionConsolidado } from '../../../core/models/consultas-transversales.model';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { PeriodoAcademicoItem } from '../../../core/models/role-management.model';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { ListadoPaginado } from '../../../shared/utils/listado-paginado';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { DeanSesionesGrupoComponent } from '../../dean/dean-sesiones-grupo/dean-sesiones-grupo.component';
import { CoordinatorSesionesGrupoComponent } from '../coordinator-sesiones-grupo/coordinator-sesiones-grupo.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

const NUMERO_ES = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

/**
 * HU061: consolidado de asistencia por grupo, filtrable por cohorte (período académico), materia y docente. El
 * coordinador ve los grupos de su programa y el decano (ruta con `data.comoDecano`) los de su facultad; el backend
 * fija el ámbito. Solo lectura.
 */
@Component({
    selector: 'app-consolidado-asistencia',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [PageHeaderComponent, CommonModule, FormsModule, PaginationComponent, ErrorCargaComponent, DeanSesionesGrupoComponent, CoordinatorSesionesGrupoComponent, SemaforoAsistenciaComponent],
    template: `
    <div class="space-y-4 animate-fade-in">
      @if (!embebido()) {
      <app-page-header
        [enTarjeta]="true"
        [conTitulo]="!embebido()"
        [etiqueta]="comoDecano ? 'Decanatura' : 'Coordinación'"
        contexto="Asistencia"
        titulo="Consolidado de Asistencia"
      >
        <p cabecera-detalle class="text-sm text-warm-600 mt-1">
          {{ comoDecano ? 'Grupos de los programas de tu facultad' : 'Grupos de tu programa' }} por cohorte (período), materia y docente.
          <span data-testid="nota-horas">Calculado por horas dictadas.</span>
        </p>
      </app-page-header>
      } @else {
        <p class="text-xs text-warm-600" data-testid="nota-horas">Calculado por horas dictadas.</p>
      }

      <section class="superficie p-4 space-y-3">
        <!-- Filtros y conteo de grupos en una sola linea (F, 2026-11-19): la tabla queda visible sin desplazar a 1366x768. -->
        <div class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center gap-3">
          <select aria-label="Cohorte (período académico)" [ngModel]="idPeriodo()" (ngModelChange)="cambiarPeriodo($event)"
            class="px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm text-warm-800">
            <option value="">Todas las cohortes</option>
            @for (p of periodos(); track p.id) {
              <option [value]="p.id">{{ p.nombre || p.codigo }}</option>
            }
          </select>
          <select aria-label="Materia" [ngModel]="idAsignatura()" (ngModelChange)="filtrar(idAsignatura, $event)"
            class="px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm text-warm-800">
            <option value="">Todas las materias</option>
            @for (a of asignaturas(); track a.id) {
              <option [value]="a.id">{{ a.nombre }}</option>
            }
          </select>
          <select aria-label="Docente" [ngModel]="idDocente()" (ngModelChange)="filtrar(idDocente, $event)"
            class="px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm text-warm-800">
            <option value="">Todos los docentes</option>
            @for (d of docentes(); track d.id) {
              <option [value]="d.id">{{ d.nombre }}</option>
            }
          </select>
          <span data-testid="conteo-grupos" class="justify-self-start sm:justify-self-end px-3 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200 whitespace-nowrap">{{ listado.total() }} {{ listado.total() === 1 ? 'Grupo' : 'Grupos' }}</span>
        </div>

        @if (listado.error() && !listado.cargando()) {
          <app-error-carga [error]="listado.error()!" (reintentar)="listado.reintentar()" />
        } @else if (listado.filas().length === 0 && !listado.cargando()) {
          <p class="text-sm text-warm-500 text-center py-6">No hay grupos con asistencia para los filtros seleccionados.</p>
        } @else {
          <div class="tabla-scroll" role="region" tabindex="0" aria-label="Consolidado de asistencia por grupo">
            <table class="tabla-tarjetas tabla-tarjetas-compacta w-full min-w-[64rem] text-sm" data-testid="consolidado-tabla">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                  <th scope="col" class="col-fija w-9 min-w-9 py-2 pr-1"><span class="sr-only">Sesiones del grupo</span></th>
                  <th scope="col" class="col-fija col-fija-2 py-2 pr-3 pl-1">Materia / Grupo</th>
                  <th scope="col" class="py-2 pr-3">Cohorte</th>
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
                    <td class="col-fija tc-esquina w-9 min-w-9 py-2 pr-1" [class.bg-primary-50]="expandido() === g.idGrupo">
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
                    <td class="col-fija col-fija-2 tc-ancho py-2 pr-3 pl-1" [class.bg-primary-50]="expandido() === g.idGrupo" data-label="Materia / Grupo">
                      <span class="font-semibold text-warm-900 block">{{ g.nombreAsignatura || '—' }}</span>
                      <span class="text-xs text-warm-500">{{ g.nombreGrupo || 'Grupo ' + g.codigoGrupo }}{{ comoDecano && g.nombrePrograma ? ' · ' + g.nombrePrograma : '' }}</span>
                    </td>
                    <td class="py-2 pr-3 text-warm-700 max-md:hidden" data-label="Cohorte">{{ g.nombrePeriodoAcademico || '—' }}</td>
                    <td class="py-2 pr-3 text-warm-700" data-label="Docente">{{ g.nombreDocente || 'Sin docente' }}</td>
                    <td class="py-2 pr-3 text-right text-warm-700 max-md:hidden" data-label="Activos">{{ g.estudiantesActivos }}</td>
                    <td class="py-2 pr-3 text-right text-warm-700 max-md:hidden" data-label="Sesiones ejecutadas">{{ g.sesionesEjecutadas }}</td>
                    <td class="py-2 pr-3 text-right font-semibold text-warm-900" data-label="% Asistencia">{{ g.porcentajeAsistencia | number: '1.0-2' }}%</td>
                    <td class="py-2 pr-3 text-right whitespace-nowrap" data-label="% Inasistencia" data-testid="inasistencia" [class]="conAdvertencia(g) ? 'text-danger-700 font-semibold' : 'text-warm-700'">
                      {{ inasistenciaConBase(g) }}
                      <app-semaforo-asistencia [codigoPermanencia]="g.codigoPermanencia" [porcentaje]="g.porcentajeInasistencia" [compacto]="true" />
                    </td>
                    <td class="py-2 pr-3 text-right text-warm-700 max-md:hidden" data-label="% Excusa">{{ g.porcentajeExcusa | number: '1.0-2' }}%</td>
                    <td class="py-2 pr-3 text-right text-warm-700 max-md:hidden" data-label="% Sin registro">{{ g.porcentajeSinRegistro | number: '1.0-2' }}%</td>
                    <td class="py-2 pr-3 min-w-[8rem] max-md:hidden" data-label="Distribución">
                      <div class="flex h-3 w-full overflow-hidden rounded bg-warm-100" role="img" data-testid="barra-distribucion"
                        [attr.aria-label]="'Asistencia ' + g.porcentajeAsistencia + '%, inasistencia ' + g.porcentajeInasistencia + '%, excusa ' + g.porcentajeExcusa + '%, sin registro ' + g.porcentajeSinRegistro + '%'">
                        <span class="h-3 bg-success-600" data-testid="segmento-asistencia" [style.width.%]="g.porcentajeAsistencia"></span>
                        <span class="h-3 bg-danger-500" data-testid="segmento-inasistencia" [style.width.%]="g.porcentajeInasistencia"></span>
                        <span class="h-3 bg-warning-500" data-testid="segmento-excusa" [style.width.%]="g.porcentajeExcusa"></span>
                        <span class="h-3 bg-warm-300" data-testid="segmento-sin-registro" [style.width.%]="g.porcentajeSinRegistro"></span>
                      </div>
                    </td>
                    <td class="py-2 pr-3 text-right" data-label="En riesgo" [class]="g.estudiantesRiesgo > 0 ? 'text-warning-700 font-semibold' : 'text-warm-700'">{{ g.estudiantesRiesgo }}</td>
                    <td class="py-2 text-right" data-label="Pérdida" [class]="g.estudiantesPerdida > 0 ? 'text-danger-700 font-semibold' : 'text-warm-700'">{{ g.estudiantesPerdida }}</td>
                  </tr>
                  @if (expandido() === g.idGrupo) {
                    <tr [id]="'sesiones-grupo-' + g.idGrupo" [attr.data-testid]="'sesiones-' + g.idGrupo" class="bg-warm-50/60">
                      <td colspan="13" class="tc-ancho p-3">
                        @if (comoDecano) {
                          @defer (on immediate) {
                            <app-dean-sesiones-grupo [idGrupo]="g.idGrupo" />
                          } @placeholder {
                            <p role="status" class="py-3 text-center text-sm text-warm-500">Cargando sesiones del grupo...</p>
                          }
                        } @else {
                          @defer (on immediate) {
                            <app-coordinator-sesiones-grupo [grupo]="{ id: g.idGrupo, nombre: g.nombreGrupo || 'Grupo ' + g.codigoGrupo, nombreAsignatura: g.nombreAsignatura || '' }" />
                          } @placeholder {
                            <p role="status" class="py-3 text-center text-sm text-warm-500">Cargando sesiones del grupo...</p>
                          }
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
          [pageSizeOptions]="tamanosPagina"
          [currentPage]="listado.pagina()"
          (pageChange)="expandido.set(null); listado.irAPagina($event)"
          (pageSizeChange)="listado.cambiarTamano($event)"
        ></app-pagination>
      </section>
    </div>
  `
})
export class ConsolidadoAsistenciaComponent implements OnInit {
  /** CULM-001: dentro de una pestaña, el título lo pone el cascarón. */
  readonly embebido = input(false);
  private readonly service = inject(ConsultasTransversalesService);
  private readonly coordinador = inject(CoordinatorManagementService);
  private readonly toast = inject(ToastService);
  readonly comoDecano = inject(ActivatedRoute).snapshot.data['comoDecano'] === true;

  /** Un solo grupo expandido a la vez: el stream en tiempo real de sesiones es uno por pantalla. */
  readonly expandido = signal<string | null>(null);
  /** Bloque F (2026-11-19): mismos tamaños que las demás tablas (15 por defecto). */
  readonly tamanosPagina = [...TAMANOS_PAGINA_TABLA];
  idPeriodo = signal('');
  idAsignatura = signal('');
  idDocente = signal('');
  periodos = signal<PeriodoAcademicoItem[]>([]);
  /** Opciones COMPLETAS de materia y docente del ámbito y el período (las entrega el servidor, no se arman con las filas). */
  asignaturas = signal<OpcionConsolidado[]>([]);
  docentes = signal<OpcionConsolidado[]>([]);
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
      return consulta;
    },
    (mensaje) => this.toast.error(mensaje)
  );

  ngOnInit(): void {
    this.listado.tamano.set(TAMANO_PAGINA_TABLA);
    this.listado.cargar();
    this.cargarOpciones();
    this.coordinador.getPeriodosAcademicos().subscribe({
      next: (res) => this.periodos.set(res.datos ?? []),
      error: () => this.periodos.set([]),
    });
  }

  /** Resalta la inasistencia cuando el servidor clasifico el grupo en RIESGO o PERDIDA (el cliente no compara porcentajes). */
  conAdvertencia(g: ConsolidadoGrupoItem): boolean {
    const nivel = nivelDesdeCodigo(g.codigoPermanencia);
    return nivel === 'ambar' || nivel === 'rojo';
  }

  /** Las opciones de materia y docente dependen del período: al cambiarlo se recargan y se limpian esos dos filtros. */
  cambiarPeriodo(valor: string): void {
    this.idPeriodo.set(valor);
    this.idAsignatura.set('');
    this.idDocente.set('');
    this.expandido.set(null);
    this.cargarOpciones();
    this.listado.buscar();
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
   * dictadas (D.8), p. ej. «3,46 % · 2 h 15 min de 65 h». Las horas de falta son el mismo porcentaje aplicado a las horas
   * dictadas del grupo; no es otra métrica.
   */
  inasistenciaConBase(g: ConsolidadoGrupoItem): string {
    const horasFalta = (g.porcentajeInasistencia * g.horasDictadas) / 100;
    return `${NUMERO_ES.format(g.porcentajeInasistencia)} % · ${formatearHorasMinutos(horasFalta)} de ${formatearHorasMinutos(g.horasDictadas)}`;
  }

  /** Asignaturas y docentes con grupos en el ámbito del usuario para el período elegido (todos si no hay período). */
  private cargarOpciones(): void {
    this.service.getOpcionesConsolidado(this.idPeriodo() || null, this.comoDecano).subscribe({
      next: (res) => {
        this.asignaturas.set(res.datos?.asignaturas ?? []);
        this.docentes.set(res.datos?.docentes ?? []);
      },
      error: (error: unknown) => {
        this.asignaturas.set([]);
        this.docentes.set([]);
        this.toast.error(getApiErrorMessage(error));
      },
    });
  }
}
