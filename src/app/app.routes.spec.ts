import { routes } from './app.routes';

describe('application routes', () => {
  it('/app/asistencia autoriza exclusivamente DOCENTE', () => {
    const appRoute = routes.find((route) => route.path === 'app');
    const attendanceRoute = appRoute?.children?.find(
      (route) => route.path === 'asistencia'
    );

    expect(attendanceRoute?.data?.['roles']).toEqual(['DOCENTE']);
  });

  it('DECANO, ADMIN y ADMINISTRADOR no pueden abrir la pantalla operativa de registro', () => {
    const appRoute = routes.find((route) => route.path === 'app');
    const attendanceRoute = appRoute?.children?.find((route) => route.path === 'asistencia');
    const roles = attendanceRoute?.data?.['roles'] as string[];

    for (const role of ['DECANO', 'ADMIN', 'ADMINISTRADOR', 'COORDINADOR', 'ESTUDIANTE']) {
      expect(roles).not.toContain(role);
    }
  });

  it('resuelve adecuadamente los componentes cargados de forma perezosa en todas las rutas', async () => {
    const resolverRutas = async (listaRutas: typeof routes) => {
      for (const ruta of listaRutas) {
        if (typeof ruta.loadComponent === 'function') {
          const comp = await ruta.loadComponent();
          expect(comp).toBeTruthy();
        }
        if (ruta.children && ruta.children.length > 0) {
          await resolverRutas(ruta.children);
        }
      }
    };

    await resolverRutas(routes);
  });
});

