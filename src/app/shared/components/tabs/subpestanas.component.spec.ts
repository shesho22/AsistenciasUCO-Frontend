import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SubpestanasComponent } from './subpestanas.component';

@Component({
  standalone: true,
  imports: [SubpestanasComponent],
  template: `<app-subpestanas [tabs]="tabs" [(activa)]="activa" etiqueta="Secciones de prueba" />`,
})
class AnfitrionComponent {
  readonly tabs = [
    { id: 'a', etiqueta: 'Uno' },
    { id: 'b', etiqueta: 'Dos' },
    { id: 'c', etiqueta: 'Tres' },
  ];
  readonly activa = signal('a');
}

describe('SubpestanasComponent (MEJORAS-SERGIO-2026-11-18)', () => {
  function crear() {
    TestBed.configureTestingModule({ imports: [AnfitrionComponent] });
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
    const tabs = (): HTMLButtonElement[] => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]'));
    return { fixture, tabs };
  }

  it('marca la pestaña activa con aria-selected y tabindex 0 dentro de un tablist etiquetado', () => {
    const { fixture, tabs } = crear();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe('Secciones de prueba');
    expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs().map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
  });

  it('el clic cambia la pestaña activa del anfitrión (two-way)', () => {
    const { fixture, tabs } = crear();
    tabs()[2].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.activa()).toBe('c');
    expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
  });

  it('las flechas, Home y End recorren las pestañas en círculo', () => {
    const { fixture, tabs } = crear();
    const tecla = (key: string) => {
      tabs()[0].dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      fixture.detectChanges();
    };
    tecla('ArrowLeft');
    expect(fixture.componentInstance.activa()).toBe('c');
    tecla('ArrowRight');
    expect(fixture.componentInstance.activa()).toBe('a');
    tecla('End');
    expect(fixture.componentInstance.activa()).toBe('c');
    tecla('Home');
    expect(fixture.componentInstance.activa()).toBe('a');
    tecla('x');
    expect(fixture.componentInstance.activa()).toBe('a');
  });
});
