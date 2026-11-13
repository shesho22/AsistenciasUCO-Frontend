import { Component, ChangeDetectionStrategy, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanEstudioItem } from '../../../../core/models/role-management.model';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';

@Component({
    selector: 'app-study-plan-form',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, ButtonComponent, FormFieldComponent],
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
            Configura el código curricular, programa académico, facultad, duración en semestres y créditos totales.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <app-form-field label="Código del Plan" [required]="true">
            <input
              type="text"
              [(ngModel)]="planForm.codigo"
              placeholder="Ej. PLAN-SIS-2027"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </app-form-field>

          <app-form-field label="Año de Vigencia" [required]="true">
            <input
              type="number"
              [(ngModel)]="planForm.anioVigencia"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </app-form-field>

          <div class="sm:col-span-2">
            <app-form-field label="Nombre Completo del Plan" [required]="true">
              <input
                type="text"
                [(ngModel)]="planForm.nombre"
                placeholder="Ej. Plan Curricular Ingeniería de Sistemas 2027"
                class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </app-form-field>
          </div>

          <app-form-field label="Programa Académico" [required]="true">
            <input
              type="text"
              [(ngModel)]="planForm.programa"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </app-form-field>

          <app-form-field label="Facultad" [required]="true">
            <input
              type="text"
              [(ngModel)]="planForm.facultad"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </app-form-field>

          <app-form-field label="Total de Semestres" [required]="true">
            <input
              type="number"
              [(ngModel)]="planForm.totalSemestres"
              min="1"
              max="12"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </app-form-field>

          <app-form-field label="Total de Créditos" [required]="true">
            <input
              type="number"
              [(ngModel)]="planForm.totalCreditos"
              min="20"
              max="250"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </app-form-field>

          <div class="sm:col-span-2">
            <app-form-field label="Estado de Vigencia" [required]="true">
              <select
                [(ngModel)]="planForm.estado"
                class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm font-semibold text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="VIGENTE">VIGENTE (Activo para cohortes actuales)</option>
                <option value="EN_TRANSICION">EN TRANSICIÓN (Fase de cierre progresivo)</option>
                <option value="HISTORICO">HISTÓRICO (Solo consulta de egresados)</option>
              </select>
            </app-form-field>
          </div>

          <div class="sm:col-span-2">
            <app-form-field label="Descripción del Enfoque Curricular">
              <textarea
                [(ngModel)]="planForm.descripcion"
                rows="3"
                class="w-full p-3 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              ></textarea>
            </app-form-field>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-warm-100">
          <app-button variant="secondary" size="md" (clicked)="cancel.emit()">
            Cancelar
          </app-button>
          <app-button
            variant="primary"
            size="md"
            [disabled]="!planForm.codigo.trim() || !planForm.nombre.trim()"
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
export class StudyPlanFormComponent implements OnInit {
  modo = input<'CREAR' | 'EDITAR'>('CREAR');
  plan = input<PlanEstudioItem | null>(null);

  save = output<Partial<PlanEstudioItem>>();
  cancel = output<void>();

  planForm: {
    codigo: string;
    nombre: string;
    anioVigencia: number;
    programa: string;
    facultad: string;
    totalSemestres: number;
    totalCreditos: number;
    estado: PlanEstudioItem['estado'];
    descripcion: string;
  } = {
    codigo: '',
    nombre: '',
    anioVigencia: 2026,
    programa: 'Ingeniería de Sistemas',
    facultad: 'Facultad de Ingeniería',
    totalSemestres: 10,
    totalCreditos: 160,
    estado: 'VIGENTE',
    descripcion: '',
  };

  ngOnInit(): void {
    const p = this.plan();
    if (p && this.modo() === 'EDITAR') {
      this.planForm = {
        codigo: p.codigo,
        nombre: p.nombre,
        anioVigencia: p.anioVigencia,
        programa: p.programa,
        facultad: p.facultad,
        totalSemestres: p.totalSemestres,
        totalCreditos: p.totalCreditos ?? 0,
        estado: p.estado,
        descripcion: p.descripcion,
      };
    }
  }

  guardar(): void {
    this.save.emit(this.planForm);
  }
}
