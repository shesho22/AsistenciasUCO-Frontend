import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CoordinatorFichaModalComponent } from './coordinator-ficha-modal.component';
import { environment } from '../../../../../environments/environment';
import { BitacoraSesion, FichaEstudiante } from '../../../../core/models/coordinator-indicators.model';
import { SessionTimeZoneService } from '../../../../core/services/session-timezone.service';

describe('CoordinatorFichaModalComponent', () => {
  let fixture: ComponentFixture<CoordinatorFichaModalComponent>;
  let component: CoordinatorFichaModalComponent;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/coordinador/estudiantes/e-1`;

  const ficha: FichaEstudiante = {
    idEstudiante: 'e-1', tipoIdentificacion: 'CC', numeroIdentificacion: 1017000001, primerNombre: 'Ana', segundoNombre: 'Maria', primerApellido: 'Pérez',
    segundoApellido: 'Gómez', nombreCompleto: 'Ana Maria Pérez Gómez', correo: 'ana@uco.edu.co', estaActivoUsuario: true, idPrograma: 'p-1', nombrePrograma: 'Sistemas',
    resumenPorAsignatura: [{
      idGrupo: 'g-1', codigoGrupo: 931001, idAsignatura: 'a-1', nombreAsignatura: 'Estructuras de Datos', codigoEstadoEstudiante: 'A', nombreEstadoEstudiante: 'activo',
      sesionesEjecutadas: 6, asistencias: 4, faltasSinJustaCausa: 2, excusas: 0, porcentajeInasistencia: 33.33, codigoPermanencia: 'PERDIDA',
    }],
  };
  const sesion = (n: number, asistio: boolean | null): BitacoraSesion => ({
    idSesion: `s-${n}`, numeroSesion: n, nombreSesion: `Sesión ${n}`, fechaHoraInicio: '2026-10-23T14:00:00Z', fechaHoraFin: '2026-10-23T16:00:00Z',
    idGrupo: 'g-1', codigoGrupo: 931001, idAsignatura: 'a-1', nombreAsignatura: 'Estructuras de Datos', asistio,
    codigoRazonCausa: asistio === false ? 'SJC' : null, nombreRazonCausa: asistio === false ? 'sin justa causa' : null,
  });
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  function abrir(): void {
    fixture = TestBed.createComponent(CoordinatorFichaModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('idEstudiante', 'e-1');
    fixture.componentRef.setInput('nombre', 'Ana Pérez');
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CoordinatorFichaModalComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('T-FE-04 carga la ficha y la primera página de la bitácora al abrirse', () => {
    abrir();
    http.expectOne(`${base}/ficha`).flush({ exitoso: true, datos: ficha });
    const req = http.expectOne((r) => r.url === `${base}/bitacora`);
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('tamano')).toBe('10');
    req.flush({ exitoso: true, datos: [sesion(7, null), sesion(6, true), sesion(5, false)], total: 25 });
    fixture.detectChanges();

    const t = texto();
    expect(t).toContain('ana@uco.edu.co');
    expect(t).toContain('Estructuras de Datos');
    expect(t).toContain('33.33%');
    expect(t).not.toContain('Teléfono');
    expect(component.totalBitacora()).toBe(25);
  });

  // WCAG 2.4.3 / 4.1.2 / 2.1.1: el dialogo se nombra con su titulo, recibe el foco, atrapa Tab y se cierra con Escape.
  describe('accesibilidad del dialogo', () => {
    function abrirCargado(): HTMLElement {
      abrir();
      http.expectOne(`${base}/ficha`).flush({ exitoso: true, datos: ficha });
      http.expectOne((r) => r.url === `${base}/bitacora`).flush({ exitoso: true, datos: [sesion(6, true)], total: 1 });
      fixture.detectChanges();
      return fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    }

    it('A11Y-01 aria-labelledby apunta al titulo "Ficha de ..."', () => {
      const dialogo = abrirCargado();
      const id = dialogo.getAttribute('aria-labelledby');
      expect(id).toBeTruthy();
      expect(document.getElementById(id as string)?.textContent).toContain('Ficha de Ana Pérez');
    });

    it('A11Y-02 al abrirse el foco entra en el dialogo', () => {
      const dialogo = abrirCargado();
      expect(dialogo.contains(document.activeElement)).toBeTrue();
    });

    it('A11Y-03 Escape emite cerrar', () => {
      abrirCargado();
      let cerrado = false;
      component.cerrar.subscribe(() => (cerrado = true));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(cerrado).toBeTrue();
    });
  });

  it('APP-04 la bitácora presenta el instante UTC en la zona efectiva (Londres)', () => {
    TestBed.inject(SessionTimeZoneService).setManualTimeZone('Europe/London');
    abrir();
    http.expectOne(`${base}/ficha`).flush({ exitoso: true, datos: ficha });
    http.expectOne((r) => r.url === `${base}/bitacora`).flush({ exitoso: true, datos: [sesion(6, true)], total: 1 });
    fixture.detectChanges();

    expect(texto()).toContain('23/10/2026 15:00');
    expect(texto()).toContain('Europe/London');
    localStorage.removeItem('asistenciasuco.session-timezone');
  });

  it('T-FE-04 una sesión sin registro se muestra como "Sin registro" (no como falta)', () => {
    abrir();
    http.expectOne(`${base}/ficha`).flush({ exitoso: true, datos: ficha });
    http.expectOne((r) => r.url === `${base}/bitacora`).flush({ exitoso: true, datos: [sesion(7, null)], total: 1 });
    fixture.detectChanges();

    expect(texto()).toContain('Sin registro');
    expect(component.etiquetaAsistencia(null)).toBe('Sin registro');
    expect(component.etiquetaAsistencia(true)).toBe('Asistió');
    expect(component.etiquetaAsistencia(false)).toBe('No asistió');
  });

  it('T-FE-04 cambiar de página de la bitácora pide esa página', () => {
    abrir();
    http.expectOne(`${base}/ficha`).flush({ exitoso: true, datos: ficha });
    http.expectOne((r) => r.url === `${base}/bitacora`).flush({ exitoso: true, datos: [], total: 25 });

    component.onPageChange(3);
    const req = http.expectOne((r) => r.url === `${base}/bitacora`);
    expect(req.request.params.get('pagina')).toBe('3');
    req.flush({ exitoso: true, datos: [], total: 25 });
  });

  it('T-FE-04 un 404 muestra el mensaje del servidor y no inventa datos', () => {
    abrir();
    http.expectOne(`${base}/ficha`).flush({ message: 'El estudiante especificado no existe en el sistema.' }, { status: 404, statusText: 'Not Found' });
    http.expectOne((r) => r.url === `${base}/bitacora`).flush({ message: 'El estudiante especificado no existe en el sistema.' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(component.error()).toBe('El estudiante especificado no existe en el sistema.');
    expect(component.ficha()).toBeNull();
    expect(texto()).toContain('El estudiante especificado no existe en el sistema.');
  });

  it('cerrar emite el evento de cierre', () => {
    abrir();
    http.expectOne(`${base}/ficha`).flush({ exitoso: true, datos: ficha });
    http.expectOne((r) => r.url === `${base}/bitacora`).flush({ exitoso: true, datos: [], total: 0 });
    let cerrado = false;
    component.cerrar.subscribe(() => (cerrado = true));
    component.cancelar();
    expect(cerrado).toBeTrue();
  });

  it("HU159: el coordinador corrige los datos del estudiante y la ficha se recarga", () => {
    abrir();
    http.expectOne(`${base}/ficha`).flush({ exitoso: true, datos: ficha });
    http.expectOne((r) => r.url === `${base}/bitacora`).flush({ exitoso: true, datos: [], total: 0 });
    fixture.detectChanges();

    (fixture.nativeElement.querySelector("[data-accion=\"corregir-identidad\"]") as HTMLButtonElement).click();
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/configuracion/identidad`).flush({ exitoso: true, datos: { permitirCorregirDocumento: true } });
    http.expectOne(`${environment.apiUrl}/tipos-identificacion`).flush([{ id: "t-cc", tipoIdentificacion: "CC", nombre: "Cedula" }]);
    fixture.detectChanges();
    expect(texto()).toContain("Corregir datos del estudiante");

    component.corregir({ primerNombre: "Ana", segundoNombre: "Maria", primerApellido: "Perez", segundoApellido: "Gomez", motivo: "Tildes" });
    const put = http.expectOne(`${base}/identidad`);
    expect(put.request.method).toBe("PUT");
    put.flush({ exitoso: true, datos: { idRegistro: "e-1", sincronizacionIdentidad: "OK", mensajeUsuario: null } });
    http.expectOne(`${base}/ficha`).flush({ exitoso: true, datos: ficha });
    expect(component.corrigiendo()).toBeFalse();
  });

  it("HU159: si el backend rechaza la correccion, el error se muestra en el modal", () => {
    abrir();
    http.expectOne(`${base}/ficha`).flush({ exitoso: true, datos: ficha });
    http.expectOne((r) => r.url === `${base}/bitacora`).flush({ exitoso: true, datos: [], total: 0 });
    component.corrigiendo.set(true);

    component.corregir({ primerNombre: "Ana", segundoNombre: "", primerApellido: "Perez", segundoApellido: "", motivo: "x" });
    http.expectOne(`${base}/identidad`).flush({ exitoso: false, mensaje: "Estudiante no encontrado" }, { status: 404, statusText: "Not Found" });

    expect(component.corrigiendo()).toBeTrue();
    expect(component.errorCorreccion()).toBeTruthy();
    component.cerrarCorreccion();
    expect(component.corrigiendo()).toBeFalse();
    fixture.destroy();
  });
});
