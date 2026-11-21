import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { TiposIdentificacionAdminComponent } from './tipos-identificacion-admin.component';
import { CatalogService } from '../../../core/services/catalog.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { TipoIdentificacionApiDto } from '../../../core/api/models/tipo-identificacion-api-dto.model';

describe('TiposIdentificacionAdminComponent (solo consulta)', () => {
  let catalogo: jasmine.SpyObj<CatalogService>;
  let toast: jasmine.SpyObj<ToastService>;
  const tipos: TipoIdentificacionApiDto[] = [
    { id: 'a', tipoIdentificacion: 'CC', nombre: 'Cedula de Ciudadania' },
    { id: 'b', tipoIdentificacion: 'PA', nombre: 'Pasaporte' },
  ];

  function crear() {
    TestBed.configureTestingModule({
      imports: [TiposIdentificacionAdminComponent],
      providers: [
        { provide: CatalogService, useValue: catalogo },
        { provide: ToastService, useValue: toast },
      ],
    });
    const fixture = TestBed.createComponent(TiposIdentificacionAdminComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    catalogo = jasmine.createSpyObj('CatalogService', ['getIdentityDocumentTypes']);
    toast = jasmine.createSpyObj('ToastService', ['error']);
  });

  it('lista código y nombre sin columna de estado ni acciones de escritura', () => {
    catalogo.getIdentityDocumentTypes.and.returnValue(of(tipos));
    const host = crear().nativeElement as HTMLElement;
    expect(host.textContent).toContain('Tipos de identificación');
    expect(host.textContent).toContain('CC');
    expect(host.textContent).toContain('Pasaporte');
    expect(host.textContent).not.toContain('Estado');
    expect(host.querySelectorAll('button')).toHaveSize(0);
  });

  it('mientras carga no afirma que el catálogo está vacío y luego sí con la respuesta vacía', () => {
    const pendiente = new Subject<TipoIdentificacionApiDto[]>();
    catalogo.getIdentityDocumentTypes.and.returnValue(pendiente.asObservable());
    const fixture = crear();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Cargando…');
    expect(host.textContent).not.toContain('No hay tipos de identificación registrados.');
    pendiente.next([]);
    fixture.detectChanges();
    expect(host.textContent).toContain('No hay tipos de identificación registrados.');
  });

  it('muestra el mensaje del backend si la carga falla', () => {
    catalogo.getIdentityDocumentTypes.and.returnValue(throwError(() => ({ error: { message: 'Sin permisos' } })));
    const fixture = crear();
    expect(toast.error).toHaveBeenCalled();
    expect(fixture.componentInstance.cargando()).toBeFalse();
  });
});
