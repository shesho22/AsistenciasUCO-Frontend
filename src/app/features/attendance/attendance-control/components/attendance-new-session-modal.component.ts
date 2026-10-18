import { Component, ChangeDetectionStrategy, input, output, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { Course } from '../../../../core/models/course.model';
import {
  SESSION_NAME_LENGTH_MESSAGE,
  SESSION_NAME_MAX_LENGTH,
  getSessionNameError,
} from '../../../../core/validation/session-name.util';
import { SessionTimeZoneService } from '../../../../core/services/session-timezone.service';

@Component({
  selector: 'app-attendance-new-session-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent, FormFieldComponent],
  template: `
    <app-modal
      [isOpen]="isOpen()"
      title="Crear Nueva Sesión de Clase"
      (closed)="closed.emit()"
    >
      <form (submit)="onSubmit($event)" class="space-y-4">
        @if (course(); as c) {
          <p class="text-xs text-warm-600">
            Crea una nueva sesión para <span class="font-semibold text-warm-800">{{ c.name }}</span> ({{ c.code }} - Grupo {{ c.section }}).
          </p>
        } @else {
          <p class="text-xs text-warm-600">
            Crea una nueva sesión de clase en el cronograma académico del grupo.
          </p>
        }
        <p class="text-[11px] text-primary-800 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2">
          Las fechas y horas se interpretan en la zona IANA activa: <strong>{{ timeZone.zone() }}</strong>.
        </p>

        <app-form-field label="Título de la Sesión" [required]="true">
          <input
            type="text"
            [ngModel]="title()"
            (ngModelChange)="title.set($event)"
            name="titulo"
            required
            maxlength="50"
            placeholder="Ej. Sesión #1 - Presentación y Fundamentos"
            class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          @if (nombreDemasiadoLargo()) {
            <p class="mt-1 text-xs text-red-600" role="alert">{{ nombreLengthMessage }}</p>
          }
        </app-form-field>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <app-form-field label="Fecha de la Sesión" [required]="true">
            <input
              type="date"
              [ngModel]="date()"
              (ngModelChange)="date.set($event)"
              name="fechaSesion"
              required
              class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </app-form-field>

          <app-form-field label="Hora Inicio" [required]="true">
            <input
              type="time"
              [ngModel]="startTime()"
              (ngModelChange)="startTime.set($event)"
              name="horaInicio"
              required
              class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </app-form-field>

          <app-form-field label="Hora Fin" [required]="true">
            <input
              type="time"
              [ngModel]="endTime()"
              (ngModelChange)="endTime.set($event)"
              name="horaFin"
              required
              class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </app-form-field>
        </div>

        <div modal-footer class="flex items-center justify-end gap-2 w-full pt-2">
          <app-button
            variant="ghost"
            size="sm"
            [disabled]="isCreating()"
            (clicked)="closed.emit()"
          >
            Cancelar
          </app-button>
          <app-button
            variant="primary"
            size="sm"
            type="submit"
            [loading]="isCreating()"
            [disabled]="isCreating() || nombreInvalido() || !date()"
            (clicked)="onSubmit($event)"
          >
            Crear Sesión
          </app-button>
        </div>
      </form>
    </app-modal>
  `,
})
export class AttendanceNewSessionModalComponent {
  isOpen = input.required<boolean>();
  course = input<Course | null | undefined>(null);
  isCreating = input<boolean>(false);

  date = signal<string>('');
  startTime = signal<string>('08:00');
  endTime = signal<string>('10:00');
  title = signal<string>('');

  readonly nombreLengthMessage = SESSION_NAME_LENGTH_MESSAGE;

  nombreInvalido(): boolean {
    return getSessionNameError(this.title()) !== null;
  }

  nombreDemasiadoLargo(): boolean {
    return this.title().trim().length > SESSION_NAME_MAX_LENGTH;
  }

  submitted = output<{
    date: string;
    startTime: string;
    endTime: string;
    title: string;
  }>();
  closed = output<void>();

  readonly timeZone = inject(SessionTimeZoneService);

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.title.set('');
        this.date.set(this.timeZone.currentDate());
        this.startTime.set('08:00');
        this.endTime.set('10:00');
      }
    }, { allowSignalWrites: true });
  }

  onSubmit(e: Event): void {
    if (e) {
      e.preventDefault();
    }
    if (this.nombreInvalido() || !this.date()) return;
    this.submitted.emit({
      date: this.date(),
      startTime: this.startTime(),
      endTime: this.endTime(),
      title: this.title().trim(),
    });
  }
}
