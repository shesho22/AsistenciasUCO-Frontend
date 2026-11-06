import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Course } from '../../../../core/models/course.model';

@Component({
  selector: 'app-teacher-grupo-estudiantes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-b-2xl border-x border-b border-warm-200 shadow-warm-sm p-6 space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-warm-100">
        <div>
          <h3 class="font-serif font-bold text-lg text-warm-900">Padrón de Estudiantes Matriculados</h3>
          <p class="text-xs text-warm-500">Listado oficial de estudiantes con asistencia habilitada para este grupo.</p>
        </div>
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
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
          @for (est of estudiantes(); track est.idEstudiante || est.studentId || est.id) {
            <div class="p-3.5 rounded-xl bg-warm-50 border border-warm-200 flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="font-bold text-xs text-warm-900 truncate">
                  {{ est.nombreCompleto || est.studentName || est.nombres + ' ' + est.apellidos }}
                </p>
                <p class="text-[11px] font-mono text-warm-500">
                  Doc / ID: {{ est.documento || est.studentCode || est.numeroIdentificacion || 'N/A' }}
                </p>
              </div>
              <div class="flex flex-col items-end gap-1.5 shrink-0">
                @if (esActivo(est)) {
                  <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">Activo</span>
                  <button
                    type="button"
                    data-accion="retirar"
                    (click)="retirar.emit(est)"
                    class="px-2 py-0.5 text-[10px] font-semibold rounded-lg text-red-700 bg-red-50 hover:bg-red-100 border border-red-200"
                  >
                    Retirar
                  </button>
                } @else {
                  <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-warm-200 text-warm-700">
                    {{ est.nombreEstado || 'Inactivo' }}
                  </span>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TeacherGrupoEstudiantesComponent {
  estudiantes = input<any[]>([]);
  cargando = input<boolean>(false);
  curso = input<Course | null>(null);

  /** HU051: el docente pide retirar a un estudiante activo (el padre abre el modal con el motivo). */
  readonly retirar = output<any>();

  /** Sin `codigoEstado` (forma heredada) se trata como activo; con él, solo 'A' es una matrícula activa. */
  esActivo(est: any): boolean {
    return !est?.codigoEstado || est.codigoEstado === 'A';
  }
}
