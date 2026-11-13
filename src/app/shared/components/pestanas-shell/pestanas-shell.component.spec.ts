import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, Routes, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { PestanasShellComponent } from './pestanas-shell.component';

@Component({ selector: 'app-contenido-falso', standalone: true, changeDetection: ChangeDetectionStrategy.Eager,
 template: '<p id="contenido">contenido</p>' })
class ContenidoFalsoComponent {}

const RUTAS: Routes = [
  {
    path: 'app/x',
    component: PestanasShellComponent,
    data: {
      titulo: 'Pantalla X',
      descripcion: 'Descripción de X',
      tabs: [
        { id: 'a', etiqueta: 'Alfa' },
        { id: 'b', etiqueta: 'Beta' },
      ],
      base: ['/app/x'],
    },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'a' },
      { path: 'a', data: { tab: 'a' }, component: ContenidoFalsoComponent },
      { path: 'b', data: { tab: 'b' }, component: ContenidoFalsoComponent },
      { path: 'sin-tab', component: ContenidoFalsoComponent },
    ],
  },
  {
    path: 'app/y',
    component: PestanasShellComponent,
    data: { titulo: 'Pantalla Y', tabs: [{ id: 'a', etiqueta: 'Alfa' }], base: ['/app/y'] },
    children: [{ path: 'a', data: { tab: 'a' }, component: ContenidoFalsoComponent }],
  },
];

describe('PestanasShellComponent', () => {
  async function abrir(url: string) {
    TestBed.configureTestingModule({ providers: [provideRouter(RUTAS)] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, PestanasShellComponent);
    harness.detectChanges();
    return { harness, el: harness.routeNativeElement as HTMLElement };
  }

  it('muestra un solo título con su descripción y las pestañas declaradas en la ruta', async () => {
    const { el } = await abrir('/app/x/a');
    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(el.querySelector('h1')?.textContent).toContain('Pantalla X');
    expect(el.textContent).toContain('Descripción de X');
    expect(Array.from(el.querySelectorAll('[role="tab"]')).map((t) => t.textContent?.trim())).toEqual(['Alfa', 'Beta']);
    expect(el.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe('Secciones de Pantalla X');
  });

  it('la pestaña activa sale de la URL hija y el panel queda etiquetado por ella', async () => {
    const { el } = await abrir('/app/x/b');
    expect(el.querySelector('[role="tab"][aria-selected="true"]')?.id).toBe('tab-b');
    expect(el.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe('tab-b');
    expect(el.querySelector('#contenido')).not.toBeNull();
  });

  it('sin pestaña en la URL abre la primera por redirección', async () => {
    const { el } = await abrir('/app/x');
    expect(TestBed.inject(Router).url).toBe('/app/x/a');
    expect(el.querySelector('[role="tab"][aria-selected="true"]')?.id).toBe('tab-a');
  });

  it('una ruta hija sin dato de pestaña cae en la primera', async () => {
    const { el } = await abrir('/app/x/sin-tab');
    expect(el.querySelector('[role="tab"][aria-selected="true"]')?.id).toBe('tab-a');
  });

  it('elegir otra pestaña navega a la URL hija de esa pestaña', async () => {
    const { harness, el } = await abrir('/app/x/a');
    (el.querySelector('#tab-b') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/app/x/b');
    expect(el.querySelector('[role="tab"][aria-selected="true"]')?.id).toBe('tab-b');
  });

  it('sin descripción no pinta el párrafo', async () => {
    const { el } = await abrir('/app/y/a');
    expect(el.querySelector('h1 + p')).toBeNull();
  });
});
