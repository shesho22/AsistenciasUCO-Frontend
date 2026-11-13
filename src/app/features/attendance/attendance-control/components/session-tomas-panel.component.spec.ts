import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { SessionTomasPanelComponent } from './session-tomas-panel.component';
import { TomaModoSelectorComponent } from './toma-modo-selector.component';
import { TomaCierreDialogComponent } from './toma-cierre-dialog.component';
import { AsistenciaToma, TomaAsistencia, TomasSesion } from '../../../../core/models/toma-asistencia.model';
import { TomaAsistenciaService } from '../../../../core/services/toma-asistencia.service';
import { RealtimeService } from '../../../../core/realtime/realtime.service';

function toma(parcial: Partial<TomaAsistencia> = {}): TomaAsistencia {
  return {
    idToma: 't-1', idSesion: 's-1', idGrupo: 'g-1', numero: 1, modo: 'MANUAL', estado: 'CERRADA',
    esImplicita: false, fechaAperturaUtc: '2026-11-10T13:00:00Z', fechaCierreUtc: '2026-11-10T14:00:00Z',
    horasToma: 1, fechaPuntoControlUtc: '2026-11-10T13:00:00Z', ordenPuntoControl: 1, minutosTramoAnterior: 0, minutosTramoSiguiente: 60, esEditable: true, editableHastaUtc: null,
    totalRegistros: 10, totalPresentes: 8, totalAusentes: 1, totalExcusas: 1, tieneQrActivo: false,
    ...parcial,
  };
}

function tomasSesion(parcial: Partial<TomasSesion> = {}): TomasSesion {
  return {
    idSesion: 's-1', estado: 'PROGRAMADA', cancelacion: null,
    ventana: { aperturaUtc: '2026-11-10T12:50:00Z', cierreUtc: '2026-11-10T15:15:00Z', abierta: true },
    horasSesion: 2, maximoTomas: 4, tomas: [], ...parcial,
  };
}

describe('SessionTomasPanelComponent (CULM-001 B.2 + UX toma)', () => {
  let fixture: ComponentFixture<SessionTomasPanelComponent>;
  let service: jasmine.SpyObj<TomaAsistenciaService>;
  const el = (id: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const boton = (id: string) => el(id) as HTMLButtonElement;
  const texto = (id: string) => (el(id)?.textContent ?? '').replace(/\s+/g, ' ').trim();

  function render(datos: TomasSesion | null, extra: { abriendo?: boolean } = {}) {
    fixture = TestBed.createComponent(SessionTomasPanelComponent);
    fixture.componentRef.setInput('tomasSesion', datos);
    fixture.componentRef.setInput('abriendo', extra.abriendo ?? false);
    fixture.detectChanges();
    fixture.detectChanges();
  }

  const pagina = (elementos: AsistenciaToma[]) =>
    ({ exitoso: true, elementos, numeroPagina: 1, tamanoPagina: 100, totalElementos: elementos.length, totalPaginas: 1 });
  const alumno = (id: string, estado: AsistenciaToma['estado']): AsistenciaToma =>
    ({ estudianteId: id, nombreCompleto: `Estudiante ${id}`, estado, registradoPorEstudiante: false, fechaRegistroUtc: null });

  beforeEach(() => {
    service = jasmine.createSpyObj<TomaAsistenciaService>('TomaAsistenciaService', [
      'consultarAsistencias', 'consultarFaltantes', 'registrarAsistencias', 'consultarResumenSesion',
    ]);
    service.consultarResumenSesion.and.returnValue(of({
      exitoso: true,
      datos: [
        { estudianteId: 'a', nombreCompleto: 'Alumno a', minutosSesion: 120, minutosAsistidos: 0, minutosFalta: 120, minutosExcusa: 0, minutosSinRegistro: 0, estado: 'AUSENTE', tomasAusentes: 2 },
        { estudianteId: 'b', nombreCompleto: 'Alumno b', minutosSesion: 120, minutosAsistidos: 120, minutosFalta: 0, minutosExcusa: 0, minutosSinRegistro: 0, estado: 'PRESENTE', tomasAusentes: 0 },
      ],
    }));
    service.consultarAsistencias.and.returnValue(of(pagina([alumno('a', null), alumno('b', 'AN')])));
    service.consultarFaltantes.and.returnValue(of({ exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 100, totalElementos: 0, totalPaginas: 1 }));
    TestBed.configureTestingModule({
      imports: [SessionTomasPanelComponent],
      providers: [
        { provide: TomaAsistenciaService, useValue: service },
        { provide: RealtimeService, useValue: { listenType: () => NEVER } },
      ],
    });
  });

  afterEach(() => fixture?.destroy());

  it('UX-toma con una sola toma muestra su lista directamente, sin pestanas', () => {
    render(tomasSesion({ tomas: [toma({ estado: 'ABIERTA' })] }));
    expect(el('tabs-tomas')).toBeNull();
    expect(el('toma-t-1')).not.toBeNull();
    expect(el('fila-a')).not.toBeNull();
    expect(el('tabpanel-t-1')!.hidden).toBeFalse();
  });

  it('UX-toma con varias tomas muestra una pestana por toma mas el resumen, y la toma abierta es la activa', () => {
    render(tomasSesion({ tomas: [toma(), toma({ idToma: 't-2', numero: 2, estado: 'ABIERTA', modo: 'QR' })] }));
    expect(el('tabs-tomas')!.getAttribute('role')).toBe('tablist');
    expect(texto('tab-t-1')).toContain('Toma 1');
    expect(texto('tab-t-2')).toContain('Toma 2');
    expect(texto('tab-resumen')).toContain('Resumen de la sesión');
    expect(el('tab-t-2')!.getAttribute('aria-selected')).toBe('true');
    expect(el('tabpanel-t-1')!.hidden).toBeTrue();
    expect(el('tabpanel-t-2')!.hidden).toBeFalse();
  });

  it('UX-toma sin toma abierta la activa es la mas reciente', () => {
    render(tomasSesion({ tomas: [toma(), toma({ idToma: 't-2', numero: 2 })] }));
    expect(el('tab-t-2')!.getAttribute('aria-selected')).toBe('true');
  });

  it('UX-toma cada toma consulta SU propia lista', () => {
    render(tomasSesion({ tomas: [toma(), toma({ idToma: 't-2', numero: 2 })] }));
    expect(service.consultarAsistencias).toHaveBeenCalledWith('t-1', 1, 100);
    expect(service.consultarAsistencias).toHaveBeenCalledWith('t-2', 1, 100);
  });

  it('UX-toma cambiar de pestana muestra la otra toma sin perder lo marcado sin guardar', () => {
    render(tomasSesion({ tomas: [toma(), toma({ idToma: 't-2', numero: 2, estado: 'ABIERTA' })] }));
    const enT2 = (id: string) => el('tabpanel-t-2')!.querySelector(`[data-testid="${id}"]`) as HTMLElement;
    enT2('estado-a-AN').click();
    fixture.detectChanges();
    boton('tab-t-1').click();
    fixture.detectChanges();
    expect(el('tabpanel-t-1')!.hidden).toBeFalse();
    expect(el('tabpanel-t-2')!.hidden).toBeTrue();
    boton('tab-t-2').click();
    fixture.detectChanges();
    expect(enT2('indicador-sin-guardar').textContent).toContain('1 sin guardar');
  });

  it('UX-toma la pestana de una toma con cambios sin guardar lo indica', () => {
    render(tomasSesion({ tomas: [toma(), toma({ idToma: 't-2', numero: 2, estado: 'ABIERTA' })] }));
    expect(el('tab-sin-guardar-t-2')).toBeNull();
    (el('tabpanel-t-2')!.querySelector('[data-testid="estado-a-AN"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el('tab-sin-guardar-t-2')).not.toBeNull();
    expect(el('tab-sin-guardar-t-1')).toBeNull();
  });

  it('UX-toma la pestana Resumen muestra la matriz estudiante x toma', () => {
    render(tomasSesion({ tomas: [toma(), toma({ idToma: 't-2', numero: 2 })] }));
    expect(el('tabpanel-resumen')).toBeNull();
    boton('tab-resumen').click();
    fixture.detectChanges();
    fixture.detectChanges();
    expect(el('tabpanel-resumen')).not.toBeNull();
    expect(el('celda-b-t-1')!.getAttribute('data-estado')).toBe('AN');
    expect(el('tab-resumen')!.getAttribute('aria-selected')).toBe('true');
  });

  it('UX-toma al abrirse una toma nueva pasa a ser la activa', () => {
    render(tomasSesion({ tomas: [toma(), toma({ idToma: 't-2', numero: 2 })] }));
    boton('tab-t-1').click();
    fixture.detectChanges();
    fixture.componentRef.setInput('tomasSesion', tomasSesion({
      tomas: [toma(), toma({ idToma: 't-2', numero: 2 }), toma({ idToma: 't-3', numero: 3, estado: 'ABIERTA' })],
    }));
    fixture.detectChanges();
    expect(el('tab-t-3')!.getAttribute('aria-selected')).toBe('true');
  });

  it('UX-toma las pestanas se desplazan solas en movil (overflow-x-auto) y miden 44 px', () => {
    render(tomasSesion({ tomas: [toma(), toma({ idToma: 't-2', numero: 2 })] }));
    expect(el('tabs-tomas')!.className).toContain('overflow-x-auto');
    expect(el('tab-t-1')!.className).toContain('min-h-[44px]');
  });

  it('UX-toma sin tomas explica que aun no hay ninguna', () => {
    render(tomasSesion({ tomas: [] }));
    expect(el('sin-tomas')).not.toBeNull();
    expect(el('tabs-tomas')).toBeNull();
  });

  it('UX-toma una toma que el backend marca como no editable bloquea la edicion', () => {
    render(tomasSesion({ tomas: [toma({ estado: 'CERRADA', esEditable: false })] }));
    expect(boton('marcar-todos-presentes').disabled).toBeTrue();
    expect(el('toma-aviso-edicion')).not.toBeNull();
  });

  it('muestra la linea de tiempo de los puntos de control con la hora de cada toma', () => {
    render(tomasSesion({ tomas: [toma(), toma({ idToma: 't-2', numero: 2 })] }));
    expect(texto('linea-puntos-control')).toMatch(/Toma 1 a las \d{2}:\d{2} · Toma 2 a las \d{2}:\d{2}\./);
  });

  it('el tope de tomas usa el maximo informado por el backend', () => {
    const tomas = Array.from({ length: 20 }, (_, i) => toma({ idToma: `t-${i + 1}`, numero: i + 1, estado: 'CERRADA' }));
    render(tomasSesion({ tomas, maximoTomas: 20 }));
    expect(boton('nueva-toma').disabled).toBeTrue();
    expect(texto('nueva-toma-motivo')).toContain('máximo de 20 tomas');
  });

  it('UX-toma re-emite proyectar, cerrar, actualizado y notificaciones de la toma', () => {
    service.registrarAsistencias.and.returnValue(of({ exitoso: true, mensajeUsuario: 'Guardado.', datos: { idToma: 't-1', idSesion: 's-1', totalRegistros: 1 } }));
    render(tomasSesion({ tomas: [toma({ estado: 'ABIERTA', modo: 'QR' })] }));
    const proyectar = jasmine.createSpy('proyectar');
    const cerrar = jasmine.createSpy('cerrar');
    const actualizado = jasmine.createSpy('actualizado');
    const aviso = jasmine.createSpy('aviso');
    fixture.componentInstance.proyectarQr.subscribe(proyectar);
    fixture.componentInstance.cerrarToma.subscribe(cerrar);
    fixture.componentInstance.actualizado.subscribe(actualizado);
    fixture.componentInstance.notificacion.subscribe(aviso);
    const triggerMenu = (): HTMLButtonElement =>
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="action-menu-trigger"]')!;
    triggerMenu().click();
    fixture.detectChanges();
    boton('proyectar-qr').click();
    fixture.detectChanges();
    triggerMenu().click();
    fixture.detectChanges();
    boton('cerrar-toma').click();
    boton('estado-a-AN').click();
    fixture.detectChanges();
    boton('guardar-toma').click();
    expect(proyectar).toHaveBeenCalledWith(jasmine.objectContaining({ idToma: 't-1' }));
    expect(cerrar).toHaveBeenCalledWith(jasmine.objectContaining({ idToma: 't-1' }));
    expect(actualizado).toHaveBeenCalledTimes(1);
    expect(aviso).toHaveBeenCalledWith({ tipo: 'success', texto: 'Guardado.' });
  });

  it('B2-F-06 Nueva toma esta habilitada con ventana abierta, sin toma abierta y bajo el maximo', () => {
    render(tomasSesion({ tomas: [toma()] }));
    expect(boton('nueva-toma').disabled).toBeFalse();
    expect(el('nueva-toma-motivo')).toBeNull();
  });

  it('B2-F-06 Nueva toma se deshabilita con el motivo si hay una toma abierta', () => {
    render(tomasSesion({ tomas: [toma({ estado: 'ABIERTA' })] }));
    expect(boton('nueva-toma').disabled).toBeTrue();
    expect(el('nueva-toma-motivo')!.textContent).toContain('toma abierta');
  });

  it('B2-F-06 Nueva toma se deshabilita al alcanzar maximoTomas', () => {
    const tomas = [1, 2, 3, 4].map((n) => toma({ idToma: `t-${n}`, numero: n }));
    render(tomasSesion({ tomas, maximoTomas: 4 }));
    expect(boton('nueva-toma').disabled).toBeTrue();
    expect(el('nueva-toma-motivo')!.textContent).toContain('4');
  });

  it('B2-F-06 Nueva toma se deshabilita con la ventana cerrada', () => {
    render(tomasSesion({ ventana: { aperturaUtc: null, cierreUtc: null, abierta: false } }));
    expect(boton('nueva-toma').disabled).toBeTrue();
    expect(el('nueva-toma-motivo')!.textContent).toContain('ventana');
  });

  it('B2-F-06 con la sesion cancelada no se puede abrir una toma y se muestra la etiqueta', () => {
    render(tomasSesion({ estado: 'CANCELADA', cancelacion: { tipo: 'FESTIVO', motivo: null, nombreFestivo: 'Todos los Santos', fechaCancelacionUtc: null } }));
    expect(boton('nueva-toma').disabled).toBeTrue();
    expect(el('panel-tomas')!.textContent).toContain('Cancelada');
    expect(el('panel-tomas')!.textContent).toContain('Todos los Santos');
  });

  it('B2-F-06 Nueva toma emite nuevaToma cuando esta habilitada', () => {
    const nueva = jasmine.createSpy('nueva');
    render(tomasSesion());
    fixture.componentInstance.nuevaToma.subscribe(nueva);
    boton('nueva-toma').click();
    expect(nueva).toHaveBeenCalledTimes(1);
  });

  it('B2-F-06 sin datos todavia muestra el estado de carga', () => {
    render(null);
    expect(el('panel-tomas-cargando')).not.toBeNull();
    expect(el('nueva-toma')).toBeNull();
  });
});

describe('TomaModoSelectorComponent (CULM-001 B.2)', () => {
  it('B2-F-07 ofrece dos tarjetas grandes: Manual y Código QR, con objetivos tactiles de 44 px', () => {
    const fixture = TestBed.configureTestingModule({ imports: [TomaModoSelectorComponent] }).createComponent(TomaModoSelectorComponent);
    fixture.detectChanges();
    const manual = fixture.nativeElement.querySelector('[data-testid="modo-manual"]') as HTMLButtonElement;
    const qr = fixture.nativeElement.querySelector('[data-testid="modo-qr"]') as HTMLButtonElement;
    expect(manual.textContent).toContain('Manual');
    expect(qr.textContent).toContain('Código QR');
    expect(manual.className).toContain('min-h-[44px]');
    expect(qr.className).toContain('min-h-[44px]');
  });

  it('B2-F-07 emite el modo elegido y permite cancelar', () => {
    const fixture = TestBed.configureTestingModule({ imports: [TomaModoSelectorComponent] }).createComponent(TomaModoSelectorComponent);
    fixture.detectChanges();
    const elegido = jasmine.createSpy('elegido');
    const cancelar = jasmine.createSpy('cancelar');
    fixture.componentInstance.modoElegido.subscribe(elegido);
    fixture.componentInstance.cancelar.subscribe(cancelar);

    (fixture.nativeElement.querySelector('[data-testid="modo-manual"]') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('[data-testid="modo-qr"]') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('[data-testid="modo-cancelar"]') as HTMLButtonElement).click();
    expect(elegido.calls.allArgs()).toEqual([['MANUAL'], ['QR']]);
    expect(cancelar).toHaveBeenCalledTimes(1);
  });

  it('B2-F-07 con el interruptor sessionQrEnabled apagado deshabilita la tarjeta QR', () => {
    const fixture = TestBed.configureTestingModule({ imports: [TomaModoSelectorComponent] }).createComponent(TomaModoSelectorComponent);
    fixture.componentRef.setInput('qrHabilitado', false);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('[data-testid="modo-qr"]') as HTMLButtonElement).disabled).toBeTrue();
  });
});

describe('TomaCierreDialogComponent (CULM-001 B.2)', () => {
  it('B2-F-08 avisa que los no marcados quedan ausentes y confirma con marcarAusentes=true', () => {
    const fixture = TestBed.configureTestingModule({ imports: [TomaCierreDialogComponent] }).createComponent(TomaCierreDialogComponent);
    fixture.componentRef.setInput('numeroToma', 2);
    fixture.detectChanges();
    const confirmar = jasmine.createSpy('confirmar');
    const cancelar = jasmine.createSpy('cancelar');
    fixture.componentInstance.confirmar.subscribe(confirmar);
    fixture.componentInstance.cancelar.subscribe(cancelar);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('no estén marcados quedan ausentes');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('hasta que abras la siguiente toma');
    (fixture.nativeElement.querySelector('[data-testid="cierre-confirmar"]') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('[data-testid="cierre-cancelar"]') as HTMLButtonElement).click();
    expect(confirmar).toHaveBeenCalledOnceWith(true);
    expect(cancelar).toHaveBeenCalledTimes(1);
  });
});
