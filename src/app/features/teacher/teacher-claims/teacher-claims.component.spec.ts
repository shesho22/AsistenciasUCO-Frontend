import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { TeacherClaimsComponent } from './teacher-claims.component';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { SolicitudRevisionItem } from '../../../core/models/role-management.model';

describe('TeacherClaimsComponent — descarga de soporte (LB-004D FE-06)', () => {
  let component: TeacherClaimsComponent;
  let claims: jasmine.SpyObj<AttendanceClaimService>;
  let toast: jasmine.SpyObj<ToastService>;
  const adjunto = { fileId: 'f-1', nombre: 'evi/dencia?.pdf', tipo: 'application/pdf', tamanioKb: 2, fechaSubida: '2026-10-19' };

  beforeEach(() => {
    claims = jasmine.createSpyObj<AttendanceClaimService>('AttendanceClaimService', ['getReclamosDocente', 'descargarSoporte', 'resolverReclamo']);
    claims.getReclamosDocente.and.returnValue(of({ exitoso: true, datos: [] }) as never);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);
    TestBed.configureTestingModule({
      imports: [TeacherClaimsComponent],
      providers: [
        { provide: AttendanceClaimService, useValue: claims },
        { provide: ToastService, useValue: toast },
      ],
    });
    component = TestBed.createComponent(TeacherClaimsComponent).componentInstance;
  });

  it('descarga por HttpClient (Blob), sanea el nombre y nunca abre una URL', () => {
    claims.descargarSoporte.and.returnValue(of(new Blob(['x'], { type: 'application/pdf' })));
    const createUrl = spyOn(URL, 'createObjectURL').and.returnValue('blob:x');
    const revoke = spyOn(URL, 'revokeObjectURL');
    const abrir = spyOn(window, 'open');
    const anchor = document.createElement('a');
    const click = spyOn(anchor, 'click');
    spyOn(document, 'createElement').and.returnValue(anchor);

    component.descargarSoporte(adjunto);

    expect(claims.descargarSoporte).toHaveBeenCalledOnceWith('f-1');
    expect(createUrl).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(anchor.download).toBe('evi_dencia_.pdf');
    expect(revoke).toHaveBeenCalledWith('blob:x');
    expect(abrir).not.toHaveBeenCalled();
    expect(anchor.href).not.toContain('token');
    expect(component.descargandoSoporte()).toBeFalse();
  });

  it('sin fileId advierte y no consulta el backend', () => {
    component.descargarSoporte({ ...adjunto, fileId: undefined });
    expect(claims.descargarSoporte).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalled();
  });

  it('ignora un segundo clic mientras la descarga está en curso', () => {
    const pendiente = new Subject<Blob>();
    claims.descargarSoporte.and.returnValue(pendiente.asObservable());
    component.descargarSoporte(adjunto);
    component.descargarSoporte(adjunto);
    expect(claims.descargarSoporte).toHaveBeenCalledTimes(1);
    expect(component.descargandoSoporte()).toBeTrue();
  });

  it('pérdida de autorización (404) y sesión vencida (401) tienen mensajes claros y distintos', () => {
    const mensajes: string[] = [];
    for (const status of [404, 401]) {
      claims.descargarSoporte.and.returnValue(throwError(() => new HttpErrorResponse({ status })));
      component.descargarSoporte(adjunto);
      mensajes.push(toast.error.calls.mostRecent().args[0] as string);
    }
    expect(mensajes[0]).toContain('ya no tienes autorización');
    expect(mensajes[1]).toContain('sesión expiró');
    expect(mensajes[0]).not.toBe(mensajes[1]);
    expect(component.descargandoSoporte()).toBeFalse();
  });
});

describe('TeacherClaimsComponent', () => {
  let fixture: ComponentFixture<TeacherClaimsComponent>;
  let component: TeacherClaimsComponent;
  let claimServiceSpy: jasmine.SpyObj<AttendanceClaimService>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  const mockReclamos: SolicitudRevisionItem[] = [{
    id: 'rec-1', estudianteId: 'est-1', estudianteNombre: 'Carlos Gómez', estudianteCorreo: 'carlos@uco.edu.co',
    materiaId: 'mat-1', materiaCodigo: 'IS-101', materiaNombre: 'Arquitectura', grupo: 'G1', sesionId: 'ses-1',
    sesionNumero: 1, fechaSesion: '2026-09-10', estadoOriginal: 'AUSENTE', fechaSolicitud: '2026-09-11',
    estadoSolicitud: 'PENDIENTE', justificacionSolicitud: 'Cita médica urgente',
    soporteAdjunto: { fileId: 'file-123', nombre: 'cita.pdf', tipo: 'application/pdf', tamanioKb: 200, fechaSubida: '2026-09-11' },
  }];

  beforeEach(async () => {
    claimServiceSpy = jasmine.createSpyObj('AttendanceClaimService', ['getReclamosDocente', 'resolverReclamo', 'descargarSoporte']);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'warning', 'info']);
    claimServiceSpy.getReclamosDocente.and.returnValue(of({ exitoso: true, datos: mockReclamos }));
    await TestBed.configureTestingModule({
      imports: [TeacherClaimsComponent],
      providers: [
        { provide: AttendanceClaimService, useValue: claimServiceSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TeacherClaimsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse y cargar reclamos exitosamente', () => {
    expect(component).toBeTruthy();
    expect(component.reclamos().length).toBe(1);
    expect(component.totalPendientes()).toBe(1);
    expect(component.listState()).toBe('LOADED');
  });

  it('maneja error 501 marcando listUnavailable', () => {
    claimServiceSpy.getReclamosDocente.and.returnValue(throwError(() => ({ status: 501 })));
    component.cargarReclamos();
    expect(component.listUnavailable()).toBeTrue();
    expect(component.listState()).toBe('UNAVAILABLE');
    expect(component.listStateMessage()).toContain('501');
  });

  it('maneja error 403 y otros estados en listStateMessage', () => {
    claimServiceSpy.getReclamosDocente.and.returnValue(throwError(() => ({ status: 403, error: { mensajeUsuario: 'Sin acceso' } })));
    component.cargarReclamos();
    expect(component.listState()).toBe('FORBIDDEN');
    expect(component.listStateMessage()).toContain('403');
    expect(toastSpy.error).toHaveBeenCalled();
  });

  it('permite abrir vista de resolución y volver a bandeja', () => {
    component.abrirVistaResolucion(mockReclamos[0]);
    expect(component.vistaActual()).toBe('RESOLUCION');
    expect(component.selectedReclamo()?.id).toBe('rec-1');
    component.volverABandeja();
    expect(component.vistaActual()).toBe('BANDEJA');
    expect(component.selectedReclamo()).toBeNull();
  });

  it('confirmarResolucion aprueba el reclamo con comentario', () => {
    claimServiceSpy.resolverReclamo.and.returnValue(of({ exitoso: true, mensajeUsuario: 'Reclamo aprobado.' }));
    component.abrirVistaResolucion(mockReclamos[0]);
    component.comentarioDocente = 'Soporte verificado.';
    component.confirmarResolucion('APROBADA');
    expect(claimServiceSpy.resolverReclamo).toHaveBeenCalledWith('rec-1', 'APROBADA', 'Soporte verificado.');
    expect(toastSpy.success).toHaveBeenCalledWith('Reclamo aprobado.');
    expect(component.vistaActual()).toBe('BANDEJA');
  });

  it('confirmarResolucion rechaza el reclamo con feedback por defecto', () => {
    claimServiceSpy.resolverReclamo.and.returnValue(of({ exitoso: true, mensajeUsuario: 'Reclamo rechazado.' }));
    component.abrirVistaResolucion(mockReclamos[0]);
    component.comentarioDocente = '';
    component.confirmarResolucion('RECHAZADA');
    expect(claimServiceSpy.resolverReclamo).toHaveBeenCalledWith('rec-1', 'RECHAZADA', 'No cumple con los soportes requeridos.');
  });

  it('descargarSoporte descarga archivo cuando contiene fileId', () => {
    claimServiceSpy.descargarSoporte.and.returnValue(of(new Blob(['pdf'], { type: 'application/pdf' })));
    component.descargarSoporte(mockReclamos[0].soporteAdjunto!);
    expect(claimServiceSpy.descargarSoporte).toHaveBeenCalledWith('file-123');
    expect(toastSpy.success).toHaveBeenCalled();
  });

  it('descargarSoporte emite warning si falta fileId', () => {
    component.descargarSoporte({ nombre: 'sin-id.pdf', tipo: 'application/pdf', tamanioKb: 10, fechaSubida: '2026-09-10' });
    expect(claimServiceSpy.descargarSoporte).not.toHaveBeenCalled();
    expect(toastSpy.warning).toHaveBeenCalled();
  });

  it('asigna variantes de badge adecuadas según estado', () => {
    expect(component.getReclamoBadgeVariant('APROBADA')).toBe('success');
    expect(component.getReclamoBadgeVariant('RECHAZADA')).toBe('danger');
    expect(component.getReclamoBadgeVariant('PENDIENTE')).toBe('warning');
    expect(component.getReclamoBadgeVariant('OTRO' as any)).toBe('neutral');
  });
});
