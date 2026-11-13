import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoordinatorAprobarSolicitudModalComponent } from './coordinator-aprobar-solicitud-modal.component';

describe('CoordinatorAprobarSolicitudModalComponent (DEC-065 (2))', () => {
  let fixture: ComponentFixture<CoordinatorAprobarSolicitudModalComponent>;
  const el = () => fixture.nativeElement as HTMLElement;
  const textarea = () => el().querySelector('textarea') as HTMLTextAreaElement;
  const confirmar = () => el().querySelector('[data-testid="confirmar-aprobacion"]') as HTMLButtonElement;

  async function refrescar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function escribir(valor: string): Promise<void> {
    textarea().value = valor;
    textarea().dispatchEvent(new Event('input'));
    await refrescar();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [CoordinatorAprobarSolicitudModalComponent] });
    fixture = TestBed.createComponent(CoordinatorAprobarSolicitudModalComponent);
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('nombreSesion', 'Taller de refuerzo');
    await refrescar();
  });

  it('se presenta como diálogo con el título de la sesión y el contador 0/250', () => {
    expect(el().querySelector('[role="dialog"]')).toBeTruthy();
    expect(el().textContent).toContain('Aprobar sesión Taller de refuerzo');
    expect(el().querySelector('[data-testid="contador-observacion-aprobar"]')?.textContent).toContain('0/250');
    expect(confirmar().disabled).toBeFalse();
  });

  it('confirma sin observación emitiendo undefined', () => {
    let emitido: string | undefined | 'nada' = 'nada';
    fixture.componentInstance.confirmado.subscribe((v) => (emitido = v));
    confirmar().click();
    expect(emitido).toBeUndefined();
  });

  it('confirma con la observación recortada', async () => {
    let emitido: string | undefined;
    fixture.componentInstance.confirmado.subscribe((v) => (emitido = v));
    await escribir('  Hay aula disponible  ');
    confirmar().click();
    expect(emitido).toBe('Hay aula disponible');
  });

  it('deshabilita con 251 caracteres y no emite', async () => {
    let llamadas = 0;
    fixture.componentInstance.confirmado.subscribe(() => llamadas++);
    await escribir('x'.repeat(251));
    expect(confirmar().disabled).toBeTrue();
    fixture.componentInstance.confirmar();
    expect(llamadas).toBe(0);
    await escribir('x'.repeat(250));
    expect(confirmar().disabled).toBeFalse();
  });

  it('muestra el error del backend tal cual y mientras envía deshabilita el botón', async () => {
    fixture.componentRef.setInput('errorMensaje', 'La solicitud ya fue resuelta.');
    fixture.componentRef.setInput('enviando', true);
    await refrescar();

    expect(el().querySelector('[data-testid="error-aprobacion"]')?.textContent?.trim()).toBe('La solicitud ya fue resuelta.');
    expect(confirmar().disabled).toBeTrue();
    expect(confirmar().textContent).toContain('Aprobando…');
  });

  it('Cerrar emite closed y al cerrar el diálogo se limpia la observación', async () => {
    let cerrado = 0;
    fixture.componentInstance.closed.subscribe(() => cerrado++);
    await escribir('algo');
    (el().querySelector('[data-accion="cerrar"]') as HTMLButtonElement).click();
    expect(cerrado).toBe(1);

    fixture.componentRef.setInput('isOpen', false);
    await refrescar();
    fixture.componentRef.setInput('isOpen', true);
    await refrescar();
    expect(textarea().value).toBe('');
  });
});
