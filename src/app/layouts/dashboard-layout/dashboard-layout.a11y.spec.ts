import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
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

  it('Escape cierra el menú móvil abierto y devuelve el foco a la hamburguesa', () => {
    const boton = el.querySelector('button[aria-label="Menú principal"]') as HTMLButtonElement;
    boton.click();
    fixture.detectChanges();
    expect(boton.getAttribute('aria-expanded')).toBe('true');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(boton);
  });

  it('Escape con el menú cerrado no mueve el foco', () => {
    const boton = el.querySelector('button[aria-label="Menú principal"]') as HTMLButtonElement;
    const skip = el.querySelector('a[href="#contenido-principal"]') as HTMLAnchorElement;
    skip.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(skip);
  });

  it('el enlace de la ruta activa expone aria-current="page" y ningún otro lo hace', async () => {
    const router = TestBed.inject(Router);
    router.resetConfig([{ path: '**', children: [] }]);
    const enlaces = Array.from(el.querySelectorAll<HTMLAnchorElement>('#menu-lateral nav a[href]'));
    expect(enlaces.length).toBeGreaterThan(1);
    const destino = enlaces[0].getAttribute('href') as string;

    await router.navigateByUrl(destino);
    fixture.detectChanges();

    const activos = Array.from(el.querySelectorAll('#menu-lateral a[aria-current="page"]'));
    expect(activos.map((a) => a.getAttribute('href'))).toEqual([destino]);
  });
});

// WCAG 2.4.3 / 4.1.2: con el menu movil cerrado el panel esta fuera de pantalla; no debe poder recibir foco por
// teclado ni leerse con lector de pantalla. En escritorio (>= md) el menu siempre es visible y operable.
describe('DashboardLayoutComponent: menu cerrado fuera del foco (movil)', () => {
  let fixture: ComponentFixture<DashboardLayoutComponent>;
  let el: HTMLElement;

  function crear(escritorio: boolean): void {
    const mq = {
      matches: escritorio,
      media: '(min-width: 768px)',
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as MediaQueryList;
    spyOn(window, 'matchMedia').and.returnValue(mq);
    const user = signal({ id: 'u', name: 'Ana', email: 'a@uco.edu.co', role: 'ESTUDIANTE' as UserRole });
    const auth = jasmine.createSpyObj('AuthService', ['logout', 'loginAsMockUser'], {
      currentUser: user.asReadonly(),
      isMockMode: signal(false).asReadonly(),
    });
    const toast = jasmine.createSpyObj('ToastService', ['dismiss'], {
      currentToast: signal({ visible: false, message: '', type: 'info' as const }).asReadonly(),
    });
    TestBed.configureTestingModule({
      imports: [DashboardLayoutComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }, { provide: ToastService, useValue: toast }],
    });
    fixture = TestBed.createComponent(DashboardLayoutComponent);
    fixture.detectChanges();
    el = fixture.nativeElement;
  }

  const aside = () => el.querySelector('#menu-lateral') as HTMLElement;
  const hamburguesa = () => el.querySelector('button[aria-label="Menú principal"]') as HTMLButtonElement;

  it('en móvil con el menú cerrado el panel es inerte (sin foco ni lectura)', () => {
    crear(false);
    expect(aside().hasAttribute('inert')).toBeTrue();
  });

  it('al abrir el menú móvil deja de ser inerte y al cerrarlo con Escape vuelve a serlo', () => {
    crear(false);
    hamburguesa().click();
    fixture.detectChanges();
    expect(aside().hasAttribute('inert')).toBeFalse();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(aside().hasAttribute('inert')).toBeTrue();
  });

  it('en escritorio el menú nunca es inerte', () => {
    crear(true);
    expect(aside().hasAttribute('inert')).toBeFalse();
  });

  it('sin matchMedia (entorno sin soporte) el menú no se marca inerte', () => {
    const original = window.matchMedia;
    (window as { matchMedia?: unknown }).matchMedia = undefined;
    try {
      const user = signal({ id: 'u', name: 'Ana', email: 'a@uco.edu.co', role: 'ESTUDIANTE' as UserRole });
      const auth = jasmine.createSpyObj('AuthService', ['logout', 'loginAsMockUser'], {
        currentUser: user.asReadonly(),
        isMockMode: signal(false).asReadonly(),
      });
      const toast = jasmine.createSpyObj('ToastService', ['dismiss'], {
        currentToast: signal({ visible: false, message: '', type: 'info' as const }).asReadonly(),
      });
      TestBed.configureTestingModule({
        imports: [DashboardLayoutComponent],
        providers: [provideRouter([]), { provide: AuthService, useValue: auth }, { provide: ToastService, useValue: toast }],
      });
      fixture = TestBed.createComponent(DashboardLayoutComponent);
      fixture.detectChanges();
      el = fixture.nativeElement;
      expect(aside().hasAttribute('inert')).toBeFalse();
    } finally {
      window.matchMedia = original;
    }
  });

  it('cuando el navegador cruza el breakpoint md el menú deja o recupera el estado inerte', () => {
    let alCambiar: ((e: MediaQueryListEvent) => void) | undefined;
    const mq = {
      matches: false,
      media: '(min-width: 768px)',
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => (alCambiar = cb),
      removeEventListener: () => undefined,
    } as unknown as MediaQueryList;
    spyOn(window, 'matchMedia').and.returnValue(mq);
    const user = signal({ id: 'u', name: 'Ana', email: 'a@uco.edu.co', role: 'ESTUDIANTE' as UserRole });
    const auth = jasmine.createSpyObj('AuthService', ['logout', 'loginAsMockUser'], {
      currentUser: user.asReadonly(),
      isMockMode: signal(false).asReadonly(),
    });
    const toast = jasmine.createSpyObj('ToastService', ['dismiss'], {
      currentToast: signal({ visible: false, message: '', type: 'info' as const }).asReadonly(),
    });
    TestBed.configureTestingModule({
      imports: [DashboardLayoutComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }, { provide: ToastService, useValue: toast }],
    });
    fixture = TestBed.createComponent(DashboardLayoutComponent);
    fixture.detectChanges();
    el = fixture.nativeElement;
    expect(aside().hasAttribute('inert')).toBeTrue();

    alCambiar?.({ matches: true } as MediaQueryListEvent);
    fixture.detectChanges();
    expect(aside().hasAttribute('inert')).toBeFalse();

    alCambiar?.({ matches: false } as MediaQueryListEvent);
    fixture.detectChanges();
    expect(aside().hasAttribute('inert')).toBeTrue();
  });
});
