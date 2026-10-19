import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { DeanGrupoDetalleComponent } from './dean-grupo-detalle.component';
import { environment } from '../../../../environments/environment';
import { HorarioDocenteApiDto } from '../../../core/api/models/horario-docente-api-dto.model';
import { SesionConsultadaApiDto } from '../../../core/api/models/sesion-consultada-api-dto.model';

describe('DeanGrupoDetalleComponent', () => {
  let fixture: ComponentFixture<DeanGrupoDetalleComponent>;
  let component: DeanGrupoDetalleComponent;
  let http: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockCourseApi: HorarioDocenteApiDto = {
    id: 'crs-1',
    idDocente: 'doc-1',
    idGrupo: 'crs-1',
    codigoMateria: 'MAT-301',
    nombreMateria: 'Matemática Avanzada III',
    seccion: 'Sección A',
    dia: 'Lunes',
    horaInicio: '08:00',
    horaFin: '10:00',
    totalEstudiantes: 28,
  };

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [DeanGrupoDetalleComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ grupoId: 'crs-1' }) } },
        },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeanGrupoDetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    http.expectOne(`${environment.apiUrl}/docente/horarios`).flush({
      exitoso: true,
      datos: [mockCourseApi],
    });
    http.expectOne(`${environment.apiUrl}/sesiones/grupo/crs-1`).flush({
      exitoso: true,
      datos: [
        {
          sesion: 'ses-1',
          grupo: 'crs-1',
          nombre: 'Sesión Inaugural',
          numero: 1,
          codigo: 'MAT-301',
          numeroSemana: 38,
          codigoGrupo: 'GRP-01',
          nombreGrupo: 'Sección A',
          fechaHoraInicio: '2026-09-14T08:00:00',
          fechaHoraFin: '2026-09-14T10:00:00',
        } satisfies SesionConsultadaApiDto,
      ],
    });
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('resuelve el curso y las sesiones del grupo por grupoId', () => {
    expect(component.selectedCourse()?.code).toBe('MAT-301');
    expect(component.sessions().length).toBe(1);
  });

  it('regresa a la lista de grupos de la facultad', () => {
    component.volverAGrupos();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/decano/grupos']);
  });
});
