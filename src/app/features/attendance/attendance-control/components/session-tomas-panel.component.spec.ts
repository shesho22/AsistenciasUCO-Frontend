import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SessionTomasPanelComponent } from './session-tomas-panel.component';
import { TomaModoSelectorComponent } from './toma-modo-selector.component';
import { TomaCierreDialogComponent } from './toma-cierre-dialog.component';
import { TomaAsistencia, TomasSesion } from '../../../../core/models/toma-asistencia.model';

function toma(parcial: Partial<TomaAsistencia> = {}): TomaAsistencia {
  return {
    idToma: 't-1', idSesion: 's-1', idGrupo: 'g-1', numero: 1, modo: 'MANUAL', estado: 'CERRADA',
    esImplicita: false, fechaAperturaUtc: '2026-11-10T13:00:00Z', fechaCierreUtc: '2026-11-10T14:00:00Z',
    horasToma: 1, totalRegistros: 10, totalPresentes: 8, totalAusentes: 1, totalExcusas: 1, tieneQrActivo: false,
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

describe('SessionTomasPanelComponent (CULM-001 B.2)', () => {
  let fixture: ComponentFixture<SessionTomasPanelComponent>;
  const el = (id: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const boton = (id: string) => el(id) as HTMLButtonElement;

  function render(datos: TomasSesion | null, extra: { abriendo?: boolean } = {}) {
    fixture = TestBed.createComponent(SessionTomasPanelComponent);
    fixture.componentRef.setInput('tomasSesion', datos);
    fixture.componentRef.setInput('abriendo', extra.abriendo ?? false);
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [SessionTomasPanelComponent] }));

  it('B2-F-06 lista cada toma con numero, modo, estado, horas y conteos', () => {
    render(tomasSesion({ tomas: [toma(), toma({ idToma: 't-2', numero: 2, modo: 'QR', estado: 'ABIERTA', horasToma: 0.5 })] }));
    const t1 = el('toma-t-1')!.textContent!.replace(/\s+/g, ' ');
    expect(t1).toContain('Toma 1');
    expect(t1).toContain('Manual');
    expect(t1).toContain('Cerrada');
    expect(t1).toContain('1 h');
    expect(t1).toContain('8 presentes');
    expect(t1).toContain('1 ausentes');
    expect(t1).toContain('1 excusas');
    const t2 = el('toma-t-2')!.textContent!.replace(/\s+/g, ' ');
    expect(t2).toContain('Código QR');
    expect(t2).toContain('Abierta');
    expect(t2).toContain('0.5 h');
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

  it('B2-F-06 emite nuevaToma, seleccionarToma y verFaltantes', () => {
    const nueva = jasmine.createSpy('nueva');
    const abrir = jasmine.createSpy('abrir');
    const faltantes = jasmine.createSpy('faltantes');
    render(tomasSesion({ tomas: [toma({ idToma: 'cerrada', numero: 1 }), toma({ idToma: 'abierta', numero: 2, estado: 'ABIERTA' })], maximoTomas: 9 }));
    fixture.componentInstance.nuevaToma.subscribe(nueva);
    fixture.componentInstance.seleccionarToma.subscribe(abrir);
    fixture.componentInstance.verFaltantes.subscribe(faltantes);

    boton('ver-faltantes-cerrada').click();
    boton('abrir-toma-abierta').click();
    expect(faltantes).toHaveBeenCalledWith(jasmine.objectContaining({ idToma: 'cerrada' }));
    expect(abrir).toHaveBeenCalledWith(jasmine.objectContaining({ idToma: 'abierta' }));
    expect(nueva).not.toHaveBeenCalled();
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

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('no marcados quedan ausentes');
    (fixture.nativeElement.querySelector('[data-testid="cierre-confirmar"]') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('[data-testid="cierre-cancelar"]') as HTMLButtonElement).click();
    expect(confirmar).toHaveBeenCalledOnceWith(true);
    expect(cancelar).toHaveBeenCalledTimes(1);
  });
});
