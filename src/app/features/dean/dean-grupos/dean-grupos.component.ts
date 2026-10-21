import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { Course } from '../../../core/models/course.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-dean-grupos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, FormsModule, BadgeComponent, PaginationComponent],
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
            <span class="text-xs font-medium text-warm-500">Supervisión de Grupos y Aforos</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
            Grupos Académicos de la Facultad
          </h1>
          <p class="text-sm text-warm-600 mt-1">
            Supervisa los grupos activos, horarios, aulas asignadas, cupos ofertados y sesiones registradas.
          </p>
        </div>

        <div class="flex items-center gap-2.5">
          <button
            type="button"
            (click)="volverAFacultad()"
            class="px-3.5 py-2 rounded-xl bg-warm-50 hover:bg-warm-100 text-xs font-semibold text-warm-700 border border-warm-200 transition-colors"
          >
            ← Resumen de Facultad
          </button>
          <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">
            {{ courses().length }} Grupos
          </span>
        </div>
      </div>

      <!-- Métricas Bento -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="p-4 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <span class="text-xs text-warm-500 font-medium">Grupos en Facultad</span>
            <p class="text-2xl font-serif font-bold text-warm-900">{{ courses().length }}</p>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-accent-100 text-accent-800 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <span class="text-xs text-warm-500 font-medium">Estudiantes en Formación</span>
            <p class="text-2xl font-serif font-bold text-warm-900">{{ totalEstudiantes() }}</p>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span class="text-xs text-warm-500 font-medium">Cupo Total Ofertado</span>
            <p class="text-2xl font-serif font-bold text-emerald-700">{{ totalCupos() }} cupos</p>
          </div>
        </div>
      </div>

      <!-- Buscador Reactivo de Grupos -->
      <div class="relative">
        <input
          type="text"
          [ngModel]="filtroTexto()"
          (ngModelChange)="onFiltroChange($event)"
          placeholder="Filtrar por código de materia, nombre o aula..."
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
        <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- Tabla de Grupos -->
      @if (paginatedCourses().length === 0) {
        <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm">
          <p class="text-sm text-warm-500">No se encontraron grupos que coincidan con el filtro.</p>
        </div>
      } @else {
        <div class="bg-white rounded-2xl border border-warm-200 shadow-warm-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-warm-50 border-b border-warm-200 text-xs font-bold text-warm-600 uppercase tracking-wider">
                <tr>
                  <th class="px-5 py-3.5">Asignatura & Grupo</th>
                  <th class="px-5 py-3.5">Modalidad</th>
                  <th class="px-5 py-3.5">Horario & Aula</th>
                  <th class="px-5 py-3.5 text-center">Inscritos / Aforo</th>
                  <th class="px-5 py-3.5 text-center">Estado</th>
                  <th class="px-5 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-warm-100">
                @for (c of paginatedCourses(); track c.id) {
                  <tr class="hover:bg-warm-50/70 transition-colors">
                    <td class="px-5 py-4">
                      <div class="font-bold text-warm-900">{{ c.name }}</div>
                      <div class="text-xs text-warm-500 font-mono">{{ c.code }} • {{ c.section }}</div>
                    </td>
                    <td class="px-5 py-4">
                      <div class="text-xs text-warm-600">Cátedra Institucional</div>
                    </td>
                    <td class="px-5 py-4">
                      <div class="text-xs font-semibold text-warm-800">{{ c.schedule }}</div>
                      <div class="text-[11px] text-warm-500">Aula: {{ c.room || 'Por definir' }}</div>
                    </td>
                    <td class="px-5 py-4 text-center">
                      <span class="font-bold text-warm-900 text-xs">
                        {{ c.enrolledStudentsCount }} / {{ c.cupoMaximo || 30 }}
                      </span>
                      <div class="w-20 bg-warm-200 rounded-full h-1.5 mx-auto mt-1 overflow-hidden">
                        <div
                          class="bg-primary-700 h-1.5 rounded-full"
                          [style.width.%]="((c.enrolledStudentsCount ?? 0) / (c.cupoMaximo || 30)) * 100"
                        ></div>
                      </div>
                    </td>
                    <td class="px-5 py-4 text-center">
                      <app-badge variant="success" size="sm">Habilitado</app-badge>
                    </td>
                    <td class="px-5 py-4 text-right">
                      <button
                        type="button"
                        (click)="abrirDetalleGrupo(c)"
                        class="px-3 py-1.5 text-xs font-bold text-primary-800 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        Ver Sesiones →
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <app-pagination
          [totalItems]="filteredCourses().length"
          [pageSize]="pageSize()"
          [currentPage]="currentPage()"
          (pageChange)="currentPage.set($event)"
          (pageSizeChange)="onPageSizeChange($event)"
        />
      }
    </div>
  `,
})
export class DeanGruposComponent implements OnInit {
  private courseService = inject(CourseService);
  private router = inject(Router);

  courses = signal<Course[]>([]);
  filtroTexto = signal('');
  currentPage = signal(1);
  pageSize = signal(6);

  filteredCourses = computed(() => {
    const q = this.filtroTexto().toLowerCase().trim();
    if (!q) return this.courses();
    return this.courses().filter(
      (c: Course) =>
        c.name.toLowerCase().includes(q) ||
        (c.code ?? '').toLowerCase().includes(q) ||
        (c.room && c.room.toLowerCase().includes(q))
    );
  });

  paginatedCourses = computed(() => {
    const items = this.filteredCourses();
    const start = (this.currentPage() - 1) * this.pageSize();
    return items.slice(start, start + this.pageSize());
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
  }

  onFiltroChange(valor: string): void {
    this.filtroTexto.set(valor);
    this.currentPage.set(1);
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize.set(newSize);
    this.currentPage.set(1);
  }

  abrirDetalleGrupo(curso: Course): void {
    void this.router.navigate(['/app/decano/grupos', curso.id]);
  }

  volverAFacultad(): void {
    void this.router.navigate(['/app/decano/facultad']);
  }
}
