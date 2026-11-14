import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudyPlanFormComponent } from './study-plan-form.component';
import { PlanEstudioItem } from '../../../../core/models/role-management.model';
import { mensajeUi } from '../../../../core/messages/mensajes-ui';

/** HU079/HU080: el formulario pide solo el INP porque es el único dato que acepta el backend. */
describe('StudyPlanFormComponent', () => {
  let fixture: ComponentFixture<StudyPlanFormComponent>;
  let component: StudyPlanFormComponent;
  let emitidos: number[];

  const planExistente: PlanEstudioItem = {
    id: 'plan-1',
    codigo: 'INP-2024',
    nombre: 'Plan 2024',
    anioVigencia: 2024,
    programa: 'Ingenieria de Sistemas',
    facultad: '',
    totalCreditos: null,
    totalSemestres: 8,
    totalAsignaturas: null,
    estado: 'VIGENTE',
    descripcion: '',
  };

  function crear(modo: 'CREAR' | 'EDITAR', plan: PlanEstudioItem | null = null): void {
    TestBed.configureTestingModule({ imports: [StudyPlanFormComponent] });
    fixture = TestBed.createComponent(StudyPlanFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('modo', modo);
    fixture.componentRef.setInput('plan', plan);
    emitidos = [];
    component.save.subscribe((inp) => emitidos.push(inp));
    fixture.detectChanges();
  }

  it('solo muestra el campo INP: no pide código, nombre, facultad, semestres ni créditos', () => {
    crear('CREAR');
    const texto = fixture.nativeElement.textContent as string;
    expect(fixture.nativeElement.querySelectorAll('input').length).toBe(1);
    expect(texto).toContain('INP del plan');
    expect(texto).not.toContain('Código del Plan');
    expect(texto).not.toContain('Total de Créditos');
    expect(texto).not.toContain('Facultad');
  });

  it('en CREAR empieza vacío, sin error visible y sin permitir guardar', () => {
    crear('CREAR');
    expect(component.inpValido()).toBeFalse();
    expect(component.inpInvalido()).toBeFalse();
    component.guardar();
    expect(emitidos).toEqual([]);
  });

  it('emite el INP como número cuando es un entero positivo', () => {
    crear('CREAR');
    component.inp.set('2027');
    component.guardar();
    expect(emitidos).toEqual([2027]);
  });

  for (const invalido of [0, -5, 2027.5]) {
    it(`rechaza ${invalido}: muestra el mensaje del catálogo y no emite`, () => {
      crear('CREAR');
      component.inp.set(invalido);
      fixture.detectChanges();
      const alerta = fixture.nativeElement.querySelector('p[role="alert"]') as HTMLElement | null;
      expect(alerta?.textContent).toContain(mensajeUi('UI_STUDY_PLAN_FORM_001'));
      component.guardar();
      expect(emitidos).toEqual([]);
    });
  }

  it('en EDITAR precarga el INP del plan y muestra su programa', () => {
    crear('EDITAR', planExistente);
    expect(component.inp()).toBe(2024);
    expect(fixture.nativeElement.textContent).toContain('Ingenieria de Sistemas');
  });

  it('en EDITAR precarga el INP aunque el plan llegue después de crear el formulario', () => {
    crear('EDITAR', null);
    expect(component.inp()).toBeNull();
    fixture.componentRef.setInput('plan', planExistente);
    fixture.detectChanges();
    expect(component.inp()).toBe(2024);
  });

  it('en EDITAR no pisa lo que el usuario ya escribió si el plan se vuelve a recibir', () => {
    crear('EDITAR', planExistente);
    component.inp.set(2030);
    fixture.componentRef.setInput('plan', { ...planExistente });
    fixture.detectChanges();
    expect(component.inp()).toBe(2030);
  });
});
