import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { AdminIndicatorsService } from '../../../core/services/admin-indicators.service';
import { GranularidadTendencia } from '../../../core/models/admin-indicators.model';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { ToastService } from '../../../shared/components/toast/toast.component';

/** Dimensiones del lienzo SVG (solo presentación; los valores a graficar los entrega el backend). */
const ANCHO = 600;
const ALTO = 200;
const MARGEN = 20;
/** Margen izquierdo ampliado para las etiquetas del eje vertical. */
const MARGEN_IZQ = 44;

@Component({
  selector: 'app-admin-indicators',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">Indicadores de la institución</h1>
          @if (service.kpis(); as k) {
            <p class="text-sm text-warm-700">{{ k.nombreInstitucion }} · {{ k.nombrePeriodoAcademico ?? 'Sin período' }}</p>
          }
        </div>
        <button type="button" class="min-h-[44px] rounded-xl border border-warm-200 bg-white px-4 py-2 text-sm font-semibold text-warm-800 hover:bg-warm-50" (click)="actualizar()">Actualizar</button>
      </header>

      @if (cargando()) {
        <p role="status" class="rounded-2xl border border-warm-200 bg-white p-4 text-sm text-warm-700 shadow-warm-sm">Cargando indicadores…</p>
      }

      @if (service.kpis(); as k) {
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <article class="rounded-2xl border border-warm-200 bg-white p-4 shadow-warm-sm"><p class="text-xs text-warm-600">Asistencia global</p><p class="text-2xl font-semibold">{{ formatoPorcentaje(k.porcentajeAsistencia) }}</p></article>
          <article class="rounded-2xl border border-warm-200 bg-white p-4 shadow-warm-sm"><p class="text-xs text-warm-600">Ausentismo global</p><p class="text-2xl font-semibold">{{ formatoPorcentaje(k.porcentajeAusentismo) }}</p></article>
          <article class="rounded-2xl border border-warm-200 bg-white p-4 shadow-warm-sm"><p class="text-xs text-warm-600">Cumplimiento de sesiones con asistencia registrada ({{ k.sesionesConRegistro }} / {{ k.sesionesVencidas }})</p><p class="text-2xl font-semibold">{{ formatoPorcentaje(k.porcentajeCumplimiento) }}</p></article>
          <article class="rounded-2xl border border-warm-200 bg-white p-4 shadow-warm-sm"><p class="text-xs text-warm-600">Retención por asistencia (período vigente)</p><p class="text-2xl font-semibold">{{ formatoPorcentaje(k.tasaRetencion) }}</p></article>
          <article class="rounded-2xl border border-warm-200 bg-white p-4 shadow-warm-sm"><p class="text-xs text-warm-600">Estudiantes con matrícula activa</p><p class="text-2xl font-semibold">{{ k.estudiantesConMatriculaActiva }}</p><p class="text-xs text-warm-600">{{ k.estudiantesRegistrados }} registrados</p></article>
          <article class="rounded-2xl border border-warm-200 bg-white p-4 shadow-warm-sm"><p class="text-xs text-warm-600">Docentes con grupo activo</p><p class="text-2xl font-semibold">{{ k.docentesConGrupoActivo }}</p><p class="text-xs text-warm-600">{{ k.docentesRegistrados }} registrados</p></article>
          <article class="rounded-2xl border border-warm-200 bg-white p-4 shadow-warm-sm"><p class="text-xs text-warm-600">Facultades</p><p class="text-2xl font-semibold">{{ k.totalFacultades }}</p></article>
          <article class="rounded-2xl border border-warm-200 bg-white p-4 shadow-warm-sm"><p class="text-xs text-warm-600">Programas</p><p class="text-2xl font-semibold">{{ k.totalProgramas }}</p></article>
        </div>
      }

      <div class="rounded-2xl border border-warm-200 bg-white p-4 shadow-warm-sm">
        <h2 class="font-serif font-bold text-lg text-warm-900">Ausentismo por facultad</h2>
        <p class="mb-3 text-xs text-warm-600" data-testid="nota-horas">Calculado por horas dictadas.</p>
        @if (service.comparativa().length === 0 && !cargando()) {
          <p class="py-6 text-center text-sm text-warm-600">No hay facultades en esta institución.</p>
        } @else {
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            @for (f of service.comparativa(); track f.idFacultad) {
              <article class="rounded-xl border border-warm-200 p-4" data-testid="tarjeta-facultad">
                <p class="font-medium">{{ f.nombreFacultad }}@if (!f.estaActivaFacultad) { <span class="ml-2 text-xs text-warm-600">Inactiva</span> }</p>
                <p class="text-2xl font-semibold">{{ formatoPorcentaje(f.porcentajeAusentismo) }}</p>
                <p class="text-xs text-warm-600">{{ f.horasFalta | number: '1.0-2' }} h de falta sobre {{ f.horasDictadas | number: '1.0-2' }} h dictadas</p>
                <p class="text-xs text-warm-600">{{ f.totalEstudiantes }} estudiantes · {{ f.totalProgramas }} programas · retención {{ formatoPorcentaje(f.tasaRetencion) }}</p>
              </article>
            }
          </div>
        }
      </div>

      <div class="rounded-2xl border border-warm-200 bg-white p-4 shadow-warm-sm">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-serif font-bold text-lg text-warm-900">Tendencia de ausentismo</h2>
            <p class="text-xs text-warm-600" data-testid="nota-horas">Calculado por horas dictadas.</p>
          </div>
          <div class="flex gap-2" role="group" aria-label="Granularidad">
            <button type="button" class="min-h-[44px] rounded-xl border border-warm-200 px-4 py-1 text-sm font-semibold text-warm-800" [class.bg-warm-100]="granularidad() === 'SEMANA'" (click)="cambiarGranularidad('SEMANA')">Semana</button>
            <button type="button" class="min-h-[44px] rounded-xl border border-warm-200 px-4 py-1 text-sm font-semibold text-warm-800" [class.bg-warm-100]="granularidad() === 'MES'" (click)="cambiarGranularidad('MES')">Mes</button>
          </div>
        </div>
        @if (service.tendencia().length === 0 && !cargando()) {
          <p class="py-6 text-center text-sm text-warm-600">No hay sesiones ejecutadas en el período para graficar.</p>
        } @else if (service.tendencia().length > 0) {
          <svg [attr.viewBox]="'0 0 ' + ancho + ' ' + alto" class="h-56 w-full text-warm-700" role="img" aria-label="Tendencia de ausentismo">
            @for (marca of marcasEjeY; track marca) {
              <line [attr.x1]="margenIzq" [attr.x2]="ancho - 20" [attr.y1]="yPunto(marca)" [attr.y2]="yPunto(marca)" stroke="currentColor" stroke-opacity="0.15" />
              <text data-testid="marca-eje-y" [attr.x]="margenIzq - 6" [attr.y]="yPunto(marca) + 4" text-anchor="end" font-size="11" fill="currentColor">{{ marca }}%</text>
            }
            <polyline fill="none" stroke="currentColor" stroke-width="2" [attr.points]="linea()" />
            @for (p of service.tendencia(); track p.inicioIntervalo; let i = $index) {
              @if (p.porcentajeAusentismo !== null) {
                <circle data-testid="punto-tendencia" r="4" [attr.cx]="xPunto(i)" [attr.cy]="yPunto(p.porcentajeAusentismo)">
                  <title>{{ p.inicioIntervalo }} – {{ p.finIntervalo }}: {{ p.porcentajeAusentismo }}% ({{ p.horasFalta }} h de {{ p.horasDictadasEstudiante }} h-estudiante)</title>
                </circle>
                <text data-testid="valor-punto" [attr.x]="xPunto(i)" [attr.y]="yPunto(p.porcentajeAusentismo) - 9" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">{{ p.porcentajeAusentismo }}%</text>
              }
              @if (i === 0 || i === service.tendencia().length - 1) {
                <text data-testid="marca-eje-x" [attr.x]="xPunto(i)" [attr.y]="alto - 2" [attr.text-anchor]="i === 0 ? 'start' : 'end'" font-size="11" fill="currentColor">{{ p.inicioIntervalo }}</text>
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
  readonly margenIzq = MARGEN_IZQ;
  readonly marcasEjeY = [0, 50, 100];
  /** Solicitudes en curso; mientras haya alguna se muestra el indicador de carga. */
  private readonly pendientes = signal(0);
  readonly cargando = computed(() => this.pendientes() > 0);
  readonly granularidad = signal<GranularidadTendencia>('SEMANA');

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.seguir(this.service.consultarKpis()).subscribe({ error: (e) => this.toast.error(getApiErrorMessage(e)) });
    this.seguir(this.service.consultarComparativa()).subscribe({ error: (e) => this.toast.error(getApiErrorMessage(e)) });
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
    return total <= 1 ? ANCHO / 2 : MARGEN_IZQ + ((ANCHO - MARGEN_IZQ - MARGEN) * indice) / (total - 1);
  }

  linea(): string {
    return this.service
      .tendencia()
      .map((p, i) => (p.porcentajeAusentismo === null ? null : `${this.xPunto(i)},${this.yPunto(p.porcentajeAusentismo)}`))
      .filter((punto): punto is string => punto !== null)
      .join(' ');
  }

  private cargarTendencia(): void {
    this.seguir(this.service.consultarTendencia(this.granularidad())).subscribe({ error: (e) => this.toast.error(getApiErrorMessage(e)) });
  }

  private seguir<T>(origen: Observable<T>): Observable<T> {
    this.pendientes.update((n) => n + 1);
    return origen.pipe(finalize(() => this.pendientes.update((n) => Math.max(0, n - 1))));
  }
}
