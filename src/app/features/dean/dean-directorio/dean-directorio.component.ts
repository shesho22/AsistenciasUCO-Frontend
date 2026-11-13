import { ElementRef, ChangeDetectionStrategy, Component, OnChanges, OnInit, SimpleChanges, computed, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, of, tap, map } from 'rxjs';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { DeanFacultadService } from '../../../core/services/dean-facultad.service';
import { CourseService } from '../../../core/services/course.service';
import { Course } from '../../../core/models/course.model';
import { FichaEstudianteFacultad } from '../../../core/models/facultad-decano.model';
import { FichaUnificadaEstudiante } from '../../../core/models/consultas-transversales.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { FiltrosPlegablesComponent } from '../../../shared/components/filtros-plegables/filtros-plegables.component';
import { HistorialEstudianteComponent } from '../../../shared/components/historial-estudiante/historial-estudiante.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TabsNavComponent } from '../../../shared/components/tabs/tabs-nav.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { ApiPageResponse } from '../../../core/api/models/api-page-response.model';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { FiltroEstado, ListadoPaginado, estadoComoFiltro } from '../../../shared/utils/listado-paginado';

export type EntidadDirectorio = 'docentes' | 'estudiantes' | 'asignaturas' | 'grupos';

/** Entidades del directorio en el orden del selector. */
export const ENTIDADES_DIRECTORIO: readonly { id: EntidadDirectorio; etiqueta: string }[] = [
  { id: 'docentes', etiqueta: 'Docentes' },
  { id: 'estudiantes', etiqueta: 'Estudiantes' },
  { id: 'asignaturas', etiqueta: 'Asignaturas' },
  { id: 'grupos', etiqueta: 'Grupos' },
];

interface Celda {
  texto: string;
  detalle?: string | null;
  mono?: boolean;
}

/** Fila común a las cuatro fuentes: celdas ya formateadas, estado y la acción propia de la entidad (si la hay). */
interface FilaDirectorio {
  id: string;
  celdas: Celda[];
  estado: { texto: string; variante: 'success' | 'neutral' } | null;
  sinVinculo?: boolean;
  accion?: 'ficha' | 'sesiones';
}

interface ConfiguracionEntidad {
  singular: string;
  plural: string;
  columnas: string[];
  placeholder: string;
  vacio: string;
  conEstado: boolean;
  conPrograma: boolean;
}

const CONFIGURACION: Record<EntidadDirectorio, ConfiguracionEntidad> = {
  docentes: {
    singular: 'docente',
    plural: 'Docentes',
    columnas: ['Docente', 'Documento', 'Programas', 'Grupos'],
    placeholder: 'Buscar por nombre o documento y presiona Enter...',
    vacio: 'No hay docentes que coincidan con los filtros.',
    conEstado: true,
    conPrograma: true,
  },
  estudiantes: {
    singular: 'estudiante',
    plural: 'Estudiantes',
    columnas: ['Estudiante', 'Documento', 'Programas', 'Grupos'],
    placeholder: 'Buscar por nombre o documento y presiona Enter...',
    vacio: 'No hay estudiantes que coincidan con la búsqueda.',
    conEstado: true,
    conPrograma: false,
  },
  asignaturas: {
    singular: 'asignatura',
    plural: 'Asignaturas',
    columnas: ['Asignatura', 'Créditos', 'Planes', 'Área y componente'],
    placeholder: 'Buscar por código o nombre y presiona Enter...',
    vacio: 'No hay asignaturas que coincidan con la búsqueda.',
    conEstado: true,
    conPrograma: false,
  },
  grupos: {
    singular: 'grupo',
    plural: 'Grupos',
    columnas: ['Asignatura y grupo', 'Horario', 'Inscritos / Aforo', 'Programas'],
    placeholder: 'Filtrar por código de materia o nombre...',
    vacio: 'No se encontraron grupos que coincidan con el filtro.',
    conEstado: false,
    conPrograma: false,
  },
};

/** Las fuentes responden con página (`elementos`) o con lista (`datos`/`total`); se leen ambas formas. */
interface PaginaOLista<T> {
  elementos?: T[];
  datos?: T[];
  totalElementos?: number;
  total?: number;
  totalPaginas?: number;
}

interface OpcionPrograma {
  id: string;
  nombre: string;
}

/** Texto de una entidad desconocida en la URL: se cae en docentes (el primer elemento del selector). */
export function entidadValida(valor: string | null | undefined): EntidadDirectorio {
  return ENTIDADES_DIRECTORIO.find((e) => e.id === valor)?.id ?? 'docentes';
}

/**
 * CULM-001: directorio único de la facultad del decano. Reemplaza las pantallas de docentes, estudiantes, asignaturas y
 * grupos por un selector de entidad (`/app/decano/directorio/:entidad`) con la misma tabla paginada y los mismos
 * filtros plegables; cada fuente sigue siendo su servicio existente. Solo lectura; la ficha del estudiante y el detalle
 * de sesiones de un grupo conservan sus contratos (HU104/HU105/HU157 y HU145).
 */
@Component({
    selector: 'app-dean-directorio',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [
        FormsModule,
        BadgeComponent,
        ErrorCargaComponent,
        FiltrosPlegablesComponent,
        HistorialEstudianteComponent,
        PaginationComponent,
        TabsNavComponent,
    ],
    template: `
    <div class="space-y-4 min-w-0">
      <div>
        <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">Directorio de la facultad</h1>
        <p class="text-sm text-warm-600 mt-1">Docentes, estudiantes, asignaturas y grupos de los programas de tu facultad.</p>
      </div>

      <app-tabs-nav
        [tabs]="entidades"
        [activa]="entidadActiva()"
        [base]="['/app/decano/directorio']"
        etiqueta="Entidad del directorio"
        idPanel="panel-directorio"
      />

      <section
        id="panel-directorio"
        role="tabpanel"
        [attr.aria-labelledby]="'tab-' + entidadActiva()"
        class="bg-white p-4 sm:p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4 min-w-0"
      >
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-serif font-bold text-lg text-warm-900">{{ config().plural }}</h2>
          <span class="px-3 py-1.5 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200" data-testid="total-directorio">
            {{ listado.total() }} {{ config().plural }}
          </span>
        </div>

        <app-filtros-plegables [activos]="filtrosActivos()">
          <input
            buscar
            type="text"
            [attr.aria-label]="'Buscar ' + config().singular"
            [ngModel]="busqueda()"
            (ngModelChange)="onBusqueda($event)"
            (keyup.enter)="buscar()"
            [placeholder]="config().placeholder"
            class="w-full min-h-[44px] px-3.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900"
          />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            @if (config().conPrograma) {
              <select
                aria-label="Programa"
                [ngModel]="idPrograma()"
                (ngModelChange)="onPrograma($event)"
                class="min-h-[44px] px-3.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800"
              >
                <option value="">Todos los programas</option>
                @for (p of programas(); track p.id) {
                  <option [value]="p.id">{{ p.nombre }}</option>
                }
              </select>
            }
            @if (config().conEstado) {
              <select
                aria-label="Estado"
                [ngModel]="estado()"
                (ngModelChange)="onEstado($event)"
                class="min-h-[44px] px-3.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="ACTIVO">Activos</option>
                <option value="INACTIVO">Inactivos</option>
              </select>
            } @else if (!config().conPrograma) {
              <p class="text-xs text-warm-500 self-center">Este directorio solo se filtra por texto.</p>
            }
          </div>
        </app-filtros-plegables>

        @if (listado.error() && !listado.cargando()) {
          <app-error-carga [error]="listado.error()!" (reintentar)="listado.reintentar()" />
        } @else if (listado.filas().length === 0 && !listado.cargando()) {
          <p class="text-sm text-warm-500 text-center py-6">{{ config().vacio }}</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                  @for (columna of config().columnas; track columna) {
                    <th scope="col" class="py-2 pr-3">{{ columna }}</th>
                  }
                  @if (config().conEstado) {
                    <th scope="col" class="py-2 pr-3">Estado</th>
                  }
                  <th scope="col" class="py-2 text-right"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (fila of listado.filas(); track fila.id) {
                  <tr class="border-b border-warm-50" [class.bg-primary-50]="ficha()?.idEstudiante === fila.id" [attr.data-testid]="'fila-' + fila.id">
                    @for (celda of fila.celdas; track $index) {
                      <td class="py-2 pr-3 align-top">
                        <span [class]="celda.mono ? 'font-mono text-xs text-warm-600' : $index === 0 ? 'font-semibold text-warm-900 block' : 'text-warm-700'">{{ celda.texto }}</span>
                        @if (celda.detalle) {
                          <span class="text-xs text-warm-500 block">{{ celda.detalle }}</span>
                        }
                      </td>
                    }
                    @if (config().conEstado) {
                      <td class="py-2 pr-3 align-top">
                        @if (fila.estado; as e) {
                          <app-badge [variant]="e.variante">{{ e.texto }}</app-badge>
                        }
                        @if (fila.sinVinculo) {
                          <span class="ml-1 inline-block" data-testid="sin-vinculo"><app-badge variant="warning">Sin vínculo activo</app-badge></span>
                        }
                      </td>
                    }
                    <td class="py-2 text-right align-top whitespace-nowrap">
                      @if (fila.accion === 'ficha') {
                        <button type="button" class="min-h-[44px] px-2 text-xs font-semibold text-primary-700 hover:underline" (click)="verFicha(fila.id)">Ver ficha</button>
                      } @else if (fila.accion === 'sesiones') {
                        <button type="button" class="min-h-[44px] px-2 text-xs font-semibold text-primary-700 hover:underline" (click)="verSesiones(fila.id)">Ver sesiones →</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <app-pagination
          [totalItems]="listado.total()"
          [totalPages]="listado.totalPaginas()"
          [pageSize]="listado.tamano()"
          [currentPage]="listado.pagina()"
          (pageChange)="listado.irAPagina($event)"
          (pageSizeChange)="listado.cambiarTamano($event)"
        ></app-pagination>
      </section>

      @if (ficha(); as f) {
        <section
          #fichaPanel
          tabindex="-1"
          role="region"
          aria-label="Ficha del estudiante"
          class="bg-white p-4 sm:p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4 outline-none focus:ring-2 focus:ring-primary-500/30"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="font-serif font-bold text-lg text-warm-900">{{ f.nombreCompleto }}</h2>
              <p class="text-xs text-warm-500">Documento {{ f.numeroIdentificacion || '—' }} · {{ f.matriculas.length }} matrículas</p>
            </div>
            <button type="button" class="min-h-[44px] px-2 text-xs font-semibold text-warm-600 hover:underline" (click)="cerrarFicha()">Cerrar</button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                  <th scope="col" class="py-2 pr-3">Programa</th>
                  <th scope="col" class="py-2 pr-3">Plan</th>
                  <th scope="col" class="py-2 pr-3">Asignatura</th>
                  <th scope="col" class="py-2">Grupo</th>
                </tr>
              </thead>
              <tbody>
                @for (m of f.matriculas; track m.idGrupo) {
                  <tr class="border-b border-warm-50">
                    <td class="py-2 pr-3 text-warm-900">{{ m.nombrePrograma }}</td>
                    <td class="py-2 pr-3 font-mono text-xs text-warm-600">{{ m.inpPlanEstudio ?? '—' }}</td>
                    <td class="py-2 pr-3 text-warm-700">{{ m.nombreAsignatura }}</td>
                    <td class="py-2 text-warm-700">{{ m.nombreGrupo }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (historial(); as h) {
            <div class="pt-4 border-t border-warm-100 space-y-3">
              <h3 class="font-serif font-bold text-base text-warm-900">Historial completo</h3>
              <app-historial-estudiante [ficha]="h" />
            </div>
          }
        </section>
      }
    </div>
  `
})
export class DeanDirectorioComponent implements OnInit, OnChanges {
  private readonly consultas = inject(ConsultasTransversalesService);
  private readonly facultad = inject(DeanFacultadService);
  private readonly cursos = inject(CourseService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Parámetro `:entidad` de la ruta (enlazado por el router); un valor desconocido cae en docentes. */
  readonly entidad = input<string | undefined>(undefined);
  readonly entidades = ENTIDADES_DIRECTORIO;
  readonly entidadActiva = computed(() => entidadValida(this.entidad()));
  readonly config = computed(() => CONFIGURACION[this.entidadActiva()]);

  readonly busqueda = signal('');
  readonly estado = signal<FiltroEstado>('TODOS');
  readonly idPrograma = signal('');
  readonly programas = signal<OpcionPrograma[]>([]);
  /** Filtros aplicados sin contar la búsqueda (la que siempre está visible). */
  readonly filtrosActivos = computed(
    () =>
      (this.config().conEstado && this.estado() !== 'TODOS' ? 1 : 0) +
      (this.config().conPrograma && this.idPrograma() !== '' ? 1 : 0)
  );

  readonly ficha = signal<FichaEstudianteFacultad | null>(null);
  readonly historial = signal<FichaUnificadaEstudiante | null>(null);
  private readonly fichaPanel = viewChild<ElementRef<HTMLElement>>('fichaPanel');

  /** Grupos de la facultad: el backend los entrega completos, así que se leen una vez y se pagina en el cliente. */
  private gruposCache: Course[] | null = null;

  readonly listado = new ListadoPaginado<FilaDirectorio>(
    (pagina, tamano) => this.consultar(pagina, tamano),
    (mensaje) => this.toast.error(mensaje)
  );

  /** Entidad ya consultada: evita repetir la carga si la URL cambia a otro valor que normaliza a la misma. */
  private entidadCargada: EntidadDirectorio | null = null;

  ngOnInit(): void {
    this.sincronizarEntidad();
  }

  /** Al cambiar la entidad (URL) se limpian filtros y ficha y se consulta la nueva fuente desde la página 1. */
  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['entidad']) this.sincronizarEntidad();
  }

  private sincronizarEntidad(): void {
    const entidad = this.entidadActiva();
    if (entidad === this.entidadCargada) return;
    this.entidadCargada = entidad;
    this.alCambiarEntidad();
  }

  buscar(): void {
    this.listado.buscar();
  }

  onBusqueda(valor: string): void {
    this.busqueda.set(valor);
  }

  onEstado(estado: FiltroEstado): void {
    this.estado.set(estado);
    this.listado.buscar();
  }

  onPrograma(idPrograma: string): void {
    this.idPrograma.set(idPrograma);
    this.listado.buscar();
  }

  verSesiones(idGrupo: string): void {
    void this.router.navigate(['/app/decano/grupos', idGrupo]);
  }

  verFicha(idEstudiante: string): void {
    this.facultad.getFichaEstudiante(idEstudiante).subscribe({
      next: (res) => {
        this.ficha.set(res.datos ?? null);
        this.enfocarFicha();
        this.cargarHistorial(idEstudiante);
      },
      error: (error: unknown) => {
        this.ficha.set(null);
        this.toast.error(getApiErrorMessage(error));
      },
    });
  }

  cerrarFicha(): void {
    this.ficha.set(null);
    this.historial.set(null);
  }

  private alCambiarEntidad(): void {
    this.busqueda.set('');
    this.estado.set('TODOS');
    this.idPrograma.set('');
    this.cerrarFicha();
    if (this.entidadActiva() === 'docentes' && this.programas().length === 0) this.cargarProgramas();
    this.listado.pagina.set(1);
    this.listado.cargar();
  }

  private consultar(pagina: number, tamano: number): Observable<ApiPageResponse<FilaDirectorio>> {
    const entidad = this.entidadActiva();
    const texto = this.busqueda();
    const estaActivo = estadoComoFiltro(this.estado());
    if (entidad === 'docentes') {
      return this.consultas
        .getDocentesFacultad({ busqueda: texto, idPrograma: this.idPrograma() || null, estaActivo, pagina, tamano })
        .pipe(map((res) => this.mapear(res, pagina, tamano, (d) => ({
          id: d.idDocente,
          celdas: [
            { texto: d.nombreCompleto, detalle: d.correo || '—' },
            { texto: d.numeroIdentificacion || '—', mono: true },
            { texto: d.programas || '—' },
            { texto: String(d.totalGrupos) },
          ],
          estado: { texto: d.activo ? 'Activo' : 'Inactivo', variante: d.activo ? 'success' : 'neutral' },
          sinVinculo: d.tieneVinculoActivo === false,
        }))));
    }
    if (entidad === 'estudiantes') {
      return this.facultad.getEstudiantes({ busqueda: texto, estaActivo, pagina, tamano }).pipe(
        map((res) => this.mapear(res, pagina, tamano, (e) => ({
          id: e.idEstudiante,
          celdas: [
            { texto: e.nombreCompleto, detalle: e.correo || '—' },
            { texto: e.numeroIdentificacion || '—', mono: true },
            { texto: e.programas || '—' },
            { texto: String(e.totalGrupos ?? 0) },
          ],
          estado: { texto: e.activo ? 'Activo' : 'Inactivo', variante: e.activo ? 'success' : 'neutral' },
          accion: 'ficha',
        })))
      );
    }
    if (entidad === 'asignaturas') {
      return this.consultas.buscarAsignaturas({ busqueda: texto, idFacultad: null, estaActiva: estaActivo, pagina, tamano }, false).pipe(
        map((res) => this.mapear(res, pagina, tamano, (a) => ({
          id: a.idAsignatura,
          celdas: [
            { texto: a.nombre, detalle: a.codigo },
            { texto: a.creditos != null ? String(a.creditos) : '—' },
            { texto: a.planes || 'Sin plan', detalle: `${a.totalPlanes} ${a.totalPlanes === 1 ? 'plan' : 'planes'}` },
            { texto: `${a.nombreArea || '—'} · ${a.nombreComponente || '—'}` },
          ],
          estado: { texto: a.activa ? 'Activa' : 'Inactiva', variante: a.activa ? 'success' : 'neutral' },
        })))
      );
    }
    return this.gruposFiltrados(texto).pipe(
      map((todos) => {
        const inicio = (pagina - 1) * tamano;
        return {
          elementos: todos.slice(inicio, inicio + tamano).map((c): FilaDirectorio => this.filaGrupo(c)),
          exitoso: true,
          numeroPagina: pagina,
          tamanoPagina: tamano,
          totalElementos: todos.length,
          totalPaginas: Math.max(1, Math.ceil(todos.length / tamano)),
        };
      })
    );
  }

  /** Respuesta de página con sus elementos ya convertidos a filas (la forma de página la conserva ListadoPaginado). */
  private mapear<T>(res: PaginaOLista<T>, numeroPagina: number, tamanoPagina: number, aFila: (item: T) => FilaDirectorio): ApiPageResponse<FilaDirectorio> {
    const origen = res;
    const elementos = origen.elementos ?? origen.datos ?? [];
    const totalElementos = Number(origen.totalElementos ?? origen.total ?? elementos.length);
    return {
      exitoso: true,
      elementos: elementos.map(aFila),
      numeroPagina,
      tamanoPagina,
      totalElementos,
      totalPaginas: origen.totalPaginas ?? Math.max(1, Math.ceil(totalElementos / tamanoPagina)),
    };
  }

  private gruposFiltrados(texto: string): Observable<Course[]> {
    const filtrar = (cursos: Course[]) => {
      const q = texto.toLowerCase().trim();
      if (!q) return cursos;
      return cursos.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.code ?? '').toLowerCase().includes(q) || (c.room ?? '').toLowerCase().includes(q)
      );
    };
    if (this.gruposCache) return of(filtrar(this.gruposCache));
    return this.cursos.getDeanCourses().pipe(
      tap((res) => (this.gruposCache = res.datos ?? [])),
      map((res) => filtrar(res.datos ?? []))
    );
  }

  private filaGrupo(c: Course): FilaDirectorio {
    const conCupo = typeof c.cupoMaximo === 'number' && c.cupoMaximo > 0;
    return {
      id: c.id,
      celdas: [
        { texto: c.name, detalle: `${c.code} • ${c.section}` },
        { texto: c.schedule },
        { texto: conCupo ? `${c.enrolledStudentsCount ?? 0} / ${c.cupoMaximo}` : `${c.enrolledStudentsCount ?? 0}`, detalle: conCupo ? null : 'Sin cupo definido' },
        { texto: c.programas?.join(', ') || '—' },
      ],
      estado: null,
      accion: 'sesiones',
    };
  }

  private cargarProgramas(): void {
    this.facultad.getEstructura().subscribe({
      next: (res) =>
        this.programas.set((res.datos ?? []).flatMap((f) => f.programas.map((p) => ({ id: p.id, nombre: p.nombre })))),
      error: () => this.programas.set([]),
    });
  }

  /** UX-11: la ficha se abre bajo la tabla; se desplaza hasta ella y se enfoca para lectores de pantalla. */
  private enfocarFicha(): void {
    setTimeout(() => {
      const panel = this.fichaPanel()?.nativeElement;
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        panel.focus({ preventScroll: true });
      }
    });
  }

  /** HU157: el historial es complementario; si falla, la ficha sigue visible y se informa el error. */
  private cargarHistorial(idEstudiante: string): void {
    this.historial.set(null);
    this.consultas.getHistorialEstudiante(idEstudiante).subscribe({
      next: (res) => this.historial.set(res.datos ?? null),
      error: (error: unknown) => this.toast.error(getApiErrorMessage(error)),
    });
  }
}
