import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminEmailNoDisponibleComponent } from './admin-email-no-disponible.component';

describe('AdminEmailNoDisponibleComponent', () => {
  let fixture: ComponentFixture<AdminEmailNoDisponibleComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AdminEmailNoDisponibleComponent] });
    fixture = TestBed.createComponent(AdminEmailNoDisponibleComponent);
    fixture.componentRef.setInput('aviso', 'El servicio no responde.');
    fixture.detectChanges();
  });

  it('muestra el mensaje del backend como alerta', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="no-disponible-mensaje"]')?.textContent).toContain('El servicio no responde.');
    expect(el.textContent).toContain('Servicio no disponible');
  });

  it('emite reintentar al pulsar el botón', () => {
    let emitido = 0;
    fixture.componentInstance.reintentar.subscribe(() => emitido++);
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="no-disponible-reintentar"]')!
      .click();
    expect(emitido).toBe(1);
  });
});
