import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CatalogService } from '../../../../core/services/catalog.service';
import { CorreccionIdentidadService } from '../../../../core/services/correccion-identidad.service';
import { DeanCoordinadorEditModalComponent } from './dean-coordinador-edit-modal.component';
import { CoordinadorItem, ActualizarCoordinadorPayload } from '../../../../core/models/role-management.model';

describe('DeanCoordinadorEditModalComponent (HU121)', () => {
  let fixture: ComponentFixture<DeanCoordinadorEditModalComponent>;
  let component: DeanCoordinadorEditModalComponent;
  let guardados: ActualizarCoordinadorPayload[];
  let cancelaciones: number;

  const coordinador: CoordinadorItem = {
    id: 'coord-1',
    numeroIdentificacion: '1017001',
    primerNombre: 'Carlos',
    segundoNombre: 'Andrés',
    primerApellido: 'Ramírez',
    segundoApellido: 'Soto',
    nombres: 'Carlos Andrés',
    apellidos: 'Ramírez Soto',
    correo: 'cramirez@uco.edu.co',
    facultad: 'Facultad de Ingeniería',
    programaAcademico: 'Ingeniería de Sistemas',
    estado: 'ACTIVO',
    totalDocentes: 10,
    totalGrupos: 15,
  };

  function campo(nombre: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`input[name="${nombre}"]`) as HTMLInputElement;
  }

  function escribir(nombre: string, valor: string): void {
    const input = campo(nombre);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  function botonGuardar(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
  }

  async function render(item: CoordinadorItem = coordinador): Promise<void> {
    fixture.componentRef.setInput('coordinador', item);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    guardados = [];
    cancelaciones = 0;
    await TestBed.configureTestingModule({
      imports: [DeanCoordinadorEditModalComponent],
      providers: [
        { provide: CorreccionIdentidadService, useValue: { permiteCorregirDocumento: () => of(false) } },
        { provide: CatalogService, useValue: { getTiposIdentificacion: () => of({ exitoso: true, datos: [] }) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DeanCoordinadorEditModalComponent);
    component = fixture.componentInstance;
    component.guardar.subscribe((payload) => guardados.push(payload));
    component.cancelar.subscribe(() => cancelaciones++);
  });

  it('precarga los datos editables del coordinador', async () => {
    await render();

    expect(campo('primerNombre').value).toBe('Carlos');
    expect(campo('segundoNombre').value).toBe('Andrés');
    expect(campo('primerApellido').value).toBe('Ramírez');
    expect(campo('segundoApellido').value).toBe('Soto');
    expect(campo('correo').value).toBe('cramirez@uco.edu.co');
  });

  it('no ofrece editar el documento de identidad', async () => {
    await render();

    expect(campo('numeroIdentificacion')).toBeNull();
    expect(campo('tipoIdentificacion')).toBeNull();
  });

  it('cuando solo vienen nombres y apellidos consolidados, los separa para precargar', async () => {
    await render({ ...coordinador, primerNombre: undefined, segundoNombre: undefined, primerApellido: undefined, segundoApellido: undefined });

    expect(campo('primerNombre').value).toBe('Carlos');
    expect(campo('primerApellido').value).toBe('Ramírez');
  });

  it('emite el payload recortado, sin documento, al guardar con datos válidos', async () => {
    await render();
    escribir('primerNombre', '  Ana ');
    escribir('segundoNombre', '');
    escribir('primerApellido', 'Gómez');
    escribir('correo', ' ana.gomez@uco.edu.co ');
    fixture.detectChanges();

    botonGuardar().click();

    expect(guardados.length).toBe(1);
    expect(guardados[0]).toEqual({
      primerNombre: 'Ana',
      segundoNombre: '',
      primerApellido: 'Gómez',
      segundoApellido: 'Soto',
      correo: 'ana.gomez@uco.edu.co',
    });
    expect(Object.keys(guardados[0])).not.toContain('numeroIdentificacion');
  });

  it('valida al escribir: nombre en blanco deshabilita guardar y no emite', async () => {
    await render();

    escribir('primerNombre', '   ');
    fixture.detectChanges();

    expect(botonGuardar().disabled).toBeTrue();
    botonGuardar().click();
    expect(guardados.length).toBe(0);
  });

  it('valida al escribir: apellido en blanco deshabilita guardar', async () => {
    await render();

    escribir('primerApellido', '');
    fixture.detectChanges();

    expect(botonGuardar().disabled).toBeTrue();
  });

  it('valida al escribir: un correo sin formato deshabilita guardar', async () => {
    await render();

    escribir('correo', 'esto-no-es-un-correo');
    fixture.detectChanges();

    expect(botonGuardar().disabled).toBeTrue();
    expect(guardados.length).toBe(0);
  });

  it('emite cancelar al pulsar cancelar', async () => {
    await render();

    (fixture.nativeElement.querySelector('button[data-accion="cancelar"]') as HTMLButtonElement).click();

    expect(cancelaciones).toBe(1);
    expect(guardados.length).toBe(0);
  });

  it('HU159: envia el documento corregido y su motivo solo si el documento cambia', async () => {
    await render();
    component.documento.set({ valido: true, documento: { idTipoIdentificacion: 't-cc', numeroIdentificacion: 2002 }, motivo: 'Digitación' });
    component.onGuardar();
    expect(guardados[guardados.length - 1]).toEqual(jasmine.objectContaining({ idTipoIdentificacion: 't-cc', numeroIdentificacion: 2002, motivo: 'Digitación' }));

    component.documento.set({ valido: false, documento: null, motivo: '' });
    expect(component.esValido()).toBeFalse();
  });
});
