import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { CourseService } from '../../../core/services/course.service';
import { SessionService } from '../../../core/services/session.service';
import { GroupService } from '../../../core/services/group.service';
import { StudentService } from '../../../core/services/student.service';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { AsignaturaDocenteApiDto } from '../../../core/api/models/asignatura-docente-api-dto.model';
import { Course } from '../../../core/models/course.model';
import { ClassSession } from '../../../core/models/attendance.model';
import { SolicitudRevisionItem } from '../../../core/models/role-management.model';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';

// Componentes Hijos Desacoplados
import { TeacherGruposListComponent } from './components/teacher-grupos-list.component';
import { TeacherGrupoFormComponent } from './components/teacher-grupo-form.component';
import { TeacherGrupoHubComponent } from './components/teacher-grupo-hub.component';
import { TeacherSesionFormComponent } from './components/teacher-sesion-form.component';
import { TeacherProyeccionQrModalComponent } from './components/modals/teacher-proyeccion-qr-modal.component';
import { TeacherMatriculaModalComponent } from './components/modals/teacher-matricula-modal.component';
import { TeacherSesionCancelarModalComponent } from './components/modals/teacher-sesion-cancelar-modal.component';
import { TeacherSesionDetalleModalComponent } from './components/modals/teacher-sesion-detalle-modal.component';
import { getSessionNameError } from '../../../core/validation/session-name.util';
import { environment } from '../../../../environments/environment';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';

type VistaGrupos = 'LISTA' | 'FORM_GRUPO' | 'HUB_GRUPO' | 'FORM_SESION';

@Component({
  selector: 'app-teacher-grupos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TeacherGruposListComponent,
    TeacherGrupoFormComponent,
    TeacherGrupoHubComponent,
    TeacherSesionFormComponent,
    TeacherProyeccionQrModalComponent,
    TeacherMatriculaModalComponent,
    TeacherSesionCancelarModalComponent,
    TeacherSesionDetalleModalComponent,
  ],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- 1. VISTA LISTA PRINCIPAL -->
      @if (vistaActual() === 'LISTA') {
        <app-teacher-grupos-list
          [courses]="courses()"
          [isLoading]="isLoading()"
          [sessionQrEnabled]="sessionQrEnabled"
          (crearGrupo)="abrirCrearGrupo()"
          (irAsistencia)="irATomaAsistencia()"
          (editarGrupo)="abrirEditarGrupo($event)"
          (seleccionarGrupo)="tomarAsistenciaGrupo($event)"
          (matricular)="abrirModalMatriculaGrupo($event)"
          (tomarAsistencia)="tomarAsistenciaGrupo($event)"
        />
      }

      <!-- 2. VISTA FORMULARIO CREAR / EDITAR GRUPO -->
      @if (vistaActual() === 'FORM_GRUPO') {
        <app-teacher-grupo-form
          [modo]="modoFormGrupo"
          [asignaturasDocente]="asignaturasDocente()"
          [(form)]="grupoForm"
          (cancelar)="volverALista()"
          (guardar)="guardarGrupo()"
          (asignaturaChange)="onAsignaturaChange($event)"
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
          [cargandoReclamos]="cargandoReclamos()"
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
          (irReclamos)="irAGestionReclamos()"
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
  isLoading = signal<boolean>(true);

  // Hub del Grupo
  subPestanaHub = signal<'SESIONES' | 'HORARIOS' | 'ESTUDIANTES' | 'RECLAMOS' | 'SABANA'>('SESIONES');
  estudiantesGrupo = signal<any[]>([]);
  cargandoEstudiantes = signal<boolean>(false);
  reclamosGrupo = signal<SolicitudRevisionItem[]>([]);
  cargandoReclamos = signal<boolean>(false);

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

  // Formularios
  modoFormGrupo: 'CREAR' | 'EDITAR' = 'CREAR';
  selectedCourse = signal<Course | null>(null);
  selectedGrupoId: string | null = null;
  asignaturasDocente = signal<AsignaturaDocenteApiDto[]>([]);

  grupoForm = {
    code: '',
    section: '',
    name: '',
    room: '',
    schedule: '',
    cupoMaximo: 35,
    docenteName: '',
    asignaturaId: '',
    diasSeleccionados: ['Lunes', 'Miércoles'],
    horaInicio: '08:00',
    horaFin: '10:00',
    generarSesionesAutomaticas: true,
  };

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
    this.cargarAsignaturasDocente();
  }

  ngOnDestroy(): void {
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

  cargarAsignaturasDocente(): void {
    this.courseService.getAsignaturasDocente().subscribe({
      next: (res) => {
        if (res.exitoso && res.datos) {
          // El endpoint devuelve una fila por grupo: el selector necesita asignaturas únicas.
          const unicas = new Map(res.datos.map((a) => [a.idAsignatura, a]));
          this.asignaturasDocente.set(Array.from(unicas.values()));
        }
      },
      error: () => this.asignaturasDocente.set([]),
    });
  }

  onAsignaturaChange(asignaturaId: string): void {
    const asig = this.asignaturasDocente().find((a) => a.idAsignatura === asignaturaId);
    if (asig) {
      // AsignaturaDocenteDTO no entrega código de materia: no se inventa.
      this.grupoForm.code = '';
      this.grupoForm.name = asig.nombreAsignatura;
      this.grupoForm.asignaturaId = asig.idAsignatura;
    }
  }

  abrirCrearGrupo(): void {
    this.modoFormGrupo = 'CREAR';
    this.selectedGrupoId = null;
    this.selectedCourse.set(null);
    this.grupoForm = {
      code: '',
      section: `Grupo 0${this.courses().length + 1}`,
      name: '',
      room: 'Aula A-101',
      schedule: 'Lunes y Miércoles 08:00 - 10:00',
      cupoMaximo: 35,
      docenteName: '',
      asignaturaId: '',
      diasSeleccionados: ['Lunes', 'Miércoles'],
      horaInicio: '08:00',
      horaFin: '10:00',
      generarSesionesAutomaticas: true,
    };
    this.vistaActual.set('FORM_GRUPO');
  }

  abrirEditarGrupo(course: Course): void {
    this.modoFormGrupo = 'EDITAR';
    this.selectedGrupoId = course.id;
    this.selectedCourse.set(course);

    // Detección inteligente de horario existente
    const sched = course.schedule || '';
    const timeMatch = sched.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    const horaInicio = timeMatch ? timeMatch[1] : '08:00';
    const horaFin = timeMatch ? timeMatch[2] : '10:00';

    const lower = sched.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const dias: string[] = [];
    if (lower.includes('lun')) dias.push('Lunes');
    if (lower.includes('mar')) dias.push('Martes');
    if (lower.includes('mie')) dias.push('Miércoles');
    if (lower.includes('jue')) dias.push('Jueves');
    if (lower.includes('vie')) dias.push('Viernes');
    if (lower.includes('sab')) dias.push('Sábado');

    this.grupoForm = {
      code: course.code ?? '',
      section: course.section,
      name: course.name,
      room: course.room ?? '',
      schedule: course.schedule,
      cupoMaximo: course.cupoMaximo || 35,
      docenteName: course.docenteName || '',
      asignaturaId: '',
      diasSeleccionados: dias.length > 0 ? dias : ['Lunes', 'Miércoles'],
      horaInicio,
      horaFin,
      generarSesionesAutomaticas: false,
    };
    this.vistaActual.set('FORM_GRUPO');
  }

  guardarGrupo(): void {
    if (this.modoFormGrupo === 'CREAR') {
      if (this.asignaturasDocente().length > 0 && !this.grupoForm.asignaturaId) {
        this.toast.warning('El campo Asignatura Asignada es obligatorio.');
        return;
      }
      const codigoRequerido = this.asignaturasDocente().length === 0;
      if ((codigoRequerido && !this.grupoForm.code.trim()) || !this.grupoForm.name.trim()) {
        this.toast.warning('El código y el nombre de la asignatura son obligatorios.');
        return;
      }

      this.courseService
        .crearGrupo({
          code: this.grupoForm.code.trim(),
          name: this.grupoForm.name.trim(),
          section: this.grupoForm.section.trim(),
          schedule: this.grupoForm.schedule.trim(),
          room: this.grupoForm.room.trim(),
          cupoMaximo: Number(this.grupoForm.cupoMaximo) || 35,
          asignaturaId: this.grupoForm.asignaturaId || undefined,
        })
        .subscribe({
          next: (res) => {
            if (res.exitoso) {
              this.toast.success(res.mensajeUsuario || 'Grupo creado con éxito.');
              this.cargarGrupos();
              this.volverALista();
            } else {
              this.toast.error(res.mensajeUsuario || 'No fue posible crear el grupo.');
            }
          },
          error: (err: unknown) => {
            this.toast.error(getApiErrorMessage(err) || 'Error al crear el grupo.');
          },
        });
    } else if (this.selectedGrupoId) {
      this.courseService
        .actualizarGrupo(this.selectedGrupoId, {
          code: this.grupoForm.code.trim(),
          name: this.grupoForm.name.trim(),
          section: this.grupoForm.section.trim(),
          schedule: this.grupoForm.schedule.trim(),
          room: this.grupoForm.room.trim(),
          cupoMaximo: Number(this.grupoForm.cupoMaximo) || 35,
        })
        .subscribe({
          next: (res) => {
            if (res.exitoso) {
              this.toast.success(res.mensajeUsuario || 'Grupo actualizado.');
              this.cargarGrupos();
              this.volverALista();
            }
          },
          error: (err: unknown) => this.toast.error(getApiErrorMessage(err)),
        });
    }
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
    this.vistaActual.set('LISTA');
    this.selectedCourse.set(null);
    this.selectedGrupoId = null;
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
    this.cargandoReclamos.set(true);
    this.claimService.getReclamosDocente().subscribe({
      next: (res) => {
        const items = res.datos || [];
        this.reclamosGrupo.set(items);
        this.cargandoReclamos.set(false);
      },
      error: () => {
        this.reclamosGrupo.set([]);
        this.cargandoReclamos.set(false);
      },
    });
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
    if (!environment.useSessionsV2 && this.sesionForm.startTime >= this.sesionForm.endTime) {
      this.toast.warning('El campo Hora Fin de la sesión debe ser posterior a la Hora Inicio.');
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
