import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeacherSesionCancelarModalComponent } from './teacher-sesion-cancelar-modal.component';
import { ClassSession } from '../../../../../core/models/attendance.model';

describe('TeacherSesionCancelarModalComponent (HU047, CULM-001 B.1)', () => {
  let fixture: ComponentFixture<TeacherSesionCancelarModalComponent>;
  let component: TeacherSesionCancelarModalComponent;
  const el = () => fixture.nativeElement as HTMLElement;
  const sesion: ClassSession = {
    id: 'ses-1', courseId: 'g', sessionNumber: 3, title: 'S', date: '2026-11-10',
    startTime: '08:00', endTime: '10:00', records: [],
  };
  const textarea = () => el().querySelector('textarea') as HTMLTextAreaElement;
  const confirmar = () => el().querySelector('[data-testid="confirmar-cancelacion"]') as HTMLButtonElement;

  async function escribir(valor: string): Promise<void> {
    textarea().value = valor;
    textarea().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [TeacherSesionCancelarModalComponent] });
    fixture = TestBed.createComponent(TeacherSesionCancelarModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('sesion', sesion);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('B1-F-09 muestra el contador 0/500 y el botón deshabilitado sin motivo', () => {
    expect(el().querySelector('[data-testid="contador-motivo"]')?.textContent).toContain('0/500');
    expect(confirmar().disabled).toBeTrue();
  });

  it('B1-F-09 deshabilita con 9 caracteres y habilita con 10 (se cuenta el texto recortado)', async () => {
    await escribir('123456789');
    expect(confirmar().disabled).toBeTrue();
    await escribir('   123456789   ');
    expect(confirmar().disabled).toBeTrue();
    await escribir('1234567890');
    expect(confirmar().disabled).toBeFalse();
    expect(el().querySelector('[data-testid="contador-motivo"]')?.textContent).toContain('10/500');
  });

  it('B1-F-09 el textarea limita a 500 caracteres y 501 deshabilita el botón', async () => {
    expect(textarea().getAttribute('maxlength')).toBe('500');
    await escribir('x'.repeat(500));
    expect(confirmar().disabled).toBeFalse();
    await escribir('x'.repeat(501));
    expect(confirmar().disabled).toBeTrue();
  });

  it('B1-F-09 emite el motivo recortado una sola vez y no lo borra hasta que el padre cierre', async () => {
    const emitidos: string[] = [];
    component.cancelar.subscribe((m) => emitidos.push(m));
    await escribir('  Incapacidad médica del docente  ');

    confirmar().click();

    expect(emitidos).toEqual(['Incapacidad médica del docente']);
    expect(component.motivo()).toContain('Incapacidad');
  });

  it('B1-F-09 no emite con un motivo fuera de rango', async () => {
    const emitidos: string[] = [];
    component.cancelar.subscribe((m) => emitidos.push(m));
    await escribir('corto');

    component.confirmar();

    expect(emitidos).toEqual([]);
  });

  it('B1-F-09 muestra el mensaje del backend recibido sin traducirlo', () => {
    fixture.componentRef.setInput('errorMensaje', 'No es posible cancelar una sesión que ya tiene asistencia registrada.');
    fixture.detectChanges();

    const alerta = el().querySelector('[role="alert"]') as HTMLElement;
    expect(alerta.textContent).toContain('No es posible cancelar una sesión que ya tiene asistencia registrada.');
  });

  it('B1-F-09 mientras envía deshabilita confirmar', async () => {
    await escribir('Motivo suficientemente largo');
    fixture.componentRef.setInput('enviando', true);
    fixture.detectChanges();

    expect(confirmar().disabled).toBeTrue();
  });

  it('B1-F-09 limpia el motivo al cerrarse', async () => {
    await escribir('Motivo suficientemente largo');
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.motivo()).toBe('');
  });

  it('B1-F-10 móvil: el panel ocupa el ancho disponible y el botón tiene objetivo táctil de 44 px', () => {
    expect(el().querySelector('[data-testid="cancelar-panel"]')?.className).toContain('w-full');
    expect(confirmar().className).toContain('min-h-[44px]');
  });
});
