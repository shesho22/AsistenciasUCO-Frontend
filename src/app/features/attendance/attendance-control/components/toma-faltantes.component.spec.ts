import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TomaFaltantesComponent } from './toma-faltantes.component';
import { TomaAsistenciaService } from '../../../../core/services/toma-asistencia.service';
import { FaltanteToma } from '../../../../core/models/toma-asistencia.model';
import { apiHttpError } from '../../../../core/testing/api-error.fixture';

function faltante(id: string, parcial: Partial<FaltanteToma> = {}): FaltanteToma {
  return { estudianteId: id, nombreCompleto: `Estudiante ${id}`, tieneRegistro: false, estado: null, marcadoAlCerrar: false, ...parcial };
}

function pagina(elementos: FaltanteToma[], numeroPagina = 1, totalPaginas = 1) {
  return { exitoso: true, elementos, numeroPagina, tamanoPagina: 100, totalElementos: elementos.length, totalPaginas };
}

describe('TomaFaltantesComponent (CULM-001 B.2)', () => {
  let fixture: ComponentFixture<TomaFaltantesComponent>;
  let tomas: jasmine.SpyObj<TomaAsistenciaService>;

  const el = (id: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const boton = (id: string) => el(id) as HTMLButtonElement;

  function crear(ventanaAbierta = true) {
    fixture = TestBed.createComponent(TomaFaltantesComponent);
    fixture.componentRef.setInput('tomaId', 't-1');
    fixture.componentRef.setInput('ventanaAbierta', ventanaAbierta);
    fixture.detectChanges(); // ejecuta el efecto de carga
    fixture.detectChanges(); // pinta la respuesta
  }

  beforeEach(() => {
    tomas = jasmine.createSpyObj<TomaAsistenciaService>('TomaAsistenciaService', ['consultarFaltantes', 'registrarAsistencias']);
    tomas.consultarFaltantes.and.returnValue(of(pagina([faltante('a'), faltante('b', { tieneRegistro: true, estado: 'SJC', marcadoAlCerrar: true })])));
    TestBed.configureTestingModule({
      imports: [TomaFaltantesComponent],
      providers: [
        { provide: TomaAsistenciaService, useValue: tomas },
      ],
    });
  });

  it('B2-F-08 consulta la primera pagina y lista tarjetas con "Sin lectura" o "Ausente"', () => {
    crear();
    expect(tomas.consultarFaltantes).toHaveBeenCalledWith('t-1', 1, 100);
    expect(el('faltante-a')!.textContent).toContain('Estudiante a');
    expect(el('faltante-a')!.textContent).toContain('Sin lectura');
    expect(el('faltante-b')!.textContent).toContain('Ausente');
  });

  it('B2-F-08 Marcar presente envia un lote de un elemento con AN y recarga la lista', () => {
    tomas.registrarAsistencias.and.returnValue(of({ exitoso: true, datos: { idToma: 't-1', idSesion: 's', totalRegistros: 1 } }));
    crear();
    tomas.consultarFaltantes.calls.reset();
    tomas.consultarFaltantes.and.returnValue(of(pagina([faltante('b')])));

    boton('marcar-presente-a').click();
    fixture.detectChanges();

    expect(tomas.registrarAsistencias).toHaveBeenCalledOnceWith('t-1', [{ estudianteId: 'a', estado: 'AN' }]);
    expect(tomas.consultarFaltantes).toHaveBeenCalledTimes(1);
    expect(el('faltante-a')).toBeNull();
  });

  it('B2-F-08 la seleccion multiple envia un solo lote con todos los seleccionados', () => {
    tomas.registrarAsistencias.and.returnValue(of({ exitoso: true, datos: { idToma: 't-1', idSesion: 's', totalRegistros: 2 } }));
    crear();
    (el('seleccionar-a') as HTMLInputElement).click();
    (el('seleccionar-b') as HTMLInputElement).click();
    fixture.detectChanges();
    boton('marcar-seleccionados').click();

    expect(tomas.registrarAsistencias).toHaveBeenCalledTimes(1);
    expect(tomas.registrarAsistencias).toHaveBeenCalledWith('t-1', [
      { estudianteId: 'a', estado: 'AN' },
      { estudianteId: 'b', estado: 'AN' },
    ]);
  });

  it('B2-F-08 Marcar seleccionados esta deshabilitado sin seleccion', () => {
    crear();
    expect(boton('marcar-seleccionados').disabled).toBeTrue();
  });

  it('B2-F-08 fuera de la ventana los botones de marcacion se deshabilitan', () => {
    crear(false);
    expect(boton('marcar-presente-a').disabled).toBeTrue();
    expect(boton('marcar-seleccionados').disabled).toBeTrue();
  });

  it('B2-F-08 si el backend rechaza la marcacion muestra su mensaje sin traducir', () => {
    tomas.registrarAsistencias.and.returnValue(throwError(() => apiHttpError(409, 'La ventana de la sesion ya cerro.', 'SES_008')));
    crear();
    boton('marcar-presente-a').click();
    fixture.detectChanges();
    expect(el('faltantes-error')!.textContent!.trim()).toBe('La ventana de la sesion ya cerro.');
  });

  it('B2-F-08 SES_008: si el backend responde ERR_SESION_CERRADA los botones quedan deshabilitados con su mensaje', () => {
    tomas.registrarAsistencias.and.returnValue(throwError(() => apiHttpError(409, 'La ventana de la sesion ya cerro.', 'ERR_SESION_CERRADA')));
    crear();
    boton('marcar-presente-a').click();
    fixture.detectChanges();
    expect(el('faltantes-error')!.textContent!.trim()).toBe('La ventana de la sesion ya cerro.');
    expect(boton('marcar-presente-a').disabled).toBeTrue();
    expect(boton('marcar-seleccionados').disabled).toBeTrue();
  });

  it('UX-toma el contenedor recarga los pendientes incrementando la version', () => {
    crear();
    tomas.consultarFaltantes.calls.reset();
    fixture.componentRef.setInput('version', 1);
    fixture.detectChanges();
    expect(tomas.consultarFaltantes).toHaveBeenCalledTimes(1);
  });

  it('UX-toma recorre todas las paginas de pendientes', () => {
    tomas.consultarFaltantes.and.callFake(((_t: string, p: number) =>
      of(p === 1 ? pagina([faltante('a')], 1, 2) : pagina([faltante('b')], 2, 2))) as never);
    crear();
    expect(el('faltante-a')).not.toBeNull();
    expect(el('faltante-b')).not.toBeNull();
  });

  it('UX-toma Marcar falta envia SJC de un elemento y se deshabilita para quien ya esta ausente', () => {
    tomas.registrarAsistencias.and.returnValue(of({ exitoso: true, datos: { idToma: 't-1', idSesion: 's', totalRegistros: 1 } }));
    crear();
    expect(boton('marcar-falta-b').disabled).toBeTrue();
    boton('marcar-falta-a').click();
    fixture.detectChanges();
    expect(tomas.registrarAsistencias).toHaveBeenCalledOnceWith('t-1', [{ estudianteId: 'a', estado: 'SJC' }]);
  });

  it('UX-toma filtra los pendientes por nombre', () => {
    crear();
    const buscar = el('buscar-pendiente') as HTMLInputElement;
    buscar.value = 'estudiante b';
    buscar.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(el('faltante-a')).toBeNull();
    expect(el('faltante-b')).not.toBeNull();
    buscar.value = 'zzz';
    buscar.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(el('faltantes-sin-coincidencias')).not.toBeNull();
  });

  it('UX-toma emite actualizado tras marcar para que la toma refresque su lista', () => {
    tomas.registrarAsistencias.and.returnValue(of({ exitoso: true, datos: { idToma: 't-1', idSesion: 's', totalRegistros: 1 } }));
    crear();
    let emitido = 0;
    fixture.componentInstance.actualizado.subscribe(() => emitido++);
    boton('marcar-presente-a').click();
    expect(emitido).toBe(1);
  });

  it('B2-F-08 sin faltantes muestra el estado vacio', () => {
    tomas.consultarFaltantes.and.returnValue(of(pagina([])));
    crear();
    expect(el('faltantes-vacio')).not.toBeNull();
  });

  it('B2-F-08 los controles tactiles son de al menos 44 px', () => {
    crear();
    expect(boton('marcar-presente-a').className).toContain('min-h-[44px]');
  });
});
