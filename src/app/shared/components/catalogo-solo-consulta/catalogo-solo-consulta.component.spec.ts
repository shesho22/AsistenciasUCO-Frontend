import { TestBed } from '@angular/core/testing';
import { CatalogoSoloConsultaComponent } from './catalogo-solo-consulta.component';

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
