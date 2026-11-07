import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { StudentAttendanceQrComponent } from './student-attendance-qr.component';
import { AsistenciaQrService } from '../../../core/services/asistencia-qr.service';
import { RegistroAsistenciaQr } from '../../../core/models/asistencia-qr.model';
import { apiHttpError } from '../../../core/testing/api-error.fixture';

const registro = (parcial: Partial<RegistroAsistenciaQr> = {}): RegistroAsistenciaQr => ({
  idToma: 't-1', idSesion: 's-1', nombreAsignatura: 'Cálculo I', nombreGrupo: 'Grupo 01', numeroSesion: 12, numeroToma: 2,
  yaRegistrado: false, fechaRegistroUtc: '2026-11-10T13:05:00Z', mensaje: '¡Listo! Tu asistencia quedó registrada.', ...parcial,
});

describe('StudentAttendanceQrComponent (CULM-001 B.2, HU176)', () => {
  let fixture: ComponentFixture<StudentAttendanceQrComponent>;
  let qr: jasmine.SpyObj<AsistenciaQrService>;
  let router: jasmine.SpyObj<Router>;

  const el = (id: string) => fixture.nativeElement.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const texto = () => (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');

  function crear(t: string | null) {
    qr = jasmine.createSpyObj('AsistenciaQrService', ['registrarPorToken', 'registrarPorPin']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    TestBed.configureTestingModule({
      imports: [StudentAttendanceQrComponent],
      providers: [
        { provide: AsistenciaQrService, useValue: qr },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: (k: string) => (k === 't' ? t : null) } } } },
      ],
    });
  }

  function iniciar() {
    fixture = TestBed.createComponent(StudentAttendanceQrComponent);
    fixture.detectChanges();
  }

  it('B2-F-20 lee t una sola vez, lo borra de la barra de direcciones y registra por token', () => {
    crear('TOKEN-43');
    qr.registrarPorToken.and.returnValue(of({ exitoso: true, datos: registro() }));
    iniciar();
    expect(router.navigate).toHaveBeenCalledOnceWith([], { queryParams: { t: null }, replaceUrl: true });
    expect(qr.registrarPorToken).toHaveBeenCalledOnceWith('TOKEN-43');
  });

  it('B2-F-20 muestra la tarjeta de resultado con asignatura, grupo, sesion, toma y el mensaje del backend', () => {
    crear('TOKEN-43');
    qr.registrarPorToken.and.returnValue(of({ exitoso: true, datos: registro() }));
    iniciar();
    const card = el('resultado-card')!.textContent!.replace(/\s+/g, ' ');
    expect(card).toContain('Cálculo I');
    expect(card).toContain('Grupo 01');
    expect(card).toContain('Sesión 12');
    expect(card).toContain('Toma 2');
    expect(card).toContain('¡Listo! Tu asistencia quedó registrada.');
    expect(el('ya-registrado')).toBeNull();
    expect(el('pin-input')).toBeNull();
  });

  it('B2-F-20 si yaRegistrado lo indica sin presentarlo como un registro nuevo', () => {
    crear('TOKEN-43');
    qr.registrarPorToken.and.returnValue(of({ exitoso: true, datos: registro({ yaRegistrado: true, mensaje: null }) }));
    iniciar();
    expect(el('ya-registrado')!.textContent).toContain('ya estaba registrada');
  });

  it('B2-F-20 si el token vencio (AQR_001) muestra el mensaje del backend y el formulario de PIN', () => {
    crear('TOKEN-43');
    qr.registrarPorToken.and.returnValue(throwError(() => apiHttpError(404, 'El código venció. Pide uno nuevo.', 'AQR_001')));
    iniciar();
    expect(el('qr-error')!.textContent!.trim()).toBe('El código venció. Pide uno nuevo.');
    expect(el('pin-input')).not.toBeNull();
  });

  it('B2-F-20 un error de red del campus (AQR_002) tambien muestra el mensaje y el formulario de PIN', () => {
    crear('TOKEN-43');
    qr.registrarPorToken.and.returnValue(throwError(() => apiHttpError(403, 'Conéctate a la red Wi-Fi del campus.', 'AQR_002')));
    iniciar();
    expect(el('qr-error')!.textContent).toContain('Wi-Fi del campus');
    expect(el('pin-input')).not.toBeNull();
  });

  it('B2-F-21 sin token abre el formulario de PIN con teclado numerico y 6 digitos', () => {
    crear(null);
    iniciar();
    const input = el('pin-input') as HTMLInputElement;
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.getAttribute('pattern')).toBe('[0-9]*');
    expect(input.getAttribute('autocomplete')).toBe('one-time-code');
    expect(input.getAttribute('maxlength')).toBe('6');
    expect(input.getAttribute('enterkeyhint')).toBe('send');
    expect((el('pin-enviar') as HTMLElement).className).toContain('min-h-[48px]');
    expect(qr.registrarPorToken).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('B2-F-21 valida 6 digitos antes de enviar', () => {
    crear(null);
    iniciar();
    const input = el('pin-input') as HTMLInputElement;
    for (const invalido of ['', '12345', 'abc123', '1234567']) {
      input.value = invalido;
      input.dispatchEvent(new Event('input'));
      (el('pin-enviar') as HTMLButtonElement).click();
      fixture.detectChanges();
    }
    expect(qr.registrarPorPin).not.toHaveBeenCalled();
    expect(el('pin-invalido')).not.toBeNull();
  });

  it('B2-F-21 con 6 digitos envia { pin } y muestra el resultado', () => {
    crear(null);
    qr.registrarPorPin.and.returnValue(of({ exitoso: true, datos: registro() }));
    iniciar();
    const input = el('pin-input') as HTMLInputElement;
    input.value = '482913';
    input.dispatchEvent(new Event('input'));
    (el('pin-enviar') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(qr.registrarPorPin).toHaveBeenCalledOnceWith('482913');
    expect(el('resultado-card')).not.toBeNull();
  });

  it('B2-F-21 muestra los errores del backend del PIN (limite, toma cerrada, red) sin traducirlos', () => {
    crear(null);
    qr.registrarPorPin.and.returnValue(throwError(() => apiHttpError(429, 'Demasiados intentos. Espera un minuto.', 'AQR_011')));
    iniciar();
    const input = el('pin-input') as HTMLInputElement;
    input.value = '482913';
    input.dispatchEvent(new Event('input'));
    (el('pin-enviar') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el('qr-error')!.textContent!.trim()).toBe('Demasiados intentos. Espera un minuto.');
    expect(texto()).not.toContain('undefined');
  });
});
