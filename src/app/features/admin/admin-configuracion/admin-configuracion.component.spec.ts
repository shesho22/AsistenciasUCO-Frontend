import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, Routes, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AdminConfiguracionComponent, TABS_CONFIGURACION } from './admin-configuracion.component';
import { CONFIGURACION_ROUTES } from './admin-configuracion.routes';

@Component({ selector: 'app-pestana-falsa', standalone: true, changeDetection: ChangeDetectionStrategy.Eager,
 template: '<p id="pestana-falsa">falsa</p>' })
class PestanaFalsaComponent {}

/** Misma estructura que CONFIGURACION_ROUTES, con pantallas falsas para no tocar HTTP. */
const RUTAS_DE_PRUEBA: Routes = [
  {
    path: 'app/admin/configuracion',
    component: AdminConfiguracionComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'parametros' },
      ...TABS_CONFIGURACION.map((t) => ({
        path: t.id,
        data: { tab: t.id },
        component: PestanaFalsaComponent,
      })),
    ],
  },
];

describe('AdminConfiguracionComponent', () => {
  let harness: RouterTestingHarness;

  async function abrir(url: string) {
    TestBed.configureTestingModule({ providers: [provideRouter(RUTAS_DE_PRUEBA)] });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, AdminConfiguracionComponent);
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  function seleccionada(el: HTMLElement): string | null {
    return el.querySelector('[role="tab"][aria-selected="true"]')?.id ?? null;
  }

  it('expone las siete secciones (instituciones vive en Estructura y mensajes es una vista propia) de configuracion en el orden esperado', () => {
    expect(TABS_CONFIGURACION.map((t) => t.id)).toEqual([
      'parametros', 'catalogos', 'estados', 'festivos', 'correo', 'areas', 'periodos',
    ]);
  });

  it('sin pestaña en la ruta abre Parametros del sistema', async () => {
    const el = await abrir('/app/admin/configuracion');
    expect(TestBed.inject(Router).url).toBe('/app/admin/configuracion/parametros');
    expect(seleccionada(el)).toBe('tab-parametros');
  });

  it('cada pestaña conocida queda seleccionada al abrir su ruta y muestra su pantalla', async () => {
    for (const t of TABS_CONFIGURACION) {
      TestBed.resetTestingModule();
      const el = await abrir(`/app/admin/configuracion/${t.id}`);
      expect(seleccionada(el)).toBe(`tab-${t.id}`);
      expect(el.querySelector('#pestana-falsa')).not.toBeNull();
      expect(el.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe(`tab-${t.id}`);
    }
  });

  it('seleccionar una pestaña navega a la ruta de esa pestaña y actualiza la seleccion', async () => {
    const el = await abrir('/app/admin/configuracion/festivos');
    (el.querySelector('#tab-correo') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/app/admin/configuracion/correo');
    expect(seleccionada(el)).toBe('tab-correo');
  });

  it('la lista de pestañas tiene desplazamiento horizontal propio para movil', async () => {
    const el = await abrir('/app/admin/configuracion/areas');
    expect((el.querySelector('[role="tablist"]') as HTMLElement).className).toContain('overflow-x-auto');
  });

  it('las flechas, Home y End mueven la pestaña activa; otras teclas se ignoran', async () => {
    const el = await abrir('/app/admin/configuracion/estados');
    const router = TestBed.inject(Router);
    const tecla = async (key: string) => {
      (el.querySelector('[role="tab"][aria-selected="true"]') as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      );
      await harness.fixture.whenStable();
      harness.detectChanges();
      return router.url;
    };
    expect(await tecla('ArrowRight')).toBe('/app/admin/configuracion/festivos');
    expect(await tecla('ArrowLeft')).toBe('/app/admin/configuracion/estados');
    expect(await tecla('Home')).toBe('/app/admin/configuracion/parametros');
    expect(await tecla('ArrowLeft')).toBe('/app/admin/configuracion/periodos');
    expect(await tecla('ArrowRight')).toBe('/app/admin/configuracion/parametros');
    expect(await tecla('End')).toBe('/app/admin/configuracion/periodos');
    expect(await tecla('a')).toBe('/app/admin/configuracion/periodos');
  });

  it('una ruta hija sin dato de pestaña cae en Parametros del sistema', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'app/admin/configuracion',
            component: AdminConfiguracionComponent,
            children: [{ path: 'otra', component: PestanaFalsaComponent }],
          },
        ]),
      ],
    });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/admin/configuracion/otra', AdminConfiguracionComponent);
    harness.detectChanges();
    expect(seleccionada(harness.routeNativeElement as HTMLElement)).toBe('tab-parametros');
  });
});

describe('CONFIGURACION_ROUTES', () => {
  const hijas = () => CONFIGURACION_ROUTES[0].children ?? [];

  it('declara una ruta hija por pestaña con su dato tab y redirige la raiz a parametros', () => {
    expect(hijas().find((r) => r.path === '')?.redirectTo).toBe('parametros');
    const conTab = hijas().filter((r) => r.data?.['tab']);
    expect(conTab.map((r) => r.path)).toEqual(TABS_CONFIGURACION.map((t) => t.id));
    for (const r of conTab) {
      expect(r.data?.['tab']).toBe(r.path);
    }
  });

  it('solo la pestaña de parametros pide el modo sin encabezado', () => {
    for (const r of hijas().filter((x) => x.data?.['tab'])) {
      expect(r.data?.['modo']).toBe(r.path === 'parametros' ? 'parametros' : undefined);
    }
  });

  it('cada pestaña carga de forma diferida un componente real', async () => {
    for (const r of hijas().filter((x) => x.loadComponent)) {
      expect(await (r.loadComponent as () => Promise<unknown>)()).toBeTruthy();
    }
  });

  it('instituciones y mensajes ya no son pestañas: redirigen a su vista propia', () => {
    expect(hijas().find((r) => r.path === 'instituciones')?.redirectTo).toBe('/app/admin/estructura/instituciones');
    expect(hijas().find((r) => r.path === 'mensajes')?.redirectTo).toBe('/app/admin/mensajes');
  });
});
