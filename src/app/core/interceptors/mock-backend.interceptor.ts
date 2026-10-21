import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, delay, throwError } from 'rxjs';
import { mockStore } from '../mocks/mock-data-store';
import {
  mockHorariosToDto,
  mockMateriasToDto,
  mockSesionesToDto,
  mockUuid,
} from '../mocks/student-portal-mock.adapter';
import { ApiResponse } from '../models/api-response.model';
import { SolicitudMatriculaItem, PlanEstudioItem } from '../models/role-management.model';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

function okResponse<T>(datos: T, mensajeUsuario?: string, total?: number): HttpResponse<ApiResponse<T>> {
  return new HttpResponse<ApiResponse<T>>({
    status: 200,
    body: {
      idTransaccion: `mock-tx-${Date.now()}`,
      exitoso: true,
      mensajeUsuario,
      datos,
      total: total ?? (Array.isArray(datos) ? datos.length : undefined),
    },
  });
}

export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  // AuthService es la fuente reactiva de verdad y se consulta por petición,
  // incluyendo cambios de modo sin recargar la aplicación.
  const mockEnabled = inject(AuthService).isMockMode();
  if (!mockEnabled) {
    return next(req);
  }

  const url = req.url;
  const method = req.method;

  // ================= ADMIN: DECANOS =================
  if (url.endsWith('/admin/decanos') && method === 'GET') {
    return of(okResponse(mockStore.decanos)).pipe(delay(250));
  }
  if (url.endsWith('/admin/decanos') && method === 'POST') {
    const body = req.body as any;
    const nuevo = {
      ...body,
      id: `DEC-${mockStore.decanos.length + 1}`,
      fechaAsignacion: new Date().toISOString().slice(0, 10),
      estado: 'ACTIVO',
    };
    mockStore.decanos = [nuevo, ...mockStore.decanos];
    mockStore.registrarAuditoria({
      modulo: 'USUARIOS',
      accion: 'CREAR',
      descripcion: `Se registró al decano ${nuevo.nombres} ${nuevo.apellidos}`,
      nivel: 'INFO',
    });
    return of(okResponse(nuevo, 'Decano registrado exitosamente.')).pipe(delay(300));
  }
  if (url.includes('/admin/decanos/') && url.endsWith('/toggle') && method === 'PATCH') {
    const segments = url.split('/');
    const id = segments[segments.length - 2];
    const decano = mockStore.decanos.find((d) => d.id === id);
    if (decano) {
      decano.estado = decano.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
      mockStore.registrarAuditoria({
        modulo: 'USUARIOS',
        accion: 'ACTUALIZAR',
        descripcion: `Se cambió el estado del decano ${decano.nombres} a ${decano.estado}`,
        nivel: 'INFO',
      });
      return of(okResponse(decano, `Estado del decano actualizado a ${decano.estado}.`)).pipe(delay(200));
    }
  }

  // ================= ADMIN: SEDES =================
  if (url.endsWith('/admin/sedes') && method === 'GET') {
    return of(okResponse(mockStore.sedes)).pipe(delay(200));
  }
  if (url.endsWith('/admin/sedes') && method === 'POST') {
    const body = req.body as any;
    const nueva = { ...body, id: `SED-${mockStore.sedes.length + 1}`, estado: 'ACTIVO' };
    mockStore.sedes = [nueva, ...mockStore.sedes];
    mockStore.registrarAuditoria({
      modulo: 'SISTEMA',
      accion: 'CREAR',
      descripcion: `Se creó la sede ${nueva.nombre} (${nueva.codigo})`,
      nivel: 'INFO',
    });
    return of(okResponse(nueva, 'Sede creada con éxito.')).pipe(delay(250));
  }
  if (url.includes('/admin/sedes/') && method === 'PUT') {
    const id = url.split('/').pop()!;
    const body = req.body as any;
    mockStore.sedes = mockStore.sedes.map((s) => (s.id === id ? { ...s, ...body } : s));
    const actualizada = mockStore.sedes.find((s) => s.id === id);
    return of(okResponse(actualizada, 'Sede actualizada.')).pipe(delay(250));
  }
  if (url.includes('/admin/sedes/') && url.endsWith('/estado') && method === 'PATCH') {
    const segments = url.split('/');
    const id = segments[segments.length - 2];
    mockStore.sedes = mockStore.sedes.map((s) =>
      s.id === id ? { ...s, estado: s.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' } : s
    );
    const sede = mockStore.sedes.find((s) => s.id === id);
    return of(okResponse(sede, 'Estado de sede alternado.')).pipe(delay(200));
  }

  // ================= ADMIN: ESPACIOS FÍSICOS =================
  if (url.endsWith('/admin/espacios-fisicos') && method === 'GET') {
    return of(okResponse(mockStore.espaciosFisicos)).pipe(delay(200));
  }
  if (url.endsWith('/admin/espacios-fisicos') && method === 'POST') {
    const body = req.body as any;
    const sede = mockStore.sedes.find((s) => s.id === body.sedeId);
    const nuevo = {
      ...body,
      id: `ESP-${mockStore.espaciosFisicos.length + 1}`,
      sedeNombre: sede ? sede.nombre : body.sedeNombre,
      estado: 'DISPONIBLE',
    };
    mockStore.espaciosFisicos = [nuevo, ...mockStore.espaciosFisicos];
    return of(okResponse(nuevo, 'Espacio físico registrado.')).pipe(delay(250));
  }
  if (url.includes('/admin/espacios-fisicos/') && method === 'PUT') {
    const id = url.split('/').pop()!;
    const body = req.body as any;
    mockStore.espaciosFisicos = mockStore.espaciosFisicos.map((e) => (e.id === id ? { ...e, ...body } : e));
    const actualizado = mockStore.espaciosFisicos.find((e) => e.id === id);
    return of(okResponse(actualizado, 'Espacio físico actualizado.')).pipe(delay(250));
  }
  if (url.includes('/admin/espacios-fisicos/') && url.endsWith('/estado') && method === 'PATCH') {
    const segments = url.split('/');
    const id = segments[segments.length - 2];
    mockStore.espaciosFisicos = mockStore.espaciosFisicos.map((e) =>
      e.id === id ? { ...e, estado: e.estado === 'DISPONIBLE' ? 'INACTIVO' : 'DISPONIBLE' } : e
    );
    const espacio = mockStore.espaciosFisicos.find((e) => e.id === id);
    return of(okResponse(espacio, 'Estado de espacio alternado.')).pipe(delay(200));
  }

  // ================= ADMIN: FACULTADES =================
  if (url.endsWith('/admin/facultades') && method === 'GET') {
    return of(okResponse(mockStore.facultades)).pipe(delay(200));
  }
  if (url.endsWith('/admin/facultades') && method === 'POST') {
    const body = req.body as any;
    const nueva = { ...body, id: `FAC-${mockStore.facultades.length + 1}`, estado: 'ACTIVO' };
    mockStore.facultades = [nueva, ...mockStore.facultades];
    return of(okResponse(nueva, 'Facultad registrada exitosamente.')).pipe(delay(250));
  }
  if (url.includes('/admin/facultades/') && method === 'PUT') {
    const id = url.split('/').pop()!;
    const body = req.body as any;
    mockStore.facultades = mockStore.facultades.map((f) => (f.id === id ? { ...f, ...body } : f));
    const actualizada = mockStore.facultades.find((f) => f.id === id);
    return of(okResponse(actualizada, 'Facultad actualizada.')).pipe(delay(250));
  }
  if (url.includes('/admin/facultades/') && url.endsWith('/estado') && method === 'PATCH') {
    const segments = url.split('/');
    const id = segments[segments.length - 2];
    mockStore.facultades = mockStore.facultades.map((f) =>
      f.id === id ? { ...f, estado: f.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' } : f
    );
    const facultad = mockStore.facultades.find((f) => f.id === id);
    return of(okResponse(facultad, 'Estado de facultad alternado.')).pipe(delay(200));
  }

  // ================= ADMIN: ÁREAS DE CONOCIMIENTO =================
  if (url.endsWith('/admin/areas') && method === 'GET') {
    return of(okResponse(mockStore.areasConocimiento)).pipe(delay(200));
  }
  if (url.endsWith('/admin/areas') && method === 'POST') {
    const body = req.body as any;
    const fac = mockStore.facultades.find((f) => f.id === body.facultadId);
    const nueva = {
      ...body,
      id: `AREA-${mockStore.areasConocimiento.length + 1}`,
      facultadNombre: fac ? fac.nombre : body.facultadNombre,
      estado: 'ACTIVO',
    };
    mockStore.areasConocimiento = [nueva, ...mockStore.areasConocimiento];
    return of(okResponse(nueva, 'Área registrada exitosamente.')).pipe(delay(250));
  }
  if (url.includes('/admin/areas/') && method === 'PUT') {
    const id = url.split('/').pop()!;
    const body = req.body as any;
    mockStore.areasConocimiento = mockStore.areasConocimiento.map((a) => (a.id === id ? { ...a, ...body } : a));
    const actualizada = mockStore.areasConocimiento.find((a) => a.id === id);
    return of(okResponse(actualizada, 'Área actualizada.')).pipe(delay(250));
  }
  if (url.includes('/admin/areas/') && url.endsWith('/estado') && method === 'PATCH') {
    const segments = url.split('/');
    const id = segments[segments.length - 2];
    mockStore.areasConocimiento = mockStore.areasConocimiento.map((a) =>
      a.id === id ? { ...a, estado: a.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' } : a
    );
    const area = mockStore.areasConocimiento.find((a) => a.id === id);
    return of(okResponse(area, 'Estado de área alternado.')).pipe(delay(200));
  }

  // ================= ADMIN: PARÁMETROS, AUDITORÍA Y CIERRE MASIVO =================
  if (url.endsWith('/admin/parametros') && method === 'GET') {
    return of(okResponse(mockStore.parametros)).pipe(delay(150));
  }
  if (url.includes('/admin/parametros/') && method === 'PATCH') {
    const id = url.split('/').pop()!;
    const body = req.body as any;
    mockStore.parametros = mockStore.parametros.map((p) =>
      p.id === id ? { ...p, valor: body.valor, ultimaModificacion: new Date().toISOString().slice(0, 16) } : p
    );
    const param = mockStore.parametros.find((p) => p.id === id);
    return of(okResponse(param, 'Parámetro actualizado.')).pipe(delay(150));
  }
  if (url.endsWith('/admin/auditoria') && method === 'GET') {
    return of(okResponse(mockStore.auditoria)).pipe(delay(200));
  }
  if (url.endsWith('/admin/cierre-masivo') && method === 'POST') {
    const body = req.body as any;
    const nuevoReporte = {
      id: `REP-CIE-${mockStore.reportesCierre.length + 1}`,
      periodoCodigo: body?.idPeriodoAcademico || '2026-2',
      fechaEjecucion: new Date().toISOString().replace('T', ' ').slice(0, 19),
      totalEstudiantesProcesados: 1540,
      totalMateriasAfectadas: 92,
      totalAprobadosAsistencia: 1492,
      totalReprobadosFallas: 48,
      estado: 'COMPLETADO' as const,
      ejecutadoPor: 'Administrador del Sistema',
    };
    mockStore.reportesCierre = [nuevoReporte, ...mockStore.reportesCierre];
    return of(okResponse(undefined, 'Cierre masivo solicitado correctamente.')).pipe(delay(350));
  }

  // ================= ADMIN: INSTITUCIONES =================
  if (url.endsWith('/admin/instituciones') && method === 'GET') {
    return of(okResponse(mockStore.instituciones)).pipe(delay(200));
  }
  if (url.endsWith('/admin/instituciones') && method === 'POST') {
    const body = req.body as any;
    const nueva = { id: `INST-${mockStore.instituciones.length + 1}`, estado: 1, ...body };
    mockStore.instituciones.push(nueva);
    return of(okResponse(nueva, 'Institución registrada con éxito.')).pipe(delay(250));
  }
  if (url.includes('/admin/instituciones/') && url.endsWith('/toggle-estado') && method === 'PATCH') {
    const segments = url.split('/');
    const id = segments[segments.length - 2];
    mockStore.instituciones = mockStore.instituciones.map((i) =>
      i.id === id ? { ...i, estado: i.estado === 1 ? 0 : 1 } : i
    );
    return of(okResponse({ id }, 'Estado de institución alternado.')).pipe(delay(200));
  }

  // ================= DECANO: COORDINADORES =================
  if (url.endsWith('/decano/coordinadores') && method === 'GET') {
    return of(okResponse(mockStore.coordinadores)).pipe(delay(250));
  }
  if (url.endsWith('/decano/coordinadores') && method === 'POST') {
    const body = req.body as any;
    const nuevo = {
      ...body,
      id: `COORD-${mockStore.coordinadores.length + 1}`,
      totalDocentes: 0,
      totalGrupos: 0,
      estado: 'ACTIVO',
    };
    mockStore.coordinadores = [nuevo, ...mockStore.coordinadores];
    return of(okResponse(nuevo, 'Coordinador registrado exitosamente.')).pipe(delay(300));
  }
  if (url.includes('/decano/coordinadores/') && url.endsWith('/toggle') && method === 'PATCH') {
    const segments = url.split('/');
    const id = segments[segments.length - 2];
    mockStore.coordinadores = mockStore.coordinadores.map((c) =>
      c.id === id ? { ...c, estado: c.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' } : c
    );
    const coord = mockStore.coordinadores.find((c) => c.id === id);
    return of(okResponse(coord, `Estado del coordinador actualizado a ${coord?.estado}.`)).pipe(delay(200));
  }
  if (url.includes('/decano/coordinadores/') && method === 'PUT') {
    const id = url.split('/').pop()!;
    const body = req.body as any;
    mockStore.coordinadores = mockStore.coordinadores.map((c) => (c.id === id ? { ...c, ...body } : c));
    const coord = mockStore.coordinadores.find((c) => c.id === id);
    return of(okResponse(coord, 'Datos del coordinador actualizados con éxito.')).pipe(delay(250));
  }
  if (url.includes('/decano/coordinadores/') && url.endsWith('/facultad') && method === 'PATCH') {
    const segments = url.split('/');
    const id = segments[segments.length - 2];
    const body = req.body as any;
    mockStore.coordinadores = mockStore.coordinadores.map((c) =>
      c.id === id ? { ...c, facultad: body.nuevaFacultad } : c
    );
    const coord = mockStore.coordinadores.find((c) => c.id === id);
    return of(okResponse(coord, `Coordinador reasignado a la ${body.nuevaFacultad}.`)).pipe(delay(250));
  }

  // ================= ESTUDIANTE =================
  if (url.endsWith('/estudiante/horarios') && method === 'GET') {
    return of(okResponse(mockHorariosToDto(mockStore.horariosEstudiante))).pipe(delay(250));
  }
  if (url.endsWith('/estudiante/materias') && method === 'GET') {
    return of(okResponse(mockMateriasToDto(mockStore.materiasEstudiante))).pipe(delay(250));
  }
  if (url.includes('/estudiante/materias/') && url.endsWith('/sesiones') && method === 'GET') {
    const segments = url.split('/');
    const materiaId = segments[segments.length - 2];
    // Acepta el UUID deterministico emitido por el mock de materias o la clave heredada.
    const clave =
      mockStore.materiasEstudiante.find((m) => mockUuid(`asignatura:${m.id}`) === materiaId)?.id ?? materiaId;
    const materia = mockStore.materiasEstudiante.find((m) => m.id === clave);
    const sesiones = mockStore.sesionesMaterias[clave] || [];
    return of(okResponse(mockSesionesToDto(sesiones, materia))).pipe(delay(200));
  }
  if (url.includes('/estudiante/materias/') && url.endsWith('/prerrequisitos') && method === 'GET') {
    const mockPrereqs = [
      {
        id: 'req-01',
        prerrequisitoCodigo: 'IS-302',
        prerrequisitoNombre: 'Ingeniería de Software I',
        creditos: 3,
        tipo: 'OBLIGATORIO',
        estadoAcademico: 'APROBADA',
      },
      {
        id: 'req-02',
        prerrequisitoCodigo: 'BD-301',
        prerrequisitoNombre: 'Bases de Datos Avanzadas',
        creditos: 3,
        tipo: 'OBLIGATORIO',
        estadoAcademico: 'PENDIENTE',
      },
    ];
    return of(okResponse(mockPrereqs, undefined, 2)).pipe(delay(200));
  }
  if (url.endsWith('/estudiante/matricular-grupo') && method === 'POST') {
    const body = req.body as any;
    return of(okResponse({ grupoId: body?.codigo }, '¡Te has matriculado exitosamente en el grupo!')).pipe(delay(250));
  }
  if (url.endsWith('/estudiante/cupos/solicitar') && method === 'POST') {
    const body = req.body as any;
    const nuevaSol: SolicitudMatriculaItem = {
      id: `SOL-MAT-${mockStore.solicitudesMatricula.length + 1}`,
      estudianteId: 'EST-2024-001',
      estudianteNombre: 'Estudiante Actual',
      estudianteCodigo: 'EST2024001',
      estudianteCorreo: 'estudiante.actual@uco.net.co',
      cursoId: body.cursoId,
      cursoCodigo: body.cursoCodigo || 'CUR-101',
      cursoNombre: body.cursoNombre,
      grupo: body.grupoCodigo || 'G1',
      fechaSolicitud: new Date().toISOString().slice(0, 10),
      motivo: body.motivo,
      estado: 'PENDIENTE',
    };
    mockStore.solicitudesMatricula = [nuevaSol, ...mockStore.solicitudesMatricula];
    return of(okResponse(nuevaSol, `Tu solicitud de inscripción a ${body.cursoNombre} ha sido enviada a Coordinación.`)).pipe(delay(300));
  }

  // ================= COORDINADOR: DOCENTES =================
  if (url.endsWith('/coordinador/docentes') && method === 'GET') {
    return of(okResponse(mockStore.docentes)).pipe(delay(250));
  }
  if (url.endsWith('/coordinador/docentes') && method === 'POST') {
    const body = req.body as any;
    const nuevo = { ...body, id: `DOC-${mockStore.docentes.length + 1}`, totalGruposAsignados: 0, estado: 'ACTIVO' };
    mockStore.docentes = [nuevo, ...mockStore.docentes];
    return of(okResponse(nuevo, 'Docente registrado en el programa exitosamente.')).pipe(delay(300));
  }
  if (url.includes('/coordinador/docentes/') && url.endsWith('/toggle') && method === 'PATCH') {
    const segments = url.split('/');
    const id = segments[segments.length - 2];
    mockStore.docentes = mockStore.docentes.map((d) =>
      d.id === id ? { ...d, estado: d.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' } : d
    );
    const doc = mockStore.docentes.find((d) => d.id === id);
    return of(okResponse(doc, `Estado del docente actualizado a ${doc?.estado}.`)).pipe(delay(200));
  }

  // ================= COORDINADOR: PLANES DE ESTUDIO =================
  if (url.endsWith('/coordinador/planes-estudio') && method === 'GET') {
    return of(okResponse(mockStore.planesEstudio)).pipe(delay(250));
  }
  if (url.endsWith('/coordinador/planes-estudio') && method === 'POST') {
    const body = req.body as any;
    const nuevo: PlanEstudioItem = {
      ...body,
      id: `PLAN-${mockStore.planesEstudio.length + 1}`,
      estado: 'VIGENTE',
      totalSemestres: body.totalSemestres || 10,
      totalAsignaturas: 0,
      anioVigencia: body.anioVigencia || new Date().getFullYear(),
      totalCreditos: body.totalCreditos || 160,
      descripcion: body.descripcion || '',
    };
    mockStore.planesEstudio = [nuevo, ...mockStore.planesEstudio];
    return of(okResponse(nuevo, `Plan de estudio ${nuevo.codigo} creado exitosamente.`)).pipe(delay(300));
  }
  if (url.includes('/coordinador/planes-estudio/') && method === 'PUT') {
    const id = url.split('/').pop()!;
    const body = req.body as any;
    mockStore.planesEstudio = mockStore.planesEstudio.map((p) => (p.id === id ? { ...p, ...body } : p));
    const actualizado = mockStore.planesEstudio.find((p) => p.id === id);
    return of(okResponse(actualizado, 'Plan de estudio modificado con éxito.')).pipe(delay(250));
  }
  if (url.includes('/coordinador/planes-estudio/') && url.endsWith('/toggle') && method === 'PATCH') {
    const segments = url.split('/');
    const id = segments[segments.length - 2];
    mockStore.planesEstudio = mockStore.planesEstudio.map((p) =>
      p.id === id ? { ...p, estado: p.estado === 'VIGENTE' ? 'INACTIVO' : 'VIGENTE' } : p
    );
    const plan = mockStore.planesEstudio.find((p) => p.id === id);
    return of(okResponse(plan, `Estado del plan actualizado a ${plan?.estado}.`)).pipe(delay(200));
  }
  if (url.includes('/coordinador/planes-estudio/') && url.endsWith('/asignaturas') && method === 'GET') {
    const segments = url.split('/');
    const planId = segments[segments.length - 2];
    const asignaturas = mockStore.asignaturasPlan[planId] || [];
    return of(okResponse(asignaturas)).pipe(delay(200));
  }

  // ================= COORDINADOR: PERÍODOS ACADÉMICOS =================
  if (url.endsWith('/coordinador/periodos-academicos') && method === 'GET') {
    return of(okResponse(mockStore.periodosAcademicos)).pipe(delay(200));
  }
  if (url.endsWith('/coordinador/periodos-academicos') && method === 'POST') {
    const body = req.body as any;
    const nuevo = { ...body, id: `PER-${mockStore.periodosAcademicos.length + 1}` };
    mockStore.periodosAcademicos = [nuevo, ...mockStore.periodosAcademicos];
    return of(okResponse(nuevo, `Período académico ${nuevo.codigo} creado exitosamente.`)).pipe(delay(250));
  }
  if (url.includes('/coordinador/periodos-academicos/') && method === 'PUT') {
    const id = url.split('/').pop()!;
    const body = req.body as any;
    mockStore.periodosAcademicos = mockStore.periodosAcademicos.map((p) => (p.id === id ? { ...p, ...body } : p));
    const actualizado = mockStore.periodosAcademicos.find((p) => p.id === id);
    return of(okResponse(actualizado, 'Parámetros del período académico actualizados.')).pipe(delay(250));
  }

  // ================= RECLAMOS Y JUSTIFICACIONES =================
  if (url.endsWith('/archivos/subir') && method === 'POST') {
    const mockFileRes = {
      fileId: `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`,
      nombre: 'soporte_medico.pdf',
      nombreGuardado: `mock_${Date.now()}_soporte.pdf`,
      url: `/api/v1/archivos/mock_${Date.now()}_soporte.pdf`,
      tamanio: 2048,
    };
    return of(okResponse(mockFileRes, 'Archivo subido correctamente.')).pipe(delay(300));
  }
  if (url.endsWith('/docente/reclamos') && method === 'GET') {
    return of(okResponse(mockStore.solicitudesRevision)).pipe(delay(250));
  }
  if (url.endsWith('/estudiante/reclamos') && method === 'GET') {
    return of(okResponse(mockStore.solicitudesRevision)).pipe(delay(250));
  }
  if ((url.endsWith('/asistencias/revisiones') || url.endsWith('/estudiante/reclamos')) && method === 'POST') {
    const body = req.body as any;
    const nuevoReclamo = {
      ...body,
      id: `REC-${mockStore.solicitudesRevision.length + 1}`,
      fechaRadicacion: new Date().toISOString().slice(0, 10),
      estado: 'RADICADA' as const,
      estadoSolicitud: 'PENDIENTE' as const,
    };
    mockStore.solicitudesRevision = [nuevoReclamo, ...mockStore.solicitudesRevision];
    return of(okResponse(nuevoReclamo, 'Solicitud de revisión registrada correctamente.')).pipe(delay(300));
  }
  if (url.includes('/estudiante/reclamos/') && method === 'DELETE') {
    const id = url.split('/').pop()!;
    mockStore.solicitudesRevision = mockStore.solicitudesRevision.filter((r) => r.id !== id);
    return of(okResponse(true, 'Solicitud de revisión eliminada.')).pipe(delay(200));
  }
  if (url.includes('/docente/reclamos/') && method === 'PATCH') {
    const id = url.split('/').pop()!;
    const body = req.body as any;
    const accion = body?.accion === 'APROBADA' ? 'APROBADA' : 'RECHAZADA';
    const comentario = body?.respuestaDocente || body?.respuesta || '';
    mockStore.solicitudesRevision = mockStore.solicitudesRevision.map((r) =>
      r.id === id
        ? {
            ...r,
            estadoSolicitud: accion,
            justificacionRespuesta: comentario,
            fechaRespuesta: new Date().toISOString().slice(0, 10),
          }
        : r
    );
    const actualizado = mockStore.solicitudesRevision.find((r) => r.id === id);
    const msg = accion === 'APROBADA'
      ? 'Reclamo aprobado. Se ha actualizado la asistencia a "Justificada".'
      : 'Reclamo rechazado con la justificación suministrada.';
    return of(okResponse(actualizado, msg)).pipe(delay(250));
  }
  if (url.endsWith('/docente/horarios') && method === 'GET') {
    return of(okResponse(mockStore.horariosDocente)).pipe(delay(250));
  }

  // En modo mock una ruta API desconocida nunca debe alcanzar backend real.
  // Recursos externos (fuentes, imágenes, etc.) siguen su flujo normal.
  if (isApiRequest(url)) {
    return throwError(() => new HttpErrorResponse({
      error: {
        code: 'MOCK_ROUTE_NOT_IMPLEMENTED',
        message: `Ruta no simulada en modo mock: ${method} ${url}`,
      },
      status: 501,
      statusText: 'Mock route not implemented',
      url,
    }));
  }

  return next(req);
};

function isApiRequest(url: string): boolean {
  try {
    const requestUrl = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return [environment.apiUrl, environment.apiV2Url].some((root) => {
      const apiUrl = new URL(root, origin);
      return requestUrl.protocol === apiUrl.protocol
        && requestUrl.hostname === apiUrl.hostname
        && requestUrl.port === apiUrl.port
        && requestUrl.pathname.startsWith(`${apiUrl.pathname}/`);
    });
  } catch {
    return false;
  }
}
