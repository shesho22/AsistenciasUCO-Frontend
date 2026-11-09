import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { mockBackendInterceptor } from './mock-backend.interceptor';

/** NOTIF-002B: simulación en modo mock de los endpoints /admin/notificaciones. */
describe('mockBackendInterceptor - notificaciones', () => {
  const base = `${environment.apiUrl}/admin/notificaciones`;
  let httpClient: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
        provideHttpClient(withInterceptors([mockBackendInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    TestBed.inject(AuthService).setMockMode(true);
  });

  afterEach(() => localStorage.removeItem('USE_MOCKS'));

  function respuesta<T>(llamada: () => ReturnType<HttpClient['get']>): T {
    let resultado: unknown;
    llamada().subscribe((value) => (resultado = value));
    tick(1000);
    return resultado as T;
  }

  it('estado-canal simula solo canalActivo, ultimoEnvioUtc y ultimoError (sin host ni puerto)', fakeAsync(() => {
    const r = respuesta<{ datos: Record<string, unknown> }>(() => httpClient.get(`${base}/estado-canal`));
    expect(Object.keys(r.datos).sort()).toEqual(['canalActivo', 'ultimoEnvioUtc', 'ultimoError']);
    expect(r.datos['canalActivo']).toBeTrue();
  }));

  it('plantillas lista el catálogo con marcadores y versiones', fakeAsync(() => {
    const r = respuesta<{ datos: { tipo: string; marcadores: unknown[] }[] }>(() => httpClient.get(`${base}/plantillas?idioma=es`));
    expect(r.datos.length).toBeGreaterThan(0);
    expect(r.datos[0].marcadores.length).toBeGreaterThan(0);
  }));

  it('guardar versión devuelve la nueva versión del tipo indicado', fakeAsync(() => {
    const r = respuesta<{ datos: { tipo: string; asunto: string } }>(
      () => httpClient.post(`${base}/plantillas/RETIRO_ESTUDIANTE_GRUPO/versiones`, { asunto: 'A', cuerpo: 'C' }));
    expect(r.datos.tipo).toBe('RETIRO_ESTUDIANTE_GRUPO');
    expect(r.datos.asunto).toBe('A');
  }));

  it('guardar versión tolera un cuerpo vacío', fakeAsync(() => {
    const r = respuesta<{ datos: { tipo: string } }>(
      () => httpClient.post(`${base}/plantillas/OTRO/versiones`, null));
    expect(r.datos.tipo).toBe('OTRO');
  }));

  it('activar versión confirma la operación', fakeAsync(() => {
    const r = respuesta<{ exitoso: boolean }>(() => httpClient.patch(`${base}/plantillas/T/versiones/2/activar`, {}));
    expect(r.exitoso).toBeTrue();
  }));

  it('vista previa sustituye los marcadores del asunto y del cuerpo', fakeAsync(() => {
    const r = respuesta<{ datos: { asunto: string; textoPlano: string } }>(
      () => httpClient.post(`${base}/plantillas/T/vista-previa`, { asunto: 'Hola {nombre}', cuerpo: 'Grupo {grupo}' }));
    expect(r.datos.asunto).toBe('Hola [nombre_VALOR]');
    expect(r.datos.textoPlano).toBe('Grupo [grupo_VALOR]');
  }));

  it('vista previa tolera un cuerpo vacío', fakeAsync(() => {
    const r = respuesta<{ datos: { asunto: string } }>(() => httpClient.post(`${base}/plantillas/T/vista-previa`, null));
    expect(r.datos.asunto).toBe('');
  }));

  it('cola devuelve elementos y resumen', fakeAsync(() => {
    const r = respuesta<{ datos: { elementos: unknown[]; resumen: { entregadas: number } } }>(
      () => httpClient.get(`${base}/cola?pagina=1&tamano=20`));
    expect(r.datos.elementos.length).toBeGreaterThan(0);
    expect(r.datos.resumen.entregadas).toBeGreaterThan(0);
  }));

  it('reintentar y prueba responden con éxito', fakeAsync(() => {
    const reintento = respuesta<{ exitoso: boolean }>(() => httpClient.post(`${base}/cola/abc/reintentar`, {}));
    const prueba = respuesta<{ exitoso: boolean }>(() => httpClient.post(`${base}/prueba`, { tipo: 'T' }));
    expect(reintento.exitoso).toBeTrue();
    expect(prueba.exitoso).toBeTrue();
  }));
});
