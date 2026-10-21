import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SOPORTE_ACCEPT } from '../../../../core/files/soporte-file.validator';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import {
  MateriaEstudianteItem,
  SesionMateriaDetalle,
  CategoriaJustificacion,
  SoporteAdjuntoItem,
} from '../../../../core/models/role-management.model';

@Component({
  selector: 'app-student-claim-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ButtonComponent, FormFieldComponent],
  template: `
    @if (sesion() && materia()) {
      <div class="space-y-6">
        <!-- Barra Superior de Retorno -->
        <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
          <button
            type="button"
            (click)="back.emit()"
            class="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-warm-700 hover:text-warm-950 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
          >
            <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a {{ materia()?.nombre }}
          </button>

          <span class="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            Radicación de Novedad
          </span>
        </div>

        <div class="bg-white p-6 sm:p-8 rounded-2xl border border-warm-200 shadow-warm-sm max-w-3xl mx-auto space-y-6">
          <div>
            <h2 class="font-serif font-bold text-2xl text-warm-900">
              Solicitud de Revisión y Justificación de Asistencia
            </h2>
            <p class="text-sm text-warm-600 mt-1">
              Diligencia la categoría, justificación y soportes correspondientes a la inasistencia o retardo de la sesión indicada. Esta solicitud será enviada directamente al docente titular para su evaluación.
            </p>
          </div>

          <!-- Ficha de la Sesión Afectada -->
          <div class="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-mono font-bold text-amber-900">
                Sesión #{{ sesion()?.numeroSesion }} — {{ sesion()?.fecha }} ({{ sesion()?.horario }})
              </span>
              <span class="px-2 py-0.5 rounded-full font-bold bg-white text-red-700 border border-red-200">
                Estado Actual: {{ sesion()?.estadoAsistencia }}
              </span>
            </div>
            <p class="text-amber-950 font-medium">Tema: {{ sesion()?.tema }}</p>
            <p class="text-amber-800">Docente a cargo: {{ materia()?.docente ?? 'No informado' }}</p>
          </div>

          <!-- Formulario de Justificación -->
          <div class="space-y-4">
            <!-- Categoría de Inasistencia -->
            <app-form-field label="Categoría de Justificación" [required]="true">
              <select
                [ngModel]="categoria()"
                (ngModelChange)="categoria.set($event)"
                class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                @for (cat of categorias; track cat) {
                  <option [value]="cat">{{ cat }}</option>
                }
              </select>
            </app-form-field>

            <app-form-field label="Explicación detallada y justificación del reclamo" [required]="true">
              <textarea
                [ngModel]="justificacion()"
                (ngModelChange)="justificacion.set($event)"
                rows="5"
                placeholder="Escribe aquí con claridad los motivos de tu ausencia o retardo (ejemplo: cita médica con constancia, calamidad doméstica, representación institucional, retraso en transporte)..."
                class="w-full p-4 bg-warm-50 border border-warm-200 rounded-xl text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 leading-relaxed"
              ></textarea>
            </app-form-field>

            <!-- Carga de Archivo Adjunto / Soporte Documental -->
            <div class="space-y-2">
              <label class="block text-xs font-semibold uppercase tracking-wider text-warm-700">
                Soporte Documental Adjunto (opcional · PDF, JPG, PNG · Máx. 5 MB)
              </label>

              @if (subiendo()) {
                <div class="flex items-center gap-3 p-3.5 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-700" role="status">
                  <span class="inline-block w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></span>
                  Subiendo y analizando el archivo…
                  <button type="button" (click)="removeFile.emit()" class="ml-auto font-semibold text-red-700 hover:underline">
                    Cancelar
                  </button>
                </div>
              }

              @if (errorSoporte()) {
                <p class="text-xs font-medium text-red-700" role="alert">{{ errorSoporte() }}</p>
              }

              @if (archivo()) {
                <div class="flex items-center justify-between p-3.5 bg-warm-50 border border-warm-200 rounded-xl">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p class="text-xs font-bold text-warm-900">{{ archivo()?.nombre }}</p>
                      <p class="text-[11px] text-warm-500">{{ archivo()?.tamanioKb }} KB • {{ archivo()?.tipo }}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    (click)="removeFile.emit()"
                    class="p-1.5 text-warm-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Remover adjunto"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              } @else if (!subiendo()) {
                <label
                  class="border-2 border-dashed border-warm-200 hover:border-primary-400 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer bg-warm-50/50 hover:bg-primary-50/20 transition-all text-center"
                >
                  <input
                    type="file"
                    class="hidden"
                    [attr.accept]="accept"
                    (change)="fileSelected.emit($event)"
                  />
                  <div class="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <span class="text-xs font-semibold text-primary-700">Haz clic para adjuntar un documento</span>
                    <p class="text-[11px] text-warm-400 mt-0.5">Certificado médico, constancia laboral o justificación institucional</p>
                  </div>
                </label>
              }
            </div>

            <div class="p-3 bg-warm-50 rounded-xl border border-warm-200 text-xs text-warm-600 flex items-start gap-2.5">
              <svg class="w-4 h-4 text-warm-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Al enviar la solicitud, el docente evaluará los soportes radicados y, de considerarlo procedente, ajustará tu asistencia a <strong>"Asistencia Justificada"</strong>.
              </span>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-warm-100">
            <app-button variant="secondary" size="md" (clicked)="back.emit()">
              Cancelar
            </app-button>
            <app-button
              variant="primary"
              size="md"
              [disabled]="!justificacion().trim() || submitting() || subiendo()"
              [loading]="submitting()"
              (clicked)="onSubmit()"
            >
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Radicar Reclamo
            </app-button>
          </div>
        </div>
      </div>
    }
  `,
})
export class StudentClaimFormComponent {
  materia = input<MateriaEstudianteItem | null>(null);
  sesion = input<SesionMateriaDetalle | null>(null);
  archivo = input<SoporteAdjuntoItem | null>(null);
  submitting = input<boolean>(false);
  /** Hay una subida del soporte en curso: no se puede radicar hasta conocer el `fileId`. */
  subiendo = input<boolean>(false);
  errorSoporte = input<string | null>(null);

  readonly accept = SOPORTE_ACCEPT;

  categoria = signal<CategoriaJustificacion>('Médico / Salud');
  justificacion = signal<string>('');

  readonly categorias: CategoriaJustificacion[] = [
    'Médico / Salud',
    'Calamidad Doméstica',
    'Académico / Representación',
    'Fuerza Mayor',
    'Laboral',
    'Otro',
  ];

  back = output<void>();
  fileSelected = output<Event>();
  removeFile = output<void>();
  submitted = output<{
    categoria: CategoriaJustificacion;
    justificacion: string;
  }>();

  onSubmit(): void {
    if (!this.justificacion().trim()) return;
    this.submitted.emit({
      categoria: this.categoria(),
      justificacion: this.justificacion().trim(),
    });
  }
}
