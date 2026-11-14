import { StudentRegistrationConfigService } from '../../../core/services/student-registration-config.service';
import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { paginaApi, porUrl } from '../../../core/testing/pagina-api';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeanCoordinadoresComponent } from './dean-coordinadores.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';

function coord(n: number) {
  return {
    id: `c-${n}`,
    numeroIdentificacion: `100${n}`,
    nombres: `Nombre${n}`,
    apellidos: `Apellido${n}`,
    correo: `c${n}@uco.edu.co`,
    facultad: 'Ingeniería',
    programaAcademico: 'Sistemas',
    estado: 'ACTIVO',
    totalDocentes: 1,
    totalGrupos: 1,
  };
}

describe('DeanCoordinadoresComponent UX (F-DEC-004, F-DEC-007, F-DEC-S04, F-COO-010)', () => {
  let fixture: ComponentFixture<DeanCoordinadoresComponent>;
  let component: DeanCoordinadoresComponent;
  let http: HttpTestingController;
  let toast: jasmine.SpyObj<ToastService>;

  function iniciar(coordinadores: unknown[] | 'error') {
    fixture.detectChanges();
    const req = http.expectOne(porUrl(`${environment.apiUrl}/decano/coordinadores`));
    if (coordinadores === 'error') {
      req.flush({ code: 'ERR_INTERNAL', message: 'Servicio de coordinadores no disponible.', correlationId: 'x' }, { status: 500, statusText: 'err' });
    } else {
      req.flush(paginaApi(coordinadores));
    }
    http
      .match(() => true)
      .forEach((r) => r.flush(/\/(tipos-programa|modalidades-programa|jornadas-programa)$/.test(r.request.url) ? [] : { exitoso: true, datos: [] }));
    fixture.detectChanges();
  }

  beforeEach(() => {
    toast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    TestBed.configureTestingModule({
      imports: [DeanCoordinadoresComponent],
      providers: [{ provide: ToastService, useValue: toast }, { provide: StudentRegistrationConfigService, useValue: { getEmailDomain: () => of('@uco.edu.co') } }, provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeanCoordinadoresComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => http.verify());

  it('pagina el directorio con PaginationComponent y el buscador reinicia la pagina', () => {
    iniciar(Array.from({ length: 14 }, (_, i) => coord(i + 1)));
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-pagination')).toBeTruthy();
    expect(component.paginatedCoordinadores().length).toBe(6);
    component.currentPage.set(3);
    component.searchQuery = 'Nombre1';
    expect(component.currentPage()).toBe(1);
    expect(component.filteredCoordinadores().length).toBe(6);
  });

  it('el buscador y el filtro de estado tienen nombre accesible', () => {
    iniciar([coord(1)]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('input[type="search"]')?.getAttribute('aria-label')).toBeTruthy();
    expect(el.querySelector('select')?.getAttribute('aria-label')).toBeTruthy();
  });

  it('un error de carga muestra el mensaje del backend, no un texto fijo', () => {
    iniciar('error');
    expect(toast.error).toHaveBeenCalledWith('Servicio de coordinadores no disponible.');
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('Servicio de coordinadores no disponible.');
  });

  it('un submit vacio muestra el mensaje de validacion bajo cada campo obligatorio', () => {
    iniciar([coord(1)]);
    component.abrirFormularioRegistro();
    fixture.detectChanges();
    const guardar = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Guardar Coordinador'),
    ) as HTMLButtonElement;
    // DEC-065: Guardar permanece deshabilitado mientras el formulario sea inválido; la validación por campo sigue disponible al intentar guardar.
    expect(guardar.disabled).toBeTrue();
    component.guardarCoordinador();
    fixture.detectChanges();
    const alertas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('p[role="alert"]')).map((a) => a.textContent);
    expect(alertas.some((t) => t?.includes('primer nombre es obligatorio'))).toBeTrue();
    expect(alertas.some((t) => t?.includes('primer apellido es obligatorio'))).toBeTrue();
    expect(alertas.some((t) => t?.includes('contraseña es obligatoria'))).toBeTrue();
    expect(alertas.length).toBeGreaterThanOrEqual(5);
  });

  describe('UX densidad: cabecera con una accion primaria', () => {
    function abrirMenu(): void {
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="action-menu-trigger"]')!.click();
      fixture.detectChanges();
    }

    it('muestra "Nombrar" como unica accion visible mas el menu "Mas"', () => {
      iniciar([coord(1)]);
      const cab = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="acciones-encabezado"]') as HTMLElement;
      expect(cab.querySelectorAll('button').length).toBe(2);
      expect(cab.textContent).toContain('Nombrar');
      expect(cab.textContent).not.toContain('Carga Masiva');
    });

    it('"Carga masiva CSV" y "Registrar nuevo" estan en el menu y ejecutan su accion', () => {
      iniciar([coord(1)]);
      const el = fixture.nativeElement as HTMLElement;
      abrirMenu();
      (el.querySelector('[data-testid="accion-carga-masiva"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(component.mostrarCargaMasiva()).toBeTrue();
      component.mostrarCargaMasiva.set(false);
      fixture.detectChanges();
      abrirMenu();
      (el.querySelector('[data-testid="accion-registrar-nuevo"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(component.vistaActual()).toBe('REGISTRO');
    });
  });
});
