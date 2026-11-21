import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TablaDatosComponent, TAMANO_PAGINA_TABLA, TAMANOS_PAGINA_TABLA, paginarEnCliente } from './tabla-datos.component';

@Component({
  imports: [TablaDatosComponent],
  template: `
    <app-tabla-datos
      etiqueta="Prueba"
      [columnas]="2"
      [cargando]="cargando()"
      [vacio]="filas().length === 0"
      mensajeVacio="Nada por aqui"
      [paginada]="true"
      [totalItems]="filas().length"
      [pagina]="pagina()"
      (paginaChange)="pagina.set($event)"
    >
      <thead><tr><th scope="col">A</th><th scope="col">B</th></tr></thead>
      <tbody>
        @if (!cargando()) {
          @for (f of filas(); track f) {
            <tr data-testid="fila"><td>{{ f }}</td><td>x</td></tr>
          }
        }
      </tbody>
    </app-tabla-datos>
  `,
})
class AnfitrionComponent {
  readonly cargando = signal(false);
  readonly filas = signal<string[]>(['uno', 'dos']);
  readonly pagina = signal(1);
}

describe('TablaDatosComponent', () => {
  let fixture: ComponentFixture<AnfitrionComponent>;
  let host: AnfitrionComponent;
  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AnfitrionComponent] }).compileComponents();
    fixture = TestBed.createComponent(AnfitrionComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('proyecta cabecera y filas dentro de una tabla con region accesible', () => {
    const region = el().querySelector('[role="region"]');
    expect(region?.getAttribute('aria-label')).toBe('Prueba');
    expect(el().querySelectorAll('table thead th').length).toBe(2);
    expect(el().querySelectorAll('[data-testid="fila"]').length).toBe(2);
    expect(el().querySelector('table caption')?.textContent).toContain('Prueba');
  });

  it('usa por defecto el marco con desplazamiento propio y alto maximo (cabecera fija) y deja la paginacion fuera', () => {
    const region = el().querySelector('[role="region"]') as HTMLElement;
    expect(region.classList.contains('tabla-contenedor')).toBeTrue();
    expect(region.style.maxHeight).toBe('var(--tabla-alto-max)');
    expect(region.querySelector('app-pagination')).toBeNull();
    expect(el().querySelector('app-pagination')).toBeTruthy();
  });

  it('muestra filas de esqueleto mientras carga y marca aria-busy', () => {
    host.cargando.set(true);
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="tabla-datos-esqueleto"]')).toBeTruthy();
    expect(el().querySelector('[role="region"]')?.getAttribute('aria-busy')).toBe('true');
    expect(el().querySelectorAll('[data-testid="fila"]').length).toBe(0);
  });

  it('muestra el mensaje de vacio con colspan igual al numero de columnas', () => {
    host.filas.set([]);
    fixture.detectChanges();
    const celda = el().querySelector('[data-testid="tabla-datos-vacia"]');
    expect(celda?.textContent).toContain('Nada por aqui');
    expect(celda?.getAttribute('colspan')).toBe('2');
    expect(el().querySelector('app-pagination nav')).toBeNull();
  });

  it('ofrece paginacion de 15, 30 y 50 por defecto', () => {
    const opciones = Array.from(el().querySelectorAll('app-pagination option')).map((o) => o.textContent?.trim());
    expect(opciones).toEqual(['15', '30', '50']);
    expect(TAMANO_PAGINA_TABLA).toBe(15);
    expect(TAMANOS_PAGINA_TABLA).toEqual([15, 30, 50]);
  });

  it('tarjetasEnMovil activa la clase que apila las filas como tarjetas bajo md (apagada por defecto)', () => {
    expect(el().querySelector('table')?.classList).not.toContain('tabla-tarjetas');
    const f2 = TestBed.createComponent(TablaDatosComponent);
    f2.componentRef.setInput('tarjetasEnMovil', true);
    f2.detectChanges();
    expect((f2.nativeElement as HTMLElement).querySelector('table')?.classList).toContain('tabla-tarjetas');
  });

  it('paginarEnCliente devuelve la porcion de la pagina', () => {
    const datos = Array.from({ length: 40 }, (_, i) => i);
    expect(paginarEnCliente(datos, 1, 15)).toEqual(datos.slice(0, 15));
    expect(paginarEnCliente(datos, 3, 15)).toEqual(datos.slice(30, 40));
    expect(paginarEnCliente(datos, 0, 15)).toEqual(datos.slice(0, 15));
  });
});
