import { Component, OnInit, inject, input, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CoordinatorManagementService } from '../../../../core/services/coordinator-management.service';
import { PlanEstudioItem, AsignaturaPlanItem } from '../../../../core/models/role-management.model';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { StudyPlanMeshComponent } from '../components/study-plan-mesh.component';

@Component({
  selector: 'app-coordinator-study-plan-mesh-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, StudyPlanMeshComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      @if (selectedPlan(); as plan) {
        <app-study-plan-mesh
          [plan]="plan"
          [asignaturas]="asignaturas()"
          (back)="volver()"
          (addSemester)="agregarSemestre()"
          (removeSemester)="eliminarSemestreVacio()"
          (createSubject)="abrirCrearAsignatura()"
          (editSubject)="abrirEditarAsignatura($event)"
          (deleteSubject)="eliminarAsignatura($event)"
        />
      } @else {
        <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm space-y-3">
          <p class="text-sm text-warm-500">Cargando malla curricular del plan de estudio...</p>
          <button
            type="button"
            (click)="volver()"
            class="px-3.5 py-2 rounded-xl bg-warm-100 hover:bg-warm-200 text-xs font-semibold text-warm-800 transition-colors"
          >
            ← Volver a Planes de Estudio
          </button>
        </div>
      }
    </div>
  `,
})
export class CoordinatorStudyPlanMeshPageComponent implements OnInit {
  private coordService = inject(CoordinatorManagementService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  planId = input<string>();

  planes = signal<PlanEstudioItem[]>(this.coordService.planes());
  asignaturas = signal<AsignaturaPlanItem[]>([]);

  effectivePlanId = computed(() => {
    return this.planId() || this.route.snapshot.paramMap.get('planId') || '';
  });

  selectedPlan = computed<PlanEstudioItem | null>(() => {
    const id = this.effectivePlanId();
    if (!id) return null;
    return this.planes().find((p) => p.id === id) || null;
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
      this.cargarAsignaturas(id);
    }
  }

  cargarAsignaturas(id: string): void {
    this.coordService.getAsignaturasPorPlan(id).subscribe({
      next: (res) => this.asignaturas.set(res.datos || []),
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  agregarSemestre(): void {
    const plan = this.selectedPlan();
    if (!plan) return;
    const nuevoTotal = plan.totalSemestres + 1;
    this.coordService.actualizarPlanEstudio(plan.id, { totalSemestres: nuevoTotal }).subscribe({
      next: (res) => {
        if (res.exitoso) {
          this.toast.success(`Semestre ${nuevoTotal} agregado al plan.`);
          this.planes.update((prev) =>
            prev.map((p) => (p.id === plan.id ? { ...p, totalSemestres: nuevoTotal } : p))
          );
        }
      },
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  eliminarSemestreVacio(): void {
    const plan = this.selectedPlan();
    if (!plan || plan.totalSemestres <= 1) return;
    const ultimoSem = plan.totalSemestres;
    const tieneAsignaturas = this.asignaturas().some((a) => a.semestre === ultimoSem);

    if (tieneAsignaturas) {
      this.toast.error(`El semestre ${ultimoSem} tiene asignaturas asignadas. Reubícalas o elimínalas primero.`);
      return;
    }

    const nuevoTotal = ultimoSem - 1;
    this.coordService.actualizarPlanEstudio(plan.id, { totalSemestres: nuevoTotal }).subscribe({
      next: (res) => {
        if (res.exitoso) {
          this.toast.success(`Semestre ${ultimoSem} vacío eliminado.`);
          this.planes.update((prev) =>
            prev.map((p) => (p.id === plan.id ? { ...p, totalSemestres: nuevoTotal } : p))
          );
        }
      },
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  abrirCrearAsignatura(): void {
    const id = this.effectivePlanId();
    if (!id) return;
    void this.router.navigate(['/app/coordinador/planes-estudio', id, 'asignaturas', 'nueva']);
  }

  abrirEditarAsignatura(asig: AsignaturaPlanItem): void {
    const id = this.effectivePlanId();
    if (!id) return;
    void this.router.navigate(['/app/coordinador/planes-estudio', id, 'asignaturas', asig.id, 'editar']);
  }

  eliminarAsignatura(asig: AsignaturaPlanItem): void {
    const id = this.effectivePlanId();
    if (!id) return;

    if (confirm(`¿Estás seguro de que deseas desvincular la asignatura ${asig.nombre} (${asig.codigo})?`)) {
      this.coordService.eliminarAsignaturaPlan(id, asig.id).subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.toast.success(res.mensajeUsuario || 'Asignatura eliminada.');
            this.cargarAsignaturas(id);
            this.planes.set(this.coordService.planes());
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
