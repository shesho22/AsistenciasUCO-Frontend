import { Component, OnInit, inject, input, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CoordinatorManagementService } from '../../../../core/services/coordinator-management.service';
import { PlanEstudioItem, AsignaturaPlanItem } from '../../../../core/models/role-management.model';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { StudyPlanMeshComponent } from '../components/study-plan-mesh.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AssociateSubjectDialogComponent } from '../components/associate-subject-dialog.component';

/** Catálogo dbo.Semestre (1 a 10); la DB responde PLA_003 si se intenta superar. */
const MAX_SEMESTRES = 10;

@Component({
    selector: 'app-coordinator-study-plan-mesh-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [CommonModule, StudyPlanMeshComponent, AssociateSubjectDialogComponent, ConfirmDialogComponent],
    template: `
    <div class="space-y-6 animate-fade-in">
      @if (aviso(); as mensaje) {
        <div
          role="alert"
          class="flex items-start justify-between gap-3 p-4 rounded-2xl border border-danger-200 bg-danger-50 text-sm text-danger-800"
        >
          <span>{{ mensaje }}</span>
          <button type="button" (click)="aviso.set(null)" class="text-xs font-bold text-danger-700 hover:text-danger-900">✕</button>
        </div>
      }
      @if (selectedPlan(); as plan) {
        <app-study-plan-mesh
          [plan]="plan"
          [asignaturas]="asignaturas()"
          (back)="volver()"
          (addSemester)="agregarSemestre()"
          (removeSemester)="eliminarSemestreVacio()"
          (createSubject)="abrirCrearAsignatura()"
          (associateSubject)="abrirAsociar()"
          (editSubject)="abrirEditarAsignatura($event)"
          (removeSubject)="quitarDelPlan($event)"
        />
        <app-associate-subject-dialog
          [plan]="plan"
          [abierto]="dialogoAsociarAbierto()"
          (asociada)="alAsociar()"
          (cerrado)="dialogoAsociarAbierto.set(false)"
        />
        <app-confirm-dialog
          [isOpen]="asignaturaAQuitar() !== null"
          title="Quitar asignatura del plan"
          [message]="'¿Quitar «' + (asignaturaAQuitar()?.nombre ?? '') + '» de este plan de estudio?'"
          confirmLabel="Quitar del plan"
          [destructive]="true"
          (confirmed)="confirmarQuitar()"
          (cancelled)="asignaturaAQuitar.set(null)"
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
  `
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

  /** HU082/HU083: aviso visible en la malla (además del toast) cuando no se puede agregar o quitar un semestre. */
  aviso = signal<string | null>(null);

  dialogoAsociarAbierto = signal(false);
  asignaturaAQuitar = signal<AsignaturaPlanItem | null>(null);

  ngOnInit(): void {
    const id = this.effectivePlanId();
    // Siempre se recarga del servidor: la copia en memoria puede tener un total de semestres desactualizado.
    this.recargarPlanes();
    if (id) {
      this.cargarAsignaturas(id);
    }
  }

  recargarPlanes(): void {
    this.coordService.getPlanesEstudio().subscribe({
      next: (res) => this.planes.set(res.datos || []),
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  private mostrarRechazo(mensaje: string): void {
    this.aviso.set(mensaje);
    this.toast.error(mensaje);
  }

  /** El backend expone el semestre como `codigoSemestre` (p. ej. "S8"); el mock usa `semestre` numérico. */
  private numeroSemestre(asignatura: AsignaturaPlanItem): number {
    const raw = asignatura.semestre ?? (asignatura as unknown as { codigoSemestre?: string }).codigoSemestre;
    const numero = Number(String(raw ?? '').replace(/\D/g, ''));
    return Number.isFinite(numero) ? numero : 0;
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
    this.aviso.set(null);
    if (plan.totalSemestres >= MAX_SEMESTRES) {
      this.mostrarRechazo(`El plan ya tiene el máximo de ${MAX_SEMESTRES} semestres; no se puede agregar otro.`);
      return;
    }
    const nuevoTotal = plan.totalSemestres + 1;
    this.coordService.agregarSemestrePlan(plan.id).subscribe({
      next: (res) => {
        if (res.exitoso) {
          this.toast.success(`Semestre ${nuevoTotal} agregado al plan.`);
          this.planes.update((prev) =>
            prev.map((p) => (p.id === plan.id ? { ...p, totalSemestres: nuevoTotal } : p))
          );
        }
      },
      error: (err) => {
        this.mostrarRechazo(getApiErrorMessage(err));
        this.recargarPlanes();
      },
    });
  }

  eliminarSemestreVacio(): void {
    const plan = this.selectedPlan();
    if (!plan) return;
    this.aviso.set(null);
    if (plan.totalSemestres <= 1) {
      this.mostrarRechazo('El plan debe conservar al menos un semestre.');
      return;
    }
    const ultimoSem = plan.totalSemestres;
    const tieneAsignaturas = this.asignaturas().some((a) => this.numeroSemestre(a) === ultimoSem);

    if (tieneAsignaturas) {
      this.mostrarRechazo(
        `El semestre ${ultimoSem} tiene asignaturas asignadas, por eso no se puede quitar. Reubícalas o elimínalas primero.`
      );
      return;
    }

    const nuevoTotal = ultimoSem - 1;
    this.coordService.eliminarSemestrePlan(plan.id, ultimoSem).subscribe({
      next: (res) => {
        if (res.exitoso) {
          this.toast.success(`Semestre ${ultimoSem} vacío eliminado.`);
          this.planes.update((prev) =>
            prev.map((p) => (p.id === plan.id ? { ...p, totalSemestres: nuevoTotal } : p))
          );
        }
      },
      error: (err) => {
        this.mostrarRechazo(getApiErrorMessage(err));
        this.recargarPlanes();
      },
    });
  }

  abrirAsociar(): void {
    this.aviso.set(null);
    this.dialogoAsociarAbierto.set(true);
  }

  /** F-COO-005: la asignatura quedó asociada; se recarga la malla y los totales del plan. */
  alAsociar(): void {
    this.dialogoAsociarAbierto.set(false);
    this.toast.success('Asignatura asociada al plan.');
    this.recargarMalla();
  }

  /** F-COO-005: pide confirmación con ConfirmDialogComponent (alertdialog; E.2 retiró window.confirm). */
  quitarDelPlan(asig: AsignaturaPlanItem): void {
    this.asignaturaAQuitar.set(asig);
  }

  /** Quita el vínculo con el plan (no borra la asignatura). */
  confirmarQuitar(): void {
    const asig = this.asignaturaAQuitar();
    const id = this.effectivePlanId();
    this.asignaturaAQuitar.set(null);
    if (!asig || !id) return;
    this.aviso.set(null);
    this.coordService.desvincularAsignaturaPlan(id, asig.id).subscribe({
      next: (res) => {
        this.toast.success(res.mensajeUsuario || 'Asignatura quitada del plan.');
        this.recargarMalla();
      },
      error: (err) => this.mostrarRechazo(getApiErrorMessage(err)),
    });
  }

  private recargarMalla(): void {
    const id = this.effectivePlanId();
    if (!id) return;
    this.cargarAsignaturas(id);
    this.recargarPlanes();
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

  volver(): void {
    void this.router.navigate(['/app/coordinador/planes-estudio']);
  }
}
