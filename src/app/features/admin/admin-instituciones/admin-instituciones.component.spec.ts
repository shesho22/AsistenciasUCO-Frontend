import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminInstitucionesComponent } from './admin-instituciones.component';
import { environment } from '../../../../environments/environment';

describe('AdminInstitucionesComponent (F-ADM-009)', () => {
  let fixture: ComponentFixture<AdminInstitucionesComponent>;
  let component: AdminInstitucionesComponent;
  let http: HttpTestingController;

  const mockInstituciones = [
    {
      id: 'inst-1',
      codigo: 'UCO-01',
      nombre: 'Universidad Católica de Oriente',
      nit: '890980040-8',
      direccion: 'Sector 3, Cra. 46 No. 48-111, Rionegro, Antioquia',
      telefono: '(604) 569 90 90',
      correoContacto: 'contacto@uco.edu.co',
      rector: 'Pbro. Elkin de Jesús Narváez Gómez',
      activa: true,
      totalFacultades: 5,
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminInstitucionesComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminInstitucionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('consulta GET /admin/instituciones y muestra los datos institucionales de solo lectura', () => {
    const req = http.expectOne(`${environment.apiUrl}/admin/instituciones`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: mockInstituciones });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Universidad Católica de Oriente');
    expect(host.textContent).toContain('UCO-01');
    expect(host.textContent).toContain('890980040-8');
    expect(component.instituciones().length).toBe(1);
  });

  it('informa si no hay instituciones registradas', () => {
    http.expectOne(`${environment.apiUrl}/admin/instituciones`).flush({ exitoso: true, datos: [] });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('No hay instituciones registradas');
  });
});
