import { ApplicationRef, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormFieldComponent } from './form-field.component';

@Component({
    imports: [FormFieldComponent],
    template: `
    <app-form-field label="Nombre" [errorMessage]="error()">
      <input type="text" />
    </app-form-field>
    <app-form-field label="Propio">
      <input id="propio" type="text" />
    </app-form-field>
  `
})
class HostComponent {
  error = signal('');
}

describe('FormFieldComponent (F-COO-010, F-ADM-S23)', () => {
  function crear() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
    return fixture;
  }

  it('asocia la etiqueta con el control proyectado', () => {
    const el = crear().nativeElement as HTMLElement;
    const [a, b] = Array.from(el.querySelectorAll('app-form-field'));
    const input = a.querySelector('input') as HTMLInputElement;
    expect(input.id).toBeTruthy();
    expect(a.querySelector('label')?.htmlFor).toBe(input.id);
    expect(b.querySelector('label')?.htmlFor).toBe('propio');
  });

  it('marca el control como invalido y lo asocia al mensaje de error', () => {
    const fixture = crear();
    fixture.componentInstance.error.set('Campo obligatorio.');
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
    const campo = (fixture.nativeElement as HTMLElement).querySelector('app-form-field') as HTMLElement;
    const input = campo.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const idError = input.getAttribute('aria-describedby');
    expect(idError).toBeTruthy();
    expect(document.getElementById(idError as string)?.textContent).toContain('Campo obligatorio.');
    fixture.componentInstance.error.set('');
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
    expect(input.hasAttribute('aria-invalid')).toBeFalse();
  });
});
