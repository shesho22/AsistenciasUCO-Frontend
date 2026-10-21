import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { MateriaEstudianteItem } from '../../../../../core/models/role-management.model';

@Component({
  selector: 'app-student-prerequisitos-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonComponent],
  template: `
    @if (isOpen() && materia()) {
      <div class="fixed inset-0 bg-warm-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
        <div class="bg-white rounded-2xl border border-warm-200 shadow-warm-xl max-w-lg w-full overflow-hidden animate-scale-up">
          <div class="p-6 border-b border-warm-100 flex items-start justify-between bg-warm-50/50">
            <div>
              <div class="flex items-center gap-2 mb-1">
                @if (materia()?.codigo) {
                  <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary-100 text-primary-900 border border-primary-200">
                    {{ materia()?.codigo }}
                  </span>
                }
                <span class="text-xs font-semibold text-warm-500">Malla Curricular</span>
              </div>
              <h3 class="font-serif font-bold text-xl text-warm-900">
                Prerrequisitos de Asignatura
              </h3>
              <p class="text-xs text-warm-600 mt-0.5">
                {{ materia()?.nombre }}
              </p>
            </div>
            <button
              type="button"
              (click)="closed.emit()"
              class="p-1.5 rounded-lg text-warm-400 hover:text-warm-700 hover:bg-warm-100 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <p class="text-xs text-warm-600 leading-relaxed">
              Para cursar y validar efectivamente <strong>{{ materia()?.nombre }}</strong>, debes haber aprobado o matriculado previamente las siguientes asignaturas:
            </p>

            @if (loading()) {
              <div class="space-y-3">
                @for (n of [1, 2]; track n) {
                  <div class="h-16 bg-warm-100 rounded-xl animate-pulse"></div>
                }
              </div>
            } @else if (prerequisitos().length === 0) {
              <div class="p-8 text-center bg-warm-50 rounded-xl border border-warm-200/80">
                <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p class="text-sm font-semibold text-warm-800">Esta asignatura no tiene prerrequisitos obligatorios.</p>
                <p class="text-xs text-warm-500 mt-1">Puedes cursarla directamente según tu nivel de plan de estudios.</p>
              </div>
            } @else {
              <div class="space-y-3">
                @for (req of prerequisitos(); track req.id) {
                  <div class="p-3.5 rounded-xl border border-warm-200/80 flex items-center justify-between gap-3 bg-white hover:border-primary-300 transition-colors">
                    <div class="space-y-0.5">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-mono font-bold text-warm-700 bg-warm-100 px-1.5 py-0.5 rounded">
                          {{ req.prerrequisitoCodigo }}
                        </span>
                        <span class="text-xs text-warm-400">•</span>
                        <span class="text-xs text-warm-500 font-medium">{{ req.creditos }} Créditos</span>
                      </div>
                      <h4 class="font-serif font-bold text-sm text-warm-900 leading-tight">
                        {{ req.prerrequisitoNombre }}
                      </h4>
                      <span class="text-[11px] text-warm-500 block">Tipo: {{ req.tipo }}</span>
                    </div>

                    <span
                      [class]="req.estadoAcademico === 'APROBADA' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'"
                      class="px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 inline-flex items-center gap-1"
                    >
                      @if (req.estadoAcademico === 'APROBADA') {
                        <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Aprobada
                      } @else {
                        <svg class="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Requisito Pendiente
                      }
                    </span>
                  </div>
                }
              </div>
            }
          </div>

          <div class="p-4 border-t border-warm-100 bg-warm-50/50 flex justify-end">
            <app-button variant="secondary" size="sm" (clicked)="closed.emit()">
              Cerrar
            </app-button>
          </div>
        </div>
      </div>
    }
  `,
})
export class StudentPrerequisitosModalComponent {
  isOpen = input<boolean>(false);
  materia = input<MateriaEstudianteItem | null>(null);
  prerequisitos = input<any[]>([]);
  loading = input<boolean>(false);

  closed = output<void>();
}
