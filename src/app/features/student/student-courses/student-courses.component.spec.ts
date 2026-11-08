import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { StudentCoursesComponent } from './student-courses.component';
import { apiHttpError } from '../../../core/testing/api-error.fixture';
import { MatriculaQrService } from '../../../core/services/matricula-qr.service';
import { StudentManagementService } from '../../../core/services/student-management.service';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { AuthService } from '../../../core/services/auth.service';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { CourseService } from '../../../core/services/course.service';
import { SessionService } from '../../../core/services/session.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { SOPORTE_MAX_BYTES } from '../../../core/files/soporte-file.validator';
import { MateriaEstudianteItem, SesionMateriaDetalle } from '../../../core/models/role-management.model';
import {
  ASIGNATURA_ID,
  GRUPO_2_ID,
  GRUPO_ID,
  crearMateria,
  crearSesion,
} from '../../../core/testing/student-portal.fixtures';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { CategoriaJustificacionItem } from '../../../core/models/consultas-transversales.model';

const CATEGORIAS: CategoriaJustificacionItem[] = [
  { id: 'c-1', codigo: 'MED', nombre: 'Médico / Salud', descripcion: 'Enfermedad o cita médica.' },
  { id: 'c-2', codigo: 'OTR', nombre: 'Otro', descripcion: null },
];
const consultasStub = { getCategoriasJustificacion: () => of({ exitoso: true, datos: CATEGORIAS }) };

function archivo(name: string, size: number, type: string): File {
  const file = new File([new Uint8Array(Math.min(size, 8))], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function evento(file: File | null): { event: Event; input: HTMLInputElement } {
  const input = { files: file ? [file] : [], value: 'C:\\fakepath\\x' } as unknown as HTMLInputElement;
  return { event: { target: input } as unknown as Event, input };
}

describe('StudentCoursesComponent — soporte y radicación (LB-004D FE-01..FE-05)', () => {
  let component: StudentCoursesComponent;
  let claims: jasmine.SpyObj<AttendanceClaimService>;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    claims = jasmine.createSpyObj<AttendanceClaimService>('AttendanceClaimService', [
      'subirSoporte', 'crearReclamo', 'getSesionesPorMateria', 'eliminarReclamo', 'getConfiguracionReclamos',
    ]);
    claims.getSesionesPorMateria.and.returnValue(of({ exitoso: true, datos: [] }) as never);
    claims.getConfiguracionReclamos.and.returnValue(of({
      exitoso: true,
      datos: {
        maximoSoportes: 3,
        tamanioMaximoBytes: 5242880,
        tiposPermitidos: ['application/pdf', 'image/jpeg', 'image/png'],
        limiteSubidasPorMinuto: 10,
        diasLimiteJustificacion: 5,
      },
    }) as never);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);

    TestBed.configureTestingModule({
      imports: [StudentCoursesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AttendanceClaimService, useValue: claims },
        { provide: ToastService, useValue: toast },
        { provide: StudentManagementService, useValue: { getMaterias: () => of({ exitoso: true, datos: [] }) } },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'u-1', name: 'Ana', email: 'ana@uco.edu.co' }) } },
        { provide: CourseService, useValue: {} },
        { provide: SessionService, useValue: {} },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
        { provide: ConsultasTransversalesService, useValue: consultasStub },
      ],
    });
    component = TestBed.createComponent(StudentCoursesComponent).componentInstance;
    component.selectedMateria.set(crearMateria({ codigo: 'MAT1', nombre: 'Mate', grupo: 'G1' }));
    component.sesionReclamar.set(
      crearSesion({ id: 's-1', numeroSesion: 3, fecha: '2026-10-19', estadoAsistencia: 'AUSENTE', reclamable: true })
    );
  });

  it('FE-01/02: rechaza un tipo no permitido y un archivo > 5 MiB sin llamar al backend', () => {
    component.onFileSelected(evento(archivo('virus.exe', 10, 'application/x-msdownload')).event);
    expect(claims.subirSoporte).not.toHaveBeenCalled();
    expect(component.errorSoporte()).toContain('Formato no permitido');

    component.onFileSelected(evento(archivo('grande.pdf', SOPORTE_MAX_BYTES + 1, 'application/pdf')).event);
    expect(claims.subirSoporte).not.toHaveBeenCalled();
    expect(component.errorSoporte()).toContain('5 MB');
    expect(component.archivoAdjunto()).toBeNull();
    expect(toast.error).toHaveBeenCalledTimes(2);
  });

  it('FE-03: sube un soporte válido, guarda el fileId y limpia el input para poder reelegir el mismo archivo', () => {
    claims.subirSoporte.and.returnValue(of({ exitoso: true, datos: { fileId: 'f-1', nombre: 'a.pdf', url: '/api/v1/archivos/f-1', tamanio: 2048 } }) as never);
    const { event, input } = evento(archivo('a.pdf', 2048, 'application/pdf'));
    component.onFileSelected(event);

    expect(claims.subirSoporte).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('');
    expect(component.archivoAdjunto()?.fileId).toBe('f-1');
    expect(component.archivoAdjunto()?.urlSimulada).toBe('/api/v1/archivos/f-1');
    expect(component.subiendoSoporte()).toBeFalse();
    expect(component.errorSoporte()).toBeNull();
  });

  it('UTC: la fecha de adjunción se presenta como día civil de la zona seleccionada, no como día UTC (cerca de medianoche)', () => {
    claims.subirSoporte.and.returnValue(of({ exitoso: true, datos: { fileId: 'f-9', nombre: 'a.pdf', url: '/u', tamanio: 10 } }) as never);
    TestBed.inject(SessionTimeZoneService).setManualTimeZone('America/Bogota');
    jasmine.clock().install();
    try {
      // 22:30 del 20-oct en Bogotá (UTC-5) = 03:30 UTC del 21-oct.
      jasmine.clock().mockDate(new Date('2026-10-21T03:30:00Z'));
      component.onFileSelected(evento(archivo('a.pdf', 10, 'application/pdf')).event);
    } finally {
      jasmine.clock().uninstall();
    }

    expect(component.archivoAdjunto()?.fechaSubida).toBe('2026-10-20');
  });

  it('mientras sube, ignora una segunda selección y bloquea la radicación', () => {
    const pendiente = new Subject<never>();
    claims.subirSoporte.and.returnValue(pendiente.asObservable() as never);
    component.onFileSelected(evento(archivo('a.pdf', 10, 'application/pdf')).event);
    component.onFileSelected(evento(archivo('b.pdf', 10, 'application/pdf')).event);
    component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo' });

    expect(component.subiendoSoporte()).toBeTrue();
    expect(claims.subirSoporte).toHaveBeenCalledTimes(1);
    expect(claims.crearReclamo).not.toHaveBeenCalled();
  });

  it('quitar el adjunto durante la subida cancela la petición en vuelo', () => {
    const pendiente = new Subject<never>();
    claims.subirSoporte.and.returnValue(pendiente.asObservable() as never);
    component.onFileSelected(evento(archivo('a.pdf', 10, 'application/pdf')).event);
    expect(pendiente.observed).toBeTrue();
    component.removerAdjunto();

    expect(pendiente.observed).toBeFalse();
    expect(component.subiendoSoporte()).toBeFalse();
    expect(component.archivoAdjunto()).toBeNull();
  });

  it('FE-04: mensajes distintos para sesión vencida, malware/validación, red y servicio caído', () => {
    const mensajes = new Set<string>();
    for (const status of [401, 400, 0, 503]) {
      claims.subirSoporte.and.returnValue(throwError(() => new HttpErrorResponse({
        status,
        error: status === 400 ? { timestamp: 't', status, error: 'Bad Request', code: 'VALIDATION_ERROR', message: 'El archivo fue rechazado: se detecto una firma de malware conocida.', path: '/x', correlationId: null } : null,
      })));
      component.onFileSelected(evento(archivo('a.pdf', 10, 'application/pdf')).event);
      mensajes.add(component.errorSoporte() ?? '');
    }
    expect(mensajes.size).toBe(4);
    expect([...mensajes].some((m) => m.includes('rechazado'))).toBeTrue();
    expect(component.archivoAdjunto()).toBeNull();
  });

  it('FE-05: radica con el soporte fileId y no duplica el envío mientras está en curso', () => {
    claims.subirSoporte.and.returnValue(of({ exitoso: true, datos: { fileId: 'f-1', nombre: 'a.pdf', url: '/api/v1/archivos/f-1', tamanio: 10 } }) as never);
    component.onFileSelected(evento(archivo('a.pdf', 10, 'application/pdf')).event);
    const respuesta = new Subject<never>();
    claims.crearReclamo.and.returnValue(respuesta.asObservable() as never);
    component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo' });
    component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo' });

    expect(claims.crearReclamo).toHaveBeenCalledTimes(1);
    expect(claims.crearReclamo.calls.mostRecent().args[0].soporteAdjunto?.fileId).toBe('f-1');
    expect(component.enviandoReclamo()).toBeTrue();
    respuesta.next({ exitoso: true } as never);
    respuesta.complete();
    expect(component.enviandoReclamo()).toBeFalse();
  });

  it('FE-05: radica sin soporte porque el soporte es opcional', () => {
    claims.crearReclamo.and.returnValue(of({ exitoso: true, mensajeUsuario: 'ok' }) as never);
    component.enviarReclamo({ categoria: 'Otro', justificacion: 'sin archivo' });

    expect(claims.subirSoporte).not.toHaveBeenCalled();
    expect(claims.crearReclamo.calls.mostRecent().args[0].soporteAdjunto).toBeUndefined();
  });

  describe('idempotencia de la radicación (P0-DUP)', () => {
    const intentoDe = (llamada: number): string | undefined => claims.crearReclamo.calls.argsFor(llamada)[1];

    it('cinco clics consecutivos mientras la petición está en curso emiten una sola radicación', () => {
      claims.crearReclamo.and.returnValue(new Subject<never>().asObservable() as never);
      for (let i = 0; i < 5; i++) component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo' });

      expect(claims.crearReclamo).toHaveBeenCalledTimes(1);
      expect(intentoDe(0)).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('un reintento tras timeout del mismo contenido reutiliza la misma correlación y refresca las sesiones', () => {
      claims.crearReclamo.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo' });
      expect(component.enviandoReclamo()).toBeFalse();
      expect(claims.getSesionesPorMateria).toHaveBeenCalledTimes(1);

      component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo' });
      expect(claims.crearReclamo).toHaveBeenCalledTimes(2);
      expect(intentoDe(1)).toBe(intentoDe(0));
    });

    it('un 400 no refresca sesiones, pero conserva la correlación mientras el contenido no cambie', () => {
      claims.crearReclamo.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
      component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo' });
      component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo' });

      expect(claims.getSesionesPorMateria).not.toHaveBeenCalled();
      expect(intentoDe(1)).toBe(intentoDe(0));
    });

    const envelope = (status: number, code: string) => ({
      timestamp: '2026-11-07T00:00:00Z', status, error: 'Error', code, message: '', path: '/api/v1/asistencias/revisiones', correlationId: null,
    });
    const plazoVencido = () =>
      new HttpErrorResponse({
        status: 409,
        error: { ...envelope(409, 'ERR_PLAZO_JUSTIFICACION_VENCIDO'), message: 'El plazo para justificar esta inasistencia venció el 9 de noviembre.' },
      });

    it('409 de plazo vencido: expone el message del backend junto al boton y reactiva el envio', () => {
      claims.crearReclamo.and.returnValue(throwError(() => plazoVencido()));
      component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo' });

      expect(component.errorEnvio()).toBe('El plazo para justificar esta inasistencia venció el 9 de noviembre.');
      expect(component.enviandoReclamo()).toBeFalse();
      expect(toast.error).not.toHaveBeenCalled();
      expect(claims.getSesionesPorMateria).not.toHaveBeenCalled();
    });

    it('el error de plazo se limpia al reintentar', () => {
      claims.crearReclamo.and.returnValue(throwError(() => plazoVencido()));
      component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo' });
      claims.crearReclamo.and.returnValue(new Subject<never>().asObservable() as never);
      component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo' });
      expect(component.errorEnvio()).toBeNull();
    });

    it('500 ERR_CONFIGURACION_PLAZO_JUSTIFICACION: error generico del backend por toast, sin error de plazo', () => {
      claims.crearReclamo.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 500,
        error: { ...envelope(500, 'ERR_CONFIGURACION_PLAZO_JUSTIFICACION'), message: 'No fue posible verificar el plazo de justificación.' },
      })));
      component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo' });

      expect(component.errorEnvio()).toBeNull();
      expect(toast.error).toHaveBeenCalledTimes(1);
    });

    it('un contenido distinto es una solicitud nueva y usa otra correlación', () => {
      claims.crearReclamo.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo A' });
      component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo B' });

      expect(intentoDe(1)).not.toBe(intentoDe(0));
    });

    it('tras una radicación exitosa la siguiente solicitud legítima usa una correlación nueva', () => {
      claims.crearReclamo.and.returnValue(of({ exitoso: true, mensajeUsuario: 'ok' }) as never);
      component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo' });
      component.sesionReclamar.set(
        crearSesion({ id: 's-1', numeroSesion: 3, fecha: '2026-10-19', estadoAsistencia: 'AUSENTE', reclamable: true })
      );
      component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo' });

      expect(claims.crearReclamo).toHaveBeenCalledTimes(2);
      expect(intentoDe(1)).not.toBe(intentoDe(0));
    });

    it('el error libera el bloqueo para que el estudiante pueda reintentar', () => {
      claims.crearReclamo.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
      component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo' });

      expect(component.enviandoReclamo()).toBeFalse();
    });
  });

  it('un 404 al radicar con soporte descarta el adjunto y pide adjuntarlo de nuevo', () => {
    claims.subirSoporte.and.returnValue(of({ exitoso: true, datos: { fileId: 'f-1', nombre: 'a.pdf', url: '/u', tamanio: 10 } }) as never);
    component.onFileSelected(evento(archivo('a.pdf', 10, 'application/pdf')).event);
    claims.crearReclamo.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo' });

    expect(component.archivoAdjunto()).toBeNull();
    expect(component.errorSoporte()).toContain('ya no está disponible');
    expect(component.enviandoReclamo()).toBeFalse();
  });

  describe('CULM-001 D.2 — soporte múltiple y estado individual por archivo (HU015, HU014)', () => {
    it('carga la configuración de reclamos al iniciar', () => {
      expect(claims.getConfiguracionReclamos).toHaveBeenCalled();
      expect(component.configuracionReclamos()?.maximoSoportes).toBe(3);
    });

    it('mantiene el estado individual de subida: si el segundo archivo es rechazado por antivirus o 429, no afecta al primero', () => {
      claims.subirSoporte.and.returnValues(
        of({ exitoso: true, datos: { fileId: 'f-1', nombre: 'a.pdf', url: '/api/v1/archivos/f-1', tamanio: 1024 } }) as never,
        throwError(() => new HttpErrorResponse({
          status: 400,
          error: { message: 'El archivo contiene malware según ClamAV.' },
        })) as never
      );

      component.onFileSelected(evento(archivo('a.pdf', 1024, 'application/pdf')).event);
      component.onFileSelected(evento(archivo('b.pdf', 2048, 'application/pdf')).event);

      const adjuntos = component.archivosAdjuntos();
      expect(adjuntos.length).toBe(2);
      expect(adjuntos[0].estado).toBe('LISTO');
      expect(adjuntos[0].fileId).toBe('f-1');
      expect(adjuntos[1].estado).toBe('RECHAZADO');
      expect(adjuntos[1].error).toContain('malware');
    });

    it('enviarReclamo envía únicamente los fileIds de archivos con estado LISTO', () => {
      claims.crearReclamo.and.returnValue(of({ exitoso: true, mensajeUsuario: 'Reclamo enviado.' }) as never);
      component.selectedMateria.set({ id: 'mat-1', nombre: 'Materia 1', docente: 'Docente 1' } as never);
      component.sesionReclamar.set({ id: 'ses-1', numeroSesion: 1, fecha: '2026-10-10', horario: '10:00', estadoAsistencia: 'AUSENTE', reclamable: true, tema: 'Tema' } as never);

      component.archivosAdjuntos.set([
        { fileId: 'f-valido-1', nombre: 'valido1.pdf', estado: 'LISTO', tipo: 'application/pdf', tamanioKb: 10, fechaSubida: '2026-10-10' },
        { fileId: undefined, nombre: 'rechazado.exe', estado: 'RECHAZADO', error: 'Infectado', tipo: 'application/pdf', tamanioKb: 10, fechaSubida: '2026-10-10' },
      ]);

      component.enviarReclamo({ categoria: 'Médico', justificacion: 'Justificación médica' });

      expect(claims.crearReclamo).toHaveBeenCalledTimes(1);
      const peticion = claims.crearReclamo.calls.mostRecent().args[0];
      expect(peticion.soporteArchivoIds).toEqual(['f-valido-1']);
      expect(peticion.soporteArchivoIds).not.toContain('rechazado.exe');
    });

    it('removerAdjunto con índice remueve ese archivo específico', () => {
      component.archivosAdjuntos.set([
        { fileId: 'f-1', nombre: '1.pdf', estado: 'LISTO', tipo: 'application/pdf', tamanioKb: 10, fechaSubida: '2026-10-10' },
        { fileId: 'f-2', nombre: '2.pdf', estado: 'LISTO', tipo: 'application/pdf', tamanioKb: 20, fechaSubida: '2026-10-10' },
      ]);

      component.removerAdjunto(0);
      expect(component.archivosAdjuntos().length).toBe(1);
      expect(component.archivosAdjuntos()[0].fileId).toBe('f-2');
    });
  });
});

describe('StudentCoursesComponent', () => {
  let fixture: ComponentFixture<StudentCoursesComponent>;
  let component: StudentCoursesComponent;
  let studentServiceSpy: jasmine.SpyObj<StudentManagementService>;
  let claimServiceSpy: jasmine.SpyObj<AttendanceClaimService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastSpy: jasmine.SpyObj<ToastService>;
  let matriculaQrSpy: jasmine.SpyObj<MatriculaQrService>;

  const mockMaterias: MateriaEstudianteItem[] = [crearMateria({ nombre: 'Arquitectura de Software' })];

  const mockSesiones: SesionMateriaDetalle[] = [
    crearSesion({ id: 'ses-1', numeroSesion: 1, tema: 'Clean Architecture', estadoAsistencia: 'AUSENTE', reclamable: true, reclamoId: 'rec-1' }),
  ];

  beforeEach(async () => {
    studentServiceSpy = jasmine.createSpyObj('StudentManagementService', ['getMaterias']);
    claimServiceSpy = jasmine.createSpyObj('AttendanceClaimService', ['getSesionesPorMateria', 'crearReclamo', 'eliminarReclamo', 'subirSoporte', 'getConfiguracionReclamos']);
    claimServiceSpy.getConfiguracionReclamos.and.returnValue(of({
      exitoso: true,
      datos: {
        maximoSoportes: 3,
        tamanioMaximoBytes: 5242880,
        tiposPermitidos: ['application/pdf'],
        limiteSubidasPorMinuto: 10,
        diasLimiteJustificacion: 5,
      },
    }) as never);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['currentUser']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    routerSpy.navigate.and.resolveTo(true);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    matriculaQrSpy = jasmine.createSpyObj('MatriculaQrService', ['matricularAutenticado']);
    studentServiceSpy.getMaterias.and.returnValue(of({ exitoso: true, datos: mockMaterias }));
    claimServiceSpy.getSesionesPorMateria.and.returnValue(of({ exitoso: true, datos: mockSesiones }));

    await TestBed.configureTestingModule({
      imports: [StudentCoursesComponent],
      providers: [
        { provide: StudentManagementService, useValue: studentServiceSpy },
        { provide: AttendanceClaimService, useValue: claimServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ToastService, useValue: toastSpy },
        { provide: MatriculaQrService, useValue: matriculaQrSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: ConsultasTransversalesService, useValue: consultasStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentCoursesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe inicializarse y cargar materias del estudiante', () => {
    expect(component).toBeTruthy();
    expect(component.materias().length).toBe(1);
    expect(component.totalCreditos()).toBe(0);
    // Sin indicadores autoritativos: no hay promedio ni fallas (nunca 0 ni NaN).
    expect(component.materiasEnRiesgo()).toBeNull();
    expect(component.totalHorasFalta()).toBeNull();
  });

  it('HU005/HU016: carga los motivos de justificación del catálogo y los muestra en el detalle', () => {
    expect(component.categoriasJustificacion()).toEqual(CATEGORIAS);
    component.verDetalleCompleto(mockMaterias[0]);
    fixture.detectChanges();
    const motivos = fixture.nativeElement.querySelector('[data-testid="motivos-justificacion"]') as HTMLElement;
    expect(motivos).withContext('bloque de motivos').not.toBeNull();
    expect(motivos.textContent).toContain('Médico / Salud');
    expect(motivos.textContent).toContain('Enfermedad o cita médica.');
  });

  it('HU005: si el catálogo falla, queda vacío (sin lista fija de respaldo)', () => {
    const consultas = TestBed.inject(ConsultasTransversalesService) as unknown as typeof consultasStub;
    spyOn(consultas, 'getCategoriasJustificacion').and.returnValue(throwError(() => new Error('x')) as never);
    component.cargarCategoriasJustificacion();
    expect(component.categoriasJustificacion()).toEqual([]);
  });

  it('F-EST-S18: el catalogo de motivos se pide una sola vez por visita, aunque se abra el detalle y los motivos', () => {
    const espia = spyOn(consultasStub, 'getCategoriasJustificacion').and.callThrough();
    const otro = TestBed.createComponent(StudentCoursesComponent);
    otro.detectChanges();
    otro.componentInstance.verDetalleCompleto(mockMaterias[0]);
    otro.detectChanges();
    otro.componentInstance.volverALista();
    otro.componentInstance.verDetalleCompleto(mockMaterias[0]);
    otro.detectChanges();

    expect(espia).toHaveBeenCalledTimes(1);
  });

  it('permite ver detalle completo de sesiones y regresar a la lista', () => {
    component.verDetalleCompleto(mockMaterias[0]);
    expect(component.vistaActual()).toBe('DETALLE');
    expect(component.selectedMateria()?.id).toBe(ASIGNATURA_ID);
    expect(claimServiceSpy.getSesionesPorMateria).toHaveBeenCalledWith(ASIGNATURA_ID);
    expect(component.sesiones().length).toBe(1);
    component.volverALista();
    expect(component.vistaActual()).toBe('LISTA');
    expect(component.selectedMateria()).toBeNull();
  });

  it('permite iniciar y enviar un reclamo con éxito', () => {
    component.selectedMateria.set(mockMaterias[0]);
    component.iniciarReclamo(mockSesiones[0]);
    expect(component.vistaActual()).toBe('RECLAMO');
    expect(component.sesionReclamar()?.id).toBe('ses-1');
    claimServiceSpy.crearReclamo.and.returnValue(of({ exitoso: true, mensajeUsuario: 'Reclamo radicado.' } as any));
    component.enviarReclamo({ categoria: 'Médico / Salud', justificacion: 'Estuve incapacitado por gripa fuerte.' });
    expect(claimServiceSpy.crearReclamo).toHaveBeenCalled();
    expect(toastSpy.success).toHaveBeenCalledWith('Reclamo radicado.');
    expect(component.vistaActual()).toBe('DETALLE');
  });

  it('A2-F-01 retirar un reclamo llama a eliminarReclamo(id), muestra el mensaje del backend y recarga las sesiones', () => {
    component.selectedMateria.set(mockMaterias[0]);
    claimServiceSpy.eliminarReclamo.and.returnValue(of({ exitoso: true, mensaje: 'La solicitud de revisión fue retirada.' }));
    claimServiceSpy.getSesionesPorMateria.calls.reset();
    component.retirarReclamo(mockSesiones[0]);
    expect(claimServiceSpy.eliminarReclamo).toHaveBeenCalledOnceWith('rec-1');
    expect(toastSpy.success).toHaveBeenCalledWith('La solicitud de revisión fue retirada.');
    expect(claimServiceSpy.getSesionesPorMateria).toHaveBeenCalled();
  });

  it('A2-F-01 un error al retirar muestra el message del backend', () => {
    component.selectedMateria.set(mockMaterias[0]);
    claimServiceSpy.eliminarReclamo.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Solo se puede retirar una solicitud de revisión pendiente.' } }))
    );
    component.retirarReclamo(mockSesiones[0]);
    expect(toastSpy.error).toHaveBeenCalledWith('Solo se puede retirar una solicitud de revisión pendiente.');
  });

  it('B2-F-17 "Registrar asistencia con PIN" lleva a /app/asistencia/pin (F-EST-005, F-EST-017)', () => {
    component.irARegistroConPin();
    expect(routerSpy.navigate).toHaveBeenCalledOnceWith(['/app/asistencia/pin']);
  });

  it('HU176B: registra la matrícula con el PIN de 6 dígitos usando el servicio de matrícula por QR', () => {
    matriculaQrSpy.matricularAutenticado.and.returnValue(of({ idGrupo: 'g-1' }));
    component.abrirModalMatriculaGrupo();
    expect(component.modalMatriculaGrupoVisible()).toBeTrue();
    component.enviarMatriculaPorCodigo('482913');
    expect(matriculaQrSpy.matricularAutenticado).toHaveBeenCalledOnceWith({ pin: '482913' });
    expect(toastSpy.success).toHaveBeenCalled();
    expect(component.modalMatriculaGrupoVisible()).toBeFalse();
  });

  it('HU176B: un PIN que no tiene 6 dígitos (p. ej. el id del grupo) no llega al backend', () => {
    component.enviarMatriculaPorCodigo('GRP-101');
    component.enviarMatriculaPorCodigo('');
    expect(matriculaQrSpy.matricularAutenticado).not.toHaveBeenCalled();
    expect(toastSpy.error).toHaveBeenCalledTimes(2);
  });

  it('HU176B: un error del backend se muestra tal cual y el modal sigue abierto', () => {
    matriculaQrSpy.matricularAutenticado.and.returnValue(
      throwError(() => apiHttpError(403, 'Solo desde la red Wi-Fi del campus.')));
    component.abrirModalMatriculaGrupo();
    component.enviarMatriculaPorCodigo('482913');
    expect(toastSpy.error).toHaveBeenCalledWith('Solo desde la red Wi-Fi del campus.');
    expect(component.modalMatriculaGrupoVisible()).toBeTrue();
    expect(component.procesandoMatriculaGrupo()).toBeFalse();
  });
});

describe('StudentCoursesComponent — contrato real y estados de carga (HTTP)', () => {
  let fixture: ComponentFixture<StudentCoursesComponent>;
  let component: StudentCoursesComponent;
  let http: HttpTestingController;
  let toast: jasmine.SpyObj<ToastService>;

  const MATERIAS_URL = `${environment.apiUrl}/estudiante/materias`;
  const sesionesUrl = (id: string) => `${MATERIAS_URL}/${id}/sesiones`;
  const materiaApi = (over: Record<string, unknown> = {}) => ({
    idAsignatura: ASIGNATURA_ID,
    nombreAsignatura: 'Arquitectura de Software',
    idGrupo: GRUPO_ID,
    nombreGrupo: 'Grupo 001 - Arq Software',
    ...over,
  });
  const sesionApi = (over: Record<string, unknown> = {}) => ({
    id: 'd1d2d3d4-0000-4000-8000-000000000001',
    nombre: 'Introducción',
    numero: 1,
    codigo: 'SES-01',
    numeroSemana: 1,
    idGrupo: GRUPO_ID,
    codigoGrupo: '001',
    nombreGrupo: 'Grupo 001 - Arq Software',
    fechaHoraInicio: '2026-10-19T13:00:00Z',
    fechaHoraFin: '2026-10-19T15:00:00Z',
    ...over,
  });

  const texto = () => fixture.nativeElement.textContent as string;
  const clickTexto = (contenido: string) => {
    const boton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((b) => b.textContent?.includes(contenido));
    expect(boton).withContext(`boton "${contenido}"`).toBeDefined();
    boton!.click();
    fixture.detectChanges();
  };

  function cargar(materias: unknown[]): void {
    fixture = TestBed.createComponent(StudentCoursesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(MATERIAS_URL).flush({ exitoso: true, datos: materias, total: materias.length });
    fixture.detectChanges();
  }

  beforeEach(async () => {
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);
    await TestBed.configureTestingModule({
      imports: [StudentCoursesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toast },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'u-1', name: 'Ana', email: 'ana@uco.edu.co' }) } },
        { provide: CourseService, useValue: {} },
        { provide: SessionService, useValue: {} },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
        { provide: ConsultasTransversalesService, useValue: consultasStub },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('muestra la materia del contrato real con su grupo, sin NaN ni valores inventados', () => {
    cargar([materiaApi()]);

    expect(texto()).toContain('Arquitectura de Software');
    expect(texto()).toContain('Grupo 001 - Arq Software');
    expect(texto()).not.toContain('NaN');
    expect(texto()).not.toContain('undefined');
    expect(texto()).not.toContain('null');
    expect(fixture.nativeElement.querySelector('[data-testid="asistencia-no-disponible"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="riesgo-no-disponible"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="horas-falta-no-disponible"]')).not.toBeNull();
    expect(texto()).toContain('No informado');
  });

  it('Ver Detalle consulta /materias/{idAsignatura}/sesiones con el UUID y la URL nunca contiene undefined', () => {
    cargar([materiaApi()]);
    clickTexto('Ver Detalle');

    const req = http.expectOne(sesionesUrl(ASIGNATURA_ID));
    expect(req.request.method).toBe('GET');
    expect(req.request.url).not.toContain('undefined');
    expect(req.request.url).not.toContain('null');
    req.flush({ exitoso: true, datos: [sesionApi()], total: 1 });
    fixture.detectChanges();

    expect(component.vistaActual()).toBe('DETALLE');
    expect(component.sesiones().length).toBe(1);
    expect(texto()).toContain('Introducción');
  });

  it('con varios grupos de la misma asignatura muestra una tarjeta por grupo y filtra las sesiones por idGrupo', () => {
    cargar([
      materiaApi(),
      materiaApi({ idGrupo: GRUPO_2_ID, nombreGrupo: 'Grupo 002 - Arq Software' }),
    ]);
    expect(component.materias().length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('[data-testid="materia-grupo"]').length).toBe(2);

    component.verDetalleCompleto(component.materias()[1]);
    http.expectOne(sesionesUrl(ASIGNATURA_ID)).flush({
      exitoso: true,
      total: 2,
      datos: [
        sesionApi({ id: 'd1d2d3d4-0000-4000-8000-0000000000a1', nombre: 'Sesión grupo 1', idGrupo: GRUPO_ID }),
        sesionApi({ id: 'd1d2d3d4-0000-4000-8000-0000000000a2', nombre: 'Sesión grupo 2', idGrupo: GRUPO_2_ID }),
      ],
    });

    expect(component.sesiones().map((s) => s.tema)).toEqual(['Sesión grupo 2']);
  });

  it('una respuesta 200 con cero sesiones muestra estado vacio, sin error', () => {
    cargar([materiaApi()]);
    clickTexto('Ver Detalle');
    http.expectOne(sesionesUrl(ASIGNATURA_ID)).flush({ exitoso: true, datos: [], total: 0 });
    fixture.detectChanges();

    expect(component.sesionesError()).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="sesiones-vacio"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="sesiones-error"]')).toBeNull();
  });

  const casosError: Array<[string, number, string]> = [
    ['validacion 400 (INVALID_REQUEST)', 400, 'VALIDACION'],
    ['no autenticado 401', 401, 'AUTORIZACION'],
    ['prohibido 403', 403, 'AUTORIZACION'],
    ['fallo de servidor 500', 500, 'SERVIDOR'],
    ['red caida (status 0)', 0, 'RED'],
  ];
  for (const [nombre, status, kind] of casosError) {
    it(`un ${nombre} se muestra como error ${kind} y NO como "0 sesiones registradas"`, () => {
      cargar([materiaApi()]);
      clickTexto('Ver Detalle');
      const req = http.expectOne(sesionesUrl(ASIGNATURA_ID));
      if (status === 0) {
        req.error(new ProgressEvent('error'));
      } else {
        req.flush(
          status === 400
            ? { timestamp: 't', status: 400, error: 'Bad Request', code: 'INVALID_REQUEST', message: 'materiaId inválido', path: '/x', correlationId: null }
            : null,
          { status, statusText: 'err' }
        );
      }
      fixture.detectChanges();

      expect(component.sesionesError()?.kind).toBe(kind as never);
      expect(component.sesiones()).toEqual([]);
      expect(fixture.nativeElement.querySelector('[data-testid="sesiones-error"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="sesiones-vacio"]')).toBeNull();
      expect(texto()).not.toContain('0 sesiones');
    });
  }

  it('Reintentar vuelve a consultar y recupera las sesiones', () => {
    cargar([materiaApi()]);
    clickTexto('Ver Detalle');
    http.expectOne(sesionesUrl(ASIGNATURA_ID)).flush(null, { status: 500, statusText: 'err' });
    fixture.detectChanges();

    clickTexto('Reintentar');
    http.expectOne(sesionesUrl(ASIGNATURA_ID)).flush({ exitoso: true, datos: [sesionApi()], total: 1 });
    fixture.detectChanges();

    expect(component.sesionesError()).toBeNull();
    expect(component.sesiones().length).toBe(1);
  });

  it('una materia con identificador invalido jamas emite una peticion de sesiones', () => {
    cargar([materiaApi()]);
    component.verDetalleCompleto(crearMateria({ id: 'undefined' }));
    fixture.detectChanges();

    http.expectNone((r) => r.url.includes('/sesiones'));
    expect(component.sesionesError()?.kind).toBe('IDENTIFICADOR');
  });

  it('un fallo al cargar materias se muestra como error con reintento y no como "sin asignaturas"', () => {
    fixture = TestBed.createComponent(StudentCoursesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(MATERIAS_URL).flush(null, { status: 500, statusText: 'err' });
    fixture.detectChanges();

    expect(component.materiasError()?.kind).toBe('SERVIDOR');
    expect(fixture.nativeElement.querySelector('[data-testid="materias-error"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="materias-vacio"]')).toBeNull();
  });

  it('sin estado autoritativo de asistencia no se puede iniciar un reclamo ni radicarlo', () => {
    cargar([materiaApi()]);
    component.verDetalleCompleto(component.materias()[0]);
    http.expectOne(sesionesUrl(ASIGNATURA_ID)).flush({ exitoso: true, datos: [sesionApi()], total: 1 });
    fixture.detectChanges();

    expect(component.sesiones()[0].estadoAsistencia).toBe('NO_DISPONIBLE');
    expect(component.sesiones()[0].reclamable).toBeFalse();
    component.iniciarReclamo(component.sesiones()[0]);
    expect(component.vistaActual()).toBe('DETALLE');
    expect(component.sesionReclamar()).toBeNull();
    expect(texto()).not.toContain('Radicar Reclamo');

    component.sesionReclamar.set(component.sesiones()[0]);
    component.enviarReclamo({ categoria: 'Otro', justificacion: 'motivo' });
    http.expectNone((r) => r.url.includes('/asistencias/revisiones'));
  });

  it('una ausencia confirmada y reclamable por el backend habilita Radicar Reclamo y abre el formulario', () => {
    cargar([materiaApi()]);
    component.verDetalleCompleto(component.materias()[0]);
    http.expectOne(sesionesUrl(ASIGNATURA_ID)).flush({
      exitoso: true,
      datos: [sesionApi({ estadoAsistencia: 'AUSENTE', estadoSolicitudRevision: null, reclamable: true })],
      total: 1,
    });
    fixture.detectChanges();

    expect(component.sesiones()[0].estadoAsistencia).toBe('AUSENTE');
    expect(texto()).toContain('Radicar Reclamo');
    component.iniciarReclamo(component.sesiones()[0]);
    expect(component.vistaActual()).toBe('RECLAMO');
    expect(component.sesionReclamar()?.id).toBe('d1d2d3d4-0000-4000-8000-000000000001');
  });

  it('una ausencia con solicitud ya radicada no abre un segundo formulario', () => {
    cargar([materiaApi()]);
    component.verDetalleCompleto(component.materias()[0]);
    http.expectOne(sesionesUrl(ASIGNATURA_ID)).flush({
      exitoso: true,
      datos: [sesionApi({ estadoAsistencia: 'AUSENTE', estadoSolicitudRevision: 'pendiente', reclamable: false })],
      total: 1,
    });
    fixture.detectChanges();

    expect(component.sesiones()[0].solicitudRevision).toBe('PENDIENTE');
    expect(texto()).not.toContain('Radicar Reclamo');
    expect(texto()).toContain('Solicitud de revisión: pendiente');
    component.iniciarReclamo(component.sesiones()[0]);
    expect(component.vistaActual()).toBe('DETALLE');
    expect(component.sesionReclamar()).toBeNull();
  });

  it('una sesion JUSTIFICADA o PRESENTE no ofrece reclamo aunque el backend enviara reclamable', () => {
    cargar([materiaApi()]);
    component.verDetalleCompleto(component.materias()[0]);
    http.expectOne(sesionesUrl(ASIGNATURA_ID)).flush({
      exitoso: true,
      datos: [
        sesionApi({ id: 'd1d2d3d4-0000-4000-8000-0000000000b1', estadoAsistencia: 'JUSTIFICADA', reclamable: true }),
        sesionApi({ id: 'd1d2d3d4-0000-4000-8000-0000000000b2', estadoAsistencia: 'PRESENTE', reclamable: true }),
      ],
      total: 2,
    });
    fixture.detectChanges();

    component.sesiones().forEach((sesion) => expect(sesion.reclamable).toBeFalse());
    expect(texto()).not.toContain('Radicar Reclamo');
  });

  it('un estudiante no dispara ninguna peticion /coordinador/** ni /admin/** al cargar el portal', () => {
    cargar([materiaApi()]);
    component.verDetalleCompleto(component.materias()[0]);
    http.expectOne(sesionesUrl(ASIGNATURA_ID)).flush({ exitoso: true, datos: [], total: 0 });

    http.expectNone((r) => r.url.includes('/coordinador/') || r.url.includes('/admin/') || r.url.includes('/decano/'));
    expect(component.materias().length).toBe(1);
  });
});
