import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RevisionDecisionModalComponent } from './revision-decision-modal.component';
import { RevisionCancelacionService } from '../../../core/services/revision-cancelacion.service';
import { MarcaRevisionDocente } from '../../../core/models/revision-cancelacion.model';
import { apiHttpError } from '../../../core/testing/api-error.fixture';
import { mensajeUi } from '../../../core/messages/mensajes-ui';

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

  describe('sin valor por defecto de negocio (CIERRE-W2B, F-DOC-01)', () => {
    const radios = () => Array.from(fixture.nativeElement.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>).map((r) => r.value);
    const sinAcciones = () => fixture.nativeElement.querySelector('[data-testid="decision-sin-acciones"]') as HTMLElement | null;

    function abrirCon(revision: unknown): void {
      fixture.componentRef.setInput('revision', revision);
      fixture.detectChanges();
    }

    it('con la lista vacia no ofrece ninguna accion, explica por que con el texto del catalogo y no deja enviar', () => {
      abrirCon({ id: 'rev-2', accionesPermitidas: [] });

      expect(radios()).toEqual([]);
      expect(component.opciones()).toEqual([]);
      expect(sinAcciones()).not.toBeNull();
      expect(sinAcciones()!.textContent).toContain(mensajeUi('UI_TEACHER_REVISION_DECISION_MODAL_001'));
      expect(fixture.nativeElement.querySelector('button[type="submit"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });

    it('con la lista ausente (null o sin el campo) tampoco inventa MANTENER ni PROPONER', () => {
      abrirCon({ id: 'rev-3', accionesPermitidas: null });
      expect(radios()).toEqual([]);
      expect(sinAcciones()).not.toBeNull();

      abrirCon({ id: 'rev-4' });
      expect(radios()).toEqual([]);
      expect(component.isSubmitDisabled()).toBeTrue();
    });

    it('sin acciones el envio queda bloqueado aunque haya motivo y no llama al backend', () => {
      abrirCon({ id: 'rev-2', accionesPermitidas: [] });
      component.motivo.set('Motivo escrito');
      component.onSubmit();
      component.confirmarEnvio();

      expect(component.isSubmitDisabled()).toBeTrue();
      expect(serviceMock.decidir).not.toHaveBeenCalled();
    });

    it('solo muestra la accion que el backend permite y la envia aunque no sea MANTENER', () => {
      serviceMock.decidir.and.returnValue(of({ exitoso: true, datos: {} as never }));
      abrirCon({ id: 'rev-5', accionesPermitidas: ['PROPONER'] });
      component.motivo.set('Supera el limite.');

      expect(radios()).toEqual(['PROPONER']);
      expect(component.decisionActiva()).toBe('PROPONER');
      component.onSubmit();
      expect(component.requiereConfirmacion()).toBeTrue();
      component.confirmarEnvio();

      expect(serviceMock.decidir).toHaveBeenCalledWith('rev-5', { decision: 'PROPONER', motivo: 'Supera el limite.' });
    });

    it('una eleccion que el backend ya no permite cae en la primera accion permitida', () => {
      abrirCon({ id: 'rev-6', accionesPermitidas: ['MANTENER', 'PROPONER'] });
      component.decision.set('PROPONER');
      expect(component.decisionActiva()).toBe('PROPONER');

      abrirCon({ id: 'rev-6', accionesPermitidas: ['MANTENER'] });
      expect(component.decisionActiva()).toBe('MANTENER');
    });

    it('ignora codigos desconocidos del backend (no hay etiqueta ni se puede enviar una accion que la vista no entiende)', () => {
      abrirCon({ id: 'rev-7', accionesPermitidas: ['OTRA_ACCION'] });

      expect(radios()).toEqual([]);
      expect(sinAcciones()).not.toBeNull();
    });

    it('PROPONER_CANCELACION se acepta como PROPONER y pide confirmacion', () => {
      abrirCon({ id: 'rev-8', accionesPermitidas: ['PROPONER_CANCELACION'] });
      component.motivo.set('Motivo.');
      component.decision.set('PROPONER');

      expect(radios()).toEqual(['PROPONER']);
      component.onSubmit();
      expect(component.requiereConfirmacion()).toBeTrue();
    });

    it('la revision anidada en una marca aporta el id, y cerrar limpia la eleccion', () => {
      serviceMock.decidir.and.returnValue(of({ exitoso: true, datos: {} as never }));
      abrirCon({ accionesPermitidas: ['MANTENER'], revision: { id: 'rev-anidada' } });
      component.motivo.set('Se mantiene.');
      component.decision.set('MANTENER');
      component.onSubmit();

      expect(serviceMock.decidir).toHaveBeenCalledWith('rev-anidada', { decision: 'MANTENER', motivo: 'Se mantiene.' });
      expect(component.decision()).toBeNull();
    });

    it('sin id de revision no envia nada', () => {
      abrirCon({ accionesPermitidas: ['MANTENER'] });
      component.motivo.set('x');
      component.onSubmit();

      expect(serviceMock.decidir).not.toHaveBeenCalled();
    });
  });
});
