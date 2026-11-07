import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TeacherGrupoSabanaComponent } from './teacher-grupo-sabana.component';
import { TeacherAttendanceSummaryService } from '../../../../core/services/teacher-attendance-summary.service';
import { ClassSession } from '../../../../core/models/attendance.model';
import { ResumenAsistenciaEstudiante } from '../../../../core/models/indicadores-asistencia.model';
import { apiHttpError } from '../../../../core/testing/api-error.fixture';

const resumen = (id: string, parcial: Partial<ResumenAsistenciaEstudiante> = {}): ResumenAsistenciaEstudiante => ({
  estudianteId: id, nombreCompleto: `Estudiante ${id}`, codigoEstadoEstudiante: 'A',
  sesionesEjecutadas: 10, horasDictadas: 20, horasAsistidas: 16, horasFalta: 3, horasExcusa: 1, horasSinRegistro: 0,
  porcentajeInasistencia: 15, porcentajeAsistencia: 80, codigoPermanencia: 'RIESGO', umbralAdvertencia: 15, umbralPerdida: 20,
  ...parcial,
});

describe('TeacherGrupoSabanaComponent — resumen del backend (CULM-001 B.2, F-DOC-004)', () => {
  let fixture: ComponentFixture<TeacherGrupoSabanaComponent>;
  let servicio: jasmine.SpyObj<TeacherAttendanceSummaryService>;

  const sesion = (id: string, n: number, records: ClassSession['records'] = []): ClassSession => ({
    id, courseId: 'grp-1', sessionNumber: n, title: `S${n}`, date: '2026-09-14', startTime: '08:00', endTime: '10:00', records,
  });
  const fila = (id: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="sabana-resumen-${id}"]`) as HTMLElement | null;

  function crear(respuesta = of({ exitoso: true, elementos: [resumen('st-1')], numeroPagina: 1, tamanoPagina: 50, totalElementos: 1, totalPaginas: 1 })) {
    servicio = jasmine.createSpyObj('TeacherAttendanceSummaryService', ['consultarResumen']);
    servicio.consultarResumen.and.returnValue(respuesta);
    TestBed.configureTestingModule({
      imports: [TeacherGrupoSabanaComponent],
      providers: [{ provide: TeacherAttendanceSummaryService, useValue: servicio }],
    });
    fixture = TestBed.createComponent(TeacherGrupoSabanaComponent);
    fixture.componentRef.setInput('grupoId', 'grp-1');
    fixture.componentRef.setInput('estudiantes', [{ studentId: 'st-1', studentName: 'Ada', studentCode: '001' }, { studentId: 'st-2', studentName: 'Bob', studentCode: '002' }]);
    // Registros locales que, calculados en el cliente, darian 100 % de inasistencia: no deben usarse.
    fixture.componentRef.setInput('sessions', [sesion('ses-1', 1, [{ studentId: 'st-1', studentName: 'Ada', studentCode: '1', status: 'SJC' }])]);
    fixture.componentRef.setInput('cargando', false);
    fixture.detectChanges();
    fixture.detectChanges();
  }

  it('B2-F-23 consulta el resumen del grupo (pagina 1, 50) al mostrarse', () => {
    crear();
    expect(servicio.consultarResumen).toHaveBeenCalledOnceWith('grp-1', 1, 50);
  });

  it('B2-F-23 pinta % de inasistencia, horas y semaforo tal como los entrega el backend, sin calcular localmente', () => {
    crear();
    const celda = fila('st-1')!.textContent!.replace(/\s+/g, ' ');
    expect(celda).toContain('15%');
    expect(celda).not.toContain('100%');
    expect(celda).toContain('3 / 20 h');
    expect(fila('st-1')!.querySelector('[data-testid="semaforo-asistencia"]')!.textContent).toContain('En riesgo');
  });

  it('B2-F-23 un estudiante sin fila en el resumen muestra "—" y no un cero inventado', () => {
    crear();
    const texto = fila('st-2')!.textContent!.replace(/\s+/g, ' ');
    expect(texto).toContain('—');
    expect(texto).not.toContain('0%');
  });

  it('B2-F-23 elimina el calculo local y los umbrales 20/10 quemados', () => {
    crear();
    const c = fixture.componentInstance as unknown as Record<string, unknown>;
    expect(c['getPorcentajeFaltasEstudiante']).toBeUndefined();
    expect(c['getFaltasSjcEstudiante']).toBeUndefined();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('≥20%');
  });

  it('B2-F-23 si el resumen falla muestra el mensaje del backend', () => {
    crear(throwError(() => apiHttpError(403, 'No eres el titular de este grupo.', 'SEC_002')) as never);
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="sabana-resumen-error"]')!.textContent!.trim())
      .toBe('No eres el titular de este grupo.');
  });
});
