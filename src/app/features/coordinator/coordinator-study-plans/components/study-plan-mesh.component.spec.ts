import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StudyPlanMeshComponent } from './study-plan-mesh.component';
import { AsignaturaPlanItem, PlanEstudioItem } from '../../../../core/models/role-management.model';

describe('StudyPlanMeshComponent (certificación F3)', () => {
  const plan: PlanEstudioItem = {
    id: 'plan-1',
    codigo: 'INP-2024',
    nombre: 'Plan 2024',
    anioVigencia: 2024,
    programa: 'Ingeniería de Sistemas',
    facultad: '',
    totalCreditos: null,
    totalSemestres: 8,
    totalAsignaturas: null,
    estado: 'VIGENTE',
    descripcion: '',
  };
  const asignatura = (id: string, creditos: number): AsignaturaPlanItem => ({
    id,
    planEstudioId: 'plan-1',
    codigo: id,
    nombre: `Asignatura ${id}`,
    creditos,
    semestre: 8,
    area: 'Ingeniería de Software',
    componente: 'ESP',
    horasSemanales: 0,
  });

  it('el total de asignaturas sale del servidor y los créditos solo se muestran si el plan los informa', () => {
    TestBed.configureTestingModule({ imports: [StudyPlanMeshComponent] });
    const fixture = TestBed.createComponent(StudyPlanMeshComponent);
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('asignaturas', [asignatura('ARQ-402', 3), asignatura('BD-301', 4)]);
    fixture.componentRef.setInput('totalAsignaturas', 25);
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Asignaturas: 25');
    expect(texto).not.toContain('Créditos:');

    fixture.componentRef.setInput('plan', { ...plan, totalCreditos: 160 });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Créditos: 160');
  });

  it('los filtros se emiten al contenedor y no filtran la lista recibida', () => {
    TestBed.configureTestingModule({ imports: [StudyPlanMeshComponent] });
    const fixture = TestBed.createComponent(StudyPlanMeshComponent);
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('asignaturas', [asignatura('ARQ-402', 3), asignatura('BD-301', 4)]);
    fixture.detectChanges();
    const emitidos: unknown[] = [];
    fixture.componentInstance.filtrosChange.subscribe((f) => emitidos.push(f));

    fixture.componentInstance.onSemestre('3');
    fixture.componentInstance.onCaracter('OPT');

    expect(emitidos).toEqual([
      { busqueda: '', semestre: 3, caracter: '' },
      { busqueda: '', semestre: 3, caracter: 'OPT' },
    ]);
    expect(fixture.nativeElement.querySelectorAll('h4').length).toBe(2);
  });

  it('la búsqueda se emite con retardo y un solo aviso por ráfaga de teclas', fakeAsync(() => {
    TestBed.configureTestingModule({ imports: [StudyPlanMeshComponent] });
    const fixture = TestBed.createComponent(StudyPlanMeshComponent);
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('asignaturas', []);
    fixture.detectChanges();
    const emitidos: unknown[] = [];
    fixture.componentInstance.filtrosChange.subscribe((f) => emitidos.push(f));

    fixture.componentInstance.onBusqueda('al');
    fixture.componentInstance.onBusqueda(' algoritmos ');
    expect(emitidos.length).toBe(0);
    tick(300);
    expect(emitidos).toEqual([{ busqueda: 'algoritmos', semestre: 0, caracter: '' }]);
  }));

  it('el cambio de página y el reintento se propagan al contenedor', () => {
    TestBed.configureTestingModule({ imports: [StudyPlanMeshComponent] });
    const fixture = TestBed.createComponent(StudyPlanMeshComponent);
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('asignaturas', [asignatura('A-1', 3)]);
    fixture.componentRef.setInput('totalAsignaturas', 30);
    fixture.componentRef.setInput('pageSize', 9);
    fixture.detectChanges();
    const paginas: number[] = [];
    fixture.componentInstance.pageChange.subscribe((n) => paginas.push(n));
    let reintentos = 0;
    fixture.componentInstance.reintentar.subscribe(() => reintentos++);
    fixture.debugElement.query(By.directive(PaginationComponent)).componentInstance.pageChange.emit(2);
    expect(paginas).toEqual([2]);

    fixture.componentRef.setInput('error', { kind: 'SERVIDOR', titulo: 'Servicio no disponible', mensaje: 'Intenta de nuevo' });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[data-testid="error-carga"] button') as HTMLButtonElement).click();
    expect(reintentos).toBe(1);
  });

  it('EST-03 (S2871): los caracteres disponibles salen de la malla con código y nombre, ordenados en español y sin repetidos', () => {
    TestBed.configureTestingModule({ imports: [StudyPlanMeshComponent] });
    const fixture = TestBed.createComponent(StudyPlanMeshComponent);
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('asignaturas', [
      { ...asignatura('A-1', 3), codigoCaracter: 'OPT', nombreCaracter: 'Optativa' },
      { ...asignatura('A-2', 3), codigoCaracter: 'ETI', nombreCaracter: 'Ética' },
      { ...asignatura('A-3', 3), codigoCaracter: 'ALG', nombreCaracter: 'Álgebra' },
      { ...asignatura('A-4', 3), codigoCaracter: 'OPT', nombreCaracter: 'Optativa' },
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.caracteresDisponibles()).toEqual([
      { codigo: 'ALG', nombre: 'Álgebra' },
      { codigo: 'ETI', nombre: 'Ética' },
      { codigo: 'OPT', nombre: 'Optativa' },
    ]);
  });
});
