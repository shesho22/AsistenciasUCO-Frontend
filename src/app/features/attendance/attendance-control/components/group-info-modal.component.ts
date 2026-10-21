import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { Course } from '../../../../core/models/course.model';

@Component({
  selector: 'app-group-info-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ModalComponent, ButtonComponent, BadgeComponent],
  template: `
    <app-modal
      [isOpen]="isOpen()"
      title="Información del Grupo & Alumnos"
      (closed)="closed.emit()"
    >
      <div class="space-y-5">
        <!-- Ficha Resumen del Grupo -->
        <div class="p-4 bg-warm-50 rounded-2xl border border-warm-200 space-y-2">
          <div class="flex items-center justify-between">
            @if (course()?.code) {
              <span class="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-primary-100 text-primary-900 border border-primary-200">
                {{ course()?.code }}
              </span>
            }
            <app-badge variant="neutral">{{ course()?.section }}</app-badge>
          </div>
          <h4 class="font-serif font-bold text-base text-warm-900 leading-snug">
            {{ course()?.name }}
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-warm-200/60 text-xs text-warm-600">
            <div>
              <span class="text-warm-400 block text-[10px] uppercase font-bold">Horario:</span>
              <span class="font-medium text-warm-800">{{ course()?.schedule }}</span>
            </div>
            <div>
              <span class="text-warm-400 block text-[10px] uppercase font-bold">Aula Asignada:</span>
              <span class="font-medium text-warm-800">{{ course()?.room }}</span>
            </div>
            <div>
              <span class="text-warm-400 block text-[10px] uppercase font-bold">Docente Titular:</span>
              <span class="font-medium text-warm-800">{{ course()?.docenteName }}</span>
            </div>
            <div>
              <span class="text-warm-400 block text-[10px] uppercase font-bold">Capacidad / Cupo:</span>
              @if (course()?.cupoMaximo) {
                <span class="font-bold text-emerald-800">{{ students().length }} / {{ course()?.cupoMaximo }} cupos</span>
              } @else {
                <span class="font-bold text-emerald-800">{{ students().length }} estudiantes inscritos</span>
              }
            </div>
          </div>
        </div>

        <!-- Lista de Alumnos Matriculados -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h5 class="font-bold text-xs text-warm-800 uppercase tracking-wider">
              Estudiantes Matriculados ({{ students().length }})
            </h5>
            <span class="text-[11px] text-warm-500">Padrón oficial del curso</span>
          </div>

          @if (isLoading()) {
            <div class="space-y-2 py-4">
              @for (n of [1, 2, 3]; track n) {
                <div class="h-10 bg-warm-100 rounded-xl animate-pulse"></div>
              }
            </div>
          } @else if (students().length === 0) {
            <div class="py-8 text-center text-warm-400 bg-warm-50/50 rounded-2xl border border-dashed border-warm-200">
              <svg class="w-8 h-8 mx-auto mb-2 text-warm-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p class="text-xs">No hay estudiantes matriculados en este grupo todavía.</p>
            </div>
          } @else {
            <div class="max-h-60 overflow-y-auto divide-y divide-warm-100 border border-warm-200 rounded-xl bg-white">
              @for (st of students(); track st.id || st.idEstudiante || st.studentId; let idx = $index) {
                <div class="p-3 flex items-center justify-between gap-3 hover:bg-warm-50/60 transition-colors">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="w-5 text-right font-mono text-[11px] text-warm-400 font-semibold">{{ idx + 1 }}</span>
                    <div class="min-w-0">
                      <p class="font-bold text-xs text-warm-900 truncate">
                        {{ st.nombreCompleto || st.studentName || (st.nombres ? st.nombres + ' ' + (st.apellidos || '') : 'Estudiante') }}
                      </p>
                      <div class="flex items-center gap-2 text-[11px] text-warm-500 font-mono">
                        <span>Doc: {{ st.documento || st.studentCode || st.numeroIdentificacion || 'N/A' }}</span>
                        @if (st.correo) {
                          <span class="text-warm-300">•</span>
                          <span class="font-sans truncate text-warm-600">{{ st.correo }}</span>
                        }
                      </div>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    {{ st.nombreEstado || st.codigoEstado || 'Matriculado' }}
                  </span>
                </div>
              }
            </div>
          }
        </div>

        <!-- Footer -->
        <div modal-footer class="flex items-center justify-end w-full pt-2">
          <app-button variant="primary" size="sm" (clicked)="closed.emit()">
            Entendido
          </app-button>
        </div>
      </div>
    </app-modal>
  `,
})
export class GroupInfoModalComponent {
  isOpen = input<boolean>(false);
  course = input<Course | null | undefined>(null);
  students = input<any[]>([]);
  isLoading = input<boolean>(false);

  closed = output<void>();
}
