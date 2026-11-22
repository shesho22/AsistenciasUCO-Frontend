import { Component, OnInit, inject, input, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActivatedRoute, Router } from '@angular/router';
import { CoordinatorManagementService } from '../../../../core/services/coordinator-management.service';
import { PlanEstudioItem, AsignaturaPlanItem, AreaConocimientoItem, CaracterAsignatura } from '../../../../core/models/role-management.model';
import { ComponenteFormacionItem } from '../../../../core/models/consultas-transversales.model';
import { ConsultasTransversalesService } from '../../../../core/services/consultas-transversales.service';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { SubjectFormComponent } from '../components/subject-form.component';
import { mensajeUi } from '../../../../core/messages/mensajes-ui';

@Component({
    selector: 'app-coordinator-subject-form-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [SubjectFormComponent],
    template: `
    <div class="space-y-4 animate-fade-in">
      @if (selectedPlan(); as plan) {
        @if (modo() === 'CREAR' || selectedAsignatura()) {
          <app-subject-form
            [plan]="plan"
            [modo]="modo()"
            [asignatura]="selectedAsignatura()"
            [componentes]="componentes()"
            [areas]="areas()"
            [caracteres]="caracteres()"
            (save)="guardarAsignatura($event)"
            (cancelar)="volverAMalla()"
          />
        } @else {
          <div class="superficie p-12 text-center">
            <p class="text-sm text-warm-500">Cargando asignatura del plan...</p>
          </div>
        }
      } @else {
        <div class="superficie p-12 text-center">
          <p class="text-sm text-warm-500">Cargando plan de estudio...</p>
        </div>
      }
    </div>
  `
})
export class CoordinatorSubjectFormPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly coordService = inject(CoordinatorManagementService);
  private readonly consultas = inject(ConsultasTransversalesService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  planId = input<string>();
  asignaturaId = input<string>();

  planes = signal<PlanEstudioItem[]>(this.coordService.planes());
  asignaturas = signal<AsignaturaPlanItem[]>([]);
  componentes = signal<ComponenteFormacionItem[]>([]);
  areas = signal<AreaConocimientoItem[]>([]);
  caracteres = signal<CaracterAsignatura[]>([]);

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
    // HU147 / P5: el formulario solo ofrece componentes y áreas que existen en sus tablas.
    this.consultas.getComponentesFormacion().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => this.componentes.set(res.datos || []),
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
    this.coordService.getCaracteresAsignatura().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => this.caracteres.set(res.datos || []),
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
    this.coordService.getAreasConocimiento().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => this.areas.set(res.datos || []),
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
    // MEJORAS-SERGIO 13: siempre se relee el plan; la copia en memoria puede no tener el semestre recien agregado en la malla.
    this.coordService.getPlanesEstudio().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => this.planes.set(res.datos || []),
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
    if (id) {
      const cached = this.coordService.getAsignaturasPlan(id);
      if (cached.length > 0) {
        this.asignaturas.set(cached);
      }
      this.coordService.getAsignaturasPorPlan(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => this.asignaturas.set(res.datos || []),
        error: (err) => this.toast.error(getApiErrorMessage(err)),
      });
    }
  }

  guardarAsignatura(event: { datos: Partial<AsignaturaPlanItem>; id?: string }): void {
    const id = this.effectivePlanId();
    if (!id) return;

    if (this.modo() === 'CREAR') {
      this.coordService.crearAsignaturaPlan(id, event.datos).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.toast.success(res.mensajeUsuario || mensajeUi('UI_SUBJECT_FORM_PAGE_001'));
            this.volverAMalla();
          }
        },
        error: (err) => this.toast.error(getApiErrorMessage(err)),
      });
    } else {
      const asigId = event.id || this.effectiveAsignaturaId();
      if (!asigId) return;
      this.coordService.actualizarAsignaturaPlan(id, asigId, event.datos).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.toast.success(res.mensajeUsuario || mensajeUi('UI_SUBJECT_FORM_PAGE_002'));
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
      void this.router.navigate(['/app/coordinador/planes-estudio']);
      return;
    }
    void this.router.navigate(['/app/coordinador/planes-estudio', id, 'malla']);
  }
}
