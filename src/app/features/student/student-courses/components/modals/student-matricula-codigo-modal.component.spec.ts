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
});
