import { TestBed } from '@angular/core/testing';
import { CatalogoSoloConsultaComponent } from './catalogo-solo-consulta.component';
import { loadErrorState } from '../../../core/api/errors/load-error.util';

describe('CatalogoSoloConsultaComponent', () => {
  it('muestra el mensaje de vacío cuando no hay filas', () => {
    TestBed.configureTestingModule({ imports: [CatalogoSoloConsultaComponent] });
    const fixture = TestBed.createComponent(CatalogoSoloConsultaComponent);
    fixture.componentRef.setInput('titulo', 'Áreas');
    fixture.componentRef.setInput('vacio', 'Sin áreas.');
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Áreas');
    expect(texto).toContain('Sin áreas.');
  });
});

describe('CatalogoSoloConsultaComponent con fallo de carga', () => {
  it('muestra el error en lugar de "no hay registros" y ofrece reintentar', () => {
    TestBed.configureTestingModule({ imports: [CatalogoSoloConsultaComponent] });
    const fixture = TestBed.createComponent(CatalogoSoloConsultaComponent);
    fixture.componentRef.setInput('titulo', 'Áreas');
    fixture.componentRef.setInput('vacio', 'Sin áreas.');
    fixture.componentRef.setInput('error', loadErrorState('SERVIDOR'));
    let reintentos = 0;
    fixture.componentInstance.reintentar.subscribe(() => reintentos++);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="error-carga"]')).not.toBeNull();
    expect(el.textContent).not.toContain('Sin áreas.');
    expect(el.querySelector('table')).toBeNull();
    (el.querySelector('[data-testid="error-carga"] button') as HTMLButtonElement).click();
    expect(reintentos).toBe(1);
  });

  it('sin error conserva la tabla', () => {
    TestBed.configureTestingModule({ imports: [CatalogoSoloConsultaComponent] });
    const fixture = TestBed.createComponent(CatalogoSoloConsultaComponent);
    fixture.componentRef.setInput('titulo', 'Áreas');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('table')).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="error-carga"]')).toBeNull();
  });
});
