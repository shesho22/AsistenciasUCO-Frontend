import { Component, DestroyRef, OnInit, inject, signal, computed, ChangeDetectionStrategy, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, Subscription, debounceTime, finalize, switchMap } from 'rxjs';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { CourseService } from '../../../core/services/course.service';
import { CoordinatorIndicatorsService } from '../../../core/services/coordinator-indicators.service';
import { CoordinatorProgramService } from '../../../core/services/coordinator-program.service';
import { KpisCoordinador } from '../../../core/models/coordinator-indicators.model';
import { EstadoIndicadores, TEXTO_CARGANDO, TEXTO_SIN_DATOS } from '../../../core/utils/cifra-indicador';
import { Course } from '../../../core/models/course.model';
import { AsignaturaPlanItem, CaracterAsignatura } from '../../../core/models/role-management.model';
import { EstudianteGrupoApiDto } from '../../../core/api/models/estudiante-grupo-api-dto.model';
import { BadgeComponent, BadgeVariant } from '../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { LoadErrorState, classifyLoadError } from '../../../core/api/errors/load-error.util';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TAMANO_PAGINA_TABLA, TablaDatosComponent, paginarEnCliente } from '../../../shared/components/tabla-datos/tabla-datos.component';
import { ListadoPaginado } from '../../../shared/utils/listado-paginado';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { SubpestanasComponent } from '../../../shared/components/tabs/subpestanas.component';
import { TabItem } from '../../../shared/components/tabs/tabs-nav.component';

const ESTADOS_INSCRITO: Record<string, { etiqueta: string; variante: BadgeVariant }> = {
  A: { etiqueta: 'Activo', variante: 'success' },
  CVP: { etiqueta: 'Cancelado por voluntad propia', variante: 'neutral' },
  CI: { etiqueta: 'Cancelado por inasistencia', variante: 'warning' },
  F: { etiqueta: 'Finalizado', variante: 'info' },
};

/**
 * Estado de una fila de la nómina (`EstudianteGrupoDTO`: `codigoEstado` y `nombreEstado`). Un código fuera del catálogo
 * muestra el nombre que manda el backend (con mayúscula inicial); sin ninguno de los dos, «Sin estado».
 */
export function etiquetaEstadoInscrito(est: Partial<Pick<EstudianteGrupoApiDto, 'codigoEstado' | 'nombreEstado'>>): {
  etiqueta: string;
  variante: BadgeVariant;
} {
  const codigo = (est.codigoEstado ?? '').trim().toUpperCase();
  const conocido = ESTADOS_INSCRITO[codigo];
  if (conocido) return conocido;
  const nombre = (est.nombreEstado ?? '').trim() || codigo;
  return { etiqueta: nombre ? nombre.charAt(0).toUpperCase() + nombre.slice(1) : 'Sin estado', variante: 'neutral' };
}

/** Cifra del KPI o «—» cuando el servidor no la envía (un backend anterior a CIERRE-W3I no trae el aforo). */
function cifra(valor: unknown): string {
  return typeof valor === 'number' && Number.isFinite(valor) ? String(valor) : '—';
}

@Component({
    selector: 'app-coordinator-subjects',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PageHeaderComponent, 
    FormsModule,
    RouterLink,
    BadgeComponent,
    ButtonComponent,
    AvatarComponent,
    ErrorCargaComponent,
    TablaDatosComponent,
    ModalComponent,
    SubpestanasComponent
],
    template: `
    <div class="space-y-4">
      <!-- Header Bento -->
      <app-page-header
        [enTarjeta]="true"
        [conTitulo]="!embebido()"
        etiqueta="Coordinación de Programa"
        contexto="Oferta Académica de la Carrera"
        titulo="Materias del Programa"
        descripcion="Consulta todas las materias y grupos activos de la carrera, sus horarios y el listado de estudiantes inscritos por grupo."
      >
        <div cabecera-acciones class="flex flex-wrap items-center gap-2">
          <a routerLink="/app/coordinador/estudiantes">
            <app-button variant="secondary" size="sm">
              Ver Estudiantes →
            </app-button>
          </a>
          <a routerLink="/app/coordinador/planes-estudio">
            <app-button variant="secondary" size="sm">
              Planes de Estudio →
            </app-button>
          </a>
        </div>
      </app-page-header>

      <!-- KPIs de Materias del Programa -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <div class="superficie px-3 py-2 sm:p-4">
          <span class="text-xs text-warm-500 font-medium">Grupos / Materias Ofertadas</span>
          <p class="text-xl font-serif font-bold text-warm-900 mt-0.5">{{ listado.total() }}</p>
          <span class="text-[11px] text-primary-700 font-medium">Activos en el período</span>
        </div>
        <div class="superficie px-3 py-2 sm:p-4">
          <span class="text-xs text-warm-500 font-medium">Asignaturas en el Plan de Estudio</span>
          <p class="text-xl font-serif font-bold text-success-700 mt-0.5">{{ listadoAsignaturas.total() }}</p>
          <span class="text-[11px] text-warm-500">En {{ totalPlanes() }} {{ totalPlanes() === 1 ? 'plan' : 'planes' }} de estudio</span>
        </div>
        <div class="superficie px-3 py-2 sm:p-4">
          <span class="text-xs text-warm-500 font-medium">Ocupación de Cupos</span>
          <p class="text-xl font-serif font-bold text-info-800 mt-1" data-testid="ocupacion-cupos">{{ ocupacionTexto() }}</p>
          <span class="text-[11px] text-warm-500" data-testid="ocupacion-detalle">{{ ocupacionDetalle() }}</span>
        </div>
      </div>

      <!-- Barra de Búsqueda de Materias -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="sm:col-span-2 relative">
          <input aria-label="Buscar asignatura por código o nombre"
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="onBusqueda($event)"
            placeholder="Buscar materia por código, nombre o grupo..."
            class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-warm-sm"
          />
          <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div>
          <select aria-label="Filtrar asignaturas por tipo"
            [ngModel]="filtroTipoAsignatura()"
            (ngModelChange)="onCaracter($event)"
            class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-warm-sm"
          >
            <option value="">Todos los caracteres</option>
            @for (c of caracteres(); track c.codigo) {
              <option [value]="c.codigo">{{ c.nombre }}</option>
            }
          </select>
        </div>
      </div>

      <!-- MEJORAS-SERGIO 11: grupos y catálogo en subpestañas; la nómina del grupo se abre en una ventana emergente -->
      <app-subpestanas [tabs]="secciones()" [(activa)]="seccion" etiqueta="Secciones de materias" idPanel="panel-materias-programa" />
      <div role="tabpanel" id="panel-materias-programa" [attr.aria-labelledby]="'subtab-' + seccion()" class="min-w-0">
      @if (seccion() === 'grupos') {
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-serif font-bold text-xl text-warm-900">
              Grupos y Materias Activas en el Período
            </h2>
            <p class="text-xs text-warm-500">
              Pulsa «Ver inscritos» para consultar la nómina de estudiantes de un grupo.
            </p>
          </div>
          <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-warm-100 text-warm-700">
            {{ listado.total() }} {{ listado.total() === 1 ? 'grupo' : 'grupos' }}
          </span>
        </div>

        @if (errorCarga()) {
          <app-error-carga [error]="errorCarga()!" (reintentar)="cargarDatos()" />
        } @else {
          <app-tabla-datos
            etiqueta="Grupos y materias activas en el período"
            [columnas]="6"
            anchoMinimo="50rem"
            [cargando]="listado.cargando()"
            [vacio]="listado.filas().length === 0"
            mensajeVacio="No se encontraron grupos ofertados que coincidan con la búsqueda."
            [paginada]="true"
            [totalItems]="listado.total()"
            [totalPaginas]="listado.totalPaginas()"
            [pagina]="listado.pagina()"
            [tamanoPagina]="listado.tamano()"
            (paginaChange)="listado.irAPagina($event)"
            (tamanoPaginaChange)="listado.cambiarTamano($event)"
          >
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Materia</th>
                <th scope="col">Grupo</th>
                <th scope="col">Horario</th>
                <th scope="col" class="text-right">Cupos</th>
                <th scope="col"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            @if (!listado.cargando()) {
              <tbody>
                @for (curso of courses(); track curso.id) {
                  <tr data-testid="grupo-programa-fila">
                    <td class="whitespace-nowrap">
                      <span class="rounded-md bg-warm-100 px-2 py-0.5 font-mono text-xs font-bold text-warm-800">{{ curso.code }}</span>
                    </td>
                    <td class="min-w-[12rem] font-semibold text-warm-900">{{ curso.name }}</td>
                    <td class="whitespace-nowrap">
                      <app-badge variant="neutral" size="sm">{{ curso.section }}</app-badge>
                    </td>
                    <td class="min-w-[10rem] text-xs text-warm-700">{{ curso.schedule }}</td>
                    <td class="whitespace-nowrap text-right tabular-nums">
                      <strong class="text-warm-900">{{ curso.enrolledStudentsCount }} / {{ cupoTexto(curso) }}</strong>
                    </td>
                    <td class="whitespace-nowrap text-right">
                      <app-button variant="secondary" size="sm" data-testid="ver-inscritos" (clicked)="onSelectCourse(curso.id)">
                        Ver inscritos
                      </app-button>
                    </td>
                  </tr>
                }
              </tbody>
            }
          </app-tabla-datos>
        }
      </div>

      } @else {
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-serif font-bold text-xl text-warm-900">
              Catálogo Curricular de Materias de la Carrera
            </h2>
            <p class="text-xs text-warm-500">
              Todas las asignaturas registradas en los planes de estudio del programa académico.
            </p>
          </div>
          <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-warm-100 text-warm-700">
            {{ listadoAsignaturas.total() }} {{ listadoAsignaturas.total() === 1 ? 'asignatura' : 'asignaturas' }}
          </span>
        </div>

        @if (errorCarga()) {
          <app-error-carga [error]="errorCarga()!" (reintentar)="cargarDatos()" />
        } @else {
          <app-tabla-datos
            etiqueta="Catálogo curricular de materias de la carrera"
            [columnas]="7"
            anchoMinimo="56rem"
            [cargando]="listadoAsignaturas.cargando()"
            [vacio]="listadoAsignaturas.filas().length === 0"
            mensajeVacio="No hay asignaturas curriculares que coincidan con los filtros seleccionados."
            [paginada]="true"
            [totalItems]="listadoAsignaturas.total()"
            [totalPaginas]="listadoAsignaturas.totalPaginas()"
            [pagina]="listadoAsignaturas.pagina()"
            [tamanoPagina]="listadoAsignaturas.tamano()"
            (paginaChange)="listadoAsignaturas.irAPagina($event)"
            (tamanoPaginaChange)="listadoAsignaturas.cambiarTamano($event)"
          >
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Asignatura</th>
                <th scope="col">Carácter</th>
                <th scope="col" class="text-right">Semestre</th>
                <th scope="col" class="text-right">Créditos</th>
                <th scope="col" class="text-right">Horas/Sem</th>
                <th scope="col"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            @if (!listadoAsignaturas.cargando()) {
              <tbody>
                @for (asig of listadoAsignaturas.filas(); track clavePlan(asig)) {
                  <tr data-testid="asignatura-catalogo-fila">
                    <td class="whitespace-nowrap">
                      <span class="rounded-md bg-warm-100 px-2 py-0.5 font-mono text-xs font-bold text-warm-800">{{ asig.codigo }}</span>
                    </td>
                    <td class="min-w-[14rem]">
                      <span class="block font-semibold text-warm-900">{{ asig.nombre }}</span>
                      @if (asig.nombrePrograma) {
                        <span class="block text-xs text-warm-500">
                          {{ asig.nombrePrograma }}@if (asig.inpPlanEstudio) { · Plan {{ asig.inpPlanEstudio }} }
                        </span>
                      }
                    </td>
                    <td>
                      <span class="flex flex-wrap items-center gap-1">
                        <app-badge size="sm" [variant]="getTipoBadgeVariant(asig.nombreCaracter ?? asig.componente)">
                          {{ asig.nombreCaracter ?? asig.componente }}
                        </app-badge>
                        @if (asig.compartida) {
                          <app-badge variant="info" size="sm">Compartida</app-badge>
                        }
                      </span>
                    </td>
                    <td class="text-right tabular-nums">{{ asig.semestre }}°</td>
                    <td class="text-right tabular-nums">{{ asig.creditos }}</td>
                    <td class="whitespace-nowrap text-right tabular-nums">
                      {{ asig.horasSemanales === null || asig.horasSemanales === undefined ? 'Sin cargar' : asig.horasSemanales + 'h' }}
                    </td>
                    <td class="whitespace-nowrap text-right text-xs">
                      <button
                        type="button"
                        (click)="irAMallaPlan(asig.planEstudioId)"
                        class="font-semibold text-primary-700 hover:text-primary-900"
                      >
                        Ver Plan de Estudio →
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            }
          </app-tabla-datos>
        }
      </div>
      }
      </div>
      <!-- La nómina se carga al primer uso y el modal permanece montado para devolver el foco al cerrarse. -->
      @defer (when selectedCourse() !== null) {
        <app-modal
          [isOpen]="selectedCourse() !== null"
          [title]="selectedCourse() ? 'Estudiantes inscritos en ' + selectedCourse()!.name : 'Estudiantes inscritos'"
          tamano="lg"
          etiquetaCerrar="Cerrar"
          panelTestId="modal-inscritos"
          (closed)="cerrarInscritos()"
        >
          @if (selectedCourse(); as cursoActual) {
            <div class="space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-warm-100">
                <div>
                  <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-warm-100 text-warm-700">
                    {{ cursoActual.code }} • {{ cursoActual.section }}
                  </span>
                  <p class="text-xs text-warm-500 mt-1">
                    Nómina oficial del grupo (la inscripción y retiro de alumnos en los grupos es administrada directamente por el docente titular).
                  </p>
                </div>
                @if (!cargandoInscritos() && !errorInscritos()) {
                  <span class="text-xs font-bold px-3 py-1 rounded-full bg-primary-50 text-primary-800 border border-primary-200 shrink-0">
                    {{ enrolledStudents().length }} / {{ cupoTexto(cursoActual) }} {{ enrolledStudents().length === 1 ? 'estudiante' : 'estudiantes' }}
                  </span>
                }
              </div>

              @if (cargandoInscritos()) {
                <p role="status" class="text-sm text-warm-500 text-center py-6" data-testid="inscritos-cargando">Cargando estudiantes inscritos…</p>
              } @else if (errorInscritos(); as error) {
                <app-error-carga [error]="error" (reintentar)="cargarInscritos(cursoActual.id)" />
              } @else if (enrolledStudents().length === 0) {
                <div class="p-10 text-center text-warm-500" data-testid="inscritos-vacio">
                  <p class="text-sm">No hay estudiantes registrados en este grupo actualmente.</p>
                </div>
              } @else {
                <app-tabla-datos
                  data-testid="lista-inscritos"
                  etiqueta="Estudiantes inscritos en el grupo"
                  [columnas]="4"
                  anchoMinimo="40rem"
                  alturaMaxima="60vh"
                  [paginada]="true"
                  [totalItems]="enrolledStudents().length"
                  [pagina]="paginaInscritos()"
                  [tamanoPagina]="tamanoInscritos()"
                  (paginaChange)="paginaInscritos.set($event)"
                  (tamanoPaginaChange)="cambiarTamanoInscritos($event)"
                >
                  <thead>
                    <tr>
                      <th scope="col">Estudiante</th>
                      <th scope="col">Documento</th>
                      <th scope="col">Correo</th>
                      <th scope="col">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (est of inscritosPagina(); track est.id) {
                      <tr data-testid="inscrito-fila">
                        <td>
                          <span class="flex min-w-0 items-center gap-2">
                            <app-avatar [name]="est.nombreCompleto" size="sm"></app-avatar>
                            <span class="font-semibold text-warm-900">{{ est.nombreCompleto }}</span>
                          </span>
                        </td>
                        <td class="whitespace-nowrap tabular-nums">Doc. {{ est.documento || '—' }}</td>
                        <td class="text-xs text-warm-600 break-all">{{ est.correo || '—' }}</td>
                        <td>
                          <app-badge size="sm" [variant]="estadoInscrito(est).variante" data-testid="estado-inscrito">
                            {{ estadoInscrito(est).etiqueta }}
                          </app-badge>
                        </td>
                      </tr>
                    }
                  </tbody>
                </app-tabla-datos>
              }
            </div>
          }
        </app-modal>
      }

    </div>
  `
})
export class CoordinatorSubjectsComponent implements OnInit {
  /** CULM-001: dentro de una pestaña, el título lo pone el cascarón. */
  readonly embebido = input(false);
  private readonly coordinatorService = inject(CoordinatorManagementService);
  private readonly courseService = inject(CourseService);
  private readonly router = inject(Router);
  private readonly indicadores = inject(CoordinatorIndicatorsService);
  private readonly programa = inject(CoordinatorProgramService);

  /** Los grupos del programa se buscan y paginan en el servidor (CIERRE-W2A); `total` es el del filtro. */
  readonly listado = new ListadoPaginado<Course>(
    (pagina, tamano) =>
      this.courseService
        .getCoordinatorCoursesPage({ busqueda: this.searchQuery().trim() || null, pagina, tamano }),
    (mensaje) => this.toast.error(mensaje)
  );
  /** Asignaturas del catálogo curricular del programa: búsqueda, carácter y paginación en el servidor. */
  readonly listadoAsignaturas = new ListadoPaginado<AsignaturaPlanItem>(
    (pagina, tamano) =>
      this.coordinatorService.getAsignaturasPrograma({
        busqueda: this.searchQuery().trim() || null,
        caracter: this.filtroTipoAsignatura() || null,
        pagina,
        tamano,
      }),
    (mensaje) => this.toast.error(mensaje)
  );
  courses = this.listado.filas;
  /** Grupo cuya nómina está abierta; se guarda el grupo (no solo su id) para que cambiar de página no cierre la ventana. */
  readonly selectedCourse = signal<Course | null>(null);
  enrolledStudents = signal<EstudianteGrupoApiDto[]>([]);
  /** Estado de la consulta de la nómina: un fallo o una carga lenta no deben verse como «No hay estudiantes». */
  readonly cargandoInscritos = signal(false);
  readonly errorInscritos = signal<LoadErrorState | null>(null);
  /** Consulta de nómina en curso: se cancela al abrir otro grupo o cerrar la ventana (una respuesta tardía no pisa otra). */
  private inscritosSub: Subscription | null = null;
  /** Bloque E: la nómina llega completa; se pagina en el cliente (15 por defecto, 15/30/50). */
  readonly paginaInscritos = signal(1);
  readonly tamanoInscritos = signal(TAMANO_PAGINA_TABLA);
  readonly inscritosPagina = computed(() =>
    paginarEnCliente(this.enrolledStudents(), this.paginaInscritos(), this.tamanoInscritos()),
  );

  cambiarTamanoInscritos(tamano: number): void {
    this.tamanoInscritos.set(tamano);
    this.paginaInscritos.set(1);
  }

  /** Total de planes de estudio del programa (`total` del servidor). */
  totalPlanes = signal(0);
  /** Caracteres del catálogo (código y nombre), no los que aparecen en las filas cargadas. */
  caracteres = signal<CaracterAsignatura[]>([]);

  searchQuery = signal<string>('');
  /** Código del carácter elegido ('' = todos). */
  filtroTipoAsignatura = signal<string>('');
  private readonly busqueda$ = new Subject<void>();
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  private readonly errorAuxiliar = signal<LoadErrorState | null>(null);

  /** MEJORAS-SERGIO 11: subpestaña visible (grupos del período o catálogo curricular). */
  readonly seccion = signal<string>('grupos');
  readonly secciones = computed<TabItem[]>(() => [
    { id: 'grupos', etiqueta: `Grupos del período (${this.listado.total()})` },
    { id: 'catalogo', etiqueta: `Catálogo curricular (${this.listadoAsignaturas.total()})` },
  ]);

  /** B2NM: la misma asignatura aparece una vez por plan donde está vinculada. */
  clavePlan(a: AsignaturaPlanItem): string {
    return `${a.id}|${a.planEstudioId}`;
  }

  /**
   * CIERRE-W3I: la ocupación de cupos de todos los grupos habilitados del programa la calcula la base
   * (`GET /coordinador/indicadores`); antes se sumaban solo los grupos de la página visible.
   */
  readonly kpis = signal<KpisCoordinador | null>(null);
  readonly estadoKpis = signal<EstadoIndicadores>('cargando');

  readonly ocupacionTexto = computed(() => {
    const estado = this.estadoKpis();
    const k = this.kpis();
    if (estado === 'cargando') return TEXTO_CARGANDO;
    if (estado === 'error' || k === null) return TEXTO_SIN_DATOS;
    return `${cifra(k.matriculadosActivos)} / ${cifra(k.cupoTotal)}`;
  });

  readonly ocupacionDetalle = computed(() => {
    const k = this.kpis();
    if (this.estadoKpis() !== 'listo' || k === null) return 'Grupos habilitados del período';
    if (k.tasaAforo === null) return 'Sin cupo registrado en los grupos habilitados';
    // Campo ausente (servidor sin el aforo de CIERRE-W3I): no se afirma «sin cupo» ni se pinta «undefined».
    if (typeof k.tasaAforo !== 'number') return 'Grupos habilitados del período';
    return `${k.tasaAforo} % de ocupación · ${cifra(k.gruposActivos)} ${k.gruposActivos === 1 ? 'grupo habilitado' : 'grupos habilitados'}`;
  });

  private tieneCupo(curso: Course): boolean {
    return typeof curso.cupoMaximo === 'number' && curso.cupoMaximo > 0;
  }

  /** Cupo máximo del backend; «—» (no disponible) cuando no viene: no se inventa un número. */
  cupoTexto(curso: Course): string {
    return this.tieneCupo(curso) ? String(curso.cupoMaximo) : '—';
  }

  readonly errorCarga = computed(() => this.listado.error() ?? this.listadoAsignaturas.error() ?? this.errorAuxiliar());

  constructor() {
    this.listado.tamano.set(TAMANO_PAGINA_TABLA);
    this.listadoAsignaturas.tamano.set(TAMANO_PAGINA_TABLA);
    this.destroyRef.onDestroy(() => this.cancelarInscritos());
    this.busqueda$.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.listado.buscar();
      this.listadoAsignaturas.buscar();
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.errorAuxiliar.set(null);
    this.listado.buscar();
    this.listadoAsignaturas.buscar();

    this.coordinatorService.getPlanesEstudio().subscribe({
      next: (res) => this.totalPlanes.set(Number(res.total ?? res.datos?.length ?? 0)),
      error: (error: unknown) => this.errorAuxiliar.set(classifyLoadError(error)),
    });
    this.coordinatorService.getCaracteresAsignatura().subscribe({
      next: (res) => this.caracteres.set(res.datos ?? []),
      error: (error: unknown) => this.errorAuxiliar.set(classifyLoadError(error)),
    });
    this.cargarOcupacion();
  }

  /** Ocupación de cupos desde el servidor; se pide con el programa ya resuelto (con varios programas el backend exige `programaId`). */
  private cargarOcupacion(): void {
    this.estadoKpis.set('cargando');
    this.programa
      .cargar()
      .pipe(switchMap(() => this.indicadores.consultarKpis()))
      .subscribe({
        next: (res) => {
          this.kpis.set(res.datos ?? null);
          this.estadoKpis.set(res.datos ? 'listo' : 'error');
        },
        error: () => {
          this.kpis.set(null);
          this.estadoKpis.set('error');
        },
      });
  }

  onBusqueda(valor: string): void {
    this.searchQuery.set(valor);
    this.busqueda$.next();
  }

  onCaracter(codigo: string): void {
    this.filtroTipoAsignatura.set(codigo);
    this.listadoAsignaturas.buscar();
  }

  /** Cierra la ventana de la nómina del grupo. */
  cerrarInscritos(): void {
    this.cancelarInscritos();
    this.selectedCourse.set(null);
    this.enrolledStudents.set([]);
    this.cargandoInscritos.set(false);
    this.errorInscritos.set(null);
  }

  /** Abre la nómina del grupo en una ventana emergente (ya no se elige un grupo al cargar la pantalla). */
  onSelectCourse(cursoId: string): void {
    const curso = this.courses().find((c) => c.id === cursoId) ?? null;
    if (!curso) return;
    this.selectedCourse.set(curso);
    this.cargarInscritos(cursoId);
  }

  /** Pide la nómina del grupo; cancela la consulta anterior para que solo cuente la del grupo abierto. */
  cargarInscritos(cursoId: string): void {
    this.cancelarInscritos();
    this.enrolledStudents.set([]);
    this.paginaInscritos.set(1);
    this.errorInscritos.set(null);
    this.cargandoInscritos.set(true);
    this.inscritosSub = this.coordinatorService
      .getEstudiantesPorGrupo(cursoId)
      .pipe(finalize(() => this.cargandoInscritos.set(false)))
      .subscribe({
        next: (res) => this.enrolledStudents.set(res.datos ?? []),
        error: (error: unknown) => this.errorInscritos.set(classifyLoadError(error)),
      });
  }

  private cancelarInscritos(): void {
    this.inscritosSub?.unsubscribe();
    this.inscritosSub = null;
  }

  /** Etiqueta y color del estado de la matrícula en el grupo (catálogo EstadoEstudianteGrupo: A, CVP, CI, F). */
  estadoInscrito(est: EstudianteGrupoApiDto): { etiqueta: string; variante: BadgeVariant } {
    return etiquetaEstadoInscrito(est);
  }

  irAMallaPlan(planId: string): void {
    void this.router.navigate(['/app/coordinador/planes-estudio', planId, 'malla']);
  }

  getTipoBadgeVariant(componente: string): BadgeVariant {
    switch (componente) {
      case 'Obligatoria':
        return 'info';
      case 'Optativa':
        return 'success';
      case 'Electiva':
        return 'success';
      case 'Complementaria':
        return 'warning';
      default:
        return 'neutral';
    }
  }
}
