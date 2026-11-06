import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatriculaQrService } from './matricula-qr.service';
import { environment } from '../../../environments/environment';
import { RegistroMatriculaQrPayload, VentanaMatricula } from '../models/matricula-qr.model';

describe('MatriculaQrService (HU176B)', () => {
  let service: MatriculaQrService;
  let http: HttpTestingController;
  const TOKEN = 'T'.repeat(43);
  const ventana: VentanaMatricula = {
    idVentana: 'v-1',
    pin: '482913',
    urlMatricula: `https://x.test/matricula/qr?t=${TOKEN}`,
    qrPngBase64: 'iVBORw0',
    fechaRotacionUtc: '2026-11-04T15:00:00Z',
    fechaExpiracionUtc: '2026-11-04T16:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MatriculaQrService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MatriculaQrService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('abrirVentana hace POST al grupo y devuelve la ventana', () => {
    let resultado: VentanaMatricula | undefined;
    service.abrirVentana('g 1').subscribe((v) => (resultado = v));

    const req = http.expectOne(`${environment.apiUrl}/grupos/g%201/matricula-qr`);
    expect(req.request.method).toBe('POST');
    req.flush({ exitoso: true, datos: ventana });
    expect(resultado).toEqual(ventana);
  });

  it('rotarVentana hace POST a /rotacion', () => {
    let resultado: VentanaMatricula | undefined;
    service.rotarVentana('g-1').subscribe((v) => (resultado = v));

    const req = http.expectOne(`${environment.apiUrl}/grupos/g-1/matricula-qr/rotacion`);
    expect(req.request.method).toBe('POST');
    req.flush({ exitoso: true, datos: ventana });
    expect(resultado?.pin).toBe('482913');
  });

  it('cerrarVentana hace DELETE al grupo', () => {
    let exitoso = false;
    service.cerrarVentana('g-1').subscribe((r) => (exitoso = r.exitoso));

    const req = http.expectOne(`${environment.apiUrl}/grupos/g-1/matricula-qr`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ exitoso: true, datos: null });
    expect(exitoso).toBeTrue();
  });

  it('validar con token envia solo el token en el cuerpo, nunca en la URL', () => {
    service.validar({ token: TOKEN, pin: '123456' }).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/public/matricula-qr/validar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: TOKEN });
    expect(req.request.urlWithParams).not.toContain(TOKEN.slice(0, 10));
    req.flush({
      exitoso: true,
      datos: { idGrupo: 'g-1', nombreAsignatura: 'Cálculo', nombreGrupo: 'G1', nombreDocente: 'María', fechaExpiracionUtc: 'x', cupoDisponible: 3, tiposIdentificacion: [] },
    });
  });

  it('validar con PIN envia solo el PIN', () => {
    service.validar({ pin: '482913' }).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/public/matricula-qr/validar`);
    expect(req.request.body).toEqual({ pin: '482913' });
    req.flush({ exitoso: true, datos: { idGrupo: 'g-1' } });
  });

  it('registrar envia los datos de la persona y devuelve el usuario sin token de sesion', () => {
    const payload: RegistroMatriculaQrPayload = {
      token: TOKEN,
      idTipoIdentificacion: 'cc',
      numeroIdentificacion: 1017555444,
      primerNombre: 'Ana',
      primerApellido: 'Gómez',
      correo: 'ana@uco.edu.co',
      password: 'Clave-segura-1',
    };
    let usuario = '';
    service.registrar(payload).subscribe((r) => (usuario = r.usuario));

    const req = http.expectOne(`${environment.apiUrl}/public/matricula-qr/registro`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ exitoso: true, datos: { idGrupo: 'g-1', usuario: '1017555444' } });
    expect(usuario).toBe('1017555444');
  });

  it('matricularAutenticado envia el PIN en el cuerpo a /estudiante/matricular-grupo', () => {
    let idGrupo = '';
    service.matricularAutenticado({ pin: '482913' }).subscribe((r) => (idGrupo = r.idGrupo));

    const req = http.expectOne(`${environment.apiUrl}/estudiante/matricular-grupo`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ pin: '482913' });
    req.flush({ exitoso: true, datos: { idGrupo: 'g-1' } });
    expect(idGrupo).toBe('g-1');
  });

  it('propaga el error del backend sin transformarlo', () => {
    let status = 0;
    service.validar({ pin: '000000' }).subscribe({ error: (e) => (status = e.status) });

    http.expectOne(`${environment.apiUrl}/public/matricula-qr/validar`)
      .flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });
    expect(status).toBe(404);
  });
});
