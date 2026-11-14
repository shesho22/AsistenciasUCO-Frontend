import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubjectFormComponent } from './subject-form.component';
import { AreaConocimientoItem, AsignaturaPlanItem, CaracterAsignatura, PlanEstudioItem } from '../../../../core/models/role-management.model';
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

  const caracteres: CaracterAsignatura[] = [
    { codigo: 'OBL', nombre: 'Obligatoria', orden: 1 },
    { codigo: 'OPT', nombre: 'Optativa', orden: 2 },
  ];

  function crear(asignatura: AsignaturaPlanItem | null = null): void {
    fixture = TestBed.createComponent(SubjectFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('componentes', componentes);
    fixture.componentRef.setInput('areas', areas);
    fixture.componentRef.setInput('caracteres', caracteres);
    if (asignatura) {
      fixture.componentRef.setInput('modo', 'EDITAR');
      fixture.componentRef.setInput('asignatura', asignatura);
    }
    fixture.detectChanges();
  }

  function completar(): void {
    component.asigForm = {
      codigo: 'SIS-301', nombre: 'Bases de Datos', creditos: 4, semestre: 2,
      area: 'Ingeniería de Software', componente: 'Específicas', horasSemanales: 4, codigoCaracter: 'OBL',
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
    // B2NM: "Obligatoria" ahora es un carácter del plan, pero no una opción del componente de formación.
    expect(componente.textContent).not.toContain('Obligatoria');
  });

  it('B2NM: ofrece el select Carácter con el catálogo y lo exige para guardar', () => {
    crear();
    const host = fixture.nativeElement as HTMLElement;
    const caracter = host.querySelector('select[aria-label="Carácter en el plan"]') as HTMLSelectElement;
    expect(Array.from(caracter.options).map((o) => o.textContent?.trim())).toEqual([
      'Selecciona el carácter', 'Obligatoria', 'Optativa',
    ]);
    expect(component.asigForm.codigoCaracter).toBe('');

    completar();
    component.asigForm.codigoCaracter = '';
    expect(component.formularioValido()).toBeFalse();
    component.asigForm.codigoCaracter = 'OPT';
    expect(component.formularioValido()).toBeTrue();
  });

  it('B2NM: emite el codigoCaracter elegido', () => {
    crear();
    const emitidos: { datos: Partial<AsignaturaPlanItem> }[] = [];
    component.save.subscribe((e) => emitidos.push(e));
    completar();
    component.asigForm.codigoCaracter = 'OPT';
    component.guardar();
    expect(emitidos[0].datos.codigoCaracter).toBe('OPT');
  });

  it('no tiene créditos por defecto y exige créditos enteros mayores que cero', () => {
    crear();
    expect(component.asigForm.creditos).toBeNull();
    completar();
    expect(component.formularioValido()).toBeTrue();

    for (const creditos of [null, 0, -2, 2.5, 11]) {
      component.asigForm.creditos = creditos;
      expect(component.formularioValido()).withContext(String(creditos)).toBeFalse();
    }
  });

  // DEC-073: créditos de 1 a 10; código y nombre en texto seguro.
  it('DEC-073: muestra el error de créditos fuera de 1 a 10 y de código o nombre con < > o comillas', () => {
    crear();
    completar();
    component.asigForm.creditos = 10;
    expect(component.errorCreditos()).toBe('');
    expect(component.formularioValido()).toBeTrue();

    component.asigForm.creditos = 11;
    expect(component.errorCreditos()).toBe('El campo Créditos debe estar entre 1 y 10.');

    component.asigForm.creditos = 3;
    component.asigForm.nombre = 'Bases "avanzadas"';
    expect(component.errorNombre()).toContain('solo admite');
    expect(component.formularioValido()).toBeFalse();

    component.asigForm.nombre = 'Bases de Datos';
    component.asigForm.codigo = '<SIS>';
    expect(component.errorCodigo()).toContain('solo admite');
    expect(component.formularioValido()).toBeFalse();
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
      area: 'Ingeniería de Software', componente: 'Básicas', horasSemanales: 4, codigoCaracter: 'OBL',
    });
    expect(component.asigForm.componente).toBe('Básicas');
    expect(component.asigForm.codigoCaracter).toBe('OBL');
    expect(component.formularioValido()).toBeTrue();
  });
});
