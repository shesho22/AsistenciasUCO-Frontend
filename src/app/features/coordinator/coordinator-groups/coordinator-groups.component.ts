import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, input } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { EMPTY, forkJoin, of } from 'rxjs';
import { catchError, expand, map, reduce, switchMap } from 'rxjs/operators';
import { CourseService, GrupoCoordinadorPayload } from '../../../core/services/course.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { Course, FranjaHorario } from '../../../core/models/course.model';
import { AsignaturaPlanItem, PeriodoAcademicoItem } from '../../../core/models/role-management.model';
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
  idPeriodoAcademico: string;
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
    <div class="space-y-6 animate-fade-in">
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
                    <td class="px-4 py-3">{{ grupo.schedule || 'Sin horario' }}</td>
                    <td class="px-4 py-3">{{ grupo.enrolledStudentsCount ?? 0 }} / {{ grupo.cupoMaximo ?? '-' }}</td>
                    <td class="px-4 py-3 text-right">
                      <button type="button" class="text-xs font-semibold text-primary-700 hover:underline" (click)="abrirEditar(grupo)">
                        Editar
                      </button>
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
        <form class="superficie p-6 space-y-5 max-w-3xl" (ngSubmit)="guardar()">
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
              <label class="text-xs font-semibold text-warm-700">Período académico
                <select name="idPeriodoAcademico" [(ngModel)]="form.idPeriodoAcademico" class="mt-1 w-full px-3 py-2 border border-warm-200 rounded-xl text-sm">
                  <option value="">{{ periodos().length === 0 ? '-- No hay períodos disponibles --' : 'Seleccione...' }}</option>
                  @for (p of periodos(); track p.id) {
                    <option [value]="p.id">{{ p.nombre }}</option>
                  }
                </select>
              </label>
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

          <app-franjas-editor [(franjas)]="form.franjas" />

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
  docentes = signal<DocentePrograma[]>([]);
  /** Fallo al cargar las asignaturas, docentes o periodos del formulario: se muestra con reintento, no como listas vacías. */
  errorCatalogos = signal<LoadErrorState | null>(null);
  /** Rechazo del backend al guardar (p. ej. cruce de horario del docente): se muestra en el formulario, además del aviso. */
  errorGuardado = signal<string | null>(null);
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

  nombreDocente(idDocente: string | undefined): string {
    return (idDocente && this.nombresDocente().get(idDocente)) || 'Sin asignar';
  }

  abrirCrear(): void {
    this.modo.set('CREAR');
    this.grupoEditado = null;
    this.form = this.formVacio();
    this.errorGuardado.set(null);
    this.vista.set('FORM');
  }

  abrirEditar(grupo: Course): void {
    this.modo.set('EDITAR');
    this.grupoEditado = grupo.id;
    this.form = {
      idAsignatura: grupo.asignaturaId ?? '',
      idPeriodoAcademico: '',
      codigo: grupo.code ? Number(grupo.code) : null,
      nombre: grupo.section,
      idDocente: grupo.docenteId ?? '',
      cupoMaximo: grupo.cupoMaximo ?? null,
      franjas: (grupo.franjas ?? []).map((f) => ({ ...f })),
    };
    this.errorGuardado.set(null);
    this.vista.set('FORM');
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
            idPeriodoAcademico: this.form.idPeriodoAcademico,
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
    if (this.modo() === 'CREAR' && (!this.form.idAsignatura || !this.form.idPeriodoAcademico)) {
      return 'Seleccione la asignatura y el período académico.';
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
    return validarFranjas(this.form.franjas);
  }

  private formVacio(): GrupoForm {
    return {
      idAsignatura: '',
      idPeriodoAcademico: '',
      codigo: null,
      nombre: '',
      idDocente: '',
      cupoMaximo: null,
      franjas: [franjaNueva()],
    };
  }
}
