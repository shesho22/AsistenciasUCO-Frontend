import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ToastComponent, ToastService } from './toast.component';

describe('ToastService', () => {
  it('publica y descarta todos los tipos de notificación', () => {
    const service = TestBed.inject(ToastService);

    service.success('guardado');
    expect(service.currentToast()).toEqual({ visible: true, message: 'guardado', type: 'success', secuencia: jasmine.any(Number) as unknown as number });
    service.error('fallo');
    expect(service.currentToast().type).toBe('error');
    service.info('información');
    expect(service.currentToast().type).toBe('info');
    service.warning('advertencia');
    expect(service.currentToast().type).toBe('warning');
    service.dismiss();
    expect(service.currentToast().visible).toBeFalse();
  });

  it('cada aviso publicado incrementa la secuencia, aunque otro siga visible', () => {
    const service = TestBed.inject(ToastService);
    const inicial = service.currentToast().secuencia;
    service.error('primero');
    service.error('segundo');
    expect(service.currentToast().secuencia).toBe(inicial + 2);
    service.dismiss();
    expect(service.currentToast().secuencia).toBe(inicial + 2);
  });
});

describe('ToastComponent con avisos consecutivos', () => {
  function montar(duracion: number) {
    const fixture = TestBed.createComponent(ToastComponent);
    const dismissed = jasmine.createSpy('dismissed');
    fixture.componentInstance.dismissed.subscribe(dismissed);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('duration', duracion);
    fixture.componentRef.setInput('secuencia', 1);
    fixture.detectChanges();
    return { fixture, dismissed };
  }

  it('un aviso nuevo con otro aviso visible reinicia el temporizador y dura su tiempo completo', fakeAsync(() => {
    const { fixture, dismissed } = montar(1000);

    tick(900);
    fixture.componentRef.setInput('secuencia', 2);
    fixture.detectChanges();

    // El reloj del primero (1000 ms) ya habría vencido: el segundo debe seguir visible.
    tick(500);
    expect(fixture.componentInstance.isExiting()).toBeFalse();
    expect(dismissed).not.toHaveBeenCalled();

    // Vence el reloj propio del segundo (1000 ms desde su llegada) y luego su salida de 250 ms.
    tick(500);
    expect(fixture.componentInstance.isExiting()).toBeTrue();
    tick(250);
    expect(dismissed).toHaveBeenCalledTimes(1);
    fixture.destroy();
  }));

  it('el cierre diferido de un aviso anterior no oculta uno que llegó durante su salida', fakeAsync(() => {
    const { fixture, dismissed } = montar(60_000);

    fixture.componentInstance.triggerDismiss();
    tick(100);
    expect(fixture.componentInstance.isExiting()).toBeTrue();

    fixture.componentRef.setInput('secuencia', 2);
    fixture.detectChanges();
    expect(fixture.componentInstance.isExiting()).toBeFalse();

    tick(500);
    expect(dismissed).not.toHaveBeenCalled();
    expect(fixture.componentInstance.isExiting()).toBeFalse();
    fixture.destroy();
  }));

  it('al destruirse cancela los temporizadores pendientes', fakeAsync(() => {
    const { fixture, dismissed } = montar(500);
    fixture.componentInstance.triggerDismiss();
    fixture.destroy();
    tick(1000);
    expect(dismissed).not.toHaveBeenCalled();
  }));
});

describe('ToastComponent', () => {
  it('permite descartar una notificación visible sin escritura ilegal de signals', fakeAsync(() => {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('duration', 100);
    let dismissed = 0;
    fixture.componentInstance.dismissed.subscribe(() => dismissed++);

    fixture.detectChanges();
    expect(fixture.componentInstance.containerClasses()).toContain('animate-toast-enter');
    tick(100);
    expect(fixture.componentInstance.isExiting()).toBeTrue();
    expect(fixture.componentInstance.containerClasses()).toContain('animate-toast-exit');
    tick(250);
    expect(dismissed).toBe(1);
    expect(fixture.componentInstance.isExiting()).toBeFalse();
  }));

  it('se dibuja por encima de los modales (z-50) para que un error al enviar un modal no quede oculto', () => {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.containerClasses()).toContain('z-[60]');
    expect(fixture.componentInstance.containerClasses()).not.toContain('z-50');
  });

  it('reinicia el temporizador al cerrar manualmente', fakeAsync(() => {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('duration', 500);
    let dismissed = 0;
    fixture.componentInstance.dismissed.subscribe(() => dismissed++);
    fixture.detectChanges();

    fixture.componentInstance.triggerDismiss();
    tick(250);
    expect(dismissed).toBe(1);
    tick(500);
    expect(dismissed).toBe(1);
  }));
});

describe('ToastComponent accesibilidad (F-TRX-014)', () => {
  function render(type: 'success' | 'error') {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('type', type);
    fixture.componentRef.setInput('message', 'x');
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).firstElementChild as HTMLElement;
  }

  it('los errores se anuncian con role=alert y aria-live assertive', () => {
    const el = render('error');
    expect(el.getAttribute('role')).toBe('alert');
    expect(el.getAttribute('aria-live')).toBe('assertive');
  });

  it('los avisos no criticos usan role=status', () => {
    const el = render('success');
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-live')).toBe('polite');
  });
});

describe('VAL OBS-14: referencia del error en el toast', () => {
  it('ToastService.error guarda la referencia solo cuando se informa', () => {
    const service = TestBed.inject(ToastService);
    service.error('fallo', 'corr-0001-abcd');
    expect(service.currentToast()).toEqual({
      visible: true,
      message: 'fallo',
      type: 'error',
      reference: 'corr-0001-abcd',
      secuencia: jasmine.any(Number) as unknown as number,
    });
    service.error('fallo');
    expect(service.currentToast().reference).toBeUndefined();
  });

  it('muestra el código de referencia en un toast de error y no en los demás tipos', () => {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('type', 'error');
    fixture.componentRef.setInput('message', 'fallo');
    fixture.componentRef.setInput('reference', 'corr-0001-abcd');
    fixture.componentRef.setInput('duration', 60_000);
    fixture.detectChanges();
    const ref = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="toast-referencia"]');
    expect(ref?.textContent?.trim()).toBe('Código de referencia: corr-0001-abcd');

    fixture.componentRef.setInput('type', 'success');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="toast-referencia"]')).toBeNull();
    fixture.destroy();
  });

  it('sin referencia no pinta la línea', () => {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('type', 'error');
    fixture.componentRef.setInput('duration', 60_000);
    fixture.detectChanges();
    expect(fixture.componentInstance.referenciaTexto()).toBeNull();
    fixture.destroy();
  });
});
