import { Component, ChangeDetectionStrategy, computed, input, output, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionMenuComponent, ActionMenuItem } from '../../../../shared/components/action-menu/action-menu.component';
import { Course } from '../../../../core/models/course.model';
import { ClassSession } from '../../../../core/models/attendance.model';
import { DEFINICION_CONTEO_SESIONES, ResumenSesionesGrupo, textoResumenSesiones } from '../../../../core/models/resumen-sesiones-grupo.model';
import { TeacherGrupoEstudiantesComponent } from './teacher-grupo-estudiantes.component';
import { TeacherGrupoReclamosComponent } from './teacher-grupo-reclamos.component';
import { EstudianteGrupoItem } from '../../../../core/models/estudiante-grupo-item.model';
import { SolicitudRevisionItem, type EstadoCargaReclamos } from '../../../../core/models/role-management.model';
import { TeacherGrupoSabanaComponent } from './teacher-grupo-sabana.component';
import { TeacherGrupoDecisionesComponent } from './teacher-grupo-decisiones.component';

/**
 * Pestañas del grupo; el grupo abre en la planilla (ATA D9: se retiró el modo "Hoy"). El cronograma y sus acciones por
 * sesión viven en «Historial y Cronograma de Sesiones» de /app/asistencia (2026-11-18): un `?pestana=SESIONES` viejo abre la planilla.
 */
export type SubPestanaHub = 'SABANA' | 'RECLAMOS' | 'ESTUDIANTES';

interface PestanaGrupo {
  id: SubPestanaHub;
  etiqueta: string;
  testid: string;
}

const PESTANAS_GRUPO: readonly PestanaGrupo[] = [
  { id: 'SABANA', etiqueta: 'Planilla', testid: 'hub-tab-sabana' },
  { id: 'RECLAMOS', etiqueta: 'Reclamos', testid: 'hub-tab-reclamos' },
  { id: 'ESTUDIANTES', etiqueta: 'Matrícula', testid: 'hub-tab-estudiantes' },
];

/** `?pestana=` de la URL: un valor desconocido o ausente abre la planilla. */
export function pestanaDeGrupo(valor: string | null | undefined): SubPestanaHub {
  return PESTANAS_GRUPO.find((p) => p.id === valor)?.id ?? 'SABANA';
}

@Component({
  selector: 'app-teacher-grupo-hub',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ActionMenuComponent,
    TeacherGrupoEstudiantesComponent,
    TeacherGrupoReclamosComponent,
    TeacherGrupoSabanaComponent,
    TeacherGrupoDecisionesComponent,
  ],
  template: `
    @if (selectedCourse()) {
      <div class="space-y-4">
        <!-- Barra Superior de Retorno -->
        <div class="superficie flex items-center justify-between p-4">
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
        <div class="superficie p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                {{ selectedCourse()?.enrolledStudentsCount || totalEstudiantes() || 0 }} alumnos matriculados
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
              Sesiones: <strong class="text-warm-900">{{ textoConteoSesiones() }}</strong>
            </p>
          </div>

          <div class="flex items-center gap-2.5 shrink-0" data-testid="hub-acciones">
            <button
              type="button"
              data-testid="hub-tomar-asistencia"
              (click)="irAsistencia.emit(selectedCourse()!)"
              class="text-sm font-bold text-white bg-primary-800 hover:bg-primary-900 px-5 min-h-[44px] rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              Tomar asistencia
            </button>
            <app-action-menu label="Más acciones del grupo" [items]="acciones()" (selected)="alElegirAccion($event)" />
          </div>
        </div>

        <!-- Decisiones por inasistencia: visibles en Hoy y en Grupo, a un clic del docente (DEC-065) -->
        <app-teacher-grupo-decisiones
          [grupoId]="selectedCourse()?.id ?? ''"
          [mostrarVacio]="subPestanaHub() === 'SABANA'"
          (decisionRegistrada)="marcarRefresco()"
        />

        <!-- Planilla, reclamos y matricula (el cronograma vive en el historial de la toma de asistencia) -->
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
                <span class="px-2 py-0.5 rounded-full text-[11px] bg-success-100 text-success-800">{{ totalEstudiantes() ?? 0 }}</span>
              }
              @if (tab.id === 'RECLAMOS') {
                <span
                  data-testid="grupo-reclamos-count"
                  class="px-2 py-0.5 rounded-full text-[11px] bg-warning-100 text-warning-800"
                >{{ estadoCargaReclamos() === 'LOADED' ? (totalReclamos() ?? reclamos().length) : (estadoCargaReclamos() === 'LOADING' ? '…' : '—') }}</span>
              }
            </button>
          }
        </div>

        @if (subPestanaHub() === 'SABANA') {
          <app-teacher-grupo-sabana
            [grupoId]="selectedCourse()?.id ?? ''"
            [sessions]="sessions()"
            [cargando]="loadingSessions()"
            [refresco]="refrescoPlanilla()"
          />
        }

        @if (subPestanaHub() === 'RECLAMOS') {
          <app-teacher-grupo-reclamos
            [reclamos]="reclamos()"
            [totalReclamos]="totalReclamos()"
            [pagina]="paginaReclamos()"
            [tamano]="tamanoReclamos()"
            [estadoCarga]="estadoCargaReclamos()"
            (paginaChange)="paginaReclamosChange.emit($event)"
            (irAReclamos)="irReclamos.emit()"
            (reintentar)="reintentarReclamos.emit()"
          />
        }

        @if (subPestanaHub() === 'ESTUDIANTES') {
          <app-teacher-grupo-estudiantes
            [estudiantes]="padronPagina()"
            [totalEstudiantes]="totalEstudiantes()"
            [pagina]="paginaPadron()"
            [tamano]="tamanoPadron()"
            [busqueda]="busquedaPadron()"
            [cargando]="cargandoPadron()"
            [curso]="selectedCourse()"
            (paginaChange)="paginaPadronChange.emit($event)"
            (tamanoChange)="tamanoPadronChange.emit($event)"
            (busquedaChange)="busquedaPadronChange.emit($event)"
            (retirar)="retirarEstudiante.emit($event)"
          />
        }
      </div>
    }
  `,
})
export class TeacherGrupoHubComponent {
  protected readonly pestanasGrupo = PESTANAS_GRUPO;
  protected readonly definicionConteo = DEFINICION_CONTEO_SESIONES;

  selectedCourse = input<Course | null>(null);
  /** CIERRE-W3M: conteos, estado temporal y sesion en curso o proxima entregados por el servidor (el cliente no usa su reloj). */
  resumenSesiones = input<ResumenSesionesGrupo | null>(null);

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
  reclamos = input<SolicitudRevisionItem[]>([]);
  /** Total de reclamos del grupo según el servidor; `reclamos` es solo la página vigente. */
  totalReclamos = input<number | null>(null);
  paginaReclamos = input<number>(1);
  tamanoReclamos = input<number>(10);
  /** Padrón de la pestaña Matrícula: página, total y filtros del servidor (el padrón completo sigue en `estudiantes` para la planilla). */
  padronPagina = input<EstudianteGrupoItem[]>([]);
  totalEstudiantes = input<number | null>(null);
  paginaPadron = input<number>(1);
  tamanoPadron = input<number>(12);
  busquedaPadron = input<string>('');
  cargandoPadron = input<boolean>(false);
  estadoCargaReclamos = input<EstadoCargaReclamos>('IDLE');
  // HU175: el QR de asistencia del grupo (menú "Más") depende de su bandera.
  sessionQrEnabled = input<boolean>(false);

  subPestanaHub = model<SubPestanaHub>('SABANA');

  /** Un solo conteo de sesiones del grupo; la definición viaja en el `title` de la cifra. */
  protected readonly textoConteoSesiones = computed(() => {
    const resumen = this.resumenSesiones();
    return resumen ? textoResumenSesiones(resumen) : '—';
  });
  /** Cambia cuando el docente registra una decisión: la planilla vuelve a cargar su resumen. */
  protected readonly refrescoPlanilla = signal(0);

  protected marcarRefresco(): void {
    this.refrescoPlanilla.update((version) => version + 1);
  }

  reintentarReclamos = output<void>();
  paginaReclamosChange = output<number>();
  paginaPadronChange = output<number>();
  tamanoPadronChange = output<number>();
  busquedaPadronChange = output<string>();

  volver = output<void>();
  irAsistencia = output<Course>();
  proyectarQr = output<Course>();
  matricular = output<Course>();
  /** HU051: el docente pide retirar a un estudiante activo del padrón. */
  retirarEstudiante = output<EstudianteGrupoItem>();
  irReclamos = output<void>();
}
