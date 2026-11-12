import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ResumenSesionTomasComponent } from './resumen-sesion-tomas.component';
import { TomaAsistenciaService } from '../../../../core/services/toma-asistencia.service';
import { AsistenciaToma, ResumenTomasEstudiante, TomaAsistencia } from '../../../../core/models/toma-asistencia.model';
import { apiHttpError } from '../../../../core/testing/api-error.fixture';

function toma(id: string, numero: number, horasToma: number): TomaAsistencia {
  return {
    idToma: id, idSesion: 's-1', idGrupo: 'g-1', numero, modo: 'MANUAL', estado: 'CERRADA',
    esImplicita: false, fechaAperturaUtc: '2026-11-10T13:00:00Z', fechaCierreUtc: '2026-11-10T14:00:00Z', horasToma,
    fechaPuntoControlUtc: '2026-11-10T13:00:00Z', ordenPuntoControl: numero, minutosTramoAnterior: 0, minutosTramoSiguiente: 60, esEditable: true, editableHastaUtc: null,
    totalRegistros: 2, totalPresentes: 1, totalAusentes: 1, totalExcusas: 0, tieneQrActivo: false,
  };
}

function resumenEst(id: string, parcial: Partial<ResumenTomasEstudiante> = {}): ResumenTomasEstudiante {
  return {
    estudianteId: id, nombreCompleto: `Estudiante ${id}`, minutosSesion: 120, minutosAsistidos: 120, minutosFalta: 0,
    minutosExcusa: 0, minutosSinRegistro: 0, estado: 'PRESENTE', tomasAusentes: 0, ...parcial,
  };
}

function fila(id: string, estado: AsistenciaToma['estado']): AsistenciaToma {
  return { estudianteId: id, nombreCompleto: `Estudiante ${id}`, estado, registradoPorEstudiante: false, fechaRegistroUtc: null };
}

function pagina(elementos: AsistenciaToma[]) {
  return { exitoso: true, elementos, numeroPagina: 1, tamanoPagina: 100, totalElementos: elementos.length, totalPaginas: 1 };
}

describe('ResumenSesionTomasComponent (CULM-001 UX toma)', () => {
  let fixture: ComponentFixture<ResumenSesionTomasComponent>;
  let service: jasmine.SpyObj<TomaAsistenciaService>;

  const el = (id: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const texto = (id: string) => (el(id)?.textContent ?? '').replace(/\s+/g, ' ').trim();

  function crear(tomas: TomaAsistencia[] = [toma('t-1', 1, 1), toma('t-2', 2, 0.5)]) {
    fixture = TestBed.createComponent(ResumenSesionTomasComponent);
    fixture.componentRef.setInput('tomas', tomas);
    fixture.componentRef.setInput('sesionId', 's-1');
    fixture.detectChanges();
    fixture.detectChanges();
  }

  beforeEach(() => {
    service = jasmine.createSpyObj<TomaAsistenciaService>('TomaAsistenciaService', ['consultarAsistencias', 'consultarResumenSesion']);
    service.consultarResumenSesion.and.returnValue(of({
      exitoso: true,
      datos: [
        resumenEst('a'),
        resumenEst('b', { minutosAsistidos: 40, minutosFalta: 80, estado: 'PARCIAL', tomasAusentes: 1 }),
        resumenEst('c', { minutosAsistidos: 20, minutosExcusa: 100, estado: 'PARCIAL' }),
      ],
    }));
    service.consultarAsistencias.and.callFake(((tomaId: string) =>
      of(tomaId === 't-1'
        ? pagina([fila('a', 'AN'), fila('b', 'SJC'), fila('c', 'EX')])
        : pagina([fila('a', 'AN'), fila('b', 'AN'), fila('c', null)]))) as never);
    TestBed.configureTestingModule({
      imports: [ResumenSesionTomasComponent],
      providers: [{ provide: TomaAsistenciaService, useValue: service }],
    });
  });

  afterEach(() => fixture?.destroy());

  it('pide las asistencias de cada toma y arma la matriz estudiante x toma', () => {
    crear();
    expect(service.consultarAsistencias).toHaveBeenCalledWith('t-1', 1, 100);
    expect(service.consultarAsistencias).toHaveBeenCalledWith('t-2', 1, 100);
    expect(el('celda-a-t-1')!.getAttribute('data-estado')).toBe('AN');
    expect(el('celda-b-t-1')!.getAttribute('data-estado')).toBe('SJC');
    expect(el('celda-c-t-1')!.getAttribute('data-estado')).toBe('EX');
    expect(el('celda-c-t-2')!.getAttribute('data-estado')).toBe('SIN');
    expect(texto('columna-t-1')).toContain('Toma 1');
    expect(texto('columna-t-2')).toContain('Toma 2');
  });

  it('cada celda tiene texto accesible con el estado', () => {
    crear();
    expect(el('celda-a-t-1')!.textContent).toContain('Presente');
    expect(el('celda-b-t-1')!.textContent).toContain('Falta');
    expect(el('celda-c-t-1')!.textContent).toContain('Excusa');
    expect(el('celda-c-t-2')!.textContent).toContain('Sin registro');
  });

  it('muestra los minutos y el estado que calcula el backend, sin recalcular horas', () => {
    crear();
    expect(service.consultarResumenSesion).toHaveBeenCalledWith('s-1');
    expect(texto('asistencia-a')).toBe('Presente · 120 de 120 min');
    expect(texto('asistencia-b')).toBe('Parcial: 40 de 120 minutos');
    expect(texto('asistencia-c')).toContain('Parcial: 20 de 120 minutos');
    expect(texto('asistencia-c')).toContain('100 min justificados');
  });

  it('los otros estados se muestran como Ausente, Justificada o No disponible', () => {
    service.consultarResumenSesion.and.returnValue(of({
      exitoso: true,
      datos: [
        resumenEst('a', { minutosAsistidos: 0, minutosFalta: 120, estado: 'AUSENTE' }),
        resumenEst('b', { minutosAsistidos: 0, minutosExcusa: 120, estado: 'JUSTIFICADA' }),
        resumenEst('c', { minutosAsistidos: 0, minutosSinRegistro: 120, estado: 'NO_DISPONIBLE' }),
      ],
    }));
    crear();
    expect(texto('asistencia-a')).toBe('Ausente');
    expect(texto('asistencia-b')).toContain('Justificada');
    expect(texto('asistencia-c')).toBe('No disponible');
  });

  it('la cabecera de cada toma muestra su numero y su hora de punto de control', () => {
    crear();
    expect(texto('columna-t-1')).toMatch(/Toma 1 · \d{2}:\d{2}/);
    expect(texto('columna-t-2')).toMatch(/Toma 2 · \d{2}:\d{2}/);
    expect(texto('columna-t-1')).not.toContain(' h');
  });

  it('muestra la leyenda de los cuatro estados', () => {
    crear();
    const leyenda = texto('leyenda');
    for (const etiqueta of ['Presente', 'Falta', 'Excusa', 'Sin registro']) {
      expect(leyenda).toContain(etiqueta);
    }
  });

  it('filtra la matriz por nombre', () => {
    crear();
    const buscar = el('buscar-resumen') as HTMLInputElement;
    buscar.value = 'estudiante c';
    buscar.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(el('fila-resumen-a')).toBeNull();
    expect(el('fila-resumen-c')).not.toBeNull();
  });

  it('un estudiante que no aparece en una toma se muestra como sin registro en ella', () => {
    service.consultarAsistencias.and.callFake(((tomaId: string) =>
      of(tomaId === 't-1' ? pagina([fila('a', 'AN')]) : pagina([fila('a', 'AN'), fila('z', 'AN')]))) as never);
    crear();
    expect(el('celda-z-t-1')!.getAttribute('data-estado')).toBe('SIN');
  });

  it('si cambian las tomas del backend vuelve a consultar', () => {
    crear();
    service.consultarAsistencias.calls.reset();
    fixture.componentRef.setInput('tomas', [toma('t-1', 1, 1), toma('t-2', 2, 0.5), toma('t-3', 3, 0.5)]);
    fixture.detectChanges();
    expect(service.consultarAsistencias).toHaveBeenCalledTimes(3);
  });

  it('un error del resumen de minutos muestra el mensaje del backend', () => {
    service.consultarResumenSesion.and.returnValue(throwError(() => apiHttpError(403, 'No es titular.', 'SEC_002')));
    crear();
    expect(texto('resumen-error')).toContain('No es titular.');
  });

  it('un error muestra el mensaje del backend', () => {
    service.consultarAsistencias.and.returnValue(throwError(() => apiHttpError(403, 'No es titular.', 'SEC_002')));
    crear();
    expect(texto('resumen-error')).toContain('No es titular.');
  });

  it('el contenedor de la matriz se desplaza solo, sin ensanchar la pagina', () => {
    crear();
    expect(el('matriz-scroll')!.className).toContain('overflow-x-auto');
  });
});
