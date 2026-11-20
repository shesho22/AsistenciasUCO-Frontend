import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { EstudiantePortalCacheService } from './estudiante-portal-cache.service';

describe('EstudiantePortalCacheService (PERF-EST-MM)', () => {
  let cache: EstudiantePortalCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    cache = TestBed.inject(EstudiantePortalCacheService);
  });

  function recolectar<T>(fuente: import('rxjs').Observable<T>): { valores: T[]; error: unknown } {
    const resultado: { valores: T[]; error: unknown } = { valores: [], error: undefined };
    fuente.subscribe({ next: (v) => resultado.valores.push(v), error: (e) => (resultado.error = e) });
    return resultado;
  }

  it('sin dato guardado emite solo la consulta y la guarda', () => {
    const r = recolectar(cache.obtener('k', of(1)));
    expect(r.valores).toEqual([1]);
    expect(cache.tiene('k')).toBeTrue();
  });

  it('sin dato guardado propaga el error de la consulta', () => {
    const r = recolectar(cache.obtener<number>('k', throwError(() => new Error('falla'))));
    expect(r.valores).toEqual([]);
    expect((r.error as Error).message).toBe('falla');
    expect(cache.tiene('k')).toBeFalse();
  });

  it('con dato guardado emite primero el guardado y luego el revalidado, que reemplaza al anterior', () => {
    recolectar(cache.obtener('k', of('viejo')));
    const consulta = new Subject<string>();
    const r = recolectar(cache.obtener('k', consulta));
    expect(r.valores).toEqual(['viejo']);
    consulta.next('nuevo');
    consulta.complete();
    expect(r.valores).toEqual(['viejo', 'nuevo']);
    expect(recolectar(cache.obtener('k', new Subject<string>())).valores).toEqual(['nuevo']);
  });

  it('si la revalidación falla conserva el dato guardado y no propaga el error', () => {
    recolectar(cache.obtener('k', of('guardado')));
    const r = recolectar(cache.obtener<string>('k', throwError(() => new Error('red'))));
    expect(r.valores).toEqual(['guardado']);
    expect(r.error).toBeUndefined();
  });

  it('invalidarSesiones descarta todas las páginas guardadas de esa materia y conserva las demás', () => {
    const a1 = EstudiantePortalCacheService.claveSesiones('mat-a', 'g1', 10);
    const a2 = EstudiantePortalCacheService.claveSesiones('mat-a', 'g2', 15);
    const b1 = EstudiantePortalCacheService.claveSesiones('mat-b', 'g1', 10);
    [a1, a2, b1].forEach((clave) => recolectar(cache.obtener(clave, of(clave))));
    cache.invalidarSesiones('mat-a');
    expect(cache.tiene(a1)).toBeFalse();
    expect(cache.tiene(a2)).toBeFalse();
    expect(cache.tiene(b1)).toBeTrue();
  });

  it('invalidarMaterias descarta materias y resumen', () => {
    recolectar(cache.obtener(EstudiantePortalCacheService.CLAVE_MATERIAS, of([])));
    recolectar(cache.obtener(EstudiantePortalCacheService.CLAVE_RESUMEN, of(null)));
    cache.invalidarMaterias();
    expect(cache.tiene(EstudiantePortalCacheService.CLAVE_MATERIAS)).toBeFalse();
    expect(cache.tiene(EstudiantePortalCacheService.CLAVE_RESUMEN)).toBeFalse();
  });

  it('asegurarPropietario vacía la caché al cambiar de usuario o al cerrar sesión, no con el mismo usuario', () => {
    cache.asegurarPropietario('u1');
    recolectar(cache.obtener('k', of(1)));
    cache.asegurarPropietario('u1');
    expect(cache.tiene('k')).toBeTrue();
    cache.asegurarPropietario('u2');
    expect(cache.tiene('k')).toBeFalse();
    recolectar(cache.obtener('k', of(2)));
    cache.asegurarPropietario(null);
    expect(cache.tiene('k')).toBeFalse();
  });
});
