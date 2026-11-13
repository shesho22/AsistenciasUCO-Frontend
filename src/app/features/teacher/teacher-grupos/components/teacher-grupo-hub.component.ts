import { Component, ChangeDetectionStrategy, computed, inject, input, output, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionMenuComponent, ActionMenuItem } from '../../../../shared/components/action-menu/action-menu.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SesionEstadoBadgeComponent } from '../../../../shared/components/sesion-estado-badge/sesion-estado-badge.component';
import { Course } from '../../../../core/models/course.model';
import { ClassSession } from '../../../../core/models/attendance.model';
import { DEFINICION_CONTEO_SESIONES, resumirSesiones, sesionDeHoy } from '../../../../core/models/sesiones-resumen.util';
import { estaPendienteAprobacion, TEXTO_SESION_PENDIENTE } from '../../../../core/models/sesion-estado.model';
import { SessionTimeZoneService } from '../../../../core/services/session-timezone.service';
import { TeacherGrupoSesionesComponent } from './teacher-grupo-sesiones.component';
import { TeacherGrupoEstudiantesComponent } from './teacher-grupo-estudiantes.component';
import { TeacherGrupoReclamosComponent } from './teacher-grupo-reclamos.component';
import { EstudianteGrupoItem } from '../../../../core/models/estudiante-grupo-item.model';
import { SolicitudRevisionItem, type EstadoCargaReclamos } from '../../../../core/models/role-management.model';
import { TeacherGrupoSabanaComponent } from './teacher-grupo-sabana.component';
import { TeacherGrupoDecisionesComponent } from './teacher-grupo-decisiones.component';

/** `HOY` es el modo operativo del día; el resto son las pestañas del modo `Grupo`. */
export type SubPestanaHub = 'HOY' | 'SABANA' | 'SESIONES' | 'RECLAMOS' | 'ESTUDIANTES';

interface PestanaGrupo {
  id: Exclude<SubPestanaHub, 'HOY'>;
  etiqueta: string;
  testid: string;
}

const PESTANAS_GRUPO: readonly PestanaGrupo[] = [
  { id: 'SABANA', etiqueta: 'Planilla', testid: 'hub-tab-sabana' },
  { id: 'SESIONES', etiqueta: 'Cronograma', testid: 'hub-tab-sesiones' },
  { id: 'RECLAMOS', etiqueta: 'Reclamos', testid: 'hub-tab-reclamos' },
  { id: 'ESTUDIANTES', etiqueta: 'Matrícula', testid: 'hub-tab-estudiantes' },
];

@Component({
  selector: 'app-teacher-grupo-hub',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ActionMenuComponent,
    EmptyStateComponent,
    SesionEstadoBadgeComponent,
    TeacherGrupoSesionesComponent,
    TeacherGrupoEstudiantesComponent,
    TeacherGrupoReclamosComponent,
    TeacherGrupoSabanaComponent,
    TeacherGrupoDecisionesComponent,
  ],
  template: `
    @if (selectedCourse()) {
      <div class="space-y-4">
        <!-- Barra Superior de Retorno -->
        <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
          <button
            type="button"
            (click)="volver.emit()"
            class="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-warm-700 hover:text-warm-950 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
          >
            <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a Mis Grupos
          </button>

        </div>

        <!-- Ficha de Encabezado Bento del Grupo -->
        <div class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="space-y-1.5 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              @if (selectedCourse()?.code) {
                <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary-50 text-primary-800 border border-primary-200">
                  {{ selectedCourse()?.code }}
                </span>
              }
              <span class="text-xs font-bold text-warm-600">{{ selectedCourse()?.section }}</span>
              <span class="text-xs text-warm-400">•</span>
              <span class="text-xs font-medium text-success-700 bg-success-50 px-2 py-0.5 rounded-full border border-success-200">
                {{ selectedCourse()?.enrolledStudentsCount || estudiantes().length }} alumnos matriculados
              </span>
            </div>
            <h2 class="font-serif font-bold text-2xl text-warm-900">{{ selectedCourse()?.name }}</h2>
            <p class="text-xs text-warm-600">
              Horario Regular: <strong class="text-warm-900">{{ selectedCourse()?.schedule }}</strong>
            </p>
            <!-- Un solo conteo de sesiones, con su definicion (F3-DOC-03) -->
            <p
              class="text-xs text-warm-600"
              data-testid="hub-conteo-sesiones"
              [attr.title]="definicionConteo"
            >
              Sesiones: <strong class="text-warm-900">{{ resumen().texto }}</strong>
            </p>
          </div>

          <div class="flex items-center gap-2.5 shrink-0" data-testid="hub-acciones">
            <app-action-menu label="Más acciones del grupo" [items]="acciones()" (selected)="alElegirAccion($event)" />
          </div>
        </div>

        <!-- Modo del hub: Hoy (operar la sesion) o Grupo (consultar y administrar) -->
        <div class="inline-flex rounded-xl border border-warm-200 bg-white p-1 shadow-xs" role="tablist" aria-label="Modo del grupo">
          <button
            type="button"
            role="tab"
            data-testid="hub-modo-hoy"
            [attr.aria-selected]="modo() === 'HOY'"
            (click)="subPestanaHub.set('HOY')"
            [class]="modo() === 'HOY' ? 'bg-primary-800 text-white font-bold' : 'text-warm-700 hover:bg-warm-100 font-medium'"
            class="min-h-[44px] px-5 rounded-lg text-sm transition-colors"
          >Hoy</button>
          <button
            type="button"
            role="tab"
            data-testid="hub-modo-grupo"
            [attr.aria-selected]="modo() === 'GRUPO'"
            (click)="irAGrupo()"
            [class]="modo() === 'GRUPO' ? 'bg-primary-800 text-white font-bold' : 'text-warm-700 hover:bg-warm-100 font-medium'"
            class="min-h-[44px] px-5 rounded-lg text-sm transition-colors"
          >Grupo</button>
        </div>

        <!-- Decisiones por inasistencia: visibles en Hoy y en Grupo, a un clic del docente (DEC-065) -->
        <app-teacher-grupo-decisiones
          [grupoId]="selectedCourse()?.id ?? ''"
          [mostrarVacio]="subPestanaHub() === 'SABANA'"
          (decisionRegistrada)="marcarRefresco()"
        />

        @if (modo() === 'HOY') {
          <!-- MODO HOY: la sesion en curso o la proxima, con una unica accion primaria -->
          <section class="bg-white p-5 sm:p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4" data-testid="hub-hoy" aria-label="Sesión de hoy">
            @if (hoy(); as h) {
              <div class="space-y-1.5 min-w-0">
                <p class="text-xs font-bold uppercase tracking-wider text-primary-700">
                  {{ h.tipo === 'EN_CURSO' ? 'Sesión en curso' : 'Próxima sesión' }}
                </p>
                <h3 class="font-serif font-bold text-xl text-warm-900 break-words">{{ h.sesion.title }}</h3>
                <p class="text-sm text-warm-600">
                  #{{ h.sesion.sessionNumber }} ·
                  {{ timeZone.displaySessionDate(h.sesion) }} ·
                  <span class="font-mono font-bold text-warm-800">{{ timeZone.displaySessionStartTime(h.sesion) }} - {{ timeZone.displaySessionEndTime(h.sesion) }}</span>
                </p>
                <p class="flex flex-wrap items-center gap-2 text-xs" data-testid="hub-hoy-estado">
                  <span class="px-2 py-0.5 rounded-full font-semibold border"
                    [class]="h.tipo === 'EN_CURSO' ? 'bg-success-50 text-success-800 border-success-200' : 'bg-warm-100 text-warm-700 border-warm-200'">
                    {{ h.tipo === 'EN_CURSO' ? 'En curso' : 'Programada' }}
                  </span>
                  <app-sesion-estado-badge
                    [estado]="h.sesion.estado"
                    [cancelacion]="h.sesion.cancelacion"
                    [estadoSolicitud]="h.sesion.estadoSolicitud"
                    [pendienteAprobacion]="h.sesion.pendienteAprobacion"
                  />
                </p>
                @if (esPendiente(h.sesion)) {
                  <p class="text-xs text-warning-800" data-testid="hub-hoy-pendiente">{{ textoPendiente }}</p>
                }
              </div>
              <div class="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  data-testid="hub-tomar-asistencia"
                  [disabled]="esPendiente(h.sesion)"
                  (click)="tomarAsistenciaSesion.emit(h.sesion)"
                  class="text-sm font-bold text-white bg-primary-800 hover:bg-primary-900 disabled:opacity-50 disabled:cursor-not-allowed px-5 min-h-[44px] rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm"
                >
                  <svg class="w-4 h-4 text-primary-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Tomar asistencia
                </button>
                @if (sessionQrEnabled()) {
                  <button
                    type="button"
                    data-testid="hub-hoy-qr"
                    [disabled]="esPendiente(h.sesion)"
                    (click)="proyectarSesion.emit(h.sesion)"
                    class="text-sm font-semibold text-primary-800 bg-accent-100 hover:bg-accent-200 border border-accent-300 disabled:opacity-50 disabled:cursor-not-allowed px-4 min-h-[44px] rounded-xl transition-colors"
                  >
                    Proyectar QR / PIN
                  </button>
                }
              </div>
            } @else {
              <app-empty-state
                title="No hay sesiones vigentes"
                description="No quedan sesiones por dictar en este grupo. Puedes solicitar una extraordinaria desde el cronograma del grupo."
              />
              <div>
                <button
                  type="button"
                  data-testid="hub-tomar-asistencia"
                  (click)="irAsistencia.emit(selectedCourse()!)"
                  class="text-sm font-bold text-white bg-primary-800 hover:bg-primary-900 px-5 min-h-[44px] rounded-xl transition-colors"
                >
                  Tomar asistencia
                </button>
              </div>
            }
          </section>
        } @else {
          <!-- MODO GRUPO: planilla, cronograma, reclamos y matricula -->
          <div
            class="flex border-b border-warm-200 gap-2 bg-white px-4 pt-2 rounded-t-2xl shadow-xs overflow-x-auto max-w-full"
            role="tablist"
            aria-label="Secciones del grupo"
            data-testid="hub-grupo-tabs"
          >
            @for (tab of pestanasGrupo; track tab.id) {
              <button
                type="button"
                role="tab"
                [attr.data-testid]="tab.testid"
                [attr.aria-selected]="subPestanaHub() === tab.id"
                (click)="subPestanaHub.set(tab.id)"
                [class]="subPestanaHub() === tab.id ? 'border-primary-700 text-primary-900 font-bold' : 'border-transparent text-warm-500 hover:text-warm-800 font-medium'"
                class="px-4 py-3 text-xs sm:text-sm border-b-2 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 min-h-[44px]"
              >
                {{ tab.etiqueta }}
                @if (tab.id === 'ESTUDIANTES') {
                  <span class="px-2 py-0.5 rounded-full text-[11px] bg-success-100 text-success-800">{{ estudiantes().length }}</span>
                }
                @if (tab.id === 'RECLAMOS') {
                  <span
                    data-testid="grupo-reclamos-count"
                    class="px-2 py-0.5 rounded-full text-[11px] bg-warning-100 text-warning-800"
                  >{{ estadoCargaReclamos() === 'LOADED' ? reclamos().length : (estadoCargaReclamos() === 'LOADING' ? '…' : '—') }}</span>
                }
              </button>
            }
          </div>

          @if (subPestanaHub() === 'SABANA') {
            <app-teacher-grupo-sabana
              [grupoId]="selectedCourse()?.id ?? ''"
              [estudiantes]="estudiantes()"
              [sessions]="sessions()"
              [cargando]="cargandoEstudiantes() || loadingSessions()"
              [refresco]="refrescoPlanilla()"
            />
          }

          @if (subPestanaHub() === 'SESIONES') {
            <app-teacher-grupo-sesiones
              [sessions]="sessions()"
              [loading]="loadingSessions()"
              [qrEnabled]="sessionQrEnabled()"
              [cancelEnabled]="sessionCancelEnabled()"
              (programarExtraordinaria)="programarExtraordinaria.emit()"
              (tomarAsistencia)="tomarAsistenciaSesion.emit($event)"
              (proyectar)="proyectarSesion.emit($event)"
              (verDetalle)="verDetalleSesion.emit($event)"
              (ajustarHorario)="ajustarHorarioSesion.emit($event)"
              (cancelar)="cancelarSesion.emit($event)"
            />
          }

          @if (subPestanaHub() === 'RECLAMOS') {
            <app-teacher-grupo-reclamos
              [reclamos]="reclamos()"
              [estadoCarga]="estadoCargaReclamos()"
              (irAReclamos)="irReclamos.emit()"
              (reintentar)="reintentarReclamos.emit()"
            />
          }

          @if (subPestanaHub() === 'ESTUDIANTES') {
            <app-teacher-grupo-estudiantes
              [estudiantes]="estudiantes()"
              [cargando]="cargandoEstudiantes()"
              [curso]="selectedCourse()"
              (retirar)="retirarEstudiante.emit($event)"
            />
          }
        }
      </div>
    }
  `,
})
export class TeacherGrupoHubComponent {
  protected readonly timeZone = inject(SessionTimeZoneService);
  protected readonly pestanasGrupo = PESTANAS_GRUPO;
  protected readonly definicionConteo = DEFINICION_CONTEO_SESIONES;

  selectedCourse = input<Course | null>(null);
  /** Instante de referencia para "en curso", "próxima" y "ejecutada"; sin valor se usa la hora actual. */
  ahora = input<Date | null>(null);

  protected readonly acciones = computed<ActionMenuItem[]>(() => {
    const items: ActionMenuItem[] = [{ id: 'matricula-qr', label: 'QR / PIN Matrícula', testid: 'hub-matricula-qr' }];
    if (this.sessionQrEnabled()) items.push({ id: 'proyectar-qr', label: 'Proyectar Auto-Registro', testid: 'hub-proyectar-qr' });
    return items;
  });

  protected alElegirAccion(id: string): void {
    const curso = this.selectedCourse();
    if (!curso) return;
    if (id === 'matricula-qr') this.matricular.emit(curso);
    else if (id === 'proyectar-qr') this.proyectarQr.emit(curso);
  }
  sessions = input<ClassSession[]>([]);
  loadingSessions = input<boolean>(false);
  estudiantes = input<EstudianteGrupoItem[]>([]);
  cargandoEstudiantes = input<boolean>(false);
  reclamos = input<SolicitudRevisionItem[]>([]);
  estadoCargaReclamos = input<EstadoCargaReclamos>('IDLE');
  // OUT_OF_GOLDEN_PATH: acciones de sesión sin contrato backend; ocultas salvo feature explícita.
  sessionQrEnabled = input<boolean>(false);
  sessionCancelEnabled = input<boolean>(false);

  /** `HOY` = modo Hoy; cualquier otro valor es la pestaña activa del modo Grupo. */
  subPestanaHub = model<SubPestanaHub>('HOY');

  protected readonly modo = computed<'HOY' | 'GRUPO'>(() => (this.subPestanaHub() === 'HOY' ? 'HOY' : 'GRUPO'));

  /** Un solo conteo de sesiones del grupo; la definición viaja en el `title` de la cifra. */
  protected readonly esPendiente = estaPendienteAprobacion;
  protected readonly textoPendiente = TEXTO_SESION_PENDIENTE;
  protected readonly resumen = computed(() => resumirSesiones(this.sessions(), this.ahora() ?? new Date()));
  protected readonly hoy = computed(() => sesionDeHoy(this.sessions(), this.ahora() ?? new Date()));

  protected irAGrupo(): void {
    if (this.subPestanaHub() === 'HOY') this.subPestanaHub.set('SABANA');
  }

  /** Cambia cuando el docente registra una decisión: la planilla vuelve a cargar su resumen. */
  protected readonly refrescoPlanilla = signal(0);

  protected marcarRefresco(): void {
    this.refrescoPlanilla.update((version) => version + 1);
  }

  reintentarReclamos = output<void>();

  volver = output<void>();
  irAsistencia = output<Course>();
  tomarAsistenciaSesion = output<ClassSession>();
  proyectarQr = output<Course>();
  matricular = output<Course>();
  /** HU051: el docente pide retirar a un estudiante activo del padrón. */
  retirarEstudiante = output<EstudianteGrupoItem>();
  programarExtraordinaria = output<void>();
  proyectarSesion = output<ClassSession>();
  verDetalleSesion = output<ClassSession>();
  ajustarHorarioSesion = output<ClassSession>();
  cancelarSesion = output<ClassSession>();
  irReclamos = output<void>();
}
