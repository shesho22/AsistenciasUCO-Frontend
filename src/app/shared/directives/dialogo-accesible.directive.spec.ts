import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogoAccesibleDirective } from './dialogo-accesible.directive';

@Component({
  standalone: true,
  imports: [DialogoAccesibleDirective],
  template: `
    <button id="disparador" type="button">Abrir</button>
    @if (abierto) {
      <div id="dialogo" role="dialog" aria-modal="true" appDialogoAccesible (cerrarSolicitado)="cierres = cierres + 1">
        @if (!sinEnfocables) {
          <button id="primero" type="button">Primero</button>
          <button id="ultimo" type="button">Ultimo</button>
        }
        @if (anidado) {
          <div role="dialog" aria-modal="true" id="anidado"><button type="button">Interno</button></div>
        }
      </div>
    }
  `,
})
class AnfitrionComponent {
  abierto = false;
  anidado = false;
  sinEnfocables = false;
  cierres = 0;
}

describe('DialogoAccesibleDirective', () => {
  let fixture: ComponentFixture<AnfitrionComponent>;
  let host: AnfitrionComponent;
  const el = (id: string) => document.getElementById(id) as HTMLElement;
  const tecla = (key: string, shiftKey = false) =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }));

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AnfitrionComponent] });
    fixture = TestBed.createComponent(AnfitrionComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    el('disparador').focus();
  });

  function abrir(): void {
    host.abierto = true;
    fixture.detectChanges();
  }

  it('al abrirse mueve el foco al diálogo, que es focalizable programáticamente', () => {
    abrir();
    expect(document.activeElement).toBe(el('dialogo'));
    expect(el('dialogo').getAttribute('tabindex')).toBe('-1');
  });

  it('Escape solicita el cierre', () => {
    abrir();
    tecla('Escape');
    expect(host.cierres).toBe(1);
  });

  it('otras teclas no cierran', () => {
    abrir();
    tecla('a');
    expect(host.cierres).toBe(0);
  });

  it('Tab desde el último elemento vuelve al primero y Shift+Tab desde el primero va al último', () => {
    abrir();
    el('ultimo').focus();
    tecla('Tab');
    expect(document.activeElement).toBe(el('primero'));

    tecla('Tab', true);
    expect(document.activeElement).toBe(el('ultimo'));
  });

  it('Shift+Tab desde el propio diálogo salta al último elemento', () => {
    abrir();
    tecla('Tab', true);
    expect(document.activeElement).toBe(el('ultimo'));
  });

  it('Tab con el foco fuera del diálogo lo devuelve al primer elemento', () => {
    abrir();
    el('disparador').focus();
    tecla('Tab');
    expect(document.activeElement).toBe(el('primero'));
  });

  it('Tab entre elementos intermedios no interviene', () => {
    abrir();
    el('primero').focus();
    const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBeFalse();
  });

  it('un diálogo sin elementos enfocables retiene el foco en sí mismo al pulsar Tab', () => {
    host.sinEnfocables = true;
    abrir();
    const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    el('disparador').focus();
    document.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBeTrue();
    expect(document.activeElement).toBe(el('dialogo'));
  });

  it('al cerrarse devuelve el foco al elemento que lo abrió', () => {
    abrir();
    host.abierto = false;
    fixture.detectChanges();
    expect(document.activeElement).toBe(el('disparador'));
  });

  it('si hay un diálogo anidado abierto no gestiona Escape ni Tab', () => {
    host.anidado = true;
    abrir();
    tecla('Escape');
    expect(host.cierres).toBe(0);
    const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    el('disparador').focus();
    document.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBeFalse();
  });
});
