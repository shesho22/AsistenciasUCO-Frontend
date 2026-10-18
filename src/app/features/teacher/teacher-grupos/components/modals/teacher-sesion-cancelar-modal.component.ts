import { Component, ChangeDetectionStrategy, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { ClassSession } from '../../../../../core/models/attendance.model';
import { SessionTimeZoneService } from '../../../../../core/services/session-timezone.service';

@Component({
  selector: 'app-teacher-sesion-cancelar-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FormFieldComponent, ButtonComponent],
  template: `
    @if (isOpen() && sesion()) {
      <div class="fixed inset-0 bg-warm-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
        <div class="bg-white rounded-2xl border border-warm-200 shadow-warm-xl max-w-md w-full overflow-hidden animate-scale-up">
          <div class="p-6 border-b border-warm-100 flex items-start justify-between bg-red-50/40">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 class="font-serif font-bold text-lg text-warm-900">Cancelar Sesión #{{ sesion()?.sessionNumber }}</h3>
                @if (sesion()?.estadoTemporal === 'INDETERMINADA') {
                  <p class="text-xs text-amber-800">Horario no confirmado</p>
                } @else {
                  <p class="text-xs text-warm-600">{{ timeZone.displaySessionDate(sesion()!) }}{{ timeZone.displaySessionEndDate(sesion()!) !== timeZone.displaySessionDate(sesion()!) ? ' – ' + timeZone.displaySessionEndDate(sesion()!) : '' }} • {{ timeZone.displaySessionStartTime(sesion()!) }} - {{ timeZone.displaySessionEndTime(sesion()!) }}</p>
                }
              </div>
            </div>
            <button
              type="button"
              (click)="closed.emit()"
              class="text-warm-400 hover:text-warm-700 p-1 rounded-lg hover:bg-warm-100 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-4">
            <p class="text-xs text-warm-600">
              Esta acción marcará la clase como cancelada en el historial institucional y notificará a los estudiantes matriculados.
            </p>

            <app-form-field label="Motivo de la Cancelación" [required]="true">
              <textarea
                [ngModel]="motivo()"
                (ngModelChange)="motivo.set($event)"
                rows="3"
                placeholder="Explica el motivo institucional o académico y la fecha estimada de reposición..."
                class="w-full p-3 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              ></textarea>
            </app-form-field>
          </div>

          <div class="p-4 border-t border-warm-100 bg-warm-50/50 flex items-center justify-end gap-2.5">
            <app-button variant="secondary" size="sm" (clicked)="closed.emit()">
              Cerrar
            </app-button>
            <button
              type="button"
              [disabled]="!motivo().trim()"
              (click)="confirmar()"
              class="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Confirmar Cancelación
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class TeacherSesionCancelarModalComponent {
  readonly timeZone = inject(SessionTimeZoneService);
  isOpen = input.required<boolean>();
  sesion = input<ClassSession | null>(null);
  motivo = signal<string>('');
  cancelar = output<string>();
  closed = output<void>();

  confirmar(): void {
    if (this.motivo().trim()) {
      this.cancelar.emit(this.motivo().trim());
      this.motivo.set('');
    }
  }
}
