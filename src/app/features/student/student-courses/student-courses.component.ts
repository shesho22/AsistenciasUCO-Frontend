import { Component, OnDestroy, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Subscription, finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentManagementService } from '../../../core/services/student-management.service';
import { MatriculaQrService } from '../../../core/services/matricula-qr.service';
import { AttendanceClaimService, IdentificadorInvalidoError } from '../../../core/services/attendance-claim.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { CategoriaJustificacionItem } from '../../../core/models/consultas-transversales.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorCode, getApiErrorMessage, getApiSuccessMessage } from '../../../core/api/errors/api-error.util';
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

// Subcomponentes Desacoplados
import { StudentCoursesListComponent } from './components/student-courses-list.component';
import { StudentCourseDetailComponent } from './components/student-course-detail.component';
import { StudentClaimFormComponent } from './components/student-claim-form.component';
import { StudentMatriculaCodigoModalComponent } from './components/modals/student-matricula-codigo-modal.component';

type VistaEstudiante = 'LISTA' | 'DETALLE' | 'RECLAMO';

@Component({
  selector: 'app-student-courses',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    StudentCoursesListComponent,
    StudentCourseDetailComponent,
    StudentClaimFormComponent,
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
          [materiasEnRiesgo]="materiasEnRiesgo()"
          [totalHorasFalta]="totalHorasFalta()"
          (retry)="cargarMaterias()"
          (openCodeEnrollment)="abrirModalMatriculaGrupo()"
          (registrarConPin)="irARegistroConPin()"
          (viewDetail)="verDetalleCompleto($event)"
        />
      }

      <!-- 2. Vista: Detalle de Asignatura y Sesiones -->
      @if (vistaActual() === 'DETALLE' && selectedMateria()) {
        <app-student-course-detail
          [materia]="selectedMateria()"
          [sesiones]="sesiones()"
          [categorias]="categoriasJustificacion()"
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
          [categorias]="categoriasJustificacion()"
          [archivo]="archivoAdjunto()"
          [subiendo]="subiendoSoporte()"
          [submitting]="enviandoReclamo()"
          [errorSoporte]="errorSoporte()"
          [errorEnvio]="errorEnvio()"
          (back)="volverADetalle()"
          (fileSelected)="onFileSelected($event)"
          (removeFile)="removerAdjunto()"
          (submitted)="enviarReclamo($event)"
        />
      }

      <!-- 7. Modal: Matrícula a Grupo por Código o PIN -->
      <app-student-matricula-codigo-modal
        [isOpen]="modalMatriculaGrupoVisible()"
        [processing]="procesandoMatriculaGrupo()"
        [tokenInicial]="tokenPrecargado()"
        [codigoInicial]="pinPrecargado()"
        (submitted)="enviarMatriculaPorCodigo($event)"
        (closed)="cerrarModalMatriculaGrupo()"
      />
    </div>
  `,
})
export class StudentCoursesComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly studentService = inject(StudentManagementService);
  private readonly matriculaQrService = inject(MatriculaQrService);
  private readonly claimService = inject(AttendanceClaimService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly consultasService = inject(ConsultasTransversalesService);
  private readonly toast = inject(ToastService);
  private readonly sessionTimeZone = inject(SessionTimeZoneService);

  vistaActual = signal<VistaEstudiante>('LISTA');
  materias = signal<MateriaEstudianteItem[]>([]);
  isLoading = signal<boolean>(true);
  materiasError = signal<LoadErrorState | null>(null);

  // Auto-Registro de Asistencia (HU176)

  // Matrícula por Código o PIN de Grupo
  modalMatriculaGrupoVisible = signal<boolean>(false);
  procesandoMatriculaGrupo = signal<boolean>(false);
  /** PIN que trae el login (`?matricula=<PIN>`); el modal lo muestra precargado. */
  pinPrecargado = signal<string>('');
  /** Token QR que trae el login (`?t=<TOKEN>`); F-EST-012. */
  tokenPrecargado = signal<string>('');

  // Drill-down sesiones
  selectedMateria = signal<MateriaEstudianteItem | null>(null);
  sesiones = signal<SesionMateriaDetalle[]>([]);
  loadingSesiones = signal<boolean>(false);
  sesionesError = signal<LoadErrorState | null>(null);

  // Radicación reclamo
  sesionReclamar = signal<SesionMateriaDetalle | null>(null);
  /** HU005/HU016: motivos de justificación del catálogo de solo consulta. */
  categoriasJustificacion = signal<CategoriaJustificacionItem[]>([]);
  archivoAdjunto = signal<SoporteAdjuntoItem | null>(null);
  subiendoSoporte = signal<boolean>(false);
  enviandoReclamo = signal<boolean>(false);
  errorSoporte = signal<string | null>(null);
  /** CULM-001 D.1: rechazo de la radicacion por plazo vencido, mostrado junto al boton. */
  errorEnvio = signal<string | null>(null);
  private subidaEnCurso: Subscription | null = null;
  /** Un reintento tecnico del mismo contenido reutiliza la correlacion; solo un exito la renueva. */
  private readonly intentoRadicacion = new RadicacionIntento();

  totalCreditos(): number {
    return this.materias().reduce((sum, m) => sum + (m.creditos ?? 0), 0);
  }

  /** Cuenta de materias con `codigoPermanencia` RIESGO o PERDIDA (valor del backend); `null` = sin indicadores. */
  materiasEnRiesgo(): number | null {
    const conIndicadores = this.materias().filter((m) => m.indicadores !== null);
    if (conIndicadores.length === 0) return null;
    return conIndicadores.filter((m) => m.indicadores!.codigoPermanencia === 'RIESGO' || m.indicadores!.codigoPermanencia === 'PERDIDA').length;
  }

  /** Suma de `horasFalta` entregadas por el backend; `null` = no disponible (nunca 0 ni NaN). */
  totalHorasFalta(): number | null {
    const conIndicadores = this.materias().filter((m) => m.indicadores !== null);
    if (conIndicadores.length === 0) return null;
    return conIndicadores.reduce((sum, m) => sum + m.indicadores!.horasFalta, 0);
  }

  /** HU176: el registro por PIN vive en su propia pantalla (`/app/asistencia/pin`). */
  irARegistroConPin(): void {
    void this.router.navigate(['/app/asistencia/pin']);
  }

  ngOnInit(): void {
    this.cargarMaterias();
    this.cargarCategoriasJustificacion();

    // HU176B & F-EST-012: el login devuelve aqui con `?matricula=<PIN>` o `?t=<TOKEN>`
    const paramToken = this.route.snapshot.queryParamMap.get('t');
    if (paramToken) {
      this.tokenPrecargado.set(paramToken);
      this.abrirModalMatriculaGrupo();
    }
    const paramMatricula = this.route.snapshot.queryParamMap.get('matricula');
    if (paramMatricula) {
      if (/^[0-9]{6}$/.test(paramMatricula)) {
        this.pinPrecargado.set(paramMatricula);
      }
      this.abrirModalMatriculaGrupo();
    }
  }

  /** Sin catálogo el formulario no deja radicar y lo informa; no se usa una lista fija de respaldo. */
  cargarCategoriasJustificacion(): void {
    this.consultasService.getCategoriasJustificacion().subscribe({
      next: (res) => this.categoriasJustificacion.set(res.datos ?? []),
      error: () => this.categoriasJustificacion.set([]),
    });
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

  iniciarReclamo(sesion: SesionMateriaDetalle): void {
    // Sin ausencia/retardo confirmado, o con una solicitud ya existente, no se abre la radicacion.
    if (!sesion.reclamable || sesion.estadoAsistencia === 'NO_DISPONIBLE') return;
    this.errorEnvio.set(null);
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
            this.toast.success(getApiSuccessMessage(res, `Archivo "${file.name}" cargado y analizado correctamente.`));
          } else {
            this.errorSoporte.set('No fue posible almacenar el archivo adjunto.');
          }
        },
        error: (err) => {
          const mensaje = getApiErrorMessage(err);
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

  retirarReclamo(sesion: SesionMateriaDetalle): void {
    if (!sesion.reclamoId) return;
    const materia = this.selectedMateria();
    if (!materia) return;

    this.claimService.eliminarReclamo(sesion.reclamoId).subscribe({
      next: (res) => {
        if (res.exitoso) {
          this.toast.success(getApiSuccessMessage(res, 'Solicitud retirada.'));
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
    if (!sesion.reclamable || estadoOriginal === 'NO_DISPONIBLE' || estadoOriginal === 'PARCIAL') return;
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
    this.errorEnvio.set(null);
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
            this.toast.success(getApiSuccessMessage(res, 'Reclamo enviado.'));
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
          if (getApiErrorCode(err) === 'ERR_PLAZO_JUSTIFICACION_VENCIDO') {
            // El backend entrega el texto institucional (con la fecha limite): se muestra junto al boton, que sigue activo.
            this.errorEnvio.set(getApiErrorMessage(err));
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

  abrirModalMatriculaGrupo(): void {
    this.modalMatriculaGrupoVisible.set(true);
  }

  cerrarModalMatriculaGrupo(): void {
    this.modalMatriculaGrupoVisible.set(false);
  }

  enviarMatriculaPorCodigo(dato: string | { token?: string; pin?: string }): void {
    let credencial: { token?: string; pin?: string };
    if (typeof dato === 'object' && dato !== null) {
      credencial = dato;
    } else {
      const pin = String(dato || '').trim();
      if (!/^[0-9]{6}$/.test(pin)) {
        this.toast.error('Ingresa el PIN de 6 dígitos que proyecta tu docente.');
        return;
      }
      credencial = { pin };
    }

    this.procesandoMatriculaGrupo.set(true);
    this.matriculaQrService.matricularAutenticado(credencial).subscribe({
      next: (resultado) => {
        this.procesandoMatriculaGrupo.set(false);
        this.toast.success(getApiSuccessMessage(resultado, '¡Matrícula confirmada exitosamente en el grupo!'));
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
