import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QrProyeccionComponent } from './qr-proyeccion.component';

@Component({
    imports: [QrProyeccionComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-qr-proyeccion
      qrPngBase64="AAAA"
      pin="482 913"
      titulo="Calculo - Grupo 1"
      [accionesMenu]="menu"
      (accionElegida)="elegidas.push($event)"
      (cerrar)="cerrados = cerrados + 1"
    >
      <p detalles data-testid="detalle-proyectado">Solo con la red Wi-Fi del campus</p>
      <p data-testid="contenido-proyectado">Presentes: 3</p>
    </app-qr-proyeccion>
  `
})
class HostComponent {
  cerrados = 0;
  elegidas: string[] = [];
  menu = [
    { id: 'regenerar', label: 'Regenerar', testid: 'it-regenerar' },
    { id: 'cerrar-toma', label: 'Cerrar toma', testid: 'it-cerrar-toma', danger: true },
  ];
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

  it('proyecta el contenido adicional y el cierre emite', () => {
    const host = TestBed.createComponent(HostComponent);
    host.detectChanges();
    const n = host.nativeElement as HTMLElement;
    expect(n.querySelector('[data-testid="contenido-proyectado"]')?.textContent).toContain('Presentes: 3');
    (n.querySelector('[data-testid="qr-cerrar"]') as HTMLButtonElement).click();
    expect(host.componentInstance.cerrados).toBe(1);
  });

  describe('UX densidad: proyeccion limpia', () => {
    it('la cabecera solo tiene Ampliar, Cerrar y el menu; las acciones extra salen del menu', () => {
      const host = TestBed.createComponent(HostComponent);
      host.detectChanges();
      const n = host.nativeElement as HTMLElement;
      const visibles = Array.from(n.querySelectorAll('header button')).filter((b) => !b.hasAttribute('role'));
      expect(visibles.length).toBe(3);
      expect(n.querySelector('[data-testid="qr-pantalla-completa"]')).not.toBeNull();
      expect(n.querySelector('[data-testid="qr-cerrar"]')).not.toBeNull();
      expect(n.querySelector('[data-testid="action-menu-trigger"]')).not.toBeNull();
    });

    it('elegir una accion del menu emite accionElegida con su id', () => {
      const host = TestBed.createComponent(HostComponent);
      host.detectChanges();
      const n = host.nativeElement as HTMLElement;
      (n.querySelector('[data-testid="action-menu-trigger"]') as HTMLButtonElement).click();
      host.detectChanges();
      (n.querySelector('[data-testid="it-cerrar-toma"]') as HTMLButtonElement).click();
      expect(host.componentInstance.elegidas).toEqual(['cerrar-toma']);
    });

    it('sin acciones de menu no aparece el boton "Mas"', () => {
      crear();
      expect(el('action-menu-trigger')).toBeNull();
    });

    it('el estado de la ventana y el contenido secundario viven en un panel plegable "Detalles"', () => {
      const host = TestBed.createComponent(HostComponent);
      host.detectChanges();
      const n = host.nativeElement as HTMLElement;
      const detalles = n.querySelector('[data-testid="qr-detalles"]') as HTMLDetailsElement;
      expect(detalles.tagName).toBe('DETAILS');
      expect(detalles.open).toBeFalse();
      expect(detalles.textContent).toContain('Wi-Fi');
    });

    it('el chip de estado ya no esta en la cabecera sino dentro de Detalles', () => {
      crear({ estadoVentana: 'ABIERTA' });
      const estado = el('qr-estado') as HTMLElement;
      expect(estado.closest('header')).toBeNull();
      expect(estado.closest('[data-testid="qr-detalles"]')).not.toBeNull();
    });

    it('cerrarConEscape=false evita que Escape cierre la proyeccion', () => {
      crear({ cerrarConEscape: false });
      let n = 0;
      fixture.componentInstance.cerrar.subscribe(() => n++);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(n).toBe(0);
    });
  });

  it('no usa setInterval', () => {
    const spy = spyOn(window, 'setInterval').and.callThrough();
    crear({ segundosRestantes: 30 });
    fixture.destroy();
    expect(spy).not.toHaveBeenCalled();
  });
});
