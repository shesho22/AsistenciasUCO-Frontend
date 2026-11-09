import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AdminEmailNotificationService } from './admin-email-notification.service';

describe('AdminEmailNotificationService', () => {
  const base = `${environment.apiUrl}/admin/notificaciones`;
  let service: AdminEmailNotificationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminEmailNotificationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('obtenerEstadoCanal devuelve solo los datos', () => {
    let resultado: unknown;
    service.obtenerEstadoCanal().subscribe((r) => (resultado = r));

    const req = http.expectOne(`${base}/estado-canal`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: { canalActivo: true, ultimoEnvioUtc: null, ultimoError: null } });

    expect(resultado).toEqual({ canalActivo: true, ultimoEnvioUtc: null, ultimoError: null });
  });

  it('listarPlantillas envía el idioma por defecto y uno explícito', () => {
    service.listarPlantillas().subscribe();
    const porDefecto = http.expectOne((r) => r.url === `${base}/plantillas`);
    expect(porDefecto.request.params.get('idioma')).toBe('es');
    porDefecto.flush({ exitoso: true, datos: [] });

    service.listarPlantillas('en').subscribe();
    const explicito = http.expectOne((r) => r.url === `${base}/plantillas`);
    expect(explicito.request.params.get('idioma')).toBe('en');
    explicito.flush({ exitoso: true, datos: [] });
  });

  it('guardarVersionPlantilla codifica el tipo y envía el cuerpo', () => {
    let version: unknown;
    service.guardarVersionPlantilla('TIPO X', { asunto: 'a', cuerpo: 'c' }).subscribe((v) => (version = v));

    const req = http.expectOne(`${base}/plantillas/TIPO%20X/versiones`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ asunto: 'a', cuerpo: 'c' });
    req.flush({ exitoso: true, datos: { version: 2 } });

    expect(version).toEqual(jasmine.objectContaining({ version: 2 }));
  });

  it('activarVersionPlantilla usa PATCH con el idioma', () => {
    service.activarVersionPlantilla('T', 3).subscribe();

    const req = http.expectOne((r) => r.url === `${base}/plantillas/T/versiones/3/activar`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.params.get('idioma')).toBe('es');
    req.flush({ exitoso: true });
  });

  it('generarVistaPrevia devuelve la vista previa', () => {
    let html: string | undefined;
    service.generarVistaPrevia('T', { asunto: 'a', cuerpo: 'c' }).subscribe((v) => (html = v.html));

    const req = http.expectOne(`${base}/plantillas/T/vista-previa`);
    expect(req.request.method).toBe('POST');
    req.flush({ exitoso: true, datos: { asunto: 'a', textoPlano: 'c', html: '<p>c</p>', origen: 'preview' } });

    expect(html).toBe('<p>c</p>');
  });

  it('consultarCola omite los filtros TODOS y envía página y tamaño', () => {
    service.consultarCola({ estado: 'TODOS', tipo: 'TODOS', pagina: 2, tamano: 10 }).subscribe();

    const req = http.expectOne((r) => r.url === `${base}/cola`);
    expect(req.request.params.has('estado')).toBeFalse();
    expect(req.request.params.has('tipo')).toBeFalse();
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('tamano')).toBe('10');
    req.flush({ exitoso: true, datos: { elementos: [] } });
  });

  it('consultarCola envía estado y tipo concretos y no envía paginación ausente', () => {
    service.consultarCola({ estado: 'ENTREGADA', tipo: 'RETIRO_ESTUDIANTE_GRUPO' }).subscribe();

    const req = http.expectOne((r) => r.url === `${base}/cola`);
    expect(req.request.params.get('estado')).toBe('ENTREGADA');
    expect(req.request.params.get('tipo')).toBe('RETIRO_ESTUDIANTE_GRUPO');
    expect(req.request.params.has('pagina')).toBeFalse();
    expect(req.request.params.has('tamano')).toBeFalse();
    req.flush({ exitoso: true, datos: { elementos: [] } });
  });

  it('reintentarNotificacion hace POST sobre el id codificado', () => {
    service.reintentarNotificacion('a/b').subscribe();

    const req = http.expectOne(`${base}/cola/a%2Fb/reintentar`);
    expect(req.request.method).toBe('POST');
    req.flush({ exitoso: true });
  });

  it('enviarCorreoPrueba envía el tipo y el correo de destino', () => {
    service.enviarCorreoPrueba({ tipo: 'T', correoDestino: 'a@uco.edu.co' }).subscribe();

    const req = http.expectOne(`${base}/prueba`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ tipo: 'T', correoDestino: 'a@uco.edu.co' });
    req.flush({ exitoso: true });
  });
});
