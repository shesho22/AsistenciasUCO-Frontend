import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardLayoutComponent } from './dashboard-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.component';
import { UserRole } from '../../core/models/user.model';

describe('DashboardLayoutComponent accesibilidad (F-TRX-014)', () => {
  let fixture: ComponentFixture<DashboardLayoutComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    const user = signal({ id: 'u', name: 'Ana', email: 'a@uco.edu.co', role: 'COORDINADOR' as UserRole });
    const auth = jasmine.createSpyObj('AuthService', ['logout', 'loginAsMockUser'], {
      currentUser: user.asReadonly(),
      isMockMode: signal(false).asReadonly(),
    });
    const toast = jasmine.createSpyObj('ToastService', ['dismiss'], {
      currentToast: signal({ visible: false, message: '', type: 'info' as const }).asReadonly(),
    });
    await TestBed.configureTestingModule({
      imports: [DashboardLayoutComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }, { provide: ToastService, useValue: toast }],
    }).compileComponents();
    fixture = TestBed.createComponent(DashboardLayoutComponent);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('ofrece un enlace para saltar al contenido principal que enfoca el main', () => {
    const skip = el.querySelector('a[href="#contenido-principal"]') as HTMLAnchorElement;
    expect(skip).toBeTruthy();
    skip.click();
    expect(document.activeElement?.id).toBe('contenido-principal');
  });

  it('F3-TRX-02: el boton Cerrar sesion tiene aria-label', () => {
    const boton = el.querySelector('button[title="Cerrar sesión"]') as HTMLButtonElement;
    expect(boton.getAttribute('aria-label')).toBe('Cerrar sesión');
  });

  it('la hamburguesa expone aria-controls y aria-expanded sincronizado', () => {
    const boton = el.querySelector('button[aria-label="Menú principal"]') as HTMLButtonElement;
    expect(boton.getAttribute('aria-controls')).toBe('menu-lateral');
    expect(el.querySelector('#menu-lateral')).toBeTruthy();
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    boton.click();
    fixture.detectChanges();
    expect(boton.getAttribute('aria-expanded')).toBe('true');
  });
});
