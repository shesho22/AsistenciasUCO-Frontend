import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AttendanceService } from '../../../core/services/attendance.service';
import { StudentAttendance } from '../../../core/models/attendance.model';
import { AVISO_SOLICITUD_SESION_REGISTRADA, mensajeSolicitudAprobada, mensajeSolicitudRechazadaOCancelada } from '../../../core/models/sesion-manual.util';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { REALTIME_EVENT_TYPE, SesionCanceladaRealtimePayload, SesionManualCreadaRealtimePayload } from '../../../core/realtime/model/realtime-event.model';
import { estaPendienteAprobacion, marcarSesionAprobada, marcarSesionCancelada } from '../../../core/models/sesion-estado.model';
import { CourseService } from '../../../core/services/course.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { CatalogoPrograma } from '../../../core/models/programa-academico.model';
import { SessionService } from '../../../core/services/session.service';
import { GroupService } from '../../../core/services/group.service';
import { StudentService } from '../../../core/services/student.service';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { AttendanceMapper } from '../../../core/mappers/attendance.mapper';
import { AsistenciaConsultadaApiDto } from '../../../core/api/models/asistencia-consultada-api-dto.model';
import { EstudianteGrupoApiDto } from '../../../core/api/models/estudiante-grupo-api-dto.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { Course } from '../../../core/models/course.model';
import { EstudianteGrupoItem } from '../../../core/models/estudiante-grupo-item.model';
import { ClassSession } from '../../../core/models/attendance.model';
import { type EstadoCargaReclamos, SolicitudRevisionItem } from '../../../core/models/role-management.model';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { isUuid } from '../../../core/utils/uuid.util';

// Componentes Hijos Desacoplados
import { TeacherGruposListComponent } from './components/teacher-grupos-list.component';
import { SubPestanaHub, TeacherGrupoHubComponent } from './components/teacher-grupo-hub.component';
import { TeacherSesionFormComponent } from './components/teacher-sesion-form.component';
import { TeacherMatriculaModalComponent } from './components/modals/teacher-matricula-modal.component';
import { TeacherSesionCancelarModalComponent } from './components/modals/teacher-sesion-cancelar-modal.component';
import { TeacherSesionDetalleModalComponent } from './components/modals/teacher-sesion-detalle-modal.component';
import { TeacherRetiroEstudianteModalComponent } from './components/modals/teacher-retiro-estudiante-modal.component';
import { getSessionNameError } from '../../../core/validation/session-name.util';
import { environment } from '../../../../environments/environment';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { horarioDentroDelMismoDia } from '../../../core/time/session-timezone.util';
import { mensajeUi } from '../../../core/messages/mensajes-ui';

type VistaGrupos = 'LISTA' | 'HUB_GRUPO' | 'FORM_SESION';

@Component({
    selector: 'app-teacher-grupos',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    TeacherGruposListComponent,
    TeacherGrupoHubComponent,
    TeacherSesionFormComponent,
    TeacherMatriculaModalComponent,
    TeacherSesionCancelarModalComponent,
    TeacherSesionDetalleModalComponent,
    TeacherRetiroEstudianteModalComponent
],
    template: `
    <div class="space-y-6 animate-fade-in">
      <!-- 1. VISTA LISTA PRINCIPAL -->
      @if (vistaActual() === 'LISTA') {
        <app-teacher-grupos-list
          [courses]="courses()"
          [tiposPrograma]="tiposPrograma()"
          [isLoading]="isLoading()"
          [sessionQrEnabled]="sessionQrEnabled"
          (irAsistencia)="irATomaAsistencia()"
          (seleccionarGrupo)="tomarAsistenciaGrupo($event)"
          (matricular)="abrirModalMatriculaGrupo($event)"
          (tomarAsistencia)="tomarAsistenciaGrupo($event)"
        />
      }

      <!-- 3. VISTA HUB INTEGRAL DEL GRUPO -->
      @if (vistaActual() === 'HUB_GRUPO' && selectedCourse()) {
        <app-teacher-grupo-hub
          [selectedCourse]="selectedCourse()"
          [sessions]="sessionsConRegistros()"
          [loadingSessions]="loadingSessions()"
          [estudiantes]="estudiantesGrupo()"
          [cargandoEstudiantes]="cargandoEstudiantes()"
          [reclamos]="reclamosGrupo()"
          [estadoCargaReclamos]="estadoCargaReclamos()"
          [sessionQrEnabled]="sessionQrEnabled"
          [sessionCancelEnabled]="sessionCancelEnabled"
          [(subPestanaHub)]="subPestanaHub"
          (volver)="volverALista()"
          (irAsistencia)="tomarAsistenciaGrupo($event)"
          (tomarAsistenciaSesion)="tomarAsistenciaSesionEspecifica($event)"
          (proyectarQr)="proyectarQrGrupo($event)"
          (matricular)="abrirModalMatriculaGrupo($event)"
          (programarExtraordinaria)="abrirCrearSesionExtraordinaria()"
          (proyectarSesion)="proyectarSesionEspecifica($event)"
          (verDetalleSesion)="abrirDetalleSesionModal($event)"
          (ajustarHorarioSesion)="abrirEditarSesion($event)"
          (cancelarSesion)="abrirModalCancelarSesion($event)"
          (retirarEstudiante)="abrirModalRetiro($event)"
          (irReclamos)="irAGestionReclamos()"
          (reintentarReclamos)="reintentarCargaReclamosGrupo()"
        />
      }

      <!-- 4. VISTA FORMULARIO SESIÓN EXTRAORDINARIA / REPROGRAMACIÓN -->
      @if (vistaActual() === 'FORM_SESION' && selectedCourse()) {
        <app-teacher-sesion-form
          [modo]="modoFormSesion"
          [codigoCurso]="selectedCourse()?.code || ''"
          [(form)]="sesionForm"
          (cancelar)="volverASesiones()"
          (guardar)="guardarSesion()"
        />
      }

      <!-- 5. MODALES DESACOPLADOS -->
      <app-teacher-matricula-modal
        [isOpen]="modalMatriculaGrupoVisible()"
        [curso]="grupoMatricula()"
        (closed)="cerrarModalMatriculaGrupo()"
        (matriculado)="cargarEstudiantesGrupo($event)"
      />

      <app-teacher-sesion-cancelar-modal
        [isOpen]="modalCancelarVisible()"
        [sesion]="sesionACancelar()"
        [errorMensaje]="errorCancelar()"
        [enviando]="enviandoCancelacion()"
        (cancelar)="confirmarCancelarSesionConMotivo($event)"
        (closed)="cerrarModalCancelar()"
      />

      <app-teacher-retiro-estudiante-modal
        [isOpen]="estudianteARetirar() !== null"
        [grupoId]="selectedCourse()?.id ?? null"
        [estudiante]="estudianteARetirar()"
        (retirado)="onEstudianteRetirado()"
        (closed)="estudianteARetirar.set(null)"
      />

      <app-teacher-sesion-detalle-modal
        [isOpen]="modalDetalleSesionVisible()"
        [sesion]="sesionDetalle()"
        (closed)="cerrarDetalleSesionModal()"
      />
    </div>
  `
})
export class TeacherGruposComponent implements OnInit, OnDestroy {
  private courseService = inject(CourseService);
  private catalogService = inject(CatalogService);
  private sessionService = inject(SessionService);
  private attendanceService = inject(AttendanceService);
  private groupService = inject(GroupService);
  private studentService = inject(StudentService);
  private claimService = inject(AttendanceClaimService);
  private router = inject(Router);
  private route = inject(ActivatedRoute, { optional: true });
  private toast = inject(ToastService);
  private timeZone = inject(SessionTimeZoneService);
  private realtime = inject(RealtimeService);
  private cancelacionesSub: Subscription | null = null;
  private aprobacionesSub: Subscription | null = null;

  // QR (HU175, CULM-001 B.2) y cancelación (HU047, B.1) tienen contrato.
  readonly sessionQrEnabled = environment.features.sessionQrEnabled;
  readonly sessionCancelEnabled = environment.features.sessionCancelEnabled;

  vistaActual = signal<VistaGrupos>('LISTA');
  courses = signal<Course[]>([]);
  /** HU058: opciones del filtro "Nivel formativo" (catálogo real de tipos de programa). */
  tiposPrograma = signal<CatalogoPrograma[]>([]);
  isLoading = signal<boolean>(true);

  // Hub del Grupo
  subPestanaHub = signal<SubPestanaHub>('HOY');
  estudiantesGrupo = signal<EstudianteGrupoItem[]>([]);
  cargandoEstudiantes = signal<boolean>(false);
  reclamosGrupo = signal<SolicitudRevisionItem[]>([]);
  estadoCargaReclamos = signal<EstadoCargaReclamos>('IDLE');
  private reclamosGrupoSubscription: Subscription | null = null;
  private reclamosGrupoRequestId = 0;
  private grupoReclamosActivo: string | null = null;

  // Modal Detalle Sesión (Historial)
  modalDetalleSesionVisible = signal<boolean>(false);
  sesionDetalle = signal<ClassSession | null>(null);

  // Matrícula por Grupo
  modalMatriculaGrupoVisible = signal<boolean>(false);
  grupoMatricula = signal<Course | null>(null);

  // Cancelar Sesión
  modalCancelarVisible = signal<boolean>(false);
  sesionACancelar = signal<ClassSession | null>(null);
  /** Mensaje del backend (SES_011/012/013/016) mostrado dentro del modal; el modal sigue abierto. */
  errorCancelar = signal<string | null>(null);
  enviandoCancelacion = signal<boolean>(false);
  /** HU051: estudiante cuyo retiro se está confirmando (null = modal cerrado). */
  estudianteARetirar = signal<{ idEstudiante: string; nombreCompleto?: string } | null>(null);

  // Formularios (DEC-065 (4): el docente no crea grupos; solo el coordinador)
  selectedCourse = signal<Course | null>(null);

  modoFormSesion: 'CREAR' | 'EDITAR' = 'CREAR';
  sessions = signal<ClassSession[]>([]);
  /** Estado consolidado por estudiante y sesion (GET /grupos/{id}/asistencias) del grupo abierto en el hub. */
  private readonly asistenciasGrupo = signal<AsistenciaConsultadaApiDto[]>([]);

  /**
   * HU029: sesiones del grupo con sus registros (una marca por estudiante activo), para la sabana y el detalle de
   * sesion. Sin registro del backend la marca queda en null: nunca se inventa un estado.
   */
  readonly sessionsConRegistros = computed<ClassSession[]>(() => {
    const activos = this.estudiantesGrupo()
      .filter((estudiante) => estudiante.codigoEstado === 'A')
      .map((estudiante) => ({
        idEstudiante: estudiante.idEstudiante ?? estudiante.id ?? '',
        nombreCompleto: estudiante.nombreCompleto ?? '',
        documento: estudiante.documento ?? '',
      }) as EstudianteGrupoApiDto);
    const asistencias = this.asistenciasGrupo();
    return this.sessions().map((sesion) => {
      try {
        const deLaSesion = asistencias.filter((asistencia) => asistencia.sesion === sesion.id);
        return { ...sesion, records: AttendanceMapper.fromGroupStudentsAndAttendances(activos, deLaSesion) };
      } catch {
        return sesion;
      }
    });
  });
  loadingSessions = signal<boolean>(false);
  selectedSessionId: string | null = null;

  sesionForm = {
    title: '',
    date: '',
    startTime: '08:00',
    endTime: '10:00',
    sessionNumber: 1,
  };
  private sesionFormTimeZone: string | null = null;

  ngOnInit(): void {
    this.cargarGrupos();
    // Si el catálogo no carga, el filtro simplemente no se muestra.
    this.catalogService.getTiposPrograma().subscribe({
      next: (tipos) => this.tiposPrograma.set(tipos ?? []),
      error: () => this.tiposPrograma.set([]),
    });
  }

  ngOnDestroy(): void {
    this.cancelarCargaReclamosGrupo();
    this.detenerEscuchaCancelaciones();
  }

  cargarGrupos(): void {
    this.isLoading.set(true);
    this.courseService.getTeacherCourses().subscribe({
      next: (coursesRes) => {
        const teacherCourses = coursesRes.datos || [];
        this.courses.set(teacherCourses);
        this.isLoading.set(false);
        this.abrirHubSolicitado(teacherCourses);
      },
      error: (err: unknown) => {
        this.isLoading.set(false);
        this.toast.error(getApiErrorMessage(err) || mensajeUi('UI_TEACHER_GRUPOS_001'));
      },
    });
  }

  /**
   * HU051: `?grupo=<id>` (botón "Padrón" de la vista del grupo) abre el hub de ese grupo,
   * donde está el retiro con motivo. Un id ajeno se ignora y queda la lista.
   */
  private abrirHubSolicitado(cursos: Course[]): void {
    const id = this.route?.snapshot.queryParamMap.get('grupo');
    const curso = id ? cursos.find((c) => c.id === id) : undefined;
    if (curso) {
      this.verHubGrupo(curso);
    }
  }

  verHubGrupo(course: Course): void {
    this.selectedCourse.set(course);
    this.vistaActual.set('HUB_GRUPO');
    this.subPestanaHub.set('HOY');
    this.cargarSesiones(course.id);
    this.cargarEstudiantesGrupo(course.id);
    this.cargarAsistenciasGrupo(course.id);
    this.cargarReclamosGrupo(course.id);
    this.escucharCancelaciones(course.id);
  }

  volverALista(): void {
    this.cancelarCargaReclamosGrupo();
    this.detenerEscuchaCancelaciones();
    this.vistaActual.set('LISTA');
    this.selectedCourse.set(null);
  }

  cargarSesiones(courseId: string): void {
    this.loadingSessions.set(true);
    this.sessionService.getSessionsByGroup(courseId).subscribe({
      next: (res) => {
        this.sessions.set(res.datos || []);
        this.loadingSessions.set(false);
      },
      error: (err: unknown) => {
        this.loadingSessions.set(false);
        this.toast.error(getApiErrorMessage(err));
      },
    });
  }

  cargarAsistenciasGrupo(courseId: string): void {
    this.asistenciasGrupo.set([]);
    this.attendanceService.getAttendancesByGroup(courseId).subscribe({
      next: (res) => this.asistenciasGrupo.set(res?.datos ?? []),
      error: (err: unknown) => {
        this.asistenciasGrupo.set([]);
        this.toast.error(getApiErrorMessage(err));
      },
    });
  }

  cargarEstudiantesGrupo(courseId: string): void {
    this.cargandoEstudiantes.set(true);
    this.studentService.getStudentsByGroup(courseId).subscribe({
      next: (res) => {
        this.estudiantesGrupo.set(res?.datos ?? []);
        this.cargandoEstudiantes.set(false);
      },
      error: (err: unknown) => {
        this.estudiantesGrupo.set([]);
        this.cargandoEstudiantes.set(false);
        this.toast.error(getApiErrorMessage(err));
      },
    });
  }

  cargarReclamosGrupo(courseId?: string): void {
    const grupoId = courseId ?? this.selectedCourse()?.id;
    if (!grupoId) {
      this.cancelarCargaReclamosGrupo();
      return;
    }

    const grupoNormalizado = grupoId.toLowerCase();
    const mismaCargaActiva = this.grupoReclamosActivo === grupoNormalizado && this.estadoCargaReclamos() === 'LOADING';
    const mismoResultadoCompleto = this.grupoReclamosActivo === grupoNormalizado && this.estadoCargaReclamos() === 'LOADED';
    if (mismaCargaActiva || mismoResultadoCompleto) {
      return;
    }

    this.reclamosGrupoSubscription?.unsubscribe();
    this.reclamosGrupoSubscription = null;
    const requestId = ++this.reclamosGrupoRequestId;
    this.grupoReclamosActivo = grupoNormalizado;
    this.reclamosGrupo.set([]);
    this.estadoCargaReclamos.set('LOADING');

    const sigueSiendoLaCargaActual = (): boolean =>
      requestId === this.reclamosGrupoRequestId &&
      this.grupoReclamosActivo === grupoNormalizado &&
      this.vistaActual() === 'HUB_GRUPO' &&
      this.selectedCourse()?.id.toLowerCase() === grupoNormalizado;

    this.reclamosGrupoSubscription = this.claimService.getReclamosDocentePorGrupo(grupoId).subscribe({
      next: (items) => {
        if (!sigueSiendoLaCargaActual()) {
          return;
        }
        if (!Array.isArray(items) || items.some((item) => !item || !isUuid(item.grupoId))) {
          this.reclamosGrupo.set([]);
          this.estadoCargaReclamos.set('SERVER_ERROR');
          return;
        }

        this.reclamosGrupo.set(items.filter((item) => item.grupoId!.toLowerCase() === grupoNormalizado));
        this.estadoCargaReclamos.set('LOADED');
      },
      error: (error: unknown) => {
        if (!sigueSiendoLaCargaActual()) {
          return;
        }
        this.reclamosGrupo.set([]);
        this.estadoCargaReclamos.set(this.estadoReclamosDesdeError(error));
      },
    });
  }

  reintentarCargaReclamosGrupo(): void {
    const grupoId = this.selectedCourse()?.id;
    if (grupoId) {
      this.cargarReclamosGrupo(grupoId);
    }
  }

  private cancelarCargaReclamosGrupo(): void {
    this.reclamosGrupoRequestId += 1;
    this.reclamosGrupoSubscription?.unsubscribe();
    this.reclamosGrupoSubscription = null;
    this.grupoReclamosActivo = null;
    this.reclamosGrupo.set([]);
    this.estadoCargaReclamos.set('IDLE');
  }

  private estadoReclamosDesdeError(error: unknown): EstadoCargaReclamos {
    const status = typeof error === 'object' && error !== null && 'status' in error
      ? (error as { status?: unknown }).status
      : undefined;
    if (status === 403) {
      return 'FORBIDDEN';
    }
    if (status === 501) {
      return 'UNAVAILABLE';
    }
    if (status === 0) {
      return 'NETWORK_ERROR';
    }
    return 'SERVER_ERROR';
  }

  abrirCrearSesionExtraordinaria(): void {
    const course = this.selectedCourse();
    this.modoFormSesion = 'CREAR';
    this.selectedSessionId = null;
    this.sesionForm = {
      title: 'Sesión Extraordinaria de Refuerzo',
      date: this.timeZone.currentDate(),
      startTime: '14:00',
      endTime: '16:00',
      sessionNumber: this.sessions().length + 1,
    };
    this.sesionFormTimeZone = this.timeZone.zone();
    this.vistaActual.set('FORM_SESION');
  }

  abrirEditarSesion(sesion: ClassSession): void {
    this.modoFormSesion = 'EDITAR';
    this.selectedSessionId = sesion.id;
    this.sesionForm = {
      title: sesion.title,
      date: sesion.date,
      startTime: sesion.startTime,
      endTime: sesion.endTime,
      sessionNumber: sesion.sessionNumber,
    };
    this.sesionFormTimeZone = this.timeZone.zone();
    this.vistaActual.set('FORM_SESION');
  }

  volverASesiones(): void {
    this.vistaActual.set('HUB_GRUPO');
    this.subPestanaHub.set('SESIONES');
    this.selectedSessionId = null;
  }

  /** En edición, true si el horario del formulario es el de la sesión guardada (se conservan sus instantes). */
  private horarioSesionSinCambios(): boolean {
    if (this.modoFormSesion !== 'EDITAR') return false;
    const original = this.sessions().find((session) => session.id === this.selectedSessionId);
    return !!original
      && this.timeZone.displaySessionDate(original) === this.sesionForm.date
      && this.timeZone.displaySessionStartTime(original) === this.sesionForm.startTime
      && this.timeZone.displaySessionEndTime(original) === this.sesionForm.endTime;
  }

  guardarSesion(): void {
    const course = this.selectedCourse();
    if (!course) return;

    const nombreError = getSessionNameError(this.sesionForm.title);
    if (nombreError) {
      this.toast.warning(nombreError);
      return;
    }
    if (!this.sesionForm.date) {
      this.toast.warning(mensajeUi('UI_TEACHER_GRUPOS_005'));
      return;
    }
    if (!this.sesionForm.startTime || !this.sesionForm.endTime) {
      this.toast.warning(mensajeUi('UI_TEACHER_GRUPOS_006'));
      return;
    }
    if (this.modoFormSesion === 'EDITAR' && this.sesionFormTimeZone !== this.timeZone.zone()) {
      const original = this.sessions().find((session) => session.id === this.selectedSessionId);
      if (original) {
        this.sesionForm = {
          ...this.sesionForm,
          date: this.timeZone.displaySessionDate(original),
          startTime: this.timeZone.displaySessionStartTime(original),
          endTime: this.timeZone.displaySessionEndTime(original),
        };
      }
      this.sesionFormTimeZone = this.timeZone.zone();
      this.toast.warning(mensajeUi('UI_TEACHER_GRUPOS_007'));
      return;
    }
    if (!this.horarioSesionSinCambios() && !horarioDentroDelMismoDia(this.sesionForm.startTime, this.sesionForm.endTime)) {
      // DEC-072: la sesión no cruza la medianoche. Una sesión ya guardada que la cruza se puede editar sin tocar su horario.
      this.toast.warning(mensajeUi('UI_SESION_HORARIO_MISMO_DIA'));
      return;
    }
    if (this.modoFormSesion === 'CREAR') {
      this.sessionService
        .createSession(course.id, {
          title: this.sesionForm.title.trim(),
          date: this.sesionForm.date,
          startTime: this.sesionForm.startTime,
          endTime: this.sesionForm.endTime,
        })
        .subscribe({
          next: (res) => {
            if (res.exitoso) {
              // DEC-065 (2): la sesión queda como solicitud pendiente; el mensaje lo entrega el backend.
              this.toast.success(res.mensajeUsuario || res.mensaje || AVISO_SOLICITUD_SESION_REGISTRADA);
              this.cargarSesiones(course.id);
              this.volverASesiones();
            }
          },
          error: (err: unknown) => this.toast.error(getApiErrorMessage(err)),
        });
    } else if (this.selectedSessionId) {
      this.sessionService
        .updateSession(course.id, this.selectedSessionId, {
          title: this.sesionForm.title.trim(),
          date: this.sesionForm.date,
          startTime: this.sesionForm.startTime,
          endTime: this.sesionForm.endTime,
          originalSession: this.sessions().find((session) => session.id === this.selectedSessionId),
        })
        .subscribe({
          next: (res) => {
            // PUT devuelve ApiDataResponse<Void>: solo `exitoso`; el listado se recarga por HTTP.
            if (res.exitoso) {
              this.toast.success(mensajeUi('UI_TEACHER_GRUPOS_008'));
              this.cargarSesiones(course.id);
              this.volverASesiones();
            }
          },
          error: (err: unknown) => this.toast.error(getApiErrorMessage(err)),
        });
    }
  }

  abrirModalRetiro(estudiante: EstudianteGrupoItem): void {
    const idEstudiante = estudiante?.idEstudiante ?? estudiante?.studentId;
    if (!idEstudiante) {
      this.toast.warning(mensajeUi('UI_TEACHER_GRUPOS_009'));
      return;
    }
    this.estudianteARetirar.set({ idEstudiante, nombreCompleto: estudiante?.nombreCompleto ?? estudiante?.studentName });
  }

  /** Tras el retiro se recarga el padrón (el estudiante aparece inactivo y el cupo queda libre). */
  onEstudianteRetirado(): void {
    this.estudianteARetirar.set(null);
    const curso = this.selectedCourse();
    if (curso) {
      this.cargarEstudiantesGrupo(curso.id);
    }
  }

  /** HU047: el canal SSE del grupo marca la sesión cancelada sin recargar por HTTP (sin polling). */
  private escucharCancelaciones(grupoId: string): void {
    this.detenerEscuchaCancelaciones();
    this.realtime.startForGroup(grupoId);
    this.cancelacionesSub = this.realtime
      .listenType<SesionCanceladaRealtimePayload>(REALTIME_EVENT_TYPE.SESION_CANCELADA)
      .subscribe((evento) => {
        const { grupo, sesion, tipo } = evento.payload;
        if (grupo !== grupoId) return;
        const nombre = this.sessions().find((s) => s.id === sesion)?.title;
        this.sessions.update((prev) =>
          marcarSesionCancelada(prev, sesion, { tipo, motivo: null, nombreFestivo: null, fechaCancelacionUtc: null })
        );
        if (tipo === 'COORDINADOR') this.toast.info(mensajeSolicitudRechazadaOCancelada(nombre));
      });
    // DEC-065 (2): la aprobación del coordinador llega como SESION_MANUAL_CREADA de una sesión que estaba pendiente.
    this.aprobacionesSub = this.realtime
      .listenType<SesionManualCreadaRealtimePayload>(REALTIME_EVENT_TYPE.SESION_MANUAL_CREADA)
      .subscribe((evento) => {
        const { grupo, sesion } = evento.payload;
        if (grupo !== grupoId) return;
        const previa = this.sessions().find((s) => s.id === sesion);
        if (!previa || !estaPendienteAprobacion(previa)) return;
        this.sessions.update((prev) => marcarSesionAprobada(prev, sesion));
        this.toast.success(mensajeSolicitudAprobada(previa.title));
      });
  }

  private detenerEscuchaCancelaciones(): void {
    this.aprobacionesSub?.unsubscribe();
    this.aprobacionesSub = null;
    if (!this.cancelacionesSub) return;
    this.cancelacionesSub.unsubscribe();
    this.cancelacionesSub = null;
    this.realtime.stop();
  }

  abrirModalCancelarSesion(sesion: ClassSession): void {
    if (!this.sessionCancelEnabled) return;
    this.errorCancelar.set(null);
    this.sesionACancelar.set(sesion);
    this.modalCancelarVisible.set(true);
  }

  cerrarModalCancelar(): void {
    this.modalCancelarVisible.set(false);
    this.sesionACancelar.set(null);
    this.errorCancelar.set(null);
    this.enviandoCancelacion.set(false);
  }

  confirmarCancelarSesionConMotivo(motivo: string): void {
    const sesion = this.sesionACancelar();
    if (!this.sessionCancelEnabled || !sesion || !motivo.trim()) return;

    this.errorCancelar.set(null);
    this.enviandoCancelacion.set(true);
    this.sessionService.cancelarSesion(sesion.id, motivo.trim()).subscribe({
      next: (res) => {
        this.enviandoCancelacion.set(false);
        if (!res.exitoso) return;
        const cancelacion = res.datos?.cancelacion;
        if (cancelacion) {
          this.sessions.update((prev) => marcarSesionCancelada(prev, sesion.id, cancelacion));
        }
        const notificados = res.datos?.estudiantesNotificados;
        this.toast.success(
          notificados ? mensajeUi('UI_TEACHER_GRUPOS_011', { notificados }) : mensajeUi('UI_COORDINATOR_SESIONES_GRUPO_001')
        );
        this.cerrarModalCancelar();
      },
      error: (err: unknown) => {
        this.enviandoCancelacion.set(false);
        this.errorCancelar.set(getApiErrorMessage(err));
      },
    });
  }

  abrirModalMatriculaGrupo(course: Course): void {
    this.grupoMatricula.set(course);
    this.modalMatriculaGrupoVisible.set(true);
  }

  cerrarModalMatriculaGrupo(): void {
    this.modalMatriculaGrupoVisible.set(false);
    this.grupoMatricula.set(null);
  }

  /** HU175: la proyección del QR vive en la pantalla de asistencia (toma en modo QR). */
  proyectarQrGrupo(course: Course): void {
    if (!this.sessionQrEnabled) return;
    void this.router.navigate(['/app/asistencia'], { queryParams: { courseId: course.id } });
  }

  proyectarSesionEspecifica(sesion: ClassSession): void {
    const course = this.selectedCourse();
    if (!this.sessionQrEnabled || !course) return;
    void this.router.navigate(['/app/asistencia'], {
      queryParams: { courseId: course.id, sessionId: sesion.id },
    });
  }

  tomarAsistenciaGrupo(course: Course): void {
    void this.router.navigate(['/app/asistencia'], { queryParams: { courseId: course.id } });
  }

  tomarAsistenciaSesionEspecifica(sesion: ClassSession): void {
    const course = this.selectedCourse();
    if (!course) return;
    void this.router.navigate(['/app/asistencia'], {
      queryParams: {
        courseId: course.id,
        sessionId: sesion.id,
      },
    });
  }

  irAGestionReclamos(): void {
    void this.router.navigate(['/app/docente/reclamos']);
  }

  irATomaAsistencia(): void {
    void this.router.navigate(['/app/asistencia']);
  }

  abrirDetalleSesionModal(sesion: ClassSession): void {
    this.sesionDetalle.set(sesion);
    this.modalDetalleSesionVisible.set(true);

    // NOTA (PLAN.md LB-001B.1B, hallazgo #22): ya no se sintetiza AN/SJC por paridad del ID
    // del estudiante cuando no hay records reales — si el backend no entregó registros de
    // asistencia, la ausencia de registro se mantiene, sin inventar un reemplazo (DR-002).
  }

  cerrarDetalleSesionModal(): void {
    this.modalDetalleSesionVisible.set(false);
    this.sesionDetalle.set(null);
  }
}
