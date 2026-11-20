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

  it('pagina el directorio con PaginationComponent en el servidor y el buscador reinicia la pagina', () => {
    fixture.detectChanges();
    http.expectOne(porUrl(`${environment.apiUrl}/decano/coordinadores`))
      .flush(paginaApi(Array.from({ length: 6 }, (_, i) => coord(i + 1)), 1, 6, 14));
    http.match(() => true).forEach((r) => r.flush(/\/(tipos-programa|modalidades-programa|jornadas-programa)$/.test(r.request.url) ? [] : { exitoso: true, datos: [] }));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-pagination')).toBeTruthy();
    expect(component.coordinadores()).toHaveSize(6);
    expect(component.totalCoordinadores()).toBe(14);

    component.currentPage.set(3);
    component.searchQuery = 'Nombre1';
    // La búsqueda no consulta en cada tecla: se envía al presionar Enter.
    http.expectNone(porUrl(`${environment.apiUrl}/decano/coordinadores`));
    const input = el.querySelector('input[type="search"]') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
    const req = http.expectOne(porUrl(`${environment.apiUrl}/decano/coordinadores`));
    expect(req.request.params.get('busqueda')).toBe('Nombre1');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush(paginaApi(Array.from({ length: 6 }, (_, i) => coord(i + 1)), 1, 6, 6));
    expect(component.currentPage()).toBe(1);
    expect(component.totalCoordinadores()).toBe(6);
  });

  it('bloque E: los coordinadores se listan en una tabla (una fila por coordinador, 15 por página) con sus acciones', () => {
    iniciar([coord(1), coord(2)]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const filas = el.querySelectorAll('app-tabla-datos tbody tr[data-testid="coordinador-fila"]');
    expect(filas).toHaveSize(2);
    expect(el.querySelector('app-card')).toBeNull();
    expect(filas[0].textContent).toContain('Nombre1 Apellido1');
    expect(filas[0].textContent).toContain('Sistemas');
    expect(filas[0].textContent).toContain('COORD-1001');
    const editar = spyOn(component, 'abrirEdicion');
    const estado = spyOn(component, 'toggleEstado');
    const botones = Array.from(filas[0].querySelectorAll('button'));
    botones.find((b) => b.textContent?.includes('Editar'))!.click();
    botones.find((b) => b.textContent?.includes('Desactivar'))!.click();
    expect(editar).toHaveBeenCalledTimes(1);
    expect(estado).toHaveBeenCalledTimes(1);
    expect(component.pageSize()).toBe(15);
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
    // IDENT-002: el formulario ya no tiene contraseña; quedan los demás campos obligatorios.
    expect(alertas.some((t) => t?.toLowerCase().includes('contraseña'))).toBeFalse();
    expect(alertas.length).toBeGreaterThanOrEqual(4);
  });

  describe('UX densidad: cabecera con una accion primaria', () => {
    function abrirMenu(): void {
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="action-menu-trigger"]')!.click();
      fixture.detectChanges();
    }

    it('muestra "Nombrar" como unica accion visible mas el menu "Mas"', () => {
      iniciar([coord(1)]);
      const cab = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="acciones-encabezado"]') as HTMLElement;
      expect(cab.querySelectorAll('button')).toHaveSize(2);
      expect(cab.textContent).toContain('Nombrar');
      expect(cab.textContent).not.toContain('Carga Masiva');
    });

    it('"Registrar nuevo" esta en el menu y abre el registro; ya no hay carga masiva (DEC-074)', () => {
      iniciar([coord(1)]);
      const el = fixture.nativeElement as HTMLElement;
      abrirMenu();
      // DEC-074: sin carga masiva por CSV; el personal se registra uno por uno.
      expect(el.querySelector('[data-testid="accion-carga-masiva"]')).toBeNull();
      (el.querySelector('[data-testid="accion-registrar-nuevo"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(component.vistaActual()).toBe('REGISTRO');
    });
  });
});
