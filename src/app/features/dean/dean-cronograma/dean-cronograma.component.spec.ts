import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeanCronogramaComponent } from './dean-cronograma.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';
import { DeanFacultadService } from '../../../core/services/dean-facultad.service';
import { mockBackendInterceptor } from '../../../core/interceptors/mock-backend.interceptor';
import { AuthService } from '../../../core/services/auth.service';

const URL = `${environment.apiUrl}/decano/sesiones`;

describe('DeanCronogramaComponent (HU145)', () => {
  let fixture: ComponentFixture<DeanCronogramaComponent>;
  let component: DeanCronogramaComponent;
  let http: HttpTestingController;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    TestBed.configureTestingModule({
      imports: [DeanCronogramaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ToastService, useValue: toastSpy }],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeanCronogramaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('tamano')).toBe('20');
    expect(req.request.params.has('desde')).toBeFalse();
    req.flush({
      exitoso: true,
      total: 1,
      datos: [
        {
          id: 's-1',
          nombre: 'Sesión 1',
          codigo: 'S-01',
          numeroSemana: 2,
          fechaHoraInicio: '2026-02-03T07:00:00',
          fechaHoraFin: '2026-02-03T09:00:00',
          idGrupo: 'g-1',
          codigoGrupo: 1,
          nombreGrupo: 'Grupo 1',
          idAsignatura: 'a-1',
          nombreAsignatura: 'Cálculo',
        },
      ],
    });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('APP-04: la hora sin zona del cronograma se muestra literal e identificada', () => {
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('03/02/2026 07:00 – 09:00');
    expect(texto).toContain('sin zona horaria');
  });

  it('HU145: una sesión CONFIRMADA se muestra en la zona efectiva desde su instante UTC', () => {
    component.onPagina(1);
    http.expectOne((r) => r.url === URL).flush({
      exitoso: true,
      total: 1,
      datos: [
        {
          id: 's-2',
          nombre: 'Sesión 2',
          codigo: 'S-02',
          numeroSemana: 2,
          fechaHoraInicio: '2026-02-03T13:00:00',
          fechaHoraFin: '2026-02-03T15:00:00',
          fechaHoraInicioUtc: '2026-02-03T13:00:00.0000000Z',
          fechaHoraFinUtc: '2026-02-03T15:00:00.0000000Z',
          estadoTemporal: 'CONFIRMADA',
          idGrupo: 'g-1',
          codigoGrupo: 1,
          nombreGrupo: 'Grupo 1',
          idAsignatura: 'a-1',
          nombreAsignatura: 'Cálculo',
        },
      ],
    });
    fixture.detectChanges();
    const esperado = component.timeZone.formatTemporalRange('2026-02-03T13:00:00.0000000Z', '2026-02-03T15:00:00.0000000Z');
    const texto = fixture.nativeElement.textContent as string;
    expect(component.horario(component.sesiones()[0])).toBe(esperado);
    expect(texto).toContain(esperado);
    expect(texto).not.toContain('sin zona horaria');
    expect(texto).toContain('Horas en');
  });

  it('HU145: lista las sesiones con asignatura y grupo (B2NM: la sesión ya no trae programa)', () => {
    const texto = fixture.nativeElement.textContent as string;
    expect(component.total()).toBe(1);
    expect(texto).toContain('S-01');
    expect(texto).toContain('Cálculo · Grupo 1');
    expect(texto).not.toContain('Programa');
  });

  it('HU145: filtra por rango y rechaza un rango invertido sin consultar', () => {
    component.desde.set('2026-03-01');
    component.hasta.set('2026-02-01');
    component.filtrar();
    expect(toastSpy.error).toHaveBeenCalledWith('La fecha desde no puede ser posterior a la fecha hasta.');

    component.desde.set('2026-02-01');
    component.hasta.set('2026-02-28');
    component.filtrar();
    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('desde')).toBe('2026-02-01');
    expect(req.request.params.get('hasta')).toBe('2026-02-28');
    req.flush({ exitoso: true, datos: [], total: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay sesiones programadas en el rango seleccionado.');
  });

  it('paginación, tamaño y errores', () => {
    component.onPagina(2);
    expect(http.expectOne((r) => r.url === URL).request.params.get('pagina')).toBe('2');
    component.onTamano(50);
    http.expectOne((r) => r.url === URL).flush({ exitoso: false }, { status: 500, statusText: 'Error' });
    expect(component.sesiones()).toEqual([]);
    expect(toastSpy.error).toHaveBeenCalled();
  });

  it('B1-F-27 HU145: una sesión cancelada por festivo muestra la etiqueta y el nombre del festivo', () => {
    component.onPagina(1);
    http.expectOne((r) => r.url === URL).flush({
      exitoso: true,
      total: 1,
      datos: [
        {
          id: 's-9', nombre: 'Sesión 9', codigo: 'S-09', numeroSemana: 3,
          fechaHoraInicio: '2026-03-23T07:00:00', fechaHoraFin: '2026-03-23T09:00:00',
          idGrupo: 'g-1', codigoGrupo: 1, nombreGrupo: 'Grupo 1', idAsignatura: 'a-1',
          nombreAsignatura: 'Cálculo',
          estado: 'CANCELADA',
          cancelacion: { tipo: 'FESTIVO', motivo: null, nombreFestivo: 'San José', fechaCancelacionUtc: null },
        },
      ],
    });
    fixture.detectChanges();

    const fila = fixture.nativeElement.querySelector('[data-testid="sesion-fila-s-9"]') as HTMLElement;
    expect(fila.textContent).toContain('Cancelada');
    expect(fila.textContent).toContain('Día festivo: San José');
  });
});

describe('Mock backend de consultas del decano (HU104/HU105/HU109/HU119/HU145)', () => {
  afterEach(() => {
    TestBed.inject(AuthService).setMockMode(false);
    localStorage.removeItem('USE_MOCKS');
  });

  it('responde estudiantes filtrados, ficha, estructura y sesiones en modo mock', (done) => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([mockBackendInterceptor]))],
    });
    TestBed.inject(AuthService).setMockMode(true);
    const service = TestBed.inject(DeanFacultadService);

    service.getEstudiantes({ busqueda: 'luis', pagina: 1, tamano: 10 }).subscribe((estudiantes) => {
      expect(estudiantes.datos.length).toBe(1);
      expect(estudiantes.datos[0].nombreCompleto).toBe('Luis Gómez');
      service.getFichaEstudiante('EST-MOCK-1').subscribe((ficha) => {
        expect(ficha.datos.matriculas.length).toBe(1);
        service.getEstructura().subscribe((estructura) => {
          expect(estructura.datos[0].programas[0].planes[0].inp).toBe(20241);
          service.getSesiones({ pagina: 1, tamano: 10 }).subscribe((sesiones) => {
            expect(sesiones.datos[0].codigo).toBe('S-01');
            service.getAsignaturasPlan('PLAN-1', { pagina: 1, tamano: 10 }).subscribe((malla) => {
              expect(malla.elementos.length).toBe(2);
              expect(malla.totalElementos).toBe(2);
              expect(malla.elementos[1].semestre).toBe(2);
              expect(malla.elementos[1].creditos).toBe(3);
              expect(malla.elementos[1].nombreCaracter).toBe('Optativa');
              done();
            });
          });
        });
      });
    });
  });
});
