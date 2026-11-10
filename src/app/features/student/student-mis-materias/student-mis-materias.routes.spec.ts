import { MIS_MATERIAS_ROUTES } from './student-mis-materias.routes';
import { TabsRutaShellConfig } from '../../../shared/components/tabs/tabs-ruta-shell.component';

describe('MIS_MATERIAS_ROUTES', () => {
  const cascaron = MIS_MATERIAS_ROUTES[0];
  const shell = cascaron.data?.['shell'] as TabsRutaShellConfig;
  const hijas = cascaron.children ?? [];

  it('declara las pestañas materias, horarios y oferta, con materias por defecto', () => {
    expect(shell.tabs.map((t) => t.id)).toEqual(['materias', 'horarios', 'oferta']);
    expect(shell.base).toBe('/app/estudiante/mis-materias');
    expect(hijas[0]).toEqual(jasmine.objectContaining({ path: '', redirectTo: 'materias', pathMatch: 'full' }));
  });

  it('cada pestaña es una ruta hija diferida con data.tab', async () => {
    for (const tab of shell.tabs) {
      const hija = hijas.find((r) => r.path === tab.id);
      expect(hija?.data?.['tab']).toBe(tab.id);
      expect(await (hija!.loadComponent as () => Promise<unknown>)()).toBeTruthy();
    }
  });
});
