import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionMenuComponent, ActionMenuItem } from './action-menu.component';

describe('ActionMenuComponent (CULM-001, patron "Mas acciones")', () => {
  let fixture: ComponentFixture<ActionMenuComponent>;
  const items: ActionMenuItem[] = [
    { id: 'a', label: 'Copiar PIN', testid: 'it-a' },
    { id: 'b', label: 'Regenerar', testid: 'it-b', disabled: true },
    { id: 'c', label: 'Cerrar toma', testid: 'it-c', danger: true },
  ];
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = (s: string): HTMLElement | null => root().querySelector(s);
  const trigger = (): HTMLButtonElement => q('[data-testid="action-menu-trigger"]') as HTMLButtonElement;
  const opciones = (): HTMLElement[] => Array.from(root().querySelectorAll('[role="menuitem"]'));

  function crear(inputs: Record<string, unknown> = {}): void {
    fixture = TestBed.createComponent(ActionMenuComponent);
    fixture.componentRef.setInput('items', items);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
  }
  function abrir(): void {
    trigger().click();
    fixture.detectChanges();
  }
  async function abrirYEnfocar(): Promise<void> {
    abrir();
    await new Promise<void>((r) => setTimeout(r, 0));
  }
  const tecla = (el: Element, key: string): void => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  };

  beforeEach(() => TestBed.configureTestingModule({ imports: [ActionMenuComponent] }));

  it('declara OnPush', () => {
    const meta = (ActionMenuComponent as unknown as { ɵcmp: { onPush: boolean } }).ɵcmp;
    expect(meta.onPush).toBeTrue();
  });

  it('inicia cerrado con aria-haspopup, aria-expanded=false y aria-label', () => {
    crear();
    expect(q('[role="menu"]')).toBeNull();
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-label')).toBe('Más acciones');
  });

  it('usa un aria-label personalizado', () => {
    crear({ label: 'Acciones del grupo' });
    expect(trigger().getAttribute('aria-label')).toBe('Acciones del grupo');
  });

  it('al abrir muestra role=menu con un menuitem por accion y marca expandido', () => {
    crear();
    abrir();
    expect(q('[role="menu"]')).not.toBeNull();
    expect(opciones().length).toBe(3);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(q('[data-testid="it-c"]')?.textContent).toContain('Cerrar toma');
  });

  it('emite el id al elegir una accion y cierra el menu', () => {
    crear();
    const ids: string[] = [];
    fixture.componentInstance.selected.subscribe((id) => ids.push(id));
    abrir();
    (q('[data-testid="it-a"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(ids).toEqual(['a']);
    expect(q('[role="menu"]')).toBeNull();
  });

  it('no emite una accion deshabilitada', () => {
    crear();
    const ids: string[] = [];
    fixture.componentInstance.selected.subscribe((id) => ids.push(id));
    abrir();
    expect((q('[data-testid="it-b"]') as HTMLButtonElement).disabled).toBeTrue();
    (q('[data-testid="it-b"]') as HTMLButtonElement).click();
    expect(ids).toEqual([]);
  });

  it('resalta la accion peligrosa', () => {
    crear();
    abrir();
    expect(q('[data-testid="it-c"]')?.className).toContain('text-danger');
  });

  it('Escape cierra, devuelve el foco al boton y no se propaga', () => {
    crear();
    abrir();
    const propagado = jasmine.createSpy('propagado');
    document.addEventListener('keydown', propagado);
    tecla(opciones()[0], 'Escape');
    document.removeEventListener('keydown', propagado);
    fixture.detectChanges();
    expect(q('[role="menu"]')).toBeNull();
    expect(propagado).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger());
  });

  it('Escape con el menu cerrado se propaga (no lo consume)', () => {
    crear();
    const propagado = jasmine.createSpy('propagado');
    document.addEventListener('keydown', propagado);
    tecla(trigger(), 'Escape');
    document.removeEventListener('keydown', propagado);
    expect(propagado).toHaveBeenCalled();
  });

  it('Escape sobre el boton con el menu abierto lo cierra sin propagar', () => {
    crear();
    abrir();
    const propagado = jasmine.createSpy('propagado');
    document.addEventListener('keydown', propagado);
    tecla(trigger(), 'Escape');
    document.removeEventListener('keydown', propagado);
    fixture.detectChanges();
    expect(q('[role="menu"]')).toBeNull();
    expect(propagado).not.toHaveBeenCalled();
  });

  it('abrir enfoca la primera accion habilitada y las flechas navegan entre las habilitadas', async () => {
    crear();
    document.body.appendChild(root());
    await abrirYEnfocar();
    const [a, , c] = opciones();
    expect(document.activeElement).toBe(a);
    tecla(a, 'ArrowDown');
    expect(document.activeElement).toBe(c);
    tecla(c, 'ArrowDown');
    expect(document.activeElement).toBe(a);
    tecla(a, 'ArrowUp');
    expect(document.activeElement).toBe(c);
    tecla(c, 'Home');
    expect(document.activeElement).toBe(a);
    tecla(a, 'End');
    expect(document.activeElement).toBe(c);
    root().remove();
  });

  it('ArrowDown sobre el boton cerrado abre el menu', () => {
    crear();
    tecla(trigger(), 'ArrowDown');
    fixture.detectChanges();
    expect(q('[role="menu"]')).not.toBeNull();
  });

  it('ArrowDown sobre el boton con el menu abierto lo mantiene abierto', () => {
    crear();
    abrir();
    tecla(trigger(), 'ArrowDown');
    fixture.detectChanges();
    expect(q('[role="menu"]')).not.toBeNull();
  });

  it('un clic dentro del host no cierra; uno fuera si', () => {
    crear();
    abrir();
    root().click();
    fixture.detectChanges();
    expect(q('[role="menu"]')).not.toBeNull();
    document.body.click();
    fixture.detectChanges();
    expect(q('[role="menu"]')).toBeNull();
  });

  it('un clic fuera con el menu cerrado no hace nada', () => {
    crear();
    document.body.click();
    fixture.detectChanges();
    expect(q('[role="menu"]')).toBeNull();
  });

  it('el segundo clic sobre el boton cierra el menu', () => {
    crear();
    abrir();
    abrir();
    expect(q('[role="menu"]')).toBeNull();
  });

  it('Tab cierra el menu', () => {
    crear();
    abrir();
    tecla(opciones()[0], 'Tab');
    fixture.detectChanges();
    expect(q('[role="menu"]')).toBeNull();
  });

  it('una tecla cualquiera no cierra el menu', () => {
    crear();
    abrir();
    tecla(opciones()[0], 'x');
    fixture.detectChanges();
    expect(q('[role="menu"]')).not.toBeNull();
  });

  it('placement top abre hacia arriba y tone dark ajusta el boton', () => {
    crear({ placement: 'top', tone: 'dark' });
    abrir();
    expect(q('[role="menu"]')?.className).toContain('bottom-full');
    expect(trigger().className).toContain('text-white');
  });

  it('placement bottom abre hacia abajo', () => {
    crear();
    abrir();
    expect(q('[role="menu"]')?.className).toContain('top-full');
  });

  it('sin acciones no renderiza el boton', () => {
    crear({ items: [] });
    expect(trigger()).toBeNull();
  });
});
