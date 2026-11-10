import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, Routes, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TabsRutaShellComponent, TabsRutaShellConfig } from './tabs-ruta-shell.component';

@Component({ selector: 'app-hija-falsa', standalone: true, template: '<p id="hija-falsa">hija</p>' })
class HijaFalsaComponent {}

const CONFIG: TabsRutaShellConfig = {
  titulo: 'Personas',
  descripcion: 'Descripcion de prueba',
  base: '/app/admin/personas',
  tabs: [
    { id: 'estudiantes', etiqueta: 'Estudiantes' },
    { id: 'docentes', etiqueta: 'Docentes' },
    { id: 'decanos', etiqueta: 'Decanos' },
  ],
  porDefecto: 'estudiantes',
};

const RUTAS: Routes = [
  {
    path: 'app/admin/personas',
    component: TabsRutaShellComponent,
    data: { shell: CONFIG },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'estudiantes' },
      ...CONFIG.tabs.map((t) => ({ path: t.id, data: { tab: t.id }, component: HijaFalsaComponent })),
      { path: 'otra', component: HijaFalsaComponent },
    ],
  },
];

describe('TabsRutaShellComponent', () => {
  let harness: RouterTestingHarness;

  async function abrir(url: string): Promise<HTMLElement> {
    TestBed.configureTestingModule({ providers: [provideRouter(RUTAS)] });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, TabsRutaShellComponent);
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  const seleccionada = (el: HTMLElement): string | null =>
    el.querySelector('[role="tab"][aria-selected="true"]')?.id ?? null;

  it('muestra titulo, descripcion y una pestaña por cada entrada de la configuracion', async () => {
    const el = await abrir('/app/admin/personas/docentes');
    expect(el.textContent).toContain('Personas');
    expect(el.textContent).toContain('Descripcion de prueba');
    expect(Array.from(el.querySelectorAll('[role="tab"]')).map((t) => t.id)).toEqual([
      'tab-estudiantes', 'tab-docentes', 'tab-decanos',
    ]);
  });

  it('la pestaña activa es la de la ruta hija y el panel apunta a ella', async () => {
    const el = await abrir('/app/admin/personas/decanos');
    expect(seleccionada(el)).toBe('tab-decanos');
    expect(el.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe('tab-decanos');
    expect(el.querySelector('#hija-falsa')).not.toBeNull();
  });

  it('sin pestaña en la ruta abre la pestaña por defecto', async () => {
    const el = await abrir('/app/admin/personas');
    expect(TestBed.inject(Router).url).toBe('/app/admin/personas/estudiantes');
    expect(seleccionada(el)).toBe('tab-estudiantes');
  });

  it('una ruta hija sin data.tab deja la pestaña por defecto', async () => {
    const el = await abrir('/app/admin/personas/otra');
    expect(seleccionada(el)).toBe('tab-estudiantes');
  });

  it('seleccionar una pestaña navega a su ruta y la marca como activa', async () => {
    const el = await abrir('/app/admin/personas/estudiantes');
    (el.querySelector('#tab-docentes') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/app/admin/personas/docentes');
    expect(seleccionada(el)).toBe('tab-docentes');
  });

  it('la lista de pestañas tiene scroll horizontal propio para movil', async () => {
    const el = await abrir('/app/admin/personas/estudiantes');
    expect((el.querySelector('[role="tablist"]') as HTMLElement).className).toContain('overflow-x-auto');
  });

  it('flechas, Home y End mueven la pestaña activa; otras teclas se ignoran', async () => {
    const el = await abrir('/app/admin/personas/docentes');
    const router = TestBed.inject(Router);
    const tecla = async (key: string): Promise<string> => {
      const activa = el.querySelector('[role="tab"][aria-selected="true"]') as HTMLButtonElement;
      activa.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      await harness.fixture.whenStable();
      harness.detectChanges();
      return router.url;
    };
    expect(await tecla('ArrowRight')).toBe('/app/admin/personas/decanos');
    expect(await tecla('ArrowRight')).toBe('/app/admin/personas/estudiantes');
    expect(await tecla('ArrowLeft')).toBe('/app/admin/personas/decanos');
    expect(await tecla('Home')).toBe('/app/admin/personas/estudiantes');
    expect(await tecla('End')).toBe('/app/admin/personas/decanos');
    expect(await tecla('a')).toBe('/app/admin/personas/decanos');
  });

  it('solo la pestaña activa entra en el orden de tabulacion', async () => {
    const el = await abrir('/app/admin/personas/docentes');
    const indices = Array.from(el.querySelectorAll('[role="tab"]')).map((t) => t.getAttribute('tabindex'));
    expect(indices).toEqual(['-1', '0', '-1']);
  });
});
