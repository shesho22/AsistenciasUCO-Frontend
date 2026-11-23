import { Component, ChangeDetectionStrategy, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';

import { FormsModule } from '@angular/forms';
import { ProgramaCreditosItem } from '../../../../core/models/consultas-transversales.model';
import { ConsultasTransversalesService } from '../../../../core/services/consultas-transversales.service';
import { ErrorCargaComponent } from '../../../../shared/components/error-carga/error-carga.component';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { ListadoPaginado } from '../../../../shared/utils/listado-paginado';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

/**
 * HU112: tabla unificada de programas y créditos de la facultad (una fila por programa y plan, con semestres,
 * asignaturas y suma de créditos). La búsqueda y la paginación las resuelve el servidor
 * (GET /decano/programas-creditos); el total que se muestra es `totalElementos`.
 */
@Component({
    selector: 'app-dean-programas-creditos',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, BadgeComponent, ErrorCargaComponent, PaginationComponent],
    template: `
    <section class="superficie p-4 space-y-4" aria-label="Programas y créditos">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="font-serif font-bold text-lg text-warm-900">Programas y Créditos</h2>
          <p class="text-xs text-warm-500">Créditos, semestres y asignaturas de cada plan de estudio de la facultad.</p>
        </div>
        <span class="px-3 py-1.5 rounded-xl bg-primary-50 text-xs font-bold text-primary-800 border border-primary-200">
          {{ listado.total() }} {{ listado.total() === 1 ? 'plan' : 'planes' }}
        </span>
      </div>

      @if (listado.error() && !listado.cargando()) {
        <app-error-carga [error]="listado.error()!" (reintentar)="listado.reintentar()" />
      } @else {
        <input
          type="text"
          aria-label="Filtrar programas y créditos"
          [ngModel]="filtro()"
          (ngModelChange)="onFiltro($event)"
          placeholder="Filtrar por programa, tipo o INP del plan..."
          class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900"
        />
        @if (listado.filas().length === 0 && !listado.cargando()) {
          <p class="text-sm text-warm-500 text-center py-4">No hay programas que coincidan.</p>
        } @else {
          <div class="tabla-scroll">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                  <th scope="col" class="py-2 pr-3">Programa</th>
                  <th scope="col" class="py-2 pr-3">Plan</th>
                  <th scope="col" class="py-2 pr-3 text-right">Semestres</th>
                  <th scope="col" class="py-2 pr-3 text-right">Asignaturas</th>
                  <th scope="col" class="py-2 pr-3 text-right">Créditos</th>
                  <th scope="col" class="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (f of listado.filas(); track clave(f)) {
                  <tr class="border-b border-warm-50">
                    <td class="py-2 pr-3">
                      <span class="font-semibold text-warm-900 block">{{ f.nombrePrograma }}</span>
                      <span class="text-xs text-warm-500">{{ f.nombreTipoPrograma || '—' }} · {{ f.nombreModalidad || '—' }} · {{ f.nombreJornada || '—' }}</span>
                    </td>
                    <td class="py-2 pr-3 font-mono text-xs text-warm-700">{{ f.inpPlanEstudio !== null && f.inpPlanEstudio !== undefined ? 'INP-' + f.inpPlanEstudio : 'Sin plan' }}</td>
                    <td class="py-2 pr-3 text-right text-warm-700">{{ f.totalSemestres }}</td>
                    <td class="py-2 pr-3 text-right text-warm-700">{{ f.totalAsignaturas }}</td>
                    <td class="py-2 pr-3 text-right font-bold text-warm-900">{{ f.totalCreditos }}</td>
                    <td class="py-2">
                      <app-badge [variant]="f.programaActivo && f.planActivo ? 'success' : 'neutral'" size="sm">
                        {{ f.programaActivo && f.planActivo ? 'Vigente' : 'Inactivo' }}
                      </app-badge>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pagination
            [totalItems]="listado.total()"
            [pageSize]="listado.tamano()"
            [currentPage]="listado.pagina()"
            (pageChange)="listado.irAPagina($event)"
            (pageSizeChange)="listado.cambiarTamano($event)"
          ></app-pagination>
        }
      }
    </section>
  `
})
export class DeanProgramasCreditosComponent implements OnInit {
  private readonly consultas = inject(ConsultasTransversalesService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  filtro = signal('');
  private readonly busqueda$ = new Subject<void>();

  readonly listado = new ListadoPaginado<ProgramaCreditosItem>(
    (pagina, tamano) => this.consultas.getProgramasCreditos({ busqueda: this.filtro().trim(), pagina, tamano }),
    (mensaje) => this.toast.error(mensaje)
  );

  ngOnInit(): void {
    this.busqueda$.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.listado.buscar());
    this.listado.cargar();
  }

  /** Identidad de la fila: un programa puede tener varios planes y un programa sin plan trae el plan en nulo. */
  clave(fila: ProgramaCreditosItem): string {
    return `${fila.idPrograma}|${fila.idPlanEstudio ?? ''}`;
  }

  onFiltro(valor: string): void {
    this.filtro.set(valor);
    this.busqueda$.next();
  }
}
