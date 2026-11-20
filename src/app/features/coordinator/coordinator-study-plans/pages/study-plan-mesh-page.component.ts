import { Component, OnInit, inject, input, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { CoordinatorManagementService } from '../../../../core/services/coordinator-management.service';
import { PlanEstudioItem, AsignaturaPlanItem, CaracterAsignatura } from '../../../../core/models/role-management.model';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { ListadoPaginado } from '../../../../shared/utils/listado-paginado';
import { TAMANO_PAGINA_TABLA } from '../../../../shared/components/tabla-datos/tabla-datos.component';
import { FiltrosMalla, StudyPlanMeshComponent } from '../components/study-plan-mesh.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AssociateSubjectDialogComponent } from '../components/associate-subject-dialog.component';
import { mensajeUi } from '../../../../core/messages/mensajes-ui';

/** Catálogo dbo.Semestre (1 a 10); la DB responde PLA_003 si se intenta superar. */
const MAX_SEMESTRES = 10;

@Component({
    selector: 'app-coordinator-study-plan-mesh-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [StudyPlanMeshComponent, AssociateSubjectDialogComponent, ConfirmDialogComponent],
    template: `
    <div class="space-y-4 animate-fade-in">
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
          [asignaturas]="listado.filas()"
          [caracteres]="caracteres()"
          [totalAsignaturas]="listado.total()"
          [pagina]="listado.pagina()"
          [pageSize]="listado.tamano()"
          [cargando]="listado.cargando()"
          [error]="listado.error()"
          (filtrosChange)="alCambiarFiltros($event)"
          (pageChange)="listado.irAPagina($event)"
          (pageSizeChange)="listado.cambiarTamano($event)"
          (reintentar)="listado.reintentar()"
          (back)="volver()"
          (addSemester)="agregarSemestre()"
          (removeSemester)="eliminarSemestreVacio()"
          (createSubject)="abrirCrearAsignatura()"
          (associateSubject)="abrirAsociar()"
          (editSubject)="abrirEditarAsignatura($event)"
          (removeSubject)="quitarDelPlan($event)"
          [estadoBloqueado]="cambiandoEstado()"
          [idEstadoEnCurso]="idEstadoEnCurso()"
          (toggleEstadoSubject)="pedirCambioEstado($event)"
        />
        @defer (when dialogoAsociarAbierto()) {
          <app-associate-subject-dialog
            [plan]="plan"
            [abierto]="dialogoAsociarAbierto()"
            (asociada)="alAsociar()"
            (cerrado)="dialogoAsociarAbierto.set(false)"
          />
        }
        @defer (when asignaturaAQuitar() !== null) {
          <app-confirm-dialog
            [isOpen]="asignaturaAQuitar() !== null"
            title="Quitar asignatura del plan"
            [message]="'¿Quitar «' + (asignaturaAQuitar()?.nombre ?? '') + '» de este plan de estudio?'"
            confirmLabel="Quitar del plan"
            [destructive]="true"
            (confirmed)="confirmarQuitar()"
            (cancelled)="asignaturaAQuitar.set(null)"
          />
        }
        @defer (when asignaturaACambiarEstado() !== null) {
          <app-confirm-dialog
            [isOpen]="asignaturaACambiarEstado() !== null"
            [title]="confirmacionEstado().titulo"
            [message]="confirmacionEstado().mensaje"
            [confirmLabel]="confirmacionEstado().titulo"
            [destructive]="confirmacionEstado().inactivar"
            (confirmed)="confirmarCambioEstado()"
            (cancelled)="asignaturaACambiarEstado.set(null)"
          />
        }
      } @else {
        <div class="superficie p-12 text-center space-y-3">
          <p class="text-sm text-warm-500">Cargando el plan de estudio...</p>
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
  private readonly coordService = inject(CoordinatorManagementService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  planId = input<string>();

  planes = signal<PlanEstudioItem[]>(this.coordService.planes());
  /** Filtros que viajan al servidor (la malla se filtra y pagina allí, no en el cliente). */
  private filtros: FiltrosMalla = { busqueda: '', semestre: 0, caracter: '' };

  readonly listado = new ListadoPaginado<AsignaturaPlanItem>(
    (pagina, tamano) =>
      this.coordService.getAsignaturasPlanPagina(this.effectivePlanId(), {
        semestre: this.filtros.semestre || null,
        caracter: this.filtros.caracter || null,
        busqueda: this.filtros.busqueda,
        pagina,
        tamano,
      }),
    (mensaje) => this.toast.error(mensaje)
  );
  asignaturas = this.listado.filas;

  effectivePlanId = computed(() => {
    return this.planId() || this.route.snapshot.paramMap.get('planId') || '';
  });

  selectedPlan = computed<PlanEstudioItem | null>(() => {
    const id = this.effectivePlanId();
    if (!id) return null;
    return this.planes().find((p) => p.id === id) || null;
  });

  /** Catálogo de caracteres para el filtro de la malla (no se arma con las filas cargadas). */
  caracteres = signal<CaracterAsignatura[]>([]);

  /** HU082/HU083: aviso visible en la malla (además del toast) cuando no se puede agregar o quitar un semestre. */
  aviso = signal<string | null>(null);

  dialogoAsociarAbierto = signal(false);
  asignaturaAQuitar = signal<AsignaturaPlanItem | null>(null);
  /** HU074: asignatura a la que se le pide confirmar el cambio de estado. */
  asignaturaACambiarEstado = signal<AsignaturaPlanItem | null>(null);
  /** HU074: asignatura cuyo PATCH de estado está en curso (aria-busy en su acción). */
  idEstadoEnCurso = signal<string | null>(null);
  /**
   * HU074 (doble envío): la acción de estado queda deshabilitada desde que se confirma hasta que termina la recarga de la
   * malla (éxito o error). `recargarMalla` marca `listado.cargando` en el mismo tick en que se libera `idEstadoEnCurso`, así
   * que no hay hueco entre el PATCH y la recarga. También se bloquea mientras la malla carga por otra causa: sus filas aún
   * no muestran el estado real.
   */
  cambiandoEstado = computed(() => this.idEstadoEnCurso() !== null || this.listado.cargando());

  /** HU074: textos del diálogo según el estado actual (sin estado informado se trata como activa). */
  confirmacionEstado = computed(() => {
    const asig = this.asignaturaACambiarEstado();
    const nombre = asig?.nombre ?? '';
    const inactivar = asig?.estaActivaAsignatura !== false;
    return inactivar
      ? {
          inactivar,
          titulo: 'Inactivar asignatura',
          mensaje:
            `¿Inactivar «${nombre}»? Mientras esté inactiva no podrá usarse para crear grupos ni asociarse a planes de estudio. ` +
            'Los grupos que ya existen no cambian.',
        }
      : {
          inactivar,
          titulo: 'Activar asignatura',
          mensaje: `¿Activar «${nombre}»? Volverá a estar disponible para crear grupos y asociarse a planes de estudio.`,
        };
  });

  ngOnInit(): void {
    const id = this.effectivePlanId();
    this.listado.tamano.set(TAMANO_PAGINA_TABLA);
    // Siempre se recarga del servidor: la copia en memoria puede tener un total de semestres desactualizado.
    this.recargarPlanes();
    this.coordService.getCaracteresAsignatura().subscribe({
      next: (res) => this.caracteres.set(res.datos ?? []),
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
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

  cargarAsignaturas(id: string): void {
    if (!id) return;
    this.listado.cargar();
  }

  alCambiarFiltros(filtros: FiltrosMalla): void {
    this.filtros = filtros;
    this.listado.buscar();
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
          this.toast.success(mensajeUi('UI_STUDY_PLAN_MESH_PAGE_003', { semestre: nuevoTotal }));
          this.planes.update((prev) =>
            prev.map((p) => (p.id === plan.id ? { ...p, totalSemestres: nuevoTotal } : p))
          );
          // MEJORAS-SERGIO 13: se relee el plan del servidor; tambien refresca la cache del servicio (formularios de asignatura).
          this.recargarPlanes();
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
    // La regla «solo se quita un semestre vacío» la resuelve el backend (PLA_006): se muestra su mensaje.
    const ultimoSem = plan.totalSemestres;
    const nuevoTotal = ultimoSem - 1;
    this.coordService.eliminarSemestrePlan(plan.id, ultimoSem).subscribe({
      next: (res) => {
        if (res.exitoso) {
          this.toast.success(mensajeUi('UI_STUDY_PLAN_MESH_PAGE_004', { semestre: ultimoSem }));
          this.planes.update((prev) =>
            prev.map((p) => (p.id === plan.id ? { ...p, totalSemestres: nuevoTotal } : p))
          );
          this.recargarPlanes();
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
    this.toast.success(mensajeUi('UI_STUDY_PLAN_MESH_PAGE_001'));
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
        this.toast.success(res.mensajeUsuario || mensajeUi('UI_STUDY_PLAN_MESH_PAGE_002'));
        this.recargarMalla();
      },
      error: (err) => this.mostrarRechazo(getApiErrorMessage(err)),
    });
  }

  /** HU074: pide confirmación (ConfirmDialogComponent) antes de activar o inactivar la asignatura. */
  pedirCambioEstado(asig: AsignaturaPlanItem): void {
    // Doble envío: mientras un cambio de estado o la recarga siguen en curso no se abre otro diálogo.
    if (this.cambiandoEstado() || this.asignaturaACambiarEstado() !== null) return;
    this.aviso.set(null);
    this.asignaturaACambiarEstado.set(asig);
  }

  /**
   * HU074: pide al backend el estado DESEADO (Inactivar → false, Activar → true; idempotente) y muestra ASI_011 / ASI_012
   * de `mensajeUsuario` o, si no llega, el respaldo del catálogo de UI según el estado real devuelto. Los rechazos 409
   * (ASI_009, ASI_006) se muestran con su mensaje. En ambos casos se relee la malla para ver el estado real.
   */
  confirmarCambioEstado(): void {
    const asig = this.asignaturaACambiarEstado();
    this.asignaturaACambiarEstado.set(null);
    if (!asig || this.cambiandoEstado()) return;
    const estaActiva = asig.estaActivaAsignatura === false;
    this.idEstadoEnCurso.set(asig.id);
    this.coordService.cambiarEstadoAsignatura(asig.id, estaActiva).subscribe({
      next: (res) => {
        const quedoActiva = res.datos?.estaActivaAsignatura ?? estaActiva;
        this.toast.success(
          res.mensajeUsuario || mensajeUi(quedoActiva ? 'UI_STUDY_PLAN_MESH_PAGE_006' : 'UI_STUDY_PLAN_MESH_PAGE_005')
        );
        this.terminarCambioEstado();
      },
      error: (err) => {
        this.mostrarRechazo(getApiErrorMessage(err));
        this.terminarCambioEstado();
      },
    });
  }

  /** HU074: libera la acción y relee la malla; `listado.cargando` mantiene el bloqueo hasta que la recarga termina. */
  private terminarCambioEstado(): void {
    this.recargarMalla();
    this.idEstadoEnCurso.set(null);
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
