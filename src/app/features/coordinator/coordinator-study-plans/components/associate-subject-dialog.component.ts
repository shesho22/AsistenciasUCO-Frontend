import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal, computed, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, switchMap, tap, catchError, EMPTY } from 'rxjs';
import { CoordinatorManagementService } from '../../../../core/services/coordinator-management.service';
import { AsignaturaAsociable, CaracterAsignatura, PlanEstudioItem } from '../../../../core/models/role-management.model';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

/**
 * F-COO-005 (CULM-001 B2NM): asocia al plan una asignatura que ya existe en otro plan del programa. Busca entre las
 * asignaturas asociables, pide semestre y carácter y llama a `POST /coordinador/planes-estudio/{planId}/asignaturas-asociadas`.
 * Los rechazos del backend (ASI_003, PLA_004, PLA_006) se muestran con su mensaje y el diálogo sigue abierto.
 */
@Component({
    selector: 'app-associate-subject-dialog',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ModalComponent, ButtonComponent, PaginationComponent],
    template: `
    <app-modal [isOpen]="abierto()" title="Asociar asignatura existente" (closed)="cerrado.emit()">
      <div class="space-y-4">
        <p class="text-xs text-warm-600">
          Busca una asignatura ya registrada, elige su semestre y carácter en {{ plan().nombre }}.
        </p>

        <input
          type="search"
          aria-label="Buscar asignatura asociable por código o nombre"
          placeholder="Buscar por código o nombre..."
          class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          [ngModel]="busqueda()"
          (ngModelChange)="alBuscar($event)"
        />

        <fieldset class="space-y-2">
          <legend class="sr-only">Asignaturas asociables</legend>
          @if (cargando()) {
            <p class="text-sm text-warm-500" role="status">Buscando asignaturas...</p>
          } @else if (resultados().length === 0) {
            <p class="text-sm text-warm-500" role="status">No hay asignaturas disponibles para asociar con ese criterio.</p>
          } @else {
            @for (a of resultados(); track a.idAsignatura) {
              <label
                class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer"
                [class.border-primary-500]="seleccionada()?.idAsignatura === a.idAsignatura"
                [class.border-warm-200]="seleccionada()?.idAsignatura !== a.idAsignatura"
              >
                <input
                  type="radio"
                  name="asignatura-asociable"
                  class="mt-1"
                  [checked]="seleccionada()?.idAsignatura === a.idAsignatura"
                  (change)="seleccionar(a)"
                />
                <span class="text-sm text-warm-900">
                  <strong class="font-mono">{{ a.codigo }}</strong> · {{ a.nombre }}
                  <span class="block text-xs text-warm-500">
                    {{ a.credito }} créditos · {{ a.nombreArea }} · {{ a.nombreComponente }}
                    @if (a.planes) { · En: {{ a.planes }} }
                  </span>
                </span>
              </label>
            }
          }
        </fieldset>

        @if (total() > tamano) {
          <app-pagination
            [currentPage]="pagina()"
            [totalItems]="total()"
            [pageSize]="tamano"
            [showPageSizeSelector]="false"
            (pageChange)="irAPagina($event)"
          />
        }

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label class="block text-xs font-semibold text-warm-700">
            Semestre
            <select
              class="mt-1 w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              [ngModel]="semestre()"
              (ngModelChange)="semestre.set(+$event)"
            >
              <option [ngValue]="0">Selecciona el semestre</option>
              @for (n of semestres(); track n) {
                <option [ngValue]="n">Semestre {{ n }}</option>
              }
            </select>
          </label>
          <label class="block text-xs font-semibold text-warm-700">
            Carácter
            <select
              class="mt-1 w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              [ngModel]="codigoCaracter()"
              (ngModelChange)="codigoCaracter.set($event)"
            >
              <option value="">Selecciona el carácter</option>
              @for (c of caracteres(); track c.codigo) {
                <option [value]="c.codigo">{{ c.nombre }}</option>
              }
            </select>
          </label>
        </div>

        @if (error(); as mensaje) {
          <p role="alert" class="p-3 rounded-xl border border-danger-200 bg-danger-50 text-sm text-danger-800">{{ mensaje }}</p>
        }
      </div>

      <div modal-footer class="flex items-center gap-3">
        <app-button variant="secondary" size="md" (clicked)="cerrado.emit()">Cancelar</app-button>
        <app-button variant="primary" size="md" [disabled]="!puedeAsociar()" [loading]="guardando()" (clicked)="asociar()">
          Asociar
        </app-button>
      </div>
    </app-modal>
  `
})
export class AssociateSubjectDialogComponent {
  private readonly service = inject(CoordinatorManagementService);
  private readonly destroyRef = inject(DestroyRef);

  readonly plan = input.required<PlanEstudioItem>();
  readonly abierto = input<boolean>(false);

  readonly asociada = output<void>();
  readonly cerrado = output<void>();

  readonly tamano = 5;
  readonly busqueda = signal('');
  readonly resultados = signal<AsignaturaAsociable[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(1);
  readonly cargando = signal(false);
  readonly seleccionada = signal<AsignaturaAsociable | null>(null);
  readonly semestre = signal(0);
  readonly codigoCaracter = signal('');
  readonly caracteres = signal<CaracterAsignatura[]>([]);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);

  readonly semestres = computed(() => Array.from({ length: Math.max(this.plan().totalSemestres, 0) }, (_, i) => i + 1));
  readonly puedeAsociar = computed(() => !!this.seleccionada() && this.semestre() > 0 && !!this.codigoCaracter());

  private readonly consulta$ = new Subject<string>();

  constructor() {
    this.consulta$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(() => this.buscar()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();

    effect(() => {
      if (this.abierto()) {
        untracked(() => this.alAbrir());
      }
    });
  }

  alBuscar(valor: string): void {
    this.busqueda.set(valor);
    this.pagina.set(1);
    this.consulta$.next(valor.trim());
  }

  irAPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.buscar().subscribe();
  }

  seleccionar(asignatura: AsignaturaAsociable): void {
    this.seleccionada.set(asignatura);
    this.error.set(null);
  }

  asociar(): void {
    const asignatura = this.seleccionada();
    if (!asignatura || !this.puedeAsociar()) return;
    this.guardando.set(true);
    this.error.set(null);
    this.service
      .asociarAsignaturaPlan(this.plan().id, {
        idAsignatura: asignatura.idAsignatura,
        semestreNumero: this.semestre(),
        codigoCaracter: this.codigoCaracter(),
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.asociada.emit();
        },
        error: (e: unknown) => {
          this.guardando.set(false);
          this.error.set(getApiErrorMessage(e));
        },
      });
  }

  private alAbrir(): void {
    this.busqueda.set('');
    this.pagina.set(1);
    this.seleccionada.set(null);
    this.semestre.set(0);
    this.codigoCaracter.set('');
    this.error.set(null);
    this.service.getCaracteresAsignatura().subscribe({
      next: (res) => this.caracteres.set(res.datos ?? []),
      error: (e: unknown) => this.error.set(getApiErrorMessage(e)),
    });
    this.buscar().subscribe();
  }

  private buscar() {
    this.cargando.set(true);
    return this.service
      .buscarAsignaturasAsociables(this.plan().id, {
        busqueda: this.busqueda().trim(),
        pagina: this.pagina(),
        tamano: this.tamano,
      })
      .pipe(
        tap((page) => {
          this.resultados.set(page.elementos ?? []);
          this.total.set(page.totalElementos ?? 0);
          this.cargando.set(false);
        }),
        catchError((e: unknown) => {
          this.resultados.set([]);
          this.total.set(0);
          this.cargando.set(false);
          this.error.set(getApiErrorMessage(e));
          return EMPTY;
        })
      );
  }
}
