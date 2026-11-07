import { TestBed } from '@angular/core/testing';
import { GroupSessionsOverviewComponent } from './group-sessions-overview.component';
import { ClassSession } from '../../../../core/models/attendance.model';
import { ResumenAsistenciaEstudiante } from '../../../../core/models/indicadores-asistencia.model';

const resumen = (id: string, parcial: Partial<ResumenAsistenciaEstudiante>): ResumenAsistenciaEstudiante => ({
  estudianteId: id, nombreCompleto: id, codigoEstadoEstudiante: 'A', sesionesEjecutadas: 10, horasDictadas: 20, horasAsistidas: 16,
  horasFalta: 3, horasExcusa: 1, horasSinRegistro: 0, porcentajeInasistencia: 15, porcentajeAsistencia: 80,
  codigoPermanencia: 'REGULAR', umbralAdvertencia: 15, umbralPerdida: 20, ...parcial,
});

describe('GroupSessionsOverviewComponent — KPIs desde el resumen del backend (CULM-001 B.2)', () => {
  const sesion = (n: number): ClassSession => ({
    id: `s${n}`, courseId: 'g', sessionNumber: n, title: `S${n}`, date: '2026-09-14', startTime: '08:00', endTime: '10:00',
    records: [{ studentId: 'a', studentName: 'A', studentCode: '1', status: 'SJC' }],
  });

  function crear(resumenes: ResumenAsistenciaEstudiante[]) {
    const fixture = TestBed.configureTestingModule({ imports: [GroupSessionsOverviewComponent] }).createComponent(GroupSessionsOverviewComponent);
    fixture.componentRef.setInput('sessions', [sesion(1), sesion(2), sesion(3), sesion(4), sesion(5)]);
    fixture.componentRef.setInput('resumen', resumenes);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('B2-F-24 estudiantesEnRiesgo cuenta los codigoPermanencia RIESGO o PERDIDA del resumen', () => {
    const c = crear([
      resumen('a', { codigoPermanencia: 'RIESGO' }),
      resumen('b', { codigoPermanencia: 'PERDIDA' }),
      resumen('c', { codigoPermanencia: 'REGULAR' }),
    ]);
    expect(c.estudiantesEnRiesgo()).toBe(2);
  });

  it('B2-F-24 promedioAsistencia es el promedio de porcentajeAsistencia del resumen, no de los registros locales', () => {
    const c = crear([resumen('a', { porcentajeAsistencia: 80 }), resumen('b', { porcentajeAsistencia: 90 })]);
    expect(c.promedioAsistencia()).toBe(85);
  });

  it('B2-F-24 sin resumen no hay promedio (null) ni estudiantes en riesgo', () => {
    const c = crear([]);
    expect(c.promedioAsistencia()).toBeNull();
    expect(c.estudiantesEnRiesgo()).toBe(0);
  });
});
