import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudyPlansListComponent } from './study-plans-list.component';
import { PlanEstudioItem } from '../../../../core/models/role-management.model';

describe('StudyPlansListComponent (CULM-001, densidad de acciones)', () => {
  let fixture: ComponentFixture<StudyPlansListComponent>;
  let component: StudyPlansListComponent;

  const plan = (id: string, estado: 'VIGENTE' | 'INACTIVO'): PlanEstudioItem =>
    ({
      id,
      nombre: `Plan ${id}`,
      programa: 'Sistemas',
      facultad: 'Ingenieria',
      descripcion: 'Descripcion',
      totalSemestres: 10,
      totalCreditos: 160,
      totalAsignaturas: 40,
      estado,
    }) as unknown as PlanEstudioItem;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = (s: string): HTMLElement | null => root().querySelector(s);

  function crear(planes: PlanEstudioItem[]): void {
    fixture = TestBed.createComponent(StudyPlansListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('planes', planes);
    fixture.detectChanges();
  }
  function abrirMenu(): void {
    q('[data-testid="acciones-plan"] [data-testid="action-menu-trigger"]')!.click();
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [StudyPlansListComponent] }));

  it('cada tarjeta deja "Plan de Estudio & Asignaturas" visible y un menu; Editar y Activar/Inactivar no estan sueltos', () => {
    crear([plan('a', 'VIGENTE')]);
    const acciones = q('[data-testid="acciones-plan"]') as HTMLElement;
    expect(acciones.querySelectorAll('button')).toHaveSize(2);
    expect(acciones.textContent).toContain('Plan de Estudio & Asignaturas');
    expect(acciones.textContent).not.toContain('Editar');
    expect(acciones.textContent).not.toContain('Inactivar');
  });

  it('"Plan de Estudio & Asignaturas" emite viewMalla con el plan', () => {
    const p = plan('a', 'VIGENTE');
    crear([p]);
    const emitidos: PlanEstudioItem[] = [];
    component.viewMalla.subscribe((x) => emitidos.push(x));
    (q('[data-testid="plan-malla"] button') as HTMLButtonElement).click();
    expect(emitidos).toEqual([p]);
  });

  it('el menu emite editPlan y toggleEstado con el plan', () => {
    const p = plan('a', 'VIGENTE');
    crear([p]);
    const editados: PlanEstudioItem[] = [];
    const alternados: PlanEstudioItem[] = [];
    component.editPlan.subscribe((x) => editados.push(x));
    component.toggleEstado.subscribe((x) => alternados.push(x));
    abrirMenu();
    (q('[data-testid="plan-editar"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    abrirMenu();
    (q('[data-testid="plan-estado"]') as HTMLButtonElement).click();
    expect(editados).toEqual([p]);
    expect(alternados).toEqual([p]);
  });

  it('la accion de estado dice Inactivar en un plan vigente y Activar en uno inactivo', () => {
    crear([plan('a', 'VIGENTE'), plan('b', 'INACTIVO')]);
    const disparadores = root().querySelectorAll<HTMLButtonElement>('[data-testid="acciones-plan"] [data-testid="action-menu-trigger"]');
    disparadores[0].click();
    fixture.detectChanges();
    expect(q('[data-testid="plan-estado"]')?.textContent).toContain('Inactivar plan');
    disparadores[0].click();
    fixture.detectChanges();
    disparadores[1].click();
    fixture.detectChanges();
    expect(q('[data-testid="plan-estado"]')?.textContent).toContain('Activar plan');
  });

  it('MEJORAS-SERGIO 7: el menu "Más" flota para que el marco desplazable de la tabla no lo recorte', () => {
    crear([plan('a', 'VIGENTE')]);
    abrirMenu();
    const panel = q('[role="menu"]');
    expect(panel).withContext('panel del menu abierto').not.toBeNull();
    expect(panel!.className).toContain('fixed');
  });

  it('bloque E: muestra una tabla con una fila por plan y conserva los testids de acciones', () => {
    crear([plan('a', 'VIGENTE'), plan('b', 'INACTIVO')]);
    expect(q('app-tabla-datos table')).not.toBeNull();
    expect(root().querySelectorAll('tbody tr[data-testid="plan-fila"]')).toHaveSize(2);
    expect(root().querySelectorAll('tr[data-testid="plan-fila"] [data-testid="acciones-plan"]')).toHaveSize(2);
    expect(root().querySelectorAll('tr[data-testid="plan-fila"] [data-testid="plan-malla"]')).toHaveSize(2);
    expect(q('app-card')).toBeNull();
  });

  it('bloque E: pagina de a 15 en el cliente', () => {
    const muchos = Array.from({ length: 20 }, (_, i) => plan(`p${i}`, 'VIGENTE'));
    crear(muchos);
    expect(root().querySelectorAll('tr[data-testid="plan-fila"]')).toHaveSize(15);
    component.currentPage.set(2);
    fixture.detectChanges();
    expect(root().querySelectorAll('tr[data-testid="plan-fila"]')).toHaveSize(5);
  });

  it('bloque E: sin planes muestra el mensaje vacio de la tabla', () => {
    crear([]);
    expect(q('[data-testid="tabla-datos-vacia"]')?.textContent).toContain('No hay planes de estudio registrados.');
  });
});
