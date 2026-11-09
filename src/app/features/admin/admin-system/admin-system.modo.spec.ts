import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminSystemComponent } from './admin-system.component';

describe('AdminSystemComponent modo de presentacion', () => {
  function crear(data: Record<string, unknown>) {
    TestBed.configureTestingModule({
      imports: [AdminSystemComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { data } } },
      ],
    });
    const fixture = TestBed.createComponent(AdminSystemComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('en Configuracion (data.modo = parametros) oculta encabezado y pestañas de operaciones y muestra los parametros', () => {
    const f = crear({ modo: 'parametros' });
    const el = f.nativeElement as HTMLElement;
    expect(f.componentInstance.modo).toBe('parametros');
    expect(el.querySelector('h1')).toBeNull();
    expect(el.querySelector('[role="tablist"]')).toBeNull();
    expect(el.querySelector('#panel-parametros')).not.toBeNull();
  });

  it('en admin/sistema (sin dato de ruta) conserva el encabezado y las pestañas de operaciones', () => {
    const f = crear({});
    const el = f.nativeElement as HTMLElement;
    expect(f.componentInstance.modo).toBe('completo');
    expect(el.querySelector('h1')).not.toBeNull();
    expect(el.querySelector('[role="tablist"]')).not.toBeNull();
  });
});
