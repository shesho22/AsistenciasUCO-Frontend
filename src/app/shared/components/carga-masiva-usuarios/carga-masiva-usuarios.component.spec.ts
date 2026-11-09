import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { CargaMasivaUsuariosComponent } from './carga-masiva-usuarios.component';
import { CargaMasivaService } from '../../../core/services/carga-masiva.service';
import {
  DestinoCargaMasiva,
  ResultadoCargaDTO,
  ResultadoValidacionCargaDTO,
} from '../../../core/models/carga-masiva.model';
import { ApiDataResponse } from '../../../core/api/models/api-data-response.model';

describe('CargaMasivaUsuariosComponent', () => {
  let component: CargaMasivaUsuariosComponent;
  let fixture: ComponentFixture<CargaMasivaUsuariosComponent>;
  let mockCargaMasivaService: jasmine.SpyObj<CargaMasivaService>;

  const mockValidacionDocentes: ApiDataResponse<ResultadoValidacionCargaDTO> = {
    exitoso: true,
    datos: {
      huella: 'huella-hash-1234',
      perfilDestino: 'DOCENTE',
      totalFilas: 3,
      filasValidas: 2,
      filasYaExistentes: 1,
      filasConError: 0,
      filas: [
        {
          numeroFila: 2,
          documento: '1001',
          correo: 'docente1@uco.net.co',
          estado: 'VALIDA',
        },
        {
          numeroFila: 3,
          documento: '1002',
          correo: 'docente2@uco.net.co',
          estado: 'VALIDA',
        },
        {
          numeroFila: 4,
          documento: '1003',
          correo: 'docente3@uco.net.co',
          estado: 'YA_EXISTE',
        },
      ],
    },
  };

  const mockResultadoCargaDocentes: ApiDataResponse<ResultadoCargaDTO> = {
    exitoso: true,
    datos: {
      totalFilas: 3,
      creadas: 2,
      yaExistentes: 1,
      conError: 0,
      cuentasPendientes: 0,
      mensaje: 'Carga procesada: 2 creadas, 1 ya existentes, 0 con error.',
      filas: [
        {
          numeroFila: 2,
          documento: '1001',
          correo: 'docente1@uco.net.co',
          estado: 'CREADA',
          idUsuario: 'usr-1',
        },
        {
          numeroFila: 3,
          documento: '1002',
          correo: 'docente2@uco.net.co',
          estado: 'CREADA',
          idUsuario: 'usr-2',
        },
        {
          numeroFila: 4,
          documento: '1003',
          correo: 'docente3@uco.net.co',
          estado: 'YA_EXISTE',
        },
      ],
    },
  };

  beforeEach(async () => {
    mockCargaMasivaService = jasmine.createSpyObj<CargaMasivaService>(
      'CargaMasivaService',
      ['descargarPlantilla', 'validarArchivo', 'ejecutarCarga']
    );

    mockCargaMasivaService.descargarPlantilla.and.returnValue(
      of(new Blob(['tipo_documento,numero_documento'], { type: 'text/csv' }))
    );
    mockCargaMasivaService.validarArchivo.and.returnValue(
      of(mockValidacionDocentes)
    );
    mockCargaMasivaService.ejecutarCarga.and.returnValue(
      of(mockResultadoCargaDocentes)
    );

    await TestBed.configureTestingModule({
      imports: [CargaMasivaUsuariosComponent],
      providers: [
        { provide: CargaMasivaService, useValue: mockCargaMasivaService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CargaMasivaUsuariosComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('destino', 'DOCENTE');
    fixture.detectChanges();
  });

  it('debe inicializarse y mostrar la recomendación visible de seguridad sobre contraseñas', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    const aviso = compiled.querySelector('[data-testid="aviso-seguridad-contrasenas"]');
    expect(aviso).toBeTruthy();
    expect(aviso?.textContent?.toLowerCase()).toContain('borra');
    expect(aviso?.textContent?.toLowerCase()).toContain('contraseñas iniciales');
  });

  it('F3-TRX-02: el panel de carga masiva es role=dialog nombrado por su titulo', () => {
    const dialogo = (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]')!;
    expect(dialogo).not.toBeNull();
    const titulo = (fixture.nativeElement as HTMLElement).querySelector('#' + dialogo.getAttribute('aria-labelledby'))!;
    expect(titulo.textContent).toContain('Carga Masiva de');
  });

  it('debe permitir descargar la plantilla CSV del rol configurado', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const btnDescargar = compiled.querySelector(
      '[data-testid="btn-descargar-plantilla"]'
    ) as HTMLButtonElement;
    expect(btnDescargar).toBeTruthy();

    btnDescargar.click();
    expect(mockCargaMasivaService.descargarPlantilla).toHaveBeenCalledWith('DOCENTE');
  });

  it('debe tener el botón de validar deshabilitado si no hay archivo seleccionado', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const btnValidar = compiled.querySelector(
      '[data-testid="btn-validar-archivo"]'
    ) as HTMLButtonElement;
    expect(btnValidar).toBeTruthy();
    expect(btnValidar.disabled).toBeTrue();
  });

  it('debe validar el archivo al seleccionarlo y pulsar validar (Paso 2 sin crear cuentas)', () => {
    const file = new File(['csv content'], 'carga_docentes.csv', { type: 'text/csv' });
    const compiled = fixture.nativeElement as HTMLElement;
    const fileInput = compiled.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    // Simular seleccion de archivo
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });
    fileInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const btnValidar = compiled.querySelector(
      '[data-testid="btn-validar-archivo"]'
    ) as HTMLButtonElement;
    expect(btnValidar.disabled).toBeFalse();

    btnValidar.click();
    expect(mockCargaMasivaService.validarArchivo).toHaveBeenCalledWith('DOCENTE', file);

    fixture.detectChanges();

    // Conteos de validacion
    const conteos = compiled.querySelector('[data-testid="conteos-validacion"]');
    expect(conteos).toBeTruthy();
    expect(conteos?.textContent).toContain('3'); // Total
    expect(conteos?.textContent).toContain('2'); // Validas
    expect(conteos?.textContent).toContain('1'); // Ya existen

    // Comprobar filas en tabla de escritorio y tarjetas en móvil
    const filasTabla = compiled.querySelectorAll('tbody tr[data-testid="fila-validacion"]');
    expect(filasTabla.length).toBe(3);
    const tarjetasMovil = compiled.querySelectorAll('.block.sm\\:hidden [data-testid="fila-validacion"]');
    expect(tarjetasMovil.length).toBe(3);

    // REGLA CRÍTICA: Nunca debe haber campo de contraseña visible en el DOM
    expect(compiled.innerHTML.toLowerCase()).not.toContain('clave_inicial');
  });

  it('debe mostrar confirmación explícita con "Se crearán N, se omitirán M" en Paso 3', () => {
    const file = new File(['csv content'], 'carga_docentes.csv', { type: 'text/csv' });
    const compiled = fixture.nativeElement as HTMLElement;
    const fileInput = compiled.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
    fileInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const btnValidar = compiled.querySelector(
      '[data-testid="btn-validar-archivo"]'
    ) as HTMLButtonElement;
    btnValidar.click();
    fixture.detectChanges();

    // Confirmación
    const confirmacion = compiled.querySelector('[data-testid="texto-confirmacion"]');
    expect(confirmacion).toBeTruthy();
    expect(confirmacion?.textContent).toContain('Se crearán 2');
    expect(confirmacion?.textContent).toContain('se omitirán 1');
  });

  it('debe ejecutar la carga con la huella y emitir cargaCompletada (Paso 4)', () => {
    let emitida = false;
    component.cargaCompletada.subscribe(() => {
      emitida = true;
    });

    const file = new File(['csv content'], 'carga_docentes.csv', { type: 'text/csv' });
    const compiled = fixture.nativeElement as HTMLElement;
    const fileInput = compiled.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
    fileInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (compiled.querySelector('[data-testid="btn-validar-archivo"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const btnEjecutar = compiled.querySelector(
      '[data-testid="btn-ejecutar-carga"]'
    ) as HTMLButtonElement;
    expect(btnEjecutar).toBeTruthy();

    btnEjecutar.click();
    expect(mockCargaMasivaService.ejecutarCarga).toHaveBeenCalledWith(
      'DOCENTE',
      file,
      'huella-hash-1234'
    );

    fixture.detectChanges();
    expect(emitida).toBeTrue();

    // Conteos finales
    const conteosCarga = compiled.querySelector('[data-testid="conteos-carga"]');
    expect(conteosCarga).toBeTruthy();
    expect(conteosCarga?.textContent).toContain('2'); // Creadas
  });

  it('debe manejar error 409 CMA_003 cuando el archivo cambia desde la validación', () => {
    mockCargaMasivaService.ejecutarCarga.and.returnValue(
      throwError(() => new HttpErrorResponse({
        status: 409,
        error: { codigo: 'CMA_003', mensajeUsuario: 'El archivo cambió desde la validación. Valídalo de nuevo.' }
      }))
    );

    const file = new File(['csv content'], 'carga_docentes.csv', { type: 'text/csv' });
    const compiled = fixture.nativeElement as HTMLElement;
    const fileInput = compiled.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
    fileInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (compiled.querySelector('[data-testid="btn-validar-archivo"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    (compiled.querySelector('[data-testid="btn-ejecutar-carga"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const errorMsg = compiled.querySelector('[data-testid="mensaje-error-carga"]');
    expect(errorMsg).toBeTruthy();
    expect(errorMsg?.textContent).toContain('El archivo cambió desde la validación');
  });

  it('debe manejar error 429 CMA_014 cuando se supera el límite de cargas por minuto', () => {
    mockCargaMasivaService.validarArchivo.and.returnValue(
      throwError(() => new HttpErrorResponse({
        status: 429,
        error: { codigo: 'CMA_014', mensajeUsuario: 'Has superado el número de cargas por minuto.' }
      }))
    );

    const file = new File(['csv content'], 'carga_docentes.csv', { type: 'text/csv' });
    const compiled = fixture.nativeElement as HTMLElement;
    const fileInput = compiled.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
    fileInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (compiled.querySelector('[data-testid="btn-validar-archivo"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const errorMsg = compiled.querySelector('[data-testid="mensaje-error-validacion"]');
    expect(errorMsg).toBeTruthy();
    expect(errorMsg?.textContent).toContain('cargas por minuto');
  });

  it('debe permitir descargar el resultado CSV generado (solo número de fila, estado y mensajes)', () => {
    const file = new File(['csv content'], 'carga_docentes.csv', { type: 'text/csv' });
    const compiled = fixture.nativeElement as HTMLElement;
    const fileInput = compiled.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
    fileInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (compiled.querySelector('[data-testid="btn-validar-archivo"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    (compiled.querySelector('[data-testid="btn-ejecutar-carga"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const btnDescargarResultado = compiled.querySelector(
      '[data-testid="btn-descargar-resultado"]'
    ) as HTMLButtonElement;
    expect(btnDescargarResultado).toBeTruthy();
  });
});
