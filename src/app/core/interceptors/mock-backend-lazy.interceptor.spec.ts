import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpInterceptorFn, HttpResponse, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { inject, signal } from '@angular/core';
import { of } from 'rxjs';
import { cargadorBackendSimulado, mockBackendLazyInterceptor } from './mock-backend-lazy.interceptor';
import { AuthService } from '../services/auth.service';

describe('mockBackendLazyInterceptor (VAL EST-10)', () => {
  const modoSimulado = signal(false);
  let http: HttpClient;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    modoSimulado.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr(), withInterceptors([mockBackendLazyInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isMockMode: modoSimulado.asReadonly() } },
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  it('con el modo real la peticion pasa al backend y no descarga el simulador', () => {
    const cargar = spyOn(cargadorBackendSimulado, 'cargar').and.callThrough();
    let respuesta: unknown;
    http.get('/api/v1/probe').subscribe((r) => (respuesta = r));
    ctrl.expectOne('/api/v1/probe').flush({ real: true });
    expect(respuesta).toEqual({ real: true });
    expect(cargar).not.toHaveBeenCalled();
  });

  it('con el modo simulado descarga el simulador y lo ejecuta en el contexto de inyeccion', async () => {
    const simulador: HttpInterceptorFn = (req) => {
      // Si no corriera en un contexto de inyeccion, inject() lanzaria NG0203.
      const auth = inject(AuthService);
      return of(new HttpResponse({ status: 200, body: { simulado: auth.isMockMode(), url: req.url } }));
    };
    spyOn(cargadorBackendSimulado, 'cargar').and.resolveTo(simulador);
    modoSimulado.set(true);

    const respuesta = await new Promise((resolve) => http.get('/api/v1/probe').subscribe(resolve));

    expect(respuesta).toEqual({ simulado: true, url: '/api/v1/probe' });
    ctrl.expectNone('/api/v1/probe');
  });

  it('el cargador real resuelve el simulador del modulo diferido', async () => {
    const simulador = await cargadorBackendSimulado.cargar();
    expect(typeof simulador).toBe('function');
  });
});
