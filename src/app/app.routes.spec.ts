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

  it('B1-F-39 /app/admin/festivos ya no es una pantalla propia: el acceso del administrador vive en la pestaña de configuracion', () => {
    const appRoute = routes.find((route) => route.path === 'app');
    const festivos = appRoute?.children?.find((route) => route.path === 'admin/festivos');
    const configuracion = appRoute?.children?.find((route) => route.path === 'admin/configuracion');

    expect(festivos?.redirectTo).toBeDefined();
    expect(festivos?.loadComponent).toBeUndefined();
    expect(configuracion?.canActivate?.length).toBeGreaterThan(0);
    const roles = configuracion?.data?.['roles'] as string[];
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

  it('F-DEC-009 las areas del decano viven en /app/decano/areas y la ruta heredada solo redirige', () => {
    const appRoute = routes.find((route) => route.path === 'app');
    const areas = appRoute?.children?.find((route) => route.path === 'decano/areas');
    expect(areas?.data?.['roles']).toEqual(['DECANO']);
    const heredada = appRoute?.children?.find((route) => route.path === 'decano/infraestructura');
    expect(heredada?.redirectTo).toBe('decano/areas');
    expect(heredada?.loadComponent).toBeUndefined();
  });

  describe('configuracion unificada del administrador', () => {
    const appChildren = () => routes.find((route) => route.path === 'app')?.children ?? [];

    it('/app/admin/configuracion existe, exige sesion y autoriza solo al administrador', () => {
      const cfg = appChildren().find((route) => route.path === 'admin/configuracion');
      expect(cfg).toBeDefined();
      expect(cfg?.canActivate?.length).toBeGreaterThan(0);
      const roles = cfg?.data?.['roles'] as string[];
      expect(roles).toContain('ADMINISTRADOR');
      for (const role of ['DOCENTE', 'ESTUDIANTE', 'COORDINADOR', 'DECANO']) {
        expect(roles).not.toContain(role);
      }
    });

    const antiguas: Array<[string, string]> = [
      ['admin/catalogos', 'catalogos'],
      ['admin/estados', 'estados'],
      ['admin/mensajes', 'mensajes'],
      ['admin/festivos', 'festivos'],
      ['admin/correos', 'correo'],
      ['admin/areas', 'areas'],
      ['admin/instituciones', 'instituciones'],
    ];
    for (const [ruta, tab] of antiguas) {
      it(`${ruta} redirige a /app/admin/configuracion/${tab}`, () => {
        const ruta$ = appChildren().find((route) => route.path === ruta);
        expect(ruta$?.loadComponent).toBeUndefined();
        expect(ruta$?.redirectTo).toBe(`admin/configuracion/${tab}`);
      });
    }

    it('/app/admin/configuracion carga sus rutas hijas de forma diferida', () => {
      const cfg = appChildren().find((route) => route.path === 'admin/configuracion');
      expect(cfg?.loadChildren).toBeDefined();
      expect(cfg?.loadComponent).toBeUndefined();
    });

    it('admin/sistema se conserva para las operaciones (auditoria y cierre masivo)', () => {
      expect(appChildren().some((route) => route.path === 'admin/sistema')).toBeTrue();
    });
  });
});
