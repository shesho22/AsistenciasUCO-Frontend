import { Component, ChangeDetectionStrategy, input, output, signal, effect, inject, computed, untracked } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { Course } from '../../../../core/models/course.model';
import { ClassSession } from '../../../../core/models/attendance.model';
import { avisoSolicitudSesionRegistrada } from '../../../../core/models/sesion-manual.util';
import {
  SESSION_NAME_LENGTH_MESSAGE,
  SESSION_NAME_MAX_LENGTH,
  getSessionNameError,
} from '../../../../core/validation/session-name.util';
import { SessionTimeZoneService } from '../../../../core/services/session-timezone.service';
import { horarioDentroDelMismoDia } from '../../../../core/time/session-timezone.util';
import { mensajeUi } from '../../../../core/messages/mensajes-ui';

/** Datos del formulario de programacion de sesion que emite el modal. */
export interface NuevaSesionSolicitud {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
}

@Component({
    selector: 'app-attendance-new-session-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ModalComponent, ButtonComponent, FormFieldComponent],
    template: `
    <app-modal
      [isOpen]="isOpen()"
      [title]="tituloModal()"
      (closed)="closed.emit()"
    >
      <form (submit)="onSubmit($event)" class="space-y-4">
        @if (sesion()) {
          <p class="text-xs text-warm-600" data-testid="nota-ajuste-horario">
            Modifica el título, la fecha o el horario de esta sesión. Si no cambias el horario, se conservan sus instantes originales.
          </p>
        } @else if (course(); as c) {
          <p class="text-xs text-warm-600">
            Crea una nueva sesión para <span class="font-semibold text-warm-800">{{ c.name }}</span> ({{ c.code ? c.code + ' - ' : '' }}{{ c.section }}).
          </p>
        } @else {
          <p class="text-xs text-warm-600">
            Crea una nueva sesión de clase en el cronograma académico del grupo.
          </p>
        }
        @if (!sesion()) {
          <!-- DEC-065 (2): la sesión que crea el docente es una solicitud que aprueba la coordinación. -->
          <p class="text-xs text-warning-800 bg-warning-50 border border-warning-200 rounded-lg px-3 py-2" data-testid="nota-solicitud-sesion">
            {{ notaSolicitud() }}
          </p>
        }
        <p class="text-[11px] text-primary-800 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2">
          Las fechas y horas se interpretan en la zona IANA activa: <strong>{{ timeZone.zone() }}</strong>.
        </p>
        @if (avisoZona(); as aviso) {
          <p role="alert" data-testid="aviso-zona-cambiada" class="text-xs text-warning-800 bg-warning-50 border border-warning-200 rounded-lg px-3 py-2">
            {{ aviso }}
          </p>
        }

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
            <p class="mt-1 text-xs text-danger-600" role="alert">{{ nombreLengthMessage }}</p>
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
        @if (horarioInvalido()) {
          <p class="text-xs text-danger-600" role="alert">{{ horarioMensaje() }}</p>
        }

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
            [disabled]="isCreating() || nombreInvalido() || !date() || horarioInvalido()"
            (clicked)="onSubmit($event)"
          >
            {{ sesion() ? 'Guardar horario' : 'Crear Sesión' }}
          </app-button>
        </div>
      </form>
    </app-modal>
  `
})
export class AttendanceNewSessionModalComponent {
  isOpen = input.required<boolean>();
  course = input<Course | null | undefined>(null);
  isCreating = input<boolean>(false);
  /** Con una sesión el modal ajusta su horario (precargado en la zona activa); sin ella crea una nueva. */
  sesion = input<ClassSession | null>(null);

  readonly notaSolicitud = computed(() => avisoSolicitudSesionRegistrada());

  readonly tituloModal = computed(() => {
    const sesion = this.sesion();
    return sesion ? `Ajustar horario de la Sesión #${sesion.sessionNumber}` : 'Crear Nueva Sesión de Clase';
  });

  /** Horario precargado al ajustar una sesión; `null` al crear. */
  private horarioOriginal: { date: string; startTime: string; endTime: string } | null = null;

  /** Al ajustar, true si la fecha y las horas siguen siendo las de la sesión guardada. */
  horarioSinCambios(): boolean {
    const original = this.horarioOriginal;
    return !!original
      && original.date === this.date()
      && original.startTime === this.startTime()
      && original.endTime === this.endTime();
  }

  date = signal<string>('');
  startTime = signal<string>('08:00');
  endTime = signal<string>('10:00');
  title = signal<string>('');

  readonly nombreLengthMessage = SESSION_NAME_LENGTH_MESSAGE;
  readonly horarioMensaje = computed(() => mensajeUi('UI_SESION_HORARIO_MISMO_DIA'));

  /**
   * DEC-072: la sesión no cruza la medianoche; con fin menor o igual al inicio no se puede guardar.
   * Una sesión ya guardada que la cruza se puede ajustar sin tocar su horario.
   */
  horarioInvalido(): boolean {
    if (this.horarioSinCambios()) return false;
    return !horarioDentroDelMismoDia(this.startTime(), this.endTime());
  }

  nombreInvalido(): boolean {
    return getSessionNameError(this.title()) !== null;
  }

  nombreDemasiadoLargo(): boolean {
    return this.title().trim().length > SESSION_NAME_MAX_LENGTH;
  }

  submitted = output<NuevaSesionSolicitud>();
  closed = output<void>();

  readonly timeZone = inject(SessionTimeZoneService);

  /** Aviso cuando la zona horaria cambia mientras se ajusta una sesión (se recarga su horario en la zona nueva). */
  readonly avisoZona = signal<string | null>(null);
  /** Qué se cargó en el formulario abierto (`'NUEVA'` al crear) y en qué zona; `null` con el modal cerrado. */
  private cargado: { clave: string; zona: string } | null = null;

  constructor() {
    effect(() => {
      const abierto = this.isOpen();
      const sesion = this.sesion();
      const zona = this.timeZone.zone();
      untracked(() => {
        if (!abierto) {
          this.cargado = null;
          this.avisoZona.set(null);
          return;
        }
        const clave = sesion?.id ?? 'NUEVA';
        const mismaCarga = this.cargado?.clave === clave;
        if (mismaCarga && this.cargado?.zona === zona) return;
        if (sesion) {
          this.cargarHorario(sesion);
          if (mismaCarga) {
            // La zona cambió con el formulario abierto: el horario se vuelve a mostrar en la zona nueva y se conserva
            // el título escrito; el docente lo revisa antes de guardar.
            this.avisoZona.set(mensajeUi('UI_TEACHER_GRUPOS_007'));
          } else {
            this.title.set(sesion.title);
            this.avisoZona.set(null);
          }
        } else if (!mismaCarga) {
          this.horarioOriginal = null;
          this.title.set('');
          this.date.set(this.timeZone.currentDate());
          this.startTime.set('08:00');
          this.endTime.set('10:00');
        }
        this.cargado = { clave, zona };
      });
    });
  }

  /** Precarga la fecha y las horas de la sesión en la zona activa. */
  private cargarHorario(sesion: ClassSession): void {
    const original = {
      date: this.timeZone.displaySessionDate(sesion),
      startTime: this.timeZone.displaySessionStartTime(sesion),
      endTime: this.timeZone.displaySessionEndTime(sesion),
    };
    this.horarioOriginal = original;
    this.date.set(original.date);
    this.startTime.set(original.startTime);
    this.endTime.set(original.endTime);
  }

  onSubmit(e: Event): void {
    if (e) {
      e.preventDefault();
    }
    if (this.nombreInvalido() || !this.date() || this.horarioInvalido()) return;
    this.submitted.emit({
      date: this.date(),
      startTime: this.startTime(),
      endTime: this.endTime(),
      title: this.title().trim(),
    });
  }
}
