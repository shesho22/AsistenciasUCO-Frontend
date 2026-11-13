import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AcademicPeriodsTabComponent } from './academic-periods-tab.component';
import { PeriodoAcademicoItem } from '../../../../core/models/role-management.model';

describe('AcademicPeriodsTabComponent', () => {
  let fixture: ComponentFixture<AcademicPeriodsTabComponent>;
  let component: AcademicPeriodsTabComponent;
  const periodo = (n: number): PeriodoAcademicoItem => ({
    id: `p${n}`,
    codigo: `2026-${n}`,
    nombre: `2026-${n}`,
    fechaInicio: '2026-01-01',
    fechaFin: '2026-06-01',
    estado: 'ACTIVO',
    esActual: n === 1,
  });
  const texto = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AcademicPeriodsTabComponent] });
    fixture = TestBed.createComponent(AcademicPeriodsTabComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('periodos', [periodo(1)]);
    fixture.detectChanges();
  });

  it('DEC-065: crear abre el dialogo sin datos precargados y emite CREAR', () => {
    const emitidos: unknown[] = [];
    component.savePeriodo.subscribe((e) => emitidos.push(e));
    component.abrirCrear();
    fixture.detectChanges();
    expect(component.mostrarModal()).toBeTrue();
    expect(component.periodoEditando()).toBeNull();
    expect(texto()).toContain('Nuevo período académico');
    const datos = { nombre: '2027-1', fechaInicio: '2027-02-01', fechaFin: '2027-06-01' };
    component.guardar(datos);
    expect(emitidos).toEqual([{ modo: 'CREAR', id: undefined, datos }]);
    expect(component.mostrarModal()).toBeTrue();
  });

  it('editar abre el dialogo con el periodo y emite EDITAR con su id', () => {
    const emitidos: unknown[] = [];
    component.savePeriodo.subscribe((e) => emitidos.push(e));
    component.abrirEditar(periodo(1));
    fixture.detectChanges();
    expect(texto()).toContain('Modificar período académico');
    const datos = { nombre: '2026-1', fechaInicio: '2026-01-02', fechaFin: '2026-06-02' };
    component.guardar(datos);
    expect(emitidos).toEqual([{ modo: 'EDITAR', id: 'p1', datos }]);
  });

  it('cerrarFormulario oculta el dialogo', () => {
    component.abrirEditar(periodo(1));
    component.cerrarFormulario();
    fixture.detectChanges();
    expect(component.mostrarModal()).toBeFalse();
    expect(component.periodoEditando()).toBeNull();
  });

  it('en solo lectura no ofrece crear ni editar', () => {
    fixture.componentRef.setInput('soloLectura', true);
    fixture.detectChanges();
    expect(texto()).not.toContain('Nuevo Período Académico');
    expect(texto()).not.toContain('Editar Fechas');
  });

  it('pagina y muestra el estado vacio', () => {
    fixture.componentRef.setInput('periodos', Array.from({ length: 8 }, (_, i) => periodo(i + 1)));
    fixture.detectChanges();
    expect(component.pagedPeriodos().length).toBe(6);
    component.currentPage.set(2);
    expect(component.pagedPeriodos().length).toBe(2);
    fixture.componentRef.setInput('periodos', []);
    fixture.detectChanges();
    expect(texto()).toContain('No hay períodos académicos registrados.');
  });
});
