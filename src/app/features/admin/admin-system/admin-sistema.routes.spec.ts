import { SISTEMA_ROUTES } from './admin-sistema.routes';

describe('SISTEMA_ROUTES', () => {
  it('redirige /admin/sistema a la auditoría', () => {
    expect(SISTEMA_ROUTES[0]).toEqual(jasmine.objectContaining({ path: '', redirectTo: 'auditoria', pathMatch: 'full' }));
  });

  it('auditoría y cierre masivo son vistas independientes y diferidas, sin cascarón de pestañas', async () => {
    const hijas = SISTEMA_ROUTES.filter((r) => r.path);
    expect(hijas.map((r) => r.path)).toEqual(['auditoria', 'cierre-masivo']);
    for (const hija of hijas) {
      expect(hija.component).toBeUndefined();
      expect(hija.children).toBeUndefined();
      expect(await (hija.loadComponent as () => Promise<unknown>)()).toBeTruthy();
    }
  });
});
