import { PERSONAS_ROUTES } from './admin-personas.routes';
import { TabsRutaShellConfig } from '../../../shared/components/tabs/tabs-ruta-shell.component';

describe('PERSONAS_ROUTES', () => {
  const cascaron = PERSONAS_ROUTES[0];
  const shell = cascaron.data?.['shell'] as TabsRutaShellConfig;
  const hijas = cascaron.children ?? [];

  it('declara las pestañas estudiantes, docentes, decanos y asignaturas en ese orden', () => {
    expect(shell.tabs.map((t) => t.id)).toEqual(['estudiantes', 'docentes', 'decanos', 'asignaturas']);
    expect(shell.base).toBe('/app/admin/personas');
    expect(shell.porDefecto).toBe('estudiantes');
  });

  it('sin pestaña abre estudiantes', () => {
    expect(hijas[0]).toEqual(jasmine.objectContaining({ path: '', redirectTo: 'estudiantes', pathMatch: 'full' }));
  });

  it('cada pestaña es una ruta hija diferida que se identifica con data.tab', async () => {
    for (const tab of shell.tabs) {
      const hija = hijas.find((r) => r.path === tab.id);
      expect(hija?.data?.['tab']).toBe(tab.id);
      expect(typeof hija?.loadComponent).toBe('function');
      expect(await (hija!.loadComponent as () => Promise<unknown>)()).toBeTruthy();
    }
  });

  it('docentes y asignaturas se abren como administrador (alcance institucional)', () => {
    for (const id of ['docentes', 'asignaturas']) {
      expect(hijas.find((r) => r.path === id)?.data?.['comoAdministrador']).toBeTrue();
    }
  });
});
