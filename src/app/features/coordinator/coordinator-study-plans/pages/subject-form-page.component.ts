import { Component, OnInit, inject, input, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CoordinatorManagementService } from '../../../../core/services/coordinator-management.service';
import { PlanEstudioItem, AsignaturaPlanItem } from '../../../../core/models/role-management.model';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { SubjectFormComponent } from '../components/subject-form.component';

@Component({
  selector: 'app-coordinator-subject-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, SubjectFormComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      @if (selectedPlan(); as plan) {
        @if (modo() === 'CREAR' || selectedAsignatura()) {
          <app-subject-form
            [plan]="plan"
            [modo]="modo()"
            [asignatura]="selectedAsignatura()"
            [asignaturasPlan]="asignaturas()"
            (save)="guardarAsignatura($event)"
            (cancel)="volverAMalla()"
          />
        } @else {
          <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm">
            <p class="text-sm text-warm-500">Cargando asignatura del plan...</p>
          </div>
        }
      } @else {
        <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm">
          <p class="text-sm text-warm-500">Cargando plan de estudio...</p>
        </div>
      }
    </div>
  `,
})
export class CoordinatorSubjectFormPageComponent implements OnInit {
  private coordService = inject(CoordinatorManagementService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  planId = input<string>();
  asignaturaId = input<string>();

  planes = signal<PlanEstudioItem[]>(this.coordService.planes());
  asignaturas = signal<AsignaturaPlanItem[]>([]);

  effectivePlanId = computed(() => {
    return this.planId() || this.route.snapshot.paramMap.get('planId') || '';
  });

  effectiveAsignaturaId = computed(() => {
    return this.asignaturaId() || this.route.snapshot.paramMap.get('asignaturaId') || '';
  });

  modo = computed<'CREAR' | 'EDITAR'>(() => (this.effectiveAsignaturaId() ? 'EDITAR' : 'CREAR'));

  selectedPlan = computed<PlanEstudioItem | null>(() => {
    const id = this.effectivePlanId();
    if (!id) return null;
    return this.planes().find((p) => p.id === id) || null;
  });

  selectedAsignatura = computed<AsignaturaPlanItem | null>(() => {
    const asigId = this.effectiveAsignaturaId();
    if (!asigId) return null;
    return this.asignaturas().find((a) => a.id === asigId) || null;
  });

  ngOnInit(): void {
    const id = this.effectivePlanId();
    if (!this.selectedPlan()) {
      this.coordService.getPlanesEstudio().subscribe({
        next: (res) => this.planes.set(res.datos || []),
        error: (err) => this.toast.error(getApiErrorMessage(err)),
      });
    }
    if (id) {
      const cached = this.coordService.getAsignaturasPlan(id);
      if (cached.length > 0) {
        this.asignaturas.set(cached);
      }
      this.coordService.getAsignaturasPorPlan(id).subscribe({
        next: (res) => this.asignaturas.set(res.datos || []),
        error: (err) => this.toast.error(getApiErrorMessage(err)),
      });
    }
  }

  guardarAsignatura(event: { datos: Partial<AsignaturaPlanItem>; id?: string }): void {
    const id = this.effectivePlanId();
    if (!id) return;

    if (this.modo() === 'CREAR') {
      this.coordService.crearAsignaturaPlan(id, event.datos).subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.toast.success(res.mensajeUsuario || 'Asignatura registrada en el plan.');
            this.volverAMalla();
          }
        },
        error: (err) => this.toast.error(getApiErrorMessage(err)),
      });
    } else {
      const asigId = event.id || this.effectiveAsignaturaId();
      if (!asigId) return;
      this.coordService.actualizarAsignaturaPlan(id, asigId, event.datos).subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.toast.success(res.mensajeUsuario || 'Asignatura modificada.');
            this.volverAMalla();
          }
        },
        error: (err) => this.toast.error(getApiErrorMessage(err)),
      });
    }
  }

  volverAMalla(): void {
    const id = this.effectivePlanId();
    if (!id) {
      this.router.navigate(['/app/coordinador/planes-estudio']);
      return;
    }
    this.router.navigate(['/app/coordinador/planes-estudio', id, 'malla']);
  }
}
