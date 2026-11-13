import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminPeriodosComponent } from './admin-periodos.component';
import { environment } from '../../../../environments/environment';
import { PeriodoAcademicoItem } from '../../../core/models/role-management.model';
import { By } from '@angular/platform-browser';
import { AcademicPeriodsTabComponent } from '../../coordinator/coordinator-study-plans/components/academic-periods-tab.component';
import { ToastService } from '../../../shared/components/toast/toast.component';

describe('AdminPeriodosComponent', () => {
  let fixture: ComponentFixture<AdminPeriodosComponent>;
  let component: AdminPeriodosComponent;
  let http: HttpTestingController;
  let toastSpy: jasmine.SpyObj<ToastService>;

  const mockPeriodos: PeriodoAcademicoItem[] = [
    {
      id: 'per-2026-2',
      codigo: '2026-2',
      nombre: 'Período 2026-2',
      fechaInicio: '2026-08-01',
      fechaFin: '2026-12-15',
      estado: 'ACTIVO',
      esActual: true,
    },
  ];

  beforeEach(() => {
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    TestBed.configureTestingModule({
      imports: [AdminPeriodosComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: ToastService, useValue: toastSpy }],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminPeriodosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    http.match(`${environment.apiUrl}/coordinador/planes-estudio`).forEach((req) => req.flush({ exitoso: true, datos: [] }));
    http.match(`${environment.apiUrl}/coordinador/periodos-academicos`).forEach((req) =>
      req.flush({ exitoso: true, datos: mockPeriodos })
    );
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('carga los períodos de la institución', () => {
    expect(component.periodos().length).toBe(1);
  });

  it('HU096/HU097: crea y modifica por el endpoint del administrador y recarga', () => {
    const datos = { nombre: '2027-1', fechaInicio: '2027-02-01', fechaFin: '2027-06-30' };
    component.guardarPeriodo({ modo: 'CREAR', datos });
    const postReq = http.expectOne(`${environment.apiUrl}/admin/periodos-academicos`);
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual(datos);
    postReq.flush({ exitoso: true, mensajeUsuario: 'Periodo academico registrado(a) exitosamente.', datos: null });
    http.expectOne(`${environment.apiUrl}/coordinador/periodos-academicos`).flush({ exitoso: true, datos: mockPeriodos });
    expect(toastSpy.success).toHaveBeenCalledWith('Periodo academico registrado(a) exitosamente.');

    component.guardarPeriodo({ modo: 'EDITAR', id: 'per-2026-2', datos });
    const putReq = http.expectOne(`${environment.apiUrl}/admin/periodos-academicos/per-2026-2`);
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({ exitoso: true, datos: null });
    http.expectOne(`${environment.apiUrl}/coordinador/periodos-academicos`).flush({ exitoso: true, datos: mockPeriodos });
  });

  it('DEC-065: el dialogo permanece abierto y muestra el mensaje del backend si guardar falla', () => {
    const tab = fixture.debugElement.query(By.directive(AcademicPeriodsTabComponent)).componentInstance as AcademicPeriodsTabComponent;
    tab.abrirCrear();
    component.guardarPeriodo({ modo: 'CREAR', datos: { nombre: '2026-2', fechaInicio: '2026-01-01', fechaFin: '2026-06-01' } });
    expect(component.guardando()).toBeTrue();
    http
      .expectOne(`${environment.apiUrl}/admin/periodos-academicos`)
      .flush({ exitoso: false, message: 'Ya existe un periodo con ese nombre.' }, { status: 409, statusText: 'Conflict' });
    expect(component.guardando()).toBeFalse();
    expect(component.errorGuardado()).toBe('Ya existe un periodo con ese nombre.');
    expect(tab.mostrarModal()).toBeTrue();
    http.expectNone(`${environment.apiUrl}/coordinador/periodos-academicos`);
  });

  it('DEC-065: respuesta exitoso=false sin excepcion HTTP deja el dialogo abierto con el mensaje', () => {
    const tab = fixture.debugElement.query(By.directive(AcademicPeriodsTabComponent)).componentInstance as AcademicPeriodsTabComponent;
    tab.abrirCrear();
    component.guardarPeriodo({ modo: 'CREAR', datos: { nombre: '2026-2', fechaInicio: '2026-01-01', fechaFin: '2026-06-01' } });
    http.expectOne(`${environment.apiUrl}/admin/periodos-academicos`).flush({ exitoso: false, mensajeUsuario: 'Dato invalido.' });
    expect(component.errorGuardado()).toBe('Dato invalido.');
    expect(tab.mostrarModal()).toBeTrue();

    component.guardarPeriodo({ modo: 'CREAR', datos: { nombre: '2026-2', fechaInicio: '2026-01-01', fechaFin: '2026-06-01' } });
    http.expectOne(`${environment.apiUrl}/admin/periodos-academicos`).flush({ exitoso: false });
    expect(component.errorGuardado()).toBe('No se pudo guardar el período académico.');
  });

  it('DEC-065: cierra el dialogo y recarga solo tras la respuesta exitosa', () => {
    const tab = fixture.debugElement.query(By.directive(AcademicPeriodsTabComponent)).componentInstance as AcademicPeriodsTabComponent;
    tab.abrirCrear();
    component.guardarPeriodo({ modo: 'CREAR', datos: { nombre: '2027-1', fechaInicio: '2027-01-01', fechaFin: '2027-06-01' } });
    expect(tab.mostrarModal()).toBeTrue();
    http.expectOne(`${environment.apiUrl}/admin/periodos-academicos`).flush({ exitoso: true, datos: null });
    expect(tab.mostrarModal()).toBeFalse();
    expect(toastSpy.success).toHaveBeenCalledWith('Período académico guardado.');
    http.expectOne(`${environment.apiUrl}/coordinador/periodos-academicos`).flush({ exitoso: true, datos: mockPeriodos });
  });

  it('HU098: elimina tras confirmar en el dialogo, no elimina si cancela y muestra el rechazo si tiene grupos', () => {
    component.eliminarPeriodo(mockPeriodos[0]);
    expect(component.periodoPorEliminar()).toBe(mockPeriodos[0]);
    component.cancelarEliminacion();
    http.expectNone(`${environment.apiUrl}/admin/periodos-academicos/per-2026-2`);
    expect(component.periodoPorEliminar()).toBeNull();

    component.eliminarPeriodo(mockPeriodos[0]);
    component.confirmarEliminacion();
    const okReq = http.expectOne(`${environment.apiUrl}/admin/periodos-academicos/per-2026-2`);
    expect(okReq.request.method).toBe('DELETE');
    okReq.flush({ exitoso: true, datos: null });
    http.expectOne(`${environment.apiUrl}/coordinador/periodos-academicos`).flush({ exitoso: true, datos: [] });
    expect(toastSpy.success).toHaveBeenCalledWith('Período 2026-2 eliminado.');

    component.eliminarPeriodo(mockPeriodos[0]);
    component.confirmarEliminacion();
    http
      .expectOne(`${environment.apiUrl}/admin/periodos-academicos/per-2026-2`)
      .flush({ exitoso: false }, { status: 409, statusText: 'Conflict' });
    expect(toastSpy.error).toHaveBeenCalled();
  });

  it('F-ADM-007: la eliminacion pide confirmacion con un alertdialog y nunca usa window.confirm', () => {
    const nativo = spyOn(window, 'confirm');
    component.eliminarPeriodo(mockPeriodos[0]);
    fixture.detectChanges();
    const dialogo = (fixture.nativeElement as HTMLElement).querySelector('[role="alertdialog"]');
    expect(dialogo?.textContent).toContain('2026-2');
    expect(nativo).not.toHaveBeenCalled();
  });

  it('carga con error muestra el mensaje', () => {
    component.cargarPeriodos();
    http.expectOne(`${environment.apiUrl}/coordinador/periodos-academicos`).flush(null, { status: 500, statusText: 'Error' });
    expect(toastSpy.error).toHaveBeenCalled();
  });
});
