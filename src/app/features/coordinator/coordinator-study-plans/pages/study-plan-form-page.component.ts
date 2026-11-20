import { Component, OnInit, inject, input, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { CoordinatorManagementService } from '../../../../core/services/coordinator-management.service';
import { PlanEstudioItem } from '../../../../core/models/role-management.model';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { StudyPlanFormComponent } from '../components/study-plan-form.component';
import { mensajeUi } from '../../../../core/messages/mensajes-ui';

@Component({
    selector: 'app-coordinator-study-plan-form-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [StudyPlanFormComponent],
    template: `
    <div class="space-y-4 animate-fade-in">
      @if (modo() === 'CREAR' || selectedPlan()) {
        <app-study-plan-form
          [modo]="modo()"
          [plan]="selectedPlan()"
          (save)="guardarPlan($event)"
          (cancelar)="volver()"
        />
      } @else {
        <div class="superficie p-12 text-center">
          <p class="text-sm text-warm-500">Cargando información del plan de estudio...</p>
        </div>
      }
    </div>
  `
})
export class CoordinatorStudyPlanFormPageComponent implements OnInit {
  private readonly coordService = inject(CoordinatorManagementService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  planId = input<string>();

  planes = signal<PlanEstudioItem[]>(this.coordService.planes());

  effectivePlanId = computed(() => {
    return this.planId() || this.route.snapshot.paramMap.get('planId') || '';
  });

  modo = computed<'CREAR' | 'EDITAR'>(() => (this.effectivePlanId() ? 'EDITAR' : 'CREAR'));

  selectedPlan = computed<PlanEstudioItem | null>(() => {
    const id = this.effectivePlanId();
    if (!id) return null;
    return this.planes().find((p) => p.id === id) || null;
  });

  ngOnInit(): void {
    if (this.modo() === 'EDITAR' && !this.selectedPlan()) {
      this.coordService.getPlanesEstudio().subscribe({
        next: (res) => this.planes.set(res.datos || []),
        error: (err) => this.toast.error(getApiErrorMessage(err)),
      });
    }
  }

  /** HU079/HU080: el contrato del backend solo recibe el INP del plan (el programa sale del coordinador). */
  guardarPlan(inp: number): void {
    if (this.modo() === 'CREAR') {
      this.coordService.crearPlanEstudio(inp).subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.toast.success(res.mensajeUsuario || mensajeUi('UI_STUDY_PLAN_FORM_PAGE_001'));
            this.volver();
          }
        },
        error: (err) => this.toast.error(getApiErrorMessage(err)),
      });
    } else {
      const id = this.effectivePlanId();
      if (!id) return;
      this.coordService.actualizarPlanEstudio(id, inp).subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.toast.success(res.mensajeUsuario || mensajeUi('UI_STUDY_PLAN_FORM_PAGE_002'));
            this.volver();
          }
        },
        error: (err) => this.toast.error(getApiErrorMessage(err)),
      });
    }
  }

  volver(): void {
    void this.router.navigate(['/app/coordinador/planes-estudio']);
  }
}
