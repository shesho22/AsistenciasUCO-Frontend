import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeanProgramasCreditosComponent } from './dean-programas-creditos.component';
import { ProgramaCreditosItem } from '../../../../core/models/consultas-transversales.model';

function fila(cambios: Partial<ProgramaCreditosItem>): ProgramaCreditosItem {
  return {
    idPrograma: 'p-1', nombrePrograma: 'Ingeniería de Sistemas', nombreTipoPrograma: 'Pregrado', nombreModalidad: 'Presencial',
    nombreJornada: 'Diurna', programaActivo: true, idPlanEstudio: 'pl-1', inpPlanEstudio: 20241, planActivo: true,
    totalSemestres: 10, totalAsignaturas: 50, totalCreditos: 160,
    ...cambios,
  };
}

describe('DeanProgramasCreditosComponent (HU112)', () => {
  let fixture: ComponentFixture<DeanProgramasCreditosComponent>;
  let component: DeanProgramasCreditosComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DeanProgramasCreditosComponent] });
    fixture = TestBed.createComponent(DeanProgramasCreditosComponent);
    component = fixture.componentInstance;
  });

  it('muestra cada programa y plan con sus totales y el programa sin plan', () => {
    fixture.componentRef.setInput('filas', [
      fila({}),
      fila({ idPrograma: 'p-2', nombrePrograma: 'Industrial', nombreTipoPrograma: 'Posgrado', idPlanEstudio: null, inpPlanEstudio: null, planActivo: false, totalSemestres: 0, totalAsignaturas: 0, totalCreditos: 0 }),
    ]);
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('160 créditos en 2 planes');
    expect(texto).toContain('INP-20241');
    expect(texto).toContain('Sin plan');
    expect(texto).toContain('Vigente');
    expect(texto).toContain('Inactivo');
  });

  it('filtra por programa, tipo o INP y vuelve a la primera página', () => {
    fixture.componentRef.setInput('filas', [fila({}), fila({ idPrograma: 'p-2', nombrePrograma: 'Industrial', nombreTipoPrograma: 'Posgrado', inpPlanEstudio: 20191 })]);
    component.paginaActual.set(2);
    component.onFiltro('posgrado');
    expect(component.paginaActual()).toBe(1);
    expect(component.filtradas().map((f) => f.nombrePrograma)).toEqual(['Industrial']);
    component.onFiltro('20241');
    expect(component.filtradas().length).toBe(1);
    component.onFiltro('nada');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay programas que coincidan.');
  });

  it('pagina en el navegador', () => {
    fixture.componentRef.setInput('filas', Array.from({ length: 12 }, (_, i) => fila({ idPlanEstudio: `pl-${i}` })));
    expect(component.pagina().length).toBe(10);
    component.paginaActual.set(2);
    expect(component.pagina().length).toBe(2);
    component.onTamano(20);
    expect(component.paginaActual()).toBe(1);
    expect(component.pagina().length).toBe(12);
  });

  it('muestra el error de la consulta', () => {
    fixture.componentRef.setInput('error', 'No fue posible consultar los programas.');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No fue posible consultar los programas.');
  });
});
