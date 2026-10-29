import { Component, ChangeDetectionStrategy, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanEstudioItem, AsignaturaPlanItem } from '../../../../core/models/role-management.model';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';

@Component({
  selector: 'app-subject-form',
  standalone: true,
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
          Volver a Malla Curricular
        </button>

        <span class="text-xs font-bold text-primary-800 bg-primary-50 border border-primary-200 px-3 py-1 rounded-full">
          {{ modo() === 'CREAR' ? 'Nueva Asignatura' : 'Modificar Asignatura' }}
        </span>
      </div>

      <div class="bg-white p-6 sm:p-8 rounded-2xl border border-warm-200 shadow-warm-sm max-w-2xl mx-auto space-y-6">
        <div>
          <h2 class="font-serif font-bold text-2xl text-warm-900">
            {{ modo() === 'CREAR' ? 'Registro de Asignatura en el Plan' : 'Edición de Asignatura Curricular' }}
          </h2>
          <p class="text-sm text-warm-600 mt-1">
            Define el código, nombre, semestre de ubicación, créditos y horas.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <app-form-field label="Código de la Asignatura" [required]="true">
            <input
              type="text"
              [(ngModel)]="asigForm.codigo"
              placeholder="Ej. SIS-301"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </app-form-field>

          <app-form-field label="Semestre de Ubicación" [required]="true">
            <input
              type="number"
              [(ngModel)]="asigForm.semestre"
              min="1"
              [max]="plan().totalSemestres"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </app-form-field>

          <div class="sm:col-span-2">
            <app-form-field label="Nombre de la Asignatura" [required]="true">
              <input
                type="text"
                [(ngModel)]="asigForm.nombre"
                placeholder="Ej. Bases de Datos Avanzadas"
                class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </app-form-field>
          </div>

          <app-form-field label="Créditos Académicos" [required]="true">
            <input
              type="number"
              [(ngModel)]="asigForm.creditos"
              min="1"
              max="10"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </app-form-field>

          <app-form-field label="Horas Semanales Presenciales" [required]="true">
            <input
              type="number"
              [(ngModel)]="asigForm.horasSemanales"
              min="1"
              max="20"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </app-form-field>

          <app-form-field label="Área de Conocimiento">
            <input
              type="text"
              [(ngModel)]="asigForm.area"
              placeholder="Ej. Ingeniería de Software, Hardware"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </app-form-field>

          <app-form-field label="Componente Curricular">
            <select
              [(ngModel)]="asigForm.componente"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="Obligatoria">Obligatoria</option>
              <option value="Electiva">Electiva</option>
              <option value="Complementaria">Complementaria</option>
            </select>
          </app-form-field>

        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-warm-100">
          <app-button variant="secondary" size="md" (clicked)="cancel.emit()">
            Cancelar
          </app-button>
          <app-button
            variant="primary"
            size="md"
            [disabled]="!asigForm.codigo.trim() || !asigForm.nombre.trim()"
            (clicked)="guardar()"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ modo() === 'CREAR' ? 'Agregar Asignatura' : 'Guardar Cambios' }}
          </app-button>
        </div>
      </div>
    </div>
  `,
})
export class SubjectFormComponent implements OnInit {
  plan = input.required<PlanEstudioItem>();
  modo = input<'CREAR' | 'EDITAR'>('CREAR');
  asignatura = input<AsignaturaPlanItem | null>(null);

  save = output<{ datos: Partial<AsignaturaPlanItem>; id?: string }>();
  cancel = output<void>();


  asigForm: {
    codigo: string;
    nombre: string;
    creditos: number;
    semestre: number;
    area: string;
    componente: 'Obligatoria' | 'Electiva' | 'Complementaria';
    horasSemanales: number;
  } = {
    codigo: '',
    nombre: '',
    creditos: 3,
    semestre: 1,
    area: 'Ingeniería de Software',
    componente: 'Obligatoria',
    horasSemanales: 4,
  };


  ngOnInit(): void {
    const asig = this.asignatura();
    if (asig && this.modo() === 'EDITAR') {
      this.asigForm = {
        codigo: asig.codigo,
        nombre: asig.nombre,
        creditos: asig.creditos,
        semestre: asig.semestre,
        area: asig.area,
        componente: asig.componente,
        horasSemanales: asig.horasSemanales,
      };
    }
  }


  guardar(): void {
    this.save.emit({
      datos: { ...this.asigForm },
      id: this.asignatura()?.id,
    });
  }
}
