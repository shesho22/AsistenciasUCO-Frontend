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
  ConfiguracionReclamosDTO,
  EstadoAsistenciaSesion,
  MateriaEstudianteItem,
  SesionMateriaDetalle,
  CategoriaJustificacion,
  SoporteAdjuntoItem,
  TomaSesionEstudiante,
} from '../../../core/models/role-management.model';

// Subcomponentes Desacoplados
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { onRealtimeReconnect } from '../../../core/realtime/realtime-reconnect-trigger';
import {
  REALTIME_EVENT_TYPE,
  RealtimeEvent,
  SesionCanceladaRealtimePayload,
  SesionManualCreadaRealtimePayload,
} from '../../../core/realtime/model/realtime-event.model';
import { mensajeSesionManualCreada } from '../../../core/models/sesion-manual.util';
import { StudentCoursesListComponent } from './components/student-courses-list.component';
import { StudentCourseDetailComponent } from './components/student-course-detail.component';
import { StudentClaimFormComponent } from './components/student-claim-form.component';
import { StudentMatriculaCodigoModalComponent } from './components/modals/student-matricula-codigo-modal.component';

type VistaEstudiante = 'LISTA' | 'DETALLE' | 'RECLAMO';

@Component({
    selector: 'app-student-courses',
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
          (startClaimToma)="iniciarReclamoToma($event)"
          (withdrawClaim)="retirarReclamo($event)"
        />
      }

      <!-- 3. Vista: Radicación de Reclamo / Justificación -->
      @if (vistaActual() === 'RECLAMO' && sesionReclamar() && selectedMateria()) {
        <app-student-claim-form
          [materia]="selectedMateria()"
          [sesion]="sesionReclamar()"
          [toma]="tomaReclamar()"
          [categorias]="categoriasJustificacion()"
          [configuracion]="configuracionReclamos()"
          [archivo]="archivoAdjunto()"
          [archivos]="archivosAdjuntos()"
          [subiendo]="subiendoSoporte()"
          [submitting]="enviandoReclamo()"
          [errorSoporte]="errorSoporte()"
          [errorEnvio]="errorEnvio()"
          (back)="volverADetalle()"
          (fileSelected)="onFileSelected($event)"
          (adjuntar)="adjuntarArchivo($event)"
          (removeFile)="removerAdjunto()"
          (quitar)="removerAdjunto($event)"
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
  `
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
  private readonly realtime = inject(RealtimeService, { optional: true });
  private realtimeSub: Subscription | null = null;

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

  /** Materia (y grupo) que pide abrir el enlace de "Mis Alertas"; se consume al cargar las materias. */
  private enlaceMateria: { materia: string; grupo: string | null } | null = null;

  // Drill-down sesiones
  selectedMateria = signal<MateriaEstudianteItem | null>(null);
  sesiones = signal<SesionMateriaDetalle[]>([]);
  loadingSesiones = signal<boolean>(false);
  sesionesError = signal<LoadErrorState | null>(null);

  // Radicación reclamo
  sesionReclamar = signal<SesionMateriaDetalle | null>(null);
  /** Toma que se reclama; `null` si el reclamo es de la sesión completa (sesión sin tomas). */
  tomaReclamar = signal<TomaSesionEstudiante | null>(null);
  /** HU005/HU016: motivos de justificación del catálogo de solo consulta. */
  categoriasJustificacion = signal<CategoriaJustificacionItem[]>([]);
  /** CULM-001 D.2: Configuración del backend para límites y tipos permitidos de reclamos. */
  configuracionReclamos = signal<ConfiguracionReclamosDTO | null>(null);
  /** CULM-001 D.2: Múltiples soportes con seguimiento individual de estado. */
  archivosAdjuntos = signal<SoporteAdjuntoItem[]>([]);
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
    this.cargarConfiguracionReclamos();

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
    // CERT-CULM001: "Mis Alertas" enlaza aquí con `?materia=<idAsignatura>&grupo=<idGrupo>` para abrir ese detalle.
    const paramMateria = this.route.snapshot.queryParamMap.get('materia');
    if (paramMateria && isUuid(paramMateria)) {
      const paramGrupo = this.route.snapshot.queryParamMap.get('grupo');
      this.enlaceMateria = { materia: paramMateria, grupo: paramGrupo && isUuid(paramGrupo) ? paramGrupo : null };
    }
  }

  /**
   * Abre el detalle de la materia pedida por el enlace, una sola vez y cuando ya llegaron las materias. Solo busca entre
   * las materias del propio estudiante: un identificador ajeno o desconocido deja la lista como está.
   */
  private abrirMateriaDelEnlace(): void {
    const enlace = this.enlaceMateria;
    this.enlaceMateria = null;
    if (!enlace) return;
    const candidatas = this.materias().filter((materia) => materia.id === enlace.materia);
    const materia = candidatas.find((candidata) => candidata.idGrupo === enlace.grupo) ?? candidatas[0];
    if (materia) this.verDetalleCompleto(materia);
  }

  cargarConfiguracionReclamos(): void {
    this.claimService.getConfiguracionReclamos().subscribe({
      next: (res) => {
        if (res.exitoso && res.datos) {
          this.configuracionReclamos.set(res.datos);
        }
      },
      error: () => {},
    });
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
        this.abrirMateriaDelEnlace();
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
    this.iniciarRealtime(materia);
  }

  /**
   * DEC-064: el canal SSE del grupo avisa de una sesión creada manualmente o cancelada y recarga el detalle. Sin
   * polling: la lista se recarga por evento o al recuperarse la conexión.
   */
  private iniciarRealtime(materia: MateriaEstudianteItem): void {
    this.detenerRealtime();
    if (!this.realtime || !materia.idGrupo) return;
    const grupoId = materia.idGrupo;
    this.realtime.startForGroup(grupoId);

    const sub = new Subscription();
    sub.add(onRealtimeReconnect(this.realtime.connectionState$).subscribe(() => this.cargarSesiones(materia)));
    sub.add(
      this.realtime.events().subscribe((evt: RealtimeEvent) => {
        if (evt.type === REALTIME_EVENT_TYPE.SESION_MANUAL_CREADA) {
          const payload = evt.payload as SesionManualCreadaRealtimePayload;
          if (payload?.grupo !== grupoId) return;
          this.toast.info(mensajeSesionManualCreada(payload, this.sessionTimeZone.formatTemporal(payload.fechaHoraInicio)));
          this.cargarSesiones(materia);
        } else if (evt.type === REALTIME_EVENT_TYPE.SESION_CANCELADA) {
          const payload = evt.payload as SesionCanceladaRealtimePayload;
          if (payload?.grupo === grupoId) this.cargarSesiones(materia);
        }
      })
    );
    this.realtimeSub = sub;
  }

  private detenerRealtime(): void {
    if (!this.realtimeSub) return;
    this.realtimeSub.unsubscribe();
    this.realtimeSub = null;
    this.realtime?.stop();
  }

  volverALista(): void {
    this.vistaActual.set('LISTA');
    this.detenerRealtime();
    this.selectedMateria.set(null);
    this.sesiones.set([]);
    this.sesionesError.set(null);
  }

  iniciarReclamo(sesion: SesionMateriaDetalle): void {
    // Sin ausencia/retardo confirmado, o con una solicitud ya existente, no se abre la radicacion.
    if (!sesion.reclamable || sesion.estadoAsistencia === 'NO_DISPONIBLE') return;
    this.errorEnvio.set(null);
    this.sesionReclamar.set(sesion);
    this.tomaReclamar.set(null);
    this.limpiarSoporte();
    this.vistaActual.set('RECLAMO');
  }

  /** Reclamo de una toma: solo si el backend la marcó reclamable. */
  iniciarReclamoToma(evento: { sesion: SesionMateriaDetalle; toma: TomaSesionEstudiante }): void {
    if (!evento.toma.reclamable) return;
    this.errorEnvio.set(null);
    this.sesionReclamar.set(evento.sesion);
    this.tomaReclamar.set(evento.toma);
    this.limpiarSoporte();
    this.vistaActual.set('RECLAMO');
  }

  volverADetalle(): void {
    this.vistaActual.set('DETALLE');
    this.sesionReclamar.set(null);
    this.tomaReclamar.set(null);
    this.limpiarSoporte();
  }

  ngOnDestroy(): void {
    this.cancelarSubida();
    this.detenerRealtime();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Permite volver a elegir el mismo archivo tras un error o una cancelacion.
    input.value = '';
    if (!file || this.subiendoSoporte()) return;

    this.adjuntarArchivo(file);
  }

  adjuntarArchivo(file: File): void {
    if (this.subiendoSoporte()) return;

    const maximo = this.configuracionReclamos()?.maximoSoportes ?? 3;
    if (this.archivosAdjuntos().length >= maximo) {
      const msg = `No puedes adjuntar más de ${maximo} archivos.`;
      this.errorSoporte.set(msg);
      this.toast.error(msg);
      return;
    }

    // PAR-05: el tope sale del parametro ARCHIVO/TAMANIO_MAXIMO_BYTES (GET /configuracion/reclamos); 5 MB solo es respaldo.
    const validacion = validateSoporteFile(file, this.configuracionReclamos()?.tamanioMaximoBytes);
    if (!validacion.valid) {
      this.errorSoporte.set(validacion.message ?? 'El archivo no es válido.');
      this.toast.error(validacion.message ?? 'El archivo no es válido.');
      return;
    }

    this.errorSoporte.set(null);
    const nuevoAdjunto: SoporteAdjuntoItem = {
      nombre: file.name,
      tipo: file.type,
      tamanioKb: Math.max(1, Math.round(file.size / 1024)),
      tamanioBytes: file.size,
      fechaSubida: this.sessionTimeZone.currentDate(),
      estado: 'SUBIENDO',
    };

    this.archivosAdjuntos.update((actuales) => [...actuales, nuevoAdjunto]);
    this.subiendoSoporte.set(true);

    this.subidaEnCurso = this.claimService
      .subirSoporte(file)
      .pipe(
        finalize(() => {
          this.subidaEnCurso = null;
          this.actualizarEstadoSubiendo();
        })
      )
      .subscribe({
        next: (res) => {
          if (res.exitoso && res.datos?.fileId) {
            this.archivosAdjuntos.update((actuales) =>
              actuales.map((item) =>
                item === nuevoAdjunto || (item.nombre === file.name && item.estado === 'SUBIENDO')
                  ? {
                      ...item,
                      fileId: res.datos.fileId,
                      tamanioBytes: res.datos.tamanio,
                      urlSimulada: res.datos.url,
                      estado: 'LISTO',
                    }
                  : item
              )
            );
            const primerListo = this.archivosAdjuntos().find((a) => a.estado === 'LISTO');
            this.archivoAdjunto.set(primerListo ?? null);
            this.toast.success(getApiSuccessMessage(res, `Archivo "${file.name}" cargado y analizado correctamente.`));
          } else {
            this.archivosAdjuntos.update((actuales) =>
              actuales.map((item) =>
                item === nuevoAdjunto || (item.nombre === file.name && item.estado === 'SUBIENDO')
                  ? { ...item, estado: 'RECHAZADO', error: 'No fue posible almacenar el archivo adjunto.' }
                  : item
              )
            );
          }
        },
        error: (err) => {
          const mensaje = getApiErrorMessage(err);
          this.errorSoporte.set(mensaje);
          this.archivosAdjuntos.update((actuales) =>
            actuales.map((item) =>
              item === nuevoAdjunto || (item.nombre === file.name && item.estado === 'SUBIENDO')
                ? { ...item, estado: 'RECHAZADO', error: mensaje }
                : item
            )
          );
          this.toast.error(mensaje);
        },
      });
  }

  private actualizarEstadoSubiendo(): void {
    const quedanSubiendo = this.archivosAdjuntos().some((a) => a.estado === 'SUBIENDO');
    this.subiendoSoporte.set(quedanSubiendo);
  }

  removerAdjunto(index?: number): void {
    if (index !== undefined && index >= 0) {
      this.archivosAdjuntos.update((actuales) => actuales.filter((_, i) => i !== index));
      const primerListo = this.archivosAdjuntos().find((a) => a.estado === 'LISTO');
      this.archivoAdjunto.set(primerListo ?? null);
      if (this.archivosAdjuntos().length === 0) {
        this.limpiarSoporte();
      }
      this.actualizarEstadoSubiendo();
      return;
    }
    this.cancelarSubida();
    this.archivoAdjunto.set(null);
    this.archivosAdjuntos.set([]);
    this.errorSoporte.set(null);
  }

  private limpiarSoporte(): void {
    this.cancelarSubida();
    this.archivoAdjunto.set(null);
    this.archivosAdjuntos.set([]);
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
    const estadoSesion = sesion.estadoAsistencia;
    const toma = this.tomaReclamar();
    if (!sesion.reclamable || estadoSesion === 'NO_DISPONIBLE' || (toma && !toma.reclamable)) return;
    // Una sesion PARCIAL se reclama por su toma ausente (`tomaId`); el estado de la sesion no viaja al backend, que decide
    // con sus propios registros. Para un reclamo por toma el estado original es el de la toma.
    const estadoOriginal: EstadoAsistenciaSesion | undefined = toma
      ? toma.estado === 'AUSENTE' ? 'AUSENTE' : undefined
      : estadoSesion === 'PARCIAL' ? undefined : estadoSesion;
    // Sin doble envio: ni mientras sube el soporte (aun no hay fileId) ni mientras otra radicacion esta en curso.
    if (this.enviandoReclamo() || this.subiendoSoporte()) return;

    const justificacion = event.justificacion.trim();
    const soportesListos = this.archivosAdjuntos().filter((a) => (!a.estado || a.estado === 'LISTO') && !!a.fileId);
    const soporteArchivoIds = soportesListos.map((s) => s.fileId!);
    const soporte = soportesListos[0] || this.archivoAdjunto() || undefined;
    if (soporte?.fileId && !soporteArchivoIds.includes(soporte.fileId)) {
      soporteArchivoIds.push(soporte.fileId);
    }
    const intentoId = this.intentoRadicacion.idPara(
      huellaRadicacion({
        sesionId: sesion.id,
        categoria: event.categoria,
        justificacion,
        soporteId: soporte?.fileId,
        tomaId: toma?.idToma,
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
          idToma: toma?.idToma ?? null,
          numeroToma: toma?.numero ?? null,
          categoria: event.categoria,
          soporteAdjunto: soporte,
          soporteArchivoIds: soporteArchivoIds.length > 0 ? soporteArchivoIds : undefined,
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
          const codigo = getApiErrorCode(err);
          if (codigo === 'ERR_TOMA_NO_RECLAMABLE' || codigo === 'ERR_RECLAMO_TOMA_DUPLICADO') {
            // La toma cambió o ya tiene reclamo: se muestra el mensaje del backend y se refresca el estado real.
            this.errorEnvio.set(getApiErrorMessage(err));
            this.cargarSesiones(materia);
            return;
          }
          if (codigo === 'ERR_PLAZO_JUSTIFICACION_VENCIDO') {
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
