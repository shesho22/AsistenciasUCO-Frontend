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

  it('CIERRE-W1B: el directorio de docentes del administrador responde como el del decano, con nombres separados', () => {
    const admin = respuestaConsultasTransversales(get('/api/v1/admin/docentes'), '/api/v1/admin/docentes');
    expect(admin?.total).toBe(2);
    expect(admin?.esPaginada).toBeTrue();
    const primero = (admin?.datos as { primerNombre: string; apellidos: string; codigoTipoIdentificacion: string }[])[0];
    expect(primero.primerNombre).toBe('María');
    expect(primero.apellidos).toBe('Rostagno');
    expect(primero.codigoTipoIdentificacion).toBe('CC');
    expect(respuestaConsultasTransversales(get('/api/v1/admin/docentes', 'cardona'), '/api/v1/admin/docentes')?.total).toBe(1);
    expect(respuestaConsultasTransversales(get('/api/v1/admin/docentes', 'zzz'), '/api/v1/admin/docentes')?.total).toBe(0);
  });

  it('CIERRE-W1B: respeta el filtro estaActivo de los directorios', () => {
    const inactivos = new HttpRequest('GET', '/api/v1/decano/docentes', { params: new HttpParams().set('estaActivo', 'false') });
    expect(respuestaConsultasTransversales(inactivos, '/api/v1/decano/docentes')?.total).toBe(0);
    const activos = new HttpRequest('GET', '/api/v1/decano/docentes', { params: new HttpParams().set('estaActivo', 'true') });
    expect(respuestaConsultasTransversales(activos, '/api/v1/decano/docentes')?.total).toBe(2);
  });

  it('simula el historial con el estudiante pedido', () => {
    const url = '/api/v1/admin/estudiantes/EST-9/historial';
    const respuesta = respuestaConsultasTransversales(get(url), url);
    expect((respuesta?.datos as { idEstudiante: string }).idEstudiante).toBe('EST-9');
  });

  it('CIERRE-W2A: las opciones del consolidado son las del ámbito completo, sin repetir y ordenadas por nombre', () => {
    const url = '/api/v1/coordinador/consolidado-asistencia/opciones';
    const opciones = respuestaConsultasTransversales(get(url), url)?.datos as { asignaturas: { id: string; nombre: string }[]; docentes: { id: string; nombre: string }[] };
    expect(opciones.asignaturas.length).toBeGreaterThan(0);
    expect(opciones.asignaturas.map((a) => a.nombre)).toEqual([...opciones.asignaturas.map((a) => a.nombre)].sort((a, b) => a.localeCompare(b, 'es')));
    expect(new Set(opciones.asignaturas.map((a) => a.id)).size).toBe(opciones.asignaturas.length);
    expect(new Set(opciones.docentes.map((d) => d.id)).size).toBe(opciones.docentes.length);
    // El decano usa el mismo simulador
    expect(respuestaConsultasTransversales(get('/api/v1/decano/consolidado-asistencia/opciones'), '/api/v1/decano/consolidado-asistencia/opciones')?.datos).toBeTruthy();
  });

  it('CIERRE-W2A: un período sin grupos no tiene opciones', () => {
    const url = '/api/v1/coordinador/consolidado-asistencia/opciones';
    const req = new HttpRequest('GET', url, { params: new HttpParams().set('idPeriodoAcademico', 'PER-INEXISTENTE') });
    const opciones = respuestaConsultasTransversales(req, url)?.datos as { asignaturas: unknown[]; docentes: unknown[] };
    expect(opciones.asignaturas).toEqual([]);
    expect(opciones.docentes).toEqual([]);
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

    const categorias = '/api/v1/categorias-justificacion';
    expect(respuestaConsultasTransversales(get(categorias), categorias)?.total).toBe(6);

    const componentes = '/api/v1/coordinador/componentes-formacion';
    expect(respuestaConsultasTransversales(get(componentes), componentes)?.total).toBe(4); // BAS, ESP, INS y ELE (COMP-ELE)
  });

  it('no responde otras rutas ni otros métodos', () => {
    expect(respuestaConsultasTransversales(get('/api/v1/decano/estudiantes/EST-1'), '/api/v1/decano/estudiantes/EST-1')).toBeNull();
    const post = new HttpRequest('POST', '/api/v1/decano/docentes', {});
    expect(respuestaConsultasTransversales(post, '/api/v1/decano/docentes')).toBeNull();
  });
});
