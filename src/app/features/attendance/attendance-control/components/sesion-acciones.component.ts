import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ClassSession } from '../../../../core/models/attendance.model';
import { Course } from '../../../../core/models/course.model';
import { CancelacionSesion } from '../../../../core/models/sesion-estado.model';
import { AttendanceMapper } from '../../../../core/mappers/attendance.mapper';
import { SessionService } from '../../../../core/services/session.service';
import { StudentService } from '../../../../core/services/student.service';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { mensajeUi } from '../../../../core/messages/mensajes-ui';
import { environment } from '../../../../../environments/environment';
import { TeacherSesionCancelarModalComponent } from '../../../teacher/teacher-grupos/components/modals/teacher-sesion-cancelar-modal.component';
import { TeacherSesionDetalleModalComponent } from '../../../teacher/teacher-grupos/components/modals/teacher-sesion-detalle-modal.component';
import { AttendanceNewSessionModalComponent, NuevaSesionSolicitud } from './attendance-new-session-modal.component';
import type { NotificacionToma } from './toma-asistencias.component';

/** Cancelación confirmada por el backend para una sesión del grupo. */
export interface SesionCanceladaEvento {
  sesionId: string;
  cancelacion: CancelacionSesion;
}

/**
 * Acciones de UNA sesión del historial (antes en el cronograma del grupo del docente): ver detalles, ajustar horario y
 * cancelar con motivo (HU047). Agrupa los modales y las llamadas; el padre abre cada acción y aplica el resultado a su lista.
 */
@Component({
  selector: 'app-sesion-acciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AttendanceNewSessionModalComponent, TeacherSesionCancelarModalComponent, TeacherSesionDetalleModalComponent],
  template: `
    <app-attendance-new-session-modal
      [isOpen]="sesionAjuste() !== null"
      [course]="course()"
      [sesion]="sesionAjuste()"
      [isCreating]="guardandoAjuste()"
      (submitted)="guardarAjuste($event)"
      (closed)="cerrarAjuste()"
    />

    <app-teacher-sesion-cancelar-modal
      [isOpen]="sesionACancelar() !== null"
      [sesion]="sesionACancelar()"
      [errorMensaje]="errorCancelar()"
      [enviando]="enviandoCancelacion()"
      (cancelar)="confirmarCancelacion($event)"
      (closed)="cerrarCancelar()"
    />

    <app-teacher-sesion-detalle-modal
      [isOpen]="sesionDetalle() !== null"
      [sesion]="sesionDetalle()"
      (closed)="cerrarDetalle()"
    />
  `,
})
export class SesionAccionesComponent {
  private readonly sessionService = inject(SessionService);
  private readonly studentService = inject(StudentService);
  private readonly attendanceService = inject(AttendanceService);

  /** HU047 (B.1): la cancelación con motivo solo se ofrece con la bandera activa. */
  readonly cancelacionHabilitada = environment.features.sessionCancelEnabled;

  course = input<Course | null | undefined>(null);
  sessions = input<ClassSession[]>([]);

  /** El horario de una sesión cambió: el padre recarga la lista por HTTP (el PATCH no devuelve la sesión). */
  readonly sesionActualizada = output<void>();
  /** El backend confirmó la cancelación: el padre marca la sesión sin recargar. */
  readonly sesionCancelada = output<SesionCanceladaEvento>();
  readonly notificacion = output<NotificacionToma>();

  readonly sesionDetalle = signal<ClassSession | null>(null);
  readonly sesionAjuste = signal<ClassSession | null>(null);
  readonly guardandoAjuste = signal(false);
  readonly sesionACancelar = signal<ClassSession | null>(null);
  /** Mensaje del backend (SES_011/012/013/016) mostrado dentro del modal; el modal sigue abierto. */
  readonly errorCancelar = signal<string | null>(null);
  readonly enviandoCancelacion = signal(false);

  /**
   * Detalle de UNA sesión: la lista de estudiantes y su marca se piden solo para esa sesión (acotada al cupo).
   * Sin registro del backend la marca queda en null: nunca se inventa.
   */
  abrirDetalle(sesion: ClassSession): void {
    this.sesionDetalle.set({ ...sesion, records: [] });
    forkJoin({
      estudiantes: this.studentService.getStudentsByGroup(sesion.courseId),
      asistencias: this.attendanceService.getAttendancesByGroup(sesion.courseId, sesion.id),
    }).subscribe({
      next: ({ estudiantes, asistencias }) => {
        if (this.sesionDetalle()?.id !== sesion.id) return;
        const activos = (estudiantes?.datos ?? []).filter((e) => e.codigoEstado === 'A');
        this.sesionDetalle.set({
          ...sesion,
          records: AttendanceMapper.fromGroupStudentsAndAttendances(activos, asistencias?.datos ?? []),
        });
      },
      error: (err: unknown) => this.avisar('error', getApiErrorMessage(err)),
    });
  }

  cerrarDetalle(): void {
    this.sesionDetalle.set(null);
  }

  abrirAjuste(sesion: ClassSession): void {
    this.guardandoAjuste.set(false);
    this.sesionAjuste.set(sesion);
  }

  cerrarAjuste(): void {
    this.sesionAjuste.set(null);
    this.guardandoAjuste.set(false);
  }

  guardarAjuste(cambios: NuevaSesionSolicitud): void {
    const sesion = this.sesionAjuste();
    const grupoId = this.course()?.id ?? sesion?.courseId;
    if (!sesion || !grupoId || this.guardandoAjuste()) return;
    this.guardandoAjuste.set(true);
    this.sessionService
      .updateSession(grupoId, sesion.id, {
        title: cambios.title,
        date: cambios.date,
        startTime: cambios.startTime,
        endTime: cambios.endTime,
        originalSession: this.sessions().find((s) => s.id === sesion.id) ?? sesion,
      })
      .pipe(finalize(() => this.guardandoAjuste.set(false)))
      .subscribe({
        next: (res) => {
          // PATCH devuelve ApiDataResponse<Void>: solo `exitoso`; la lista se recarga por HTTP.
          if (!res.exitoso) return;
          this.avisar('success', mensajeUi('UI_TEACHER_GRUPOS_008'));
          this.cerrarAjuste();
          this.sesionActualizada.emit();
        },
        error: (err: unknown) => this.avisar('error', getApiErrorMessage(err)),
      });
  }

  abrirCancelar(sesion: ClassSession): void {
    if (!this.cancelacionHabilitada) return;
    this.errorCancelar.set(null);
    this.enviandoCancelacion.set(false);
    this.sesionACancelar.set(sesion);
  }

  cerrarCancelar(): void {
    this.sesionACancelar.set(null);
    this.errorCancelar.set(null);
    this.enviandoCancelacion.set(false);
  }

  confirmarCancelacion(motivo: string): void {
    const sesion = this.sesionACancelar();
    if (!this.cancelacionHabilitada || !sesion || !motivo.trim()) return;
    this.errorCancelar.set(null);
    this.enviandoCancelacion.set(true);
    this.sessionService.cancelarSesion(sesion.id, motivo.trim()).subscribe({
      next: (res) => {
        this.enviandoCancelacion.set(false);
        if (!res.exitoso) return;
        const cancelacion = res.datos?.cancelacion;
        if (cancelacion) this.sesionCancelada.emit({ sesionId: sesion.id, cancelacion });
        const notificados = res.datos?.estudiantesNotificados;
        this.avisar(
          'success',
          notificados ? mensajeUi('UI_TEACHER_GRUPOS_011', { notificados }) : mensajeUi('UI_COORDINATOR_SESIONES_GRUPO_001')
        );
        this.cerrarCancelar();
      },
      error: (err: unknown) => {
        this.enviandoCancelacion.set(false);
        this.errorCancelar.set(getApiErrorMessage(err));
      },
    });
  }

  private avisar(tipo: NotificacionToma['tipo'], texto: string): void {
    this.notificacion.emit({ tipo, texto });
  }
}
