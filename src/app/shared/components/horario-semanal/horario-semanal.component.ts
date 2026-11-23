import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router } from '@angular/router';
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
  imports: [BadgeComponent, ButtonComponent, RangoHorarioPipe, NgTemplateOutlet],
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
        <div class="space-y-2" data-testid="horario-cargando">
          @for (d of dias(); track d) {
            <div class="h-16 bg-warm-100 rounded-2xl animate-pulse"></div>
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
        <!-- Agenda semanal compacta: una fila por dia (etiqueta a la izquierda desde md, encima en movil) con sus franjas en rejilla. -->
        <div class="space-y-2">
          @for (dia of dias(); track dia) {
            <section
              class="superficie flex flex-col md:flex-row overflow-hidden"
              [class.ring-2]="dia === hoy()"
              [class.ring-primary-500]="dia === hoy()"
              [attr.data-testid]="'dia-' + dia"
              [attr.aria-label]="etiqueta(dia)"
            >
              <div class="px-3 py-2 md:w-44 md:shrink-0 bg-warm-50 border-b md:border-b-0 md:border-r border-warm-200 flex items-center justify-between md:justify-start gap-2">
                <span class="font-serif font-bold text-sm text-warm-900 capitalize">{{ etiqueta(dia) }}</span>
                <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-warm-200 text-warm-600">
                  {{ sesionesDe(dia).length }}
                </span>
              </div>
              <div class="p-2 flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 items-start content-center">
                @for (s of sesionesDe(dia); track s.idSesion) {
                  @if (rol() === 'DOCENTE') {
                    <!-- La franja del docente abre la toma de esa sesión; dentro de un <button> solo va contenido de frase. -->
                    <button
                      type="button"
                      class="block w-full text-left p-2.5 rounded-xl border text-warm-800 shadow-xs cursor-pointer transition-all hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                      [class]="color(s)"
                      [attr.data-testid]="'sesion-' + s.idSesion"
                      [attr.aria-label]="etiquetaFranja(s)"
                      title="Abrir la toma de asistencia de esta sesión"
                      (click)="abrirToma(s)"
                    >
                      <ng-container *ngTemplateOutlet="contenidoSesion; context: { $implicit: s }" />
                    </button>
                  } @else {
                    <article
                      class="block p-2.5 rounded-xl border text-warm-800 shadow-xs"
                      [class]="color(s)"
                      [attr.data-testid]="'sesion-' + s.idSesion"
                    >
                      <ng-container *ngTemplateOutlet="contenidoSesion; context: { $implicit: s }" />
                    </article>
                  }
                } @empty {
                  <p class="text-xs text-warm-400 py-1 sm:col-span-2 xl:col-span-3">Sin sesiones</p>
                }
              </div>
            </section>
          }
        </div>
      }
    </div>

    <!-- Contenido de la franja: solo contenido de frase (<span>), válido tanto en <article> como dentro del <button> del docente. -->
    <ng-template #contenidoSesion let-s>
      <span class="flex items-center justify-between gap-2 text-xs font-semibold mb-1">
        <span class="font-mono" [class.line-through]="s.estaCancelada">{{ s.fechaHoraInicioUtc | rangoHorario: s.fechaHoraFinUtc : zona() }}</span>
        <span class="uppercase tracking-wider px-1.5 rounded bg-white/70 text-xs">{{ s.nombreGrupo }}</span>
      </span>
      <span class="block font-bold text-xs text-warm-900 leading-snug" [class.line-through]="s.estaCancelada" data-testid="nombre-asignatura">{{ s.nombreAsignatura }}</span>
      @if (rol() === 'ESTUDIANTE' && s.nombreDocente) {
        <span class="block text-xs text-warm-600 mt-0.5 break-words">{{ s.nombreDocente }}</span>
      }
      <span class="mt-1 flex flex-wrap gap-1.5 empty:hidden">
        @if (s.esExtraordinaria) {
          <app-badge variant="info" size="sm" data-testid="etiqueta-extraordinaria">Extraordinaria</app-badge>
        }
        @if (s.estaCancelada) {
          <app-badge variant="danger" size="sm" data-testid="etiqueta-cancelada">Cancelada</app-badge>
        }
      </span>
      @if (s.estaCancelada && (s.motivoCancelacion || s.nombreDiaFestivo)) {
        <span class="block text-xs text-warm-700 mt-1.5 break-words" data-testid="motivo-cancelacion">{{ s.motivoCancelacion || s.nombreDiaFestivo }}</span>
      }
    </ng-template>
  `,
})
export class HorarioSemanalComponent implements OnInit, OnDestroy {
  private readonly servicio = inject(SesionCalendarioService);
  private readonly timeZone = inject(SessionTimeZoneService);
  private readonly router = inject(Router);

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

  /**
   * La franja del docente abre la toma de asistencia de esa sesión (`/app/asistencia?courseId=<grupo>&sessionId=<sesión>`,
   * el mismo enlace que entiende el control de asistencia). Sin grupo, abre el control sin preselección.
   */
  abrirToma(sesion: SesionCalendario): void {
    void this.router.navigate(
      ['/app/asistencia'],
      sesion.idGrupo ? { queryParams: { courseId: sesion.idGrupo, sessionId: sesion.idSesion } } : {}
    );
  }

  /** Nombre accesible de la franja: materia, grupo, día y horario en la zona institucional, y su estado si aplica. */
  etiquetaFranja(sesion: SesionCalendario): string {
    const fecha = this.timeZone.presentTemporal(sesion.fechaHoraInicioUtc)?.date;
    const dia = fecha ? etiquetaDia(fecha) + ' ' : '';
    const inicio = this.timeZone.formatTemporal(sesion.fechaHoraInicioUtc, 'time');
    const fin = this.timeZone.formatTemporal(sesion.fechaHoraFinUtc, 'time');
    const partes = [
      `Abrir el grupo ${sesion.nombreGrupo} de ${sesion.nombreAsignatura} (${sesion.codigoAsignatura})`,
      `${dia}de ${inicio} a ${fin}`,
    ];
    if (sesion.esExtraordinaria) partes.push('extraordinaria');
    if (sesion.estaCancelada) {
      const motivo = sesion.motivoCancelacion || sesion.nombreDiaFestivo;
      partes.push(motivo ? `cancelada: ${motivo}` : 'cancelada');
    }
    return partes.join(', ');
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
