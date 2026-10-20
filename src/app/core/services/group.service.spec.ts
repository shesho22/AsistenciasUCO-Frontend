import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { GroupService } from './group.service';
import { environment } from '../../../environments/environment';

describe('GroupService', () => {
  let service: GroupService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GroupService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GroupService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta los estudiantes del grupo en el endpoint definitivo', () => {
    service.getStudentsByGroup('grupo-1').subscribe();

    const request = http.expectOne(
      `${environment.apiUrl}/grupos/grupo-1/estudiantes`
    );
    expect(request.request.method).toBe('GET');
    request.flush({ exitoso: true, datos: [], total: 0 });
  });

  it('consulta todos los grupos con getAllGroups', () => {
    service.getAllGroups().subscribe();

    const req = http.expectOne(`${environment.apiUrl}/grupos`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: [] });
  });

  it('descarga la planilla de excel en blob', () => {
    service.descargarPlanillaExcel('grupo-1').subscribe();

    const req = http.expectOne(`${environment.apiUrl}/grupos/grupo-1/reportes/asistencia-excel`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['excel'], { type: 'application/vnd.ms-excel' }));
  });
});

