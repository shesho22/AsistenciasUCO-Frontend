import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, input } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { EMPTY, forkJoin, of } from 'rxjs';
import { catchError, expand, map, reduce, switchMap } from 'rxjs/operators';
import { CourseService, GrupoCoordinadorPayload } from '../../../core/services/course.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { Course, FranjaHorario } from '../../../core/models/course.model';
import { AsignaturaPlanItem, PeriodoAcademicoItem } from '../../../core/models/role-management.model';
import { PrevisualizacionHorarioGrupo, minutosAHoras } from '../../../core/models/horario-grupo.model';
import { DocentePrograma } from '../../../core/models/docente-programa.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { LoadErrorState, classifyLoadError } from '../../../core/api/errors/load-error.util';
import { franjaNueva, validarFranjas } from '../../../core/validation/franjas.util';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ListadoPaginado } from '../../../shared/utils/listado-paginado';
import { FranjasEditorComponent } from '../../../shared/components/franjas-editor/franjas-editor.component';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { getSafeTextError } from '../../../core/validation/form-fields.util';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

/** Cupo editable del grupo: vacío (no se cambia) o entero >= 1. El tope por estudiantes activos lo valida la DB. */
export function cupoValidoOVacio(cupo: number | string | null | undefined): boolean {
  if (cupo === null || cupo === undefined || cupo === '') return true;
  const numero = Number(cupo);
  return Number.isInteger(numero) && numero >= 1;
}

interface GrupoForm {
  idAsignatura: string;
  codigo: number | null;
  nombre: string;
  idDocente: string;
  cupoMaximo: number | null;
  franjas: FranjaHorario[];
}

/**
 * F1 (2026-10-30): el COORDINADOR crea y edita los grupos de su programa y define su horario semanal (varias franjas,
 * sin traslapes). El backend guarda grupo y horario en una sola transacción y valida en la DB los traslapes (HOR_003) y
 * el cruce del docente con otro grupo a la misma hora (HOR_002); aquí solo se anticipan las validaciones de formato.
 */
@Component({
    selector: 'app-coordinator-groups',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [PageHeaderComponent, FormsModule, FranjasEditorComponent, PaginationComponent, ErrorCargaComponent],
    template: `
    <div class="space-y-4 animate-fade-in">
      <app-page-header
        [enTarjeta]="true"
        [conTitulo]="!embebido()"
        etiqueta="Coordinación de Programa"
        titulo="Grupos y Horarios"
        descripcion="Crea los grupos del programa, asigna el docente titular y define su horario semanal."
      >
        @if (vista() === 'LISTA') {
          <button cabecera-acciones type="button" data-testid="nuevo-grupo" (click)="abrirCrear()"
            class="px-4 py-2 rounded-xl bg-primary-700 hover:bg-primary-800 text-sm font-semibold text-white transition-colors">
            Nuevo grupo
          </button>
        }
      </app-page-header>

      @if (vista() === 'LISTA') {
        <div class="superficie overflow-x-auto">
          @if (cargando()) {
            <p class="p-6 text-sm text-warm-500">Cargando grupos...</p>
          } @else if (errorCarga()) {
            <app-error-carga [error]="errorCarga()!" (reintentar)="cargarGrupos()" />
          } @else if (listado.filas().length === 0) {
            <p class="p-6 text-sm text-warm-500" data-testid="sin-grupos">El programa aún no tiene grupos.</p>
          } @else {
            <table class="w-full text-sm">
              <thead class="bg-warm-50 text-xs text-warm-600 text-left">
                <tr>
                  <th scope="col" class="px-4 py-3">Asignatura</th>
                  <th scope="col" class="px-4 py-3">Grupo</th>
                  <th scope="col" class="px-4 py-3">Docente</th>
                  <th scope="col" class="px-4 py-3">Responsable</th>
                  <th scope="col" class="px-4 py-3">Horario semanal</th>
                  <th scope="col" class="px-4 py-3">Cupo</th>
                  <th scope="col" class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                @for (grupo of listado.filas(); track grupo.id) {
                  <tr class="border-t border-warm-100">
                    <td class="px-4 py-3 font-medium text-warm-900">{{ grupo.name }}</td>
                    <td class="px-4 py-3">{{ grupo.section }}</td>
                    <td class="px-4 py-3">{{ nombreDocente(grupo.docenteId) }}</td>
                    <td class="px-4 py-3" data-testid="programa-responsable">{{ grupo.nombreProgramaResponsable || 'Sin programa responsable' }}</td>
                    <td class="px-4 py-3">{{ grupo.schedule || 'Sin horario' }}</td>
                    <td class="px-4 py-3">{{ grupo.enrolledStudentsCount ?? 0 }} / {{ grupo.cupoMaximo ?? '-' }}</td>
                    <td class="px-4 py-3 text-right">
                      @if (grupo.esResponsable === true) {
                        <button type="button" class="text-xs font-semibold text-primary-700 hover:underline" (click)="abrirEditar(grupo)">
                          Editar
                        </button>
                      } @else {
                        <span class="text-xs text-warm-600" data-testid="gestiona-otro-programa">
                          {{ grupo.nombreProgramaResponsable ? 'Lo gestiona ' + grupo.nombreProgramaResponsable : 'Sin programa responsable' }}
                        </span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
        @if (!cargando() && listado.filas().length > 0) {
          <app-pagination
            [totalItems]="listado.total()"
            [totalPages]="listado.totalPaginas()"
            [pageSize]="listado.tamano()"
            [currentPage]="listado.pagina()"
            (pageChange)="listado.irAPagina($event)"
            (pageSizeChange)="listado.cambiarTamano($event)"
          />
        }
      }

      @if (vista() === 'FORM') {
        <form class="superficie p-4 space-y-5 max-w-3xl" (ngSubmit)="guardar()">
          <h2 class="font-serif font-bold text-xl text-warm-900">{{ modo() === 'CREAR' ? 'Nuevo grupo' : 'Editar grupo' }}</h2>

          @if (errorGuardado(); as mensaje) {
            <p role="alert" data-testid="error-guardado-grupo" class="text-sm font-semibold text-danger-700 bg-danger-50 border border-danger-200 rounded-xl px-3 py-2">
              {{ mensaje }}
            </p>
          }

          @if (errorCatalogos(); as fallo) {
            <app-error-carga [error]="fallo" (reintentar)="cargarCatalogos()" />
          }

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            @if (modo() === 'CREAR') {
              <label class="text-xs font-semibold text-warm-700">Asignatura
                <select name="idAsignatura" [(ngModel)]="form.idAsignatura" class="mt-1 w-full px-3 py-2 border border-warm-200 rounded-xl text-sm">
                  <option value="">{{ asignaturasParaCrear().length === 0 ? '-- No hay asignaturas disponibles --' : 'Seleccione...' }}</option>
                  @for (a of asignaturasParaCrear(); track a.id) {
                    <option [value]="a.id">{{ a.codigo }} - {{ a.nombre }}</option>
                  }
                </select>
              </label>
              <!-- DEC-076: el período no se elige; el grupo se crea en el período en curso (estado ACTIVO que calcula la base). -->
              <div class="text-xs font-semibold text-warm-700">Período académico
                <p data-testid="periodo-creacion" class="mt-1 w-full px-3 py-2 border border-warm-100 bg-warm-50 rounded-xl text-sm font-normal text-warm-800">
                  @if (periodoCreacion(); as periodo) {
                    {{ periodo.nombre }} (en curso)
                  } @else {
                    Se asignará el próximo período en planeación
                  }
                </p>
              </div>
            }
            <label class="text-xs font-semibold text-warm-700">Código del grupo
              <input name="codigo" type="number" min="1" step="1" [(ngModel)]="form.codigo" class="mt-1 w-full px-3 py-2 border border-warm-200 rounded-xl text-sm" />
            </label>
            <label class="text-xs font-semibold text-warm-700">Nombre del grupo
              <input name="nombre" type="text" maxlength="50" [(ngModel)]="form.nombre" class="mt-1 w-full px-3 py-2 border border-warm-200 rounded-xl text-sm" />
            </label>
            <label class="text-xs font-semibold text-warm-700">Docente titular
              <select name="idDocente" [(ngModel)]="form.idDocente" class="mt-1 w-full px-3 py-2 border border-warm-200 rounded-xl text-sm">
                <option value="">{{ docentes().length === 0 ? '-- No hay docentes disponibles --' : 'Seleccione...' }}</option>
                @for (d of docentes(); track d.idDocente) {
                  <option [value]="d.idDocente">{{ d.nombreCompleto }}</option>
                }
              </select>
            </label>
            @if (modo() === 'EDITAR') {
              <label class="text-xs font-semibold text-warm-700">Cupo máximo
                <input name="cupoMaximo" type="number" min="1" [(ngModel)]="form.cupoMaximo" class="mt-1 w-full px-3 py-2 border border-warm-200 rounded-xl text-sm" />
              </label>
            }
          </div>

          @if (modo() === 'CREAR' && asignaturaElegida(); as materia) {
            <p class="text-xs text-warm-600" data-testid="horas-materia">
              @if (materia.horasSemanales === null || materia.horasSemanales === undefined) {
                Esta materia aún no tiene horas semanales cargadas: el horario no se valida contra ellas.
              } @else {
                Esta materia se ve {{ materia.horasSemanales }} h por semana: las franjas deben sumar exactamente {{ materia.horasSemanales }} h (cada hora son 60 minutos).
              }
            </p>
          }

          @defer (on immediate) {
            <app-franjas-editor [(franjas)]="form.franjas" />
          }

          <section class="rounded-2xl border border-warm-200 bg-warm-50/60 p-4 space-y-3" data-testid="panel-previsualizacion" aria-live="polite">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="font-semibold text-sm text-warm-900">Sesiones del semestre</h3>
                <p class="text-xs text-warm-600">Calcula todas las sesiones del período con este horario y muestra los conflictos antes de guardar.</p>
              </div>
              <button type="button" data-testid="calcular-sesiones" (click)="previsualizar()" [disabled]="previsualizando()"
                class="px-3.5 py-2 rounded-xl bg-white border border-primary-700 text-xs font-semibold text-primary-700 disabled:opacity-60">
                {{ previsualizando() ? 'Calculando...' : 'Calcular sesiones del semestre' }}
              </button>
            </div>

            @if (errorPrevision(); as fallo) {
              <p role="alert" data-testid="error-previsualizacion" class="text-xs font-semibold text-danger-700 bg-danger-50 border border-danger-200 rounded-xl px-3 py-2">{{ fallo }}</p>
            }

            @if (resultado(); as r) {
              @if (previsualizacionDesactualizada()) {
                <p class="text-xs font-semibold text-warning-800 bg-warning-50 border border-warning-200 rounded-xl px-3 py-2" data-testid="previsualizacion-desactualizada">
                  Cambiaste el horario o los datos del grupo: vuelve a calcular las sesiones.
                </p>
              }
              <dl class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs" data-testid="resumen-previsualizacion">
                <div><dt class="text-warm-500">Período</dt><dd class="font-semibold text-warm-900">{{ r.periodo.nombre }} ({{ r.periodo.semanasPeriodo }} semanas)</dd></div>
                <div><dt class="text-warm-500">Franjas por semana</dt><dd class="font-semibold text-warm-900">{{ r.resumenSemanal.franjasPorSemana }}</dd></div>
                <div><dt class="text-warm-500">Horas por semana</dt><dd class="font-semibold text-warm-900">{{ horas(r.resumenSemanal.minutosSemanales) }}@if (r.resumenSemanal.minutosSemanalesMateria !== null) { de {{ horas(r.resumenSemanal.minutosSemanalesMateria) }} }</dd></div>
                <div><dt class="text-warm-500">Sesiones del período</dt><dd class="font-semibold text-warm-900">{{ r.resumenPeriodo.sesionesCalendario }}</dd></div>
                <div><dt class="text-warm-500">Se programan</dt><dd class="font-semibold text-warm-900">{{ r.resumenPeriodo.sesionesProgramadas }} ({{ horas(r.resumenPeriodo.minutosProgramados) }})</dd></div>
                <div><dt class="text-warm-500">Caen en festivo</dt><dd class="font-semibold text-warm-900">{{ r.resumenPeriodo.sesionesEnFestivo }} ({{ horas(r.resumenPeriodo.minutosPerdidosFestivo) }})</dd></div>
                <div><dt class="text-warm-500">Ya no se pueden programar</dt><dd class="font-semibold text-warm-900">{{ r.resumenPeriodo.sesionesNoProgramables }} ({{ horas(r.resumenPeriodo.minutosNoProgramables) }})</dd></div>
                <div><dt class="text-warm-500">Horas esperadas de la materia</dt><dd class="font-semibold text-warm-900">{{ horas(r.resumenPeriodo.minutosEsperadosMateria) }}</dd></div>
              </dl>

              @if (r.cambioSobreGrupoExistente; as cambio) {
                <p class="text-xs text-warm-700" data-testid="cambio-grupo-existente">
                  Sobre el grupo actual: se conservan {{ cambio.sesionesConservadas }} sesiones ({{ horas(cambio.minutosConservados) }}) ya dictadas o con asistencia,
                  se crean {{ cambio.sesionesFuturasQueSeCrean }} y se retiran {{ cambio.sesionesFuturasQueSeRetiran }}.
                </p>
              }

              @if (r.conflictos.length > 0) {
                <ul class="space-y-1.5" data-testid="conflictos-previsualizacion">
                  @for (c of r.conflictos; track $index) {
                    <li class="text-xs rounded-xl px-3 py-2 border"
                      [class]="c.severidad === 'BLOQUEANTE' ? 'text-danger-700 bg-danger-50 border-danger-200 font-semibold' : c.severidad === 'ADVERTENCIA' ? 'text-warning-800 bg-warning-50 border-warning-200' : 'text-warm-700 bg-white border-warm-200'">
                      <span class="font-bold">{{ c.severidad === 'BLOQUEANTE' ? 'No se puede guardar:' : c.severidad === 'ADVERTENCIA' ? 'Atención:' : 'Información:' }}</span> {{ c.mensaje }}
                    </li>
                  }
                </ul>
              } @else {
                <p class="text-xs font-semibold text-success-700" data-testid="sin-conflictos">Sin conflictos: el horario se puede guardar.</p>
              }

              <details class="text-xs">
                <summary class="cursor-pointer font-semibold text-primary-700">Ver las {{ r.sesiones.length }} sesiones</summary>
                <div class="mt-2 max-h-64 overflow-auto rounded-xl border border-warm-200 bg-white">
                  <table class="w-full">
                    <thead class="bg-warm-50 text-warm-600 text-left"><tr><th scope="col" class="px-3 py-1.5">#</th><th scope="col" class="px-3 py-1.5">Semana</th><th scope="col" class="px-3 py-1.5">Fecha</th><th scope="col" class="px-3 py-1.5">Hora</th><th scope="col" class="px-3 py-1.5">Estado</th></tr></thead>
                    <tbody>
                      @for (s of r.sesiones; track s.numero) {
                        <tr class="border-t border-warm-100" [class.text-warm-400]="s.estado === 'NO_PROGRAMABLE_POR_FECHA'">
                          <td class="px-3 py-1.5">{{ s.numero }}</td><td class="px-3 py-1.5">{{ s.numeroSemana }}</td><td class="px-3 py-1.5">{{ s.fecha }}</td>
                          <td class="px-3 py-1.5">{{ s.horaInicio }}-{{ s.horaFin }}</td>
                          <td class="px-3 py-1.5">{{ estadoSesion(s.estado) }}@if (s.nombreFestivo) { ({{ s.nombreFestivo }}) }</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </details>
            }
          </section>

          <div class="flex justify-end gap-2 pt-2 border-t border-warm-100">
            <button type="button" (click)="volver()" class="px-4 py-2 rounded-xl bg-warm-50 border border-warm-200 text-sm font-semibold text-warm-700">
              Cancelar
            </button>
            <button type="submit" [disabled]="guardando()" class="px-4 py-2 rounded-xl bg-primary-700 text-sm font-semibold text-white disabled:opacity-60">
              {{ guardando() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      }
    </div>
  `
})
export class CoordinatorGroupsComponent implements OnInit {
  /** CULM-001: dentro de una pestaña, el título lo pone el cascarón. */
  readonly embebido = input(false);
  private readonly courseService = inject(CourseService);
  private readonly coordinatorService = inject(CoordinatorManagementService);
  private readonly toast = inject(ToastService);

  vista = signal<'LISTA' | 'FORM'>('LISTA');
  modo = signal<'CREAR' | 'EDITAR'>('CREAR');
  guardando = signal<boolean>(false);
  /** Los grupos del programa se pagina en el servidor (CIERRE-W2A): `total` y `totalPaginas` son los del servidor. */
  readonly listado = new ListadoPaginado<Course>(
    (pagina, tamano) => this.courseService.getCoordinatorCoursesPage({ pagina, tamano }),
    (mensaje) => this.toast.error(mensaje || mensajeUi('UI_COORDINATOR_GROUPS_001'))
  );
  cargando = this.listado.cargando;
  errorCarga = this.listado.error;
  asignaturas = signal<AsignaturaPlanItem[]>([]);
  /**
   * HU074: el combo de «Nuevo grupo» no ofrece asignaturas inactivas (el backend las rechaza con 409 ASI_010). La malla trae
   * `estaActivaAsignatura`; sin el dato se ofrece. La edición no muestra este combo: la asignatura del grupo no cambia.
   */
  asignaturasParaCrear = computed(() => this.asignaturas().filter((a) => a.estaActivaAsignatura !== false));
  periodos = signal<PeriodoAcademicoItem[]>([]);
  /**
   * DEC-076: período en el que se crea el grupo: el que el servidor marca como ACTIVO (vigente hoy). Sin uno en curso no se
   * envía período y la base toma el próximo en PLANEACION. Un período ya terminado no recibe grupos (la base responde PER_010).
   */
  readonly periodoCreacion = computed(() => this.periodos().find((p) => p.estado === 'ACTIVO') ?? null);
  docentes = signal<DocentePrograma[]>([]);
  /** Fallo al cargar las asignaturas, docentes o periodos del formulario: se muestra con reintento, no como listas vacías. */
  errorCatalogos = signal<LoadErrorState | null>(null);
  /** Rechazo del backend al guardar (p. ej. cruce de horario del docente): se muestra en el formulario, además del aviso. */
  errorGuardado = signal<string | null>(null);
  /** SES-GEN-01: previsualización del calendario de sesiones del horario propuesto (solo lectura; la confirmación vuelve a validar todo). */
  readonly resultado = signal<PrevisualizacionHorarioGrupo | null>(null);
  readonly previsualizando = signal(false);
  readonly errorPrevision = signal<string | null>(null);
  private claveCalculada = '';
  private grupoEditado: string | null = null;
  private readonly nombresDocente = computed(() => new Map(this.docentes().map((d) => [d.idDocente, d.nombreCompleto])));

  form: GrupoForm = this.formVacio();

  ngOnInit(): void {
    this.cargarGrupos();
    this.cargarCatalogos();
  }

  cargarGrupos(): void {
    this.listado.cargar();
  }

  /** Asignaturas de los planes del programa, docentes activos del programa y períodos académicos. */
  cargarCatalogos(): void {
    this.errorCatalogos.set(null);
    const alFallar = (error: unknown): void => this.errorCatalogos.set(classifyLoadError(error));

    this.coordinatorService
      .getPlanesEstudio()
      .pipe(
        switchMap((res) => {
          const planes = res.datos ?? [];
          return planes.length === 0
            ? of([] as AsignaturaPlanItem[])
            : forkJoin(planes.map((p) => this.coordinatorService.getAsignaturasPorPlan(p.id).pipe(
                map((r) => r.datos ?? []),
                catchError((error: unknown) => {
                  alFallar(error);
                  return of([] as AsignaturaPlanItem[]);
                })
              ))).pipe(map((listas) => listas.flat()));
        }),
        catchError((error: unknown) => {
          alFallar(error);
          return of([] as AsignaturaPlanItem[]);
        })
      )
      .subscribe((asignaturas) => this.asignaturas.set(asignaturas));

    // Se piden todas las páginas del directorio (el backend limita a 100 por página): el selector no debe truncarse.
    const TAMANO = 100;
    const pedir = (pagina: number) => this.coordinatorService.getDocentesPrograma({ pagina, tamano: TAMANO, estaActivo: true });
    let pagina = 1;
    pedir(pagina)
      .pipe(
        expand((res) => (pagina * TAMANO < Number(res.total ?? 0) ? pedir(++pagina) : EMPTY)),
        reduce((acumulados: DocentePrograma[], res) => [...acumulados, ...(res.datos ?? [])], []),
        catchError((error: unknown) => {
          alFallar(error);
          return of([] as DocentePrograma[]);
        })
      )
      .subscribe((docentes) => this.docentes.set(docentes));

    this.coordinatorService
      .getPeriodosAcademicos()
      .pipe(
        catchError((error: unknown) => {
          alFallar(error);
          return of({ exitoso: false, datos: [] as PeriodoAcademicoItem[] });
        })
      )
      .subscribe((res) => this.periodos.set(res.datos ?? []));
  }

  readonly horas = minutosAHoras;

  /** Materia elegida en el formulario de un grupo nuevo (para mostrar sus horas semanales). */
  asignaturaElegida(): AsignaturaPlanItem | null {
    return this.asignaturas().find((a) => a.id === this.form.idAsignatura) ?? null;
  }

  /** Datos que determinan la previsualización: si cambian, el resultado mostrado ya no corresponde. */
  private claveForm(): string {
    return JSON.stringify([this.grupoEditado, this.form.idAsignatura, this.periodoCreacion()?.id, this.form.idDocente,
      this.form.franjas.map((f) => [f.dia, f.horaInicio, f.horaFin])]);
  }

  previsualizacionDesactualizada(): boolean {
    return this.resultado() !== null && this.claveForm() !== this.claveCalculada;
  }

  estadoSesion(estado: string): string {
    return estado === 'CANCELADA_POR_FESTIVO' ? 'Cancelada por festivo' : estado === 'NO_PROGRAMABLE_POR_FECHA' ? 'Ya inició el período' : 'Programada';
  }

  /** Pide al backend el calendario de sesiones del horario propuesto (sin guardar nada). */
  previsualizar(): void {
    const error = this.errorPrevisualizable();
    if (error) {
      this.errorPrevision.set(error);
      return;
    }
    this.errorPrevision.set(null);
    this.previsualizando.set(true);
    const clave = this.claveForm();
    this.courseService
      .previsualizarHorarioGrupo({
        idGrupo: this.modo() === 'EDITAR' ? (this.grupoEditado as string) : undefined,
        idAsignatura: this.modo() === 'CREAR' ? this.form.idAsignatura : undefined,
        idPeriodoAcademico: this.modo() === 'CREAR' ? this.periodoCreacion()?.id : undefined,
        idDocente: this.form.idDocente || undefined,
        franjas: this.form.franjas.map((f) => ({ dia: f.dia, horaInicio: f.horaInicio, horaFin: f.horaFin })),
      })
      .subscribe({
        next: (res) => {
          this.previsualizando.set(false);
          if (res.exitoso && res.datos) {
            this.resultado.set(res.datos);
            this.claveCalculada = clave;
          } else {
            this.errorPrevision.set(res.mensajeUsuario || 'No fue posible calcular las sesiones del semestre.');
          }
        },
        error: (err: unknown) => {
          this.previsualizando.set(false);
          this.errorPrevision.set(getApiErrorMessage(err) || 'No fue posible calcular las sesiones del semestre.');
        },
      });
  }

  /**
   * Lo mínimo para poder calcular: materia, período en curso y docente (grupo nuevo) y al menos una franja válida. DEC-076: sin
   * período en curso no hay calendario que previsualizar (el grupo se creará en el próximo período en planeación).
   */
  private errorPrevisualizable(): string | null {
    if (this.modo() === 'CREAR' && !this.form.idAsignatura) {
      return 'Seleccione la asignatura para calcular las sesiones.';
    }
    if (this.modo() === 'CREAR' && !this.periodoCreacion()) {
      return 'No hay un período en curso para calcular las sesiones; el grupo se creará en el próximo período en planeación.';
    }
    if (!this.form.idDocente) return 'Seleccione el docente titular para calcular las sesiones.';
    if (this.form.franjas.length === 0) return 'Defina al menos una franja del horario.';
    return validarFranjas(this.form.franjas);
  }

  nombreDocente(idDocente: string | undefined): string {
    return (idDocente && this.nombresDocente().get(idDocente)) || 'Sin asignar';
  }

  abrirCrear(): void {
    this.modo.set('CREAR');
    this.grupoEditado = null;
    this.form = this.formVacio();
    this.errorGuardado.set(null);
    this.limpiarPrevisualizacion();
    this.vista.set('FORM');
  }

  abrirEditar(grupo: Course): void {
    this.modo.set('EDITAR');
    this.grupoEditado = grupo.id;
    this.form = {
      idAsignatura: grupo.asignaturaId ?? '',
      codigo: grupo.code ? Number(grupo.code) : null,
      nombre: grupo.section,
      idDocente: grupo.docenteId ?? '',
      cupoMaximo: grupo.cupoMaximo ?? null,
      franjas: (grupo.franjas ?? []).map((f) => ({ ...f })),
    };
    this.errorGuardado.set(null);
    this.limpiarPrevisualizacion();
    this.vista.set('FORM');
  }

  private limpiarPrevisualizacion(): void {
    this.resultado.set(null);
    this.errorPrevision.set(null);
    this.claveCalculada = '';
  }

  volver(): void {
    this.errorGuardado.set(null);
    this.vista.set('LISTA');
    this.grupoEditado = null;
  }

  guardar(): void {
    const error = this.validar();
    if (error) {
      this.toast.warning(error);
      return;
    }
    const payload: GrupoCoordinadorPayload = {
      codigo: Number(this.form.codigo),
      nombre: this.form.nombre.trim(),
      idDocente: this.form.idDocente,
      franjas: this.form.franjas,
    };
    const peticion =
      this.modo() === 'CREAR'
        ? this.courseService.crearGrupo({
            ...payload,
            idAsignatura: this.form.idAsignatura,
            idPeriodoAcademico: this.periodoCreacion()?.id,
          })
        : this.courseService.actualizarGrupo(this.grupoEditado as string, {
            ...payload,
            cupoMaximo: this.form.cupoMaximo ? Number(this.form.cupoMaximo) : undefined,
          });

    this.errorGuardado.set(null);
    this.guardando.set(true);
    peticion.subscribe({
      next: (res) => {
        this.guardando.set(false);
        if (res.exitoso) {
          this.toast.success(res.mensajeUsuario || mensajeUi('UI_COORDINATOR_GROUPS_002'));
          this.volver();
          this.cargarGrupos();
        } else {
          this.rechazoGuardado(res.mensajeUsuario || mensajeUi('UI_COORDINATOR_GROUPS_003'));
        }
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.rechazoGuardado(getApiErrorMessage(err) || mensajeUi('UI_COORDINATOR_GROUPS_003'));
      },
    });
  }

  private rechazoGuardado(mensaje: string): void {
    this.errorGuardado.set(mensaje);
    this.toast.error(mensaje);
  }

  /** Validaciones de formato antes de llamar al backend (las reglas de negocio las confirma la DB). */
  validar(): string | null {
    if (this.modo() === 'CREAR' && !this.form.idAsignatura) {
      return 'Seleccione la asignatura.';
    }
    if (!this.form.codigo || Number(this.form.codigo) < 1 || !this.form.nombre.trim()) {
      return 'El código y el nombre del grupo son obligatorios.';
    }
    // DEC-073: código entero positivo y nombre en texto seguro (sin < > ni comillas).
    if (!Number.isInteger(Number(this.form.codigo))) {
      return 'El código del grupo debe ser un número entero mayor que cero.';
    }
    const nombreError = getSafeTextError(this.form.nombre, 'Nombre del grupo');
    if (nombreError) {
      return nombreError;
    }
    if (!this.form.idDocente) {
      return 'Seleccione el docente titular.';
    }
    if (this.modo() === 'EDITAR' && !cupoValidoOVacio(this.form.cupoMaximo)) {
      // usp_actualizar_grupo ignora un cupo <= 0 y deja el anterior: sin esta validación el guardado parecía exitoso.
      return mensajeUi('UI_COORDINATOR_GROUPS_004');
    }
    // SES-GEN-01: todo grupo nace con horario y con sus sesiones; un editor vaciado ya no se envía como «sin horario».
    if (this.form.franjas.length === 0) {
      return 'Defina al menos una franja del horario: el grupo se crea con su horario y sus sesiones.';
    }
    return validarFranjas(this.form.franjas);
  }

  private formVacio(): GrupoForm {
    return {
      idAsignatura: '',
      codigo: null,
      nombre: '',
      idDocente: '',
      cupoMaximo: null,
      franjas: [franjaNueva()],
    };
  }
}
