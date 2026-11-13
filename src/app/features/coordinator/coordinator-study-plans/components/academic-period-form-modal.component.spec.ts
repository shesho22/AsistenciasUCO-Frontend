import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AcademicPeriodFormModalComponent, PeriodoFormDatos } from './academic-period-form-modal.component';
import { PeriodoAcademicoItem } from '../../../../core/models/role-management.model';

describe('AcademicPeriodFormModalComponent', () => {
  let fixture: ComponentFixture<AcademicPeriodFormModalComponent>;
  let component: AcademicPeriodFormModalComponent;
  const periodo: PeriodoAcademicoItem = {
    id: 'p1',
    codigo: '2026-2',
    nombre: 'Período 2026-2',
    fechaInicio: '2026-08-01',
    fechaFin: '2026-12-15',
    estado: 'ACTIVO',
    esActual: true,
  };

  function crear(p: PeriodoAcademicoItem | null = null): void {
    fixture = TestBed.createComponent(AcademicPeriodFormModalComponent);
    fixture.componentRef.setInput('periodo', p);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }
  const guardar = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector('button[type="submit"]') as HTMLButtonElement;

  beforeEach(() => TestBed.configureTestingModule({ imports: [AcademicPeriodFormModalComponent] }));

  it('al crear no precarga datos y deshabilita Guardar', () => {
    crear();
    expect(component.esEdicion()).toBeFalse();
    expect(component.nombre()).toBe('');
    expect(component.fechaInicio()).toBe('');
    expect(guardar().disabled).toBeTrue();
    expect(guardar().textContent).toContain('Crear período');
    expect(component.errorNombre()).toBe('');
  });

  it('valida longitud del nombre (3 a 50)', () => {
    crear();
    component.nombre.set('ab');
    expect(component.errorNombre()).toContain('al menos 3');
    component.nombre.set('x'.repeat(51));
    expect(component.errorNombre()).toContain('50');
    component.nombre.set('2027-1');
    expect(component.errorNombre()).toBe('');
  });

  it('valida inicio anterior a fin', () => {
    crear();
    component.nombre.set('2027-1');
    component.fechaInicio.set('2027-06-01');
    component.fechaFin.set('2027-02-01');
    expect(component.errorFechas()).toContain('posterior');
    expect(component.valido()).toBeFalse();
    component.fechaFin.set('2027-06-01');
    expect(component.errorFechas()).not.toBe('');
    component.fechaFin.set('2027-11-30');
    expect(component.errorFechas()).toBe('');
    expect(component.valido()).toBeTrue();
  });

  it('no es válido si faltan fechas', () => {
    crear();
    component.nombre.set('2027-1');
    expect(component.valido()).toBeFalse();
    component.fechaInicio.set('2027-01-01');
    expect(component.valido()).toBeFalse();
  });

  it('emite los datos recortados al enviar un formulario válido', () => {
    crear();
    let emitido: PeriodoFormDatos | undefined;
    component.guardar.subscribe((d) => (emitido = d));
    component.nombre.set('  2027-1 ');
    component.fechaInicio.set('2027-02-01');
    component.fechaFin.set('2027-06-30');
    fixture.detectChanges();
    expect(guardar().disabled).toBeFalse();
    component.enviar();
    expect(emitido).toEqual({ nombre: '2027-1', fechaInicio: '2027-02-01', fechaFin: '2027-06-30' });
  });

  it('no emite si es inválido ni mientras guarda', () => {
    crear();
    const spy = jasmine.createSpy('guardar');
    component.guardar.subscribe(spy);
    component.enviar();
    component.nombre.set('2027-1');
    component.fechaInicio.set('2027-02-01');
    component.fechaFin.set('2027-06-30');
    fixture.componentRef.setInput('guardando', true);
    fixture.detectChanges();
    component.enviar();
    expect(spy).not.toHaveBeenCalled();
    expect(guardar().disabled).toBeTrue();
    expect(guardar().textContent).toContain('Guardando');
  });

  it('en edición carga los datos del período', () => {
    crear(periodo);
    expect(component.esEdicion()).toBeTrue();
    expect(component.nombre()).toBe('Período 2026-2');
    expect(component.fechaInicio()).toBe('2026-08-01');
    expect(guardar().textContent).toContain('Guardar cambios');
  });

  it('en edición usa el código si el nombre viene vacío', () => {
    crear({ ...periodo, nombre: '' });
    expect(component.nombre()).toBe('2026-2');
  });

  it('muestra el error del backend tal cual', () => {
    crear();
    fixture.componentRef.setInput('error', 'Ya existe un período con ese nombre.');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ya existe un período con ese nombre.');
  });

  it('cancelar cierra salvo que esté guardando', () => {
    crear();
    const spy = jasmine.createSpy('cerrar');
    component.cerrar.subscribe(spy);
    component.cancelar();
    expect(spy).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('guardando', true);
    component.cancelar();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
