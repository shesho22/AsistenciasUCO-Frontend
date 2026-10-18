import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminFacultadesComponent } from './admin-facultades.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';
import { of } from 'rxjs';

describe('AdminFacultadesComponent', () => {
  let fixture: ComponentFixture<AdminFacultadesComponent>;
  let component: AdminFacultadesComponent;
  let adminService: AdminManagementService;
  let toastService: jasmine.SpyObj<ToastService>;
  let http: HttpTestingController;

  const mockFacultades = [
    {
      id: 'fac-1',
      codigo: '',
      nombre: 'Facultad de Ingeniería',
      decanoId: 'dec-1',
      decanoNombre: 'Dr. Roberto Gómez',
      estado: 'ACTIVO' as const,
      totalProgramas: 4,
      totalEstudiantes: 320,
    },
    {
      id: 'fac-2',
      codigo: '',
      nombre: 'Facultad de Ciencias Económicas',
      decanoId: 'dec-2',
      decanoNombre: 'Dra. María Pérez',
      estado: 'INACTIVO' as const,
      totalProgramas: 3,
      totalEstudiantes: 210,
    },
  ];

  const mockDecanos = [
    {
      id: 'dec-1',
      numeroIdentificacion: '12345678',
      nombres: 'Roberto',
      apellidos: 'Gómez',
      correo: 'rgomez@uco.edu.co',
      facultad: 'Facultad de Ingeniería',
      telefono: '123456',
      fechaAsignacion: '2026-01-01',
      estado: 'ACTIVO' as const,
    },
    {
      id: 'dec-2',
      numeroIdentificacion: '87654321',
      nombres: 'María',
      apellidos: 'Pérez',
      correo: 'mperez@uco.edu.co',
      facultad: 'Facultad de Ciencias Económicas',
      telefono: '654321',
      fechaAsignacion: '2026-01-01',
      estado: 'ACTIVO' as const,
    },
  ];

  beforeEach(() => {
    const toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    TestBed.configureTestingModule({
      imports: [AdminFacultadesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toastSpy },
      ],
    });

    adminService = TestBed.inject(AdminManagementService);
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(AdminFacultadesComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    http.verify();
  });

  it('debe inicializarse correctamente y cargar facultades y decanos', () => {
    fixture.detectChanges();

    const reqFac = http.expectOne(`${environment.apiUrl}/admin/facultades`);
    reqFac.flush({ exitoso: true, datos: mockFacultades });

    const reqDec = http.expectOne(`${environment.apiUrl}/admin/decanos`);
    reqDec.flush({ exitoso: true, datos: mockDecanos });

    const reqInst = http.expectOne(`${environment.apiUrl}/admin/instituciones`);
    reqInst.flush({ exitoso: true, datos: [{ id: 'inst-uco', nombre: 'UCO' }] });

    expect(component).toBeTruthy();
    expect(component.facultades().length).toBe(2);
  });

  it('calcula métricas Bento Grid correctamente (Totales, Activas, Inactivas, Con Decano)', () => {
    fixture.detectChanges();

    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: true, datos: mockFacultades });
    http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ exitoso: true, datos: mockDecanos });
    http.expectOne(`${environment.apiUrl}/admin/instituciones`).flush({ exitoso: true, datos: [] });

    expect(component.totalActivas()).toBe(1);
    expect(component.totalInactivas()).toBe(1);
    expect(component.totalConDecano()).toBe(2);
  });

  it('el formulario de creación de facultad exige decano titular obligatorio (HU116)', () => {
    fixture.detectChanges();

    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: true, datos: [] });
    http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ exitoso: true, datos: mockDecanos });
    http.expectOne(`${environment.apiUrl}/admin/instituciones`).flush({ exitoso: true, datos: [{ id: 'inst-1', nombre: 'UCO' }] });

    component.abrirFormularioCrear();
    fixture.detectChanges();

    expect(component.vista()).toBe('FORM');
    expect(component.facultadEnEdicion).toBeNull();
    // En el modelo formFacultad se inicializa con el primer decano disponible
    expect(component.formFacultad.idDecano).toBe('dec-1');
  });

  it('guarda una nueva facultad invocando el endpoint con nombre e idDecano', () => {
    fixture.detectChanges();

    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: true, datos: [] });
    http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ exitoso: true, datos: mockDecanos });
    http.expectOne(`${environment.apiUrl}/admin/instituciones`).flush({ exitoso: true, datos: [{ id: 'inst-1', nombre: 'UCO' }] });

    component.abrirFormularioCrear();
    component.formFacultad.nombre = 'Facultad de Teología';
    component.formFacultad.idDecano = 'dec-2';

    spyOn(adminService, 'crearFacultad').and.returnValue(
      of({ exitoso: true, datos: { id: 'fac-3', nombre: 'Facultad de Teología' } })
    );

    component.guardar();

    expect(adminService.crearFacultad).toHaveBeenCalledWith(
      jasmine.objectContaining({
        nombre: 'Facultad de Teología',
        idDecano: 'dec-2',
      })
    );
    expect(toastService.success).toHaveBeenCalledWith('Facultad registrada exitosamente.');
    expect(component.vista()).toBe('LISTA');
  });

  it('detecta nombre duplicado e impide el envío del formulario', () => {
    fixture.detectChanges();

    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: true, datos: mockFacultades });
    http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ exitoso: true, datos: mockDecanos });
    http.expectOne(`${environment.apiUrl}/admin/instituciones`).flush({ exitoso: true, datos: [] });

    component.abrirFormularioCrear();
    component.formFacultad.nombre = 'facultad de ingeniería'; // case-insensitive duplicate
    component.formFacultad.idDecano = 'dec-1';

    expect(component.nombreDuplicado()).toBeTrue();

    spyOn(adminService, 'crearFacultad');
    component.guardar();
    expect(adminService.crearFacultad).not.toHaveBeenCalled();
  });

  it('permite cambiar decano titular vía modal', () => {
    fixture.detectChanges();

    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: true, datos: mockFacultades });
    http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ exitoso: true, datos: mockDecanos });
    http.expectOne(`${environment.apiUrl}/admin/instituciones`).flush({ exitoso: true, datos: [] });

    const fac = mockFacultades[0];
    component.abrirModalVincularDecano(fac);

    expect(component.facultadParaDecano()?.id).toBe(fac.id);

    component.decanoSeleccionadoId = 'dec-2';
    spyOn(adminService, 'asignarDecanoFacultad').and.returnValue(of(true));

    component.confirmarAsignacionDecano();

    expect(adminService.asignarDecanoFacultad).toHaveBeenCalledWith(
      fac.id,
      'dec-2',
      'María Pérez'
    );
    expect(toastService.success).toHaveBeenCalled();
    expect(component.facultadParaDecano()).toBeNull();
  });
});
