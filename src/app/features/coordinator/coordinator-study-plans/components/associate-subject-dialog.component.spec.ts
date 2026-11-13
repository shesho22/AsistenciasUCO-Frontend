import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AssociateSubjectDialogComponent } from './associate-subject-dialog.component';
import { environment } from '../../../../../environments/environment';
import { PlanEstudioItem } from '../../../../core/models/role-management.model';
import { paginaApi, porUrl } from '../../../../core/testing/pagina-api';

describe('AssociateSubjectDialogComponent (F-COO-005, B2NM)', () => {
  let fixture: ComponentFixture<AssociateSubjectDialogComponent>;
  let component: AssociateSubjectDialogComponent;
  let http: HttpTestingController;

  const base = `${environment.apiUrl}/coordinador`;
  const urlAsociables = `${base}/planes-estudio/plan-1/asignaturas-asociables`;
  const urlAsociadas = `${base}/planes-estudio/plan-1/asignaturas-asociadas`;
  const plan: PlanEstudioItem = {
    id: 'plan-1', codigo: 'INP-2024', nombre: 'Plan 2024', anioVigencia: 2024, programa: 'Sistemas', facultad: '',
    totalCreditos: null, totalSemestres: 3, totalAsignaturas: null, estado: 'VIGENTE', descripcion: '',
  };
  const asociable = (id: string, codigo: string, nombre: string) => ({
    idAsignatura: id, codigo, nombre, credito: 3, nombreArea: 'Software', nombreComponente: 'Específica', planes: 'Software (Plan 2023)',
  });
  const caracteres = { exitoso: true, datos: [{ codigo: 'OBL', nombre: 'Obligatoria', orden: 1 }, { codigo: 'OPT', nombre: 'Optativa', orden: 2 }] };

  function crear(abierto = true): void {
    TestBed.configureTestingModule({ imports: [AssociateSubjectDialogComponent], providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AssociateSubjectDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('abierto', abierto);
    fixture.detectChanges();
  }

  /** Atiende la carga inicial del diálogo al abrirse: catálogo de carácter y primera página de asociables. */
  function cargarInicial(asociables = [asociable('a-1', 'SOF-310', 'Pruebas de Software'), asociable('a-2', 'SOF-320', 'Arquitectura')]): void {
    http.expectOne(`${base}/caracteres-asignatura`).flush(caracteres);
    const req = http.expectOne(porUrl(urlAsociables));
    expect(req.request.params.get('tamano')).toBe('5');
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.has('busqueda')).toBeFalse();
    req.flush(paginaApi(asociables, 1, 5));
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('cerrado no consulta nada; al abrirse carga el catálogo de carácter y los asociables', () => {
    crear(false);
    http.expectNone(`${base}/caracteres-asignatura`);
    fixture.componentRef.setInput('abierto', true);
    fixture.detectChanges();
    cargarInicial();
    expect(component.resultados().length).toBe(2);
    expect(component.caracteres().map((c) => c.codigo)).toEqual(['OBL', 'OPT']);
    expect(component.semestres()).toEqual([1, 2, 3]);
  });

  it('lista las asignaturas con etiquetas accesibles y no permite asociar sin elegir asignatura, semestre y carácter', () => {
    crear();
    cargarInicial();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('input[aria-label="Buscar asignatura asociable por código o nombre"]')).not.toBeNull();
    expect(el.querySelectorAll('input[type="radio"]').length).toBe(2);
    expect(el.textContent).toContain('SOF-310');
    expect(el.textContent).toContain('Software (Plan 2023)');
    // Los selects están dentro de un label: tienen nombre accesible.
    expect(Array.from(el.querySelectorAll('select')).every((s) => !!s.closest('label'))).toBeTrue();
    expect(component.puedeAsociar()).toBeFalse();

    component.seleccionar(component.resultados()[0]);
    component.semestre.set(2);
    expect(component.puedeAsociar()).toBeFalse();
    component.codigoCaracter.set('OPT');
    expect(component.puedeAsociar()).toBeTrue();
  });

  it('la búsqueda espera a que se deje de escribir, reinicia la página y envía busqueda', fakeAsync(() => {
    crear();
    cargarInicial();

    component.alBuscar('prue');
    component.alBuscar('pruebas');
    http.expectNone(porUrl(urlAsociables));
    tick(300);
    const req = http.expectOne(porUrl(urlAsociables));
    expect(req.request.params.get('busqueda')).toBe('pruebas');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush(paginaApi([asociable('a-1', 'SOF-310', 'Pruebas de Software')], 1, 5));
    expect(component.resultados().length).toBe(1);
  }));

  it('con más resultados que el tamaño de página pagina contra el servidor', () => {
    crear();
    http.expectOne(`${base}/caracteres-asignatura`).flush(caracteres);
    http.expectOne(porUrl(urlAsociables)).flush(paginaApi([asociable('a-1', 'A', 'A')], 1, 5, 12));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-pagination')).not.toBeNull();

    component.irAPagina(2);
    const req = http.expectOne(porUrl(urlAsociables));
    expect(req.request.params.get('pagina')).toBe('2');
    req.flush(paginaApi([asociable('a-9', 'Z', 'Z')], 2, 5, 12));
    expect(component.resultados()[0].codigo).toBe('Z');
  });

  it('sin resultados informa que no hay asignaturas disponibles', () => {
    crear();
    cargarInicial([]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hay asignaturas disponibles');
  });

  it('asocia con idAsignatura, semestreNumero y codigoCaracter y emite asociada', () => {
    crear();
    cargarInicial();
    let asociada = 0;
    component.asociada.subscribe(() => asociada++);

    component.seleccionar(component.resultados()[1]);
    component.semestre.set(3);
    component.codigoCaracter.set('OBL');
    component.asociar();

    const req = http.expectOne(urlAsociadas);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ idAsignatura: 'a-2', semestreNumero: 3, codigoCaracter: 'OBL' });
    req.flush({ exitoso: true, datos: null }, { status: 201, statusText: 'Created' });

    expect(asociada).toBe(1);
    expect(component.guardando()).toBeFalse();
    expect(component.error()).toBeNull();
  });

  it('un 409 (ASI_003) muestra el mensaje del backend, no emite asociada y deja el diálogo abierto', () => {
    crear();
    cargarInicial();
    let asociada = 0;
    component.asociada.subscribe(() => asociada++);

    component.seleccionar(component.resultados()[0]);
    component.semestre.set(1);
    component.codigoCaracter.set('OBL');
    component.asociar();
    http.expectOne(urlAsociadas).flush({ code: 'ASI_003', message: 'La asignatura ya pertenece a este plan.' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(asociada).toBe(0);
    expect(component.error()).toBe('La asignatura ya pertenece a este plan.');
    expect(component.guardando()).toBeFalse();
    const alerta = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('La asignatura ya pertenece a este plan.');
  });

  it('asociar sin selección completa no llama al backend', () => {
    crear();
    cargarInicial();
    component.asociar();
    http.expectNone(urlAsociadas);
  });

  it('un error al buscar muestra el mensaje y deja la lista vacía', () => {
    crear();
    http.expectOne(`${base}/caracteres-asignatura`).flush(caracteres);
    http.expectOne(porUrl(urlAsociables)).flush({ code: 'PLA_002', message: 'El plan no existe.' }, { status: 404, statusText: 'Not Found' });
    expect(component.resultados()).toEqual([]);
    expect(component.error()).toBe('El plan no existe.');
  });

  it('un error al cargar el catálogo de carácter muestra el mensaje', () => {
    crear();
    http.expectOne(`${base}/caracteres-asignatura`).flush({ code: 'ERR', message: 'Catálogo no disponible.' }, { status: 500, statusText: 'Error' });
    http.expectOne(porUrl(urlAsociables)).flush(paginaApi([], 1, 5));
    expect(component.error()).toBe('Catálogo no disponible.');
  });

  it('Cancelar emite cerrado', () => {
    crear();
    cargarInicial();
    let cerrado = 0;
    component.cerrado.subscribe(() => cerrado++);
    const cancelar = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => b.textContent?.includes('Cancelar')) as HTMLButtonElement;
    cancelar.click();
    expect(cerrado).toBe(1);
  });
});
