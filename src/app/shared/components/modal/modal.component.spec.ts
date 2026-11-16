import { ApplicationRef, Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ModalComponent } from './modal.component';

@Component({
    imports: [ModalComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <button id="disparador" type="button">Abrir</button>
    <app-modal [isOpen]="abierto()" title="Prueba" (closed)="abierto.set(false)">
      <input id="campo" type="text" />
      <button modal-footer id="guardar" type="button">Guardar</button>
    </app-modal>
  `
})
class HostComponent {
  abierto = signal(false);
}

describe('ModalComponent (foco y teclado, F-TRX-014)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let disparador: HTMLButtonElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    disparador = fixture.nativeElement.querySelector('#disparador');
    disparador.focus();
  });

  afterEach(() => fixture.destroy());

  function abrir(): void {
    fixture.componentInstance.abierto.set(true);
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
  }

  function tab(shift = false): KeyboardEvent {
    const e = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, cancelable: true, bubbles: true });
    document.dispatchEvent(e);
    return e;
  }

  it('mueve el foco al primer campo del dialogo al abrirse', () => {
    abrir();
    expect(document.activeElement?.id).toBe('campo');
  });

  it('devuelve el foco al elemento que abrio el dialogo al cerrarse', () => {
    abrir();
    fixture.componentInstance.abierto.set(false);
    fixture.detectChanges();
    expect(document.activeElement).toBe(disparador);
  });

  it('atrapa Tab en el ultimo elemento y Shift+Tab en el primero', () => {
    abrir();
    const guardar = fixture.nativeElement.querySelector('#guardar') as HTMLElement;
    guardar.focus();
    expect(tab().defaultPrevented).toBeTrue();
    const cerrar = fixture.debugElement.query(By.css('button[aria-label="Cerrar modal"]')).nativeElement as HTMLElement;
    expect(document.activeElement).toBe(cerrar);
    expect(tab(true).defaultPrevented).toBeTrue();
    expect(document.activeElement).toBe(guardar);
  });

  it('no intercepta Tab con el dialogo cerrado', () => {
    expect(tab().defaultPrevented).toBeFalse();
  });

  it('cierra con Escape', () => {
    abrir();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.componentInstance.abierto()).toBeFalse();
  });

  it('cierra al pulsar el fondo por defecto y oculta el pie solo si esta vacio', () => {
    abrir();
    const pie = (fixture.nativeElement.querySelector('#guardar') as HTMLElement).parentElement as HTMLElement;
    expect(pie.className).toContain('empty:hidden');
    (fixture.nativeElement.querySelector('[aria-hidden="true"].fixed') as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.abierto()).toBeFalse();
  });
});

@Component({
    imports: [ModalComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-modal
      [isOpen]="externo()"
      title="Externo"
      tamano="3xl"
      subtitulo="Linea secundaria"
      etiquetaCerrar="Cerrar ficha"
      [cerrarAlPulsarFondo]="false"
      panelTestId="panel-externo"
      tituloTestId="titulo-externo"
      cerrarTestId="cerrar-externo"
      (closed)="externo.set(false)"
    >
      <span modal-icono data-testid="icono">!</span>
      <p modal-encabezado data-testid="encabezado">Detalle <strong>rico</strong></p>
      <button id="dentro" type="button">Dentro</button>
    </app-modal>
    <app-modal [isOpen]="interno()" title="Interno" (closed)="interno.set(false)">
      <button id="interno-btn" type="button">Interno</button>
    </app-modal>
  `
})
class AnidadoHostComponent {
  externo = signal(false);
  interno = signal(false);
}

describe('ModalComponent (variantes y pila de dialogos)', () => {
  let fixture: ComponentFixture<AnidadoHostComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AnidadoHostComponent] });
    fixture = TestBed.createComponent(AnidadoHostComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  function render(): void {
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
  }

  it('aplica tamano, subtitulo, ranuras, etiqueta de cerrar y data-testid', () => {
    fixture.componentInstance.externo.set(true);
    render();
    const panel = el().querySelector('[data-testid="panel-externo"]') as HTMLElement;
    expect(panel.className).toContain('max-w-3xl');
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(el().querySelector('[data-testid="titulo-externo"]')?.textContent).toContain('Externo');
    expect(el().textContent).toContain('Linea secundaria');
    expect(el().querySelector('[data-testid="icono"]')).not.toBeNull();
    expect(el().querySelector('[data-testid="encabezado"] strong')?.textContent).toBe('rico');
    expect(el().querySelector('[data-testid="cerrar-externo"]')?.getAttribute('aria-label')).toBe('Cerrar ficha');
    expect(document.activeElement?.id).toBe('dentro');
  });

  it('con cerrarAlPulsarFondo=false un clic en el fondo no cierra', () => {
    fixture.componentInstance.externo.set(true);
    render();
    (el().querySelector('[aria-hidden="true"].fixed') as HTMLElement).click();
    render();
    expect(fixture.componentInstance.externo()).toBeTrue();
  });

  it('Escape cierra solo el dialogo de arriba y luego el de abajo', () => {
    fixture.componentInstance.externo.set(true);
    render();
    fixture.componentInstance.interno.set(true);
    render();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    render();
    expect(fixture.componentInstance.interno()).toBeFalse();
    expect(fixture.componentInstance.externo()).toBeTrue();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    render();
    expect(fixture.componentInstance.externo()).toBeFalse();
  });

  it('solo el dialogo de arriba atrapa Tab', () => {
    fixture.componentInstance.externo.set(true);
    render();
    fixture.componentInstance.interno.set(true);
    render();
    const dentro = el().querySelector('#dentro') as HTMLElement;
    dentro.focus();
    const e = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true, bubbles: true });
    document.dispatchEvent(e);
    expect(e.defaultPrevented).toBeTrue();
    expect((document.activeElement as HTMLElement).closest('[role="dialog"]')?.textContent).toContain('Interno');
  });
});
