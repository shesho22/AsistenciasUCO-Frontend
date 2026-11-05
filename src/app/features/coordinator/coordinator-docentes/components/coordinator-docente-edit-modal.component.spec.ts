import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CatalogService } from '../../../../core/services/catalog.service';
import { CorreccionIdentidadService } from '../../../../core/services/correccion-identidad.service';
import { CoordinatorDocenteEditModalComponent } from './coordinator-docente-edit-modal.component';
import { ActualizarDocentePayload, DocentePrograma, TipoVinculacionItem } from '../../../../core/models/docente-programa.model';

describe('CoordinatorDocenteEditModalComponent', () => {
  let fixture: ComponentFixture<CoordinatorDocenteEditModalComponent>;
  let component: CoordinatorDocenteEditModalComponent;

  const docente: DocentePrograma = {
    idDocentePrograma: 'dp-1', idDocente: 'doc-1', idUsuario: 'u-1', codigoTipoIdentificacion: 'CC', numeroIdentificacion: 1017555444,
    primerNombre: 'Jorge', segundoNombre: 'Luis', primerApellido: 'Henao', segundoApellido: null, nombreCompleto: 'Jorge Luis Henao',
    correo: 'jorge@uco.edu.co', idTipoVinculacion: 'tv-1', codigoTipoVinculacion: 'PLA', nombreTipoVinculacion: 'Planta',
    fechaVinculacionUtc: '2026-10-22T10:00:00Z', totalGruposPrograma: 1, estaActivo: true,
  };
  const tipos: TipoVinculacionItem[] = [
    { id: 'tv-1', codigo: 'PLA', nombre: 'Planta' },
    { id: 'tv-2', codigo: 'CAT', nombre: 'Cátedra' },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CoordinatorDocenteEditModalComponent],
      providers: [
        { provide: CorreccionIdentidadService, useValue: { permiteCorregirDocumento: () => of(false) } },
        { provide: CatalogService, useValue: { getTiposIdentificacion: () => of({ exitoso: true, datos: [] }) } },
      ],
    });
    fixture = TestBed.createComponent(CoordinatorDocenteEditModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('docente', docente);
    fixture.componentRef.setInput('tiposVinculacion', tipos);
    fixture.detectChanges();
  });

  it('precarga el formulario con los datos actuales y muestra documento y correo solo de lectura', () => {
    expect(component.form.primerNombre).toBe('Jorge');
    expect(component.form.segundoNombre).toBe('Luis');
    expect(component.form.segundoApellido).toBe('');
    expect(component.form.idTipoVinculacion).toBe('tv-1');
    const html: string = fixture.nativeElement.textContent;
    expect(html).toContain('1017555444');
    expect(html).toContain('jorge@uco.edu.co');
    expect(fixture.nativeElement.querySelector('input[name="correo"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[name="numeroIdentificacion"]')).toBeNull();
  });

  it('advierte que el cambio de nombres aplica a la persona en todos sus programas', () => {
    expect(fixture.nativeElement.textContent).toContain('todos sus programas');
  });

  it('emite solo los campos modificados', () => {
    let emitido: ActualizarDocentePayload | undefined;
    component.guardar.subscribe((p) => (emitido = p));
    component.form.idTipoVinculacion = 'tv-2';
    component.form.primerNombre = ' Nuevo ';

    component.enviar();

    expect(emitido).toEqual({ idTipoVinculacion: 'tv-2', primerNombre: 'Nuevo' });
  });

  it('limpiar un segundo nombre envía cadena vacía', () => {
    let emitido: ActualizarDocentePayload | undefined;
    component.guardar.subscribe((p) => (emitido = p));
    component.form.segundoNombre = '';

    component.enviar();

    expect(emitido).toEqual({ segundoNombre: '' });
  });

  it('sin cambios no emite y muestra el motivo', () => {
    const emisiones: ActualizarDocentePayload[] = [];
    component.guardar.subscribe((p) => emisiones.push(p));

    component.enviar();

    expect(emisiones.length).toBe(0);
    expect(component.error()).toBeTruthy();
  });

  it('no permite dejar vacío el primer nombre ni el primer apellido', () => {
    const emisiones: ActualizarDocentePayload[] = [];
    component.guardar.subscribe((p) => emisiones.push(p));
    component.form.primerNombre = '  ';

    component.enviar();
    expect(emisiones.length).toBe(0);
    expect(component.error()).toBeTruthy();

    component.form.primerNombre = 'Jorge';
    component.form.primerApellido = '';
    component.enviar();
    expect(emisiones.length).toBe(0);
  });

  it('cerrar emite el evento', () => {
    let cerrado = false;
    component.cerrar.subscribe(() => (cerrado = true));
    component.solicitarCierre();
    expect(cerrado).toBeTrue();
  });

  it('HU159: envia el documento corregido con su motivo y bloquea si el bloque de documento es invalido', () => {
    const emitidos: ActualizarDocentePayload[] = [];
    component.guardar.subscribe((p) => emitidos.push(p));
    component.documento.set({ valido: false, documento: null, motivo: '' });
    component.enviar();
    expect(emitidos.length).toBe(0);
    expect(component.error()).toContain('documento');

    component.documento.set({ valido: true, documento: { idTipoIdentificacion: 't-cc', numeroIdentificacion: 2002 }, motivo: 'Cédula mal digitada' });
    component.enviar();
    expect(emitidos).toEqual([{ idTipoIdentificacion: 't-cc', numeroIdentificacion: 2002, motivo: 'Cédula mal digitada' }]);
  });
});
