import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { DeanGrupoDetalleComponent } from './dean-grupo-detalle.component';
import { environment } from '../../../../environments/environment';
import { HorarioDocenteApiDto } from '../../../core/api/models/horario-docente-api-dto.model';
import { SesionFacultadItem } from '../../../core/models/facultad-decano.model';
import { ToastService } from '../../../shared/components/toast/toast.component';

describe('DeanGrupoDetalleComponent', () => {
  let fixture: ComponentFixture<DeanGrupoDetalleComponent>;
  let component: DeanGrupoDetalleComponent;
  let http: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastSpy: jasmine.SpyObj<ToastService>;

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

  const sesion = (id: string, idGrupo: string, numeroSemana = 38): SesionFacultadItem => ({
    id,
    nombre: `Sesión ${id}`,
    codigo: 'MAT-301',
    numeroSemana,
    fechaHoraInicio: '2026-09-14T13:00:00Z',
    fechaHoraFin: '2026-09-14T15:00:00Z',
    idGrupo,
    codigoGrupo: 1,
    nombreGrupo: 'Sección A',
    idAsignatura: 'asig-1',
    nombreAsignatura: 'Matemática Avanzada III',
    idPrograma: 'prog-1',
    nombrePrograma: 'Ingeniería de Sistemas',
  });

  const url = `${environment.apiUrl}/decano/sesiones`;
  const peticionSesiones = (req: { url: string; params: { get(k: string): string | null } }) =>
    req.url === url && req.params.get('idGrupo') === 'crs-1';

  function crear(): void {
    fixture = TestBed.createComponent(DeanGrupoDetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/decano/grupos/crs-1`).flush({
      exitoso: true,
      datos: {
        id: mockCourseApi.idGrupo,
        codigo: mockCourseApi.codigoMateria,
        nombre: mockCourseApi.seccion,
        idAsignatura: 'asig-1',
        nombreAsignatura: mockCourseApi.nombreMateria,
        idDocente: mockCourseApi.idDocente,
        capacidadMaximaPermitida: 35,
        estudiantesActivos: mockCourseApi.totalEstudiantes,
        cuposDisponibles: 35 - (mockCourseApi.totalEstudiantes ?? 0),
        grupoHabilitado: true,
        fechaInicioPeriodoAcademico: '2026-01-15',
        fechaFinPeriodoAcademico: '2026-06-15',
      },
    });
  }

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastSpy = jasmine.createSpyObj('ToastService', ['error', 'success', 'info', 'warning']);

    TestBed.configureTestingModule({
      imports: [DeanGrupoDetalleComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ grupoId: 'crs-1' }) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  // AUTH-02 (DECANO 403): GET /api/v2/sesiones/grupo/{id} es del DOCENTE titular. El decano lee las sesiones de su
  // facultad por GET /decano/sesiones?idGrupo={id} (ámbito forzado en backend).
  it('carga las sesiones del grupo desde /decano/sesiones?idGrupo=crs-1 y nunca llama a la ruta del docente', () => {
    crear();
    http.expectOne(peticionSesiones).flush({
      exitoso: true,
      totalElementos: 2,
      numeroPagina: 1,
      tamanoPagina: 50,
      totalPaginas: 1,
      elementos: [sesion('s1', 'crs-1'), sesion('s3', 'crs-1', 39)],
    });
    http.expectNone(`${environment.apiV2Url}/sesiones/grupo/crs-1`);
    fixture.detectChanges();

    expect(component.selectedCourse()?.code).toBe('MAT-301');
    expect(component.sessions().map((s) => s.id)).toEqual(['s1', 's3']);
    expect(component.errorSesiones()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('2 sesiones');
  });

  it('un 200 sin sesiones del grupo se muestra como vacío legítimo, no como error', () => {
    crear();
    http.expectOne(peticionSesiones).flush({ exitoso: true, totalElementos: 0, totalPaginas: 0, numeroPagina: 1, tamanoPagina: 50, elementos: [] });
    fixture.detectChanges();

    expect(component.sessions()).toEqual([]);
    expect(component.errorSesiones()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No hay sesiones registradas para este grupo.');
  });

  // UX-09: un 403/500 no puede presentarse como "no hay sesiones".
  it('un error HTTP se informa y no se muestra como lista vacía', () => {
    crear();
    http.expectOne(peticionSesiones).flush(
      { exitoso: false, codigo: 'FORBIDDEN', mensajeUsuario: 'No tiene permiso para esta consulta.' },
      { status: 403, statusText: 'Forbidden' }
    );
    fixture.detectChanges();

    expect(component.sessions()).toEqual([]);
    expect(component.errorSesiones()).toBeTruthy();
    expect(toastSpy.error).toHaveBeenCalled();
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).not.toContain('No hay sesiones registradas para este grupo.');
    expect(texto).toContain('No fue posible cargar las sesiones');
  });

  it('regresa a la lista de grupos de la facultad', () => {
    crear();
    http.expectOne(peticionSesiones).flush({ exitoso: true, totalElementos: 0, totalPaginas: 0, numeroPagina: 1, tamanoPagina: 50, elementos: [] });
    component.volverAGrupos();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/decano/grupos']);
  });

  it('B1-F-28 HU145: las sesiones canceladas del grupo muestran la etiqueta Cancelada', () => {
    crear();
    http.expectOne(peticionSesiones).flush({
      exitoso: true,
      totalElementos: 2,
      numeroPagina: 1,
      tamanoPagina: 50,
      totalPaginas: 1,
      elementos: [
        sesion('s1', 'crs-1'),
        {
          ...sesion('s2', 'crs-1', 39),
          estado: 'CANCELADA',
          cancelacion: { tipo: 'DOCENTE', motivo: 'Incapacidad', nombreFestivo: null, fechaCancelacionUtc: null },
        },
      ],
    });
    fixture.detectChanges();

    const filas = fixture.nativeElement.querySelectorAll('[data-testid^="sesion-fila-"]') as NodeListOf<HTMLElement>;
    expect(filas.length).toBe(2);
    expect(filas[0].textContent).not.toContain('Cancelada');
    expect(filas[1].textContent).toContain('Cancelada');
    expect(filas[1].textContent).toContain('Incapacidad');
  });

  it('un 403/500 al cargar la ficha del grupo muestra el mensaje del backend (F-DEC-006)', () => {
    fixture = TestBed.createComponent(DeanGrupoDetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/decano/grupos/crs-1`).flush(
      { code: 'ERR_INTERNAL', message: 'Servicio no disponible por mantenimiento.', correlationId: 'c1' },
      { status: 500, statusText: 'Server Error' },
    );
    http.expectOne(peticionSesiones).flush({ exitoso: true, totalElementos: 0, totalPaginas: 0, numeroPagina: 1, tamanoPagina: 50, elementos: [] });
    fixture.detectChanges();
    const alerta = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('Servicio no disponible por mantenimiento.');
  });
});
