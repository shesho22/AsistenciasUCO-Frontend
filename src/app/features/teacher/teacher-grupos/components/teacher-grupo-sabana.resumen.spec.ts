import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TeacherGrupoSabanaComponent } from './teacher-grupo-sabana.component';
import { TeacherAttendanceSummaryService } from '../../../../core/services/teacher-attendance-summary.service';
import { TeacherMatrizAsistenciaService } from '../../../../core/services/teacher-matriz-asistencia.service';
import { FilaMatriz, MatrizAsistenciaPagina } from '../../../../core/models/matriz-asistencia.model';
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
  let matriz: jasmine.SpyObj<TeacherMatrizAsistenciaService>;

  const sesion = (id: string, n: number, records: ClassSession['records'] = []): ClassSession => ({
    id, courseId: 'grp-1', sessionNumber: n, title: `S${n}`, date: '2026-09-14', startTime: '08:00', endTime: '10:00', records,
  });
  const fila = (id: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="sabana-resumen-${id}"]`) as HTMLElement | null;

  const filaMatriz = (id: string, nombre: string, codigoEstado = 'AUSENTE'): FilaMatriz => ({
    idEstudianteGrupo: `eg-${id}`, idEstudiante: id, nombreCompleto: nombre, documento: '001', codigoEstadoEstudiante: 'A',
    celdas: [{ idSesion: 'ses-1', codigoEstado: codigoEstado as FilaMatriz['celdas'][number]['codigoEstado'], minutosAsistidos: 0, minutosSesion: 120 }],
  });
  const paginaMatriz = (elementos: FilaMatriz[], total = elementos.length): MatrizAsistenciaPagina => ({
    exitoso: true, sesiones: [], elementos, numeroPagina: 1, tamanoPagina: 50, totalElementos: total, totalPaginas: Math.ceil(total / 50),
  });

  function crear(
    respuesta = of({ exitoso: true, elementos: [resumen('st-1')], numeroPagina: 1, tamanoPagina: 50, totalElementos: 1, totalPaginas: 1 }),
    matrizRespuesta = of(paginaMatriz([filaMatriz('st-1', 'Ada'), filaMatriz('st-2', 'Bob')]))
  ) {
    servicio = jasmine.createSpyObj('TeacherAttendanceSummaryService', ['consultarResumen']);
    servicio.consultarResumen.and.returnValue(respuesta);
    matriz = jasmine.createSpyObj('TeacherMatrizAsistenciaService', ['consultarMatriz']);
    matriz.consultarMatriz.and.returnValue(matrizRespuesta);
    TestBed.configureTestingModule({
      imports: [TeacherGrupoSabanaComponent],
      providers: [
        { provide: TeacherAttendanceSummaryService, useValue: servicio },
        { provide: TeacherMatrizAsistenciaService, useValue: matriz },
      ],
    });
    fixture = TestBed.createComponent(TeacherGrupoSabanaComponent);
    fixture.componentRef.setInput('grupoId', 'grp-1');
    // Registros locales que, calculados en el cliente, darian 100 % de inasistencia: no deben usarse.
    fixture.componentRef.setInput('sessions', [sesion('ses-1', 1, [{ studentId: 'st-1', studentName: 'Ada', studentCode: '1', status: 'SJC' }])]);
    fixture.componentRef.setInput('cargando', false);
    fixture.detectChanges();
    fixture.detectChanges();
  }

  it('B2-F-23 consulta el resumen del grupo (pagina 1, 50) al mostrarse', () => {
    crear();
    expect(servicio.consultarResumen).toHaveBeenCalledOnceWith('grp-1', 1, 50, '');
    expect(matriz.consultarMatriz).toHaveBeenCalledOnceWith('grp-1', 1, 50, '');
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

  it('CIERRE-W3M la celda es la que entrega la matriz del servidor: ausente, justificada, presente y parcial', () => {
    const estados = ['AUSENTE', 'JUSTIFICADA', 'PRESENTE', 'PARCIAL', 'SIN_REGISTRO', 'NO_DISPONIBLE'];
    crear(undefined, of(paginaMatriz(estados.map((e, i) => filaMatriz(`e${i}`, `E${i}`, e)))));
    const celda = (i: number) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="sabana-celda-e${i}-ses-1"]`)!.textContent!.trim();
    expect([celda(0), celda(1), celda(2)]).toEqual(['SJC', 'EX', 'AN']);
    expect(celda(3)).toBe('0/120');
    expect([celda(4), celda(5)]).toEqual(['—', '—']);
  });

  it('CIERRE-W3M la sabana pagina en el servidor: cambiar de pagina pide esa pagina y no recorta nada en el cliente', () => {
    crear(undefined, of(paginaMatriz([filaMatriz('st-1', 'Ada')], 120)));
    const componente = fixture.componentInstance as unknown as { cambiarPagina(n: number): void };

    componente.cambiarPagina(3);

    expect(matriz.consultarMatriz).toHaveBeenCalledWith('grp-1', 3, 50, '');
    expect(servicio.consultarResumen).toHaveBeenCalledWith('grp-1', 3, 50, '');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid^="sabana-resumen-"]').length).toBe(1);
  });

  it('CIERRE-W3M buscar pide al servidor la busqueda en la pagina 1 para la matriz y para el resumen', fakeAsync(() => {
    crear();
    const componente = fixture.componentInstance as unknown as { cambiarPagina(n: number): void };
    componente.cambiarPagina(2);
    const entrada = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="sabana-busqueda"]') as HTMLInputElement;
    entrada.value = 'ana';
    entrada.dispatchEvent(new Event('input'));

    tick(300);

    expect(matriz.consultarMatriz).toHaveBeenCalledWith('grp-1', 1, 50, 'ana');
    expect(servicio.consultarResumen).toHaveBeenCalledWith('grp-1', 1, 50, 'ana');
  }));

  it('CIERRE-W3M una busqueda sin coincidencias lo dice y no muestra la tabla', () => {
    crear(undefined, of(paginaMatriz([])));
    const componente = fixture.componentInstance as unknown as { busqueda: { set(v: string): void } };
    componente.busqueda.set('zzz');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ningún estudiante del grupo coincide con la búsqueda.');
    expect((fixture.nativeElement as HTMLElement).querySelector('table')).toBeNull();
  });

  it('CIERRE-W3M sin estudiantes matriculados muestra el estado vacio', () => {
    crear(undefined, of(paginaMatriz([])));
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hay estudiantes matriculados en este grupo');
  });

  it('CIERRE-W3M si la matriz falla muestra el mensaje del backend y no la tabla', () => {
    crear(undefined, throwError(() => apiHttpError(403, 'No eres el titular de este grupo.', 'SEC_002')) as never);
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="sabana-matriz-error"]')!.textContent!.trim())
      .toBe('No eres el titular de este grupo.');
    expect((fixture.nativeElement as HTMLElement).querySelector('table')).toBeNull();
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

  it('F-DOC-007: la matriz pinta solo la pagina que entrega el servidor y la paginacion usa su total', () => {
    const pagina = Array.from({ length: 50 }, (_, i) => filaMatriz(`st-${i}`, `E${i}`));
    crear(undefined, of(paginaMatriz(pagina, 120)));

    const filas = (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid^="sabana-resumen-"]');
    expect(filas.length).toBe(50);
    expect((fixture.nativeElement as HTMLElement).querySelector('app-pagination')).not.toBeNull();
  });
});
