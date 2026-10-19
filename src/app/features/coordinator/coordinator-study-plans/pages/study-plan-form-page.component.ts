import { Component, OnInit, inject, input, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CoordinatorManagementService } from '../../../../core/services/coordinator-management.service';
import { PlanEstudioItem } from '../../../../core/models/role-management.model';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { StudyPlanFormComponent } from '../components/study-plan-form.component';

@Component({
  selector: 'app-coordinator-study-plan-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, StudyPlanFormComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      @if (modo() === 'CREAR' || selectedPlan()) {
        <app-study-plan-form
          [modo]="modo()"
          [plan]="selectedPlan()"
          (save)="guardarPlan($event)"
          (cancel)="volver()"
        />
      } @else {
        <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm">
          <p class="text-sm text-warm-500">Cargando información del plan de estudio...</p>
        </div>
      }
    </div>
  `,
})
export class CoordinatorStudyPlanFormPageComponent implements OnInit {
  private coordService = inject(CoordinatorManagementService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

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

  guardarPlan(datos: Partial<PlanEstudioItem>): void {
    if (this.modo() === 'CREAR') {
      this.coordService.crearPlanEstudio(datos).subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.toast.success(res.mensajeUsuario || 'Plan de estudio registrado.');
            this.volver();
          }
        },
        error: (err) => this.toast.error(getApiErrorMessage(err)),
      });
    } else {
      const id = this.effectivePlanId();
      if (!id) return;
      this.coordService.actualizarPlanEstudio(id, datos).subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.toast.success(res.mensajeUsuario || 'Plan de estudio modificado.');
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
