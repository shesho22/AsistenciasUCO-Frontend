import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { TomaAsistenciasComponent } from './toma-asistencias.component';
import { TomaAsistenciaService } from '../../../../core/services/toma-asistencia.service';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { AsistenciaToma, TomaAsistencia } from '../../../../core/models/toma-asistencia.model';
import { apiHttpError } from '../../../../core/testing/api-error.fixture';

function toma(parcial: Partial<TomaAsistencia> = {}): TomaAsistencia {
  return {
    idToma: 't-1', idSesion: 's-1', idGrupo: 'g-1', numero: 1, modo: 'MANUAL', estado: 'ABIERTA',
    esImplicita: false, fechaAperturaUtc: '2026-11-10T13:00:00Z', fechaCierreUtc: null, horasToma: 1,
    totalRegistros: 3, totalPresentes: 1, totalAusentes: 1, totalExcusas: 0, tieneQrActivo: false, ...parcial,
  };
}

function fila(id: string, estado: AsistenciaToma['estado'], parcial: Partial<AsistenciaToma> = {}): AsistenciaToma {
  return {
    estudianteId: id, nombreCompleto: `Estudiante ${id}`, estado,
    registradoPorEstudiante: false, fechaRegistroUtc: estado ? '2026-11-10T13:05:00Z' : null, ...parcial,
  };
}

function pagina(elementos: AsistenciaToma[], numeroPagina = 1, totalPaginas = 1) {
  return { exitoso: true, elementos, numeroPagina, tamanoPagina: 100, totalElementos: elementos.length, totalPaginas };
}

describe('TomaAsistenciasComponent (CULM-001 UX toma)', () => {
  let fixture: ComponentFixture<TomaAsistenciasComponent>;
  let tomas: jasmine.SpyObj<TomaAsistenciaService>;

  const el = (id: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const boton = (id: string) => el(id) as HTMLButtonElement;
  const texto = (id: string) => (el(id)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const marcado = (id: string, estado: string) => el(`estado-${id}-${estado}`)!.getAttribute('aria-pressed') === 'true';

  function crear(opciones: { toma?: TomaAsistencia; ventanaAbierta?: boolean } = {}) {
    fixture = TestBed.createComponent(TomaAsistenciasComponent);
    fixture.componentRef.setInput('toma', opciones.toma ?? toma());
    fixture.componentRef.setInput('ventanaAbierta', opciones.ventanaAbierta ?? true);
    fixture.detectChanges();
    fixture.detectChanges();
  }

  const clic = (id: string) => {
    boton(id).click();
    fixture.detectChanges();
  };

  function confirmar(accion: 'confirmar' | 'cancelar') {
    (document.querySelector(`[data-accion="${accion}"]`) as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    tomas = jasmine.createSpyObj<TomaAsistenciaService>('TomaAsistenciaService', [
      'consultarAsistencias', 'registrarAsistencias', 'consultarFaltantes',
    ]);
    tomas.consultarAsistencias.and.returnValue(of(pagina([
      fila('a', 'AN', { registradoPorEstudiante: true }), fila('b', 'SJC'), fila('c', null),
    ])));
    tomas.consultarFaltantes.and.returnValue(of({ exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 100, totalElementos: 0, totalPaginas: 1 }));
    tomas.registrarAsistencias.and.returnValue(of({ exitoso: true, datos: { idToma: 't-1', idSesion: 's-1', totalRegistros: 1 } }));
    TestBed.configureTestingModule({
      imports: [TomaAsistenciasComponent],
      providers: [
        { provide: TomaAsistenciaService, useValue: tomas },
        { provide: RealtimeService, useValue: { listenType: () => NEVER } },
      ],
    });
  });

  afterEach(() => fixture?.destroy());

  it('lista a los estudiantes de SU toma con estado, origen y hora', () => {
    crear();
    expect(tomas.consultarAsistencias).toHaveBeenCalledWith('t-1', 1, 100);
    expect(texto('fila-a')).toContain('Estudiante a');
    expect(marcado('a', 'AN')).toBeTrue();
    expect(marcado('b', 'SJC')).toBeTrue();
    expect(texto('fila-c')).toContain('Sin registro');
    expect(texto('origen-a')).toContain('QR / PIN');
    expect(texto('origen-b')).toContain('Manual');
    expect(el('origen-c')).toBeNull();
    expect(texto('hora-a')).not.toBe('');
  });

  it('B2-F-06 la cabecera de la toma muestra numero, modo, estado, horas y conteos', () => {
    crear({ toma: toma({ modo: 'QR', horasToma: 0.5, totalPresentes: 8, totalAusentes: 1, totalExcusas: 1 }) });
    const cabecera = texto('toma-t-1');
    expect(cabecera).toContain('Toma 1');
    expect(cabecera).toContain('Código QR');
    expect(cabecera).toContain('Abierta');
    expect(cabecera).toContain('0.5 h');
    expect(cabecera).toContain('8 presentes');
    expect(cabecera).toContain('1 ausentes');
    expect(cabecera).toContain('1 excusas');
  });

  it('recorre todas las paginas de la toma', () => {
    tomas.consultarAsistencias.and.callFake(((_t: string, p: number) =>
      of(p === 1 ? pagina([fila('a', 'AN')], 1, 2) : pagina([fila('b', 'AN')], 2, 2))) as never);
    crear();
    expect(el('fila-a')).not.toBeNull();
    expect(el('fila-b')).not.toBeNull();
  });

  it('muestra el contador de marcados sobre el total', () => {
    crear();
    expect(texto('contador-marcados')).toContain('2 de 3');
  });

  it('la barra de acciones es fija (sticky) y contiene Guardar arriba', () => {
    crear();
    expect(el('barra-acciones')!.className).toContain('sticky');
    expect(el('barra-acciones')!.contains(el('guardar-toma'))).toBeTrue();
  });

  it('Guardar queda deshabilitado sin cambios y sin indicador de pendientes', () => {
    crear();
    expect(boton('guardar-toma').disabled).toBeTrue();
    expect(texto('indicador-sin-guardar')).toContain('Todo guardado');
  });

  it('marcar un estudiante habilita Guardar, indica cambios sin guardar y emite el conteo', () => {
    crear();
    const conteos: number[] = [];
    fixture.componentInstance.sinGuardar.subscribe((n) => conteos.push(n));
    clic('estado-c-AN');
    expect(boton('guardar-toma').disabled).toBeFalse();
    expect(texto('indicador-sin-guardar')).toContain('1 sin guardar');
    expect(texto('contador-marcados')).toContain('3 de 3');
    expect(conteos.at(-1)).toBe(1);
  });

  it('volver al estado guardado deja de contar como cambio', () => {
    crear();
    clic('estado-b-AN');
    expect(boton('guardar-toma').disabled).toBeFalse();
    clic('estado-b-SJC');
    expect(texto('indicador-sin-guardar')).toContain('Todo guardado');
  });

  it('"Marcar todos presentes" sin sobrescribir marcas aplica sin confirmar y deja Guardar habilitado arriba', () => {
    tomas.consultarAsistencias.and.returnValue(of(pagina([fila('a', null), fila('b', null)])));
    crear();
    clic('marcar-todos-presentes');
    expect(document.querySelector('[data-accion="confirmar"]')).toBeNull();
    expect(marcado('a', 'AN')).toBeTrue();
    expect(marcado('b', 'AN')).toBeTrue();
    expect(texto('indicador-sin-guardar')).toContain('2 sin guardar');
    expect(boton('guardar-toma').disabled).toBeFalse();
  });

  it('"Marcar todos presentes" pide confirmacion si sobrescribe una falta, y respeta las excusas', () => {
    tomas.consultarAsistencias.and.returnValue(of(pagina([fila('a', 'SJC'), fila('b', 'EX'), fila('c', null)])));
    crear();
    clic('marcar-todos-presentes');
    expect(document.querySelector('[data-accion="confirmar"]')).not.toBeNull();
    expect(marcado('a', 'AN')).toBeFalse();
    confirmar('confirmar');
    expect(marcado('a', 'AN')).toBeTrue();
    expect(marcado('c', 'AN')).toBeTrue();
    expect(marcado('b', 'EX')).toBeTrue();
  });

  it('cancelar la confirmacion no cambia nada', () => {
    tomas.consultarAsistencias.and.returnValue(of(pagina([fila('a', 'SJC')])));
    crear();
    clic('marcar-todos-presentes');
    confirmar('cancelar');
    expect(marcado('a', 'SJC')).toBeTrue();
    expect(texto('indicador-sin-guardar')).toContain('Todo guardado');
  });

  it('"Marcar faltantes" confirma y marca falta solo a quienes no tienen registro', () => {
    crear();
    clic('marcar-faltantes');
    expect(document.querySelector('[data-accion="confirmar"]')).not.toBeNull();
    confirmar('confirmar');
    expect(marcado('c', 'SJC')).toBeTrue();
    expect(marcado('a', 'AN')).toBeTrue();
    expect(texto('indicador-sin-guardar')).toContain('1 sin guardar');
  });

  it('"Marcar faltantes" sin estudiantes sin registro avisa y no abre confirmacion', () => {
    tomas.consultarAsistencias.and.returnValue(of(pagina([fila('a', 'AN')])));
    crear();
    const avisos: string[] = [];
    fixture.componentInstance.notificacion.subscribe((n) => avisos.push(n.tipo));
    clic('marcar-faltantes');
    expect(document.querySelector('[data-accion="confirmar"]')).toBeNull();
    expect(avisos).toEqual(['info']);
  });

  it('Guardar envia solo los cambios al lote de la toma, limpia pendientes y notifica con el mensaje del backend', () => {
    tomas.registrarAsistencias.and.returnValue(of({
      exitoso: true, mensajeUsuario: 'Asistencia de la toma guardada.', datos: { idToma: 't-1', idSesion: 's-1', totalRegistros: 2 },
    }));
    crear();
    const eventos: string[] = [];
    let actualizado = 0;
    fixture.componentInstance.notificacion.subscribe((n) => eventos.push(`${n.tipo}:${n.texto}`));
    fixture.componentInstance.actualizado.subscribe(() => actualizado++);
    clic('estado-c-AN');
    clic('estado-b-AN');
    clic('guardar-toma');
    expect(tomas.registrarAsistencias).toHaveBeenCalledOnceWith('t-1', [
      { estudianteId: 'b', estado: 'AN' }, { estudianteId: 'c', estado: 'AN' },
    ]);
    expect(texto('indicador-sin-guardar')).toContain('Todo guardado');
    expect(eventos).toEqual(['success:Asistencia de la toma guardada.']);
    expect(actualizado).toBe(1);
    expect(marcado('c', 'AN')).toBeTrue();
  });

  it('el Guardar del final de la lista hace lo mismo que el de arriba', () => {
    crear();
    clic('estado-c-AN');
    clic('guardar-toma-final');
    expect(tomas.registrarAsistencias).toHaveBeenCalledOnceWith('t-1', [{ estudianteId: 'c', estado: 'AN' }]);
  });

  it('divide el guardado en lotes de 200 registros (maximo del contrato)', () => {
    const muchos = Array.from({ length: 201 }, (_, i) => fila(`e${i}`, null));
    tomas.consultarAsistencias.and.returnValue(of(pagina(muchos)));
    crear();
    clic('marcar-todos-presentes');
    clic('guardar-toma');
    expect(tomas.registrarAsistencias).toHaveBeenCalledTimes(2);
    expect(tomas.registrarAsistencias.calls.argsFor(0)[1].length).toBe(200);
    expect(tomas.registrarAsistencias.calls.argsFor(1)[1].length).toBe(1);
  });

  it('un error al guardar muestra el mensaje del backend y conserva los cambios', () => {
    tomas.registrarAsistencias.and.returnValue(throwError(() => apiHttpError(400, 'Estado inválido.', 'ATT_001')));
    crear();
    const avisos: string[] = [];
    fixture.componentInstance.notificacion.subscribe((n) => avisos.push(`${n.tipo}:${n.texto}`));
    clic('estado-c-AN');
    clic('guardar-toma');
    expect(avisos).toEqual(['error:Estado inválido.']);
    expect(texto('indicador-sin-guardar')).toContain('1 sin guardar');
  });

  it('un 409 de ventana descarta los cambios, avisa con el mensaje del backend y pide recargar las tomas', () => {
    tomas.registrarAsistencias.and.returnValue(throwError(() => apiHttpError(409, 'La sesión ya cerró.', 'ERR_SESION_CERRADA')));
    crear();
    let actualizado = 0;
    const avisos: string[] = [];
    fixture.componentInstance.actualizado.subscribe(() => actualizado++);
    fixture.componentInstance.notificacion.subscribe((n) => avisos.push(`${n.tipo}:${n.texto}`));
    clic('estado-c-AN');
    clic('guardar-toma');
    expect(avisos).toEqual(['error:La sesión ya cerró.']);
    expect(actualizado).toBe(1);
    expect(texto('indicador-sin-guardar')).toContain('Todo guardado');
  });

  it('con la ventana cerrada los controles se deshabilitan y se explica por que', () => {
    crear({ ventanaAbierta: false });
    expect(boton('marcar-todos-presentes').disabled).toBeTrue();
    expect(boton('marcar-faltantes').disabled).toBeTrue();
    expect(boton('estado-c-AN').disabled).toBeTrue();
    expect(boton('guardar-toma').disabled).toBeTrue();
    expect(el('toma-ventana-cerrada')).not.toBeNull();
  });

  it('si la ventana se cierra con cambios sin guardar, los descarta y avisa', () => {
    crear();
    const avisos: string[] = [];
    fixture.componentInstance.notificacion.subscribe((n) => avisos.push(n.tipo));
    clic('estado-c-AN');
    fixture.componentRef.setInput('ventanaAbierta', false);
    fixture.detectChanges();
    expect(texto('indicador-sin-guardar')).toContain('Todo guardado');
    expect(avisos).toEqual(['warning']);
  });

  it('filtra por nombre y por estado', () => {
    crear();
    const buscar = el('buscar-estudiante') as HTMLInputElement;
    buscar.value = 'estudiante b';
    buscar.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(el('fila-a')).toBeNull();
    expect(el('fila-b')).not.toBeNull();
    buscar.value = '';
    buscar.dispatchEvent(new Event('input'));
    clic('filtro-SIN');
    expect(el('fila-a')).toBeNull();
    expect(el('fila-c')).not.toBeNull();
    clic('filtro-TODOS');
    expect(el('fila-a')).not.toBeNull();
  });

  it('un cambio de toma del backend recarga la lista y conserva lo marcado sin guardar', () => {
    crear();
    clic('estado-c-AN');
    tomas.consultarAsistencias.calls.reset();
    fixture.componentRef.setInput('toma', toma({ totalPresentes: 2 }));
    fixture.detectChanges();
    expect(tomas.consultarAsistencias).toHaveBeenCalledTimes(1);
    expect(marcado('c', 'AN')).toBeTrue();
    expect(texto('indicador-sin-guardar')).toContain('1 sin guardar');
  });

  it('si el servidor ya trae lo que el docente marco, deja de contarlo como pendiente', () => {
    crear();
    clic('estado-c-AN');
    tomas.consultarAsistencias.and.returnValue(of(pagina([fila('a', 'AN'), fila('b', 'SJC'), fila('c', 'AN')])));
    fixture.componentRef.setInput('toma', toma({ totalPresentes: 3 }));
    fixture.detectChanges();
    expect(texto('indicador-sin-guardar')).toContain('Todo guardado');
  });

  it('un error al cargar muestra el mensaje del backend', () => {
    tomas.consultarAsistencias.and.returnValue(throwError(() => apiHttpError(403, 'No es titular.', 'SEC_002')));
    crear();
    expect(texto('toma-error')).toContain('No es titular.');
  });

  it('una toma QR abierta ofrece proyectar QR / PIN, deshabilitado con la ventana cerrada', () => {
    crear({ toma: toma({ modo: 'QR' }) });
    const proyecciones: TomaAsistencia[] = [];
    fixture.componentInstance.proyectarQr.subscribe((t) => proyecciones.push(t));
    clic('proyectar-qr');
    expect(proyecciones.map((t) => t.idToma)).toEqual(['t-1']);
    fixture.destroy();
    crear({ toma: toma({ modo: 'QR' }), ventanaAbierta: false });
    expect(boton('proyectar-qr').disabled).toBeTrue();
  });

  it('una toma manual no ofrece proyectar y una cerrada tampoco ofrece cerrar', () => {
    crear();
    expect(el('proyectar-qr')).toBeNull();
    expect(el('cerrar-toma')).not.toBeNull();
    fixture.destroy();
    crear({ toma: toma({ modo: 'QR', estado: 'CERRADA' }) });
    expect(el('proyectar-qr')).toBeNull();
    expect(el('cerrar-toma')).toBeNull();
  });

  it('Cerrar toma emite la toma para que el contenedor pida la confirmacion', () => {
    crear();
    const cierres: string[] = [];
    fixture.componentInstance.cerrarToma.subscribe((t) => cierres.push(t.idToma));
    clic('cerrar-toma');
    expect(cierres).toEqual(['t-1']);
  });

  it('en una toma manual abierta no muestra pendientes de validar; en una QR o cerrada si', () => {
    crear();
    expect(el('seccion-pendientes')).toBeNull();
    fixture.destroy();
    crear({ toma: toma({ modo: 'QR' }) });
    expect(el('seccion-pendientes')).not.toBeNull();
    fixture.destroy();
    crear({ toma: toma({ estado: 'CERRADA' }) });
    expect(el('seccion-pendientes')).not.toBeNull();
  });

  it('el componente no usa setInterval', () => {
    const intervalo = spyOn(window, 'setInterval').and.callThrough();
    crear();
    expect(intervalo).not.toHaveBeenCalled();
  });
});
