import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TeacherGrupoSolicitudesComponent } from './teacher-grupo-solicitudes.component';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { environment } from '../../../../../environments/environment';

const BANDEJA = `${environment.apiUrl}/docente/grupos/grp-1/solicitudes-ingreso`;

const fila = (id: string, estado: string, posicionEspera: number | null = null) => ({
  id,
  estudianteId: 'est-' + id,
  estudianteNombre: 'Estudiante ' + id,
  numeroIdentificacion: 1017000,
  estado,
  fechaSolicitudUtc: '2026-10-27T13:00:00Z',
  fechaResolucionUtc: null,
  motivoRechazo: null,
  posicionEspera,
  capacidadGrupo: 30,
  cuposDisponibles: 0,
});

describe('TeacherGrupoSolicitudesComponent (HU053-HU055: solicitudes de ingreso del grupo)', () => {
  let fixture: ComponentFixture<TeacherGrupoSolicitudesComponent>;
  let component: TeacherGrupoSolicitudesComponent;
  let http: HttpTestingController;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    TestBed.configureTestingModule({
      imports: [TeacherGrupoSolicitudesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ToastService, useValue: toastSpy }],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TeacherGrupoSolicitudesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('grupoId', 'grp-1');
    fixture.detectChanges();
    http.expectOne((r) => r.url === BANDEJA).flush({
      exitoso: true,
      total: 2,
      datos: [fila('s1', 'PENDIENTE'), fila('s2', 'EN_ESPERA', 1)],
    });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('TS-01 muestra cupo disponible, estados y la posición en la lista de espera', () => {
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Cupos disponibles: 0 de 30');
    expect(texto).toContain('Estudiante s1');
    expect(texto).toContain('#1 en espera');
    expect(fixture.nativeElement.querySelectorAll('button[data-accion="aceptar"]')).toHaveSize(2);
  });

  it('TS-02 aceptar sin cupo informa que quedó en lista de espera y recarga', () => {
    component.aceptar(component.solicitudes()[0]);
    const req = http.expectOne(`${environment.apiUrl}/docente/solicitudes-ingreso/s1`);
    expect(req.request.body).toEqual({ accion: 'ACEPTAR' });
    req.flush({ exitoso: true, datos: { id: 's1', estadoResultante: 'EN_ESPERA' } });

    expect(toastSpy.info).toHaveBeenCalled();
    http.expectOne((r) => r.url === BANDEJA).flush({ exitoso: true, datos: [], total: 0 });
  });

  it('TS-03 aceptar con cupo (cualquiera de la lista de espera) matricula, avisa y pide recargar el padrón', () => {
    let padronRecargado = false;
    component.matriculaCambiada.subscribe(() => (padronRecargado = true));
    component.aceptar(component.solicitudes()[1]);
    http.expectOne(`${environment.apiUrl}/docente/solicitudes-ingreso/s2`)
      .flush({ exitoso: true, datos: { id: 's2', estadoResultante: 'ACEPTADA' } });
    expect(toastSpy.success).toHaveBeenCalled();
    expect(padronRecargado).toBeTrue();
    http.expectOne((r) => r.url === BANDEJA).flush({ exitoso: true, datos: [], total: 0 });
  });

  it('TS-04 rechazar exige motivo (1..500) y lo envía', () => {
    component.iniciarRechazo(component.solicitudes()[0]);
    component.motivoRechazo.set('  ');
    component.confirmarRechazo();
    expect(component.errorRechazo()).toContain('obligatorio');
    http.expectNone(`${environment.apiUrl}/docente/solicitudes-ingreso/s1`);

    component.motivoRechazo.set(' Cupo reservado ');
    component.confirmarRechazo();
    const req = http.expectOne(`${environment.apiUrl}/docente/solicitudes-ingreso/s1`);
    expect(req.request.body).toEqual({ accion: 'RECHAZAR', motivo: 'Cupo reservado' });
    req.flush({ exitoso: true, datos: { id: 's1', estadoResultante: 'RECHAZADA' } });
    expect(component.solicitudEnRechazo()).toBeNull();
    http.expectOne((r) => r.url === BANDEJA).flush({ exitoso: true, datos: [], total: 0 });
  });

  it('TS-05 un 409 (sigue sin cupo) muestra el mensaje y el filtro recarga', () => {
    component.aceptar(component.solicitudes()[1]);
    http.expectOne(`${environment.apiUrl}/docente/solicitudes-ingreso/s2`).flush(
      { exitoso: false, message: 'El grupo sigue sin cupo; la solicitud permanece en lista de espera.' },
      { status: 409, statusText: 'Conflict' }
    );
    expect(toastSpy.error).toHaveBeenCalled();

    component.onEstadoChange('EN_ESPERA');
    expect(http.expectOne((r) => r.url === BANDEJA).request.params.get('estado')).toBe('EN_ESPERA');
  });

  // Certificación Fase 3: sin solicitudes los cupos no se conocen; antes se mostraba "Cupos disponibles: 0 de 0".
  it('TS-10 sin solicitudes no muestra un cupo inventado', () => {
    component.onEstadoChange('PENDIENTE');
    http.expectOne((r) => r.url === BANDEJA).flush({ exitoso: true, total: 0, datos: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent as string).toContain('Cupos disponibles: 0 de 30');

    const nuevo = TestBed.createComponent(TeacherGrupoSolicitudesComponent);
    nuevo.componentRef.setInput('grupoId', 'grp-1');
    nuevo.detectChanges();
    http.expectOne((r) => r.url === BANDEJA).flush({ exitoso: true, total: 0, datos: [] });
    nuevo.detectChanges();
    expect(nuevo.nativeElement.textContent as string).not.toContain('Cupos disponibles');
  });
});
