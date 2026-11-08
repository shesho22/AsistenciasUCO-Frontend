import { Component, ChangeDetectionStrategy, computed, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanEstudioItem, AsignaturaPlanItem, AreaConocimientoItem, CaracterAsignatura } from '../../../../core/models/role-management.model';
import { ComponenteFormacionItem } from '../../../../core/models/consultas-transversales.model';
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
            Define el código, nombre, semestre del plan, créditos (obligatorios), área y componente de formación.
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
            <select
              aria-label="Semestre de ubicación"
              [(ngModel)]="asigForm.semestre"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              @for (n of semestresPlan(); track n) {
                <option [ngValue]="n">Semestre {{ n }}</option>
              }
            </select>
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
              aria-label="Créditos académicos"
              [(ngModel)]="asigForm.creditos"
              min="1"
              step="1"
              placeholder="Obligatorio, mayor que cero"
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

          <app-form-field label="Área de Conocimiento" [required]="true">
            <select
              aria-label="Área de conocimiento"
              [(ngModel)]="asigForm.area"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Selecciona un área</option>
              @for (a of areasActivas(); track a.id) {
                <option [value]="a.nombre">{{ a.nombre }}</option>
              }
            </select>
          </app-form-field>

          <app-form-field label="Componente de Formación" [required]="true">
            <select
              aria-label="Componente de formación"
              [(ngModel)]="asigForm.componente"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Selecciona un componente</option>
              @for (c of componentes(); track c.idComponente) {
                <option [value]="c.nombre">{{ c.codigo }} · {{ c.nombre }}</option>
              }
            </select>
          </app-form-field>

          <app-form-field label="Carácter en el plan" [required]="true">
            <select
              aria-label="Carácter en el plan"
              [(ngModel)]="asigForm.codigoCaracter"
              class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Selecciona el carácter</option>
              @for (c of caracteres(); track c.codigo) {
                <option [value]="c.codigo">{{ c.nombre }}</option>
              }
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
            [disabled]="!formularioValido()"
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
  /** HU147 / P5: componentes y áreas reales; no se asigna uno "cualquiera" (decisión de John, 2026-11-04). */
  componentes = input<ComponenteFormacionItem[]>([]);
  areas = input<AreaConocimientoItem[]>([]);
  /** CULM-001 B2NM: carácter (obligatoria u optativa) desde `GET /coordinador/caracteres-asignatura`. */
  caracteres = input<CaracterAsignatura[]>([]);

  save = output<{ datos: Partial<AsignaturaPlanItem>; id?: string }>();
  cancel = output<void>();


  areasActivas = computed(() => this.areas().filter((a) => a.activa));
  /** El semestre debe existir en el plan (la DB rechaza con PLA_004 y ya no lo crea). */
  semestresPlan = computed(() => Array.from({ length: Math.max(this.plan().totalSemestres, 0) }, (_, i) => i + 1));

  asigForm: {
    codigo: string;
    nombre: string;
    creditos: number | null;
    semestre: number;
    area: string;
    componente: string;
    horasSemanales: number;
    codigoCaracter: string;
  } = {
    codigo: '',
    nombre: '',
    // Créditos obligatorios y mayores que cero, sin valor por defecto (decisión de John, 2026-11-04).
    creditos: null,
    semestre: 1,
    area: '',
    componente: '',
    horasSemanales: 4,
    codigoCaracter: '',
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
        codigoCaracter: asig.codigoCaracter ?? '',
      };
    }
  }


  /** Código, nombre, área, componente, créditos enteros mayores que cero y un semestre del plan. */
  formularioValido(): boolean {
    const f = this.asigForm;
    const creditos = Number(f.creditos);
    return (
      !!f.codigo.trim() &&
      !!f.nombre.trim() &&
      !!f.area &&
      !!f.componente &&
      !!f.codigoCaracter &&
      f.creditos !== null &&
      Number.isInteger(creditos) &&
      creditos > 0 &&
      this.semestresPlan().includes(Number(f.semestre))
    );
  }

  guardar(): void {
    if (!this.formularioValido()) return;
    this.save.emit({
      datos: { ...this.asigForm, creditos: Number(this.asigForm.creditos) },
      id: this.asignatura()?.id,
    });
  }
}
