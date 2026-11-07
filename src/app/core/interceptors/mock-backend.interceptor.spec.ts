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

  it('simula endpoints de administración (decanos, facultades, áreas)', fakeAsync(() => {
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

    // HU161/HU162/HU164 descartadas: el mock ya no simula escrituras de instituciones.
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
    // HU121-HU122 D6: la ruta del estado del coordinador es PATCH .../estado con estaActivo explicito (antes /toggle).
    httpClient.patch(`${environment.apiUrl}/decano/coordinadores/${coordId}/estado`, { estaActivo: false }).subscribe((r) => (toggleCoordRes = r));
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


    let matrGrupoRes: any;
    httpClient.post(`${environment.apiUrl}/estudiante/matricular-grupo`, { codigo: 'G-1' }).subscribe((r) => (matrGrupoRes = r));
    tick(300);
    expect(matrGrupoRes?.exitoso).toBeTrue();

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
    let resumenDocRes: any;
    httpClient.get(`${environment.apiUrl}/coordinador/docentes/resumen`).subscribe((r) => (resumenDocRes = r));
    tick(250);
    expect(resumenDocRes?.datos.totalDocentes).toBe(mockStore.docentes.length);

    let fichaDocRes: any;
    httpClient.get(`${environment.apiUrl}/coordinador/docentes/${docId}/ficha`).subscribe((r) => (fichaDocRes = r));
    tick(300);
    expect(fichaDocRes?.datos.historial.length).toBe(2);
    expect(fichaDocRes?.datos.resumen.gruposVigentes).toBe(1);

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
    httpClient.patch(`${environment.apiUrl}/coordinador/planes-estudio/${planId}/toggle-estado`, {}).subscribe((r) => (patchPlanRes = r));
    tick(250);
    expect(patchPlanRes?.exitoso).toBeTrue();

    const semestresIniciales = mockStore.planesEstudio[0].totalSemestres;
    let postSemRes: any;
    httpClient.post(`${environment.apiUrl}/coordinador/planes-estudio/${planId}/semestres`, {}).subscribe((r) => (postSemRes = r));
    tick(250);
    expect(postSemRes?.exitoso).toBeTrue();
    expect(mockStore.planesEstudio[0].totalSemestres).toBe(semestresIniciales + 1);

    let delSemRes: any;
    httpClient.delete(`${environment.apiUrl}/coordinador/planes-estudio/${planId}/semestres/${semestresIniciales + 1}`).subscribe((r) => (delSemRes = r));
    tick(250);
    expect(delSemRes?.exitoso).toBeTrue();
    expect(mockStore.planesEstudio[0].totalSemestres).toBe(semestresIniciales);
  }));

  it('HU096-HU098: el administrador crea, modifica y elimina períodos en el mock', fakeAsync(() => {
    auth.setMockMode(true);
    const total = mockStore.periodosAcademicos.length;
    let creado: any;
    httpClient
      .post(`${environment.apiUrl}/admin/periodos-academicos`, { nombre: 'QA-2099-1', fechaInicio: '2099-02-01', fechaFin: '2099-06-30' })
      .subscribe((r) => (creado = r));
    tick(300);
    expect(creado?.exitoso).toBeTrue();
    expect(mockStore.periodosAcademicos.length).toBe(total + 1);

    const id = mockStore.periodosAcademicos[0].id;
    let editado: any;
    httpClient.put(`${environment.apiUrl}/admin/periodos-academicos/${id}`, { nombre: 'QA-2099-2' }).subscribe((r) => (editado = r));
    tick(300);
    expect(editado?.exitoso).toBeTrue();

    let eliminado: any;
    httpClient.delete(`${environment.apiUrl}/admin/periodos-academicos/${id}`).subscribe((r) => (eliminado = r));
    tick(300);
    expect(eliminado?.exitoso).toBeTrue();
    expect(mockStore.periodosAcademicos.length).toBe(total);
  }));

  it('F-RED-05 los endpoints de solicitudes de ingreso ya no los resuelve el mock', fakeAsync(() => {
    auth.setMockMode(true);
    const rutas = [
      ['GET', `${environment.apiUrl}/estudiante/solicitudes-` + 'matricula'],
      ['GET', `${environment.apiUrl}/docente/grupos/grp-mock/solicitudes-` + 'ingreso'],
      ['GET', `${environment.apiUrl}/coordinador/solicitudes-` + 'matricula'],
    ];
    for (const [metodo, url] of rutas) {
      let resultado: any;
      let error: any;
      httpClient.request(metodo, url).subscribe({ next: (r) => (resultado = r), error: (e) => (error = e) });
      tick(300);
      // El mock ya no tiene la ruta: responde 501 "Mock route not implemented" (patron del interceptor).
      expect(resultado).toBeUndefined();
      expect([404, 501]).toContain(error?.status);
    }
  }));

  it('A2-F-08 el mock ya no resuelve POST /estudiante/reclamos (el flujo real es /asistencias/revisiones)', fakeAsync(() => {
    auth.setMockMode(true);
    let resultado: any;
    let error: any;
    httpClient
      .post(`${environment.apiUrl}/estudiante/reclamos`, { sesionId: 'ses-1' })
      .subscribe({ next: (r) => (resultado = r), error: (e) => (error = e) });
    tick(400);
    expect(resultado).toBeUndefined();
    expect(error?.status).toBe(501);

    let revision: any;
    httpClient.post(`${environment.apiUrl}/asistencias/revisiones`, { sesionId: 'ses-1' }).subscribe((r) => (revision = r));
    tick(400);
    expect(revision?.exitoso).toBeTrue();
  }));

  it('A2-F-08 DELETE /estudiante/reclamos/{id} retira un reclamo pendiente y lo deja RETIRADA', fakeAsync(() => {
    auth.setMockMode(true);
    const copia = JSON.parse(JSON.stringify(mockStore.solicitudesRevision));
    const pendiente = mockStore.solicitudesRevision.find((r) => r.estadoSolicitud === 'PENDIENTE')!;
    let res: any;
    httpClient.delete(`${environment.apiUrl}/estudiante/reclamos/${pendiente.id}`).subscribe((r) => (res = r));
    tick(300);
    expect(res?.exitoso).toBeTrue();
    expect(res?.mensaje).toBe('La solicitud de revisión fue retirada.');
    expect(mockStore.solicitudesRevision.find((r) => r.id === pendiente.id)?.estadoSolicitud as string).toBe('RETIRADA');

    let error: any;
    httpClient.delete(`${environment.apiUrl}/estudiante/reclamos/${pendiente.id}`).subscribe({ error: (e) => (error = e) });
    tick(300);
    expect(error?.status).toBe(409);
    mockStore.solicitudesRevision = copia;
  }));

  it('HU006 MK-06 simula el perfil propio con sus vínculos', fakeAsync(() => {
    auth.setMockMode(true);
    let perfil: any;
    httpClient.get(`${environment.apiUrl}/usuarios/perfil`).subscribe((r) => (perfil = r));
    tick(250);
    expect(perfil.datos.correo).toBe('usuario.mock@uco.edu.co');
    expect(perfil.datos.vinculos.length).toBe(1);
  }));

  it('HU008 MK-08 simula la oferta de grupos sin campos de solicitud de ingreso', fakeAsync(() => {
    auth.setMockMode(true);
    let oferta: any;
    httpClient.get(`${environment.apiUrl}/estudiante/oferta-academica`).subscribe((r) => (oferta = r));
    tick(300);
    expect(oferta.datos.length).toBe(2);
    expect(oferta.datos[0].cuposDisponibles).toBe(5);
    expect('idSolicitud' + 'Abierta' in oferta.datos[0]).toBeFalse();
    expect('estadoSolicitud' in oferta.datos[0]).toBeFalse();
  }));

  it('HU051 RT-09 simula el retiro de un estudiante por el docente', fakeAsync(() => {
    auth.setMockMode(true);
    let res: any;
    httpClient
      .post(`${environment.apiUrl}/docente/grupos/grp-1/estudiantes/est-1/retiro`, { motivo: 'Motivo QA' })
      .subscribe((r) => (res = r));
    tick(300);
    expect(res?.exitoso).toBeTrue();
  }));
});

