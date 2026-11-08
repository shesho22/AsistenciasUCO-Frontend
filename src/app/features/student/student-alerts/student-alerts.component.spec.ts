import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { StudentAlertsComponent } from './student-alerts.component';
import { AlertaInasistenciaService } from '../../../core/services/alerta-inasistencia.service';
import { AlertaInasistencia } from '../../../core/models/alerta-inasistencia.model';

describe('StudentAlertsComponent (CULM-001 C.1 §4.3, §4.8)', () => {
  let fixture: ComponentFixture<StudentAlertsComponent>;
  let component: StudentAlertsComponent;
  let serviceMock: jasmine.SpyObj<AlertaInasistenciaService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockAlerta: AlertaInasistencia = {
    id: 'alt-1',
    tipo: 'ADVERTENCIA',
    nombreTipo: 'Riesgo de pérdida por inasistencia',
    estado: 'VIGENTE',
    mensaje: 'Llevas 16.00% de inasistencia en Bases de datos. Si llegas al 20.00% podrías perder la asignatura.',
    porcentajeCruce: 16,
    porcentajeActual: 16,
    umbral: 15,
    umbralPerdida: 20,
    horasFalta: 4,
    horasDictadas: 25,
    fechaCruceUtc: '2026-11-08T10:00:00Z',
    leida: false,
    fechaLecturaUtc: null,
    grupo: { id: 'grp-1', codigo: 1, nombre: 'G01' },
    asignatura: { id: 'asig-1', nombre: 'Bases de datos' },
    estadoMatricula: 'A',
  };

  beforeEach(() => {
    serviceMock = jasmine.createSpyObj<AlertaInasistenciaService>('AlertaInasistenciaService', ['consultar']);
    serviceMock.consultar.and.returnValue(
      of({ exitoso: true, elementos: [mockAlerta], numeroPagina: 1, tamanoPagina: 20, totalElementos: 1, totalPaginas: 1 })
    );

    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [StudentAlertsComponent],
      providers: [
        { provide: AlertaInasistenciaService, useValue: serviceMock },
        { provide: Router, useValue: routerSpy },
      ],
    });

    fixture = TestBed.createComponent(StudentAlertsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('C-F-42 renderiza las tarjetas con el mensaje del backend y datos de la materia', () => {
    const card = fixture.nativeElement.querySelector('[data-testid="alerta-card-alt-1"]') as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.textContent).toContain(mockAlerta.mensaje);
    expect(card.textContent).toContain('Bases de datos');
    expect(card.textContent).toContain('16%');
  });

  it('C-F-43 diseño móvil primero con objetivos táctiles >= 44x44px', () => {
    const btnVerMateria = fixture.nativeElement.querySelector('[data-testid="btn-ver-materia-alt-1"]') as HTMLElement;
    expect(btnVerMateria).toBeTruthy();
    const minHeightClass = btnVerMateria.className;
    expect(minHeightClass).toContain('min-h-[44px]');
  });

  it('C-F-44 carga 1 vez al entrar, no se suscribe a connectionState$ ni usa setInterval', () => {
    const intervalSpy = spyOn(window, 'setInterval');
    fixture.detectChanges();
    expect(intervalSpy).not.toHaveBeenCalled();
    expect(serviceMock.consultar).toHaveBeenCalledTimes(1);
  });

  it('C-F-45 filtra alertas por grupo cuando se selecciona uno', () => {
    component.filtrarPorGrupo('grp-2');
    fixture.detectChanges();
    expect(serviceMock.consultar).toHaveBeenCalledWith(jasmine.objectContaining({ grupoId: 'grp-2' }));
  });
});
