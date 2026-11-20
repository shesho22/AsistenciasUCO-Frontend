import { Component, ChangeDetectionStrategy, input, output, signal, computed, effect, untracked } from '@angular/core';

import { FormsModule } from '@angular/forms';
import {
  TablaDatosComponent,
  TAMANO_PAGINA_TABLA,
  paginarEnCliente,
} from '../../../../shared/components/tabla-datos/tabla-datos.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { Course } from '../../../../core/models/course.model';
import { CatalogoPrograma } from '../../../../core/models/programa-academico.model';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
    selector: 'app-teacher-grupos-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PageHeaderComponent, FormsModule, TablaDatosComponent, ButtonComponent, BadgeComponent, EmptyStateComponent],
    template: `
    <div class="space-y-4 animate-fade-in">
      <!-- Header Bento -->
      <app-page-header
        [enTarjeta]="true"
        etiqueta="Portal Docente & Oferta Horaria"
        contexto="Período Académico 2026-2"
        titulo="Gestión Integral de Grupos y Sesiones"
        descripcion="Crea tus grupos con su horario inicial (los cambios posteriores los aprueba el coordinador), programa sesiones y toma asistencia."
      >
        <div cabecera-acciones class="flex flex-wrap items-center gap-2.5">
          <app-button variant="secondary" size="md" (clicked)="irAsistencia.emit()">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Toma de Asistencia
          </app-button>
        </div>
      </app-page-header>

      <!-- Resumen de Métricas Bento -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="superficie p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <span class="text-xs text-warm-500 font-medium">Grupos Habilitados</span>
            <p class="text-2xl font-serif font-bold text-warm-900">{{ courses().length }}</p>
          </div>
        </div>

        <div class="superficie p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-accent-100 text-accent-800 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <span class="text-xs text-warm-500 font-medium">Estudiantes Registrados</span>
            <p class="text-2xl font-serif font-bold text-warm-900" data-testid="total-estudiantes">{{ totalEstudiantes() ?? '—' }}</p>
          </div>
        </div>
      </div>

      <!-- Decisiones por inasistencia pendientes: a qué grupo corresponde el número del menú y acceso directo -->
      @if (gruposConDecisiones().length > 0) {
        <section
          class="rounded-2xl border border-warning-300 bg-warning-50 p-4"
          aria-labelledby="titulo-decisiones-pendientes"
          data-testid="aviso-decisiones-pendientes"
        >
          <h2 id="titulo-decisiones-pendientes" class="text-sm font-bold text-warning-900">
            Tienes decisiones por inasistencia pendientes
          </h2>
          <p class="text-xs text-warning-800 mt-0.5">
            Estudiantes que llegaron al límite de inasistencia y esperan tu decisión. Entra al grupo para decidir.
          </p>
          <app-tabla-datos
            class="mt-3"
            etiqueta="Grupos con decisiones por inasistencia pendientes"
            [columnas]="3"
            anchoMinimo="26rem"
            alturaMaxima="18rem"
          >
            <thead>
              <tr>
                <th scope="col">Grupo</th>
                <th scope="col" class="text-right">Pendientes</th>
                <th scope="col"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (item of gruposConDecisiones(); track item.course.id) {
                <tr data-testid="aviso-decisiones-fila">
                  <td class="font-semibold text-warm-900">{{ item.course.name }} · {{ item.course.section }}</td>
                  <td class="text-right">
                    <span class="rounded-full bg-warning-500 px-2 py-0.5 text-xs font-bold text-black">{{ item.total }}</span>
                  </td>
                  <td class="text-right whitespace-nowrap">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-xl border border-warning-300 bg-white px-3 py-1 text-xs font-semibold text-warm-900 hover:border-warning-500 focus:outline-none focus:ring-2 focus:ring-warning-500/30"
                      [attr.data-testid]="'ir-decisiones-' + item.course.id"
                      [attr.aria-label]="'Decidir en ' + item.course.name + ' · ' + item.course.section"
                      (click)="verDecisiones.emit(item.course)"
                    >
                      Decidir →
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </app-tabla-datos>
        </section>
      }

      <!-- Barra de Búsqueda y filtro por nivel formativo (HU058) -->
      <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <input
          type="text"
          aria-label="Buscar grupo por nombre o código de asignatura"
          [ngModel]="searchQuery()"
          (ngModelChange)="searchQuery.set($event)"
          placeholder="Buscar grupo por nombre o código de asignatura..."
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-warm-sm transition-all"
        />
        <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      @if (tiposPrograma().length > 0) {
        <select
          aria-label="Nivel formativo"
          [ngModel]="nivelFormativo()"
          (ngModelChange)="nivelFormativo.set($event)"
          class="px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 shadow-warm-sm"
        >
          <option value="">Todos los niveles</option>
          @for (t of tiposPrograma(); track t.id) {
            <option [value]="t.id">{{ t.nombre }}</option>
          }
        </select>
      }
      </div>

      <!-- Tabla de Grupos -->
      @if (!isLoading() && filteredCourses().length === 0) {
        <div data-testid="grupos-vacio">
          @if (courses().length === 0) {
            <app-empty-state title="Aún no tienes grupos asignados" description="Cuando tengas grupos a tu cargo aparecerán aquí." />
          } @else {
            <app-empty-state
              variant="search"
              title="Ningún grupo coincide con tu búsqueda"
              description="Revisa el texto buscado o cambia el nivel formativo seleccionado."
            />
          }
        </div>
      } @else {
        <app-tabla-datos
          etiqueta="Mis grupos"
          [columnas]="5"
          anchoMinimo="54rem"
          [filasEsqueleto]="4"
          [cargando]="isLoading()"
          [paginada]="true"
          [totalItems]="filteredCourses().length"
          [pagina]="pagina()"
          [tamanoPagina]="tamanoPagina()"
          (paginaChange)="pagina.set($event)"
          (tamanoPaginaChange)="cambiarTamano($event)"
        >
          <thead>
            <tr>
              <th scope="col">Asignatura</th>
              <th scope="col">Código y grupo</th>
              <th scope="col">Horario</th>
              <th scope="col">Estudiantes</th>
              <th scope="col" class="text-right"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @if (!isLoading()) {
              @for (course of gruposPagina(); track course.id) {
                <tr data-testid="grupo-fila">
                  <td>
                    <button
                      type="button"
                      class="text-left font-serif font-bold text-base text-warm-900 leading-snug hover:text-primary-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 rounded"
                      [attr.aria-label]="'Ver grupo ' + course.name + ' · ' + course.section"
                      (click)="seleccionarGrupo.emit(course)"
                    >
                      {{ course.name }}
                    </button>
                    @if (course.nombreTipoPrograma) {
                      <span class="block text-xs font-semibold uppercase text-warm-500">{{ course.nombreTipoPrograma }}</span>
                    }
                  </td>
                  <td class="whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      @if (course.code) {
                        <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-warm-100 text-warm-800">{{ course.code }}</span>
                      }
                      <app-badge variant="neutral" size="sm">{{ course.section }}</app-badge>
                    </div>
                  </td>
                  <td class="text-xs text-warm-700 font-medium">{{ course.schedule || 'Sin horario asignado' }}</td>
                  <td class="whitespace-nowrap">
                    @if (course.enrolledStudentsCount === undefined) {
                      <!-- Total de estudiantes desconocido: no se muestra un conteo inventado -->
                      <span class="text-warm-400">—</span>
                    } @else if (course.cupoMaximo) {
                      <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-success-50 text-success-700 border border-success-200">
                        {{ course.enrolledStudentsCount }} / {{ course.cupoMaximo }} cupos
                      </span>
                    } @else {
                      <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-warm-100 text-warm-700 border border-warm-200">
                        {{ course.enrolledStudentsCount }} inscritos
                      </span>
                    }
                  </td>
                  <td class="text-right">
                    <div class="flex items-center justify-end gap-2">
                      @if (decisionesDe(course); as total) {
                        <button
                          type="button"
                          class="whitespace-nowrap text-xs font-bold px-2.5 py-0.5 rounded-full bg-warning-50 text-warning-800 border border-warning-300 hover:border-warning-500"
                          [attr.data-testid]="'decisiones-grupo-' + course.id"
                          [attr.aria-label]="total + (total === 1 ? ' decisión pendiente' : ' decisiones pendientes') + ' en ' + course.name + '. Abrir el grupo'"
                          (click)="verDecisiones.emit(course)"
                        >
                          {{ total }} {{ total === 1 ? 'decisión pendiente' : 'decisiones pendientes' }}
                        </button>
                      }
                      <app-button
                        variant="secondary"
                        size="sm"
                        class="whitespace-nowrap"
                        [attr.data-testid]="'ver-grupo-' + course.id"
                        (clicked)="seleccionarGrupo.emit(course)"
                      >
                        Ver Grupo →
                      </app-button>
                    </div>
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
export class TeacherGruposListComponent {
  courses = input<Course[]>([]);
  /** HU058: catálogo real de tipos de programa; sin opciones no se muestra el filtro. */
  tiposPrograma = input<CatalogoPrograma[]>([]);
  isLoading = input<boolean>(false);
  // OUT_OF_GOLDEN_PATH: QR de asistencia por sesión sin contrato backend; oculto salvo feature explícita.
  sessionQrEnabled = input<boolean>(false);

  irAsistencia = output<void>();
  seleccionarGrupo = output<Course>();
  matricular = output<Course>();
  proyectarQr = output<Course>();
  tomarAsistencia = output<Course>();
  /** Abre el grupo donde están las decisiones por inasistencia pendientes. */
  verDecisiones = output<Course>();
  /** Decisiones por inasistencia pendientes por id de grupo (las entrega el servidor; aquí solo se presentan). */
  decisionesPorGrupo = input<ReadonlyMap<string, number>>(new Map());

  /** Grupos con decisiones pendientes, en el orden de la lista de grupos. */
  gruposConDecisiones = computed(() =>
    this.courses()
      .map((course) => ({ course, total: this.decisionesPorGrupo().get(course.id) ?? 0 }))
      .filter((item) => item.total > 0)
  );

  decisionesDe(course: Course): number {
    return this.decisionesPorGrupo().get(course.id) ?? 0;
  }

  searchQuery = signal<string>('');
  nivelFormativo = signal<string>('');

  /**
   * CIERRE-W3I: estudiantes activos de los grupos habilitados del docente, calculados por el servidor
   * (GET /docente/resumen-grupos); `null` mientras no llega o si falla (se muestra «—», nunca un 0 inventado).
   */
  totalEstudiantes = input<number | null>(null);

  filteredCourses = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const nivel = this.nivelFormativo();
    const delNivel = nivel ? this.courses().filter((c) => c.idTipoPrograma === nivel) : this.courses();
    if (!q) return delNivel;
    return delNivel.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.code ?? '').toLowerCase().includes(q) ||
        c.section.toLowerCase().includes(q)
    );
  });

  /** Paginación en el cliente de la tabla de grupos (15 por defecto, 15/30/50). */
  readonly pagina = signal(1);
  readonly tamanoPagina = signal(TAMANO_PAGINA_TABLA);
  readonly gruposPagina = computed(() => paginarEnCliente(this.filteredCourses(), this.pagina(), this.tamanoPagina()));

  constructor() {
    // Al cambiar la búsqueda, el nivel formativo o la lista se vuelve a la primera página.
    effect(() => {
      this.filteredCourses();
      untracked(() => this.pagina.set(1));
    });
  }

  cambiarTamano(tamano: number): void {
    this.tamanoPagina.set(tamano);
    this.pagina.set(1);
  }

  getPorcentajeCupo(course: Course): number {
    // Sin cupo máximo informado no se inventa uno (antes 35): la barra queda en 0.
    const max = course.cupoMaximo;
    if (!max) return 0;
    const actuales = course.enrolledStudentsCount || 0;
    return Math.min(Math.round((actuales / max) * 100), 100);
  }
}
