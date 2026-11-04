import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { CourseService, GrupoCoordinadorPayload } from '../../../core/services/course.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { CatalogoPrograma } from '../../../core/models/programa-academico.model';
import { OfertaCreacionGruposDocenteApiDto } from '../../../core/api/models/oferta-creacion-grupos-docente-api-dto.model';
import { SessionService } from '../../../core/services/session.service';
import { GroupService } from '../../../core/services/group.service';
import { StudentService } from '../../../core/services/student.service';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { Course } from '../../../core/models/course.model';
import { ClassSession } from '../../../core/models/attendance.model';
import { type EstadoCargaReclamos, SolicitudRevisionItem } from '../../../core/models/role-management.model';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { isUuid } from '../../../core/utils/uuid.util';

// Componentes Hijos Desacoplados
import { TeacherGruposListComponent } from './components/teacher-grupos-list.component';
import { TeacherGrupoHubComponent } from './components/teacher-grupo-hub.component';
import { TeacherSesionFormComponent } from './components/teacher-sesion-form.component';
import { TeacherGrupoFormComponent } from './components/teacher-grupo-form.component';
import { TeacherProyeccionQrModalComponent } from './components/modals/teacher-proyeccion-qr-modal.component';
import { TeacherMatriculaModalComponent } from './components/modals/teacher-matricula-modal.component';
import { TeacherSesionCancelarModalComponent } from './components/modals/teacher-sesion-cancelar-modal.component';
import { TeacherSesionDetalleModalComponent } from './components/modals/teacher-sesion-detalle-modal.component';
import { TeacherRetiroEstudianteModalComponent } from './components/modals/teacher-retiro-estudiante-modal.component';
import { getSessionNameError } from '../../../core/validation/session-name.util';
import { environment } from '../../../../environments/environment';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';

type VistaGrupos = 'LISTA' | 'HUB_GRUPO' | 'FORM_SESION' | 'FORM_GRUPO';

@Component({
  selector: 'app-teacher-grupos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TeacherGruposListComponent,
    TeacherGrupoHubComponent,
    TeacherSesionFormComponent,
    TeacherGrupoFormComponent,
    TeacherProyeccionQrModalComponent,
    TeacherMatriculaModalComponent,
    TeacherSesionCancelarModalComponent,
    TeacherSesionDetalleModalComponent,
    TeacherRetiroEstudianteModalComponent,
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
          (nuevoGrupo)="abrirNuevoGrupo()"
          (seleccionarGrupo)="tomarAsistenciaGrupo($event)"
          (matricular)="abrirModalMatriculaGrupo($event)"
          (tomarAsistencia)="tomarAsistenciaGrupo($event)"
        />
      }

      <!-- 2. FORMULARIO NUEVO GRUPO (F3: el docente crea sus grupos) -->
      @if (vistaActual() === 'FORM_GRUPO') {
        <app-teacher-grupo-form
          [oferta]="ofertaGrupos()"
          [cargando]="cargandoOferta()"
          [guardando]="guardandoGrupo()"
          (guardar)="guardarNuevoGrupo($event)"
          (cancelar)="volverALista()"
        />
      }

      <!-- 3. VISTA HUB INTEGRAL DEL GRUPO -->
      @if (vistaActual() === 'HUB_GRUPO' && selectedCourse()) {
        <app-teacher-grupo-hub
          [selectedCourse]="selectedCourse()"
          [sessions]="sessions()"
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
          (proyectarQr)="abrirModalProyeccionParaGrupo($event)"
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
      <app-teacher-proyeccion-qr-modal
        [isOpen]="modalProyeccionVisible()"
        [curso]="selectedCourse()"
        [sessions]="sessions()"
        [sesionActivaId]="sesionActivaId()"
        [datosQr]="datosQr()"
        [segundosRestantes]="segundosRestantes()"
        (cambiarSesion)="cambiarSesionActiva($event)"
        (refrescarQr)="refrescarQrManual()"
        (closed)="cerrarModalProyeccion()"
      />

      <app-teacher-matricula-modal
        [isOpen]="modalMatriculaGrupoVisible()"
        [curso]="grupoMatricula()"
        (closed)="cerrarModalMatriculaGrupo()"
      />

      <app-teacher-sesion-cancelar-modal
        [isOpen]="modalCancelarVisible()"
        [sesion]="sesionACancelar()"
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
  `,
})
export class TeacherGruposComponent implements OnInit, OnDestroy {
  private courseService = inject(CourseService);
  private catalogService = inject(CatalogService);
  private sessionService = inject(SessionService);
  private groupService = inject(GroupService);
  private studentService = inject(StudentService);
  private claimService = inject(AttendanceClaimService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private timeZone = inject(SessionTimeZoneService);

  // OUT_OF_GOLDEN_PATH (LB-001B.5A): sin contrato backend → deshabilitadas por feature explícita.
  readonly sessionQrEnabled = environment.features.sessionQrEnabled;
  readonly sessionCancelEnabled = environment.features.sessionCancelEnabled;

  vistaActual = signal<VistaGrupos>('LISTA');
  courses = signal<Course[]>([]);
  /** HU058: opciones del filtro "Nivel formativo" (catálogo real de tipos de programa). */
  tiposPrograma = signal<CatalogoPrograma[]>([]);
  isLoading = signal<boolean>(true);

  // Nuevo grupo (F3)
  ofertaGrupos = signal<OfertaCreacionGruposDocenteApiDto | null>(null);
  cargandoOferta = signal<boolean>(false);
  guardandoGrupo = signal<boolean>(false);

  // Hub del Grupo
  subPestanaHub = signal<'SESIONES' | 'HORARIOS' | 'ESTUDIANTES' | 'SOLICITUDES' | 'RECLAMOS' | 'SABANA'>('SESIONES');
  estudiantesGrupo = signal<any[]>([]);
  cargandoEstudiantes = signal<boolean>(false);
  reclamosGrupo = signal<SolicitudRevisionItem[]>([]);
  estadoCargaReclamos = signal<EstadoCargaReclamos>('IDLE');
  private reclamosGrupoSubscription: Subscription | null = null;
  private reclamosGrupoRequestId = 0;
  private grupoReclamosActivo: string | null = null;

  // Modal Detalle Sesión (Historial)
  modalDetalleSesionVisible = signal<boolean>(false);
  sesionDetalle = signal<ClassSession | null>(null);

  // Proyección QR / PIN
  modalProyeccionVisible = signal<boolean>(false);
  sesionActivaId = signal<string>('');
  datosQr = signal<any>(null);
  segundosRestantes = signal<number>(30);
  private timerRef: any = null;

  // Matrícula por Grupo
  modalMatriculaGrupoVisible = signal<boolean>(false);
  grupoMatricula = signal<Course | null>(null);

  // Cancelar Sesión
  modalCancelarVisible = signal<boolean>(false);
  sesionACancelar = signal<ClassSession | null>(null);
  /** HU051: estudiante cuyo retiro se está confirmando (null = modal cerrado). */
  estudianteARetirar = signal<{ idEstudiante: string; nombreCompleto?: string } | null>(null);

  // Formularios (F3: el docente crea sus grupos con su horario inicial; los cambios posteriores los aprueba el coordinador)
  selectedCourse = signal<Course | null>(null);

  modoFormSesion: 'CREAR' | 'EDITAR' = 'CREAR';
  sessions = signal<ClassSession[]>([]);
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
    this.detenerTimerQr();
  }

  cargarGrupos(): void {
    this.isLoading.set(true);
    this.courseService.getTeacherCourses().subscribe({
      next: (coursesRes) => {
        const teacherCourses = coursesRes.datos || [];
        this.courses.set(teacherCourses);
        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        this.isLoading.set(false);
        this.toast.error(getApiErrorMessage(err) || 'Error al cargar grupos.');
      },
    });
  }

  /** F3: abre el formulario de nuevo grupo con la oferta de asignaturas de los programas del docente. */
  abrirNuevoGrupo(): void {
    this.vistaActual.set('FORM_GRUPO');
    this.ofertaGrupos.set(null);
    this.cargandoOferta.set(true);
    this.courseService.getOfertaCreacionGrupos().subscribe({
      next: (res) => {
        this.ofertaGrupos.set(res.datos ?? null);
        this.cargandoOferta.set(false);
      },
      error: (err: unknown) => {
        this.cargandoOferta.set(false);
        this.toast.error(getApiErrorMessage(err) || 'No fue posible cargar tus asignaturas.');
      },
    });
  }

  guardarNuevoGrupo(payload: GrupoCoordinadorPayload): void {
    this.guardandoGrupo.set(true);
    this.courseService.crearGrupo(payload).subscribe({
      next: (res) => {
        this.guardandoGrupo.set(false);
        if (res.exitoso) {
          this.toast.success(res.mensajeUsuario || 'Grupo creado.');
          this.volverALista();
          this.cargarGrupos();
        } else {
          this.toast.error(res.mensajeUsuario || 'No fue posible crear el grupo.');
        }
      },
      error: (err: unknown) => {
        this.guardandoGrupo.set(false);
        this.toast.error(getApiErrorMessage(err) || 'No fue posible crear el grupo.');
      },
    });
  }

  verHubGrupo(course: Course): void {
    this.selectedCourse.set(course);
    this.vistaActual.set('HUB_GRUPO');
    this.subPestanaHub.set('SESIONES');
    this.cargarSesiones(course.id);
    this.cargarEstudiantesGrupo(course.id);
    this.cargarReclamosGrupo(course.id);
  }

  volverALista(): void {
    this.cancelarCargaReclamosGrupo();
    this.vistaActual.set('LISTA');
    this.selectedCourse.set(null);
    this.detenerTimerQr();
  }

  cargarSesiones(courseId: string): void {
    this.loadingSessions.set(true);
    this.sessionService.getSessionsByGroup(courseId).subscribe({
      next: (res) => {
        this.sessions.set(res.datos || []);
        this.loadingSessions.set(false);
      },
      error: () => {
        this.loadingSessions.set(false);
        this.toast.error('Error al cargar sesiones del grupo.');
      },
    });
  }

  cargarEstudiantesGrupo(courseId: string): void {
    this.cargandoEstudiantes.set(true);
    this.studentService.getStudentsByGroup(courseId).subscribe({
      next: (res: any) => {
        const list = res?.items || res?.datos || (Array.isArray(res) ? res : []);
        this.estudiantesGrupo.set(list);
        this.cargandoEstudiantes.set(false);
      },
      error: () => {
        this.estudiantesGrupo.set([]);
        this.cargandoEstudiantes.set(false);
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

  guardarSesion(): void {
    const course = this.selectedCourse();
    if (!course) return;

    const nombreError = getSessionNameError(this.sesionForm.title);
    if (nombreError) {
      this.toast.warning(nombreError);
      return;
    }
    if (!this.sesionForm.date) {
      this.toast.warning('El campo Fecha de la Sesión es obligatorio.');
      return;
    }
    if (!this.sesionForm.startTime || !this.sesionForm.endTime) {
      this.toast.warning('Los campos Hora Inicio y Hora Fin de la sesión son obligatorios.');
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
      this.toast.warning('La zona horaria activa cambió mientras editabas. Se recargó el horario original; revisa los datos antes de guardar.');
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
              this.toast.success(res.mensaje || 'Sesión programada con éxito.');
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
              this.toast.success('Sesión actualizada.');
              this.cargarSesiones(course.id);
              this.volverASesiones();
            }
          },
          error: (err: unknown) => this.toast.error(getApiErrorMessage(err)),
        });
    }
  }

  abrirModalRetiro(estudiante: any): void {
    const idEstudiante = estudiante?.idEstudiante ?? estudiante?.studentId;
    if (!idEstudiante) {
      this.toast.warning('No se pudo identificar al estudiante a retirar.');
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

  abrirModalCancelarSesion(sesion: ClassSession): void {
    if (!this.sessionCancelEnabled) return;
    this.sesionACancelar.set(sesion);
    this.modalCancelarVisible.set(true);
  }

  cerrarModalCancelar(): void {
    this.modalCancelarVisible.set(false);
    this.sesionACancelar.set(null);
  }

  confirmarCancelarSesionConMotivo(motivo: string): void {
    const sesion = this.sesionACancelar();
    const course = this.selectedCourse();
    if (!this.sessionCancelEnabled || !sesion || !motivo.trim()) return;

    this.sessionService.cancelarSesion(sesion.id, motivo.trim()).subscribe({
      next: (res) => {
        if (res.exitoso) {
          this.toast.success(res.mensajeUsuario || 'Sesión cancelada formalmente.');
          this.cerrarModalCancelar();
          if (course) {
            this.cargarSesiones(course.id);
          }
        } else {
          this.toast.error(res.mensajeUsuario || 'No fue posible cancelar la sesión.');
        }
      },
      error: (err: unknown) => this.toast.error(getApiErrorMessage(err)),
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

  abrirModalProyeccionParaGrupo(course: Course): void {
    if (!this.sessionQrEnabled) return;
    this.selectedCourse.set(course);
    this.modalProyeccionVisible.set(true);

    this.sessionService.getSessionsByGroup(course.id).subscribe({
      next: (res) => {
        const sesiones = res.datos || [];
        this.sessions.set(sesiones);
        const activa = sesiones[0];
        if (activa) {
          this.cambiarSesionActiva(activa.id);
        }
      },
    });
  }

  proyectarSesionEspecifica(sesion: ClassSession): void {
    if (!this.sessionQrEnabled) return;
    this.modalProyeccionVisible.set(true);
    this.cambiarSesionActiva(sesion.id);
  }

  cerrarModalProyeccion(): void {
    this.modalProyeccionVisible.set(false);
    this.detenerTimerQr();
  }

  cambiarSesionActiva(sesionId: string): void {
    this.sesionActivaId.set(sesionId);
    this.refrescarQrManual();
  }

  refrescarQrManual(): void {
    const sesionId = this.sesionActivaId();
    if (!this.sessionQrEnabled || !sesionId) return;

    this.sessionService.getQrToken(sesionId).subscribe({
      next: (res) => {
        if (res.exitoso && res.datos) {
          this.datosQr.set(res.datos);
          this.iniciarTimerQr(res.datos.expiraEnSegundos || 30);
        }
      },
      error: (err) => {
        this.detenerTimerQr();
        this.datosQr.set(null);
        const mensaje = getApiErrorMessage(err);
        this.toast.error(mensaje);
      },
    });
  }

  private iniciarTimerQr(segundos: number): void {
    this.detenerTimerQr();
    this.segundosRestantes.set(segundos);
    this.timerRef = setInterval(() => {
      const rest = this.segundosRestantes() - 1;
      if (rest <= 0) {
        this.detenerTimerQr();
        this.refrescarQrManual();
      } else {
        this.segundosRestantes.set(rest);
      }
    }, 1000);
  }

  private detenerTimerQr(): void {
    if (this.timerRef) {
      clearInterval(this.timerRef);
      this.timerRef = null;
    }
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
