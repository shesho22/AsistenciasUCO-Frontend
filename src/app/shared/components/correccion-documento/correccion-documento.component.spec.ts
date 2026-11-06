import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CorreccionDocumentoComponent } from './correccion-documento.component';
import { CatalogService } from '../../../core/services/catalog.service';
import { CorreccionIdentidadService } from '../../../core/services/correccion-identidad.service';
import { EstadoCorreccionDocumento } from '../../../core/models/correccion-identidad.model';

const TIPOS = [
  { id: 't-cc', tipoIdentificacion: 'CC', nombre: 'Cédula de ciudadanía' },
  { id: 't-ti', tipoIdentificacion: 'TI', nombre: 'Tarjeta de identidad' },
];

describe('CorreccionDocumentoComponent (HU159)', () => {
  let fixture: ComponentFixture<CorreccionDocumentoComponent>;
  let estados: EstadoCorreccionDocumento[];

  function crear(permitido: boolean, motivoSiempre = false, tiposFallan = false): CorreccionDocumentoComponent {
    TestBed.configureTestingModule({
      imports: [CorreccionDocumentoComponent],
      providers: [
        { provide: CorreccionIdentidadService, useValue: { permiteCorregirDocumento: () => of(permitido) } },
        {
          provide: CatalogService,
          useValue: { getTiposIdentificacion: () => (tiposFallan ? throwError(() => new Error('x')) : of({ exitoso: true, datos: TIPOS })) },
        },
      ],
    });
    fixture = TestBed.createComponent(CorreccionDocumentoComponent);
    fixture.componentRef.setInput('numeroActual', 1001);
    fixture.componentRef.setInput('codigoTipoActual', 'CC');
    fixture.componentRef.setInput('motivoSiempre', motivoSiempre);
    estados = [];
    fixture.componentInstance.estadoCambio.subscribe((e) => estados.push(e));
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  const host = () => fixture.nativeElement as HTMLElement;
  const ultimo = () => estados[estados.length - 1];

  it('con el parametro apagado muestra el documento de solo lectura y no pide motivo', () => {
    crear(false);
    expect(host().querySelector('[data-testid="documento-solo-lectura"]')?.textContent).toContain('CC 1001');
    expect(host().querySelector('[data-testid="numero-documento"]')).toBeNull();
    expect(host().querySelector('[data-testid="motivo-correccion"]')).toBeNull();
    expect(ultimo()).toEqual({ valido: true, documento: null, motivo: '' });
  });

  it('si el catalogo de tipos falla, el documento queda de solo lectura', () => {
    crear(true, false, true);
    expect(host().querySelector('[data-testid="documento-solo-lectura"]')).not.toBeNull();
  });

  it('con el parametro encendido preselecciona el tipo actual y no hay cambio hasta editar', () => {
    const c = crear(true);
    expect(c.tipo()).toBe('t-cc');
    expect(host().querySelector('[data-testid="numero-documento"]')).not.toBeNull();
    expect(ultimo().documento).toBeNull();
    expect(ultimo().valido).toBeTrue();
  });

  it('si cambia el documento exige motivo, avisa del usuario de acceso y emite el documento nuevo', () => {
    const c = crear(true);
    c.numero.set('2002');
    fixture.detectChanges();
    expect(host().querySelector('[data-testid="aviso-usuario"]')).not.toBeNull();
    expect(host().querySelector('[data-testid="motivo-correccion"]')).not.toBeNull();
    expect(ultimo().valido).toBeFalse();

    c.motivo.set('  Error de digitación  ');
    fixture.detectChanges();
    expect(ultimo()).toEqual({ valido: true, documento: { idTipoIdentificacion: 't-cc', numeroIdentificacion: 2002 }, motivo: 'Error de digitación' });

    c.tipo.set('t-ti');
    c.numero.set('12a');
    fixture.detectChanges();
    expect(ultimo().valido).toBeFalse();
    expect(host().textContent).toContain('solo dígitos');
  });

  it('con motivoSiempre pide el motivo aunque el documento no cambie', () => {
    const c = crear(true, true);
    expect(host().querySelector('[data-testid="motivo-correccion"]')).not.toBeNull();
    expect(ultimo().valido).toBeFalse();
    c.motivo.set('x'.repeat(501));
    fixture.detectChanges();
    expect(ultimo().valido).toBeFalse();
    c.motivo.set('Tilde faltante');
    fixture.detectChanges();
    expect(ultimo()).toEqual({ valido: true, documento: null, motivo: 'Tilde faltante' });
  });
});
