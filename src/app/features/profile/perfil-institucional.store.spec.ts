import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { PerfilInstitucionalStore } from './perfil-institucional.store';
import { PerfilService, PerfilUsuario } from '../../core/services/perfil.service';
import { ApiDataResponse } from '../../core/api/models/api-data-response.model';

const perfil = (extra: Partial<PerfilUsuario> = {}): PerfilUsuario => ({
  idUsuario: 'usr-1',
  codigoTipoIdentificacion: 'TI',
  nombreTipoIdentificacion: 'Tarjeta de identidad',
  numeroIdentificacion: 1001002003,
  primerNombre: 'Ana',
  segundoNombre: null,
  primerApellido: 'Pérez',
  segundoApellido: null,
  nombreCompleto: 'Ana Pérez',
  correo: 'ana@uco.edu.co',
  correoConfirmado: true,
  estaActivo: true,
  vinculos: [],
  ...extra,
});

/** APP-06: estado en memoria del perfil institucional (ST-01..ST-06). */
describe('PerfilInstitucionalStore (APP-06)', () => {
  let store: PerfilInstitucionalStore;
  let respuestas: Subject<ApiDataResponse<PerfilUsuario>>[];
  let consultar: jasmine.Spy;

  beforeEach(() => {
    respuestas = [];
    consultar = jasmine.createSpy('consultar').and.callFake(() => {
      const r = new Subject<ApiDataResponse<PerfilUsuario>>();
      respuestas.push(r);
      return r;
    });
    TestBed.configureTestingModule({
      providers: [PerfilInstitucionalStore, { provide: PerfilService, useValue: { consultar } }],
    });
    store = TestBed.inject(PerfilInstitucionalStore);
  });

  it('ST-01 no consulta hasta cargar() y muestra "Consultando…" mientras la consulta está activa', () => {
    expect(consultar).not.toHaveBeenCalled();
    store.cargar();
    expect(store.cargando()).toBeTrue();
    expect(store.identificacion().documento).toBe('Consultando…');
  });

  it('ST-02 conserva el tipo y número del contrato sin reformatearlos', () => {
    store.cargar();
    respuestas[0].next({ exitoso: true, datos: perfil() });

    expect(store.identificacion()).toEqual({
      documento: 'TI 1001002003',
      tipo: 'Tarjeta de identidad (TI)',
      numero: '1001002003',
    });
  });

  it('ST-03 un tipo sin nombre usa el código y un número sin tipo se muestra solo', () => {
    store.cargar();
    respuestas[0].next({ exitoso: true, datos: perfil({ nombreTipoIdentificacion: null, codigoTipoIdentificacion: null }) });

    expect(store.identificacion()).toEqual({ documento: '1001002003', tipo: 'Sin registrar', numero: '1001002003' });
  });

  it('ST-04 cargas repetidas no duplican el GET, ni en curso ni tras cargar', () => {
    store.cargar();
    store.cargar();
    respuestas[0].next({ exitoso: true, datos: perfil() });
    store.cargar();

    expect(consultar).toHaveBeenCalledTimes(1);
  });

  it('ST-05 tras un error, cargar() reintenta y conserva el código semántico', () => {
    store.cargar();
    respuestas[0].error(new HttpErrorResponse({ status: 403 }));
    expect(store.estado()).toEqual(jasmine.objectContaining({ tipo: 'ERROR', codigo: 'FORBIDDEN' }));
    expect(store.identificacion().numero).toBe('No disponible');

    store.cargar();
    expect(consultar).toHaveBeenCalledTimes(2);
  });

  it('ST-06 limpiar() cancela la consulta activa y descarta el perfil', () => {
    store.cargar();
    store.limpiar();
    expect(respuestas[0].observed).toBeFalse();
    expect(store.perfil()).toBeNull();

    store.cargar();
    respuestas[1].next({ exitoso: true, datos: perfil() });
    store.limpiar();
    expect(store.perfil()).toBeNull();
    expect(store.estado().tipo).toBe('INACTIVO');
  });
});
