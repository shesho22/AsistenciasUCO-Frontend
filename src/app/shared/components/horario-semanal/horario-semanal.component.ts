import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { BadgeComponent } from '../badge/badge.component';
import { ButtonComponent } from '../button/button.component';
import { RangoHorarioPipe } from '../../pipes/fecha-hora.pipes';
import { SesionCalendarioService } from '../../../core/services/sesion-calendario.service';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { RolCalendario, SesionCalendario } from '../../../core/models/sesion-calendario.model';
import { LoadErrorState, classifyLoadError } from '../../../core/api/errors/load-error.util';
import { diasDeSemana, etiquetaDia, etiquetaSemana, lunesDeSemana, sumarDias } from '../../../core/utils/semana.util';

/** Franjas de color por asignatura (tokens del sistema de diseño), para distinguir las materias de un vistazo. */
const COLORES_CLASE = [
  'bg-success-50/80 border-success-200/90',
  'bg-warning-50/80 border-warning-200/90',
  'bg-info-50/80 border-info-200/90',
  'bg-category-50/80 border-category-200/90',
] as const;

/**
 * ATA D7: horario semanal con fechas (lunes a domingo), navegable (anterior / hoy / siguiente). Se construye solo con el
 * endpoint de calendario del rol: las franjas regulares ya son sesiones. Marca las extraordinarias y tacha las canceladas
 * con su motivo o festivo; las horas se presentan en la zona institucional.
 */
@Component({
  selector: 'app-horario-semanal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [BadgeComponent, ButtonComponent, RangoHorarioPipe],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3" data-testid="navegacion-semana">
        <div class="flex items-center gap-2">
          <app-button variant="secondary" size="sm" (clicked)="irA(-1)" data-testid="semana-anterior">Semana anterior</app-button>
          <app-button variant="secondary" size="sm" (clicked)="irAHoy()" data-testid="semana-hoy">Hoy</app-button>
          <app-button variant="secondary" size="sm" (clicked)="irA(1)" data-testid="semana-siguiente">Semana siguiente</app-button>
        </div>
        <p class="text-sm font-semibold text-warm-900" aria-live="polite" data-testid="rango-semana">{{ rango() }}</p>
      </div>

      @if (cargando()) {
        <div class="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-7 gap-4" data-testid="horario-cargando">
          @for (d of dias(); track d) {
            <div class="h-64 bg-warm-100 rounded-2xl animate-pulse"></div>
          }
        </div>
      } @else if (error()) {
        <div class="bg-white p-8 rounded-2xl border border-danger-200 text-center space-y-3" role="alert" data-testid="horarios-error">
          <p class="text-sm font-bold text-danger-800">{{ error()!.titulo }}</p>
          <p class="text-xs text-warm-600">{{ error()!.mensaje }}</p>
          <app-button variant="secondary" size="sm" (clicked)="cargar()">Reintentar</app-button>
        </div>
      } @else {
        @if (totalSesiones() === 0) {
          <div class="bg-warm-50 p-4 rounded-2xl border border-warm-200 text-xs text-warm-600" data-testid="horarios-vacio">
            No hay sesiones programadas esta semana.
          </div>
        }
        <div class="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-7 gap-4">
          @for (dia of dias(); track dia) {
            <section
              class="superficie flex flex-col overflow-hidden"
              [class.ring-2]="dia === hoy()"
              [class.ring-primary-500]="dia === hoy()"
              [attr.data-testid]="'dia-' + dia"
              [attr.aria-label]="etiqueta(dia)"
            >
              <div class="p-3 bg-warm-50 border-b border-warm-200 flex items-center justify-between gap-2">
                <span class="font-serif font-bold text-sm text-warm-900 capitalize">{{ etiqueta(dia) }}</span>
                <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-warm-200 text-warm-600">
                  {{ sesionesDe(dia).length }}
                </span>
              </div>
              <div class="p-3 flex-1 space-y-3 min-h-[120px]">
                @for (s of sesionesDe(dia); track s.idSesion) {
                  <article
                    class="p-3 rounded-xl border text-warm-800 shadow-xs"
                    [class]="color(s)"
                    [attr.data-testid]="'sesion-' + s.idSesion"
                  >
                    <div class="flex items-center justify-between gap-2 text-xs font-semibold mb-1">
                      <span class="font-mono" [class.line-through]="s.estaCancelada">{{ s.fechaHoraInicioUtc | rangoHorario: s.fechaHoraFinUtc : zona() }}</span>
                      <span class="uppercase tracking-wider px-1.5 rounded bg-white/70 text-xs">{{ s.nombreGrupo }}</span>
                    </div>
                    <h4 class="font-bold text-xs text-warm-900 leading-snug" [class.line-through]="s.estaCancelada">{{ s.nombreAsignatura }}</h4>
                    @if (rol() === 'ESTUDIANTE' && s.nombreDocente) {
                      <p class="text-xs text-warm-600 mt-1 truncate">{{ s.nombreDocente }}</p>
                    }
                    <div class="mt-2 flex flex-wrap gap-1.5">
                      @if (s.esExtraordinaria) {
                        <app-badge variant="info" size="sm" data-testid="etiqueta-extraordinaria">Extraordinaria</app-badge>
                      }
                      @if (s.estaCancelada) {
                        <app-badge variant="danger" size="sm" data-testid="etiqueta-cancelada">Cancelada</app-badge>
                      }
                    </div>
                    @if (s.estaCancelada && (s.motivoCancelacion || s.nombreDiaFestivo)) {
                      <p class="text-xs text-warm-700 mt-1.5 break-words" data-testid="motivo-cancelacion">{{ s.motivoCancelacion || s.nombreDiaFestivo }}</p>
                    }
                  </article>
                } @empty {
                  <p class="text-xs text-warm-400 text-center py-4">Sin sesiones</p>
                }
              </div>
            </section>
          }
        </div>
      }
    </div>
  `,
})
export class HorarioSemanalComponent implements OnInit, OnDestroy {
  private readonly servicio = inject(SesionCalendarioService);
  private readonly timeZone = inject(SessionTimeZoneService);

  readonly rol = input.required<RolCalendario>();

  /** Lunes (fecha civil `YYYY-MM-DD`) de la semana que se muestra. */
  readonly lunes = signal(lunesDeSemana(this.timeZone.currentDate()));
  readonly sesiones = signal<SesionCalendario[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<LoadErrorState | null>(null);

  readonly dias = computed(() => diasDeSemana(this.lunes()));
  readonly rango = computed(() => etiquetaSemana(this.lunes()));
  readonly hoy = computed(() => this.timeZone.currentDate());
  readonly totalSesiones = computed(() => this.dias().reduce((n, dia) => n + this.sesionesDe(dia).length, 0));

  private readonly porDia = computed(() => {
    const mapa = new Map<string, SesionCalendario[]>();
    for (const sesion of this.sesiones()) {
      const fecha = this.timeZone.presentTemporal(sesion.fechaHoraInicioUtc)?.date;
      if (!fecha) continue;
      mapa.set(fecha, [...(mapa.get(fecha) ?? []), sesion]);
    }
    return mapa;
  });

  private consulta: Subscription | null = null;

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
  }

  zona(): string {
    return this.timeZone.zone();
  }

  etiqueta(dia: string): string {
    return etiquetaDia(dia);
  }

  sesionesDe(dia: string): SesionCalendario[] {
    return this.porDia().get(dia) ?? [];
  }

  color(sesion: SesionCalendario): string {
    const indice = [...sesion.idAsignatura].reduce((suma, c) => suma + c.charCodeAt(0), 0) % COLORES_CLASE.length;
    return COLORES_CLASE[indice];
  }

  irA(semanas: number): void {
    this.lunes.set(sumarDias(this.lunes(), semanas * 7));
    this.cargar();
  }

  irAHoy(): void {
    this.lunes.set(lunesDeSemana(this.timeZone.currentDate()));
    this.cargar();
  }

  cargar(): void {
    this.consulta?.unsubscribe();
    this.cargando.set(true);
    this.error.set(null);
    const desde = this.lunes();
    this.consulta = this.servicio.consultar(this.rol(), desde, sumarDias(desde, 6)).subscribe({
      next: (res) => {
        this.sesiones.set(res.datos ?? []);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.sesiones.set([]);
        this.error.set(classifyLoadError(err));
        this.cargando.set(false);
      },
    });
  }
}
