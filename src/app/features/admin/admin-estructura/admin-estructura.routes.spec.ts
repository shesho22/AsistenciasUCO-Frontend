import { ESTRUCTURA_ROUTES } from './admin-estructura.routes';
import { TabsRutaShellConfig } from '../../../shared/components/tabs/tabs-ruta-shell.component';

describe('ESTRUCTURA_ROUTES', () => {
  const cascaron = ESTRUCTURA_ROUTES[0];
  const shell = cascaron.data?.['shell'] as TabsRutaShellConfig;
  const hijas = cascaron.children ?? [];

  it('declara las pestañas facultades e instituciones, con facultades por defecto', () => {
    expect(shell.tabs.map((t) => t.id)).toEqual(['facultades', 'instituciones']);
    expect(shell.base).toBe('/app/admin/estructura');
    expect(hijas[0]).toEqual(jasmine.objectContaining({ path: '', redirectTo: 'facultades', pathMatch: 'full' }));
  });

  it('cada pestaña es una ruta hija diferida con data.tab', async () => {
    for (const tab of shell.tabs) {
      const hija = hijas.find((r) => r.path === tab.id);
      expect(hija?.data?.['tab']).toBe(tab.id);
      expect(await (hija!.loadComponent as () => Promise<unknown>)()).toBeTruthy();
    }
  });
});
