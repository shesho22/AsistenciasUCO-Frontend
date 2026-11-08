import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InasistenciaMarcaBadgeComponent } from './inasistencia-marca-badge.component';
import { MarcaInasistencia } from '../../../core/models/revision-cancelacion.model';

describe('InasistenciaMarcaBadgeComponent (CULM-001 C.1 §4.4, §4.8)', () => {
  let fixture: ComponentFixture<InasistenciaMarcaBadgeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InasistenciaMarcaBadgeComponent],
    });
    fixture = TestBed.createComponent(InasistenciaMarcaBadgeComponent);
  });

  function texto(): string {
    fixture.detectChanges();
    return fixture.nativeElement.textContent.trim();
  }

  it('C-F-18 muestra "Cancelado por inasistencia" cuando estadoMatricula es CI', () => {
    fixture.componentRef.setInput('estadoMatricula', 'CI');
    expect(texto()).toBe('Cancelado por inasistencia');
  });

  it('C-F-18 muestra "Cancelado por inasistencia" cuando la revisión está APROBADA', () => {
    const marca: MarcaInasistencia = {
      advertenciaVigente: false,
      fechaAdvertenciaUtc: null,
      perdidaVigente: true,
      fechaPerdidaUtc: '2026-11-08T10:00:00Z',
      revision: {
        id: 'rev-1',
        estado: 'APROBADA',
        nombreEstado: 'Cancelación aprobada',
        requiereAccionDocente: false,
        perfilResolutorActual: 'COORDINADOR',
        accionesPermitidas: [],
      },
    };
    fixture.componentRef.setInput('marca', marca);
    expect(texto()).toBe('Cancelado por inasistencia');
  });

  it('C-F-19 muestra "Propuesto a decanatura" cuando está PROPUESTA a DECANO', () => {
    const marca: MarcaInasistencia = {
      advertenciaVigente: false,
      fechaAdvertenciaUtc: null,
      perdidaVigente: true,
      fechaPerdidaUtc: '2026-11-08T10:00:00Z',
      revision: {
        id: 'rev-1',
        estado: 'PROPUESTA',
        nombreEstado: 'Propuesta',
        requiereAccionDocente: false,
        perfilResolutorActual: 'DECANO',
        accionesPermitidas: [],
      },
    };
    fixture.componentRef.setInput('marca', marca);
    expect(texto()).toBe('Propuesto a decanatura');
  });

  it('C-F-20 muestra "Propuesto a coordinación" cuando está PROPUESTA a COORDINADOR', () => {
    const marca: MarcaInasistencia = {
      advertenciaVigente: false,
      fechaAdvertenciaUtc: null,
      perdidaVigente: true,
      fechaPerdidaUtc: '2026-11-08T10:00:00Z',
      revision: {
        id: 'rev-1',
        estado: 'PROPUESTA',
        nombreEstado: 'Propuesta',
        requiereAccionDocente: false,
        perfilResolutorActual: 'COORDINADOR',
        accionesPermitidas: [],
      },
    };
    fixture.componentRef.setInput('marca', marca);
    expect(texto()).toBe('Propuesto a coordinación');
  });

  it('C-F-21 muestra "Pérdida: decide" cuando el docente debe decidir', () => {
    const marca: MarcaInasistencia = {
      advertenciaVigente: false,
      fechaAdvertenciaUtc: null,
      perdidaVigente: true,
      fechaPerdidaUtc: '2026-11-08T10:00:00Z',
      revision: {
        id: 'rev-1',
        estado: 'PENDIENTE_DOCENTE',
        nombreEstado: 'Pendiente de decisión',
        requiereAccionDocente: true,
        perfilResolutorActual: null,
        accionesPermitidas: ['MANTENER', 'PROPONER'],
      },
    };
    fixture.componentRef.setInput('marca', marca);
    expect(texto()).toBe('Pérdida: decide');
  });

  it('C-F-22 muestra "Mantenido" cuando la revisión está MANTENIDA', () => {
    const marca: MarcaInasistencia = {
      advertenciaVigente: false,
      fechaAdvertenciaUtc: null,
      perdidaVigente: true,
      fechaPerdidaUtc: '2026-11-08T10:00:00Z',
      revision: {
        id: 'rev-1',
        estado: 'MANTENIDA',
        nombreEstado: 'Mantenida',
        requiereAccionDocente: false,
        perfilResolutorActual: null,
        accionesPermitidas: ['PROPONER'],
      },
    };
    fixture.componentRef.setInput('marca', marca);
    expect(texto()).toBe('Mantenido');
  });

  it('C-F-23 muestra "Rechazado" cuando la revisión fue RECHAZADA', () => {
    const marca: MarcaInasistencia = {
      advertenciaVigente: false,
      fechaAdvertenciaUtc: null,
      perdidaVigente: true,
      fechaPerdidaUtc: '2026-11-08T10:00:00Z',
      revision: {
        id: 'rev-1',
        estado: 'RECHAZADA',
        nombreEstado: 'Rechazada',
        requiereAccionDocente: false,
        perfilResolutorActual: null,
        accionesPermitidas: ['PROPONER'],
      },
    };
    fixture.componentRef.setInput('marca', marca);
    expect(texto()).toBe('Rechazado');
  });

  it('C-F-24 muestra "Riesgo" cuando solo hay advertencia vigente sin pérdida', () => {
    const marca: MarcaInasistencia = {
      advertenciaVigente: true,
      fechaAdvertenciaUtc: '2026-11-08T10:00:00Z',
      perdidaVigente: false,
      fechaPerdidaUtc: null,
      revision: null,
    };
    fixture.componentRef.setInput('marca', marca);
    expect(texto()).toBe('Riesgo');
  });

  it('C-F-25 no muestra nada cuando no hay alertas ni revisiones', () => {
    fixture.componentRef.setInput('marca', null);
    fixture.componentRef.setInput('estadoMatricula', 'A');
    expect(texto()).toBe('');
  });
});
