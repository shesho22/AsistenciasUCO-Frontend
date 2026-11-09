import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QrProyeccionComponent } from './qr-proyeccion.component';

@Component({
  standalone: true,
  imports: [QrProyeccionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-qr-proyeccion qrPngBase64="AAAA" pin="482 913" titulo="Calculo - Grupo 1" (cerrar)="cerrados = cerrados + 1">
      <button acciones data-testid="accion-proyectada">Accion</button>
      <p data-testid="contenido-proyectado">Presentes: 3</p>
    </app-qr-proyeccion>
  `,
})
class HostComponent {
  cerrados = 0;
}

describe('QrProyeccionComponent (CULM-001, estetica unificada de proyeccion)', () => {
  let fixture: ComponentFixture<QrProyeccionComponent>;
  const el = (id: string): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);

  function crear(inputs: Record<string, unknown> = {}): void {
    fixture = TestBed.createComponent(QrProyeccionComponent);
    fixture.componentRef.setInput('qrPngBase64', 'AAAA');
    fixture.componentRef.setInput('pin', '482913');
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [QrProyeccionComponent, HostComponent] }));

  it('declara OnPush', () => {
    const meta = (QrProyeccionComponent as unknown as { ɵcmp: { onPush: boolean } }).ɵcmp;
    expect(meta.onPush).toBeTrue();
  });

  it('muestra el QR como data:image/png, el PIN, el titulo y el subtitulo', () => {
    crear({ titulo: 'Calculo', subtitulo: 'Grupo 1', etiqueta: 'Matricula por QR' });
    expect((el('qr-img') as HTMLImageElement).getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(el('qr-pin')?.textContent?.trim()).toBe('482913');
    expect(el('qr-titulo')?.textContent).toContain('Calculo');
    expect(el('qr-subtitulo')?.textContent).toContain('Grupo 1');
    expect(el('qr-etiqueta')?.textContent).toContain('Matricula por QR');
  });

  it('por defecto muestra el QR a tamano normal (tarjeta de matricula) y ofrece Ampliar', () => {
    crear();
    const tarjeta = el('qr-tarjeta') as HTMLElement;
    expect(tarjeta.style.width).toBe('');
    expect(tarjeta.className).toContain('w-40');
    expect(tarjeta.className).toContain('bg-white');
    expect(el('qr-contenedor')?.className).toContain('max-w-lg');
    expect((el('qr-img') as HTMLElement).className).toContain('w-full');
    expect((el('qr-pin') as HTMLElement).style.fontSize).toBe('');
    expect((el('qr-pin') as HTMLElement).className).toContain('font-mono');
    expect(el('qr-pantalla-completa')?.textContent).toContain('Ampliar');
  });

  it('Escape con tamano normal cierra; con el QR ampliado primero lo reduce', () => {
    crear();
    let n = 0;
    fixture.componentInstance.cerrar.subscribe(() => n++);
    (fixture.nativeElement as { requestFullscreen?: unknown }).requestFullscreen = undefined;
    (el('qr-pantalla-completa') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect((el('qr-tarjeta') as HTMLElement).style.width).toBe('min(88vh, 92vw)');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(n).toBe(0);
    expect((el('qr-tarjeta') as HTMLElement).style.width).toBe('');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(n).toBe(1);
  });

  it('Escape no cierra si el boton cerrar esta oculto', () => {
    crear({ mostrarCerrar: false });
    let n = 0;
    fixture.componentInstance.cerrar.subscribe(() => n++);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(n).toBe(0);
  });

  it('en pantalla completa amplia el QR a min(88vh, 92vw)', async () => {
    crear();
    spyOn(fixture.nativeElement as HTMLElement, 'requestFullscreen').and.returnValue(Promise.resolve());
    (el('qr-pantalla-completa') as HTMLButtonElement).click();
    await fixture.whenStable();
    spyOnProperty(document, 'fullscreenElement').and.returnValue(fixture.nativeElement as Element);
    document.dispatchEvent(new Event('fullscreenchange'));
    fixture.detectChanges();
    expect((el('qr-tarjeta') as HTMLElement).style.width).toBe('min(88vh, 92vw)');
    expect(el('qr-pantalla-completa')?.textContent).toContain('Reducir');
  });

  it('sin Fullscreen API cae a modal maximizado y alterna', () => {
    crear();
    (fixture.nativeElement as { requestFullscreen?: unknown }).requestFullscreen = undefined;
    (el('qr-pantalla-completa') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect((el('qr-tarjeta') as HTMLElement).style.width).toBe('min(88vh, 92vw)');
    (el('qr-pantalla-completa') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect((el('qr-tarjeta') as HTMLElement).style.width).toBe('');
  });

  it('si requestFullscreen es rechazado cae a modal maximizado', async () => {
    crear();
    spyOn(fixture.nativeElement as HTMLElement, 'requestFullscreen').and.returnValue(Promise.reject(new Error('no')));
    (el('qr-pantalla-completa') as HTMLButtonElement).click();
    await fixture.whenStable();
    await Promise.resolve();
    fixture.detectChanges();
    expect((el('qr-tarjeta') as HTMLElement).style.width).toBe('min(88vh, 92vw)');
  });

  it('muestra el contador de rotacion (barra CSS y hora) solo si se conoce el intervalo', () => {
    crear();
    expect(el('qr-barra-rotacion')).toBeNull();
    expect(el('qr-rotacion-automatica')).not.toBeNull();

    fixture.componentRef.setInput('segundosRestantes', 50);
    fixture.componentRef.setInput('proximaRotacion', '13:01:00');
    fixture.detectChanges();
    expect((el('qr-barra-rotacion') as HTMLElement).style.animationDuration).toBe('50s');
    expect(el('qr-proxima-rotacion')?.textContent).toContain('13:01:00');
    expect(el('qr-rotacion-automatica')).toBeNull();
  });

  it('alterna el nombre de la animacion con cada ciclo para reiniciar la barra', () => {
    crear({ segundosRestantes: 10 });
    const a = (el('qr-barra-rotacion') as HTMLElement).style.animationName;
    fixture.componentRef.setInput('ciclo', 1);
    fixture.detectChanges();
    expect((el('qr-barra-rotacion') as HTMLElement).style.animationName).not.toBe(a);
  });

  it('muestra estado de la ventana y programa seleccionado cuando se informan', () => {
    crear({ estadoVentana: 'ABIERTA', programa: 'Ingenieria de Sistemas' });
    expect(el('qr-estado')?.textContent).toContain('ABIERTA');
    expect(el('qr-programa')?.textContent).toContain('Ingenieria de Sistemas');
    fixture.componentRef.setInput('estadoVentana', null);
    fixture.componentRef.setInput('programa', null);
    fixture.detectChanges();
    expect(el('qr-estado')).toBeNull();
    expect(el('qr-programa')).toBeNull();
  });

  it('el boton cerrar emite y puede ocultarse; los ids de prueba son configurables', () => {
    crear({ testidCerrar: 'mi-cerrar', testidQr: 'mi-qr', testidPin: 'mi-pin' });
    let n = 0;
    fixture.componentInstance.cerrar.subscribe(() => n++);
    (el('mi-cerrar') as HTMLButtonElement).click();
    expect(n).toBe(1);
    expect(el('mi-qr')).not.toBeNull();
    expect(el('mi-pin')).not.toBeNull();
    fixture.componentRef.setInput('mostrarCerrar', false);
    fixture.detectChanges();
    expect(el('mi-cerrar')).toBeNull();
  });

  it('los controles miden al menos 44 px y el QR tiene alt descriptivo', () => {
    crear();
    expect((el('qr-pantalla-completa') as HTMLElement).className).toContain('min-h-[44px]');
    expect((el('qr-cerrar') as HTMLElement).className).toContain('min-h-[44px]');
    expect((el('qr-img') as HTMLImageElement).alt).not.toBe('');
  });

  it('proyecta acciones y contenido adicional', () => {
    const host = TestBed.createComponent(HostComponent);
    host.detectChanges();
    const n = host.nativeElement as HTMLElement;
    expect(n.querySelector('[data-testid="accion-proyectada"]')).not.toBeNull();
    expect(n.querySelector('[data-testid="contenido-proyectado"]')?.textContent).toContain('Presentes: 3');
    (n.querySelector('[data-testid="qr-cerrar"]') as HTMLButtonElement).click();
    expect(host.componentInstance.cerrados).toBe(1);
  });

  it('no usa setInterval', () => {
    const spy = spyOn(window, 'setInterval').and.callThrough();
    crear({ segundosRestantes: 30 });
    fixture.destroy();
    expect(spy).not.toHaveBeenCalled();
  });
});
