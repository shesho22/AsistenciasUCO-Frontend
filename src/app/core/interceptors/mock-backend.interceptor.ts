import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, delay, throwError } from 'rxjs';
import { mockStore } from '../mocks/mock-data-store';
import { respuestaConsultasTransversales } from '../mocks/mock-consultas-transversales';
import { plantillasNotificacionMock } from '../mocks/mock-notificaciones';
import {
  mockHorariosToDto,
  mockMateriasToDto,
  mockSesionesToDto,
  mockUuid,
} from '../mocks/student-portal-mock.adapter';
import { ApiResponse } from '../models/api-response.model';
import { ApiPageResponse } from '../api/models/api-page-response.model';
import { PlanEstudioItem } from '../models/role-management.model';
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

function okPageResponse<T>(
  elementos: T[],
  pagina = 1,
  tamano = 10,
  totalElementos?: number
): HttpResponse<ApiPageResponse<T>> {
  const total = totalElementos ?? elementos.length;
  return new HttpResponse<ApiPageResponse<T>>({
    status: 200,
    body: {
      exitoso: true,
      elementos,
      datos: elementos,
      total,
      numeroPagina: pagina,
      tamanoPagina: tamano,
      totalElementos: total,
      totalPaginas: Math.max(1, Math.ceil(total / tamano)),
    } as any,
  });
}

/** CULM-001 B2NM: respuesta paginada con la forma real de ApiPageResponse (los filtros del mock son mínimos). */
function okPagina<T>(elementos: T[], req: { params: { get(nombre: string): string | null } }): HttpResponse<unknown> {
  const tamano = Math.max(Number(req.params.get('tamano')) || 20, 1);
  const pagina = Math.max(Number(req.params.get('pagina')) || 1, 1);
  const inicio = (pagina - 1) * tamano;
  return new HttpResponse<unknown>({
    status: 200,
    body: {
      exitoso: true,
      elementos: elementos.slice(inicio, inicio + tamano),
      numeroPagina: pagina,
      tamanoPagina: tamano,
      totalElementos: elementos.length,
      totalPaginas: Math.max(Math.ceil(elementos.length / tamano), 1),
    },
  });
}

/** Vínculo asignatura-plan del mock con carácter y semestre como los entrega el backend. */
function vinculoMock(a: { id: string; codigo: string; nombre: string; creditos: number; semestre: number; area?: string; componente?: string }, planId: string) {
  const compartida = a.codigo === 'SIS-101';
  return {
    idAsignatura: a.id, codigo: a.codigo, nombre: a.nombre, credito: a.creditos, nombreArea: a.area ?? '', nombreComponente: a.componente ?? '',
    idPlanEstudio: planId, inpPlanEstudio: '2024', idPrograma: 'PRG-MOCK-1', nombrePrograma: 'Ingeniería de Sistemas',
    idSemestrePlanEstudio: `SEM-${planId}-${a.semestre}`, numeroSemestre: a.semestre, codigoSemestre: `S${a.semestre}`,
    codigoCaracter: a.semestre % 2 === 0 ? 'OPT' : 'OBL', nombreCaracter: a.semestre % 2 === 0 ? 'Optativa' : 'Obligatoria',
    estaActivoVinculo: true, estaActivaAsignatura: true, compartida,
  };
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
  // HU161/HU162/HU164 descartadas: las instituciones son de solo consulta (sin POST/PUT/PATCH).

  // ================= DECANO: COORDINADORES =================
  if (url.split('?')[0].endsWith('/decano/coordinadores') && method === 'GET') {
    const elementos = mockStore.coordinadores;
    return of(new HttpResponse({
      status: 200,
      body: { exitoso: true, elementos, numeroPagina: 1, tamanoPagina: 100, totalElementos: elementos.length, totalPaginas: 1 },
    })).pipe(delay(250));
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
    // Los reclamos por toma ya radicados en el mock se reflejan en la toma correspondiente.
    const dtos = mockSesionesToDto(sesiones, materia).map((sesion) => ({
      ...sesion,
      tomas: (sesion.tomas ?? []).map((toma) => {
        const reclamo = mockStore.solicitudesRevision.find((r) => r.idToma === toma.idToma);
        return reclamo
          ? {
              ...toma,
              reclamable: false,
              idSolicitudRevision: reclamo.id,
              estadoSolicitudRevision: reclamo.estadoSolicitud,
              resultadoAprobacion: reclamo.resultadoAprobacion ?? null,
            }
          : toma;
      }),
    }));
    return of(okResponse(dtos)).pipe(delay(200));
  }
  if (url.endsWith('/estudiante/matricular-grupo') && method === 'POST') {
    const body = req.body as any;
    return of(okResponse({ grupoId: body?.codigo }, '¡Te has matriculado exitosamente en el grupo!')).pipe(delay(250));
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
    const planes = mockStore.planesEstudio.map((p) => ({
      ...p, idPrograma: 'PRG-MOCK-1', nombrePrograma: p.programa, inp: String(p.anioVigencia),
      estaActivoPlanEstudio: p.estado !== 'INACTIVO',
    }));
    return of(okPagina(planes, req)).pipe(delay(250));
  }
  if (url.endsWith('/coordinador/caracteres-asignatura') && method === 'GET') {
    return of(okResponse([{ codigo: 'OBL', nombre: 'Obligatoria', orden: 1 }, { codigo: 'OPT', nombre: 'Optativa', orden: 2 }])).pipe(delay(150));
  }
  if (url.includes('/coordinador/planes-estudio/') && url.endsWith('/asignaturas-asociables') && method === 'GET') {
    const busqueda = (req.params.get('busqueda') ?? '').toLowerCase();
    const asociables = [
      { idAsignatura: 'ASG-EXT-1', codigo: 'SOF-310', nombre: 'Pruebas de Software', credito: 3, nombreArea: 'Software', nombreComponente: 'Específica', planes: 'Ingeniería de Software (Plan 2024)' },
    ].filter((a) => !busqueda || a.codigo.toLowerCase().includes(busqueda) || a.nombre.toLowerCase().includes(busqueda));
    return of(okPagina(asociables, req)).pipe(delay(200));
  }
  if (url.includes('/coordinador/planes-estudio/') && url.endsWith('/asignaturas-asociadas') && method === 'POST') {
    return of(new HttpResponse({ status: 201, body: { exitoso: true, datos: null, mensajeUsuario: 'Asignatura asociada al plan.' } })).pipe(delay(200));
  }
  if (url.includes('/coordinador/planes-estudio/') && url.includes('/asignaturas/') && method === 'DELETE') {
    const segments = url.split('/');
    const planId = segments[segments.length - 3];
    const asigId = segments[segments.length - 1];
    mockStore.asignaturasPlan[planId] = (mockStore.asignaturasPlan[planId] || []).filter((a) => a.id !== asigId);
    return of(okResponse(null, 'Asignatura quitada del plan.')).pipe(delay(200));
  }
  if (/\/grupos\/[^/]+\/programas$/.test(url) && method === 'GET') {
    return of(okResponse([{ idPrograma: 'PRG-MOCK-1', nombrePrograma: 'Ingeniería de Sistemas', idPlanEstudio: 'PLAN-1', inpPlanEstudio: '2024' }])).pipe(delay(150));
  }
  if (url.endsWith('/coordinador/estudiantes') && method === 'GET') {
    const estudiantes = mockStore.estudiantesDirectorio.map((e) => ({
      id: e.id, idUsuario: e.id, numeroIdentificacion: Number(e.documento) || 0, nombreCompleto: e.nombreCompleto, correo: e.correo,
      idPrograma: 'PRG-MOCK-1', nombrePrograma: e.programa,
    }));
    return of(okPagina(estudiantes, req)).pipe(delay(200));
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
    const asignaturas = (mockStore.asignaturasPlan[planId] || []).map((a) => vinculoMock(a, planId));
    return of(okPagina(asignaturas, req)).pipe(delay(200));
  }

  // ================= DECANO Y ADMINISTRADOR: CONSULTAS TRANSVERSALES (HU112/HU128/HU143/HU157) =================
  const transversal = respuestaConsultasTransversales(req, url);
  if (transversal) {
    if (transversal.esPaginada && Array.isArray(transversal.datos)) {
      const pagina = Number(req.params.get('pagina') ?? 1);
      const tamano = Number(req.params.get('tamano') ?? 10);
      return of(okPageResponse(transversal.datos, pagina, tamano, transversal.total)).pipe(delay(200));
    }
    return of(okResponse(transversal.datos, undefined, transversal.total)).pipe(delay(200));
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
    const pagina = Number(req.params.get('pagina') ?? 1);
    const tamano = Number(req.params.get('tamano') ?? 10);
    return of(okPageResponse(filtrados, pagina, tamano, filtrados.length)).pipe(delay(200));
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
    const planId = url.split('/').slice(-2)[0];
    const semestre = Number(req.params.get('semestre')) || 0;
    const caracter = req.params.get('caracter');
    const busqueda = (req.params.get('busqueda') ?? '').toLowerCase();
    const asignaturas = [
      vinculoMock({ id: 'ASG-1', codigo: 'SIS-101', nombre: 'Cálculo Diferencial', creditos: 4, semestre: 1, area: 'Ciencias Básicas', componente: 'Obligatorio' }, planId),
      vinculoMock({ id: 'ASG-2', codigo: 'SIS-201', nombre: 'Estructuras de Datos', creditos: 3, semestre: 2, area: 'Software', componente: 'Obligatorio' }, planId),
    ].filter(
      (a) =>
        (!semestre || a.numeroSemestre === semestre) &&
        (!caracter || a.codigoCaracter === caracter) &&
        (!busqueda || a.codigo.toLowerCase().includes(busqueda) || a.nombre.toLowerCase().includes(busqueda))
    );
    return of(okPagina(asignaturas, req)).pipe(delay(200));
  }
  if (url.includes('/decano/sesiones') && method === 'GET') {
    const idGrupo = req.params.get('idGrupo') || (url.includes('?') ? new URL(url, 'http://localhost').searchParams.get('idGrupo') : null);
    const todasSesiones = [
      {
        id: 'SES-MOCK-1', nombre: 'Sesión 1', codigo: 'S-01', numeroSemana: 1, fechaHoraInicio: '2026-01-27T07:00:00',
        fechaHoraFin: '2026-01-27T09:00:00', idGrupo: 'GRP-MOCK-1', codigoGrupo: 1, nombreGrupo: 'Grupo 1',
        idAsignatura: 'ASG-1', nombreAsignatura: 'Cálculo Diferencial', idPrograma: 'PRG-1',
        nombrePrograma: 'Ingeniería de Sistemas',
      },
    ];
    const sesiones = idGrupo ? todasSesiones.filter((s) => s.idGrupo === idGrupo) : todasSesiones;
    const pagina = Number(req.params.get('pagina') ?? 1);
    const tamano = Number(req.params.get('tamano') ?? 10);
    return of(okPageResponse(sesiones, pagina, tamano, sesiones.length)).pipe(delay(200));
  }
  if (url.includes('/decano/grupos/') && method === 'GET') {
    const id = url.split('?')[0].split('/').pop()!;
    const grupo = {
      id,
      codigoGrupo: 1,
      codigo: 'MAT-301',
      nombre: 'Grupo 1',
      idAsignatura: 'ASG-1',
      codigoAsignatura: 'SIS-101',
      nombreAsignatura: 'Cálculo Diferencial',
      creditos: 4,
      idDocente: 'DOC-1',
      nombreDocente: 'María Rostagno',
      correoDocente: 'maria.rostagno@uco.edu.co',
      idPeriodoAcademico: 'PER-1',
      codigoPeriodoAcademico: '2026-1',
      capacidadMaximaPermitida: 30,
      totalEstudiantes: 25,
      sesionesRegistradas: 8,
      asistenciaPromedio: 92,
      estado: 'ACTIVO',
    };
    return of(okResponse(grupo)).pipe(delay(200));
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
  if (url.endsWith('/asistencias/revisiones') && method === 'POST') {
    const body = req.body as any;
    const nuevoReclamo = {
      ...body,
      id: `REC-${mockStore.solicitudesRevision.length + 1}`,
      fechaRadicacion: new Date().toISOString().slice(0, 10),
      estado: 'RADICADA' as const,
      estadoSolicitud: 'PENDIENTE' as const,
      idToma: body?.tomaId ?? null,
      resultadoAprobacion: null,
    };
    mockStore.solicitudesRevision = [nuevoReclamo, ...mockStore.solicitudesRevision];
    return of(okResponse(nuevoReclamo, 'Solicitud de revisión registrada correctamente.')).pipe(delay(300));
  }
  if (url.includes('/estudiante/reclamos/') && method === 'DELETE') {
    // A.2-7: misma forma que el backend (ApiMessageResponse); solo se retira un reclamo pendiente (409 en otro caso).
    const id = url.split('/').pop()!;
    const reclamo = mockStore.solicitudesRevision.find((r) => r.id === id);
    if (!reclamo) {
      return throwError(() => new HttpErrorResponse({ status: 404, error: { message: 'La solicitud de revisión no existe.' } }));
    }
    if (reclamo.estadoSolicitud !== 'PENDIENTE') {
      return throwError(
        () => new HttpErrorResponse({ status: 409, error: { message: 'Solo se puede retirar una solicitud de revisión pendiente.' } })
      ).pipe(delay(200));
    }
    mockStore.solicitudesRevision = mockStore.solicitudesRevision.map((r) =>
      r.id === id ? { ...r, estadoSolicitud: 'RETIRADA' as const } : r
    );
    return of(new HttpResponse({ status: 200, body: { exitoso: true, mensaje: 'La solicitud de revisión fue retirada.' } })).pipe(delay(200));
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
  // HU008: oferta de grupos del estudiante (misma forma que el backend): solo consulta de oferta y cupos.
  if (url.endsWith('/estudiante/oferta-academica') && method === 'GET') {
    const oferta = [
      { idGrupo: 'grp-oferta-1', codigoGrupo: 1, nombreGrupo: 'Grupo 1', idAsignatura: 'asg-of-1', codigoAsignatura: 'MAT301',
        nombreAsignatura: 'Matemática Avanzada III', nombreDocente: 'Docente Mock', idPeriodoAcademico: 'PER-2026-2',
        nombrePeriodoAcademico: '2026-2', fechaInicioPeriodo: '2026-07-20', fechaFinPeriodo: '2026-12-10', estadoPeriodo: 'VIGENTE',
        horario: 'Lunes 08:00-10:00; Miercoles 08:00-10:00', capacidadMaxima: 35, estudiantesActivos: 30, cuposDisponibles: 5,
        matriculado: false, tipoAsignatura: 'ESPECIFICA', transversal: false, codigoCaracter: 'OBL', nombreCaracter: 'Obligatoria' },
      { idGrupo: 'grp-oferta-2', codigoGrupo: 2, nombreGrupo: 'Grupo 2', idAsignatura: 'asg-of-2', codigoAsignatura: 'FIS201',
        nombreAsignatura: 'Física II', nombreDocente: 'Docente Mock', idPeriodoAcademico: 'PER-2027-1',
        nombrePeriodoAcademico: '2027-1', fechaInicioPeriodo: '2027-01-20', fechaFinPeriodo: '2027-06-10', estadoPeriodo: 'PROXIMO',
        horario: null, capacidadMaxima: 30, estudiantesActivos: 30, cuposDisponibles: 0, matriculado: false,
        tipoAsignatura: 'INSTITUCIONAL', transversal: true, codigoCaracter: null, nombreCaracter: null },
    ];
    return of(okResponse(oferta, undefined, oferta.length)).pipe(delay(250));
  }
  // HU018: plan de estudios del estudiante por semestres (misma forma que el backend; los totales ya vienen calculados).
  if (url.endsWith('/estudiante/plan-estudio') && method === 'GET') {
    const asignatura = (codigo: string, nombre: string, creditos: number, extra: Record<string, unknown> = {}) => ({
      idAsignatura: mockUuid(`asignatura-plan:${codigo}`), codigo, nombre, creditos, tipoAsignatura: 'ESPECIFICA',
      codigoCaracter: 'OBL', nombreCaracter: 'Obligatoria', cursando: false, idGrupoCursando: null, nombreGrupoCursando: null,
      ...extra,
    });
    const semestre = (numero: number, asignaturas: ReturnType<typeof asignatura>[]) => ({
      idSemestrePlanEstudio: mockUuid(`semestre-plan:${numero}`), numeroSemestre: numero, totalAsignaturas: asignaturas.length,
      totalCreditos: asignaturas.reduce((suma, a) => suma + a.creditos, 0), asignaturas,
    });
    const semestres = [
      semestre(1, [
        asignatura('MAT101', 'Cálculo Diferencial', 4, { tipoAsignatura: 'BASICA' }),
        asignatura('HUM101', 'Humanismo y Sociedad', 2, { tipoAsignatura: 'INSTITUCIONAL', codigoCaracter: 'OPT', nombreCaracter: 'Optativa' }),
      ]),
      semestre(2, []),
      semestre(3, [
        asignatura('MAT301', 'Matemática Avanzada III', 3, {
          cursando: true, idGrupoCursando: mockUuid('grupo-plan:MAT301'), nombreGrupoCursando: 'Grupo 1',
        }),
      ]),
    ];
    const plan = {
      idPlanEstudio: mockUuid('plan-estudio:mock'), inp: 2024, idPrograma: mockUuid('programa:mock'),
      nombrePrograma: 'Ingeniería de Sistemas', totalSemestres: 3, totalAsignaturas: 3, totalCreditos: 9,
      asignaturasCursando: 1, creditosCursando: 3, semestres,
    };
    return of(okResponse([plan], undefined, 1)).pipe(delay(250));
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
            resultadoAprobacion: accion === 'APROBADA' ? (body?.resultado === 'PRESENTE' ? ('PRESENTE' as const) : ('JUSTIFICADA' as const)) : null,
            justificacionRespuesta: comentario,
            fechaRespuesta: new Date().toISOString().slice(0, 10),
          }
        : r
    );
    const actualizado = mockStore.solicitudesRevision.find((r) => r.id === id);
    const msg = accion === 'APROBADA'
      ? body?.resultado === 'PRESENTE'
        ? 'Reclamo aprobado. Se registró que el estudiante estuvo presente en la toma.'
        : 'Reclamo aprobado. Se ha actualizado la asistencia a "Justificada".'
      : 'Reclamo rechazado con la justificación suministrada.';
    return of(okResponse(actualizado, msg)).pipe(delay(250));
  }
  if (url.endsWith('/docente/horarios') && method === 'GET') {
    return of(okResponse(mockStore.horariosDocente)).pipe(delay(250));
  }

  // ================= ADMIN: NOTIFICACIONES (NOTIF-002B / TD-069) =================
  if (url.endsWith('/admin/notificaciones/estado-canal') && method === 'GET') {
    return of(okResponse({
      canalActivo: true,
      ultimoEnvioUtc: '2026-11-09T15:30:00Z',
      ultimoError: null,
    })).pipe(delay(200));
  }

  if (url.includes('/admin/notificaciones/plantillas') && method === 'GET') {
    return of(okResponse(plantillasNotificacionMock())).pipe(delay(250));
  }

  if (url.includes('/admin/notificaciones/plantillas/') && url.endsWith('/versiones') && method === 'POST') {
    const body = (req.body ?? {}) as { asunto: string; cuerpo: string; idioma?: string };
    const segments = url.split('/');
    const tipo = decodeURIComponent(segments.at(-2) ?? '');
    const nuevaVersion = {
      id: `ver-${Date.now()}`,
      tipo,
      idioma: body.idioma || 'es',
      version: 2,
      asunto: body.asunto,
      cuerpo: body.cuerpo,
      activa: true,
      creadoEn: new Date().toISOString(),
    };
    return of(okResponse(nuevaVersion, 'Nueva versión guardada con éxito.')).pipe(delay(250));
  }

  if (url.includes('/admin/notificaciones/plantillas/') && url.includes('/activar') && method === 'PATCH') {
    return of(okResponse({ exitoso: true }, 'Versión activada exitosamente.')).pipe(delay(200));
  }

  if (url.includes('/admin/notificaciones/plantillas/') && url.endsWith('/vista-previa') && method === 'POST') {
    const body = (req.body ?? {}) as { asunto: string; cuerpo: string };
    const asuntoR = (body.asunto || '').replace(/\{(\w+)\}/g, '[$1_VALOR]');
    const cuerpoR = (body.cuerpo || '').replace(/\{(\w+)\}/g, '[$1_VALOR]');
    const htmlR = `
      <div style="font-family: sans-serif; color: var(--color-neutral-800); line-height: 1.6;">
        <h2 style="color: var(--color-info-900); margin-top: 0;">${asuntoR}</h2>
        <div style="white-space: pre-line; background: var(--color-neutral-50); padding: 16px; border-radius: 8px; border: 1px solid var(--color-neutral-200);">
          ${cuerpoR}
        </div>
      </div>
    `;
    return of(okResponse({
      asunto: asuntoR,
      textoPlano: cuerpoR,
      html: htmlR,
      origen: 'BD',
    })).pipe(delay(250));
  }

  if (url.includes('/admin/notificaciones/cola') && method === 'GET') {
    const itemsMock = [
      {
        id: 'notif-sal-001',
        tipo: 'VERIFICACION_CORREO',
        asunto: 'Verifica tu correo electrónico en Asistencias UCO',
        codigoEstado: 'ENTREGADA',
        nombreEstado: 'ENTREGADA',
        esTerminal: true,
        cantidadDestinatarios: 1,
        intentos: 1,
        creadoEn: '2026-11-05T14:10:00Z',
        entregadoEn: '2026-11-05T14:10:02Z',
        idCorrelacion: 'corr-notif-001',
      },
      {
        id: 'notif-sal-002',
        tipo: 'RETIRO_ESTUDIANTE_GRUPO',
        asunto: 'Retiro del grupo G01 de Ingeniería de Software',
        codigoEstado: 'ENTREGADA',
        nombreEstado: 'ENTREGADA',
        esTerminal: true,
        cantidadDestinatarios: 1,
        intentos: 1,
        creadoEn: '2026-11-05T15:20:00Z',
        entregadoEn: '2026-11-05T15:20:04Z',
        idCorrelacion: 'corr-notif-002',
      },
      {
        id: 'notif-sal-004',
        tipo: 'ALERTA_INASISTENCIA_15',
        asunto: 'Alerta preventiva: Inasistencias al 15% en Cálculo Diferencial',
        codigoEstado: 'FALLIDA_REINTENTABLE',
        nombreEstado: 'FALLIDA_REINTENTABLE',
        esTerminal: false,
        cantidadDestinatarios: 1,
        intentos: 2,
        creadoEn: '2026-11-06T06:30:00Z',
        proximoIntentoEn: '2026-11-06T07:30:00Z',
        codigoError: 'SMTP_TIMEOUT',
        detalleError: 'Tiempo de espera agotado al conectar con el servidor SMTP',
        idCorrelacion: 'corr-notif-004',
      },
      {
        id: 'notif-sal-005',
        tipo: 'PERDIDA_ASIGNATURA_20',
        asunto: 'Notificación oficial de pérdida por inasistencias en Física Mecánica',
        codigoEstado: 'FALLIDA_DEFINITIVA',
        nombreEstado: 'FALLIDA_DEFINITIVA',
        esTerminal: true,
        cantidadDestinatarios: 1,
        intentos: 5,
        creadoEn: '2026-11-05T18:00:00Z',
        codigoError: 'MAILBOX_UNAVAILABLE',
        detalleError: 'Dirección del destinatario no existe o rechazada permanentemente (550)',
        idCorrelacion: 'corr-notif-005',
      },
    ];

    return of(okResponse({
      elementos: itemsMock,
      numeroPagina: 1,
      tamanoPagina: 10,
      totalElementos: itemsMock.length,
      totalPaginas: 1,
      resumen: {
        pendientes: 1,
        reservadas: 0,
        entregadas: 2,
        fallidasReintentables: 1,
        fallidasDefinitivas: 1,
      },
    })).pipe(delay(250));
  }

  if (url.includes('/admin/notificaciones/cola/') && url.endsWith('/reintentar') && method === 'POST') {
    return of(okResponse({ exitoso: true }, 'Notificación reprogramada para reintento inmediato.')).pipe(delay(200));
  }

  if (url.endsWith('/admin/notificaciones/prueba') && method === 'POST') {
    return of(okResponse({ exitoso: true }, 'Correo institucional de prueba despachado con éxito al canal SMTP.')).pipe(delay(350));
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
