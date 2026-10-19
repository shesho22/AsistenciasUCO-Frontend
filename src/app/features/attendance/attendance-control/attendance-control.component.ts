import { Component, DestroyRef, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { finalize, forkJoin, map } from 'rxjs';
import { StudentService } from '../../../core/services/student.service';
import { SessionService } from '../../../core/services/session.service';
import { AttendanceService } from '../../../core/services/attendance.service';
import { GroupService } from '../../../core/services/group.service';
import { AttendanceRealtimeSyncService } from './attendance-realtime-sync.service';
import { ToastComponent } from '../../../shared/components/toast/toast.component';
import { SelectOption } from '../../../shared/components/form-select/form-select.component';
import { CatalogService } from '../../../core/services/catalog.service';
import { CourseService } from '../../../core/services/course.service';
import {
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
import { AttendanceProjectionModalComponent } from './components/attendance-projection-modal.component';
import { GroupSessionsOverviewComponent } from './components/group-sessions-overview.component';
import { GroupInfoModalComponent } from './components/group-info-modal.component';
import { GroupClaimsModalComponent } from './components/group-claims-modal.component';
import { TeacherMatriculaModalComponent } from '../../teacher/teacher-grupos/components/modals/teacher-matricula-modal.component';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { SolicitudRevisionItem } from '../../../core/models/role-management.model';
import { EstudianteGrupoApiDto } from '../../../core/api/models/estudiante-grupo-api-dto.model';
import { findActiveOrUpcomingSession } from '../../../core/utils/session-selection.util';

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
    AttendanceProjectionModalComponent,
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
        (markAllPresent)="markAllPresent()"
        (markAllAbsent)="markAllAbsent()"
        (openEnrollment)="openStudentRegistration()"
        (openNewSession)="openNewSessionModal()"
        (openProjection)="isProjectionModalOpen.set(true)"
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
          [totalReclamosPendientes]="pendingClaimsCount()"
          (selectSession)="irASesionDetalle($event)"
          (openProjectionSesion)="abrirProyeccionDeSesion($event)"
          (openNewSession)="openNewSessionModal()"
          (openEnrollment)="openStudentRegistration()"
          (openMatriculaQr)="isMatriculaQrModalOpen.set(true)"
          (exportExcel)="descargarPlanillaExcel()"
          (verAlumnos)="abrirInfoGrupo()"
          (verReclamos)="abrirReclamosGrupo()"
        />
      }

      <!-- 3. VISTA DETALLE: Tabla Interactiva de Estudiantes para Toma de Asistencia -->
      @if (vistaActual() === 'DETALLE') {
        <app-attendance-control-table
          [students]="students()"
          [isLoading]="isLoadingSession()"
          [isSaving]="isSaving()"
          [sessionsEnabled]="sessionsEnabled"
          [attendanceEnabled]="attendanceEnabled"
          (statusChange)="onStudentStatusChange($event)"
          (openExcuseModal)="openExcuseModal($event)"
          (saveAttendance)="saveAttendance()"
        />
      }

      <!-- 4. Modal de Matrícula de Estudiante -->
      <app-attendance-enrollment-modal
        [isOpen]="isRegisterModalOpen()"
        [isEnrolling]="isEnrolling()"
        [docTypeOptions]="docTypeOptions()"
        [fieldErrors]="studentFieldErrors()"
        (submitted)="onRegisterStudentSubmit($event)"
        (clearFieldError)="onClearStudentFieldError($event)"
        (closed)="isRegisterModalOpen.set(false)"
      />

      <!-- 4.1. Modal de QR / PIN de Matrícula al Grupo -->
      <app-teacher-matricula-modal
        [isOpen]="isMatriculaQrModalOpen()"
        [curso]="currentCourse() || null"
        (closed)="isMatriculaQrModalOpen.set(false)"
      />

      <!-- 5. Modal de Creación de Sesión -->
      <app-attendance-new-session-modal
        [isOpen]="isNewSessionModalOpen()"
        [course]="currentCourse()"
        [isCreating]="isCreatingSession()"
        (submitted)="onCreateSessionSubmit($event)"
        (closed)="isNewSessionModalOpen.set(false)"
      />

      <!-- 6. Modal de Proyección QR Dinámico en Aula -->
      <app-attendance-projection-modal
        [isOpen]="isProjectionModalOpen()"
        [courseCode]="currentCourse()?.code || 'CURSO'"
        [sessionTitle]="currentSession()?.title || 'Sesión de Clase'"
        (closed)="isProjectionModalOpen.set(false)"
      />

      <!-- 7. Modal de Información del Grupo & Alumnos Matriculados -->
      <app-group-info-modal
        [isOpen]="isGroupInfoModalOpen()"
        [course]="currentCourse()"
        [students]="groupStudents()"
        [isLoading]="isLoadingGroupStudents()"
        (closed)="isGroupInfoModalOpen.set(false)"
      />

      <!-- 8. Modal de Reclamos y Justificaciones del Grupo -->
      <app-group-claims-modal
        [isOpen]="isGroupClaimsModalOpen()"
        [course]="currentCourse()"
        [reclamos]="filteredGroupClaims()"
        [isLoading]="isLoadingClaims()"
        (closed)="isGroupClaimsModalOpen.set(false)"
        (resolver)="resolverReclamoGrupo($event)"
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

  readonly sessionsEnabled = environment.features.sessionsEnabled;
  readonly attendanceEnabled = environment.features.attendanceEnabled;

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

  isProjectionModalOpen = signal<boolean>(false);

  // Estado para Info del Grupo & Alumnos
  isGroupInfoModalOpen = signal<boolean>(false);
  groupStudents = signal<EstudianteGrupoApiDto[]>([]);
  isLoadingGroupStudents = signal<boolean>(false);

  // Estado para Reclamos del Grupo
  isGroupClaimsModalOpen = signal<boolean>(false);
  allTeacherClaims = signal<SolicitudRevisionItem[]>([]);
  isLoadingClaims = signal<boolean>(false);
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
    const courseId = this.selectedCourseId();
    const course = this.currentCourse();
    if (!courseId) return [];

    return this.allTeacherClaims().filter((c) => {
      // Filtrar por ID de grupo o coincidencia de código/nombre de asignatura
      if (c.materiaId && (c.materiaId === courseId || c.materiaId === course?.code)) return true;
      if (c.materiaNombre && course?.name && c.materiaNombre.toLowerCase().includes(course.name.toLowerCase())) return true;
      if (c.materiaCodigo && course?.code && c.materiaCodigo === course.code) return true;
      return false;
    });
  });

  pendingClaimsCount = computed<number>(() => {
    return this.filteredGroupClaims().filter((c) => c.estadoSolicitud === 'PENDIENTE').length;
  });

  private route = inject(ActivatedRoute, { optional: true });
  private router = inject(Router, { optional: true });

  volverAListaGrupos(): void {
    this.router?.navigate(['/app/docente/grupos']);
  }

  irABandejaGeneralReclamos(): void {
    this.isGroupClaimsModalOpen.set(false);
    this.router?.navigate(['/app/docente/reclamos']);
  }

  abrirProyeccionDeSesion(sessionId: string): void {
    this.selectedSessionId.set(sessionId);
    this.isProjectionModalOpen.set(true);
  }

  abrirInfoGrupo(): void {
    const courseId = this.selectedCourseId();
    if (!courseId) return;

    this.isGroupInfoModalOpen.set(true);
    this.cargarEstudiantesGrupo(courseId);
  }

  abrirReclamosGrupo(): void {
    this.isGroupClaimsModalOpen.set(true);
    this.cargarReclamosDocente();
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
        error: () => {
          this.groupStudents.set([]);
        },
      });
  }

  private cargarReclamosDocente(): void {
    if (!environment.features.teacherClaimsEnabled) {
      this.allTeacherClaims.set([]);
      this.isLoadingClaims.set(false);
      return;
    }
    this.isLoadingClaims.set(true);
    this.attendanceClaimService
      .getReclamosDocente()
      .pipe(finalize(() => this.isLoadingClaims.set(false)))
      .subscribe({
        next: (res) => {
          this.allTeacherClaims.set(res.datos || []);
        },
        error: () => {
          this.allTeacherClaims.set([]);
        },
      });
  }

  resolverReclamoGrupo(event: { id: string; accion: 'APROBADA' | 'RECHAZADA' }): void {
    this.attendanceClaimService
      .resolverReclamo(event.id, event.accion, `Decisión registrada desde el control de asistencia (${event.accion})`)
      .subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.toastType.set('success');
            this.toastMessage.set(res.mensajeUsuario || `Reclamo ${event.accion.toLowerCase()} correctamente.`);
            this.showToast.set(true);
            this.cargarReclamosDocente();
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
              label: `${course.code} - ${course.name} (${course.section})`,
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
  }

  sessionOptions = computed<SelectOption[]>(() => {
    return this.sessions()
      .map((s) => ({
        value: s.id,
        label: s.estadoTemporal === 'INDETERMINADA'
          ? `Sesión #${s.sessionNumber} (horario no confirmado): ${s.title}`
          : `Sesión #${s.sessionNumber} (${this.timeZone.displaySessionDate(s)}${this.timeZone.displaySessionEndDate(s) !== this.timeZone.displaySessionDate(s) ? ` – ${this.timeZone.displaySessionEndDate(s)}` : ''}): ${s.title}`,
      }));
  });

  currentCourse = computed(() =>
    this.courses().find((c) => c.id === this.selectedCourseId())
  );

  currentSession = computed(() =>
    this.sessions().find((s) => s.id === this.selectedSessionId())
  );

  students = computed(() => this.currentSession()?.records || []);

  onStudentStatusChange(event: { studentId: string; status: AttendanceStatus }): void {
    this.setStatus(event.studentId, event.status);
  }

  openExcuseModal(student: StudentAttendance): void {
    this.setStatus(student.studentId, 'EX');
  }

  openNewSessionModal(): void {
    this.isNewSessionModalOpen.set(true);
  }

  onCreateSessionSubmit(data: any): void {
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
  }

  onClearStudentFieldError(field: string): void {
    this.studentFieldErrors.update((prev) => {
      if (!prev[field as StudentEnrollmentField]) return prev;
      const updated = { ...prev };
      delete updated[field as StudentEnrollmentField];
      return updated;
    });
  }

  onRegisterStudentSubmit(data: any): void {
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
    if (!data.correo?.trim()) {
      fieldErrors.correo = 'El campo Correo Institucional es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo.trim())) {
      fieldErrors.correo = 'El campo Correo Institucional debe tener un formato válido (ej. estudiante@uco.edu.co).';
    }
    if (passwordError) {
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
        correoElectronico: data.correo.trim(),
        password: effectivePassword,
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
          this.toastMessage.set(getApiErrorMessage(error) || 'Error al matricular estudiante.');
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
      this.cargarReclamosDocente();
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
          this.cargarEstudiantesYSesion(courseId, defaultSession.id);
        }
      },
      error: () => {
        this.sessions.set([]);
        this.toastType.set('error');
        this.toastMessage.set('No fue posible cargar las sesiones y asistencias del grupo.');
        this.showToast.set(true);
      },
    });
  }

  seleccionarCurso(courseId: string): void {
    if (this.selectedCourseId() === courseId) return;
    this.router?.navigate([], {
      relativeTo: this.route || undefined,
      queryParams: { courseId, sessionId: null },
      queryParamsHandling: 'merge',
    });
    this.onCourseSelect(courseId);
  }

  volverAOverview(): void {
    this.vistaActual.set('OVERVIEW');
    this.selectedSessionId.set('');
    this.router?.navigate([], {
      relativeTo: this.route || undefined,
      queryParams: { sessionId: null },
      queryParamsHandling: 'merge',
    });
  }

  irASesionDetalle(sessionId: string): void {
    this.selectedSessionId.set(sessionId);
    this.vistaActual.set('DETALLE');
    this.router?.navigate([], {
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
    this.selectedSessionId.set(sessionId);
    this.vistaActual.set('DETALLE');
    this.router?.navigate([], {
      relativeTo: this.route || undefined,
      queryParams: { sessionId },
      queryParamsHandling: 'merge',
    });
    const courseId = this.selectedCourseId();
    if (courseId && sessionId) {
      this.cargarEstudiantesYSesion(courseId, sessionId);
    }
  }

  private cargarEstudiantesYSesion(courseId: string, sessionId: string): void {
    this.isLoadingSession.set(true);
    const pendingLocalStatus = new Map<string, AttendanceStatus>();
    for (const record of this.currentSession()?.records ?? []) {
      if (this.pendingStudentIds.has(record.studentId) && record.status !== null) {
        pendingLocalStatus.set(record.studentId, record.status);
      }
    }

    forkJoin({
      students: this.groupService.getStudentsByGroup(courseId),
      attendances: this.attendanceService.getAttendancesByGroup(courseId, sessionId),
    })
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
