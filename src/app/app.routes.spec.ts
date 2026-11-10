import { TestBed } from '@angular/core/testing';
import { Router, Routes, provideRouter } from '@angular/router';
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

  describe('CULM-001 simplificación del decano y del coordinador', () => {
    const hijas = () => routes.find((route) => route.path === 'app')?.children ?? [];
    const ruta = (path: string) => hijas().find((route) => route.path === path);

    for (const dest of ['decano/mi-facultad', 'decano/seguimiento', 'decano/directorio']) {
      it(`${dest} exige sesión, autoriza solo al DECANO y carga de forma diferida`, () => {
        const r = ruta(dest);
        expect(r?.canActivate?.length).toBeGreaterThan(0);
        expect(r?.data?.['roles']).toEqual(['DECANO']);
        expect(r?.loadChildren !== undefined || (r?.children?.length ?? 0) > 0).toBeTrue();
      });
    }

    for (const dest of ['coordinador/programa', 'coordinador/asistencia']) {
      it(`${dest} autoriza solo al COORDINADOR`, () => {
        const r = ruta(dest);
        expect(r?.canActivate?.length).toBeGreaterThan(0);
        expect(r?.data?.['roles']).toEqual(['COORDINADOR']);
      });
    }

    const decanoAntiguas: Array<[string, string]> = [
      ['decano/facultad', 'decano/mi-facultad/programas'],
      ['decano/estructura', 'decano/mi-facultad/programas'],
      ['decano/programas', 'decano/mi-facultad/programas'],
      ['decano/coordinadores', 'decano/mi-facultad/coordinadores'],
      ['decano/areas', 'decano/mi-facultad/areas'],
      ['decano/infraestructura', 'decano/mi-facultad/areas'],
      ['decano/indicadores', 'decano/seguimiento/indicadores'],
      ['decano/consolidado-asistencia', 'decano/seguimiento/consolidado'],
      ['decano/cronograma', 'decano/seguimiento/cronograma'],
      ['decano/docentes', 'decano/directorio/docentes'],
      ['decano/estudiantes', 'decano/directorio/estudiantes'],
      ['decano/asignaturas', 'decano/directorio/asignaturas'],
      ['decano/grupos', 'decano/directorio/grupos'],
    ];
    const coordinadorAntiguas: Array<[string, string]> = [
      ['coordinador/grupos', 'coordinador/programa/grupos'],
      ['coordinador/materias', 'coordinador/programa/materias'],
      ['coordinador/docentes', 'coordinador/programa/docentes'],
      ['coordinador/periodos', 'coordinador/programa/periodos'],
      ['coordinador/asistencias', 'coordinador/asistencia'],
      ['coordinador/consolidado-asistencia', 'coordinador/asistencia'],
      ['coordinador/indicadores', 'coordinador/asistencia'],
    ];
    for (const [antigua, destino] of [...decanoAntiguas, ...coordinadorAntiguas]) {
      it(`${antigua} solo redirige a ${destino}`, () => {
        const r = ruta(antigua);
        expect(r?.redirectTo).toBe(destino);
        expect(r?.pathMatch).toBe('full');
        expect(r?.loadComponent).toBeUndefined();
      });
    }

    it('las rutas que conviven con los nuevos destinos se mantienen: periodos, revisiones, mallas y detalle de grupo', () => {
      for (const path of ['decano/periodos', 'decano/revisiones-cancelacion', 'decano/programas/:planId', 'decano/grupos/:grupoId',
        'coordinador/estudiantes', 'coordinador/planes-estudio', 'coordinador/planes-estudio/nuevo', 'coordinador/revisiones-cancelacion']) {
        expect(ruta(path)).withContext(path).toBeDefined();
        expect(ruta(path)?.redirectTo).withContext(path).toBeUndefined();
      }
    });

    it('cada destino de redirección apunta a una ruta real (sin redirecciones encadenadas ni rotas)', () => {
      const reales = new Set(hijas().filter((r) => !r.redirectTo).map((r) => r.path));
      for (const [, destino] of [...decanoAntiguas, ...coordinadorAntiguas]) {
        const raiz = destino.split('/').slice(0, 2).join('/');
        expect(reales.has(raiz) || reales.has(destino)).withContext(destino).toBeTrue();
      }
    });

    it('Directorio resuelve :entidad y redirige la raíz a docentes', () => {
      const directorio = ruta('decano/directorio');
      expect(directorio?.children?.find((r) => r.path === '')?.redirectTo).toBe('docentes');
      expect(directorio?.children?.some((r) => r.path === ':entidad' && r.loadComponent)).toBeTrue();
    });

    it('las rutas hijas de Mi facultad, Seguimiento y Programa declaran su pestaña y cargan un componente real', async () => {
      const { MI_FACULTAD_ROUTES, SEGUIMIENTO_ROUTES, TABS_MI_FACULTAD, TABS_SEGUIMIENTO } = await import('./features/dean/dean.routes');
      const { PROGRAMA_ROUTES, TABS_PROGRAMA } = await import('./features/coordinator/coordinator.routes');
      const casos: Array<[Routes, readonly { id: string }[], string]> = [
        [MI_FACULTAD_ROUTES, TABS_MI_FACULTAD, 'programas'],
        [SEGUIMIENTO_ROUTES, TABS_SEGUIMIENTO, 'indicadores'],
        [PROGRAMA_ROUTES, TABS_PROGRAMA, 'grupos'],
      ];
      for (const [rutas, tabs, porDefecto] of casos) {
        const hijasShell = rutas[0].children ?? [];
        expect(hijasShell.find((r) => r.path === '')?.redirectTo).toBe(porDefecto);
        const conTab = hijasShell.filter((r) => r.data?.['tab']);
        expect(conTab.map((r) => r.path)).toEqual(tabs.map((t) => t.id));
        for (const r of conTab) {
          expect(r.data?.['tab']).toBe(r.path);
          expect(await (r.loadComponent as () => Promise<unknown>)()).toBeTruthy();
        }
        expect(rutas[0].data?.['tabs']).toBe(tabs);
      }
    });

    it('el consolidado del decano se abre como decano y las pestañas hijas ocultan su título', async () => {
      const { SEGUIMIENTO_ROUTES, MI_FACULTAD_ROUTES } = await import('./features/dean/dean.routes');
      const consolidado = SEGUIMIENTO_ROUTES[0].children?.find((r) => r.path === 'consolidado');
      expect(consolidado?.data?.['comoDecano']).toBeTrue();
      for (const r of [...(SEGUIMIENTO_ROUTES[0].children ?? []), ...(MI_FACULTAD_ROUTES[0].children ?? [])].filter(
        (x) => x.data?.['tab'] && x.path !== 'programas'
      )) {
        expect(r.data?.['embebido']).withContext(String(r.path)).toBeTrue();
      }
    });
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
