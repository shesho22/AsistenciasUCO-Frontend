import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoordinatorCancelarSesionModalComponent } from './coordinator-cancelar-sesion-modal.component';

describe('CoordinatorCancelarSesionModalComponent (DEC-064)', () => {
  let fixture: ComponentFixture<CoordinatorCancelarSesionModalComponent>;
  let component: CoordinatorCancelarSesionModalComponent;
  const el = () => fixture.nativeElement as HTMLElement;
  const select = () => el().querySelector('[data-testid="motivo-cancelacion"]') as HTMLSelectElement;
  const textarea = () => el().querySelector('textarea') as HTMLTextAreaElement;
  const confirmar = () => el().querySelector('[data-testid="confirmar-cancelacion-coordinador"]') as HTMLButtonElement;

  async function refrescar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function elegir(codigo: string): Promise<void> {
    select().value = codigo;
    select().dispatchEvent(new Event('change'));
    await refrescar();
  }

  async function escribir(valor: string): Promise<void> {
    textarea().value = valor;
    textarea().dispatchEvent(new Event('input'));
    await refrescar();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [CoordinatorCancelarSesionModalComponent] });
    fixture = TestBed.createComponent(CoordinatorCancelarSesionModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('nombreSesion', 'Sesión 4');
    fixture.componentRef.setInput('motivos', [
      { codigo: 'DUPLICADA', nombre: 'Sesión duplicada' },
      { codigo: 'ERROR', nombre: 'Creada por error' },
    ]);
    await refrescar();
  });

  it('se presenta como role=dialog con el título de la sesión y los motivos del catálogo', () => {
    expect(el().querySelector('[role="dialog"]')).toBeTruthy();
    expect(el().textContent).toContain('Cancelar sesión Sesión 4');
    expect(Array.from(select().options).map((o) => o.textContent?.trim())).toEqual([
      'Selecciona un motivo', 'Sesión duplicada', 'Creada por error',
    ]);
  });

  it('deshabilita Confirmar hasta elegir motivo y muestra el contador 0/250', async () => {
    expect(confirmar().disabled).toBeTrue();
    expect(el().querySelector('[data-testid="contador-observacion"]')?.textContent).toContain('0/250');
    await elegir('DUPLICADA');
    expect(confirmar().disabled).toBeFalse();
  });

  it('deshabilita con una observación de 251 caracteres y habilita con 250', async () => {
    await elegir('DUPLICADA');
    await escribir('x'.repeat(251));
    expect(confirmar().disabled).toBeTrue();
    await escribir('x'.repeat(250));
    expect(confirmar().disabled).toBeFalse();
    expect(el().querySelector('[data-testid="contador-observacion"]')?.textContent).toContain('250/250');
  });

  it('emite codigoMotivo con la observación recortada, u omite la observación vacía', async () => {
    const emitido: unknown[] = [];
    component.confirmado.subscribe((v) => emitido.push(v));
    await elegir('ERROR');
    confirmar().click();
    await escribir('  ya existe otra  ');
    confirmar().click();
    expect(emitido).toEqual([
      { codigoMotivo: 'ERROR' },
      { codigoMotivo: 'ERROR', observacion: 'ya existe otra' },
    ]);
  });

  it('no emite mientras envía y muestra el texto Cancelando', async () => {
    const emitido: unknown[] = [];
    component.confirmado.subscribe((v) => emitido.push(v));
    await elegir('ERROR');
    fixture.componentRef.setInput('enviando', true);
    await refrescar();
    expect(confirmar().textContent).toContain('Cancelando');
    component.confirmar();
    expect(emitido).toEqual([]);
  });

  it('muestra tal cual el error del backend y el error de carga del catálogo', async () => {
    fixture.componentRef.setInput('errorMensaje', 'Solo se pueden cancelar sesiones manuales.');
    fixture.componentRef.setInput('errorMotivos', 'No se pudo cargar el catálogo.');
    await refrescar();
    expect(el().querySelector('[data-testid="error-cancelacion"]')?.textContent?.trim()).toBe('Solo se pueden cancelar sesiones manuales.');
    expect(el().textContent).toContain('No se pudo cargar el catálogo.');
  });

  it('cierra con el botón Cerrar y limpia el formulario al cerrarse', async () => {
    let cierres = 0;
    component.closed.subscribe(() => cierres++);
    (el().querySelector('[data-accion="cerrar"]') as HTMLButtonElement).click();
    expect(cierres).toBe(1);

    await elegir('ERROR');
    fixture.componentRef.setInput('isOpen', false);
    await refrescar();
    fixture.componentRef.setInput('isOpen', true);
    await refrescar();
    expect(select().value).toBe('');
    expect(confirmar().disabled).toBeTrue();
  });
});
