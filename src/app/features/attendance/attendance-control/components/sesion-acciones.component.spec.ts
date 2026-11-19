import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';

import { SesionAccionesComponent, SesionCanceladaEvento } from './sesion-acciones.component';
import { NotificacionToma } from './toma-asistencias.component';
import { SessionService } from '../../../../core/services/session.service';
import { StudentService } from '../../../../core/services/student.service';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { ClassSession } from '../../../../core/models/attendance.model';
import { Course } from '../../../../core/models/course.model';
import { apiHttpError } from '../../../../core/testing/api-error.fixture';
import { mensajeUi } from '../../../../core/messages/mensajes-ui';

// Acciones por sesión que antes vivían en el cronograma del grupo del docente y ahora están en el menú "Acciones"
// del historial de /app/asistencia: detalles, ajuste de horario y cancelación con motivo (HU047).
describe('SesionAccionesComponent', () => {
  let fixture: ComponentFixture<SesionAccionesComponent>;
  let component: SesionAccionesComponent;
  let sessionService: jasmine.SpyObj<SessionService>;
  let studentService: jasmine.SpyObj<StudentService>;
  let attendanceService: jasmine.SpyObj<AttendanceService>;
  let avisos: NotificacionToma[];
  let actualizadas: number;
  let canceladas: SesionCanceladaEvento[];

  const course = { id: 'crs-1', code: 'MAT-301', name: 'Matemática', section: 'A' } as Course;
  const sesion = (extra: Partial<ClassSession> = {}): ClassSession => ({
    id: 'ses-1', courseId: 'crs-1', sessionNumber: 1, title: 'Sesión 1',
    date: '2026-09-10', startTime: '08:00', endTime: '10:00', records: [],
    estado: 'PROGRAMADA', cancelacion: null, ...extra,
  });

  beforeEach(() => {
    sessionService = jasmine.createSpyObj<SessionService>('SessionService', ['updateSession', 'cancelarSesion']);
    studentService = jasmine.createSpyObj<StudentService>('StudentService', ['getStudentsByGroup']);
    attendanceService = jasmine.createSpyObj<AttendanceService>('AttendanceService', ['getAttendancesByGroup']);
    studentService.getStudentsByGroup.and.returnValue(of({ exitoso: true, datos: [] }) as never);
    attendanceService.getAttendancesByGroup.and.returnValue(of({ exitoso: true, datos: [] }) as never);

    TestBed.configureTestingModule({
      imports: [SesionAccionesComponent],
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: StudentService, useValue: studentService },
        { provide: AttendanceService, useValue: attendanceService },
      ],
    });
    fixture = TestBed.createComponent(SesionAccionesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('course', course);
    fixture.componentRef.setInput('sessions', [sesion()]);
    avisos = [];
    actualizadas = 0;
    canceladas = [];
    component.notificacion.subscribe((n) => avisos.push(n));
    component.sesionActualizada.subscribe(() => actualizadas++);
    component.sesionCancelada.subscribe((c) => canceladas.push(c));
    fixture.detectChanges();
  });

  describe('Ver detalles', () => {
    it('pide solo la lista de esa sesión, deja fuera a los retirados y no sintetiza marcas', () => {
      studentService.getStudentsByGroup.and.returnValue(of({
        exitoso: true,
        datos: [
          { idEstudiante: 'est-2', nombreCompleto: 'Estudiante Dos', documento: '002', codigoEstado: 'A' },
          { idEstudiante: 'est-3', nombreCompleto: 'Estudiante Tres', documento: '003', codigoEstado: 'A' },
          { idEstudiante: 'est-4', nombreCompleto: 'Retirado', documento: '004', codigoEstado: 'R' },
        ],
      }) as never);
      attendanceService.getAttendancesByGroup.and.returnValue(of({
        exitoso: true,
        datos: [{ asistencia: 'a1', estudiante: 'est-2', grupo: 'crs-1', sesion: 'ses-1', presente: true, estado: 'AN', observacion: null }],
      }) as never);

      component.abrirDetalle(sesion());

      expect(attendanceService.getAttendancesByGroup).toHaveBeenCalledWith('crs-1', 'ses-1');
      expect(component.sesionDetalle()?.records.map((r) => [r.studentId, r.status])).toEqual([['est-2', 'AN'], ['est-3', null]]);
    });

    it('abre el modal sin registros mientras llegan y avisa con el mensaje del backend si la consulta falla', () => {
      studentService.getStudentsByGroup.and.returnValue(throwError(() => apiHttpError(409, 'No se pudo consultar el padron.', 'CONFLICT')) as never);

      component.abrirDetalle(sesion());
      fixture.detectChanges();

      expect(component.sesionDetalle()?.records).toEqual([]);
      expect(avisos).toEqual([{ tipo: 'error', texto: 'No se pudo consultar el padron.' }]);
    });

    it('descarta la respuesta de una sesión que ya no es la abierta', () => {
      const lento = new Subject<never>();
      studentService.getStudentsByGroup.and.returnValue(lento as never);

      component.abrirDetalle(sesion());
      component.cerrarDetalle();
      lento.next({ exitoso: true, datos: [{ idEstudiante: 'est-1', nombreCompleto: 'Ana', documento: '1', codigoEstado: 'A' }] } as never);
      lento.complete();

      expect(component.sesionDetalle()).toBeNull();
    });
  });

  describe('Ajustar horario', () => {
    const cambios = { title: 'Editada', date: '2026-09-11', startTime: '09:00', endTime: '11:00' };

    it('PATCH con ApiDataResponse<Void>: éxito con solo `exitoso` avisa, cierra el modal y pide recargar la lista', () => {
      sessionService.updateSession.and.returnValue(of({ exitoso: true, datos: null }));
      component.abrirAjuste(sesion());

      component.guardarAjuste(cambios);

      expect(sessionService.updateSession).toHaveBeenCalledOnceWith('crs-1', 'ses-1', { ...cambios, originalSession: sesion() });
      expect(avisos).toEqual([{ tipo: 'success', texto: mensajeUi('UI_TEACHER_GRUPOS_008') }]);
      expect(actualizadas).toBe(1);
      expect(component.sesionAjuste()).toBeNull();
    });

    it('A2-F-09 un 400 SES_017 muestra el message del backend y deja el modal abierto', () => {
      const mensaje = 'La sesión se cruza con otra sesión del grupo o del docente en ese horario.';
      sessionService.updateSession.and.returnValue(throwError(() => apiHttpError(400, mensaje, 'VALIDATION_ERROR')));
      component.abrirAjuste(sesion());

      component.guardarAjuste(cambios);

      expect(avisos).toEqual([{ tipo: 'error', texto: mensaje }]);
      expect(actualizadas).toBe(0);
      expect(component.sesionAjuste()).not.toBeNull();
      expect(component.guardandoAjuste()).toBeFalse();
    });

    it('sin sesión abierta no envía nada', () => {
      component.guardarAjuste(cambios);
      expect(sessionService.updateSession).not.toHaveBeenCalled();
    });
  });

  describe('Cancelar sesión (HU047, CULM-001 B.1)', () => {
    const respuesta = {
      exitoso: true,
      datos: {
        idSesion: 'ses-1', idGrupo: 'crs-1', estado: 'CANCELADA',
        cancelacion: { tipo: 'DOCENTE', motivo: 'Incapacidad médica del docente', nombreFestivo: null, fechaCancelacionUtc: '2026-11-10T14:00:00Z' },
        estudiantesNotificados: 12,
      },
    };

    it('la bandera de cancelación está activa', () => {
      expect(component.cancelacionHabilitada).toBeTrue();
    });

    it('B1-F-20 con éxito entrega la cancelación del backend, avisa a cuántos notificó y cierra el modal', () => {
      sessionService.cancelarSesion.and.returnValue(of<never>(respuesta as never));
      component.abrirCancelar(sesion());

      component.confirmarCancelacion('  Incapacidad médica del docente  ');

      expect(sessionService.cancelarSesion).toHaveBeenCalledWith('ses-1', 'Incapacidad médica del docente');
      expect(canceladas).toEqual([{ sesionId: 'ses-1', cancelacion: respuesta.datos.cancelacion as never }]);
      expect(avisos).toEqual([{ tipo: 'success', texto: mensajeUi('UI_TEACHER_GRUPOS_011', { notificados: 12 }) }]);
      expect(component.sesionACancelar()).toBeNull();
      expect(component.errorCancelar()).toBeNull();
    });

    it('sin estudiantes notificados usa el aviso genérico de sesión cancelada', () => {
      sessionService.cancelarSesion.and.returnValue(
        of<never>({ exitoso: true, datos: { ...respuesta.datos, estudiantesNotificados: 0 } } as never)
      );
      component.abrirCancelar(sesion());

      component.confirmarCancelacion('Incapacidad médica del docente');

      expect(avisos).toEqual([{ tipo: 'success', texto: mensajeUi('UI_COORDINATOR_SESIONES_GRUPO_001') }]);
    });

    for (const codigo of ['SES_011', 'SES_012', 'SES_013', 'SES_016']) {
      it(`B1-F-21 ${codigo}: muestra el mensaje del backend en el modal y lo mantiene abierto`, () => {
        const mensaje = `Mensaje del backend para ${codigo}`;
        sessionService.cancelarSesion.and.returnValue(throwError(() => new HttpErrorResponse({
          status: 409,
          error: { timestamp: 't', status: 409, error: 'Conflict', code: codigo, message: mensaje, path: '/p', correlationId: null },
        })));
        component.abrirCancelar(sesion());

        component.confirmarCancelacion('Motivo suficientemente largo');

        expect(component.errorCancelar()).toBe(mensaje);
        expect(component.sesionACancelar()).not.toBeNull();
        expect(component.enviandoCancelacion()).toBeFalse();
        expect(canceladas).toEqual([]);
      });
    }

    it('B1-F-21 abrir de nuevo el modal limpia el error anterior', () => {
      component.errorCancelar.set('viejo');
      component.abrirCancelar(sesion());
      expect(component.errorCancelar()).toBeNull();
    });

    it('un motivo vacío no llama al backend', () => {
      component.abrirCancelar(sesion());
      component.confirmarCancelacion('   ');
      expect(sessionService.cancelarSesion).not.toHaveBeenCalled();
    });
  });
});
