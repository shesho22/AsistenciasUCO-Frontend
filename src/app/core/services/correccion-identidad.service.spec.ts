import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CorreccionIdentidadService } from './correccion-identidad.service';
import { environment } from '../../../environments/environment';

describe('CorreccionIdentidadService (HU159)', () => {
  let service: CorreccionIdentidadService;
  let http: HttpTestingController;
  const api = environment.apiUrl;
  const payload = { primerNombre: 'Ana', segundoNombre: '', primerApellido: 'Gomez', segundoApellido: '', motivo: 'Digitación' };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CorreccionIdentidadService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta una sola vez si el documento es corregible', () => {
    const valores: boolean[] = [];
    service.permiteCorregirDocumento().subscribe((v) => valores.push(v));
    service.permiteCorregirDocumento().subscribe((v) => valores.push(v));
    http.expectOne(`${api}/configuracion/identidad`).flush({ exitoso: true, datos: { permitirCorregirDocumento: true } });
    expect(valores).toEqual([true, true]);
  });

  it('si la configuracion falla, el documento no es corregible', () => {
    let valor: boolean | undefined;
    service.permiteCorregirDocumento().subscribe((v) => (valor = v));
    http.expectOne(`${api}/configuracion/identidad`).flush(null, { status: 500, statusText: 'err' });
    expect(valor).toBeFalse();
  });

  it('corrige al estudiante y al decano en sus rutas', () => {
    service.corregirEstudiante('e/1', payload).subscribe();
    const est = http.expectOne(`${api}/coordinador/estudiantes/e%2F1/identidad`);
    expect(est.request.method).toBe('PUT');
    expect(est.request.body).toEqual(payload);
    est.flush({ exitoso: true, datos: { idRegistro: 'e/1', sincronizacionIdentidad: 'OK', mensajeUsuario: null } });

    service.corregirDecano('d-1', payload).subscribe();
    const dec = http.expectOne(`${api}/admin/decanos/d-1/identidad`);
    expect(dec.request.method).toBe('PUT');
    dec.flush({ exitoso: true, datos: { idRegistro: 'd-1', sincronizacionIdentidad: 'OK', mensajeUsuario: null } });
  });
});
