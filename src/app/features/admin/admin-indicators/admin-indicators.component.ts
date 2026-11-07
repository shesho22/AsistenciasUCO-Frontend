import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { AdminIndicatorsService } from '../../../core/services/admin-indicators.service';
import { GranularidadTendencia } from '../../../core/models/admin-indicators.model';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { ToastService } from '../../../shared/components/toast/toast.component';

/** Dimensiones del lienzo SVG (solo presentación; los valores a graficar los entrega el backend). */
const ANCHO = 600;
const ALTO = 200;
const MARGEN = 20;

@Component({
  selector: 'app-admin-indicators',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-neutral-900">Indicadores de la institución</h1>
          @if (service.kpis(); as k) {
            <p class="text-sm text-neutral-600">{{ k.nombreInstitucion }} · {{ k.nombrePeriodoAcademico ?? 'Sin período' }}</p>
          }
        </div>
        <button type="button" class="rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50" (click)="actualizar()">Actualizar</button>
      </header>

      @if (service.kpis(); as k) {
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Asistencia global</p><p class="text-2xl font-semibold">{{ formatoPorcentaje(k.porcentajeAsistencia) }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Ausentismo global</p><p class="text-2xl font-semibold">{{ formatoPorcentaje(k.porcentajeAusentismo) }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Cumplimiento de sesiones con asistencia registrada ({{ k.sesionesConRegistro }} / {{ k.sesionesVencidas }})</p><p class="text-2xl font-semibold">{{ formatoPorcentaje(k.porcentajeCumplimiento) }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Retención por asistencia (período vigente)</p><p class="text-2xl font-semibold">{{ formatoPorcentaje(k.tasaRetencion) }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Estudiantes con matrícula activa</p><p class="text-2xl font-semibold">{{ k.estudiantesConMatriculaActiva }}</p><p class="text-xs text-neutral-500">{{ k.estudiantesRegistrados }} registrados</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Docentes con grupo activo</p><p class="text-2xl font-semibold">{{ k.docentesConGrupoActivo }}</p><p class="text-xs text-neutral-500">{{ k.docentesRegistrados }} registrados</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Facultades</p><p class="text-2xl font-semibold">{{ k.totalFacultades }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Programas</p><p class="text-2xl font-semibold">{{ k.totalProgramas }}</p></article>
        </div>
      }

      <div class="rounded-xl border border-neutral-100 bg-white p-4">
        <h2 class="mb-3 text-lg font-semibold">Ausentismo por facultad</h2>
        @if (service.comparativa().length === 0) {
          <p class="py-6 text-center text-sm text-neutral-500">No hay facultades en esta institución.</p>
        } @else {
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            @for (f of service.comparativa(); track f.idFacultad) {
              <article class="rounded-lg border border-neutral-100 p-4" data-testid="tarjeta-facultad">
                <p class="font-medium">{{ f.nombreFacultad }}@if (!f.estaActivaFacultad) { <span class="ml-2 text-xs text-neutral-500">Inactiva</span> }</p>
                <p class="text-2xl font-semibold">{{ formatoPorcentaje(f.porcentajeAusentismo) }}</p>
                <p class="text-xs text-neutral-500">{{ f.totalEstudiantes }} estudiantes · {{ f.totalProgramas }} programas · retención {{ formatoPorcentaje(f.tasaRetencion) }}</p>
              </article>
            }
          </div>
        }
      </div>

      <div class="rounded-xl border border-neutral-100 bg-white p-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold">Tendencia de ausentismo</h2>
          <div class="flex gap-2" role="group" aria-label="Granularidad">
            <button type="button" class="rounded-lg border px-3 py-1 text-sm" [class.bg-neutral-100]="granularidad() === 'SEMANA'" (click)="cambiarGranularidad('SEMANA')">Semana</button>
            <button type="button" class="rounded-lg border px-3 py-1 text-sm" [class.bg-neutral-100]="granularidad() === 'MES'" (click)="cambiarGranularidad('MES')">Mes</button>
          </div>
        </div>
        @if (service.tendencia().length === 0) {
          <p class="py-6 text-center text-sm text-neutral-500">No hay sesiones ejecutadas en el período para graficar.</p>
        } @else {
          <svg [attr.viewBox]="'0 0 ' + ancho + ' ' + alto" class="h-56 w-full" role="img" aria-label="Tendencia de ausentismo">
            <polyline fill="none" stroke="currentColor" stroke-width="2" [attr.points]="linea()" />
            @for (p of service.tendencia(); track p.inicioIntervalo; let i = $index) {
              @if (p.porcentajeAusentismo !== null) {
                <circle data-testid="punto-tendencia" r="4" [attr.cx]="xPunto(i)" [attr.cy]="yPunto(p.porcentajeAusentismo)">
                  <title>{{ p.inicioIntervalo }} – {{ p.finIntervalo }}: {{ p.porcentajeAusentismo }}%</title>
                </circle>
              }
            }
          </svg>
        }
      </div>
    </section>
  `,
})
export class AdminIndicatorsComponent implements OnInit {
  readonly service = inject(AdminIndicatorsService);
  private readonly toast = inject(ToastService);

  readonly ancho = ANCHO;
  readonly alto = ALTO;
  readonly granularidad = signal<GranularidadTendencia>('SEMANA');

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.service.consultarKpis().subscribe({ error: (e) => this.toast.error(getApiErrorMessage(e)) });
    this.service.consultarComparativa().subscribe({ error: (e) => this.toast.error(getApiErrorMessage(e)) });
    this.cargarTendencia();
  }

  actualizar(): void {
    this.cargar();
  }

  cambiarGranularidad(valor: GranularidadTendencia): void {
    this.granularidad.set(valor);
    this.cargarTendencia();
  }

  formatoPorcentaje(valor: number | null): string {
    return valor === null ? 'Sin datos' : `${valor}%`;
  }

  /** Solo presentación: ubica un valor (0–100) recibido dentro del lienzo. */
  yPunto(valor: number): number {
    return MARGEN + (ALTO - 2 * MARGEN) * (1 - Math.min(Math.max(valor, 0), 100) / 100);
  }

  xPunto(indice: number): number {
    const total = this.service.tendencia().length;
    return total <= 1 ? ANCHO / 2 : MARGEN + ((ANCHO - 2 * MARGEN) * indice) / (total - 1);
  }

  linea(): string {
    return this.service
      .tendencia()
      .map((p, i) => (p.porcentajeAusentismo === null ? null : `${this.xPunto(i)},${this.yPunto(p.porcentajeAusentismo)}`))
      .filter((punto): punto is string => punto !== null)
      .join(' ');
  }

  private cargarTendencia(): void {
    this.service.consultarTendencia(this.granularidad()).subscribe({ error: (e) => this.toast.error(getApiErrorMessage(e)) });
  }
}
