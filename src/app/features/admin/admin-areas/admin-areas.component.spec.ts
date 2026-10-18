import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminAreasComponent } from './admin-areas.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';

describe('AdminAreasComponent', () => {
  let fixture: ComponentFixture<AdminAreasComponent>;
  let component: AdminAreasComponent;
  let adminService: AdminManagementService;
  let toastService: jasmine.SpyObj<ToastService>;
  let http: HttpTestingController;

  const mockAreas = [
    {
      id: 'area-1',
      codigo: 'SOFT',
      nombre: 'Ingeniería de Software',
      facultadId: 'fac-1',
      facultadNombre: 'Facultad de Ingeniería',
      totalAsignaturas: 12,
      estado: 'ACTIVO' as const,
    },
    {
      id: 'area-2',
      codigo: 'CIEN-BAS',
      nombre: 'Ciencias Básicas',
      facultadId: 'fac-1',
      facultadNombre: 'Facultad de Ingeniería',
      totalAsignaturas: 8,
      estado: 'ACTIVO' as const,
    },
  ];

  beforeEach(() => {
    const toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    TestBed.configureTestingModule({
      imports: [AdminAreasComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toastSpy },
      ],
    });

    adminService = TestBed.inject(AdminManagementService);
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(AdminAreasComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    http.verify();
  });

  it('debe inicializarse y cargar áreas y facultades', () => {
    fixture.detectChanges();

    http.expectOne(`${environment.apiUrl}/admin/areas`).flush({
      exitoso: true,
      datos: mockAreas,
    });
    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({
      exitoso: true,
      datos: [{ id: 'fac-1', nombre: 'Facultad de Ingeniería' }],
    });

    expect(component).toBeTruthy();
    expect(component.areas().length).toBe(2);
    expect(component.totalActivas()).toBe(2);
    expect(component.facultadesConAreas()).toBe(1);
  });

  it('filtra áreas por nombre de facultad o código reactivamente', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/admin/areas`).flush({ exitoso: true, datos: mockAreas });
    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: true, datos: [] });

    component.filtroTexto.set('Básicas');
    expect(component.areasFiltradas().length).toBe(1);
    expect(component.areasFiltradas()[0].codigo).toBe('CIEN-BAS');
  });

  it('abre formulario de creación y guarda nueva área', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/admin/areas`).flush({ exitoso: true, datos: [] });
    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({
      exitoso: true,
      datos: [{ id: 'fac-1', nombre: 'Facultad de Ingeniería' }],
    });

    component.abrirFormularioCrear();
    expect(component.vista()).toBe('FORM');

    component.formArea = {
      codigo: 'TEL',
      nombre: 'Telecomunicaciones y Redes',
      facultadId: 'fac-1',
      facultadNombre: 'Facultad de Ingeniería',
      totalAsignaturas: 5,
      estado: 'ACTIVO',
    };

    spyOn(adminService, 'crearArea');
    component.guardar();

    expect(adminService.crearArea).toHaveBeenCalled();
    expect(toastService.success).toHaveBeenCalledWith('Área de conocimiento registrada exitosamente.');
    expect(component.vista()).toBe('LISTA');
  });
});
