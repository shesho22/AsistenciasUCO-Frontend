import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CoordinatorIndicatorsService } from '../../../core/services/coordinator-indicators.service';
import { AlertaTemprana, SemaforoAlerta } from '../../../core/models/coordinator-indicators.model';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { CoordinatorFichaModalComponent } from './components/coordinator-ficha-modal.component';

@Component({
  selector: 'app-coordinator-indicators',
  standalone: true,
  imports: [PaginationComponent, CoordinatorFichaModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <header>
        <h1 class="text-2xl font-semibold text-neutral-900">Indicadores del programa</h1>
        @if (service.kpis(); as k) {
          <p class="text-sm text-neutral-600">{{ k.nombrePrograma }} · {{ k.nombrePeriodoAcademico ?? 'Sin período' }}</p>
        }
      </header>

      @if (service.kpis(); as k) {
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Estudiantes</p><p class="text-2xl font-semibold">{{ k.totalEstudiantes }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">En riesgo</p><p class="text-2xl font-semibold">{{ k.estudiantesRiesgo }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">En pérdida</p><p class="text-2xl font-semibold">{{ k.estudiantesPerdida }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Permanencia</p><p class="text-2xl font-semibold">{{ formatoPorcentaje(k.tasaPermanencia) }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Sesiones ejecutadas</p><p class="text-2xl font-semibold">{{ k.sesionesEjecutadas }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Vencidas sin registro</p><p class="text-2xl font-semibold">{{ k.sesionesVencidasSinRegistro }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Cumplimiento</p><p class="text-2xl font-semibold">{{ formatoPorcentaje(k.porcentajeCumplimiento) }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Progreso del calendario</p><p class="text-2xl font-semibold">{{ formatoPorcentaje(k.porcentajeProgresoCalendario) }}</p></article>
        </div>
      }

      <div class="rounded-xl border border-neutral-100 bg-white p-4">
        <h2 class="mb-3 text-lg font-semibold">Alertas tempranas</h2>
        <div class="mb-3 flex flex-wrap gap-3">
          <input class="rounded-lg border border-neutral-200 px-3 py-2 text-sm" placeholder="Buscar por nombre" aria-label="Buscar por nombre"
                 [value]="filtroNombre()" (input)="filtroNombre.set($any($event.target).value)" (keyup.enter)="aplicarFiltros()" />
          <select class="rounded-lg border border-neutral-200 px-3 py-2 text-sm" aria-label="Semáforo"
                  (change)="filtroSemaforo.set($any($event.target).value || null); aplicarFiltros()">
            <option value="">Todos</option>
            <option value="ROJO">Rojo</option>
            <option value="AMBAR">Ámbar</option>
          </select>
        </div>

        @if (service.alertas().length === 0) {
          <p class="py-6 text-center text-sm text-neutral-500">No hay estudiantes con alerta en este período.</p>
        } @else {
          <table class="w-full text-left text-sm">
            <thead class="text-xs uppercase text-neutral-500">
              <tr><th class="py-2">Estudiante</th><th>Inasistencia</th><th>Faltas</th><th>Estado</th><th>Semáforo</th><th></th></tr>
            </thead>
            <tbody>
              @for (a of service.alertas(); track a.idEstudiante) {
                <tr class="border-t border-neutral-100">
                  <td class="py-2">{{ a.nombreCompleto }}</td>
                  <td>{{ formatoPorcentaje(a.porcentajeInasistencia) }}</td>
                  <td>{{ a.faltasSinJustaCausa }}</td>
                  <td>{{ a.codigoPermanencia }}</td>
                  <td>{{ a.semaforo }}</td>
                  <td><button type="button" class="text-info-700 hover:underline" (click)="abrirFicha(a)">Ficha</button></td>
                </tr>
              }
            </tbody>
          </table>
        }
        <app-pagination
          [totalItems]="service.totalAlertas()"
          [pageSize]="tamano"
          [currentPage]="pagina()"
          [showPageSizeSelector]="false"
          (pageChange)="onPageChange($event)"
        />
      </div>

      @if (estudianteFicha(); as e) {
        <app-coordinator-ficha-modal [idEstudiante]="e.idEstudiante" [nombre]="e.nombreCompleto" (cerrar)="cerrarFicha()" />
      }
    </section>
  `,
})
export class CoordinatorIndicatorsComponent implements OnInit {
  readonly service = inject(CoordinatorIndicatorsService);
  private readonly toast = inject(ToastService);

  readonly tamano = 10;
  readonly pagina = signal(1);
  readonly filtroNombre = signal('');
  readonly filtroSemaforo = signal<SemaforoAlerta | null>(null);
  readonly estudianteFicha = signal<AlertaTemprana | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.service.consultarKpis().subscribe({ error: (e) => this.toast.error(getApiErrorMessage(e)) });
    this.cargarAlertas();
  }

  aplicarFiltros(): void {
    this.pagina.set(1);
    this.cargarAlertas();
  }

  onPageChange(pagina: number): void {
    this.pagina.set(pagina);
    this.cargarAlertas();
  }

  abrirFicha(alerta: AlertaTemprana): void {
    this.estudianteFicha.set(alerta);
  }

  cerrarFicha(): void {
    this.estudianteFicha.set(null);
  }

  formatoPorcentaje(valor: number | null): string {
    return valor === null ? 'Sin datos' : `${valor}%`;
  }

  private cargarAlertas(): void {
    this.service
      .consultarAlertas({
        pagina: this.pagina(),
        tamano: this.tamano,
        semaforo: this.filtroSemaforo() ?? undefined,
        nombre: this.filtroNombre() || undefined,
      })
      .subscribe({ error: (e) => this.toast.error(getApiErrorMessage(e)) });
  }
}
