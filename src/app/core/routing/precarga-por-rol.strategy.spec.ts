import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Route } from '@angular/router';
import { of } from 'rxjs';
import { ESPERA_MAXIMA_OCIO_MS, PrecargaPorRolStrategy, cuandoEsteDesocupado } from './precarga-por-rol.strategy';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

describe('PrecargaPorRolStrategy', () => {
  const usuario = signal<User | null>(null);
  let estrategia: PrecargaPorRolStrategy;
  let cargar: jasmine.Spy<() => ReturnType<typeof of>>;

  const docente = { id: 'u-1', name: 'María', email: 'm@uco.edu.co', role: 'DOCENTE', roles: ['DOCENTE', 'COORDINADOR'] } as unknown as User;
  const ruta = (roles?: string[], precargar = false): Route => ({
    path: 'x',
    data: { ...(roles ? { roles } : {}), ...(precargar ? { precargar: true } : {}) },
  });

  /** Ejecuta la precarga y avanza el reloj lo suficiente para que el navegador "quede desocupado". */
  const precargar = (route: Route): unknown[] => {
    const emitidos: unknown[] = [];
    estrategia.preload(route, cargar).subscribe((valor) => emitidos.push(valor));
    tick(ESPERA_MAXIMA_OCIO_MS + 50);
    return emitidos;
  };

  beforeEach(() => {
    // El ocio real del navegador no lo controla fakeAsync: se simula con un temporizador que sí avanza con tick().
    spyOn(window, 'requestIdleCallback').and.callFake(((avisar: IdleRequestCallback) =>
      setTimeout(() => avisar({} as IdleDeadline), 10) as unknown as number) as typeof window.requestIdleCallback);
    spyOn(window, 'cancelIdleCallback').and.callFake((id: number) => clearTimeout(id));
    usuario.set(null);
    cargar = jasmine.createSpy('load').and.returnValue(of('modulo'));
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: { currentUser: usuario } }] });
    estrategia = TestBed.inject(PrecargaPorRolStrategy);
  });

  it('sin sesión no precarga nada', fakeAsync(() => {
    expect(precargar(ruta())).toEqual([]);
    expect(precargar(ruta(['DOCENTE'], true))).toEqual([]);
    expect(cargar).not.toHaveBeenCalled();
  }));

  it('con sesión no descarga rutas si no están marcadas para precargar', fakeAsync(() => {
    usuario.set(docente);
    expect(precargar(ruta(['DOCENTE']))).toEqual([]);
    expect(precargar(ruta())).toEqual([]);
    expect(cargar).not.toHaveBeenCalled();
  }));

  it('precarga en ocio las rutas marcadas para cualquiera de los roles efectivos', fakeAsync(() => {
    usuario.set(docente);
    expect(precargar(ruta(['DOCENTE'], true))).toEqual(['modulo']);
    expect(precargar(ruta(['COORDINADOR', 'DECANO'], true))).toEqual(['modulo']);
    expect(cargar).toHaveBeenCalledTimes(2);
  }));

  it('nunca descarga las pantallas de otros roles', fakeAsync(() => {
    usuario.set(docente);
    expect(precargar(ruta(['ESTUDIANTE'], true))).toEqual([]);
    expect(precargar(ruta(['ADMINISTRADOR', 'DECANO'], true))).toEqual([]);
    expect(cargar).not.toHaveBeenCalled();
  }));

  it('requiere la marca explícita también en rutas sin roles', fakeAsync(() => {
    usuario.set(docente);
    expect(precargar(ruta(undefined, true))).toEqual(['modulo']);
    expect(precargar(ruta([], true))).toEqual(['modulo']);
  }));

  it('espera a que el navegador esté desocupado antes de descargar', fakeAsync(() => {
    usuario.set(docente);
    estrategia.preload(ruta(['DOCENTE'], true), cargar).subscribe();
    expect(cargar).not.toHaveBeenCalled();
    tick(ESPERA_MAXIMA_OCIO_MS + 50);
    expect(cargar).toHaveBeenCalledTimes(1);
  }));

  describe('cuandoEsteDesocupado', () => {
    it('sin requestIdleCallback avisa en la siguiente vuelta del bucle y se puede cancelar', fakeAsync(() => {
      const original = window.requestIdleCallback;
      (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback = undefined;
      // El espía del beforeEach se restaura al final de la prueba; aquí se quita la función para cubrir el respaldo.
      try {
        let avisos = 0;
        cuandoEsteDesocupado().subscribe(() => avisos++);
        expect(avisos).toBe(0);
        tick(0);
        expect(avisos).toBe(1);

        const sub = cuandoEsteDesocupado().subscribe(() => avisos++);
        sub.unsubscribe();
        tick(10);
        expect(avisos).toBe(1);
      } finally {
        window.requestIdleCallback = original;
      }
    }));

    it('con requestIdleCallback pide el tiempo máximo de espera y cancela al desuscribirse', () => {
      const pedir = (window.requestIdleCallback as jasmine.Spy).and.returnValue(7);
      const cancelar = (window.cancelIdleCallback as jasmine.Spy).and.stub();
      const sub = cuandoEsteDesocupado().subscribe();
      expect(pedir).toHaveBeenCalledWith(jasmine.any(Function), { timeout: ESPERA_MAXIMA_OCIO_MS });
      sub.unsubscribe();
      expect(cancelar).toHaveBeenCalledWith(7);
    });
  });
});
