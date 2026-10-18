import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AttendanceClaimService } from './attendance-claim.service';

describe('AttendanceClaimService', () => {
  let service: AttendanceClaimService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AttendanceClaimService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AttendanceClaimService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('considera exitoso un PATCH void aunque la respuesta omita datos', () => {
    let response: unknown;
    service.resolverReclamo('rec-1', 'APROBADA', 'Aceptado').subscribe((value) => (response = value));

    const request = http.expectOne(`${environment.apiUrl}/docente/reclamos/rec-1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      accion: 'APROBADA',
      respuestaDocente: 'Aceptado',
      respuesta: 'Aceptado',
    });
    request.flush({ exitoso: true, mensajeUsuario: 'Procesado' });

    expect(response).toEqual({ exitoso: true, mensajeUsuario: 'Procesado' });
  });

  it('descarga por HttpClient usando exactamente el fileId codificado', () => {
    const fileId = 'folder/file-123';
    service.descargarSoporte(fileId).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/archivos/folder%2Ffile-123`);
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['contenido'], { type: 'application/pdf' }));
  });
});
