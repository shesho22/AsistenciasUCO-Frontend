import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminTiposDocumentoComponent, tipoDocumentoValido } from './admin-tipos-documento.component';
import { CatalogService, TipoIdentificacionItem } from '../../../core/services/catalog.service';
import { ToastService } from '../../../shared/components/toast/toast.component';

describe('AdminTiposDocumentoComponent (HU153)', () => {
  let fixture: ComponentFixture<AdminTiposDocumentoComponent>;
  let component: AdminTiposDocumentoComponent;
  let catalogos: jasmine.SpyObj<CatalogService>;
  let toast: jasmine.SpyObj<ToastService>;

  const cc: TipoIdentificacionItem = { id: 'T-1', tipoIdentificacion: 'CC', nombre: 'Cedula de Ciudadania' };

  beforeEach(async () => {
    catalogos = jasmine.createSpyObj('CatalogService', [
      'getIdentityDocumentTypes', 'crearTipoIdentificacion', 'actualizarTipoIdentificacion',
    ]);
    catalogos.getIdentityDocumentTypes.and.returnValue(of([cc]));
    toast = jasmine.createSpyObj('ToastService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [AdminTiposDocumentoComponent],
      providers: [
        { provide: CatalogService, useValue: catalogos },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminTiposDocumentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('lista los tipos con código y nombre, sin acciones de estado', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('CC');
    expect(texto).toContain('Cedula de Ciudadania');
    expect(texto).not.toContain('Desactivar');
  });

  it('valida el código de 1 a 5 letras solo en el alta y el nombre de 3 a 50 caracteres', () => {
    expect(tipoDocumentoValido('PEP', 'Permiso especial', false)).toBeTrue();
    expect(tipoDocumentoValido('CC1', 'Permiso especial', false)).toBeFalse();
    expect(tipoDocumentoValido('ABCDEF', 'Permiso especial', false)).toBeFalse();
    expect(tipoDocumentoValido('', 'Pasaporte', true)).toBeTrue();
    expect(tipoDocumentoValido('PA', 'ab', true)).toBeFalse();
    expect(tipoDocumentoValido('PA', 'x'.repeat(51), true)).toBeFalse();
  });

  it('crea con el código en mayúsculas y recarga el listado', () => {
    catalogos.crearTipoIdentificacion.and.returnValue(of({ exitoso: true, datos: cc }));
    component.nuevo();
    component.codigo = ' pep ';
    component.nombre = ' Permiso especial ';

    component.guardar();

    expect(catalogos.crearTipoIdentificacion).toHaveBeenCalledWith('PEP', 'Permiso especial');
    expect(toast.success).toHaveBeenCalled();
    expect(catalogos.getIdentityDocumentTypes).toHaveBeenCalledTimes(2);
    expect(component.abierto()).toBeFalse();
  });

  it('en edición solo envía el nombre y muestra el error del backend', () => {
    catalogos.actualizarTipoIdentificacion.and.returnValue(
      throwError(() => ({ error: { message: 'Ya existe un tipo de documento registrado con este código o nombre.' } }))
    );
    component.editar(cc);
    component.nombre = 'Cédula de ciudadanía';

    component.guardar();

    expect(catalogos.actualizarTipoIdentificacion).toHaveBeenCalledWith('T-1', 'Cédula de ciudadanía');
    expect(catalogos.crearTipoIdentificacion).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(component.abierto()).toBeTrue();
  });

  it('no envía si el formulario es inválido', () => {
    component.nuevo();
    component.codigo = '12';
    component.nombre = 'Pasaporte';
    component.guardar();
    expect(catalogos.crearTipoIdentificacion).not.toHaveBeenCalled();
  });
});
