import { TestBed } from '@angular/core/testing';
import { ComponentesExternosService } from './componentes-externos.service';

describe('ComponentesExternosService (F3-ADM-07)', () => {
  let original: unknown;

  beforeEach(() => {
    original = (window as unknown as { env?: unknown }).env;
  });

  afterEach(() => {
    (window as unknown as { env?: unknown }).env = original;
  });

  function crear(provider?: string): ComponentesExternosService {
    (window as unknown as { env: Record<string, string> }).env = provider ? { SECURITY_PROVIDER: provider } : {};
    TestBed.resetTestingModule();
    return TestBed.inject(ComponentesExternosService);
  }

  it('con la bandera de entorno apagada (proveedor legacy) ni seguridad ni mensajes estan disponibles', () => {
    const servicio = crear('legacy');
    expect(servicio.disponible('seguridad')).toBeFalse();
    expect(servicio.disponible('mensajes')).toBeFalse();
  });

  it('sin proveedor configurado se comporta como baseline (SEG-12)', () => {
    expect(crear().disponible('seguridad')).toBeTrue();
  });

  it('con el proveedor baseline ambos componentes estan disponibles', () => {
    const servicio = crear('baseline');
    expect(servicio.disponible('seguridad')).toBeTrue();
    expect(servicio.disponible('mensajes')).toBeTrue();
  });

  it('marcar un componente como no disponible solo oculta ese componente y se puede revertir', () => {
    const servicio = crear('baseline');
    servicio.marcarNoDisponible('seguridad');
    expect(servicio.disponible('seguridad')).toBeFalse();
    expect(servicio.disponible('mensajes')).toBeTrue();
    servicio.marcarDisponible('seguridad');
    expect(servicio.disponible('seguridad')).toBeTrue();
  });

  it('marcar dos veces el mismo estado no cambia el resultado', () => {
    const servicio = crear('baseline');
    servicio.marcarDisponible('mensajes');
    servicio.marcarNoDisponible('mensajes');
    servicio.marcarNoDisponible('mensajes');
    expect(servicio.disponible('mensajes')).toBeFalse();
  });
});
