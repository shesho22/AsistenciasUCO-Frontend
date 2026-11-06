import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { Course } from '../../../../core/models/course.model';

@Component({
  selector: 'app-student-course-enroll-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ButtonComponent, FormFieldComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
        <button
          type="button"
          (click)="back.emit()"
          class="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-warm-700 hover:text-warm-950 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
        >
          <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a Mis Materias
        </button>

        <span class="text-xs font-bold text-primary-800 bg-primary-50 border border-primary-200 px-3 py-1 rounded-full">
          Trámite de Matrícula
        </span>
      </div>

      <div class="bg-white p-6 sm:p-8 rounded-2xl border border-warm-200 shadow-warm-sm max-w-2xl mx-auto space-y-6">
        <div>
          <h2 class="font-serif font-bold text-2xl text-warm-900">
            Solicitud de Inscripción a Asignatura
          </h2>
          <p class="text-sm text-warm-600 mt-1">
            Selecciona el grupo ofertado en el que deseas solicitar cupo y escribe el motivo correspondiente para evaluación de Coordinación.
          </p>
        </div>

        <div class="space-y-4">
          <app-form-field label="Asignatura y Grupo a Solicitar" [required]="true">
            <select
              [ngModel]="cursoId()"
              (ngModelChange)="cursoId.set($event)"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm font-semibold text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Selecciona una asignatura disponible...</option>
              @for (c of cursos(); track c.id) {
                <option [value]="c.id">
                  {{ c.code }} — {{ c.name }} ({{ c.section }}) • {{ c.schedule }}
                </option>
              }
            </select>
          </app-form-field>

          <app-form-field label="Motivo y justificación de la solicitud" [required]="true">
            <textarea
              [ngModel]="motivo()"
              (ngModelChange)="motivo.set($event)"
              rows="5"
              placeholder="Explica los motivos de tu solicitud (ejemplo: cruce de horario con otra asignatura, nivelación académica, adelanto de créditos)..."
              class="w-full p-3.5 bg-warm-50 border border-warm-200 rounded-xl text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            ></textarea>
          </app-form-field>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-warm-100">
          <app-button variant="secondary" size="md" (clicked)="back.emit()">
            Cancelar
          </app-button>
          <app-button
            variant="primary"
            size="md"
            [disabled]="!cursoId() || !motivo().trim() || submitting()"
            (clicked)="onSubmit()"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Enviar Solicitud
          </app-button>
        </div>
      </div>
    </div>
  `,
})
export class StudentCourseEnrollFormComponent {
  cursos = input<Course[]>([]);
  submitting = input<boolean>(false);

  cursoId = signal<string>('');
  motivo = signal<string>('');

  back = output<void>();
  submitted = output<{ cursoId: string; motivo: string }>();

  onSubmit(): void {
    if (!this.cursoId() || !this.motivo().trim()) return;
    this.submitted.emit({
      cursoId: this.cursoId(),
      motivo: this.motivo().trim(),
    });
  }
}
