import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TeacherClaimsComponent } from './teacher-claims.component';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { SolicitudRevisionItem } from '../../../core/models/role-management.model';

describe('TeacherClaimsComponent', () => {
  let fixture: ComponentFixture<TeacherClaimsComponent>;
  let component: TeacherClaimsComponent;
  let claimServiceSpy: jasmine.SpyObj<AttendanceClaimService>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  const mockReclamos: SolicitudRevisionItem[] = [
    {
      id: 'rec-1',
      estudianteId: 'est-1',
      estudianteNombre: 'Carlos Gómez',
      estudianteCorreo: 'carlos@uco.edu.co',
      materiaId: 'mat-1',
      materiaCodigo: 'IS-101',
      materiaNombre: 'Arquitectura',
      grupo: 'G1',
      sesionId: 'ses-1',
      sesionNumero: 1,
      fechaSesion: '2026-09-10',
      estadoOriginal: 'AUSENTE',
      fechaSolicitud: '2026-09-11',
      estadoSolicitud: 'PENDIENTE',
      justificacionSolicitud: 'Cita médica urgente',
      soporteAdjunto: {
        fileId: 'file-123',
        nombre: 'cita.pdf',
        tipo: 'application/pdf',
        tamanioKb: 200,
        fechaSubida: '2026-09-11',
      },
    },
  ];

  beforeEach(async () => {
    claimServiceSpy = jasmine.createSpyObj('AttendanceClaimService', [
      'getReclamosDocente',
      'resolverReclamo',
      'descargarSoporte',
    ]);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'warning', 'info']);

    claimServiceSpy.getReclamosDocente.and.returnValue(
      of({ exitoso: true, datos: mockReclamos })
    );

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
    claimServiceSpy.getReclamosDocente.and.returnValue(
      throwError(() => ({ status: 501 }))
    );

    component.cargarReclamos();

    expect(component.listUnavailable()).toBeTrue();
    expect(component.listState()).toBe('UNAVAILABLE');
    expect(component.listStateMessage()).toContain('501');
  });

  it('maneja error 403 y otros estados en listStateMessage', () => {
    claimServiceSpy.getReclamosDocente.and.returnValue(
      throwError(() => ({ status: 403, error: { mensajeUsuario: 'Sin acceso' } }))
    );

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
    claimServiceSpy.resolverReclamo.and.returnValue(
      of({ exitoso: true, mensajeUsuario: 'Reclamo aprobado.' })
    );

    component.abrirVistaResolucion(mockReclamos[0]);
    component.comentarioDocente = 'Soporte verificado.';
    component.confirmarResolucion('APROBADA');

    expect(claimServiceSpy.resolverReclamo).toHaveBeenCalledWith(
      'rec-1',
      'APROBADA',
      'Soporte verificado.'
    );
    expect(toastSpy.success).toHaveBeenCalledWith('Reclamo aprobado.');
    expect(component.vistaActual()).toBe('BANDEJA');
  });

  it('confirmarResolucion rechaza el reclamo con feedback por defecto', () => {
    claimServiceSpy.resolverReclamo.and.returnValue(
      of({ exitoso: true, mensajeUsuario: 'Reclamo rechazado.' })
    );

    component.abrirVistaResolucion(mockReclamos[0]);
    component.comentarioDocente = '';
    component.confirmarResolucion('RECHAZADA');

    expect(claimServiceSpy.resolverReclamo).toHaveBeenCalledWith(
      'rec-1',
      'RECHAZADA',
      'No cumple con los soportes requeridos.'
    );
  });

  it('descargarSoporte descarga archivo cuando contiene fileId', () => {
    const mockBlob = new Blob(['pdf'], { type: 'application/pdf' });
    claimServiceSpy.descargarSoporte.and.returnValue(of(mockBlob));

    component.descargarSoporte(mockReclamos[0].soporteAdjunto!);

    expect(claimServiceSpy.descargarSoporte).toHaveBeenCalledWith('file-123');
    expect(toastSpy.success).toHaveBeenCalled();
  });

  it('descargarSoporte emite warning si falta fileId', () => {
    component.descargarSoporte({
      nombre: 'sin-id.pdf',
      tipo: 'application/pdf',
      tamanioKb: 10,
      fechaSubida: '2026-09-10',
    });

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
