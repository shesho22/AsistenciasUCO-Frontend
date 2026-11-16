import { Component, ChangeDetectionStrategy, input, output, signal, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { ToastService } from '../../../../../shared/components/toast/toast.component';
import { GroupService } from '../../../../../core/services/group.service';
import { getApiErrorMessage } from '../../../../../core/api/errors/api-error.util';
import { mensajeUi } from '../../../../../core/messages/mensajes-ui';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';

/** Estudiante del padrón que se retira (forma de `EstudianteGrupoApiDto`). */
export interface EstudianteARetirar {
  idEstudiante: string;
  nombreCompleto?: string;
}

const MOTIVO_MAXIMO = 500;

/**
 * HU051: el docente titular retira a un estudiante de su grupo con un motivo obligatorio (1..500 caracteres). La
 * matrícula queda inactiva, sus asistencias se conservan y el backend avisa al estudiante, al docente y al
 * coordinador del programa. Los rechazos del backend (grupo ajeno, sin matrícula activa, período terminado) se
 * muestran en el propio modal.
 */
@Component({
    selector: 'app-teacher-retiro-estudiante-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ModalComponent, FormsModule, FormFieldComponent, ButtonComponent],
    template: `
    <app-modal
      [isOpen]="isOpen() && !!estudiante()"
      title="Retirar estudiante del grupo"
      [subtitulo]="estudiante()?.nombreCompleto || 'Estudiante'"
      tamano="md"
      etiquetaCerrar="Cerrar"
      [cerrarAlPulsarFondo]="false"
      (closed)="cerrar()"
    >
      <div class="space-y-4">
        <p class="text-xs text-warm-600">
          La matrícula quedará inactiva y se liberará el cupo. Las asistencias registradas se conservan. Se avisará
          al estudiante, al docente y al coordinador del programa.
        </p>

        <app-form-field label="Motivo del retiro" [required]="true">
          <textarea
            [ngModel]="motivo()"
            (ngModelChange)="motivo.set($event); error.set('')"
            rows="3"
            maxlength="500"
            placeholder="Explica por qué se retira al estudiante..."
            class="w-full p-3 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          ></textarea>
        </app-form-field>
        <p class="text-[11px] text-warm-500 text-right">{{ motivo().length }}/500</p>

        @if (error()) {
          <p class="text-xs text-danger-700 bg-danger-50 border border-danger-200 rounded-lg p-2">{{ error() }}</p>
        }
      </div>

      <app-button modal-footer variant="secondary" size="md" (clicked)="cerrar()">Cancelar</app-button>
      <app-button modal-footer variant="danger" size="md" [disabled]="enviando()" (clicked)="confirmar()">
        {{ enviando() ? 'Retirando...' : 'Retirar estudiante' }}
      </app-button>
    </app-modal>
  `
})
export class TeacherRetiroEstudianteModalComponent {
  private readonly groupService = inject(GroupService);
  private readonly toast = inject(ToastService);

  readonly isOpen = input<boolean>(false);
  readonly grupoId = input<string | null>(null);
  readonly estudiante = input<EstudianteARetirar | null>(null);

  readonly closed = output<void>();
  readonly retirado = output<string>();

  readonly motivo = signal('');
  readonly error = signal('');
  readonly enviando = signal(false);

  confirmar(): void {
    const motivo = this.motivo().trim();
    if (!motivo) {
      this.error.set('El motivo del retiro es obligatorio.');
      return;
    }
    if (motivo.length > MOTIVO_MAXIMO) {
      this.error.set('El motivo no puede superar 500 caracteres.');
      return;
    }
    const grupoId = this.grupoId();
    const estudiante = this.estudiante();
    if (!grupoId || !estudiante?.idEstudiante || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.error.set('');
    this.groupService
      .retirarEstudiante(grupoId, estudiante.idEstudiante, motivo)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(estudiante.nombreCompleto
            ? mensajeUi('UI_TEACHER_RETIRO_ESTUDIANTE_MODAL_001', { nombre: estudiante.nombreCompleto })
            : mensajeUi('UI_TEACHER_RETIRO_ESTUDIANTE_MODAL_002'));
          this.motivo.set('');
          this.retirado.emit(estudiante.idEstudiante);
        },
        error: (error: unknown) => this.error.set(getApiErrorMessage(error)),
      });
  }

  cerrar(): void {
    this.motivo.set('');
    this.error.set('');
    this.closed.emit();
  }
}
