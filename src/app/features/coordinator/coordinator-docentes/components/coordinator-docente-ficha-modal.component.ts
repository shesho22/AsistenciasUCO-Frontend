import { CifraConBaseComponent } from '../../../../shared/components/cifra-con-base/cifra-con-base.component';
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
import { TAMANO_PAGINA_TABLA, TablaDatosComponent } from '../../../../shared/components/tabla-datos/tabla-datos.component';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

const TAMANO_POR_DEFECTO = TAMANO_PAGINA_TABLA;

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
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ModalComponent, CifraConBaseComponent, DatePipe, BadgeComponent, TablaDatosComponent],
    template: `
    <app-modal
      [isOpen]="true"
      [title]="docente().nombreCompleto"
      [subtitulo]="docente().codigoTipoIdentificacion + ' ' + docente().numeroIdentificacion + ' • ' + docente().correo"
      tamano="3xl"
      etiquetaCerrar="Cerrar ficha"
      (closed)="cerrar.emit()"
    >
      <div modal-encabezado class="mt-2">
        <app-badge [variant]="docente().estaActivo ? 'success' : 'neutral'">{{ docente().estaActivo ? 'VINCULACIÓN ACTIVA' : 'VINCULACIÓN INACTIVA' }}</app-badge>
      </div>

      <div class="space-y-5">
        @if (error()) {
          <p role="alert" class="text-xs font-medium text-danger-700 bg-danger-50 border border-danger-200 rounded-xl px-3 py-2">{{ error() }}</p>
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
        <app-tabla-datos
          etiqueta="Historial de grupos en el programa"
          [columnas]="6"
          anchoMinimo="46rem"
          alturaMaxima="55vh"
          [cargando]="cargando()"
          [filasEsqueleto]="3"
          [vacio]="historial().length === 0"
          mensajeVacio="El docente no tiene grupos registrados en este programa."
          [paginada]="true"
          [totalItems]="totalHistorial()"
          [pagina]="pagina()"
          [tamanoPagina]="tamano()"
          (paginaChange)="cambiarPagina($event)"
          (tamanoPaginaChange)="cambiarTamano($event)"
        >
          <thead>
            <tr>
              <th scope="col">Grupo</th>
              <th scope="col">Asignatura</th>
              <th scope="col">Período</th>
              <th scope="col">Estudiantes</th>
              <th scope="col" class="text-right">Finalizaron / Cancelaron</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          @if (!cargando()) {
            <tbody>
              @for (grupo of historial(); track grupo.idGrupo) {
                <tr data-testid="grupo-historial">
                  <td class="whitespace-nowrap">
                    <span class="rounded bg-warm-100 px-2 py-0.5 font-mono text-xs font-bold text-warm-800">{{ grupo.codigoGrupo }}</span>
                    <span class="mt-0.5 block text-xs font-semibold text-warm-500">{{ grupo.nombreGrupo }}</span>
                  </td>
                  <td class="min-w-[10rem] font-semibold text-warm-900">{{ grupo.nombreAsignatura }}</td>
                  <td class="text-xs text-warm-700">
                    <span class="block font-semibold">{{ grupo.nombrePeriodoAcademico }}</span>
                    <span class="block whitespace-nowrap text-warm-500">
                      {{ grupo.fechaInicioPeriodo | date: 'mediumDate' }} – {{ grupo.fechaFinPeriodo | date: 'mediumDate' }}
                    </span>
                  </td>
                  <td class="whitespace-nowrap text-xs">
                    <app-cifra-con-base [valor]="grupo.estudiantesActivos" [base]="grupo.capacidadMaxima" etiquetaBase="cupos" />
                  </td>
                  <td class="whitespace-nowrap text-right text-xs tabular-nums">
                    {{ grupo.estudiantesFinalizados }} finalizaron •
                    {{ grupo.estudiantesCanceladosVoluntad + grupo.estudiantesCanceladosInasistencia }} cancelaron
                  </td>
                  <td>
                    <app-badge size="sm" [variant]="varianteEstado(grupo.estadoPeriodo)">{{ etiquetaEstado(grupo.estadoPeriodo) }}</app-badge>
                  </td>
                </tr>
              }
            </tbody>
          }
        </app-tabla-datos>
      </div>
    </app-modal>
  `
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

  cambiarTamano(tamano: number): void {
    this.tamano.set(tamano);
    this.pagina.set(1);
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
