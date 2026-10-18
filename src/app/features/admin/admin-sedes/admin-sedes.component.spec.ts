import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminSedesComponent } from './admin-sedes.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';

describe('AdminSedesComponent', () => {
  let fixture: ComponentFixture<AdminSedesComponent>;
  let component: AdminSedesComponent;
  let adminService: AdminManagementService;
  let toastService: jasmine.SpyObj<ToastService>;
  let http: HttpTestingController;

  const mockSedes = [
    {
      id: 'sede-1',
      codigo: 'RION',
      nombre: 'Campus Principal Rionegro',
      municipio: 'Rionegro',
      direccion: 'Sector San Antonio',
      telefono: '6045698000',
      estado: 'ACTIVO' as const,
    },
    {
      id: 'sede-2',
      codigo: 'SONS',
      nombre: 'Centro Regional Sonsón',
      municipio: 'Sonsón',
      direccion: 'Carrera 7',
      telefono: '6048691000',
      estado: 'ACTIVO' as const,
    },
  ];

  beforeEach(() => {
    const toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    TestBed.configureTestingModule({
      imports: [AdminSedesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toastSpy },
      ],
    });

    adminService = TestBed.inject(AdminManagementService);
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(AdminSedesComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    http.verify();
  });

  it('debe inicializarse y cargar sedes', () => {
    fixture.detectChanges();

    http.expectOne(`${environment.apiUrl}/admin/sedes`).flush({
      exitoso: true,
      datos: mockSedes,
    });

    expect(component).toBeTruthy();
    expect(component.sedes().length).toBe(2);
    expect(component.totalActivas()).toBe(2);
  });

  it('filtra sedes por texto reactivamente', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/admin/sedes`).flush({
      exitoso: true,
      datos: mockSedes,
    });

    component.filtroTexto.set('Sonsón');
    expect(component.sedesFiltradas().length).toBe(1);
    expect(component.sedesFiltradas()[0].codigo).toBe('SONS');
  });

  it('abre formulario de creación y valida campos obligatorios', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/admin/sedes`).flush({ exitoso: true, datos: [] });

    component.abrirFormularioCrear();
    expect(component.vista()).toBe('FORM');

    component.formSede = {
      codigo: 'MAR',
      nombre: 'Sede Marinilla',
      municipio: 'Marinilla',
      direccion: 'Parque Principal',
      telefono: '123',
      estado: 'ACTIVO',
    };

    spyOn(adminService, 'crearSede');
    component.guardar();

    expect(adminService.crearSede).toHaveBeenCalled();
    expect(toastService.success).toHaveBeenCalledWith('Sede institucional registrada con éxito.');
    expect(component.vista()).toBe('LISTA');
  });
});
