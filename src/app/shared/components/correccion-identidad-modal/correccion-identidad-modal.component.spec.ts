import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CorreccionIdentidadModalComponent } from './correccion-identidad-modal.component';
import { CatalogService } from '../../../core/services/catalog.service';
import { CorreccionIdentidadService } from '../../../core/services/correccion-identidad.service';
import { CorregirIdentidadPayload } from '../../../core/models/correccion-identidad.model';

describe('CorreccionIdentidadModalComponent (HU159)', () => {
  let fixture: ComponentFixture<CorreccionIdentidadModalComponent>;
  let component: CorreccionIdentidadModalComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CorreccionIdentidadModalComponent],
      providers: [
        { provide: CorreccionIdentidadService, useValue: { permiteCorregirDocumento: () => of(true) } },
        {
          provide: CatalogService,
          useValue: { getTiposIdentificacion: () => of({ exitoso: true, datos: [{ id: 't-cc', tipoIdentificacion: 'CC', nombre: 'Cédula' }] }) },
        },
      ],
    });
    fixture = TestBed.createComponent(CorreccionIdentidadModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('actual', {
      primerNombre: 'Ana',
      segundoNombre: null,
      primerApellido: 'Gomes',
      segundoApellido: 'Ruiz',
      numeroIdentificacion: 1001,
      codigoTipoIdentificacion: 'CC',
    });
    fixture.componentRef.setInput('error', 'Documento duplicado');
    fixture.detectChanges();
    fixture.detectChanges();
  });

  it('carga los datos actuales, muestra el error del backend y no deja guardar sin motivo', () => {
    expect(component.primerApellido()).toBe('Gomes');
    expect(component.segundoNombre()).toBe('');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Documento duplicado');
    expect(component.esValido()).toBeFalse();
  });

  it('emite nombres, documento corregido y motivo', () => {
    const emitidos: CorregirIdentidadPayload[] = [];
    component.guardar.subscribe((p) => emitidos.push(p));
    component.primerApellido.set(' Gomez ');
    component.documento.set({ valido: true, documento: { idTipoIdentificacion: 't-cc', numeroIdentificacion: 2002 }, motivo: 'Digitación' });

    component.onGuardar();

    expect(emitidos).toEqual([
      { primerNombre: 'Ana', segundoNombre: '', primerApellido: 'Gomez', segundoApellido: 'Ruiz', idTipoIdentificacion: 't-cc', numeroIdentificacion: 2002, motivo: 'Digitación' },
    ]);
  });

  it('sin documento solo envia nombres y motivo; con primer nombre vacio no emite', () => {
    const emitidos: CorregirIdentidadPayload[] = [];
    component.guardar.subscribe((p) => emitidos.push(p));
    component.documento.set({ valido: true, documento: null, motivo: 'Tilde' });
    component.onGuardar();
    expect(emitidos[0]).toEqual({ primerNombre: 'Ana', segundoNombre: '', primerApellido: 'Gomes', segundoApellido: 'Ruiz', motivo: 'Tilde' });

    component.primerNombre.set('  ');
    component.onGuardar();
    expect(emitidos.length).toBe(1);
  });
});
