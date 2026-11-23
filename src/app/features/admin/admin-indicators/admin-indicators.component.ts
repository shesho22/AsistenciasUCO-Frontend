import { HorasMinutosPipe } from '../../../shared/pipes/horas-minutos.pipe';
import { CifraConBaseComponent } from '../../../shared/components/cifra-con-base/cifra-con-base.component';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { AdminIndicatorsService } from '../../../core/services/admin-indicators.service';
import { GranularidadTendencia } from '../../../core/models/admin-indicators.model';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { RolSinAmbito, rolSinAmbito } from '../../../core/api/errors/sin-ambito.util';
import { SinEntidadAsignadaComponent } from '../../../shared/components/sin-entidad-asignada/sin-entidad-asignada.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import {
  TablaDatosComponent,
  TAMANO_PAGINA_TABLA,
  paginarEnCliente,
} from '../../../shared/components/tabla-datos/tabla-datos.component';

/** Dimensiones del lienzo SVG (solo presentación; los valores a graficar los entrega el backend). */
const ANCHO = 600;
const ALTO = 200;
const MARGEN = 20;
/** Margen izquierdo ampliado para las etiquetas del eje vertical. */
const MARGEN_IZQ = 44;

@Component({
    selector: 'app-admin-indicators',
    imports: [PageHeaderComponent, CifraConBaseComponent, KpiCardComponent, HorasMinutosPipe, SinEntidadAsignadaComponent, TablaDatosComponent, BadgeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <section class="space-y-4">
      @if (sinAmbito(); as rol) {
        <app-sin-entidad-asignada [rol]="rol" />
      } @else {
      <app-page-header titulo="Indicadores de la institución">
        @if (service.kpis(); as k) {
          <p cabecera-detalle class="text-sm text-warm-600 mt-1">{{ k.nombreInstitucion }} · {{ k.nombrePeriodoAcademico ?? 'Sin período' }}</p>
        }
        <button cabecera-acciones type="button" class="min-h-[44px] rounded-xl border border-warm-200 bg-white px-4 py-2 text-sm font-semibold text-warm-800 hover:bg-warm-50" (click)="actualizar()">Actualizar</button>
      </app-page-header>

      @if (cargando()) {
        <p role="status" class="superficie p-4 text-sm text-warm-700">Cargando indicadores…</p>
      }

      @if (service.kpis(); as k) {
        <div class="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <app-kpi-card etiqueta="Asistencia global" [valor]="k.porcentajeAsistencia" unidad="%" />
          <app-kpi-card etiqueta="Ausentismo global" [valor]="k.porcentajeAusentismo" unidad="%" [variacion]="variacionAusentismo()" sentido="menor-mejor" />
          <app-kpi-card [etiqueta]="'Cumplimiento de sesiones con asistencia registrada (' + k.sesionesConRegistro + ' / ' + k.sesionesVencidas + ')'" [valor]="k.porcentajeCumplimiento" unidad="%" />
          <app-kpi-card etiqueta="Retención por asistencia (período vigente)" [valor]="k.tasaRetencion" unidad="%" />
          <app-kpi-card etiqueta="Estudiantes con matrícula activa" [valor]="k.estudiantesConMatriculaActiva"><p class="text-xs text-warm-600"><app-cifra-con-base [valor]="k.estudiantesConMatriculaActiva" [base]="k.estudiantesRegistrados" [soloBase]="true" /></p></app-kpi-card>
          <app-kpi-card etiqueta="Docentes con grupo activo" [valor]="k.docentesConGrupoActivo"><p class="text-xs text-warm-600"><app-cifra-con-base [valor]="k.docentesConGrupoActivo" [base]="k.docentesRegistrados" [soloBase]="true" /></p></app-kpi-card>
          <app-kpi-card etiqueta="Facultades" [valor]="k.totalFacultades" />
          <app-kpi-card etiqueta="Programas" [valor]="k.totalProgramas" />
        </div>
      }

      <div class="superficie p-4">
        <h2 class="font-serif font-bold text-lg text-warm-900">Ausentismo por facultad</h2>
        <p class="mb-3 text-xs text-warm-600" data-testid="nota-horas">Calculado por horas dictadas.</p>
        @if (service.comparativa().length === 0 && !cargando()) {
          <p class="py-6 text-center text-sm text-warm-600">No hay facultades en esta institución.</p>
        } @else {
          <p class="mb-2 text-xs text-warm-600">Ausentismo: porcentaje de las horas dictadas, sin justa causa.</p>
          <app-tabla-datos
            etiqueta="Ausentismo por facultad"
            [columnas]="5"
            anchoMinimo="40rem"
            [cargando]="cargandoComparativa()"
            [paginada]="true"
            [totalItems]="service.comparativa().length"
            [pagina]="paginaComparativa()"
            [tamanoPagina]="tamanoComparativa()"
            (paginaChange)="paginaComparativa.set($event)"
            (tamanoPaginaChange)="cambiarTamanoComparativa($event)"
          >
            <thead>
              <tr>
                <th scope="col">Facultad</th>
                <th scope="col" class="text-right">Ausentismo</th>
                <th scope="col" class="text-right">Estudiantes</th>
                <th scope="col" class="text-right">Programas</th>
                <th scope="col" class="text-right">Retención</th>
              </tr>
            </thead>
            <tbody>
              @if (!cargandoComparativa()) {
                @for (f of comparativaPagina(); track f.idFacultad) {
                  <tr data-testid="tarjeta-facultad">
                    <td class="font-medium text-warm-900">
                      {{ f.nombreFacultad }}
                      @if (!f.estaActivaFacultad) {
                        <app-badge class="ml-2" variant="neutral" size="sm" [dot]="false">Inactiva</app-badge>
                      }
                    </td>
                    <td
                      class="text-right font-semibold tabular-nums text-warm-900"
                      data-testid="ausentismo-facultad"
                      [attr.title]="(f.horasFalta | horasMinutos) + ' de falta sin justa causa sobre ' + (f.horasDictadas | horasMinutos) + ' dictadas (horas de clase por cada estudiante matriculado)'"
                    >{{ formatoPorcentaje(f.porcentajeAusentismo) }}</td>
                    <td class="text-right tabular-nums">{{ f.totalEstudiantes }}</td>
                    <td class="text-right tabular-nums">{{ f.totalProgramas }}</td>
                    <td class="text-right tabular-nums">{{ formatoPorcentaje(f.tasaRetencion) }}</td>
                  </tr>
                }
              }
            </tbody>
          </app-tabla-datos>
        }
      </div>

      <div class="superficie p-4">
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
                  <title>{{ p.inicioIntervalo }} – {{ p.finIntervalo }}: {{ p.porcentajeAusentismo }}% ({{ p.horasFalta | horasMinutos }} de {{ p.horasDictadasEstudiante | horasMinutos }} por estudiante)</title>
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
      }
    </section>
  `
})
export class AdminIndicatorsComponent implements OnInit {
  readonly service = inject(AdminIndicatorsService);
  private readonly toast = inject(ToastService);
  /** HU178: el backend respondió que el usuario aún no tiene su ámbito asignado (código canónico KPI_00x). */
  readonly sinAmbito = signal<RolSinAmbito | null>(null);

  /** HU178: el rol sin ámbito es un estado controlado (aviso informativo); cualquier otro error se notifica. */
  private readonly fallo = (e: unknown): void => {
    const rol = rolSinAmbito(e);
    if (rol) {
      this.sinAmbito.set(rol);
      return;
    }
    this.toast.error(getApiErrorMessage(e));
  };

  readonly ancho = ANCHO;
  readonly alto = ALTO;
  readonly margenIzq = MARGEN_IZQ;
  readonly marcasEjeY = [0, 50, 100];
  /** Solicitudes en curso; mientras haya alguna se muestra el indicador de carga. */
  private readonly pendientes = signal(0);
  readonly cargando = computed(() => this.pendientes() > 0);
  readonly granularidad = signal<GranularidadTendencia>('SEMANA');
  /** Esqueleto de la tabla solo en la primera carga (no al recargar la tendencia). */
  readonly cargandoComparativa = computed(() => this.cargando() && this.service.comparativa().length === 0);
  readonly paginaComparativa = signal(1);
  readonly tamanoComparativa = signal(TAMANO_PAGINA_TABLA);
  readonly comparativaPagina = computed(() =>
    paginarEnCliente(this.service.comparativa(), this.paginaComparativa(), this.tamanoComparativa()),
  );
  /** Variacion (pp) del ausentismo por horas entre los dos ultimos intervalos con dato; sin periodo previo se oculta. */
  readonly variacionAusentismo = computed<number | null>(() => {
    const valores = this.service
      .tendencia()
      .map((p) => p.porcentajeAusentismo)
      .filter((v): v is number => v !== null);
    if (valores.length < 2) return null;
    return Math.round((valores[valores.length - 1] - valores[valores.length - 2]) * 100) / 100;
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.seguir(this.service.consultarKpis()).subscribe({ error: this.fallo });
    this.seguir(this.service.consultarComparativa()).subscribe({ error: this.fallo });
    this.cargarTendencia();
  }

  actualizar(): void {
    this.paginaComparativa.set(1);
    this.cargar();
  }

  cambiarTamanoComparativa(tamano: number): void {
    this.tamanoComparativa.set(tamano);
    this.paginaComparativa.set(1);
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
    this.seguir(this.service.consultarTendencia(this.granularidad())).subscribe({ error: this.fallo });
  }

  private seguir<T>(origen: Observable<T>): Observable<T> {
    this.pendientes.update((n) => n + 1);
    return origen.pipe(finalize(() => this.pendientes.update((n) => Math.max(0, n - 1))));
  }
}
