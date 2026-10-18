import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { StudentManagementService } from '../../../core/services/student-management.service';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { AuthService } from '../../../core/services/auth.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { CourseService } from '../../../core/services/course.service';
import { SessionService } from '../../../core/services/session.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
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
          [promedioAsistencia]="promedioAsistencia()"
          [totalFallas]="totalFallas()"
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
export class StudentCoursesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private studentService = inject(StudentManagementService);
  private claimService = inject(AttendanceClaimService);
  private authService = inject(AuthService);
  private coordinatorService = inject(CoordinatorManagementService);
  private courseService = inject(CourseService);
  private sessionService = inject(SessionService);
  private toast = inject(ToastService);

  vistaActual = signal<VistaEstudiante>('LISTA');
  materias = signal<MateriaEstudianteItem[]>([]);
  isLoading = signal<boolean>(true);

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

  // Radicación reclamo
  sesionReclamar = signal<SesionMateriaDetalle | null>(null);
  archivoAdjunto = signal<SoporteAdjuntoItem | null>(null);

  // Prerrequisitos de Materia
  modalPrerrequisitosVisible = signal<boolean>(false);
  materiaPrerrequisitos = signal<MateriaEstudianteItem | null>(null);
  listaPrerrequisitos = signal<any[]>([]);
  loadingPrerrequisitos = signal<boolean>(false);

  totalCreditos(): number {
    return this.materias().reduce((sum, m) => sum + (Number(m.creditos) || 0), 0);
  }

  promedioAsistencia(): string {
    if (this.materias().length === 0) return '0.0';
    const total = this.materias().reduce((sum, m) => sum + m.porcentajeAsistencia, 0);
    return (total / this.materias().length).toFixed(1);
  }

  totalFallas(): number {
    return this.materias().reduce((sum, m) => sum + m.inasistencias, 0);
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
    this.studentService.getMaterias().subscribe({
      next: (res) => {
        this.materias.set(res.datos || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Error al cargar asignaturas matriculadas.');
      },
    });
  }

  verDetalleCompleto(materia: MateriaEstudianteItem): void {
    this.selectedMateria.set(materia);
    this.vistaActual.set('DETALLE');
    this.cargarSesiones(materia.id);
  }

  volverALista(): void {
    this.vistaActual.set('LISTA');
    this.selectedMateria.set(null);
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
        cursoCodigo: curso.code,
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
    this.sesionReclamar.set(sesion);
    this.archivoAdjunto.set(null);
    this.vistaActual.set('RECLAMO');
  }

  volverADetalle(): void {
    this.vistaActual.set('DETALLE');
    this.sesionReclamar.set(null);
    this.archivoAdjunto.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.claimService.subirSoporte(file).subscribe({
        next: (res) => {
          if (res.exitoso && res.datos) {
            this.archivoAdjunto.set({
              fileId: res.datos.fileId,
              nombre: res.datos.nombre,
              tipo: file.type || 'application/pdf',
              tamanioKb: Math.max(1, Math.round(file.size / 1024)),
              fechaSubida: new Date().toISOString().split('T')[0],
              urlSimulada: res.datos.url,
            });
            this.toast.success(`Archivo "${file.name}" cargado y almacenado correctamente.`);
          } else {
            this.toast.error('No fue posible almacenar el archivo adjunto.');
          }
        },
        error: () => {
          this.toast.error('Error al subir el archivo adjunto al servidor.');
        },
      });
    }
  }

  removerAdjunto(): void {
    this.archivoAdjunto.set(null);
  }

  retirarReclamo(sesion: SesionMateriaDetalle): void {
    if (!sesion.reclamoId) return;
    const materia = this.selectedMateria();
    if (!materia) return;

    this.claimService.eliminarReclamo(sesion.reclamoId, materia.id, sesion.id).subscribe({
      next: (res) => {
        if (res.exitoso) {
          this.toast.success(res.mensajeUsuario || 'Solicitud de revisión retirada.');
          this.cargarSesiones(materia.id);
        }
      },
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  cargarSesiones(materiaId: string): void {
    this.loadingSesiones.set(true);
    this.claimService.getSesionesPorMateria(materiaId).subscribe({
      next: (res) => {
        this.sesiones.set(res.datos || []);
        this.loadingSesiones.set(false);
      },
      error: () => {
        this.loadingSesiones.set(false);
        this.toast.error('Error al cargar sesiones de la materia.');
      },
    });
  }

  enviarReclamo(event: { categoria: CategoriaJustificacion; justificacion: string }): void {
    const sesion = this.sesionReclamar();
    const materia = this.selectedMateria();
    const currentUser = this.authService.currentUser();

    if (!sesion || !materia || !event.justificacion.trim()) return;

    this.claimService
      .crearReclamo({
        estudianteId: currentUser?.id || 'estudiante-current',
        estudianteNombre: currentUser?.name || 'Estudiante UCO',
        estudianteCorreo: currentUser?.email || 'estudiante@uco.edu.co',
        materiaId: materia.id,
        materiaCodigo: materia.codigo,
        materiaNombre: materia.nombre,
        grupo: materia.grupo,
        sesionId: sesion.id,
        sesionNumero: sesion.numeroSesion,
        fechaSesion: sesion.fecha,
        estadoOriginal: sesion.estadoAsistencia,
        categoria: event.categoria,
        soporteAdjunto: this.archivoAdjunto() || undefined,
        justificacionSolicitud: event.justificacion.trim(),
      })
      .subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.toast.success(res.mensajeUsuario || 'Reclamo enviado.');
            this.volverADetalle();
            this.cargarSesiones(materia.id);
          }
        },
        error: (err) => this.toast.error(getApiErrorMessage(err)),
      });
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
            this.cargarSesiones(actual.id);
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
