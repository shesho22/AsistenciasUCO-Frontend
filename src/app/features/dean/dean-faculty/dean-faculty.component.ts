import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { SessionService } from '../../../core/services/session.service';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { Course } from '../../../core/models/course.model';
import { ClassSession } from '../../../core/models/attendance.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';

@Component({
  selector: 'app-dean-faculty',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, BadgeComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Header Bento -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-100 text-accent-900 border border-accent-200">
              Decanatura Institucional
            </span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Resumen Ejecutivo de la Facultad</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
            {{ nombreFacultad() }}
          </h1>
          <p class="text-sm text-warm-600 mt-1">
            Vista general de indicadores académicos, ficha institucional y accesos directos a los módulos de supervisión.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <span class="px-3.5 py-1.5 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200 font-mono">
            {{ codigoFacultad() }}
          </span>
          <app-badge variant="success" size="sm">
            {{ estadoFacultad() }}
          </app-badge>
        </div>
      </div>

      <!-- KPIs Bento Globales -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-5 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Grupos en Facultad</span>
            <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ courses().length }}</p>
            <span class="text-[11px] text-warm-500">{{ totalEstudiantes() }} inscritos / {{ totalCupos() }} cupos</span>
          </div>
          <div class="w-11 h-11 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>

        <div class="p-5 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Planes de Estudio</span>
            <p class="text-2xl font-serif font-bold text-primary-800 mt-1">{{ planes().length }}</p>
            <span class="text-[11px] text-warm-500">Mallas curriculares adscritas</span>
          </div>
          <div class="w-11 h-11 rounded-xl bg-accent-100 text-accent-800 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>

        <div class="p-5 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Áreas de Conocimiento</span>
            <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ areas().length }}</p>
            <span class="text-[11px] text-warm-500">Departamentos y núcleos</span>
          </div>
          <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        <div class="p-5 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Sedes y Espacios</span>
            <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ sedes().length }} sedes</p>
            <span class="text-[11px] text-warm-500">{{ espacios().length }} aulas y laboratorios</span>
          </div>
          <div class="w-11 h-11 rounded-xl bg-warm-100 text-warm-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Ficha Institucional de la Facultad -->
      <div class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="space-y-2">
          <span class="text-[10px] uppercase font-bold text-warm-400">Unidad Académica Mayor</span>
          <h2 class="font-serif font-bold text-xl text-warm-900">
            {{ nombreFacultad() }}
          </h2>
          <p class="text-xs text-warm-600 leading-relaxed">
            Supervisión integral de docencia, planes curriculares, grupos ofertados, periodos lectivos y capacidad física instalada de la facultad.
          </p>
        </div>

        <div class="space-y-3 bg-warm-50 p-4 rounded-xl border border-warm-100 text-xs">
          <div class="flex justify-between pb-1.5 border-b border-warm-200/60">
            <span class="text-warm-500">Decano(a) Responsable:</span>
            <span class="font-bold text-warm-900">{{ decanoResponsable() }}</span>
          </div>
          <div class="flex justify-between pb-1.5 border-b border-warm-200/60">
            <span class="text-warm-500">Sede Principal:</span>
            <span class="font-semibold text-warm-800">{{ sedePrincipalNombre() }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-warm-500">Período en Curso:</span>
            <span class="font-bold text-primary-800">{{ periodoActualCodigo() }}</span>
          </div>
        </div>

        <div class="space-y-3 bg-warm-50 p-4 rounded-xl border border-warm-100 text-xs">
          <div class="flex justify-between pb-1.5 border-b border-warm-200/60">
            <span class="text-warm-500">Total Áreas Temáticas:</span>
            <span class="font-bold text-warm-900">{{ areas().length }}</span>
          </div>
          <div class="flex justify-between pb-1.5 border-b border-warm-200/60">
            <span class="text-warm-500">Total Espacios Físicos:</span>
            <span class="font-bold text-warm-900">{{ espacios().length }} aulas/labs</span>
          </div>
          <div class="flex justify-between">
            <span class="text-warm-500">Estado de Facultad:</span>
            <span class="text-xs font-bold text-emerald-700">{{ estadoFacultad() }}</span>
          </div>
        </div>
      </div>

      <!-- Tarjetas de Navegación por Dominio -->
      <div>
        <div class="mb-3">
          <h2 class="font-serif font-bold text-lg text-warm-900">Módulos de Supervisión de la Decanatura</h2>
          <p class="text-xs text-warm-500">Accede a cada vista especializada de la facultad sin recargar ni saturar el panel.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Grupos -->
          <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm hover:border-primary-300 transition-all flex flex-col justify-between gap-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary-50 text-primary-800">Grupos y Sesiones</span>
                <span class="text-xs font-mono font-bold text-warm-600">{{ courses().length }} grupos</span>
              </div>
              <h3 class="font-serif font-bold text-base text-warm-900">Grupos de la Facultad</h3>
              <p class="text-xs text-warm-600">
                Consulta los grupos activos, horarios, aulas asignadas, cupos y el cronograma detallado de sesiones.
              </p>
            </div>
            <button
              type="button"
              (click)="irARuta('/app/decano/grupos')"
              class="w-full py-2 px-3 bg-primary-50 hover:bg-primary-100 text-primary-900 rounded-xl text-xs font-bold border border-primary-200 transition-colors"
            >
              Ir a Grupos de la Facultad →
            </button>
          </div>

          <!-- Programas y Planes -->
          <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm hover:border-primary-300 transition-all flex flex-col justify-between gap-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold px-2.5 py-1 rounded-lg bg-accent-100 text-accent-900">Mallas Curriculares</span>
                <span class="text-xs font-mono font-bold text-warm-600">{{ planes().length }} planes</span>
              </div>
              <h3 class="font-serif font-bold text-base text-warm-900">Programas y Planes de Estudio</h3>
              <p class="text-xs text-warm-600">
                Explora los programas académicos adscritos y visualiza la malla curricular completa por semestre.
              </p>
            </div>
            <button
              type="button"
              (click)="irARuta('/app/decano/programas')"
              class="w-full py-2 px-3 bg-primary-50 hover:bg-primary-100 text-primary-900 rounded-xl text-xs font-bold border border-primary-200 transition-colors"
            >
              Ir a Programas y Planes →
            </button>
          </div>

          <!-- Períodos Académicos -->
          <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm hover:border-primary-300 transition-all flex flex-col justify-between gap-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800">Calendario</span>
                <span class="text-xs font-mono font-bold text-warm-600">{{ periodos().length }} períodos</span>
              </div>
              <h3 class="font-serif font-bold text-base text-warm-900">Períodos Académicos</h3>
              <p class="text-xs text-warm-600">
                Revisa las vigencias semestrales, fechas de inicio y cierre y el período lectivo actualmente activo.
              </p>
            </div>
            <button
              type="button"
              (click)="irARuta('/app/decano/periodos')"
              class="w-full py-2 px-3 bg-primary-50 hover:bg-primary-100 text-primary-900 rounded-xl text-xs font-bold border border-primary-200 transition-colors"
            >
              Ir a Períodos Académicos →
            </button>
          </div>

          <!-- Áreas y Sedes -->
          <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm hover:border-primary-300 transition-all flex flex-col justify-between gap-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold px-2.5 py-1 rounded-lg bg-warm-100 text-warm-800">Infraestructura</span>
                <span class="text-xs font-mono font-bold text-warm-600">{{ areas().length }} áreas • {{ sedes().length }} sedes</span>
              </div>
              <h3 class="font-serif font-bold text-base text-warm-900">Áreas de Conocimiento y Sedes</h3>
              <p class="text-xs text-warm-600">
                Consulta las áreas temáticas de la facultad, sus coordinadores de área y las sedes operativas.
              </p>
            </div>
            <button
              type="button"
              (click)="irARuta('/app/decano/infraestructura')"
              class="w-full py-2 px-3 bg-primary-50 hover:bg-primary-100 text-primary-900 rounded-xl text-xs font-bold border border-primary-200 transition-colors"
            >
              Ir a Áreas y Sedes →
            </button>
          </div>

          <!-- Coordinadores -->
          <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm hover:border-primary-300 transition-all flex flex-col justify-between gap-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold px-2.5 py-1 rounded-lg bg-accent-100 text-accent-900">Talento Humano</span>
                <span class="text-xs font-mono font-bold text-warm-600">Decanatura</span>
              </div>
              <h3 class="font-serif font-bold text-base text-warm-900">Gestión de Coordinadores</h3>
              <p class="text-xs text-warm-600">
                Administra y nombra los coordinadores de programa adscritos a la facultad.
              </p>
            </div>
            <button
              type="button"
              (click)="irARuta('/app/decano/coordinadores')"
              class="w-full py-2 px-3 bg-primary-50 hover:bg-primary-100 text-primary-900 rounded-xl text-xs font-bold border border-primary-200 transition-colors"
            >
              Ir a Coordinadores →
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DeanFacultyComponent implements OnInit {
  private courseService = inject(CourseService);
  private sessionService = inject(SessionService);
  private adminService = inject(AdminManagementService);
  private coordService = inject(CoordinatorManagementService);
  private router = inject(Router);

  private searchGroupSignal = signal('');
  get searchGroup(): string {
    return this.searchGroupSignal();
  }
  set searchGroup(value: string) {
    this.searchGroupSignal.set(value);
  }

  courses = signal<Course[]>([]);
  sedes = this.adminService.sedes;
  espacios = this.adminService.espacios;
  facultades = this.adminService.facultades;
  areas = this.adminService.areas;
  planes = this.coordService.planes;
  periodos = this.coordService.periodos;

  selectedCourse = signal<Course | null>(null);
  sessions = signal<ClassSession[]>([]);

  nombreFacultad = computed(() => {
    const lista = this.facultades();
    return lista.length > 0 ? lista[0].nombre : 'Facultad de Ingeniería';
  });

  codigoFacultad = computed(() => {
    const lista = this.facultades();
    return lista.length > 0 ? lista[0].codigo : 'FAC-ING';
  });

  estadoFacultad = computed(() => {
    const lista = this.facultades();
    return lista.length > 0 ? lista[0].estado : 'ACTIVO';
  });

  decanoResponsable = computed(() => {
    const lista = this.facultades();
    return lista.length > 0 && lista[0].decanoNombre ? lista[0].decanoNombre : 'Decanatura Titular';
  });

  sedePrincipalNombre = computed(() => {
    const lista = this.sedes();
    return lista.length > 0 ? lista[0].nombre : 'Campus Principal Rionegro';
  });

  periodoActualCodigo = computed(() => {
    const actual = this.periodos().find((p) => p.esActual || p.estado === 'ACTIVO');
    return actual ? actual.codigo : 'Vigente';
  });

  filteredCourses = computed(() => {
    const q = this.searchGroupSignal().toLowerCase().trim();
    if (!q) return this.courses();
    return this.courses().filter(
      (c: Course) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.room && c.room.toLowerCase().includes(q))
    );
  });

  totalEstudiantes = computed(() =>
    this.courses().reduce((sum: number, c: Course) => sum + (c.enrolledStudentsCount || 0), 0)
  );

  totalCupos = computed(() =>
    this.courses().reduce((sum: number, c: Course) => sum + (c.cupoMaximo || 30), 0)
  );

  ngOnInit(): void {
    this.courseService.getTeacherCourses().subscribe({
      next: (res) => this.courses.set(res.datos || []),
    });
    this.adminService.cargarSedes().subscribe();
    this.adminService.cargarEspacios().subscribe();
    this.adminService.cargarFacultades().subscribe();
    this.adminService.cargarAreas().subscribe();
    this.adminService.cargarParametros().subscribe();
    this.adminService.cargarAuditoria().subscribe();
  }

  abrirDetalleGrupo(curso: Course): void {
    this.selectedCourse.set(curso);
    this.sessionService.getSessionsByGroup(curso.id).subscribe({
      next: (res) => this.sessions.set(res.datos || []),
    });
    this.router.navigate(['/app/decano/grupos', curso.id]).catch(() => {});
  }

  irARuta(ruta: string): void {
    this.router.navigate([ruta]).catch(() => {});
  }
}
