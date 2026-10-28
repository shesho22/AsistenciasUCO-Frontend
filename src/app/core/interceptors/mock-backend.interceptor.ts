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

/** HU053-HU055: solicitudes de ingreso a grupo creadas durante la sesion mock (forma del backend). */
interface SolicitudIngresoMock {
  id: string;
  grupoId: string;
  grupoCodigo: number;
  grupoNombre: string;
  asignaturaId: string;
  asignaturaNombre: string;
  docenteNombre: string;
  estudianteId: string;
  estudianteNombre: string;
  numeroIdentificacion: number;
  estado: string;
  fechaSolicitudUtc: string;
  fechaResolucionUtc: string | null;
  motivoRechazo: string | null;
  posicionEspera: number | null;
  capacidadGrupo: number;
  cuposDisponibles: number;
}
const solicitudesIngresoMock: SolicitudIngresoMock[] = [];

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
    const nueva = {
      id: `AREA-${mockStore.areasConocimiento.length + 1}`,
      codigo: String(body.codigo ?? '').trim().toUpperCase(),
      nombre: body.nombre,
      activa: true,
    };
    mockStore.areasConocimiento = [nueva, ...mockStore.areasConocimiento];
    return of(okResponse(nueva, 'Área registrada exitosamente.')).pipe(delay(250));
  }
  if (url.includes('/admin/areas/') && method === 'PUT') {
    const id = url.split('/').pop()!;
    const body = req.body as any;
    mockStore.areasConocimiento = mockStore.areasConocimiento.map((a) => (a.id === id ? { ...a, nombre: body.nombre ?? a.nombre } : a));
    const actualizada = mockStore.areasConocimiento.find((a) => a.id === id);
    return of(okResponse(actualizada, 'Área actualizada.')).pipe(delay(250));
  }
  if (url.includes('/admin/areas/') && url.endsWith('/estado') && method === 'PATCH') {
    const segments = url.split('/');
    const id = segments[segments.length - 2];
    const deseada = (req.body as any)?.activa;
    mockStore.areasConocimiento = mockStore.areasConocimiento.map((a) =>
      a.id === id ? { ...a, activa: typeof deseada === 'boolean' ? deseada : a.activa } : a
    );
    const area = mockStore.areasConocimiento.find((a) => a.id === id);
    return of(okResponse(area, 'Estado de área actualizado.')).pipe(delay(200));
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
  if (url.includes('/decano/coordinadores/') && url.endsWith('/estado') && method === 'PATCH') {
    const segments = url.split('/');
    const id = segments[segments.length - 2];
    const body = req.body as { estaActivo: boolean };
    mockStore.coordinadores = mockStore.coordinadores.map((c) =>
      c.id === id ? { ...c, estado: body.estaActivo ? 'ACTIVO' : 'INACTIVO' } : c
    );
    return of(okResponse({ idCoordinador: id, sincronizacionIdentidad: 'OK', mensajeUsuario: null }, 'Estado del coordinador actualizado.')).pipe(delay(200));
  }
  if (url.includes('/decano/coordinadores/') && method === 'PUT') {
    const id = url.split('/').pop()!;
    const body = req.body as any;
    mockStore.coordinadores = mockStore.coordinadores.map((c) => (c.id === id ? { ...c, ...body } : c));
    return of(okResponse({ idCoordinador: id, sincronizacionIdentidad: 'OK', mensajeUsuario: null }, 'Datos del coordinador actualizados con éxito.')).pipe(delay(250));
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
  // HU095: consolidado del directorio docente (activos, inactivos y por tipo de vinculacion).
  if (url.endsWith('/coordinador/docentes/resumen') && method === 'GET') {
    const activos = mockStore.docentes.filter((d) => d.estado === 'ACTIVO').length;
    const inactivos = mockStore.docentes.length - activos;
    return of(okResponse({
      totalDocentes: mockStore.docentes.length,
      totalActivos: activos,
      totalInactivos: inactivos,
      porTipoVinculacion: [
        { idTipoVinculacion: 'TV-CAT', codigoTipoVinculacion: 'CAT', nombreTipoVinculacion: 'Cátedra',
          totalActivos: activos, totalInactivos: inactivos, total: mockStore.docentes.length },
      ],
    })).pipe(delay(200));
  }
  // HU094: ficha del docente con historial de grupos y resumen de carga.
  if (url.includes('/coordinador/docentes/') && url.endsWith('/ficha') && method === 'GET') {
    const segments = url.split('/');
    const id = segments[segments.length - 2];
    const doc = mockStore.docentes.find((d) => d.id === id);
    const historial = [
      { idGrupo: `${id}-G1`, codigoGrupo: 1, nombreGrupo: 'Grupo 1', idAsignatura: 'ASG-1', nombreAsignatura: 'Matemática Avanzada III',
        idPeriodoAcademico: 'PER-2026-1', codigoPeriodoAcademico: 20261, nombrePeriodoAcademico: '2026-1', fechaInicioPeriodo: '2026-01-20',
        fechaFinPeriodo: '2026-12-10', estadoPeriodo: 'VIGENTE', capacidadMaxima: 35, estudiantesActivos: 32, estudiantesFinalizados: 0,
        estudiantesCanceladosVoluntad: 1, estudiantesCanceladosInasistencia: 0 },
      { idGrupo: `${id}-G2`, codigoGrupo: 2, nombreGrupo: 'Grupo 2', idAsignatura: 'ASG-2', nombreAsignatura: 'Cálculo Integral',
        idPeriodoAcademico: 'PER-2025-2', codigoPeriodoAcademico: 20252, nombrePeriodoAcademico: '2025-2', fechaInicioPeriodo: '2025-07-20',
        fechaFinPeriodo: '2025-12-05', estadoPeriodo: 'FINALIZADO', capacidadMaxima: 30, estudiantesActivos: 0, estudiantesFinalizados: 26,
        estudiantesCanceladosVoluntad: 2, estudiantesCanceladosInasistencia: 2 },
    ];
    return of(okResponse({
      docente: doc,
      resumen: { totalGrupos: 2, totalPeriodos: 2, gruposVigentes: 1, estudiantesActivosVigentes: 32 },
      historial,
      totalHistorial: historial.length,
    })).pipe(delay(250));
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
  if (url.includes('/coordinador/planes-estudio/') && url.endsWith('/toggle-estado') && method === 'PATCH') {
    const segments = url.split('/');
    const id = segments[segments.length - 2];
    mockStore.planesEstudio = mockStore.planesEstudio.map((p) =>
      p.id === id ? { ...p, estado: p.estado === 'VIGENTE' ? 'INACTIVO' : 'VIGENTE' } : p
    );
    const plan = mockStore.planesEstudio.find((p) => p.id === id);
    return of(okResponse(plan, `Estado del plan actualizado a ${plan?.estado}.`)).pipe(delay(200));
  }
  if (url.includes('/coordinador/planes-estudio/') && url.endsWith('/semestres') && method === 'POST') {
    const segments = url.split('/');
    const id = segments[segments.length - 2];
    mockStore.planesEstudio = mockStore.planesEstudio.map((p) =>
      p.id === id ? { ...p, totalSemestres: p.totalSemestres + 1 } : p
    );
    return of(okResponse(null, 'Semestre del plan de estudio registrado(a) exitosamente.')).pipe(delay(200));
  }
  if (url.includes('/coordinador/planes-estudio/') && url.includes('/semestres/') && method === 'DELETE') {
    const segments = url.split('/');
    const id = segments[segments.length - 3];
    mockStore.planesEstudio = mockStore.planesEstudio.map((p) =>
      p.id === id ? { ...p, totalSemestres: Math.max(0, p.totalSemestres - 1) } : p
    );
    return of(okResponse(null, 'Plan de estudio actualizado(a) exitosamente.')).pipe(delay(200));
  }
  if (url.includes('/coordinador/planes-estudio/') && url.endsWith('/asignaturas') && method === 'GET') {
    const segments = url.split('/');
    const planId = segments[segments.length - 2];
    const asignaturas = mockStore.asignaturasPlan[planId] || [];
    return of(okResponse(asignaturas)).pipe(delay(200));
  }

  // ================= DECANO: ESTUDIANTES, ESTRUCTURA Y CRONOGRAMA (HU104/HU105/HU109/HU119/HU145) =================
  if (url.endsWith('/decano/estudiantes') && method === 'GET') {
    const estudiantes = [
      {
        idEstudiante: 'EST-MOCK-1', numeroIdentificacion: '1017000111', nombreCompleto: 'Ana Ruiz',
        correo: 'ana.ruiz@uco.edu.co', activo: true, programas: 'Ingeniería de Sistemas', totalGrupos: 2,
      },
      {
        idEstudiante: 'EST-MOCK-2', numeroIdentificacion: '1017000222', nombreCompleto: 'Luis Gómez',
        correo: 'luis.gomez@uco.edu.co', activo: false, programas: 'Ingeniería Industrial', totalGrupos: 1,
      },
    ];
    const busqueda = (req.params.get('busqueda') ?? '').toLowerCase();
    const filtrados = estudiantes.filter(
      (e) => !busqueda || e.nombreCompleto.toLowerCase().includes(busqueda) || e.numeroIdentificacion.includes(busqueda)
    );
    return of(okResponse(filtrados, undefined, filtrados.length)).pipe(delay(200));
  }
  if (url.includes('/decano/estudiantes/') && method === 'GET') {
    const idEstudiante = url.split('/').pop()!;
    const ficha = {
      idEstudiante, numeroIdentificacion: '1017000111', nombreCompleto: 'Ana Ruiz', activo: true,
      matriculas: [
        {
          idPrograma: 'PRG-1', nombrePrograma: 'Ingeniería de Sistemas', inpPlanEstudio: 20241, idAsignatura: 'ASG-1',
          nombreAsignatura: 'Cálculo Diferencial', idGrupo: 'GRP-MOCK-1', nombreGrupo: 'Grupo 1',
        },
      ],
    };
    return of(okResponse(ficha)).pipe(delay(200));
  }
  if (url.endsWith('/decano/estructura') && method === 'GET') {
    const estructura = [
      {
        id: 'FAC-1', nombre: 'Facultad de Ingeniería', nombreDecano: 'Decano de Prueba', activa: true,
        programas: [
          {
            id: 'PRG-1', nombre: 'Ingeniería de Sistemas', nombreCoordinador: 'Coordinador de Prueba', activo: true,
            nombreTipoPrograma: 'Pregrado', nombreModalidad: 'Presencial', nombreJornada: 'Diurna',
            planes: [{ id: 'PLAN-1', inp: 20241, activo: true, totalSemestres: 10 }],
          },
        ],
      },
    ];
    return of(okResponse(estructura, undefined, estructura.length)).pipe(delay(200));
  }
  if (url.includes('/decano/planes-estudio/') && url.endsWith('/asignaturas') && method === 'GET') {
    const asignaturas = [
      {
        id: 'ASG-1', codigo: 'SIS-101', nombre: 'Cálculo Diferencial', credito: 4, codigoSemestre: 'S1',
        nombreArea: 'Ciencias Básicas', nombreComponente: 'Obligatorio',
      },
      {
        id: 'ASG-2', codigo: 'SIS-201', nombre: 'Estructuras de Datos', credito: 3, codigoSemestre: 'S2',
        nombreArea: 'Software', nombreComponente: 'Obligatorio',
      },
    ];
    return of(okResponse(asignaturas, undefined, asignaturas.length)).pipe(delay(200));
  }
  if (url.endsWith('/decano/sesiones') && method === 'GET') {
    const sesiones = [
      {
        id: 'SES-MOCK-1', nombre: 'Sesión 1', codigo: 'S-01', numeroSemana: 1, fechaHoraInicio: '2026-01-27T07:00:00',
        fechaHoraFin: '2026-01-27T09:00:00', idGrupo: 'GRP-MOCK-1', codigoGrupo: 1, nombreGrupo: 'Grupo 1',
        idAsignatura: 'ASG-1', nombreAsignatura: 'Cálculo Diferencial', idPrograma: 'PRG-1',
        nombrePrograma: 'Ingeniería de Sistemas',
      },
    ];
    return of(okResponse(sesiones, undefined, sesiones.length)).pipe(delay(200));
  }

  // ================= COORDINADOR: GRUPOS, SESIONES Y ASISTENCIAS (HU064/HU060/HU061) =================
  if (url.endsWith('/coordinador/grupos') && method === 'GET') {
    const grupos = [
      {
        id: 'GRP-MOCK-1', codigo: 1, nombre: 'Grupo 1', idAsignatura: 'ASG-1', nombreAsignatura: 'Cálculo Diferencial',
        idDocente: 'DOC-1', capacidadMaxima: 30, estudiantesActivos: 2, cuposDisponibles: 28, habilitado: true,
        inicioPeriodo: '2026-01-20', finPeriodo: '2026-06-05',
      },
    ];
    return of(okResponse(grupos, undefined, grupos.length)).pipe(delay(200));
  }
  if (url.includes('/coordinador/grupos/') && url.endsWith('/sesiones') && method === 'GET') {
    const idGrupo = url.split('/').slice(-2)[0];
    const sesiones = [
      {
        id: 'SES-MOCK-1', idGrupo, codigoGrupo: 1, nombreGrupo: 'Grupo 1', nombre: 'Sesión 1', numero: 1, codigo: 'S-01',
        numeroSemana: 1, fechaHoraInicio: '2026-01-27T07:00:00', fechaHoraFin: '2026-01-27T09:00:00',
      },
    ];
    return of(okResponse(sesiones, undefined, sesiones.length)).pipe(delay(200));
  }
  if (url.includes('/coordinador/sesiones/') && url.endsWith('/asistencias') && method === 'GET') {
    const idSesion = url.split('/').slice(-2)[0];
    const asistencias = [
      {
        idDetalleAsistencia: 'DET-MOCK-1', idSesion, nombreSesion: 'Sesión 1', idEstudiante: 'EST-1',
        numeroIdentificacion: '1017000111', nombreCompleto: 'Ana Ruiz', asistio: true, codigoRazonCausa: null,
        nombreRazonCausa: null, fechaHoraInicio: '2026-01-27T07:00:00', fechaHoraFin: '2026-01-27T09:00:00',
      },
      {
        idDetalleAsistencia: 'DET-MOCK-2', idSesion, nombreSesion: 'Sesión 1', idEstudiante: 'EST-2',
        numeroIdentificacion: '1017000222', nombreCompleto: 'Luis Gómez', asistio: false, codigoRazonCausa: 'INJ',
        nombreRazonCausa: 'Inasistencia injustificada', fechaHoraInicio: '2026-01-27T07:00:00',
        fechaHoraFin: '2026-01-27T09:00:00',
      },
    ];
    const asistio = req.params.get('asistio');
    const filtradas = asistio === null ? asistencias : asistencias.filter((a) => String(a.asistio) === asistio);
    return of(okResponse(filtradas, undefined, filtradas.length)).pipe(delay(200));
  }

  // ================= COORDINADOR: PERÍODOS ACADÉMICOS =================
  if (url.endsWith('/coordinador/periodos-academicos') && method === 'GET') {
    return of(okResponse(mockStore.periodosAcademicos)).pipe(delay(200));
  }
  if (url.endsWith('/admin/periodos-academicos') && method === 'POST') {
    const body = req.body as any;
    const nuevo = { ...body, id: `PER-${mockStore.periodosAcademicos.length + 1}` };
    mockStore.periodosAcademicos = [nuevo, ...mockStore.periodosAcademicos];
    return of(okResponse(nuevo, `Período académico ${nuevo.codigo} creado exitosamente.`)).pipe(delay(250));
  }
  if (url.includes('/admin/periodos-academicos/') && method === 'PUT') {
    const id = url.split('/').pop()!;
    const body = req.body as any;
    mockStore.periodosAcademicos = mockStore.periodosAcademicos.map((p) => (p.id === id ? { ...p, ...body } : p));
    const actualizado = mockStore.periodosAcademicos.find((p) => p.id === id);
    return of(okResponse(actualizado, 'Parámetros del período académico actualizados.')).pipe(delay(250));
  }
  if (url.includes('/admin/periodos-academicos/') && method === 'DELETE') {
    const id = url.split('/').pop()!;
    mockStore.periodosAcademicos = mockStore.periodosAcademicos.filter((p) => p.id !== id);
    return of(okResponse(null, 'Período académico eliminado exitosamente.')).pipe(delay(200));
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
    // HU010/HU011: misma forma que el backend (lista con `total`), filtrada por estado y paginada.
    const estado = req.params.get('estado');
    const pagina = Math.max(1, Number(req.params.get('pagina') ?? 1));
    const tamano = Math.min(100, Math.max(1, Number(req.params.get('tamano') ?? 10)));
    const filtradas = mockStore.solicitudesRevision.filter((r) => !estado || r.estadoSolicitud === estado);
    return of(okResponse(filtradas.slice((pagina - 1) * tamano, pagina * tamano), undefined, filtradas.length)).pipe(
      delay(250)
    );
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
  // HU006: perfil propio con vinculos institucionales (misma forma que el backend).
  if (url.endsWith('/usuarios/perfil') && method === 'GET') {
    return of(okResponse({
      idUsuario: 'usr-mock', codigoTipoIdentificacion: 'CC', nombreTipoIdentificacion: 'Cédula de ciudadanía',
      numeroIdentificacion: 1017000000, primerNombre: 'Usuario', segundoNombre: null, primerApellido: 'Mock', segundoApellido: null,
      nombreCompleto: 'Usuario Mock', correo: 'usuario.mock@uco.edu.co', correoConfirmado: true, estaActivo: true,
      vinculos: [
        { rol: 'DOCENTE', idEntidad: 'prog-mock', nombreEntidad: 'Ingeniería de Sistemas', detalle: 'Cátedra', estaActivo: true },
      ],
    })).pipe(delay(200));
  }
  // HU008: oferta de grupos del estudiante (misma forma que el backend); refleja las solicitudes abiertas del mock.
  if (url.endsWith('/estudiante/oferta-academica') && method === 'GET') {
    const abierta = (grupoId: string) =>
      solicitudesIngresoMock.find((s) => s.grupoId === grupoId && (s.estado === 'PENDIENTE' || s.estado === 'EN_ESPERA'));
    const oferta = [
      { idGrupo: 'grp-oferta-1', codigoGrupo: 1, nombreGrupo: 'Grupo 1', idAsignatura: 'asg-of-1', codigoAsignatura: 'MAT301',
        nombreAsignatura: 'Matemática Avanzada III', nombreDocente: 'Docente Mock', idPeriodoAcademico: 'PER-2026-2',
        nombrePeriodoAcademico: '2026-2', fechaInicioPeriodo: '2026-07-20', fechaFinPeriodo: '2026-12-10', estadoPeriodo: 'VIGENTE',
        horario: 'Lunes 08:00-10:00; Miercoles 08:00-10:00', capacidadMaxima: 35, estudiantesActivos: 30, cuposDisponibles: 5,
        matriculado: false, tipoAsignatura: 'ESPECIFICA', transversal: false },
      { idGrupo: 'grp-oferta-2', codigoGrupo: 2, nombreGrupo: 'Grupo 2', idAsignatura: 'asg-of-2', codigoAsignatura: 'FIS201',
        nombreAsignatura: 'Física II', nombreDocente: 'Docente Mock', idPeriodoAcademico: 'PER-2027-1',
        nombrePeriodoAcademico: '2027-1', fechaInicioPeriodo: '2027-01-20', fechaFinPeriodo: '2027-06-10', estadoPeriodo: 'PROXIMO',
        horario: null, capacidadMaxima: 30, estudiantesActivos: 30, cuposDisponibles: 0, matriculado: false,
        tipoAsignatura: 'INSTITUCIONAL', transversal: true },
    ].map((g) => {
      const solicitud = abierta(g.idGrupo);
      return { ...g, idSolicitudAbierta: solicitud?.id ?? null, estadoSolicitud: solicitud?.estado ?? null };
    });
    return of(okResponse(oferta, undefined, oferta.length)).pipe(delay(250));
  }
  // HU053-HU055: solicitudes de ingreso a grupo (misma forma que el backend; estado en memoria de la sesión mock).
  if (url.endsWith('/estudiante/solicitudes-matricula') && method === 'POST') {
    const grupoId = (req.body as { grupoId?: string } | null)?.grupoId ?? '';
    const solicitud = {
      id: `00000000-0000-4000-9000-${String(Date.now()).slice(-12).padStart(12, '0')}`,
      grupoId,
      grupoCodigo: 1,
      grupoNombre: 'Grupo Mock',
      asignaturaId: 'asg-mock',
      asignaturaNombre: 'Asignatura Mock',
      docenteNombre: 'Docente Mock',
      estudianteId: 'est-mock',
      estudianteNombre: 'Estudiante Mock',
      numeroIdentificacion: 1000000,
      estado: 'PENDIENTE',
      fechaSolicitudUtc: new Date().toISOString(),
      fechaResolucionUtc: null as string | null,
      motivoRechazo: null as string | null,
      posicionEspera: null as number | null,
      capacidadGrupo: 30,
      cuposDisponibles: 1,
    };
    solicitudesIngresoMock.unshift(solicitud);
    return of(okResponse({ id: solicitud.id }, 'La solicitud de ingreso al grupo fue registrada.')).pipe(delay(250));
  }
  if (url.endsWith('/estudiante/solicitudes-matricula') && method === 'GET') {
    return of(okResponse(solicitudesIngresoMock, undefined, solicitudesIngresoMock.length)).pipe(delay(250));
  }
  if (url.includes('/estudiante/solicitudes-matricula/') && url.endsWith('/retiro') && method === 'POST') {
    const id = url.split('/').slice(-2)[0];
    solicitudesIngresoMock.filter((s) => s.id === id).forEach((s) => (s.estado = 'RETIRADA'));
    return of(okResponse(null, 'La solicitud fue retirada.')).pipe(delay(200));
  }
  if (url.includes('/docente/grupos/') && url.endsWith('/solicitudes-ingreso') && method === 'GET') {
    return of(okResponse(solicitudesIngresoMock, undefined, solicitudesIngresoMock.length)).pipe(delay(250));
  }
  if (url.includes('/docente/solicitudes-ingreso/') && method === 'PATCH') {
    const id = url.split('/').pop()!;
    const body = (req.body ?? {}) as { accion?: string; motivo?: string };
    const estadoResultante = body.accion === 'RECHAZAR' ? 'RECHAZADA' : 'ACEPTADA';
    solicitudesIngresoMock.filter((s) => s.id === id).forEach((s) => {
      s.estado = estadoResultante;
      s.motivoRechazo = body.accion === 'RECHAZAR' ? body.motivo ?? null : null;
      s.fechaResolucionUtc = new Date().toISOString();
    });
    return of(okResponse({ id, estadoResultante })).pipe(delay(250));
  }
  if (url.includes('/docente/grupos/') && url.endsWith('/retiro') && method === 'POST') {
    // HU051: el retiro devuelve ApiDataResponse<Void>; el padrón se recarga desde su propio endpoint.
    return of(okResponse(null, 'El estudiante fue retirado del grupo.')).pipe(delay(250));
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
