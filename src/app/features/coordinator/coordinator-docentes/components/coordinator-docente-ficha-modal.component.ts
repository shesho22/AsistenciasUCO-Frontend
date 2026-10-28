import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { CoordinatorManagementService } from '../../../../core/services/coordinator-management.service';
import {
  DocentePrograma,
  EstadoPeriodoHistorial,
  GrupoHistorialDocente,
  ResumenCargaDocente,
} from '../../../../core/models/docente-programa.model';
import { BadgeComponent, BadgeVariant } from '../../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';

const TAMANO_POR_DEFECTO = 5;

const ESTADOS: Record<EstadoPeriodoHistorial, { etiqueta: string; variante: BadgeVariant }> = {
  VIGENTE: { etiqueta: 'Vigente', variante: 'success' },
  PROXIMO: { etiqueta: 'Próximo', variante: 'info' },
  FINALIZADO: { etiqueta: 'Finalizado', variante: 'neutral' },
};

/**
 * Ficha del docente para el coordinador (HU094): datos del vinculo, resumen de carga academica en el programa e
 * historial paginado de los grupos dictados en todos los periodos. Todo viene del servidor (sin filtrar en cliente).
 */
@Component({
  selector: 'app-coordinator-docente-ficha-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, BadgeComponent, PaginationComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-950/40 backdrop-blur-xs" role="dialog" aria-modal="true">
      <div class="bg-white border border-warm-200 rounded-3xl max-w-3xl w-full shadow-warm-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div class="p-6 bg-warm-50 border-b border-warm-200/80 flex items-start justify-between">
          <div>
            <h3 class="font-serif font-bold text-xl text-warm-900">{{ docente().nombreCompleto }}</h3>
            <p class="text-xs text-warm-600 mt-0.5">
              {{ docente().codigoTipoIdentificacion }} {{ docente().numeroIdentificacion }} • {{ docente().correo }} • {{ docente().nombreTipoVinculacion }}
            </p>
            <div class="mt-2">
              <app-badge [variant]="docente().estaActivo ? 'success' : 'neutral'">{{ docente().estaActivo ? 'VINCULACIÓN ACTIVA' : 'VINCULACIÓN INACTIVA' }}</app-badge>
            </div>
          </div>
          <button type="button" (click)="cerrar.emit()" aria-label="Cerrar ficha" class="text-warm-400 hover:text-warm-700 p-1.5 rounded-xl hover:bg-warm-100">✕</button>
        </div>

        <div class="p-6 space-y-5 overflow-y-auto">
          @if (error()) {
            <p role="alert" class="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{{ error() }}</p>
          }

          @if (resumen(); as r) {
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="resumen-carga">
              <div class="p-3 rounded-2xl bg-warm-50 border border-warm-100">
                <p class="text-[11px] text-warm-500 font-semibold uppercase">Grupos dictados</p>
                <p class="text-xl font-bold text-warm-900">{{ r.totalGrupos }}</p>
              </div>
              <div class="p-3 rounded-2xl bg-warm-50 border border-warm-100">
                <p class="text-[11px] text-warm-500 font-semibold uppercase">Períodos</p>
                <p class="text-xl font-bold text-warm-900">{{ r.totalPeriodos }}</p>
              </div>
              <div class="p-3 rounded-2xl bg-primary-50 border border-primary-100">
                <p class="text-[11px] text-primary-700 font-semibold uppercase">Grupos vigentes</p>
                <p class="text-xl font-bold text-primary-900">{{ r.gruposVigentes }}</p>
              </div>
              <div class="p-3 rounded-2xl bg-primary-50 border border-primary-100">
                <p class="text-[11px] text-primary-700 font-semibold uppercase">Estudiantes activos</p>
                <p class="text-xl font-bold text-primary-900">{{ r.estudiantesActivosVigentes }}</p>
              </div>
            </div>
          }

          <h4 class="font-serif font-bold text-base text-warm-900">Historial de grupos en el programa</h4>
          @if (cargando()) {
            <div class="space-y-2">
              @for (n of [1, 2, 3]; track n) {
                <div class="h-16 bg-warm-100 rounded-2xl animate-pulse"></div>
              }
            </div>
          } @else if (historial().length === 0) {
            <p class="p-6 text-center text-xs text-warm-400 bg-warm-50 rounded-2xl border border-warm-100">
              El docente no tiene grupos registrados en este programa.
            </p>
          } @else {
            @for (grupo of historial(); track grupo.idGrupo) {
              <div class="p-4 rounded-2xl border border-warm-200 bg-white" data-testid="grupo-historial">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <span class="font-mono text-xs font-bold px-2 py-0.5 rounded bg-warm-100 text-warm-800 mr-2">{{ grupo.codigoGrupo }}</span>
                    <span class="text-xs font-semibold text-warm-500">{{ grupo.nombreGrupo }}</span>
                    <h5 class="font-bold text-sm text-warm-900 mt-1">{{ grupo.nombreAsignatura }}</h5>
                  </div>
                  <app-badge [variant]="varianteEstado(grupo.estadoPeriodo)">{{ etiquetaEstado(grupo.estadoPeriodo) }}</app-badge>
                </div>
                <p class="text-xs text-warm-600 mt-1">
                  {{ grupo.nombrePeriodoAcademico }} ({{ grupo.fechaInicioPeriodo | date: 'mediumDate' }} – {{ grupo.fechaFinPeriodo | date: 'mediumDate' }})
                </p>
                <p class="text-xs text-warm-600 mt-0.5">
                  {{ grupo.estudiantesActivos }} activos de {{ grupo.capacidadMaxima }} cupos • {{ grupo.estudiantesFinalizados }} finalizaron •
                  {{ grupo.estudiantesCanceladosVoluntad + grupo.estudiantesCanceladosInasistencia }} cancelaron
                </p>
              </div>
            }
            <app-pagination
              [totalItems]="totalHistorial()"
              [pageSize]="tamano()"
              [currentPage]="pagina()"
              [showPageSizeSelector]="false"
              (pageChange)="cambiarPagina($event)"
            />
          }
        </div>
      </div>
    </div>
  `,
})
export class CoordinatorDocenteFichaModalComponent implements OnInit {
  private readonly coordService = inject(CoordinatorManagementService);
  private readonly destroyRef = inject(DestroyRef);

  readonly docente = input.required<DocentePrograma>();
  readonly cerrar = output<void>();

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly resumen = signal<ResumenCargaDocente | null>(null);
  readonly historial = signal<GrupoHistorialDocente[]>([]);
  readonly totalHistorial = signal(0);
  readonly pagina = signal(1);
  readonly tamano = signal(TAMANO_POR_DEFECTO);

  ngOnInit(): void {
    this.cargar();
  }

  cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  etiquetaEstado(estado: EstadoPeriodoHistorial): string {
    return ESTADOS[estado]?.etiqueta ?? estado;
  }

  varianteEstado(estado: EstadoPeriodoHistorial): BadgeVariant {
    return ESTADOS[estado]?.variante ?? 'neutral';
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.coordService
      .getFichaDocente(this.docente().idDocente, { pagina: this.pagina(), tamano: this.tamano() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.resumen.set(res.datos.resumen);
          this.historial.set(res.datos.historial ?? []);
          this.totalHistorial.set(res.datos.totalHistorial ?? 0);
          this.cargando.set(false);
        },
        error: (error: unknown) => {
          this.error.set(getApiErrorMessage(error));
          this.historial.set([]);
          this.cargando.set(false);
        },
      });
  }
}
