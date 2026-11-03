import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { CoordinatorIndicatorsService } from '../../../../core/services/coordinator-indicators.service';
import { BitacoraSesion, FichaEstudiante } from '../../../../core/models/coordinator-indicators.model';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SessionTimeZoneService } from '../../../../core/services/session-timezone.service';

@Component({
  selector: 'app-coordinator-ficha-modal',
  standalone: true,
  imports: [PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div class="mb-4 flex items-start justify-between gap-4">
          <h2 class="text-xl font-semibold text-gray-900">Ficha de {{ nombre() }}</h2>
          <button type="button" class="text-gray-500 hover:text-gray-800" aria-label="Cerrar" (click)="cancelar()">✕</button>
        </div>

        @if (error()) {
          <p class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ error() }}</p>
        }

        @if (ficha(); as f) {
          <section class="mb-6 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
            <p><span class="font-medium">Nombre:</span> {{ f.nombreCompleto }}</p>
            <p><span class="font-medium">Identificación:</span> {{ f.tipoIdentificacion }} {{ f.numeroIdentificacion }}</p>
            <p><span class="font-medium">Correo:</span> {{ f.correo }}</p>
            <p><span class="font-medium">Programa:</span> {{ f.nombrePrograma }}</p>
          </section>

          <h3 class="mb-2 text-sm font-semibold text-gray-900">Resumen por asignatura</h3>
          <div class="mb-6 overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="text-xs uppercase text-gray-500">
                <tr><th class="py-2">Asignatura</th><th>Grupo</th><th>Sesiones</th><th>Asist.</th><th>Faltas</th><th>Excusas</th><th>Inasistencia</th><th>Estado</th></tr>
              </thead>
              <tbody>
                @for (r of f.resumenPorAsignatura; track r.idGrupo) {
                  <tr class="border-t border-gray-100">
                    <td class="py-2">{{ r.nombreAsignatura }}</td>
                    <td>{{ r.codigoGrupo }}</td>
                    <td>{{ r.sesionesEjecutadas }}</td>
                    <td>{{ r.asistencias }}</td>
                    <td>{{ r.faltasSinJustaCausa }}</td>
                    <td>{{ r.excusas }}</td>
                    <td>{{ porcentaje(r.porcentajeInasistencia) }}</td>
                    <td>{{ r.codigoPermanencia }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <h3 class="mb-2 text-sm font-semibold text-gray-900">Bitácora de asistencia</h3>
        <p class="mb-2 text-xs text-gray-500">Horas en {{ timeZone.zoneLabel() }}.</p>
        <ol class="mb-3 space-y-2">
          @for (s of bitacora(); track s.idSesion + s.idGrupo) {
            <li class="rounded-lg border border-gray-100 p-3 text-sm">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="font-medium">{{ s.nombreAsignatura }} · {{ s.nombreSesion }}</span>
                <span class="text-xs text-gray-500">{{ timeZone.formatTemporal(s.fechaHoraInicio) }}</span>
              </div>
              <p class="text-gray-700">
                {{ etiquetaAsistencia(s.asistio) }}@if (s.nombreRazonCausa) { · {{ s.nombreRazonCausa }} }
              </p>
            </li>
          }
        </ol>
        <app-pagination
          [totalItems]="totalBitacora()"
          [pageSize]="tamano"
          [currentPage]="pagina()"
          [showPageSizeSelector]="false"
          (pageChange)="onPageChange($event)"
        />
      </div>
    </div>
  `,
})
export class CoordinatorFichaModalComponent implements OnInit {
  private readonly service = inject(CoordinatorIndicatorsService);
  readonly timeZone = inject(SessionTimeZoneService);

  readonly idEstudiante = input.required<string>();
  readonly nombre = input<string>('');
  readonly cerrar = output<void>();

  readonly tamano = 10;
  readonly ficha = signal<FichaEstudiante | null>(null);
  readonly bitacora = signal<BitacoraSesion[]>([]);
  readonly totalBitacora = signal(0);
  readonly pagina = signal(1);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.service.consultarFicha(this.idEstudiante()).subscribe({
      next: (r) => this.ficha.set(r.datos),
      error: (e) => this.error.set(getApiErrorMessage(e)),
    });
    this.cargarBitacora();
  }

  onPageChange(pagina: number): void {
    this.pagina.set(pagina);
    this.cargarBitacora();
  }

  cancelar(): void {
    this.cerrar.emit();
  }

  etiquetaAsistencia(asistio: boolean | null): string {
    if (asistio === null) return 'Sin registro';
    return asistio ? 'Asistió' : 'No asistió';
  }

  porcentaje(valor: number | null): string {
    return valor === null ? 'Sin datos' : `${valor}%`;
  }

  private cargarBitacora(): void {
    this.service.consultarBitacora(this.idEstudiante(), this.pagina(), this.tamano).subscribe({
      next: (r) => {
        this.bitacora.set(r.datos);
        this.totalBitacora.set(r.total ?? 0);
      },
      error: (e) => this.error.set(getApiErrorMessage(e)),
    });
  }
}
