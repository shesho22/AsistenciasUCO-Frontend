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
    expect(fixture.nativeElement.querySelectorAll('tr[data-testid="malla-asignatura-fila"]')).toHaveSize(2);
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
    expect(emitidos).toHaveSize(0);
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

  it('EST-03 (S2871, CIERRE-W2A): los caracteres disponibles son los del catálogo recibido, ordenados, aunque la malla no los traiga', () => {
    TestBed.configureTestingModule({ imports: [StudyPlanMeshComponent] });
    const fixture = TestBed.createComponent(StudyPlanMeshComponent);
    fixture.componentRef.setInput('plan', plan);
    // La malla solo tiene filas optativas, pero el catálogo ofrece también los otros caracteres
    fixture.componentRef.setInput('asignaturas', [{ ...asignatura('A-1', 3), codigoCaracter: 'OPT', nombreCaracter: 'Optativa' }]);
    fixture.componentRef.setInput('caracteres', [
      { codigo: 'OPT', nombre: 'Optativa', orden: 2 },
      { codigo: 'ETI', nombre: 'Ética', orden: 3 },
      { codigo: 'OBL', nombre: 'Obligatoria', orden: 1 },
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.caracteresDisponibles()).toEqual([
      { codigo: 'OBL', nombre: 'Obligatoria', orden: 1 },
      { codigo: 'OPT', nombre: 'Optativa', orden: 2 },
      { codigo: 'ETI', nombre: 'Ética', orden: 3 },
    ]);
  });

  it('sin catálogo no inventa opciones a partir de las filas cargadas', () => {
    TestBed.configureTestingModule({ imports: [StudyPlanMeshComponent] });
    const fixture = TestBed.createComponent(StudyPlanMeshComponent);
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('asignaturas', [{ ...asignatura('A-1', 3), codigoCaracter: 'OPT', nombreCaracter: 'Optativa' }]);
    fixture.detectChanges();

    expect(fixture.componentInstance.caracteresDisponibles()).toEqual([]);
  });

  it('bloque E: muestra una tabla con una fila por asignatura y oculta las filas mientras carga', () => {
    TestBed.configureTestingModule({ imports: [StudyPlanMeshComponent] });
    const fixture = TestBed.createComponent(StudyPlanMeshComponent);
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('asignaturas', [asignatura('A-1', 3), asignatura('A-2', 4)]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-tabla-datos table')).not.toBeNull();
    const filas = el.querySelectorAll('tbody tr[data-testid="malla-asignatura-fila"]');
    expect(filas).toHaveSize(2);
    expect(filas[0].textContent).toContain('Asignatura A-1');
    expect(filas[0].textContent).toContain('Semestre 8');

    fixture.componentRef.setInput('cargando', true);
    fixture.detectChanges();
    expect(el.querySelectorAll('tr[data-testid="malla-asignatura-fila"]')).toHaveSize(0);
    expect(el.querySelector('[data-testid="tabla-datos-esqueleto"]')).not.toBeNull();
  });

  it('bloque E: por defecto pagina de a 15 y propaga el cambio de tamaño al contenedor', () => {
    TestBed.configureTestingModule({ imports: [StudyPlanMeshComponent] });
    const fixture = TestBed.createComponent(StudyPlanMeshComponent);
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('asignaturas', [asignatura('A-1', 3)]);
    fixture.componentRef.setInput('totalAsignaturas', 40);
    fixture.detectChanges();
    expect(fixture.componentInstance.pageSize()).toBe(15);
    const tamanos: number[] = [];
    fixture.componentInstance.pageSizeChange.subscribe((n) => tamanos.push(n));
    fixture.debugElement.query(By.directive(PaginationComponent)).componentInstance.pageSizeChange.emit(30);
    expect(tamanos).toEqual([30]);
  });
});

describe('StudyPlanMeshComponent (HU074 activar o inactivar asignaturas)', () => {
  const plan: PlanEstudioItem = {
    id: 'plan-1', codigo: 'INP-2024', nombre: 'Plan 2024', anioVigencia: 2024, programa: 'Ingeniería de Sistemas', facultad: '',
    totalCreditos: null, totalSemestres: 8, totalAsignaturas: null, estado: 'VIGENTE', descripcion: '',
  };
  const fila = (id: string, estaActivaAsignatura?: boolean): AsignaturaPlanItem => ({
    id, planEstudioId: 'plan-1', codigo: id, nombre: `Asignatura ${id}`, creditos: 3, semestre: 1, area: 'Software',
    componente: 'ESP', horasSemanales: 0, estaActivaAsignatura,
  });

  function crear(asignaturas: AsignaturaPlanItem[]) {
    TestBed.configureTestingModule({ imports: [StudyPlanMeshComponent] });
    const fixture = TestBed.createComponent(StudyPlanMeshComponent);
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('asignaturas', asignaturas);
    fixture.detectChanges();
    return fixture;
  }

  it('la acción de la fila dice Inactivar si la asignatura está activa y Activar si está inactiva', () => {
    const fixture = crear([fila('ACT-1', true), fila('INA-1', false), fila('SIN-1')]);
    const acciones = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('[data-accion="estado-asignatura"]')
    );
    expect(acciones.map((b) => b.title)).toEqual(['Inactivar asignatura', 'Activar asignatura', 'Inactivar asignatura']);
    expect(acciones[1].getAttribute('aria-label')).toBe('Activar la asignatura Asignatura INA-1');
  });

  it('muestra la insignia Inactiva solo en las asignaturas inactivas', () => {
    const fixture = crear([fila('ACT-1', true), fila('INA-1', false)]);
    const tarjetas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tr[data-testid="malla-asignatura-fila"]')).map(
      (fila) => fila.textContent ?? ''
    );
    expect(tarjetas[0]).not.toContain('Inactiva');
    expect(tarjetas[1]).toContain('Inactiva');
  });

  it('con estadoBloqueado la acción se deshabilita y solo la fila en curso lleva aria-busy', () => {
    const fixture = crear([fila('ACT-1', true), fila('INA-1', false)]);
    fixture.componentRef.setInput('estadoBloqueado', true);
    fixture.componentRef.setInput('idEstadoEnCurso', 'INA-1');
    fixture.detectChanges();
    const acciones = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('[data-accion="estado-asignatura"]')
    );
    expect(acciones.map((b) => b.disabled)).toEqual([true, true]);
    expect(acciones.map((b) => b.getAttribute('aria-busy'))).toEqual([null, 'true']);

    const emitidas: AsignaturaPlanItem[] = [];
    fixture.componentInstance.toggleEstadoSubject.subscribe((a) => emitidas.push(a));
    acciones[1].click();
    expect(emitidas).toEqual([]);
  });

  it('la acción emite la asignatura al contenedor', () => {
    const fixture = crear([fila('INA-1', false)]);
    const emitidas: AsignaturaPlanItem[] = [];
    fixture.componentInstance.toggleEstadoSubject.subscribe((a) => emitidas.push(a));
    (fixture.nativeElement.querySelector('[data-accion="estado-asignatura"]') as HTMLButtonElement).click();
    expect(emitidas.map((a) => a.id)).toEqual(['INA-1']);
  });
});
