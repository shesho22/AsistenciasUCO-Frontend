import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RevisionDecisionModalComponent } from './revision-decision-modal.component';
import { RevisionCancelacionService } from '../../../../core/services/revision-cancelacion.service';
import { MarcaRevisionDocente } from '../../../../core/models/revision-cancelacion.model';
import { apiHttpError } from '../../../../core/testing/api-error.fixture';

describe('RevisionDecisionModalComponent (CULM-001 C.1 §4.4, §4.8)', () => {
  let fixture: ComponentFixture<RevisionDecisionModalComponent>;
  let component: RevisionDecisionModalComponent;
  let serviceMock: jasmine.SpyObj<RevisionCancelacionService>;

  const mockRevision: MarcaRevisionDocente = {
    id: 'rev-1',
    estado: 'PENDIENTE_DOCENTE',
    nombreEstado: 'Pendiente de decisión',
    requiereAccionDocente: true,
    perfilResolutorActual: null,
    accionesPermitidas: ['MANTENER', 'PROPONER'],
  };

  beforeEach(() => {
    serviceMock = jasmine.createSpyObj<RevisionCancelacionService>('RevisionCancelacionService', ['decidir']);
    TestBed.configureTestingModule({
      imports: [RevisionDecisionModalComponent],
      providers: [{ provide: RevisionCancelacionService, useValue: serviceMock }],
    });
    fixture = TestBed.createComponent(RevisionDecisionModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('revision', mockRevision);
    fixture.componentRef.setInput('estudianteNombre', 'Estudiante Juan');
    fixture.detectChanges();
  });

  it('C-F-26 muestra las opciones según accionesPermitidas', () => {
    const radios = fixture.nativeElement.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    expect(radios.length).toBe(2);
    const valores = Array.from(radios).map((r) => r.value);
    expect(valores).toContain('MANTENER');
    expect(valores).toContain('PROPONER');
  });

  it('C-F-27 el motivo es obligatorio y el botón de envío se deshabilita si está vacío', () => {
    const btnSubmit = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btnSubmit.disabled).toBeTrue();

    component.motivo.set('   ');
    fixture.detectChanges();
    expect(btnSubmit.disabled).toBeTrue();

    component.motivo.set('El estudiante se compromete a recuperar.');
    fixture.detectChanges();
    expect(btnSubmit.disabled).toBeFalse();
  });

  it('C-F-28 al proponer pide confirmación antes de enviar', () => {
    component.decision.set('PROPONER');
    component.motivo.set('Superó ampliamente el límite institucional.');
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(component.requiereConfirmacion()).toBeTrue();
    expect(serviceMock.decidir).not.toHaveBeenCalled();
  });

  it('C-F-29 al confirmar registra la decisión y muestra el mensaje del backend (RCN_015)', () => {
    serviceMock.decidir.and.returnValue(
      of({
        exitoso: true,
        datos: {} as never,
        mensajeUsuario: 'El programa no tiene un coordinador disponible: la propuesta se envió a la decanatura de la facultad.',
      })
    );
    spyOn(component.decisionRegistrada, 'emit');

    component.decision.set('PROPONER');
    component.motivo.set('Superó límite.');
    component.confirmarEnvio();
    fixture.detectChanges();

    expect(serviceMock.decidir).toHaveBeenCalledWith('rev-1', {
      decision: 'PROPONER',
      motivo: 'Superó límite.',
    });
    expect(component.decisionRegistrada.emit).toHaveBeenCalled();
  });

  it('C-F-30 ante error del backend muestra el mensaje y mantiene abierto el modal', () => {
    serviceMock.decidir.and.returnValue(
      throwError(() => apiHttpError(409, 'No hay un coordinador ni un decano activo que pueda resolver la propuesta.', 'RCN_013'))
    );

    component.decision.set('PROPONER');
    component.motivo.set('Superó límite.');
    component.confirmarEnvio();
    fixture.detectChanges();

    expect(component.errorMensaje()).toBe('No hay un coordinador ni un decano activo que pueda resolver la propuesta.');
    expect(component.isOpen()).toBeTrue();
  });
});
