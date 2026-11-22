import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { RecesoAcademico, RecesoPendiente } from '../../../../core/models/receso-academico.model';
import { PeriodoRecesosEditorComponent, estadoReceso, fechaCorta } from './periodo-recesos-editor.component';

describe('PeriodoRecesosEditorComponent (DEC-081)', () => {
  let fixture: ComponentFixture<PeriodoRecesosEditorComponent>;
  let http: HttpTestingController;
  let toast: jasmine.SpyObj<ToastService>;
  const url = `${environment.apiUrl}/admin/periodos-academicos/per-1/recesos`;

  const aplicado: RecesoAcademico = { id: 'r1', fecha: '2026-12-03', motivo: 'Semana institucional', sesionesCanceladas: 6, estaAplicado: true, puedeRetirarse: false };
  const sinAplicar: RecesoAcademico = { id: 'r2', fecha: '2026-12-10', motivo: 'Jueves de cierre', sesionesCanceladas: 0, estaAplicado: false, puedeRetirarse: true };

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(testid: string): T | null => el().querySelector<T>(`[data-testid="${testid}"]`);
  const escribir = (testid: string, valor: string): void => {
    const input = q<HTMLInputElement>(testid) as HTMLInputElement;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const retirarDirecto = (receso: RecesoAcademico): void => (fixture.componentInstance as unknown as { retirar(r: RecesoAcademico): void }).retirar(receso);

  function montar(entradas: { idPeriodo?: string | null; inicio?: string; fin?: string; pendientes?: RecesoPendiente[] } = {}): void {
    fixture = TestBed.createComponent(PeriodoRecesosEditorComponent);
    fixture.componentRef.setInput('idPeriodo', entradas.idPeriodo ?? null);
    fixture.componentRef.setInput('fechaInicio', entradas.inicio ?? '2026-08-01');
    fixture.componentRef.setInput('fechaFin', entradas.fin ?? '2026-12-15');
    fixture.componentRef.setInput('pendientes', entradas.pendientes ?? []);
    fixture.detectChanges();
  }

  beforeEach(() => {
    toast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    TestBed.configureTestingModule({
      imports: [PeriodoRecesosEditorComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: ToastService, useValue: toast }],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('helpers: fecha corta y estado del día', () => {
    expect(fechaCorta('2026-12-03')).toBe('03/12/2026');
    expect(fechaCorta('')).toBe('');
    expect(estadoReceso({ estaAplicado: false, sesionesCanceladas: 0 })).toBe('Sin aplicar');
    expect(estadoReceso({ estaAplicado: true, sesionesCanceladas: 6 })).toBe('Aplicado: 6 clases canceladas');
    expect(estadoReceso({ estaAplicado: true, sesionesCanceladas: 1 })).toBe('Aplicado: 1 clase cancelada');
  });

  describe('alta (sin período): días pendientes', () => {
    it('muestra la nota y la lista vacía, y no llama al backend', () => {
      montar();
      const nota = q('nota-recesos')?.textContent?.replace(/\s+/g, ' ') ?? '';
      expect(nota).toContain('Al agregar un día se cancelan sus clases en todos los grupos del período y se avisa por correo a estudiantes y docentes.');
      expect(nota).toContain('Un día que ya canceló clases no se puede retirar.');
      expect(q('sin-pendientes')).not.toBeNull();
      expect((q('agregar-receso') as HTMLButtonElement).disabled).toBeTrue();
    });

    it('agrega días ordenados por fecha, limpia el formulario y los puede quitar', async () => {
      montar();
      escribir('receso-fecha', '2026-09-10');
      escribir('receso-motivo', '  Semana Santa ');
      (q('agregar-receso') as HTMLButtonElement).click();
      fixture.detectChanges();
      escribir('receso-fecha', '2026-09-01');
      escribir('receso-motivo', 'Día institucional');
      (q('agregar-receso') as HTMLButtonElement).click();
      fixture.detectChanges();

      const filas = el().querySelectorAll('[data-testid="pendiente-fila"]');
      expect(filas.length).toBe(2);
      expect(filas[0].textContent).toContain('01/09/2026');
      expect(filas[1].textContent).toContain('10/09/2026');
      expect(filas[1].textContent).toContain('Semana Santa');
      await fixture.whenStable();
      expect((q('receso-fecha') as HTMLInputElement).value).toBe('');

      (el().querySelector('[data-testid="quitar-pendiente"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(el().querySelectorAll('[data-testid="pendiente-fila"]').length).toBe(1);
      http.expectNone(url);
    });

    it('valida solo la forma: fecha fuera del rango, motivo vacío o largo y fecha repetida', () => {
      montar();
      escribir('receso-fecha', '2027-01-01');
      escribir('receso-motivo', 'Algo');
      expect(el().textContent).toContain('La fecha debe estar dentro del período.');
      expect((q('agregar-receso') as HTMLButtonElement).disabled).toBeTrue();

      escribir('receso-fecha', '2026-09-01');
      escribir('receso-motivo', '   ');
      expect((q('agregar-receso') as HTMLButtonElement).disabled).toBeTrue();

      escribir('receso-motivo', 'x'.repeat(201));
      expect((q('agregar-receso') as HTMLButtonElement).disabled).toBeTrue();

      escribir('receso-motivo', 'Bien');
      expect((q('agregar-receso') as HTMLButtonElement).disabled).toBeFalse();
      (q('agregar-receso') as HTMLButtonElement).click();
      fixture.detectChanges();

      escribir('receso-fecha', '2026-09-01');
      escribir('receso-motivo', 'Otra vez');
      expect(el().textContent).toContain('Ese día ya está en la lista.');
      expect((q('agregar-receso') as HTMLButtonElement).disabled).toBeTrue();
    });

    it('sin fecha de inicio del período pide elegirla antes', () => {
      montar({ inicio: '', fin: '' });
      escribir('receso-fecha', '2026-09-01');
      escribir('receso-motivo', 'Algo');
      expect(el().textContent).toContain('Elige primero la fecha de inicio del período.');
    });

    it('marca un día pendiente que quedó fuera si cambió el rango del período', () => {
      montar({ pendientes: [{ fecha: '2026-09-01', motivo: 'Algo' }] });
      expect(q('pendiente-fuera')).toBeNull();
      fixture.componentRef.setInput('fechaInicio', '2026-10-01');
      fixture.detectChanges();
      expect(q('pendiente-fuera')?.textContent).toContain('fuera de las fechas del período');
    });

    it('Enter en el motivo agrega el día sin enviar el formulario que lo contiene', () => {
      montar();
      escribir('receso-fecha', '2026-09-01');
      escribir('receso-motivo', 'Algo');
      const evento = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
      q('receso-motivo')?.dispatchEvent(evento);
      fixture.detectChanges();
      expect(evento.defaultPrevented).toBeTrue();
      expect(el().querySelectorAll('[data-testid="pendiente-fila"]').length).toBe(1);

      const vacio = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
      q('receso-motivo')?.dispatchEvent(vacio);
      expect(vacio.defaultPrevented).toBeTrue();
      expect(el().querySelectorAll('[data-testid="pendiente-fila"]').length).toBe(1);
    });
  });

  describe('edición (período existente): tabla y registro inmediato', () => {
    it('lista los días con su estado y ofrece Retirar solo si puedeRetirarse', () => {
      montar({ idPeriodo: 'per-1' });
      http.expectOne(url).flush({ exitoso: true, datos: [aplicado, sinAplicar] });
      fixture.detectChanges();

      const filas = el().querySelectorAll('[data-testid="receso-fila"]');
      expect(filas.length).toBe(2);
      expect(filas[0].querySelector('[data-testid="receso-estado"]')?.textContent).toContain('Aplicado: 6 clases canceladas');
      expect(filas[0].querySelector('[data-testid="retirar-receso"]')).toBeNull();
      expect(filas[1].querySelector('[data-testid="receso-estado"]')?.textContent).toContain('Sin aplicar');
      expect(filas[1].querySelector('[data-testid="retirar-receso"]')).not.toBeNull();
      expect(el().querySelector('.tabla-scroll')).not.toBeNull();
    });

    it('sin días muestra el mensaje vacío', () => {
      montar({ idPeriodo: 'per-1' });
      http.expectOne(url).flush({ exitoso: true, datos: [] });
      fixture.detectChanges();
      expect(q('sin-recesos')).not.toBeNull();
    });

    it('error al cargar: muestra el mensaje del backend', () => {
      montar({ idPeriodo: 'per-1' });
      http.expectOne(url).flush({ message: 'No tienes permiso.' }, { status: 403, statusText: 'Forbidden' });
      fixture.detectChanges();
      expect(q('error-carga-recesos')?.textContent).toContain('No tienes permiso.');
    });

    it('agregar publica el día, muestra el mensaje del backend y recarga la lista', async () => {
      montar({ idPeriodo: 'per-1' });
      http.expectOne(url).flush({ exitoso: true, datos: [] });
      fixture.detectChanges();
      escribir('receso-fecha', '2026-12-03');
      escribir('receso-motivo', 'Semana institucional');
      (q('agregar-receso') as HTMLButtonElement).click();

      const post = http.expectOne((r) => r.method === 'POST' && r.url === url);
      expect(post.request.body).toEqual({ fecha: '2026-12-03', motivo: 'Semana institucional' });
      post.flush(
        {
          exitoso: true,
          datos: { id: 'r1', fecha: '2026-12-03', motivo: 'Semana institucional', sesionesCanceladas: 3, sesionesConAsistencia: 0 },
          mensajeUsuario: 'Se registró el receso académico del 03/12/2026; se cancelaron 3 clases.',
        },
        { status: 201, statusText: 'Created' },
      );
      expect(toast.success).toHaveBeenCalledWith('Se registró el receso académico del 03/12/2026; se cancelaron 3 clases.');
      http.expectOne((r) => r.method === 'GET' && r.url === url).flush({ exitoso: true, datos: [aplicado] });
      fixture.detectChanges();
      expect(el().querySelectorAll('[data-testid="receso-fila"]').length).toBe(1);
      await fixture.whenStable();
      expect((q('receso-fecha') as HTMLInputElement).value).toBe('');
    });

    it('si el backend rechaza el día muestra su mensaje y conserva el formulario', async () => {
      montar({ idPeriodo: 'per-1' });
      http.expectOne(url).flush({ exitoso: true, datos: [] });
      fixture.detectChanges();
      await fixture.whenStable();
      escribir('receso-fecha', '2026-12-08');
      escribir('receso-motivo', 'Navidad');
      (q('agregar-receso') as HTMLButtonElement).click();
      http.expectOne((r) => r.method === 'POST').flush({ code: 'REC_005', message: 'Ese día ya es festivo.' }, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();
      expect(q('error-agregar-receso')?.textContent).toContain('Ese día ya es festivo.');
      await fixture.whenStable();
      expect((q('receso-motivo') as HTMLInputElement).value).toBe('Navidad');
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('exitoso=false sin excepción HTTP también deja el mensaje en el formulario', () => {
      montar({ idPeriodo: 'per-1' });
      http.expectOne(url).flush({ exitoso: true, datos: [] });
      escribir('receso-fecha', '2026-12-03');
      escribir('receso-motivo', 'Algo');
      (q('agregar-receso') as HTMLButtonElement).click();
      http.expectOne((r) => r.method === 'POST').flush({ exitoso: false, datos: null, mensajeUsuario: 'No se pudo.' });
      fixture.detectChanges();
      expect(q('error-agregar-receso')?.textContent).toContain('No se pudo.');
    });

    it('retirar borra el día sin aplicar y recarga; si el backend responde 409 muestra su mensaje', () => {
      montar({ idPeriodo: 'per-1' });
      http.expectOne(url).flush({ exitoso: true, datos: [sinAplicar] });
      fixture.detectChanges();
      (q('retirar-receso') as HTMLButtonElement).click();
      const del = http.expectOne((r) => r.method === 'DELETE');
      expect(del.request.url).toBe(`${url}/r2`);
      del.flush({ exitoso: true, datos: null, mensajeUsuario: 'Se retiró el receso académico del 10/12/2026.' });
      expect(toast.success).toHaveBeenCalledWith('Se retiró el receso académico del 10/12/2026.');
      http.expectOne((r) => r.method === 'GET').flush({ exitoso: true, datos: [] });

      retirarDirecto(sinAplicar);
      http.expectOne((r) => r.method === 'DELETE').flush({ code: 'REC_010', message: 'Ya canceló clases.' }, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();
      expect(q('error-agregar-receso')?.textContent).toContain('Ya canceló clases.');
      http.expectOne((r) => r.method === 'GET').flush({ exitoso: true, datos: [aplicado] });
    });

    it('retirar ignora un día que no se puede retirar', () => {
      montar({ idPeriodo: 'per-1' });
      http.expectOne(url).flush({ exitoso: true, datos: [aplicado] });
      retirarDirecto(aplicado);
      http.expectNone((r) => r.method === 'DELETE');
      expect(toast.success).not.toHaveBeenCalled();
    });
  });
});
