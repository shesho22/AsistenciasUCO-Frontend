import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardLayoutComponent } from './dashboard-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.component';
import { RevisionesPendientesKpiComponent } from '../../shared/components/revisiones-pendientes-kpi/revisiones-pendientes-kpi.component';
import { UserRole } from '../../core/models/user.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-host-panel',
  imports: [DashboardLayoutComponent, RevisionesPendientesKpiComponent],
  template: `<app-dashboard-layout /><app-revisiones-pendientes-kpi rol="DOCENTE" />`,
})
class HostPanelComponent {}

describe('Panel del docente: llamadas únicas al cargar (P3 C7)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    environment.features['cancelacionInasistenciaEnabled'] = true;
    const usuario = signal({ id: 'u1', name: 'Docente', email: 'd@uco.edu.co', role: 'DOCENTE' as UserRole });
    TestBed.configureTestingModule({
      imports: [HostPanelComponent],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            currentUser: usuario.asReadonly(),
            cerrandoSesion: signal(false).asReadonly(),
            isMockMode: signal(false).asReadonly(),
            logout: () => Promise.resolve(),
          },
        },
        { provide: ToastService, useValue: { currentToast: signal({ visible: false, message: '', type: 'info' as const }).asReadonly(), dismiss: () => undefined } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  it('pide revisiones-cancelacion y solicitudes una sola vez', () => {
    const fixture = TestBed.createComponent(HostPanelComponent);
    fixture.detectChanges();
    fixture.detectChanges();
    const revisiones = http.match((r) => r.url.endsWith('/docente/revisiones-cancelacion'));
    const solicitudes = http.match((r) => r.url.endsWith('/docente/sesiones/solicitudes'));
    expect(revisiones.length).withContext('revisiones-cancelacion').toBe(1);
    expect(solicitudes.length).withContext('solicitudes').toBe(1);
  });
});
