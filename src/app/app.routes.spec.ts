import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
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

  it('B1-F-39 /app/admin/festivos existe y autoriza exclusivamente al administrador', () => {
    const appRoute = routes.find((route) => route.path === 'app');
    const festivos = appRoute?.children?.find((route) => route.path === 'admin/festivos');

    expect(festivos).toBeDefined();
    expect(festivos?.canActivate?.length).toBeGreaterThan(0);
    const roles = festivos?.data?.['roles'] as string[];
    expect(roles).toContain('ADMINISTRADOR');
    for (const role of ['DOCENTE', 'ESTUDIANTE', 'COORDINADOR', 'DECANO']) {
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

  it('las rutas de solicitudes de ingreso fueron retiradas', async () => {
    const appRoute = routes.find((route) => route.path === 'app');
    expect(appRoute?.children?.some((r) => r.path === 'estudiante/solicitudes')).toBeFalse();

    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/app/estudiante/solicitudes');
    expect(router.url).toContain('/login');
  });
});
