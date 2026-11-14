import { TestBed } from '@angular/core/testing';
import { ErrorHandler } from '@angular/core';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { GlobalErrorHandler, INTERVALO_MINIMO_AVISO_MS, RegistroErrorFrontend } from './global-error-handler';
import { ToastService } from '../../shared/components/toast/toast.component';
import { appConfig } from '../../app.config';
import { mensajeUi } from '../messages/mensajes-ui';

describe('GlobalErrorHandler (VAL OBS-14)', () => {
  let handler: GlobalErrorHandler;
  let toast: jasmine.SpyObj<ToastService>;
  let consola: jasmine.Spy;
  let ahora: number;

  function ultimoRegistro(): RegistroErrorFrontend {
    return consola.calls.mostRecent().args[1] as RegistroErrorFrontend;
  }

  beforeEach(() => {
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['error']);
    TestBed.configureTestingModule({
      providers: [GlobalErrorHandler, { provide: ToastService, useValue: toast }],
    });
    handler = TestBed.inject(GlobalErrorHandler);
    consola = spyOn(console, 'error');
    ahora = 1_000_000;
    spyOn(Date, 'now').and.callFake(() => ahora);
  });

  it('un error de cliente se registra con referencia local y avisa con el texto del catálogo', () => {
    handler.handleError(new TypeError('Cannot read properties of undefined (dato privado)'));

    const registro = ultimoRegistro();
    expect(registro.event).toBe('frontend.unhandled_error');
    expect(registro.origen).toBe('cliente');
    expect(registro.nombre).toBe('TypeError');
    expect(registro.status).toBeNull();
    expect(registro.correlationId).toMatch(/^FE-[0-9a-f-]{36}$/);
    expect(JSON.stringify(registro)).not.toContain('dato privado');
    expect(toast.error).toHaveBeenCalledOnceWith(mensajeUi('UI_ERROR_GLOBAL_001'), registro.correlationId);
  });

  it('un HttpErrorResponse no capturado solo se registra con el correlationId del backend (ya lo avisó el interceptor)', () => {
    handler.handleError(
      new HttpErrorResponse({ status: 502, headers: new HttpHeaders({ 'X-Correlation-Id': 'corr-backend-0001' }) })
    );

    const registro = ultimoRegistro();
    expect(registro.origen).toBe('http');
    expect(registro.status).toBe(502);
    expect(registro.correlationId).toBe('corr-backend-0001');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('desenvuelve rechazos de promesa y errores envueltos por Angular', () => {
    handler.handleError({ rejection: { ngOriginalError: new RangeError('x') } });
    expect(ultimoRegistro().nombre).toBe('RangeError');

    ahora += INTERVALO_MINIMO_AVISO_MS;
    handler.handleError({ rejection: new HttpErrorResponse({ status: 500 }) });
    expect(ultimoRegistro().origen).toBe('http');
    expect(ultimoRegistro().correlationId).toMatch(/^FE-/);
  });

  it('nombra valores que no son Error sin romper', () => {
    handler.handleError('texto suelto');
    expect(ultimoRegistro().nombre).toBe('string');
    ahora += INTERVALO_MINIMO_AVISO_MS;
    handler.handleError({ detalle: 1 });
    expect(ultimoRegistro().nombre).toBe('Object');
    ahora += INTERVALO_MINIMO_AVISO_MS;
    handler.handleError(null);
    expect(ultimoRegistro().nombre).toBe('object');
  });

  it('no repite el aviso en pantalla dentro del intervalo mínimo, pero siempre registra', () => {
    handler.handleError(new Error('a'));
    ahora += INTERVALO_MINIMO_AVISO_MS - 1;
    handler.handleError(new Error('b'));
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(consola).toHaveBeenCalledTimes(2);

    ahora += 1;
    handler.handleError(new Error('c'));
    expect(toast.error).toHaveBeenCalledTimes(2);
  });

  it('appConfig registra el manejador global como ErrorHandler', () => {
    const proveedor = appConfig.providers.find(
      (p) => typeof p === 'object' && p !== null && 'provide' in p && (p as { provide: unknown }).provide === ErrorHandler
    ) as { useClass: unknown } | undefined;
    expect(proveedor?.useClass).toBe(GlobalErrorHandler);
  });
});
