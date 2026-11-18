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

  it('ATA: en pantallas medianas y grandes las pestanas pasan a otra fila en vez de quedar cortadas', () => {
    render(tomasSesion({ tomas: [toma(), toma({ idToma: 't-2', numero: 2 })] }));
    const clases = el('tabs-tomas')!.className;
    expect(clases).toContain('sm:flex-wrap');
    expect(clases).toContain('sm:overflow-visible');
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

  describe('VAL PRU-11: borde del tope de tomas (MAXIMO_TOMAS_POR_SESION = 20)', () => {
    const cerradas = (n: number) =>
      Array.from({ length: n }, (_, i) => toma({ idToma: `t-${i + 1}`, numero: i + 1, estado: 'CERRADA' }));

    it('con 19 de 20 tomas cerradas aun se puede abrir la toma 20', () => {
      render(tomasSesion({ tomas: cerradas(19), maximoTomas: 20 }));
      expect(boton('nueva-toma').disabled).toBeFalse();
      expect(el('nueva-toma-motivo')).toBeNull();
      expect(((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ')).toContain('19 de 20 tomas');
    });

    it('con 20 de 20 la toma 21 queda bloqueada con el motivo del tope', () => {
      render(tomasSesion({ tomas: cerradas(20), maximoTomas: 20 }));
      expect(boton('nueva-toma').disabled).toBeTrue();
      expect(texto('nueva-toma-motivo')).toBe('Se alcanzó el máximo de 20 tomas por sesión.');
    });

    it('si el parametro baja por debajo de las tomas existentes (21 de 20) sigue bloqueada', () => {
      render(tomasSesion({ tomas: cerradas(21), maximoTomas: 20 }));
      expect(boton('nueva-toma').disabled).toBeTrue();
      expect(texto('nueva-toma-motivo')).toContain('máximo de 20 tomas');
    });
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

  it('ATA D9 Nueva toma sigue habilitada con una toma abierta y ya no pide cerrarla antes', () => {
    render(tomasSesion({ tomas: [toma({ estado: 'ABIERTA' })] }));
    expect(boton('nueva-toma').disabled).toBeFalse();
    expect(el('nueva-toma-motivo')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('ciérrala para abrir otra');
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

  describe('ATA D9: Nueva toma con una toma abierta pide confirmacion y la cierra', () => {
    const abierta = (n = 2) => tomasSesion({ tomas: [toma(), toma({ idToma: 't-2', numero: n, estado: 'ABIERTA' })] });

    it('con una toma abierta pide confirmacion con el texto del addendum y no emite todavia', () => {
      const nueva = jasmine.createSpy('nueva');
      render(abierta());
      fixture.componentInstance.nuevaToma.subscribe(nueva);
      boton('nueva-toma').click();
      fixture.detectChanges();
      expect(nueva).not.toHaveBeenCalled();
      expect(texto('nueva-toma-dialogo')).toContain(
        'Se cerrará la toma 2: quien no tenga marca quedará con falta. Podrás corregirla hasta que termine la sesión.');
      expect(boton('cierre-confirmar')).not.toBeNull();
    });

    it('confirmar emite nuevaToma una vez y cierra el dialogo', () => {
      const nueva = jasmine.createSpy('nueva');
      render(abierta());
      fixture.componentInstance.nuevaToma.subscribe(nueva);
      boton('nueva-toma').click();
      fixture.detectChanges();
      boton('cierre-confirmar').click();
      fixture.detectChanges();
      expect(nueva).toHaveBeenCalledTimes(1);
      expect(el('nueva-toma-dialogo')).toBeNull();
    });

    it('cancelar cierra el dialogo sin emitir', () => {
      const nueva = jasmine.createSpy('nueva');
      render(abierta());
      fixture.componentInstance.nuevaToma.subscribe(nueva);
      boton('nueva-toma').click();
      fixture.detectChanges();
      boton('cierre-cancelar').click();
      fixture.detectChanges();
      expect(nueva).not.toHaveBeenCalled();
      expect(el('nueva-toma-dialogo')).toBeNull();
    });

    it('si la toma abierta tiene cambios sin guardar lo dice y no deja confirmar', () => {
      const nueva = jasmine.createSpy('nueva');
      render(abierta());
      fixture.componentInstance.nuevaToma.subscribe(nueva);
      (el('tabpanel-t-2')!.querySelector('[data-testid="estado-a-AN"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      boton('nueva-toma').click();
      fixture.detectChanges();
      expect(texto('nueva-toma-dialogo')).toContain('cambios sin guardar');
      expect(el('cierre-confirmar')).toBeNull();
      expect(nueva).not.toHaveBeenCalled();
    });

    it('al guardar o descartar los cambios con el dialogo abierto se habilita confirmar', () => {
      render(abierta());
      const panel = fixture.componentInstance as unknown as { registrarSinGuardar(id: string, n: number): void };
      panel.registrarSinGuardar('t-2', 2);
      fixture.detectChanges();
      boton('nueva-toma').click();
      fixture.detectChanges();
      expect(el('cierre-confirmar')).toBeNull();
      panel.registrarSinGuardar('t-2', 0);
      fixture.detectChanges();
      expect(el('cierre-confirmar')).not.toBeNull();
    });

    it('los cambios sin guardar de una toma cerrada no bloquean', () => {
      render(abierta());
      const panel = fixture.componentInstance as unknown as { registrarSinGuardar(id: string, n: number): void };
      panel.registrarSinGuardar('t-1', 3);
      fixture.detectChanges();
      boton('nueva-toma').click();
      fixture.detectChanges();
      expect(el('cierre-confirmar')).not.toBeNull();
    });

    it('si la toma abierta desaparece con el dialogo abierto, el dialogo se retira', () => {
      render(abierta());
      boton('nueva-toma').click();
      fixture.detectChanges();
      fixture.componentRef.setInput('tomasSesion', tomasSesion({ tomas: [toma(), toma({ idToma: 't-2', numero: 2 })] }));
      fixture.detectChanges();
      expect(el('nueva-toma-dialogo')).toBeNull();
    });
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
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('mientras la sesión siga abierta');
    (fixture.nativeElement.querySelector('[data-testid="cierre-confirmar"]') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('[data-testid="cierre-cancelar"]') as HTMLButtonElement).click();
    expect(confirmar).toHaveBeenCalledOnceWith(true);
    expect(cancelar).toHaveBeenCalledTimes(1);
  });
});

describe('TomaCierreDialogComponent modo nueva toma (ATA D9)', () => {
  function crear(sinGuardar: boolean) {
    const fixture = TestBed.configureTestingModule({ imports: [TomaCierreDialogComponent] }).createComponent(TomaCierreDialogComponent);
    fixture.componentRef.setInput('modo', 'nueva');
    fixture.componentRef.setInput('numeroToma', 3);
    fixture.componentRef.setInput('sinGuardar', sinGuardar);
    fixture.detectChanges();
    return fixture;
  }

  it('muestra el aviso de cierre y confirma', () => {
    const fixture = crear(false);
    const confirmar = jasmine.createSpy('confirmar');
    fixture.componentInstance.confirmar.subscribe(confirmar);
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Se cerrará la toma 3: quien no tenga marca quedará con falta.');
    expect(html.textContent).toContain('Podrás corregirla hasta que termine la sesión.');
    (html.querySelector('[data-testid="cierre-confirmar"]') as HTMLButtonElement).click();
    expect(confirmar).toHaveBeenCalledOnceWith(true);
  });

  it('con cambios sin guardar lo advierte y solo deja volver', () => {
    const fixture = crear(true);
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('La toma 3 tiene cambios sin guardar');
    expect(html.querySelector('[data-testid="cierre-confirmar"]')).toBeNull();
    expect(html.querySelector('[data-testid="cierre-cancelar"]')).not.toBeNull();
  });
});

describe('SessionTomasPanelComponent: recordatorio de cierre (ATA F)', () => {
  let fixture: ComponentFixture<SessionTomasPanelComponent>;
  const el = (id: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const texto = (id: string) => (el(id)?.textContent ?? '').replace(/\s+/g, ' ').trim();

  function render(datos: TomasSesion): void {
    fixture = TestBed.createComponent(SessionTomasPanelComponent);
    fixture.componentRef.setInput('tomasSesion', datos);
    fixture.detectChanges();
    fixture.detectChanges();
  }

  const sesion = (parcial: Partial<TomasSesion> = {}, cierreUtc: string | null = '2026-11-10T15:00:00Z', abierta = true): TomasSesion =>
    tomasSesion({ ventana: { aperturaUtc: '2026-11-10T13:00:00Z', cierreUtc, abierta }, tomas: [toma({ estado: 'ABIERTA' })], ...parcial });

  beforeEach(() => {
    const service = jasmine.createSpyObj<TomaAsistenciaService>('TomaAsistenciaService', [
      'consultarAsistencias', 'consultarFaltantes', 'registrarAsistencias', 'consultarResumenSesion',
    ]);
    service.consultarAsistencias.and.returnValue(of({ exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 100, totalElementos: 0, totalPaginas: 1 }));
    service.consultarFaltantes.and.returnValue(of({ exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 100, totalElementos: 0, totalPaginas: 1 }));
    TestBed.configureTestingModule({
      imports: [SessionTomasPanelComponent],
      providers: [
        { provide: TomaAsistenciaService, useValue: service },
        { provide: RealtimeService, useValue: { listenType: () => NEVER } },
      ],
    });
    jasmine.clock().install();
  });

  afterEach(() => {
    fixture?.destroy();
    jasmine.clock().uninstall();
  });

  it('con más de 15 min para el cierre no muestra el banner y lo activa justo 15 min antes del cierre', () => {
    jasmine.clock().mockDate(new Date('2026-11-10T14:00:00Z'));
    render(sesion());
    expect(el('recordatorio-cierre')).toBeNull();

    jasmine.clock().tick(45 * 60_000 - 1);
    fixture.detectChanges();
    expect(el('recordatorio-cierre')).toBeNull();

    jasmine.clock().tick(1);
    fixture.detectChanges();
    expect(el('recordatorio-cierre')).not.toBeNull();
    expect(texto('recordatorio-cierre')).toMatch(/^La sesión termina a las \d{2}:\d{2}: revisa y cierra las tomas\. Al terminar se cerrarán solas y quien no tenga registro quedará con falta\.$/);
  });

  it('con 15 min o menos para el cierre muestra el banner de inmediato', () => {
    jasmine.clock().mockDate(new Date('2026-11-10T14:45:00Z'));
    render(sesion());
    expect(el('recordatorio-cierre')).not.toBeNull();
  });

  it('con la ventana ya vencida, cerrada o sin hora de cierre válida no muestra el banner', () => {
    jasmine.clock().mockDate(new Date('2026-11-10T15:30:00Z'));
    render(sesion());
    expect(el('recordatorio-cierre')).toBeNull();
    fixture.componentRef.setInput('tomasSesion', sesion({}, '2026-11-10T15:40:00Z', false));
    fixture.detectChanges();
    expect(el('recordatorio-cierre')).toBeNull();
    fixture.componentRef.setInput('tomasSesion', sesion({}, null));
    fixture.detectChanges();
    expect(el('recordatorio-cierre')).toBeNull();
    fixture.componentRef.setInput('tomasSesion', sesion({}, 'no-es-fecha'));
    fixture.detectChanges();
    expect(el('recordatorio-cierre')).toBeNull();
  });

  it('una sesión cancelada no recuerda el cierre', () => {
    jasmine.clock().mockDate(new Date('2026-11-10T14:50:00Z'));
    render(sesion({ estado: 'CANCELADA' }));
    expect(el('recordatorio-cierre')).toBeNull();
  });

  it('un cierre lejano (más del máximo de setTimeout) no programa nada', () => {
    jasmine.clock().mockDate(new Date('2026-11-10T14:00:00Z'));
    render(sesion({}, '2027-12-30T15:00:00Z'));
    jasmine.clock().tick(60 * 60_000);
    fixture.detectChanges();
    expect(el('recordatorio-cierre')).toBeNull();
  });

  it('si el cierre cambia reprograma: el timer anterior se limpia y no activa el banner', () => {
    jasmine.clock().mockDate(new Date('2026-11-10T14:00:00Z'));
    render(sesion());
    fixture.componentRef.setInput('tomasSesion', sesion({}, '2026-11-10T16:00:00Z'));
    fixture.detectChanges();
    jasmine.clock().tick(45 * 60_000);
    fixture.detectChanges();
    expect(el('recordatorio-cierre')).toBeNull();
    jasmine.clock().tick(60 * 60_000);
    fixture.detectChanges();
    expect(el('recordatorio-cierre')).not.toBeNull();
  });

  it('al destruir el panel limpia el timer pendiente', () => {
    jasmine.clock().mockDate(new Date('2026-11-10T14:00:00Z'));
    render(sesion());
    const panel = fixture.componentInstance as unknown as { recordatorioCierre: () => boolean };
    fixture.destroy();
    // Si el timer siguiera vivo, al llegar a 15 min del cierre activaría el recordatorio.
    jasmine.clock().tick(45 * 60_000);
    expect(panel.recordatorioCierre()).toBeFalse();
  });
});
