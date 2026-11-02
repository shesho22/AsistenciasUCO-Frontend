import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FranjasEditorComponent } from './franjas-editor.component';
import { validarFranjas } from '../../../core/validation/franjas.util';

describe('FranjasEditorComponent', () => {
  let fixture: ComponentFixture<FranjasEditorComponent>;
  let component: FranjasEditorComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FranjasEditorComponent] });
    fixture = TestBed.createComponent(FranjasEditorComponent);
    component = fixture.componentInstance;
  });

  it('agrega una franja con valores por defecto y la quita por índice', () => {
    component.franjas.set([{ dia: 'MA', horaInicio: '10:00', horaFin: '12:00' }]);

    component.agregar();
    expect(component.franjas()).toEqual([
      { dia: 'MA', horaInicio: '10:00', horaFin: '12:00' },
      { dia: 'LU', horaInicio: '08:00', horaFin: '10:00' },
    ]);

    component.quitar(0);
    expect(component.franjas()).toEqual([{ dia: 'LU', horaInicio: '08:00', horaFin: '10:00' }]);
  });

  it('cambia solo la franja indicada sin mutar la lista anterior', () => {
    const original = [
      { dia: 'LU', horaInicio: '08:00', horaFin: '10:00' },
      { dia: 'MI', horaInicio: '08:00', horaFin: '10:00' },
    ];
    component.franjas.set(original);

    component.cambiar(1, { dia: 'VI', horaFin: '11:00' });

    expect(component.franjas()[0]).toEqual(original[0]);
    expect(component.franjas()[1]).toEqual({ dia: 'VI', horaInicio: '08:00', horaFin: '11:00' });
    expect(original[1].dia).toBe('MI');
  });

  it('dibuja una fila por franja y el botón agregar crea otra', () => {
    component.franjas.set([{ dia: 'LU', horaInicio: '08:00', horaFin: '10:00' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('input[type="time"]').length).toBe(2);

    fixture.nativeElement.querySelector('[data-testid="agregar-franja"]').click();
    fixture.detectChanges();

    expect(component.franjas().length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('input[type="time"]').length).toBe(4);
  });
});

describe('validarFranjas', () => {
  it('acepta un horario sin franjas, con franjas contiguas y en días distintos', () => {
    expect(validarFranjas([])).toBeNull();
    expect(
      validarFranjas([
        { dia: 'LU', horaInicio: '08:00', horaFin: '10:00' },
        { dia: 'LU', horaInicio: '10:00', horaFin: '12:00' },
        { dia: 'MA', horaInicio: '09:00', horaFin: '11:00' },
      ])
    ).toBeNull();
  });

  it('rechaza horas incompletas o con fin menor o igual al inicio', () => {
    const mensaje = 'En cada franja la hora de fin debe ser mayor que la de inicio.';
    expect(validarFranjas([{ dia: 'LU', horaInicio: '10:00', horaFin: '08:00' }])).toBe(mensaje);
    expect(validarFranjas([{ dia: 'LU', horaInicio: '10:00', horaFin: '10:00' }])).toBe(mensaje);
    expect(validarFranjas([{ dia: 'LU', horaInicio: '', horaFin: '10:00' }])).toBe(mensaje);
  });

  it('rechaza franjas que se cruzan en el mismo día', () => {
    expect(
      validarFranjas([
        { dia: 'LU', horaInicio: '08:00', horaFin: '10:00' },
        { dia: 'LU', horaInicio: '09:00', horaFin: '11:00' },
      ])
    ).toBe('Las franjas del horario no pueden cruzarse entre sí.');
  });
});
