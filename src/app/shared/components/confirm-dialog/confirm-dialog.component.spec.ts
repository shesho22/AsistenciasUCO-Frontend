import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent (F-ADM-007, F-COO-011)', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ConfirmDialogComponent] });
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.componentRef.setInput('title', 'Eliminar período');
    fixture.componentRef.setInput('message', '¿Eliminar el período 2027-1?');
    fixture.componentRef.setInput('confirmLabel', 'Eliminar');
    el = fixture.nativeElement;
  });

  it('no renderiza nada cerrado y se presenta como alertdialog descrito por el mensaje', () => {
    fixture.detectChanges();
    expect(el.querySelector('[role="alertdialog"]')).toBeNull();
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    const dialogo = el.querySelector('[role="alertdialog"]') as HTMLElement;
    expect(dialogo).toBeTruthy();
    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(dialogo.getAttribute('aria-describedby') as string)?.textContent).toContain('2027-1');
  });

  it('emite confirmed al confirmar y cancelled al cancelar o cerrar', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    let confirmados = 0;
    let cancelados = 0;
    fixture.componentInstance.confirmed.subscribe(() => confirmados++);
    fixture.componentInstance.cancelled.subscribe(() => cancelados++);
    (el.querySelector('[data-accion="confirmar"]') as HTMLButtonElement).click();
    (el.querySelector('[data-accion="cancelar"]') as HTMLButtonElement).click();
    (el.querySelector('button[aria-label="Cerrar modal"]') as HTMLButtonElement).click();
    expect(confirmados).toBe(1);
    expect(cancelados).toBe(2);
  });

  it('la variante destructiva usa el color de peligro', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('destructive', true);
    fixture.detectChanges();
    expect((el.querySelector('[data-accion="confirmar"]') as HTMLElement).className).toContain('bg-danger-700');
  });
});
