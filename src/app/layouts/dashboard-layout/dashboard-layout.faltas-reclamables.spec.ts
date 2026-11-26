import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { DashboardLayoutComponent } from './dashboard-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.component';
import { AlertaInasistenciaService } from '../../core/services/alerta-inasistencia.service';
import { FaltaReclamableService } from '../../core/services/falta-reclamable.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { RealtimeEvent } from '../../core/realtime/model/realtime-event.model';
import { UserRole } from '../../core/models/user.model';
import { environment } from '../../../environments/environment';

describe('DashboardLayoutComponent: contador de Mis Alertas con faltas por reclamar (ATA D10)', () => {
  let fixture: ComponentFixture<DashboardLayoutComponent>;
  let component: DashboardLayoutComponent;
  let alertas: jasmine.SpyObj<AlertaInasistenciaService>;
  let faltas: jasmine.SpyObj<FaltaReclamableService>;
  let eventos: Subject<RealtimeEvent>;

  function montar(role: UserRole): void {
    eventos = new Subject<RealtimeEvent>();
    alertas = jasmine.createSpyObj('AlertaInasistenciaService', ['contarVigentes', 'contarNoLeidas']);
    alertas.contarVigentes.and.returnValue(of(3));
    alertas.contarNoLeidas.and.returnValue(of(0));
    faltas = jasmine.createSpyObj('FaltaReclamableService', ['contar']);
    faltas.contar.and.returnValue(of(2));
    const auth = jasmine.createSpyObj('AuthService', ['logout'], {
      currentUser: signal({ id: 'u1', name: 'Prueba', email: 'p@uco.edu.co', role }).asReadonly(),
      cerrandoSesion: signal(false).asReadonly(),
      isMockMode: signal(false).asReadonly(),
    });
    auth.logout.and.returnValue(Promise.resolve());
    const toast = jasmine.createSpyObj('ToastService', ['dismiss'], {
      currentToast: signal({ visible: false, message: '', type: 'info' as const }).asReadonly(),
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DashboardLayoutComponent],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: toast },
        { provide: AlertaInasistenciaService, useValue: alertas },
        { provide: FaltaReclamableService, useValue: faltas },
        { provide: RealtimeService, useValue: { allEvents: () => eventos.asObservable(), events: () => eventos.asObservable(), listenType: () => eventos.asObservable(), startForUser: () => undefined, stopUser: () => undefined } },
      ],
    });
    fixture = TestBed.createComponent(DashboardLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    fixture.detectChanges();
  }

  const itemAlertas = () => component.filteredNavItems().find((i) => i.route === '/app/estudiante/alertas')!;

  afterEach(() => {
    environment.features['cancelacionInasistenciaEnabled'] = true;
  });

  it('el número de Mis Alertas suma alertas vigentes y faltas reclamables', () => {
    environment.features['cancelacionInasistenciaEnabled'] = true;
    montar('ESTUDIANTE');
    expect(component.faltasReclamablesCount()).toBe(2);
    expect(component.contadorDe(itemAlertas())).toBe(5);
  });

  it('solo con faltas reclamables el contador las muestra', () => {
    environment.features['cancelacionInasistenciaEnabled'] = true;
    montar('ESTUDIANTE');
    alertas.contarVigentes.and.returnValue(of(0));
    component.alertasVigentesCount.set(0);
    expect(component.contadorDe(itemAlertas())).toBe(2);
  });

  it('recarga el contador con FALTA_SESION_AVISADA y ASISTENCIAS_TOMA_ACTUALIZADAS, sin otros eventos', () => {
    environment.features['cancelacionInasistenciaEnabled'] = true;
    montar('ESTUDIANTE');
    expect(faltas.contar).toHaveBeenCalledTimes(1);
    faltas.contar.and.returnValue(of(4));
    eventos.next({ type: 'FALTA_SESION_AVISADA' } as RealtimeEvent);
    expect(component.faltasReclamablesCount()).toBe(4);
    faltas.contar.and.returnValue(of(1));
    eventos.next({ type: 'ASISTENCIAS_TOMA_ACTUALIZADAS' } as RealtimeEvent);
    expect(component.faltasReclamablesCount()).toBe(1);
    eventos.next({ type: 'OTRO' } as RealtimeEvent);
    expect(faltas.contar).toHaveBeenCalledTimes(3);
  });

  it('si la consulta falla el contador de faltas queda en cero', () => {
    environment.features['cancelacionInasistenciaEnabled'] = true;
    montar('ESTUDIANTE');
    faltas.contar.and.returnValue(throwError(() => new Error('500')));
    eventos.next({ type: 'FALTA_SESION_AVISADA' } as RealtimeEvent);
    expect(component.faltasReclamablesCount()).toBe(0);
  });

  it('un rol distinto de estudiante no consulta faltas reclamables', () => {
    environment.features['cancelacionInasistenciaEnabled'] = true;
    montar('DOCENTE');
    expect(faltas.contar).not.toHaveBeenCalled();
    expect(component.faltasReclamablesCount()).toBe(0);
  });

  it('con cancelacionInasistenciaEnabled=false no consulta faltas reclamables', () => {
    environment.features['cancelacionInasistenciaEnabled'] = false;
    montar('ESTUDIANTE');
    expect(faltas.contar).not.toHaveBeenCalled();
  });
});
