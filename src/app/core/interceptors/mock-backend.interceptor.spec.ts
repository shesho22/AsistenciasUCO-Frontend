import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { mockBackendInterceptor } from './mock-backend.interceptor';
import { mockStore } from '../mocks/mock-data-store';

describe('mockBackendInterceptor', () => {
  let httpClient: HttpClient;
  let http: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
        provideHttpClient(withInterceptors([mockBackendInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    auth.setMockMode(false);
  });

  afterEach(() => {
    localStorage.removeItem('USE_MOCKS');
    http.verify();
  });

  it('en modo mock no deja pasar a red una ruta API sin simulación', () => {
    auth.setMockMode(true);
    let error: HttpErrorResponse | undefined;
    httpClient.get(`${environment.apiUrl}/ruta-no-simulada`).subscribe({ error: (value) => (error = value) });

    expect(error?.status).toBe(501);
    expect(error?.error?.code).toBe('MOCK_ROUTE_NOT_IMPLEMENTED');
    http.expectNone(`${environment.apiUrl}/ruta-no-simulada`);
  });

  it('el cambio a real en runtime deja continuar la petición y no conserva el token mock', () => {
    auth.setMockMode(true);
    auth.loginAsMockUser('DOCENTE', false);
    auth.setMockMode(false);

    httpClient.get(`${environment.apiUrl}/probe`).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/probe`);
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({ exitoso: true, datos: [] });
  });

  it('en modo mock no intercepta recursos externos', () => {
    auth.setMockMode(true);
    httpClient.get('https://cdn.example.test/font.css').subscribe();
    const request = http.expectOne('https://cdn.example.test/font.css');
    request.flush('body');
  });

  it('simula endpoints de administración (decanos, sedes, espacios, facultades, áreas)', fakeAsync(() => {
    auth.setMockMode(true);

    // Decanos
    let decanosRes: any;
    httpClient.get(`${environment.apiUrl}/admin/decanos`).subscribe((r) => (decanosRes = r));
    tick(300);
    expect(decanosRes?.exitoso).toBeTrue();

    let postDecanoRes: any;
    httpClient.post(`${environment.apiUrl}/admin/decanos`, { nombres: 'Nuevo', apellidos: 'Decano' }).subscribe((r) => (postDecanoRes = r));
    tick(350);
    expect(postDecanoRes?.exitoso).toBeTrue();

    const decanoId = mockStore.decanos[0].id;
    let toggleDecanoRes: any;
    httpClient.patch(`${environment.apiUrl}/admin/decanos/${decanoId}/toggle`, {}).subscribe((r) => (toggleDecanoRes = r));
    tick(250);
    expect(toggleDecanoRes?.exitoso).toBeTrue();

    // Sedes
    let sedesRes: any;
    httpClient.get(`${environment.apiUrl}/admin/sedes`).subscribe((r) => (sedesRes = r));
    tick(250);
    expect(sedesRes?.exitoso).toBeTrue();

    let postSedeRes: any;
    httpClient.post(`${environment.apiUrl}/admin/sedes`, { nombre: 'Sede Oriente', codigo: 'SED-ORI' }).subscribe((r) => (postSedeRes = r));
    tick(300);
    expect(postSedeRes?.exitoso).toBeTrue();

    const sedeId = mockStore.sedes[0].id;
    let putSedeRes: any;
    httpClient.put(`${environment.apiUrl}/admin/sedes/${sedeId}`, { nombre: 'Sede Modificada' }).subscribe((r) => (putSedeRes = r));
    tick(300);
    expect(putSedeRes?.exitoso).toBeTrue();

    let patchSedeRes: any;
    httpClient.patch(`${environment.apiUrl}/admin/sedes/${sedeId}/estado`, {}).subscribe((r) => (patchSedeRes = r));
    tick(250);
    expect(patchSedeRes?.exitoso).toBeTrue();

    // Espacios Físicos
    let espaciosRes: any;
    httpClient.get(`${environment.apiUrl}/admin/espacios-fisicos`).subscribe((r) => (espaciosRes = r));
    tick(250);
    expect(espaciosRes?.exitoso).toBeTrue();

    let postEspacioRes: any;
    httpClient.post(`${environment.apiUrl}/admin/espacios-fisicos`, { nombre: 'Aula 101', sedeId: sedeId }).subscribe((r) => (postEspacioRes = r));
    tick(300);
    expect(postEspacioRes?.exitoso).toBeTrue();

    const espacioId = mockStore.espaciosFisicos[0].id;
    let putEspacioRes: any;
    httpClient.put(`${environment.apiUrl}/admin/espacios-fisicos/${espacioId}`, { nombre: 'Aula 101 Renovada' }).subscribe((r) => (putEspacioRes = r));
    tick(300);
    expect(putEspacioRes?.exitoso).toBeTrue();

    let patchEspacioRes: any;
    httpClient.patch(`${environment.apiUrl}/admin/espacios-fisicos/${espacioId}/estado`, {}).subscribe((r) => (patchEspacioRes = r));
    tick(250);
    expect(patchEspacioRes?.exitoso).toBeTrue();

    // Facultades
    let facRes: any;
    httpClient.get(`${environment.apiUrl}/admin/facultades`).subscribe((r) => (facRes = r));
    tick(250);
    expect(facRes?.exitoso).toBeTrue();

    let postFacRes: any;
    httpClient.post(`${environment.apiUrl}/admin/facultades`, { nombre: 'Facultad Nueva' }).subscribe((r) => (postFacRes = r));
    tick(300);
    expect(postFacRes?.exitoso).toBeTrue();

    const facId = mockStore.facultades[0].id;
    let putFacRes: any;
    httpClient.put(`${environment.apiUrl}/admin/facultades/${facId}`, { nombre: 'Facultad Editada' }).subscribe((r) => (putFacRes = r));
    tick(300);
    expect(putFacRes?.exitoso).toBeTrue();

    let patchFacRes: any;
    httpClient.patch(`${environment.apiUrl}/admin/facultades/${facId}/estado`, {}).subscribe((r) => (patchFacRes = r));
    tick(250);
    expect(patchFacRes?.exitoso).toBeTrue();

    // Áreas
    let areasRes: any;
    httpClient.get(`${environment.apiUrl}/admin/areas`).subscribe((r) => (areasRes = r));
    tick(250);
    expect(areasRes?.exitoso).toBeTrue();

    let postAreaRes: any;
    httpClient.post(`${environment.apiUrl}/admin/areas`, { nombre: 'Área Nueva', facultadId: facId }).subscribe((r) => (postAreaRes = r));
    tick(300);
    expect(postAreaRes?.exitoso).toBeTrue();

    const areaId = mockStore.areasConocimiento[0].id;
    let putAreaRes: any;
    httpClient.put(`${environment.apiUrl}/admin/areas/${areaId}`, { nombre: 'Área Editada' }).subscribe((r) => (putAreaRes = r));
    tick(300);
    expect(putAreaRes?.exitoso).toBeTrue();

    let patchAreaRes: any;
    httpClient.patch(`${environment.apiUrl}/admin/areas/${areaId}/estado`, {}).subscribe((r) => (patchAreaRes = r));
    tick(250);
    expect(patchAreaRes?.exitoso).toBeTrue();
  }));

  it('simula parámetros, auditoría, cierre masivo e instituciones', fakeAsync(() => {
    auth.setMockMode(true);

    let paramRes: any;
    httpClient.get(`${environment.apiUrl}/admin/parametros`).subscribe((r) => (paramRes = r));
    tick(200);
    expect(paramRes?.exitoso).toBeTrue();

    const paramId = mockStore.parametros[0].id;
    let patchParamRes: any;
    httpClient.patch(`${environment.apiUrl}/admin/parametros/${paramId}`, { valor: '99' }).subscribe((r) => (patchParamRes = r));
    tick(200);
    expect(patchParamRes?.exitoso).toBeTrue();

    let audRes: any;
    httpClient.get(`${environment.apiUrl}/admin/auditoria`).subscribe((r) => (audRes = r));
    tick(250);
    expect(audRes?.exitoso).toBeTrue();

    let cierreRes: any;
    httpClient.post(`${environment.apiUrl}/admin/cierre-masivo`, { idPeriodoAcademico: 'per-2026' }).subscribe((r) => (cierreRes = r));
    tick(400);
    expect(cierreRes?.exitoso).toBeTrue();

    let instRes: any;
    httpClient.get(`${environment.apiUrl}/admin/instituciones`).subscribe((r) => (instRes = r));
    tick(250);
    expect(instRes?.exitoso).toBeTrue();

    let postInstRes: any;
    httpClient.post(`${environment.apiUrl}/admin/instituciones`, { nombre: 'UCO Nueva' }).subscribe((r) => (postInstRes = r));
    tick(300);
    expect(postInstRes?.exitoso).toBeTrue();

    const instId = mockStore.instituciones[0].id;
    let patchInstRes: any;
    httpClient.patch(`${environment.apiUrl}/admin/instituciones/${instId}/toggle-estado`, {}).subscribe((r) => (patchInstRes = r));
    tick(250);
    expect(patchInstRes?.exitoso).toBeTrue();
  }));

  it('simula endpoints de decano, estudiante y coordinador', fakeAsync(() => {
    auth.setMockMode(true);

    // Decano
    let coordRes: any;
    httpClient.get(`${environment.apiUrl}/decano/coordinadores`).subscribe((r) => (coordRes = r));
    tick(300);
    expect(coordRes?.exitoso).toBeTrue();

    let postCoordRes: any;
    httpClient.post(`${environment.apiUrl}/decano/coordinadores`, { nombres: 'Coord', apellidos: 'Nuevo' }).subscribe((r) => (postCoordRes = r));
    tick(350);
    expect(postCoordRes?.exitoso).toBeTrue();

    const coordId = mockStore.coordinadores[0].id;
    let toggleCoordRes: any;
    httpClient.patch(`${environment.apiUrl}/decano/coordinadores/${coordId}/toggle`, {}).subscribe((r) => (toggleCoordRes = r));
    tick(250);
    expect(toggleCoordRes?.exitoso).toBeTrue();

    let putCoordRes: any;
    httpClient.put(`${environment.apiUrl}/decano/coordinadores/${coordId}`, { telefono: '123' }).subscribe((r) => (putCoordRes = r));
    tick(300);
    expect(putCoordRes?.exitoso).toBeTrue();

    let patchCoordFacRes: any;
    httpClient.patch(`${environment.apiUrl}/decano/coordinadores/${coordId}/facultad`, { nuevaFacultad: 'Ingeniería' }).subscribe((r) => (patchCoordFacRes = r));
    tick(300);
    expect(patchCoordFacRes?.exitoso).toBeTrue();

    // Estudiante
    let horEstRes: any;
    httpClient.get(`${environment.apiUrl}/estudiante/horarios`).subscribe((r) => (horEstRes = r));
    tick(300);
    expect(horEstRes?.exitoso).toBeTrue();

    let matEstRes: any;
    httpClient.get(`${environment.apiUrl}/estudiante/materias`).subscribe((r) => (matEstRes = r));
    tick(300);
    expect(matEstRes?.exitoso).toBeTrue();

    let sesMatRes: any;
    httpClient.get(`${environment.apiUrl}/estudiante/materias/mat-1/sesiones`).subscribe((r) => (sesMatRes = r));
    tick(250);
    expect(sesMatRes?.exitoso).toBeTrue();

    let prereqRes: any;
    httpClient.get(`${environment.apiUrl}/estudiante/materias/mat-1/prerrequisitos`).subscribe((r) => (prereqRes = r));
    tick(250);
    expect(prereqRes?.exitoso).toBeTrue();

    let matrGrupoRes: any;
    httpClient.post(`${environment.apiUrl}/estudiante/matricular-grupo`, { codigo: 'G-1' }).subscribe((r) => (matrGrupoRes = r));
    tick(300);
    expect(matrGrupoRes?.exitoso).toBeTrue();

    let cupoRes: any;
    httpClient.post(`${environment.apiUrl}/estudiante/cupos/solicitar`, { cursoNombre: 'Física' }).subscribe((r) => (cupoRes = r));
    tick(350);
    expect(cupoRes?.exitoso).toBeTrue();

    // Coordinador
    let docCoordRes: any;
    httpClient.get(`${environment.apiUrl}/coordinador/docentes`).subscribe((r) => (docCoordRes = r));
    tick(300);
    expect(docCoordRes?.exitoso).toBeTrue();

    let postDocRes: any;
    httpClient.post(`${environment.apiUrl}/coordinador/docentes`, { nombres: 'Docente', apellidos: 'Nuevo' }).subscribe((r) => (postDocRes = r));
    tick(350);
    expect(postDocRes?.exitoso).toBeTrue();

    const docId = mockStore.docentes[0].id;
    let toggleDocRes: any;
    httpClient.patch(`${environment.apiUrl}/coordinador/docentes/${docId}/toggle`, {}).subscribe((r) => (toggleDocRes = r));
    tick(250);
    expect(toggleDocRes?.exitoso).toBeTrue();

    let planesRes: any;
    httpClient.get(`${environment.apiUrl}/coordinador/planes-estudio`).subscribe((r) => (planesRes = r));
    tick(300);
    expect(planesRes?.exitoso).toBeTrue();

    let postPlanRes: any;
    httpClient.post(`${environment.apiUrl}/coordinador/planes-estudio`, { codigo: 'PLAN-2027', nombre: 'Plan 2027' }).subscribe((r) => (postPlanRes = r));
    tick(350);
    expect(postPlanRes?.exitoso).toBeTrue();

    const planId = mockStore.planesEstudio[0].id;
    let putPlanRes: any;
    httpClient.put(`${environment.apiUrl}/coordinador/planes-estudio/${planId}`, { nombre: 'Plan 2027 Modificado' }).subscribe((r) => (putPlanRes = r));
    tick(300);
    expect(putPlanRes?.exitoso).toBeTrue();

    let patchPlanRes: any;
    httpClient.patch(`${environment.apiUrl}/coordinador/planes-estudio/${planId}/toggle`, {}).subscribe((r) => (patchPlanRes = r));
    tick(250);
    expect(patchPlanRes?.exitoso).toBeTrue();
  }));
});

