import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AccountAccessService } from './account-access.service';
import { environment } from '../../../environments/environment';

describe('AccountAccessService', () => {
  let service: AccountAccessService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AccountAccessService, provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(AccountAccessService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consult envía el correo en el cuerpo del POST, nunca en la URL', () => {
    service.consult('persona@uco.edu.co').subscribe((res) => {
      expect(res.datos.estado).toBe('PENDIENTE_SINCRONIZACION');
    });

    const req = http.expectOne(`${environment.apiUrl}/identidad/cuentas/acceso/consultas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ correo: 'persona@uco.edu.co' });
    expect(req.request.url).not.toContain('persona@uco.edu.co');
    req.flush({
      exitoso: true,
      datos: { usuario: 'u-1', estado: 'PENDIENTE_SINCRONIZACION', detalle: 'DOCENTE: falta el perfil', roles: [] },
    });
  });

  it('reconcile usa el endpoint de reconciliaciones, no el PDP', () => {
    service.reconcile('persona@uco.edu.co').subscribe((res) => {
      expect(res.datos.estado).toBe('ACTIVA');
    });

    const req = http.expectOne(`${environment.apiUrl}/identidad/cuentas/acceso/reconciliaciones`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ correo: 'persona@uco.edu.co' });
    req.flush({ exitoso: true, datos: { usuario: 'u-1', estado: 'ACTIVA', detalle: '', roles: [] } });
  });
});
