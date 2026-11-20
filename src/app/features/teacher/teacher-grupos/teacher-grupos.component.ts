import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { mensajeSolicitudAprobada, mensajeSolicitudRechazadaOCancelada } from '../../../core/models/sesion-manual.util';
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
import { TeacherGruposResumenService } from '../../../core/services/teacher-grupos-resumen.service';
import { TeacherMatrizAsistenciaService } from '../../../core/services/teacher-matriz-asistencia.service';
import { ResumenSesionesGrupo } from '../../../core/models/resumen-sesiones-grupo.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { Course } from '../../../core/models/course.model';
import { EstudianteGrupoItem } from '../../../core/models/estudiante-grupo-item.model';
import { ClassSession } from '../../../core/models/attendance.model';
import { type EstadoCargaReclamos, SolicitudRevisionItem } from '../../../core/models/role-management.model';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';

// Componentes Hijos Desacoplados
import { TeacherGruposListComponent } from './components/teacher-grupos-list.component';
import { SubPestanaHub, TeacherGrupoHubComponent, pestanaDeGrupo } from './components/teacher-grupo-hub.component';
import { TeacherMatriculaModalComponent } from './components/modals/teacher-matricula-modal.component';
import { TeacherRetiroEstudianteModalComponent } from './components/modals/teacher-retiro-estudiante-modal.component';
import { environment } from '../../../../environments/environment';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { RevisionCancelacionService } from '../../../core/services/revision-cancelacion.service';

type VistaGrupos = 'LISTA' | 'HUB_GRUPO';
/** Tamaño máximo de página del servidor (PAGINACION/TAMANO_MAXIMO) para repartir las decisiones pendientes por grupo. */
const TAMANO_PAGINA_DECISIONES = 100;

@Component({
    selector: 'app-teacher-grupos',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    TeacherGruposListComponent,
    TeacherGrupoHubComponent,
    TeacherMatriculaModalComponent,
    TeacherRetiroEstudianteModalComponent
],
    template: `
    <div class="space-y-4 animate-fade-in">
      <!-- 1. VISTA LISTA PRINCIPAL -->
      @if (vistaActual() === 'LISTA') {
        <app-teacher-grupos-list
          [courses]="courses()"
          [totalEstudiantes]="totalEstudiantes()"
          [tiposPrograma]="tiposPrograma()"
          [isLoading]="isLoading()"
          [sessionQrEnabled]="sessionQrEnabled"
          (irAsistencia)="irATomaAsistencia()"
          (seleccionarGrupo)="tomarAsistenciaGrupo($event)"
          (matricular)="abrirModalMatriculaGrupo($event)"
          (tomarAsistencia)="tomarAsistenciaGrupo($event)"
          [decisionesPorGrupo]="decisionesPorGrupo()"
          (verDecisiones)="verHubGrupo($event)"
        />
      }

      <!-- 3. VISTA HUB INTEGRAL DEL GRUPO -->
      @if (vistaActual() === 'HUB_GRUPO' && selectedCourse()) {
        @defer (when vistaActual() === 'HUB_GRUPO' && selectedCourse() !== null) {
          <app-teacher-grupo-hub
            [selectedCourse]="selectedCourse()"
            [sessions]="sessions()"
            [resumenSesiones]="resumenSesiones()"
            [loadingSessions]="loadingSessions()"
            [reclamos]="reclamosGrupo()"
            [totalReclamos]="totalReclamosGrupo()"
            [paginaReclamos]="paginaReclamosGrupo()"
            [tamanoReclamos]="tamanoReclamosGrupo"
            [padronPagina]="padronPagina()"
            [totalEstudiantes]="totalPadron()"
            [paginaPadron]="paginaPadron()"
            [tamanoPadron]="tamanoPadron()"
            [busquedaPadron]="busquedaPadron()"
            [cargandoPadron]="cargandoPadron()"
            [estadoCargaReclamos]="estadoCargaReclamos()"
            [sessionQrEnabled]="sessionQrEnabled"
            [(subPestanaHub)]="subPestanaHub"
            (volver)="volverALista()"
            (irAsistencia)="tomarAsistenciaGrupo($event)"
            (proyectarQr)="proyectarQrGrupo($event)"
            (matricular)="abrirModalMatriculaGrupo($event)"
            (retirarEstudiante)="abrirModalRetiro($event)"
            (irReclamos)="irAGestionReclamos()"
            (reintentarReclamos)="reintentarCargaReclamosGrupo()"
            (paginaReclamosChange)="cambiarPaginaReclamosGrupo($event)"
            (paginaPadronChange)="cambiarPaginaPadron($event)"
            (tamanoPadronChange)="cambiarTamanoPadron($event)"
            (busquedaPadronChange)="cambiarBusquedaPadron($event)"
          />
        } @loading {
          <div class="superficie p-4 text-sm text-warm-600" role="status" aria-live="polite">
            Abriendo el grupo…
          </div>
        }
      }

      <!-- 4. MODALES DESACOPLADOS (las acciones por sesión viven en el historial de la toma de asistencia) -->
      @defer (when modalMatriculaGrupoVisible()) {
        <app-teacher-matricula-modal
          [isOpen]="modalMatriculaGrupoVisible()"
          [curso]="grupoMatricula()"
          (closed)="cerrarModalMatriculaGrupo()"
          (matriculado)="cargarEstudiantesGrupo($event)"
        />
      }

      @defer (when estudianteARetirar() !== null) {
        <app-teacher-retiro-estudiante-modal
          [isOpen]="estudianteARetirar() !== null"
          [grupoId]="selectedCourse()?.id ?? null"
          [estudiante]="estudianteARetirar()"
          (retirado)="onEstudianteRetirado()"
          (closed)="estudianteARetirar.set(null)"
        />
      }
    </div>
  `
})
export class TeacherGruposComponent implements OnInit, OnDestroy {
  private readonly courseService = inject(CourseService);
  private readonly catalogService = inject(CatalogService);
  private readonly sessionService = inject(SessionService);
  private readonly groupService = inject(GroupService);
  private readonly studentService = inject(StudentService);
  private readonly resumenSesionesService = inject(TeacherMatrizAsistenciaService);
  private readonly claimService = inject(AttendanceClaimService);
  private readonly gruposResumen = inject(TeacherGruposResumenService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly toast = inject(ToastService);
  private readonly realtime = inject(RealtimeService);
  private readonly revisiones = inject(RevisionCancelacionService);
  private cancelacionesSub: Subscription | null = null;
  private aprobacionesSub: Subscription | null = null;

  // QR (HU175, CULM-001 B.2). La cancelación con motivo (HU047) vive en el menú "Acciones" del historial de la toma.
  readonly sessionQrEnabled = environment.features.sessionQrEnabled;

  vistaActual = signal<VistaGrupos>('LISTA');
  courses = signal<Course[]>([]);
  /** HU058: opciones del filtro "Nivel formativo" (catálogo real de tipos de programa). */
  tiposPrograma = signal<CatalogoPrograma[]>([]);
  isLoading = signal<boolean>(true);

  // Hub del Grupo
  subPestanaHub = signal<SubPestanaHub>('SABANA');
  /** CIERRE-W3M: conteos, estado temporal y sesion en curso o proxima del grupo abierto, resueltos por el servidor. */
  resumenSesiones = signal<ResumenSesionesGrupo | null>(null);
  private resumenSesionesSubscription: Subscription | null = null;
  reclamosGrupo = signal<SolicitudRevisionItem[]>([]);
  /** CIERRE-W1A: `reclamosGrupo` es la página vigente que filtra y pagina el servidor; el total es el del servidor. */
  totalReclamosGrupo = signal<number>(0);
  paginaReclamosGrupo = signal<number>(1);
  readonly tamanoReclamosGrupo = 15;
  /** CIERRE-W1A: página del padrón (pestaña Matrícula) y su búsqueda, resueltas por el servidor. */
  padronPagina = signal<EstudianteGrupoItem[]>([]);
  totalPadron = signal<number | null>(null);
  paginaPadron = signal<number>(1);
  tamanoPadron = signal<number>(15);
  busquedaPadron = signal<string>('');
  cargandoPadron = signal<boolean>(false);
  private padronSubscription: Subscription | null = null;
  estadoCargaReclamos = signal<EstadoCargaReclamos>('IDLE');
  private reclamosGrupoSubscription: Subscription | null = null;
  private reclamosGrupoRequestId = 0;
  private grupoReclamosActivo: string | null = null;

  // Matrícula por Grupo
  modalMatriculaGrupoVisible = signal<boolean>(false);
  grupoMatricula = signal<Course | null>(null);

  /** HU051: estudiante cuyo retiro se está confirmando (null = modal cerrado). */
  estudianteARetirar = signal<{ idEstudiante: string; nombreCompleto?: string } | null>(null);

  // Grupo abierto en el hub (DEC-065 (4): el docente no crea grupos; solo el coordinador)
  selectedCourse = signal<Course | null>(null);

  sessions = signal<ClassSession[]>([]);
  loadingSessions = signal<boolean>(false);

  ngOnInit(): void {
    this.cargarGrupos();
    // Si el catálogo no carga, el filtro simplemente no se muestra.
    this.catalogService.getTiposPrograma().subscribe({
      next: (tipos) => this.tiposPrograma.set(tipos ?? []),
      error: () => this.tiposPrograma.set([]),
    });
  }

  ngOnDestroy(): void {
    this.padronSubscription?.unsubscribe();
    this.resumenSesionesSubscription?.unsubscribe();
    this.cancelarCargaReclamosGrupo();
    this.detenerEscuchaCancelaciones();
  }

  /**
   * Decisiones por inasistencia pendientes del docente por grupo: el número del menú "Mis Grupos" se reparte entre las
   * tarjetas para llevar directo al grupo. Una sola página del tamaño máximo; sin datos o con error no se marca ningún grupo.
   */
  readonly decisionesPorGrupo = signal<ReadonlyMap<string, number>>(new Map());

  cargarDecisionesPendientes(): void {
    this.revisiones.consultarDocente({ soloPendientes: true, pagina: 1, tamano: TAMANO_PAGINA_DECISIONES }).subscribe({
      next: (res) => {
        const porGrupo = new Map<string, number>();
        for (const revision of res.elementos ?? []) {
          const idGrupo = revision.idGrupo ?? revision.grupo?.id;
          if (idGrupo) porGrupo.set(idGrupo, (porGrupo.get(idGrupo) ?? 0) + 1);
        }
        this.decisionesPorGrupo.set(porGrupo);
      },
      error: () => this.decisionesPorGrupo.set(new Map()),
    });
  }

  /** CIERRE-W3I: total de estudiantes activos de sus grupos habilitados, calculado en la base (no se suma en el cliente). */
  readonly totalEstudiantes = signal<number | null>(null);

  cargarGrupos(): void {
    this.isLoading.set(true);
    this.cargarDecisionesPendientes();
    this.gruposResumen.consultar().subscribe({
      next: (res) => this.totalEstudiantes.set(res.datos?.estudiantesActivos ?? null),
      error: () => this.totalEstudiantes.set(null),
    });
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
   * donde está el retiro con motivo. Un id ajeno se ignora y queda la lista. `&pestana=ESTUDIANTES` abre la
   * matrícula; una pestaña desconocida abre la planilla.
   */
  private abrirHubSolicitado(cursos: Course[]): void {
    const id = this.route?.snapshot.queryParamMap.get('grupo');
    const curso = id ? cursos.find((c) => c.id === id) : undefined;
    if (curso) {
      this.verHubGrupo(curso, pestanaDeGrupo(this.route?.snapshot.queryParamMap.get('pestana')));
    }
  }

  verHubGrupo(course: Course, pestana: SubPestanaHub = 'SABANA'): void {
    this.selectedCourse.set(course);
    this.vistaActual.set('HUB_GRUPO');
    this.subPestanaHub.set(pestana);
    this.paginaPadron.set(1);
    this.busquedaPadron.set('');
    this.paginaReclamosGrupo.set(1);
    this.cargarSesiones(course.id);
    this.cargarEstudiantesGrupo(course.id);
    this.cargarReclamosGrupo(course.id);
    this.escucharCancelaciones(course.id);
  }

  volverALista(): void {
    this.cancelarCargaReclamosGrupo();
    this.detenerEscuchaCancelaciones();
    this.vistaActual.set('LISTA');
    this.selectedCourse.set(null);
    // Al volver del grupo (donde pudo decidir) se recalcula a qué grupos les quedan decisiones pendientes.
    this.cargarDecisionesPendientes();
  }

  cargarSesiones(courseId: string): void {
    this.loadingSessions.set(true);
    this.sessionService.getSessionsByGroup(courseId).subscribe({
      next: (res) => {
        this.sessions.set(res.datos || []);
        this.loadingSessions.set(false);
        this.cargarResumenSesiones(courseId);
      },
      error: (err: unknown) => {
        this.loadingSessions.set(false);
        this.toast.error(getApiErrorMessage(err));
      },
    });
  }

  /** CIERRE-W3M: el servidor entrega el estado temporal y los conteos de las sesiones; aqui solo se pide y se guarda. */
  cargarResumenSesiones(courseId: string): void {
    this.resumenSesionesSubscription?.unsubscribe();
    this.resumenSesionesSubscription = this.resumenSesionesService.consultarResumenSesiones(courseId).subscribe({
      next: (res) => this.resumenSesiones.set(res.datos ?? null),
      error: (err: unknown) => {
        this.resumenSesiones.set(null);
        this.toast.error(getApiErrorMessage(err));
      },
    });
  }

  /** Pide al servidor la página vigente del padrón (con la búsqueda actual); solo muestra lo que llega. */
  private cargarPadronPagina(courseId: string): void {
    this.padronSubscription?.unsubscribe();
    this.cargandoPadron.set(true);
    this.padronSubscription = this.studentService
      .getPadronGrupoPagina(courseId, {
        pagina: this.paginaPadron(),
        tamano: this.tamanoPadron(),
        busqueda: this.busquedaPadron(),
      })
      .subscribe({
        next: (res) => {
          const total = res.totalElementos;
          const ultimaPagina = Math.max(1, Math.ceil(total / this.tamanoPadron()));
          if (res.elementos.length === 0 && total > 0 && this.paginaPadron() > ultimaPagina) {
            this.paginaPadron.set(ultimaPagina);
            this.cargarPadronPagina(courseId);
            return;
          }
          this.padronPagina.set(res.elementos);
          this.totalPadron.set(total);
          this.cargandoPadron.set(false);
        },
        error: (err: unknown) => {
          this.padronPagina.set([]);
          this.totalPadron.set(null);
          this.cargandoPadron.set(false);
          this.toast.error(getApiErrorMessage(err));
        },
      });
  }

  cambiarPaginaPadron(pagina: number): void {
    this.paginaPadron.set(pagina);
    this.recargarPadron();
  }

  cambiarTamanoPadron(tamano: number): void {
    this.tamanoPadron.set(tamano);
    this.paginaPadron.set(1);
    this.recargarPadron();
  }

  cambiarBusquedaPadron(texto: string): void {
    this.busquedaPadron.set(texto);
    this.paginaPadron.set(1);
    this.recargarPadron();
  }

  private recargarPadron(): void {
    const grupoId = this.selectedCourse()?.id;
    if (grupoId) {
      this.cargarPadronPagina(grupoId);
    }
  }

  /** Recarga la pagina del padron y el resumen del grupo (cambian los activos al matricular o retirar). */
  cargarEstudiantesGrupo(courseId: string): void {
    this.cargarPadronPagina(courseId);
    this.cargarResumenSesiones(courseId);
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

    const pagina = this.paginaReclamosGrupo();
    this.reclamosGrupoSubscription = this.claimService
      .getReclamosDocentePorGrupo(grupoId, { pagina, tamano: this.tamanoReclamosGrupo })
      .subscribe({
        next: (res) => {
          if (!sigueSiendoLaCargaActual()) {
            return;
          }
          const total = res.total ?? res.datos.length;
          const ultimaPagina = Math.max(1, Math.ceil(total / this.tamanoReclamosGrupo));
          if (res.datos.length === 0 && total > 0 && pagina > ultimaPagina) {
            this.paginaReclamosGrupo.set(ultimaPagina);
            this.grupoReclamosActivo = null;
            this.cargarReclamosGrupo(grupoId);
            return;
          }
          this.reclamosGrupo.set(res.datos);
          this.totalReclamosGrupo.set(total);
          this.estadoCargaReclamos.set('LOADED');
        },
        error: (error: unknown) => {
          if (!sigueSiendoLaCargaActual()) {
            return;
          }
          this.reclamosGrupo.set([]);
          this.totalReclamosGrupo.set(0);
          this.estadoCargaReclamos.set(this.estadoReclamosDesdeError(error));
        },
      });
  }

  /** La pestaña de reclamos del hub pide otra página: la resuelve el servidor. */
  cambiarPaginaReclamosGrupo(pagina: number): void {
    this.paginaReclamosGrupo.set(pagina);
    this.grupoReclamosActivo = null;
    this.cargarReclamosGrupo();
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
    this.totalReclamosGrupo.set(0);
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
        this.cargarResumenSesiones(grupoId);
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
        this.cargarResumenSesiones(grupoId);
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

  tomarAsistenciaGrupo(course: Course): void {
    void this.router.navigate(['/app/asistencia'], { queryParams: { courseId: course.id } });
  }

  irAGestionReclamos(): void {
    void this.router.navigate(['/app/docente/reclamos']);
  }

  irATomaAsistencia(): void {
    void this.router.navigate(['/app/asistencia']);
  }

}
