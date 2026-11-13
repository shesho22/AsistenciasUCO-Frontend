import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TabItem, TabsNavComponent, pestanaEnRuta } from './tabs-nav.component';

const TABS: readonly TabItem[] = [
  { id: 'uno', etiqueta: 'Uno' },
  { id: 'dos', etiqueta: 'Dos' },
  { id: 'tres', etiqueta: 'Tres' },
];

@Component({ selector: 'app-hija-falsa', standalone: true, template: '<p id="hija">hija</p>' })
class HijaFalsaComponent {}

@Component({
    selector: 'app-cascaron-falso',
    imports: [TabsNavComponent, RouterOutlet],
    template: `
    <app-tabs-nav [tabs]="tabs" [activa]="activa()" [base]="['/x']" etiqueta="Secciones de prueba" idPanel="panel-x" />
    <div role="tabpanel" id="panel-x"><router-outlet /></div>
  `
})
class CascaronFalsoComponent {
  readonly tabs = TABS;
  private readonly enRuta = pestanaEnRuta();
  activa = () => this.enRuta() ?? 'uno';
}

@Component({
    selector: 'app-aislado',
    imports: [TabsNavComponent],
    template: `<app-tabs-nav [tabs]="tabs" [activa]="activa()" [base]="['/aislado']" />`
})
class AisladoComponent {
  readonly tabs = TABS;
  readonly activa = signal('dos');
}

describe('TabsNavComponent', () => {
  let harness: RouterTestingHarness;

  const rutas = [
    {
      path: 'x',
      component: CascaronFalsoComponent,
      children: TABS.map((t) => ({ path: t.id, data: { tab: t.id }, component: HijaFalsaComponent })),
    },
  ];

  async function abrir(url: string) {
    TestBed.configureTestingModule({ providers: [provideRouter(rutas)] });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, CascaronFalsoComponent);
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  const seleccionada = (el: HTMLElement) => el.querySelector('[role="tab"][aria-selected="true"]')?.id ?? null;

  it('marca como activa la pestaña de la ruta hija y la enlaza con su panel', async () => {
    const el = await abrir('/x/dos');
    expect(seleccionada(el)).toBe('tab-dos');
    expect(el.querySelector('[role="tab"]')?.getAttribute('aria-controls')).toBe('panel-x');
    expect(el.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe('Secciones de prueba');
    expect(el.querySelector('#hija')).not.toBeNull();
  });

  it('solo la pestaña activa entra en el orden de tabulación', async () => {
    const el = await abrir('/x/tres');
    const indices = Array.from(el.querySelectorAll('[role="tab"]')).map((b) => b.getAttribute('tabindex'));
    expect(indices).toEqual(['-1', '-1', '0']);
  });

  it('hacer clic navega a la ruta de la pestaña', async () => {
    const el = await abrir('/x/uno');
    (el.querySelector('#tab-tres') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/x/tres');
    expect(seleccionada(el)).toBe('tab-tres');
  });

  it('la lista tiene scroll horizontal propio para móvil', async () => {
    const el = await abrir('/x/uno');
    expect((el.querySelector('[role="tablist"]') as HTMLElement).className).toContain('overflow-x-auto');
  });

  it('flechas, Home y End se mueven circularmente; otras teclas se ignoran', async () => {
    const el = await abrir('/x/uno');
    const router = TestBed.inject(Router);
    const tecla = async (key: string) => {
      (el.querySelector('[role="tab"][aria-selected="true"]') as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      );
      await harness.fixture.whenStable();
      harness.detectChanges();
      return router.url;
    };
    expect(await tecla('ArrowRight')).toBe('/x/dos');
    expect(await tecla('ArrowLeft')).toBe('/x/uno');
    expect(await tecla('ArrowLeft')).toBe('/x/tres');
    expect(await tecla('ArrowRight')).toBe('/x/uno');
    expect(await tecla('End')).toBe('/x/tres');
    expect(await tecla('Home')).toBe('/x/uno');
    expect(await tecla('a')).toBe('/x/uno');
  });

  it('valores por defecto: etiqueta "Secciones" y panel "panel-pestanas"', () => {
    TestBed.configureTestingModule({ providers: [provideRouter(rutas)] });
    const fixture = TestBed.createComponent(AisladoComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe('Secciones');
    expect(el.querySelector('[role="tab"]')?.getAttribute('aria-controls')).toBe('panel-pestanas');
    expect(el.querySelector('[role="tab"][aria-selected="true"]')?.id).toBe('tab-dos');
  });

  it('una ruta hija sin dato de pestaña deja la pestaña por defecto del cascarón', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'x', component: CascaronFalsoComponent, children: [{ path: 'otra', component: HijaFalsaComponent }] }]),
      ],
    });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/x/otra', CascaronFalsoComponent);
    harness.detectChanges();
    expect(seleccionada(harness.routeNativeElement as HTMLElement)).toBe('tab-uno');
  });
});
