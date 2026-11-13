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

  // DEC-065 (1): se retira el escalamiento al decano; el coordinador decide y no hay etiqueta de escalada.
  it('C-F-38 (DEC-065) ya no muestra etiqueta de escalada a decanatura ni la opción de escalar', () => {
    inicializar('COORDINADOR');
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(fixture.nativeElement.querySelector('[data-testid="badge-escalada"]')).toBeNull();
    expect(texto).not.toContain('Escalada a decanatura');
    component.abrirModalResolucion(mockRevision, 'APROBAR');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Escalar a decanatura');
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
  it('cada fila del coordinador muestra semáforo con porcentaje y límite, y el motivo del docente destacado', () => {
    inicializar('COORDINADOR');
    expect(fixture.nativeElement.querySelector('app-semaforo-asistencia')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="rev-porcentaje"]').textContent).toContain('22.5');
    expect(fixture.nativeElement.querySelector('[data-testid="rev-porcentaje"]').textContent).toContain('límite 20');
    expect(fixture.nativeElement.querySelector('[data-testid="rev-motivo-docente"]').textContent).toContain('Ausencias constantes');
  });

  it('Aprobar y Rechazar abren el modal con la decisión fija y la resolución usa esa decisión', () => {
    serviceMock.resolverCoordinador.and.returnValue(of({ exitoso: true, datos: mockRevision, mensajeUsuario: 'Listo.' }));
    inicializar('COORDINADOR');
    (fixture.nativeElement.querySelector('[data-testid="rev-rechazar"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="modal-titulo"]').textContent).toContain('Rechazar propuesta');
    expect(component.decisionModal()).toBe('RECHAZAR');
    component.motivoModal.set('  Plazo especial  ');
    component.onSubmitResolucion(new Event('submit'));
    expect(serviceMock.resolverCoordinador).toHaveBeenCalledWith('rev-1', { decision: 'RECHAZAR', motivo: 'Plazo especial' });
    expect(component.modalAbierto()).toBeFalse();

    (fixture.nativeElement.querySelector('[data-testid="rev-aprobar"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="modal-titulo"]').textContent).toContain('Aprobar cancelación');
  });

  it('no emite la resolución sin motivo ni sin revisión seleccionada', () => {
    inicializar('COORDINADOR');
    component.abrirModalResolucion(mockRevision);
    component.onSubmitResolucion(new Event('submit'));
    expect(serviceMock.resolverCoordinador).not.toHaveBeenCalled();
    component.motivoModal.set('Motivo');
    component.revisionSeleccionada.set(null);
    component.onSubmitResolucion(new Event('submit'));
    expect(serviceMock.resolverCoordinador).not.toHaveBeenCalled();
  });

  it('onMotivoInput actualiza el motivo del modal', () => {
    inicializar('COORDINADOR');
    component.abrirModalResolucion(mockRevision);
    fixture.detectChanges();
    const area = fixture.nativeElement.querySelector('#motivo-resolucion') as HTMLTextAreaElement;
    area.value = 'Escrito';
    area.dispatchEvent(new Event('input'));
    expect(component.motivoModal()).toBe('Escrito');
  });

  it('muestra el mensaje del backend cuando falla la resolución (409) y mantiene el modal', () => {
    serviceMock.resolverCoordinador.and.returnValue(throwError(() => apiHttpError(409, 'El estudiante ya no supera el límite de inasistencia.')));
    inicializar('COORDINADOR');
    component.abrirModalResolucion(mockRevision);
    component.ejecutarResolucion('rev-1', 'APROBAR', 'Motivo');
    fixture.detectChanges();
    expect(component.modalError()).toBe('El estudiante ya no supera el límite de inasistencia.');
    expect(component.modalAbierto()).toBeTrue();
    expect(component.enviandoResolucion()).toBeFalse();
  });

  it('una revisión ya resuelta no ofrece acciones', () => {
    serviceMock.consultarCoordinador.and.returnValue(
      of({ exitoso: true, elementos: [{ ...mockRevision, requiereAccionResolutor: false }], numeroPagina: 1, tamanoPagina: 20, totalElementos: 1, totalPaginas: 1 })
    );
    inicializar('COORDINADOR');
    expect(fixture.nativeElement.querySelector('[data-testid="rev-aprobar"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Resuelta');
  });

  it('sin pendientes explica la causa y "Ver también las resueltas" quita el filtro', () => {
    serviceMock.consultarCoordinador.and.returnValue(of({ exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 20, totalElementos: 0, totalPaginas: 1 }));
    inicializar('COORDINADOR');
    expect(fixture.nativeElement.textContent).toContain('No tienes revisiones de cancelación por resolver');
    expect(fixture.nativeElement.textContent).toContain('Ver también las resueltas');
    serviceMock.consultarCoordinador.calls.reset();
    component['alAccionVacio']();
    expect(component.filtroSoloPendientes()).toBeFalse();
    expect(serviceMock.consultarCoordinador).toHaveBeenCalledWith(jasmine.objectContaining({ soloPendientes: false }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No se encontraron registros de revisión');
  });

  it('si la consulta falla (500) muestra el mensaje del backend y lista vacía', () => {
    serviceMock.consultarCoordinador.and.returnValue(throwError(() => apiHttpError(500, 'No se pudo consultar las revisiones.')));
    inicializar('COORDINADOR');
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('No se pudo consultar las revisiones.');
    expect(component.totalElementos()).toBe(0);
  });

  it('cambiar el filtro de pendientes y la página recarga', () => {
    inicializar('COORDINADOR');
    component.onTogglePendientes(false);
    component.onCambiarPagina(2);
    expect(serviceMock.consultarCoordinador).toHaveBeenCalledWith({ pagina: 2, tamano: 20, soloPendientes: false });
  });

  describe('DEC-065 el decano consulta sin resolver', () => {
    it('muestra el título de consulta, el filtro por estado y ningún botón de resolver', () => {
      inicializar('DECANO');
      expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Revisiones de cancelación de la facultad (consulta)');
      expect(fixture.nativeElement.querySelector('[data-testid="filtro-estado"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('[data-testid="filtro-pendientes"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="rev-aprobar"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="rev-rechazar"]')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Resolver');
      expect(serviceMock.consultarCoordinador).not.toHaveBeenCalled();
    });

    it('filtra por estado y lo envía al backend; sin estado no envía el parámetro', () => {
      inicializar('DECANO');
      expect(serviceMock.consultarDecano).toHaveBeenCalledWith({ pagina: 1, tamano: 20 });
      component.onCambiarEstado('APROBADA');
      expect(serviceMock.consultarDecano).toHaveBeenCalledWith({ pagina: 1, tamano: 20, estado: 'APROBADA' });
    });

    it('no abre el modal ni resuelve aunque se invoque', () => {
      inicializar('DECANO');
      component.abrirModalResolucion(mockRevision, 'APROBAR');
      component.ejecutarResolucion('rev-1', 'APROBAR', 'Motivo');
      expect(component.modalAbierto()).toBeFalse();
      expect(serviceMock.resolverCoordinador).not.toHaveBeenCalled();
    });

    it('vacío sin filtro y con filtro: descripciones y acción para ver todos los estados', () => {
      serviceMock.consultarDecano.and.returnValue(of({ exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 20, totalElementos: 0, totalPaginas: 1 }));
      inicializar('DECANO');
      expect(fixture.nativeElement.textContent).toContain('Aún no hay revisiones de cancelación en los grupos de tu facultad');
      component.onCambiarEstado('RECHAZADA');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Ninguna revisión de tu facultad está en ese estado');
      expect(fixture.nativeElement.textContent).toContain('Ver todos los estados');
      component['alAccionVacio']();
      expect(component.filtroEstado()).toBe('');
    });

    it('un 403 muestra el mensaje del backend', () => {
      serviceMock.consultarDecano.and.returnValue(throwError(() => apiHttpError(403, 'No tienes permiso para esta consulta.')));
      inicializar('DECANO');
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('No tienes permiso para esta consulta.');
    });
  });
});
