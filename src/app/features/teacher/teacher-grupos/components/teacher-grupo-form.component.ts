import { Component, ChangeDetectionStrategy, input, output, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AsignaturaDocenteApiDto } from '../../../../core/api/models/asignatura-docente-api-dto.model';

@Component({
  selector: 'app-teacher-grupo-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FormFieldComponent, ButtonComponent],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
        <button
          type="button"
          (click)="cancelar.emit()"
          class="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-warm-700 hover:text-warm-950 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
        >
          <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a Mis Grupos
        </button>

        <span class="text-xs font-bold text-primary-800 bg-primary-50 border border-primary-200 px-3 py-1 rounded-full">
          {{ modo() === 'CREAR' ? 'Nuevo Grupo' : 'Modificación de Grupo' }}
        </span>
      </div>

      <div class="bg-white p-6 sm:p-8 rounded-2xl border border-warm-200 shadow-warm-sm max-w-3xl mx-auto space-y-6">
        <div>
          <h2 class="font-serif font-bold text-2xl text-warm-900">
            {{ modo() === 'CREAR' ? 'Apertura de Nuevo Grupo Académico' : 'Editar Información de Grupo' }}
          </h2>
          <p class="text-sm text-warm-600 mt-1">
            {{ modo() === 'CREAR'
              ? 'Define los parámetros de la asignatura, horario regular semanal, aula asignada y cupo de estudiantes.'
              : 'Como docente titular puedes ajustar el horario regular semanal del grupo. Los datos académicos e institucionales son de solo lectura.' }}
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          @if (modo() === 'CREAR') {
            <div class="sm:col-span-2">
              <app-form-field label="Asignatura Asignada al Docente" [required]="true">
                <select
                  [(ngModel)]="form().asignaturaId"
                  (ngModelChange)="asignaturaChange.emit($event)"
                  class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm font-semibold text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">Selecciona una asignatura de tu carga académica...</option>
                  @for (asig of asignaturasDocente(); track asig.idAsignatura) {
                    <option [value]="asig.idAsignatura">
                      {{ asig.nombreAsignatura }} ({{ asig.nombrePrograma || 'Programa UCO' }})
                    </option>
                  }
                </select>
              </app-form-field>
            </div>
          }

          <app-form-field label="Código de la Asignatura" [required]="modo() === 'CREAR'">
            <input
              type="text"
              [(ngModel)]="form().code"
              [disabled]="modo() === 'EDITAR' || (modo() === 'CREAR' && asignaturasDocente().length > 0)"
              placeholder="Ej. MAT-301, FIS-202"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-warm-100 disabled:text-warm-500 disabled:cursor-not-allowed"
            />
          </app-form-field>

          <app-form-field label="Sección / Grupo" [required]="modo() === 'CREAR'">
            <input
              type="text"
              [(ngModel)]="form().section"
              [disabled]="modo() === 'EDITAR'"
              placeholder="Ej. Grupo 01, Sección B"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-warm-100 disabled:text-warm-500 disabled:cursor-not-allowed"
            />
          </app-form-field>

          <div class="sm:col-span-2">
            <app-form-field label="Nombre de la Asignatura" [required]="modo() === 'CREAR'">
              <input
                type="text"
                [(ngModel)]="form().name"
                [disabled]="modo() === 'EDITAR' || (modo() === 'CREAR' && asignaturasDocente().length > 0)"
                placeholder="Ej. Matemática Avanzada III"
                class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-warm-100 disabled:text-warm-500 disabled:cursor-not-allowed"
              />
            </app-form-field>
          </div>

          <!-- Selector de Días y Horas Estructurado (Editable por el Docente) -->
          <div class="sm:col-span-2 space-y-2 p-3.5 bg-warm-50/70 border border-primary-200/80 rounded-2xl relative">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-warm-700 uppercase tracking-wider">
                Días de Clase Regular <span class="text-red-500">*</span>
              </label>
              @if (modo() === 'EDITAR') {
                <span class="text-[11px] font-semibold text-primary-700 bg-primary-50 border border-primary-200 px-2 py-0.5 rounded-full">
                  Editable por Docente
                </span>
              }
            </div>
            <div class="flex flex-wrap gap-2">
              @for (d of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']; track d) {
                <button
                  type="button"
                  (click)="alternarDia(d)"
                  [class]="form().diasSeleccionados.includes(d)
                    ? 'px-3 py-1.5 rounded-xl text-xs font-bold bg-primary-700 text-white shadow-xs'
                    : 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-warm-200 text-warm-700 hover:bg-warm-100'"
                >
                  {{ d }}
                </button>
              }
            </div>
            <div class="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label class="block text-[11px] font-semibold text-warm-600 mb-1">Hora Inicio</label>
                <input
                  type="time"
                  [(ngModel)]="form().horaInicio"
                  (ngModelChange)="actualizarHorarioTexto()"
                  class="w-full px-3 py-2 bg-white border border-warm-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-warm-600 mb-1">Hora Fin</label>
                <input
                  type="time"
                  [(ngModel)]="form().horaFin"
                  (ngModelChange)="actualizarHorarioTexto()"
                  class="w-full px-3 py-2 bg-white border border-warm-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
            <p class="text-[11px] text-warm-500">
              Horario configurado: <strong class="text-warm-800">{{ form().schedule }}</strong>
            </p>
          </div>

          <app-form-field label="Aula Asignada" [required]="modo() === 'CREAR'">
            <input
              type="text"
              [(ngModel)]="form().room"
              [disabled]="modo() === 'EDITAR'"
              placeholder="Ej. Aula A-204, Lab L-102"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-warm-100 disabled:text-warm-500 disabled:cursor-not-allowed"
            />
          </app-form-field>

          <app-form-field label="Cupo Máximo de Estudiantes" [required]="modo() === 'CREAR'">
            <input
              type="number"
              [(ngModel)]="form().cupoMaximo"
              [disabled]="modo() === 'EDITAR'"
              min="1"
              max="100"
              placeholder="35"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-warm-100 disabled:text-warm-500 disabled:cursor-not-allowed"
            />
          </app-form-field>

          <app-form-field label="Docente Responsable" [required]="modo() === 'CREAR'">
            <input
              type="text"
              [(ngModel)]="form().docenteName"
              [disabled]="modo() === 'EDITAR'"
              placeholder="Nombre del docente responsable"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-warm-100 disabled:text-warm-500 disabled:cursor-not-allowed"
            />
          </app-form-field>

          @if (modo() === 'CREAR') {
            <div class="sm:col-span-2 p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl space-y-3">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <label class="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Planificación y Creación de Sesiones
                </label>
              </div>

              <div class="space-y-2.5">
                <label class="flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer"
                  [class]="form().generarSesionesAutomaticas ? 'bg-white border-emerald-400 shadow-xs' : 'bg-warm-50/50 border-warm-200 hover:bg-white'">
                  <input
                    type="radio"
                    name="generarSesionesAutomaticas"
                    [value]="true"
                    [(ngModel)]="form().generarSesionesAutomaticas"
                    class="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span class="text-sm font-bold text-warm-900">Generar automáticamente el cronograma semestral</span>
                    <p class="text-xs text-warm-600 mt-0.5">
                      Crea automáticamente todas las sesiones del período lectivo según los días y horas seleccionados.
                    </p>
                  </div>
                </label>

                <label class="flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer"
                  [class]="!form().generarSesionesAutomaticas ? 'bg-white border-emerald-400 shadow-xs' : 'bg-warm-50/50 border-warm-200 hover:bg-white'">
                  <input
                    type="radio"
                    name="generarSesionesAutomaticas"
                    [value]="false"
                    [(ngModel)]="form().generarSesionesAutomaticas"
                    class="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span class="text-sm font-bold text-warm-900">Creación manual de sesiones</span>
                    <p class="text-xs text-warm-600 mt-0.5">
                      Permite añadir sesiones una a una desde la vista de toma de asistencia o el hub del grupo.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          }
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-warm-100">
          <app-button variant="secondary" size="md" (clicked)="cancelar.emit()">
            Cancelar
          </app-button>
          <app-button
            variant="primary"
            size="md"
            [disabled]="!form().name?.trim() || (asignaturasDocente().length === 0 && !form().code?.trim())"
            (clicked)="guardar.emit()"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ modo() === 'CREAR' ? 'Crear Grupo' : 'Guardar Cambios' }}
          </app-button>
        </div>
      </div>
    </div>
  `,
})
export class TeacherGrupoFormComponent {
  modo = input<'CREAR' | 'EDITAR'>('CREAR');
  asignaturasDocente = input<AsignaturaDocenteApiDto[]>([]);
  form = model<any>({
    code: '',
    section: '',
    name: '',
    room: '',
    schedule: '',
    cupoMaximo: 35,
    docenteName: '',
    asignaturaId: '',
    diasSeleccionados: ['Lunes', 'Miércoles'],
    horaInicio: '08:00',
    horaFin: '10:00',
    generarSesionesAutomaticas: true,
  });

  cancelar = output<void>();
  guardar = output<void>();
  asignaturaChange = output<string>();

  alternarDia(dia: string): void {
    const f = this.form();
    const idx = f.diasSeleccionados.indexOf(dia);
    if (idx > -1) {
      if (f.diasSeleccionados.length > 1) {
        f.diasSeleccionados.splice(idx, 1);
      }
    } else {
      f.diasSeleccionados.push(dia);
    }
    this.actualizarHorarioTexto();
  }

  actualizarHorarioTexto(): void {
    const f = this.form();
    const dias = f.diasSeleccionados.join(' y ');
    f.schedule = `${dias} ${f.horaInicio} - ${f.horaFin}`;
    this.form.set({ ...f });
  }
}
