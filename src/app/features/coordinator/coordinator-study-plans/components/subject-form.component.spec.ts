import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubjectFormComponent } from './subject-form.component';
import { AreaConocimientoItem, AsignaturaPlanItem, PlanEstudioItem } from '../../../../core/models/role-management.model';
import { ComponenteFormacionItem } from '../../../../core/models/consultas-transversales.model';

describe('SubjectFormComponent (HU147 / P5)', () => {
  let fixture: ComponentFixture<SubjectFormComponent>;
  let component: SubjectFormComponent;

  const plan: PlanEstudioItem = {
    id: 'PLAN-1', codigo: 'PLAN-1', nombre: 'Sistemas', anioVigencia: 2024, programa: 'Sistemas',
    facultad: 'Ingeniería', totalSemestres: 3, totalCreditos: 0, totalAsignaturas: 0, estado: 'VIGENTE', descripcion: '',
  };
  const componentes: ComponenteFormacionItem[] = [
    { idComponente: 'CMP-BAS', codigo: 'BAS', nombre: 'Básicas', totalAsignaturas: 0 },
    { idComponente: 'CMP-ESP', codigo: 'ESP', nombre: 'Específicas', totalAsignaturas: 0 },
  ];
  const areas: AreaConocimientoItem[] = [
    { id: 'AR-1', codigo: 'ISW', nombre: 'Ingeniería de Software', activa: true },
    { id: 'AR-2', codigo: 'OLD', nombre: 'Área inactiva', activa: false },
  ];

  function crear(asignatura: AsignaturaPlanItem | null = null): void {
    fixture = TestBed.createComponent(SubjectFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('componentes', componentes);
    fixture.componentRef.setInput('areas', areas);
    if (asignatura) {
      fixture.componentRef.setInput('modo', 'EDITAR');
      fixture.componentRef.setInput('asignatura', asignatura);
    }
    fixture.detectChanges();
  }

  function completar(): void {
    component.asigForm = {
      codigo: 'SIS-301', nombre: 'Bases de Datos', creditos: 4, semestre: 2,
      area: 'Ingeniería de Software', componente: 'Específicas', horasSemanales: 4,
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SubjectFormComponent] });
  });

  it('ofrece solo los componentes reales, las áreas activas y los semestres del plan', () => {
    crear();
    const host = fixture.nativeElement as HTMLElement;
    const componente = host.querySelector('select[aria-label="Componente de formación"]') as HTMLSelectElement;
    const area = host.querySelector('select[aria-label="Área de conocimiento"]') as HTMLSelectElement;

    expect(Array.from(componente.options).map((o) => o.textContent?.trim())).toEqual([
      'Selecciona un componente', 'BAS · Básicas', 'ESP · Específicas',
    ]);
    expect(Array.from(area.options).map((o) => o.value)).toEqual(['', 'Ingeniería de Software']);
    expect(component.semestresPlan()).toEqual([1, 2, 3]);
    expect(host.textContent).not.toContain('Obligatoria');
  });

  it('no tiene créditos por defecto y exige créditos enteros mayores que cero', () => {
    crear();
    expect(component.asigForm.creditos).toBeNull();
    completar();
    expect(component.formularioValido()).toBeTrue();

    for (const creditos of [null, 0, -2, 2.5]) {
      component.asigForm.creditos = creditos;
      expect(component.formularioValido()).withContext(String(creditos)).toBeFalse();
    }
  });

  it('exige área, componente y un semestre que exista en el plan', () => {
    crear();
    completar();
    component.asigForm.area = '';
    expect(component.formularioValido()).toBeFalse();
    completar();
    component.asigForm.componente = '';
    expect(component.formularioValido()).toBeFalse();
    completar();
    component.asigForm.semestre = 4;
    expect(component.formularioValido()).toBeFalse();
  });

  it('emite los datos con créditos numéricos y no emite si el formulario es inválido', () => {
    crear();
    const emitidos: unknown[] = [];
    component.save.subscribe((e) => emitidos.push(e));

    component.guardar();
    expect(emitidos.length).toBe(0);

    completar();
    component.asigForm.creditos = '5' as unknown as number;
    component.guardar();
    expect(emitidos).toEqual([
      jasmine.objectContaining({ datos: jasmine.objectContaining({ creditos: 5, componente: 'Específicas' }) }),
    ]);
  });

  it('en edición conserva el área y el componente que llegan del backend', () => {
    crear({
      id: 'A1', planEstudioId: 'PLAN-1', codigo: 'SIS-1', nombre: 'Cálculo', creditos: 3, semestre: 1,
      area: 'Ingeniería de Software', componente: 'Básicas', horasSemanales: 4,
    });
    expect(component.asigForm.componente).toBe('Básicas');
    expect(component.formularioValido()).toBeTrue();
  });
});
