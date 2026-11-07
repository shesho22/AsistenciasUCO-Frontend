import { ApplicationRef, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ModalComponent } from './modal.component';

@Component({
  standalone: true,
  imports: [ModalComponent],
  template: `
    <button id="disparador" type="button">Abrir</button>
    <app-modal [isOpen]="abierto()" title="Prueba" (closed)="abierto.set(false)">
      <input id="campo" type="text" />
      <button modal-footer id="guardar" type="button">Guardar</button>
    </app-modal>
  `,
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
});
