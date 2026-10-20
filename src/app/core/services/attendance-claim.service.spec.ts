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

  it('subirSoporte envía el FormData con el archivo adjunto', () => {
    const file = new File(['dummy'], 'prueba.pdf', { type: 'application/pdf' });
    service.subirSoporte(file).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/archivos/subir`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush({ exitoso: true, datos: { fileId: 'f1', nombre: 'prueba.pdf', url: 'http://', tamanio: 5 } });
  });

  it('getReclamosDocente consulta la lista de reclamaciones y maneja fallback 501', () => {
    let reclamos: any[] = [];
    service.getReclamosDocente().subscribe((res) => (reclamos = res.datos || []));

    const req = http.expectOne(`${environment.apiUrl}/docente/reclamos`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: [{ id: 'rec-1', materia: 'Cálculo' }] });

    expect(reclamos.length).toBe(1);

    // Fallback cuando status 501
    service.getReclamosDocente().subscribe((res) => (reclamos = res.datos || []));
    http.expectOne(`${environment.apiUrl}/docente/reclamos`).flush({ error: 'No soportado' }, { status: 501, statusText: 'Not Implemented' });
    expect(reclamos).toEqual([]);
  });

  it('getSesionesPorMateria y getHorarioDocente consultan las rutas respectivas', () => {
    service.getSesionesPorMateria('mat-123').subscribe();
    http.expectOne(`${environment.apiUrl}/estudiante/materias/mat-123/sesiones`).flush({ exitoso: true, datos: [] });

    service.getHorarioDocente().subscribe();
    http.expectOne(`${environment.apiUrl}/docente/horarios`).flush({ exitoso: true, datos: [] });
  });

  it('crearReclamo y eliminarReclamo operan con los contratos esperados', () => {
    service
      .crearReclamo({
        sesionId: 'ses-1',
        categoria: 'Médico / Salud',
        justificacionSolicitud: 'Incapacidad médica EPS',
        soporteAdjunto: {
          nombre: 'incapacidad.pdf',
          tipo: 'application/pdf',
          tamanioKb: 100,
          fechaSubida: '2026-10-19',
          fileId: 'f1',
          urlSimulada: 'http://s3/inc.pdf',
        },
        estudianteId: 'est-1',
        estudianteNombre: 'Estudiante',
        estudianteCorreo: 'estudiante@uco.edu.co',
        materiaId: 'mat-1',
        materiaCodigo: 'CAL-101',
        materiaNombre: 'Cálculo',
        grupo: 'G1',
        sesionNumero: 1,
        fechaSesion: '2026-09-10',
        estadoOriginal: 'AUSENTE',
      })
      .subscribe();

    const postReq = http.expectOne(`${environment.apiUrl}/asistencias/revisiones`);
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body.sesionId).toBe('ses-1');
    expect(postReq.request.body.soporteNombre).toBe('incapacidad.pdf');
    postReq.flush({ exitoso: true, datos: {} });

    service.eliminarReclamo('rec-99', 'mat-1', 'ses-1').subscribe();
    const delReq = http.expectOne(`${environment.apiUrl}/estudiante/reclamos/rec-99`);
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({ exitoso: true, datos: true });
  });
});

