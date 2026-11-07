import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ToastComponent, ToastService } from './toast.component';

describe('ToastService', () => {
  it('publica y descarta todos los tipos de notificación', () => {
    const service = TestBed.inject(ToastService);

    service.success('guardado');
    expect(service.currentToast()).toEqual({ visible: true, message: 'guardado', type: 'success' });
    service.error('fallo');
    expect(service.currentToast().type).toBe('error');
    service.info('información');
    expect(service.currentToast().type).toBe('info');
    service.warning('advertencia');
    expect(service.currentToast().type).toBe('warning');
    service.dismiss();
    expect(service.currentToast().visible).toBeFalse();
  });
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
