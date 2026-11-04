import { HttpParams, HttpRequest } from '@angular/common/http';
import { respuestaConsultasTransversales } from './mock-consultas-transversales';

function get(url: string, busqueda?: string): HttpRequest<unknown> {
  const params = busqueda ? new HttpParams().set('busqueda', busqueda) : new HttpParams();
  return new HttpRequest('GET', url, { params });
}

describe('respuestaConsultasTransversales (mock HU112/HU128/HU143/HU157)', () => {
  it('simula programas y créditos, docentes, asignaturas y estudiantes con búsqueda', () => {
    expect(respuestaConsultasTransversales(get('/api/v1/decano/programas-creditos'), '/api/v1/decano/programas-creditos')?.total).toBe(2);
    expect(respuestaConsultasTransversales(get('/api/v1/decano/docentes', 'maría'), '/api/v1/decano/docentes')?.total).toBe(1);
    expect(respuestaConsultasTransversales(get('/api/v1/admin/asignaturas', 'sis-201'), '/api/v1/admin/asignaturas')?.total).toBe(1);
    expect(respuestaConsultasTransversales(get('/api/v1/decano/asignaturas', 'zzz'), '/api/v1/decano/asignaturas')?.total).toBe(0);
    expect(respuestaConsultasTransversales(get('/api/v1/admin/estudiantes', '1017'), '/api/v1/admin/estudiantes')?.total).toBe(1);
  });

  it('simula el historial con el estudiante pedido', () => {
    const url = '/api/v1/admin/estudiantes/EST-9/historial';
    const respuesta = respuestaConsultasTransversales(get(url), url);
    expect((respuesta?.datos as { idEstudiante: string }).idEstudiante).toBe('EST-9');
  });

  it('simula el consolidado (HU061), la auditoría (HU172) y los componentes (HU147)', () => {
    const consolidado = '/api/v1/coordinador/consolidado-asistencia';
    expect(respuestaConsultasTransversales(get(consolidado), consolidado)?.total).toBe(2);
    const porMateria = new HttpRequest('GET', consolidado, { params: new HttpParams().set('idAsignatura', 'ASG-2') });
    expect(respuestaConsultasTransversales(porMateria, consolidado)?.total).toBe(1);

    const auditoria = '/api/v1/admin/auditoria';
    expect(respuestaConsultasTransversales(get(auditoria), auditoria)?.total).toBe(1);
    const todas = new HttpRequest('GET', auditoria, { params: new HttpParams().set('soloAsistencia', 'false') });
    expect(respuestaConsultasTransversales(todas, auditoria)?.total).toBe(2);

    const estados = '/api/v1/admin/estados';
    expect(respuestaConsultasTransversales(get(estados), estados)?.total).toBe(5);

    const componentes = '/api/v1/coordinador/componentes-formacion';
    expect(respuestaConsultasTransversales(get(componentes), componentes)?.total).toBe(3);
  });

  it('no responde otras rutas ni otros métodos', () => {
    expect(respuestaConsultasTransversales(get('/api/v1/decano/estudiantes/EST-1'), '/api/v1/decano/estudiantes/EST-1')).toBeNull();
    const post = new HttpRequest('POST', '/api/v1/decano/docentes', {});
    expect(respuestaConsultasTransversales(post, '/api/v1/decano/docentes')).toBeNull();
  });
});
