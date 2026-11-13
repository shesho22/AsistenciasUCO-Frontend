import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectorModoComponent, OpcionModo } from './selector-modo.component';

type Modo = 'CREAR' | 'VINCULAR' | 'SIN';

@Component({
  imports: [SelectorModoComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<app-selector-modo [opciones]="opciones" etiqueta="Facultad" [(valor)]="modo" />`,
})
class HostComponent {
  readonly opciones: OpcionModo<Modo>[] = [
    { valor: 'CREAR', etiqueta: 'Crear nueva' },
    { valor: 'VINCULAR', etiqueta: 'Vincular existente' },
    { valor: 'SIN', etiqueta: 'Sin por ahora' },
  ];
  readonly modo = signal<Modo>('CREAR');
}

describe('SelectorModoComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  const botones = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="radio"]'));

  it('renderiza una opción por modo dentro de un radiogroup etiquetado', () => {
    const grupo = (fixture.nativeElement as HTMLElement).querySelector('[role="radiogroup"]')!;
    expect(grupo.getAttribute('aria-label')).toBe('Facultad');
    expect(botones().map((b) => b.textContent!.trim())).toEqual(['Crear nueva', 'Vincular existente', 'Sin por ahora']);
  });

  it('marca como seleccionada solo la opción vigente', () => {
    expect(botones().map((b) => b.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
  });

  it('al pulsar una opción actualiza el valor enlazado', () => {
    botones()[1].click();
    fixture.detectChanges();
    expect(host.modo()).toBe('VINCULAR');
    expect(botones().map((b) => b.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
  });

  it('las flechas mueven la selección circularmente', () => {
    const teclear = (key: string) => {
      botones().find((b) => b.getAttribute('aria-checked') === 'true')!.dispatchEvent(new KeyboardEvent('keydown', { key }));
      fixture.detectChanges();
    };
    teclear('ArrowRight');
    expect(host.modo()).toBe('VINCULAR');
    teclear('ArrowDown');
    expect(host.modo()).toBe('SIN');
    teclear('ArrowRight');
    expect(host.modo()).toBe('CREAR');
    teclear('ArrowLeft');
    expect(host.modo()).toBe('SIN');
    teclear('ArrowUp');
    expect(host.modo()).toBe('VINCULAR');
    teclear('Enter');
    expect(host.modo()).toBe('VINCULAR');
  });
});
