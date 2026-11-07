import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentMatriculaCodigoModalComponent } from './student-matricula-codigo-modal.component';

describe('StudentMatriculaCodigoModalComponent (HU176B)', () => {
  let fixture: ComponentFixture<StudentMatriculaCodigoModalComponent>;
  let component: StudentMatriculaCodigoModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StudentMatriculaCodigoModalComponent] }).compileComponents();
    fixture = TestBed.createComponent(StudentMatriculaCodigoModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
  });

  const confirmar = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Confirmar Matrícula')
    ) as HTMLButtonElement;

  it('T-FE-08: el botón de confirmar está deshabilitado con 5 dígitos o con letras', () => {
    for (const valor of ['', '12345', '12ab56', 'GRP-101', '1234567']) {
      component.codigo.set(valor);
      fixture.detectChanges();
      expect(component.pinValido()).withContext(valor).toBeFalse();
      expect(confirmar().disabled).withContext(valor).toBeTrue();
    }
  });

  it('con un PIN de 6 dígitos habilita el botón y emite el PIN al confirmar', () => {
    const emitidos: string[] = [];
    component.submitted.subscribe((v) => emitidos.push(v));
    component.codigo.set(' 482913 ');
    fixture.detectChanges();

    expect(confirmar().disabled).toBeFalse();
    confirmar().click();

    expect(emitidos).toEqual(['482913']);
  });

  it('el botón se deshabilita mientras se procesa la matrícula', () => {
    component.codigo.set('482913');
    fixture.componentRef.setInput('processing', true);
    fixture.detectChanges();

    expect(Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).some((b) => b.disabled)).toBeTrue();
  });

  it('precarga el PIN que trae el login', () => {
    fixture.componentRef.setInput('codigoInicial', '482913');
    fixture.detectChanges();

    expect(component.codigo()).toBe('482913');
    expect(component.pinValido()).toBeTrue();
  });

  it('Cancelar emite closed', () => {
    let cerrado = false;
    component.closed.subscribe(() => (cerrado = true));
    const cancelar = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Cancelar')
    ) as HTMLButtonElement;

    cancelar.click();

    expect(cerrado).toBeTrue();
  });

  describe('accesibilidad (F-EST-010)', () => {
    const el = () => fixture.nativeElement as HTMLElement;

    it('es un dialogo modal con titulo asociado', () => {
      const dialogo = el().querySelector('[role="dialog"]') as HTMLElement;
      expect(dialogo).not.toBeNull();
      expect(dialogo.getAttribute('aria-modal')).toBe('true');
      expect(dialogo.getAttribute('aria-labelledby')).toBeTruthy();
    });

    it('el campo PIN tiene etiqueta visible, inputmode numerico y patron', () => {
      const input = el().querySelector('input') as HTMLInputElement;
      expect(input.getAttribute('inputmode')).toBe('numeric');
      expect(input.getAttribute('pattern')).toBe('[0-9]*');
      const label = el().querySelector(`label[for="${input.id}"]`);
      expect(input.id).toBeTruthy();
      expect(label?.textContent).toContain('PIN');
    });

    it('descarta letras y simbolos al escribir el PIN', () => {
      const input = el().querySelector('input') as HTMLInputElement;
      input.value = '12ab-34';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(component.codigo()).toBe('1234');
    });

    it('Escape cierra el modal', () => {
      let cerrado = false;
      component.closed.subscribe(() => (cerrado = true));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(cerrado).toBeTrue();
    });

    it('el boton de cierre tiene nombre accesible', () => {
      expect(el().querySelector('button[aria-label="Cerrar modal"]')).not.toBeNull();
    });
  });
});
