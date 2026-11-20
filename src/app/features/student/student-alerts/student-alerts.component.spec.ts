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

  it('C-F-42 renderiza una fila de tabla por alerta con el mensaje del backend y datos de la materia', () => {
    const card = fixture.nativeElement.querySelector('[data-testid="alerta-card-alt-1"]') as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.tagName).toBe('TR');
    expect(fixture.nativeElement.querySelectorAll('app-tabla-datos tbody tr[data-testid^="alerta-card-"]').length).toBe(1);
    expect(card.textContent).toContain(mockAlerta.mensaje);
    expect(card.textContent).toContain('Bases de datos');
    expect(card.textContent).toContain('16%');
  });

  it('CIERRE-W3I el semáforo de la alerta es el nivel de permanencia vigente que clasifica el servidor', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="semaforo-nivel"]')).toBeNull();

    serviceMock.consultar.and.returnValue(
      of({
        exitoso: true, elementos: [{ ...mockAlerta, codigoPermanenciaActual: 'RIESGO' }],
        numeroPagina: 1, tamanoPagina: 20, totalElementos: 1, totalPaginas: 1,
      })
    );
    component.cargar();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="semaforo-nivel"]')?.getAttribute('data-nivel')).toBe('ambar');
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

  it('bloque E: pide 15 alertas por página, pagina en el servidor y reinicia la página al filtrar o cambiar el tamaño', () => {
    expect(serviceMock.consultar).toHaveBeenCalledWith(jasmine.objectContaining({ pagina: 1, tamano: 15 }));
    // Con una sola página no se muestra la paginación.
    expect(fixture.nativeElement.querySelector('app-pagination')).toBeNull();

    serviceMock.consultar.and.returnValue(
      of({ exitoso: true, elementos: [mockAlerta], numeroPagina: 1, tamanoPagina: 15, totalElementos: 40, totalPaginas: 3 })
    );
    component.cambiarPaginaAlertas(2);
    fixture.detectChanges();
    expect(serviceMock.consultar).toHaveBeenCalledWith(jasmine.objectContaining({ pagina: 2, tamano: 15 }));
    expect(fixture.nativeElement.querySelector('app-pagination')).not.toBeNull();

    component.cambiarTamanoAlertas(30);
    expect(serviceMock.consultar).toHaveBeenCalledWith(jasmine.objectContaining({ pagina: 1, tamano: 30 }));

    component.cambiarPaginaAlertas(2);
    component.filtrarPorGrupo('grp-3');
    expect(component.paginaAlertas()).toBe(1);
  });

  describe('"Ver detalle de la materia" (CERT-CULM001)', () => {
    const MIS_MATERIAS = '/app/estudiante/mis-materias/materias';

    it('abre la pestaña Materias de Mis materias con la materia y el grupo de la alerta', () => {
      (fixture.nativeElement.querySelector('[data-testid="btn-ver-materia-alt-1"]') as HTMLButtonElement).click();

      expect(routerSpy.navigate).toHaveBeenCalledOnceWith([MIS_MATERIAS], { queryParams: { materia: 'asig-1', grupo: 'grp-1' } });
    });

    it('nunca navega a la ruta inexistente /app/estudiante/materias/{id}', () => {
      component.verMateria(mockAlerta);

      const [comandos] = routerSpy.navigate.calls.mostRecent().args;
      expect(comandos).toEqual([MIS_MATERIAS]);
      expect(comandos.join('/')).not.toContain('estudiante/materias/');
    });

    it('usa los identificadores planos de la alerta y, sin grupo, envía solo la materia', () => {
      component.verMateria({ ...mockAlerta, asignatura: undefined, grupo: undefined, idAsignatura: 'asig-9' });

      expect(routerSpy.navigate).toHaveBeenCalledOnceWith([MIS_MATERIAS], { queryParams: { materia: 'asig-9' } });
    });

    it('sin asignatura abre la lista de materias, sin parámetros', () => {
      component.verMateria({ ...mockAlerta, asignatura: undefined, idAsignatura: undefined });

      expect(routerSpy.navigate).toHaveBeenCalledOnceWith([MIS_MATERIAS]);
    });
  });
});
