import { TestBed } from '@angular/core/testing';
import { GroupSessionsOverviewComponent } from './group-sessions-overview.component';
import { ClassSession } from '../../../../core/models/attendance.model';
import { ResumenSesionesGrupo } from '../../../../core/models/resumen-sesiones-grupo.model';
import { resumenSesiones, sesionResumen } from '../../../../core/testing/resumen-sesiones-grupo.fixture';

describe('GroupSessionsOverviewComponent — KPIs desde el resumen del servidor (CIERRE-W3M)', () => {
  const sesion = (n: number): ClassSession => ({
    id: `s${n}`, courseId: 'g', sessionNumber: n, title: `S${n}`, date: '2026-09-14', startTime: '08:00', endTime: '10:00',
    // Registros locales que, contados en el cliente, darian otro resultado: no deben usarse.
    records: [{ studentId: 'a', studentName: 'A', studentCode: '1', status: 'SJC' }],
  });

  function crear(resumen: ResumenSesionesGrupo | null) {
    const fixture = TestBed.configureTestingModule({ imports: [GroupSessionsOverviewComponent] }).createComponent(GroupSessionsOverviewComponent);
    fixture.componentRef.setInput('sessions', [sesion(1), sesion(2), sesion(3), sesion(4), sesion(5)]);
    fixture.componentRef.setInput('resumenSesiones', resumen);
    fixture.detectChanges();
    return fixture;
  }

  const texto = (fixture: ReturnType<typeof crear>) => ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

  it('B2-F-24 muestra los estudiantes en riesgo que cuenta el servidor, no los registros locales', () => {
    const fixture = crear(resumenSesiones({ estudiantesEnRiesgo: 2, promedioAsistencia: 85 }));
    expect(texto(fixture)).toContain('2 Alumnos');
  });

  it('B2-F-24 el promedio es el del servidor y se muestra sin decimales', () => {
    const fixture = crear(resumenSesiones({ promedioAsistencia: 84.6 }));
    expect(fixture.componentInstance.promedio()).toBe(84.6);
    expect(texto(fixture)).toContain('85%');
    expect(texto(fixture)).toContain('Promedio por horas del grupo');
  });

  it('B2-F-24 sin horas dictadas el promedio es nulo y no se inventa un 0 %', () => {
    const fixture = crear(resumenSesiones({ promedioAsistencia: null }));
    expect(fixture.componentInstance.promedio()).toBeNull();
    expect(texto(fixture)).toContain('Sin registros de asistencia para calcular');
    expect(texto(fixture)).not.toContain('0%');
  });

  it('sin resumen del servidor muestra ceros y sin promedio', () => {
    const fixture = crear(null);
    expect(fixture.componentInstance.promedio()).toBeNull();
    expect(texto(fixture)).toContain('0 sesiones programadas');
  });

  it('CIERRE-W3M los conteos de sesiones del grupo vienen del servidor: programadas, ejecutadas y canceladas', () => {
    const fixture = crear(resumenSesiones({ sesionesProgramadas: 5, sesionesEjecutadas: 3, sesionesCanceladas: 1 }));
    expect(texto(fixture)).toContain('5 sesiones programadas');
    expect(texto(fixture)).toContain('3 ejecutadas · 1 canceladas');
  });

  it('CIERRE-W3M el conteo por sesion es el del servidor y se ubica por id de sesion', () => {
    const fixture = crear(resumenSesiones({
      sesiones: [sesionResumen('s1', { totalEstudiantes: 4, presentes: 2, justificadas: 1, parciales: 1 })],
    }));
    const celda = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="asistentes-sesion-1"]')!.textContent!.replace(/\s+/g, ' ');
    expect(celda).toContain('2 / 4');
    expect(celda).toContain('1 justificada');
    expect(celda).toContain('1 parcial');
    const sinConteo = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="asistentes-sesion-2"]')!.textContent!.replace(/\s+/g, ' ');
    expect(sinConteo).toContain('0 / 0');
  });
});
