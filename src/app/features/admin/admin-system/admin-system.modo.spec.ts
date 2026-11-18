import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminSystemComponent } from './admin-system.component';

describe('AdminSystemComponent (pestaña Parámetros de Configuración)', () => {
  it('monta solo el micro frontend del Catálogo de Parámetros, sin la lista ni el modal propios', () => {
    TestBed.configureTestingModule({
      imports: [AdminSystemComponent],
      providers: [provideRouter([]), provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    const f = TestBed.createComponent(AdminSystemComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;

    // INT-002: los parámetros son el micro frontend del Catálogo.
    const panel = el.querySelector('#panel-parametros') as HTMLElement;
    expect(panel).not.toBeNull();
    expect(panel.querySelector('app-parametros-administration')).not.toBeNull();
    expect(panel.querySelector('app-parametro-edicion-modal')).toBeNull();
    expect(panel.querySelector('[data-testid^="btn-editar-"]')).toBeNull();
    // Las operaciones de Sistema (auditoría y cierre masivo) tienen sus propias vistas y no se cuelan aquí.
    expect(el.querySelector('h1')).toBeNull();
    expect(el.querySelector('[role="tablist"]')).toBeNull();
    expect(el.querySelector('app-admin-auditoria')).toBeNull();
    expect(el.querySelector('#panel-cierre')).toBeNull();
  });
});
