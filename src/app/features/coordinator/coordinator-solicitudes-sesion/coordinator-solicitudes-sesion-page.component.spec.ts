import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { CoordinatorSolicitudesSesionPageComponent } from './coordinator-solicitudes-sesion-page.component';
import { CoordinatorSolicitudesSesionComponent } from './coordinator-solicitudes-sesion.component';
import { SolicitudesSesionMenuService } from '../../../core/services/solicitudes-sesion-menu.service';
import { environment } from '../../../../environments/environment';
import { paginaApi, porUrl } from '../../../core/testing/pagina-api';

describe('CoordinatorSolicitudesSesionPageComponent (ATA D6)', () => {
  let fixture: ComponentFixture<CoordinatorSolicitudesSesionPageComponent>;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/coordinador`;

  beforeEach(() => {
    try { sessionStorage.removeItem('coordinador.programaId'); } catch { /* sin almacenamiento */ }
    TestBed.configureTestingModule({
      imports: [CoordinatorSolicitudesSesionPageComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CoordinatorSolicitudesSesionPageComponent);
    fixture.detectChanges();
    http.expectOne(porUrl(`${base}/planes-estudio`)).flush(paginaApi([{ id: 'pl-1', idPrograma: 'p-1', nombrePrograma: 'Sistemas' }]));
    http.expectOne((r) => r.url === `${base}/sesiones/solicitudes`).flush(paginaApi([], 1, 20, 0));
    fixture.detectChanges();
  });

  afterEach(() => {
    try { sessionStorage.removeItem('coordinador.programaId'); } catch { /* sin almacenamiento */ }
    http.verify();
  });

  it('muestra un solo título y la bandeja de solicitudes', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('h1')).toHaveSize(1);
    expect(el.querySelector('h1')?.textContent).toContain('Solicitudes de sesión');
    expect(el.querySelector('[data-testid="solicitudes-sesion"]')).not.toBeNull();
  });

  it('al resolver una solicitud recarga el contador del menú', () => {
    const menu = TestBed.inject(SolicitudesSesionMenuService);
    const recargar = spyOn(menu, 'recargar');
    fixture.debugElement.query(By.directive(CoordinatorSolicitudesSesionComponent)).componentInstance.resuelta.emit();
    expect(recargar).toHaveBeenCalledTimes(1);
  });
});
