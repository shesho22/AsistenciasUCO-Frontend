import type { NuevaSesionSolicitud } from './components/attendance-new-session-modal.component';
import type { MatriculaEstudianteSolicitud } from './components/attendance-enrollment-modal.component';
import { Component, DestroyRef, signal, computed, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Subscription, finalize, forkJoin, map, of } from 'rxjs';
import { StudentService } from '../../../core/services/student.service';
import { StudentRegistrationConfigService } from '../../../core/services/student-registration-config.service';
import { EmailVerificationService } from '../../../core/services/email-verification.service';
import { isInstitutionalEmail } from '../../../core/validation/institutional-email.util';
import { SessionService } from '../../../core/services/session.service';
import { AttendanceService } from '../../../core/services/attendance.service';
import { GroupService } from '../../../core/services/group.service';
import { AttendanceRealtimeSyncService } from './attendance-realtime-sync.service';
import { ToastComponent } from '../../../shared/components/toast/toast.component';
import { SelectOption } from '../../../shared/components/form-select/form-select.component';
import { CatalogService } from '../../../core/services/catalog.service';
import { CourseService } from '../../../core/services/course.service';
import {
  getApiErrorCode,
  getApiErrorMessage,
  getApiFieldError,
} from '../../../core/api/errors/api-error.util';
import { TipoIdentificacionApiDto } from '../../../core/api/models/tipo-identificacion-api-dto.model';
import { ClassSession, AttendanceStatus, StudentAttendance } from '../../../core/models/attendance.model';
import { Course } from '../../../core/models/course.model';
import { AttendanceMapper } from '../../../core/mappers/attendance.mapper';
import { RegistrarAsistenciasSesionRequest } from '../../../core/api/models/registrar-asistencias-sesion-request.model';
import { environment } from '../../../../environments/environment';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import {
  getPasswordValidationError,
  parseIdentificationNumber,
} from '../../../core/validation/request-form-validation.util';

import { ActivatedRoute, Router } from '@angular/router';

// Componentes Hijos Desacoplados
import { AttendanceControlHeaderComponent } from './components/attendance-control-header.component';
import { AttendanceControlTableComponent } from './components/attendance-control-table.component';
import { AttendanceEnrollmentModalComponent } from './components/attendance-enrollment-modal.component';
import { AttendanceNewSessionModalComponent } from './components/attendance-new-session-modal.component';
import { SessionTomasPanelComponent } from './components/session-tomas-panel.component';
import type { NotificacionToma } from './components/toma-asistencias.component';
import { TomaModoSelectorComponent } from './components/toma-modo-selector.component';
import { TomaCierreDialogComponent } from './components/toma-cierre-dialog.component';
import { TomaQrProyeccionComponent } from './components/toma-qr-proyeccion.component';
import { TeacherAttendanceSummaryService } from '../../../core/services/teacher-attendance-summary.service';
import { ResumenAsistenciaEstudiante } from '../../../core/models/indicadores-asistencia.model';
import { TomaAsistenciaService } from '../../../core/services/toma-asistencia.service';
import { AsistenciaQrService } from '../../../core/services/asistencia-qr.service';
import { ModoToma, TomaAsistencia, TomasSesion } from '../../../core/models/toma-asistencia.model';
import { QrToma } from '../../../core/models/asistencia-qr.model';
import { GroupSessionsOverviewComponent } from './components/group-sessions-overview.component';
import { GroupInfoModalComponent } from './components/group-info-modal.component';
import { GroupClaimsModalComponent } from './components/group-claims-modal.component';
import { TeacherMatriculaModalComponent } from '../../teacher/teacher-grupos/components/modals/teacher-matricula-modal.component';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { type EstadoCargaReclamos, SolicitudRevisionItem } from '../../../core/models/role-management.model';
import { isUuid } from '../../../core/utils/uuid.util';
import { EstudianteGrupoApiDto } from '../../../core/api/models/estudiante-grupo-api-dto.model';
import { AsistenciaConsultadaApiDto } from '../../../core/api/models/asistencia-consultada-api-dto.model';
import { detalleCancelacion, estaCancelada, marcarSesionCancelada } from '../../../core/models/sesion-estado.model';
import { findActiveOrUpcomingSession } from '../../../core/utils/session-selection.util';
import {
  ATTENDANCE_WINDOW_MESSAGES,
  getAttendanceWindowState,
  isAttendanceWindowErrorCode,
  msUntilAttendanceWindowChange,
} from '../../../core/utils/session-attendance-window.util';
import { ATTENDANCE_NOW } from '../../../core/utils/attendance-now.token';

/** Re-evaluación máxima de la ventana aunque no haya límite cercano (suspensión, reloj ajustado). */
const MAX_ATTENDANCE_WINDOW_TICK_MS = 30_000;

/** Certificación F3: 409 ERR_MATRICULA_DUPLICADA visto por el docente. */
export const MENSAJE_MATRICULA_DUPLICADA_DOCENTE =
  'El estudiante ya tiene una matrícula activa en este grupo.';

type StudentEnrollmentField =
  | 'tipoIdentificacionId'
  | 'primerNombre'
  | 'segundoNombre'
  | 'primerApellido'
  | 'segundoApellido'
  | 'correo'
  | 'numeroIdentificacion'
  | 'password';

@Component({
  selector: 'app-attendance-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ToastComponent,
    AttendanceControlHeaderComponent,
    AttendanceControlTableComponent,
    AttendanceEnrollmentModalComponent,
    AttendanceNewSessionModalComponent,
    SessionTomasPanelComponent,
    TomaModoSelectorComponent,
    TomaCierreDialogComponent,
    TomaQrProyeccionComponent,
    GroupSessionsOverviewComponent,
    GroupInfoModalComponent,
    GroupClaimsModalComponent,
    TeacherMatriculaModalComponent,
  ],
  template: `
    <div class="flex flex-col gap-6 animate-fade-in max-w-7xl mx-auto pb-12 relative">
      <!-- 1. Encabezado y Selectores de Curso / Sesión -->
      <app-attendance-control-header
        [sessionsEnabled]="sessionsEnabled"
        [attendanceEnabled]="attendanceEnabled"
        [isSaving]="isSaving()"
        [currentCourse]="currentCourse()"
        [currentSession]="currentSession()"
        [courseOptions]="courseOptions()"
        [sessionOptions]="sessionOptions()"
        [selectedCourseId]="selectedCourseId()"
        [selectedSessionId]="selectedSessionId()"
        [sessions]="sessions()"
        [isLoadingSession]="isLoadingSession()"
        [showBackButton]="vistaActual() === 'DETALLE'"
        [isDetailMode]="vistaActual() === 'DETALLE'"
        [attendanceWindowOpen]="attendanceWindowOpen()"
        [bulkActions]="!hayTomas()"
        (markAllPresent)="markAllPresent()"
        (markAllAbsent)="markAllAbsent()"
        (openEnrollment)="openStudentRegistration()"
        (openNewSession)="openNewSessionModal()"
        (openProjection)="abrirSelectorModo()"
        (exportExcel)="descargarPlanillaExcel()"
        (courseChange)="seleccionarCurso($event)"
        (sessionChange)="onSessionSelect($event)"
        (backToOverview)="volverAOverview()"
        (backToGroups)="volverAListaGrupos()"
      />

      <!-- 2. VISTA MAESTRO: Bento Grid y Panorámica de Sesiones del Grupo -->
      @if (vistaActual() === 'OVERVIEW') {
        <app-group-sessions-overview
          [course]="currentCourse()"
          [sessions]="sessions()"
          [resumen]="resumenGrupo()"
          [totalReclamosPendientes]="pendingClaimsCount()"
          (selectSession)="irASesionDetalle($event)"
          (openNewSession)="openNewSessionModal()"
          (openEnrollment)="openStudentRegistration()"
          (openMatriculaQr)="isMatriculaQrModalOpen.set(true)"
          (exportExcel)="descargarPlanillaExcel()"
          (verAlumnos)="abrirInfoGrupo()"
          (gestionarPadron)="irAPadron()"
          (verReclamos)="abrirReclamosGrupo()"
        />
      }

      <!-- 3. VISTA DETALLE: Tabla Interactiva de Estudiantes para Toma de Asistencia -->
      @if (vistaActual() === 'DETALLE') {
        <app-session-tomas-panel
          [tomasSesion]="tomasSesionActual()"
          [abriendo]="abriendoToma()"
          (nuevaToma)="abrirSelectorModo()"
          (proyectarQr)="onSeleccionarToma($event)"
          (cerrarToma)="solicitarCierreToma()"
          (actualizado)="recargarSesionActual()"
          (notificacion)="mostrarNotificacion($event)"
        />

        <!-- Sin tomas la sesión usa el lote de la sesión (toma implícita); con tomas, cada toma trae su lista -->
        @if (!hayTomas()) {
          <app-attendance-control-table
            [students]="students()"
            [isLoading]="isLoadingSession()"
            [isSaving]="isSaving()"
            [sessionsEnabled]="sessionsEnabled"
            [attendanceEnabled]="attendanceEnabled"
            [attendanceWindowState]="attendanceWindowState()"
            [cancelacion]="currentSession()?.cancelacion"
            (statusChange)="onStudentStatusChange($event)"
            (openExcuseModal)="openExcuseModal($event)"
            (saveAttendance)="saveAttendance()"
          />
        }
      }

      <!-- 4. Modal de Matrícula de Estudiante -->
      <app-attendance-enrollment-modal
        [isOpen]="isRegisterModalOpen()"
        [grupoId]="selectedCourseId()"
        [isEnrolling]="isEnrolling()"
        [docTypeOptions]="docTypeOptions()"
        [fieldErrors]="studentFieldErrors()"
        [emailDomain]="emailDomain()"
        (submitted)="onRegisterStudentSubmit($event)"
        (clearFieldError)="onClearStudentFieldError($event)"
        (closed)="isRegisterModalOpen.set(false)"
      />

      <!-- 4.1. Modal de QR / PIN de Matrícula al Grupo -->
      <app-teacher-matricula-modal
        [isOpen]="isMatriculaQrModalOpen()"
        [curso]="currentCourse() || null"
        (closed)="isMatriculaQrModalOpen.set(false)"
        (matriculado)="onEstudianteMatriculado($event)"
      />

      <!-- 5. Modal de Creación de Sesión -->
      <app-attendance-new-session-modal
        [isOpen]="isNewSessionModalOpen()"
        [course]="currentCourse()"
        [isCreating]="isCreatingSession()"
        (submitted)="onCreateSessionSubmit($event)"
        (closed)="isNewSessionModalOpen.set(false)"
      />

      <!-- 6. Modo de la toma, proyección del QR y cierre (CULM-001 B.2) -->
      @if (modoSelectorAbierto()) {
        <app-toma-modo-selector
          [qrHabilitado]="sessionQrEnabled"
          (modoElegido)="onModoElegido($event)"
          (cancelar)="modoSelectorAbierto.set(false)"
        />
      }
      @if (tomaProyectada(); as proyectada) {
        @if (qrActual(); as q) {
          <app-toma-qr-proyeccion
            [toma]="proyectada"
            [qr]="q"
            [grupoId]="selectedCourseId()"
            [titulo]="tituloProyeccion()"
            (dejarDeProyectar)="dejarDeProyectar()"
            (cerrarToma)="solicitarCierreToma()"
          />
        }
      }
      @if (cierrePendiente() && tomaAbierta(); as abierta) {
        <app-toma-cierre-dialog
          [numeroToma]="abierta.numero"
          (confirmar)="confirmarCierreToma($event)"
          (cancelar)="cierrePendiente.set(false)"
        />
      }

      <!-- 7. Modal de Información del Grupo & Alumnos Matriculados -->
      <app-group-info-modal
        [isOpen]="isGroupInfoModalOpen()"
        [course]="currentCourse()"
        [students]="groupStudents()"
        [isLoading]="isLoadingGroupStudents()"
        [resendingStudentId]="resendingStudentId()"
        (resendVerification)="onResendVerification($event)"
        (closed)="isGroupInfoModalOpen.set(false)"
      />

      <!-- 8. Modal de Reclamos y Justificaciones del Grupo -->
      <app-group-claims-modal
        [isOpen]="isGroupClaimsModalOpen()"
        [course]="currentCourse()"
        [reclamos]="filteredGroupClaims()"
        [estadoCarga]="estadoCargaReclamos()"
        (closed)="isGroupClaimsModalOpen.set(false)"
        (resolver)="resolverReclamoGrupo($event)"
        (reintentar)="reintentarCargaReclamos()"
        (irABandejaGeneral)="irABandejaGeneralReclamos()"
      />
      <!-- Feedback Toast -->
      <app-toast
        [visible]="showToast()"
        [message]="toastMessage()"
        [type]="toastType()"
        (dismissed)="showToast.set(false)"
      />
    </div>
  `,
})
export class AttendanceControlComponent {
  private courseService = inject(CourseService);
  private sessionService = inject(SessionService);
  private groupService = inject(GroupService);
  private studentService = inject(StudentService);
  private attendanceService = inject(AttendanceService);
  private attendanceRealtimeSync = inject(AttendanceRealtimeSyncService);
  private destroyRef = inject(DestroyRef);
  private catalogService = inject(CatalogService);
  private attendanceClaimService = inject(AttendanceClaimService);
  private timeZone = inject(SessionTimeZoneService);
  private studentRegistrationConfig = inject(StudentRegistrationConfigService);
  private emailVerification = inject(EmailVerificationService);
  private tomaService = inject(TomaAsistenciaService);
  private resumenService = inject(TeacherAttendanceSummaryService);
  private qrService = inject(AsistenciaQrService);
  emailDomain = signal<string>('');
  resendingStudentId = signal<string>('');

  readonly sessionsEnabled = true;
  readonly attendanceEnabled = true;
  readonly sessionQrEnabled = environment.features.sessionQrEnabled;

  courses = signal<Course[]>([]);
  sessions = signal<ClassSession[]>([]);

  vistaActual = signal<'OVERVIEW' | 'DETALLE'>('OVERVIEW');
  selectedCourseId = signal<string>('');
  selectedSessionId = signal<string>('');

  isLoadingSession = signal<boolean>(false);
  /**
   * Estudiantes cuyo estado el usuario seleccionó/modificó en esta vista y
   * aún no se ha guardado. Solo ellos viajan en el lote (batch parcial): lo
   * ya persistido y lo "Sin registrar" no se envían.
   */
  private pendingStudentIds = new Set<string>();
  isSaving = signal<boolean>(false);

  isNewSessionModalOpen = signal<boolean>(false);
  isCreatingSession = signal<boolean>(false);

  isRegisterModalOpen = signal<boolean>(false);
  isMatriculaQrModalOpen = signal<boolean>(false);
  isEnrolling = signal<boolean>(false);
  studentFieldErrors = signal<Partial<Record<StudentEnrollmentField, string>>>({});
  docTypes = signal<TipoIdentificacionApiDto[]>([]);

  // CULM-001 B.2: tomas de la sesión, proyección del QR y faltantes.
  tomasSesion = signal<TomasSesion | null>(null);
  /** Resumen por horas del grupo (backend): alimenta los KPIs de la panorámica. */
  resumenGrupo = signal<ResumenAsistenciaEstudiante[]>([]);
  abriendoToma = signal<boolean>(false);
  modoSelectorAbierto = signal<boolean>(false);
  cierrePendiente = signal<boolean>(false);
  tomaProyectada = signal<TomaAsistencia | null>(null);
  qrActual = signal<QrToma | null>(null);

  /** Tomas de la sesión mostrada (nunca las de otra sesión). */
  tomasSesionActual = computed(() => {
    const datos = this.tomasSesion();
    return datos && datos.idSesion === this.selectedSessionId() ? datos : null;
  });
  hayTomas = computed(() => (this.tomasSesionActual()?.tomas.length ?? 0) > 0);
  tomaAbierta = computed(() => this.tomasSesionActual()?.tomas.find((t) => t.estado === 'ABIERTA') ?? null);
  tituloProyeccion = computed(() => {
    const c = this.currentCourse();
    return c ? `${c.name} · Grupo ${c.section}` : 'Asistencia';
  });

  // Estado para Info del Grupo & Alumnos
  isGroupInfoModalOpen = signal<boolean>(false);
  groupStudents = signal<EstudianteGrupoApiDto[]>([]);
  isLoadingGroupStudents = signal<boolean>(false);

  // Estado para Reclamos del Grupo
  isGroupClaimsModalOpen = signal<boolean>(false);
  allTeacherClaims = signal<SolicitudRevisionItem[]>([]);
  estadoCargaReclamos = signal<EstadoCargaReclamos>('IDLE');
  private reclamosRequestId = 0;
  private reclamosGrupoActivo: string | null = null;
  private reclamosSubscription: Subscription | null = null;
  showToast = signal<boolean>(false);
  toastMessage = signal<string>('');
  toastType = signal<'success' | 'info' | 'warning' | 'error'>('success');

  courseOptions = signal<SelectOption[]>([]);

  docTypeOptions = computed<SelectOption[]>(() =>
    this.docTypes().map((dt) => ({
      value: dt.id,
      label: `${dt.tipoIdentificacion} - ${dt.nombre}`,
    }))
  );

  filteredGroupClaims = computed<SolicitudRevisionItem[]>(() => {
    const courseId = this.selectedCourseId().toLowerCase();
    if (!courseId) return [];

    return this.allTeacherClaims().filter((claim) => claim.grupoId?.toLowerCase() === courseId);
  });

  pendingClaimsCount = computed<number>(() => {
    return this.filteredGroupClaims().filter((c) => c.estadoSolicitud === 'PENDIENTE').length;
  });

  private route = inject(ActivatedRoute, { optional: true });
  private router = inject(Router, { optional: true });

  volverAListaGrupos(): void {
    void this.router?.navigate(['/app/docente/grupos']);
  }

  /** HU051: el hub del grupo vive en la pantalla de grupos del docente. */
  irAPadron(): void {
    const courseId = this.selectedCourseId();
    if (!courseId) return;
    void this.router?.navigate(["/app/docente/grupos"], { queryParams: { grupo: courseId } });
  }

  irABandejaGeneralReclamos(): void {
    this.isGroupClaimsModalOpen.set(false);
    void this.router?.navigate(['/app/docente/reclamos']);
  }

  abrirSelectorModo(): void {
    if (!this.selectedSessionId()) return;
    this.modoSelectorAbierto.set(true);
  }

  onModoElegido(modo: ModoToma): void {
    const sesionId = this.selectedSessionId();
    this.modoSelectorAbierto.set(false);
    if (!sesionId) return;
    this.abriendoToma.set(true);
    this.tomaService
      .abrirToma(sesionId, modo)
      .pipe(finalize(() => this.abriendoToma.set(false)))
      .subscribe({
        next: (res) => {
          this.cargarTomas(sesionId);
          if (modo === 'QR') this.proyectarQr(res.datos);
        },
        error: (err: unknown) => this.mostrarError(err, 'No fue posible abrir la toma.'),
      });
  }

  onSeleccionarToma(toma: TomaAsistencia): void {
    if (toma.modo === 'QR') this.proyectarQr(toma);
  }

  private proyectarQr(toma: TomaAsistencia): void {
    this.qrService.abrirQr(toma.idToma).subscribe({
      next: (res) => {
        this.qrActual.set(res.datos);
        this.tomaProyectada.set(toma);
      },
      error: (err: unknown) => this.mostrarError(err, 'No fue posible generar el código QR.'),
    });
  }

  dejarDeProyectar(): void {
    this.tomaProyectada.set(null);
    this.qrActual.set(null);
  }

  solicitarCierreToma(): void {
    if (this.tomaAbierta()) this.cierrePendiente.set(true);
  }

  confirmarCierreToma(marcarAusentes: boolean): void {
    const toma = this.tomaAbierta();
    this.cierrePendiente.set(false);
    if (!toma) return;
    this.tomaService.cerrarToma(toma.idToma, marcarAusentes).subscribe({
      next: (res) => {
        this.dejarDeProyectar();
        this.cargarTomas(toma.idSesion);
        this.recargarSesionActual();
      },
      error: (err: unknown) => this.mostrarError(err, 'No fue posible cerrar la toma.'),
    });
  }

  recargarSesionActual(): void {
    const courseId = this.selectedCourseId();
    const sessionId = this.selectedSessionId();
    if (courseId && sessionId) this.cargarEstudiantesYSesion(courseId, sessionId);
  }

  /** El backend limita la pagina a 100 (PAGINACION/TAMANO_MAXIMO): se recorren las paginas y se acumulan. */
  private cargarResumenGrupo(courseId: string, pagina = 1, acumulado: ResumenAsistenciaEstudiante[] = []): void {
    this.resumenService.consultarResumen(courseId, pagina, 100).subscribe({
      next: (res) => {
        if (this.selectedCourseId() !== courseId) return;
        const todo = [...acumulado, ...res.elementos];
        this.resumenGrupo.set(todo);
        if (pagina < res.totalPaginas) this.cargarResumenGrupo(courseId, pagina + 1, todo);
      },
      error: () => this.resumenGrupo.set([]),
    });
  }

  private cargarTomas(sesionId: string): void {
    this.tomaService.consultarTomas(sesionId).subscribe({
      next: (res) => {
        if (this.selectedSessionId() !== sesionId) return;
        this.tomasSesion.set(res.datos);
        const proyectada = this.tomaProyectada();
        if (!proyectada) return;
        const actual = res.datos.tomas.find((t) => t.idToma === proyectada.idToma);
        if (actual?.estado === 'CERRADA') {
          // Cierre automático del job: la proyección termina; los pendientes quedan en la pestaña de la toma.
          this.dejarDeProyectar();
        } else if (actual) {
          this.tomaProyectada.set(actual);
        }
      },
      error: () => this.tomasSesion.set(null),
    });
  }

  mostrarNotificacion(notificacion: NotificacionToma): void {
    this.toastType.set(notificacion.tipo);
    this.toastMessage.set(notificacion.texto);
    this.showToast.set(true);
  }

  private mostrarError(err: unknown, respaldo: string): void {
    this.toastType.set('error');
    this.toastMessage.set(getApiErrorMessage(err) || respaldo);
    this.showToast.set(true);
  }

  abrirInfoGrupo(): void {
    const courseId = this.selectedCourseId();
    if (!courseId) return;

    this.isGroupInfoModalOpen.set(true);
    this.cargarEstudiantesGrupo(courseId);
  }

  /** HU176B: un estudiante se matriculó por QR/PIN (evento SSE del grupo); si el listado del grupo está abierto, se actualiza. */
  onEstudianteMatriculado(grupoId: string): void {
    if (this.selectedCourseId() === grupoId && this.isGroupInfoModalOpen()) {
      this.cargarEstudiantesGrupo(grupoId);
    }
  }

  abrirReclamosGrupo(): void {
    this.isGroupClaimsModalOpen.set(true);
    this.cargarReclamosDocente(this.selectedCourseId());
  }

  private cargarEstudiantesGrupo(courseId: string): void {
    this.isLoadingGroupStudents.set(true);
    this.groupService
      .getStudentsByGroup(courseId)
      .pipe(finalize(() => this.isLoadingGroupStudents.set(false)))
      .subscribe({
        next: (res) => {
          this.groupStudents.set(res.datos || []);
        },
        error: (err: unknown) => {
          this.groupStudents.set([]);
          this.mostrarError(err, 'No fue posible cargar el padrón del grupo.');
        },
      });
  }

  private cargarReclamosDocente(courseId: string, forzar = false): void {
    const grupoId = courseId.toLowerCase();
    const cargaActivaOCompleta = this.reclamosGrupoActivo === grupoId &&
      (this.estadoCargaReclamos() === 'LOADING' || this.estadoCargaReclamos() === 'LOADED');
    if (!forzar && courseId.length > 0 && cargaActivaOCompleta) {
      return;
    }

    this.reclamosSubscription?.unsubscribe();
    this.reclamosSubscription = null;
    const requestId = ++this.reclamosRequestId;
    this.reclamosGrupoActivo = courseId ? grupoId : null;
    this.allTeacherClaims.set([]);

    if (!courseId) {
      this.estadoCargaReclamos.set('IDLE');
      return;
    }

    this.estadoCargaReclamos.set('LOADING');
    this.reclamosSubscription = this.attendanceClaimService
      .getReclamosDocentePorGrupo(courseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          if (requestId !== this.reclamosRequestId || this.selectedCourseId().toLowerCase() !== grupoId) {
            return;
          }
          if (!Array.isArray(items) || items.some((item) => !item || !isUuid(item.grupoId))) {
            this.estadoCargaReclamos.set('SERVER_ERROR');
            return;
          }

          this.allTeacherClaims.set(items.filter((item) => item.grupoId!.toLowerCase() === grupoId));
          this.estadoCargaReclamos.set('LOADED');
        },
        error: (error: unknown) => {
          if (requestId !== this.reclamosRequestId || this.selectedCourseId().toLowerCase() !== grupoId) {
            return;
          }
          this.allTeacherClaims.set([]);
          this.estadoCargaReclamos.set(this.estadoReclamosDesdeError(error));
        },
      });
  }

  reintentarCargaReclamos(): void {
    this.cargarReclamosDocente(this.selectedCourseId(), true);
  }

  private estadoReclamosDesdeError(error: unknown): EstadoCargaReclamos {
    const status = typeof error === 'object' && error !== null && 'status' in error
      ? (error as { status?: unknown }).status
      : undefined;
    if (status === 403) return 'FORBIDDEN';
    if (status === 501) return 'UNAVAILABLE';
    if (status === 0) return 'NETWORK_ERROR';
    return 'SERVER_ERROR';
  }

  /** SES-04: una decisión en curso bloquea otra hasta la respuesta real del backend. */
  private resolviendoReclamo = false;

  resolverReclamoGrupo(event: { id: string; accion: 'APROBADA' | 'RECHAZADA' }): void {
    if (this.resolviendoReclamo) return;
    this.resolviendoReclamo = true;
    this.attendanceClaimService
      .resolverReclamo(event.id, event.accion, `Decisión registrada desde el control de asistencia (${event.accion})`)
      .pipe(finalize(() => (this.resolviendoReclamo = false)))
      .subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.toastType.set('success');
            this.toastMessage.set(res.mensajeUsuario || `Reclamo ${event.accion.toLowerCase()} correctamente.`);
            this.showToast.set(true);
            this.cargarReclamosDocente(this.selectedCourseId(), true);
            // Una aprobación deja la asistencia JUSTIFICADA (EX): se recarga el estado persistido de la sesión.
            const courseId = this.selectedCourseId();
            const sessionId = this.selectedSessionId();
            if (courseId && sessionId) {
              this.cargarEstudiantesYSesion(courseId, sessionId);
            }
          } else {
            this.toastType.set('error');
            this.toastMessage.set(res.mensajeUsuario || 'No se pudo resolver el reclamo.');
            this.showToast.set(true);
          }
        },
        error: (err) => {
          this.toastType.set('error');
          this.toastMessage.set(getApiErrorMessage(err) || 'Error al procesar la solicitud.');
          this.showToast.set(true);
        },
      });
  }

  constructor() {
    this.catalogService
      .getIdentityDocumentTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (documentTypes) => {
          this.docTypes.set(documentTypes);
        },
      });

    this.courseService
      .getCurrentTeacherCourses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (coursesRes) => {
          const courses = coursesRes.datos || [];
          this.courses.set(courses);
          this.courseOptions.set(
            courses.map((course) => ({
              value: course.id,
              label: course.code
                ? `${course.code} - ${course.name} (${course.section})`
                : `${course.name} (${course.section})`,
            }))
          );

          if (courses.length > 0) {
            const queryCourseId = this.route?.snapshot?.queryParamMap?.get('courseId');
            const querySessionId = this.route?.snapshot?.queryParamMap?.get('sessionId');
            const targetCourseId =
              queryCourseId && courses.some((c) => c.id === queryCourseId)
                ? queryCourseId
                : courses[0].id;

            this.onCourseSelect(targetCourseId, querySessionId || undefined);
          }
        },
        error: (err) => {
          this.courses.set([]);
          this.courseOptions.set([]);
          this.toastType.set('error');
          this.toastMessage.set(
            getApiErrorMessage(err) || 'No fue posible cargar los grupos del docente.'
          );
          this.showToast.set(true);
        },
      });

    if (this.route?.queryParamMap) {
      this.route.queryParamMap
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((params) => {
          const queryCourseId = params.get('courseId');
          const querySessionId = params.get('sessionId');
          const courses = this.courses();

          if (courses.length > 0 && queryCourseId) {
            const courseExists = courses.some((c) => c.id === queryCourseId);
            if (courseExists) {
              const currentCourse = this.selectedCourseId();
              const currentSession = this.selectedSessionId();
              const currentVista = this.vistaActual();
              const targetVista = querySessionId ? 'DETALLE' : 'OVERVIEW';

              if (queryCourseId !== currentCourse) {
                this.onCourseSelect(queryCourseId, querySessionId || undefined);
              } else if (querySessionId && querySessionId !== currentSession) {
                this.irASesionDetalle(querySessionId);
              } else if (!querySessionId && currentVista !== 'OVERVIEW') {
                this.vistaActual.set('OVERVIEW');
              }
            }
          }
        });
    }

    this.attendanceRealtimeSync
      .watch(
        () => this.selectedCourseId(),
        () => this.selectedSessionId()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const courseId = this.selectedCourseId();
        const sessionId = this.selectedSessionId();
        if (courseId && sessionId) {
          this.cargarEstudiantesYSesion(courseId, sessionId);
        }
      });

    // HU047: la cancelación publicada por SSE actualiza la lista sin recargar por HTTP.
    this.attendanceRealtimeSync
      .watchCancelaciones(() => this.selectedCourseId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evento) => {
        const { sesion, tipo } = evento.payload;
        this.sessions.update((prev) =>
          marcarSesionCancelada(prev, sesion, {
            tipo,
            motivo: null,
            nombreFestivo: null,
            fechaCancelacionUtc: null,
          })
        );
      });

    this.attendanceRealtimeSync
      .watchTomas(() => this.selectedCourseId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const sessionId = this.selectedSessionId();
        if (sessionId) this.cargarTomas(sessionId);
      });

    this.attendanceRealtimeSync
      .connectionAlerts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.toastType.set('error');
        this.toastMessage.set(
          state === 'UNAUTHORIZED'
            ? 'La sesión para actualizaciones en vivo expiró. Inicia sesión nuevamente.'
            : 'Se perdió la conexión de actualizaciones en vivo. Los datos HTTP siguen siendo la fuente oficial.'
        );
        this.showToast.set(true);
      });

    this.destroyRef.onDestroy(() => this.attendanceRealtimeSync.disconnect());

    // SES-01: re-evalúa la ventana justo al abrir/cerrar la sesión mostrada, aunque la página quede abierta.
    effect((onCleanup) => {
      const delay = msUntilAttendanceWindowChange(this.currentSession(), this.nowMs());
      if (delay === null) return;
      const timer = setTimeout(
        () => this.refrescarVentanaAsistencia(),
        Math.min(delay + 25, MAX_ATTENDANCE_WINDOW_TICK_MS)
      );
      onCleanup(() => clearTimeout(timer));
    });
  }

  sessionOptions = computed<SelectOption[]>(() => {
    return this.sessions()
      .map((s) => {
        const base = s.estadoTemporal === 'INDETERMINADA'
          ? `Sesión #${s.sessionNumber} (horario no confirmado): ${s.title}`
          : `Sesión #${s.sessionNumber} (${this.timeZone.displaySessionDate(s)}${this.timeZone.displaySessionEndDate(s) !== this.timeZone.displaySessionDate(s) ? ` – ${this.timeZone.displaySessionEndDate(s)}` : ''}): ${s.title}`;
        if (!estaCancelada(s)) return { value: s.id, label: base };
        const detalle = detalleCancelacion(s.cancelacion);
        return {
          value: s.id,
          label: `${base} · Cancelada${detalle ? ` (${detalle})` : ''}`,
          disabled: true,
        };
      });
  });

  currentCourse = computed(() =>
    this.courses().find((c) => c.id === this.selectedCourseId())
  );

  currentSession = computed(() =>
    this.sessions().find((s) => s.id === this.selectedSessionId())
  );

  students = computed(() => this.currentSession()?.records || []);

  /**
   * SES-01: la toma ordinaria solo está habilitada con la sesión activa, [inicio, fin) sobre los
   * instantes v2 confirmados. El reloj del navegador decide solo la presentación: backend y DB
   * vuelven a validar con su reloj y rechazan con 409 (ver saveAttendance).
   */
  private readonly now = inject(ATTENDANCE_NOW);
  private readonly nowMs = signal<number>(this.now());

  /**
   * CULM-001 B.2: con las tomas cargadas, la ventana la decide el backend (`ventana.abierta`, calculada por la BD con
   * tolerancia y margen). Sin ellas, se conserva la guarda SES-01 por instantes v2.
   */
  attendanceWindowState = computed(() => {
    const local = getAttendanceWindowState(this.currentSession(), this.nowMs());
    const tomas = this.tomasSesionActual();
    if (!tomas || local === 'CANCELADA' || local === 'INDETERMINADA') return local;
    if (tomas.ventana.abierta) return 'ABIERTA';
    return local === 'NO_INICIADA' ? 'NO_INICIADA' : 'CERRADA';
  });

  attendanceWindowOpen = computed(() => this.attendanceWindowState() === 'ABIERTA');

  /** Re-evalúa la ventana con el reloj actual; si se cerró con cambios sin guardar, los descarta. */
  refrescarVentanaAsistencia(): void {
    this.nowMs.set(this.now());
    if (!this.attendanceWindowOpen() && this.pendingStudentIds.size > 0) {
      this.descartarCambiosNoGuardados('Los cambios no guardados se descartaron.');
    }
  }

  private ventanaAsistenciaAbierta(): boolean {
    this.nowMs.set(this.now());
    const state = this.attendanceWindowState();
    if (state === 'ABIERTA') return true;
    if (this.pendingStudentIds.size > 0) {
      this.descartarCambiosNoGuardados('Los cambios no guardados se descartaron.');
    } else {
      this.toastType.set('warning');
      this.toastMessage.set(ATTENDANCE_WINDOW_MESSAGES[state]);
      this.showToast.set(true);
    }
    return false;
  }

  /** Vuelve al estado persistido de la sesión: lo marcado localmente y no confirmado se pierde. */
  private descartarCambiosNoGuardados(detalle: string): void {
    this.pendingStudentIds.clear();
    const state = this.attendanceWindowState();
    this.toastType.set('warning');
    this.toastMessage.set(`${state === 'ABIERTA' ? '' : ATTENDANCE_WINDOW_MESSAGES[state] + ' '}${detalle}`.trim());
    this.showToast.set(true);
    const courseId = this.selectedCourseId();
    const sessionId = this.selectedSessionId();
    if (courseId && sessionId) {
      this.cargarEstudiantesYSesion(courseId, sessionId);
    }
  }

  onStudentStatusChange(event: { studentId: string; status: AttendanceStatus }): void {
    this.setStatus(event.studentId, event.status);
  }

  openExcuseModal(student: StudentAttendance): void {
    this.setStatus(student.studentId, 'EX');
  }

  openNewSessionModal(): void {
    this.isNewSessionModalOpen.set(true);
  }

  onCreateSessionSubmit(data: NuevaSesionSolicitud): void {
    const course = this.currentCourse();
    if (!course) {
      this.toastType.set('error');
      this.toastMessage.set('No hay un grupo seleccionado para programar la sesión.');
      this.showToast.set(true);
      return;
    }

    this.isCreatingSession.set(true);
    this.sessionService
      .createSession(course.id, {
        title: data.title,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
      })
      .pipe(finalize(() => this.isCreatingSession.set(false)))
      .subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.toastType.set('success');
            this.toastMessage.set(res.mensaje || 'Sesión creada exitosamente.');
            this.showToast.set(true);
            this.isNewSessionModalOpen.set(false);

            forkJoin({
              sessionsRes: this.sessionService.getSessionsByGroup(course.id),
              studentsRes: this.groupService.getStudentsByGroup(course.id),
              attendancesRes: this.attendanceService.getAttendancesByGroup(course.id),
            }).subscribe({
              next: ({ sessionsRes, studentsRes, attendancesRes }) => {
                const rawSessions = sessionsRes.datos || [];
                const activeStudents = (studentsRes.datos || []).filter((s) => s.codigoEstado === 'A');
                const attendances = attendancesRes.datos || [];

                const populatedSessions = rawSessions.map((session) => {
                  const sessionAttendances = attendances.filter((a) => a.sesion === session.id);
                  const records = AttendanceMapper.fromGroupStudentsAndAttendances(activeStudents, sessionAttendances);
                  return { ...session, records };
                });

                this.sessions.set(populatedSessions);
                const responseWithCreatedData = res as typeof res & {
                  datos?: { id?: string };
                };
                const createdId = responseWithCreatedData.datos?.id;
                const matchingSessions = populatedSessions.filter((session) =>
                  session.title === data.title &&
                  session.date === data.date
                );
                const selectedSession = createdId
                  ? populatedSessions.find((session) => session.id === createdId)
                  : [...matchingSessions].sort((left, right) => right.sessionNumber - left.sessionNumber)[0];
                this.selectedSessionId.set(selectedSession?.id || '');
                this.vistaActual.set('OVERVIEW');
              },
            });
          } else {
            this.toastType.set('error');
            this.toastMessage.set(res.mensaje || 'No fue posible crear la sesión.');
            this.showToast.set(true);
          }
        },
        error: (err: unknown) => {
          this.toastType.set('error');
          this.toastMessage.set(getApiErrorMessage(err) || 'Error al programar la sesión.');
          this.showToast.set(true);
        },
      });
  }

  openStudentRegistration(): void {
    this.studentFieldErrors.set({});
    this.isRegisterModalOpen.set(true);
    this.studentRegistrationConfig
      .getEmailDomain()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dominio) => this.emailDomain.set(dominio),
        // Sin dominio cargado solo se omite la pre-validacion; el backend sigue siendo la autoridad.
        error: () => this.emailDomain.set(''),
      });
  }

  onResendVerification(idEstudiante: string): void {
    const courseId = this.selectedCourseId();
    if (!courseId || this.resendingStudentId()) return;
    this.resendingStudentId.set(idEstudiante);
    this.emailVerification
      .resendVerification(courseId, idEstudiante)
      .pipe(
        finalize(() => this.resendingStudentId.set('')),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.toastType.set('success');
          this.toastMessage.set('Se envió un nuevo enlace de verificación al correo del estudiante.');
          this.showToast.set(true);
        },
        error: (error: unknown) => {
          this.toastType.set('error');
          this.toastMessage.set(getApiErrorMessage(error) || 'No fue posible reenviar el enlace de verificación.');
          this.showToast.set(true);
        },
      });
  }

  onClearStudentFieldError(field: string): void {
    this.studentFieldErrors.update((prev) => {
      if (!prev[field as StudentEnrollmentField]) return prev;
      const updated = { ...prev };
      delete updated[field as StudentEnrollmentField];
      return updated;
    });
  }

  onRegisterStudentSubmit(data: Omit<MatriculaEstudianteSolicitud, 'password'> & { password?: string }): void {
    this.studentFieldErrors.set({});
    const identificationResult = parseIdentificationNumber(data.numeroIdentificacion);
    const effectivePassword = data.password?.trim() ?? '';
    const passwordError = getPasswordValidationError(effectivePassword, data.numeroIdentificacion);
    const fieldErrors: Partial<Record<StudentEnrollmentField, string>> = {};

    if (!identificationResult.valid) {
      fieldErrors.numeroIdentificacion = identificationResult.error;
    }
    if (!data.primerNombre?.trim()) {
      fieldErrors.primerNombre = 'El campo Primer Nombre es obligatorio.';
    }
    if (!data.primerApellido?.trim()) {
      fieldErrors.primerApellido = 'El campo Primer Apellido es obligatorio.';
    }
    // A.2-15: un estudiante existente se matricula por documento; su correo y contraseña no se piden ni se envían.
    const esExistente = data.estudianteExistente === true;
    if (esExistente) {
      // Sin validaciones de cuenta: ya existe.
    } else if (!data.correo?.trim()) {
      fieldErrors.correo = 'El campo Correo Institucional es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo.trim())) {
      fieldErrors.correo = 'El campo Correo Institucional debe tener un formato válido (ej. estudiante@uco.edu.co).';
    } else if (data.esNuevoEstudiante && this.emailDomain() && !isInstitutionalEmail(data.correo, this.emailDomain())) {
      // IDENT-001: pre-validacion de comodidad; la autoridad es el backend (si el dominio no se pudo cargar se omite).
      fieldErrors.correo = `El correo del estudiante debe ser institucional y terminar en ${this.emailDomain()}.`;
    }
    if (passwordError && !esExistente) {
      fieldErrors.password = passwordError;
    }

    if (!data.tipoIdentificacionId || Object.keys(fieldErrors).length > 0 || data.hasLocalConfirmError) {
      if (!data.tipoIdentificacionId) {
        fieldErrors.tipoIdentificacionId = 'El campo Tipo de Documento es obligatorio.';
      }
      this.studentFieldErrors.set(fieldErrors);
      this.toastType.set('error');
      const errList = Object.values(fieldErrors);
      if (errList.length > 0) {
        this.toastMessage.set(
          errList.length === 1 ? errList[0]! : `Campos con error en la inscripción: ${Object.keys(fieldErrors).join(', ')}.`
        );
      } else if (data.hasLocalConfirmError) {
        this.toastMessage.set('Por favor verifique la confirmación de la contraseña.');
      }
      this.showToast.set(true);
      return;
    }

    if (!identificationResult.valid) {
      return;
    }

    const courseId = this.selectedCourseId();
    if (!courseId) {
      this.toastType.set('error');
      this.toastMessage.set('Selecciona un grupo antes de matricular el estudiante.');
      this.showToast.set(true);
      return;
    }

    this.isEnrolling.set(true);
    this.studentService
      .enrollStudentInGroup({
        grupo: courseId,
        tipoDocumento: data.tipoIdentificacionId,
        numeroIdentificacion: identificationResult.value,
        primerNombre: data.primerNombre.trim(),
        segundoNombre: data.segundoNombre?.trim(),
        primerApellido: data.primerApellido.trim(),
        segundoApellido: data.segundoApellido?.trim(),
        idPrograma: data.idPrograma,
        correoElectronico: esExistente ? undefined : data.correo.trim(),
        password: esExistente ? undefined : effectivePassword,
      })
      .pipe(finalize(() => this.isEnrolling.set(false)))
      .subscribe({
        next: (res) => {
          this.isRegisterModalOpen.set(false);
          this.studentFieldErrors.set({});
          this.toastType.set('success');
          this.toastMessage.set(res.mensajeUsuario || '¡Estudiante matriculado exitosamente en el grupo!');
          this.showToast.set(true);

          const sessionId = this.selectedSessionId();
          // Actualización inmutable reactiva instantánea
          const studentId = `est-${identificationResult.value}`;
          const nuevoRegistro: StudentAttendance = {
            studentId,
            studentName: `${data.primerNombre.trim()} ${data.primerApellido.trim()}`,
            studentCode: String(identificationResult.value),
            status: 'AN' as AttendanceStatus,
          };

          this.sessions.update((prev) =>
            prev.map((s) => {
              if (s.id !== sessionId) return s;
              const records = s.records || [];
              return {
                ...s,
                records: [...records, nuevoRegistro],
              };
            })
          );

          if (sessionId) {
            this.cargarEstudiantesYSesion(courseId, sessionId);
          }
        },
        error: (error: unknown) => {
          this.toastType.set('error');
          this.setStudentApiFieldErrors(error);
          // Certificación F3: el mensaje del catálogo habla al estudiante ("Usted ya se encuentra registrado…"). Para
          // el docente se informa la matrícula activa; el retirado se vuelve a matricular por esta misma vía (DEC-009).
          this.toastMessage.set(
            getApiErrorCode(error) === 'ERR_MATRICULA_DUPLICADA'
              ? MENSAJE_MATRICULA_DUPLICADA_DOCENTE
              : getApiErrorMessage(error) || 'Error al matricular estudiante.'
          );
          this.showToast.set(true);
        },
      });
  }

  private setStudentApiFieldErrors(error: unknown): void {
    const fields: StudentEnrollmentField[] = [
      'tipoIdentificacionId',
      'primerNombre',
      'segundoNombre',
      'primerApellido',
      'segundoApellido',
      'correo',
      'numeroIdentificacion',
      'password',
    ];
    const fieldErrors: Partial<Record<StudentEnrollmentField, string>> = {};

    for (const field of fields) {
      const message = getApiFieldError(error, field);
      if (message) {
        fieldErrors[field] = message;
      }
    }

    this.studentFieldErrors.set(fieldErrors);
  }

  onCourseSelect(courseId: string, initialSessionId?: string): void {
    this.pendingStudentIds.clear();
    this.selectedCourseId.set(courseId);
    this.selectedSessionId.set('');
    this.vistaActual.set(initialSessionId ? 'DETALLE' : 'OVERVIEW');
    if (courseId) {
      this.attendanceRealtimeSync.connectGroup(courseId);
      this.resumenGrupo.set([]);
      this.cargarResumenGrupo(courseId);
      this.cargarReclamosDocente(courseId);
    }

    forkJoin({
      sessionsRes: this.sessionService.getSessionsByGroup(courseId),
      studentsRes: this.groupService.getStudentsByGroup(courseId),
      attendancesRes: this.attendanceService.getAttendancesByGroup(courseId),
    }).subscribe({
      next: ({ sessionsRes, studentsRes, attendancesRes }) => {
        const rawSessions = sessionsRes.datos || [];
        const activeStudents = (studentsRes.datos || []).filter((s) => s.codigoEstado === 'A');
        const attendances = attendancesRes.datos || [];

        // Mapear records por sesión para alimentar el conteo de asistentes y KPIs del cronograma
        const populatedSessions = rawSessions.map((session) => {
          const sessionAttendances = attendances.filter((a) => a.sesion === session.id);
          const records = AttendanceMapper.fromGroupStudentsAndAttendances(activeStudents, sessionAttendances);
          return { ...session, records };
        });

        this.sessions.set(populatedSessions);

        if (populatedSessions.length > 0) {
          const matchingSession = initialSessionId
            ? populatedSessions.find((s) => s.id === initialSessionId)
            : null;

          const defaultSession = matchingSession || findActiveOrUpcomingSession(populatedSessions) || populatedSessions[0];

          this.selectedSessionId.set(defaultSession.id);
          // F-DOC-S10: el padron y las asistencias del grupo ya se acaban de pedir; no se vuelven a pedir.
          this.cargarEstudiantesYSesion(courseId, defaultSession.id, {
            students: studentsRes.datos || [],
            attendances: attendances,
          });
        }
      },
      error: (err: unknown) => {
        this.sessions.set([]);
        this.mostrarError(err, 'No fue posible cargar las sesiones y asistencias del grupo.');
      },
    });
  }

  seleccionarCurso(courseId: string): void {
    if (this.selectedCourseId() === courseId) return;
    void this.router?.navigate([], {
      relativeTo: this.route || undefined,
      queryParams: { courseId, sessionId: null },
      queryParamsHandling: 'merge',
    });
    this.onCourseSelect(courseId);
  }

  volverAOverview(): void {
    this.vistaActual.set('OVERVIEW');
    this.selectedSessionId.set('');
    void this.router?.navigate([], {
      relativeTo: this.route || undefined,
      queryParams: { sessionId: null },
      queryParamsHandling: 'merge',
    });
  }

  irASesionDetalle(sessionId: string): void {
    this.nowMs.set(this.now());
    this.selectedSessionId.set(sessionId);
    this.vistaActual.set('DETALLE');
    void this.router?.navigate([], {
      relativeTo: this.route || undefined,
      queryParams: { sessionId },
      queryParamsHandling: 'merge',
    });
    const courseId = this.selectedCourseId();
    if (courseId && sessionId) {
      this.cargarEstudiantesYSesion(courseId, sessionId);
    }
  }

  onSessionSelect(sessionId: string): void {
    this.pendingStudentIds.clear();
    this.nowMs.set(this.now());
    this.selectedSessionId.set(sessionId);
    this.vistaActual.set('DETALLE');
    void this.router?.navigate([], {
      relativeTo: this.route || undefined,
      queryParams: { sessionId },
      queryParamsHandling: 'merge',
    });
    const courseId = this.selectedCourseId();
    if (courseId && sessionId) {
      this.cargarEstudiantesYSesion(courseId, sessionId);
    }
  }

  private cargarEstudiantesYSesion(
    courseId: string,
    sessionId: string,
    precargados?: { students: EstudianteGrupoApiDto[]; attendances: AsistenciaConsultadaApiDto[] }
  ): void {
    this.isLoadingSession.set(true);
    this.cargarTomas(sessionId);
    const pendingLocalStatus = new Map<string, AttendanceStatus>();
    for (const record of this.currentSession()?.records ?? []) {
      if (this.pendingStudentIds.has(record.studentId) && record.status !== null) {
        pendingLocalStatus.set(record.studentId, record.status);
      }
    }

    const fuente$ = precargados
      ? of({
          students: { datos: precargados.students },
          attendances: { datos: precargados.attendances.filter((a) => a.sesion === sessionId) },
        })
      : forkJoin({
          students: this.groupService.getStudentsByGroup(courseId),
          attendances: this.attendanceService.getAttendancesByGroup(courseId, sessionId),
        });
    fuente$
      .pipe(
        map(({ students, attendances }) =>
          AttendanceMapper.fromGroupStudentsAndAttendances(
            students.datos.filter((student) => student.codigoEstado === 'A'),
            attendances.datos
          )
        ),
        finalize(() => this.isLoadingSession.set(false))
      )
      .subscribe({
        next: (mappedRecords) => {
          // HTTP es la fuente de verdad, pero lo que el usuario marcó y aún
          // no guardó se conserva ante un refresco (p. ej. disparado por SSE).
          const reconciled = mappedRecords.map((record) => {
            const local = pendingLocalStatus.get(record.studentId);
            return local ? { ...record, status: local } : record;
          });
          for (const id of Array.from(this.pendingStudentIds)) {
            if (!pendingLocalStatus.has(id)) this.pendingStudentIds.delete(id);
          }
          this.sessions.update((prev) =>
            prev.map((s) => (s.id === sessionId ? { ...s, records: reconciled } : s))
          );
        },
        error: (err: unknown) => {
          this.toastType.set('error');
          this.toastMessage.set(getApiErrorMessage(err) || 'Error al cargar estudiantes y asistencias.');
          this.showToast.set(true);
        },
      });
  }

  setStatus(studentId: string, status: AttendanceStatus): void {
    if (!this.ventanaAsistenciaAbierta()) return;
    this.pendingStudentIds.add(studentId);
    this.sessions.update((prev) =>
      prev.map((session) => {
        if (session.id !== this.selectedSessionId()) return session;
        const currentRecords = session.records || [];
        return {
          ...session,
          records: currentRecords.map((r) =>
            r.studentId === studentId ? { ...r, status } : r
          ),
        };
      })
    );
  }

  markAllPresent(): void {
    this.bulkSetStatus('AN');
  }

  markAllAbsent(): void {
    this.bulkSetStatus('SJC');
  }

  private bulkSetStatus(status: AttendanceStatus): void {
    if (!this.ventanaAsistenciaAbierta()) return;
    for (const record of this.students()) {
      this.pendingStudentIds.add(record.studentId);
    }
    this.sessions.update((prev) =>
      prev.map((session) => {
        if (session.id !== this.selectedSessionId()) return session;
        return {
          ...session,
          records: (session.records || []).map((r) => ({ ...r, status })),
        };
      })
    );
  }

  saveAttendance(): void {
    const sessionId = this.selectedSessionId();
    const records = this.students();

    if (!sessionId || records.length === 0) return;
    if (!this.ventanaAsistenciaAbierta()) return;

    const explicitRecords = records.filter(
      (
        record
      ): record is StudentAttendance & { status: AttendanceStatus } =>
        record.status !== null && this.pendingStudentIds.has(record.studentId)
    );
    if (explicitRecords.length === 0) {
      this.toastType.set('info');
      this.toastMessage.set('No hay modificaciones pendientes por guardar en esta sesión.');
      this.showToast.set(true);
      return;
    }

    this.isSaving.set(true);
    const request: RegistrarAsistenciasSesionRequest = {
      sesionId: sessionId,
      registros: explicitRecords.map((record) => ({
        estudianteId: record.studentId,
        estado: record.status,
      })),
    };

    // Con tomas cada una guarda su propia lista (TomaAsistenciasComponent); este lote es el de la sesión sin tomas.
    this.attendanceService
      .saveBatchAttendance(request)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (response) => {
          if (response.exitoso) {
            this.pendingStudentIds.clear();
            this.toastType.set('success');
            this.toastMessage.set(response.mensaje || 'Asistencia guardada correctamente.');
            this.showToast.set(true);
            const courseId = this.selectedCourseId();
            if (courseId) {
              this.cargarEstudiantesYSesion(courseId, sessionId);
            }
          } else {
            this.toastType.set('error');
            this.toastMessage.set(response.mensaje || 'No fue posible registrar las asistencias.');
            this.showToast.set(true);
          }
        },
        error: (err: unknown) => {
          // SES-01: el servidor es la autoridad temporal. Un 409 de ventana nunca se muestra como éxito
          // y lo marcado localmente vuelve al estado persistido.
          if (isAttendanceWindowErrorCode(getApiErrorCode(err))) {
            this.nowMs.set(this.now());
            this.descartarCambiosNoGuardados('');
          }
          this.toastType.set('error');
          this.toastMessage.set(getApiErrorMessage(err) || 'Error al guardar la asistencia.');
          this.showToast.set(true);
        },
      });
  }

  descargarPlanillaExcel(): void {
    const courseId = this.selectedCourseId();
    if (!courseId) return;

    this.groupService.descargarPlanillaExcel(courseId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const course = this.currentCourse();
        const fileName = `Planilla_Asistencias_${course?.code || 'Curso'}.xlsx`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.toastType.set('success');
        this.toastMessage.set('Planilla Excel descargada correctamente.');
        this.showToast.set(true);
      },
      error: (err: unknown) => {
        this.toastType.set('error');
        this.toastMessage.set(
          getApiErrorMessage(err) || 'Error al descargar la planilla Excel de asistencia.'
        );
        this.showToast.set(true);
      },
    });
  }
}
