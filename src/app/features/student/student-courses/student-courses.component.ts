import { Component, OnDestroy, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Subscription, finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { StudentManagementService } from '../../../core/services/student-management.service';
import { AttendanceClaimService, IdentificadorInvalidoError } from '../../../core/services/attendance-claim.service';
import { AuthService } from '../../../core/services/auth.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { CourseService } from '../../../core/services/course.service';
import { SessionService } from '../../../core/services/session.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { LoadErrorState, classifyLoadError, loadErrorState } from '../../../core/api/errors/load-error.util';
import { isUuid } from '../../../core/utils/uuid.util';
import { RadicacionIntento, huellaRadicacion } from '../../../core/utils/radicacion-intento.util';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { validateSoporteFile } from '../../../core/files/soporte-file.validator';
import {
  MateriaEstudianteItem,
  SesionMateriaDetalle,
  CategoriaJustificacion,
  SoporteAdjuntoItem,
} from '../../../core/models/role-management.model';
import { Course } from '../../../core/models/course.model';

// Subcomponentes Desacoplados
import { StudentCoursesListComponent } from './components/student-courses-list.component';
import { StudentCourseDetailComponent } from './components/student-course-detail.component';
import { StudentClaimFormComponent } from './components/student-claim-form.component';
import { StudentPrerequisitosModalComponent } from './components/modals/student-prerequisitos-modal.component';
import { StudentAutoAsistenciaModalComponent } from './components/modals/student-auto-asistencia-modal.component';
import { StudentMatriculaCodigoModalComponent } from './components/modals/student-matricula-codigo-modal.component';

type VistaEstudiante = 'LISTA' | 'DETALLE' | 'RECLAMO' | 'SOLICITAR_MATRICULA';

@Component({
  selector: 'app-student-courses',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    StudentCoursesListComponent,
    StudentCourseDetailComponent,
    StudentClaimFormComponent,
    StudentPrerequisitosModalComponent,
    StudentAutoAsistenciaModalComponent,
    StudentMatriculaCodigoModalComponent,
  ],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- 1. Vista: Lista Principal de Materias -->
      @if (vistaActual() === 'LISTA') {
        <app-student-courses-list
          [materias]="materias()"
          [isLoading]="isLoading()"
          [error]="materiasError()"
          [promedioAsistencia]="promedioAsistencia()"
          [totalFallas]="totalFallas()"
          (retry)="cargarMaterias()"
          (openCodeEnrollment)="abrirModalMatriculaGrupo()"
          (openAutoAttendance)="abrirModalAutoAsistencia()"
          (viewDetail)="verDetalleCompleto($event)"
          (viewPrerequisites)="abrirPrerrequisitos($event)"
        />
      }

      <!-- 2. Vista: Detalle de Asignatura y Sesiones -->
      @if (vistaActual() === 'DETALLE' && selectedMateria()) {
        <app-student-course-detail
          [materia]="selectedMateria()"
          [sesiones]="sesiones()"
          [loading]="loadingSesiones()"
          [error]="sesionesError()"
          (retry)="reintentarSesiones()"
          (back)="volverALista()"
          (startClaim)="iniciarReclamo($event)"
          (withdrawClaim)="retirarReclamo($event)"
        />
      }

      <!-- 3. Vista: Radicación de Reclamo / Justificación -->
      @if (vistaActual() === 'RECLAMO' && sesionReclamar() && selectedMateria()) {
        <app-student-claim-form
          [materia]="selectedMateria()"
          [sesion]="sesionReclamar()"
          [archivo]="archivoAdjunto()"
          [subiendo]="subiendoSoporte()"
          [submitting]="enviandoReclamo()"
          [errorSoporte]="errorSoporte()"
          (back)="volverADetalle()"
          (fileSelected)="onFileSelected($event)"
          (removeFile)="removerAdjunto()"
          (submitted)="enviarReclamo($event)"
        />
      }

      <!-- 4. Modal de Prerrequisitos de Asignatura -->
      <app-student-prerequisitos-modal
        [isOpen]="modalPrerrequisitosVisible()"
        [materia]="materiaPrerrequisitos()"
        [prerequisitos]="listaPrerrequisitos()"
        [loading]="loadingPrerrequisitos()"
        (closed)="cerrarModalPrerrequisitos()"
      />

      <!-- 6. Modal: Auto-Registro de Asistencia (HU176 - PIN / QR) -->
      <app-student-auto-asistencia-modal
        [isOpen]="modalAutoAsistenciaVisible()"
        [processing]="procesandoAutoAsistencia()"
        (submitted)="enviarAutoAsistencia($event)"
        (closed)="cerrarModalAutoAsistencia()"
      />

      <!-- 7. Modal: Matrícula a Grupo por Código o PIN -->
      <app-student-matricula-codigo-modal
        [isOpen]="modalMatriculaGrupoVisible()"
        [processing]="procesandoMatriculaGrupo()"
        (submitted)="enviarMatriculaPorCodigo($event)"
        (closed)="cerrarModalMatriculaGrupo()"
      />
    </div>
  `,
})
export class StudentCoursesComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly studentService = inject(StudentManagementService);
  private readonly claimService = inject(AttendanceClaimService);
  private readonly authService = inject(AuthService);
  private readonly coordinatorService = inject(CoordinatorManagementService);
  private readonly courseService = inject(CourseService);
  private readonly sessionService = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly sessionTimeZone = inject(SessionTimeZoneService);

  vistaActual = signal<VistaEstudiante>('LISTA');
  materias = signal<MateriaEstudianteItem[]>([]);
  isLoading = signal<boolean>(true);
  materiasError = signal<LoadErrorState | null>(null);

  // Auto-Registro de Asistencia (HU176)
  modalAutoAsistenciaVisible = signal<boolean>(false);
  procesandoAutoAsistencia = signal<boolean>(false);

  // Matrícula por Código o PIN de Grupo
  modalMatriculaGrupoVisible = signal<boolean>(false);
  procesandoMatriculaGrupo = signal<boolean>(false);

  // Solicitud de Matrícula
  cursosDisponibles = signal<Course[]>([]);

  // Drill-down sesiones
  selectedMateria = signal<MateriaEstudianteItem | null>(null);
  sesiones = signal<SesionMateriaDetalle[]>([]);
  loadingSesiones = signal<boolean>(false);
  sesionesError = signal<LoadErrorState | null>(null);

  // Radicación reclamo
  sesionReclamar = signal<SesionMateriaDetalle | null>(null);
  archivoAdjunto = signal<SoporteAdjuntoItem | null>(null);
  subiendoSoporte = signal<boolean>(false);
  enviandoReclamo = signal<boolean>(false);
  errorSoporte = signal<string | null>(null);
  private subidaEnCurso: Subscription | null = null;
  /** Un reintento tecnico del mismo contenido reutiliza la correlacion; solo un exito la renueva. */
  private readonly intentoRadicacion = new RadicacionIntento();

  // Prerrequisitos de Materia
  modalPrerrequisitosVisible = signal<boolean>(false);
  materiaPrerrequisitos = signal<MateriaEstudianteItem | null>(null);
  listaPrerrequisitos = signal<any[]>([]);
  loadingPrerrequisitos = signal<boolean>(false);

  totalCreditos(): number {
    return this.materias().reduce((sum, m) => sum + (m.creditos ?? 0), 0);
  }

  /** Promedio solo sobre las materias con indicadores autoritativos; `null` = no disponible (nunca 0 ni NaN). */
  promedioAsistencia(): string | null {
    const conIndicadores = this.materias().filter((m) => m.indicadores !== null);
    if (conIndicadores.length === 0) return null;
    const total = conIndicadores.reduce((sum, m) => sum + m.indicadores!.porcentajeAsistencia, 0);
    return (total / conIndicadores.length).toFixed(1);
  }

  /** Suma de inasistencias solo si alguna materia tiene fuente autoritativa; `null` = no disponible. */
  totalFallas(): number | null {
    const conIndicadores = this.materias().filter((m) => m.indicadores !== null);
    if (conIndicadores.length === 0) return null;
    return conIndicadores.reduce((sum, m) => sum + m.indicadores!.inasistencias, 0);
  }

  ngOnInit(): void {
    this.cargarMaterias();

    const paramMatricula = this.route.snapshot.queryParamMap.get('matricularGrupo');
    if (paramMatricula) {
      this.abrirModalMatriculaGrupo();
    }
  }

  cargarMaterias(): void {
    this.isLoading.set(true);
    this.materiasError.set(null);
    this.studentService.getMaterias().subscribe({
      next: (res) => {
        this.materias.set(res.datos || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.materias.set([]);
        this.materiasError.set(classifyLoadError(err));
        this.isLoading.set(false);
      },
    });
  }

  verDetalleCompleto(materia: MateriaEstudianteItem): void {
    this.selectedMateria.set(materia);
    this.vistaActual.set('DETALLE');
    this.cargarSesiones(materia);
  }

  volverALista(): void {
    this.vistaActual.set('LISTA');
    this.selectedMateria.set(null);
    this.sesiones.set([]);
    this.sesionesError.set(null);
  }

  abrirSolicitudMatricula(): void {
    this.courseService.getTeacherCourses().subscribe({
      next: (res) => {
        this.cursosDisponibles.set(res.datos || []);
        this.vistaActual.set('SOLICITAR_MATRICULA');
      },
      error: () => {
        this.toast.error('Error al cargar la oferta de asignaturas.');
      },
    });
  }

  enviarSolicitudMatricula(event: { cursoId: string; motivo: string }): void {
    const curso = this.cursosDisponibles().find((c) => c.id === event.cursoId);
    const currentUser = this.authService.currentUser();
    if (!curso || !event.motivo.trim()) return;

    this.coordinatorService
      .crearSolicitudMatricula({
        estudianteId: currentUser?.id || 'EST-101',
        estudianteNombre: currentUser?.name || 'Estudiante UCO',
        estudianteCodigo: '202210101',
        estudianteCorreo: currentUser?.email || 'estudiante@uco.edu.co',
        cursoId: curso.id,
        cursoCodigo: curso.code ?? '',
        cursoNombre: curso.name,
        grupo: curso.section,
        motivo: event.motivo.trim(),
      })
      .subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.toast.success(res.mensajeUsuario || 'Solicitud radicada ante Coordinación.');
            this.volverALista();
          }
        },
        error: (err) => this.toast.error(getApiErrorMessage(err)),
      });
  }

  iniciarReclamo(sesion: SesionMateriaDetalle): void {
    // Sin ausencia/retardo confirmado, o con una solicitud ya existente, no se abre la radicacion.
    if (!sesion.reclamable || sesion.estadoAsistencia === 'NO_DISPONIBLE') return;
    this.sesionReclamar.set(sesion);
    this.limpiarSoporte();
    this.vistaActual.set('RECLAMO');
  }

  volverADetalle(): void {
    this.vistaActual.set('DETALLE');
    this.sesionReclamar.set(null);
    this.limpiarSoporte();
  }

  ngOnDestroy(): void {
    this.cancelarSubida();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Permite volver a elegir el mismo archivo tras un error o una cancelacion.
    input.value = '';
    if (!file || this.subiendoSoporte()) return;

    const validacion = validateSoporteFile(file);
    if (!validacion.valid) {
      this.errorSoporte.set(validacion.message ?? 'El archivo no es válido.');
      this.toast.error(validacion.message ?? 'El archivo no es válido.');
      return;
    }

    this.errorSoporte.set(null);
    this.subiendoSoporte.set(true);
    this.subidaEnCurso = this.claimService
      .subirSoporte(file)
      .pipe(
        finalize(() => {
          this.subiendoSoporte.set(false);
          this.subidaEnCurso = null;
        })
      )
      .subscribe({
        next: (res) => {
          if (res.exitoso && res.datos?.fileId) {
            this.archivoAdjunto.set({
              fileId: res.datos.fileId,
              nombre: res.datos.nombre,
              tipo: file.type,
              tamanioKb: Math.max(1, Math.round(file.size / 1024)),
              tamanioBytes: res.datos.tamanio,
              // Fecha civil en la zona de presentacion (no el dia UTC); el instante autoritativo (UTC) lo conserva el backend.
              fechaSubida: this.sessionTimeZone.currentDate(),
              urlSimulada: res.datos.url,
            });
            this.toast.success(`Archivo "${file.name}" cargado y analizado correctamente.`);
          } else {
            this.errorSoporte.set('No fue posible almacenar el archivo adjunto.');
          }
        },
        error: (err) => {
          const mensaje = this.mensajeErrorSubida(err);
          this.errorSoporte.set(mensaje);
          this.toast.error(mensaje);
        },
      });
  }

  removerAdjunto(): void {
    this.cancelarSubida();
    this.archivoAdjunto.set(null);
    this.errorSoporte.set(null);
  }

  private limpiarSoporte(): void {
    this.cancelarSubida();
    this.archivoAdjunto.set(null);
    this.errorSoporte.set(null);
    this.enviandoReclamo.set(false);
  }

  private cancelarSubida(): void {
    // Cancela la peticion HTTP en vuelo (HttpClient aborta al desuscribirse).
    this.subidaEnCurso?.unsubscribe();
    this.subidaEnCurso = null;
    this.subiendoSoporte.set(false);
  }

  private mensajeErrorSubida(err: unknown): string {
    const status = (err as { status?: number })?.status;
    if (status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente para adjuntar el soporte.';
    if (status === 403) return 'No tienes permiso para adjuntar soportes.';
    // El frontend decide por codigo/status, no por el texto del backend: 400 cubre malware, formato y contenido invalido.
    if (status === 400 || status === 413) {
      return 'El archivo fue rechazado: no cumple los requisitos de seguridad o formato (PDF, PNG o JPG de hasta 5 MB).';
    }
    if (status === 0) return 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.';
    return 'El servicio de archivos no está disponible. Inténtalo de nuevo en unos minutos.';
  }

  retirarReclamo(sesion: SesionMateriaDetalle): void {
    if (!sesion.reclamoId) return;
    const materia = this.selectedMateria();
    if (!materia) return;

    this.claimService.eliminarReclamo(sesion.reclamoId, materia.id, sesion.id).subscribe({
      next: (res) => {
        if (res.exitoso) {
          this.toast.success(res.mensajeUsuario || 'Solicitud de revisión retirada.');
          this.cargarSesiones(materia);
        }
      },
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  /**
   * Carga las sesiones de la asignatura de la tarjeta y conserva solo las del grupo seleccionado (el backend
   * devuelve las de todos los grupos del estudiante en esa asignatura). Un error HTTP no se presenta como
   * "0 sesiones": se guarda en `sesionesError`.
   */
  cargarSesiones(materia: MateriaEstudianteItem): void {
    this.sesionesError.set(null);
    if (!isUuid(materia.id)) {
      this.sesiones.set([]);
      this.sesionesError.set(loadErrorState('IDENTIFICADOR'));
      return;
    }
    this.loadingSesiones.set(true);
    this.claimService.getSesionesPorMateria(materia.id).subscribe({
      next: (res) => {
        this.sesiones.set((res.datos || []).filter((sesion) => sesion.grupoId === materia.idGrupo));
        this.loadingSesiones.set(false);
      },
      error: (err) => {
        this.sesiones.set([]);
        this.sesionesError.set(
          err instanceof IdentificadorInvalidoError ? loadErrorState('IDENTIFICADOR') : classifyLoadError(err)
        );
        this.loadingSesiones.set(false);
      },
    });
  }

  reintentarSesiones(): void {
    const materia = this.selectedMateria();
    if (materia) this.cargarSesiones(materia);
  }

  enviarReclamo(event: { categoria: CategoriaJustificacion; justificacion: string }): void {
    const sesion = this.sesionReclamar();
    const materia = this.selectedMateria();
    const currentUser = this.authService.currentUser();

    if (!sesion || !materia || !event.justificacion.trim()) return;
    const estadoOriginal = sesion.estadoAsistencia;
    if (!sesion.reclamable || estadoOriginal === 'NO_DISPONIBLE') return;
    // Sin doble envio: ni mientras sube el soporte (aun no hay fileId) ni mientras otra radicacion esta en curso.
    if (this.enviandoReclamo() || this.subiendoSoporte()) return;

    const justificacion = event.justificacion.trim();
    const soporte = this.archivoAdjunto() || undefined;
    const intentoId = this.intentoRadicacion.idPara(
      huellaRadicacion({
        sesionId: sesion.id,
        categoria: event.categoria,
        justificacion,
        soporteId: soporte?.fileId,
      })
    );

    this.enviandoReclamo.set(true);
    this.claimService
      .crearReclamo(
        {
          estudianteId: currentUser?.id || 'estudiante-current',
          estudianteNombre: currentUser?.name || 'Estudiante UCO',
          estudianteCorreo: currentUser?.email || 'estudiante@uco.edu.co',
          materiaId: materia.id,
          materiaCodigo: materia.codigo ?? '',
          materiaNombre: materia.nombre,
          grupo: materia.grupo,
          sesionId: sesion.id,
          sesionNumero: sesion.numeroSesion,
          fechaSesion: sesion.fecha,
          estadoOriginal,
          categoria: event.categoria,
          soporteAdjunto: soporte,
          justificacionSolicitud: justificacion,
        },
        intentoId
      )
      .pipe(finalize(() => this.enviandoReclamo.set(false)))
      .subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.intentoRadicacion.reiniciar();
            this.toast.success(res.mensajeUsuario || 'Reclamo enviado.');
            this.volverADetalle();
            this.cargarSesiones(materia);
          }
        },
        error: (err) => {
          if (this.resultadoIncierto(err)) {
            // El servidor pudo haber persistido la solicitud: se refresca el estado real y el reintento conserva la correlacion.
            this.cargarSesiones(materia);
          }
          if ((err as { status?: number })?.status === 404 && this.archivoAdjunto()) {
            // El soporte ya no esta disponible para radicar (inexistente, ajeno o ya usado): hay que volver a adjuntarlo.
            this.archivoAdjunto.set(null);
            this.errorSoporte.set('El soporte adjunto ya no está disponible. Adjúntalo nuevamente para radicar.');
            this.toast.error('El soporte adjunto ya no está disponible. Adjúntalo nuevamente.');
            return;
          }
          this.toast.error(getApiErrorMessage(err));
        },
      });
  }

  /** Sin respuesta del servidor (red/timeout) o 5xx: no se sabe si la radicacion quedo persistida. */
  private resultadoIncierto(err: unknown): boolean {
    const status = (err as { status?: number })?.status;
    return status === 0 || status === 408 || (typeof status === 'number' && status >= 500);
  }

  abrirPrerrequisitos(materia: MateriaEstudianteItem): void {
    this.materiaPrerrequisitos.set(materia);
    this.modalPrerrequisitosVisible.set(true);
    this.loadingPrerrequisitos.set(true);

    this.studentService.getPrerrequisitosMateria(materia.id).subscribe({
      next: (res) => {
        this.listaPrerrequisitos.set(res.datos || []);
        this.loadingPrerrequisitos.set(false);
      },
      error: () => {
        this.listaPrerrequisitos.set([]);
        this.loadingPrerrequisitos.set(false);
      },
    });
  }

  cerrarModalPrerrequisitos(): void {
    this.modalPrerrequisitosVisible.set(false);
    this.materiaPrerrequisitos.set(null);
    this.listaPrerrequisitos.set([]);
  }

  abrirModalAutoAsistencia(): void {
    this.modalAutoAsistenciaVisible.set(true);
  }

  cerrarModalAutoAsistencia(): void {
    this.modalAutoAsistenciaVisible.set(false);
  }

  enviarAutoAsistencia(event: { pin: string; token: string }): void {
    if (!event.pin && !event.token) {
      this.toast.error('Por favor ingresa el PIN de 6 caracteres o el token QR.');
      return;
    }

    this.procesandoAutoAsistencia.set(true);
    this.sessionService
      .registrarAutoAsistencia({
        codigoAcceso: event.pin || undefined,
        token: event.token || undefined,
      })
      .subscribe({
        next: (res: any) => {
          this.procesandoAutoAsistencia.set(false);
          const yaRegistrado = res?.datos?.yaRegistrado;
          if (yaRegistrado) {
            this.toast.info(
              res?.datos?.mensaje || 'Ya tenías tu asistencia registrada previamente para esta sesión.'
            );
          } else {
            this.toast.success(
              res?.mensajeUsuario || res?.datos?.mensaje || '¡Asistencia registrada con éxito!'
            );
          }
          this.cerrarModalAutoAsistencia();
          this.cargarMaterias();
          const actual = this.selectedMateria();
          if (actual) {
            this.cargarSesiones(actual);
          }
        },
        error: (err) => {
          this.procesandoAutoAsistencia.set(false);
          this.toast.error(getApiErrorMessage(err));
        },
      });
  }

  abrirModalMatriculaGrupo(): void {
    this.modalMatriculaGrupoVisible.set(true);
  }

  cerrarModalMatriculaGrupo(): void {
    this.modalMatriculaGrupoVisible.set(false);
  }

  enviarMatriculaPorCodigo(pin: string): void {
    if (!pin) {
      this.toast.error('Por favor ingresa el código o PIN del grupo.');
      return;
    }

    this.procesandoMatriculaGrupo.set(true);
    this.studentService.matricularGrupo(pin).subscribe({
      next: (res) => {
        this.procesandoMatriculaGrupo.set(false);
        this.toast.success(res?.mensajeUsuario || '¡Matrícula confirmada exitosamente en el grupo!');
        this.cerrarModalMatriculaGrupo();
        this.cargarMaterias();
      },
      error: (err) => {
        this.procesandoMatriculaGrupo.set(false);
        this.toast.error(getApiErrorMessage(err));
      },
    });
  }
}
