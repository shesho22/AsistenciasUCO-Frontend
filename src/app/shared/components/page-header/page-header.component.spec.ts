import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageHeaderComponent } from './page-header.component';

@Component({
  imports: [PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      [titulo]="titulo()"
      [descripcion]="descripcion()"
      [etiqueta]="etiqueta()"
      [contexto]="contexto()"
      [enTarjeta]="enTarjeta()"
      [alineacion]="alineacion()"
      [tituloTestId]="tituloTestId()"
      [conTitulo]="conTitulo()"
    >
      @if (conPrevia()) {
        <span cabecera-previa data-testid="previa">Previa</span>
      }
      @if (conDetalle()) {
        <p cabecera-detalle data-testid="detalle">Detalle <strong>rico</strong></p>
      }
      @if (conAcciones()) {
        <button cabecera-acciones type="button" data-testid="accion">Acción</button>
      }
    </app-page-header>
  `,
})
class AnfitrionComponent {
  titulo = signal('Pantalla de prueba');
  descripcion = signal<string | null>(null);
  etiqueta = signal<string | null>(null);
  contexto = signal<string | null>(null);
  enTarjeta = signal(false);
  alineacion = signal<'centro' | 'final'>('centro');
  tituloTestId = signal<string | null>(null);
  conTitulo = signal(true);
  conPrevia = signal(false);
  conDetalle = signal(false);
  conAcciones = signal(false);
}

describe('PageHeaderComponent', () => {
  let fixture: ComponentFixture<AnfitrionComponent>;
  let anfitrion: AnfitrionComponent;
  const el = () => fixture.nativeElement as HTMLElement;
  const contenedor = () => el().querySelector('[data-testid="page-header"]') as HTMLElement;
  const render = () => fixture.detectChanges();

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AnfitrionComponent] }).compileComponents();
    fixture = TestBed.createComponent(AnfitrionComponent);
    anfitrion = fixture.componentInstance;
  });

  it('pinta un único h1 con la tipografía del sistema y sin extras por defecto', () => {
    render();
    const titulos = el().querySelectorAll('h1');
    expect(titulos.length).toBe(1);
    expect(titulos[0].textContent?.trim()).toBe('Pantalla de prueba');
    expect(titulos[0].className).toContain('font-serif');
    expect(titulos[0].hasAttribute('data-testid')).toBeFalse();
    expect(el().querySelector('h1 + p')).toBeNull();
    expect(el().querySelector('.rounded-full')).toBeNull();
    expect(contenedor().className).toContain('sm:items-center');
    expect(contenedor().className).not.toContain('superficie');
  });

  it('muestra descripción, etiqueta, contexto y separador cuando se indican', () => {
    anfitrion.descripcion.set('Texto de apoyo');
    anfitrion.etiqueta.set('Coordinación');
    anfitrion.contexto.set('Calendario');
    render();
    expect(el().querySelector('h1 + p')?.textContent?.trim()).toBe('Texto de apoyo');
    expect(el().querySelector('.rounded-full')?.textContent?.trim()).toBe('Coordinación');
    expect(el().textContent).toContain('Calendario');
    expect(el().querySelector('[aria-hidden="true"]')?.textContent).toContain('•');
  });

  it('omite el separador si solo hay etiqueta o solo contexto', () => {
    anfitrion.etiqueta.set('Solo etiqueta');
    render();
    expect(el().querySelector('[aria-hidden="true"]')).toBeNull();
    anfitrion.etiqueta.set(null);
    anfitrion.contexto.set('Solo contexto');
    render();
    expect(el().querySelector('[aria-hidden="true"]')).toBeNull();
    expect(el().textContent).toContain('Solo contexto');
  });

  it('aplica la tarjeta, la alineación final y el data-testid del título', () => {
    anfitrion.enTarjeta.set(true);
    anfitrion.alineacion.set('final');
    anfitrion.tituloTestId.set('titulo-x');
    render();
    expect(contenedor().className).toContain('superficie');
    expect(contenedor().className).toContain('sm:items-end');
    expect(el().querySelector('[data-testid="titulo-x"]')?.tagName).toBe('H1');
  });

  it('proyecta las ranuras previa, detalle y acciones', () => {
    anfitrion.conPrevia.set(true);
    anfitrion.conDetalle.set(true);
    anfitrion.conAcciones.set(true);
    render();
    expect(el().querySelector('[data-testid="previa"]')).not.toBeNull();
    expect(el().querySelector('[data-testid="detalle"] strong')?.textContent).toBe('rico');
    const accion = el().querySelector('[data-testid="accion"]') as HTMLElement;
    expect(accion.parentElement?.className).toContain('empty:hidden');
  });

  it('sin título omite el h1 y la descripción pero conserva las acciones', () => {
    anfitrion.conTitulo.set(false);
    anfitrion.descripcion.set('No se ve');
    anfitrion.conAcciones.set(true);
    render();
    expect(el().querySelector('h1')).toBeNull();
    expect(el().textContent).not.toContain('No se ve');
    expect(el().querySelector('[data-testid="accion"]')).not.toBeNull();
  });

  it('actualiza el título al cambiar la entrada', () => {
    render();
    anfitrion.titulo.set('Otro título');
    render();
    expect(el().querySelector('h1')?.textContent?.trim()).toBe('Otro título');
  });
});
