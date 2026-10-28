import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, finalize } from 'rxjs';
import { GrupoOferta, OfertaAcademicaService } from '../../../core/services/oferta-academica.service';
import { SolicitudIngresoService } from '../../../core/services/solicitud-ingreso.service';
import { CardComponent } from '../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';

const DEBOUNCE_MS = 300;

/**
 * HU008 (estudiante): oferta de grupos en periodos vigentes o proximos (especificas de sus programas y transversales de
 * su institucion, marcadas "Transversal"), con docente, horario y cupos.
 * Desde aqui solicita el ingreso a un grupo (flujo HU053); si ya esta matriculado o tiene una solicitud abierta, lo ve
 * indicado en lugar del boton.
 */
@Component({
  selector: 'app-student-group-offer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, CardComponent, BadgeComponent, PaginationComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div>
        <h1 class="font-serif text-2xl sm:text-3xl font-bold text-warm-900">Oferta de grupos</h1>
        <p class="text-sm text-warm-600 mt-1">Grupos de tus programas y asignaturas transversales en el período vigente y los próximos, con sus cupos disponibles.</p>
      </div>

      <input
        type="text"
        [ngModel]="busqueda()"
        (ngModelChange)="onBusquedaChange($event)"
        name="busquedaOferta"
        maxlength="50"
        placeholder="Buscar por asignatura, código o grupo..."
        class="w-full px-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 shadow-warm-sm"
      />

      @if (error()) {
        <p role="alert" class="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{{ error() }}</p>
      }

      @if (cargando()) {
        <p class="text-sm text-warm-600">Cargando oferta...</p>
      } @else if (grupos().length === 0) {
        <app-card>
          <p class="text-sm text-warm-600 text-center py-6">No hay grupos ofertados para tus programas con este filtro.</p>
        </app-card>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (g of grupos(); track g.idGrupo) {
            <app-card data-testid="grupo-oferta">
              <div class="flex flex-col gap-3 h-full">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-xs font-mono text-warm-500">
                      {{ g.codigoAsignatura }}
                      @if (g.transversal) {
                        <span data-testid="etiqueta-transversal" class="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-sans bg-primary-50 text-primary-800 border border-primary-200">
                          Transversal · {{ g.tipoAsignatura === 'BASICA' ? 'Básica' : 'Institucional' }}
                        </span>
                      }
                    </p>
                    <p class="font-semibold text-warm-900">{{ g.nombreAsignatura }}</p>
                    <p class="text-xs text-warm-600">{{ g.nombreGrupo }} · Docente: {{ g.nombreDocente }}</p>
                  </div>
                  <app-badge [variant]="g.estadoPeriodo === 'VIGENTE' ? 'success' : 'info'">
                    {{ g.estadoPeriodo === 'VIGENTE' ? 'Vigente' : 'Próximo' }}
                  </app-badge>
                </div>
                <p class="text-xs text-warm-600">
                  {{ g.nombrePeriodoAcademico }} ({{ g.fechaInicioPeriodo | date: 'mediumDate' }} – {{ g.fechaFinPeriodo | date: 'mediumDate' }})
                </p>
                <p class="text-xs text-warm-600">Horario: {{ g.horario || 'Sin horario registrado' }}</p>
                <div class="flex items-center justify-between p-2.5 rounded-xl bg-warm-50 border border-warm-100">
                  <span class="text-xs text-warm-600 font-medium">Cupos disponibles</span>
                  <span
                    class="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                    [class]="g.cuposDisponibles > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'"
                  >
                    {{ g.cuposDisponibles }} de {{ g.capacidadMaxima }}
                  </span>
                </div>
                @if (g.matriculado) {
                  <app-badge variant="success">Ya estás matriculado</app-badge>
                } @else if (g.estadoSolicitud) {
                  <app-badge variant="warning">Solicitud {{ g.estadoSolicitud === 'EN_ESPERA' ? 'en espera' : 'pendiente' }}</app-badge>
                } @else {
                  <button
                    type="button"
                    data-accion="solicitar-ingreso"
                    [disabled]="enviando() === g.idGrupo"
                    (click)="solicitar(g)"
                    class="w-full px-4 py-2 text-sm font-semibold rounded-xl text-white bg-primary-700 hover:bg-primary-800 disabled:opacity-60"
                  >
                    {{ enviando() === g.idGrupo ? 'Enviando...' : g.cuposDisponibles > 0 ? 'Solicitar ingreso' : 'Solicitar ingreso (lista de espera)' }}
                  </button>
                }
              </div>
            </app-card>
          }
        </div>
        <app-pagination
          [totalItems]="total()"
          [pageSize]="tamano()"
          [currentPage]="pagina()"
          [showPageSizeSelector]="true"
          (pageChange)="cambiarPagina($event)"
          (pageSizeChange)="cambiarTamano($event)"
        />
      }
    </div>
  `,
})
export class StudentGroupOfferComponent implements OnInit {
  private readonly ofertaService = inject(OfertaAcademicaService);
  private readonly solicitudService = inject(SolicitudIngresoService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly busquedas = new Subject<void>();

  readonly grupos = signal<GrupoOferta[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(1);
  readonly tamano = signal(10);
  readonly busqueda = signal('');
  readonly cargando = signal(false);
  readonly error = signal('');
  /** id del grupo cuya solicitud se esta enviando (evita doble envio). */
  readonly enviando = signal<string | null>(null);

  constructor() {
    this.busquedas.pipe(debounceTime(DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargar());
  }

  ngOnInit(): void {
    this.cargar();
  }

  onBusquedaChange(valor: string): void {
    this.busqueda.set(valor ?? '');
    this.pagina.set(1);
    this.busquedas.next();
  }

  cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  cambiarTamano(tamano: number): void {
    this.tamano.set(tamano);
    this.pagina.set(1);
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.ofertaService
      .consultar({ busqueda: this.busqueda(), pagina: this.pagina(), tamano: this.tamano() })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (res) => {
          this.grupos.set(res.datos ?? []);
          this.total.set(res.total ?? (res.datos ?? []).length);
        },
        error: (error: unknown) => {
          this.grupos.set([]);
          this.total.set(0);
          this.error.set(getApiErrorMessage(error));
        },
      });
  }

  solicitar(grupo: GrupoOferta): void {
    if (this.enviando()) return;
    this.enviando.set(grupo.idGrupo);
    this.solicitudService
      .solicitar(grupo.idGrupo)
      .pipe(finalize(() => this.enviando.set(null)))
      .subscribe({
        next: () => {
          this.toast.success(`Solicitud enviada para ${grupo.nombreAsignatura}. El docente del grupo la revisará.`);
          this.cargar();
        },
        error: (error: unknown) => this.toast.error(getApiErrorMessage(error)),
      });
  }
}
