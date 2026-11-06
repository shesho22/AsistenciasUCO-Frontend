import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { ConsolidadoAsistenciaComponent, acumularOpciones } from './consolidado-asistencia.component';
import { ConsolidadoGrupoItem } from '../../../core/models/consultas-transversales.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';

describe('ConsolidadoAsistenciaComponent (HU061)', () => {
  let http: HttpTestingController;
  let toast: jasmine.SpyObj<ToastService>;
  const api = environment.apiUrl;

  const grupo = (idAsignatura: string, nombreAsignatura: string, idDocente: string | null): ConsolidadoGrupoItem => ({
    idGrupo: `G-${idAsignatura}`, codigoGrupo: 1, nombreGrupo: 'Grupo 01', idPeriodoAcademico: 'PER-1',
    nombrePeriodoAcademico: '2026-2', idPrograma: 'PRG-1', nombrePrograma: 'Sistemas', idAsignatura, nombreAsignatura,
    idDocente, nombreDocente: idDocente ? 'Ana' : null, estudiantesActivos: 20, sesionesEjecutadas: 8, asistencias: 150,
    faltasSinJustaCausa: 10, excusas: 0, porcentajeAsistencia: 93.75, porcentajeInasistencia: 6.25,
    estudiantesRiesgo: 2, estudiantesPerdida: 1,
  });

  function crear(comoDecano: boolean): ComponentFixture<ConsolidadoAsistenciaComponent> {
    toast = jasmine.createSpyObj('ToastService', ['success', 'error']);
    TestBed.configureTestingModule({
      imports: [ConsolidadoAsistenciaComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toast },
        { provide: ActivatedRoute, useValue: { snapshot: { data: comoDecano ? { comoDecano: true } : {} } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ConsolidadoAsistenciaComponent);
    fixture.detectChanges();
    http.expectOne(`${api}/coordinador/periodos-academicos`).flush({
      exitoso: true,
      datos: [{ id: 'PER-1', codigo: '2026-2', nombre: '2026-2', fechaInicio: '2026-07-01', fechaFin: '2026-12-01', estado: 'ACTIVO' }],
    });
    return fixture;
  }

  afterEach(() => http?.verify());

  it('el coordinador consulta su ruta y ve las métricas por grupo', () => {
    const fixture = crear(false);
    http
      .expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`)
      .flush({ exitoso: true, datos: [grupo('ASG-1', 'Cálculo', 'DOC-1')], total: 1 });
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Coordinación');
    expect(texto).toContain('Cálculo');
    expect(texto).toContain('93.75%');
    // Certificación F3: la columna cuenta sesiones ejecutadas, no las programadas del cronograma.
    expect(texto).toContain('Sesiones ejecutadas');
    expect(fixture.componentInstance.periodos().length).toBe(1);
    expect(fixture.componentInstance.asignaturas()).toEqual([{ id: 'ASG-1', nombre: 'Cálculo' }]);
  });

  it('el decano usa su ruta y filtrar por cohorte vuelve a consultar desde la página 1', () => {
    const fixture = crear(true);
    http.expectOne((r) => r.url === `${api}/decano/consolidado-asistencia`).flush({ exitoso: true, datos: [], total: 0 });
    const component = fixture.componentInstance;

    component.filtrar(component.idPeriodo, 'PER-1');

    const req = http.expectOne((r) => r.url === `${api}/decano/consolidado-asistencia`);
    expect(req.request.params.get('idPeriodoAcademico')).toBe('PER-1');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush({ exitoso: true, datos: [], total: 0 });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hay grupos');
  });

  it('muestra el error del backend', () => {
    crear(false);
    http
      .expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`)
      .flush({ message: 'Sin permisos' }, { status: 403, statusText: 'Forbidden' });
    expect(toast.error).toHaveBeenCalled();
  });

  it('acumularOpciones no repite, ignora ids nulos y ordena por nombre', () => {
    const opciones = acumularOpciones([{ id: 'ASG-2', nombre: 'Estructuras' }], [
      grupo('ASG-1', 'Cálculo', null),
      grupo('ASG-2', 'Estructuras', null),
    ], 'asignatura');
    expect(opciones).toEqual([
      { id: 'ASG-1', nombre: 'Cálculo' },
      { id: 'ASG-2', nombre: 'Estructuras' },
    ]);
    expect(acumularOpciones([], [grupo('ASG-1', 'Cálculo', null)], 'docente')).toEqual([]);
  });
});
