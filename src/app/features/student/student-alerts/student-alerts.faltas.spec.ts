import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { StudentAlertsComponent, agruparFaltasPorSesion } from './student-alerts.component';
import { AlertaInasistenciaService } from '../../../core/services/alerta-inasistencia.service';
import { FaltaReclamableService } from '../../../core/services/falta-reclamable.service';
import { FaltaReclamable } from '../../../core/models/falta-reclamable.model';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { RealtimeEvent } from '../../../core/realtime/model/realtime-event.model';
import { AlertaInasistencia } from '../../../core/models/alerta-inasistencia.model';

describe('StudentAlertsComponent: faltas por reclamar (ATA D10)', () => {
  let fixture: ComponentFixture<StudentAlertsComponent>;
  let component: StudentAlertsComponent;
  let alertas: jasmine.SpyObj<AlertaInasistenciaService>;
  let faltas: jasmine.SpyObj<FaltaReclamableService>;
  let router: jasmine.SpyObj<Router>;
  let eventos: Subject<RealtimeEvent>;

  const fila = (idToma: string, numeroToma: number, idSesion = 'ses-1'): FaltaReclamable => ({
    idGrupo: 'grp-1',
    nombreGrupo: 'G01',
    idAsignatura: 'asig-1',
    nombreAsignatura: 'Bases de datos',
    idSesion,
    numeroSesion: 4,
    fechaHoraInicioUtc: '2026-11-16T13:00:00Z',
    fechaHoraFinUtc: '2026-11-16T15:00:00Z',
    idToma,
    numeroToma,
    fechaPuntoControlUtc: '2026-11-16T13:10:00Z',
    fechaLimiteReclamoUtc: '2026-11-23T15:00:00Z',
  });

  const pagina = (elementos: FaltaReclamable[], totalPaginas = 1, total = elementos.length) => ({
    exitoso: true, elementos, numeroPagina: 1, tamanoPagina: 20, totalElementos: total, totalPaginas,
  });
  const alerta = {
    id: 'alt-1', tipo: 'ADVERTENCIA', estado: 'VIGENTE', mensaje: 'Llevas 16%', grupo: { id: 'grp-1', codigo: 1, nombre: 'G01' },
    asignatura: { id: 'asig-1', nombre: 'Bases de datos' },
  } as AlertaInasistencia;

  function montar(filas: FaltaReclamable[], alertasVigentes: AlertaInasistencia[] = [], totalPaginas = 1, total = filas.length): void {
    eventos = new Subject<RealtimeEvent>();
    alertas = jasmine.createSpyObj('AlertaInasistenciaService', ['consultar']);
    alertas.consultar.and.returnValue(of({ exitoso: true, elementos: alertasVigentes, numeroPagina: 1, tamanoPagina: 20, totalElementos: alertasVigentes.length, totalPaginas: 1 }));
    faltas = jasmine.createSpyObj('FaltaReclamableService', ['consultar']);
    faltas.consultar.and.returnValue(of(pagina(filas, totalPaginas, total)));
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      imports: [StudentAlertsComponent],
      providers: [
        { provide: AlertaInasistenciaService, useValue: alertas },
        { provide: FaltaReclamableService, useValue: faltas },
        { provide: Router, useValue: router },
        { provide: RealtimeService, useValue: { events: () => eventos.asObservable() } },
      ],
    });
    fixture = TestBed.createComponent(StudentAlertsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }
  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  it('agruparFaltasPorSesion junta las tomas de una sesión y conserva el orden', () => {
    const grupos = agruparFaltasPorSesion([fila('t1', 1, 's1'), fila('t2', 1, 's2'), fila('t3', 3, 's1')]);
    expect(grupos.map((g) => g.idSesion)).toEqual(['s1', 's2']);
    expect(grupos[0].tomas.map((t) => t.idToma)).toEqual(['t1', 't3']);
    expect(agruparFaltasPorSesion([])).toEqual([]);
  });

  it('sin faltas la sección no se muestra y el estado vacío de alertas se mantiene', () => {
    montar([]);
    expect(el().querySelector('[data-testid="faltas-reclamables"]')).toBeNull();
    expect(el().textContent).toContain('¡Excelente! No tienes alertas vigentes');
  });

  it('con faltas y sin alertas muestra la sección y no contradice con el texto de excelente', () => {
    montar([fila('t1', 1), fila('t3', 3)]);
    expect(el().querySelector('[data-testid="faltas-reclamables"]')).toBeTruthy();
    expect(el().textContent).not.toContain('¡Excelente!');
    expect(el().querySelector('[data-testid="sin-alertas-porcentaje"]')).toBeTruthy();
  });

  it('una fila de tabla por sesión con materia, grupo, horario, límite y una entrada por toma', () => {
    montar([fila('t1', 1), fila('t3', 3), fila('t9', 1, 'ses-2')]);
    expect(el().querySelectorAll('[data-testid^="falta-card-"]').length).toBe(2);
    const tarjeta = el().querySelector('[data-testid="falta-card-ses-1"]') as HTMLElement;
    expect(tarjeta.tagName).toBe('TR');
    expect(tarjeta.closest('app-tabla-datos')).not.toBeNull();
    expect(el().querySelector('article')).toBeNull();
    expect(tarjeta.textContent).toContain('Bases de datos');
    expect(tarjeta.textContent).toContain('G01');
    expect(tarjeta.textContent).toContain('Sesión 4');
    expect(tarjeta.querySelector('[data-testid="falta-horario"]')?.textContent).toContain(component.zona.formatTemporal('2026-11-16T13:00:00Z', 'time'));
    expect(tarjeta.querySelector('[data-testid="falta-limite"]')?.textContent).toContain(component.zona.formatTemporal('2026-11-23T15:00:00Z'));
    expect(tarjeta.querySelectorAll('li').length).toBe(2);
    expect(tarjeta.textContent).toContain('Toma 1 ·');
    expect(tarjeta.textContent).toContain('Toma 3 ·');
    expect(tarjeta.textContent).toContain('Reclamar esta toma');
  });

  it('la sección va antes de las alertas de porcentaje', () => {
    montar([fila('t1', 1)], [alerta]);
    const seccion = el().querySelector('[data-testid="faltas-reclamables"]') as HTMLElement;
    const tarjetaAlerta = el().querySelector('[data-testid="alerta-card-alt-1"]') as HTMLElement;
    expect(seccion.compareDocumentPosition(tarjetaAlerta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('"Reclamar esta toma" abre la radicación de esa toma (materia, grupo, sesión y toma en el enlace)', () => {
    montar([fila('t1', 1)]);
    (el().querySelector('[data-testid="btn-reclamar-toma-t1"]') as HTMLButtonElement).click();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/app/estudiante/mis-materias/materias'], {
      queryParams: { materia: 'asig-1', grupo: 'grp-1', sesion: 'ses-1', toma: 't1' },
    });
  });

  it('un error HTTP deja la sección oculta sin romper las alertas', () => {
    montar([], [alerta]);
    faltas.consultar.and.returnValue(throwError(() => new Error('500')));
    component.cargarFaltas();
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="faltas-reclamables"]')).toBeNull();
    expect(el().querySelector('[data-testid="alerta-card-alt-1"]')).toBeTruthy();
    expect(component.faltasTotal()).toBe(0);
  });

  it('con más de una página muestra la paginación (15 por defecto) y pide la página elegida', () => {
    montar([fila('t1', 1)], [], 3, 40);
    expect(faltas.consultar).toHaveBeenCalledWith({ pagina: 1, tamano: 15 });
    expect(el().querySelector('[data-testid="faltas-reclamables"] app-pagination')).toBeTruthy();
    component.cambiarPaginaFaltas(2);
    expect(faltas.consultar).toHaveBeenCalledWith({ pagina: 2, tamano: 15 });
  });

  it('bloque E: cambiar el tamaño de página (15/30/50) vuelve a la página 1', () => {
    montar([fila('t1', 1)], [], 3, 40);
    const opciones = Array.from(
      (el().querySelector('[data-testid="faltas-reclamables"] select[aria-label="Resultados por página"]') as HTMLSelectElement).options
    ).map((o) => o.value);
    expect(opciones).toEqual(['15', '30', '50']);
    component.cambiarPaginaFaltas(2);
    component.cambiarTamanoFaltas(30);
    expect(component.faltasPagina()).toBe(1);
    expect(faltas.consultar).toHaveBeenCalledWith({ pagina: 1, tamano: 30 });
  });

  it('con una sola página no muestra la paginación', () => {
    montar([fila('t1', 1)]);
    expect(el().querySelector('app-pagination')).toBeNull();
  });

  it('se recarga por FALTA_SESION_AVISADA y ASISTENCIAS_TOMA_ACTUALIZADAS, no por otros eventos, y sin setInterval', () => {
    const intervalo = spyOn(window, 'setInterval');
    montar([]);
    expect(faltas.consultar).toHaveBeenCalledTimes(1);
    faltas.consultar.and.returnValue(of(pagina([fila('t1', 1)])));
    eventos.next({ type: 'FALTA_SESION_AVISADA', payload: { grupo: 'g', sesion: 's' } } as RealtimeEvent);
    fixture.detectChanges();
    expect(faltas.consultar).toHaveBeenCalledTimes(2);
    expect(el().querySelector('[data-testid="faltas-reclamables"]')).toBeTruthy();
    eventos.next({ type: 'ASISTENCIAS_TOMA_ACTUALIZADAS' } as RealtimeEvent);
    expect(faltas.consultar).toHaveBeenCalledTimes(3);
    eventos.next({ type: 'OTRO_EVENTO' } as RealtimeEvent);
    expect(faltas.consultar).toHaveBeenCalledTimes(3);
    expect(intervalo).not.toHaveBeenCalled();
  });

  it('deja de escuchar eventos al destruir el componente', () => {
    montar([]);
    fixture.destroy();
    eventos.next({ type: 'FALTA_SESION_AVISADA' } as RealtimeEvent);
    expect(faltas.consultar).toHaveBeenCalledTimes(1);
  });
});
