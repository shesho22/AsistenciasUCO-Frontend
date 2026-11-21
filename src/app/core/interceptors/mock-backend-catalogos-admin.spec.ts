import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { mockBackendInterceptor } from './mock-backend.interceptor';

/** Simulación en modo mock de los catálogos administrables: ninguna ruta debe responder 501. */
describe('mockBackendInterceptor - catálogos administrables', () => {
  const cat = `${environment.apiUrl}/admin/categorias-justificacion`;
  const mot = `${environment.apiUrl}/admin/motivos-cancelacion-sesion`;
  let http: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
        provideHttpClient(withXhr(), withInterceptors([mockBackendInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    TestBed.inject(AuthService).setMockMode(true);
  });

  afterEach(() => localStorage.removeItem('USE_MOCKS'));

  function llamar<T>(f: () => ReturnType<HttpClient['get']>): { ok?: T; err?: HttpErrorResponse } {
    const r: { ok?: T; err?: HttpErrorResponse } = {};
    f().subscribe({ next: (v) => (r.ok = v as T), error: (e: HttpErrorResponse) => (r.err = e) });
    tick(1000);
    return r;
  }

  it('lista categorías ordenadas por nombre y motivos por orden', fakeAsync(() => {
    const c = llamar<{ datos: { nombre: string }[]; total: number }>(() => http.get(cat));
    expect(c.ok!.total).toBe(c.ok!.datos.length);
    const nombres = c.ok!.datos.map((d) => d.nombre);
    expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b, 'es')));
    const m = llamar<{ datos: { orden: number }[] }>(() => http.get(mot));
    const ordenes = m.ok!.datos.map((d) => d.orden);
    expect(ordenes).toEqual([...ordenes].sort((a, b) => a - b));
  }));

  it('crea, edita y cambia el estado de una categoría; rechaza duplicados con 409', fakeAsync(() => {
    const creada = llamar<{ datos: { id: string } }>(() =>
      http.post(cat, { codigo: 'ZZZ', nombre: 'Zeta', requiereSoporte: false })
    );
    const id = creada.ok!.datos.id;
    expect(llamar(() => http.post(cat, { codigo: 'ZZZ', nombre: 'Otra', requiereSoporte: false })).err!.status).toBe(409);
    expect(llamar(() => http.put(`${cat}/${id}`, { nombre: 'Zeta 2', requiereSoporte: true })).ok).toBeTruthy();
    expect(llamar(() => http.patch(`${cat}/${id}/estado`, { estaActivo: false })).ok).toBeTruthy();
    expect(llamar(() => http.put(`${cat}/inexistente`, { nombre: 'X', requiereSoporte: true })).err!.status).toBe(404);
    expect(llamar(() => http.put(`${cat}/${id}`, { nombre: 'Calamidad doméstica', requiereSoporte: true })).err!.status).toBe(409);
  }));

  it('crea y edita un motivo y no deja desactivar el último activo (409)', fakeAsync(() => {
    const lista = llamar<{ datos: { id: string; estaActivo: boolean }[] }>(() => http.get(mot)).ok!.datos;
    const nuevo = llamar<{ datos: { id: string } }>(() => http.post(mot, { codigo: 'NUEVO_M', nombre: 'Nuevo motivo' }));
    expect(nuevo.ok!.datos.id).toBeTruthy();
    expect(llamar(() => http.put(`${mot}/${nuevo.ok!.datos.id}`, { nombre: 'Nuevo motivo 2', orden: 9 })).ok).toBeTruthy();
    const activos = llamar<{ datos: { id: string; estaActivo: boolean }[] }>(() => http.get(mot)).ok!.datos.filter((d) => d.estaActivo);
    expect(lista.length).toBeGreaterThan(0);
    let ultimo: { err?: HttpErrorResponse } = {};
    for (const a of activos) {
      ultimo = llamar(() => http.patch(`${mot}/${a.id}/estado`, { estaActivo: false }));
    }
    expect(ultimo.err!.status).toBe(409);
  }));
});
