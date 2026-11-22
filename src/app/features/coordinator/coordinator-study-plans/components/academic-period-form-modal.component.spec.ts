import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';
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

  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [AcademicPeriodFormModalComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    })
  );

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

  it('calcula la fecha de fin: inicio + 16 semanas - 1 día (112 días)', () => {
    crear();
    component.nombre.set('2027-1');
    expect(component.fechaFinEfectiva()).toBe('');
    expect(component.valido()).toBeFalse();
    component.fechaInicio.set('2027-02-01');
    expect(component.fechaFinEfectiva()).toBe('2027-05-23');
    expect(component.valido()).toBeTrue();
    // cualquier día de inicio da 112 días corridos (16 de cada día de la semana)
    component.fechaInicio.set('2027-02-03');
    expect(component.fechaFinEfectiva()).toBe('2027-05-25');
  });

  it('el campo de fin es de solo lectura y muestra la fecha calculada', () => {
    crear();
    component.fechaInicio.set('2027-02-01');
    fixture.detectChanges();
    const fin = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="fecha-fin-periodo"]') as HTMLInputElement;
    expect(fin.readOnly).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="ayuda-duracion-periodo"]')?.textContent).toContain('16 semanas');
  });

  it('no es válido si faltan fechas', () => {
    crear();
    component.nombre.set('2027-1');
    expect(component.valido()).toBeFalse();
    // basta la fecha de inicio: la de fin se calcula sola
    component.fechaInicio.set('2027-01-01');
    expect(component.valido()).toBeTrue();
    component.nombre.set('');
    expect(component.valido()).toBeFalse();
  });

  it('emite los datos recortados al enviar un formulario válido', () => {
    crear();
    let emitido: PeriodoFormDatos | undefined;
    component.guardar.subscribe((d) => (emitido = d));
    component.nombre.set('  2027-1 ');
    component.fechaInicio.set('2027-02-01');
    fixture.detectChanges();
    expect(guardar().disabled).toBeFalse();
    component.enviar();
    expect(emitido).toEqual({ nombre: '2027-1', fechaInicio: '2027-02-01', fechaFin: '2027-05-23' });
  });

  it('no emite si es inválido ni mientras guarda', () => {
    crear();
    const spy = jasmine.createSpy('guardar');
    component.guardar.subscribe(spy);
    component.enviar();
    component.nombre.set('2027-1');
    component.fechaInicio.set('2027-02-01');
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

  it('en edición de un período histórico sin cambiar el inicio conserva su fecha de fin guardada', () => {
    crear(periodo); // 2026-08-01 .. 2026-12-15: 137 días, anterior a la regla de 16 semanas
    expect(component.fechaFinEfectiva()).toBe('2026-12-15');
    expect(component.periodoHistorico()).toBeTrue();
    let emitido: PeriodoFormDatos | undefined;
    component.guardar.subscribe((d) => (emitido = d));
    component.nombre.set('Período 2026-2 renombrado');
    component.enviar();
    expect(emitido).toEqual({ nombre: 'Período 2026-2 renombrado', fechaInicio: '2026-08-01', fechaFin: '2026-12-15' });
  });

  it('en edición, si cambia el inicio, la fecha de fin pasa a ser la calculada', () => {
    crear(periodo);
    component.fechaInicio.set('2026-08-03');
    expect(component.fechaFinEfectiva()).toBe('2026-11-22');
    expect(component.periodoHistorico()).toBeFalse();
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

  it('DEC-081: al crear muestra la sección de días de receso sin consultar el backend y avisa los días agregados', () => {
    crear();
    const http = TestBed.inject(HttpTestingController);
    const emitidos: unknown[] = [];
    component.recesosChange.subscribe((r) => emitidos.push(r));
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.textContent ?? '').toContain('Días de receso académico');
    http.expectNone(`${environment.apiUrl}/admin/periodos-academicos/p1/recesos`);

    component.fechaInicio.set('2026-08-03');
    fixture.detectChanges();
    const fecha = raiz.querySelector<HTMLInputElement>('[data-testid="receso-fecha"]') as HTMLInputElement;
    const motivo = raiz.querySelector<HTMLInputElement>('[data-testid="receso-motivo"]') as HTMLInputElement;
    fecha.value = '2026-09-07';
    fecha.dispatchEvent(new Event('input'));
    motivo.value = 'Puente festivo';
    motivo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    raiz.querySelector<HTMLButtonElement>('[data-testid="agregar-receso"]')?.click();
    expect(emitidos).toEqual([[{ fecha: '2026-09-07', motivo: 'Puente festivo' }]]);
    http.verify();
  });

  it('DEC-081: al editar carga los días de receso del período', () => {
    crear(periodo);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${environment.apiUrl}/admin/periodos-academicos/p1/recesos`).flush({ exitoso: true, datos: [] });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="sin-recesos"]')).not.toBeNull();
    http.verify();
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
