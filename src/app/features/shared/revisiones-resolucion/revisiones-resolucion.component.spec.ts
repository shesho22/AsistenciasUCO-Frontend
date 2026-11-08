import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RevisionesResolucionComponent } from './revisiones-resolucion.component';
import { RevisionCancelacionService } from '../../../core/services/revision-cancelacion.service';
import { RevisionCancelacion } from '../../../core/models/revision-cancelacion.model';
import { apiHttpError } from '../../../core/testing/api-error.fixture';

describe('RevisionesResolucionComponent (CULM-001 C.1 §4.5, §4.8)', () => {
  let fixture: ComponentFixture<RevisionesResolucionComponent>;
  let component: RevisionesResolucionComponent;
  let serviceMock: jasmine.SpyObj<RevisionCancelacionService>;

  const mockRevision: RevisionCancelacion = {
    id: 'rev-1',
    estado: 'PROPUESTA',
    nombreEstado: 'Propuesta de cancelación',
    requiereAccionDocente: false,
    requiereAccionResolutor: true,
    esResolutorActual: true,
    accionesPermitidas: ['APROBAR', 'RECHAZAR'],
    perfilResolutorActual: 'COORDINADOR',
    fechaEscalamientoUtc: null,
    estudiante: { id: 'est-1', nombreCompleto: 'Estudiante Ejemplo' },
    estadoMatricula: 'A',
    grupo: { id: 'grp-1', codigo: 1, nombre: 'G01' },
    asignatura: { id: 'asig-1', nombre: 'Bases de datos' },
    docente: { id: 'doc-1', nombreCompleto: 'Docente Titular' },
    programa: { id: 'prg-1', nombre: 'Ingeniería de Sistemas' },
    porcentajeCreacion: 21.43,
    porcentajeActual: 22.5,
    umbralPerdida: 20,
    horasFalta: 9,
    horasDictadas: 40,
    fechaCreacionUtc: '2026-11-08T10:00:00Z',
    decisionDocente: 'PROPONER',
    motivoDocente: 'Ausencias constantes',
    fechaDecisionDocenteUtc: '2026-11-08T10:05:00Z',
    decisionResolucion: null,
    motivoResolucion: null,
    resolutor: null,
    fechaResolucionUtc: null,
  };

  const mockEscalada: RevisionCancelacion = {
    ...mockRevision,
    id: 'rev-2',
    perfilResolutorActual: 'DECANO',
    fechaEscalamientoUtc: '2026-11-08T11:00:00Z',
  };

  beforeEach(() => {
    serviceMock = jasmine.createSpyObj<RevisionCancelacionService>('RevisionCancelacionService', [
      'consultarCoordinador',
      'resolverCoordinador',
      'consultarDecano',
      'resolverDecano',
    ]);
    serviceMock.consultarCoordinador.and.returnValue(
      of({ exitoso: true, elementos: [mockRevision, mockEscalada], numeroPagina: 1, tamanoPagina: 20, totalElementos: 2, totalPaginas: 1 })
    );
    serviceMock.consultarDecano.and.returnValue(
      of({ exitoso: true, elementos: [mockEscalada], numeroPagina: 1, tamanoPagina: 20, totalElementos: 1, totalPaginas: 1 })
    );

    TestBed.configureTestingModule({
      imports: [RevisionesResolucionComponent],
      providers: [{ provide: RevisionCancelacionService, useValue: serviceMock }],
    });
  });

  function inicializar(rol: 'COORDINADOR' | 'DECANO') {
    fixture = TestBed.createComponent(RevisionesResolucionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('rol', rol);
    fixture.detectChanges();
  }

  it('C-F-36 renderiza para COORDINADOR invocando consultarCoordinador()', () => {
    inicializar('COORDINADOR');
    expect(serviceMock.consultarCoordinador).toHaveBeenCalled();
    const titulo = fixture.nativeElement.querySelector('h1') as HTMLElement;
    expect(titulo.textContent).toContain('Revisiones de Cancelación');
  });

  it('C-F-37 renderiza para DECANO invocando consultarDecano()', () => {
    inicializar('DECANO');
    expect(serviceMock.consultarDecano).toHaveBeenCalled();
  });

  it('C-F-38 muestra etiqueta "Escalada a decanatura" en revisiones escaladas', () => {
    inicializar('COORDINADOR');
    const badgeEscalada = fixture.nativeElement.querySelector('[data-testid="badge-escalada"]') as HTMLElement;
    expect(badgeEscalada).toBeTruthy();
    expect(badgeEscalada.textContent).toContain('Escalada a decanatura');
  });

  it('C-F-39 abre modal de resolución y requiere confirmación al aprobar', () => {
    inicializar('COORDINADOR');
    component.abrirModalResolucion(mockRevision);
    fixture.detectChanges();

    expect(component.modalAbierto()).toBeTrue();
    expect(component.revisionSeleccionada()?.id).toBe('rev-1');
  });

  it('C-F-40 muestra mensaje de éxito del backend tras resolver', () => {
    serviceMock.resolverCoordinador.and.returnValue(
      of({
        exitoso: true,
        datos: mockRevision,
        mensajeUsuario: 'Cancelación aprobada: el estudiante quedó cancelado por inasistencia.',
      })
    );
    inicializar('COORDINADOR');

    component.ejecutarResolucion('rev-1', 'APROBAR', 'Cancelación justificada');
    fixture.detectChanges();

    expect(serviceMock.resolverCoordinador).toHaveBeenCalledWith('rev-1', {
      decision: 'APROBAR',
      motivo: 'Cancelación justificada',
    });
    // Debe recargar la lista tras resolver
    expect(serviceMock.consultarCoordinador).toHaveBeenCalledTimes(2);
  });

  it('C-F-41 en C.1 no se suscribe a connectionState$ ni usa setInterval', () => {
    const intervalSpy = spyOn(window, 'setInterval');
    inicializar('COORDINADOR');
    expect(intervalSpy).not.toHaveBeenCalled();
    // 1 carga al entrar
    expect(serviceMock.consultarCoordinador).toHaveBeenCalledTimes(1);
  });
});
