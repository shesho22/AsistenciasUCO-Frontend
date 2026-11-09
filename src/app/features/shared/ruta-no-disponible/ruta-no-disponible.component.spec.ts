import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { RutaNoDisponibleComponent } from './ruta-no-disponible.component';
import { routes } from '../../../app.routes';

function render(codigo?: number) {
  TestBed.configureTestingModule({
    imports: [RutaNoDisponibleComponent],
    providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { data: { codigo } } } }],
  });
  const fixture = TestBed.createComponent(RutaNoDisponibleComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('RutaNoDisponibleComponent (F3-TRX-01)', () => {
  it('muestra 404 amigable con enlace al inicio', () => {
    const el = render(404);
    expect(el.querySelector('[data-testid="codigo-ruta"]')!.textContent).toBe('404');
    expect(el.textContent).toContain('Página no encontrada');
    expect(el.querySelector('a')!.getAttribute('href')).toBe('/app/dashboard');
  });

  it('muestra 403 amigable cuando la ruta es de otro rol', () => {
    const el = render(403);
    expect(el.querySelector('[data-testid="codigo-ruta"]')!.textContent).toBe('403');
    expect(el.textContent).toContain('No tienes acceso a esta sección');
  });

  it('un código ausente cae en 404', () => {
    expect(render().querySelector('[data-testid="codigo-ruta"]')!.textContent).toBe('404');
  });
});

describe('enrutamiento 404/403 dentro del layout (F3-TRX-01)', () => {
  const app = routes.find((r) => r.path === 'app')!;
  const hijas = app.children ?? [];

  it('la ruta comodín dentro de /app muestra la pagina 404 (no redirige a login)', () => {
    const comodin = hijas.find((r) => r.path === '**')!;
    expect(comodin).toBeDefined();
    expect(comodin.redirectTo).toBeUndefined();
    expect(comodin.data?.['codigo']).toBe(404);
  });

  it('existe /app/acceso-denegado con el codigo 403', () => {
    const r = hijas.find((x) => x.path === 'acceso-denegado')!;
    expect(r.data?.['codigo']).toBe(403);
  });
});
