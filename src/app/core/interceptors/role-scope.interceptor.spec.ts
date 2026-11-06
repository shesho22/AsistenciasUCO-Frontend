import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import {
  ROLE_SCOPE_RULES,
  rolPuedeLeer,
  rolPuedeLeerRuta,
  roleScopeInterceptor,
} from './role-scope.interceptor';
import { AuthService } from '../services/auth.service';
import { User, UserRole } from '../models/user.model';
import { environment } from '../../../environments/environment';

describe('roleScopeInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  const usuario = signal<User | null>(null);

  function como(role: UserRole | null): void {
    usuario.set(role ? ({ id: 'u', role } as User) : null);
  }

  beforeEach(() => {
    usuario.set(null);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([roleScopeInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: usuario } },
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  function estado(url: string): Promise<number> {
    return new Promise((resolve) => http.get(url).subscribe({ next: () => resolve(200), error: (e) => resolve(e.status) }));
  }

  it('un Decano no hace GET a recursos exclusivos de /admin, /coordinador, /docente ni /docentes: 403 local sin tocar la red', async () => {
    como('DECANO');
    for (const ruta of [
      'admin/facultades',
      'admin/espacios-fisicos',
      'admin/sedes',
      'admin/parametros',
      'admin/auditoria',
      'coordinador/estudiantes',
      'docente/horarios',
      'docentes',
    ]) {
      expect(await estado(`${environment.apiUrl}/${ruta}`)).toBe(403);
    }
    ctrl.expectNone(() => true);
  });

  // AUTH-03/AUTH-04/INT-05: SecurityConfig y access-catalog.json conceden estas LECTURAS al DECANO (y al COORDINADOR en
  // los catalogos). El interceptor las cortaba con un 403 local que parecia del servidor y nunca llegaba al backend.
  it('un Decano SI envia al backend las lecturas que SecurityConfig le concede (areas, planes, periodos, asignaturas)', () => {
    como('DECANO');
    const rutas = [
      'admin/areas',
      'admin/areas/abc',
      'coordinador/planes-estudio',
      'coordinador/planes-estudio/abc/asignaturas',
      'coordinador/periodos-academicos',
      'coordinador/asignaturas',
    ];
    for (const ruta of rutas) {
      http.get(`${environment.apiUrl}/${ruta}`).subscribe();
    }
    for (const ruta of rutas) {
      ctrl.expectOne(`${environment.apiUrl}/${ruta}`).flush({});
    }
  });

  it('un Coordinador SI envia admin/areas, pero no admin/sedes (retirada) ni admin/facultades', async () => {
    como('COORDINADOR');
    http.get(`${environment.apiUrl}/admin/areas`).subscribe();
    ctrl.expectOne(`${environment.apiUrl}/admin/areas`).flush({});
    expect(await estado(`${environment.apiUrl}/admin/facultades`)).toBe(403);
    expect(await estado(`${environment.apiUrl}/admin/sedes`)).toBe(403);
    ctrl.expectNone(() => true);
  });

  it('un Docente y un Estudiante siguen cortados en admin/areas y coordinador/periodos-academicos', async () => {
    for (const rol of ['DOCENTE', 'ESTUDIANTE'] as UserRole[]) {
      como(rol);
      expect(await estado(`${environment.apiUrl}/admin/areas`)).toBe(403);
      expect(await estado(`${environment.apiUrl}/coordinador/periodos-academicos`)).toBe(403);
    }
    ctrl.expectNone(() => true);
  });

  it('un Decano si consulta sus propios endpoints y los catalogos generales', () => {
    como('DECANO');
    http.get(`${environment.apiUrl}/decano/programas`).subscribe();
    http.get(`${environment.apiUrl}/tipos-programa`).subscribe();
    ctrl.expectOne(`${environment.apiUrl}/decano/programas`).flush({});
    ctrl.expectOne(`${environment.apiUrl}/tipos-programa`).flush([]);
  });

  it('las escrituras nunca se interceptan: las rechaza el backend', () => {
    como('DECANO');
    http.post(`${environment.apiUrl}/admin/facultades`, {}).subscribe({ error: () => undefined });
    ctrl.expectOne(`${environment.apiUrl}/admin/facultades`).flush({}, { status: 403, statusText: 'Forbidden' });
  });

  it('sin sesion o fuera del API v1 la peticion pasa sin cambios', () => {
    como(null);
    http.get(`${environment.apiUrl}/admin/areas`).subscribe({ error: () => undefined });
    http.get('http://otro-host.test/api/v1/admin/areas').subscribe({ error: () => undefined });
    http.get('/assets/config.json').subscribe();
    ctrl.expectOne(`${environment.apiUrl}/admin/areas`).flush({});
    ctrl.expectOne('http://otro-host.test/api/v1/admin/areas').flush({});
    ctrl.expectOne('/assets/config.json').flush({});
  });

  it('un segmento sin regla (p. ej. grupos, sesiones) pasa para cualquier rol', () => {
    como('ESTUDIANTE');
    http.get(`${environment.apiUrl}/grupos/x/estudiantes`).subscribe();
    ctrl.expectOne(`${environment.apiUrl}/grupos/x/estudiantes`).flush([]);
  });

  describe('matriz rol x prefijo (espejo de SecurityConfig)', () => {
    const esperado: Record<string, UserRole[]> = {
      admin: ['ADMINISTRADOR'],
      decano: ['DECANO', 'ADMINISTRADOR'],
      coordinador: ['COORDINADOR', 'ADMINISTRADOR'],
      docente: ['DOCENTE'],
      docentes: ['COORDINADOR', 'ADMINISTRADOR'],
      estudiante: ['ESTUDIANTE'],
      estudiantes: ['DOCENTE', 'COORDINADOR', 'ADMINISTRADOR'],
    };
    const roles: UserRole[] = ['ADMINISTRADOR', 'DECANO', 'COORDINADOR', 'DOCENTE', 'ESTUDIANTE'];

    it('cubre exactamente los prefijos esperados', () => {
      expect(ROLE_SCOPE_RULES.map((r) => r.prefix).sort()).toEqual(Object.keys(esperado).sort());
    });

    for (const prefijo of Object.keys(esperado)) {
      for (const rol of roles) {
        it(`${rol} ${esperado[prefijo].includes(rol) ? 'puede' : 'no puede'} leer /${prefijo}`, () => {
          expect(rolPuedeLeer(rol, prefijo)).toBe(esperado[prefijo].includes(rol));
        });
      }
    }

    it('ADMIN (alias legado) se trata como ADMINISTRADOR', () => {
      expect(rolPuedeLeer('ADMIN', 'admin')).toBeTrue();
    });
  });

  describe('excepciones de lectura (espejo de SecurityConfig)', () => {
    const decano: UserRole = 'DECANO';
    it('rolPuedeLeerRuta concede solo las subrutas de la excepcion', () => {
      expect(rolPuedeLeerRuta(decano, 'admin', 'sedes')).toBeFalse();
      expect(rolPuedeLeerRuta(decano, 'admin', 'areas')).toBeTrue();
      expect(rolPuedeLeerRuta(decano, 'admin', 'facultades')).toBeFalse();
      expect(rolPuedeLeerRuta(decano, 'admin', null)).toBeFalse();
      expect(rolPuedeLeerRuta(decano, 'coordinador', 'periodos-academicos')).toBeTrue();
      expect(rolPuedeLeerRuta(decano, 'coordinador', 'planes-estudio')).toBeTrue();
      expect(rolPuedeLeerRuta(decano, 'coordinador', 'asignaturas')).toBeTrue();
      expect(rolPuedeLeerRuta(decano, 'coordinador', 'docentes')).toBeFalse();
    });

    it('DOCENTE y ESTUDIANTE no reciben ninguna excepcion; ADMINISTRADOR conserva su acceso', () => {
      for (const rol of ['DOCENTE', 'ESTUDIANTE'] as UserRole[]) {
        expect(rolPuedeLeerRuta(rol, 'admin', 'sedes')).toBeFalse();
        expect(rolPuedeLeerRuta(rol, 'coordinador', 'planes-estudio')).toBeFalse();
      }
      expect(rolPuedeLeerRuta('ADMINISTRADOR', 'admin', 'facultades')).toBeTrue();
    });
  });

  it('rolPuedeLeer con varios roles permite el prefijo si alguno lo puede usar', () => {
    expect(rolPuedeLeer(['ESTUDIANTE', 'DOCENTE'], 'docente')).toBeTrue();
    expect(rolPuedeLeer(['ESTUDIANTE', 'DOCENTE'], 'admin')).toBeFalse();
    expect(rolPuedeLeer(['ESTUDIANTE'], 'auth')).toBeTrue();
  });
});
