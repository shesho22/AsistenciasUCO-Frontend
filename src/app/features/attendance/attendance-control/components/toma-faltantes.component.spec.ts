import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, filter, of, throwError } from 'rxjs';
import { TomaFaltantesComponent } from './toma-faltantes.component';
import { TomaAsistenciaService } from '../../../../core/services/toma-asistencia.service';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { RealtimeEvent, REALTIME_EVENT_TYPE } from '../../../../core/realtime/model/realtime-event.model';
import { FaltanteToma } from '../../../../core/models/toma-asistencia.model';
import { apiHttpError } from '../../../../core/testing/api-error.fixture';

function faltante(id: string, parcial: Partial<FaltanteToma> = {}): FaltanteToma {
  return { estudianteId: id, nombreCompleto: `Estudiante ${id}`, tieneRegistro: false, estado: null, marcadoAlCerrar: false, ...parcial };
}

function pagina(elementos: FaltanteToma[], numeroPagina = 1, totalPaginas = 1) {
  return { exitoso: true, elementos, numeroPagina, tamanoPagina: 50, totalElementos: elementos.length, totalPaginas };
}

describe('TomaFaltantesComponent (CULM-001 B.2)', () => {
  let fixture: ComponentFixture<TomaFaltantesComponent>;
  let tomas: jasmine.SpyObj<TomaAsistenciaService>;
  let events$: Subject<RealtimeEvent>;

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
    events$ = new Subject<RealtimeEvent>();
    tomas = jasmine.createSpyObj<TomaAsistenciaService>('TomaAsistenciaService', ['consultarFaltantes', 'registrarAsistencias']);
    tomas.consultarFaltantes.and.returnValue(of(pagina([faltante('a'), faltante('b', { tieneRegistro: true, estado: 'SJC', marcadoAlCerrar: true })])));
    const realtime = jasmine.createSpyObj<RealtimeService>('RealtimeService', ['listenType']);
    realtime.listenType.and.callFake(((type: string) => events$.pipe(filter((e) => e.type === type))) as never);
    TestBed.configureTestingModule({
      imports: [TomaFaltantesComponent],
      providers: [
        { provide: TomaAsistenciaService, useValue: tomas },
        { provide: RealtimeService, useValue: realtime },
      ],
    });
  });

  it('B2-F-08 consulta la primera pagina y lista tarjetas con "Sin lectura" o "Ausente"', () => {
    crear();
    expect(tomas.consultarFaltantes).toHaveBeenCalledWith('t-1', 1, 50);
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

  it('B2-F-08 ASISTENCIAS_TOMA_ACTUALIZADAS de la toma recarga la lista; las de otra toma no', () => {
    crear();
    tomas.consultarFaltantes.calls.reset();
    events$.next({ eventId: 'e', type: REALTIME_EVENT_TYPE.ASISTENCIAS_TOMA_ACTUALIZADAS, occurredAt: 'x', correlationId: null,
      payload: { grupo: 'g', sesion: 's', toma: 'otra', totalRegistros: 1 } });
    expect(tomas.consultarFaltantes).not.toHaveBeenCalled();
    events$.next({ eventId: 'e', type: REALTIME_EVENT_TYPE.ASISTENCIAS_TOMA_ACTUALIZADAS, occurredAt: 'x', correlationId: null,
      payload: { grupo: 'g', sesion: 's', toma: 't-1', totalRegistros: 3 } });
    expect(tomas.consultarFaltantes).toHaveBeenCalledTimes(1);
  });

  it('B2-F-08 pagina la lista con la respuesta del backend', () => {
    tomas.consultarFaltantes.and.returnValue(of(pagina([faltante('a')], 1, 3)));
    crear();
    tomas.consultarFaltantes.calls.reset();
    fixture.componentInstance.cambiarPagina(2);
    expect(tomas.consultarFaltantes).toHaveBeenCalledWith('t-1', 2, 50);
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
