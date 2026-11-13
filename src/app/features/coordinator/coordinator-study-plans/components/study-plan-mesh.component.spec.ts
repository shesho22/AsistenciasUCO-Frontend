import { TestBed } from '@angular/core/testing';
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

  it('los créditos de la cabecera salen de la malla cargada, no de un total del plan', () => {
    TestBed.configureTestingModule({ imports: [StudyPlanMeshComponent] });
    const fixture = TestBed.createComponent(StudyPlanMeshComponent);
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('asignaturas', [asignatura('ARQ-402', 3), asignatura('BD-301', 4)]);
    fixture.detectChanges();

    expect(fixture.componentInstance.creditosMalla()).toBe(7);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Créditos: 7');
  });

  it('EST-03 (S2871): los caracteres disponibles se ordenan con localeCompare en español, sin repetidos', () => {
    TestBed.configureTestingModule({ imports: [StudyPlanMeshComponent] });
    const fixture = TestBed.createComponent(StudyPlanMeshComponent);
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('asignaturas', [
      { ...asignatura('A-1', 3), nombreCaracter: 'Optativa' },
      { ...asignatura('A-2', 3), nombreCaracter: 'Ética' },
      { ...asignatura('A-3', 3), nombreCaracter: 'Álgebra' },
      { ...asignatura('A-4', 3), nombreCaracter: 'Optativa' },
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.caracteresDisponibles()).toEqual(['Álgebra', 'Ética', 'Optativa']);
  });
});
