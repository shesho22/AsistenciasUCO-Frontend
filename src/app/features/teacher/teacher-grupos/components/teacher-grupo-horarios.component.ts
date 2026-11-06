import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Course } from '../../../../core/models/course.model';

@Component({
  selector: 'app-teacher-grupo-horarios',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-b-2xl border-x border-b border-warm-200 shadow-warm-sm p-6 space-y-6">
      <div>
        <h3 class="font-serif font-bold text-lg text-warm-900">Distribución Horaria</h3>
        <p class="text-xs text-warm-500">Parámetros operativos de la franja lectiva semanal y ocupación del grupo.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div class="p-5 rounded-2xl bg-warm-50 border border-warm-200/80 space-y-2">
          <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Franja Semanal</span>
          <p class="text-xl font-bold text-warm-900">{{ curso()?.schedule }}</p>
          <p class="text-xs text-warm-600">Modalidad Presencial Obligatoria</p>
        </div>

        <div class="p-5 rounded-2xl bg-warm-50 border border-warm-200/80 space-y-2">
          <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Aforo y Capacidad</span>
          <p class="text-xl font-bold text-emerald-700">{{ curso()?.cupoMaximo ?? '—' }} Cupos Máximos</p>
          <p class="text-xs text-warm-600">Ocupación actual: {{ curso()?.enrolledStudentsCount || totalMatriculados() }} matriculados</p>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
        <svg class="w-5 h-5 text-blue-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="font-bold">Política Institucional de Horarios</p>
          <p class="mt-0.5 text-blue-800">
            Cualquier ajuste permanente en el bloque horario semanal requiere coordinación con la Dirección de Programa para evitar cruces con otros semestres.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class TeacherGrupoHorariosComponent {
  curso = input<Course | null>(null);
  totalMatriculados = input<number>(0);
}
