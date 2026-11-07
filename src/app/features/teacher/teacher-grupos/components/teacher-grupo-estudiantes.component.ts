import { Component, ChangeDetectionStrategy, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Course } from '../../../../core/models/course.model';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { EstudianteGrupoItem } from '../../../../core/models/estudiante-grupo-item.model';

@Component({
  selector: 'app-teacher-grupo-estudiantes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PaginationComponent],
  template: `
    <div class="bg-white rounded-b-2xl border-x border-b border-warm-200 shadow-warm-sm p-6 space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-warm-100">
        <div>
          <h3 class="font-serif font-bold text-lg text-warm-900">Padrón de Estudiantes Matriculados</h3>
          <p class="text-xs text-warm-500">Listado oficial de estudiantes con asistencia habilitada para este grupo.</p>
        </div>
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-success-100 text-success-800 border border-success-200">
          {{ estudiantes().length }} de {{ curso()?.cupoMaximo ?? '—' }} Cupos
        </span>
      </div>

      @if (cargando()) {
        <div class="p-6 space-y-3">
          @for (n of [1, 2, 3]; track n) {
            <div class="h-12 bg-warm-100 rounded-xl animate-pulse"></div>
          }
        </div>
      } @else if (estudiantes().length === 0) {
        <div class="p-12 text-center text-warm-400">
          <p class="text-sm">No hay estudiantes matriculados en este grupo actualmente.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          @for (est of estudiantesPagina(); track est.idEstudiante || est.studentId || est.id) {
            <div data-testid="padron-fila" class="p-3.5 rounded-xl bg-warm-50 border border-warm-200 flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="font-bold text-xs text-warm-900 truncate">
                  {{ est.nombreCompleto || est.studentName || est.nombres + ' ' + est.apellidos }}
                </p>
                <p class="text-xs font-mono text-warm-500">
                  Doc / ID: {{ est.documento || est.studentCode || est.numeroIdentificacion || 'N/A' }}
                </p>
              </div>
              <div class="flex flex-col items-end gap-1.5 shrink-0">
                @if (esActivo(est)) {
                  <span class="px-2 py-0.5 text-xs font-bold rounded-full bg-success-100 text-success-800">Activo</span>
                  <button
                    type="button"
                    data-accion="retirar"
                    (click)="retirar.emit(est)"
                    class="px-3 py-2 min-h-[44px] text-xs font-semibold rounded-lg text-danger-700 bg-danger-50 hover:bg-danger-100 border border-danger-200"
                  >
                    Retirar
                  </button>
                } @else {
                  <span class="px-2 py-0.5 text-xs font-bold rounded-full bg-warm-200 text-warm-700">
                    {{ est.nombreEstado || 'Inactivo' }}
                  </span>
                }
              </div>
            </div>
          }
        </div>
        <app-pagination
          [totalItems]="estudiantes().length"
          [pageSize]="tamano()"
          [currentPage]="paginaEfectiva()"
          [pageSizeOptions]="[12, 24, 48]"
          (pageChange)="pagina.set($event)"
          (pageSizeChange)="cambiarTamano($event)"
        />
      }
    </div>
  `,
})
export class TeacherGrupoEstudiantesComponent {
  estudiantes = input<EstudianteGrupoItem[]>([]);
  cargando = input<boolean>(false);
  readonly pagina = signal(1);
  readonly tamano = signal(12);
  readonly paginaEfectiva = computed(() =>
    Math.min(this.pagina(), Math.max(1, Math.ceil(this.estudiantes().length / this.tamano())))
  );
  /** F-DOC-007: el padron se pinta por paginas, no completo. */
  readonly estudiantesPagina = computed(() => {
    const inicio = (this.paginaEfectiva() - 1) * this.tamano();
    return this.estudiantes().slice(inicio, inicio + this.tamano());
  });

  cambiarTamano(tamano: number): void {
    this.tamano.set(tamano);
    this.pagina.set(1);
  }

  curso = input<Course | null>(null);

  /** HU051: el docente pide retirar a un estudiante activo (el padre abre el modal con el motivo). */
  readonly retirar = output<EstudianteGrupoItem>();

  /** Sin `codigoEstado` (forma heredada) se trata como activo; con él, solo 'A' es una matrícula activa. */
  esActivo(est: EstudianteGrupoItem): boolean {
    return !est?.codigoEstado || est.codigoEstado === 'A';
  }
}
