import { ComponentFixture, DeferBlockState, TestBed } from '@angular/core/testing';
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

  it('DEC-065: crear abre el dialogo sin datos precargados y emite CREAR', async () => {
    const emitidos: unknown[] = [];
    component.savePeriodo.subscribe((e) => emitidos.push(e));
    component.abrirCrear();
    fixture.detectChanges();
    const deferBlocks = await fixture.getDeferBlocks();
    await Promise.all(deferBlocks.map((block) => block.render(DeferBlockState.Complete)));
    fixture.detectChanges();
    expect(component.mostrarModal()).toBeTrue();
    expect(component.periodoEditando()).toBeNull();
    expect(texto()).toContain('Nuevo período académico');
    const datos = { nombre: '2027-1', fechaInicio: '2027-02-01', fechaFin: '2027-06-01' };
    component.guardar(datos);
    expect(emitidos).toEqual([{ modo: 'CREAR', id: undefined, datos }]);
    expect(component.mostrarModal()).toBeTrue();
  });

  it('editar abre el dialogo con el periodo y emite EDITAR con su id', async () => {
    const emitidos: unknown[] = [];
    component.savePeriodo.subscribe((e) => emitidos.push(e));
    component.abrirEditar(periodo(1));
    fixture.detectChanges();
    const deferBlocks = await fixture.getDeferBlocks();
    await Promise.all(deferBlocks.map((block) => block.render(DeferBlockState.Complete)));
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

  it('pagina de a 15 y muestra el estado vacio', () => {
    fixture.componentRef.setInput('periodos', Array.from({ length: 20 }, (_, i) => periodo(i + 1)));
    fixture.detectChanges();
    expect(component.pagedPeriodos()).toHaveSize(15);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('tr[data-testid="periodo-fila"]')).toHaveSize(15);
    component.currentPage.set(2);
    expect(component.pagedPeriodos()).toHaveSize(5);
    fixture.componentRef.setInput('periodos', []);
    fixture.detectChanges();
    expect(texto()).toContain('No hay períodos académicos registrados.');
  });

  it('bloque E: muestra una tabla con una fila por periodo, la mas reciente primero', () => {
    const viejo = { ...periodo(1), id: 'viejo', nombre: '2025-2', fechaInicio: '2025-07-01' };
    const nuevo = { ...periodo(2), id: 'nuevo', nombre: '2027-1', fechaInicio: '2027-02-01' };
    fixture.componentRef.setInput('periodos', [viejo, nuevo]);
    fixture.detectChanges();
    const filas = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('app-tabla-datos tbody tr[data-testid="periodo-fila"]');
    expect(filas).toHaveSize(2);
    expect(filas[0].textContent).toContain('2027-1');
    expect(filas[0].textContent).toContain('Editar Fechas');
    expect(filas[0].textContent).toContain('Eliminar');
  });
});
