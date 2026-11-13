import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

@Component({
    imports: [EmptyStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-empty-state title="Sin sesiones" description="Crea la primera sesion." variant="info">
      <button empty-action data-testid="cta">Crear</button>
    </app-empty-state>
  `
})
class HostComponent {}

describe('EmptyStateComponent (CULM-001, estados vacios uniformes)', () => {
  let fixture: ComponentFixture<EmptyStateComponent>;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  function crear(inputs: Record<string, unknown> = {}): void {
    fixture = TestBed.createComponent(EmptyStateComponent);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [EmptyStateComponent, HostComponent] }));

  it('declara OnPush y se anuncia como estado (role=status)', () => {
    const meta = (EmptyStateComponent as unknown as { ɵcmp: { onPush: boolean } }).ɵcmp;
    expect(meta.onPush).toBeTrue();
    crear();
    expect(root().querySelector('[role="status"]')).not.toBeNull();
  });

  it('muestra el titulo por defecto y no pinta descripcion vacia', () => {
    crear();
    expect(root().querySelector('h3')?.textContent).toContain('No se encontraron registros');
    expect(root().querySelector('p')).toBeNull();
  });

  it('muestra titulo y descripcion informados', () => {
    crear({ title: 'Sin grupos', description: 'Aun no tienes grupos.' });
    expect(root().querySelector('h3')?.textContent).toContain('Sin grupos');
    expect(root().querySelector('p')?.textContent).toContain('Aun no tienes grupos.');
  });

  it('cada variante usa su color de icono', () => {
    const esperado: Record<string, string> = {
      neutral: 'bg-warm-100',
      search: 'bg-primary-50',
      info: 'bg-accent-100',
      error: 'bg-danger-50',
    };
    for (const [variante, clase] of Object.entries(esperado)) {
      crear({ variant: variante });
      expect(root().querySelector('div.w-14')?.className).toContain(clase);
      fixture.destroy();
    }
  });

  it('proyecta la accion principal en el slot empty-action', () => {
    const host = TestBed.createComponent(HostComponent);
    host.detectChanges();
    const el = host.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="cta"]')?.textContent).toContain('Crear');
    expect(el.querySelector('h3')?.textContent).toContain('Sin sesiones');
  });

  it('muestra la causa cuando se informa y no pinta el bloque si falta', () => {
    crear({ title: 'Sin sesiones ejecutadas aún' });
    expect(root().querySelector('[data-testid="empty-causa"]')).toBeNull();
    fixture.destroy();
    crear({ title: 'Sin sesiones ejecutadas aún', causa: 'La próxima es el jue 12 nov, 08:00.' });
    expect(root().querySelector('[data-testid="empty-causa"]')?.textContent).toContain('La próxima es el jue 12 nov, 08:00.');
  });

  it('accion opcional: sin texto no hay boton; con texto emite al hacer clic', () => {
    crear({});
    expect(root().querySelector('[data-testid="empty-accion"]')).toBeNull();
    fixture.destroy();
    crear({ accionTexto: 'Limpiar filtros' });
    let emitido = 0;
    fixture.componentInstance.accion.subscribe(() => emitido++);
    const boton = root().querySelector('[data-testid="empty-accion"]') as HTMLButtonElement;
    expect(boton.textContent).toContain('Limpiar filtros');
    expect(boton.type).toBe('button');
    boton.click();
    expect(emitido).toBe(1);
  });
});
