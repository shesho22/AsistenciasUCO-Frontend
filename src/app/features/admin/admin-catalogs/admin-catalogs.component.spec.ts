import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { AdminCatalogsComponent } from './admin-catalogs.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { TipoProgramaItem } from '../../../core/models/role-management.model';
import { apiHttpError } from '../../../core/testing/api-error.fixture';

describe('AdminCatalogsComponent - tipos de programa (HU154, solo consulta)', () => {
  let fixture: ComponentFixture<AdminCatalogsComponent>;
  let service: jasmine.SpyObj<AdminManagementService>;
  let toast: jasmine.SpyObj<ToastService>;

  const pre: TipoProgramaItem = { id: 't-1', codigo: 'PRE', nombre: 'pregrado', activo: true };
  const pos: TipoProgramaItem = { id: 't-2', codigo: 'POS', nombre: 'postgrado', activo: false };

  beforeEach(async () => {
    service = Object.assign(jasmine.createSpyObj('AdminManagementService', ['cargarTiposPrograma']), {
      tiposPrograma: signal<TipoProgramaItem[]>([pre, pos]).asReadonly(),
    });
    service.cargarTiposPrograma.and.returnValue(of({ exitoso: true, datos: [pre, pos] }));
    toast = jasmine.createSpyObj('ToastService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [AdminCatalogsComponent],
      providers: [
        { provide: AdminManagementService, useValue: service },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCatalogsComponent);
    fixture.detectChanges();
  });

  it('carga y muestra los tipos de programa sin acciones de escritura', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(service.cargarTiposPrograma).toHaveBeenCalled();
    expect(host.textContent).toContain('PRE');
    expect(host.textContent).toContain('postgrado');
    expect(host.textContent).toContain('Inactivo');
    expect(host.querySelectorAll('button').length).toBe(0);
  });

  it('muestra el error del backend si la carga falla', () => {
    service.cargarTiposPrograma.and.returnValue(throwError(() => ({ error: { message: 'Sin permisos' } })));

    fixture.componentInstance.ngOnInit();

    expect(toast.error).toHaveBeenCalled();
    expect(fixture.componentInstance.cargando()).toBeFalse();
  });

  it('certificación F3: mientras carga no afirma que el catálogo está vacío', async () => {
    const pendiente = new Subject<{ exitoso: boolean; datos: TipoProgramaItem[] }>();
    const vacio = Object.assign(jasmine.createSpyObj('AdminManagementService', ['cargarTiposPrograma']), {
      tiposPrograma: signal<TipoProgramaItem[]>([]).asReadonly(),
    });
    vacio.cargarTiposPrograma.and.returnValue(pendiente.asObservable());
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AdminCatalogsComponent],
      providers: [
        { provide: AdminManagementService, useValue: vacio },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();
    const f = TestBed.createComponent(AdminCatalogsComponent);
    f.detectChanges();
    const host = f.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Cargando…');
    expect(host.textContent).not.toContain('No hay tipos de programa registrados.');

    pendiente.next({ exitoso: true, datos: [] });
    f.detectChanges();
    expect(host.textContent).toContain('No hay tipos de programa registrados.');
  });
});

describe('AdminCatalogsComponent ante un fallo de carga', () => {
  it('muestra el error (no "No hay tipos") y permite reintentar', () => {
    const service = Object.assign(jasmine.createSpyObj('AdminManagementService', ['cargarTiposPrograma']), {
      tiposPrograma: signal<TipoProgramaItem[]>([]).asReadonly(),
    });
    service.cargarTiposPrograma.and.returnValue(throwError(() => apiHttpError(503, 'No disponible')));
    TestBed.configureTestingModule({
      imports: [AdminCatalogsComponent],
      providers: [
        { provide: AdminManagementService, useValue: service },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['error']) },
      ],
    });
    const fixture = TestBed.createComponent(AdminCatalogsComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="error-carga"]')).not.toBeNull();
    expect(el.textContent).not.toContain('No hay tipos de programa registrados.');

    service.cargarTiposPrograma.and.returnValue(of({ exitoso: true, datos: [] }));
    (el.querySelector('[data-testid="error-carga"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(service.cargarTiposPrograma).toHaveBeenCalledTimes(2);
    expect(el.querySelector('[data-testid="error-carga"]')).toBeNull();
  });
});
