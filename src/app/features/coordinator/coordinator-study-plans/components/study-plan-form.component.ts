import { Component, ChangeDetectionStrategy, input, output, signal, computed, effect, untracked } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { PlanEstudioItem } from '../../../../core/models/role-management.model';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { mensajeUi } from '../../../../core/messages/mensajes-ui';

/**
 * HU079/HU080: alta y edición del plan de estudio. El contrato del backend (`GuardarPlanEstudioRequest`) solo recibe el
 * INP del plan (entero positivo, año de vigencia); el programa sale del coordinador autenticado y los semestres,
 * asignaturas y créditos se configuran después en la malla curricular. Por eso el formulario pide solo el INP.
 */
@Component({
    selector: 'app-study-plan-form',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonComponent, FormFieldComponent],
    template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
        <button
          type="button"
          (click)="cancel.emit()"
          class="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-warm-700 hover:text-warm-950 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
        >
          <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a Planes de Estudio
        </button>

        <span class="text-xs font-bold text-primary-800 bg-primary-50 border border-primary-200 px-3 py-1 rounded-full">
          {{ modo() === 'CREAR' ? 'Nuevo Plan de Estudio' : 'Modificar Plan' }}
        </span>
      </div>

      <div class="bg-white p-6 sm:p-8 rounded-2xl border border-warm-200 shadow-warm-sm max-w-3xl mx-auto space-y-6">
        <div>
          <h2 class="font-serif font-bold text-2xl text-warm-900">
            {{ modo() === 'CREAR' ? 'Registro de Nuevo Plan de Estudio' : 'Edición de Plan de Estudio' }}
          </h2>
          <p class="text-sm text-warm-600 mt-1">
            El plan se registra para tu programa académico con su INP (año de vigencia). Los semestres, las asignaturas y
            los créditos se configuran después en la malla curricular.
          </p>
        </div>

        @if (modo() === 'EDITAR' && plan()?.programa) {
          <p class="text-sm text-warm-700">
            Programa: <span class="font-semibold text-warm-900">{{ plan()!.programa }}</span>
          </p>
        }

        <app-form-field label="INP del plan (año de vigencia)" [required]="true">
          <input
            type="number"
            name="inp"
            min="1"
            step="1"
            [ngModel]="inp()"
            (ngModelChange)="inp.set($event)"
            placeholder="Ej. 2027"
            class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          @if (inpInvalido()) {
            <p class="mt-1 text-xs text-danger-600" role="alert">{{ inpMensaje }}</p>
          }
        </app-form-field>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-warm-100">
          <app-button variant="secondary" size="md" (clicked)="cancel.emit()">
            Cancelar
          </app-button>
          <app-button
            variant="primary"
            size="md"
            [disabled]="!inpValido()"
            (clicked)="guardar()"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ modo() === 'CREAR' ? 'Registrar Plan' : 'Guardar Cambios' }}
          </app-button>
        </div>
      </div>
    </div>
  `
})
export class StudyPlanFormComponent {
  modo = input<'CREAR' | 'EDITAR'>('CREAR');
  plan = input<PlanEstudioItem | null>(null);

  /** Emite el INP del plan, único dato que acepta el backend. */
  save = output<number>();
  cancel = output<void>();

  readonly inp = signal<number | string | null>(null);
  readonly inpMensaje = mensajeUi('UI_STUDY_PLAN_FORM_001');

  /** Entero positivo; el campo vacío todavía no se marca como error, solo deshabilita el envío. */
  readonly inpValido = computed(() => {
    const valor = this.inp();
    if (valor === null || valor === '') return false;
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0;
  });

  readonly inpInvalido = computed(() => {
    const valor = this.inp();
    return valor !== null && valor !== '' && !this.inpValido();
  });

  constructor() {
    // En edición el plan puede llegar después de crear el formulario: se precarga una sola vez, sin pisar lo escrito.
    effect(() => {
      const p = this.plan();
      if (p && this.modo() === 'EDITAR' && p.anioVigencia > 0 && untracked(this.inp) === null) {
        this.inp.set(p.anioVigencia);
      }
    });
  }

  guardar(): void {
    if (!this.inpValido()) return;
    this.save.emit(Number(this.inp()));
  }
}
