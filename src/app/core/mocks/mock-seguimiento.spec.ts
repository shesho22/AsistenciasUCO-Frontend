import { HttpParams, HttpRequest } from '@angular/common/http';
import { respuestaSeguimiento } from './mock-seguimiento';

const get = (url: string, params = new HttpParams()) => new HttpRequest('GET', url, { params });

describe('respuestaSeguimiento (simulador de alertas, comparativa y aforo)', () => {
  it('atiende las alertas tempranas con filtro de semaforo y de nombre', () => {
    const todas = respuestaSeguimiento(get('/api/v1/coordinador/alertas-tempranas'), '/api/v1/coordinador/alertas-tempranas');
    expect(todas?.esPaginada).toBeTrue();
    expect(todas?.total).toBe(2);
    const rojas = respuestaSeguimiento(get('/x', new HttpParams().set('semaforo', 'ROJO')), '/api/v1/coordinador/alertas-tempranas?semaforo=ROJO');
    expect(rojas?.total).toBe(1);
    const porNombre = respuestaSeguimiento(get('/x', new HttpParams().set('nombre', 'luis')), '/api/v1/coordinador/alertas-tempranas');
    expect(porNombre?.total).toBe(1);
  });

  it('atiende la comparativa de programas sin paginar', () => {
    const r = respuestaSeguimiento(get('/x'), '/api/v1/decano/comparativa-programas');
    expect(r?.esPaginada).toBeFalsy();
    expect((r?.datos as unknown[]).length).toBe(2);
  });

  it('atiende el aforo de grupos y lo filtra por programa', () => {
    expect(respuestaSeguimiento(get('/x'), '/api/v1/decano/aforo-grupos')?.total).toBe(2);
    expect(respuestaSeguimiento(get('/x', new HttpParams().set('idPrograma', 'PRG-2')), '/api/v1/decano/aforo-grupos')?.total).toBe(1);
  });

  it('no atiende otras rutas ni otros metodos', () => {
    expect(respuestaSeguimiento(get('/x'), '/api/v1/decano/indicadores')).toBeNull();
    expect(respuestaSeguimiento(new HttpRequest('POST', '/x', {}), '/api/v1/decano/aforo-grupos')).toBeNull();
  });
});
